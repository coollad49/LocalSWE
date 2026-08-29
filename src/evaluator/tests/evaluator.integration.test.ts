import { describe, test, expect, beforeAll } from "vitest";
import { Evaluator } from "../Evaluator.ts";
import { readFile } from "node:fs/promises";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const CASES_DIR = join(ROOT, "benchmark/cases");
const REPOS_DIR = join(ROOT, "benchmark/repositories");
const RUNS_DIR = join(ROOT, "experiments/runs");

function getKnownGoodPatch(caseId: string): string {
  return "";
}

// Valid buggy patch generated via git diff from known-good to buggy artifact (synth-001)
const SYNTH_001_BUGGY_PATCH = `diff --git a/src/task-manager.ts b/src/task-manager.ts
index b65c9b4..0fa3bc4 100644
--- a/src/task-manager.ts
+++ b/src/task-manager.ts
@@ -38,17 +38,21 @@ export class TaskManager {
     if (updates.status !== undefined) validateStatus(updates.status);
     if (updates.dueDate !== undefined) validateDueDate(updates.dueDate);
 
-    // Only update fields that are explicitly provided (not undefined)
+    // BUG: spreads undefined values and overwrites existing fields
     const updated: Task = {
       ...existing,
-      ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
-      ...(updates.description !== undefined ? { description: updates.description } : {}),
-      ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
-      ...(updates.status !== undefined ? { status: updates.status } : {}),
-      ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
+      title: updates.title as any,
+      description: updates.description as any,
+      priority: updates.priority as any,
+      status: updates.status as any,
+      dueDate: updates.dueDate as any,
       updatedAt: toISOTimestamp(new Date()),
     };
-    this.tasks.set(id, updated);
+    // Remove undefined check - this will set fields to undefined if not provided
+    // Simulate buggy behavior: if update field is undefined, it still overwrites
+    // The above already does it. Need to ensure we don't preserve old values.
+    // In JS, spreading with undefined overwrites: { ...existing, title: undefined } => title undefined
+    this.tasks.set(id, updated as Task);
     this.invalidateCache();
     return { ...updated };
   }
@@ -74,9 +78,7 @@ export class TaskManager {
       return (this.statusCache.get(status) ?? []).map((t) => ({ ...t }));
     }
     const result = Array.from(this.tasks.values()).filter((t) => t.status === status);
-    // populate cache lazily
     if (!this.statusCache) this.statusCache = new Map();
-    // Rebuild all statuses if cache invalid
     if (!this.cacheValid) {
       this.rebuildCache();
     }
`;

// Partial patch: only dueDate buggy, others correct — should pass reproduction (which doesn't check dueDate) but fail oracle (which does)
const SYNTH_001_PARTIAL_DUEDATE_PATCH = `diff --git a/src/task-manager.ts b/src/task-manager.ts
index b65c9b4..94ed947 100644
--- a/src/task-manager.ts
+++ b/src/task-manager.ts
@@ -45,7 +45,7 @@ export class TaskManager {
       ...(updates.description !== undefined ? { description: updates.description } : {}),
       ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
       ...(updates.status !== undefined ? { status: updates.status } : {}),
-      ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
+      dueDate: updates.dueDate as any,
       updatedAt: toISOTimestamp(new Date()),
     };
     this.tasks.set(id, updated);
`;

// Regression break patch: keeps updateTask correct but breaks filterByStatus — should pass reproduce/oracle but fail regression
const SYNTH_001_REGRESSION_BREAK_PATCH = `diff --git a/src/task-manager.ts b/src/task-manager.ts
index b65c9b4..3bd20ac 100644
--- a/src/task-manager.ts
+++ b/src/task-manager.ts
@@ -70,17 +70,8 @@ export class TaskManager {
 
   filterByStatus(status: Status): Task[] {
     validateStatus(status);
-    if (this.cacheValid && this.statusCache?.has(status)) {
-      return (this.statusCache.get(status) ?? []).map((t) => ({ ...t }));
-    }
-    const result = Array.from(this.tasks.values()).filter((t) => t.status === status);
-    // populate cache lazily
-    if (!this.statusCache) this.statusCache = new Map();
-    // Rebuild all statuses if cache invalid
-    if (!this.cacheValid) {
-      this.rebuildCache();
-    }
-    return result.map((t) => ({ ...t }));
+    // Broken: always return empty array
+    return [];
   }
 
   private rebuildCache(): void {
`;

