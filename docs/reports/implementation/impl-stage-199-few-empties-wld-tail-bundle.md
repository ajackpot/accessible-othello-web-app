# Stage 199 - few-empties WLD tail bundle adoption

## 이번 단계에서 한 일

이번 단계는 Stage 197 exact-tail 5~8 empties 채택 이후 다음 고확률 후보로 남아 있던
**few-empties WLD tail bundle**을 실제 런타임에 연결하고,
기본값 승격이 가능한지 balanced benchmark로 판정한 작업입니다.

구체적으로는 아래를 적용했습니다.

1. **specialized few-empties WLD solver 1~4 empties 추가**
   - `js/ai/search-engine.js`에 `solveSpecializedWld1~4()`를 추가했습니다.
   - exact 쪽 specialized tail과 같은 식으로, 남은 empty index를 직접 넘기며
     `bitsToIndices()` 기반의 작은 WLD tail을 별도 경로로 처리합니다.
   - pass semantics와 alpha-beta window를 그대로 유지해 baseline과 점수 의미론을 맞췄습니다.

2. **lightweight few-empties WLD move path 5~8 empties 추가**
   - exact-tail에서 검증한 reusable slot/buffer 구조를 WLD 쪽으로 확장했습니다.
   - `populateFewEmptiesWldMoveBuffer()`가 move object 배열 대신
     `index / nextPlayerBoard / nextOpponentBoard / remainingEmptyBits / orderingScore / opponentMoveCount`
     중심의 slot buffer를 재사용합니다.
   - `exactFastestFirstOrdering`이 켜진 상태에서는 opponent reply count를 같이 계산해
     기존 few-empties ordering 의미론을 유지합니다.

3. **WLD small solver dispatch를 threshold 8까지 확장**
   - `solveSmallWldBoards()`가 아래 순서로 분기하도록 정리했습니다.
     - 1~4 empties: specialized WLD tail
     - 5~8 empties: optimized/lightweight WLD tail
     - 그 밖의 경우: 기존 full-width WLD tail
   - 기본 옵션은 `optimizedFewEmptiesWldSolver = true`,
     `optimizedFewEmptiesWldSolverEmpties = 8`,
     `lightweightFewEmptiesWldMovePath = true`로 올렸습니다.

4. **WLD telemetry / benchmark helper 확장**
   - `specializedFewEmptiesWld1~4Calls`,
     `optimizedFewEmptiesWld5~8Calls`,
     `lightweightFewEmptiesWld5~8Calls`,
     `optimizedFewEmptiesWldFastestFirstSorts`,
     `optimizedFewEmptiesWldFastestFirstPassCandidates`를 stats에 추가했습니다.
   - `js/test/benchmark-helpers.mjs`도 새 WLD telemetry를 summary에 포함하도록 확장했습니다.

5. **회귀/벤치 harness 추가**
   - `js/test/stage199_few_empties_wld_tail_bundle_smoke.mjs`를 새로 추가했습니다.
   - `tools/benchmark/run-stage199-few-empties-wld-tail-benchmark-balanced.mjs`를 추가해
     direct micro와 WLD search section을 한 번에 비교할 수 있게 했습니다.

## 왜 이 후보를 지금 골랐는가

Stage 197에서는 exact-tail 5~8 empties 경량 경로와 threshold 8 재검증을 끝냈고,
Stage 198에서는 compact prepared flip token pilot을 수치로 판정해 기본값 채택을 보류했습니다.
그 다음 남은 고확률 후보 중에서는,
**exact에서 이미 통했던 few-empties tail 전략을 WLD 1~8 empties에 그대로 확장하는 묶음**이
난이도 대비 기대값이 가장 높았습니다.

특히 WLD bucket은 10~14 empties 구간에서 exact보다 더 자주 tail window에 들어가기 때문에,
직접 solver micro 자체가 조금 느려지더라도
**상위 WLD root search 전체 nodes와 elapsed를 크게 줄일 가능성**이 있었습니다.
이번 Stage는 바로 그 가설을 검증한 단계입니다.

## 구현 포인트

### 1. exact-tail 구조를 WLD tail에 그대로 재사용

새 WLD tail 경로는 완전히 별도 설계를 만든 것이 아니라,
이미 exact 쪽에서 검증한 구조를 가능한 한 그대로 가져왔습니다.

- 1~4 empties: specialized direct recursion
- 5~8 empties: reusable slot buffer + fastest-first ordering
- pass semantics / alpha-beta semantics 유지

이렇게 맞춰 두면 parity 해석이 단순해지고,
exact-tail과 WLD-tail의 성능 차이를 구조적으로 비교하기도 쉬워집니다.

### 2. direct micro와 search bucket을 분리해서 해석

이번 후보도 direct `solveSmallWld()` micro만 보면 손해가 날 수 있습니다.
왜냐하면 specialized/lightweight path는 ordering metadata를 만들고,
root search 안에서는 더 이른 cutoff와 node reduction으로 비용을 돌려받는 성격이 강하기 때문입니다.

그래서 판정도 두 층으로 나눴습니다.

- **directSpecializedMicro / directTailMicro**
  - small WLD solver 단독 overhead 확인
- **search (wld10 / wld12 / wld14)**
  - 실제 WLD root throughput과 node reduction 확인

즉 이번 Stage의 채택 판단 기준은 direct micro가 아니라
**실제 WLD search section aggregate**입니다.

## 검증

직접 확인한 항목은 아래와 같습니다.

- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`
- `node js/test/stage198_compact_prepared_search_move_flips_smoke.mjs`
- `node js/test/stage199_few_empties_wld_tail_bundle_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

문서 반영 후에는 아래도 다시 통과시켰습니다.

- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

최종 기본값은 아래와 같습니다.

- `optimizedFewEmptiesWldSolver = true`
- `optimizedFewEmptiesWldSolverEmpties = 8`
- `lightweightFewEmptiesWldMovePath = true`

## benchmark 방법

최종 판정은 balanced benchmark JSON
`benchmarks/stage199_few_empties_wld_tail_bundle_benchmark_balanced_20260422.json`
기준으로 정리했습니다.

구성은 아래와 같습니다.

- direct specialized 4-empty micro
- direct 5~8 empty tail micro
- WLD root search `10 / 12 / 14` empties
- baseline/candidate interleaved sampling
- parity는 best move / score / mode 기준으로 확인

ratio는 **candidate / baseline elapsed** 이므로,
**1보다 작을수록 candidate가 빠릅니다.**

## benchmark 요약

### direct micro

- direct specialized 4-empty micro: **`1.978x`**
- direct 5~8 empty tail micro: **`1.261x`**

즉 small WLD solver 단독 micro만 보면 candidate가 더 느립니다.
이 단계만 떼어 보면 채택 근거가 약합니다.

### WLD search section

- `wld10`: **`0.613x`**
  - nodes: **`0.050x`**
  - WLD small-solver nodes: **`0.568x`**
- `wld12`: **`0.821x`**
  - nodes: **`0.053x`**
  - WLD small-solver nodes: **`0.657x`**
- `wld14`: **`0.781x`**
  - nodes: **`0.071x`**
  - WLD small-solver nodes: **`0.904x`**

search aggregate는 아래와 같습니다.

- aggregate elapsed: **`0.784x`**
- aggregate nodes: **`0.067x`**
- aggregate WLD small-solver nodes: **`0.830x`**

즉 direct micro는 느려졌지만,
실제 WLD root search에서는 **elapsed가 크게 줄고 nodes는 훨씬 더 크게 줄었습니다.**

## 해석

1. **small WLD solver 단독 micro는 더 싸지 않았다**
   - specialized 4-empty와 5~8 empty direct micro 둘 다 baseline보다 느렸습니다.
   - 따라서 이 후보를 “직접 solver 호출 자체의 가속”으로 이해하면 맞지 않습니다.

2. **하지만 WLD root search 전체 throughput에는 강한 이득이 났다**
   - `wld10 0.613x`, `wld12 0.821x`, `wld14 0.781x`
   - aggregate nodes도 `0.067x`까지 줄었습니다.
   - 즉 candidate는 WLD bucket에서 tail window 진입 이후
     더 공격적으로 정리된 solver path를 써서 상위 search 비용을 크게 낮춘다고 보는 편이 맞습니다.

3. **parity는 유지됐다**
   - benchmark search section 전체에서 best move / score / mode parity가 유지됐습니다.
   - smoke도 direct 4-empty, direct 8-empty, WLD root regression을 모두 통과했습니다.

4. **Stage 197 exact-tail 채택과 성격이 비슷하지만, 더 search-oriented이다**
   - Stage 197도 direct micro보다 exact root throughput을 더 중시해 채택했습니다.
   - 이번 Stage 199는 그보다 더 분명하게,
     direct micro 손해를 상위 WLD search gain이 압도한 사례입니다.

## 채택 판단

이번 Stage 199는 **채택**으로 정리합니다.

정확히는 아래 세 가지를 함께 채택했습니다.

- `optimizedFewEmptiesWldSolver = true`
- `optimizedFewEmptiesWldSolverEmpties = 8`
- `lightweightFewEmptiesWldMovePath = true`

해석은 다음처럼 정리하는 것이 가장 정확합니다.

- direct WLD tail micro 자체는 baseline보다 느릴 수 있다.
- 그러나 실제 WLD root search 10~14 empties에서는 훨씬 큰 node reduction과 elapsed 개선이 난다.
- 따라서 이 후보는 **WLD root throughput 개선을 목적으로 한 search-side adoption**으로 보는 편이 맞다.

## 현재 기본값

few-empties tail 관련 기본값은 이제 아래와 같습니다.

### exact

- `specializedFewEmptiesExactSolver = true`
- `lightweightFewEmptiesExactMovePath = true`
- `optimizedFewEmptiesExactSolver = true`
- `optimizedFewEmptiesExactSolverEmpties = 8`

### WLD

- `optimizedFewEmptiesWldSolver = true`
- `optimizedFewEmptiesWldSolverEmpties = 8`
- `lightweightFewEmptiesWldMovePath = true`

원인 분리용 baseline은 아래처럼 재현할 수 있습니다.

- WLD bundle off: `optimizedFewEmptiesWldSolver: false`, `lightweightFewEmptiesWldMovePath: false`
- threshold만 낮추기: `optimizedFewEmptiesWldSolverEmpties: 4` 또는 `6` 등 실험값

## 다음 후보 메모

이번 Stage 199로 WLD 1~8 empties tail window도 일단 닫혔습니다.
남은 상위 후보는 다시 search-side hotpath와 exact-tail 세부 미세화 쪽입니다.

1. **specialized few-empties last-flip exact path**
   - 1-empty leaf를 더 가볍게 처리하는 exact-tail 후보
   - direct micro와 exact12 구간에서 개선 신호가 있는 상태입니다.

2. **lightweight exact-tail fastest-first selective gate**
   - low-branching exact-tail node에서 reply-count ordering sort를 더 공격적으로 생략하는 후보

3. **TT-first deferred move-list build / low-overhead child-state path**
   - search hotpath 쪽의 필연 후보이지만,
     현재까지는 late-midgame에서 거의 중립에 가까운 판정이라 WLD tail보다 우선순위가 낮습니다.
