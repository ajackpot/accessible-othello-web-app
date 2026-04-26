import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import {
  createPreparedSearchMoveBuffer,
  getPreparedSearchMoveBit,
  getPreparedSearchMoveFlips,
  hasPreparedSearchMoveTokenCompressedFlips,
  PREPARED_SEARCH_MOVE_CORE_VARIANTS,
  PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS,
  readPreparedSearchMoveFlipCount,
  listPreparedSearchMoves,
  listPreparedSearchMovesIntoBuffer,
} from '../core/rules.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function normalizePreparedMoves(moves) {
  return moves.map((move) => ({
    index: move.index,
    bit: getPreparedSearchMoveBit(move).toString(),
    flips: getPreparedSearchMoveFlips(move).toString(),
    flipCount: readPreparedSearchMoveFlipCount(move),
  }));
}

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.tokenizedPreparedSearchMoveCore, true);
assert.equal(defaultEngine.options.compactPreparedSearchMoveFlips, false);

for (const [empties, seed] of [[26, 11], [22, 19], [18, 29]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const { player, opponent } = state.getPlayerBoards();
  const legacyMoves = listPreparedSearchMoves(player, opponent, {
    eager: true,
    coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.LEGACY,
    flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.BIGINT,
  });
  const tokenizedMoves = listPreparedSearchMoves(player, opponent, {
    eager: true,
    coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
    flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN,
  });

  assert.deepEqual(
    normalizePreparedMoves(tokenizedMoves),
    normalizePreparedMoves(legacyMoves),
    `Tokenized prepared move core should preserve eager record parity at empties=${empties}, seed=${seed}.`,
  );

  for (const move of tokenizedMoves) {
    assert.equal(Object.hasOwn(move, 'bit'), false);
    assert.equal(Object.hasOwn(move, 'flipCount'), false);
    assert.equal(Number.isInteger(move.token), true);
    assert.equal(move.flips, null);
    assert.equal(hasPreparedSearchMoveTokenCompressedFlips(move.token), true);
  }
}

const bufferState = playSeededRandomUntilEmptyCount(24, 47);
const bufferBoards = bufferState.getPlayerBoards();
const sharedBuffer = createPreparedSearchMoveBuffer();
const tokenizedBufferView = listPreparedSearchMovesIntoBuffer(
  bufferBoards.player,
  bufferBoards.opponent,
  sharedBuffer,
  {
    eager: false,
    coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
    flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN,
  },
);
assert.ok(tokenizedBufferView.every((move) => Number.isInteger(move.token)));
assert.ok(tokenizedBufferView.every((move) => Object.hasOwn(move, 'bit') === false));

const legacyBufferView = listPreparedSearchMovesIntoBuffer(
  bufferBoards.player,
  bufferBoards.opponent,
  sharedBuffer,
  {
    eager: false,
    coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.LEGACY,
    flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.BIGINT,
  },
);
assert.ok(legacyBufferView.every((move) => typeof move.bit === 'bigint'));
assert.ok(legacyBufferView.every((move) => Object.hasOwn(move, 'token') === false));
assert.deepEqual(
  normalizePreparedMoves(legacyBufferView),
  normalizePreparedMoves(tokenizedBufferView),
  'Switching prepared move buffer core variant should preserve move enumeration parity.',
);

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 7,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 4000,
  randomness: 0,
  optimizedFewEmptiesWldSolver: false,
  optimizedFewEmptiesWldSolverEmpties: 8,
  lightweightFewEmptiesWldMovePath: false,
  maxTableEntries: 320000,
  allocationLightSearchMoves: true,
  reusablePreparedSearchMoveBuffers: true,
  lazyPreparedSearchMoves: true,
});

for (const [empties, seed] of [[24, 11], [20, 29], [14, 23], [10, 7]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const baselineResult = new SearchEngine({
    ...sharedOptions,
    tokenizedPreparedSearchMoveCore: false,
  }).findBestMove(state);
  const candidateResult = new SearchEngine({
    ...sharedOptions,
    tokenizedPreparedSearchMoveCore: true,
  }).findBestMove(state);

  assert.equal(candidateResult.bestMoveCoord, baselineResult.bestMoveCoord, `Best move should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.score, baselineResult.score, `Score should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.searchMode, baselineResult.searchMode, `Search mode should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.searchCompletion, baselineResult.searchCompletion, `Search completion should match at empties=${empties}, seed=${seed}.`);
  assert.equal(Number(candidateResult.stats?.nodes ?? -1), Number(baselineResult.stats?.nodes ?? -1), `Node count should match at empties=${empties}, seed=${seed}.`);
}

console.log('stage196 tokenized prepared search move core smoke passed');
