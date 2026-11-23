import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  analysis: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", default: null, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, maxlength: 12000 },
  citations: [{ path: { type: String, maxlength: 500 } }]
}, { timestamps: true });

chatMessageSchema.index({ owner: 1, analysis: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
