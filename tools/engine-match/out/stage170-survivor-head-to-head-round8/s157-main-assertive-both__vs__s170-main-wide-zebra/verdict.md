# Verdict: `s157-main-assertive-both` vs `s170-main-wide-zebra`

## 결론
이번 direct head-to-head의 판정은 **보류**로 두겠습니다.

다만 **아주 약한 provisional lead는 `s170-main-wide-zebra` 쪽**에 있습니다.

## 결과 요약
- pattern from `s170-main-wide-zebra` perspective: **승리 -> 패배 -> 동률**
- overall: `s157-main-assertive-both` **17.0/36**, `s170-main-wide-zebra` **19.0/36**
- overall gap: **+2.0 pts**, **+5.6pp** (`s170-main-wide-zebra` 기준)
- overall nodes/ms: `s157-main-assertive-both` **8.70**, `s170-main-wide-zebra` **9.07**

시간대별로 보면 더 분명합니다.

- `80ms`: `s157-main-assertive-both` **4/12**, `s170-main-wide-zebra` **8/12**
- `160ms`: `s157-main-assertive-both` **7/12**, `s170-main-wide-zebra` **5/12**
- `240ms`: **6/12 vs 6/12 동률**

## 해석
이 매치는 **한쪽으로 곧바로 정리되는 승부가 아니었습니다.**

좋은 점은 `s170-main-wide-zebra` 쪽에 있습니다.
1. short-think `80ms`에서 **명확한 우세**가 있습니다.
2. overall도 **+2 points**로 앞섭니다.
3. throughput도 전체 평균에서 **약간 더 빠릅니다.**

하지만 바로 단독 선두로 올리기엔 부족합니다.
1. `160ms`에서 `s157-main-assertive-both`가 **7:5**로 되받아쳤습니다.
2. `240ms`는 **완전 동률**이라, long-think takeover가 확인되지 않았습니다.
3. 즉 `s170-main-wide-zebra`의 우세는 현재로서는 **fast-lane leaning**이지, all-timeframe clear superiority는 아닙니다.

반대로 `s157-main-assertive-both`를 다시 위로 올리기에도 부족합니다.
- overall을 내줬고,
- `80ms`에서 꽤 크게 밀렸기 때문입니다.

그래서 이번 direct head-to-head는
**`wide-zebra`가 약간 앞서지만 bracket를 닫을 만큼 명확하지는 않은 보류**로 보는 것이 맞습니다.

## lane 상태 업데이트
- `s157-main-assertive-both`: **채택 유지**
- `s170-main-wide-zebra`: **채택 유지 + 약한 provisional lead**
- 둘 사이 우열: **미결**

## 추천 다음 단계
가장 생산적인 다음 비교는 아래 둘 중 첫 번째입니다.

1. `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra` direct head-to-head
2. 필요하면 그 다음에 `s157-main-assertive-both` vs `s170-main-wide-zebra`를 **160ms 중심 reinforced retest**로 다시 확인
