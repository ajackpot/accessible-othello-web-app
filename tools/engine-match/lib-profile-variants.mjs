import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ensureArray, loadJsonFileIfPresent, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

export const ACTIVE_GENERATED_MODULE_PATH = 'js/ai/learned-eval-profile.generated.js';

const VARIANT_ENGINE_OPTION_KEYS = Object.freeze([
  'mobilityScale',
  'potentialMobilityScale',
  'cornerScale',
  'cornerAdjacencyScale',
  'stabilityScale',
  'frontierScale',
  'positionalScale',
  'parityScale',
  'discScale',
  'riskPenaltyScale',
  'patternBankScale',
  'moveOrderingPatternBankScale',
  'moveOrderingPatternBankMinEmpties',
  'moveOrderingPatternBankMaxEmpties',
  'reusePatternBankForMoveOrdering',
  'classicSearchDriver',
  'classicMtdfGuessPlyOffset',
  'classicMtdfVerificationPassEnabled',
  'enhancedTranspositionCutoff',
  'enhancedTranspositionCutoffWld',
  'ttFirstInPlaceMoveExtraction',
  'etcInPlaceMovePreparation',
  'etcReusePreparedChildTableEntryForOrdering',
  'allocationLightSearchMoves',
  'exactFastestFirstOrdering',
  'optimizedFewEmptiesExactSolver',
  'optimizedFewEmptiesExactSolverEmpties',
  'specializedFewEmptiesExactSolver',
  'moveOrderingStructureProfile',
  'mpcStructureProfile',
  'mctsSolverEnabled',
]);

function resolveJsonPathList(...candidates) {
  const values = candidates.flatMap((candidate) => ensureArray(candidate)).filter(Boolean);
  const resolved = values.map((value) => resolveCliPath(value));
  return resolved.length > 0 ? resolved : null;
}

function loadJsonStackIfPresent(filePaths) {
  const resolvedPaths = resolveJsonPathList(filePaths);
  if (!resolvedPaths || resolvedPaths.length === 0) {
    return null;
  }
  const loaded = resolvedPaths
    .map((filePath) => loadJsonFileIfPresent(filePath))
    .filter(Boolean);
  return loaded.length > 0 ? loaded : null;
}

function normalizeProfileStack(profiles) {
  if (!profiles) {
    return null;
  }
  const normalized = Array.isArray(profiles) ? profiles.filter(Boolean) : [profiles];
  return normalized.length > 0 ? normalized : null;
}

function sanitizeVariantEngineOptions(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const sanitized = {};
  for (const key of VARIANT_ENGINE_OPTION_KEYS) {
    if (Object.hasOwn(source, key)) {
      sanitized[key] = source[key];
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function loadVariantEngineOptions(engineOptionsJson = null, explicitEngineOptions = null) {
  const fromJson = loadJsonFileIfPresent(engineOptionsJson);
  if (fromJson) {
    return sanitizeVariantEngineOptions(fromJson);
  }
  return sanitizeVariantEngineOptions(explicitEngineOptions);
}

export function parseVariantSpec(value, fallbackLabel = null) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return null;
  }

  const [labelPart, modulePathPart, engineOptionsJsonPart] = text.split('|');
  const label = (labelPart ?? '').trim() || fallbackLabel || null;
  const generatedModule = (modulePathPart ?? '').trim() || null;
  const engineOptionsJson = (engineOptionsJsonPart ?? '').trim() || null;
  if (!label) {
    throw new Error(`Variant spec is missing a label: ${value}`);
  }
  return {
    label,
    generatedModule,
    engineOptionsJson,
  };
}

export function parseVariantSpecList(value, fallback = []) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  return value
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => parseVariantSpec(token));
}

export async function importGeneratedProfileModule(modulePath) {
  const resolved = resolveCliPath(modulePath);
  const imported = await import(pathToFileURL(resolved).href);
  return {
    resolvedPath: resolved,
    imported,
  };
}

