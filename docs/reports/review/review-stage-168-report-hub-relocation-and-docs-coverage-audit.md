# 검토 보고서 Stage 168 — report hub relocation and docs coverage audit

## 목적

이번 정리의 목적은 다음 두 가지입니다.

1. `docs/reports` 밖에 흩어져 있던 **stage별 판단/채택/검증 보고서**를 docs 허브 안으로 모아, 다음 단계의 전수조사 범위를 `docs` 기준으로 수렴시킨다.
2. 보고서처럼 보이지만 실제로는 **툴 README, generated smoke 산출물, 보조 증빙**에 가까운 파일은 왜 계속 원위치에 남기는지 기준을 문서로 남긴다.

## 이번에 docs 허브로 이동한 문서군

### move-ordering / tuple / MPC / compact-tuple 관련 stage 보고서

- Stage 38~45 move-ordering 실험/채택 문서
- Stage 49~53 tuple patch / pipeline / lane close-out / cleanup 문서
- Stage 69 / 74 follow-up / MPC candidate review 문서
- Stage 133~147 evaluation profile / support stack / compact tuple 관련 문서
- Stage 157~159 structural candidate / external hint / MPC training optimization 문서
- Stage 161 verification notes
- Stage 166 pattern asset audit
- Stage 167 benchmark reset / root-cause / export repair 문서

총 이동 파일 수는 **35개**입니다.

## docs 허브에 포함시키는 기준

다음 조건 중 하나라도 만족하면 docs 허브에 포함시켰습니다.

- stage별 **채택/비채택 판단**이 직접 들어 있다.
- 실제 코드/도구 변경 후의 **구현 결과와 검증**을 기록한다.
- 다음 단계의 전수조사에서 레거시 정리 근거로 써야 하는 **요약 보고서**다.
- raw JSON/benchmark 묶음을 직접 읽지 않아도 흐름을 이해할 수 있는 **사람용 보고서**다.

## 원위치에 남긴 파일

다음은 이번에 docs 허브로 옮기지 않고 원위치에 남겼습니다.

### 1. 툴 문서

- `tools/evaluator-training/README.md`
- `tools/evaluator-training/TOOL_INDEX.md`
- `tools/evaluator-training/LEGACY_TOOLS.md`
- `tools/engine-match/README.md`
- `tools/package/README.md`
- `third_party/trineutron-othello/SOURCE.md`

이들은 stage 판단 보고서라기보다 **도구 사용 설명 / 출처 문서**이므로 docs report hub 범주와 분리했습니다.

### 2. raw / generated smoke summary

예:
- `tools/evaluator-training/out/_stage157_structural_smoke_*/stage157_structural_smoke_summary.md`
- `tools/evaluator-training/out/_stage158_structural_smoke_*/stage158_structural_smoke_summary.md`
- `tools/evaluator-training/out/_mpc_training_optimization_smoke/mpc-training-optimization-smoke-summary.md`
- `tools/evaluator-training/out/_mpc_adaptive_stop_smoke/adaptive-stop-smoke-summary.md`

이들은 상위 notes/report가 이미 결과를 요약하고 있으며, 자체적으로는 **generated evidence** 성격이 강합니다.
나중 전수조사는 먼저 docs 보고서를 보고, 필요할 때만 이 raw summary를 보조 증빙으로 참조하면 됩니다.

### 3. stale / superseded engine-match round output

예:
- `tools/engine-match/out/_stage15x_restart_round7_longtime_individual/*`
- `tools/engine-match/out/_stage15x_restart_round8_1500ms_individual/*`
- `tools/engine-match/out/_stage15x_restart_round9_*/*`

이들은 stage167 benchmark reset 이후 **직접 채택 근거로 다시 읽을 대상이 아니라**, 당시 상황을 복원할 때만 쓰는 부속 산출물로 보는 편이 맞습니다.
현재 전수조사의 canonical scope는 이들 개별 round output이 아니라, Stage 167 reset/root-cause/repair 문서 쪽입니다.

## 결과

정리 후에는 다음 판단이 가능합니다.

1. 다음 단계의 레거시 코드 정리 조사 범위를 **`docs/reports` 중심으로 진행해도 된다.**
2. `benchmarks/`, `tools/evaluator-training/out/`, `tools/engine-match/out/`에는 여전히 evidence가 남아 있지만, 우선순위는 docs 보고서보다 낮다.
3. 따라서 다음 조사에서는 **docs 전수조사 → 필요한 경우 raw artifact drill-down** 순서를 기준 절차로 삼는 것이 맞다.
