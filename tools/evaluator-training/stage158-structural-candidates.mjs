import {
  resolveMoveOrderingStructureProfile,
  resolveMpcStructureProfile,
} from '../../js/ai/search-structure-profiles.js';
import { resolveProjectPath, toPortablePath } from './lib.mjs';
import { STAGE157_STRUCTURAL_FAMILIES } from './stage157-structural-candidates.mjs';

export const STAGE158_STRUCTURAL_FAMILIES = STAGE157_STRUCTURAL_FAMILIES;

const CUSTOM_MOVE_ORDERING_STRUCTURE_PROFILES = Object.freeze({
  'stage151-latebank-aligned-v1': Object.freeze({
    key: 'stage151-latebank-aligned-v1',
    label: 'stage151 latebank aligned ordering',
    description: 'stage151용. late3 ordering pattern bank와 충돌을 줄이기 위해 linear 구조를 좁고 보수적으로 유지합니다.',
    priority: 90,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 3,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 650,
    frontierWeight: 450,
    shallowProbeEnabled: false,
    shallowProbeTopK: 0,
    shallowProbeMinEmpties: 11,
    shallowProbeMaxEmpties: 19,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 28,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage154-stable-quiet-v1': Object.freeze({
    key: 'stage154-stable-quiet-v1',
    label: 'stage154 stable/quiet ordering',
    description: 'stage154용. Edax식 안정성 편향과 Othello-sensei식 quiet/edge endpoint 신호를 late ordering에 추가합니다.',
    priority: 100,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 5,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 1050,
    frontierWeight: 650,
    stabilityBoundWeight: 2400,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 26,
    quietMoveWeight: 13000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 28,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 9500,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 30,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage154-stable-quiet-probe-v1': Object.freeze({
    key: 'stage154-stable-quiet-probe-v1',
    label: 'stage154 stable/quiet probe ordering',
    description: 'stage154용. stable/quiet ordering 위에 top-K reduced-depth probe를 얹습니다.',
    priority: 101,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 5,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 1050,
    frontierWeight: 650,
    stabilityBoundWeight: 2400,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 26,
    quietMoveWeight: 13000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 28,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 9500,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 30,
    shallowProbeEnabled: true,
    shallowProbeTopK: 2,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 22,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 34,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage151-stable-quiet-noend-v1': Object.freeze({
    key: 'stage151-stable-quiet-noend-v1',
    label: 'stage151 noend stable/quiet ordering',
    description: 'stage151용. 7-19 ordering PB와 겹치지 않도록 quiet/stability bias를 보수적으로 얹습니다.',
    priority: 110,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 3,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 700,
    frontierWeight: 450,
    stabilityBoundWeight: 1800,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 22,
    quietMoveWeight: 8000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 24,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 6000,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 26,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage151-stable-quiet-latea-v1': Object.freeze({
    key: 'stage151-stable-quiet-latea-v1',
    label: 'stage151 latea stable/quiet ordering',
    description: 'stage151 latea(13-19) window 전용으로 quiet/stability bias를 더 가볍게 둡니다.',
    priority: 111,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 3,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 500,
    frontierWeight: 350,
    stabilityBoundWeight: 1600,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 20,
    quietMoveWeight: 7000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 22,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 5000,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 24,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage151-linear-quiet-v1': Object.freeze({
    key: 'stage151-linear-quiet-v1',
    label: 'stage151 linear quiet ordering',
    description: 'stage151용. ordering PB를 전면에 두되 quiet/edge/stability 보조 신호만 남깁니다.',
    priority: 112,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: null,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 0,
    frontierWeight: 0,
    stabilityBoundWeight: 1400,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 20,
    quietMoveWeight: 6000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 22,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 4500,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 24,
    exactFastestFirstMode: 'square-parity-reply',
  }),
});

