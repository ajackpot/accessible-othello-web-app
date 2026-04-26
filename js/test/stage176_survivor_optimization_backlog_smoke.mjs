import assert from 'node:assert/strict';
import {
  STAGE176_SURVIVOR_OPTIMIZATION_SUMMARY,
  STAGE176_SURVIVOR_ROUND_ROBIN_BUDGET,
  listStage176SurvivorOptimizationLanes,
} from '../../tools/evaluator-training/stage176-survivor-optimization-backlog.mjs';

const lanes = listStage176SurvivorOptimizationLanes();
assert.equal(lanes.length, 3, 'expected three survivor lanes');

for (const lane of lanes) {
  assert.ok(typeof lane.laneKey === 'string' && lane.laneKey.length > 0, 'laneKey required');
  assert.ok(typeof lane.currentCandidateKey === 'string' && lane.currentCandidateKey.length > 0, 'current candidate required');
  assert.equal(lane.primaryBranches.length, 1, `expected exactly one primary branch for ${lane.laneKey}`);
  assert.ok(lane.contingencyBranches.length <= 1, `expected at most one contingency branch for ${lane.laneKey}`);
}

assert.equal(STAGE176_SURVIVOR_OPTIMIZATION_SUMMARY.length, 3, 'summary should cover all lanes');
assert.equal(STAGE176_SURVIVOR_ROUND_ROBIN_BUDGET.confirmedPrimaryRounds, 1, 'one full league should cover primary queue');
assert.equal(STAGE176_SURVIVOR_ROUND_ROBIN_BUDGET.confirmedUpperBoundRounds, 2, 'two full leagues should cover primary+contingency queue');
assert.equal(STAGE176_SURVIVOR_ROUND_ROBIN_BUDGET.recommendation.perConditionRounds, 6, 'default per-condition rounds should be 6');

console.log('stage176 survivor optimization backlog smoke: ok');
