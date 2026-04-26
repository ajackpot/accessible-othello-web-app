# Stage170 kickoff round10 - `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both` direct head-to-head

## 1. 배경
round9 기준 surviving adopted trio의 direct hierarchy는 아래처럼 남아 있었습니다.

- `s170-main-wide-zebra` — 두 direct match에서 모두 **19:17**로 약한 provisional lead
- `s157-main-assertive-both` — long-think 안정성이 좋은 individual anchor survivor
- `s170-main-frontier-zebra-bothlite` — frontier lane successor survivor

이번 round10은 round9 권고대로
**`s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both`**를 직접 비교해,
challenger cluster 내부에서 실제 분리가 있는지를 확인하는 단계였습니다.

## 2. 실행 프레임
- search: `classic`
- time: `80 / 160 / 240 ms`
- seeds: `17, 31, 53, 71, 89, 107`
- paired openings per seed: `1`
- total games per time slice: `12`

실행은 round8/round9와 같은 방식으로,
**time × seed micro run 18개**를 회수한 뒤 다시 같은 frame으로 집계했습니다.

## 3. 결과 요약
| matchup | pattern from second perspective | overall | interim verdict |
| --- | --- | --- | --- |
| `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both` | `동률 -> 동률 -> 동률` | `18.0/36` vs `18.0/36` | **보류** |

시간대별 요약:

| time | `s170-main-frontier-zebra-bothlite` | `s157-main-assertive-both` | slice verdict |
| --- | ---: | ---: | --- |
| `80ms` | `6/12` | `6/12` | 동률 |
| `160ms` | `6/12` | `6/12` | 동률 |
| `240ms` | `6/12` | `6/12` | 동률 |

throughput:
- `s170-main-frontier-zebra-bothlite`: **12.05 nodes/ms**
- `s157-main-assertive-both`: **13.14 nodes/ms**

## 4. 해석
이번 매치는 strength 관점에서는 거의 이상적일 정도로 **완전한 동률**이었습니다.

> score만 보면 두 후보는 이번 frame 안에서 전혀 분리되지 않는다.

### score 측면에서 분리가 안 되는 이유
- 세 시간대 모두 **6:6**입니다.
- overall도 **18:18**입니다.
- 즉 short / mid / long 어느 쪽에서도 한 후보가 다른 후보를 밀어내지 못했습니다.

### `assertive-both` 쪽에 남는 장점
- throughput은 전체적으로 더 좋습니다.
- `80`, `160`, `240ms` 모두 nodes/ms가 `bothlite`보다 높게 남았습니다.

### 그래도 hierarchy를 바꾸지 않는 이유
- 이번 lane에서 direct hierarchy 기준은 어디까지나 **fixed-time score**입니다.
- score가 exact draw인 상태에서는 throughput 우세만으로 direct 승격을 선언하지 않습니다.
- 따라서 `assertive-both`를 `bothlite` 위로 올리거나, 반대로 `bothlite`를 `assertive-both` 위로 둘 근거가 없습니다.

## 5. bracket 해석 업데이트
round8~10까지의 direct head-to-head만 놓고 보면 표는 아래처럼 정리됩니다.

| matchup | result | interim interpretation |
| --- | --- | --- |
| `s157-main-assertive-both` vs `s170-main-wide-zebra` | `17:19` | `wide-zebra` 약한 provisional lead |
| `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra` | `17:19` | `wide-zebra` 약한 provisional lead |
| `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both` | `18:18` | challenger tier exact draw |

즉 current bracket는 아래처럼 읽는 것이 가장 자연스럽습니다.

- **provisional leader:** `s170-main-wide-zebra`
- **challenger cluster:** `s157-main-assertive-both`, `s170-main-frontier-zebra-bothlite`
- `assertive-both`와 `bothlite` 사이에는 이번 frame만으로는 hierarchy 없음

## 6. 결론
### 이번 round10 판정: **보류**

하지만 round8/9의 보류와는 결이 다릅니다.
이번 보류는 “누가 약간 앞서는지 애매하다”는 보류가 아니라,
**정확히 동률이라 새로운 hierarchy 자체가 생기지 않은 보류**입니다.

## 7. 추천 다음 단계
가장 생산적인 다음 단계는 아래 둘 중 첫 번째입니다.

1. `s157-main-assertive-both` vs `s170-main-wide-zebra`를 **160ms 중심 reinforced retest**로 다시 확인
2. 또는 hierarchy 확정보다 runtime packaging이 우선이라면, `wide-zebra`를 provisional mainline 후보로 두고 `assertive-both` / `bothlite`를 user-option lane 후보로 묶는 split review로 넘어감
