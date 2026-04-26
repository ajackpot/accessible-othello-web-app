#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { SearchEngine } from '../../js/ai/search-engine.js';
import {
  RUNTIME_EVALUATION_PROFILE,
  RUNTIME_MOVE_ORDERING_PROFILE,
  RUNTIME_TUPLE_RESIDUAL_PROFILE,
  RUNTIME_MPC_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  collectInputFileEntries,
  createMetricAccumulator,
  detectKnownDatasetSampleCount,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatDurationSeconds,
  formatInteger,
  formatRate,
  loadGeneratedProfilesModuleIfPresent,
  loadJsonFileIfPresent,
  parseArgs,
  percentage,
  relativePathFromCwd,
  resolveCliPath,
  resolveTrainingOutputPath,
  streamTrainingSamples,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
} from './lib.mjs';
import {
  evaluateAdaptiveBucketStop,
  listCalibrationBucketPresetKeys,
  parseCalibrationSpecs as parseCalibrationSpecsWithPreset,
  summarizeCalibrationBucket as summarizeCalibrationBucketShared,
} from './mpc-training-lib.mjs';

const DEFAULT_CALIBRATION_SPECS = Object.freeze([
  Object.freeze({ key: 'mpc-18-21-d4-d8', minEmpties: 18, maxEmpties: 21, shallowDepth: 4, deepDepth: 8, label: '18-21 / d4→d8' }),
  Object.freeze({ key: 'mpc-22-25-d4-d8', minEmpties: 22, maxEmpties: 25, shallowDepth: 4, deepDepth: 8, label: '22-25 / d4→d8' }),
  Object.freeze({ key: 'mpc-26-29-d6-d10', minEmpties: 26, maxEmpties: 29, shallowDepth: 6, deepDepth: 10, label: '26-29 / d6→d10' }),
  Object.freeze({ key: 'mpc-30-33-d6-d10', minEmpties: 30, maxEmpties: 33, shallowDepth: 6, deepDepth: 10, label: '30-33 / d6→d10' }),
]);
const DEFAULT_Z_VALUES = Object.freeze([1.0, 1.5, 1.96, 2.5, 3.0]);
const STOP = '__STOP_MPC_CALIBRATION__';

function printUsage() {
  const toolPath = displayTrainingToolPath('calibrate-mpc-profile.mjs');
  const outputJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--generated-module path/to/learned-eval-profile.generated.js] \
    [--evaluation-profile-json tools/evaluator-training/out/trained-evaluation-profile.json] \
    [--move-ordering-profile-json tools/evaluator-training/out/trained-move-ordering-profile.json] \
    [--tuple-profile-json tools/evaluator-training/out/trained-tuple-residual-profile.calibrated.json|off] \
    [--mpc-profile-json tools/evaluator-training/out/trained-mpc-profile.json|off] \
    [--pattern-bank-json tools/evaluator-training/out/trained-pattern-bank-profile.json ...|off] \
    [--move-ordering-pattern-bank-json tools/evaluator-training/out/trained-move-ordering-pattern-bank-profile.json ...|off] \
    [--calibration-buckets 18-21:4>8,22-25:4>8,26-29:6>10,30-33:6>10] \
    [--bucket-preset baseline-4|compact-4|overlap-8|split-stage-8|zebra-ladder-8] \
    [--sample-stride 200] [--sample-residue 0] [--max-samples-per-bucket 400] \
    [--holdout-mod 10] [--holdout-residue 0] [--target-holdout-coverage 0.99] \
    [--time-limit-ms 120000] [--progress-every 20] \
    [--checkpoint-json tools/evaluator-training/out/trained-mpc-profile.checkpoint.json] [--resume] [--checkpoint-every 50] \
    [--adaptive-stop] [--adaptive-min-samples-per-bucket 160] [--adaptive-check-every 20] \
    [--max-accepted-total 200] \
    [--max-table-entries 200000] [--aspiration-window 40] \
    [--z-values 1,1.5,1.96,2.5,3] \
    [--output-json ${outputJsonPath}]

이 도구는 입력 상태들에서 shallow/deep 탐색 점수 쌍을 수집해
bucket별 ProbCut / MPC 회귀식 (deep ≈ intercept + slope * shallow)과 residual sigma를 추정합니다.
calibration-buckets는 서로 겹쳐도 되므로, 같은 empties 구간에 여러 shallow/deep 조합을 넣어
Multi-ProbCut식 다중 check profile을 학습하는 데도 사용할 수 있습니다.
아직 런타임 pruning은 넣지 않고, 이후 MPC 도입에 필요한 보정 파일만 생성합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isExplicitNullLike(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return ['off', 'none', 'null', 'disabled'].includes(String(value).trim().toLowerCase());
}

