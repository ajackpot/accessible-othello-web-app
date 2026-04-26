import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function makeDirectEngine(specializedFewEmptiesLastFlipPath) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 8,
    timeLimitMs: 1000,
    randomness: 0,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    specializedFewEmptiesLastFlipPath,
    lightweightFewEmptiesExactMovePath: true,
    exactFastestFirstOrdering: true,
  });
}

function makeExact10Engine(specializedFewEmptiesLastFlipPath) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 4,
    exactEndgameEmpties: 10,
    aspirationWindow: 0,
    timeLimitMs: 10000,
    randomness: 0,
    maxTableEntries: 220000,
    wldPreExactEmpties: 0,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    specializedFewEmptiesLastFlipPath,
    lightweightFewEmptiesExactMovePath: true,
    exactFastestFirstOrdering: true,
  });
}

function makeWld12Engine(specializedFewEmptiesLastFlipPath) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: 8,
    exactEndgameEmpties: 10,
    aspirationWindow: 0,
    timeLimitMs: 3000,
    randomness: 0,
    maxTableEntries: 220000,
    wldPreExactEmpties: 2,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    specializedFewEmptiesLastFlipPath,
    lightweightFewEmptiesExactMovePath: true,
    exactFastestFirstOrdering: true,
  });
}

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.specializedFewEmptiesLastFlipPath, true, 'The Stage 200 last-flip path should now be enabled by default after benchmark adoption.');

const directOneLegal = playSeededRandomUntilEmptyCount(1, 5);
assert.equal(directOneLegal.getEmptyCount(), 1, 'The Stage 200 direct legal one-empty regression should reach one empty.');
assert.ok(directOneLegal.getSearchMoves().length > 0, 'The Stage 200 direct legal one-empty regression should keep at least one legal move.');

const directOneLegalBaselineEngine = makeDirectEngine(false);
const directOneLegalCandidateEngine = makeDirectEngine(true);
const directOneLegalBaselineScore = directOneLegalBaselineEngine.solveSmallExact(directOneLegal);
const directOneLegalCandidateScore = directOneLegalCandidateEngine.solveSmallExact(directOneLegal);
assert.equal(directOneLegalCandidateScore, directOneLegalBaselineScore, 'The Stage 200 last-flip path should preserve the direct legal one-empty exact score.');
assert.equal(directOneLegalCandidateEngine.stats.smallSolverNodes, directOneLegalBaselineEngine.stats.smallSolverNodes, 'The Stage 200 last-flip path should preserve direct legal one-empty small-solver node parity.');
assert.ok(directOneLegalCandidateEngine.stats.specializedFewEmptiesLastFlipCalls > 0, 'The Stage 200 direct legal one-empty regression should dispatch through the last-flip path.');

const directOnePass = playSeededRandomUntilEmptyCount(1, 2);
assert.equal(directOnePass.getEmptyCount(), 1, 'The Stage 200 direct pass one-empty regression should reach one empty.');
assert.equal(directOnePass.getSearchMoves().length, 0, 'The Stage 200 direct pass one-empty regression should start with a pass.');

const directOnePassBaselineEngine = makeDirectEngine(false);
const directOnePassCandidateEngine = makeDirectEngine(true);
const directOnePassBaselineScore = directOnePassBaselineEngine.solveSmallExact(directOnePass);
const directOnePassCandidateScore = directOnePassCandidateEngine.solveSmallExact(directOnePass);
assert.equal(directOnePassCandidateScore, directOnePassBaselineScore, 'The Stage 200 last-flip path should preserve the direct pass one-empty exact score.');
assert.ok(directOnePassCandidateEngine.stats.smallSolverNodes <= directOnePassBaselineEngine.stats.smallSolverNodes, 'The Stage 200 last-flip path should not increase direct pass one-empty small-solver work.');
assert.ok(directOnePassCandidateEngine.stats.specializedFewEmptiesLastFlipCalls > 0, 'The Stage 200 direct pass one-empty regression should still visit the last-flip path after the pass.');

const directFourRegression = playSeededRandomUntilEmptyCount(4, 2);
assert.equal(directFourRegression.getEmptyCount(), 4, 'The Stage 200 direct four-empty regression should reach four empties.');

const directFourBaselineEngine = makeDirectEngine(false);
const directFourCandidateEngine = makeDirectEngine(true);
const directFourBaselineScore = directFourBaselineEngine.solveSmallExact(directFourRegression);
const directFourCandidateScore = directFourCandidateEngine.solveSmallExact(directFourRegression);
assert.equal(directFourCandidateScore, directFourBaselineScore, 'The Stage 200 last-flip path should preserve the direct four-empty exact score.');
assert.ok(directFourCandidateEngine.stats.smallSolverNodes <= directFourBaselineEngine.stats.smallSolverNodes, 'The Stage 200 last-flip path should not increase direct four-empty small-solver work.');
assert.ok(directFourCandidateEngine.stats.specializedFewEmptiesLastFlipCalls > 0, 'The Stage 200 direct four-empty regression should eventually bottom out through the last-flip path.');

const exactBoundaryRegression = playSeededRandomUntilEmptyCount(10, 19);
assert.equal(exactBoundaryRegression.getEmptyCount(), 10, 'The Stage 200 exact boundary regression should reach ten empties.');

const exactBoundaryBaseline = makeExact10Engine(false).findBestMove(exactBoundaryRegression);
const exactBoundaryCandidate = makeExact10Engine(true).findBestMove(exactBoundaryRegression);
assert.equal(exactBoundaryCandidate.searchMode, 'exact-endgame', 'The Stage 200 last-flip path should stay inside the exact bucket.');
assert.equal(exactBoundaryCandidate.bestMoveCoord, exactBoundaryBaseline.bestMoveCoord, 'The Stage 200 last-flip path should preserve the exact best move on the boundary regression.');
assert.equal(exactBoundaryCandidate.score, exactBoundaryBaseline.score, 'The Stage 200 last-flip path should preserve the exact score on the boundary regression.');
assert.equal(exactBoundaryCandidate.stats.nodes, exactBoundaryBaseline.stats.nodes, 'The Stage 200 last-flip path should preserve exact boundary node parity.');
assert.ok(exactBoundaryCandidate.stats.specializedFewEmptiesLastFlipCalls > 0, 'The Stage 200 exact boundary regression should visit the last-flip path inside the exact tree.');

const wldRegression = playSeededRandomUntilEmptyCount(12, 50);
assert.equal(wldRegression.getEmptyCount(), 12, 'The Stage 200 WLD regression should reach twelve empties.');

const wldBaseline = makeWld12Engine(false).findBestMove(wldRegression);
const wldCandidate = makeWld12Engine(true).findBestMove(wldRegression);
assert.equal(wldCandidate.searchMode, wldBaseline.searchMode, 'The Stage 200 last-flip path should not change the WLD bucket selection.');
assert.equal(wldCandidate.bestMoveCoord, wldBaseline.bestMoveCoord, 'The Stage 200 last-flip path should not change WLD root move choice.');
assert.equal(wldCandidate.score, wldBaseline.score, 'The Stage 200 last-flip path should not change WLD root score.');
assert.equal(wldCandidate.stats.nodes, wldBaseline.stats.nodes, 'The Stage 200 last-flip path should preserve WLD root node parity.');
assert.equal(wldCandidate.stats.specializedFewEmptiesLastFlipCalls, 0, 'The Stage 200 last-flip path should not run inside the WLD bucket.');

console.log('stage200 specialized few-empties last-flip path smoke passed');
