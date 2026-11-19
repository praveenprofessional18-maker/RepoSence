import axios from "axios";
import { env } from "../config/env.js";

const github = axios.create({
  baseURL: "https://api.github.com",
  timeout: 15000,
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {})
  }
});

export async function githubGet(path, params = {}) {
  try {
    return (await github.get(path, { params })).data;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";
    const wrapped = new Error(
      status === 404
        ? "Repository or file not found. Private repositories are not supported."
        : status === 403 && /rate limit/i.test(message)
          ? "GitHub API rate limit reached. Configure GITHUB_TOKEN or try again later."
          : status === 401
            ? "GitHub rejected the configured token."
            : "GitHub request failed. Please try again."
    );
    wrapped.statusCode = status === 404 ? 404 : status === 403 ? 429 : status === 401 ? 502 : 502;
    throw wrapped;
  }
}

export function repositoryPath(owner, repo) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function decodeGithubFile(result) {
  if (!result || result.type !== "file" || result.encoding !== "base64" || typeof result.content !== "string") {
    const error = new Error("This file is not available as text.");
    error.statusCode = 415;
    throw error;
  }
  const buffer = Buffer.from(result.content.replace(/\s/g, ""), "base64");
  if (buffer.length > 200 * 1024) {
    const error = new Error("File is too large to return (maximum 200 KB).");
    error.statusCode = 413;
    throw error;
  }
  if (buffer.includes(0)) {
    const error = new Error("Binary files cannot be returned as text.");
    error.statusCode = 415;
    throw error;
  }
  return buffer.toString("utf8");
}
