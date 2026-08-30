# Issue: filterByStatus returns stale results after adding/updating tasks

## Problem

Filtering tasks by status should return the current matching tasks. Currently, it returns stale cached results after tasks are added or updated.
