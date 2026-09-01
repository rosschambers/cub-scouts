import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

export interface Config {
  password: string;
  frameApiBaseUrl: string;
  frameApiKey: string;
  frameModel: string;
}

const DEFAULT_CONFIG: Config = {
  password: "",
  frameApiBaseUrl: "http://localhost:8080/v1",
  frameApiKey: "sk-local",
  frameModel: "local-model",
};

function loadConfig(): Config {
  try {
    const raw = readFileSync(join(rootDir, "config.json"), "utf-8");
    const fileConfig = JSON.parse(raw) as Partial<Config>;
    return { ...DEFAULT_CONFIG, ...fileConfig };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export const config = loadConfig();
