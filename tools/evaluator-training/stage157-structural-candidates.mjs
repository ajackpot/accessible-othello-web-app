import {
  resolveMoveOrderingStructureProfile,
  resolveMpcStructureProfile,
} from '../../js/ai/search-structure-profiles.js';
import { resolveProjectPath, toPortablePath } from './lib.mjs';

export const STAGE157_STRUCTURAL_FAMILIES = Object.freeze({
  'stage154-main-recenter': Object.freeze({
    key: 'stage154-main-recenter',
    label: 'stage154 main_recenter',
    modulePath: 'tools/evaluator-training/out/stage154/modules/learned-eval-profile.main_only.recenter.factorized.generated.js',
    priority: 1,
    notes: 'Ordering pattern bank가 없으므로 구조 쪽에서 late top-K/probe를 더 공격적으로 실험할 수 있습니다.',
    defaultEngineOptions: Object.freeze({}),
  }),
  'stage151-split-late3': Object.freeze({
    key: 'stage151-split-late3',
    label: 'stage151 split_late3',
    modulePath: 'tools/evaluator-training/out/stage151/learned-eval-profile.split_late3.factorized.generated.js',
    priority: 2,
    notes: 'late3 ordering pattern bank가 이미 있으므로 linear/probe 구조는 더 보수적으로 겹침을 피하는 쪽이 기본입니다.',
    defaultEngineOptions: Object.freeze({
      moveOrderingPatternBankMinEmpties: 0,
      moveOrderingPatternBankMaxEmpties: 19,
      moveOrderingPatternBankScale: 1,
    }),
  }),
});

const CUSTOM_STAGE151_MOVE_ORDERING_STRUCTURE_PROFILES = Object.freeze({
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
  'stage151-latebank-probe-v1': Object.freeze({
    key: 'stage151-latebank-probe-v1',
    label: 'stage151 latebank probe ordering',
    description: 'stage151용. ordering pattern bank가 켜진 late 구간에서만 1개 후보 shallow probe를 추가합니다.',
    priority: 91,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 3,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 650,
    frontierWeight: 450,
    shallowProbeEnabled: true,
    shallowProbeTopK: 1,
    shallowProbeMinEmpties: 11,
    shallowProbeMaxEmpties: 19,
    shallowProbeMinDepthRemaining: 7,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 26,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage151-linearizer-v1': Object.freeze({
    key: 'stage151-linearizer-v1',
    label: 'stage151 linearizer ordering',
    description: 'stage151용. TT depth gate와 exact parity만 남겨 ordering pattern bank의 late 신호를 상대적으로 전면에 둡니다.',
    priority: 92,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: null,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 0,
    frontierWeight: 0,
    shallowProbeEnabled: false,
    shallowProbeTopK: 0,
    shallowProbeMinEmpties: 11,
    shallowProbeMaxEmpties: 19,
    shallowProbeMinDepthRemaining: 7,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 26,
    exactFastestFirstMode: 'square-parity-reply',
  }),
});

const CUSTOM_STAGE151_MPC_STRUCTURE_PROFILES = Object.freeze({
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
  'stage151-both-guarded-v1': Object.freeze({
    key: 'stage151-both-guarded-v1',
    label: 'stage151 guarded both-side MPC',
    description: 'stage151용. low-cut도 보되 volatility guard와 verification으로 tactical late nodes를 보수적으로 보호합니다.',
    priority: 91,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.9,
    staticEvalGateScaleLow: 0.97,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 18,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 9,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.2,
    verificationDepthOffset: 1,
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

const STAGE157_ACTIVE_MAINLINE_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's157-main-control',
    legacyAliases: Object.freeze(['s154-control']),
    familyKey: 'stage154-main-recenter',
    priority: 0,
    tier: 'control',
    risk: 'low',
    moveOrderingStructureProfile: 'baseline-v1',
    mpcStructureProfile: 'baseline-v1',
    notes: 'stage154 control lane. 구조 변경 없이 현재 family module만 확인합니다.',
  }),
  Object.freeze({
    key: 's157-main-wide-hybrid',
    legacyAliases: Object.freeze(['s154-wide-hybrid']),
    familyKey: 'stage154-main-recenter',
    priority: 5,
    tier: 'aggressive',
    risk: 'medium',
    moveOrderingStructureProfile: 'wide-hybrid-v1',
    mpcStructureProfile: 'verify-tight-v1',
    notes: 'Ordering pattern bank가 없는 stage154에서만 넓은 top-K + probe를 시도하는 stage157 closeout 채택 후보.',
  }),
  Object.freeze({
    key: 's157-main-frontier-gate',
    legacyAliases: Object.freeze(['s154-frontier-gate']),
    familyKey: 'stage154-main-recenter',
    priority: 7,
    tier: 'safe',
    risk: 'low',
    moveOrderingStructureProfile: 'late-potential-frontier-v1',
    mpcStructureProfile: 'static-gate-v1',
    notes: 'Egaroucid/Hanshq 류 cheap signal만 남긴 stage157 closeout 채택 후보.',
  }),
  Object.freeze({
    key: 's157-main-assertive-both',
    legacyAliases: Object.freeze(['s154-assertive-both']),
    familyKey: 'stage154-main-recenter',
    priority: 9,
    tier: 'aggressive',
    risk: 'high',
    moveOrderingStructureProfile: 'hybrid-probe-v1',
    mpcStructureProfile: 'assertive-both-v1',
    notes: 'library 최고공격 후보. stage157 closeout에서는 long-think non-collapse형 채택으로 정리됐습니다.',
  }),
]);

