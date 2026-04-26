# Survivor decision pair summary for s170-main-wide-zebra

- stage: 170
- candidate: `s170-main-wide-zebra`
- family: stage154-main-recenter
- move-ordering profile: wide-hybrid-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-wide-hybrid`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 80 ms
- seeds: 17
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 2.0/2 (100.0%) | 0.0/2 (0.0%) | -1.000 | 10.81 | 11.46 | s154-both가 s154-both + s170-main-wide-zebra보다 paired score 기준 우세합니다. |
| s154-main | 80 | 1.0/2 (50.0%) | 1.0/2 (50.0%) | +0.000 | 11.36 | 12.17 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

