import {
  coordToIndex,
  indexToCoord,
  indexToRowCol,
  rowColToIndex,
} from '../../js/core/bitboard.js';

const MAX_PATTERN_BANK_CELLS = 12;
const POWERS_OF_THREE = Object.freeze(Array.from({ length: MAX_PATTERN_BANK_CELLS + 1 }, (_, exponent) => 3 ** exponent));

const FACTORIZED_PATTERN_BANK_FORMAT = 'factorized-sparse-v1';
const FACTORIZED_PATTERN_BANK_CACHE = new WeakMap();

function decodeBase64Bytes(source) {
  if (typeof source !== 'string' || source.length === 0) {
    return new Uint8Array();
  }
  return new Uint8Array(Buffer.from(source, 'base64'));
}

function readUnsignedVarint(bytes, offset) {
  let value = 0;
  let shift = 0;
  let cursor = offset;
  while (cursor < bytes.length) {
    const byte = bytes[cursor];
    cursor += 1;
    value += (byte & 0x7f) * (2 ** shift);
    if ((byte & 0x80) === 0) {
      return { value, nextOffset: cursor };
    }
    shift += 7;
  }
  throw new Error('Unexpected end of factorized pattern bank varint stream.');
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const token = typeof value === 'string' ? value.trim() : '';
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    result.push(token);
  }
  return result;
}

function midpointForBucket(bucket) {
  return Math.round((Number(bucket?.minEmpties ?? 0) + Number(bucket?.maxEmpties ?? 0)) / 2);
}

function createBucketKey(prefix, index, totalCount) {
  const number = String(index + 1).padStart(String(totalCount).length, '0');
  return `${prefix}-${number}`;
}

export function buildBalancedPhaseBuckets(totalBucketCount, {
  keyPrefix = 'phase',
  lateBuckets = [
    { key: 'late-b', minEmpties: 7, maxEmpties: 12, label: '후반 2' },
    { key: 'endgame', minEmpties: 0, maxEmpties: 6, label: '끝내기' },
  ],
} = {}) {
  const normalizedTotal = Number(totalBucketCount);
  if (!Number.isInteger(normalizedTotal) || normalizedTotal < 3 || normalizedTotal > 24) {
    throw new Error(`Balanced phase bucket count must be an integer between 3 and 24. Received: ${totalBucketCount}`);
  }

  const preservedLateBuckets = lateBuckets.map((bucket) => ({
    key: String(bucket.key),
    minEmpties: Number(bucket.minEmpties),
    maxEmpties: Number(bucket.maxEmpties),
    ...(typeof bucket.label === 'string' && bucket.label.trim() !== '' ? { label: bucket.label } : {}),
  }));
  const earlyBucketCount = normalizedTotal - preservedLateBuckets.length;
  const earliestMinEmpties = preservedLateBuckets.reduce(
    (best, bucket) => Math.max(best, Number(bucket.maxEmpties ?? 0)),
    0,
  ) + 1;
  const earliestMaxEmpties = 60;
  const earlySpan = (earliestMaxEmpties - earliestMinEmpties) + 1;
  if (earlyBucketCount <= 0 || earlySpan <= 0) {
    throw new Error('Invalid balanced phase bucket configuration.');
  }

  const baseSize = Math.floor(earlySpan / earlyBucketCount);
  const remainder = earlySpan % earlyBucketCount;
  const sizes = Array.from({ length: earlyBucketCount }, (_, index) => baseSize + (index < remainder ? 1 : 0));
  const earlyBuckets = [];
  let currentMax = earliestMaxEmpties;

  for (let index = 0; index < earlyBucketCount; index += 1) {
    const size = sizes[index];
    const minEmpties = currentMax - size + 1;
    const maxEmpties = currentMax;
    earlyBuckets.push({
      key: createBucketKey(keyPrefix, index, earlyBucketCount),
      minEmpties,
      maxEmpties,
      label: `phase ${index + 1}`,
    });
    currentMax = minEmpties - 1;
  }

  return Object.freeze([...earlyBuckets, ...preservedLateBuckets].map((bucket) => Object.freeze(bucket)));
}

