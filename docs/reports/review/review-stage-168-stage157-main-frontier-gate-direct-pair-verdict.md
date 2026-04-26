# Stage168 direct-pair verdict: `s157-main-frontier-gate`

## 1. 목적
` s157-main-frontier-gate `는 stage154 family에서 **cheap late ordering + static gate MPC**만 남긴 보수형 mainline 후보입니다.

핵심 구성은 다음 두 축입니다.

- move-ordering: `late-potential-frontier-v1`
- MPC: `static-gate-v1`

즉 `wide-hybrid`처럼 넓은 top-K / shallow probe를 적극적으로 쓰는 공격형 구조가 아니라,
potential mobility / frontier 같은 cheap signal과 간단한 static gate만으로
**짧은 시간에서 cost를 크게 늘리지 않으면서 long-think로 갈수록 이득이 살아나는지**를 보는 후보입니다.

이번 단계의 목적은 이 후보를
` s154-main `, ` s154-both ` 두 baseline에 각각 overlay한 뒤,
`80/160/240ms` direct pair에서 **채택 / 비채택을 바로 확정할 수 있는지** 확인하는 것입니다.

## 2. 실행 조건
- baseline: `s154-main`, `s154-both`
- candidate: `s157-main-frontier-gate`
- time: `80,160,240 ms`
- seeds: `17,31,53,71`
- baseline/time 조합당 총 게임 수: `8`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-frontier-gate \
  --output-root tools/engine-match/out/stage168-frontiergate-cont \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

## 3. baseline별 결과
| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `11.0/24` (45.8%) | `13.0/24` (54.2%) |
| `s154-both` | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `10.0/24` (41.7%) | `14.0/24` (58.3%) |

패턴은 다음처럼 정리됩니다.

- `s154-main`: `동률 -> 동률 -> 승리`
- `s154-both`: `동률 -> 승리 -> 승리`

중요한 점은 **음수 구간이 하나도 없었다**는 것입니다.

- short think에서는 일단 baseline을 깎아먹지 않았고,
- time budget이 늘수록 승점 우세가 생겼습니다.

즉 이전 `order-only`, `anchor`, `exact-safe`처럼
baseline/time에 따라 sign이 뒤집히는 noisy 후보가 아니라,
**time이 커질수록 살아나는 보수형 crossover**로 읽히는 결과입니다.

## 4. 시간대 합산 결과
시간대별 합산은 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `8.0/16` (50.0%) | `8.0/16` (50.0%) | `+0.0pp` |
| `160ms` | `7.0/16` (43.8%) | `9.0/16` (56.3%) | `+12.5pp` |
| `240ms` | `6.0/16` (37.5%) | `10.0/16` (62.5%) | `+25.0pp` |

전체 합산:

- baseline: `21.0/48` (`43.8%`)
- candidate: `27.0/48` (`56.3%`)
- overall gap: `+12.5pp`

이 수치는 `wide-hybrid`만큼 크지는 않지만,
이번 후보가 보수형 구조라는 점을 감안하면 꽤 설득력 있습니다.

특히 time 축에서
`80ms 동률 -> 160ms 우세 -> 240ms 더 큰 우세`
쪽으로 움직였기 때문에,
사용자가 확인하려고 한 “시간 증가가 선형적인 개선인지, 아니면 노이즈인지”라는 기준에서는
**노이즈보다 개선 쪽**으로 읽히는 편이 맞습니다.

## 5. throughput / cost
이 후보의 장점은 score 우세뿐 아니라 cost story가 거의 악화되지 않았다는 점입니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `8.51`, candidate `8.49`
- `s154-both`: baseline `9.34`, candidate `9.41`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `8.01`, candidate `8.25`
- `160ms`: baseline `9.08`, candidate `9.03`
- `240ms`: baseline `9.69`, candidate `9.56`

전체 평균:
- baseline `8.93`
- candidate `8.95`

즉 throughput은 사실상 **중립**입니다.

- 80ms에서는 candidate가 약간 빠르고,
- 160/240ms에서는 baseline이 약간 빠르지만,
- 전체 평균으로는 candidate가 오히려 아주 근소하게 앞섭니다.

