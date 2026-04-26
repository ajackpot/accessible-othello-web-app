# Survivor decision pair summary for s170-main-frontier-zebra-stabilized

- stage: 170
- candidate: `s170-main-frontier-zebra-stabilized`
- family: stage154-main-recenter
- move-ordering profile: stage170-frontier-stabilized-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 80 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-main | 80 | 5.5/12 (45.8%) | 6.5/12 (54.2%) | +0.083 | 15.48 | 15.24 | s154-main + s170-main-frontier-zebra-stabilized가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

