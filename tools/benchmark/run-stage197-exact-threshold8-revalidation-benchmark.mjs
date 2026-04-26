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
  'stage197_exact_threshold8_revalidation_benchmark_20260421.json',
);

const EXACT10_SEEDS = [7, 13, 19, 25];
const EXACT12_SEEDS = [7, 19, 31];
const WLD14_SEEDS = [23, 37, 60];

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

function withThreshold(options, optimizedFewEmptiesExactSolverEmpties) {
  return {
    ...options,
    optimizedFewEmptiesExactSolver: true,
    optimizedFewEmptiesExactSolverEmpties,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    lightweightFewEmptiesExactMovePath: true,
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

function runSearchSample(state, options) {
  const engine = new SearchEngine(options);
  const result = engine.findBestMove(state);
  return {
    result,
    summary: summarizeResult(result, state),
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
    baselineRun: chooseMedian(baselineSamples),
    candidateRun: chooseMedian(candidateSamples),
    baselineSamples,
    candidateSamples,
  };
}

function buildSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineSmallSolverNodes = sumBy(cases.map((entry) => entry.baseline), 'smallSolverNodes');
  const candidateSmallSolverNodes = sumBy(cases.map((entry) => entry.candidate), 'smallSolverNodes');

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
    baselineSmallSolverNodes,
    candidateSmallSolverNodes,
    smallSolverNodeRatioCandidateVsBaseline: baselineSmallSolverNodes > 0 ? candidateSmallSolverNodes / baselineSmallSolverNodes : null,
    baselineLightweight7to8Calls: sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties7Calls')
      + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties8Calls'),
    candidateLightweight7to8Calls: sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties7Calls')
      + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties8Calls'),
  };
}

function runSection({ label, targetEmptyCount, seeds, baseOptions, repetitions = 3 }) {
  const baselineOptions = withThreshold(baseOptions, 6);
  const candidateOptions = withThreshold(baseOptions, 8);
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed}`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    assert.equal(state.getEmptyCount(), targetEmptyCount, `${label}: seed ${seed} should reach ${targetEmptyCount} empties.`);
    const { baselineRun, candidateRun, baselineSamples, candidateSamples } = runBalancedPair(
      state,
      baselineOptions,
      candidateOptions,
      repetitions,
    );

    cases.push({
      seed,
      currentPlayer: state.currentPlayer,
      empties: state.getEmptyCount(),
      legalMoves: state.getSearchMoves().length,
      baseline: baselineRun.summary,
      candidate: candidateRun.summary,
      sameMove: baselineRun.summary.bestMove === candidateRun.summary.bestMove,
      sameScore: baselineRun.summary.score === candidateRun.summary.score,
      sameMode: baselineRun.summary.mode === candidateRun.summary.mode,
      baselineSamples: baselineSamples.map((sample) => sample.summary),
      candidateSamples: candidateSamples.map((sample) => sample.summary),
    });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    repetitions,
    options: {
      baseline: baselineOptions,
      candidate: candidateOptions,
    },
    summary: buildSummary(cases),
    cases,
  };
}

async function main() {
  const { output } = parseArgs(process.argv.slice(2));

  const exact10Section = runSection({
    label: 'exact_root_10_empties',
    targetEmptyCount: 10,
    seeds: EXACT10_SEEDS,
    baseOptions: EXACT10_OPTIONS,
  });
  const exact12Section = runSection({
    label: 'exact_root_12_empties',
    targetEmptyCount: 12,
    seeds: EXACT12_SEEDS,
    baseOptions: EXACT12_OPTIONS,
  });
  const wld14Section = runSection({
    label: 'wld_root_14_empties',
    targetEmptyCount: 14,
    seeds: WLD14_SEEDS,
    baseOptions: WLD14_OPTIONS,
  });

  const outputPayload = {
    tag: 'stage197',
    benchmark: 'Stage 197 exact threshold-8 revalidation benchmark',
    description: 'Compares the stage197 lightweight exact-tail path under threshold 6 versus threshold 8 to decide whether the optimized exact micro-solver default can be widened after the new reusable move path lands.',
    notes: [
      'Both baseline and candidate keep the stage197 lightweight exact-tail move path enabled.',
      'The only changed knob is optimizedFewEmptiesExactSolverEmpties: 6 vs 8.',
      'Balanced interleaving and median-of-three sampling are used per seed.',
    ],
    summary: {
      exact10: exact10Section.summary,
      exact12: exact12Section.summary,
      wld14: wld14Section.summary,
    },
    sections: {
      exact10Section,
      exact12Section,
      wld14Section,
    },
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(outputPayload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output, summary: outputPayload.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