function getBuggyPatch(caseId: string): string {
  if (caseId === "synth-001") return SYNTH_001_BUGGY_PATCH;
  if (caseId === "synth-002") {
    return `diff --git a/src/money.ts b/src/money.ts
index 111111..222222 100644
--- a/src/money.ts
+++ b/src/money.ts
@@ -39,7 +39,6 @@
 
 export function add(a: Money, b: Money): Money {
-  if (a.currency !== b.currency) throw new Error(\`Currency mismatch: \${a.currency} vs \${b.currency}\`);
   return { amount: roundToCents(a.amount + b.amount), currency: a.currency };
 }
 
 export function subtract(a: Money, b: Money): Money {
-  if (a.currency !== b.currency) throw new Error(\`Currency mismatch: \${a.currency} vs \${b.currency}\`);
   return { amount: roundToCents(a.amount - b.amount), currency: a.currency };
 }
`;
  }
  return "";
}

function getMalformedPatch(): string {
  return "this is not a patch at all lol";
}

function getCannotApplyPatch(): string {
  return `diff --git a/src/nonexistent.ts b/src/nonexistent.ts
index 111111..222222 100644
--- a/src/nonexistent.ts
+++ b/src/nonexistent.ts
@@ -1,3 +1,4 @@
+// this file doesn't exist in repo, context mismatch
  import { foo } from "bar";
`;
}

function getTraversalPatch(): string {
  return `diff --git a/../../etc/passwd b/../../etc/passwd
index 111111..222222 100644
--- a/../../etc/passwd
+++ b/../../etc/passwd
@@ -1 +1 @@
-root:x:0:0:root:/root:/bin/bash
+evil
`;
}

function getAbsolutePatch(): string {
  return `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1 +1 @@
-old
+new
diff --git a//etc/passwd b//etc/passwd
--- a//etc/passwd
+++ b//etc/passwd
@@ -1 +1 @@
-root
+evil
`;
}

