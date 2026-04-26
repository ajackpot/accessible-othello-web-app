# Stage 192 - phase1 runtime closeout, candidate remainder map, and version sync

## 이번 단계에서 한 일

Phase 1 runtime optimization 세션을 마감하기 위해 다음 정리를 한 번에 수행했습니다.

1. **실제 런타임 기본값 정리**
   - `js/core/rules.js`의 기본 mobility kernel을 `prefix-bidirectional`로 올렸습니다.
   - `js/core/rules.js`의 기본 flip kernel을 `ray-between-precheck`로 올렸습니다.
   - `js/ai/pattern-bank.js`의 기본 scorer를 `packed-lookup`로 유지하고, runtime default reset helper를 명시했습니다.
2. **리팩토링**
   - 규칙 커널과 pattern-bank scorer의 runtime default를 상수/헬퍼로 노출해, 벤치/회귀/도구가 현재 기본값을 한 지점에서 참조할 수 있게 했습니다.
   - `resetRuleKernelVariantsToRuntimeDefaults()`, `getActiveRuleKernelConfig()`, `resetPatternBankScoreVariantToRuntimeDefault()`를 추가했습니다.
3. **회귀 보호**
   - `js/test/stage192_runtime_kernel_defaults_smoke.mjs`를 추가해, 현재 기본 mobility/flip/pattern-bank scorer default와 reset 동작을 고정했습니다.
4. **문서/버전 동기화**
   - `stage-info.json`, `README.md`, `docs/runtime-ai-reference.md`, `docs/reports/checklists/ai-implementation-checklist.md`, generated inventory를 **Stage 192 기준**으로 다시 맞췄습니다.
5. **1차 마감 문서화**
   - 외부 엔진 조사에서 뽑은 26개 후보를 현재 기준으로 다시 분류하고,
   - 아직 새 hotpath 최적화의 혜택이 덜 퍼지고 있다고 보는 legacy 지점을 추려 2차 세션용 follow-up map으로 남겼습니다.

## 현재 기본 런타임에 실제로 반영된 핵심 hotpath

현재 runtime default 기준으로 활성이라고 봐도 되는 것은 아래입니다.

- Stage 122: allocation-light prepared search move path
- Stage 170: `prefix-bidirectional` legal-move kernel
- Stage 179: `ray-between-precheck` flip kernel
- Stage 190: `packed-lookup` pattern-bank scorer
- Stage 191 closeout: `C16 ~ C19` exact-tail bundle (`t=6` 유지)

즉 Phase 1 closeout 시점의 핵심은

- **규칙 쪽**: `direction-loop + directional while` baseline에서 벗어나,
  prefix mobility + metadata/ray-between flip으로 올라왔고,
- **평가 쪽**: pattern-bank square-bit ternary loop에서 packed lookup scorer로 올라왔으며,
- **말기 쪽**: 1~4 empties specialized path와 optimized few-empties threshold 6이 현재 의미 있는 tail stack으로 남아 있다는 점입니다.

## 26개 후보 상태 맵

| ID | 현재 상태 | 정리 |
| --- | --- | --- |
| C01 | 채택 | 하드코딩 축별 legal-move kernel은 `prefix-bidirectional` 기본 경로로 반영됨 |
| C02 | 채택 | 양방향 동시 확장 흐름이 현재 mobility kernel의 중심 구조로 반영됨 |
| C03 | 채택 | non-vertical mask를 먼저 자르는 방식이 현재 prefix kernel 안에 반영됨 |
| C04 | 부분 채택 | legal bitboard 선계산 + prepared move path는 있으나, search 전 구간 lazy materialize는 아직 아님 |
| C05 | 부분 채택 | prepared move record 경로는 있으나 canonical `Flip {pos, flip}` 최소 타입까지는 가지 않음 |
| C06 | 비채택 | scratch-target apply/undo 경로는 BigInt/V8 런타임에서 실전 throughput 이득이 약하거나 음수였음 |
| C07 | 부분 채택 | allocation-light move path는 채택됐지만 ply-local reusable move buffer는 기본 경로가 아님 |
| C08 | 채택 | neighbor precheck가 기본 flip kernel에 들어감 |
| C09 | 보류 | line-table flip kernel은 BigInt pack/expand bridge 비용 때문에 아직 기본 채택 실패 |
| C10 | 미도입 | OUTFLANK + FLIP 2단계 table family는 아직 runtime default에 들어가지 않음 |
| C11 | 보류 | line-to-board 재확장 table은 line-table family와 함께 보류 |
| C12 | 채택 | per-square metadata/ray-between cache가 기본 flip kernel의 일부로 반영됨 |
| C13 | 부분 채택 | flip kernel scope에서는 미도입이지만, 같은 pack/extract 계열 아이디어가 pattern-bank packed lookup에서 큰 효과를 냄 |
| C14 | 부분 채택 | kernel variants와 runtime-default helper를 두었지만, typed-array/wasm family 병렬 운영까지는 아님 |
| C15 | 미도입 | flipCount-only table은 아직 runtime path에 없음 |
| C16 | 채택 | 1-empty 계열 last-flip path가 exact-tail bundle의 일부로 살아 있음 |
| C17 | 채택 | 2-empty direct-check/legal-generation 생략 path 유지 |
| C18 | 채택 | 3-empty direct-check + ordering 특화 path 유지 |
| C19 | 채택 | 4-empty direct-check + 우선순위 테이블 path 유지, `t=6` closeout 유지 |
| C20 | 미도입 | compressed flip token / compact move encoding은 아직 없음 |
| C21 | 미도입 | approximate mobility 보조 힌트는 아직 기본 ordering path에 없음 |
| C22 | 부분 채택 | `rules` / `pattern-bank` / `search-engine` 경계는 더 분명해졌지만 mobility/flip/last_flip/board 완전 분리까진 아님 |
| C23 | 미도입 | generic/typed-array/wasm pack 병렬 운영은 아직 없음 |
| C24 | 채택 | perft / hotpath benchmark / parity audit 문화 자체는 runtime closeout의 기본 절차로 정착 |
| C25 | 부분 채택 | immediate wipeout / special-ending fast path는 있으나, legal-generation 직후의 일반 fast-decision path까지 확장되진 않음 |
| C26 | 미도입 | TT/PV 선행 move만 먼저 flip materialize하는 lazy path는 아직 기본 search flow에 없음 |

