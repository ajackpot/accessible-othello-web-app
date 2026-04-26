import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const runner = path.join(__dirname, 'run-stage203-search-sample.mjs');
const output = path.join(
  repoRoot,
  'benchmarks',
  'stage203_tt_first_deferred_move_list_build_benchmark_split_20260422.json',
);

const DEPTH_LIMITED_24_SEEDS = [11, 29, 47];
const DEPTH_LIMITED_20_SEEDS = [17, 31, 43];
const WLD_14_SEEDS = [23, 37, 48, 60];
const EXACT_10_SEEDS = [7, 13, 19, 25];

const DEPTH_LIMITED_24_OPTIONS = Object.freeze({
  presetKey: 'custom', styleKey: 'balanced', maxDepth: 6, exactEndgameEmpties: 12,
  aspirationWindow: 0, timeLimitMs: 1800, randomness: 0, maxTableEntries: 240000,
});
const DEPTH_LIMITED_20_OPTIONS = Object.freeze({
  presetKey: 'custom', styleKey: 'balanced', maxDepth: 7, exactEndgameEmpties: 12,
  aspirationWindow: 0, timeLimitMs: 4000, randomness: 0, maxTableEntries: 280000,
});
const WLD_14_OPTIONS = Object.freeze({
  presetKey: 'custom', styleKey: 'balanced', maxDepth: 8, exactEndgameEmpties: 12,
  aspirationWindow: 0, timeLimitMs: 3900, randomness: 0, maxTableEntries: 260000,
  wldPreExactEmpties: 2, enhancedTranspositionCutoff: true, enhancedTranspositionCutoffWld: true,
});
const EXACT_10_OPTIONS = Object.freeze({
  presetKey: 'custom', styleKey: 'balanced', maxDepth: 4, exactEndgameEmpties: 10,
  aspirationWindow: 0, timeLimitMs: 10000, randomness: 0, maxTableEntries: 220000,
  wldPreExactEmpties: 0,
});
const BASE_TOGGLES = Object.freeze({
  allocationLightSearchMoves: true,
  reusablePreparedSearchMoveBuffers: true,
  lazyPreparedSearchMoves: true,
  tokenizedPreparedSearchMoveCore: true,
  compactPreparedSearchMoveFlips: false,
});
const COMPANION_VARIANTS = Object.freeze({
  baseline: Object.freeze({ ttFirstDeferredMoveListBuild: false, lowOverheadSearchChildStateFactory: false }),
  deferredOnly: Object.freeze({ ttFirstDeferredMoveListBuild: true, lowOverheadSearchChildStateFactory: false }),
  lowOverheadOnly: Object.freeze({ ttFirstDeferredMoveListBuild: false, lowOverheadSearchChildStateFactory: true }),
  both: Object.freeze({ ttFirstDeferredMoveListBuild: true, lowOverheadSearchChildStateFactory: true }),
});

function createOptions(baseOptions, toggles) {
  return {
    ...baseOptions,
    ...BASE_TOGGLES,
    ...toggles,
  };
}

