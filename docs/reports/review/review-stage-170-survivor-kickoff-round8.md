# Stage170 kickoff round8 - `s157-main-assertive-both` vs `s170-main-wide-zebra` direct head-to-head

## 1. 배경
round7까지의 채택 생존 후보는 아래 셋이었습니다.

- `s157-main-assertive-both` — 안정적인 individual anchor
- `s170-main-wide-zebra` — aggressive combo survivor
- `s170-main-frontier-zebra-bothlite` — frontier lane successor survivor

이 중 먼저 비교할 매치업은 round5 권고대로
**`s157-main-assertive-both` vs `s170-main-wide-zebra`**로 잡았습니다.

## 2. 실행 프레임
- search: `classic`
- time: `80 / 160 / 240 ms`
- seeds: `17, 31, 53, 71, 89, 107`
- paired openings per seed: `1`
- total games per time slice: `12`

실행 환경 제약 때문에 하나의 대형 run 대신,
**time × seed 단위 micro run 18개**로 쪼개어 돌린 뒤 동일 프레임으로 다시 합쳤습니다.
이 방식은 표본 자체를 바꾸지 않고, 단지 회수 단위를 작게 만든 것입니다.

## 3. 결과 요약
| matchup | pattern from second perspective | overall | interim verdict |
| --- | --- | --- | --- |
| `s157-main-assertive-both` vs `s170-main-wide-zebra` | `승리 -> 패배 -> 동률` | `17.0/36` vs `19.0/36` | **보류** |

시간대별 요약:

| time | `s157-main-assertive-both` | `s170-main-wide-zebra` | slice verdict |
| --- | ---: | ---: | --- |
| `80ms` | `4/12` | `8/12` | `wide-zebra` 우세 |
| `160ms` | `7/12` | `5/12` | `assertive-both` 우세 |
| `240ms` | `6/12` | `6/12` | 동률 |

throughput:
- `s157-main-assertive-both`: **8.70 nodes/ms**
- `s170-main-wide-zebra`: **9.07 nodes/ms**

## 4. 해석
이번 매치는 한 줄로 요약하면 아래와 같습니다.

> `wide-zebra`가 fast lane에서는 앞서지만, `assertive-both`가 mid lane에서 받아치고 long lane에서는 비기므로,
> 아직 bracket를 닫을 만큼 명확한 우세는 아니다.

### `s170-main-wide-zebra` 쪽의 장점
- `80ms`에서 **8:4**로 확실한 우세를 보였습니다.
- overall도 **19:17**로 앞섰습니다.
- throughput도 전체적으로 **약간 더 빠릅니다.**

### 아직 채택 우위 확정으로 보지 않는 이유
- `160ms`에서 `assertive-both`가 **7:5**로 승리합니다.
- `240ms`는 **완전 동률**이라, long-think displacement가 확인되지 않았습니다.
- 따라서 current edge는 “전 시간대 우세”가 아니라 **short-think leaning + slight overall lead**입니다.

### `assertive-both` 입장에서도 아쉬운 점
- overall을 내줬고,
- `80ms`에서 명확히 밀렸습니다.
- 그래서 기존 anchor라고 해서 이번 매치를 가져갔다고 보기도 어렵습니다.

## 5. 결론
### 이번 round8 판정: **보류**

다만 보류 안에서도 무게는 약간 있습니다.
- **약한 provisional lead:** `s170-main-wide-zebra`
- **실질적 해석:** 아직 sole leader로 승격할 정도는 아님

즉 현 시점 lane 해석은 아래와 같습니다.
- `s157-main-assertive-both`: **채택 유지**
- `s170-main-wide-zebra`: **채택 유지 + 약한 provisional lead**
- 둘 사이 direct hierarchy: **미결**

## 6. 추천 다음 단계
가장 생산적인 다음 단계는 아래 순서입니다.

1. `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra` direct head-to-head
2. 필요하면 `s157-main-assertive-both` vs `s170-main-wide-zebra`를 **160ms 중심 reinforced retest**로 재확인
