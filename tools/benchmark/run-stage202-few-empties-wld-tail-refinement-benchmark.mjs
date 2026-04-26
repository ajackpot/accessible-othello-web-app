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
  'stage202_few_empties_wld_tail_refinement_bundle_benchmark_20260422.json',
);

const DIRECT_ONE_EMPTY_SEEDS = [2, 5, 11, 17, 29, 41];
const DIRECT_ONE_EMPTY_REPETITIONS = 48;
const DIRECT_EIGHT_SEEDS = [7, 13, 19, 25, 31, 37];
const DIRECT_EIGHT_REPETITIONS = 36;
const WLD10_SEEDS = [7, 19, 31];
const WLD10_ROUNDS = 4;
const WLD12_SEEDS = [23, 37, 50];
const WLD12_ROUNDS = 4;
const WLD14_SEEDS = [23, 37, 60];
const WLD14_ROUNDS = 3;
const EXACT12_CONTROL_SEEDS = [7, 19, 31];
const EXACT12_CONTROL_ROUNDS = 3;

const DIRECT_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  timeLimitMs: 1000,
  randomness: 0,
  maxTableEntries: 160000,
  wldPreExactEmpties: 0,
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
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
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
  exactFastestFirstOrdering: true,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
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
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
  exactFastestFirstOrdering: true,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
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
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
  exactFastestFirstOrdering: true,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
});

