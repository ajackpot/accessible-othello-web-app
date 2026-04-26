# Stage168 reinforced direct-pair verdict: `s157-main-tight-probe`

## 1. 목적
` s157-main-tight-probe `는 stage154 family에서 probe ordering을 가장 좁게 제한한 후보입니다.

1차 direct-pair 결과만 놓고 보면,
- `s154-main` 기준 `동률 -> 동률 -> 승리`
- `s154-both` 기준 `승리 -> 동률 -> 패배`

로 나타나, 시간대와 baseline에 따라 해석이 갈렸습니다.

즉 이 후보는 바로 채택하거나 곧바로 비채택으로 닫기보다,
같은 `80/160/240ms` 조건에서 **시드를 늘려 재시험**해
초기 win/loss 신호가 실제 구조 효과인지, 아니면 표본 노이즈인지 확인할 가치가 있었습니다.

이번 단계의 목적은 그 애매함을 그대로 보류로 남기지 않고,
실제로 보강 표본을 추가해서 **채택 / 비채택을 확정**하는 것입니다.

## 2. 보강 방식
보강은 다음 한 가지 축으로 진행했습니다.

- 시간: `80,160,240 ms`
- seeds: `17,31,53,71,89,107`
- baseline/time 조합당 총 게임 수: `12`

baseline은 동일하게 `s154-main`, `s154-both`를 사용했습니다.
즉 reinforced retest는 총 `72` game 규모이며,
초기 1차 판정에서 보였던 `240ms` 중심 신호가 다시 재현되는지 직접 확인하는 구성입니다.

## 3. 실행 명령
### 1차 판정
```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-tight-probe \
  --output-root tools/engine-match/out/stage168-tightprobe-cont \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

### reinforced retest
```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-tight-probe \
  --output-root tools/engine-match/out/stage168-tightprobe-reinforced \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71,89,107 \
  --games 1
```

## 4. 1차 판정에서 보였던 것
1차 판정(`4` seeds, baseline/time 조합당 `8` game)은 다음처럼 나왔습니다.

| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/8` (50.0%, gap `+0.0pp`) | `4.0/8` (50.0%, gap `+0.0pp`) | `2.0/8` vs `6.0/8` (gap `+50.0pp`) | `10.0/24` (41.7%) | `14.0/24` (58.3%) |
| `s154-both` | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `4.0/8` (50.0%, gap `+0.0pp`) | `5.0/8` vs `3.0/8` (gap `-25.0pp`) | `12.0/24` (50.0%) | `12.0/24` (50.0%) |

전체 합산은 baseline `22.0/48`, candidate `26.0/48`이었고,
평균 nodes/ms는 baseline `8.72`, candidate `8.64`였습니다.

즉 1차 결과만 보면 candidate가 약간 앞서지만,
핵심은 `240ms` 신호가 baseline마다 **정반대로 갈렸다**는 점입니다.

- `s154-main`: 240ms에서 candidate 강세
- `s154-both`: 240ms에서 candidate 약세

이 때문에 1차 결과만으로는 “시간이 길어질수록 좋아진다”거나
“그 반대다”라고 단정할 수 없었습니다.

## 5. baseline별 reinforced 결과
reinforced retest(`6` seeds, baseline/time 조합당 `12` game) 결과는 아래와 같습니다.

| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `6.0/12` (50.0%, gap `+0.0pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `18.0/36` (50.0%) | `18.0/36` (50.0%) |
| `s154-both` | `6.0/12` (50.0%, gap `+0.0pp`) | `5.5/12` vs `6.5/12` (gap `+8.3pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `17.5/36` (48.6%) | `18.5/36` (51.4%) |

해석은 분명합니다.

1. `s154-main` 상대로는 **3개 시간 구간이 전부 정확히 동률**입니다.  
   1차 판정에서 보였던 `240ms` 우세는 재현되지 않았습니다.
2. `s154-both` 상대로는 `동률 -> 소폭 우세 -> 동률`입니다.  
   `240ms` 패배 역시 재현되지 않았고, 남은 신호는 `160ms`에서의 `+1.0 point`뿐입니다.
3. 즉 1차 판정을 애매하게 만들었던 `win/loss` 패턴은 표본을 늘리자
   대부분 **동률**로 수렴했습니다.

## 6. 시간대 합산 결과
reinforced retest를 시간대별로 합치면 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |
| `160ms` | `11.5/24` (47.9%) | `12.5/24` (52.1%) | `+4.2pp` |
| `240ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |

전체 합산:

- baseline: `35.5/72` (`49.3%`)
- candidate: `36.5/72` (`50.7%`)
- overall gap: `+1.4pp`

즉 reinforced 전체 score story는
**거의 완전한 동률에 가까운 미세 우세**입니다.

이 정도 score 차이는 baseline/time 조합 전체에서
실질적인 기본값 채택 근거로 보기 어렵습니다.

## 7. throughput / cost 관찰
reinforced retest에서 candidate는 **6개 행 전부에서 nodes/ms가 baseline보다 느렸습니다.**

### baseline별 평균 nodes/ms
- `s154-main`: baseline `9.10`, candidate `8.84`
- `s154-both`: baseline `9.30`, candidate `9.09`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `8.44`, candidate `8.29`
- `160ms`: baseline `9.45`, candidate `9.23`
- `240ms`: baseline `9.72`, candidate `9.39`

전체 평균:
- baseline `9.20`
- candidate `8.97`

즉 reinforced retest에서는
**score 이득은 거의 사라졌고, cost penalty만 일관되게 남았습니다.**

## 8. 판정
### 결론: **비채택**

최종 결론은 **비채택**입니다.

근거는 네 가지입니다.

1. **1차 판정의 강한 240ms 신호가 재현되지 않았습니다.**  
   `s154-main`의 240ms 우세와 `s154-both`의 240ms 열세가 모두 사라졌습니다.
2. **reinforced retest에서는 대부분 동률입니다.**  
   남은 우세는 `s154-both 160ms`의 `+1.0 point`뿐입니다.
3. **시간 증가에 따른 선형 개선이 없습니다.**  
   reinforced 기준으로 보면 `동률 -> 소폭 우세 -> 동률` 또는 `동률 -> 동률 -> 동률`이라서,
   probe candidate가 긴 시간에서 안정적으로 살아난다는 이야기를 만들기 어렵습니다.
4. **throughput이 전 구간에서 열세입니다.**  
   nodes/ms는 모든 행에서 baseline이 더 높았습니다.

따라서 `s157-main-tight-probe`는
stage154 mainline default로 채택하지 않는 것이 맞습니다.

## 9. 무엇이 보였는가
이 후보에서 완전히 신호가 없었던 것은 아닙니다.

- `s154-both`의 `160ms`에서는 여전히 약한 upside가 남았습니다.
- 하지만 그 신호는 `80ms`, `240ms`로 확장되지 않았고,
  `s154-main`에서도 재현되지 않았습니다.

즉 probe를 1개 후보로 제한하는 아이디어 자체가 완전히 무의미하다고 단정할 단계는 아니지만,
**독립 구조 후보 채택** 근거로는 부족합니다.

이 아이디어를 다시 쓴다면,
`wide-hybrid`나 이후 stage158 계열처럼 다른 ordering skeleton과 결합했을 때
같은 `160ms` 신호가 재현되는지 보는 정도가 더 적절합니다.

## 10. 산출물
- 1차 summary  
  `tools/engine-match/out/stage168-tightprobe-cont/s157-main-tight-probe/summary.md`
- reinforced summary  
  `tools/engine-match/out/stage168-tightprobe-reinforced/s157-main-tight-probe/summary.md`
- reinforced summary JSON  
  `tools/engine-match/out/stage168-tightprobe-reinforced/s157-main-tight-probe/summary.json`

## 11. 최종 한 줄
` s157-main-tight-probe `는 1차 판정에서는 약간 좋아 보였지만,
시드를 늘린 reinforced retest에서 그 이득이 거의 전부 사라지고
cost penalty만 남았습니다. 따라서 최종 결론은 **비채택**입니다.
