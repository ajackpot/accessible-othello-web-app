import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
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
  'stage199_few_empties_wld_tail_bundle_benchmark_balanced_20260422.json',
);

const DIRECT_SPECIALIZED_STATES = [2, 17, 29].map((seed) => playSeededRandomUntilEmptyCount(4, seed));
const DIRECT_TAIL_STATES = [];
for (const empties of [5, 6, 7, 8]) {
  for (const seed of [5, 11, 23]) {
    DIRECT_TAIL_STATES.push(playSeededRandomUntilEmptyCount(empties, seed));
  }
}

const DIRECT_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  exactFastestFirstOrdering: true,
});

const SEARCH_SECTIONS = Object.freeze([
  {
    label: 'wld10',
    empties: 10,
    seeds: [7, 19, 31],
    repetitions: 3,
    options: {
      presetKey: 'custom',
      styleKey: 'balanced',
      maxDepth: 8,
      exactEndgameEmpties: 8,
      aspirationWindow: 0,
      timeLimitMs: 2500,
      randomness: 0,
      maxTableEntries: 200000,
      wldPreExactEmpties: 2,
      enhancedTranspositionCutoff: true,
      enhancedTranspositionCutoffWld: true,
      exactFastestFirstOrdering: true,
    },
  },
  {
    label: 'wld12',
    empties: 12,
    seeds: [23, 37, 50],
    repetitions: 3,
    options: {
      presetKey: 'custom',
      styleKey: 'balanced',
      maxDepth: 8,
      exactEndgameEmpties: 10,
      aspirationWindow: 0,
      timeLimitMs: 3000,
      randomness: 0,
      maxTableEntries: 220000,
      wldPreExactEmpties: 2,
      enhancedTranspositionCutoff: true,
      enhancedTranspositionCutoffWld: true,
      exactFastestFirstOrdering: true,
    },
  },
  {
    label: 'wld14',
    empties: 14,
    seeds: [23, 37, 60],
    repetitions: 3,
    options: {
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
      exactFastestFirstOrdering: true,
    },
  },
]);

