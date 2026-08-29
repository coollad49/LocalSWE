# Issue: Currency conversion truncates instead of rounding

**Repository:** `money-utils`
**Component:** `convertCurrency`

## Description

Converting currencies with rates that produce half-cent fractions truncates instead of rounding half-up. For example `100 USD` at rate `0.92345` should yield `92.35 EUR` (92.345 rounded) but currently yields `92.34`.

## Steps to Reproduce

```ts
import { convertCurrency, createMoney } from "./src/money.ts";
console.log(convertCurrency(createMoney(100, "USD"), "EUR", { "USD_EUR": 0.92345 }));
// Expected { amount: 92.35, currency: "EUR" }, got { amount: 92.34, currency: "EUR" }

console.log(convertCurrency(createMoney(10, "USD"), "EUR", { "USD_EUR": 0.10055 }));
// 10 * 0.10055 = 1.0055 => Expected 1.01, got 1.00
```

## Expected Behavior

- `convertCurrency` should multiply by rate then round half-up to 2 decimals via `roundToCents`
- Should not use `Math.floor`
- Existing same-currency shortcut should remain
