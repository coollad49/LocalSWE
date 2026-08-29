import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import type { EvaluateOptions, EvaluationResult, VerificationStageResult, RunArtifact, CaseMeta } from "./types.ts";
import { loadBenchmarkIdentity, checkBenchmarkIdentity } from "./benchmarkIdentity.ts";
import { loadAndValidatePatch, isPatchPathSafe } from "./patchValidator.ts";
import { createIsolatedWorkspace, applyPatchIsolated } from "./isolation.ts";
import { runReproduce, runOracle, runRegression } from "./exec.ts";
import { computeVerdict } from "./verdict.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const RUNS_DIR = join(ROOT, "experiments/runs");
const DEFAULT_TIMEOUTS = {
  patchApplyMs: 10000,
  reproductionMs: 15000,
  oracleMs: 20000,
  regressionMs: 30000,
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeSkipped(command: string, reason: string): VerificationStageResult {
  return {
    status: "skipped",
    durationMs: 0,
    command,
    reason,
  };
}

async function resolveRunArtifact(options: EvaluateOptions): Promise<RunArtifact> {
  const effectiveRunsDir = options.runsDir ?? RUNS_DIR;
  if (options.runId) {
    const runDir = join(effectiveRunsDir, options.runId);
    if (!existsSync(runDir)) {
      throw new Error(`Run not found: ${options.runId} at ${runDir}`);
    }
    let caseId = options.caseId;
    let benchmarkVersion = options.benchmarkVersion;
    let benchmarkFingerprint = options.benchmarkFingerprint;
    let agentVersion = options.agentVersion;
    let model = options.model;
    let piVersion = options.piVersion;
    let patchPath = options.patchPath;

    const metadataPath = join(runDir, "metadata.json");
    const resultPath = join(runDir, "result.json");
    let meta: Record<string, unknown> | undefined;
    if (existsSync(metadataPath)) {
      try {
        meta = JSON.parse(await readFile(metadataPath, "utf-8")) as Record<string, unknown>;
        caseId = caseId ?? (meta.caseId as string);
        agentVersion = agentVersion ?? (meta.agentVersion as string);
        benchmarkVersion = benchmarkVersion ?? (meta.benchmarkVersion as string);
        benchmarkFingerprint = benchmarkFingerprint ?? (meta.benchmarkFingerprint as string);
        model = model ?? (meta.model as string);
        piVersion = piVersion ?? (meta.piVersion as string);
      } catch {}
    }
    if (!caseId && existsSync(resultPath)) {
      try {
        const res = JSON.parse(await readFile(resultPath, "utf-8")) as Record<string, unknown>;
        caseId = (res.caseId as string) ?? caseId;
        agentVersion = (res.agentVersion as string) ?? agentVersion;
      } catch {}
    }
    if (!patchPath) {
      const defaultPatch = join(runDir, "patch.diff");
      if (existsSync(defaultPatch)) patchPath = defaultPatch;
      else if (meta && (meta as { patchPath?: string }).patchPath) patchPath = (meta as { patchPath: string }).patchPath;
    }
    if (!caseId) throw new Error(`Cannot determine caseId for run ${options.runId}; provide --case`);
    if (!patchPath) throw new Error(`Cannot determine patchPath for run ${options.runId}; patch.diff missing`);
    return {
      runId: options.runId,
      caseId,
      agentVersion,
      benchmarkVersion,
      benchmarkFingerprint,
      model,
      piVersion,
      patchPath,
      metadataPath,
    };
  }

  if (!options.caseId) throw new Error("caseId required (via --case or --run)");
  if (!options.patchPath && options.patchContent === undefined) throw new Error("patchPath or patchContent required");
  const patchPath = options.patchPath ?? `inline-${options.caseId}.diff`;
  return {
    runId: options.runId ?? `${options.caseId}-${randomUUID().slice(0, 8)}`,
    caseId: options.caseId,
    agentVersion: options.agentVersion,
    benchmarkVersion: options.benchmarkVersion,
    benchmarkFingerprint: options.benchmarkFingerprint,
    model: options.model,
    piVersion: options.piVersion,
    patchPath,
  };
}

export class Evaluator {
  async evaluate(options: EvaluateOptions): Promise<EvaluationResult> {
    const startedAt = nowIso();
    const startMs = Date.now();
    const evaluationId = `eval-${randomUUID().slice(0, 8)}-${Date.now()}`;

    const timeouts = {
      patchApplyMs: options.timeouts?.patchApplyMs ?? DEFAULT_TIMEOUTS.patchApplyMs,
      reproductionMs: options.timeouts?.reproductionMs ?? DEFAULT_TIMEOUTS.reproductionMs,
      oracleMs: options.timeouts?.oracleMs ?? DEFAULT_TIMEOUTS.oracleMs,
      regressionMs: options.timeouts?.regressionMs ?? DEFAULT_TIMEOUTS.regressionMs,
    };

    let artifact: RunArtifact;
    try {
      artifact = await resolveRunArtifact(options);
    } catch (e) {
      const completedAt = nowIso();
      const durationMs = Date.now() - startMs;
      const benchmarkIdentity = await loadBenchmarkIdentity().catch(() => ({ version: "unknown", fingerprint: "unknown" }));
      return {
        evaluationId,
        runId: options.runId ?? "unknown",
        caseId: options.caseId ?? "unknown",
        benchmarkVersion: benchmarkIdentity.version,
        benchmarkFingerprint: benchmarkIdentity.fingerprint,
        agentVersion: options.agentVersion ?? "unknown",
        model: options.model,
        piVersion: options.piVersion,
        startedAt,
        completedAt,
        durationMs,
        patchPath: options.patchPath,
        status: "error",
        verification: {
          patchApply: makeSkipped("patch resolve", (e as Error).message),
          reproduction: makeSkipped("reproduce", "skipped due to early error"),
          oracle: makeSkipped("oracle", "skipped due to early error"),
          regression: makeSkipped("regression", "skipped due to early error"),
        },
        workspace: { isolated: true },
        error: { code: "ARTIFACT_RESOLVE_ERROR", message: (e as Error).message },
      };
    }

    const caseId = artifact.caseId;
    const runId = artifact.runId;

    let benchmarkIdentity: { version: string; fingerprint: string };
    try {
      benchmarkIdentity = await loadBenchmarkIdentity();
    } catch (e) {
      const completedAt = nowIso();
      return {
        evaluationId,
        runId,
        caseId,
        benchmarkVersion: artifact.benchmarkVersion ?? "unknown",
        benchmarkFingerprint: artifact.benchmarkFingerprint ?? "unknown",
        agentVersion: artifact.agentVersion ?? "unknown",
        model: artifact.model,
        piVersion: artifact.piVersion,
        startedAt,
        completedAt,
        durationMs: Date.now() - startMs,
        patchPath: artifact.patchPath,
        status: "error",
        verification: {
          patchApply: makeSkipped("benchmark identity", (e as Error).message),
          reproduction: makeSkipped("reproduce", "skipped"),
          oracle: makeSkipped("oracle", "skipped"),
          regression: makeSkipped("regression", "skipped"),
        },
        workspace: { isolated: true },
        error: { code: "BENCHMARK_IDENTITY_ERROR", message: (e as Error).message },
      };
    }

    const actualVersion = benchmarkIdentity.version;
    const actualFingerprint = benchmarkIdentity.fingerprint;

    let expectedVersion = artifact.benchmarkVersion ?? options.benchmarkVersion;
    let expectedFingerprint = artifact.benchmarkFingerprint ?? options.benchmarkFingerprint;

    if (!expectedVersion || !expectedFingerprint) {
      if (options.runId) {
        const effectiveRunsDirForIdentity = options.runsDir ?? RUNS_DIR;
        const metaPath = join(effectiveRunsDirForIdentity, runId, "metadata.json");
        if (existsSync(metaPath)) {
          try {
            const meta = JSON.parse(await readFile(metaPath, "utf-8")) as Record<string, unknown>;
            expectedVersion = (meta.benchmarkVersion as string) ?? expectedVersion;
            expectedFingerprint = (meta.benchmarkFingerprint as string) ?? expectedFingerprint;
          } catch {}
        }
      }
    }

    if (!expectedVersion) expectedVersion = actualVersion;
    if (!expectedFingerprint) expectedFingerprint = actualFingerprint;

    const identityCheck = checkBenchmarkIdentity(
      { version: expectedVersion, fingerprint: expectedFingerprint },
      { version: actualVersion, fingerprint: actualFingerprint },
    );

    if (!identityCheck.matched && !options.allowBenchmarkMismatch) {
      const completedAt = nowIso();
      return {
        evaluationId,
        runId,
        caseId,
        benchmarkVersion: actualVersion,
        benchmarkFingerprint: actualFingerprint,
        agentVersion: artifact.agentVersion ?? "unknown",
        model: artifact.model,
        piVersion: artifact.piVersion,
        startedAt,
        completedAt,
        durationMs: Date.now() - startMs,
        patchPath: artifact.patchPath,
        status: "error",
        verification: {
          patchApply: makeSkipped("benchmark identity", identityCheck.message ?? "mismatch"),
          reproduction: makeSkipped("reproduce", "skipped due to identity mismatch"),
          oracle: makeSkipped("oracle", "skipped due to identity mismatch"),
          regression: makeSkipped("regression", "skipped due to identity mismatch"),
        },
        workspace: { isolated: true },
        error: { code: identityCheck.code ?? "BENCHMARK_MISMATCH", message: identityCheck.message ?? "Benchmark mismatch" },
      };
    }

    let patchContent: string;
    let patchPathForResult: string | undefined = artifact.patchPath;
    if (options.patchContent !== undefined) {
      patchContent = options.patchContent;
      patchPathForResult = options.patchPath ?? patchPathForResult;
      const { validatePatchContentPaths: validateContent } = await import("./patchValidator.ts");
      const directValidation = validateContent(patchContent);
      if (!directValidation.valid) {
        const completedAt = nowIso();
        return {
          evaluationId,
          runId,
          caseId,
          benchmarkVersion: actualVersion,
          benchmarkFingerprint: actualFingerprint,
          agentVersion: artifact.agentVersion ?? "unknown",
          model: artifact.model,
          piVersion: artifact.piVersion,
          startedAt,
          completedAt,
          durationMs: Date.now() - startMs,
          patchPath: patchPathForResult,
          status: "error",
          verification: {
            patchApply: {
              status: "error",
              durationMs: 0,
              command: `validate patch content`,
              reason: directValidation.message,
              exitCode: 1,
            },
            reproduction: makeSkipped("reproduce", "skipped due to patch validation error"),
            oracle: makeSkipped("oracle", "skipped"),
            regression: makeSkipped("regression", "skipped"),
          },
          workspace: { isolated: true },
          error: { code: directValidation.code ?? "PATCH_INVALID", message: directValidation.message ?? "Patch invalid" },
        };
      }
    } else {
      const pathSafe = isPatchPathSafe(artifact.patchPath, options.runsDir ?? RUNS_DIR);
      if (!pathSafe.valid) {
        const completedAt = nowIso();
        return {
          evaluationId,
          runId,
          caseId,
          benchmarkVersion: actualVersion,
          benchmarkFingerprint: actualFingerprint,
          agentVersion: artifact.agentVersion ?? "unknown",
          model: artifact.model,
          piVersion: artifact.piVersion,
          startedAt,
          completedAt,
          durationMs: Date.now() - startMs,
          patchPath: artifact.patchPath,
          status: "error",
          verification: {
            patchApply: {
              status: "error",
              durationMs: 0,
              command: `validate patch path ${artifact.patchPath}`,
              reason: pathSafe.message,
              exitCode: 1,
            },
            reproduction: makeSkipped("reproduce", "skipped due to patch path error"),
            oracle: makeSkipped("oracle", "skipped"),
            regression: makeSkipped("regression", "skipped"),
          },
          workspace: { isolated: true },
          error: { code: pathSafe.code ?? "PATCH_PATH_INVALID", message: pathSafe.message ?? "Patch path invalid" },
        };
      }
      const { content, validation } = await loadAndValidatePatch(artifact.patchPath);
      if (!validation.valid) {
        const completedAt = nowIso();
        return {
          evaluationId,
          runId,
          caseId,
          benchmarkVersion: actualVersion,
          benchmarkFingerprint: actualFingerprint,
          agentVersion: artifact.agentVersion ?? "unknown",
          model: artifact.model,
          piVersion: artifact.piVersion,
          startedAt,
          completedAt,
          durationMs: Date.now() - startMs,
          patchPath: artifact.patchPath,
          status: "error",
          verification: {
            patchApply: {
              status: "error",
              durationMs: 0,
              command: `load patch ${artifact.patchPath}`,
              reason: validation.message,
              exitCode: 1,
            },
            reproduction: makeSkipped("reproduce", "skipped due to patch load error"),
            oracle: makeSkipped("oracle", "skipped"),
            regression: makeSkipped("regression", "skipped"),
          },
          workspace: { isolated: true },
          error: { code: validation.code ?? "PATCH_INVALID", message: validation.message ?? "Patch invalid" },
        };
      }
      patchContent = content;
    }

    // Load case manifest to get repository and enrich caseMeta
    let repository: string;
    let caseMeta: CaseMeta = {};
    try {
      const manifestRaw = await readFile(join(CASES_DIR, caseId, "manifest.json"), "utf-8");
      const manifest = JSON.parse(manifestRaw) as { repository: string; type?: string; difficulty?: string; categories?: string[] };
      repository = manifest.repository;
      if (!repository) throw new Error("manifest missing repository");
      caseMeta = {
        repository: manifest.repository,
        type: (manifest.type as CaseMeta["type"]) ?? (caseId.startsWith("hist-") ? "historical" : "synthetic"),
        difficulty: manifest.difficulty as CaseMeta["difficulty"],
        categories: manifest.categories,
      };
    } catch (e) {
      const completedAt = nowIso();
      return {
        evaluationId,
        runId,
        caseId,
        benchmarkVersion: actualVersion,
        benchmarkFingerprint: actualFingerprint,
        agentVersion: artifact.agentVersion ?? "unknown",
        model: artifact.model,
        piVersion: artifact.piVersion,
        startedAt,
        completedAt,
        durationMs: Date.now() - startMs,
        patchPath: patchPathForResult,
        status: "error",
        verification: {
          patchApply: makeSkipped("load manifest", (e as Error).message),
          reproduction: makeSkipped("reproduce", "skipped"),
          oracle: makeSkipped("oracle", "skipped"),
          regression: makeSkipped("regression", "skipped"),
        },
        workspace: { isolated: true },
        error: { code: "MANIFEST_ERROR", message: (e as Error).message },
      };
    }

    // Create isolated buggy workspace per spec §4
    let workspace: Awaited<ReturnType<typeof createIsolatedWorkspace>> | undefined;
    try {
      workspace = await createIsolatedWorkspace(caseId, repository);
    } catch (e) {
      const completedAt = nowIso();
      return {
        evaluationId,
        runId,
        caseId,
        benchmarkVersion: actualVersion,
        benchmarkFingerprint: actualFingerprint,
        agentVersion: artifact.agentVersion ?? "unknown",
        model: artifact.model,
        piVersion: artifact.piVersion,
        startedAt,
        completedAt,
        durationMs: Date.now() - startMs,
        patchPath: patchPathForResult,
        status: "error",
        verification: {
          patchApply: makeSkipped("create workspace", (e as Error).message),
          reproduction: makeSkipped("reproduce", "skipped"),
          oracle: makeSkipped("oracle", "skipped"),
          regression: makeSkipped("regression", "skipped"),
        },
        workspace: { isolated: true },
        error: { code: "WORKSPACE_ERROR", message: (e as Error).message },
        caseMeta,
      };
    }

    // Hermetic isolation: verify workspace is in /tmp and not canonical benchmark
    // Already guaranteed by mkdtemp in /tmp/eval-*; canonical never mutated

    // Isolated verification with finally cleanup per spec §4 step 9
    let result: EvaluationResult | undefined;
    let cleanupError: string | undefined;
    try {
      // Patch apply with --whitespace=nowarn
      let patchApplyStage: VerificationStageResult;
      try {
        const res = await applyPatchIsolated({
          patchContent,
          repoPath: workspace.repoPath,
          tmpRoot: workspace.tmpRoot,
          timeoutMs: timeouts.patchApplyMs,
        });
        patchApplyStage = res;
      } catch (e) {
        patchApplyStage = {
          status: "error",
          durationMs: 0,
          command: "git apply --whitespace=nowarn",
          reason: (e as Error).message,
          exitCode: 1,
        };
      }

      if (patchApplyStage.status !== "passed") {
        const completedAt = nowIso();
        const durationMs = Date.now() - startMs;
        const status: EvaluationResult["status"] = patchApplyStage.status === "timeout" ? "timeout" : "error";
        result = {
          evaluationId,
          runId,
          caseId,
          benchmarkVersion: actualVersion,
          benchmarkFingerprint: actualFingerprint,
          agentVersion: artifact.agentVersion ?? "unknown",
          model: artifact.model,
          piVersion: artifact.piVersion,
          startedAt,
          completedAt,
          durationMs,
          patchPath: patchPathForResult,
          status,
          verification: {
            patchApply: patchApplyStage,
            reproduction: makeSkipped("reproduce", "skipped due to patch apply failure"),
            oracle: makeSkipped("oracle", "skipped due to patch apply failure"),
            regression: makeSkipped("regression", "skipped due to patch apply failure"),
          },
          workspace: { isolated: true, tmpRoot: workspace.tmpRoot },
          error: {
            code: patchApplyStage.reason?.includes("traversal") ? "PATCH_TRAVERSAL" : patchApplyStage.status === "timeout" ? "PATCH_TIMEOUT" : "PATCH_APPLY_FAILED",
            message: patchApplyStage.reason ?? patchApplyStage.stderr ?? "Patch apply failed",
          },
          caseMeta,
        };
        // Do not run further stages; proceed to finally for cleanup
        return result;
      }

      // L2 Reproduction
      const reproductionResult = await runReproduce(workspace.tmpRoot, caseId, timeouts.reproductionMs);

      let oracleResult: VerificationStageResult;
      let regressionResult: VerificationStageResult;

      if (reproductionResult.status === "passed") {
        oracleResult = await runOracle(workspace.tmpRoot, caseId, timeouts.oracleMs);
      } else {
        oracleResult = makeSkipped("oracle", `skipped due to reproduction ${reproductionResult.status}`);
      }

      if (reproductionResult.status === "passed" && oracleResult.status === "passed") {
        regressionResult = await runRegression(workspace.tmpRoot, caseId, repository, timeouts.regressionMs);
      } else {
        regressionResult = makeSkipped("regression", `skipped due to earlier stage`);
      }

      const completedAt = nowIso();
      const durationMs = Date.now() - startMs;

      let verdict: EvaluationResult["verdict"] = undefined;
      let topStatus: EvaluationResult["status"] = "completed";

      const computedVerdict = computeVerdict(reproductionResult, oracleResult, regressionResult);

      if (computedVerdict) {
        verdict = computedVerdict;
        topStatus = "completed";
      } else {
        const anyTimeout =
          reproductionResult.status === "timeout" ||
          oracleResult.status === "timeout" ||
          regressionResult.status === "timeout";
        const anyError =
          reproductionResult.status === "error" ||
          oracleResult.status === "error" ||
          regressionResult.status === "error";

        if (anyTimeout) topStatus = "timeout";
        else if (anyError) topStatus = "error";
        else if (reproductionResult.status === "failed") {
          verdict = "agent_failure";
          topStatus = "completed";
        } else {
          topStatus = "error";
        }
      }

      if (reproductionResult.status === "failed" && !verdict) {
        verdict = "agent_failure";
        topStatus = "completed";
      }

      result = {
        evaluationId,
        runId,
        caseId,
        benchmarkVersion: actualVersion,
        benchmarkFingerprint: actualFingerprint,
        agentVersion: artifact.agentVersion ?? options.agentVersion ?? "unknown",
        model: artifact.model ?? options.model,
        piVersion: artifact.piVersion ?? options.piVersion,
        startedAt,
        completedAt,
        durationMs,
        patchPath: patchPathForResult,
        status: topStatus,
        verdict,
        verification: {
          patchApply: patchApplyStage,
          reproduction: reproductionResult,
          oracle: oracleResult,
          regression: regressionResult,
        },
        workspace: { isolated: true, tmpRoot: workspace.tmpRoot },
        caseMeta,
      };

      if (topStatus === "error" || topStatus === "timeout") {
        const failedStage = [reproductionResult, oracleResult, regressionResult].find((s) => s.status === "error" || s.status === "timeout");
        if (failedStage) {
          result.error = {
            code: failedStage.status === "timeout" ? "STAGE_TIMEOUT" : "STAGE_ERROR",
            message: failedStage.reason ?? failedStage.stderr ?? `Stage ${failedStage.command} ${failedStage.status}`,
          };
        }
      }

      return result;
    } finally {
      // Cleanup in finally per spec §4 step 9
      if (workspace) {
        if (!options.keepWorkspace) {
          const c = await workspace.cleanup();
          if (c.error) cleanupError = c.error;
          if (result) {
            result.workspace!.tmpRoot = undefined;
            if (cleanupError) result.workspace!.cleanupError = cleanupError;
          }
        } else {
          if (result) result.workspace!.tmpRoot = workspace.tmpRoot;
        }
      }
      // Persist after cleanup decision so tmpRoot reflects keepWorkspace
      if (result) {
        // Ensure caseMeta present
        if (!result.caseMeta) result.caseMeta = caseMeta;
        if (cleanupError && result.workspace) result.workspace.cleanupError = cleanupError;
        await this.persistResult(result, options);
      }
    }
  }

  private async persistResult(result: EvaluationResult, options: EvaluateOptions): Promise<void> {
    try {
      const runId = result.runId;
      const effectiveRunsDir = options.runsDir ?? join(ROOT, "experiments/runs");
      const evalDir = join(effectiveRunsDir, runId, "evaluation");
      mkdirSync(evalDir, { recursive: true });
      const resultPath = join(evalDir, "result.json");
      await writeFile(resultPath, JSON.stringify(result, null, 2), "utf-8");
      await writeFile(join(evalDir, "reproduction.log"), `COMMAND: ${result.verification.reproduction.command}\nEXIT: ${result.verification.reproduction.exitCode}\nSTATUS: ${result.verification.reproduction.status}\n\nSTDOUT:\n${result.verification.reproduction.stdout ?? ""}\n\nSTDERR:\n${result.verification.reproduction.stderr ?? ""}\n`, "utf-8");
      await writeFile(join(evalDir, "oracle.log"), `COMMAND: ${result.verification.oracle.command}\nEXIT: ${result.verification.oracle.exitCode}\nSTATUS: ${result.verification.oracle.status}\n\nSTDOUT:\n${result.verification.oracle.stdout ?? ""}\n\nSTDERR:\n${result.verification.oracle.stderr ?? ""}\n`, "utf-8");
      await writeFile(join(evalDir, "regression.log"), `COMMAND: ${result.verification.regression.command}\nEXIT: ${result.verification.regression.exitCode}\nSTATUS: ${result.verification.regression.status}\n\nSTDOUT:\n${result.verification.regression.stdout ?? ""}\n\nSTDERR:\n${result.verification.regression.stderr ?? ""}\n`, "utf-8");
      await writeFile(join(evalDir, "patch-apply.log"), `COMMAND: ${result.verification.patchApply.command}\nSTATUS: ${result.verification.patchApply.status}\n\nSTDOUT:\n${result.verification.patchApply.stdout ?? ""}\n\nSTDERR:\n${result.verification.patchApply.stderr ?? ""}\n`, "utf-8");
    } catch {
      // Best effort
    }
  }
}
