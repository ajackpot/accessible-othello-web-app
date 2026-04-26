import {
  createMetricAccumulator,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
} from './lib.mjs';

const DEFAULT_CALIBRATION_SPECS = Object.freeze([
  Object.freeze({ key: 'mpc-18-21-d4-d8', minEmpties: 18, maxEmpties: 21, shallowDepth: 4, deepDepth: 8, label: '18-21 / d4→d8' }),
  Object.freeze({ key: 'mpc-22-25-d4-d8', minEmpties: 22, maxEmpties: 25, shallowDepth: 4, deepDepth: 8, label: '22-25 / d4→d8' }),
  Object.freeze({ key: 'mpc-26-29-d6-d10', minEmpties: 26, maxEmpties: 29, shallowDepth: 6, deepDepth: 10, label: '26-29 / d6→d10' }),
  Object.freeze({ key: 'mpc-30-33-d6-d10', minEmpties: 30, maxEmpties: 33, shallowDepth: 6, deepDepth: 10, label: '30-33 / d6→d10' }),
]);

const OVERLAP_8_SPEC_TOKENS = Object.freeze([
  '18-21:3>7',
  '18-21:4>8',
  '22-25:4>8',
  '22-25:4>9',
  '26-29:5>10',
  '26-29:6>10',
  '30-33:5>11',
  '30-33:6>10',
]);

const SPLIT_STAGE_8_SPEC_TOKENS = Object.freeze([
  '18-19:3>7',
  '20-21:4>8',
  '22-23:4>8',
  '24-25:4>9',
  '26-27:5>10',
  '28-29:6>10',
  '30-31:5>11',
  '32-33:6>10',
]);

const ZEBRA_LADDER_8_SPEC_TOKENS = Object.freeze([
  '18-21:2>8',
  '18-21:4>8',
  '22-25:3>9',
  '22-25:5>9',
  '26-29:4>10',
  '26-29:6>10',
  '30-33:4>11',
  '30-33:6>11',
]);

const COMPACT_4_SPEC_TOKENS = Object.freeze([
  '18-21:4>8',
  '22-25:4>9',
  '26-29:5>10',
  '30-33:6>11',
]);

export const MPC_CALIBRATION_BUCKET_PRESETS = Object.freeze({
  'baseline-4': DEFAULT_CALIBRATION_SPECS,
  'compact-4': Object.freeze(parseCalibrationSpecTokens(COMPACT_4_SPEC_TOKENS)),
  'overlap-8': Object.freeze(parseCalibrationSpecTokens(OVERLAP_8_SPEC_TOKENS)),
  'split-stage-8': Object.freeze(parseCalibrationSpecTokens(SPLIT_STAGE_8_SPEC_TOKENS)),
  'zebra-ladder-8': Object.freeze(parseCalibrationSpecTokens(ZEBRA_LADDER_8_SPEC_TOKENS)),
});

export const DEFAULT_Z_VALUES = Object.freeze([1.0, 1.5, 1.96, 2.5, 3.0]);

function finalizeCalibrationSpecs(specs) {
  const normalized = specs.map((spec, index) => Object.freeze({
    key: spec.key ?? `mpc-${spec.minEmpties}-${spec.maxEmpties}-d${spec.shallowDepth}-d${spec.deepDepth}`,
    minEmpties: spec.minEmpties,
    maxEmpties: spec.maxEmpties,
    shallowDepth: spec.shallowDepth,
    deepDepth: spec.deepDepth,
    label: spec.label ?? `${spec.minEmpties}-${spec.maxEmpties} / d${spec.shallowDepth}→d${spec.deepDepth}`,
    order: Number.isInteger(spec.order) ? spec.order : index,
  }));

  normalized.sort((left, right) => {
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
  return Object.freeze(normalized);
}

function parseCalibrationSpecToken(token, index = 0) {
  const match = /^(\d+)(?:-(\d+))?:(\d+)>(\d+)$/.exec(String(token).trim());
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
  return {
    key: `mpc-${minEmpties}-${maxEmpties}-d${shallowDepth}-d${deepDepth}`,
    minEmpties,
    maxEmpties,
    shallowDepth,
    deepDepth,
    label: `${minEmpties}-${maxEmpties} / d${shallowDepth}→d${deepDepth}`,
    order: index,
  };
}

export function parseCalibrationSpecTokens(tokens) {
  return finalizeCalibrationSpecs(tokens.map((token, index) => parseCalibrationSpecToken(token, index)));
}

export function listCalibrationBucketPresetKeys() {
  return Object.keys(MPC_CALIBRATION_BUCKET_PRESETS);
}

export function resolveCalibrationBucketPreset(presetKey) {
  if (typeof presetKey !== 'string' || presetKey.trim() === '') {
    return null;
  }
  const normalized = presetKey.trim().toLowerCase();
  return MPC_CALIBRATION_BUCKET_PRESETS[normalized] ?? null;
}

export function parseCalibrationSpecs(value, { bucketPreset = null } = {}) {
  if (typeof value === 'string' && value.trim() !== '') {
    return parseCalibrationSpecTokens(value.split(',').map((token) => token.trim()).filter(Boolean));
  }
  const presetSpecs = resolveCalibrationBucketPreset(bucketPreset);
  if (presetSpecs) {
    return presetSpecs;
  }
  return DEFAULT_CALIBRATION_SPECS;
}

export function parseZValues(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_Z_VALUES;
  }
  const values = [...new Set(value.split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0))]
    .sort((left, right) => left - right);
  return values.length > 0 ? Object.freeze(values) : DEFAULT_Z_VALUES;
}

