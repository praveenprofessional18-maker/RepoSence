import { Router } from "express";
import { analyze, file, languages, metadata, tree } from "../controllers/githubController.js";
import { optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { analyzeSchema, fileQuerySchema, repoParamsSchema, treeQuerySchema } from "../validators/githubSchemas.js";

const router = Router();
router.use(optionalAuth);

router.post("/analyze", validate(analyzeSchema), asyncHandler(analyze));
router.get("/metadata/:owner/:repo", validate(repoParamsSchema, "params"), asyncHandler(metadata));
router.get("/languages/:owner/:repo", validate(repoParamsSchema, "params"), asyncHandler(languages));
router.get("/tree/:owner/:repo", validate(repoParamsSchema, "params"), validate(treeQuerySchema, "query"), asyncHandler(tree));
router.get("/:owner/:repo/languages", validate(repoParamsSchema, "params"), asyncHandler(languages));
router.get("/:owner/:repo/tree", validate(repoParamsSchema, "params"), validate(treeQuerySchema, "query"), asyncHandler(tree));
router.get("/:owner/:repo", validate(repoParamsSchema, "params"), asyncHandler(metadata));
router.get("/file", validate(fileQuerySchema, "query"), asyncHandler(file));

export default router;
