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

const SECTION_CONFIGS = Object.freeze({
  direct: {
    label: 'direct_small_exact_5_to_8_empties',
    direct: true,
    empties: [5, 6, 7, 8],
    seeds: [5, 11],
    repetitions: 3,
    baseOptions: {
      presetKey: 'custom',
      styleKey: 'balanced',
      maxDepth: 8,
      timeLimitMs: 1000,
      randomness: 0,
      exactFastestFirstOrdering: true,
      optimizedFewEmptiesExactSolver: true,
      specializedFewEmptiesExactSolver: true,
    },
  },
  exact10: {
    label: 'exact_root_10_empties',
    targetEmptyCount: 10,
    seeds: [7, 13, 19, 25],
    repetitions: 3,
    baseOptions: {
      presetKey: 'custom',
      styleKey: 'balanced',
      maxDepth: 4,
      exactEndgameEmpties: 10,
      aspirationWindow: 0,
      timeLimitMs: 10000,
      randomness: 0,
      maxTableEntries: 220000,
      wldPreExactEmpties: 0,
    },
  },
  exact12: {
    label: 'exact_root_12_empties',
    targetEmptyCount: 12,
    seeds: [7, 19, 31],
    repetitions: 3,
    baseOptions: {
      presetKey: 'custom',
      styleKey: 'balanced',
      maxDepth: 6,
      exactEndgameEmpties: 12,
      aspirationWindow: 0,
      timeLimitMs: 12000,
      randomness: 0,
      maxTableEntries: 240000,
      wldPreExactEmpties: 0,
    },
  },
  wld14: {
    label: 'wld_root_14_empties',
    targetEmptyCount: 14,
    seeds: [23, 37, 60],
    repetitions: 3,
    baseOptions: {
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
    },
  },
});

function parseArgs(argv) {
  const parsed = { mode: 'primary', section: 'direct', output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--mode') {
      parsed.mode = String(argv[index + 1] ?? parsed.mode);
      index += 1;
    } else if (token === '--section') {
      parsed.section = String(argv[index + 1] ?? parsed.section);
      index += 1;
    } else if (token === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return parsed;
}

function withPrimaryBaseline(options) {
  return {
    ...options,
    optimizedFewEmptiesExactSolver: true,
    optimizedFewEmptiesExactSolverEmpties: 6,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    lightweightFewEmptiesExactMovePath: false,
  };
}

function withPrimaryCandidate(options) {
  return {
    ...options,
    optimizedFewEmptiesExactSolver: true,
    optimizedFewEmptiesExactSolverEmpties: 8,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    lightweightFewEmptiesExactMovePath: true,
  };
}

function withThresholdCandidate(options, threshold) {
  return {
    ...options,
    optimizedFewEmptiesExactSolver: true,
    optimizedFewEmptiesExactSolverEmpties: threshold,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    lightweightFewEmptiesExactMovePath: true,
  };
}

function resolveVariantOptions(mode, baseOptions) {
  if (mode === 'threshold') {
    return {
      baseline: withThresholdCandidate(baseOptions, 6),
      candidate: withThresholdCandidate(baseOptions, 8),
    };
  }
  return {
    baseline: withPrimaryBaseline(baseOptions),
    candidate: withPrimaryCandidate(baseOptions),
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
    summary: summarizeResult(result, state),
  };
}

function runDirectSample(state, options) {
  const engine = new SearchEngine(options);
  const startedAt = performance.now();
  const score = engine.solveSmallExact(state);
  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  return {
    summary: {
      score,
      elapsedMs,
      smallSolverNodes: engine.stats.smallSolverNodes,
      lightweightFewEmpties5Calls: engine.stats.lightweightFewEmpties5Calls,
      lightweightFewEmpties6Calls: engine.stats.lightweightFewEmpties6Calls,
      lightweightFewEmpties7Calls: engine.stats.lightweightFewEmpties7Calls,
      lightweightFewEmpties8Calls: engine.stats.lightweightFewEmpties8Calls,
      optimizedFewEmpties5Calls: engine.stats.optimizedFewEmpties5Calls,
      optimizedFewEmpties6Calls: engine.stats.optimizedFewEmpties6Calls,
      optimizedFewEmpties7Calls: engine.stats.optimizedFewEmpties7Calls,
      optimizedFewEmpties8Calls: engine.stats.optimizedFewEmpties8Calls,
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
    baselineSamples: baselineSamples.map((sample) => sample.summary),
    candidateSamples: candidateSamples.map((sample) => sample.summary),
  };
}

function buildSearchSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
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
    baselineLightweightCalls,
    candidateLightweightCalls,
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

async function main() {
  const { mode, section, output } = parseArgs(process.argv.slice(2));
  const config = SECTION_CONFIGS[section];
  assert.ok(config, `Unknown section: ${section}`);
  const variants = resolveVariantOptions(mode, config.baseOptions);

  let payload;
  if (config.direct) {
    const cases = [];
    for (const empties of config.empties) {
      for (const seed of config.seeds) {
        const state = playSeededRandomUntilEmptyCount(empties, seed);
        assert.equal(state.getEmptyCount(), empties, `${section}: seed ${seed} should reach ${empties} empties.`);
        const pair = runBalancedPair(state, variants.baseline, variants.candidate, config.repetitions, runDirectSample);
        cases.push({
          seed,
          empties,
          baseline: pair.baselineRun.summary,
          candidate: pair.candidateRun.summary,
          sameScore: pair.baselineRun.summary.score === pair.candidateRun.summary.score,
          sameSmallSolverNodes: pair.baselineRun.summary.smallSolverNodes === pair.candidateRun.summary.smallSolverNodes,
          baselineSamples: pair.baselineSamples,
          candidateSamples: pair.candidateSamples,
        });
      }
    }
    payload = {
      mode,
      section,
      label: config.label,
      repetitions: config.repetitions,
      options: variants,
      summary: buildDirectSummary(cases),
      cases,
    };
  } else {
    const cases = [];
    for (const seed of config.seeds) {
      const state = playSeededRandomUntilEmptyCount(config.targetEmptyCount, seed);
      assert.equal(state.getEmptyCount(), config.targetEmptyCount, `${section}: seed ${seed} should reach ${config.targetEmptyCount} empties.`);
      const pair = runBalancedPair(state, variants.baseline, variants.candidate, config.repetitions, runSearchSample);
      cases.push({
        seed,
        currentPlayer: state.currentPlayer,
        empties: state.getEmptyCount(),
        legalMoves: state.getSearchMoves().length,
        baseline: pair.baselineRun.summary,
        candidate: pair.candidateRun.summary,
        sameMove: pair.baselineRun.summary.bestMove === pair.candidateRun.summary.bestMove,
        sameScore: pair.baselineRun.summary.score === pair.candidateRun.summary.score,
        sameMode: pair.baselineRun.summary.mode === pair.candidateRun.summary.mode,
        baselineSamples: pair.baselineSamples,
        candidateSamples: pair.candidateSamples,
      });
    }
    payload = {
      mode,
      section,
      label: config.label,
      targetEmptyCount: config.targetEmptyCount,
      repetitions: config.repetitions,
      options: variants,
      summary: buildSearchSummary(cases),
      cases,
    };
  }

  if (output) {
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
