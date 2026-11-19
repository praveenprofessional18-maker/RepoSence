import { flattenTree, getSecuritySummary, scoreFromFindings } from "../utils/securityScanner";

const findings = [
  {
    id: "mock-security-secret",
    type: "secret",
    severity: "critical",
    title: "Possible exposed cloud credential",
    description: "A credential-shaped value appears in a committed environment file. This is sample data for the mock report.",
    path: ".env",
    line: 2,
    maskedSnippet: "SERVICE_TOKEN=abcd••••••••••••••••••••xy",
    ruleId: "secret.generic-assignment",
    howToFix: "Rotate the credential, remove the value from the repository, and keep it in a secret manager.",
    reference: "https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning"
  },
  {
    id: "mock-security-key",
    type: "risky-file",
    severity: "high",
    title: "Private key or certificate file committed",
    description: "The repository tree contains deploy/private.pem.",
    path: "deploy/private.pem",
    line: null,
    maskedSnippet: "",
    ruleId: "risky-file.private-material",
    howToFix: "Remove the private material, revoke or replace it, and keep it outside version control.",
    reference: "https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning"
  },
  {
    id: "mock-security-dep",
    type: "dependency",
    severity: "medium",
    title: "Dependency version is not pinned",
    description: "Heuristic dependency check for sample-package (*). Review the package's current status before acting.",
    path: "package.json",
    line: null,
    maskedSnippet: "sample-package: *",
    ruleId: "dependency.unpinned",
    howToFix: "Use a deliberate version range and commit a lockfile for reproducible installs.",
    reference: "https://docs.npmjs.com/cli/v10/configuring-npm/package-json"
  },
  {
    id: "mock-security-config",
    type: "config",
    severity: "low",
    title: "No root .gitignore found",
    description: "A root .gitignore was not found in the repository tree.",
    path: ".gitignore",
    line: null,
    maskedSnippet: "",
    ruleId: "config.gitignore-missing",
    howToFix: "Add ignore rules for local environment files, dependencies, build output, and generated artifacts.",
    reference: "https://git-scm.com/docs/gitignore"
  },
  {
    id: "mock-security-pattern",
    type: "code-pattern",
    severity: "info",
    title: "document.write usage",
    description: "A potentially risky code pattern was found in sampled text. Review its context; this heuristic may produce false positives.",
    path: "src/legacy.js",
    line: 12,
    maskedSnippet: "document.write(message);",
    ruleId: "code.document-write",
    howToFix: "Use DOM APIs or a UI framework instead of document.write.",
    reference: "https://owasp.org/www-project-top-ten/"
  }
];

export function createMockSecurityReport(repository) {
  const fileCount = flattenTree(repository.tree || []).length;
  const riskScore = scoreFromFindings(findings);
  return {
    riskScore,
    riskLevel: riskScore >= 90 ? "low" : riskScore >= 70 ? "medium" : riskScore >= 40 ? "high" : "critical",
    summary: getSecuritySummary(findings),
    findings: findings.map((finding) => ({ ...finding })),
    scannedFiles: Math.min(18, fileCount || 18),
    skippedFiles: Math.max(0, fileCount - 18),
    scannedAt: new Date().toISOString(),
    falsePositives: []
  };
}
