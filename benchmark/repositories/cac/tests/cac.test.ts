import { describe, test, expect } from "bun:test";
import { cac } from "../src/index.ts";

describe("cac regression", () => {
  test("parses basic option", () => {
    const cli = cac();
    cli.option("--foo <foo>", "foo option");
    const { options } = cli.parse(["node", "bin", "--foo", "bar"]);
    expect(options.foo).toBe("bar");
  });

  test("parses short flag and help not thrown", () => {
    const cli = cac("test");
    cli.option("-f, --flag", "flag");
    const { options } = cli.parse(["node", "bin", "-f"]);
    expect(options.flag).toBe(true);
    expect(options.f).toBe(true);
  });

  test("command parsing", () => {
    const cli = cac();
    let called = false;
    cli.command("build", "build cmd").action(() => { called = true; });
    cli.parse(["node", "bin", "build"]);
    expect(cli.matchedCommand?.name).toBe("build");
  });

  test("default value without args", () => {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(["node", "bin"]);
    expect(options.baseUrl).toBe("https://github.com");
    expect(options.b).toBe("https://github.com");
  });
});
