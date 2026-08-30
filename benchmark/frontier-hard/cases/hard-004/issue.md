# p-queue signal abort while queued not rejected

## Problem

When a task is added to a queue with limited concurrency and the task is still queued, aborting its signal should reject the task and remove it from the queue. Currently, the abort is ignored and the task remains queued.
