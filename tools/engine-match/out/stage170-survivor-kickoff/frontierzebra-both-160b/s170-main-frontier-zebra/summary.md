# Survivor decision pair summary for s170-main-frontier-zebra

- stage: 170
- candidate: `s170-main-frontier-zebra`
- family: stage154-main-recenter
- move-ordering profile: late-potential-frontier-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 160 ms
- seeds: 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 160 | 2.0/4 (50.0%) | 2.0/4 (50.0%) | +0.000 | 17.76 | 18.06 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

