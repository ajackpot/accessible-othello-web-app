#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import {
  collectInputFileEntries,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatDurationSeconds,
  formatInteger,
  formatRate,
  parseArgs,
  percentage,
  resolveCliPath,
  resolveTrainingOutputPath,
} from './lib.mjs';
import {
  buildCalibrationIndexLookupTable,
  createSearchCostAccumulator,
  evaluateAdaptiveBucketStop,
  listCalibrationBucketPresetKeys,
  lookupCalibrationIndices,
  parseCalibrationSpecs,
  parseZValues,
  shouldUseHoldout,
  summarizeCalibrationBucket,
  summarizeSearchCost,
  updateSearchCostAccumulator,
} from './mpc-training-lib.mjs';

const STOP = '__STOP_MPC_FIT_FROM_PAIRS__';

function printUsage() {
  const toolPath = displayTrainingToolPath('fit-mpc-profile-from-search-pairs.mjs');
  const outputJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --search-pairs-jsonl <file-or-dir> [--search-pairs-jsonl <file-or-dir> ...] \
    [--calibration-buckets 18-21:4>8,22-25:4>9,26-29:5>10,30-33:6>11] \
    [--bucket-preset baseline-4|compact-4|overlap-8|split-stage-8|zebra-ladder-8] \
    [--max-samples-per-bucket 400] \
    [--holdout-mod 10] [--holdout-residue 0] [--target-holdout-coverage 0.99] \
    [--z-values 1,1.5,1.96,2.5,3] \
    [--adaptive-stop] [--adaptive-min-samples-per-bucket 160] [--adaptive-check-every 20] \
    [--max-accepted-total 200] \
    [--output-json ${outputJsonPath}]

미리 계산된 search pair JSONL에서 MPC/ProbCut 회귀만 다시 피팅합니다.
search pair를 여러 후보가 공유할 때 반복 탐색 비용을 제거하는 용도입니다.

사용 가능한 bucket preset: ${listCalibrationBucketPresetKeys().join(', ')}
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

function createEmptyBucketState() {
  return {
    sampleIndex: 0,
    acceptedSamples: 0,
    trainSamples: [],
    holdoutSamples: [],
    skippedMissing: 0,
    closed: false,
    closedReason: null,
    searchCost: {
      shallow: createSearchCostAccumulator(),
      deep: createSearchCostAccumulator(),
    },
  };
}

async function streamPairRecords(files, onRecord) {
  for (const entry of files) {
    const stream = fs.createReadStream(entry.path, 'utf8');
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineIndex = 0;
    for await (const line of rl) {
      lineIndex += 1;
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        throw new Error(`Invalid JSONL in ${entry.path}:${lineIndex} - ${error.message}`);
      }
      await onRecord(parsed, { filePath: entry.path, lineIndex });
    }
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const requestedInputs = ensureArray(args['search-pairs-jsonl']).concat(ensureArray(args.input));
if (requestedInputs.length === 0) {
  printUsage();
  throw new Error('적어도 하나의 --search-pairs-jsonl 경로를 지정해야 합니다.');
}

const calibrationSpecs = parseCalibrationSpecs(args['calibration-buckets'], { bucketPreset: args['bucket-preset'] });
const zValues = parseZValues(args['z-values']);
const bucketPreset = typeof args['bucket-preset'] === 'string' ? args['bucket-preset'].trim().toLowerCase() : null;
const maxSamplesPerBucket = Math.max(1, Math.trunc(toFiniteInteger(args['max-samples-per-bucket'], 400)));
const holdoutMod = Math.max(0, Math.trunc(toFiniteInteger(args['holdout-mod'], 10)));
const holdoutResidue = Math.max(0, Math.trunc(toFiniteInteger(args['holdout-residue'], 0)));
const targetHoldoutCoverage = Math.max(0.5, Math.min(0.9999, toFiniteNumber(args['target-holdout-coverage'], 0.99)));
const adaptiveStopEnabled = Boolean(args['adaptive-stop']);
const adaptiveMinSamplesPerBucket = Math.max(10, Math.trunc(toFiniteInteger(args['adaptive-min-samples-per-bucket'], 160)));
const adaptiveCheckEvery = Math.max(1, Math.trunc(toFiniteInteger(args['adaptive-check-every'], 20)));
const maxAcceptedTotal = args['max-accepted-total'] === undefined
  ? null
  : Math.max(1, Math.trunc(toFiniteInteger(args['max-accepted-total'], 1)));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveTrainingOutputPath('trained-mpc-profile.json');
const profileName = typeof args.name === 'string' ? args.name : 'calibrated-mpc-profile-v1';
const description = typeof args.description === 'string'
  ? args.description
  : 'precomputed shallow/deep search pair 기반 MPC/ProbCut 보정 프로필입니다.';

const inputFiles = await collectInputFileEntries(requestedInputs);
if (inputFiles.length === 0) {
  throw new Error('search pair 입력 파일을 찾지 못했습니다.');
}

const calibrationIndexLookupTable = buildCalibrationIndexLookupTable(calibrationSpecs);
const bucketData = calibrationSpecs.map(() => createEmptyBucketState());
const globalSearchCost = {
  shallow: createSearchCostAccumulator(),
  deep: createSearchCostAccumulator(),
};

const startedAt = Date.now();
let visitedRecords = 0;
let matchedRecords = 0;
let acceptedSamplesTotal = 0;
let lastProgressAt = startedAt;
let stopReason = null;

console.log('MPC fit-from-pairs start');
console.log(`  search pairs     : ${inputFiles.length} file(s)`);
console.log(`  calibration specs: ${calibrationSpecs.map((spec) => `${spec.minEmpties}-${spec.maxEmpties}:d${spec.shallowDepth}>d${spec.deepDepth}`).join(', ')}`);
console.log(`  bucket preset    : ${bucketPreset ?? 'custom/default'}`);
console.log(`  max/bucket       : ${formatInteger(maxSamplesPerBucket)}`);
console.log(`  adaptive stop    : ${adaptiveStopEnabled ? `on (min=${adaptiveMinSamplesPerBucket}, every=${adaptiveCheckEvery})` : 'off'}`);
console.log(`  target coverage  : ${percentage(targetHoldoutCoverage)}`);

try {
  await streamPairRecords(inputFiles, async (record) => {
    visitedRecords += 1;
    const empties = Number(record?.empties);
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

    matchedRecords += targetBucketIndices.length;
    const scores = record?.scores && typeof record.scores === 'object' ? record.scores : {};
    const searchStats = record?.searchStats && typeof record.searchStats === 'object' ? record.searchStats : {};

    for (const bucketIndex of targetBucketIndices) {
      const bucket = bucketData[bucketIndex];
      const spec = calibrationSpecs[bucketIndex];
      const shallowKey = String(spec.shallowDepth);
      const deepKey = String(spec.deepDepth);
      if (!Object.hasOwn(scores, shallowKey) || !Object.hasOwn(scores, deepKey)) {
        bucket.skippedMissing += 1;
        continue;
      }

      const shallowScore = Number(scores[shallowKey]);
      const deepScore = Number(scores[deepKey]);
      if (!Number.isFinite(shallowScore) || !Number.isFinite(deepScore)) {
        bucket.skippedMissing += 1;
        continue;
      }

      const sampleRecord = {
        sampleIndex: Number.isFinite(record?.sampleIndex) ? Math.trunc(record.sampleIndex) : bucket.sampleIndex,
        empties,
        shallowScore,
        deepScore,
      };
      bucket.sampleIndex += 1;
      bucket.acceptedSamples += 1;
      acceptedSamplesTotal += 1;

      const shallowStats = searchStats[shallowKey];
      const deepStats = searchStats[deepKey];
      if (shallowStats) {
        updateSearchCostAccumulator(bucket.searchCost.shallow, shallowStats);
        updateSearchCostAccumulator(globalSearchCost.shallow, shallowStats);
      }
      if (deepStats) {
        updateSearchCostAccumulator(bucket.searchCost.deep, deepStats);
        updateSearchCostAccumulator(globalSearchCost.deep, deepStats);
      }

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
        throw new Error(STOP);
      }
    }

    const now = Date.now();
    if ((visitedRecords % 1000) === 0 && (now - lastProgressAt) >= 1000) {
      const elapsedSeconds = (now - startedAt) / 1000;
      const rate = visitedRecords / Math.max(1e-9, elapsedSeconds);
      const targetTotal = bucketData.reduce((sum, bucket) => sum + (bucket.closed ? bucket.acceptedSamples : maxSamplesPerBucket), 0);
      const remaining = Math.max(0, targetTotal - acceptedSamplesTotal);
      const etaSeconds = rate > 0 ? remaining / Math.max(1e-9, (acceptedSamplesTotal / Math.max(1e-9, elapsedSeconds))) : null;
      const progressRatio = targetTotal > 0 ? acceptedSamplesTotal / targetTotal : 0;
      console.log(`Progress records=${formatInteger(visitedRecords)} | accepted=${formatInteger(acceptedSamplesTotal)}/${formatInteger(targetTotal)} (${percentage(progressRatio)}) | record-rate ${formatRate(rate, 1)} | ETA ${formatDurationSeconds(etaSeconds)}`);
      lastProgressAt = now;
    }

    if (bucketData.every((entry) => entry.closed || entry.acceptedSamples >= maxSamplesPerBucket)) {
      stopReason = 'all-buckets-complete';
      throw new Error(STOP);
    }
  });
} catch (error) {
  if (error?.message !== STOP) {
    throw error;
  }
}

if (stopReason === null) {
  stopReason = 'input-exhausted';
}

const calibrations = calibrationSpecs.map((spec, index) => {
  const summary = summarizeCalibrationBucket(spec, bucketData[index], {
    targetHoldoutCoverage,
    zValues,
  });
  return {
    ...summary,
    skippedMissing: bucketData[index].skippedMissing,
  };
});

const usableCount = calibrations.filter((entry) => entry.usable).length;
const output = {
  version: 1,
  name: profileName,
  description,
  source: {
    searchPairsInputCount: inputFiles.length,
    searchPairsInputPaths: inputFiles.map((entry) => entry.path),
    maxSamplesPerBucket,
    holdoutMod,
    holdoutResidue,
    zValues,
    targetHoldoutCoverage,
    bucketPreset,
    adaptiveStopEnabled,
    adaptiveMinSamplesPerBucket,
    adaptiveCheckEvery,
  },
  diagnostics: {
    visitedRecords,
    matchedRecords,
    acceptedSamples: acceptedSamplesTotal,
    usableCalibrationCount: usableCount,
    shallowSearchCost: summarizeSearchCost(globalSearchCost.shallow),
    deepSearchCost: summarizeSearchCost(globalSearchCost.deep),
    stopReason,
    elapsedSeconds: (Date.now() - startedAt) / 1000,
  },
  calibrations,
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`\nSaved fitted MPC profile to ${outputJsonPath}`);
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
