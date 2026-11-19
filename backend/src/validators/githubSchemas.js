import { z } from "zod";

const slug = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/).refine((value) => value !== "." && value !== "..");

export const repoParamsSchema = z.object({ owner: slug, repo: slug });
export const treeQuerySchema = z.object({
  branch: z.string().trim().min(1).max(200).optional()
});
export const fileQuerySchema = z.object({
  owner: slug,
  repo: slug,
  path: z.string().min(1).max(1000).refine((value) =>
    !value.split("/").some((part) => part === "." || part === "..")
  )
});
export const analyzeSchema = z.object({
  url: z.string().trim().url().max(500),
  branch: z.string().trim().min(1).max(200).optional()
}).refine(({ url }) => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return ["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase()) &&
      parts.length === 2 && parts.every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && part !== "." && part !== "..");
  } catch {
    return false;
  }
}, { message: "Use a public GitHub URL in the format https://github.com/owner/repository.", path: ["url"] });
