# Benchmark Repositories

3 benchmark-owned TypeScript libraries, MIT licensed, small/medium, deterministic, no external service dependencies.

| Repository | Description | Tests | Cases |
| ---------- | ----------- | ----- | ----- |
| task-manager | Todo/task management (CRUD, overdue, validation, cache) | `bun test tests/task-manager.test.ts` (11 tests) | hist-001, hist-004, synth-001, synth-004 |
| money-utils | Currency/money (create, parse, format, add, convert, rounding) | `bun test tests/money.test.ts` (10 tests) | hist-002, hist-005, synth-002, synth-005 |
| async-queue | Async job queue (enqueue, pause/resume, retry, process) | `bun test tests/queue.test.ts` (9 tests) | hist-003, hist-006, synth-003, synth-006 |

## Provenance

- **Source URL:** `https://github.com/frontier-verifier/<repo>` (synthetic, benchmark-owned)
- **License:** MIT (`https://opensource.org/licenses/MIT`)
- **Version:** 1.0.0 (known-good), `v1.0.0-<repo>` in manifests
- **Retrieval:** 2026-08-29, generated locally
- **Runtime:** Node 22, Bun 1.4.0, `bun install` (no extra deps)
- **Modifications:** None except per-case buggy overlays under `benchmark/cases/<id>/artifacts/buggy/src/...` (documented in each `provenance.md`)

All repositories are intentionally small to allow cheap agent iteration and deterministic verification.
