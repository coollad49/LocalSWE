import SuperJSON from "../../../repositories/superjson/src/index.ts";

function run(): boolean {
  let allPass = true;

  // Test the path escape bug: keys with backslash and dot
  {
    const input = {
      a: ["/'a'[0]: string that becomes a regex/"],
      'a.0': /test-regex/,
      'b\\': [new Set([1])],
    } as any;

    const str = SuperJSON.stringify(input);
    const parsed: any = SuperJSON.parse(str);

    // 'a.0' should remain a RegExp, not be confused with a[0]
    const a0IsRegExp = parsed['a.0'] instanceof RegExp;
    const aIsArray = Array.isArray(parsed.a) && parsed.a[0] === "/'a'[0]: string that becomes a regex/";
    const bSlashIsSet = parsed['b\\'] instanceof Array && parsed['b\\'][0] instanceof Set;

    const pass = a0IsRegExp && aIsArray && bSlashIsSet;
    console.log(`Test escape: a0IsRegExp=${a0IsRegExp} aIsArray=${aIsArray} bSlashIsSet=${bSlashIsSet} => ${pass ? "PASS" : "FAIL"}`);
    console.log(`  parsed['a.0']=`, parsed['a.0']);
    console.log(`  parsed.a=`, parsed.a);
    console.log(`  parsed['b\\\\']=`, parsed['b\\']);
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
