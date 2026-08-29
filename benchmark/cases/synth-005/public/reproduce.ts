import { convertCurrency, createMoney } from "../../../repositories/money-utils/src/money.ts";

function run(): boolean {
  // Use amounts/rates that produce a half-cent rounding difference: floor truncates, round rounds up
  const m = createMoney(100, "USD");
  const c = convertCurrency(m, "EUR", { "USD_EUR": 0.92345 });
  console.log(`100 USD -> EUR ${JSON.stringify(c)} expected 92.35 (100*0.92345=92.345)`);
  if (c.amount !== 92.35) { console.log("FAIL: truncation, got " + c.amount); return false; }
  const m2 = createMoney(10, "USD");
  const c2 = convertCurrency(m2, "EUR", { "USD_EUR": 0.10055 });
  // 10 * 0.10055 = 1.0055 => round 1.01, floor 1.00
  console.log(`10 USD -> EUR @0.10055 ${JSON.stringify(c2)} expected 1.01`);
  if (c2.amount !== 1.01) { console.log("FAIL c2 got " + c2.amount); return false; }
  console.log("PASS");
  return true;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
