import type { Job } from "./job.ts";

export interface QueueOptions {
  concurrency?: number;
  retryDelay?: number;
}

export class AsyncQueue<T = unknown> {
  private queue: Job<T>[] = [];
  private paused = false;
  private pendingJobs: Job<T>[] = [];
  private concurrency: number;
  private retryDelay: number;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? 1;
    this.retryDelay = options.retryDelay ?? 0;
  }

  enqueue(payload: T, opts?: { id?: string; maxAttempts?: number }): Job<T> {
    const job: Job<T> = {
      id: opts?.id ?? Math.random().toString(36).substring(2, 9),
      payload,
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
      createdAt: Date.now(),
    };
    if (this.paused) {
      this.pendingJobs.push(job);
    } else {
      this.queue.push(job);
    }
    return { ...job };
  }

  dequeue(): Job<T> {
    if (this.queue.length === 0) throw new Error("Queue is empty");
    const job = this.queue.shift()!;
    return { ...job };
  }

  peek(): Job<T> | undefined {
    const j = this.queue[0];
    return j ? { ...j } : undefined;
  }

  size(): number {
    return this.queue.length + this.pendingJobs.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  isPaused(): boolean {
    return this.paused;
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const job of this.pendingJobs) {
      this.queue.push(job);
    }
    this.pendingJobs = [];
  }

  clear(): void {
    this.queue = [];
    this.pendingJobs = [];
  }

  async processJob(
    job: Job<T>,
    handler: (payload: T) => Promise<void> | void
  ): Promise<{ success: boolean; job: Job<T> }> {
    const current: Job<T> = { ...job, attempts: job.attempts + 1 };
    try {
      await handler(current.payload);
      return { success: true, job: current };
    } catch (err) {
      if (current.attempts < current.maxAttempts) {
        const retryJob: Job<T> = { ...current };
        // BUG: forget to re-enqueue for retry
        return { success: false, job: retryJob };
      } else {
        return { success: false, job: current };
      }
    }
  }

  async processNext(handler: (payload: T) => Promise<void> | void): Promise<{ success: boolean; job: Job<T> } | null> {
    if (this.queue.length === 0) return null;
    const job = this.dequeue();
    try {
      const result = await this.processJob(job, handler);
      return result;
    } catch (e) {
      throw e;
    }
  }

  getJobs(): Job<T>[] {
    return [...this.queue, ...this.pendingJobs].map((j) => ({ ...j }));
  }
}