const EXACT12_CONTROL_OPTIONS = Object.freeze({
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
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
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

function withToggle(options, specializedFewEmptiesWldLastFlipPath, fewEmptiesWldFastestFirstSelectiveGate) {
  return {
    ...options,
    specializedFewEmptiesWldLastFlipPath,
    fewEmptiesWldFastestFirstSelectiveGate,
  };
}

function createFreshHistoryHeuristic() {
  return Array.from({ length: 2 }, () => Array(64).fill(0));
}

function createDirectRunner(options) {
  const engine = new SearchEngine(options);
  return (state) => {
    engine.stats = createEmptySearchStats();
    const startedAt = performance.now();
    const score = engine.solveSmallWld(state);
    return {
      elapsedMs: Number((performance.now() - startedAt).toFixed(6)),
      score,
      wldSmallSolverNodes: engine.stats.wldSmallSolverNodes ?? null,
      specializedFewEmptiesWldLastFlipCalls: engine.stats.specializedFewEmptiesWldLastFlipCalls ?? null,
      optimizedFewEmptiesWldFastestFirstSorts: engine.stats.optimizedFewEmptiesWldFastestFirstSorts ?? null,
      optimizedFewEmptiesWldFastestFirstSelectiveSkips: engine.stats.optimizedFewEmptiesWldFastestFirstSelectiveSkips ?? null,
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
      wldSmallSolverNodes: result.stats?.wldSmallSolverNodes ?? null,
      specializedFewEmptiesWldLastFlipCalls: result.stats?.specializedFewEmptiesWldLastFlipCalls ?? null,
      optimizedFewEmptiesWldFastestFirstSorts: result.stats?.optimizedFewEmptiesWldFastestFirstSorts ?? null,
      optimizedFewEmptiesWldFastestFirstSelectiveSkips: result.stats?.optimizedFewEmptiesWldFastestFirstSelectiveSkips ?? null,
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
    assert.equal(sample.wldSmallSolverNodes, first.wldSmallSolverNodes, 'Direct benchmark samples should keep WLD small-solver node parity within a side.');
  }
  return {
    score: first.score,
    wldSmallSolverNodes: first.wldSmallSolverNodes,
    elapsedMs: averageNumber(samples, 'elapsedMs'),
    specializedFewEmptiesWldLastFlipCalls: averageNumber(samples, 'specializedFewEmptiesWldLastFlipCalls'),
    optimizedFewEmptiesWldFastestFirstSorts: averageNumber(samples, 'optimizedFewEmptiesWldFastestFirstSorts'),
    optimizedFewEmptiesWldFastestFirstSelectiveSkips: averageNumber(samples, 'optimizedFewEmptiesWldFastestFirstSelectiveSkips'),
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
    wldSmallSolverNodes: averageNumber(samples, 'wldSmallSolverNodes'),
    specializedFewEmptiesWldLastFlipCalls: averageNumber(samples, 'specializedFewEmptiesWldLastFlipCalls'),
    optimizedFewEmptiesWldFastestFirstSorts: averageNumber(samples, 'optimizedFewEmptiesWldFastestFirstSorts'),
    optimizedFewEmptiesWldFastestFirstSelectiveSkips: averageNumber(samples, 'optimizedFewEmptiesWldFastestFirstSelectiveSkips'),
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
  const baselineRunner = createDirectRunner(withToggle(options, false, false));
  const candidateRunner = createDirectRunner(withToggle(options, true, true));
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
      baselineSamples: measured.baselineSamples,
      candidateSamples: measured.candidateSamples,
      sameScore: measured.baseline.score === measured.candidate.score,
      sameWldSmallSolverNodes: measured.baseline.wldSmallSolverNodes === measured.candidate.wldSmallSolverNodes,
    });
  }

  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverNodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverNodes');
  const baselineLastFlipCalls = sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmptiesWldLastFlipCalls');
  const candidateLastFlipCalls = sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmptiesWldLastFlipCalls');
  const baselineSelectiveSkips = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWldFastestFirstSelectiveSkips');
  const candidateSelectiveSkips = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWldFastestFirstSelectiveSkips');

  return {
    label,
    type: 'direct-solveSmallWld',
    summary: {
      cases: cases.length,
      identicalScores: cases.filter((entry) => entry.sameScore).length,
      identicalWldSmallSolverNodes: cases.filter((entry) => entry.sameWldSmallSolverNodes).length,
      baselineElapsedMs,
      candidateElapsedMs,
      elapsedRatioCandidateVsBaseline: ratio(candidateElapsedMs, baselineElapsedMs),
      baselineWldSmallSolverNodes: baselineNodes,
      candidateWldSmallSolverNodes: candidateNodes,
      wldSmallSolverNodeRatioCandidateVsBaseline: ratio(candidateNodes, baselineNodes),
      baselineLastFlipCalls: baselineLastFlipCalls,
      candidateLastFlipCalls: candidateLastFlipCalls,
      baselineSelectiveSkips,
      candidateSelectiveSkips,
    },
    cases,
  };
}

function runSearchSection(label, targetEmpties, seeds, options, rounds) {
  const baselineRunner = createSearchRunner(withToggle(options, false, false));
  const candidateRunner = createSearchRunner(withToggle(options, true, true));
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
      baselineSamples: measured.baselineSamples,
      candidateSamples: measured.candidateSamples,
      sameMove: measured.baseline.bestMove === measured.candidate.bestMove,
      sameScore: measured.baseline.score === measured.candidate.score,
      sameMode: measured.baseline.mode === measured.candidate.mode,
      sameNodes: measured.baseline.nodes === measured.candidate.nodes,
    });
  }

  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineWldSmallSolverNodes = sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverNodes');
  const candidateWldSmallSolverNodes = sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverNodes');
  const baselineLastFlipCalls = sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmptiesWldLastFlipCalls');
  const candidateLastFlipCalls = sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmptiesWldLastFlipCalls');
  const baselineSelectiveSkips = sumBy(cases.map((entry) => entry.baseline), 'optimizedFewEmptiesWldFastestFirstSelectiveSkips');
  const candidateSelectiveSkips = sumBy(cases.map((entry) => entry.candidate), 'optimizedFewEmptiesWldFastestFirstSelectiveSkips');

  return {
    label,
    type: 'root-search',
    summary: {
      cases: cases.length,
      identicalBestMoves: cases.filter((entry) => entry.sameMove).length,
      identicalScores: cases.filter((entry) => entry.sameScore).length,
      identicalModes: cases.filter((entry) => entry.sameMode).length,
      identicalNodes: cases.filter((entry) => entry.sameNodes).length,
      baselineElapsedMs,
      candidateElapsedMs,
      elapsedRatioCandidateVsBaseline: ratio(candidateElapsedMs, baselineElapsedMs),
      baselineNodes,
      candidateNodes,
      nodeRatioCandidateVsBaseline: ratio(candidateNodes, baselineNodes),
      baselineWldSmallSolverNodes,
      candidateWldSmallSolverNodes,
      wldSmallSolverNodeRatioCandidateVsBaseline: ratio(candidateWldSmallSolverNodes, baselineWldSmallSolverNodes),
      baselineLastFlipCalls: baselineLastFlipCalls,
      candidateLastFlipCalls: candidateLastFlipCalls,
      baselineSelectiveSkips,
      candidateSelectiveSkips,
    },
    cases,
  };
}

