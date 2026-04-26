const STAGE176_ROUND_ROBIN_DEFAULT = Object.freeze({
  perConditionRounds: 6,
  rationale: 'round8~10 direct head-to-head가 19:17 또는 18:18 수준의 plateau로 수렴했으므로, 4라운드는 너무 거칠고 8라운드는 primary queue 확인 단계에서는 과합니다. 다음 풀리그 기본값은 6라운드/조건으로 둡니다.',
  escalateToEightWhen: 'overall gap이 ±2 이내이거나, 특정 시간대에서 sign flip/near-draw가 재발할 때',
});

const STAGE176_SURVIVOR_OPTIMIZATION_LANES = Object.freeze([
  Object.freeze({
    laneKey: 'wide-zebra',
    currentCandidateKey: 's170-main-wide-zebra',
    currentStatus: 'adopted_provisional_leader',
    diagnosis: '80ms short-think는 가장 강하지만, `s157-main-assertive-both` direct match에서 160ms를 내주고 240ms takeover가 없습니다. 개선 포인트는 ordering이 아니라 MPC mid-think calibration 쪽이 우선입니다.',
    evidence: Object.freeze({
      stage170BaselineVerdict: 'reinforced adopted',
      headToHeadVsAssertiveBoth: '17:19 with wide-zebra perspective = 승리 -> 패배 -> 동률',
      headToHeadVsFrontierBothlite: '17:19 with wide-zebra perspective = 승리 -> 동률 -> 동률',
    }),
    primaryBranches: Object.freeze([
      Object.freeze({
        key: 's176-main-wide-zebra-bothlite',
        status: 'confirmed_primary',
        changeAxis: 'mpc',
        sourceIdentity: 'keep `wide-hybrid-v1` ordering, replace guarded Zebra MPC with `stage170-frontier-zebra-bothlite-v1`',
        hypothesis: '160ms 약세를 줄이면서 80ms 우세를 최대한 유지합니다.',
        whyNow: 'frontier lane에서는 both-lite MPC가 실제로 stronger-baseline 160ms 음수를 지우고 채택까지 연결됐습니다.',
        openCondition: '다음 풀리그 round1에 바로 투입',
      }),
    ]),
    contingencyBranches: Object.freeze([
      Object.freeze({
        key: 's176-main-wide-zebra-midtrim',
        status: 'confirmed_contingency',
        changeAxis: 'ordering',
        sourceIdentity: 'keep guarded Zebra MPC, but trim `wide-hybrid` width one notch (top-K/probe/window midtrim custom profile planned)',
        hypothesis: '80ms edge를 유지하면서 160ms sign flip을 줄입니다.',
        whyNow: 'primary both-lite swap이 80ms edge를 잃거나 long-think을 흐리게 만들 때만 엽니다.',
        openCondition: '`s176-main-wide-zebra-bothlite`가 non-negative지만 80ms cost가 커지거나 overall 이득이 사라질 때',
      }),
    ]),
    exhaustedWhen: 'both-lite swap과 midtrim ordering이 모두 실패하면, 현재 wide-zebra lane은 사실상 구조 고점에 도달한 것으로 봅니다.',
  }),
  Object.freeze({
    laneKey: 'assertive-both',
    currentCandidateKey: 's157-main-assertive-both',
    currentStatus: 'adopted_challenger',
    diagnosis: 'long-think non-collapse와 throughput은 좋지만, `s170-main-wide-zebra` direct match에서 80ms short-think를 내줍니다. 개선 포인트는 MPC를 더 세게 여는 것이 아니라 ordering의 초반 폭을 넓혀 fast lane 대응력을 올리는 쪽입니다.',
    evidence: Object.freeze({
      stage170AnchorStatus: 'historical exact-match adopted anchor',
      headToHeadVsWideZebra: '19:17 from opponent perspective, assertive-both loses at 80ms, wins at 160ms, draws at 240ms',
      headToHeadVsFrontierBothlite: '18:18 exact draw while keeping throughput lead',
    }),
    primaryBranches: Object.freeze([
      Object.freeze({
        key: 's176-main-wide-assertive',
        status: 'confirmed_primary',
        changeAxis: 'ordering',
        sourceIdentity: 'replace `hybrid-probe-v1` with `wide-hybrid-v1`, keep `assertive-both-v1` MPC',
        hypothesis: '80ms deficit를 메우면서 기존 160/240ms 안정성을 최대한 유지합니다.',
        whyNow: '현재 assertive lane의 약점은 short-think ordering 폭 부족으로 해석하는 것이 가장 자연스럽고, MPC 자체는 이미 long-think 안정성을 입증했습니다.',
        openCondition: '다음 풀리그 round1에 바로 투입',
      }),
    ]),
    contingencyBranches: Object.freeze([
      Object.freeze({
        key: 's176-main-assertive-both-lite',
        status: 'confirmed_contingency',
        changeAxis: 'mpc',
        sourceIdentity: 'keep `hybrid-probe-v1`, but moderate `assertive-both` one notch (checks/window/gate tightening custom MPC planned)',
        hypothesis: 'wide ordering이 과적합되거나 160/240ms를 해치면, MPC aggressiveness를 소폭 낮춰 short-think 손실 없이 균형점을 찾습니다.',
        whyNow: '현재는 throughput과 long-think가 이미 좋아, MPC-lite는 backup path로만 보관하는 편이 맞습니다.',
        openCondition: '`s176-main-wide-assertive`가 80ms 개선 없이 mid/long trade-off만 만들 때',
      }),
    ]),
    exhaustedWhen: 'wide-assertive와 assertive-both-lite가 둘 다 실패하면, assertive lane은 이미 자신의 최고 고점 부근에 있다고 보는 것이 타당합니다.',
  }),
  Object.freeze({
    laneKey: 'frontier-bothlite',
    currentCandidateKey: 's170-main-frontier-zebra-bothlite',
    currentStatus: 'adopted_challenger',
    diagnosis: 'mid/long-think는 안정적이고 `s157-main-assertive-both`와도 exact draw지만, `s170-main-wide-zebra`에게 80ms를 내주고 throughput도 밀립니다. 개선 포인트는 MPC가 아니라 ordering에 아주 작은 short-think assist를 더하는 것입니다.',
    evidence: Object.freeze({
      baselineVerdict: 'round7 re-entry adopted successor',
      headToHeadVsWideZebra: '17:19 with wide-zebra perspective = 승리 -> 동률 -> 동률',
      headToHeadVsAssertiveBoth: '18:18 exact draw, but throughput trails',
    }),
    primaryBranches: Object.freeze([
      Object.freeze({
        key: 's176-main-frontier-bothlite-parity',
        status: 'confirmed_primary',
        changeAxis: 'ordering',
        sourceIdentity: 'keep both-lite MPC, add only exact parity/square-class tie-break to frontier ordering (custom frontier-parity profile planned)',
        hypothesis: '80ms 약세를 거의 공짜 비용으로 줄이고, 160/240ms draw 성격을 유지합니다.',
        whyNow: '직전 ordering stabilization branch는 너무 무거웠고 실패했습니다. 이번엔 TT gate/top-K 없이 가장 싼 tie-break만 여는 쪽이 맞습니다.',
        openCondition: '다음 풀리그 round1에 바로 투입',
      }),
    ]),
    contingencyBranches: Object.freeze([
      Object.freeze({
        key: 's176-main-frontier-bothlite-topk2',
        status: 'confirmed_contingency',
        changeAxis: 'ordering',
        sourceIdentity: 'if parity-only is insufficient, add tiny lightweight top-K (2) without probe/TT stabilization',
        hypothesis: 'parity-only가 무효일 때만 short-think 보조를 한 단계 더 줍니다.',
        whyNow: 'stabilized branch의 실패를 고려하면, ordering 보강은 반드시 한 단계씩만 늘려야 합니다.',
        openCondition: '`s176-main-frontier-bothlite-parity`가 80ms를 못 고치고 overall도 그대로일 때',
      }),
    ]),
    exhaustedWhen: 'parity-only와 tiny-topK 둘 다 실패하면, frontier-bothlite lane은 현재 구조상 plateau 상단에 도달한 것으로 정리할 수 있습니다.',
  }),
]);

