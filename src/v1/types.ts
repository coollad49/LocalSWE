export type AgentPhase =
  | "reconnaissance"
  | "diagnosis"
  | "investigation"
  | "implementation"
  | "verification"
  | "finalization";

export interface Hypothesis {
  id: string;
  description: string;
  evidence: string[];
  confidence: number;
  status: "active" | "rejected" | "selected";
  files?: string[];
}

export type EvidenceType =
  | "file_inspection"
  | "command_result"
  | "test_result"
  | "reproduction"
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
  evidence: Evidence[];
  iteration: number;
  maxIterations: number;
  phaseHistory: PhaseTransition[];
  phaseDurations: PhaseDuration[];
  terminationReason?: "completed" | "verification_failed" | "iteration_exhausted" | "error" | "timeout";
  // file-based tracking paths
  stateFilePath?: string;
}

export type TerminationReason = NonNullable<TaskState["terminationReason"]>;

export interface V1Telemetry {
  runId: string;
  caseId: string;
  agentVersion: string;
  benchmarkVersion: string;
  benchmarkFingerprint?: string;
  model: string;
  piVersion: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  terminationReason?: TerminationReason;
  phaseTransitions: PhaseTransition[];
  phaseDurations: PhaseDuration[];
  iterationCount: number;
  maxIterations: number;
  commandsExecuted: CommandExecution[];
  commandCount: number;
  filesInspected: string[];
  fileCount: number;
  filesChanged: string[];
  toolCallCount?: number;
  tokenUsage?: { input?: number; output?: number } | null;
  cost?: unknown | null;
  hypotheses: Hypothesis[];
  evidenceCount: number;
  verificationAttempts: VerificationAttempt[];
  finalPatchPath?: string;
  trajectoryPath?: string;
}

export const PHASE_ORDER: AgentPhase[] = [
  "reconnaissance",
  "diagnosis",
  "investigation",
  "implementation",
  "verification",
  "finalization",
];

export const ALLOWED_TRANSITIONS: Record<AgentPhase, Set<AgentPhase>> = {
  reconnaissance: new Set<AgentPhase>(["diagnosis"]),
  diagnosis: new Set<AgentPhase>(["investigation"]),
  investigation: new Set<AgentPhase>(["diagnosis", "implementation"]),
  implementation: new Set<AgentPhase>(["verification"]),
  verification: new Set<AgentPhase>(["finalization", "investigation", "implementation"]),
  finalization: new Set<AgentPhase>([]),
};
