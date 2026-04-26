# Stage 167 benchmark reset samples

이 문서는 stage15x factorized pattern-bank export bug를 찾은 뒤, **폐기 대상이 된 이전 benchmark의 증상 일부만 남기는 요약본**입니다.
새 판정은 이 파일이 아니라, repaired export를 기준으로 다시 시작해야 합니다.

## 왜 이전 결과를 폐기하는가
- `s154-main`, `s154-wide-safe` 같은 stage15x exported candidate가 broken factorized export 경로를 거쳤습니다.
- 그 결과 exported module 안의 board-dependent pattern table이 빠지고 phase bias만 남은 상태에 가까웠습니다.
- 따라서 아래 숫자는 **채택 근거가 아니라 증상 기록**입니다.

## Stage 162 - support screening (80ms, 12 games)
| variant | points | avg disc diff |
| --- | ---: | ---: |
| s154-wide-safe | 9 | 16.250 |
| s154-split | 9 | 14.583 |
| s154-both | 9 | 13.333 |
| active | 9 | 13.000 |
| s154-main | 9 | 10.667 |
| s154-safe | 9 | 10.000 |

## Stage 162 - structural screening (80ms finalists, 12 games)
| variant | points | avg disc diff |
| --- | ---: | ---: |
| s154-stable-zebra-open | 10 | 17.083 |
| s154-stable-zebra | 9 | 15.750 |
| s154-zebra-both-probe | 9 | 14.750 |
| s154-main-base | 9 | 13.083 |
| s154-stable-quiet-probe | 9 | 12.667 |
| active | 7 | 5.000 |

## Stage 165 - round 3 (240ms overall, 12 games)
| variant | points | avg disc diff |
| --- | ---: | ---: |
| active | 8.0 | 7.667 |
| s154-main-base | 7.0 | 6.333 |
| s154-wide-safe | 7.0 | 5.333 |
| s154-stable-zebra | 6.0 | 4.333 |
| s154-stable-zebra-open | 6.0 | 3.833 |
| s154-zebra-both-probe | 5.0 | 2.500 |

## Stage 165 - noisy + XOT slice (240ms, 8 games)
| variant | points | avg disc diff |
| --- | ---: | ---: |
| s154-main-base | 5.0 | 7.750 |
| s154-wide-safe | 5.0 | 7.250 |
| active | 5.0 | 6.750 |
| s154-zebra-both-probe | 4.0 | 6.000 |
| s154-stable-zebra | 4.0 | 6.000 |
| s154-stable-zebra-open | 4.0 | 5.000 |

## Stage 166 - pattern-stress suite (240ms, 8 games)
| variant | points | avg disc diff |
| --- | ---: | ---: |
| s154-wide-safe | 4 | 4.000 |
| s154-main-base | 4 | 2.750 |
| s154-stable-zebra-open | 4 | 2.000 |
| s154-stable-zebra | 4 | 1.000 |
| active | 4 | 0.125 |
| s154-zebra-both-probe | 4 | -0.750 |

모든 후보가 4/8 동률이었던 것이 특히 중요했습니다. 이 결과가 stage167 root-cause 조사로 이어졌습니다.

## Stage 167 - repaired stage154 exports
| module | size (MiB) | note |
| --- | ---: | --- |
| s154-both.generated.js | 2.230 | factorized payload likely present |
| s154-main.generated.js | 2.230 | factorized payload likely present |
| s154-safe.generated.js | 2.229 | factorized payload likely present |
| s154-split.generated.js | 2.230 | factorized payload likely present |
| s154-wide-safe.generated.js | 2.230 | factorized payload likely present |

새 benchmark는 repaired export와, split-late3 export 재생성 이후의 candidate를 기준으로 다시 시작합니다.
