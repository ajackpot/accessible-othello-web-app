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
} from './lib.mjs';
import {
  buildCalibrationIndexLookupTable,
  createSearchCostAccumulator,
  listCalibrationBucketPresetKeys,
  lookupCalibrationIndices,
  parseCalibrationSpecs,
  summarizeSearchCost,
  updateSearchCostAccumulator,
} from './mpc-training-lib.mjs';

const STOP = '__STOP_MPC_SEARCH_PAIR_PRECOMPUTE__';

function printUsage() {
  const toolPath = displayTrainingToolPath('precompute-mpc-search-pairs.mjs');
  const outputJsonlPath = displayTrainingOutputPath('precomputed-mpc-search-pairs.jsonl');
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
    [--calibration-buckets 18-21:4>8,22-25:4>9,26-29:5>10,30-33:6>11] \
    [--bucket-preset baseline-4|compact-4|overlap-8|split-stage-8|zebra-ladder-8] \
    [--sample-stride 200] [--sample-residue 0] [--max-samples-per-bucket 400] \
    [--time-limit-ms 120000] [--progress-every 20] \
    [--checkpoint-json tools/evaluator-training/out/precomputed-mpc-search-pairs.checkpoint.json] [--resume] [--checkpoint-every 50] \
    [--max-accepted-total 200] \
    [--max-table-entries 200000] [--aspiration-window 40] \
    [--output-jsonl ${outputJsonlPath}] [--summary-json tools/evaluator-training/out/precomputed-mpc-search-pairs.summary.json]

입력 상태를 한 번만 순회하면서 calibration bucket 전체에 필요한 shallow/deep depth 결과를 공유 캐시(JSONL)로 저장합니다.
이후 여러 MPC 후보는 이 캐시에서 회귀만 다시 피팅하므로 재탐색 비용을 크게 줄일 수 있습니다.

사용 가능한 bucket preset: ${listCalibrationBucketPresetKeys().join(', ')}
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
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

function buildCheckpointSignature({
  inputFiles,
  calibrationSpecs,
  sampleStride,
  sampleResidue,
  maxSamplesPerBucket,
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

function inspectJsonlRecords(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      exists: false,
      validRecords: 0,
      nonEmptyRecords: 0,
      invalidLineIndex: null,
      validLines: [],
    };
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const validLines = [];
  let nonEmptyRecords = 0;
  let invalidLineIndex = null;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }
    nonEmptyRecords += 1;
    try {
      JSON.parse(trimmed);
      validLines.push(trimmed);
    } catch {
      invalidLineIndex = index + 1;
      break;
    }
  }
  return {
    exists: true,
    validRecords: validLines.length,
    nonEmptyRecords,
    invalidLineIndex,
    validLines,
  };
}

async function reconcileOutputJsonlForResume(outputJsonlPath, checkpointState) {
  const expectedRecords = Math.max(0, Math.trunc(checkpointState?.diagnostics?.recordsWritten ?? 0));
  const inspected = inspectJsonlRecords(outputJsonlPath);
  if (!inspected.exists) {
    if (expectedRecords > 0) {
      throw new Error(`resume checkpoint expects ${formatInteger(expectedRecords)} JSONL record(s), but output file is missing: ${outputJsonlPath}`);
    }
    return {
      action: 'missing-empty',
      adjusted: false,
      previousRecords: 0,
      finalRecords: 0,
      invalidLineIndex: null,
    };
  }

  if (inspected.invalidLineIndex !== null && inspected.validRecords < expectedRecords) {
    throw new Error(
      `resume checkpoint expects at least ${formatInteger(expectedRecords)} valid JSONL record(s), but ${relativePathFromCwd(outputJsonlPath)} becomes invalid at line ${formatInteger(inspected.invalidLineIndex)} after ${formatInteger(inspected.validRecords)} valid record(s).`,
    );
  }

  if (inspected.validRecords < expectedRecords) {
    throw new Error(
      `resume checkpoint expects ${formatInteger(expectedRecords)} JSONL record(s), but ${relativePathFromCwd(outputJsonlPath)} currently has only ${formatInteger(inspected.validRecords)} valid record(s).`,
    );
  }

  if (inspected.validRecords > expectedRecords || inspected.invalidLineIndex !== null) {
    const keptLines = inspected.validLines.slice(0, expectedRecords);
    const normalized = keptLines.length > 0 ? `${keptLines.join('\n')}\n` : '';
    await fs.promises.writeFile(outputJsonlPath, normalized, 'utf8');
    return {
      action: inspected.invalidLineIndex !== null ? 'truncate-invalid-tail' : 'truncate-extra-tail',
      adjusted: true,
      previousRecords: inspected.validRecords,
      finalRecords: expectedRecords,
      invalidLineIndex: inspected.invalidLineIndex,
    };
  }

  return {
    action: 'aligned',
    adjusted: false,
    previousRecords: inspected.validRecords,
    finalRecords: inspected.validRecords,
    invalidLineIndex: null,
  };
}

