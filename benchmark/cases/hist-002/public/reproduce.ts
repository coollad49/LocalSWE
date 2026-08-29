import { defu } from "../../../repositories/defu/src/defu.ts";

function run(): boolean {
  // Clean any prior pollution
  delete (Object.prototype as any).polluted;
  delete (Object.prototype as any).isAdmin;

  // Test 1: prototype pollution via __proto__ in defaults (main bug)
  // Fixed: { ...defaults } preserves __proto__ as own property, no prototype pollution
  // Buggy: Object.assign({}, defaults) sets prototype to {polluted:true}
  const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
  const result = defu({}, malicious);

  // On buggy, result.polluted will be true via prototype chain
  // On fixed, result.polluted is undefined and result has own __proto__ property
  const hasPollution =
    (result as any).polluted === true ||
    Object.getPrototypeOf(result)?.polluted === true;

  const hasOwnProto = Object.hasOwn(result as any, "__proto__");
  const proto = Object.getPrototypeOf(result);

  console.log(`result: ${JSON.stringify(result)} polluted=${(result as any).polluted} hasPollution=${hasPollution} hasOwnProto=${hasOwnProto} proto=${JSON.stringify(proto)}`);
  console.log(`Object.prototype.polluted=${(Object.prototype as any).polluted} ({}).polluted=${({} as any).polluted}`);

  // Global should never be polluted (both handle global correctly, but buggy pollutes result prototype)
  const globalPolluted = ({} as any).polluted === true || (Object.prototype as any).polluted === true;

  // Check normal merging still works
  const r2 = defu({ a: "c" }, { a: "bbb", d: "c" });
  const normal1 = r2.a === "c" && (r2 as any).d === "c";
  console.log(`normal merge 1: ${JSON.stringify(r2)} pass=${normal1}`);

  const r3 = defu({ a: { b: "c" } }, { a: { d: "e" } });
  const normal2 = (r3 as any).a?.b === "c" && (r3 as any).a?.d === "e";
  console.log(`normal merge 2 (nested): ${JSON.stringify(r3)} pass=${normal2}`);

  const r4 = defu({ array: ["a", "b"] }, { array: ["c", "d"] });
  const normal3 = JSON.stringify((r4 as any).array) === JSON.stringify(["a", "b", "c", "d"]);
  console.log(`normal merge 3 (arrays): ${JSON.stringify(r4)} pass=${normal3}`);

  // Also test the PR's added case: malicious as baseObject should not override defaults incorrectly and not pollute
  delete (Object.prototype as any).isAdmin;
  const malicious2 = JSON.parse('{"__proto__":{"isAdmin":true}}');
  const result2 = defu(malicious2, { isAdmin: false });
  const prCasePass = (result2 as any).isAdmin === false && ({} as any).isAdmin === undefined && (Object.prototype as any).isAdmin === undefined;
  console.log(`PR case defu(malicious, {isAdmin:false}) => ${JSON.stringify(result2)} isAdmin=${(result2 as any).isAdmin} globalIsAdmin=${({} as any).isAdmin} pass=${prCasePass}`);

  // Cleanup
  delete (Object.prototype as any).polluted;
  delete (Object.prototype as any).isAdmin;

  const pollutionBlocked = !hasPollution && !globalPolluted;
  console.log(`pollutionBlocked=${pollutionBlocked} (expect true on fixed, false on buggy)`);

  const pass = pollutionBlocked && normal1 && normal2 && normal3 && prCasePass;
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}

if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
