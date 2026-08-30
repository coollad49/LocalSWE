# path-to-regexp stringify fails to quote param names followed by astral ID_Continue

## Problem

Stringifying a parsed path that has a parameter name followed by text starting with an astral Unicode character that is an identifier continuation incorrectly fails to quote the parameter name, breaking parse/stringify round-trip.
