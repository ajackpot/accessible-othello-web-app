# Stage 168 - stage154 runtime closeout, active retirement, and final documentation sync

## 요약
이번 단계의 목표는, stage167 benchmark reset 이후 실제로 채택하기로 한 **stage154 main/both 런타임 정리**를 코드/문서/검증 기준까지 한 번에 닫는 것이었습니다.

핵심 결론은 네 가지입니다.

1. **기본 설치 런타임은 stage154 main-recenter**로 고정했습니다.
2. 사용자 지정 classic 설정에는 **설명형 이름의 stage154 both 선택지**를 남겨, `Main/Both` 같은 내부 후보 이름을 UI에 직접 노출하지 않도록 정리했습니다.
3. `js` 런타임 경로에서는 더 이상 `active`를 현재형 프로필 명칭으로 쓰지 않으며, handcrafted edge/corner runtime lane도 retired 상태로 정리했습니다.
4. `_stage15x*` 일회성 산출물을 정리하고, ETC activity assertion의 stale 전제를 바로잡은 뒤, README / runtime reference / checklist / tool 문서 / generated inventory / stage-info까지 **Stage 168 기준으로 다시 동기화**했습니다.

즉 이번 Stage는 “새 winner를 더 찾는 단계”가 아니라,
**지금까지의 benchmark 결론을 실제 런타임과 문서 기준선으로 굳히는 마감 단계**입니다.

## 1. stage154 runtime 채택 정리
### 기본 설치본: stage154 main-recenter
`js/ai/learned-eval-profile.generated.js`는 이제 **stage154 main-recenter** runtime snapshot을 기본으로 가리킵니다.
현재 설치 런타임 기준 프로필은 다음처럼 읽으면 됩니다.

- evaluation: `balanced13-alllate-smoothed stability extras 0.90x`
- move-ordering: `stage154-main-recenter__move-ordering__balanced`
- tuple residual: `diagonal-top24-latea-endgame-patched-calibrated`
- MPC: `stage154-main-recenter__runtime-mpc__overlapHighTight`

즉 compact-tuple lane이 남긴 evaluation/tuple residual 기반은 유지하되,
**move-ordering과 MPC는 stage154 main 계열이 현재 설치 기본값**이 되었습니다.

### 사용자 지정 classic 선택지: stage154 both
custom classic 설정에는 `클래식 읽기 성향`을 추가해 두 갈래만 남겼습니다.

- `기본 추천 — 표준 후보폭으로 안정적으로 읽기`
- `확장 후보형 — 후보폭을 넓히고 양방향 컷까지 함께 쓰기`

첫 번째는 현재 설치된 stage154 main-recenter를 그대로 사용하고,
두 번째만 stage154 both bundle override를 적용합니다.

중요한 점은 **UI 이름을 내부 후보 코드명으로 두지 않았다**는 것입니다.
이제 설정 화면에서 `Main/Both` 같은 채택 과정의 내부 약어를 알 필요가 없습니다.

## 2. active 현재형 명칭과 handcrafted edge/corner runtime lane 정리
이번 closeout에서는 `js` 런타임 경로에서 `active`를 현재형 설치 프로필 이름처럼 읽히는 표면을 정리했습니다.

정리 원칙은 다음과 같습니다.

- **현재형 런타임 문서**에서는 `active profile` 대신 `runtime profile`, `installed runtime`처럼 읽히는 이름을 사용
- benchmark/tooling 문맥의 built-in variant key `active`는 **historical harness alias**로만 유지
- 현재 `js/ai` 런타임에서 handcrafted edge/corner pattern contribution은 실제 scoring path에 넣지 않음

즉 “active”라는 표현 자체를 완전히 금지한 것이 아니라,
**현재 코드 기준 문서와 JS runtime semantics에서는 retired**시키고,
과거 benchmark/도구 alias 문맥에서만 제한적으로 남긴 것입니다.

handcrafted edge/corner 계열은 main evaluator와 move-ordering evaluator 모두에서 retired 상태를 유지합니다.
기본 런타임 strength의 축은 이제 broad hand-crafted patch가 아니라,
**installed generated module + search structure + current runtime defaults** 쪽으로 읽는 편이 맞습니다.

## 3. `_stage15x*` 정리와 ETC assertion 원인 정리
### bulky `_stage15x*` 정리
`tools/evaluator-training/out/` 아래의 `_stage15x*` 일회성 출력 폴더를 삭제해,
closeout 기준선에서 불필요한 용량과 해석 노이즈를 줄였습니다.

삭제 대상은 Step 3에서 확정한 다음 묶음입니다.

- `_stage15x_bundle_bugcheck`
- `_stage15x_bundle_direct_fixcheck`
- `_stage15x_bundle_fixcheck`
- `_stage15x_resume_check`
- `_stage15x_resume_skipfix`
- `_stage15x_smoke_bundle`

그리고 repo root에 남아 있던 transient session output(`stage15x_restart_phase6_base_overlay_*`)과 stray empty file도 함께 정리했습니다.

요지는 간단합니다.
**stage15x support-stack source/runtime snapshot은 유지하되, one-off repair/check temp output과 루트 scratch output은 유지하지 않는다**는 쪽으로 정리했습니다.

