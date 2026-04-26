# Survivor decision pair summary for s170-main-wide-zebra

- stage: 170
- candidate: `s170-main-wide-zebra`
- family: stage154-main-recenter
- move-ordering profile: wide-hybrid-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-wide-hybrid`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 160 ms
- seeds: 17, 31, 53
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-main | 160 | 3.0/6 (50.0%) | 3.0/6 (50.0%) | +0.000 | 8.73 | 8.62 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

