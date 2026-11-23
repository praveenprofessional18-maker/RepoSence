import { Router } from "express";
import { analyze, file, languages, metadata, tree } from "../controllers/githubController.js";
import { auth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { analyzeSchema, fileQuerySchema, repoParamsSchema, treeQuerySchema } from "../validators/githubSchemas.js";

const router = Router();

router.post("/analyze", auth, validate(analyzeSchema), asyncHandler(analyze));
router.get("/metadata/:owner/:repo", optionalAuth, validate(repoParamsSchema, "params"), asyncHandler(metadata));
router.get("/languages/:owner/:repo", optionalAuth, validate(repoParamsSchema, "params"), asyncHandler(languages));
router.get("/tree/:owner/:repo", optionalAuth, validate(repoParamsSchema, "params"), validate(treeQuerySchema, "query"), asyncHandler(tree));
router.get("/:owner/:repo/languages", optionalAuth, validate(repoParamsSchema, "params"), asyncHandler(languages));
router.get("/:owner/:repo/tree", optionalAuth, validate(repoParamsSchema, "params"), validate(treeQuerySchema, "query"), asyncHandler(tree));
router.get("/:owner/:repo", optionalAuth, validate(repoParamsSchema, "params"), asyncHandler(metadata));
router.get("/file", optionalAuth, validate(fileQuerySchema, "query"), asyncHandler(file));

export default router;
