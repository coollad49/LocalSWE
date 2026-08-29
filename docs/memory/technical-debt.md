# Technical Debt

- Evaluator timeouts heuristic (15s/20s/30s) may misclassify very slow but correct patches; configurable but not yet tuned per repo (e.g., `cac` vs `async-queue`).
- Evaluator does not sandbox CPU/memory/network beyond temp workspace; untrusted patch could exhaust resources (future: cgroups/ns).
- tsconfig excludes artifacts/private/public and historical `cac`/`mri` from type-check; consider moving them to separate tsconfig (done for `tsconfig.benchmark.json` but not for evaluator).
- No JSON schema validation yet in validator (only manual checks); evaluator types are not JSON-schema-validated on read.
- Provenance.md per case is minimal; could include full license text.
- `experiments/runs` ignored via .gitignore — aggregation across runs currently via `evaluate --all` (no centralized DB).