export const PATTERN_BANK_PHASE_BUCKET_PRESETS = Object.freeze({
  balanced13: buildBalancedPhaseBuckets(13),
  late3: Object.freeze([
    Object.freeze({ key: 'late-a', minEmpties: 13, maxEmpties: 19, label: '후반 1' }),
    Object.freeze({ key: 'late-b', minEmpties: 7, maxEmpties: 12, label: '후반 2' }),
    Object.freeze({ key: 'endgame', minEmpties: 0, maxEmpties: 6, label: '끝내기' }),
  ]),
  late2: Object.freeze([
    Object.freeze({ key: 'late-b', minEmpties: 7, maxEmpties: 12, label: '후반 2' }),
    Object.freeze({ key: 'endgame', minEmpties: 0, maxEmpties: 6, label: '끝내기' }),
  ]),
});

function normalizeEmptyBucketRange(minSource, maxSource) {
  const normalizedMin = Number(minSource ?? 0);
  const normalizedMax = Number(maxSource ?? normalizedMin);
  if (!Number.isInteger(normalizedMin) || !Number.isInteger(normalizedMax)) {
    throw new Error(`Phase bucket bounds must be integers. Received: ${minSource}, ${maxSource}`);
  }
  if (normalizedMin <= normalizedMax) {
    return Object.freeze({ minEmpties: normalizedMin, maxEmpties: normalizedMax });
  }
  return Object.freeze({ minEmpties: normalizedMax, maxEmpties: normalizedMin });
}

function normalizeSquare(square) {
  if (Number.isInteger(square) && square >= 0 && square < 64) {
    return square;
  }
  if (typeof square === 'string' && /^[a-h][1-8]$/i.test(square.trim())) {
    return coordToIndex(square.trim().toLowerCase());
  }
  throw new Error(`Invalid square coordinate: ${square}`);
}

function normalizeSquares(sourceSquares) {
  if (!Array.isArray(sourceSquares) || sourceSquares.length === 0) {
    throw new Error('Pattern squares must be a non-empty array.');
  }
  const normalized = sourceSquares.map(normalizeSquare);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    throw new Error(`Pattern squares must not repeat: ${JSON.stringify(sourceSquares)}`);
  }
  return Object.freeze(normalized);
}

function applyTransform(index, transformKey) {
  const { row, col } = indexToRowCol(index);
  switch (transformKey) {
    case 'identity':
      return rowColToIndex(row, col);
    case 'rot90':
      return rowColToIndex(col, 7 - row);
    case 'rot180':
      return rowColToIndex(7 - row, 7 - col);
    case 'rot270':
      return rowColToIndex(7 - col, row);
    case 'mirrorV':
      return rowColToIndex(row, 7 - col);
    case 'mirrorH':
      return rowColToIndex(7 - row, col);
    case 'mirrorD':
      return rowColToIndex(col, row);
    case 'mirrorA':
      return rowColToIndex(7 - col, 7 - row);
    default:
      throw new Error(`Unknown transform: ${transformKey}`);
  }
}

const ROTATION_TRANSFORMS = Object.freeze(['identity', 'rot90', 'rot180', 'rot270']);
const DIHEDRAL_TRANSFORMS = Object.freeze(['identity', 'rot90', 'rot180', 'rot270', 'mirrorV', 'mirrorH', 'mirrorD', 'mirrorA']);

function transformedSquares(squares, transformKey) {
  return squares.map((square) => applyTransform(square, transformKey));
}

function uniquePlacements(placements) {
  const seen = new Set();
  const result = [];
  for (const placement of placements) {
    const key = JSON.stringify(placement);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(Object.freeze([...placement]));
  }
  return Object.freeze(result);
}

function generatePlacementsFromBaseSquares(baseSquares, symmetry) {
  const normalizedBaseSquares = normalizeSquares(baseSquares);
  if (symmetry === 'manual') {
    return Object.freeze([normalizedBaseSquares]);
  }
  const transforms = symmetry === 'dihedral' ? DIHEDRAL_TRANSFORMS : ROTATION_TRANSFORMS;
  return uniquePlacements(transforms.map((transformKey) => transformedSquares(normalizedBaseSquares, transformKey)));
}

function buildPatternKey(source, fallbackSquares) {
  if (typeof source?.key === 'string' && source.key.trim() !== '') {
    return source.key.trim();
  }
  return fallbackSquares.map((square) => indexToCoord(square)).join('-');
}

