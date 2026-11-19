import api, { mockDelay, useMocks } from "./api";
import { AI_ACTIONS, buildPrompt, detectTestFramework, prepareFileContext } from "../utils/aiActions";
import { sanitizeSensitiveContent } from "../utils/securityScanner";

const AI_REQUEST_LIMIT = 10;
const AI_REQUEST_WINDOW_MS = 60 * 1000;
const aiRequestTimes = [];

function abortError() {
  const error = new Error("AI generation was stopped.");
  error.name = "AbortError";
  return error;
}

function waitForFileActionChunk(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    const cancel = () => {
      clearTimeout(timeout);
      reject(abortError());
    };
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

function enforceAiRequestLimit() {
  const now = Date.now();
  while (aiRequestTimes.length && now - aiRequestTimes[0] >= AI_REQUEST_WINDOW_MS) aiRequestTimes.shift();
  if (aiRequestTimes.length >= AI_REQUEST_LIMIT) {
    const retryAfterMs = Math.max(1000, AI_REQUEST_WINDOW_MS - (now - aiRequestTimes[0]));
    const error = new Error(`AI action limit reached. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`);
    error.code = "AI_RATE_LIMIT";
    error.retryAfterMs = retryAfterMs;
    throw error;
  }
  aiRequestTimes.push(now);
}

function fileActionMockOutput({ action, filePath, fileLanguage, content, framework, language }) {
  const name = String(filePath || "this file").split("/").pop();
  const tamil = language === "Tamil";
  const hindi = language === "Hindi";
  if (action.id === "explain") {
    if (tamil) return `## \`${name}\` கோப்பு என்ன செய்கிறது\n\nஇந்த **${fileLanguage || "text"}** கோப்பு களஞ்சியத்தின் மூலக் குறியீட்டின் ஒரு பகுதியாகும். இதன் துல்லியமான பங்கை உறுதிப்படுத்த, ஏற்றுமதிகள் மற்றும் இதை அழைக்கும் இடங்களைப் பாருங்கள். இந்த விளக்கம் ஆலோசனை மட்டுமே; களஞ்சியக் குறியீடு இயக்கப்படவில்லை.\n\n## இதை ஆராய்வது எப்படி\n\n- ஏற்றுமதி செய்யப்பட்ட மதிப்புகளையும் அவை ஏற்கும் உள்ளீடுகளையும் கண்டறியவும்.\n- அருகிலுள்ள தொகுதிகளுக்கான அழைப்புகளைப் பின்தொடரவும்.\n- எதிர்பார்க்கப்படும் நடத்தை மற்றும் எல்லை நிலைகளைச் சோதனைகளில் சரிபார்க்கவும்.`;
    if (hindi) return `## \`${name}\` फ़ाइल क्या करती है\n\nयह **${fileLanguage || "text"}** फ़ाइल repository के source का हिस्सा है। इसकी सटीक भूमिका की पुष्टि करने के लिए exports और इसे call करने वाली जगहें देखें। यह सलाह है; repository code चलाया नहीं गया है।\n\n## इसे कैसे देखें\n\n- Export किए गए values और उनके inputs पहचानें।\n- पास के modules तक जाने वाली calls देखें।\n- अपेक्षित व्यवहार और edge cases को tests में जाँचें।`;
    return `## What \`${name}\` does\n\nThis **${fileLanguage || "text"}** file is part of the repository's source. Read it from its exports and call sites to confirm its exact runtime role; this response is advisory and the repository code was not executed.\n\n## How to explore it\n\n- Identify the exported values and the inputs they accept.\n- Follow calls to nearby modules to understand dependencies.\n- Check the repository's tests for expected behavior and edge cases.`;
  }
  if (action.id === "refactor") {
    if (tamil) return `## \`${name}\` கோப்பிற்கான மறுசீரமைப்பு யோசனைகள்\n\n1. ஒவ்வொரு ஏற்றுமதிக்கும் தெளிவான பொறுப்பை வைத்திருங்கள்.\n2. உள்ளீடுகளைச் சரிபார்த்து, பக்க விளைவுகளை வெளிப்படையாகக் கையாளுங்கள்.\n3. மீண்டும் மீண்டும் வரும் தர்க்கத்தைப் பகிரப்பட்ட நடத்தை தெளிவாக இருக்கும் போது மட்டும் பிரிக்கவும்.\n4. நடத்தை மாற்றுவதற்கு முன் குறுகிய சோதனைகளைச் சேர்க்கவும்.\n\nஇவை ஆலோசனைகள் மட்டுமே; மாற்றுவதற்கு முன் முழு திட்ட மரபுகளுடன் ஒப்பிடுங்கள்.`;
    if (hindi) return `## \`${name}\` के लिए refactoring सुझाव\n\n1. हर export की जिम्मेदारी स्पष्ट रखें।\n2. Inputs validate करें और side effects को स्पष्ट रूप से संभालें।\n3. दोहराए गए logic को तभी निकालें जब साझा व्यवहार स्पष्ट हो।\n4. व्यवहार बदलने से पहले focused tests जोड़ें।\n\nये सलाहें हैं; बदलाव लागू करने से पहले पूरे project conventions से मिलान करें।`;
    return `## Refactoring ideas for \`${name}\`\n\n1. Keep each exported responsibility focused and give side effects explicit boundaries.\n2. Prefer descriptive names and guard invalid inputs near the public entry point.\n3. Extract repeated logic only when the shared behavior is clear.\n4. Add focused tests before changing behavior.\n\nThese are general review prompts. Compare them with the complete repository context before applying any change.`;
  }
  if (action.id === "bugs") {
    if (tamil) return `## \`${name}\` கோப்பில் சாத்தியமான பிழைகள்\n\n- பொது எல்லைகளில் காலியான, விடுபட்ட, தவறான உள்ளீடுகளைச் சரிபார்க்கவும்.\n- ஒத்திசையற்ற பணிகளில் cancellation, பழைய முடிவுகள், நிராகரிக்கப்பட்ட promises ஆகியவற்றைப் பாருங்கள்.\n- ஒரே செயல் மீண்டும் நடந்தால் தரவு மாற்றங்கள் பாதுகாப்பானவையா எனச் சரிபார்க்கவும்.\n- எல்லை மதிப்புகள் மற்றும் பிழை நிலைகளுக்கு சோதனைகள் உள்ளனவா உறுதிப்படுத்தவும்.\n\nஇந்த mock பதில் பிழையை உறுதிப்படுத்தாது; மூலக் குறியீட்டையும் சோதனைகளையும் மதிப்பாய்வு செய்யவும்.`;
    if (hindi) return `## \`${name}\` में संभावित bugs\n\n- Public boundaries पर खाली, अनुपस्थित और malformed inputs जाँचें।\n- Async काम में cancellation, पुराने results और rejected promises देखें।\n- एक ही operation दोबारा चलने पर data mutations सुरक्षित हैं या नहीं जाँचें।\n- Boundary values और error paths के लिए tests देखें।\n\nयह mock किसी bug की पुष्टि नहीं करता; source और tests की समीक्षा करें।`;
    return `## Potential bug review for \`${name}\`\n\n- Check empty, missing, and malformed inputs at every public boundary.\n- Review asynchronous work for cancellation, stale results, and rejected promises.\n- Verify state or data mutations are safe when the same operation runs more than once.\n- Confirm boundary values and error paths are covered by tests.\n\nNo issue is confirmed from a heuristic mock response; inspect the source and tests to validate any concern.`;
  }
  if (action.id === "comments") {
    const prefix = /python|shell|bash|yaml|toml/i.test(fileLanguage) ? "#"
      : /html|xml|markdown/i.test(fileLanguage) ? "<!--"
        : "/*";
    const suffix = prefix === "<!--" ? " -->" : prefix === "/*" ? " */" : "";
    const comment = tamil ? `${name} கோப்பின் நோக்கத்தை செயலாக்கத்துடன் சரிபார்க்கவும்.`
      : hindi ? `${name} फ़ाइल के उद्देश्य को implementation के साथ सत्यापित करें।`
        : `Advisory comments for ${name}; verify the intent against the implementation.`;
    const note = `${prefix} ${comment}${suffix}`;
    return `${note}\n${content}`;
  }
  if (action.id === "tests") {
    if (framework === "pytest") {
      return `def test_${name.replace(/\W+/g, "_").replace(/^_+/, "") || "module"}_behavior():\n    # Replace this assertion with checks for the module's public behavior.\n    assert True\n`;
    }
    if (framework === "Mocha") {
      return `const assert = require("node:assert/strict");\n\ndescribe("${name}", function () {\n  it("documents an expected behavior", function () {\n    assert.ok(true); // Replace with an assertion against the module's public API.\n  });\n});\n`;
    }
    return `import { describe, expect, it } from "${framework === "Jest" ? "@jest/globals" : "vitest"}";\n\ndescribe("${name}", () => {\n  it("documents an expected behavior", () => {\n    expect(true).toBe(true); // Replace with an assertion against the module's public API.\n  });\n});\n`;
  }
  return content;
}

async function streamMockFileAction(output, signal, onChunk) {
  const chunkSize = 700;
  for (let offset = 0; offset < output.length; offset += chunkSize) {
    if (signal?.aborted) throw abortError();
    onChunk?.(output.slice(offset, offset + chunkSize));
    await waitForFileActionChunk(22, signal);
  }
  if (signal?.aborted) throw abortError();
}

async function callFileActionBackend({ analysisId, action, prompt, level, language, filePath, fileLanguage, repoContext, signal }) {
  // Backend integration seam for Gemini; keep provider credentials and calls server-side.
  const endpoint = action.id === "explain" ? "/api/ai/explain" : "/api/ai/code-quality";
  return (await api.post(endpoint, {
    analysisId,
    action: action.id,
    prompt,
    level,
    language,
    filePath,
    fileLanguage,
    repoContext
  }, { signal })).data;
}

function waitForChatMock(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, 850);
    const cancel = () => {
      window.clearTimeout(timeout);
      reject(abortError());
    };
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

function makeMockChatAnswer({ analysisId, messages, contextFiles }) {
  const prompt = messages.at(-1)?.content?.toLowerCase() || "";
  const files = Array.isArray(contextFiles) ? contextFiles : [];
  const paths = files.map((file) => typeof file === "string" ? file : file.path).filter(Boolean);
  const topLevel = [...new Set(paths.map((path) => path.split("/")[0]))].slice(0, 8);
  const findFile = (pattern) => files.find((file) => {
    const path = typeof file === "string" ? file : file.path;
    return path && pattern.test(path);
  });
  const pathOf = (file) => typeof file === "string" ? file : file?.path;
  const citations = [];

  if (/auth|login|sign.?in|session|credential/.test(prompt)) {
    const authFile = findFile(/auth|login|session|credential|middleware/i);
    if (authFile) {
      citations.push({ path: pathOf(authFile) });
      return {
        answer: `I found a file that may be relevant to authentication: \`${pathOf(authFile)}\`. Open the source to confirm how authentication is implemented; this mock assistant only uses the files available in the saved analysis.`,
        citations
      };
    }
    return {
      answer: "I couldn't identify a clearly named authentication module in the saved file tree. Authentication may be handled under a different name or may not be present in this repository. Try searching the Structure tab for related terms.",
      citations: []
    };
  }

  if (/folder|structure|organis|organis|layout|directory/.test(prompt)) {
    const readme = findFile(/(^|\/)readme\.md$/i);
    if (readme) citations.push({ path: pathOf(readme) });
    const entries = topLevel.length ? topLevel.map((name) => `- \`${name}\``).join("\n") : "- No files are available in the saved tree.";
    return {
      answer: `The saved analysis for \`${analysisId}\` shows these top-level files and folders:\n\n${entries}\n\nExpand a folder in Structure to inspect its contents. This overview comes from the repository tree, not executed repository code.`,
      citations
    };
  }

  if (/run|start|install|develop|launch|command/.test(prompt)) {
    const manifest = findFile(/(^|\/)(package\.json|requirements\.txt|pom\.xml|makefile)$/i);
    const readme = findFile(/(^|\/)readme\.md$/i);
    if (manifest) citations.push({ path: pathOf(manifest) });
    if (readme) citations.push({ path: pathOf(readme) });
    let scripts = "";
    if (manifest && typeof manifest === "object" && typeof manifest.content === "string" && /package\.json$/i.test(manifest.path)) {
      try {
        const parsed = JSON.parse(manifest.content);
        const names = Object.keys(parsed.scripts || {});
        if (names.length) scripts = `\n\nScripts listed in \`${manifest.path}\`: ${names.map((name) => `\`${name}\``).join(", ")}.`;
      } catch {
        scripts = "";
      }
    }
    return {
      answer: `Check the repository's \`README.md\` and package or build manifest for its authoritative setup instructions. For a Node.js project, a common starting point is \`npm install\`, followed by the documented start or dev script.${scripts}\n\nReview commands before running them; RepoSense does not execute repository code.`,
      citations
    };
  }

  const source = paths[0];
  if (source) citations.push({ path: source });
  return {
    answer: `I can help explore \`${analysisId}\` using its saved file tree and available file context. The analysis currently includes ${paths.length} file paths${topLevel.length ? ` across entries such as ${topLevel.map((name) => `\`${name}\``).join(", ")}` : ""}. Ask about a specific module, setup instructions, or folder to narrow the answer.`,
    citations
  };
}

