#!/usr/bin/env bun
/**
 * Benchmark Validator v0.4 (bun-first, vitest/tsx fallback for npm/pnpm/yarn)
 * - Temp workspace isolation (no live repo mutation)
 * - Path containment via resolved-path check
 * - Exec settle guard
 * - 3x oracle stability
 * - Manifest schema validation (manual, mirrors schema)
 * - Benchmark fingerprint (sha256)
 * - Runner: bun (primary, when available) → vitest/tsx fallback for npm users
 */

import { readdir, readFile, writeFile, stat, copyFile, mkdtemp } from "node:fs/promises";
import { existsSync, cpSync, rmSync } from "node:fs";
import { join, resolve, isAbsolute, normalize, relative, dirname } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve((import.meta as any).dir ?? __dirname, "../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const REPOS_DIR = join(ROOT, "benchmark/repositories");
const SCHEMA_PATH = join(ROOT, "benchmark/schema/manifest.schema.json");

type Manifest = {
  id: string;
  type: string;
  repository: string;
  baseVersion: string;
  baseCommit?: string;
  difficulty: string;
  categories: string[];
  description: string;
  provenance: {
    sourceUrl: string;
    license: string;
    licenseUrl: string;
    createdAt: string;
    issueUrl?: string | null;
    buggyCommit?: string | null;
    fixedCommit?: string | null;
    notes?: string;
  };
  runtime: { node: string; bun: string; packageManager: string };
  verification: { reproduction: string; oracle: string; regression: string };
  buggyFiles: string[];
  fixFiles?: string[];
};

// --- exec with settle guard ---
function exec(cmd: string, args: string[], cwd: string, timeout = 15000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveP, reject) => {
    let settled = false;
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill("SIGKILL"); } catch {}
      reject(new Error(`Timeout: ${cmd} ${args.join(" ")} in ${cwd} after ${timeout}ms`));
    }, timeout);
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveP({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function runBunFile(filePath: string, cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    return await exec("bun", ["run", filePath], cwd);
  } catch (e: any) {
    // Fallback for npm/pnpm/yarn without bun: use tsx
    const tsxBin = join(ROOT, "node_modules/.bin/tsx");
    if (existsSync(tsxBin)) return exec(tsxBin, [filePath], cwd);
    return exec("npx", ["tsx", filePath], cwd);
  }
}

async function runBunTest(testPath: string, cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    return await exec("bun", ["test", testPath], cwd);
  } catch (e: any) {
    const vitestBin = join(ROOT, "node_modules/.bin/vitest");
    if (existsSync(vitestBin)) return exec(vitestBin, ["run", testPath], cwd);
    return exec("npx", ["vitest", "run", testPath], cwd);
  }
}

// --- path containment ---
function isPathSafe(input: string, baseDir: string): { safe: boolean; resolved: string; reason?: string } {
  if (isAbsolute(input)) return { safe: false, resolved: resolve(input), reason: "absolute path not allowed" };
  const normalized = normalize(input);
  // reject if normalized contains .. that would escape after resolve
  const resolved = resolve(baseDir, input);
  const baseResolved = resolve(baseDir);
  const rel = relative(baseResolved, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { safe: false, resolved, reason: `path escapes base: ${input} -> ${resolved}` };
  }
  if (input.includes("\0")) return { safe: false, resolved, reason: "null byte" };
  return { safe: true, resolved };
}

