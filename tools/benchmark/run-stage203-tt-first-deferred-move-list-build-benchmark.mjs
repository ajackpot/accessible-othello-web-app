import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SearchEngine } from '../../js/ai/search-engine.js';
import {
  playSeededRandomUntilEmptyCount,
  summarizeResult,
  sumBy,
} from '../../js/test/benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_OUTPUT_PATH = path.join(
  repoRoot,
  'benchmarks',
  'stage203_tt_first_deferred_move_list_build_benchmark_20260422.json',
);

const DEPTH_LIMITED_24_SEEDS = [11, 29, 47];
const DEPTH_LIMITED_20_SEEDS = [17, 31, 43];
const WLD_14_SEEDS = [23, 37, 48, 60];
const EXACT_10_SEEDS = [7, 13, 19, 25];

const DEPTH_LIMITED_24_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 1800,
  randomness: 0,
  maxTableEntries: 240000,
});

const DEPTH_LIMITED_20_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 7,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 4000,
  randomness: 0,
  maxTableEntries: 280000,
});

const WLD_14_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 3900,
  randomness: 0,
  maxTableEntries: 260000,
  wldPreExactEmpties: 2,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
});

const EXACT_10_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  timeLimitMs: 10000,
  randomness: 0,
  maxTableEntries: 220000,
  wldPreExactEmpties: 0,
});

const COMPANION_VARIANTS = Object.freeze({
  baseline: Object.freeze({
    ttFirstDeferredMoveListBuild: false,
    lowOverheadSearchChildStateFactory: false,
  }),
  deferredOnly: Object.freeze({
    ttFirstDeferredMoveListBuild: true,
    lowOverheadSearchChildStateFactory: false,
  }),
  lowOverheadOnly: Object.freeze({
    ttFirstDeferredMoveListBuild: false,
    lowOverheadSearchChildStateFactory: true,
  }),
  both: Object.freeze({
    ttFirstDeferredMoveListBuild: true,
    lowOverheadSearchChildStateFactory: true,
  }),
});

