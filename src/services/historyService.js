import { mockDelay, useMocks } from "./api";
import { mockHistory } from "../mock/store";
import { sanitizeSensitiveContent } from "../utils/securityScanner";
import { buildComparison } from "../utils/compareEngine";

const HISTORY_KEY = "reposense_analysis_history";
const MOCK_HEALTH_KEY = "reposense_mock_health_reports";
const MOCK_SECURITY_KEY = "reposense_mock_security_reports";
const MOCK_AI_ACTIONS_KEY = "reposense_mock_ai_action_cache";
const MOCK_DOCUMENTS_KEY = "reposense_mock_document_studio";
const COMPARISONS_KEY = "reposense_saved_comparisons";
let comparisonSequence = 0;

function readSavedComparisons() {
  if (typeof localStorage === "undefined") return [];
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(COMPARISONS_KEY) || "[]");
  } catch {
    throw new Error("Saved comparisons could not be read. Clear the RepoSense comparison history in this browser and retry.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Saved comparisons have an invalid format. Clear the RepoSense comparison history in this browser and retry.");
  }
  return parsed;
}

function writeSavedComparisons(comparisons) {
  if (typeof localStorage === "undefined") throw new Error("Browser storage is unavailable; this comparison could not be saved.");
  try {
    localStorage.setItem(COMPARISONS_KEY, JSON.stringify(comparisons));
  } catch (error) {
    throw new Error(`Could not save this comparison in browser storage. ${error.message}`);
  }
}

function sanitizeStoredValue(value) {
  if (typeof value === "string") return sanitizeSensitiveContent(value);
  if (Array.isArray(value)) return value.map(sanitizeStoredValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeStoredValue(item)]));
}

function sanitizeSavedAnalysis(repository) {
  const sanitized = sanitizeStoredValue(repository);
  const maskedPaths = Object.entries(repository?.files || {})
    .filter(([, content]) => typeof content === "string" && sanitizeSensitiveContent(content) !== content)
    .map(([path]) => path);
  return maskedPaths.length
    ? { ...sanitized, securitySanitizedPaths: [...new Set([...(sanitized.securitySanitizedPaths || []), ...maskedPaths])] }
    : sanitized;
}

function readMockHealthReports() {
  if (typeof localStorage === "undefined") return {};
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(MOCK_HEALTH_KEY) || "{}");
  } catch {
    throw new Error("Saved health reports could not be read. Clear the RepoSense health report cache in this browser and retry.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved health reports have an invalid format. Clear the RepoSense health report cache in this browser and retry.");
  }
  const safeReports = sanitizeStoredValue(parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(safeReports)) {
    try {
      localStorage.setItem(MOCK_HEALTH_KEY, JSON.stringify(safeReports));
    } catch (error) {
      throw new Error(`Saved health reports were sanitized but could not be updated in browser storage. ${error.message}`);
    }
  }
  return safeReports;
}

function saveMockHealthReport(repository) {
  if (!repository.healthReport || typeof localStorage === "undefined") return;
  const reports = readMockHealthReports();
  reports[repository.id] = repository.healthReport;
  try {
    localStorage.setItem(MOCK_HEALTH_KEY, JSON.stringify(reports));
  } catch (error) {
    throw new Error(`Could not save this health report in browser storage. ${error.message}`);
  }
}

function restoreMockHealthReport(repository, savedReports = readMockHealthReports()) {
  if (!repository) return repository;
  const report = repository.healthReport || savedReports[repository.id];
  return sanitizeSavedAnalysis(report ? { ...repository, healthReport: report } : repository);
}

function readMockSecurityReports() {
  if (typeof localStorage === "undefined") return {};
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(MOCK_SECURITY_KEY) || "{}");
  } catch {
    throw new Error("Saved security reports could not be read. Clear the RepoSense security report cache in this browser and retry.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved security reports have an invalid format. Clear the RepoSense security report cache in this browser and retry.");
  }
  const safeReports = sanitizeStoredValue(parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(safeReports)) {
    try {
      localStorage.setItem(MOCK_SECURITY_KEY, JSON.stringify(safeReports));
    } catch (error) {
      throw new Error(`Saved security reports were sanitized but could not be updated in browser storage. ${error.message}`);
    }
  }
  return safeReports;
}

