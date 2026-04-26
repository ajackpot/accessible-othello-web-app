# move generation / flips 후보 조사 보고서

## 범위

- NTest
- edax
- edax-reversi-AVX
- Egaroucid
- othello-sensei
- 참고 문서: Okuhara bitboard 설명

이번 단계의 목표는 **특정 SIMD 명령을 그대로 베끼는 것**이 아니라, 웹/JS 코어로 옮길 수 있는 **구조·흐름·데이터 배치** 후보를 많이 모으는 것이었습니다.

## 현재 첨부 코어에서 보이는 간극

- `legalMovesBitboard()`는 방향 배열과 `shift` 콜백을 돌면서 합법수 비트보드를 만든다.
- `computeFlips()`는 착수 후보마다 8방향 while 루프로 flip을 다시 계산한다.
- `listPreparedSearchMoves()`와 `buildLegalMoveRecords()`는 move 객체를 새로 만든다.
- search의 few-empties / exact 전용 루틴들에서도 `computeFlips()` 재호출이 많이 남아 있다.
- 즉 현재 병목 구간은 알고리즘 이름보다 **legal kernel / flip kernel / move object 생성 / apply-undo 흐름**에 더 가까워 보인다.

## 엔진별 핵심 패턴

### NTest

- legal move는 `mobility(mover, enemy)` 한 커널로 먼저 계산한다.
- 실제 flip은 별도 `flips()` 경로에서 계산한다.
- `neighbors[sq]` 인접 체크가 있어, 바로 불가능한 착수는 비싼 flip 계산에 들어가지 않는다.
- `flipArray[64]` 같은 per-square metadata와 row/col/diag 테이블을 사용한다.

### edax / edax-AVX

- `get_moves`와 `board_flip` 인터페이스를 분리해 둔다.
- 합법수 생성은 Kogge-Stone / 1-stage parallel prefix / sequential 같은 여러 커널 패밀리를 교체 가능하게 둔다.
- flip은 square-specialized 함수와 8-bit line extract + OUTFLANK/FLIPPED 테이블 계열을 폭넓게 갖고 있다.
- apply/undo는 `flipped` bitboard 하나로 XOR/swap 방식으로 처리한다.
- AVX fork는 특정 명령(예: PEXT)이 환경에 따라 최선이 아닐 수 있음을 강조하므로, **한 가지 구현에 올인하지 말고 커널 패밀리를 벤치로 고르는 구조**가 중요하다.

### Egaroucid

- 엔진/웹 모두 `mobility.hpp`, `flip.hpp`, `last_flip.hpp`, `board.hpp`로 규칙 커널을 분리한다.
- 웹 버전도 별도 규칙 커널을 갖고 있어, generic/web 특화 분리 구조가 깔끔하다.
- `calc_legal()`는 Okuhara류 병렬 prefix 법칙을 그대로 쓴다.
- `Flip { pos, flip }` 구조와 `move_board / move_copy / undo_board`가 있어 apply/undo가 매우 얇다.
- 1-empty 전용 `last_flip`, 2~4 empties에서 legal generation 생략 같은 종반 특화가 명시적으로 있다.

### othello-sensei

- `get_moves`와 `get_flip`이 분리되어 있다.
- `GetFlip()`은 `MoveMetadata` + `kOutflank` + `kFlip` 테이블로 row/col/diag를 합쳐 flip bitboard를 만든다.
- `Board::PlayMove/Next/UndoMove`가 flip bitboard를 기본 단위로 사용한다.
- `CompressedFlip` 직렬화가 있어, move token을 작게 들고 다닐 수 있다.
- repo 문서상 POPCNT/BMI2 플래그의 영향이 크다고 직접 언급한다. 즉 구현 구조가 명령/환경 민감도를 가진다는 뜻이다.

## 후보 풀

