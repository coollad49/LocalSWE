# Issue: spyOn leaks own property when spying on prototype method

## Problem

When spying on a method defined on an object's prototype and then restoring, the spy incorrectly leaves an own property on the instance instead of removing it, so the prototype method is not correctly restored.
