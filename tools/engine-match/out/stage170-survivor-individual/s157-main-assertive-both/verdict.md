# Verdict: `s157-main-assertive-both`

## 결론
` s157-main-assertive-both `는 **채택 유지**로 두겠습니다.

## 이번 단계에서 실제로 한 일
이번 단계는 fresh rerun이 아니라, **exact-match historical result를 stage170 individual lane으로 승격 정리**한 단계입니다.

그 방식이 유효했던 이유는 아래 둘이 동시에 성립했기 때문입니다.

- stage169의 `s157-main-assertive-both` candidate definition이 historical run 시점과 동일했습니다.
- `s154-main`, `s154-both` 위에 얹은 overlay engine-options JSON의 SHA-256이 모두 historical artifact와 정확히 일치했습니다.

따라서 같은 benchmark frame이라면, 새로 다시 돌리더라도 이번 단계의 판정 정보는 실질적으로 바뀌지 않습니다.

## 정리된 결과
- `s154-main`: **동률 -> 동률 -> 승리**
- `s154-both`: **승리 -> 동률 -> 승리**
- overall: baseline `20.0/48`, candidate `28.0/48`

특히 중요하게 볼 점은 아래입니다.

1. dual-baseline 6개 셀에 **음수 셀이 하나도 없습니다.**
2. stronger baseline인 `s154-both`에서 `80ms`, `240ms` 둘 다 **승리**입니다.
3. `240ms`에서 양 baseline 모두 **승리**라 long-think non-collapse가 아주 깔끔합니다.

## cost 해석
throughput은 사실상 중립입니다. 평균 nodes/ms가 baseline `9.19`, candidate `9.18`였고,
일부 행은 candidate가 더 빠르고 일부 행은 baseline이 더 빨랐지만, 전체 해석을 뒤집을 정도의 penalty는 보이지 않습니다.

## 해석
이 후보는 stage170 현재 생존 후보들 중에서 **가장 안정적인 individual anchor**로 봐도 무리가 없습니다.

이건 fresh head-to-head가 아니라 baseline-relative inference이긴 하지만,
현재 보류 중인 `s170-main-frontier-zebra`가 reinforced에서 overall `36:36`으로 멈춘 것과 비교하면,
`s157-main-assertive-both`는 baseline-relative 기준에서 더 강한 유지 신호를 보여줍니다.

## 추천 후속
다음 라운드의 가장 생산적인 비교는 아래입니다.

1. `s157-main-assertive-both` vs `s170-main-frontier-zebra` direct head-to-head
2. 필요하면 그 다음에 `s170-main-frontier-zebra`에 logic reinforcement를 얹은 재투입
