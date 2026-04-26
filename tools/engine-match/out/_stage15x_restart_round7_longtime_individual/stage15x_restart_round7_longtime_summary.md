# Stage15x restart round 7: long-think-time noisy confirmation

## What was run

- Long-think noisy comparison used **`3000ms`**, selected after direct safety probes at higher budgets.
- Format: individual runs aggregated afterward, `1 opening × 2 colors` per scenario, total **4 games per variant**.
- Scenarios:
  - `noisy3000-mtdf-seed29` — noisy 3000ms MTD(f) seed29
  - `noisy3000-pvs-seed71` — noisy 3000ms PVS seed71
- Variants: `active`, `s154-main + s158-stable-zebra-open`, `s151-safe-full`, `s154-both`, `s154-main`.

## Total results

| Variant | Points | W-L-D | Avg disc diff | Delta vs active (pts) | Delta vs active (disc) |
| --- | ---: | ---: | ---: | ---: | ---: |
| s154-both | 3.0/4 | 3-1-0 | +3.000 | +1.0 | +10.500 |
| s154-main | 3.0/4 | 3-1-0 | +3.000 | +1.0 | +10.500 |
| s154-main + s158-stable-zebra-open | 3.0/4 | 3-1-0 | +2.500 | +1.0 | +10.000 |
| s151-safe-full | 2.0/4 | 2-2-0 | +2.000 | +0.0 | +9.500 |
| active-installed | 2.0/4 | 2-2-0 | -7.500 | +0.0 | +0.000 |

## Slice view

### noisy 3000ms MTD(f) seed29

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s151-safe-full | 1.0/2 | -2.000 | 90.0 |
| s154-both | 1.0/2 | -3.000 | 92.1 |
| s154-main | 1.0/2 | -3.000 | 91.4 |
| s154-main + s158-stable-zebra-open | 1.0/2 | -3.000 | 95.2 |
| active-installed | 1.0/2 | -5.000 | 87.4 |

### noisy 3000ms PVS seed71

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both | 2.0/2 | +9.000 | 92.2 |
| s154-main | 2.0/2 | +9.000 | 92.7 |
| s154-main + s158-stable-zebra-open | 2.0/2 | +8.000 | 94.2 |
| s151-safe-full | 1.0/2 | +6.000 | 92.3 |
| active-installed | 1.0/2 | -10.000 | 88.0 |

## Interpretation

- **Current long-think co-leaders:** `s154-both` and `s154-main`, both at `3.0/4`, average disc diff `+3.000`.
- Reference `active` finished `2.0/4`, average disc diff `-7.500`.
- Because the game count is intentionally small, this round is best read as a **pattern check under longer thought time**, not as a final adoption gate.
- The time-safety probe selected `3000ms` as the highest empirically validated safe point across both classic families in this environment. Probe details are in `tools/engine-match/out/_stage15x_restart_round7_longtime_individual/stage15x_restart_round7_longtime_probe.md`.

## Recommended shortlist after this round

- `s154-both`
- `s154-main`
- `s154-main + s158-stable-zebra-open`
- `s151-safe-full`