function parseArgs(argv) {
  const parsed = { output: DEFAULT_OUTPUT_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return parsed;
}

function withWldBundle(options, enabled) {
  return {
    ...options,
    optimizedFewEmptiesWldSolver: enabled,
    optimizedFewEmptiesWldSolverEmpties: 8,
    lightweightFewEmptiesWldMovePath: enabled,
  };
}

function compareSamples(left, right) {
  const elapsedLeft = Number(left.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  const elapsedRight = Number(right.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  if (elapsedLeft !== elapsedRight) {
    return elapsedLeft - elapsedRight;
  }

  const nodesLeft = Number(
    left.summary.nodes
      ?? left.summary.wldSmallSolverNodes
      ?? Number.POSITIVE_INFINITY,
  );
  const nodesRight = Number(
    right.summary.nodes
      ?? right.summary.wldSmallSolverNodes
      ?? Number.POSITIVE_INFINITY,
  );
  return nodesLeft - nodesRight;
}

function chooseMedian(samples) {
  const sorted = [...samples].sort(compareSamples);
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
}

function runDirectMicroSection(states, repetitions, label) {
  const checksumResult = {};
  const results = [];
  for (const [side, enabled] of [['baseline', false], ['candidate', true]]) {
    const engine = new SearchEngine(withWldBundle(DIRECT_OPTIONS, enabled));
    let checksum = 0;
    const startedAt = performance.now();
    for (let repetition = 0; repetition < repetitions; repetition += 1) {
      for (const state of states) {
        checksum += engine.solveSmallWld(state);
      }
    }
    const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
    checksumResult[side] = checksum;
    results.push({
      side,
      elapsedMs,
      checksum,
      wldSmallSolverNodes: engine.stats.wldSmallSolverNodes,
      specializedFewEmptiesWldCalls: engine.stats.specializedFewEmptiesWldCalls,
      optimizedFewEmptiesWld5Calls: engine.stats.optimizedFewEmptiesWld5Calls,
      optimizedFewEmptiesWld6Calls: engine.stats.optimizedFewEmptiesWld6Calls,
      optimizedFewEmptiesWld7Calls: engine.stats.optimizedFewEmptiesWld7Calls,
      optimizedFewEmptiesWld8Calls: engine.stats.optimizedFewEmptiesWld8Calls,
      lightweightFewEmptiesWld5Calls: engine.stats.lightweightFewEmptiesWld5Calls,
      lightweightFewEmptiesWld6Calls: engine.stats.lightweightFewEmptiesWld6Calls,
      lightweightFewEmptiesWld7Calls: engine.stats.lightweightFewEmptiesWld7Calls,
      lightweightFewEmptiesWld8Calls: engine.stats.lightweightFewEmptiesWld8Calls,
    });
  }
  assert.equal(checksumResult.baseline, checksumResult.candidate, `${label}: checksum parity must hold.`);
  const baseline = results.find((entry) => entry.side === 'baseline');
  const candidate = results.find((entry) => entry.side === 'candidate');
  return {
    label,
    stateCount: states.length,
    repetitions,
    baseline,
    candidate,
    elapsedRatioCandidateVsBaseline: candidate.elapsedMs / baseline.elapsedMs,
    wldSmallSolverNodeRatioCandidateVsBaseline: candidate.wldSmallSolverNodes / baseline.wldSmallSolverNodes,
  };
}

function runSearchSample(state, options) {
  const engine = new SearchEngine(options);
  const result = engine.findBestMove(state);
  return {
    result,
    summary: summarizeResult(result, state),
  };
}

function runBalancedPair(state, baselineOptions, candidateOptions, repetitions) {
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
    baselineRun: chooseMedian(baselineSamples),
    candidateRun: chooseMedian(candidateSamples),
    baselineSamples,
    candidateSamples,
  };
}

function buildSearchSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineWldSmallSolverNodes = sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverNodes');
  const candidateWldSmallSolverNodes = sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverNodes');
  const baselineOptimizedCalls = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld8Calls');
  const candidateOptimizedCalls = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld8Calls');
  const candidateLightweightCalls = sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld8Calls');

  return {
    cases: cases.length,
    identicalBestMoves: cases.filter((entry) => entry.sameMove).length,
    identicalScores: cases.filter((entry) => entry.sameScore).length,
    identicalModes: cases.filter((entry) => entry.sameMode).length,
    baselineElapsedMs,
    candidateElapsedMs,
    elapsedRatioCandidateVsBaseline: candidateElapsedMs / baselineElapsedMs,
    baselineNodes,
    candidateNodes,
    nodeRatioCandidateVsBaseline: candidateNodes / baselineNodes,
    baselineWldSmallSolverNodes,
    candidateWldSmallSolverNodes,
    wldSmallSolverNodeRatioCandidateVsBaseline: candidateWldSmallSolverNodes / baselineWldSmallSolverNodes,
    baselineOptimizedCalls,
    candidateOptimizedCalls,
    candidateLightweightCalls,
  };
}

async function runSearchSection(definition) {
  const baselineOptions = withWldBundle(definition.options, false);
  const candidateOptions = withWldBundle(definition.options, true);
  const cases = [];

  for (const seed of definition.seeds) {
    const state = playSeededRandomUntilEmptyCount(definition.empties, seed);
    assert.equal(state.getEmptyCount(), definition.empties, `${definition.label}: seed ${seed} should reach ${definition.empties} empties.`);
    const pair = runBalancedPair(state, baselineOptions, candidateOptions, definition.repetitions);
    const baselineSummary = pair.baselineRun.summary;
    const candidateSummary = pair.candidateRun.summary;
    assert.equal(candidateSummary.bestMove, baselineSummary.bestMove, `${definition.label}: best move parity must hold for seed ${seed}.`);
    assert.equal(candidateSummary.score, baselineSummary.score, `${definition.label}: score parity must hold for seed ${seed}.`);
    assert.equal(candidateSummary.mode, baselineSummary.mode, `${definition.label}: mode parity must hold for seed ${seed}.`);

    cases.push({
      seed,
      baseline: baselineSummary,
      candidate: candidateSummary,
      sameMove: candidateSummary.bestMove === baselineSummary.bestMove,
      sameScore: candidateSummary.score === baselineSummary.score,
      sameMode: candidateSummary.mode === baselineSummary.mode,
    });
  }

  return {
    label: definition.label,
    empties: definition.empties,
    seeds: definition.seeds,
    repetitions: definition.repetitions,
    cases,
    summary: buildSearchSummary(cases),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const directSpecializedMicro = runDirectMicroSection(DIRECT_SPECIALIZED_STATES, 5000, 'direct_specialized_wld_4_micro');
  const directTailMicro = runDirectMicroSection(DIRECT_TAIL_STATES, 500, 'direct_tail_wld_5_to_8_micro');
  const searchSections = [];
  for (const definition of SEARCH_SECTIONS) {
    searchSections.push(await runSearchSection(definition));
  }

  const aggregateBaselineElapsedMs = sumBy(searchSections.map((section) => section.summary), 'baselineElapsedMs');
  const aggregateCandidateElapsedMs = sumBy(searchSections.map((section) => section.summary), 'candidateElapsedMs');
  const aggregateBaselineNodes = sumBy(searchSections.map((section) => section.summary), 'baselineNodes');
  const aggregateCandidateNodes = sumBy(searchSections.map((section) => section.summary), 'candidateNodes');
  const aggregateBaselineWldSmallSolverNodes = sumBy(searchSections.map((section) => section.summary), 'baselineWldSmallSolverNodes');
  const aggregateCandidateWldSmallSolverNodes = sumBy(searchSections.map((section) => section.summary), 'candidateWldSmallSolverNodes');

  const payload = {
    stage: 199,
    generatedAt: new Date().toISOString(),
    benchmark: 'Stage 199 few-empties WLD tail bundle balanced benchmark',
    comparison: {
      baseline: {
        optimizedFewEmptiesWldSolver: false,
        optimizedFewEmptiesWldSolverEmpties: 8,
        lightweightFewEmptiesWldMovePath: false,
      },
      candidate: {
        optimizedFewEmptiesWldSolver: true,
        optimizedFewEmptiesWldSolverEmpties: 8,
        lightweightFewEmptiesWldMovePath: true,
      },
    },
    sections: {
      directSpecializedMicro,
      directTailMicro,
      search: searchSections,
    },
    aggregate: {
      baselineElapsedMs: aggregateBaselineElapsedMs,
      candidateElapsedMs: aggregateCandidateElapsedMs,
      elapsedRatioCandidateVsBaseline: aggregateCandidateElapsedMs / aggregateBaselineElapsedMs,
      baselineNodes: aggregateBaselineNodes,
      candidateNodes: aggregateCandidateNodes,
      nodeRatioCandidateVsBaseline: aggregateCandidateNodes / aggregateBaselineNodes,
      baselineWldSmallSolverNodes: aggregateBaselineWldSmallSolverNodes,
      candidateWldSmallSolverNodes: aggregateCandidateWldSmallSolverNodes,
      wldSmallSolverNodeRatioCandidateVsBaseline: aggregateCandidateWldSmallSolverNodes / aggregateBaselineWldSmallSolverNodes,
    },
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    output: args.output,
    aggregate: payload.aggregate,
    directSpecializedMicroRatio: directSpecializedMicro.elapsedRatioCandidateVsBaseline,
    directTailMicroRatio: directTailMicro.elapsedRatioCandidateVsBaseline,
    searchSectionRatios: searchSections.map((section) => ({ label: section.label, ratio: section.summary.elapsedRatioCandidateVsBaseline })),
  }, null, 2));
}

await main();
