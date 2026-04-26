# Stage157 structural move-ordering / MPC candidate priority

이 문서는 **새 가중치가 도착하기 전에 미리 코딩해 둘 구조 후보**를 정리한 메모입니다.
학습이 끝난 뒤에는 여기서 우선순위가 높은 후보부터 바로 external gate로 넘기면 됩니다.

## 1. 참고한 로직 힌트 요약
이번 구조 후보는 다음 계열의 공통점을 따라 설계했습니다.

- **Egaroucid / Egaroucid-web**
  - `move_ordering.hpp`에서 셀 가중치, 상대 legal 수, 잠재 legal 수(potential mobility), shallow ordering search를 함께 씁니다.
  - `probcut.hpp`에서 depth-0 eval gate 후 shallow verification search로 probcut을 수행합니다.
- **Logistello**
  - mobility / potential mobility / parity 기반의 ordering, probcut 계열 selective search를 함께 씁니다.
  - endgame fast-first 계열은 few-empties에서 sorting cost 대비 이득을 노리는 방향입니다.
- **Hanshq Othello**
  - evaluator 자체를 corner / mobility / frontier 중심으로 단순화해 late tactical cleanup에 필요한 cheap signal을 제공합니다.
- **교육 자료 / Thell 류 설명**
  - very low empties에서는 ordering을 많이 얹는 것보다 exact 쪽 tie-break / parity 정리가 나을 수 있습니다.

즉 이번 후보군은 다음 원칙으로 나뉩니다.

1. **cheap late ordering**: TT depth gate + top-K lightweight evaluator + potential/frontier
2. **probe ordering**: top-K reduced-depth probe
3. **exact-safe ordering**: parity / reply fast-first
4. **conservative MPC**: static gate + volatility guard + near-threshold verification
5. **guarded both-side MPC**: low-cut까지 허용하되 gate/verification으로 완충

## 2. stage154 / stage151 설계 방향 차이

### stage154 main_recenter
- ordering pattern bank가 없으므로 **ordering 구조를 넓게 써도 중복 위험이 작다**.
- 따라서 stage154에서는 top-K / probe / potential-frontier 강화 후보를 적극적으로 준비한다.
- 주력 우선순위:
  1. `s157-main-anchor`
  2. `s157-main-tight-probe`
  3. `s157-main-wide-hybrid`
  4. `s157-main-exact-safe`
  5. `s157-main-soft-both`

### stage151 split_late3
- late3 ordering pattern bank가 이미 있으므로 linear/probe 구조가 과하게 겹칠 수 있다.
- 그래서 stage151에서는 **ordering PB 적용 범위를 조절하는 것** 자체가 중요한 구조 후보가 된다.
- 이번 단계에서 `moveOrderingPatternBankMinEmpties` 옵션을 추가한 이유가 이것이다.
- 이 옵션 하나로 다음 네 가지를 런타임에서 재현할 수 있다.
  - `full` = `0-19`
  - `noend` = `7-19`
  - `latea` = `13-19`
  - `off` = scale 0
- 주력 우선순위:
  1. `s157-late3-anchor-noend`
  2. `s157-late3-noend-probe`
  3. `s157-late3-anchor-latea`
  4. `s157-late3-linear-only`
  5. `s157-late3-noend-soft-both`

## 3. 실제로 코딩해 둔 후보
후보 정의는 아래 파일에 있다.

- `tools/evaluator-training/stage157-structural-candidates.mjs`

현재 canonical key는 stage 번호 기준으로 다시 정리되었습니다.
기존 `s154-*`, `s151-*` 표기는 historical alias로만 남기고, 문서와 신규 작업에서는 `s157-main-*`, `s157-late3-*`를 우선 사용합니다.

### stage154 후보
- `s157-main-control`
- `s157-main-order-only`
- `s157-main-mpc-only`
- `s157-main-anchor`
- `s157-main-tight-probe`
- `s157-main-wide-hybrid`
- `s157-main-exact-safe`
- `s157-main-frontier-gate`
- `s157-main-soft-both`
- `s157-main-assertive-both`

### stage151 후보
- `s157-late3-control-full`
- `s157-late3-anchor-full`
- `s157-late3-anchor-noend`
- `s157-late3-anchor-latea`
- `s157-late3-noend-probe`
- `s157-late3-noend-linearizer`
- `s157-late3-linear-only`
- `s157-late3-noend-parity-verify`
- `s157-late3-noend-soft-both`
- `s157-late3-full-both`

## 4. 샘플 smoke에서 확인한 것
샘플 러너:

- `tools/evaluator-training/run-stage157-structural-candidate-smoke.mjs`
- `tools/evaluator-training/run-stage157-structural-candidate-smoke.bat`

출력 요약:

