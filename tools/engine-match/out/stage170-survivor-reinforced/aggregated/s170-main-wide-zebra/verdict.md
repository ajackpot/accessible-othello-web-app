# Verdict: `s170-main-wide-zebra` reinforced retest

## 결론
` s170-main-wide-zebra `는 **채택**으로 올리겠습니다.

## 근거
reinforced retest 결과 패턴은 아래처럼 정리됐습니다.

- `s154-main`: **승리 -> 동률 -> 승리**
- `s154-both`: **동률 -> 동률 -> 승리**
- overall: baseline `32.5/72`, candidate `39.5/72`

round1에서는
- `s154-main`: `동률 -> 승리 -> 패배`
- `s154-both`: `승리 -> 패배 -> 동률`
로 sign flip이 너무 많아 **보류**였지만,
이번 reinforced에서는 그 분절 패턴이 사라졌습니다.

특히 중요한 점은 세 가지입니다.

1. **음수 셀이 하나도 없습니다.**
   dual-baseline 6개 셀 모두 non-loss이며,
   stronger baseline `s154-both`에서도 `패배`가 없습니다.
2. **240ms에서 두 baseline 모두 late-positive / non-collapse입니다.**
   `s154-main 240ms`는 승리, `s154-both 240ms`도 승리로 수렴했습니다.
3. **overall이 분명한 양수입니다.**
   baseline `32.5/72` 대비 candidate `39.5/72`로, 단순 noise-level hold가 아니라 score edge가 남습니다.

cost는 아주 약한 경고만 남깁니다.
rows 6개 중 candidate가 더 빠른 행은 `2개`, 더 느린 행은 `4개`였고,
느린 구간에서도 차이는 작습니다.
즉 이번 판정은 “throughput까지 명확히 개선되어 채택”이라기보다,
**fixed-time paired score가 dual-baseline에서 clean non-loss로 정리되었고 240ms가 오히려 강해졌기 때문에 채택**이라고 보는 편이 맞습니다.

## 해석
이 후보는 stage170 combo lane에서 처음으로,
- aggressive combo임에도
- stronger baseline 상대로 음수 셀 없이
- long-think 양수까지 확보한
**실질적 adoption candidate**로 올라왔습니다.

현재 정보만 놓고 보면,
` s170-main-wide-zebra `는 `s170-main-frontier-zebra`보다 더 강한 통합 후보로 재평가하는 것이 맞습니다.
다음 비교의 기준점은 combo hold 후보가 아니라,
이제 surviving individual anchor인 `s157-main-assertive-both`가 되어야 합니다.