const CUSTOM_MPC_STRUCTURE_PROFILES = Object.freeze({
  'stage151-latebank-conservative-v1': Object.freeze({
    key: 'stage151-latebank-conservative-v1',
    label: 'stage151 latebank conservative MPC',
    description: 'stage151용. ordering pattern bank가 살아 있을 때 tactical node를 과도하게 자르지 않도록 high-only로 둡니다.',
    priority: 90,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.84,
    staticEvalGateScaleLow: 0.88,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 18,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 9,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
  }),
  'stage154-zebra-guarded-v1': Object.freeze({
    key: 'stage154-zebra-guarded-v1',
    label: 'stage154 guarded zebra MPC',
    description: 'stage154용. Zebra식 shallow ladder 선호 + static gate/volatility/verification을 결합합니다.',
    priority: 100,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.84,
    staticEvalGateScaleLow: 0.88,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 9,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
  }),
  'stage154-zebra-open-v1': Object.freeze({
    key: 'stage154-zebra-open-v1',
    label: 'stage154 open zebra MPC',
    description: 'stage154용. Zebra식 ladder selection이 실제 probe까지 더 자주 내려가도록 volatility guard를 느슨하게 둡니다.',
    priority: 100,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.86,
    staticEvalGateScaleLow: 0.9,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 30,
    volatilityMaxLegalMoves: 12,
    volatilitySkipCornerAvailable: false,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
  }),
  'stage154-zebra-both-v1': Object.freeze({
    key: 'stage154-zebra-both-v1',
    label: 'stage154 guarded zebra both MPC',
    description: 'stage154용. Zebra식 ladder selection 위에 양방향 cutoff를 얹은 공격 후보입니다.',
    priority: 101,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.9,
    staticEvalGateScaleLow: 0.96,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 10,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.2,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
    runtimeOverrides: {
      enableHighCut: true,
      enableLowCut: true,
      maxWindow: 2,
      maxChecksPerNode: 2,
    },
  }),
  'stage151-zebra-guarded-v1': Object.freeze({
    key: 'stage151-zebra-guarded-v1',
    label: 'stage151 guarded zebra MPC',
    description: 'stage151용. Zebra식 ladder selection을 쓰되 late ordering PB tacticality를 고려해 high-only로 둡니다.',
    priority: 110,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.83,
    staticEvalGateScaleLow: 0.88,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 40,
    volatilityMaxLegalMoves: 8,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
  }),
  'stage151-zebra-open-v1': Object.freeze({
    key: 'stage151-zebra-open-v1',
    label: 'stage151 open zebra MPC',
    description: 'stage151용. Zebra식 ladder selection이 실제 probe까지 더 자주 내려가도록 guard를 살짝 완화합니다.',
    priority: 110,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.84,
    staticEvalGateScaleLow: 0.9,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 28,
    volatilityMaxLegalMoves: 11,
    volatilitySkipCornerAvailable: false,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
  }),
  'stage151-zebra-both-v1': Object.freeze({
    key: 'stage151-zebra-both-v1',
    label: 'stage151 guarded zebra both MPC',
    description: 'stage151용. Zebra식 ladder selection에 양방향 cutoff를 더하되 guard를 유지합니다.',
    priority: 111,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.89,
    staticEvalGateScaleLow: 0.96,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 40,
    volatilityMaxLegalMoves: 8,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.2,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
    runtimeOverrides: {
      enableHighCut: true,
      enableLowCut: true,
      maxWindow: 2,
      maxChecksPerNode: 2,
    },
  }),
});

function makePatternBankWindow(minEmpties, maxEmpties, scale = 1) {
  return Object.freeze({
    moveOrderingPatternBankScale: scale,
    moveOrderingPatternBankMinEmpties: minEmpties,
    moveOrderingPatternBankMaxEmpties: maxEmpties,
  });
}


