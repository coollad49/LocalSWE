import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { copyFile, readFile, mkdtemp } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execDeterministic } from "./exec.ts";
import { validatePatchContentPaths } from "./patchValidator.ts";
import type { VerificationStageResult } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const REPOS_DIR = join(ROOT, "benchmark/repositories");

export interface TempWorkspace {
  tmpRoot: string;
  repoPath: string; // benchmark/repositories/<repo> inside tmpRoot
  caseId: string;
  repository: string;
  cleanup: () => Promise<{ error?: string }>;
}

/**
 * Create isolated temporary workspace.
 * Reuses validator isolation patterns: mkdtemp + cpSync.
 * Structure: tmpRoot/benchmark/repositories/<repo> + benchmark/cases/<id>
 * This ensures relative imports "../../../repositories/..." work without rewriting.
 * Returns repoPath for patch application.
 */
export async function createIsolatedWorkspace(caseId: string, repository: string): Promise<TempWorkspace> {
  const tmpRoot = await mkdtemp(join(tmpdir(), `frontier-eval-${caseId}-`));

  const cleanup = async (): Promise<{ error?: string }> => {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
      return {};
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  try {
    const destBenchmark = join(tmpRoot, "benchmark");
    const destRepos = join(destBenchmark, "repositories", repository);
    const destCase = join(destBenchmark, "cases", caseId);

    // Copy repository (known-good state)
    const srcRepo = join(REPOS_DIR, repository);
    if (!existsSync(srcRepo)) {
      throw new Error(`Repository not found: ${repository} at ${srcRepo}`);
    }
    cpSync(srcRepo, destRepos, { recursive: true, filter: (src) => !src.includes(".git") });

    // Copy case
    const srcCase = join(CASES_DIR, caseId);
    if (!existsSync(srcCase)) {
      throw new Error(`Case not found: ${caseId} at ${srcCase}`);
    }
    cpSync(srcCase, destCase, { recursive: true });

    // Ensure tmpRoot has minimal structure for running commands (package.json not needed for repo execution)
    // But keep tmpRoot as cwd so benchmark/... relative paths work.

    return { tmpRoot, repoPath: destRepos, caseId, repository, cleanup };
  } catch (e) {
    await cleanup().catch(() => {});
    throw e;
  }
}

export interface PatchApplyResult extends VerificationStageResult {
  applied: boolean;
}

/**
 * Apply patch deterministically inside isolated repo.
 * Steps:
 * 1. Validate patch content paths (traversal etc)
 * 2. If patch empty, treat as no-op but record.
 * 3. Attempt git apply --check then git apply
 * 4. Fallback to patch -p1 if git not available
 */
export async function applyPatchIsolated(options: {
  patchContent: string;
  repoPath: string;
  tmpRoot: string;
  timeoutMs?: number;
}): Promise<PatchApplyResult> {
  const { patchContent, repoPath, timeoutMs = 10000 } = options;
  const commandString = `git apply --check + git apply in ${repoPath}`;

  if (!patchContent.trim()) {
    // Empty patch: no changes, but we still consider applied (will likely fail reproduction)
    return {
      status: "passed",
      durationMs: 0,
      command: commandString,
      stdout: "empty patch - no changes applied",
      stderr: "",
      exitCode: 0,
      applied: true,
    };
  }

  // Validate paths inside patch
  const validation = validatePatchContentPaths(patchContent);
  if (!validation.valid) {
    return {
      status: "error",
      durationMs: 0,
      command: commandString,
      stdout: "",
      stderr: validation.message ?? "Patch validation failed",
      reason: validation.code,
      exitCode: 1,
      applied: false,
    };
  }

  // Write patch to temp file inside tmpRoot for git apply
  const patchFile = join(options.tmpRoot, `patch-${Date.now()}.diff`);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(patchFile, patchContent, "utf-8");

  const start = Date.now();

  // Try git apply --check first
  const checkResult = await execDeterministic({
    command: "git",
    args: ["apply", "--check", patchFile],
    cwd: repoPath,
    timeoutMs,
    commandString: `git apply --check ${patchFile}`,
  });

  if (checkResult.timedOut) {
    return {
      status: "timeout",
      durationMs: Date.now() - start,
      command: `git apply --check ${patchFile}`,
      stdout: checkResult.stdout,
      stderr: checkResult.stderr,
      reason: "Patch apply check timed out",
      timedOut: true,
      exitCode: checkResult.code ?? undefined,
      applied: false,
    };
  }
  if (checkResult.code !== 0) {
    // Check failed - patch cannot apply cleanly
    return {
      status: "error",
      durationMs: Date.now() - start,
      command: `git apply --check ${patchFile}`,
      stdout: checkResult.stdout,
      stderr: checkResult.stderr,
      reason: `Patch cannot be applied cleanly: ${checkResult.stderr.slice(0, 500) || checkResult.stdout.slice(0, 500)}`,
      exitCode: checkResult.code ?? undefined,
      applied: false,
    };
  }

  // Now apply
  const applyResult = await execDeterministic({
    command: "git",
    args: ["apply", patchFile],
    cwd: repoPath,
    timeoutMs,
    commandString: `git apply ${patchFile}`,
  });

  const durationMs = Date.now() - start;

  if (applyResult.timedOut) {
    return {
      status: "timeout",
      durationMs,
      command: `git apply ${patchFile}`,
      stdout: applyResult.stdout,
      stderr: applyResult.stderr,
      reason: "Patch apply timed out",
      timedOut: true,
      exitCode: applyResult.code ?? undefined,
      applied: false,
    };
  }
  if (applyResult.code !== 0) {
    return {
      status: "error",
      durationMs,
      command: `git apply ${patchFile}`,
      stdout: applyResult.stdout,
      stderr: applyResult.stderr,
      reason: `git apply failed: ${applyResult.stderr.slice(0, 500)}`,
      exitCode: applyResult.code ?? undefined,
      applied: false,
    };
  }

  return {
    status: "passed",
    durationMs,
    command: `git apply ${patchFile}`,
    stdout: applyResult.stdout,
    stderr: applyResult.stderr,
    exitCode: 0,
    applied: true,
  };
}
