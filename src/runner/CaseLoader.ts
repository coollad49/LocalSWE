import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const REPOS_DIR = join(ROOT, "benchmark/repositories");

export interface LoadedCase {
  id: string;
  manifest: {
    id: string;
    type: string;
    repository: string;
    baseVersion: string;
    difficulty: string;
    categories: string[];
    description: string;
    provenance: unknown;
    runtime: { node: string; bun: string; packageManager: string };
    verification: { reproduction: string; oracle: string; regression: string };
    buggyFiles: string[];
  };
  issue: string;
  issuePath: string;
  reproducePath: string;
  reproduceContent: string;
  buggyFiles: string[];
}

export class CaseLoader {
  static async loadCase(caseId: string): Promise<LoadedCase> {
    const caseDir = join(CASES_DIR, caseId);
    if (!existsSync(caseDir)) {
      throw new Error(`Case not found: ${caseId}`);
    }
    const manifestPath = join(caseDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error(`Missing manifest for ${caseId}`);

    const raw = await readFile(manifestPath, "utf-8");
    let manifest: LoadedCase["manifest"];
    try {
      manifest = JSON.parse(raw) as LoadedCase["manifest"];
    } catch (e) {
      throw new Error(`Invalid manifest JSON for ${caseId}: ${(e as Error).message}`);
    }

    if (manifest.id !== caseId) throw new Error(`Manifest id mismatch for ${caseId}: ${manifest.id}`);

    const issuePath = join(caseDir, "issue.md");
    if (!existsSync(issuePath)) throw new Error(`Missing issue.md for ${caseId}`);
    const issue = await readFile(issuePath, "utf-8");

    const reproducePath = join(caseDir, manifest.verification.reproduction);
    if (!existsSync(reproducePath)) throw new Error(`Missing reproduction for ${caseId}: ${reproducePath}`);
    const reproduceContent = await readFile(reproducePath, "utf-8");

    // Verify buggy artifacts exist (but don't leak to agent)
    for (const f of manifest.buggyFiles) {
      const p = join(caseDir, "artifacts/buggy", f);
      if (!existsSync(p)) throw new Error(`Buggy artifact missing for ${caseId}: ${f}`);
    }

    // Verify repo exists
    const repoPath = join(REPOS_DIR, manifest.repository);
    if (!existsSync(repoPath)) throw new Error(`Repository not found for ${caseId}: ${manifest.repository}`);

    return {
      id: caseId,
      manifest,
      issue,
      issuePath,
      reproducePath,
      reproduceContent,
      buggyFiles: manifest.buggyFiles,
    };
  }

  static async listCases(): Promise<string[]> {
    const entries = await readdir(CASES_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  }

  /** Ensure case is valid before running (mirrors validator checks: manifest, paths) */
  static async validateCaseForRun(caseId: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    try {
      await CaseLoader.loadCase(caseId);
    } catch (e) {
      errors.push((e as Error).message);
      return { valid: false, errors };
    }
    return { valid: true, errors };
  }
}
