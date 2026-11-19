const SOURCE_EXTENSION = /\.(?:js|jsx|ts|tsx|vue|py|java|kt|kts|cs|go|rs|rb|php|c|h|cpp|hpp|swift|scala|sh|sql)$/i;
const TEXT_EXTENSION = /\.(?:js|jsx|ts|tsx|vue|py|java|kt|kts|cs|go|rs|rb|php|c|h|cpp|hpp|swift|scala|sh|sql|md|mdx|txt|html|css|scss|sass|less|json|ya?ml|xml|toml|ini|cfg|properties)$/i;
const SOURCE_EXTENSIONS = /\.(?:js|jsx|ts|tsx|vue|py|java|kt|kts|cs|go|rs|rb|php|c|h|cpp|hpp|swift|scala)$/i;
const TEST_FRAMEWORKS = /\b(?:jest|vitest|mocha|jasmine|ava|pytest|unittest|nose|junit|testng|xunit|nunit|rspec|phpunit|go test)\b/i;
const DEPRECATED_PACKAGES = new Set(["request", "node-sass", "left-pad", "gulp-util", "babel-eslint"]);
const WEIGHTS = {
  documentation: 20,
  testing: 20,
  structure: 20,
  dependencies: 20,
  maintainability: 20
};

function getPath(node, parentPath = "") {
  return node.path || (parentPath ? `${parentPath}/${node.name}` : node.name || "");
}

function flattenTree(tree, parentPath = "", files = [], folders = []) {
  for (const node of tree || []) {
    const path = getPath(node, parentPath);
    if (node.type === "folder") {
      folders.push({ path, depth: path.split("/").filter(Boolean).length });
      flattenTree(node.children, path, files, folders);
    } else {
      files.push({ ...node, path, size: Number(node.size) || 0 });
    }
  }
  return { files, folders };
}

function normalizeFileContents(fileContents) {
  if (Array.isArray(fileContents)) {
    return new Map(fileContents
      .filter((file) => file && typeof file.path === "string" && typeof file.content === "string")
      .map((file) => [file.path, file.content]));
  }
  if (!fileContents || typeof fileContents !== "object") return new Map();
  return new Map(Object.entries(fileContents).flatMap(([path, value]) => {
    if (typeof value === "string") return [[path, value]];
    if (value && typeof value.content === "string") return [[path, value.content]];
    return [];
  }));
}

function basename(path) {
  return path.split("/").pop()?.toLowerCase() || "";
}

function isDirectoryNamed(files, folders, names) {
  return folders.some((folder) => names.includes(basename(folder.path))) ||
    files.some((file) => names.includes(basename(file.path)));
}

function countLines(content) {
  return content ? content.split(/\r?\n/).length : 0;
}

function weightedScore(signals) {
  const available = signals.filter((signal) => signal.available);
  const totalWeight = available.reduce((sum, signal) => sum + signal.weight, 0);
  if (!totalWeight) return null;
  return Math.round(available.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / totalWeight);
}

function signal(label, score, weight, text, available = true) {
  return {
    label,
    score,
    weight,
    text,
    available,
    severity: score < 50 ? "critical" : score < 80 ? "warning" : "info"
  };
}

function categoryResult(signals) {
  const score = weightedScore(signals);
  return {
    score,
    details: signals.filter((item) => item.available).map(({ label, score: detailScore, severity, text }) => ({
      label,
      score: detailScore,
      severity,
      text
    }))
  };
}

function getReadme(files, contentsByPath) {
  const file = files.find((item) => /^readme(?:\.[^.]*)?$/i.test(basename(item.path)));
  return { file, content: file ? contentsByPath.get(file.path) : undefined };
}

function getTestFiles(files) {
  return files.filter((file) =>
    /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|$)/i.test(file.path) ||
    /\.(?:test|spec)\.[^.]+$/i.test(file.path)
  );
}

