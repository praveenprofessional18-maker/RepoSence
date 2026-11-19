import { analyzeHealth } from "../utils/healthAnalyzer";

export function createMockHealthReport(repository, fileContents) {
  const contents = fileContents || repository.files || {};
  return {
    ...analyzeHealth({
      metadata: repository,
      tree: repository.tree || [],
      languages: repository.languages || {},
      dependencies: repository.dependencies || [],
      fileContents: contents
    }),
    scannedAt: new Date().toISOString()
  };
}
