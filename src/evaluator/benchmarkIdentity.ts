import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const REPORT_PATH = join(ROOT, "benchmark/validation-report.json");

export interface BenchmarkIdentity {
  version: string;
  fingerprint: string;
}

export async function loadBenchmarkIdentity(): Promise<BenchmarkIdentity> {
  if (!existsSync(REPORT_PATH)) {
    throw new Error(`Benchmark validation report not found at ${REPORT_PATH}. Run bun run benchmark:validate first.`);
  }
  const raw = await readFile(REPORT_PATH, "utf-8");
  let json: { benchmarkVersion?: string; version?: string; fingerprint?: string };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch (e) {
    throw new Error(`Invalid benchmark validation-report.json: ${(e as Error).message}`);
  }
  const version = json.benchmarkVersion ?? json.version ?? "unknown";
  const fingerprint = json.fingerprint ?? "";
  if (!fingerprint) throw new Error("Benchmark fingerprint missing in validation-report.json");
  return { version, fingerprint };
}

export function loadBenchmarkIdentitySync(): BenchmarkIdentity {
  if (!existsSync(REPORT_PATH)) {
    throw new Error(`Benchmark validation report not found at ${REPORT_PATH}`);
  }
  const raw = readFileSync(REPORT_PATH, "utf-8");
  const json = JSON.parse(raw) as { benchmarkVersion?: string; version?: string; fingerprint?: string };
  const version = json.benchmarkVersion ?? json.version ?? "unknown";
  const fingerprint = json.fingerprint ?? "";
  if (!fingerprint) throw new Error("Benchmark fingerprint missing");
  return { version, fingerprint };
}

export interface IdentityCheckResult {
  matched: boolean;
  code?: string;
  message?: string;
}

export function checkBenchmarkIdentity(
  expected: BenchmarkIdentity,
  actual: BenchmarkIdentity,
): IdentityCheckResult {
  if (expected.version !== actual.version) {
    return {
      matched: false,
      code: "BENCHMARK_VERSION_MISMATCH",
      message: `Benchmark version mismatch: expected ${expected.version}, got ${actual.version}. Use --allow-mismatch to override.`,
    };
  }
  if (expected.fingerprint !== actual.fingerprint) {
    return {
      matched: false,
      code: "BENCHMARK_FINGERPRINT_MISMATCH",
      message: `Benchmark fingerprint mismatch: expected ${expected.fingerprint}, got ${actual.fingerprint}. Use --allow-mismatch to override.`,
    };
  }
  return { matched: true };
}
