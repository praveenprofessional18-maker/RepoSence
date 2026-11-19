import { z } from "zod";

const text = (max = 24000) => z.string().max(max).optional().default("");
const safeString = (max = 300) => z.string().trim().max(max).optional().default("");

export const explainSchema = z.object({
  file: text(),
  repository: z.union([z.string().max(3000), z.record(z.string(), z.unknown())]).optional().default(""),
  prompt: text(30000),
  action: z.enum(["explain", "refactor", "bugs", "comments", "tests"]).optional(),
  filePath: safeString(1000),
  fileLanguage: safeString(80),
  repoContext: z.union([z.string().max(3000), z.record(z.string(), z.unknown())]).optional()
});

export const codeQualitySchema = z.object({
  repository: z.union([z.string().max(3000), z.record(z.string(), z.unknown())]).optional(),
  prompt: text(30000),
  action: z.enum(["refactor", "bugs", "comments", "tests"]).optional(),
  file: text(),
  filePath: safeString(1000),
  fileLanguage: safeString(80),
  level: z.enum(["Beginner", "Intermediate", "Expert"]).optional(),
  language: safeString(40)
});

export const documentSchema = z.object({
  analysisId: safeString(100),
  type: z.enum(["readme", "onboarding", "contributing", "architecture", "api", "changelog", "gitignore", "license"]).default("readme"),
  sections: z.record(z.string(), z.unknown()).optional().default({}),
  tone: safeString(80),
  language: safeString(80),
  baseDraft: text(30000),
  repository: z.record(z.string(), z.unknown()).optional(),
  prompt: text(30000)
});

export const summarySchema = z.object({
  analysisId: safeString(100),
  repository: z.union([z.string().max(3000), z.record(z.string(), z.unknown())]).optional(),
  improvement: z.record(z.string(), z.unknown()).optional(),
  prompt: text(30000),
  summary: text(12000)
});

export const chatSchema = z.object({
  analysisId: safeString(100),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(12000)
  })).min(1).max(30),
  contextFiles: z.array(z.union([z.string().max(500), z.object({
    path: z.string().max(500),
    content: z.string().max(12000).optional()
  })])).max(20).optional().default([])
});

export const compareSchema = z.object({
  repos: z.array(z.object({
    fullName: safeString(200),
    language: safeString(80)
  })).max(2).optional().default([]),
  metrics: z.array(z.record(z.string(), z.unknown())).max(100).optional().default([]),
  categoryWinners: z.array(z.record(z.string(), z.unknown())).max(30).optional().default([]),
  overallWinner: z.record(z.string(), z.unknown()).optional().default({}),
  prompt: text(30000)
});
