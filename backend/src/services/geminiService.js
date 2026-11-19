import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

const client = new GoogleGenerativeAI(env.geminiApiKey);

export async function generateText(prompt) {
  const model = client.getGenerativeModel({
    model: env.geminiModel,
    generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim();
  if (!text) {
    const error = new Error("The AI provider returned an empty response.");
    error.statusCode = 502;
    throw error;
  }
  return text;
}
