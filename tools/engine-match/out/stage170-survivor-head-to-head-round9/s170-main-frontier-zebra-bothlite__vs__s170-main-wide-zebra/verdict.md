# Verdict: `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra`

## 결론
이번 direct head-to-head의 판정은 **보류**로 두겠습니다.

다만 **provisional lead는 계속 `s170-main-wide-zebra` 쪽**에 있습니다.

## 결과 요약
- pattern from `s170-main-wide-zebra` perspective: **승리 -> 동률 -> 동률**
- overall: `s170-main-frontier-zebra-bothlite` **17.0/36**, `s170-main-wide-zebra` **19.0/36**
- overall gap: **+2.0 pts**, **+5.6pp** (`s170-main-wide-zebra` 기준)
- overall nodes/ms: `s170-main-frontier-zebra-bothlite` **8.14**, `s170-main-wide-zebra` **8.71**

시간대별로 보면 더 분명합니다.

- `80ms`: `s170-main-frontier-zebra-bothlite` **5/12**, `s170-main-wide-zebra` **7/12**
- `160ms`: **6/12 vs 6/12 동률**
- `240ms`: **6/12 vs 6/12 동률**

## 해석
이번 매치는 **`s170-main-wide-zebra`가 앞서기는 하지만 bracket를 닫지는 못한 승부**였습니다.

좋은 점은 `s170-main-wide-zebra` 쪽에 있습니다.
1. `80ms`에서 **7:5**로 확실한 우세가 있습니다.
2. overall도 **+2 points**로 앞섭니다.
3. throughput도 전체 평균에서 **조금 더 빠릅니다.**

하지만 곧바로 단독 선두 확정으로 올리기엔 부족합니다.
1. `160ms`가 **완전 동률**입니다.
2. `240ms`도 **완전 동률**이라 long-think takeover가 확인되지 않았습니다.
3. 즉 이번 우세는 **fast-lane leaning + slight overall lead**이지, all-timeframe clear superiority는 아닙니다.

반대로 `s170-main-frontier-zebra-bothlite`가 이 매치를 가져갔다고 보기도 어렵습니다.
- overall을 내줬고,
- `80ms`에서 밀렸기 때문입니다.

그래서 이번 direct head-to-head는
**`s170-main-wide-zebra`가 계속 약간 앞서지만, `s170-main-frontier-zebra-bothlite`를 확실히 탈락시킬 만큼은 아닌 보류**로 보는 것이 맞습니다.

## lane 상태 업데이트
- `s170-main-wide-zebra`: **채택 유지 + provisional bracket lead 유지**
- `s170-main-frontier-zebra-bothlite`: **채택 유지, but provisional leader를 넘지는 못함**
- 둘 사이 우열: **미결**

## 추천 다음 단계
가장 생산적인 다음 비교는 아래 두 가지 중 첫 번째입니다.

1. `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both` direct head-to-head
2. 또는 mainline provisional leader를 먼저 확정하고 싶다면 `s157-main-assertive-both` vs `s170-main-wide-zebra`를 **160ms 중심 reinforced retest**로 다시 확인
