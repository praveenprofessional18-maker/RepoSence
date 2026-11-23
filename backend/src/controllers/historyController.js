import ActivityLog from "../models/ActivityLog.js";
import Analysis from "../models/Analysis.js";
import ChatMessage from "../models/ChatMessage.js";
import { logActivity } from "../utils/activity.js";

function toHistoryItem(record) {
  const data = record.data || {};
  const id = String(record._id || record.id);
  return {
    id,
    analysisId: id,
    repositoryName: record.repositoryName,
    fullName: data.fullName || record.repositoryName,
    description: data.description || record.summary || "",
    language: data.language || "Unknown",
    stars: Number(data.stars || 0),
    qualityScore: record.qualityScore,
    securityScore: record.securityScore,
    bookmarked: record.bookmarked,
    analyzedAt: record.createdAt,
    updatedAt: record.updatedAt,
    repository: data
  };
}

export async function listHistory(req, res) {
  const { search, sort, bookmarked, page, limit } = req.validated.query;
  const filter = { owner: req.user._id };
  if (search) filter.repositoryName = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (bookmarked !== undefined) filter.bookmarked = bookmarked === "true";
  const sortBy = sort === "oldest" ? { createdAt: 1 }
    : sort === "name" ? { repositoryName: 1 }
      : sort === "stars" ? { "data.stars": -1, createdAt: -1 }
        : { createdAt: -1 };
  const [records, total] = await Promise.all([
    Analysis.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
    Analysis.countDocuments(filter)
  ]);
  res.json({
    success: true,
    data: records.map(toHistoryItem),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

export async function listBookmarked(req, res) {
  req.validated.query.bookmarked = "true";
  return listHistory(req, res);
}

export async function getHistoryItem(req, res) {
  const record = await Analysis.findOne({ _id: req.validated.params.id, owner: req.user._id }).lean();
  if (!record) {
    const error = new Error("Analysis not found.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, data: toHistoryItem(record) });
}

export async function updateBookmark(req, res) {
  const record = await Analysis.findOneAndUpdate(
    { _id: req.validated.params.id, owner: req.user._id },
    { $set: { bookmarked: req.body.bookmarked } },
    { new: true }
  );
  if (!record) {
    const error = new Error("Analysis not found.");
    error.statusCode = 404;
    throw error;
  }
  await logActivity({
    owner: req.user._id,
    action: record.bookmarked ? "analysis.bookmarked" : "analysis.unbookmarked",
    entityType: "analysis",
    entityId: record._id
  });
  res.json({ success: true, data: toHistoryItem(record) });
}

export async function updateHistoryData(req, res) {
  const record = await Analysis.findOneAndUpdate(
    { _id: req.validated.params.id, owner: req.user._id },
    { $set: { data: req.validated.body.data } },
    { new: true, runValidators: true }
  ).lean();
  if (!record) {
    const error = new Error("Analysis not found.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, data: toHistoryItem(record) });
}

export async function deleteHistoryItem(req, res) {
  const record = await Analysis.findOneAndDelete({ _id: req.validated.params.id, owner: req.user._id });
  if (!record) {
    const error = new Error("Analysis not found.");
    error.statusCode = 404;
    throw error;
  }
  await ChatMessage.deleteMany({ analysis: record._id, owner: req.user._id });
  await logActivity({
    owner: req.user._id,
    action: "analysis.deleted",
    entityType: "analysis",
    details: { repository: record.repositoryName }
  });
  res.json({ success: true, message: "Analysis deleted." });
}

export async function listActivity(req, res) {
  const events = await ActivityLog.find({ owner: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: events });
}
