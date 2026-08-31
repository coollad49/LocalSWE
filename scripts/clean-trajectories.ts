#!/usr/bin/env tsx
/**
 * Vacuum / Shrink Utility for Experiment Trajectories
 * Removes quadratic streaming chunk lines ("message_update") from trajectory.jsonl files
 * to shrink gigabyte-scale logs down to clean, compact JSONL files.
 *
 * Usage:
 *   bun run scripts/clean-trajectories.ts
 */

import { readdir, stat, readFile, writeFile, unlink } from "node:fs/promises";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RUNS_DIR = join(ROOT, "experiments/runs");

async function shrinkTrajectoryFile(filePath: string): Promise<{ origBytes: number; newBytes: number; linesRemoved: number }> {
  const origStat = await stat(filePath);
  const origBytes = origStat.size;

  const tempPath = `${filePath}.tmp`;
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });
  const outStream = createWriteStream(tempPath, { encoding: "utf-8" });

  let linesRemoved = 0;
  let linesKept = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    // Filter out streaming token deltas
    if (line.includes('"type":"message_update"') || line.includes('"type": "message_update"')) {
      linesRemoved++;
      continue;
    }
    outStream.write(line + "\n");
    linesKept++;
  }

  await new Promise<void>((resolvePromise) => outStream.end(() => resolvePromise()));

  const newStat = await stat(tempPath);
  const newBytes = newStat.size;

  if (linesRemoved > 0) {
    // Replace original file with shrunk file
    await writeFile(filePath, await readFile(tempPath));
    await unlink(tempPath).catch(() => {});
  } else {
    await unlink(tempPath).catch(() => {});
  }

  return { origBytes, newBytes, linesRemoved };
}

async function main(): Promise<void> {
  if (!existsSync(RUNS_DIR)) {
    console.log("No experiments/runs directory found.");
    return;
  }

  console.log("==============================================================================");
  console.log("  Frontier Verifier — Trajectory Log Vacuum Utility");
  console.log("==============================================================================");

  const entries = await readdir(RUNS_DIR, { withFileTypes: true });
  let totalOrigBytes = 0;
  let totalNewBytes = 0;
  let totalLinesRemoved = 0;
  let processedFiles = 0;

  for (const entry of entries) {
    let trajPath = "";
    if (entry.isDirectory()) {
      trajPath = join(RUNS_DIR, entry.name, "trajectory.jsonl");
    } else if (entry.name.endsWith(".jsonl")) {
      trajPath = join(RUNS_DIR, entry.name);
    }

    if (trajPath && existsSync(trajPath)) {
      try {
        const { origBytes, newBytes, linesRemoved } = await shrinkTrajectoryFile(trajPath);
        totalOrigBytes += origBytes;
        totalNewBytes += newBytes;
        totalLinesRemoved += linesRemoved;
        processedFiles++;

        if (linesRemoved > 0) {
          const origMb = (origBytes / (1024 * 1024)).toFixed(2);
          const newMb = (newBytes / (1024 * 1024)).toFixed(2);
          console.log(`  ✓ ${entry.name}: ${origMb} MB → ${newMb} MB (-${linesRemoved} stream lines)`);
        }
      } catch (e: any) {
        console.warn(`  Failed to process ${trajPath}: ${e.message}`);
      }
    }
  }

  const savedMb = ((totalOrigBytes - totalNewBytes) / (1024 * 1024)).toFixed(2);
  const savedGb = ((totalOrigBytes - totalNewBytes) / (1024 * 1024 * 1024)).toFixed(2);
  const finalMb = (totalNewBytes / (1024 * 1024)).toFixed(2);

  console.log("==============================================================================");
  console.log(`  Processed:      ${processedFiles} trajectory files`);
  console.log(`  Space Saved:    ${savedGb} GB (${savedMb} MB)`);
  console.log(`  Final Size:     ${finalMb} MB (was ${(totalOrigBytes / (1024 * 1024 * 1024)).toFixed(2)} GB)`);
  console.log("==============================================================================\n");
}

main().catch((e) => {
  console.error("Vacuum failed:", e);
  process.exit(1);
});
