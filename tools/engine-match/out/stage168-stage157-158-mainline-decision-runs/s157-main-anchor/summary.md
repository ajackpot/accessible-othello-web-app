# Mainline decision pair summary for s157-main-anchor

- stage: 157
- candidate: `s157-main-anchor`
- legacy aliases: `s154-main`
- family: stage154-main-recenter
- move-ordering profile: hybrid-main-v1
- MPC profile: conservative-hybrid-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 4.5/8 (56.3%) | 3.5/8 (43.8%) | -0.125 | 11.57 | 11.46 | s154-both가 s154-both + s157-main-anchor보다 paired score 기준 우세합니다. |
| s154-both | 160 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 12.30 | 11.95 | s154-both가 s154-both + s157-main-anchor보다 paired score 기준 우세합니다. |
| s154-both | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 13.14 | 12.91 | s154-both + s157-main-anchor가 s154-both보다 paired score 기준 우세합니다. |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 11.47 | 11.20 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 12.02 | 11.82 | s154-main가 s154-main + s157-main-anchor보다 paired score 기준 우세합니다. |
| s154-main | 240 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 12.89 | 12.61 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

