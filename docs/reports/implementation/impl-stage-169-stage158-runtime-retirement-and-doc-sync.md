# Stage 169 - stage158 verdict closeout, retired candidate pruning, and documentation sync

## 요약
이번 단계의 목표는 stage158 direct-pair / reinforced retest 결론을 **현재형 registry / decision pack / 문서 기준선**에 반영하는 것이었습니다.

핵심 결론은 네 가지입니다.

1. stage158 mainline 후보의 최종 판정을 정리해 **`s154-stable-zebra`만 survivor**로 남겼습니다.
2. 비채택 stage158 mainline 후보는 보고서 기록은 유지하되, **active candidate registry / current decision pack에서는 retired** 상태로 분리했습니다.
3. stage154 설치 기본 runtime과 stage157 live support set은 그대로 유지하고, stage158 survivor도 아직 installed default나 runtime variant로 승격하지 않았습니다.
4. `stage-info.json`, README, runtime reference, checklist, decision pack, report inventory를 **Stage 169 기준**으로 다시 동기화했습니다.

즉 이번 Stage는 새 runtime winner를 바로 승격하는 단계가 아니라,  
**stage158 판정 결과를 보수적으로 반영하고 다음 세션 결정을 위한 기준면을 깨끗하게 정리하는 closeout 단계**입니다.

## 1. stage158 최종 판정 요약

| 후보 | 최종 판정 | closeout 후 상태 |
| --- | --- | --- |
| `s154-control` | control | active registry 유지 |
| `s154-stable-zebra` | 채택 | active registry 유지, deferred survivor |
| `s154-anchor-main` | 비채택 | 보고서 기록만 유지 |
| `s154-stable-quiet` | 비채택 | 보고서 기록만 유지 |
| `s154-stable-quiet-probe` | 보류 → reinforced retest 후 비채택 | 보고서 기록만 유지 |
| `s154-stable-zebra-open` | 비채택 | 보고서 기록만 유지 |
| `s154-zebra-both-probe` | 보류 → reinforced retest 후 비채택 | 보고서 기록만 유지 |

따라서 stage158 mainline의 **현재형 active registry**는 아래 두 개만 남깁니다.

- `s154-control`
- `s154-stable-zebra`

여기서 `s154-stable-zebra`는 reinforced retest까지 통과한 survivor이지만,
이번 Stage에서는 **다음 세션 결정을 기다리는 deferred survivor**로만 유지합니다.
stage157 survivor들과의 조합 또는 승격 방식은 아직 닫지 않았습니다.

## 2. stage158 candidate registry refactor
`tools/evaluator-training/stage158-structural-candidates.mjs`를 아래 세 그룹으로 분리했습니다.

- `STAGE158_ACTIVE_MAINLINE_CANDIDATES`
- `STAGE158_RETIRED_MAINLINE_CANDIDATES`
- `STAGE158_DEFERRED_LATE3_CANDIDATES`

그리고 다음 의미론을 추가했습니다.

- `listStage158StructuralCandidates()`는 기본적으로 retired key를 숨깁니다.
- `resolveStage158StructuralCandidate()`는 retired key에 대해 기본적으로 오류를 던집니다.
- historical reproduction이 필요한 도구만 `allowRetired: true` 또는 `includeRetired: true`로 명시적으로 opt-in 합니다.

이 분리 덕분에 “현재형 mainline 후보”와 “기록용 historical 후보”가 같은 표면에 섞이지 않게 됐습니다.

## 3. historical reproduction 경로 보존
retired key를 live registry에서 제거하더라도, 기존 stage15x 재현 도구는 계속 동작해야 했습니다.
그래서 다음 스크립트는 historical opt-in을 명시적으로 허용하도록 수정했습니다.

- `tools/engine-match/prepare-stage15x-main-benchmark-pack.mjs`
- `tools/engine-match/prepare-stage15x-round6-base-overlay.mjs`
- `tools/evaluator-training/run-stage158-structural-candidate-smoke.mjs`

특히 stage158 smoke 러너는 `--include-retired`를 추가했고,
기본 동작은 active registry만 보되 historical 재현 시에만 retired key를 다시 포함할 수 있게 정리했습니다.

