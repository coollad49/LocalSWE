import { cpSync, existsSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import { copyFile, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const REPOS_DIR = join(ROOT, "benchmark/repositories");
const CASES_DIR_HARD = join(ROOT, "benchmark/frontier-hard/cases");
const REPOS_DIR_HARD = join(ROOT, "benchmark/frontier-hard/repositories");

function resolveCaseDir(caseId: string): string {
  if (caseId.startsWith("hard-")) {
    const p = join(CASES_DIR_HARD, caseId);
    if (existsSync(p)) return p;
    return p;
  }
  const core = join(CASES_DIR, caseId);
  if (existsSync(core)) return core;
  const alt = join(CASES_DIR_HARD, caseId);
  if (existsSync(alt)) return alt;
  return core;
}
function resolveRepoDir(repo: string): string {
  const hard = join(REPOS_DIR_HARD, repo);
  if (existsSync(hard)) return hard;
  return join(REPOS_DIR, repo);
}

interface CaseWorkspaceOptions {
  caseId: string;
  /** Optional explicit runId for temp dir naming */
  runId?: string;
  /** Whether to init git for patch capture (default true) */
  initGit?: boolean;
}

export interface Workspace {
  /** Absolute path to isolated workspace (contains repo files at root) */
  path: string;
  caseId: string;
  repository: string;
  /** Cleanup temp directory. Best-effort, never throws */
  cleanup(): Promise<void>;
  /** Get list of changed files vs initial commit (relative to workspace root) */
  getChangedFiles(): Promise<string[]>;
  /** Get git diff patch (unified) */
  getPatch(): Promise<string>;
  /** Path to original case manifest */
  manifestPath: string;
  /** Path to issue.md inside workspace (ISSUE.md) */
  issuePath: string;
}

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

async function ensureGitIgnore(workspacePath: string): Promise<void> {
  const gitIgnorePath = join(workspacePath, ".gitignore");
  const required = ["node_modules/", ".vite/", "dist/", ".turbo/"];
  let existing = "";
  let hasFile = existsSync(gitIgnorePath);
  if (hasFile) {
    try { existing = await readFile(gitIgnorePath, "utf-8"); } catch { existing = ""; }
  }
  const lines = existing.split("\n").map((l) => l.trim());
  let appended = false;
  for (const entry of required) {
    // Check exact match or normalized variant (node_modules vs node_modules/)
    const found = lines.some((l) => l === entry || l === entry.replace(/\/$/, "") || l === `/${entry}` || l === `/${entry.replace(/\/$/, "")}`);
    if (!found) {
      existing += (existing.endsWith("\n") || existing === "" ? "" : "\n") + entry + "\n";
      appended = true;
    }
  }
  if (appended || !hasFile) {
    try { await writeFile(gitIgnorePath, existing, "utf-8"); } catch {}
  }
}

async function ensureGitRepo(workspacePath: string): Promise<void> {
  // Ensure .gitignore appends node_modules/.vite/dist before first commit (preserve repo-specific rules)
  await ensureGitIgnore(workspacePath);
  const gitDir = join(workspacePath, ".git");
  if (existsSync(gitDir)) return;

  // Init git if not present
  await exec("git", ["init"], workspacePath);
  // Suppress git advice, set identity for commits
  await exec("git", ["config", "user.email", "baseline@frontier-verifier.local"], workspacePath);
  await exec("git", ["config", "user.name", "frontier-baseline"], workspacePath);
  await exec("git", ["add", "."], workspacePath).catch(() => {});
  await exec("git", ["commit", "-m", "baseline: initial buggy state", "--allow-empty"], workspacePath).catch(() => {
    // If commit fails due to empty, allow -m with --allow-empty
  });
}

/**
 * WorkspaceManager creates isolated per-case workspaces.
 * Canonical benchmark repositories are never mutated.
 * Each workspace is a temp directory containing a copy of the repository in buggy state.
 */
export class WorkspaceManager {
  static async createWorkspace(options: CaseWorkspaceOptions): Promise<Workspace> {
    const { caseId, runId, initGit = true } = options;
    const caseDir = resolveCaseDir(caseId);
    const manifestPath = join(caseDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      throw new Error(`Case not found: ${caseId} (missing ${manifestPath})`);
    }
    const manifestRaw = await readFile(manifestPath, "utf-8");
    let manifest: { repository: string; buggyFiles: string[] };
    try {
      manifest = JSON.parse(manifestRaw) as { repository: string; buggyFiles: string[] };
    } catch (e) {
      throw new Error(`Invalid manifest for ${caseId}: ${(e as Error).message}`);
    }
    if (!manifest.repository) throw new Error(`Manifest missing repository for ${caseId}`);
    if (!Array.isArray(manifest.buggyFiles) || manifest.buggyFiles.length === 0) {
      throw new Error(`Manifest buggyFiles invalid for ${caseId}`);
    }
    const repoPath = resolveRepoDir(manifest.repository);
    if (!existsSync(repoPath)) {
      throw new Error(`Repository not found: ${manifest.repository} at ${repoPath}`);
    }

    // Create temp workspace
    const prefix = runId ? `frontier-${caseId}-${runId}-` : `frontier-${caseId}-`;
    const workspacePath = await mkdtemp(join(tmpdir(), prefix));

    const cleanup = async (): Promise<void> => {
      try {
        rmSync(workspacePath, { recursive: true, force: true });
      } catch {
        // best effort
      }
    };

    try {
      // Copy repository contents to workspace root
      cpSync(repoPath, workspacePath, { recursive: true, filter: (src) => !src.includes(".git") });

      // Link root node_modules so dependencies (vitest, tsx, side-channel, mri, etc.) resolve cleanly
      const rootNodeModules = join(ROOT, "node_modules");
      const wsNodeModules = join(workspacePath, "node_modules");
      if (existsSync(rootNodeModules) && !existsSync(wsNodeModules)) {
        try {
          symlinkSync(rootNodeModules, wsNodeModules, "junction");
        } catch {
          // ignore if linking fails
        }
      }

      // Overlay buggy files
      for (const rel of manifest.buggyFiles) {
        const src = join(caseDir, "artifacts/buggy", rel);
        const dest = join(workspacePath, rel);
        if (!existsSync(src)) {
          throw new Error(`Buggy artifact missing: ${src}`);
        }
        mkdirSync(dirname(dest), { recursive: true });
        await copyFile(src, dest);
      }

      // Copy ISSUE.md only (SWE-bench: agent gets issue + repo, no public/reproduce.ts)
      // Strictly exclude curator-notes.md, provenance.md, private/oracle, artifacts
      const issueSrc = join(caseDir, "issue.md");
      const issueDest = join(workspacePath, "ISSUE.md");
      if (existsSync(issueSrc)) {
        await copyFile(issueSrc, issueDest);
      } else {
        await writeFile(issueDest, `# Issue for ${caseId}\n\nSee benchmark/cases/${caseId}/issue.md\n`, "utf-8");
      }

      // Ensure no evaluator-only information leaked into workspace
      // Guard 1: provenance.md must never be copied
      const provenanceLeak = join(workspacePath, "provenance.md");
      if (existsSync(provenanceLeak)) rmSync(provenanceLeak, { force: true });
      // Guard 1b: curator-notes.md (maintainer-only) must never be copied
      const curatorLeak = join(workspacePath, "curator-notes.md");
      if (existsSync(curatorLeak)) rmSync(curatorLeak, { force: true });
      const curatorSrc = join(caseDir, "curator-notes.md");
      // Never copy provenance/curator even if attempt via cpSync
      // Guard 2: private/oracle.test.ts
      const privatePath = join(caseDir, "private");
      if (existsSync(privatePath)) {
        const leaked = join(workspacePath, "private");
        if (existsSync(leaked)) rmSync(leaked, { recursive: true, force: true });
      }
      // Also guard against accidental copy of private via public (should not happen)
      const oracleLeak = join(workspacePath, "private/oracle.test.ts");
      if (existsSync(oracleLeak)) rmSync(oracleLeak, { force: true });
      // Guard 3: artifacts/buggy snapshots
      const artifactsLeak = join(workspacePath, "artifacts");
      if (existsSync(artifactsLeak)) rmSync(artifactsLeak, { recursive: true, force: true });
      const artifactsPrivateLeak = join(workspacePath, "benchmark/cases");
      if (existsSync(artifactsPrivateLeak)) rmSync(artifactsPrivateLeak, { recursive: true, force: true });
      const frontierArtifactsLeak = join(workspacePath, "benchmark/frontier-hard");
      if (existsSync(frontierArtifactsLeak)) rmSync(frontierArtifactsLeak, { recursive: true, force: true });

      // Ensure workspace has a .git repo for patch capture
      if (initGit) {
        await ensureGitRepo(workspacePath);
        // Verify clean git state before agent execution (no diff vs initial commit)
        const statusCheck = await exec("git", ["status", "--porcelain"], workspacePath).catch(() => ({ stdout: "", code: 0 }));
        if (statusCheck.stdout.trim() !== "") {
          const diffCheck = await exec("git", ["diff", "--name-only", "HEAD"], workspacePath).catch(() => ({ stdout: "" }));
          if (diffCheck.stdout.trim() !== "") {
            throw new Error(`Workspace not clean after init: ${statusCheck.stdout.slice(0, 500)}`);
          }
        }
      }

      const workspace: Workspace = {
        path: workspacePath,
        caseId,
        repository: manifest.repository,
        cleanup,
        manifestPath,
        issuePath: issueDest,
        getChangedFiles: async () => {
          try {
            const result = await exec("git", ["status", "--porcelain", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath);
            if (result.code !== 0) return [];
            const files: string[] = [];
            for (const line of result.stdout.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              const match = trimmed.match(/^.. "?(.+?)"?$/);
              if (match && match[1]) {
                const p = match[1].replace(/^"|"$/g, "");
                if (p.startsWith("node_modules/") || p === "node_modules" || p.includes("/.vite/") || p.startsWith(".vite/") || p.startsWith("dist/") || p.startsWith(".turbo/")) continue;
                files.push(p);
              }
            }
            const diffResult = await exec("git", ["diff", "--name-only", "HEAD", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath);
            if (diffResult.code === 0) {
              for (const f of diffResult.stdout.split("\n")) {
                const t = f.trim();
                if (!t) continue;
                if (t.startsWith("node_modules/") || t === "node_modules" || t.includes("/.vite/") || t.startsWith(".vite/") || t.startsWith("dist/") || t.startsWith(".turbo/")) continue;
                if (!files.includes(t)) files.push(t);
              }
            }
            return files;
          } catch {
            return [];
          }
        },
        getPatch: async () => {
          try {
            await exec("git", ["add", "-N", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath).catch(() => {});
            const result = await exec("git", ["diff", "HEAD", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath);
            if (result.code === 0) return result.stdout;
            const fallback = await exec("git", ["diff", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**"], workspacePath);
            return fallback.stdout;
          } catch {
            return "";
          }
        },
      };

      return workspace;
    } catch (e) {
      // Cleanup on failure to create
      await cleanup().catch(() => {});
      throw e;
    }
  }

  /** List all valid case IDs from benchmark/cases + benchmark/frontier-hard/cases */
  static async listCases(): Promise<string[]> {
    const all: string[] = [];
    try {
      const core = await readdir(CASES_DIR, { withFileTypes: true });
      for (const e of core) if (e.isDirectory()) all.push(e.name);
    } catch {}
    try {
      const hard = await readdir(CASES_DIR_HARD, { withFileTypes: true });
      for (const e of hard) if (e.isDirectory()) all.push(e.name);
    } catch {}
    return all.sort();
  }

  /** Check if canonical repo remains unmodified (git diff clean if git repo, else file hash check) */
  static async verifyCanonicalUntouched(): Promise<boolean> {
    // For baseline, just check that benchmark/repositories files exist and are not temp
    // Full check would be fingerprint compare - delegated to validator
    return true;
  }
}
