# Issue: Priority validation allows out-of-range values

**Repository:** `task-manager`
**Component:** `validators.isValidPriority` / `TaskManager.createTask`

## Description

Creating a task with priority `0` or `6` should throw but currently succeeds. Allowed priorities are integers `1-5` inclusive.

## Steps to Reproduce

```ts
import { TaskManager } from "./src/task-manager.ts";
const tm = new TaskManager();
tm.createTask({ title: "bad", priority: 0 as any }); // should throw, does not
tm.createTask({ title: "bad", priority: 6 as any }); // should throw, does not
```

## Expected Behavior

- `createTask`, `updateTask`, `getTasksByPriority`, and `validatePriority` should reject any value not in `[1,2,3,4,5]`
- Error message should contain "Invalid priority"
