#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  RUNTIME_EVALUATION_PROFILE,
  RUNTIME_MOVE_ORDERING_PROFILE,
  RUNTIME_MPC_PROFILE,
  RUNTIME_PATTERN_BANK_PROFILES,
  RUNTIME_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { GameState, createStateHistoryFromMoveSequence } from '../../js/core/game-state.js';
import { selectRandomXotOpening } from '../../js/data/xot-openings-small.js';
import { createSeededRandom } from '../../js/test/benchmark-helpers.mjs';
import { parseArgs } from '../evaluator-training/lib.mjs';
import { loadProfileVariant } from './lib-profile-variants.mjs';

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/audit-stage154-pattern-assets.mjs \
    [--main-generated-module tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js] \
    [--main-engine-options tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-main.json] \
    [--wide-generated-module tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-wide-safe.generated.js] \
    [--wide-engine-options tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-wide-safe.json] \
    [--sample-seeds 64] [--sample-plies 24,28,32] \
    [--output-dir tools/engine-match/out/_stage166_pattern_audit]`);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(1, Math.round(parsed));
  }
  return fallback;
}

function parseIntegerList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0)
    .map((item) => Math.round(item));
  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function advanceOpeningRandomly(state, moves, random, targetPlies) {
  let nextState = state;
  const nextMoves = Array.isArray(moves) ? [...moves] : [];
  let guard = 0;
  while (!nextState.isTerminal() && nextMoves.length < targetPlies) {
    const legalMoves = nextState.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    if (legalMoves.length === 0) {
      nextState = nextState.passTurn();
      nextMoves.push(`${nextState.getOpponentColor(nextState.currentPlayer)}:pass`);
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded guard while handling passes.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    nextMoves.push(`${nextState.currentPlayer}:${chosen.coord}`);
    nextState = nextState.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return { state: nextState, moves: nextMoves };
}

function createXotOpeningState(seed, openingPlies = 8) {
  const random = createSeededRandom(seed);
  const { index, sequence } = selectRandomXotOpening(random());
  const history = createStateHistoryFromMoveSequence(sequence);
  const initialState = history.at(-1) ?? GameState.initial();
  const initialMoves = Array.isArray(initialState.moveHistory)
    ? initialState.moveHistory.map((action) => action?.type === 'pass' ? `${action.color}:pass` : `${action.color}:${action.coord}`)
    : [];
  const targetPlies = Math.max(initialMoves.length, Number.isFinite(openingPlies) ? openingPlies : initialMoves.length);
  const advanced = advanceOpeningRandomly(initialState, initialMoves, random, targetPlies);
  return {
    state: advanced.state,
    openingMoves: advanced.moves,
    openingPliesCompleted: advanced.moves.length,
    openingSeed: seed,
    xotIndex: index + 1,
    xotSequence: sequence,
  };
}

function createActiveEngine() {
  return new SearchEngine({
    evaluationProfile: RUNTIME_EVALUATION_PROFILE,
    moveOrderingProfile: RUNTIME_MOVE_ORDERING_PROFILE,
    tupleResidualProfile: RUNTIME_TUPLE_RESIDUAL_PROFILE,
    mpcProfile: RUNTIME_MPC_PROFILE,
    patternBankProfiles: RUNTIME_PATTERN_BANK_PROFILES,
    maxDepth: 1,
    timeLimitMs: 1,
  });
}

function createVariantEngine(variant) {
  return new SearchEngine({
    ...(variant.engineOptions ?? {}),
    evaluationProfile: variant.evaluationProfile,
    moveOrderingProfile: variant.moveOrderingProfile,
    tupleResidualProfile: variant.tupleResidualProfile,
    mpcProfile: variant.mpcProfile,
    patternBankProfiles: variant.patternBankProfiles,
    moveOrderingPatternBankProfiles: variant.moveOrderingPatternBankProfiles,
    maxDepth: 1,
    timeLimitMs: 1,
  });
}

function summarizePatternBankProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return {
      profileName: null,
      bucketCount: 0,
      boardDependentBucketCount: 0,
      biasOnlyBucketCount: 0,
      buckets: [],
    };
  }

  const buckets = Array.isArray(profile.trainedBuckets) ? profile.trainedBuckets : [];
  const summarizedBuckets = buckets.map((bucket) => {
    const hasPatternWeights = Array.isArray(bucket?.patternWeights) && bucket.patternWeights.some(Boolean);
    const factorized = profile?.factorized && typeof profile.factorized === 'object' ? profile.factorized : null;
    const hasFactorizedPayload = Boolean(bucket?.factorized)
      || (Array.isArray(factorized?.tableNonZeroCounts)
        && factorized.tableNonZeroCounts.some((count) => Number(count) > 0)
        && typeof factorized?.indicesBase64 === 'string'
        && factorized.indicesBase64.length > 0
        && typeof factorized?.valuesBase64 === 'string'
        && factorized.valuesBase64.length > 0);
    const boardDependent = hasPatternWeights || hasFactorizedPayload;
    return {
      key: bucket?.key ?? null,
      label: bucket?.label ?? null,
      minEmpties: Number.isFinite(bucket?.minEmpties) ? bucket.minEmpties : null,
      maxEmpties: Number.isFinite(bucket?.maxEmpties) ? bucket.maxEmpties : null,
      bias: Number.isFinite(bucket?.bias) ? bucket.bias : 0,
      scale: Number.isFinite(bucket?.scale) ? bucket.scale : 1,
      hasPatternWeights,
      hasFactorizedPayload,
      boardDependent,
      kind: boardDependent ? 'board-dependent' : 'bias-only',
    };
  });

  const boardDependentBucketCount = summarizedBuckets.filter((bucket) => bucket.boardDependent).length;
  return {
    profileName: profile?.name ?? null,
    bucketCount: summarizedBuckets.length,
    boardDependentBucketCount,
    biasOnlyBucketCount: summarizedBuckets.length - boardDependentBucketCount,
    buckets: summarizedBuckets,
  };
}

function calculatePatternComposite(engine, state) {
  const explanation = engine.evaluator.explainFeatures(state, state.currentPlayer);
  const options = engine.evaluator.options ?? {};
  const edgeContribution = (explanation.edgePattern ?? 0)
    * (explanation.effectiveWeights?.edgePattern ?? 0)
    * (options.edgePatternScale ?? 1);
  const cornerContribution = (explanation.cornerPattern ?? 0)
    * (explanation.effectiveWeights?.cornerPattern ?? 0)
    * (options.cornerPatternScale ?? 1);
  const tuplePatternContribution = explanation.tupleResidualPatternContribution ?? 0;
  const patternBankContribution = explanation.patternBankContribution ?? 0;
  return {
    staticScore: engine.evaluator.evaluate(state, state.currentPlayer),
    phaseBucketKey: explanation.phaseBucketKey ?? null,
    empties: explanation.empties ?? state.getEmptyCount(),
    edgeContribution,
    cornerContribution,
    tuplePatternContribution,
    patternBankContribution,
    patternComposite: edgeContribution + cornerContribution + tuplePatternContribution + patternBankContribution,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const mainGeneratedModule = typeof args['main-generated-module'] === 'string' && args['main-generated-module'].trim() !== ''
  ? args['main-generated-module']
  : 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js';
const mainEngineOptions = typeof args['main-engine-options'] === 'string' && args['main-engine-options'].trim() !== ''
  ? args['main-engine-options']
  : 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-main.json';
const wideGeneratedModule = typeof args['wide-generated-module'] === 'string' && args['wide-generated-module'].trim() !== ''
  ? args['wide-generated-module']
  : 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-wide-safe.generated.js';
const wideEngineOptions = typeof args['wide-engine-options'] === 'string' && args['wide-engine-options'].trim() !== ''
  ? args['wide-engine-options']
  : 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-wide-safe.json';
const sampleSeeds = toPositiveInteger(args['sample-seeds'], 64);
const samplePlies = parseIntegerList(args['sample-plies'], [24, 28, 32]);
const outputDir = path.resolve(typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? args['output-dir']
  : 'tools/engine-match/out/_stage166_pattern_audit');
fs.mkdirSync(outputDir, { recursive: true });

const mainVariant = await loadProfileVariant({
  label: 'stage154-main-base',
  generatedModule: mainGeneratedModule,
  engineOptionsJson: mainEngineOptions,
});
const wideVariant = await loadProfileVariant({
  label: 'stage154-wide-safe',
  generatedModule: wideGeneratedModule,
  engineOptionsJson: wideEngineOptions,
});

const activeEngine = createActiveEngine();
const mainEngine = createVariantEngine(mainVariant);
const wideEngine = createVariantEngine(wideVariant);

const patternBankAudit = {
  active: {
    profileCount: Array.isArray(RUNTIME_PATTERN_BANK_PROFILES) ? RUNTIME_PATTERN_BANK_PROFILES.length : 0,
    profiles: (Array.isArray(RUNTIME_PATTERN_BANK_PROFILES) ? RUNTIME_PATTERN_BANK_PROFILES : []).map(summarizePatternBankProfile),
  },
  main: {
    profileCount: Array.isArray(mainVariant.patternBankProfiles) ? mainVariant.patternBankProfiles.length : 0,
    profiles: (Array.isArray(mainVariant.patternBankProfiles) ? mainVariant.patternBankProfiles : []).map(summarizePatternBankProfile),
  },
  wide: {
    profileCount: Array.isArray(wideVariant.patternBankProfiles) ? wideVariant.patternBankProfiles.length : 0,
    profiles: (Array.isArray(wideVariant.patternBankProfiles) ? wideVariant.patternBankProfiles : []).map(summarizePatternBankProfile),
  },
};

const staticComparisons = [];
let maxResidualAfterFullPatternBank = 0;
let maxResidualAfterBiasOnly = 0;
let maxRawDelta = 0;
for (const openingPlies of samplePlies) {
  for (let seed = 1; seed <= sampleSeeds; seed += 1) {
    const opening = createXotOpeningState(seed, openingPlies);
    if (opening.state.isTerminal() || opening.state.getLegalMoves().length === 0) {
      continue;
    }

    const activePattern = calculatePatternComposite(activeEngine, opening.state);
    const mainPattern = calculatePatternComposite(mainEngine, opening.state);
    const widePattern = calculatePatternComposite(wideEngine, opening.state);
    const mainRawDelta = mainPattern.staticScore - activePattern.staticScore;
    const wideRawDelta = widePattern.staticScore - activePattern.staticScore;
    const mainResidualAfterFullPatternBank = mainRawDelta - mainPattern.patternBankContribution;
    const wideResidualAfterFullPatternBank = wideRawDelta - widePattern.patternBankContribution;
    const mainResidualAfterBiasOnly = mainRawDelta - (mainPattern.patternBankProfiles?.[0]?.bias ?? 0);
    const wideResidualAfterBiasOnly = wideRawDelta - (widePattern.patternBankProfiles?.[0]?.bias ?? 0);

    maxRawDelta = Math.max(maxRawDelta, Math.abs(mainRawDelta), Math.abs(wideRawDelta));
    maxResidualAfterFullPatternBank = Math.max(maxResidualAfterFullPatternBank, Math.abs(mainResidualAfterFullPatternBank), Math.abs(wideResidualAfterFullPatternBank));
    maxResidualAfterBiasOnly = Math.max(maxResidualAfterBiasOnly, Math.abs(mainResidualAfterBiasOnly), Math.abs(wideResidualAfterBiasOnly));

    staticComparisons.push({
      openingSeed: seed,
      openingPlies,
      xotIndex: opening.xotIndex,
      openingMoves: opening.openingMoves,
      empties: opening.state.getEmptyCount(),
      active: activePattern,
      main: {
        ...mainPattern,
        rawDeltaVsActive: mainRawDelta,
        residualAfterFullPatternBank: mainResidualAfterFullPatternBank,
        residualAfterBiasOnly: mainResidualAfterBiasOnly,
      },
      wide: {
        ...widePattern,
        rawDeltaVsActive: wideRawDelta,
        residualAfterFullPatternBank: wideResidualAfterFullPatternBank,
        residualAfterBiasOnly: wideResidualAfterBiasOnly,
      },
    });
  }
}

const averageAbsResidualAfterFullPatternBank = staticComparisons.length > 0
  ? staticComparisons.reduce((sum, item) => sum + Math.abs(item.main.residualAfterFullPatternBank), 0) / staticComparisons.length
  : 0;
const averageAbsResidualAfterBiasOnly = staticComparisons.length > 0
  ? staticComparisons.reduce((sum, item) => sum + Math.abs(item.main.residualAfterBiasOnly), 0) / staticComparisons.length
  : 0;

const output = {
  generatedAt: new Date().toISOString(),
  sampleSeeds,
  samplePlies,
  patternBankAudit,
  staticComparisonSummary: {
    sampleCount: staticComparisons.length,
    maxRawDeltaVsActive: maxRawDelta,
    maxResidualAfterSubtractingFullPatternBank: maxResidualAfterFullPatternBank,
    averageAbsoluteResidualAfterSubtractingFullPatternBank: averageAbsResidualAfterFullPatternBank,
    maxResidualAfterSubtractingPatternBankBiasOnly: maxResidualAfterBiasOnly,
    averageAbsoluteResidualAfterSubtractingPatternBankBiasOnly: averageAbsResidualAfterBiasOnly,
  },
  staticComparisons: staticComparisons.slice(0, Math.min(staticComparisons.length, 48)),
};

const summaryLines = [
  '# Stage154 pattern asset audit',
  '',
  `- generated at: ${output.generatedAt}`,
  `- sample seeds: ${sampleSeeds}`,
  `- sample plies: ${samplePlies.join(', ')}`,
  '',
  '## Pattern bank audit',
  '',
];
for (const [key, entry] of Object.entries(patternBankAudit)) {
  summaryLines.push(`### ${key}`);
  summaryLines.push(`- profile count: ${entry.profileCount}`);
  if (entry.profiles.length === 0) {
    summaryLines.push('- no pattern bank profiles');
    summaryLines.push('');
    continue;
  }
  for (const profile of entry.profiles) {
    summaryLines.push(`- ${profile.profileName}: board-dependent buckets ${profile.boardDependentBucketCount}/${profile.bucketCount}, bias-only buckets ${profile.biasOnlyBucketCount}/${profile.bucketCount}`);
  }
  summaryLines.push('');
}
summaryLines.push('## Static evaluator comparison against active');
summaryLines.push('');
summaryLines.push(`- sample count: ${output.staticComparisonSummary.sampleCount}`);
summaryLines.push(`- max raw delta vs active: ${output.staticComparisonSummary.maxRawDeltaVsActive.toFixed(3)}`);
summaryLines.push(`- max residual after subtracting full stage154 pattern-bank contribution: ${output.staticComparisonSummary.maxResidualAfterSubtractingFullPatternBank.toFixed(3)}`);
summaryLines.push(`- average absolute residual after subtracting full stage154 pattern-bank contribution: ${output.staticComparisonSummary.averageAbsoluteResidualAfterSubtractingFullPatternBank.toFixed(3)}`);
summaryLines.push(`- max residual after subtracting stage154 pattern-bank bias only: ${output.staticComparisonSummary.maxResidualAfterSubtractingPatternBankBiasOnly.toFixed(3)}`);
summaryLines.push(`- average absolute residual after subtracting stage154 pattern-bank bias only: ${output.staticComparisonSummary.averageAbsoluteResidualAfterSubtractingPatternBankBiasOnly.toFixed(3)}`);
summaryLines.push('');
summaryLines.push('Interpretation: residual-after-full-pattern-bank ≈ 0 means stage154 differs from active almost entirely through the new pattern-bank layer. residual-after-bias-only staying large means the layer is genuinely board-dependent, not bias-only.');
summaryLines.push('');

fs.writeFileSync(path.join(outputDir, 'stage166_pattern_asset_audit.json'), `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'stage166_pattern_asset_audit.md'), `${summaryLines.join('\n')}\n`);

console.log(`Saved audit JSON to ${path.join(outputDir, 'stage166_pattern_asset_audit.json')}`);
console.log(`Saved audit summary to ${path.join(outputDir, 'stage166_pattern_asset_audit.md')}`);
