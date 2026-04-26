import {
  bitFromIndex,
  bitsToIndices,
  CORNER_BITS,
  DIRECTIONS,
  FULL_BOARD,
  indexFromBit,
  popcount,
  coordToIndex,
} from './bitboard.js';

const NON_VERTICAL_FLIP_MASK = 0x7e7e7e7e7e7e7e7en;
const DIRECTION_DELTAS = Object.freeze([1, -1, 8, -8, 9, -9, 7, -7]);
const DIRECTION_INCREASING = Object.freeze([true, false, true, false, true, false, true, false]);
const DIRECTION_COUNT = 8;
const SQUARE_COUNT = 64;
const DIRECTION_METADATA_SIZE = SQUARE_COUNT * DIRECTION_COUNT;
const BETWEEN_METADATA_SIZE = SQUARE_COUNT * SQUARE_COUNT;
const MAX_DIRECTIONAL_FLIP_COUNT = 6;
const DIRECTIONAL_FLIP_MASK_SLOT_COUNT = MAX_DIRECTIONAL_FLIP_COUNT + 1;
const DIRECTIONAL_FLIP_MASK_METADATA_SIZE = DIRECTION_METADATA_SIZE * DIRECTIONAL_FLIP_MASK_SLOT_COUNT;

export const MOBILITY_KERNEL_VARIANTS = Object.freeze({
  LEGACY: 'legacy',
  PREFIX_BIDIRECTIONAL: 'prefix-bidirectional',
});

export const DEFAULT_MOBILITY_KERNEL_VARIANT = MOBILITY_KERNEL_VARIANTS.PREFIX_BIDIRECTIONAL;

let activeMobilityKernelVariant = DEFAULT_MOBILITY_KERNEL_VARIANT;

export const FLIP_KERNEL_VARIANTS = Object.freeze({
  LEGACY: 'legacy',
  RAY_BETWEEN_PRECHECK: 'ray-between-precheck',
});

export const DEFAULT_FLIP_KERNEL_VARIANT = FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK;

let activeFlipKernelVariant = DEFAULT_FLIP_KERNEL_VARIANT;

export const PLAYER_COLORS = Object.freeze({
  BLACK: 'black',
  WHITE: 'white',
});

const SQUARE_NEIGHBOR_MASKS = new Array(SQUARE_COUNT).fill(0n);
const SQUARE_DIRECTION_NEIGHBOR_BITS = new Array(DIRECTION_METADATA_SIZE).fill(0n);
const SQUARE_DIRECTION_RAY_MASKS = new Array(DIRECTION_METADATA_SIZE).fill(0n);
const BETWEEN_MASKS = new Array(BETWEEN_METADATA_SIZE).fill(0n);
const BETWEEN_COUNTS = new Uint8Array(BETWEEN_METADATA_SIZE);
const SQUARE_DIRECTION_PREFIX_FLIP_MASKS = new Array(DIRECTIONAL_FLIP_MASK_METADATA_SIZE).fill(0n);
const SHARED_FLIP_INFO = { flips: 0n, flipCount: 0 };

export const PREPARED_SEARCH_MOVE_CORE_VARIANTS = Object.freeze({
  LEGACY: 'legacy',
  TOKENIZED: 'tokenized',
});

export const DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT = PREPARED_SEARCH_MOVE_CORE_VARIANTS.TOKENIZED;

const PREPARED_SEARCH_MOVE_UNKNOWN_FLIPCOUNT = 0x3f;
const PREPARED_SEARCH_MOVE_INDEX_MODULUS = 64;
const PREPARED_SEARCH_MOVE_FLIPCOUNT_SHIFT = 6;
const PREPARED_SEARCH_MOVE_FLIPCOUNT_MULTIPLIER = 2 ** PREPARED_SEARCH_MOVE_FLIPCOUNT_SHIFT;
const PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_SHIFT = 12;
const PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_MULTIPLIERS = Object.freeze(
  Array.from({ length: DIRECTION_COUNT }, (_, directionIndex) => 2 ** (PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_SHIFT + (directionIndex * 3))),
);
const PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_MODULUS = 8;

export const PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS = Object.freeze({
  BIGINT: 'bigint',
  COMPACT_TOKEN: 'compact-token',
});

export const DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT = PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.BIGINT;

function normalizePreparedSearchMoveIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < SQUARE_COUNT
    ? index
    : 0;
}

function encodePreparedSearchMoveFlipCount(flipCount) {
  return Number.isInteger(flipCount) && flipCount >= 0 && flipCount < PREPARED_SEARCH_MOVE_UNKNOWN_FLIPCOUNT
    ? flipCount
    : PREPARED_SEARCH_MOVE_UNKNOWN_FLIPCOUNT;
}

export function createPreparedSearchMoveToken(index, flipCount = null) {
  return normalizePreparedSearchMoveIndex(index)
    + (encodePreparedSearchMoveFlipCount(flipCount) * PREPARED_SEARCH_MOVE_FLIPCOUNT_MULTIPLIER);
}

export function getPreparedSearchMoveTokenIndex(token) {
  return Number.isInteger(token)
    ? (Math.trunc(token) % PREPARED_SEARCH_MOVE_INDEX_MODULUS)
    : -1;
}

