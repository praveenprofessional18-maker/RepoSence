import { sanitizeSensitiveContent } from "./securityScanner";
import { getDocType } from "./docTypes";
import mitLicense from "./licenses/MIT.txt?raw";
import apacheLicense from "./licenses/Apache-2.0.txt?raw";
import gplLicense from "./licenses/GPL-3.0-only.txt?raw";
import bsdLicense from "./licenses/BSD-3-Clause.txt?raw";
import unlicense from "./licenses/Unlicense.txt?raw";

const LICENSE_TEXTS = {
  MIT: mitLicense,
  "Apache-2.0": apacheLicense,
  "GPL-3.0": gplLicense,
  "BSD-3-Clause": bsdLicense,
  Unlicense: unlicense
};

const GITIGNORE_TEMPLATES = {
  node: ["node_modules/", "npm-debug.log*", "yarn-debug.log*", "pnpm-debug.log*", ".env", ".env.*", "!.env.example"],
  react: ["dist/", "build/", ".vite/", "coverage/"],
  python: ["__pycache__/", "*.py[cod]", ".venv/", "venv/", ".pytest_cache/", "*.egg-info/"],
  java: ["target/", "*.class", "*.jar", ".gradle/", "build/"],
  common: [".DS_Store", "Thumbs.db", ".idea/", ".vscode/", "*.swp"]
};

const safe = (value) => sanitizeSensitiveContent(String(value ?? "").trim());

function isEnabled(sections, id) {
  return sections?.[id] === true;
}

function safeList(values, limit = 20) {
  return (Array.isArray(values) ? values : []).map(safe).filter(Boolean).slice(0, limit);
}

function flattenTree(tree, parent = "", rows = []) {
  for (const node of Array.isArray(tree) ? tree : []) {
    const path = node.path || (parent ? `${parent}/${node.name}` : node.name || "");
    if (node.type === "folder") {
      rows.push({ path, type: "folder" });
      flattenTree(node.children, path, rows);
    } else if (node.type === "file") {
      rows.push({ path, type: "file" });
    }
  }
  return rows;
}

function getPackageJson(analysis) {
  const entry = Object.entries(analysis?.files || {}).find(([path]) => path.split("/").pop().toLowerCase() === "package.json");
  if (!entry) return {};
  try {
    return JSON.parse(entry[1]);
  } catch {
    return {};
  }
}

function getEnvironmentNames(analysis) {
  const entries = Object.entries(analysis?.files || {});
  const example = entries.find(([path]) => /(?:^|\/)\.env\.example$/i.test(path));
  if (!example || typeof example[1] !== "string") return [];
  return [...new Set(example[1].split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
    .filter(Boolean))].sort();
}

function getSelectedSections(typeId, sections) {
  const defaults = getDocType(typeId).sections;
  return defaults.filter(({ id, enabled }) => (
    sections && Object.hasOwn(sections, id) ? sections[id] !== false : enabled
  ));
}

function getProjectTitle(analysis) {
  return safe(analysis?.fullName || analysis?.name || "Project");
}

function getFolderList(analysis) {
  const rows = flattenTree(analysis?.tree);
  const folders = rows.filter((item) => item.type === "folder").slice(0, 100);
  const files = rows.filter((item) => item.type === "file").slice(0, 120);
  const selected = [...folders, ...files].sort((a, b) => a.path.localeCompare(b.path));
  return selected.length ? selected.map(({ path, type }) => `- \`${safe(path)}${type === "folder" ? "/" : ""}\``).join("\n") : "- Repository tree was not included in this analysis.";
}

function getScriptLines(analysis) {
  const scripts = getPackageJson(analysis).scripts;
  if (!scripts || typeof scripts !== "object") return [];
  return Object.entries(scripts).slice(0, 20).map(([name, command]) => `- \`npm run ${safe(name)}\` — \`${safe(command)}\``);
}

