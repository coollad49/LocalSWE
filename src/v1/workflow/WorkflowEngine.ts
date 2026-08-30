import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AgentPhase,
  TaskState,
  Hypothesis,
  Evidence,
  CommandExecution,
  FileChange,
  VerificationAttempt,
  PhaseTransition,
  PhaseDuration,
} from "../types.ts";
import { ALLOWED_TRANSITIONS } from "../types.ts";
import { checkGateForPhase } from "./gates.ts";
import { EvidenceStore } from "./EvidenceStore.ts";

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: AgentPhase,
    public readonly to: AgentPhase,
  ) {
    super(`Invalid phase transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class GateFailedError extends Error {
  constructor(
    public readonly phase: AgentPhase,
    public readonly reason: string,
  ) {
    super(`Gate failed for ${phase}: ${reason}`);
    this.name = "GateFailedError";
  }
}

export interface WorkflowEngineOptions {
  issue: string;
  maxIterations?: number;
  runId?: string;
  workspacePath?: string;
  evidenceStore?: EvidenceStore;
  stateFilePath?: string;
}

export class WorkflowEngine {
  private state: TaskState;
  private evidenceStore: EvidenceStore;
  private stateFilePath?: string;
  private phaseStartTime: string;
  private persistChain: Promise<void> = Promise.resolve();

  constructor(options: WorkflowEngineOptions) {
    const maxIt = options.maxIterations ?? 5;
    const now = new Date().toISOString();
    this.stateFilePath = options.stateFilePath;
    this.evidenceStore = options.evidenceStore ?? new EvidenceStore(
      options.workspacePath ? join(options.workspacePath, ".v1/evidence.jsonl") : undefined,
    );
    if (options.stateFilePath) {
      mkdirSync(dirname(options.stateFilePath), { recursive: true });
    } else if (options.workspacePath) {
      const p = join(options.workspacePath, ".v1/state.json");
      mkdirSync(dirname(p), { recursive: true });
      this.stateFilePath = p;
    }
    this.phaseStartTime = now;
    this.state = {
      phase: "reconnaissance",
      issue: options.issue,
      filesInspected: [],
      commandsExecuted: [],
      hypotheses: [],
      changesMade: [],
      verificationAttempts: [],
      evidence: [],
      iteration: 0,
      maxIterations: maxIt,
      phaseHistory: [{ from: "init", to: "reconnaissance", timestamp: now, iteration: 0 }],
      phaseDurations: [{ phase: "reconnaissance", enteredAt: now }],
    };
    // Initial persist — only if file does not exist, to avoid overwriting existing state (e.g., re-load in tests)
    // Chain to ensure later writes wait for it
    const shouldInitWrite = !this.stateFilePath || !existsSync(this.stateFilePath);
    if (shouldInitWrite) {
      this.persistChain = this.persistChain.then(() => this.writeStateFile()).catch(() => {});
    }
  }

  getState(): TaskState {
    // Return a shallow copy with cloned arrays to prevent external mutation
    return {
      ...this.state,
      filesInspected: [...this.state.filesInspected],
      commandsExecuted: [...this.state.commandsExecuted],
      hypotheses: this.state.hypotheses.map((h) => ({ ...h, evidence: [...h.evidence] })),
      changesMade: [...this.state.changesMade],
      verificationAttempts: [...this.state.verificationAttempts],
      evidence: [...this.state.evidence],
      phaseHistory: [...this.state.phaseHistory],
      phaseDurations: [...this.state.phaseDurations],
    };
  }

  getPhase(): AgentPhase {
    return this.state.phase;
  }

  getIteration(): number {
    return this.state.iteration;
  }

  getMaxIterations(): number {
    return this.state.maxIterations;
  }

  getEvidenceStore(): EvidenceStore {
    return this.evidenceStore;
  }

  canTransitionTo(next: AgentPhase): boolean {
    const allowed = ALLOWED_TRANSITIONS[this.state.phase];
    return allowed.has(next);
  }

  /**
   * Attempt to transition. Validates allowed graph + gate for current phase.
   * If gate fails, throws GateFailedError.
   * If transition not allowed, throws InvalidTransitionError.
   * Handles iteration increment on verification → investigation/implementation.
   */
  async transitionTo(next: AgentPhase, opts?: { force?: boolean; skipGate?: boolean }): Promise<void> {
    const from = this.state.phase;
    if (from === next) return;
    if (!this.canTransitionTo(next)) {
      throw new InvalidTransitionError(from, next);
    }
    if (!opts?.skipGate && !opts?.force) {
      const gate = checkGateForPhase(from, this.state);
      if (!gate.passed) {
        throw new GateFailedError(from, gate.reason ?? "gate failed");
      }
    }

    // Iteration increment on verification failure loop
    if (from === "verification" && (next === "investigation" || next === "implementation")) {
      this.state.iteration += 1;
      if (this.state.iteration > this.state.maxIterations) {
        throw new Error(`Iteration budget exhausted (${this.state.maxIterations}); cannot loop to ${next}`);
      }
    }

    // Close prior phase duration
    const now = new Date().toISOString();
    const lastDur = this.state.phaseDurations[this.state.phaseDurations.length - 1];
    if (lastDur && lastDur.phase === from && !lastDur.exitedAt) {
      lastDur.exitedAt = now;
      try {
        const start = Date.parse(lastDur.enteredAt);
        const end = Date.parse(now);
        if (!Number.isNaN(start) && !Number.isNaN(end)) lastDur.durationMs = Math.max(0, end - start);
      } catch {}
    }
    // Open new phase duration
    this.state.phaseDurations.push({ phase: next, enteredAt: now });
    this.state.phaseHistory.push({ from, to: next, timestamp: now, iteration: this.state.iteration });
    this.state.phase = next;
    this.phaseStartTime = now;
    await this.persistState();
  }

  /** Force transition without gate (for timeout/budget exhaustion finalization). */
  async forceTransitionTo(next: AgentPhase): Promise<void> {
    await this.transitionTo(next, { force: true, skipGate: true });
  }

  // --- Evidence / tracking helpers ---

  recordFileInspected(path: string): void {
    if (!this.state.filesInspected.includes(path)) this.state.filesInspected.push(path);
    this.recordEvidence({ type: "file_inspection", description: `Inspected ${path}`, source: path, phase: this.state.phase });
    this.persistState().catch(() => {});
  }

  recordCommandExecution(cmd: CommandExecution): void {
    this.state.commandsExecuted.push(cmd);
    this.persistState().catch(() => {});
  }

  addHypothesis(h: Omit<Hypothesis, "id" | "status"> & Partial<Pick<Hypothesis, "id" | "status">>): Hypothesis {
    const hyp: Hypothesis = {
      id: h.id ?? `hyp-${randomUUID().slice(0, 8)}`,
      description: h.description,
      evidence: h.evidence ?? [],
      confidence: h.confidence ?? 0.5,
      status: h.status ?? "active",
      files: h.files,
    };
    this.state.hypotheses.push(hyp);
    this.persistState().catch(() => {});
    return hyp;
  }

  updateHypothesis(id: string, updates: Partial<Hypothesis>): Hypothesis | undefined {
    const idx = this.state.hypotheses.findIndex((h) => h.id === id);
    if (idx === -1) return undefined;
    this.state.hypotheses[idx] = { ...this.state.hypotheses[idx]!, ...updates } as Hypothesis;
    if (updates.status === "selected") {
      this.state.selectedHypothesis = id;
      // mark others not selected? keep active/rejected as is except selected
      for (const h of this.state.hypotheses) {
        if (h.id !== id && h.status === "selected") h.status = "active";
      }
    }
    this.persistState().catch(() => {});
    return this.state.hypotheses[idx];
  }

  selectHypothesis(id: string): void {
    this.updateHypothesis(id, { status: "selected" });
  }

  recordEvidence(ev: Omit<Evidence, "id" | "timestamp"> & Partial<Pick<Evidence, "id" | "timestamp">>): Evidence {
    const e = this.evidenceStore.add({
      ...ev,
      phase: ev.phase ?? this.state.phase,
    });
    this.state.evidence.push(e);
    this.persistState().catch(() => {});
    return e;
  }

  recordFileChange(change: Omit<FileChange, "timestamp"> & Partial<Pick<FileChange, "timestamp">>): FileChange {
    const fc: FileChange = {
      path: change.path,
      summary: change.summary,
      iteration: change.iteration ?? this.state.iteration,
      timestamp: change.timestamp ?? new Date().toISOString(),
    };
    this.state.changesMade.push(fc);
    this.persistState().catch(() => {});
    return fc;
  }

  recordVerificationAttempt(attempt: Omit<VerificationAttempt, "id" | "timestamp" | "iteration" | "phase"> & Partial<Pick<VerificationAttempt, "id" | "timestamp" | "iteration" | "phase">>): VerificationAttempt {
    const va: VerificationAttempt = {
      id: attempt.id ?? `ver-${randomUUID().slice(0, 8)}`,
      iteration: attempt.iteration ?? this.state.iteration,
      method: attempt.method,
      command: attempt.command,
      passed: attempt.passed ?? null,
      output: attempt.output ?? "",
      timestamp: attempt.timestamp ?? new Date().toISOString(),
      phase: (attempt.phase as VerificationAttempt["phase"]) ?? this.state.phase,
    };
    this.state.verificationAttempts.push(va);
    this.persistState().catch(() => {});
    return va;
  }

  incrementIteration(): void {
    this.state.iteration += 1;
    this.persistState().catch(() => {});
  }

  isBudgetExhausted(): boolean {
    return this.state.iteration >= this.state.maxIterations;
  }

  canLoopBack(): boolean {
    return this.state.iteration < this.state.maxIterations;
  }

  setTerminationReason(reason: TaskState["terminationReason"]): void {
    this.state.terminationReason = reason;
    // close current phase duration
    const now = new Date().toISOString();
    const lastDur = this.state.phaseDurations[this.state.phaseDurations.length - 1];
    if (lastDur && !lastDur.exitedAt) {
      lastDur.exitedAt = now;
      try {
        const start = Date.parse(lastDur.enteredAt);
        const end = Date.parse(now);
        if (!Number.isNaN(start) && !Number.isNaN(end)) lastDur.durationMs = Math.max(0, end - start);
      } catch {}
    }
    this.persistState().catch(() => {});
  }

  private async writeStateFile(): Promise<void> {
    if (!this.stateFilePath) return;
    try {
      const dir = dirname(this.stateFilePath);
      mkdirSync(dir, { recursive: true });
      const payload = JSON.stringify(this.state, null, 2);
      const { writeFile: writeFileAsync } = await import("node:fs/promises");
      await writeFileAsync(this.stateFilePath!, payload, "utf-8");
    } catch {}
  }

  /** Persist TaskState to .v1/state.json (file-based tracking, not regex). Queued to avoid race with constructor. */
  async persistState(): Promise<void> {
    const task = this.writeStateFile();
    this.persistChain = this.persistChain.then(() => task).catch(() => {});
    await task;
    // Ensure chain doesn't break on error
    await this.persistChain.catch(() => {});
  }

  /** Wait for all pending persists to finish (useful in tests). */
  async flushPersist(): Promise<void> {
    await this.persistChain.catch(() => {});
  }

  async loadState(): Promise<TaskState | null> {
    if (!this.stateFilePath || !existsSync(this.stateFilePath)) return null;
    try {
      const raw = await readFile(this.stateFilePath, "utf-8");
      const parsed = JSON.parse(raw) as TaskState;
      this.state = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Snapshot for telemetry */
  snapshot(): TaskState {
    return this.getState();
  }
}
