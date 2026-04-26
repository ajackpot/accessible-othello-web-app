#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { parseArgs, resolveCliPath, toPortablePath } from '../evaluator-training/lib.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PLAN_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage177-staggered-session-plan');
const DEFAULT_OUTPUT_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage177-staggered-session-runs');

const DEFAULTS = Object.freeze({
  searchAlgorithm: 'classic',
  timeMsList: [80, 160, 240],
  seedList: [17, 31, 53, 71],
  games: 1,
  openingPlies: 20,
  maxDepth: 6,
  exactEndgameEmpties: 10,
  solverAdjudicationEmpties: 14,
  solverAdjudicationTimeMs: 60000,
  maxTableEntries: 90000,
  aspirationWindow: 60,
  progressEveryPairs: 4,
});

const HISTORICAL_PAIR_SUMMARY_PATHS = new Map([

  [
    ['s176-main-frontier-bothlite-parity', 's176-main-wide-zebra-midtrim'].sort().join('::'),
    path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage177-staggered-session-runs', 'session-02-reverted-incumbent-cache', 's176-main-frontier-bothlite-parity__vs__s176-main-wide-zebra-midtrim', 'summary.json'),
  ],
  [
    ['s157-main-assertive-both', 's170-main-wide-zebra'].sort().join('::'),
    path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage170-survivor-head-to-head-round8', 's157-main-assertive-both__vs__s170-main-wide-zebra', 'summary.json'),
  ],
  [
    ['s170-main-frontier-zebra-bothlite', 's170-main-wide-zebra'].sort().join('::'),
    path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage170-survivor-head-to-head-round9', 's170-main-frontier-zebra-bothlite__vs__s170-main-wide-zebra', 'summary.json'),
  ],
  [
    ['s157-main-assertive-both', 's170-main-frontier-zebra-bothlite'].sort().join('::'),
    path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage170-survivor-head-to-head-round10', 's170-main-frontier-zebra-bothlite__vs__s157-main-assertive-both', 'summary.json'),
  ],
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rel(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

function parseIntegerList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));
  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function pairKey(a, b) {
  return [a, b].sort().join('::');
}

function pairSlug(first, second) {
  return `${first}__vs__${second}`;
}

function findCachedPairSummary(candidateAKey, candidateBKey, runtimePairSummaries) {
  const key = pairKey(candidateAKey, candidateBKey);
  const runtime = runtimePairSummaries.get(key) ?? null;
  if (runtime) {
    return runtime;
  }
  const historical = HISTORICAL_PAIR_SUMMARY_PATHS.get(key) ?? null;
  if (historical && fs.existsSync(historical)) {
    return historical;
  }
  return null;
}

function formatPairMarkdown(pairSummary) {
  return `- ${pairSummary.second.key} perspective pattern: **${pairSummary.pattern.secondPerspective.join(' -> ')}**; overall ${pairSummary.first.key} ${pairSummary.overall.first.points.toFixed(1)}/${pairSummary.overall.totalGames}, ${pairSummary.second.key} ${pairSummary.overall.second.points.toFixed(1)}/${pairSummary.overall.totalGames}`;
}

function writeTrialSummaryMarkdown(filePath, summary) {
  const lines = [];
  lines.push(`# Stage177 staggered session ${summary.sessionOrdinal} trial ${summary.trialOrdinal}`);
  lines.push('');
  lines.push(`- mutated candidate: \`${summary.mutatedCandidateKey}\``);
  lines.push(`- base candidate: \`${summary.baseCandidateKey}\``);
  lines.push(`- change axis: ${summary.changeAxis}`);
  lines.push(`- hypothesis: ${summary.hypothesis}`);
  lines.push('');
  lines.push('## fresh pairings');
  lines.push('');
  for (const pairing of summary.freshPairings) {
    lines.push(`### ${pairing.firstCandidateKey} vs ${pairing.secondCandidateKey}`);
    lines.push('');
    lines.push(formatPairMarkdown(pairing.summary));
    lines.push(`- summary: ${pairing.summaryPath}`);
    lines.push('');
  }
  if (summary.carryForwardPairing) {
    lines.push('## carried-forward invariant pairing');
    lines.push('');
    lines.push(`- pair: \`${summary.carryForwardPairing.firstCandidateKey}\` vs \`${summary.carryForwardPairing.secondCandidateKey}\``);
    lines.push(`- source: ${summary.carryForwardPairing.summaryPath}`);
    lines.push(formatPairMarkdown(summary.carryForwardPairing.summary));
    lines.push('');
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function writeSessionSummaryMarkdown(filePath, summary) {
  const lines = [];
  lines.push(`# Stage177 staggered session ${summary.sessionOrdinal} summary`);
  lines.push('');
  lines.push(`- ending state: ${summary.endingState.map((slot) => `slot${slot.slotOrdinal}=\`${slot.candidateKey}\``).join(', ')}`);
  lines.push(`- timings: ${summary.options.timeMsList.join(', ')} ms`);
  lines.push(`- seeds: ${summary.options.seedList.join(', ')}`);
  lines.push('');
  lines.push('## pair results');
  lines.push('');
  for (const pairing of summary.endingStatePairings) {
    lines.push(`### ${pairing.firstCandidateKey} vs ${pairing.secondCandidateKey}`);
    lines.push('');
    lines.push(formatPairMarkdown(pairing.summary));
    lines.push(`- summary: ${pairing.summaryPath}`);
    lines.push('');
  }
  lines.push('## direct points ledger');
  lines.push('');
  lines.push('| candidate | direct points | direct games | score rate | overall nodes/ms |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const row of summary.ledger) {
    lines.push(`| ${row.candidateKey} | ${row.points.toFixed(1)} | ${row.totalGames} | ${(row.scoreRate * 100).toFixed(1)}% | ${row.nodesPerMs.toFixed(2)} |`);
  }
  lines.push('');
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const sessionOrdinal = Number(args['session-ordinal'] ?? args.session ?? 1);
if (!Number.isFinite(sessionOrdinal) || sessionOrdinal <= 0) {
  throw new Error('--session-ordinal must be a positive integer.');
}
const manifestPath = typeof args.manifest === 'string' && args.manifest.trim() !== ''
  ? resolveCliPath(args.manifest)
  : path.resolve(PLAN_ROOT, `session-${String(sessionOrdinal).padStart(2, '0')}`, 'manifest.json');
const outputDir = typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? resolveCliPath(args['output-dir'])
  : path.resolve(DEFAULT_OUTPUT_ROOT, `session-${String(sessionOrdinal).padStart(2, '0')}`);
const searchAlgorithm = typeof args['search-algorithm'] === 'string' && args['search-algorithm'].trim() !== ''
  ? args['search-algorithm'].trim()
  : DEFAULTS.searchAlgorithm;
const timeMsList = parseIntegerList(args['time-ms-list'], DEFAULTS.timeMsList);
const seedList = parseIntegerList(args['seed-list'], DEFAULTS.seedList);

const manifest = readJson(manifestPath);
ensureDir(outputDir);
const runtimePairSummaries = new Map();
const trialSummaries = [];

for (const trial of manifest.trials ?? []) {
  const trialDir = path.resolve(outputDir, `trial-${String(trial.trialOrdinal).padStart(2, '0')}`);
  ensureDir(trialDir);
  const freshPairings = [];

  for (const opponent of trial.opponents ?? []) {
    const firstCandidateKey = opponent.candidateKey;
    const secondCandidateKey = trial.mutatedCandidateKey;
    const pairDir = path.resolve(trialDir, 'pairings', pairSlug(firstCandidateKey, secondCandidateKey));
    const child = spawnSync('node', [
      'tools/engine-match/run-stage177-head-to-head-micro-pair.mjs',
      '--first-candidate', firstCandidateKey,
      '--second-candidate', secondCandidateKey,
      '--output-dir', rel(pairDir),
      '--search-algorithm', searchAlgorithm,
      '--time-ms-list', timeMsList.join(','),
      '--seed-list', seedList.join(','),
      '--games', String(DEFAULTS.games),
      '--opening-plies', String(DEFAULTS.openingPlies),
      '--max-depth', String(DEFAULTS.maxDepth),
      '--exact-endgame-empties', String(DEFAULTS.exactEndgameEmpties),
      '--solver-adjudication-empties', String(DEFAULTS.solverAdjudicationEmpties),
      '--solver-adjudication-time-ms', String(DEFAULTS.solverAdjudicationTimeMs),
      '--max-table-entries', String(DEFAULTS.maxTableEntries),
      '--aspiration-window', String(DEFAULTS.aspirationWindow),
      '--progress-every-pairs', String(DEFAULTS.progressEveryPairs),
    ], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    if (child.status !== 0) {
      throw new Error(`Failed session ${sessionOrdinal} trial ${trial.trialOrdinal} pairing ${firstCandidateKey} vs ${secondCandidateKey} (exit ${child.status}).`);
    }
    const summaryPath = path.resolve(pairDir, 'summary.json');
    const summary = readJson(summaryPath);
    freshPairings.push({
      firstCandidateKey,
      secondCandidateKey,
      summaryPath: rel(summaryPath),
      summary,
    });
    runtimePairSummaries.set(pairKey(firstCandidateKey, secondCandidateKey), summaryPath);
  }

  const invariant = trial.skippedInvariantPairing ?? null;
  let carryForwardPairing = null;
  if (invariant) {
    const summaryPath = findCachedPairSummary(invariant.candidateAKey, invariant.candidateBKey, runtimePairSummaries);
    if (summaryPath) {
      carryForwardPairing = {
        firstCandidateKey: invariant.candidateAKey,
        secondCandidateKey: invariant.candidateBKey,
        summaryPath: rel(summaryPath),
        summary: readJson(summaryPath),
        carryForwardFrom: invariant.carryForwardFrom,
      };
    }
  }

  const trialSummary = {
    generatedAt: new Date().toISOString(),
    sessionOrdinal,
    trialOrdinal: trial.trialOrdinal,
    laneKey: trial.laneKey,
    slotOrdinal: trial.slotOrdinal,
    optionOrdinal: trial.optionOrdinal,
    branchLabel: trial.branchLabel,
    mutatedCandidateKey: trial.mutatedCandidateKey,
    baseCandidateKey: trial.baseCandidateKey,
    changeAxis: trial.changeAxis,
    sourceIdentity: trial.sourceIdentity,
    hypothesis: trial.hypothesis,
    whyNow: trial.whyNow,
    beforeState: trial.beforeState,
    afterState: trial.afterState,
    freshPairings,
    carryForwardPairing,
  };
  writeJson(path.resolve(trialDir, 'trial-summary.json'), trialSummary);
  writeTrialSummaryMarkdown(path.resolve(trialDir, 'trial-summary.md'), trialSummary);
  trialSummaries.push({
    trialOrdinal: trial.trialOrdinal,
    outputDir: rel(trialDir),
    summaryPath: rel(path.resolve(trialDir, 'trial-summary.json')),
    markdownPath: rel(path.resolve(trialDir, 'trial-summary.md')),
    mutatedCandidateKey: trial.mutatedCandidateKey,
  });
}

const endingState = manifest.endingState ?? [];
const endingPairs = [
  [endingState[0]?.candidateKey, endingState[1]?.candidateKey],
  [endingState[0]?.candidateKey, endingState[2]?.candidateKey],
  [endingState[1]?.candidateKey, endingState[2]?.candidateKey],
].filter((pair) => pair.every(Boolean));

const endingStatePairings = endingPairs.map(([candidateAKey, candidateBKey]) => {
  const summaryPath = findCachedPairSummary(candidateAKey, candidateBKey, runtimePairSummaries);
  if (!summaryPath) {
    throw new Error(`Missing pair summary for ending-state pair ${candidateAKey} vs ${candidateBKey}`);
  }
  const summary = readJson(summaryPath);
  return {
    firstCandidateKey: summary.first.key,
    secondCandidateKey: summary.second.key,
    summaryPath: rel(summaryPath),
    summary,
  };
});

const ledgerMap = new Map();
for (const pairing of endingStatePairings) {
  const entries = [
    {
      key: pairing.summary.first.key,
      points: pairing.summary.overall.first.points,
      totalGames: pairing.summary.overall.totalGames,
      nodesPerMs: pairing.summary.overall.first.nodesPerMs,
    },
    {
      key: pairing.summary.second.key,
      points: pairing.summary.overall.second.points,
      totalGames: pairing.summary.overall.totalGames,
      nodesPerMs: pairing.summary.overall.second.nodesPerMs,
    },
  ];
  for (const entry of entries) {
    const current = ledgerMap.get(entry.key) ?? {
      candidateKey: entry.key,
      points: 0,
      totalGames: 0,
      nodesWeighted: 0,
      gamesWeighted: 0,
    };
    current.points += entry.points;
    current.totalGames += entry.totalGames;
    current.nodesWeighted += entry.nodesPerMs * entry.totalGames;
    current.gamesWeighted += entry.totalGames;
    ledgerMap.set(entry.key, current);
  }
}

const ledger = [...ledgerMap.values()].map((row) => ({
  candidateKey: row.candidateKey,
  points: row.points,
  totalGames: row.totalGames,
  scoreRate: row.totalGames > 0 ? row.points / row.totalGames : 0,
  nodesPerMs: row.gamesWeighted > 0 ? row.nodesWeighted / row.gamesWeighted : 0,
})).sort((left, right) => {
  if (right.points !== left.points) return right.points - left.points;
  if (right.nodesPerMs !== left.nodesPerMs) return right.nodesPerMs - left.nodesPerMs;
  return left.candidateKey.localeCompare(right.candidateKey);
});

const sessionSummary = {
  generatedAt: new Date().toISOString(),
  sessionOrdinal,
  manifestPath: rel(manifestPath),
  options: {
    searchAlgorithm,
    timeMsList,
    seedList,
    games: DEFAULTS.games,
  },
  startingState: manifest.startingState,
  endingState,
  trials: trialSummaries,
  endingStatePairings,
  ledger,
};
writeJson(path.resolve(outputDir, 'session-summary.json'), sessionSummary);
writeSessionSummaryMarkdown(path.resolve(outputDir, 'session-summary.md'), sessionSummary);
console.log(`Completed session ${sessionOrdinal}: ${rel(path.resolve(outputDir, 'session-summary.json'))}`);
