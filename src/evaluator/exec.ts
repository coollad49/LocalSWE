import { spawn } from "node:child_process";
import type { VerificationStageResult } from "./types.ts";

export interface ExecOptions {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  commandString: string;
}

export interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  error?: string;
}

/**
 * Execute command with deterministic handling:
 * - spawn with explicit args (no shell interpolation)
 * - timeout with SIGKILL escalation
 * - settled guard to avoid double resolve
 * - capture stdout/stderr, duration
 */
export function execDeterministic(options: ExecOptions): Promise<ExecResult> {
  const { command, args, cwd, timeoutMs } = options;
  const start = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let promiseResolved = false;

    const doResolve = (result: ExecResult) => {
      if (promiseResolved) return;
      promiseResolved = true;
      clearTimeout(timer);
      clearTimeout(forceTimer);
      const durationMs = Date.now() - start;
      resolve({ ...result, durationMs });
    };

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      timedOut = true;
      try {
        child.kill("SIGTERM");
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {}
        }, 1000);
      } catch {}
    }, timeoutMs);

    // Force resolve if child doesn't close after timeout + grace
    const forceTimer = setTimeout(() => {
      if (timedOut && !promiseResolved) {
        doResolve({
          code: null,
          stdout,
          stderr,
          timedOut: true,
          durationMs: Date.now() - start,
          error: `Timeout after ${timeoutMs}ms: ${command} ${args.join(" ")} (forced)`,
        });
      }
    }, timeoutMs + 3500);

    child.on("close", (code) => {
      if (timedOut) {
        doResolve({
          code: code ?? null,
          stdout,
          stderr,
          timedOut: true,
          durationMs: Date.now() - start,
          error: `Timeout after ${timeoutMs}ms: ${command} ${args.join(" ")}`,
        });
        return;
      }
      if (settled) return;
      settled = true;
      doResolve({
        code: code ?? 1,
        stdout,
        stderr,
        timedOut: false,
        durationMs: Date.now() - start,
      });
    });

    child.on("error", (err) => {
      if (timedOut) {
        doResolve({
          code: null,
          stdout,
          stderr,
          timedOut: true,
          durationMs: Date.now() - start,
          error: err.message,
        });
        return;
      }
      if (settled) return;
      settled = true;
      doResolve({
        code: null,
        stdout,
        stderr,
        timedOut: false,
        durationMs: Date.now() - start,
        error: err.message,
      });
    });

    if (timer && typeof (timer as unknown as { unref?: () => void }).unref === "function") {
      (timer as unknown as { unref: () => void }).unref();
    }
    if (forceTimer && typeof (forceTimer as unknown as { unref?: () => void }).unref === "function") {
      (forceTimer as unknown as { unref: () => void }).unref();
    }
  });
}

/**
 * Map ExecResult to VerificationStageResult (without verdict logic)
 */
export function toStageResult(
  exec: ExecResult,
  commandString: string,
  opts?: { passOnZero?: boolean },
): VerificationStageResult {
  const passOnZero = opts?.passOnZero ?? true;
  let status: VerificationStageResult["status"];
  if (exec.timedOut) status = "timeout";
  else if (exec.error && exec.code === null) status = "error";
  else if (exec.code === 0) status = passOnZero ? "passed" : "failed";
  else status = "failed";

  if (exec.error && !exec.timedOut && exec.code === null) status = "error";

  return {
    status,
    exitCode: exec.code ?? undefined,
    durationMs: exec.durationMs,
    command: commandString,
    stdout: exec.stdout?.slice(0, 8000),
    stderr: exec.stderr?.slice(0, 8000),
    reason: exec.error,
    timedOut: exec.timedOut,
  };
}

import { existsSync } from "node:fs";
import { join } from "node:path";

async function tryBunThenFallback(
  bunCommand: string,
  bunArgs: string[],
  bunCommandString: string,
  fallbackCommand: string,
  fallbackArgs: string[],
  fallbackString: string,
  cwd: string,
  timeoutMs: number,
): Promise<VerificationStageResult> {
  const bunResult = await execDeterministic({
    command: bunCommand,
    args: bunArgs,
    cwd,
    timeoutMs,
    commandString: bunCommandString,
  });
  // If bun spawn failed with ENOENT, fallback
  if (bunResult.error && bunResult.error.includes("ENOENT")) {
    // fallback
  } else {
    // Bun succeeded to spawn (even if test failed with exit 1, that's valid result)
    // Don't fallback; return bun result
    return toStageResult(bunResult, bunCommandString);
  }

  const fallbackResult = await execDeterministic({
    command: fallbackCommand,
    args: fallbackArgs,
    cwd,
    timeoutMs,
    commandString: fallbackString,
  });
  return toStageResult(fallbackResult, fallbackString);
}

export async function runReproduce(tmpRoot: string, caseId: string, timeoutMs: number): Promise<VerificationStageResult> {
  const reproRelative = join("benchmark/cases", caseId, "public/reproduce.ts");
  const bunString = `bun run ${reproRelative}`;
  const { resolve: pathResolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = pathResolve(__dirname, "../..");
  const fallbackBin = join(ROOT, "node_modules/.bin/tsx");
  const fallbackCommand = existsSync(fallbackBin) ? fallbackBin : "npx";
  const fallbackArgs = existsSync(fallbackBin) ? [reproRelative] : ["tsx", reproRelative];
  const fallbackString = existsSync(fallbackBin) ? `${fallbackBin} ${reproRelative}` : `npx tsx ${reproRelative}`;

  return tryBunThenFallback("bun", ["run", reproRelative], bunString, fallbackCommand, fallbackArgs, fallbackString, tmpRoot, timeoutMs);
}

export async function runOracle(tmpRoot: string, caseId: string, timeoutMs: number): Promise<VerificationStageResult> {
  const oracleRelative = join("benchmark/cases", caseId, "private/oracle.test.ts");
  const bunString = `bun test ${oracleRelative}`;
  const { resolve: pathResolve, dirname, join: pathJoin } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = pathResolve(__dirname, "../..");
  const vitestBin = pathJoin(ROOT, "node_modules/.bin/vitest");
  const fallbackCommand = existsSync(vitestBin) ? vitestBin : "npx";
  const fallbackArgs = existsSync(vitestBin) ? ["run", oracleRelative] : ["vitest", "run", oracleRelative];
  const fallbackString = existsSync(vitestBin) ? `${vitestBin} run ${oracleRelative}` : `npx vitest run ${oracleRelative}`;

  return tryBunThenFallback("bun", ["test", oracleRelative], bunString, fallbackCommand, fallbackArgs, fallbackString, tmpRoot, timeoutMs);
}

export async function runRegression(tmpRoot: string, caseId: string, repository: string, timeoutMs: number): Promise<VerificationStageResult> {
  const regressionRelative = join("benchmark/repositories", repository, "tests");
  const bunString = `bun test ${regressionRelative}`;
  const { resolve: pathResolve, dirname, join: pathJoin } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = pathResolve(__dirname, "../..");
  const vitestBin = pathJoin(ROOT, "node_modules/.bin/vitest");
  const fallbackCommand = existsSync(vitestBin) ? vitestBin : "npx";
  const fallbackArgs = existsSync(vitestBin) ? ["run", regressionRelative] : ["vitest", "run", regressionRelative];
  const fallbackString = existsSync(vitestBin) ? `${vitestBin} run ${regressionRelative}` : `npx vitest run ${regressionRelative}`;

  return tryBunThenFallback("bun", ["test", regressionRelative], bunString, fallbackCommand, fallbackArgs, fallbackString, tmpRoot, timeoutMs);
}
