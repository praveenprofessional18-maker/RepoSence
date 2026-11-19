import Analysis from "../models/Analysis.js";
import Repository from "../models/Repository.js";
import { logActivity } from "../utils/activity.js";
import { decodeGithubFile, githubGet, repositoryPath } from "../services/githubService.js";

function buildNestedTree(entries) {
  const root = [];
  for (const entry of entries || []) {
    const parts = String(entry.path || "").split("/").filter(Boolean);
    if (!parts.length) continue;
    let siblings = root;
    let currentPath = "";
    parts.forEach((name, index) => {
      currentPath = currentPath ? `${currentPath}/${name}` : name;
      const isFile = index === parts.length - 1 && entry.type === "blob";
      let node = siblings.find((item) => item.path === currentPath);
      if (!node) {
        node = isFile
          ? { name, path: currentPath, type: "file", size: entry.size || 0, sha: entry.sha }
          : { name, path: currentPath, type: "folder", children: [] };
        siblings.push(node);
      }
      if (!isFile) siblings = node.children;
    });
  }
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.type === b.type
      ? a.name.localeCompare(b.name)
      : a.type === "folder" ? -1 : 1);
    nodes.forEach((node) => node.children && sortNodes(node.children));
  };
  sortNodes(root);
  return root;
}

function parseManifests(entries, fileContents) {
  const dependencies = [];
  const frameworks = [];
  for (const [path, content] of Object.entries(fileContents)) {
    if (path.endsWith("package.json")) {
      try {
        const manifest = JSON.parse(content);
        for (const [name, version] of Object.entries(manifest.dependencies || {})) dependencies.push({ name, version: String(version), type: "prod" });
        for (const [name, version] of Object.entries(manifest.devDependencies || {})) dependencies.push({ name, version: String(version), type: "dev" });
        if (manifest.dependencies?.react || manifest.devDependencies?.react) frameworks.push("React");
        if (manifest.dependencies?.vite || manifest.devDependencies?.vite) frameworks.push("Vite");
        if (manifest.dependencies?.express || manifest.devDependencies?.express) frameworks.push("Express");
        if (manifest.dependencies?.mongoose || manifest.devDependencies?.mongoose) frameworks.push("Mongoose");
        if (manifest.dependencies?.vitest || manifest.devDependencies?.vitest) frameworks.push("Vitest");
        if (manifest.dependencies?.jest || manifest.devDependencies?.jest) frameworks.push("Jest");
      } catch {
        // Ignore malformed manifests; repository metadata remains usable.
      }
    }
  }
  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function assertPublicRepository(metadata) {
  if (metadata.private) {
    const error = new Error("Private repositories are not supported.");
    error.statusCode = 403;
    throw error;
  }
  return metadata;
}

export async function metadata(req, res) {
  const { owner, repo } = req.validated.params;
  const result = assertPublicRepository(await githubGet(repositoryPath(owner, repo)));
  res.json({ success: true, data: result });
}

export async function languages(req, res) {
  const { owner, repo } = req.validated.params;
  const metadataResult = assertPublicRepository(await githubGet(repositoryPath(owner, repo)));
  const result = await githubGet(`${repositoryPath(owner, repo)}/languages`);
  res.json({ success: true, data: { languages: result, defaultBranch: metadataResult.default_branch } });
}

export async function tree(req, res) {
  const { owner, repo } = req.validated.params;
  const { branch } = req.validated.query || {};
  const metadataResult = assertPublicRepository(await githubGet(repositoryPath(owner, repo)));
  const selectedBranch = branch || metadataResult.default_branch;
  const result = await githubGet(`${repositoryPath(owner, repo)}/git/trees/${encodeURIComponent(selectedBranch)}`, { recursive: 1 });
  res.json({
    success: true,
    data: {
      branch: selectedBranch,
      truncated: Boolean(result.truncated),
      tree: (result.tree || []).map(({ path, mode, type, sha, size, url }) => ({ path, mode, type, sha, size, url }))
    }
  });
}

export async function file(req, res) {
  const { owner, repo, path } = req.validated.query;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const result = await githubGet(`${repositoryPath(owner, repo)}/contents/${encodedPath}`);
  res.json({ success: true, data: { path, content: decodeGithubFile(result), size: result.size } });
}

export async function analyze(req, res) {
  const parsedUrl = new URL(req.body.url);
  const [ownerName, name] = parsedUrl.pathname.split("/").filter(Boolean);
  const owner = ownerName.replace(/[^A-Za-z0-9_.-]/g, "");
  const repoName = name.replace(/\.git$/i, "").replace(/[^A-Za-z0-9_.-]/g, "");
  const path = repositoryPath(owner, repoName);
  const repo = assertPublicRepository(await githubGet(path));
  const branch = req.body.branch || repo.default_branch;
  const [languageData, treeData] = await Promise.all([
    githubGet(`${path}/languages`),
    githubGet(`${path}/git/trees/${encodeURIComponent(branch)}`, { recursive: 1 })
  ]);
  const totalBytes = Object.values(languageData).reduce((sum, value) => sum + Number(value || 0), 0);
  const languagesByShare = Object.fromEntries(Object.entries(languageData).map(([key, value]) => [
    key,
    totalBytes ? Math.round((Number(value) / totalBytes) * 1000) / 10 : 0
  ]));
  const flatEntries = (treeData.tree || []).map((entry) => ({
    path: entry.path,
    type: entry.type,
    sha: entry.sha,
    size: entry.size || 0
  }));
  const manifestNames = new Set(["package.json", "requirements.txt", "pom.xml", "build.gradle", "build.gradle.kts", ".env.example"]);
  const manifestEntries = flatEntries
    .filter((entry) => entry.type === "blob" && manifestNames.has(entry.path.split("/").pop().toLowerCase()))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  const fileContents = {};
  for (const entry of manifestEntries.slice(0, 20)) {
    try {
      const result = await githubGet(`${path}/contents/${entry.path.split("/").map(encodeURIComponent).join("/")}`);
      fileContents[entry.path] = decodeGithubFile(result);
    } catch {
      // Unavailable or binary manifests are omitted.
    }
  }
  const parsedManifests = parseManifests(flatEntries, fileContents);
  const repositoryData = {
    id: `${owner}-${repo.name}`,
    owner,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    ownerAvatar: repo.owner?.avatar_url || "",
    ownerUrl: repo.owner?.html_url || `https://github.com/${owner}`,
    description: repo.description || "No description provided.",
    summary: repo.description || "No description provided by the repository owner.",
    architecture: "Architecture insights are available after repository analysis with the saved repository context.",
    modules: [],
    quality: null,
    recommendations: [],
    language: repo.language || "Unknown",
    languages: languagesByShare,
    languageBytes: languageData,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    watchers: repo.subscribers_count || repo.watchers_count || 0,
    issues: repo.open_issues_count || 0,
    license: repo.license?.spdx_id || repo.license?.name || "Not specified",
    branch,
    size: repo.size || 0,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    topics: repo.topics || [],
    tree: buildNestedTree(flatEntries),
    files: fileContents,
    dependencies: parsedManifests.dependencies,
    frameworks: parsedManifests.frameworks,
    frameworkDetails: parsedManifests.frameworks.map((name) => ({ name, category: "Detected" })),
    fileCount: flatEntries.filter((item) => item.type === "blob").length,
    truncated: Boolean(treeData.truncated),
    analyzedAt: new Date().toISOString()
  };
  let analysisId = null;
  if (req.user) {
    const storedRepository = await Repository.findOneAndUpdate(
      { owner: req.user._id, githubId: repo.id },
      {
        $set: {
          fullName: repo.full_name,
          ownerName: owner,
          name: repo.name,
          url: repo.html_url,
          metadata: {
            description: repositoryData.description,
            language: repositoryData.language,
            stars: repositoryData.stars,
            forks: repositoryData.forks,
            license: repositoryData.license,
            defaultBranch: repo.default_branch
          }
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const analysis = await Analysis.create({
      owner: req.user._id,
      repository: storedRepository._id,
      repositoryName: repo.full_name,
      summary: repositoryData.description,
      data: repositoryData
    });
    analysisId = analysis.id;
    await logActivity({
      owner: req.user._id,
      action: "repository.analyzed",
      entityType: "analysis",
      entityId: analysis._id,
      details: { repository: repo.full_name }
    });
  }
  res.json({ success: true, data: { ...repositoryData, analysisId } });
}