function validatePaths(manifest: Manifest, caseId: string): string[] {
  const errors: string[] = [];
  const caseDir = join(CASES_DIR, caseId);
  const repoDir = join(REPOS_DIR, manifest.repository);

  for (const f of manifest.buggyFiles ?? []) {
    const r = isPathSafe(f, repoDir);
    if (!r.safe) errors.push(`buggyFiles unsafe: ${f} — ${r.reason}`);
    if (f.startsWith("/") ) errors.push(`buggyFiles must be relative: ${f}`);
  }
  for (const f of manifest.fixFiles ?? []) {
    const r = isPathSafe(f, repoDir);
    if (!r.safe) errors.push(`fixFiles unsafe: ${f} — ${r.reason}`);
  }
  for (const key of ["reproduction", "oracle", "regression"] as const) {
    const p = (manifest.verification as any)[key] as string;
    if (!p) continue;
    // verification paths are relative to case dir, except regression may be "bun test tests/" style?
    // For our benchmark they are like "public/reproduce.ts", "private/oracle.test.ts", "bun test tests/"
    // We check if it looks like a path (contains /) and not a command
    if (p.includes("..") || isAbsolute(p)) {
      // allow "bun test tests/" — it contains spaces, not a path traversal
      if (!p.startsWith("bun ")) {
        const r = isPathSafe(p, caseDir);
        if (!r.safe) errors.push(`verification.${key} unsafe: ${p} — ${r.reason}`);
      }
    }
  }
  // also check that reproduction/oracle files when resolved stay inside caseDir
  for (const key of ["reproduction", "oracle"] as const) {
    const p = (manifest.verification as any)[key] as string;
    if (!p) continue;
    const r = isPathSafe(p, caseDir);
    if (!r.safe) errors.push(`verification.${key} escapes case dir: ${p}`);
  }
  return errors;
}

function validateManifestStructure(manifest: any, caseId: string): string[] {
  const errors: string[] = [];
  if (!manifest) { errors.push("manifest empty"); return errors; }
  if (manifest.id !== caseId) errors.push(`manifest id mismatch: ${manifest.id} vs dir ${caseId}`);
  if (!["historical", "synthetic"].includes(manifest.type)) errors.push(`invalid type ${manifest.type}`);
  if (!["task-manager", "money-utils", "async-queue", "cac", "defu", "tinyspy", "mri", "yocto-queue", "p-limit"].includes(manifest.repository)) {
    if (typeof manifest.repository !== "string" || manifest.repository.length === 0) errors.push(`invalid repository ${manifest.repository}`);
  }
  if (!["easy", "medium", "hard"].includes(manifest.difficulty)) errors.push(`invalid difficulty ${manifest.difficulty}`);
  if (!Array.isArray(manifest.categories) || manifest.categories.length === 0) errors.push("categories empty");
  if (typeof manifest.description !== "string" || manifest.description.length === 0) errors.push("description missing");
  if (!manifest.provenance || typeof manifest.provenance.sourceUrl !== "string") errors.push("provenance.sourceUrl missing");
  if (!manifest.provenance.license) errors.push("provenance.license missing");
  if (!manifest.runtime || !manifest.runtime.bun || !manifest.runtime.node) errors.push("runtime missing");
  if (!manifest.verification || !manifest.verification.reproduction || !manifest.verification.oracle) errors.push("verification missing");
  if (!Array.isArray(manifest.buggyFiles) || manifest.buggyFiles.length === 0) errors.push("buggyFiles empty");
  // pattern for id
  if (!/^(hist|synth)-[0-9]{3}$/.test(manifest.id)) errors.push(`id pattern invalid: ${manifest.id}`);
  return errors;
}

