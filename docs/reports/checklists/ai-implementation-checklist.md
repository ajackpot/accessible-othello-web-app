# AI 구현 체크리스트

이 문서는 **현재 기본 런타임에 실제로 남아 있는 구현**을 빠르게 확인하기 위한 체크리스트입니다.
역사 문서와 분리해서 읽는 것이 핵심이며, 상세 구조 설명은 `../../runtime-ai-reference.md`를 먼저 보는 편이 더 빠릅니다.

## 문서 기준선
- 저장소 stage/tag/updatedAt/summary의 단일 기준은 루트 `stage-info.json`입니다.
- **현재 코드 기준 안내**는 루트 `README.md`, `../../runtime-ai-reference.md`, 이 체크리스트를 함께 봅니다.
- Stage별 채택/비채택 근거는 `../implementation/*`, `../review/*`에 남기고, 최신 구현 보고서 진입점은 `../report-inventory.generated.md`를 우선 기준으로 봅니다.
- `package.json`은 Node ESM / 도구 실행용 최소 메타데이터 파일이며, 저장소 Stage 버전 기준으로 사용하지 않습니다.

## 관련 문서
- [현재 AI 런타임 레퍼런스](../../runtime-ai-reference.md)
- [구현/검토 보고서 허브](../README.md)
- [생성된 리포트 인벤토리](../report-inventory.generated.md)
- [현재 저장소 Stage 메타데이터](../../../stage-info.json)

## 상태 라벨
- **활성**: 현재 기본 런타임에서 실제 사용됨
- **선택형**: 기본은 아니지만 UI, 특정 프리셋, 조건부 경로에서 사용됨
- **도구**: 런타임이 아니라 학습/벤치/패키징/검증용
- **역사**: 보고서에는 남아 있지만 현재 기본 런타임에는 남기지 않음

## 현재 기본 런타임 스냅샷

| 항목 | 현재 상태 | 근거 파일 |
| --- | --- | --- |
| 저장소 현재 Stage | **Stage 204** | `stage-info.json` |
| 기본 난이도 | `normal` | `js/ai/search-engine.js`, `js/ai/presets.js` |
| 기본 스타일 | `balanced` | `js/ai/presets.js` |
| 기본 AI 모드(search algorithm) | `classic-mtdf-2ply` (`Classic MTD(f)`) | `js/ai/search-algorithms.js`, `js/ai/search-engine.js` |
| 기본 오프닝 hybrid 프로필 | `stage59-cap9-prior-veto` | `js/ai/opening-tuning.js`, Stage 123 replay revalidation 유지 |
| runtime opening prior export | `factorized-binary-varint-v1` | `js/ai/opening-prior.generated.js`, `js/ai/opening-prior.js` |
| runtime evaluation profile | `balanced13-alllate-smoothed stability extras 0.90x` | `js/ai/evaluation-profiles.js`, `js/ai/learned-eval-profile.generated.js` |
| runtime move-ordering profile | `stage154-main-recenter__move-ordering__balanced` | `js/ai/evaluation-profiles.js`, `js/ai/learned-eval-profile.generated.js` |
| runtime move-ordering structure profile | 기본 `baseline-v1`, closeout 지원 overlay는 `wide-hybrid-v1`, `late-potential-frontier-v1`, `hybrid-probe-v1` | `js/ai/search-structure-profiles.js`, `js/ai/search-engine.js` |
| runtime tuple residual profile | `diagonal-top24-latea-endgame-patched-calibrated` | `js/ai/evaluation-profiles.js`, `js/ai/learned-eval-profile.generated.js` |
| runtime MPC profile | `stage154-main-recenter__runtime-mpc__overlapHighTight` | `js/ai/evaluation-profiles.js`, `js/ai/learned-eval-profile.generated.js` |
| runtime MPC structure profile | 기본 `baseline-v1`, closeout 지원 overlay는 `verify-tight-v1`, `static-gate-v1`, `assertive-both-v1` | `js/ai/search-structure-profiles.js`, `js/ai/search-engine.js` |
| stage157 mainline structural support set | `s157-main-control`, `s157-main-wide-hybrid`, `s157-main-frontier-gate`, `s157-main-assertive-both`만 현재형 registry에 남김 | `tools/evaluator-training/stage157-structural-candidates.mjs` |
| stage158 mainline structural registry | `s154-control`, `s154-stable-zebra`만 active registry에 남기고, `s154-stable-zebra`는 아직 installed default로 승격하지 않은 deferred survivor로 유지 | `tools/evaluator-training/stage158-structural-candidates.mjs`, `tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs` |
| stage176 survivor branch registry | active key는 비워 두고, 여섯 branch는 historical-only retired key로 유지 | `tools/evaluator-training/stage176-survivor-branch-candidates.mjs`, `js/test/stage182_stage176_runtime_closeout_smoke.mjs` |
| classic 읽기 성향 | 기본 추천(stage154 main-recenter 설치본 유지), 사용자 지정에서 확장 후보형(stage154 both 번들 override) 선택 가능 | `js/ai/runtime-engine-variants.js`, `js/ai/presets.js`, `js/ui/settings-panel-view.js` |
| exact micro-solver threshold | `optimizedFewEmptiesExactSolverEmpties = 8` | `js/ai/search-engine.js`, Stage 84/197 보고서 |
| WLD micro-solver threshold | `optimizedFewEmptiesWldSolverEmpties = 8` | `js/ai/search-engine.js`, Stage 199/202 보고서 |
| default mobility kernel | `prefix-bidirectional` | `js/core/rules.js` |
| default flip kernel | `ray-between-precheck` | `js/core/rules.js` |
| pattern-bank scoring kernel | `packed-lookup` | `js/ai/pattern-bank.js`, `js/ai/evaluator.js` |
| specialized few-empties exact solver | 활성 | `js/ai/search-engine.js` |
| root WLD pre-exact | 기본 꺼짐 (`0`), 사용자 지정에서만 `+2` 선택 가능 | `js/ai/presets.js`, `js/ai/search-engine.js` |
| special-ending safety net | root scout / internal immediate wipeout guard / MCTS root threat penalty 활성 | `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ai/special-endings.js` |
| 실행 경로 | worker 우선, 실패 시 main-thread fallback | `js/ui/engine-client.js`, `js/ai/worker.js` |

