# Aggregated split decision summary for s170-main-stable-verify

- stage: 170
- candidate: `s170-main-stable-verify`
- family: stage154-main-recenter
- move-ordering profile: stage154-stable-quiet-v1
- MPC profile: verify-tight-v1
- move-ordering source: stage158 / `s154-stable-zebra`
- MPC source: stage157 / `s157-main-wide-hybrid`

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 3.5/8 (43.8%) | 4.5/8 (56.3%) | +0.125 | 12.29 | 11.64 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-both | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 13.35 | 12.77 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 13.89 | 13.34 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 6.0/8 (75.0%) | 2.0/8 (25.0%) | -0.500 | 12.08 | 11.34 | baseline이 candidate overlay보다 앞섰습니다. |
| s154-main | 160 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 13.90 | 13.24 | baseline이 candidate overlay보다 앞섰습니다. |
| s154-main | 240 | 6.0/8 (75.0%) | 2.0/8 (25.0%) | -0.500 | 14.75 | 13.93 | baseline이 candidate overlay보다 앞섰습니다. |

- overall baseline points: 28.5/48
- overall candidate points: 19.5/48
- overall gap: -0.188