따라서 이번 후보는
`wide-hybrid`처럼 “점수는 좋아졌지만 nodes/ms는 조금 희생”한 타입이 아니라,
**성능 우세 + 거의 중립적인 cost** 쪽에 가깝습니다.

## 6. 왜 보류를 쓰지 않았는가
이번 후보에는 보류를 쓰지 않았습니다.

이유는 다음과 같습니다.

1. **패배 구간이 없습니다.**  
   여섯 개 baseline/time 셀 중 음수 gap이 하나도 없었습니다.
2. **시간이 늘수록 방향이 좋아집니다.**  
   `80ms`는 동률, `160ms`는 일부 baseline에서 우세, `240ms`는 두 baseline 모두 우세였습니다.
3. **throughput penalty가 사실상 없습니다.**  
   nodes/ms 평균이 거의 중립이라, score 우세를 깎아먹는 cost story가 남지 않았습니다.
4. **보강 재테스트가 판정을 뒤집을 만한 음수 신호가 없습니다.**  
   지금 남아 있는 불확실성은 “얼마나 강하게 좋으냐” 쪽이지, “실은 해로운 후보 아니냐” 쪽이 아닙니다.

즉 이번 건은 추가 표본을 더 모을 수는 있어도,
현재 표본만으로도 **채택 / 비채택을 바로 확정해도 되는 종류의 결과**입니다.

## 7. 판정
### 결론: **채택**

` s157-main-frontier-gate `는 **채택**입니다.

근거는 네 가지입니다.

1. **두 baseline 모두에서 non-loss pattern**을 만들었습니다.  
   `s154-main`은 `동률 -> 동률 -> 승리`, `s154-both`는 `동률 -> 승리 -> 승리`였습니다.
2. **시간이 늘수록 우세가 선명해집니다.**  
   short think tie에서 끝나지 않고, 160ms와 240ms로 갈수록 승점 우세가 나타났습니다.
3. **overall 합산이 분명히 앞섭니다.**  
   전체 `27/48` 대 `21/48`은 “거의 동률인데 우연히 한두 셀만 좋았다” 수준보다 강합니다.
4. **cost penalty가 거의 없습니다.**  
   nodes/ms 평균은 사실상 중립이므로, fixed-time score 우세를 그대로 채택 판단에 반영할 수 있습니다.

따라서 `frontier-gate`는 stage157 mainline 후보 중에서
`wide-hybrid`에 이어 두 번째 **명시적 채택** 사례로 보는 것이 맞습니다.

## 8. 해석
이번 결과는 stage154 baseline에서
**cheap signal ordering + 간단한 static-gate MPC**만으로도 의미 있는 실전 우세를 만들 수 있다는 뜻입니다.

특히 다음 점이 중요합니다.

- `wide-hybrid`는 넓은 ordering skeleton으로 score 우세를 만들었습니다.
- `frontier-gate`는 그보다 훨씬 보수적인 구조인데도 음수 셀 없이 long-think 우세를 만들었습니다.
- 즉 stage154 family에는 “공격형 채택 후보”뿐 아니라 “보수형 채택 후보”도 있다는 뜻입니다.

이 해석은 이후 stage158 후보 검토에도 중요합니다.
새 move-ordering / MPC 구조를 볼 때,
반드시 복잡한 hybrid만 좋은 것은 아니고,
**cheap signal을 잘 배치한 low-risk 구조도 충분히 채택 가능**하다는 기준점을 제공하기 때문입니다.

## 9. 산출물
- summary Markdown  
  `tools/engine-match/out/stage168-frontiergate-cont/s157-main-frontier-gate/summary.md`
- summary JSON  
  `tools/engine-match/out/stage168-frontiergate-cont/s157-main-frontier-gate/summary.json`
- baseline result JSON  
  - `tools/engine-match/out/stage168-frontiergate-cont/s157-main-frontier-gate/results/s154-main__s157-main-frontier-gate.json`
  - `tools/engine-match/out/stage168-frontiergate-cont/s157-main-frontier-gate/results/s154-both__s157-main-frontier-gate.json`

## 10. 최종 한 줄
` s157-main-frontier-gate `는 `80ms`에서 baseline을 깎아먹지 않았고,
`160/240ms`로 갈수록 우세가 살아났으며,
throughput penalty도 사실상 없었습니다.
따라서 최종 결론은 **채택**입니다.
