# Survivor decision pair summary for s170-main-frontier-zebra

- stage: 170
- candidate: `s170-main-frontier-zebra`
- family: stage154-main-recenter
- move-ordering profile: late-potential-frontier-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 160 ms
- seeds: 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 160 | 4.0/6 (66.7%) | 2.0/6 (33.3%) | -0.333 | 5.52 | 5.50 | s154-both가 s154-both + s170-main-frontier-zebra보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