## 4. current decision pack 재생성
`tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs`를 Stage 169 기준으로 다시 돌렸습니다.

closeout 후 `tools/engine-match/out/stage169-stage157-158-mainline-decision-pack/manifest.json`의 상태는 다음과 같습니다.

- stage157 후보: `s157-main-wide-hybrid`, `s157-main-frontier-gate`, `s157-main-assertive-both`
- stage158 후보: `s154-stable-zebra`

즉 stage157 채택 mainline overlays는 그대로 유지하고,
stage158에서는 **survivor 한 개만 current decision lane에 남겼습니다.**

## 5. 설치 기본 runtime은 유지
중요한 점은, 이번 closeout은 **설치 기본 generated module 교체 작업이 아닙니다.**

- installed runtime generated module: 계속 `stage154 main-recenter`
- installed runtime move-ordering/MPC profile: 계속 `stage154-main-recenter__move-ordering__balanced`, `stage154-main-recenter__runtime-mpc__overlapHighTight`
- search skeleton structure profile default key: 계속 move-ordering/MPC 모두 `baseline-v1`
- classic runtime variant catalog: 계속 기본 추천(stage154 main) / 확장 후보형(stage154 both) 두 갈래 유지

즉 이번 단계는 **판정 반영과 current support surface 정리**이지,
stage158 survivor를 기본 runtime winner로 승격하는 단계가 아닙니다.

## 6. 문서 / 체크리스트 / 버전 동기화
아래 파일들을 Stage 169 기준으로 갱신했습니다.

- `stage-info.json`
- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/implementation/impl-stage-169-stage158-runtime-retirement-and-doc-sync.md`
- `docs/reports/review/review-stage-169-stage158-verdict-summary-and-retired-candidate-pruning.md`
- `docs/reports/report-inventory.generated.{md,json}`

문서에서 맞춘 핵심 문구는 아래와 같습니다.

- stage157 adopted set은 그대로 유지
- stage158 mainline은 `s154-stable-zebra`만 survivor로 남김
- 비채택 stage158 mainline key는 report-only historical surface로 유지
- 설치 기본 runtime과 stage154 classic variant catalog는 바꾸지 않음
- stage157~158 survivor의 후속 승격/통합 방식은 다음 세션에서 결정

## 7. 검증
이번 closeout에서 확인한 대표 검증은 다음과 같습니다.

```bash
node tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs
node js/test/stage168_stage157_runtime_closeout_smoke.mjs
node js/test/stage168_stage154_runtime_variant_smoke.mjs
node js/test/stage169_stage158_runtime_retirement_smoke.mjs
node js/test/stage158_move_ordering_external_hints_smoke.mjs
node js/test/stage158_mpc_zebra_ladder_smoke.mjs
node js/test/core-smoke.mjs
node tools/docs/check-doc-sync.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
```

closeout 전용 smoke에서는 아래를 직접 확인했습니다.

- stage158 active mainline set이 `s154-control + s154-stable-zebra`로만 남아 있다.
- 비채택 5개 mainline key는 기본 live registry에서 resolve되지 않는다.
- `allowRetired: true`를 쓰면 historical reproduction은 계속 가능하다.
- regenerated stage169 decision pack의 stage158 후보는 `s154-stable-zebra` 하나뿐이다.
- stage157 adopted decision-lane candidate는 변하지 않는다.

## 8. 결론
이번 Stage로 stage158은 아래 상태로 정리됐습니다.

- direct-pair / reinforced retest 판정을 current registry에 반영
- 비채택 후보는 historical-only surface로 정리
- survivor 한 개만 deferred 상태로 남김
- 설치 기본 runtime은 보수적으로 유지
- 다음 세션에서 stage157~158 survivor 처리 결정을 이어갈 수 있는 기준면 확보

즉, Stage 169는  
**“stage158 verdict를 runtime/tooling/doc 기준선에 반영하되, survivor 승격은 서두르지 않고 한 단계 보류한 정리 단계”**
로 읽으면 됩니다.
