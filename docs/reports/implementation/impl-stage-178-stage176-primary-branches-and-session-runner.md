# Stage 178 implementation note — stage176 branch candidates and staggered session runner

이번 단계에서 추가한 구현은 아래와 같습니다.

## 1. Stage176 branch candidate registry

새 파일:
- `tools/evaluator-training/stage176-survivor-branch-candidates.mjs`

포함 내용:
- Session plan에서 사용하기 위한 stage176 branch candidate resolver/builder
- current six keys
  - `s176-main-wide-zebra-bothlite`
  - `s176-main-wide-zebra-midtrim`
  - `s176-main-wide-assertive`
  - `s176-main-assertive-both-lite`
  - `s176-main-frontier-bothlite-parity`
  - `s176-main-frontier-bothlite-topk2`
- custom profiles
  - `stage176-wide-midtrim-v1`
  - `stage176-frontier-parity-v1`
  - `stage176-frontier-topk2-v1`
  - `stage176-assertive-both-lite-v1`

특징:
- source stage로 `157`, `158`, `170`을 허용합니다.
- family/module path는 기존 stage154 main-recenter family를 그대로 씁니다.
- engine options merge와 structure profile override는 stage170 combo registry 패턴을 재사용했습니다.

## 2. Generic micro head-to-head runner

새 파일:
- `tools/engine-match/run-stage177-head-to-head-micro-pair.mjs`

역할:
- arbitrary survivor keys (stage157/158/170/176)를 두 개 받아
- engine-options JSON을 생성하고
- `80/160/240ms × seeds` micro run을 순차 실행한 뒤
- 기존 micro aggregator로 summary를 생성합니다.

## 3. Staggered session runner

새 파일:
- `tools/engine-match/run-stage177-staggered-session.mjs`

역할:
- stage177 session manifest를 읽어
- 각 trial의 fresh pairing만 실행하고
- invariant pairing은 historical 또는 same-session result를 carry-forward 하며
- trial summary / session summary를 생성합니다.

historical carry-forward seed sources:
- round8: `s157-main-assertive-both` vs `s170-main-wide-zebra`
- round9: `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra`
- round10: `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both`

## 4. Aggregator compatibility update

수정 파일:
- `tools/engine-match/aggregate-stage170-head-to-head-micro-results.mjs`

변경 내용:
- stage176 candidate keys를 resolve할 수 있도록 `resolveStage176SurvivorBranchCandidate`를 추가했습니다.

## 5. Smoke

새 파일:
- `js/test/stage176_survivor_branch_candidates_smoke.mjs`

검증:
- six stage176 keys가 모두 resolve되는지
- expected family/module/profile metadata가 있는지
