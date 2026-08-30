# Issue: Boolean defaults leak into _ (mri)

## Problem

When a boolean default is provided and a boolean flag is supplied, the parser incorrectly coerces the boolean default and pushes a numeric value into the positional arguments array.
