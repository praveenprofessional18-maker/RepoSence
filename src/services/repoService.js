import { getRepo, repositories } from "../mock/data";
import { historyService } from "./historyService";
import api, { mockDelay, useMocks } from "./api";
import { parseImportGraph, SOURCE_EXTENSION } from "../utils/importParser";
import { analyzeHealth } from "../utils/healthAnalyzer";
import { createMockHealthReport } from "../mock/healthData";
import {
  getSecuritySummary,
  prioritizeSecurityFiles,
  sanitizeSensitiveContent,
  scanSecurity,
  scoreFromFindings
} from "../utils/securityScanner";
import { createMockSecurityReport } from "../mock/securityData";

const GITHUB_API = "https://api.github.com";
const MAX_FILE_BYTES = 200 * 1024;
const MAX_GRAPH_FILES = 60;
const MAX_GRAPH_FILE_BYTES = 100 * 1024;
const GRAPH_BATCH_SIZE = 5;
const MAX_HEALTH_FILES = 40;
const MAX_HEALTH_FILE_BYTES = 100 * 1024;
const MAX_SECURITY_FILES = 50;
const MAX_SECURITY_FILE_BYTES = 100 * 1024;
const SECURITY_BATCH_SIZE = 5;
const HEALTH_BATCH_SIZE = 5;
const HEALTH_TEXT_EXTENSION = /\.(?:js|jsx|ts|tsx|vue|py|java|kt|kts|cs|go|rs|rb|php|c|h|cpp|hpp|swift|scala|sh|sql|md|mdx|txt|html|css|scss|sass|less|json|ya?ml|xml|toml|ini|cfg|properties)$/i;
const TOKEN_KEY = "reposense_github_token";
const SAFE_FILE_CONTENT_CACHE = new Map();

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const githubRepoPath = (owner, repo) => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
const fileCacheKey = (owner, repo, path) => `${String(owner).toLowerCase()}/${String(repo).toLowerCase()}:${path}`;

function getCachedFileContent(owner, repo, path, maxBytes) {
  const content = SAFE_FILE_CONTENT_CACHE.get(fileCacheKey(owner, repo, path));
  if (typeof content !== "string" || new TextEncoder().encode(content).length > maxBytes) return null;
  return content;
}

function cacheSafeFileContent(owner, repo, path, content) {
  if (sanitizeSensitiveContent(content) !== content) return;
  const key = fileCacheKey(owner, repo, path);
  if (!SAFE_FILE_CONTENT_CACHE.has(key) && SAFE_FILE_CONTENT_CACHE.size >= 120) {
    SAFE_FILE_CONTENT_CACHE.delete(SAFE_FILE_CONTENT_CACHE.keys().next().value);
  }
  SAFE_FILE_CONTENT_CACHE.set(key, content);
}

function getGithubHeaders(extra = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra
  };
  const token = localStorage.getItem(TOKEN_KEY)?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function rateLimitMessage(response, payload) {
  const remaining = response.headers.get("x-ratelimit-remaining") || "unknown";
  const reset = response.headers.get("x-ratelimit-reset");
  const resetTime = reset ? new Date(Number(reset) * 1000).toLocaleString() : "unknown";
  return `GitHub rate limit exceeded (${remaining} requests remaining). Limit resets at ${resetTime}. Add a GitHub token in Settings to increase the limit. ${payload?.message || ""}`.trim();
}

async function githubRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: getGithubHeaders(options.headers)
    });
  } catch (error) {
    throw new Error(`Could not connect to GitHub. Check your internet connection and try again. ${error.message}`);
  }

  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(payload.message || ""))) {
      throw new Error(rateLimitMessage(response, payload));
    }
    if (response.status === 404) {
      throw new Error("Repository not found or private. Only public GitHub repositories are supported.");
    }
    if (response.status === 401) {
      throw new Error("GitHub rejected the saved token. Update or remove it in Settings.");
    }
    throw new Error(payload.message || `GitHub request failed with status ${response.status}.`);
  }

  return response.json();
}

function parseRepositoryUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase()) || parts.length !== 2) {
    throw new Error("Use the format https://github.com/owner/repository. Only public repositories are supported.");
  }
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
}

function buildNestedTree(entries) {
  const root = [];
  const folders = new Map();

  for (const entry of entries) {
    const parts = entry.path.split("/").filter(Boolean);
    if (!parts.length) continue;

    let siblings = root;
    let prefix = "";
    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      prefix = prefix ? `${prefix}/${name}` : name;
      const isFile = index === parts.length - 1 && entry.type === "blob";
      let node = siblings.find((item) => item.path === prefix);

      if (!node) {
        node = isFile
          ? { name, path: prefix, type: "file", sha: entry.sha, size: entry.size || 0 }
          : { name, path: prefix, type: "folder", children: [] };
        siblings.push(node);
      }

      if (!isFile) {
        if (entry.type === "tree" && index === parts.length - 1) node.sha = entry.sha;
        folders.set(prefix, node);
        siblings = node.children;
      }
    }
  }

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
    });
    nodes.forEach((node) => {
      if (node.children) sortNodes(node.children);
    });
  };

  sortNodes(root);
  return { tree: root, folderCount: folders.size };
}

async function getCompleteTree(owner, repo, branch, initialTree) {
  if (!initialTree.truncated) return initialTree.tree || [];

  const entries = [];
  let queue = [{ sha: branch, prefix: "" }];
  while (queue.length) {
    const batch = queue.splice(0, 6);
    const results = await Promise.all(batch.map(async ({ sha, prefix }) => {
      const result = await githubRequest(`${githubRepoPath(owner, repo)}/git/trees/${encodeURIComponent(sha)}`);
      return { prefix, items: result.tree || [] };
    }));

    for (const { prefix, items } of results) {
      for (const item of items) {
        const path = prefix ? `${prefix}/${item.path}` : item.path;
        if (item.type === "tree") queue.push({ sha: item.sha, prefix: path });
        else entries.push({ ...item, path });
      }
    }
  }
  return entries;
}

function decodeContent(base64, maxBytes = MAX_FILE_BYTES) {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.length > maxBytes) throw new Error(`File too large / binary file. This operation is limited to ${Math.floor(maxBytes / 1024)} KB per file.`);
  let controlBytes = 0;
  for (const byte of bytes) {
    if (byte === 0 || (byte < 9 || (byte > 13 && byte < 32))) controlBytes += 1;
  }
  if (bytes.includes(0) || (bytes.length > 0 && controlBytes / bytes.length > 0.05)) {
    throw new Error("File too large / binary file. This file cannot be shown as text.");
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function parseManifest(path, contents) {
  const name = path.split("/").pop().toLowerCase();
  const dependencies = [];
  const frameworks = [];

  if (name === "package.json") {
    const manifest = JSON.parse(contents);
    Object.entries(manifest.dependencies || {}).forEach(([dependency, version]) => dependencies.push({ name: dependency, version: String(version), type: "prod" }));
    Object.entries(manifest.devDependencies || {}).forEach(([dependency, version]) => dependencies.push({ name: dependency, version: String(version), type: "dev" }));
    const categories = {
      react: ["React", "Frontend"], next: ["Next.js", "Frontend"], vue: ["Vue", "Frontend"],
      "@angular/core": ["Angular", "Frontend"], svelte: ["Svelte", "Frontend"], express: ["Express", "Backend"],
      fastify: ["Fastify", "Backend"], koa: ["Koa", "Backend"], nestjs: ["NestJS", "Backend"],
      prisma: ["Prisma", "Database"], mongoose: ["Mongoose", "Database"], pg: ["PostgreSQL", "Database"],
      jest: ["Jest", "Testing"], vitest: ["Vitest", "Testing"], mocha: ["Mocha", "Testing"],
      vite: ["Vite", "Build tool"], webpack: ["Webpack", "Build tool"], rollup: ["Rollup", "Build tool"]
    };
    dependencies.forEach((dependency) => {
      const entry = categories[dependency.name];
      if (entry && !frameworks.some((framework) => framework.name === entry[0])) {
        frameworks.push({ name: entry[0], category: entry[1] });
      }
    });
  } else if (name === "requirements.txt") {
    contents.split(/\r?\n/).forEach((line) => {
      const match = line.trim().match(/^([A-Za-z0-9_.-]+)\s*(?:==|~=|>=|<=|!=|>|<)\s*([^\s;]+)/);
      if (match) dependencies.push({ name: match[1], version: match[2], type: "prod" });
    });
    if (dependencies.some((item) => item.name.toLowerCase() === "django")) frameworks.push({ name: "Django", category: "Backend" });
    if (dependencies.some((item) => item.name.toLowerCase() === "fastapi")) frameworks.push({ name: "FastAPI", category: "Backend" });
    if (dependencies.some((item) => item.name.toLowerCase() === "flask")) frameworks.push({ name: "Flask", category: "Backend" });
  } else if (name === "pom.xml") {
    const blocks = contents.match(/<dependency\b[\s\S]*?<\/dependency>/gi) || [];
    blocks.forEach((block) => {
      const group = block.match(/<groupId>\s*([^<]+)\s*<\/groupId>/i)?.[1];
      const artifact = block.match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/i)?.[1];
      const version = block.match(/<version>\s*([^<]+)\s*<\/version>/i)?.[1] || "unspecified";
      const scope = block.match(/<scope>\s*([^<]+)\s*<\/scope>/i)?.[1];
      if (artifact) dependencies.push({ name: group ? `${group}:${artifact}` : artifact, version, type: ["test", "provided"].includes(scope) ? "dev" : "prod" });
    });
    if (contents.includes("spring-boot")) frameworks.push({ name: "Spring Boot", category: "Backend" });
  }
  return { dependencies, frameworks };
}

