import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const gateHeavyProfile = Object.freeze({
  version: 1,
  name: 'stage157-static-gate-smoke',
  description: 'Forces the static gate candidate to skip otherwise legal MPC probes.',
  runtime: {
    enableHighCut: true,
    enableLowCut: false,
    maxWindow: 1,
    maxChecksPerNode: 1,
    minDepth: 2,
    minDepthGap: 2,
    maxDepthDistance: 1,
    minPly: 1,
    highScale: 1,
    lowScale: 1,
    depthDistanceScale: 1.25,
  },
  calibrations: [
    {
      key: 'gate-heavy-18-40-d4-d8',
      label: '18-40 / d4→d8',
      minEmpties: 18,
      maxEmpties: 40,
      shallowDepth: 4,
      deepDepth: 8,
      usable: true,
      intercept: -500000,
      slope: 1,
      intervalHalfWidth: 400,
      recommendedZ: {
        z: 1,
        coverage: 1,
        intervalHalfWidth: 400,
      },
    },
  ],
});

const verificationFriendlyProfile = Object.freeze({
  version: 1,
  name: 'stage157-verification-smoke',
  description: 'Uses a threshold near beta so verification probes fire on cut candidates.',
  runtime: {
    enableHighCut: true,
    enableLowCut: false,
    maxWindow: 1,
    maxChecksPerNode: 1,
    minDepth: 2,
    minDepthGap: 2,
    maxDepthDistance: 1,
    minPly: 1,
    highScale: 1,
    lowScale: 1,
    depthDistanceScale: 1.25,
  },
  calibrations: [
    {
      key: 'verify-18-40-d4-d8',
      label: '18-40 / d4→d8',
      minEmpties: 18,
      maxEmpties: 40,
      shallowDepth: 4,
      deepDepth: 8,
      usable: true,
      intercept: 5000,
      slope: 1,
      intervalHalfWidth: 1000,
      recommendedZ: {
        z: 1,
        coverage: 1,
        intervalHalfWidth: 1000,
      },
    },
  ],
});

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 8,
  timeLimitMs: 2500,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  randomness: 0,
  maxTableEntries: 140000,
  wldPreExactEmpties: 0,
});

function runBaselineGateSmoke(state) {
  const engine = new SearchEngine({
    ...sharedOptions,
    mpcProfile: gateHeavyProfile,
    mpcStructureProfile: 'baseline-v1',
  });
  return engine.findBestMove(state);
}

function runStaticGateSmoke(state) {
  const engine = new SearchEngine({
    ...sharedOptions,
    mpcProfile: gateHeavyProfile,
    mpcStructureProfile: 'static-gate-v1',
  });
  return engine.findBestMove(state);
}

function runVerificationSmoke(state) {
  const engine = new SearchEngine({
    ...sharedOptions,
    mpcProfile: verificationFriendlyProfile,
    mpcStructureProfile: {
      key: 'stage157-force-verify-smoke',
      verificationEnabled: true,
      verificationMinDepth: 5,
      verificationBandScale: 1.5,
      verificationDepthOffset: 1,
    },
  });
  return engine.findBestMove(state);
}

function* candidateStateSpecs() {
  const preferred = [
    { empties: 30, seed: 1 },
    { empties: 30, seed: 7 },
    { empties: 28, seed: 1 },
    { empties: 28, seed: 7 },
    { empties: 30, seed: 29 },
  ];
  for (const spec of preferred) {
    yield spec;
  }

  for (const empties of [30, 28, 26, 24, 22, 20, 18]) {
    for (let seed = 1; seed <= 64; seed += 1) {
      yield { empties, seed };
    }
  }
}

function findMpcStructureSmokeCase() {
  const visited = new Set();
  for (const spec of candidateStateSpecs()) {
    const specKey = `${spec.empties}:${spec.seed}`;
    if (visited.has(specKey)) {
      continue;
    }
    visited.add(specKey);

    const state = playSeededRandomUntilEmptyCount(spec.empties, spec.seed);
    const gateBaselineResult = runBaselineGateSmoke(state);
    if ((gateBaselineResult.stats?.mpcProbes ?? 0) <= 0) {
      continue;
    }

    const staticGateResult = runStaticGateSmoke(state);
    if ((staticGateResult.stats?.mpcStaticEvalSkips ?? 0) <= 0) {
      continue;
    }

    const verificationResult = runVerificationSmoke(state);
    const verificationOutcomeCount = (verificationResult.stats?.mpcVerificationPasses ?? 0)
      + (verificationResult.stats?.mpcVerificationFailures ?? 0);
    if ((verificationResult.stats?.mpcHighCutoffs ?? 0) <= 0) {
      continue;
    }
    if ((verificationResult.stats?.mpcVerificationProbes ?? 0) <= 0) {
      continue;
    }
    if (verificationOutcomeCount <= 0) {
      continue;
    }

    return {
      state,
      spec,
      gateBaselineResult,
      staticGateResult,
      verificationResult,
    };
  }

  throw new Error('Unable to find a representative MPC structure smoke state with the current runtime profile.');
}

const {
  spec,
  gateBaselineResult,
  staticGateResult,
  verificationResult,
} = findMpcStructureSmokeCase();

assert.equal(gateBaselineResult.searchCompletion, 'complete', 'Baseline MPC gate smoke should complete.');
assert.ok((gateBaselineResult.stats?.mpcProbes ?? 0) > 0, 'Baseline MPC gate smoke should execute at least one probe.');

assert.equal(staticGateResult.searchCompletion, 'complete', 'Static-gated MPC smoke should complete.');
assert.equal(staticGateResult.options?.mpcStructureProfile?.key, 'static-gate-v1');
assert.ok((staticGateResult.stats?.mpcStaticEvalSkips ?? 0) > 0, 'Static-gated MPC smoke should skip at least one probe via the evaluator gate.');

assert.equal(verificationResult.searchCompletion, 'complete', 'Verification MPC smoke should complete.');
assert.ok((verificationResult.stats?.mpcHighCutoffs ?? 0) > 0, 'Verification MPC smoke should still produce fail-high cutoffs.');
assert.ok((verificationResult.stats?.mpcVerificationProbes ?? 0) > 0, 'Verification MPC smoke should execute at least one verification probe.');
assert.ok(
  (verificationResult.stats?.mpcVerificationPasses ?? 0) + (verificationResult.stats?.mpcVerificationFailures ?? 0) > 0,
  'Verification MPC smoke should record at least one verification outcome.',
);

console.log(`stage157 MPC structure smoke passed (empties=${spec.empties}, seed=${spec.seed})`);
