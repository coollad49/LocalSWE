import { describe, test, expect } from "vitest";
import { add, subtract, createMoney } from "../../../repositories/money-utils/src/money.ts";

describe("synth-002 oracle: currency mismatch validation", () => {
  test("add throws on mismatch", () => {
    expect(() => add(createMoney(10, "USD"), createMoney(5, "EUR"))).toThrow(/Currency mismatch/);
    expect(() => add(createMoney(10, "USD"), createMoney(5, "JPY"))).toThrow();
  });
  test("subtract throws on mismatch", () => {
    expect(() => subtract(createMoney(10, "USD"), createMoney(5, "EUR"))).toThrow(/Currency mismatch/);
  });
  test("add succeeds same currency", () => {
    expect(add(createMoney(10, "USD"), createMoney(5, "USD"))).toEqual({ amount: 15, currency: "USD" });
  });
  test("subtract succeeds same currency", () => {
    expect(subtract(createMoney(10, "USD"), createMoney(5, "USD"))).toEqual({ amount: 5, currency: "USD" });
  });
});
