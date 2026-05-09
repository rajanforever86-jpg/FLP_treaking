import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";

// Routes - Keep these for now or remove if strictly move to client
// Note: If you want to move strictly to client, you might not need these.
// But for now, keeping them minimizes disruption unless I rewrite them.
// User requested: "Remove all MongoDB and mongoose dependencies... Replace signup and login..."
// I'll keep the express skeleton for now but remove DB logic.

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes (Empty for now until user requests backend logic or I move it to Firestore)
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
