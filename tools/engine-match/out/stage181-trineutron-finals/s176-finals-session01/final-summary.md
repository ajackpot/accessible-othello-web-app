# Stage 181 — trineutron finals session

- first candidate: `s176-main-assertive-both-lite`
- second candidate: `s176-main-frontier-bothlite-topk2`
- frame: classic / 80, 160, 240ms / seeds 17, 31, 53, 71 / games 1
- recommendation: **둘 다 폐기한다** (medium)
- rationale: 두 후보 모두 vanilla baseline 두 축에서 overall 음수입니다.

## Baseline-relative summary

### s176-main-assertive-both-lite

- main: 동률 -> 동률 -> 패배 | overall 17/24 vs vanilla 17.5/24 (-0.50 pts, scoreRate -0.02)
- both: 동률 -> 패배 -> 패배 | overall 15/24 vs vanilla 17/24 (-2.00 pts, scoreRate -0.08)

### s176-main-frontier-bothlite-topk2

- main: 동률 -> 패배 -> 패배 | overall 16/24 vs vanilla 17.5/24 (-1.50 pts, scoreRate -0.06)
- both: 동률 -> 패배 -> 승리 | overall 16.5/24 vs vanilla 17/24 (-0.50 pts, scoreRate -0.02)

## Direct candidate comparison by base

- main: 동률 -> 승리 -> 동률 | s176-main-assertive-both-lite 17/24 vs s176-main-frontier-bothlite-topk2 16/24
- both: 동률 -> 동률 -> 패배 | s176-main-assertive-both-lite 15/24 vs s176-main-frontier-bothlite-topk2 16.5/24

## Overall aggregates

- s154-main: 17.5/24, scoreRate 0.729, avgDiscDiff 10.63, avgOurNodes 24880.8
- s154-both: 17/24, scoreRate 0.708, avgDiscDiff 10.88, avgOurNodes 24689.8
- s154-main__s176-main-assertive-both-lite: 17/24, scoreRate 0.708, avgDiscDiff 9.67, avgOurNodes 28726.7
- s154-both__s176-main-assertive-both-lite: 15/24, scoreRate 0.625, avgDiscDiff 9.25, avgOurNodes 28609.2
- s154-main__s176-main-frontier-bothlite-topk2: 16/24, scoreRate 0.667, avgDiscDiff 9.71, avgOurNodes 27584.8
- s154-both__s176-main-frontier-bothlite-topk2: 16.5/24, scoreRate 0.688, avgDiscDiff 8.54, avgOurNodes 27154.0

