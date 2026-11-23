import { Router } from "express";
import { chat, codeQuality, compare, document, explain, fix, readme, summary } from "../controllers/aiController.js";
import { auth, optionalAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chatSchema, codeQualitySchema, compareSchema, documentSchema, explainSchema, summarySchema } from "../validators/aiSchemas.js";

const router = Router();
router.use(aiLimiter);

router.post("/explain", optionalAuth, validate(explainSchema), asyncHandler(explain));
router.post("/code-quality", optionalAuth, validate(codeQualitySchema), asyncHandler(codeQuality));
router.post("/readme", optionalAuth, validate(documentSchema), asyncHandler(readme));
router.post("/document", optionalAuth, validate(documentSchema), asyncHandler(document));
router.post("/summary", optionalAuth, validate(summarySchema), asyncHandler(summary));
router.post("/compare", optionalAuth, validate(compareSchema), asyncHandler(compare));
router.post("/compare-summary", optionalAuth, validate(compareSchema), asyncHandler(compare));
router.post("/chat", auth, validate(chatSchema), asyncHandler(chat));
router.post("/fix", optionalAuth, validate(summarySchema), asyncHandler(fix));

export default router;