function loadJsonFileOrExplicitNull(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (isExplicitNullLike(value)) {
    return null;
  }
  return loadJsonFileIfPresent(value);
}

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

function loadJsonStackOrExplicitNull(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const requestedValues = ensureArray(value).filter((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '');
  if (requestedValues.length === 0) {
    return fallback;
  }
  if (requestedValues.length === 1 && isExplicitNullLike(requestedValues[0])) {
    return null;
  }
  return loadJsonStackIfPresent(requestedValues);
}

function parseCalibrationSpecs(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_CALIBRATION_SPECS;
  }

  const specs = value.split(',').map((token, index) => {
    const match = /^(\d+)(?:-(\d+))?:(\d+)>(\d+)$/.exec(token.trim());
    if (!match) {
      throw new Error(`잘못된 calibration bucket 형식: ${token}`);
    }
    const minEmpties = Number(match[1]);
    const maxEmpties = Number(match[2] ?? match[1]);
    const shallowDepth = Number(match[3]);
    const deepDepth = Number(match[4]);
    if (!Number.isInteger(minEmpties) || !Number.isInteger(maxEmpties) || minEmpties < 1 || maxEmpties > 60 || minEmpties > maxEmpties) {
      throw new Error(`유효하지 않은 empties 범위: ${token}`);
    }
    if (!Number.isInteger(shallowDepth) || !Number.isInteger(deepDepth) || shallowDepth < 1 || deepDepth <= shallowDepth) {
      throw new Error(`유효하지 않은 shallow/deep depth 조합: ${token}`);
    }
    return Object.freeze({
      key: `mpc-${minEmpties}-${maxEmpties}-d${shallowDepth}-d${deepDepth}`,
      minEmpties,
      maxEmpties,
      shallowDepth,
      deepDepth,
      label: `${minEmpties}-${maxEmpties} / d${shallowDepth}→d${deepDepth}`,
      order: index,
    });
  });

  specs.sort((left, right) => {
    if (left.minEmpties !== right.minEmpties) {
      return left.minEmpties - right.minEmpties;
    }
    if (left.maxEmpties !== right.maxEmpties) {
      return left.maxEmpties - right.maxEmpties;
    }
    if (left.shallowDepth !== right.shallowDepth) {
      return left.shallowDepth - right.shallowDepth;
    }
    return left.deepDepth - right.deepDepth;
  });
  return Object.freeze(specs);
}

function parseZValues(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_Z_VALUES;
  }

  const values = [...new Set(value.split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0))]
    .sort((left, right) => left - right);
  return values.length > 0 ? Object.freeze(values) : DEFAULT_Z_VALUES;
}

function buildCalibrationIndexLookupTable(specs) {
  return Array.from({ length: 61 }, (_, empties) => {
    const matches = [];
    for (let index = 0; index < specs.length; index += 1) {
      const spec = specs[index];
      if (empties >= spec.minEmpties && empties <= spec.maxEmpties) {
        matches.push(index);
      }
    }
    return Object.freeze(matches);
  });
}

function lookupCalibrationIndices(calibrationIndexLookupTable, empties) {
  if (!Number.isFinite(empties)) {
    return [];
  }
  const normalized = Math.max(0, Math.min(60, Math.round(empties)));
  return calibrationIndexLookupTable[normalized] ?? [];
}

function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

function createSearchOptions({
  depth,
  timeLimitMs,
  aspirationWindow,
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  patternBankProfiles,
  moveOrderingPatternBankProfiles,
  maxTableEntries,
}) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: depth,
    timeLimitMs,
    exactEndgameEmpties: 0,
    aspirationWindow,
    randomness: 0,
    maxTableEntries,
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
    patternBankProfiles,
    moveOrderingPatternBankProfiles,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    enhancedTranspositionCutoff: true,
    enhancedTranspositionCutoffWld: true,
    wldPreExactEmpties: 0,
  };
}

function resetReusableSearchEngine(engine) {
  engine.transpositionTable.clear();
  engine.killerMoves = [];
  engine.historyHeuristic = Array.from({ length: 2 }, () => Array(64).fill(0));
  engine.mpcSuppressionDepth = 0;
}

