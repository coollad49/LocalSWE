import { parseMoney } from "../../../repositories/money-utils/src/money.ts";

function run(): boolean {
  try {
    const a = parseMoney("1,000.00 USD");
    console.log(`parseMoney("1,000.00 USD") => ${JSON.stringify(a)} expected 1000`);
    if (a.amount !== 1000) { console.log("FAIL amount"); return false; }
    const b = parseMoney("$1,234.56 USD");
    console.log(`parseMoney("$1,234.56 USD") => ${JSON.stringify(b)} expected 1234.56`);
    if (b.amount !== 1234.56) { console.log("FAIL b"); return false; }
    const c = parseMoney("2,500.99 EUR");
    if (c.amount !== 2500.99) { console.log("FAIL c"); return false; }
    console.log("PASS");
    return true;
  } catch (e) {
    console.log(`FAIL threw: ${e}`);
    return false;
  }
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
