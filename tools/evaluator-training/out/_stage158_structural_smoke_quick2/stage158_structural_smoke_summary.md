# Stage157 structural candidate smoke summary

샘플 수준 smoke이므로 strength 판정이 아니라 **구조가 실제로 켜지는지**, **제어군과 다른 수/점수를 내는지**, **rough timing이 어떤지**를 보는 용도입니다.

## stage151 split_late3 (stage151-split-late3)

| candidate | tier | risk | move-ordering | MPC | PB window | ord nodes/ms | ord signal | ord move/score diff | mpc nodes/ms | mpc probes | mpc signal | mpc move/score diff |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `s151-control-full` | control | low | `baseline-v1` | `baseline-v1` | 0-19 | 13.05 | 0 | 0/0/1 | 14.24 | 9 | 0 | 0/0/1 |
| `s151-anchor-noend` | balanced | low | `stage151-latebank-aligned-v1` | `stage151-latebank-conservative-v1` | 7-19 | 11.42 | 1,663 | 0/0/1 | 13.68 | 0 | 389 | 0/0/1 |
| `s151-noend-stable-quiet` | balanced | medium | `stage151-stable-quiet-noend-v1` | `stage151-latebank-conservative-v1` | 7-19 | 9.87 | 3,450 | 0/0/1 | 7.97 | 0 | 389 | 0/0/1 |
| `s151-noend-stable-zebra` | balanced | medium | `stage151-stable-quiet-noend-v1` | `stage151-zebra-guarded-v1` | 7-19 | 10.42 | 3,450 | 0/0/1 | 10.43 | 0 | 1,430 | 0/0/1 |
| `s151-latea-stable-zebra` | safe | low | `stage151-stable-quiet-latea-v1` | `stage151-zebra-guarded-v1` | 13-19 | 9.72 | 3,481 | 0/0/1 | 10.51 | 0 | 1,430 | 0/0/1 |
| `s151-noend-stable-zebra-open` | balanced | medium | `stage151-stable-quiet-noend-v1` | `stage151-zebra-open-v1` | 7-19 | 9.14 | 3,450 | 0/0/1 | 10.47 | 0 | 102 | 0/0/1 |
| `s151-linear-quiet-off` | safe | low | `stage151-linear-quiet-v1` | `stage151-zebra-guarded-v1` | off | 9.44 | 1,871 | 0/0/1 | 11.76 | 0 | 1,447 | 0/0/1 |
| `s151-noend-zebra-both` | aggressive | high | `stage151-stable-quiet-noend-v1` | `stage151-zebra-both-v1` | 7-19 | 10.42 | 3,450 | 0/0/1 | 11.44 | 0 | 1,430 | 0/0/1 |

## stage154 main_recenter (stage154-main-recenter)

| candidate | tier | risk | move-ordering | MPC | PB window | ord nodes/ms | ord signal | ord move/score diff | mpc nodes/ms | mpc probes | mpc signal | mpc move/score diff |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `s154-control` | control | low | `baseline-v1` | `baseline-v1` | 0-18 | 2.72 | 0 | 0/0/1 | 12.50 | 9 | 0 | 0/0/1 |
| `s154-anchor-main` | balanced | medium | `hybrid-main-v1` | `conservative-hybrid-v1` | 0-18 | 10.91 | 1,818 | 0/0/1 | 12.56 | 0 | 395 | 0/0/1 |
| `s154-stable-quiet` | balanced | medium | `stage154-stable-quiet-v1` | `conservative-hybrid-v1` | 0-18 | 8.25 | 3,879 | 0/0/1 | 11.23 | 0 | 395 | 0/0/1 |
| `s154-stable-quiet-probe` | balanced | medium | `stage154-stable-quiet-probe-v1` | `conservative-hybrid-v1` | 0-18 | 9.75 | 3,879 | 0/0/1 | 12.15 | 0 | 409 | 0/0/1 |
| `s154-stable-zebra` | balanced | medium | `stage154-stable-quiet-v1` | `stage154-zebra-guarded-v1` | 0-18 | 8.16 | 3,879 | 0/0/1 | 10.90 | 0 | 1,358 | 0/0/1 |
| `s154-stable-zebra-open` | balanced | medium | `stage154-stable-quiet-v1` | `stage154-zebra-open-v1` | 0-18 | 9.05 | 3,879 | 0/0/1 | 11.04 | 0 | 32 | 0/0/1 |
| `s154-zebra-both-probe` | aggressive | high | `stage154-stable-quiet-probe-v1` | `stage154-zebra-both-v1` | 0-18 | 9.75 | 3,879 | 0/0/1 | 11.57 | 0 | 1,267 | 0/0/1 |

