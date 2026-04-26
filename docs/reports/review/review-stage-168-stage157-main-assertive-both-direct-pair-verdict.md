# Stage168 direct-pair verdict: `s157-main-assertive-both`

## 1. 목적
` s157-main-assertive-both `는 stage154 family에서 남겨 둔 **가장 공격적인 both-side MPC mainline 후보**입니다.

핵심 구성은 다음 두 축입니다.

- move-ordering: `hybrid-probe-v1`
- MPC: `assertive-both-v1`

즉 `soft-both`보다도 더 공격적으로 low/high 양방향 selective cut을 허용하면서,
ordering은 wide-hybrid 계열보다 한 단계 더 probe 성향을 섞은 조합입니다.

이번 단계의 목적은 이 후보를
` s154-main `, ` s154-both ` 두 baseline에 각각 overlay한 뒤,
`80/160/240ms` direct pair에서 **실제로 채택할 만큼 일관된 우세가 있는지**, 또는
`soft-both`처럼 short-think 쪽 착시만 남는지 확인하는 것입니다.

## 2. 실행 조건
- baseline: `s154-main`, `s154-both`
- candidate: `s157-main-assertive-both`
- time: `80,160,240 ms`
- seeds: `17,31,53,71`
- baseline/time 조합당 총 게임 수: `8`

실행 명령:

```bash
node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
  --candidate s157-main-assertive-both \
  --output-root tools/engine-match/out/stage168-assertiveboth-cont \
  --time-ms-list 80,160,240 \
  --seed-list 17,31,53,71 \
  --games 1
```

## 3. baseline별 결과
| baseline | 80ms | 160ms | 240ms | baseline 전체 | candidate 전체 |
|---|---:|---:|---:|---:|---:|
| `s154-main` | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `11.0/24` (45.8%) | `13.0/24` (54.2%) |
| `s154-both` | `2.0/8` vs `6.0/8` (gap `+50.0pp`) | `4.0/8` vs `4.0/8` (gap `+0.0pp`) | `3.0/8` vs `5.0/8` (gap `+25.0pp`) | `9.0/24` (37.5%) | `15.0/24` (62.5%) |

패턴은 다음처럼 정리됩니다.

- `s154-main`: `동률 -> 동률 -> 승리`
- `s154-both`: `승리 -> 동률 -> 승리`

중요한 점은 **음수 구간이 하나도 없었다**는 것입니다.

- `s154-main`에서는 short/mid를 깎아먹지 않고 240ms에서만 우세가 생겼고,
- `s154-both`에서는 80ms에서 크게 앞선 뒤 160ms 동률, 240ms 재우세로 마감했습니다.

즉 `soft-both`처럼 long-think에서 무너지는 그림이 아니라,
**공격형 both-side MPC인데도 dual-baseline non-loss pattern을 유지한 케이스**로 읽는 편이 맞습니다.

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

이 숫자는 `wide-hybrid`와 동일한 overall gap입니다.

다만 내부 패턴은 조금 다릅니다.

- `wide-hybrid`는 두 baseline 모두 `승리 -> 동률 -> 승리`였습니다.
- `assertive-both`는 `s154-main`이 `동률 -> 동률 -> 승리`, `s154-both`가 `승리 -> 동률 -> 승리`입니다.

즉 이번 후보는 `wide-hybrid`처럼 전 구간 적극 우세라기보다,
`main` 축에서는 보수적으로 버티고 `both` 축에서 더 강하게 치고 나가는 형태입니다.
그래도 사용자 기준인 “시간 증가가 선형적 개선인지, 아니면 noisy reversal인지”로 보면
**적어도 noisy sign flip 후보는 아닙니다.**

## 5. throughput / cost
이번 후보는 risk label이 높지만 throughput story는 의외로 거의 중립이었습니다.

### baseline별 평균 nodes/ms
- `s154-main`: baseline `8.89`, candidate `8.80`
- `s154-both`: baseline `9.49`, candidate `9.57`

### 시간대 합산 평균 nodes/ms
- `80ms`: baseline `8.17`, candidate `8.47`
- `160ms`: baseline `9.57`, candidate `9.36`
- `240ms`: baseline `9.84`, candidate `9.73`

전체 평균:
- baseline `9.19`
- candidate `9.18`

즉 전체 throughput은 사실상 **완전 중립**에 가깝습니다.

- 80ms에서는 candidate가 더 빠르고,
- 160/240ms에서는 baseline이 약간 더 빠르지만,
- 전체 평균 차이는 실질적으로 무시 가능한 수준입니다.

따라서 이번 후보는 “공격형이라서 느려지고, 그 느려짐 때문에 나중에 무너진다”는 패턴으로 읽히지 않습니다.
오히려 **throughput을 거의 유지한 채 score 우세만 확보한 공격형 both-side MPC** 쪽에 가깝습니다.

