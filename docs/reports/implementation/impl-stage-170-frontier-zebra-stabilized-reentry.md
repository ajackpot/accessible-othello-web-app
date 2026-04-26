# Stage170 implementation - frontier-zebra stabilized re-entry

## 목적
original `s170-main-frontier-zebra` hold를 그대로 반복하지 않고,
`160ms` 교차축 ambiguity를 겨냥한 **ordering-side logic reinforcement** 정의를
재현 가능한 형태로 registry에 추가합니다.

## 코드 반영
### 1. stage170 survivor combo registry 확장
파일: `tools/evaluator-training/stage170-survivor-combo-candidates.mjs`

- stage-local custom move-ordering profile 지원을 추가했습니다.
- `stage170-frontier-stabilized-v1`를 정의했습니다.
- `s170-main-frontier-zebra-stabilized` combo candidate를 추가했습니다.

### 2. smoke 갱신
파일: `js/test/stage170_survivor_combo_smoke.mjs`

- 새 stabilized candidate가 registry에 노출되는지 확인합니다.
- move-ordering override key가 `stage170-frontier-stabilized-v1`로 해석되는지 확인합니다.

## 보강 프로필 개요
`stage170-frontier-stabilized-v1`
- TT depth gate on
- square-parity exact tie-break on
- lightweightEvalTopK = 3
- shallow probe off
- potential/frontier weights 유지

## 의도
wide/probe 방향으로 다시 공격적으로 가는 대신,
frontier-gate의 cheap lane 성격은 유지하면서 mid-think 정렬 노이즈만 줄이는 것이 목표입니다.
