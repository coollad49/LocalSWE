import { execWithTimeout } from "../../utils/git.ts";

export interface AuditResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  changedFilesCount: number;
}

export class DiffAuditor {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  async audit(patchContent: string, changedFiles: string[]): Promise<AuditResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!patchContent || patchContent.trim().length === 0) {
      errors.push("Patch is empty: no changes detected.");
    }

    if (changedFiles.length === 0) {
      errors.push("No modified source files recorded.");
    }

    // Check for stray console.log / debugger in added lines
    const lines = patchContent.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        if (/\bconsole\.(log|debug|info)\(/.test(line) && !line.includes("// allow-log")) {
          warnings.push(`Stray console.log detected: ${line.trim()}`);
        }
        if (/\bdebugger\b/.test(line)) {
          errors.push(`Stray debugger statement detected: ${line.trim()}`);
        }
      }
    }

    // Run TypeScript compilation check if tsconfig exists
    try {
      const tsRes = await execWithTimeout("bun", ["run", "check-types"], this.workspacePath, 10000);
      if (tsRes.code !== 0 && tsRes.stderr) {
        warnings.push(`Type check output: ${tsRes.stderr.slice(0, 200)}`);
      }
    } catch {}

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      changedFilesCount: changedFiles.length,
    };
  }
}
