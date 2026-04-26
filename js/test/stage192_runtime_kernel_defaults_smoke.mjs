import assert from 'node:assert/strict';

import { bitFromIndex, coordToIndex } from '../core/bitboard.js';
import {
  DEFAULT_FLIP_KERNEL_VARIANT,
  DEFAULT_MOBILITY_KERNEL_VARIANT,
  FLIP_KERNEL_VARIANTS,
  MOBILITY_KERNEL_VARIANTS,
  computeFlips,
  computeFlipsLegacy,
  getActiveFlipKernelVariant,
  getActiveMobilityKernelVariant,
  getActiveRuleKernelConfig,
  getInitialBoards,
  legalMovesBitboard,
  legalMovesBitboardLegacy,
  resetRuleKernelVariantsToRuntimeDefaults,
  setActiveFlipKernelVariant,
  setActiveMobilityKernelVariant,
} from '../core/rules.js';
import {
  DEFAULT_PATTERN_BANK_SCORE_VARIANT,
  PATTERN_BANK_SCORE_VARIANTS,
  getActivePatternBankScoreVariant,
  resetPatternBankScoreVariantToRuntimeDefault,
  setActivePatternBankScoreVariant,
} from '../ai/pattern-bank.js';

assert.equal(DEFAULT_MOBILITY_KERNEL_VARIANT, MOBILITY_KERNEL_VARIANTS.PREFIX_BIDIRECTIONAL);
assert.equal(DEFAULT_FLIP_KERNEL_VARIANT, FLIP_KERNEL_VARIANTS.RAY_BETWEEN_PRECHECK);
assert.equal(DEFAULT_PATTERN_BANK_SCORE_VARIANT, PATTERN_BANK_SCORE_VARIANTS.PACKED_LOOKUP);

assert.equal(getActiveMobilityKernelVariant(), DEFAULT_MOBILITY_KERNEL_VARIANT);
assert.equal(getActiveFlipKernelVariant(), DEFAULT_FLIP_KERNEL_VARIANT);
assert.equal(getActivePatternBankScoreVariant(), DEFAULT_PATTERN_BANK_SCORE_VARIANT);
assert.deepEqual(getActiveRuleKernelConfig(), {
  mobility: DEFAULT_MOBILITY_KERNEL_VARIANT,
  flip: DEFAULT_FLIP_KERNEL_VARIANT,
});

const { black, white } = getInitialBoards();
assert.equal(legalMovesBitboard(black, white), legalMovesBitboardLegacy(black, white));

const moveBit = bitFromIndex(coordToIndex('C4'));
assert.equal(computeFlips(moveBit, black, white), computeFlipsLegacy(moveBit, black, white));

setActiveMobilityKernelVariant(MOBILITY_KERNEL_VARIANTS.LEGACY);
setActiveFlipKernelVariant(FLIP_KERNEL_VARIANTS.LEGACY);
setActivePatternBankScoreVariant(PATTERN_BANK_SCORE_VARIANTS.LEGACY);

assert.equal(getActiveMobilityKernelVariant(), MOBILITY_KERNEL_VARIANTS.LEGACY);
assert.equal(getActiveFlipKernelVariant(), FLIP_KERNEL_VARIANTS.LEGACY);
assert.equal(getActivePatternBankScoreVariant(), PATTERN_BANK_SCORE_VARIANTS.LEGACY);

resetRuleKernelVariantsToRuntimeDefaults();
resetPatternBankScoreVariantToRuntimeDefault();

assert.equal(getActiveMobilityKernelVariant(), DEFAULT_MOBILITY_KERNEL_VARIANT);
assert.equal(getActiveFlipKernelVariant(), DEFAULT_FLIP_KERNEL_VARIANT);
assert.equal(getActivePatternBankScoreVariant(), DEFAULT_PATTERN_BANK_SCORE_VARIANT);

console.log('stage192 runtime kernel default smoke passed');
