#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { parseArgs, resolveCliPath, toPortablePath } from '../evaluator-training/lib.mjs';
import { resolveStage157StructuralCandidate } from '../evaluator-training/stage157-structural-candidates.mjs';
import { resolveStage158StructuralCandidate } from '../evaluator-training/stage158-structural-candidates.mjs';
import { resolveStage170SurvivorComboCandidate } from '../evaluator-training/stage170-survivor-combo-candidates.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function rel(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parsePathList(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return [];
  }
  return raw.split(',').map((token) => token.trim()).filter(Boolean).map((token) => resolveCliPath(token));
}

function resolveCandidateSpec(candidateKey) {
  try {
    return { stage: 170, candidate: resolveStage170SurvivorComboCandidate(candidateKey) };
  } catch {
    // noop
  }
  try {
    return { stage: 157, candidate: resolveStage157StructuralCandidate(candidateKey) };
  } catch {
    // noop
  }
  return { stage: 158, candidate: resolveStage158StructuralCandidate(candidateKey) };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value, digits = 3) {
  const number = Number(value) || 0;
  return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`;
}

function summarizeRecommendation(gap) {
  if (gap > 0) {
    return 'candidate overlay가 baseline보다 앞섰습니다.';
  }
  if (gap < 0) {
    return 'baseline이 candidate overlay보다 앞섰습니다.';
  }
  return '두 profile variant의 paired score가 사실상 동률입니다.';
}

function writeMarkdownSummary(filePath, summary) {
  const lines = [];
  lines.push(`# Aggregated split decision summary for ${summary.candidate.key}`);
  lines.push('');
  lines.push(`- stage: ${summary.candidate.stage}`);
  lines.push(`- candidate: \`${summary.candidate.key}\``);
  lines.push(`- family: ${summary.candidate.familyKey}`);
  lines.push(`- move-ordering profile: ${summary.candidate.moveOrderingStructureProfileKey}`);
  lines.push(`- MPC profile: ${summary.candidate.mpcStructureProfileKey}`);
  if (summary.candidate.moveOrderingSource) {
    lines.push(`- move-ordering source: stage${summary.candidate.moveOrderingSource.stage} / \`${summary.candidate.moveOrderingSource.key}\``);
  }
  if (summary.candidate.mpcSource) {
    lines.push(`- MPC source: stage${summary.candidate.mpcSource.stage} / \`${summary.candidate.mpcSource.key}\``);
  }
  lines.push('');
  lines.push('| baseline | time | baseline pts | candidate pts | gap | baseline n/ms | candidate n/ms | recommendation |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---|');
  for (const row of summary.rows) {
    lines.push(`| ${row.baselineId} | ${row.timeLimitMs} | ${row.baselinePoints.toFixed(1)}/${row.totalGames} (${formatPercent(row.baselineScoreRate)}) | ${row.candidatePoints.toFixed(1)}/${row.totalGames} (${formatPercent(row.candidateScoreRate)}) | ${formatSigned(row.pointGap)} | ${row.baselineNodesPerMs.toFixed(2)} | ${row.candidateNodesPerMs.toFixed(2)} | ${row.recommendation} |`);
  }
  lines.push('');
  lines.push(`- overall baseline points: ${summary.overall.baselinePoints.toFixed(1)}/${summary.overall.totalGames}`);
  lines.push(`- overall candidate points: ${summary.overall.candidatePoints.toFixed(1)}/${summary.overall.totalGames}`);
  lines.push(`- overall gap: ${formatSigned(summary.overall.pointGap)}`);
  lines.push('');
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const candidateKey = typeof args.candidate === 'string' && args.candidate.trim() !== '' ? args.candidate.trim() : null;
const resultJsonPaths = parsePathList(args['result-json-list']);
const outputDir = typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? resolveCliPath(args['output-dir'])
  : null;

if (!candidateKey || resultJsonPaths.length === 0 || !outputDir) {
  console.error('Usage: node tools/engine-match/aggregate-stage170-split-decision-results.mjs --candidate <key> --result-json-list <path1,path2,...> --output-dir <dir>');
  process.exit(1);
}

const resolvedCandidate = resolveCandidateSpec(candidateKey);
const candidate = resolvedCandidate.candidate;
const aggregateMap = new Map();
const sourceFiles = [];

for (const filePath of resultJsonPaths) {
  const absolutePath = resolveCliPath(filePath);
  const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  for (const scenario of parsed.scenarios ?? []) {
    const baselineLabel = scenario.firstVariantLabel;
    const candidateLabel = scenario.secondVariantLabel;
    const baselineVariant = scenario.variants?.[baselineLabel] ?? null;
    const candidateVariant = scenario.variants?.[candidateLabel] ?? null;
    if (!baselineVariant || !candidateVariant) {
      continue;
    }
    const key = `${baselineLabel}::${scenario.timeLimitMs}`;
    const current = aggregateMap.get(key) ?? {
      baselineId: baselineLabel,
      timeLimitMs: scenario.timeLimitMs,
      totalGames: 0,
      baselinePoints: 0,
      candidatePoints: 0,
      baselineNodesTotal: 0,
      baselineElapsedTotal: 0,
      candidateNodesTotal: 0,
      candidateElapsedTotal: 0,
    };
    current.totalGames += scenario.totalGames;
    current.baselinePoints += baselineVariant.points;
    current.candidatePoints += candidateVariant.points;
    current.baselineNodesTotal += baselineVariant.averageNodes * baselineVariant.totalTurns;
    current.baselineElapsedTotal += baselineVariant.averageElapsedMs * baselineVariant.totalTurns;
    current.candidateNodesTotal += candidateVariant.averageNodes * candidateVariant.totalTurns;
    current.candidateElapsedTotal += candidateVariant.averageElapsedMs * candidateVariant.totalTurns;
    aggregateMap.set(key, current);
  }
  sourceFiles.push(rel(absolutePath));
}

const rows = [...aggregateMap.values()].map((row) => {
  const baselineScoreRate = row.totalGames > 0 ? row.baselinePoints / row.totalGames : 0;
  const candidateScoreRate = row.totalGames > 0 ? row.candidatePoints / row.totalGames : 0;
  const pointGap = candidateScoreRate - baselineScoreRate;
  const baselineNodesPerMs = row.baselineElapsedTotal > 0 ? row.baselineNodesTotal / row.baselineElapsedTotal : 0;
  const candidateNodesPerMs = row.candidateElapsedTotal > 0 ? row.candidateNodesTotal / row.candidateElapsedTotal : 0;
  return {
    baselineId: row.baselineId,
    timeLimitMs: row.timeLimitMs,
    totalGames: row.totalGames,
    baselinePoints: row.baselinePoints,
    candidatePoints: row.candidatePoints,
    baselineScoreRate,
    candidateScoreRate,
    pointGap,
    baselineNodesPerMs,
    candidateNodesPerMs,
    recommendation: summarizeRecommendation(pointGap),
  };
}).sort((left, right) => {
  if (left.baselineId !== right.baselineId) {
    return left.baselineId.localeCompare(right.baselineId);
  }
  return left.timeLimitMs - right.timeLimitMs;
});

const overallBaselinePoints = rows.reduce((sum, row) => sum + row.baselinePoints, 0);
const overallCandidatePoints = rows.reduce((sum, row) => sum + row.candidatePoints, 0);
const overallTotalGames = rows.reduce((sum, row) => sum + row.totalGames, 0);
const overallSummary = {
  baselinePoints: overallBaselinePoints,
  candidatePoints: overallCandidatePoints,
  totalGames: overallTotalGames,
  pointGap: overallTotalGames > 0 ? (overallCandidatePoints - overallBaselinePoints) / overallTotalGames : 0,
};

const finalSummary = {
  generatedAt: new Date().toISOString(),
  candidate: {
    stage: resolvedCandidate.stage,
    key: candidate.key,
    familyKey: candidate.familyKey,
    familyLabel: candidate.family.label,
    priority: candidate.priority,
    tier: candidate.tier,
    risk: candidate.risk,
    notes: candidate.notes,
    moveOrderingStructureProfileKey: candidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: candidate.mpcStructureProfile?.key ?? null,
    ...(candidate.moveOrderingSource ? { moveOrderingSource: candidate.moveOrderingSource } : {}),
    ...(candidate.mpcSource ? { mpcSource: candidate.mpcSource } : {}),
  },
  sourceFiles,
  rows,
  overall: overallSummary,
};

ensureDir(outputDir);
const summaryJsonPath = path.resolve(outputDir, 'summary.json');
const summaryMdPath = path.resolve(outputDir, 'summary.md');
writeJson(summaryJsonPath, finalSummary);
writeMarkdownSummary(summaryMdPath, finalSummary);
console.log(`Saved aggregated summary JSON to ${rel(summaryJsonPath)}`);
console.log(`Saved aggregated summary Markdown to ${rel(summaryMdPath)}`);
