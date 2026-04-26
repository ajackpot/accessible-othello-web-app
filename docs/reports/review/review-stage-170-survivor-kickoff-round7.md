# Stage170 kickoff round7 - `s170-main-frontier-zebra-bothlite` MPC-side re-entry

## 1. 배경
frontier-zebra lane의 최근 상태는 다음과 같았습니다.

| candidate | `s154-main` | `s154-both` | overall | status |
| --- | --- | --- | --- | --- |
| `s170-main-frontier-zebra` (reinforced) | `승리 -> 동률 -> 동률` | `동률 -> 패배 -> 동률` | baseline `36.0/72`, candidate `36.0/72` | 보류 |
| `s170-main-frontier-zebra-stabilized` | `승리 -> 패배 -> 패배` | `동률 -> 동률 -> 동률` | baseline `37.0/72`, candidate `35.0/72` | 비채택 |

즉 original hold의 핵심 문제는 **`s154-both 160ms` 음수**였고,
ordering-side stabilization은 그 음수를 main-lane deterioration으로 바꿔 버렸습니다.

이번 round7에서는 보고서 권고대로
**ordering을 그대로 두고 MPC-side만 조정한 마지막 보강안**을 투입했습니다.

## 2. 보강 내용
새 후보 key는 `s170-main-frontier-zebra-bothlite`입니다.

구성은 다음과 같습니다.
- move-ordering source: stage157 `s157-main-frontier-gate`
- MPC lineage: stage158 `s154-stable-zebra`
- custom MPC profile: `stage170-frontier-zebra-bothlite-v1`

핵심 의도:
1. guarded Zebra ladder의 장점은 유지
2. low-cut은 아주 제한적으로만 열어 mid-think stronger-baseline 음수를 줄임
3. volatility guard는 오히려 더 엄격하게 둬 long-think collapse를 방지

## 3. 실행 조건
- candidate: `s170-main-frontier-zebra-bothlite`
- baseline: `s154-main`, `s154-both`
- time: `80, 160, 240 ms`
- seeds: `17,31,53,71,89,107`
- baseline/time 조합당 총 게임 수: `12`

실행 명령:

```bash
node tools/engine-match/run-stage170-survivor-decision-pair.mjs \
  --candidate s170-main-frontier-zebra-bothlite \
  --output-root tools/engine-match/out/stage170-survivor-reentry-round7 \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71,89,107 \
  --games 1
```

## 4. 결과 요약
| candidate | `s154-main` pattern | `s154-both` pattern | overall | verdict |
| --- | --- | --- | --- | --- |
| `s170-main-frontier-zebra-bothlite` | `승리 -> 동률 -> 승리` | `동률 -> 동률 -> 동률` | baseline `34.0/72`, candidate `38.0/72` | **채택** |

## 5. 세부 해석
이번 결과는 lane을 닫기에 충분히 명확합니다.

### 좋아진 점
- original hold의 핵심 리스크였던 **`s154-both 160ms` 음수**가 **동률**로 해소됐습니다.
- `s154-main`은 **`승리 -> 동률 -> 승리`**로 정리되어,
  ordering-side stabilized branch에서 잃었던 main-lane long-think strength를 회복했습니다.
- `240ms`에서 양 baseline 모두 **non-loss**이며,
  `s154-main 240ms`는 다시 **승리**로 돌아왔습니다.
- 6개 baseline/time 셀에 **음수 구간이 하나도 없습니다.**

### score 구조
baseline별 합산:
- `s154-main`: baseline `16.0/36`, candidate `20.0/36`
- `s154-both`: baseline `18.0/36`, candidate `18.0/36`

시간대 합산:
- `80ms`: baseline `11.0/24`, candidate `13.0/24`
- `160ms`: baseline `12.0/24`, candidate `12.0/24`
- `240ms`: baseline `11.0/24`, candidate `13.0/24`

즉 이 후보는
- short-think에서 baseline을 깎아먹지 않고,
- mid-think는 stronger baseline까지 포함해 동률로 정리하며,
- long-think에서는 다시 main 축 우세를 회복합니다.

## 6. cost
nodes/ms는 이번에도 baseline 쪽이 더 높았습니다.

- `s154-main` 평균 nodes/ms: baseline `9.13`, candidate `8.88`
- `s154-both` 평균 nodes/ms: baseline `9.31`, candidate `9.08`
- 전체 6행 평균: baseline `9.22`, candidate `8.98`

즉 throughput story는 **약한 penalty**입니다.
하지만 stage158 `stable-zebra` reinforced 채택 때와 마찬가지로,
이번 판정은 **throughput 개선형 채택이 아니라 fixed-time non-loss + overall upside형 채택**입니다.

## 7. 판정
### 결론: **채택**

근거는 네 가지입니다.

1. **6개 셀 전부 non-negative입니다.**
   - 음수 셀이 하나도 없고, stronger baseline `s154-both`도 전 시간대 동률 이상입니다.
2. **hold의 핵심 질문이 해소됐습니다.**
   - original hold를 만들었던 `s154-both 160ms` 음수가 더 이상 남지 않습니다.
3. **ordering-side 실패 분기보다 명확히 낫습니다.**
   - stabilized branch는 main-lane deterioration이 있었지만,
     both-lite branch는 main-lane에서 오히려 `80/240ms` 승리를 유지했습니다.
4. **overall이 채택 쪽으로 기웁니다.**
   - baseline `34.0/72`, candidate `38.0/72`

따라서 frontier-zebra lane은 여기서 더 끌지 않아도 됩니다.
**original `s170-main-frontier-zebra` hold는 successor인 `s170-main-frontier-zebra-bothlite` 채택으로 사실상 해소된 것으로 보고,
추가 frontier-zebra reinforcement는 중단해도 됩니다.**

## 8. lane 상태 업데이트
- `s170-main-wide-zebra`: **채택**
- `s157-main-assertive-both`: **채택 유지**
- `s170-main-frontier-zebra`: **원형 hold 기록만 유지 (successor 채택으로 실무상 종료)**
- `s170-main-frontier-zebra-stabilized`: **비채택**
- `s170-main-frontier-zebra-bothlite`: **채택**

## 9. 의미
이번 결과는 중요한 구조적 메시지를 줍니다.

- frontier ordering skeleton 자체는 여전히 유효했습니다.
- 문제는 ordering이 아니라, stable-zebra의 guarded MPC를 그대로 얹었을 때의 **mid-think calibration mismatch**였습니다.
- 그 mismatch는 ordering 보강보다 **절충형 both-side Zebra MPC**로 더 잘 해결됐습니다.

즉 frontier lane을 살리는 해법은 “ordering을 더 복잡하게 만들기”가 아니라,
**cheap ordering은 그대로 두고 MPC만 약간 더 똑똑하게 여는 것**에 가까웠습니다.

## 10. 산출물
- summary
  `tools/engine-match/out/stage170-survivor-reentry-round7/s170-main-frontier-zebra-bothlite/summary.md`
- verdict
  `tools/engine-match/out/stage170-survivor-reentry-round7/s170-main-frontier-zebra-bothlite/verdict.md`
