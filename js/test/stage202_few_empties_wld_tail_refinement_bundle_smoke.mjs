import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function makeWldEngine(
  specializedFewEmptiesWldLastFlipPath,
  fewEmptiesWldFastestFirstSelectiveGate,
  {
    exactEndgameEmpties = 10,
    timeLimitMs = 3000,
    maxDepth = 8,
    maxTableEntries = 220000,
    wldPreExactEmpties = 2,
  } = {},
) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth,
    exactEndgameEmpties,
    aspirationWindow: 0,
    timeLimitMs,
    randomness: 0,
    maxTableEntries,
    wldPreExactEmpties,
    optimizedFewEmptiesWldSolver: true,
    optimizedFewEmptiesWldSolverEmpties: 8,
    lightweightFewEmptiesWldMovePath: true,
    specializedFewEmptiesWldLastFlipPath,
    exactFastestFirstOrdering: true,
    fewEmptiesWldFastestFirstSelectiveGate,
  });
}

function makeExactControlEngine(
  specializedFewEmptiesWldLastFlipPath,
  fewEmptiesWldFastestFirstSelectiveGate,
) {
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
    lightweightFewEmptiesExactMovePath: true,
    exactFastestFirstOrdering: true,
    optimizedFewEmptiesWldSolver: true,
    optimizedFewEmptiesWldSolverEmpties: 8,
    lightweightFewEmptiesWldMovePath: true,
    specializedFewEmptiesWldLastFlipPath,
    fewEmptiesWldFastestFirstSelectiveGate,
  });
}

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.specializedFewEmptiesWldLastFlipPath, true, 'The Stage 202 WLD last-flip path should now be enabled by default after benchmark adoption.');
assert.equal(defaultEngine.options.fewEmptiesWldFastestFirstSelectiveGate, true, 'The Stage 202 WLD fastest-first selective gate should now be enabled by default after benchmark adoption.');

const directOneLegal = playSeededRandomUntilEmptyCount(1, 5);
assert.equal(directOneLegal.getEmptyCount(), 1, 'The Stage 202 direct legal one-empty WLD regression should reach one empty.');
assert.ok(directOneLegal.getSearchMoves().length > 0, 'The Stage 202 direct legal one-empty WLD regression should keep at least one legal move.');

const directOneLegalBaselineEngine = makeWldEngine(false, false, { exactEndgameEmpties: 8, timeLimitMs: 1000, maxDepth: 8, wldPreExactEmpties: 0, maxTableEntries: 160000 });
const directOneLegalCandidateEngine = makeWldEngine(true, true, { exactEndgameEmpties: 8, timeLimitMs: 1000, maxDepth: 8, wldPreExactEmpties: 0, maxTableEntries: 160000 });
const directOneLegalBaselineScore = directOneLegalBaselineEngine.solveSmallWld(directOneLegal);
const directOneLegalCandidateScore = directOneLegalCandidateEngine.solveSmallWld(directOneLegal);
assert.equal(directOneLegalCandidateScore, directOneLegalBaselineScore, 'The Stage 202 WLD tail refinement bundle should preserve the direct legal one-empty WLD score.');
assert.ok(directOneLegalCandidateEngine.stats.specializedFewEmptiesWldLastFlipCalls > 0, 'The Stage 202 direct legal one-empty WLD regression should dispatch through the WLD last-flip path.');

const directOnePass = playSeededRandomUntilEmptyCount(1, 2);
assert.equal(directOnePass.getEmptyCount(), 1, 'The Stage 202 direct pass one-empty WLD regression should reach one empty.');
assert.equal(directOnePass.getSearchMoves().length, 0, 'The Stage 202 direct pass one-empty WLD regression should start with a pass.');

const directOnePassBaselineEngine = makeWldEngine(false, false, { exactEndgameEmpties: 8, timeLimitMs: 1000, maxDepth: 8, wldPreExactEmpties: 0, maxTableEntries: 160000 });
const directOnePassCandidateEngine = makeWldEngine(true, true, { exactEndgameEmpties: 8, timeLimitMs: 1000, maxDepth: 8, wldPreExactEmpties: 0, maxTableEntries: 160000 });
const directOnePassBaselineScore = directOnePassBaselineEngine.solveSmallWld(directOnePass);
const directOnePassCandidateScore = directOnePassCandidateEngine.solveSmallWld(directOnePass);
assert.equal(directOnePassCandidateScore, directOnePassBaselineScore, 'The Stage 202 WLD tail refinement bundle should preserve the direct pass one-empty WLD score.');
assert.ok(directOnePassCandidateEngine.stats.specializedFewEmptiesWldLastFlipCalls > 0, 'The Stage 202 direct pass one-empty WLD regression should still visit the WLD last-flip path after the pass.');

