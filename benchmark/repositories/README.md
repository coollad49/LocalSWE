# Benchmark Repositories

12 repositories: 7 Core (3 benchmark-owned synthetic + 4 external historical genuine) + 5 Frontier-Hard (all genuine historical), all MIT/BSD-3, small/medium, deterministic, no external service dependencies. Benchmark v0.5 — 17 cases.

| Repository | Source | Description | Tests | Cases | Type |
| ---------- | ------ | ----------- | ----- | ----- | ---- |
| task-manager | `frontier-verifier` synthetic | Todo/task management (CRUD, overdue, validation, cache) | `bun test tests/task-manager.test.ts` (11 tests) | synth-001, synth-004 | Core |
| money-utils | `frontier-verifier` synthetic | Currency/money (create, parse, format, add, convert, rounding) | `bun test tests/money.test.ts` (10 tests) | synth-002, synth-005 | Core |
| async-queue | `frontier-verifier` synthetic | Async job queue (enqueue, pause/resume, retry, process) | `bun test tests/queue.test.ts` (9 tests) | synth-003, synth-006 | Core |
| cac | `cacjs/cac` 6.0.0 @ ffaf796 | CLI framework (option parsing, defaults) | `bun test tests/cac.test.ts` (4 tests) | hist-001 | Core |
| defu | `unjs/defu` 6.1.4 @ 3942bfb | Object merging (prototype safety) | `bun test tests/defu.test.ts` (7 tests) | hist-002 | Core |
| tinyspy | `tinylibs/tinyspy` 4.0.2 @ 0372bfb & 0684083 | Spy/mocking (prototype descriptor) | `bun test tests/tinyspy.test.ts` (3 tests) | hist-003, hist-006 | Core |
| mri | `lukeed/mri` 1.1.4 @ 5437ea5 | CLI arg parser (type/coercion) | `bun test tests/mri.test.ts` (9 tests) | hist-004, hist-005 | Core |
| immer | `immerjs/immer` 10.0.3-beta @ a73672a | Immutable drafts via proxies (arrayMethods) | `bun test tests/basic.test.ts` (2 tests) | hard-001 | Frontier-Hard |
| qs | `ljharb/qs` 6.15.3 @ d56f48c | Querystring parsing (arrayLimit) | `bun test tests/basic.test.ts` (3 tests) | hard-002 | Frontier-Hard |
| superjson | `blitz-js/superjson` 2.2.5 @ 4054f3f | Serialization (path escaping) | `bun test tests/basic.test.ts` (2 tests) | hard-003 | Frontier-Hard |
| p-queue | `sindresorhus/p-queue` 9.1.0 @ a64b316 | Promise queue (concurrency, signal) | `bun test tests/basic.test.ts` (2 tests) | hard-004 | Frontier-Hard |
| path-to-regexp | `pillarjs/path-to-regexp` 8.4.2 @ 8877f41 | Path to RegExp utility (stringify) | `bun test tests/basic.test.ts` (2 tests) | hard-005 | Frontier-Hard |

## Provenance

- **Synthetic (task-manager, money-utils, async-queue):** Source `https://github.com/frontier-verifier/<repo>` (benchmark-owned), version 1.0.0, generated locally 2026-08-29.
- **External historical — Core (7):**
  - `cac` https://github.com/cacjs/cac @ ffaf796 (PR #153), MIT, version 6.0.0
  - `defu` https://github.com/unjs/defu @ 3942bfb (PR #156), MIT, version 6.1.4
  - `tinyspy` https://github.com/tinylibs/tinyspy @ 0372bfb & 0684083 (commit 0372bfb, PR #50), MIT, version 4.0.2
  - `mri` https://github.com/lukeed/mri @ 94f8c09 & 5437ea5 (Issues #8, #10), MIT, version 1.1.4
- **External historical — Frontier-Hard (5):**
  - `immer` https://github.com/immerjs/immer @ a73672a (PR #1255), MIT, version 10.0.3-beta
  - `qs` https://github.com/ljharb/qs @ d56f48c (PR #558), BSD-3-Clause, version 6.15.3
  - `superjson` https://github.com/blitz-js/superjson @ 4054f3f (PR #311), MIT, version 2.2.5
  - `p-queue` https://github.com/sindresorhus/p-queue @ a64b316 (Issue #241), MIT, version 9.1.0
  - `path-to-regexp` https://github.com/pillarjs/path-to-regexp @ 8877f41 (PR #451), MIT, version 8.4.2
- **License:** All MIT/BSD-3 (`MIT: https://opensource.org/licenses/MIT`, `BSD-3: https://opensource.org/licenses/BSD-3-Clause`), see each `provenance.md` and `manifest.json`.
- **Retrieval:** 2026-08-29 via `git archive` from pinned commits, verified buggy→fail / fixed→pass 3×, isolated temp workspaces.
- **Runtime:** Node 22, Bun 1.4.0, `bun install` small deps (mri 0, others minimal; `side-channel`/`copy-anything`/`eventemitter3`/`p-timeout` via `NODE_PATH` or `node_modules` in repo for temp).
- **Modifications:** Benchmark-owned none except per-case buggy overlays; external historical at known-good fixed state, buggy overlays under `benchmark/cases/<id>/artifacts/buggy/...` or `benchmark/frontier-hard/cases/<id>/artifacts/buggy/...` (documented). `superjson` `src/index.ts` patched `import type` for `Class`/`SuperJSONResult` (harness only, non-logic), `p-queue` `tsconfig.json` adjusted for vitest — documented in provenance.

All repositories small to allow cheap agent iteration and deterministic verification. Core's 7 repos preserved; Frontier-Hard's 5 added to eliminate 100% VFR ceiling. The benchmark is now 12 repos, 17 cases, with the 5 hard cases deliberately chosen for high reasoning, not large repo size.
