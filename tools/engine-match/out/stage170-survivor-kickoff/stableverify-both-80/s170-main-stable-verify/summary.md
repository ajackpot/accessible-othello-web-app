# Survivor decision pair summary for s170-main-stable-verify

- stage: 170
- candidate: `s170-main-stable-verify`
- family: stage154-main-recenter
- move-ordering profile: stage154-stable-quiet-v1
- MPC profile: verify-tight-v1
- move-ordering source: stage158 / `s154-stable-zebra`
- MPC source: stage157 / `s157-main-wide-hybrid`
- timings: 80 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 3.5/8 (43.8%) | 4.5/8 (56.3%) | +0.125 | 12.29 | 11.64 | s154-both + s170-main-stable-verify가 s154-both보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

