import assert from 'node:assert/strict';

import * as STAGE154_MAIN_RUNTIME_MODULE from '../ai/runtime-profiles/stage154-main.generated.js';
import * as STAGE154_BOTH_RUNTIME_MODULE from '../ai/runtime-profiles/stage154-both.generated.js';
import GENERATED_EVALUATION_PROFILE, {
  GENERATED_MOVE_ORDERING_PROFILE,
  GENERATED_MPC_PROFILE,
  GENERATED_TUPLE_RESIDUAL_PROFILE,
} from '../ai/learned-eval-profile.generated.js';
import { SearchEngine } from '../ai/search-engine.js';
import {
  DEFAULT_CLASSIC_ENGINE_VARIANT_KEY,
  EXPANDED_CLASSIC_ENGINE_VARIANT_KEY,
  describeClassicEngineVariant,
  listClassicEngineVariants,
  normalizeClassicEngineVariantKey,
} from '../ai/runtime-engine-variants.js';

assert.equal(
  GENERATED_EVALUATION_PROFILE.name,
  (STAGE154_MAIN_RUNTIME_MODULE.default ?? STAGE154_MAIN_RUNTIME_MODULE.GENERATED_EVALUATION_PROFILE).name,
  'installed runtime module should point at the stage154 main profile.',
);
assert.equal(
  GENERATED_MOVE_ORDERING_PROFILE.name,
  STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name,
  'installed runtime move-ordering profile should match stage154 main.',
);
assert.equal(
  GENERATED_TUPLE_RESIDUAL_PROFILE.name,
  STAGE154_MAIN_RUNTIME_MODULE.GENERATED_TUPLE_RESIDUAL_PROFILE.name,
  'installed runtime tuple residual profile should match stage154 main.',
);
assert.equal(
  GENERATED_MPC_PROFILE.name,
  STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MPC_PROFILE.name,
  'installed runtime MPC profile should match stage154 main.',
);

const listedVariants = listClassicEngineVariants();
assert.equal(listedVariants.length, 2, 'stage154 runtime catalog should expose exactly two classic variants.');
assert.deepEqual(
  listedVariants.map((variant) => variant.key),
  [DEFAULT_CLASSIC_ENGINE_VARIANT_KEY, EXPANDED_CLASSIC_ENGINE_VARIANT_KEY],
  'classic runtime catalog should preserve the default→expanded order.',
);

const defaultVariant = describeClassicEngineVariant(DEFAULT_CLASSIC_ENGINE_VARIANT_KEY);
const expandedVariant = describeClassicEngineVariant(EXPANDED_CLASSIC_ENGINE_VARIANT_KEY);

assert.equal(normalizeClassicEngineVariantKey('unknown-key'), DEFAULT_CLASSIC_ENGINE_VARIANT_KEY);
assert.equal(defaultVariant.summaryLabel, '표준 읽기');
assert.equal(expandedVariant.summaryLabel, '확장 후보형');
assert.match(defaultVariant.label, /표준 후보폭/);
assert.match(expandedVariant.label, /양방향 컷/);
assert.doesNotMatch(defaultVariant.label, /Main|Both/);
assert.doesNotMatch(expandedVariant.label, /Main|Both/);
assert.equal(defaultVariant.installedByDefault, true);
assert.equal(expandedVariant.installedByDefault, false);
assert.equal(defaultVariant.runtimeProfileFamily, 'stage154-main-recenter');
assert.equal(expandedVariant.runtimeProfileFamily, 'stage154-both');
assert.equal(defaultVariant.runtimeProfileNames.moveOrdering, STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name);
assert.equal(expandedVariant.runtimeProfileNames.moveOrdering, STAGE154_BOTH_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name);
assert.equal(defaultVariant.runtimeProfileNames.mpc, STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MPC_PROFILE.name);
assert.equal(expandedVariant.runtimeProfileNames.mpc, STAGE154_BOTH_RUNTIME_MODULE.GENERATED_MPC_PROFILE.name);

const defaultEngine = new SearchEngine({
  presetKey: 'custom',
  classicEngineVariant: DEFAULT_CLASSIC_ENGINE_VARIANT_KEY,
});
assert.equal(defaultEngine.options.classicEngineVariant, DEFAULT_CLASSIC_ENGINE_VARIANT_KEY);
assert.equal(defaultEngine.options.classicEngineVariantInstalledByDefault, true);
assert.equal(defaultEngine.options.classicEngineVariantRuntimeProfileFamily, 'stage154-main-recenter');
assert.equal(defaultEngine.options.classicEngineVariantSelectionHint, '현재 설치 기본 설정');
assert.equal(defaultEngine.options.moveOrderingProfile?.name, STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name);
assert.equal(defaultEngine.options.mpcProfile?.name, STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MPC_PROFILE.name);

const bothEngine = new SearchEngine({
  presetKey: 'custom',
  classicEngineVariant: EXPANDED_CLASSIC_ENGINE_VARIANT_KEY,
});
assert.equal(bothEngine.options.classicEngineVariant, EXPANDED_CLASSIC_ENGINE_VARIANT_KEY);
assert.equal(bothEngine.options.classicEngineVariantLabel, expandedVariant.label);
assert.equal(bothEngine.options.classicEngineVariantInstalledByDefault, false);
assert.equal(bothEngine.options.classicEngineVariantRuntimeProfileFamily, 'stage154-both');
assert.equal(bothEngine.options.classicEngineVariantSelectionHint, '선택형 stage154 both 번들');
assert.equal(bothEngine.options.classicEngineVariantRuntimeProfileNames.moveOrdering, STAGE154_BOTH_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name);
assert.equal(bothEngine.options.moveOrderingProfile?.name, STAGE154_BOTH_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name);
assert.equal(bothEngine.options.mpcProfile?.name, STAGE154_BOTH_RUNTIME_MODULE.GENERATED_MPC_PROFILE.name);

const mctsEngine = new SearchEngine({
  presetKey: 'custom',
  searchAlgorithm: 'mcts-guided',
  classicEngineVariant: EXPANDED_CLASSIC_ENGINE_VARIANT_KEY,
});
assert.equal(mctsEngine.options.classicEngineVariant, DEFAULT_CLASSIC_ENGINE_VARIANT_KEY);
assert.equal(mctsEngine.options.classicEngineVariantApplies, false);
assert.equal(mctsEngine.options.classicEngineVariantInstalledByDefault, true);
assert.equal(mctsEngine.options.classicEngineVariantRuntimeProfileFamily, 'stage154-main-recenter');
assert.equal(mctsEngine.options.moveOrderingProfile?.name, STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MOVE_ORDERING_PROFILE.name);
assert.equal(mctsEngine.options.mpcProfile?.name, STAGE154_MAIN_RUNTIME_MODULE.GENERATED_MPC_PROFILE.name);

console.log('stage168 stage154 runtime variant smoke passed');