export async function loadProfileVariant({
  label,
  generatedModule = null,
  evaluationJson = null,
  moveOrderingJson = null,
  tupleJson = null,
  mpcJson = null,
  patternBankJson = null,
  moveOrderingPatternBankJson = null,
  engineOptionsJson = null,
  engineOptions = null,
  disableMoveOrdering = false,
  disableTuple = false,
  disableMpc = false,
  disablePatternBank = false,
  disableMoveOrderingPatternBank = false,
} = {}) {
  if (typeof label !== 'string' || label.trim() === '') {
    throw new Error('Profile variant label is required.');
  }

  let evaluationProfile = null;
  let moveOrderingProfile = null;
  let tupleResidualProfile = null;
  let mpcProfile = null;
  let patternBankProfiles = null;
  let moveOrderingPatternBankProfiles = null;
  let resolvedModulePath = null;

  if (typeof generatedModule === 'string' && generatedModule.trim() !== '') {
    const loaded = await importGeneratedProfileModule(generatedModule);
    resolvedModulePath = loaded.resolvedPath;
    evaluationProfile = loaded.imported.GENERATED_EVALUATION_PROFILE ?? loaded.imported.default ?? null;
    moveOrderingProfile = loaded.imported.GENERATED_MOVE_ORDERING_PROFILE ?? null;
    tupleResidualProfile = loaded.imported.GENERATED_TUPLE_RESIDUAL_PROFILE ?? null;
    mpcProfile = loaded.imported.GENERATED_MPC_PROFILE ?? null;
    patternBankProfiles = normalizeProfileStack(
      loaded.imported.GENERATED_PATTERN_BANK_PROFILES
      ?? loaded.imported.GENERATED_PATTERN_BANK_PROFILE
      ?? null,
    );
    moveOrderingPatternBankProfiles = normalizeProfileStack(
      loaded.imported.GENERATED_MOVE_ORDERING_PATTERN_BANK_PROFILES
      ?? loaded.imported.GENERATED_MOVE_ORDERING_PATTERN_BANK_PROFILE
      ?? null,
    );
  }

  const explicitEvaluation = loadJsonFileIfPresent(evaluationJson);
  const explicitMoveOrdering = loadJsonFileIfPresent(moveOrderingJson);
  const explicitTuple = loadJsonFileIfPresent(tupleJson);
  const explicitMpc = loadJsonFileIfPresent(mpcJson);
  const explicitPatternBank = loadJsonStackIfPresent(patternBankJson);
  const explicitMoveOrderingPatternBank = loadJsonStackIfPresent(moveOrderingPatternBankJson);
  const resolvedEngineOptions = loadVariantEngineOptions(engineOptionsJson, engineOptions);

  if (explicitEvaluation) {
    evaluationProfile = explicitEvaluation;
  }
  if (explicitMoveOrdering) {
    moveOrderingProfile = explicitMoveOrdering;
  }
  if (explicitTuple) {
    tupleResidualProfile = explicitTuple;
  }
  if (typeof mpcJson === 'string' && mpcJson.trim() !== '') {
    mpcProfile = explicitMpc;
  }
  if (explicitPatternBank) {
    patternBankProfiles = explicitPatternBank;
  }
  if (explicitMoveOrderingPatternBank) {
    moveOrderingPatternBankProfiles = explicitMoveOrderingPatternBank;
  }

  if (!evaluationProfile) {
    throw new Error(`Unable to resolve evaluation profile for variant ${label}.`);
  }

  return {
    label,
    generatedModulePath: resolvedModulePath,
    engineOptionsJsonPath: typeof engineOptionsJson === 'string' && engineOptionsJson.trim() !== ''
      ? resolveCliPath(engineOptionsJson)
      : null,
    engineOptions: resolvedEngineOptions,
    evaluationProfile,
    moveOrderingProfile: disableMoveOrdering ? null : moveOrderingProfile,
    tupleResidualProfile: disableTuple ? null : tupleResidualProfile,
    mpcProfile: disableMpc ? null : mpcProfile,
    patternBankProfiles: disablePatternBank ? null : normalizeProfileStack(patternBankProfiles),
    moveOrderingPatternBankProfiles: disableMoveOrderingPatternBank ? null : normalizeProfileStack(moveOrderingPatternBankProfiles),
  };
}

export function buildEngineProfileOverrides(variant) {
  return {
    ...(variant?.engineOptions ?? {}),
    evaluationProfile: variant?.evaluationProfile ?? null,
    moveOrderingProfile: Object.hasOwn(variant ?? {}, 'moveOrderingProfile')
      ? variant.moveOrderingProfile
      : null,
    tupleResidualProfile: Object.hasOwn(variant ?? {}, 'tupleResidualProfile')
      ? variant.tupleResidualProfile
      : null,
    mpcProfile: Object.hasOwn(variant ?? {}, 'mpcProfile')
      ? variant.mpcProfile
      : null,
    patternBankProfiles: Object.hasOwn(variant ?? {}, 'patternBankProfiles')
      ? variant.patternBankProfiles
      : null,
    moveOrderingPatternBankProfiles: Object.hasOwn(variant ?? {}, 'moveOrderingPatternBankProfiles')
      ? variant.moveOrderingPatternBankProfiles
      : null,
  };
}

export function describeVariantForSummary(variant) {
  return {
    label: variant?.label ?? null,
    generatedModulePath: variant?.generatedModulePath
      ? (relativePathFromCwd(variant.generatedModulePath) ?? variant.generatedModulePath)
      : null,
    engineOptionsJsonPath: variant?.engineOptionsJsonPath
      ? (relativePathFromCwd(variant.engineOptionsJsonPath) ?? variant.engineOptionsJsonPath)
      : null,
    engineOptions: variant?.engineOptions ?? null,
    evaluationProfileName: variant?.evaluationProfile?.name ?? null,
    evaluationBucketCount: Array.isArray(variant?.evaluationProfile?.phaseBuckets)
      ? variant.evaluationProfile.phaseBuckets.length
      : 0,
    interpolationMode: variant?.evaluationProfile?.interpolation?.mode ?? null,
    moveOrderingProfileName: variant?.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: variant?.tupleResidualProfile?.name ?? null,
    mpcProfileName: variant?.mpcProfile?.name ?? null,
    patternBankProfileCount: Array.isArray(variant?.patternBankProfiles) ? variant.patternBankProfiles.length : 0,
    patternBankProfileNames: Array.isArray(variant?.patternBankProfiles)
      ? variant.patternBankProfiles.map((profile) => profile?.name ?? null)
      : [],
    patternBankLayoutNames: Array.isArray(variant?.patternBankProfiles)
      ? variant.patternBankProfiles.map((profile) => profile?.layout?.name ?? profile?.layoutName ?? null)
      : [],
    moveOrderingPatternBankProfileCount: Array.isArray(variant?.moveOrderingPatternBankProfiles)
      ? variant.moveOrderingPatternBankProfiles.length
      : 0,
    moveOrderingPatternBankProfileNames: Array.isArray(variant?.moveOrderingPatternBankProfiles)
      ? variant.moveOrderingPatternBankProfiles.map((profile) => profile?.name ?? null)
      : [],
    moveOrderingPatternBankLayoutNames: Array.isArray(variant?.moveOrderingPatternBankProfiles)
      ? variant.moveOrderingPatternBankProfiles.map((profile) => profile?.layout?.name ?? profile?.layoutName ?? null)
      : [],
  };
}

export function ensureVariantOutputDir(outputPath) {
  const resolved = resolveCliPath(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}
