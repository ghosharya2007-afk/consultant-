import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("pathwise.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    age INTEGER,
    education TEXT,
    income INTEGER,
    free_time INTEGER,
    clarity_level INTEGER,
    execution_readiness_score INTEGER DEFAULT 50,
    subscription_status TEXT DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    description TEXT,
    google_project_prompt TEXT,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    goal_id TEXT,
    week_number INTEGER,
    title TEXT,
    description TEXT,
    time_required TEXT,
    reason TEXT,
    youtube_recommendation TEXT,
    github_idea TEXT,
    status TEXT DEFAULT 'pending',
    blocker_reason TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(goal_id) REFERENCES goals(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    week_number INTEGER,
    score_change INTEGER,
    notes TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/user/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/user", (req, res) => {
    const { id, name, age, education, income, free_time, clarity_level } = req.body;
    db.prepare(`
      INSERT INTO users (id, name, age, education, income, free_time, clarity_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        age=excluded.age,
        education=excluded.education,
        income=excluded.income,
        free_time=excluded.free_time,
        clarity_level=excluded.clarity_level
    `).run(id, name, age, education, income, free_time, clarity_level);
    res.json({ success: true });
  });

  app.get("/api/goals/:userId", (req, res) => {
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ?").all(req.params.userId);
    res.json(goals);
  });

  app.post("/api/goals", (req, res) => {
    const { id, user_id, title, description, google_project_prompt } = req.body;
    db.prepare("INSERT INTO goals (id, user_id, title, description, google_project_prompt) VALUES (?, ?, ?, ?, ?)").run(id, user_id, title, description, google_project_prompt);
    res.json({ success: true });
  });

  app.get("/api/tasks/:userId", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY week_number DESC").all(req.params.userId);
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { id, user_id, goal_id, week_number, title, description, time_required, reason, youtube_recommendation, github_idea } = req.body;
    db.prepare(`
      INSERT INTO tasks (id, user_id, goal_id, week_number, title, description, time_required, reason, youtube_recommendation, github_idea)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, goal_id, week_number, title, description, time_required, reason, youtube_recommendation, github_idea);
    res.json({ success: true });
  });

  app.patch("/api/user/:id/subscription", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE users SET subscription_status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const { status, blocker_reason } = req.body;
    db.prepare("UPDATE tasks SET status = ?, blocker_reason = ? WHERE id = ?").run(status, blocker_reason, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
