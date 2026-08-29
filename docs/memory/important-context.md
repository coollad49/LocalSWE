# Important Context

- Spec in `docs/benchmark-spec.md` v0.1 is source of truth; benchmark must be immutable during baseline/agent experiments.
- Agent view vs evaluator view is filesystem-isolated: `public/` vs `private/` + `artifacts/buggy/`. Never expose private to agent.
- All cases use behavioral verification (hidden tests), not patch text similarity.
- Bun 1.4.0 is package manager/runtime; no npm/node required except via Bun.
- Repositories are synthetic to avoid external flakiness; license MIT documented per manifest.
