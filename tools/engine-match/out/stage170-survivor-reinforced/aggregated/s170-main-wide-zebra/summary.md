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
| s154-both | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 8.31 | 8.37 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.39 | 9.33 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 5.5/12 (45.8%) | 6.5/12 (54.2%) | +0.083 | 9.92 | 9.79 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-main | 80 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 7.59 | 7.66 | candidate overlay가 baseline보다 앞섰습니다. |
| s154-main | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 8.86 | 8.79 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 4.0/12 (33.3%) | 8.0/12 (66.7%) | +0.333 | 9.49 | 9.38 | candidate overlay가 baseline보다 앞섰습니다. |

- overall baseline points: 32.5/72
- overall candidate points: 39.5/72
- overall gap: +0.097

