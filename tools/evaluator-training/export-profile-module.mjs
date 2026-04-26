#!/usr/bin/env node
import path from 'node:path';

import {
  RUNTIME_EVALUATION_PROFILE,
  RUNTIME_MOVE_ORDERING_PROFILE,
  RUNTIME_MPC_PROFILE,
  RUNTIME_PATTERN_BANK_PROFILES,
  RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES,
  RUNTIME_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  displayGeneratedProfilesModulePath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveGeneratedProfilesModulePath,
  sanitizeEvaluationProfileForModule,
  sanitizeMoveOrderingProfileForModule,
  sanitizeMpcProfileForModule,
  sanitizePatternBankProfileStackForModule,
  sanitizeTupleResidualProfileForModule,
  writeGeneratedProfilesModule,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('export-profile-module.mjs');
  const evaluationJsonPath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingJsonPath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const tupleJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const mpcJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  const patternBankJsonPath = displayTrainingOutputPath('trained-pattern-bank-profile.json');
  const moveOrderingPatternBankJsonPath = displayTrainingOutputPath('trained-move-ordering-pattern-bank-profile.json');
  const outputModulePath = displayGeneratedProfilesModulePath();
  console.log(`Usage:
  node ${toolPath} \
    [--evaluation-json ${evaluationJsonPath}] \
    [--move-ordering-json ${moveOrderingJsonPath}] \
    [--tuple-json ${tupleJsonPath}] \
    [--mpc-json ${mpcJsonPath}] \
    [--pattern-bank-json ${patternBankJsonPath}] [--pattern-bank-json path/to/another-pattern-bank.json ...] \
    [--move-ordering-pattern-bank-json ${moveOrderingPatternBankJsonPath}] [--move-ordering-pattern-bank-json path/to/another-pattern-bank.json ...] \
    [--clear-evaluation-profile] [--clear-move-ordering-profile] [--clear-tuple-profile] [--clear-mpc-profile] \
    [--clear-pattern-bank-profiles] [--clear-move-ordering-pattern-bank-profiles] \
    [--output-module ${outputModulePath}] [--module-format compact|factorized|expanded]

Backward-compatible alias:
  --input-json == --evaluation-json

동작:
- 명시한 profile JSON이 있으면 그것을 사용합니다.
- 명시하지 않은 쪽은 현재 활성 generated module 값을 유지합니다.
- --clear-* 를 주면 해당 slot은 null로 비웁니다.
- pattern-bank slot은 JSON을 여러 번 넘겨 stack 형태로 저장할 수 있습니다.
`);
}

function resolveJsonPathList(...candidates) {
  const values = candidates.flatMap((candidate) => ensureArray(candidate)).filter(Boolean);
  const resolved = values.map((value) => resolveCliPath(value));
  return resolved.length > 0 ? resolved : null;
}

function loadJsonStackIfPresent(filePaths) {
  const resolvedPaths = resolveJsonPathList(filePaths);
  if (!resolvedPaths || resolvedPaths.length === 0) {
    return null;
  }
  const loaded = resolvedPaths
    .map((filePath) => loadJsonFileIfPresent(filePath))
    .filter(Boolean);
  return loaded.length > 0 ? loaded : null;
}

const args = parseArgs(process.argv.slice(2));
const evaluationJsonPath = args['evaluation-json'] ?? args['input-json'] ?? null;
const moveOrderingJsonPath = args['move-ordering-json'] ?? null;
const tupleJsonPath = args['tuple-json'] ?? null;
const mpcJsonPath = args['mpc-json'] ?? null;
const patternBankJsonPaths = resolveJsonPathList(args['pattern-bank-json'], args['pattern-bank-profile-json']);
const moveOrderingPatternBankJsonPaths = resolveJsonPathList(
  args['move-ordering-pattern-bank-json'],
  args['move-ordering-pattern-bank-profile-json'],
);
const clearEvaluationProfile = Boolean(args['clear-evaluation-profile']);
const clearMoveOrderingProfile = Boolean(args['clear-move-ordering-profile']);
const clearTupleProfile = Boolean(args['clear-tuple-profile']);
const clearMpcProfile = Boolean(args['clear-mpc-profile']);
const clearPatternBankProfiles = Boolean(args['clear-pattern-bank-profiles'] ?? args['clear-pattern-bank-profile']);
const clearMoveOrderingPatternBankProfiles = Boolean(
  args['clear-move-ordering-pattern-bank-profiles']
  ?? args['clear-move-ordering-pattern-bank-profile']
);

if (
  args.help
  || args.h
  || (!evaluationJsonPath
    && !moveOrderingJsonPath
    && !tupleJsonPath
    && !mpcJsonPath
    && !patternBankJsonPaths
    && !moveOrderingPatternBankJsonPaths
    && !clearEvaluationProfile
    && !clearMoveOrderingProfile
    && !clearTupleProfile
    && !clearMpcProfile
    && !clearPatternBankProfiles
    && !clearMoveOrderingPatternBankProfiles)
) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : resolveGeneratedProfilesModulePath();
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'factorized';
const evaluationProfile = sanitizeEvaluationProfileForModule(clearEvaluationProfile
  ? null
  : (loadJsonFileIfPresent(evaluationJsonPath) ?? RUNTIME_EVALUATION_PROFILE ?? null));
const moveOrderingProfile = sanitizeMoveOrderingProfileForModule(clearMoveOrderingProfile
  ? null
  : (loadJsonFileIfPresent(moveOrderingJsonPath) ?? RUNTIME_MOVE_ORDERING_PROFILE ?? null));
const tupleResidualProfile = sanitizeTupleResidualProfileForModule(clearTupleProfile
  ? null
  : (loadJsonFileIfPresent(tupleJsonPath) ?? RUNTIME_TUPLE_RESIDUAL_PROFILE ?? null));
const mpcProfile = sanitizeMpcProfileForModule(clearMpcProfile
  ? null
  : (loadJsonFileIfPresent(mpcJsonPath) ?? RUNTIME_MPC_PROFILE ?? null));
const patternBankProfiles = sanitizePatternBankProfileStackForModule(clearPatternBankProfiles
  ? null
  : (loadJsonStackIfPresent(patternBankJsonPaths) ?? RUNTIME_PATTERN_BANK_PROFILES ?? null));
const moveOrderingPatternBankProfiles = sanitizePatternBankProfileStackForModule(clearMoveOrderingPatternBankProfiles
  ? null
  : (loadJsonStackIfPresent(moveOrderingPatternBankJsonPaths) ?? RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES ?? null));

await writeGeneratedProfilesModule(outputModulePath, {
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  patternBankProfiles,
  moveOrderingPatternBankProfiles,
}, {
  moduleFormat,
});

console.log(`Saved app-ready module to ${outputModulePath}`);
console.log(`  module format                : ${moduleFormat}`);
console.log(`  evaluation profile           : ${evaluationProfile?.name ?? 'null'}`);
console.log(`  move-ordering slot          : ${moveOrderingProfile?.name ?? 'null'}`);
console.log(`  tuple residual slot         : ${tupleResidualProfile?.name ?? 'null'}`);
console.log(`  mpc slot                    : ${mpcProfile?.name ?? 'null'}`);
console.log(`  pattern-bank stack          : ${patternBankProfiles?.length ?? 0}`);
console.log(`  move-ordering pattern-bank  : ${moveOrderingPatternBankProfiles?.length ?? 0}`);
