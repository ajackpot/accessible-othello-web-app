# Mainline decision pair summary for s157-main-tight-probe

- stage: 157
- candidate: `s157-main-tight-probe`
- legacy aliases: `s154-tight-probe`
- family: stage154-main-recenter
- move-ordering profile: stage154-tight-probe-v1
- MPC profile: stage154-verify-tight-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 8.53 | 8.31 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 5.5/12 (45.8%) | 6.5/12 (54.2%) | +0.083 | 9.39 | 9.30 | s154-both + s157-main-tight-probe가 s154-both보다 paired score 기준 우세합니다. |
| s154-both | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.99 | 9.68 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 8.35 | 8.27 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.51 | 9.17 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.45 | 9.09 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

