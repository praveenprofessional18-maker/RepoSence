import { Router } from "express";
import { deleteHistoryItem, getHistoryItem, listActivity, listBookmarked, listHistory, updateBookmark, updateHistoryData } from "../controllers/historyController.js";
import { auth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bookmarkSchema, historyDataSchema, historyIdSchema, historyQuerySchema } from "../validators/historySchemas.js";

const router = Router();
router.use(auth);

router.get("/", validate(historyQuerySchema, "query"), asyncHandler(listHistory));
router.get("/search", validate(historyQuerySchema, "query"), asyncHandler(listHistory));
router.get("/bookmarked", validate(historyQuerySchema, "query"), asyncHandler(listBookmarked));
router.get("/activity", asyncHandler(listActivity));
router.get("/:id", validate(historyIdSchema, "params"), asyncHandler(getHistoryItem));
router.patch("/:id/bookmark", validate(historyIdSchema, "params"), validate(bookmarkSchema), asyncHandler(updateBookmark));
router.patch("/:id", validate(historyIdSchema, "params"), validate(historyDataSchema), asyncHandler(updateHistoryData));
router.delete("/:id", validate(historyIdSchema, "params"), asyncHandler(deleteHistoryItem));

export default router;
