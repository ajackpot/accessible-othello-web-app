import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.optimizedFewEmptiesWldSolver, true);
assert.equal(defaultEngine.options.optimizedFewEmptiesWldSolverEmpties, 8);
assert.equal(defaultEngine.options.lightweightFewEmptiesWldMovePath, true);

const directFourRegression = playSeededRandomUntilEmptyCount(4, 2);
assert.equal(directFourRegression.getEmptyCount(), 4, 'The Stage 199 direct WLD regression should reach four empties.');

const directEightRegression = playSeededRandomUntilEmptyCount(8, 37);
assert.equal(directEightRegression.getEmptyCount(), 8, 'The Stage 199 direct WLD regression should reach eight empties.');

const directBaselineOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  exactFastestFirstOrdering: true,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
};

const directCandidateOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 1000,
  randomness: 0,
  exactFastestFirstOrdering: true,
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
};

const directFourBaselineEngine = new SearchEngine(directBaselineOptions);
const directFourCandidateEngine = new SearchEngine(directCandidateOptions);
const directFourBaselineScore = directFourBaselineEngine.solveSmallWld(directFourRegression);
const directFourCandidateScore = directFourCandidateEngine.solveSmallWld(directFourRegression);
assert.equal(directFourCandidateScore, directFourBaselineScore, 'The Stage 199 WLD tail bundle should preserve the direct four-empty WLD score.');
assert.ok(
  directFourCandidateEngine.stats.specializedFewEmptiesWld4Calls > 0,
  'The Stage 199 direct four-empty WLD regression should dispatch through the specialized WLD tail path.',
);

const directEightBaselineEngine = new SearchEngine(directBaselineOptions);
const directEightCandidateEngine = new SearchEngine(directCandidateOptions);
const directEightBaselineScore = directEightBaselineEngine.solveSmallWld(directEightRegression);
const directEightCandidateScore = directEightCandidateEngine.solveSmallWld(directEightRegression);
assert.equal(directEightCandidateScore, directEightBaselineScore, 'The Stage 199 WLD tail bundle should preserve the direct eight-empty WLD score.');
assert.ok(
  directEightCandidateEngine.stats.lightweightFewEmptiesWld8Calls > 0,
  'The Stage 199 direct eight-empty WLD regression should dispatch through the lightweight WLD tail path.',
);

const wldRegression = playSeededRandomUntilEmptyCount(12, 50);
assert.equal(wldRegression.getEmptyCount(), 12, 'The Stage 199 WLD root regression should reach twelve empties.');

const wldBaseline = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 3000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 220000,
  wldPreExactEmpties: 2,
  exactFastestFirstOrdering: true,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
}).findBestMove(wldRegression);

const wldCandidate = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 3000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 220000,
  wldPreExactEmpties: 2,
  exactFastestFirstOrdering: true,
  optimizedFewEmptiesWldSolver: true,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: true,
}).findBestMove(wldRegression);

assert.equal(wldCandidate.searchMode, 'wld-endgame', 'The Stage 199 WLD tail bundle should stay inside the WLD bucket.');
assert.equal(wldCandidate.bestMoveCoord, wldBaseline.bestMoveCoord, 'The Stage 199 WLD tail bundle should preserve the WLD root best move.');
assert.equal(wldCandidate.score, wldBaseline.score, 'The Stage 199 WLD tail bundle should preserve the WLD root score.');
assert.ok(
  (
    wldCandidate.stats.optimizedFewEmptiesWld5Calls
    + wldCandidate.stats.optimizedFewEmptiesWld6Calls
    + wldCandidate.stats.optimizedFewEmptiesWld7Calls
    + wldCandidate.stats.optimizedFewEmptiesWld8Calls
  ) > 0,
  'The Stage 199 WLD root regression should reach the optimized WLD tail window.',
);
assert.ok(
  (
    wldCandidate.stats.lightweightFewEmptiesWld5Calls
    + wldCandidate.stats.lightweightFewEmptiesWld6Calls
    + wldCandidate.stats.lightweightFewEmptiesWld7Calls
    + wldCandidate.stats.lightweightFewEmptiesWld8Calls
  ) > 0,
  'The Stage 199 WLD root regression should visit the lightweight WLD tail path somewhere inside the five-to-eight empties window.',
);

console.log('stage199 few-empties WLD tail bundle smoke passed');
