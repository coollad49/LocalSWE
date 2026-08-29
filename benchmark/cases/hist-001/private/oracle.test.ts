import { describe, test, expect } from "bun:test";
import { cac } from "../../../repositories/cac/src/index.ts";

describe("hist-001 oracle: option default alias leak", () => {
  test("default value for option", () => {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(["node", "bin"], { run: false });
    expect(options).toEqual({
      "--": [],
      b: "https://github.com",
      baseUrl: "https://github.com",
    });
  });

  test("default value for option names 1 (-b)", () => {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(["node", "bin", "-b", "https://gitlab.com"], {
      run: false,
    });
    expect(options).toEqual({
      "--": [],
      b: "https://gitlab.com",
      baseUrl: "https://gitlab.com",
    });
  });

  test("default value for option names 2 (--base-url)", () => {
    const cli = cac();
    cli.option("-b, --base-url <baseUrl>", "Set the instance URL", {
      default: "https://github.com",
    });
    const { options } = cli.parse(
      ["node", "bin", "--base-url", "https://gitlab.com"],
      { run: false }
    );
    expect(options).toEqual({
      "--": [],
      baseUrl: "https://gitlab.com",
    });
  });

  test("default value for option names 3 (boolean skip)", () => {
    const cli = cac();
    cli.option("-s, --skip", "Skip process", {
      default: false,
    });
    const { options } = cli.parse(["node", "bin"], { run: false });
    expect(options).toEqual({
      "--": [],
      s: false,
      skip: false,
    });
  });
});
