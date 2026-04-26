import {
  resolveMoveOrderingStructureProfile,
  resolveMpcStructureProfile,
} from '../../js/ai/search-structure-profiles.js';
import { STAGE157_STRUCTURAL_FAMILIES, resolveStage157StructuralCandidate } from './stage157-structural-candidates.mjs';
import { resolveStage158StructuralCandidate } from './stage158-structural-candidates.mjs';
import { resolveProjectPath, toPortablePath } from './lib.mjs';

const SOURCE_STAGE_RESOLVERS = Object.freeze({
  157: resolveStage157StructuralCandidate,
  158: resolveStage158StructuralCandidate,
});

const CUSTOM_STAGE170_MOVE_ORDERING_STRUCTURE_PROFILES = Object.freeze({
  'stage170-frontier-stabilized-v1': Object.freeze({
    key: 'stage170-frontier-stabilized-v1',
    label: 'stage170 stabilized frontier ordering',
    description: 'Round6 re-entry용. cheap frontier ordering에 TT depth gating, square-parity exact tie-break, 좁은 top-K lightweight eval을 더해 160ms mid-think ambiguity를 낮춥니다.',
    priority: 120,
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 3,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 950,
    frontierWeight: 700,
    shallowProbeEnabled: false,
    shallowProbeTopK: 0,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 22,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 32,
    exactFastestFirstMode: 'square-parity-reply',
  }),
});

const CUSTOM_STAGE170_MPC_STRUCTURE_PROFILES = Object.freeze({
  'stage170-frontier-zebra-bothlite-v1': Object.freeze({
    key: 'stage170-frontier-zebra-bothlite-v1',
    label: 'stage170 frontier zebra both-lite MPC',
    description: 'Round7 re-entry용. guarded Zebra ladder에 low-cut을 매우 제한적으로 열어 mid-think stronger-baseline 음수를 줄이되, stricter volatility guard로 long-think collapse를 막는 절충 MPC입니다.',
    priority: 130,
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.87,
    staticEvalGateScaleLow: 0.92,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 38,
    volatilityMaxLegalMoves: 8,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.22,
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

function resolveStructureProfile(source, customProfiles, resolveBuiltin) {
  if (typeof source === 'string' && Object.hasOwn(customProfiles, source)) {
    return resolveBuiltin(customProfiles[source]);
  }
  return resolveBuiltin(source);
}

const STAGE170_SURVIVOR_COMBO_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 's170-main-wide-zebra',
    familyKey: 'stage154-main-recenter',
    priority: 1,
    tier: 'aggressive',
    risk: 'medium',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-wide-hybrid' }),
    mpcSource: Object.freeze({ stage: 158, key: 's154-stable-zebra' }),
    notes: 'Stage157의 가장 선명한 wide ordering survivor와 stage158의 guarded Zebra MPC survivor를 교차 결합한 1순위 통합 후보입니다.',
  }),
  Object.freeze({
    key: 's170-main-stable-verify',
    familyKey: 'stage154-main-recenter',
    priority: 2,
    tier: 'balanced',
    risk: 'medium',
    moveOrderingSource: Object.freeze({ stage: 158, key: 's154-stable-zebra' }),
    mpcSource: Object.freeze({ stage: 157, key: 's157-main-wide-hybrid' }),
    notes: 'Stage158 stable/quiet ordering에 stage157 verify-tight MPC를 얹어, stage158 ordering 기여와 stage157 보수형 MPC를 분리해서 확인하는 통합 후보입니다.',
  }),
  Object.freeze({
    key: 's170-main-frontier-zebra',
    familyKey: 'stage154-main-recenter',
    priority: 3,
    tier: 'safe',
    risk: 'low',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-frontier-gate' }),
    mpcSource: Object.freeze({ stage: 158, key: 's154-stable-zebra' }),
    notes: 'cheap frontier ordering survivor와 guarded Zebra MPC survivor를 결합한 저위험 통합 후보입니다.',
  }),
  Object.freeze({
    key: 's170-main-frontier-zebra-stabilized',
    familyKey: 'stage154-main-recenter',
    priority: 4,
    tier: 'safe',
    risk: 'low',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-frontier-gate' }),
    moveOrderingStructureProfile: 'stage170-frontier-stabilized-v1',
    mpcSource: Object.freeze({ stage: 158, key: 's154-stable-zebra' }),
    notes: 'logic reinforcement re-entry 후보. frontier-gate의 cheap signal skeleton은 유지하되 TT depth gate + square-parity tie-break + narrow top-K로 160ms 교차축 ambiguity를 낮추려는 통합 후보입니다.',
  }),
  Object.freeze({
    key: 's170-main-frontier-zebra-bothlite',
    familyKey: 'stage154-main-recenter',
    priority: 5,
    tier: 'safe',
    risk: 'low',
    moveOrderingSource: Object.freeze({ stage: 157, key: 's157-main-frontier-gate' }),
    mpcSource: Object.freeze({ stage: 158, key: 's154-stable-zebra' }),
    mpcStructureProfile: 'stage170-frontier-zebra-bothlite-v1',
    notes: 'logic reinforcement re-entry 후보. frontier-zebra original hold의 stronger-baseline 160ms 음수를 MPC-side에서만 교정하려는 마지막 보강안입니다. guarded Zebra ladder에 low-cut을 아주 제한적으로 열고 volatility guard를 더 엄격하게 둡니다.',
  }),
]);

