# Stage 181 — finals final decision

- recommendation: **option2 — 둘 다 폐기한다**
- confidence: medium-high

## Why

- `s176-main-assertive-both-lite`
  - `stage-154-main`: overall `17.0/24` vs vanilla `17.5/24` (**-0.5 pts**)
  - `stage-154-both`: overall `15.0/24` vs vanilla `17.0/24` (**-2.0 pts**)
  - avg nodes/game: `28726.7` (main overlay), `28609.2` (both overlay)
- `s176-main-frontier-bothlite-topk2`
  - `stage-154-main`: overall `16.0/24` vs vanilla `17.5/24` (**-1.5 pts**)
  - `stage-154-both`: overall `16.5/24` vs vanilla `17.0/24` (**-0.5 pts**)
  - avg nodes/game: `27584.8` (main overlay), `27154.0` (both overlay)

## Late-check for `s176-main-frontier-bothlite-topk2` on `stage-154-both`

- `240ms`: candidate `8.0/12` vs vanilla `8.5/12` (**-0.5 pts**)
- `360ms`: candidate `7.0/12` vs vanilla `6.5/12` (**+0.5 pts**)
- combined `240/360ms`: candidate `15.0/24` vs vanilla `15.0/24` (**0.0 pts**)
- avg nodes/game: candidate `41408.1` vs vanilla `40108.8`

## Interpretation

`frontier-bothlite-topk2`의 late-positive는 360ms에서만 약하게 나타났고, reinforced 240/360ms 합산에서는 vanilla `s154-both`를 넘지 못했습니다. 또한 main 축 음수는 그대로 남고 계산량도 더 큽니다. `assertive-both-lite`는 두 baseline 축 모두 더 분명하게 음수입니다.

그래서 이번 결선의 최종 선택지는 **1/3/4가 아니라 2**가 맞습니다. 즉 두 후보를 runtime 채택 대상으로 보지 않고, 기록만 남긴 채 **폐기**하는 쪽이 가장 자연스럽습니다.
