import { spyOn } from "../../../repositories/tinyspy/src/index.ts";

class Bar {
  _bar = 'bar';
  get bar(): string {
    return this._bar;
  }
  set bar(bar: string) {
    this._bar = bar;
  }
}
class Foo extends Bar {}
const foo = new Foo();

console.log(`before: foo.bar=${foo.bar} (expected 'bar')`);

try {
  const spy = spyOn(foo, { getter: 'bar' }, () => 'foo');
  console.log(`after spy: foo.bar=${foo.bar} (expected 'foo')`);
  if (foo.bar !== 'foo') {
    console.log(`FAIL: getter not mocked, got ${foo.bar}`);
    process.exit(1);
  }
  try {
    foo.bar = 'baz';
    console.log(`setter succeeded: foo.bar=${foo.bar} _bar=${(foo as any)._bar} (expected 'foo' / 'baz')`);
    if (foo.bar !== 'foo') {
      console.log(`FAIL: expected foo.bar to stay mocked 'foo' after setter, got ${foo.bar}`);
      process.exit(1);
    }
    if ((foo as any)._bar !== 'baz') {
      console.log(`FAIL: setter did not update _bar, got ${(foo as any)._bar}`);
      process.exit(1);
    }
    console.log('PASS: inherited getter correctly mocked with setter preserved');
    process.exit(0);
  } catch (e) {
    const err = e as Error;
    console.log(`FAIL: setter threw ${err.message} (buggy - readonly property)`);
    console.log(err.stack);
    process.exit(1);
  }
} catch (e) {
  const err = e as Error;
  console.log(`FAIL: spyOn threw ${err.message}`);
  console.log(err.stack);
  process.exit(1);
}
