import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { InvariantProperty } from "../types.ts";

export class ConcurrentFuzzer {
  private workspacePath: string;
  private v3Dir: string;
  private results: InvariantProperty[] = [];

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.v3Dir = join(workspacePath, ".v3");
  }

  async ensureV3Directory(): Promise<void> {
    await mkdir(this.v3Dir, { recursive: true });
    await this.writeFuzzHelpers();
  }

  async writeFuzzHelpers(): Promise<void> {
    const helperContent = `
/**
 * Concurrency Jitter & Property Fuzzing Helper (LocalSWE V3)
 */
export async function runConcurrentJitter<T>(
  operations: Array<() => Promise<T>>,
  maxJitterMs = 5
): Promise<T[]> {
  return Promise.all(
    operations.map(async (op) => {
      const delay = Math.random() * maxJitterMs;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      return op();
    })
  );
}

export function generateBoundaryInputs(): any[] {
  return [null, undefined, "", 0, -1, NaN, Infinity, [], {}, true, false];
}
`.trim();

    await writeFile(join(this.v3Dir, "fuzz-helpers.ts"), helperContent, "utf-8");
  }

  recordResults(properties: InvariantProperty[]): void {
    this.results.push(...properties);
  }

  getResults(): InvariantProperty[] {
    return [...this.results];
  }

  parseTestOutput(stdout: string, stderr?: string): InvariantProperty[] {
    const properties: InvariantProperty[] = [];
    const fullText = `${stdout}\n${stderr ?? ""}`;

    const passMatches = fullText.matchAll(/\(pass\)\s+([^\n\r]+)/g);
    for (const m of passMatches) {
      const line = m[1] ?? "";
      properties.push({
        name: line.trim(),
        passed: true,
        durationMs: 10,
        category: this.categorizeTest(line),
      });
    }

    const failMatches = fullText.matchAll(/\(fail\)\s+([^\n\r]+)/g);
    for (const m of failMatches) {
      const line = m[1] ?? "";
      properties.push({
        name: line.trim(),
        passed: false,
        durationMs: 10,
        category: this.categorizeTest(line),
        error: "Test assertion failed",
      });
    }

    return properties;
  }

  private categorizeTest(name: string): InvariantProperty["category"] {
    const lower = name.toLowerCase();
    if (lower.includes("concurrent") || lower.includes("async") || lower.includes("race") || lower.includes("jitter")) {
      return "concurrency_jitter";
    }
    if (lower.includes("null") || lower.includes("undefined") || lower.includes("empty")) {
      return "null_handling";
    }
    if (lower.includes("error") || lower.includes("throw") || lower.includes("reject")) {
      return "error_invariants";
    }
    if (lower.includes("type") || lower.includes("coerce") || lower.includes("string") || lower.includes("number")) {
      return "type_coercion";
    }
    return "boundary";
  }

  async cleanup(): Promise<void> {
    if (existsSync(this.v3Dir)) {
      try {
        await rm(this.v3Dir, { recursive: true, force: true });
      } catch {}
    }
  }
}
