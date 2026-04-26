#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  RUNTIME_EVALUATION_PROFILE,
  RUNTIME_MOVE_ORDERING_PROFILE,
  RUNTIME_MPC_PROFILE,
  RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES,
  RUNTIME_PATTERN_BANK_PROFILES,
  RUNTIME_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  displayGeneratedProfilesModulePath,
  displayProjectPath,
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
  const toolPath = displayTrainingToolPath('install-pattern-bank-profile.mjs');
  const patternBankJsonPath = displayTrainingOutputPath('trained-pattern-bank-profile.json');
  const moveOrderingPatternBankJsonPath = displayTrainingOutputPath('trained-move-ordering-pattern-bank-profile.json');
  const outputModulePath = displayGeneratedProfilesModulePath();
  const summaryJsonPath = displayProjectPath('benchmarks', 'pattern_bank_install_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    [--pattern-bank-json ${patternBankJsonPath}] [--pattern-bank-json path/to/another-pattern-bank.json ...] \
    [--move-ordering-pattern-bank-json ${moveOrderingPatternBankJsonPath}] [--move-ordering-pattern-bank-json path/to/another-pattern-bank.json ...] \
    [--output-module ${outputModulePath}] [--module-format compact|factorized|expanded] \
    [--summary-json ${summaryJsonPath}] \
    [--evaluation-json path/to/evaluation-profile.json] \
    [--move-ordering-json path/to/move-ordering-profile.json] \
    [--tuple-json path/to/tuple-residual-profile.json] \
    [--mpc-json path/to/mpc-profile.json]

동작:
- pattern-bank stack / move-ordering pattern-bank stack을 앱용 learned-eval-profile.generated.js에 설치합니다.
- evaluation / move-ordering / tuple / MPC slot은 별도 JSON을 주지 않으면 현재 활성 module 값을 그대로 보존합니다.
- 각 pattern-bank slot은 JSON을 여러 번 주어 stack 형태로 저장할 수 있습니다.
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

function summarizePatternBankStack(profiles) {
  const normalized = Array.isArray(profiles) ? profiles : [];
  return normalized.map((profile) => ({
    name: profile?.name ?? null,
    layoutName: profile?.layout?.name ?? null,
    trainedBucketCount: Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets.length : 0,
    totalTableSize: profile?.layout?.totalTableSize ?? null,
  }));
}

const args = parseArgs(process.argv.slice(2));
const patternBankJsonPaths = resolveJsonPathList(args['pattern-bank-json'], args['pattern-bank-profile-json']);
const moveOrderingPatternBankJsonPaths = resolveJsonPathList(
  args['move-ordering-pattern-bank-json'],
  args['move-ordering-pattern-bank-profile-json'],
);

if (args.help || args.h || (!patternBankJsonPaths && !moveOrderingPatternBankJsonPaths)) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : resolveGeneratedProfilesModulePath();
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'factorized';
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;

const evaluationProfile = sanitizeEvaluationProfileForModule(
  loadJsonFileIfPresent(args['evaluation-json']) ?? RUNTIME_EVALUATION_PROFILE ?? null,
);
const moveOrderingProfile = sanitizeMoveOrderingProfileForModule(
  loadJsonFileIfPresent(args['move-ordering-json']) ?? RUNTIME_MOVE_ORDERING_PROFILE ?? null,
);
const tupleResidualProfile = sanitizeTupleResidualProfileForModule(
  loadJsonFileIfPresent(args['tuple-json']) ?? RUNTIME_TUPLE_RESIDUAL_PROFILE ?? null,
);
const mpcProfile = sanitizeMpcProfileForModule(
  loadJsonFileIfPresent(args['mpc-json']) ?? RUNTIME_MPC_PROFILE ?? null,
);
const patternBankProfiles = sanitizePatternBankProfileStackForModule(
  loadJsonStackIfPresent(patternBankJsonPaths) ?? RUNTIME_PATTERN_BANK_PROFILES ?? null,
);
const moveOrderingPatternBankProfiles = sanitizePatternBankProfileStackForModule(
  loadJsonStackIfPresent(moveOrderingPatternBankJsonPaths) ?? RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES ?? null,
);

if (!patternBankProfiles && !moveOrderingPatternBankProfiles) {
  throw new Error('읽을 수 있는 pattern bank profile JSON이 없습니다.');
}

const writtenPath = await writeGeneratedProfilesModule(outputModulePath, {
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  patternBankProfiles,
  moveOrderingPatternBankProfiles,
}, {
  moduleFormat,
});
const moduleStats = await fs.promises.stat(writtenPath);

const summary = {
  generatedAt: new Date().toISOString(),
  patternBankJsonPaths,
  moveOrderingPatternBankJsonPaths,
  outputModulePath: writtenPath,
  moduleFormat,
  outputModuleBytes: moduleStats.size,
  evaluationProfileName: evaluationProfile?.name ?? null,
  moveOrderingProfileName: moveOrderingProfile?.name ?? null,
  tupleResidualProfileName: tupleResidualProfile?.name ?? null,
  mpcProfileName: mpcProfile?.name ?? null,
  patternBankProfiles: summarizePatternBankStack(patternBankProfiles),
  moveOrderingPatternBankProfiles: summarizePatternBankStack(moveOrderingPatternBankProfiles),
};

console.log(`Installed pattern-bank profiles into ${writtenPath}`);
console.log(`  evaluation slot             : ${evaluationProfile?.name ?? 'null'}`);
console.log(`  move-ordering slot          : ${moveOrderingProfile?.name ?? 'null'}`);
console.log(`  tuple residual slot         : ${tupleResidualProfile?.name ?? 'null'}`);
console.log(`  mpc slot                    : ${mpcProfile?.name ?? 'null'}`);
console.log(`  pattern-bank stack          : ${patternBankProfiles?.length ?? 0}`);
console.log(`  move-ordering pattern-bank  : ${moveOrderingPatternBankProfiles?.length ?? 0}`);
console.log(`  module format               : ${moduleFormat}`);
console.log(`  module size                 : ${moduleStats.size} bytes`);

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved install summary to ${summaryJsonPath}`);
}