function createSearchRunner() {
  const enginesByKey = new Map();

  return (state, options) => {
    const cacheKey = [
      options.maxDepth,
      options.timeLimitMs,
      options.exactEndgameEmpties,
      options.aspirationWindow,
      options.maxTableEntries,
    ].join('|');
    let engine = enginesByKey.get(cacheKey);
    if (!engine) {
      engine = new SearchEngine(options);
      enginesByKey.set(cacheKey, engine);
    } else {
      resetReusableSearchEngine(engine);
    }
    const result = engine.findBestMove(state);
    return {
      score: Number.isFinite(result?.score) ? result.score : null,
      didPass: Boolean(result?.didPass),
      searchCompletion: result?.searchCompletion ?? null,
      nodes: engine.stats?.nodes ?? 0,
      elapsedMs: engine.stats?.elapsedMs ?? 0,
    };
  };
}

function fitLinearRegression(samples) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return null;
  }

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (const sample of samples) {
    const x = Number(sample.shallowScore);
    const y = Number(sample.deepScore);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    count += 1;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  if (count < 2) {
    return null;
  }

  const denominator = (count * sumXX) - (sumX * sumX);
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  const slope = ((count * sumXY) - (sumX * sumY)) / denominator;
  const intercept = (sumY - (slope * sumX)) / count;
  const meanX = sumX / count;
  const meanY = sumY / count;
  const varX = Math.max(0, (sumXX / count) - (meanX ** 2));
  const varY = Math.max(0, (sumYY / count) - (meanY ** 2));
  const covariance = (sumXY / count) - (meanX * meanY);
  const correlation = varX <= 0 || varY <= 0 ? null : covariance / Math.sqrt(varX * varY);
  const rSquared = correlation === null ? null : correlation ** 2;

  return {
    sampleCount: count,
    intercept,
    slope,
    correlation,
    rSquared,
  };
}

function summarizeResidualMetrics(samples, regression) {
  const metrics = createMetricAccumulator();
  if (!regression || !Array.isArray(samples)) {
    return summarizeMetricAccumulator(metrics);
  }

  for (const sample of samples) {
    const predicted = regression.intercept + (regression.slope * sample.shallowScore);
    const residual = predicted - sample.deepScore;
    updateMetricAccumulator(metrics, residual);
  }

  return summarizeMetricAccumulator(metrics);
}

function summarizeZCoverage(samples, regression, trainMetrics, zValues) {
  if (!regression || !Array.isArray(samples) || samples.length === 0 || !Number.isFinite(trainMetrics?.stdDevResidual)) {
    return zValues.map((z) => ({ z, coverage: null, intervalHalfWidth: null }));
  }

  const center = Number.isFinite(trainMetrics.meanResidual) ? trainMetrics.meanResidual : 0;
  return zValues.map((z) => {
    const halfWidth = z * trainMetrics.stdDevResidual;
    let covered = 0;
    for (const sample of samples) {
      const predicted = regression.intercept + (regression.slope * sample.shallowScore);
      const residual = predicted - sample.deepScore;
      if (Math.abs(residual - center) <= halfWidth) {
        covered += 1;
      }
    }
    return {
      z,
      coverage: samples.length > 0 ? covered / samples.length : null,
      intervalHalfWidth: halfWidth,
    };
  });
}

function chooseRecommendedZ(zCoverage, targetCoverage) {
  const passing = zCoverage.find((entry) => Number.isFinite(entry.coverage) && entry.coverage >= targetCoverage);
  if (passing) {
    return passing;
  }
  const fallback = [...zCoverage].reverse().find((entry) => Number.isFinite(entry.coverage));
  return fallback ?? null;
}

function summarizeSearchCost(searchStats) {
  return {
    searches: searchStats.searches,
    nodes: searchStats.nodes,
    elapsedMs: searchStats.elapsedMs,
    averageNodesPerSearch: searchStats.searches > 0 ? searchStats.nodes / searchStats.searches : null,
    averageElapsedMsPerSearch: searchStats.searches > 0 ? searchStats.elapsedMs / searchStats.searches : null,
  };
}

function createSearchCostAccumulator() {
  return {
    searches: 0,
    nodes: 0,
    elapsedMs: 0,
  };
}

function updateSearchCostAccumulator(accumulator, searchResult) {
  accumulator.searches += 1;
  accumulator.nodes += Number(searchResult?.nodes ?? 0);
  accumulator.elapsedMs += Number(searchResult?.elapsedMs ?? 0);
}