async function main() {
  const { output } = parseArgs(process.argv.slice(2));

  const sections = [
    runDirectSection('directOneEmptyWldMicro', 1, DIRECT_ONE_EMPTY_SEEDS, DIRECT_OPTIONS, DIRECT_ONE_EMPTY_REPETITIONS),
    runDirectSection('directEightWldMicro', 8, DIRECT_EIGHT_SEEDS, DIRECT_OPTIONS, DIRECT_EIGHT_REPETITIONS),
    runSearchSection('wld10', 10, WLD10_SEEDS, WLD10_OPTIONS, WLD10_ROUNDS),
    runSearchSection('wld12', 12, WLD12_SEEDS, WLD12_OPTIONS, WLD12_ROUNDS),
    runSearchSection('wld14', 14, WLD14_SEEDS, WLD14_OPTIONS, WLD14_ROUNDS),
    runSearchSection('exact12Control', 12, EXACT12_CONTROL_SEEDS, EXACT12_CONTROL_OPTIONS, EXACT12_CONTROL_ROUNDS),
  ];

  const searchSections = sections.filter((section) => section.type === 'root-search' && section.label !== 'exact12Control');
  const controlSections = sections.filter((section) => section.label === 'exact12Control');

  const summary = {
    directOneEmptyElapsedRatioCandidateVsBaseline: sections.find((section) => section.label === 'directOneEmptyWldMicro')?.summary?.elapsedRatioCandidateVsBaseline ?? null,
    directEightElapsedRatioCandidateVsBaseline: sections.find((section) => section.label === 'directEightWldMicro')?.summary?.elapsedRatioCandidateVsBaseline ?? null,
    searchAggregateElapsedRatioCandidateVsBaseline: ratio(
      sumBy(searchSections.map((section) => section.summary), 'candidateElapsedMs'),
      sumBy(searchSections.map((section) => section.summary), 'baselineElapsedMs'),
    ),
    searchAggregateNodeRatioCandidateVsBaseline: ratio(
      sumBy(searchSections.map((section) => section.summary), 'candidateNodes'),
      sumBy(searchSections.map((section) => section.summary), 'baselineNodes'),
    ),
    searchAggregateWldSmallSolverNodeRatioCandidateVsBaseline: ratio(
      sumBy(searchSections.map((section) => section.summary), 'candidateWldSmallSolverNodes'),
      sumBy(searchSections.map((section) => section.summary), 'baselineWldSmallSolverNodes'),
    ),
    controlAggregateElapsedRatioCandidateVsBaseline: ratio(
      sumBy(controlSections.map((section) => section.summary), 'candidateElapsedMs'),
      sumBy(controlSections.map((section) => section.summary), 'baselineElapsedMs'),
    ),
    controlAggregateNodeRatioCandidateVsBaseline: ratio(
      sumBy(controlSections.map((section) => section.summary), 'candidateNodes'),
      sumBy(controlSections.map((section) => section.summary), 'baselineNodes'),
    ),
  };

  const payload = {
    stage: 202,
    tag: 'stage202',
    generatedAt: new Date().toISOString(),
    summary,
    sections,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));
}

await main();
