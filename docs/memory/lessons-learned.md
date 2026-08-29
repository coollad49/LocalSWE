# Lessons Learned

- Float rounding (1.005) requires epsilon handling; initial money-utils tests failed until epsilon added.
- synth-005 initial rate 0.9234 produced no floor vs round difference; need half-cent edge (0.92345) to ensure behavioral difference.
- File path resolution for imports from cases must use 3 levels (`../../../repositories`) to reach benchmark root correctly.
- In-place file swapping validator is simple but requires careful backup/restore; future isolation should use temp dir copies.