function runSearch(targetEmptyCount, seed, options) {
  const stdout = execFileSync(
    'node',
    [runner, String(targetEmptyCount), String(seed), JSON.stringify(options)],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}

function compareSamples(left, right) {
  const elapsedLeft = Number(left?.elapsedMs ?? Number.POSITIVE_INFINITY);
  const elapsedRight = Number(right?.elapsedMs ?? Number.POSITIVE_INFINITY);
  if (elapsedLeft !== elapsedRight) {
    return elapsedLeft - elapsedRight;
  }
  const nodesLeft = Number(left?.nodes ?? Number.POSITIVE_INFINITY);
  const nodesRight = Number(right?.nodes ?? Number.POSITIVE_INFINITY);
  if (nodesLeft !== nodesRight) {
    return nodesLeft - nodesRight;
  }
  return 0;
}

function chooseMedian(samples) {
  const sorted = [...samples].sort(compareSamples);
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
}

function sumBy(items, key) {
  return items.reduce((sum, item) => sum + Number(item?.[key] ?? 0), 0);
}

function buildParityRecord(seed, baselineSummary, candidateSummary) {
  return {
    seed,
    sameMove: baselineSummary.bestMove === candidateSummary.bestMove,
    sameScore: baselineSummary.score === candidateSummary.score,
    sameMode: baselineSummary.mode === candidateSummary.mode,
    sameNodes: baselineSummary.nodes === candidateSummary.nodes,
    baseline: baselineSummary,
    candidate: candidateSummary,
  };
}

function buildPairSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineAttempts = sumBy(cases.map((entry) => entry.baseline), 'ttFirstDeferredMoveListBuildAttempts');
  const candidateAttempts = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildAttempts');
  const candidateLegalHits = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildLegalHits');
  const candidateCutoffs = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildCutoffs');
  const candidateSkips = sumBy(cases.map((entry) => entry.candidate), 'ttFirstDeferredMoveListBuildSkips');
  const baselineLowOverheadChildStates = sumBy(cases.map((entry) => entry.baseline), 'lowOverheadSearchChildStates');
  const candidateLowOverheadChildStates = sumBy(cases.map((entry) => entry.candidate), 'lowOverheadSearchChildStates');
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
    baselineDeferredAttempts: baselineAttempts,
    candidateDeferredAttempts: candidateAttempts,
    candidateDeferredLegalHits: candidateLegalHits,
    candidateDeferredCutoffs: candidateCutoffs,
    candidateDeferredSkips: candidateSkips,
    baselineLowOverheadChildStates,
    candidateLowOverheadChildStates,
  };
}

function runBalancedPair(targetEmptyCount, seed, baseOptions, repetitions = 3) {
  const baselineOptions = createOptions(baseOptions, { ttFirstDeferredMoveListBuild: false, lowOverheadSearchChildStateFactory: false });
  const candidateOptions = createOptions(baseOptions, { ttFirstDeferredMoveListBuild: true, lowOverheadSearchChildStateFactory: false });

  const baselineSamples = [];
  const candidateSamples = [];

  runSearch(targetEmptyCount, seed, baselineOptions);
  runSearch(targetEmptyCount, seed, candidateOptions);

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    if (repetition % 2 === 0) {
      baselineSamples.push(runSearch(targetEmptyCount, seed, baselineOptions));
      candidateSamples.push(runSearch(targetEmptyCount, seed, candidateOptions));
    } else {
      candidateSamples.push(runSearch(targetEmptyCount, seed, candidateOptions));
      baselineSamples.push(runSearch(targetEmptyCount, seed, baselineOptions));
    }
  }

  return {
    baseline: chooseMedian(baselineSamples),
    candidate: chooseMedian(candidateSamples),
    baselineSamples,
    candidateSamples,
  };
}

