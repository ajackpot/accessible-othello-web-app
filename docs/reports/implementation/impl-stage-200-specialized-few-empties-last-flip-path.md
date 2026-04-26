# Stage 200 - specialized few-empties last-flip exact path adoption

## 이번 단계에서 한 일

이번 단계는 Stage 183 후보 메모에 남아 있던 exact-tail 후보 중,
**specialized few-empties last-flip exact path**를 현재 Stage 199 기준 코드에 실제로 forward-port하고
기본값 승격이 가능한지 benchmark로 판정한 작업입니다.

핵심은 specialized exact 1~4 empties recursion의 마지막 수 근처에서
`bitsToIndices()` 재생성, 말 수 재count, full generic flip materialization을 반복하는 대신,
**index 기반 flip query + disk-diff carry**로 바로 마무리하는 경로를 붙인 것입니다.

구체적으로는 아래를 적용했습니다.

1. **index 기반 exact-tail flip query 추가**
   - `js/core/rules.js`에 `computeFlipsAtIndex()`와 `computeFlipCountAtIndex()`를 추가했습니다.
   - 기존 `computeFlips(moveBit, ...)` / `computeFlipCount(moveBit, ...)` 의미론은 유지하면서,
     few-empties specialized tail이 `bitFromIndex()` 이후 full generic move object를 만들지 않고
     index 그대로 flip 정보에 접근할 수 있게 했습니다.

2. **specialized exact tail용 disk-diff carry 경로 추가**
   - `js/ai/search-engine.js`에
     `solveSpecializedExact1WithDiskDiff()` ~ `solveSpecializedExact4WithDiskDiff()`를 추가했습니다.
   - recursive tail 안에서 매번 `popcount(player) - popcount(opponent)`를 다시 계산하는 대신,
     상위 노드에서 넘겨 받은 `diskDiff`를 move 적용량만큼 갱신해 leaf까지 전달합니다.
   - 1-empty direct legal / pass 케이스는 `computeFlipCountAtIndex()`만으로 바로 끝낼 수 있게 했습니다.

3. **specialized few-empties last-flip gate 추가**
   - 새 실험 옵션 `specializedFewEmptiesLastFlipPath`를 도입했습니다.
   - 초기 구현/검증 후 benchmark를 돌려 기본값 승격 여부를 판정했고,
     최종적으로는 **기본값 `true`**로 채택했습니다.

4. **telemetry / smoke / benchmark 추가**
   - search stats에 `specializedFewEmptiesLastFlipCalls`를 추가했습니다.
   - `js/test/stage200_specialized_few_empties_last_flip_path_smoke.mjs`를 추가했습니다.
   - `tools/benchmark/run-stage200-specialized-few-empties-last-flip-benchmark.mjs`를 추가해
     direct 1-empty micro, exact-10 / exact-12 root, WLD-12 control을 함께 비교했습니다.

## 왜 이 후보를 지금 골랐는가

Stage 197에서 exact-tail 5~8 empties 경량 경로와 threshold 8 승격을 채택했고,
Stage 199에서 few-empties WLD tail bundle까지 정리한 뒤에도,
exact 1~4 empties specialized tail의 **마지막 수 처리 오버헤드**는 별도 후보로 남아 있었습니다.

이 후보는 다음 특징 때문에 우선순위가 높았습니다.

- 구현 표면이 작고, 의미론 경계가 좁다.
- exact bucket 전용이므로 parity 검증이 비교적 단순하다.
- direct 1-empty / exact-10 / exact-12 같은 representative 구간에서
  즉시 수치 판정이 가능하다.
- 실패하더라도 옵션 단위로 쉽게 되돌릴 수 있다.

즉 이번 Stage는 **난이도 대비 이득 가능성이 높은 exact-tail cleanup 후보**를
low-risk adoption 관점에서 처리한 단계입니다.

## 구현 포인트

### 1. 마지막 수에서는 full generic move path 대신 count-only를 먼저 쓴다

기존 specialized exact tail도 generic path보다는 가벼웠지만,
마지막 수 근처에서는 여전히 아래 비용이 남아 있었습니다.

- remaining empty bitset을 다시 index 배열로 펼치기
- leaf score를 위해 disk diff를 재계산하기
- full flip bitboard를 materialize한 뒤 count를 다시 구하기

Stage 200 path는 이 중 가장 싼 경로를 먼저 택합니다.

- 1-empty legal/pass leaf: `computeFlipCountAtIndex()` 기반 count-only 처리
- 2~4 empties recursion: 필요할 때만 `computeFlipsAtIndex()`로 full flips materialize
- terminal leaf: carried `diskDiff`로 즉시 score 계산

즉 핵심은 “마지막 수 근처에서 **필요한 만큼만 계산한다**”는 것입니다.

