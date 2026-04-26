import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function makeDepthLimitedEngine(ttFirstDeferredMoveListBuild) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 6,
    exactEndgameEmpties: 12,
    aspirationWindow: 0,
    timeLimitMs: 2200,
    randomness: 0,
    maxTableEntries: 240000,
    allocationLightSearchMoves: true,
    reusablePreparedSearchMoveBuffers: true,
    lazyPreparedSearchMoves: true,
    tokenizedPreparedSearchMoveCore: true,
    compactPreparedSearchMoveFlips: false,
    ttFirstDeferredMoveListBuild,
    lowOverheadSearchChildStateFactory: false,
  });
}

function makeWldControlEngine(ttFirstDeferredMoveListBuild) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 8,
    exactEndgameEmpties: 12,
    aspirationWindow: 0,
    timeLimitMs: 3200,
    randomness: 0,
    maxTableEntries: 240000,
    wldPreExactEmpties: 2,
    enhancedTranspositionCutoff: true,
    enhancedTranspositionCutoffWld: true,
    ttFirstDeferredMoveListBuild,
    lowOverheadSearchChildStateFactory: false,
  });
}

function makeExactControlEngine(ttFirstDeferredMoveListBuild) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 4,
    exactEndgameEmpties: 10,
    aspirationWindow: 0,
    timeLimitMs: 9000,
    randomness: 0,
    maxTableEntries: 220000,
    wldPreExactEmpties: 0,
    ttFirstDeferredMoveListBuild,
    lowOverheadSearchChildStateFactory: false,
  });
}

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.ttFirstDeferredMoveListBuild, false, 'The Stage 203 TT-first deferred move-list build should remain disabled by default after the split balanced benchmark stayed neutral-to-negative overall.');
assert.equal(defaultEngine.options.lowOverheadSearchChildStateFactory, false, 'The Stage 203 work should keep the low-overhead child-state factory off by default because its midgame gain did not survive WLD/exact control checks.');

const depthLimitedRegression = playSeededRandomUntilEmptyCount(24, 11);
assert.equal(depthLimitedRegression.getEmptyCount(), 24, 'The Stage 203 midgame regression should reach 24 empties.');

const depthLimitedBaseline = makeDepthLimitedEngine(false).findBestMove(depthLimitedRegression);
const depthLimitedCandidate = makeDepthLimitedEngine(true).findBestMove(depthLimitedRegression);
assert.equal(depthLimitedCandidate.searchMode, 'depth-limited', 'The Stage 203 candidate should stay in the depth-limited bucket on the midgame regression.');
assert.equal(depthLimitedCandidate.bestMoveCoord, depthLimitedBaseline.bestMoveCoord, 'The Stage 203 candidate should preserve best-move parity on the midgame regression.');
assert.equal(depthLimitedCandidate.score, depthLimitedBaseline.score, 'The Stage 203 candidate should preserve score parity on the midgame regression.');
assert.equal(depthLimitedCandidate.stats.nodes, depthLimitedBaseline.stats.nodes, 'The Stage 203 candidate should preserve node parity on the midgame regression.');
assert.ok(depthLimitedCandidate.stats.ttFirstDeferredMoveListBuildAttempts > 0, 'The Stage 203 midgame regression should attempt the deferred TT-first move-list path.');
assert.ok(depthLimitedCandidate.stats.ttFirstDeferredMoveListBuildLegalHits > 0, 'The Stage 203 midgame regression should materialize at least one legal deferred TT-first move.');
assert.ok(depthLimitedCandidate.stats.ttFirstDeferredMoveListBuildSkips > 0, 'The Stage 203 midgame regression should skip some full move-list builds after deferred TT-first cutoffs.');
assert.ok(depthLimitedCandidate.stats.ttFirstDeferredMoveListBuildCutoffs > 0, 'The Stage 203 midgame regression should realize at least one deferred TT-first cutoff.');

const wldControlRegression = playSeededRandomUntilEmptyCount(14, 23);
assert.equal(wldControlRegression.getEmptyCount(), 14, 'The Stage 203 WLD control regression should reach 14 empties.');
const wldControlBaseline = makeWldControlEngine(false).findBestMove(wldControlRegression);
const wldControlCandidate = makeWldControlEngine(true).findBestMove(wldControlRegression);
assert.equal(wldControlCandidate.searchMode, 'wld-endgame', 'The Stage 203 candidate should not change the WLD bucket selection.');
assert.equal(wldControlCandidate.bestMoveCoord, wldControlBaseline.bestMoveCoord, 'The Stage 203 candidate should preserve WLD best-move parity.');
assert.equal(wldControlCandidate.score, wldControlBaseline.score, 'The Stage 203 candidate should preserve WLD score parity.');
assert.equal(wldControlCandidate.stats.ttFirstDeferredMoveListBuildAttempts, 0, 'The Stage 203 deferred TT-first path should stay inactive inside the WLD bucket.');

const exactControlRegression = playSeededRandomUntilEmptyCount(10, 7);
assert.equal(exactControlRegression.getEmptyCount(), 10, 'The Stage 203 exact control regression should reach 10 empties.');
const exactControlBaseline = makeExactControlEngine(false).findBestMove(exactControlRegression);
const exactControlCandidate = makeExactControlEngine(true).findBestMove(exactControlRegression);
assert.equal(exactControlCandidate.searchMode, 'exact-endgame', 'The Stage 203 candidate should not change the exact bucket selection.');
assert.equal(exactControlCandidate.bestMoveCoord, exactControlBaseline.bestMoveCoord, 'The Stage 203 candidate should preserve exact best-move parity.');
assert.equal(exactControlCandidate.score, exactControlBaseline.score, 'The Stage 203 candidate should preserve exact score parity.');
assert.equal(exactControlCandidate.stats.ttFirstDeferredMoveListBuildAttempts, 0, 'The Stage 203 deferred TT-first path should stay inactive inside the exact bucket.');

console.log('stage203 tt-first deferred move-list build smoke passed');
