# Stage168 direct-pair verdict: `s157-main-exact-safe`

## 1. 목적
` s157-main-exact-safe `는 stage154 family에서 **few-empties exact ordering + near verification**만 보수적으로 강화한 low-risk 후보입니다.

핵심 구성은 다음 두 축입니다.

- move-ordering: `exact-parity-reply-v1`
- MPC: `verify-near-v1`

이번 단계의 목적은 이 후보를
` s154-main `, ` s154-both ` 두 baseline에 각각 overlay한 뒤,
`80/160/240ms` direct pair에서 **실제로 채택할 만한 구조 우세가 있는지** 확인하는 것입니다.

사용자 지시대로,
세 시간 구간을 분리해서 시간이 늘수록 이득이 쌓이는지,
아니면 사실상 변화가 없는지 같이 봤습니다.

## 2. 실행 조건
- baseline: `s154-main`, `s154-both`
- candidate: `s157-main-exact-safe`
- time: `80,160,240 ms`
- seeds: `17,31,53,71`
- baseline/time 조합당 총 게임 수: `8`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-exact-safe \
  --output-root tools/engine-match/out/stage168-exactsafe-cont \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

## 3. baseline별 결과
| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `12.0/24` (50.0%) | `12.0/24` (50.0%) |
| `s154-both` | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `4.5/8` vs `3.5/8` (gap `-12.5pp`) | `12.5/24` (52.1%) | `11.5/24` (47.9%) |

패턴은 매우 단순합니다.

- `s154-main`: `동률 -> 동률 -> 동률`
- `s154-both`: `동률 -> 동률 -> 패배`

즉 이 후보는 어느 구간에서도 **명시적 우세**를 만들지 못했고,
유일하게 차이가 난 곳도 `240ms vs s154-both`의 **candidate 열세**였습니다.

## 4. 시간대 합산 결과
시간대별 합산은 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `8.0/16` (50.0%) | `8.0/16` (50.0%) | `+0.0pp` |
| `160ms` | `8.0/16` (50.0%) | `8.0/16` (50.0%) | `+0.0pp` |
| `240ms` | `8.5/16` (53.1%) | `7.5/16` (46.9%) | `-6.25pp` |

전체 합산:

- baseline: `24.5/48` (`51.0%`)
- candidate: `23.5/48` (`49.0%`)
- overall gap: `-2.1pp`

세 구간 중 두 구간은 완전 동률,
나머지 한 구간은 candidate가 약간 뒤졌습니다.
시간이 늘수록 점진적으로 살아나는 그림은 보이지 않았습니다.

## 5. throughput / cost
score가 거의 정체된 대신 throughput 이득이 크게 있으면 볼 여지가 있지만,
이번 후보는 그쪽도 결정적이지 않았습니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `13.00`, candidate `13.03`
- `s154-both`: baseline `13.77`, candidate `13.83`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `12.33`, candidate `12.64`
- `160ms`: baseline `13.40`, candidate `13.21`
- `240ms`: baseline `14.42`, candidate `14.43`

전체 평균:
- baseline `13.39`
- candidate `13.43`

즉 candidate는 **약 0.3% 정도만** 더 빠른 수준입니다.
이 정도 차이는 fixed-time direct pair 채택 근거로 쓰기에는 너무 작고,
실제 score 우세도 만들어내지 못했습니다.

## 6. 왜 보류를 쓰지 않았는가
이번 후보에는 보류를 쓰지 않았습니다.

이유는 다음과 같습니다.

1. **positive signal이 없습니다.**  
   6개 행 중 5개는 동률이고, 1개는 candidate 패배였습니다.
2. **시간 증가에 따른 crossover 가설이 없습니다.**  
   80/160ms 동률 뒤 240ms에서 살아나는 것이 아니라, 오히려 `s154-both`에서만 약간 밀렸습니다.
3. **cost 이득이 너무 작습니다.**  
   overall nodes/ms 우세가 약 `0.3%` 수준이라 score 정체를 상쇄할 만큼 크지 않습니다.

즉 “추가 long-think 표본이 판정을 뒤집을 수 있다”는 상황이 아니라,
현재 표본만으로도 **채택 근거가 비어 있는 후보**에 가깝습니다.

## 7. 판정
### 결론: **비채택**

` s157-main-exact-safe `는 **비채택**입니다.

근거는 네 가지입니다.

1. **score 우세가 전혀 없습니다.**  
   `s154-main`은 전 구간 동률, `s154-both`는 `동률 -> 동률 -> 패배`였습니다.
2. **시간축이 우호적이지 않습니다.**  
   longer-think 구간에서 candidate가 좋아지는 대신, 유일한 비동률 구간이 240ms 패배였습니다.
3. **overall 합산도 baseline이 약간 앞섭니다.**  
   `24.5/48` 대 `23.5/48`입니다.
4. **throughput 이득이 너무 작습니다.**  
   전체 평균 nodes/ms 차이가 약 `0.3%`에 불과해 adoption 논리를 만들어주지 못합니다.

따라서 `exact-safe`는
“보수적이라 손해는 적지만 실제 gain도 거의 없는 후보”로 정리하는 것이 맞습니다.

## 8. 해석
이번 결과는 stage154 baseline에서
few-empties parity/reply fast-first와 near-verification만 조금 얹는 보수 구조가
**실전 fixed-time score로 번역될 만큼 강한 edge를 만들지 못한다**는 뜻에 가깝습니다.

중요한 점은 다음입니다.

- `wide-hybrid`는 분명한 score 우세를 만들었습니다.
- `tight-probe`, `anchor`는 구조 신호가 약하거나 cost penalty가 남았습니다.
- `exact-safe`는 그 반대로 **cost risk도 작지만 gain도 거의 0**에 가까웠습니다.

즉 stage154 mainline에서는 현재 기준으로
“안전하게 조금 더하는 late exact ordering”보다는
**ordering skeleton 자체를 넓게 쓰는 hybrid 쪽**이 더 설득력 있습니다.

## 9. 산출물
- summary Markdown  
  `tools/engine-match/out/stage168-exactsafe-cont/s157-main-exact-safe/summary.md`
- summary JSON  
  `tools/engine-match/out/stage168-exactsafe-cont/s157-main-exact-safe/summary.json`
- baseline result JSON  
  - `tools/engine-match/out/stage168-exactsafe-cont/s157-main-exact-safe/results/s154-main__s157-main-exact-safe.json`
  - `tools/engine-match/out/stage168-exactsafe-cont/s157-main-exact-safe/results/s154-both__s157-main-exact-safe.json`

## 10. 최종 한 줄
` s157-main-exact-safe `는 `s154-main` 전구간 동률, `s154-both`에서는 `240ms` 한 구간 패배였고,
throughput 이득도 거의 없었습니다.
따라서 최종 결론은 **비채택**입니다.
