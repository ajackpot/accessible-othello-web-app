import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { SearchEngine, createEmptySearchStats } from '../../js/ai/search-engine.js';
import {
  playSeededRandomUntilEmptyCount,
  sumBy,
} from '../../js/test/benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_OUTPUT_PATH = path.join(
  repoRoot,
  'benchmarks',
  'stage201_few_empties_exact_fastest_first_selective_gate_benchmark_20260422.json',
);

const DIRECT8_SEEDS = [7, 13, 19, 25, 31, 37, 41, 47];
const DIRECT8_REPETITIONS = 60;
const EXACT10_SEEDS = [7, 13, 19, 25, 31, 37];
const EXACT10_ROUNDS = 6;
const EXACT12_SEEDS = [7, 19, 31, 43];
const EXACT12_ROUNDS = 4;
const WLD12_SEEDS = [17, 31, 50];
const WLD12_ROUNDS = 4;

const DIRECT8_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: true,
  exactFastestFirstOrdering: true,
});

const EXACT10_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  timeLimitMs: 10000,
  randomness: 0,
  maxTableEntries: 220000,
  wldPreExactEmpties: 0,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: true,
  exactFastestFirstOrdering: true,
});

const EXACT12_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 12000,
  randomness: 0,
  maxTableEntries: 240000,
  wldPreExactEmpties: 0,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: true,
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
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: true,
  exactFastestFirstOrdering: true,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
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

function withToggle(options, fewEmptiesExactFastestFirstSelectiveGate) {
  return { ...options, fewEmptiesExactFastestFirstSelectiveGate };
}

function createFreshHistoryHeuristic() {
  return Array.from({ length: 2 }, () => Array(64).fill(0));
}

function createDirectRunner(options) {
  const engine = new SearchEngine(options);
  return (state) => {
    engine.stats = createEmptySearchStats();
    const startedAt = performance.now();
    const score = engine.solveSmallExact(state);
    return {
      elapsedMs: Number((performance.now() - startedAt).toFixed(6)),
      score,
      smallSolverNodes: engine.stats.smallSolverNodes ?? null,
      optimizedFewEmptiesFastestFirstSorts: engine.stats.optimizedFewEmptiesFastestFirstSorts ?? null,
      optimizedFewEmptiesFastestFirstSelectiveSkips: engine.stats.optimizedFewEmptiesFastestFirstSelectiveSkips ?? null,
    };
  };
}

function createSearchRunner(options) {
  const engine = new SearchEngine(options);
  return (state) => {
    engine.transpositionTable.clear();
    engine.killerMoves = [];
    engine.historyHeuristic = createFreshHistoryHeuristic();
    const startedAt = performance.now();
    const result = engine.findBestMove(state);
    return {
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      bestMove: result.bestMoveCoord,
      score: result.score,
      mode: result.searchMode ?? null,
      nodes: result.stats?.nodes ?? null,
      optimizedFewEmptiesFastestFirstSorts: result.stats?.optimizedFewEmptiesFastestFirstSorts ?? null,
      optimizedFewEmptiesFastestFirstSelectiveSkips: result.stats?.optimizedFewEmptiesFastestFirstSelectiveSkips ?? null,
    };
  };
}

function averageNumber(samples, key) {
  if (samples.length === 0) {
    return null;
  }
  return Number((sumBy(samples, key) / samples.length).toFixed(6));
}

function averageDirectSamples(samples) {
  assert.ok(samples.length > 0, 'averageDirectSamples expects at least one sample.');
  const first = samples[0];
  for (const sample of samples) {
    assert.equal(sample.score, first.score, 'Direct benchmark samples should keep score parity within a side.');
    assert.equal(sample.smallSolverNodes, first.smallSolverNodes, 'Direct benchmark samples should keep small-solver node parity within a side.');
  }
  return {
    score: first.score,
    smallSolverNodes: first.smallSolverNodes,
    elapsedMs: averageNumber(samples, 'elapsedMs'),
    optimizedFewEmptiesFastestFirstSorts: averageNumber(samples, 'optimizedFewEmptiesFastestFirstSorts'),
    optimizedFewEmptiesFastestFirstSelectiveSkips: averageNumber(samples, 'optimizedFewEmptiesFastestFirstSelectiveSkips'),
  };
}

