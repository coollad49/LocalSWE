# Issue: spyOn fails to mock inherited methods

## Problem

Spying on a getter that is inherited from a parent class prototype fails. The spy should correctly find and mock the descriptor from the prototype chain, but it only checks the immediate prototype and throws or fails to mock.
