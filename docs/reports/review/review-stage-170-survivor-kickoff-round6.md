# Stage170 kickoff round6 - `s170-main-frontier-zebra-stabilized` logic reinforcement re-entry

## 1. 배경
Round3 reinforced 기준에서 original `s170-main-frontier-zebra`는 아래 패턴으로 **보류 유지**였습니다.

- `s154-main`: `승리 -> 동률 -> 동률`
- `s154-both`: `동률 -> 패배 -> 동률`
- overall: baseline `36.0/72`, candidate `36.0/72`

핵심 미해결점은 **`s154-both 160ms` 음수**였습니다.
이번 round6에서는 단순 sample 확대가 아니라,
그 음수 셀을 겨냥한 **logic reinforcement 후 re-entry**를 진행했습니다.

## 2. 보강 내용
새 후보 key는 `s170-main-frontier-zebra-stabilized`입니다.

구성은 다음과 같습니다.
- move-ordering source: stage157 `s157-main-frontier-gate`
- MPC source: stage158 `s154-stable-zebra`
- move-ordering override: `stage170-frontier-stabilized-v1`

`stage170-frontier-stabilized-v1`는 original frontier ordering의 cheap signal 골격은 유지하되,
아래 세 가지만 추가합니다.

1. `TT depth gate` (`ttOrderingMinDepth=2`, `ttOrderingDepthSlack=2`)
2. `square-parity-reply` exact tie-break
3. `lightweightEvalTopK=3`의 좁은 top-K

의도는 명확합니다.
wide/probe까지 가는 공격형이 아니라,
**mid-think shallow-TT noise를 줄이되 frontier lane의 저비용 성격은 유지**하려는 보강입니다.

## 3. 실행 조건
- candidate: `s170-main-frontier-zebra-stabilized`
- baseline: `s154-main`, `s154-both`
- time: `80, 160, 240 ms`
- seeds: `17,31,53,71,89,107`
- baseline/time 조합당 총 게임 수: `12`
- 실행 형식: baseline/time별 direct split run 후 aggregate

## 4. 결과 요약
| candidate | `s154-main` pattern | `s154-both` pattern | overall | verdict |
| --- | --- | --- | --- | --- |
| `s170-main-frontier-zebra-stabilized` | `승리 -> 패배 -> 패배` | `동률 -> 동률 -> 동률` | baseline `37.0/72`, candidate `35.0/72` | **비채택** |

## 5. 세부 해석
좋아진 점은 하나 있습니다.
original hold의 핵심 리스크였던 `s154-both 160ms` 음수는 이번 re-entry에서 **동률**로 정리됐습니다.
즉 보강 방향이 stronger baseline mid-think 흔들림 자체를 전혀 못 건드린 것은 아닙니다.

하지만 전체적으로는 악화가 더 큽니다.

- `s154-main 80ms`: 승리
- `s154-main 160ms`: 패배
- `s154-main 240ms`: 패배
- `s154-both 80ms`: 동률
- `s154-both 160ms`: 동률
- `s154-both 240ms`: 동률

이 패턴은 original hold의 `main: 승리 -> 동률 -> 동률 / both: 동률 -> 패배 -> 동률`보다 해석이 더 나쁩니다.
기존에는 stronger baseline에만 mid-think 음수가 있었고 main lane은 long-think non-loss를 유지했는데,
이번엔 그 음수를 지우는 대신 **main lane 160/240ms를 잃었습니다.**

시간 합산으로 봐도
- `80ms`: baseline `11.5/24`, candidate `12.5/24`
- `160ms`: baseline `12.5/24`, candidate `11.5/24`
- `240ms`: baseline `13.0/24`, candidate `11.0/24`

즉 short-think 소폭 우세를 얻는 대신,
더 중요한 mid/long-think에서 점수를 잃었습니다.

## 6. cost
nodes/ms도 이번에는 나쁜 쪽으로 정리됐습니다.

- 6개 집계 행 전부 baseline이 더 빠름
- 평균 baseline `17.10`
- 평균 candidate `16.74`

따라서 이번 보강안은 “점수 trade-off는 있지만 throughput이 개선됐다”는 이야기조차 남지 않습니다.

## 7. 판정
### 결론: **비채택**

이번 re-entry는 특정 음수 셀 하나를 지우는 데는 성공했지만,
그 대신 main 축의 더 중요한 셀 둘을 잃었습니다.

그래서 이 후보는
- original `s170-main-frontier-zebra`의 **강화판**이 아니라,
- stronger-baseline 문제를 main-lane deterioration으로 바꿔치기한 **약화 파생안**으로 보는 것이 맞습니다.

즉 이번 실험은 “frontier-zebra를 ordering-side stabilization으로 구할 수 있는가”에 대해
**아직 아니다**라는 대답을 줬습니다.

## 8. lane 해석 업데이트
- `s170-main-wide-zebra`: **채택**
- `s157-main-assertive-both`: **채택 유지**
- original `s170-main-frontier-zebra`: **보류 유지**
- `s170-main-frontier-zebra-stabilized`: **비채택**

핵심은 original hold 후보는 여전히 살아 있지만,
이번 **stabilized ordering branch는 닫아도 된다**는 점입니다.

## 9. 추천 다음 단계
다음 frontier 계열 작업은 이 방향이 더 생산적입니다.

1. original `s170-main-frontier-zebra`를 그대로 hold로 두고,
   surviving candidate와의 direct head-to-head를 진행한다.
2. 또는 frontier-zebra를 다시 손볼 경우,
   ordering 추가 보강이 아니라 **MPC-side 미세 조정**을 우선 검토한다.

## 10. 산출물
- aggregated summary  
  `tools/engine-match/out/stage170-survivor-reentry/aggregated/s170-main-frontier-zebra-stabilized/summary.md`
- verdict  
  `tools/engine-match/out/stage170-survivor-reentry/aggregated/s170-main-frontier-zebra-stabilized/verdict.md`
