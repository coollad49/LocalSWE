# Immer array methods reverse/sort mutates base state

## Problem

When array methods like `reverse` or `sort` are used on a draft array and then an element of the reordered array is mutated, the original base state is incorrectly mutated. This violates the immutability guarantee and produces incorrect patches.