function normalizePatternPlacements(patternSource) {
  if (Array.isArray(patternSource?.placements) && patternSource.placements.length > 0) {
    return uniquePlacements(patternSource.placements.map((placement) => normalizeSquares(placement)));
  }

  if (Array.isArray(patternSource?.baseSquares) || Array.isArray(patternSource?.squares) || Array.isArray(patternSource?.coords)) {
    const squares = patternSource.baseSquares ?? patternSource.squares ?? patternSource.coords;
    return generatePlacementsFromBaseSquares(squares, patternSource.symmetry ?? 'rotations');
  }

  throw new Error('Pattern definition must include placements[] or baseSquares/squares/coords.');
}

function createPatternBankLayout({ name, description, basePatterns }) {
  if (!Array.isArray(basePatterns) || basePatterns.length === 0) {
    throw new Error('Pattern bank layout requires at least one base pattern.');
  }

  const normalizedBasePatterns = Object.freeze(basePatterns.map((patternSource, index) => {
    const placements = normalizePatternPlacements(patternSource);
    const firstPlacement = placements[0];
    const length = firstPlacement.length;
    if (length > MAX_PATTERN_BANK_CELLS) {
      throw new Error(`Pattern length ${length} exceeds MAX_PATTERN_BANK_CELLS=${MAX_PATTERN_BANK_CELLS}`);
    }
    for (const placement of placements) {
      if (placement.length !== length) {
        throw new Error(`All placements for a base pattern must have the same length. Pattern index=${index}`);
      }
    }
    return Object.freeze({
      key: buildPatternKey(patternSource, firstPlacement),
      ...(typeof patternSource?.label === 'string' && patternSource.label.trim() !== '' ? { label: patternSource.label.trim() } : {}),
      length,
      tableSize: POWERS_OF_THREE[length],
      placements,
      placementCount: placements.length,
    });
  }));

  const patternKeys = normalizedBasePatterns.map((pattern) => pattern.key);
  if (new Set(patternKeys).size !== patternKeys.length) {
    throw new Error('Pattern bank base pattern keys must be unique.');
  }

  return Object.freeze({
    version: 1,
    name,
    description,
    basePatternCount: normalizedBasePatterns.length,
    totalTableSize: normalizedBasePatterns.reduce((sum, pattern) => sum + pattern.tableSize, 0),
    totalPlacementCount: normalizedBasePatterns.reduce((sum, pattern) => sum + pattern.placementCount, 0),
    maxPatternLength: normalizedBasePatterns.reduce((best, pattern) => Math.max(best, pattern.length), 0),
    basePatterns: normalizedBasePatterns,
  });
}

function coords(...values) {
  return values;
}

