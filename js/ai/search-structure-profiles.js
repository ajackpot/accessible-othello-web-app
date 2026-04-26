const DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY = 'baseline-v1';
const DEFAULT_MPC_STRUCTURE_PROFILE_KEY = 'baseline-v1';

const EXACT_FASTEST_FIRST_MODES = Object.freeze([
  'reply-count',
  'parity-reply',
  'square-parity-reply',
]);

const MPC_SELECTION_MODES = Object.freeze([
  'default',
  'zebra-ladder',
]);

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function clampNullableInteger(value, fallback, min, max) {
  if (value === null) {
    return null;
  }
  return clampInteger(value, fallback, min, max);
}

function clampNumber(value, fallback, min, max, decimals = 3) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.max(min, Math.min(max, parsed));
  return Number(clamped.toFixed(decimals));
}

function sanitizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeEnum(value, fallback, allowedValues) {
  if (typeof value !== 'string') {
    return fallback;
  }
  return allowedValues.includes(value) ? value : fallback;
}

function normalizeRuntimeOverrides(runtimeOverrides = null) {
  if (!runtimeOverrides || typeof runtimeOverrides !== 'object') {
    return null;
  }

  const normalized = {};
  if (Object.hasOwn(runtimeOverrides, 'enableHighCut')) {
    normalized.enableHighCut = Boolean(runtimeOverrides.enableHighCut);
  }
  if (Object.hasOwn(runtimeOverrides, 'enableLowCut')) {
    normalized.enableLowCut = Boolean(runtimeOverrides.enableLowCut);
  }
  if (Object.hasOwn(runtimeOverrides, 'maxWindow')) {
    normalized.maxWindow = clampInteger(runtimeOverrides.maxWindow, 1, 1, 64);
  }
  if (Object.hasOwn(runtimeOverrides, 'maxChecksPerNode')) {
    normalized.maxChecksPerNode = clampInteger(runtimeOverrides.maxChecksPerNode, 1, 1, 8);
  }
  if (Object.hasOwn(runtimeOverrides, 'minDepth')) {
    normalized.minDepth = clampInteger(runtimeOverrides.minDepth, 2, 1, 64);
  }
  if (Object.hasOwn(runtimeOverrides, 'minDepthGap')) {
    normalized.minDepthGap = clampInteger(runtimeOverrides.minDepthGap, 2, 1, 64);
  }
  if (Object.hasOwn(runtimeOverrides, 'maxDepthDistance')) {
    normalized.maxDepthDistance = clampInteger(runtimeOverrides.maxDepthDistance, 1, 0, 64);
  }
  if (Object.hasOwn(runtimeOverrides, 'minPly')) {
    normalized.minPly = clampInteger(runtimeOverrides.minPly, 1, 0, 64);
  }
  if (Object.hasOwn(runtimeOverrides, 'highScale')) {
    normalized.highScale = clampNumber(runtimeOverrides.highScale, 1, 0, 5, 3);
  }
  if (Object.hasOwn(runtimeOverrides, 'lowScale')) {
    normalized.lowScale = clampNumber(runtimeOverrides.lowScale, 1, 0, 5, 3);
  }
  if (Object.hasOwn(runtimeOverrides, 'depthDistanceScale')) {
    normalized.depthDistanceScale = clampNumber(runtimeOverrides.depthDistanceScale, 1.25, 1, 5, 3);
  }

  return Object.keys(normalized).length > 0
    ? Object.freeze(normalized)
    : null;
}

