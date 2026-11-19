import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === env.clientUrl || origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173") {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "guestId"]
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(morgan(":method :status :response-time ms"));
app.use(morgan(":method :url :status :response-time ms"));
app.use("/api", apiLimiter);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/repository", githubRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/history", historyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
