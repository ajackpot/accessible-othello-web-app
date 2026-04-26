# Stage168 direct-pair verdict: `s157-main-mpc-only`

> 참고: 이 문서는 80/160/240ms 1차 판정 기록입니다. 이후 reinforced retest로 보류가 해소되었으며, 최종 결론은 `review-stage-168-stage157-main-mpc-only-reinforced-direct-pair-verdict.md`를 우선 기준으로 봅니다.

## 1. 목적
이번 단계의 목표는 stage157 mainline 후보를 **하나씩** 꺼내서,
`stage-154-main`, `stage-154-both`를 기준 baseline으로 둔 direct pair 결과만으로
채택 / 비채택 / 보류를 확정하는 것입니다.

이번 후보는 다음 key입니다.

- canonical key: `s157-main-mpc-only`
- historical alias: `s154-mpc-main`
- 성격: **MPC structure만** `conservative-hybrid-v1`로 올리고, move-ordering은 baseline 그대로 둔 분리 후보

즉 이 후보는 “ordering은 그대로 두고 MPC skeleton만 바꿨을 때,
현재 family evaluator에서 strength가 실제로 남는가?”를 보는 control-like screening에 가깝습니다.

## 2. 실행 조건
사용한 러너:

- `tools/engine-match/run-stage157-158-mainline-decision-pair.mjs`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-mpc-only \
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

이번 판정의 핵심 관찰 포인트는,
사용자 요청대로 **시간 증가가 선형적 / 일관된 crossover인지**, 아니면
중간 구간에서만 뒤집히는 **노이즈성 reversal**인지였습니다.

## 3. baseline별 결과

| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/12` (33.3%, gap `+33.3pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `7.0/12` (58.3%, gap `+16.7pp`) | `15.0/36` (41.7%) | `21.0/36` (58.3%) |
| `s154-both` | `4.0/12` (33.3%, gap `-33.3pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `7.0/12` (58.3%, gap `+16.7pp`) | `19.0/36` (52.8%) | `17.0/36` (47.2%) |

해석:

1. `s154-main` 상대로는 **승리 -> 동률 -> 승리**입니다.
   - 80ms와 240ms에서 candidate가 앞섰고,
   - 160ms에서는 동률입니다.
2. `s154-both` 상대로는 **패배 -> 동률 -> 승리**입니다.
   - 80ms에서는 candidate가 분명히 밀리지만,
   - 160ms에서 따라잡고,
   - 240ms에서는 오히려 앞섭니다.
3. 즉 이번 후보는 직전 ordering-only 후보처럼 중간 시간대에서만 튀는 reversal이 아니라,
   특히 `s154-both` 기준으로 보면 **시간이 길어질수록 성능이 회복되는 일관된 crossover**에 가깝습니다.

다만 여기서 동시에 보이는 중요한 사실은,
`240ms`에서 회복되더라도 `80ms` 손실이 커서 **`s154-both` 전체 합산은 아직 candidate가 뒤진다**는 점입니다.

## 4. 시간대 합산 결과
두 baseline을 합쳐 시간대별로 보면 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |
| `160ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |
| `240ms` | `10.0/24` (41.7%) | `14.0/24` (58.3%) | `+16.7pp` |

전체 합산:

- baseline: `34.0/72` (`47.2%`)
- candidate: `38.0/72` (`52.8%`)
- overall gap: `+5.6pp`

즉 전체 합산만 보면 candidate가 앞섭니다.
하지만 이 우세는 사실상 **`s154-main` 상대로 벌어둔 이득**에서 많이 오고,
더 강한 기준점인 `s154-both` 상대로는 아직 `17/36`로 약간 뒤집니다.

## 5. throughput / cost 관찰
nodes/ms는 이번 후보를 채택 쪽으로 강하게 밀어 주지도, reject 쪽으로 강하게 밀어 주지도 않았습니다.

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `8.60`, candidate `8.75`
- `160ms`: baseline `9.94`, candidate `9.79`
- `240ms`: baseline `10.26`, candidate `10.13`

### baseline별 평균 nodes/ms
- `s154-main`: baseline `9.58`, candidate `9.55`
- `s154-both`: baseline `9.62`, candidate `9.56`

관찰:

1. `80ms`에서는 candidate가 약간 더 빠르지만, 그 자체가 strength 설명으로 이어지지는 않습니다.
   - 특히 `s154-both` 상대로는 **더 빠른데도 더 약했습니다.**
2. `160ms`, `240ms`에서는 candidate가 약간 느립니다.
3. 하지만 차이는 작고, 이번 판정을 throughput 하나로 닫을 수준은 아닙니다.

즉 이번 후보의 핵심은 speed story가 아니라,
**시간 증가에 따라 MPC-only 구조가 실제로 crossover를 만드는가** 쪽입니다.

## 6. 판정

### 결론: **보류**

이번 후보는 **비채택으로 닫기에는 아깝고, 채택으로 올리기에는 아직 이릅니다.**
따라서 이번 판정은 **보류**가 맞습니다.

근거는 세 가지입니다.

1. **노이즈 패턴이 아니라 시간 의존 crossover 패턴이 보입니다.**
   - `s154-both` 상대로 `-33.3pp -> 0.0pp -> +16.7pp`
   - `s154-main` 상대로 `+33.3pp -> 0.0pp -> +16.7pp`

   특히 직전 `ordering-only` 후보처럼 `패배 -> 승리 -> 패배` 식의 흔들림이 아니라,
   **짧은 시간에서는 손해 / 긴 시간에서는 회복**이라는 방향성이 비교적 선명합니다.

2. **하지만 현재 기준만으로는 채택 근거가 부족합니다.**
   - `s154-main`은 이겼지만,
   - `s154-both` 전체 합산에서는 아직 `17/36`으로 밀립니다.

   사용자가 명시한 baseline이 `s154-main`, `s154-both` 둘 다이므로,
   더 강한 기준점인 `s154-both`를 전체적으로 넘기지 못한 상태에서 곧바로 채택하기는 어렵습니다.

3. **추가로 필요한 조건 표본이 무엇인지가 명확합니다.**
   이번 후보는 “더 많은 게임 수를 막연히 더 돌려 보자”가 아니라,
   **더 긴 시간 구간에서 crossover가 계속 유지되는지**를 보는 것이 핵심입니다.

   즉 다음 decisive sample은 예를 들면 `320ms`, `400ms` 같은 추가 long-think 구간입니다.
   이런 추가 조건이 없으면,
   - 80ms 손실을 더 중요하게 볼지,
   - 240ms 승리를 더 중요하게 볼지
   를 합리적으로 가르기 어렵습니다.

## 7. 왜 비채택이 아닌가
비채택으로 닫으려면 “추가 조건을 보더라도 판정이 바뀔 가능성이 낮다”는 쪽이어야 합니다.

하지만 이번 후보는 그렇지 않습니다.

- `s154-both` 기준으로 **패배 -> 동률 -> 승리**가 나왔고,
- 전체 시간대 합산도 `80/160`은 동률, `240`은 candidate 우세이며,
- 전체 합산도 candidate가 앞섭니다.

즉 이번 결과는 “이미 strength story가 없어서 접어도 된다”가 아니라,
**어느 시간대에서 crossover가 일어나는지 더 분해해 볼 가치가 남아 있다**는 쪽에 가깝습니다.

## 8. 왜 채택이 아닌가
반대로 채택으로 올리려면,
현재 기준만으로도 두 baseline을 상대로 충분히 안전하다는 인상이 있어야 합니다.

하지만 이번 후보는
- `s154-both` 80ms에서 크게 밀렸고,
- `s154-both` 전체 합산도 아직 뒤지며,
- throughput 이득도 거의 없습니다.

즉 “short-think까지 포함한 범용 기본값”으로 바로 승격할 수 있는 상태는 아닙니다.
현재는 **longer-think conditional upside**가 보이는 정도로 해석하는 편이 더 정확합니다.

## 9. 다음 의미 있는 후속 분기
이번 보류를 깨려면 가장 의미 있는 후속 분기는 두 갈래입니다.

1. **같은 후보를 추가 long-think 구간으로 한 번 더 본다.**
   - 예: `320ms`, `400ms`
   - 이유: 이번 후보는 시간 증가에 따른 crossover 확인이 핵심이기 때문
2. **일단 다음 후보 `s157-main-anchor`로 넘어가서, ordering + MPC를 함께 얹었을 때 short-think 약점이 상쇄되는지 본다.**
   - `MPC-only`의 80ms 약점이 ordering과 결합되면 완화될 수 있습니다.

즉 이 보류는 단순한 미루기가 아니라,
**지금 보이는 패턴이 너무 명확하게 시간 의존적이라서 추가 조건이 결정적**인 경우입니다.

## 10. 산출물
- decision summary JSON  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-mpc-only/summary.json`
- decision summary Markdown  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-mpc-only/summary.md`
- per-baseline raw results  
  - `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-mpc-only/results/s154-main__s157-main-mpc-only.json`
  - `tools/engine-match/out/stage168-stage157-158-mainline-decision-runs/s157-main-mpc-only/results/s154-both__s157-main-mpc-only.json`

## 11. 최종 한 줄
` s157-main-mpc-only `는 직전 ordering-only 후보와 달리 **노이즈가 아니라 time-dependent crossover** 신호를 보였지만,
현재 기준만으로는 `s154-both` 전체를 아직 넘지 못하므로 **채택도 비채택도 아닌 보류**가 맞습니다.