function detectCommentRatio(fileContents) {
  let total = 0;
  let comments = 0;
  let sampled = false;
  for (const [path, content] of fileContents) {
    if (!SOURCE_EXTENSIONS.test(path)) continue;
    sampled = true;
    const lines = content.split(/\r?\n/);
    total += lines.length;
    comments += lines.filter((line) => /^\s*(?:\/\/|\/\*|\*|#|<!--|--\s)/.test(line)).length;
  }
  return sampled && total ? comments / total : null;
}

function extractTodoItems(fileContents) {
  const items = [];
  for (const [path, content] of fileContents) {
    content.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(/\b(TODO|FIXME|HACK|XXX)\b/i);
      if (!match) return;
      const type = match[1].toUpperCase();
      if (!["TODO", "FIXME", "HACK", "XXX"].includes(type)) return;
      items.push({ path, line: index + 1, type, text: line.trim().slice(0, 240) });
    });
  }
  return items;
}

function getLineCount(path, contentsByPath) {
  const content = contentsByPath.get(path);
  return typeof content === "string" ? countLines(content) : null;
}

function detailSignals(signals) {
  return categoryResult(signals);
}

function hasManifest(files) {
  return files.some((file) => ["package.json", "requirements.txt", "pom.xml", "cargo.toml", "go.mod", "pyproject.toml", "composer.json"].includes(basename(file.path)));
}

function hasLockfile(files) {
  return files.some((file) => /(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|pipfile\.lock|cargo\.lock|composer\.lock|gemfile\.lock)$/i.test(basename(file.path)));
}

function findChecklist(files, folders) {
  const names = new Set(files.map((file) => basename(file.path)));
  const hasTests = getTestFiles(files).length > 0 || folders.some((folder) => /^(?:test|tests|__tests__|spec)$/i.test(basename(folder.path)));
  const hasCi = folders.some((folder) => folder.path.toLowerCase().startsWith(".github/workflows/")) ||
    files.some((file) => file.path.toLowerCase().startsWith(".github/workflows/"));
  const hasLint = [...names].some((name) =>
    name.startsWith(".eslintrc") || name.startsWith(".prettierrc") ||
    ["eslint.config.js", "eslint.config.mjs", "prettier.config.js", "prettier.config.mjs", ".editorconfig"].includes(name)
  );
  return [
    { id: "readme", label: "README", present: [...names].some((name) => /^readme(?:\..*)?$/.test(name)), severity: "warning", tip: "Add a README with the project purpose, setup, usage, and license." },
    { id: "license", label: "LICENSE", present: [...names].some((name) => /^licen[cs]e(?:\..*)?$/.test(name)), severity: "warning", tip: "Add a license file that explains how others may use this project." },
    { id: "gitignore", label: ".gitignore", present: names.has(".gitignore"), severity: "warning", tip: "Ignore generated files, local environment files, and dependency folders." },
    { id: "tests", label: "Tests", present: hasTests, severity: "warning", tip: "Add automated tests for important user-facing and business logic." },
    { id: "ci", label: "CI config (.github/workflows)", present: hasCi, severity: "info", tip: "Add a CI workflow that installs dependencies and runs the test suite." },
    { id: "contributing", label: "CONTRIBUTING", present: [...names].some((name) => /^contributing(?:\..*)?$/.test(name)), severity: "info", tip: "Document how to report issues and submit changes." },
    { id: "changelog", label: "CHANGELOG", present: [...names].some((name) => /^changelog(?:\..*)?$/.test(name)), severity: "info", tip: "Keep a changelog of notable releases and user-visible changes." },
    { id: "env-example", label: ".env.example", present: names.has(".env.example"), severity: "info", tip: "Document required environment variable names without including secret values." },
    { id: "lint", label: "Lint / format config", present: hasLint, severity: "info", tip: "Add a shared lint or formatting configuration to keep changes consistent." }
  ];
}

function calculateFileTypeDistribution(files) {
  const distribution = new Map();
  for (const file of files) {
    const name = basename(file.path);
    const dot = name.lastIndexOf(".");
    const type = dot > 0 ? name.slice(dot + 1).toUpperCase() : "NO EXTENSION";
    const item = distribution.get(type) || { type, count: 0, bytes: 0 };
    item.count += 1;
    item.bytes += Number(file.size) || 0;
    distribution.set(type, item);
  }
  return [...distribution.values()].sort((left, right) => right.bytes - left.bytes || right.count - left.count);
}

