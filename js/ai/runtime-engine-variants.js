import {
  isMctsSearchAlgorithm,
} from './search-algorithms.js';
import * as STAGE154_MAIN_PROFILES_MODULE from './runtime-profiles/stage154-main.generated.js';
import * as STAGE154_BOTH_PROFILES_MODULE from './runtime-profiles/stage154-both.generated.js';

export const DEFAULT_CLASSIC_ENGINE_VARIANT_KEY = 'stage154-standard';
export const EXPANDED_CLASSIC_ENGINE_VARIANT_KEY = 'stage154-expanded-both';

function extractGeneratedProfiles(moduleNamespace = {}) {
  return Object.freeze({
    evaluationProfile: moduleNamespace.default ?? moduleNamespace.GENERATED_EVALUATION_PROFILE ?? null,
    moveOrderingProfile: moduleNamespace.GENERATED_MOVE_ORDERING_PROFILE ?? null,
    tupleResidualProfile: moduleNamespace.GENERATED_TUPLE_RESIDUAL_PROFILE ?? null,
    mpcProfile: moduleNamespace.GENERATED_MPC_PROFILE ?? null,
    patternBankProfiles: moduleNamespace.GENERATED_PATTERN_BANK_PROFILES
      ?? moduleNamespace.GENERATED_PATTERN_BANK_PROFILE
      ?? null,
    moveOrderingPatternBankProfiles: moduleNamespace.GENERATED_MOVE_ORDERING_PATTERN_BANK_PROFILES
      ?? moduleNamespace.GENERATED_MOVE_ORDERING_PATTERN_BANK_PROFILE
      ?? null,
  });
}

function extractProfileNames(profileBundle = {}) {
  return Object.freeze({
    evaluation: profileBundle?.evaluationProfile?.name ?? null,
    moveOrdering: profileBundle?.moveOrderingProfile?.name ?? null,
    tupleResidual: profileBundle?.tupleResidualProfile?.name ?? null,
    mpc: profileBundle?.mpcProfile?.name ?? null,
  });
}

function createClassicEngineVariant(definition = {}) {
  const profileBundle = definition.profileBundle ?? null;
  return Object.freeze({
    key: definition.key,
    label: definition.label,
    summaryLabel: definition.summaryLabel,
    description: definition.description,
    selectionHint: definition.selectionHint ?? '',
    runtimeProfileFamily: definition.runtimeProfileFamily ?? '',
    installedByDefault: definition.installedByDefault === true,
    profileBundle,
    runtimeProfileNames: extractProfileNames(profileBundle),
  });
}

const STAGE154_MAIN_PROFILE_BUNDLE = extractGeneratedProfiles(STAGE154_MAIN_PROFILES_MODULE);
const STAGE154_BOTH_PROFILE_BUNDLE = extractGeneratedProfiles(STAGE154_BOTH_PROFILES_MODULE);

const CLASSIC_ENGINE_VARIANTS = Object.freeze({
  [DEFAULT_CLASSIC_ENGINE_VARIANT_KEY]: createClassicEngineVariant({
    key: DEFAULT_CLASSIC_ENGINE_VARIANT_KEY,
    label: '기본 추천 — 표준 후보폭으로 안정적으로 읽기',
    summaryLabel: '표준 읽기',
    description: '기본값입니다. 현재 설치된 stage154 main-recenter 런타임을 그대로 사용해 표준 후보폭과 보수적인 컷으로 안정적으로 읽습니다.',
    selectionHint: '현재 설치 기본 설정',
    runtimeProfileFamily: 'stage154-main-recenter',
    installedByDefault: true,
    profileBundle: STAGE154_MAIN_PROFILE_BUNDLE,
  }),
  [EXPANDED_CLASSIC_ENGINE_VARIANT_KEY]: createClassicEngineVariant({
    key: EXPANDED_CLASSIC_ENGINE_VARIANT_KEY,
    label: '확장 후보형 — 후보폭을 넓히고 양방향 컷까지 함께 쓰기',
    summaryLabel: '확장 후보형',
    description: '후보폭을 조금 더 넓히고 양방향 컷까지 함께 사용하는 stage154 both 계열입니다. 일부 상황에서는 더 빠르게 밀어붙이지만 과감해질 수 있습니다.',
    selectionHint: '선택형 stage154 both 번들',
    runtimeProfileFamily: 'stage154-both',
    installedByDefault: false,
    profileBundle: STAGE154_BOTH_PROFILE_BUNDLE,
  }),
});

export const CLASSIC_ENGINE_VARIANT_OPTIONS = Object.freeze(
  Object.values(CLASSIC_ENGINE_VARIANTS).map((variant) => Object.freeze({
    value: variant.key,
    label: variant.label,
  })),
);

export function listClassicEngineVariants() {
  return Object.values(CLASSIC_ENGINE_VARIANTS);
}

export function normalizeClassicEngineVariantKey(value) {
  return CLASSIC_ENGINE_VARIANTS[value]
    ? value
    : DEFAULT_CLASSIC_ENGINE_VARIANT_KEY;
}

export function describeClassicEngineVariant(value) {
  return CLASSIC_ENGINE_VARIANTS[normalizeClassicEngineVariantKey(value)];
}

export function decorateClassicEngineVariantMetadata(options = {}) {
  const key = normalizeClassicEngineVariantKey(options?.classicEngineVariant);
  const variant = describeClassicEngineVariant(key);
  const appliesToClassicSearch = !isMctsSearchAlgorithm(options?.searchAlgorithm);

  return {
    ...(options ?? {}),
    classicEngineVariant: key,
    classicEngineVariantLabel: variant.label,
    classicEngineVariantSummaryLabel: variant.summaryLabel,
    classicEngineVariantDescription: variant.description,
    classicEngineVariantSelectionHint: variant.selectionHint,
    classicEngineVariantRuntimeProfileFamily: variant.runtimeProfileFamily,
    classicEngineVariantRuntimeProfileNames: variant.runtimeProfileNames,
    classicEngineVariantInstalledByDefault: variant.installedByDefault,
    classicEngineVariantApplies: appliesToClassicSearch,
  };
}

export function applyClassicEngineVariantOverrides(options = {}) {
  const decorated = decorateClassicEngineVariantMetadata(options);
  if (decorated.classicEngineVariantApplies !== true) {
    return decorated;
  }

  const variant = describeClassicEngineVariant(decorated.classicEngineVariant);
  if (variant.installedByDefault === true || !variant.profileBundle) {
    return decorated;
  }

  return {
    ...decorated,
    ...variant.profileBundle,
  };
}
