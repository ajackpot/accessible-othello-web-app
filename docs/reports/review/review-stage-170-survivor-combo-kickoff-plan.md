# Stage170 kickoff - survivor integration matrix and first-round combo priority

## 1. 배경
Stage169 closeout 시점의 생존 후보는 다음 네 개였습니다.

- `s157-main-wide-hybrid`
- `s157-main-frontier-gate`
- `s157-main-assertive-both`
- `s154-stable-zebra`

이번 단계의 목표는 이 survivor들을 그대로 병렬로만 끌고 가지 않고,
**서로 겹치지 않는 축은 통합 후보로 재조합하고,
겹침이 큰 축은 개별 lane으로 남기는 1차 survivor integration matrix를 만드는 것**입니다.

## 2. 축 분해
각 survivor를 move-ordering / MPC 축으로 분해하면 아래와 같습니다.

| survivor | move-ordering 축 | MPC 축 | 메모 |
| --- | --- | --- | --- |
| `s157-main-wide-hybrid` | `wide-hybrid-v1` | `verify-tight-v1` | 넓은 top-K + probe ordering, 보수형 verification MPC |
| `s157-main-frontier-gate` | `late-potential-frontier-v1` | `static-gate-v1` | cheap potential/frontier ordering, 최소 gate MPC |
| `s157-main-assertive-both` | `hybrid-probe-v1` | `assertive-both-v1` | hybrid-probe ordering + 공격형 both-side MPC |
| `s154-stable-zebra` | `stage154-stable-quiet-v1` | `stage154-zebra-guarded-v1` | stable/quiet ordering + guarded Zebra ladder MPC |

## 3. overlap 판정
### 3.1 move-ordering 축
- `wide-hybrid-v1`와 `hybrid-probe-v1`는 **TT depth gate + potential/frontier + shallow probe**라는 주된 skeleton이 겹칩니다.
  차이는 top-K/probe 폭과 weight 강도 쪽이라, 둘을 억지로 합치면 “더 큰 단일화”라기보다 같은 축의 width tuning이 됩니다.
- `late-potential-frontier-v1`는 probe/TT gate 없이 cheap signal만 남겨 두었기 때문에,
  hybrid 계열과는 같은 ordering 축이지만 **구조 역할이 다릅니다.**
- `stage154-stable-quiet-v1`는 potential/frontier 일부를 공유하더라도,
  실질적으로는 **stability / quiet / edge endpoint 힌트가 새로 들어온 ordering 축**이라 독립성이 있습니다.

### 3.2 MPC 축
- `static-gate-v1`는 `verify-tight-v1`와 `stage154-zebra-guarded-v1`의 부분집합 성격입니다.
- `verify-tight-v1`와 `stage154-zebra-guarded-v1`는 둘 다 gate + volatility + verification 계열이지만,
  후자는 **empties window를 더 앞당기고 selection mode를 Zebra ladder로 바꾸는 별도 축**이 있습니다.
- `assertive-both-v1`는 low-cut 허용 + maxWindow/maxChecks 완화까지 포함해,
  나머지 MPC 축과는 성격이 다릅니다.

## 4. 1차 통합 후보 선정
위 overlap 판단을 바탕으로 이번 kickoff lane에서는 아래 세 개를 **새 통합 후보**로 둡니다.

| 새 후보 | move-ordering 출처 | MPC 출처 | 선정 이유 |
| --- | --- | --- | --- |
| `s170-main-wide-zebra` | `s157-main-wide-hybrid` | `s154-stable-zebra` | stage157의 가장 선명한 ordering winner와 stage158의 guarded Zebra MPC survivor를 교차 결합 |
| `s170-main-stable-verify` | `s154-stable-zebra` | `s157-main-wide-hybrid` | stage158 ordering 기여를 분리하고, stage157의 보수형 verify-tight MPC와 결합 |
| `s170-main-frontier-zebra` | `s157-main-frontier-gate` | `s154-stable-zebra` | cheap ordering + guarded Zebra MPC의 저위험 통합 버전 |

이 세 후보는 “ordering 새 축”과 “MPC 새 축”을 교차 결합한다는 점에서,
단순 width retune보다 **의미 있는 단일화 후보**로 보는 것이 맞습니다.

## 5. 개별 lane 유지 후보
` s157-main-assertive-both `는 이번 1차 통합군에 넣지 않습니다.

이유는 두 가지입니다.

1. move-ordering이 `wide-hybrid`와 **같은 hybrid/probe skeleton** 계열이라 ordering 쪽 독립성이 낮습니다.
2. MPC가 `assertive-both-v1`로 매우 공격적이어서,
   Zebra/verify 계열과 섞으면 “무엇이 이득/손해를 만들었는지” 해석이 흐려집니다.

따라서 kickoff round에서는 `assertive-both`를 **개별 lane 유지 후보**로 보고,
새 통합 후보들과 별도로 비교하는 것이 해석상 더 깔끔합니다.

## 6. 구현물
이번 단계에서 아래 reusable surface를 추가했습니다.

- `tools/evaluator-training/stage170-survivor-combo-candidates.mjs`
  - stage170 kickoff combo registry
  - combo 후보 resolve / list / summarize / engine-options build helper 제공
- `tools/engine-match/run-stage170-survivor-decision-pair.mjs`
  - stage170 combo + 기존 stage157/158 survivor 모두 같은 direct-pair runner로 실행 가능
- `js/test/stage170_survivor_combo_smoke.mjs`
  - combo registry 및 source/profile wiring smoke

## 7. 추천 실행 순서
해석력이 높은 순서대로는 아래가 적절합니다.

1. `s170-main-wide-zebra`
2. `s170-main-stable-verify`
3. `s170-main-frontier-zebra`
4. `s157-main-assertive-both` (개별 lane 유지)

이 순서는 “가장 큰 통합 시도 -> stage158 ordering 분리 확인 -> 저위험 통합 -> 개별 aggressive anchor” 순서입니다.

## 8. 실행 명령 예시
```bash
node tools/engine-match/run-stage170-survivor-decision-pair.mjs \
  --candidate s170-main-wide-zebra \
  --output-root tools/engine-match/out/stage170-survivor-kickoff \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

같은 형식으로 `s170-main-stable-verify`, `s170-main-frontier-zebra`,
그리고 개별 lane 확인용 `s157-main-assertive-both`도 바로 실행할 수 있습니다.

## 9. 결론
이번 kickoff 단계의 결론은 다음과 같습니다.

- 남은 survivor를 그대로 병렬 유지하지 않고,
  **세 개의 통합 후보와 한 개의 개별 lane 후보로 재정렬**하는 것이 가장 해석력이 높습니다.
- 특히 `wide-hybrid` / `stable-zebra`는 ordering과 MPC 축이 서로 다르므로,
  **교차 결합을 먼저 확인할 가치가 충분합니다.**
- 반대로 `assertive-both`는 aggressive MPC 성격이 강하므로,
  첫 라운드에서는 섣불리 섞기보다 **개별 benchmark anchor**로 남기는 편이 낫습니다.