function buildCheckpointSignature({
  inputFiles,
  calibrationSpecs,
  sampleStride,
  sampleResidue,
  maxSamplesPerBucket,
  holdoutMod,
  holdoutResidue,
  timeLimitMs,
  aspirationWindow,
  maxTableEntries,
  bucketPreset,
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  patternBankProfiles,
  moveOrderingPatternBankProfiles,
}) {
  return JSON.stringify({
    version: 1,
    inputPaths: inputFiles.map((entry) => entry.path),
    calibrationSpecs,
    sampleStride,
    sampleResidue,
    maxSamplesPerBucket,
    holdoutMod,
    holdoutResidue,
    timeLimitMs,
    aspirationWindow,
    maxTableEntries,
    bucketPreset: bucketPreset ?? null,
    evaluationProfileName: evaluationProfile?.name ?? null,
    moveOrderingProfileName: moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: tupleResidualProfile?.name ?? null,
    mpcProfileName: mpcProfile?.name ?? null,
    patternBankProfileNames: Array.isArray(patternBankProfiles) ? patternBankProfiles.map((entry) => entry?.name ?? null) : null,
    moveOrderingPatternBankProfileNames: Array.isArray(moveOrderingPatternBankProfiles) ? moveOrderingPatternBankProfiles.map((entry) => entry?.name ?? null) : null,
  });
}

