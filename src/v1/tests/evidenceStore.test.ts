import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvidenceStore } from "../workflow/EvidenceStore.ts";

describe("EvidenceStore", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "v1-ev-test-"));
  });

  it("records evidence and persists to JSONL", async () => {
    const p = join(dir, "evidence.jsonl");
    const store = new EvidenceStore(p);
    const ev = store.add({ type: "file_inspection", description: "read a.ts", source: "a.ts", phase: "reconnaissance" });
    expect(ev.id).toBeDefined();
    expect(ev.type).toBe("file_inspection");
    await store.close();
    expect(existsSync(p)).toBe(true);
    const raw = readFileSync(p, "utf-8");
    expect(raw).toContain("file_inspection");
    rmSync(dir, { recursive: true, force: true });
  });

  it("counts and filters by phase/type", () => {
    const store = new EvidenceStore();
    store.add({ type: "file_inspection", description: "x", source: "a", phase: "reconnaissance" });
    store.add({ type: "command_result", description: "y", source: "b", phase: "investigation" });
    expect(store.count()).toBe(2);
    expect(store.getByPhase("reconnaissance").length).toBe(1);
    expect(store.getByType("command_result").length).toBe(1);
    expect(store.hasTypeInPhase("file_inspection", "reconnaissance")).toBe(true);
    expect(store.hasTypeInPhase("file_inspection", "investigation")).toBe(false);
  });

  it("helper methods add typed evidence", () => {
    const store = new EvidenceStore();
    store.addFileInspection("inspected foo", "src/foo.ts", "reconnaissance");
    store.addCommandResult("ran ls", "ls", "investigation", "supports");
    store.addTestResult("vitest", "vitest run", "verification", "supports");
    store.addReproduction("repro", "node repro.js", "investigation", "contradicts");
    store.addDiffInspection("diff", "git diff", "finalization");
    expect(store.count()).toBe(5);
    expect(store.getByType("diff_inspection").length).toBe(1);
  });

  it("loads from file", async () => {
    const p = join(dir, "evidence.jsonl");
    const s1 = new EvidenceStore(p);
    s1.add({ type: "other", description: "hello", phase: "diagnosis" });
    await s1.close();
    const s2 = new EvidenceStore();
    await s2.loadFromFile(p);
    expect(s2.count()).toBe(1);
    expect(s2.getAll()[0]!.description).toBe("hello");
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not leak hidden benchmark info — evidence is internal", () => {
    const store = new EvidenceStore();
    store.add({ type: "other", description: "hypothesis supports", source: "src/foo.ts", phase: "diagnosis" });
    const all = store.getAll();
    // Ensure no private/oracle paths leaked
    for (const ev of all) {
      expect(ev.source).not.toContain("private/oracle");
      expect(ev.source).not.toContain("provenance");
      expect(ev.description).not.toContain("oracle");
    }
  });
});
