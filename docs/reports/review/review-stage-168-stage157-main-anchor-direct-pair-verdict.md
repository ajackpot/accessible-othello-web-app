# Stage168 direct-pair verdict: `s157-main-anchor`

## 1. 목적
이번 단계의 목표는 stage157 mainline 후보를 **하나씩** 꺼내서,
`stage-154-main`, `stage-154-both`를 기준 baseline으로 둔 direct pair 결과만으로
채택 / 비채택 / 보류를 확정하는 것입니다.

이번 후보는 다음 key입니다.

- canonical key: `s157-main-anchor`
- historical alias: `s154-main`
- 성격: `hybrid-main-v1` move-ordering + `conservative-hybrid-v1` MPC를 함께 얹은 **mainline anchor**

중요한 점이 하나 있습니다.

`historical alias`가 `s154-main`이라고 해서 이번 direct pair가 자기 자신과의 무의미한 비교는 아닙니다.
현재 support-stack의 baseline `s154-main` engine-options snapshot은 사실상 `classicSearchDriver: pvs`만 담고 있고,
이번 candidate overlay는 그 위에 **stage157 structural profiles**를 다시 얹습니다.
즉 이번 실험은 “stage154 main_recenter family에 stage157 anchor 구조를 다시 얹어도 여전히 기본값으로 둘 만큼 좋은가?”를 직접 묻는 테스트입니다.

## 2. 실행 조건
사용한 러너:

- `tools/engine-match/run-stage157-158-mainline-decision-pair.mjs`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-anchor \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1 \
  --progress-every-pairs 0
```

고정 조건:

- baseline: `s154-main`, `s154-both`
- paired openings per seed: `1`
- seeds: `17,31,53,71`
- baseline/time 조합당 총 게임 수: `8`
- 전체 게임 수: `48`
- search algorithm: `classic`
- opening plies: `20`
- max depth: `6`
- exact endgame empties: `10`
- solver adjudication empties: `14`

이번 판정에서도 사용자 요청대로,
**시간이 늘어날수록 효과가 선형/일관되게 유지되는지**, 아니면
일부 시간대에만 뒤집히는 **노이즈성 reversal**인지가 핵심 관찰 포인트였습니다.

## 3. baseline별 결과

| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/8` (50.0%, gap `+0.0pp`) | `3.0/8` (37.5%, gap `-25.0pp`) | `4.0/8` (50.0%, gap `+0.0pp`) | `13.0/24` (54.2%) | `11.0/24` (45.8%) |
| `s154-both` | `3.5/8` (43.8%, gap `-12.5pp`) | `3.0/8` (37.5%, gap `-25.0pp`) | `5.0/8` (62.5%, gap `+25.0pp`) | `12.5/24` (52.1%) | `11.5/24` (47.9%) |

해석:

1. `s154-main` 상대로는 `동률 -> 패배 -> 동률`입니다.
2. `s154-both` 상대로는 `패배 -> 패배 -> 승리`입니다.
3. 두 baseline 모두에서 **전 구간 일관 우세**는 전혀 없고,
   `s154-both` 240ms의 단일 승리만 남습니다.

즉 이 후보는 “anchor라서 넓게 안정적이다”기보다,
**중간과 짧은 시간에서는 오히려 밀리고, 일부 긴 구간에서만 되살아나는 patchy pattern**에 가깝습니다.

## 4. 시간대 합산 결과
두 baseline을 합쳐 시간대별로 보면 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap | baseline avg n/ms | candidate avg n/ms |
|---|---:|---:|---:|---:|---:|
| `80ms` | `8.5/16` (53.1%) | `7.5/16` (46.9%) | `-6.2pp` | `11.52` | `11.33` |
| `160ms` | `10.0/16` (62.5%) | `6.0/16` (37.5%) | `-25.0pp` | `12.16` | `11.89` |
| `240ms` | `7.0/16` (43.8%) | `9.0/16` (56.2%) | `+12.5pp` | `13.01` | `12.76` |

전체 합산:

- baseline: `25.5/48` (`53.1%`)
- candidate: `22.5/48` (`46.9%`)
- overall gap: `-6.2pp`

핵심은 명확합니다.

- `80ms`: candidate가 합산 기준 **패배**
- `160ms`: candidate가 합산 기준 **패배**
- `240ms`: candidate가 합산 기준 **승리**

