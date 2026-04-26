# Stage 195 - prepared search move hotpath forward-port, reusable buffer, selective lazy materialization

## 이번 단계에서 한 일

이번 단계는 Stage 183 후보군 중에서 **난이도 대비 리턴이 가장 클 가능성이 높은 search-side move/flip 경량화 묶음**을
현재 첨부 소스 스냅샷에 다시 forward-port하는 작업이었습니다.

중요한 전제부터 적어 두면, 이번 세션에서 받은 ZIP은 실제 코드 기준으로는 **Stage 192 snapshot**이었고,
이전 세션에서 보고만 남아 있던 Stage 193/194 source change가 첨부본에는 들어 있지 않았습니다.
그래서 이번 단계는 “그 다음 후보”를 Stage 192 위에서 바로 새로 구현하되,
세션상의 연속성은 유지하기 위해 **Stage 195**로 기록했습니다.

구체적으로는 아래를 적용했습니다.

1. **`js/core/rules.js` prepared move family 확장**
   - `listPreparedSearchMoves()`가 `eager/lazy` 옵션을 받도록 확장했습니다.
   - `createPreparedSearchMoveBuffer()` / `listPreparedSearchMovesIntoBuffer()`를 추가해 **재사용 가능한 prepared move buffer**를 만들 수 있게 했습니다.
   - `materializePreparedSearchMoveFlipCount()` / `materializePreparedSearchMove()`를 추가해,
     `flipCount`만 먼저 쓰고 실제 `flips`는 필요할 때만 materialize할 수 있게 했습니다.

2. **`js/ai/search-engine.js` classic search 연결**
   - `reusablePreparedSearchMoveBuffers`, `lazyPreparedSearchMoves` 옵션을 추가했고 둘 다 기본값은 `true`입니다.
   - per-ply reusable buffer를 붙여 search hotpath의 array/object churn을 줄였습니다.
   - 같은 ply 재진입 위험이 있는 MPC / ordering probe helper search에서는 reusable buffer를 자동으로 끄도록 정리했습니다.
   - lazy path는 모든 lane에 무조건 켜지지 않고,
     `shouldPrecomputeOrderingOutcome()`이 `false`인 **non-precompute classic-search lane**에서만 켜지게 했습니다.

3. **hotpath 보조 정리**
   - `applyPreparedMoveFast()`를 추가해 lazy prepared move에서도 `applyMoveFast()` 직전까지 `flips` materialization을 미룰 수 있게 했습니다.
   - immediate wipeout 판단은 `flipCount`만으로도 성립하도록 정리해,
     full `flips`를 만들지 않아도 되는 경로를 늘렸습니다.
   - ordering / shallow probe / negamax / WLD negamax의 prepared move 사용 지점을 새 helper로 연결했습니다.

4. **회귀 보호**
   - `js/test/stage195_lazy_prepared_search_moves_smoke.mjs`를 추가했습니다.
   - 기본 옵션(`reusablePreparedSearchMoveBuffers = true`, `lazyPreparedSearchMoves = true`)을 고정했습니다.
   - eager vs lazy prepared builder parity, buffer reuse shape, deep non-precompute lane의 lazy activation, search parity를 함께 검사합니다.

5. **벤치 도구 추가**
   - `tools/benchmark/run-stage195-lazy-prepared-search-moves-benchmark.mjs`
   - `tools/benchmark/run-stage195-lazy-prepared-search-moves-benchmark-balanced.mjs`

   첫 스크립트는 baseline-first / candidate-first control rerun을 모두 재현하기 위한 것이고,
   두 번째 스크립트는 **per-state warm-up + interleaved balanced sampling**으로 order bias를 줄인 채택 판단용 공식 벤치입니다.

## 왜 이 후보를 먼저 넣었는가

Stage 192 mid-state audit 기준으로 search hotpath에서 가장 먼저 손댈 만한 축은
규칙 커널 자체를 다시 뒤집는 것보다,
prepared move record 경로의 object/materialization cost를 더 줄이는 쪽이었습니다.

이번 Stage가 겨냥한 축은 Stage 183 remainder map 기준으로 보면 대체로 아래와 맞닿아 있습니다.