### ETC activity assertion은 왜 실패했는가
원인은 ETC 고장이 아니었습니다.

현재 default custom classic 경로는 `classic-mtdf-2ply`로 해석되고,
이 경로에서는 **MTD(f) zero-window / verification / fallback 문맥에서 ETC를 의도적으로 억제**합니다.
그래서 ETC-specific regression이 “default custom classic이면 ETC counter가 올라야 한다”는 오래된 전제를 계속 갖고 있으면,
실제로는 정상 동작인데도 실패하게 됩니다.

대책은 런타임 로직을 바꾸는 것이 아니라,
**ETC activity를 보려는 회귀/벤치만 classic + PVS를 명시적으로 pin**하는 것이었습니다.

즉 현재 정책은 다음과 같습니다.

- ETC activity regression/benchmark → `classic` + `pvs`를 명시
- default custom MTD(f) regression → ETC counter가 0이어도 suppression semantics를 검증
- 이 구분의 guardrail → `stage139_mtdf_etc_suppression_smoke.mjs`

## 4. 작은 리팩토링
이번 closeout에서 새 기능을 더 얹지는 않았지만,
나중에 다시 같은 결정을 읽을 때 덜 헷갈리도록 작은 구조 정리는 같이 했습니다.

핵심은 `js/ai/runtime-engine-variants.js`입니다.
이 모듈은 이제 단순한 “if expanded-variant then override” helper가 아니라,
**stage154 classic runtime variant catalog**를 명시적으로 보유합니다.

각 variant는 이제 다음 metadata를 함께 가집니다.

- 사용자 표시 label / summary label / description
- 기본 설치본 여부(`installedByDefault`)
- runtime profile family key
- evaluation / move-ordering / tuple residual / MPC profile name snapshot
- 선택 힌트(`현재 설치 기본 설정`, `선택형 stage154 both 번들`)

이 덕분에 UI/상태 요약/테스트/문서가
“어떤 variant가 실제로 어떤 runtime bundle을 가리키는가”를 한 군데에서 같은 방식으로 읽을 수 있게 되었습니다.

## 5. 문서/체크리스트/버전 동기화
이번 Stage에서 다음 문서를 모두 **Stage 168** 기준으로 다시 맞췄습니다.

- `stage-info.json`
- 루트 `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `tools/engine-match/README.md`
- `tools/evaluator-training/TOOL_INDEX.md`
- `docs/reports/report-inventory.generated.{md,json}`

특히 현재 기준 문서에서는 다음 두 가지를 명시적으로 적었습니다.

1. benchmark/tooling의 `active` variant key는 **현재 설치 런타임 generated module을 가리키는 harness alias**다.
2. 현재 `js/ai` 런타임에서 공식적으로 읽어야 하는 표면은 **stage154 main 기본 + stage154 both 선택형**이다.

즉 버전/문서 sync의 목적은 단순한 숫자 바꾸기가 아니라,
**지금 저장소에서 무엇이 현재형이고 무엇이 역사 문맥인지 다시 선명하게 만드는 것**이었습니다.

## 6. 검증
이번 closeout에서 확인한 대표 검증은 다음과 같습니다.

```bash
node js/test/stage80_etc_hotpath_cleanup_smoke.mjs
node js/test/stage81_etc_child_tt_reuse_smoke.mjs
node js/test/stage120_documentation_sync_smoke.mjs
node js/test/stage126_custom_setting_groups_smoke.mjs
node js/test/stage126_search_engine_custom_style_support_smoke.mjs
node js/test/stage129_settings_ui_presentation_smoke.mjs
node js/test/stage138_pvs_aspiration_defaults_smoke.mjs
node js/test/stage139_mtdf_etc_suppression_smoke.mjs
node js/test/stage143_release_defaults_smoke.mjs
node js/test/stage156_move_ordering_edge_corner_split_smoke.mjs
node js/test/stage167_factorized_pattern_bank_export_smoke.mjs
node js/test/stage168_stage154_runtime_variant_smoke.mjs
node js/test/core-smoke.mjs
node tools/docs/check-doc-sync.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
```

핵심 의미는 다음과 같습니다.

- current runtime / custom setting / doc sync / ETC expectation / stage154 variant wiring이
  **서로 충돌하지 않는 상태로 다시 고정**되었습니다.
- benchmark closeout 이후에도 `core-smoke`가 다시 통과하므로,
  Step 3의 ETC investigation이 단순 해석 문서에 그치지 않고 실제 regression suite에도 반영되었습니다.

## 7. 이번 Stage를 한 문장으로 요약하면
이번 Stage는
**“stage154 main/both 결론을 현재 설치 런타임, JS 의미론, 도구 alias 설명, 체크리스트, report inventory까지 같은 기준으로 묶어 닫은 stage154 closeout 단계”**
라고 읽으면 됩니다.

여기서 남겨 둔 선택지는 두 가지뿐입니다.

1. 기본 설치본은 계속 stage154 main-recenter
2. 사용자 지정 classic에서만 stage154 both를 설명형 이름으로 선택 가능

overlay 계열은 현재 설치 기본값에 올리지 않았고,
main vs both의 최종 default 승격 판단은 **이후 추가 최적화/후속 benchmark**가 다시 쌓일 때만 재개하면 됩니다.
