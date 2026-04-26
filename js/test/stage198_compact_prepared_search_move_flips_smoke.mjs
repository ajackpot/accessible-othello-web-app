import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import {
  getPreparedSearchMoveBit,
  getPreparedSearchMoveFlips,
  hasPreparedSearchMoveTokenCompressedFlips,
  listPreparedSearchMoves,
  materializePreparedSearchMove,
  PREPARED_SEARCH_MOVE_CORE_VARIANTS,
  PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS,
  readPreparedSearchMoveFlipCount,
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
assert.equal(defaultEngine.options.compactPreparedSearchMoveFlips, false);
assert.equal(defaultEngine.options.tokenizedPreparedSearchMoveCore, true);

for (const [empties, seed] of [[26, 11], [22, 19], [18, 29]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const { player, opponent } = state.getPlayerBoards();
  const baselineMoves = listPreparedSearchMoves(player, opponent, {
    eager: true,
    coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
    flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.BIGINT,
  });
  const candidateMoves = listPreparedSearchMoves(player, opponent, {
    eager: true,
    coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
    flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN,
  });

  assert.deepEqual(
    normalizePreparedMoves(candidateMoves),
    normalizePreparedMoves(baselineMoves),
    `Compact prepared flip tokens should preserve eager move parity at empties=${empties}, seed=${seed}.`,
  );

  for (const move of candidateMoves) {
    assert.equal(move.flips, null);
    assert.equal(hasPreparedSearchMoveTokenCompressedFlips(move.token), true);
  }

  const baselineChild = state.applyMoveFast(baselineMoves[0].index, baselineMoves[0].flips ?? null);
  const candidateChild = state.applyMoveFast(candidateMoves[0].index, candidateMoves[0].token);
  assert.ok(baselineChild);
  assert.ok(candidateChild);
  assert.equal(candidateChild.black, baselineChild.black);
  assert.equal(candidateChild.white, baselineChild.white);
  assert.equal(candidateChild.currentPlayer, baselineChild.currentPlayer);
}

const lazyRegression = playSeededRandomUntilEmptyCount(24, 47);
const lazyBoards = lazyRegression.getPlayerBoards();
const lazyMove = listPreparedSearchMoves(lazyBoards.player, lazyBoards.opponent, {
  eager: false,
  coreVariant: PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED,
  flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN,
})[0];
assert.equal(lazyMove.flips, null);
assert.equal(readPreparedSearchMoveFlipCount(lazyMove), null);
materializePreparedSearchMove(lazyMove, lazyBoards.player, lazyBoards.opponent, {
  flipStorageVariant: PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN,
});
assert.equal(hasPreparedSearchMoveTokenCompressedFlips(lazyMove.token), true);
assert.equal(getPreparedSearchMoveFlips(lazyMove) !== 0n, true);

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 7,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 4000,
  randomness: 0,
  maxTableEntries: 320000,
  allocationLightSearchMoves: true,
  reusablePreparedSearchMoveBuffers: true,
  lazyPreparedSearchMoves: true,
  tokenizedPreparedSearchMoveCore: true,
});

for (const [empties, seed] of [[24, 11], [20, 29], [14, 23], [10, 7]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const baselineResult = new SearchEngine({
    ...sharedOptions,
    compactPreparedSearchMoveFlips: false,
  }).findBestMove(state);
  const candidateResult = new SearchEngine({
    ...sharedOptions,
    compactPreparedSearchMoveFlips: true,
  }).findBestMove(state);

  assert.equal(candidateResult.bestMoveCoord, baselineResult.bestMoveCoord, `Best move should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.score, baselineResult.score, `Score should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.searchMode, baselineResult.searchMode, `Search mode should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.searchCompletion, baselineResult.searchCompletion, `Search completion should match at empties=${empties}, seed=${seed}.`);
  assert.equal(Number(candidateResult.stats?.nodes ?? -1), Number(baselineResult.stats?.nodes ?? -1), `Node count should match at empties=${empties}, seed=${seed}.`);
}

console.log('stage198 compact prepared search move flips smoke passed');