- `C04`: legal bitboard/record를 먼저 만들고 상세 flip은 늦게 materialize
- `C07`: ply-local reusable move buffer
- `C26`: TT/PV/ordering에서 실제 필요할 때만 flip materialize

이 셋은 실제 classic search hotpath에서는 같은 prepared move flow를 공유하므로,
하나만 따로 넣는 것보다 **같이 구현하고, 문제가 생기면 옵션으로 하나씩 꺼서 원인을 분리할 수 있는 구조**를 먼저 만드는 편이 더 자연스럽습니다.

## 구현 포인트

### 1. eager/lazy prepared record를 같은 family 안에 유지

새 타입 계층을 벌리지 않고 기존 prepared move record shape 안에서

- eager: `flips + flipCount` 모두 채움
- lazy: `flipCount`만 채우고 `flips = null`

형태만 갈라서 구현했습니다.

이렇게 하면 기존 ordering metadata cache, ETC prepared child reuse, move consumer들이
shape 차이 때문에 다시 branch를 늘리거나 느려질 가능성을 줄일 수 있습니다.

### 2. lazy path는 non-precompute lane 한정

초반 root나 late exact bucket처럼 child outcome이 거의 즉시 materialize되는 lane에서는
`flips`를 미루는 이득이 작거나, 오히려 재계산 가능성이 생길 수 있습니다.

그래서 이번 Stage의 기본 정책은 다음과 같습니다.

- `allocationLightSearchMoves === false`: 전체 prepared path off
- prepared path on + `lazyPreparedSearchMoves === false`: eager prepared-buffer control
- prepared path on + `lazyPreparedSearchMoves === true`: **non-precompute deeper lane에서만 lazy 활성**

즉 이번 Stage는 search 전 구간을 무조건 lazy로 바꾸는 실험이 아니라,
**의미 있게 이득이 날 가능성이 높은 lane에만 lazy path를 여는 보수적 adoption**입니다.

### 3. reusable buffer는 same-ply reentry helper search에서 자동 비활성

depth-first main search에서는 per-ply buffer 재사용이 자연스럽지만,
MPC / ordering probe처럼 같은 ply에서 임시 helper search가 다시 들어오는 경로에서는
상위 노드의 move array를 덮어쓸 위험이 있습니다.

그래서 reusable buffer는 일반 recursive lane에서만 켜고,
reentry helper search에서는 자동으로 fresh path로 빠지게 했습니다.

## 검증

직접 확인한 항목은 다음과 같습니다.

- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage122_allocation_light_search_moves_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`
- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

모두 통과했습니다.

## 벤치마크와 해석

이번 Stage의 핵심 비교선은 archive baseline 전체가 아니라,
**eager prepared-buffer control**로 잡았습니다.

- baseline/control: `allocationLightSearchMoves = true`, `reusablePreparedSearchMoveBuffers = true`, `lazyPreparedSearchMoves = false`
- candidate: 위와 동일 + `lazyPreparedSearchMoves = true`

즉 이번 Stage의 순수 차이는 **lazy flip materialization의 실제 효과**입니다.

### 1. single-order benchmark

baseline-first 순서로 돌린 첫 벤치 결과는 다음과 같았습니다.

- search-move micro: **`0.404x`**
- depth-limited 24 empties: **`0.954x`**
- depth-limited 20 empties: **`0.952x`**
- WLD 14 empties: **`0.925x`**
- exact 10 empties: **`0.379x`**

여기서 ratio는 candidate / baseline elapsed입니다. 1보다 작을수록 빠릅니다.

### 2. reverse-order control rerun

그런데 candidate-first로 순서를 뒤집은 control rerun에서는 tiny late bucket이 크게 흔들렸습니다.

- search-move micro: **`0.422x`**
- depth-limited 24 empties: **`1.137x`**
- depth-limited 20 empties: **`1.018x`**
- WLD 14 empties: **`1.075x`**
- exact 10 empties: **`2.152x`**

특히 exact-10은 nodes가 완전히 같은데 wall-time만 크게 갈렸기 때문에,
이는 strength 차이보다 **warm-order / startup / tiny bucket timing sensitivity**를 의심하는 편이 맞았습니다.

### 3. balanced benchmark를 채택 판단 기준으로 사용

그래서 최종 채택 판단은 per-state warm-up을 먼저 수행하고,
baseline/candidate를 interleaved order로 섞어 sample을 모은 뒤 median을 고르는
**balanced benchmark**를 기준으로 했습니다.

balanced benchmark 결과는 다음과 같습니다.

- search-move micro: **`0.434x`**
- depth-limited 24 empties: **`1.004x`**
- depth-limited 20 empties: **`0.973x`**
- WLD 14 empties: **`0.983x`**
- exact 10 empties: **`0.988x`**

그리고 모든 section에서 다음 parity가 유지됐습니다.

- best move parity: 전 case 유지
- score parity: 전 case 유지
- mode parity: 전 case 유지
- nodes parity: 전 case 유지

### 해석

1. **micro 단위 prepared builder cost는 확실히 줄어듦**
   - eager builder 대비 lazy builder가 `0.434x`였고,
   - 이는 flip materialization을 늦춘 순수 builder cost 측면의 이득이 분명하다는 뜻입니다.

2. **실제 search에서는 midgame에선 소폭 이득, late bucket은 거의 중립**
   - depth-limited 20 empties에서 `0.973x`, WLD-14 `0.983x`, exact-10 `0.988x`였습니다.
   - depth-limited 24 empties는 `1.004x`로 사실상 중립이었습니다.

3. **warm-order sensitivity를 제거하면 dramatic win은 아니지만, 분명한 손해도 아님**
   - single-order / reverse-order가 late bucket에서 크게 갈린 것은 small exact/WLD bucket의 측정 민감도 문제로 보는 편이 맞고,
   - balanced rerun 기준으로는 전반적으로 **neutral to slightly favorable**입니다.

## 채택 판단

이번 Stage 195는 **채택**으로 정리합니다.

이유는 다음과 같습니다.

- search semantics는 그대로 유지됐고 best move/score/mode/nodes parity가 전 section에서 맞았고,
- balanced benchmark 기준 deeper classic-search midgame에서 소폭 이득이 있으며,
- late exact/WLD bucket은 사실상 중립이고,
- 옵션 경계(`allocationLightSearchMoves: false`, `lazyPreparedSearchMoves: false`)를 남겨 두어 A/B와 원인 분리가 쉽기 때문입니다.

즉 이번 Stage는 “큰 strength jump”라기보다,
**prepared search move flow를 reusable buffer + selective lazy materialization까지 확장한 low-risk hotpath cleanup**으로 보는 편이 맞습니다.

## 현재 기본값

현재 기본값은 다음과 같이 유지합니다.

- `allocationLightSearchMoves = true`
- `reusablePreparedSearchMoveBuffers = true`
- `lazyPreparedSearchMoves = true`

다만 future regression triage가 필요하면
`lazyPreparedSearchMoves: false`를 eager prepared-buffer control로 써서
원인을 바로 분리할 수 있습니다.

## 다음으로 이어서 보기 좋은 후보

이번 단계 다음 우선순위는 자연스럽게 아래입니다.

1. **`C05 / C20` 계열 최소 canonical move/flip token 정리**
   - 지금은 lazy materialization과 reusable buffer까지는 들어갔지만,
   - canonical compact move token/flip token 자체는 아직 아닙니다.

2. **5~8 empties lighter exact-tail path**
   - 1~4 empties보다 현재는 5~8 empties 쪽이 더 큰 리턴 후보입니다.

3. **object bridge 추가 축소**
   - prepared record path는 가벼워졌지만,
   - 일부 auxiliary/detail path에는 아직 object bridge cost가 남아 있습니다.

이번 Stage 195는 그 다음 단계로 넘어가기 전에,
search 내부 prepared move flow를 “allocation-light prepared path”에서
“**reusable prepared buffer + selective lazy materialization까지 포함한 prepared path**”로 정리한 중간 마감이라고 보면 됩니다.
