# Stage168 closeout: stage157 runtime candidate pruning and documentation resync

## 1. 배경
Stage 168 동안 stage157 mainline direct-pair 판정을 모두 끝냈습니다.
이번 closeout 단계의 목표는 그 판정 결과를 **현재형 runtime/tooling 표면**에 반영하는 것이었습니다.

범위는 아래로 제한했습니다.

- stage157 **채택** 후보만 runtime/tooling support set에 남긴다.
- stage157 **비채택** mainline 후보는 보고서 기록은 유지하되, live candidate registry와 regenerated decision pack에서는 제거한다.
- 설치 기본 generated module이나 classic runtime default는 함부로 바꾸지 않는다.
- stage158 lane은 다음 대화에서 계속한다.

## 2. 최종 판정과 runtime 상태 분리

| 후보 | direct-pair 판정 | closeout 후 상태 |
| --- | --- | --- |
| `s157-main-control` | control | live registry 유지 |
| `s157-main-wide-hybrid` | 채택 | live registry 유지 |
| `s157-main-frontier-gate` | 채택 | live registry 유지 |
| `s157-main-assertive-both` | 채택 | live registry 유지 |
| `s157-main-order-only` | 비채택 | 보고서 기록만 유지 |
| `s157-main-mpc-only` | 비채택 | 보고서 기록만 유지 |
| `s157-main-anchor` | 비채택 | 보고서 기록만 유지 |
| `s157-main-tight-probe` | 비채택 | 보고서 기록만 유지 |
| `s157-main-exact-safe` | 비채택 | 보고서 기록만 유지 |
| `s157-main-soft-both` | 비채택 | 보고서 기록만 유지 |

즉 stage157 mainline의 **현재형 live set**은 아래 네 개만 남깁니다.

- `s157-main-control`
- `s157-main-wide-hybrid`
- `s157-main-frontier-gate`
- `s157-main-assertive-both`

## 3. 코드 정리 내용

### 3.1 structure profile library 승격
`js/ai/search-structure-profiles.js`에 stage157 closeout 채택 overlay를 공식 key로 남겼습니다.

- move-ordering: `wide-hybrid-v1`
- MPC: `verify-tight-v1`

이로써 `s157-main-wide-hybrid`는 더 이상 stage157 전용 custom profile alias에 의존하지 않고, 공식 structure profile library key만으로 재구성됩니다.

기존 built-in 조합을 쓰는 채택 후보는 그대로 유지했습니다.

- `s157-main-frontier-gate` = `late-potential-frontier-v1` + `static-gate-v1`
- `s157-main-assertive-both` = `hybrid-probe-v1` + `assertive-both-v1`

### 3.2 stage157 candidate registry pruning
`tools/evaluator-training/stage157-structural-candidates.mjs`를 정리해 stage154 family mainline의 live registry를 control + 채택 3종만 남기도록 축소했습니다.

동시에 stage157 전용 custom profile map도 stage151 late3 쪽만 남기고, stage154 mainline 실험용 custom profile 표면은 closeout 기준으로 접었습니다.

### 3.3 decision pack 재생성
`tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs`를 다시 실행해 stale stage157 candidate entry를 제거했습니다.

closeout 후 `tools/engine-match/out/stage168-stage157-158-mainline-decision-pack/manifest.json`의 stage157 후보는 아래 3개만 남습니다.

- `s157-main-wide-hybrid`
- `s157-main-frontier-gate`
- `s157-main-assertive-both`

`control`은 대전 대상이 아니라 baseline 축이므로 decision pack에는 넣지 않았습니다.

### 3.4 설치 기본 runtime은 유지
중요한 점은, 이번 closeout은 **설치 기본 generated module 교체 작업이 아닙니다.**

- installed runtime generated module: 계속 `stage154 main-recenter`
- installed runtime move-ordering/MPC profile: 계속 `stage154-main-recenter__move-ordering__balanced`, `stage154-main-recenter__runtime-mpc__overlapHighTight`
- search skeleton structure profile default key: 계속 move-ordering/MPC 모두 `baseline-v1`

즉 이번 단계는 **후보 표면 정리와 공식 overlay library 정리**이지, 설치 기본 strength 재선정 단계는 아닙니다.

## 4. 문서/체크리스트/버전 동기화
아래 파일들을 현재형 closeout 상태에 맞게 갱신했습니다.

- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/review/review-stage-157-structural-candidate-priority.md`
- `stage-info.json`
- `tools/evaluator-training/run-stage157-structural-candidate-smoke.mjs`

핵심 문구는 모두 같은 방향으로 맞췄습니다.

- stage157 비채택 mainline 후보는 **보고서 기록만 유지**
- stage157 채택 mainline 후보만 **현재형 runtime/tooling support set** 유지
- stage158은 **다음 대화에서 계속**

## 5. 검증
아래 확인을 통과했습니다.

- `node tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs`
- `node js/test/stage157_move_ordering_structure_smoke.mjs`
- `node js/test/stage157_mpc_structure_smoke.mjs`
- `node js/test/stage158_move_ordering_external_hints_smoke.mjs`
- `node js/test/stage158_mpc_zebra_ladder_smoke.mjs`
- `node js/test/stage168_stage157_runtime_closeout_smoke.mjs`
- `node js/test/stage168_stage154_runtime_variant_smoke.mjs`
- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/generate-report-inventory.mjs --check`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`

특히 closeout 전용 smoke에서는 아래를 직접 확인했습니다.

- `wide-hybrid-v1`, `verify-tight-v1`가 공식 structure library key로 resolve된다.
- stage157 mainline active set이 `control + 채택 3종`으로만 남아 있다.
- 비채택 6개 mainline key는 live candidate registry에서 더 이상 resolve되지 않는다.
- `SearchEngine` 기본 structure profile key는 여전히 move-ordering/MPC 모두 `baseline-v1`이다.

## 6. 결론
이번 closeout으로 stage157은 아래 상태로 정리됐습니다.

- 채택 근거가 있는 overlay만 현재형 runtime/tooling 표면에 남김
- 비채택 후보는 보고서 기록만 남기고 live registry에서 제거
- 설치 기본 generated module과 default strength는 보수적으로 유지
- stage158 lane은 다음 대화에서 이어갈 준비 완료

즉, stage157은 이제 **판정 완료 + runtime closeout 완료** 상태로 봐도 됩니다.
