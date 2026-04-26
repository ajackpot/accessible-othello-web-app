import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { listPreparedSearchMoves } from '../../js/core/rules.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
  sumBy,
} from '../../js/test/benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_OUTPUT_PATH = path.join(
  repoRoot,
  'benchmarks',
  'stage195_lazy_prepared_search_moves_benchmark_20260421.json',
);
const DEFAULT_CONTROL_OUTPUT_PATH = path.join(
  repoRoot,
  'benchmarks',
  'stage195_lazy_prepared_search_moves_benchmark_control_20260421.json',
);

const MICRO_EMPTIES = [26, 24, 22, 20, 18];
const MICRO_SEEDS = [11, 19, 29, 37, 47, 59];
const MICRO_REPETITIONS = 6000;
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
  const parsed = { output: null, candidateFirst: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === '--candidate-first') {
      parsed.candidateFirst = true;
    }
  }
  if (!parsed.output) {
    parsed.output = parsed.candidateFirst ? DEFAULT_CONTROL_OUTPUT_PATH : DEFAULT_OUTPUT_PATH;
  }
  return parsed;
}

function withToggle(options, lazyPreparedSearchMoves) {
  return {
    ...options,
    allocationLightSearchMoves: true,
    reusablePreparedSearchMoveBuffers: true,
    lazyPreparedSearchMoves,
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

function runMoveGenerationMicroSection(candidateFirst = false) {
  const corpus = buildMicroCorpus();

  const runBuilder = (label, eager) => {
    let totalMoveRecords = 0;
    const startedAt = performance.now();
    for (let repetition = 0; repetition < MICRO_REPETITIONS; repetition += 1) {
      for (const entry of corpus) {
        const { player, opponent } = entry.state.getPlayerBoards();
        const moves = listPreparedSearchMoves(player, opponent, { eager });
        totalMoveRecords += moves.length;
      }
    }
    return {
      label,
      eager,
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      totalMoveRecords,
    };
  };

  const first = candidateFirst
    ? runBuilder('candidate_lazy', false)
    : runBuilder('baseline_eager', true);
  const second = candidateFirst
    ? runBuilder('baseline_eager', true)
    : runBuilder('candidate_lazy', false);
  const baseline = candidateFirst ? second : first;
  const candidate = candidateFirst ? first : second;

  return {
    corpusStateCount: corpus.length,
    repetitions: MICRO_REPETITIONS,
    empties: MICRO_EMPTIES,
    seeds: MICRO_SEEDS,
    candidateFirst,
    baseline,
    candidate,
    elapsedRatioCandidateVsBaseline: baseline.elapsedMs > 0 ? candidate.elapsedMs / baseline.elapsedMs : null,
  };
}

function runSection({
  label,
  targetEmptyCount,
  seeds,
  baseOptions,
  repetitions = 1,
  candidateFirst = false,
}) {
  const baselineOptions = withToggle(baseOptions, false);
  const candidateOptions = withToggle(baseOptions, true);
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed} state`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    assert.equal(state.getEmptyCount(), targetEmptyCount, `${label}: seed ${seed} should reach ${targetEmptyCount} empties.`);

    let baselineRun;
    let candidateRun;
    if (candidateFirst) {
      console.error(`[${label}] seed ${seed} candidate`);
      candidateRun = runMedianSearch(state, candidateOptions, repetitions);
      console.error(`[${label}] seed ${seed} baseline`);
      baselineRun = runMedianSearch(state, baselineOptions, repetitions);
    } else {
      console.error(`[${label}] seed ${seed} baseline`);
      baselineRun = runMedianSearch(state, baselineOptions, repetitions);
      console.error(`[${label}] seed ${seed} candidate`);
      candidateRun = runMedianSearch(state, candidateOptions, repetitions);
    }

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
      baselineSamples: baselineRun.samples,
      candidateSamples: candidateRun.samples,
    });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    candidateFirst,
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

  const moveGenerationMicroSection = runMoveGenerationMicroSection(args.candidateFirst);
  const depthLimited24Section = runSection({
    label: 'depth_limited_24empties_d6',
    targetEmptyCount: 24,
    seeds: DEPTH_LIMITED_24_SEEDS,
    baseOptions: DEPTH_LIMITED_24_OPTIONS,
    repetitions: 3,
    candidateFirst: args.candidateFirst,
  });
  const depthLimited20Section = runSection({
    label: 'depth_limited_20empties_d7',
    targetEmptyCount: 20,
    seeds: DEPTH_LIMITED_20_SEEDS,
    baseOptions: DEPTH_LIMITED_20_OPTIONS,
    repetitions: 3,
    candidateFirst: args.candidateFirst,
  });
  const wld14Section = runSection({
    label: 'wld_bucket_14empties',
    targetEmptyCount: 14,
    seeds: SHARED_SEEDS_14,
    baseOptions: WLD_14_OPTIONS,
    repetitions: 1,
    candidateFirst: args.candidateFirst,
  });
  const exact10Section = runSection({
    label: 'exact_bucket_10empties',
    targetEmptyCount: 10,
    seeds: SHARED_SEEDS_10,
    baseOptions: EXACT_10_OPTIONS,
    repetitions: 1,
    candidateFirst: args.candidateFirst,
  });

  const output = {
    stage: 195,
    tag: 'stage195',
    generatedAt: new Date().toISOString(),
    candidateFirst: args.candidateFirst,
    summary: {
      moveGenerationMicro: {
        elapsedRatioCandidateVsBaseline: moveGenerationMicroSection.elapsedRatioCandidateVsBaseline,
      },
      depthLimited24: depthLimited24Section.summary,
      depthLimited20: depthLimited20Section.summary,
      wld14: wld14Section.summary,
      exact10: exact10Section.summary,
    },
    sections: [
      moveGenerationMicroSection,
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
    candidateFirst: args.candidateFirst,
    summary: output.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
