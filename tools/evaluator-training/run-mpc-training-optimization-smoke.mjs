#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  displayTrainingOutputPath,
  displayTrainingToolPath,
  formatInteger,
  parseArgs,
  relativePathFromCwd,
  resolveCliPath,
  resolveTrainingOutputPath,
  resolveTrainingToolPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('run-mpc-training-optimization-smoke.mjs');
  const outputRoot = displayTrainingOutputPath('_mpc_training_optimization_smoke');
  console.log(`Usage:\n  node ${toolPath} [--output-root ${outputRoot}] [--input tools/evaluator-training/out/stage35_mpc_synthetic.jsonl]\n\n직접 calibrate 방식과 shared search-pair precompute 방식의 wall-time/search-count를 비교하고,\ncheckpoint+resume 경로가 실제로 동작하는지 검증합니다.`);
}

function ensureDir(targetPath) {
  return fs.promises.mkdir(targetPath, { recursive: true });
}

function runNodeScript(scriptPath, args, { cwd = process.cwd() } = {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ elapsedMs: Date.now() - startedAt });
        return;
      }
      reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sumSearchesFromRawProfiles(profilePaths) {
  return profilePaths.reduce((sum, filePath) => {
    const parsed = readJson(filePath);
    return sum
      + Number(parsed?.diagnostics?.shallowSearchCost?.searches ?? 0)
      + Number(parsed?.diagnostics?.deepSearchCost?.searches ?? 0);
  }, 0);
}