function getInstallCommands(analysis) {
  const files = Object.keys(analysis?.files || {}).map((path) => path.split("/").pop().toLowerCase());
  if (files.includes("package-lock.json")) return ["npm ci"];
  if (files.includes("pnpm-lock.yaml")) return ["pnpm install"];
  if (files.includes("yarn.lock")) return ["yarn install"];
  if (files.includes("requirements.txt")) return ["python -m pip install -r requirements.txt"];
  if (files.includes("pom.xml")) return ["./mvnw install"];
  if (files.includes("build.gradle") || files.includes("build.gradle.kts")) return ["./gradlew build"];
  return [];
}

function createBadges(analysis, options) {
  if (options?.badgeStyle === "none") return "";
  const style = options?.badgeStyle === "for-the-badge" ? "&style=for-the-badge" : "";
  const badges = [
    `![License](https://img.shields.io/badge/license-${encodeURIComponent(safe(analysis?.license || "unspecified")).replace(/%20/g, "_")}-blue${style})`,
    `![Language](https://img.shields.io/badge/language-${encodeURIComponent(safe(analysis?.language || "unknown")).replace(/%20/g, "_")}-informational${style})`
  ];
  return badges.join(" ");
}

function addTableOfContents(markdown, options) {
  if (!options?.includeToc) return markdown;
  const toc = buildToc(extractHeadings(markdown).filter((heading) => heading.level > 1));
  if (!toc) return markdown;
  const heading = markdown.match(/^# .+$/m);
  if (!heading) return `${toc}\n\n${markdown}`;
  const index = heading.index + heading[0].length;
  return `${markdown.slice(0, index)}\n\n${toc}\n${markdown.slice(index)}`;
}

function reorderMarkdownSections(markdown, typeId, order) {
  if (!Array.isArray(order) || order.length < 2) return markdown;
  const sectionTitles = {
    readme: {
      description: "Description", features: "Features", techStack: "Tech stack", folderStructure: "Folder structure",
      installation: "Installation", usage: "Usage", environment: "Environment variables", scripts: "Scripts",
      apiOverview: "API overview", screenshots: "Screenshots", roadmap: "Roadmap", contributing: "Contributing",
      license: "License", author: "Author"
    },
    onboarding: {
      overview: "Understand the project in 30 minutes", setup: "Setup steps", folders: "Key folders",
      files: "Important files to read first", dataFlow: "Data flow", tasks: "Common tasks",
      troubleshooting: "Troubleshooting", glossary: "Glossary"
    },
    contributing: {
      welcome: "Welcome", setup: "Development setup", workflow: "Contribution workflow",
      style: "Code style", tests: "Tests and checks", pullRequests: "Pull requests", issues: "Issues"
    },
    architecture: {
      overview: "System overview", components: "Components and boundaries", structure: "Repository structure",
      dataFlow: "Data flow", dependencies: "Key dependencies", decisions: "Design notes",
      limitations: "Limitations and validation"
    },
    api: {
      overview: "API overview", routes: "Discovered route files", authentication: "Authentication",
      errors: "Errors and responses", examples: "Request examples", limitations: "Validation notes"
    },
    changelog: {
      format: "Changelog format", current: "Repository snapshot", next: "Unreleased", guidance: "Maintainer guidance"
    }
  };
  const titles = sectionTitles[typeId] || {};
  const lines = markdown.split(/\r?\n/);
  const headingIndices = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*(```|~~~)/.test(lines[index])) inFence = !inFence;
    if (!inFence && /^##\s+/.test(lines[index])) headingIndices.push(index);
  }
  if (headingIndices.length < 2) return markdown;
  const prefix = lines.slice(0, headingIndices[0]);
  const blocks = headingIndices.map((start, index) => ({
    heading: lines[start].replace(/^##\s+/, "").replace(/\s+#+$/, "").trim(),
    lines: lines.slice(start, headingIndices[index + 1] ?? lines.length)
  }));
  const tocIndex = blocks.findIndex((block) => block.heading.toLowerCase() === "table of contents");
  const toc = tocIndex >= 0 ? blocks.splice(tocIndex, 1)[0] : null;
  const rank = new Map(order.map((id, index) => [titles[id]?.toLowerCase(), index]).filter(([title]) => title));
  blocks.sort((left, right) => (rank.get(left.heading.toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
    - (rank.get(right.heading.toLowerCase()) ?? Number.MAX_SAFE_INTEGER));
  const orderedBlocks = blocks.flatMap((block) => block.lines);
  const tocLines = toc
    ? buildToc(extractHeadings([...prefix, ...orderedBlocks].join("\n")).filter((heading) => heading.level > 1)).split("\n")
    : [];
  return [...prefix, ...tocLines, ...orderedBlocks].join("\n").trim();
}

export function extractHeadings(markdown) {
  const headings = [];
  let inFence = false;
  for (const [index, line] of String(markdown ?? "").split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = match[2].replace(/[`*_~]/g, "").trim();
    const slug = text.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || `heading-${index + 1}`;
    headings.push({
      level: match[1].length,
      text,
      slug,
      line: index
    });
  }
  return headings;
}

