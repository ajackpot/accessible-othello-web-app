# Mainline decision pair summary for s157-main-order-only

- stage: 157
- candidate: `s157-main-order-only`
- legacy aliases: `s154-order-main`
- family: stage154-main-recenter
- move-ordering profile: hybrid-main-v1
- MPC profile: baseline-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 7.0/12 (58.3%) | 5.0/12 (41.7%) | -0.167 | 15.03 | 15.05 | s154-both가 s154-both + s157-main-order-only보다 paired score 기준 우세합니다. |
| s154-both | 160 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 16.02 | 16.02 | s154-both + s157-main-order-only가 s154-both보다 paired score 기준 우세합니다. |
| s154-both | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 17.77 | 17.41 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 7.5/12 (62.5%) | 4.5/12 (37.5%) | -0.250 | 14.65 | 14.62 | s154-main가 s154-main + s157-main-order-only보다 paired score 기준 우세합니다. |
| s154-main | 160 | 4.0/12 (33.3%) | 8.0/12 (66.7%) | +0.333 | 15.02 | 15.05 | s154-main + s157-main-order-only가 s154-main보다 paired score 기준 우세합니다. |
| s154-main | 240 | 7.0/12 (58.3%) | 5.0/12 (41.7%) | -0.167 | 15.17 | 14.81 | s154-main가 s154-main + s157-main-order-only보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

