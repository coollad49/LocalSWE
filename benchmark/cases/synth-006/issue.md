# Issue: dequeue silently returns undefined on empty queue

## Problem

Dequeueing from an empty queue should throw an error. Currently, it silently returns undefined.
