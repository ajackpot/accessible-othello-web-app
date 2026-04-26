import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStateFromJsonRecord, sanitizePatternBankProfileStackForModule } from '../../tools/evaluator-training/lib.mjs';
import { loadProfileVariant } from '../../tools/engine-match/lib-profile-variants.mjs';
import { SearchEngine } from '../ai/search-engine.js';
import { MoveOrderingEvaluator } from '../ai/evaluator.js';
import { GameState, createStateHistoryFromMoveSequence } from '../core/game-state.js';
import { selectRandomXotOpening } from '../data/xot-openings-small.js';
import { createSeededRandom } from './benchmark-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function countNonZeroWeights(profileStack) {
  let nonZero = 0;
  for (const profile of profileStack ?? []) {
    for (const bucket of profile?.trainedBuckets ?? []) {
      for (const table of bucket?.patternWeights ?? []) {
        for (const value of table ?? []) {
          if (Number.isFinite(value) && value !== 0) {
            nonZero += 1;
          }
        }
      }
    }
  }
  return nonZero;
}

function countFactorizedNonZeroTables(profileStack) {
  let nonZeroTables = 0;
  for (const profile of profileStack ?? []) {
    const counts = Array.isArray(profile?.factorized?.tableNonZeroCounts) ? profile.factorized.tableNonZeroCounts : [];
    nonZeroTables += counts.filter((count) => Number(count) > 0).length;
  }
  return nonZeroTables;
}

function createState(seed, targetPlies = 24) {
  const random = createSeededRandom(seed);
  const { sequence } = selectRandomXotOpening(random());
  const history = createStateHistoryFromMoveSequence(sequence);
  let state = history.at(-1) ?? GameState.initial();
  while (!state.isTerminal() && state.moveHistory.length < targetPlies) {
    const legalMoves = state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    if (legalMoves.length === 0) {
      state = state.passTurn();
      continue;
    }
    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    state = state.applyMove(chosen.index).state;
  }
  return state;
}

async function createVariantEngine(generatedModulePath, engineOptionsPath = null) {
  const variant = await loadProfileVariant({
    label: path.basename(generatedModulePath),
    generatedModule: generatedModulePath,
    engineOptionsJson: engineOptionsPath,
  });
  return new SearchEngine({
    ...(variant.engineOptions ?? {}),
    evaluationProfile: variant.evaluationProfile,
    moveOrderingProfile: variant.moveOrderingProfile,
    tupleResidualProfile: variant.tupleResidualProfile,
    mpcProfile: variant.mpcProfile,
    patternBankProfiles: variant.patternBankProfiles,
    moveOrderingPatternBankProfiles: variant.moveOrderingPatternBankProfiles,
    maxDepth: 1,
    timeLimitMs: 1,
  });
}

const stage154PatternBankJson = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage154-main-recenter', 'shared', 'evaluation-pattern-bank.01.json'),
  'utf8',
));
const stage151OrderingPatternBankJson = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'shared', 'ordering-pattern-bank.source.01.json'),
  'utf8',
));
const stage29SmokeInputPath = path.join(
  repoRoot,
  'tools',
  'evaluator-training',
  'out',
  'stage29_move_ordering_smoke_input_mixed.jsonl',
);

const sanitizedEvalStack = sanitizePatternBankProfileStackForModule([stage154PatternBankJson]);
const sanitizedOrderingStack = sanitizePatternBankProfileStackForModule([stage151OrderingPatternBankJson]);
assert.ok(countNonZeroWeights(sanitizedEvalStack) > 0, 'stage154 factorized evaluation pattern bank should survive tool-side sanitization with non-zero weights.');
assert.ok(countNonZeroWeights(sanitizedOrderingStack) > 0, 'stage151 factorized move-ordering pattern bank should survive tool-side sanitization with non-zero weights.');

const repairedModulePath = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage154-main-recenter', 'exported', 's154-main.generated.js');
const repairedModule = await import(`file://${repairedModulePath}`);
assert.ok(countFactorizedNonZeroTables(repairedModule.GENERATED_PATTERN_BANK_PROFILES) > 0, 'repaired stage154 export should carry a non-empty factorized evaluation pattern bank payload.');

const sourceEngine = await createVariantEngine(
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage154', 'modules', 'learned-eval-profile.main_only.recenter.factorized.generated.js'),
);
const repairedEngine = await createVariantEngine(
  repairedModulePath,
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage154-main-recenter', 'engine-options', 's154-main.json'),
);

