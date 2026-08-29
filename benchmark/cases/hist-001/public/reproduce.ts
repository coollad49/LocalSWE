import { cac } from "../../../repositories/cac/src/index.ts";

// Reproduce bug: mix of parsed and non-parsed option names getting default value
// Fixed behavior:
// - `node bin --base-url https://gitlab.com` with option '-b, --base-url' default https://github.com
//   should give { baseUrl: "https://gitlab.com" } without `b` (no leak)
//   Buggy gives { b: "https://github.com", baseUrl: "https://gitlab.com" } (leaked default)
// - `node bin -b https://gitlab.com` should give both { b: "https://gitlab.com", baseUrl: "https://gitlab.com" }
// - `node bin` with no args should give both defaults

function run(): boolean {
  let allPass = true;

  // Test 1: --base-url should NOT leak default to `b`
  {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(
      ["node", "bin", "--base-url", "https://gitlab.com"],
      { run: false }
    );
    const hasB = Object.prototype.hasOwnProperty.call(options, "b");
    const baseUrlOk = options.baseUrl === "https://gitlab.com";
    const bLeaked = options.b === "https://github.com";
    const bAbsentOrCorrect = !hasB || options.b === undefined;
    // Fixed: baseUrl is gitlab, b should be absent/undefined
    // Buggy: b is github (leaked)
    const pass = baseUrlOk && !bLeaked && bAbsentOrCorrect;
    console.log(
      `Test --base-url: options=${JSON.stringify(options)} => ${pass ? "PASS" : "FAIL"} (hasB=${hasB} b=${options.b} baseUrl=${options.baseUrl})`
    );
    if (!pass) allPass = false;
  }

  // Test 2: -b should give both
  {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(
      ["node", "bin", "-b", "https://gitlab.com"],
      { run: false }
    );
    const pass =
      options.b === "https://gitlab.com" &&
      options.baseUrl === "https://gitlab.com";
    console.log(
      `Test -b: options=${JSON.stringify(options)} => ${pass ? "PASS" : "FAIL"}`
    );
    if (!pass) allPass = false;
  }

  // Test 3: no args => both defaults
  {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(["node", "bin"], { run: false });
    const pass =
      options.b === "https://github.com" &&
      options.baseUrl === "https://github.com";
    console.log(
      `Test no args: options=${JSON.stringify(options)} => ${pass ? "PASS" : "FAIL"}`
    );
    if (!pass) allPass = false;
  }

  console.log(`Overall reproduce: ${allPass ? "PASS" : "FAIL"}`);
  return allPass;
}

if (import.meta.main) {
  const ok = run();
  process.exit(ok ? 0 : 1);
}

export { run };
