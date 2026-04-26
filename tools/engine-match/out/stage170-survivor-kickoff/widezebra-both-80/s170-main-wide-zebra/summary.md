# Survivor decision pair summary for s170-main-wide-zebra

- stage: 170
- candidate: `s170-main-wide-zebra`
- family: stage154-main-recenter
- move-ordering profile: wide-hybrid-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-wide-hybrid`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 80 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 2.5/8 (31.3%) | 5.5/8 (68.8%) | +0.375 | 12.26 | 12.05 | s154-both + s170-main-wide-zebra가 s154-both보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