async function computeFingerprint(caseIds: string[]): Promise<string> {
  const hash = createHash("sha256");
  // Sort caseIds for determinism
  const sorted = [...caseIds].sort();
  for (const id of sorted) {
    const manifestPath = join(CASES_DIR, id, "manifest.json");
    const manifestContent = await readFile(manifestPath, "utf-8").catch(() => "");
    hash.update(manifestContent);
    // issue.md (agent-visible) and provenance.md (evaluator provenance) — both affect benchmark identity
    const issueContent = await readFile(join(CASES_DIR, id, "issue.md"), "utf-8").catch(() => "");
    hash.update(issueContent);
    const provenanceContent = await readFile(join(CASES_DIR, id, "provenance.md"), "utf-8").catch(() => "");
    hash.update(provenanceContent);
    // buggy files
    let buggyFiles: string[] = [];
    try {
      const m = JSON.parse(manifestContent) as Manifest;
      buggyFiles = m.buggyFiles ?? [];
    } catch {}
    for (const f of buggyFiles) {
      const p = join(CASES_DIR, id, "artifacts/buggy", f);
      const c = await readFile(p, "utf-8").catch(() => "");
      hash.update(c);
    }
    // oracle
    const oraclePath = join(CASES_DIR, id, "private/oracle.test.ts");
    const oracleContent = await readFile(oraclePath, "utf-8").catch(() => "");
    hash.update(oracleContent);
    // reproduce
    const reproPath = join(CASES_DIR, id, "public/reproduce.ts");
    const reproContent = await readFile(reproPath, "utf-8").catch(() => "");
    hash.update(reproContent);
  }
  // include schema
  const schemaContent = await readFile(SCHEMA_PATH, "utf-8").catch(() => "");
  hash.update(schemaContent);
  // include repo known-good file hashes for fingerprint stability (optional)
  for (const repo of ["task-manager", "money-utils", "async-queue", "cac", "defu", "tinyspy", "mri"]) {
    const repoFilesMap: Record<string, string[]> = {
      "task-manager": ["src/task-manager.ts", "src/utils.ts", "src/validators.ts"],
      "money-utils": ["src/money.ts"],
      "async-queue": ["src/queue.ts"],
      "cac": ["src/CAC.ts"],
      "defu": ["src/defu.ts"],
      "tinyspy": ["src/spyOn.ts"],
      "mri": ["lib/index.js"],
    };
    const files = repoFilesMap[repo] ?? [];
    for (const rel of files) {
      const f = join(REPOS_DIR, repo, rel);
      const c = await readFile(f, "utf-8").catch(() => "");
      if (c) hash.update(c);
    }
  }
  return `sha256:${hash.digest("hex")}`;
}

