# Stage177 survivor staggered session plan

- per-condition rounds: 4
- time controls: 80, 160, 240 ms
- games per trial: 24
- games per session: 48
- planned sessions: 3
- total planned games: 144

## Lineup

### Slot 1 - wide-zebra
- base: s170-main-wide-zebra
- option1: s176-main-wide-zebra-bothlite
- option2: s176-main-wide-zebra-midtrim
- diagnosis: 80ms short-think는 가장 강하지만, `s157-main-assertive-both` direct match에서 160ms를 내주고 240ms takeover가 없습니다. 개선 포인트는 ordering이 아니라 MPC mid-think calibration 쪽이 우선입니다.

### Slot 2 - assertive-both
- base: s157-main-assertive-both
- option1: s176-main-wide-assertive
- option2: s176-main-assertive-both-lite
- diagnosis: long-think non-collapse와 throughput은 좋지만, `s170-main-wide-zebra` direct match에서 80ms short-think를 내줍니다. 개선 포인트는 MPC를 더 세게 여는 것이 아니라 ordering의 초반 폭을 넓혀 fast lane 대응력을 올리는 쪽입니다.

### Slot 3 - frontier-bothlite
- base: s170-main-frontier-zebra-bothlite
- option1: s176-main-frontier-bothlite-parity
- option2: s176-main-frontier-bothlite-topk2
- diagnosis: mid/long-think는 안정적이고 `s157-main-assertive-both`와도 exact draw지만, `s170-main-wide-zebra`에게 80ms를 내주고 throughput도 밀립니다. 개선 포인트는 MPC가 아니라 ordering에 아주 작은 short-think assist를 더하는 것입니다.

## Session 1

- total games: 48
- omission rule: 각 trial은 변경된 후보 1개만 새 logic으로 교체하고, 나머지 invariant pairing은 가장 최근 동일-logic 결과를 carry-forward 합니다.

### Trial 1
- mutated: s176-main-wide-zebra-bothlite (from s170-main-wide-zebra)
- opponents: s157-main-assertive-both, s170-main-frontier-zebra-bothlite
- skipped invariant pairing: s157-main-assertive-both vs s170-main-frontier-zebra-bothlite
- reuse source: historical round10 adopted trio result
- axis: mpc
- hypothesis: 160ms 약세를 줄이면서 80ms 우세를 최대한 유지합니다.
- frame: 80/160/240 ms x 4 rounds x 2 opponents = 24 games

### Trial 2
- mutated: s176-main-wide-assertive (from s157-main-assertive-both)
- opponents: s170-main-frontier-zebra-bothlite, s176-main-wide-zebra-bothlite
- skipped invariant pairing: s170-main-frontier-zebra-bothlite vs s176-main-wide-zebra-bothlite
- reuse source: trial1 invariant pairing
- axis: ordering
- hypothesis: 80ms deficit를 메우면서 기존 160/240ms 안정성을 최대한 유지합니다.
- frame: 80/160/240 ms x 4 rounds x 2 opponents = 24 games

## Session 2

- total games: 48
- omission rule: 각 trial은 변경된 후보 1개만 새 logic으로 교체하고, 나머지 invariant pairing은 가장 최근 동일-logic 결과를 carry-forward 합니다.

### Trial 3
- mutated: s176-main-frontier-bothlite-parity (from s170-main-frontier-zebra-bothlite)
- opponents: s176-main-wide-zebra-bothlite, s176-main-wide-assertive
- skipped invariant pairing: s176-main-wide-zebra-bothlite vs s176-main-wide-assertive
- reuse source: trial2 invariant pairing
- axis: ordering
- hypothesis: 80ms 약세를 거의 공짜 비용으로 줄이고, 160/240ms draw 성격을 유지합니다.
- frame: 80/160/240 ms x 4 rounds x 2 opponents = 24 games

### Trial 4
- mutated: s176-main-wide-zebra-midtrim (from s176-main-wide-zebra-bothlite)
- opponents: s176-main-wide-assertive, s176-main-frontier-bothlite-parity
- skipped invariant pairing: s176-main-wide-assertive vs s176-main-frontier-bothlite-parity
- reuse source: trial3 invariant pairing
- axis: ordering
- hypothesis: 80ms edge를 유지하면서 160ms sign flip을 줄입니다.
- frame: 80/160/240 ms x 4 rounds x 2 opponents = 24 games

## Session 3

- total games: 48
- omission rule: 각 trial은 변경된 후보 1개만 새 logic으로 교체하고, 나머지 invariant pairing은 가장 최근 동일-logic 결과를 carry-forward 합니다.

### Trial 5
- mutated: s176-main-assertive-both-lite (from s176-main-wide-assertive)
- opponents: s176-main-frontier-bothlite-parity, s176-main-wide-zebra-midtrim
- skipped invariant pairing: s176-main-frontier-bothlite-parity vs s176-main-wide-zebra-midtrim
- reuse source: trial4 invariant pairing
- axis: mpc
- hypothesis: wide ordering이 과적합되거나 160/240ms를 해치면, MPC aggressiveness를 소폭 낮춰 short-think 손실 없이 균형점을 찾습니다.
- frame: 80/160/240 ms x 4 rounds x 2 opponents = 24 games

### Trial 6
- mutated: s176-main-frontier-bothlite-topk2 (from s176-main-frontier-bothlite-parity)
- opponents: s176-main-wide-zebra-midtrim, s176-main-assertive-both-lite
- skipped invariant pairing: s176-main-wide-zebra-midtrim vs s176-main-assertive-both-lite
- reuse source: trial5 invariant pairing
- axis: ordering
- hypothesis: parity-only가 무효일 때만 short-think 보조를 한 단계 더 줍니다.
- frame: 80/160/240 ms x 4 rounds x 2 opponents = 24 games