const STAGE158_ACTIVE_MAINLINE_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's154-control',
    familyKey: 'stage154-main-recenter',
    priority: 0,
    tier: 'control',
    risk: 'low',
    moveOrderingStructureProfile: 'baseline-v1',
    mpcStructureProfile: 'baseline-v1',
    notes: 'stage154 control lane.',
  }),
  Object.freeze({
    key: 's154-stable-zebra',
    familyKey: 'stage154-main-recenter',
    priority: 4,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage154-stable-quiet-v1',
    mpcStructureProfile: 'stage154-zebra-guarded-v1',
    notes: 'stage158 survivor candidate. stable/quiet ordering + Zebra ladder MPC. Reinforced retest 후 채택됐지만, stage157 survivor들과의 후속 처리 결정은 다음 session으로 넘깁니다.',
  }),
]);

const STAGE158_RETIRED_MAINLINE_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's154-anchor-main',
    familyKey: 'stage154-main-recenter',
    priority: 1,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'hybrid-main-v1',
    mpcStructureProfile: 'conservative-hybrid-v1',
    notes: 'stage157 anchor. Hybrid main + conservative MPC. Stage158 direct-pair에서는 비채택으로 정리된 retired mainline candidate입니다.',
  }),
  Object.freeze({
    key: 's154-stable-quiet',
    familyKey: 'stage154-main-recenter',
    priority: 2,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage154-stable-quiet-v1',
    mpcStructureProfile: 'conservative-hybrid-v1',
    notes: 'Edax/Othello-sensei 힌트를 ordering에만 주입한 분리 후보. Stage158 direct-pair에서는 비채택으로 정리된 retired mainline candidate입니다.',
  }),
  Object.freeze({
    key: 's154-stable-quiet-probe',
    familyKey: 'stage154-main-recenter',
    priority: 3,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage154-stable-quiet-probe-v1',
    mpcStructureProfile: 'conservative-hybrid-v1',
    notes: 'stable/quiet ordering + top-K probe. Reinforced retest까지 마친 뒤 비채택으로 닫은 retired mainline candidate입니다.',
  }),
  Object.freeze({
    key: 's154-stable-zebra-open',
    familyKey: 'stage154-main-recenter',
    priority: 5,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage154-stable-quiet-v1',
    mpcStructureProfile: 'stage154-zebra-open-v1',
    notes: 'Zebra ladder가 representative smoke에서도 실제로 probe selection까지 내려가도록 guard를 다소 연 후보. Stage158 direct-pair에서는 비채택으로 정리된 retired mainline candidate입니다.',
  }),
  Object.freeze({
    key: 's154-zebra-both-probe',
    familyKey: 'stage154-main-recenter',
    priority: 5,
    tier: 'aggressive',
    risk: 'high',
    moveOrderingStructureProfile: 'stage154-stable-quiet-probe-v1',
    mpcStructureProfile: 'stage154-zebra-both-v1',
    notes: '구조 최고공격 후보. Reinforced retest까지 마친 뒤 비채택으로 닫은 retired mainline candidate입니다.',
  }),
]);

