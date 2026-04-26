# Stage15x restart round 9: new variant only

## What was run

- Focused long-think follow-up used **`1500ms`**, comfortably below the previously validated `3000ms` plateau.
- Format: individual runs aggregated afterward, `1 opening × 2 colors` per scenario, total **12 games per variant**.
- Scenarios:
  - `noisy1500-mtdf-seed29` — noisy 1500ms MTD(f) seed29
  - `noisy1500-mtdf-seed53` — noisy 1500ms MTD(f) seed53
  - `noisy1500-mtdf-seed107` — noisy 1500ms MTD(f) seed107
  - `noisy1500-pvs-seed71` — noisy 1500ms PVS seed71
  - `noisy1500-pvs-seed89` — noisy 1500ms PVS seed89
  - `noisy1500-pvs-seed131` — noisy 1500ms PVS seed131
- Variant: `s154-both + s158-stable-zebra-open` only.

## Total results

| Variant | Points | W-L-D | Avg disc diff | Delta vs active (pts) | Delta vs active (disc) | Avg wall sec/scenario |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 8.0/12 | 8-4-0 | +3.667 | +8.0 | +3.667 | 49.1 |

## Family slices

### MTD(f)

| Variant | Points | W-L-D | Avg disc diff |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 3.0/6 | 3-3-0 | -4.667 |

### PVS

| Variant | Points | W-L-D | Avg disc diff |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 5.0/6 | 5-1-0 | +12.000 |

## Per-scenario view

### noisy 1500ms MTD(f) seed29

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 1.0/2 | -9.000 | 51.5 |

### noisy 1500ms MTD(f) seed53

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 1.0/2 | +9.000 | 49.0 |

### noisy 1500ms MTD(f) seed107

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 1.0/2 | -14.000 | 48.1 |

### noisy 1500ms PVS seed71

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 2.0/2 | +8.000 | 48.9 |

### noisy 1500ms PVS seed89

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 1.0/2 | +11.000 | 48.6 |

### noisy 1500ms PVS seed131

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both + s158-stable-zebra-open | 2.0/2 | +17.000 | 48.3 |

## Interpretation

- **Current 1500ms leader:** `s154-both + s158-stable-zebra-open` at `8.0/12`, average disc diff `+3.667`.
- This file intentionally reruns only the newly requested overlay candidate.
- The key read is whether applying the same stable-zebra-open overlay on `s154-both` improves, holds, or hurts relative to stored `s154-both` and `s154-main+s158-open`.

## Candidate note after this run

- `s154-both + s158-stable-zebra-open`

