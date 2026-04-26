# Stage176 survivor optimization backlog summary

- confirmedPrimaryRounds: 1
- confirmedUpperBoundRounds: 2
- default per-condition rounds: 6

## s170-main-wide-zebra
- lane: wide-zebra
- primary: s176-main-wide-zebra-bothlite
- contingency: s176-main-wide-zebra-midtrim
- diagnosis: 80ms short-think는 가장 강하지만, `s157-main-assertive-both` direct match에서 160ms를 내주고 240ms takeover가 없습니다. 개선 포인트는 ordering이 아니라 MPC mid-think calibration 쪽이 우선입니다.
- ceiling rule: both-lite swap과 midtrim ordering이 모두 실패하면, 현재 wide-zebra lane은 사실상 구조 고점에 도달한 것으로 봅니다.

## s157-main-assertive-both
- lane: assertive-both
- primary: s176-main-wide-assertive
- contingency: s176-main-assertive-both-lite
- diagnosis: long-think non-collapse와 throughput은 좋지만, `s170-main-wide-zebra` direct match에서 80ms short-think를 내줍니다. 개선 포인트는 MPC를 더 세게 여는 것이 아니라 ordering의 초반 폭을 넓혀 fast lane 대응력을 올리는 쪽입니다.
- ceiling rule: wide-assertive와 assertive-both-lite가 둘 다 실패하면, assertive lane은 이미 자신의 최고 고점 부근에 있다고 보는 것이 타당합니다.

## s170-main-frontier-zebra-bothlite
- lane: frontier-bothlite
- primary: s176-main-frontier-bothlite-parity
- contingency: s176-main-frontier-bothlite-topk2
- diagnosis: mid/long-think는 안정적이고 `s157-main-assertive-both`와도 exact draw지만, `s170-main-wide-zebra`에게 80ms를 내주고 throughput도 밀립니다. 개선 포인트는 MPC가 아니라 ordering에 아주 작은 short-think assist를 더하는 것입니다.
- ceiling rule: parity-only와 tiny-topK 둘 다 실패하면, frontier-bothlite lane은 현재 구조상 plateau 상단에 도달한 것으로 정리할 수 있습니다.