function createBuiltinPatternBankLayouts() {
  const patternBankV1 = createPatternBankLayout({
    name: 'pattern-bank-v1',
    description: 'Egaroucid-web 계열 6x8-cell + 6x9-cell symmetry-tied pattern bank입니다.',
    basePatterns: [
      {
        key: 'edge-outer',
        label: 'edge outer',
        baseSquares: coords('a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'),
        symmetry: 'rotations',
      },
      {
        key: 'line-2',
        label: 'second line',
        baseSquares: coords('a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'),
        symmetry: 'rotations',
      },
      {
        key: 'line-3',
        label: 'third line',
        baseSquares: coords('a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3'),
        symmetry: 'rotations',
      },
      {
        key: 'line-4',
        label: 'fourth line',
        baseSquares: coords('a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'),
        symmetry: 'rotations',
      },
      {
        key: 'zigzag-a',
        label: 'zigzag a',
        baseSquares: coords('a3', 'b2', 'c1', 'd2', 'e3', 'f4', 'g5', 'h6'),
        symmetry: 'dihedral',
      },
      {
        key: 'zigzag-b',
        label: 'zigzag b',
        baseSquares: coords('a4', 'b3', 'c2', 'd1', 'e2', 'f3', 'g4', 'h5'),
        symmetry: 'dihedral',
      },
      {
        key: 'diag-corner-a',
        label: 'diag corner a',
        baseSquares: coords('a1', 'b1', 'c2', 'd3', 'e4', 'f5', 'g6', 'h7', 'h8'),
        symmetry: 'rotations',
      },
      {
        key: 'diag-corner-b',
        label: 'diag corner b',
        baseSquares: coords('a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8', 'g2'),
        symmetry: 'rotations',
      },
      {
        key: 'corner-3x3',
        label: 'corner 3x3',
        baseSquares: coords('a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3'),
        symmetry: 'rotations',
      },
      {
        key: 'corner-l9',
        label: 'corner l9',
        baseSquares: coords('e1', 'd1', 'c1', 'b1', 'a1', 'a2', 'a3', 'a4', 'a5'),
        symmetry: 'rotations',
      },
      {
        key: 'rect4x2-plus-corner',
        label: 'rect4x2 plus corner',
        baseSquares: coords('a1', 'b1', 'c1', 'd1', 'a2', 'b2', 'c2', 'd2', 'h1'),
        symmetry: 'dihedral',
      },
      {
        key: 'edge7-plus-2',
        label: 'edge7 plus 2',
        baseSquares: coords('a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'b2', 'c2'),
        symmetry: 'dihedral',
      },
    ],
  });

  const cornerDiagonalLatePatch = createPatternBankLayout({
    name: 'corner-diagonal-late-patch-v1',
    description: '3x3 corner + 5x2/2x5 corner + two main diagonals late patch layout입니다.',
    basePatterns: [
      {
        key: 'corner-3x3',
        label: 'corner 3x3',
        baseSquares: coords('a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3'),
        symmetry: 'rotations',
      },
      {
        key: 'corner-5x2',
        label: 'corner 5x2 / 2x5',
        baseSquares: coords('a1', 'b1', 'c1', 'd1', 'e1', 'a2', 'b2', 'c2', 'd2', 'e2'),
        symmetry: 'dihedral',
      },
      {
        key: 'main-diagonals',
        label: 'main diagonals',
        placements: [
          coords('a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'),
          coords('h1', 'g2', 'f3', 'e4', 'd5', 'c6', 'b7', 'a8'),
        ],
      },
    ],
  });

  return Object.freeze({
    [patternBankV1.name]: patternBankV1,
    [cornerDiagonalLatePatch.name]: cornerDiagonalLatePatch,
  });
}

export const PATTERN_BANK_LAYOUT_LIBRARY = createBuiltinPatternBankLayouts();
export const DEFAULT_PATTERN_BANK_LAYOUT_NAME = 'pattern-bank-v1';

export function listPatternBankLayoutNames() {
  return Object.freeze(Object.keys(PATTERN_BANK_LAYOUT_LIBRARY));
}

export function resolvePatternBankLayout(layout = DEFAULT_PATTERN_BANK_LAYOUT_NAME) {
  if (layout === null || layout === undefined || layout === '') {
    return PATTERN_BANK_LAYOUT_LIBRARY[DEFAULT_PATTERN_BANK_LAYOUT_NAME];
  }
  if (typeof layout === 'string') {
    const builtin = PATTERN_BANK_LAYOUT_LIBRARY[layout];
    if (!builtin) {
      throw new Error(`Unknown pattern bank layout: ${layout}`);
    }
    return builtin;
  }
  if (typeof layout === 'object') {
    if (typeof layout.builtin === 'string') {
      return resolvePatternBankLayout(layout.builtin);
    }
    if (typeof layout.name === 'string' && !Array.isArray(layout.basePatterns) && PATTERN_BANK_LAYOUT_LIBRARY[layout.name]) {
      return PATTERN_BANK_LAYOUT_LIBRARY[layout.name];
    }
    if (Array.isArray(layout.basePatterns)) {
      return createPatternBankLayout({
        name: typeof layout.name === 'string' && layout.name.trim() !== '' ? layout.name.trim() : 'custom-pattern-bank-layout',
        description: typeof layout.description === 'string' ? layout.description : '사용자 정의 pattern bank layout입니다.',
        basePatterns: layout.basePatterns,
      });
    }
  }
  throw new Error('Pattern bank layout must be a built-in name or an object with basePatterns[].');
}

export function resolvePatternBankPhaseBuckets(source) {
  if (!source) {
    return PATTERN_BANK_PHASE_BUCKET_PRESETS.balanced13;
  }
  if (typeof source === 'string') {
    const preset = PATTERN_BANK_PHASE_BUCKET_PRESETS[source];
    if (!preset) {
      throw new Error(`Unknown pattern bank phase bucket preset: ${source}`);
    }
    return preset;
  }
  if (Array.isArray(source) && source.length > 0) {
    return Object.freeze(source.map((bucket, index) => {
      const { minEmpties, maxEmpties } = normalizeEmptyBucketRange(bucket?.minEmpties, bucket?.maxEmpties);
      return Object.freeze({
        key: typeof bucket?.key === 'string' && bucket.key.trim() !== '' ? bucket.key.trim() : createBucketKey('phase', index, source.length),
        ...(typeof bucket?.label === 'string' && bucket.label.trim() !== '' ? { label: bucket.label.trim() } : {}),
        minEmpties,
        maxEmpties,
      });
    }));
  }
  throw new Error('Pattern bank phase buckets must be a known preset key or a non-empty array.');
}

function normalizePatternBankBucket(bucket, layout) {
  const rawPatternWeights = bucket?.patternWeights ?? bucket?.weightsByPattern ?? bucket?.tables ?? [];
  const { minEmpties, maxEmpties } = normalizeEmptyBucketRange(bucket?.minEmpties, bucket?.maxEmpties);
  return Object.freeze({
    ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
    ...(typeof bucket?.label === 'string' ? { label: bucket.label } : {}),
    minEmpties,
    maxEmpties,
    scale: Number.isFinite(Number(bucket?.scale)) ? Number(bucket.scale) : 1,
    bias: Number.isFinite(Number(bucket?.bias)) ? Number(bucket.bias) : 0,
    patternWeights: Object.freeze(layout.basePatterns.map((pattern, patternIndex) => {
      const sourceWeights = Array.isArray(rawPatternWeights[patternIndex]) ? rawPatternWeights[patternIndex] : [];
      return Object.freeze(Array.from({ length: pattern.tableSize }, (_, entryIndex) => Number(sourceWeights[entryIndex] ?? 0)));
    })),
  });
}

function isFactorizedPatternBankProfile(profile) {
  return typeof profile?.format === 'string'
    && profile.format.trim().toLowerCase() === FACTORIZED_PATTERN_BANK_FORMAT;
}

function expandFactorizedPatternBankProfile(profile, layout) {
  const cached = FACTORIZED_PATTERN_BANK_CACHE.get(profile) ?? null;
  if (cached) {
    return cached;
  }

  const factorized = profile?.factorized && typeof profile.factorized === 'object' ? profile.factorized : {};
  const tableNonZeroCounts = Array.isArray(factorized.tableNonZeroCounts) ? factorized.tableNonZeroCounts : [];
  const indexBytes = decodeBase64Bytes(factorized.indicesBase64);
  const valueBytes = decodeBase64Bytes(factorized.valuesBase64);
  const valueView = new DataView(valueBytes.buffer, valueBytes.byteOffset, valueBytes.byteLength);
  const expectedTableCount = (Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets.length : 0) * layout.basePatterns.length;
  if (tableNonZeroCounts.length !== expectedTableCount) {
    throw new Error(`Factorized pattern bank table count mismatch: expected ${expectedTableCount}, received ${tableNonZeroCounts.length}`);
  }
  if (valueBytes.byteLength % 4 !== 0) {
    throw new Error('Factorized pattern bank float payload must be aligned to 4-byte float32 entries.');
  }

  let tableCursor = 0;
  let indexOffset = 0;
  let valueOffset = 0;
  const expandedBuckets = Object.freeze((Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets : []).map((bucket) => {
    const { minEmpties, maxEmpties } = normalizeEmptyBucketRange(bucket?.minEmpties, bucket?.maxEmpties);
    const patternWeights = Object.freeze(layout.basePatterns.map((pattern) => {
      const table = new Array(pattern.tableSize).fill(0);
      const nonZeroCount = Math.max(0, Math.trunc(Number(tableNonZeroCounts[tableCursor] ?? 0)));
      tableCursor += 1;
      let previousIndex = 0;
      for (let entryIndex = 0; entryIndex < nonZeroCount; entryIndex += 1) {
        const decoded = readUnsignedVarint(indexBytes, indexOffset);
        const delta = decoded.value;
        indexOffset = decoded.nextOffset;
        previousIndex = entryIndex === 0 ? delta : (previousIndex + delta);
        if (previousIndex < 0 || previousIndex >= table.length) {
          throw new RangeError(`Factorized pattern bank table index out of range: ${previousIndex} / ${table.length}`);
        }
        if (valueOffset + 4 > valueBytes.byteLength) {
          throw new Error('Factorized pattern bank float payload ended unexpectedly.');
        }
        table[previousIndex] = valueView.getFloat32(valueOffset, true);
        valueOffset += 4;
      }
      return Object.freeze(table);
    }));
    return Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      ...(typeof bucket?.label === 'string' ? { label: bucket.label } : {}),
      minEmpties,
      maxEmpties,
      scale: Number.isFinite(Number(bucket?.scale)) ? Number(bucket.scale) : 1,
      bias: Number.isFinite(Number(bucket?.bias)) ? Number(bucket.bias) : 0,
      patternWeights,
    });
  }));

  if (indexOffset !== indexBytes.length) {
    throw new Error(`Factorized pattern bank index payload has ${indexBytes.length - indexOffset} unread byte(s).`);
  }
  if (valueOffset !== valueBytes.byteLength) {
    throw new Error(`Factorized pattern bank value payload has ${(valueBytes.byteLength - valueOffset) / 4} unread float32 value(s).`);
  }

  FACTORIZED_PATTERN_BANK_CACHE.set(profile, expandedBuckets);
  return expandedBuckets;
}

