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
  'stage199_few_empties_wld_tail_bundle_benchmark_20260422.json',
);

const DIRECT_SPECIALIZED_EMPTIES = [4];
const DIRECT_SPECIALIZED_SEEDS = [2, 17, 29];
const DIRECT_TAIL_EMPTIES = [5, 6, 7, 8];
const DIRECT_TAIL_SEEDS = [5, 11, 23];
const DIRECT_REPETITIONS = 3;
const WLD10_SEEDS = [7, 19, 31];
const WLD12_SEEDS = [23, 37, 50];
const WLD14_SEEDS = [23, 37, 60];
const SEARCH_REPETITIONS = 3;

const DIRECT_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  exactFastestFirstOrdering: true,
});

const WLD10_OPTIONS = Object.freeze({
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
});

const WLD12_OPTIONS = Object.freeze({
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
});

const WLD14_OPTIONS = Object.freeze({
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
});

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

function withBaseline(options) {
  return {
    ...options,
    optimizedFewEmptiesWldSolver: false,
    optimizedFewEmptiesWldSolverEmpties: 8,
    lightweightFewEmptiesWldMovePath: false,
  };
}

function withCandidate(options) {
  return {
    ...options,
    optimizedFewEmptiesWldSolver: true,
    optimizedFewEmptiesWldSolverEmpties: 8,
    lightweightFewEmptiesWldMovePath: true,
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
  if (nodesLeft !== nodesRight) {
    return nodesLeft - nodesRight;
  }

  return 0;
}

function chooseMedian(samples) {
  const sorted = [...samples].sort(compareSamples);
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
}

function runSearchSample(state, options) {
  const engine = new SearchEngine(options);
  const result = engine.findBestMove(state);
  return {
    result,
    summary: summarizeResult(result, state),
  };
}

function runDirectSmallWldSample(state, options) {
  const engine = new SearchEngine(options);
  const startedAt = performance.now();
  const score = engine.solveSmallWld(state);
  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  return {
    summary: {
      score,
      elapsedMs,
      wldSmallSolverNodes: engine.stats.wldSmallSolverNodes,
      specializedFewEmptiesWldCalls: engine.stats.specializedFewEmptiesWldCalls,
      specializedFewEmptiesWld1Calls: engine.stats.specializedFewEmptiesWld1Calls,
      specializedFewEmptiesWld2Calls: engine.stats.specializedFewEmptiesWld2Calls,
      specializedFewEmptiesWld3Calls: engine.stats.specializedFewEmptiesWld3Calls,
      specializedFewEmptiesWld4Calls: engine.stats.specializedFewEmptiesWld4Calls,
      optimizedFewEmptiesWld5Calls: engine.stats.optimizedFewEmptiesWld5Calls,
      optimizedFewEmptiesWld6Calls: engine.stats.optimizedFewEmptiesWld6Calls,
      optimizedFewEmptiesWld7Calls: engine.stats.optimizedFewEmptiesWld7Calls,
      optimizedFewEmptiesWld8Calls: engine.stats.optimizedFewEmptiesWld8Calls,
      lightweightFewEmptiesWld5Calls: engine.stats.lightweightFewEmptiesWld5Calls,
      lightweightFewEmptiesWld6Calls: engine.stats.lightweightFewEmptiesWld6Calls,
      lightweightFewEmptiesWld7Calls: engine.stats.lightweightFewEmptiesWld7Calls,
      lightweightFewEmptiesWld8Calls: engine.stats.lightweightFewEmptiesWld8Calls,
      optimizedFewEmptiesWldFastestFirstSorts: engine.stats.optimizedFewEmptiesWldFastestFirstSorts,
      optimizedFewEmptiesWldFastestFirstPassCandidates: engine.stats.optimizedFewEmptiesWldFastestFirstPassCandidates,
      options: engine.options,
    },
  };
}

function runBalancedPair(state, baselineOptions, candidateOptions, repetitions, runner) {
  const baselineSamples = [];
  const candidateSamples = [];

  runner(state, baselineOptions);
  runner(state, candidateOptions);

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    if (repetition % 2 === 0) {
      baselineSamples.push(runner(state, baselineOptions));
      candidateSamples.push(runner(state, candidateOptions));
    } else {
      candidateSamples.push(runner(state, candidateOptions));
      baselineSamples.push(runner(state, baselineOptions));
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
  const baselineLightweightCalls = sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld8Calls');
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
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null,
    baselineNodes,
    candidateNodes,
    nodeRatioCandidateVsBaseline: baselineNodes > 0 ? candidateNodes / baselineNodes : null,
    baselineWldSmallSolverNodes,
    candidateWldSmallSolverNodes,
    wldSmallSolverNodeRatioCandidateVsBaseline: baselineWldSmallSolverNodes > 0 ? candidateWldSmallSolverNodes / baselineWldSmallSolverNodes : null,
    baselineOptimizedCalls,
    candidateOptimizedCalls,
    baselineLightweightCalls,
    candidateLightweightCalls,
  };
}

function buildDirectSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineWldSmallSolverNodes = sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverNodes');
  const candidateWldSmallSolverNodes = sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverNodes');
  const baselineSpecializedCalls = sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmptiesWldCalls');
  const candidateSpecializedCalls = sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmptiesWldCalls');
  const baselineOptimizedCalls = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWld8Calls');
  const candidateOptimizedCalls = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWld8Calls');
  const baselineLightweightCalls = sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmptiesWld8Calls');
  const candidateLightweightCalls = sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld5Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld6Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld7Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmptiesWld8Calls');

  return {
    cases: cases.length,
    identicalScores: cases.filter((entry) => entry.sameScore).length,
    baselineElapsedMs,
    candidateElapsedMs,
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null,
    baselineWldSmallSolverNodes,
    candidateWldSmallSolverNodes,
    wldSmallSolverNodeRatioCandidateVsBaseline: baselineWldSmallSolverNodes > 0 ? candidateWldSmallSolverNodes / baselineWldSmallSolverNodes : null,
    baselineSpecializedCalls,
    candidateSpecializedCalls,
    baselineOptimizedCalls,
    candidateOptimizedCalls,
    baselineLightweightCalls,
    candidateLightweightCalls,
  };
}

