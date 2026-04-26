# Stage 202 - few-empties WLD tail refinement bundle adoption

## 이번 단계에서 한 일

이번 단계는 Stage 199에서 few-empties WLD tail 1~8 empties를 기본 경로에 올린 뒤에도
따로 남아 있던 두 후속 후보,
**specialized few-empties WLD last-flip path**와
**few-empties WLD fastest-first selective gate**를
한 묶음으로 실제 런타임에 연결하고 기본값 승격 여부를 판정한 작업입니다.

핵심은 아래 두 가지입니다.

1. **specialized few-empties WLD last-flip path 추가**
   - `js/ai/search-engine.js`의 specialized WLD 1~4 empties family에
     disk-diff carry 기반 last-flip short-circuit를 붙였습니다.
   - 마지막 1-empty leaf에서는 남은 square index와 `computeFlipCountAtIndex()`만으로
     legal/pass/terminal WLD score를 바로 계산하도록 정리했습니다.
   - exact 쪽 Stage 200에서 이미 먹힌 패턴을 WLD 쪽으로 맞춰 내린 형태입니다.

2. **few-empties WLD fastest-first selective gate 추가**
   - `populateFewEmptiesWldMoveBuffer()`가 few-empties WLD helper path에서
     legal move 수를 먼저 확인한 뒤,
     `moveCount < 4`이면 reply-count fastest-first probe를 생략하고
     square-score ordering만 쓰도록 좁게 제한했습니다.
   - larger branch에서는 기존 reply-count fastest-first ordering을 그대로 유지합니다.

3. **telemetry / stats 확장**
   - `specializedFewEmptiesWldLastFlipCalls`
   - `optimizedFewEmptiesWldFastestFirstSelectiveSkips`
   - 위 두 카운터를 search stats에 추가해,
     candidate path가 실제 runtime tree 안에서 사용되는지 바로 확인할 수 있게 했습니다.

4. **smoke / benchmark 추가**
   - `js/test/stage202_few_empties_wld_tail_refinement_bundle_smoke.mjs`
   - `tools/benchmark/run-stage202-few-empties-wld-tail-refinement-benchmark.mjs`
   - direct one-empty / direct eight-empty WLD micro와
     `wld10 / wld12 / wld14` root, `exact12` control을 함께 비교하도록 구성했습니다.

최종 기본값은 아래처럼 올렸습니다.

- `specializedFewEmptiesWldLastFlipPath = true`
- `fewEmptiesWldFastestFirstSelectiveGate = true`

## 왜 이 후보를 지금 골랐는가

Stage 199에서 WLD tail 1~8 empties를 닫았고,
Stage 200/201에서는 exact-tail 내부 last-flip과 selective gate를 각각 채택했습니다.
그 다음 남은 고확률 후보를 다시 정리해 보면,
**exact 쪽에서 이미 채택된 저위험 tail cleanup을 WLD 쪽에 대칭적으로 내려 보는 작업**이
난이도 대비 이득을 보기 가장 좋은 상태였습니다.

특히 이번 묶음은 아래 이유로 우선순위가 높았습니다.

- 변화 범위가 WLD tail 1~8 empties helper path로 제한된다.
- baseline 재현이 옵션 두 개로 즉시 가능하다.
- 문제가 생기면 `lastFlip`과 `selective gate`를 바로 분리해 원인을 볼 수 있다.
- exact 쪽에서 이미 유사 패턴이 검증돼 구현 리스크가 낮다.

즉 이번 Stage는
**few-empties WLD tail 내부의 남은 ordering / leaf overhead를 낮추는 low-risk refinement bundle**을
먼저 닫아 보는 단계였습니다.

## 구현 포인트

### 1. WLD last-flip도 exact와 같은 disk-diff carry 구조로 정리

이번 candidate의 핵심은 WLD specialized tail이 마지막 1-empty leaf 근처에서
매번 full move materialization을 다시 하지 않도록 만드는 것입니다.

- `solveSpecializedWld1WithDiskDiff()`
- `solveSpecializedWld2WithDiskDiff()`
- `solveSpecializedWld3WithDiskDiff()`
- `solveSpecializedWld4WithDiskDiff()`

를 추가해, 남은 empty index와 현재 `diskDiff`를 그대로 넘기도록 바꿨습니다.
그 결과 마지막 leaf는 flip count만으로 점수 판정을 끝낼 수 있고,
pass/terminal semantics는 기존 specialized WLD path와 동일하게 유지됩니다.