const STAGE158_DEFERRED_LATE3_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's151-control-full',
    familyKey: 'stage151-split-late3',
    priority: 0,
    tier: 'control',
    risk: 'low',
    moveOrderingStructureProfile: 'baseline-v1',
    mpcStructureProfile: 'baseline-v1',
    engineOptions: makePatternBankWindow(0, 19, 1),
    notes: 'stage151 control. ordering PB full.',
  }),
  Object.freeze({
    key: 's151-anchor-noend',
    familyKey: 'stage151-split-late3',
    priority: 1,
    tier: 'balanced',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-latebank-aligned-v1',
    mpcStructureProfile: 'stage151-latebank-conservative-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'stage157 anchor. noend + aligned ordering + conservative MPC.',
  }),
  Object.freeze({
    key: 's151-noend-stable-quiet',
    familyKey: 'stage151-split-late3',
    priority: 2,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage151-stable-quiet-noend-v1',
    mpcStructureProfile: 'stage151-latebank-conservative-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'noend 위에 quiet/stability signal을 가볍게 추가합니다.',
  }),
  Object.freeze({
    key: 's151-noend-stable-zebra',
    familyKey: 'stage151-split-late3',
    priority: 3,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage151-stable-quiet-noend-v1',
    mpcStructureProfile: 'stage151-zebra-guarded-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'stage151 신규 주력 후보. noend + quiet/stability + Zebra ladder MPC.',
  }),
  Object.freeze({
    key: 's151-noend-stable-zebra-open',
    familyKey: 'stage151-split-late3',
    priority: 4,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage151-stable-quiet-noend-v1',
    mpcStructureProfile: 'stage151-zebra-open-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'Zebra ladder가 representative smoke에서도 실제 probe selection까지 내려가도록 guard를 약간 완화한 noend 후보.',
  }),
  Object.freeze({
    key: 's151-latea-stable-zebra',
    familyKey: 'stage151-split-late3',
    priority: 4,
    tier: 'safe',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-stable-quiet-latea-v1',
    mpcStructureProfile: 'stage151-zebra-guarded-v1',
    engineOptions: makePatternBankWindow(13, 19, 1),
    notes: '13-19 latea만 남겼을 때도 quiet/stability + Zebra 조합이 살아나는지 확인합니다.',
  }),
  Object.freeze({
    key: 's151-linear-quiet-off',
    familyKey: 'stage151-split-late3',
    priority: 5,
    tier: 'safe',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-linear-quiet-v1',
    mpcStructureProfile: 'stage151-zebra-guarded-v1',
    engineOptions: makePatternBankWindow(0, 19, 0),
    notes: 'ordering PB를 꺼도 quiet/stability + Zebra 보조 구조만으로 이점이 남는지 확인합니다.',
  }),
  Object.freeze({
    key: 's151-noend-zebra-both',
    familyKey: 'stage151-split-late3',
    priority: 6,
    tier: 'aggressive',
    risk: 'high',
    moveOrderingStructureProfile: 'stage151-stable-quiet-noend-v1',
    mpcStructureProfile: 'stage151-zebra-both-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'stage151 최고공격 후보. noend + quiet/stability + guarded both MPC.',
  }),
]);

const STAGE158_STRUCTURAL_CANDIDATES = Object.freeze([
  ...STAGE158_ACTIVE_MAINLINE_CANDIDATES,
  ...STAGE158_DEFERRED_LATE3_CANDIDATES,
  ...STAGE158_RETIRED_MAINLINE_CANDIDATES,
]);

const STAGE158_RETIRED_MAINLINE_CANDIDATE_KEY_SET = new Set(
  STAGE158_RETIRED_MAINLINE_CANDIDATES.map((candidate) => candidate.key),
);

function resolveStructureProfile(source, customProfiles, resolveBuiltin) {
  if (typeof source === 'string' && Object.hasOwn(customProfiles, source)) {
    return resolveBuiltin(customProfiles[source]);
  }
  return resolveBuiltin(source);
}

function mergeEngineOptions(...optionBlocks) {
  const merged = optionBlocks
    .filter(Boolean)
    .reduce((accumulator, block) => ({ ...accumulator, ...block }), {});
  return Object.keys(merged).length > 0 ? Object.freeze(merged) : null;
}

export function listStage158StructuralCandidates({ familyKey = null, includeAggressive = true, includeRetired = false } = {}) {
  return STAGE158_STRUCTURAL_CANDIDATES.filter((candidate) => {
    if (!includeRetired && STAGE158_RETIRED_MAINLINE_CANDIDATE_KEY_SET.has(candidate.key)) {
      return false;
    }
    if (familyKey && candidate.familyKey !== familyKey) {
      return false;
    }
    if (!includeAggressive && candidate.tier === 'aggressive') {
      return false;
    }
    return true;
  }).map((candidate) => resolveStage158StructuralCandidate(candidate.key, { allowRetired: includeRetired }));
}

