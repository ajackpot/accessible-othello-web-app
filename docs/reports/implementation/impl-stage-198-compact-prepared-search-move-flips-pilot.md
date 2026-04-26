# Stage 198 - compact prepared-search-move flips pilot (not adopted)

## 이번 단계에서 한 일

이번 단계는 Stage 197 exact-tail 채택 이후 다음 고확률 후보로 남아 있던
**compact prepared-search-move flip token + token-first apply path**를
실제 런타임에 연결하고, 기본값 승격이 가능한지 balanced benchmark로 판정한 작업입니다.

구체적으로는 아래를 적용했습니다.

1. **prepared move token에 directional flip count 압축 저장**
   - `js/core/rules.js`에 prepared move token용 compact directional flip-count encoding을 추가했습니다.
   - eager prepared lane에서는 더 이상 `flips` BigInt를 반드시 record에 들고 있을 필요가 없고,
     token 안의 move index / flipCount / 방향별 prefix flip count만으로 apply가 가능해졌습니다.

2. **token-first apply 경로 연결**
   - `js/core/game-state.js`의 `applyMoveFast()`가 bigint flips뿐 아니라 prepared move token도 직접 받을 수 있게 했습니다.
   - `js/ai/search-engine.js`는 compact token 모드일 때 materialized bigint flipboard 대신 token을 그대로 전달합니다.

3. **legacy bigint fallback 유지**
   - baseline 재현을 위해 기존 bigint flip storage는 그대로 남겼습니다.
   - 비교 옵션은 `compactPreparedSearchMoveFlips: false`(baseline) vs `true`(candidate)로 단순화했습니다.

4. **prepared move listing / materialization plumbing 확장**
   - prepared move builder, reusable prepared buffer, lazy materialization helper가 모두 flip storage variant를 받도록 정리했습니다.
   - Stage 195~196에서 정리한 reusable buffer + lazy prepared move path와 호환되게 연결했습니다.

5. **회귀/벤치 harness 추가**
   - `js/test/stage198_compact_prepared_search_move_flips_smoke.mjs`를 새로 추가했습니다.
   - `tools/benchmark/run-stage198-compact-prepared-search-move-flips-benchmark-balanced.mjs`와
     execution cap 회피용 `tools/benchmark/run-stage198-compact-prepared-search-move-flips-section.mjs`를 추가했습니다.

## 왜 이 후보를 지금 골랐는가

Stage 195~196에서는 prepared-search-move hotpath가 아래까지 이미 정리된 상태였습니다.

- eager/lazy prepared builder
- per-ply reusable prepared buffer
- selective lazy flip materialization
- tokenized prepared core

Stage 197에서는 exact-tail 5~8 empties 경량 경로를 먼저 닫았습니다.
그 다음 자연스러운 후보는 Stage 183 / Stage 192 closeout에서 남겨 둔 대로,
**prepared move record 안에 아직 남아 있던 flip representation을 더 compact하게 줄이고 apply 브리지 비용을 함께 줄이는 단계**였습니다.

즉 이번 Stage 198은 Stage 196 minimal tokenized core의 다음 수순인
**fuller `C20` compact flip-token pilot**으로 보는 것이 가장 정확합니다.

## 구현 포인트

### 1. 32-bit bitwise packing 대신 arithmetic-safe token packing

prepared move token은 방향별 flip count를 몇 비트씩 나눠 담는 구조이므로,
JS의 32-bit signed bitwise 연산에 기대면 확장 시 부호/overflow 관리가 까다로워집니다.
이번 Stage에서는 token packing을 Number 기반 산술 multipliers로 정리해,
`index + flipCount + directional prefix counts`를 안정적으로 encode/decode하도록 바꿨습니다.

### 2. flipboard materialization을 apply 직전까지 미루는 것이 아니라, 가능하면 건너뛰기

기존 lazy path는 `flips` BigInt materialization을 늦추는 수준이었습니다.
이번 compact token 경로는 한 단계 더 나아가,
**apply가 prefix mask를 통해 직접 뒤집기를 재구성**할 수 있을 때는
아예 BigInt flipboard를 만들지 않도록 연결했습니다.

### 3. default adoption은 benchmark로만 결정

이번 후보는 semantics를 깨기 쉬운 부분이라,
구현 직후부터 기본값 승격을 가정하지 않고 아래 순서로만 판정했습니다.

- smoke parity
- perft
- balanced split benchmark
- default on/off 결정

즉 “구현 성공”과 “기본값 채택”을 명확히 분리했습니다.

## 검증

직접 통과를 확인한 항목은 아래와 같습니다.

- `node js/test/stage122_allocation_light_search_moves_smoke.mjs`
- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`
- `node js/test/stage198_compact_prepared_search_move_flips_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