function parseArgs(argv) {
  const parsed = { output: DEFAULT_OUTPUT_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return parsed;
}

function createSearchOptions(baseOptions, toggles = {}) {
  return {
    ...baseOptions,
    allocationLightSearchMoves: true,
    reusablePreparedSearchMoveBuffers: true,
    lazyPreparedSearchMoves: true,
    tokenizedPreparedSearchMoveCore: true,
    compactPreparedSearchMoveFlips: false,
    ...toggles,
  };
}

function runSearchSample(state, options) {
  const engine = new SearchEngine(options);
  const result = engine.findBestMove(state);
  return {
    result,
    summary: summarizeResult(result, state, null, {
      ttFirstDeferredMoveListBuildAttempts: result.stats?.ttFirstDeferredMoveListBuildAttempts ?? null,
      ttFirstDeferredMoveListBuildLegalHits: result.stats?.ttFirstDeferredMoveListBuildLegalHits ?? null,
      ttFirstDeferredMoveListBuildCutoffs: result.stats?.ttFirstDeferredMoveListBuildCutoffs ?? null,
      ttFirstDeferredMoveListBuildSkips: result.stats?.ttFirstDeferredMoveListBuildSkips ?? null,
      lowOverheadSearchChildStates: result.stats?.lowOverheadSearchChildStates ?? null,
      lowOverheadSearchPassStates: result.stats?.lowOverheadSearchPassStates ?? null,
    }),
  };
}

function compareSamples(left, right) {
  const elapsedLeft = Number(left.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  const elapsedRight = Number(right.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  if (elapsedLeft !== elapsedRight) {
    return elapsedLeft - elapsedRight;
  }
  const nodesLeft = Number(left.summary.nodes ?? Number.POSITIVE_INFINITY);
  const nodesRight = Number(right.summary.nodes ?? Number.POSITIVE_INFINITY);
  if (nodesLeft !== nodesRight) {
    return nodesLeft - nodesRight;
  }
  return 0;
}

function chooseMedian(samples) {
  const sorted = [...samples].sort(compareSamples);
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
}

function buildParityRecord(seed, baselineSummary, candidateSummary) {
  return {
    seed,
    sameMove: baselineSummary.bestMove === candidateSummary.bestMove,
    sameScore: baselineSummary.score === candidateSummary.score,
    sameMode: baselineSummary.mode === candidateSummary.mode,
    sameNodes: baselineSummary.nodes === candidateSummary.nodes,
    baseline: baselineSummary,
    candidate: candidateSummary,
  };
}

function buildPairSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineAttempts = sumBy(cases.map((entry) => entry.baseline), 'ttFirstDeferredMoveListBuildAttempts');
  const candidateAttempts = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildAttempts');
  const candidateLegalHits = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildLegalHits');
  const candidateCutoffs = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildCutoffs');
  const candidateSkips = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildSkips');
  const baselineLowOverheadChildStates = sumBy(cases.map((entry) => entry.baseline), 'lowOverheadSearchChildStates');
  const candidateLowOverheadChildStates = sumBy(cases.map((entry) => entry.candidate), 'lowOverheadSearchChildStates');

  return {
    cases: cases.length,
    identicalBestMoves: cases.filter((entry) => entry.sameMove).length,
    identicalScores: cases.filter((entry) => entry.sameScore).length,
    identicalModes: cases.filter((entry) => entry.sameMode).length,
    identicalNodes: cases.filter((entry) => entry.sameNodes).length,
    baselineElapsedMs,
    candidateElapsedMs,
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null,
    baselineNodes,
    candidateNodes,
    nodeRatioCandidateVsBaseline: baselineNodes > 0 ? candidateNodes / baselineNodes : null,
    baselineDeferredAttempts: baselineAttempts,
    candidateDeferredAttempts: candidateAttempts,
    candidateDeferredLegalHits: candidateLegalHits,
    candidateDeferredCutoffs: candidateCutoffs,
    candidateDeferredSkips: candidateSkips,
    baselineLowOverheadChildStates,
    candidateLowOverheadChildStates,
  };
}

function runBalancedPair(state, baselineOptions, candidateOptions, repetitions = 3) {
  const baselineSamples = [];
  const candidateSamples = [];

  runSearchSample(state, baselineOptions);
  runSearchSample(state, candidateOptions);

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    if (repetition % 2 === 0) {
      baselineSamples.push(runSearchSample(state, baselineOptions));
      candidateSamples.push(runSearchSample(state, candidateOptions));
    } else {
      candidateSamples.push(runSearchSample(state, candidateOptions));
      baselineSamples.push(runSearchSample(state, baselineOptions));
    }
  }

  return {
    baseline: chooseMedian(baselineSamples).summary,
    candidate: chooseMedian(candidateSamples).summary,
    baselineSamples: baselineSamples.map((sample) => sample.summary),
    candidateSamples: candidateSamples.map((sample) => sample.summary),
  };
}

function runPairSection({ label, targetEmptyCount, seeds, baseOptions, repetitions = 3 }) {
  const baselineOptions = createSearchOptions(baseOptions, {
    ttFirstDeferredMoveListBuild: false,
    lowOverheadSearchChildStateFactory: false,
  });
  const candidateOptions = createSearchOptions(baseOptions, {
    ttFirstDeferredMoveListBuild: true,
    lowOverheadSearchChildStateFactory: false,
  });

  const cases = [];
  const samples = [];
  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    assert.equal(state.getEmptyCount(), targetEmptyCount, `${label}: seed ${seed} should reach ${targetEmptyCount} empties.`);
    const pair = runBalancedPair(state, baselineOptions, candidateOptions, repetitions);
    cases.push(buildParityRecord(seed, pair.baseline, pair.candidate));
    samples.push({ seed, baselineSamples: pair.baselineSamples, candidateSamples: pair.candidateSamples });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    baselineOptions,
    candidateOptions,
    summary: buildPairSummary(cases),
    cases,
    samples,
  };
}

