const TEXT_FILE_EXTENSION = /\.(?:js|jsx|ts|tsx|vue|py|java|kt|kts|cs|go|rs|rb|php|c|h|cpp|hpp|swift|scala|sh|sql|md|mdx|txt|html|css|scss|sass|less|json|ya?ml|xml|toml|ini|cfg|properties|lock)$/i;
const BINARY_EXTENSION = /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|rar|7z|woff2?|ttf|otf|mp[34]|mov|avi|exe|dll|so|dylib|class|jar|wasm)$/i;
const SECRET_PLACEHOLDER = /^(?:your[_-]?.*|xxx+|changeme|change[_-]?me|example.*|<[^>]+>|process\.env(?:\..*)?|import\.meta\.env(?:\..*)?|replace[_-]?me|dummy|placeholder|redacted|none|null|undefined)$/i;

export const SECRET_RULES = [
  { id: "secret.aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/g, severity: "critical", title: "AWS access key detected", fix: "Revoke and rotate the AWS access key, then load credentials from a secret manager." },
  { id: "secret.aws-secret-key", regex: /\b(?:aws_secret_access_key|aws_secret_key)\b\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi, severity: "critical", title: "AWS secret key detected", fix: "Revoke and rotate the AWS secret key, then load credentials from a secret manager." },
  { id: "secret.github-token", regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, severity: "critical", title: "GitHub token detected", fix: "Revoke the token in GitHub settings and replace it with a narrowly scoped secret." },
  { id: "secret.google-api-key", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/g, severity: "high", title: "Google or Firebase API key detected", fix: "Restrict the key to required APIs and rotate it if it grants privileged access." },
  { id: "secret.slack-token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, severity: "critical", title: "Slack token detected", fix: "Revoke the token in Slack and store a replacement outside the repository." },
  { id: "secret.stripe-live-key", regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{12,}\b/g, severity: "critical", title: "Stripe live key detected", fix: "Roll the live key in Stripe immediately and move it to a secret manager." },
  { id: "secret.twilio-key", regex: /\bSK[a-f0-9]{32}\b/gi, severity: "high", title: "Twilio API key detected", fix: "Revoke and rotate the Twilio key, then store it outside source control." },
  { id: "secret.sendgrid-key", regex: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{35,}\b/g, severity: "high", title: "SendGrid API key detected", fix: "Revoke the SendGrid key and replace it with a protected environment secret." },
  { id: "secret.private-key", regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]{20,}?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, severity: "critical", title: "Private key block detected", fix: "Remove the key from the repository, revoke or replace it, and rewrite Git history if it was committed." },
  { id: "secret.jwt", regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, severity: "high", title: "JWT-like value detected", fix: "Invalidate the token if it is active and avoid committing bearer tokens." },
  { id: "secret.database-url", regex: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^:\s/@]+:[^@\s/]+@[^/\s]+(?:\/[^\s"'`]*)?/gi, severity: "critical", title: "Database connection string contains credentials", fix: "Rotate the database password and move the connection string to a secret manager." },
  { id: "secret.generic-assignment", regex: /\b(?:api[_-]?key|secret|token|password|passwd|client[_-]?secret)\b\s*[:=]\s*["'`]([^"'`]{6,})["'`]/gi, severity: "high", title: "Possible hard-coded credential", fix: "Remove the credential, rotate it if real, and read it from a protected environment variable." }
];

export const RISKY_FILE_RULES = [
  { id: "risky-file.env", matcher: (path) => /^\.env(?:\.(?:local|production|development|staging))?$/i.test(fileName(path)) && !/^\.env\.(?:example|sample)$/i.test(fileName(path)), severity: "critical", title: "Committed environment file", fix: "Remove secrets from this file, rotate exposed values, and add local environment files to .gitignore." },
  { id: "risky-file.private-material", matcher: (path) => /\.(?:pem|key|p12|pfx|keystore)$/i.test(path) || /(?:^|\/)id_rsa(?:\.pub)?$/i.test(path), severity: "high", title: "Private key or certificate file committed", fix: "Remove the private material, revoke or replace it, and keep it outside version control." },
  { id: "risky-file.credentials", matcher: (path) => /(?:^|\/)(?:credentials\.json|service-account[^/]*\.json|secrets?\.[^/]+)$/i.test(path), severity: "high", title: "Credential or secrets file committed", fix: "Remove credentials from the repository, rotate them, and use a managed secret store." },
  { id: "risky-file.database", matcher: (path) => /\.(?:sqlite3?|db)$/i.test(path), severity: "medium", title: "Database file committed", fix: "Check this database for personal or sensitive data and exclude local database files if they are not intended to be public." },
  { id: "risky-file.dump", matcher: (path) => /\.(?:sql|bak|backup|dump)$/i.test(path), severity: "medium", title: "Database dump or backup file committed", fix: "Review this dump for sensitive records and remove it from source control if it is not intentionally public." },
  { id: "risky-file.generated", matcher: (path) => /(?:^|\/)(?:node_modules|dist|build)(?:\/|$)/i.test(path) || /(?:^|\/)\.DS_Store$/i.test(path), severity: "low", title: "Generated or local file committed", fix: "Remove generated output from source control and add the relevant path to .gitignore." },
  { id: "risky-file.binary", matcher: (path, file) => BINARY_EXTENSION.test(path) || Number(file?.size) > 1024 * 1024, severity: "info", title: "Binary or unusually large file committed", fix: "Confirm this binary is intended to be public and consider using release assets or large-file storage." }
];

export const CODE_PATTERN_RULES = [
  { id: "code.eval", regex: /\beval\s*\(/g, severity: "medium", title: "Dynamic code evaluation", fix: "Avoid evaluating strings as code; use explicit parsers or fixed function dispatch." },
  { id: "code.new-function", regex: /\bnew\s+Function\s*\(/g, severity: "medium", title: "Dynamic function construction", fix: "Replace dynamic function construction with explicit, statically defined logic." },
  { id: "code.html-injection", regex: /\b(?:innerHTML|dangerouslySetInnerHTML)\b/g, severity: "medium", title: "HTML injection sink", fix: "Sanitize untrusted input or render it as text; avoid assigning untrusted HTML." },
  { id: "code.document-write", regex: /\bdocument\.write\s*\(/g, severity: "low", title: "document.write usage", fix: "Use DOM APIs or a UI framework instead of document.write." },
  { id: "code.child-process", regex: /\b(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:[A-Za-z_$][\w$]*|`[^`]*\$\{)/gi, severity: "medium", title: "Process command may include variable input", fix: "Avoid shell interpolation; validate inputs and prefer argument arrays with shell execution disabled." },
  { id: "code.tls-disabled", regex: /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0)/gi, severity: "high", title: "TLS certificate verification disabled", fix: "Enable certificate verification and remove overrides that disable TLS checks." },
  { id: "code.open-cors", regex: /\bcors\s*\(\s*\{\s*origin\s*:\s*["']\*["']/gi, severity: "medium", title: "Wildcard CORS origin", fix: "Restrict cross-origin access to the specific origins that need it." },
  { id: "code.http-api-url", regex: /\bhttp:\/\/[^\s"'`]+(?:api|graphql|oauth|auth)[^\s"'`]*/gi, severity: "low", title: "Hard-coded non-TLS API URL", fix: "Use HTTPS for API endpoints and keep environment-specific hosts in configuration." },
  { id: "code.log-credential", regex: /\bconsole\.(?:log|debug|info)\s*\([^)\n]*(?:token|password|secret|api[_-]?key)[^)\n]*\)/gi, severity: "medium", title: "Possible credential logging", fix: "Remove credential logging and ensure sensitive values are redacted from application logs." },
  { id: "code.weak-password-hash", regex: /\b(?:md5|sha1)\s*\([^)\n]*(?:password|passwd|credential)[^)\n]*\)/gi, severity: "medium", title: "Weak hash used near password handling", fix: "Use a password-hashing algorithm designed for credentials, such as Argon2id, scrypt, or bcrypt." },
  { id: "code.math-random-token", regex: /\bMath\.random\s*\([^)]*\)[^;\n]*(?:token|nonce|secret)/gi, severity: "low", title: "Non-cryptographic randomness near token generation", fix: "Use a cryptographically secure random-number generator for security-sensitive tokens." }
];

const SEVERITY_WEIGHT = { critical: 25, high: 15, medium: 6, low: 2, info: 0 };
const HIGH_RISK_OLD_MAJORS = { react: 15, express: 4, lodash: 4, axios: 1, jquery: 3, moment: 2 };
const DEPRECATED_DEPENDENCIES = new Set(["request", "node-sass", "left-pad", "gulp-util", "babel-eslint", "core-js@1"]);

function fileName(path) {
  return String(path || "").split("/").pop() || "";
}

export function maskSecret(value) {
  const text = String(value ?? "");
  if (!text) return "";
  if (text.length <= 8) return "•".repeat(text.length);
  const visibleStart = Math.min(4, Math.floor(text.length / 3));
  const visibleEnd = Math.min(2, Math.floor(text.length / 4));
  return `${text.slice(0, visibleStart)}${"•".repeat(Math.max(4, text.length - visibleStart - visibleEnd))}${text.slice(-visibleEnd)}`;
}

export function shannonEntropy(value) {
  const text = String(value ?? "");
  if (!text.length) return 0;
  const counts = new Map();
  for (const character of text) counts.set(character, (counts.get(character) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / text.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

export function isPlaceholder(value) {
  const text = String(value ?? "").trim();
  return !text || SECRET_PLACEHOLDER.test(text) || /^(?:x{4,}|0{6,}|[*•_-]{4,})$/i.test(text);
}

export function flattenTree(tree, parentPath = "", files = []) {
  for (const node of tree || []) {
    const path = node.path || (parentPath ? `${parentPath}/${node.name}` : node.name || "");
    if (node.type === "folder") flattenTree(node.children, path, files);
    else if (node.type === "file") files.push({ ...node, path });
  }
  return files;
}

export function matchRiskyPath(path, file = {}) {
  return RISKY_FILE_RULES.filter((rule) => rule.matcher(path, file));
}

function normalizeContents(fileContents) {
  if (Array.isArray(fileContents)) {
    return new Map(fileContents.filter((file) => file && typeof file.path === "string" && typeof file.content === "string")
      .map((file) => [file.path, file.content]));
  }
  if (!fileContents || typeof fileContents !== "object") return new Map();
  return new Map(Object.entries(fileContents).flatMap(([path, value]) => {
    if (typeof value === "string") return [[path, value]];
    if (value && typeof value.content === "string") return [[path, value.content]];
    return [];
  }));
}

function collectSecretMatches(text) {
  const matches = [];
  for (const rule of SECRET_RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags.includes("g") ? rule.regex.flags : `${rule.regex.flags}g`);
    let match;
    while ((match = regex.exec(text))) {
      const value = match[1] || match[0];
      if (rule.id === "secret.generic-assignment" && (isPlaceholder(value) || (value.length < 20 && shannonEntropy(value) < 3.5))) continue;
      if (isPlaceholder(value)) continue;
      const offset = match[0].indexOf(value);
      matches.push({ rule, value, start: match.index + Math.max(0, offset), end: match.index + Math.max(0, offset) + value.length });
      if (match[0].length === 0) regex.lastIndex += 1;
    }
  }
  return matches.sort((left, right) => left.start - right.start || right.end - left.end);
}

function maskedLine(line) {
  const matches = collectSecretMatches(line);
  let result = line;
  for (const match of [...matches].sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, match.start)}${maskSecret(match.value)}${result.slice(match.end)}`;
  }
  return result.slice(0, 300);
}

export function sanitizeSensitiveContent(content) {
  let result = String(content ?? "");
  const matches = collectSecretMatches(result);
  for (const match of [...matches].sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, match.start)}${maskSecret(match.value)}${result.slice(match.end)}`;
  }
  return result;
}

function hashId(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function makeFinding({ ruleId, type, severity, title, description, path = "", line = null, snippet = "", howToFix, reference = "https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning" }) {
  const maskedSnippet = snippet ? maskedLine(snippet) : "";
  return {
    id: `security-${hashId(`${ruleId}|${path}|${line ?? ""}|${maskedSnippet}`)}`,
    type,
    severity,
    title,
    description,
    path,
    line,
    maskedSnippet,
    ruleId,
    howToFix,
    reference
  };
}

function normalizeDependencyVersion(version) {
  const match = String(version || "").match(/(\d+)(?:\.\d+)?/);
  return match ? Number(match[1]) : null;
}

function dependencyFindings(dependencies, metadata, findings) {
  const deps = Array.isArray(dependencies) ? dependencies : [];
  for (const dependency of deps) {
    const rawName = String(dependency.name || "");
    const rawVersion = String(dependency.version || "");
    const safeEntry = sanitizeSensitiveContent(`${rawName}="${rawVersion}"`);
    const separator = safeEntry.indexOf("=");
    const name = separator < 0 ? safeEntry : safeEntry.slice(0, separator);
    const version = separator < 0 ? "" : safeEntry.slice(separator + 2, -1);
    const normalizedName = name.toLowerCase();
    const baseName = normalizedName.split("/").pop();
    const rules = [
      { id: "dependency.unpinned", test: /^(?:\*|latest|x)$/i.test(version.trim()), severity: "medium", title: "Dependency version is not pinned", fix: "Use a deliberate version range and commit a lockfile for reproducible installs." },
      { id: "dependency.remote-url", test: /^(?:git\+|git:\/\/|https?:\/\/)/i.test(version.trim()), severity: "medium", title: "Dependency is sourced from a remote URL", fix: "Prefer a verified registry release or pin the source to a reviewed immutable commit." },
      { id: "dependency.deprecated", test: DEPRECATED_DEPENDENCIES.has(normalizedName) || DEPRECATED_DEPENDENCIES.has(`${baseName}@${normalizeDependencyVersion(version)}`), severity: "medium", title: "Known deprecated dependency", fix: "Replace this package with a maintained alternative after reviewing compatibility." }
    ];
    const maxMajor = HIGH_RISK_OLD_MAJORS[baseName];
    if (Number.isFinite(maxMajor) && normalizeDependencyVersion(version) !== null && normalizeDependencyVersion(version) < maxMajor) {
      rules.push({ id: "dependency.old-major", test: true, severity: "low", title: "Dependency appears pinned to an old major version", fix: "Review the package's supported versions and plan a compatible upgrade." });
    }
    for (const rule of rules) {
      if (!rule.test) continue;
      findings.push(makeFinding({
        ruleId: rule.id,
        type: "dependency",
        severity: rule.severity,
        title: rule.title,
        description: `Heuristic dependency check for ${name}${version ? ` (${version})` : ""}. Review the package's current status before acting.`,
        path: dependency.path || "package.json",
        line: null,
        snippet: `${name}${version ? `: ${version}` : ""}`,
        howToFix: rule.fix,
        reference: "https://docs.npmjs.com/cli/v10/configuring-npm/package-json"
      }));
    }
  }

  const contents = normalizeContents(metadata.fileContents);
  for (const [path, content] of contents) {
    if (!/package\.json$/i.test(path)) continue;
    let manifest;
    try { manifest = JSON.parse(content); } catch { continue; }
    const scripts = manifest.scripts || {};
    for (const name of ["preinstall", "install", "postinstall"]) {
      if (typeof scripts[name] !== "string") continue;
      findings.push(makeFinding({
        ruleId: "dependency.install-script",
        type: "dependency",
        severity: "medium",
        title: "Package install lifecycle script needs review",
        description: `The ${name} script runs during dependency installation. Review the command before running package-manager installs.`,
        path,
        line: null,
        snippet: `${name}: ${scripts[name]}`,
        howToFix: "Inspect the script and every command it invokes before installing dependencies.",
        reference: "https://docs.npmjs.com/cli/v10/using-npm/scripts"
      }));
    }
  }
}

function fileRuleFindings(files, findings) {
  const reportedPaths = new Set();
  for (const file of files) {
    const generatedDirectory = file.path.match(/^(.*?)(?:\/|^)(node_modules|dist|build)(?:\/|$)/i);
    for (const rule of matchRiskyPath(file.path, file)) {
      const path = rule.id === "risky-file.generated" && generatedDirectory
        ? `${generatedDirectory[1] ? `${generatedDirectory[1]}/` : ""}${generatedDirectory[2]}`
        : file.path;
      const key = `${rule.id}|${path}`;
      if (reportedPaths.has(key)) continue;
      reportedPaths.add(key);
      findings.push(makeFinding({
        ruleId: rule.id,
        type: "risky-file",
        severity: rule.severity,
        title: rule.title,
        description: `The repository tree contains ${path}.`,
        path,
        howToFix: rule.fix
      }));
    }
  }
}

function configFindings(files, contents, findings) {
  const paths = new Set(files.map((file) => file.path.toLowerCase()));
  const ignorePath = [...paths].find((path) => path === ".gitignore");
  if (!ignorePath) {
    findings.push(makeFinding({
      ruleId: "config.gitignore-missing",
      type: "config",
      severity: "low",
      title: "No root .gitignore found",
      description: "A root .gitignore was not found in the repository tree.",
      path: ".gitignore",
      howToFix: "Add ignore rules for local environment files, dependencies, build output, and generated artifacts."
    }));
  } else {
    const ignoreText = contents.get(ignorePath) || "";
    if (!/(?:^|\n)\s*(?:\/)?\.env(?:\*|\/|$)/im.test(ignoreText) || !/(?:^|\n)\s*(?:\/)?node_modules(?:\/|$)/im.test(ignoreText)) {
      findings.push(makeFinding({
        ruleId: "config.gitignore-coverage",
        type: "config",
        severity: "info",
        title: ".gitignore may not cover local secrets and dependencies",
        description: "The sampled root .gitignore does not clearly ignore both .env files and node_modules.",
        path: ".gitignore",
        snippet: ignoreText.split(/\r?\n/).filter(Boolean).slice(0, 2).join(" "),
        howToFix: "Add rules such as .env* (while allowing safe examples) and node_modules/; confirm the patterns match your workflow."
      }));
    }
  }

  const hasLockfile = [...paths].some((path) => /(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|pipfile\.lock|cargo\.lock|composer\.lock|gemfile\.lock)$/i.test(path));
  if (!hasLockfile && files.some((file) => /(?:package\.json|requirements\.txt|pyproject\.toml|cargo\.toml|go\.mod)$/i.test(file.path))) {
    findings.push(makeFinding({
      ruleId: "config.lockfile-missing",
      type: "config",
      severity: "info",
      title: "No dependency lockfile found",
      description: "No common dependency lockfile was found in the repository tree.",
      path: "package-lock.json",
      howToFix: "Generate and commit the lockfile used by your package manager to make dependency installs reproducible."
    }));
  }
}

function scanText(contents, findings) {
  for (const [path, content] of contents) {
    const lines = content.split(/\r?\n/);
    for (const match of collectSecretMatches(content)) {
      const line = content.slice(0, match.start).split(/\r?\n/).length;
      findings.push(makeFinding({
        ruleId: match.rule.id,
        type: "secret",
        severity: match.rule.severity,
        title: match.rule.title,
        description: "A pattern resembling a credential was found in sampled text. This heuristic does not verify whether it is active.",
        path,
        line,
        snippet: lines[line - 1] || "",
        howToFix: match.rule.fix,
        reference: "https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning"
      }));
    }
    lines.forEach((text, index) => {
      for (const rule of CODE_PATTERN_RULES) {
        const regex = new RegExp(rule.regex.source, rule.regex.flags.includes("g") ? rule.regex.flags : `${rule.regex.flags}g`);
        if (!regex.test(text)) continue;
        findings.push(makeFinding({
          ruleId: rule.id,
          type: "code-pattern",
          severity: rule.severity,
          title: rule.title,
          description: "A potentially risky code pattern was found in sampled text. Review its context; this heuristic may produce false positives.",
          path,
          line: index + 1,
          snippet: text,
          howToFix: rule.fix,
          reference: "https://owasp.org/www-project-top-ten/"
        }));
      }
    });
  }
}

export function getSecuritySummary(findings = []) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) {
    if (Object.prototype.hasOwnProperty.call(summary, finding.severity)) summary[finding.severity] += 1;
  }
  return summary;
}

