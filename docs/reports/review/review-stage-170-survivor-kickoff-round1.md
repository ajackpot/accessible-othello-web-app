# Stage170 kickoff round1 - first integrated survivor combo results

## 1. 배경
Stage169 closeout 뒤 남은 survivor는 네 개였습니다.

- `s157-main-wide-hybrid`
- `s157-main-frontier-gate`
- `s157-main-assertive-both`
- `s154-stable-zebra`

이번 round1에서는 kickoff plan대로,
먼저 **교차 결합형 combo lane**을 열고 그중 우선순위가 높은 두 후보를 baseline direct-pair로 확인했습니다.

- `s170-main-wide-zebra`
- `s170-main-stable-verify`

실행 환경 제한 때문에 `160ms`, `240ms`는 baseline/time별로 seed를 `17,31` / `53,71` 두 덩어리로 나눠 실행한 뒤,
aggregated summary로 다시 합쳤습니다.

## 2. round1 결과 요약
| candidate | `s154-main` pattern | `s154-both` pattern | overall | interim verdict |
| --- | --- | --- | --- | --- |
| `s170-main-wide-zebra` | `동률 -> 승리 -> 패배` | `승리 -> 패배 -> 동률` | baseline `23.5/48`, candidate `24.5/48` | **보류** |
| `s170-main-stable-verify` | `패배 -> 패배 -> 패배` | `승리 -> 동률 -> 동률` | baseline `28.5/48`, candidate `19.5/48` | **비채택** |

## 3. `s170-main-wide-zebra`
이 후보는 stage157의 가장 선명한 ordering survivor(`wide-hybrid`)와
stage158의 guarded Zebra MPC survivor를 교차 결합한 1순위 통합 후보였습니다.

하지만 결과는 clean하지 않았습니다.

- `s154-main`: `80ms` 동률, `160ms` 승리, `240ms` 패배
- `s154-both`: `80ms` 승리, `160ms` 패배, `240ms` 동률

즉 overall은 `+1.0` point로 아주 근소하게 앞섰지만,
시간축과 baseline축을 동시에 보면 **sign flip이 너무 많습니다.**
또한 aggregated rows 여섯 개 모두에서 nodes/ms는 baseline이 더 높았습니다.

이건 바로 채택할 결과는 아니지만,
완전히 strength story가 꺼졌다고 보기도 이른 모양입니다.
그래서 round1 해석은 **보류**가 맞습니다.

### 권장 후속
`80/160/240ms`, seeds `17,31,53,71,89,107`의 reinforced retest로,
지금의 `main 160+ / main 240- / both 80+ / both 160-` 분절 패턴이 유지되는지 먼저 확인하는 것이 맞습니다.

## 4. `s170-main-stable-verify`
이 후보는 stage158의 stable/quiet ordering 기여를 분리해 보기 위해,
`stage154-stable-quiet-v1` ordering에 stage157의 `verify-tight-v1` MPC를 얹은 조합이었습니다.

결과는 부정적이었습니다.

- `s154-main`: `패배 -> 패배 -> 패배`
- `s154-both`: `승리 -> 동률 -> 동률`
- overall: baseline `28.5/48`, candidate `19.5/48`

즉 short/mid/long을 통틀어 `s154-main` 축에서 전부 밀렸고,
`both` 축에서도 `80ms` 한 셀만 부분 양수였습니다.
throughput도 aggregated rows 여섯 개 전부 baseline이 더 높았습니다.

이 조합은 더 표본을 늘리기보다 **비채택**으로 닫는 것이 맞습니다.

## 5. 현재 lane 정리
round1까지 반영하면 kickoff lane은 다음처럼 보입니다.

### combo lane
- `s170-main-wide-zebra`: **보류**
- `s170-main-stable-verify`: **비채택**
- `s170-main-frontier-zebra`: **아직 미실행**

### individual lane
- `s157-main-assertive-both`: **아직 재투입 전**

## 6. 해석
이번 round1이 주는 가장 큰 힌트는 두 가지입니다.

1. `stable-zebra`의 stage158 생존 이유를 `stable/quiet ordering + verify-tight MPC`로 단순 환원할 수는 없습니다.
   그 조합은 오히려 명확히 나빴습니다.
2. `wide-hybrid + guarded Zebra`는 완전히 죽지는 않았지만,
   현재 표본에서는 너무 patchy합니다.
   즉 “거대한 단일화 후보를 만들면 곧바로 cleaner winner가 나온다”는 가설도 아직은 성립하지 않았습니다.

따라서 다음 우선순위는 다음 둘 중 하나가 적절합니다.

- `s170-main-frontier-zebra`를 실행해 **저위험 통합 lane**이 cleaner한지 확인한다.
- 또는 `s170-main-wide-zebra`를 reinforced retest로 바로 밀어 넣어,
  round1의 sign flip이 노이즈인지 구조 문제인지 먼저 닫는다.

현재 결과만 놓고 보면,
**`frontier-zebra`를 먼저 보고 나서 `wide-zebra` reinforced 여부를 결정하는 흐름**이 가장 효율적입니다.
