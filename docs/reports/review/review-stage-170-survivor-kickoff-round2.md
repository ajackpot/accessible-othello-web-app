# Stage170 kickoff round2 - `s170-main-frontier-zebra` result

## 1. 배경
Round1까지의 상태는 아래와 같았습니다.

### combo lane
- `s170-main-wide-zebra`: **보류**
- `s170-main-stable-verify`: **비채택**
- `s170-main-frontier-zebra`: **미실행**

### individual lane
- `s157-main-assertive-both`: **재투입 전**

이번 round2에서는 kickoff plan의 세 번째 통합 후보인
` s170-main-frontier-zebra `를 실행했습니다.

후보 정의는 다음과 같습니다.
- move-ordering 출처: stage157 `s157-main-frontier-gate`
- MPC 출처: stage158 `s154-stable-zebra`
- 의도: cheap frontier ordering + guarded Zebra MPC의 **저위험 통합**

실행 형식은 round1과 동일하게,
`80ms`는 seeds `17,31,53,71` 전체를 한 번에,
`160ms`, `240ms`는 baseline/time별로 `17,31` / `53,71`로 split 실행 후 aggregate했습니다.

## 2. 결과 요약
| candidate | `s154-main` pattern | `s154-both` pattern | overall | interim verdict |
| --- | --- | --- | --- | --- |
| `s170-main-frontier-zebra` | `승리 -> 패배 -> 승리` | `동률 -> 승리 -> 동률` | baseline `21.5/48`, candidate `26.5/48` | **보류** |

## 3. 세부 해석
이번 후보는 stage170 combo lane에서 지금까지 가장 깨끗한 결과를 냈습니다.

- `s154-main 80ms`: candidate 우세
- `s154-main 160ms`: candidate 열세
- `s154-main 240ms`: candidate 우세
- `s154-both 80ms`: 동률
- `s154-both 160ms`: candidate 우세
- `s154-both 240ms`: 동률

즉 stronger baseline인 `s154-both`에서는 **전 시간대 non-loss**이고,
가장 중요한 `240ms`에서도 collapse가 없습니다.
특히 `s154-main 240ms`가 승리라는 점은,
이 후보가 late-think에서 구조적으로 망가지는 타입은 아니라는 뜻입니다.

반면 아직 바로 채택으로 올리기 어려운 이유도 명확합니다.
남아 있는 문제는 `s154-main 160ms` 한 셀입니다.
이 셀이 동률이 아니라 음수라서,
아직 “양 baseline 전체 non-loss” 기준을 통과했다고 말할 수는 없습니다.

cost는 거의 중립입니다.
rows 여섯 개 중 다섯 개에서 candidate가 아주 약간 느리지만,
전체 평균 nodes/ms는 baseline `16.62`, candidate `16.56`으로 차이가 작습니다.

## 4. lane 상태 업데이트
### combo lane
- `s170-main-wide-zebra`: **보류**
- `s170-main-stable-verify`: **비채택**
- `s170-main-frontier-zebra`: **보류 (채택 근접)**

### individual lane
- `s157-main-assertive-both`: **아직 재투입 전**

## 5. 의미
이번 결과는 stage170 combo lane에서 중요한 분기점을 제공합니다.

1. `stable-zebra`의 guarded Zebra MPC는 cheap frontier ordering과 결합해도
   실전 fixed-time strength를 크게 잃지 않습니다.
2. `wide-zebra`보다 `frontier-zebra`가 cleaner한 것은,
   stage158 survivor를 통합할 때 **더 얌전한 ordering skeleton**이 오히려 해석 가능성을 높인다는 신호일 수 있습니다.
3. 따라서 다음 리소스는 `wide-zebra`보다 `frontier-zebra` 쪽에 먼저 쓰는 편이 효율적입니다.

## 6. 추천 다음 단계
현재 가장 직접적인 다음 단계는 다음 둘 중 하나입니다.

1. `s170-main-frontier-zebra`를 `80/160/240ms`, seeds `17,31,53,71,89,107`으로 **reinforced retest**해,
   `s154-main 160ms` 음수 셀이 노이즈인지 구조인지 닫는다.
2. 그 다음에 individual lane의 `s157-main-assertive-both`를 다시 benchmark해,
   기존 survivor anchor와 통합 후보의 상대 위치를 비교한다.

현재 정보만 놓고 보면,
**`frontier-zebra` reinforced retest를 먼저 하는 순서**가 가장 합리적입니다.
