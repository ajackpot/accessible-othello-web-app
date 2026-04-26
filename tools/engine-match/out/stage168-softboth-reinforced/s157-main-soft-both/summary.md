# Mainline decision pair summary for s157-main-soft-both

- stage: 157
- candidate: `s157-main-soft-both`
- legacy aliases: `s154-soft-both`
- family: stage154-main-recenter
- move-ordering profile: stage154-wide-hybrid-v1
- MPC profile: stage154-both-guarded-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 3.5/12 (29.2%) | 8.5/12 (70.8%) | +0.417 | 7.84 | 8.34 | `s154-both + s157-main-soft-both` 쪽이 `s154-both`보다 paired score 기준 우세합니다. |
| s154-both | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.01 | 9.35 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 8.0/12 (66.7%) | 4.0/12 (33.3%) | -0.333 | 9.81 | 9.95 | `s154-both` 쪽이 `s154-both + s157-main-soft-both`보다 paired score 기준 우세합니다. |
| s154-main | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 7.65 | 8.22 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 9.19 | 9.44 | `s154-main + s157-main-soft-both` 쪽이 `s154-main`보다 paired score 기준 우세합니다. |
| s154-main | 240 | 6.5/12 (54.2%) | 5.5/12 (45.8%) | -0.083 | 9.60 | 9.71 | `s154-main` 쪽이 `s154-main + s157-main-soft-both`보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

| time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms |
|---|---:|---:|---:|---:|---:|
| 80 | 9.5/24 (39.6%) | 14.5/24 (60.4%) | +0.208 | 7.74 | 8.28 |
| 160 | 11.0/24 (45.8%) | 13.0/24 (54.2%) | +0.083 | 9.10 | 9.40 |
| 240 | 14.5/24 (60.4%) | 9.5/24 (39.6%) | -0.208 | 9.71 | 9.82 |

- overall baseline: 35.0/72 (48.6%)
- overall candidate: 37.0/72 (51.4%)
- overall gap: +2.8pp
- overall nodes/ms: baseline 9.11, candidate 9.38