function saveMockSecurityReport(repository) {
  if (!repository.securityReport || typeof localStorage === "undefined") return;
  const reports = readMockSecurityReports();
  reports[repository.id] = repository.securityReport;
  try {
    localStorage.setItem(MOCK_SECURITY_KEY, JSON.stringify(reports));
  } catch (error) {
    throw new Error(`Could not save this masked security report in browser storage. ${error.message}`);
  }
}

function restoreMockSecurityReport(repository, savedReports = readMockSecurityReports()) {
  if (!repository) return repository;
  const report = repository.securityReport || savedReports[repository.id];
  return sanitizeSavedAnalysis(report ? { ...repository, securityReport: report } : repository);
}

function readLocalHistory() {
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    throw new Error("Saved analysis history could not be read. Clear the RepoSense history data in this browser and retry.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Saved analysis history has an invalid format. Clear the RepoSense history data in this browser and retry.");
  }
  const safeItems = parsed.map(sanitizeSavedAnalysis);
  if (JSON.stringify(parsed) !== JSON.stringify(safeItems)) writeLocalHistory(safeItems);
  return safeItems;
}

function writeLocalHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.map(sanitizeSavedAnalysis)));
  } catch (error) {
    throw new Error(`Could not save this analysis in browser storage. ${error.message}`);
  }
}

function findMockHistory(id) {
  return mockHistory.find((item) => item.id === id);
}

function readMockAiActionCaches() {
  if (typeof localStorage === "undefined") return {};
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(MOCK_AI_ACTIONS_KEY) || "{}");
  } catch {
    throw new Error("Saved AI action history could not be read. Clear the RepoSense AI action cache in this browser and retry.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved AI action history has an invalid format. Clear the RepoSense AI action cache in this browser and retry.");
  }
  const safeCaches = sanitizeStoredValue(parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(safeCaches)) writeMockAiActionCaches(safeCaches);
  return safeCaches;
}

function writeMockAiActionCaches(caches) {
  if (typeof localStorage === "undefined") throw new Error("Browser storage is unavailable; this AI result could not be saved.");
  try {
    localStorage.setItem(MOCK_AI_ACTIONS_KEY, JSON.stringify(sanitizeStoredValue(caches)));
  } catch (error) {
    throw new Error(`Could not save AI action history in browser storage. ${error.message}`);
  }
}

function readMockDocumentData() {
  if (typeof localStorage === "undefined") return {};
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(MOCK_DOCUMENTS_KEY) || "{}");
  } catch {
    throw new Error("Saved document history could not be read. Clear the RepoSense document studio data in this browser and retry.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved document history has an invalid format. Clear the RepoSense document studio data in this browser and retry.");
  }
  const safeData = sanitizeStoredValue(parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(safeData)) writeMockDocumentData(safeData);
  return safeData;
}

function writeMockDocumentData(data) {
  if (typeof localStorage === "undefined") throw new Error("Browser storage is unavailable; this document could not be saved.");
  try {
    localStorage.setItem(MOCK_DOCUMENTS_KEY, JSON.stringify(sanitizeStoredValue(data)));
  } catch (error) {
    throw new Error(`Could not save document studio data in browser storage. ${error.message}`);
  }
}

function normalizeGeneratedDocuments(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry.type === "string" && typeof entry.cacheKey === "string" && typeof entry.output === "string")
    .map((entry) => sanitizeStoredValue(entry))
    .slice(0, 80);
}

function normalizeDocumentVersions(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry.id === "string" && typeof entry.type === "string" && typeof entry.content === "string")
    .map((entry) => sanitizeStoredValue(entry))
    .slice(0, 50);
}

function restoreMockDocuments(repository, savedData = readMockDocumentData()) {
  if (!repository) return repository;
  const saved = savedData[repository.id] || {};
  return sanitizeSavedAnalysis({
    ...repository,
    generatedDocuments: repository.generatedDocuments?.length
      ? repository.generatedDocuments
      : saved.generatedDocuments || [],
    documentVersions: repository.documentVersions?.length
      ? repository.documentVersions
      : saved.documentVersions || []
  });
}

