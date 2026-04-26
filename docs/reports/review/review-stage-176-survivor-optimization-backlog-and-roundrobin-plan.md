# Stage176 review - survivor optimization backlog freeze and round-robin budget plan

## 1. 배경
round8~10 direct head-to-head까지 마친 현재 adopted trio는 아래 셋입니다.

- `s170-main-wide-zebra`
- `s157-main-assertive-both`
- `s170-main-frontier-zebra-bothlite`

이제 같은 조합을 다시 맞붙이는 것만으로는 plateau를 반복해서 볼 가능성이 높습니다.
따라서 이번 단계의 목표는 **각 후보별로 남아 있는 보강/최적화 분기만 먼저 확정하고**,
그 개수에 맞춰 **앞으로 최소 몇 번의 풀리그 round-robin이 필요한지**를 미리 정리하는 것입니다.

## 2. 현재 direct hierarchy 재확인
head-to-head 결과를 요약하면 아래와 같습니다.

| matchup | result | 읽는 법 |
| --- | --- | --- |
| `s157-main-assertive-both` vs `s170-main-wide-zebra` | `17:19` | `wide-zebra`가 80ms 우세, 160ms는 `assertive-both`, 240ms draw |
| `s170-main-frontier-zebra-bothlite` vs `s170-main-wide-zebra` | `17:19` | `wide-zebra`가 80ms 우세, 160/240ms draw |
| `s170-main-frontier-zebra-bothlite` vs `s157-main-assertive-both` | `18:18` | exact draw, throughput만 `assertive-both` 우세 |

즉 현재 bracket는 아래처럼 읽는 것이 가장 자연스럽습니다.

- **provisional leader**: `s170-main-wide-zebra`
- **challenger cluster**: `s157-main-assertive-both`, `s170-main-frontier-zebra-bothlite`
- 하지만 세 후보 모두 아직 **정확히 한 군데씩 보강할 포인트가 남아 있습니다.**

## 3. 후보별 남은 보강/최적화 분기
### 3.1 `s170-main-wide-zebra`
현재 약점은 `80ms`가 아니라 **`160ms` mid-think calibration**입니다.
`assertive-both`와의 direct match에서 `80ms`는 이기지만 `160ms`를 내주고 `240ms`에서는 takeover가 없습니다.

따라서 primary branch는 ordering을 더 건드리는 것이 아니라, **MPC를 guarded Zebra -> both-lite로 바꾸는 것**이 맞습니다.

#### 확정 branch
1. **Primary:** `s176-main-wide-zebra-bothlite`
   - `wide-hybrid-v1` ordering 유지
   - MPC만 `stage170-frontier-zebra-bothlite-v1`로 교체
   - 목표: `160ms` 약세를 줄이면서 `80ms` 우세 유지
2. **Contingency:** `s176-main-wide-zebra-midtrim`
   - guarded Zebra MPC 유지
   - `wide-hybrid` 폭을 한 단계만 줄이는 ordering midtrim custom profile
   - 목표: both-lite가 80ms edge를 깎아 먹을 때 backup path 제공

### 3.2 `s157-main-assertive-both`
현재 약점은 long-think가 아니라 **short-think ordering 폭 부족**으로 보는 해석이 가장 자연스럽습니다.
`wide-zebra`에게 내주는 셀은 `80ms`이고, 반대로 `160ms`는 이기며 `240ms`도 무너지지 않습니다.

따라서 primary branch는 MPC-lite가 아니라, **ordering을 `wide-hybrid` 쪽으로 넓히는 것**이 우선입니다.

#### 확정 branch
1. **Primary:** `s176-main-wide-assertive`
   - ordering만 `wide-hybrid-v1`로 교체
   - `assertive-both-v1` MPC 유지
   - 목표: `80ms` deficit 보강
2. **Contingency:** `s176-main-assertive-both-lite`
   - `hybrid-probe-v1` 유지
   - `assertive-both` aggressiveness를 한 단계만 낮춘 custom MPC
   - 목표: wide ordering이 과하게 흔들릴 때 fallback 제공

### 3.3 `s170-main-frontier-zebra-bothlite`
이 후보는 `assertive-both`와 exact draw이고 mid/long lane도 안정적입니다.
하지만 `wide-zebra`에게 `80ms`를 내주고 throughput도 낮습니다.
즉 지금 남은 숙제는 MPC가 아니라 **ordering에 아주 작은 short-think assist를 더하는 것**입니다.

