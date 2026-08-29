# Historical Candidate Evaluation — Complete (6/6 Genuine)

**Date:** 2026-08-29 v0.4 FROZEN
**Validator:** v0.4 isolated, fingerprint `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` (FROZEN; v0.3 `6938f031...` discarded)
**Goal:** 6 genuine historical bugs (buggy commit → fail, fixed commit → pass, hidden oracle) — **ACHIEVED 6/6**
**Status:** 6 strong genuine historical cases constructed and validated (see CASE-MATRIX.md). Additional tinyspy/mri/yocto-queue evaluations below document how 6 were selected.

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

**Action (Completed v0.4 FROZEN):** Constructed 6 genuine historical cases via parallel subagents (all passed isolated v0.4 validator 3×, FROZEN):
- `hist-001` cac @ ffaf796 (validation parsing, PL #153)
- `hist-002` defu @ 3942bfb (security, PL #156)
- `hist-003` tinyspy @ 0372bfb (state, commit 0372bfb)
- `hist-004` mri @ 94f8c09 (parsing type-coercion, Issue #8)
- `hist-005` mri @ 5437ea5 (parsing alias, Issue #10)
- `hist-006` tinyspy @ 0684083 (state, PR #50)
See CASE-MATRIX.md for full details and provenance. Fingerprint `cead5c6e...` FROZEN after `issue.md+provenance.md` inclusion (v0.4).

---

## Additional Candidates Evaluated to Reach 6

**Phase 2b — tinyspy / mri / yocto-queue (requested by user to reach 6 non-negotiable):**

| Repo | Commit | Verdict | Reason |
|------|--------|---------|--------|
| tinyspy @ 0372bfb | 0372bfb | **KEEP strong** — prototype restore leak, sync deterministic, 3× validated via subagent, chosen as hist-003 |
| tinyspy @ 0684083 | 0684083 | **KEEP strong** — inherited methods, sync, chosen as hist-006 |
| mri @ 94f8c09 | 94f8c09 | **KEEP strong** — boolean defaults leak, sync, chosen as hist-004 |
| mri @ 5437ea5 | 5437ea5 | **KEEP strong** — alias cascade, sync, chosen as hist-005 |
| yocto-queue @ ee91589 | ee91589 | **WEAK** — drain ignores undefined (1 strong case, but second fix #14 is GC leak not observable, 90 LOC too small, family overlap with p-limit) — not chosen, would be filler if needed |
| yocto-queue @ 8aead27 | 8aead27 | **REJECT** — stale tail GC leak not observable via public API |

**Provided list vs independent:** Provided 1/4 solid (cac), 1/4 wrong PR but repo excellent (defu alternative 3942bfb chosen), 1/4 fragile (kleur rejected), 1/4 trivial (p-limit not needed after 6 found). Independent tinyspy/mri provided the remaining 4 to reach 6.

**What was not chosen:** `sindresorhus/p-limit` detached map (trivial 1-line, async timing), `lukeed/kleur` process.env (fragile global mock) — both evaluated but not needed after achieving 6 strong.

**Recommendation (now obsolete):** 6 achieved, no further search needed. If expanding to 7th, yocto-queue ee91589 could be added as weak filler with note.

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
