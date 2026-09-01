import { describe, it, expect } from "vitest";

describe("api", () => {
  it("can import all functions", async () => {
    const mod = await import("./api.js");
    expect(typeof mod.getConfig).toBe("function");
    expect(typeof mod.getSignUps).toBe("function");
    expect(typeof mod.createSignUp).toBe("function");
    expect(typeof mod.deleteSignUp).toBe("function");
    expect(typeof mod.getPlanVersions).toBe("function");
    expect(typeof mod.generatePlan).toBe("function");
  });
});