function runPairSection({ label, targetEmptyCount, seeds, baseOptions, repetitions = 3 }) {
  const baselineOptions = createOptions(baseOptions, { ttFirstDeferredMoveListBuild: false, lowOverheadSearchChildStateFactory: false });
  const candidateOptions = createOptions(baseOptions, { ttFirstDeferredMoveListBuild: true, lowOverheadSearchChildStateFactory: false });
  const cases = [];
  const samples = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed}`);
    const pair = runBalancedPair(targetEmptyCount, seed, baseOptions, repetitions);
    cases.push(buildParityRecord(seed, pair.baseline, pair.candidate));
    samples.push({ seed, baselineSamples: pair.baselineSamples, candidateSamples: pair.candidateSamples });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    baselineOptions,
    candidateOptions,
    summary: buildPairSummary(cases),
    cases,
    samples,
  };
}

function runCompanionMatrixSection({ label, targetEmptyCount, seeds, baseOptions }) {
  const totals = Object.fromEntries(
    Object.keys(COMPANION_VARIANTS).map((key) => [key, { elapsedMs: 0, nodes: 0, deferredAttempts: 0, deferredSkips: 0, lowOverheadChildStates: 0 }]),
  );
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] companion seed ${seed}`);
    const perVariant = {};
    for (const [variantLabel, toggles] of Object.entries(COMPANION_VARIANTS)) {
      const options = createOptions(baseOptions, toggles);
      runSearch(targetEmptyCount, seed, options);
      const summary = runSearch(targetEmptyCount, seed, options);
      perVariant[variantLabel] = summary;
      totals[variantLabel].elapsedMs += Number(summary.elapsedMs ?? 0);
      totals[variantLabel].nodes += Number(summary.nodes ?? 0);
      totals[variantLabel].deferredAttempts += Number(summary.ttFirstDeferredMoveListBuildAttempts ?? 0);
      totals[variantLabel].deferredSkips += Number(summary.ttFirstDeferredMoveListBuildSkips ?? 0);
      totals[variantLabel].lowOverheadChildStates += Number(summary.lowOverheadSearchChildStates ?? 0);
    }
    cases.push({ seed, variants: perVariant });
  }

  const baseline = totals.baseline;
  const ratios = Object.fromEntries(
    Object.entries(totals).map(([variantLabel, total]) => [variantLabel, {
      elapsedRatioVsBaseline: baseline.elapsedMs > 0 ? total.elapsedMs / baseline.elapsedMs : null,
      nodeRatioVsBaseline: baseline.nodes > 0 ? total.nodes / baseline.nodes : null,
      deferredAttempts: total.deferredAttempts,
      deferredSkips: total.deferredSkips,
      lowOverheadChildStates: total.lowOverheadChildStates,
    }]),
  );

  return {
    label,
    targetEmptyCount,
    seeds,
    totals,
    ratios,
    cases,
  };
}

async function main() {
  const startedAtMs = Date.now();
  const benchmark = {
    stage: 203,
    label: 'Stage 203 TT-first deferred move-list build benchmark (split balanced)',
    generatedAt: new Date().toISOString(),
    method: 'Each search sample runs in a fresh Node process to avoid transposition-table accumulation and process-memory pressure from the monolithic runner; pair sections use warm-up plus interleaved 3-sample medians.',
    isolateMatrix: [
      runCompanionMatrixSection({
        label: 'depth-limited-24-companion-matrix',
        targetEmptyCount: 24,
        seeds: DEPTH_LIMITED_24_SEEDS,
        baseOptions: DEPTH_LIMITED_24_OPTIONS,
      }),
      runCompanionMatrixSection({
        label: 'depth-limited-20-companion-matrix',
        targetEmptyCount: 20,
        seeds: DEPTH_LIMITED_20_SEEDS,
        baseOptions: DEPTH_LIMITED_20_OPTIONS,
      }),
    ],
    sections: [
      runPairSection({ label: 'depth-limited-24', targetEmptyCount: 24, seeds: DEPTH_LIMITED_24_SEEDS, baseOptions: DEPTH_LIMITED_24_OPTIONS }),
      runPairSection({ label: 'depth-limited-20', targetEmptyCount: 20, seeds: DEPTH_LIMITED_20_SEEDS, baseOptions: DEPTH_LIMITED_20_OPTIONS }),
      runPairSection({ label: 'wld-14-control', targetEmptyCount: 14, seeds: WLD_14_SEEDS, baseOptions: WLD_14_OPTIONS }),
      runPairSection({ label: 'exact-10-control', targetEmptyCount: 10, seeds: EXACT_10_SEEDS, baseOptions: EXACT_10_OPTIONS }),
    ],
    benchmarkElapsedSeconds: (Date.now() - startedAtMs) / 1000,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(benchmark, null, 2)}\n`, 'utf8');
  console.log(output);
}

await main();