export function buildToc(headings) {
  const rows = (Array.isArray(headings) ? headings : [])
    .filter((heading) => heading && heading.text && heading.slug)
    .map((heading) => `${"  ".repeat(Math.max(0, Number(heading.level) - 2))}- [${heading.text}](#${heading.slug})`);
  return rows.length ? `## Table of contents\n\n${rows.join("\n")}` : "";
}

export function detectGitignoreStacks(analysis = {}) {
  const frameworks = safeList(analysis.frameworks, 30).join(" ").toLowerCase();
  const dependencyNames = safeList((analysis.dependencies || []).map((item) => item?.name), 100).join(" ").toLowerCase();
  const language = safe(analysis.language).toLowerCase();
  const languages = Object.keys(analysis.languages || {}).map((name) => safe(name).toLowerCase()).join(" ");
  const manifests = Object.keys(analysis.files || {}).map((path) => path.split("/").pop().toLowerCase());
  return {
    node: /node|javascript|typescript/.test(`${language} ${languages} ${frameworks} ${dependencyNames}`) || manifests.includes("package.json"),
    react: /react|vite|next|vue|angular/.test(`${frameworks} ${dependencyNames}`),
    python: /python|django|flask|pytest/.test(`${language} ${languages} ${frameworks} ${dependencyNames}`) || manifests.some((name) => ["requirements.txt", "pyproject.toml", "setup.py"].includes(name)),
    java: /\bjava\b|spring|maven|gradle/.test(`${language} ${languages} ${frameworks} ${dependencyNames}`) || manifests.some((name) => ["pom.xml", "build.gradle", "build.gradle.kts"].includes(name)),
    common: true
  };
}

export function generateGitignore(analysis = {}, options = {}) {
  const detected = detectGitignoreStacks(analysis);
  const selected = options.gitignoreStacks || {};
  const enabled = Object.keys(GITIGNORE_TEMPLATES)
    .filter((key) => selected[key] ?? detected[key])
    .sort((left, right) => {
      const leftOrder = options.sectionOrder?.indexOf(left) ?? -1;
      const rightOrder = options.sectionOrder?.indexOf(right) ?? -1;
      if (leftOrder < 0 && rightOrder < 0) return 0;
      if (leftOrder < 0) return 1;
      if (rightOrder < 0) return -1;
      return leftOrder - rightOrder;
    });
  const rows = [];
  for (const key of enabled) {
    rows.push(`# ${key === "common" ? "Common local files" : `${key[0].toUpperCase()}${key.slice(1)} files`}`);
    rows.push(...GITIGNORE_TEMPLATES[key]);
    rows.push("");
  }
  return `${rows.join("\n").trim()}\n`;
}

