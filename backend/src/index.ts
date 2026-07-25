import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db";
import { runSeed } from "./seed";
import authRoutes from "./routes/auth";
import ticketRoutes from "./routes/tickets";
import userRoutes from "./routes/users";
import feedbackRoutes from "./routes/feedback";
import reportRoutes from "./routes/reports";
import chatRoutes from "./routes/chat";
import { isGeminiAvailable } from "./services/gemini";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const origins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin) || origins.includes("*")) {
        callback(null, true);
      } else {
        callback(null, true); // allow during demos; tighten via CORS_ORIGINS in production
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    name: "IntelliDesk API",
    version: "1.0.0",
    status: "ok",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    gemini: isGeminiAvailable() ? "available" : "not available",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
);

async function start() {
  await connectDB(process.env.MONGODB_URI);

  if (process.env.SEED_ON_START !== "false") {
    await runSeed();
  }

  app.listen(PORT, () => {
    console.log(`IntelliDesk API running on http://localhost:${PORT}`);
    console.log(
      `Gemini chatbot: ${isGeminiAvailable() ? "available" : "not available"}`
    );
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
