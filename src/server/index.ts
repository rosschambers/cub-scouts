import express from "express";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import apiRoutes from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../../..");

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.use(express.json());
app.use(apiRoutes);

// Serve static client files
app.use(express.static(join(rootDir, "dist/client")));
app.use(express.static(join(rootDir, "public")));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// SPA fallback -- serve index.html for non-API, non-file routes
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.includes(".")) {
    res.sendStatus(404);
    return;
  }
  res.sendFile(join(rootDir, "dist/client/index.html"));
});

// Only listen when run directly (not when imported by tests)
const isMain = process.argv[1] && (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"));
if (isMain) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