export function resolveStage158StructuralCandidate(candidateKey, { allowRetired = false } = {}) {
  const rawCandidate = STAGE158_STRUCTURAL_CANDIDATES.find((candidate) => candidate.key === candidateKey);
  if (!rawCandidate) {
    throw new Error(`Unknown stage158 structural candidate: ${candidateKey}`);
  }
  if (!allowRetired && STAGE158_RETIRED_MAINLINE_CANDIDATE_KEY_SET.has(rawCandidate.key)) {
    throw new Error(`Retired stage158 structural candidate: ${candidateKey}`);
  }
  const family = STAGE158_STRUCTURAL_FAMILIES[rawCandidate.familyKey];
  if (!family) {
    throw new Error(`Unknown stage158 structural family: ${rawCandidate.familyKey}`);
  }

  const moveOrderingStructureProfile = resolveStructureProfile(
    rawCandidate.moveOrderingStructureProfile,
    CUSTOM_MOVE_ORDERING_STRUCTURE_PROFILES,
    resolveMoveOrderingStructureProfile,
  );
  const mpcStructureProfile = resolveStructureProfile(
    rawCandidate.mpcStructureProfile,
    CUSTOM_MPC_STRUCTURE_PROFILES,
    resolveMpcStructureProfile,
  );
  const engineOptions = mergeEngineOptions(family.defaultEngineOptions, rawCandidate.engineOptions ?? null);
  const moduleAbsolutePath = resolveProjectPath(...family.modulePath.split('/'));

  return Object.freeze({
    ...rawCandidate,
    retired: STAGE158_RETIRED_MAINLINE_CANDIDATE_KEY_SET.has(rawCandidate.key),
    family,
    modulePath: family.modulePath,
    moduleAbsolutePath,
    moveOrderingStructureProfile,
    mpcStructureProfile,
    engineOptions,
  });
}

export function buildStage158StructuralEngineOptions(candidateKey, { allowRetired = false } = {}) {
  const candidate = resolveStage158StructuralCandidate(candidateKey, { allowRetired });
  return Object.freeze({
    ...(candidate.engineOptions ?? {}),
    moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
    mpcStructureProfile: candidate.mpcStructureProfile,
  });
}

export function summarizeStage158StructuralCandidate(candidateKey, { allowRetired = false } = {}) {
  const candidate = resolveStage158StructuralCandidate(candidateKey, { allowRetired });
  return Object.freeze({
    key: candidate.key,
    familyKey: candidate.familyKey,
    familyLabel: candidate.family.label,
    priority: candidate.priority,
    tier: candidate.tier,
    risk: candidate.risk,
    retired: candidate.retired,
    modulePath: toPortablePath(candidate.modulePath),
    moveOrderingStructureProfileKey: candidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: candidate.mpcStructureProfile?.key ?? null,
    engineOptions: candidate.engineOptions ?? null,
    notes: candidate.notes,
  });
}

export const STAGE158_ACTIVE_MAINLINE_CANDIDATE_KEYS = Object.freeze(
  STAGE158_ACTIVE_MAINLINE_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE158_RETIRED_MAINLINE_CANDIDATE_KEYS = Object.freeze(
  STAGE158_RETIRED_MAINLINE_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE158_DEFERRED_LATE3_CANDIDATE_KEYS = Object.freeze(
  STAGE158_DEFERRED_LATE3_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE158_STRUCTURAL_CANDIDATE_KEYS = Object.freeze(
  STAGE158_STRUCTURAL_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE158_ACTIVE_MAINLINE_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE158_ACTIVE_MAINLINE_CANDIDATE_KEYS.map((key) => summarizeStage158StructuralCandidate(key)),
);

export const STAGE158_RETIRED_MAINLINE_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE158_RETIRED_MAINLINE_CANDIDATE_KEYS.map((key) => summarizeStage158StructuralCandidate(key, { allowRetired: true })),
);

export const STAGE158_STRUCTURAL_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE158_STRUCTURAL_CANDIDATE_KEYS.map((key) => summarizeStage158StructuralCandidate(key, { allowRetired: true })),
);
