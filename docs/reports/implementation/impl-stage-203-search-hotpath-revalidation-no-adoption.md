# Stage 203 - search hotpath revalidation bundle (no adoption)

## 이번 단계에서 한 일

이번 단계는 Stage 183 보고서에서 다음 search-side 후보로 남아 있던
**TT-first deferred move-list build**와
그 companion 후보였던 **low-overhead child-state factory**를
실제 코드에 연결한 뒤,
기본값 승격이 가능한지 split balanced benchmark로 다시 판정한 작업입니다.

핵심은 아래 두 가지였습니다.

1. **TT-first deferred move-list build 구현**
   - `js/core/rules.js`에 `prepareSearchMoveAtIndex()`를 추가해,
     TT/PV move index 하나만 먼저 legal probe한 뒤 full move-list build를 미루는 경로를 만들었습니다.
   - `js/ai/search-engine.js`의 classic `negamax()`는
     non-exact / non-precompute lane에서만 이 경로를 타도록 정리했습니다.
   - deferred TT move가 legal이면 그 수를 먼저 search하고,
     beta cutoff가 나면 full move-list build를 건너뛸 수 있게 했습니다.
   - telemetry는 아래 네 개를 추가했습니다.
     - `ttFirstDeferredMoveListBuildAttempts`
     - `ttFirstDeferredMoveListBuildLegalHits`
     - `ttFirstDeferredMoveListBuildCutoffs`
     - `ttFirstDeferredMoveListBuildSkips`

2. **low-overhead child-state factory 재검증**
   - 이미 숨어 있던 `state.createSearchChildStateFromPlayerBoards()` 기반 fast child-state path를
     benchmark용 companion candidate로 다시 비교했습니다.
   - 이 경로는 semantics를 바꾸지 않고,
     prepared move의 `flips`를 그대로 child board에 반영해 child `GameState`를 만드는 비용을 낮추는 쪽입니다.

이번 Stage의 결론은 단순합니다.

- **두 후보 모두 semantics는 유지됐다.**
- 하지만 **default adoption 신호는 나오지 않았다.**
- 따라서 최종 기본값은 아래처럼 유지합니다.

- `ttFirstDeferredMoveListBuild = false`
- `lowOverheadSearchChildStateFactory = false`

즉 이번 Stage는 **구현 + 재검증 + no-adoption closeout**입니다.

## 왜 이 후보 묶음을 지금 골랐는가

Stage 192 중간 프로파일과 Stage 183 후속 권고를 합쳐 보면,
남은 high-ROI 후보 중 하나가 search-side hotpath였습니다.

특히 이번 묶음은 아래 이유로 우선순위가 높았습니다.

- classic search 내부 hotpath라 midgame throughput에 직접 영향을 줄 가능성이 있었다.
- TT-first deferred move-list build와 low-overhead child-state factory는
  서로 같은 prepared move/apply 경로 근처에 붙어 있어 묶어서 보기 좋았다.
- 문제가 생기면 default만 내리고 experimental option으로 남기기 쉬웠다.
- parity 기준(best move / score / mode / nodes)으로 위험을 바로 확인할 수 있었다.

즉 이번 Stage는
**move generation/apply 주변 search hotpath를 더 깎아낼 수 있는지 확인하는 low-risk revalidation bundle**이었습니다.

## 구현 포인트

### 1. TT move 하나만 먼저 legal probe하고 full move-list build를 늦춘다

이번 candidate의 핵심은
`listPreparedSearchMoves()`를 항상 먼저 호출하지 않는 것입니다.

추가한 `prepareSearchMoveAtIndex()`는
move index 하나만 받아 아래만 확인합니다.

- 현재 square가 비어 있는지
- 해당 index가 legal인지 (`computeFlipCountAtIndex()`)
- legal이면 prepared record token을 최소 형태로 채우는지

이렇게 만들어진 deferred prepared move는
`negamax()`에서 TT-first preferred move로 먼저 search합니다.
그 수가 beta-cut을 내면 나머지 move list는 만들지 않습니다.

즉 이 후보의 목표는
**move ordering의 첫 수가 이미 TT에서 강하게 맞을 때 full legal move materialization 비용을 줄이는 것**입니다.

### 2. low-overhead child-state factory는 companion candidate로만 남겼다

`lowOverheadSearchChildStateFactory`는
prepared move에서 이미 알고 있는 `player / opponent / flips / moveBit`로
child `GameState`를 직접 만드는 경로입니다.

이 경로는 depth-limited 20 empties isolate에서는 개선 신호가 있었지만,
다른 bucket까지 포함한 aggregate 기준으로는 채택선이 아니었습니다.
그래서 이번 Stage에서는 default 승격 없이 experimental opt-in으로만 유지했습니다.

### 3. monolithic benchmark runner 대신 split balanced harness를 썼다

이번 Stage에서는 기존 단일-process benchmark runner가
현재 실행 환경에서 transposition-table / process-memory pressure 때문에
안정적으로 끝나지 않았습니다.

그래서 최종 판정은 아래 방식으로 다시 수집했습니다.

- **각 sample마다 fresh Node process 실행**
- pair section은 **warm-up + interleaved 3-sample median**
- isolate matrix와 parity section을 분리 저장

즉 이번 benchmark는 단순 rerun이 아니라,
**동일한 옵션 비교를 더 보수적인 split harness로 다시 모은 판정본**입니다.

## 검증

