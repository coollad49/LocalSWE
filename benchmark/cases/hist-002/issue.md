# Issue: Prototype pollution via `__proto__` in defaults

## Problem

When merging an object that has `__proto__` as an own property (e.g., from JSON `{"__proto__":{"polluted":true}}`), the merge pollutes `Object.prototype` instead of treating `__proto__` as a regular key.
