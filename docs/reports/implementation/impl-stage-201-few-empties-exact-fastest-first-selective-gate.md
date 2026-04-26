# Stage 201 - few-empties exact fastest-first selective gate adoption

## 이번 단계에서 한 일

이번 단계는 Stage 183 후보 메모에 남아 있던 exact-tail 정리 후보 중,
**few-empties exact fastest-first selective gate**를 현재 Stage 200 기준 코드에 실제로 넣고
기본값 승격이 가능한지 benchmark로 판정한 작업입니다.

핵심은 few-empties exact helper path 안에서
**legal move 수가 아주 적은 node에서는 reply-count fastest-first ordering 비용을 아예 내지 않도록**
선별 게이트를 붙인 것입니다.

기존 exact fastest-first ordering은 exact lane에서 효과가 있었지만,
branch 수가 작은 tail node에서도 매번 상대 legal-move count를 probe하고 정렬 키를 확장했습니다.
이번 Stage에서는 이 경로를 exact 전체가 아니라 **few-empties exact helper 내부로만 좁게 한정**해,
legal move 수가 `4` 미만이면 reply-count probe를 건너뛰고 기존 square-score ordering만 사용하게 했습니다.

구체적으로는 아래를 적용했습니다.

1. **few-empties exact selective gate 옵션 추가**
   - `js/ai/search-engine.js`에 `fewEmptiesExactFastestFirstSelectiveGate`를 추가했습니다.
   - 최종 benchmark 판정 후 기본값은 **`true`**로 올렸습니다.

2. **few-empties exact helper path 한정 gating 연결**
   - `populateFewEmptiesExactMoveBuffer()`와 `generateFewEmptiesExactMoves()`에서
     legal move 수를 먼저 확인한 뒤,
     `moveCount < 4`면 reply-count 기반 fastest-first ordering을 생략하도록 바꿨습니다.
   - 이때 full exact lane을 꺼 버리는 것이 아니라,
     larger branch에서는 기존 fastest-first를 그대로 유지합니다.

3. **threshold helper / telemetry 추가**
   - `EXACT_FASTEST_FIRST_MIN_LEGAL_MOVES = 4` 상수를 두고,
     `shouldSkipFewEmptiesExactFastestFirstForMoveCount()` helper로 조건을 중앙화했습니다.
   - search stats에는 `optimizedFewEmptiesFastestFirstSelectiveSkips`를 추가해,
     실제 few-empties exact tree 안에서 selective gate가 작동했는지 바로 확인할 수 있게 했습니다.

4. **smoke / benchmark 추가**
   - `js/test/stage201_few_empties_exact_fastest_first_selective_gate_smoke.mjs`를 추가했습니다.
   - `tools/benchmark/run-stage201-few-empties-exact-fastest-first-selective-gate-benchmark.mjs`를 추가해
     direct 8-empty exact micro, exact-10 / exact-12 root, WLD-12 control을 함께 비교했습니다.

## 왜 이 후보를 지금 골랐는가

Stage 197에서 exact-tail 5~8 empties lightweight path와 threshold 8을 정리했고,
Stage 200에서 1-empty last-flip leaf short-circuit까지 채택한 뒤에도,
exact tail 내부 ordering 비용은 아직 별도 후보로 남아 있었습니다.

특히 현재 기본값은 exact fastest-first ordering이 이미 켜져 있으므로,
low-branching few-empties node에서 아래 비용이 남아 있을 가능성이 높았습니다.

- 상대 legal move 수 probe
- reply-count 정렬 키 계산
- small branch에서도 same-cost sort 유지

이 후보는 다음 이유 때문에 우선순위가 높았습니다.

- exact tail 내부에만 국한되는 좁은 변경이다.
- 실패해도 옵션 단위로 바로 원인 분리가 가능하다.
- direct micro와 exact-root boundary benchmark에서 곧바로 판정할 수 있다.
- Stage 198처럼 representation 전체를 바꾸지 않아 구현 리스크가 낮다.

즉 이번 Stage는 **few-empties exact ordering 비용을 좁게 줄이는 low-risk 후보**를
먼저 정리한 단계입니다.

## 구현 포인트

### 1. exact fastest-first 전체를 끄는 것이 아니라, small branch만 건너뛴다

이번 후보의 핵심은 exact fastest-first ordering 자체를 폐기하는 것이 아닙니다.

- branch가 충분히 큰 few-empties exact node에서는 기존 reply-count ordering 유지
- legal move 수가 `4` 미만인 small branch node에서만 selective skip

즉 Stage 24/84 계열에서 채택된 exact fastest-first의 장점은 유지하면서,
그 이득이 작아지는 tail node에서만 ordering probe 비용을 덜어내는 방식입니다.

### 2. helper path만 수정하고 generic exact root ordering은 그대로 둔다

초기 실험에서는 더 넓은 exact ordering 경로까지 gating을 넓힐 수 있는지 확인했지만,
그 쪽은 이득이 안정적이지 않았습니다.

그래서 최종 채택 경로는 아래처럼 정리했습니다.

- **수정 대상**: few-empties exact helper path
- **유지 대상**: generic exact root ordering / wider exact lane semantics

이렇게 하면 exact 전체 의미론을 크게 흔들지 않으면서,
실제 profiling상 부담이 될 가능성이 큰 low-branching tail node만 건드릴 수 있습니다.

### 3. direct micro가 아니라 exact-root throughput 후보로 읽어야 한다

이번 후보는 direct 8-empty micro만 떼어 보면 오히려 느려졌습니다.
그런데 exact root search aggregate에서는 두 번 모두 개선이 반복됐습니다.

따라서 이 Stage의 성격은
**small exact solver micro 가속**이 아니라
**exact-root search tree 안의 ordering overhead cleanup**에 더 가깝습니다.

