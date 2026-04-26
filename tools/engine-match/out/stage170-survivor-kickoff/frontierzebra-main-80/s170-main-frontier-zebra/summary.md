# Survivor decision pair summary for s170-main-frontier-zebra

- stage: 170
- candidate: `s170-main-frontier-zebra`
- family: stage154-main-recenter
- move-ordering profile: late-potential-frontier-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 80 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-main | 80 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 15.47 | 15.41 | s154-main + s170-main-frontier-zebra가 s154-main보다 paired score 기준 우세합니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

