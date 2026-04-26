# Stage 166 — stage154 pattern asset audit
- generated at: 2026-04-18T01:47:02.759Z
- sample seeds: 64
- sample plies: 24, 28, 32

## Pattern bank audit

### active
- profile count: 0
- no pattern bank profiles

### main
- profile count: 1
- pattern-bank-v1 balanced13 patched: board-dependent buckets 13/13, bias-only buckets 0/13

### wide
- profile count: 1
- pattern-bank-v1 balanced13 patched: board-dependent buckets 13/13, bias-only buckets 0/13

## Static evaluator comparison against active

- sample count: 192
- max raw delta vs active: 11454.000
- max residual after subtracting full stage154 pattern-bank contribution: 0.972
- average absolute residual after subtracting full stage154 pattern-bank contribution: 0.323
- max residual after subtracting stage154 pattern-bank bias only: 11454.000
- average absolute residual after subtracting stage154 pattern-bank bias only: 2779.479

Interpretation: residual-after-full-pattern-bank ≈ 0 means stage154 differs from active almost entirely through the new pattern-bank layer. residual-after-bias-only staying large means the layer is genuinely board-dependent, not bias-only.