function getTopImprovements(categories, checklist, todoItems) {
  const improvements = [];
  const missing = checklist.filter((item) => !item.present);
  const recommendation = (title, description, severity, category, effort) =>
    improvements.push({ title, description, severity, category, effort });

  if (!checklist.find((item) => item.id === "readme")?.present) {
    recommendation("Document the project entry point", "Add a README with installation, usage, and license information.", "warning", "Documentation", "low");
  }
  if (!checklist.find((item) => item.id === "tests")?.present || (categories.testing.score ?? 100) < 70) {
    recommendation("Add or expand automated tests", "Create tests for core behavior and run them from continuous integration.", "critical", "Testing", "medium");
  }
  if (!checklist.find((item) => item.id === "gitignore")?.present) {
    recommendation("Add a .gitignore file", "Exclude build output, dependencies, local configuration, and generated files.", "warning", "Structure", "low");
  }
  if ((categories.dependencies.score ?? 100) < 70) {
    recommendation("Review dependency declarations", "Add a lockfile and replace wildcard or deprecated dependency versions with maintained ranges.", "warning", "Dependencies", "medium");
  }
  if ((categories.maintainability.score ?? 100) < 70) {
    recommendation("Reduce maintenance hotspots", "Split oversized files and review the sampled TODO, FIXME, HACK, and XXX markers.", "warning", "Maintainability", "high");
  }
  if ((categories.documentation.score ?? 100) < 70 && !missing.some((item) => item.id === "readme")) {
    recommendation("Improve repository documentation", "Add setup and usage sections and keep contributor guidance current.", "info", "Documentation", "low");
  }
  if (todoItems.length > 10) {
    recommendation("Triage outstanding markers", `The sample contains ${todoItems.length} TODO-style markers; prioritize and track the actionable items.`, "info", "Maintainability", "medium");
  }
  if (!improvements.length) {
    recommendation("Keep quality signals current", "Continue running tests, reviewing dependencies, and updating project documentation.", "info", "Maintainability", "low");
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };
  return improvements
    .sort((left, right) => severityRank[left.severity] - severityRank[right.severity])
    .slice(0, 5);
}

// Each score calculator returns null when its underlying signals are unavailable.
// The overall score averages only available categories, preserving the 20% category weights.
export function scoreDocumentation({ files = [], folders = [], contentsByPath = new Map(), commentRatio = null, treeKnown = true } = {}) {
  const { file: readme, content } = getReadme(files, contentsByPath);
  const readmeSections = content
    ? ["install", "usage", "license"].filter((term) => new RegExp(term === "install" ? "install|getting started|setup" : term, "i").test(content)).length
    : null;
  const signals = [
    signal("README exists", readme ? 100 : 0, 3, readme ? "A README file is present." : "No README file was found.", treeKnown),
    signal("README quality", !content ? 0 : Math.min(100, (countLines(content) >= 20 ? 40 : countLines(content) >= 8 ? 25 : 10) + (readmeSections || 0) * 20), 3,
      !content ? "README content was not available in the sample." : `README has ${countLines(content)} lines and ${readmeSections} common setup, usage, or license sections.`, Boolean(content)),
    signal("Documentation folder", folders.some((folder) => ["docs", "documentation"].includes(basename(folder.path))) ? 100 : 0, 1,
      folders.some((folder) => ["docs", "documentation"].includes(basename(folder.path))) ? "A documentation folder is present." : "No docs/ or documentation/ folder was found.", treeKnown),
    signal("Contributor and release guides", ["contributing", "changelog"].filter((name) => files.some((file) => basename(file.path).startsWith(name))).length * 50, 1,
      "Checks for CONTRIBUTING and CHANGELOG files.", treeKnown),
    signal("Sampled code comments", commentRatio === null ? 0 : Math.min(100, Math.round(commentRatio * 500)), 2,
      commentRatio === null ? "No source-file contents were available to estimate comment ratio." : `About ${Math.round(commentRatio * 100)}% of sampled source lines look like comments.`, commentRatio !== null)
  ];
  return detailSignals(signals);
}

