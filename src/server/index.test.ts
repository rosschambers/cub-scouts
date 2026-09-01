import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server/index.js";

describe("server", () => {
  it("health check returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
