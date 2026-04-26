# Mainline decision pair summary for s157-main-wide-hybrid

- stage: 157
- candidate: `s157-main-wide-hybrid`
- legacy aliases: `s154-wide-hybrid`
- family: stage154-main-recenter
- move-ordering profile: stage154-wide-hybrid-v1
- MPC profile: stage154-verify-tight-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 8.12 | 8.20 | s154-both + s157-main-wide-hybrid가 s154-both보다 paired score 기준 우세합니다. |
| s154-both | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 9.52 | 9.04 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.83 | 9.60 | s154-both + s157-main-wide-hybrid가 s154-both보다 paired score 기준 우세합니다. |
| s154-main | 80 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 7.24 | 7.21 | s154-main + s157-main-wide-hybrid가 s154-main보다 paired score 기준 우세합니다. |
| s154-main | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.65 | 8.37 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.56 | 9.36 | s154-main + s157-main-wide-hybrid가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

