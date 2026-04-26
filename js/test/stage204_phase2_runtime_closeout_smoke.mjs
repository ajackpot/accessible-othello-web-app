import assert from 'node:assert/strict';

import {
  DEFAULT_FEW_EMPTIES_EXACT_RUNTIME_OPTIONS,
  DEFAULT_FEW_EMPTIES_WLD_RUNTIME_OPTIONS,
  DEFAULT_SEARCH_MOVE_PATH_RUNTIME_OPTIONS,
  SearchEngine,
  getSearchRuntimeDefaultConfig,
} from '../ai/search-engine.js';
import {
  DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT,
  DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT,
} from '../core/rules.js';

const defaultConfig = getSearchRuntimeDefaultConfig();
assert.equal(defaultConfig.preparedSearchMoveCoreVariant, DEFAULT_PREPARED_SEARCH_MOVE_CORE_VARIANT, 'Stage 204 runtime default helper should report the prepared-move core variant authority.');
assert.equal(defaultConfig.preparedSearchMoveFlipStorageVariant, DEFAULT_PREPARED_SEARCH_MOVE_FLIP_STORAGE_VARIANT, 'Stage 204 runtime default helper should report the prepared-move flip-storage authority.');

for (const [key, value] of Object.entries(DEFAULT_SEARCH_MOVE_PATH_RUNTIME_OPTIONS)) {
  assert.equal(defaultConfig[key], value, `Stage 204 runtime default helper should expose search move-path default ${key}.`);
}
for (const [key, value] of Object.entries(DEFAULT_FEW_EMPTIES_EXACT_RUNTIME_OPTIONS)) {
  assert.equal(defaultConfig[key], value, `Stage 204 runtime default helper should expose exact-tail default ${key}.`);
}
for (const [key, value] of Object.entries(DEFAULT_FEW_EMPTIES_WLD_RUNTIME_OPTIONS)) {
  assert.equal(defaultConfig[key], value, `Stage 204 runtime default helper should expose WLD-tail default ${key}.`);
}

const mutatedCopy = getSearchRuntimeDefaultConfig();
mutatedCopy.allocationLightSearchMoves = false;
mutatedCopy.optimizedFewEmptiesExactSolverEmpties = 6;
assert.equal(getSearchRuntimeDefaultConfig().allocationLightSearchMoves, true, 'Stage 204 runtime default helper should return a fresh copy, not a shared mutable object.');
assert.equal(getSearchRuntimeDefaultConfig().optimizedFewEmptiesExactSolverEmpties, 8, 'Stage 204 runtime default helper should keep the exact threshold authority immutable across callers.');

const defaultEngine = new SearchEngine();
for (const [key, value] of Object.entries(DEFAULT_SEARCH_MOVE_PATH_RUNTIME_OPTIONS)) {
  assert.equal(defaultEngine.options[key], value, `Stage 204 default engine should inherit search move-path default ${key}.`);
}
for (const [key, value] of Object.entries(DEFAULT_FEW_EMPTIES_EXACT_RUNTIME_OPTIONS)) {
  assert.equal(defaultEngine.options[key], value, `Stage 204 default engine should inherit exact-tail default ${key}.`);
}
for (const [key, value] of Object.entries(DEFAULT_FEW_EMPTIES_WLD_RUNTIME_OPTIONS)) {
  assert.equal(defaultEngine.options[key], value, `Stage 204 default engine should inherit WLD-tail default ${key}.`);
}

const overrideEngine = new SearchEngine({
  allocationLightSearchMoves: false,
  reusablePreparedSearchMoveBuffers: false,
  lazyPreparedSearchMoves: false,
  tokenizedPreparedSearchMoveCore: false,
  compactPreparedSearchMoveFlips: true,
  ttFirstDeferredMoveListBuild: true,
  lowOverheadSearchChildStateFactory: true,
  optimizedFewEmptiesExactSolverEmpties: 6,
  specializedFewEmptiesLastFlipPath: false,
  fewEmptiesExactFastestFirstSelectiveGate: false,
  optimizedFewEmptiesWldSolverEmpties: 6,
  specializedFewEmptiesWldLastFlipPath: false,
  fewEmptiesWldFastestFirstSelectiveGate: false,
});
assert.equal(overrideEngine.options.allocationLightSearchMoves, false, 'Stage 204 runtime default refactor should preserve allocation-light override semantics.');
assert.equal(overrideEngine.options.reusablePreparedSearchMoveBuffers, false, 'Stage 204 runtime default refactor should preserve reusable-buffer override semantics.');
assert.equal(overrideEngine.options.lazyPreparedSearchMoves, false, 'Stage 204 runtime default refactor should preserve lazy prepared-move override semantics.');
assert.equal(overrideEngine.options.tokenizedPreparedSearchMoveCore, false, 'Stage 204 runtime default refactor should preserve prepared-move core override semantics.');
assert.equal(overrideEngine.options.compactPreparedSearchMoveFlips, true, 'Stage 204 runtime default refactor should preserve compact flip-token override semantics.');
assert.equal(overrideEngine.options.ttFirstDeferredMoveListBuild, true, 'Stage 204 runtime default refactor should preserve deferred TT-first override semantics.');
assert.equal(overrideEngine.options.lowOverheadSearchChildStateFactory, true, 'Stage 204 runtime default refactor should preserve low-overhead child-state override semantics.');
assert.equal(overrideEngine.options.optimizedFewEmptiesExactSolverEmpties, 6, 'Stage 204 runtime default refactor should preserve exact threshold overrides.');
assert.equal(overrideEngine.options.specializedFewEmptiesLastFlipPath, false, 'Stage 204 runtime default refactor should preserve exact last-flip overrides.');
assert.equal(overrideEngine.options.fewEmptiesExactFastestFirstSelectiveGate, false, 'Stage 204 runtime default refactor should preserve exact selective-gate overrides.');
assert.equal(overrideEngine.options.optimizedFewEmptiesWldSolverEmpties, 6, 'Stage 204 runtime default refactor should preserve WLD threshold overrides.');
assert.equal(overrideEngine.options.specializedFewEmptiesWldLastFlipPath, false, 'Stage 204 runtime default refactor should preserve WLD last-flip overrides.');
assert.equal(overrideEngine.options.fewEmptiesWldFastestFirstSelectiveGate, false, 'Stage 204 runtime default refactor should preserve WLD selective-gate overrides.');

console.log('stage204 phase2 runtime closeout smoke passed');
