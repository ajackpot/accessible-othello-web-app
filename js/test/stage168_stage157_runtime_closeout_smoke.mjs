import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import {
  resolveMoveOrderingStructureProfile,
  resolveMpcStructureProfile,
} from '../ai/search-structure-profiles.js';
import {
  STAGE157_ACTIVE_MAINLINE_CANDIDATE_KEYS,
  buildStage157StructuralEngineOptions,
  listStage157StructuralCandidates,
  resolveStage157StructuralCandidate,
} from '../../tools/evaluator-training/stage157-structural-candidates.mjs';

assert.equal(resolveMoveOrderingStructureProfile('wide-hybrid-v1').key, 'wide-hybrid-v1');
assert.equal(resolveMpcStructureProfile('verify-tight-v1').key, 'verify-tight-v1');

assert.deepEqual(
  STAGE157_ACTIVE_MAINLINE_CANDIDATE_KEYS,
  [
    's157-main-control',
    's157-main-wide-hybrid',
    's157-main-frontier-gate',
    's157-main-assertive-both',
  ],
  'stage157 mainline active set should keep only control plus the three adopted candidates.',
);

const listedStage154MainCandidates = listStage157StructuralCandidates({
  familyKey: 'stage154-main-recenter',
  includeAggressive: true,
}).map((candidate) => candidate.key);

assert.deepEqual(
  listedStage154MainCandidates,
  [
    's157-main-control',
    's157-main-wide-hybrid',
    's157-main-frontier-gate',
    's157-main-assertive-both',
  ],
  'stage154 stage157 candidate registry should exclude rejected mainline candidates after closeout.',
);

const wideHybridCandidate = resolveStage157StructuralCandidate('s157-main-wide-hybrid');
assert.equal(wideHybridCandidate.moveOrderingStructureProfile.key, 'wide-hybrid-v1');
assert.equal(wideHybridCandidate.mpcStructureProfile.key, 'verify-tight-v1');

const wideHybridEngineOptions = buildStage157StructuralEngineOptions('s157-main-wide-hybrid');
assert.equal(wideHybridEngineOptions.moveOrderingStructureProfile.key, 'wide-hybrid-v1');
assert.equal(wideHybridEngineOptions.mpcStructureProfile.key, 'verify-tight-v1');

for (const retiredKey of [
  's157-main-order-only',
  's157-main-mpc-only',
  's157-main-anchor',
  's157-main-tight-probe',
  's157-main-exact-safe',
  's157-main-soft-both',
]) {
  assert.throws(
    () => resolveStage157StructuralCandidate(retiredKey),
    /Unknown stage157 structural candidate/,
    `${retiredKey} should be retired from the live stage157 candidate registry.`,
  );
}

const defaultEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
});
assert.equal(defaultEngine.options.moveOrderingStructureProfile?.key, 'baseline-v1');
assert.equal(defaultEngine.options.mpcStructureProfile?.key, 'baseline-v1');

console.log('stage168 stage157 runtime closeout smoke passed');