function getMockDocumentEnhancement(type, language) {
  const snippets = {
    readme: {
      English: "## Maintainer review\n\nConfirm installation and environment instructions against the current repository before publishing.",
      Tamil: "## வெளியிடுவதற்கு முன்\n\nநிறுவல் மற்றும் சூழல் வழிமுறைகளை தற்போதைய களஞ்சியத்துடன் சரிபார்க்கவும்.",
      Hindi: "## प्रकाशित करने से पहले\n\nस्थापना और environment निर्देशों को वर्तमान repository से सत्यापित करें।"
    },
    onboarding: {
      English: "## First 30-minute path\n\n1. Read the overview and package manifest.\n2. Trace one entry point into its main module.\n3. Run only documented checks after reviewing their scripts.",
      Tamil: "## முதல் 30 நிமிடப் பாதை\n\n1. திட்ட அறிமுகத்தையும் package manifest-ஐயும் படிக்கவும்.\n2. ஒரு entry point-இலிருந்து முக்கிய module வரை தொடரவும்.\n3. Scripts-ஐ மதிப்பாய்வு செய்த பிறகே ஆவணப்படுத்தப்பட்ட checks-ஐ இயக்கவும்.",
      Hindi: "## पहले 30 मिनट का रास्ता\n\n1. परिचय और package manifest पढ़ें।\n2. एक entry point से मुख्य module तक जाएँ।\n3. Scripts की समीक्षा के बाद ही documented checks चलाएँ।"
    },
    contributing: {
      English: "## Review checklist\n\n- Keep the change focused.\n- Include relevant tests and documentation.\n- State what you verified and redact sensitive values.",
      Tamil: "## மதிப்பாய்வு பட்டியல்\n\n- மாற்றத்தை குறுகியதாக வைத்திருங்கள்.\n- தொடர்புடைய சோதனைகள் மற்றும் ஆவணங்களைச் சேர்க்கவும்.\n- சரிபார்த்தவற்றைக் குறிப்பிடவும்; ரகசிய மதிப்புகளை மறைக்கவும்.",
      Hindi: "## समीक्षा सूची\n\n- बदलाव को केंद्रित रखें।\n- संबंधित tests और documentation शामिल करें।\n- सत्यापन का विवरण दें और संवेदनशील मान हटाएँ।"
    },
    architecture: {
      English: "## Validation notes\n\nThis overview is derived from saved metadata and the summarized tree. Confirm module responsibilities and runtime flows in the source.",
      Tamil: "## சரிபார்ப்பு குறிப்புகள்\n\nஇந்த கண்ணோட்டம் சேமிக்கப்பட்ட metadata மற்றும் சுருக்கப்பட்ட tree-ஐ அடிப்படையாகக் கொண்டது. Source-இல் module பொறுப்புகளையும் runtime flow-களையும் உறுதிப்படுத்தவும்.",
      Hindi: "## सत्यापन नोट्स\n\nयह overview saved metadata और summarized tree पर आधारित है। Source में module की जिम्मेदारियों और runtime flow की पुष्टि करें।"
    },
    api: {
      English: "## Contract verification\n\nAdd endpoint methods, request schemas, authentication, and response examples only after verifying the current route implementation.",
      Tamil: "## ஒப்பந்த சரிபார்ப்பு\n\nதற்போதைய route implementation-ஐ உறுதிப்படுத்திய பிறகே endpoint methods, request schemas மற்றும் responses சேர்க்கவும்.",
      Hindi: "## API contract की जाँच\n\nवर्तमान route implementation सत्यापित करने के बाद ही endpoint methods, request schemas और responses जोड़ें।"
    },
    changelog: {
      English: "## Release note reminder\n\nRecord user-visible changes from reviewed commits; this draft does not infer commit history.",
      Tamil: "## வெளியீட்டு குறிப்பு\n\nமதிப்பாய்வு செய்யப்பட்ட commits-இலிருந்து பயனர் காணும் மாற்றங்களைப் பதிவு செய்யவும்; இந்த draft commit history-ஐ ஊகிக்காது.",
      Hindi: "## Release note reminder\n\nसमीक्षित commits से उपयोगकर्ता को दिखने वाले बदलाव दर्ज करें; यह draft commit history का अनुमान नहीं लगाता।"
    }
  };
  return snippets[type]?.[language] || snippets[type]?.English || "";
}