| ID | 분류 | 후보 | 출처 | JS 적합성 | 기대 영향 |
|---|---|---|---|---|---|
| C01 | Mobility kernel | 하드코딩된 8방향/4축 legal-move 커널 | Egaroucid, Sensei, edax, NTest | 높음 | 높음 |
| C02 | Mobility kernel | 양방향 동시 확장 get_some_moves 패턴 | edax | 높음 | 중~높음 |
| C03 | Mobility kernel | 마스크를 먼저 자른 flippable-opponent 경로 | Sensei, Egaroucid, edax | 높음 | 중간 |
| C04 | Move flow | legal-only와 flip-materialize 완전 분리 | NTest, edax, Sensei, Egaroucid | 높음 | 높음 |
| C05 | Move flow | Flip {pos, flip} 를 canonical move 타입으로 사용 | Egaroucid, Sensei | 높음 | 높음 |
| C06 | Apply/undo | flip 비트보드 기반 XOR+swap apply/undo | edax, Egaroucid, Sensei | 높음 | 중~높음 |
| C07 | Allocation | ply-local scratch move buffer 재사용 | 구조적 공통점 | 높음 | 중~높음 |
| C08 | Flip kernel | neighbor precheck | NTest | 높음 | 중간 |
| C09 | Flip kernel | 8-bit row table (flip_pre_calc) | Egaroucid | 높음 | 높음 |
| C10 | Flip kernel | OUTFLANK + FLIP 2단계 테이블 | Sensei, edax, NTest | 높음 | 높음 |
| C11 | Flip kernel | line_to_board 재확장 테이블 | Egaroucid | 높음 | 중간 |
| C12 | Flip kernel | per-square metadata 배열 | Sensei, NTest | 높음 | 중~높음 |
| C13 | Flip kernel | mask×multiply>>shift line packing | edax, NTest | 중간 | 높음 |
| C14 | Kernel architecture | 복수 flip 커널 패밀리를 같은 API 뒤에 숨기기 | edax, edax-AVX | 높음 | 높음 |
| C15 | Flip count | flipCount 전용 테이블 | Egaroucid | 높음 | 중간 |
| C16 | Endgame | 1-empty 전용 last_flip 함수 | Egaroucid, NTest, edax-AVX | 높음 | 중간 |
| C17 | Endgame | 2-empty legal generation 생략 | Egaroucid | 높음 | 중간 |
| C18 | Endgame | 3-empty legal generation 생략 + 시도 순서 테이블화 | Egaroucid | 높음 | 중간 |
| C19 | Endgame | 4-empty legal generation 생략 + 우선순위 테이블 | Egaroucid | 높음 | 중간 |
| C20 | Packing | CompressedFlip 저장 형식 | Sensei | 중간 | 중간 |
| C21 | Heuristic support | GetNMovesApprox 스타일 근사 mobility | Sensei | 높음 | 낮음~중간 |
| C22 | Architecture | mobility / flip / last_flip / board 모듈 분리 | Egaroucid, Sensei | 높음 | 중간 |
| C23 | Architecture | generic pack + typed-array pack + wasm pack 병렬 유지 | Egaroucid, edax-AVX에서 영감 | 중간 | 높음 |
| C24 | Benchmarking | perft 기반 board-operation 전용 벤치 | Egaroucid | 높음 | 간접적 |
| C25 | Search flow | legal generation 직후 wipeout/forced win 빠른 판정 | Egaroucid | 높음 | 낮음~중간 |
| C26 | Search flow | TT/PV 선행 move만 먼저 flip 계산 | Egaroucid 검색 흐름, edax Move 구조 | 높음 | 중간 |

## 우선 실험 권장 묶음

### 묶음 A: 현재 BigInt 코어에서 바로 가능한 것

- **C01 하드코딩된 8방향/4축 legal-move 커널**: DIRECTIONS 순회와 shift 콜백 대신 1/7/8/9축을 하드코딩한 병렬-prefix 형태로 합법수 비트보드를 바로 계산한다.
- **C02 양방향 동시 확장 get_some_moves 패턴**: 한 축에서 좌/우 또는 상/하를 한 함수에서 같이 전개해 legal bitboard를 만든다.
- **C04 legal-only와 flip-materialize 완전 분리**: 먼저 legal 비트보드만 만든 뒤, 실제 탐색/적용 시점에만 flip을 계산하거나 읽는다.
- **C05 Flip {pos, flip} 를 canonical move 타입으로 사용**: move record의 핵심을 (착수 위치, 뒤집힘 비트보드) 두 값으로 제한하고 나머지 정보는 별도 배열/버퍼로 관리한다.
- **C06 flip 비트보드 기반 XOR+swap apply/undo**: move->flipped 또는 flip.bit 하나만 들고 board update/restore를 XOR와 swap으로 처리한다.
- **C07 ply-local scratch move buffer 재사용**: 매 노드마다 새 JS 객체/배열을 만들지 않고, ply별 고정 길이 버퍼를 재사용한다.
- **C08 neighbor precheck**: 착수 칸 인접 8칸에 상대 돌이 하나도 없으면 flip 계산을 즉시 0으로 반환한다.
- **C16 1-empty 전용 last_flip 함수**: 마지막 한 칸은 보드 생성 없이 현재 돌 차이 + 뒤집히는 개수만 계산한다.
- **C17 2-empty legal generation 생략**: 남은 두 칸만 직접 시도하고, 인접 상대 돌이 있을 때만 flip을 계산한다.
- **C18 3-empty legal generation 생략 + 시도 순서 테이블화**: 세 칸을 직접 시도하되 quadrant/parity 기반 우선순위를 테이블로 준다.
- **C19 4-empty legal generation 생략 + 우선순위 테이블**: 네 칸도 legal bitboard를 만들지 않고 직접 검사·정렬한다.
- **C24 perft 기반 board-operation 전용 벤치**: legal/flip/apply가 집중되는 perft로 correctness와 throughput을 같이 측정한다.
- **C26 TT/PV 선행 move만 먼저 flip 계산**: best move 후보 1개를 먼저 확장하고 나머지는 필요할 때 flip을 materialize한다.

