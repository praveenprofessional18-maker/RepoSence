import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().trim().min(1, "is required"),
  JWT_SECRET: z.string().min(32, "must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("7d"),
  GEMINI_API_KEY: z.string().trim().min(1, "is required"),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.5-flash"),
  GITHUB_TOKEN: z.string().trim().optional().default(""),
  CLIENT_URL: z.string().url().default("http://localhost:5173")
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map(({ path, message }) => `${path.join(".")}: ${message}`)
    .join("\n");

  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = Object.freeze({
  port: result.data.PORT,
  mongodbUri: result.data.MONGODB_URI,
  jwtSecret: result.data.JWT_SECRET,
  jwtExpiresIn: result.data.JWT_EXPIRES_IN,
  geminiApiKey: result.data.GEMINI_API_KEY,
  geminiModel: result.data.GEMINI_MODEL,
  githubToken: result.data.GITHUB_TOKEN,
  clientUrl: result.data.CLIENT_URL,
  nodeEnv: process.env.NODE_ENV || "development"
});