benchmark/tooling의 `active` variant key는 현재 설치 런타임 generated module을 가리키는 **historical harness alias**입니다. 현재 `js/ai` 런타임 프로필 이름으로 읽지 않습니다.

## 난이도/스타일 프리셋 스냅샷

### 난이도 프리셋

| 프리셋 | 깊이 | 시간 제한(ms) | exact 시작 빈칸 | WLD pre-exact | 비고 |
| --- | ---: | ---: | ---: | ---: | --- |
| beginner | 2 | 160 | 4 | 0 | 가장 가벼운 입문용 |
| easy | 3 | 280 | 6 | 0 | 얕은 exact 포함 |
| normal | 4 | 500 | 8 | 0 | 기본 프리셋 |
| hard | 6 | 1400 | 10 | 0 | 깊은 탐색 |
| expert | 8 | 3900 | 12 | 0 | 적극적 exact |
| impossible | 10 | 12000 | 16 | 0 | 브라우저 범위의 최중량 |
| custom | 6 | 1500 | 10 | 0(기본) | 직접 입력/선택 |

### 스타일 프리셋

| 스타일 | 상태 | 설명 |
| --- | --- | --- |
| balanced | 활성 / 기본 | 표준 기준선 |
| aggressive | 활성 | 기동성과 변동성 강화 |
| fortress | 활성 | 안정성/봉쇄 성향 강화 |
| positional | 활성 | 코너/위치 감각 강화 |
| chaotic | 활성 | 근접 후보 다양성 확대 |
| custom | 선택형 | detail dialog에서 evaluator scale을 직접 조절 |

## 런타임 AI 구현 체크리스트

