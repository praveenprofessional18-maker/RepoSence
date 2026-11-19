import { applyMockReactGraph } from "./graphData";

export const repositories = [
  {
    id: "octocat-hello-world", owner: "octocat", name: "hello-world", fullName: "octocat/hello-world",
    url: "https://github.com/octocat/hello-world", description: "My first repository on GitHub!", language: "Markdown",
    languages: { Markdown: 72, JavaScript: 18, HTML: 10 }, stars: 248, forks: 91, watchers: 248, issues: 3,
    license: "MIT", branch: "main", updatedAt: "2025-02-14T12:00:00Z", topics: ["getting-started", "docs"],
    frameworks: ["GitHub Pages"], dependencies: [{ name: "marked", version: "^12.0.0", type: "prod" }],
    files: { "README.md": "# Hello World\n\nThis is your first repository. Create a README to introduce your project.\n\n## Getting started\n\nClone the repository and make it your own.", "index.html": "<!doctype html>\n<html>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>", "src/app.js": "const greeting = (name = 'world') => `Hello, ${name}!`;\n\nconsole.log(greeting());", "package.json": "{\n  \"name\": \"hello-world\",\n  \"version\": \"1.0.0\",\n  \"scripts\": { \"start\": \"vite\" },\n  \"dependencies\": { \"marked\": \"^12.0.0\" }\n}" },
    tree: [{ name: "README.md", type: "file" }, { name: "index.html", type: "file" }, { name: "src", type: "folder", children: [{ name: "app.js", type: "file" }] }, { name: "package.json", type: "file" }],
    summary: "A welcoming starter repository with a small web page and a simple JavaScript greeting. It is intentionally lightweight and well suited to learning the GitHub workflow.",
    architecture: "A minimal static web project. The HTML entry point renders the page, while a small JavaScript module provides the greeting utility. There is no backend or build complexity.",
    modules: [{ title: "Greeting utility", body: "A small pure function that formats a friendly greeting and provides a default name." }, { title: "HTML entry point", body: "A semantic document shell that can be expanded into a static site." }],
    quality: 86, recommendations: [{ severity: "info", text: "Add a short contribution guide to help first-time contributors." }, { severity: "warning", text: "Consider adding a basic test for the greeting utility." }]
  },
  {
    id: "vercel-next.js", owner: "vercel", name: "next.js", fullName: "vercel/next.js",
    url: "https://github.com/vercel/next.js", description: "The React Framework for the Web", language: "TypeScript",
    languages: { TypeScript: 68, JavaScript: 20, CSS: 8, Rust: 4 }, stars: 129300, forks: 27800, watchers: 129300, issues: 2100,
    license: "MIT", branch: "canary", updatedAt: "2025-03-01T10:20:00Z", topics: ["react", "nextjs", "framework", "web"],
    frameworks: ["React", "Next.js", "Turbopack"], dependencies: [{ name: "react", version: "^19.0.0", type: "prod" }, { name: "react-dom", version: "^19.0.0", type: "prod" }, { name: "typescript", version: "^5.6.0", type: "dev" }, { name: "turbo", version: "^2.3.0", type: "dev" }],
    files: { "README.md": "# Next.js\n\nThe React Framework for the Web.\n\n## Getting Started\n\nStart building with Next.js today.", "packages/next/src/server/next.ts": "export class NextServer {\n  constructor(private options: ServerOptions) {}\n\n  async prepare() {\n    await this.loadComponents();\n  }\n}", "packages/next/package.json": "{\n  \"name\": \"next\",\n  \"version\": \"15.0.0\",\n  \"dependencies\": { \"react\": \"^19.0.0\", \"react-dom\": \"^19.0.0\" }\n}", "examples/hello-world/app/page.tsx": "export default function Page() {\n  return <main><h1>Hello, Next.js!</h1></main>;\n}" },
    tree: [{ name: "README.md", type: "file" }, { name: "packages", type: "folder", children: [{ name: "next", type: "folder", children: [{ name: "src", type: "folder", children: [{ name: "server", type: "folder", children: [{ name: "next.ts", type: "file" }] }, { name: "package.json", type: "file" }] }] }] }, { name: "examples", type: "folder", children: [{ name: "hello-world", type: "folder", children: [{ name: "app", type: "folder", children: [{ name: "page.tsx", type: "file" }] }] }] }],
    summary: "Next.js is a production React framework combining server rendering, routing, and build tooling. Its monorepo organizes framework packages alongside examples.",
    architecture: "A TypeScript monorepo. The core package contains server and rendering primitives, with examples demonstrating public application APIs. Build and development tooling is shared across packages.",
    modules: [{ title: "NextServer", body: "Coordinates server preparation, configuration, and the loading of runtime components." }, { title: "App Router", body: "A file-system based routing model with nested layouts and server component support." }, { title: "Examples", body: "Small projects that illustrate framework features and recommended patterns." }],
    quality: 92, recommendations: [{ severity: "info", text: "Keep API documentation aligned with changes across the monorepo." }, { severity: "warning", text: "The large package surface benefits from focused ownership boundaries." }]
  },
  {
    id: "facebook-react", owner: "facebook", name: "react", fullName: "facebook/react",
    url: "https://github.com/facebook/react", description: "The library for web and native user interfaces.", language: "JavaScript",
    languages: { JavaScript: 76, Flow: 16, TypeScript: 5, Other: 3 }, stars: 229000, forks: 46800, watchers: 229000, issues: 900,
    license: "MIT", branch: "main", updatedAt: "2025-02-27T15:10:00Z", topics: ["react", "ui", "javascript"],
    frameworks: ["React", "Jest", "Rollup"], dependencies: [{ name: "loose-envify", version: "^1.4.0", type: "prod" }, { name: "jest", version: "^29.7.0", type: "dev" }, { name: "rollup", version: "^4.0.0", type: "dev" }],
    files: { "README.md": "# React\n\nThe library for web and native user interfaces.\n\nReact lets you build user interfaces out of individual pieces called components.", "packages/react/src/ReactClient.js": "export function createElement(type, config, children) {\n  return ReactElement(type, config, children);\n}\n\nexport { createElement as jsx };", "packages/react/package.json": "{\n  \"name\": \"react\",\n  \"version\": \"19.0.0\",\n  \"dependencies\": { \"loose-envify\": \"^1.4.0\" }\n}", "packages/react-dom/client.js": "export function createRoot(container) {\n  return new ReactDOMRoot(container);\n}" },
    tree: [{ name: "README.md", type: "file" }, { name: "packages", type: "folder", children: [{ name: "react", type: "folder", children: [{ name: "src", type: "folder", children: [{ name: "ReactClient.js", type: "file" }] }, { name: "package.json", type: "file" }] }, { name: "react-dom", type: "folder", children: [{ name: "client.js", type: "file" }] }] }],
    summary: "React is a component-based library for building interfaces. The repository separates the core component model from platform renderers such as React DOM.",
    architecture: "A JavaScript monorepo. The core package defines element and component primitives; renderer packages adapt those primitives to browser and native environments. Shared tests and build tooling support the packages.",
    modules: [{ title: "React core", body: "Defines element creation, hooks, and the public component programming model." }, { title: "React DOM", body: "Connects React's reconciliation model to browser DOM nodes and events." }, { title: "Shared internals", body: "Coordinates runtime behavior between the core and renderer packages." }],
    quality: 94, recommendations: [{ severity: "info", text: "Continue documenting the public API separately from implementation details." }, { severity: "warning", text: "Keep package boundaries clear as renderer capabilities evolve." }]
  },
  {
    id: "expressjs-express", owner: "expressjs", name: "express", fullName: "expressjs/express",
    url: "https://github.com/expressjs/express", description: "Fast, unopinionated, minimalist web framework for Node.js", language: "JavaScript",
    languages: { JavaScript: 88, TypeScript: 5, HTML: 4, Other: 3 }, stars: 67000, forks: 16000, watchers: 67000, issues: 180,
    license: "MIT", branch: "master", updatedAt: "2025-02-24T08:30:00Z", topics: ["express", "nodejs", "web-framework"],
    frameworks: ["Node.js", "Express", "Mocha"], dependencies: [{ name: "cookie", version: "^0.7.0", type: "prod" }, { name: "debug", version: "^4.4.0", type: "prod" }, { name: "mocha", version: "^10.0.0", type: "dev" }],
    files: { "README.md": "# Express\n\nFast, unopinionated, minimalist web framework for Node.js.\n\n```js\nconst app = express();\n```", "lib/application.js": "var Router = require('./router');\n\napp.handle = function handle(req, res, callback) {\n  var router = this._router;\n  router.handle(req, res, callback);\n};", "package.json": "{\n  \"name\": \"express\",\n  \"version\": \"5.0.0\",\n  \"dependencies\": { \"cookie\": \"^0.7.0\", \"debug\": \"^4.4.0\" }\n}", "test/app.router.js": "describe('app router', function () {\n  it('handles a route', function (done) {\n    request(app).get('/').expect(200, done);\n  });\n});" },
    tree: [{ name: "README.md", type: "file" }, { name: "lib", type: "folder", children: [{ name: "application.js", type: "file" }] }, { name: "test", type: "folder", children: [{ name: "app.router.js", type: "file" }] }, { name: "package.json", type: "file" }],
    summary: "Express provides a compact HTTP application and routing layer for Node.js. Middleware and route handlers are composed to serve APIs and web applications.",
    architecture: "A lightweight Node.js package. The application object delegates incoming requests to a router, while middleware and route modules add behavior in a composable order.",
    modules: [{ title: "Application", body: "Owns app configuration and hands incoming requests to the configured router." }, { title: "Router", body: "Matches request methods and paths, then dispatches handlers and middleware." }, { title: "Middleware", body: "Composable request/response functions that can transform or end a request." }],
    quality: 89, recommendations: [{ severity: "info", text: "Document middleware ordering for common production scenarios." }, { severity: "critical", text: "Validate and sanitize untrusted input in application route handlers." }]
  }
];

const reactRepository = repositories.find((repo) => repo.id === "facebook-react");
if (reactRepository) applyMockReactGraph(reactRepository);

export const currentUser = { id: "user-1", name: "Alex Morgan", email: "alex@example.com", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=AM" };
export const getRepo = (id) => repositories.find((repo) => repo.id === id) || repositories[0];
