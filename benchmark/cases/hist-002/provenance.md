# Provenance — hist-002

- **Repository:** defu (benchmark/repositories/defu, mirrors unjs/defu)
- **Source URL:** https://github.com/unjs/defu
- **License:** MIT (https://opensource.org/licenses/MIT)
- **Base version:** 6.1.4
- **Fixed commit:** 3942bfbbcaa72084bd4284846c83bd61ed7c8b29 (fix: prevent prototype pollution via `__proto__` in defaults (#156), 2026-04-02)
- **Buggy commit:** d3ef16dabe861713192ba8679c5db8e0ac143f9b (parent of 3942bfb)
- **Issue URL:** https://github.com/unjs/defu/pull/156
- **File changed:** src/defu.ts (1 line: `Object.assign({}, defaults)` → `{ ...defaults }`)
- **Historical bug:** `Object.assign({}, defaults)` pollutes result prototype when `defaults` contains `__proto__` (e.g., `JSON.parse('{"__proto__":{"polluted":true}}')`). Spread preserves `__proto__` as own property without prototype pollution. See `src/defu.ts:10`.
- **Retrieval method:** `git archive` from fixed commit 3942bfb for src/defu.ts, src/_utils.ts, src/types.ts to /tmp/fv-eval/defu; copied to benchmark/repositories/defu; package.json version from fixed commit; buggy snapshot from parent commit via git archive to artifacts/buggy/src/defu.ts
- **Retrieval date:** 2026-08-29
- **Modifications by benchmark:** Minimal: added src/index.ts re-export, package.json with `type: module`, and regression tests in tests/defu.test.ts; no modification to core logic beyond preserving fixed state.
- **Verification:** buggy state reproduces prototype pollution (result.polluted true via prototype), fixed state blocks it; oracle checks 3× stability; regression `bun test tests/` passes
