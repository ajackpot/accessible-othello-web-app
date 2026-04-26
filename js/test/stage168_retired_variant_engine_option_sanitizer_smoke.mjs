import assert from 'node:assert/strict';

import { loadProfileVariant } from '../../tools/engine-match/lib-profile-variants.mjs';
import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const variant = await loadProfileVariant({
  label: 'installed-runtime-retired-variant-option-sanitizer-smoke',
  generatedModule: resolveProjectPath('js', 'ai', 'learned-eval-profile.generated.js'),
  engineOptions: {
    mobilityScale: 1.2,
    edgePatternScale: 0.5,
    cornerPatternScale: 0.6,
    moveOrderingEdgePatternScale: 0.1,
    moveOrderingCornerPatternScale: 0.2,
    moveOrderingStructureProfile: 'baseline-v1',
    mpcStructureProfile: 'baseline-v1',
  },
});

assert.ok(variant.evaluationProfile, 'installed runtime evaluation profile should resolve');
assert.equal(variant.engineOptions?.mobilityScale, 1.2, 'active engine options should survive sanitizer');
assert.equal(variant.engineOptions?.moveOrderingStructureProfile, 'baseline-v1', 'active structure profile override should survive sanitizer');
assert.equal(variant.engineOptions?.mpcStructureProfile, 'baseline-v1', 'active MPC structure profile override should survive sanitizer');
assert.equal(Object.hasOwn(variant.engineOptions ?? {}, 'edgePatternScale'), false, 'retired handcrafted edge-pattern scale should be dropped by the variant sanitizer');
assert.equal(Object.hasOwn(variant.engineOptions ?? {}, 'cornerPatternScale'), false, 'retired handcrafted corner-pattern scale should be dropped by the variant sanitizer');
assert.equal(Object.hasOwn(variant.engineOptions ?? {}, 'moveOrderingEdgePatternScale'), false, 'retired move-ordering edge-pattern scale should be dropped by the variant sanitizer');
assert.equal(Object.hasOwn(variant.engineOptions ?? {}, 'moveOrderingCornerPatternScale'), false, 'retired move-ordering corner-pattern scale should be dropped by the variant sanitizer');

console.log('stage168 retired variant engine-option sanitizer smoke passed');