export function generateLicense(options = {}) {
  const license = Object.hasOwn(LICENSE_TEXTS, options.license) ? options.license : "MIT";
  const year = String(options.year || new Date().getFullYear()).replace(/[^\d]/g, "").slice(0, 4) || String(new Date().getFullYear());
  const holder = safe(options.holder || "Copyright holder").replace(/[\r\n]/g, " ");
  if (license === "MIT") return LICENSE_TEXTS[license].replace("<year>", year).replace("<copyright holders>", holder).trimEnd();
  if (license === "BSD-3-Clause") return LICENSE_TEXTS[license].replace("<year>", year).replace("<owner>", holder).trimEnd();
  if (license === "Apache-2.0") return LICENSE_TEXTS[license].replace(/\[yyyy\]/g, year).replace(/\[name of copyright owner\]/g, holder).trimEnd();
  const attribution = `Copyright (C) ${year} ${holder}\n\n`;
  return `${attribution}${LICENSE_TEXTS[license].trimStart()}`.trimEnd();
}

function buildReadme(analysis, sections, options) {
  const title = getProjectTitle(analysis);
  const languages = Object.entries(analysis.languages || {}).map(([name, percent]) => `- ${safe(name)}${Number.isFinite(percent) ? ` (${percent}%)` : ""}`);
  const frameworks = safeList(analysis.frameworks, 20);
  const dependencies = safeList((analysis.dependencies || []).slice(0, 20).map((item) => `${item.name}${item.version ? ` (${item.version})` : ""}`));
  const installCommands = getInstallCommands(analysis);
  const scripts = getScriptLines(analysis);
  const envNames = getEnvironmentNames(analysis);
  const summary = safe(analysis.description || analysis.summary || "A brief description of this project goes here.");
  const rows = [`# ${options.includeEmojis ? "📘 " : ""}${title}`];
  if (isEnabled(sections, "badges")) rows.push("", createBadges(analysis, options));
  if (isEnabled(sections, "description")) rows.push("", "## Description", "", summary);
  if (isEnabled(sections, "features")) rows.push("", "## Features", "", analysis.summary ? `- ${safe(analysis.summary)}` : "- Describe the main capabilities of this project.", ...(frameworks.length ? frameworks.slice(0, 5).map((name) => `- Uses ${name}`) : []));
  if (isEnabled(sections, "techStack")) rows.push("", "## Tech stack", "", ...(languages.length ? languages : [`- ${safe(analysis.language || "Not detected")}`]), ...(frameworks.length ? frameworks.map((name) => `- ${name}`) : []), ...(dependencies.length ? ["", "### Dependencies", "", ...dependencies.map((name) => `- ${name}`)] : []));
  if (isEnabled(sections, "folderStructure")) rows.push("", "## Folder structure", "", getFolderList(analysis));
  if (isEnabled(sections, "installation")) rows.push("", "## Installation", "", ...(installCommands.length
    ? [...installCommands.map((command) => `\`${command}\``), "", "Review repository instructions and dependency manifests before running commands."]
    : ["Review repository instructions and dependency manifests before installing dependencies."]));
  if (isEnabled(sections, "usage")) rows.push("", "## Usage", "", scripts.length ? `Available scripts:\n\n${scripts.join("\n")}` : "Add verified examples or documented commands for using this project.");
  if (isEnabled(sections, "environment")) rows.push("", "## Environment variables", "", envNames.length ? `Set these variable names in your local environment. Values are intentionally omitted.\n\n${envNames.map((name) => `- \`${name}\``).join("\n")}` : "No variable names were found in a committed `.env.example` file.");
  if (isEnabled(sections, "scripts")) rows.push("", "## Scripts", "", scripts.length ? scripts.join("\n") : "No package scripts were available in the analyzed files.");
  if (isEnabled(sections, "apiOverview")) rows.push("", "## API overview", "", "Add verified API routes, methods, and authentication requirements here. RepoSense does not infer endpoints from file names alone.");
  if (isEnabled(sections, "screenshots")) rows.push("", "## Screenshots", "", "<!-- Add screenshots or a demo link here. -->");
  if (isEnabled(sections, "roadmap")) rows.push("", "## Roadmap", "", "- Add planned work after confirming project priorities.");
  if (isEnabled(sections, "contributing")) rows.push("", "## Contributing", "", "Contributions are welcome. Read the contribution guide and run the project's documented checks before submitting a change.");
  if (isEnabled(sections, "license")) rows.push("", "## License", "", safe(analysis.license || "Choose and add a license before publishing."));
  if (isEnabled(sections, "author")) rows.push("", "## Author", "", safe(analysis.owner || "Project maintainers"));
  return addTableOfContents(rows.join("\n").trim(), options);
}

function buildOnboarding(analysis, sections, options) {
  const title = getProjectTitle(analysis);
  const scripts = getScriptLines(analysis);
  const installCommands = getInstallCommands(analysis);
  const frameworks = safeList(analysis.frameworks, 20);
  const files = flattenTree(analysis.tree).filter((item) => item.type === "file").slice(0, 8);
  const rows = [`# ${options.includeEmojis ? "🚀 " : ""}Onboarding: ${title}`];
  if (isEnabled(sections, "overview")) rows.push("", "## Understand the project in 30 minutes", "", safe(analysis.summary || analysis.description || "Start with the entry points and repository metadata, then trace one representative feature end to end."), "", `Primary language: **${safe(analysis.language || "Not detected")}**${frameworks.length ? ` · Stack: ${frameworks.join(", ")}` : ""}.`);
  if (isEnabled(sections, "setup")) rows.push("", "## Setup steps", "", ...(installCommands.length ? installCommands.map((command, index) => `${index + 1}. Review the repository setup instructions, then run \`${command}\` if appropriate.`) : ["1. Read the repository setup instructions and review the dependency manifests before installing anything."]), `${installCommands.length + 1}. Copy the documented environment example and supply values locally; do not commit secrets.`, `${installCommands.length + 2}. Run a documented development command only after reviewing it.`);
  if (isEnabled(sections, "folders")) rows.push("", "## Key folders", "", getFolderList(analysis));
  if (isEnabled(sections, "files")) rows.push("", "## Important files to read first", "", ...(files.length ? files.map(({ path }, index) => `${index + 1}. \`${safe(path)}\``) : ["1. Start from the repository entry point and package/build manifests."]));
  if (isEnabled(sections, "dataFlow")) rows.push("", "## Data flow", "", safe(analysis.architecture || analysis.summary || "Trace an input from its entry point through the main modules and note where data is validated, transformed, and persisted."));
  if (isEnabled(sections, "tasks")) rows.push("", "## Common tasks", "", ...(scripts.length ? scripts : ["- Find the project's documented build, test, and development commands before running them."]));
  if (isEnabled(sections, "troubleshooting")) rows.push("", "## Troubleshooting", "", "- Confirm the documented runtime and dependency versions.", "- Check local environment variable names without sharing their values.", "- Review the relevant test output and logs; redact secrets before sharing.");
  if (isEnabled(sections, "glossary")) rows.push("", "## Glossary", "", ...frameworks.map((name) => `- **${name}:** Detected in repository metadata; confirm its role in the code and manifest.`), "- **Entry point:** The file or command that begins an application flow.");
  return addTableOfContents(rows.join("\n").trim(), options);
}

