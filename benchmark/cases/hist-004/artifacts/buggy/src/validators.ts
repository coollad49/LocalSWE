import type { Priority, Status } from "./types.ts";

const VALID_PRIORITIES: Priority[] = [1, 2, 3, 4, 5];
const VALID_STATUSES: Status[] = ["pending", "in_progress", "completed", "archived"];

export function isValidPriority(value: unknown): value is Priority {
  return typeof value === "number" && Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
}

export function isValidStatus(value: unknown): value is Status {
  return typeof value === "string" && (VALID_STATUSES as string[]).includes(value);
}

export function validatePriority(priority: unknown): void {
  if (!isValidPriority(priority)) {
    throw new Error(`Invalid priority: ${priority}. Must be integer 1-5.`);
  }
}

export function validateStatus(status: unknown): void {
  if (!isValidStatus(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
}

export function validateTitle(title: unknown): void {
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error("Title must be a non-empty string");
  }
  if (title.length > 200) {
    throw new Error("Title must be at most 200 characters");
  }
}

export function validateDueDate(dueDate: unknown): void {
  if (dueDate === null || dueDate === undefined) return;
  if (typeof dueDate !== "string") {
    throw new Error("dueDate must be string or null");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error(`Invalid dueDate format: ${dueDate}. Expected YYYY-MM-DD`);
  }
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid dueDate value: ${dueDate}`);
  }
}