여기서 중요한 점은, 직전 ordering stabilization branch는 이미 실패했다는 것입니다.
그래서 이번에는 TT gate / top-K / probe를 한꺼번에 얹지 않고, **가장 가벼운 tie-break부터 한 단계씩** 열어야 합니다.

#### 확정 branch
1. **Primary:** `s176-main-frontier-bothlite-parity`
   - both-lite MPC 유지
   - frontier ordering에 `square-parity-reply` tie-break만 추가
   - 목표: 80ms 약세를 거의 공짜 비용으로 줄이기
2. **Contingency:** `s176-main-frontier-bothlite-topk2`
   - parity-only가 무효일 때만 lightweight top-K(2)를 추가
   - probe/TT stabilization은 여전히 금지
   - 목표: ordering assist를 한 단계만 더 열기

## 4. ceiling 판정 규칙
이번 backlog freeze의 핵심은 **더 손댈 곳이 없는 후보를 미리 판정할 수 있게 하는 것**입니다.
각 lane의 ceiling rule은 아래처럼 둡니다.

| lane | ceiling 판정 |
| --- | --- |
| `wide-zebra` | `wide-zebra-bothlite`, `wide-zebra-midtrim`이 모두 실패하면 ceiling |
| `assertive-both` | `wide-assertive`, `assertive-both-lite`가 모두 실패하면 ceiling |
| `frontier-bothlite` | `frontier-bothlite-parity`, `frontier-bothlite-topk2`가 모두 실패하면 ceiling |

즉 현재 기준으로는 **세 lane 모두 아직 ceiling 판정을 내리기 이릅니다.**
하지만 남은 분기 수는 이미 많이 줄어들었고, 각 lane당 primary 1개 + contingency 1개 수준으로 압축됐습니다.

## 5. 풀리그 round-robin budget
이번에 확정한 backlog를 기준으로 하면,
다음부터 필요한 풀리그 횟수는 아래처럼 계산할 수 있습니다.

- **Primary queue 기준 최소 풀리그 횟수:** `1`
- **Contingency까지 포함한 현재 upper bound:** `2`

이 계산은 “한 풀리그 session에서 각 lane당 branch를 하나씩만 투입한다”는 전제입니다.
즉 다음 session에서 아래 세 후보를 한 번에 넣으면 됩니다.

- `s176-main-wide-zebra-bothlite`
- `s176-main-wide-assertive`
- `s176-main-frontier-bothlite-parity`

그리고 여기서 충분히 분리되지 않거나 특정 lane만 실패하면,
그때만 contingency queue를 여는 두 번째 풀리그로 넘어갑니다.

## 6. 권장 기본 프레임
사용자 제안처럼 앞으로는 **한 session = 풀리그 1회**로 묶는 것이 맞습니다.
다만 round budget은 아래처럼 두는 것이 적절합니다.

- **기본값:** 조건별 `6라운드`
- **4라운드:** smoke/탐색용으로만 허용
- **8라운드:** near-draw 또는 sign flip이 다시 나오면 그때만 승격

권장 이유는 분명합니다.
현재 direct match 결과가 `19:17`, `18:18` 수준이라,
조건별 `4라운드`는 plateau 구간에서 너무 거칠고,
처음부터 `8라운드`를 쓰는 것은 primary queue 소진 단계에서는 과합니다.

## 7. 결론
이번 단계의 결론은 아래와 같습니다.

1. 세 후보 모두 아직 **남은 보강 분기 1개씩**은 분명합니다.
2. 각 lane마다 **backup contingency 1개씩**까지만 열어두고, 그 이상은 지금 시점에서 늘리지 않습니다.
3. 따라서 현재 backlog 기준으로는
   - **최소 1회 풀리그**로 primary queue를 모두 소진할 수 있고,
   - **최대 2회 풀리그**면 현재 알려진 분기를 대부분 닫을 수 있습니다.
4. 다음 session의 첫 풀리그는 아래 세 후보로 시작하는 것이 가장 효율적입니다.
   - `s176-main-wide-zebra-bothlite`
   - `s176-main-wide-assertive`
   - `s176-main-frontier-bothlite-parity`
