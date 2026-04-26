# Verdict: `s170-main-stable-verify`

## 결론
` s170-main-stable-verify `는 **비채택**으로 닫는 것이 맞습니다.

## 근거
패턴은 아래처럼 정리됩니다.

- `s154-main`: **패배 -> 패배 -> 패배**
- `s154-both`: **승리 -> 동률 -> 동률**

즉 candidate가 살아 있는 축은 `s154-both 80ms` 한 셀뿐이고,
더 중요한 `s154-main` 축에서는 short/mid/long 전부 음수였습니다.

전체 합산도 baseline `28.5/48`, candidate `19.5/48`로 baseline이 크게 앞섭니다.
이 차이는 단순 노이즈나 한두 셀 흔들림으로 보기 어렵습니다.

cost도 같이 나쁩니다.
aggregated rows **6개 전부**에서 nodes/ms는 baseline이 더 높았습니다.

## 해석
이번 조합은
`stage154-stable-quiet-v1` ordering에 `verify-tight-v1` MPC를 얹으면
stage158 ordering 신호가 더 깨끗해질 수 있는지 보려는 분리 실험이었습니다.

하지만 결과는 반대로,
- `s154-main` 상대로는 전 시간대 열세,
- `s154-both` 상대로도 short-think 한 셀만 부분 양수,
- throughput도 전반적 열세로 나왔습니다.

따라서 이 후보는 보류로 둘 이유보다 **초기 조합 가설이 틀렸다고 보는 근거**가 훨씬 강합니다.

## 추천 후속
이 조합 자체는 더 표본을 늘리기보다 여기서 폐기하고,
남은 통합 lane은 `frontier-zebra` 또는 개별 lane의 `assertive-both` 쪽으로 옮기는 편이 낫습니다.
