# Stage 156 - move-ordering edge/corner split candidate gate, direct override plumbing fix, and repository closeout

## 요약
이번 단계의 목표는 다음 세 가지였습니다.

1. `moveOrderingEdgePatternScale`, `moveOrderingCornerPatternScale`처럼 **move-ordering 전용 edge/corner scale**을 따로 줄 수 있게 런타임/벤치 표면을 정리한다.
2. 그 후보를 active / main-recenter에 실제로 붙여 **외부 기준(Trineutron)** 으로 채택 여부를 판정한다.
3. 결과를 바탕으로 문서화, 버전 동기화, 저장소 closeout까지 마무리한다.

결론은 다음과 같습니다.

- **채택한 것**
  - `Evaluator`, `SearchEngine`, engine-match 도구에 `moveOrderingEdgePatternScale`, `moveOrderingCornerPatternScale` 지원을 추가했습니다.
  - `presetKey: 'custom'`, `styleKey: 'balanced'`처럼 explicit custom 옵션을 쓸 때도 top-level scale override가 실제 runtime option으로 남도록 **direct experimental scale override plumbing**을 고쳤습니다.
  - `benchmark-vs-trineutron`, `lib-profile-variants`가 per-variant engine-options JSON을 통해 ordering 전용 scale split 후보를 바로 불러올 수 있게 정리했습니다.
  - `stage156_move_ordering_edge_corner_split_smoke.mjs`를 추가해 main evaluator와 move-ordering evaluator의 scale 분리 동작, SearchEngine option fallback/override 동작을 모두 스모크로 고정했습니다.
  - `stage-info.json`, README, runtime reference, checklist, generated inventory를 Stage 156 기준으로 다시 맞췄습니다.
- **채택하지 않은 것**
  - active 기본 runtime을 `ordering-only edge/corner off` 후보로 교체하는 것
  - main-recenter 기본 candidate를 ordering-only split 버전으로 승격하는 것
  - 새 evaluator family 채택 없이 move-ordering 한 축만 더 미는 추가 재튜닝
- **현재 기본 strength 변화**
  - 없습니다.
  - 이번 단계는 **새 옵션/도구 표면과 실험 plumbing을 정리**한 뒤, external gate에서 이득이 확인되지 않아 기본값을 유지하는 closeout 단계입니다.

## 구현한 코드 변경
### 1. evaluator / runtime
- `js/ai/evaluator.js`
  - move-ordering 전용 scale resolver 추가
  - main evaluator는 기존 `edgePatternScale`, `cornerPatternScale`를 그대로 쓰고
  - move-ordering evaluator는 `moveOrderingEdgePatternScale`, `moveOrderingCornerPatternScale`가 있으면 그것을 우선 사용하고, 없으면 main scale로 fallback하도록 정리했습니다.
- `js/ai/search-engine.js`
  - 새 옵션 키를 runtime option table에 추가했습니다.
  - direct custom option path에서 top-level scale override가 preset/style 해석 뒤에도 살아남도록 explicit sanitizer/fallback 할당을 보강했습니다.

### 2. engine-match / benchmark 표면
- `tools/engine-match/lib-profile-variants.mjs`
  - per-variant `engineOptionsJson`, `engineOptions` 지원 확장
  - ordering 전용 split scale 옵션이 variant override로 전달되도록 허용 목록을 갱신했습니다.
- `tools/engine-match/benchmark-vs-trineutron.mjs`
  - custom/profile variant가 pattern-bank lane과 engine-options JSON을 함께 받을 수 있게 정리했습니다.
  - active / custom candidate 비교 시 ordering split 옵션을 별도 JSON으로 바로 실험할 수 있습니다.

### 3. 스모크 테스트
- `js/test/stage156_move_ordering_edge_corner_split_smoke.mjs`
  - main evaluator score가 ordering-only override에 의해 바뀌지 않는지
  - move-ordering score는 실제로 달라지는지
  - SearchEngine이 main scale fallback과 ordering 전용 explicit override를 올바르게 유지하는지
  - 세 가지를 한 번에 고정했습니다.

## 확인된 중요한 버그 수정
이번 단계에서 실제로 의미 있는 수정은 **direct experimental scale override plumbing fix**였습니다.

기존 explicit custom path에서는 top-level scaler override가 `preset/style -> custom` 해석 뒤에 일부 경우 제대로 남지 않아,
`edgePatternScale`, `cornerPatternScale`처럼 실험용으로 직접 넘긴 값이 기대와 다르게 baseline/default 쪽으로 흘러갈 여지가 있었습니다.

Stage 156에서는 이 경로를 정리해,
향후 external-gated retuning은 **이제의 explicit override path를 기준선**으로 삼는 편이 맞습니다.

이 수정이 과거 모든 결과를 무효화한다고 보기는 어렵지만,
최소한 **앞으로의 search/evaluator co-tuning 실험은 Stage 156 이후 경로를 기준으로 다시 보는 것이 안전**합니다.

## 벤치 결과
### 1. throughput 방향
대표 throughput 비교 결과는 다음과 같았습니다.

#### 80ms PVS micro compare
- `active`: depth `2.75`, `3.93 nodes/ms`
- `active-ordering-off`: depth `3.50`, `10.49 nodes/ms`
- `main-recenter`: depth `3.50`, `7.60 nodes/ms`
- `main-recenter-ordering-off`: depth `3.50`, `6.51 nodes/ms`