function sanitizeDependencies(dependencies) {
  return dependencies.map((dependency) => {
    const safeEntry = sanitizeSensitiveContent(`${dependency.name}="${dependency.version}"`);
    const separator = safeEntry.indexOf("=");
    return {
      ...dependency,
      name: separator < 0 ? safeEntry : safeEntry.slice(0, separator),
      version: separator < 0 ? "" : safeEntry.slice(separator + 2, -1)
    };
  });
}

function countTree(nodes, counts = { files: 0, folders: 0 }) {
  for (const node of nodes) {
    if (node.type === "folder") {
      counts.folders += 1;
      countTree(node.children || [], counts);
    } else {
      counts.files += 1;
    }
  }
  return counts;
}

async function analyzeGitHub(url) {
  const { owner, repo } = parseRepositoryUrl(url);
  const basePath = githubRepoPath(owner, repo);
  const metadata = await githubRequest(basePath);
  if (metadata.private) throw new Error("Private repositories are not supported. Choose a public GitHub repository.");

  const [languageBytes, initialTree] = await Promise.all([
    githubRequest(`${basePath}/languages`),
    githubRequest(`${basePath}/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`)
  ]);
  const flatTree = await getCompleteTree(owner, repo, metadata.default_branch, initialTree);
  const { tree, folderCount } = buildNestedTree(flatTree);
  const totalBytes = Object.values(languageBytes).reduce((sum, bytes) => sum + bytes, 0);
  const languages = Object.fromEntries(Object.entries(languageBytes).map(([name, bytes]) => [
    name,
    totalBytes ? Math.round((bytes / totalBytes) * 1000) / 10 : 0
  ]));

  const manifestPaths = ["package.json", "requirements.txt", "pom.xml"].map((manifestName) => {
    const matches = flatTree
      .filter((entry) => entry.type === "blob" && entry.path.split("/").pop().toLowerCase() === manifestName)
      .sort((a, b) => {
        const depthDifference = a.path.split("/").length - b.path.split("/").length;
        return depthDifference || a.path.localeCompare(b.path);
      });
    return matches[0]?.path;
  }).filter(Boolean);

  const manifestContents = await Promise.all(manifestPaths.map(async (path) => ({
    path,
    contents: await fetchGitHubFile(owner, repo, path, flatTree.find((entry) => entry.path === path)?.size)
  })));
  const files = Object.fromEntries(manifestContents.map(({ path, contents }) => [path, sanitizeSensitiveContent(contents)]));
  const securitySanitizedPaths = manifestContents
    .filter(({ path, contents }) => sanitizeSensitiveContent(contents) !== contents)
    .map(({ path }) => path);
  const dependencies = [];
  const frameworks = [];
  manifestContents.forEach(({ path, contents }) => {
    const parsed = parseManifest(path, contents);
    dependencies.push(...parsed.dependencies);
    frameworks.push(...parsed.frameworks);
  });
  if (!frameworks.some((framework) => framework.name === "TypeScript") && flatTree.some((entry) => /\.tsx?$/.test(entry.path))) {
    frameworks.push({ name: "TypeScript", category: "Build tool" });
  }

  const counts = countTree(tree);
  const result = {
    id: `${owner}~${repo}`,
    owner,
    name: metadata.name,
    fullName: metadata.full_name,
    url: metadata.html_url,
    ownerAvatar: metadata.owner?.avatar_url || "",
    ownerUrl: metadata.owner?.html_url || `https://github.com/${owner}`,
    description: metadata.description || "No description provided.",
    summary: metadata.description || "No description provided by the repository owner.",
    architecture: "Architecture insights are not included in GitHub repository metadata.",
    modules: [],
    quality: null,
    recommendations: [],
    language: metadata.language || Object.keys(languageBytes)[0] || "Unknown",
    languageBytes,
    languages,
    stars: metadata.stargazers_count || 0,
    forks: metadata.forks_count || 0,
    watchers: metadata.subscribers_count ?? metadata.watchers_count ?? 0,
    issues: metadata.open_issues_count || 0,
    license: metadata.license?.spdx_id || metadata.license?.name || "Not specified",
    branch: metadata.default_branch,
    size: metadata.size || 0,
    createdAt: metadata.created_at,
    pushedAt: metadata.pushed_at,
    updatedAt: metadata.updated_at,
    topics: metadata.topics || [],
    tree,
    files,
    securitySanitizedPaths,
    fileCount: counts.files,
    folderCount: folderCount || counts.folders,
    dependencies: sanitizeDependencies(dependencies),
    frameworks: frameworks.map((framework) => framework.name),
    frameworkDetails: frameworks,
    analyzedAt: new Date().toISOString(),
    status: "Completed"
  };
  return historyService.save(result);
}

