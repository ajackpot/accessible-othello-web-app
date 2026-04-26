# Stage15x restart round 8: 1500ms noisy confirmation

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
- Variants: `active`, `s154-main + s158-stable-zebra-open`, `s154-both`, `s154-main`.

## Total results

| Variant | Points | W-L-D | Avg disc diff | Delta vs active (pts) | Delta vs active (disc) | Avg wall sec/scenario |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| s154-main | 9.0/12 | 9-3-0 | +5.667 | +5.0 | +11.667 | 47.5 |
| s154-both | 8.0/12 | 8-4-0 | +4.167 | +4.0 | +10.167 | 46.9 |
| s154-main + s158-stable-zebra-open | 7.0/12 | 7-5-0 | -0.167 | +3.0 | +5.833 | 48.3 |
| active-installed | 4.0/12 | 4-8-0 | -6.000 | +0.0 | +0.000 | 44.6 |

## Family slices

### MTD(f)

| Variant | Points | W-L-D | Avg disc diff |
| --- | ---: | ---: | ---: |
| s154-both | 3.0/6 | 3-3-0 | -4.667 |
| s154-main + s158-stable-zebra-open | 3.0/6 | 3-3-0 | -4.667 |
| s154-main | 3.0/6 | 3-3-0 | -5.333 |
| active-installed | 2.0/6 | 2-4-0 | -5.333 |

### PVS

| Variant | Points | W-L-D | Avg disc diff |
| --- | ---: | ---: | ---: |
| s154-main | 6.0/6 | 6-0-0 | +16.667 |
| s154-both | 5.0/6 | 5-1-0 | +13.000 |
| s154-main + s158-stable-zebra-open | 4.0/6 | 4-2-0 | +4.333 |
| active-installed | 2.0/6 | 2-4-0 | -6.667 |

## Per-scenario view

### noisy 1500ms MTD(f) seed29

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| active-installed | 1.0/2 | +5.000 | 44.3 |
| s154-main | 1.0/2 | -3.000 | 47.5 |
| s154-both | 1.0/2 | -3.000 | 47.3 |
| s154-main + s158-stable-zebra-open | 1.0/2 | -3.000 | 48.8 |

### noisy 1500ms MTD(f) seed53

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both | 1.0/2 | +3.000 | 46.6 |
| s154-main + s158-stable-zebra-open | 1.0/2 | +3.000 | 48.6 |
| s154-main | 1.0/2 | +0.000 | 47.3 |
| active-installed | 1.0/2 | -1.000 | 46.1 |

### noisy 1500ms MTD(f) seed107

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-main | 1.0/2 | -13.000 | 47.1 |
| s154-both | 1.0/2 | -14.000 | 46.4 |
| s154-main + s158-stable-zebra-open | 1.0/2 | -14.000 | 47.4 |
| active-installed | 0.0/2 | -20.000 | 44.3 |

### noisy 1500ms PVS seed71

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-main + s158-stable-zebra-open | 2.0/2 | +8.000 | 47.9 |
| s154-main | 2.0/2 | +5.000 | 47.9 |
| s154-both | 2.0/2 | +5.000 | 47.5 |
| active-installed | 1.0/2 | -11.000 | 44.6 |

### noisy 1500ms PVS seed89

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-main | 2.0/2 | +26.000 | 47.6 |
| s154-both | 1.0/2 | +11.000 | 47.1 |
| active-installed | 1.0/2 | +7.000 | 45.3 |
| s154-main + s158-stable-zebra-open | 0.0/2 | -14.000 | 48.7 |

### noisy 1500ms PVS seed131

| Variant | Points | Avg disc diff | Wall seconds |
| --- | ---: | ---: | ---: |
| s154-both | 2.0/2 | +23.000 | 46.7 |
| s154-main | 2.0/2 | +19.000 | 47.8 |
| s154-main + s158-stable-zebra-open | 2.0/2 | +19.000 | 48.1 |
| active-installed | 0.0/2 | -16.000 | 43.4 |

## Interpretation

- **Current 1500ms leader:** `s154-main` at `9.0/12`, average disc diff `+5.667`.
- Reference `active` finished `4.0/12`, average disc diff `-6.000`.
- This round is still noisy-only, but the sample is tripled relative to the 3000ms check and stays in the same individual-run aggregation format.
- The key read should therefore be whether the stage154 base/overlay ordering stays stable when the budget drops from 3000ms to 1500ms.

## Recommended shortlist after this round

- `s154-main`
- `s154-both`
- `s154-main + s158-stable-zebra-open`
- `active-installed`