export function getPreparedSearchMoveTokenFlipCount(token) {
  if (!Number.isInteger(token)) {
    return null;
  }

  const encoded = Math.trunc(token / PREPARED_SEARCH_MOVE_FLIPCOUNT_MULTIPLIER) % PREPARED_SEARCH_MOVE_INDEX_MODULUS;
  return encoded === PREPARED_SEARCH_MOVE_UNKNOWN_FLIPCOUNT ? null : encoded;
}

function withPreparedSearchMoveTokenIndex(token, index) {
  const normalizedToken = Number.isInteger(token) ? token : 0;
  return normalizedToken + (normalizePreparedSearchMoveIndex(index) - getPreparedSearchMoveTokenIndex(normalizedToken));
}

function withPreparedSearchMoveTokenFlipCount(token, flipCount) {
  const normalizedToken = Number.isInteger(token) ? token : 0;
  const encoded = encodePreparedSearchMoveFlipCount(flipCount);
  const current = Math.trunc(normalizedToken / PREPARED_SEARCH_MOVE_FLIPCOUNT_MULTIPLIER) % PREPARED_SEARCH_MOVE_INDEX_MODULUS;
  return normalizedToken + ((encoded - current) * PREPARED_SEARCH_MOVE_FLIPCOUNT_MULTIPLIER);
}

function normalizePreparedSearchMoveDirectionalFlipCount(flipCount) {
  return Number.isInteger(flipCount) && flipCount >= 0 && flipCount <= MAX_DIRECTIONAL_FLIP_COUNT
    ? flipCount
    : 0;
}

export function getPreparedSearchMoveTokenDirectionalFlipCount(token, directionIndex) {
  if (!Number.isInteger(token) || !Number.isInteger(directionIndex) || directionIndex < 0 || directionIndex >= DIRECTION_COUNT) {
    return 0;
  }

  const multiplier = PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_MULTIPLIERS[directionIndex];
  return Math.trunc(token / multiplier) % PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_MODULUS;
}

function withPreparedSearchMoveTokenDirectionalFlipCount(token, directionIndex, flipCount) {
  if (!Number.isInteger(directionIndex) || directionIndex < 0 || directionIndex >= DIRECTION_COUNT) {
    return Number.isInteger(token) ? token : 0;
  }

  const normalizedToken = Number.isInteger(token) ? token : 0;
  const multiplier = PREPARED_SEARCH_MOVE_DIRECTIONAL_FLIPCOUNT_MULTIPLIERS[directionIndex];
  const current = getPreparedSearchMoveTokenDirectionalFlipCount(normalizedToken, directionIndex);
  const encoded = normalizePreparedSearchMoveDirectionalFlipCount(flipCount);
  return normalizedToken + ((encoded - current) * multiplier);
}

export function hasPreparedSearchMoveTokenCompressedFlips(token) {
  if (!Number.isInteger(token)) {
    return false;
  }

  for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
    if (getPreparedSearchMoveTokenDirectionalFlipCount(token, directionIndex) > 0) {
      return true;
    }
  }

  return false;
}

export function isTokenizedPreparedSearchMoveRecord(move) {
  return Number.isInteger(move?.token);
}

export function getPreparedSearchMoveIndex(move) {
  if (!move || typeof move !== 'object') {
    return -1;
  }
  if (Number.isInteger(move.index)) {
    return move.index;
  }
  if (Number.isInteger(move.token)) {
    return getPreparedSearchMoveTokenIndex(move.token);
  }
  if (typeof move.bit === 'bigint' && move.bit !== 0n) {
    return indexFromBit(move.bit);
  }
  return -1;
}

export function getPreparedSearchMoveBit(move) {
  if (!move || typeof move !== 'object') {
    return 0n;
  }
  if (typeof move.bit === 'bigint') {
    return move.bit;
  }

  const moveIndex = getPreparedSearchMoveIndex(move);
  return moveIndex >= 0 ? bitFromIndex(moveIndex) : 0n;
}

export function readPreparedSearchMoveFlipCount(move) {
  if (!move || typeof move !== 'object') {
    return null;
  }
  if (Number.isInteger(move.flipCount)) {
    return move.flipCount;
  }
  if (Number.isInteger(move.token)) {
    return getPreparedSearchMoveTokenFlipCount(move.token);
  }
  return null;
}

function stepStaysOnBoard(index, delta) {
  const row = index >> 3;
  const col = index & 7;

  switch (delta) {
    case 1:
      return col < 7;
    case -1:
      return col > 0;
    case 8:
      return row < 7;
    case -8:
      return row > 0;
    case 9:
      return row < 7 && col < 7;
    case -9:
      return row > 0 && col > 0;
    case 7:
      return row < 7 && col > 0;
    case -7:
      return row > 0 && col < 7;
    default:
      return false;
  }
}

function directionalFlipMaskOffset(moveIndex, directionIndex, flipCount = 0) {
  return (((moveIndex * DIRECTION_COUNT) + directionIndex) * DIRECTIONAL_FLIP_MASK_SLOT_COUNT)
    + normalizePreparedSearchMoveDirectionalFlipCount(flipCount);
}