### 1. 탐색 코어

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | 비트보드 기반 규칙/탐색 | BigInt 비트보드, 합법수 생성, 뒤집기, 패스 처리 | `js/core/*`, `js/ai/search-engine.js` |
| 활성 | iterative deepening | 루트 탐색 기본 뼈대 | Stage 03, `js/ai/search-engine.js` |
| 활성 | alpha-beta / PVS | 주 탐색의 기본 알고리즘 | Stage 03, `js/ai/search-engine.js` |
| 활성 | aspiration window | 프리셋/사용자 지정 입력으로 크기 제어 | `js/ai/presets.js`, `js/ai/search-engine.js` |
| 활성 | transposition table | TT 저장/조회, 안전한 재사용, 부분 축출 | Stage 03/06/25, `js/ai/search-engine.js` |
| 활성 | TT-first hot path | 얕은 힌트보다 신뢰 가능한 TT 힌트를 우선 반영 | Stage 79, `js/ai/search-engine.js` |
| 활성 | killer/history ordering | 일반 탐색 move ordering 기본 신호 | Stage 03, `js/ai/search-engine.js` |
| 활성 | late move reductions (LMR) | 조건부 축소 + 재탐색 | `js/ai/search-engine.js` |
| 활성 | enhanced transposition cutoff (ETC) | exact/WLD 모두 child TT 재사용을 포함한 cutoff 경로 유지. ETC activity regression/benchmark는 기본 custom MTD(f) suppression과 구분하기 위해 PVS classic 경로를 명시적으로 pin합니다. | Stage 17/20/80/81/139, `js/ai/search-engine.js`, `js/test/core-smoke.mjs` |
| 활성 | allocation-light search move path | classic search 내부 노드는 prepared move record + fixed ordering metadata shape + inline flip-count 누적 경로를 기본 사용하고, 현재는 per-ply reusable prepared buffer + non-precompute lane selective lazy flip materialization + tokenized prepared core까지 포함합니다. Stage 198의 compact prepared flip-token / token-first apply path도 실험용으로 연결돼 있지만, balanced benchmark regression 때문에 기본값은 계속 `compactPreparedSearchMoveFlips = false`입니다. Stage 203에서 다시 본 `ttFirstDeferredMoveListBuild`, `lowOverheadSearchChildStateFactory`도 no-adoption으로 남아 기본값은 `false`입니다. Stage 204에서는 이 search/tail 기본값 authority를 exported helper bundle로 정리했습니다. 비교선은 `allocationLightSearchMoves: false`, `lazyPreparedSearchMoves: false`, `tokenizedPreparedSearchMoveCore: false`, `compactPreparedSearchMoveFlips: true/false`, `ttFirstDeferredMoveListBuild: true`, `lowOverheadSearchChildStateFactory: true` 조합으로 재현할 수 있습니다. | Stage 122/195/196/198, `js/core/rules.js`, `js/ai/search-engine.js` |
| 활성 | prefix-bidirectional legal-move kernel | hardcoded axis-wise bidirectional prefix mobility path를 기본 합법수 생성 경로로 사용하고, legacy direction-loop는 비교용 fallback으로만 유지 | Stage 170/192, `js/core/rules.js` |
| 활성 | ray-between-precheck flip kernel | neighbor precheck + per-square ray/between metadata 기반 flip materialization을 기본으로 사용하고, legacy directional while loop는 fallback으로 유지 | Stage 179/192, `js/core/rules.js` |
| 활성 | pass/terminal TT 저장 | 패스/종료 노드도 재사용 | Stage 06 보강, `js/ai/search-engine.js` |
| 활성 | MPC runtime lane | worker / UI fallback / direct `SearchEngine` 기본 경로에서 stage154 main runtime MPC profile 상속, classic custom variant가 expanded-both일 때만 bundled override 적용, explicit `mpcProfile: null` preserve | Stage 72~74, 121, 168, `js/ai/search-engine.js`, `js/ui/engine-client.js`, `js/ai/worker.js`, `js/ai/runtime-engine-variants.js` |
| 활성 | preset-aware AI 모드 선택기 | `beginner`: `Classic MTD(f) / Classic PVS / MCTS Lite / MCTS Guided`, `easy` 이상: `Classic MTD(f) / Classic PVS / MCTS Guided / MCTS Hybrid` | Stage 88~93, `js/ai/search-algorithms.js`, `js/ui/settings-panel-view.js`, `js/ai/search-engine.js` |
| 선택형 | MCTS lite / guided / hybrid lane | 기본값은 `classic`, 프리셋 허용 범위 안에서만 선택 가능 | Stage 88~93, `js/ai/mcts.js`, `js/ai/search-algorithms.js`, `js/ai/search-engine.js` |
| 선택형 | MCTS late solved-subtree lane | `mctsSolverEnabled = true`, `mctsSolverWldEmpties = 2` | Stage 100, `js/ai/search-engine.js`, `js/ai/mcts.js` |
| 선택형 | MCTS root exact continuation | base `+3` + adaptive post-proof continuation(`loss-only`, 추가 `+1`) 유지 | Stage 101/104/110, `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ui/formatters.js` |
| 선택형 | MCTS proof telemetry / UI summary | 상태 패널의 `말기 proof` 문장 유지 | Stage 102, `js/ai/search-engine.js`, `js/ui/formatters.js`, `js/ui/app-controller.js` |
| 선택형 | MCTS late proof-priority bias | `mcts-hybrid` late lane에서 rank bias 사용, late-bias package / root-maturity gate는 experimental 표면만 유지 | Stage 103/111~118, `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ui/formatters.js` |
| 선택형 | MCTS score-bound late lane | experimental opt-in, lane 내부 draw-blocker `x0.35`, 전역 기본값은 꺼짐 | Stage 106~108, `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ui/formatters.js` |

