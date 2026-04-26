import assert from 'node:assert/strict';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import { buildEngineProfileOverrides, loadProfileVariant } from '../../tools/engine-match/lib-profile-variants.mjs';
import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

function playDeterministicPly(state, plies) {
  let current = state;
  for (let ply = 0; ply < plies; ply += 1) {
    const legalMoves = current.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    current = legalMoves.length === 0
      ? current.passTurn()
      : current.applyMove(legalMoves[0].index).state;
  }
  return current;
}

const generatedModule = resolveProjectPath(
  'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage154-main-recenter', 'exported', 's154-main.generated.js',
);
const engineOptionsJson = resolveProjectPath(
  'tools', 'evaluator-training', 'out', 'stage15x-support-stack', 'stage154-main-recenter', 'engine-options', 's154-main.json',
);

const variant = await loadProfileVariant({
  label: 'stage154-main-recenter-support-stack',
  generatedModule,
  engineOptionsJson,
});

assert.equal(variant.label, 'stage154-main-recenter-support-stack');
assert.ok(variant.evaluationProfile, 'evaluation profile should resolve');
assert.ok(variant.moveOrderingProfile, 'move-ordering profile should resolve');
assert.ok(variant.tupleResidualProfile, 'tuple residual profile should resolve');
assert.ok(variant.mpcProfile, 'runtime MPC profile should resolve');
assert.ok(Array.isArray(variant.patternBankProfiles) && variant.patternBankProfiles.length >= 1, 'evaluation pattern bank should resolve');
assert.ok(!variant.moveOrderingPatternBankProfiles || variant.moveOrderingPatternBankProfiles.length === 0, 'stage154 main should not have a move-ordering pattern bank');
assert.equal(variant.engineOptions?.classicSearchDriver, 'pvs', 'engine-options JSON should be applied');

const engine = new SearchEngine({
  presetKey: 'expert',
  maxDepth: 4,
  maxTimeMs: 250,
  exactEndgameEmpties: 8,
  ...buildEngineProfileOverrides(variant),
});

const probeState = playDeterministicPly(GameState.initial(), 10);
const result = engine.findBestMove(probeState);

assert.ok(result && Number.isInteger(result.bestMoveIndex), 'main candidate should return a best move index');
assert.equal(typeof result.bestMoveCoord, 'string', 'main candidate should return a best move coordinate');
assert.ok(Number.isFinite(result.score), 'main candidate should return a numeric score');
assert.ok(engine.stats?.nodes > 0, 'main candidate should search at least one node');

console.log('stage161 stage15x main candidate smoke passed');
console.log(`  best move: ${result.bestMoveCoord}`);
console.log(`  score    : ${result.score}`);
console.log(`  nodes    : ${engine.stats.nodes}`);
