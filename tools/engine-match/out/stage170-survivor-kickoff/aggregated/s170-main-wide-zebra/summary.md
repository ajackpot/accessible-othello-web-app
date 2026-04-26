# Aggregated split decision summary for s170-main-wide-zebra

- stage: 170
- candidate: `s170-main-wide-zebra`
- family: stage154-main-recenter
- move-ordering profile: wide-hybrid-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-wide-hybrid`
- MPC source: stage158 / `s154-stable-zebra`

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 2.5/8 (31.3%) | 5.5/8 (68.8%) | +0.375 | 12.26 | 12.05 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-both | 160 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 13.51 | 13.36 | baseline이 candidate overlay보다 앞섰습니다. |
| s154-both | 240 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 14.13 | 13.91 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 12.03 | 11.90 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 2.0/8 (25.0%) | 6.0/8 (75.0%) | +0.500 | 13.55 | 13.51 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-main | 240 | 6.0/8 (75.0%) | 2.0/8 (25.0%) | -0.500 | 14.44 | 14.20 | baseline이 candidate overlay보다 앞섰습니다. |

- overall baseline points: 23.5/48
- overall candidate points: 24.5/48
- overall gap: +0.021

