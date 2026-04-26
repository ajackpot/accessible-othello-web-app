# Mainline decision pair summary for s157-main-soft-both

- stage: 157
- candidate: `s157-main-soft-both`
- legacy aliases: `s154-soft-both`
- family: stage154-main-recenter
- move-ordering profile: stage154-wide-hybrid-v1
- MPC profile: stage154-both-guarded-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 2.5/8 (31.2%) | 5.5/8 (68.8%) | +0.375 | 7.89 | 8.50 | `s154-both + s157-main-soft-both` 쪽이 `s154-both`보다 paired score 기준 우세합니다. |
| s154-both | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.77 | 9.07 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 9.77 | 9.91 | `s154-both` 쪽이 `s154-both + s157-main-soft-both`보다 paired score 기준 우세합니다. |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 7.44 | 7.89 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.03 | 9.21 | `s154-main + s157-main-soft-both` 쪽이 `s154-main`보다 paired score 기준 우세합니다. |
| s154-main | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.56 | 9.57 | `s154-main + s157-main-soft-both` 쪽이 `s154-main`보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

| time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms |
|---|---:|---:|---:|---:|---:|
| 80 | 6.5/16 (40.6%) | 9.5/16 (59.4%) | +0.188 | 7.66 | 8.19 |
| 160 | 7.0/16 (43.8%) | 9.0/16 (56.2%) | +0.125 | 8.90 | 9.14 |
| 240 | 8.0/16 (50.0%) | 8.0/16 (50.0%) | +0.000 | 9.66 | 9.74 |

- overall baseline: 21.5/48 (44.8%)
- overall candidate: 26.5/48 (55.2%)
- overall gap: +10.4pp
- overall nodes/ms: baseline 9.00, candidate 9.24

