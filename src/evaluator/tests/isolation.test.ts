import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Evaluator } from "../Evaluator.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

describe("isolation and benchmark mutability", () => {
  test("benchmark/cases not modified after evaluation", async () => {
    const evaluator = new Evaluator();
    const casePath = join(ROOT, "benchmark/cases/synth-001/public/reproduce.ts");
    const before = await readFile(casePath, "utf-8");
    await evaluator.evaluate({ caseId: "synth-001", patchContent: "", agentVersion: "test" });
    const after = await readFile(casePath, "utf-8");
    expect(after).toBe(before);
  }, 20000);

  test("git status remains clean after evaluations", async () => {
    const evaluator = new Evaluator();
    await evaluator.evaluate({ caseId: "synth-001", patchContent: "", agentVersion: "test" });
    await evaluator.evaluate({ caseId: "hist-001", patchContent: "", agentVersion: "test" });
    // Check that benchmark repositories and cases are untouched; allow validation-report timestamp changes from validator
    const status = execSync("git status --short -- benchmark/repositories/ benchmark/cases/ benchmark/schema/", { cwd: ROOT }).toString().trim();
    expect(status).toBe("");
  }, 40000);

  test("temporary workspace cleanup", async () => {
    const evaluator = new Evaluator();
    const result = await evaluator.evaluate({ caseId: "synth-001", patchContent: "", agentVersion: "test" });
    // After evaluation, tmpRoot should be cleaned (undefined) unless keepWorkspace
    expect(result.workspace?.tmpRoot).toBeUndefined();
    expect(result.workspace?.isolated).toBe(true);
  }, 15000);

  test("keepWorkspace retains tmpRoot", async () => {
    const evaluator = new Evaluator();
    const result = await evaluator.evaluate({
      caseId: "synth-001",
      patchContent: "",
      agentVersion: "test",
      keepWorkspace: true,
    });
    expect(result.workspace?.tmpRoot).toBeDefined();
    // Cleanup manually
    if (result.workspace?.tmpRoot && existsSync(result.workspace.tmpRoot)) {
      const { rmSync } = await import("node:fs");
      rmSync(result.workspace.tmpRoot, { recursive: true, force: true });
    }
  }, 15000);
});