function loadCheckpointFileIfPresent(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function createEmptyBucketState() {
  return {
    sampleIndex: 0,
    acceptedSamples: 0,
    trainSamples: [],
    holdoutSamples: [],
    skippedPass: 0,
    skippedInvalid: 0,
    closed: false,
    closedReason: null,
    searchCost: {
      shallow: createSearchCostAccumulator(),
      deep: createSearchCostAccumulator(),
    },
  };
}

function restoreBucketDataFromCheckpoint(specs, checkpoint) {
  const sourceBuckets = Array.isArray(checkpoint?.bucketData) ? checkpoint.bucketData : [];
  return specs.map((_, index) => {
    const source = sourceBuckets[index] ?? {};
    return {
      sampleIndex: Number.isFinite(source.sampleIndex) ? Math.trunc(source.sampleIndex) : 0,
      acceptedSamples: Number.isFinite(source.acceptedSamples) ? Math.trunc(source.acceptedSamples) : 0,
      trainSamples: Array.isArray(source.trainSamples) ? source.trainSamples.map((entry) => ({ ...entry })) : [],
      holdoutSamples: Array.isArray(source.holdoutSamples) ? source.holdoutSamples.map((entry) => ({ ...entry })) : [],
      skippedPass: Number.isFinite(source.skippedPass) ? Math.trunc(source.skippedPass) : 0,
      skippedInvalid: Number.isFinite(source.skippedInvalid) ? Math.trunc(source.skippedInvalid) : 0,
      closed: Boolean(source.closed),
      closedReason: source.closedReason ?? null,
      searchCost: {
        shallow: {
          ...createSearchCostAccumulator(),
          ...(source.searchCost?.shallow ?? {}),
        },
        deep: {
          ...createSearchCostAccumulator(),
          ...(source.searchCost?.deep ?? {}),
        },
      },
    };
  });
}

function summarizeAcceptedSamples(bucketData) {
  return bucketData.reduce((sum, bucket) => sum + (bucket.acceptedSamples ?? 0), 0);
}

function summarizeEffectiveTargetTotal(bucketData, maxSamplesPerBucket) {
  return bucketData.reduce((sum, bucket) => sum + (bucket.closed ? bucket.acceptedSamples : maxSamplesPerBucket), 0);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const requestedInputs = ensureArray(args.input).concat(ensureArray(args['input-dir']));
if (requestedInputs.length === 0) {
  printUsage();
  throw new Error('적어도 하나의 --input 또는 --input-dir 경로를 지정해야 합니다.');
}

const calibrationSpecs = parseCalibrationSpecsWithPreset(args['calibration-buckets'], { bucketPreset: args['bucket-preset'] });
const zValues = parseZValues(args['z-values']);
const bucketPreset = typeof args['bucket-preset'] === 'string' ? args['bucket-preset'].trim().toLowerCase() : null;
const sampleStride = Math.max(1, Math.trunc(toFiniteInteger(args['sample-stride'], 200)));
const sampleResidue = Math.max(0, Math.trunc(toFiniteInteger(args['sample-residue'], 0))) % sampleStride;
const maxSamplesPerBucket = Math.max(1, Math.trunc(toFiniteInteger(args['max-samples-per-bucket'], 400)));
const holdoutMod = Math.max(0, Math.trunc(toFiniteInteger(args['holdout-mod'], 10)));
const holdoutResidue = Math.max(0, Math.trunc(toFiniteInteger(args['holdout-residue'], 0)));
const timeLimitMs = Math.max(1000, Math.trunc(toFiniteInteger(args['time-limit-ms'], 120000)));
const progressEvery = Math.max(0, Math.trunc(toFiniteInteger(args['progress-every'], 20)));
const maxTableEntries = Math.max(1000, Math.trunc(toFiniteInteger(args['max-table-entries'], 200000)));
const aspirationWindow = Math.max(0, Math.trunc(toFiniteInteger(args['aspiration-window'], 40)));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveTrainingOutputPath('trained-mpc-profile.json');
const targetHoldoutCoverage = Math.max(0.5, Math.min(0.9999, toFiniteNumber(args['target-holdout-coverage'], 0.99)));
const profileName = typeof args.name === 'string' ? args.name : 'calibrated-mpc-profile-v1';
const description = typeof args.description === 'string'
  ? args.description
  : 'shallow/deep search 상관 기반 MPC/ProbCut 보정 프로필입니다.';
const generatedModule = await loadGeneratedProfilesModuleIfPresent(args['generated-module']);
const evaluationProfile = loadJsonFileIfPresent(args['evaluation-profile-json']) ?? generatedModule?.evaluationProfile ?? RUNTIME_EVALUATION_PROFILE;
const moveOrderingProfile = loadJsonFileIfPresent(args['move-ordering-profile-json']) ?? generatedModule?.moveOrderingProfile ?? RUNTIME_MOVE_ORDERING_PROFILE ?? null;
const tupleResidualProfile = loadJsonFileOrExplicitNull(args['tuple-profile-json'], generatedModule?.tupleResidualProfile ?? RUNTIME_TUPLE_RESIDUAL_PROFILE ?? null);
const mpcProfile = loadJsonFileOrExplicitNull(args['mpc-profile-json'], generatedModule?.mpcProfile ?? RUNTIME_MPC_PROFILE ?? null);
const patternBankProfiles = loadJsonStackOrExplicitNull(args['pattern-bank-json'], generatedModule?.patternBankProfiles ?? null);
const moveOrderingPatternBankProfiles = loadJsonStackOrExplicitNull(args['move-ordering-pattern-bank-json'], generatedModule?.moveOrderingPatternBankProfiles ?? null);
const checkpointJsonPath = args['checkpoint-json'] ? resolveCliPath(args['checkpoint-json']) : null;
const resumeFromCheckpoint = Boolean(args.resume);
const checkpointEvery = Math.max(0, Math.trunc(toFiniteInteger(args['checkpoint-every'], checkpointJsonPath ? 50 : 0)));
const adaptiveStopEnabled = Boolean(args['adaptive-stop']);
const adaptiveMinSamplesPerBucket = Math.max(10, Math.trunc(toFiniteInteger(args['adaptive-min-samples-per-bucket'], 160)));
const adaptiveCheckEvery = Math.max(1, Math.trunc(toFiniteInteger(args['adaptive-check-every'], 20)));
const maxAcceptedTotal = args['max-accepted-total'] === undefined
  ? null
  : Math.max(1, Math.trunc(toFiniteInteger(args['max-accepted-total'], 1)));

const inputFiles = await collectInputFileEntries(requestedInputs);
if (inputFiles.length === 0) {
  throw new Error('입력 파일을 찾지 못했습니다. --input 또는 --input-dir 경로를 확인하십시오.');
}

const estimatedTotalSamples = detectKnownDatasetSampleCount(inputFiles);
const calibrationIndexLookupTable = buildCalibrationIndexLookupTable(calibrationSpecs);
const runSearchScore = createSearchRunner();
const checkpointSignature = buildCheckpointSignature({
  inputFiles,
  calibrationSpecs,
  sampleStride,
  sampleResidue,
  maxSamplesPerBucket,
  holdoutMod,
  holdoutResidue,
  timeLimitMs,
  aspirationWindow,
  maxTableEntries,
  bucketPreset,
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  patternBankProfiles,
  moveOrderingPatternBankProfiles,
});
const checkpointState = resumeFromCheckpoint ? loadCheckpointFileIfPresent(checkpointJsonPath) : null;
if (resumeFromCheckpoint && checkpointJsonPath && checkpointState && checkpointState.signature !== checkpointSignature) {
  throw new Error('checkpoint signature mismatch: 현재 실행 인자/입력과 checkpoint가 다릅니다.');
}
const bucketData = checkpointState ? restoreBucketDataFromCheckpoint(calibrationSpecs, checkpointState) : calibrationSpecs.map(() => createEmptyBucketState());
const globalSearchCost = checkpointState?.globalSearchCost ? {
  shallow: { ...createSearchCostAccumulator(), ...(checkpointState.globalSearchCost?.shallow ?? {}) },
  deep: { ...createSearchCostAccumulator(), ...(checkpointState.globalSearchCost?.deep ?? {}) },
} : {
  shallow: createSearchCostAccumulator(),
  deep: createSearchCostAccumulator(),
};

const startedAt = Date.now();
let visitedSamples = Number.isFinite(checkpointState?.diagnostics?.visitedSamples) ? Math.trunc(checkpointState.diagnostics.visitedSamples) : 0;
let matchedSamples = Number.isFinite(checkpointState?.diagnostics?.matchedSamples) ? Math.trunc(checkpointState.diagnostics.matchedSamples) : 0;
let acceptedSamplesTotal = checkpointState ? summarizeAcceptedSamples(bucketData) : 0;
let lastProgressAt = startedAt;
let lastProcessedInputSampleIndex = Number.isFinite(checkpointState?.diagnostics?.lastProcessedInputSampleIndex)
  ? Math.trunc(checkpointState.diagnostics.lastProcessedInputSampleIndex)
  : -1;
let stopReason = null;
let lastCheckpointAcceptedSamples = acceptedSamplesTotal;

async function saveCheckpointState({ completed = false, finalStopReason = null } = {}) {
  if (!checkpointJsonPath) {
    return;
  }
  const payload = {
    version: 2,
    signature: checkpointSignature,
    savedAt: new Date().toISOString(),
    completed,
    stopReason: finalStopReason,
    outputJsonPath,
    bucketPreset,
    calibrationSpecs,
    bucketData,
    globalSearchCost,
    diagnostics: {
      visitedSamples,
      matchedSamples,
      acceptedSamples: acceptedSamplesTotal,
      lastProcessedInputSampleIndex,
      resumedFromCheckpoint: resumeFromCheckpoint && Boolean(checkpointState),
    },
  };
  await fs.promises.mkdir(path.dirname(checkpointJsonPath), { recursive: true });
  await fs.promises.writeFile(checkpointJsonPath, `${JSON.stringify(payload, null, 2)}
`, 'utf8');
}

console.log(`MPC calibration start`);
console.log(`  inputs           : ${inputFiles.length} file(s)`);
console.log(`  calibration specs: ${calibrationSpecs.map((spec) => `${spec.minEmpties}-${spec.maxEmpties}:d${spec.shallowDepth}>d${spec.deepDepth}`).join(', ')}`);
console.log(`  bucket preset    : ${bucketPreset ?? 'custom/default'}`);
console.log(`  sample stride    : every ${sampleStride} sample(s), residue ${sampleResidue}`);
console.log(`  max/bucket       : ${formatInteger(maxSamplesPerBucket)}`);
console.log(`  holdout split    : mod ${holdoutMod}, residue ${holdoutResidue}`);
console.log(`  time/search      : ${formatInteger(timeLimitMs)} ms`);
console.log(`  z values         : ${zValues.join(', ')}`);
console.log(`  adaptive stop    : ${adaptiveStopEnabled ? `on (min=${adaptiveMinSamplesPerBucket}, every=${adaptiveCheckEvery})` : 'off'}`);
console.log(`  checkpoint       : ${checkpointJsonPath ? relativePathFromCwd(checkpointJsonPath) : 'off'}${resumeFromCheckpoint ? ' (resume requested)' : ''}`);
console.log(`  estimated samples: ${estimatedTotalSamples === null ? 'n/a' : formatInteger(estimatedTotalSamples)}`);
console.log(`  tuple/mpc stack  : tuple=${tupleResidualProfile?.name ?? 'null'} | mpc=${mpcProfile?.name ?? 'null'}`);
console.log(`  pattern-bank     : eval=${patternBankProfiles?.length ?? 0} | ordering=${moveOrderingPatternBankProfiles?.length ?? 0}`);
if (checkpointState) {
  console.log(`  resumed progress : accepted=${formatInteger(acceptedSamplesTotal)} | last sample index=${formatInteger(lastProcessedInputSampleIndex)}`);
}

try {
  await streamTrainingSamples(inputFiles, {}, async ({ state, sampleIndex, totalBytesProcessed, totalBytes }) => {
    if (sampleIndex <= lastProcessedInputSampleIndex) {
      return;
    }
    lastProcessedInputSampleIndex = sampleIndex;
    visitedSamples += 1;
    if ((sampleIndex % sampleStride) !== sampleResidue) {
      return;
    }

    const empties = state.getEmptyCount();
    const matchingBucketIndices = lookupCalibrationIndices(calibrationIndexLookupTable, empties);
    if (matchingBucketIndices.length === 0) {
      return;
    }

    const targetBucketIndices = matchingBucketIndices.filter((bucketIndex) => {
      const bucket = bucketData[bucketIndex];
      return !bucket.closed && bucket.acceptedSamples < maxSamplesPerBucket;
    });
    if (targetBucketIndices.length === 0) {
      if (bucketData.every((entry) => entry.closed || entry.acceptedSamples >= maxSamplesPerBucket)) {
        stopReason = 'all-buckets-complete';
        throw new Error(STOP);
      }
      return;
    }

    matchedSamples += targetBucketIndices.length;
    const searchResultCache = new Map();
    const getSearchResult = (depth) => {
      if (searchResultCache.has(depth)) {
        return searchResultCache.get(depth);
      }
      const options = createSearchOptions({
        depth,
        timeLimitMs,
        aspirationWindow,
        evaluationProfile,
        moveOrderingProfile,
        tupleResidualProfile,
        mpcProfile,
        patternBankProfiles,
        moveOrderingPatternBankProfiles,
        maxTableEntries,
      });
      const result = runSearchScore(state, options);
      searchResultCache.set(depth, result);
      return result;
    };

    let progressLabel = calibrationSpecs[targetBucketIndices[0]]?.label ?? `${empties} empties`;
    for (const bucketIndex of targetBucketIndices) {
      const bucket = bucketData[bucketIndex];
      if (bucket.closed || bucket.acceptedSamples >= maxSamplesPerBucket) {
        continue;
      }
      const spec = calibrationSpecs[bucketIndex];
      progressLabel = spec.label;
      const shallowResult = getSearchResult(spec.shallowDepth);
      if (!Number.isFinite(shallowResult.score) || shallowResult.didPass || shallowResult.searchCompletion === 'partial-timeout') {
        bucket.skippedPass += shallowResult.didPass ? 1 : 0;
        bucket.skippedInvalid += (!Number.isFinite(shallowResult.score) || shallowResult.searchCompletion === 'partial-timeout') ? 1 : 0;
        continue;
      }

      const deepResult = getSearchResult(spec.deepDepth);
      if (!Number.isFinite(deepResult.score) || deepResult.didPass || deepResult.searchCompletion === 'partial-timeout') {
        bucket.skippedPass += deepResult.didPass ? 1 : 0;
        bucket.skippedInvalid += (!Number.isFinite(deepResult.score) || deepResult.searchCompletion === 'partial-timeout') ? 1 : 0;
        continue;
      }

      const sampleRecord = {
        sampleIndex,
        empties,
        shallowScore: shallowResult.score,
        deepScore: deepResult.score,
      };
      bucket.sampleIndex += 1;
      bucket.acceptedSamples += 1;
      acceptedSamplesTotal += 1;
      updateSearchCostAccumulator(bucket.searchCost.shallow, shallowResult);
      updateSearchCostAccumulator(bucket.searchCost.deep, deepResult);
      updateSearchCostAccumulator(globalSearchCost.shallow, shallowResult);
      updateSearchCostAccumulator(globalSearchCost.deep, deepResult);

      if (shouldUseHoldout(bucket.sampleIndex - 1, holdoutMod, holdoutResidue)) {
        bucket.holdoutSamples.push(sampleRecord);
      } else {
        bucket.trainSamples.push(sampleRecord);
      }

      const adaptiveSummary = evaluateAdaptiveBucketStop(spec, bucket, {
        enabled: adaptiveStopEnabled,
        minSamplesPerBucket: adaptiveMinSamplesPerBucket,
        checkEvery: adaptiveCheckEvery,
        targetHoldoutCoverage,
        zValues,
      });
      if (adaptiveSummary) {
        bucket.closed = true;
        bucket.closedReason = `adaptive-usable@${bucket.acceptedSamples}`;
      }

      if (maxAcceptedTotal !== null && acceptedSamplesTotal >= maxAcceptedTotal) {
        stopReason = 'max-accepted-total';
        if (checkpointEvery > 0 && acceptedSamplesTotal > lastCheckpointAcceptedSamples) {
          await saveCheckpointState({ completed: false, finalStopReason: stopReason });
          lastCheckpointAcceptedSamples = acceptedSamplesTotal;
        }
        throw new Error(STOP);
      }
    }

    const now = Date.now();
    if (progressEvery > 0
      && targetBucketIndices.some((bucketIndex) => bucketData[bucketIndex].acceptedSamples > 0
        && (bucketData[bucketIndex].acceptedSamples % progressEvery) === 0)
      && (now - lastProgressAt) >= 1000) {
      const elapsedSeconds = (now - startedAt) / 1000;
      const rate = acceptedSamplesTotal / Math.max(1e-9, elapsedSeconds);
      const targetTotal = summarizeEffectiveTargetTotal(bucketData, maxSamplesPerBucket);
      const remaining = Math.max(0, targetTotal - acceptedSamplesTotal);
      const etaSeconds = rate > 0 ? remaining / rate : null;
      const progressRatio = targetTotal > 0 ? acceptedSamplesTotal / targetTotal : 0;
      const byteProgress = totalBytes > 0 ? totalBytesProcessed / totalBytes : null;
      console.log(`Progress ${formatInteger(acceptedSamplesTotal)}/${formatInteger(targetTotal)} accepted (${percentage(progressRatio)}) | rate ${formatRate(rate, 1)} | ETA ${formatDurationSeconds(etaSeconds)} | data ${percentage(byteProgress)} | current bucket ${progressLabel}`);
      lastProgressAt = now;
    }

    if (checkpointJsonPath && checkpointEvery > 0 && (acceptedSamplesTotal - lastCheckpointAcceptedSamples) >= checkpointEvery) {
      await saveCheckpointState({ completed: false, finalStopReason: stopReason });
      lastCheckpointAcceptedSamples = acceptedSamplesTotal;
    }

    if (bucketData.every((entry) => entry.closed || entry.acceptedSamples >= maxSamplesPerBucket)) {
      stopReason = 'all-buckets-complete';
      throw new Error(STOP);
    }
  });
} catch (error) {
  if (error?.message !== STOP) {
    if (checkpointJsonPath) {
      await saveCheckpointState({ completed: false, finalStopReason: error?.message ?? 'error' });
    }
    throw error;
  }
}

if (stopReason === null) {
  stopReason = 'input-exhausted';
}

const calibrations = calibrationSpecs.map((spec, index) => summarizeCalibrationBucketShared(spec, bucketData[index], {
  targetHoldoutCoverage,
  zValues,
}));

const usableCount = calibrations.filter((entry) => entry.usable).length;
const output = {
  version: 2,
  name: profileName,
  description,
  source: {
    inputCount: inputFiles.length,
    inputPaths: inputFiles.map((entry) => entry.path),
    estimatedInputSamples: estimatedTotalSamples,
    sampleStride,
    sampleResidue,
    maxSamplesPerBucket,
    holdoutMod,
    holdoutResidue,
    timeLimitMs,
    aspirationWindow,
    maxTableEntries,
    zValues,
    targetHoldoutCoverage,
    bucketPreset,
    checkpointJsonPath,
    checkpointEvery,
    adaptiveStopEnabled,
    adaptiveMinSamplesPerBucket,
    adaptiveCheckEvery,
    evaluationProfileName: evaluationProfile?.name ?? null,
    moveOrderingProfileName: moveOrderingProfile?.name ?? null,
  },
  diagnostics: {
    visitedSamples,
    matchedSamples,
    acceptedSamples: acceptedSamplesTotal,
    usableCalibrationCount: usableCount,
    shallowSearchCost: summarizeSearchCost(globalSearchCost.shallow),
    deepSearchCost: summarizeSearchCost(globalSearchCost.deep),
    resumedFromCheckpoint: resumeFromCheckpoint && Boolean(checkpointState),
    lastProcessedInputSampleIndex,
    stopReason,
    elapsedSeconds: (Date.now() - startedAt) / 1000,
  },
  calibrations,
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}
`, 'utf8');
if (checkpointJsonPath) {
  await saveCheckpointState({ completed: stopReason === 'all-buckets-complete', finalStopReason: stopReason });
}

console.log(`
Saved MPC calibration profile to ${outputJsonPath}`);
console.log(`Usable calibrations : ${usableCount}/${calibrations.length}`);
for (const entry of calibrations) {
  const correlationText = entry.regression?.correlation === null || entry.regression?.correlation === undefined
    ? 'n/a'
    : entry.regression.correlation.toFixed(3);
  const sigmaText = entry.trainMetrics?.stdDevResidual === null || entry.trainMetrics?.stdDevResidual === undefined
    ? 'n/a'
    : formatInteger(entry.trainMetrics.stdDevResidual);
  const coverageText = entry.recommendedZ?.coverage === null || entry.recommendedZ?.coverage === undefined
    ? 'n/a'
    : percentage(entry.recommendedZ.coverage);
  const closedText = entry.closedEarly ? ` | closed=${entry.closedReason ?? 'yes'}` : '';
  console.log(`  ${entry.label.padEnd(20)} | n=${String(entry.sampleCount).padStart(4, ' ')} | corr=${correlationText} | sigma=${sigmaText} | z=${entry.recommendedZ?.z ?? 'n/a'} | coverage=${coverageText} | usable=${entry.usable ? 'yes' : 'no'}${closedText}`);
}
