import { execWithTimeout } from "../../utils/git.ts";
import type { RollbackEvent } from "../types.ts";

export class RollbackManager {
  private readonly workspaceDir: string;
  private rollbackCount = 0;
  private readonly maxRollbacks: number;

  constructor(workspaceDir: string, maxRollbacks = 3) {
    this.workspaceDir = workspaceDir;
    this.maxRollbacks = maxRollbacks;
  }

  get RollbackCount(): number {
    return this.rollbackCount;
  }

  canRollback(): boolean {
    return this.rollbackCount < this.maxRollbacks;
  }

  async getModifiedFiles(): Promise<string[]> {
    const res = await execWithTimeout("git", ["status", "--porcelain"], this.workspaceDir, 5000);
    if (res.code !== 0) return [];
    return res.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.includes(".v2/") && !l.includes(".v1/"))
      .map((l) => l.replace(/^[MADRCU?! ]+\s+/, ""));
  }

  async createSnapshot(): Promise<string> {
    const res = await execWithTimeout("git", ["rev-parse", "HEAD"], this.workspaceDir, 5000);
    return res.code === 0 ? res.stdout.trim() : "unknown";
  }

  async performRollback(reason: string, hypothesisId?: string): Promise<RollbackEvent | null> {
    if (!this.canRollback()) {
      return null;
    }

    const modified = await this.getModifiedFiles();
    if (modified.length === 0) {
      return null;
    }

    // Revert modified files
    await execWithTimeout("git", ["checkout", "--", "."], this.workspaceDir, 10000);

    // Clean any untracked files excluding .v2/
    await execWithTimeout("git", ["clean", "-fd", "-e", ".v2/", "-e", ".v1/"], this.workspaceDir, 10000);

    this.rollbackCount++;

    const event: RollbackEvent = {
      timestamp: new Date().toISOString(),
      reason,
      hypothesisId,
      revertedFiles: modified,
      attemptNumber: this.rollbackCount,
    };

    return event;
  }
}
