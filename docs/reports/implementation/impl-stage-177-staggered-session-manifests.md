# Stage177 implementation - staggered session manifest generation

## 반영 사항
- `tools/evaluator-training/stage177-survivor-staggered-session-plan.mjs`
  - slot/option 고정
  - 6-trial sequential carry-forward state machine 구현
  - before/after state snapshot 포함
  - skipped invariant pairing과 carry-forward source 기록
- `tools/engine-match/prepare-stage177-staggered-session-manifests.mjs`
  - plan summary markdown/json 생성
  - session별 `manifest.json` 생성
- `js/test/stage177_survivor_staggered_session_plan_smoke.mjs`
  - 3 sessions / 6 trials / 48 games per session 검증
  - trial2~6의 opponent state가 직전 carry-forward 상태를 따르는지 검증

## 산출물
- `tools/engine-match/out/stage177-staggered-session-plan/plan-summary.md`
- `tools/engine-match/out/stage177-staggered-session-plan/plan-summary.json`
- `tools/engine-match/out/stage177-staggered-session-plan/session-01/manifest.json`
- `tools/engine-match/out/stage177-staggered-session-plan/session-02/manifest.json`
- `tools/engine-match/out/stage177-staggered-session-plan/session-03/manifest.json`

## 검증
- `node js/test/stage177_survivor_staggered_session_plan_smoke.mjs`
- `node tools/engine-match/prepare-stage177-staggered-session-manifests.mjs`