function averageSearchSamples(samples) {
  assert.ok(samples.length > 0, 'averageSearchSamples expects at least one sample.');
  const first = samples[0];
  for (const sample of samples) {
    assert.equal(sample.bestMove, first.bestMove, 'Search benchmark samples should keep best move parity within a side.');
    assert.equal(sample.score, first.score, 'Search benchmark samples should keep score parity within a side.');
    assert.equal(sample.mode, first.mode, 'Search benchmark samples should keep mode parity within a side.');
    assert.equal(sample.nodes, first.nodes, 'Search benchmark samples should keep node parity within a side.');
  }
  return {
    bestMove: first.bestMove,
    score: first.score,
    mode: first.mode,
    nodes: first.nodes,
    elapsedMs: averageNumber(samples, 'elapsedMs'),
    optimizedFewEmptiesFastestFirstSorts: averageNumber(samples, 'optimizedFewEmptiesFastestFirstSorts'),
    optimizedFewEmptiesFastestFirstSelectiveSkips: averageNumber(samples, 'optimizedFewEmptiesFastestFirstSelectiveSkips'),
  };
}

function runDirectCase(state, baselineRunner, candidateRunner, repetitions) {
  baselineRunner(state);
  candidateRunner(state);

  const baselineSamples = [];
  const candidateSamples = [];
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    if (repetition % 2 === 0) {
      baselineSamples.push(baselineRunner(state));
      candidateSamples.push(candidateRunner(state));
    } else {
      candidateSamples.push(candidateRunner(state));
      baselineSamples.push(baselineRunner(state));
    }
  }

  return {
    baseline: averageDirectSamples(baselineSamples),
    candidate: averageDirectSamples(candidateSamples),
    baselineSamples,
    candidateSamples,
  };
}

function runSearchCase(state, baselineRunner, candidateRunner, rounds) {
  baselineRunner(state);
  candidateRunner(state);

  const baselineSamples = [];
  const candidateSamples = [];
  for (let round = 0; round < rounds; round += 1) {
    if (round % 2 === 0) {
      baselineSamples.push(baselineRunner(state));
      candidateSamples.push(candidateRunner(state));
    } else {
      candidateSamples.push(candidateRunner(state));
      baselineSamples.push(baselineRunner(state));
    }
  }

  return {
    baseline: averageSearchSamples(baselineSamples),
    candidate: averageSearchSamples(candidateSamples),
    baselineSamples,
    candidateSamples,
  };
}

function ratio(candidateValue, baselineValue) {
  if (!Number.isFinite(candidateValue) || !Number.isFinite(baselineValue) || baselineValue === 0) {
    return null;
  }
  return Number((candidateValue / baselineValue).toFixed(6));
}

