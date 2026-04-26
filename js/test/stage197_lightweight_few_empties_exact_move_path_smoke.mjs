import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.lightweightFewEmptiesExactMovePath, true);
assert.equal(defaultEngine.options.optimizedFewEmptiesExactSolverEmpties, 8);

const directEightRegression = playSeededRandomUntilEmptyCount(8, 37);
assert.equal(directEightRegression.getEmptyCount(), 8, 'The Stage 197 direct exact regression should reach eight empties.');

const directBaselineEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  exactFastestFirstOrdering: true,
  lightweightFewEmptiesExactMovePath: false,
});
const directCandidateEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  exactFastestFirstOrdering: true,
  lightweightFewEmptiesExactMovePath: true,
});

const directBaselineScore = directBaselineEngine.solveSmallExact(directEightRegression);
const directCandidateScore = directCandidateEngine.solveSmallExact(directEightRegression);
assert.equal(directCandidateScore, directBaselineScore, 'The Stage 197 lightweight few-empties path should preserve the direct eight-empty exact score.');
assert.equal(directCandidateEngine.stats.smallSolverNodes, directBaselineEngine.stats.smallSolverNodes, 'The Stage 197 lightweight few-empties path should preserve eight-empty small-solver node parity on the direct regression.');
assert.ok(directCandidateEngine.stats.lightweightFewEmpties8Calls > 0, 'The Stage 197 direct eight-empty regression should dispatch through the lightweight exact-tail path.');

const exactBoundaryRegression = playSeededRandomUntilEmptyCount(10, 19);
assert.equal(exactBoundaryRegression.getEmptyCount(), 10, 'The Stage 197 exact boundary regression should reach ten empties.');

const exactBoundaryBaseline = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 10000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  maxTableEntries: 220000,
  wldPreExactEmpties: 0,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: false,
}).findBestMove(exactBoundaryRegression);

const exactBoundaryCandidate = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 10000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  maxTableEntries: 220000,
  wldPreExactEmpties: 0,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: true,
}).findBestMove(exactBoundaryRegression);

assert.equal(exactBoundaryCandidate.searchMode, 'exact-endgame', 'The Stage 197 lightweight few-empties path should stay inside the exact bucket.');
assert.equal(exactBoundaryCandidate.bestMoveCoord, exactBoundaryBaseline.bestMoveCoord, 'The Stage 197 lightweight few-empties path should preserve the exact best move on the boundary regression.');
assert.equal(exactBoundaryCandidate.score, exactBoundaryBaseline.score, 'The Stage 197 lightweight few-empties path should preserve the exact score on the boundary regression.');
assert.equal(exactBoundaryCandidate.stats.nodes, exactBoundaryBaseline.stats.nodes, 'The Stage 197 lightweight few-empties path should preserve exact boundary node parity.');
assert.ok(
  (
    exactBoundaryCandidate.stats.lightweightFewEmpties5Calls
    + exactBoundaryCandidate.stats.lightweightFewEmpties6Calls
    + exactBoundaryCandidate.stats.lightweightFewEmpties7Calls
    + exactBoundaryCandidate.stats.lightweightFewEmpties8Calls
  ) > 0,
  'The Stage 197 exact boundary regression should visit the lightweight exact-tail path somewhere inside the five-to-eight empties window.',
);

const wldRegression = playSeededRandomUntilEmptyCount(12, 50);
assert.equal(wldRegression.getEmptyCount(), 12, 'The Stage 197 WLD regression should reach twelve empties.');

const wldBaseline = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 3000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  maxTableEntries: 220000,
  wldPreExactEmpties: 2,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: false,
}).findBestMove(wldRegression);

const wldCandidate = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 3000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  maxTableEntries: 220000,
  wldPreExactEmpties: 2,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  lightweightFewEmptiesExactMovePath: true,
}).findBestMove(wldRegression);

assert.equal(wldCandidate.bestMoveCoord, wldBaseline.bestMoveCoord, 'The Stage 197 lightweight few-empties path should not change WLD root move choice.');
assert.equal(wldCandidate.score, wldBaseline.score, 'The Stage 197 lightweight few-empties path should not change WLD root score.');
assert.equal(
  wldCandidate.stats.lightweightFewEmpties5Calls
    + wldCandidate.stats.lightweightFewEmpties6Calls
    + wldCandidate.stats.lightweightFewEmpties7Calls
    + wldCandidate.stats.lightweightFewEmpties8Calls,
  0,
  'The Stage 197 lightweight few-empties path should not run inside the WLD bucket.',
);

console.log('stage197 lightweight few-empties exact move path smoke passed');
