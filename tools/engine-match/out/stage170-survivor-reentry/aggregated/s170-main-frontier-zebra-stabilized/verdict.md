# Stage170 re-entry verdict - `s170-main-frontier-zebra-stabilized`

## 결론
` s170-main-frontier-zebra-stabilized `는 **비채택**입니다.

## 왜 이렇게 판정했는가
이번 보강안의 목표는 original `frontier-zebra` reinforced 결과에서 남아 있던
` s154-both 160ms ` 음수 셀을 줄이는 것이었습니다.

실제로 그 목표 하나는 달성했습니다.
- `s154-both`: **동률 -> 동률 -> 동률**

하지만 그 대가로 main 축이 나빠졌습니다.
- `s154-main`: **승리 -> 패배 -> 패배**

즉 보강 전에는 `s154-main`이 `승리 -> 동률 -> 동률`이었는데,
이번 보강 후에는 `160ms`, `240ms`가 모두 음수로 내려왔습니다.

overall 합산도 baseline `37.0/72`, candidate `35.0/72`로 candidate가 뒤졌습니다.
또한 nodes/ms는 6개 집계 행 전부 baseline이 더 높았고,
평균도 baseline `17.10`, candidate `16.74`였습니다.

## 해석
이번 re-entry는 “mid-think ambiguity를 ordering-side stabilization으로 해결할 수 있는가”를 보는 실험이었습니다.
결과는 **아니오** 쪽입니다.

- stronger baseline의 160ms 음수는 지워졌지만,
- main lane의 160ms/240ms가 악화됐고,
- overall과 throughput 모두 나빠졌습니다.

따라서 이 보강 방향은 `frontier-zebra`를 승격시키는 방향이 아니라,
오히려 기존 hold 후보보다 약한 파생안으로 보는 것이 맞습니다.

## 다음 해석 기준
- original `s170-main-frontier-zebra`는 **보류 유지**
- `s170-main-frontier-zebra-stabilized`는 **비채택**
- 이후 `frontier-zebra`를 다시 손볼 경우에는 ordering 쪽 추가 보강보다,
  **MPC-side 미세 조정** 또는 surviving candidate와의 **direct head-to-head**가 더 생산적입니다.