async function fetchGitHubFile(owner, repo, path, knownSize, maxBytes = MAX_FILE_BYTES) {
  if (Number(knownSize) > maxBytes) {
    throw new Error(`File too large / binary file. This operation is limited to ${Math.floor(maxBytes / 1024)} KB per file.`);
  }
  const result = await githubRequest(`${githubRepoPath(owner, repo)}/contents/${encodePath(path)}`);
  if (result.type !== "file" || !result.content || result.encoding !== "base64") {
    throw new Error("File too large / binary file. This file cannot be shown as text.");
  }
  return decodeContent(result.content, maxBytes);
}

function flattenTreeFiles(nodes, base = "", result = []) {
  for (const node of nodes || []) {
    const path = node.path || (base ? `${base}/${node.name}` : node.name);
    if (node.type === "folder") flattenTreeFiles(node.children, path, result);
    else result.push({ ...node, path });
  }
  return result;
}

function isUnpreviewableFile(error) {
  return /File too large \/ binary file|cannot be shown as text/i.test(error.message || "");
}

async function persistHealthReport(repository, report) {
  const latest = await historyService.get(repository.id);
  const mergedReport = latest.securityReport
    ? addSecurityToHealthReport(report, withSecurityMetrics(latest.securityReport))
    : report;
  await historyService.save({ ...latest, healthReport: mergedReport });
  return mergedReport;
}

