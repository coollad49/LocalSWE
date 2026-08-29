import { describe, test, expect } from "bun:test";
import { parseMoney } from "../../../repositories/money-utils/src/money.ts";

describe("hist-005 oracle: parseMoney commas", () => {
  test("parses comma amounts", () => {
    expect(parseMoney("1,000.00 USD")).toEqual({ amount: 1000, currency: "USD" });
    expect(parseMoney("1,234.56 USD")).toEqual({ amount: 1234.56, currency: "USD" });
    expect(parseMoney("$1,234.56 USD")).toEqual({ amount: 1234.56, currency: "USD" });
    expect(parseMoney("12,345,678.90 EUR")).toEqual({ amount: 12345678.9, currency: "EUR" });
  });
  test("parses without commas", () => {
    expect(parseMoney("100 USD")).toEqual({ amount: 100, currency: "USD" });
    expect(parseMoney("99.99 EUR")).toEqual({ amount: 99.99, currency: "EUR" });
  });
  test("parses USD prefix", () => {
    expect(parseMoney("USD 2,500.99")).toEqual({ amount: 2500.99, currency: "USD" });
  });
});
