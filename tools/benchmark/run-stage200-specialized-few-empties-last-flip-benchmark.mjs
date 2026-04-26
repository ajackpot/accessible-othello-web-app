import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { SearchEngine } from '../../js/ai/search-engine.js';
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
  'stage200_specialized_few_empties_last_flip_path_benchmark_20260422.json',
);

const DIRECT_ONE_EMPTY_SEEDS = [2, 5, 11, 19, 23, 37, 41, 47];
const DIRECT_ONE_EMPTY_REPETITIONS = 200;
const DIRECT_ONE_EMPTY_ROUNDS = 2;
const EXACT10_SEEDS = [7, 13, 19, 25];
const EXACT12_SEEDS = [7, 19];
const WLD12_SEEDS = [17, 31, 50];
const SEARCH_ROUNDS = 4;

const DIRECT_OPTIONS = Object.freeze({
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

function withToggle(options, specializedFewEmptiesLastFlipPath) {
  return { ...options, specializedFewEmptiesLastFlipPath };
}

function createFreshHistoryHeuristic() {
  return Array.from({ length: 2 }, () => Array(64).fill(0));
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
      smallSolverNodes: result.stats?.smallSolverNodes ?? null,
      specializedFewEmptiesLastFlipCalls: result.stats?.specializedFewEmptiesLastFlipCalls ?? null,
    };
  };
}

