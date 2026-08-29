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
    // Move pending jobs back to main queue in order
    for (const job of this.pendingJobs) {
      this.queue.push(job);
    }
    this.pendingJobs = [];
  }

  clear(): void {
    this.queue = [];
    this.pendingJobs = [];
  }

  // Simulate processing a job with retry logic
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
        // Re-enqueue for retry
        const retryJob: Job<T> = { ...current };
        if (this.retryDelay > 0) {
          await new Promise((r) => setTimeout(r, this.retryDelay));
        }
        this.queue.push(retryJob);
        return { success: false, job: retryJob };
      } else {
        // Max attempts reached, do not re-enqueue, propagate error info
        return { success: false, job: current };
      }
    }
  }

  // Process next job in queue using handler, with error propagation for monitoring
  async processNext(handler: (payload: T) => Promise<void> | void): Promise<{ success: boolean; job: Job<T> } | null> {
    if (this.queue.length === 0) return null;
    const job = this.dequeue();
    try {
      const result = await this.processJob(job, handler);
      if (!result.success && result.job.attempts >= result.job.maxAttempts) {
        // Final failure: re-throw as unhandled if handler threw? For monitoring we surface error
        // But we still return failure status; caller can check
      }
      return result;
    } catch (e) {
      // Should not happen because processJob catches, but keep for safety
      throw e;
    }
  }

  // For testing: get all jobs
  getJobs(): Job<T>[] {
    return [...this.queue, ...this.pendingJobs].map((j) => ({ ...j }));
  }
}
