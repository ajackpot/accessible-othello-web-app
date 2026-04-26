#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildStage157StructuralEngineOptions,
  resolveStage157StructuralCandidate,
} from '../evaluator-training/stage157-structural-candidates.mjs';
import {
  buildStage158StructuralEngineOptions,
  resolveStage158StructuralCandidate,
} from '../evaluator-training/stage158-structural-candidates.mjs';
import {
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from '../evaluator-training/lib.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const STAGE154_DIR = path.resolve(PROJECT_ROOT, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage154-main-recenter');
const DEFAULT_OUTPUT_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage169-stage157-158-mainline-decision-runs');

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

const BASELINES = Object.freeze([
  Object.freeze({
    id: 's154-main',
    label: 's154-main',
    generatedModulePath: path.resolve(STAGE154_DIR, 'exported', 's154-main.generated.js'),
    engineOptionsPath: path.resolve(STAGE154_DIR, 'engine-options', 's154-main.json'),
  }),
  Object.freeze({
    id: 's154-both',
    label: 's154-both',
    generatedModulePath: path.resolve(STAGE154_DIR, 'exported', 's154-both.generated.js'),
    engineOptionsPath: path.resolve(STAGE154_DIR, 'engine-options', 's154-both.json'),
  }),
]);

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage157-158-mainline-decision-pair.mjs \
    --candidate <stage157-or-stage158-key> \
    [--output-root ${toPortablePath(DEFAULT_OUTPUT_ROOT)}] \
    [--search-algorithm ${DEFAULTS.searchAlgorithm}] \
    [--time-ms-list ${DEFAULTS.timeMsList.join(',')}] \
    [--seed-list ${DEFAULTS.seedList.join(',')}] \
    [--games ${DEFAULTS.games}] [--opening-plies ${DEFAULTS.openingPlies}] \
    [--max-depth ${DEFAULTS.maxDepth}] [--exact-endgame-empties ${DEFAULTS.exactEndgameEmpties}] \
    [--solver-adjudication-empties ${DEFAULTS.solverAdjudicationEmpties}] \
    [--solver-adjudication-time-ms ${DEFAULTS.solverAdjudicationTimeMs}] \
    [--max-table-entries ${DEFAULTS.maxTableEntries}] [--aspiration-window ${DEFAULTS.aspirationWindow}]

설명:
- 지정한 stage157 또는 stage158 mainline 후보를 's154-main', 's154-both'에 각각 overlay한 뒤,
  같은 baseline과 direct pair benchmark를 80/160/240ms 같은 다중 시간 구간에서 순차 실행합니다.
- baseline을 first variant, candidate overlay를 second variant로 넣으므로,
  결과 JSON의 pointGap이 양수면 candidate overlay가 baseline보다 앞선 것입니다.
`);
}

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

function parseInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
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

function resolveCandidateSpec(candidateKey) {
  try {
    const candidate = resolveStage157StructuralCandidate(candidateKey);
    return {
      stage: 157,
      candidate,
      buildEngineOptions: buildStage157StructuralEngineOptions,
    };
  } catch {
    // noop
  }

  const candidate = resolveStage158StructuralCandidate(candidateKey);
  return {
    stage: 158,
    candidate,
    buildEngineOptions: buildStage158StructuralEngineOptions,
  };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value, digits = 3) {
  const number = Number(value) || 0;
  return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`;
}