function averageNumber(samples, key) {
  if (samples.length === 0) {
    return null;
  }
  return Number((sumBy(samples, key) / samples.length).toFixed(3));
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
    smallSolverNodes: averageNumber(samples, 'smallSolverNodes'),
    specializedFewEmptiesLastFlipCalls: averageNumber(samples, 'specializedFewEmptiesLastFlipCalls'),
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

function runSearchSection(label, targetEmpties, seeds, options) {
  const baselineRunner = createSearchRunner(withToggle(options, false));
  const candidateRunner = createSearchRunner(withToggle(options, true));
  const cases = [];
  for (const seed of seeds) {
    console.error(`[${label}] empties ${targetEmpties} seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(targetEmpties, seed);
    assert.equal(state.getEmptyCount(), targetEmpties, `${label}: seed ${seed} should reach ${targetEmpties} empties.`);
    const measured = runSearchCase(state, baselineRunner, candidateRunner, SEARCH_ROUNDS);
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
  const baselineLastFlipCalls = sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmptiesLastFlipCalls');
  const candidateLastFlipCalls = sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmptiesLastFlipCalls');

  return {
    kind: 'search',
    label,
    targetEmpties,
    seeds,
    rounds: SEARCH_ROUNDS,
    summary: {
      cases: cases.length,
      identicalBestMoves: cases.filter((entry) => entry.sameMove).length,
      identicalScores: cases.filter((entry) => entry.sameScore).length,
      identicalModes: cases.filter((entry) => entry.sameMode).length,
      identicalNodes: cases.filter((entry) => entry.sameNodes).length,
      baselineElapsedMs: Number(baselineElapsedMs.toFixed(3)),
      candidateElapsedMs: Number(candidateElapsedMs.toFixed(3)),
      elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? Number((candidateElapsedMs / baselineElapsedMs).toFixed(3)) : null,
      baselineNodes,
      candidateNodes,
      nodeRatioCandidateVsBaseline: baselineNodes > 0 ? Number((candidateNodes / baselineNodes).toFixed(3)) : null,
      baselineLastFlipCalls: Number(baselineLastFlipCalls.toFixed(3)),
      candidateLastFlipCalls: Number(candidateLastFlipCalls.toFixed(3)),
    },
    cases,
  };
}

function runDirectOneEmptyMicro() {
  const corpus = DIRECT_ONE_EMPTY_SEEDS.map((seed) => {
    const state = playSeededRandomUntilEmptyCount(1, seed);
    assert.equal(state.getEmptyCount(), 1, `direct one-empty micro seed ${seed} should reach one empty.`);
    return { seed, state };
  });

  const baselineEngine = new SearchEngine(withToggle(DIRECT_OPTIONS, false));
  const candidateEngine = new SearchEngine(withToggle(DIRECT_OPTIONS, true));

  const runSide = (engine) => {
    let totalScore = 0;
    const startedAt = performance.now();
    for (let repetition = 0; repetition < DIRECT_ONE_EMPTY_REPETITIONS; repetition += 1) {
      for (const entry of corpus) {
        totalScore += engine.solveSmallExact(entry.state);
      }
    }
    return {
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      totalScore,
      smallSolverNodes: engine.stats.smallSolverNodes,
      specializedFewEmptiesLastFlipCalls: engine.stats.specializedFewEmptiesLastFlipCalls,
    };
  };

  runSide(baselineEngine);
  runSide(candidateEngine);

  const baselineSamples = [];
  const candidateSamples = [];
  for (let round = 0; round < DIRECT_ONE_EMPTY_ROUNDS; round += 1) {
    if (round % 2 === 0) {
      baselineSamples.push(runSide(baselineEngine));
      candidateSamples.push(runSide(candidateEngine));
    } else {
      candidateSamples.push(runSide(candidateEngine));
      baselineSamples.push(runSide(baselineEngine));
    }
  }

  const baselineElapsedMs = averageNumber(baselineSamples, 'elapsedMs');
  const candidateElapsedMs = averageNumber(candidateSamples, 'elapsedMs');
  const baselineSmallSolverNodes = averageNumber(baselineSamples, 'smallSolverNodes');
  const candidateSmallSolverNodes = averageNumber(candidateSamples, 'smallSolverNodes');
  const baselineLastFlipCalls = averageNumber(baselineSamples, 'specializedFewEmptiesLastFlipCalls');
  const candidateLastFlipCalls = averageNumber(candidateSamples, 'specializedFewEmptiesLastFlipCalls');

  return {
    kind: 'micro',
    label: 'direct_one_empty_last_flip_micro',
    seeds: DIRECT_ONE_EMPTY_SEEDS,
    rounds: DIRECT_ONE_EMPTY_ROUNDS,
    repetitionsPerRound: DIRECT_ONE_EMPTY_REPETITIONS,
    baseline: {
      elapsedMs: baselineElapsedMs,
      smallSolverNodes: baselineSmallSolverNodes,
      specializedFewEmptiesLastFlipCalls: baselineLastFlipCalls,
    },
    candidate: {
      elapsedMs: candidateElapsedMs,
      smallSolverNodes: candidateSmallSolverNodes,
      specializedFewEmptiesLastFlipCalls: candidateLastFlipCalls,
    },
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? Number((candidateElapsedMs / baselineElapsedMs).toFixed(3)) : null,
    smallSolverNodeRatioCandidateVsBaseline: baselineSmallSolverNodes > 0 ? Number((candidateSmallSolverNodes / baselineSmallSolverNodes).toFixed(3)) : null,
    baselineSamples,
    candidateSamples,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const directOneEmptyMicro = runDirectOneEmptyMicro();
  const exact10 = runSearchSection('exact_10_boundary', 10, EXACT10_SEEDS, EXACT10_OPTIONS);
  const exact12 = runSearchSection('exact_12_deeper', 12, EXACT12_SEEDS, EXACT12_OPTIONS);
  const wld12 = runSearchSection('wld_12_control', 12, WLD12_SEEDS, WLD12_OPTIONS);

  const output = {
    benchmark: 'Stage 200 specialized few-empties last-flip path benchmark',
    description: 'Benchmarks a Stage 200 candidate that threads diskDiff through the specialized 1~4 empties exact family and short-circuits the last 1-empty leaf through flip-count evaluation. The benchmark keeps all other exact-tail optimizations fixed and isolates specializedFewEmptiesLastFlipPath.',
    notes: [
      'candidate / baseline elapsed ratios below 1 mean the last-flip path is faster.',
      'The direct micro is intentionally narrow and only targets one-empty leaves, which is the part of the specialized family that changed the most.',
      'WLD 12 is a control bucket where the exact specialized path should stay unused, so any delta there is mostly noise or secondary runtime interaction.',
    ],
    directOneEmptyMicro,
    exact10,
    exact12,
    wld12,
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, JSON.stringify(output, null, 2));
  console.log(`Wrote ${args.output}`);
}

await main();
