#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  buildStage157StructuralEngineOptions,
  listStage157StructuralCandidates,
} from '../evaluator-training/stage157-structural-candidates.mjs';
import {
  buildStage158StructuralEngineOptions,
  listStage158StructuralCandidates,
} from '../evaluator-training/stage158-structural-candidates.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SUPPORT_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack');
const STAGE154_DIR = path.resolve(SUPPORT_ROOT, 'stage154-main-recenter');
const OUTPUT_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage169-stage157-158-mainline-decision-pack');
const ENGINE_OPTIONS_OUT_DIR = path.resolve(OUTPUT_ROOT, 'engine-options');

const DEFAULT_DECISION_OPTIONS = Object.freeze({
  searchAlgorithm: 'classic',
  timeMsList: [80, 160, 240],
  openingPlies: 20,
  gamesPerSeed: 1,
  seedList: [17, 31, 53, 71],
  maxDepth: 6,
  exactEndgameEmpties: 10,
  solverAdjudicationEmpties: 14,
  solverAdjudicationTimeMs: 60000,
  maxTableEntries: 90000,
  aspirationWindow: 60,
});

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rel(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

const BASELINES = Object.freeze([
  Object.freeze({
    id: 's154-main',
    label: 's154-main',
    generatedModulePath: path.resolve(STAGE154_DIR, 'exported', 's154-main.generated.js'),
    engineOptionsPath: path.resolve(STAGE154_DIR, 'engine-options', 's154-main.json'),
  }),
  Object.freeze({
    id: 's154-both',
    label: 's154-both',
    generatedModulePath: path.resolve(STAGE154_DIR, 'exported', 's154-both.generated.js'),
    engineOptionsPath: path.resolve(STAGE154_DIR, 'engine-options', 's154-both.json'),
  }),
]);

function buildCandidateOverlayRecords({ stage, candidates, buildEngineOptions }) {
  return candidates.map((candidate) => {
    const overlayByBaseline = BASELINES.map((baseline) => {
      const mergedEngineOptions = {
        ...readJson(baseline.engineOptionsPath),
        ...buildEngineOptions(candidate.key),
      };
      const engineOptionsOutputPath = path.resolve(
        ENGINE_OPTIONS_OUT_DIR,
        `${baseline.id}__${candidate.key}.json`,
      );
      writeJson(engineOptionsOutputPath, mergedEngineOptions);
      return Object.freeze({
        baselineId: baseline.id,
        baselineLabel: baseline.label,
        generatedModule: rel(baseline.generatedModulePath),
        baseEngineOptionsJson: rel(baseline.engineOptionsPath),
        overlayEngineOptionsJson: rel(engineOptionsOutputPath),
        label: `${baseline.label} + ${candidate.key}`,
      });
    });

    return Object.freeze({
      stage,
      key: candidate.key,
      legacyAliases: candidate.legacyAliases ?? [],
      familyKey: candidate.familyKey,
      familyLabel: candidate.family.label,
      priority: candidate.priority,
      tier: candidate.tier,
      risk: candidate.risk,
      notes: candidate.notes,
      moveOrderingStructureProfileKey: candidate.moveOrderingStructureProfile?.key ?? null,
      mpcStructureProfileKey: candidate.mpcStructureProfile?.key ?? null,
      overlayByBaseline,
    });
  });
}

const stage157MainlineCandidates = listStage157StructuralCandidates({
  familyKey: 'stage154-main-recenter',
  includeAggressive: true,
}).filter((candidate) => candidate.tier !== 'control');

const stage158MainlineCandidates = listStage158StructuralCandidates({
  familyKey: 'stage154-main-recenter',
  includeAggressive: true,
}).filter((candidate) => candidate.tier !== 'control');

ensureDir(ENGINE_OPTIONS_OUT_DIR);

const stage157Records = buildCandidateOverlayRecords({
  stage: 157,
  candidates: stage157MainlineCandidates,
  buildEngineOptions: buildStage157StructuralEngineOptions,
});
const stage158Records = buildCandidateOverlayRecords({
  stage: 158,
  candidates: stage158MainlineCandidates,
  buildEngineOptions: buildStage158StructuralEngineOptions,
});

const manifest = Object.freeze({
  generatedAt: new Date().toISOString(),
  scope: 'stage154-mainline-only',
  rationale: 'stage151 late3 family is currently deprioritized; this pack keeps the stage157 adopted mainline overlays plus the single surviving stage158 mainline overlay (s154-stable-zebra) while retired stage158 non-selected keys remain historical-only.',
  defaults: DEFAULT_DECISION_OPTIONS,
  baselines: BASELINES.map((baseline) => Object.freeze({
    id: baseline.id,
    label: baseline.label,
    generatedModule: rel(baseline.generatedModulePath),
    engineOptionsJson: rel(baseline.engineOptionsPath),
  })),
  stage157Candidates: stage157Records,
  stage158Candidates: stage158Records,
  decisionOrder: [
    ...stage157Records.map((candidate) => candidate.key),
    ...stage158Records.map((candidate) => candidate.key),
  ],
});

const manifestPath = path.resolve(OUTPUT_ROOT, 'manifest.json');
writeJson(manifestPath, manifest);

console.log(`Prepared decision pack manifest: ${rel(manifestPath)}`);
console.log(`Prepared overlay engine options under: ${rel(ENGINE_OPTIONS_OUT_DIR)}`);
console.log(`Stage157 mainline candidates: ${stage157Records.length}`);
console.log(`Stage158 mainline candidates: ${stage158Records.length}`);
