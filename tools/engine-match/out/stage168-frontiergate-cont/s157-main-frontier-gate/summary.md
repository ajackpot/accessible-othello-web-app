# Mainline decision pair summary for s157-main-frontier-gate

- stage: 157
- candidate: `s157-main-frontier-gate`
- legacy aliases: `s154-frontier-gate`
- family: stage154-main-recenter
- move-ordering profile: late-potential-frontier-v1
- MPC profile: static-gate-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.58 | 8.89 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.36 | 9.33 | s154-both + s157-main-frontier-gate가 s154-both보다 paired score 기준 우세합니다. |
| s154-both | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 10.07 | 10.01 | s154-both + s157-main-frontier-gate가 s154-both보다 paired score 기준 우세합니다. |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 7.44 | 7.62 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.79 | 8.73 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.31 | 9.11 | s154-main + s157-main-frontier-gate가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

