# Issue: parseMoney fails on amounts with thousand separators

**Repository:** `money-utils`
**Component:** `parseMoney`

## Description

Parsing strings like `"1,000.00 USD"` throws or returns incorrect amount. The function should handle commas as thousand separators.

## Steps to Reproduce

```ts
import { parseMoney } from "./src/money.ts";
console.log(parseMoney("1,000.00 USD")); // throws or wrong
console.log(parseMoney("$1,234.56 USD")); // should be 1234.56 USD
console.log(parseMoney("2,500.99 EUR"));
```

## Expected Behavior

- `parseMoney("1,000.00 USD")` => `{ amount: 1000, currency: "USD" }`
- Comma removal before parsing
- Existing formats without commas should still work

## Environment

Bun 1.4.0
