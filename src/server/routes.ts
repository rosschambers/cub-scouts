import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "./auth.js";
import { config } from "./config.js";
import { generatePlan } from "./llm.js";
import type { SignUpsData, SignUp, Adventure, PlansData, PlanVersion } from "../shared/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Walk up from the module directory to find the project root (where
// package.json lives). Works both from source (tests) and from the
// compiled dist/ output (production).
function findProjectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = join(dir, "..");
  }
  return join(__dirname, "../../..");
}

const rootDir = findProjectRoot();
const router = Router();
const signupsPath = join(rootDir, "signups.json");
const adventuresPath = join(rootDir, "content/adventures.json");
const plansPath = join(rootDir, "plans.json");

function readSignUps(): SignUpsData {
  try {
    return JSON.parse(readFileSync(signupsPath, "utf-8"));
  } catch {
    return { signups: [] };
  }
}

function writeSignUps(data: SignUpsData): void {
  writeFileSync(signupsPath, JSON.stringify(data, null, 2));
}

function readPlans(): PlansData {
  try {
    return JSON.parse(readFileSync(plansPath, "utf-8"));
  } catch {
    return { plans: [] };
  }
}

function writePlans(data: PlansData): void {
  writeFileSync(plansPath, JSON.stringify(data, null, 2));
}

// GET /api/config (public) -- returns hasPassword; validates password when provided
router.get("/api/config", (req: Request, res: Response) => {
  const header = req.headers["x-password"];
  const provided = typeof header === "string" ? header : "";

  if (config.password) {
    if (provided && provided === config.password) {
      res.json({ hasPassword: true });
      return;
    }
    if (provided) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
  }

  res.json({ hasPassword: config.password.length > 0 });
});

// GET /api/signups
router.get("/api/signups", requireAuth, (_req: Request, res: Response) => {
  const data = readSignUps();
  res.json(data);
});

// GET /api/plans?adventureId=<id> — list plan versions, newest first
router.get("/api/plans", requireAuth, (req: Request, res: Response) => {
  const { adventureId } = req.query;
  const data = readPlans();
  const plans = data.plans
    .filter((p) => !adventureId || p.adventureId === adventureId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({ plans });
});

// POST /api/signups
router.post("/api/signups", requireAuth, (req: Request, res: Response) => {
  const { adventureId, parentName } = req.body;

  if (!adventureId || !parentName) {
    res.status(400).json({ error: "adventureId and parentName are required" });
    return;
  }

  const data = readSignUps();
  const newSignUp: SignUp = {
    id: crypto.randomUUID(),
    adventureId,
    parentName,
    timestamp: new Date().toISOString(),
  };
  data.signups.push(newSignUp);
  writeSignUps(data);
  res.status(201).json(newSignUp);
});

// DELETE /api/signups/:id
router.delete("/api/signups/:id", requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readSignUps();
  const before = data.signups.length;
  data.signups = data.signups.filter((s) => s.id !== id);

  if (data.signups.length === before) {
    res.status(404).json({ error: "Sign-up not found" });
    return;
  }

  writeSignUps(data);
  res.status(204).send();
});

// POST /api/plan — generate AND persist a new plan version
router.post("/api/plan", requireAuth, async (req: Request, res: Response) => {
  const { adventureId, requirements } = req.body;

  if (!adventureId || !requirements) {
    res.status(400).json({ error: "adventureId and requirements are required" });
    return;
  }

  try {
    const adventuresData = JSON.parse(readFileSync(adventuresPath, "utf-8"));
    const adventure = adventuresData.adventures.find(
      (a: Adventure) => a.id === adventureId
    );

    if (!adventure) {
      res.status(404).json({ error: "Adventure not found" });
      return;
    }

    const content = await generatePlan({ adventureId, requirements }, adventure);
    const version: PlanVersion = {
      id: crypto.randomUUID(),
      adventureId,
      requirements,
      content,
      timestamp: new Date().toISOString(),
    };
    const data = readPlans();
    data.plans.push(version);
    writePlans(data);

    res.status(201).json(version);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
