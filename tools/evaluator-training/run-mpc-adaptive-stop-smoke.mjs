#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  displayTrainingOutputPath,
  displayTrainingToolPath,
  parseArgs,
  relativePathFromCwd,
  resolveCliPath,
  resolveTrainingOutputPath,
  resolveTrainingToolPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('run-mpc-adaptive-stop-smoke.mjs');
  const outputRoot = displayTrainingOutputPath('_mpc_adaptive_stop_smoke');
  console.log(`Usage:\n  node ${toolPath} [--output-root ${outputRoot}]\n\n완벽한 선형 관계의 search pair 데이터로 adaptive-stop이 실제로 bucket을 조기 종료하는지 확인합니다.`);
}

function runNodeScript(scriptPath, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
  });
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const outputRoot = args['output-root']
  ? resolveCliPath(args['output-root'])
  : resolveTrainingOutputPath('_mpc_adaptive_stop_smoke');
await fs.promises.mkdir(outputRoot, { recursive: true });

const pairPath = path.join(outputRoot, 'perfect-pairs.jsonl');
const outputJsonPath = path.join(outputRoot, 'adaptive-stop-fit.json');
const summaryJsonPath = path.join(outputRoot, 'adaptive-stop-smoke-summary.json');

const lines = [];
for (let index = 0; index < 20; index += 1) {
  lines.push(JSON.stringify({
    sampleIndex: index,
    empties: 24,
    scores: { '4': index * 10, '8': index * 10 },
    searchStats: {
      '4': { nodes: 10, elapsedMs: 1 },
      '8': { nodes: 20, elapsedMs: 2 },
    },
    passDepths: [],
    invalidDepths: [],
  }));
}
await fs.promises.writeFile(pairPath, `${lines.join('\n')}\n`, 'utf8');

await runNodeScript(resolveTrainingToolPath('fit-mpc-profile-from-search-pairs.mjs'), [
  '--search-pairs-jsonl', pairPath,
  '--calibration-buckets', '22-25:4>8',
  '--max-samples-per-bucket', '20',
  '--holdout-mod', '5',
  '--holdout-residue', '0',
  '--adaptive-stop',
  '--adaptive-min-samples-per-bucket', '10',
  '--adaptive-check-every', '5',
  '--output-json', outputJsonPath,
], { cwd: process.cwd() });

const fitted = JSON.parse(await fs.promises.readFile(outputJsonPath, 'utf8'));
const calibration = fitted?.calibrations?.[0] ?? null;
const summary = {
  generatedAt: new Date().toISOString(),
  pairPath,
  outputJsonPath,
  sampleCount: calibration?.sampleCount ?? null,
  usable: calibration?.usable ?? null,
  closedEarly: calibration?.closedEarly ?? null,
  closedReason: calibration?.closedReason ?? null,
  recommendedZ: calibration?.recommendedZ ?? null,
};
await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`Adaptive-stop smoke summary: ${relativePathFromCwd(summaryJsonPath)}`);
