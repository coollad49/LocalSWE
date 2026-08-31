import { execWithTimeout } from "../../utils/git.ts";
import type { HypothesisRecord } from "../types.ts";

export class HypothesisTree {
  private workspacePath: string;
  private maxRollbacks: number;
  private records: HypothesisRecord[] = [];
  private rollbackCount = 0;

  constructor(workspacePath: string, maxRollbacks = 3) {
    this.workspacePath = workspacePath;
    this.maxRollbacks = maxRollbacks;
  }

  recordAttempt(params: {
    attempt: number;
    hypothesis: string;
    filesTargeted: string[];
    testOutput?: string;
    failedTest?: string;
    failureReason?: string;
  }): HypothesisRecord {
    const negativeLesson = this.synthesizeNegativeLesson(params.hypothesis, params.failureReason, params.testOutput);
    const rec: HypothesisRecord = {
      id: `hyp-${params.attempt}-${Date.now()}`,
      attempt: params.attempt,
      hypothesis: params.hypothesis,
      filesTargeted: params.filesTargeted,
      testOutput: params.testOutput,
      failedTest: params.failedTest,
      failureReason: params.failureReason,
      negativeLesson,
      timestamp: new Date().toISOString(),
      rolledBack: false,
    };
    this.records.push(rec);
    return rec;
  }

  async performRollback(reason: string): Promise<boolean> {
    if (this.rollbackCount >= this.maxRollbacks) return false;

    try {
      await execWithTimeout("git", ["checkout", "--", "."], this.workspacePath, 10000);
      await execWithTimeout("git", ["clean", "-fd", "-e", ".v3", "-e", ".v3/**", "-e", "node_modules"], this.workspacePath, 10000);
      this.rollbackCount++;
      if (this.records.length > 0) {
        this.records[this.records.length - 1]!.rolledBack = true;
      }
      return true;
    } catch {
      return false;
    }
  }

  getNegativeLessonsSummary(): string {
    if (this.records.length === 0) return "";
    const rolledBack = this.records.filter((r) => r.rolledBack);
    if (rolledBack.length === 0) return "";

    const lines: string[] = ["Previous Failed Hypotheses & Lessons Learned:"];
    for (const r of rolledBack) {
      lines.push(`  - Attempt ${r.attempt}: Tried "${r.hypothesis}" -> FAILED (${r.failureReason ?? "test regression"})`);
      lines.push(`    Lesson: ${r.negativeLesson}`);
    }
    return lines.join("\n");
  }

  getRecords(): HypothesisRecord[] {
    return [...this.records];
  }

  getRollbackCount(): number {
    return this.rollbackCount;
  }

  private synthesizeNegativeLesson(hypothesis: string, failureReason?: string, testOutput?: string): string {
    if (!failureReason && !testOutput) return `Approach "${hypothesis}" did not resolve the defect.`;

    if (testOutput) {
      if (testOutput.includes("TypeError") || testOutput.includes("ReferenceError")) {
        return `Do not use undefined variables or incompatible property types from "${hypothesis}".`;
      }
      if (testOutput.includes("Cannot find module")) {
        return `Do not introduce non-existent imports.`;
      }
      if (testOutput.includes("timeout") || testOutput.includes("timed out")) {
        return `Avoid infinite loops, deadlocks, or unresolving promises.`;
      }
    }

    return `Approach failed: ${failureReason ?? "tests failed"}. Pivot to an alternative architectural hypothesis.`;
  }
}
