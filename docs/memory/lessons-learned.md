# Lessons Learned

- Float rounding (1.005) requires epsilon handling; initial money-utils tests failed until epsilon added.
- synth-005 initial rate 0.9234 produced no floor vs round difference; need half-cent edge (0.92345) to ensure behavioral difference.
- File path resolution for imports from cases must use 3 levels (`../../../repositories`) to reach benchmark root correctly.
- In-place file swapping validator is simple but requires careful backup/restore; evaluator correctly uses temp dir copies (`mkdtemp` + `cpSync`) for isolation — validated that `git status` stays clean.
- `git apply --check` requires exact context; hand-crafted patches with wrong line counts fail `corrupt patch`; generating patches via `git diff` after actual file edit ensures validity (used for `synth-001` buggy/partial/regression fixtures).
- Patch validation must happen even when `patchContent` is provided directly (not just when loading from file); evaluator initially missed traversal check for inline patches.
- Bun-first with fallback (`bun run` → `node_modules/.bin/tsx`/`vitest` → `npx`) is necessary for npm/pnpm/yarn users without bun; `exec` must detect `ENOENT` and fallback, not treat test failure as missing binary.
- Validation-report timestamp changes on every `benchmark:validate` run (not part of fingerprint); `git checkout -- benchmark/validation-report.json` keeps status clean for evaluator changes.
