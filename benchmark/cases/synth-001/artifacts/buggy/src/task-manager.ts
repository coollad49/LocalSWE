import type { Task, CreateTaskInput, UpdateTaskInput, Status, Priority } from "./types.ts";
import { validatePriority, validateStatus, validateTitle, validateDueDate } from "./validators.ts";
import { generateId, isOverdue, toISOTimestamp } from "./utils.ts";

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private statusCache: Map<Status, Task[]> | null = null;
  private cacheValid = false;

  createTask(input: CreateTaskInput): Task {
    validateTitle(input.title);
    validatePriority(input.priority);
    if (input.status !== undefined) validateStatus(input.status);
    if (input.dueDate !== undefined) validateDueDate(input.dueDate);

    const now = toISOTimestamp(new Date());
    const task: Task = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description ?? "",
      priority: input.priority,
      status: input.status ?? "pending",
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    this.invalidateCache();
    return { ...task };
  }

  updateTask(id: string, updates: UpdateTaskInput): Task {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error(`Task not found: ${id}`);

    if (updates.title !== undefined) validateTitle(updates.title);
    if (updates.priority !== undefined) validatePriority(updates.priority);
    if (updates.status !== undefined) validateStatus(updates.status);
    if (updates.dueDate !== undefined) validateDueDate(updates.dueDate);

    // BUG: spreads undefined values and overwrites existing fields
    const updated: Task = {
      ...existing,
      title: updates.title as any,
      description: updates.description as any,
      priority: updates.priority as any,
      status: updates.status as any,
      dueDate: updates.dueDate as any,
      updatedAt: toISOTimestamp(new Date()),
    };
    // Remove undefined check - this will set fields to undefined if not provided
    // Simulate buggy behavior: if update field is undefined, it still overwrites
    // The above already does it. Need to ensure we don't preserve old values.
    // In JS, spreading with undefined overwrites: { ...existing, title: undefined } => title undefined
    this.tasks.set(id, updated as Task);
    this.invalidateCache();
    return { ...updated };
  }

  getTask(id: string): Task | undefined {
    const t = this.tasks.get(id);
    return t ? { ...t } : undefined;
  }

  listTasks(): Task[] {
    return Array.from(this.tasks.values()).map((t) => ({ ...t }));
  }

  deleteTask(id: string): void {
    if (!this.tasks.has(id)) throw new Error(`Task not found: ${id}`);
    this.tasks.delete(id);
    this.invalidateCache();
  }

  filterByStatus(status: Status): Task[] {
    validateStatus(status);
    if (this.cacheValid && this.statusCache?.has(status)) {
      return (this.statusCache.get(status) ?? []).map((t) => ({ ...t }));
    }
    const result = Array.from(this.tasks.values()).filter((t) => t.status === status);
    if (!this.statusCache) this.statusCache = new Map();
    if (!this.cacheValid) {
      this.rebuildCache();
    }
    return result.map((t) => ({ ...t }));
  }

  private rebuildCache(): void {
    this.statusCache = new Map();
    for (const task of this.tasks.values()) {
      const arr = this.statusCache.get(task.status) ?? [];
      arr.push({ ...task });
      this.statusCache.set(task.status, arr);
    }
    this.cacheValid = true;
  }

  private invalidateCache(): void {
    this.cacheValid = false;
    this.statusCache = null;
  }

  getOverdueTasks(now: Date = new Date()): Task[] {
    return Array.from(this.tasks.values()).filter((t) => isOverdue(t.dueDate, now, t.status));
  }

  getTasksByPriority(priority: Priority): Task[] {
    validatePriority(priority);
    return Array.from(this.tasks.values()).filter((t) => t.priority === priority);
  }

  clear(): void {
    this.tasks.clear();
    this.invalidateCache();
  }

  count(): number {
    return this.tasks.size;
  }
}
