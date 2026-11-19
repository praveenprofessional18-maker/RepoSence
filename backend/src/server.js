import http from "node:http";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

let server;
let shuttingDown = false;

async function startServer() {
  await connectDatabase();
  if (shuttingDown) return;

  server = http.createServer(app);
  server.on("error", (error) => {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error(`HTTP server failed (${errorType}).`);
    process.exitCode = 1;
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.port, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  console.info(`RepoSense API listening on port ${env.port}.`);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; shutting down.`);

  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await disconnectDatabase();
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error(`Graceful shutdown failed (${errorType}).`);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

startServer().catch(async (error) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  console.error(`Application startup failed (${errorType}). Check the database connection and environment configuration.`);
  try {
    await disconnectDatabase();
  } catch (disconnectError) {
    const disconnectErrorType = disconnectError instanceof Error
      ? disconnectError.name
      : "UnknownError";
    console.error(`Database cleanup failed (${disconnectErrorType}).`);
  }
  process.exitCode = 1;
});
