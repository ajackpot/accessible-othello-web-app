# Stage 204 - phase2 closeout, candidate refresh, refactor, and version sync

## 이번 단계에서 한 일

Stage 192에서 남겨 둔 **candidate remainder map**을 2차 도입 결과까지 다시 정리하고,
현재 코드에 쌓여 있던 Stage 195~203 변경분을 **리팩토링 + 회귀 보호 + 문서/버전 동기화**까지 한 번에 마감했습니다.

이번 Stage에서 실제로 수행한 작업은 아래 네 묶음입니다.

1. **Stage 192 후보 상태표를 2차 결과까지 갱신**
   - Stage 195, 196, 197, 199, 200, 201, 202에서 기본값 채택된 후보와,
     Stage 198, 203에서 **구현은 했지만 no-adoption으로 남긴 후보**를 Stage 183의 26개 후보 맥락으로 다시 매핑했습니다.
   - 특히 `C04/C05/C20/C26` move-flow family와 `C16~C19` few-empties family가 어디까지 실제 기본 경로로 들어왔는지,
     그리고 어디에서 아직 멈춰 있는지 다시 분리했습니다.

2. **영향이 아직 충분히 퍼지지 못한 legacy / 미착수 지점 정리**
   - Stage 192 중간 감사에서 지적했던
     `GameState.applyMoveFast()` / `passTurnFast()`의 per-node state allocation,
     `buildLegalMoveRecords()` / `listLegalMoveDetails()` object bridge,
     `bitsToIndices()` / `flippedIndices` 확장,
     pattern-bank detail/fallback path,
     line-table + dual-representation family(`C09/C10/C11/C13/C23`)를
     **phase2 바깥에 남은 지점**으로 다시 명시했습니다.

3. **적용된 코드에 대한 리팩토링**
   - `js/ai/search-engine.js`에
     - `DEFAULT_SEARCH_MOVE_PATH_RUNTIME_OPTIONS`
     - `DEFAULT_FEW_EMPTIES_EXACT_RUNTIME_OPTIONS`
     - `DEFAULT_FEW_EMPTIES_WLD_RUNTIME_OPTIONS`
     - `getSearchRuntimeDefaultConfig()`
     를 추가해, 현재 search/tail 기본값 authority를 문서와 smoke가 같은 소스에서 참조할 수 있게 했습니다.
   - exact/WLD few-empties lightweight path에 중복되어 있던 move-buffer build / reply-count fastest-first gate / insertion sort 로직을
     `populateFewEmptiesMoveBuffer()` 공용 helper로 합쳐,
     Stage 197/199/201/202에서 누적된 tail code duplication을 줄였습니다.

4. **회귀 보호와 버전 동기화**
   - `js/test/stage204_phase2_runtime_closeout_smoke.mjs`를 추가해,
     현재 채택된 search move path / exact tail / WLD tail 기본값과 override 의미론을 고정했습니다.
   - `stage-info.json`, `README.md`, `docs/runtime-ai-reference.md`,
     `docs/reports/checklists/ai-implementation-checklist.md`,
     generated inventory를 **Stage 204 기준**으로 다시 맞췄습니다.

## phase2에서 실제로 채택된 것 / 보류된 것

현재 이 저장소 트리에서 phase2 결과로 보는 것이 맞는 것은 아래와 같습니다.

### 1. 기본값 채택으로 끝난 묶음

- **Stage 195**: reusable prepared buffer + selective lazy prepared move path forward-port
- **Stage 196**: tokenized prepared search-move core
- **Stage 197**: lightweight exact-tail move path + exact threshold `8` 재승격
- **Stage 199**: few-empties WLD tail bundle
- **Stage 200**: specialized few-empties exact last-flip path
- **Stage 201**: few-empties exact fastest-first selective gate
- **Stage 202**: few-empties WLD last-flip path + WLD selective gate

즉 phase2 채택의 중심은 크게 두 축입니다.

1. **search move path 경량화**
   - reusable prepared buffer
   - lazy materialization
   - tokenized prepared core

