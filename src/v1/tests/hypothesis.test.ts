import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkflowEngine } from "../workflow/WorkflowEngine.ts";
import { EvidenceStore } from "../workflow/EvidenceStore.ts";

function mkEngine(dir?: string) {
  const d = dir ?? mkdtempSync(join(tmpdir(), "v1-hyp-"));
  const store = new EvidenceStore(); // in-memory for unit test stability
  const eng = new WorkflowEngine({ issue: "issue", maxIterations: 5, workspacePath: d, evidenceStore: store, stateFilePath: join(d, ".v1/state.json") });
  return { eng, dir: d, store };
}

describe("hypothesis handling", () => {
  it("adds hypothesis with file-based state persistence", async () => {
    const { eng, dir } = mkEngine();
    const h = eng.addHypothesis({ description: "off-by-one in overdue", evidence: ["src/task.ts:10"], confidence: 0.9, files: ["src/task.ts"] });
    expect(h.id).toBeDefined();
    expect(h.status).toBe("active");
    await eng.persistState();
    await eng.flushPersist();
    expect(existsSync(join(dir, ".v1/state.json"))).toBe(true);
    const raw = readFileSync(join(dir, ".v1/state.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.hypotheses.length).toBe(1);
    rmSync(dir, { recursive: true, force: true });
  });

  it("selects hypothesis and tracks selectedHypothesis", async () => {
    const { eng, dir } = mkEngine();
    const h1 = eng.addHypothesis({ description: "h1", evidence: ["e1"], confidence: 0.6 });
    const h2 = eng.addHypothesis({ description: "h2", evidence: ["e2"], confidence: 0.8 });
    eng.selectHypothesis(h1.id);
    expect(eng.getState().selectedHypothesis).toBe(h1.id);
    expect(eng.getState().hypotheses.find((h) => h.id === h1.id)!.status).toBe("selected");
    eng.selectHypothesis(h2.id);
    expect(eng.getState().selectedHypothesis).toBe(h2.id);
    // previous selected should become active
    expect(eng.getState().hypotheses.find((h) => h.id === h1.id)!.status).toBe("active");
    rmSync(dir, { recursive: true, force: true });
  });

  it("updates hypothesis status to rejected", async () => {
    const { eng, dir } = mkEngine();
    const h = eng.addHypothesis({ description: "h", evidence: ["e"], confidence: 0.5 });
    eng.updateHypothesis(h.id, { status: "rejected" });
    expect(eng.getState().hypotheses[0]!.status).toBe("rejected");
    rmSync(dir, { recursive: true, force: true });
  });

  it("distinguishes hypothesis from evidence", async () => {
    const { eng, dir } = mkEngine();
    const h = eng.addHypothesis({ description: "h", evidence: ["e"], confidence: 0.5 });
    // hypothesis evidence field is separate from global evidence store
    expect(h.evidence).toEqual(["e"]);
    eng.recordEvidence({ type: "file_inspection", description: "inspected e", source: "e", phase: "diagnosis" });
    expect(eng.getState().evidence.length).toBe(1);
    expect(eng.getState().hypotheses[0]!.evidence).toEqual(["e"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("persists to .v1/state.json and can be reloaded", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v1-hyp-persist-"));
    const store = new EvidenceStore();
    const eng = new WorkflowEngine({ issue: "issue", workspacePath: dir, evidenceStore: store, stateFilePath: join(dir, ".v1/state.json") });
    eng.addHypothesis({ description: "persist me", evidence: ["e"], confidence: 0.9 });
    await eng.persistState();
    await eng.flushPersist();
    // Ensure file settled before second engine reads
    const eng2 = new WorkflowEngine({ issue: "issue", workspacePath: dir, evidenceStore: new EvidenceStore(), stateFilePath: join(dir, ".v1/state.json") });
    await eng2.flushPersist();
    const loaded = await eng2.loadState();
    expect(loaded?.hypotheses.length).toBe(1);
    expect(loaded?.hypotheses[0]!.description).toBe("persist me");
    rmSync(dir, { recursive: true, force: true });
  });

  it("prefers file-based tracking over regex parsing — state file is JSON, not text scrape", async () => {
    const { eng, dir } = mkEngine();
    eng.addHypothesis({ description: "file-based", evidence: ["src/foo.ts"], confidence: 0.7 });
    await eng.persistState();
    await eng.flushPersist();
    const raw = readFileSync(join(dir, ".v1/state.json"), "utf-8");
    // Ensure state is structured JSON with expected keys
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty("hypotheses");
    expect(parsed).toHaveProperty("evidence");
    expect(parsed).toHaveProperty("phase");
    // No regex text parsing needed
    expect(Array.isArray(parsed.hypotheses)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
