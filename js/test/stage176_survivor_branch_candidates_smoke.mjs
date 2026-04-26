import assert from 'node:assert/strict';

import {
  STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_KEYS,
  STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS,
  STAGE176_SURVIVOR_BRANCH_CANDIDATE_KEYS,
  resolveStage176SurvivorBranchCandidate,
} from '../../tools/evaluator-training/stage176-survivor-branch-candidates.mjs';

assert.equal(STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_KEYS.length, 0);
assert.equal(STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS.length, 6);
assert.equal(STAGE176_SURVIVOR_BRANCH_CANDIDATE_KEYS.length, 6);

for (const key of STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS) {
  assert.throws(() => resolveStage176SurvivorBranchCandidate(key), /Retired stage176 survivor branch candidate/);
  const candidate = resolveStage176SurvivorBranchCandidate(key, { allowRetired: true });
  assert.equal(candidate.familyKey, 'stage154-main-recenter');
  assert.ok(candidate.moduleAbsolutePath.endsWith('.generated.js'));
  assert.ok(candidate.moveOrderingStructureProfile?.key);
  assert.ok(candidate.mpcStructureProfile?.key);
  assert.equal(candidate.retired, true);
}

console.log('stage176_survivor_branch_candidates_smoke: ok');
