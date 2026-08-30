# Issue: Currency conversion truncates instead of rounding

## Problem

Converting currencies should round to the nearest cent. Currently, it truncates, so a conversion that should be 92.35 is returned as 92.34.
