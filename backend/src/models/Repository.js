import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  githubId: { type: Number, required: true, index: true },
  fullName: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

repositorySchema.index({ owner: 1, githubId: 1 }, { unique: true, partialFilterExpression: { owner: { $type: "objectId" } } });

export default mongoose.model("Repository", repositorySchema);