export function scoreFromFindings(findings = []) {
  const byRule = new Map();
  for (const finding of findings) {
    const weight = SEVERITY_WEIGHT[finding.severity] ?? 0;
    if (!weight) continue;
    const count = byRule.get(finding.ruleId) || 0;
    if (count < 3) byRule.set(finding.ruleId, count + 1);
  }
  const penalty = [...byRule.entries()].reduce((total, [ruleId, count]) => {
    const finding = findings.find((item) => item.ruleId === ruleId);
    return total + count * (SEVERITY_WEIGHT[finding?.severity] || 0);
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function riskLevelFor(score) {
  if (score >= 90) return "low";
  if (score >= 70) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

export function scanSecurity({ tree = [], fileContents = {}, dependencies = [], metadata = {} } = {}) {
  const files = flattenTree(tree);
  const contents = normalizeContents(fileContents);
  const findings = [];
  fileRuleFindings(files, findings);
  configFindings(files, contents, findings);
  scanText(contents, findings);
  dependencyFindings(dependencies, { ...metadata, fileContents }, findings);

  const unique = new Map();
  for (const finding of findings) {
    const key = `${finding.ruleId}|${finding.path}|${finding.line ?? ""}|${finding.maskedSnippet}`;
    if (!unique.has(key)) unique.set(key, finding);
  }
  const orderedFindings = [...unique.values()];
  const riskScore = scoreFromFindings(orderedFindings);
  const scannedFiles = contents.size;
  return {
    riskScore,
    riskLevel: riskLevelFor(riskScore),
    summary: getSecuritySummary(orderedFindings),
    findings: orderedFindings,
    scannedFiles,
    skippedFiles: Math.max(0, files.length - scannedFiles),
    scannedAt: new Date().toISOString()
  };
}

export function prioritizeSecurityFiles(files, limit = 50) {
  const candidates = files.filter((file) =>
    file.type === "file" && (TEXT_FILE_EXTENSION.test(file.path) || /^\.env(?:\.(?:local|production|development|staging))?$/i.test(fileName(file.path)) || /^\.gitignore$/i.test(fileName(file.path))) && !BINARY_EXTENSION.test(file.path) &&
    (!Number.isFinite(Number(file.size)) || Number(file.size) <= 100 * 1024)
  );
  const priority = (path) => {
    const lower = path.toLowerCase();
    const name = fileName(lower);
    if (name === ".gitignore" || name === ".env" || /^\.env\.(?:local|production|development|staging)$/.test(name)) return 0;
    if (name === "package.json" || /(?:requirements\.txt|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|composer\.json)$/i.test(name)) return 1;
    if (lower.startsWith(".github/workflows/")) return 2;
    if (/(?:^|\/)(?:scripts|script)\//i.test(lower)) return 3;
    if (/(?:^|\/)src\//i.test(lower)) return 4;
    if (SOURCE_FILE_EXTENSION.test(lower)) return 5;
    return 6;
  };
  return candidates
    .sort((left, right) => priority(left.path) - priority(right.path) || left.path.localeCompare(right.path))
    .slice(0, Math.max(0, limit));
}

const SOURCE_FILE_EXTENSION = /\.(?:js|jsx|ts|tsx|vue|py|java|kt|kts|cs|go|rs|rb|php|c|h|cpp|hpp|swift|scala|sh)$/i;