async function createTempWorkspace(caseId: string, repository: string, buggy: boolean): Promise<{ tmpRoot: string; cleanup: () => void }> {
  const tmpRoot = await mkdtemp(join(tmpdir(), `bench-${caseId}-`));
  const cleanup = () => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
  };
  // Copy benchmark structure needed for relative imports
  // tmpRoot/benchmark/repositories/<repo>
  // tmpRoot/benchmark/cases/<id>
  const destBenchmark = join(tmpRoot, "benchmark");
  const destRepos = join(destBenchmark, "repositories", repository);
  const destCase = join(destBenchmark, "cases", caseId);
  // Use cpSync to copy
  cpSync(join(REPOS_DIR, repository), destRepos, { recursive: true });
  cpSync(join(CASES_DIR, caseId), destCase, { recursive: true });
  // Also need schema for potential validation? Not needed at runtime but okay
  // Copy package.json and bun.lock for bun resolution? Not strictly needed since bun:test is built-in
  // But copy if oracle imports from elsewhere
  if (buggy) {
    // overlay buggy files onto temp repo
    const manifestRaw = await readFile(join(CASES_DIR, caseId, "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw) as Manifest;
    for (const f of manifest.buggyFiles) {
      const src = join(CASES_DIR, caseId, "artifacts/buggy", f);
      const dest = join(destRepos, f);
      // ensure dest dir exists
      const { mkdirSync } = await import("node:fs");
      const { dirname } = await import("node:path");
      mkdirSync(dirname(dest), { recursive: true });
      await copyFile(src, dest);
    }
  }
  return { tmpRoot, cleanup };
}

async function validateCase(caseId: string): Promise<{ id: string; valid: boolean; errors: string[]; details: string }> {
  const errors: string[] = [];
  const manifestPath = join(CASES_DIR, caseId, "manifest.json");
  let manifest: Manifest | null = null;
  try {
    const raw = await readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw) as Manifest;
  } catch (e: any) {
    return { id: caseId, valid: false, errors: [`manifest read/parse failed: ${e.message}`], details: "" };
  }

  // structural validation
  errors.push(...validateManifestStructure(manifest, caseId));
  errors.push(...validatePaths(manifest, caseId));

  // check repo exists
  const repoPath = join(REPOS_DIR, manifest.repository);
  try {
    await stat(repoPath);
  } catch {
    errors.push(`repository not found: ${repoPath}`);
    return { id: caseId, valid: false, errors, details: "" };
  }
  // check buggy artifacts exist in original (before temp)
  for (const f of manifest.buggyFiles) {
    const p = join(CASES_DIR, caseId, "artifacts/buggy", f);
    if (!existsSync(p)) errors.push(`buggy artifact missing: ${p}`);
    const repoFile = join(REPOS_DIR, manifest.repository, f);
    if (!existsSync(repoFile)) errors.push(`repo file missing: ${repoFile}`);
  }
  if (errors.length > 0) return { id: caseId, valid: false, errors, details: "" };

  const reproRelative = manifest.verification.reproduction; // e.g., public/reproduce.ts
  const oracleRelative = manifest.verification.oracle; // e.g., private/oracle.test.ts
  const reproPathInTemp = join("benchmark/cases", caseId, reproRelative);
  const oraclePathInTemp = join("benchmark/cases", caseId, oracleRelative);
  const regressionPathInTemp = join("benchmark/repositories", manifest.repository, "tests");

  // check reproduction/oracle exist in original (via temp paths)
  const reproOrig = join(CASES_DIR, caseId, reproRelative);
  const oracleOrig = join(CASES_DIR, caseId, oracleRelative);
  if (!existsSync(reproOrig)) errors.push(`reproduction not found: ${reproOrig}`);
  if (!existsSync(oracleOrig)) errors.push(`oracle not found: ${oracleOrig}`);
  if (errors.length > 0) return { id: caseId, valid: false, errors, details: "" };

  let details = "";

  // Helper to run with temp workspace
  const runWithTemp = async (buggy: boolean, fn: (tmpRoot: string) => Promise<{ code: number; stdout: string; stderr: string }>): Promise<{ code: number; stdout: string; stderr: string } | null> => {
    const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest!.repository, buggy);
    try {
      return await fn(tmpRoot);
    } finally {
      cleanup();
    }
  };

  try {
    // --- buggy reproduction 3x ---
    let buggyFailsConsistently = true;
    for (let i = 0; i < 3; i++) {
      const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest.repository, true);
      try {
        const r = await runBunFile(reproPathInTemp, tmpRoot);
        if (r.code === 0) {
          buggyFailsConsistently = false;
          details += `buggy repro run ${i + 1}: unexpectedly passed. stdout: ${r.stdout.slice(0, 300)}\n`;
          break;
        }
        details += `buggy repro run ${i + 1}: correctly failed (code ${r.code})\n`;
      } finally {
        cleanup();
      }
    }
    if (!buggyFailsConsistently) errors.push("buggy state did not reproduce failure consistently (3x)");

    // --- good reproduction 3x ---
    let goodPassesConsistently = true;
    for (let i = 0; i < 3; i++) {
      const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest.repository, false);
      try {
        const r = await runBunFile(reproPathInTemp, tmpRoot);
        if (r.code !== 0) {
          goodPassesConsistently = false;
          details += `good repro run ${i + 1}: failed (should pass). stdout: ${r.stdout.slice(0, 300)} stderr: ${r.stderr.slice(0, 300)}\n`;
          break;
        }
        details += `good repro run ${i + 1}: correctly passed\n`;
      } finally {
        cleanup();
      }
    }
    if (!goodPassesConsistently) errors.push("known-good state did not pass reproduction (3x)");

    // --- oracle on good 3x ---
    let oracleGoodPasses = true;
    for (let i = 0; i < 3; i++) {
      const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest.repository, false);
      try {
        const r = await runBunTest(oraclePathInTemp, tmpRoot);
        if (r.code !== 0) {
          oracleGoodPasses = false;
          details += `oracle good run ${i + 1}: failed. stdout: ${r.stdout.slice(0, 500)} stderr: ${r.stderr.slice(0, 500)}\n`;
          break;
        }
        details += `oracle good run ${i + 1}: passed\n`;
      } finally {
        cleanup();
      }
    }
    if (!oracleGoodPasses) errors.push(`oracle failed on good state (3x)`);

    // --- oracle on buggy 3x (expect fail) ---
    let oracleBuggyFailsConsistently = true; // should fail all 3
    for (let i = 0; i < 3; i++) {
      const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest.repository, true);
      try {
        const r = await runBunTest(oraclePathInTemp, tmpRoot);
        if (r.code === 0) {
          oracleBuggyFailsConsistently = false;
          details += `oracle buggy run ${i + 1}: unexpectedly passed (should fail)\n`;
          break;
        }
        details += `oracle buggy run ${i + 1}: correctly failed\n`;
      } finally {
        cleanup();
      }
    }
    if (!oracleBuggyFailsConsistently) errors.push(`oracle unexpectedly passed on buggy state (3x)`);

    // --- regression on good (once, but could be 3x) ---
    {
      const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest.repository, false);
      try {
        const r = await runBunTest(regressionPathInTemp, tmpRoot);
        if (r.code !== 0) {
          errors.push(`regression tests failed on good state: ${r.stdout.slice(0, 800)} ${r.stderr.slice(0, 800)}`);
        } else {
          details += `regression passed\n`;
        }
      } finally {
        cleanup();
      }
    }

    // --- final stability: one more good repro ---
    {
      const { tmpRoot, cleanup } = await createTempWorkspace(caseId, manifest.repository, false);
      try {
        const r = await runBunFile(reproPathInTemp, tmpRoot);
        if (r.code !== 0) errors.push("final stability reproduction failed");
        else details += `final stability passed\n`;
      } finally {
        cleanup();
      }
    }

  } catch (e: any) {
    errors.push(`exception during validation: ${e.message}`);
  }

  return { id: caseId, valid: errors.length === 0, errors, details };
}

