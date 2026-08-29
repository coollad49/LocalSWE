export interface Money {
  amount: number; // in major units, e.g., 10.50 = $10.50
  currency: string; // ISO 4217 code, e.g., "USD"
}

export function createMoney(amount: number, currency: string): Money {
  if (typeof amount !== "number" || isNaN(amount)) throw new Error("Invalid amount");
  if (typeof currency !== "string" || currency.length !== 3) throw new Error(`Invalid currency: ${currency}`);
  return { amount: roundToCents(amount), currency: currency.toUpperCase() };
}

export function roundToCents(value: number): number {
  // Avoid binary floating point issues for values like 1.005 by using EPSILON offset
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(money: Money): string {
  const rounded = roundToCents(money.amount);
  return `${rounded.toFixed(2)} ${money.currency}`;
}

export function parseMoney(input: string): Money {
  if (typeof input !== "string") throw new Error("Input must be string");
  const trimmed = input.trim();
  // Handle formats: "100.00 USD", "$1,000.00", "USD 100.00", "1,000.50 EUR"
  // First extract currency: look for 3-letter code
  const currencyMatch = trimmed.match(/\b([A-Z]{3})\b/i);
  if (!currencyMatch) throw new Error(`Could not parse currency from: ${input}`);
  const currency = currencyMatch[1]!.toUpperCase();

  // Extract numeric part: remove currency code and symbols, keep digits, commas, dots, minus
  let numericPart = trimmed.replace(new RegExp(currency, "i"), "").replace(/[$€£¥]/g, "").trim();
  // Remove commas (thousand separators), but keep decimal point
  numericPart = numericPart.replace(/,/g, "").trim();
  if (numericPart === "" || numericPart === "." || numericPart === "-") {
    throw new Error(`Could not parse amount from: ${input}`);
  }
  const amount = parseFloat(numericPart);
  if (isNaN(amount)) throw new Error(`Could not parse amount from: ${input}`);
  return { amount: roundToCents(amount), currency };
}

export function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  return { amount: roundToCents(a.amount + b.amount), currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  return { amount: roundToCents(a.amount - b.amount), currency: a.currency };
}

export function multiply(money: Money, factor: number): Money {
  if (typeof factor !== "number" || isNaN(factor)) throw new Error("Invalid factor");
  return { amount: roundToCents(money.amount * factor), currency: money.currency };
}

export function convertCurrency(money: Money, targetCurrency: string, rates: Record<string, number>): Money {
  const target = targetCurrency.toUpperCase();
  if (money.currency === target) return { ...money };
  const key = `${money.currency}_${target}`;
  const rate = rates[key];
  if (rate === undefined) throw new Error(`Missing exchange rate: ${key}`);
  // Use precise multiplication then round to cents
  const converted = money.amount * rate;
  return { amount: roundToCents(converted), currency: target };
}
