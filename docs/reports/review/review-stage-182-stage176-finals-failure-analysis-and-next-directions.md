# Stage 182 review - stage176 finals failure analysis and next directions

## 1. 배경
Stage 177~180의 staggered session / carry-forward bracket을 거치며 최종 결선 후보는 아래 두 개로 좁혀졌습니다.

- `s176-main-assertive-both-lite`
- `s176-main-frontier-bothlite-topk2`

Stage 181에서는 이 둘을 각각 `stage-154-main`, `stage-154-both` overlay로 `trineutron` against 검증했고,
후속 late-check에서는 `s176-main-frontier-bothlite-topk2 @ stage-154-both`를 `240/360ms`로 한 번 더 좁혀 확인했습니다.

최종 결론은 **option2 — 둘 다 폐기**였습니다.

## 2. 최종 판정 요약
### `s176-main-assertive-both-lite`
- `stage-154-main`: overall `17.0/24` vs vanilla `17.5/24` → **-0.5 pts**
- `stage-154-both`: overall `15.0/24` vs vanilla `17.0/24` → **-2.0 pts**
- avg nodes/game: `28726.7`, `28609.2`

해석: main 축도 baseline을 넘지 못했고, both 축에서는 더 분명하게 뒤졌습니다.

### `s176-main-frontier-bothlite-topk2`
- `stage-154-main`: overall `16.0/24` vs vanilla `17.5/24` → **-1.5 pts**
- `stage-154-both`: overall `16.5/24` vs vanilla `17.0/24` → **-0.5 pts**
- avg nodes/game: `27584.8`, `27154.0`

late-check (`stage-154-both`, `240/360ms`, seeds 6개)에서는
- `240ms`: `8.0/12` vs `8.5/12` → **loss**
- `360ms`: `7.0/12` vs `6.5/12` → **win**
- combined: `15.0/24` vs `15.0/24` → **draw**
- avg nodes/game: `41408.1` vs `40108.8`

해석: late-positive는 360ms에서만 약하게 보였고, 강화 late-check 전체로는 baseline을 넘지 못했습니다.

## 3. 왜 내부 브래킷에서는 살아남았는데 결선에서는 실패했는가 — 원인 가설
아래는 **확정 사실**이 아니라, 이번 로그가 가장 자연스럽게 설명되는 **원인 가설**입니다.

### 가설 1. internal bracket 최적화가 external anchor against 절대 strength로 이어지지 않았다
stage170~176 lane은 주로 **후보끼리의 상대 비교**로 좁혀졌습니다.
이 과정에서는 “상대 후보보다 덜 나쁘다”거나 “같은 축 안에서 crossover가 덜 흔들린다”는 신호가 winner를 만들 수 있습니다.

하지만 결선에서는 기준이 달랐습니다.
질문은 “서로 중 누가 낫냐”가 아니라 **“vanilla stage154-main / stage154-both를 실제 외부 anchor against 넘느냐”**였습니다.
이번 결론은 두 후보 모두 이 절대 기준을 넘지 못했다는 뜻입니다.

즉 stage176 winner들은 **internal meta winner**였지만,
그 이득이 곧바로 **external absolute strength**로 번역되지는 않았다고 보는 것이 가장 자연스럽습니다.

### 가설 2. ordering + MPC의 mixed-overlay coupling이 비가산적이었다
결선까지 남은 두 후보는 모두 “이미 살아남은 부품 둘”을 섞은 branch입니다.
이런 조합은 각 부품을 따로 볼 때는 좋아 보여도, 실제 fixed-time search에서는 다음 부작용을 만들기 쉽습니다.

- ordering이 넓혀 놓은 후보 분포와
- MPC gate / verification / both-lite cut timing이
- 서로 다른 phase에서 충돌해
- 절단할 node와 남겨야 할 node를 동시에 흔드는 것

즉 부품 A의 장점 + 부품 B의 장점이 단순합으로 더해지지 않고,
실전에서는 **search-shape mismatch**가 생겼을 가능성이 큽니다.

