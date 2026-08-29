#!/usr/bin/env bun
/**
 * Benchmark Validator v0.5 (bun-first, vitest/tsx fallback)
 * - Supports Core (benchmark/cases + benchmark/repositories) and Frontier-Hard (benchmark/frontier-hard/cases + benchmark/frontier-hard/repositories)
 * - Temp workspace isolation (no live repo mutation)
 * - Path containment via resolved-path check
 * - Exec settle guard
 * - 3x oracle stability
 * - Manifest schema validation (manual, mirrors schema)
 * - Benchmark fingerprint (sha256) unified v0.5
 * - Runner: bun (primary) → vitest/tsx fallback
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
const CASES_DIR_HARD = join(ROOT, "benchmark/frontier-hard/cases");
const REPOS_DIR_HARD = join(ROOT, "benchmark/frontier-hard/repositories");
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

// Helpers to resolve case/repo dirs (additive structure)
function resolveCaseDir(caseId: string): string {
  // hard-xxx lives under frontier-hard/cases
  if (caseId.startsWith("hard-")) {
    const hard = join(CASES_DIR_HARD, caseId);
    if (existsSync(hard)) return hard;
    // fallback to core (should not happen)
    return hard;
  }
  // core cases live under benchmark/cases
  const core = join(CASES_DIR, caseId);
  if (existsSync(core)) return core;
  // fallback check hard (in case of misclassification)
  const alt = join(CASES_DIR_HARD, caseId);
  if (existsSync(alt)) return alt;
  return core;
}

function resolveRepoDir(repo: string): string {
  // Check frontier-hard repositories first for hard-case repos, then core
  const hard = join(REPOS_DIR_HARD, repo);
  if (existsSync(hard)) return hard;
  const core = join(REPOS_DIR, repo);
  if (existsSync(core)) return core;
  // default to hard path (for creation)
  return hard;
}

function isHardCase(caseId: string): boolean {
  return caseId.startsWith("hard-");
}

// --- exec with settle guard ---
function exec(cmd: string, args: string[], cwd: string, timeout = 15000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveP, reject) => {
    let settled = false;
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_PATH: join(ROOT, "node_modules") } });
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
  let bunResult: { code: number; stdout: string; stderr: string } | null = null;
  try {
    bunResult = await exec("bun", ["run", filePath], cwd);
  } catch (e: any) {
    // Spawn failed (bun not installed) → fallback to tsx
    const tsxBin = join(ROOT, "node_modules/.bin/tsx");
    if (existsSync(tsxBin)) return exec(tsxBin, [filePath], cwd);
    return exec("npx", ["tsx", filePath], cwd);
  }
  // If bun failed due to TypeScript ESM incompatibility (e.g., immer's `export 'Draft' not found`), fallback to tsx for correctness
  if (bunResult && bunResult.code !== 0 && (bunResult.stderr.includes("SyntaxError") || bunResult.stderr.includes("not found in") || bunResult.stderr.includes("Cannot find package"))) {
    const tsxBin = join(ROOT, "node_modules/.bin/tsx");
    if (existsSync(tsxBin)) {
      const fallback = await exec(tsxBin, [filePath], cwd);
      // Prefer fallback if it succeeded or has different error; otherwise return original
      // If tsx also fails, return whichever is more informative; prioritize tsx for TS handling
      if (fallback.code === 0 || !fallback.stderr.includes("not found in")) return fallback;
    } else {
      const fallback = await exec("npx", ["tsx", filePath], cwd);
      if (fallback.code === 0) return fallback;
    }
  }
  return bunResult!;
}

async function runBunTest(testPath: string, cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  let bunResult: { code: number; stdout: string; stderr: string } | null = null;
  try {
    bunResult = await exec("bun", ["test", testPath], cwd);
  } catch (e: any) {
    const vitestBin = join(ROOT, "node_modules/.bin/vitest");
    if (existsSync(vitestBin)) return exec(vitestBin, ["run", testPath], cwd);
    return exec("npx", ["vitest", "run", testPath], cwd);
  }
  // Fallback to vitest if bun failed due to TS/ESM incompatibility (e.g., type-only imports)
  if (bunResult && bunResult.code !== 0 && (bunResult.stderr.includes("SyntaxError") || bunResult.stderr.includes("not found in") || bunResult.stderr.includes("Cannot find package") )) {
    // Ensure the file exists in this temp workspace before falling back; vitest will handle explicit path
    const vitestBin = join(ROOT, "node_modules/.bin/vitest");
    if (existsSync(vitestBin)) {
      const fallback = await exec(vitestBin, ["run", testPath], cwd);
      // Prefer vitest result when bun had compilation error
      return fallback;
    }
    return exec("npx", ["vitest", "run", testPath], cwd);
  }
  return bunResult!;
}

// --- path containment ---
function isPathSafe(input: string, baseDir: string): { safe: boolean; resolved: string; reason?: string } {
  if (isAbsolute(input)) return { safe: false, resolved: resolve(input), reason: "absolute path not allowed" };
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
  const caseDir = resolveCaseDir(caseId);
  const repoDir = resolveRepoDir(manifest.repository);

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
    if (p.includes("..") || isAbsolute(p)) {
      if (!p.startsWith("bun ")) {
        const r = isPathSafe(p, caseDir);
        if (!r.safe) errors.push(`verification.${key} unsafe: ${p} — ${r.reason}`);
      }
    }
  }
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
  if (typeof manifest.repository !== "string" || manifest.repository.length === 0) errors.push(`invalid repository ${manifest.repository}`);
  if (!["easy", "medium", "hard", "frontier-hard"].includes(manifest.difficulty)) errors.push(`invalid difficulty ${manifest.difficulty}`);
  if (!Array.isArray(manifest.categories) || manifest.categories.length === 0) errors.push("categories empty");
  if (typeof manifest.description !== "string" || manifest.description.length === 0) errors.push("description missing");
  if (!manifest.provenance || typeof manifest.provenance.sourceUrl !== "string") errors.push("provenance.sourceUrl missing");
  if (!manifest.provenance.license) errors.push("provenance.license missing");
  if (!manifest.runtime || !manifest.runtime.bun || !manifest.runtime.node) errors.push("runtime missing");
  if (!manifest.verification || !manifest.verification.reproduction || !manifest.verification.oracle) errors.push("verification missing");
  if (!Array.isArray(manifest.buggyFiles) || manifest.buggyFiles.length === 0) errors.push("buggyFiles empty");
  if (!/^(hist|synth|hard)-[0-9]{3}$/.test(manifest.id)) errors.push(`id pattern invalid: ${manifest.id}`);
  return errors;
}

async function computeFingerprint(caseIds: string[]): Promise<string> {
  const hash = createHash("sha256");
  const sorted = [...caseIds].sort();
  for (const id of sorted) {
    const caseDir = resolveCaseDir(id);
    const manifestPath = join(caseDir, "manifest.json");
    const manifestContent = await readFile(manifestPath, "utf-8").catch(() => "");
    hash.update(manifestContent);
    const issueContent = await readFile(join(caseDir, "issue.md"), "utf-8").catch(() => "");
    hash.update(issueContent);
    const provenanceContent = await readFile(join(caseDir, "provenance.md"), "utf-8").catch(() => "");
    hash.update(provenanceContent);
    let buggyFiles: string[] = [];
    try {
      const m = JSON.parse(manifestContent) as Manifest;
      buggyFiles = m.buggyFiles ?? [];
    } catch {}
    for (const f of buggyFiles) {
      const p = join(caseDir, "artifacts/buggy", f);
      const c = await readFile(p, "utf-8").catch(() => "");
      hash.update(c);
    }
    const oraclePath = join(caseDir, "private/oracle.test.ts");
    const oracleContent = await readFile(oraclePath, "utf-8").catch(() => "");
    hash.update(oracleContent);
    const reproPath = join(caseDir, "public/reproduce.ts");
    const reproContent = await readFile(reproPath, "utf-8").catch(() => "");
    hash.update(reproContent);
    const curatorPath = join(caseDir, "curator-notes.md");
    const curatorContent = await readFile(curatorPath, "utf-8").catch(() => "");
    // curator notes are not agent-visible but affect benchmark identity if they document hardness? We hash them for completeness but they are not evaluator-critical. Include for stability.
    // Actually do NOT hash curator-notes to avoid leaking? But spec says fingerprint must include all benchmark-defining artifacts (manifest, issue, provenance, buggy, oracle, reproduce, repo snapshots, schema). Curator notes are maintainer-only, not defining verification, so we skip hashing them to keep fingerprint stable if notes edited. So we do not update hash with curatorContent.
  }
  const schemaContent = await readFile(SCHEMA_PATH, "utf-8").catch(() => "");
  hash.update(schemaContent);
  // include repo known-good file hashes for fingerprint stability
  // List all repos from both roots
  const allRepos: string[] = [];
  try {
    const coreRepos = await readdir(REPOS_DIR, { withFileTypes: true }).then(e => e.filter(x=>x.isDirectory()).map(x=>x.name)).catch(()=>[]);
    allRepos.push(...coreRepos);
  } catch {}
  try {
    const hardRepos = await readdir(REPOS_DIR_HARD, { withFileTypes: true }).then(e => e.filter(x=>x.isDirectory()).map(x=>x.name)).catch(()=>[]);
    for (const r of hardRepos) if (!allRepos.includes(r)) allRepos.push(r);
  } catch {}
  allRepos.sort();
  for (const repo of allRepos) {
    const repoDir = resolveRepoDir(repo);
    // Hash key files if they exist; otherwise hash all files recursively? For stability we hash a few key known files per repo type
    // For generic repos, hash package.json + key source files via listing
    const keyCandidates: Record<string, string[]> = {
      "task-manager": ["src/task-manager.ts", "src/utils.ts", "src/validators.ts"],
      "money-utils": ["src/money.ts"],
      "async-queue": ["src/queue.ts"],
      "cac": ["src/CAC.ts"],
      "defu": ["src/defu.ts"],
      "tinyspy": ["src/spyOn.ts"],
      "mri": ["lib/index.js"],
      // hard repos - enumerate common src files
      "immer": ["src/core/proxy.ts", "src/plugins/arrayMethods.ts", "src/immer.ts", "src/core/finalize.ts"],
      "qs": ["lib/parse.js", "lib/stringify.js", "lib/utils.js"],
      "superjson": ["src/plainer.ts", "src/pathstringifier.ts", "src/transformer.ts", "src/index.ts"],
      "p-queue": ["source/index.ts", "source/priority-queue.ts", "source/queue.ts"],
      "path-to-regexp": ["src/index.ts"],
    };
    const files = keyCandidates[repo] ?? ["package.json"];
    for (const rel of files) {
      const f = join(repoDir, rel);
      const c = await readFile(f, "utf-8").catch(() => "");
      if (c) hash.update(c);
    }
    // Also hash package.json version for extra identity
    const pkg = await readFile(join(repoDir, "package.json"), "utf-8").catch(()=> "");
    if (pkg) hash.update(pkg);
  }
  return `sha256:${hash.digest("hex")}`;
}

async function createTempWorkspace(caseId: string, repository: string, buggy: boolean): Promise<{ tmpRoot: string; cleanup: () => void }> {
  const tmpRoot = await mkdtemp(join(tmpdir(), `bench-${caseId}-`));
  const cleanup = () => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
  };
  const caseDir = resolveCaseDir(caseId);
  const repoDir = resolveRepoDir(repository);
  // Copy benchmark structure needed for relative imports
  // Unified temp layout: tmpRoot/benchmark/repositories/<repo> + tmpRoot/benchmark/cases/<id>
  // This keeps ../../../repositories/... relative imports working for both core and hard cases
  const destBenchmark = join(tmpRoot, "benchmark");
  const destRepos = join(destBenchmark, "repositories", repository);
  const destCase = join(destBenchmark, "cases", caseId);
  // Also support frontier-hard path for completeness (copy to both)
  const destHardCase = join(tmpRoot, "benchmark/frontier-hard/cases", caseId);
  const destHardRepos = join(tmpRoot, "benchmark/frontier-hard/repositories", repository);

  try {
    if (!existsSync(repoDir)) throw new Error(`Repository not found: ${repository} at ${repoDir}`);
    if (!existsSync(caseDir)) throw new Error(`Case not found: ${caseId} at ${caseDir}`);
    cpSync(repoDir, destRepos, { recursive: true });
    // also copy to hard path for agents that might resolve via frontier-hard
    try { cpSync(repoDir, destHardRepos, { recursive: true }); } catch {}
    cpSync(caseDir, destCase, { recursive: true });
    try { cpSync(caseDir, destHardCase, { recursive: true }); } catch {}

    if (buggy) {
      const manifestRaw = await readFile(join(caseDir, "manifest.json"), "utf-8");
      const manifest = JSON.parse(manifestRaw) as Manifest;
      for (const f of manifest.buggyFiles) {
        const src = join(caseDir, "artifacts/buggy", f);
        const dest = join(destRepos, f);
        const dest2 = join(destHardRepos, f);
        const { mkdirSync } = await import("node:fs");
        const { dirname } = await import("node:path");
        mkdirSync(dirname(dest), { recursive: true });
        await copyFile(src, dest);
        try { mkdirSync(dirname(dest2), { recursive: true }); await copyFile(src, dest2); } catch {}
      }
    }
    return { tmpRoot, cleanup };
  } catch (e) {
    cleanup();
    throw e;
  }
}

async function validateCase(caseId: string): Promise<{ id: string; valid: boolean; errors: string[]; details: string }> {
  const errors: string[] = [];
  const caseDir = resolveCaseDir(caseId);
  const manifestPath = join(caseDir, "manifest.json");
  let manifest: Manifest | null = null;
  try {
    const raw = await readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw) as Manifest;
  } catch (e: any) {
    return { id: caseId, valid: false, errors: [`manifest read/parse failed: ${e.message}`], details: "" };
  }

  errors.push(...validateManifestStructure(manifest, caseId));
  errors.push(...validatePaths(manifest, caseId));

  const repoPath = resolveRepoDir(manifest.repository);
  try {
    await stat(repoPath);
  } catch {
    errors.push(`repository not found: ${repoPath}`);
    return { id: caseId, valid: false, errors, details: "" };
  }
  for (const f of manifest.buggyFiles) {
    const p = join(caseDir, "artifacts/buggy", f);
    if (!existsSync(p)) errors.push(`buggy artifact missing: ${p}`);
    const repoFile = join(repoPath, f);
    if (!existsSync(repoFile)) errors.push(`repo file missing: ${repoFile}`);
  }
  if (errors.length > 0) return { id: caseId, valid: false, errors, details: "" };

  const reproRelative = manifest.verification.reproduction;
  const oracleRelative = manifest.verification.oracle;
  const reproPathInTemp = join("benchmark/cases", caseId, reproRelative);
  const oraclePathInTemp = join("benchmark/cases", caseId, oracleRelative);
  const regressionPathInTemp = join("benchmark/repositories", manifest.repository, "tests");

  const reproOrig = join(caseDir, reproRelative);
  const oracleOrig = join(caseDir, oracleRelative);
  if (!existsSync(reproOrig)) errors.push(`reproduction not found: ${reproOrig}`);
  if (!existsSync(oracleOrig)) errors.push(`oracle not found: ${oracleOrig}`);
  if (errors.length > 0) return { id: caseId, valid: false, errors, details: "" };

  let details = "";

  try {
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

    let oracleBuggyFailsConsistently = true;
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

async function listAllCases(): Promise<string[]> {
  const all: string[] = [];
  try {
    const coreEntries = await readdir(CASES_DIR, { withFileTypes: true });
    for (const e of coreEntries) if (e.isDirectory()) all.push(e.name);
  } catch {}
  try {
    const hardEntries = await readdir(CASES_DIR_HARD, { withFileTypes: true });
    for (const e of hardEntries) if (e.isDirectory()) all.push(e.name);
  } catch {}
  return all.sort();
}

async function main() {
  console.log("Benchmark Validation v0.5 (isolated, bun-first → vitest/tsx fallback)");
  console.log("==============================================================\n");
  const caseIds = await listAllCases();

  if (caseIds.length === 0) {
    console.log("No cases found in benchmark/cases/ + benchmark/frontier-hard/cases/");
    process.exit(1);
  }

  const fingerprint = await computeFingerprint(caseIds);
  console.log(`Benchmark fingerprint: ${fingerprint}\n`);
  const coreCount = caseIds.filter(c => !c.startsWith("hard-")).length;
  const hardCount = caseIds.filter(c => c.startsWith("hard-")).length;
  console.log(`Core: ${coreCount} cases, Frontier-Hard: ${hardCount} cases, Total: ${caseIds.length}\n`);

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
    benchmarkVersion: "0.5",
    fingerprint,
    timestamp: new Date().toISOString(),
    total: results.length,
    valid: validCount,
    stability: { reproduction: "3x", oracle: "3x per state", regression: "1x" },
    cases: results.map((r) => ({ id: r.id, valid: r.valid, errors: r.errors })),
  };
  const reportPath = join(ROOT, "benchmark/validation-report.json");
  // Preserve v0.4 report if not already preserved
  const v04Path = join(ROOT, "benchmark/validation-report.v0.4.json");
  if (!existsSync(v04Path) && existsSync(reportPath)) {
    try {
      const old = await readFile(reportPath, "utf-8");
      const oldJson = JSON.parse(old) as any;
      if (oldJson.benchmarkVersion === "0.4") {
        await writeFile(v04Path, old, "utf-8");
      }
    } catch {}
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport written to ${reportPath}`);

  process.exit(validCount === results.length ? 0 : 1);
}

main();
