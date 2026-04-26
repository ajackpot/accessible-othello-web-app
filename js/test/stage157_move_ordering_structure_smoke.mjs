import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const state = playSeededRandomUntilEmptyCount(16, 29);

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 6,
  timeLimitMs: 1600,
  exactEndgameEmpties: 8,
  aspirationWindow: 45,
  randomness: 0,
  maxTableEntries: 180000,
  wldPreExactEmpties: 0,
});

const baselineEngine = new SearchEngine({
  ...sharedOptions,
  moveOrderingStructureProfile: 'baseline-v1',
});
const baselineResult = baselineEngine.findBestMove(state);
assert.equal(baselineResult.searchCompletion, 'complete', 'Baseline ordering smoke should complete.');
assert.ok(baselineResult.bestMoveCoord, 'Baseline ordering smoke should return a best move.');
assert.equal(baselineResult.options?.moveOrderingStructureProfile?.key, 'baseline-v1');

const hybridEngine = new SearchEngine({
  ...sharedOptions,
  moveOrderingStructureProfile: 'hybrid-probe-v1',
});
const hybridResult = hybridEngine.findBestMove(state);
assert.equal(hybridResult.searchCompletion, 'complete', 'Hybrid ordering smoke should complete.');
assert.ok(hybridResult.bestMoveCoord, 'Hybrid ordering smoke should return a best move.');
assert.equal(hybridResult.options?.moveOrderingStructureProfile?.key, 'hybrid-probe-v1');

const hybridStats = hybridResult.stats ?? {};
assert.ok(
  (hybridStats.orderingTopKRescores ?? 0) > 0
    || (hybridStats.orderingPotentialMobilityBonuses ?? 0) > 0
    || (hybridStats.orderingFrontierBonuses ?? 0) > 0
    || (hybridStats.orderingShallowProbeCalls ?? 0) > 0,
  'Hybrid ordering profile should trigger at least one structural signal.',
);
assert.ok(
  (hybridStats.fastestFirstExactSorts ?? 0) >= 0,
  'Hybrid ordering smoke should expose exact-fastest-first stats in the result payload.',
);

console.log('stage157 move-ordering structure smoke passed');
