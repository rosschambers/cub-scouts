import { describe, it, expect, afterAll, vi } from "vitest";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

describe("config", () => {
  const configPath = join(process.cwd(), "config.json");
  const originalContent = existsSync(configPath)
    ? readFileSync(configPath, "utf-8")
    : null;

  it("returns default values when config.json has no useful keys", async () => {
    writeFileSync(configPath, JSON.stringify({}));
    vi.resetModules();
    const mod = await import("./config.js");
    expect(mod.config.password).toBe("");
    expect(mod.config.frameApiBaseUrl).toBe("http://localhost:8080/v1");
    expect(mod.config.frameApiKey).toBe("sk-local");
    expect(mod.config.frameModel).toBe("local-model");
  });

  it("reads password override from config.json", async () => {
    writeFileSync(configPath, JSON.stringify({ password: "test123" }));
    vi.resetModules();
    const mod = await import("./config.js");
    expect(mod.config.password).toBe("test123");
    expect(mod.config.frameApiKey).toBe("sk-local");
  });

  it("reads full config from config.json", async () => {
    writeFileSync(configPath, JSON.stringify({
      password: "mysecret",
      frameApiBaseUrl: "http://example.com/v1",
      frameApiKey: "my-key",
      frameModel: "my-model",
    }));
    vi.resetModules();
    const mod = await import("./config.js");
    expect(mod.config.password).toBe("mysecret");
    expect(mod.config.frameApiBaseUrl).toBe("http://example.com/v1");
    expect(mod.config.frameApiKey).toBe("my-key");
    expect(mod.config.frameModel).toBe("my-model");
  });

  afterAll(() => {
    if (originalContent === null) {
      unlinkSync(configPath);
    } else {
      writeFileSync(configPath, originalContent);
    }
  });
});
