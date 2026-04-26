import assert from 'node:assert/strict';

import {
  STAGE170_SURVIVOR_COMBO_CANDIDATE_KEYS,
  buildStage170SurvivorComboEngineOptions,
  listStage170SurvivorComboCandidates,
  resolveStage170SurvivorComboCandidate,
} from '../../tools/evaluator-training/stage170-survivor-combo-candidates.mjs';

assert.deepEqual(
  STAGE170_SURVIVOR_COMBO_CANDIDATE_KEYS,
  [
    's170-main-wide-zebra',
    's170-main-stable-verify',
    's170-main-frontier-zebra',
    's170-main-frontier-zebra-stabilized',
    's170-main-frontier-zebra-bothlite',
  ],
  'stage170 survivor combo lane should expose the kickoff integration candidates plus the frontier re-entry branches in priority order.',
);

const listedKeys = listStage170SurvivorComboCandidates({ includeAggressive: true }).map((candidate) => candidate.key);
assert.deepEqual(listedKeys, STAGE170_SURVIVOR_COMBO_CANDIDATE_KEYS);

const wideZebra = resolveStage170SurvivorComboCandidate('s170-main-wide-zebra');
assert.equal(wideZebra.familyKey, 'stage154-main-recenter');
assert.equal(wideZebra.moveOrderingSourceCandidate.key, 's157-main-wide-hybrid');
assert.equal(wideZebra.mpcSourceCandidate.key, 's154-stable-zebra');
assert.equal(wideZebra.moveOrderingStructureProfile.key, 'wide-hybrid-v1');
assert.equal(wideZebra.mpcStructureProfile.key, 'stage154-zebra-guarded-v1');

const stableVerify = buildStage170SurvivorComboEngineOptions('s170-main-stable-verify');
assert.equal(stableVerify.moveOrderingStructureProfile.key, 'stage154-stable-quiet-v1');
assert.equal(stableVerify.mpcStructureProfile.key, 'verify-tight-v1');

const frontierZebra = resolveStage170SurvivorComboCandidate('s170-main-frontier-zebra');
assert.equal(frontierZebra.moveOrderingStructureProfile.key, 'late-potential-frontier-v1');
assert.equal(frontierZebra.mpcStructureProfile.key, 'stage154-zebra-guarded-v1');

const frontierZebraStabilized = resolveStage170SurvivorComboCandidate('s170-main-frontier-zebra-stabilized');
assert.equal(frontierZebraStabilized.moveOrderingSourceCandidate.key, 's157-main-frontier-gate');
assert.equal(frontierZebraStabilized.moveOrderingStructureProfile.key, 'stage170-frontier-stabilized-v1');
assert.equal(frontierZebraStabilized.mpcStructureProfile.key, 'stage154-zebra-guarded-v1');

const frontierZebraBothlite = resolveStage170SurvivorComboCandidate('s170-main-frontier-zebra-bothlite');
assert.equal(frontierZebraBothlite.moveOrderingSourceCandidate.key, 's157-main-frontier-gate');
assert.equal(frontierZebraBothlite.moveOrderingStructureProfile.key, 'late-potential-frontier-v1');
assert.equal(frontierZebraBothlite.mpcStructureProfile.key, 'stage170-frontier-zebra-bothlite-v1');

const nonAggressiveKeys = listStage170SurvivorComboCandidates({ includeAggressive: false }).map((candidate) => candidate.key);
assert.deepEqual(
  nonAggressiveKeys,
  [
    's170-main-stable-verify',
    's170-main-frontier-zebra',
    's170-main-frontier-zebra-stabilized',
    's170-main-frontier-zebra-bothlite',
  ],
  'excluding aggressive candidates should drop only the wide-zebra combo in the survivor lane while retaining frontier re-entry branches.',
);

console.log('stage170 survivor combo smoke passed');
