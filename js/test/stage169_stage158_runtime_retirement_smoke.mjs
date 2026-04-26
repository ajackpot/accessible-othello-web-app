import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STAGE158_ACTIVE_MAINLINE_CANDIDATE_KEYS,
  STAGE158_RETIRED_MAINLINE_CANDIDATE_KEYS,
  buildStage158StructuralEngineOptions,
  listStage158StructuralCandidates,
  resolveStage158StructuralCandidate,
} from '../../tools/evaluator-training/stage158-structural-candidates.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

assert.deepEqual(
  STAGE158_ACTIVE_MAINLINE_CANDIDATE_KEYS,
  [
    's154-control',
    's154-stable-zebra',
  ],
  'stage158 mainline active set should keep only control plus the reinforced-retained survivor.',
);

assert.deepEqual(
  STAGE158_RETIRED_MAINLINE_CANDIDATE_KEYS,
  [
    's154-anchor-main',
    's154-stable-quiet',
    's154-stable-quiet-probe',
    's154-stable-zebra-open',
    's154-zebra-both-probe',
  ],
  'stage158 retired mainline key list should match the direct-pair/reinforced non-selected set.',
);

const listedStage154MainCandidates = listStage158StructuralCandidates({
  familyKey: 'stage154-main-recenter',
  includeAggressive: true,
}).map((candidate) => candidate.key);

assert.deepEqual(
  listedStage154MainCandidates,
  [
    's154-control',
    's154-stable-zebra',
  ],
  'stage158 stage154-main candidate registry should exclude retired mainline keys after closeout.',
);

const survivor = resolveStage158StructuralCandidate('s154-stable-zebra');
assert.equal(survivor.retired, false);
assert.equal(survivor.moveOrderingStructureProfile.key, 'stage154-stable-quiet-v1');
assert.equal(survivor.mpcStructureProfile.key, 'stage154-zebra-guarded-v1');

const survivorEngineOptions = buildStage158StructuralEngineOptions('s154-stable-zebra');
assert.equal(survivorEngineOptions.moveOrderingStructureProfile.key, 'stage154-stable-quiet-v1');
assert.equal(survivorEngineOptions.mpcStructureProfile.key, 'stage154-zebra-guarded-v1');

for (const retiredKey of STAGE158_RETIRED_MAINLINE_CANDIDATE_KEYS) {
  assert.throws(
    () => resolveStage158StructuralCandidate(retiredKey),
    /Retired stage158 structural candidate/,
    `${retiredKey} should be retired from the live stage158 candidate registry.`,
  );
  const retiredCandidate = resolveStage158StructuralCandidate(retiredKey, { allowRetired: true });
  assert.equal(retiredCandidate.retired, true);
}

const manifestPath = path.resolve(
  repoRoot,
  'tools',
  'engine-match',
  'out',
  'stage169-stage157-158-mainline-decision-pack',
  'manifest.json',
);
assert.ok(fs.existsSync(manifestPath), 'stage169 decision-pack manifest should exist after regeneration.');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.deepEqual(
  manifest.stage158Candidates.map((candidate) => candidate.key),
  ['s154-stable-zebra'],
  'stage169 decision pack should keep only the surviving stage158 mainline candidate.',
);
assert.deepEqual(
  manifest.stage157Candidates.map((candidate) => candidate.key),
  [
    's157-main-wide-hybrid',
    's157-main-frontier-gate',
    's157-main-assertive-both',
  ],
  'stage157 adopted decision-lane candidates should remain unchanged.',
);

console.log('stage169 stage158 runtime retirement smoke passed');
