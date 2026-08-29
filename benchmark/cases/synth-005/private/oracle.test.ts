import { describe, test, expect } from "vitest";
import { convertCurrency, createMoney } from "../../../repositories/money-utils/src/money.ts";

describe("synth-005 oracle: convertCurrency rounding", () => {
  test("rounds correctly with half-cent edge", () => {
    // 100 * 0.92345 = 92.345 => 92.35 rounded vs 92.34 floored
    expect(convertCurrency(createMoney(100, "USD"), "EUR", { "USD_EUR": 0.92345 })).toEqual({ amount: 92.35, currency: "EUR" });
    // 10 * 0.10055 = 1.0055 => 1.01 rounded vs 1.00 floored
    expect(convertCurrency(createMoney(10, "USD"), "EUR", { "USD_EUR": 0.10055 })).toEqual({ amount: 1.01, currency: "EUR" });
    expect(convertCurrency(createMoney(10, "USD"), "EUR", { "USD_EUR": 0.10054 })).toEqual({ amount: 1.01, currency: "EUR" });
  });
  test("rounds standard cases", () => {
    expect(convertCurrency(createMoney(100, "USD"), "EUR", { "USD_EUR": 0.9234 })).toEqual({ amount: 92.34, currency: "EUR" });
    expect(convertCurrency(createMoney(999999.99, "USD"), "EUR", { "USD_EUR": 0.9234 }).amount).toBe(923399.99);
  });
  test("same currency no conversion", () => {
    const m = createMoney(50, "USD");
    expect(convertCurrency(m, "USD", {})).toEqual(m);
  });
});