function buildFlipKernelMetadata() {
  for (let moveIndex = 0; moveIndex < SQUARE_COUNT; moveIndex += 1) {
    let neighborMask = 0n;

    for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
      const offset = (moveIndex * DIRECTION_COUNT) + directionIndex;
      const delta = DIRECTION_DELTAS[directionIndex];
      let cursor = moveIndex;
      let rayMask = 0n;
      let neighborBit = 0n;
      let firstStep = true;
      let prefixFlipMask = 0n;
      let prefixFlipCount = 0;
      SQUARE_DIRECTION_PREFIX_FLIP_MASKS[directionalFlipMaskOffset(moveIndex, directionIndex, 0)] = 0n;

      while (stepStaysOnBoard(cursor, delta)) {
        cursor += delta;
        const bit = 1n << BigInt(cursor);
        if (firstStep) {
          neighborBit = bit;
          neighborMask |= bit;
          firstStep = false;
        }
        rayMask |= bit;
        prefixFlipMask |= bit;
        prefixFlipCount += 1;
        if (prefixFlipCount <= MAX_DIRECTIONAL_FLIP_COUNT) {
          SQUARE_DIRECTION_PREFIX_FLIP_MASKS[directionalFlipMaskOffset(moveIndex, directionIndex, prefixFlipCount)] = prefixFlipMask;
        }
      }

      SQUARE_DIRECTION_NEIGHBOR_BITS[offset] = neighborBit;
      SQUARE_DIRECTION_RAY_MASKS[offset] = rayMask;
    }

    SQUARE_NEIGHBOR_MASKS[moveIndex] = neighborMask;
  }

  for (let startIndex = 0; startIndex < SQUARE_COUNT; startIndex += 1) {
    const startRow = startIndex >> 3;
    const startCol = startIndex & 7;

    for (let endIndex = 0; endIndex < SQUARE_COUNT; endIndex += 1) {
      if (startIndex === endIndex) {
        continue;
      }

      const endRow = endIndex >> 3;
      const endCol = endIndex & 7;
      const rowDelta = Math.sign(endRow - startRow);
      const colDelta = Math.sign(endCol - startCol);
      const rowDistance = Math.abs(endRow - startRow);
      const colDistance = Math.abs(endCol - startCol);
      const aligned = (
        (rowDistance === 0 && colDistance > 0)
        || (colDistance === 0 && rowDistance > 0)
        || (rowDistance === colDistance && rowDistance > 0)
      );
      if (!aligned) {
        continue;
      }

      let row = startRow + rowDelta;
      let col = startCol + colDelta;
      let betweenMask = 0n;
      let betweenCount = 0;

      while (row >= 0 && row < 8 && col >= 0 && col < 8) {
        const cursorIndex = (row * 8) + col;
        if (cursorIndex === endIndex) {
          const betweenOffset = (startIndex * SQUARE_COUNT) + endIndex;
          BETWEEN_MASKS[betweenOffset] = betweenMask;
          BETWEEN_COUNTS[betweenOffset] = betweenCount;
          break;
        }
        betweenMask |= 1n << BigInt(cursorIndex);
        betweenCount += 1;
        row += rowDelta;
        col += colDelta;
      }
    }
  }
}

buildFlipKernelMetadata();

function leastSignificantBitIndex64(bitboard) {
  const low = Number(bitboard & 0xffffffffn) >>> 0;
  if (low !== 0) {
    const isolated = (low & -low) >>> 0;
    return 31 - Math.clz32(isolated);
  }

  const high = Number((bitboard >> 32n) & 0xffffffffn) >>> 0;
  const isolated = (high & -high) >>> 0;
  return 32 + (31 - Math.clz32(isolated));
}

function mostSignificantBitIndex64(bitboard) {
  const high = Number((bitboard >> 32n) & 0xffffffffn) >>> 0;
  if (high !== 0) {
    return 32 + (31 - Math.clz32(high));
  }

  const low = Number(bitboard & 0xffffffffn) >>> 0;
  return 31 - Math.clz32(low);
}

function populateRayBetweenFlipInfo(moveIndex, player, opponent, target) {
  let flips = 0n;
  let flipCount = 0;

  if ((SQUARE_NEIGHBOR_MASKS[moveIndex] & opponent) !== 0n) {
    const directionBaseOffset = moveIndex * DIRECTION_COUNT;

    for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
      const metadataOffset = directionBaseOffset + directionIndex;
      if ((SQUARE_DIRECTION_NEIGHBOR_BITS[metadataOffset] & opponent) === 0n) {
        continue;
      }

      const anchors = player & SQUARE_DIRECTION_RAY_MASKS[metadataOffset];
      if (anchors === 0n) {
        continue;
      }

      const anchorIndex = DIRECTION_INCREASING[directionIndex]
        ? leastSignificantBitIndex64(anchors)
        : mostSignificantBitIndex64(anchors);
      const betweenOffset = (moveIndex * SQUARE_COUNT) + anchorIndex;
      const betweenMask = BETWEEN_MASKS[betweenOffset];
      if (betweenMask !== 0n && (betweenMask & opponent) === betweenMask) {
        flips |= betweenMask;
        flipCount += BETWEEN_COUNTS[betweenOffset];
      }
    }
  }

  target.flips = flips;
  target.flipCount = flipCount;
  return target;
}

