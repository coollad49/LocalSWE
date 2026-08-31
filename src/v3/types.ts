import type { TestRecord } from "../agent/types.ts";

export type AgentPhase =
  | "reconnaissance"
  | "dependency_mapping"
  | "hypothesis_formulation"
  | "surgical_repair"
  | "invariant_synthesis"
  | "verification"
  | "diff_audit"
  | "finalization";

export interface HypothesisRecord {
  id: string;
  attempt: number;
  hypothesis: string;
  filesTargeted: string[];
  testOutput?: string;
  failedTest?: string;
  failureReason?: string;
  negativeLesson: string;
  timestamp: string;
  rolledBack: boolean;
}

export interface InvariantProperty {
  name: string;
  passed: boolean;
  durationMs: number;
  category: "boundary" | "null_handling" | "type_coercion" | "concurrency_jitter" | "error_invariants";
  error?: string;
}

export interface DependencyNode {
  file: string;
  imports: Array<{ symbol: string; source: string }>;
  exports: string[];
  callers: string[];
}

export interface V3State {
  phase: AgentPhase;
  issue: string;
  filesInspected: string[];
  commandsExecuted: string[];
  hypotheses: HypothesisRecord[];
  negativeLessons: string[];
  invariantsResults: InvariantProperty[];
  rollbackCount: number;
  iteration: number;
  maxIterations: number;
  phaseHistory: Array<{ from: string; to: string; timestamp: string; iteration: number }>;
}