async function getRepositoryGraphData(analysisId, onProgress = () => {}) {
  const repository = await historyService.get(analysisId);
  if (repository.graphData) return repository.graphData;

  const treeFiles = flattenTreeFiles(repository.tree);
  const sources = treeFiles
    .filter((file) => file.type === "file" && SOURCE_EXTENSION.test(file.path))
    .slice(0, MAX_GRAPH_FILES);
  const graphData = {
    nodes: [],
    edges: [],
    externalPackages: [],
    sourceCount: sources.length,
    noSourceFiles: sources.length === 0,
    skippedFiles: 0
  };
  if (!sources.length) {
    onProgress({ completed: 0, total: 0 });
    await historyService.save({ ...repository, graphData });
    return graphData;
  }

  onProgress({ completed: 0, total: sources.length });
  const sourceRecords = [];
  let completed = 0;
  for (let offset = 0; offset < sources.length; offset += GRAPH_BATCH_SIZE) {
    const batch = sources.slice(offset, offset + GRAPH_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (file) => {
      if (Number(file.size) > MAX_GRAPH_FILE_BYTES) return { file, skipped: true };
      if (useMocks) {
        const content = repository.files?.[file.path];
        return typeof content === "string" && new TextEncoder().encode(content).length <= MAX_GRAPH_FILE_BYTES
          ? { file, content }
          : { file, skipped: true };
      }

      const cached = repository.files?.[file.path];
      if (typeof cached === "string" && new TextEncoder().encode(cached).length <= MAX_GRAPH_FILE_BYTES) {
        return { file, content: cached };
      }
      const sharedCache = getCachedFileContent(repository.owner, repository.name, file.path, MAX_GRAPH_FILE_BYTES);
      if (sharedCache !== null) return { file, content: sharedCache };
      try {
        const content = await fetchGitHubFile(repository.owner, repository.name, file.path, file.size, MAX_GRAPH_FILE_BYTES);
        return { file, content };
      } catch (error) {
        if (isUnpreviewableFile(error)) return { file, skipped: true };
        throw error;
      }
    }));

    for (const result of results) {
      completed += 1;
      if (result.skipped) graphData.skippedFiles += 1;
      else {
        cacheSafeFileContent(repository.owner, repository.name, result.file.path, result.content);
        sourceRecords.push({ path: result.file.path, size: result.file.size, content: result.content });
      }
      onProgress({ completed, total: sources.length });
    }
  }

  Object.assign(graphData, parseImportGraph(sourceRecords, treeFiles));
  graphData.sourceCount = sources.length;
  graphData.noSourceFiles = false;
  await historyService.save({ ...repository, graphData });
  return graphData;
}

function healthFilePriority(path) {
  const name = path.split("/").pop().toLowerCase();
  if (/^readme(?:\..*)?$/.test(name)) return 0;
  if (path.toLowerCase().startsWith(".github/workflows/")) return 1;
  if (SOURCE_EXTENSION.test(path)) return 2;
  return 3;
}

