# Stage168 reinforced direct-pair verdict: `s157-main-mpc-only`

## 1. 목적
직전 1차 판정에서 `s157-main-mpc-only`는 **보류**였습니다.
보류 사유는 `s154-both` 기준 `패배 -> 동률 -> 승리` 패턴이 보여서,
짧은 시간에서는 손해지만 긴 시간에서는 살아나는 **time-dependent crossover** 가능성을 더 확인할 가치가 있다는 점이었습니다.

이번 단계의 목표는 그 보류를 그대로 남기지 않고,
실제로 표본을 보강해 **채택 / 비채택을 확정**하는 것입니다.

## 2. 보강 방식
보강은 두 갈래로 나눴습니다.

1. **core retest**
   - 시간: `80,160,240 ms`
   - seeds: `17,31,53,71,89,107`
   - baseline/time 조합당 총 게임 수: `12`
2. **long-think retest**
   - 시간: `320,400 ms`
   - seeds: `17,31,53,71,89,107`
   - baseline/time 조합당 총 게임 수: `12`

공통 baseline은 동일하게 `s154-main`, `s154-both`를 사용했습니다.
즉 이번 reinforced retest는 총 `120` game 규모로,
직전 보류를 만든 “장시간 crossover” 가설이 실제로 재현되는지 직접 확인하는 구성입니다.

## 3. 실행 명령
### core retest
```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-mpc-only \
  --output-root tools/engine-match/out/stage168-stage157-158-mainline-decision-core-retest \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71,89,107 \
  --games 1
```

### long-think retest
```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-mpc-only \
  --output-root tools/engine-match/out/stage168-stage157-158-mainline-decision-long-retest \
  --time-ms-list 320,400 \
  --seed-list 17,31,53,71,89,107 \
  --games 1
```