function buildContributing(analysis, sections, options) {
  const title = getProjectTitle(analysis);
  const scripts = getScriptLines(analysis);
  const installCommands = getInstallCommands(analysis);
  const rows = [`# Contributing to ${title}`];
  if (isEnabled(sections, "welcome")) rows.push("", "## Welcome", "", "Thanks for considering a contribution. Keep changes focused and explain the user-visible or maintenance benefit.");
  if (isEnabled(sections, "setup")) rows.push("", "## Development setup", "", ...(installCommands.length ? installCommands.map((command) => `- Review project instructions before running \`${command}\`.`) : ["- Review the repository setup instructions and dependency manifests before installing anything."]), "- Keep credentials in local environment configuration; never include secret values in issues or pull requests.");
  if (isEnabled(sections, "workflow")) rows.push("", "## Contribution workflow", "", "1. Open or find an issue describing the change.", "2. Create a focused branch and make a small, reviewable change.", "3. Add or update tests and documentation where applicable.", "4. Describe validation and known limitations in the pull request.");
  if (isEnabled(sections, "style")) rows.push("", "## Code style", "", `Follow the existing ${safe(analysis.language || "project")} conventions and nearby patterns. Avoid unrelated formatting changes.`);
  if (isEnabled(sections, "tests")) rows.push("", "## Tests and checks", "", scripts.length ? scripts.join("\n") : "Document the project's verified test and build commands here.", "", "Review scripts before running them; RepoSense never executes repository code.");
  if (isEnabled(sections, "pullRequests")) rows.push("", "## Pull requests", "", "Include a concise summary, linked issue when available, test results, and screenshots for UI changes.");
  if (isEnabled(sections, "issues")) rows.push("", "## Issues", "", "Include reproduction steps, expected behavior, actual behavior, and relevant environment details. Redact secrets and personal data.");
  return addTableOfContents(rows.join("\n").trim(), options);
}

