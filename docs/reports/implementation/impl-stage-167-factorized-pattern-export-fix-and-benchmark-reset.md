# Stage 167 - factorized pattern-bank export root-cause fix, stage15x candidate repair, and benchmark reset

## 요약
이번 단계의 목표는 세 가지였습니다.

1. **stage15x candidate benchmark가 왜 기대와 다르게 pattern strength를 거의 보여주지 못했는지** 흐름을 따라가며 원인을 찾는다.
2. 문제를 고쳐 **Main 계열(stage154) 후보들을 공정한 상태로 다시 export**하고, split-late3(stage151)도 같은 경로로 바로 복구할 준비를 한다.
3. 잘못된 전제 위에서 쌓인 recent benchmark를 정리하고, **원점에서 다시 benchmark를 시작한다는 사실을 문서/버전/인벤토리에 반영**한다.

결론은 명확합니다.

- 원인은 학습 자체가 아니라 **stage15x factorized pattern-bank re-export 경로**였습니다.
- `s154-main`, `s154-wide-safe` 등 recent benchmark에 쓰인 stage15x exported candidate는 **board-dependent pattern table이 빠진 상태**로 benchmark되었을 가능성이 높았습니다.
- `tools/evaluator-training/pattern-bank-lib.mjs`를 고쳐 factorized sparse pattern bank를 training-side에서도 제대로 복원하도록 수정했고, stage154 exported candidate를 다시 생성했습니다.
- `s154-main`, `s154-wide-safe`만이 아니라 `s154-safe`, `s154-split`, `s154-both`까지 **모두 다시 export**해 억울한 비교 대상도 함께 복구했습니다.
- stage151(split-late3)은 현재 local artifact snapshot에는 runtime MPC 산출물이 없어 export를 실행하지 않았지만, 학습 완료 산출물이 들어오면 **repair helper 한 번으로 export만 다시 수행**할 수 있도록 준비했습니다.
- Stage 162~166에서 쌓인 stage15x 관련 benchmark 결과는 **채택 근거로 사용하지 않고**, 증상 설명용 요약 샘플만 남긴 뒤 detailed tool output은 폐기했습니다.
- 저장소 메타데이터, README, runtime reference, checklist, report inventory를 **Stage 167** 기준으로 동기화했습니다.

## 문제의 징후
직전 단계들에서 이미 이상 징후는 보였습니다.

### 1. 80ms support screening이 일관되게 Main을 밀어주지 못함
대표 샘플을 다시 보면 Stage 162 support screening(12 games)에서:

- `s154-wide-safe`: `9/12`, avg disc diff `+16.25`
- `s154-main`: `9/12`, avg disc diff `+10.67`
- `active`: `9/12`, avg disc diff `+13.00`

즉 stage154 family 안에서도 `Main`이 pattern-upgraded 주력처럼 분리되지 않았습니다.
샘플 자체는 작지만, “분명히 pattern을 강화했다면 왜 이런 식으로 퍼지지?”라는 의심을 남기기에는 충분했습니다.

### 2. 240ms noisy/XOT로 가도 active와의 격차가 구조적으로 좁아짐
Stage 165 240ms overall sample(12 games)에서는:

- `active`: `8/12`, avg disc diff `+7.67`
- `s154-main-base`: `7/12`, avg disc diff `+6.33`
- `s154-wide-safe`: `7/12`, avg disc diff `+5.33`

noisy + XOT slice(8 games)에서는 오히려 `s154-main-base`, `s154-wide-safe`가 `active`와 비슷하거나 더 나은 margin을 보이기도 했지만, 전체로 가면 decisive edge가 없었습니다.
이 역시 “pattern 쪽 보강이 정말 candidate export에 반영됐나?”를 다시 묻게 만들었습니다.

### 3. pattern-stress suite에서도 모든 후보가 4/8 동률
Stage 166 pattern-stress sample(8 games)에서는:

- `s154-wide-safe`: `4/8`, avg disc diff `+4.00`
- `s154-main-base`: `4/8`, avg disc diff `+2.75`
- `active`: `4/8`, avg disc diff `+0.125`
- 나머지도 전부 `4/8`

