# Stage168 direct-pair verdict: `s157-main-order-only`

## 1. 목적
이번 단계의 목표는 stage157 mainline 후보를 **하나씩** 꺼내서,
`stage-154-main`, `stage-154-both`를 기준 baseline으로 둔 direct pair 결과만으로
채택 / 비채택 / 보류를 확정하는 것입니다.

이번 후보는 다음 key입니다.

- canonical key: `s157-main-order-only`
- historical alias: `s154-order-main`
- 성격: **move-ordering structure만** `hybrid-main-v1`로 올리고, MPC는 baseline 그대로 둔 분리 후보

즉 이 후보는 “ordering 구조만 따로 떼어도 이득이 남는가?”를 보는 control-like screening에 가깝습니다.

## 2. 실행 조건
사용한 러너:

- `tools/engine-match/run-stage157-158-mainline-decision-pair.mjs`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-order-only \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71,89,107 \
  --games 1 \
  --progress-every-pairs 2
```

고정 조건:

- baseline: `s154-main`, `s154-both`
- paired openings per seed: `1`
- seeds: `17,31,53,71,89,107`
- baseline/time 조합당 총 게임 수: `12`
- 전체 게임 수: `72`
- search algorithm: `classic`
- opening plies: `20`
- max depth: `6`
- exact endgame empties: `10`
- solver adjudication empties: `14`

이번 판정에서 가장 중요한 관찰 포인트는,
사용자 요청대로 **시간이 늘어날수록 효과가 선형/일관되게 유지되는지**, 아니면
특정 시간대에서만 튀는 **노이즈성 reversal**인지였습니다.

## 3. baseline별 결과

| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.5/12` (37.5%, gap `-25.0pp`) | `8.0/12` (66.7%, gap `+33.3pp`) | `5.0/12` (41.7%, gap `-16.7pp`) | `18.5/36` (51.4%) | `17.5/36` (48.6%) |
| `s154-both` | `5.0/12` (41.7%, gap `-16.7pp`) | `7.0/12` (58.3%, gap `+16.7pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `18.0/36` (50.0%) | `18.0/36` (50.0%) |

해석:

1. `80ms`에서는 두 baseline 모두 candidate가 **분명히 열세**였습니다.
2. `160ms`에서는 두 baseline 모두 candidate가 **반대로 우세**했습니다.
3. 하지만 `240ms`로 더 늘리면, `s154-main`에서는 다시 **열세**로 돌아가고,
   `s154-both`에서는 **동률**이 됩니다.

즉 이 후보는 “시간이 늘수록 ordering-only 효과가 안정적으로 살아난다”는 그림이 아니라,
**중간 시간대에서만 튀는 reversal**에 더 가깝습니다.

## 4. 시간대 합산 결과
두 baseline을 합쳐 시간대별로 보면 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `14.5/24` (60.4%) | `9.5/24` (39.6%) | `-20.8pp` |
| `160ms` | `9.0/24` (37.5%) | `15.0/24` (62.5%) | `+25.0pp` |
| `240ms` | `13.0/24` (54.2%) | `11.0/24` (45.8%) | `-8.3pp` |

전체 합산:

- baseline: `36.5/72` (`50.7%`)
- candidate: `35.5/72` (`49.3%`)
- overall gap: `-1.4pp`

즉 전체 점수만 봐도 candidate가 앞서지 못합니다.

## 5. throughput / cost 관찰
nodes/ms는 ordering-only 후보가 기대만큼 더 좋아지지 않았습니다.

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `14.84`, candidate `14.84`
- `160ms`: baseline `15.52`, candidate `15.54`
- `240ms`: baseline `16.47`, candidate `16.11`

### baseline별 평균 nodes/ms
- `s154-main`: baseline `14.95`, candidate `14.83`
- `s154-both`: baseline `16.27`, candidate `16.16`

즉 `160ms`에서의 score 상승을 설명할 만한 **뚜렷한 throughput story**가 없습니다.
오히려 `240ms`에서는 candidate 쪽이 약간 느려집니다.

## 6. 판정

### 결론: **비채택**

이번 후보는 **보류가 아니라 비채택**으로 두는 것이 맞습니다.

근거는 세 가지입니다.

1. **두 baseline에 대해 세 시간대 모두 일관된 우세를 보이지 못했습니다.**
   - 80ms: 둘 다 패배
   - 160ms: 둘 다 승리
   - 240ms: 패배 + 동률

2. **시간 증가에 따른 효과가 선형적이지 않습니다.**
   사용자 요청의 핵심이 “시간 증가가 선형 개선인지, 노이즈인지 보자”였는데,
   이번 결과는 ordering-only 후보가 robust하게 살아난다기보다
   **중간 구간에서만 역전되는 sample-sensitive / depth-sensitive 패턴**에 가깝습니다.

3. **채택 쪽으로 밀어 줄 cost 이득도 없습니다.**
   속도가 의미 있게 좋아진 것도 아니고,
   전체 합산 점수도 baseline보다 약간 뒤입니다.

따라서 현재 문서가 요구하는 adoption 조건
- baseline보다 명백히 나쁘지 않을 것
- time scale이 바뀌어도 노이즈가 아니라는 근거가 있을 것
- speed/cost 혹은 strength 둘 중 하나라도 채택 논리를 줄 것
을 만족하지 못합니다.

## 7. 왜 보류가 아닌가
보류는 “추가 표본을 더 모으면 판정이 실제로 뒤집힐 가능성이 높다”는 경우에만 써야 합니다.

하지만 이번 후보는
- 80ms에서 두 baseline 모두 패배,
- 240ms에서도 base를 넘기지 못했고,
- overall 합산도 앞서지 못했으며,
- cost 이득도 거의 없었습니다.

즉 **현 단계에서 채택 논리를 만드는 데 필요한 핵심 축이 이미 부족**합니다.
160ms의 단일 reversal만으로 hold를 주기보다는,
이 후보를 **ordering-only control lane의 비채택 사례**로 닫고 다음 후보로 넘어가는 것이 더 맞습니다.

## 8. 다음 의미 있는 후보
다음 후보는 자연스럽게 `s157-main-mpc-only`입니다.

이유:
- 이번 후보가 ordering-only 분리 lane이었다면,
- 다음 후보는 **MPC-only 분리 lane**이므로
- “ordering만 떼면 흔들리는데 MPC만 떼면 어떤가”를 바로 비교할 수 있습니다.

즉 stage157 anchor 전체(`s157-main-anchor`)로 가기 전에,
두 축을 분리해서 어느 쪽이 실제 strength를 주는지 더 선명하게 볼 수 있습니다.

## 9. 산출물
- decision summary JSON  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-order-only/summary.json`
- decision summary Markdown  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-order-only/summary.md`
- per-baseline raw results  
  - `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-order-only/results/s154-main__s157-main-order-only.json`
  - `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-order-only/results/s154-both__s157-main-order-only.json`

## 10. 최종 한 줄
` s157-main-order-only `는 **160ms에서만 좋아 보이는 middle-only reversal**이 있었지만,
80ms/240ms와 전체 합산, cost story까지 같이 보면 **robust adoption signal이 아니므로 비채택**입니다.
