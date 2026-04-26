# Individual survivor summary for s157-main-assertive-both

- evaluation mode: `historical-reuse-exact-match`
- source summary: `tools/engine-match/out/stage168-assertiveboth-cont/s157-main-assertive-both/summary.json`
- why reuse was valid:
  - stage169의 candidate definition이 stage168 historical run과 동일합니다.
  - `s154-main`, `s154-both` 위 overlay engine-options JSON의 SHA-256이 historical artifact와 둘 다 일치합니다.
  - benchmark frame도 `classic`, `80/160/240ms`, seeds `17,31,53,71`, paired openings `1`로 동일합니다.

| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms |
|---|---:|---:|---:|---:|---:|---:|
| s154-both | 80 | 2.0/8 (25.0%) | 6.0/8 (75.0%) | +0.500 | 8.43 | 8.88 |
| s154-both | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 9.93 | 9.80 |
| s154-both | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 10.11 | 10.04 |
| s154-main | 80 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 7.90 | 8.07 |
| s154-main | 160 | 4.0/8 (50.0%) | 4.0/8 (50.0%) | +0.000 | 9.20 | 8.91 |
| s154-main | 240 | 3.0/8 (37.5%) | 5.0/8 (62.5%) | +0.250 | 9.58 | 9.41 |

## 집계
- overall: baseline `20.0/48`, candidate `28.0/48`
- `s154-main`: **동률 -> 동률 -> 승리**
- `s154-both`: **승리 -> 동률 -> 승리**
- time totals: `80ms 6.0:10.0`, `160ms 8.0:8.0`, `240ms 6.0:10.0`
- average nodes/ms: baseline `9.19`, candidate `9.18`

pointGap은 **candidate overlay - baseline** 기준입니다.
