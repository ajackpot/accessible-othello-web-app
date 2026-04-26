# Stage170 kickoff round9 - `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra` direct head-to-head

## 1. 배경
round8 기준 채택 생존 후보 간 direct hierarchy는 아직 열려 있었습니다.

- `s157-main-assertive-both` — 기존 individual anchor
- `s170-main-wide-zebra` — aggressive combo survivor, **약한 provisional lead**
- `s170-main-frontier-zebra-bothlite` — frontier lane successor survivor

round8 권고에 따라 이번에는
**`s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra`**를 직접 비교했습니다.

## 2. 실행 프레임
- search: `classic`
- time: `80 / 160 / 240 ms`
- seeds: `17, 31, 53, 71, 89, 107`
- paired openings per seed: `1`
- total games per time slice: `12`

실행은 round8과 같은 방식으로,
**time × seed micro run 18개**를 회수한 뒤 동일 프레임으로 다시 합쳤습니다.

이전에 남아 있던 partial experiment 흔적은 참고만 하고, 이번 round9 집계에는 **clean micro frame만 사용**했습니다.

## 3. 결과 요약
| matchup | pattern from second perspective | overall | interim verdict |
| --- | --- | --- | --- |
| `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra` | `승리 -> 동률 -> 동률` | `17.0/36` vs `19.0/36` | **보류** |

시간대별 요약:

| time | `s170-main-frontier-zebra-bothlite` | `s170-main-wide-zebra` | slice verdict |
| --- | ---: | ---: | --- |
| `80ms` | `5/12` | `7/12` | `s170-main-wide-zebra` 우세 |
| `160ms` | `6/12` | `6/12` | 동률 |
| `240ms` | `6/12` | `6/12` | 동률 |

throughput:
- `s170-main-frontier-zebra-bothlite`: **8.14 nodes/ms**
- `s170-main-wide-zebra`: **8.71 nodes/ms**

## 4. 해석
이번 매치는 한 줄로 요약하면 아래와 같습니다.

> `s170-main-wide-zebra`가 `80ms`에서 앞서고 overall도 약간 우세하지만,
> `160ms`, `240ms` 모두 draw라서 `s170-main-frontier-zebra-bothlite`를 bracket 밖으로 밀어낼 정도의 우세는 아니다.

### `s170-main-wide-zebra` 쪽의 장점
- `80ms`에서 **7:5**로 실제 우세가 있습니다.
- overall도 **19:17**로 앞섭니다.
- throughput도 전체 평균에서 더 높습니다.

### 아직 hierarchy를 닫지 않는 이유
- `160ms`가 **6:6 동률**입니다.
- `240ms`도 **6:6 동률**입니다.
- long-think displacement가 전혀 확인되지 않았습니다.

### `s170-main-frontier-zebra-bothlite` 입장에서도 의미 있는 점
- long-think에서 collapse는 없습니다.
- `160ms`, `240ms`가 모두 draw라서 **secondary survivor 자격은 유지**됩니다.

### 그러나 `s170-main-frontier-zebra-bothlite`를 위로 올리지 않는 이유
- short-think를 내줬고,
- overall도 뒤졌기 때문입니다.

## 5. 결론
### 이번 round9 판정: **보류**

다만 보류 안의 무게중심은 분명합니다.
- **provisional leader 유지:** `s170-main-wide-zebra`
- **실질적 해석:** `s170-main-frontier-zebra-bothlite`는 surviving challenger로 남지만, current leader를 교체하지는 못함

현재 lane 해석은 아래와 같습니다.
- `s170-main-wide-zebra`: **채택 유지 + provisional lead 유지**
- `s170-main-frontier-zebra-bothlite`: **채택 유지**
- `s157-main-assertive-both`: **채택 유지**
- 세 후보 사이 direct hierarchy: **아직 미결**

## 6. 추천 다음 단계
가장 생산적인 다음 단계는 아래 둘 중 첫 번째입니다.

1. `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both` direct head-to-head
2. 또는 leader 확정이 더 급하면 `s157-main-assertive-both` vs `s170-main-wide-zebra`를 **160ms 중심 reinforced retest**로 재확인