function populateRayBetweenCompressedFlipToken(moveIndex, player, opponent, baseToken = createPreparedSearchMoveToken(moveIndex)) {
  let token = withPreparedSearchMoveTokenIndex(baseToken, moveIndex);
  let totalFlipCount = 0;

  if ((SQUARE_NEIGHBOR_MASKS[moveIndex] & opponent) !== 0n) {
    const directionBaseOffset = moveIndex * DIRECTION_COUNT;

    for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
      const metadataOffset = directionBaseOffset + directionIndex;
      if ((SQUARE_DIRECTION_NEIGHBOR_BITS[metadataOffset] & opponent) === 0n) {
        continue;
      }

      const anchors = player & SQUARE_DIRECTION_RAY_MASKS[metadataOffset];
      if (anchors === 0n) {
        continue;
      }

      const anchorIndex = DIRECTION_INCREASING[directionIndex]
        ? leastSignificantBitIndex64(anchors)
        : mostSignificantBitIndex64(anchors);
      const betweenOffset = (moveIndex * SQUARE_COUNT) + anchorIndex;
      const betweenMask = BETWEEN_MASKS[betweenOffset];
      if (betweenMask !== 0n && (betweenMask & opponent) === betweenMask) {
        const directionalFlipCount = BETWEEN_COUNTS[betweenOffset];
        token = withPreparedSearchMoveTokenDirectionalFlipCount(token, directionIndex, directionalFlipCount);
        totalFlipCount += directionalFlipCount;
      }
    }
  }

  return withPreparedSearchMoveTokenFlipCount(token, totalFlipCount);
}

function populateLegacyCompressedFlipToken(moveBit, moveIndex, player, opponent, baseToken = createPreparedSearchMoveToken(moveIndex)) {
  let token = withPreparedSearchMoveTokenIndex(baseToken, moveIndex);
  let totalFlipCount = 0;

  for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
    const { shift } = DIRECTIONS[directionIndex];
    let cursor = shift(moveBit);
    let directionalFlipCount = 0;

    while ((cursor & opponent) !== 0n) {
      directionalFlipCount += 1;
      cursor = shift(cursor);
    }

    if (directionalFlipCount > 0 && (cursor & player) !== 0n) {
      token = withPreparedSearchMoveTokenDirectionalFlipCount(token, directionIndex, directionalFlipCount);
      totalFlipCount += directionalFlipCount;
    }
  }

  return withPreparedSearchMoveTokenFlipCount(token, totalFlipCount);
}

export function expandPreparedSearchMoveTokenFlips(token, moveIndex = null) {
  if (!Number.isInteger(token)) {
    return 0n;
  }

  const resolvedMoveIndex = Number.isInteger(moveIndex) && moveIndex >= 0 && moveIndex < SQUARE_COUNT
    ? moveIndex
    : getPreparedSearchMoveTokenIndex(token);
  if (resolvedMoveIndex < 0 || resolvedMoveIndex >= SQUARE_COUNT) {
    return 0n;
  }

  let flips = 0n;
  for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
    const directionalFlipCount = getPreparedSearchMoveTokenDirectionalFlipCount(token, directionIndex);
    if (directionalFlipCount <= 0) {
      continue;
    }

    flips |= SQUARE_DIRECTION_PREFIX_FLIP_MASKS[
      directionalFlipMaskOffset(resolvedMoveIndex, directionIndex, directionalFlipCount)
    ];
  }

  return flips;
}

export function getPreparedSearchMoveFlips(move) {
  if (!move || typeof move !== 'object') {
    return 0n;
  }
  if (typeof move.flips === 'bigint') {
    return move.flips;
  }
  if (Number.isInteger(move.token) && hasPreparedSearchMoveTokenCompressedFlips(move.token)) {
    return expandPreparedSearchMoveTokenFlips(move.token, getPreparedSearchMoveIndex(move));
  }
  return 0n;
}

export function getInitialBoards() {
  const white = bitFromIndex(coordToIndex('D4')) | bitFromIndex(coordToIndex('E5'));
  const black = bitFromIndex(coordToIndex('E4')) | bitFromIndex(coordToIndex('D5'));
  return { black, white };
}

function growDirectionalTargets(player, opponent, shift) {
  let targets = shift(player) & opponent;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    targets |= shift(targets) & opponent;
  }
  return targets;
}

export function legalMovesBitboardLegacy(player, opponent) {
  const empty = FULL_BOARD & ~(player | opponent);
  let moves = 0n;

  for (const { shift } of DIRECTIONS) {
    const targets = growDirectionalTargets(player, opponent, shift);
    moves |= shift(targets) & empty;
  }

  return moves & FULL_BOARD;
}

function growDisksForward6(disks, cells, shift) {
  const doubledShift = shift << 1n;
  let captured = disks & (cells << shift);
  captured |= disks & (captured << shift);
  disks &= disks << shift;
  captured |= disks & (captured << doubledShift);
  captured |= disks & (captured << doubledShift);
  return captured;
}

function growDisksBackward6(disks, cells, shift) {
  const doubledShift = shift << 1n;
  let captured = disks & (cells >> shift);
  captured |= disks & (captured >> shift);
  disks &= disks >> shift;
  captured |= disks & (captured >> doubledShift);
  captured |= disks & (captured >> doubledShift);
  return captured;
}