즉 “패턴이 많이 걸릴 법한 자리만 따로 골랐는데도” decisive split이 거의 나오지 않았습니다.
이 결과가 이번 root-cause investigation의 직접 계기였습니다.

위 샘플 숫자는 자세한 run output을 그대로 보존하지 않고, 증상만 남긴 요약본으로 `docs/reports/review/review-stage-167-benchmark-reset-samples.md + benchmarks/stage167/stage167_benchmark_reset_samples_20260418.json`에 정리해 두었습니다.

## 원인
원인은 runtime evaluator나 source module이 아니라, **stage15x candidate export 단계**였습니다.

흐름을 따라가면:

1. `tools/evaluator-training/out/stage154/modules/learned-eval-profile.main_only.recenter.factorized.generated.js`
   - source module 자체는 정상입니다.
   - 같은 empties bucket 안에서도 board마다 pattern contribution이 달라집니다.

2. `tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/shared/evaluation-pattern-bank.01.json`
   - bundle prepare output도 정상입니다.
   - factorized payload가 실제로 들어 있습니다.

3. 그런데 stage15x exported candidate (`s154-main.generated.js`, `s154-wide-safe.generated.js`, ...)
   - patch 전에는 factorized sparse table payload가 비어 버렸습니다.
   - 결과적으로 board-dependent pattern table이 사라지고, phase bias만 남은 export가 만들어졌습니다.

직접적인 root cause는 `tools/evaluator-training/pattern-bank-lib.mjs`였습니다.

- patch 전 `resolvePatternBankProfile()`는 `factorized-sparse-v1`을 training-side에서 복원하지 못했습니다.
- 그래서 factorized JSON을 다시 export할 때 `trainedBuckets[].patternWeights`가 전부 0 table로 정규화되었습니다.
- runtime 쪽 `js/ai/pattern-bank.js`는 멀쩡했지만, **training toolchain의 re-export helper**가 payload를 잃어버렸습니다.

자세한 흐름 추적과 예시 수치는 `docs/reports/review/review-stage-167-stage154-pattern-export-root-cause-analysis.md`에 남겨 두었습니다.

## 수정한 코드
### 1. factorized pattern-bank decode를 training-side helper에 추가
- file: `tools/evaluator-training/pattern-bank-lib.mjs`
- 추가/수정 내용:
  - `factorized-sparse-v1` 감지
  - base64 payload decode
  - varint index decode
  - float32 value stream 복원
  - `resolvePatternBankProfile()`에서 factorized profile expand 지원

이 수정으로 training toolchain도 runtime과 같은 의미론으로 factorized pattern bank를 다시 읽을 수 있게 되었습니다.

### 2. stage15x candidate export repair helper 추가
- file: `tools/evaluator-training/repair-stage15x-factorized-exports.mjs`
- batch wrapper: `tools/evaluator-training/repair-stage15x-factorized-exports.bat`

이 helper는:

- `stage154-main-recenter`
- `stage151-split-late3`

두 family를 기본 대상으로 잡고,

- shared profile / move-ordering / runtime MPC 산출물이 충분한 family는 `--phase export`만 다시 실행해 repair
- prerequisite가 모자란 family는 skip + report 남김

형태로 동작합니다.

즉 stage151도 학습이 끝나고 runtime MPC 산출물만 같은 위치에 있으면,
**다시 학습하지 않고 export만 재수행**하면 됩니다.

## 실제로 복구한 후보
### stage154 - 모두 다시 export
공정성 차원에서 일부만 살리지 않고, stage154의 주요 후보를 전부 repair했습니다.

- `s154-main`
- `s154-wide-safe`
- `s154-safe`
- `s154-split`
- `s154-both`

repair 결과 각 generated module 크기는 모두 약 **2.23 MiB** 수준으로 돌아왔고,
이는 factorized payload가 다시 들어갔다는 강한 간접 증거입니다.

repair report:
- `tools/evaluator-training/out/_stage167_stage15x_export_repair/repair-report.json`
- `docs/reports/implementation/impl-stage-167-stage15x-factorized-export-repair-report.md`