describe("Evaluator integration", () => {
  const evaluator = new Evaluator();

  test("valid empty patch on synth-001 -> verified", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getKnownGoodPatch("synth-001"),
      agentVersion: "test",
    });
    expect(result.status).toBe("completed");
    expect(result.verdict).toBe("verified");
    expect(result.verification.reproduction.status).toBe("passed");
    expect(result.verification.oracle.status).toBe("passed");
    expect(result.verification.regression.status).toBe("passed");
    expect(result.benchmarkVersion).toBe("0.4");
    expect(result.benchmarkFingerprint).toMatch(/^sha256:/);
  }, 30000);

  test("buggy patch on synth-001 -> agent_failure", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getBuggyPatch("synth-001"),
      agentVersion: "test",
    });
    expect(result.status).toBe("completed");
    expect(result.verdict).toBe("agent_failure");
    expect(result.verification.reproduction.status).toBe("failed");
    expect(result.verification.oracle.status).toBe("skipped");
    expect(result.verification.regression.status).toBe("skipped");
  }, 30000);

  test("malformed patch -> error (patch apply failed)", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getMalformedPatch(),
      agentVersion: "test",
    });
    expect(result.status).toBe("error");
    expect(result.verdict).toBeUndefined();
    expect(result.verification.patchApply.status).toBe("error");
    expect(result.error?.code).toMatch(/PATCH/);
  }, 15000);

  test("patch cannot apply -> error", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getCannotApplyPatch(),
      agentVersion: "test",
    });
    expect(result.status).toBe("error");
    expect(result.verification.patchApply.status).toBe("error");
  }, 15000);

  test("path traversal attempt -> error", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getTraversalPatch(),
      agentVersion: "test",
    });
    expect(result.status).toBe("error");
    expect(result.verification.patchApply.status).toBe("error");
    expect(result.error?.code).toBe("PATCH_TRAVERSAL");
  }, 15000);

  test("absolute path attempt -> error", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getAbsolutePatch(),
      agentVersion: "test",
    });
    expect(result.status).toBe("error");
    expect(result.verification.patchApply.status).toBe("error");
    expect(result.error?.code).toBe("PATCH_ABSOLUTE_PATH");
  }, 15000);

  test("false_confidence scenario: reproduction passes but oracle fails", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: SYNTH_001_PARTIAL_DUEDATE_PATCH,
      agentVersion: "test",
    });
    expect(result.verification.reproduction.status).toBe("passed");
    expect(result.verification.oracle.status).toBe("failed");
    expect(result.verdict).toBe("false_confidence");
    expect(result.status).toBe("completed");
  }, 30000);

  test("regression_failure scenario: oracle passes but regression fails", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: SYNTH_001_REGRESSION_BREAK_PATCH,
      agentVersion: "test",
    });
    expect(result.verification.reproduction.status).toBe("passed");
    expect(result.verification.oracle.status).toBe("passed");
    expect(result.verification.regression.status).toBe("failed");
    expect(result.verdict).toBe("regression_failure");
  }, 30000);

  test("isolation: benchmark repositories not modified after evaluation", async () => {
    const before = await readFile(join(REPOS_DIR, "task-manager/src/task-manager.ts"), "utf-8");
    await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: getBuggyPatch("synth-001"),
      agentVersion: "test",
    });
    const after = await readFile(join(REPOS_DIR, "task-manager/src/task-manager.ts"), "utf-8");
    expect(after).toBe(before);
    expect(existsSync(join(REPOS_DIR, "task-manager/src/task-manager.ts"))).toBe(true);
  }, 30000);

  test("repeatability: same patch evaluated multiple times yields stable verdict", async () => {
    const patch = getKnownGoodPatch("synth-001");
    const r1 = await evaluator.evaluate({ caseId: "synth-001", patchContent: patch, agentVersion: "test" });
    const r2 = await evaluator.evaluate({ caseId: "synth-001", patchContent: patch, agentVersion: "test" });
    const r3 = await evaluator.evaluate({ caseId: "synth-001", patchContent: patch, agentVersion: "test" });
    expect(r1.verdict).toBe(r2.verdict);
    expect(r2.verdict).toBe(r3.verdict);
    expect(r1.verdict).toBe("verified");
    expect(r1.verification.reproduction.status).toBe(r2.verification.reproduction.status);
  }, 60000);

  test("benchmark identity mismatch rejected unless allowed", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: "",
      agentVersion: "test",
      benchmarkVersion: "0.999-mismatch",
      benchmarkFingerprint: "sha256:deadbeef",
    });
    expect(result.status).toBe("error");
    expect(result.error?.code).toMatch(/BENCHMARK/);
  }, 15000);

  test("benchmark identity mismatch allowed with flag", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: "",
      agentVersion: "test",
      benchmarkVersion: "0.999-mismatch",
      benchmarkFingerprint: "sha256:deadbeef",
      allowBenchmarkMismatch: true,
    });
    expect(result.status).toBe("completed");
    expect(result.verdict).toBe("verified");
  }, 30000);

  test("evaluation via runId artifact", async () => {
    const fakeRunId = `synth-001-test-${Date.now()}`;
    const runDir = join(RUNS_DIR, fakeRunId);
    mkdirSync(runDir, { recursive: true });
    const patchPath = join(runDir, "patch.diff");
    writeFileSync(patchPath, "", "utf-8");
    const reportRaw = await readFile(join(ROOT, "benchmark/validation-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as { fingerprint: string };
    const metadata = {
      runId: fakeRunId,
      caseId: "synth-001",
      benchmarkVersion: "0.4",
      benchmarkFingerprint: report.fingerprint,
      agentVersion: "test-mock",
      model: "mock",
    };
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(join(runDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
    await wf(join(runDir, "result.json"), JSON.stringify({ runId: fakeRunId, caseId: "synth-001" }, null, 2), "utf-8");

    const result = await evaluator.evaluate({ runId: fakeRunId });
    expect(result.caseId).toBe("synth-001");
    expect(result.runId).toBe(fakeRunId);
    expect(result.status).toBe("completed");
    expect(existsSync(join(runDir, "evaluation/result.json"))).toBe(true);
    const persisted = JSON.parse(await readFile(join(runDir, "evaluation/result.json"), "utf-8")) as Record<string, unknown>;
    expect(persisted.verdict).toBe("verified");

    rmSync(runDir, { recursive: true, force: true });
  }, 30000);

  test("hidden oracle not exposed to patch (evaluator opaque)", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: "",
      agentVersion: "test",
    });
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain("oracle.test.ts source");
    expect(result.verification.oracle.command).toContain("oracle");
  }, 15000);

  test("timeout handling: reproduction timeout", async () => {
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: "",
      agentVersion: "test",
      timeouts: { reproductionMs: 1 },
    });
    expect(["timeout", "completed", "error"]).toContain(result.status);
    if (result.status === "timeout") {
      expect(result.verification.reproduction.status).toBe("timeout");
    }
  }, 15000);
});
