# Survivor head-to-head summary: s176-main-assertive-both-lite vs s176-main-frontier-bothlite-topk2

- first candidate: `s176-main-assertive-both-lite` (stage 176, family stage154-main-recenter)
- second candidate: `s176-main-frontier-bothlite-topk2` (stage 176, family stage154-main-recenter)
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71
- pattern from second-candidate perspective: **승리 -> 동률 -> 패배**
- overall: s176-main-assertive-both-lite **12.0/24**, s176-main-frontier-bothlite-topk2 **12.0/24**

| time | first pts | second pts | gap (second-first) | first n/ms | second n/ms | outcome |
|---|---:|---:|---:|---:|---:|---|
| 80 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 7.41 | 8.17 | s176-main-frontier-bothlite-topk2 우세 |
| 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 8.47 | 8.75 | 동률 |
| 240 | 5.0/8 (62.5%) | 3.0/8 (37.5%) | -0.250 | 9.39 | 9.50 | s176-main-assertive-both-lite 우세 |

- overall gap (second-first): **+0.0 pts**, rate **+0.000**
- overall nodes/ms: s176-main-assertive-both-lite **8.68**, s176-main-frontier-bothlite-topk2 **8.99**

pointGapRate는 **second candidate - first candidate** 기준입니다.
