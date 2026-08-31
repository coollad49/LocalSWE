export type AgentPhase =
  | "reconnaissance"
  | "diagnosis"
  | "investigation"
  | "implementation"
  | "invariant_fuzzing"
  | "verification"
  | "rollback_recovery"
  | "finalization";

export interface Hypothesis {
  id: string;
  description: string;
  evidence: string[];
  confidence: number;
  status: "active" | "rejected" | "selected" | "rolled_back";
  files?: string[];
  introducedRegressions?: string[];
}

export type EvidenceType =
  | "file_inspection"
  | "command_result"
  | "test_result"
  | "reproduction"
  | "invariant_fuzzing"
  | "rollback_event"
  | "diff_inspection"
  | "other";

export interface Evidence {
  id: string;
  type: EvidenceType;
  description: string;
  source?: string;
  result?: "supports" | "contradicts" | "neutral";
  timestamp: string;
  phase: AgentPhase;
}

export interface CommandExecution {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  phase: AgentPhase;
  timestamp: string;
}

export interface FileChange {
  path: string;
  summary: string;
  iteration: number;
  timestamp: string;
}

export interface InvariantTestResult {
  property: string;
  category: "boundary" | "nullish" | "concurrency" | "idempotence" | "custom";
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface RollbackEvent {
  timestamp: string;
  reason: string;
  hypothesisId?: string;
  revertedFiles: string[];
  attemptNumber: number;
}

export interface VerificationAttempt {
  id: string;
  iteration: number;
  method: string;
  command?: string;
  passed: boolean | null;
  output: string;
  timestamp: string;
  phase: AgentPhase;
}

export interface PhaseTransition {
  from: AgentPhase | "init";
  to: AgentPhase;
  timestamp: string;
  iteration: number;
}

export interface PhaseDuration {
  phase: AgentPhase;
  enteredAt: string;
  exitedAt?: string;
  durationMs?: number;
}

export interface TaskState {
  phase: AgentPhase;
  issue: string;
  filesInspected: string[];
  commandsExecuted: CommandExecution[];
  hypotheses: Hypothesis[];
  selectedHypothesis?: string;
  changesMade: FileChange[];
  verificationAttempts: VerificationAttempt[];
  invariantsResults: InvariantTestResult[];
  rollbackHistory: RollbackEvent[];
  evidence: Evidence[];
  iteration: number;
  maxIterations: number;
  phaseHistory: PhaseTransition[];
  phaseDurations: PhaseDuration[];
  preEditSnapshotHash?: string;
  terminationReason?: "completed" | "verification_failed" | "iteration_exhausted" | "error" | "timeout";
  stateFilePath?: string;
}

export type TerminationReason = NonNullable<TaskState["terminationReason"]>;

export interface V2Telemetry {
  runId: string;
  taskState: TaskState;
  finalPhase: AgentPhase;
  totalIterations: number;
  rollbacksCount: number;
  invariantsPassedCount: number;
  invariantsTotalCount: number;
  reproductionConfirmed: boolean;
  regressionFree: boolean;
  terminationReason: TerminationReason;
  durationMs: number;
}