function createEmptyBucketState() {
  return {
    acceptedSamples: 0,
    skippedPass: 0,
    skippedInvalid: 0,
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
      acceptedSamples: Number.isFinite(source.acceptedSamples) ? Math.trunc(source.acceptedSamples) : 0,
      skippedPass: Number.isFinite(source.skippedPass) ? Math.trunc(source.skippedPass) : 0,
      skippedInvalid: Number.isFinite(source.skippedInvalid) ? Math.trunc(source.skippedInvalid) : 0,
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

function countAcceptedSamples(bucketData) {
  return bucketData.reduce((sum, bucket) => sum + (bucket.acceptedSamples ?? 0), 0);
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

const calibrationSpecs = parseCalibrationSpecs(args['calibration-buckets'], { bucketPreset: args['bucket-preset'] });
const bucketPreset = typeof args['bucket-preset'] === 'string' ? args['bucket-preset'].trim().toLowerCase() : null;
const sampleStride = Math.max(1, Math.trunc(toFiniteInteger(args['sample-stride'], 200)));
const sampleResidue = Math.max(0, Math.trunc(toFiniteInteger(args['sample-residue'], 0))) % sampleStride;
const maxSamplesPerBucket = Math.max(1, Math.trunc(toFiniteInteger(args['max-samples-per-bucket'], 400)));
const timeLimitMs = Math.max(1000, Math.trunc(toFiniteInteger(args['time-limit-ms'], 120000)));
const progressEvery = Math.max(0, Math.trunc(toFiniteInteger(args['progress-every'], 20)));
const maxTableEntries = Math.max(1000, Math.trunc(toFiniteInteger(args['max-table-entries'], 200000)));
const aspirationWindow = Math.max(0, Math.trunc(toFiniteInteger(args['aspiration-window'], 40)));
const outputJsonlPath = args['output-jsonl'] ? resolveCliPath(args['output-jsonl']) : resolveTrainingOutputPath('precomputed-mpc-search-pairs.jsonl');
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : `${outputJsonlPath}.summary.json`;
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

let visitedSamples = Number.isFinite(checkpointState?.diagnostics?.visitedSamples) ? Math.trunc(checkpointState.diagnostics.visitedSamples) : 0;
let matchedSamples = Number.isFinite(checkpointState?.diagnostics?.matchedSamples) ? Math.trunc(checkpointState.diagnostics.matchedSamples) : 0;
let acceptedSamplesTotal = checkpointState ? countAcceptedSamples(bucketData) : 0;
let recordsWritten = Number.isFinite(checkpointState?.diagnostics?.recordsWritten) ? Math.trunc(checkpointState.diagnostics.recordsWritten) : 0;
let lastProcessedInputSampleIndex = Number.isFinite(checkpointState?.diagnostics?.lastProcessedInputSampleIndex)
  ? Math.trunc(checkpointState.diagnostics.lastProcessedInputSampleIndex)
  : -1;
let lastCheckpointAcceptedSamples = acceptedSamplesTotal;
let stopReason = null;
const startedAt = Date.now();
let lastProgressAt = startedAt;

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
    outputJsonlPath,
    summaryJsonPath,
    bucketPreset,
    calibrationSpecs,
    bucketData,
    globalSearchCost,
    diagnostics: {
      visitedSamples,
      matchedSamples,
      acceptedSamples: acceptedSamplesTotal,
      recordsWritten,
      lastProcessedInputSampleIndex,
      resumedFromCheckpoint: resumeFromCheckpoint && Boolean(checkpointState),
    },
  };
  await fs.promises.mkdir(path.dirname(checkpointJsonPath), { recursive: true });
  await fs.promises.writeFile(checkpointJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

await fs.promises.mkdir(path.dirname(outputJsonlPath), { recursive: true });
let resumeJsonlRepair = null;
if (!resumeFromCheckpoint || !checkpointState) {
  await fs.promises.writeFile(outputJsonlPath, '', 'utf8');
} else {
  resumeJsonlRepair = await reconcileOutputJsonlForResume(outputJsonlPath, checkpointState);
}

console.log('MPC search-pair precompute start');
console.log(`  inputs           : ${inputFiles.length} file(s)`);
console.log(`  calibration specs: ${calibrationSpecs.map((spec) => `${spec.minEmpties}-${spec.maxEmpties}:d${spec.shallowDepth}>d${spec.deepDepth}`).join(', ')}`);
console.log(`  bucket preset    : ${bucketPreset ?? 'custom/default'}`);
console.log(`  sample stride    : every ${sampleStride} sample(s), residue ${sampleResidue}`);
console.log(`  max/bucket       : ${formatInteger(maxSamplesPerBucket)}`);
console.log(`  time/search      : ${formatInteger(timeLimitMs)} ms`);
console.log(`  checkpoint       : ${checkpointJsonPath ? relativePathFromCwd(checkpointJsonPath) : 'off'}${resumeFromCheckpoint ? ' (resume requested)' : ''}`);
console.log(`  output jsonl     : ${relativePathFromCwd(outputJsonlPath)}`);
console.log(`  estimated samples: ${estimatedTotalSamples === null ? 'n/a' : formatInteger(estimatedTotalSamples)}`);
if (checkpointState) {
  console.log(`  resumed progress : accepted=${formatInteger(acceptedSamplesTotal)} | records=${formatInteger(recordsWritten)} | last sample index=${formatInteger(lastProcessedInputSampleIndex)}`);
  if (resumeJsonlRepair?.action === 'aligned') {
    console.log(`  resume JSONL     : aligned (${formatInteger(resumeJsonlRepair.finalRecords)} record(s))`);
  } else if (resumeJsonlRepair?.adjusted) {
    const invalidSuffix = resumeJsonlRepair.invalidLineIndex === null
      ? ''
      : `, invalid line ${formatInteger(resumeJsonlRepair.invalidLineIndex)}`;
    console.log(`  resume JSONL     : ${resumeJsonlRepair.action} (${formatInteger(resumeJsonlRepair.previousRecords)} -> ${formatInteger(resumeJsonlRepair.finalRecords)} record(s)${invalidSuffix})`);
  }
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

    const targetBucketIndices = matchingBucketIndices.filter((bucketIndex) => bucketData[bucketIndex].acceptedSamples < maxSamplesPerBucket);
    if (targetBucketIndices.length === 0) {
      if (bucketData.every((entry) => entry.acceptedSamples >= maxSamplesPerBucket)) {
        stopReason = 'all-buckets-complete';
        throw new Error(STOP);
      }
      return;
    }

    matchedSamples += targetBucketIndices.length;
    const neededDepths = [...new Set(targetBucketIndices.flatMap((bucketIndex) => {
      const spec = calibrationSpecs[bucketIndex];
      return [spec.shallowDepth, spec.deepDepth];
    }))].sort((left, right) => left - right);
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

    const scores = {};
    const searchStats = {};
    const passDepths = [];
    const invalidDepths = [];
    for (const depth of neededDepths) {
      const result = getSearchResult(depth);
      searchStats[String(depth)] = {
        nodes: result.nodes,
        elapsedMs: result.elapsedMs,
        searchCompletion: result.searchCompletion,
      };
      if (result.didPass) {
        passDepths.push(depth);
        continue;
      }
      if (!Number.isFinite(result.score) || result.searchCompletion === 'partial-timeout') {
        invalidDepths.push(depth);
        continue;
      }
      scores[String(depth)] = result.score;
    }

    const contributedBucketKeys = [];
    for (const bucketIndex of targetBucketIndices) {
      const spec = calibrationSpecs[bucketIndex];
      const shallowKey = String(spec.shallowDepth);
      const deepKey = String(spec.deepDepth);
      const shallowResult = getSearchResult(spec.shallowDepth);
      const deepResult = getSearchResult(spec.deepDepth);

      if (!Object.hasOwn(scores, shallowKey) || !Object.hasOwn(scores, deepKey)) {
        bucketData[bucketIndex].skippedPass += shallowResult.didPass || deepResult.didPass ? 1 : 0;
        bucketData[bucketIndex].skippedInvalid += (!Object.hasOwn(scores, shallowKey) || !Object.hasOwn(scores, deepKey)) ? 1 : 0;
        continue;
      }

      bucketData[bucketIndex].acceptedSamples += 1;
      acceptedSamplesTotal += 1;
      contributedBucketKeys.push(spec.key);
      updateSearchCostAccumulator(bucketData[bucketIndex].searchCost.shallow, shallowResult);
      updateSearchCostAccumulator(bucketData[bucketIndex].searchCost.deep, deepResult);
      updateSearchCostAccumulator(globalSearchCost.shallow, shallowResult);
      updateSearchCostAccumulator(globalSearchCost.deep, deepResult);
    }

    if (contributedBucketKeys.length === 0) {
      return;
    }

    const record = {
      sampleIndex,
      empties,
      scores,
      passDepths,
      invalidDepths,
      searchStats,
      contributedBucketKeys,
    };
    await fs.promises.appendFile(outputJsonlPath, `${JSON.stringify(record)}\n`, 'utf8');
    recordsWritten += 1;

    if (maxAcceptedTotal !== null && acceptedSamplesTotal >= maxAcceptedTotal) {
      stopReason = 'max-accepted-total';
      if (checkpointEvery > 0 && acceptedSamplesTotal > lastCheckpointAcceptedSamples) {
        await saveCheckpointState({ completed: false, finalStopReason: stopReason });
        lastCheckpointAcceptedSamples = acceptedSamplesTotal;
      }
      throw new Error(STOP);
    }

    const now = Date.now();
    if (progressEvery > 0
      && recordsWritten > 0
      && (recordsWritten % progressEvery) === 0
      && (now - lastProgressAt) >= 1000) {
      const elapsedSeconds = (now - startedAt) / 1000;
      const rate = recordsWritten / Math.max(1e-9, elapsedSeconds);
      const targetTotal = maxSamplesPerBucket * calibrationSpecs.length;
      const remaining = Math.max(0, targetTotal - acceptedSamplesTotal);
      const etaSeconds = rate > 0 ? remaining / Math.max(1e-9, (acceptedSamplesTotal / Math.max(1e-9, elapsedSeconds))) : null;
      const progressRatio = targetTotal > 0 ? acceptedSamplesTotal / targetTotal : 0;
      const byteProgress = totalBytes > 0 ? totalBytesProcessed / totalBytes : null;
      console.log(`Progress records=${formatInteger(recordsWritten)} | accepted=${formatInteger(acceptedSamplesTotal)}/${formatInteger(targetTotal)} (${percentage(progressRatio)}) | record-rate ${formatRate(rate, 1)} | ETA ${formatDurationSeconds(etaSeconds)} | data ${percentage(byteProgress)}`);
      lastProgressAt = now;
    }

    if (checkpointJsonPath && checkpointEvery > 0 && (acceptedSamplesTotal - lastCheckpointAcceptedSamples) >= checkpointEvery) {
      await saveCheckpointState({ completed: false, finalStopReason: stopReason });
      lastCheckpointAcceptedSamples = acceptedSamplesTotal;
    }

    if (bucketData.every((entry) => entry.acceptedSamples >= maxSamplesPerBucket)) {
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

const summary = {
  version: 1,
  outputJsonlPath,
  source: {
    inputCount: inputFiles.length,
    inputPaths: inputFiles.map((entry) => entry.path),
    estimatedInputSamples: estimatedTotalSamples,
    sampleStride,
    sampleResidue,
    maxSamplesPerBucket,
    timeLimitMs,
    aspirationWindow,
    maxTableEntries,
    bucketPreset,
    evaluationProfileName: evaluationProfile?.name ?? null,
    moveOrderingProfileName: moveOrderingProfile?.name ?? null,
  },
  diagnostics: {
    visitedSamples,
    matchedSamples,
    acceptedSamples: acceptedSamplesTotal,
    recordsWritten,
    resumedFromCheckpoint: resumeFromCheckpoint && Boolean(checkpointState),
    lastProcessedInputSampleIndex,
    stopReason,
    shallowSearchCost: summarizeSearchCost(globalSearchCost.shallow),
    deepSearchCost: summarizeSearchCost(globalSearchCost.deep),
    elapsedSeconds: (Date.now() - startedAt) / 1000,
  },
  calibrations: calibrationSpecs.map((spec, index) => ({
    ...spec,
    acceptedSamples: bucketData[index].acceptedSamples,
    skippedPass: bucketData[index].skippedPass,
    skippedInvalid: bucketData[index].skippedInvalid,
    shallowSearchCost: summarizeSearchCost(bucketData[index].searchCost.shallow),
    deepSearchCost: summarizeSearchCost(bucketData[index].searchCost.deep),
  })),
};

await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
if (checkpointJsonPath) {
  await saveCheckpointState({ completed: stopReason === 'all-buckets-complete', finalStopReason: stopReason });
}

console.log(`\nSaved MPC search pairs to ${outputJsonlPath}`);
console.log(`Saved summary to ${summaryJsonPath}`);
console.log(`Records written : ${formatInteger(recordsWritten)}`);
for (const entry of summary.calibrations) {
  console.log(`  ${entry.label.padEnd(20)} | accepted=${String(entry.acceptedSamples).padStart(4, ' ')} | pass=${String(entry.skippedPass).padStart(3, ' ')} | invalid=${String(entry.skippedInvalid).padStart(3, ' ')}`);
}
