# Issue: Adding money with different currencies should fail but does not

**Repository:** `money-utils`
**Component:** `add` / `subtract`

## Description

`add({ amount: 10, currency: "USD"}, { amount: 5, currency: "EUR"})` should throw `Currency mismatch` but currently returns a result mixing currencies.

## Steps to Reproduce

```ts
import { add, createMoney } from "./src/money.ts";
console.log(add(createMoney(10, "USD"), createMoney(5, "EUR"))); // Should throw
```

## Expected Behavior

- `add` and `subtract` must validate that both operands share the same currency
- Throw error containing "Currency mismatch" otherwise
