# Technical Debt

- Validator currently swaps files in-place with backup/restore; for parallel evaluation will need temp copy per case (future evaluator).
- tsconfig excludes artifacts/private/public from type-check; consider moving them to separate tsconfig.
- No JSON schema validation yet in validator (only manual checks).
- Provenance.md per case is minimal; could include full license text.
