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
function isIgnoredPath(p: string): boolean {
  return (
    p === "node_modules" ||
    p.startsWith("node_modules/") ||
    p === ".vite" ||
    p.startsWith(".vite/") ||
    p.includes("/.vite/") ||
    p === "dist" ||
    p.startsWith("dist/") ||
    p === ".turbo" ||
    p.startsWith(".turbo/")
  );
}

export async function capturePatch(workspacePath: string): Promise<PatchResult> {
  let patch = "";
  let changedFiles: string[] = [];

  try {
    await execWithTimeout("git", ["add", "-N", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath, 5000).catch(() => {});
    const diff = await execWithTimeout("git", ["diff", "HEAD", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath, 10000);
    if (diff.code === 0) patch = diff.stdout;
    else {
      const fallback = await execWithTimeout("git", ["diff", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**"], workspacePath, 10000).catch(() => ({ stdout: "" } as any));
      patch = fallback.stdout ?? "";
    }

    const status = await execWithTimeout("git", ["status", "--porcelain", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath, 5000);
    if (status.code === 0) {
      for (const line of status.stdout.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        const m = t.match(/^.. "?(.+?)"?$/);
        if (m && m[1]) {
          const p = m[1].replace(/^"|"$/g, "");
          if (isIgnoredPath(p)) continue;
          changedFiles.push(p);
        }
      }
    }
    const diffNames = await execWithTimeout("git", ["diff", "--name-only", "HEAD", "--", ".", ":!node_modules", ":!node_modules/**", ":!.vite", ":!.vite/**", ":!dist", ":!.turbo"], workspacePath, 5000).catch(() => ({ stdout: "" } as any));
    if (diffNames.stdout) {
      for (const f of diffNames.stdout.split("\n")) {
        const t = f.trim();
        if (!t) continue;
        if (isIgnoredPath(t)) continue;
        if (!changedFiles.includes(t)) changedFiles.push(t);
      }
    }
  } catch {
    patch = "";
    changedFiles = [];
  }

  // Defensive: patch should never contain node_modules diff; already filtered via pathspec,
  // but if it slips through (old git versions ignoring pathspec), strip it
  if (patch.includes("node_modules/.vite") || patch.includes("a/node_modules/")) {
    // Re-run without that hunk? For now filter lines is complex; fallback to empty if only node_modules remains
    const lines = patch.split("\n");
    let filteredPatch = "";
    let inNodeModulesHunk = false;
    for (const line of lines) {
      if (line.startsWith("diff --git a/node_modules/")) { inNodeModulesHunk = true; continue; }
      if (inNodeModulesHunk && line.startsWith("diff --git a/")) inNodeModulesHunk = false;
      if (!inNodeModulesHunk) filteredPatch += line + "\n";
    }
    if (filteredPatch.trim().length > 0) patch = filteredPatch;
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
