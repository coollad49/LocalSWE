import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { InvariantTestResult } from "../types.ts";

export class InvariantEngine {
  private readonly workspaceDir: string;
  private readonly v2Dir: string;
  private readonly invariantTestPath: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.v2Dir = join(workspaceDir, ".v2");
    this.invariantTestPath = join(this.v2Dir, "invariants.test.ts");
  }

  get InvariantFilePath(): string {
    return this.invariantTestPath;
  }

  async ensureV2Directory(): Promise<void> {
    if (!existsSync(this.v2Dir)) {
      await mkdir(this.v2Dir, { recursive: true });
    }
  }

  async hasInvariantTests(): Promise<boolean> {
    return existsSync(this.invariantTestPath);
  }

  parseTestOutput(stdout: string, stderr: string, durationMs: number): InvariantTestResult[] {
    const results: InvariantTestResult[] = [];
    const fullOutput = `${stdout}\n${stderr}`;

    // Look for test names in vitest / bun test / jest output
    // Patterns like:
    // ✓ boundary: empty string returns null (2ms)
    // ✗ concurrency: 50 concurrent items without race conditions
    const lines = fullOutput.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      const passMatch = trimmed.match(/^(?:✓|PASS|✔|\(pass\))\s+(.*)$/i);
      const failMatch = trimmed.match(/^(?:✗|FAIL|✖|\(fail\))\s+(.*)$/i);

      if (passMatch) {
        const title = passMatch[1] ?? "";
        results.push({
          property: title,
          category: this.categorizeProperty(title),
          passed: true,
          durationMs: 0,
        });
      } else if (failMatch) {
        const title = failMatch[1] ?? "";
        results.push({
          property: title,
          category: this.categorizeProperty(title),
          passed: false,
          error: stderr || "Assertion failed",
          durationMs: 0,
        });
      }
    }

    if (results.length === 0 && fullOutput.includes("pass")) {
      results.push({
        property: "synthesized_invariants_suite",
        category: "custom",
        passed: !fullOutput.toLowerCase().includes("fail"),
        durationMs,
      });
    }

    return results;
  }

  private categorizeProperty(title: string): InvariantTestResult["category"] {
    const lower = title.toLowerCase();
    if (lower.includes("bound") || lower.includes("empty") || lower.includes("zero") || lower.includes("max")) return "boundary";
    if (lower.includes("null") || lower.includes("undefined")) return "nullish";
    if (lower.includes("async") || lower.includes("concurr") || lower.includes("race") || lower.includes("parallel")) return "concurrency";
    if (lower.includes("idempotent") || lower.includes("invert") || lower.includes("roundtrip") || lower.includes("serial")) return "idempotence";
    return "custom";
  }

  async cleanup(): Promise<void> {
    try {
      if (existsSync(this.v2Dir)) {
        await rm(this.v2Dir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup error
    }
  }
}
