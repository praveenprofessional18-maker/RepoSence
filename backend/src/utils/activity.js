import ActivityLog from "../models/ActivityLog.js";

export async function logActivity({ owner, action, entityType = "analysis", entityId = null, details = {} }) {
  await ActivityLog.create({ owner, action, entityType, entityId, details });
}
