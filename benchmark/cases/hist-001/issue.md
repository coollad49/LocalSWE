# Issue: Tasks due today incorrectly shown as overdue

**Repository:** `task-manager`
**Component:** `TaskManager.getOverdueTasks()`

## Description

Users report that tasks with a due date of **today** are being flagged as overdue, even though they should not be considered overdue until the next day. Only tasks whose due date is strictly before today should be returned by `getOverdueTasks()`.

## Steps to Reproduce

```ts
import { TaskManager } from "./src/task-manager.ts";

const tm = new TaskManager();
tm.createTask({ title: "overdue", priority: 1, dueDate: "2024-01-01" });
tm.createTask({ title: "today", priority: 1, dueDate: "2024-06-15" });
tm.createTask({ title: "future", priority: 1, dueDate: "2024-12-31" });

const now = new Date("2024-06-15T12:00:00Z");
console.log(tm.getOverdueTasks(now).map(t => t.title));
// Expected: ["overdue"]
// Actual: ["overdue", "today"]  <- bug
```

## Expected Behavior

- `getOverdueTasks(now)` should return only tasks where `dueDate < today` and status is not `completed`/`archived`.
- Tasks due today should **not** be included.
- Tasks with `dueDate: null` should never be overdue.
- Completed/archived tasks should never be overdue even if due date is in the past.

## Environment

- Node 22 / Bun 1.4.0
- `bun test` should pass after fix

## Notes

- Check `src/utils.ts` helper `isOverdue` and how date comparison is performed.
- The fix should not break existing tests in `tests/task-manager.test.ts`.
