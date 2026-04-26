# Stage168 direct-pair verdict: `s157-main-wide-hybrid`

## 1. 목적
` s157-main-wide-hybrid `는 stage154 family에서 ordering 구조를 가장 넓게 쓰는 mainline hybrid 후보입니다.

핵심 구성은 다음 두 축입니다.

- move-ordering: `stage154-wide-hybrid-v1`
- MPC: `stage154-verify-tight-v1`

이번 단계의 목적은 이 후보를
` s154-main `, ` s154-both ` 두 baseline에 각각 overlay한 뒤,
`80/160/240ms` direct pair에서 **실제로 채택할 만한 구조 우세가 있는지** 확인하는 것입니다.

사용자 지시대로,
시간을 세 구간으로 나눠서 결과가 선형적으로 좋아지는지,
아니면 특정 시간대에서만 흔들리는 노이즈인지 같이 봤습니다.

## 2. 실행 조건
- baseline: `s154-main`, `s154-both`
- candidate: `s157-main-wide-hybrid`
- time: `80,160,240 ms`
- seeds: `17,31,53,71`
- baseline/time 조합당 총 게임 수: `8`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-wide-hybrid \
  --output-root tools/engine-match/out/stage168-widehybrid-cont \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

## 3. baseline별 결과
| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `10.0/24` (41.7%) | `14.0/24` (58.3%) |
| `s154-both` | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `10.0/24` (41.7%) | `14.0/24` (58.3%) |

패턴이 매우 단순합니다.

- `s154-main`: `승리 -> 동률 -> 승리`
- `s154-both`: `승리 -> 동률 -> 승리`

즉 baseline이 바뀌어도 방향이 뒤집히지 않았고,
80ms와 240ms에서 같은 크기의 우세가 반복되었습니다.

## 4. 시간대 합산 결과
시간대별 합산은 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `6.0/16` (37.5%) | `10.0/16` (62.5%) | `+25.0pp` |
| `160ms` | `8.0/16` (50.0%) | `8.0/16` (50.0%) | `+0.0pp` |
| `240ms` | `6.0/16` (37.5%) | `10.0/16` (62.5%) | `+25.0pp` |

전체 합산:

- baseline: `20.0/48` (`41.7%`)
- candidate: `28.0/48` (`58.3%`)
- overall gap: `+16.7pp`

이 수치는 stage157 mainline 후보들 중 지금까지 본 결과와 비교해도 꽤 선명합니다.

- `order-only`는 중간 시간대만 좋았습니다.
- `mpc-only`는 reinforced 뒤 거의 동률로 수렴했습니다.
- `anchor`, `tight-probe`는 baseline/time에 따라 뒤집히거나 cost penalty만 남았습니다.
- 반면 `wide-hybrid`는 **두 baseline 모두에서 같은 win/tie/win 패턴**을 보였습니다.

## 5. throughput / cost
score는 좋았지만 cost는 약간 증가했습니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `8.49`, candidate `8.31`
- `s154-both`: baseline `9.16`, candidate `8.95`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `7.68`, candidate `7.70`
- `160ms`: baseline `9.09`, candidate `8.70`
- `240ms`: baseline `9.70`, candidate `9.48`

전체 평균:
- baseline `8.82`
- candidate `8.63`

즉 candidate는 **대략 2%대의 throughput penalty**를 치렀습니다.
그러나 이 손해는 같은 고정 시간 예산 안에서 실제 score 우세로 상쇄되었습니다.

특히 이번 direct pair는 fixed-time match이므로,
기본 채택 판단에서는 raw nodes/ms보다 **같은 시간에서의 실제 승점 우세**를 더 우선해서 보는 쪽이 맞습니다.

## 6. 왜 보류를 쓰지 않았는가
이번 후보에는 보류를 쓰지 않았습니다.

이유는 다음과 같습니다.

1. baseline이 바뀌어도 패턴이 뒤집히지 않았습니다.  
   `s154-main`, `s154-both`가 모두 `승리 -> 동률 -> 승리`였습니다.
2. 시간축에서도 sign flip이 없습니다.  
   특정 시간대에서만 반짝하고 다른 시간대에서 무너지는 그림이 아니었습니다.
3. overall score gap이 충분히 큽니다.  
   `28/48` 대 `20/48`이면, 지금까지의 stage157 후보들처럼 “거의 동률인데 cost만 느리다”라고 읽히지 않습니다.

즉 추가 표본이 있으면 더 좋을 수는 있어도,
현재 표본만으로도 **채택 / 비채택을 바로 확정할 수 있는 종류의 결과**로 보는 것이 자연스럽습니다.

## 7. 판정
### 결론: **채택**

` s157-main-wide-hybrid `는 **채택**입니다.

근거는 네 가지입니다.

1. **두 baseline 모두에서 반복 재현되는 score 우세**가 있습니다.  
   `s154-main`, `s154-both`가 모두 `80ms 승리 / 160ms 동률 / 240ms 승리`였습니다.
2. **낮은 시간과 높은 시간에서 동시에 살아납니다.**  
   80ms와 240ms가 모두 우세이므로, short-only 착시나 mid-only reversal로 보기 어렵습니다.
3. **overall gap이 충분히 큽니다.**  
   전체 합산 `58.3%` 대 `41.7%`는 단순 노이즈 범위라고 보기 어렵습니다.
4. **cost penalty가 치명적이지 않습니다.**  
   nodes/ms는 약간 느려졌지만, fixed-time match에서는 실제 승점이 더 중요하며 이번 결과는 그 손해를 분명히 상쇄했습니다.

따라서 stage157 mainline 후보군에서는
현재까지 `wide-hybrid`가 첫 **명시적 채택** 사례로 보는 것이 맞습니다.

## 8. 해석
이번 결과는 “ordering 구조를 넓게 쓰되,
MPC는 verify-tight 수준으로 묶는 조합”이 stage154 baseline과 잘 맞는다는 뜻에 가깝습니다.

특히 다음이 중요합니다.

- `tight-probe`처럼 probe를 너무 좁히면 이득이 사라졌습니다.
- `order-only`, `anchor`처럼 구성 일부만 남기면 일관성이 없었습니다.
- `wide-hybrid`는 wider top-K + potential/frontier + shallow probe 조합을 유지했을 때,
  실제 game score로 번역되는 ordering quality를 만들어냈습니다.

즉 stage154 family에서는 지금 기준으로
**좁은 probe 단독보다 넓은 hybrid ordering skeleton**이 더 설득력 있는 쪽입니다.

## 9. 산출물
- summary Markdown  
  `tools/engine-match/out/stage168-widehybrid-cont/s157-main-wide-hybrid/summary.md`
- summary JSON  
  `tools/engine-match/out/stage168-widehybrid-cont/s157-main-wide-hybrid/summary.json`
- baseline result JSON  
  - `tools/engine-match/out/stage168-widehybrid-cont/s157-main-wide-hybrid/results/s154-main__s157-main-wide-hybrid.json`
  - `tools/engine-match/out/stage168-widehybrid-cont/s157-main-wide-hybrid/results/s154-both__s157-main-wide-hybrid.json`

## 10. 최종 한 줄
` s157-main-wide-hybrid `는 두 baseline 모두에서 `승리 -> 동률 -> 승리` 패턴을 반복했고,
전체 score도 `28/48`로 분명한 우세를 만들었습니다.
throughput은 약간 느려졌지만 fixed-time 실전 성적이 그 손해를 상쇄하므로,
최종 결론은 **채택**입니다.
