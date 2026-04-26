# Stage 167 — stage154 pattern export root-cause analysis
## 결론

원인은 **stage154 source module이나 shared pattern-bank JSON이 아니라, stage15x candidate export 단계**였습니다.

`tools/evaluator-training/build-generated-profile-module.mjs` 가 factorized pattern-bank JSON을 다시 내보낼 때,
training-side helper인 `tools/evaluator-training/pattern-bank-lib.mjs` 가 `factorized-sparse-v1` 을 복원하지 못해
`trainedBuckets[].patternWeights` 가 전부 0으로 정규화되었습니다.

그 결과 stage15x candidate generated module (`s154-main.generated.js`, `s154-wide-safe.generated.js` 등)는
**bias만 남고 board-dependent pattern table payload는 비어 있는 상태**로 export되었습니다.

## 흐름 추적

1. **source module**
   - `tools/evaluator-training/out/stage154/modules/learned-eval-profile.main_only.recenter.factorized.generated.js`
   - runtime 쪽 `js/ai/pattern-bank.js` 는 factorized pattern bank를 정상 복원합니다.
   - sample position에서 pattern contribution이 board마다 달라집니다.

2. **bundle prepare output**
   - `tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/shared/evaluation-pattern-bank.01.json`
   - 이 JSON도 정상입니다.
   - factorized payload:
     - non-zero tables: 152 / 156
     - `indicesBase64` length: 464240
     - `valuesBase64` length: 1848556

3. **candidate export (buggy before patch)**
   - `tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js`
   - pattern-bank payload가 아래처럼 비어 있었습니다.
     - all `tableNonZeroCounts = 0`
     - `indicesBase64 = ""`
     - `valuesBase64 = ""`
   - 그래서 runtime에서는 phase bias만 들어가고 pattern contribution은 항상 0이었습니다.

4. **root cause in code**
   - `tools/evaluator-training/pattern-bank-lib.mjs`
   - patch 전 `resolvePatternBankProfile()` 는 `factorized-sparse-v1` 을 전혀 expand하지 않고,
     `trainedBuckets` 를 `normalizePatternBankBucket()` 에 바로 넣었습니다.
   - factorized profile은 bucket 안에 `patternWeights` 가 없으므로 결과적으로 전부 0 table이 되었습니다.

## 수정 내용

### 1) training-side factorized decode 추가
- file: `tools/evaluator-training/pattern-bank-lib.mjs`
- 추가:
  - `FACTORIZED_PATTERN_BANK_FORMAT`
  - `FACTORIZED_PATTERN_BANK_CACHE`
  - `decodeBase64Bytes()`
  - `readUnsignedVarint()`
  - `isFactorizedPatternBankProfile()`
  - `expandFactorizedPatternBankProfile()`
- 수정:
  - `resolvePatternBankProfile()` 가 `factorized-sparse-v1` 을 만나면 expand 경로를 탑니다.

### 2) audit helper 오판 수정
- file: `tools/engine-match/audit-stage154-pattern-assets.mjs`
- factorized payload detection이 예전 필드명(`tableIndexData`, `tableValueData`)을 보고 있었던 부분을
  현재 필드명(`indicesBase64`, `valuesBase64`) 기준으로 수정했습니다.
- residual summary도 bias-only/board-dependent 해석이 섞이지 않도록 고쳤습니다.

## 수정 후 검증

### A. factorized round-trip smoke
- test: `js/test/stage167_factorized_pattern_bank_export_smoke.mjs`
- 결과: pass
- 검증 내용:
  - stage154 evaluation pattern bank factorized JSON이 tool-side sanitize 후에도 non-zero weights 유지
  - stage151 ordering pattern bank factorized JSON도 동일
  - repaired `s154-main.generated.js` 는 non-empty factorized payload 유지
  - repaired export가 original stage154 source module과 같은 pattern-bank contribution을 냄

### B. export phase rerun
실제 bundle export만 다시 돌려 stage154 candidate module을 재생성했습니다.

- command:
  ```bash
  node tools/evaluator-training/run-stage15x-support-stack-bundle.mjs \
    --input tools/evaluator-training/out/stage29_move_ordering_smoke_input_mixed.jsonl \
    --config tools/evaluator-training/examples/stage15x-support-stack.example.json \
    --output-root tools/evaluator-training/out/stage15x-support-stack \
    --family stage154-main-recenter \
    --phase export
  ```

- repaired module sizes:
  - `s154-main.generated.js`: 2,338,543 bytes
  - `s154-wide-safe.generated.js`: 2,338,521 bytes

이전 broken export는 약 23 KB 수준이었으므로, pattern bank payload가 실제로 다시 들어온 것이 맞습니다.

### C. source vs broken vs repaired 비교 (24-ply sample)
- broken export: pattern contribution = 0, contribution = phase bias only
- repaired export: board마다 pattern contribution이 달라짐
- repaired export == original source module (same state)

예시:

| seed | broken PB | repaired PB | broken pattern | repaired pattern |
|---:|---:|---:|---:|---:|
| 1 | 641.46 | 1336.36 | 0.00 | 694.90 |
| 2 | 641.46 | 3218.21 | 0.00 | 2576.74 |
| 3 | 641.46 | -7377.73 | 0.00 | -8019.20 |

## 영향 범위

이 버그는 **factorized pattern-bank JSON을 다시 export하는 경로**에 영향을 줍니다.
즉 아래 계열의 결과는 pattern-strength 관점에서 다시 봐야 합니다.

- stage15x support-stack exported candidates (`s154-main`, `s154-wide-safe`, ...)
- 이 exported module을 기반으로 한 structural screening / round2 / round3

반면 아래는 본질적으로 멀쩡했습니다.

- stage154 original source module 자체
- runtime `js/ai/pattern-bank.js` factorized decode
- bundle shared pattern-bank JSON
- training 중 teacher/module source generated module을 직접 읽는 경로

## 실무 판단

1. **Main/Wide benchmark 결과는 이제 다시 보는 것이 맞습니다.**
   이전 결과는 “의도한 새 pattern evaluator”가 아니라 사실상 “bias-only candidate”에 가까웠습니다.

2. **split-late3도 export 시점에는 같은 문제가 걸렸을 가능성이 큽니다.**
   다만 현재는 학습/재개 중이므로, export phase만 이 패치된 코드로 돌리면 됩니다.

3. **당장 다시 학습할 필요는 없습니다.**
   이번 문제는 학습 산출물 자체보다 **export chain** 문제입니다.
   즉 stage154는 export만 다시 하면 됩니다.

## 다음 권장 순서

1. stage154-main-recenter export만 다시 생성
2. repaired `s154-main` / `s154-wide-safe` 기준으로 Main screening 재실시
3. split-late3 resume 완료 후 export phase만 패치된 코드로 수행
4. 이후 stage151/154 2차전 재판정