async function main() {
  console.log("Benchmark Validation v0.4 (isolated, bun-first → vitest/tsx fallback)");
  console.log("==============================================================\n");
  let caseIds: string[] = [];
  try {
    const entries = await readdir(CASES_DIR, { withFileTypes: true });
    caseIds = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch (e: any) {
    console.error(`Failed to list cases: ${e.message}`);
    process.exit(1);
  }

  if (caseIds.length === 0) {
    console.log("No cases found in benchmark/cases/");
    process.exit(1);
  }

  const fingerprint = await computeFingerprint(caseIds);
  console.log(`Benchmark fingerprint: ${fingerprint}\n`);

  const results: { id: string; valid: boolean; errors: string[]; details: string }[] = [];
  for (const c of caseIds) {
    process.stdout.write(`Validating ${c} ... `);
    const res = await validateCase(c);
    results.push(res);
    if (res.valid) {
      console.log(`✓ VALID`);
    } else {
      console.log(`✗ REJECTED`);
      for (const err of res.errors) console.log(`  - ${err}`);
    }
  }

  console.log("\nSummary");
  console.log("-------");
  const validCount = results.filter((r) => r.valid).length;
  for (const r of results) {
    const mark = r.valid ? "✓ VALID" : "✗ REJECTED";
    console.log(`${r.id.padEnd(12)} ${mark}${r.valid ? "" : " — " + r.errors.join("; ")}`);
  }
  console.log(`\n${validCount}/${results.length} cases valid`);
  console.log(`Fingerprint: ${fingerprint}`);
  console.log(`Stability: reproduction 3×, oracle 3× per state (good/buggy), regression 1×, final stability 1×`);
  if (validCount !== results.length) {
    console.log("Some cases failed validation. See details above.");
  }

  const report = {
    benchmarkVersion: "0.4",
    fingerprint,
    timestamp: new Date().toISOString(),
    total: results.length,
    valid: validCount,
    stability: { reproduction: "3x", oracle: "3x per state", regression: "1x" },
    cases: results.map((r) => ({ id: r.id, valid: r.valid, errors: r.errors })),
  };
  const reportPath = join(ROOT, "benchmark/validation-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport written to ${reportPath}`);

  process.exit(validCount === results.length ? 0 : 1);
}

main();