## 6. 왜 보류를 쓰지 않았는가
이번 후보에는 보류를 쓰지 않았습니다.

이유는 다음과 같습니다.

1. **패배 구간이 없습니다.**  
   여섯 개 baseline/time 셀 중 음수 gap이 하나도 없습니다.
2. **`soft-both`의 long-think reversal이 재현되지 않았습니다.**  
   같은 both-side 계열인데도 240ms에서 두 baseline 모두 우세였습니다.
3. **overall gap이 충분히 큽니다.**  
   전체 `28/48` 대 `20/48`은 단순한 한두 셀 우연으로 보기 어렵습니다.
4. **cost penalty가 사실상 없습니다.**  
   nodes/ms 평균이 거의 동일하므로 fixed-time score 우세를 그대로 해석할 수 있습니다.

즉 이 후보에 남아 있는 불확실성은 “더 큰 표본에서 얼마나 강하게 남느냐” 쪽이지,
“실은 해로운 후보가 아니냐” 쪽이 아닙니다.
현재 표본만으로도 **채택 / 비채택을 바로 확정해도 되는 종류의 결과**입니다.

## 7. 판정
### 결론: **채택**

` s157-main-assertive-both `는 **채택**입니다.

근거는 네 가지입니다.

1. **두 baseline 모두에서 non-loss pattern**을 만들었습니다.  
   `s154-main`은 `동률 -> 동률 -> 승리`, `s154-both`는 `승리 -> 동률 -> 승리`였습니다.
2. **long-think collapse가 없습니다.**  
   가장 위험한 240ms 구간에서 오히려 두 baseline 모두 우세였습니다.
3. **overall 합산이 분명히 앞섭니다.**  
   전체 `28/48` 대 `20/48`은 지금까지 본 stage157 채택 후보와 같은 수준의 우세입니다.
4. **throughput이 사실상 중립입니다.**  
   aggressive both-side MPC인데도 nodes/ms 평균이 baseline과 거의 같아, score 우세를 cost penalty 없이 해석할 수 있습니다.

따라서 `assertive-both`는 stage157 mainline 후보 중에서
`wide-hybrid`, `frontier-gate`에 이어 세 번째 **명시적 채택** 사례로 보는 것이 맞습니다.

## 8. 해석
이번 결과는 “both-side MPC는 기본적으로 위험하므로 long-think에서 망가진다”는 단순 규칙으로는 정리되지 않는다는 뜻입니다.

실제로 stage157 mainline에서는 다음처럼 갈렸습니다.

- `soft-both`: short/mid는 좋았지만 reinforced 후 240ms dual-baseline 패배 → **비채택**
- `assertive-both`: 80/160에서 baseline을 깎아먹지 않고 240ms dual-baseline 우세 → **채택**

즉 both-side MPC 계열의 성패는 “both-side냐 아니냐” 하나보다,
**ordering skeleton과 verification/gate 조합이 어떻게 묶였느냐**에 더 크게 좌우된다고 보는 편이 맞습니다.

이 해석은 이후 stage158 zebra/open 계열을 볼 때도 중요합니다.
공격적인 selective search라 해도,
실제 direct-pair에서 non-loss pattern과 long-think 우세가 재현되면
보수적으로 배제할 이유는 없습니다.

## 9. stage157 mainline lane 정리
이번 판정으로 stage157 mainline direct-pair lane은 다음처럼 정리됩니다.

### 채택
- `s157-main-wide-hybrid`
- `s157-main-frontier-gate`
- `s157-main-assertive-both`

### 비채택
- `s157-main-order-only`
- `s157-main-mpc-only`
- `s157-main-anchor`
- `s157-main-tight-probe`
- `s157-main-exact-safe`
- `s157-main-soft-both`

즉 stage157 mainline에서는
**넓은 hybrid ordering**, **cheap frontier/static-gate 보수형**, **aggressive both-side non-collapse형**
세 갈래가 채택 후보로 남았습니다.

## 10. 산출물
- summary Markdown  
  `tools/engine-match/out/stage168-assertiveboth-cont/s157-main-assertive-both/summary.md`
- summary JSON  
  `tools/engine-match/out/stage168-assertiveboth-cont/s157-main-assertive-both/summary.json`
- baseline result JSON  
  - `tools/engine-match/out/stage168-assertiveboth-cont/s157-main-assertive-both/results/s154-main__s157-main-assertive-both.json`
  - `tools/engine-match/out/stage168-assertiveboth-cont/s157-main-assertive-both/results/s154-both__s157-main-assertive-both.json`

## 11. 최종 한 줄
` s157-main-assertive-both `는 aggressive both-side MPC 후보였지만,
직접 결과는 `s154-main`에서 `동률 -> 동률 -> 승리`, `s154-both`에서 `승리 -> 동률 -> 승리`로 정리됐고,
240ms에서도 무너지지 않았습니다.
throughput도 사실상 중립이므로 최종 결론은 **채택**입니다.
