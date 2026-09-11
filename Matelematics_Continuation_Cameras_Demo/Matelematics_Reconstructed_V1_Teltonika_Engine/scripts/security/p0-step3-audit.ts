import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const SELF = "scripts/security/p0-step3-audit.ts";

const SERVER_ONLY_ENV = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USER",
  "MAIL_PASSWORD",
] as const;

const REQUIRED_RUNTIME_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

const failures: string[] = [];
const warnings: string[] = [];

function normalize(value: string) {
  return value.replaceAll("\\", "/");
}

function gitTrackedFiles(): string[] {
  const output = execFileSync(
    "git",
    ["ls-files", "-z"],
    {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return output
    .split("\0")
    .filter(Boolean)
    .map(normalize);
}

function isTextFile(file: string) {
  return /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|txt|yml|yaml|toml|sql|env|example)$/i.test(file) ||
    path.basename(file).startsWith(".env");
}

function readTrackedText(file: string): string | null {
  if (!isTextFile(file)) return null;

  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return null;
  }
}

function hasUseClientDirective(content: string) {
  const prefix = content.slice(0, 500);
  return /^\s*["']use client["'];?/m.test(prefix);
}

function auditTrackedFiles(files: string[]) {
  for (const file of files) {
    const base = path.basename(file);

    if (
      base.startsWith(".env") &&
      base !== ".env.example"
    ) {
      failures.push(`Tracked environment file is forbidden: ${file}`);
    }

    if (/\.(?:pem|key|p12|pfx)$/i.test(file)) {
      failures.push(`Tracked credential/key file is forbidden: ${file}`);
    }

    const content = readTrackedText(file);
    if (content === null || file === SELF) continue;

    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
      failures.push(`Private key material detected in tracked file: ${file}`);
    }

    if (/\bsb_secret_[A-Za-z0-9_-]{12,}\b/.test(content)) {
      failures.push(`Supabase secret-key-shaped value detected in tracked file: ${file}`);
    }

    const publicEnvMatches = content.matchAll(
      /(?:process\.env\.|process\.env\[\s*["'])(NEXT_PUBLIC_[A-Z0-9_]+)/g,
    );

    for (const match of publicEnvMatches) {
      const variable = match[1];
      if (/(?:SECRET|PASSWORD|PRIVATE|SERVICE_ROLE)/.test(variable)) {
        failures.push(`Dangerous public environment variable ${variable} referenced in ${file}`);
      }
    }

    if (hasUseClientDirective(content)) {
      for (const variable of SERVER_ONLY_ENV) {
        if (content.includes(variable)) {
          failures.push(`Server-only variable ${variable} referenced by client module: ${file}`);
        }
      }
    }
  }
}

function auditNextConfig() {
  const file = "next.config.ts";
  if (!fs.existsSync(path.join(ROOT, file))) return;

  const content = fs.readFileSync(path.join(ROOT, file), "utf8");

  for (const variable of SERVER_ONLY_ENV) {
    if (content.includes(variable)) {
      failures.push(`Server-only variable ${variable} referenced in ${file}`);
    }
  }

  if (/\benv\s*:\s*\{/.test(content)) {
    warnings.push(
      "next.config.ts contains an env block. Review every value: Next.js bundles entries from next.config env into client code.",
    );
  }
}

function auditTemplate() {
  const templatePath = path.join(ROOT, ".env.example");

  if (!fs.existsSync(templatePath)) {
    failures.push("Missing .env.example");
    return;
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const expected = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "MAIL_HOST",
    "MAIL_PORT",
    "MAIL_USER",
    "MAIL_PASSWORD",
    "MAIL_FROM",
  ];

  for (const variable of expected) {
    if (!template.includes(`${variable}=`)) {
      failures.push(`.env.example is missing ${variable}`);
    }
  }
}

function auditRuntimeEnvironment() {
  const missing = REQUIRED_RUNTIME_ENV.filter(
    (variable) => !process.env[variable]?.trim(),
  );

  if (missing.length > 0) {
    warnings.push(
      `Runtime environment not loaded in this audit process: ${missing.join(", ")}. ` +
      "This is expected when the command is run without loading .env.local; source-code checks are still valid.",
    );
  }

  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (secret && publishable && secret === publishable) {
    failures.push("SUPABASE_SECRET_KEY must not equal NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
}

function main() {
  let files: string[];

  try {
    files = gitTrackedFiles();
  } catch (error) {
    console.error("P0 Step 3 audit ERROR: unable to read tracked Git files.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  auditTrackedFiles(files);
  auditNextConfig();
  auditTemplate();
  auditRuntimeEnvironment();

  console.log("P0 / Step 3 - server secrets & configuration audit");
  console.log(`Tracked files checked: ${files.length}`);

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    for (const warning of warnings) console.log(`WARN: ${warning}`);
  }

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} blocking issue(s)`);
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("P0 Step 3 audit PASS");
}

main();
