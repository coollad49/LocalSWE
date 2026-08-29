import { produce, isDraft, enableArrayMethods } from "../../../repositories/immer/src/immer";

enableArrayMethods();

function run(): boolean {
  let allPass = true;

  // Test 1: reverse() then mutate should not mutate base
  {
    const reordered = { id: 3 };
    const baseState = [{ id: 1 }, { id: 2 }, reordered];
    const baseCopy = JSON.parse(JSON.stringify(baseState));
    const nextState = produce(baseState, (s: any) => {
      s.reverse();
      // After reverse, s[0] is relocated base object - must be draft on fixed
      // On buggy, isDraft(s[0]) would be false (raw base)
      s[0].id = 99;
    });
    const baseUnchanged = JSON.stringify(baseState) === JSON.stringify(baseCopy) && reordered.id === 3;
    const nextCorrect = JSON.stringify(nextState) === JSON.stringify([{ id: 99 }, { id: 2 }, { id: 1 }]);
    const pass = baseUnchanged && nextCorrect;
    console.log(`Test reverse: baseUnchanged=${baseUnchanged} nextCorrect=${nextCorrect} => ${pass ? "PASS" : "FAIL"}`);
    console.log(`  baseState=${JSON.stringify(baseState)} expected ${JSON.stringify(baseCopy)}`);
    console.log(`  reordered=${JSON.stringify(reordered)} expected {"id":3}`);
    console.log(`  nextState=${JSON.stringify(nextState)} expected [{"id":99},{"id":2},{"id":1}]`);
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
