import mri from "../../../repositories/mri/lib/index.js";

function run(): boolean {
  // Primary case from issue #8: boolean default should not leak into _
  const out = mri(["-t"], { default: { t: true } });
  console.log(`mri(['-t'], {default:{t:true}}) => ${JSON.stringify(out)}`);

  // Check expected values without relying on JSON key order
  const hasNumericLeak = out._.includes(1 as unknown as string);
  const isBoolean = typeof out.t === "boolean";
  const underscoreEmpty = out._.length === 0;
  const tIsTrue = out.t === true;

  console.log(`_ empty? ${underscoreEmpty} (length ${out._.length}) expected true`);
  console.log(`t is boolean? ${isBoolean} expected true, t===true? ${tIsTrue}`);
  console.log(`has numeric leak (1 in _)? ${hasNumericLeak} expected false`);

  const pass = underscoreEmpty && isBoolean && tIsTrue && !hasNumericLeak;

  // Second sanity check: alias + boolean default should also not leak
  const out2 = mri(["-t"], { alias: { t: ["tt"] }, default: { t: true } });
  console.log(`alias check mri(['-t'], {alias:{t:['tt']}, default:{t:true}}) => ${JSON.stringify(out2)}`);
  const pass2 = out2._.length === 0 && out2.t === true && out2.tt === true;
  console.log(`alias check pass? ${pass2}`);

  const overall = pass && pass2;
  console.log(overall ? "PASS" : "FAIL");
  return overall;
}

if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