export function legalMovesBitboardPrefixBidirectional(player, opponent) {
  const empty = FULL_BOARD & ~(player | opponent);
  const maskedOpponent = opponent & NON_VERTICAL_FLIP_MASK;

  const horizontalTargets = growDisksForward6(maskedOpponent, player, 1n)
    | growDisksBackward6(maskedOpponent, player, 1n);
  const verticalTargets = growDisksForward6(opponent, player, 8n)
    | growDisksBackward6(opponent, player, 8n);
  const diagonal7Targets = growDisksForward6(maskedOpponent, player, 7n)
    | growDisksBackward6(maskedOpponent, player, 7n);
  const diagonal9Targets = growDisksForward6(maskedOpponent, player, 9n)
    | growDisksBackward6(maskedOpponent, player, 9n);

  return empty & (
    (horizontalTargets << 1n)
    | (horizontalTargets >> 1n)
    | (verticalTargets << 8n)
    | (verticalTargets >> 8n)
    | (diagonal7Targets << 7n)
    | (diagonal7Targets >> 7n)
    | (diagonal9Targets << 9n)
    | (diagonal9Targets >> 9n)
  );
}

export function setActiveMobilityKernelVariant(variant) {
  if (!Object.values(MOBILITY_KERNEL_VARIANTS).includes(variant)) {
    throw new Error(`Unknown mobility kernel variant: ${variant}`);
  }
  activeMobilityKernelVariant = variant;
}

export function getActiveMobilityKernelVariant() {
  return activeMobilityKernelVariant;
}

export function legalMovesBitboard(player, opponent) {
  if (activeMobilityKernelVariant === MOBILITY_KERNEL_VARIANTS.PREFIX_BIDIRECTIONAL) {
    return legalMovesBitboardPrefixBidirectional(player, opponent);
  }
  return legalMovesBitboardLegacy(player, opponent);
}

export function hasAnyLegalMove(player, opponent) {
  return legalMovesBitboard(player, opponent) !== 0n;
}

function collectDirectionalFlips(moveBit, player, opponent, shift) {
  let cursor = shift(moveBit) & opponent;
  let captured = 0n;

  while (cursor !== 0n) {
    captured |= cursor;
    const advanced = shift(cursor);
    if ((advanced & player) !== 0n) {
      return captured;
    }
    cursor = advanced & opponent;
  }

  return 0n;
}

export function computeFlipsLegacy(moveBit, player, opponent) {
  if ((moveBit & (player | opponent)) !== 0n) {
    return 0n;
  }

  let flips = 0n;
  for (const { shift } of DIRECTIONS) {
    flips |= collectDirectionalFlips(moveBit, player, opponent, shift);
  }
  return flips;
}

export function computeFlipsRayBetween(moveBit, player, opponent) {
  if ((moveBit & (player | opponent)) !== 0n) {
    return 0n;
  }

  const moveIndex = indexFromBit(moveBit);
  populateRayBetweenFlipInfo(moveIndex, player, opponent, SHARED_FLIP_INFO);
  return SHARED_FLIP_INFO.flips;
}

export function setActiveFlipKernelVariant(variant) {
  if (!Object.values(FLIP_KERNEL_VARIANTS).includes(variant)) {
    throw new Error(`Unknown flip kernel variant: ${variant}`);
  }
  activeFlipKernelVariant = variant;
}

export function getActiveFlipKernelVariant() {
  return activeFlipKernelVariant;
}

export function resetRuleKernelVariantsToRuntimeDefaults() {
  activeMobilityKernelVariant = DEFAULT_MOBILITY_KERNEL_VARIANT;
  activeFlipKernelVariant = DEFAULT_FLIP_KERNEL_VARIANT;
  return getActiveRuleKernelConfig();
}

export function getActiveRuleKernelConfig() {
  return Object.freeze({
    mobility: activeMobilityKernelVariant,
    flip: activeFlipKernelVariant,
  });
}

export function computeFlips(moveBit, player, opponent) {
  if (activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK) {
    return computeFlipsRayBetween(moveBit, player, opponent);
  }
  return computeFlipsLegacy(moveBit, player, opponent);
}

function createEmptyPreparedSearchMoveRecord() {
  return createEmptyPreparedSearchMoveRecordForVariant(DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT);
}

function createLegacyPreparedSearchMoveRecord() {
  return {
    index: -1,
    bit: 0n,
    flips: null,
    flipCount: null,
    orderingOutcome: null,
    childTableEntry: null,
    opponentMoveCount: null,
    opponentCornerReplies: null,
    orderingScore: 0,
    etcPreparedChildTableEntryReady: false,
    etcPreparedChildTableEntry: null,
    etcPreparedChildTableEntryOwnerId: 0,
    etcPreparedChildTableEntryGeneration: 0,
    etcPreparedChildTableEntryTtStores: 0,
  };
}

function createTokenizedPreparedSearchMoveRecord() {
  return {
    index: -1,
    token: createPreparedSearchMoveToken(0),
    flips: null,
    orderingOutcome: null,
    childTableEntry: null,
    opponentMoveCount: null,
    opponentCornerReplies: null,
    orderingScore: 0,
    etcPreparedChildTableEntryReady: false,
    etcPreparedChildTableEntry: null,
    etcPreparedChildTableEntryOwnerId: 0,
    etcPreparedChildTableEntryGeneration: 0,
    etcPreparedChildTableEntryTtStores: 0,
  };
}