### 2. 말기 exact / WLD 경로

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | exact endgame search | 프리셋별 `exactEndgameEmpties`부터 exact 진입 | Stage 05+, `js/ai/search-engine.js` |
| 활성 | small exact solver (1~4 empties) | few-empties exact 전용 bitboard solver 유지 | Stage 05/22, `js/ai/search-engine.js` |
| 활성 | specialized few-empties exact solver | 말기 작은 구간 전용 최적화 경로 유지, Stage 200에서 last-flip leaf short-circuit를 기본 exact tail에 통합 | Stage 23/200, `js/ai/search-engine.js` |
| 활성 | optimized few-empties exact solver | lightweight exact-tail move path를 붙여 exact tail window를 threshold 8까지 확장 | Stage 84/197, `js/ai/search-engine.js` |
| 활성 | exact fastest-first ordering | 말기 exact 창에서 reply-count 기반 정렬을 유지하되, few-empties exact helper path에서는 legal move 수가 `4` 미만이면 Stage 201 selective gate로 reply-count probe를 건너뛰고 square-score ordering만 사용합니다. exact tail 내부 1-empty leaf는 계속 Stage 200 last-flip path가 단축합니다. | Stage 24/84/200/201, `js/ai/search-engine.js` |
| 선택형 | root WLD pre-exact `+2` | 기본 런타임에서는 꺼짐, custom에서만 선택 가능 | Stage 18/19/83, `js/ai/presets.js` |
| 활성 | optimized/refined few-empties WLD solver | WLD tail 1~8 empties에는 lightweight reusable-slot path를 유지하고, 1~4 empties에는 Stage 202 specialized WLD last-flip path를 기본 통합합니다. few-empties WLD helper path에서는 legal move 수가 `4` 미만이면 Stage 202 selective gate로 reply-count fastest-first probe를 건너뜁니다. | Stage 199/202, `js/ai/search-engine.js` |
| 활성 | WLD 전용 경로와 exact 경로 분리 | exact micro-solver 확장과 별도로, WLD tail 정리는 WLD search 의미론 안에서 분리 유지합니다. | Stage 18/19/84/199/202, `js/ai/search-engine.js` |

### 3. 평가 함수와 프로필

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | phase-bucket linear evaluator | installed runtime generated/seed profile 구조 유지 | Stage 26+, `js/ai/evaluation-profiles.js`, `js/ai/evaluator.js` |
| 활성 | packed pattern-bank lookup scorer | 16-bit chunk pack table + ternary lookup fast path를 기본 scorer로 사용하고, legacy square-bit index loop는 fallback/설명 경로로만 유지 | Stage 190/192, `js/ai/pattern-bank.js`, `js/ai/evaluator.js` |
| 활성 | zero-sum 정렬/반올림 | 관점 반전 시 평가 대칭성 유지 | Stage 06/33, `js/ai/evaluator.js` |
| 활성 | 전통 feature 세트 | mobility, potential mobility, corner, corner adjacency, frontier, positional, parity, disc differential | `js/ai/evaluator.js` |
| 활성 | pattern feature 세트 | handcrafted edge/corner pattern 계열은 runtime에서 retired 상태 | Stage 04+, `js/ai/evaluator.js` |
| 활성 | stability 근사 | 코너/변 기반에서 내부 안정 돌까지 보수적으로 확장 | Stage 33, `js/ai/evaluator.js` |
| 활성 | stability hotpath flattening | axis/direction lookup flattening과 unstable-disc-only refinement scan 유지 | Stage 86, `js/ai/evaluator.js` |
| 활성 | tuple residual profile | evaluator에 residual 보정 신호 결합 | Stage 49~52, `js/ai/evaluation-profiles.js`, `js/ai/evaluator.js` |
| 선택형 | 스타일별 scale 보정 | custom에서는 스타일 보정 대신 직접 입력값 우선 | `js/ai/presets.js` |

