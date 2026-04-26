# Verdict: `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both`

## 결론
이번 direct head-to-head의 판정은 **보류**로 두겠습니다.

다만 이번 보류는 “약한 한쪽 우세”가 남는 보류가 아니라,
**score 기준으로는 완전 동률이라 hierarchy를 새로 만들지 못한 보류**입니다.

## 결과 요약
- pattern from `s157-main-assertive-both` perspective: **동률 -> 동률 -> 동률**
- overall: `s170-main-frontier-zebra-bothlite` **18.0/36**, `s157-main-assertive-both` **18.0/36**
- overall gap: **+0.0 pts**, **+0.0pp** (`s157-main-assertive-both` 기준)
- overall nodes/ms: `s170-main-frontier-zebra-bothlite` **12.05**, `s157-main-assertive-both` **13.14**

시간대별로도 완전히 같습니다.

- `80ms`: `s170-main-frontier-zebra-bothlite` **6/12**, `s157-main-assertive-both` **6/12**
- `160ms`: **6/12 vs 6/12 동률**
- `240ms`: **6/12 vs 6/12 동률**

## 해석
이번 매치는 한 줄로 요약하면 아래와 같습니다.

> **strength 쪽에서는 전혀 분리가 안 됐고, throughput만 `assertive-both`가 더 좋게 남았습니다.**

좋은 점부터 보면,
- `bothlite`는 `assertive-both`에게 밀리지 않았습니다.
- `assertive-both`도 `bothlite`를 다시 위에 두는 데 실패했습니다.
- 즉 두 후보는 이번 frame 안에서는 **동일 tier**로 보는 해석이 가장 자연스럽습니다.

하지만 바로 우열을 선언하지 않는 이유도 분명합니다.
1. `80/160/240ms` 세 구간이 **전부 exact draw**입니다.
2. overall도 **18:18**이라 score separation이 전혀 없습니다.
3. nodes/ms는 `assertive-both`가 더 빠르지만, 이번 lane에서는 throughput만으로 direct hierarchy를 뒤집지는 않습니다.

따라서 이번 direct head-to-head는
**`bothlite`와 `assertive-both`가 서로를 탈락시키지 못한 완전 동률**로 정리하는 것이 맞습니다.

## lane 상태 업데이트
- `s170-main-wide-zebra`: **채택 유지 + provisional bracket lead 유지**
- `s157-main-assertive-both`: **채택 유지, challenger tier 유지**
- `s170-main-frontier-zebra-bothlite`: **채택 유지, challenger tier 유지**
- `s157-main-assertive-both` vs `s170-main-frontier-zebra-bothlite`: **동일 tier / 미결**

즉 current bracket 해석은 아래와 같습니다.
- `wide-zebra`는 두 direct match에서 모두 **19:17**로 약하게 앞서 있어 여전히 provisional lead
- `assertive-both`와 `bothlite`는 서로 **18:18 exact draw**라 challenger cluster로 묶임

## 추천 다음 단계
가장 생산적인 다음 단계는 아래 둘 중 첫 번째입니다.

1. `s157-main-assertive-both` vs `s170-main-wide-zebra`를 **160ms 중심 reinforced retest**로 다시 확인
2. 또는 hierarchy 확정보다 운영안 분기가 더 중요하면, `wide-zebra`를 provisional mainline 후보로 두고 `assertive-both` / `bothlite`를 user-option lane 후보로 정리하는 split review로 넘어가기
