import { TokenData, stringify } from "../../../repositories/path-to-regexp/src/index.js";

function run(): boolean {
  let allPass = true;

  // Test 1: astral ID_Continue should be quoted
  {
    const data = new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
      { type: "text", value: "\u{1D6FC}" }, // ID_Continue, astral
    ]);
    const result = stringify(data);
    const expected = '/:"test"\u{1D6FC}';
    const pass = result === expected;
    console.log(`Test astral ID_Continue: result=${JSON.stringify(result)} expected=${JSON.stringify(expected)} => ${pass ? "PASS" : "FAIL"}`);
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