### 4. move ordering / 후반 ordering

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | trained move-ordering profile | installed runtime ordering profile 연결 | Stage 29/37/38/44, `js/ai/evaluation-profiles.js` |
| 활성 | child empties 기준 late bucket 선택 | 경계 직후 bucket/parity 문맥 반영 | Stage 29/32, `js/ai/evaluator.js`, `js/ai/search-engine.js` |
| 활성 | exact window용 late ordering profile | generic history/positional/flip 비중 축소, trained signal 비중 강화 | Stage 09/24, `js/ai/search-engine.js` |
| 활성 | 15~18 empties 경량 fallback ordering | exact 이전 구간용 보수적 ordering lane 유지 | Stage 11, `js/ai/search-engine.js` |
| 활성 | ordering hot-path precompute | empties direct lookup, risk lookup table, score table 캐시 유지 | Stage 78, `js/ai/search-engine.js`, `js/ai/evaluator.js` |
| 역사 | retired된 handcrafted edge/corner scale knobs | `edgePatternScale`, `cornerPatternScale`, `moveOrderingEdgePatternScale`, `moveOrderingCornerPatternScale`는 현재 runtime scoring path와 current engine-match variant sanitizer에서 모두 제거된 역사 표면입니다. 회귀 확인은 retirement smoke로만 유지합니다. | Stage 156/168, `js/ai/evaluator.js`, `js/ai/search-engine.js`, `tools/engine-match/lib-profile-variants.mjs`, `js/test/stage156_move_ordering_edge_corner_split_smoke.mjs` |
| 역사 | retired된 stage157 비채택 mainline candidate keys | `s157-main-order-only`, `s157-main-mpc-only`, `s157-main-anchor`, `s157-main-tight-probe`, `s157-main-exact-safe`, `s157-main-soft-both`는 direct-pair 비채택 후 보고서 기록만 남기고 현재 runtime candidate registry/decision pack에서 제거했습니다. | Stage 157/168, `tools/evaluator-training/stage157-structural-candidates.mjs`, `tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs`, `js/test/stage168_stage157_runtime_closeout_smoke.mjs` |
| 역사 | retired된 stage158 비채택 mainline candidate keys | `s154-anchor-main`, `s154-stable-quiet`, `s154-stable-quiet-probe`, `s154-stable-zebra-open`, `s154-zebra-both-probe`는 direct-pair 및 reinforced retest 판정 후 보고서 기록만 남기고 현재 active candidate registry/decision pack에서 제거했습니다. `s154-stable-zebra`만 deferred survivor로 남겨 두었습니다. | Stage 158/169, `tools/evaluator-training/stage158-structural-candidates.mjs`, `tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs`, `js/test/stage169_stage158_runtime_retirement_smoke.mjs` |
| 역사 | retired된 stage176 survivor branch candidate keys | `s176-main-wide-zebra-bothlite`, `s176-main-wide-zebra-midtrim`, `s176-main-wide-assertive`, `s176-main-assertive-both-lite`, `s176-main-frontier-bothlite-parity`, `s176-main-frontier-bothlite-topk2`는 staggered session과 Stage 181 trineutron finals closeout 이후 보고서 기록만 남기고 현재 active candidate registry에서 제거했습니다. | Stage 176/181/182, `tools/evaluator-training/stage176-survivor-branch-candidates.mjs`, `docs/reports/review/review-stage-182-stage176-finals-failure-analysis-and-next-directions.md`, `js/test/stage182_stage176_runtime_closeout_smoke.mjs` |

### 5. 오프닝 체계

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | 소형 opening book | 111개 seed line 기반 소형 책 유지 | Stage 54, `js/ai/opening-book*.js` |
| 활성 | factorized compact opening prior | `factorized-binary-varint-v1` 런타임 prior 모듈 연결 | Stage 55, 151, `js/ai/opening-prior*.js` |
| 활성 | opening hybrid tuning | confidence gate / direct use / ordering bias 조합 | Stage 56~59, `js/ai/opening-tuning.js` |
| 활성 | prior contradiction veto | 기본 hybrid key `stage59-cap9-prior-veto`에 포함, Stage 123 replay revalidation에서도 기본값 유지 확인 | Stage 59, 123, `js/ai/opening-tuning.js` |
| 활성 | opening randomness / search randomness 분리 | 초반과 중후반 무작위성 제어를 분리 | Stage 59, `js/ai/presets.js` |
| 활성 | zero-randomness opening tie-band | hard/expert/impossible 프리셋은 `openingRandomness=0`이어도 거의 동점인 오프닝 분기만 제한적으로 무작위 허용하고, custom에서는 explicit tie-break toggle로 같은 동작을 고를 수 있음 | Stage 98, 128, `js/ai/search-engine.js`, `js/ai/presets.js` |