export function defaultPatternBankProfileName() {
  return 'trained-pattern-bank-stage148';
}

export function makePatternBankTrainingProfileFromWeights({
  name = defaultPatternBankProfileName(),
  description = '외부 학습 도구로 생성한 symmetry-tied pattern bank evaluator입니다.',
  layout = DEFAULT_PATTERN_BANK_LAYOUT_NAME,
  trainedBuckets = [],
  source = null,
  diagnostics = null,
  stage = null,
} = {}) {
  const resolvedLayout = resolvePatternBankLayout(layout);
  return Object.freeze({
    version: 1,
    name,
    description,
    ...(stage ? { stage } : {}),
    featureEncoding: 'ternary-side-to-move',
    layout: resolvedLayout,
    ...(source ? { source } : {}),
    ...(diagnostics ? { diagnostics } : {}),
    trainedBuckets: Object.freeze(trainedBuckets.map((bucket) => normalizePatternBankBucket(bucket, resolvedLayout))),
  });
}

export function resolvePatternBankProfile(profile) {
  if (!profile) {
    return null;
  }
  const source = profile && typeof profile === 'object' ? profile : {};
  const layout = resolvePatternBankLayout(source.layoutName ?? source.layout ?? DEFAULT_PATTERN_BANK_LAYOUT_NAME);
  const trainedBuckets = isFactorizedPatternBankProfile(source)
    ? expandFactorizedPatternBankProfile(source, layout)
    : (Array.isArray(source.trainedBuckets)
      ? Object.freeze(source.trainedBuckets.map((bucket) => normalizePatternBankBucket(bucket, layout)))
      : Object.freeze([]));

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : 1,
    name: typeof source.name === 'string' && source.name.trim() !== '' ? source.name.trim() : defaultPatternBankProfileName(),
    description: typeof source.description === 'string' ? source.description : '외부 학습 도구로 생성한 symmetry-tied pattern bank evaluator입니다.',
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: source.source } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: source.diagnostics } : {}),
    featureEncoding: 'ternary-side-to-move',
    layout,
    trainedBuckets,
  });
}

