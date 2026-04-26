# Stage170 implementation - frontier-zebra both-lite MPC re-entry

## 목적
` s170-main-frontier-zebra ` hold를 빠르게 닫기 위해,
ordering-side가 아니라 **MPC-side만** 미세 조정한 마지막 보강 후보를 registry에 추가합니다.

직전 `s170-main-frontier-zebra-stabilized`는
stronger-baseline 160ms 음수를 main-lane deterioration으로 바꿔 버렸기 때문에,
다음 보강은 ordering을 건드리지 않고 **guarded Zebra ladder의 cutoff 성격만 절충**하는 방향으로 제한했습니다.

## 코드 반영
파일: `tools/evaluator-training/stage170-survivor-combo-candidates.mjs`

### 1. custom MPC profile 추가
- key: `stage170-frontier-zebra-bothlite-v1`
- 성격: guarded Zebra ladder 위에 low-cut을 **아주 제한적으로만** 열고,
  volatility guard는 original보다 더 엄격하게 둔 절충 MPC

핵심 파라미터:
- `selectionMode: 'zebra-ladder'`
- `staticEvalGateScaleHigh: 0.87`
- `staticEvalGateScaleLow: 0.92`
- `volatilityMaxEmpties: 38`
- `volatilityMaxLegalMoves: 8`
- `verificationBandScale: 0.22`
- runtime overrides:
  - `enableHighCut: true`
  - `enableLowCut: true`
  - `maxWindow: 2`
  - `maxChecksPerNode: 2`

### 2. combo candidate 추가
- key: `s170-main-frontier-zebra-bothlite`
- move-ordering source: stage157 `s157-main-frontier-gate`
- MPC source lineage: stage158 `s154-stable-zebra`
- move-ordering profile: `late-potential-frontier-v1`
- MPC profile: `stage170-frontier-zebra-bothlite-v1`

의도는 명확합니다.
- original frontier ordering의 cheap skeleton은 유지
- `s154-both 160ms` negative를 MPC-side에서만 교정
- `zebra-both`처럼 long-think collapse를 부르지 않도록 guard는 더 타이트하게 유지

## smoke 반영
파일: `js/test/stage170_survivor_combo_smoke.mjs`

- 새 candidate key가 registry에 노출되는지 확인
- `s170-main-frontier-zebra-bothlite`의 move-ordering / MPC profile 해석이 기대값과 일치하는지 확인

## 구현 의미
이번 구현은 frontier-zebra lane을 **한 번 더 보강해볼 가치가 있는 마지막 분기**를 재현 가능한 형태로 남깁니다.
이후 판정은 reinforced benchmark 결과에 따라 바로 채택 또는 lane 종료로 이어질 수 있습니다.
