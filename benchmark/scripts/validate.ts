#!/usr/bin/env bun
/**
 * Benchmark Validator
 * Validates every case under benchmark/cases/
 * Checks:
 * - manifest valid
 * - repository exists
 * - buggy state reproduces (fails)
 * - known-good state passes
 * - oracle passes on good
 * - regression tests pass
 * - stability (3 runs)
 */

import { readdir, readFile, stat, copyFile } from "node:fs/promises";
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const ROOT = resolve(import.meta.dir + "/../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const REPOS_DIR = join(ROOT, "benchmark/repositories");

type Manifest = {
  id: string;
  type: string;
  repository: string;
  difficulty: string;
  categories: string[];
  verification: { reproduction: string; oracle: string; regression: string };
  buggyFiles: string[];
};

function exec(cmd: string, args: string[], cwd: string, timeout = 15000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveP, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timeout: ${cmd} ${args.join(" ")} in ${cwd}`));
    }, timeout);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveP({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function runBunFile(filePath: string, cwd: string = ROOT): Promise<{ code: number; stdout: string; stderr: string }> {
  return exec("bun", ["run", filePath], cwd);
}

async function runBunTest(testPath: string, cwd: string = ROOT): Promise<{ code: number; stdout: string; stderr: string }> {
  // run as bun test <path>
  return exec("bun", ["test", testPath], cwd);
}

function repoSrcPath(repo: string, file: string): string {
  return join(REPOS_DIR, repo, file);
}
function caseBuggyFile(caseId: string, file: string): string {
  return join(CASES_DIR, caseId, "artifacts/buggy", file);
}
function caseManifestPath(caseId: string): string {
  return join(CASES_DIR, caseId, "manifest.json");
}

async function validateCase(caseId: string): Promise<{ id: string; valid: boolean; errors: string[]; details: string }> {
  const errors: string[] = [];
  const manifestPath = caseManifestPath(caseId);
  let manifest: Manifest | null = null;
  try {
    const raw = await readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw) as Manifest;
  } catch (e: any) {
    return { id: caseId, valid: false, errors: [`manifest read/parse failed: ${e.message}`], details: "" };
  }

  // basic schema checks
  if (!manifest.id || manifest.id !== caseId) errors.push(`manifest id mismatch: ${manifest.id} vs dir ${caseId}`);
  if (!["historical", "synthetic"].includes(manifest.type)) errors.push(`invalid type ${manifest.type}`);
  if (!["task-manager", "money-utils", "async-queue"].includes(manifest.repository)) errors.push(`unknown repo ${manifest.repository}`);
  if (!Array.isArray(manifest.buggyFiles) || manifest.buggyFiles.length === 0) errors.push("buggyFiles empty");
  // check repo exists
  const repoPath = join(REPOS_DIR, manifest.repository);
  try {
    await stat(repoPath);
  } catch {
    errors.push(`repository not found: ${repoPath}`);
    return { id: caseId, valid: false, errors, details: "" };
  }
  // check buggy files exist in artifacts
  for (const f of manifest.buggyFiles) {
    const p = caseBuggyFile(caseId, f);
    if (!existsSync(p)) errors.push(`buggy artifact missing: ${p}`);
    const repoFile = repoSrcPath(manifest.repository, f);
    if (!existsSync(repoFile)) errors.push(`repo file missing: ${repoFile}`);
  }
  if (errors.length > 0) return { id: caseId, valid: false, errors, details: "" };

  // check reproduction file exists
  const reproPath = join(CASES_DIR, caseId, manifest.verification.reproduction);
  const oraclePath = join(CASES_DIR, caseId, manifest.verification.oracle);
  if (!existsSync(reproPath)) errors.push(`reproduction not found: ${reproPath}`);
  if (!existsSync(oraclePath)) errors.push(`oracle not found: ${oraclePath}`);
  if (errors.length > 0) return { id: caseId, valid: false, errors, details: "" };

  // backup original files
  const backups = new Map<string, string>();
  for (const f of manifest.buggyFiles) {
    const repoFile = repoSrcPath(manifest.repository, f);
    const content = await readFile(repoFile, "utf-8");
    backups.set(repoFile, content);
  }

  let details = "";
  try {
    // Apply buggy state
    for (const f of manifest.buggyFiles) {
      const src = caseBuggyFile(caseId, f);
      const dest = repoSrcPath(manifest.repository, f);
      await copyFile(src, dest);
    }

    // Run reproduction 3 times expecting FAIL (code 1)
    let buggyFailsConsistently = true;
    for (let i = 0; i < 3; i++) {
      const r = await runBunFile(reproPath, ROOT);
      if (r.code === 0) {
        buggyFailsConsistently = false;
        details += `buggy run ${i + 1}: unexpectedly passed (should fail). stdout: ${r.stdout}\n`;
        break;
      }
      details += `buggy run ${i + 1}: correctly failed (code ${r.code})\n`;
    }
    if (!buggyFailsConsistently) errors.push("buggy state did not reproduce failure consistently");

    // Restore to known-good before testing fix
    for (const [dest, content] of backups) {
      await import("node:fs/promises").then((m) => m.writeFile(dest, content, "utf-8"));
    }

    // Run reproduction expecting PASS (code 0) 3 times
    let goodPassesConsistently = true;
    for (let i = 0; i < 3; i++) {
      const r = await runBunFile(reproPath, ROOT);
      if (r.code !== 0) {
        goodPassesConsistently = false;
        details += `good run ${i + 1}: failed (should pass). stdout: ${r.stdout} stderr: ${r.stderr}\n`;
        break;
      }
      details += `good run ${i + 1}: correctly passed\n`;
    }
    if (!goodPassesConsistently) errors.push("known-good state did not pass reproduction");

    // Run oracle on good state
    const oracleResult = await runBunTest(oraclePath, ROOT);
    if (oracleResult.code !== 0) {
      errors.push(`oracle failed on good state: ${oracleResult.stdout.slice(0, 500)} ${oracleResult.stderr.slice(0, 500)}`);
    } else {
      details += `oracle passed on good state\n`;
    }

    // Run oracle on buggy state expecting fail (hidden tests should fail when bug present)
    for (const f of manifest.buggyFiles) {
      await copyFile(caseBuggyFile(caseId, f), repoSrcPath(manifest.repository, f));
    }
    const oracleBuggy = await runBunTest(oraclePath, ROOT);
    if (oracleBuggy.code === 0) {
      errors.push(`oracle unexpectedly passed on buggy state (should fail)`);
    } else {
      details += `oracle correctly failed on buggy state\n`;
    }
    // restore again
    for (const [dest, content] of backups) {
      await import("node:fs/promises").then((m) => m.writeFile(dest, content, "utf-8"));
    }

    // Run regression tests (repo tests)
    const repoTests = join(REPOS_DIR, manifest.repository, "tests");
    const regression = await runBunTest(repoTests, ROOT);
    if (regression.code !== 0) {
      errors.push(`regression tests failed on good state: ${regression.stdout.slice(0, 800)}`);
    } else {
      details += `regression passed\n`;
    }

    // Check stability: re-run known-good reproduce + oracle one more time
    const finalRepro = await runBunFile(reproPath, ROOT);
    if (finalRepro.code !== 0) errors.push("final stability reproduction failed");
  } catch (e: any) {
    errors.push(`exception during validation: ${e.message}`);
  } finally {
    // restore backups
    for (const [dest, content] of backups) {
      try {
        await import("node:fs/promises").then((m) => m.writeFile(dest, content, "utf-8"));
      } catch {}
    }
  }

  return { id: caseId, valid: errors.length === 0, errors, details };
}

async function main() {
  console.log("Benchmark Validation");
  console.log("====================\n");
  let cases: string[] = [];
  try {
    const entries = await readdir(CASES_DIR, { withFileTypes: true });
    cases = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch (e: any) {
    console.error(`Failed to list cases: ${e.message}`);
    process.exit(1);
  }

  if (cases.length === 0) {
    console.log("No cases found in benchmark/cases/");
    process.exit(1);
  }

  const results: { id: string; valid: boolean; errors: string[]; details: string }[] = [];
  for (const c of cases) {
    process.stdout.write(`Validating ${c} ... `);
    const res = await validateCase(c);
    results.push(res);
    if (res.valid) {
      console.log(`✓ VALID`);
    } else {
      console.log(`✗ REJECTED`);
      for (const err of res.errors) console.log(`  - ${err}`);
    }
    // Uncomment to see details: console.log(res.details)
  }

  console.log("\nSummary");
  console.log("-------");
  const validCount = results.filter((r) => r.valid).length;
  for (const r of results) {
    const mark = r.valid ? "✓ VALID" : "✗ REJECTED";
    // pad id
    console.log(`${r.id.padEnd(12)} ${mark}${r.valid ? "" : " — " + r.errors.join("; ")}`);
  }
  console.log(`\n${validCount}/${results.length} cases valid`);
  if (validCount !== results.length) {
    console.log("Some cases failed validation. See details above.");
  }

  // Write machine-readable report
  const report = {
    timestamp: new Date().toISOString(),
    total: results.length,
    valid: validCount,
    cases: results.map((r) => ({ id: r.id, valid: r.valid, errors: r.errors })),
  };
  const reportPath = join(ROOT, "benchmark/validation-report.json");
  await import("node:fs/promises").then((m) => m.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8"));
  console.log(`\nReport written to ${reportPath}`);

  process.exit(validCount === results.length ? 0 : 1);
}

main();
