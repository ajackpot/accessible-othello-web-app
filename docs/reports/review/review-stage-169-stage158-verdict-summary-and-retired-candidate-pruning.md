# Stage169 review - stage158 verdict summary and retired candidate pruning

## 1. 배경
stage158 mainline direct-pair 판정이 순차적으로 끝났고,
보류가 필요했던 후보 두 개는 reinforced retest까지 마쳤습니다.

이번 review의 목적은 그 결과를 한 장에서 다시 읽을 수 있게 정리하고,
closeout 시점에 어떤 키를 active registry에 남기고 어떤 키를 retired historical surface로 돌렸는지 명확히 기록하는 것입니다.

## 2. 최종 판정 요약

| 후보 | 판정 경로 | 최종 결론 |
| --- | --- | --- |
| `s154-stable-zebra-open` | direct-pair | 비채택 |
| `s154-stable-zebra` | direct-pair 보류 → reinforced retest | 채택 |
| `s154-stable-quiet` | direct-pair | 비채택 |
| `s154-anchor-main` | direct-pair | 비채택 |
| `s154-stable-quiet-probe` | direct-pair 보류 → reinforced retest | 비채택 |
| `s154-zebra-both-probe` | direct-pair 보류 → reinforced retest | 비채택 |

## 3. 판정 메모
### `s154-stable-zebra-open`
`160ms`에서만 부분 이득이 보였지만 `240ms`에서 `s154-main`, `s154-both` 양축 모두 패배가 재현됐습니다.
long-think collapse가 분명해 **비채택**으로 닫는 것이 맞았습니다.

### `s154-stable-zebra`
1차 direct-pair에서는 `s154-main`과 `s154-both`의 `240ms` 해석이 갈려 **보류**가 타당했습니다.
하지만 reinforced retest에서는 `s154-both 240ms` 패배가 재현되지 않고 non-negative로 수렴했고, dual-baseline reversal도 사라졌습니다.
그래서 이 후보만 **채택**으로 확정됐습니다.

### `s154-stable-quiet`
승리 셀이 하나도 없고, overall / timing / nodes/ms가 모두 baseline보다 열세였습니다.
late crossover 가설도 남지 않아 **비채택**으로 닫았습니다.

### `s154-anchor-main`
historical `s157-main-anchor`와 동일 구성임을 확인했고,
direct-pair 결과도 short/mid에서 이미 밀리며 long-think 한 셀만 반짝하는 패턴이었습니다.
**비채택**이 맞았습니다.

### `s154-stable-quiet-probe`
1차 direct-pair에서는 `s154-main` 축 late-positive 가능성이 남아 **보류**로 둘 이유가 있었습니다.
하지만 reinforced retest에서는 그 late-positive가 동률로 수렴했고, `s154-both 80ms` 음수가 커졌습니다.
따라서 **비채택**으로 닫았습니다.

### `s154-zebra-both-probe`
1차 direct-pair에서는 `s154-both` 한 축에서 `80ms` 음수 / `240ms` 양수 crossover가 보였기 때문에 **보류**가 타당했습니다.
reinforced retest에서는 이 crossover가 사라지고 양 끝 시간대가 모두 음수로 정리됐습니다.
그래서 **비채택**으로 닫았습니다.

## 4. closeout 후 registry 상태

| 구분 | 키 |
| --- | --- |
| active mainline registry | `s154-control`, `s154-stable-zebra` |
| retired historical mainline keys | `s154-anchor-main`, `s154-stable-quiet`, `s154-stable-quiet-probe`, `s154-stable-zebra-open`, `s154-zebra-both-probe` |

여기서 중요한 해석은 두 가지입니다.

1. `s154-stable-zebra`는 **살아남았지만 아직 winner 승격이 끝난 것은 아닙니다.**
2. 비채택 5개 key는 이후 current decision lane과 active registry에서 다시 섞이지 않도록 historical surface로 분리했습니다.

## 5. runtime 해석
이번 Stage의 closeout은 stage158 판정 반영이지, 설치 기본 runtime 변경이 아닙니다.

- installed runtime generated module: 계속 `stage154 main-recenter`
- stage154 classic runtime variant catalog: 계속 `기본 추천(stage154 main)` / `확장 후보형(stage154 both)`
- stage157 adopted support set: 그대로 유지
- stage158 survivor 처리: 다음 세션에서 계속

즉 이번 review의 결론은  
**“stage158에서는 `s154-stable-zebra`만 survivor로 남겼고, 나머지는 current runtime/tooling surface에서 retire하는 것이 맞다”**
입니다.