### 6. 사용자 노출 설정 / 안전 장치

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | detail custom setting dialogs | 메인 설정 화면에서는 사용자 지정 수치를 직접 노출하지 않고, 난이도/스타일 상세 대화상자에서 number/select 기반 입력을 렌더링합니다. classic 계열에는 `클래식 읽기 성향` 선택지도 포함됩니다. | Stage 126~129, 168, `js/ui/settings-panel-view.js`, `js/ui/settings-search-algorithm-presentations.js`, `js/ai/runtime-engine-variants.js` |
| 활성 | custom 전용 엔진 수치 적용 | custom이 아닐 때는 프리셋 우선 | `js/ai/presets.js`, `js/main.js` |
| 활성 | WLD pre-exact 변경 시 TT 무효화 | 의미가 바뀌는 옵션 변경에 대해 TT 즉시 비움 | Stage 83, `js/main.js`, `js/ai/search-engine.js` |
| 활성 | 설정 쿠키 저장/복원/초기화 | 현재 설정을 cookie에 저장해 다음 로드에 복원하고, 초기화 시 다음 로드부터 기본값으로 되돌림 | Stage 127, `js/ui/settings-cookie-store.js`, `js/ui/settings-panel-view.js`, `js/ui/app-controller.js` |
| 활성 | UI-only 설정 변경 시 AI 재시작 방지 | theme/accessibility 변경이 search runtime을 불필요하게 건드리지 않음 | Stage 83, `js/main.js` |
| 활성 | 설정 요약 수동 재낭독 | 설정 변경 시 자동 낭독 제거, 사용자 요청 시에만 현재 설정을 읽음 | Stage 98, `js/ui/settings-panel-view.js`, `js/ui/app-controller.js` |

## 도구 / 검증 / 배포 체크리스트