### 묶음 B: TypedArray 또는 전용 테이블 도입이 필요한 것

- **C09 8-bit row table (flip_pre_calc)**: (player8, opponent8, pos) → flipped-row 8bit를 미리 계산해 가로/세로/대각선 모두 같은 룩업 구조로 처리한다.
- **C10 OUTFLANK + FLIP 2단계 테이블**: 먼저 outflank를 찾고, 그 결과를 두 번째 테이블에 넣어 flipped 패턴을 얻는다.
- **C11 line_to_board 재확장 테이블**: 세로/대각선 8bit 결과를 64bit board로 되돌리는 매핑 테이블을 둔다.
- **C12 per-square metadata 배열**: 각 칸마다 row/col/diag 마스크, shift, 배치 위치, 이웃 비트 등을 미리 계산해 둔다.
- **C15 flipCount 전용 테이블**: full flip bitboard를 만들지 않고 line table에서 뒤집히는 개수만 바로 얻는다.
- **C20 CompressedFlip 저장 형식**: 행/열/대각선 뒤집힘을 압축해 32bit 근처의 compact move token으로 저장한다.
- **C21 GetNMovesApprox 스타일 근사 mobility**: neighbors(opponent) & empties 같은 근사값으로 빠른 fallback/ordering 힌트를 얻는다.
- **C22 mobility / flip / last_flip / board 모듈 분리**: 핵심 규칙 커널을 모듈 경계로 분리하고 search는 API만 호출한다.

### 묶음 C: 표현 계층을 더 크게 바꾸는 것

- **C13 mask×multiply>>shift line packing**: 64bit 선분을 mask와 multiply로 8bit packed line으로 뽑아 테이블 인덱스로 사용한다.
- **C14 복수 flip 커널 패밀리를 같은 API 뒤에 숨기기**: plain / prefix / table / bitscan 계열을 같은 인터페이스로 두고 환경별 benchmark로 고른다.
- **C23 generic pack + typed-array pack + wasm pack 병렬 유지**: 알고리즘은 같되 표현만 다른 커널 팩을 유지하고 브라우저별로 고른다.
- **C25 legal generation 직후 wipeout/forced win 빠른 판정**: 각 move의 flip을 계산한 직후 상대 말 소멸 여부 같은 극단 케이스를 바로 체크한다.

## 현재 코어에 특히 없는 것으로 보이는 것

- flip 계산용 8-bit line table 계열 (`flip_pre_calc`, `OUTFLANK+FLIP`, `line_to_board`)
- per-square metadata / neighbor precheck
- `flip` bitboard 중심의 canonical move 타입과 얇은 apply/undo 경로
- 1-empty `last_flip`과 2~4 empties legal 생략
- 커널 패밀리 A/B 구조 (plain/prefix/table)
- compact move token (`CompressedFlip`) 또는 scratch buffer 재사용

## 추천 구현 순서

1. **C01 + C02**: `legalMovesBitboard()`를 Okuhara/edax류 하드코딩 prefix kernel로 교체
2. **C08 + C10 + C12**: `computeFlips()`를 neighbor precheck + line-table kernel로 대체
3. **C05 + C06 + C07**: search 전반을 `Flip {pos, flip}` + scratch buffer + XOR/swap로 정리
4. **C16 ~ C19**: exact 1~4 empties 전용 루틴을 표 기반으로 재작성
5. **C14 + C23 + C24**: BigInt/plain, table, TypedArray/wasm 후보를 perft/throughput 벤치로 A/B

## 실험 메모

- table 계열은 JS에서도 충분히 현실적이다. 예를 들어 Egaroucid 스타일 `flip_pre_calc[256][256][8]`는 대략 0.5MB, `n_flip_pre_calc`까지 합쳐도 1MB 남짓이라 브라우저에서도 감당 가능하다.
- 다만 64-bit 결과를 JS에서 어떻게 들고 다닐지는 별도 검토가 필요하다. `BigInt`, `BigUint64Array`, `Uint32 lo/hi` 두 워드 표현, Wasm 중에서 브라우저별 승자가 달라질 수 있다.
- 그래서 이 단계의 핵심 결론은 **최종 구현을 하나로 찍는 것이 아니라, 커널 패밀리를 여러 개 보관하고 빠르게 측정할 수 있는 구조를 먼저 만드는 것**이다.
