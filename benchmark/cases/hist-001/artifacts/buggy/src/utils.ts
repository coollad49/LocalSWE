export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export function toISOTimestamp(date: Date): string {
  return date.toISOString();
}

export function isOverdue(dueDate: string | null, now: Date, status: string): boolean {
  if (dueDate === null) return false;
  if (status === "completed" || status === "archived") return false;
  const todayStr = toISODate(now);
  return dueDate <= todayStr;
}
