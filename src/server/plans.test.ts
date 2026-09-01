import { describe, it, expect, beforeAll, vi } from "vitest";
import express from "express";
import request from "supertest";
import routes from "./routes.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

vi.mock("./llm.js", () => ({
  generatePlan: vi.fn().mockResolvedValue("Mocked plan content"),
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
}

describe("plans routes", () => {
  const app = createTestApp();
  const plansPath = join(__dirname, "../../plans.json");

  beforeAll(() => {
    writeFileSync(plansPath, JSON.stringify({ plans: [] }, null, 2));
  });

  it("GET /api/plans requires auth", async () => {
    const res = await request(app).get("/api/plans");
    expect(res.status).toBe(401);
  });

  it("GET /api/plans returns empty by default", async () => {
    const res = await request(app)
      .get("/api/plans")
      .set("X-Password", config.password);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ plans: [] });
  });

  it("GET /api/plans filters by adventureId and sorts newest-first", async () => {
    const data = {
      plans: [
        { id: "old", adventureId: "bobcat", requirements: {}, content: "old", timestamp: "2026-08-09T00:00:00.000Z" },
        { id: "new", adventureId: "bobcat", requirements: {}, content: "new", timestamp: "2026-08-10T00:00:00.000Z" },
        { id: "other", adventureId: "floats-and-boats", requirements: {}, content: "other", timestamp: "2026-08-10T00:00:00.000Z" },
      ],
    };
    writeFileSync(plansPath, JSON.stringify(data, null, 2));

    const res = await request(app)
      .get("/api/plans?adventureId=bobcat")
      .set("X-Password", config.password);
    expect(res.status).toBe(200);
    expect(res.body.plans.map((p: { id: string }) => p.id)).toEqual(["new", "old"]);
  });

  it("POST /api/plan persists a new version and GET returns it", async () => {
    const createRes = await request(app)
      .post("/api/plan")
      .set("X-Password", config.password)
      .send({ adventureId: "bobcat", requirements: { 1: "Me Too Name Game" } });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty("id");
    expect(createRes.body.adventureId).toBe("bobcat");
    expect(createRes.body.content).toBe("Mocked plan content");
    expect(createRes.body).toHaveProperty("timestamp");

    const listRes = await request(app)
      .get("/api/plans?adventureId=bobcat")
      .set("X-Password", config.password);
    expect(listRes.status).toBe(200);
    expect(listRes.body.plans[0].id).toBe(createRes.body.id);
  });
});