즉 시간 증가에 따라 점진적으로 좋아진다는 선형 스토리라기보다,
**긴 쪽 한 구간에서만 역전이 나타나는 단일 crossover 조각**에 더 가깝습니다.

## 5. throughput / cost 관찰
score가 흔들리는 동안 throughput은 candidate 쪽이 꾸준히 더 낮았습니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `12.13`, candidate `11.88`
- `s154-both`: baseline `12.33`, candidate `12.11`

### 전체 평균 nodes/ms
- baseline `12.23`
- candidate `11.99`

즉 `s157-main-anchor`는
점수에서도 baseline 합산을 넘지 못했고,
속도에서도 채택 논리를 줄 만한 이득을 보여주지 못했습니다.

## 6. 판정

### 결론: **비채택**

이번 후보는 **보류가 아니라 비채택**으로 두는 것이 맞습니다.

근거는 네 가지입니다.

1. **두 baseline 모두 전체 합산에서 candidate가 뒤집니다.**
   - `s154-main`: baseline `13.0/24` vs candidate `11.0/24`
   - `s154-both`: baseline `12.5/24` vs candidate `11.5/24`

2. **짧은 시간과 중간 시간에서 이미 열세가 먼저 보입니다.**
   `80ms`, `160ms` 합산 기준 모두 candidate가 뒤지므로,
   “anchor를 얹으면 short/mid think에서 안정적으로 좋아진다”는 주장을 할 수 없습니다.

3. **240ms의 단일 반전만으로는 선형 개선이라고 보기 어렵습니다.**
   이 결과는 `패배 -> 패배 -> 승리` 혹은 `동률 -> 패배 -> 동률`이 섞인 구조라서,
   시간 증가에 따른 robust improvement보다는 **sample-sensitive crossover**에 더 가깝습니다.

4. **throughput upside가 없습니다.**
   여섯 행 전부에서 candidate nodes/ms가 baseline보다 낮습니다.
   즉 strength가 애매할 때 채택을 밀어줄 cost story도 없습니다.

따라서 `s157-main-anchor`는
“stage157 mainline 기본 anchor”로 승격하지 않습니다.

## 7. 왜 보류가 아닌가
보류는 “추가 표본을 더 모으면 판정이 실제로 뒤집힐 가능성이 높다”는 경우에만 써야 합니다.

하지만 이번 후보는

- 전체 합산에서 두 baseline 모두 뒤지고,
- 짧은 시간과 중간 시간에서 이미 약하며,
- 속도도 일관되게 느리고,
- 긴 시간대 upside도 `s154-both` 240ms 한 구간으로만 제한됩니다.

즉 추가 샘플이 필요하다고 볼 **명백한 구조적 이유**가 부족합니다.
이번 경우는 `hold`보다 **non-adoption closeout**이 더 적절합니다.

## 8. 다음 의미 있는 후보
다음 후보는 자연스럽게 `s157-main-tight-probe`입니다.

이유:
- `order-only`, `mpc-only`, `anchor`가 모두 clean adoption signal을 만들지 못했으므로,
- 이제는 기본 hybrid보다 **probe 폭을 더 타이트하게 좁힌 후보**가
  short/mid 비용 손실을 줄이면서 late upside를 남길 수 있는지 확인하는 것이 가장 의미 있습니다.

즉 다음 단계는
“anchor 전체를 그대로 채택하는가”가 아니라,
**probe 범위를 조절한 구조가 오히려 더 안정적인지** 보는 단계입니다.

## 9. 산출물
- decision summary JSON  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-anchor/summary.json`
- decision summary Markdown  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-anchor/summary.md`
- per-baseline raw results  
  - `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-anchor/results/s154-main__s157-main-anchor.json`
  - `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-anchor/results/s154-both__s157-main-anchor.json`

## 10. 최종 한 줄
` s157-main-anchor `는 historical alias 이름과 달리 현재 direct-pair gate에서는 baseline snapshot 위에 구조를 추가한 **실질 후보**였습니다.
하지만 결과는 **두 baseline 전체 합산 열세 + 전 구간 throughput 열세 + 240ms 단일 upside**에 그쳤으므로,
최종 결론은 **비채택**입니다.
