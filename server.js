import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errors.js";
import { apiLimiter } from "./middleware/rateLimit.js";

import dataRoute       from "./routes/data.js";
import habitsRoute     from "./routes/habits.js";
import completionsRoute from "./routes/completions.js";
import projectsRoute   from "./routes/projects.js";
import sprintsRoute    from "./routes/sprints.js";
import wishesRoute     from "./routes/wishes.js";
import logsRoute       from "./routes/logs.js";
import profileRoute    from "./routes/profile.js";
import chatRoute       from "./routes/chat.js";
import expensesRoute   from "./routes/expenses.js";
import budgetsRoute    from "./routes/budgets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

const app = express();

// ── Security & utility middleware ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL || "", "https://api.groq.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  } : false,
}));
app.use(compression());
app.use(cors({
  origin: isProd
    ? ((process.env.FRONTEND_URL || "").replace(/\/$/, "") || false)
    : ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));
app.use(express.json({ limit: "512kb" }));
app.use(morgan(isProd ? "combined" : "dev"));

// ── Health check (public) ─────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "development", ts: new Date().toISOString() })
);

// ── API Routes (all require auth + rate limit) ────────────────────────────────
app.use("/api", apiLimiter, authMiddleware);
app.use("/api/data",        dataRoute);
app.use("/api/habits",      habitsRoute);
app.use("/api/completions", completionsRoute);
app.use("/api/projects",    projectsRoute);
app.use("/api/sprints",     sprintsRoute);
app.use("/api/wishes",      wishesRoute);
app.use("/api/logs",        logsRoute);
app.use("/api/profile",     profileRoute);
app.use("/api/chat",        chatRoute);
app.use("/api/expenses",    expensesRoute);
app.use("/api/budgets",     budgetsRoute);

// ── Serve frontend in production ──────────────────────────────────────────────
if (isProd) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("/*splat", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}

// ── Central error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`)
);