const MOVE_ORDERING_STRUCTURE_LIBRARY = Object.freeze({
  'baseline-v1': Object.freeze({
    key: 'baseline-v1',
    priority: 0,
    label: 'Baseline ordering',
    description: '현재 stage156 ordering 구조를 그대로 유지합니다.',
    ttOrderingMinDepth: 0,
    ttOrderingDepthSlack: null,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: null,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 0,
    frontierWeight: 0,
    shallowProbeEnabled: false,
    shallowProbeTopK: 0,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 20,
    shallowProbeMinDepthRemaining: 5,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 32,
    exactFastestFirstMode: 'reply-count',
  }),
  'tt-depth-gated-v1': Object.freeze({
    key: 'tt-depth-gated-v1',
    priority: 1,
    label: 'TT depth-gated ordering',
    description: '상대적으로 얕은 TT child ordering 신호를 late/deep node에서 무시합니다.',
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
  }),
  'late-topk-lite-v1': Object.freeze({
    key: 'late-topk-lite-v1',
    priority: 2,
    label: 'Late top-K lightweight ordering',
    description: 'late lightweight evaluator를 1차 정렬 후 top-K 후보에만 적용합니다.',
    lightweightEvalTopK: 4,
    lightweightEvalMinDepthRemaining: 2,
  }),
  'late-potential-frontier-v1': Object.freeze({
    key: 'late-potential-frontier-v1',
    priority: 3,
    label: 'Late potential/frontier ordering',
    description: '상대 potential mobility 억제와 frontier 정리를 ordering 신호로 추가합니다.',
    potentialMobilityWeight: 950,
    frontierWeight: 700,
  }),
  'late-topk-probe-v1': Object.freeze({
    key: 'late-topk-probe-v1',
    priority: 4,
    label: 'Late shallow-probe ordering',
    description: 'top-K 후보에 reduced-depth probe를 추가합니다.',
    lightweightEvalTopK: 4,
    lightweightEvalMinDepthRemaining: 2,
    shallowProbeEnabled: true,
    shallowProbeTopK: 2,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 22,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 42,
  }),
  'exact-parity-reply-v1': Object.freeze({
    key: 'exact-parity-reply-v1',
    priority: 5,
    label: 'Exact parity/reply ordering',
    description: 'exact fastest-first ordering에서 parity와 square class tie-break를 우선 반영합니다.',
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'hybrid-main-v1': Object.freeze({
    key: 'hybrid-main-v1',
    priority: 6,
    label: 'Hybrid main ordering',
    description: 'TT depth gating + late top-K + potential/frontier + exact parity ordering을 결합합니다.',
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 4,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 950,
    frontierWeight: 700,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'hybrid-probe-v1': Object.freeze({
    key: 'hybrid-probe-v1',
    priority: 7,
    label: 'Hybrid probe ordering',
    description: 'Hybrid main 위에 top-K reduced-depth probe를 추가합니다.',
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 4,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 950,
    frontierWeight: 700,
    shallowProbeEnabled: true,
    shallowProbeTopK: 2,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 22,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 42,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stable-quiet-v1': Object.freeze({
    key: 'stable-quiet-v1',
    priority: 8,
    label: 'Stable/quiet ordering',
    description: 'Edax식 안정성 편향과 Othello-sensei식 quiet/edge endpoint 힌트를 late ordering에 추가합니다.',
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 4,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 900,
    frontierWeight: 600,
    stabilityBoundWeight: 2200,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 24,
    quietMoveWeight: 12000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 26,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 9000,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 30,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'stable-quiet-probe-v1': Object.freeze({
    key: 'stable-quiet-probe-v1',
    priority: 9,
    label: 'Stable/quiet probe ordering',
    description: 'Stable/quiet ordering 위에 top-K reduced-depth probe를 더한 구조입니다.',
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 4,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 900,
    frontierWeight: 600,
    stabilityBoundWeight: 2200,
    stabilityMinEmpties: 0,
    stabilityMaxEmpties: 24,
    quietMoveWeight: 12000,
    quietMoveMinEmpties: 0,
    quietMoveMaxEmpties: 26,
    quietMoveMaxAdjacentEmpties: 0,
    edgeEndpointWeight: 9000,
    edgeEndpointMinEmpties: 8,
    edgeEndpointMaxEmpties: 30,
    shallowProbeEnabled: true,
    shallowProbeTopK: 2,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 22,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 36,
    exactFastestFirstMode: 'square-parity-reply',
  }),
  'wide-hybrid-v1': Object.freeze({
    key: 'wide-hybrid-v1',
    priority: 10,
    label: 'Wide hybrid ordering',
    description: 'Stage157 closeout 채택분. wider top-K + mobility/frontier + shallow probe를 넓은 empties 구간에 적용합니다.',
    ttOrderingMinDepth: 2,
    ttOrderingDepthSlack: 2,
    allowExactTtOrderingWhenShallow: true,
    lightweightEvalTopK: 6,
    lightweightEvalMinDepthRemaining: 2,
    potentialMobilityWeight: 1150,
    frontierWeight: 650,
    shallowProbeEnabled: true,
    shallowProbeTopK: 3,
    shallowProbeMinEmpties: 10,
    shallowProbeMaxEmpties: 24,
    shallowProbeMinDepthRemaining: 6,
    shallowProbeDepth: 2,
    shallowProbeScoreScale: 38,
    exactFastestFirstMode: 'square-parity-reply',
  }),
});

const MPC_STRUCTURE_LIBRARY = Object.freeze({
  'baseline-v1': Object.freeze({
    key: 'baseline-v1',
    priority: 0,
    label: 'Baseline MPC',
    description: '현재 stage156 conservative MPC 구조를 그대로 유지합니다.',
    staticEvalGateEnabled: false,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.9,
    staticEvalGateScaleLow: 0.9,
    volatilityGuardEnabled: false,
    volatilityMinEmpties: 0,
    volatilityMaxEmpties: 60,
    volatilityMaxLegalMoves: null,
    volatilitySkipCornerAvailable: false,
    verificationEnabled: false,
    verificationMinDepth: 5,
    verificationBandScale: 0.35,
    verificationDepthOffset: 1,
    runtimeOverrides: null,
  }),
  'static-gate-v1': Object.freeze({
    key: 'static-gate-v1',
    priority: 1,
    label: 'Static-gated MPC',
    description: 'depth-0 evaluator gate를 통과한 경우에만 MPC probe를 시작합니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.85,
    staticEvalGateScaleLow: 0.85,
  }),
  'verify-near-v1': Object.freeze({
    key: 'verify-near-v1',
    priority: 2,
    label: 'Verification MPC',
    description: 'threshold에 근접한 MPC cutoff는 한 단계 더 검증합니다.',
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.28,
    verificationDepthOffset: 1,
  }),
  'volatility-guard-v1': Object.freeze({
    key: 'volatility-guard-v1',
    priority: 3,
    label: 'Volatility-guarded MPC',
    description: 'legal move가 많거나 corner tacticality가 큰 노드에서는 MPC를 건너뜁니다.',
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 18,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 10,
    volatilitySkipCornerAvailable: true,
  }),
  'conservative-hybrid-v1': Object.freeze({
    key: 'conservative-hybrid-v1',
    priority: 4,
    label: 'Conservative hybrid MPC',
    description: 'static gate + volatility guard + near-threshold verification을 결합합니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.85,
    staticEvalGateScaleLow: 0.85,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 18,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 10,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.28,
    verificationDepthOffset: 1,
  }),
  'soft-both-v1': Object.freeze({
    key: 'soft-both-v1',
    priority: 5,
    label: 'Soft both-side MPC',
    description: 'low-cut을 런타임에서 허용하고 static gate/verification으로 완충합니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.9,
    staticEvalGateScaleLow: 0.95,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.22,
    verificationDepthOffset: 1,
    runtimeOverrides: {
      enableHighCut: true,
      enableLowCut: true,
    },
  }),
  'assertive-both-v1': Object.freeze({
    key: 'assertive-both-v1',
    priority: 6,
    label: 'Assertive both-side MPC',
    description: 'low-cut 허용 + maxWindow/maxChecks 완화까지 포함한 공격적 MPC 후보입니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.95,
    staticEvalGateScaleLow: 1.0,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.18,
    verificationDepthOffset: 1,
    runtimeOverrides: {
      enableHighCut: true,
      enableLowCut: true,
      maxChecksPerNode: 3,
      maxWindow: 2,
    },
  }),
  'zebra-ladder-v1': Object.freeze({
    key: 'zebra-ladder-v1',
    priority: 7,
    label: 'Zebra ladder MPC',
    description: 'Zebra식 late shallow-depth ladder 선호를 MPC calibration 선택 순서에 반영합니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.85,
    staticEvalGateScaleLow: 0.88,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
  }),
  'zebra-ladder-guarded-v1': Object.freeze({
    key: 'zebra-ladder-guarded-v1',
    priority: 8,
    label: 'Guarded Zebra ladder MPC',
    description: 'Zebra식 ladder selection에 volatility guard를 같이 둔 보수적 후보입니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 13,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.84,
    staticEvalGateScaleLow: 0.88,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 13,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 9,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
    selectionMode: 'zebra-ladder',
  }),
  'verify-tight-v1': Object.freeze({
    key: 'verify-tight-v1',
    priority: 9,
    label: 'Tight verification MPC',
    description: 'Stage157 closeout 채택분. static gate + volatility guard + near-threshold verification을 baseline보다 조금 더 타이트하게 적용합니다.',
    staticEvalGateEnabled: true,
    staticEvalGateMinDepth: 3,
    staticEvalGateMinEmpties: 18,
    staticEvalGateMaxEmpties: 60,
    staticEvalGateScaleHigh: 0.82,
    staticEvalGateScaleLow: 0.86,
    volatilityGuardEnabled: true,
    volatilityMinEmpties: 18,
    volatilityMaxEmpties: 42,
    volatilityMaxLegalMoves: 9,
    volatilitySkipCornerAvailable: true,
    verificationEnabled: true,
    verificationMinDepth: 5,
    verificationBandScale: 0.24,
    verificationDepthOffset: 1,
  }),
});

function normalizeMoveOrderingStructureProfile(profile = DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY) {
  const source = typeof profile === 'string'
    ? (MOVE_ORDERING_STRUCTURE_LIBRARY[profile] ?? MOVE_ORDERING_STRUCTURE_LIBRARY[DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY])
    : ((profile && typeof profile === 'object')
      ? { ...MOVE_ORDERING_STRUCTURE_LIBRARY[DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY], ...profile }
      : MOVE_ORDERING_STRUCTURE_LIBRARY[DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY]);

  return Object.freeze({
    key: typeof source.key === 'string' && source.key.trim() !== ''
      ? source.key.trim()
      : DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY,
    label: typeof source.label === 'string' && source.label.trim() !== ''
      ? source.label.trim()
      : 'Move-ordering structure profile',
    description: typeof source.description === 'string'
      ? source.description
      : '',
    priority: clampInteger(source.priority, 0, 0, 999),
    ttOrderingMinDepth: clampInteger(source.ttOrderingMinDepth, 0, 0, 64),
    ttOrderingDepthSlack: clampNullableInteger(source.ttOrderingDepthSlack, null, 0, 64),
    allowExactTtOrderingWhenShallow: sanitizeBoolean(source.allowExactTtOrderingWhenShallow, true),
    lightweightEvalTopK: clampNullableInteger(source.lightweightEvalTopK, null, 1, 64),
    lightweightEvalMinDepthRemaining: clampInteger(source.lightweightEvalMinDepthRemaining, 2, 1, 32),
    potentialMobilityWeight: clampNumber(source.potentialMobilityWeight, 0, -100000, 100000, 0),
    frontierWeight: clampNumber(source.frontierWeight, 0, -100000, 100000, 0),
    stabilityBoundWeight: clampNumber(source.stabilityBoundWeight, 0, -100000, 100000, 0),
    stabilityMinEmpties: clampInteger(source.stabilityMinEmpties, 0, 0, 60),
    stabilityMaxEmpties: clampInteger(source.stabilityMaxEmpties, 60, 0, 60),
    quietMoveWeight: clampNumber(source.quietMoveWeight, 0, -100000, 100000, 0),
    quietMoveMinEmpties: clampInteger(source.quietMoveMinEmpties, 0, 0, 60),
    quietMoveMaxEmpties: clampInteger(source.quietMoveMaxEmpties, 60, 0, 60),
    quietMoveMaxAdjacentEmpties: clampInteger(source.quietMoveMaxAdjacentEmpties, 0, 0, 8),
    edgeEndpointWeight: clampNumber(source.edgeEndpointWeight, 0, -100000, 100000, 0),
    edgeEndpointMinEmpties: clampInteger(source.edgeEndpointMinEmpties, 0, 0, 60),
    edgeEndpointMaxEmpties: clampInteger(source.edgeEndpointMaxEmpties, 60, 0, 60),
    shallowProbeEnabled: sanitizeBoolean(source.shallowProbeEnabled, false),
    shallowProbeTopK: clampInteger(source.shallowProbeTopK, 0, 0, 16),
    shallowProbeMinEmpties: clampInteger(source.shallowProbeMinEmpties, 10, 0, 60),
    shallowProbeMaxEmpties: clampInteger(source.shallowProbeMaxEmpties, 20, 0, 60),
    shallowProbeMinDepthRemaining: clampInteger(source.shallowProbeMinDepthRemaining, 5, 1, 64),
    shallowProbeDepth: clampInteger(source.shallowProbeDepth, 2, 1, 8),
    shallowProbeScoreScale: clampNumber(source.shallowProbeScoreScale, 32, 0, 512, 0),
    exactFastestFirstMode: sanitizeEnum(source.exactFastestFirstMode, 'reply-count', EXACT_FASTEST_FIRST_MODES),
  });
}

function normalizeMpcStructureProfile(profile = DEFAULT_MPC_STRUCTURE_PROFILE_KEY) {
  const source = typeof profile === 'string'
    ? (MPC_STRUCTURE_LIBRARY[profile] ?? MPC_STRUCTURE_LIBRARY[DEFAULT_MPC_STRUCTURE_PROFILE_KEY])
    : ((profile && typeof profile === 'object')
      ? { ...MPC_STRUCTURE_LIBRARY[DEFAULT_MPC_STRUCTURE_PROFILE_KEY], ...profile }
      : MPC_STRUCTURE_LIBRARY[DEFAULT_MPC_STRUCTURE_PROFILE_KEY]);

  return Object.freeze({
    key: typeof source.key === 'string' && source.key.trim() !== ''
      ? source.key.trim()
      : DEFAULT_MPC_STRUCTURE_PROFILE_KEY,
    label: typeof source.label === 'string' && source.label.trim() !== ''
      ? source.label.trim()
      : 'MPC structure profile',
    description: typeof source.description === 'string'
      ? source.description
      : '',
    priority: clampInteger(source.priority, 0, 0, 999),
    staticEvalGateEnabled: sanitizeBoolean(source.staticEvalGateEnabled, false),
    staticEvalGateMinDepth: clampInteger(source.staticEvalGateMinDepth, 3, 1, 64),
    staticEvalGateMinEmpties: clampInteger(source.staticEvalGateMinEmpties, 18, 0, 60),
    staticEvalGateMaxEmpties: clampInteger(source.staticEvalGateMaxEmpties, 60, 0, 60),
    staticEvalGateScaleHigh: clampNumber(source.staticEvalGateScaleHigh, 0.9, 0, 5, 3),
    staticEvalGateScaleLow: clampNumber(source.staticEvalGateScaleLow, 0.9, 0, 5, 3),
    volatilityGuardEnabled: sanitizeBoolean(source.volatilityGuardEnabled, false),
    volatilityMinEmpties: clampInteger(source.volatilityMinEmpties, 0, 0, 60),
    volatilityMaxEmpties: clampInteger(source.volatilityMaxEmpties, 60, 0, 60),
    volatilityMaxLegalMoves: clampNullableInteger(source.volatilityMaxLegalMoves, null, 1, 32),
    volatilitySkipCornerAvailable: sanitizeBoolean(source.volatilitySkipCornerAvailable, false),
    verificationEnabled: sanitizeBoolean(source.verificationEnabled, false),
    verificationMinDepth: clampInteger(source.verificationMinDepth, 5, 1, 64),
    verificationBandScale: clampNumber(source.verificationBandScale, 0.35, 0, 1.5, 3),
    verificationDepthOffset: clampInteger(source.verificationDepthOffset, 1, 1, 4),
    selectionMode: sanitizeEnum(source.selectionMode, 'default', MPC_SELECTION_MODES),
    runtimeOverrides: normalizeRuntimeOverrides(source.runtimeOverrides),
  });
}

const NORMALIZED_MOVE_ORDERING_STRUCTURE_LIBRARY = Object.freeze(Object.fromEntries(
  Object.entries(MOVE_ORDERING_STRUCTURE_LIBRARY).map(([key, profile]) => [key, normalizeMoveOrderingStructureProfile({ ...profile, key })]),
));

const NORMALIZED_MPC_STRUCTURE_LIBRARY = Object.freeze(Object.fromEntries(
  Object.entries(MPC_STRUCTURE_LIBRARY).map(([key, profile]) => [key, normalizeMpcStructureProfile({ ...profile, key })]),
));

export {
  DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY,
  DEFAULT_MPC_STRUCTURE_PROFILE_KEY,
  EXACT_FASTEST_FIRST_MODES,
  MPC_SELECTION_MODES,
  MOVE_ORDERING_STRUCTURE_LIBRARY,
  MPC_STRUCTURE_LIBRARY,
  NORMALIZED_MOVE_ORDERING_STRUCTURE_LIBRARY,
  NORMALIZED_MPC_STRUCTURE_LIBRARY,
  normalizeMoveOrderingStructureProfile,
  normalizeMpcStructureProfile,
};

export function resolveMoveOrderingStructureProfile(profile = DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY) {
  if (typeof profile === 'string') {
    return NORMALIZED_MOVE_ORDERING_STRUCTURE_LIBRARY[profile]
      ?? NORMALIZED_MOVE_ORDERING_STRUCTURE_LIBRARY[DEFAULT_MOVE_ORDERING_STRUCTURE_PROFILE_KEY];
  }
  return normalizeMoveOrderingStructureProfile(profile);
}

export function resolveMpcStructureProfile(profile = DEFAULT_MPC_STRUCTURE_PROFILE_KEY) {
  if (typeof profile === 'string') {
    return NORMALIZED_MPC_STRUCTURE_LIBRARY[profile]
      ?? NORMALIZED_MPC_STRUCTURE_LIBRARY[DEFAULT_MPC_STRUCTURE_PROFILE_KEY];
  }
  return normalizeMpcStructureProfile(profile);
}
