# Stage 181 — trineutron finals late-check

- candidate: `s176-main-frontier-bothlite-topk2`
- frame: s154-both only / 240, 360ms / seeds 17, 31, 53, 71, 89, 107 / games 1
- prior main-session result: 동률 -> 패배 -> 패배 | overall 16/24 vs vanilla 17.5/24 (-1.50 pts)
- prior both-session result: 동률 -> 패배 -> 승리 | overall 16.5/24 vs vanilla 17/24 (-0.50 pts)

## 240/360ms reinforced late-check

- 240ms: 패배 | candidate 8/12 vs vanilla 8.5/12 (-0.50 pts, scoreRate -0.04)
- 360ms: 승리 | candidate 7/12 vs vanilla 6.5/12 (+0.50 pts, scoreRate +0.04)
- overall: 패배 -> 승리 | candidate 15/24 vs vanilla 15/24 (0.00 pts, scoreRate 0.00)
- avgOurNodes/game: candidate 41408.1 vs vanilla 40108.8

## Session verdict

- decision: **hold**
- rationale: late-check가 결정적인 분리를 만들지 못했습니다.

