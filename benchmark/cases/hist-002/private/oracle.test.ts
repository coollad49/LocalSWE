import { describe, test, expect } from "bun:test";
import { roundToCents, formatMoney, createMoney, add, multiply } from "../../../repositories/money-utils/src/money.ts";

describe("hist-002 oracle: rounding half-up", () => {
  test("roundToCents half-up", () => {
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(1.004)).toBe(1.0);
    expect(roundToCents(2.675)).toBe(2.68);
    expect(roundToCents(1.015)).toBe(1.02);
  });
  test("formatMoney uses rounding", () => {
    expect(formatMoney({ amount: 1.005, currency: "USD" })).toBe("1.01 USD");
    expect(formatMoney({ amount: 2.674, currency: "EUR" })).toBe("2.67 EUR");
    expect(formatMoney({ amount: 2.675, currency: "EUR" })).toBe("2.68 EUR");
  });
  test("createMoney rounds", () => {
    expect(createMoney(1.005, "USD").amount).toBe(1.01);
  });
  test("add with rounding", () => {
    const a = createMoney(0.005, "USD");
    const b = createMoney(0.005, "USD");
    // 0.01 + with rounding? add rounds sum: 0.01 + 0.01? Actually 0.005 rounds to 0.01 each, sum 0.02
    expect(add(a, b).amount).toBe(0.02);
  });
});
