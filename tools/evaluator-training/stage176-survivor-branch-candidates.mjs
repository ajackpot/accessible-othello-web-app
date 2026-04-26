import {
  resolveMoveOrderingStructureProfile,
  resolveMpcStructureProfile,
} from '../../js/ai/search-structure-profiles.js';
import {
  STAGE157_STRUCTURAL_FAMILIES,
  resolveStage157StructuralCandidate,
} from './stage157-structural-candidates.mjs';
import { resolveStage158StructuralCandidate } from './stage158-structural-candidates.mjs';
import { resolveStage170SurvivorComboCandidate } from './stage170-survivor-combo-candidates.mjs';
import { resolveProjectPath, toPortablePath } from './lib.mjs';

const SOURCE_STAGE_RESOLVERS = Object.freeze({
  157: resolveStage157StructuralCandidate,
  158: resolveStage158StructuralCandidate,
  170: resolveStage170SurvivorComboCandidate,
});

const CUSTOM_STAGE176_MOVE_ORDERING_STRUCTURE_PROFILES = Object.freeze({
  'stage176-wide-midtrim-v1': Object.freeze({
    key: 'stage176-wide-midtrim-v1',
    label: 'stage176 wide midtrim ordering',
    description: 'wide-hybrid의 short-think 폭은 유지하되 160ms sign flip을 줄이기 위해 width/probe window를 한 단계 줄입니다.',
    priority: 140,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 5,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 1080,
    frontierWeight: 650,
    shallowProbeEnabled: true,
    shallowProbeTopK: 2,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 22,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 36,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage176-frontier-parity-v1': Object.freeze({
    key: 'stage176-frontier-parity-v1',
    label: 'stage176 frontier parity ordering',
    description: 'frontier ordering의 cheap signal은 그대로 두고 exact parity / square-class tie-break만 추가합니다.',
    priority: 141,
    potentialMobilityWeight: 950,
    frontierWeight: 700,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stage176-frontier-topk2-v1': Object.freeze({
    key: 'stage176-frontier-topk2-v1',
    label: 'stage176 frontier tiny-topk ordering',
    description: 'parity-only가 부족할 때만 frontier ordering에 tiny lightweight top-K(2)만 추가합니다.',
    priority: 142,
    lightweightEvalTopK: 2,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 950,
    frontierWeight: 700,
    exactFastestFirstMode: 'square-parity-reply',
  }),
});

const CUSTOM_STAGE176_MPC_STRUCTURE_PROFILES = Object.freeze({
  'stage176-assertive-both-lite-v1': Object.freeze({
    key: 'stage176-assertive-both-lite-v1',
    label: 'stage176 assertive-both lite MPC',
    description: 'assertive-both의 low-cut은 유지하되 gate/verification을 한 단계 타이트하게 돌려 mid/long trade-off를 줄입니다.',
    priority: 140,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.92,
    staticEvalGateScaleLow: 0.98,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.20,
    verificationDepthOffset: 1,
    runtimeOverrides: {
      enableHighCut: true,
      enableLowCut: true,
      maxChecksPerNode: 2,
      maxWindow: 2,
    },
  }),
});

const STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATES = Object.freeze([]);

const STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's176-main-wide-zebra-bothlite',
    familyKey: 'stage154-main-recenter',
    priority: 1,
    tier: 'aggressive',
    risk: 'medium',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-wide-hybrid' }),
    mpcSource: Object.freeze({ stage: 170, key: 's170-main-frontier-zebra-bothlite' }),
    notes: 'wide-zebra lane option1. Session 01에서 frontier lane 상대 개선은 있었지만 incumbent/anchor 상대 리드를 잃어 lane regression으로 정리된 historical-only candidate입니다.',
  }),
  Object.freeze({
    key: 's176-main-wide-zebra-midtrim',
    familyKey: 'stage154-main-recenter',
    priority: 2,
    tier: 'aggressive',
    risk: 'medium',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-wide-hybrid' }),
    moveOrderingStructureProfile: 'stage176-wide-midtrim-v1',
    mpcSource: Object.freeze({ stage: 158, key: 's154-stable-zebra' }),
    notes: 'wide-zebra lane contingency. Session 02에서는 locally adopted successor였지만 Session 03 carry-forward에서 밀려 결선에 오르지 못한 historical-only candidate입니다.',
  }),
  Object.freeze({
    key: 's176-main-wide-assertive',
    familyKey: 'stage154-main-recenter',
    priority: 3,
    tier: 'aggressive',
    risk: 'high',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-wide-hybrid' }),
    mpcSource: Object.freeze({ stage: 157, key: 's157-main-assertive-both' }),
    notes: 'assertive lane option1. Session 01 bridge pair에서 incumbent wide-zebra를 넘지 못해 primary branch에서 바로 비채택으로 닫힌 historical-only candidate입니다.',
  }),
  Object.freeze({
    key: 's176-main-assertive-both-lite',
    familyKey: 'stage154-main-recenter',
    priority: 4,
    tier: 'aggressive',
    risk: 'medium',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-assertive-both' }),
    mpcSource: Object.freeze({ stage: 157, key: 's157-main-assertive-both' }),
    mpcStructureProfile: 'stage176-assertive-both-lite-v1',
    notes: 'assertive lane contingency. Session 03 final candidate로 채택됐지만 Stage 181 trineutron finals에서 stage-154-main/stage-154-both 두 축 모두 vanilla baseline overall 음수로 정리돼 retired historical-only candidate입니다.',
  }),
  Object.freeze({
    key: 's176-main-frontier-bothlite-parity',
    familyKey: 'stage154-main-recenter',
    priority: 5,
    tier: 'safe',
    risk: 'low',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-frontier-gate' }),
    moveOrderingStructureProfile: 'stage176-frontier-parity-v1',
    mpcSource: Object.freeze({ stage: 170, key: 's170-main-frontier-zebra-bothlite' }),
    notes: 'frontier-bothlite lane option1. Session 02에서는 locally adopted branch였지만 Session 03에서 topk2 contingency에 밀려 결선에 오르지 못한 historical-only candidate입니다.',
  }),
  Object.freeze({
    key: 's176-main-frontier-bothlite-topk2',
    familyKey: 'stage154-main-recenter',
    priority: 6,
    tier: 'safe',
    risk: 'low',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-frontier-gate' }),
    moveOrderingStructureProfile: 'stage176-frontier-topk2-v1',
    mpcSource: Object.freeze({ stage: 170, key: 's170-main-frontier-zebra-bothlite' }),
    notes: 'frontier-bothlite lane contingency. Session 03 final candidate였지만 Stage 181 late-check에서도 240/360ms combined draw에 그치고 vanilla stage154-both를 넘지 못해 retired historical-only candidate입니다.',
  }),
]);

const STAGE176_SURVIVOR_BRANCH_CANDIDATES = Object.freeze([
  ...STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATES,
  ...STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATES,
]);

const STAGE176_SURVIVOR_BRANCH_ALIAS_MAP = Object.freeze({});

const STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEY_SET = new Set(
  STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATES.map((candidate) => candidate.key),
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

function resolveSourceCandidate(source) {
  const resolver = SOURCE_STAGE_RESOLVERS[source?.stage] ?? null;
  if (!resolver) {
    throw new Error(`Unsupported stage176 survivor source stage: ${source?.stage}`);
  }
  return resolver(source.key);
}

export function listStage176SurvivorBranchCandidates({ includeRetired = false } = {}) {
  return STAGE176_SURVIVOR_BRANCH_CANDIDATES.filter((candidate) => {
    if (!includeRetired && STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEY_SET.has(candidate.key)) {
      return false;
    }
    return true;
  }).map((candidate) => resolveStage176SurvivorBranchCandidate(candidate.key, { allowRetired: includeRetired }));
}

export function resolveStage176SurvivorBranchCandidate(candidateKey, { allowRetired = false } = {}) {
  const canonicalKey = STAGE176_SURVIVOR_BRANCH_ALIAS_MAP[candidateKey] ?? candidateKey;
  const rawCandidate = STAGE176_SURVIVOR_BRANCH_CANDIDATES.find((candidate) => candidate.key === canonicalKey);
  if (!rawCandidate) {
    throw new Error(`Unknown stage176 survivor branch candidate: ${candidateKey}`);
  }
  if (!allowRetired && STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEY_SET.has(rawCandidate.key)) {
    throw new Error(`Retired stage176 survivor branch candidate: ${candidateKey}`);
  }

  const family = STAGE157_STRUCTURAL_FAMILIES[rawCandidate.familyKey];
  if (!family) {
    throw new Error(`Unknown stage176 survivor branch family: ${rawCandidate.familyKey}`);
  }

  const moveOrderingSourceCandidate = resolveSourceCandidate(rawCandidate.moveOrderingSource);
  const mpcSourceCandidate = resolveSourceCandidate(rawCandidate.mpcSource);

  if (moveOrderingSourceCandidate.familyKey !== rawCandidate.familyKey) {
    throw new Error(`Move-ordering source family mismatch for ${rawCandidate.key}: ${moveOrderingSourceCandidate.familyKey}`);
  }
  if (mpcSourceCandidate.familyKey !== rawCandidate.familyKey) {
    throw new Error(`MPC source family mismatch for ${rawCandidate.key}: ${mpcSourceCandidate.familyKey}`);
  }

  const moveOrderingStructureProfile = rawCandidate.moveOrderingStructureProfile
    ? resolveStructureProfile(
      rawCandidate.moveOrderingStructureProfile,
      CUSTOM_STAGE176_MOVE_ORDERING_STRUCTURE_PROFILES,
      resolveMoveOrderingStructureProfile,
    )
    : moveOrderingSourceCandidate.moveOrderingStructureProfile;
  const mpcStructureProfile = rawCandidate.mpcStructureProfile
    ? resolveStructureProfile(
      rawCandidate.mpcStructureProfile,
      CUSTOM_STAGE176_MPC_STRUCTURE_PROFILES,
      resolveMpcStructureProfile,
    )
    : mpcSourceCandidate.mpcStructureProfile;

  const engineOptions = mergeEngineOptions(
    family.defaultEngineOptions,
    moveOrderingSourceCandidate.engineOptions ?? null,
    mpcSourceCandidate.engineOptions ?? null,
    rawCandidate.engineOptions ?? null,
  );
  const moduleAbsolutePath = resolveProjectPath(...family.modulePath.split('/'));

  return Object.freeze({
    ...rawCandidate,
    family,
    modulePath: family.modulePath,
    moduleAbsolutePath,
    moveOrderingSourceCandidate,
    mpcSourceCandidate,
    moveOrderingStructureProfile,
    mpcStructureProfile,
    engineOptions,
    retired: STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEY_SET.has(rawCandidate.key),
  });
}

export function buildStage176SurvivorBranchEngineOptions(candidateKey, { allowRetired = false } = {}) {
  const candidate = resolveStage176SurvivorBranchCandidate(candidateKey, { allowRetired });
  return Object.freeze({
    ...(candidate.engineOptions ?? {}),
    moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
    mpcStructureProfile: candidate.mpcStructureProfile,
  });
}

export function summarizeStage176SurvivorBranchCandidate(candidateKey, { allowRetired = false } = {}) {
  const candidate = resolveStage176SurvivorBranchCandidate(candidateKey, { allowRetired });
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
    moveOrderingSource: Object.freeze({
      stage: candidate.moveOrderingSource.stage,
      key: candidate.moveOrderingSourceCandidate.key,
    }),
    mpcStructureProfileKey: candidate.mpcStructureProfile?.key ?? null,
    mpcSource: Object.freeze({
      stage: candidate.mpcSource.stage,
      key: candidate.mpcSourceCandidate.key,
    }),
    engineOptions: candidate.engineOptions ?? null,
    notes: candidate.notes,
  });
}

export const STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_KEYS = Object.freeze(
  STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS = Object.freeze(
  STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE176_SURVIVOR_BRANCH_CANDIDATE_KEYS = Object.freeze(
  STAGE176_SURVIVOR_BRANCH_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_KEYS.map((key) => summarizeStage176SurvivorBranchCandidate(key)),
);

export const STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS.map((key) => summarizeStage176SurvivorBranchCandidate(key, { allowRetired: true })),
);

export const STAGE176_SURVIVOR_BRANCH_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE176_SURVIVOR_BRANCH_CANDIDATE_KEYS.map((key) => summarizeStage176SurvivorBranchCandidate(key, { allowRetired: true })),
);
