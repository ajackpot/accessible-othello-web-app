#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { parseArgs } from '../evaluator-training/lib.mjs';

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage166-pattern-stress-suite.mjs \
    [--positions-json tools/engine-match/out/_stage166_pattern_stress_selection/stage166_pattern_stress_positions.json] \
    [--our-time-ms 240] [--their-time-ms 240] [--their-noise-scale 0] \
    [--output-root tools/engine-match/out/_stage166_pattern_stress_suite]`);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(1, Math.round(parsed));
  }
  return fallback;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createCandidateDefinitions() {
  return [
    {
      key: 'active',
      label: 'active-installed',
      mode: 'builtin',
      generatedModule: null,
      engineOptionsJson: null,
    },
    {
      key: 's154-main-base',
      label: 'stage154-main-base',
      mode: 'custom',
      generatedModule: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js',
      engineOptionsJson: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-main.json',
    },
    {
      key: 's154-stable-zebra-open',
      label: 's154-stable-zebra-open',
      mode: 'custom',
      generatedModule: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js',
      engineOptionsJson: 'tools/engine-match/out/stage15x-main-benchmark-pack/engine-options/s154-stable-zebra-open.json',
    },
    {
      key: 's154-stable-zebra',
      label: 's154-stable-zebra',
      mode: 'custom',
      generatedModule: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js',
      engineOptionsJson: 'tools/engine-match/out/stage15x-main-benchmark-pack/engine-options/s154-stable-zebra.json',
    },
    {
      key: 's154-zebra-both-probe',
      label: 's154-zebra-both-probe',
      mode: 'custom',
      generatedModule: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js',
      engineOptionsJson: 'tools/engine-match/out/stage15x-main-benchmark-pack/engine-options/s154-zebra-both-probe.json',
    },
    {
      key: 's154-wide-safe',
      label: 's154-wide-safe',
      mode: 'custom',
      generatedModule: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-wide-safe.generated.js',
      engineOptionsJson: 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-wide-safe.json',
    },
  ];
}

function runBenchmark({
  candidate,
  position,
  ourTimeMs,
  theirTimeMs,
  theirNoiseScale,
  outputJsonPath,
  outputLogPath,
}) {
  const args = [
    'tools/engine-match/benchmark-vs-trineutron.mjs',
    '--output-json', outputJsonPath,
    '--games', '1',
    '--opening-source', position.openingSource,
    '--opening-plies', String(position.openingPlies),
    '--seed', String(position.seed),
    '--our-time-ms', String(ourTimeMs),
    '--their-time-ms', String(theirTimeMs),
    '--our-max-depth', '6',
    '--their-max-depth', '18',
    '--exact-endgame-empties', '10',
    '--solver-adjudication-empties', '14',
    '--solver-adjudication-time-ms', '60000',
    '--solver-adjudication-max-depth', '14',
    '--their-noise-scale', String(theirNoiseScale),
    '--variant-seed-mode', 'shared',
  ];

  if (candidate.mode === 'builtin') {
    args.push('--variants', 'active');
  } else {
    args.push(
      '--variants', 'custom',
      '--variant-label', candidate.label,
      '--generated-module', candidate.generatedModule,
      '--engine-options-json', candidate.engineOptionsJson,
    );
  }

  const startedAt = Date.now();
  const stdout = execFileSync('node', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const elapsedMs = Date.now() - startedAt;
  fs.writeFileSync(outputLogPath, stdout, 'utf8');
  return elapsedMs;
}

function aggregateCandidateResults(candidate, positionResults) {
  const aggregate = {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    discDiff: 0,
    totalOurTimeMs: 0,
    totalTheirTimeMs: 0,
    totalOurNodes: 0,
    totalTheirNodes: 0,
    exactAdjudications: 0,
  };

  const slices = [];
  for (const item of positionResults) {
    const variant = item.json?.variants?.[0] ?? null;
    const agg = variant?.aggregate ?? null;
    if (!agg) {
      continue;
    }
    aggregate.games += Number(agg.games ?? 0);
    aggregate.wins += Number(agg.wins ?? 0);
    aggregate.losses += Number(agg.losses ?? 0);
    aggregate.draws += Number(agg.draws ?? 0);
    aggregate.points += Number(agg.points ?? 0);
    aggregate.discDiff += Number(agg.discDiff ?? 0);
    aggregate.totalOurTimeMs += Number(agg.totalOurTimeMs ?? 0);
    aggregate.totalTheirTimeMs += Number(agg.totalTheirTimeMs ?? 0);
    aggregate.totalOurNodes += Number(agg.totalOurNodes ?? 0);
    aggregate.totalTheirNodes += Number(agg.totalTheirNodes ?? 0);
    aggregate.exactAdjudications += Number(agg.exactAdjudications ?? 0);
    slices.push({
      positionId: item.position.positionId,
      openingSeed: item.position.seed,
      openingPlies: item.position.openingPlies,
      xotIndex: item.position.xotIndex,
      points: Number(agg.points ?? 0),
      games: Number(agg.games ?? 0),
      averageDiscDiff: Number(agg.averageDiscDiff ?? 0),
      wins: Number(agg.wins ?? 0),
      losses: Number(agg.losses ?? 0),
      draws: Number(agg.draws ?? 0),
      wallElapsedMs: item.wallElapsedMs,
    });
  }

  return {
    candidateKey: candidate.key,
    candidateLabel: candidate.label,
    aggregate: {
      ...aggregate,
      scoreRate: aggregate.games > 0 ? aggregate.points / aggregate.games : 0,
      averageDiscDiff: aggregate.games > 0 ? aggregate.discDiff / aggregate.games : 0,
      averageOurTimeMsPerGame: aggregate.games > 0 ? aggregate.totalOurTimeMs / aggregate.games : 0,
      averageTheirTimeMsPerGame: aggregate.games > 0 ? aggregate.totalTheirTimeMs / aggregate.games : 0,
      averageOurNodesPerGame: aggregate.games > 0 ? aggregate.totalOurNodes / aggregate.games : 0,
      averageTheirNodesPerGame: aggregate.games > 0 ? aggregate.totalTheirNodes / aggregate.games : 0,
    },
    positions: slices,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const positionsJsonPath = path.resolve(typeof args['positions-json'] === 'string' && args['positions-json'].trim() !== ''
  ? args['positions-json']
  : 'tools/engine-match/out/_stage166_pattern_stress_selection/stage166_pattern_stress_positions.json');
const outputRoot = path.resolve(typeof args['output-root'] === 'string' && args['output-root'].trim() !== ''
  ? args['output-root']
  : 'tools/engine-match/out/_stage166_pattern_stress_suite');
const ourTimeMs = toPositiveInteger(args['our-time-ms'], 240);
const theirTimeMs = toPositiveInteger(args['their-time-ms'], 240);
const theirNoiseScale = Math.max(0, Number.isFinite(Number(args['their-noise-scale'])) ? Math.round(Number(args['their-noise-scale'])) : 0);

fs.mkdirSync(outputRoot, { recursive: true });
const positionsData = loadJson(positionsJsonPath);
const positions = Array.isArray(positionsData.positions) ? positionsData.positions : [];
const candidates = createCandidateDefinitions();

const manifest = {
  generatedAt: new Date().toISOString(),
  positionsJsonPath,
  ourTimeMs,
  theirTimeMs,
  theirNoiseScale,
  positions: positions.map((position) => ({
    positionId: position.positionId,
    seed: position.seed,
    openingPlies: position.openingPlies,
    openingSource: position.openingSource,
    xotIndex: position.xotIndex,
    patternCompositeAbs: position.patternCompositeAbs,
  })),
  candidates: candidates.map((candidate) => ({
    key: candidate.key,
    label: candidate.label,
    mode: candidate.mode,
    generatedModule: candidate.generatedModule,
    engineOptionsJson: candidate.engineOptionsJson,
  })),
};
writeJson(path.join(outputRoot, 'manifest.json'), manifest);

const byCandidate = new Map();
for (const candidate of candidates) {
  byCandidate.set(candidate.key, []);
}

for (const position of positions) {
  const positionDir = path.join(outputRoot, 'individual', position.positionId);
  fs.mkdirSync(positionDir, { recursive: true });
  for (const candidate of candidates) {
    const jsonPath = path.join(positionDir, `${candidate.key}.json`);
    const logPath = path.join(positionDir, `${candidate.key}.log`);
    let wallElapsedMs = null;
    if (!fs.existsSync(jsonPath)) {
      console.log(`run  ${position.positionId}::${candidate.key}`);
      wallElapsedMs = runBenchmark({
        candidate,
        position,
        ourTimeMs,
        theirTimeMs,
        theirNoiseScale,
        outputJsonPath: jsonPath,
        outputLogPath: logPath,
      });
    } else {
      console.log(`skip ${position.positionId}::${candidate.key}`);
    }
    const json = loadJson(jsonPath);
    byCandidate.get(candidate.key)?.push({ candidate, position, json, wallElapsedMs });
  }
}

const candidateSummaries = candidates
  .map((candidate) => aggregateCandidateResults(candidate, byCandidate.get(candidate.key) ?? []))
  .sort((left, right) => right.aggregate.points - left.aggregate.points || right.aggregate.averageDiscDiff - left.aggregate.averageDiscDiff);

const output = {
  generatedAt: new Date().toISOString(),
  positionsJsonPath,
  ourTimeMs,
  theirTimeMs,
  theirNoiseScale,
  positions: positions,
  candidates: candidateSummaries,
};

writeJson(path.join(outputRoot, 'stage166_pattern_stress_summary.json'), output);

const lines = [
  '# Stage166 pattern-stress suite summary',
  '',
  `- generated at: ${output.generatedAt}`,
  `- positions file: ${positionsJsonPath}`,
  `- our time: ${ourTimeMs} ms`,
  `- their time: ${theirTimeMs} ms`,
  `- their noise scale: ${theirNoiseScale}`,
  `- positions: ${positions.length} (each call runs 1 opening x 2 colors)` ,
  '',
  '| rank | candidate | points | games | score rate | avg disc diff | W-L-D |',
  '|---:|---|---:|---:|---:|---:|---|',
];
for (let index = 0; index < candidateSummaries.length; index += 1) {
  const summary = candidateSummaries[index];
  lines.push(`| ${index + 1} | ${summary.candidateKey} | ${summary.aggregate.points.toFixed(1)} | ${summary.aggregate.games} | ${(summary.aggregate.scoreRate * 100).toFixed(1)}% | ${summary.aggregate.averageDiscDiff.toFixed(3)} | ${summary.aggregate.wins}-${summary.aggregate.losses}-${summary.aggregate.draws} |`);
}
lines.push('');
for (const summary of candidateSummaries) {
  lines.push(`## ${summary.candidateKey}`);
  lines.push('');
  lines.push('| positionId | xot | plies | points | avg disc diff | W-L-D |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const slice of summary.positions) {
    lines.push(`| ${slice.positionId} | ${slice.xotIndex} | ${slice.openingPlies} | ${slice.points.toFixed(1)} | ${slice.averageDiscDiff.toFixed(3)} | ${slice.wins}-${slice.losses}-${slice.draws} |`);
  }
  lines.push('');
}
fs.writeFileSync(path.join(outputRoot, 'stage166_pattern_stress_summary.md'), `${lines.join('\n')}\n`);

console.log(`Saved suite summary JSON to ${path.join(outputRoot, 'stage166_pattern_stress_summary.json')}`);
console.log(`Saved suite summary MD to ${path.join(outputRoot, 'stage166_pattern_stress_summary.md')}`);
