import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10
  });
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