function writeMarkdownSummary(filePath, summary) {
  const lines = [];
  lines.push(`# Mainline decision pair summary for ${summary.candidate.key}`);
  lines.push('');
  lines.push(`- stage: ${summary.candidate.stage}`);
  lines.push(`- candidate: \
\`${summary.candidate.key}\``);
  if (summary.candidate.legacyAliases.length > 0) {
    lines.push(`- legacy aliases: ${summary.candidate.legacyAliases.map((alias) => `\`${alias}\``).join(', ')}`);
  }
  lines.push(`- family: ${summary.candidate.familyKey}`);
  lines.push(`- move-ordering profile: ${summary.candidate.moveOrderingStructureProfileKey}`);
  lines.push(`- MPC profile: ${summary.candidate.mpcStructureProfileKey}`);
  lines.push(`- timings: ${summary.options.timeMsList.join(', ')} ms`);
  lines.push(`- seeds: ${summary.options.seedList.join(', ')}`);
  lines.push(`- paired openings per seed: ${summary.options.games}`);
  lines.push('');
  lines.push('| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---|');
  for (const row of summary.rows) {
    lines.push(`| ${row.baselineId} | ${row.timeLimitMs} | ${row.baselinePoints.toFixed(1)}/${row.totalGames} (${formatPercent(row.baselineScoreRate)}) | ${row.candidatePoints.toFixed(1)}/${row.totalGames} (${formatPercent(row.candidateScoreRate)}) | ${formatSigned(row.pointGap)} | ${row.baselineNodesPerMs.toFixed(2)} | ${row.candidateNodesPerMs.toFixed(2)} | ${row.recommendation} |`);
  }
  lines.push('');
  lines.push('pointGap은 **candidate overlay - baseline** 기준입니다.');
  lines.push('');
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
  process.exit(0);
}

const candidateKey = typeof args.candidate === 'string' && args.candidate.trim() !== ''
  ? args.candidate.trim()
  : null;
if (!candidateKey) {
  printUsage();
  throw new Error('--candidate is required.');
}

const outputRoot = typeof args['output-root'] === 'string' && args['output-root'].trim() !== ''
  ? resolveCliPath(args['output-root'])
  : DEFAULT_OUTPUT_ROOT;
const searchAlgorithm = typeof args['search-algorithm'] === 'string' && args['search-algorithm'].trim() !== ''
  ? args['search-algorithm'].trim()
  : DEFAULTS.searchAlgorithm;
const timeMsList = parseIntegerList(args['time-ms-list'], DEFAULTS.timeMsList);
const seedList = parseIntegerList(args['seed-list'], DEFAULTS.seedList);
const games = parseInteger(args.games, DEFAULTS.games, 1, 200);
const openingPlies = parseInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
const maxDepth = parseInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 12);
const exactEndgameEmpties = parseInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 24);
const solverAdjudicationEmpties = parseInteger(args['solver-adjudication-empties'], DEFAULTS.solverAdjudicationEmpties, -1, 24);
const solverAdjudicationTimeMs = parseInteger(args['solver-adjudication-time-ms'], DEFAULTS.solverAdjudicationTimeMs, 100, 300000);
const maxTableEntries = parseInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 600000);
const aspirationWindow = parseInteger(args['aspiration-window'], DEFAULTS.aspirationWindow, 0, 5000);
const progressEveryPairs = parseInteger(args['progress-every-pairs'], DEFAULTS.progressEveryPairs, 0, 10000);

const resolvedCandidate = resolveCandidateSpec(candidateKey);
const candidate = resolvedCandidate.candidate;
const candidateOutputRoot = path.resolve(outputRoot, candidate.key);
const engineOptionsOutDir = path.resolve(candidateOutputRoot, 'engine-options');
const resultsOutDir = path.resolve(candidateOutputRoot, 'results');
ensureDir(engineOptionsOutDir);
ensureDir(resultsOutDir);

const summaryRows = [];
const runRecords = [];

for (const baseline of BASELINES) {
  const mergedEngineOptions = {
    ...readJson(baseline.engineOptionsPath),
    ...resolvedCandidate.buildEngineOptions(candidate.key),
  };
  const overlayEngineOptionsPath = path.resolve(engineOptionsOutDir, `${baseline.id}__${candidate.key}.json`);
  writeJson(overlayEngineOptionsPath, mergedEngineOptions);

  const resultJsonPath = path.resolve(resultsOutDir, `${baseline.id}__${candidate.key}.json`);
  const child = spawnSync('node', [
    'tools/engine-match/benchmark-profile-variant-pair.mjs',
    '--output-json', rel(resultJsonPath),
    '--search-algorithm', searchAlgorithm,
    '--first-label', baseline.label,
    '--first-generated-module', rel(baseline.generatedModulePath),
    '--first-engine-options-json', rel(baseline.engineOptionsPath),
    '--second-label', `${baseline.label} + ${candidate.key}`,
    '--second-generated-module', rel(baseline.generatedModulePath),
    '--second-engine-options-json', rel(overlayEngineOptionsPath),
    '--games', String(games),
    '--opening-plies', String(openingPlies),
    '--seed-list', seedList.join(','),
    '--time-ms-list', timeMsList.join(','),
    '--max-depth', String(maxDepth),
    '--exact-endgame-empties', String(exactEndgameEmpties),
    '--solver-adjudication-empties', String(solverAdjudicationEmpties),
    '--solver-adjudication-time-ms', String(solverAdjudicationTimeMs),
    '--max-table-entries', String(maxTableEntries),
    '--aspiration-window', String(aspirationWindow),
    '--progress-every-pairs', String(progressEveryPairs),
  ], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });

  if (child.status !== 0) {
    throw new Error(`Pair benchmark failed for ${candidate.key} vs ${baseline.id} (exit ${child.status}).`);
  }

  const result = readJson(resultJsonPath);
  for (const scenario of result.scenarios ?? []) {
    const baselineVariant = scenario.variants?.[baseline.label] ?? null;
    const candidateLabel = `${baseline.label} + ${candidate.key}`;
    const candidateVariant = scenario.variants?.[candidateLabel] ?? null;
    if (!baselineVariant || !candidateVariant) {
      continue;
    }
    summaryRows.push({
      baselineId: baseline.id,
      timeLimitMs: scenario.timeLimitMs,
      totalGames: scenario.totalGames,
      baselinePoints: baselineVariant.points,
      candidatePoints: candidateVariant.points,
      baselineScoreRate: baselineVariant.scoreRate,
      candidateScoreRate: candidateVariant.scoreRate,
      pointGap: scenario.pointGap,
      baselineNodesPerMs: baselineVariant.nodesPerMs,
      candidateNodesPerMs: candidateVariant.nodesPerMs,
      recommendation: scenario.recommendation,
    });
  }

  runRecords.push({
    baselineId: baseline.id,
    baselineLabel: baseline.label,
    baselineGeneratedModule: rel(baseline.generatedModulePath),
    baselineEngineOptionsJson: rel(baseline.engineOptionsPath),
    overlayEngineOptionsJson: rel(overlayEngineOptionsPath),
    resultJson: rel(resultJsonPath),
  });
}

summaryRows.sort((left, right) => {
  if (left.baselineId !== right.baselineId) {
    return left.baselineId.localeCompare(right.baselineId);
  }
  return left.timeLimitMs - right.timeLimitMs;
});

const finalSummary = {
  generatedAt: new Date().toISOString(),
  candidate: {
    stage: resolvedCandidate.stage,
    key: candidate.key,
    legacyAliases: candidate.legacyAliases ?? [],
    familyKey: candidate.familyKey,
    familyLabel: candidate.family.label,
    priority: candidate.priority,
    tier: candidate.tier,
    risk: candidate.risk,
    notes: candidate.notes,
    moveOrderingStructureProfileKey: candidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: candidate.mpcStructureProfile?.key ?? null,
  },
  options: {
    searchAlgorithm,
    timeMsList,
    seedList,
    games,
    openingPlies,
    maxDepth,
    exactEndgameEmpties,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    maxTableEntries,
    aspirationWindow,
    progressEveryPairs,
  },
  runs: runRecords,
  rows: summaryRows,
};

const summaryJsonPath = path.resolve(candidateOutputRoot, 'summary.json');
const summaryMdPath = path.resolve(candidateOutputRoot, 'summary.md');
writeJson(summaryJsonPath, finalSummary);
writeMarkdownSummary(summaryMdPath, finalSummary);

console.log(`Saved decision summary JSON to ${rel(summaryJsonPath)}`);
console.log(`Saved decision summary Markdown to ${rel(summaryMdPath)}`);
