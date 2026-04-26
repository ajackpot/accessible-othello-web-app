import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const zebraFriendlyProfile = Object.freeze({
  version: 1,
  name: 'stage158-zebra-ladder-smoke',
  description: 'Provides multiple shallow-depth candidates so zebra ladder selection can filter them.',
  runtime: {
    enableHighCut: true,
    enableLowCut: false,
    maxWindow: 1,
    maxChecksPerNode: 4,
    minDepth: 2,
    minDepthGap: 2,
    maxDepthDistance: 4,
    minPly: 1,
    highScale: 1,
    lowScale: 1,
    depthDistanceScale: 1.25,
  },
  calibrations: [
    {
      key: 'zebra-20-30-d1-d8',
      label: '20-30 / d1→d8',
      minEmpties: 20,
      maxEmpties: 30,
      shallowDepth: 1,
      deepDepth: 8,
      usable: true,
      intercept: 5000,
      slope: 1,
      intervalHalfWidth: 600,
      recommendedZ: { z: 1, coverage: 1, intervalHalfWidth: 600 },
    },
    {
      key: 'zebra-20-30-d2-d8',
      label: '20-30 / d2→d8',
      minEmpties: 20,
      maxEmpties: 30,
      shallowDepth: 2,
      deepDepth: 8,
      usable: true,
      intercept: 5000,
      slope: 1,
      intervalHalfWidth: 600,
      recommendedZ: { z: 1, coverage: 1, intervalHalfWidth: 600 },
    },
    {
      key: 'zebra-20-30-d4-d8',
      label: '20-30 / d4→d8',
      minEmpties: 20,
      maxEmpties: 30,
      shallowDepth: 4,
      deepDepth: 8,
      usable: true,
      intercept: 5000,
      slope: 1,
      intervalHalfWidth: 600,
      recommendedZ: { z: 1, coverage: 1, intervalHalfWidth: 600 },
    },
    {
      key: 'zebra-20-30-d6-d8',
      label: '20-30 / d6→d8',
      minEmpties: 20,
      maxEmpties: 30,
      shallowDepth: 6,
      deepDepth: 8,
      usable: true,
      intercept: 5000,
      slope: 1,
      intervalHalfWidth: 600,
      recommendedZ: { z: 1, coverage: 1, intervalHalfWidth: 600 },
    },
  ],
});

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  maxDepth: 8,
  timeLimitMs: 2200,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  randomness: 0,
  maxTableEntries: 160000,
  wldPreExactEmpties: 0,
});

const engine = new SearchEngine({
  ...sharedOptions,
  mpcProfile: zebraFriendlyProfile,
  mpcStructureProfile: 'zebra-ladder-guarded-v1',
});

const selected = engine.selectMpcCalibrations(20, 8);
assert.ok(selected.length > 0, 'zebra ladder smoke should select at least one calibration.');
assert.ok(selected.every((calibration) => calibration.shallowDepth <= 3), 'zebra ladder selection should prefer shallow-depth candidates compatible with the late ladder cap at 20 empties.');
assert.ok((engine.stats?.mpcZebraLadderSelections ?? 0) > 0, 'zebra ladder selection should record usage telemetry.');
assert.ok((engine.stats?.mpcZebraLadderFiltered ?? 0) > 0, 'zebra ladder selection should record that it filtered at least one deeper candidate.');

const state = playSeededRandomUntilEmptyCount(30, 7);
const result = engine.findBestMove(state);
assert.equal(result.searchCompletion, 'complete', 'zebra ladder MPC smoke should complete.');
assert.ok((result.stats?.mpcZebraLadderSelections ?? 0) > 0, 'runtime search should also exercise zebra ladder selection.');

console.log('stage158 zebra ladder MPC smoke passed');