### 2. WLD fastest-first 전체를 끄는 것이 아니라, low-branching helper만 건너뛴다

이번 selective gate도 exact 쪽 Stage 201과 같은 원칙을 유지합니다.

- branch가 충분히 큰 few-empties WLD node에서는 기존 reply-count ordering 유지
- legal move 수가 `4` 미만인 small branch node에서만 selective skip

즉 WLD fastest-first ordering 자체를 폐기하는 것이 아니라,
이득보다 probe 비용이 더 커질 가능성이 높은 tiny branch에서만
상대 legal count probe를 생략하는 방식입니다.

### 3. node 절감 후보가 아니라 overhead cleanup 후보로 읽어야 한다

이번 benchmark에서는 aggregate search node ratio가 `1.000x`로 그대로였고,
WLD small-solver node ratio는 오히려 `1.021x`로 소폭 늘었습니다.
그런데 elapsed는 두 run 모두 개선됐습니다.

즉 이번 후보의 성격은
**search tree 자체를 줄이는 후보**가 아니라,
**few-empties WLD tail 내부 ordering / leaf overhead cleanup**에 더 가깝습니다.

## 검증

직접 확인한 항목은 아래와 같습니다.

- `node js/test/stage202_few_empties_wld_tail_refinement_bundle_smoke.mjs`
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

## benchmark 방법

최종 판정은 아래 두 JSON을 함께 기준으로 정리했습니다.

- `benchmarks/stage202_few_empties_wld_tail_refinement_bundle_benchmark_20260422.json`
- `benchmarks/stage202_few_empties_wld_tail_refinement_bundle_benchmark_rerun_20260422.json`

구성은 아래와 같습니다.

- direct 1-empty WLD micro
- direct 8-empty WLD micro
- WLD root search `10 / 12 / 14` empties
- exact root control `12` empties
- baseline/candidate interleaved sampling
- parity는 best move / score / mode / nodes 기준으로 재확인

ratio는 **candidate / baseline elapsed** 이므로,
**1보다 작을수록 candidate가 빠릅니다.**

## benchmark 요약

### main run

- direct 1-empty WLD micro: **`0.912x`**
  - WLD small-solver nodes: **`0.750x`**
- direct 8-empty WLD micro: **`0.580x`**
  - WLD small-solver nodes: **`0.982x`**
- `wld10`: **`0.904x`**
  - nodes: **`1.000x`**
  - WLD small-solver nodes: **`1.098x`**
- `wld12`: **`0.894x`**
  - nodes: **`1.000x`**
  - WLD small-solver nodes: **`0.996x`**
- `wld14`: **`0.885x`**
  - nodes: **`1.000x`**
  - WLD small-solver nodes: **`1.027x`**
- `exact12` control: **`0.974x`**
  - nodes: **`1.000x`**
- search aggregate elapsed: **`0.888x`**
- search aggregate nodes: **`1.000x`**
- search aggregate WLD small-solver nodes: **`1.021x`**

### rerun

- direct 1-empty WLD micro: **`1.005x`**
  - WLD small-solver nodes: **`0.750x`**
- direct 8-empty WLD micro: **`0.587x`**
  - WLD small-solver nodes: **`0.982x`**
- `wld10`: **`1.019x`**
  - nodes: **`1.000x`**
  - WLD small-solver nodes: **`1.098x`**
- `wld12`: **`0.864x`**
  - nodes: **`1.000x`**
  - WLD small-solver nodes: **`0.996x`**
- `wld14`: **`0.901x`**
  - nodes: **`1.000x`**
  - WLD small-solver nodes: **`1.027x`**
- `exact12` control: **`0.966x`**
  - nodes: **`1.000x`**
- search aggregate elapsed: **`0.896x`**
- search aggregate nodes: **`1.000x`**
- search aggregate WLD small-solver nodes: **`1.021x`**

best move / score / mode / nodes parity는 전 section에서 유지됐습니다.

## 추가 원인 분리

rerun에서 `wld10`만 `1.019x`로 약하게 흔들렸기 때문에,
후속으로 four-way isolate를 한 번 더 짧게 돌려 원인을 분리했습니다.

비교한 variant는 아래 네 가지입니다.

- baseline: 둘 다 off
- `lastFlipOnly`: last-flip on, selective gate off
- `gateOnly`: last-flip off, selective gate on
- `both`: 둘 다 on

