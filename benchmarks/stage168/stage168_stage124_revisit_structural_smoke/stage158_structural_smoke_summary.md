# Stage157 structural candidate smoke summary

샘플 수준 smoke이므로 strength 판정이 아니라 **구조가 실제로 켜지는지**, **제어군과 다른 수/점수를 내는지**, **rough timing이 어떤지**를 보는 용도입니다.

## stage154 main_recenter (stage154-main-recenter)

| candidate | tier | risk | move-ordering | MPC | PB window | ord nodes/ms | ord signal | ord move/score diff | mpc nodes/ms | mpc probes | mpc signal | mpc move/score diff |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `s154-control` | control | low | `baseline-v1` | `baseline-v1` | 0-18 | 5.65 | 0 | 0/0/2 | 9.19 | 109 | 0 | 0/0/2 |
| `s154-anchor-main` | balanced | medium | `hybrid-main-v1` | `conservative-hybrid-v1` | 0-18 | 9.32 | 9,395 | 0/0/2 | 9.39 | 0 | 979 | 0/0/2 |
| `s154-stable-quiet` | balanced | medium | `stage154-stable-quiet-v1` | `conservative-hybrid-v1` | 0-18 | 7.49 | 17,852 | 0/0/2 | 8.11 | 0 | 949 | 0/1/2 |
| `s154-stable-quiet-probe` | balanced | medium | `stage154-stable-quiet-probe-v1` | `conservative-hybrid-v1` | 0-18 | 7.76 | 18,151 | 0/0/2 | 7.90 | 0 | 927 | 0/1/2 |
| `s154-stable-zebra` | balanced | medium | `stage154-stable-quiet-v1` | `stage154-zebra-guarded-v1` | 0-18 | 7.86 | 17,852 | 0/0/2 | 8.00 | 0 | 5,154 | 0/1/2 |
| `s154-stable-zebra-open` | balanced | medium | `stage154-stable-quiet-v1` | `stage154-zebra-open-v1` | 0-18 | 5.01 | 17,852 | 0/0/2 | 8.20 | 2 | 232 | 0/1/2 |

