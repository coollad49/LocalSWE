# Historical Candidate Evaluation — Phase 2

**Date:** 2026-08-29
**Validator:** v0.2 isolated, fingerprint `sha256:42a6ef0ca...`
**Goal:** 6 genuine historical bugs (buggy commit → fail, fixed commit → pass, hidden oracle)
**Status:** 1 strong candidate validated, 1 strong alternative within same repo, 2 weak/rejected. Not enough to replace all 6 `hist-*` without further search. Current `hist-*` remain as synthetic-pattern pending incremental replacement.

---

## Provided List vs Independent Findings — Comparison

| Rank | Provided Candidate | Independent Verdict | Provided Claim | Actual Finding | Recommendation |
|------|-------------------|---------------------|----------------|----------------|----------------|
| 1 | `unjs/defu` PR #99/#174 | **REJECT as described** (but repo excellent) | Array merging & custom mergers | `e0e2644` #99 is docs-only (`README.md:135` `['a','b','c']` → `['b','c','a']`); `#174` is `fn/arrayFn/extend` attachment (`cb7accf`), not array. Real array feat `22c631e` 2020-07-28 is feature, not bug. | **Pick alternative within same repo:** `3942bfb fix: prevent prototype pollution via __proto__ (#156)` or `4111333 fix: only merge plain objects (#111)` — both are genuine, small, sync, zero-deps, `src/defu.ts:10-30`, vitest, deterministic. Rank would be **1** if cited correctly. |
| 1 (independent) | `cacjs/cac` PR #153 `ffaf796` | **KEEP — strongest** | Mixed option names default | **Confirmed** `ffaf796^` buggy `for(name of cliOption.names) options[name]=default` vs fixed `filter(parsed[name]!==undefined)` length 0 check. Repro sync, no env mock, 4 tests added `src/__test__/index.test.ts:506`, cheap. | **Pick this as first real historical case.** |
| 2 | `sindresorhus/p-limit` | **KEEP — 2nd best** | AbortSignal/clearQueue lifecycle | `ef37eb2` detached `limit.map` (`this(function_,value)` → `generator(...)`) — 1-line, deterministic, but async timing `590-650ms` + `ava` needs real `node` for `AbortError` shape (`v8.takeCoverage NotImplemented` on Bun). Other commit `8907801` is feature. | **Viable but trivial fix, async flaky risk.** Prefer `cac` first. |
| 3 | `lukeed/kleur` `ec20016` | **WEAK KEEP — fragile** | `process.env` fallback | Confirmed `({FORCE_COLOR}=process.env)` → `process.env || {}` 2-char fix, but requires mutating global `process.env=undefined`, stale `uvu+esm` harness, browser/Vite-specific, `isTTY` nondeterm. | **Do not pick** — fragile env mock, violates isolation. |

**Provided list quality:** 1/4 as described is solid (`cac`), 1/4 repo excellent but cited PRs wrong (`defu`), 1/4 viable but trivial/flaky (`p-limit`), 1/4 fragile (`kleur`). Independent search found better PRs within same repos (`defu` alternative). Neither list yields 6 distinct solid historical bugs without further search.

---

## Evaluation Evidence

**All repos:** MIT, small/medium, no cloud deps, ESM+TS/JS, <2M git.

- `defu` `/tmp/fv-eval/defu:928K` `src 197 LOC` `src/defu.ts:10` `[...value,...object[key]]`, `vitest 4.1.11`, `pnpm`, `173 commits`
- `cac` `/tmp/fv-eval/cac:1.2M` `src/cac.ts~350` `src/option.ts:62`, `vitest`, `162 commits`
- `p-limit` `340K` `index.js 169 LOC`, `ava 6.4.1`, `50+ commits`
- `kleur` `376K` `index.mjs 83 LOC`, `uvu 0.3.3`, `125 commits`

**Detailed checks performed (2026-08-29):**
- Shallow clone + `git show` of cited commits
- `bun install` + `bun test`/`vitest run` with `node` shim (`/tmp/fakebin`)
- Manual checkout `ffaf796^` vs `ffaf796` repro (sync)
- `process.env` destructure TypeError verified `/tmp/test_kleur_env.js`

---

## Decision: Pick Whichever Is Better

**Winner:** `cacjs/cac@ffaf796` (provided list #2) — only candidate that is simultaneously genuine historical, deterministic sync, no env mock, small, MIT, and has explicit buggy→fixed diff with 4 oracle tests. Independent alternative `defu@3942bfb` (prototype pollution) would be equal or better but was not in provided list as described.

**Action:** Keep current `hist-001..006` as **synthetic-pattern** (honest provenance) for `v0.2` freeze; add `cac` as first incremental real historical candidate under `benchmark/candidates/` or `hist-007` only after full case construction passes `v0.2` validator (temp isolated, path contained, 3× oracle). Do not replace all 6 until each passes strict acceptance (`buggy→fail / fixed→pass / oracle 3×`).

---

## What Would Be Needed for 6 Real Historical

To reach 6, need 5 more distinct repos/PRs beyond `cac` + `defu` alternative. Options not in provided list that were briefly considered (not deeply evaluated due to time):
- `tinyspy` / `vitest` mock bugs (small, sync)
- `mri` (cac dependency) flag parsing
- `yocto-queue` (p-limit dep) micro-queue
- Further `defu` bugs (`11ba022`, `1b9fcab`) could provide 2 more distinct cases within same repo but would reduce repo diversity (violates 3–5 repo target).

**Recommendation:** Time-box further search; if 6 not found quickly, freeze `v0.2` with honest `pattern-*` labeling and report shortfall (quality > count per `docs/benchmark-spec.md:16`).

---

## Reproducibility Note

All checks run with `Bun 1.4.0`, `tmpdir` isolation, `git log` evidence. Candidate `cac` buggy state can be reproduced via:
```bash
git clone https://github.com/cacjs/cac /tmp/cac
cd /tmp/cac && git checkout ffaf796^
# run repro: cac().option('-b, --base-url <url>', {default:'https://github.com'}).parse(['node','bin','--base-url','https://gitlab.com']) -> buggy gives {b: 'https://github.com', baseUrl: 'https://gitlab.com'}
git checkout ffaf796
# same repro -> fixed gives {baseUrl:'https://gitlab.com'} (and b mirrors if -b used)
```
