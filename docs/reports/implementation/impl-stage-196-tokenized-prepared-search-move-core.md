# Stage 196 - tokenized prepared-search-move core, bitless record cleanup, and compact-token groundwork

## 이번 단계에서 한 일

이번 단계는 Stage 183 후보군 중 Stage 195 다음 우선순위였던 **`C05 / C20` 계열 최소 canonical move/flip token 정리**를
현재 prepared-search-move hotpath 안에서 먼저 좁게 구현한 작업입니다.

구체적으로는 아래를 적용했습니다.

1. **prepared search move core token 도입**
   - `js/core/rules.js`에 `tokenized` prepared move core를 추가했습니다.
   - token은 현재 단계에서 **move index + cached flipCount sentinel**을 담는 compact numeric record입니다.
   - 기존 legacy core는 `index + bit + flips + flipCount`를 갖고 있었지만,
     tokenized core는 **`index + token + flips`**를 기본 core로 사용하고 `bit`는 별도 저장하지 않습니다.

2. **bitless prepared record 경로 정리**
   - tokenized prepared record는 더 이상 `bit` BigInt 필드를 저장하지 않습니다.
   - move bit는 필요할 때 `index`에서 복원하며, `bitFromIndex()`는 lookup table을 쓰도록 바꿨습니다.
   - `flipCount`도 direct field 대신 token에서 읽고, 아직 모를 때만 materialize 시점에 채웁니다.

3. **legacy / tokenized dual-path 유지**
   - `listPreparedSearchMoves()` / `listPreparedSearchMovesIntoBuffer()`는 `coreVariant`를 받아
     `legacy`와 `tokenized`를 둘 다 만들 수 있게 했습니다.
   - buffer 재사용 중 core variant가 바뀌면 slot record를 새 variant shape로 다시 만들도록 정리했습니다.

4. **classic search 옵션 연결**
   - `SearchEngine`에 `tokenizedPreparedSearchMoveCore` 옵션을 추가했고 기본값은 `true`입니다.
   - 기본 search semantics는 그대로 두고,
     prepared move builder만 `legacy -> tokenized` core로 바꿀 수 있게 했습니다.
   - baseline 재현은 `tokenizedPreparedSearchMoveCore: false`로 가능합니다.

5. **회귀 보호와 문서화 준비**
   - `js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`를 추가했습니다.
   - tokenized vs legacy prepared builder parity, buffer variant 전환, search parity, 기본 옵션을 고정했습니다.

## 왜 이 후보를 지금 넣었는가

Stage 195까지 들어간 묶음은 다음을 이미 해결했습니다.

- prepared move eager/lazy path
- per-ply reusable prepared buffer
- selective lazy flip materialization

즉 다음 자연스러운 단계는 같은 hotpath에서 아직 남아 있던
**prepared move core 자체의 data shape**를 더 줄이는 것이었습니다.

이번 Stage는 Stage 183 remainder map 기준으로 보면 대체로 아래를 먼저 좁게 시도한 것입니다.

- `C05`: canonical `Flip { pos, flip }`에 가까운 move core 정리
- `C20`: compact move / flip token groundwork

다만 이번 단계는 full compressed flip까지는 가지 않고,
우선 **prepared move core에서 `bit` BigInt field를 제거하고 `flipCount`를 token으로 흡수하는 low-risk subset**만 채택 여부를 확인했습니다.

## 구현 포인트

### 1. full compressed flip 대신 “minimal tokenized core”부터

이번 Stage의 핵심은 full line-compressed flip token을 한 번에 도입하는 것이 아니라,
현재 prepared move hotpath 안에서 가장 먼저 줄일 수 있는 core만 줄이는 것이었습니다.

즉 지금 tokenized core는

- move index
- cached flipCount (unknown sentinel 포함)

정도만 compact token에 담고,
실제 `flips` bitboard는 eager/lazy 정책에 따라 그대로 유지합니다.

이렇게 하면 다음 장점이 있습니다.

- search semantics가 거의 안 바뀜
- Stage 195 lazy path와 곧바로 결합 가능
- future `C20` compressed flip 확장에 필요한 token plumbing을 먼저 마련 가능

### 2. `bitFromIndex()` table lookup으로 bitless core의 보조 비용을 상쇄

prepared record에서 `bit` field를 없애면
복원 비용이 BigInt shift로 다시 커질 수 있습니다.

그래서 `js/core/bitboard.js`의 `bitFromIndex()`는 now lookup table을 사용하도록 바꿨습니다.

즉 이번 Stage의 목적은 단순히 field를 하나 지우는 것이 아니라,
**bitless core + cheap bit reconstruction**을 같이 가져가는 것입니다.

### 3. tokenized core는 search 전용 prepared path에만 적용

UI/legal-detail/root explanation용 move record는 기존 generic path를 그대로 유지합니다.
이번 Stage가 다루는 범위는 어디까지나
**classic search 내부 prepared move hotpath**입니다.

