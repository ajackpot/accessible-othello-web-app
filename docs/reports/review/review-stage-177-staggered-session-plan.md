# Stage177 review - sequential carry-forward session plan

## 결론
사용자 규칙 변경을 그대로 반영해, survivor optimization 실험은 이제 **3-session / 6-trial sequential carry-forward plan**으로 고정합니다.

- session당 **2 trials**
- trial당 **24 games** (`80/160/240ms × 4 rounds × 2 opponents`)
- session당 **48 games**
- 전체 계획 **144 games**

핵심 차이는, 한 trial에서 **변경된 후보 1개만 새 logic으로 교체**하고,
나머지 invariant pairing은 **가장 최근 동일-logic 결과를 carry-forward**한다는 점입니다.

## 왜 이 방식이 맞는가
이번 plateau 구간에서는 세 후보를 매번 다시 full league로 돌리면,
실제로 바뀐 logic은 한 후보뿐인데도 나머지 한 pairing을 반복해서 다시 보게 됩니다.

반면 이번 plan은 매 trial마다 아래 두 질문만 새로 묻습니다.

1. 방금 삽입한 branch가 **두 상대 상대로 어떤 score 곡선**을 그리는가?
2. 그 branch가 들어간 뒤에도 나머지 한 pairing은 **직전 step의 결과를 그대로 유지해도 되는가?**

이렇게 하면 경기 수를 줄이면서도, 변경 원인을 더 깔끔하게 추적할 수 있습니다.

## slot / option 고정
- slot1: `s170-main-wide-zebra`
  - option1: `s176-main-wide-zebra-bothlite`
  - option2: `s176-main-wide-zebra-midtrim`
- slot2: `s157-main-assertive-both`
  - option1: `s176-main-wide-assertive`
  - option2: `s176-main-assertive-both-lite`
- slot3: `s170-main-frontier-zebra-bothlite`
  - option1: `s176-main-frontier-bothlite-parity`
  - option2: `s176-main-frontier-bothlite-topk2`

## 세션 순서
### Session 1
- trial1: slot1 -> option1
- trial2: slot2 -> option1

### Session 2
- trial3: slot3 -> option1
- trial4: slot1 -> option2

### Session 3
- trial5: slot2 -> option2
- trial6: slot3 -> option2

즉 사용자가 제시한 `1a -> 2a -> 3a -> 1b -> 2b -> 3b` 순서를 그대로 따릅니다.

## carry-forward 예시
- trial1 뒤에는 `slot2(base)` vs `slot3(base)`를 historical adopted-trio result로 재사용합니다.
- trial2에서는 `slot3(base)` vs `slot1(option1)`을 trial1 결과로 재사용합니다.
- trial3에서는 `slot1(option1)` vs `slot2(option1)`을 trial2 결과로 재사용합니다.
- 이후도 같은 방식으로 한 단계씩 밀고 갑니다.

이 chaining이 있기 때문에 “session당 48 games”가 성립합니다.

## 강화 규칙
기본 frame은 `4 rounds / condition`입니다.
다만 아래면 강화합니다.

- overall gap이 `±2` 이내
- 시간대별 sign flip이 남음
- adoption / retire / ceiling 판정이 애매함
- trial 도중 새로운 보강 후보가 생김

이때는 owning lane의 다음 차례에 splice하거나 별도 session으로 분리합니다.

## 실무 해석
이제부터는 이전의 “full league 1회/2회” budget 문구보다,
이번 **stage177 staggered session manifest**가 실제 운영 기준입니다.

즉 다음 실험은 manifest에 적힌 trial 순서대로 회수하면 됩니다.
