# Verdict for s170-main-frontier-zebra-bothlite

- decision: **채택**
- candidate: `s170-main-frontier-zebra-bothlite`
- move-ordering profile: `late-potential-frontier-v1`
- MPC profile: `stage170-frontier-zebra-bothlite-v1`

## Pattern
- `s154-main`: **승리 -> 동률 -> 승리**
- `s154-both`: **동률 -> 동률 -> 동률**

## Aggregate
- overall points: baseline **34.0/72**, candidate **38.0/72**
- overall gap: **+5.6pp**
- overall avg nodes/ms: baseline **9.22**, candidate **8.98**

## Why adopt
1. original hold의 핵심 리스크였던 `s154-both 160ms` 음수가 **동률**로 해소됐다.
2. 여섯 개 baseline/time 셀에 **패배가 하나도 없다.**
3. ordering-side stabilized branch와 달리 `s154-main 240ms`가 다시 **승리**로 회복됐다.
4. stronger baseline `s154-both`는 전 시간대 **동률**이라 long-think collapse가 없다.
5. overall이 baseline **34.0/72**, candidate **38.0/72**로 채택 쪽으로 기운다.

## Lane resolution
- original `s170-main-frontier-zebra`: **원형 hold 기록만 유지, successor 채택으로 실무상 종료**
- `s170-main-frontier-zebra-stabilized`: **비채택 유지**
- `s170-main-frontier-zebra-bothlite`: **채택**
