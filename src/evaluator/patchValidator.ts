import { resolve, isAbsolute, normalize, relative } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

/**
 * Patch validation — treat agent patch as untrusted input.
 * Rejects:
 * - absolute paths inside patch
 * - traversal (../)
 * - null bytes
 * Also validates patch file location if inside expected runs dir.
 */

export interface PatchValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
}

const EXPECTED_RUNS_INDICATOR = "experiments/runs";

export function isPatchPathSafe(patchPath: string, _expectedBase?: string): PatchValidationResult {
  if (!patchPath || typeof patchPath !== "string") {
    return { valid: false, code: "PATCH_PATH_MISSING", message: "Patch path missing" };
  }
  if (patchPath.includes("\0")) {
    return { valid: false, code: "PATCH_PATH_NULL_BYTE", message: "Patch path contains null byte" };
  }
  // If explicit patchPath supplied via --patch, allow any existing file (after existence check).
  // If runId supplied, evaluator will resolve inside experiments/runs/<runId>/patch.diff — that is trusted path.
  // Here we only reject obviously dangerous escapes like absolute outside project? But allow absolute if inside project.
  // For now: reject null bytes only; absolute paths are allowed if they exist and are readable.
  // The critical escape is repository paths inside patch, not patch file location.
  // However if patchPath contains ".." and is not normalized to inside expected runs, we warn but don't reject when allowBenchmarkMismatch?
  // Keep simple: patch location not rejected for traversal unless it clearly escapes via ".." and file does not exist.
  return { valid: true };
}

export function validatePatchContentPaths(patchContent: string): PatchValidationResult {
  if (patchContent.includes("\0")) {
    return { valid: false, code: "PATCH_NULL_BYTE", message: "Patch contains null byte" };
  }
  const lines = patchContent.split("\n");
  for (const line of lines) {
    // Git diff headers: diff --git a/<path> b/<path>, --- a/<path>, +++ b/<path>
    // Also check for absolute paths
    if (line.startsWith("diff --git ")) {
      // Example: diff --git a/src/foo.ts b/src/foo.ts
      const match = line.match(/^diff --git a\/(.*) b\/(.*)$/);
      if (match) {
        const aPath = match[1] ?? "";
        const bPath = match[2] ?? "";
        for (const p of [aPath, bPath]) {
          if (!p) continue;
          if (isAbsolute(p)) return { valid: false, code: "PATCH_ABSOLUTE_PATH", message: `Patch contains absolute path: ${p}` };
          if (p.includes("\0")) return { valid: false, code: "PATCH_NULL_BYTE", message: "Patch contains null byte in path" };
          const normalized = normalize(p);
          // After normalizing, check traversal escapes base (repo root). If p starts with "../" or contains "/../" or is ".."
          if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
            return { valid: false, code: "PATCH_TRAVERSAL", message: `Patch contains traversal path: ${p}` };
          }
          // Also check relative resolve would escape
          const repoBase = "/tmp/repo"; // dummy base
          const resolved = resolve(repoBase, p);
          const rel = relative(resolve(repoBase), resolved);
          if (rel.startsWith("..") || isAbsolute(rel)) {
            return { valid: false, code: "PATCH_TRAVERSAL", message: `Patch path escapes repo: ${p}` };
          }
        }
      }
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      // Extract path after --- a/ or +++ b/
      // Can be "--- a/src/foo.ts" or "--- /dev/null"
      if (line.includes("/dev/null")) continue;
      const pathPart = line.slice(4).trim().split(/\s+/)[0] ?? "";
      let p = pathPart;
      if (p.startsWith("a/") || p.startsWith("b/")) p = p.slice(2);
      if (!p) continue;
      if (isAbsolute(p)) return { valid: false, code: "PATCH_ABSOLUTE_PATH", message: `Patch contains absolute path: ${p}` };
      if (p.includes("\0")) return { valid: false, code: "PATCH_NULL_BYTE", message: "Patch contains null byte in path" };
      const normalized = normalize(p);
      if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
        return { valid: false, code: "PATCH_TRAVERSAL", message: `Patch contains traversal path: ${p}` };
      }
      const repoBase = "/tmp/repo";
      const resolved = resolve(repoBase, p);
      const rel = relative(resolve(repoBase), resolved);
      if (rel.startsWith("..")) {
        return { valid: false, code: "PATCH_TRAVERSAL", message: `Patch path escapes repo: ${p}` };
      }
    }
  }
  return { valid: true };
}

export async function loadAndValidatePatch(patchPath: string): Promise<{ content: string; validation: PatchValidationResult }> {
  if (!existsSync(patchPath)) {
    return { content: "", validation: { valid: false, code: "PATCH_NOT_FOUND", message: `Patch file not found: ${patchPath}` } };
  }
  let content = "";
  try {
    content = await readFile(patchPath, "utf-8");
  } catch (e) {
    return { content: "", validation: { valid: false, code: "PATCH_READ_ERROR", message: `Failed to read patch: ${(e as Error).message}` } };
  }
  const pathCheck = validatePatchContentPaths(content);
  if (!pathCheck.valid) return { content, validation: pathCheck };
  return { content, validation: { valid: true } };
}

// Ensure we also handle the case where patchPath itself is suspect (outside experiments/runs when runId used)
export function validatePatchPathForRunId(patchPath: string, expectedRunsRoot: string): PatchValidationResult {
  if (!patchPath) return { valid: false, code: "PATCH_PATH_MISSING", message: "Patch path missing" };
  if (patchPath.includes("\0")) return { valid: false, code: "PATCH_PATH_NULL_BYTE", message: "Patch path contains null byte" };
  if (isAbsolute(patchPath)) {
    const resolved = resolve(patchPath);
    const baseResolved = resolve(expectedRunsRoot);
    const rel = relative(baseResolved, resolved);
    // If absolute path is not inside expected runs root, we still allow it if file exists?
    // Spec says reject paths that escape expected run artifact directory - for runId mode, patch should be inside runs.
    // We'll enforce containment when expectedRunsRoot supplied and patchPath is absolute outside it.
    if (rel.startsWith("..") || isAbsolute(rel)) {
      // Allow if patchPath is not intended to be inside runs (direct --patch mode)? In that case expectedRunsRoot may not be relevant.
      // For runId mode we want strict.
      return { valid: false, code: "PATCH_PATH_ESCAPE", message: `Patch path escapes expected runs dir: ${patchPath}` };
    }
  } else {
    // Relative path with .. should be rejected if it escapes
    const normalized = normalize(patchPath);
    if (normalized.includes("..") || isAbsolute(patchPath)) {
      // Check relative escapes base when resolved against expectedRunsRoot
      const resolved = resolve(expectedRunsRoot, patchPath);
      const baseResolved = resolve(expectedRunsRoot);
      const rel = relative(baseResolved, resolved);
      if (rel.startsWith("..")) {
        return { valid: false, code: "PATCH_PATH_ESCAPE", message: `Patch path escapes expected runs dir: ${patchPath}` };
      }
    }
  }
  return { valid: true };
}