export function scoreTesting({ files = [], folders = [], dependencies = null, ciRunsTests = null, treeKnown = true } = {}) {
  const tests = getTestFiles(files);
  const sourceCount = files.filter((file) => SOURCE_EXTENSION.test(file.path) && !tests.includes(file)).length;
  const testFolders = folders.some((folder) => ["test", "tests", "__tests__", "spec"].includes(basename(folder.path)));
  const frameworkFound = Array.isArray(dependencies) && dependencies.some((dependency) => TEST_FRAMEWORKS.test(dependency.name || ""));
  const ratioAvailable = treeKnown && (sourceCount + tests.length > 0);
  const ratioScore = ratioAvailable
    ? Math.min(100, Math.round(tests.length / Math.max(1, sourceCount) * 100))
    : 0;
  return detailSignals([
    signal("Test folders", testFolders ? 100 : 0, 2, testFolders ? "A test-oriented folder is present." : "No test, tests, __tests__, or spec folder was found.", treeKnown),
    signal("Test files", Math.min(100, tests.length * 25), 2, `${tests.length} test-like files were found.`, treeKnown),
    signal("Test framework", frameworkFound ? 100 : 0, 2, frameworkFound ? "A recognized test framework appears in dependencies." : "No recognized test framework was found in the dependency list.", Array.isArray(dependencies)),
    signal("Test-to-source ratio", ratioScore, 2, ratioAvailable ? `${tests.length} test files for ${sourceCount} source files.` : "A test-to-source ratio could not be calculated.", ratioAvailable),
    signal("CI runs tests", ciRunsTests === null ? 0 : ciRunsTests ? 100 : 25, 2,
      ciRunsTests === null ? "No readable CI workflow was available." : ciRunsTests ? "A sampled CI workflow contains a test command." : "A CI workflow was found, but no common test command was detected.", ciRunsTests !== null)
  ]);
}

export function scoreStructure({ files = [], folders = [], treeKnown = true } = {}) {
  const rootFileCount = files.filter((file) => !file.path.includes("/")).length;
  const maxDepth = folders.reduce((maximum, folder) => Math.max(maximum, folder.depth || 0), 0);
  const sensibleFolders = folders.some((folder) => ["src", "app", "lib", "packages", "public"].includes(basename(folder.path)));
  const configFiles = files.some((file) => [".gitignore", ".editorconfig"].includes(basename(file.path)) ||
    /^eslint\.config\.|^\.eslintrc|^prettier\.config\.|^\.prettierrc/.test(basename(file.path)));
  const generated = files.some((file) => /(?:^|\/)(?:node_modules|dist|build)(?:\/|$)/i.test(file.path) || basename(file.path) === ".env");
  const depthScore = maxDepth <= 4 ? 100 : Math.max(0, 100 - (maxDepth - 4) * 15);
  const rootScore = rootFileCount <= 20 ? 100 : rootFileCount <= 40 ? 80 : rootFileCount <= 80 ? 55 : 25;
  return detailSignals([
    signal("Top-level organization", sensibleFolders ? 100 : 50, 2, sensibleFolders ? "A conventional source or public directory is present." : "Consider grouping application code into clear top-level folders.", treeKnown),
    signal("Folder depth", depthScore, 1, `The deepest folder path has ${maxDepth} levels.`, treeKnown),
    signal("Files at repository root", rootScore, 1, `${rootFileCount} files are located at the repository root.`, treeKnown),
    signal("Repository configuration", configFiles ? 100 : 45, 2, configFiles ? "A .gitignore, editor, or lint configuration file is present." : "No common editor, ignore, or lint configuration file was found.", treeKnown),
    signal("Generated or local files", generated ? 0 : 100, 2, generated ? "The tree includes node_modules, build output, or a .env file." : "No node_modules, dist/build output, or .env file was found in the tree.", treeKnown)
  ]);
}

