# Stage 197 - lightweight few-empties exact move path and threshold-8 revalidation

## 이번 단계에서 한 일

이번 단계는 Stage 192 closeout과 Stage 183 후보군에서 다음 우선순위로 남아 있던
**5~8 empties exact-tail 경량 경로**를 실제 코드에 넣고,
그 위에서 `optimizedFewEmptiesExactSolverEmpties = 8` 기본값 재승격이 가능한지도 함께 다시 검증한 작업입니다.

구체적으로는 아래를 적용했습니다.

1. **5~8 empties lightweight exact-tail move path 추가**
   - `js/ai/search-engine.js`에 exact-tail 전용 reusable slot/buffer를 추가했습니다.
   - slot에는 `index`, `nextPlayerBoard`, `nextOpponentBoard`, `remainingEmptyBits`, `orderingScore`, `opponentMoveCount`만 저장합니다.
   - 기존 `generateFewEmptiesExactMoves()`처럼 매 노드마다 move object 배열을 새로 만들지 않고, empties bucket별 fixed slot buffer를 재사용합니다.

2. **`solveSmallExactBoards()` dispatch 확장**
   - 기존 specialized `1~4` empties direct solver 뒤에,
     `5~8` empties에서 경량 reusable path로 바로 들어가는 분기(`solveLightweightFewEmptiesExactBoards`)를 추가했습니다.
   - baseline 재현은 `lightweightFewEmptiesExactMovePath: false`로 계속 가능합니다.

3. **exact fastest-first ordering semantics 유지**
   - lightweight path도 기존 few-empties exact tail이 쓰던 reply-count ordering 의미론을 그대로 유지합니다.
   - opponent reply count를 계산해 same ordering key를 만들고, insertion ordering으로 정렬 우선순위를 보존했습니다.

4. **기본 옵션 승격 준비**
   - `SearchEngine` 옵션에 `lightweightFewEmptiesExactMovePath`를 추가했고 기본값은 `true`로 연결했습니다.
   - threshold 재검증이 끝난 뒤 `DEFAULT_OPTIMIZED_FEW_EMPTIES_EXACT_SOLVER_EMPTIES`를 `6 -> 8`로 올렸습니다.

5. **벤치/회귀용 telemetry 확장**
   - `js/test/benchmark-helpers.mjs`와 engine stats에
     `lightweightFewEmpties5~8Calls` 카운터를 추가했습니다.
   - `js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`를 새로 추가해
     direct 8 empties / exact 10 empties / WLD regression parity와 기본 옵션을 고정했습니다.

## 왜 이 후보를 지금 넣었는가

Stage 195~196에서 prepared-search-move hotpath는 이미 아래까지 정리된 상태였습니다.

- eager/lazy prepared move builder
- per-ply reusable prepared buffer
- selective lazy flip materialization
- tokenized prepared core

즉 search midgame hotpath는 일단 한 차례 닫았고,
다음 남은 고확률 후보는 Stage 192 closeout에서 적어 둔 대로
**exact-tail 5~8 empties lighter path** 쪽이었습니다.

또 Stage 84에서는 `optimizedFewEmptiesExactSolverEmpties = 8`이 그 당시에는 일반 workload에서 충분히 안정적이지 않아 보류됐지만,
이번에는 exact-tail 자체가 더 가벼워졌기 때문에 **threshold 8 재검증까지 한 묶음으로 보는 편이 자연스러웠습니다.**

## 구현 포인트

### 1. object-heavy exact-tail 대신 slot buffer 재사용

기존 few-empties exact tail은 합법수마다 move-like record를 만들고 정렬용 metadata도 그 object 위에 얹는 구조였습니다.
이번 Stage 197에서는 exact recursion에 정말 필요한 값만 남긴 slot을 고정 길이 배열로 재사용하도록 바꿨습니다.

핵심 의도는 다음 둘입니다.

- 5~8 empties late recursion에서 allocation / shape churn 줄이기
- exact tail window를 8까지 다시 넓혀도 object bridge 비용이 크게 늘지 않게 만들기

### 2. direct micro와 exact-root workload를 분리해서 해석

이번 후보는 direct `solveSmallExact()` micro 하나만 보면 손해가 날 수도 있습니다.
왜냐하면 lightweight path는 ordering metadata와 reply-count를 먼저 채워 exact-root 전체 node를 줄이려는 성격이 강하고,
direct micro는 그 이득을 상위 exact search에서 되돌려 받지 못하기 때문입니다.

그래서 채택 판단도 두 층으로 나눴습니다.

- **primary benchmark**: legacy exact-tail threshold-6 baseline vs lightweight exact-tail + threshold-8 candidate
- **threshold-only revalidation**: lightweight path를 켠 상태에서 threshold `6 -> 8`만 따로 비교

즉 이번 Stage의 핵심 평가는 small exact solver 단독 micro보다
**exact root에서 실제로 시간이 줄고 node가 줄어드는지**를 기준으로 했습니다.

## 검증

직접 확인한 항목은 다음과 같습니다.

- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`
- `node js/test/perft.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

최종 기본값(`lightweightFewEmptiesExactMovePath = true`, `optimizedFewEmptiesExactSolverEmpties = 8`) 기준으로 모두 통과했습니다.

## primary benchmark

기준 비교선은 아래와 같습니다.

