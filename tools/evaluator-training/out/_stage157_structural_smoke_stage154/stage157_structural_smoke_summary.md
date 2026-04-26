# Stage157 structural candidate smoke summary

샘플 수준 smoke이므로 strength 판정이 아니라 **구조가 실제로 켜지는지**, **제어군과 다른 수/점수를 내는지**, **rough timing이 어떤지**를 보는 용도입니다.

## stage154 main_recenter (stage154-main-recenter)

| candidate | tier | risk | move-ordering | MPC | PB window | ord nodes/ms | ord signal | ord move/score diff | mpc nodes/ms | mpc probes | mpc signal | mpc move/score diff |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `s154-control` | control | low | `baseline-v1` | `baseline-v1` | 0-18 | 6.97 | 0 | 0/0/2 | 13.64 | 97 | 0 | 0/0/2 |
| `s154-order-main` | balanced | low | `hybrid-main-v1` | `baseline-v1` | 0-18 | 13.27 | 9,189 | 0/0/2 | 12.63 | 97 | 0 | 0/0/2 |
| `s154-mpc-main` | balanced | low | `baseline-v1` | `conservative-hybrid-v1` | 0-18 | 14.98 | 0 | 0/0/2 | 14.42 | 0 | 936 | 0/0/2 |
| `s154-main` | balanced | medium | `hybrid-main-v1` | `conservative-hybrid-v1` | 0-18 | 13.68 | 9,189 | 0/0/2 | 13.70 | 0 | 915 | 0/0/2 |
| `s154-tight-probe` | balanced | medium | `stage154-tight-probe-v1` | `stage154-verify-tight-v1` | 0-18 | 14.29 | 9,229 | 0/0/2 | 13.53 | 0 | 1,014 | 0/0/2 |
| `s154-wide-hybrid` | aggressive | medium | `stage154-wide-hybrid-v1` | `stage154-verify-tight-v1` | 0-18 | 13.66 | 10,366 | 0/0/2 | 13.33 | 0 | 1,033 | 0/1/2 |
| `s154-exact-safe` | safe | low | `exact-parity-reply-v1` | `verify-near-v1` | 0-18 | 14.92 | 0 | 0/0/2 | 14.60 | 102 | 68 | 0/0/2 |
| `s154-frontier-gate` | safe | low | `late-potential-frontier-v1` | `static-gate-v1` | 0-18 | 15.04 | 8,453 | 0/0/2 | 13.30 | 5 | 138 | 0/0/2 |
| `s154-soft-both` | aggressive | high | `stage154-wide-hybrid-v1` | `stage154-both-guarded-v1` | 0-18 | 13.84 | 10,366 | 0/0/2 | 13.03 | 0 | 945 | 0/1/2 |
| `s154-assertive-both` | aggressive | high | `hybrid-probe-v1` | `assertive-both-v1` | 0-18 | 13.98 | 9,947 | 0/0/2 | 12.13 | 3 | 256 | 0/0/2 |