export function buildCalibrationIndexLookupTable(specs) {
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

export function lookupCalibrationIndices(calibrationIndexLookupTable, empties) {
  if (!Number.isFinite(empties)) {
    return [];
  }
  const normalized = Math.max(0, Math.min(60, Math.round(empties)));
  return calibrationIndexLookupTable[normalized] ?? [];
}

export function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

export function fitLinearRegression(samples) {
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

export function summarizeResidualMetrics(samples, regression) {
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

export function summarizeZCoverage(samples, regression, trainMetrics, zValues) {
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

export function chooseRecommendedZ(zCoverage, targetCoverage) {
  const passing = zCoverage.find((entry) => Number.isFinite(entry.coverage) && entry.coverage >= targetCoverage);
  if (passing) {
    return passing;
  }
  const fallback = [...zCoverage].reverse().find((entry) => Number.isFinite(entry.coverage));
  return fallback ?? null;
}

export function summarizeSearchCost(searchStats) {
  return {
    searches: searchStats.searches,
    nodes: searchStats.nodes,
    elapsedMs: searchStats.elapsedMs,
    averageNodesPerSearch: searchStats.searches > 0 ? searchStats.nodes / searchStats.searches : null,
    averageElapsedMsPerSearch: searchStats.searches > 0 ? searchStats.elapsedMs / searchStats.searches : null,
  };
}

export function createSearchCostAccumulator() {
  return {
    searches: 0,
    nodes: 0,
    elapsedMs: 0,
  };
}

export function updateSearchCostAccumulator(accumulator, searchResult) {
  accumulator.searches += 1;
  accumulator.nodes += Number(searchResult?.nodes ?? 0);
  accumulator.elapsedMs += Number(searchResult?.elapsedMs ?? 0);
}

export function summarizeCalibrationBucket(spec, bucket, {
  targetHoldoutCoverage,
  zValues,
  minRegressionSamples = 10,
  minCorrelation = 0.7,
  minCoverageFloor = 0.95,
} = {}) {
  const regression = fitLinearRegression(bucket.trainSamples);
  const trainMetrics = summarizeResidualMetrics(bucket.trainSamples, regression);
  const holdoutMetrics = summarizeResidualMetrics(bucket.holdoutSamples, regression);
  const zCoverage = summarizeZCoverage(bucket.holdoutSamples, regression, trainMetrics, zValues);
  const recommendedZ = chooseRecommendedZ(zCoverage, targetHoldoutCoverage);
  const usable = Boolean(
    regression
    && regression.sampleCount >= minRegressionSamples
    && Number.isFinite(regression.slope)
    && regression.slope > 0
    && (regression.correlation ?? 0) >= minCorrelation
    && Number.isFinite(recommendedZ?.coverage)
    && recommendedZ.coverage >= Math.min(targetHoldoutCoverage, minCoverageFloor)
  );

  return {
    key: spec.key,
    label: spec.label,
    minEmpties: spec.minEmpties,
    maxEmpties: spec.maxEmpties,
    shallowDepth: spec.shallowDepth,
    deepDepth: spec.deepDepth,
    sampleCount: bucket.acceptedSamples,
    trainSampleCount: bucket.trainSamples.length,
    holdoutSampleCount: bucket.holdoutSamples.length,
    skippedPass: bucket.skippedPass,
    skippedInvalid: bucket.skippedInvalid,
    usable,
    regression,
    trainMetrics,
    holdoutMetrics,
    zCoverage,
    recommendedZ,
    shallowSearchCost: summarizeSearchCost(bucket.searchCost?.shallow ?? createSearchCostAccumulator()),
    deepSearchCost: summarizeSearchCost(bucket.searchCost?.deep ?? createSearchCostAccumulator()),
    closedEarly: Boolean(bucket.closed),
    closedReason: bucket.closedReason ?? null,
  };
}

export function evaluateAdaptiveBucketStop(spec, bucket, {
  enabled = false,
  minSamplesPerBucket = 120,
  checkEvery = 20,
  targetHoldoutCoverage = 0.99,
  zValues = DEFAULT_Z_VALUES,
} = {}) {
  if (!enabled) {
    return null;
  }
  if ((bucket.acceptedSamples ?? 0) < minSamplesPerBucket) {
    return null;
  }
  if (checkEvery > 1 && ((bucket.acceptedSamples ?? 0) % checkEvery) !== 0) {
    return null;
  }
  const summary = summarizeCalibrationBucket(spec, bucket, { targetHoldoutCoverage, zValues });
  return summary.usable ? summary : null;
}