- **baseline**: legacy exact-tail path, threshold `6`
- **candidate**: lightweight exact-tail path, threshold `8`

### 결과 요약

- direct 5~8 empties `solveSmallExact()` micro: **`1.202x`**
- exact 10 empties root: **`0.794x`**
- exact 12 empties root: **`0.981x`**
- WLD 14 empties root: **`0.988x`**

ratio는 candidate / baseline elapsed라서 **1보다 작을수록 빠릅니다.**

parity는 아래를 유지했습니다.

- direct section: score parity, small-solver node parity 전 case 유지
- search section: best move / score / mode parity 전 case 유지

추가로 node 변화는 exact root에서 꽤 크게 줄었습니다.

- exact-10 root nodes: `553 -> 67` (`0.121x`)
- exact-12 root nodes: `3422 -> 724` (`0.212x`)

즉 direct micro만 보면 손해가 있지만,
실제 exact root에서는 **상위 search node 수가 더 크게 줄어 전체 elapsed가 개선**되는 그림이 확인됐습니다.

## threshold-only revalidation

이번에는 lightweight exact-tail path를 둘 다 켠 상태에서,
threshold만 `6 -> 8`로 바꿔 다시 확인했습니다.

- **baseline**: lightweight path on, threshold `6`
- **candidate**: lightweight path on, threshold `8`

### 결과 요약

- exact 10 empties root: **`0.845x`**
- exact 12 empties root: **`0.995x`**
- WLD 14 empties root: **`1.044x`**

여기서 WLD-14는 baseline/candidate 모두 small exact solver usage가 `0`이었고 nodes도 완전히 같았습니다.
따라서 이 구간의 `1.044x`는 threshold 영향이 아니라 timing noise로 해석하는 편이 맞습니다.

즉 threshold 8 재검증의 실질 판단 구간은 exact-10 / exact-12이고,
그 기준으로 보면

- exact-10: 뚜렷한 개선
- exact-12: 사실상 중립

이므로 이번에는 `8`로 넓혀도 된다고 보는 편이 타당했습니다.

## 해석

1. **lightweight exact-tail path는 direct micro win이 아니다**
   - direct 5~8 empties solveSmallExact-only micro는 `1.202x`로 느렸습니다.
   - 즉 이 후보를 “작은 exact solver 단품 가속”으로 이해하면 맞지 않습니다.

2. **하지만 exact root 전체 throughput에는 이득이 난다**
   - exact-10 `0.794x`, exact-12 `0.981x`
   - root nodes도 `553 -> 67`, `3422 -> 724`로 크게 줄었습니다.
   - lightweight path의 ordering / reusable slot 구조가 상위 exact search 전체 비용을 줄여 준다고 보는 편이 맞습니다.

3. **threshold 8은 이번에는 재채택 가능**
   - Stage 84 당시엔 threshold 8이 너무 이르렀지만,
   - Stage 197 lightweight path 위에서는 exact-10에서 robust win, exact-12에서 neutral sign을 보였습니다.
   - 그래서 이번에는 기본 threshold를 `8`로 넓혀도 안전하다고 판단했습니다.

## 채택 판단

이번 Stage 197은 **채택**으로 정리합니다.

정확히는 아래 두 가지를 함께 채택했습니다.

- `lightweightFewEmptiesExactMovePath = true`
- `optimizedFewEmptiesExactSolverEmpties = 8`

단, 성격은 분명히 적어 둡니다.

- 이것은 direct small-exact micro 자체를 빠르게 만든 Stage는 아닙니다.
- 대신 **exact-root throughput / node reduction** 쪽에서 의미 있는 개선을 확인한 Stage입니다.
- 따라서 해석도 “5~8 empties lightweight exact-tail adoption + threshold-8 revalidation success”가 가장 정확합니다.

## 현재 기본값

현재 exact-tail 관련 기본값은 다음과 같습니다.

- `specializedFewEmptiesExactSolver = true`
- `lightweightFewEmptiesExactMovePath = true`
- `optimizedFewEmptiesExactSolver = true`
- `optimizedFewEmptiesExactSolverEmpties = 8`
- `exactFastestFirstOrdering = true`

원인 분리용 baseline은 아래처럼 재현할 수 있습니다.

- lightweight path만 끄기: `lightweightFewEmptiesExactMovePath: false`
- threshold만 되돌리기: `optimizedFewEmptiesExactSolverEmpties: 6`

## 다음 후보

이번 Stage 이후 남는 우선순위는 다시 search move / flip token 정리 쪽입니다.

1. **fuller `C20` compact flip token**
   - Stage 196은 minimal tokenized prepared core까지만 했습니다.
   - 실제 flip bitboard를 더 compact하게 다루는 단계는 아직 남아 있습니다.

2. **`C05 / C26`의 더 깊은 canonical/lazy 정리**
   - prepared-search-move hotpath는 많이 정리됐지만,
   - TT/PV-first move materialize 범위를 더 공격적으로 줄일 여지는 남아 있습니다.

3. **apply/undo 쪽의 더 공격적인 low-overhead path (`C06`)**
   - exact-tail과 prepared move core가 어느 정도 정리된 뒤에는
   - flip representation과 apply/undo cost를 같이 줄이는 묶음이 다음 자연스러운 후보입니다.