직접 확인한 항목은 아래와 같습니다.

- `node js/test/stage203_tt_first_deferred_move_list_build_smoke.mjs`
- `node js/test/stage202_few_empties_wld_tail_refinement_bundle_smoke.mjs`
- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage122_allocation_light_search_moves_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

문서 반영 후에는 아래도 다시 통과시켰습니다.

- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

## benchmark 방법

최종 판정 기준 JSON은 아래입니다.

- `benchmarks/stage203_search_hotpath_revalidation_benchmark_split_20260422.json`

구성은 아래처럼 나눴습니다.

1. **deferred / low-overhead isolate matrix**
   - depth-limited `24` empties
   - depth-limited `20` empties
   - baseline / deferredOnly / lowOverheadOnly / both

2. **deferred-only parity sections**
   - depth-limited `24` empties
   - depth-limited `20` empties
   - rerun depth-limited `24` empties
   - rerun depth-limited `20` empties
   - WLD `14` control
   - exact `10` control

3. **low-overhead-only parity sections**
   - depth-limited `24` empties
   - depth-limited `20` empties
   - WLD `14` control
   - exact `10` control

ratio는 **candidate / baseline elapsed** 이므로,
**1보다 작을수록 candidate가 빠릅니다.**

## benchmark 요약

### 1. TT-first deferred move-list build

#### isolate matrix

- depth-limited `24` empties
  - `deferredOnly`: **`1.004x`**
  - `lowOverheadOnly`: **`1.010x`**
  - `both`: **`1.052x`**
- depth-limited `20` empties
  - `deferredOnly`: **`0.996x`**
  - `lowOverheadOnly`: **`0.971x`**
  - `both`: **`0.968x`**

matrix 기준으로도 deferred-only는 strong win이 아니었습니다.
깊은 20-empties lane에서는 거의 중립,
24-empties에서는 약하게 느렸습니다.

#### balanced pair sections

- depth-limited `24` empties: **`1.044x`**
- depth-limited `20` empties: **`1.001x`**
- rerun depth-limited `24` empties: **`1.009x`**
- rerun depth-limited `20` empties: **`1.016x`**
- WLD `14` control: **`1.007x`**
- exact `10` control: **`0.996x`**

추가 telemetry는 실제 path가 살아 있다는 점도 확인해 주었습니다.
대표 24-empties pair에서는
`candidateDeferredAttempts = 1280`,
`candidateDeferredLegalHits = 1280`,
`candidateDeferredCutoffs = 670`,
`candidateDeferredSkips = 670`이었습니다.

즉 이 경로는 **죽은 코드가 아니고 실제로 쓰였지만,
elapsed 기준 aggregate 이득으로는 연결되지 않았습니다.**

### 2. low-overhead child-state factory

- depth-limited `24` empties: **`1.008x`**
- depth-limited `20` empties: **`0.965x`**
- WLD `14` control: **`1.052x`**
- exact `10` control: **`1.042x`**

이 후보는 classic depth-limited `20` empties lane만 보면 꽤 괜찮았지만,
24-empties와 endgame control에서 되돌림이 나왔습니다.
따라서 **전역 기본값 승격은 불가**로 보는 편이 맞았습니다.

### 3. parity

두 후보 모두 아래 parity는 유지했습니다.

- best move parity
- score parity
- mode parity
- nodes parity

즉 이번 Stage는 **정확성 문제가 아니라 throughput 문제**였습니다.

## 해석

1. **deferred path는 의미론은 맞지만 채택선은 아니다**
   - 실제로 legal hit / cutoff / skip이 발생했습니다.
   - 하지만 pair/rerun/control을 합치면 elapsed가 neutral-to-negative였습니다.
   - 따라서 Stage 203에서는 default `true`로 올릴 근거가 부족합니다.

2. **low-overhead child-state는 한 lane만 보면 좋아 보이지만 전역 기본값 후보는 아니다**
   - depth-limited 20 empties는 `0.965x`였습니다.
   - 그러나 WLD/exact control이 `1.052x`, `1.042x`로 되돌렸습니다.
   - 즉 narrow activation 조건을 더 붙이지 않는 한,
     현재 형태 그대로는 전역 채택이 어렵습니다.

3. **이번 Stage는 no-adoption이 맞다**
   - 둘 다 parity는 깨지지 않았습니다.
   - 하지만 “빠른가?”라는 질문에 대해서는 yes가 아니었습니다.
   - 따라서 이번 작업은 2차 도입 채택이라기보다,
     **3차에서 다시 볼 수 있도록 실험 경로를 정리한 closeout**으로 기록하는 편이 맞습니다.

## 최종 결정

이번 Stage의 최종 결정은 아래와 같습니다.

- `ttFirstDeferredMoveListBuild`: **구현 유지, 기본값은 false**
- `lowOverheadSearchChildStateFactory`: **기존처럼 false 유지**

즉 Stage 203은
**search hotpath 후보 묶음을 실제 코드로 연결해 의미론과 수치를 확인했지만,
기본 채택은 하지 않은 no-adoption stage**입니다.

다음 라운드에서 다시 본다면,
아래처럼 더 좁은 activation 조건이 필요합니다.

- deferred path: TT move quality / branch factor / precompute lane 조건을 더 정교하게 제한
- low-overhead child-state: classic midgame 한정 gate 또는 exact/WLD 제외 gate 추가

현재 2차 목표 기준으로는 여기서 닫는 편이 가장 안전합니다.
