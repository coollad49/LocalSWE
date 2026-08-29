import type { EvaluationResult, HistoricalVsSyntheticBreakdown, DifficultyBreakdown, CategoryBreakdown, GroupMetrics } from "./types.ts";
import { computeGroupMetrics } from "./aggregation.ts";

function emptyGroup(): GroupMetrics {
  return {
    total: 0,
    verified: 0,
    vfr: 0,
    reproductionRate: 0,
    oracleRate: 0,
    regressionFreeRate: 0,
    falseConfidenceRate: 0,
  };
}

export function computeHistoricalVsSynthetic(results: EvaluationResult[]): HistoricalVsSyntheticBreakdown {
  const hist = results.filter((r) => r.caseMeta?.type === "historical" || r.caseId.startsWith("hist-"));
  const synth = results.filter((r) => r.caseMeta?.type === "synthetic" || r.caseId.startsWith("synth-"));
  // Fallback to caseId prefix if caseMeta missing
  return {
    historical: hist.length ? computeGroupMetrics(hist) : emptyGroup(),
    synthetic: synth.length ? computeGroupMetrics(synth) : emptyGroup(),
  };
}

export function computeDifficultyBreakdown(results: EvaluationResult[]): DifficultyBreakdown {
  const easy = results.filter((r) => r.caseMeta?.difficulty === "easy");
  const medium = results.filter((r) => r.caseMeta?.difficulty === "medium");
  const hard = results.filter((r) => r.caseMeta?.difficulty === "hard");
  return {
    easy: easy.length ? computeGroupMetrics(easy) : emptyGroup(),
    medium: medium.length ? computeGroupMetrics(medium) : emptyGroup(),
    hard: hard.length ? computeGroupMetrics(hard) : emptyGroup(),
  };
}

export function computeCategoryBreakdown(results: EvaluationResult[]): CategoryBreakdown {
  const map = new Map<string, EvaluationResult[]>();
  for (const r of results) {
    const cats = r.caseMeta?.categories ?? [];
    // If no categories, skip (don't create empty bucket)
    for (const cat of cats) {
      const arr = map.get(cat) ?? [];
      arr.push(r);
      map.set(cat, arr);
    }
  }
  const out: CategoryBreakdown = {};
  for (const [cat, arr] of map.entries()) {
    out[cat] = computeGroupMetrics(arr);
  }
  // If no categories found, try to at least sort keys
  const sorted: CategoryBreakdown = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k]!;
  return sorted;
}