function runCompanionMatrixSection({ label, targetEmptyCount, seeds, baseOptions }) {
  const totals = Object.fromEntries(
    Object.keys(COMPANION_VARIANTS).map((key) => [key, {
      elapsedMs: 0,
      nodes: 0,
      deferredAttempts: 0,
      deferredSkips: 0,
      lowOverheadChildStates: 0,
    }]),
  );
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] companion seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    const perVariant = {};

    for (const [variantLabel, toggles] of Object.entries(COMPANION_VARIANTS)) {
      const options = createSearchOptions(baseOptions, toggles);
      runSearchSample(state, options);
      const summary = runSearchSample(state, options).summary;
      perVariant[variantLabel] = summary;
      totals[variantLabel].elapsedMs += Number(summary.elapsedMs ?? 0);
      totals[variantLabel].nodes += Number(summary.nodes ?? 0);
      totals[variantLabel].deferredAttempts += Number(summary.ttFirstDeferredMoveListBuildAttempts ?? 0);
      totals[variantLabel].deferredSkips += Number(summary.ttFirstDeferredMoveListBuildSkips ?? 0);
      totals[variantLabel].lowOverheadChildStates += Number(summary.lowOverheadSearchChildStates ?? 0);
    }

    cases.push({ seed, variants: perVariant });
  }

  const baseline = totals.baseline;
  const ratios = Object.fromEntries(
    Object.entries(totals).map(([variantLabel, total]) => [variantLabel, {
      elapsedRatioVsBaseline: baseline.elapsedMs > 0 ? total.elapsedMs / baseline.elapsedMs : null,
      nodeRatioVsBaseline: baseline.nodes > 0 ? total.nodes / baseline.nodes : null,
      deferredAttempts: total.deferredAttempts,
      deferredSkips: total.deferredSkips,
      lowOverheadChildStates: total.lowOverheadChildStates,
    }]),
  );

  return {
    label,
    targetEmptyCount,
    seeds,
    totals,
    ratios,
    cases,
  };
}

async function main() {
  const { output } = parseArgs(process.argv.slice(2));

  const benchmark = {
    stage: 203,
    label: 'Stage 203 TT-first deferred move-list build benchmark',
    generatedAt: new Date().toISOString(),
    isolateMatrix: [
      runCompanionMatrixSection({
        label: 'depth-limited-24-companion-matrix',
        targetEmptyCount: 24,
        seeds: DEPTH_LIMITED_24_SEEDS,
        baseOptions: DEPTH_LIMITED_24_OPTIONS,
      }),
      runCompanionMatrixSection({
        label: 'depth-limited-20-companion-matrix',
        targetEmptyCount: 20,
        seeds: DEPTH_LIMITED_20_SEEDS,
        baseOptions: DEPTH_LIMITED_20_OPTIONS,
      }),
    ],
    sections: [
      runPairSection({
        label: 'depth-limited-24',
        targetEmptyCount: 24,
        seeds: DEPTH_LIMITED_24_SEEDS,
        baseOptions: DEPTH_LIMITED_24_OPTIONS,
      }),
      runPairSection({
        label: 'depth-limited-20',
        targetEmptyCount: 20,
        seeds: DEPTH_LIMITED_20_SEEDS,
        baseOptions: DEPTH_LIMITED_20_OPTIONS,
      }),
      runPairSection({
        label: 'wld-14-control',
        targetEmptyCount: 14,
        seeds: WLD_14_SEEDS,
        baseOptions: WLD_14_OPTIONS,
      }),
      runPairSection({
        label: 'exact-10-control',
        targetEmptyCount: 10,
        seeds: EXACT_10_SEEDS,
        baseOptions: EXACT_10_OPTIONS,
      }),
    ],
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(benchmark, null, 2)}\n`, 'utf8');
  console.log(output);
}

await main();
