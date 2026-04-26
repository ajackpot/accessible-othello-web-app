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
  buildStage170SurvivorComboEngineOptions,
  resolveStage170SurvivorComboCandidate,
} from '../evaluator-training/stage170-survivor-combo-candidates.mjs';
import {
  buildStage176SurvivorBranchEngineOptions,
  resolveStage176SurvivorBranchCandidate,
} from '../evaluator-training/stage176-survivor-branch-candidates.mjs';
import {
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from '../evaluator-training/lib.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DEFAULT_OUTPUT_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage177-head-to-head-micro');

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

function printUsage() {
  console.log(`Usage:\n  node tools/engine-match/run-stage177-head-to-head-micro-pair.mjs \\\n    --first-candidate <key> --second-candidate <key> \\\n    [--output-dir ${toPortablePath(DEFAULT_OUTPUT_ROOT)}] \\\n    [--time-ms-list ${DEFAULTS.timeMsList.join(',')}] [--seed-list ${DEFAULTS.seedList.join(',')}]`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
    const candidate = resolveStage176SurvivorBranchCandidate(candidateKey, { allowRetired: true });
    return {
      stage: 176,
      candidate,
      buildEngineOptions: (key) => buildStage176SurvivorBranchEngineOptions(key, { allowRetired: true }),
    };
  } catch {
    // noop
  }

  try {
    const candidate = resolveStage170SurvivorComboCandidate(candidateKey);
    return {
      stage: 170,
      candidate,
      buildEngineOptions: buildStage170SurvivorComboEngineOptions,
    };
  } catch {
    // noop
  }

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

  const candidate = resolveStage158StructuralCandidate(candidateKey, { allowRetired: true });
  return {
    stage: 158,
    candidate,
    buildEngineOptions: buildStage158StructuralEngineOptions,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
  process.exit(0);
}

const firstCandidateKey = typeof args['first-candidate'] === 'string' && args['first-candidate'].trim() !== ''
  ? args['first-candidate'].trim()
  : null;
const secondCandidateKey = typeof args['second-candidate'] === 'string' && args['second-candidate'].trim() !== ''
  ? args['second-candidate'].trim()
  : null;
if (!firstCandidateKey || !secondCandidateKey) {
  printUsage();
  throw new Error('--first-candidate and --second-candidate are required.');
}

const outputDir = typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? resolveCliPath(args['output-dir'])
  : path.resolve(DEFAULT_OUTPUT_ROOT, `${firstCandidateKey}__vs__${secondCandidateKey}`);
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

const firstResolved = resolveCandidateSpec(firstCandidateKey);
const secondResolved = resolveCandidateSpec(secondCandidateKey);
const engineOptionsDir = path.resolve(outputDir, 'engine-options');
const microDir = path.resolve(outputDir, 'results', 'micro');
ensureDir(engineOptionsDir);
ensureDir(microDir);

const firstEngineOptionsPath = path.resolve(engineOptionsDir, `${firstResolved.candidate.key}.json`);
const secondEngineOptionsPath = path.resolve(engineOptionsDir, `${secondResolved.candidate.key}.json`);
writeJson(firstEngineOptionsPath, firstResolved.buildEngineOptions(firstResolved.candidate.key));
writeJson(secondEngineOptionsPath, secondResolved.buildEngineOptions(secondResolved.candidate.key));

const manifest = {
  generatedAt: new Date().toISOString(),
  first: {
    stage: firstResolved.stage,
    key: firstResolved.candidate.key,
    familyKey: firstResolved.candidate.familyKey,
    moveOrderingStructureProfileKey: firstResolved.candidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: firstResolved.candidate.mpcStructureProfile?.key ?? null,
    engineOptionsJsonPath: rel(firstEngineOptionsPath),
  },
  second: {
    stage: secondResolved.stage,
    key: secondResolved.candidate.key,
    familyKey: secondResolved.candidate.familyKey,
    moveOrderingStructureProfileKey: secondResolved.candidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: secondResolved.candidate.mpcStructureProfile?.key ?? null,
    engineOptionsJsonPath: rel(secondEngineOptionsPath),
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
  microResults: [],
};
writeJson(path.resolve(outputDir, 'manifest.json'), manifest);

for (const timeLimitMs of timeMsList) {
  for (const seed of seedList) {
    const microJsonPath = path.resolve(microDir, `${timeLimitMs}ms_seed${seed}.json`);
    console.log(`[pair] ${firstResolved.candidate.key} vs ${secondResolved.candidate.key} @ ${timeLimitMs}ms seed ${seed}`);
    const child = spawnSync('node', [
      'tools/engine-match/benchmark-profile-variant-pair.mjs',
      '--output-json', rel(microJsonPath),
      '--search-algorithm', searchAlgorithm,
      '--first-label', firstResolved.candidate.key,
      '--first-generated-module', rel(firstResolved.candidate.moduleAbsolutePath),
      '--first-engine-options-json', rel(firstEngineOptionsPath),
      '--second-label', secondResolved.candidate.key,
      '--second-generated-module', rel(secondResolved.candidate.moduleAbsolutePath),
      '--second-engine-options-json', rel(secondEngineOptionsPath),
      '--games', String(games),
      '--opening-plies', String(openingPlies),
      '--seed-list', String(seed),
      '--time-ms-list', String(timeLimitMs),
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
      throw new Error(`Micro benchmark failed for ${firstResolved.candidate.key} vs ${secondResolved.candidate.key} @ ${timeLimitMs}ms seed ${seed} (exit ${child.status}).`);
    }
    manifest.microResults.push({
      timeLimitMs,
      seed,
      outputJson: rel(microJsonPath),
    });
    writeJson(path.resolve(outputDir, 'manifest.json'), manifest);
  }
}

const aggregateChild = spawnSync('node', [
  'tools/engine-match/aggregate-stage170-head-to-head-micro-results.mjs',
  '--micro-dir', rel(microDir),
  '--output-dir', rel(outputDir),
  '--first-candidate', firstResolved.candidate.key,
  '--second-candidate', secondResolved.candidate.key,
], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
});
if (aggregateChild.status !== 0) {
  throw new Error(`Aggregation failed for ${firstResolved.candidate.key} vs ${secondResolved.candidate.key} (exit ${aggregateChild.status}).`);
}

console.log(`Completed micro head-to-head: ${rel(outputDir)}`);