### 2. WLD bucket은 control로만 확인한다

이번 후보는 exact-tail 전용이므로,
채택 판단은 exact root 성능에 두고 WLD bucket은 **non-regression control**로만 봤습니다.

그래서 benchmark도 아래처럼 나눴습니다.

- **directOneEmptyMicro**
  - specialized last-flip path 자체의 direct tail overhead 확인
- **exact10 / exact12**
  - 실제 exact-root throughput과 parity 확인
- **wld12**
  - WLD bucket 비침범 / non-regression control

## 검증

직접 확인한 항목은 아래와 같습니다.

- `node js/test/stage200_specialized_few_empties_last_flip_path_smoke.mjs`
- `node js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`
- `node js/test/stage199_few_empties_wld_tail_bundle_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

문서 반영 후에는 아래도 다시 통과시켰습니다.

- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

최종 기본값은 아래와 같습니다.

- `specializedFewEmptiesLastFlipPath = true`

## benchmark 방법

최종 판정은 아래 JSON 기준으로 정리했습니다.

- `benchmarks/stage200_specialized_few_empties_last_flip_path_benchmark_20260422.json`

구성은 아래와 같습니다.

- direct 1-empty exact micro
- exact root search `10 / 12` empties
- WLD root control `12` empties
- baseline/candidate interleaved sampling
- parity는 best move / score / mode / nodes 기준으로 확인

ratio는 **candidate / baseline elapsed** 이므로,
**1보다 작을수록 candidate가 빠릅니다.**

## benchmark 요약

### direct micro

- direct 1-empty exact micro: **`0.507x`**

즉 마지막 수 direct micro에서는 candidate가 baseline보다 확실히 빨랐습니다.

### exact / WLD root

- `exact10`: **`0.957x`**
  - nodes: **`1.000x`**
- `exact12`: **`0.944x`**
  - nodes: **`1.000x`**
- `wld12` control: **`0.995x`**
  - nodes: **`1.000x`**

best move / score / mode / nodes parity는 전 section에서 유지됐습니다.

## 해석

1. **direct tail 자체가 실제로 가벼워졌다**
   - direct 1-empty micro가 `0.507x`였으므로,
     마지막 수 처리 경로의 비용이 의미 있게 줄었다고 보는 편이 맞습니다.

2. **exact root에서도 소폭이지만 일관된 이득이 났다**
   - `exact10 0.957x`
   - `exact12 0.944x`
   - node parity는 그대로였으므로,
     이번 이득은 탐색 의미론 변화가 아니라 tail 처리 오버헤드 감소에서 왔다고 해석할 수 있습니다.

3. **WLD bucket은 사실상 중립이었다**
   - `wld12 0.995x`, node parity `1.000x`
   - 즉 exact-tail 후보가 WLD lane을 건드려 side effect를 내지는 않았습니다.

4. **Stage 197/199와 성격이 다르다**
   - Stage 197과 Stage 199는 direct micro보다 root search throughput 개선이 더 핵심이었습니다.
   - Stage 200은 반대로,
     **direct tail micro 개선이 정확히 exact root 소폭 개선으로 이어진 cleanup adoption**에 더 가깝습니다.

## 채택 판단

이번 Stage 200은 **채택**으로 정리합니다.

최종 기본값은 아래와 같습니다.

- `specializedFewEmptiesLastFlipPath = true`

해석은 다음처럼 정리하는 것이 가장 정확합니다.

- specialized exact 1~4 empties tail의 마지막 수 처리 오버헤드를 줄였다.
- direct 1-empty micro에서 강한 개선이 확인됐다.
- exact-10 / exact-12 root에서도 node parity를 유지한 채 elapsed가 줄었다.
- WLD bucket에는 유의미한 regression이 없다.

따라서 이 후보는 **few-empties exact tail의 low-risk speedup adoption**으로 채택하는 편이 맞습니다.

## 현재 few-empties 관련 기본값

### exact

- `specializedFewEmptiesExactSolver = true`
- `lightweightFewEmptiesExactMovePath = true`
- `optimizedFewEmptiesExactSolver = true`
- `optimizedFewEmptiesExactSolverEmpties = 8`
- `specializedFewEmptiesLastFlipPath = true`

### WLD

- `optimizedFewEmptiesWldSolver = true`
- `optimizedFewEmptiesWldSolverEmpties = 8`
- `lightweightFewEmptiesWldMovePath = true`

원인 분리용 baseline은 아래처럼 재현할 수 있습니다.

- last-flip path off: `specializedFewEmptiesLastFlipPath: false`
- Stage 197 exact-tail baseline: `lightweightFewEmptiesExactMovePath: false`
- Stage 199 WLD-tail baseline: `optimizedFewEmptiesWldSolver: false`, `lightweightFewEmptiesWldMovePath: false`
