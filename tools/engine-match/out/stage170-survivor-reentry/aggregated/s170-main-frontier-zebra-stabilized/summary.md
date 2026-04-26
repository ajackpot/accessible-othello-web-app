# Aggregated split decision summary for s170-main-frontier-zebra-stabilized

- stage: 170
- candidate: `s170-main-frontier-zebra-stabilized`
- family: stage154-main-recenter
- move-ordering profile: stage170-frontier-stabilized-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 15.74 | 15.63 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 18.16 | 17.82 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 18.15 | 17.62 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 5.5/12 (45.8%) | 6.5/12 (54.2%) | +0.083 | 15.48 | 15.24 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-main | 160 | 6.5/12 (54.2%) | 5.5/12 (45.8%) | -0.083 | 17.55 | 16.98 | baseline이 candidate overlay보다 앞섰습니다. |
| s154-main | 240 | 7.0/12 (58.3%) | 5.0/12 (41.7%) | -0.167 | 17.54 | 17.13 | baseline이 candidate overlay보다 앞섰습니다. |

- overall baseline points: 37.0/72
- overall candidate points: 35.0/72
- overall gap: -0.028

