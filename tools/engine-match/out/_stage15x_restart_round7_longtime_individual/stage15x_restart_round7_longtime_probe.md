# Stage15x restart round 7: long-think-time safety probe

## Probe results

| Scenario | Algorithm | Time ms | Games | Wall seconds | Avg our ms/game | Avg their ms/game | Avg disc diff |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| probe-mtdf-1500 | classic-mtdf-2ply | 1500 | 2 | 52 | 5634.5 | 19510.5 | 10.000 |
| probe-mtdf-2100 | classic-mtdf-2ply | 2100 | 2 | 71 | 7385.0 | 27308.0 | -9.000 |
| probe-mtdf-3000 | classic-mtdf-2ply | 3000 | 2 | 95 | 7542.5 | 39004.5 | -3.000 |
| probe-pvs-3000 | classic | 3000 | 2 | 94 | 7408.5 | 39014.5 | 8.000 |

## Recommendation

- Highest empirically validated safe point across both classic families in this environment: `3000ms`. Each `1 opening × 2 colors` run finished with comfortable headroom inside the command budget.
- For this round, the long-time noisy comparison therefore uses `3000ms` with reduced game count and individual-run aggregation.