- `tools/evaluator-training/out/_stage157_structural_smoke_stage154/stage157_structural_smoke_summary.md`
- `tools/evaluator-training/out/_stage157_structural_smoke_stage151/stage157_structural_smoke_summary.md`

샘플 smoke에서 확실히 확인된 점은 다음이다.

1. **ordering 구조는 실제로 작동한다.**
   - hybrid / probe / potential-frontier 후보들은 `orderingTopKRescores`, `orderingPotentialMobilityBonuses`, `orderingFrontierBonuses`, `orderingShallowProbeCalls` 통계를 실제로 증가시킨다.
2. **MPC 구조도 실제로 작동한다.**
   - static gate / volatility guard / verification 후보들은 `mpcStaticEvalSkips`, `mpcVolatilitySkips`, `mpcVerificationProbes` 통계를 실제로 발생시킨다.
3. **stage151 late3 ordering PB 범위 게이트가 작동한다.**
   - 11-empty 샘플에서 `0-19`와 `7-19`는 기여가 남고,
   - `13-19`는 기여가 0으로 꺼진다.

주의: 이 smoke는 후보 strength 판정이 아니다.
샘플 수가 적고, 아직 최종 weight가 아닌 상태이며, rough timing도 로컬 편향이 있다.

## 5. 이번 단계에서 추가된 안전 장치

### 백업
- 백업 스크립트: `tools/evaluator-training/backup-runtime-ai-js.mjs`
- 실제 백업: `backups/stage157_pre_structural_logic_20260416`

### 복원
- 복원 스크립트: `tools/evaluator-training/restore-runtime-ai-js-backup.mjs`

## 6. 코드 크기 변화(대략)
백업 대비 이번 구조 패치의 raw 파일 크기 증가는 다음 정도다.

- `js/ai/search-engine.js`: `+14,634 bytes`
- `js/ai/evaluator.js`: `+802 bytes`
- 새 파일 `js/ai/search-structure-profiles.js`: `16,709 bytes`

즉 구조 후보를 많이 미리 코딩했지만, 핵심 런타임 변경량 자체는 아직 관리 가능한 수준이다.

## 7. direct-pair 판정 진행 현황 (Stage168 follow-up)
현재까지 mainline direct-pair 판정 결과는 다음과 같습니다.

- `s157-main-order-only`: **비채택**  
  80/160/240ms에서 `패배 -> 승리 -> 패배/동률` 패턴으로 흔들렸고, overall score/cost story도 약했습니다.
- `s157-main-mpc-only`: **비채택**  
  1차 판정에서는 보류였지만, reinforced retest(80/160/240 + 320/400, 시드 6개) 후 `s154-main` 전구간 동률 / `s154-both` 일부 구간만 소폭 우세로 정리되었습니다. clean long-think crossover와 throughput upside가 모두 부족했습니다.
- `s157-main-anchor`: **비채택**  
  historical alias가 `s154-main`이지만 현재 support-stack baseline snapshot은 구조 overlay를 포함하지 않으므로 direct pair 자체는 의미가 있었습니다. 결과는 `s154-main` 기준 `동률 -> 패배 -> 동률`, `s154-both` 기준 `패배 -> 패배 -> 승리`였고, 두 baseline 전체 합산과 nodes/ms 평균 모두 candidate가 뒤졌습니다.
- `s157-main-tight-probe`: **비채택**  
  1차 판정에서는 `s154-main` 기준 `동률 -> 동률 -> 승리`, `s154-both` 기준 `승리 -> 동률 -> 패배`로 엇갈렸습니다. 그러나 reinforced retest(같은 80/160/240ms, 시드 6개)에서는 `s154-main` 전구간 동률 / `s154-both`는 `동률 -> 소폭 우세 -> 동률`로 수렴했고, nodes/ms는 전 행에서 baseline이 더 높았습니다.
- `s157-main-wide-hybrid`: **채택**  
  `s154-main`, `s154-both` 모두에서 `승리 -> 동률 -> 승리` 패턴이 반복되었고, overall 합산은 baseline `20.0/48`, candidate `28.0/48`이었습니다. nodes/ms는 약 2% 느려졌지만 fixed-time 실전 score 우세가 그 손해를 상쇄했습니다.
- `s157-main-exact-safe`: **비채택**  
  `s154-main`은 `동률 -> 동률 -> 동률`, `s154-both`는 `동률 -> 동률 -> 패배`였습니다. overall 합산은 baseline `24.5/48`, candidate `23.5/48`이었고, nodes/ms 이득도 약 `0.3%` 수준이라 보강 재테스트로 뒤집을 만큼의 positive signal이 남지 않았습니다.
