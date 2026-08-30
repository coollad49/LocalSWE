# Issue: Failed jobs are reported as successful

## Problem

When a queued job throws an error, it should be reported as a failure and retried according to policy. Currently, failures are reported as successes and retries never happen.
