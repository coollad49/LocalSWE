import qs from "../../../repositories/qs/lib/index.js";

function run(): boolean {
  let allPass = true;

  // Test 1: simple overflow with comma group appended
  {
    const result = qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5 } as any);
    const expected = { a: { 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7", 7: "8" } };
    const pass = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`Test overflow flatten: ${pass ? "PASS" : "FAIL"}`);
    console.log(`  result=${JSON.stringify(result)}`);
    console.log(`  expected=${JSON.stringify(expected)}`);
    if (!pass) allPass = false;
  }

  console.log(`Overall reproduce: ${allPass ? "PASS" : "FAIL"}`);
  return allPass;
}

const _isMain = (import.meta as any).main ?? process.argv[1]?.endsWith("reproduce.ts");
if (_isMain) {
  const ok = run();
  process.exit(ok ? 0 : 1);
}

export { run };