2. **few-empties exact / WLD tail 정리**
   - exact threshold `8`
   - WLD threshold `8`
   - exact/WLD 각각의 last-flip / selective gate 정리

### 2. 구현은 했지만 no-adoption으로 남긴 묶음

- **Stage 198**: compact prepared flip token / token-first apply pilot
- **Stage 203**: TT-first deferred move-list build + low-overhead child-state factory revalidation

두 Stage 모두 parity는 유지했지만,
aggregate elapsed에서 neutral-to-negative 쪽이 반복되어
**기능은 남기되 기본값은 올리지 않는 experimental opt-in**으로 정리했습니다.

## Stage 183의 26개 후보 상태 맵 - Stage 204 refresh

아래 표는 Stage 192의 상태 맵을 **phase2 결과까지 반영해 다시 쓴 최종 refresh**입니다.

| ID | Stage 204 상태 | 정리 |
| --- | --- | --- |
| C01 | 채택 | hardcoded axis-wise legal-move kernel은 `prefix-bidirectional` 기본 경로로 반영됨 |
| C02 | 채택 | 양방향 동시 확장 흐름이 현재 mobility kernel의 중심 구조로 남음 |
| C03 | 채택 | mask-first flippable-opponent 흐름이 현재 prefix kernel에 반영됨 |
| C04 | 부분 채택 | legal-only / flip-materialize 분리는 Stage 195 lazy prepared path로 더 진전됐지만, TT/PV-first full deferred 기본 경로까지는 가지 않음 |
| C05 | 부분 채택 | Stage 196의 tokenized prepared core로 move record 최소화는 진전됐지만, canonical `Flip {pos, flip}` + thin apply path까지 완결되진 않음 |
| C06 | 미도입 | flip-bitboard 중심 XOR+swap apply/undo stack은 여전히 기본 경로에 없음 |
| C07 | 채택 | Stage 195에서 per-ply reusable prepared buffer, Stage 197/199에서 few-empties reusable slots까지 기본 경로로 들어옴 |
| C08 | 채택 | neighbor precheck는 현재 flip kernel의 기본 일부 |
| C09 | 보류 | row-table / line-table flip family는 representation bridge 비용 때문에 계속 보류 |
| C10 | 미도입 | OUTFLANK + FLIP 2단계 table family는 아직 기본 경로나 실험 경로로도 들어오지 않음 |
| C11 | 보류 | line-to-board 재확장 table도 line-table family와 함께 멈춰 있음 |
| C12 | 채택 | per-square metadata / ray-between cache가 현재 flip kernel의 기본 일부 |
| C13 | 부분 채택 | flip kernel line-packing 자체는 미도입이지만, pack/extract 계열 발상은 pattern-bank packed lookup과 prepared token 쪽에서 부분 반영됨 |
| C14 | 부분 채택 | mobility / flip / prepared-move core / flip-storage variant가 존재하지만, generic+typed-array+wasm family 병렬 운영까지는 아님 |
| C15 | 부분 채택 | line-table 기반 flipCount-only는 아니지만, Stage 195 lazy materialization과 Stage 200 last-flip path로 **flipCount-only 소비 경로**는 기본에 들어옴 |
| C16 | 채택 | 1-empty last-flip exact path는 Stage 200까지 포함해 기본 exact tail에 확실히 반영됨 |
| C17 | 채택 | 2-empty direct-check path 유지 |
| C18 | 채택 | 3-empty direct-check + ordering 특화 path 유지 |
| C19 | 채택 | 4-empty direct-check / priority path 유지 |
| C20 | 부분 채택 | Stage 196 tokenized move core는 채택됐지만, Stage 198 compact flip token은 no-adoption으로 남음 |
| C21 | 미도입 | approximate mobility helper는 아직 ordering/runtime 기본 경로에 없음 |
| C22 | 부분 채택 | `rules` / `pattern-bank` / `search-engine` 경계는 더 분명해졌지만, mobility/flip/last_flip/board 완전 분리 구조는 아직 아님 |
| C23 | 미도입 | generic pack + typed-array pack + wasm pack 병렬 유지 구조는 아직 시작하지 않음 |
| C24 | 채택 | perft / benchmark / parity audit 기반 채택 절차는 완전히 정착 |
| C25 | 부분 채택 | immediate wipeout / special-ending fast path는 유지되지만, legal generation 직후의 더 일반적인 fast-decision path까지는 확장되지 않음 |
| C26 | 보류 | Stage 195의 selective lazy path와 Stage 203의 TT-first deferred pilot로 진입은 했지만, 원래 의도한 TT/PV-first lazy path는 기본 채택에 실패 |

