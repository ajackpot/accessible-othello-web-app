# Mainline decision pair summary for s157-main-mpc-only

- stage: 157
- candidate: `s157-main-mpc-only`
- legacy aliases: `s154-mpc-main`
- family: stage154-main-recenter
- move-ordering profile: baseline-v1
- MPC profile: conservative-hybrid-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 8.0/12 (66.7%) | 4.0/12 (33.3%) | -0.333 | 8.57 | 8.76 | s154-both가 s154-both + s157-main-mpc-only보다 paired score 기준 우세합니다. |
| s154-both | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 10.05 | 9.82 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 10.24 | 10.10 | s154-both + s157-main-mpc-only가 s154-both보다 paired score 기준 우세합니다. |
| s154-main | 80 | 4.0/12 (33.3%) | 8.0/12 (66.7%) | +0.333 | 8.63 | 8.75 | s154-main + s157-main-mpc-only가 s154-main보다 paired score 기준 우세합니다. |
| s154-main | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.83 | 9.75 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 10.29 | 10.16 | s154-main + s157-main-mpc-only가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

