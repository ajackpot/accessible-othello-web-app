# Stage158 external-engine hint pass (Edax / Zebra / Othello-sensei)

## 이번 패스에서 실제로 반영한 구조 힌트

1. **Edax / Othello-sensei -> stability-aware ordering**
   - child state의 conservative stable-disc differential을 ordering bonus로 사용
   - `orderingStabilityBonuses` telemetry 추가

2. **Othello-sensei -> quiet / edge-endpoint ordering**
   - quiet move: 착수 후 착수점 인접 empty 수가 매우 적은 수를 보너스
   - edge endpoint: 현재 edge empty segment의 양끝 수를 보너스
   - `orderingQuietMoveBonuses`, `orderingEdgeEndpointBonuses` telemetry 추가

3. **Zebra -> late shallow-depth ladder MPC selection**
   - MPC calibration 선택 시 late empties에서 shallow depth cap을 먼저 두는 `selectionMode: zebra-ladder` 추가
   - representative smoke에서 volatility guard가 너무 강하면 ladder까지 내려가기 전에 스킵될 수 있으므로,
     `guarded`와 `open` 두 계열로 후보를 분리
   - `mpcZebraLadderSelections`, `mpcZebraLadderFiltered` telemetry 추가

## 후보 우선순위

### stage154
- 1순위: `s154-stable-zebra-open`
- 2순위: `s154-stable-zebra`
- 3순위: `s154-stable-quiet`
- 4순위: `s154-anchor-main`
- 5순위: `s154-stable-quiet-probe`
- 6순위: `s154-zebra-both-probe`

### stage151
- 1순위: `s151-noend-stable-zebra-open`
- 2순위: `s151-noend-stable-zebra`
- 3순위: `s151-noend-stable-quiet`
- 4순위: `s151-anchor-noend`
- 5순위: `s151-latea-stable-zebra`
- 6순위: `s151-linear-quiet-off`
- 7순위: `s151-noend-zebra-both`

## smoke 해석 요령

- `guarded zebra` 후보는 representative sample에서 `mpcVolatilitySkips`가 높고 `mpcZebraLadderSelections`가 0일 수 있음.
  이 경우 Zebra ladder가 코드상으로는 살아 있지만, tactical protection 때문에 representative sample에서 발동 안 한 것.
- `open zebra` 후보는 `mpcZebraLadderSelections > 0`가 찍혀야 하며,
  이 후보로 실제 ladder selection이 representative smoke까지 내려오는지를 확인한다.
- `orderingStabilityBonuses`, `orderingQuietMoveBonuses`, `orderingEdgeEndpointBonuses`는
  stable/quiet 계열 후보에서 control 대비 0이 아니어야 한다.