function runDirectSection(label, targetEmpties, seeds, options, repetitions) {
  const baselineRunner = createDirectRunner(withToggle(options, false));
  const candidateRunner = createDirectRunner(withToggle(options, true));
  const cases = [];
  for (const seed of seeds) {
    console.error(`[${label}] empties ${targetEmpties} seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(targetEmpties, seed);
    assert.equal(state.getEmptyCount(), targetEmpties, `${label}: seed ${seed} should reach ${targetEmpties} empties.`);
    const measured = runDirectCase(state, baselineRunner, candidateRunner, repetitions);
    cases.push({
      seed,
      empties: targetEmpties,
      currentPlayer: state.currentPlayer,
      legalMoves: state.getSearchMoves().length,
      baseline: measured.baseline,
      candidate: measured.candidate,
      sameScore: measured.baseline.score === measured.candidate.score,
      sameSmallSolverNodes: measured.baseline.smallSolverNodes === measured.candidate.smallSolverNodes,
      baselineSamples: measured.baselineSamples,
      candidateSamples: measured.candidateSamples,
    });
  }

  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'smallSolverNodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'smallSolverNodes');
  const baselineSkips = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesFastestFirstSelectiveSkips');
  const candidateSkips = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesFastestFirstSelectiveSkips');
  const baselineFastestFirstSorts = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesFastestFirstSorts');
  const candidateFastestFirstSorts = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesFastestFirstSorts');

  return {
    kind: 'direct',
    label,
    targetEmpties,
    seeds,
    repetitions,
    cases,
    aggregate: {
      baselineElapsedMs: Number(baselineElapsedMs.toFixed(6)),
      candidateElapsedMs: Number(candidateElapsedMs.toFixed(6)),
      elapsedRatioCandidateVsBaseline: ratio(candidateElapsedMs, baselineElapsedMs),
      baselineSmallSolverNodes: baselineNodes,
      candidateSmallSolverNodes: candidateNodes,
      smallSolverNodeRatioCandidateVsBaseline: ratio(candidateNodes, baselineNodes),
      baselineOptimizedFewEmptiesFastestFirstSorts: Number(baselineFastestFirstSorts.toFixed(6)),
      candidateOptimizedFewEmptiesFastestFirstSorts: Number(candidateFastestFirstSorts.toFixed(6)),
      baselineOptimizedFewEmptiesFastestFirstSelectiveSkips: Number(baselineSkips.toFixed(6)),
      candidateOptimizedFewEmptiesFastestFirstSelectiveSkips: Number(candidateSkips.toFixed(6)),
    },
  };
}

function runSearchSection(label, targetEmpties, seeds, options, rounds) {
  const baselineRunner = createSearchRunner(withToggle(options, false));
  const candidateRunner = createSearchRunner(withToggle(options, true));
  const cases = [];
  for (const seed of seeds) {
    console.error(`[${label}] empties ${targetEmpties} seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(targetEmpties, seed);
    assert.equal(state.getEmptyCount(), targetEmpties, `${label}: seed ${seed} should reach ${targetEmpties} empties.`);
    const measured = runSearchCase(state, baselineRunner, candidateRunner, rounds);
    cases.push({
      seed,
      empties: targetEmpties,
      currentPlayer: state.currentPlayer,
      legalMoves: state.getSearchMoves().length,
      baseline: measured.baseline,
      candidate: measured.candidate,
      sameMove: measured.baseline.bestMove === measured.candidate.bestMove,
      sameScore: measured.baseline.score === measured.candidate.score,
      sameMode: measured.baseline.mode === measured.candidate.mode,
      sameNodes: measured.baseline.nodes === measured.candidate.nodes,
      baselineSamples: measured.baselineSamples,
      candidateSamples: measured.candidateSamples,
    });
  }

  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineSkips = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesFastestFirstSelectiveSkips');
  const candidateSkips = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesFastestFirstSelectiveSkips');
  const baselineFastestFirstSorts = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesFastestFirstSorts');
  const candidateFastestFirstSorts = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesFastestFirstSorts');

  return {
    kind: 'search',
    label,
    targetEmpties,
    seeds,
    rounds,
    cases,
    aggregate: {
      baselineElapsedMs: Number(baselineElapsedMs.toFixed(6)),
      candidateElapsedMs: Number(candidateElapsedMs.toFixed(6)),
      elapsedRatioCandidateVsBaseline: ratio(candidateElapsedMs, baselineElapsedMs),
      baselineNodes,
      candidateNodes,
      nodeRatioCandidateVsBaseline: ratio(candidateNodes, baselineNodes),
      baselineOptimizedFewEmptiesFastestFirstSorts: Number(baselineFastestFirstSorts.toFixed(6)),
      candidateOptimizedFewEmptiesFastestFirstSorts: Number(candidateFastestFirstSorts.toFixed(6)),
      baselineOptimizedFewEmptiesFastestFirstSelectiveSkips: Number(baselineSkips.toFixed(6)),
      candidateOptimizedFewEmptiesFastestFirstSelectiveSkips: Number(candidateSkips.toFixed(6)),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const direct8 = runDirectSection('direct8', 8, DIRECT8_SEEDS, DIRECT8_OPTIONS, DIRECT8_REPETITIONS);
  const exact10 = runSearchSection('exact10', 10, EXACT10_SEEDS, EXACT10_OPTIONS, EXACT10_ROUNDS);
  const exact12 = runSearchSection('exact12', 12, EXACT12_SEEDS, EXACT12_OPTIONS, EXACT12_ROUNDS);
  const wld12 = runSearchSection('wld12', 12, WLD12_SEEDS, WLD12_OPTIONS, WLD12_ROUNDS);

  const exactBaselineElapsedMs = exact10.aggregate.baselineElapsedMs + exact12.aggregate.baselineElapsedMs;
  const exactCandidateElapsedMs = exact10.aggregate.candidateElapsedMs + exact12.aggregate.candidateElapsedMs;
  const exactBaselineNodes = exact10.aggregate.baselineNodes + exact12.aggregate.baselineNodes;
  const exactCandidateNodes = exact10.aggregate.candidateNodes + exact12.aggregate.candidateNodes;

  const summary = {
    generatedAt: new Date().toISOString(),
    stage: 201,
    label: 'Stage 201 few-empties exact fastest-first selective gate benchmark',
    candidate: 'fewEmptiesExactFastestFirstSelectiveGate = true',
    baseline: 'fewEmptiesExactFastestFirstSelectiveGate = false',
    sections: {
      direct8,
      exact10,
      exact12,
      wld12,
    },
    aggregate: {
      direct8ElapsedRatioCandidateVsBaseline: direct8.aggregate.elapsedRatioCandidateVsBaseline,
      exact10ElapsedRatioCandidateVsBaseline: exact10.aggregate.elapsedRatioCandidateVsBaseline,
      exact12ElapsedRatioCandidateVsBaseline: exact12.aggregate.elapsedRatioCandidateVsBaseline,
      wld12ElapsedRatioCandidateVsBaseline: wld12.aggregate.elapsedRatioCandidateVsBaseline,
      exactSearchElapsedRatioCandidateVsBaseline: ratio(exactCandidateElapsedMs, exactBaselineElapsedMs),
      exactSearchNodeRatioCandidateVsBaseline: ratio(exactCandidateNodes, exactBaselineNodes),
    },
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Wrote Stage 201 benchmark to ${args.output}`);
}

await main();