| 상태 | 항목 | 현재 상태 | 주요 파일 |
| --- | --- | --- | --- |
| 도구 | evaluator 학습 파이프라인 | ridge regression, generated module export, holdout 검증, Stage 126 user-executable richer-corpus bundle wrapper/config 유지 | `tools/evaluator-training/*`, `tools/evaluator-training/run-stage126-weight-learning-bundle.mjs`, `tools/evaluator-training/examples/stage126-compact-tuple-richer-corpus.train-plus-bench.example.json` |
| 도구 | move-ordering 튜닝/재생성 | local search, benchmark replay, profile merge 도구 유지 | `tools/evaluator-training/*`, `benchmarks/*` |
| 도구 | opening hybrid benchmark/replay | reference suite 비교와 replay 도구 유지, Stage 123 default revalidation orchestrator 추가 | `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`, `tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs`, `tools/benchmark/run-stage123-opening-default-revalidation-benchmark.mjs`, `benchmarks/stage123_opening_default_revalidation_benchmark_20260412.json` |
| 도구 | compact tuple family pilot / size estimate | Stage 125 bounded pilot까지 완료. default adoption은 no-adoption이지만, Stage 126에서 richer external corpus 재시도용 bundle과 patch follow-up config를 추가해 user-executable learning lane으로만 유지 | `tools/evaluator-training/estimate-tuple-layout-candidate-sizes.mjs`, `tools/evaluator-training/run-tuple-layout-family-pilot.mjs`, `tools/evaluator-training/run-multi-candidate-training-suite.mjs`, `tools/evaluator-training/run-tuple-patch-suite.mjs`, `tools/evaluator-training/run-stage126-weight-learning-bundle.mjs`, `tools/evaluator-training/examples/stage126-compact-tuple-richer-corpus.train-plus-bench.example.json`, `tools/evaluator-training/examples/stage126-compact-tuple-patch-followup.example.json`, `tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs`, `benchmarks/stage124/stage124_tuple_layout_candidate_size_summary.json`, `benchmarks/stage125/stage125_compact_tuple_family_pilot_decision_summary_20260412.json` |
| 도구 | engine match harness | Trineutron 비교/대전 도구 유지, per-variant engine-options JSON과 ordering 전용 pattern scale split 실험 지원 | `tools/engine-match/*`, `third_party/trineutron-othello/*` |
| 도구 | package slimming | runtime/trainer 패키지 생성과 용량 분석 유지 | `tools/package/*` |
| 도구 | report inventory generator | 보고서 인덱스를 수동 관리 대신 생성물로 유지 | `tools/docs/generate-report-inventory.mjs` |
| 도구 | 문서 동기화 점검 | `stage-info.json`, README, runtime reference, checklist, generated inventory의 Stage 표기를 검사 | `tools/docs/check-doc-sync.mjs` |
| 도구 | 코어 회귀 | core smoke / perft / stage80~81 ETC hotpath reuse / stage83 custom WLD smoke / stage86 stability smoke / stage122 allocation-light move path smoke / stage123 opening default revalidation smoke / stage125 compact tuple bounded pilot smoke / stage126 settings split/style support / stage127 cookie / stage128 opening tie-break-depth gate / stage129 settings presentation smoke / stage132 classic MTD(f) driver / stage136 balanced13 bundle / stage137~139 classic search adoption / stage142 trineutron mode smoke / stage143 release default smoke / stage145 compatibility replay / stage146 final adoption gate / stage147 install + post-adoption validation / stage156 ordering split override smoke / stage167 factorized pattern-bank export smoke / stage168 stage157 runtime closeout smoke / stage168 runtime variant smoke / stage169 stage158 retirement smoke / stage182 stage176 branch retirement smoke / stage192 runtime kernel default smoke / stage195 lazy prepared move smoke / stage196 tokenized prepared core smoke / stage197 lightweight exact-tail smoke / stage198 compact prepared flip-token pilot smoke / stage199 WLD tail bundle smoke / stage200 exact last-flip smoke / stage201 exact selective gate smoke / stage202 WLD refinement smoke / stage203 search hotpath no-adoption smoke / stage204 phase2 closeout smoke 유지 | `js/test/core-smoke.mjs`, `js/test/perft.mjs`, `js/test/stage80_etc_hotpath_cleanup_smoke.mjs`, `js/test/stage81_etc_child_tt_reuse_smoke.mjs`, `js/test/stage83_custom_wld_toggle_smoke.mjs`, `js/test/stage86_stability_hotpath_smoke.mjs`, `js/test/stage122_allocation_light_search_moves_smoke.mjs`, `js/test/stage123_opening_default_revalidation_smoke.mjs`, `js/test/stage125_compact_tuple_family_pilot_smoke.mjs`, `js/test/stage126_custom_setting_groups_smoke.mjs`, `js/test/stage126_search_engine_custom_style_support_smoke.mjs`, `js/test/stage127_settings_cookie_smoke.mjs`, `js/test/stage128_opening_tie_randomization_smoke.mjs`, `js/test/stage128_classic_depth_gate_smoke.mjs`, `js/test/stage129_settings_ui_presentation_smoke.mjs`, `js/test/stage132_classic_mtdf_search_driver_smoke.mjs`, `js/test/stage136_balanced13_support_stack_bundle_smoke.mjs`, `js/test/stage137_mtdf_root_light_probe_smoke.mjs`, `js/test/stage138_pvs_aspiration_defaults_smoke.mjs`, `js/test/stage139_mtdf_etc_suppression_smoke.mjs`, `js/test/stage142_trineutron_algorithm_modes_smoke.mjs`, `js/test/stage143_release_defaults_smoke.mjs`, `js/test/stage145_move_ordering_compatibility_replay_smoke.mjs`, `js/test/stage146_final_compact_tuple_adoption_gate_smoke.mjs`, `js/test/stage147_runtime_install_post_adoption_validation_smoke.mjs`, `js/test/stage156_move_ordering_edge_corner_split_smoke.mjs`, `js/test/stage167_factorized_pattern_bank_export_smoke.mjs`, `js/test/stage168_stage157_runtime_closeout_smoke.mjs`, `js/test/stage168_stage154_runtime_variant_smoke.mjs`, `js/test/stage169_stage158_runtime_retirement_smoke.mjs`, `js/test/stage182_stage176_runtime_closeout_smoke.mjs`, `js/test/stage192_runtime_kernel_defaults_smoke.mjs`, `js/test/stage195_lazy_prepared_search_moves_smoke.mjs`, `js/test/stage196_tokenized_prepared_search_move_core_smoke.mjs`, `js/test/stage197_lightweight_few_empties_exact_move_path_smoke.mjs`, `js/test/stage198_compact_prepared_search_move_flips_smoke.mjs`, `js/test/stage199_few_empties_wld_tail_bundle_smoke.mjs`, `js/test/stage200_specialized_few_empties_last_flip_path_smoke.mjs`, `js/test/stage201_few_empties_exact_fastest_first_selective_gate_smoke.mjs`, `js/test/stage202_few_empties_wld_tail_refinement_bundle_smoke.mjs`, `js/test/stage203_tt_first_deferred_move_list_build_smoke.mjs`, `js/test/stage204_phase2_runtime_closeout_smoke.mjs`, `js/test/stage126_weight_learning_bundle_smoke.mjs` |
| 도구 | special-ending 회귀셋 | stage94~98 스모크와 공통 픽스처를 통해 classic/MCTS trap 회귀 유지 | `js/test/stage94_special_ending_scout_smoke.mjs`, `js/test/stage95_immediate_wipeout_guard_smoke.mjs`, `js/test/stage96_mcts_immediate_wipeout_bias_smoke.mjs`, `js/test/stage97_mcts_root_threat_penalty_smoke.mjs`, `js/test/stage98_special_ending_regression_suite.mjs`, `js/test/special-ending-regression-helpers.mjs` |
| 도구 | 브라우저 UI 스모크 | 번들/원본 모듈 로드 스모크 유지 | `tests/ui_smoke.py`, `tests/virtual_host_smoke.py` |

