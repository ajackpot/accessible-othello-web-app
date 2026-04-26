#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { SearchEngine } from '../../js/ai/search-engine.js';
import {
  ensureArray,
  formatInteger,
  loadGeneratedProfilesModuleIfPresent,
  parseArgs,
  resolveCliPath,
  resolveProjectPath,
  streamTrainingSamples,
  toPortablePath,
} from './lib.mjs';
import {
  listStage158StructuralCandidates,
  resolveStage158StructuralCandidate,
} from './stage158-structural-candidates.mjs';

const DEFAULT_ORDERING_INPUT = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage29_move_ordering_smoke_input_mixed.jsonl');
const DEFAULT_MPC_INPUT = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage35_mpc_synthetic_18_21.jsonl');
const DEFAULT_OUTPUT_ROOT = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage158-structural-smoke');

const DEFAULT_ORDERING_SEARCH_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 6,
  timeLimitMs: 1400,
  exactEndgameEmpties: 8,
  aspirationWindow: 45,
  randomness: 0,
  maxTableEntries: 160000,
  wldPreExactEmpties: 0,
});

const DEFAULT_MPC_SEARCH_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 8,
  timeLimitMs: 2200,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  randomness: 0,
  maxTableEntries: 180000,
  wldPreExactEmpties: 0,
});