const STAGE170_SURVIVOR_COMBO_ALIAS_MAP = Object.freeze({});

function mergeEngineOptions(...optionBlocks) {
  const merged = optionBlocks
    .filter(Boolean)
    .reduce((accumulator, block) => ({ ...accumulator, ...block }), {});
  return Object.keys(merged).length > 0 ? Object.freeze(merged) : null;
}

function resolveSourceCandidate(source) {
  const resolver = SOURCE_STAGE_RESOLVERS[source?.stage] ?? null;
  if (!resolver) {
    throw new Error(`Unsupported stage170 survivor source stage: ${source?.stage}`);
  }
  return resolver(source.key);
}

export function listStage170SurvivorComboCandidates({ includeAggressive = true } = {}) {
  return STAGE170_SURVIVOR_COMBO_CANDIDATES.filter((candidate) => {
    if (!includeAggressive && candidate.tier === 'aggressive') {
      return false;
    }
    return true;
  }).map((candidate) => resolveStage170SurvivorComboCandidate(candidate.key));
}

export function resolveStage170SurvivorComboCandidate(candidateKey) {
  const canonicalKey = STAGE170_SURVIVOR_COMBO_ALIAS_MAP[candidateKey] ?? candidateKey;
  const rawCandidate = STAGE170_SURVIVOR_COMBO_CANDIDATES.find((candidate) => candidate.key === canonicalKey);
  if (!rawCandidate) {
    throw new Error(`Unknown stage170 survivor combo candidate: ${candidateKey}`);
  }

  const family = STAGE157_STRUCTURAL_FAMILIES[rawCandidate.familyKey];
  if (!family) {
    throw new Error(`Unknown stage170 survivor combo family: ${rawCandidate.familyKey}`);
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
      CUSTOM_STAGE170_MOVE_ORDERING_STRUCTURE_PROFILES,
      resolveMoveOrderingStructureProfile,
    )
    : moveOrderingSourceCandidate.moveOrderingStructureProfile;
  const mpcStructureProfile = rawCandidate.mpcStructureProfile
    ? resolveStructureProfile(
      rawCandidate.mpcStructureProfile,
      CUSTOM_STAGE170_MPC_STRUCTURE_PROFILES,
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
  });
}

export function buildStage170SurvivorComboEngineOptions(candidateKey) {
  const candidate = resolveStage170SurvivorComboCandidate(candidateKey);
  return Object.freeze({
    ...(candidate.engineOptions ?? {}),
    moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
    mpcStructureProfile: candidate.mpcStructureProfile,
  });
}

export function summarizeStage170SurvivorComboCandidate(candidateKey) {
  const candidate = resolveStage170SurvivorComboCandidate(candidateKey);
  return Object.freeze({
    key: candidate.key,
    familyKey: candidate.familyKey,
    familyLabel: candidate.family.label,
    priority: candidate.priority,
    tier: candidate.tier,
    risk: candidate.risk,
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

export const STAGE170_SURVIVOR_COMBO_CANDIDATE_KEYS = Object.freeze(
  STAGE170_SURVIVOR_COMBO_CANDIDATES.map((candidate) => candidate.key),
);

export const STAGE170_SURVIVOR_COMBO_CANDIDATE_SUMMARIES = Object.freeze(
  STAGE170_SURVIVOR_COMBO_CANDIDATE_KEYS.map((key) => summarizeStage170SurvivorComboCandidate(key)),
);