## 아직 후보들의 영향력이 충분히 미치지 못한 지점

Stage 192가 지적했던 “새 hotpath 최적화의 이득이 아직 덜 퍼진 지점”은
phase2 이후에도 몇 군데가 그대로 남아 있습니다.

### 1. `GameState.applyMoveFast()` / `passTurnFast()`의 per-node state allocation

규칙 커널과 few-empties tail은 많이 가벼워졌지만,
midgame search는 여전히 child `GameState`를 자주 새로 만듭니다.

Stage 203의 `lowOverheadSearchChildStateFactory`가 바로 이 지점을 겨냥한 companion candidate였지만,
깊은 classic lane 일부를 제외하면 aggregate throughput 이득이 안정적이지 않았습니다.

즉 이 lane은
**작업은 시작했지만 phase2에서는 마감하지 못한 stalled zone**입니다.

### 2. `buildLegalMoveRecords()` / `listLegalMoveDetails()` object bridge

search core 안에서는 prepared move/tokenized core가 많이 정리됐지만,
UI/detail/search-adjacent path는 여전히 `{ index, bit, flips, ... }` 객체 배열 확장 비용이 남아 있습니다.

즉 **bitboard/token core → rich object bridge**가 아직 남은 비용입니다.

### 3. `bitsToIndices()` / `flippedIndices` / detail expansion

few-empties와 search move path는 가벼워졌지만,
설명용 또는 detail capture 경로는 여전히 index array 확장 비용을 냅니다.

이 부분은 phase2의 채택 후보들이 직접 겨냥한 대상이 아니었고,
그래서 **영향이 아직 거의 닿지 않은 지점**에 가깝습니다.

### 4. pattern-bank detail / fallback path

Stage 190의 packed lookup scorer는 runtime evaluator에 큰 이득을 줬지만,
설명용 detail capture나 fallback path는 여전히 legacy `patternIndexForPerspectiveBoardsBits()` 계열을 더 많이 탑니다.

즉 scorer mainline은 이미 닫혔지만,
**detail/fallback 잔재 cleanup은 아직 미시작**으로 보는 편이 맞습니다.

### 5. line-table / dual-representation family (`C09/C10/C11/C13/C23`)

이 family는 phase2에서도 여전히 손대지 못했습니다.
이유는 거의 명확합니다.

- line pack/extract
- line byte → board mask 재확장
- BigInt board 표현과 table lookup 표현 사이의 bridge

즉 이 family의 문제는 **entry-flow 부족**보다 **representation mismatch**에 가깝습니다.
그래서 다시 볼 때는 search flow를 조금 더 다듬는 식이 아니라,
처음부터 **typed-array shadow board / dual representation / wasm pack** 같은 더 큰 표현 계층으로 가야 합니다.

### 6. move-flow closure의 마지막 남은 조각 (`C04/C05/C20/C26`)

phase2에서 이 family는 많이 전진했습니다.

- lazy prepared path 채택
- tokenized prepared core 채택
- compact flip token pilot 구현
- TT-first deferred build pilot 구현

하지만 아래는 아직 남았습니다.

- TT/PV-first deferred move-list build default adoption
- compact flip token default adoption
- token-first apply path default adoption
- canonical move type을 apply/child-state까지 완전히 밀어 넣는 정리

즉 이 묶음은 **phase2에서 가장 많이 전진했지만, 동시에 가장 또렷하게 unfinished 상태로 남은 family**입니다.

### 7. `C21` approximate mobility helper와 `C25` post-legal fast decision

