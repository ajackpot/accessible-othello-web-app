# Survivor decision pair summary for s170-main-frontier-zebra-stabilized

- stage: 170
- candidate: `s170-main-frontier-zebra-stabilized`
- family: stage154-main-recenter
- move-ordering profile: stage170-frontier-stabilized-v1
- MPC profile: stage154-zebra-guarded-v1
- move-ordering source: stage157 / `s157-main-frontier-gate`
- MPC source: stage158 / `s154-stable-zebra`
- timings: 80 ms
- seeds: 17
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-main | 80 | 1.0/2 (50.0%) | 1.0/2 (50.0%) | +0.000 | 14.75 | 16.15 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