focused isolate에서 `wld10`은 아래처럼 나왔습니다.

- `lastFlipOnly`: **`0.742x`**
- `gateOnly`: **`0.749x`**
- `both`: **`0.652x`**

즉 rerun에서 보인 `wld10` wobble은 bundle 전체의 구조적 퇴행이라기보다,
small bucket timing noise / warm-order sensitivity에 더 가깝다고 보는 편이 맞았습니다.

## 해석

1. **direct micro도 크게 망가지지 않았다**
   - direct 1-empty는 main `0.912x`, rerun `1.005x`로 사실상 neutral-to-better였습니다.
   - direct 8-empty는 `0.580x`, rerun `0.587x`로 두 run 모두 강하게 개선됐습니다.
   - 따라서 이번 후보는 “direct micro는 손해지만 root search에서만 이득”인 타입으로만 볼 필요는 없습니다.

2. **WLD root aggregate 개선은 두 run에서 반복됐다**
   - search aggregate elapsed가 `0.888x`, rerun `0.896x`
   - `wld12`, `wld14`도 두 run 모두 개선 방향이 반복됐습니다.
   - `wld10`은 rerun에서만 약하게 흔들렸지만,
     전체 aggregate와 isolate 결과를 함께 보면 채택 판단을 뒤집을 정도는 아니었습니다.

3. **node 절감이 아니라 overhead cleanup 이득이다**
   - search aggregate node ratio는 `1.000x`
   - WLD small-solver node ratio는 `1.021x`
   - 그런데 elapsed는 두 run 모두 줄었습니다.
   - 즉 이번 이득은 탐색 트리를 덜 본 결과라기보다,
     few-empties WLD tail 내부의 ordering / leaf 비용이 가벼워진 결과로 보는 편이 맞습니다.

4. **exact control은 중립 이상이었다**
   - `exact12` control은 `0.974x`, rerun `0.966x`
   - WLD-tail 정리가 exact 경로 바깥으로 새지 않는다는 점도 같이 확인됐습니다.

## 채택 판단

이번 Stage 202는 **채택**으로 정리합니다.

최종 기본값은 아래와 같습니다.

- `specializedFewEmptiesWldLastFlipPath = true`
- `fewEmptiesWldFastestFirstSelectiveGate = true`

가장 정확한 해석은 다음과 같습니다.

- direct WLD micro도 대체로 neutral-to-better였고,
- WLD root aggregate elapsed 개선이 두 run에서 반복됐으며,
- best move / score / mode / nodes parity가 유지됐고,
- exact control도 중립 이상이었기 때문입니다.

따라서 이번 후보는
**few-empties WLD tail 내부 ordering / leaf overhead cleanup을 통한 WLD-root throughput 개선 채택**으로
기록하는 편이 맞습니다.

## 현재 few-empties tail 관련 기본값

### exact

- `specializedFewEmptiesExactSolver = true`
- `specializedFewEmptiesLastFlipPath = true`
- `lightweightFewEmptiesExactMovePath = true`
- `optimizedFewEmptiesExactSolver = true`
- `optimizedFewEmptiesExactSolverEmpties = 8`
- `fewEmptiesExactFastestFirstSelectiveGate = true`

### WLD

- `optimizedFewEmptiesWldSolver = true`
- `optimizedFewEmptiesWldSolverEmpties = 8`
- `lightweightFewEmptiesWldMovePath = true`
- `specializedFewEmptiesWldLastFlipPath = true`
- `fewEmptiesWldFastestFirstSelectiveGate = true`

원인 분리용 baseline은 아래처럼 재현할 수 있습니다.

- WLD refinement off:
  - `specializedFewEmptiesWldLastFlipPath: false`
  - `fewEmptiesWldFastestFirstSelectiveGate: false`
- 부분 분리:
  - `specializedFewEmptiesWldLastFlipPath: true`, `fewEmptiesWldFastestFirstSelectiveGate: false`
  - `specializedFewEmptiesWldLastFlipPath: false`, `fewEmptiesWldFastestFirstSelectiveGate: true`

## 다음 후보 메모

few-empties exact/WLD tail 내부의 고확률 cleanup은 이번 Stage 202로 대부분 정리됐습니다.
따라서 다음 유력 후보는 다시 search-side hotpath 쪽,
특히 **TT-first deferred move-list build / low-overhead child-state path** 같은
중반 classic lane 비용 절감 후보로 돌아가는 편이 가장 자연스럽습니다.
