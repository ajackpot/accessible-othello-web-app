# 검토 보고서 Stage 168 follow-up — legacy 구조 정리와 Stage 124 재검토

## 목적
이번 follow-up의 목표는 세 가지였습니다.

1. `docs` 안의 현재형 문서와 구현/검토 보고서를 기준으로, **현 runtime 기준에서 사실상 의미가 없거나 오히려 해석을 흐리는 legacy 표면**이 남아 있는지 다시 점검한다.
2. 그런 표면이 있으면 **제거 / 보강 / 다른 형태로 전환**하고, 정리 후에도 안전하게 동작하는지 회귀로 확인한다.
3. 그 다음 `review-stage-124-compact-ntuple-go-no-go-and-nonreopen-proof.md`의 기준으로 돌아가, **move-ordering / MPC 교체 이후 실제로 다시 볼 가치가 생긴 최적화 후보가 있는지** 판정한다.

이번 단계에서는 generated module 자체를 새로 학습하거나 교체하지 않고,
**현재 설치 runtime(stage154 main-recenter 기본, stage154 both 선택형)** 기준에서 의미론과 후보 surface를 정리하는 데 집중했습니다.

## 조사 범위

### 현재형 문서 / 체크리스트
- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/implementation/impl-stage-156-ordering-split-candidate-gate-and-closeout.md`
- `docs/reports/implementation/impl-stage-168-stage154-runtime-closeout-and-documentation-sync.md`

### 후보/역사 판단 근거
- `docs/reports/review/review-stage-120-ai-core-full-survey-and-step3-candidates.md`
- `docs/reports/review/review-stage-124-compact-ntuple-go-no-go-and-nonreopen-proof.md`
- `docs/reports/review/review-stage-157-structural-candidate-smoke-stage154.md`
- `docs/reports/review/review-stage-158-external-engine-hint-pass-notes.md`
- `docs/reports/review/review-stage-158-structural-candidate-smoke-quick.md`
- `docs/reports/review/review-stage-158-structural-candidate-smoke-quick2.md`
- `docs/reports/review/review-family15x-restart-round8-1500ms-noisy-confirmation.md`
- `docs/reports/review/review-family15x-restart-round9-both-open-compare.md`
- `docs/reports/review/review-stage-167-benchmark-reset-samples.md`
- `docs/reports/review/review-stage-25-dormant-runtime-logic-classification.md`

### 코드 / 테스트 / 도구
- `js/ai/evaluator.js`
- `js/ai/search-engine.js`
- `js/ai/search-structure-profiles.js`
- `tools/engine-match/lib-profile-variants.mjs`
- `tools/evaluator-training/stage157-structural-candidates.mjs`
- `tools/evaluator-training/stage158-structural-candidates.mjs`
- `js/test/stage156_move_ordering_edge_corner_split_smoke.mjs`
- `js/test/stage157_mpc_structure_smoke.mjs`
- `tools/evaluator-training/run-stage158-structural-candidate-smoke.mjs`

## 1. 정리 후보 분류

## A. retired handcrafted edge/corner scale knobs
### 관찰
현재 runtime 기준 문서와 회귀를 함께 보면 다음은 이미 사실상 retired입니다.

- `edgePatternScale`
- `cornerPatternScale`
- `moveOrderingEdgePatternScale`
- `moveOrderingCornerPatternScale`

근거는 분명합니다.

- `docs/reports/checklists/ai-implementation-checklist.md`는 handcrafted edge/corner pattern 계열이 runtime에서 retired라고 적고 있었습니다.
- `js/test/stage156_move_ordering_edge_corner_split_smoke.mjs`는 main evaluator / move-ordering evaluator 모두 이 knob를 무시하고, `SearchEngine`도 resolved runtime option에 이 값을 남기지 않는다고 이미 확인하고 있었습니다.
- 즉 **현재 strength와 runtime semantics는 이미 이 knob들에 의존하지 않습니다.**

그런데 `tools/engine-match/lib-profile-variants.mjs`의 current variant sanitizer는 여전히 위 네 키를 받아 들이고 있었습니다.
이 상태는 두 가지 점에서 좋지 않았습니다.

1. tool 쪽에서 **아직 의미 있는 실험 surface처럼 보이게 만들 수 있습니다.**
2. 실제 runtime에서는 무시되는 값을 variant engine-options JSON이나 explicit override에 실어 나르게 되어, benchmark/재현 문서 해석을 불필요하게 흐립니다.

즉 이 표면은 현재 기준으로는 **“runtime에 영향은 없지만, tool과 문서 해석에는 노이즈를 넣는”** 부류였습니다.

### 판정
- **채택: 제거**

### 적용한 정리
- `tools/engine-match/lib-profile-variants.mjs`의 `VARIANT_ENGINE_OPTION_KEYS`에서 위 네 키를 제거했습니다.
- `README.md`의 현재형 설명을 runtime/tooling 모두 retired 상태로 다시 적었습니다.
- 체크리스트도 “선택형”이 아니라 **역사 표면**으로 재분류했습니다.
- 새 smoke `js/test/stage168_retired_variant_engine_option_sanitizer_smoke.mjs`를 추가해, current variant sanitizer가 active option은 유지하고 retired knob는 버리는지 확인합니다.

### 왜 안전한가
이번 정리는 **runtime scoring/search path를 바꾸지 않았습니다.**
이미 runtime이 무시하던 키를 tool 쪽에서도 더 이상 current surface로 인정하지 않게 한 것입니다.
따라서 strength regression이나 wall-time regression이 생길 직접 경로가 없습니다.

## B. Stage 157 MPC structure smoke의 고정 seed 전제
### 관찰
`js/test/stage157_mpc_structure_smoke.mjs`는 원래 `playSeededRandomUntilEmptyCount(30, 7)`로 만든 단일 상태에서,

- baseline MPC probe 발생
- static gate skip 발생
- verification probe 발생

을 한 번에 기대하고 있었습니다.

하지만 현재 runtime은 stage154 main/both 정리까지 거치며 move-ordering / MPC 의미론이 달라진 상태라,
**seed 7 단일 상태가 계속 그 성질을 보장한다는 전제** 자체가 brittle해졌습니다.
실제 현재 저장소에서는 그 전제가 깨져 stale failure가 발생했습니다.

이것은 current runtime 고장이라기보다,
**candidate smoke가 과거 특정 상태에 과하게 묶여 있던 문제**에 가깝습니다.

### 판정
- **채택: 보강**

### 적용한 정리
테스트를 아래 방식으로 보강했습니다.

- 먼저 preferred seed/empties 조합부터 시도하고,
- 필요하면 `30 → 18 empties`, `seed 1..64` 범위까지 좁게 스캔해,
- baseline probe / static gate skip / verification outcome을 모두 만족하는 representative state를 동적으로 찾습니다.

즉 검증하고 싶은 것은 여전히 **구조 기능의 존재**이지만,
이를 더 이상 특정 historical seed 하나에 고정하지 않도록 바꿨습니다.

### 왜 안전한가
- runtime 코드는 바꾸지 않았고
- candidate smoke의 의도는 유지하면서
- current runtime profile 변화에 덜 brittle하도록 만든 것입니다.

## C. stage157/158 구조 profile library 자체
### 관찰
처음에는 `js/ai/search-structure-profiles.js`에 남아 있는 stage157/158 구조 후보군을 더 강하게 제거할 수도 있어 보였습니다.
하지만 실제 호출 경로와 문서를 대조하면, 이것은 지금 단계에서 제거 대상이 아니었습니다.

이유는 다음과 같습니다.

1. 기본 runtime는 `baseline-v1`를 쓰므로, non-default library entry가 **기본 strength를 직접 오염시키지 않습니다.**
2. `tools/evaluator-training/stage157-structural-candidates.mjs`, `stage158-structural-candidates.mjs`와 stage15x restart follow-up 문서가 이 profile key들을 계속 참조합니다.
3. round8/round9 비교처럼 **현재도 “후속 후보가 정말 승격 가능한지” 읽을 때 필요한 candidate harness**로 남아 있습니다.

즉 지금 이것을 없애면 active runtime은 별로 단순해지지 않는데,
후속 candidate 판정과 historical reproduction만 깨집니다.

### 판정
- **비채택: 유지**

## 2. 정리 후 검증
다음 회귀를 실행했습니다.

```bash
node js/test/stage126_custom_setting_groups_smoke.mjs
node js/test/stage156_move_ordering_edge_corner_split_smoke.mjs
node js/test/stage168_retired_variant_engine_option_sanitizer_smoke.mjs
node js/test/stage157_move_ordering_structure_smoke.mjs
node js/test/stage157_mpc_structure_smoke.mjs
node js/test/stage158_move_ordering_external_hints_smoke.mjs
node js/test/stage158_mpc_zebra_ladder_smoke.mjs
node js/test/stage161_stage15x_main_candidate_smoke.mjs
node js/test/stage167_factorized_pattern_bank_export_smoke.mjs
node js/test/stage168_stage154_runtime_variant_smoke.mjs
node js/test/core-smoke.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
node tools/docs/check-doc-sync.mjs
```

핵심 해석은 다음과 같습니다.

- retired knob 정리는 current runtime을 흔들지 않았습니다.
- stage157/158 구조 관련 regression은 현재 runtime 기준으로 다시 통과합니다.
- stage15x support-stack / repaired factorized export / current stage154 runtime variant 경로도 그대로 살아 있습니다.
- 문서 인벤토리와 current Stage 168 sync도 다시 유지됩니다.

## 3. Stage 124 기준 재검토 — 정말 다시 볼 후보가 생겼는가

## 먼저 어떤 숫자를 버려야 하는가
Stage 167 문서는 pre-repair structural screening 일부를 **reset 대상 증상 기록**으로만 남기고,
채택 근거로는 쓰지 말라고 분명히 적고 있습니다.

따라서 이번 재검토에서는,
**broken factorized export 이전의 구조 screening 숫자**를 다시 채택 근거로 삼지 않았습니다.

이후 실제로 볼 수 있는 최신 근거는 두 층입니다.

1. repaired export 이후의 long-think noisy confirmation
   - `review-family15x-restart-round8-1500ms-noisy-confirmation.md`
   - `review-family15x-restart-round9-both-open-compare.md`
2. current repo에서 다시 돌린 sample-level smoke
   - `benchmarks/stage168/stage168_stage124_revisit_structural_smoke/stage158_structural_smoke_summary.{md,json}`

## 가장 그럴듯한 reopen 후보
move-ordering / MPC 교체 이후 실제로 “혹시 더 볼 가치가 있나?”라고 남아 있는 후보는 사실상 다음 한 묶음입니다.

- `s154-stable-zebra`
- `s154-stable-zebra-open`
- `s154-both + s158-stable-zebra-open`

이들은 Stage 158의 stable/quiet ordering + Zebra ladder MPC 계열이며,
move-ordering / MPC가 바뀐 현재 기준에서 다시 등장한 구조 후보라고 볼 수 있습니다.

## current small smoke 결과
current repo에서 stage154 family만 다시 sample-level smoke로 확인한 결과는 다음과 같았습니다.

- control `s154-control`: ord `5.65 n/ms`, mpc `9.19 n/ms`
- `s154-anchor-main`: ord `9.32 n/ms`, mpc `9.39 n/ms`
- `s154-stable-zebra`: ord `7.86 n/ms`, mpc `8.00 n/ms`, mpc signal `5,154`
- `s154-stable-zebra-open`: ord `5.01 n/ms`, mpc `8.20 n/ms`, mpc probe `2`, mpc signal `232`

이 smoke의 caveat는 문서에 적힌 그대로입니다.
**strength benchmark가 아니라 구조 신호와 rough timing만 보는 샘플 smoke**입니다.
따라서 이 숫자만으로 승격을 판정할 수는 없습니다.

다만 해석은 가능합니다.

- Zebra 계열 구조는 여전히 실제로 켜집니다.
- 그러나 `stable-zebra-open`이 current smoke에서조차 control/anchor 대비 분명한 cost story를 주지 못합니다.
- 즉 “새 구조가 살아 있다”는 것과 “기본값으로 승격할 만큼 강하다”는 것은 여전히 별개입니다.

## repaired-export long-think confirmation 결과
실제 adoption 판단은 round8/round9 long-think noisy confirmation이 더 중요합니다.

### round8
`review-family15x-restart-round8-1500ms-noisy-confirmation.md` 기준:

- `s154-main`: `9.0/12`, avg disc diff `+5.667`
- `s154-both`: `8.0/12`, avg disc diff `+4.167`
- `s154-main + s158-stable-zebra-open`: `7.0/12`, avg disc diff `-0.167`

즉 **main base가 가장 강했고**, open overlay는 base `s154-main`보다 분명히 아래였습니다.

### round9
`review-family15x-restart-round9-both-open-compare.md` 기준:

- `s154-both`: `8.0/12`, avg disc diff `+4.167`
- `s154-both + s158-stable-zebra-open`: `8.0/12`, avg disc diff `+3.667`

즉 `stable-zebra-open`을 `s154-both`에 얹으면 **무너지지는 않지만**, 점수는 동점이고 disc margin은 더 낮았습니다.
그리고 여전히 base `s154-main`보다 아래였습니다.

## 판정
- **새 기본값 채택 후보 없음**
- **Stage 124의 “독립 move-ordering/MPC 재튜닝 비재개 권고”는 현재 기준에서도 유지**

좀 더 구체적으로는,
현재 구조 후보는 “새롭게 생겼다”기보다 이미 stage157/158 및 stage15x restart에서 나타난 것을
repaired-export 기준으로 다시 확인한 상태에 가깝습니다.
그 최신 근거를 합쳐도 다음 순서는 그대로입니다.

1. `s154-main`
2. `s154-both`
3. `s154-both + s158-stable-zebra-open` (portable but non-promoting)
4. `s154-main + s158-stable-zebra-open`

즉 Zebra / stable-quiet 계열은 **interesting branch**로는 남지만,
현재 문서가 요구하는 adoption 조건
- 안전성 유지
- performance/strength가 baseline보다 명백히 나쁘지 않을 것
- noise가 아니라는 근거
를 만족하지 못했습니다.

## 4. 이번 follow-up 결론
이번 follow-up의 결론은 다음 네 줄로 요약할 수 있습니다.

1. **retired handcrafted edge/corner scale knobs는 current tooling surface에서도 제거하는 것이 맞다.**
2. **stage157 MPC structure smoke는 제거가 아니라 동적 representative-state 탐색으로 보강하는 것이 맞다.**
3. **stage157/158 구조 profile library 자체는 current candidate harness이므로 지금은 남겨야 한다.**
4. **Stage 124 기준 재검토를 다시 해도, stage154 main/both 위의 추가 move-ordering/MPC 구조 후보는 아직 승격 근거가 부족하다.**

즉 이번 단계는 새 winner를 찾은 단계가 아니라,
**의미 없는 legacy tool surface를 줄이고, regression을 현재 의미론에 맞게 보강하고, Stage 124 비재개 결론이 아직도 유지된다는 것을 다시 확인한 단계**로 읽는 것이 맞습니다.