### stage151 - export ready path만 준비
local snapshot에서는 `stage151-split-late3/mpc/runtime.*.json`이 아직 없어 export prerequisite가 충족되지 않았습니다.
그래서 이번 저장소에서는 **stage151은 export helper가 skip**한 상태입니다.

하지만 helper는 이미 stage151을 기본 대상으로 포함하므로,
사용자 쪽에서 학습 완료 산출물을 현재 경로에 채운 뒤 아래만 실행하면 됩니다.

```bash
node tools/evaluator-training/repair-stage15x-factorized-exports.mjs --family stage151-split-late3
```

## benchmark reset과 cleanup
이번 단계에서 판단한 것은 다음입니다.

1. **recent stage15x benchmark는 채택/비채택 근거로 더 이상 사용하지 않는다.**
2. 완전히 지워 버리면 왜 reset을 했는지 맥락이 사라지므로, **증상 설명용 샘플만 남긴다.**
3. 나머지 detailed tool output은 폐기해 용량과 해석 노이즈를 줄인다.

남긴 것:

- `benchmarks/stage167/stage167_benchmark_reset_samples_20260418.json`
- `docs/reports/review/review-stage-167-benchmark-reset-samples.md`
- `docs/reports/review/review-stage-167-stage154-pattern-export-root-cause-analysis.md`
- `tools/evaluator-training/out/_stage167_stage15x_export_repair/repair-report.json` + `docs/reports/implementation/impl-stage-167-stage15x-factorized-export-repair-report.md`
- `docs/reports/review/review-stage-166-stage154-pattern-asset-audit.md + tools/engine-match/out/_stage167_pattern_audit_fixed/*`

폐기한 것:

- `tools/engine-match/out/stage15x-main-benchmark-pack`
- `tools/engine-match/out/_stage154_support_screening`
- `tools/engine-match/out/_stage154_structural_screening_seq`
- `tools/engine-match/out/_stage163_refactor_check`
- `tools/engine-match/out/_stage165_main_round3_240ms`
- `tools/engine-match/out/_stage166_pattern_readout.md`
- `tools/engine-match/out/_stage166_pattern_stress_selection`
- `tools/engine-match/out/_stage166_pattern_stress_suite`
- `tools/engine-match/out/_stage166_pattern_audit`

cleanup manifest는 `benchmarks/stage167/stage167_cleanup_manifest_20260418.json`에 남겼습니다.

## 검증
이번 단계에서 확인한 핵심 항목은 다음과 같습니다.

```bash
node --check tools/evaluator-training/pattern-bank-lib.mjs
node --check tools/evaluator-training/repair-stage15x-factorized-exports.mjs
node js/test/stage167_factorized_pattern_bank_export_smoke.mjs
node tools/evaluator-training/repair-stage15x-factorized-exports.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
node tools/docs/check-doc-sync.mjs
```

특히 repair helper 실행 결과는 다음과 같았습니다.

- `stage154-main-recenter`: repaired
- `stage151-split-late3`: skipped (runtime MPC 산출물 부족)

즉 **Main 계열(stage154)은 이미 repair 완료**, split-late3(stage151)은 **학습 완료 산출물 반영 후 export만 다시 수행하면 됨**이 확인됐습니다.

## 버전/문서 동기화
이번 단계에서 다음을 Stage 167 기준으로 다시 맞췄습니다.

- `stage-info.json`
- 루트 `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/report-inventory.generated.{md,json}`

이번 Stage의 요약 문장은
**“factorized pattern-bank export bug를 수정하고, stage15x candidate export를 복구하며, stale benchmark를 reset 기준선으로 정리했다.”**
로 읽으면 됩니다.

## 다음 시작점
다음 benchmark는 **repaired export를 기준으로 원점에서 다시** 시작해야 합니다.

권장 순서는 다음과 같습니다.

1. stage151 학습 완료 산출물을 현재 repo 경로에 반영
2. `repair-stage15x-factorized-exports`로 stage151 export 재생성
3. stage154 repaired candidate와 stage151 repaired candidate를 함께 다시 screening
4. 그 다음에만 Main / split-late3의 채택 여부를 논의

즉 이번 Stage는 새로운 winner를 뽑는 단계가 아니라,
**winner를 제대로 뽑을 수 있는 기준선을 다시 세운 단계**입니다.