function sumElapsedMsFromRawProfiles(profilePaths) {
  return profilePaths.reduce((sum, filePath) => {
    const parsed = readJson(filePath);
    return sum
      + Number(parsed?.diagnostics?.shallowSearchCost?.elapsedMs ?? 0)
      + Number(parsed?.diagnostics?.deepSearchCost?.elapsedMs ?? 0);
  }, 0);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const outputRoot = args['output-root']
  ? resolveCliPath(args['output-root'])
  : resolveTrainingOutputPath('_mpc_training_optimization_smoke');
const inputPath = args.input
  ? resolveCliPath(args.input)
  : resolveCliPath('tools/evaluator-training/out/stage35_mpc_synthetic.jsonl');

await ensureDir(outputRoot);

const baselineConfigPath = path.join(outputRoot, 'baseline-suite.config.json');
const optimizedConfigPath = path.join(outputRoot, 'optimized-suite.config.json');
const baselineOutputDir = path.join(outputRoot, 'baseline-suite');
const optimizedOutputDir = path.join(outputRoot, 'optimized-suite');
const checkpointDir = path.join(outputRoot, 'checkpoint-resume');
await ensureDir(checkpointDir);

const sharedCandidates = [
  {
    key: 'candidate-a',
    name: 'candidate-a',
    calibrationBuckets: ['22-25:4>8'],
    runtimeVariant: { defaultMode: 'high', maxChecksPerNode: 1 },
  },
  {
    key: 'candidate-b',
    name: 'candidate-b',
    calibrationBuckets: ['22-25:4>8'],
    runtimeVariant: { defaultMode: 'high', maxChecksPerNode: 2 },
  },
  {
    key: 'candidate-c',
    name: 'candidate-c',
    calibrationBuckets: ['22-25:4>8'],
    runtimeVariant: { defaultMode: 'both', maxChecksPerNode: 2, lowScale: 0.95 },
  },
];

const sharedDefaults = {
  sampleStride: 1,
  sampleResidue: 0,
  maxSamplesPerBucket: 4,
  holdoutMod: 2,
  holdoutResidue: 0,
  targetHoldoutCoverage: 0.99,
  timeLimitMs: 1000,
  progressEvery: 1,
  maxTableEntries: 50000,
  aspirationWindow: 40,
  zValues: [1, 1.5, 1.96, 2.5, 3],
  exportModule: false,
  benchmarks: {
    depth: { enabled: false },
    exact: { enabled: false },
  },
};

await fs.promises.writeFile(baselineConfigPath, `${JSON.stringify({
  outputDir: relativePathFromCwd(baselineOutputDir),
  sharedSearchPairs: { mode: 'off' },
  defaults: sharedDefaults,
  candidates: sharedCandidates,
}, null, 2)}\n`, 'utf8');

await fs.promises.writeFile(optimizedConfigPath, `${JSON.stringify({
  outputDir: relativePathFromCwd(optimizedOutputDir),
  sharedSearchPairs: { mode: 'on', checkpointEvery: 2 },
  defaults: sharedDefaults,
  candidates: sharedCandidates,
}, null, 2)}\n`, 'utf8');

const suiteToolPath = resolveTrainingToolPath('run-mpc-candidate-training-suite.mjs');
const calibrateToolPath = resolveTrainingToolPath('calibrate-mpc-profile.mjs');

console.log('[smoke] baseline suite start');
const baselineRun = await runNodeScript(suiteToolPath, [
  '--input', inputPath,
  '--config', baselineConfigPath,
], { cwd: process.cwd() });

console.log('[smoke] optimized suite start');
const optimizedRun = await runNodeScript(suiteToolPath, [
  '--input', inputPath,
  '--config', optimizedConfigPath,
], { cwd: process.cwd() });

const baselineRawProfiles = sharedCandidates.map((candidate) => path.join(baselineOutputDir, 'candidates', candidate.key, 'trained-mpc-profile.raw.json'));
const optimizedRawProfiles = sharedCandidates.map((candidate) => path.join(optimizedOutputDir, 'candidates', candidate.key, 'trained-mpc-profile.raw.json'));
const optimizedSharedSummaryPath = path.join(optimizedOutputDir, 'shared', 'shared-mpc-search-pairs.summary.json');

const baselineSearchCount = sumSearchesFromRawProfiles(baselineRawProfiles);
const baselineSearchElapsedMs = sumElapsedMsFromRawProfiles(baselineRawProfiles);
const optimizedSharedSummary = readJson(optimizedSharedSummaryPath);
const optimizedSearchCount = Number(optimizedSharedSummary?.diagnostics?.shallowSearchCost?.searches ?? 0)
  + Number(optimizedSharedSummary?.diagnostics?.deepSearchCost?.searches ?? 0);
const optimizedSearchElapsedMs = Number(optimizedSharedSummary?.diagnostics?.shallowSearchCost?.elapsedMs ?? 0)
  + Number(optimizedSharedSummary?.diagnostics?.deepSearchCost?.elapsedMs ?? 0);

const checkpointPath = path.join(checkpointDir, 'calibrate.checkpoint.json');
const partialOutputPath = path.join(checkpointDir, 'partial.json');
const resumedOutputPath = path.join(checkpointDir, 'resumed.json');
console.log('[smoke] checkpoint partial run');
await runNodeScript(calibrateToolPath, [
  '--input', inputPath,
  '--calibration-buckets', '22-25:4>8',
  '--sample-stride', '1',
  '--max-samples-per-bucket', '4',
  '--holdout-mod', '2',
  '--holdout-residue', '0',
  '--time-limit-ms', '1000',
  '--checkpoint-json', checkpointPath,
  '--checkpoint-every', '1',
  '--max-accepted-total', '2',
  '--output-json', partialOutputPath,
], { cwd: process.cwd() });

console.log('[smoke] checkpoint resume run');
await runNodeScript(calibrateToolPath, [
  '--input', inputPath,
  '--calibration-buckets', '22-25:4>8',
  '--sample-stride', '1',
  '--max-samples-per-bucket', '4',
  '--holdout-mod', '2',
  '--holdout-residue', '0',
  '--time-limit-ms', '1000',
  '--checkpoint-json', checkpointPath,
  '--checkpoint-every', '1',
  '--resume',
  '--output-json', resumedOutputPath,
], { cwd: process.cwd() });

const partialProfile = readJson(partialOutputPath);
const resumedProfile = readJson(resumedOutputPath);

const summary = {
  generatedAt: new Date().toISOString(),
  inputPath,
  baseline: {
    wallElapsedMs: baselineRun.elapsedMs,
    searchCount: baselineSearchCount,
    searchElapsedMs: baselineSearchElapsedMs,
    outputDir: baselineOutputDir,
  },
  optimized: {
    wallElapsedMs: optimizedRun.elapsedMs,
    searchCount: optimizedSearchCount,
    searchElapsedMs: optimizedSearchElapsedMs,
    outputDir: optimizedOutputDir,
    sharedSummaryPath: optimizedSharedSummaryPath,
  },
  checkpointResume: {
    checkpointPath,
    partialAcceptedSamples: partialProfile?.diagnostics?.acceptedSamples ?? null,
    partialStopReason: partialProfile?.diagnostics?.stopReason ?? null,
    resumedAcceptedSamples: resumedProfile?.diagnostics?.acceptedSamples ?? null,
    resumedStopReason: resumedProfile?.diagnostics?.stopReason ?? null,
    resumedFromCheckpoint: resumedProfile?.diagnostics?.resumedFromCheckpoint ?? null,
  },
};
summary.comparison = {
  wallSpeedup: summary.optimized.wallElapsedMs > 0 ? summary.baseline.wallElapsedMs / summary.optimized.wallElapsedMs : null,
  searchReductionRatio: summary.optimized.searchCount > 0 ? summary.baseline.searchCount / summary.optimized.searchCount : null,
  searchElapsedReductionRatio: summary.optimized.searchElapsedMs > 0 ? summary.baseline.searchElapsedMs / summary.optimized.searchElapsedMs : null,
};

const summaryJsonPath = path.join(outputRoot, 'mpc-training-optimization-smoke-summary.json');
const summaryMdPath = path.join(outputRoot, 'mpc-training-optimization-smoke-summary.md');
await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await fs.promises.writeFile(summaryMdPath, [
  '# MPC training optimization smoke summary',
  '',
  `- baseline wall elapsed: ${formatInteger(summary.baseline.wallElapsedMs)} ms`,
  `- optimized wall elapsed: ${formatInteger(summary.optimized.wallElapsedMs)} ms`,
  `- wall speedup: ${summary.comparison.wallSpeedup === null ? 'n/a' : `${summary.comparison.wallSpeedup.toFixed(2)}x`}`,
  `- baseline search count: ${formatInteger(summary.baseline.searchCount)}`,
  `- optimized search count: ${formatInteger(summary.optimized.searchCount)}`,
  `- search reduction: ${summary.comparison.searchReductionRatio === null ? 'n/a' : `${summary.comparison.searchReductionRatio.toFixed(2)}x`}`,
  `- checkpoint partial accepted: ${formatInteger(summary.checkpointResume.partialAcceptedSamples ?? 0)}`,
  `- checkpoint resumed accepted: ${formatInteger(summary.checkpointResume.resumedAcceptedSamples ?? 0)}`,
  `- resumedFromCheckpoint: ${summary.checkpointResume.resumedFromCheckpoint}`,
  '',
  'Artifacts:',
  `- baseline output: ${relativePathFromCwd(baselineOutputDir)}`,
  `- optimized output: ${relativePathFromCwd(optimizedOutputDir)}`,
  `- summary json: ${relativePathFromCwd(summaryJsonPath)}`,
].join('\n') + '\n', 'utf8');

console.log(`\nSaved smoke summary to ${summaryJsonPath}`);
console.log(`Saved smoke report to ${summaryMdPath}`);
console.log(`Wall speedup   : ${summary.comparison.wallSpeedup === null ? 'n/a' : `${summary.comparison.wallSpeedup.toFixed(2)}x`}`);
console.log(`Search reduction: ${summary.comparison.searchReductionRatio === null ? 'n/a' : `${summary.comparison.searchReductionRatio.toFixed(2)}x`}`);