#### 280ms PVS micro compare
- `active`: depth `4.00`, `11.99 nodes/ms`
- `active-ordering-off`: depth `4.00`, `12.54 nodes/ms`
- `main-recenter`: depth `4.00`, `8.87 nodes/ms`
- `main-recenter-ordering-off`: depth `4.00`, `8.93 nodes/ms`

즉 ordering-only edge/corner off는 **일부 시간 창에서 처리량 이득**을 보였습니다.
하지만 이것만으로 채택할 수는 없고, 외부 기준 strength가 같이 올라가야 합니다.

### 2. external gate (Trineutron, PVS, 80ms, 4 openings × 2 colors)
#### active baseline vs active ordering-off
- `active-pvs`: `7/8`, 평균 disc diff `+12.50`
- `active-ordering-off-pvs`: `6/8`, 평균 disc diff `+8.75`

즉 active에서는 **ordering-only split이 baseline보다 약했습니다.**

#### main_recenter baseline vs main_recenter ordering-off
- `main-recenter-pvs`: `6.5/8`, 평균 disc diff `+16.75`
- `main-recenter-ordering-off-pvs`: `6.5/8`, 평균 disc diff `+12.50`

main-recenter에서는 score rate가 같았지만, 평균 margin은 ordering-off가 더 나빴습니다.
즉 **점수율 개선도, margin 개선도 확인되지 않았습니다.**

## 판정
이번 candidate의 판정은 명확합니다.

- **기본 active 유지**
- **ordering-only edge/corner split 기본 채택 보류**
- **새 옵션/도구 표면과 direct override fix는 유지**

이유는 간단합니다.

1. throughput은 올라가도 external gate score rate가 같이 오르지 않았습니다.
2. active에서는 baseline이 더 강했고, main-recenter에서는 tie 이상을 만들지 못했습니다.
3. 지금 evaluator family들은 자신에게 맞는 move-ordering / tuple / MPC 보정을 아직 따로 받지 않은 상태입니다.
   즉 한 축만 떼어 조정하는 접근은 이미 한계를 드러낸 것으로 보는 편이 맞습니다.

## 다음 라운드 방향 (이번 Stage에서는 실행하지 않음)
사용자 지적대로, main이나 split_late3 계열은 자신에게 맞는 move-ordering / tuple / MPC 보정을 별도로 받지 않은 상태입니다.
과거 active도 결국 Stage 136 규모의 support-stack retuning을 거친 뒤에야 원본을 안정적으로 넘었습니다.

그래서 다음 라운드에서는 다음 방향이 더 자연스럽습니다.

1. **새 evaluator family를 선택한다.**
   - main 계열이든 다른 family든 우선 evaluator 축을 정한다.
2. **그 family 전용 support stack을 함께 재학습/재보정한다.**
   - move-ordering
   - tuple residual 또는 replacement lane
   - MPC filter / calibration
   - 필요 시 search driver / scale/bias
3. **external gate를 first-class 조건으로 둔다.**
   - self-play나 micro-throughput보다 external engine gate를 먼저 통과해야 한다.

즉 다음 단계는 작은 knob 하나를 더 비트는 방식보다는,
**evaluator + move-ordering + tuple + MPC를 함께 보는 retuning round**로 가는 편이 맞습니다.

이번 대화에서는 그 대공사를 시작하지 않고, 여기까지를 closeout으로 남기는 것이 더 적절합니다.

## 검증
이번 closeout에서 확인한 핵심 명령은 다음과 같습니다.

```bash
node --check js/ai/evaluator.js
node --check js/ai/search-engine.js
node --check tools/engine-match/lib-profile-variants.mjs
node --check tools/engine-match/benchmark-vs-trineutron.mjs
node js/test/stage156_move_ordering_edge_corner_split_smoke.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
node tools/docs/check-doc-sync.mjs
```

대표 산출물은 다음 경로에 남겼습니다.

- `benchmarks/stage156_profile_throughput_ordering_split.json`
- `benchmarks/stage156/trineutron_active_pvs_80ms_4openings_seed17.json`
- `benchmarks/stage156/trineutron_active_ordering_off_pvs_80ms_4openings_seed17.json`
- `benchmarks/stage156/trineutron_main_recenter_pvs_80ms_4openings_seed17.json`
- `benchmarks/stage156/trineutron_main_recenter_ordering_off_pvs_80ms_4openings_seed17.json`
- `benchmarks/stage156/stage156_ordering_split_candidate_summary_20260415.json`

## 결론
Stage 156의 의미는 새로운 strength 후보를 채택한 데 있지 않습니다.

이번 단계는

1. move-ordering 전용 edge/corner scale split을 runtime/tooling에 안전하게 올리고,
2. explicit direct override path를 고쳐 다음 실험의 기준선을 바로잡고,
3. external gate에서 채택 이득이 없음을 확인한 뒤,
4. 문서/버전/인벤토리를 다시 맞춰 저장소를 clean closeout 상태로 만든

**실험 plumbing 정리 + no-adoption 판정 + 문서화 마감 단계**입니다.

즉 현재 저장소 기준선은
**“factorized opening prior가 이미 설치된 active runtime을 유지하고, move-ordering 전용 split scale은 다음 co-tuning round를 위한 실험 표면으로만 남긴다.”**
로 읽으면 됩니다.