const STAGE157_DEFERRED_LATE3_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's157-late3-control-full',
    legacyAliases: Object.freeze(['s151-control-full']),
    familyKey: 'stage151-split-late3',
    priority: 0,
    tier: 'control',
    risk: 'low',
    moveOrderingStructureProfile: 'baseline-v1',
    mpcStructureProfile: 'baseline-v1',
    engineOptions: makePatternBankWindow(0, 19, 1),
    notes: 'stage151 control. ordering pattern bank full range 그대로.',
  }),
  Object.freeze({
    key: 's157-late3-anchor-full',
    legacyAliases: Object.freeze(['s151-main-full']),
    familyKey: 'stage151-split-late3',
    priority: 1,
    tier: 'balanced',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-latebank-aligned-v1',
    mpcStructureProfile: 'stage151-latebank-conservative-v1',
    engineOptions: makePatternBankWindow(0, 19, 1),
    notes: 'stage157 late3 full anchor. full ordering PB를 유지하되 linear/probe 구조는 가볍게 얹습니다.',
  }),
  Object.freeze({
    key: 's157-late3-anchor-noend',
    legacyAliases: Object.freeze(['s151-noend-main']),
    familyKey: 'stage151-split-late3',
    priority: 2,
    tier: 'balanced',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-latebank-aligned-v1',
    mpcStructureProfile: 'stage151-latebank-conservative-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'stage157 late3 noend anchor. 0-6 ordering PB를 끄고 7-19만 유지하는 noend 시뮬레이션.',
  }),
  Object.freeze({
    key: 's157-late3-anchor-latea',
    legacyAliases: Object.freeze(['s151-latea-main']),
    familyKey: 'stage151-split-late3',
    priority: 3,
    tier: 'safe',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-latebank-aligned-v1',
    mpcStructureProfile: 'stage151-latebank-conservative-v1',
    engineOptions: makePatternBankWindow(13, 19, 1),
    notes: 'stage157 late3 latea anchor. 13-19 ordering PB만 남겨 late3가 정말 상단 bucket에서만 유효한지 봅니다.',
  }),
  Object.freeze({
    key: 's157-late3-noend-probe',
    legacyAliases: Object.freeze(['s151-probe-noend']),
    familyKey: 'stage151-split-late3',
    priority: 4,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingStructureProfile: 'stage151-latebank-probe-v1',
    mpcStructureProfile: 'stage151-latebank-conservative-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'noend + 1개 후보 shallow probe. probe ROI를 조심스럽게 확인합니다.',
  }),
  Object.freeze({
    key: 's157-late3-noend-linearizer',
    legacyAliases: Object.freeze(['s151-linearizer-noend']),
    familyKey: 'stage151-split-late3',
    priority: 5,
    tier: 'safe',
    risk: 'low',
    moveOrderingStructureProfile: 'stage151-linearizer-v1',
    mpcStructureProfile: 'static-gate-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'stage151에서는 ordering PB만 믿고 linear lane을 최대한 단순화하는 대조군.',
  }),
  Object.freeze({
    key: 's157-late3-linear-only',
    legacyAliases: Object.freeze(['s151-linear-only']),
    familyKey: 'stage151-split-late3',
    priority: 6,
    tier: 'balanced',
    risk: 'low',
    moveOrderingStructureProfile: 'hybrid-main-v1',
    mpcStructureProfile: 'conservative-hybrid-v1',
    engineOptions: makePatternBankWindow(0, 19, 0),
    notes: 'ordering PB를 완전히 끄고 family 평가기 + linear structure만 남긴 고립 실험.',
  }),
  Object.freeze({
    key: 's157-late3-noend-parity-verify',
    legacyAliases: Object.freeze(['s151-parity-verify']),
    familyKey: 'stage151-split-late3',
    priority: 7,
    tier: 'safe',
    risk: 'low',
    moveOrderingStructureProfile: 'exact-parity-reply-v1',
    mpcStructureProfile: 'verify-near-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'Thell/fast-first류 late exact ordering과 near verification을 조합한 후보.',
  }),
  Object.freeze({
    key: 's157-late3-noend-soft-both',
    legacyAliases: Object.freeze(['s151-soft-both-noend']),
    familyKey: 'stage151-split-late3',
    priority: 8,
    tier: 'aggressive',
    risk: 'high',
    moveOrderingStructureProfile: 'stage151-latebank-aligned-v1',
    mpcStructureProfile: 'stage151-both-guarded-v1',
    engineOptions: makePatternBankWindow(7, 19, 1),
    notes: 'noend 유지 + guarded both-side MPC. 공격 후보지만 full보다 tactical noise를 줄인 상태에서만 봅니다.',
  }),
  Object.freeze({
    key: 's157-late3-full-both',
    legacyAliases: Object.freeze(['s151-full-both']),
    familyKey: 'stage151-split-late3',
    priority: 9,
    tier: 'aggressive',
    risk: 'high',
    moveOrderingStructureProfile: 'stage151-latebank-probe-v1',
    mpcStructureProfile: 'stage151-both-guarded-v1',
    engineOptions: makePatternBankWindow(0, 19, 1),
    notes: 'full PB + guarded both-side MPC. stage151 최고공격 후보.',
  }),
]);

