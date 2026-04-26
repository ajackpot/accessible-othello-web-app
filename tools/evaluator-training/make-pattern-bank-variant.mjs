#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { projectPatternBankProfile, resolvePatternBankProfile } from '../../js/ai/pattern-bank-profiles.js';
import {
  buildProfileStageMetadata,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('make-pattern-bank-variant.mjs');
  const inputPath = displayTrainingOutputPath('trained-pattern-bank-profile.json');
  const outputPath = displayTrainingOutputPath('candidate-pattern-bank-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --input-profile ${inputPath} \
    --output-json ${outputPath} \
    [--name candidate-pattern-bank-profile-name] \
    [--description "설명"] \
    [--min-empties 7] [--max-empties 19]

설명:
- 기존 pattern bank profile JSON에서 empties 범위를 clipping한 파생 profile을 생성합니다.
- factorized-sparse-v1 JSON도 그대로 입력할 수 있으며, 내부에서 expanded profile로 정규화한 뒤 저장합니다.
- 주 용도는 stage151 late3 move-ordering pattern bank를 full / noend / late-a 같은 runtime 후보로 분기하는 것입니다.
`);
}

function toFiniteInteger(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['input-profile'] || !args['output-json']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const inputProfilePath = resolveCliPath(args['input-profile']);
const outputJsonPath = resolveCliPath(args['output-json']);
const baseProfile = loadJsonFileIfPresent(inputProfilePath);
const resolvedBaseProfile = resolvePatternBankProfile(baseProfile);
if (!resolvedBaseProfile) {
  throw new Error(`input profile을 읽을 수 없습니다: ${inputProfilePath}`);
}

const minEmpties = toFiniteInteger(args['min-empties'], null);
const maxEmpties = toFiniteInteger(args['max-empties'], null);
const projectedResolved = projectPatternBankProfile(resolvedBaseProfile, {
  minEmpties,
  maxEmpties,
  name: typeof args.name === 'string' && args.name.trim() !== ''
    ? args.name.trim()
    : `${resolvedBaseProfile.name ?? 'pattern-bank-profile'}__variant`,
  description: typeof args.description === 'string'
    ? args.description
    : `${resolvedBaseProfile.description ?? 'pattern bank profile'} (empties-clipped variant)`,
});
if (!projectedResolved || !Array.isArray(projectedResolved.trainedBuckets) || projectedResolved.trainedBuckets.length === 0) {
  throw new Error('지정한 empties 범위와 겹치는 trained bucket이 없어 profile이 비게 됩니다.');
}

const projected = JSON.parse(JSON.stringify(projectedResolved));

projected.stage = buildProfileStageMetadata({
  kind: 'pattern-bank-profile',
  status: 'derived-variant',
  derivedFromProfileName: resolvedBaseProfile.name ?? null,
  derivedFromProfilePath: toPortablePath(path.relative(process.cwd(), inputProfilePath) || path.basename(inputProfilePath)),
});
projected.source = {
  ...(resolvedBaseProfile.source && typeof resolvedBaseProfile.source === 'object' ? resolvedBaseProfile.source : {}),
  derivedFromProfileName: resolvedBaseProfile.name ?? null,
  derivedFromProfilePath: toPortablePath(path.relative(process.cwd(), inputProfilePath) || path.basename(inputProfilePath)),
  derivedAt: new Date().toISOString(),
  variant: {
    minEmpties,
    maxEmpties,
  },
};
projected.diagnostics = {
  ...(resolvedBaseProfile.diagnostics && typeof resolvedBaseProfile.diagnostics === 'object' ? resolvedBaseProfile.diagnostics : {}),
  derivedVariant: {
    baseProfileName: resolvedBaseProfile.name ?? null,
    minEmpties,
    maxEmpties,
    trainedBucketCount: projected.trainedBuckets.length,
    bucketRanges: projected.trainedBuckets.map((bucket) => ({
      key: bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
    })),
  },
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(projected, null, 2)}\n`, 'utf8');

console.log(`Base profile : ${resolvedBaseProfile.name ?? path.basename(inputProfilePath)}`);
console.log(`Output       : ${outputJsonPath}`);
console.log(`Empties clip : ${minEmpties ?? '-inf'}..${maxEmpties ?? '+inf'}`);
console.log(`Buckets kept : ${projected.trainedBuckets.length}`);
for (const bucket of projected.trainedBuckets) {
  console.log(`  ${bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`} [${bucket.minEmpties}-${bucket.maxEmpties}]`);
}