export function scoreDependencies({ files = [], dependencies = null, treeKnown = true } = {}) {
  const manifest = hasManifest(files);
  const lockfile = hasLockfile(files);
  const dependencyList = Array.isArray(dependencies) ? dependencies : null;
  const unsafe = dependencyList?.filter((item) =>
    /^(?:\*|latest|x)$/i.test(String(item.version || "").trim()) ||
    DEPRECATED_PACKAGES.has(String(item.name || "").toLowerCase())
  ) || [];
  const count = dependencyList?.length || 0;
  const countScore = count <= 30 ? 100 : count <= 80 ? 80 : count <= 150 ? 55 : 25;
  return detailSignals([
    signal("Manifest file", manifest ? 100 : 0, 2, manifest ? "A supported dependency manifest is present." : "No supported dependency manifest was found.", treeKnown),
    signal("Lockfile", lockfile ? 100 : 0, 2, lockfile ? "A dependency lockfile is present." : "No supported dependency lockfile was found.", treeKnown),
    signal("Dependency count", countScore, 2, `${count} dependencies were detected${count > 80 ? "; consider reviewing the dependency surface." : "."}`, dependencyList !== null),
    signal("Version and package hygiene", unsafe.length ? Math.max(0, 100 - unsafe.length * 35) : 100, 2,
      unsafe.length ? `${unsafe.length} wildcard/latest versions or commonly deprecated packages were detected.` : "No wildcard/latest versions or common deprecated packages were detected.", dependencyList !== null)
  ]);
}

export function scoreMaintainability({ files = [], contentsByPath = new Map(), todoItems = [], metadata = {}, treeKnown = true } = {}) {
  metadata = metadata && typeof metadata === "object" ? metadata : {};
  const nonEmptySizes = files.map((file) => Number(file.size) || 0).filter((size) => size > 0);
  const averageSize = nonEmptySizes.length ? nonEmptySizes.reduce((sum, size) => sum + size, 0) / nonEmptySizes.length : null;
  const largestSize = nonEmptySizes.length ? nonEmptySizes.reduce((largest, size) => Math.max(largest, size), 0) : null;
  const fileCount = contentsByPath.size;
  const sampledLines = [...contentsByPath.values()].reduce((sum, content) => sum + countLines(content), 0);
  const longFiles = [...contentsByPath.entries()].filter(([, content]) => countLines(content) > 500).length;
  const todoDensity = sampledLines ? todoItems.length / sampledLines : null;
  const pushedAt = metadata.pushedAt || metadata.pushed_at || metadata.updatedAt || metadata.updated_at;
  const referenceTime = metadata.analyzedAt || metadata.analyzed_at;
  const ageDays = pushedAt && referenceTime &&
    Number.isFinite(new Date(pushedAt).getTime()) && Number.isFinite(new Date(referenceTime).getTime())
    ? (new Date(referenceTime).getTime() - new Date(pushedAt).getTime()) / 86400000
    : null;
  const averageSizeScore = averageSize === null ? 0 : averageSize > 150 * 1024 ? 45 : averageSize > 80 * 1024 ? 75 : 100;
  const largestSizeScore = largestSize === null ? 0 : largestSize > 1000 * 1024 ? 20 : largestSize > 500 * 1024 ? 50 : 100;
  const sizeScore = Math.min(averageSizeScore, largestSizeScore);
  const longFileScore = fileCount ? Math.max(0, 100 - longFiles * 30) : 0;
  const todoScore = todoDensity === null ? 0 : Math.max(0, 100 - Math.round(todoDensity * 1000));
  const recencyScore = ageDays === null ? 0 : ageDays <= 90 ? 100 : ageDays <= 365 ? 80 : ageDays <= 730 ? 60 : 35;
  return detailSignals([
    signal("Average and largest file size", sizeScore, 2,
      averageSize === null ? "File-size data was not available." : `Average sampled repository file is ${Math.round(averageSize / 1024)} KB; largest is ${Math.round(largestSize / 1024)} KB.`, treeKnown && nonEmptySizes.length > 0),
    signal("Files over 500 lines", longFileScore, 2, fileCount ? `${longFiles} sampled files exceed 500 lines.` : "No sampled file contents were available for line counts.", fileCount > 0),
    signal("TODO-style marker density", todoScore, 2, sampledLines ? `${todoItems.length} TODO/FIXME/HACK/XXX markers across ${sampledLines} sampled lines.` : "No sampled text was available for marker scanning.", sampledLines > 0),
    signal("Recent repository activity", recencyScore, 2, ageDays === null ? "Repository push/update time was not available." : `Last push/update was about ${Math.max(0, Math.floor(ageDays))} days ago.`, ageDays !== null)
  ]);
}

