import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { DependencyGraph } from "../tools/DependencyGraph.ts";
import { HypothesisTree } from "../workflow/HypothesisTree.ts";
import { ConcurrentFuzzer } from "../workflow/ConcurrentFuzzer.ts";
import { DiffAuditor } from "../workflow/DiffAuditor.ts";
import { loadV3Config, DEFAULT_V3_CONFIG } from "../config/V3Config.ts";
import { getV3PhasePrompt } from "../agent/phasePrompts.ts";

describe("LocalSWE V3 Component Tests", () => {
  let testWorkspace: string;

  beforeEach(() => {
    testWorkspace = join(tmpdir(), `v3-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(testWorkspace, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testWorkspace)) {
      try {
        rmSync(testWorkspace, { recursive: true, force: true });
      } catch {}
    }
  });

  describe("DependencyGraph", () => {
    it("indexes imports, exports, and caller relationships", async () => {
      const srcDir = join(testWorkspace, "src");
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(join(srcDir, "utils.ts"), `export function add(a: number, b: number) { return a + b; }`, "utf-8");
      writeFileSync(join(srcDir, "math.ts"), `import { add } from "./utils";\nexport function calculate() { return add(1, 2); }`, "utf-8");

      const graph = new DependencyGraph(testWorkspace);
      const nodes = await graph.build();

      expect(nodes.has("src/utils.ts")).toBe(true);
      expect(nodes.has("src/math.ts")).toBe(true);

      const utilsNode = nodes.get("src/utils.ts");
      expect(utilsNode?.exports).toContain("add");
      expect(utilsNode?.callers).toContain("src/math.ts");

      const summary = graph.getSummaryForFile("src/utils.ts");
      expect(summary).toContain("Exports: add");
      expect(summary).toContain("Imported by");
    });
  });

  describe("HypothesisTree", () => {
    it("records attempts and synthesizes negative lessons", () => {
      const tree = new HypothesisTree(testWorkspace, 3);
      const rec = tree.recordAttempt({
        attempt: 1,
        hypothesis: "Direct mutation of array length",
        filesTargeted: ["src/proxy.ts"],
        testOutput: "TypeError: Cannot redefine property 'length'",
        failedTest: "invariants.test.ts:15",
        failureReason: "TypeError occurred",
      });

      expect(rec.attempt).toBe(1);
      expect(rec.negativeLesson).toContain("property types");
      expect(tree.getRecords().length).toBe(1);
    });

    it("formats previous negative lessons for prompt injection after rollback", async () => {
      const tree = new HypothesisTree(testWorkspace, 3);
      tree.recordAttempt({
        attempt: 1,
        hypothesis: "Remove undefined checks",
        filesTargeted: ["src/manager.ts"],
        failureReason: "Regression in testOverdue",
      });

      // Simulate rollback
      tree.getRecords()[0]!.rolledBack = true;

      const summary = tree.getNegativeLessonsSummary();
      expect(summary).toContain("Previous Failed Hypotheses");
      expect(summary).toContain("Remove undefined checks");
    });
  });

  describe("ConcurrentFuzzer", () => {
    it("writes fuzz helpers and categorizes concurrent jitter tests", async () => {
      const fuzzer = new ConcurrentFuzzer(testWorkspace);
      await fuzzer.ensureV3Directory();

      expect(existsSync(join(testWorkspace, ".v3/fuzz-helpers.ts"))).toBe(true);

      const output = `
(pass) ConcurrentJitter > handles 50 parallel requests without race condition
(fail) BoundaryCheck > throws on null input
`;
      const parsed = fuzzer.parseTestOutput(output);
      expect(parsed.length).toBe(2);
      expect(parsed[0]?.passed).toBe(true);
      expect(parsed[0]?.category).toBe("concurrency_jitter");
      expect(parsed[1]?.passed).toBe(false);
      expect(parsed[1]?.category).toBe("null_handling");

      await fuzzer.cleanup();
      expect(existsSync(join(testWorkspace, ".v3"))).toBe(false);
    });
  });

  describe("DiffAuditor", () => {
    it("flags empty patches and stray debugger statements", async () => {
      const auditor = new DiffAuditor(testWorkspace);

      const emptyAudit = await auditor.audit("", []);
      expect(emptyAudit.passed).toBe(false);
      expect(emptyAudit.errors.length).toBeGreaterThan(0);

      const patchWithDebugger = `
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,1 +1,2 @@
+ debugger;
+ return true;
`;
      const auditWithDebugger = await auditor.audit(patchWithDebugger, ["src/index.ts"]);
      expect(auditWithDebugger.passed).toBe(false);
      expect(auditWithDebugger.errors.some((e) => e.includes("debugger"))).toBe(true);
    });
  });

  describe("V3Config & Phase Prompts", () => {
    it("loads configuration and formats prompts with negative lessons", async () => {
      const config = await loadV3Config({ overrides: { maxTurns: 40 } });
      expect(config.version).toBe("v3");
      expect(config.maxTurns).toBe(40);
      expect(config.enableHypothesisMemory).toBe(true);

      const prompt = getV3PhasePrompt("hypothesis_formulation", {
        negativeLessons: "Lesson: Do not mutate array directly.",
      });
      expect(prompt).toContain("Phase 2a");
      expect(prompt).toContain("Do not mutate array directly");
    });
  });
});