function updateDocumentRecords(analysisId, updater) {
  if (useMocks) {
    const repository = findMockHistory(analysisId);
    if (!repository) throw new Error("Analysis not found.");
    const savedData = readMockDocumentData();
    const saved = savedData[analysisId] || {};
    const current = {
      generatedDocuments: normalizeGeneratedDocuments(repository.generatedDocuments?.length
        ? repository.generatedDocuments
        : saved.generatedDocuments),
      documentVersions: normalizeDocumentVersions(repository.documentVersions?.length
        ? repository.documentVersions
        : saved.documentVersions)
    };
    const next = updater(current);
    savedData[analysisId] = next;
    writeMockDocumentData(savedData);
    repository.generatedDocuments = next.generatedDocuments;
    repository.documentVersions = next.documentVersions;
    return next;
  }

  const items = readLocalHistory();
  const index = items.findIndex((entry) => entry.id === analysisId);
  if (index < 0) throw new Error("Analysis not found.");
  const current = {
    generatedDocuments: normalizeGeneratedDocuments(items[index].generatedDocuments),
    documentVersions: normalizeDocumentVersions(items[index].documentVersions)
  };
  const next = updater(current);
  items[index] = { ...items[index], ...next };
  writeLocalHistory(items);
  return next;
}

function restoreMockAiActionCache(repository, savedCaches = readMockAiActionCaches()) {
  if (!repository) return repository;
  const aiActionCache = repository.aiActionCache || savedCaches[repository.id] || [];
  return sanitizeSavedAnalysis({ ...repository, aiActionCache });
}

function normalizeAiCacheEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry.key === "string" && typeof entry.output === "string")
    .map((entry) => sanitizeStoredValue(entry))
    .slice(0, 30);
}