`assertive-both-lite`가 both 축에서 더 크게 무너진 점,
`frontier-bothlite-topk2`가 late-positive를 360ms 한 점에서만 약하게 보인 점은 이런 비가산성 가설과 잘 맞습니다.

### 가설 3. throughput tax가 실제 strength 이득을 잠식했다
결선 두 후보 모두 baseline보다 **nodes/game가 더 컸습니다.**

- baseline `s154-main`: `24880.8`
- baseline `s154-both`: `24689.8`
- `assertive-both-lite`: `28726.7`, `28609.2`
- `frontier-bothlite-topk2`: `27584.8`, `27154.0`

late-check에서도 candidate가 baseline보다 더 무거웠습니다.

이건 “더 많이 읽었으니 더 세다”가 아니라,
**같은 시간 예산에서 더 비싼 제어 로직 / verification / 후보 분기를 소비했지만, 그 비용을 점수 이득으로 회수하지 못했다**는 신호에 가깝습니다.

즉 이번 lane은 search quality를 높이기보다 search budget을 더 많이 먹는 쪽으로 기울었을 가능성이 큽니다.

### 가설 4. stage154 baseline이 이미 local optimum에 가까웠다
현재 설치 기본값인 stage154 main / both는
- move-ordering 폭
- MPC gate 강도
- verification timing
- candidate breadth
사이의 균형이 이미 꽤 잘 맞아 있는 상태로 보입니다.

이런 상태에서는 구조 overlay를 조금만 바꿔도
- short-think edge를 얻는 대신 mid/long을 잃거나
- late-positive를 얻는 대신 total cost가 늘거나
- both 축 안정성을 얻는 대신 main 축이 흔들리는
식의 **trade-off saturation**이 더 잘 나타납니다.

이번 stage176 branches가 반복해서 sign flip, split-base win, late-only positive를 보인 것은
바로 이 **plateau / local-optimum 근처 신호**로 해석하는 것이 자연스럽습니다.

### 가설 5. 360ms late-positive는 구조적 takeover가 아니라 budget-edge 신호에 그쳤다
`frontier-bothlite-topk2`는 360ms에서만 약한 반등을 보였습니다.
하지만
- 240ms는 다시 졌고,
- 240/360ms combined는 draw였고,
- cost는 더 컸습니다.

즉 이것은 “길게 두면 확실히 더 강해진다”는 takeover 신호라기보다,
**일부 budget에서만 간신히 살아나는 narrow late edge**에 가깝습니다.

실전 기본 프레임이 80/160/240ms 중심이라는 점까지 감안하면,
이 정도 late-only 반등은 adoption 근거로 쓰기 어렵습니다.

## 4. 후보별 해석
### `s176-main-assertive-both-lite`
이 후보의 실패는 “assertive lane을 살짝 누그러뜨리면 둘 다 좋아질 것”이라는 가설이 틀렸다는 뜻에 가깝습니다.

가능한 해석은 두 가지입니다.
- hybrid-probe ordering + assertive MPC 조합이 이미 결합 민감도가 높아서, lite 조정만으로는 both 축 손실을 줄이지 못했다.
- verification / gate를 한 단계 타이트하게 돌리는 과정이 오히려 실전 fixed-time에서는 필요한 tactical follow-through를 뺏었다.

즉 assertive lane은 단순 aggressiveness 완화만으로는 다시 살아나지 않을 가능성이 큽니다.

### `s176-main-frontier-bothlite-topk2`
이 후보의 실패는 “cheap frontier skeleton + tiny top-K(2)”가 internal bracket에서는 좋은 절충처럼 보여도,
external anchor against로는 **아직 score-positive를 보장하지 못한다**는 뜻입니다.

가능한 해석은 아래와 같습니다.
- top-K(2) 추가가 필요한 분기에서는 실제로 도움이 되지만,
- 전체 프레임에서는 그 비용과 shape distortion이 main/both 양축 average를 끌어내렸다.