즉 root legal move detail이나 설명용 record shape는 바뀌지 않았고,
search-only prepared builder에서만 tokenized core가 기본값이 됩니다.

## 검증

직접 확인한 항목은 다음과 같습니다.

- `node js/test/stage122_allocation_light_search_moves_smoke.mjs`
- `node js/test/stage195_lazy_prepared_search_moves_smoke.mjs`
- `node js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`
- `node js/test/stage192_runtime_kernel_defaults_smoke.mjs`
- `node js/test/perft.mjs`

모두 통과했습니다.

## balanced benchmark

이번 Stage의 기준 비교선은 다음과 같습니다.

- **baseline**: `tokenizedPreparedSearchMoveCore = false`
- **candidate**: `tokenizedPreparedSearchMoveCore = true`

다른 prepared path 옵션은 둘 다 동일하게 유지했습니다.

- `allocationLightSearchMoves = true`
- `reusablePreparedSearchMoveBuffers = true`
- `lazyPreparedSearchMoves = true`

즉 이번 benchmark의 차이는 순수하게
**legacy prepared core vs tokenized prepared core**입니다.

### 결과 요약

balanced / per-state warm-up 기준 요약은 아래입니다.

- prepared move micro (eager): **`0.983x`**
- prepared move micro (lazy): **`1.044x`**
- depth-limited 24 empties d6: **`1.026x`**
- depth-limited 20 empties d7: **`0.996x`**
- WLD 14 empties: **`0.992x`**
- exact 10 empties: **`0.954x`**

ratio는 candidate / baseline elapsed라서 **1보다 작을수록 빠릅니다.**

그리고 모든 search section에서 다음 parity가 유지됐습니다.

- best move parity: 전 case 유지
- score parity: 전 case 유지
- mode parity: 전 case 유지
- nodes parity: 전 case 유지

## 해석

1. **builder micro sign은 mixed**
   - eager micro는 소폭 개선(`0.983x`)이었지만,
   - lazy micro는 오히려 소폭 악화(`1.044x`)였습니다.
   - 즉 tokenized core 자체만 떼어 놓은 throughput은 명확한 robust win이라고 보긴 어렵습니다.

2. **실제 search aggregate는 거의 중립에 가깝고 late 쪽은 약간 유리**
   - depth-limited 24 empties는 `1.026x`로 소폭 열세였고,
   - depth-limited 20 empties는 `0.996x`, WLD-14는 `0.992x`, exact-10은 `0.954x`였습니다.
   - search section 전체 합산으로 보면 사실상 **neutral to slightly favorable**입니다.

3. **지금 단계의 의미는 pure speed win보다 data-shape cleanup + 다음 단계 groundwork**
   - `bit` BigInt field 제거,
   - `flipCount` tokenization,
   - legacy/tokenized dual-path,
   - token plumbing 확보

   이 네 가지는 full `C20` compact flip 쪽으로 이어가기 위한 기반 정리라는 의미가 더 큽니다.

## 채택 판단

이번 Stage 196은 **채택**으로 정리합니다.

다만 성격은 명확히 적어 둡니다.

- 이것은 dramatic strength/speed jump가 아닙니다.
- benchmark는 **거의 중립**이고 section별 sign도 mixed입니다.
- 그럼에도 search parity가 깨지지 않았고,
  search aggregate가 전체적으로는 크게 나빠지지 않았으며,
  앞으로 `C20` compact flip 확장에 필요한 token plumbing을 현재 hotpath 위에 안전하게 올려 두는 가치가 있습니다.

즉 이번 Stage는
**near-neutral runtime cleanup + compact-token groundwork adoption**으로 보는 편이 맞습니다.

## 현재 기본값

현재 기본값은 다음과 같습니다.

- `allocationLightSearchMoves = true`
- `reusablePreparedSearchMoveBuffers = true`
- `lazyPreparedSearchMoves = true`
- `tokenizedPreparedSearchMoveCore = true`

원인 분리용 baseline은 다음과 같이 재현 가능합니다.

- `tokenizedPreparedSearchMoveCore: false`

## 아직 남아 있는 다음 후보

이번 Stage는 `C05 / C20`의 **전부**가 아니라,
그중 “minimal tokenized prepared core”만 먼저 넣은 것입니다.

즉 다음 우선순위는 자연스럽게 아래입니다.

1. **fuller `C20` compact flip token**
   - 지금은 index + flipCount token 정도만 들어 있습니다.
   - 실제 flip bitboard 자체를 더 압축해 들고 다닐지는 다음 단계 판단입니다.

2. **5~8 empties lighter exact-tail path**
   - Stage 192 remainder map에서 계속 남아 있던 다음 큰 리턴 후보입니다.

3. **prepared metadata sidecar / additional object-bridge reduction**
   - move core는 줄었지만 ordering metadata slot은 아직 object field로 남아 있습니다.

이번 Stage 196은 그 다음 단계로 넘어가기 전에,
prepared search move hotpath를
**legacy core / lazy path / reusable buffer / tokenized core**까지 한 번 정리한 중간 마감입니다.
