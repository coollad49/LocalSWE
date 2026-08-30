# Issue: Alias defaults do not preserve string type (mri)

## Problem

When an option has a string default and an alias, the string type is not correctly propagated to the alias. For example, parsing `-a 01` where `a` aliases `arg` with a string default should preserve `"01"` as a string, but it is coerced to the number `1`.
