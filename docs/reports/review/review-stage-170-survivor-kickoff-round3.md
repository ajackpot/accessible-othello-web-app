# Stage170 kickoff round3 - `s170-main-frontier-zebra` reinforced retest

## 1. 배경
Round2에서 `s170-main-frontier-zebra`는 아래 패턴으로 **보류**였습니다.

- `s154-main`: `승리 -> 패배 -> 승리`
- `s154-both`: `동률 -> 승리 -> 동률`
- overall: baseline `21.5/48`, candidate `26.5/48`

핵심 미해결점은 `s154-main 160ms` 음수 셀이었습니다.
이번 round3에서는 같은 `80/160/240ms`를 유지하되,
seeds를 `17,31,53,71,89,107`으로 늘린 **reinforced retest**를 수행했습니다.

실행 안정성을 위해 baseline/time별 split run으로 나눈 뒤 aggregate했습니다.

## 2. 결과 요약
| candidate | `s154-main` pattern | `s154-both` pattern | overall | interim verdict |
| --- | --- | --- | --- | --- |
| `s170-main-frontier-zebra` | `승리 -> 동률 -> 동률` | `동률 -> 패배 -> 동률` | baseline `36.0/72`, candidate `36.0/72` | **보류 유지** |

## 3. 세부 해석
이번 reinforced는 round2와 비교해 중요한 변화를 만들었습니다.

### 좋아진 점
- round2의 핵심 리스크였던 `s154-main 160ms` 음수 셀이 **동률**로 수렴했습니다.
- `s154-main 240ms`, `s154-both 240ms` 모두 **동률**로 남아,
  long-think collapse는 여전히 보이지 않습니다.
- throughput은 거의 중립으로,
  rows 6개 중 candidate가 `3개`에서 더 빠르고 `3개`에서 더 느렸습니다.

### 나빠진 점
- stronger baseline인 `s154-both`에서 `160ms`가 **패배**로 드러났습니다.
- overall이 `36:36` **완전 동률**로 닫혀,
  adoption 쪽으로 밀어줄 누적 이득이 남지 않았습니다.

즉 이번 retest는 기존 음수 셀을 없애긴 했지만,
그 대신 **mid-think cross-baseline ambiguity**를 남겼습니다.

## 4. 의미
이 결과는 `s170-main-frontier-zebra`를 즉시 폐기할 근거도,
바로 채택할 근거도 주지 않았습니다.

- 채택이 아닌 이유: stronger baseline `160ms` 음수 + overall 동률
- 폐기가 아닌 이유: main 축 `80ms` 승리, 나머지 다섯 셀은 non-loss, 240ms collapse 없음, cost 중립

따라서 이 후보는 현재 combo lane에서 **logic reinforcement value가 가장 높은 보류 후보**로 보는 편이 맞습니다.

## 5. lane 상태 업데이트
### combo lane
- `s170-main-wide-zebra`: **보류**
- `s170-main-stable-verify`: **비채택**
- `s170-main-frontier-zebra`: **보류 (reinforced 완료, logic-reinforcement candidate)**

### individual lane
- `s157-main-assertive-both`: **아직 재투입 전**

## 6. 추천 다음 단계
다음 순서는 아래가 가장 자연스럽습니다.

1. individual lane의 `s157-main-assertive-both`를 benchmark해,
   combo hold 후보와 surviving anchor의 상대 위치를 먼저 고정한다.
2. 그 다음 `s170-main-frontier-zebra`는 단순 sample 확대보다,
   `s154-both 160ms` 흔들림을 겨냥한 **logic 보강** 후 재투입한다.
