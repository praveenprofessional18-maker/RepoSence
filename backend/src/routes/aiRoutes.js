import { Router } from "express";
import { chat, codeQuality, compare, document, explain, fix, readme, summary } from "../controllers/aiController.js";
import { optionalAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chatSchema, codeQualitySchema, compareSchema, documentSchema, explainSchema, summarySchema } from "../validators/aiSchemas.js";

const router = Router();
router.use(aiLimiter, optionalAuth);

router.post("/explain", validate(explainSchema), asyncHandler(explain));
router.post("/code-quality", validate(codeQualitySchema), asyncHandler(codeQuality));
router.post("/readme", validate(documentSchema), asyncHandler(readme));
router.post("/document", validate(documentSchema), asyncHandler(document));
router.post("/summary", validate(summarySchema), asyncHandler(summary));
router.post("/compare", validate(compareSchema), asyncHandler(compare));
router.post("/compare-summary", validate(compareSchema), asyncHandler(compare));
router.post("/chat", validate(chatSchema), asyncHandler(chat));
router.post("/fix", validate(summarySchema), asyncHandler(fix));

export default router;
