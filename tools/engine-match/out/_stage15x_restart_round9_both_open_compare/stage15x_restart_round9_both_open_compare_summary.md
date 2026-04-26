# Stage15x restart round 9: add `s154-both + s158-stable-zebra-open`

## What was compared

- Stored controls from round 8 were kept as the comparison baseline: `active`, `s154-main + s158-stable-zebra-open`, `s154-both`, `s154-main`.
- Fresh run in this round added only the newly requested overlay candidate: `s154-both + s158-stable-zebra-open`.
- Scenario pack stayed identical to round 8: 3 noisy MTD(f) seeds + 3 noisy PVS seeds, `1 opening × 2 colors`, total **12 games per variant**.
- Comparison caveat: wall-clock timings for the new candidate come from the fresh run; the four controls are reused from the stored round 8 artifacts rather than rerun today.

## Total results

| Variant | Source | Points | W-L-D | Avg disc diff | Δ vs active (pts) | Δ vs active (disc) | Avg wall sec/scenario |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| s154-main | stored-round8 | 9.0/12 | 9-3-0 | +5.667 | +5.0 | +11.667 | 47.5 |
| s154-both | stored-round8 | 8.0/12 | 8-4-0 | +4.167 | +4.0 | +10.167 | 46.9 |
| s154-both + s158-stable-zebra-open | fresh-round9 | 8.0/12 | 8-4-0 | +3.667 | +4.0 | +9.667 | 49.1 |
| s154-main + s158-stable-zebra-open | stored-round8 | 7.0/12 | 7-5-0 | -0.167 | +3.0 | +5.833 | 48.3 |
| active-installed | stored-round8 | 4.0/12 | 4-8-0 | -6.000 | +0.0 | +0.000 | 44.6 |

## Key pairwise comparisons for the new candidate

| Comparison | Points delta | Avg disc delta | Read |
| --- | ---: | ---: | --- |
| vs base `s154-both` | +0.0 | -0.500 | worse |
| vs `s154-main + s158-open` | +1.0 | +3.833 | better |
| vs base `s154-main` | -1.0 | -2.000 | worse |

## Family slices

### MTD(f)

| Variant | Points | W-L-D | Avg disc diff |
| --- | ---: | ---: | ---: |
| s154-both | 3.0/6 | 3-3-0 | -4.667 |
| s154-both + s158-stable-zebra-open | 3.0/6 | 3-3-0 | -4.667 |
| s154-main + s158-stable-zebra-open | 3.0/6 | 3-3-0 | -4.667 |
| s154-main | 3.0/6 | 3-3-0 | -5.333 |
| active-installed | 2.0/6 | 2-4-0 | -5.333 |

### PVS

| Variant | Points | W-L-D | Avg disc diff |
| --- | ---: | ---: | ---: |
| s154-main | 6.0/6 | 6-0-0 | +16.667 |
| s154-both | 5.0/6 | 5-1-0 | +13.000 |
| s154-both + s158-stable-zebra-open | 5.0/6 | 5-1-0 | +12.000 |
| s154-main + s158-stable-zebra-open | 4.0/6 | 4-2-0 | +4.333 |
| active-installed | 2.0/6 | 2-4-0 | -6.667 |

## Per-scenario view for the new candidate

### noisy 1500ms MTD(f) seed29

| Variant | Points | Avg disc diff | Source |
| --- | ---: | ---: | --- |
| active-installed | 1.0/2 | +5.000 | stored-round8 |
| s154-main | 1.0/2 | -3.000 | stored-round8 |
| s154-both | 1.0/2 | -3.000 | stored-round8 |
| s154-main + s158-stable-zebra-open | 1.0/2 | -3.000 | stored-round8 |
| s154-both + s158-stable-zebra-open | 1.0/2 | -9.000 | fresh-round9 |

### noisy 1500ms MTD(f) seed53

| Variant | Points | Avg disc diff | Source |
| --- | ---: | ---: | --- |
| s154-both + s158-stable-zebra-open | 1.0/2 | +9.000 | fresh-round9 |
| s154-both | 1.0/2 | +3.000 | stored-round8 |
| s154-main + s158-stable-zebra-open | 1.0/2 | +3.000 | stored-round8 |
| s154-main | 1.0/2 | +0.000 | stored-round8 |
| active-installed | 1.0/2 | -1.000 | stored-round8 |

### noisy 1500ms MTD(f) seed107

| Variant | Points | Avg disc diff | Source |
| --- | ---: | ---: | --- |
| s154-main | 1.0/2 | -13.000 | stored-round8 |
| s154-both | 1.0/2 | -14.000 | stored-round8 |
| s154-both + s158-stable-zebra-open | 1.0/2 | -14.000 | fresh-round9 |
| s154-main + s158-stable-zebra-open | 1.0/2 | -14.000 | stored-round8 |
| active-installed | 0.0/2 | -20.000 | stored-round8 |

### noisy 1500ms PVS seed71

| Variant | Points | Avg disc diff | Source |
| --- | ---: | ---: | --- |
| s154-both + s158-stable-zebra-open | 2.0/2 | +8.000 | fresh-round9 |
| s154-main + s158-stable-zebra-open | 2.0/2 | +8.000 | stored-round8 |
| s154-main | 2.0/2 | +5.000 | stored-round8 |
| s154-both | 2.0/2 | +5.000 | stored-round8 |
| active-installed | 1.0/2 | -11.000 | stored-round8 |

### noisy 1500ms PVS seed89

| Variant | Points | Avg disc diff | Source |
| --- | ---: | ---: | --- |
| s154-main | 2.0/2 | +26.000 | stored-round8 |
| s154-both | 1.0/2 | +11.000 | stored-round8 |
| s154-both + s158-stable-zebra-open | 1.0/2 | +11.000 | fresh-round9 |
| active-installed | 1.0/2 | +7.000 | stored-round8 |
| s154-main + s158-stable-zebra-open | 0.0/2 | -14.000 | stored-round8 |

### noisy 1500ms PVS seed131

| Variant | Points | Avg disc diff | Source |
| --- | ---: | ---: | --- |
| s154-both | 2.0/2 | +23.000 | stored-round8 |
| s154-main | 2.0/2 | +19.000 | stored-round8 |
| s154-main + s158-stable-zebra-open | 2.0/2 | +19.000 | stored-round8 |
| s154-both + s158-stable-zebra-open | 2.0/2 | +17.000 | fresh-round9 |
| active-installed | 0.0/2 | -16.000 | stored-round8 |

## Interpretation

- Fresh `s154-both + s158-stable-zebra-open` finished **8.0/12**, average disc diff **+3.667**.
- Against base `s154-both`, that is **+0.0 points** and **-0.500 disc diff**. The point total is tied, but the margin is lower, so the overlay does **not** show a clean uplift on `s154-both`.
- Against `s154-main + s158-stable-zebra-open`, the new candidate is **+1.0 points** and **+3.833 disc diff** better. So the same open overlay behaves much more sanely on `s154-both` than it did on `s154-main` in round 8.
- Base `s154-main` remains the strongest stored control here at **9.0/12**, **+5.667**.
- Practical read: `stable-zebra-open` appears **portable** to `s154-both` without causing collapse, but it still does not beat the simpler base `s154-both`, and it stays clearly below base `s154-main`.
- Therefore the current ordering stays: **`s154-main` first, `s154-both` second, `s154-both + s158-open` as an interesting but non-promoting branch, `s154-main + s158-open` still reserve/control.**
