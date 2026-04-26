# Stage170 kickoff round5 - `s170-main-wide-zebra` reinforced retest

## 1. 배경
Round1에서 `s170-main-wide-zebra`는 아래 패턴으로 **보류**였습니다.

- `s154-main`: `동률 -> 승리 -> 패배`
- `s154-both`: `승리 -> 패배 -> 동률`
- overall: baseline `23.5/48`, candidate `24.5/48`

즉 score는 아주 근소하게 앞섰지만,
시간축과 baseline축에서 sign flip이 너무 많아 구조적 해석이 어려웠습니다.
이번 round5에서는 동일한 `80/160/240ms`를 유지하되,
seeds를 `17,31,53,71,89,107`으로 늘린 **reinforced retest**를 수행했습니다.

실행 안정성을 위해 baseline/time별 split run으로 나누고,
결과는 aggregated summary로 다시 합쳤습니다.

## 2. 결과 요약
| candidate | `s154-main` pattern | `s154-both` pattern | overall | interim verdict |
| --- | --- | --- | --- | --- |
| `s170-main-wide-zebra` | `승리 -> 동률 -> 승리` | `동률 -> 동률 -> 승리` | baseline `32.5/72`, candidate `39.5/72` | **채택** |

## 3. 세부 해석
이번 reinforced는 round1의 모호함을 실질적으로 해소했습니다.

### round1 대비 좋아진 점
- `s154-main 240ms`가 패배에서 **승리**로 전환됐습니다.
- `s154-both 160ms` 패배가 **동률**로 수렴했습니다.
- `s154-both 240ms`도 동률이 아니라 **승리**로 올라왔습니다.
- 따라서 dual-baseline 6개 셀 전체에서 **음수 셀이 사라졌습니다.**

### 현재 남는 cost 메모
- rows 6개 중 candidate가 더 빠른 행은 `2개`, 더 느린 행은 `4개`였습니다.
- 다만 차이는 전반적으로 작고, throughput penalty가 adoption을 막을 정도로 크지는 않습니다.

## 4. 의미
이 결과는 `s170-main-wide-zebra`를 더 이상 보류 후보로 둘 이유가 약하다는 뜻입니다.

- 채택 쪽 근거: dual-baseline all non-loss, stronger baseline non-loss, 240ms 양수, overall +7.0 points
- 비채택 쪽 반론: throughput이 아주 약간 느린 행이 더 많음

하지만 이번 lane에서 중요하게 보는 것은
**fixed-time paired score의 재현 가능한 구조적 우세**입니다.
그 기준에서 보면 이번 후보는 aggressive combo임에도 불구하고,
round1의 noise/flip 서사를 reinforced에서 지워냈습니다.

따라서 이번 결론은 **채택**이 맞습니다.

## 5. lane 상태 업데이트
### combo lane
- `s170-main-wide-zebra`: **채택**
- `s170-main-stable-verify`: **비채택**
- `s170-main-frontier-zebra`: **보류 (logic reinforcement candidate)**

### individual lane
- `s157-main-assertive-both`: **채택 유지**

## 6. 추천 다음 단계
이제 combo lane의 기준점은 `frontier-zebra`가 아니라,
**surviving individual anchor인 `s157-main-assertive-both`**가 되어야 합니다.

따라서 다음 자연스러운 순서는 아래 둘 중 하나입니다.

1. `s170-main-wide-zebra` vs `s157-main-assertive-both` direct head-to-head
2. 또는 `s170-main-wide-zebra`를 stage170의 provisional top combo로 놓고,
   `s170-main-frontier-zebra` logic 보강 후 다시 challenger로 재투입
