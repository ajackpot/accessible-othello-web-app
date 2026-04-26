#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  buildProfileStageMetadata,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('make-mpc-calibration-variant.mjs');
  const inputPath = displayTrainingOutputPath('trained-mpc-profile.json');
  const outputPath = displayTrainingOutputPath('candidate-mpc-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --input-profile ${inputPath} \
    --output-json ${outputPath} \
    [--name candidate-mpc-profile-name] \
    [--description "설명"] \
    [--keep-spec 18-21:4>8] [--keep-spec 22-25:4>8] ...

설명:
- superset MPC calibration JSON에서 특정 shallow/deep bucket만 남긴 파생 calibration profile을 생성합니다.
- overlap-8 calibration을 baseline-4 calibration으로 축약할 때처럼, 재학습 없이 보수적 runtime 후보를 만들 때 사용합니다.
`);
}

function parseKeepSpec(rawSpec) {
  const spec = String(rawSpec ?? '').trim();
  const match = spec.match(/^(\d+)(?:-(\d+))?:(\d+)>(\d+)$/);
  if (!match) {
    throw new Error(`잘못된 keep-spec 형식입니다: ${spec}`);
  }
  const minEmpties = Number(match[1]);
  const maxEmpties = Number(match[2] ?? match[1]);
  const shallowDepth = Number(match[3]);
  const deepDepth = Number(match[4]);
  return {
    raw: spec,
    minEmpties,
    maxEmpties,
    shallowDepth,
    deepDepth,
  };
}

function matchesCalibration(calibration, keepSpec) {
  return Number(calibration?.minEmpties) === keepSpec.minEmpties
    && Number(calibration?.maxEmpties) === keepSpec.maxEmpties
    && Number(calibration?.shallowDepth) === keepSpec.shallowDepth
    && Number(calibration?.deepDepth) === keepSpec.deepDepth;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['input-profile'] || !args['output-json'] || !args['keep-spec']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const inputProfilePath = resolveCliPath(args['input-profile']);
const outputJsonPath = resolveCliPath(args['output-json']);
const baseProfile = loadJsonFileIfPresent(inputProfilePath);
if (!baseProfile || !Array.isArray(baseProfile.calibrations)) {
  throw new Error(`input profile을 읽을 수 없습니다: ${inputProfilePath}`);
}

const keepSpecs = ensureArray(args['keep-spec']).flatMap((entry) => String(entry).split(',')).map((entry) => parseKeepSpec(entry));
const keptCalibrations = baseProfile.calibrations.filter((calibration) => keepSpecs.some((spec) => matchesCalibration(calibration, spec)));
if (keptCalibrations.length === 0) {
  throw new Error('keep-spec와 일치하는 calibration이 없습니다.');
}

const nextProfile = JSON.parse(JSON.stringify(baseProfile));
nextProfile.calibrations = keptCalibrations;
nextProfile.name = typeof args.name === 'string' && args.name.trim() !== ''
  ? args.name.trim()
  : `${baseProfile.name ?? 'mpc-profile'}__variant`;
nextProfile.description = typeof args.description === 'string'
  ? args.description
  : `${baseProfile.description ?? 'mpc profile'} (calibration-filtered variant)`;
nextProfile.stage = buildProfileStageMetadata({
  kind: 'mpc-profile',
  status: 'derived-variant',
  derivedFromProfileName: baseProfile.name ?? null,
  derivedFromProfilePath: toPortablePath(path.relative(process.cwd(), inputProfilePath) || path.basename(inputProfilePath)),
});
nextProfile.source = {
  ...(baseProfile.source && typeof baseProfile.source === 'object' ? baseProfile.source : {}),
  derivedFromProfileName: baseProfile.name ?? null,
  derivedFromProfilePath: toPortablePath(path.relative(process.cwd(), inputProfilePath) || path.basename(inputProfilePath)),
  derivedAt: new Date().toISOString(),
  variant: {
    keepSpecs: keepSpecs.map(({ raw, minEmpties, maxEmpties, shallowDepth, deepDepth }) => ({
      raw,
      minEmpties,
      maxEmpties,
      shallowDepth,
      deepDepth,
    })),
  },
};
nextProfile.diagnostics = {
  ...(baseProfile.diagnostics && typeof baseProfile.diagnostics === 'object' ? baseProfile.diagnostics : {}),
  derivedVariant: {
    baseProfileName: baseProfile.name ?? null,
    keptCalibrationCount: keptCalibrations.length,
    keptCalibrationKeys: keptCalibrations.map((entry) => entry.key ?? `${entry.minEmpties}-${entry.maxEmpties}:d${entry.shallowDepth}>d${entry.deepDepth}`),
  },
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(nextProfile, null, 2)}\n`, 'utf8');

console.log(`Base profile     : ${baseProfile.name ?? path.basename(inputProfilePath)}`);
console.log(`Output           : ${outputJsonPath}`);
console.log(`Calibrations kept: ${keptCalibrations.length}`);
for (const calibration of keptCalibrations) {
  console.log(`  ${calibration.label ?? `${calibration.minEmpties}-${calibration.maxEmpties} / d${calibration.shallowDepth}→d${calibration.deepDepth}`}`);
}
