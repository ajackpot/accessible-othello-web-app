# Mainline decision pair summary for s157-main-mpc-only

- stage: 157
- candidate: `s157-main-mpc-only`
- legacy aliases: `s154-mpc-main`
- family: stage154-main-recenter
- move-ordering profile: baseline-v1
- MPC profile: conservative-hybrid-v1
- timings: 320, 400 ms
- seeds: 17, 31, 53, 71, 89, 107
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 320 | 5.5/12 (45.8%) | 6.5/12 (54.2%) | +0.083 | 19.35 | 19.14 | s154-both + s157-main-mpc-only가 s154-both보다 paired score 기준 우세합니다. |
| s154-both | 400 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 18.49 | 18.13 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 320 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 18.43 | 18.02 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 400 | 6.0/12 (50.0%) | 6.0/12 (50.0%) | +0.000 | 18.28 | 17.91 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

