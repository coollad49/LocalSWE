import { add, createMoney } from "../../../repositories/money-utils/src/money.ts";

function run(): boolean {
  let threw = false;
  try {
    const r = add(createMoney(10, "USD"), createMoney(5, "EUR"));
    console.log(`add USD+EUR returned ${JSON.stringify(r)} expected throw`);
  } catch (e: any) {
    console.log(`add threw: ${e.message} PASS`);
    threw = true;
  }
  if (!threw) { console.log("FAIL: did not throw on currency mismatch"); return false; }
  // same currency should not throw
  try {
    const r2 = add(createMoney(10, "USD"), createMoney(5, "USD"));
    console.log(`add USD+USD ${JSON.stringify(r2)} expected 15 USD`);
    if (r2.amount !== 15) return false;
  } catch { console.log("FAIL: threw on same currency"); return false; }
  console.log("PASS");
  return true;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
