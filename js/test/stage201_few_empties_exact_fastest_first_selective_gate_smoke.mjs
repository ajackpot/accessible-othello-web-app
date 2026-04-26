import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function makeExactEngine(fewEmptiesExactFastestFirstSelectiveGate, lightweightFewEmptiesExactMovePath = true) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 6,
    exactEndgameEmpties: 12,
    aspirationWindow: 0,
    timeLimitMs: 12000,
    randomness: 0,
    maxTableEntries: 240000,
    wldPreExactEmpties: 0,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    lightweightFewEmptiesExactMovePath,
    exactFastestFirstOrdering: true,
    fewEmptiesExactFastestFirstSelectiveGate,
  });
}

function makeDirectEngine(fewEmptiesExactFastestFirstSelectiveGate, lightweightFewEmptiesExactMovePath = true) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 8,
    timeLimitMs: 1000,
    randomness: 0,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    lightweightFewEmptiesExactMovePath,
    exactFastestFirstOrdering: true,
    fewEmptiesExactFastestFirstSelectiveGate,
  });
}

const defaultEngine = new SearchEngine();
assert.equal(
  defaultEngine.options.fewEmptiesExactFastestFirstSelectiveGate,
  true,
  'The Stage 201 few-empties exact fastest-first selective gate should now be enabled by default after benchmark adoption.',
);

const directEightRegression = playSeededRandomUntilEmptyCount(8, 13);
assert.equal(directEightRegression.getEmptyCount(), 8, 'The Stage 201 direct exact regression should reach eight empties.');

const directEightBaseline = makeDirectEngine(false, true);
const directEightCandidate = makeDirectEngine(true, true);
const directEightBaselineScore = directEightBaseline.solveSmallExact(directEightRegression);
const directEightCandidateScore = directEightCandidate.solveSmallExact(directEightRegression);
assert.equal(directEightCandidateScore, directEightBaselineScore, 'The Stage 201 selective gate should preserve direct eight-empty exact score parity on the lightweight path.');
assert.ok(directEightCandidate.stats.optimizedFewEmptiesFastestFirstSelectiveSkips > 0, 'The Stage 201 direct exact regression should skip some low-branching fastest-first nodes on the lightweight path.');
assert.ok(directEightCandidate.stats.optimizedFewEmptiesFastestFirstSorts > 0, 'The Stage 201 direct exact regression should still keep fastest-first active for larger few-empties branches.');

const directEightFallbackBaseline = makeDirectEngine(false, false);
const directEightFallbackCandidate = makeDirectEngine(true, false);
const directEightFallbackBaselineScore = directEightFallbackBaseline.solveSmallExact(directEightRegression);
const directEightFallbackCandidateScore = directEightFallbackCandidate.solveSmallExact(directEightRegression);
assert.equal(directEightFallbackCandidateScore, directEightFallbackBaselineScore, 'The Stage 201 selective gate should preserve direct eight-empty exact score parity even when the lightweight path is disabled.');
assert.ok(directEightFallbackCandidate.stats.optimizedFewEmptiesFastestFirstSelectiveSkips > 0, 'The Stage 201 direct exact regression should also skip low-branching fastest-first nodes on the fallback object path.');

const exactBoundaryRegression = playSeededRandomUntilEmptyCount(12, 19);
assert.equal(exactBoundaryRegression.getEmptyCount(), 12, 'The Stage 201 exact boundary regression should reach twelve empties.');

const exactBoundaryBaseline = makeExactEngine(false).findBestMove(exactBoundaryRegression);
const exactBoundaryCandidate = makeExactEngine(true).findBestMove(exactBoundaryRegression);
assert.equal(exactBoundaryCandidate.searchMode, 'exact-endgame', 'The Stage 201 selective gate should stay inside the exact bucket on the boundary regression.');
assert.equal(exactBoundaryCandidate.bestMoveCoord, exactBoundaryBaseline.bestMoveCoord, 'The Stage 201 selective gate should preserve exact best move parity on the boundary regression.');
assert.equal(exactBoundaryCandidate.score, exactBoundaryBaseline.score, 'The Stage 201 selective gate should preserve exact score parity on the boundary regression.');
assert.ok(exactBoundaryCandidate.stats.optimizedFewEmptiesFastestFirstSelectiveSkips > 0, 'The Stage 201 exact boundary regression should skip low-branching few-empties fastest-first nodes inside the exact tree.');
assert.ok(exactBoundaryCandidate.stats.optimizedFewEmptiesFastestFirstSorts > 0, 'The Stage 201 exact boundary regression should still use fastest-first on some larger few-empties branches.');

console.log('stage201 few-empties exact fastest-first selective gate smoke passed');
