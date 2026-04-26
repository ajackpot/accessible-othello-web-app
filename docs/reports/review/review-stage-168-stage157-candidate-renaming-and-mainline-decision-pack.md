# Stage168 follow-up: stage157 candidate renaming and mainline decision-pack prep

## 목적
이번 단계의 목적은 두 가지였습니다.

1. stage157 structural candidate key를 **stage 번호 기준으로 읽히는 이름**으로 다시 정리한다.
2. 이후 stage157 -> stage158 후보를 **`s154-main`, `s154-both` 상대로 80/160/240ms direct pair**로 순차 판정할 수 있게 mainline decision pack을 준비한다.

stage151 late3 family는 현재 우선순위가 낮으므로, 실제 판정용 준비물은 stage154 mainline lane에만 맞췄습니다.

## 1. stage157 key 정리
기존 stage157 후보는 후보 스테이지가 157인데 key는 `s154-*`, `s151-*`라서
현재 baseline인 `s154-main`, `s154-both`와 이름이 지나치게 충돌했습니다.

이번 단계에서는 canonical key를 다음처럼 바꿨습니다.

### stage154 mainline family
- `s154-control` -> `s157-main-control`
- `s154-order-main` -> `s157-main-order-only`
- `s154-mpc-main` -> `s157-main-mpc-only`
- `s154-main` -> `s157-main-anchor`
- `s154-tight-probe` -> `s157-main-tight-probe`
- `s154-wide-hybrid` -> `s157-main-wide-hybrid`
- `s154-exact-safe` -> `s157-main-exact-safe`
- `s154-frontier-gate` -> `s157-main-frontier-gate`
- `s154-soft-both` -> `s157-main-soft-both`
- `s154-assertive-both` -> `s157-main-assertive-both`

### stage151 late3 family
- `s151-control-full` -> `s157-late3-control-full`
- `s151-main-full` -> `s157-late3-anchor-full`
- `s151-noend-main` -> `s157-late3-anchor-noend`
- `s151-latea-main` -> `s157-late3-anchor-latea`
- `s151-probe-noend` -> `s157-late3-noend-probe`
- `s151-linearizer-noend` -> `s157-late3-noend-linearizer`
- `s151-linear-only` -> `s157-late3-linear-only`
- `s151-parity-verify` -> `s157-late3-noend-parity-verify`
- `s151-soft-both-noend` -> `s157-late3-noend-soft-both`
- `s151-full-both` -> `s157-late3-full-both`

중요한 점은 **historical alias를 그대로 살려 두었다**는 것입니다.
즉 기존 문서/스크립트/메모가 아직 옛 key를 넘겨도 `resolveStage157StructuralCandidate()`에서 canonical key로 해석됩니다.

## 2. 문서와 smoke usage 갱신
다음 문서를 함께 갱신했습니다.

- `docs/reports/review/review-stage-157-structural-candidate-priority.md`
  - 우선순위와 후보 목록을 canonical key 기준으로 재기록
  - `s154-*`, `s151-*`는 historical alias라는 점 명시
- `tools/evaluator-training/run-stage157-structural-candidate-smoke.mjs`
  - usage 예시를 canonical key로 갱신
- `tools/evaluator-training/run-stage158-structural-candidate-smoke.mjs`
  - stage158 usage 예시를 실제 anchor key(`s154-anchor-main`, `s151-anchor-noend`)로 갱신

## 3. mainline decision pack 추가
다음 스크립트를 추가했습니다.

### A. `tools/engine-match/prepare-stage157-158-mainline-decision-pack.mjs`
이 스크립트는 다음을 생성합니다.

- 기준 baseline
  - `s154-main`
  - `s154-both`
- stage157 mainline 후보(stage154 family, control 제외)
- stage158 mainline 후보(stage154 family, control 제외)
- 각 후보를 두 baseline 위에 overlay한 `engine-options/*.json`
- 전체 판정 순서/기본 조건을 담은 `manifest.json`

기본 조건은 다음으로 고정했습니다.

- search algorithm: `classic`
- time list: `80,160,240`
- opening plies: `20`
- seeds: `17,31,53,71`
- paired openings per seed: `1`
- maxDepth: `6`
- exactEndgameEmpties: `10`
- solverAdjudicationEmpties: `14`
- solverAdjudicationTimeMs: `60000`
- maxTableEntries: `90000`
- aspirationWindow: `60`

생성 위치:
- `tools/engine-match/out/stage168-stage157-158-mainline-decision-pack/manifest.json`

### B. `tools/engine-match/run-stage157-158-mainline-decision-pair.mjs`
이 스크립트는 후보 하나를 받아 다음을 자동 수행합니다.

1. `s154-main`, `s154-both` 각각에 overlay engine options 생성
2. 같은 baseline module을 first variant,
   baseline + candidate overlay를 second variant로 넣어
   `benchmark-profile-variant-pair.mjs`를 baseline별로 실행
3. 각 baseline에서 80/160/240ms direct pair 결과를 summary JSON/Markdown으로 정리

즉 앞으로는 다음 형태로 후보를 하나씩 판정할 수 있습니다.

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-anchor \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

## 4. 작은 wiring 검증
판정 runner가 실제로 도는지 확인하려고, 아주 작은 샘플만 먼저 실행했습니다.

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-anchor \
  --time-ms-list 80 \
  --seed-list 17 \
  --games 1 \
  --progress-every-pairs 1
```

결과:
- `s154-main` vs `s154-main + s157-main-anchor`: `1.0 / 2` 동점, nodes/ms `16.01 -> 17.24`
- `s154-both` vs `s154-both + s157-main-anchor`: `1.0 / 2` 동점, nodes/ms `15.20 -> 16.60`

이 값은 **판정 근거가 아니라 wiring smoke**입니다.
게임 수가 너무 적으므로 채택/비채택/보류 판단에는 쓰지 않습니다.
다만 중요한 점은:

- candidate overlay가 baseline 위에 정상 적용되고,
- baseline별 direct pair가 실제로 돌아가며,
- summary JSON/Markdown까지 자동 생성된다는 것

을 확인했다는 것입니다.

생성 위치:
- `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-anchor/summary.json`
- `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-anchor/summary.md`

## 5. 현재 상태
이번 단계가 끝난 시점에서,

- stage157 key 충돌은 정리되었고,
- historical alias 호환성은 유지되며,
- stage157/158 후보를 `s154-main`, `s154-both` 기준으로 80/160/240ms direct pair 판정할 준비가 끝났습니다.

즉 다음 단계부터는 **우선순위 순서대로 후보 하나씩 실제 benchmark를 돌려서 채택/비채택/보류를 기록**하면 됩니다.
