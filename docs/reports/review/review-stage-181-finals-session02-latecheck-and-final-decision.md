# Stage 181 — finals session02 late-check and final decision

## Scope

`session01`에서 `s176-main-assertive-both-lite`, `s176-main-frontier-bothlite-topk2`를 각각 `stage-154-main`, `stage-154-both` overlay로 `trineutron` against 검증했습니다. 그 결과 둘 다 vanilla baseline을 overall로 넘지 못했습니다.

이번 `session02`에서는 assistant가 남겨 두었던 유일한 open question, 즉 `s176-main-frontier-bothlite-topk2 @ stage-154-both`의 `240ms` late-positive가 더 긴 시간에서도 유지되는지만 좁게 재시험했습니다. frame은 `240/360ms`, seeds `17,31,53,71,89,107`, classic, games `1`이었습니다.

## Result

- `240ms`: candidate `8.0/12` vs vanilla `8.5/12` → **loss**
- `360ms`: candidate `7.0/12` vs vanilla `6.5/12` → **win**
- combined `240/360ms`: candidate `15.0/24` vs vanilla `15.0/24` → **draw**
- avg nodes/game: candidate `41408.1` vs vanilla `40108.8`

즉 late-positive는 `360ms`에서만 약하게 살아났고, reinforced late-check 전체로 보면 vanilla `s154-both`를 넘지 못했습니다. main 축 음수는 session01에서 이미 확정돼 있었기 때문에, 이 draw는 adoption 근거가 아니라 단지 discard를 뒤집지 못한 신호로 해석하는 것이 맞습니다.

## Final decision

최종 권고는 **option2 — 둘 다 폐기**입니다.

이 결론은 다음 네 문장으로 요약됩니다.
1. `assertive-both-lite`는 main/both 두 축 모두 overall 음수였습니다.
2. `frontier-bothlite-topk2`도 main/both 두 축 모두 overall 음수였습니다.
3. 좁힌 late-check에서도 `frontier-bothlite-topk2`는 `240ms` 재패배, `360ms` 소폭 반등, combined draw에 그쳤습니다.
4. candidate overlays는 baseline보다 계산량도 더 컸습니다.

따라서 option1/3/4를 정당화할 실익이 없고, 기록만 남기고 폐기하는 option2가 가장 자연스럽습니다.
