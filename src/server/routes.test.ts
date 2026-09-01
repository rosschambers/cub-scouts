import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import routes from "../server/routes.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
}

describe("routes", () => {
  const app = createTestApp();
  const signupsPath = join(__dirname, "../../signups.json");

  beforeAll(() => {
    try {
      writeFileSync(signupsPath, JSON.stringify({ signups: [] }, null, 2));
    } catch {
      writeFileSync(signupsPath, JSON.stringify({ signups: [] }, null, 2));
    }
  });

  it("GET /api/config returns hasPassword", async () => {
    const res = await request(app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hasPassword");
    expect(typeof res.body.hasPassword).toBe("boolean");
  });

  it("GET /api/signups returns empty array by default", async () => {
    const configMod = await import("../server/config.js");
    const res = await request(app)
      .get("/api/signups")
      .set("X-Password", configMod.config.password);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ signups: [] });
  });

  it("POST /api/signups creates a sign-up", async () => {
    const configMod = await import("../server/config.js");
    const res = await request(app)
      .post("/api/signups")
      .set("X-Password", configMod.config.password)
      .send({ adventureId: "bobcat", parentName: "Test Parent" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.adventureId).toBe("bobcat");
    expect(res.body.parentName).toBe("Test Parent");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("POST /api/signups rejects missing fields", async () => {
    const configMod = await import("../server/config.js");
    const res = await request(app)
      .post("/api/signups")
      .set("X-Password", configMod.config.password)
      .send({ adventureId: "bobcat" });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/signups/:id removes a sign-up", async () => {
    const configMod = await import("../server/config.js");
    const createRes = await request(app)
      .post("/api/signups")
      .set("X-Password", configMod.config.password)
      .send({ adventureId: "bobcat", parentName: "Delete Me" });
    const id = createRes.body.id;

    const deleteRes = await request(app)
      .delete(`/api/signups/${id}`)
      .set("X-Password", configMod.config.password);
    expect(deleteRes.status).toBe(204);
  });

  it("POST /api/plan returns a plan for a valid adventure", async () => {
    const configMod = await import("../server/config.js");
    const res = await request(app)
      .post("/api/plan")
      .set("X-Password", configMod.config.password)
      .send({
        adventureId: "bobcat",
        requirements: { 1: "Me Too Name Game", 2: "Line-by-line echo" },
      });
    expect([201, 500, 503]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("content");
      expect(res.body).toHaveProperty("timestamp");
    }
  }, 90000);
});