## 2차 세션에서 리턴이 클 가능성이 높은 legacy 지점

아래는 “새로 도입된 후보의 혜택이 아직 충분히 퍼지지 못한다”고 보는 대표 지점입니다.

### 1. `GameState.applyMoveFast()` / `passTurnFast()`의 per-node 객체 생성

규칙 커널과 evaluator가 빨라져도 search는 여전히 거의 모든 노드에서 새 `GameState`를 만듭니다.
즉 **rules/evaluator hotpath 이득이 search object allocation에서 일부 상쇄**됩니다.

2차 세션에서 가장 먼저 볼 만한 search-side 지점은 이 부분입니다.

### 2. `buildLegalMoveRecords()` / `listLegalMoveDetails()`의 JS 객체 materialization

현재 mobility/flip kernel은 bitboard 계산이 빨라졌지만,
UI/detail/some search-adjacent path에서는 곧바로 `{ index, bit, flips, ... }` 객체 배열로 확장합니다.

즉 **bitboard hotpath → object-array bridge**가 아직 legacy 비용으로 남아 있습니다.

### 3. `bitsToIndices()` / `flippedIndices` 확장 경로

exact-tail runtime profile에서도 `bitsToIndices` 계열이 보입니다.
이는 “보드 연산 자체”가 아니라 **설명/상세/record 확장용 legacy path**가 아직 hot section에 스며들 수 있다는 뜻입니다.

### 4. pattern-bank packed lookup의 혜택이 detail/fallback path까지 완전히 퍼지지 않음

현재 기본 scorer는 `packed-lookup`이지만,
설명용 detail capture나 fallback path는 여전히 `patternIndexForPerspectiveBoardsBits()` 중심입니다.

즉 Stage 190의 큰 이득은 이미 runtime scorer에 도달했지만,
**보조 경로는 아직 legacy scorer 잔재를 유지**합니다.

### 5. line-table family는 entry-flow보다 representation bridge가 더 큰 문제

Stage 184/185/189 결과를 합치면,
`C09 + C11 + C13` family는 “진입점/동선만 고치면 살아나는 후보”가 아니었습니다.

병목은 주로

- line pack/extract,
- line byte → board mask 재확장,
- BigInt board 표현과 table lookup 표현 사이의 bridge

에 가깝습니다.

따라서 2차 세션에서 line-table을 다시 볼 때는 search flow보다
**typed-array shadow board / dual representation / multi-pack architecture(C23)** 쪽으로 바로 가는 편이 더 타당합니다.

### 6. search flow는 아직 eager flip materialization 성향이 강함

current prepared move path는 좋아졌지만,
TT/PV candidate만 먼저 확장하고 나머지는 나중에 materialize하는 **C26 lazy path**는 아직 없습니다.

즉 search-layer 쪽 다음 큰 후보는

- `C26`
- `C05` minimal canonical move token 재정리
- `C20` compact move encoding

쪽입니다.

### 7. exact-tail의 다음 확장 구간은 5~8 empties

`C16 ~ C19`는 1~4 empties에서 이미 의도대로 작동합니다.
반면 그 위 구간은 여전히 generic rules/buildLegalMoveRecords 영향이 큽니다.

그래서 exact-tail follow-up은

- 1~4를 더 꼬는 것보다,
- **5~8 empties direct-check / lighter exact-tail move path**

쪽이 더 큰 리턴 후보입니다.

## 이번 Stage의 정리 포인트

Stage 192의 역할은 “새 후보를 더 억지로 넣는 것”이 아니라,

1. Phase 1에서 실제로 먹힌 hotpath를 **runtime default로 확정**하고,
2. 문서/버전 기준선을 그 상태에 맞춰 **다시 잠그고**,
3. 26개 후보 중 **남은 것 / 부분 채택 / 큰 리턴이 예상되는 legacy 지점**을 정리해
   다음 세션이 바로 Phase 2 follow-up으로 이어질 수 있게 만든 것입니다.

즉 이번 closeout의 핵심 산출물은

- runtime default 정리,
- 회귀 smoke 추가,
- Stage/version sync,
- candidate remainder map

입니다.