function createEmptyPreparedSearchMoveRecordForVariant(coreVariant = DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT) {
  return coreVariant === PREPARED_SEARCH_MOVE_CORE_VARIANTS.LEGACY
    ? createLegacyPreparedSearchMoveRecord()
    : createTokenizedPreparedSearchMoveRecord();
}

function isPreparedSearchMoveRecordCompatible(record, coreVariant = DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  if (coreVariant === PREPARED_SEARCH_MOVE_CORE_VARIANTS.LEGACY) {
    return !Number.isInteger(record.token);
  }

  return Number.isInteger(record.token);
}

function resetPreparedSearchMoveRecord(
  record,
  moveIndex,
  moveBit,
  coreVariant = DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT,
) {
  record.index = moveIndex;

  if (coreVariant === PREPARED_SEARCH_MOVE_CORE_VARIANTS.LEGACY) {
    record.bit = moveBit;
    record.flipCount = null;
  } else {
    record.token = createPreparedSearchMoveToken(moveIndex);
  }

  record.flips = null;
  record.orderingOutcome = null;
  record.childTableEntry = null;
  record.opponentMoveCount = null;
  record.opponentCornerReplies = null;
  record.orderingScore = 0;
  record.etcPreparedChildTableEntryReady = false;
  record.etcPreparedChildTableEntry = null;
  record.etcPreparedChildTableEntryOwnerId = 0;
  record.etcPreparedChildTableEntryGeneration = 0;
  record.etcPreparedChildTableEntryTtStores = 0;
  return record;
}

function computeFlipCountLegacy(moveBit, player, opponent) {
  let flipCount = 0;

  for (const { shift } of DIRECTIONS) {
    let cursor = shift(moveBit);
    let capturedCount = 0;

    while ((cursor & opponent) !== 0n) {
      capturedCount += 1;
      cursor = shift(cursor);
    }

    if (capturedCount > 0 && (cursor & player) !== 0n) {
      flipCount += capturedCount;
    }
  }

  return flipCount;
}

function computeFlipCountRayBetween(moveIndex, player, opponent) {
  let flipCount = 0;

  if ((SQUARE_NEIGHBOR_MASKS[moveIndex] & opponent) === 0n) {
    return 0;
  }

  const directionBaseOffset = moveIndex * DIRECTION_COUNT;
  for (let directionIndex = 0; directionIndex < DIRECTION_COUNT; directionIndex += 1) {
    const metadataOffset = directionBaseOffset + directionIndex;
    if ((SQUARE_DIRECTION_NEIGHBOR_BITS[metadataOffset] & opponent) === 0n) {
      continue;
    }

    const anchors = player & SQUARE_DIRECTION_RAY_MASKS[metadataOffset];
    if (anchors === 0n) {
      continue;
    }

    const anchorIndex = DIRECTION_INCREASING[directionIndex]
      ? leastSignificantBitIndex64(anchors)
      : mostSignificantBitIndex64(anchors);
    const betweenOffset = (moveIndex * SQUARE_COUNT) + anchorIndex;
    const betweenMask = BETWEEN_MASKS[betweenOffset];
    if (betweenMask !== 0n && (betweenMask & opponent) === betweenMask) {
      flipCount += BETWEEN_COUNTS[betweenOffset];
    }
  }

  return flipCount;
}

function isValidMoveIndex(moveIndex) {
  return Number.isInteger(moveIndex) && moveIndex >= 0 && moveIndex < SQUARE_COUNT;
}

export function computeFlipsAtIndex(moveIndex, player, opponent) {
  if (!isValidMoveIndex(moveIndex)
    || typeof player !== 'bigint'
    || typeof opponent !== 'bigint') {
    return 0n;
  }

  const moveBit = bitFromIndex(moveIndex);
  if ((moveBit & (player | opponent)) !== 0n) {
    return 0n;
  }

  if (activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK) {
    populateRayBetweenFlipInfo(moveIndex, player, opponent, SHARED_FLIP_INFO);
    return SHARED_FLIP_INFO.flips;
  }

  return computeFlipsLegacy(moveBit, player, opponent);
}

export function computeFlipCountAtIndex(moveIndex, player, opponent) {
  if (!isValidMoveIndex(moveIndex)
    || typeof player !== 'bigint'
    || typeof opponent !== 'bigint') {
    return 0;
  }

  const moveBit = bitFromIndex(moveIndex);
  if ((moveBit & (player | opponent)) !== 0n) {
    return 0;
  }

  return activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK
    ? computeFlipCountRayBetween(moveIndex, player, opponent)
    : computeFlipCountLegacy(moveBit, player, opponent);
}

export function materializePreparedSearchMoveFlipCount(move, player, opponent) {
  if (!move || typeof move !== 'object') {
    return 0;
  }

  const cachedFlipCount = readPreparedSearchMoveFlipCount(move);
  if (Number.isInteger(cachedFlipCount)) {
    return cachedFlipCount;
  }

  const tokenizedPreparedRecord = Number.isInteger(move.token) && Number.isInteger(move.index);
  const legacyPreparedRecord = !Number.isInteger(move.token) && typeof move.bit === 'bigint' && Number.isInteger(move.index);
  const moveIndex = tokenizedPreparedRecord || legacyPreparedRecord
    ? move.index
    : getPreparedSearchMoveIndex(move);
  const moveBit = tokenizedPreparedRecord
    ? bitFromIndex(moveIndex)
    : (legacyPreparedRecord ? move.bit : getPreparedSearchMoveBit(move));

  if (Number.isInteger(move.token)) {
    if (!Number.isInteger(move.index)) {
      move.index = moveIndex;
      move.token = withPreparedSearchMoveTokenIndex(move.token, moveIndex);
    }
  } else {
    move.index = moveIndex;
    move.bit = moveBit;
  }

  const flipCount = activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK
    ? computeFlipCountRayBetween(moveIndex, player, opponent)
    : computeFlipCountLegacy(moveBit, player, opponent);

  if (Number.isInteger(move.token)) {
    move.token = withPreparedSearchMoveTokenFlipCount(move.token, flipCount);
  } else {
    move.flipCount = flipCount;
  }
  return flipCount;
}

