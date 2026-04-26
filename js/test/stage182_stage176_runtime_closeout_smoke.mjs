import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_KEYS,
  STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS,
  listStage176SurvivorBranchCandidates,
} from '../../tools/evaluator-training/stage176-survivor-branch-candidates.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

assert.deepEqual(STAGE176_ACTIVE_SURVIVOR_BRANCH_CANDIDATE_KEYS, []);
assert.equal(STAGE176_RETIRED_SURVIVOR_BRANCH_CANDIDATE_KEYS.length, 6);
assert.deepEqual(listStage176SurvivorBranchCandidates().map((candidate) => candidate.key), []);
assert.equal(listStage176SurvivorBranchCandidates({ includeRetired: true }).length, 6);

const requiredArtifacts = [
  path.join(repoRoot, 'tools', 'engine-match', 'out', 'stage181-trineutron-finals', 's176-finals-session01', 'final-summary.json'),
  path.join(repoRoot, 'tools', 'engine-match', 'out', 'stage181-trineutron-finals', 's176-finals-final-decision', 'final-decision.json'),
  path.join(repoRoot, 'docs', 'reports', 'review', 'review-stage-181-finals-session02-latecheck-and-final-decision.md'),
];
for (const artifactPath of requiredArtifacts) {
  assert.equal(fs.existsSync(artifactPath), true, `missing required closeout artifact: ${artifactPath}`);
}

console.log('stage182_stage176_runtime_closeout_smoke: ok');
