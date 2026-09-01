import { describe, it, expect } from "vitest";

describe("llm", () => {
  it("can import the generatePlan function", async () => {
    const mod = await import("../server/llm.js");
    expect(typeof mod.generatePlan).toBe("function");
  });
});
