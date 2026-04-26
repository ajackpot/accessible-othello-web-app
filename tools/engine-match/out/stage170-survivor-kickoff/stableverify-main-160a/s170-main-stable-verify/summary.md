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
| s154-main | 160 | 2.0/4 (50.0%) | 2.0/4 (50.0%) | +0.000 | 13.66 | 13.19 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

