import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { MoveOrderingEvaluator } from '../ai/evaluator.js';
import { createStateFromJsonRecord, loadGeneratedProfilesModuleIfPresent, resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const stage151ModulePath = resolveProjectPath(
  'tools',
  'evaluator-training',
  'out',
  'stage151',
  'learned-eval-profile.split_late3.factorized.generated.js',
);
const sampleInputPath = resolveProjectPath(
  'tools',
  'evaluator-training',
  'out',
  'stage29_move_ordering_smoke_input_mixed.jsonl',
);

const moduleProfiles = await loadGeneratedProfilesModuleIfPresent(stage151ModulePath);
assert.ok((moduleProfiles.moveOrderingPatternBankProfiles?.length ?? 0) > 0, 'stage151 module should expose an ordering pattern bank.');

const firstRecordLine = fs.readFileSync(sampleInputPath, 'utf8').split(/\r?\n/).find((line) => line.trim().startsWith('{'));
assert.ok(firstRecordLine, 'smoke input should contain at least one JSONL sample.');
const record = JSON.parse(firstRecordLine);
const state = createStateFromJsonRecord(record);
assert.equal(state.getEmptyCount(), 11, 'stage29 smoke input is expected to provide an 11-empty state for range gating.');

const fullEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: moduleProfiles.moveOrderingProfile,
  moveOrderingPatternBankProfiles: moduleProfiles.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 1,
  moveOrderingPatternBankMinEmpties: 0,
  moveOrderingPatternBankMaxEmpties: 19,
});
const fullExplain = fullEvaluator.explainFeatures(state);
assert.notEqual(fullExplain.moveOrderingPatternBankContribution, 0, 'full stage151 ordering PB should contribute on the 11-empty sample.');

const noEndEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: moduleProfiles.moveOrderingProfile,
  moveOrderingPatternBankProfiles: moduleProfiles.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 1,
  moveOrderingPatternBankMinEmpties: 7,
  moveOrderingPatternBankMaxEmpties: 19,
});
const noEndExplain = noEndEvaluator.explainFeatures(state);
assert.notEqual(noEndExplain.moveOrderingPatternBankContribution, 0, 'noend window 7-19 should still keep the 11-empty contribution alive.');

const lateAEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: moduleProfiles.moveOrderingProfile,
  moveOrderingPatternBankProfiles: moduleProfiles.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 1,
  moveOrderingPatternBankMinEmpties: 13,
  moveOrderingPatternBankMaxEmpties: 19,
});
const lateAExplain = lateAEvaluator.explainFeatures(state);
assert.equal(lateAExplain.moveOrderingPatternBankContribution, 0, 'latea window 13-19 should disable the 11-empty ordering PB contribution.');
assert.equal(lateAExplain.moveOrderingPatternBankMinEmpties, 13, 'explain payload should expose the active PB minimum empties gate.');

const offEvaluator = new MoveOrderingEvaluator({
  moveOrderingProfile: moduleProfiles.moveOrderingProfile,
  moveOrderingPatternBankProfiles: moduleProfiles.moveOrderingPatternBankProfiles,
  moveOrderingPatternBankScale: 0,
  moveOrderingPatternBankMinEmpties: 0,
  moveOrderingPatternBankMaxEmpties: 19,
});
const offExplain = offEvaluator.explainFeatures(state);
assert.equal(offExplain.moveOrderingPatternBankContribution, 0, 'scale 0 should still disable the ordering PB entirely.');

console.log('stage157 move-ordering pattern-bank range smoke passed');
