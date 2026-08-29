# Issue: Currency amounts are being truncated instead of rounded

**Repository:** `money-utils`
**Component:** `roundToCents` / `formatMoney`

## Description

Money formatting is truncating fractional cents instead of rounding half-up. For example `1.005` should round to `1.01` but is being stored as `1.00`. This causes systematic under-charging.

## Steps to Reproduce

```ts
import { roundToCents, formatMoney } from "./src/money.ts";

console.log(roundToCents(1.005)); // Expected 1.01, got 1.00
console.log(formatMoney({ amount: 1.005, currency: "USD" })); // Expected "1.01 USD", got "1.00 USD"
console.log(roundToCents(2.675)); // Expected 2.68, got 2.67
```

## Expected Behavior

- `roundToCents` should round half-up to 2 decimals using `Math.round(value *100)/100` (with epsilon handling)
- `formatMoney` should display rounded value to 2 decimals
- `createMoney`, `add`, `multiply`, `convertCurrency` all rely on `roundToCents` and should reflect correct rounding

## Environment

- Node 22 / Bun 1.4.0
