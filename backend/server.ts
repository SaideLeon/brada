import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import aiRoutes from "./routes/ai.routes";
import githubRoutes from "./routes/github.routes";
import { errorHandler } from "./middleware/errorHandler";
import { config } from "./config/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '50mb' }));

// API Routes
app.use("/api/ai", aiRoutes);
app.use("/api/github", githubRoutes);

// Error Handler
app.use(errorHandler);

// Only start the server if we are not in a serverless environment (like Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  async function startServer() {
    if (config.nodeEnv !== "production") {
      const viteModule = "vite";
      const { createServer: createViteServer } = await import(viteModule);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
        root: path.resolve(__dirname, ".."),
      });
      app.use(vite.middlewares);
    } else {
      // Serve static files in production
      const distPath = path.resolve(__dirname, "../dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const PORT = config.port;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  startServer();
}

export default app;