둘 다 구조적 search 지원 후보였지만,
phase2에서는 exact/WLD tail과 prepared move path 우선순위가 높아 거의 손대지 못했습니다.

- `C21`: 사실상 미착수
- `C25`: existing immediate wipeout / special-ending 범위를 넓히는 방향만 부분 유지

## 이번 Stage의 리팩토링 포인트

### 1. search/tail 기본값 authority를 exported bundle로 고정

Stage 195~203 사이에는 아래 기본값이 누적됐습니다.

- search move path
  - `allocationLightSearchMoves`
  - `reusablePreparedSearchMoveBuffers`
  - `lazyPreparedSearchMoves`
  - `tokenizedPreparedSearchMoveCore`
  - `compactPreparedSearchMoveFlips`
  - `ttFirstDeferredMoveListBuild`
  - `lowOverheadSearchChildStateFactory`
- exact tail
  - `optimizedFewEmptiesExactSolver*`
  - `lightweightFewEmptiesExactMovePath`
  - `specializedFewEmptiesLastFlipPath`
  - `fewEmptiesExactFastestFirstSelectiveGate`
- WLD tail
  - `optimizedFewEmptiesWldSolver*`
  - `lightweightFewEmptiesWldMovePath`
  - `specializedFewEmptiesWldLastFlipPath`
  - `fewEmptiesWldFastestFirstSelectiveGate`

이 값들이 생성자 내부에 흩어져 있으면,
문서/회귀/smoke가 drift하기 쉽습니다.

그래서 이번 Stage에서는 아래를 추가했습니다.

- `DEFAULT_SEARCH_MOVE_PATH_RUNTIME_OPTIONS`
- `DEFAULT_FEW_EMPTIES_EXACT_RUNTIME_OPTIONS`
- `DEFAULT_FEW_EMPTIES_WLD_RUNTIME_OPTIONS`
- `getSearchRuntimeDefaultConfig()`

이제 Stage 204 이후의 smoke/documentation은
이 helper를 그대로 authority로 참조할 수 있습니다.

### 2. few-empties exact/WLD lightweight path의 중복 제거

Stage 197 / 199 / 201 / 202를 거치며,
exact/WLD lightweight tail은 거의 같은 구조를 두 번 들고 있게 됐습니다.

- move buffer build
- reply-count fastest-first eligibility
- selective gate
- insertion sort

이번 Stage에서는 이를 `populateFewEmptiesMoveBuffer()`로 합쳐,
mode별 차이는 stat key / gate callback만 넘기도록 정리했습니다.

즉 phase2에서 채택된 tail bundle을 **기능 변경 없이 유지보수 가능한 형태로 다듬는 refactor**가 이번 Stage의 핵심입니다.

## 검증

이번 Stage에서 직접 다시 통과시킨 것은 아래입니다.

- `node js/test/stage204_phase2_runtime_closeout_smoke.mjs`
- `node js/test/stage203_tt_first_deferred_move_list_build_smoke.mjs`
- `node js/test/stage202_few_empties_wld_tail_refinement_bundle_smoke.mjs`
- `node js/test/stage201_few_empties_exact_fastest_first_selective_gate_smoke.mjs`
- `node js/test/stage200_specialized_few_empties_last_flip_path_smoke.mjs`
- `node js/test/stage199_few_empties_wld_tail_bundle_smoke.mjs`
- `node js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`
- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

문서 반영 후에는 아래도 다시 통과시켰습니다.

- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

## 최종 정리

Stage 204는 **새 런타임 최적화를 억지로 더 넣는 단계가 아니었습니다.**
그 대신 아래 세 가지를 확정한 closeout 단계입니다.

1. Stage 192의 candidate remainder map을 phase2 결과까지 갱신했다.
2. phase2에서 채택된 search/tail 코드를 중복 제거 + default authority helper로 정리했다.
3. Stage/version 문서를 현재 코드 기준으로 다시 잠갔다.

즉 이번 Stage의 핵심 산출물은

- **phase2 채택/보류/미착수 refresh map**,
- **few-empties / search-default refactor**,
- **stage204 version sync**

입니다.