문서 반영 후에는 아래도 다시 통과시켰습니다.

- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

최종 기본값은 **`compactPreparedSearchMoveFlips = false`** 입니다.

## benchmark 방법

원래는 full balanced runner를 한 번에 돌리려 했지만,
실행 환경 cap 때문에 전체 job이 안정적으로 끝나지 않았습니다.
그래서 최종 판정은 아래 방법으로 했습니다.

- per-state warm-up
- baseline/candidate interleaved sampling
- micro / depth24 / depth20 / WLD14 / exact10을 section별 split 실행
- 마지막에 JSON summary로 합산

즉 결과 파일의 methodology는
`balanced_interleaved_with_per_state_warmup_split_sections` 입니다.

## benchmark 요약

ratio는 **candidate / baseline elapsed** 이므로,
**1보다 작을수록 candidate가 빠릅니다.**

- prepared move micro eager: **`1.099x`**
- lazy materialize/apply micro: **`1.221x`**
- depth-limited 24 empties d6: **`1.010x`**
- depth-limited 20 empties d7: **`1.007x`**
- WLD 14 empties: **`1.031x`**
- exact 10 empties: **`1.012x`**

search parity는 전 section에서 아래를 유지했습니다.

- identical best move
- identical score
- identical mode
- identical nodes

즉 이번 후보는 **의미론 보존과 nodes parity는 깔끔하게 유지했지만,
elapsed throughput에서는 거의 전 구간에서 미세 열세**였습니다.

## 해석

1. **compact flip token 자체는 동작한다**
   - smoke / perft / search parity가 모두 유지됐습니다.
   - apply path도 token-first 경로로 안전하게 연결됐습니다.

2. **하지만 이 저장 방식이 현재 JS 런타임에서는 더 싸지 않았다**
   - eager builder micro와 lazy apply micro가 둘 다 baseline보다 느렸습니다.
   - search bucket도 depth24 / depth20 / WLD14 / exact10 전부 개선 신호가 아니라 소폭 열세였습니다.

3. **nodes parity가 유지됐다는 점은 원인 해석을 단순하게 만든다**
   - 탐색 의미론 자체가 바뀌어서 시간이 늘어난 것이 아닙니다.
   - 거의 전적으로 representation / decode / apply 비용 때문이라고 보는 편이 맞습니다.

4. **다음 후보를 고를 때는 이 경로를 top priority에서 내리는 편이 맞다**
   - compact flip token은 groundwork로는 의미가 있지만,
     지금 상태로 기본값을 밀어붙일 강한 성능 근거가 없습니다.
   - 따라서 이후 순서는 다른 canonical/lazy 정리나 apply/undo low-overhead 후보를 먼저 보는 편이 낫습니다.

## 채택 판단

이번 Stage 198은 **구현 완료 + benchmark 완료 + 기본값 비채택**으로 정리합니다.

정확히는 아래처럼 정리하는 것이 맞습니다.

- **채택한 것**: compact prepared flip-token path를 런타임/도구/회귀셋에 남겨 실험 가능하게 만든 것
- **채택하지 않은 것**: `compactPreparedSearchMoveFlips = true` 기본값 승격

즉 이 Stage의 결론은
**"pilot implemented, parity preserved, but default adoption rejected"** 입니다.

## 현재 기본값과 비교선

현재 allocation-light prepared move 계열 기본값은 아래와 같습니다.

- `allocationLightSearchMoves = true`
- `reusablePreparedSearchMoveBuffers = true`
- `lazyPreparedSearchMoves = true`
- `tokenizedPreparedSearchMoveCore = true`
- `compactPreparedSearchMoveFlips = false`

원인 분리용 비교선은 아래처럼 재현할 수 있습니다.

- compact flip-token path 활성화: `compactPreparedSearchMoveFlips: true`
- legacy bigint prepared flips 유지: `compactPreparedSearchMoveFlips: false`

## 다음 후보 메모

이번 Stage로 compact prepared flip-token pilot은 우선순위 최상단에서 일단 내려도 됩니다.
다음 자연스러운 후보는 아래 둘 중 하나로 보는 편이 맞습니다.

1. **`C05 / C26` 계열의 더 깊은 canonical/lazy cleanup**
   - prepared move / TT / PV-first materialize 범위를 더 줄이는 방향

2. **`C06` apply/undo low-overhead path**
   - representation을 더 바꾸기보다 apply/undo 자체의 비용 구조를 낮추는 방향

즉 Stage 198은 “candidate를 없앤 단계”가 아니라,
**compact flip-token path를 수치로 판정해 top-priority queue에서 내린 단계**로 기록합니다.
