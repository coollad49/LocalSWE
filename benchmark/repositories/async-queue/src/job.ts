export interface Job<T = unknown> {
  id: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
}
