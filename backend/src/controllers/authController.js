import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { logActivity } from "../utils/activity.js";

export async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
  await logActivity({ owner: user.id, action: "account.registered", entityType: "user" });
  res.status(201).json({ user: user.toSafeJSON(), token: signToken(user.id) });
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await user.verifyPassword(req.body.password))) {
    const error = new Error("Email or password is incorrect.");
    error.statusCode = 401;
    throw error;
  }
  res.json({ user: user.toSafeJSON(), token: signToken(user.id) });
}

export function getCurrentUser(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}