const stateA = createState(1, 24);
const stateB = createState(2, 24);
const sourceA = sourceEngine.evaluator.explainFeatures(stateA, stateA.currentPlayer);
const sourceB = sourceEngine.evaluator.explainFeatures(stateB, stateB.currentPlayer);
const repairedA = repairedEngine.evaluator.explainFeatures(stateA, stateA.currentPlayer);
const repairedB = repairedEngine.evaluator.explainFeatures(stateB, stateB.currentPlayer);

assert.notEqual(repairedA.patternBankProfiles?.[0]?.patternContribution ?? 0, 0, 'repaired export should produce non-zero board-dependent pattern contribution.');
assert.notEqual(repairedA.patternBankContribution, repairedB.patternBankContribution, 'repaired export should vary pattern-bank contribution across different boards in the same empties bucket.');
assert.ok(Math.abs((sourceA.patternBankContribution ?? 0) - (repairedA.patternBankContribution ?? 0)) < 1e-6, 'repaired export should match the original stage154 source module on state A.');
assert.ok(Math.abs((sourceB.patternBankContribution ?? 0) - (repairedB.patternBankContribution ?? 0)) < 1e-6, 'repaired export should match the original stage154 source module on state B.');

const stage151NoEndVariant = await loadProfileVariant({
  label: 'stage151-noend-main-support-stack',
  generatedModule: path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'exported', 's151-noend-main.generated.js'),
  engineOptionsJson: path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'engine-options', 's151-noend-main.json'),
});
const stage151LateAVariant = await loadProfileVariant({
  label: 'stage151-latea-main-support-stack',
  generatedModule: path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'exported', 's151-latea-main.generated.js'),
  engineOptionsJson: path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'engine-options', 's151-latea-main.json'),
});
const stage151LinearOnlyVariant = await loadProfileVariant({
  label: 'stage151-linear-only-support-stack',
  generatedModule: path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'exported', 's151-linear-only.generated.js'),
  engineOptionsJson: path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage151-split-late3', 'engine-options', 's151-linear-only.json'),
});

assert.ok((stage151NoEndVariant.moveOrderingPatternBankProfiles?.length ?? 0) > 0, 'stage151 noend export should carry a move-ordering pattern bank payload.');
assert.ok((stage151LateAVariant.moveOrderingPatternBankProfiles?.length ?? 0) > 0, 'stage151 latea export should carry a move-ordering pattern bank payload.');
assert.ok((stage151LinearOnlyVariant.moveOrderingPatternBankProfiles?.length ?? 0) === 0, 'stage151 linear-only export should leave move-ordering pattern bank disabled.');

const firstRecordLine = fs.readFileSync(stage29SmokeInputPath, 'utf8').split(/\r?\n/).find((line) => line.trim().startsWith('{'));
assert.ok(firstRecordLine, 'stage29 smoke input should contain a JSON record.');
const orderingState = createStateFromJsonRecord(JSON.parse(firstRecordLine));
assert.equal(orderingState.getEmptyCount(), 11, 'stage29 smoke input should provide an 11-empty ordering pattern bank probe state.');

const stage151NoEndEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: stage151NoEndVariant.moveOrderingProfile,
  moveOrderingPatternBankProfiles: stage151NoEndVariant.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 1,
  moveOrderingPatternBankMinEmpties: 0,
  moveOrderingPatternBankMaxEmpties: stage151NoEndVariant.engineOptions?.moveOrderingPatternBankMaxEmpties ?? 19,
});
const stage151LateAEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: stage151LateAVariant.moveOrderingProfile,
  moveOrderingPatternBankProfiles: stage151LateAVariant.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 1,
  moveOrderingPatternBankMinEmpties: 0,
  moveOrderingPatternBankMaxEmpties: stage151LateAVariant.engineOptions?.moveOrderingPatternBankMaxEmpties ?? 19,
});
const stage151LinearOnlyEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: stage151LinearOnlyVariant.moveOrderingProfile,
  moveOrderingPatternBankProfiles: stage151LinearOnlyVariant.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 1,
  moveOrderingPatternBankMinEmpties: 0,
  moveOrderingPatternBankMaxEmpties: stage151LinearOnlyVariant.engineOptions?.moveOrderingPatternBankMaxEmpties ?? 19,
});

assert.notEqual(stage151NoEndEvaluator.explainFeatures(orderingState).moveOrderingPatternBankContribution, 0, 'stage151 noend export should contribute on the 11-empty probe state.');
assert.equal(stage151LateAEvaluator.explainFeatures(orderingState).moveOrderingPatternBankContribution, 0, 'stage151 latea export should gate out the 11-empty probe state.');
assert.equal(stage151LinearOnlyEvaluator.explainFeatures(orderingState).moveOrderingPatternBankContribution, 0, 'stage151 linear-only export should fully disable the ordering pattern bank.');

console.log('stage167 factorized pattern-bank export smoke passed');
