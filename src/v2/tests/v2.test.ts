import { describe, it, expect } from "bun:test";
import { InvariantEngine } from "../workflow/InvariantEngine.ts";
import { RollbackManager } from "../workflow/RollbackManager.ts";
import { loadV2ConfigSync, DEFAULT_V2_CONFIG } from "../config/V2Config.ts";
import { getV2PhasePrompt, getV2WorkflowOverview } from "../agent/phasePrompts.ts";

describe("Agent V2 Component Tests", () => {
  describe("InvariantEngine", () => {
    it("categorizes invariant test properties correctly", () => {
      const engine = new InvariantEngine("/tmp/mock-workspace");
      const vitestOutput = `
✓ boundary: empty string returns null (2ms)
✓ nullish: undefined options fallback to default (1ms)
✓ concurrency: 50 concurrent items without race conditions (5ms)
✓ idempotence: roundtrip serialization maintains exact shape (3ms)
      `;
      const results = engine.parseTestOutput(vitestOutput, "", 15);
      expect(results.length).toBe(4);

      expect(results[0]?.category).toBe("boundary");
      expect(results[0]?.passed).toBe(true);

      expect(results[1]?.category).toBe("nullish");
      expect(results[1]?.passed).toBe(true);

      expect(results[2]?.category).toBe("concurrency");
      expect(results[2]?.passed).toBe(true);

      expect(results[3]?.category).toBe("idempotence");
      expect(results[3]?.passed).toBe(true);
    });

    it("captures invariant failure when tests fail", () => {
      const engine = new InvariantEngine("/tmp/mock-workspace");
      const failOutput = `
✗ concurrency: 100 promises resolve in order
      `;
      const results = engine.parseTestOutput(failOutput, "Race condition detected", 20);
      expect(results.length).toBe(1);
      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.category).toBe("concurrency");
    });
  });

  describe("RollbackManager", () => {
    it("initializes with default maximum rollbacks", () => {
      const rm = new RollbackManager("/tmp/mock-workspace", 3);
      expect(rm.RollbackCount).toBe(0);
      expect(rm.canRollback()).toBe(true);
    });
  });

  describe("V2Config", () => {
    it("loads default configuration accurately", () => {
      const config = loadV2ConfigSync();
      expect(config.version).toBe("v2");
      expect(config.agentVersion).toBe("agent-v2");
      expect(config.enableInvariantSynthesis).toBe(true);
      expect(config.enableRollbackOnRegression).toBe(true);
    });

    it("applies configuration overrides properly", () => {
      const config = loadV2ConfigSync({
        overrides: {
          maxTurns: 40,
          maxRollbacks: 5,
        },
      });
      expect(config.maxTurns).toBe(40);
      expect(config.maxRollbacks).toBe(5);
    });
  });

  describe("V2 Phase Prompts", () => {
    it("provides distinct instructions for each phase", () => {
      const recon = getV2PhasePrompt("reconnaissance");
      expect(recon).toContain("ISSUE UNDERSTANDING & REPRODUCTION");

      const diag = getV2PhasePrompt("diagnosis");
      expect(diag).toContain("DIAGNOSIS");

      const fuzz = getV2PhasePrompt("invariant_fuzzing");
      expect(fuzz).toContain("EDGE-CASE & ROBUSTNESS");

      const rollback = getV2PhasePrompt("rollback_recovery");
      expect(rollback).toContain("ROLLBACK RECOVERY");
    });
  });
});
