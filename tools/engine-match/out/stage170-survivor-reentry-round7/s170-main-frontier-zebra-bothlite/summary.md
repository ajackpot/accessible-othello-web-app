# Survivor decision pair summary for s170-main-frontier-zebra-bothlite

- stage: 170
- candidate: `s170-main-frontier-zebra-bothlite`
- family: stage154-main-recenter
- move-ordering profile: late-potential-frontier-v1
- MPC profile: stage170-frontier-zebra-bothlite-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 8.45 | 8.33 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.54 | 9.26 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.93 | 9.64 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 80 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 7.99 | 7.75 | s154-main + s170-main-frontier-zebra-bothlite가 s154-main보다 paired score 기준 우세합니다. |
| s154-main | 160 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 9.63 | 9.34 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 5.0/12 (41.7%) | 7.0/12 (58.3%) | +0.167 | 9.76 | 9.53 | s154-main + s170-main-frontier-zebra-bothlite가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

