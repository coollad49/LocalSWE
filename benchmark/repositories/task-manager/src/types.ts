export type Priority = 1 | 2 | 3 | 4 | 5;
export type Status = "pending" | "in_progress" | "completed" | "archived";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string | null; // ISO date string YYYY-MM-DD or null
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: Priority;
  status?: Status;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  dueDate?: string | null;
}
