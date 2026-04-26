# Stage177 staggered session 3 summary

- ending state: slot1=`s176-main-wide-zebra-midtrim`, slot2=`s176-main-assertive-both-lite`, slot3=`s176-main-frontier-bothlite-topk2`
- timings: 80, 160, 240 ms
- seeds: 17, 31, 53, 71

## pair results

### s176-main-wide-zebra-midtrim vs s176-main-assertive-both-lite

- s176-main-assertive-both-lite perspective pattern: **승리 -> 승리 -> 승리**; overall s176-main-wide-zebra-midtrim 9.5/24, s176-main-assertive-both-lite 14.5/24
- summary: tools/engine-match/out/stage177-staggered-session-runs/session-03-revised/trial-05/pairings/s176-main-wide-zebra-midtrim__vs__s176-main-assertive-both-lite/summary.json

### s176-main-wide-zebra-midtrim vs s176-main-frontier-bothlite-topk2

- s176-main-frontier-bothlite-topk2 perspective pattern: **승리 -> 동률 -> 동률**; overall s176-main-wide-zebra-midtrim 11.5/24, s176-main-frontier-bothlite-topk2 12.5/24
- summary: tools/engine-match/out/stage177-staggered-session-runs/session-03-revised/trial-06/pairings/s176-main-wide-zebra-midtrim__vs__s176-main-frontier-bothlite-topk2/summary.json

### s176-main-assertive-both-lite vs s176-main-frontier-bothlite-topk2

- s176-main-frontier-bothlite-topk2 perspective pattern: **승리 -> 동률 -> 패배**; overall s176-main-assertive-both-lite 12.0/24, s176-main-frontier-bothlite-topk2 12.0/24
- summary: tools/engine-match/out/stage177-staggered-session-runs/session-03-revised/trial-06/pairings/s176-main-assertive-both-lite__vs__s176-main-frontier-bothlite-topk2/summary.json

## direct points ledger

| candidate | direct points | direct games | score rate | overall nodes/ms |
|---|---:|---:|---:|---:|
| s176-main-assertive-both-lite | 26.5 | 48 | 55.2% | 8.92 |
| s176-main-frontier-bothlite-topk2 | 24.5 | 48 | 51.0% | 9.10 |
| s176-main-wide-zebra-midtrim | 21.0 | 48 | 43.8% | 8.43 |

