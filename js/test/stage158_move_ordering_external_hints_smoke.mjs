import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 6,
  timeLimitMs: 1800,
  exactEndgameEmpties: 8,
  aspirationWindow: 45,
  randomness: 0,
  maxTableEntries: 180000,
  wldPreExactEmpties: 0,
});

const states = [
  playSeededRandomUntilEmptyCount(20, 17),
  playSeededRandomUntilEmptyCount(16, 29),
];

let totalStabilityBonuses = 0;
let totalQuietMoveBonuses = 0;
let totalEdgeEndpointBonuses = 0;

for (const state of states) {
  const engine = new SearchEngine({
    ...sharedOptions,
    moveOrderingStructureProfile: 'stable-quiet-probe-v1',
  });
  const result = engine.findBestMove(state);
  assert.equal(result.searchCompletion, 'complete', 'stable/quiet ordering smoke should complete.');
  assert.ok(result.bestMoveCoord, 'stable/quiet ordering smoke should return a best move.');
  assert.equal(result.options?.moveOrderingStructureProfile?.key, 'stable-quiet-probe-v1');

  totalStabilityBonuses += Number(result.stats?.orderingStabilityBonuses ?? 0);
  totalQuietMoveBonuses += Number(result.stats?.orderingQuietMoveBonuses ?? 0);
  totalEdgeEndpointBonuses += Number(result.stats?.orderingEdgeEndpointBonuses ?? 0);
}

assert.ok(
  totalStabilityBonuses > 0,
  'stable/quiet ordering smoke should trigger stability bonus signals on at least one sample.',
);
assert.ok(
  totalQuietMoveBonuses > 0 || totalEdgeEndpointBonuses > 0,
  'stable/quiet ordering smoke should trigger quiet or edge-endpoint bonus signals on at least one sample.',
);

console.log('stage158 move-ordering external hints smoke passed');
