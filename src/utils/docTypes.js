const section = (id, label, enabled = true) => ({ id, label, enabled });

export const DOC_TYPES = [
  {
    id: "readme",
    label: "README.md",
    filename: "README.md",
    icon: "FileText",
    description: "Introduce the repository and help readers install and use it.",
    analysisData: ["metadata", "languages", "frameworks", "dependencies", "package scripts", "folder tree", "environment variable names"],
    supportsTone: true,
    supportsLanguage: true,
    sections: [
      section("badges", "Header and badges", false),
      section("description", "Description"),
      section("features", "Features"),
      section("techStack", "Tech stack"),
      section("folderStructure", "Folder structure"),
      section("installation", "Installation"),
      section("usage", "Usage"),
      section("environment", "Environment variables"),
      section("scripts", "Scripts"),
      section("apiOverview", "API overview", false),
      section("screenshots", "Screenshots placeholder", false),
      section("roadmap", "Roadmap", false),
      section("contributing", "Contributing"),
      section("license", "License"),
      section("author", "Author", false)
    ]
  },
  {
    id: "onboarding",
    label: "Onboarding guide",
    filename: "ONBOARDING.md",
    icon: "Rocket",
    description: "Give new contributors a practical first 30 minutes in the project.",
    analysisData: ["metadata", "languages", "frameworks", "dependencies", "package scripts", "folder tree"],
    supportsTone: true,
    supportsLanguage: true,
    sections: [
      section("overview", "Understand the project in 30 minutes"),
      section("setup", "Setup steps"),
      section("folders", "Key folders"),
      section("files", "Important files to read first"),
      section("dataFlow", "Data flow"),
      section("tasks", "Common tasks"),
      section("troubleshooting", "Troubleshooting"),
      section("glossary", "Glossary")
    ]
  },
  {
    id: "contributing",
    label: "CONTRIBUTING.md",
    filename: "CONTRIBUTING.md",
    icon: "GitPullRequest",
    description: "Explain how to propose, test, and review changes.",
    analysisData: ["metadata", "package scripts", "folder tree", "frameworks"],
    supportsTone: true,
    supportsLanguage: true,
    sections: [
      section("welcome", "Welcome"),
      section("setup", "Development setup"),
      section("workflow", "Contribution workflow"),
      section("style", "Code style"),
      section("tests", "Tests and checks"),
      section("pullRequests", "Pull requests"),
      section("issues", "Issues")
    ]
  },
  {
    id: "architecture",
    label: "ARCHITECTURE.md",
    filename: "ARCHITECTURE.md",
    icon: "Network",
    description: "Summarize repository structure and architectural boundaries.",
    analysisData: ["metadata", "languages", "frameworks", "dependencies", "folder tree", "architecture summary", "modules"],
    supportsTone: true,
    supportsLanguage: true,
    sections: [
      section("overview", "System overview"),
      section("components", "Components and boundaries"),
      section("structure", "Repository structure"),
      section("dataFlow", "Data flow"),
      section("dependencies", "Key dependencies"),
      section("decisions", "Design notes"),
      section("limitations", "Limitations and validation")
    ]
  },
  {
    id: "gitignore",
    label: ".gitignore",
    filename: ".gitignore",
    icon: "EyeOff",
    outputType: "text",
    description: "Create a local ignore file from common stack templates.",
    analysisData: ["languages", "frameworks", "dependencies"],
    supportsTone: false,
    supportsLanguage: false,
    sections: [
      section("node", "Node.js", false),
      section("react", "React / frontend build output", false),
      section("python", "Python", false),
      section("java", "Java", false),
      section("common", "Common editor and OS files")
    ]
  },
  {
    id: "api",
    label: "API docs",
    filename: "API.md",
    icon: "Plug",
    description: "Document API structure from repository metadata without inventing endpoints.",
    analysisData: ["metadata", "frameworks", "dependencies", "folder tree"],
    supportsTone: true,
    supportsLanguage: true,
    sections: [
      section("overview", "API overview"),
      section("routes", "Discovered route files"),
      section("authentication", "Authentication"),
      section("errors", "Errors and responses"),
      section("examples", "Request examples"),
      section("limitations", "Validation notes")
    ]
  },
  {
    id: "changelog",
    label: "Changelog",
    filename: "CHANGELOG.md",
    icon: "History",
    description: "Start a changelog with an honest repository snapshot and editable entries.",
    analysisData: ["metadata", "languages", "frameworks", "dependencies"],
    supportsTone: true,
    supportsLanguage: true,
    sections: [
      section("format", "Changelog format"),
      section("current", "Current repository snapshot"),
      section("next", "Unreleased"),
      section("guidance", "Maintainer guidance")
    ]
  },
  {
    id: "license",
    label: "LICENSE",
    filename: "LICENSE",
    icon: "Scale",
    outputType: "text",
    description: "Generate the complete selected license text locally for review.",
    analysisData: ["metadata", "license"],
    supportsTone: false,
    supportsLanguage: false,
    sections: []
  }
];

export const DOC_TYPE_BY_ID = Object.fromEntries(DOC_TYPES.map((type) => [type.id, type]));

export function getDocType(typeId) {
  return DOC_TYPE_BY_ID[typeId] || DOC_TYPE_BY_ID.readme;
}

export function getDefaultSections(typeId) {
  return Object.fromEntries(getDocType(typeId).sections.map(({ id, enabled }) => [id, enabled]));
}
