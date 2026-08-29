import { spyOn } from "../../../repositories/tinyspy/src/index.ts";

class Foo {
  f() {
    return 'original';
  }
}

const foo = new Foo();

console.log(`before: foo.f()=${foo.f()} own=${Object.getOwnPropertyDescriptor(foo, 'f')}`);
console.log(`before descriptors: ${JSON.stringify(Object.getOwnPropertyDescriptors(foo))}`);

const spy = spyOn(foo, 'f');
spy.willCall(() => 'mocked');

console.log(`after spy: foo.f()=${foo.f()} ownDesc=${JSON.stringify(Object.getOwnPropertyDescriptor(foo, 'f'))}`);
if (foo.f() !== 'mocked') {
  console.log('FAIL: spy did not mock correctly');
  process.exit(1);
}

spy.restore();

console.log(`after restore: foo.f()=${foo.f()} ownDesc=${String(Object.getOwnPropertyDescriptor(foo, 'f'))}`);
console.log(`all own descriptors after restore: ${JSON.stringify(Object.getOwnPropertyDescriptors(foo))}`);

if (foo.f() !== 'original') {
  console.log(`FAIL: restore did not return original, got ${foo.f()}`);
  process.exit(1);
}

const ownDesc = Object.getOwnPropertyDescriptor(foo, 'f');
if (ownDesc !== undefined) {
  console.log('FAIL: leak detected - own property still exists after restore (buggy)');
  console.log(JSON.stringify(ownDesc, null, 2));
  process.exit(1);
}

const allOwn = Object.getOwnPropertyDescriptors(foo);
if (Object.keys(allOwn).length !== 0) {
  console.log(`FAIL: expected no own properties after restore, got ${JSON.stringify(allOwn)}`);
  process.exit(1);
}

console.log('PASS: prototype restore is clean, no leak');
process.exit(0);