## 검증

직접 확인한 항목은 아래와 같습니다.

- `node js/test/stage201_few_empties_exact_fastest_first_selective_gate_smoke.mjs`
- `node js/test/stage200_specialized_few_empties_last_flip_path_smoke.mjs`
- `node js/test/stage199_few_empties_wld_tail_bundle_smoke.mjs`
- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

문서 반영 후에는 아래도 다시 통과시켰습니다.

- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

최종 기본값은 아래와 같습니다.

- `fewEmptiesExactFastestFirstSelectiveGate = true`

## benchmark 방법

최종 판정은 아래 두 JSON을 함께 기준으로 정리했습니다.

- `benchmarks/stage201_few_empties_exact_fastest_first_selective_gate_benchmark_20260422.json`
- `benchmarks/stage201_few_empties_exact_fastest_first_selective_gate_benchmark_rerun_20260422.json`

구성은 아래와 같습니다.

- direct 8-empty exact micro
- exact root search `10 / 12` empties
- WLD root control `12` empties
- baseline/candidate interleaved sampling
- rerun으로 재현성 확인
- parity는 best move / score / mode / nodes 기준으로 재확인

ratio는 **candidate / baseline elapsed** 이므로,
**1보다 작을수록 candidate가 빠릅니다.**

## benchmark 요약

### main run

- direct 8-empty micro: **`1.193x`**
- `exact10`: **`1.001x`**
  - nodes: **`1.000x`**
- `exact12`: **`0.961x`**
  - nodes: **`1.008x`**
- `wld12` control: **`0.996x`**
  - nodes: **`1.000x`**
- exact search aggregate elapsed: **`0.970x`**
- exact search aggregate nodes: **`1.007x`**

### rerun

- direct 8-empty micro: **`1.103x`**
- `exact10`: **`1.000x`**
  - nodes: **`1.000x`**
- `exact12`: **`0.965x`**
  - nodes: **`1.008x`**
- `wld12` control: **`1.019x`**
  - nodes: **`1.000x`**
- exact search aggregate elapsed: **`0.973x`**
- exact search aggregate nodes: **`1.007x`**

best move / score / mode parity는 전 section에서 유지됐습니다.
node parity는 `exact10`, `wld12`에서는 그대로였고,
`exact12`에서는 4개 case 중 1개 case(seed `7`)에서만 `221 -> 229`로 소폭 증가했습니다.

## 해석

1. **direct micro 후보는 아니었다**
   - direct 8-empty micro가 main `1.193x`, rerun `1.103x`였으므로,
     small exact solver만 떼어 보면 candidate가 더 느렸습니다.
   - 따라서 이번 Stage를 direct micro 가속 채택으로 해석하면 맞지 않습니다.

2. **exact-root throughput 개선은 반복됐다**
   - `exact12`는 main `0.961x`, rerun `0.965x`
   - exact search aggregate elapsed도 main `0.970x`, rerun `0.973x`
   - 즉 exact root 쪽 elapsed 이득은 두 run에서 같은 방향으로 반복됐습니다.

3. **exact10과 WLD control은 거의 중립이었다**
   - `exact10`은 사실상 `1.000x`
   - `wld12`는 `0.996x`, rerun `1.019x`
   - 즉 이번 후보는 broader search lane을 크게 흔드는 변화라기보다,
     exact tail 내부 일부 branch 비용을 다듬는 cleanup에 더 가깝습니다.

4. **node는 약간 늘었지만 elapsed는 줄었다**
   - aggregate exact search node ratio가 `1.007x`였고,
     exact12 한 case에서만 `221 -> 229` 증가가 있었습니다.
   - 그래도 elapsed ratio는 두 run 모두 `1` 아래로 내려갔으므로,
     이번 이득은 node 절감보다 **ordering overhead 감소**에서 왔다고 보는 편이 맞습니다.

## 채택 판단

이번 Stage 201은 **채택**으로 정리합니다.

최종 기본값은 아래와 같습니다.

- `fewEmptiesExactFastestFirstSelectiveGate = true`

이유는 다음처럼 정리하는 것이 가장 정확합니다.

- direct 8-empty micro는 오히려 느렸지만,
- exact-12 root와 exact search aggregate elapsed는 두 run 모두 개선됐고,
- best move / score / mode parity가 유지됐으며,
- WLD control은 거의 중립이었기 때문입니다.

따라서 이 후보는
**direct micro solver speedup이 아니라 exact-root throughput 개선용 selective cleanup adoption**으로
기록하는 편이 맞습니다.

## 현재 few-empties / exact 관련 기본값

### exact

- `specializedFewEmptiesExactSolver = true`
- `lightweightFewEmptiesExactMovePath = true`
- `optimizedFewEmptiesExactSolver = true`
- `optimizedFewEmptiesExactSolverEmpties = 8`
- `specializedFewEmptiesLastFlipPath = true`
- `exactFastestFirstOrdering = true`
- `fewEmptiesExactFastestFirstSelectiveGate = true`

### WLD

- `optimizedFewEmptiesWldSolver = true`
- `optimizedFewEmptiesWldSolverEmpties = 8`
- `lightweightFewEmptiesWldMovePath = true`

원인 분리용 baseline은 아래처럼 재현할 수 있습니다.

- selective gate off: `fewEmptiesExactFastestFirstSelectiveGate: false`
- Stage 200 last-flip off: `specializedFewEmptiesLastFlipPath: false`
- Stage 197 exact-tail baseline: `lightweightFewEmptiesExactMovePath: false`
- Stage 199 WLD-tail baseline: `optimizedFewEmptiesWldSolver: false`, `lightweightFewEmptiesWldMovePath: false`