async function getRepositoryHealthReport(analysisId, onProgress = () => {}, { force = false } = {}) {
  const repository = await historyService.get(analysisId);
  if (repository.healthReport && !force) return repository.healthReport;

  const treeFiles = flattenTreeFiles(repository.tree);
  const sources = treeFiles
    .filter((file) => {
      const size = Number(file.size);
      return file.type === "file" && HEALTH_TEXT_EXTENSION.test(file.path) &&
        (!Number.isFinite(size) || size <= MAX_HEALTH_FILE_BYTES);
    })
    .sort((left, right) => healthFilePriority(left.path) - healthFilePriority(right.path) || left.path.localeCompare(right.path))
    .slice(0, MAX_HEALTH_FILES);
  const fileContents = {};
  onProgress({ completed: 0, total: sources.length });

  if (useMocks) {
    let completed = 0;
    for (let offset = 0; offset < sources.length; offset += HEALTH_BATCH_SIZE) {
      const batch = sources.slice(offset, offset + HEALTH_BATCH_SIZE);
      await mockDelay(null, 120);
      for (const file of batch) {
        const content = repository.files?.[file.path];
        if (typeof content === "string" && new TextEncoder().encode(content).length <= MAX_HEALTH_FILE_BYTES) {
          fileContents[file.path] = content;
        }
        completed += 1;
        onProgress({ completed, total: sources.length });
      }
    }
    const safeContents = Object.fromEntries(Object.entries(fileContents).map(([path, content]) => [path, sanitizeSensitiveContent(content)]));
    const report = createMockHealthReport(repository, safeContents);
    return persistHealthReport(repository, report);
  }

  let completed = 0;
  for (let offset = 0; offset < sources.length; offset += HEALTH_BATCH_SIZE) {
    const batch = sources.slice(offset, offset + HEALTH_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (file) => {
      const cached = repository.files?.[file.path];
      if (typeof cached === "string" && new TextEncoder().encode(cached).length <= MAX_HEALTH_FILE_BYTES) {
        return { file, content: cached };
      }
      const sharedCache = getCachedFileContent(repository.owner, repository.name, file.path, MAX_HEALTH_FILE_BYTES);
      if (sharedCache !== null) return { file, content: sharedCache };
      try {
        const content = await fetchGitHubFile(repository.owner, repository.name, file.path, file.size, MAX_HEALTH_FILE_BYTES);
        return { file, content };
      } catch (error) {
        if (isUnpreviewableFile(error)) return { file, skipped: true };
        throw error;
      }
    }));

    for (const result of results) {
      completed += 1;
      if (!result.skipped) {
        cacheSafeFileContent(repository.owner, repository.name, result.file.path, result.content);
        fileContents[result.file.path] = result.content;
      }
      onProgress({ completed, total: sources.length });
    }
  }

  const report = {
    ...analyzeHealth({
      metadata: repository,
      tree: repository.tree || [],
      languages: repository.languages || {},
      dependencies: repository.dependencies,
      fileContents: Object.fromEntries(Object.entries(fileContents).map(([path, content]) => [path, sanitizeSensitiveContent(content)]))
    }),
    scannedAt: new Date().toISOString()
  };
  return persistHealthReport(repository, report);
}

function withSecurityMetrics(report) {
  const falsePositives = Array.isArray(report.falsePositives) ? report.falsePositives : [];
  const activeFindings = (report.findings || []).filter((finding) => !falsePositives.includes(finding.id));
  const riskScore = scoreFromFindings(activeFindings);
  return {
    ...report,
    riskScore,
    riskLevel: riskScore >= 90 ? "low" : riskScore >= 70 ? "medium" : riskScore >= 40 ? "high" : "critical",
    summary: getSecuritySummary(activeFindings),
    falsePositives
  };
}

function addSecurityToHealthReport(healthReport, securityReport) {
  if (!healthReport) return healthReport;
  const { summary, riskScore, findings, falsePositives } = securityReport;
  const activeFindings = findings.filter((finding) => !falsePositives.includes(finding.id));
  const previousDependencies = healthReport.categories?.dependencies || { score: null, details: [] };
  const securityDetail = {
    label: "Security scan",
    score: riskScore,
    severity: summary.critical || summary.high ? "critical" : summary.medium ? "warning" : "info",
    text: `${summary.critical + summary.high + summary.medium + summary.low + summary.info} active heuristic findings across sampled files.`
  };
  const categories = {
    ...healthReport.categories,
    dependencies: {
      ...previousDependencies,
      details: [...(previousDependencies.details || []).filter((detail) => detail.label !== "Security scan"), securityDetail]
    }
  };
  const environmentFinding = activeFindings.find((finding) => finding.ruleId === "risky-file.env");
  const seriousFinding = activeFindings.find((finding) => ["critical", "high"].includes(finding.severity));
  const securityImprovement = environmentFinding
    ? { title: "Remove committed .env file", description: "Rotate any credentials it contains, remove them from repository history, and add local environment files to .gitignore.", severity: "critical", category: "Security", effort: "medium" }
    : seriousFinding
      ? { title: "Resolve high-risk security findings", description: `${summary.critical + summary.high} critical or high severity heuristic findings need review. Rotate any confirmed exposed credentials immediately.`, severity: "critical", category: "Security", effort: "medium" }
      : null;
  const topImprovements = [
    ...(securityImprovement ? [securityImprovement] : []),
    ...(healthReport.topImprovements || []).filter((item) => item.category !== "Security")
  ].slice(0, 5);
  return { ...healthReport, categories, topImprovements };
}

