#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { parseArgs, resolveCliPath } from '../evaluator-training/lib.mjs';
import { buildStage158StructuralEngineOptions, resolveStage158StructuralCandidate } from '../evaluator-training/stage158-structural-candidates.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function relativeProjectPath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonPortable(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  console.log(`Usage:
  node tools/engine-match/prepare-stage15x-main-benchmark-pack.mjs \
    [--support-stack-dir tools/evaluator-training/out/stage15x-support-stack] \
    [--output-dir tools/engine-match/out/stage15x-main-benchmark-pack]
`);
  process.exit(0);
}

const supportStackDir = args['support-stack-dir']
  ? resolveCliPath(args['support-stack-dir'])
  : path.resolve(PROJECT_ROOT, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack');
const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage15x-main-benchmark-pack');

const stage154Dir = path.resolve(supportStackDir, 'stage154-main-recenter');
const exportedDir = path.resolve(stage154Dir, 'exported');
const engineOptionsDir = path.resolve(stage154Dir, 'engine-options');
if (!fs.existsSync(exportedDir)) {
  throw new Error(`stage154 exported directory not found: ${exportedDir}`);
}

const supportVariants = [
  { id: 'active', variant: 'active', label: 'active-installed' },
  { id: 's154-safe', type: 'custom', label: 'stage154 safe', generatedModule: relativeProjectPath(path.resolve(exportedDir, 's154-safe.generated.js')), engineOptionsJson: relativeProjectPath(path.resolve(engineOptionsDir, 's154-safe.json')) },
  { id: 's154-main', type: 'custom', label: 'stage154 main', generatedModule: relativeProjectPath(path.resolve(exportedDir, 's154-main.generated.js')), engineOptionsJson: relativeProjectPath(path.resolve(engineOptionsDir, 's154-main.json')) },
  { id: 's154-wide-safe', type: 'custom', label: 'stage154 wide-safe', generatedModule: relativeProjectPath(path.resolve(exportedDir, 's154-wide-safe.generated.js')), engineOptionsJson: relativeProjectPath(path.resolve(engineOptionsDir, 's154-wide-safe.json')) },
  { id: 's154-split', type: 'custom', label: 'stage154 split', generatedModule: relativeProjectPath(path.resolve(exportedDir, 's154-split.generated.js')), engineOptionsJson: relativeProjectPath(path.resolve(engineOptionsDir, 's154-split.json')) },
  { id: 's154-both', type: 'custom', label: 'stage154 both', generatedModule: relativeProjectPath(path.resolve(exportedDir, 's154-both.generated.js')), engineOptionsJson: relativeProjectPath(path.resolve(engineOptionsDir, 's154-both.json')) },
];

const structuralCandidateKeys = [
  's154-anchor-main',
  's154-stable-quiet',
  's154-stable-quiet-probe',
  's154-stable-zebra',
  's154-stable-zebra-open',
  's154-zebra-both-probe',
];

const structuralBaseModule = relativeProjectPath(path.resolve(exportedDir, 's154-main.generated.js'));
const structuralBaseEngineOptions = clone(JSON.parse(fs.readFileSync(path.resolve(engineOptionsDir, 's154-main.json'), 'utf8')));
const generatedOptionsDir = path.resolve(outputDir, 'engine-options');
ensureDir(generatedOptionsDir);

const structuralVariants = [
  { id: 'active', variant: 'active', label: 'active-installed' },
  { id: 's154-main-base', type: 'custom', label: 'stage154 main base', generatedModule: structuralBaseModule, engineOptionsJson: relativeProjectPath(path.resolve(engineOptionsDir, 's154-main.json')) },
];

const structuralCandidateSummaries = [];
for (const key of structuralCandidateKeys) {
  const candidate = resolveStage158StructuralCandidate(key, { allowRetired: true });
  const engineOptions = {
    ...clone(structuralBaseEngineOptions),
    ...clone(buildStage158StructuralEngineOptions(key, { allowRetired: true })),
  };
  const engineOptionsPath = path.resolve(generatedOptionsDir, `${key}.json`);
  writeJsonPortable(engineOptionsPath, engineOptions);
  structuralVariants.push({
    id: key,
    type: 'custom',
    label: `${candidate.key} (${candidate.moveOrderingStructureProfile.key} + ${candidate.mpcStructureProfile.key})`,
    generatedModule: structuralBaseModule,
    engineOptionsJson: relativeProjectPath(engineOptionsPath),
  });
  structuralCandidateSummaries.push({
    key,
    notes: candidate.notes,
    moveOrderingStructureProfile: candidate.moveOrderingStructureProfile.key,
    mpcStructureProfile: candidate.mpcStructureProfile.key,
    engineOptionsJson: relativeProjectPath(engineOptionsPath),
  });
}

const defaultBlock = {
  openingPlies: 20,
  ourMaxDepth: 6,
  theirMaxDepth: 18,
  exactEndgameEmpties: 10,
  solverAdjudicationEmpties: 14,
  solverAdjudicationTimeMs: 60000,
  solverAdjudicationMaxDepth: 14,
  variantSeedMode: 'shared',
};

const screeningScenarios = [
  {
    id: 'det80-seed17',
    label: 'deterministic 80ms seed17',
    seed: 17,
    games: 2,
    ourTimeMs: 80,
    theirTimeMs: 80,
    theirNoiseScale: 0,
  },
  {
    id: 'noisy80-seed29',
    label: 'noisy 80ms seed29',
    seed: 29,
    games: 4,
    ourTimeMs: 80,
    theirTimeMs: 80,
    theirNoiseScale: 4,
  },
];

const structuralScenarios = [
  {
    id: 'det80-seed17',
    label: 'deterministic 80ms seed17',
    seed: 17,
    games: 2,
    ourTimeMs: 80,
    theirTimeMs: 80,
    theirNoiseScale: 0,
  },
  {
    id: 'noisy80-seed29',
    label: 'noisy 80ms seed29',
    seed: 29,
    games: 4,
    ourTimeMs: 80,
    theirTimeMs: 80,
    theirNoiseScale: 4,
  },
];

const supportConfig = {
  defaults: defaultBlock,
  referenceVariantId: 'active',
  variants: supportVariants,
  scenarios: screeningScenarios,
};

const structuralConfig = {
  defaults: defaultBlock,
  referenceVariantId: 's154-main-base',
  variants: structuralVariants,
  scenarios: structuralScenarios,
};

ensureDir(outputDir);
writeJsonPortable(path.resolve(outputDir, 'trineutron-match-suite.stage154-support-screening.json'), supportConfig);
writeJsonPortable(path.resolve(outputDir, 'trineutron-match-suite.stage154-structural-screening.json'), structuralConfig);
writeJsonPortable(path.resolve(outputDir, 'manifest.json'), {
  generatedAt: new Date().toISOString(),
  supportStackDir: relativeProjectPath(supportStackDir),
  supportConfig: 'tools/engine-match/out/stage15x-main-benchmark-pack/trineutron-match-suite.stage154-support-screening.json',
  structuralConfig: 'tools/engine-match/out/stage15x-main-benchmark-pack/trineutron-match-suite.stage154-structural-screening.json',
  structuralCandidateSummaries,
});

console.log(`Prepared support config   : ${relativeProjectPath(path.resolve(outputDir, 'trineutron-match-suite.stage154-support-screening.json'))}`);
console.log(`Prepared structural config: ${relativeProjectPath(path.resolve(outputDir, 'trineutron-match-suite.stage154-structural-screening.json'))}`);
console.log(`Generated engine options  : ${relativeProjectPath(generatedOptionsDir)}`);