const directEightRegression = playSeededRandomUntilEmptyCount(8, 37);
assert.equal(directEightRegression.getEmptyCount(), 8, 'The Stage 202 direct eight-empty WLD regression should reach eight empties.');

const directEightBaselineEngine = makeWldEngine(false, false, { exactEndgameEmpties: 8, timeLimitMs: 1000, maxDepth: 8, wldPreExactEmpties: 0, maxTableEntries: 160000 });
const directEightCandidateEngine = makeWldEngine(true, true, { exactEndgameEmpties: 8, timeLimitMs: 1000, maxDepth: 8, wldPreExactEmpties: 0, maxTableEntries: 160000 });
const directEightBaselineScore = directEightBaselineEngine.solveSmallWld(directEightRegression);
const directEightCandidateScore = directEightCandidateEngine.solveSmallWld(directEightRegression);
assert.equal(directEightCandidateScore, directEightBaselineScore, 'The Stage 202 WLD tail refinement bundle should preserve the direct eight-empty WLD score.');
assert.ok(directEightCandidateEngine.stats.optimizedFewEmptiesWldFastestFirstSelectiveSkips > 0, 'The Stage 202 direct eight-empty WLD regression should skip some low-branching WLD fastest-first nodes on the lightweight path.');
assert.ok(directEightCandidateEngine.stats.optimizedFewEmptiesWldFastestFirstSorts > 0, 'The Stage 202 direct eight-empty WLD regression should still keep WLD fastest-first active for larger branches.');

const wldBoundaryRegression = playSeededRandomUntilEmptyCount(12, 50);
assert.equal(wldBoundaryRegression.getEmptyCount(), 12, 'The Stage 202 WLD boundary regression should reach twelve empties.');

const wldBoundaryBaseline = makeWldEngine(false, false).findBestMove(wldBoundaryRegression);
const wldBoundaryCandidate = makeWldEngine(true, true).findBestMove(wldBoundaryRegression);
assert.equal(wldBoundaryCandidate.searchMode, 'wld-endgame', 'The Stage 202 WLD tail refinement bundle should stay inside the WLD bucket on the boundary regression.');
assert.equal(wldBoundaryCandidate.bestMoveCoord, wldBoundaryBaseline.bestMoveCoord, 'The Stage 202 WLD tail refinement bundle should preserve WLD best move parity on the boundary regression.');
assert.equal(wldBoundaryCandidate.score, wldBoundaryBaseline.score, 'The Stage 202 WLD tail refinement bundle should preserve WLD score parity on the boundary regression.');
assert.ok(wldBoundaryCandidate.stats.specializedFewEmptiesWldLastFlipCalls > 0, 'The Stage 202 WLD boundary regression should visit the WLD last-flip path inside the WLD tree.');
assert.ok(wldBoundaryCandidate.stats.optimizedFewEmptiesWldFastestFirstSelectiveSkips > 0, 'The Stage 202 WLD boundary regression should skip some low-branching WLD fastest-first nodes inside the WLD tree.');

const exactControlRegression = playSeededRandomUntilEmptyCount(12, 19);
assert.equal(exactControlRegression.getEmptyCount(), 12, 'The Stage 202 exact control regression should reach twelve empties.');

const exactControlBaseline = makeExactControlEngine(false, false).findBestMove(exactControlRegression);
const exactControlCandidate = makeExactControlEngine(true, true).findBestMove(exactControlRegression);
assert.equal(exactControlCandidate.searchMode, 'exact-endgame', 'The Stage 202 WLD tail refinement bundle should not change the exact bucket selection.');
assert.equal(exactControlCandidate.bestMoveCoord, exactControlBaseline.bestMoveCoord, 'The Stage 202 WLD tail refinement bundle should not change exact root move choice.');
assert.equal(exactControlCandidate.score, exactControlBaseline.score, 'The Stage 202 WLD tail refinement bundle should not change exact root score.');
assert.equal(exactControlCandidate.stats.specializedFewEmptiesWldLastFlipCalls, 0, 'The Stage 202 WLD last-flip path should not run inside the exact bucket.');
assert.equal(exactControlCandidate.stats.optimizedFewEmptiesWldFastestFirstSelectiveSkips, 0, 'The Stage 202 WLD fastest-first selective gate should not run inside the exact bucket.');

console.log('stage202 few-empties WLD tail refinement bundle smoke passed');
