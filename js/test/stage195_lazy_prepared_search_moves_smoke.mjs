import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import {
  createPreparedSearchMoveBuffer,
  getPreparedSearchMoveBit,
  getPreparedSearchMoveFlips,
  hasPreparedSearchMoveTokenCompressedFlips,
  readPreparedSearchMoveFlipCount,
  listPreparedSearchMoves,
  listPreparedSearchMovesIntoBuffer,
  materializePreparedSearchMove,
  materializePreparedSearchMoveFlipCount,
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

function cloneMove(move) {
  return { ...move };
}

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.allocationLightSearchMoves, true);
assert.equal(defaultEngine.options.reusablePreparedSearchMoveBuffers, true);
assert.equal(defaultEngine.options.lazyPreparedSearchMoves, true);
assert.equal(defaultEngine.options.compactPreparedSearchMoveFlips, false);

for (const [empties, seed] of [[26, 11], [22, 19], [18, 29]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const { player, opponent } = state.getPlayerBoards();
  const eagerMoves = listPreparedSearchMoves(player, opponent, { eager: true });
  const lazyMoves = listPreparedSearchMoves(player, opponent, { eager: false });

  assert.deepEqual(
    lazyMoves.map((move) => ({ index: move.index, bit: getPreparedSearchMoveBit(move).toString() })),
    eagerMoves.map((move) => ({ index: move.index, bit: getPreparedSearchMoveBit(move).toString() })),
    `Lazy prepared builder should preserve legal move enumeration at empties=${empties}, seed=${seed}.`,
  );

  const materializedLazyMoves = lazyMoves.map((move) => {
    const cloned = cloneMove(move);
    materializePreparedSearchMoveFlipCount(cloned, player, opponent);
    materializePreparedSearchMove(cloned, player, opponent);
    return cloned;
  });

  assert.deepEqual(
    normalizePreparedMoves(materializedLazyMoves),
    normalizePreparedMoves(eagerMoves),
    `Lazy materialization should match eager prepared records at empties=${empties}, seed=${seed}.`,
  );
}

const bufferState = playSeededRandomUntilEmptyCount(24, 11);
const bufferBoards = bufferState.getPlayerBoards();
const buffer = createPreparedSearchMoveBuffer();
const firstBufferView = listPreparedSearchMovesIntoBuffer(bufferBoards.player, bufferBoards.opponent, buffer, { eager: false });
const firstRecordRefs = firstBufferView.map((move) => move);
const secondBufferView = listPreparedSearchMovesIntoBuffer(bufferBoards.player, bufferBoards.opponent, buffer, { eager: false });
assert.equal(firstBufferView, buffer);
assert.equal(secondBufferView, buffer);
assert.equal(firstRecordRefs.length, secondBufferView.length);
for (let index = 0; index < secondBufferView.length; index += 1) {
  assert.equal(secondBufferView[index], firstRecordRefs[index], `Prepared move buffer should reuse slot ${index}.`);
}

const lazyLaneEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  allocationLightSearchMoves: true,
  reusablePreparedSearchMoveBuffers: true,
  lazyPreparedSearchMoves: true,
  compactPreparedSearchMoveFlips: true,
});
const deepState = playSeededRandomUntilEmptyCount(24, 47);
const eagerLaneMoves = lazyLaneEngine.listSearchMoves(deepState, { ply: 1 });
assert.ok(eagerLaneMoves.every((move) => move.flips === null));
assert.ok(eagerLaneMoves.every((move) => Number.isInteger(readPreparedSearchMoveFlipCount(move))));
assert.ok(eagerLaneMoves.every((move) => hasPreparedSearchMoveTokenCompressedFlips(move.token) === true));
const lazyLaneMoves = lazyLaneEngine.listSearchMoves(deepState, { ply: 3 });
assert.ok(lazyLaneMoves.every((move) => move.flips === null));
assert.ok(lazyLaneMoves.every((move) => readPreparedSearchMoveFlipCount(move) === null));

const deepBoards = deepState.getPlayerBoards();
const lazyApplied = lazyLaneEngine.applyPreparedMoveFast(deepState, lazyLaneMoves[0], deepBoards.player, deepBoards.opponent);
const eagerApplied = deepState.applyMoveFast(eagerLaneMoves[0].index, eagerLaneMoves[0].token);
assert.ok(lazyApplied);
assert.ok(eagerApplied);
assert.equal(lazyApplied.black, eagerApplied.black);
assert.equal(lazyApplied.white, eagerApplied.white);
assert.equal(lazyApplied.currentPlayer, eagerApplied.currentPlayer);

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
});

for (const [empties, seed] of [[24, 11], [20, 29], [14, 23], [10, 7]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const baselineResult = new SearchEngine({
    ...sharedOptions,
    lazyPreparedSearchMoves: false,
  }).findBestMove(state);
  const candidateResult = new SearchEngine({
    ...sharedOptions,
    lazyPreparedSearchMoves: true,
  }).findBestMove(state);

  assert.equal(candidateResult.bestMoveCoord, baselineResult.bestMoveCoord, `Best move should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.score, baselineResult.score, `Score should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.searchMode, baselineResult.searchMode, `Search mode should match at empties=${empties}, seed=${seed}.`);
  assert.equal(candidateResult.searchCompletion, baselineResult.searchCompletion, `Search completion should match at empties=${empties}, seed=${seed}.`);
  assert.equal(Number(candidateResult.stats?.nodes ?? -1), Number(baselineResult.stats?.nodes ?? -1), `Node count should match at empties=${empties}, seed=${seed}.`);
}

console.log('stage195 lazy prepared search moves smoke passed');
