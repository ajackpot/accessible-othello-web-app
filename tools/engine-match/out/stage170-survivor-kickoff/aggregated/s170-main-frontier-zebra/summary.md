# Aggregated split decision summary for s170-main-frontier-zebra

- stage: 170
- candidate: `s170-main-frontier-zebra`
- family: stage154-main-recenter
- move-ordering profile: late-potential-frontier-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 15.40 | 15.38 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 17.51 | 17.44 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-both | 240 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 17.55 | 17.58 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 15.47 | 15.41 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-main | 160 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 16.41 | 16.31 | baseline이 candidate overlay보다 앞섰습니다. |
| s154-main | 240 | 2.5/8 (31.3%) | 5.5/8 (68.8%) | +0.375 | 17.40 | 17.22 | candidate overlay가 baseline보다 앞섰습니다. |

- overall baseline points: 21.5/48
- overall candidate points: 26.5/48
- overall gap: +0.104

