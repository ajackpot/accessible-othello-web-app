# Review: stage170 survivor kickoff round4 individual anchor normalization

## 목적
stage170 round3에서 제안한 다음 단계대로, individual lane의 `s157-main-assertive-both`를
현재 combo hold 후보들과 같은 frame으로 고정해 상대 위치를 분명히 정리합니다.

## 처리 방식
fresh rerun 대신 **historical reuse exact-match**를 사용했습니다.

이 방식의 근거:
- candidate definition SHA-256: `4d3ff7bfe9614a2166ac85c8491605a441ab52ef94254ffbe23bab2dc6f8b1cd`
- overlay SHA-256 (`s154-main`): `79d9dda4e5381d0da14c20cafc5107755ed3f080d38ccca4491f8beade202ac7`
- overlay SHA-256 (`s154-both`): `79d9dda4e5381d0da14c20cafc5107755ed3f080d38ccca4491f8beade202ac7`
- 두 overlay hash 모두 stage168 historical artifact와 정확히 일치
- benchmark frame도 `classic`, `80/160/240ms`, seeds `17,31,53,71`, paired openings `1`로 동일

## 결과
- `s154-main`: **동률 -> 동률 -> 승리**
- `s154-both`: **승리 -> 동률 -> 승리**
- overall: baseline `20.0/48`, candidate `28.0/48`
- average nodes/ms: baseline `9.19`, candidate `9.18`

## 판정
`s157-main-assertive-both`는 **채택 유지 / individual anchor 유지**로 두는 것이 맞습니다.

이유:
- dual-baseline에서 음수 셀이 전혀 없음
- stronger baseline `s154-both`에서 `80ms`, `240ms` 승리
- `240ms`에서 dual-baseline 동시 승리
- throughput penalty가 사실상 없음

## current ranking 해석
fresh direct match는 아니므로 조심스럽게 해석해야 하지만,
baseline-relative signal만 놓고 보면 현재 생존 후보의 위치는 아래처럼 읽는 편이 자연스럽습니다.

1. `s157-main-assertive-both` — strongest current anchor
2. `s170-main-frontier-zebra` — most valuable combo hold, but still ambiguous
3. `s170-main-wide-zebra` — weaker hold, sample 확대 전에는 승격 근거 부족

## 다음 우선순위
다음 단계는 `s157-main-assertive-both`와 `s170-main-frontier-zebra`의 **직접 head-to-head**가 가장 생산적입니다.
