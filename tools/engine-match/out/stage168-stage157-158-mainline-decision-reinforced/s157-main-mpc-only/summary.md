# Reinforced mainline decision summary for s157-main-mpc-only

- candidate: `s157-main-mpc-only`
- source summaries:
  - core retest: `tools/engine-match/out/stage168-stage157-158-mainline-decision-core-retest/s157-main-mpc-only/summary.json`
  - long retest: `tools/engine-match/out/stage168-stage157-158-mainline-decision-long-retest/s157-main-mpc-only/summary.json`
- timings: `80,160,240,320,400 ms`
- seeds: `17,31,53,71,89,107`
- paired openings per seed: `1`
- verdict: **non-adoption**

## Baseline aggregates

| baseline | baseline pts | candidate pts | gap | baseline n/ms avg | candidate n/ms avg |
|---|---:|---:|---:|---:|---:|
| s154-both | 28.5/60 (47.5%) | 31.5/60 (52.5%) | +3.0 | 18.38 | 18.21 |
| s154-main | 30.0/60 (50.0%) | 30.0/60 (50.0%) | +0.0 | 18.44 | 18.23 |

## Time-bucket aggregates

| time | baseline pts | candidate pts | gap | baseline n/ms avg | candidate n/ms avg |
|---|---:|---:|---:|---:|---:|
| 80ms | 12.0/24 (50.0%) | 12.0/24 (50.0%) | +0.0 | 17.04 | 17.08 |
| 160ms | 11.0/24 (45.8%) | 13.0/24 (54.2%) | +2.0 | 18.08 | 18.15 |
| 240ms | 12.0/24 (50.0%) | 12.0/24 (50.0%) | +0.0 | 19.63 | 19.28 |
| 320ms | 11.5/24 (47.9%) | 12.5/24 (52.1%) | +1.0 | 18.89 | 18.58 |
| 400ms | 12.0/24 (50.0%) | 12.0/24 (50.0%) | +0.0 | 18.39 | 18.02 |

## Per-row detail

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms |
|---|---:|---:|---:|---:|---:|---:|
| s154-both | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 16.49 | 16.65 |
| s154-both | 160 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +2.0 | 17.86 | 17.93 |
| s154-both | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 19.69 | 19.21 |
| s154-both | 320 | 5.5/12 (45.8%) | 6.5/12 (54.2%) | +1.0 | 19.35 | 19.14 |
| s154-both | 400 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 18.49 | 18.13 |
| s154-main | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 17.59 | 17.50 |
| s154-main | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 18.31 | 18.38 |
| s154-main | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 19.58 | 19.34 |
| s154-main | 320 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 18.43 | 18.02 |
| s154-main | 400 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.0 | 18.28 | 17.91 |

Overall: baseline `58.5/120` (48.8%), candidate `61.5/120` (51.2%).

The reinforced rerun closes the previous hold. The candidate is not a clean cross-baseline win and is slightly slower on average, so it should stay non-adopted as a standalone default.
