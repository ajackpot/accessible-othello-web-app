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
| s154-both | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 4.16 | 4.05 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 7.0/12 (58.3%) | 5.0/12 (41.7%) | -0.167 | 5.38 | 5.41 | baseline이 candidate overlay보다 앞섰습니다. |
| s154-both | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 5.96 | 5.89 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 4.27 | 4.37 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-main | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 5.05 | 5.11 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 5.76 | 5.71 | 두 profile variant의 paired score가 사실상 동률입니다. |

- overall baseline points: 36.0/72
- overall candidate points: 36.0/72
- overall gap: +0.000

