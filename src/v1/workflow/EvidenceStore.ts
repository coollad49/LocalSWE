import { mkdirSync, createWriteStream } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Evidence, EvidenceType, AgentPhase } from "../types.ts";

export class EvidenceStore {
  private evidence: Evidence[] = [];
  private filePath?: string;
  private writeStream?: ReturnType<typeof createWriteStream>;

  constructor(filePath?: string) {
    if (filePath) {
      this.filePath = filePath;
      mkdirSync(dirname(filePath), { recursive: true });
      this.writeStream = createWriteStream(filePath, { flags: "w" });
      // Suppress ENOENT after tmpdir deletion between test and close
      this.writeStream.on("error", () => {});
    }
  }

  add(ev: Omit<Evidence, "id" | "timestamp"> & Partial<Pick<Evidence, "id" | "timestamp">>): Evidence {
    const entry: Evidence = {
      id: ev.id ?? `ev-${randomUUID().slice(0, 8)}`,
      type: ev.type,
      description: ev.description,
      source: ev.source,
      result: ev.result,
      timestamp: ev.timestamp ?? new Date().toISOString(),
      phase: ev.phase,
    };
    this.evidence.push(entry);
    if (this.writeStream) {
      try {
        this.writeStream.write(JSON.stringify(entry) + "\n");
      } catch {}
    }
    return entry;
  }

  addFileInspection(description: string, source: string, phase: AgentPhase, result: Evidence["result"] = "neutral"): Evidence {
    return this.add({ type: "file_inspection", description, source, phase, result });
  }

  addCommandResult(description: string, source: string, phase: AgentPhase, result: Evidence["result"] = "neutral"): Evidence {
    return this.add({ type: "command_result", description, source, phase, result });
  }

  addTestResult(description: string, source: string, phase: AgentPhase, result: Evidence["result"]): Evidence {
    return this.add({ type: "test_result", description, source, phase, result });
  }

  addReproduction(description: string, source: string, phase: AgentPhase, result: Evidence["result"]): Evidence {
    return this.add({ type: "reproduction", description, source, phase, result });
  }

  addDiffInspection(description: string, source: string, phase: AgentPhase): Evidence {
    return this.add({ type: "diff_inspection", description, source, phase, result: "neutral" });
  }

  getAll(): Evidence[] {
    return [...this.evidence];
  }

  getByPhase(phase: AgentPhase): Evidence[] {
    return this.evidence.filter((e) => e.phase === phase);
  }

  getByType(type: EvidenceType): Evidence[] {
    return this.evidence.filter((e) => e.type === type);
  }

  count(): number {
    return this.evidence.length;
  }

  countByPhase(phase: AgentPhase): number {
    return this.getByPhase(phase).length;
  }

  hasTypeInPhase(type: EvidenceType, phase: AgentPhase): boolean {
    return this.evidence.some((e) => e.type === type && e.phase === phase);
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.writeStream) return resolve();
      try {
        if (this.writeStream.destroyed || this.writeStream.writableEnded) return resolve();
        this.writeStream.end(() => resolve());
        // Fallback timeout
        setTimeout(() => resolve(), 500);
      } catch {
        resolve();
      }
    });
  }

  async flush(): Promise<void> {
    if (!this.filePath) return;
    try {
      await writeFile(this.filePath, this.evidence.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf-8");
    } catch {}
  }

  async loadFromFile(path: string): Promise<void> {
    try {
      const raw = await readFile(path, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const ev = JSON.parse(trimmed) as Evidence;
          this.evidence.push(ev);
        } catch {}
      }
    } catch {}
  }
}
