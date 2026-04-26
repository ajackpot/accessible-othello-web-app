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
  'stage197_lightweight_few_empties_exact_move_path_benchmark_20260421.json',
);

const DIRECT_EMPTIES = [5, 6, 7, 8];
const DIRECT_SEEDS = [5, 11, 23];
const DIRECT_REPETITIONS = 3;
const EXACT10_SEEDS = [7, 13, 19, 25];
const EXACT12_SEEDS = [7, 19, 31];
const WLD14_SEEDS = [23, 37, 60];

const DIRECT_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  exactFastestFirstOrdering: true,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
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

function withBaseline(options) {
  return {
    ...options,
    optimizedFewEmptiesExactSolver: true,
    optimizedFewEmptiesExactSolverEmpties: 6,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    lightweightFewEmptiesExactMovePath: false,
  };
}

function withCandidate(options) {
  return {
    ...options,
    optimizedFewEmptiesExactSolver: true,
    optimizedFewEmptiesExactSolverEmpties: 8,
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
  const nodesLeft = Number(left.summary.nodes ?? left.summary.smallSolverNodes ?? Number.POSITIVE_INFINITY);
  const nodesRight = Number(right.summary.nodes ?? right.summary.smallSolverNodes ?? Number.POSITIVE_INFINITY);
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

function runDirectSmallExactSample(state, options) {
  const engine = new SearchEngine(options);
  const startedAt = performance.now();
  const score = engine.solveSmallExact(state);
  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  return {
    summary: {
      score,
      elapsedMs,
      smallSolverNodes: engine.stats.smallSolverNodes,
      optimizedFewEmpties5Calls: engine.stats.optimizedFewEmpties5Calls,
      optimizedFewEmpties6Calls: engine.stats.optimizedFewEmpties6Calls,
      optimizedFewEmpties7Calls: engine.stats.optimizedFewEmpties7Calls,
      optimizedFewEmpties8Calls: engine.stats.optimizedFewEmpties8Calls,
      lightweightFewEmpties5Calls: engine.stats.lightweightFewEmpties5Calls,
      lightweightFewEmpties6Calls: engine.stats.lightweightFewEmpties6Calls,
      lightweightFewEmpties7Calls: engine.stats.lightweightFewEmpties7Calls,
      lightweightFewEmpties8Calls: engine.stats.lightweightFewEmpties8Calls,
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
    baselineLightweightCalls: sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties5Calls')
      + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties6Calls')
      + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties7Calls')
      + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties8Calls'),
    candidateLightweightCalls: sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties5Calls')
      + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties6Calls')
      + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties7Calls')
      + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties8Calls'),
  };
}

function buildDirectSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineSmallSolverNodes = sumBy(cases.map((entry) => entry.baseline), 'smallSolverNodes');
  const candidateSmallSolverNodes = sumBy(cases.map((entry) => entry.candidate), 'smallSolverNodes');
  const baselineLightweightCalls = sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties5Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties6Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties7Calls')
    + sumBy(cases.map((entry) => entry.baseline), 'lightweightFewEmpties8Calls');
  const candidateLightweightCalls = sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties5Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties6Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties7Calls')
    + sumBy(cases.map((entry) => entry.candidate), 'lightweightFewEmpties8Calls');

  return {
    cases: cases.length,
    identicalScores: cases.filter((entry) => entry.sameScore).length,
    identicalSmallSolverNodes: cases.filter((entry) => entry.sameSmallSolverNodes).length,
    baselineElapsedMs,
    candidateElapsedMs,
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null,
    baselineSmallSolverNodes,
    candidateSmallSolverNodes,
    smallSolverNodeRatioCandidateVsBaseline: baselineSmallSolverNodes > 0 ? candidateSmallSolverNodes / baselineSmallSolverNodes : null,
    baselineLightweightCalls,
    candidateLightweightCalls,
  };
}

function runDirectSection() {
  const baselineOptions = withBaseline(DIRECT_OPTIONS);
  const candidateOptions = withCandidate(DIRECT_OPTIONS);
  const cases = [];

  for (const empties of DIRECT_EMPTIES) {
    for (const seed of DIRECT_SEEDS) {
      console.error(`[direct] empties ${empties} seed ${seed}`);
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      assert.equal(state.getEmptyCount(), empties, `direct: seed ${seed} should reach ${empties} empties.`);
      const { baselineRun, candidateRun, baselineSamples, candidateSamples } = runBalancedPair(
        state,
        baselineOptions,
        candidateOptions,
        DIRECT_REPETITIONS,
        runDirectSmallExactSample,
      );

      cases.push({
        seed,
        empties,
        baseline: baselineRun.summary,
        candidate: candidateRun.summary,
        sameScore: baselineRun.summary.score === candidateRun.summary.score,
        sameSmallSolverNodes: baselineRun.summary.smallSolverNodes === candidateRun.summary.smallSolverNodes,
        baselineSamples: baselineSamples.map((sample) => sample.summary),
        candidateSamples: candidateSamples.map((sample) => sample.summary),
      });
    }
  }

  return {
    label: 'direct_small_exact_5_to_8_empties',
    repetitions: DIRECT_REPETITIONS,
    empties: DIRECT_EMPTIES,
    seeds: DIRECT_SEEDS,
    options: {
      baseline: baselineOptions,
      candidate: candidateOptions,
    },
    summary: buildDirectSummary(cases),
    cases,
  };
}

function runSearchSection({ label, targetEmptyCount, seeds, baseOptions, repetitions = 3 }) {
  const baselineOptions = withBaseline(baseOptions);
  const candidateOptions = withCandidate(baseOptions);
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
      runSearchSample,
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
    summary: buildSearchSummary(cases),
    cases,
  };
}

async function main() {
  const { output } = parseArgs(process.argv.slice(2));

  const directSection = runDirectSection();
  const exact10Section = runSearchSection({
    label: 'exact_root_10_empties',
    targetEmptyCount: 10,
    seeds: EXACT10_SEEDS,
    baseOptions: EXACT10_OPTIONS,
  });
  const exact12Section = runSearchSection({
    label: 'exact_root_12_empties',
    targetEmptyCount: 12,
    seeds: EXACT12_SEEDS,
    baseOptions: EXACT12_OPTIONS,
  });
  const wld14Section = runSearchSection({
    label: 'wld_root_14_empties',
    targetEmptyCount: 14,
    seeds: WLD14_SEEDS,
    baseOptions: WLD14_OPTIONS,
  });

  const outputPayload = {
    tag: 'stage197',
    benchmark: 'Stage 197 lightweight few-empties exact move path benchmark',
    description: 'Compares the current stage196 exact-tail baseline (threshold 6, no lightweight reusable move path) against the stage197 candidate bundle (lightweight reusable exact-tail move path enabled, threshold 8) across direct 5-8 empty small-solver states and exact/WLD root searches.',
    notes: [
      'The direct small-solver section calls solveSmallExact(state) directly to isolate the tail move-path cost without root move-selection overhead.',
      'Exact search sections use balanced interleaving and median-of-three sampling per seed.',
      'The WLD section is included as a regression spot-check even though the candidate bundle is exact-tail focused.',
    ],
    summary: {
      directSmallExact: directSection.summary,
      exact10: exact10Section.summary,
      exact12: exact12Section.summary,
      wld14: wld14Section.summary,
    },
    sections: {
      directSection,
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
