import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
  repositoryName: { type: String, required: true, trim: true },
  summary: { type: String, default: "" },
  qualityScore: { type: Number, default: null, min: 0, max: 100 },
  securityScore: { type: Number, default: null, min: 0, max: 100 },
  bookmarked: { type: Boolean, default: false, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

analysisSchema.index({ owner: 1, updatedAt: -1 });
analysisSchema.index({ owner: 1, bookmarked: 1, updatedAt: -1 });

export default mongoose.model("Analysis", analysisSchema);