async function saveSecurityReport(repository, report) {
  const securityReport = withSecurityMetrics(report);
  const sanitizedFiles = Object.fromEntries(Object.entries(repository.files || {}).map(([path, content]) => [
    path,
    typeof content === "string" ? sanitizeSensitiveContent(content) : content
  ]));
  const sanitizedPaths = new Set(repository.securitySanitizedPaths || []);
  for (const [path, content] of Object.entries(repository.files || {})) {
    if (typeof content === "string" && sanitizeSensitiveContent(content) !== content) sanitizedPaths.add(path);
  }
  const latest = await historyService.get(repository.id);
  const updated = {
    ...latest,
    files: sanitizedFiles,
    securitySanitizedPaths: [...new Set([...(latest.securitySanitizedPaths || []), ...sanitizedPaths])],
    securityReport,
    healthReport: addSecurityToHealthReport(latest.healthReport, securityReport)
  };
  await historyService.save(updated);
  return securityReport;
}

async function getRepositorySecurityReport(analysisId, onProgress = () => {}, { force = false } = {}) {
  const repository = await historyService.get(analysisId);
  if (repository.securityReport && !force) return withSecurityMetrics(repository.securityReport);

  const treeFiles = flattenTreeFiles(repository.tree || []);
  const sources = prioritizeSecurityFiles(treeFiles, MAX_SECURITY_FILES);
  const fileContents = {};
  onProgress({ completed: 0, total: sources.length });

  if (useMocks) {
    let completed = 0;
    for (let offset = 0; offset < sources.length; offset += SECURITY_BATCH_SIZE) {
      await mockDelay(null, 120);
      for (const file of sources.slice(offset, offset + SECURITY_BATCH_SIZE)) {
        const content = repository.files?.[file.path];
        if (typeof content === "string" && new TextEncoder().encode(content).length <= MAX_SECURITY_FILE_BYTES) {
          fileContents[file.path] = content;
        }
        completed += 1;
        onProgress({ completed, total: sources.length });
      }
    }
    const report = createMockSecurityReport(repository);
    report.scannedFiles = Object.keys(fileContents).length || report.scannedFiles;
    report.skippedFiles = Math.max(0, treeFiles.length - report.scannedFiles);
    return saveSecurityReport(repository, report);
  }

  let completed = 0;
  for (let offset = 0; offset < sources.length; offset += SECURITY_BATCH_SIZE) {
    const batch = sources.slice(offset, offset + SECURITY_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (file) => {
      const previouslySanitized = (repository.securitySanitizedPaths || []).includes(file.path);
      const cached = repository.files?.[file.path];
      if (!previouslySanitized && typeof cached === "string" && sanitizeSensitiveContent(cached) === cached && new TextEncoder().encode(cached).length <= MAX_SECURITY_FILE_BYTES) {
        return { file, content: cached };
      }
      const sharedCache = getCachedFileContent(repository.owner, repository.name, file.path, MAX_SECURITY_FILE_BYTES);
      if (sharedCache !== null) return { file, content: sharedCache };
      try {
        const content = await fetchGitHubFile(repository.owner, repository.name, file.path, file.size, MAX_SECURITY_FILE_BYTES);
        return { file, content };
      } catch (error) {
        if (isUnpreviewableFile(error)) return { file, skipped: true };
        throw error;
      }
    }));

    for (const result of results) {
      completed += 1;
      if (!result.skipped) {
        cacheSafeFileContent(repository.owner, repository.name, result.file.path, result.content);
        fileContents[result.file.path] = result.content;
      }
      onProgress({ completed, total: sources.length });
    }
  }

  const report = scanSecurity({
    tree: repository.tree || [],
    fileContents,
    dependencies: repository.dependencies || [],
    metadata: { ...repository, fileContents }
  });
  report.scannedFiles = Object.keys(fileContents).length;
  report.skippedFiles = Math.max(0, treeFiles.length - report.scannedFiles);
  return saveSecurityReport(repository, report);
}

