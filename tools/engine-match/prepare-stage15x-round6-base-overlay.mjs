#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildStage158StructuralEngineOptions } from '../evaluator-training/stage158-structural-candidates.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rel(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

const supportRoot = path.resolve(PROJECT_ROOT, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack');
const stage154Dir = path.resolve(supportRoot, 'stage154-main-recenter');
const stage151Dir = path.resolve(supportRoot, 'stage151-split-late3');
const outDir = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage15x-restart-benchmark-pack', 'phase6-base-overlay');
const engineOptionsOutDir = path.resolve(outDir, 'engine-options');
ensureDir(engineOptionsOutDir);

const baseStage154MainOptions = readJson(path.resolve(stage154Dir, 'engine-options', 's154-main.json'));
const baseStage154BothOptions = readJson(path.resolve(stage154Dir, 'engine-options', 's154-both.json'));

const overlaySpecs = [
  {
    id: 's154-main-s158-quiet',
    label: 's154-main + s158-stable-quiet',
    base: baseStage154MainOptions,
    overlayKey: 's154-stable-quiet',
    generatedModule: rel(path.resolve(stage154Dir, 'exported', 's154-main.generated.js')),
  },
  {
    id: 's154-main-s158-open',
    label: 's154-main + s158-stable-zebra-open',
    base: baseStage154MainOptions,
    overlayKey: 's154-stable-zebra-open',
    generatedModule: rel(path.resolve(stage154Dir, 'exported', 's154-main.generated.js')),
  },
  {
    id: 's154-both-s158-both',
    label: 's154-both + s158-zebra-both-probe',
    base: baseStage154BothOptions,
    overlayKey: 's154-zebra-both-probe',
    generatedModule: rel(path.resolve(stage154Dir, 'exported', 's154-both.generated.js')),
  },
];

const overlayManifest = [];
const overlayVariants = overlaySpecs.map((spec) => {
  const overlayOptions = buildStage158StructuralEngineOptions(spec.overlayKey, { allowRetired: true });
  const mergedOptions = { ...spec.base, ...overlayOptions };
  const engineOptionsPath = path.resolve(engineOptionsOutDir, `${spec.id}.json`);
  writeJson(engineOptionsPath, mergedOptions);
  overlayManifest.push({
    id: spec.id,
    overlayKey: spec.overlayKey,
    generatedModule: spec.generatedModule,
    engineOptionsJson: rel(engineOptionsPath),
    moveOrderingStructureProfile: overlayOptions.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfile: overlayOptions.mpcStructureProfile?.key ?? null,
  });
  return {
    id: spec.id,
    type: 'custom',
    label: spec.label,
    generatedModule: spec.generatedModule,
    engineOptionsJson: rel(engineOptionsPath),
  };
});

const variants = [
  { id: 'active', variant: 'active', label: 'active-installed' },
  {
    id: 's151-full-both',
    type: 'custom',
    label: 's151-full-both',
    generatedModule: rel(path.resolve(stage151Dir, 'exported', 's151-full-both.generated.js')),
    engineOptionsJson: rel(path.resolve(stage151Dir, 'engine-options', 's151-full-both.json')),
  },
  {
    id: 's151-safe-full',
    type: 'custom',
    label: 's151-safe-full',
    generatedModule: rel(path.resolve(stage151Dir, 'exported', 's151-safe-full.generated.js')),
    engineOptionsJson: rel(path.resolve(stage151Dir, 'engine-options', 's151-safe-full.json')),
  },
  {
    id: 's154-main',
    type: 'custom',
    label: 's154-main',
    generatedModule: rel(path.resolve(stage154Dir, 'exported', 's154-main.generated.js')),
    engineOptionsJson: rel(path.resolve(stage154Dir, 'engine-options', 's154-main.json')),
  },
  {
    id: 's154-both',
    type: 'custom',
    label: 's154-both',
    generatedModule: rel(path.resolve(stage154Dir, 'exported', 's154-both.generated.js')),
    engineOptionsJson: rel(path.resolve(stage154Dir, 'engine-options', 's154-both.json')),
  },
  ...overlayVariants,
];

const defaults = {
  openingPlies: 20,
  ourMaxDepth: 6,
  theirMaxDepth: 18,
  exactEndgameEmpties: 10,
  solverAdjudicationEmpties: 14,
  solverAdjudicationTimeMs: 60000,
  solverAdjudicationMaxDepth: 14,
  variantSeedMode: 'shared',
  searchAlgorithm: 'classic-mtdf-2ply',
  aspirationWindow: 60,
  maxTableEntries: 90000,
};

const scenarios = [
  {
    id: 'noisy240-mtdf-seed29',
    label: 'noisy 240ms MTDf seed29',
    seed: 29,
    games: 4,
    ourTimeMs: 240,
    theirTimeMs: 240,
    theirNoiseScale: 4,
    searchAlgorithm: 'classic-mtdf-2ply',
    aspirationWindow: 60,
    maxTableEntries: 90000,
  },
  {
    id: 'noisy240-mtdf-seed53',
    label: 'noisy 240ms MTDf seed53',
    seed: 53,
    games: 4,
    ourTimeMs: 240,
    theirTimeMs: 240,
    theirNoiseScale: 4,
    searchAlgorithm: 'classic-mtdf-2ply',
    aspirationWindow: 60,
    maxTableEntries: 90000,
  },
  {
    id: 'noisy240-pvs-seed71',
    label: 'noisy 240ms PVS seed71',
    seed: 71,
    games: 4,
    ourTimeMs: 240,
    theirTimeMs: 240,
    theirNoiseScale: 4,
    searchAlgorithm: 'classic',
    aspirationWindow: 60,
    maxTableEntries: 90000,
  },
  {
    id: 'noisy240-pvs-seed89',
    label: 'noisy 240ms PVS seed89',
    seed: 89,
    games: 4,
    ourTimeMs: 240,
    theirTimeMs: 240,
    theirNoiseScale: 4,
    searchAlgorithm: 'classic',
    aspirationWindow: 60,
    maxTableEntries: 90000,
  },
];

const config = {
  defaults,
  referenceVariantId: 'active',
  variants,
  scenarios,
};

const configPath = path.resolve(outDir, 'trineutron-match-suite.stage15x-base-overlay-round6.json');
writeJson(configPath, config);
writeJson(path.resolve(outDir, 'overlay-manifest.json'), overlayManifest);
writeJson(path.resolve(outDir, 'manifest.json'), {
  generatedAt: new Date().toISOString(),
  configPath: rel(configPath),
  overlayManifest,
  variantIds: variants.map((variant) => variant.id),
  scenarioIds: scenarios.map((scenario) => scenario.id),
});

console.log(`Prepared round6 config: ${rel(configPath)}`);
console.log(`Prepared overlay manifest: ${rel(path.resolve(outDir, 'overlay-manifest.json'))}`);
