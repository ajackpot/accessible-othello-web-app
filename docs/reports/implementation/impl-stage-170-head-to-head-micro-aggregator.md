# Implementation note - stage170 survivor head-to-head micro aggregator

## 이번 변경
`tools/engine-match/aggregate-stage170-head-to-head-micro-results.mjs`를 추가했습니다.

## 목적
head-to-head direct benchmark를 time × seed micro run으로 쪼개어 회수한 뒤,
이를 다시 하나의 `80/160/240ms`, `6 seeds` 요약으로 합치기 위한 도구입니다.

## 입력
- `--micro-dir`: micro result JSON들이 들어 있는 디렉터리
- `--output-dir`: summary를 쓸 디렉터리
- `--first-candidate`
- `--second-candidate`

## 출력
- `summary.json`
- `summary.md`

## 집계 방식
- 각 micro run은 1개의 scenario만 가진다고 가정합니다.
- 같은 `timeLimitMs`끼리 합쳐 points와 score rate를 계산합니다.
- nodes/ms는 micro run별 `averageNodes * totalTurns`, `averageElapsedMs * totalTurns`를 누적해 가중 평균으로 복원합니다.
- pattern은 second-candidate 기준 `승리/패배/동률`로 정리합니다.

## 사용 이유
현재 실행 환경에서는 large one-shot head-to-head가 불안정하게 끊길 수 있어,
micro run으로 안전하게 회수한 뒤 동일 표본을 재구성하는 방식이 필요했습니다.