export function materializePreparedSearchMove(
  move,
  player,
  opponent,
  {
    flipStorageVariant = DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT,
  } = {},
) {
  if (!move || typeof move !== 'object') {
    return null;
  }

  if (typeof move.flips === 'bigint') {
    if (!Number.isInteger(readPreparedSearchMoveFlipCount(move))) {
      const flipCount = popcount(move.flips);
      if (Number.isInteger(move.token)) {
        move.token = withPreparedSearchMoveTokenFlipCount(move.token, flipCount);
      } else {
        move.flipCount = flipCount;
      }
    }
    return move;
  }

  const tokenizedPreparedRecord = Number.isInteger(move.token) && Number.isInteger(move.index);
  const legacyPreparedRecord = !Number.isInteger(move.token) && typeof move.bit === 'bigint' && Number.isInteger(move.index);
  const moveIndex = tokenizedPreparedRecord || legacyPreparedRecord
    ? move.index
    : getPreparedSearchMoveIndex(move);
  const moveBit = tokenizedPreparedRecord
    ? bitFromIndex(moveIndex)
    : (legacyPreparedRecord ? move.bit : getPreparedSearchMoveBit(move));

  if (Number.isInteger(move.token)) {
    if (!Number.isInteger(move.index)) {
      move.index = moveIndex;
      move.token = withPreparedSearchMoveTokenIndex(move.token, moveIndex);
    }
  } else {
    move.index = moveIndex;
    move.bit = moveBit;
  }

  const shouldStoreCompactFlipToken = Number.isInteger(move.token)
    && flipStorageVariant === PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANTS.COMPACT_TOKEN;
  if (shouldStoreCompactFlipToken && hasPreparedSearchMoveTokenCompressedFlips(move.token)) {
    return move;
  }

  if (shouldStoreCompactFlipToken) {
    if (activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK) {
      move.token = populateRayBetweenCompressedFlipToken(moveIndex, player, opponent, move.token);
    } else {
      move.token = populateLegacyCompressedFlipToken(moveBit, moveIndex, player, opponent, move.token);
    }
    move.flips = null;
    return move;
  }

  if (activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK) {
    populateRayBetweenFlipInfo(moveIndex, player, opponent, SHARED_FLIP_INFO);
    move.flips = SHARED_FLIP_INFO.flips;
    if (Number.isInteger(move.token)) {
      move.token = withPreparedSearchMoveTokenFlipCount(move.token, SHARED_FLIP_INFO.flipCount);
    } else {
      move.flipCount = SHARED_FLIP_INFO.flipCount;
    }
    return move;
  }

  const flips = computeFlipsLegacy(moveBit, player, opponent);
  move.flips = flips;
  const flipCount = popcount(flips);
  if (Number.isInteger(move.token)) {
    move.token = withPreparedSearchMoveTokenFlipCount(move.token, flipCount);
  } else {
    move.flipCount = flipCount;
  }
  return move;
}

export function applyMoveBitWithPreparedSearchMoveToken(moveIndex, token, player, opponent) {
  const resolvedMoveIndex = Number.isInteger(moveIndex) && moveIndex >= 0 && moveIndex < SQUARE_COUNT
    ? moveIndex
    : getPreparedSearchMoveTokenIndex(token);
  if (resolvedMoveIndex < 0 || resolvedMoveIndex >= SQUARE_COUNT) {
    return null;
  }

  const moveBit = bitFromIndex(resolvedMoveIndex);
  if ((moveBit & (player | opponent)) !== 0n) {
    return null;
  }

  const flips = expandPreparedSearchMoveTokenFlips(token, resolvedMoveIndex);
  if (flips === 0n) {
    return null;
  }

  return {
    player: player | moveBit | flips,
    opponent: opponent & ~flips,
  };
}

function fillPreparedSearchMoveRecord(
  record,
  moveBit,
  player,
  opponent,
  eager = true,
  coreVariant = DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT,
  flipStorageVariant = DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT,
) {
  const moveIndex = indexFromBit(moveBit);
  resetPreparedSearchMoveRecord(record, moveIndex, moveBit, coreVariant);
  if (eager) {
    materializePreparedSearchMove(record, player, opponent, { flipStorageVariant });
  }
  return record;
}

export function createPreparedSearchMoveBuffer(initialCapacity = 0) {
  return new Array(Math.max(0, Math.floor(initialCapacity)));
}

