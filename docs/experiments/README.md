# Experiments — Frontier Verifier

## Layout

```
experiments/
├── config/
│   ├── baseline.json      # baseline-v0 config (Pi 0.84.4, opencode-go/muse-spark-1.2-contributor)
│   ├── agent-v1.json      # agent-v1 config (+ maxIterations 5)
│   └── pricing.json       # pricing snapshot (input $0.15/M, output $0.60/M)
├── agents/
│   ├── baseline-v0.md
│   └── agent-v1.md
├── runs/<runId>/          # per-run artifacts
│   ├── metadata.json      # RunMetadata (+ v1:{iterationCount,...} for V1)
│   ├── result.json        # RepairRun
│   ├── patch.diff
│   ├── trajectory.jsonl
│   ├── v1-state.json      # V1 only (WorkflowEngine state)
│   └── evaluation/result.json (+ *.log)
├── reports/<experiment-id>/ # primary evaluator output (v1)
│   ├── report.json        # source of truth (ExperimentReport)
│   ├── report.md          # rendered markdown
│   ├── summary.json       # lightweight dashboard
│   └── cases/<runId>.json # per-run truncated
└── evaluations/<id>/      # compat (also written, same content as reports)
```

## Running

```bash
# V0
bun run baseline:run -- --mock --runs 1 --concurrency 1
bun run evaluate -- --experiment baseline-v0
bun run evaluate:experiment -- --experiment baseline-v0  # alias

# V1
bun run v1:run -- --mock --runs 1
bun run evaluate -- --experiment v1 --runs-dir experiments/runs --force --pricing experiments/config/pricing.json
```

## Evaluator Report Schema

`report.json` is source of truth; `report.md` is rendering (never edited manually).

```
ExperimentReport {
  experiment: { id, runsDir, timestamp, totalRuns, elapsedMs }
  benchmark: { version, fingerprint }
  evaluatorVersion: "0.0.0"
  agents: AgentMetrics[]           # per agentVersion
  summary: AggregatedMetrics       # overall
  breakdowns: { historicalVsSynthetic, byDifficulty, byCategory }
  stability: CaseStability[]
  caseBreakdown: CaseReportRow[]  # per case × agent
  comparison: ComparisonRow[]|null # V0 vs V1 delta in pp
  failures: { agentFailures, falseConfidences, regressionFailures, timeouts, infrastructureErrors }
  costMethodology: { pricingSnapshot, costCalculation, note }
  limitations: string[]           # small-sample disclaimer etc
  results: EvaluationResult[]     # per-run with metrics/cost
  validRunRate: { vfrOverall, vfrValid, total, valid, infraErrors }
}
```

- Deterministic: sorted by `caseId`/`runId`/`agentVersion`; `timestamp` not in hash.
- `report.md` renders all sections; `summary.json` is dashboard subset.

## Cost Methodology

- Snapshot `experiments/config/pricing.json` version `2026-08-30-snapshot` is copied into every `report.json: costMethodology.pricingSnapshot` for historical reproducibility.
- Formula: `inputCost = inputTokens/1M * inputUsdPerMillion; outputCost = outputTokens/1M * outputUsdPerMillion; total = input+output`.
- Prefer provider-returned `cost` if trustworthy (`costSource: provider`), else compute (`computed`).
- **Guardrail:** If `inputTokens` is `null`, evaluator outputs `costUsd: null, costStatus: "unavailable"` even though pricing exists. Never `$0.00`.

Pi 0.84.4 currently does not expose `tokenUsage` in `metadata.json`/`trajectory.jsonl`, so most runs report `costStatus: unavailable` — `pricing.json` exists but is not used to invent costs.

## Limitations

- Results are descriptive measurements, not statistically powered estimates. With 3 runs/case small differences are not conclusive.
- VFR reported both overall (`verified/total`) and valid (`verified/valid` where valid = total − infra errors).
- Bun’s CLI may not propagate `process.exit(2)` from async `await` chains; evaluator uses `process.exitCode = 2; throw new Error("BENCHMARK_FINGERPRINT_MISMATCH")` and documents the mismatch — use `npx tsx` or check `report.json` error for authoritative signal.