function summarizeLane(lane) {
  return Object.freeze({
    laneKey: lane.laneKey,
    currentCandidateKey: lane.currentCandidateKey,
    currentStatus: lane.currentStatus,
    primaryBranchKeys: lane.primaryBranches.map((branch) => branch.key),
    contingencyBranchKeys: lane.contingencyBranches.map((branch) => branch.key),
    diagnosis: lane.diagnosis,
    exhaustedWhen: lane.exhaustedWhen,
  });
}

export function listStage176SurvivorOptimizationLanes() {
  return STAGE176_SURVIVOR_OPTIMIZATION_LANES.map((lane) => lane);
}

export function summarizeStage176SurvivorOptimizationLanes() {
  return STAGE176_SURVIVOR_OPTIMIZATION_LANES.map((lane) => summarizeLane(lane));
}

export function getStage176SurvivorRoundRobinBudget() {
  const lanes = STAGE176_SURVIVOR_OPTIMIZATION_LANES;
  const primaryCounts = lanes.map((lane) => lane.primaryBranches.length);
  const contingencyCounts = lanes.map((lane) => lane.contingencyBranches.length);
  const confirmedPrimaryRounds = Math.max(...primaryCounts, 0);
  const confirmedUpperBoundRounds = Math.max(
    ...lanes.map((lane) => lane.primaryBranches.length + lane.contingencyBranches.length),
    0,
  );

  return Object.freeze({
    laneCount: lanes.length,
    confirmedPrimaryRounds,
    confirmedUpperBoundRounds,
    recommendation: STAGE176_ROUND_ROBIN_DEFAULT,
    interpretation: confirmedPrimaryRounds === 1
      ? '현재 확정된 primary branch만 기준으로 보면, 다음 세션의 풀리그 round-robin 1회면 세 lane을 모두 한 번씩 업데이트할 수 있습니다.'
      : '현재 backlog 기준으로 primary branch 소진에는 복수 라운드가 필요합니다.',
    interpretationUpperBound: confirmedUpperBoundRounds <= 2
      ? 'contingency까지 열어도 현재 확인된 범위 안에서는 2회 풀리그 이내에 대부분의 lane을 소진할 수 있습니다.'
      : 'contingency까지 모두 열면 2회 이상 풀리그가 필요합니다.',
  });
}

export const STAGE176_SURVIVOR_OPTIMIZATION_BACKLOG = STAGE176_SURVIVOR_OPTIMIZATION_LANES;
export const STAGE176_SURVIVOR_OPTIMIZATION_SUMMARY = Object.freeze(summarizeStage176SurvivorOptimizationLanes());
export const STAGE176_SURVIVOR_ROUND_ROBIN_BUDGET = Object.freeze(getStage176SurvivorRoundRobinBudget());
