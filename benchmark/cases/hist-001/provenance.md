# Provenance — hist-001

- **Repository:** cac (benchmark/repositories/cac)
- **Source URL:** https://github.com/cacjs/cac
- **License:** MIT (https://opensource.org/licenses/MIT)
- **Base version:** 6.0.0
- **Fixed commit:** ffaf796fc5a0d776147178055b91677346c0e69a (`fix: mix of parsed and non-parsed option names getting default value`)
- **Buggy commit:** 8342919821fbffa733c6ab9558f4d60fc43f9ff0 (parent of fixed, ffaf796^)
- **Issue / PR:** https://github.com/cacjs/cac/pull/153
- **Bug location:** `src/CAC.ts` `mri` default-value loop (lines 289-295)
- **Buggy behavior:** For each `cliOption` with a default, buggy code unconditionally sets `options[name] = default` for all `cliOption.names`. When one alias (e.g., `--base-url`) is parsed via `mri`, the other alias (`b`) still receives the default value, leaking stale default: `{ b: "https://github.com", baseUrl: "https://gitlab.com" }`.
- **Fixed behavior:** Fixed code computes `parsedOptionNames = cliOption.names.filter(n => parsed[n] !== undefined)` and only applies defaults if none of the names were parsed (`parsedOptionNames.length === 0`). For `--base-url https://gitlab.com`, `parsed` contains only `baseUrl`, so `b` is not set to default, yielding `{ baseUrl: "https://gitlab.com" }`. For `-b https://gitlab.com`, mri mirrors both aliases, so `parsed` contains both `b` and `baseUrl`, correctly yielding `{ b: "https://gitlab.com", baseUrl: "https://gitlab.com" }`.
- **Verification:** `public/reproduce.ts` checks both `--base-url` (no leak) and `-b` (both present) and no-args defaults; `private/oracle.test.ts` replicates 4 upstream tests from PR (default, names 1/2/3).
- **Retrieval date:** 2026-08-29
- **Retrieval method:** `git clone https://github.com/cacjs/cac /tmp/fv-eval/cac && git show ffaf796 / ffaf796^`
- **Modifications by benchmark:** Copied `src/CAC.ts, src/Command.ts, src/Option.ts, src/utils.ts, src/index.ts, src/node.ts, src/deno.ts` at fixed commit into `benchmark/repositories/cac`; created minimal `package.json` (`type: module`, version 6.0.0, dependency `mri ^1.1.6`) and `LICENSE`; added regression suite `tests/cac.test.ts`. Buggy snapshot stored under `artifacts/buggy/src/CAC.ts`. No other modifications.
- **Reproducibility:** Deterministic sync, no env mock, `Bun 1.4.0` with `bun run` ESM TS import.