## 4. baseline별 reinforced 결과
| baseline | 80ms | 160ms | 240ms | 320ms | 400ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `s154-main` | `6.0/12` (50.0%, gap `+0.0pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `30.0/60` (50.0%) | `30.0/60` (50.0%) |
| `s154-both` | `6.0/12` (50.0%, gap `+0.0pp`) | `7.0/12` (58.3%, gap `+16.7pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `6.5/12` (54.2%, gap `+8.3pp`) | `6.0/12` (50.0%, gap `+0.0pp`) | `28.5/60` (47.5%) | `31.5/60` (52.5%) |

해석은 분명합니다.

1. `s154-main` 상대로는 **5개 시간 구간이 전부 정확히 동률**입니다.
   즉 직전 1차 판정에서 보였던 `승리 -> 동률 -> 승리` 신호는,
   표본을 두껍게 하자 **재현되지 않았습니다.**
2. `s154-both` 상대로는 `동률 -> 승리 -> 동률 -> 소폭 승리 -> 동률`입니다.
   장시간에서 일관되게 계속 강해지는 선형 crossover라기보다,
   **대부분 동률이고 일부 구간만 약간 앞서는 형태**에 가깝습니다.
3. 특히 400ms에서까지 다시 동률로 돌아왔기 때문에,
   직전 보류의 핵심이었던 “길게 가면 확실히 살아난다”는 해석은 유지되지 않습니다.

## 5. 시간대 합산 결과
두 baseline을 합쳐 시간대별로 보면 다음과 같습니다.

| time | baseline 합산 | candidate 합산 | gap |
|---|---:|---:|---:|
| `80ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |
| `160ms` | `11.0/24` (45.8%) | `13.0/24` (54.2%) | `+8.3pp` |
| `240ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |
| `320ms` | `11.5/24` (47.9%) | `12.5/24` (52.1%) | `+4.2pp` |
| `400ms` | `12.0/24` (50.0%) | `12.0/24` (50.0%) | `+0.0pp` |

전체 합산:

- baseline: `58.5/120` (`48.8%`)
- candidate: `61.5/120` (`51.2%`)
- overall gap: `+2.5pp`

전체 합산만 보면 candidate가 조금 앞섭니다.
하지만 그 이득은 **`s154-both`의 160ms / 320ms 두 구간**에서만 나왔고,
나머지 여덟 행은 모두 사실상 동률입니다.

즉 이 결과는 “범용 기본값으로 안정적으로 더 강하다”가 아니라,
**특정 baseline·특정 시간대에서만 약하게 우세할 수 있다**는 정도에 가깝습니다.

## 6. throughput / cost 관찰
reinforced retest에서 nodes/ms 평균은 오히려 candidate 쪽이 약간 느렸습니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `18.44`, candidate `18.23`
- `s154-both`: baseline `18.38`, candidate `18.21`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `17.04`, candidate `17.08`
- `160ms`: baseline `18.08`, candidate `18.15`
- `240ms`: baseline `19.63`, candidate `19.28`
- `320ms`: baseline `18.89`, candidate `18.58`
- `400ms`: baseline `18.39`, candidate `18.02`

즉 speed story도 채택 쪽 근거가 되지 않습니다.
짧은 시간에서는 비슷하거나 약간 빠를 수 있지만,
중간 이후 구간에서는 대체로 baseline이 더 많은 node를 처리했습니다.

## 7. 판정
### 결론: **비채택**

보류를 해소한 뒤의 최종 결론은 **비채택**입니다.

근거는 네 가지입니다.

1. **직전 보류를 만든 crossover 신호가 재현되지 않았습니다.**
   - `s154-main`: 5개 시간대 전부 동률
   - `s154-both`: 동률이 대부분이고, 160ms/320ms에서만 소폭 우세
2. **시간 증가에 따른 선형/일관 개선이 아닙니다.**
   `동률 -> 승리 -> 동률 -> 소폭 승리 -> 동률`은
   “긴 시간으로 갈수록 계속 좋아진다”가 아니라,
   **일부 구간만 들쭉날쭉하게 이득이 생기는 패턴**입니다.
3. **cross-baseline robustness가 없습니다.**
   `s154-both`에는 약간의 upside가 있어도,
   `s154-main`에서는 단 한 구간도 baseline을 넘지 못했습니다.
4. **throughput 이득이 없습니다.**
   평균 nodes/ms는 baseline이 약간 더 높았고,
   candidate의 작은 score 이득을 비용으로 상쇄해 줄 만한 속도 개선도 없었습니다.

따라서 `s157-main-mpc-only`는
“standalone MPC-only default”로는 채택하지 않는 것이 맞습니다.

## 8. 무엇이 보였는가
비채택이라고 해서 이 후보에서 아무것도 없었다는 뜻은 아닙니다.

- `s154-both` 쪽에는 **약한 conditional upside**가 남아 있습니다.
- 하지만 그 upside는 `s154-main`으로 일반화되지 않았고,
  400ms까지도 clean crossover로 닫히지 않았습니다.

즉 이 신호는 **독립 후보 채택** 근거가 아니라,
다음 `s157-main-anchor`처럼 ordering과 결합된 후보에서
“short-think 손실 없이 같은 upside가 남는지” 확인할 때 참고할 보조 힌트 정도로 해석하는 편이 맞습니다.

## 9. 산출물
- reinforced combined summary JSON  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-reinforced/s157-main-mpc-only/summary.json`
- reinforced combined summary Markdown  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-reinforced/s157-main-mpc-only/summary.md`
- core retest summary  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-core-retest/s157-main-mpc-only/summary.md`
- long-think retest summary  
  `tools/engine-match/out/stage168-stage157-158-mainline-decision-long-retest/s157-main-mpc-only/summary.md`

## 10. 최종 한 줄
` s157-main-mpc-only `는 직전 보류를 만든 crossover 가설을 reinforced retest로 다시 확인했지만,
결과는 **대부분 동률 + 일부 시간대의 좁은 upside**에 그쳤습니다. 따라서 최종 결론은 **비채택**입니다.