즉 frontier lane은 여전히 low-overhead 감각이 장점이지만,
이번 topk2 branch는 “결정적인 마지막 한 걸음”까지는 아니었다고 보는 편이 맞습니다.

## 5. 앞으로의 방향
### 방향 1. `trineutron` / vanilla baseline screening을 훨씬 앞단으로 당긴다
다음 lane에서는 internal round-robin만 오래 돌리기보다,
**session 1 또는 session 2부터 external anchor against gate**를 거는 편이 낫습니다.

즉 “후보끼리 이겼다”보다 먼저,
- vanilla `stage154-main` against non-loss
- vanilla `stage154-both` against non-loss
- cost guardrail 통과
를 early gate로 두는 방향이 더 효율적입니다.

### 방향 2. universal mixed overlay보다 base-specific, single-axis delta를 우선한다
이번 실패는 ordering + MPC mixed overlay branch가 비가산적일 수 있음을 보여 줬습니다.
따라서 다음에는
- `stage154-main` 전용 미세 조정 1개
- `stage154-both` 전용 미세 조정 1개
처럼 **base-specific lane**을 따로 굴리는 편이 낫습니다.

그리고 한 번에 ordering + MPC를 같이 바꾸기보다,
- ordering only
- MPC only
- verification only
같은 **single-axis delta**를 먼저 확인하는 쪽이 재현성과 해석력이 더 좋습니다.

### 방향 3. cost guardrail을 더 이르게 건다
다음 lane에서는 fixed-time score뿐 아니라,
초기 세션부터 아래 같은 rule을 두는 것이 좋습니다.

- baseline 대비 nodes/game가 일정 비율 이상 커지면 바로 hold 또는 drop
- late-positive가 있더라도 cost-neutral이 아니면 강화 세션으로 바로 승격하지 않음

즉 다음 round는 **strength-first but cost-aware**로 읽는 것이 맞습니다.

### 방향 4. stage176 mixed-overlay branch는 새 외부 신호가 생기기 전까지 재개하지 않는다
현재 증거만 보면 stage176 계열은 이미 찍을 수 있는 local ceiling 근처까지 갔다고 보는 편이 자연스럽습니다.
따라서 아래가 없는 한 같은 계열 재개는 비효율적입니다.

- 새 external corpus / external engine hint
- evaluator or opening 쪽의 새 신호
- exact / late bucket에서의 새로운 causal mechanism

즉 다음 세션의 초점은 **stage176 branch 재봉합**이 아니라,
새로운 신호를 가진 lane으로 넘어가는 것이 맞습니다.

### 방향 5. 다음 유력 lane은 stage154 baseline direct lane이다
다음 실험은 stage170/176 survivor 조합을 더 꼬는 것보다,
현재 실제 기준선인 stage154 main / both에 직접 붙는
**낮은 비용의 새 delta lane**이 가장 자연스럽습니다.

추천되는 형태는 아래와 같습니다.
- `stage154-main` 전용 short/mid 보정 미세 조정
- `stage154-both` 전용 late verif / gate 미세 조정
- evaluator / opening / exact-boundary 쪽의 새 외부 신호가 있으면 그쪽 우선

## 6. 결론
이번 review의 결론은 간단합니다.

1. stage176 결선 후보 둘은 모두 vanilla stage154 baseline을 넘지 못했다.
2. 실패 원인은 internal bracket overfitting, mixed-overlay coupling, throughput tax, stage154 plateau가 겹친 것으로 보는 해석이 가장 자연스럽다.
3. 따라서 Stage 182 closeout에서는 **option2(둘 다 폐기)**가 맞다.
4. 다음 방향은 stage176 mixed-overlay 재개가 아니라, **external-anchor early gate + base-specific low-overhead delta lane**으로 넘어가는 쪽이 맞다.

즉 이번 closeout은 단순히 “졌다”가 아니라,
**어떤 종류의 구조 overlay가 plateau를 넘지 못했는지까지 확인하고 다음 탐색 방향을 좁힌 단계**로 읽는 것이 가장 정확합니다.