function buildArchitecture(analysis, sections, options) {
  const title = getProjectTitle(analysis);
  const rows = [`# Architecture: ${title}`];
  if (isEnabled(sections, "overview")) rows.push("", "## System overview", "", safe(analysis.architecture || analysis.summary || "Architecture analysis was not available. Verify this overview against the repository before publishing."));
  if (isEnabled(sections, "components")) rows.push("", "## Components and boundaries", "", ...(safeList(analysis.modules?.map((module) => module.title), 15).length ? analysis.modules.slice(0, 15).map((module) => `- **${safe(module.title)}:** ${safe(module.body || "Review implementation and call sites to confirm responsibilities.")}`) : ["- Component boundaries were not available in the saved analysis."]));
  if (isEnabled(sections, "structure")) rows.push("", "## Repository structure", "", getFolderList(analysis));
  if (isEnabled(sections, "dataFlow")) rows.push("", "## Data flow", "", safe(analysis.summary || "Trace a representative request or user action from entry point through validation, service logic, and persistence."));
  if (isEnabled(sections, "dependencies")) rows.push("", "## Key dependencies", "", ...(safeList((analysis.dependencies || []).slice(0, 25).map((item) => `${item.name} ${item.version || ""}`)).map((item) => `- ${item}`) || ["- No dependency list was included."]));
  if (isEnabled(sections, "decisions")) rows.push("", "## Design notes", "", "Record verified architectural decisions, constraints, and alternatives here. Inferred structure should be confirmed by maintainers.");
  if (isEnabled(sections, "limitations")) rows.push("", "## Limitations and validation", "", "This draft is based on saved repository metadata and a summarized file tree. It is not a full architecture review.");
  return addTableOfContents(rows.join("\n").trim(), options);
}

function buildApiDocs(analysis, sections, options) {
  const routeFiles = flattenTree(analysis.tree)
    .filter(({ path, type }) => type === "file" && /(?:^|\/)(?:routes?|controllers?|handlers?)(?:\/|\.|$)/i.test(path))
    .slice(0, 40)
    .map(({ path }) => `- \`${safe(path)}\``);
  const rows = [`# API documentation: ${getProjectTitle(analysis)}`];
  if (isEnabled(sections, "overview")) rows.push("", "## API overview", "", `Detected stack: ${safeList(analysis.frameworks, 20).join(", ") || safe(analysis.language || "Not detected")}. This draft does not infer or assert endpoint behavior.`);
  if (isEnabled(sections, "routes")) rows.push("", "## Discovered route files", "", ...(routeFiles.length ? routeFiles : ["No route-related paths were identified in the summarized file tree. Add verified method and path details manually."]));
  if (isEnabled(sections, "authentication")) rows.push("", "## Authentication", "", "Document authentication requirements from verified route and middleware behavior. Do not include tokens or credentials.");
  if (isEnabled(sections, "errors")) rows.push("", "## Errors and responses", "", "Add verified status codes, response shapes, and error semantics for each endpoint.");
  if (isEnabled(sections, "examples")) rows.push("", "## Request examples", "", "Add safe, redacted requests after confirming the endpoint contract.");
  if (isEnabled(sections, "limitations")) rows.push("", "## Validation notes", "", "The saved analysis may not include every route or middleware file. Confirm endpoint details against current source.");
  return addTableOfContents(rows.join("\n").trim(), options);
}

