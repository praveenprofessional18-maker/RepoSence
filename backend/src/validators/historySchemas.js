import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "A valid record ID is required.");

export const historyIdSchema = z.object({ id: objectId });
export const historyQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  sort: z.enum(["newest", "oldest", "name", "stars"]).optional().default("newest"),
  bookmarked: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});
export const bookmarkSchema = z.object({ bookmarked: z.boolean() });
export const historyDataSchema = z.object({
  data: z.record(z.string(), z.unknown())
});