- `s157-main-frontier-gate`: **채택**  
  `s154-main`은 `동률 -> 동률 -> 승리`, `s154-both`는 `동률 -> 승리 -> 승리`였습니다. overall 합산은 baseline `21.0/48`, candidate `27.0/48`이었고, nodes/ms 평균은 baseline `8.93`, candidate `8.95`로 사실상 중립이었습니다. cheap signal ordering + static gate MPC만으로도 long-think 구간 우세가 살아난 보수형 채택 사례입니다.
- `s157-main-soft-both`: **비채택**  
  1차 direct-pair(시드 4개)에서는 overall `26.5/48` 대 `21.5/48`로 앞섰지만, `s154-both 240ms`에서 이미 음수 셀이 있었습니다. reinforced retest(같은 80/160/240ms, 시드 6개) 후에는 `s154-main`이 `동률 -> 승리 -> 패배`, `s154-both`가 `승리 -> 동률 -> 패배`로 정리됐고, `240ms`에서 두 baseline 모두 패배했습니다. overall 합산은 candidate가 `37.0/72` 대 `35.0/72`로 조금 앞섰지만, 이득이 short-think에 몰린 반면 long-think에서는 dual-baseline reversal이 재현되어 기본값 채택 근거가 부족했습니다.
- `s157-main-assertive-both`: **채택**  
  aggressive both-side MPC 후보였지만 direct-pair 결과는 `s154-main`이 `동률 -> 동률 -> 승리`, `s154-both`가 `승리 -> 동률 -> 승리`였습니다. overall 합산은 baseline `20.0/48`, candidate `28.0/48`로 `wide-hybrid`와 같은 score gap을 만들었고, nodes/ms 평균도 baseline `9.19`, candidate `9.18`로 사실상 중립이었습니다. `soft-both`와 달리 240ms dual-baseline 우세가 재현되어 long-think non-collapse형 채택 후보로 확정했습니다.

이로써 stage157 mainline direct-pair 대상은 모두 판정을 마쳤습니다.

- **채택**: `s157-main-wide-hybrid`, `s157-main-frontier-gate`, `s157-main-assertive-both`
- **비채택**: `s157-main-order-only`, `s157-main-mpc-only`, `s157-main-anchor`, `s157-main-tight-probe`, `s157-main-exact-safe`, `s157-main-soft-both`

## 8. 바로 이어서 할 일
다음 direct-pair 우선순위는 아래와 같습니다.

1. stage154 stage158 lane은 `s154-stable-zebra-open` → `s154-stable-zebra` → `s154-stable-quiet` → `s154-anchor-main` → `s154-stable-quiet-probe` → `s154-zebra-both-probe` 순으로 본다. (`review-stage-158-external-engine-hint-notes.md` 기준)
2. stage151 lane은 `s157-late3-anchor-noend` → `s157-late3-noend-probe` → `s157-late3-anchor-latea` 순으로 이어간다.
3. stage157 채택 후보 `s157-main-wide-hybrid`, `s157-main-frontier-gate`, `s157-main-assertive-both`는 이후 stage158 후보와 비교할 때도 같은 baseline 축에서 계속 재확인한다.
4. aggressive both-side 또는 zebra/open 계열은 short-think upside만으로 채택하지 말고, 240ms 이상에서 reversal이 재현되는지 먼저 본다.

## 9. runtime closeout 메모 (Stage168 finalization)
Stage 168 마무리에서는 stage157 mainline을 **판정 기록**과 **현재형 runtime/tooling 표면**으로 분리했습니다.

- runtime candidate registry에는 `s157-main-control`, `s157-main-wide-hybrid`, `s157-main-frontier-gate`, `s157-main-assertive-both`만 남깁니다.
- `s157-main-order-only`, `s157-main-mpc-only`, `s157-main-anchor`, `s157-main-tight-probe`, `s157-main-exact-safe`, `s157-main-soft-both`는 direct-pair 비채택 근거를 유지하되, 현재형 candidate registry와 regenerated decision pack에서는 제거합니다.
- `s157-main-wide-hybrid`에서 쓰던 `stage154-wide-hybrid-v1`, `stage154-verify-tight-v1`는 closeout 시점에 각각 공식 runtime structure profile key `wide-hybrid-v1`, `verify-tight-v1`로 승격해 `js/ai/search-structure-profiles.js`에 흡수했습니다.
- 다만 **설치 기본 generated module** 자체는 계속 stage154 main-recenter이며, structure overlay default key도 move-ordering/MPC 모두 `baseline-v1`로 유지합니다.
- stage158 lane은 다음 대화에서 이어갑니다. 이 문서의 stage157 판정표는 그대로 역사 기준으로 남기고, 이후 비교는 채택 3종(`s157-main-wide-hybrid`, `s157-main-frontier-gate`, `s157-main-assertive-both`)만 현재형 후보로 취급합니다.
