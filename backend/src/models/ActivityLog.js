import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true, maxlength: 80 },
  entityType: { type: String, enum: ["user", "repository", "analysis", "chat"], default: "analysis" },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

activityLogSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
