# Survivor head-to-head summary: s176-main-wide-zebra-midtrim vs s176-main-frontier-bothlite-topk2

- first candidate: `s176-main-wide-zebra-midtrim` (stage 176, family stage154-main-recenter)
- second candidate: `s176-main-frontier-bothlite-topk2` (stage 176, family stage154-main-recenter)
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- pattern from second-candidate perspective: **승리 -> 동률 -> 동률**
- overall: s176-main-wide-zebra-midtrim **11.5/24**, s176-main-frontier-bothlite-topk2 **12.5/24**

| time | first pts | second pts | gap (second-first) | first n/ms | second n/ms | outcome |
|---|---:|---:|---:|---:|---:|---|
| 80 | 3.5/8 (43.8%) | 4.5/8 (56.3%) | +0.125 | 7.07 | 8.09 | s176-main-frontier-bothlite-topk2 우세 |
| 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.55 | 9.09 | 동률 |
| 240 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 9.28 | 9.77 | 동률 |

- overall gap (second-first): **+1.0 pts**, rate **+0.042**
- overall nodes/ms: s176-main-wide-zebra-midtrim **8.58**, s176-main-frontier-bothlite-topk2 **9.22**

pointGapRate는 **second candidate - first candidate** 기준입니다.
