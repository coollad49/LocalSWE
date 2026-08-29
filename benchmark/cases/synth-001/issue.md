# Issue: Updating a task erases fields not included in update

**Repository:** `task-manager`
**Component:** `TaskManager.updateTask`

## Description

Calling `updateTask(id, { title: "New" })` should only change `title`. Currently it erases `description`, `priority`, `status`, `dueDate` or sets them to `undefined`.

## Steps to Reproduce

```ts
import { TaskManager } from "./src/task-manager.ts";
const tm = new TaskManager();
const t = tm.createTask({ title: "Orig", priority: 2, description: "keep me" });
const updated = tm.updateTask(t.id, { title: "Updated" });
console.log(updated.description); // Expected "keep me", got undefined or ""
console.log(updated.priority); // Expected 2, got undefined
```

## Expected Behavior

- Only fields explicitly provided in `updates` should be changed
- Missing fields must retain previous values
- Existing validation should still apply for provided fields
