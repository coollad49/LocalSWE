import { mkdirSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function ensureDir(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

export function sanitizeCaseId(caseId: string): string {
  if (!/^(hist|synth)-[0-9]{3}$/.test(caseId)) {
    throw new Error(`Invalid caseId: ${caseId}`);
  }
  return caseId;
}
