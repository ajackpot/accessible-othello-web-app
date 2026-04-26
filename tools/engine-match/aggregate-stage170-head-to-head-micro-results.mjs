#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  resolveStage157StructuralCandidate,
} from '../evaluator-training/stage157-structural-candidates.mjs';
import {
  resolveStage158StructuralCandidate,
} from '../evaluator-training/stage158-structural-candidates.mjs';
import {
  resolveStage170SurvivorComboCandidate,
} from '../evaluator-training/stage170-survivor-combo-candidates.mjs';
import {
  resolveStage176SurvivorBranchCandidate,
} from '../evaluator-training/stage176-survivor-branch-candidates.mjs';
import { parseArgs, resolveCliPath } from '../evaluator-training/lib.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

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

function formatPercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

function formatSigned(value, digits = 3) {
  const number = Number(value) || 0;
  return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`;
}

function resolveCandidateSpec(candidateKey) {
  try {
    const candidate = resolveStage176SurvivorBranchCandidate(candidateKey, { allowRetired: true });
    return { stage: 176, candidate };
  } catch {}
  try {
    const candidate = resolveStage170SurvivorComboCandidate(candidateKey);
    return { stage: 170, candidate };
  } catch {}
  try {
    const candidate = resolveStage157StructuralCandidate(candidateKey);
    return { stage: 157, candidate };
  } catch {}
  const candidate = resolveStage158StructuralCandidate(candidateKey, { allowRetired: true });
  return { stage: 158, candidate };
}

function classify(firstPoints, secondPoints) {
  if (secondPoints > firstPoints) return 'second-win';
  if (secondPoints < firstPoints) return 'first-win';
  return 'draw';
}

function outlookLabel(outcome) {
  if (outcome === 'second-win') return '승리';
  if (outcome === 'first-win') return '패배';
  return '동률';
}

function summarizeCandidate(resolved) {
  const c = resolved.candidate;
  return {
    stage: resolved.stage,
    key: c.key,
    familyKey: c.familyKey,
    familyLabel: c.family?.label ?? null,
    priority: c.priority,
    tier: c.tier ?? null,
    risk: c.risk ?? null,
    notes: c.notes ?? null,
    moveOrderingStructureProfileKey: c.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: c.mpcStructureProfile?.key ?? null,
  };
}

function writeMarkdownSummary(filePath, summary) {
  const lines = [];
  lines.push(`# Survivor head-to-head summary: ${summary.first.key} vs ${summary.second.key}`);
  lines.push('');
  lines.push(`- first candidate: \`${summary.first.key}\` (stage ${summary.first.stage}, family ${summary.first.familyKey})`);
  lines.push(`- second candidate: \`${summary.second.key}\` (stage ${summary.second.stage}, family ${summary.second.familyKey})`);
  lines.push(`- timings: ${summary.options.timeMsList.join(', ')} ms`);
  lines.push(`- seeds: ${summary.options.seedList.join(', ')}`);
  lines.push(`- pattern from second-candidate perspective: **${summary.pattern.secondPerspective.join(' -> ')}**`);
  lines.push(`- overall: ${summary.first.key} **${summary.overall.first.points.toFixed(1)}/${summary.overall.totalGames}**, ${summary.second.key} **${summary.overall.second.points.toFixed(1)}/${summary.overall.totalGames}**`);
  lines.push('');
  lines.push('| time | first pts | second pts | gap (second-first) | first n/ms | second n/ms | outcome |');
  lines.push('|---|---:|---:|---:|---:|---:|---|');
  for (const row of summary.rows) {
    const outcome = row.outcome === 'second-win'
      ? `${summary.second.key} 우세`
      : row.outcome === 'first-win'
        ? `${summary.first.key} 우세`
        : '동률';
    lines.push(`| ${row.timeLimitMs} | ${row.firstPoints.toFixed(1)}/${row.totalGames} (${formatPercent(row.firstScoreRate)}) | ${row.secondPoints.toFixed(1)}/${row.totalGames} (${formatPercent(row.secondScoreRate)}) | ${formatSigned(row.pointGapRate)} | ${row.firstNodesPerMs.toFixed(2)} | ${row.secondNodesPerMs.toFixed(2)} | ${outcome} |`);
  }
  lines.push('');
  lines.push(`- overall gap (second-first): **${summary.overall.pointDiffPoints >= 0 ? '+' : ''}${summary.overall.pointDiffPoints.toFixed(1)} pts**, rate **${formatSigned(summary.overall.pointGapRate)}**`);
  lines.push(`- overall nodes/ms: ${summary.first.key} **${summary.overall.first.nodesPerMs.toFixed(2)}**, ${summary.second.key} **${summary.overall.second.nodesPerMs.toFixed(2)}**`);
  lines.push('');
  lines.push('pointGapRate는 **second candidate - first candidate** 기준입니다.');
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const microDir = typeof args['micro-dir'] === 'string' ? resolveCliPath(args['micro-dir']) : null;
const outputDir = typeof args['output-dir'] === 'string' ? resolveCliPath(args['output-dir']) : null;
const firstCandidateKey = typeof args['first-candidate'] === 'string' ? args['first-candidate'].trim() : null;
const secondCandidateKey = typeof args['second-candidate'] === 'string' ? args['second-candidate'].trim() : null;
if (!microDir || !outputDir || !firstCandidateKey || !secondCandidateKey) {
  throw new Error('--micro-dir, --output-dir, --first-candidate, --second-candidate are required.');
}

const first = summarizeCandidate(resolveCandidateSpec(firstCandidateKey));
const second = summarizeCandidate(resolveCandidateSpec(secondCandidateKey));
const files = fs.readdirSync(microDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => path.resolve(microDir, name))
  .sort((a, b) => a.localeCompare(b));
if (files.length === 0) {
  throw new Error(`No micro result JSON files found in ${microDir}`);
}

const microRows = files.map((filePath) => {
  const data = readJson(filePath);
  const scenario = data.scenarios?.[0];
  if (!scenario) {
    throw new Error(`Missing scenario in ${filePath}`);
  }
  const firstStats = scenario.variants?.[first.key];
  const secondStats = scenario.variants?.[second.key];
  if (!firstStats || !secondStats) {
    throw new Error(`Missing first/second stats in ${filePath}`);
  }
  const seedMatch = /seed(\d+)\.json$/.exec(path.basename(filePath));
  return {
    sourceFile: rel(filePath),
    timeLimitMs: scenario.timeLimitMs,
    seed: seedMatch ? Number(seedMatch[1]) : null,
    totalGames: scenario.totalGames,
    firstPoints: firstStats.points,
    secondPoints: secondStats.points,
    firstScoreRate: firstStats.scoreRate,
    secondScoreRate: secondStats.scoreRate,
    pointGapRate: scenario.pointGap,
    pointDiffPoints: secondStats.points - firstStats.points,
    firstNodesPerMs: firstStats.nodesPerMs,
    secondNodesPerMs: secondStats.nodesPerMs,
    firstTotalTurns: firstStats.totalTurns,
    secondTotalTurns: secondStats.totalTurns,
    firstTotalNodesEstimate: Number(firstStats.averageNodes ?? 0) * Number(firstStats.totalTurns ?? 0),
    secondTotalNodesEstimate: Number(secondStats.averageNodes ?? 0) * Number(secondStats.totalTurns ?? 0),
    firstTotalMsEstimate: Number(firstStats.averageElapsedMs ?? 0) * Number(firstStats.totalTurns ?? 0),
    secondTotalMsEstimate: Number(secondStats.averageElapsedMs ?? 0) * Number(secondStats.totalTurns ?? 0),
    outcome: classify(firstStats.points, secondStats.points),
  };
});

const timeBuckets = new Map();
for (const row of microRows) {
  const bucket = timeBuckets.get(row.timeLimitMs) ?? {
    timeLimitMs: row.timeLimitMs,
    totalGames: 0,
    firstPoints: 0,
    secondPoints: 0,
    firstNodes: 0,
    secondNodes: 0,
    firstMs: 0,
    secondMs: 0,
    seeds: [],
  };
  bucket.totalGames += row.totalGames;
  bucket.firstPoints += row.firstPoints;
  bucket.secondPoints += row.secondPoints;
  bucket.firstNodes += row.firstTotalNodesEstimate;
  bucket.secondNodes += row.secondTotalNodesEstimate;
  bucket.firstMs += row.firstTotalMsEstimate;
  bucket.secondMs += row.secondTotalMsEstimate;
  bucket.seeds.push(row.seed);
  timeBuckets.set(row.timeLimitMs, bucket);
}

const rows = [...timeBuckets.values()].sort((a, b) => a.timeLimitMs - b.timeLimitMs).map((bucket) => ({
  timeLimitMs: bucket.timeLimitMs,
  totalGames: bucket.totalGames,
  firstPoints: bucket.firstPoints,
  secondPoints: bucket.secondPoints,
  firstScoreRate: bucket.totalGames > 0 ? bucket.firstPoints / bucket.totalGames : 0,
  secondScoreRate: bucket.totalGames > 0 ? bucket.secondPoints / bucket.totalGames : 0,
  pointGapRate: bucket.totalGames > 0 ? (bucket.secondPoints - bucket.firstPoints) / bucket.totalGames : 0,
  pointDiffPoints: bucket.secondPoints - bucket.firstPoints,
  firstNodesPerMs: bucket.firstMs > 0 ? bucket.firstNodes / bucket.firstMs : 0,
  secondNodesPerMs: bucket.secondMs > 0 ? bucket.secondNodes / bucket.secondMs : 0,
  seeds: bucket.seeds.sort((a, b) => a - b),
  outcome: classify(bucket.firstPoints, bucket.secondPoints),
}));

const overall = rows.reduce((acc, row) => ({
  totalGames: acc.totalGames + row.totalGames,
  firstPoints: acc.firstPoints + row.firstPoints,
  secondPoints: acc.secondPoints + row.secondPoints,
  firstNodes: acc.firstNodes + row.firstNodesPerMs * row.totalGames,
  secondNodes: acc.secondNodes + row.secondNodesPerMs * row.totalGames,
}), { totalGames: 0, firstPoints: 0, secondPoints: 0, firstNodes: 0, secondNodes: 0 });

const totalFirstNodes = microRows.reduce((sum, row) => sum + row.firstTotalNodesEstimate, 0);
const totalSecondNodes = microRows.reduce((sum, row) => sum + row.secondTotalNodesEstimate, 0);
const totalFirstMs = microRows.reduce((sum, row) => sum + row.firstTotalMsEstimate, 0);
const totalSecondMs = microRows.reduce((sum, row) => sum + row.secondTotalMsEstimate, 0);

const summary = {
  generatedAt: new Date().toISOString(),
  first,
  second,
  options: {
    timeMsList: rows.map((row) => row.timeLimitMs),
    seedList: [...new Set(microRows.map((row) => row.seed).filter((value) => Number.isFinite(value)))].sort((a, b) => a - b),
    microFileCount: files.length,
  },
  rows,
  microRows,
  pattern: {
    firstPerspective: rows.map((row) => outlookLabel(classify(row.secondPoints, row.firstPoints))),
    secondPerspective: rows.map((row) => outlookLabel(row.outcome)),
  },
  overall: {
    totalGames: rows.reduce((sum, row) => sum + row.totalGames, 0),
    pointDiffPoints: rows.reduce((sum, row) => sum + row.pointDiffPoints, 0),
    pointGapRate: rows.reduce((sum, row) => sum + row.pointDiffPoints, 0) / rows.reduce((sum, row) => sum + row.totalGames, 0),
    outcome: classify(rows.reduce((sum, row) => sum + row.firstPoints, 0), rows.reduce((sum, row) => sum + row.secondPoints, 0)),
    first: {
      key: first.key,
      points: rows.reduce((sum, row) => sum + row.firstPoints, 0),
      scoreRate: rows.reduce((sum, row) => sum + row.firstPoints, 0) / rows.reduce((sum, row) => sum + row.totalGames, 0),
      nodesPerMs: totalFirstMs > 0 ? totalFirstNodes / totalFirstMs : 0,
    },
    second: {
      key: second.key,
      points: rows.reduce((sum, row) => sum + row.secondPoints, 0),
      scoreRate: rows.reduce((sum, row) => sum + row.secondPoints, 0) / rows.reduce((sum, row) => sum + row.totalGames, 0),
      nodesPerMs: totalSecondMs > 0 ? totalSecondNodes / totalSecondMs : 0,
    },
  },
};

ensureDir(outputDir);
writeJson(path.resolve(outputDir, 'summary.json'), summary);
writeMarkdownSummary(path.resolve(outputDir, 'summary.md'), summary);
console.log(`Wrote ${rel(path.resolve(outputDir, 'summary.json'))}`);
console.log(`Wrote ${rel(path.resolve(outputDir, 'summary.md'))}`);
