import {
  DEFAULT_PATTERN_BANK_LATE_PATCH_LAYOUT_NAME,
  DEFAULT_PATTERN_BANK_LAYOUT_NAME,
  createPatternBankBundle,
  projectPatternBankProfile,
  resolvePatternBankProfiles,
} from './pattern-bank.js';

export const DEFAULT_PATTERN_BANK_ORDERING_MAX_EMPTIES = 18;
export const DEFAULT_PATTERN_BANK_ORDERING_LATE_PATCH_PATTERN_KEYS = Object.freeze([
  'main-diagonal',
  'corner-3x3',
  'corner-5x2-or-2x5',
]);

export function createPatternBankRuntimeCandidate({
  evaluatorProfiles = [],
  moveOrderingProfiles = null,
  moveOrderingMaxEmpties = DEFAULT_PATTERN_BANK_ORDERING_MAX_EMPTIES,
  moveOrderingScale = 1,
  orderingPatternKeys = DEFAULT_PATTERN_BANK_ORDERING_LATE_PATCH_PATTERN_KEYS,
  reuseEvaluatorProfilesForMoveOrdering = false,
  name = 'pattern-bank-runtime-candidate',
} = {}) {
  const resolvedEvaluatorProfiles = resolvePatternBankProfiles(evaluatorProfiles);
  let resolvedMoveOrderingProfiles = resolvePatternBankProfiles(moveOrderingProfiles);

  if (resolvedMoveOrderingProfiles.length === 0 && reuseEvaluatorProfilesForMoveOrdering) {
    resolvedMoveOrderingProfiles = Object.freeze(resolvedEvaluatorProfiles.map((profile, index) => projectPatternBankProfile(profile, {
      patternKeys: orderingPatternKeys,
      maxEmpties: moveOrderingMaxEmpties,
      name: `${profile?.name ?? `pattern-bank-${index + 1}`}__ordering`,
      description: 'Projected lightweight move-ordering pattern-bank profile.',
    })).filter(Boolean));
  }

  return createPatternBankBundle({
    name,
    evaluatorProfiles: resolvedEvaluatorProfiles,
    moveOrderingProfiles: resolvedMoveOrderingProfiles,
    runtimeOptions: {
      patternBankProfiles: resolvedEvaluatorProfiles,
      moveOrderingPatternBankProfiles: resolvedMoveOrderingProfiles,
      moveOrderingPatternBankMaxEmpties,
      moveOrderingPatternBankScale: moveOrderingScale,
      patternBankLayoutName: resolvedEvaluatorProfiles[0]?.layout?.name ?? DEFAULT_PATTERN_BANK_LAYOUT_NAME,
      moveOrderingPatternBankLayoutName: resolvedMoveOrderingProfiles[0]?.layout?.name ?? DEFAULT_PATTERN_BANK_LATE_PATCH_LAYOUT_NAME,
    },
  });
}
