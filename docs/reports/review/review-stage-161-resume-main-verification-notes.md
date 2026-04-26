# Stage 161 resume / main verification notes

## 1) Batch `--resume` failure root cause
- `tools/evaluator-training/run-stage15x-support-stack-bundle.bat` was stored with LF-only line endings.
- Windows `cmd.exe` can fail to resolve labels in LF-only batch files, which matches the observed `시스템이 지정된 일괄 레이블을 찾을 수 없습니다 - collect_extra` error.
- The file has been rewritten with CRLF line endings and kept functionally equivalent.

## 2) Main (stage154) verification
- Uploaded `stage154-main-recenter` bundle is structurally complete: move-ordering, MPC runtime variants, exports, engine-options, and candidate summary are all present.
- `s154-main.generated.js` loads successfully together with `engine-options/s154-main.json` and completes a search smoke.
- Stage154 source module has **no move-ordering pattern bank by design**. This is not a broken export and does not require rerunning training.
- Therefore Main can be treated as ready-to-plug for later benchmark/install work.

## 3) split-late3 uploaded progress
- Uploaded shared-search-pairs checkpoint is incomplete: `completed = False`.
- Accepted samples total: **1632 / 6400**.
- Records written according to checkpoint: **544**.
- Visited samples: **359001**, last processed sample index: **359000**.

Per-bucket accepted sample progress:

| bucket | accepted / 400 | progress |
|---|---:|---:|
| 18-19 / d3→d7 | 69 / 400 | 17.2% |
| 18-21 / d3→d7 | 137 / 400 | 34.2% |
| 18-21 / d4→d8 | 137 / 400 | 34.2% |
| 20-21 / d4→d8 | 68 / 400 | 17.0% |
| 22-23 / d4→d8 | 65 / 400 | 16.2% |
| 22-25 / d4→d8 | 135 / 400 | 33.8% |
| 22-25 / d4→d9 | 135 / 400 | 33.8% |
| 24-25 / d4→d9 | 70 / 400 | 17.5% |
| 26-27 / d5→d10 | 70 / 400 | 17.5% |
| 26-29 / d5→d10 | 151 / 400 | 37.8% |
| 26-29 / d6→d10 | 151 / 400 | 37.8% |
| 28-29 / d6→d10 | 81 / 400 | 20.2% |
| 30-31 / d5→d11 | 64 / 400 | 16.0% |
| 30-33 / d5→d11 | 121 / 400 | 30.2% |
| 30-33 / d6→d10 | 121 / 400 | 30.2% |
| 32-33 / d6→d10 | 57 / 400 | 14.2% |

## 4) Important resume safety issue found
- Uploaded `shared-search-pairs.jsonl` currently contains **550 valid JSONL lines**, while the checkpoint says **544** records were committed.
- This mismatch is consistent with a hard power-off after extra JSONL appends but before the checkpoint was saved.
- Without repair, resume would continue from the checkpoint and keep those extra tail lines, which can skew or duplicate later fitting input.
- `precompute-mpc-search-pairs.mjs` now reconciles the JSONL on resume:
  - if JSONL has more valid records than the checkpoint, it truncates back to `recordsWritten`;
  - if JSONL has an invalid trailing tail, it truncates the invalid tail;
  - if JSONL has fewer valid records than the checkpoint, it aborts with a clear error.

## 5) Bundle resume validation
- A synthetic partial bundle run was created for `stage151-split-late3`, then an extra tail JSONL record was injected manually.
- Re-running `run-stage15x-support-stack-bundle.mjs --resume` successfully resumed from the incomplete checkpoint and printed:

```text
resume JSONL     : truncate-extra-tail (2 -> 1 record(s))
```

- After the repair, the bundle continued precompute/fitting normally and regenerated the MPC outputs.

## 6) Main-ready preparation
- Uploaded `stage15x-support-stack` artifacts were copied into `tools/evaluator-training/out/stage15x-support-stack/` inside this repo.
- Added `tools/engine-match/examples/trineutron-match-suite.stage15x-main.example.json` so Main can be benchmarked later without extra manual path editing.
- `run-trineutron-match-suite.mjs` now accepts `engineOptionsJson` for custom variants, so `s154-main.generated.js` can be used together with `s154-main.json` directly from suite config.

## 7) Recommended resume command on the Windows machine
```bat
tools\evaluator-training\run-stage15x-support-stack-bundle.bat C:\Downloads\othello-a11y-ai\tools\evaluator-training\Egaroucid_Train_Data\0001_egaroucid_7_5_1_lv17 --family stage151-split-late3 --resume
```

If the original run used multiple `--input` paths, reuse the exact same input arguments / directory layout so the checkpoint signature matches.