export function compilePatternBankProfile(profile) {
  const resolved = resolvePatternBankProfile(profile);
  if (!resolved) {
    return null;
  }

  const bucketsByEmptyCount = Array.from({ length: 61 }, () => null);
  for (const bucket of resolved.trainedBuckets) {
    for (let empties = bucket.minEmpties; empties <= bucket.maxEmpties; empties += 1) {
      if (empties >= 0 && empties < bucketsByEmptyCount.length) {
        bucketsByEmptyCount[empties] = bucket;
      }
    }
  }

  return Object.freeze({
    ...resolved,
    bucketsByEmptyCount: Object.freeze(bucketsByEmptyCount),
  });
}

export function preparePatternBankLayoutForScoring(layoutSource) {
  const layout = resolvePatternBankLayout(layoutSource);
  return Object.freeze({
    ...layout,
    basePatterns: Object.freeze(layout.basePatterns.map((pattern) => Object.freeze({
      ...pattern,
      placements: Object.freeze(pattern.placements.map((placement) => Object.freeze({
        squares: placement,
        squareBits: Object.freeze(placement.map((square) => 1n << BigInt(square))),
      }))),
    }))),
  });
}

export function patternIndexForPerspectiveBoardsBits(player, opponent, squareBits) {
  let index = 0;
  for (const bit of squareBits) {
    index *= 3;
    if ((player & bit) !== 0n) {
      index += 1;
    } else if ((opponent & bit) !== 0n) {
      index += 2;
    }
  }
  return index;
}

