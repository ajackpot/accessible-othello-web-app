# Stage177 staggered session 3 trial 5

- mutated candidate: `s176-main-assertive-both-lite`
- base candidate: `s176-main-wide-assertive`
- change axis: mpc
- hypothesis: wide ordering이 과적합되거나 160/240ms를 해치면, MPC aggressiveness를 소폭 낮춰 short-think 손실 없이 균형점을 찾습니다.

## fresh pairings

### s176-main-frontier-bothlite-parity vs s176-main-assertive-both-lite

- s176-main-assertive-both-lite perspective pattern: **승리 -> 동률 -> 동률**; overall s176-main-frontier-bothlite-parity 11.5/24, s176-main-assertive-both-lite 12.5/24
- summary: tools/engine-match/out/stage177-staggered-session-runs/session-03-revised/trial-05/pairings/s176-main-frontier-bothlite-parity__vs__s176-main-assertive-both-lite/summary.json

### s176-main-wide-zebra-midtrim vs s176-main-assertive-both-lite

- s176-main-assertive-both-lite perspective pattern: **승리 -> 승리 -> 승리**; overall s176-main-wide-zebra-midtrim 9.5/24, s176-main-assertive-both-lite 14.5/24
- summary: tools/engine-match/out/stage177-staggered-session-runs/session-03-revised/trial-05/pairings/s176-main-wide-zebra-midtrim__vs__s176-main-assertive-both-lite/summary.json

## carried-forward invariant pairing

- pair: `s176-main-frontier-bothlite-parity` vs `s176-main-wide-zebra-midtrim`
- source: tools/engine-match/out/stage177-staggered-session-runs/session-02-reverted-incumbent-cache/s176-main-frontier-bothlite-parity__vs__s176-main-wide-zebra-midtrim/summary.json
- s176-main-wide-zebra-midtrim perspective pattern: **동률 -> 동률 -> 승리**; overall s176-main-frontier-bothlite-parity 11.0/24, s176-main-wide-zebra-midtrim 13.0/24

