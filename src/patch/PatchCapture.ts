import { writeFile, readFile } from "node:fs/promises";
import { execWithTimeout } from "../utils/git.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface PatchResult {
  patch: string;
  changedFiles: string[];
}

/**
 * Capture patch via git diff. Falls back to empty if not a git repo.
 */
export async function capturePatch(workspacePath: string): Promise<PatchResult> {
  let patch = "";
  let changedFiles: string[] = [];

  try {
    // Stage intent to add for untracked files so they appear in diff
    await execWithTimeout("git", ["add", "-N", "."], workspacePath, 5000).catch(() => {});
    const diff = await execWithTimeout("git", ["diff", "HEAD"], workspacePath, 10000);
    if (diff.code === 0) patch = diff.stdout;
    else {
      const fallback = await execWithTimeout("git", ["diff"], workspacePath, 10000).catch(() => ({ stdout: "" } as any));
      patch = fallback.stdout ?? "";
    }

    const status = await execWithTimeout("git", ["status", "--porcelain"], workspacePath, 5000);
    if (status.code === 0) {
      for (const line of status.stdout.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        const m = t.match(/^.. "?(.+?)"?$/);
        if (m && m[1]) changedFiles.push(m[1].replace(/^"|"$/g, ""));
      }
    }
    const diffNames = await execWithTimeout("git", ["diff", "--name-only", "HEAD"], workspacePath, 5000).catch(() => ({ stdout: "" } as any));
    if (diffNames.stdout) {
      for (const f of diffNames.stdout.split("\n")) {
        const t = f.trim();
        if (t && !changedFiles.includes(t)) changedFiles.push(t);
      }
    }
  } catch {
    patch = "";
    changedFiles = [];
  }

  return { patch, changedFiles };
}

export async function writePatchFile(patchPath: string, patch: string): Promise<void> {
  const { mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  mkdirSync(dirname(patchPath), { recursive: true });
  await writeFile(patchPath, patch, "utf-8");
}

export async function readPatchFile(patchPath: string): Promise<string> {
  if (!existsSync(patchPath)) return "";
  return readFile(patchPath, "utf-8");
}

export function isPatchEmpty(patch: string): boolean {
  return !patch.trim();
}
