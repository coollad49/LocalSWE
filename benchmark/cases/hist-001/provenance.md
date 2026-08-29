# Provenance — hist-001

- **Repository:** task-manager (benchmark/repositories/task-manager)
- **Source URL:** https://github.com/frontier-verifier/task-manager (synthetic benchmark-owned repo, MIT)
- **License:** MIT (https://opensource.org/licenses/MIT)
- **Base version:** 1.0.0
- **Buggy state:** src/utils.ts `isOverdue` uses `<=` instead of `<`
- **Fixed state:** src/utils.ts `isOverdue` uses `<` (known-good)
- **Mutation:** deterministic single-line change in comparison operator
- **Historical inspiration:** Common off-by-one/date boundary errors in task/todo applications (e.g., Todoist, Jira overdue logic)
- **Retrieval date:** 2026-08-29
- **Modifications by benchmark:** Introduced bug for case; no other modifications
