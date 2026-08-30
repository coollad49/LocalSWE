# qs combine overflow flatten bug

## Problem

When parsing a query string with `comma: true` and `arrayLimit`, appending values to an already-overflowed array incorrectly nests the new values instead of spreading them. For example, `a=1,2,3,4,5,6&a=7,8` with `arrayLimit:5` should result in a flat object with indices 0..7, but it nests the second group.
