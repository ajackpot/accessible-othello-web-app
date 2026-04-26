import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { SearchEngine } from '../../js/ai/search-engine.js';
import {
  listPreparedSearchMoves,
  materializePreparedSearchMove,
  PREPARED_SEARCH_MOVE_CORE_VARIANTS,
  PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS,
} from '../../js/core/rules.js';
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
  'stage198_compact_prepared_search_move_flips_benchmark_balanced_20260421.json',
);

const MICRO_EMPTIES = [26, 24, 22, 20, 18];
const MICRO_SEEDS = [11, 19, 29, 37, 47, 59];
const MICRO_REPETITIONS = 4000;
const DEPTH_LIMITED_24_SEEDS = [11, 29, 47];
const DEPTH_LIMITED_20_SEEDS = [17, 31, 43];
const SHARED_SEEDS_14 = [23, 37, 48, 60];
const SHARED_SEEDS_10 = [7, 13, 19, 25];

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

function withToggle(options, compactPreparedSearchMoveFlips) {
  return {
    ...options,
    allocationLightSearchMoves: true,
    reusablePreparedSearchMoveBuffers: true,
    lazyPreparedSearchMoves: true,
    tokenizedPreparedSearchMoveCore: true,
    compactPreparedSearchMoveFlips,
  };
}

function getFlipStorageVariant(compactPreparedSearchMoveFlips) {
  return compactPreparedSearchMoveFlips
    ? PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN
    : PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.BIGINT;
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

function addStateMetadata(summary, state, seed) {
  return {
    ...summary,
    seed,
    currentPlayer: state.currentPlayer,
    empties: state.getEmptyCount(),
    legalMoves: state.getSearchMoves().length,
  };
}

function buildSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');

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
  };
}

function buildMicroCorpus() {
  const corpus = [];
  for (const empties of MICRO_EMPTIES) {
    for (const seed of MICRO_SEEDS) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      assert.equal(state.getEmptyCount(), empties, `Micro corpus seed ${seed} should reach ${empties} empties.`);
      corpus.push({ state, empties, seed });
    }
  }
  return corpus;
}

function runPreparedMoveBuildMicroSection() {
  const corpus = buildMicroCorpus();

  const runBuilder = (label, compactPreparedSearchMoveFlips) => {
    let totalMoveRecords = 0;
    const flipStorageVariant = getFlipStorageVariant(compactPreparedSearchMoveFlips);
    const startedAt = performance.now();
    for (let repetition = 0; repetition < MICRO_REPETITIONS; repetition += 1) {
      for (const entry of corpus) {
        const { player, opponent } = entry.state.getPlayerBoards();
        const moves = listPreparedSearchMoves(player, opponent, {
          eager: true,
          coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
          flipStorageVariant,
        });
        totalMoveRecords += moves.length;
      }
    }
    return {
      label,
      flipStorageVariant,
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      totalMoveRecords,
    };
  };

  runBuilder('warm_baseline_bigint', false);
  runBuilder('warm_candidate_compact_token', true);

  const baseline = runBuilder('baseline_bigint', false);
  const candidate = runBuilder('candidate_compact_token', true);

  return {
    kind: 'micro',
    label: 'prepared_move_micro_eager',
    corpusStateCount: corpus.length,
    repetitions: MICRO_REPETITIONS,
    empties: MICRO_EMPTIES,
    seeds: MICRO_SEEDS,
    baseline,
    candidate,
    elapsedRatioCandidateVsBaseline: baseline.elapsedMs > 0 ? candidate.elapsedMs / baseline.elapsedMs : null,
  };
}

