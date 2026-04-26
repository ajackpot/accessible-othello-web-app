import assert from 'node:assert/strict';

import { Evaluator, MoveOrderingEvaluator } from '../ai/evaluator.js';
import { SearchEngine } from '../ai/search-engine.js';
import { GameState } from '../core/game-state.js';

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function sortLegalMoves(state) {
  return state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
}

function createLateState() {
  for (let seed = 17; seed < 200; seed += 1) {
    const random = createSeededRandom(seed);
    let state = GameState.initial();
    while (!state.isTerminal() && state.moveHistory.length < 24) {
      const legalMoves = sortLegalMoves(state);
      if (legalMoves.length === 0) {
        state = state.passTurn();
        continue;
      }
      const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
      state = state.applyMove(chosen.index).state;
    }
    return state;
  }
  throw new Error('Failed to create a late state for Stage 156 retirement smoke.');
}

const state = createLateState();
const baselineEvaluator = new Evaluator();
const legacyScaledEvaluator = new Evaluator({
  edgePatternScale: 2,
  cornerPatternScale: 2,
  moveOrderingEdgePatternScale: 0.1,
  moveOrderingCornerPatternScale: 0.2,
});
const baselineMoveOrdering = new MoveOrderingEvaluator();
const legacyScaledMoveOrdering = new MoveOrderingEvaluator({
  edgePatternScale: 2,
  cornerPatternScale: 2,
  moveOrderingEdgePatternScale: 0.1,
  moveOrderingCornerPatternScale: 0.2,
});

const baselineExplain = baselineEvaluator.explainFeatures(state, state.currentPlayer);
const legacyExplain = legacyScaledEvaluator.explainFeatures(state, state.currentPlayer);
assert.equal(baselineExplain.edgePattern, 0);
assert.equal(baselineExplain.cornerPattern, 0);
assert.equal(legacyExplain.edgePattern, 0);
assert.equal(legacyExplain.cornerPattern, 0);
assert.equal(
  baselineEvaluator.evaluate(state, state.currentPlayer),
  legacyScaledEvaluator.evaluate(state, state.currentPlayer),
  'Main evaluator should ignore retired handcrafted edge/corner pattern knobs.',
);

const baselineMoveExplain = baselineMoveOrdering.explainFeatures(state, state.currentPlayer);
const legacyMoveExplain = legacyScaledMoveOrdering.explainFeatures(state, state.currentPlayer);
assert.equal(baselineMoveExplain.edgePattern, 0);
assert.equal(baselineMoveExplain.cornerPattern, 0);
assert.equal(legacyMoveExplain.edgePattern, 0);
assert.equal(legacyMoveExplain.cornerPattern, 0);
assert.equal(
  baselineMoveOrdering.evaluate(state, state.currentPlayer),
  legacyScaledMoveOrdering.evaluate(state, state.currentPlayer),
  'Move-ordering evaluator should ignore retired handcrafted edge/corner pattern knobs.',
);

const engine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 4,
  timeLimitMs: 80,
  exactEndgameEmpties: 8,
  edgePatternScale: 0.6,
  cornerPatternScale: 0.7,
  moveOrderingEdgePatternScale: 0.1,
  moveOrderingCornerPatternScale: 0.2,
});
assert.equal(Object.hasOwn(engine.options, 'edgePatternScale'), false);
assert.equal(Object.hasOwn(engine.options, 'cornerPatternScale'), false);
assert.equal(Object.hasOwn(engine.options, 'moveOrderingEdgePatternScale'), false);
assert.equal(Object.hasOwn(engine.options, 'moveOrderingCornerPatternScale'), false);

console.log('stage156 move-ordering edge/corner split retirement smoke passed');
