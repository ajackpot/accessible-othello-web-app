# Survivor decision pair summary for s170-main-stable-verify

- stage: 170
- candidate: `s170-main-stable-verify`
- family: stage154-main-recenter
- move-ordering profile: stage154-stable-quiet-v1
- MPC profile: verify-tight-v1
- move-ordering source: stage158 / `s154-stable-zebra`
- MPC source: stage157 / `s157-main-wide-hybrid`
- timings: 240 ms
- seeds: 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-main | 240 | 3.0/4 (75.0%) | 1.0/4 (25.0%) | -0.500 | 14.29 | 13.52 | s154-main가 s154-main + s170-main-stable-verify보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