export function calculateOverallScore(categories) {
  const available = Object.entries(WEIGHTS).filter(([key]) => Number.isFinite(categories[key]?.score));
  const totalWeight = available.reduce((sum, [key]) => sum + WEIGHTS[key], 0);
  if (!totalWeight) return null;
  return Math.round(available.reduce((sum, [key]) => sum + categories[key].score * WEIGHTS[key], 0) / totalWeight);
}

function gradeFor(score) {
  if (score === null) return "F";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function analyzeHealth({ metadata = {}, tree, languages = {}, dependencies = null, fileContents = {} } = {}) {
  metadata = metadata && typeof metadata === "object" ? metadata : {};
  languages = languages && typeof languages === "object" ? languages : {};
  const treeKnown = Array.isArray(tree);
  const contentsByPath = normalizeFileContents(fileContents);
  const flattened = flattenTree(tree || []);
  const files = flattened.files.map((file) => {
    const content = contentsByPath.get(file.path);
    const measuredSize = typeof content === "string" ? new TextEncoder().encode(content).length : 0;
    return { ...file, size: file.size || measuredSize };
  });
  const { folders } = flattened;
  const todoItems = extractTodoItems(contentsByPath);
  const commentRatio = detectCommentRatio(contentsByPath);
  const workflows = files.filter((file) => file.path.toLowerCase().startsWith(".github/workflows/"));
  const workflowContents = workflows.map((file) => contentsByPath.get(file.path)).filter((content) => typeof content === "string");
  const ciRunsTests = !treeKnown ? null : workflowContents.length
    ? workflowContents.some((content) => /\b(?:npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|pytest|python\s+-m\s+unittest|mvn\s+test|gradle\s+test|cargo\s+test|go\s+test|phpunit)\b/i.test(content))
    : workflows.length ? null : false;
  const dependencyData = Array.isArray(dependencies) ? dependencies : null;
  const categories = {
    documentation: scoreDocumentation({ files, folders, contentsByPath, commentRatio, treeKnown }),
    testing: scoreTesting({ files, folders, dependencies: dependencyData, ciRunsTests, treeKnown }),
    structure: scoreStructure({ files, folders, treeKnown }),
    dependencies: scoreDependencies({ files, dependencies: dependencyData, treeKnown }),
    maintainability: scoreMaintainability({ files, contentsByPath, todoItems, metadata, treeKnown })
  };
  const overallScore = calculateOverallScore(categories);
  const checklist = findChecklist(files, folders);
  const lineCounts = new Map(files.map((file) => [file.path, getLineCount(file.path, contentsByPath)]));
  const largestFiles = [...files]
    .sort((left, right) => right.size - left.size || left.path.localeCompare(right.path))
    .slice(0, 10)
    .map((file) => ({ path: file.path, size: file.size, lines: lineCounts.get(file.path) ?? null }));
  const deepestFolders = [...folders]
    .sort((left, right) => right.depth - left.depth || left.path.localeCompare(right.path))
    .slice(0, 5);

  return {
    overallScore,
    grade: gradeFor(overallScore),
    categories,
    checklist,
    largestFiles,
    deepestFolders,
    fileTypeDistribution: calculateFileTypeDistribution(files),
    todoItems,
    topImprovements: getTopImprovements(categories, checklist, todoItems),
    sample: { filesScanned: contentsByPath.size, linesScanned: [...contentsByPath.values()].reduce((sum, content) => sum + countLines(content), 0), languageCount: Object.keys(languages || {}).length }
  };
}

export { flattenTree, extractTodoItems };
