# Issue: Option default leaks to alias names when one alias parsed

## Problem

When an option has multiple names/aliases (e.g., `-b, --base-url`) and a default value, the default was incorrectly applied to all alias names even when one alias was already parsed. For example, parsing `--base-url https://gitlab.com` with a default of `https://github.com` incorrectly leaves `b` set to the default.
