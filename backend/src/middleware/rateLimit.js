import { rateLimit } from "express-rate-limit";

function createLimiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message },
    handler(req, res, next, options) {
      res.status(options.statusCode).json(options.message);
    }
  });
}

export const apiLimiter = createLimiter(15 * 60 * 1000, 300, "Too many requests. Please try again later.");
export const authLimiter = createLimiter(15 * 60 * 1000, 20, "Too many authentication attempts. Please try again later.");
export const aiLimiter = createLimiter(60 * 1000, 15, "AI request limit reached. Please try again in a minute.");
