# Important Context

- Spec in `docs/benchmark-spec.md` v0.4 FROZEN is source of truth; benchmark `cead5c6e...` must be immutable during baseline/evaluator/agent experiments (any change → v0.5, never mix versions).
- Agent view vs evaluator view is filesystem-isolated: agent receives `public/reproduce.ts` + `issue.md` via temp workspace with import rewrite; evaluator alone accesses `private/oracle.test.ts` + `artifacts/buggy/` via isolated temp (`benchmark/repositories` + `benchmark/cases` copy). Never mount `private/` into agent.
- All cases use behavioral verification (hidden tests + reproduction + regression), not patch text similarity; evaluator treats oracle as opaque (only exit code).
- Bun 1.4.0 is package manager/runtime; npm/pnpm/yarn also supported via `vitest`/`tsx` fallback, but `bun.lock` retained.
- Repositories are 3 synthetic + 4 genuine historical (cac, defu, tinyspy, mri), all MIT, deterministic.
- Evaluator v0 is frozen deterministic infrastructure (see `docs/decisions/evaluator-v0.md`): 4 verdicts, benchmark identity check, secure spawn, evidence in `experiments/runs/<runId>/evaluation/`.
