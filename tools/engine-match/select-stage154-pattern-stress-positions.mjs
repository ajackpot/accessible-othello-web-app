#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  RUNTIME_EVALUATION_PROFILE,
  RUNTIME_MOVE_ORDERING_PROFILE,
  RUNTIME_MPC_PROFILE,
  RUNTIME_PATTERN_BANK_PROFILES,
  RUNTIME_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { GameState, createStateHistoryFromMoveSequence } from '../../js/core/game-state.js';
import { selectRandomXotOpening } from '../../js/data/xot-openings-small.js';
import { createSeededRandom } from '../../js/test/benchmark-helpers.mjs';
import { parseArgs } from '../evaluator-training/lib.mjs';

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/select-stage154-pattern-stress-positions.mjs \
    [--sample-seeds 512] [--plies 24,28] [--per-ply 2] \
    [--output-dir tools/engine-match/out/_stage166_pattern_stress_selection]`);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(1, Math.round(parsed));
  }
  return fallback;
}

function parseIntegerList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0)
    .map((item) => Math.round(item));
  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function advanceOpeningRandomly(state, moves, random, targetPlies) {
  let nextState = state;
  const nextMoves = Array.isArray(moves) ? [...moves] : [];
  let guard = 0;
  while (!nextState.isTerminal() && nextMoves.length < targetPlies) {
    const legalMoves = nextState.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    if (legalMoves.length === 0) {
      nextState = nextState.passTurn();
      nextMoves.push(`${nextState.getOpponentColor(nextState.currentPlayer)}:pass`);
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded guard while handling passes.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    nextMoves.push(`${nextState.currentPlayer}:${chosen.coord}`);
    nextState = nextState.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return { state: nextState, moves: nextMoves };
}

function createXotOpeningState(seed, openingPlies = 8) {
  const random = createSeededRandom(seed);
  const { index, sequence } = selectRandomXotOpening(random());
  const history = createStateHistoryFromMoveSequence(sequence);
  const initialState = history.at(-1) ?? GameState.initial();
  const initialMoves = Array.isArray(initialState.moveHistory)
    ? initialState.moveHistory.map((action) => action?.type === 'pass' ? `${action.color}:pass` : `${action.color}:${action.coord}`)
    : [];
  const targetPlies = Math.max(initialMoves.length, Number.isFinite(openingPlies) ? openingPlies : initialMoves.length);
  const advanced = advanceOpeningRandomly(initialState, initialMoves, random, targetPlies);
  return {
    state: advanced.state,
    openingMoves: advanced.moves,
    openingPliesCompleted: advanced.moves.length,
    openingSeed: seed,
    xotIndex: index + 1,
    xotSequence: sequence,
  };
}

function createActiveEngine() {
  return new SearchEngine({
    evaluationProfile: RUNTIME_EVALUATION_PROFILE,
    moveOrderingProfile: RUNTIME_MOVE_ORDERING_PROFILE,
    tupleResidualProfile: RUNTIME_TUPLE_RESIDUAL_PROFILE,
    mpcProfile: RUNTIME_MPC_PROFILE,
    patternBankProfiles: RUNTIME_PATTERN_BANK_PROFILES,
    maxDepth: 1,
    timeLimitMs: 1,
  });
}

function calculatePatternLoad(engine, state) {
  const explanation = engine.evaluator.explainFeatures(state, state.currentPlayer);
  const options = engine.evaluator.options ?? {};
  const edgeContribution = (explanation.edgePattern ?? 0)
    * (explanation.effectiveWeights?.edgePattern ?? 0)
    * (options.edgePatternScale ?? 1);
  const cornerContribution = (explanation.cornerPattern ?? 0)
    * (explanation.effectiveWeights?.cornerPattern ?? 0)
    * (options.cornerPatternScale ?? 1);
  const frontierContribution = (explanation.frontier ?? 0)
    * (explanation.effectiveWeights?.frontier ?? 0)
    * (options.frontierScale ?? 1);
  const stabilityContribution = (explanation.stability ?? 0)
    * (explanation.effectiveWeights?.stability ?? 0)
    * (options.stabilityScale ?? 1);
  return {
    phaseBucketKey: explanation.phaseBucketKey ?? null,
    empties: explanation.empties ?? state.getEmptyCount(),
    edgeContribution,
    cornerContribution,
    frontierContribution,
    stabilityContribution,
    patternCompositeAbs: Math.abs(edgeContribution) + Math.abs(cornerContribution),
    totalStaticScore: engine.evaluator.evaluate(state, state.currentPlayer),
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const sampleSeeds = toPositiveInteger(args['sample-seeds'], 512);
const pliesList = parseIntegerList(args.plies, [24, 28]);
const perPly = toPositiveInteger(args['per-ply'], 2);
const outputDir = path.resolve(typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? args['output-dir']
  : 'tools/engine-match/out/_stage166_pattern_stress_selection');
fs.mkdirSync(outputDir, { recursive: true });

const engine = createActiveEngine();
const rows = [];
for (const openingPlies of pliesList) {
  for (let seed = 1; seed <= sampleSeeds; seed += 1) {
    const opening = createXotOpeningState(seed, openingPlies);
    if (opening.state.isTerminal() || opening.state.getLegalMoves().length === 0) {
      continue;
    }
    const patternLoad = calculatePatternLoad(engine, opening.state);
    rows.push({
      seed,
      openingPlies,
      openingSource: 'xot',
      xotIndex: opening.xotIndex,
      xotSequence: opening.xotSequence,
      openingMoves: opening.openingMoves,
      ...patternLoad,
    });
  }
}

const selected = [];
const usedMovePrefixes = new Set();
for (const openingPlies of pliesList) {
  const ranked = rows
    .filter((row) => row.openingPlies === openingPlies)
    .sort((left, right) => right.patternCompositeAbs - left.patternCompositeAbs);
  for (const row of ranked) {
    if (selected.filter((item) => item.openingPlies === openingPlies).length >= perPly) {
      break;
    }
    const prefix = row.openingMoves.slice(0, 12).join(' ');
    if (usedMovePrefixes.has(prefix)) {
      continue;
    }
    usedMovePrefixes.add(prefix);
    selected.push({
      positionId: `xot${row.xotIndex}-p${row.openingPlies}-s${row.seed}`,
      ...row,
    });
  }
}

selected.sort((left, right) => right.patternCompositeAbs - left.patternCompositeAbs);

const output = {
  generatedAt: new Date().toISOString(),
  sampleSeeds,
  pliesList,
  perPly,
  candidatesScanned: rows.length,
  selectedCount: selected.length,
  positions: selected,
};

const lines = [
  '# Stage166 pattern-stress position selection',
  '',
  `- generated at: ${output.generatedAt}`,
  `- sample seeds: ${sampleSeeds}`,
  `- plies scanned: ${pliesList.join(', ')}`,
  `- selected per ply: ${perPly}`,
  `- candidates scanned: ${rows.length}`,
  `- selected positions: ${selected.length}`,
  '',
  '| positionId | seed | plies | xot | empties | |edge|+|corner| | edge | corner | frontier |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
];
for (const position of selected) {
  lines.push(`| ${position.positionId} | ${position.seed} | ${position.openingPlies} | ${position.xotIndex} | ${position.empties} | ${position.patternCompositeAbs.toFixed(3)} | ${position.edgeContribution.toFixed(3)} | ${position.cornerContribution.toFixed(3)} | ${position.frontierContribution.toFixed(3)} |`);
}
lines.push('');
lines.push('These positions are chosen to maximize the absolute edge/corner pattern contribution under the currently installed evaluator.');
lines.push('');

fs.writeFileSync(path.join(outputDir, 'stage166_pattern_stress_positions.json'), `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'stage166_pattern_stress_positions.md'), `${lines.join('\n')}\n`);

console.log(`Saved position JSON to ${path.join(outputDir, 'stage166_pattern_stress_positions.json')}`);
console.log(`Saved position summary to ${path.join(outputDir, 'stage166_pattern_stress_positions.md')}`);
