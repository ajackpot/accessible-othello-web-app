# Stage168 reinforced direct-pair verdict: `s157-main-soft-both`

## 1. 목적
` s157-main-soft-both `는 stage157 mainline 후보 중에서도 **공격적인 both-side MPC 계열**입니다.

- move-ordering: `stage154-wide-hybrid-v1`
- MPC: `stage154-both-guarded-v1`

즉 이미 채택된 `wide-hybrid` ordering skeleton 위에,
`low-cut`까지 허용하는 guarded both-side probcut을 얹어서
**짧은 시간대 이득을 더 크게 끌어올릴 수 있는지**를 보는 후보입니다.

다만 이 계열은 이전 문서에서도 “기본 채택을 서두르지 말고 마지막에 보자”고 했던 고위험 구조입니다.
따라서 이번 단계에서는 1차 direct-pair를 먼저 실행하고,
신호가 엇갈리면 표본을 실제로 보강해 **채택 / 비채택을 확정**하는 것을 목표로 삼았습니다.

## 2. 1차 direct-pair 결과
### 실행 조건
- baseline: `s154-main`, `s154-both`
- time: `80,160,240 ms`
- seeds: `17,31,53,71`
- baseline/time 조합당 총 게임 수: `8`

1차 결과는 다음과 같았습니다.

| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `10.0/24` (41.7%) | `14.0/24` (58.3%) |
| `s154-both` | `2.5/8` vs `5.5/8` (gap `+37.5pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `5.0/8` vs `3.0/8` (gap `-25.0pp`) | `11.5/24` (47.9%) | `12.5/24` (52.1%) |

1차 합산은 baseline `21.5/48`, candidate `26.5/48`로 candidate가 앞섰고,
nodes/ms도 baseline `9.00`, candidate `9.24`로 candidate가 더 빨랐습니다.

하지만 방향은 깔끔하지 않았습니다.

- `s154-main`: `동률 -> 승리 -> 승리`
- `s154-both`: `승리 -> 동률 -> 패배`

즉 short/mid 구간의 upside는 강하지만,
`240ms`에서는 `s154-both` 기준으로 이미 **음수 셀**이 생겼습니다.

`soft-both`가 aggressive both-side MPC 후보라는 점을 감안하면,
이 240ms 음수 셀을 그냥 무시하고 채택으로 밀어붙이기보다
표본을 보강해 “실제로는 short-only upside인지, 아니면 long-think에서도 유지되는지”를 끝까지 확인하는 편이 맞았습니다.

## 3. 보강 방식
reinforced retest는 같은 `80/160/240ms` 축을 유지한 채,
seed를 `17,31,53,71,89,107`으로 늘려 baseline/time 조합당 총 게임 수를 `12`로 맞췄습니다.

실행은 각 baseline/time/seed 조합을 따로 나눠 돌렸습니다.
이 방식은 runtime이 긴 `240ms` both-side MPC 후보를 60초 제한 안에서 안정적으로 수집하기 위한 조치였습니다.

## 4. reinforced 결과
| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `6.0/12` vs `6.0/12` (gap `+0.0pp`) | `5.0/12` vs `7.0/12` (gap `+16.7pp`) | `6.5/12` vs `5.5/12` (gap `-8.3pp`) | `17.5/36` (48.6%) | `18.5/36` (51.4%) |
| `s154-both` | `3.5/12` vs `8.5/12` (gap `+41.7pp`) | `6.0/12` vs `6.0/12` (gap `+0.0pp`) | `8.0/12` vs `4.0/12` (gap `-33.3pp`) | `17.5/36` (48.6%) | `18.5/36` (51.4%) |

reinforced 패턴은 다음처럼 정리됩니다.

- `s154-main`: `동률 -> 승리 -> 패배`
- `s154-both`: `승리 -> 동률 -> 패배`

이 패턴은 중요합니다.

1. `s154-main 240ms`가 **승리에서 패배로 뒤집혔습니다.**  
   1차 판정에서 보였던 “main 기준 long-think도 괜찮다”는 신호는 재현되지 않았습니다.
2. `s154-both 240ms`의 음수 셀은 **더 선명해졌습니다.**  
   `5.0/8` 대 `3.0/8`이었던 구간이, 보강 뒤에는 `8.0/12` 대 `4.0/12`가 되었습니다.
3. 결국 `240ms`에서는 **두 baseline 모두 candidate가 패배**했습니다.

즉 1차 표본에서 보인 전체 우세는 “시간이 길어져도 유지되는 구조적 우세”라기보다,
**80ms/160ms의 short-mid upside가 240ms 손실을 덮어쓰는 형태**에 더 가깝습니다.

## 5. 시간대 합산 결과
두 baseline을 합쳐 시간대별로 보면 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `9.5/24` (39.6%) | `14.5/24` (60.4%) | `+20.8pp` |
| `160ms` | `11.0/24` (45.8%) | `13.0/24` (54.2%) | `+8.3pp` |
| `240ms` | `14.5/24` (60.4%) | `9.5/24` (39.6%) | `-20.8pp` |

전체 합산:
- baseline: `35.0/72` (`48.6%`)
- candidate: `37.0/72` (`51.4%`)
- overall gap: `+2.8pp`

이 숫자만 보면 candidate가 아주 조금 앞섭니다.
하지만 그 이득은 `80ms`의 큰 우세에서 대부분 만들어졌고,
시간이 늘수록 gap이 줄다가 `240ms`에서는 **양 baseline 모두에서 음수**가 됩니다.

사용자가 처음부터 확인하려 한 것은
“시간 증가가 선형적인 개선인지, 아니면 노이즈인지”였습니다.
이번 reinforced 결과는 적어도 `soft-both`에 대해서는
**선형 개선이 아니라 time-control reversal**이라는 쪽이 더 명확합니다.

## 6. throughput / cost
흥미롭게도 throughput은 candidate 쪽이 전 구간에서 더 높았습니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `9.06`, candidate `9.33`
- `s154-both`: baseline `9.15`, candidate `9.43`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `7.74`, candidate `8.28`
- `160ms`: baseline `9.10`, candidate `9.40`
- `240ms`: baseline `9.71`, candidate `9.82`

전체 평균:
- baseline `9.11`
- candidate `9.38`

즉 이번 후보의 문제는 **느려서 진다**가 아닙니다.
오히려 더 많은 node를 처리하는데도 `240ms` 고정 시간 score는 악화됐습니다.

이 해석은 다음을 시사합니다.

- `soft-both`는 short think에서는 공격적인 cutoff로 이득을 만들 수 있습니다.
- 하지만 think time이 늘어나는 구간에서는 그 selective bias가 누적되어,
  더 깊은 시간 budget을 활용해야 할 때는 오히려 실전 score를 갉아먹을 수 있습니다.

이는 어디까지나 이번 표본을 바탕으로 한 해석이지만,
`nodes/ms 개선 + long-think score 악화`라는 조합과 잘 맞습니다.

## 7. 판정
### 결론: **비채택**

최종 결론은 **비채택**입니다.

근거는 네 가지입니다.

1. **reinforced retest에서 long-think 음수 셀이 두 baseline 모두로 확장됐습니다.**  
   `240ms`에서 `s154-main`, `s154-both`가 모두 candidate보다 앞섰습니다.
2. **time-control story가 좋지 않습니다.**  
   `80ms` strong win -> `160ms` weak win -> `240ms` clear loss 는,
   기본값 후보로 기대하는 “시간이 늘수록 안정되거나 더 좋아지는” 패턴과 반대입니다.
3. **overall 소폭 우세가 short-think 편향으로 만들어졌습니다.**  
   전체 `37/72` 대 `35/72`는 남지만, 그 우세의 대부분이 80ms에 몰려 있습니다.
4. **보강 표본이 이미 판정을 확정해 줍니다.**  
   이번 강화 표본은 “정말로 long-think에서도 살아나는가?”를 확인하려고 넣은 것이고,
   결과는 오히려 240ms dual-baseline 패배였습니다. 따라서 더 미룰 이유가 없습니다.

즉 `s157-main-soft-both`는
**짧은 시간대 tactical branch**로는 흥미가 남지만,
stage157 mainline default 후보로는 채택하지 않는 것이 맞습니다.

## 8. 무엇을 남기는가
비채택이라고 해서 이 후보를 완전히 버릴 필요는 없습니다.

- short-think (`80ms`)에서는 꽤 강한 upside가 보였습니다.
- throughput도 실제로 더 높았습니다.

다만 그 신호는 **범용 기본값 채택 근거**가 아니라,
“시간 제어가 짧을 때만 검토 가능한 공격 후보”라는 메모로 남기는 편이 맞습니다.

즉 이후 stage158 후보나 stage151 late3 후보를 볼 때,
`both-side MPC`가 무조건 나쁘다는 결론을 내리기보다,
**긴 시간 구간에서 score reversal이 생기지 않는지 먼저 확인해야 한다**는 교훈으로 남깁니다.

## 9. 산출물
- 1차 summary  
  `tools/engine-match/out/stage168-softboth-cont/s157-main-soft-both/summary.md`
- reinforced summary  
  `tools/engine-match/out/stage168-softboth-reinforced/s157-main-soft-both/summary.md`
- seed-run root  
  `tools/engine-match/out/stage168-softboth-seedruns/`
- review report  
  `docs/reports/review/review-stage-168-stage157-main-soft-both-reinforced-direct-pair-verdict.md`

## 10. 최종 한 줄
` s157-main-soft-both `는 short/mid think에서는 강한 upside가 있었지만,
reinforced retest에서 `240ms` 두 baseline 모두 패배로 정리되었습니다.
따라서 최종 결론은 **비채택**입니다.
