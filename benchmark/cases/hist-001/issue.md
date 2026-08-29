# Issue: Option default leaks to alias names when one alias parsed

**Repository:** `cac` (`cacjs/cac`)
**Component:** `src/CAC.ts` — default value handling in `mri()` parser
**PR:** https://github.com/cacjs/cac/pull/153
**Commit:** fixed `ffaf796`, buggy parent `8342919`

## Description

When an option has multiple names/aliases (e.g., `-b, --base-url`) and a default value, the default was incorrectly applied to **all** alias names even when one alias was already parsed from the command line.

For example:

```ts
import { cac } from "./src/index.ts";

const cli = cac();
cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
  default: "https://github.com",
});

// Using long name only
const { options } = cli.parse(
  ["node", "bin", "--base-url", "https://gitlab.com"],
  { run: false }
);
console.log(options);
// Expected (fixed): { baseUrl: "https://gitlab.com", "--": [] }
// Actual (buggy):   { b: "https://github.com", baseUrl: "https://gitlab.com", "--": [] }
//                    ^ leaked default for short alias
```

The same option with the short flag works only by accident (mri mirrors both names for `-b`):

```ts
cli.parse(["node", "bin", "-b", "https://gitlab.com"], { run: false })
// Both buggy and fixed give { b: "https://gitlab.com", baseUrl: "https://gitlab.com" }
```

## Steps to Reproduce

```ts
import { cac } from "../../../repositories/cac/src/index.ts";

const cli = cac();
cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
  default: "https://github.com",
});

// 1) Long form — should NOT leak `b`
let { options } = cli.parse(
  ["node", "bin", "--base-url", "https://gitlab.com"],
  { run: false }
);
console.log(options);
// Buggy: { b: "https://github.com", baseUrl: "https://gitlab.com" }
// Fixed: { baseUrl: "https://gitlab.com" }

// 2) Short form — should have both
({ options } = cli.parse(
  ["node", "bin", "-b", "https://gitlab.com"],
  { run: false }
));
console.log(options);
// Both: { b: "https://gitlab.com", baseUrl: "https://gitlab.com" }

// 3) No args — should have both defaults
({ options } = cli.parse(["node", "bin"], { run: false }));
console.log(options);
// Both: { b: "https://github.com", baseUrl: "https://github.com" }
```

## Expected Behavior

- If **none** of the alias names were parsed, the default should be set for **all** names.
- If **any** alias name was parsed, the default must **not** be applied to any of them; the parsed value(s) should be used as provided by `mri` (which handles alias mirroring for the supplied flag).

Formally, the fixed code does:

```ts
const parsedOptionNames = cliOption.names.filter(
  (name) => parsed[name] !== undefined
);
if (parsedOptionNames.length === 0) {
  for (const name of cliOption.names) {
    options[name] = cliOption.config.default;
  }
}
```

## Environment

- Node 22 / Bun 1.4.0
- `mri ^1.1.6`
- `bun run` with ESM TS imports

## Notes

- Fix is in `src/CAC.ts` lines 289–299.
- Check `src/Command.ts`, `src/Option.ts`, `src/utils.ts` for option alias handling, but do not modify them unless necessary.
- Regression suite is `bun test tests/` (see `tests/cac.test.ts`).
- The bug also affects boolean defaults (e.g., `-s, --skip` default `false` should set both `s` and `skip` only when not parsed).