export function scorePatternBankBucket(bucket, preparedLayout, player, opponent, { captureDetails = false } = {}) {
  if (!bucket || !preparedLayout || preparedLayout.basePatterns.length === 0) {
    return captureDetails
      ? { totalContribution: 0, patternContribution: 0, bias: 0, entries: [] }
      : { totalContribution: 0, patternContribution: 0, bias: 0 };
  }

  const scale = Number.isFinite(bucket.scale) ? bucket.scale : 1;
  const bias = Number.isFinite(bucket.bias) ? bucket.bias : 0;
  let patternContribution = 0;
  const entries = captureDetails ? [] : null;

  for (let patternIndex = 0; patternIndex < preparedLayout.basePatterns.length; patternIndex += 1) {
    const basePattern = preparedLayout.basePatterns[patternIndex];
    const weights = bucket.patternWeights?.[patternIndex] ?? null;
    let patternSum = 0;
    const patternEntries = captureDetails ? [] : null;

    for (let placementIndex = 0; placementIndex < basePattern.placements.length; placementIndex += 1) {
      const placement = basePattern.placements[placementIndex];
      const entryIndex = patternIndexForPerspectiveBoardsBits(player, opponent, placement.squareBits);
      const rawValue = weights?.[entryIndex] ?? 0;
      const value = rawValue * scale;
      patternSum += value;
      if (captureDetails) {
        patternEntries.push({
          placementIndex,
          placement: placement.squares.map((square) => indexToCoord(square)),
          entryIndex,
          value,
        });
      }
    }

    patternContribution += patternSum;
    if (captureDetails) {
      entries.push({
        key: basePattern.key,
        placements: patternEntries,
        contribution: patternSum,
      });
    }
  }

  const totalContribution = patternContribution + bias;
  return captureDetails
    ? { totalContribution, patternContribution, bias, entries }
    : { totalContribution, patternContribution, bias };
}

export function estimatePatternBankLayoutFootprint(layoutSource, bucketCount, { bytesPerWeight = 2 } = {}) {
  const layout = resolvePatternBankLayout(layoutSource);
  const normalizedBucketCount = Math.max(1, Number(bucketCount) || 1);
  const weightsPerBucket = layout.totalTableSize;
  const totalWeights = weightsPerBucket * normalizedBucketCount;
  const rawPackedBytes = totalWeights * Math.max(1, Number(bytesPerWeight) || 2);
  return Object.freeze({
    basePatternCount: layout.basePatternCount,
    totalPlacementCount: layout.totalPlacementCount,
    weightsPerBucket,
    totalWeights,
    rawPackedBytes,
  });
}

export function summarizePatternBankProfile(profile) {
  const resolved = resolvePatternBankProfile(profile);
  if (!resolved) {
    return null;
  }
  return {
    version: resolved.version,
    name: resolved.name,
    layoutName: resolved.layout.name,
    basePatternCount: resolved.layout.basePatternCount,
    totalPlacementCount: resolved.layout.totalPlacementCount,
    totalTableSize: resolved.layout.totalTableSize,
    trainedBucketCount: resolved.trainedBuckets.length,
    bucketRanges: resolved.trainedBuckets.map((bucket) => ({
      key: bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      midpoint: midpointForBucket(bucket),
    })),
  };
}

export function relativePortablePath(targetPath, baseDir) {
  if (!targetPath) {
    return null;
  }
  const relative = baseDir ? baseDir : process.cwd();
  const portable = String(targetPath).replace(/\\/g, '/');
  return portable.startsWith('/') ? portable : portable;
}
