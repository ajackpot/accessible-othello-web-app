# Stage157 structural candidate smoke summary

샘플 수준 smoke이므로 strength 판정이 아니라 **구조가 실제로 켜지는지**, **제어군과 다른 수/점수를 내는지**, **rough timing이 어떤지**를 보는 용도입니다.

## stage151 split_late3 (stage151-split-late3)

| candidate | tier | risk | move-ordering | MPC | PB window | ord nodes/ms | ord signal | ord move/score diff | mpc nodes/ms | mpc probes | mpc signal | mpc move/score diff |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `s151-control-full` | control | low | `baseline-v1` | `baseline-v1` | 0-19 | 6.10 | 0 | 0/0/2 | 13.26 | 97 | 0 | 0/0/2 |
| `s151-main-full` | balanced | low | `stage151-latebank-aligned-v1` | `stage151-latebank-conservative-v1` | 0-19 | 12.65 | 8,591 | 0/0/2 | 13.29 | 0 | 1,003 | 0/0/2 |
| `s151-noend-main` | balanced | low | `stage151-latebank-aligned-v1` | `stage151-latebank-conservative-v1` | 7-19 | 12.52 | 8,591 | 0/0/2 | 13.55 | 0 | 1,003 | 0/0/2 |
| `s151-latea-main` | safe | low | `stage151-latebank-aligned-v1` | `stage151-latebank-conservative-v1` | 13-19 | 14.14 | 8,591 | 0/0/2 | 13.83 | 0 | 1,003 | 0/0/2 |
| `s151-probe-noend` | balanced | medium | `stage151-latebank-probe-v1` | `stage151-latebank-conservative-v1` | 7-19 | 14.41 | 8,591 | 0/0/2 | 13.81 | 0 | 1,003 | 0/0/2 |
| `s151-linearizer-noend` | safe | low | `stage151-linearizer-v1` | `static-gate-v1` | 7-19 | 14.47 | 388 | 0/0/2 | 13.70 | 5 | 132 | 0/0/2 |
| `s151-linear-only` | balanced | low | `hybrid-main-v1` | `conservative-hybrid-v1` | off | 12.95 | 8,736 | 0/0/2 | 13.33 | 0 | 898 | 0/0/2 |
| `s151-parity-verify` | safe | low | `exact-parity-reply-v1` | `verify-near-v1` | 7-19 | 13.66 | 0 | 0/0/2 | 12.66 | 102 | 66 | 0/0/2 |
| `s151-soft-both-noend` | aggressive | high | `stage151-latebank-aligned-v1` | `stage151-both-guarded-v1` | 7-19 | 15.70 | 8,591 | 0/0/2 | 14.07 | 0 | 1,023 | 0/0/2 |
| `s151-full-both` | aggressive | high | `stage151-latebank-probe-v1` | `stage151-both-guarded-v1` | 0-19 | 14.41 | 8,591 | 0/0/2 | 13.35 | 0 | 1,023 | 0/0/2 |

