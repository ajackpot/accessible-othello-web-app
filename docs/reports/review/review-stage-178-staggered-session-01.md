# Stage 178 review — staggered Session 01 (`1a`, `2a`)

## Scope

이번 세션은 stage177 staggered plan의 Session 01을 그대로 실행했습니다.

- trial 1: `s176-main-wide-zebra-bothlite` vs `s157-main-assertive-both`, `s170-main-frontier-zebra-bothlite`
- trial 2: `s176-main-wide-assertive` vs `s170-main-frontier-zebra-bothlite`, `s176-main-wide-zebra-bothlite`
- shared frame: classic / `80,160,240ms` / seeds `17,31,53,71` / paired openings `1`

## Trial 1 verdict — `s176-main-wide-zebra-bothlite`

결론은 **비채택**입니다.

직접 결과는 아래와 같습니다.

1. vs `s157-main-assertive-both`
   - pattern from `s176-main-wide-zebra-bothlite` perspective: **패배 -> 동률 -> 패배**
   - overall: `11.0/24` vs `13.0/24`
   - time split:
     - `80ms`: `3.5/8` vs `4.5/8`
     - `160ms`: `4.0/8` vs `4.0/8`
     - `240ms`: `3.5/8` vs `4.5/8`

2. vs `s170-main-frontier-zebra-bothlite`
   - pattern from `s176-main-wide-zebra-bothlite` perspective: **동률 -> 동률 -> 승리**
   - overall: `14.0/24` vs `10.0/24`
   - time split:
     - `80ms`: `4.0/8` vs `4.0/8`
     - `160ms`: `4.0/8` vs `4.0/8`
     - `240ms`: `6.0/8` vs `2.0/8`

이 branch를 reject로 두는 이유는 분명합니다. 이 option의 primary hypothesis는 **wide-zebra lane의 160ms 약세를 줄이되 기존 short-think edge를 최대한 유지하는 것**이었습니다. 그런데 실제로는 현재 incumbent `s170-main-wide-zebra`가 갖고 있던 `assertive-both` 상대로의 provisional lead를 잃었습니다.

historical comparison:

- incumbent `s170-main-wide-zebra` vs `s157-main-assertive-both`: `19.0/36` vs `17.0/36`
- option `s176-main-wide-zebra-bothlite` vs `s157-main-assertive-both`: `11.0/24` vs `13.0/24`

즉 frontier lane 상대론 좋아졌지만, lane 전체 bracket에서 더 중요한 `assertive-both` 상대 edge가 꺾였습니다. 그래서 이 option은 “adopted improvement”가 아니라 **lane regression**으로 보는 편이 맞습니다.

정리:

- `s176-main-wide-zebra-bothlite`: **reject**
- next wide-zebra lane action: strict schedule을 고수한다면 contingency `s176-main-wide-zebra-midtrim`만 남습니다.
- practical recommendation: Session 02부터는 slot1을 이 option으로 carry-forward 하지 말고, incumbent `s170-main-wide-zebra`로 되돌리는 해석이 더 자연스럽습니다.

## Trial 2 verdict — `s176-main-wide-assertive`

결론은 **보류 유지, but survives**입니다.

직접 결과는 아래와 같습니다.

1. vs `s170-main-frontier-zebra-bothlite`
   - pattern from `s176-main-wide-assertive` perspective: **동률 -> 동률 -> 동률**
   - overall: `12.0/24` vs `12.0/24`
   - exact draw across all three time bands

2. vs `s176-main-wide-zebra-bothlite`
   - pattern from `s176-main-wide-assertive` perspective: **동률 -> 동률 -> 승리**
   - overall: `12.5/24` vs `11.5/24`
   - time split:
     - `80ms`: `4.0/8` vs `4.0/8`
     - `160ms`: `4.0/8` vs `4.0/8`
     - `240ms`: `4.5/8` vs `3.5/8`

이 option은 collapse하지 않았고, draw-heavy bracket에서 최소한 non-negative를 유지했습니다. 다만 여기서 곧바로 adopt로 올리지 않은 이유도 분명합니다.

- 이번 승리는 incumbent `s170-main-wide-zebra`가 아니라, 이미 regression sign이 확인된 `s176-main-wide-zebra-bothlite` 상대로 얻은 것입니다.
- `frontier-bothlite` 상대로는 exact draw라서 field separation도 아직 없습니다.
- 따라서 `s176-main-wide-assertive`는 **option1 survivor**이긴 하지만, 아직 `s157-main-assertive-both` lane의 definitive successor로 확정하긴 이릅니다.

정리:

- `s176-main-wide-assertive`: **hold / continue**
- next assertive lane action: Session 02에서도 계속 가져갈 수 있습니다.
- 단, “already adopted”가 아니라 **still-live contender**로 두는 편이 맞습니다.

## Session 01 ending-state picture

strict carry-forward ending state는 아래 trio였습니다.

- slot1: `s176-main-wide-zebra-bothlite`
- slot2: `s176-main-wide-assertive`
- slot3: `s170-main-frontier-zebra-bothlite`

pair results:

- `s176-main-wide-assertive` vs `s176-main-wide-zebra-bothlite`: `12.5/24` vs `11.5/24`
- `s176-main-wide-zebra-bothlite` vs `s170-main-frontier-zebra-bothlite`: `14.0/24` vs `10.0/24`
- `s176-main-wide-assertive` vs `s170-main-frontier-zebra-bothlite`: `12.0/24` vs `12.0/24`

league-style direct-point ledger:

1. `s176-main-wide-zebra-bothlite`: `25.5/48`
2. `s176-main-wide-assertive`: `24.5/48`
3. `s170-main-frontier-zebra-bothlite`: `22.0/48`

하지만 이 ledger만으로 slot1 option1을 살리지는 않습니다. 이번 session에서는 **lane-local verdict**와 **historical incumbent comparison**이 더 중요합니다. 그 기준으로 보면,

- `wide-zebra-bothlite`는 reject,
- `wide-assertive`는 hold,
- `frontier-bothlite`는 unchanged.

## Recommended next-session interpretation

Session 02로 넘어갈 때 해석은 두 가지가 가능합니다.

1. **strict schedule**
   - slot1=`s176-main-wide-zebra-bothlite`를 그대로 carry-forward
   - slot2=`s176-main-wide-assertive`
   - slot3 option1=`s176-main-frontier-bothlite-parity`

2. **recommended schedule after pruning failed branch**
   - slot1을 incumbent `s170-main-wide-zebra`로 되돌림
   - slot2=`s176-main-wide-assertive`
   - slot3 option1=`s176-main-frontier-bothlite-parity`

현재 evidence만 보면 2번이 더 합리적입니다. 실패가 확인된 branch를 계속 session budget에 묶어 둘 이유가 약하기 때문입니다.
