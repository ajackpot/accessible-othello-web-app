# Stage 167 — stage15x factorized export repair report
- generatedAt: `2026-04-18T04:32:44.411Z`
- inputUsed: `tools/evaluator-training/out/stage29_move_ordering_smoke_input_mixed.jsonl`
- outputRoot: `tools/evaluator-training/out/stage15x-support-stack`

| family | status | shared | move-ordering variants | runtime MPC variants | exported modules | note |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| stage151-split-late3 | repaired | yes | 3 | 5 | 6 | all exported modules look large enough to contain factorized payloads |

## stage151-split-late3
- status: **repaired**
- note: all exported modules look large enough to contain factorized payloads
- command: `node tools/evaluator-training/run-stage15x-support-stack-bundle.mjs --input tools/evaluator-training/out/stage29_move_ordering_smoke_input_mixed.jsonl --config tools/evaluator-training/examples/stage15x-support-stack.example.json --output-root tools/evaluator-training/out/stage15x-support-stack --family stage151-split-late3 --phase export`
- exported modules:
  - `s151-full-both.generated.js`: 2.519 MiB (factorized payload likely present)
  - `s151-latea-main.generated.js`: 2.346 MiB (factorized payload likely present)
  - `s151-linear-only.generated.js`: 2.23 MiB (factorized payload likely present)
  - `s151-noend-main.generated.js`: 2.451 MiB (factorized payload likely present)
  - `s151-noend-split.generated.js`: 2.451 MiB (factorized payload likely present)
  - `s151-safe-full.generated.js`: 2.517 MiB (factorized payload likely present)
