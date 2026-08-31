import { describe, test, expect } from "vitest";
import { tmpdir } from "node:os";
import { execDeterministic, toStageResult } from "../exec.ts";

describe("execDeterministic", () => {
  test("captures stdout and exit code pass", async () => {
    const res = await execDeterministic({
      command: "node",
      args: ["-e", "console.log('hello'); process.exit(0)"],
      cwd: tmpdir(),
      timeoutMs: 2000,
      commandString: "node -e hello",
    });
    expect(res.code).toBe(0);
    expect(res.stdout).toContain("hello");
    expect(res.timedOut).toBe(false);
    const stage = toStageResult(res, "node -e hello");
    expect(stage.status).toBe("passed");
  });

  test("captures failure exit code", async () => {
    const res = await execDeterministic({
      command: "node",
      args: ["-e", "process.exit(1)"],
      cwd: tmpdir(),
      timeoutMs: 2000,
      commandString: "node -e fail",
    });
    expect(res.code).toBe(1);
    expect(res.timedOut).toBe(false);
    const stage = toStageResult(res, "node -e fail");
    expect(stage.status).toBe("failed");
  });

  test("times out and kills process", async () => {
    const res = await execDeterministic({
      command: "node",
      args: ["-e", "setInterval(()=>{}, 100)"],
      cwd: tmpdir(),
      timeoutMs: 400,
      commandString: "node sleep",
    });
    expect(res.timedOut).toBe(true);
    const stage = toStageResult(res, "node sleep");
    expect(stage.status).toBe("timeout");
    expect(stage.timedOut).toBe(true);
  });

  test("handles missing executable as error", async () => {
    const res = await execDeterministic({
      command: "this-command-does-not-exist-xyz",
      args: [],
      cwd: tmpdir(),
      timeoutMs: 1000,
      commandString: "missing",
    });
    expect(res.code).toBe(null);
    expect(res.error).toBeDefined();
    const stage = toStageResult(res, "missing");
    expect(stage.status).toBe("error");
  });

  test("captures stderr", async () => {
    const res = await execDeterministic({
      command: "node",
      args: ["-e", "console.error('err'); process.exit(1)"],
      cwd: tmpdir(),
      timeoutMs: 2000,
      commandString: "node err",
    });
    expect(res.stderr).toContain("err");
  });

  test("does not use shell interpolation (spawn explicit args)", async () => {
    // Ensure command with injection attempt doesn't execute extra shell commands
    const res = await execDeterministic({
      command: "node",
      args: ["-e", "console.log(process.argv[1])", "hello; echo injected"],
      cwd: tmpdir(),
      timeoutMs: 2000,
      commandString: "node injection test",
    });
    expect(res.stdout).toContain("hello; echo injected");
    expect(res.code).toBe(0);
  });
});
