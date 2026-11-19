import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function getToken(req) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

export const auth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    const error = new Error("Authentication is required.");
    error.statusCode = 401;
    throw error;
  }
  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(payload.sub);
  if (!user) {
    const error = new Error("The account associated with this token no longer exists.");
    error.statusCode = 401;
    throw error;
  }
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    next();
    return;
  }
  const payload = jwt.verify(token, env.jwtSecret);
  req.user = await User.findById(payload.sub) || undefined;
  next();
});