## 현재 기본 런타임에 남기지 않은 것

| 상태 | 항목 | 현재 판단 |
| --- | --- | --- |
| 역사 | `stabilityCutoff*` 런타임 pruning 토글 | 보고서에는 남기되 기본 런타임에서는 제거 |
| 역사 | `exactFastestCutFirstOrdering` 별도 토글 | 채택된 exact fastest-first 경로만 남기고 별도 토글 제거 |
| 역사 | 강한 프리셋 자동 WLD `+2` | Stage 83에서 default/custom 정책 정리 후 custom 선택형만 유지 |
| 범위 밖 | proof-number search / PN·PPN full mode, transposition-aware MCTS graph, RAVE/AMAF 등 더 무거운 실험 lane | 보고서/검토 문서에서는 추적하되 현재 기본 런타임에는 남기지 않음 |
| 역사 | 추가 MCTS late-lane retuning | Stage 118/119 closeout 이후 새 구조적 아이디어 전까지 비재개 권고 |
| 역사 | 독립 move-ordering 재튜닝 | Stage 45 freeze 이후 새 evaluator family 채택이 있기 전까지 비재개 권고 |
| 역사 | broad hand-crafted evaluator 확장 | Stage 13 이후 data-driven lane 우선, 현재는 cleanup 외 broad 확장 비재개 권고 |
| 역사 | 5–8 empties beyond current lightweight exact-tail path 추가 확대 | Stage 197 threshold `8` + lightweight exact-tail path 채택 이후, 그보다 넓은 micro-specialization은 새 profiling hotspot이 생기기 전까지 비재개 권고 |
| 역사 | broad special-ending 확장 | Stage 98 regression maintenance 단계로 정리, 새 trap corpus가 나오기 전까지 비재개 권고 |
| 역사 | compact systematic short n-tuple family default adoption | Stage 125 bounded pilot을 실제로 돌렸지만 no-adoption으로 종료. Stage 126에서는 richer external corpus / larger offline budget이 있을 때만 다시 돌릴 수 있도록 user-executable bundle을 추가했고, 기본 런타임은 그대로 유지 |
| 역사 | stage170/176 mixed-overlay structural survivor lane | internal bracket에서는 살아남았지만 Stage 181 trineutron finals에서 vanilla stage154-main / stage154-both baseline을 넘지 못해, 현재 기본 런타임에는 남기지 않습니다. 동일 lane 재개는 새 external signal이 생길 때만 권고됩니다. |

## 이 문서를 읽는 순서
1. **현재 무엇이 실제 살아 있는지**만 보려면 이 문서를 먼저 확인합니다.
2. 구조와 역할까지 알고 싶으면 `../../runtime-ai-reference.md`를 엽니다.
3. 문서 전체 목록과 최신 구현 보고서 진입점이 필요하면 `../report-inventory.generated.md`를 엽니다.
4. 특정 채택/비채택 근거가 궁금하면 해당 Stage 구현/검토 보고서로 내려갑니다.
