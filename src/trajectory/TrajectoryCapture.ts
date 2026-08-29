import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { TrajectoryEvent } from "../agent/types.ts";

export class TrajectoryCapture {
  private events: TrajectoryEvent[] = [];
  private seq = 0;
  private filePath: string;
  private writeStream?: ReturnType<typeof createWriteStream>;

  constructor(filePath: string) {
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
    // Prepare JSONL stream for incremental writes
    this.writeStream = createWriteStream(filePath, { flags: "w" });
  }

  /** Append event and write JSONL line immediately (best-effort) */
  append(source: TrajectoryEvent["source"], type: string, data: unknown): void {
    const ev: TrajectoryEvent = {
      timestamp: new Date().toISOString(),
      seq: this.seq++,
      source,
      type,
      data,
    };
    this.events.push(ev);
    try {
      this.writeStream?.write(JSON.stringify(ev) + "\n");
    } catch {
      // ignore stream errors, will flush later
    }
  }

  /** Get all captured events */
  getEvents(): TrajectoryEvent[] {
    return [...this.events];
  }

  /** Flush and close file */
  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.writeStream) return resolve();
      this.writeStream.end(() => resolve());
    });
  }

  /** Ensure file is written even if stream failed */
  async flush(): Promise<void> {
    // Fallback: rewrite whole file if stream incomplete
    try {
      await writeFile(this.filePath, this.events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf-8");
    } catch {
      // ignore
    }
  }

  getPath(): string {
    return this.filePath;
  }
}