export function prepareSearchMoveAtIndex(
  moveIndex,
  player,
  opponent,
  existingRecord = null,
  {
    eager = true,
    coreVariant = DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT,
    flipStorageVariant = DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT,
  } = {},
) {
  if (!isValidMoveIndex(moveIndex)
    || typeof player !== 'bigint'
    || typeof opponent !== 'bigint') {
    return null;
  }

  const moveBit = bitFromIndex(moveIndex);
  if ((moveBit & (player | opponent)) !== 0n) {
    return null;
  }

  const record = isPreparedSearchMoveRecordCompatible(existingRecord, coreVariant)
    ? existingRecord
    : createEmptyPreparedSearchMoveRecordForVariant(coreVariant);
  resetPreparedSearchMoveRecord(record, moveIndex, moveBit, coreVariant);

  if (eager) {
    materializePreparedSearchMove(record, player, opponent, { flipStorageVariant });
    return (readPreparedSearchMoveFlipCount(record) ?? 0) > 0 ? record : null;
  }

  const flipCount = computeFlipCountAtIndex(moveIndex, player, opponent);
  if (flipCount <= 0) {
    return null;
  }

  if (Number.isInteger(record.token)) {
    record.token = withPreparedSearchMoveTokenFlipCount(record.token, flipCount);
  } else {
    record.flipCount = flipCount;
  }
  return record;
}

export function listPreparedSearchMovesIntoBuffer(
  player,
  opponent,
  buffer,
  {
    eager = true,
    coreVariant = DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT,
    flipStorageVariant = DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT,
  } = {},
) {
  if (!Array.isArray(buffer)) {
    throw new TypeError('Prepared search move buffer must be an array.');
  }

  const legalMoves = legalMovesBitboard(player, opponent);
  if (legalMoves === 0n) {
    buffer.length = 0;
    return buffer;
  }

  const targetLength = popcount(legalMoves);
  if (buffer.length < targetLength) {
    buffer.length = targetLength;
  }

  let slot = 0;
  let cursor = legalMoves;
  while (cursor !== 0n) {
    const moveBit = cursor & -cursor;
    cursor ^= moveBit;
    const existingRecord = isPreparedSearchMoveRecordCompatible(buffer[slot], coreVariant)
      ? buffer[slot]
      : createEmptyPreparedSearchMoveRecordForVariant(coreVariant);
    buffer[slot] = fillPreparedSearchMoveRecord(
      existingRecord,
      moveBit,
      player,
      opponent,
      eager,
      coreVariant,
      flipStorageVariant,
    );
    slot += 1;
  }

  buffer.length = slot;
  return buffer;
}

export function listPreparedSearchMoves(player, opponent, options = {}) {
  const targetBuffer = Array.isArray(options?.buffer)
    ? options.buffer
    : [];
  return listPreparedSearchMovesIntoBuffer(player, opponent, targetBuffer, options);
}

export function isLegalMoveBit(moveBit, player, opponent) {
  return computeFlips(moveBit, player, opponent) !== 0n;
}

export function applyMoveBit(moveBit, player, opponent) {
  const flips = computeFlips(moveBit, player, opponent);
  if (flips === 0n) {
    return null;
  }

  const nextPlayerBoard = player | moveBit | flips;
  const nextOpponentBoard = opponent & ~flips;

  return {
    player: nextPlayerBoard,
    opponent: nextOpponentBoard,
    flips,
    flippedIndices: bitsToIndices(flips),
  };
}

export function applyMoveBitWithFlips(moveBit, flips, player, opponent) {
  if (flips === 0n || (moveBit & (player | opponent)) !== 0n) {
    return null;
  }

  return {
    player: player | moveBit | flips,
    opponent: opponent & ~flips,
    flips,
  };
}

function buildLegalMoveRecords(
  player,
  opponent,
  {
    includeFlippedIndices = false,
    includeCornerFlag = false,
  } = {},
) {
  const legalMoves = legalMovesBitboard(player, opponent);
  const details = [];

  let cursor = legalMoves;
  while (cursor !== 0n) {
    const moveBit = cursor & -cursor;
    cursor ^= moveBit;
    const index = indexFromBit(moveBit);
    let flips;
    let flipCount;

    if (activeFlipKernelVariant === FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK) {
      populateRayBetweenFlipInfo(index, player, opponent, SHARED_FLIP_INFO);
      flips = SHARED_FLIP_INFO.flips;
      flipCount = SHARED_FLIP_INFO.flipCount;
    } else {
      flips = computeFlipsLegacy(moveBit, player, opponent);
      flipCount = popcount(flips);
    }

    const detail = {
      index,
      bit: moveBit,
      flips,
      flipCount,
    };

    if (includeFlippedIndices) {
      detail.flippedIndices = bitsToIndices(flips);
    }
    if (includeCornerFlag) {
      detail.isCorner = CORNER_BITS.includes(moveBit);
    }

    details.push(detail);
  }
  return details;
}

export function listLegalSearchMoves(player, opponent) {
  return buildLegalMoveRecords(player, opponent);
}

export function listLegalMoveDetails(player, opponent) {
  return buildLegalMoveRecords(player, opponent, {
    includeFlippedIndices: true,
    includeCornerFlag: true,
  });
}

export function getDiscCounts(black, white) {
  return {
    black: popcount(black),
    white: popcount(white),
  };
}

export function isTerminalPosition(black, white) {
  return !hasAnyLegalMove(black, white) && !hasAnyLegalMove(white, black);
}