function printUsage() {
  console.log(`Usage:
  node tools/evaluator-training/run-stage158-structural-candidate-smoke.mjs \
    [--family stage154-main-recenter] [--family stage151-split-late3] \
    [--candidate s154-anchor-main] [--candidate s151-anchor-noend] \
    [--ordering-input ${toPortablePath(DEFAULT_ORDERING_INPUT)}] \
    [--mpc-input ${toPortablePath(DEFAULT_MPC_INPUT)}] \
    [--ordering-sample-limit 6] [--mpc-sample-limit 6] \
    [--ordering-depth 6] [--mpc-depth 8] \
    [--ordering-time-limit-ms 1400] [--mpc-time-limit-ms 2200] \
    [--output-root ${toPortablePath(DEFAULT_OUTPUT_ROOT)}] [--skip-aggressive] [--include-retired]

샘플 수준 smoke 전용 러너입니다.
stage29 move-ordering smoke 입력으로 ordering 구조를,
stage35 MPC synthetic 18-21 입력으로 MPC 구조를 각각 거칠게 확인합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function dedupeByKey(values, keySelector) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = keySelector(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function loadLaneSamples(filePath, limit, laneKey) {
  const samples = [];
  await streamTrainingSamples([filePath], { limit }, async (sample) => {
    samples.push(Object.freeze({
      id: `${laneKey}-${sample.lineNumber}`,
      laneKey,
      lineNumber: sample.lineNumber,
      inputPath: sample.filePath,
      emptyCount: sample.state.getEmptyCount(),
      target: sample.target,
      sourceFormat: sample.sourceFormat,
      state: sample.state,
    }));
  });
  return Object.freeze(samples);
}

function createEmptyLaneAccumulator(laneKey) {
  return {
    laneKey,
    sampleCount: 0,
    totalElapsedMs: 0,
    totalNodes: 0,
    totalCompletedDepth: 0,
    totalOrderingSignals: 0,
    totalMpcSignals: 0,
    totalMpcProbes: 0,
    totalMpcVerificationProbes: 0,
    totalMpcVerificationPasses: 0,
    totalMpcVerificationFailures: 0,
    totalOrderingTopKRescores: 0,
    totalOrderingPotentialBonuses: 0,
    totalOrderingFrontierBonuses: 0,
    totalOrderingStabilityBonuses: 0,
    totalOrderingQuietMoveBonuses: 0,
    totalOrderingEdgeEndpointBonuses: 0,
    totalOrderingShallowProbeCalls: 0,
    totalOrderingTtShallowSkips: 0,
    totalMpcStaticEvalSkips: 0,
    totalMpcVolatilitySkips: 0,
    totalMpcZebraLadderSelections: 0,
    totalMpcZebraLadderFiltered: 0,
    totalMpcHighCutoffs: 0,
    totalMpcLowCutoffs: 0,
    completionCount: 0,
    exactCount: 0,
    partialCount: 0,
    bestMoves: [],
    scores: [],
    perSample: [],
  };
}

function finalizeLaneAccumulator(accumulator) {
  const sampleCount = accumulator.sampleCount || 1;
  const totalElapsedMs = accumulator.totalElapsedMs;
  const totalNodes = accumulator.totalNodes;
  return Object.freeze({
    laneKey: accumulator.laneKey,
    sampleCount: accumulator.sampleCount,
    completionRate: accumulator.sampleCount === 0 ? 0 : accumulator.completionCount / accumulator.sampleCount,
    exactRate: accumulator.sampleCount === 0 ? 0 : accumulator.exactCount / accumulator.sampleCount,
    partialRate: accumulator.sampleCount === 0 ? 0 : accumulator.partialCount / accumulator.sampleCount,
    averageElapsedMs: accumulator.sampleCount === 0 ? 0 : accumulator.totalElapsedMs / accumulator.sampleCount,
    averageNodes: accumulator.sampleCount === 0 ? 0 : accumulator.totalNodes / accumulator.sampleCount,
    averageCompletedDepth: accumulator.sampleCount === 0 ? 0 : accumulator.totalCompletedDepth / accumulator.sampleCount,
    nodesPerMs: totalElapsedMs > 0 ? totalNodes / totalElapsedMs : 0,
    orderingSignals: accumulator.totalOrderingSignals,
    mpcSignals: accumulator.totalMpcSignals,
    orderingTopKRescores: accumulator.totalOrderingTopKRescores,
    orderingPotentialBonuses: accumulator.totalOrderingPotentialBonuses,
    orderingFrontierBonuses: accumulator.totalOrderingFrontierBonuses,
    orderingStabilityBonuses: accumulator.totalOrderingStabilityBonuses,
    orderingQuietMoveBonuses: accumulator.totalOrderingQuietMoveBonuses,
    orderingEdgeEndpointBonuses: accumulator.totalOrderingEdgeEndpointBonuses,
    orderingShallowProbeCalls: accumulator.totalOrderingShallowProbeCalls,
    orderingTtShallowSkips: accumulator.totalOrderingTtShallowSkips,
    mpcProbes: accumulator.totalMpcProbes,
    mpcVerificationProbes: accumulator.totalMpcVerificationProbes,
    mpcVerificationPasses: accumulator.totalMpcVerificationPasses,
    mpcVerificationFailures: accumulator.totalMpcVerificationFailures,
    mpcStaticEvalSkips: accumulator.totalMpcStaticEvalSkips,
    mpcVolatilitySkips: accumulator.totalMpcVolatilitySkips,
    mpcZebraLadderSelections: accumulator.totalMpcZebraLadderSelections,
    mpcZebraLadderFiltered: accumulator.totalMpcZebraLadderFiltered,
    mpcHighCutoffs: accumulator.totalMpcHighCutoffs,
    mpcLowCutoffs: accumulator.totalMpcLowCutoffs,
    bestMoves: Object.freeze([...accumulator.bestMoves]),
    scores: Object.freeze([...accumulator.scores]),
    perSample: Object.freeze([...accumulator.perSample]),
  });
}

function makeLaneResultRecord(sample, result) {
  const stats = result.stats ?? {};
  return Object.freeze({
    sampleId: sample.id,
    lineNumber: sample.lineNumber,
    emptyCount: sample.emptyCount,
    bestMoveCoord: result.bestMoveCoord ?? null,
    score: result.score ?? null,
    completedDepth: stats.completedDepth ?? 0,
    elapsedMs: stats.elapsedMs ?? 0,
    nodes: stats.nodes ?? 0,
    searchCompletion: result.searchCompletion ?? null,
    isExactResult: result.isExactResult ?? false,
    orderingTopKRescores: stats.orderingTopKRescores ?? 0,
    orderingPotentialBonuses: stats.orderingPotentialMobilityBonuses ?? 0,
    orderingFrontierBonuses: stats.orderingFrontierBonuses ?? 0,
    orderingStabilityBonuses: stats.orderingStabilityBonuses ?? 0,
    orderingQuietMoveBonuses: stats.orderingQuietMoveBonuses ?? 0,
    orderingEdgeEndpointBonuses: stats.orderingEdgeEndpointBonuses ?? 0,
    orderingShallowProbeCalls: stats.orderingShallowProbeCalls ?? 0,
    orderingTtShallowSkips: stats.orderingTtShallowSkips ?? 0,
    mpcProbes: stats.mpcProbes ?? 0,
    mpcStaticEvalSkips: stats.mpcStaticEvalSkips ?? 0,
    mpcVolatilitySkips: stats.mpcVolatilitySkips ?? 0,
    mpcZebraLadderSelections: stats.mpcZebraLadderSelections ?? 0,
    mpcZebraLadderFiltered: stats.mpcZebraLadderFiltered ?? 0,
    mpcVerificationProbes: stats.mpcVerificationProbes ?? 0,
    mpcVerificationPasses: stats.mpcVerificationPasses ?? 0,
    mpcVerificationFailures: stats.mpcVerificationFailures ?? 0,
    mpcHighCutoffs: stats.mpcHighCutoffs ?? 0,
    mpcLowCutoffs: stats.mpcLowCutoffs ?? 0,
  });
}

function accumulateLaneResult(accumulator, sample, result) {
  const stats = result.stats ?? {};
  const record = makeLaneResultRecord(sample, result);
  accumulator.sampleCount += 1;
  accumulator.totalElapsedMs += Number(stats.elapsedMs ?? 0);
  accumulator.totalNodes += Number(stats.nodes ?? 0);
  accumulator.totalCompletedDepth += Number(stats.completedDepth ?? 0);
  accumulator.totalOrderingTopKRescores += Number(stats.orderingTopKRescores ?? 0);
  accumulator.totalOrderingPotentialBonuses += Number(stats.orderingPotentialMobilityBonuses ?? 0);
  accumulator.totalOrderingFrontierBonuses += Number(stats.orderingFrontierBonuses ?? 0);
  accumulator.totalOrderingStabilityBonuses += Number(stats.orderingStabilityBonuses ?? 0);
  accumulator.totalOrderingQuietMoveBonuses += Number(stats.orderingQuietMoveBonuses ?? 0);
  accumulator.totalOrderingEdgeEndpointBonuses += Number(stats.orderingEdgeEndpointBonuses ?? 0);
  accumulator.totalOrderingShallowProbeCalls += Number(stats.orderingShallowProbeCalls ?? 0);
  accumulator.totalOrderingTtShallowSkips += Number(stats.orderingTtShallowSkips ?? 0);
  accumulator.totalMpcProbes += Number(stats.mpcProbes ?? 0);
  accumulator.totalMpcVerificationProbes += Number(stats.mpcVerificationProbes ?? 0);
  accumulator.totalMpcVerificationPasses += Number(stats.mpcVerificationPasses ?? 0);
  accumulator.totalMpcVerificationFailures += Number(stats.mpcVerificationFailures ?? 0);
  accumulator.totalMpcStaticEvalSkips += Number(stats.mpcStaticEvalSkips ?? 0);
  accumulator.totalMpcVolatilitySkips += Number(stats.mpcVolatilitySkips ?? 0);
  accumulator.totalMpcZebraLadderSelections += Number(stats.mpcZebraLadderSelections ?? 0);
  accumulator.totalMpcZebraLadderFiltered += Number(stats.mpcZebraLadderFiltered ?? 0);
  accumulator.totalMpcHighCutoffs += Number(stats.mpcHighCutoffs ?? 0);
  accumulator.totalMpcLowCutoffs += Number(stats.mpcLowCutoffs ?? 0);
  accumulator.totalOrderingSignals += Number(stats.orderingTopKRescores ?? 0)
    + Number(stats.orderingPotentialMobilityBonuses ?? 0)
    + Number(stats.orderingFrontierBonuses ?? 0)
    + Number(stats.orderingStabilityBonuses ?? 0)
    + Number(stats.orderingQuietMoveBonuses ?? 0)
    + Number(stats.orderingEdgeEndpointBonuses ?? 0)
    + Number(stats.orderingShallowProbeCalls ?? 0)
    + Number(stats.orderingTtShallowSkips ?? 0);
  accumulator.totalMpcSignals += Number(stats.mpcStaticEvalSkips ?? 0)
    + Number(stats.mpcVolatilitySkips ?? 0)
    + Number(stats.mpcZebraLadderSelections ?? 0)
    + Number(stats.mpcZebraLadderFiltered ?? 0)
    + Number(stats.mpcVerificationProbes ?? 0)
    + Number(stats.mpcVerificationPasses ?? 0)
    + Number(stats.mpcVerificationFailures ?? 0);
  if (result.searchCompletion === 'complete') {
    accumulator.completionCount += 1;
  } else {
    accumulator.partialCount += 1;
  }
  if (result.isExactResult === true) {
    accumulator.exactCount += 1;
  }
  accumulator.bestMoves.push(record.bestMoveCoord);
  accumulator.scores.push(record.score);
  accumulator.perSample.push(record);
}

function compareAgainstControl(candidateLane, controlLane) {
  if (!candidateLane || !controlLane) {
    return null;
  }
  const sampleCount = Math.min(candidateLane.perSample.length, controlLane.perSample.length);
  let bestMoveDifferences = 0;
  let scoreDifferences = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const candidateSample = candidateLane.perSample[index];
    const controlSample = controlLane.perSample[index];
    if ((candidateSample?.bestMoveCoord ?? null) !== (controlSample?.bestMoveCoord ?? null)) {
      bestMoveDifferences += 1;
    }
    if ((candidateSample?.score ?? null) !== (controlSample?.score ?? null)) {
      scoreDifferences += 1;
    }
  }
  return Object.freeze({
    sampleCount,
    bestMoveDifferences,
    scoreDifferences,
  });
}

function summarizeCombined(orderingLane, mpcLane) {
  const sampleCount = (orderingLane?.sampleCount ?? 0) + (mpcLane?.sampleCount ?? 0);
  const totalElapsedMs = (orderingLane?.averageElapsedMs ?? 0) * (orderingLane?.sampleCount ?? 0)
    + (mpcLane?.averageElapsedMs ?? 0) * (mpcLane?.sampleCount ?? 0);
  const totalNodes = (orderingLane?.averageNodes ?? 0) * (orderingLane?.sampleCount ?? 0)
    + (mpcLane?.averageNodes ?? 0) * (mpcLane?.sampleCount ?? 0);
  return Object.freeze({
    sampleCount,
    nodesPerMs: totalElapsedMs > 0 ? totalNodes / totalElapsedMs : 0,
    completionRate: sampleCount > 0
      ? (((orderingLane?.completionRate ?? 0) * (orderingLane?.sampleCount ?? 0))
        + ((mpcLane?.completionRate ?? 0) * (mpcLane?.sampleCount ?? 0))) / sampleCount
      : 0,
  });
}

function writeMarkdownSummary(summary) {
  const lines = [];
  lines.push('# Stage158 structural candidate smoke summary');
  lines.push('');
  lines.push('샘플 수준 smoke이므로 strength 판정이 아니라 **구조가 실제로 켜지는지**, **제어군과 다른 수/점수를 내는지**, **rough timing이 어떤지**를 보는 용도입니다.');
  lines.push('');
  for (const family of summary.families) {
    lines.push(`## ${family.label} (${family.key})`);
    lines.push('');
    lines.push('| candidate | tier | risk | move-ordering | MPC | PB window | ord nodes/ms | ord signal | ord move/score diff | mpc nodes/ms | mpc probes | mpc signal | mpc move/score diff |');
    lines.push('|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const result of family.candidates) {
      const orderingDiff = result.orderingVsControl?.bestMoveDifferences ?? 0;
      const orderingScoreDiff = result.orderingVsControl?.scoreDifferences ?? 0;
      const mpcDiff = result.mpcVsControl?.bestMoveDifferences ?? 0;
      const mpcScoreDiff = result.mpcVsControl?.scoreDifferences ?? 0;
      const pbWindow = result.engineOptions?.moveOrderingPatternBankScale === 0
        ? 'off'
        : `${result.engineOptions?.moveOrderingPatternBankMinEmpties ?? 0}-${result.engineOptions?.moveOrderingPatternBankMaxEmpties ?? 18}`;
      lines.push(`| \
\`${result.key}\` | ${result.tier} | ${result.risk} | \
\`${result.moveOrderingStructureProfile.key}\` | \
\`${result.mpcStructureProfile.key}\` | ${pbWindow} | ${result.orderingLane.nodesPerMs.toFixed(2)} | ${formatInteger(result.orderingLane.orderingSignals)} | ${orderingDiff}/${orderingScoreDiff}/${result.orderingVsControl?.sampleCount ?? 0} | ${result.mpcLane.nodesPerMs.toFixed(2)} | ${formatInteger(result.mpcLane.mpcProbes)} | ${formatInteger(result.mpcLane.mpcSignals)} | ${mpcDiff}/${mpcScoreDiff}/${result.mpcVsControl?.sampleCount ?? 0} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const familyFilters = ensureArray(args.family).filter(Boolean);
  const candidateFilters = ensureArray(args.candidate).filter(Boolean);
  const skipAggressive = args['skip-aggressive'] === true;
  const includeRetired = args['include-retired'] === true;
  const orderingInput = resolveCliPath(args['ordering-input'] ?? DEFAULT_ORDERING_INPUT);
  const mpcInput = resolveCliPath(args['mpc-input'] ?? DEFAULT_MPC_INPUT);
  const outputRoot = resolveCliPath(args['output-root'] ?? DEFAULT_OUTPUT_ROOT);
  const orderingSampleLimit = Math.max(1, toFiniteInteger(args['ordering-sample-limit'], 6));
  const mpcSampleLimit = Math.max(1, toFiniteInteger(args['mpc-sample-limit'], 6));
  const orderingOptions = {
    ...DEFAULT_ORDERING_SEARCH_OPTIONS,
    maxDepth: Math.max(2, toFiniteInteger(args['ordering-depth'], DEFAULT_ORDERING_SEARCH_OPTIONS.maxDepth)),
    timeLimitMs: Math.max(50, toFiniteInteger(args['ordering-time-limit-ms'], DEFAULT_ORDERING_SEARCH_OPTIONS.timeLimitMs)),
  };
  const mpcOptions = {
    ...DEFAULT_MPC_SEARCH_OPTIONS,
    maxDepth: Math.max(2, toFiniteInteger(args['mpc-depth'], DEFAULT_MPC_SEARCH_OPTIONS.maxDepth)),
    timeLimitMs: Math.max(50, toFiniteInteger(args['mpc-time-limit-ms'], DEFAULT_MPC_SEARCH_OPTIONS.timeLimitMs)),
  };

  let candidates = [];
  if (candidateFilters.length > 0) {
    candidates = candidateFilters.map((key) => resolveStage158StructuralCandidate(key, { allowRetired: includeRetired }));
  } else if (familyFilters.length > 0) {
    candidates = familyFilters.flatMap((familyKey) => listStage158StructuralCandidates({ familyKey, includeAggressive: !skipAggressive, includeRetired }));
  } else {
    candidates = listStage158StructuralCandidates({ includeAggressive: !skipAggressive, includeRetired });
  }
  candidates = dedupeByKey(candidates, (candidate) => candidate.key);
  if (candidates.length === 0) {
    throw new Error('No structural candidates selected.');
  }

  await ensureDirectory(outputRoot);
  const candidateOutputRoot = path.join(outputRoot, 'candidates');
  await ensureDirectory(candidateOutputRoot);

  const orderingSamples = await loadLaneSamples(orderingInput, orderingSampleLimit, 'ordering');
  const mpcSamples = await loadLaneSamples(mpcInput, mpcSampleLimit, 'mpc');
  if (orderingSamples.length === 0 || mpcSamples.length === 0) {
    throw new Error('Smoke inputs produced no samples.');
  }

  const moduleCache = new Map();
  async function loadModuleProfiles(modulePath) {
    if (!moduleCache.has(modulePath)) {
      moduleCache.set(modulePath, await loadGeneratedProfilesModuleIfPresent(modulePath));
    }
    return moduleCache.get(modulePath);
  }

  const rawResults = [];
  for (const candidate of candidates) {
    const moduleProfiles = await loadModuleProfiles(candidate.moduleAbsolutePath);
    const sharedOptions = {
      evaluationProfile: moduleProfiles.evaluationProfile,
      moveOrderingProfile: moduleProfiles.moveOrderingProfile,
      tupleResidualProfile: moduleProfiles.tupleResidualProfile,
      mpcProfile: moduleProfiles.mpcProfile,
      patternBankProfiles: moduleProfiles.patternBankProfiles,
      moveOrderingPatternBankProfiles: moduleProfiles.moveOrderingPatternBankProfiles,
      ...(candidate.engineOptions ?? {}),
      moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
      mpcStructureProfile: candidate.mpcStructureProfile,
    };

    const orderingAccumulator = createEmptyLaneAccumulator('ordering');
    for (const sample of orderingSamples) {
      const engine = new SearchEngine({ ...orderingOptions, ...sharedOptions });
      const result = engine.findBestMove(sample.state);
      accumulateLaneResult(orderingAccumulator, sample, result);
    }
    const orderingLane = finalizeLaneAccumulator(orderingAccumulator);

    const mpcAccumulator = createEmptyLaneAccumulator('mpc');
    for (const sample of mpcSamples) {
      const engine = new SearchEngine({ ...mpcOptions, ...sharedOptions });
      const result = engine.findBestMove(sample.state);
      accumulateLaneResult(mpcAccumulator, sample, result);
    }
    const mpcLane = finalizeLaneAccumulator(mpcAccumulator);

    const engineOptionsJson = {
      ...(candidate.engineOptions ?? {}),
      moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
      mpcStructureProfile: candidate.mpcStructureProfile,
    };
    const candidateDir = path.join(candidateOutputRoot, candidate.key);
    await ensureDirectory(candidateDir);
    const engineOptionsPath = path.join(candidateDir, 'engine-options.json');
    const candidateJsonPath = path.join(candidateDir, 'candidate.json');
    await fs.promises.writeFile(engineOptionsPath, `${JSON.stringify(engineOptionsJson, null, 2)}\n`, 'utf8');
    await fs.promises.writeFile(candidateJsonPath, `${JSON.stringify({
      key: candidate.key,
      familyKey: candidate.familyKey,
      familyLabel: candidate.family.label,
      priority: candidate.priority,
      tier: candidate.tier,
      risk: candidate.risk,
      retired: candidate.retired,
      notes: candidate.notes,
      modulePath: candidate.modulePath,
      moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
      mpcStructureProfile: candidate.mpcStructureProfile,
      engineOptions: candidate.engineOptions ?? null,
    }, null, 2)}\n`, 'utf8');

    rawResults.push(Object.freeze({
      key: candidate.key,
      familyKey: candidate.familyKey,
      familyLabel: candidate.family.label,
      priority: candidate.priority,
      tier: candidate.tier,
      risk: candidate.risk,
      notes: candidate.notes,
      modulePath: toPortablePath(path.relative(resolveProjectPath(), candidate.moduleAbsolutePath) || candidate.moduleAbsolutePath),
      moveOrderingStructureProfile: candidate.moveOrderingStructureProfile,
      mpcStructureProfile: candidate.mpcStructureProfile,
      engineOptions: candidate.engineOptions ?? null,
      engineOptionsPath: toPortablePath(path.relative(resolveProjectPath(), engineOptionsPath)),
      candidateJsonPath: toPortablePath(path.relative(resolveProjectPath(), candidateJsonPath)),
      orderingLane,
      mpcLane,
      combined: summarizeCombined(orderingLane, mpcLane),
    }));
    console.log(`[smoke] ${candidate.key}: ord ${orderingLane.nodesPerMs.toFixed(2)} n/ms, mpc ${mpcLane.nodesPerMs.toFixed(2)} n/ms`);
  }

  const resultsByFamily = new Map();
  for (const result of rawResults) {
    if (!resultsByFamily.has(result.familyKey)) {
      resultsByFamily.set(result.familyKey, []);
    }
    resultsByFamily.get(result.familyKey).push(result);
  }

  const familySummaries = [];
  for (const [familyKey, familyResults] of resultsByFamily.entries()) {
    familyResults.sort((left, right) => left.priority - right.priority || left.key.localeCompare(right.key));
    const control = familyResults.find((candidate) => candidate.tier === 'control') ?? familyResults[0] ?? null;
    familySummaries.push(Object.freeze({
      key: familyKey,
      label: familyResults[0]?.familyLabel ?? familyKey,
      controlCandidateKey: control?.key ?? null,
      candidates: familyResults.map((candidate) => Object.freeze({
        ...candidate,
        orderingVsControl: compareAgainstControl(candidate.orderingLane, control?.orderingLane ?? null),
        mpcVsControl: compareAgainstControl(candidate.mpcLane, control?.mpcLane ?? null),
      })),
    }));
  }
  familySummaries.sort((left, right) => left.key.localeCompare(right.key));

  const summary = Object.freeze({
    generatedAt: new Date().toISOString(),
    purpose: 'stage158 structural move-ordering + MPC smoke',
    caveat: 'sample-level smoke only; not a strength benchmark',
    inputs: Object.freeze({
      orderingInput: toPortablePath(path.relative(resolveProjectPath(), orderingInput) || orderingInput),
      mpcInput: toPortablePath(path.relative(resolveProjectPath(), mpcInput) || mpcInput),
      orderingSampleLimit,
      mpcSampleLimit,
      includeRetired,
    }),
    orderingSearchOptions: Object.freeze(orderingOptions),
    mpcSearchOptions: Object.freeze(mpcOptions),
    families: Object.freeze(familySummaries),
  });

  const summaryJsonPath = path.join(outputRoot, 'stage158_structural_smoke_summary.json');
  const summaryMdPath = path.join(outputRoot, 'stage158_structural_smoke_summary.md');
  await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.promises.writeFile(summaryMdPath, writeMarkdownSummary(summary), 'utf8');

  console.log(`\nSaved:`);
  console.log(`  ${toPortablePath(path.relative(resolveProjectPath(), summaryJsonPath))}`);
  console.log(`  ${toPortablePath(path.relative(resolveProjectPath(), summaryMdPath))}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