function documentMockOutput({ type, baseDraft, language = "English" }) {
  const safeDraft = sanitizeSensitiveContent(String(baseDraft || "").slice(0, 24000)).trim();
  if (type === "gitignore" || type === "license") return safeDraft;
  const enhancement = getMockDocumentEnhancement(type, language);
  if (!enhancement || safeDraft.includes(enhancement)) return safeDraft;
  return [safeDraft, enhancement].filter(Boolean).join("\n\n");
}

async function streamMockDocument(output, { signal, onChunk } = {}) {
  const tokens = output.match(/\S+\s*/g) || [];
  let streamed = "";
  for (let index = 0; index < tokens.length; index += 24) {
    if (signal?.aborted) throw abortError();
    const chunk = tokens.slice(index, index + 24).join("");
    await waitForFileActionChunk(18, signal);
    streamed += chunk;
    onChunk?.(streamed);
  }
  return output;
}

function documentLanguageCode(language) {
  return ({ English: "en", Tamil: "ta", Hindi: "hi" })[language] || "en";
}

export const aiService = {
  async runFileAction({ analysisId, action: actionId, level, language, filePath, fileLanguage, content, repoContext, signal, onChunk }) {
    const action = AI_ACTIONS.find((item) => item.id === (typeof actionId === "string" ? actionId : actionId?.id));
    if (!action) throw new Error("Choose a supported AI action.");
    if (signal?.aborted) throw abortError();
    enforceAiRequestLimit();

    const prepared = prepareFileContext(content);
    const framework = action.id === "tests" ? detectTestFramework(repoContext?.dependencies, fileLanguage) : "";
    const safeContext = {
      fullName: sanitizeSensitiveContent(String(repoContext?.fullName || "")),
      language: sanitizeSensitiveContent(String(repoContext?.language || "")),
      frameworks: Array.isArray(repoContext?.frameworks) ? repoContext.frameworks.slice(0, 12).map((value) => sanitizeSensitiveContent(String(value))) : [],
      testingFramework: framework
    };
    const prompt = buildPrompt({ action, level, language, filePath, fileLanguage, content, repoContext: safeContext });
    if (!useMocks) {
      const response = await callFileActionBackend({
        analysisId,
        action,
        prompt,
        level,
        language,
        filePath: sanitizeSensitiveContent(String(filePath || "")),
        fileLanguage: sanitizeSensitiveContent(String(fileLanguage || "text")),
        repoContext: safeContext,
        signal
      });
      if (signal?.aborted) throw abortError();
      const rawOutput = response?.output ?? response?.code ?? response?.markdown ?? response?.explanation ?? response?.answer;
      if (typeof rawOutput !== "string") throw new Error("The AI service returned an invalid file-action response.");
      const output = sanitizeSensitiveContent(rawOutput);
      onChunk?.(output);
      return {
        output,
        outputType: action.outputType,
        framework,
        cached: false
      };
    }

    const output = sanitizeSensitiveContent(fileActionMockOutput({
      action,
      filePath,
      fileLanguage,
      content: prepared.text,
      framework,
      language
    }));
    await streamMockFileAction(output, signal, onChunk);
    return { output, outputType: action.outputType, framework, cached: false };
  },
  async chatWithRepo({ analysisId, messages, contextFiles = [], signal }) {
    const payload = { analysisId, messages, contextFiles };
    if (!useMocks) return (await api.post("/api/ai/chat", payload, { signal })).data;
    const response = makeMockChatAnswer(payload);
    await waitForChatMock(signal);
    return response;
  },
  async explain({ file, repository }) {
    if (!useMocks) return (await api.post("/api/ai/explain", { file, repository })).data;
    return mockDelay({ explanation: `${file} is part of ${repository}. This module follows the project's existing conventions and keeps its responsibilities focused. Consider adding focused tests around its public behavior.` }, 700);
  },
  async explainSecurity({ maskedSnippet, rule }) {
    const payload = {
      maskedSnippet: String(maskedSnippet || ""),
      rule: {
        id: String(rule?.id || ""),
        title: String(rule?.title || ""),
        severity: String(rule?.severity || ""),
        howToFix: String(rule?.howToFix || "")
      }
    };
    if (!useMocks) return (await api.post("/api/ai/explain", {
      file: payload.maskedSnippet,
      repository: `security rule ${payload.rule.id}: ${payload.rule.title} (${payload.rule.severity}). ${payload.rule.howToFix}`
    })).data;
    return mockDelay({
      explanation: `The ${payload.rule.title || "security"} heuristic matched this masked sample: ${payload.maskedSnippet || "(no code snippet)"}\n\nReview the surrounding code and validate the finding without sharing or restoring any unmasked credential. ${payload.rule.howToFix || ""}`
    }, 700);
  },
  async getComparisonAiSummary(comparison) {
    const payload = {
      repos: (comparison.repos || []).map((repo) => ({
        fullName: String(repo.fullName || ""),
        language: String(repo.language || "")
      })),
      metrics: (comparison.metrics || []).map((metric) => ({
        id: String(metric.id || ""),
        label: String(metric.label || ""),
        category: String(metric.category || ""),
        unit: String(metric.unit || ""),
        a: metric.a ?? null,
        b: metric.b ?? null,
        winner: String(metric.winner || "n/a")
      })),
      categoryWinners: (comparison.categoryWinners || []).map((item) => ({
        category: String(item.category || ""),
        winner: String(item.winner || "tie"),
        reason: String(item.reason || "")
      })),
      overallWinner: comparison.overallWinner || { winner: "tie", scoreA: 0, scoreB: 0, reason: "" }
    };
    if (!useMocks) return (await api.post("/api/ai/compare-summary", payload)).data;
    const [repoA, repoB] = payload.repos;
    const winnerName = payload.overallWinner.winner === "tie"
      ? "Neither repository is a universal winner"
      : payload.overallWinner.winner === "a" ? repoA?.fullName : repoB?.fullName;
    const winsA = payload.categoryWinners.filter((item) => item.winner === "a").map((item) => item.category);
    const winsB = payload.categoryWinners.filter((item) => item.winner === "b").map((item) => item.category);
    return mockDelay({
      summary: `## Overview\n\n${winnerName} based on the available comparison categories. The result is a directional summary, not a quality guarantee.\n\n## Strengths of ${repoA?.fullName || "Repo A"}\n\n${winsA.length ? `- Leads in ${winsA.join(", ")}.` : "- No clear category lead in this comparison."}\n- Primary language: ${repoA?.language || "not available"}.\n\n## Strengths of ${repoB?.fullName || "Repo B"}\n\n${winsB.length ? `- Leads in ${winsB.join(", ")}.` : "- No clear category lead in this comparison."}\n- Primary language: ${repoB?.language || "not available"}.\n\n## Key differences\n\n${payload.categoryWinners.map((item) => `- **${item.category}:** ${item.reason}`).join("\n")}\n\n## Which should you use when?\n\nChoose the repository whose language, activity, and available quality/security signals best fit your project constraints. Prefer a focused review of the individual code and maintenance needs over popularity or aggregate scores alone.`
    }, 850);
  },
  async codeQuality(repository) {
    if (!useMocks) return (await api.post("/api/ai/code-quality", { repository })).data;
    return mockDelay({ score: repository.quality, recommendations: repository.recommendations }, 700);
  },
  async generateFix({ repository, improvement }) {
    if (!useMocks) return (await api.post("/api/ai/fix", { repository, improvement })).data;
    return mockDelay({
      answer: `Suggested next steps for ${improvement.title} in ${repository.fullName}:\n\n${improvement.description}\n\nReview the repository conventions, make the smallest focused change, and add or update tests where appropriate. This is advisory guidance only; it does not modify files or execute repository code.`
    }, 850);
  },
  async readme(payload) {
    if (!useMocks) return (await api.post("/api/ai/readme", payload)).data;
    const repo = payload.repository;
    const sections = payload.sections || {};
    const output = [
      `# ${repo.name}\n\n> ${repo.description}`,
      sections.badges ? "![Build](https://img.shields.io/badge/build-passing-brightgreen)" : "",
      `## Overview\n\n${repo.summary}`,
      sections.stack ? `## Tech stack\n\n${repo.frameworks.map((item) => `- ${item}`).join("\n")}` : "",
      sections.installation ? "## Getting started\n\n1. Clone this repository.\n2. Install dependencies with `npm install`.\n3. Run the project using the documented start command." : "",
      sections.usage ? "## Usage\n\nSee the examples and project documentation to get started." : "",
      sections.contributing ? "## Contributing\n\nIssues and pull requests are welcome. Please run the tests before submitting changes." : "",
      sections.license ? `## License\n\n${repo.license}` : ""
    ].filter(Boolean).join("\n\n");
    return mockDelay(output, 800);
  },
  async generateDocument({
    analysisId,
    type = "readme",
    sections = {},
    tone = "Professional",
    language = "English",
    baseDraft = "",
    signal,
    onChunk
  }) {
    if (signal?.aborted) throw abortError();
    const safeDraft = sanitizeSensitiveContent(String(baseDraft || "").slice(0, 24000));
    if (!useMocks) {
      // Backend integration seam: Gemini credentials and generation stay server-side.
      const endpoint = type === "readme" ? "/api/ai/readme" : "/api/ai/document";
      const response = await api.post(endpoint, {
        analysisId,
        type,
        sections,
        tone,
        language: documentLanguageCode(language),
        baseDraft: safeDraft
      }, { signal });
      const result = response.data;
      const markdown = typeof result === "string" ? result : result?.markdown || result?.content;
      if (typeof markdown !== "string") throw new Error("The documentation service returned an invalid response.");
      return sanitizeSensitiveContent(markdown);
    }

    const output = documentMockOutput({ type, baseDraft: safeDraft, language });
    return streamMockDocument(output, { signal, onChunk });
  }
};