function runDirectSection(emptiesList, seeds, label) {
  const baselineOptions = withBaseline(DIRECT_OPTIONS);
  const candidateOptions = withCandidate(DIRECT_OPTIONS);
  const cases = [];

  for (const empties of emptiesList) {
    for (const seed of seeds) {
      console.error(`[${label}] empties ${empties} seed ${seed}`);
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      assert.equal(state.getEmptyCount(), empties, `${label}: seed ${seed} should reach ${empties} empties.`);
      const pair = runBalancedPair(state, baselineOptions, candidateOptions, DIRECT_REPETITIONS, runDirectSmallWldSample);
      const baselineSummary = pair.baselineRun.summary;
      const candidateSummary = pair.candidateRun.summary;
      assert.equal(candidateSummary.score, baselineSummary.score, `${label}: WLD score parity must hold for ${empties} empties seed ${seed}.`);

      cases.push({
        empties,
        seed,
        baseline: baselineSummary,
        candidate: candidateSummary,
        sameScore: candidateSummary.score === baselineSummary.score,
        baselineSamples: pair.baselineSamples.map((sample) => sample.summary),
        candidateSamples: pair.candidateSamples.map((sample) => sample.summary),
      });
    }
  }

  return {
    cases,
    summary: buildDirectSummary(cases),
  };
}

function runSearchSection(label, empties, seeds, options) {
  const baselineOptions = withBaseline(options);
  const candidateOptions = withCandidate(options);
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    assert.equal(state.getEmptyCount(), empties, `${label}: seed ${seed} should reach ${empties} empties.`);
    const pair = runBalancedPair(state, baselineOptions, candidateOptions, SEARCH_REPETITIONS, runSearchSample);
    const baselineSummary = pair.baselineRun.summary;
    const candidateSummary = pair.candidateRun.summary;
    assert.equal(candidateSummary.bestMove, baselineSummary.bestMove, `${label}: best move parity must hold for seed ${seed}.`);
    assert.equal(candidateSummary.score, baselineSummary.score, `${label}: score parity must hold for seed ${seed}.`);
    assert.equal(candidateSummary.mode, baselineSummary.mode, `${label}: search mode parity must hold for seed ${seed}.`);

    cases.push({
      seed,
      baseline: baselineSummary,
      candidate: candidateSummary,
      sameMove: candidateSummary.bestMove === baselineSummary.bestMove,
      sameScore: candidateSummary.score === baselineSummary.score,
      sameMode: candidateSummary.mode === baselineSummary.mode,
      baselineSamples: pair.baselineSamples.map((sample) => sample.summary),
      candidateSamples: pair.candidateSamples.map((sample) => sample.summary),
    });
  }

  return {
    cases,
    summary: buildSearchSummary(cases),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const directSpecialized = runDirectSection(DIRECT_SPECIALIZED_EMPTIES, DIRECT_SPECIALIZED_SEEDS, 'direct-specialized-wld');
  const directTail = runDirectSection(DIRECT_TAIL_EMPTIES, DIRECT_TAIL_SEEDS, 'direct-tail-wld');
  const wld10 = runSearchSection('wld10', 10, WLD10_SEEDS, WLD10_OPTIONS);
  const wld12 = runSearchSection('wld12', 12, WLD12_SEEDS, WLD12_OPTIONS);
  const wld14 = runSearchSection('wld14', 14, WLD14_SEEDS, WLD14_OPTIONS);

  const aggregateBaselineElapsedMs = directSpecialized.summary.baselineElapsedMs
    + directTail.summary.baselineElapsedMs
    + wld10.summary.baselineElapsedMs
    + wld12.summary.baselineElapsedMs
    + wld14.summary.baselineElapsedMs;
  const aggregateCandidateElapsedMs = directSpecialized.summary.candidateElapsedMs
    + directTail.summary.candidateElapsedMs
    + wld10.summary.candidateElapsedMs
    + wld12.summary.candidateElapsedMs
    + wld14.summary.candidateElapsedMs;

  const payload = {
    stage: 199,
    generatedAt: new Date().toISOString(),
    benchmark: 'Stage 199 few-empties WLD tail bundle benchmark',
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
      directSpecialized,
      directTail,
      wld10,
      wld12,
      wld14,
    },
    aggregate: {
      baselineElapsedMs: aggregateBaselineElapsedMs,
      candidateElapsedMs: aggregateCandidateElapsedMs,
      elapsedRatioCandidateVsBaseline: aggregateBaselineElapsedMs > 0
        ? aggregateCandidateElapsedMs / aggregateBaselineElapsedMs
        : null,
    },
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));
}

await main();
