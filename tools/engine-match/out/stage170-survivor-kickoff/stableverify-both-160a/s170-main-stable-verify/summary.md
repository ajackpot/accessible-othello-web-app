# Survivor decision pair summary for s170-main-stable-verify

- stage: 170
- candidate: `s170-main-stable-verify`
- family: stage154-main-recenter
- move-ordering profile: stage154-stable-quiet-v1
- MPC profile: verify-tight-v1
- move-ordering source: stage158 / `s154-stable-zebra`
- MPC source: stage157 / `s157-main-wide-hybrid`
- timings: 160 ms
- seeds: 17, 31
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 160 | 1.0/4 (25.0%) | 3.0/4 (75.0%) | +0.500 | 12.64 | 12.20 | s154-both + s170-main-stable-verify가 s154-both보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

