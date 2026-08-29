# Benchmark Repositories

7 repositories: 3 benchmark-owned (synthetic) + 4 external historical (genuine), all MIT, small/medium, deterministic, no external service dependencies. Benchmark target 3–5 initially, expanded to 7 to meet 6 genuine historical non-negotiable requirement.

| Repository | Source | Description | Tests | Cases |
| ---------- | ------ | ----------- | ----- | ----- |
| task-manager | `frontier-verifier` synthetic | Todo/task management (CRUD, overdue, validation, cache) | `bun test tests/task-manager.test.ts` (11 tests) | synth-001, synth-004 |
| money-utils | `frontier-verifier` synthetic | Currency/money (create, parse, format, add, convert, rounding) | `bun test tests/money.test.ts` (10 tests) | synth-002, synth-005 |
| async-queue | `frontier-verifier` synthetic | Async job queue (enqueue, pause/resume, retry, process) | `bun test tests/queue.test.ts` (9 tests) | synth-003, synth-006 |
| cac | `cacjs/cac` 6.0.0 @ ffaf796 | CLI framework (option parsing, defaults) | `bun test tests/cac.test.ts` (4 tests) | hist-001 |
| defu | `unjs/defu` 6.1.4 @ 3942bfb | Object merging (prototype safety) | `bun test tests/defu.test.ts` (7 tests) | hist-002 |
| tinyspy | `tinylibs/tinyspy` 4.0.2 @ 0372bfb & 0684083 | Spy/mocking (prototype descriptor) | `bun test tests/tinyspy.test.ts` (3 tests) | hist-003, hist-006 |
| mri | `lukeed/mri` 1.1.4 @ 5437ea5 | CLI arg parser (type/coercion) | `bun test tests/mri.test.ts` (9 tests) | hist-004, hist-005 |

## Provenance

- **Synthetic (task-manager, money-utils, async-queue):** Source `https://github.com/frontier-verifier/<repo>` (benchmark-owned), version 1.0.0, generated locally 2026-08-29.
- **External historical:**
  - `cac` https://github.com/cacjs/cac @ ffaf796 (PR #153), MIT, version 6.0.0
  - `defu` https://github.com/unjs/defu @ 3942bfb (PR #156), MIT, version 6.1.4
  - `tinyspy` https://github.com/tinylibs/tinyspy @ 0372bfb & 0684083 (commit 0372bfb, PR #50), MIT, version 4.0.2
  - `mri` https://github.com/lukeed/mri @ 94f8c09 & 5437ea5 (Issues #8, #10), MIT, version 1.1.4
- **License:** All MIT (`https://opensource.org/licenses/MIT`), see each `provenance.md` and `manifest.json`.
- **Retrieval:** 2026-08-29 via `git archive` from pinned commits, verified buggy→fail / fixed→pass 3×.
- **Runtime:** Node 22, Bun 1.4.0, `bun install` small deps (mri 0, others minimal).
- **Modifications:** Benchmark-owned none except per-case buggy overlays; external historical at known-good fixed state, buggy overlays under `benchmark/cases/<id>/artifacts/buggy/...` (documented).

All repositories small to allow cheap agent iteration and deterministic verification. External historical added to satisfy 6 genuine historical requirement.
