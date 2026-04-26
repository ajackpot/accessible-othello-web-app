# Verdict: `s170-main-frontier-zebra`

## 결론
` s170-main-frontier-zebra `는 **보류**로 두는 편이 맞습니다.

## 근거
패턴은 아래처럼 정리됩니다.

- `s154-main`: **승리 -> 패배 -> 승리**
- `s154-both`: **동률 -> 승리 -> 동률**

전체 합산은 baseline `21.5/48`, candidate `26.5/48`로 candidate가 **+5.0 포인트** 앞섭니다.
이 정도면 단순 우연이나 한 셀 흔들림만으로 보긴 어렵습니다.

특히 좋은 점은 두 가지입니다.

- 더 강한 기준축인 `s154-both`에서 **세 구간 모두 non-loss**입니다.
- 가장 위험한 `240ms`에서 **long-think collapse가 없습니다.**
  `s154-main`은 오히려 승리이고, `s154-both`는 동률입니다.

cost도 생각보다 나쁘지 않습니다.
aggregated rows 여섯 개 중 다섯 개에서는 candidate가 약간 느리지만,
평균 nodes/ms는 baseline `16.62`, candidate `16.56`으로 **거의 중립**에 가깝습니다.

## 왜 아직 채택이 아닌가
이번 결과가 `wide-zebra`보다 cleaner한 것은 분명하지만,
아직 **양 baseline 모두에서 non-loss pattern**을 만들었다고 말할 수는 없습니다.
남아 있는 문제는 `s154-main 160ms` 한 셀입니다.

즉 지금 후보는
- short-think에서 살아 있고,
- long-think에서도 무너지지 않으며,
- stronger baseline인 `s154-both`에서는 깔끔하지만,
- `s154-main`의 mid-think reversal이 아직 남아 있습니다.

그래서 이번 보류는 막연한 보류가 아니라,
**추가 표본이 정확히 무엇을 해소해야 하는지 분명한 보류**입니다.

## 해석
현재 stage170 combo lane만 놓고 보면,
` s170-main-frontier-zebra `는 지금까지 본 통합 후보 중 **가장 채택에 가까운 보류 후보**입니다.

- `s170-main-stable-verify`는 이미 폐기 쪽이었고,
- `s170-main-wide-zebra`는 baseline/time 축 sign flip이 너무 많았습니다.
- 반면 이번 후보는 `s154-both`가 `동률 -> 승리 -> 동률`로 정리돼,
  low-risk integration이라는 설계 가설을 어느 정도 뒷받침합니다.

다만 최종 채택으로 올리려면,
`main 160ms` 음수 셀이 reinforced에서도 사라지거나 최소한 동률로 수렴하는지 먼저 확인하는 편이 안전합니다.

## 추천 후속
다음 투입이 있다면 `80/160/240ms`, seeds `17,31,53,71,89,107`의 **reinforced retest**가 가장 직접적입니다.
그 retest에서 `s154-main 160ms`가 동률 이상으로 정리되면,
이 후보는 stage170 통합 lane의 첫 **채택 후보**로 올릴 수 있습니다.