export const repoService = {
  async analyze(url) {
    if (!useMocks) {
      const response = await api.post("/api/github/analyze", { url });
      const repository = response.data.data;
      if (!repository.analysisId) throw new Error("The analysis could not be saved to your account.");
      return { ...repository, id: repository.analysisId };
    }
    await mockDelay(true, 900);
    const slug = url.replace(/\/+$/, "").split("/").slice(-2).join("/").toLowerCase();
    const repo = repositories.find((item) => item.fullName.toLowerCase() === slug) || {
      ...getRepo("octocat-hello-world"),
      owner: slug.split("/")[0] || "octocat",
      name: slug.split("/")[1] || "hello-world",
      fullName: slug || "octocat/hello-world",
      id: slug.replace("/", "-") || "octocat-hello-world",
      url
    };
    const record = { ...repo, analyzedAt: new Date().toISOString(), status: "Completed" };
    return historyService.save(record);
  },
  async getById(id) {
    if (useMocks) {
      return historyService.get(id);
    }
    const saved = (await historyService.list()).find((item) => item.id === id);
    if (saved) return saved;
    const separator = id.indexOf("~");
    if (separator <= 0) throw new Error("Analysis not found. Try analyzing the public repository again.");
    return this.analyze(`https://github.com/${id.slice(0, separator)}/${id.slice(separator + 1)}`);
  },
  async getComparison(idA, idB) {
    return historyService.getComparison(idA, idB);
  },
  async getTree(owner, repo) {
    if (useMocks) return mockDelay(getRepo(`${owner}-${repo}`).tree);
    const [metadata, treeResult] = await Promise.all([
      githubRequest(githubRepoPath(owner, repo)),
      githubRequest(`${githubRepoPath(owner, repo)}/git/trees/HEAD?recursive=1`)
    ]);
    return buildNestedTree(await getCompleteTree(owner, repo, metadata.default_branch, treeResult)).tree;
  },
  async getLanguages(owner, repo) {
    if (useMocks) return mockDelay(getRepo(`${owner}-${repo}`).languages);
    const bytes = await githubRequest(`${githubRepoPath(owner, repo)}/languages`);
    const total = Object.values(bytes).reduce((sum, amount) => sum + amount, 0);
    return Object.fromEntries(Object.entries(bytes).map(([name, amount]) => [name, total ? Math.round((amount / total) * 1000) / 10 : 0]));
  },
  async getFile(owner, repo, path, size) {
    if (Number(size) > MAX_FILE_BYTES) throw new Error("File too large / binary file. File previews are limited to 200 KB.");
    if (!useMocks) {
      const cached = getCachedFileContent(owner, repo, path, MAX_FILE_BYTES);
      if (cached !== null) return cached;
      const contents = await fetchGitHubFile(owner, repo, path, size);
      cacheSafeFileContent(owner, repo, path, contents);
      return contents;
    }
    const value = getRepo(`${owner}-${repo}`).files[path];
    if (!value) throw new Error("This file is not available in the sample preview.");
    if (new TextEncoder().encode(value).length > MAX_FILE_BYTES) {
      throw new Error("File too large / binary file. File previews are limited to 200 KB.");
    }
    return mockDelay(value);
  },
  async getGraphData(analysisId, onProgress) {
    return getRepositoryGraphData(analysisId, onProgress);
  },
  async getHealthReport(analysisId, onProgress, options) {
    return getRepositoryHealthReport(analysisId, onProgress, options);
  },
  async getSecurityReport(analysisId, onProgress, options) {
    return getRepositorySecurityReport(analysisId, onProgress, options);
  },
  async updateSecurityReport(analysisId, report) {
    const repository = await historyService.get(analysisId);
    return saveSecurityReport(repository, report);
  }
};
