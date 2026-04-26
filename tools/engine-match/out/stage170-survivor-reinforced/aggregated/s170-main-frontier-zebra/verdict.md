# Verdict: `s170-main-frontier-zebra`

## 결론
` s170-main-frontier-zebra ` reinforced retest 판정은 **보류**로 두겠습니다.

## 강화 재시험 결과
패턴은 아래처럼 정리됩니다.

- `s154-main`: **승리 -> 동률 -> 동률**
- `s154-both`: **동률 -> 패배 -> 동률**

전체 합산은 baseline `36.0/72`, candidate `36.0/72`로 **완전 동률**이었습니다.

## 무엇이 해소되었나
이번 reinforced retest는 round2의 핵심 질문이던 `s154-main 160ms` 음수 셀을 해소했습니다.
해당 셀은 seeds를 늘리자 **동률**로 수렴했습니다.

또한 `240ms`는 양 baseline 모두 **동률 이상**이라,
이 후보가 long-think에서 무너지는 타입은 아니라는 점도 다시 확인됐습니다.

## 왜 아직 채택이 아닌가
문제는 음수 셀이 **사라진 것이 아니라 축을 옮겨갔다**는 점입니다.
이번에는 stronger baseline인 `s154-both`에서 `160ms`가 **패배**로 내려왔습니다.

즉 reinforced 결과는
- `main` 축에서는 더 좋아졌지만,
- `both` 축에서는 mid-think weakness가 새로 드러났고,
- overall도 **36:36 동률**로 닫혔습니다.

이 상태는 채택 근거로 보기 어렵습니다.
특히 stage170 통합 후보를 mainline 승격 후보로 다루려면,
적어도 stronger baseline에서 mid-think 음수가 남지 않는 편이 안전합니다.

## cost 해석
throughput은 거의 중립입니다.
rows 6개 기준으로 candidate가 **3개 행에서 더 빠르고 3개 행에서 더 느렸으며**,
평균 nodes/ms는 baseline `5.10`, candidate `5.09`였습니다.

즉 이번 보류는 속도 penalty 때문에 생긴 보류가 아니라,
**fixed-time strength가 adoption 쪽으로도 discard 쪽으로도 아직 깔끔하게 기울지 않았기 때문**입니다.

## 해석
이번 reinforced retest는 “바로 채택”도 아니고 “즉시 폐기”도 아닙니다.
가장 자연스러운 해석은 아래와 같습니다.

- `s170-main-frontier-zebra`는 여전히 stage170 combo lane에서 **가장 다듬을 가치가 있는 보류 후보**입니다.
- 하지만 이번 샘플만으로는 **adoption-ready combo**라고 볼 수 없습니다.
- 따라서 다음 라운드에서는 단순 추가 표본보다,
  **logic reinforcement 후 재투입** 또는 `s157-main-assertive-both` 같은 surviving anchor와의 **직접 비교**가 더 생산적입니다.

## 추천 후속
다음 라운드의 우선순위는 아래 순서가 자연스럽습니다.

1. individual lane의 `s157-main-assertive-both`를 같은 프레임으로 재벤치해,
   현재 hold 후보들과의 상대 위치를 고정한다.
2. 그 다음 `s170-main-frontier-zebra`에는 단순 sample 확대보다,
   mid-think(`160ms`) 교차축 흔들림을 겨냥한 **logic 보강**을 얹어 재투입한다.
