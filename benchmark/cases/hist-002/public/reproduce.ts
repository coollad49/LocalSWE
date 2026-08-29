import { roundToCents, formatMoney } from "../../../repositories/money-utils/src/money.ts";

function run(): boolean {
  const a = roundToCents(1.005);
  const b = roundToCents(2.675);
  const c = formatMoney({ amount: 1.005, currency: "USD" });
  console.log(`roundToCents(1.005)=${a} expected 1.01`);
  console.log(`roundToCents(2.675)=${b} expected 2.68`);
  console.log(`formatMoney 1.005 => ${c} expected 1.01 USD`);
  const pass = a === 1.01 && b === 2.68 && c === "1.01 USD";
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}

if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
