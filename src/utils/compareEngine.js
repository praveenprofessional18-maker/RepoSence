const HEALTH_CATEGORIES = ["documentation", "testing", "structure", "dependencies", "maintainability"];
const DECISION_CATEGORIES = ["Popularity", "Activity", "Quality", "Security", "Stack"];
const NOT_ANALYZED = "Not analyzed";
const NOT_AVAILABLE = "Not available";

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function treeStats(tree = []) {
  let files = 0;
  let folders = 0;
  let depthTotal = 0;
  let maxDepth = 0;
  let depthCount = 0;
  const visit = (nodes, parentPath = "") => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
      if (!node || typeof node !== "object") continue;
      const path = node.path || [parentPath, node.name].filter(Boolean).join("/");
      const depth = path.split("/").filter(Boolean).length;
      if (node.type === "folder") {
        folders += 1;
        maxDepth = Math.max(maxDepth, depth);
        visit(node.children, path);
      } else {
        files += 1;
        const fileDepth = Math.max(0, depth - 1);
        depthTotal += fileDepth;
        depthCount += 1;
      }
    }
  };
  visit(tree, "");
  return {
    files,
    folders,
    maxDepth,
    avgDepth: depthCount ? Math.round((depthTotal / depthCount) * 10) / 10 : 0
  };
}

function metric({ id, label, category, unit = "", a, b, higherIsBetter = true, note, requiresAnalysis, neutral = false, compareA, compareB }) {
  return {
    id,
    label,
    category,
    unit,
    a,
    b,
    winner: pickWinner(compareA ?? a, compareB ?? b, { higherIsBetter, neutral }),
    higherIsBetter,
    neutral,
    ...(note ? { note } : {}),
    ...(requiresAnalysis ? { requiresAnalysis } : {})
  };
}

function valueOrUnavailable(value, formatter = (item) => item) {
  const parsed = numericValue(value);
  return parsed === null ? NOT_AVAILABLE : formatter(parsed);
}

function displayDate(value) {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? NOT_AVAILABLE : date.toISOString();
}

function healthScore(report, category) {
  if (!report) return NOT_ANALYZED;
  const value = category === "overall"
    ? report.overallScore
    : report.categories?.[category]?.score;
  return numericValue(value);
}

function normalizeNamedList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function dependencyMap(dependencies = []) {
  const result = new Map();
  for (const dependency of Array.isArray(dependencies) ? dependencies : []) {
    const name = String(dependency?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!result.has(key)) result.set(key, { name, version: String(dependency.version || "unspecified") });
  }
  return result;
}

function repoDescriptor(repository) {
  const languages = repository.languages && typeof repository.languages === "object" && !Array.isArray(repository.languages)
    ? repository.languages
    : {};
  return {
    id: repository.id,
    fullName: repository.fullName || repository.name || "Unknown repository",
    avatar: repository.ownerAvatar || repository.avatar || "",
    description: repository.description || "No description provided.",
    url: repository.url || `https://github.com/${repository.fullName || ""}`,
    language: repository.language || NOT_AVAILABLE,
    languages,
    stars: numericValue(repository.stars),
    forks: numericValue(repository.forks),
    watchers: numericValue(repository.watchers),
    issues: numericValue(repository.issues),
    updatedAt: repository.pushedAt || repository.updatedAt || null,
    createdAt: repository.createdAt || null,
    analyzedAt: repository.analyzedAt || null,
    size: numericValue(repository.size),
    tree: repository.tree || [],
    frameworks: normalizeNamedList(repository.frameworks),
    dependencies: Array.isArray(repository.dependencies) ? repository.dependencies : [],
    healthReport: repository.healthReport || null,
    securityReport: repository.securityReport || null
  };
}

function comparisonRepo(repository) {
  return {
    id: repository.id,
    fullName: repository.fullName,
    avatar: repository.avatar,
    description: repository.description,
    url: repository.url,
    language: repository.language,
    stars: repository.stars,
    forks: repository.forks,
    watchers: repository.watchers,
    issues: repository.issues,
    updatedAt: repository.updatedAt
  };
}

function compareNumber(a, b) {
  const left = numericValue(a);
  const right = numericValue(b);
  if (left === null || right === null) return null;
  return left === right ? 0 : left < right ? -1 : 1;
}

// Only directional metrics can produce a winner; neutral metrics remain informational.
// For directional metrics, higherIsBetter controls the side that wins.
function pickWinner(a, b, { higherIsBetter = true, neutral = false } = {}) {
  const comparison = compareNumber(a, b);
  if (comparison === null) return "n/a";
  if (neutral) return "tie";
  if (comparison === 0) return "tie";
  const aIsBetter = higherIsBetter ? comparison > 0 : comparison < 0;
  return aIsBetter ? "a" : "b";
}

