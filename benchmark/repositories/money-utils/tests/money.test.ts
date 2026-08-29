import { describe, test, expect } from "bun:test";
import { createMoney, formatMoney, parseMoney, add, subtract, multiply, convertCurrency, roundToCents } from "../src/money.ts";

describe("money-utils", () => {
  test("roundToCents rounds half-up", () => {
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(1.004)).toBe(1.0);
    expect(roundToCents(2.675)).toBe(2.68);
  });

  test("formatMoney formats to 2 decimals", () => {
    expect(formatMoney({ amount: 10, currency: "USD" })).toBe("10.00 USD");
    expect(formatMoney({ amount: 10.5, currency: "EUR" })).toBe("10.50 EUR");
    expect(formatMoney({ amount: 1.005, currency: "USD" })).toBe("1.01 USD");
  });

  test("parseMoney handles comma-separated", () => {
    expect(parseMoney("1,000.00 USD")).toEqual({ amount: 1000, currency: "USD" });
    expect(parseMoney("$1,234.56 USD")).toEqual({ amount: 1234.56, currency: "USD" });
    expect(parseMoney("USD 2,500.99")).toEqual({ amount: 2500.99, currency: "USD" });
  });

  test("parseMoney handles simple amounts", () => {
    expect(parseMoney("100 USD")).toEqual({ amount: 100, currency: "USD" });
    expect(parseMoney("99.99 EUR")).toEqual({ amount: 99.99, currency: "EUR" });
  });

  test("add validates currency mismatch", () => {
    const a = createMoney(10, "USD");
    const b = createMoney(5, "EUR");
    expect(() => add(a, b)).toThrow(/Currency mismatch/);
    expect(add(a, createMoney(5, "USD"))).toEqual({ amount: 15, currency: "USD" });
  });

  test("subtract validates currency", () => {
    expect(() => subtract(createMoney(10, "USD"), createMoney(5, "EUR"))).toThrow();
  });

  test("multiply", () => {
    expect(multiply(createMoney(10, "USD"), 2.5)).toEqual({ amount: 25, currency: "USD" });
  });

  test("convertCurrency precision", () => {
    const m = createMoney(100, "USD");
    const rates = { "USD_EUR": 0.9234, "EUR_USD": 1.083 };
    expect(convertCurrency(m, "EUR", rates)).toEqual({ amount: 92.34, currency: "EUR" });
    // large amount: 999999.99 * 0.9234 = 923399.990766 -> 923399.99 after rounding
    const large = createMoney(999999.99, "USD");
    expect(convertCurrency(large, "EUR", rates).amount).toBe(923399.99);
    // same currency no conversion
    expect(convertCurrency(m, "USD", rates)).toEqual(m);
    expect(convertCurrency(m, "usd", rates)).toEqual(m);
  });

  test("convertCurrency throws missing rate", () => {
    expect(() => convertCurrency(createMoney(10, "USD"), "JPY", {})).toThrow(/Missing exchange rate/);
  });

  test("createMoney validates", () => {
    expect(() => createMoney(NaN, "USD")).toThrow();
    expect(() => createMoney(10, "US")).toThrow();
  });
});
