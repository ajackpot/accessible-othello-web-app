# Mainline decision pair summary for s157-main-exact-safe

- stage: 157
- candidate: `s157-main-exact-safe`
- legacy aliases: `s154-exact-safe`
- family: stage154-main-recenter
- move-ordering profile: exact-parity-reply-v1
- MPC profile: verify-near-v1
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- paired openings per seed: 1

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |
|---|---:|---:|---:|---:|---:|---:|---|
| s154-both | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 12.59 | 13.03 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 13.74 | 13.54 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-both | 240 | 4.5/8 (56.3%) | 3.5/8 (43.8%) | -0.125 | 14.97 | 14.91 | s154-both가 s154-both + s157-main-exact-safe보다 paired score 기준 우세합니다. |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 12.07 | 12.25 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 13.06 | 12.89 | 두 profile variant의 paired score가 사실상 동률입니다. |
| s154-main | 240 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 13.87 | 13.95 | 두 profile variant의 paired score가 사실상 동률입니다. |

pointGap은 **candidate overlay - baseline** 기준입니다.