export const historyService = {
  async getComparison(idA, idB) {
    if (!idA || !idB) throw new Error("Select two saved repository analyses to compare.");
    if (idA === idB) throw new Error("Choose two different repositories to compare.");
    const [analysisA, analysisB] = await Promise.all([this.get(idA), this.get(idB)]);
    return { analysisA, analysisB, comparison: buildComparison(analysisA, analysisB) };
  },
  async listComparisons() {
    return mockDelay(readSavedComparisons());
  },
  async saveComparison({ idA, idB, title } = {}) {
    const { analysisA, analysisB } = await this.getComparison(idA, idB);
    const comparisons = readSavedComparisons();
    const existing = comparisons.find((item) => item.idA === idA && item.idB === idB);
    const record = {
      id: existing?.id || `comparison-${Date.now().toString(36)}-${(++comparisonSequence).toString(36)}`,
      idA,
      idB,
      title: String(title || `${analysisA.fullName} vs ${analysisB.fullName}`),
      repoA: analysisA.fullName,
      repoB: analysisB.fullName,
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    const next = existing
      ? comparisons.map((item) => item.id === existing.id ? record : item)
      : [record, ...comparisons];
    writeSavedComparisons(next);
    return record;
  },
  async removeComparison(id) {
    writeSavedComparisons(readSavedComparisons().filter((item) => item.id !== id));
    return { success: true };
  },
  async list() {
    if (useMocks) {
      const savedReports = readMockHealthReports();
      const savedSecurityReports = readMockSecurityReports();
      const savedAiActionCaches = readMockAiActionCaches();
      const savedDocuments = readMockDocumentData();
      return mockDelay(mockHistory.map((item) => restoreMockDocuments(restoreMockAiActionCache(restoreMockSecurityReport(restoreMockHealthReport(item, savedReports), savedSecurityReports), savedAiActionCaches), savedDocuments)));
    }
    return mockDelay(readLocalHistory());
  },
  async get(id) {
    const item = useMocks
      ? findMockHistory(id)
      : readLocalHistory().find((entry) => entry.id === id);
    if (!item) throw new Error("Analysis not found.");
    return mockDelay(useMocks
      ? restoreMockDocuments(restoreMockAiActionCache(restoreMockSecurityReport(restoreMockHealthReport(item))))
      : item);
  },
  async getGeneratedDocuments(analysisId) {
    if (!analysisId) throw new Error("An analysis ID is required to load generated documents.");
    if (useMocks) {
      const repository = findMockHistory(analysisId);
      if (!repository) throw new Error("Analysis not found.");
      const saved = readMockDocumentData()[analysisId] || {};
      return normalizeGeneratedDocuments(repository.generatedDocuments?.length
        ? repository.generatedDocuments
        : saved.generatedDocuments);
    }
    const repository = readLocalHistory().find((entry) => entry.id === analysisId);
    if (!repository) throw new Error("Analysis not found.");
    return normalizeGeneratedDocuments(repository.generatedDocuments);
  },
  async saveGeneratedDocument(analysisId, document) {
    if (!analysisId || !document?.type || !document?.cacheKey || typeof document.output !== "string") {
      throw new Error("The generated document is incomplete and could not be saved.");
    }
    const safeDocument = sanitizeStoredValue({
      ...document,
      updatedAt: new Date().toISOString()
    });
    const state = updateDocumentRecords(analysisId, (current) => {
      const sameType = current.generatedDocuments.filter((entry) => entry.type === safeDocument.type);
      const otherTypes = current.generatedDocuments.filter((entry) => entry.type !== safeDocument.type);
      const nextForType = [
        safeDocument,
        ...sameType.filter((entry) => entry.cacheKey !== safeDocument.cacheKey)
      ].slice(0, 10);
      return {
        ...current,
        generatedDocuments: [...nextForType, ...otherTypes].slice(0, 80)
      };
    });
    return state.generatedDocuments;
  },
  async getDocumentVersions(analysisId) {
    if (!analysisId) throw new Error("An analysis ID is required to load document versions.");
    if (useMocks) {
      const repository = findMockHistory(analysisId);
      if (!repository) throw new Error("Analysis not found.");
      const saved = readMockDocumentData()[analysisId] || {};
      return normalizeDocumentVersions(repository.documentVersions?.length
        ? repository.documentVersions
        : saved.documentVersions);
    }
    const repository = readLocalHistory().find((entry) => entry.id === analysisId);
    if (!repository) throw new Error("Analysis not found.");
    return normalizeDocumentVersions(repository.documentVersions);
  },
  async saveDocumentVersion(analysisId, version) {
    if (!analysisId || !version?.type || typeof version.content !== "string") {
      throw new Error("The document version is incomplete and could not be saved.");
    }
    const safeVersion = sanitizeStoredValue({
      ...version,
      id: version.id || `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      label: String(version.label || "Saved version").slice(0, 80),
      createdAt: version.createdAt || new Date().toISOString()
    });
    const state = updateDocumentRecords(analysisId, (current) => ({
      ...current,
      documentVersions: [safeVersion, ...current.documentVersions.filter((entry) => entry.id !== safeVersion.id)].slice(0, 50)
    }));
    return state.documentVersions;
  },
  async renameDocumentVersion(analysisId, versionId, label) {
    const nextLabel = String(label || "").trim().slice(0, 80);
    if (!nextLabel) throw new Error("Enter a name for this version.");
    return updateDocumentRecords(analysisId, (current) => ({
      ...current,
      documentVersions: current.documentVersions.map((entry) => entry.id === versionId
        ? { ...entry, label: nextLabel }
        : entry)
    })).documentVersions;
  },
  async removeDocumentVersion(analysisId, versionId) {
    return updateDocumentRecords(analysisId, (current) => ({
      ...current,
      documentVersions: current.documentVersions.filter((entry) => entry.id !== versionId)
    })).documentVersions;
  },
  async countGeneratedDocuments() {
    const repositories = await this.list();
    return repositories.reduce((count, repository) => count + normalizeGeneratedDocuments(repository.generatedDocuments).length, 0);
  },
  async getAiActionCache(analysisId) {
    if (!analysisId) throw new Error("An analysis ID is required to load AI action history.");
    if (useMocks) {
      const repository = findMockHistory(analysisId);
      if (!repository) throw new Error("Analysis not found.");
      const caches = readMockAiActionCaches();
      return normalizeAiCacheEntries(repository.aiActionCache || caches[analysisId] || []);
    }
    const repository = readLocalHistory().find((entry) => entry.id === analysisId);
    if (!repository) throw new Error("Analysis not found.");
    return normalizeAiCacheEntries(repository.aiActionCache);
  },
  async saveAiActionResult(analysisId, result) {
    if (!analysisId || !result?.key || typeof result.output !== "string") {
      throw new Error("The AI result is incomplete and could not be saved.");
    }
    const existing = await this.getAiActionCache(analysisId);
    const safeResult = sanitizeStoredValue({ ...result, updatedAt: new Date().toISOString() });
    const next = [safeResult, ...existing.filter((entry) => entry.key !== safeResult.key)].slice(0, 30);
    if (useMocks) {
      const caches = readMockAiActionCaches();
      caches[analysisId] = next;
      writeMockAiActionCaches(caches);
      const repository = findMockHistory(analysisId);
      if (repository) repository.aiActionCache = next;
      return next;
    }
    const items = readLocalHistory();
    const index = items.findIndex((entry) => entry.id === analysisId);
    if (index < 0) throw new Error("Analysis not found.");
    items[index] = { ...items[index], aiActionCache: next };
    writeLocalHistory(items);
    return next;
  },
  async removeAiActionResult(analysisId, cacheKey) {
    const next = (await this.getAiActionCache(analysisId)).filter((entry) => entry.key !== cacheKey);
    if (useMocks) {
      const caches = readMockAiActionCaches();
      caches[analysisId] = next;
      writeMockAiActionCaches(caches);
      const repository = findMockHistory(analysisId);
      if (repository) repository.aiActionCache = next;
      return next;
    }
    const items = readLocalHistory();
    const index = items.findIndex((entry) => entry.id === analysisId);
    if (index < 0) throw new Error("Analysis not found.");
    items[index] = { ...items[index], aiActionCache: next };
    writeLocalHistory(items);
    return next;
  },
  async clearAiActionCache(analysisId) {
    if (useMocks) {
      const caches = readMockAiActionCaches();
      caches[analysisId] = [];
      writeMockAiActionCaches(caches);
      const repository = findMockHistory(analysisId);
      if (repository) repository.aiActionCache = [];
      return [];
    }
    const items = readLocalHistory();
    const index = items.findIndex((entry) => entry.id === analysisId);
    if (index < 0) throw new Error("Analysis not found.");
    items[index] = { ...items[index], aiActionCache: [] };
    writeLocalHistory(items);
    return [];
  },
  async countAiActions() {
    const repositories = await this.list();
    return repositories.reduce((count, repository) => count + normalizeAiCacheEntries(repository.aiActionCache).length, 0);
  },
  async save(repository) {
    const existingRecord = useMocks
      ? findMockHistory(repository.id)
      : readLocalHistory().find((item) => item.id === repository.id);
    const existingCache = existingRecord?.aiActionCache || (useMocks ? readMockAiActionCaches()[repository.id] : []) || [];
    const savedDocuments = useMocks ? readMockDocumentData()[repository.id] || {} : {};
    const record = sanitizeSavedAnalysis({
      ...repository,
      aiActionCache: repository.aiActionCache || existingCache,
      generatedDocuments: repository.generatedDocuments || existingRecord?.generatedDocuments || savedDocuments.generatedDocuments || [],
      documentVersions: repository.documentVersions || existingRecord?.documentVersions || savedDocuments.documentVersions || [],
      analyzedAt: repository.analyzedAt || new Date().toISOString(),
      status: "Completed"
    });
    if (useMocks) {
      const index = mockHistory.findIndex((item) => item.id === record.id);
      if (index >= 0) mockHistory[index] = record;
      else mockHistory.unshift(record);
      saveMockHealthReport(record);
      saveMockSecurityReport(record);
      return mockDelay(record, 0);
    }

    const items = readLocalHistory();
    const index = items.findIndex((item) => item.id === record.id);
    if (index >= 0) items[index] = record;
    else items.unshift(record);
    writeLocalHistory(items);
    return record;
  },
  async remove(id) {
    if (useMocks) {
      await mockDelay(true, 250);
      const index = mockHistory.findIndex((item) => item.id === id);
      if (index >= 0) mockHistory.splice(index, 1);
      const reports = readMockHealthReports();
      if (reports[id]) {
        delete reports[id];
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(MOCK_HEALTH_KEY, JSON.stringify(reports));
          } catch (error) {
            throw new Error(`Analysis was removed, but its saved health report could not be cleared. ${error.message}`);
          }
        }
      }
      const securityReports = readMockSecurityReports();
      if (securityReports[id]) {
        delete securityReports[id];
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(MOCK_SECURITY_KEY, JSON.stringify(securityReports));
          } catch (error) {
            throw new Error(`Analysis was removed, but its saved security report could not be cleared. ${error.message}`);
          }
        }
      }
      const aiActionCaches = readMockAiActionCaches();
      if (aiActionCaches[id]) {
        delete aiActionCaches[id];
        writeMockAiActionCaches(aiActionCaches);
      }
      const documents = readMockDocumentData();
      if (documents[id]) {
        delete documents[id];
        writeMockDocumentData(documents);
      }
      return { success: true };
    }

    const items = readLocalHistory();
    writeLocalHistory(items.filter((item) => item.id !== id));
    return { success: true };
  }
};
