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
const CASES_DIR_HARD = join(ROOT, "benchmark/frontier-hard/cases");
const REPOS_DIR_HARD = join(ROOT, "benchmark/frontier-hard/repositories");

function resolveCaseDir(caseId: string): string {
  if (caseId.startsWith("hard-")) {
    const hard = join(CASES_DIR_HARD, caseId);
    if (existsSync(hard)) return hard;
    return hard;
  }
  const core = join(CASES_DIR, caseId);
  if (existsSync(core)) return core;
  const alt = join(CASES_DIR_HARD, caseId);
  if (existsSync(alt)) return alt;
  return core;
}

function resolveRepoDir(repository: string): string {
  const hard = join(REPOS_DIR_HARD, repository);
  if (existsSync(hard)) return hard;
  const core = join(REPOS_DIR, repository);
  return core;
}

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
  const tmpRoot = await mkdtemp(join(tmpdir(), `eval-${caseId}-`));

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
    const destHardCase = join(tmpRoot, "benchmark/frontier-hard/cases", caseId);
    const destHardRepos = join(tmpRoot, "benchmark/frontier-hard/repositories", repository);

    // Resolve source dirs (support core + frontier-hard)
    const srcRepo = resolveRepoDir(repository);
    const srcCase = resolveCaseDir(caseId);

    if (!existsSync(srcRepo)) {
      throw new Error(`Repository not found: ${repository} at ${srcRepo}`);
    }
    cpSync(srcRepo, destRepos, { recursive: true, filter: (src) => !src.includes(".git") });
    try { cpSync(srcRepo, destHardRepos, { recursive: true, filter: (src) => !src.includes(".git") }); } catch {}

    if (!existsSync(srcCase)) {
      throw new Error(`Case not found: ${caseId} at ${srcCase}`);
    }
    cpSync(srcCase, destCase, { recursive: true });
    try { cpSync(srcCase, destHardCase, { recursive: true }); } catch {}

    // Prepare Buggy Workspace: overlay artifacts/buggy onto repo to recreate exact buggy baseline the agent encountered
    const srcBuggy = join(srcCase, "artifacts/buggy");
    if (existsSync(srcBuggy)) {
      // Prefer manifest-driven file overlay for precision, fallback to recursive copy
      try {
        const manifestRaw = await readFile(join(srcCase, "manifest.json"), "utf-8");
        const manifest = JSON.parse(manifestRaw) as { buggyFiles?: string[] };
        if (Array.isArray(manifest.buggyFiles) && manifest.buggyFiles.length > 0) {
          for (const rel of manifest.buggyFiles) {
            const src = join(srcBuggy, rel);
            const dest = join(destRepos, rel);
            const dest2 = join(destHardRepos, rel);
            if (!existsSync(src)) continue;
            mkdirSync(dirname(dest), { recursive: true });
            cpSync(src, dest, { recursive: true });
            try { mkdirSync(dirname(dest2), { recursive: true }); cpSync(src, dest2, { recursive: true }); } catch {}
          }
        } else {
          cpSync(srcBuggy, destRepos, { recursive: true });
          try { cpSync(srcBuggy, destHardRepos, { recursive: true }); } catch {}
        }
      } catch {
        // Fallback: recursive copy entire buggy dir
        cpSync(srcBuggy, destRepos, { recursive: true });
        try { cpSync(srcBuggy, destHardRepos, { recursive: true }); } catch {}
      }
    }

    // Initialize and commit the buggy state: git add . && git commit -m "buggy baseline state"
    // This makes patch application relative to buggy HEAD (spec §4 step 6)
    const gitInit = await execDeterministic({
      command: "git",
      args: ["init"],
      cwd: destRepos,
      timeoutMs: 10000,
      commandString: "git init",
    });
    if (gitInit.code !== 0) {
      throw new Error(`git init failed: ${gitInit.stderr || gitInit.stdout}`);
    }
    await execDeterministic({
      command: "git",
      args: ["config", "user.email", "evaluator@frontier-verifier.local"],
      cwd: destRepos,
      timeoutMs: 5000,
      commandString: "git config user.email",
    });
    await execDeterministic({
      command: "git",
      args: ["config", "user.name", "frontier-evaluator"],
      cwd: destRepos,
      timeoutMs: 5000,
      commandString: "git config user.name",
    });
    const addRes = await execDeterministic({
      command: "git",
      args: ["add", "."],
      cwd: destRepos,
      timeoutMs: 10000,
      commandString: "git add .",
    });
    if (addRes.code !== 0) {
      throw new Error(`git add failed: ${addRes.stderr || addRes.stdout}`);
    }
    const commitRes = await execDeterministic({
      command: "git",
      args: ["commit", "-m", "buggy baseline state"],
      cwd: destRepos,
      timeoutMs: 10000,
      commandString: 'git commit -m "buggy baseline state"',
    });
    if (commitRes.code !== 0) {
      throw new Error(`git commit failed: ${commitRes.stderr || commitRes.stdout}`);
    }

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
  const commandString = `git apply --whitespace=nowarn in ${repoPath}`;

  if (!patchContent.trim()) {
    // Empty patch: no changes, but we still consider applied (will fail reproduction -> AGENT_FAILURE, correct for buggy workspace)
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

  // Try git apply --check with --whitespace=nowarn per spec §4 step 7
  const checkResult = await execDeterministic({
    command: "git",
    args: ["apply", "--whitespace=nowarn", "--check", patchFile],
    cwd: repoPath,
    timeoutMs,
    commandString: `git apply --whitespace=nowarn --check ${patchFile}`,
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

  // Now apply with --whitespace=nowarn per spec
  const applyResult = await execDeterministic({
    command: "git",
    args: ["apply", "--whitespace=nowarn", patchFile],
    cwd: repoPath,
    timeoutMs,
    commandString: `git apply --whitespace=nowarn ${patchFile}`,
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