const STAGE157_STRUCTURAL_CANDIDATES = Object.freeze([
  ...STAGE157_ACTIVE_MAINLINE_CANDIDATES,
  ...STAGE157_DEFERRED_LATE3_CANDIDATES,
]);

const STAGE157_STRUCTURAL_CANDIDATE_ALIAS_MAP = Object.freeze(
  STAGE157_STRUCTURAL_CANDIDATES.reduce((accumulator, candidate) => {
    for (const alias of candidate.legacyAliases ?? []) {
      accumulator[alias] = candidate.key;
    }
    return accumulator;
  }, {}),
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

export function listStage157StructuralCandidates({ familyKey = null, includeAggressive = true } = {}) {
  return STAGE157_STRUCTURAL_CANDIDATES.filter((candidate) => {
    if (familyKey && candidate.familyKey !== familyKey) {
      return false;
    }
    if (!includeAggressive && candidate.tier === 'aggressive') {
      return false;
    }
    return true;
  }).map((candidate) => resolveStage157StructuralCandidate(candidate.key));
}

export function resolveStage157StructuralCandidate(candidateKey) {
  const canonicalKey = STAGE157_STRUCTURAL_CANDIDATE_ALIAS_MAP[candidateKey] ?? candidateKey;
  const rawCandidate = STAGE157_STRUCTURAL_CANDIDATES.find((candidate) => candidate.key === canonicalKey);
  if (!rawCandidate) {
    throw new Error(`Unknown stage157 structural candidate: ${candidateKey}`);
  }
  const family = STAGE157_STRUCTURAL_FAMILIES[rawCandidate.familyKey];
  if (!family) {
    throw new Error(`Unknown stage157 structural family: ${rawCandidate.familyKey}`);
  }

  const moveOrderingStructureProfile = resolveStructureProfile(
    rawCandidate.moveOrderingStructureProfile,
    CUSTOM_STAGE151_MOVE_ORDERING_STRUCTURE_PROFILES,
    resolveMoveOrderingStructureProfile,
  );
  const mpcStructureProfile = resolveStructureProfile(
    rawCandidate.mpcStructureProfile,
    CUSTOM_STAGE151_MPC_STRUCTURE_PROFILES,
    resolveMpcStructureProfile,
  );
  const engineOptions = mergeEngineOptions(family.defaultEngineOptions, rawCandidate.engineOptions ?? null);
  const moduleAbsolutePath = resolveProjectPath(...family.modulePath.split('/'));

  return Object.freeze({
    ...rawCandidate,
    family,
    modulePath: family.modulePath,
    moduleAbsolutePath,
    moveOrderingStructureProfile,
    mpcStructureProfile,
    engineOptions,
  });
}

export function buildStage157StructuralEngineOptions(candidateKey) {
  const candidate = resolveStage157StructuralCandidate(candidateKey);
  return Object.freeze({
    ...(candidate.engineOptions ?? {}),
    moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
    mpcStructureProfile: candidate.mpcStructureProfile,
  });
}

export function summarizeStage157StructuralCandidate(candidateKey) {
  const candidate = resolveStage157StructuralCandidate(candidateKey);
  return Object.freeze({
    key: candidate.key,
    familyKey: candidate.familyKey,
    familyLabel: candidate.family.label,
    priority: candidate.priority,
    tier: candidate.tier,
    risk: candidate.risk,
    modulePath: toPortablePath(candidate.modulePath),
    moveOrderingStructureProfileKey: candidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: candidate.mpcStructureProfile?.key ?? null,
    engineOptions: candidate.engineOptions ?? null,
    legacyAliases: candidate.legacyAliases ?? [],
    notes: candidate.notes,
  });
}

export const STAGE157_ACTIVE_MAINLINE_CANDIDATE_KEYS = Object.freeze(
  STAGE157_ACTIVE_MAINLINE_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE157_DEFERRED_LATE3_CANDIDATE_KEYS = Object.freeze(
  STAGE157_DEFERRED_LATE3_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE157_STRUCTURAL_CANDIDATE_ALIAS_ENTRIES = Object.freeze(
  Object.entries(STAGE157_STRUCTURAL_CANDIDATE_ALIAS_MAP),
);

export const STAGE157_STRUCTURAL_CANDIDATE_KEYS = Object.freeze(
  STAGE157_STRUCTURAL_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE157_STRUCTURAL_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE157_STRUCTURAL_CANDIDATE_KEYS.map((key) => summarizeStage157StructuralCandidate(key)),
);
