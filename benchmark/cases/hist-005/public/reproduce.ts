import mri from "../../../repositories/mri/lib/index.js";

function run(): boolean {
  // Primary case: alias a -> arg with string default on arg
  const out = mri(["-a", "01"], { alias: { a: ["arg"] }, default: { arg: "" } });
  console.log(`mri(['-a','01'], {alias:{a:['arg']}, default:{arg:''}}) => ${JSON.stringify(out)}`);

  const isStringA = typeof out.a === "string";
  const isStringArg = typeof out.arg === "string";
  const is01 = out.a === "01" && out.arg === "01";
  const notNumber = out.a !== (1 as unknown as string) && out.arg !== (1 as unknown as string);
  const underscoreEmpty = out._.length === 0;

  console.log(`a type ${typeof out.a} value ${out.a} expected string "01"`);
  console.log(`arg type ${typeof out.arg} value ${out.arg} expected string "01"`);
  console.log(`_ empty ${underscoreEmpty} expected true`);

  const pass = isStringA && isStringArg && is01 && notNumber && underscoreEmpty;

  // Secondary variant for robustness: alias arg -> a with default on arg
  const out2 = mri(["-a", "01"], { alias: { arg: ["a"] }, default: { arg: "" } });
  console.log(`secondary mri(['-a','01'], {alias:{arg:['a']}, default:{arg:''}}) => ${JSON.stringify(out2)}`);
  const pass2 = out2.a === "01" && out2.arg === "01" && typeof out2.a === "string";

  const overall = pass && pass2;
  console.log(overall ? "PASS" : "FAIL");
  return overall;
}

if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
