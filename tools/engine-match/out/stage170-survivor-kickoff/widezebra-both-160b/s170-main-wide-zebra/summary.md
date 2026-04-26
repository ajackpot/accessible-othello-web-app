# Survivor decision pair summary for s170-main-wide-zebra

- stage: 170
- candidate: `s170-main-wide-zebra`
- family: stage154-main-recenter
- move-ordering profile: wide-hybrid-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-wide-hybrid`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 160 ms
- seeds: 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 160 | 3.0/4 (75.0%) | 1.0/4 (25.0%) | -0.500 | 13.90 | 13.80 | s154-both가 s154-both + s170-main-wide-zebra보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

