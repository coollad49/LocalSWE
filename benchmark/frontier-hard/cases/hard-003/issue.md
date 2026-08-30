# SuperJSON path escape mapping mishandles backslashes and versioning

## Problem

Serializing an object with keys containing backslashes or dots and non-JSON values (like Set or RegExp) does not round-trip correctly. For example, a key like `b\` with a Set value is not correctly restored after stringify and parse.