function buildChangelog(analysis, sections, options) {
  const date = new Date(analysis.updatedAt || analysis.analyzedAt || Date.now()).toISOString().slice(0, 10);
  const rows = ["# Changelog"];
  if (isEnabled(sections, "format")) rows.push("", "All notable changes should be recorded here. Entries below are a starting point and are not inferred commit history.");
  if (isEnabled(sections, "current")) rows.push("", `## Repository snapshot (${date})`, "", `- Repository: ${getProjectTitle(analysis)}`, `- Primary language: ${safe(analysis.language || "Not detected")}`, `- License metadata: ${safe(analysis.license || "Not specified")}`);
  if (isEnabled(sections, "next")) rows.push("", "## Unreleased", "", "### Added", "", "- Describe new features.", "", "### Changed", "", "- Describe behavior changes.", "", "### Fixed", "", "- Describe bug fixes.");
  if (isEnabled(sections, "guidance")) rows.push("", "## Maintainer guidance", "", "Replace the repository snapshot with verified release entries. RepoSense does not read commit history for this draft.");
  return options.includeToc ? addTableOfContents(rows.join("\n").trim(), options) : rows.join("\n").trim();
}

export function buildBaseDocument({ type = "readme", analysis = {}, sections = {}, options = {} } = {}) {
  const typeId = getDocType(type).id;
  if (typeId === "gitignore") return generateGitignore(analysis, { ...options, sectionOrder: options.sectionOrder || getDocType(typeId).sections.map((item) => item.id) });
  if (typeId === "license") return generateLicense({ ...options, sections });
  const selected = getSelectedSections(typeId, sections);
  const selectedState = Object.fromEntries(selected.map(({ id }) => [id, true]));
  let markdown;
  if (typeId === "onboarding") markdown = buildOnboarding(analysis, selectedState, options);
  else if (typeId === "contributing") markdown = buildContributing(analysis, selectedState, options);
  else if (typeId === "architecture") markdown = buildArchitecture(analysis, selectedState, options);
  else if (typeId === "api") markdown = buildApiDocs(analysis, selectedState, options);
  else if (typeId === "changelog") markdown = buildChangelog(analysis, selectedState, options);
  else markdown = buildReadme(analysis, selectedState, options);
  return reorderMarkdownSections(markdown, typeId, options.sectionOrder);
}

export function lineDiff(original, updated) {
  const before = String(original ?? "") ? String(original).split(/\r?\n/) : [];
  const after = String(updated ?? "") ? String(updated).split(/\r?\n/) : [];
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  const lines = [];
  for (let index = 0; index < prefix; index += 1) lines.push({ type: "equal", line: before[index] });
  for (let index = prefix; index < before.length - suffix; index += 1) lines.push({ type: "removed", line: before[index] });
  for (let index = prefix; index < after.length - suffix; index += 1) lines.push({ type: "added", line: after[index] });
  for (let index = suffix; index > 0; index -= 1) lines.push({ type: "equal", line: before[before.length - index] });
  return lines;
}

export function countWords(text) {
  const words = String(text ?? "").trim().match(/\S+/g);
  return words ? words.length : 0;
}

export function hashOptions(options = {}) {
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    }
    return value;
  };
  const text = JSON.stringify(stable(options));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(36)}-${text.length.toString(36)}`;
}
