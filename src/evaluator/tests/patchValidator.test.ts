import { describe, test, expect } from "vitest";
import { validatePatchContentPaths, isPatchPathSafe } from "../patchValidator.ts";

describe("patchValidator", () => {
  test("valid patch applies", () => {
    const patch = `diff --git a/src/task-manager.ts b/src/task-manager.ts
index abc123..def456 100644
--- a/src/task-manager.ts
+++ b/src/task-manager.ts
@@ -1,3 +1,4 @@
+// comment
 import { foo } from "./foo";
`;
    const res = validatePatchContentPaths(patch);
    expect(res.valid).toBe(true);
  });

  test("rejects absolute path", () => {
    const patch = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b//etc/passwd
@@ -1 +1 @@
-old
+new
`;
    // More explicit absolute
    const patch2 = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1 +1 @@
-old
+new
diff --git a//etc/passwd b//etc/passwd
--- a//etc/passwd
+++ b//etc/passwd
`;
    const res = validatePatchContentPaths(patch2);
    expect(res.valid).toBe(false);
    expect(res.code).toBe("PATCH_ABSOLUTE_PATH");
  });

  test("rejects traversal ..", () => {
    const patch = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1 +1 @@
-old
+new
diff --git a/../../etc/passwd b/../../etc/passwd
--- a/../../etc/passwd
+++ b/../../etc/passwd
`;
    const res = validatePatchContentPaths(patch);
    expect(res.valid).toBe(false);
    expect(res.code).toBe("PATCH_TRAVERSAL");
  });

  test("rejects absolute path in hunk header", () => {
    const patch = `diff --git a/src/foo.ts b/src/foo.ts
--- /etc/passwd
+++ b/src/foo.ts
`;
    const res = validatePatchContentPaths(patch);
    expect(res.valid).toBe(false);
    expect(res.code).toBe("PATCH_ABSOLUTE_PATH");
  });

  test("rejects null byte", () => {
    const patch = "diff --git a/src/foo.ts\x00 b/src/foo.ts\n";
    const res = validatePatchContentPaths(patch);
    expect(res.valid).toBe(false);
    expect(res.code).toBe("PATCH_NULL_BYTE");
  });

  test("isPatchPathSafe rejects null byte", () => {
    const res = isPatchPathSafe("experiments/runs/foo\x00/patch.diff");
    expect(res.valid).toBe(false);
  });
});
