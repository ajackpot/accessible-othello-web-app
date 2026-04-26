# Survivor decision pair summary for s170-main-wide-zebra

- stage: 170
- candidate: `s170-main-wide-zebra`
- family: stage154-main-recenter
- move-ordering profile: wide-hybrid-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-wide-hybrid`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 240 ms
- seeds: 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-main | 240 | 2.0/6 (33.3%) | 4.0/6 (66.7%) | +0.333 | 10.30 | 10.23 | s154-main + s170-main-wide-zebra가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

