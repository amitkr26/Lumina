// envCheck.ts – sanity‑check for .env values per workspace
// Run with: `npm run env:check`
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

function loadEnv(packageRoot: string) {
  const envPath = path.resolve(packageRoot, ".env");
  if (!fs.existsSync(envPath)) {
    console.warn(`[WARN] No .env at ${envPath}`);
    return {};
  }
  const raw = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  raw.split(/\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...rest] = trimmed.split("=");
    env[key] = rest.join("=").replace(/^"|"$/g, "");
  });
  return env;
}

function warnIfProdUrl(key: string, value: string) {
  const prodIndicators = [/\.supabase\.co/, /\.vercel\.app/, /localhost:3000/];
  if (prodIndicators.some(r => r.test(value))) {
    console.warn(`[ENV BLEED] ${key} points to a production‑like endpoint: ${value}`);
  }
}

function checkWorkspace(name: string, relativePath: string) {
  const abs = path.resolve(process.cwd(), relativePath);
  console.log(`\n=== Checking ${name} (${abs}) ===`);
  const env = loadEnv(abs);
  Object.entries(env).forEach(([k, v]) => {
    if (k.includes("URL") || k.includes("_HOST")) {
      warnIfProdUrl(k, v);
    }
  });
}

// Root env (already loaded by Node process)
console.log("=== Root .env ===");
Object.entries(process.env).forEach(([k, v]) => {
  if (k.includes("URL") && v) warnIfProdUrl(k, v as string);
});

// Workspace checks – adjust paths if you add more packages
checkWorkspace("api", "apps/api");
checkWorkspace("web", "apps/web");
checkWorkspace("database", "packages/database");

// Exit with non‑zero if any warnings were emitted (optional)
process.exit(0);
