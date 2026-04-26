# Stage159 MPC training optimization notes

## 우선순위

1. **shared search-pair precompute + fit-from-pairs**
   - 후보 전체 bucket union에 대해 shallow/deep 탐색을 한 번만 수행합니다.
   - 그 다음 각 후보는 search pair JSONL에서 회귀만 다시 피팅합니다.
   - 후보가 2개 이상이면 가장 먼저 켜야 하는 옵션입니다.

2. **checkpoint + resume**
   - 장시간 calibrate / precompute 중 프로세스가 중단되어도 `--resume`으로 이어서 진행합니다.
   - 학습 도중 강제 종료/재시작 리스크가 있을 때 사실상 필수입니다.

3. **compact-4 / zebra-ladder-8 preset**
   - 빠른 시범학습이나 1차 후보 컷에서 search 예산을 줄이는 preset입니다.
   - `compact-4`는 가장 보수적인 4-bucket.
   - `zebra-ladder-8`은 shallow-depth ladder를 더 직접 반영한 8-bucket입니다.

4. **adaptive stop**
   - bucket이 이미 usable 판정을 만족하면 `maxSamplesPerBucket`까지 억지로 채우지 않고 종료합니다.
   - pilot / follow-up / 국소 재보정에는 유용하지만, 최종 본학습에서는 보수적으로 사용할 것.

## 추가/변경된 스크립트

- `tools/evaluator-training/precompute-mpc-search-pairs.mjs`
- `tools/evaluator-training/fit-mpc-profile-from-search-pairs.mjs`
- `tools/evaluator-training/precompute-mpc-search-pairs.bat`
- `tools/evaluator-training/fit-mpc-profile-from-search-pairs.bat`
- `tools/evaluator-training/run-mpc-training-optimization-smoke.mjs`
- `tools/evaluator-training/run-mpc-training-optimization-smoke.bat`
- `tools/evaluator-training/mpc-training-lib.mjs`
- `tools/evaluator-training/examples/mpc-candidate-suite.precompute-fast.example.json`
- patched: `tools/evaluator-training/calibrate-mpc-profile.mjs`
- patched: `tools/evaluator-training/run-mpc-candidate-training-suite.mjs`

## 권장 실행 패턴

### 1) 단일 후보를 직접 calibrate 하되, 중단 복구를 켜는 경우

```bash
node tools/evaluator-training/calibrate-mpc-profile.mjs \
  --input tools/evaluator-training/out/stage35_mpc_synthetic.jsonl \
  --calibration-buckets '22-25:4>8' \
  --sample-stride 1 \
  --max-samples-per-bucket 400 \
  --checkpoint-json tools/evaluator-training/out/trained-mpc-profile.checkpoint.json \
  --checkpoint-every 50 \
  --output-json tools/evaluator-training/out/trained-mpc-profile.json
```

중단 후 재개:

```bash
node tools/evaluator-training/calibrate-mpc-profile.mjs \
  --input tools/evaluator-training/out/stage35_mpc_synthetic.jsonl \
  --calibration-buckets '22-25:4>8' \
  --sample-stride 1 \
  --max-samples-per-bucket 400 \
  --checkpoint-json tools/evaluator-training/out/trained-mpc-profile.checkpoint.json \
  --checkpoint-every 50 \
  --resume \
  --output-json tools/evaluator-training/out/trained-mpc-profile.json
```

### 2) 여러 후보를 한꺼번에 돌릴 때

```bash
node tools/evaluator-training/run-mpc-candidate-training-suite.mjs \
  --input tools/evaluator-training/out/stage35_mpc_synthetic.jsonl \
  --config tools/evaluator-training/examples/mpc-candidate-suite.precompute-fast.example.json
```

이 모드에서는 후보 전체 union bucket에 대해 search pair를 한 번만 만들어 공유합니다.

### 3) search pair를 수동으로 분리하고 싶은 경우

```bash
node tools/evaluator-training/precompute-mpc-search-pairs.mjs \
  --input tools/evaluator-training/out/stage35_mpc_synthetic.jsonl \
  --bucket-preset zebra-ladder-8 \
  --max-samples-per-bucket 400 \
  --checkpoint-json tools/evaluator-training/out/shared-mpc-search-pairs.checkpoint.json \
  --output-jsonl tools/evaluator-training/out/shared-mpc-search-pairs.jsonl

node tools/evaluator-training/fit-mpc-profile-from-search-pairs.mjs \
  --search-pairs-jsonl tools/evaluator-training/out/shared-mpc-search-pairs.jsonl \
  --bucket-preset zebra-ladder-8 \
  --max-samples-per-bucket 400 \
  --output-json tools/evaluator-training/out/trained-mpc-profile.json
```

## smoke 결과 요약

`tools/evaluator-training/out/_mpc_training_optimization_smoke/mpc-training-optimization-smoke-summary.json`
기준:

- baseline direct suite wall-time: **16936 ms**
- optimized shared-pairs suite wall-time: **7168 ms**
- wall-time speedup: **2.36x**
- baseline search count: **24**
- optimized search count: **8**
- search reduction: **3.00x**
- checkpoint resume: partial 2 samples → resumed 4 samples, `resumedFromCheckpoint=true`

## 추천 순서

- 실제 장시간 학습: `checkpoint + resume`는 무조건 사용.
- 후보 2개 이상: `sharedSearchPairs.mode=on`을 기본값처럼 취급.
- 시간 촉박한 1차 스크리닝: `compact-4` 또는 `zebra-ladder-8`.
- 본선 재보정: overlap/split-stage 계열 + shared pairs.
- adaptive stop: 최종본보다 pilot/follow-up에 먼저 사용.