function runLazyApplyMicroSection() {
  const corpus = buildMicroCorpus();

  const runBuilder = (label, compactPreparedSearchMoveFlips) => {
    let totalAppliedMoves = 0;
    const flipStorageVariant = getFlipStorageVariant(compactPreparedSearchMoveFlips);
    const startedAt = performance.now();
    for (let repetition = 0; repetition < MICRO_REPETITIONS; repetition += 1) {
      for (const entry of corpus) {
        const { state } = entry;
        const { player, opponent } = state.getPlayerBoards();
        const moves = listPreparedSearchMoves(player, opponent, {
          eager: false,
          coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
          flipStorageVariant,
        });
        for (const move of moves) {
          materializePreparedSearchMove(move, player, opponent, { flipStorageVariant });
          const child = state.applyMoveFast(
            move.index,
            compactPreparedSearchMoveFlips ? move.token : (move.flips ?? null),
          );
          assert.ok(child, 'Prepared move materialize/apply micro should produce a child state.');
          totalAppliedMoves += 1;
        }
      }
    }
    return {
      label,
      flipStorageVariant,
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      totalAppliedMoves,
    };
  };

  runBuilder('warm_baseline_bigint', false);
  runBuilder('warm_candidate_compact_token', true);

  const baseline = runBuilder('baseline_bigint', false);
  const candidate = runBuilder('candidate_compact_token', true);

  return {
    kind: 'micro',
    label: 'prepared_move_micro_lazy_materialize_apply',
    corpusStateCount: corpus.length,
    repetitions: MICRO_REPETITIONS,
    empties: MICRO_EMPTIES,
    seeds: MICRO_SEEDS,
    baseline,
    candidate,
    elapsedRatioCandidateVsBaseline: baseline.elapsedMs > 0 ? candidate.elapsedMs / baseline.elapsedMs : null,
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

function runSection({
  label,
  targetEmptyCount,
  seeds,
  baseOptions,
  repetitions = 3,
}) {
  const baselineOptions = withToggle(baseOptions, false);
  const candidateOptions = withToggle(baseOptions, true);
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed} state`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    assert.equal(state.getEmptyCount(), targetEmptyCount, `${label}: seed ${seed} should reach ${targetEmptyCount} empties.`);

    console.error(`[${label}] seed ${seed} balanced samples`);
    const { baselineRun, candidateRun, baselineSamples, candidateSamples } = runBalancedPair(
      state,
      baselineOptions,
      candidateOptions,
      repetitions,
    );

    const baseline = addStateMetadata(baselineRun.summary, state, seed);
    const candidate = addStateMetadata(candidateRun.summary, state, seed);

    cases.push({
      seed,
      currentPlayer: state.currentPlayer,
      empties: state.getEmptyCount(),
      legalMoves: state.getSearchMoves().length,
      baseline,
      candidate,
      sameMove: baseline.bestMove === candidate.bestMove,
      sameScore: baseline.score === candidate.score,
      sameMode: baseline.mode === candidate.mode,
      sameNodes: baseline.nodes === candidate.nodes,
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
  const args = parseArgs(process.argv.slice(2));

  const preparedMoveBuildSection = runPreparedMoveBuildMicroSection();
  const lazyApplySection = runLazyApplyMicroSection();
  const depthLimited24Section = runSection({
    label: 'depth_limited_24empties_d6',
    targetEmptyCount: 24,
    seeds: DEPTH_LIMITED_24_SEEDS,
    baseOptions: DEPTH_LIMITED_24_OPTIONS,
    repetitions: 3,
  });
  const depthLimited20Section = runSection({
    label: 'depth_limited_20empties_d7',
    targetEmptyCount: 20,
    seeds: DEPTH_LIMITED_20_SEEDS,
    baseOptions: DEPTH_LIMITED_20_OPTIONS,
    repetitions: 3,
  });
  const wld14Section = runSection({
    label: 'wld_bucket_14empties',
    targetEmptyCount: 14,
    seeds: SHARED_SEEDS_14,
    baseOptions: WLD_14_OPTIONS,
    repetitions: 3,
  });
  const exact10Section = runSection({
    label: 'exact_bucket_10empties',
    targetEmptyCount: 10,
    seeds: SHARED_SEEDS_10,
    baseOptions: EXACT_10_OPTIONS,
    repetitions: 5,
  });

  const output = {
    stage: 198,
    tag: 'stage198',
    generatedAt: new Date().toISOString(),
    methodology: 'balanced_interleaved_with_per_state_warmup',
    summary: {
      preparedMoveBuild: {
        elapsedRatioCandidateVsBaseline: preparedMoveBuildSection.elapsedRatioCandidateVsBaseline,
      },
      lazyApply: {
        elapsedRatioCandidateVsBaseline: lazyApplySection.elapsedRatioCandidateVsBaseline,
      },
      depthLimited24: depthLimited24Section.summary,
      depthLimited20: depthLimited20Section.summary,
      wld14: wld14Section.summary,
      exact10: exact10Section.summary,
    },
    sections: [
      preparedMoveBuildSection,
      lazyApplySection,
      depthLimited24Section,
      depthLimited20Section,
      wld14Section,
      exact10Section,
    ],
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath: args.output,
    methodology: output.methodology,
    summary: output.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
