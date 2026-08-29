# Issue: filterByStatus returns stale results after adding/updating tasks

**Repository:** `task-manager`
**Component:** `TaskManager.filterByStatus`

## Description

After adding or updating tasks, `filterByStatus` keeps returning the old cached result instead of the current state.

## Steps to Reproduce

```ts
import { TaskManager } from "./src/task-manager.ts";
const tm = new TaskManager();
tm.createTask({ title: "a", priority: 1, status: "pending" });
console.log(tm.filterByStatus("pending").length); // 1 - correct
tm.createTask({ title: "b", priority: 1, status: "pending" });
console.log(tm.filterByStatus("pending").length); // Expected 2, got 1 (stale)
```

Updating status also stale:

```ts
const t = tm.filterByStatus("pending")[0]!;
tm.updateTask(t.id, { status: "completed" });
console.log(tm.filterByStatus("pending").length); // Expected 1, got 2
```

## Expected Behavior

- Cache should be invalidated on `createTask`, `updateTask`, `deleteTask`, `clear`
- Subsequent `filterByStatus` calls must reflect latest state
