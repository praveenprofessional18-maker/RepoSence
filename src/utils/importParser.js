const SOURCE_EXTENSION = /\.(?:js|jsx|ts|tsx|vue)$/i;
const RESOLUTION_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json"];
const INDEX_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function getExtension(path) {
  const name = path.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

function getFolder(path) {
  const separator = path.lastIndexOf("/");
  return separator < 0 ? "" : path.slice(0, separator);
}

function normalizeRelativePath(importer, specifier) {
  const parts = [...getFolder(importer).split("/").filter(Boolean)];
  for (const part of specifier.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

function getImportSpecifiers(contents) {
  const patterns = [
    /\bimport\s+(?:[\s\S]*?\s+from\s*)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  ];
  const specifiers = new Set();
  for (const pattern of patterns) {
    for (const match of contents.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function packageName(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function createCandidates(basePath) {
  return [
    basePath,
    ...RESOLUTION_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...INDEX_EXTENSIONS.map((extension) => `${basePath}/index${extension}`)
  ];
}

function resolveRelativeImport(importer, specifier, knownFiles) {
  const normalizedPath = normalizeRelativePath(importer, specifier);
  if (!normalizedPath) return null;
  for (const candidate of createCandidates(normalizedPath)) {
    if (knownFiles.has(candidate)) return candidate;
  }
  return null;
}

function asFileRecord(file) {
  if (typeof file === "string") return { path: file, size: 0 };
  return file && typeof file.path === "string" ? file : null;
}

export function parseImportGraph(sourceFiles, repositoryFiles = []) {
  const knownFiles = new Map();
  for (const item of repositoryFiles) {
    const file = asFileRecord(item);
    if (file) knownFiles.set(file.path, file);
  }

  const sources = [];
  for (const item of sourceFiles || []) {
    if (!item || typeof item.path !== "string" || typeof item.content !== "string") continue;
    sources.push(item);
    if (!knownFiles.has(item.path)) {
      knownFiles.set(item.path, { path: item.path, size: item.size || new TextEncoder().encode(item.content).length });
    }
  }

  const nodes = new Map();
  const edges = new Map();
  const externalPackages = new Map();
  const ensureNode = (path) => {
    if (nodes.has(path)) return;
    const file = knownFiles.get(path);
    nodes.set(path, {
      id: path,
      path,
      type: getExtension(path).replace(/^\./, "") || "file",
      folder: getFolder(path),
      size: Number(file?.size) || 0,
      importsCount: 0,
      importedByCount: 0
    });
  };

  for (const source of sources) {
    ensureNode(source.path);
    for (const specifier of getImportSpecifiers(source.content)) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const target = resolveRelativeImport(source.path, specifier, knownFiles);
        if (!target || target === source.path) continue;
        const id = `${source.path}->${target}`;
        if (!edges.has(id)) {
          edges.set(id, { id, source: source.path, target });
          ensureNode(target);
        }
      } else {
        const name = packageName(specifier);
        if (!name) continue;
        if (!externalPackages.has(name)) externalPackages.set(name, { name, usedBy: [] });
        const usedBy = externalPackages.get(name).usedBy;
        if (!usedBy.includes(source.path)) usedBy.push(source.path);
      }
    }
  }

  for (const edge of edges.values()) {
    nodes.get(edge.source).importsCount += 1;
    nodes.get(edge.target).importedByCount += 1;
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    externalPackages: [...externalPackages.values()]
  };
}

export { SOURCE_EXTENSION };