function diffLists(listA = [], listB = []) {
  const a = normalizeNamedList(listA);
  const b = normalizeNamedList(listB);
  const aKeys = new Set(a.map((value) => value.toLowerCase()));
  const bKeys = new Set(b.map((value) => value.toLowerCase()));
  return {
    shared: a.filter((value) => bKeys.has(value.toLowerCase())),
    onlyA: a.filter((value) => !bKeys.has(value.toLowerCase())),
    onlyB: b.filter((value) => !aKeys.has(value.toLowerCase()))
  };
}

function diffDependencies(dependenciesA = [], dependenciesB = []) {
  const mapA = dependencyMap(dependenciesA);
  const mapB = dependencyMap(dependenciesB);
  const shared = [];
  const onlyA = [];
  const onlyB = [];
  for (const [key, dependency] of mapA) {
    if (!mapB.has(key)) {
      onlyA.push(dependency);
      continue;
    }
    const versionB = mapB.get(key).version;
    shared.push({
      name: dependency.name,
      versionA: dependency.version,
      versionB,
      differs: dependency.version !== versionB
    });
  }
  for (const [key, dependency] of mapB) {
    if (!mapA.has(key)) onlyB.push(dependency);
  }
  const sortByName = (left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  return {
    shared: shared.sort(sortByName),
    onlyA: onlyA.sort(sortByName),
    onlyB: onlyB.sort(sortByName),
    countA: mapA.size,
    countB: mapB.size
  };
}

function percentDiff(a, b) {
  const left = numericValue(a);
  const right = numericValue(b);
  if (left === null || right === null) return null;
  const base = Math.min(Math.abs(left), Math.abs(right));
  if (base === 0) return left === right ? 0 : null;
  return Math.round((Math.abs(left - right) / base) * 100);
}

function buildCategoryWinners(metrics = []) {
  return DECISION_CATEGORIES.map((category) => {
    const categoryMetrics = metrics.filter((item) => item.category === category && !item.neutral && item.winner !== "n/a");
    const winsA = categoryMetrics.filter((item) => item.winner === "a").length;
    const winsB = categoryMetrics.filter((item) => item.winner === "b").length;
    const winner = winsA === winsB ? "tie" : winsA > winsB ? "a" : "b";
    const scanNotRun = metrics.some((item) => item.category === category && (item.a === NOT_ANALYZED || item.b === NOT_ANALYZED));
    let reason;
    if (!categoryMetrics.length) {
      reason = category === "Quality"
        ? scanNotRun ? "Run a Health scan to compare quality scores." : "No comparable Health scores are available."
        : category === "Security"
          ? scanNotRun ? "Run a Security scan to compare risk signals." : "No comparable Security scores are available."
          : "No directional metrics are available; values are informational.";
    } else if (winner === "tie") {
      reason = "Available directional metrics are tied; no winner declared.";
    } else {
      reason = `${winner === "a" ? "Repo A" : "Repo B"} leads on ${winner === "a" ? winsA : winsB} of ${categoryMetrics.length} available directional metrics.`;
    }
    return { category, winner, reason };
  });
}

function buildComparison(analysisA, analysisB) {
  const a = repoDescriptor(analysisA);
  const b = repoDescriptor(analysisB);
  const statsA = treeStats(a.tree);
  const statsB = treeStats(b.tree);
  const languages = diffLists(Object.keys(a.languages), Object.keys(b.languages));
  const dependencies = diffDependencies(a.dependencies, b.dependencies);
  const techStack = diffLists(a.frameworks, b.frameworks);
  const createdTimeA = a.createdAt ? new Date(a.createdAt).getTime() : null;
  const createdTimeB = b.createdAt ? new Date(b.createdAt).getTime() : null;
  const updatedTimeA = a.updatedAt ? new Date(a.updatedAt).getTime() : null;
  const updatedTimeB = b.updatedAt ? new Date(b.updatedAt).getTime() : null;
  const analysisTimeA = a.analyzedAt ? new Date(a.analyzedAt).getTime() : null;
  const analysisTimeB = b.analyzedAt ? new Date(b.analyzedAt).getTime() : null;
  const ageYears = (createdAt, analyzedAt) => Number.isFinite(createdAt) && Number.isFinite(analyzedAt)
    ? Math.round((Math.max(0, analyzedAt - createdAt) / (365.25 * 86400000)) * 10) / 10
    : null;
  const securityCount = (report) => {
    if (!report) return NOT_ANALYZED;
    const critical = numericValue(report.summary?.critical);
    const high = numericValue(report.summary?.high);
    return critical === null || high === null ? NOT_AVAILABLE : critical + high;
  };
  const dependencyCount = (items, types) => items.filter((item) => item && types.includes(item.type)).length;
  const metrics = [
    metric({ id: "stars", label: "Stars", category: "Popularity", unit: "stars", a: a.stars, b: b.stars }),
    metric({ id: "forks", label: "Forks", category: "Popularity", unit: "forks", a: a.forks, b: b.forks }),
    metric({ id: "watchers", label: "Watchers", category: "Popularity", unit: "watchers", a: a.watchers, b: b.watchers }),
    metric({ id: "open-issues", label: "Open issues (lower is better)", category: "Popularity", unit: "issues", a: a.issues, b: b.issues, higherIsBetter: false, note: "Fewer open issues is treated as a positive signal; this is not a measure of project quality." }),
    metric({ id: "last-pushed", label: "Last pushed (more recent is better)", category: "Activity", unit: "date", a: displayDate(a.updatedAt), b: displayDate(b.updatedAt), compareA: updatedTimeA, compareB: updatedTimeB }),
    metric({ id: "created-date", label: "Created date (informational)", category: "Activity", unit: "date", a: displayDate(a.createdAt), b: displayDate(b.createdAt), compareA: createdTimeA, compareB: createdTimeB, neutral: true, note: "Repository age is not ranked." }),
    metric({ id: "repo-age", label: "Repository age", category: "Activity", unit: "years", a: valueOrUnavailable(ageYears(createdTimeA, analysisTimeA), (value) => value), b: valueOrUnavailable(ageYears(createdTimeB, analysisTimeB), (value) => value), neutral: true, note: "Age is shown for context, not as a quality signal." }),
    metric({ id: "total-files", label: "Total files", category: "Size and structure", unit: "files", a: statsA.files, b: statsB.files, neutral: true, note: "Informational only; a larger repository is not inherently better." }),
    metric({ id: "total-folders", label: "Folders", category: "Size and structure", unit: "folders", a: statsA.folders, b: statsB.folders, neutral: true }),
    metric({ id: "repo-size", label: "Repository size", category: "Size and structure", unit: "KB", a: a.size, b: b.size, neutral: true }),
    metric({ id: "max-depth", label: "Maximum folder depth", category: "Size and structure", unit: "levels", a: statsA.maxDepth, b: statsB.maxDepth, neutral: true }),
    metric({ id: "language-count", label: "Languages detected", category: "Size and structure", unit: "languages", a: languagesAcount(a.languages), b: languagesAcount(b.languages), neutral: true }),
    metric({ id: "health-overall", label: "Overall health score", category: "Quality", unit: "/100", a: healthScore(a.healthReport, "overall"), b: healthScore(b.healthReport, "overall"), requiresAnalysis: "health" }),
    ...HEALTH_CATEGORIES.map((category) => metric({
      id: `health-${category}`,
      label: `${category[0].toUpperCase()}${category.slice(1)} score`,
      category: "Quality",
      unit: "/100",
      a: healthScore(a.healthReport, category),
      b: healthScore(b.healthReport, category),
      requiresAnalysis: "health"
    })),
    metric({ id: "security-safety", label: "Security safety score", category: "Security", unit: "/100", a: a.securityReport ? numericValue(a.securityReport.riskScore) : NOT_ANALYZED, b: b.securityReport ? numericValue(b.securityReport.riskScore) : NOT_ANALYZED, requiresAnalysis: "security" }),
    metric({ id: "security-high-critical", label: "Critical + high findings (lower is better)", category: "Security", unit: "findings", a: securityCount(a.securityReport), b: securityCount(b.securityReport), higherIsBetter: false, requiresAnalysis: "security", note: "Counts heuristic findings after false-positive exclusions." }),
    metric({ id: "primary-language", label: "Primary language", category: "Stack", unit: "", a: a.language, b: b.language, neutral: true, note: "Different languages are descriptive, not ranked." }),
    metric({ id: "framework-count", label: "Frameworks and libraries", category: "Stack", unit: "items", a: a.frameworks.length, b: b.frameworks.length, neutral: true }),
    metric({ id: "production-dependencies", label: "Production dependencies", category: "Stack", unit: "packages", a: dependencyCount(a.dependencies, ["prod", "production"]), b: dependencyCount(b.dependencies, ["prod", "production"]), neutral: true }),
    metric({ id: "development-dependencies", label: "Development dependencies", category: "Stack", unit: "packages", a: dependencyCount(a.dependencies, ["dev", "development"]), b: dependencyCount(b.dependencies, ["dev", "development"]), neutral: true })
  ];
  const categoryWinners = buildCategoryWinners(metrics);
  // Categories use a majority of available directional metric wins; each category gets one vote overall.
  const scoreA = categoryWinners.filter((item) => item.winner === "a").length;
  const scoreB = categoryWinners.filter((item) => item.winner === "b").length;
  const winner = scoreA === scoreB ? "tie" : scoreA > scoreB ? "a" : "b";
  const overallWinner = {
    winner,
    scoreA,
    scoreB,
    reason: winner === "tie"
      ? "No overall winner: category results are tied or informational."
      : `${winner === "a" ? a.fullName : b.fullName} leads in ${Math.max(scoreA, scoreB)} of ${DECISION_CATEGORIES.length} comparable categories.`
  };
  return {
    repos: [comparisonRepo(a), comparisonRepo(b)],
    metrics,
    categoryWinners,
    overallWinner,
    languages,
    languageBreakdown: { a: a.languages, b: b.languages },
    dependencies,
    techStack,
    fileStats: {
      filesA: statsA.files,
      filesB: statsB.files,
      foldersA: statsA.folders,
      foldersB: statsB.folders,
      avgDepthA: statsA.avgDepth,
      avgDepthB: statsB.avgDepth,
      maxDepthA: statsA.maxDepth,
      maxDepthB: statsB.maxDepth,
      sizeA: a.size,
      sizeB: b.size
    }
  };
}

function languagesAcount(languages) {
  return Object.keys(languages || {}).length;
}

function markdownMetricValue(metric, side) {
  const value = metric[side];
  if (value === null || value === undefined || value === "") return NOT_AVAILABLE;
  if (metric.unit === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }
  if (typeof value !== "number") return String(value);
  if (metric.unit === "/100") return `${value}/100`;
  return `${value.toLocaleString()}${metric.unit ? ` ${metric.unit}` : ""}`;
}

function generateComparisonMarkdown(comparison) {
  const [repoA, repoB] = comparison.repos || [];
  const lines = [
    `# Repository comparison: ${repoA?.fullName || "Repo A"} vs ${repoB?.fullName || "Repo B"}`,
    "",
    `- Overall result: ${comparison.overallWinner?.winner === "tie" ? "Too close to call" : comparison.overallWinner?.winner === "a" ? repoA?.fullName : repoB?.fullName}`,
    `- Category score: Repo A ${comparison.overallWinner?.scoreA ?? 0} — Repo B ${comparison.overallWinner?.scoreB ?? 0}`,
    `- Reason: ${comparison.overallWinner?.reason || "No result available."}`,
    "",
    "## Category results",
    "",
    ...(comparison.categoryWinners || []).map((item) => `- **${item.category}:** ${item.winner === "tie" ? "Tie" : item.winner === "a" ? repoA?.fullName : repoB?.fullName} — ${item.reason}`),
    "",
    "## Metrics",
    "",
    "| Category | Metric | Repo A | Repo B | Winner |",
    "| --- | --- | ---: | ---: | --- |",
    ...(comparison.metrics || []).map((item) => `| ${item.category} | ${item.label} | ${markdownMetricValue(item, "a")} | ${markdownMetricValue(item, "b")} | ${item.winner === "a" ? "Repo A" : item.winner === "b" ? "Repo B" : item.winner === "tie" ? "Tie / informational" : "Not available"} |`),
    "",
    "## Languages",
    "",
    `- Shared: ${comparison.languages?.shared?.join(", ") || "None"}`,
    `- Only in Repo A: ${comparison.languages?.onlyA?.join(", ") || "None"}`,
    `- Only in Repo B: ${comparison.languages?.onlyB?.join(", ") || "None"}`,
    "",
    "## Dependencies",
    "",
    `- Counts: Repo A ${comparison.dependencies?.countA ?? 0}; Repo B ${comparison.dependencies?.countB ?? 0}`,
    `- Shared packages: ${(comparison.dependencies?.shared || []).length}`,
    `- Only in Repo A: ${(comparison.dependencies?.onlyA || []).map((item) => item.name).join(", ") || "None"}`,
    `- Only in Repo B: ${(comparison.dependencies?.onlyB || []).map((item) => item.name).join(", ") || "None"}`,
    "",
    "> Comparison is based on saved repository metadata and optional heuristic Health/Security scans; metrics are informational and do not imply overall project quality."
  ];
  return lines.join("\n");
}

export {
  compareNumber,
  pickWinner,
  diffLists,
  diffDependencies,
  percentDiff,
  buildCategoryWinners,
  buildComparison,
  generateComparisonMarkdown
};
