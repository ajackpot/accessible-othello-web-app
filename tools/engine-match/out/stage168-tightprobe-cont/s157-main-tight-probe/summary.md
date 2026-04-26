# Mainline decision pair summary for s157-main-tight-probe

- stage: 157
- candidate: `s157-main-tight-probe`
- legacy aliases: `s154-tight-probe`
- family: stage154-main-recenter
- move-ordering profile: stage154-tight-probe-v1
- MPC profile: stage154-verify-tight-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 8.06 | 8.11 | s154-both + s157-main-tight-probe가 s154-both보다 paired score 기준 우세합니다. |
| s154-both | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.84 | 8.77 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 9.45 | 9.31 | s154-both가 s154-both + s157-main-tight-probe보다 paired score 기준 우세합니다. |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 7.77 | 8.01 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.87 | 8.61 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 2.0/8 (25.0%) | 6.0/8 (75.0%) | +0.500 | 9.31 | 9.04 | s154-main + s157-main-tight-probe가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

