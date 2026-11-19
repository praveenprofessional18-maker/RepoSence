import mongoose from "mongoose";

const databaseStates = new Map([
  [0, "disconnected"],
  [1, "connected"],
  [2, "connecting"],
  [3, "disconnecting"]
]);

export function getHealth(req, res) {
  const database = databaseStates.get(mongoose.connection.readyState) || "unknown";
  const healthy = database === "connected";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "API is healthy." : "API is not ready.",
    data: {
      status: healthy ? "ok" : "unavailable",
      database,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
}
