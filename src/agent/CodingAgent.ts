import type { RepairRun, RepairTask } from "./types.ts";

/**
 * Project-owned abstraction over coding-agent runtime.
 * Pi owns the implementation; benchmark, evaluator, and reporting depend only on this interface.
 */
export interface CodingAgent {
  /**
   * Execute repair task in an isolated workspace.
   * Must not mutate canonical benchmark repositories.
   * Must handle timeouts and return structured RepairRun.
   */
  run(task: RepairTask): Promise<RepairRun>;
}
