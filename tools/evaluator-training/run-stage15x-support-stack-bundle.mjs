#!/usr/bin/env node
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  displayTrainingToolPath,
  ensureArray,
  loadGeneratedProfilesModuleIfPresent,
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from './lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_OUTPUT_ROOT = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack');
const DEFAULT_CONFIG_PATH = path.join(repoRoot, 'tools', 'evaluator-training', 'examples', 'stage15x-support-stack.example.json');
const VALID_PHASES = new Set(['prepare', 'move-ordering', 'mpc', 'export', 'all']);

const DEFAULT_CONFIG = Object.freeze({
  moduleFormat: 'factorized',
  engineOptions: {
    classicSearchDriver: 'pvs',
  },
  moveOrdering: {
    supersetBuckets: ['7-8', '9-9', '10-10', '11-12', '13-14', '15-16', '17-18', '19-19'],
    sampleStride: 200,
    sampleResidue: 0,
    maxRootsPerBucket: 600,
    holdoutMod: 10,
    holdoutResidue: 0,
    lambda: 5000,
    progressEvery: 20,
    exactRootMaxEmpties: 14,
    exactRootTimeLimitMs: 60000,
    teacherDepth: 6,
    teacherTimeLimitMs: 4000,
    teacherExactEndgameEmpties: 14,
    targetMode: 'root-mean',
    rootWeighting: 'uniform',
    exactRootWeightScale: 1.0,
    variants: {
      safe: {
        key: 'safe',
        description: '10-18 core only. 7-9 and 19 buckets are removed.',
        dropRanges: ['7-8', '9-9', '19-19'],
      },
      balanced: {
        key: 'balanced',
        description: '9-19 range. Only 7-8 bucket is removed.',
        dropRanges: ['7-8'],
      },
      wide: {
        key: 'wide',
        description: 'Full 7-19 superset.',
        aliasToSuperset: true,
      },
    },
  },
  mpc: {
    sampleStride: 200,
    sampleResidue: 0,
    maxSamplesPerBucket: 400,
    holdoutMod: 10,
    holdoutResidue: 0,
    targetHoldoutCoverage: 0.99,
    timeLimitMs: 120000,
    progressEvery: 20,
    maxTableEntries: 200000,
    aspirationWindow: 40,
    zValues: [1, 1.5, 1.96, 2.5, 3],
    sharedSearchPairs: {
      mode: 'auto',
      outputJsonl: null,
      summaryJson: null,
      checkpointJson: null,
      checkpointEvery: 50,
    },
    checkpoint: {
      enabled: true,
      every: 50,
      pathsBySuperset: null,
    },
    adaptiveStop: {
      enabled: false,
      minSamplesPerBucket: 160,
      checkEvery: 20,
    },
    maxAcceptedTotal: null,
    supersets: {
      overlap8: {
        key: 'overlap8',
        description: 'Conservative + mainstream overlap Multi-ProbCut superset.',
        calibrationBuckets: [
          '18-21:3>7',
          '18-21:4>8',
          '22-25:4>8',
          '22-25:4>9',
          '26-29:5>10',
          '26-29:6>10',
          '30-33:5>11',
          '30-33:6>10',
        ],
      },
      split8: {
        key: 'split8',
        description: 'More segmented split-stage Multi-ProbCut superset.',
        calibrationBuckets: [
          '18-19:3>7',
          '20-21:4>8',
          '22-23:4>8',
          '24-25:4>9',
          '26-27:5>10',
          '28-29:6>10',
          '30-31:5>11',
          '32-33:6>10',
        ],
      },
    },
    calibrationVariants: {
      baseline4: {
        key: 'baseline4',
        source: 'overlap8',
        keepSpecs: [
          '18-21:4>8',
          '22-25:4>8',
          '26-29:6>10',
          '30-33:6>10',
        ],
      },
      overlap8: {
        key: 'overlap8',
        source: 'overlap8',
      },
      split8: {
        key: 'split8',
        source: 'split8',
      },
    },
    runtimeVariants: {
      safe4High: {
        key: 'safe4High',
        sourceCalibration: 'baseline4',
        description: 'Most conservative high-only 4-bucket runtime.',
        defaultMode: 'high',
        maxWindow: 1,
        maxChecksPerNode: 1,
        minDepth: 2,
        minDepthGap: 2,
        maxDepthDistance: 1,
        minPly: 1,
        intervalScale: 1.0,
        highScale: 1.0,
        lowScale: 1.0,
        depthDistanceScale: 1.25,
      },
      overlapHighSafe: {
        key: 'overlapHighSafe',
        sourceCalibration: 'overlap8',
        description: 'Overlap-8 high-only safe runtime.',
        defaultMode: 'high',
        maxWindow: 1,
        maxChecksPerNode: 2,
        minDepth: 2,
        minDepthGap: 2,
        maxDepthDistance: 1,
        minPly: 1,
        intervalScale: 1.0,
        highScale: 1.0,
        lowScale: 1.0,
        depthDistanceScale: 1.25,
      },
      overlapHighTight: {
        key: 'overlapHighTight',
        sourceCalibration: 'overlap8',
        description: 'Overlap-8 high-only tighter runtime.',
        defaultMode: 'high',
        maxWindow: 1,
        maxChecksPerNode: 2,
        minDepth: 2,
        minDepthGap: 2,
        maxDepthDistance: 1,
        minPly: 1,
        intervalScale: 1.0,
        highScale: 0.93,
        lowScale: 1.0,
        depthDistanceScale: 1.25,
      },
      splitHighTight: {
        key: 'splitHighTight',
        sourceCalibration: 'split8',
        description: 'Split-stage high-only tighter runtime.',
        defaultMode: 'high',
        maxWindow: 1,
        maxChecksPerNode: 2,
        minDepth: 2,
        minDepthGap: 2,
        maxDepthDistance: 1,
        minPly: 1,
        intervalScale: 1.0,
        highScale: 0.93,
        lowScale: 1.0,
        depthDistanceScale: 1.25,
      },
      overlapBothSoftLow: {
        key: 'overlapBothSoftLow',
        sourceCalibration: 'overlap8',
        description: 'Overlap-8 both-mode runtime with soft low cut.',
        defaultMode: 'both',
        maxWindow: 1,
        maxChecksPerNode: 2,
        minDepth: 2,
        minDepthGap: 2,
        maxDepthDistance: 1,
        minPly: 1,
        intervalScale: 1.0,
        highScale: 1.0,
        lowScale: 0.9,
        depthDistanceScale: 1.25,
      },
    },
  },
  families: [
    {
      key: 'stage154-main-recenter',
      label: 'stage154 main_recenter',
      sourceModule: 'tools/evaluator-training/out/stage154/modules/learned-eval-profile.main_only.recenter.factorized.generated.js',
      orderingPatternBankVariants: {
        base: {
          key: 'base',
          mode: 'source',
          description: 'No move-ordering pattern bank in source module.',
          engineOptions: {},
        },
      },
      candidates: [
        {
          key: 's154-safe',
          moveOrderingVariant: 'safe',
          orderingPatternBankVariant: 'base',
          mpcRuntimeVariant: 'safe4High',
          rationale: 'Closest conservative retune: 10-18 ordering core + 4-bucket high-only MPC.',
        },
        {
          key: 's154-main',
          moveOrderingVariant: 'balanced',
          orderingPatternBankVariant: 'base',
          mpcRuntimeVariant: 'overlapHighTight',
          rationale: 'Primary stage154 lane: 9-19 ordering + overlap high-only tight MPC.',
        },
        {
          key: 's154-wide-safe',
          moveOrderingVariant: 'wide',
          orderingPatternBankVariant: 'base',
          mpcRuntimeVariant: 'overlapHighSafe',
          rationale: 'Wider 7-19 ordering with still-safe high-only MPC.',
        },
        {
          key: 's154-split',
          moveOrderingVariant: 'balanced',
          orderingPatternBankVariant: 'base',
          mpcRuntimeVariant: 'splitHighTight',
          rationale: 'Alternative split-stage MPC without changing evaluator family.',
        },
        {
          key: 's154-both',
          moveOrderingVariant: 'wide',
          orderingPatternBankVariant: 'base',
          mpcRuntimeVariant: 'overlapBothSoftLow',
          rationale: 'Most aggressive stage154 candidate still aligned with mainstream MPC usage.',
        },
      ],
    },
    {
      key: 'stage151-split-late3',
      label: 'stage151 split_late3',
      sourceModule: 'tools/evaluator-training/out/stage151/learned-eval-profile.split_late3.factorized.generated.js',
      orderingPatternBankVariants: {
        full: {
          key: 'full',
          mode: 'source',
          description: 'Keep full late3 move-ordering pattern bank (13-19, 7-12, 0-6).',
          engineOptions: { moveOrderingPatternBankMaxEmpties: 19 },
        },
        noend: {
          key: 'noend',
          mode: 'clip',
          minEmpties: 7,
          maxEmpties: 19,
          description: 'Drop only 0-6 ordering pattern bank buckets.',
          engineOptions: { moveOrderingPatternBankMaxEmpties: 19 },
        },
        latea: {
          key: 'latea',
          mode: 'clip',
          minEmpties: 13,
          maxEmpties: 19,
          description: 'Keep only 13-19 late-a ordering pattern bank buckets.',
          engineOptions: { moveOrderingPatternBankMaxEmpties: 19 },
        },
        off: {
          key: 'off',
          mode: 'off',
          description: 'Disable move-ordering pattern bank completely.',
          engineOptions: {},
        },
      },
      candidates: [
        {
          key: 's151-safe-full',
          moveOrderingVariant: 'safe',
          orderingPatternBankVariant: 'full',
          mpcRuntimeVariant: 'safe4High',
          rationale: 'Conservative full late3 retune: keep all ordering PB but use safest MPC.',
        },
        {
          key: 's151-noend-main',
          moveOrderingVariant: 'balanced',
          orderingPatternBankVariant: 'noend',
          mpcRuntimeVariant: 'overlapHighTight',
          rationale: 'Primary stage151 lane: remove 0-6 ordering PB and pair with overlap high-only tight MPC.',
        },
        {
          key: 's151-latea-main',
          moveOrderingVariant: 'balanced',
          orderingPatternBankVariant: 'latea',
          mpcRuntimeVariant: 'overlapHighTight',
          rationale: 'Keep only 13-19 ordering PB to test whether late-a is the real signal.',
        },
        {
          key: 's151-linear-only',
          moveOrderingVariant: 'balanced',
          orderingPatternBankVariant: 'off',
          mpcRuntimeVariant: 'overlapHighTight',
          rationale: 'Stage151 evaluation family with late3 ordering PB completely removed.',
        },
        {
          key: 's151-noend-split',
          moveOrderingVariant: 'wide',
          orderingPatternBankVariant: 'noend',
          mpcRuntimeVariant: 'splitHighTight',
          rationale: 'Same noend ordering PB but with split-stage high-only MPC.',
        },
        {
          key: 's151-full-both',
          moveOrderingVariant: 'wide',
          orderingPatternBankVariant: 'full',
          mpcRuntimeVariant: 'overlapBothSoftLow',
          rationale: 'Most aggressive late3 family candidate with full PB + both-mode MPC.',
        },
      ],
    },
  ],
});

function printUsage() {
  const toolPath = displayTrainingToolPath('run-stage15x-support-stack-bundle.mjs');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-root tools/evaluator-training/out/stage15x-support-stack] \
    [--config tools/evaluator-training/examples/stage15x-support-stack.example.json] \
    [--phase prepare|move-ordering|mpc|export|all] \
    [--family stage154-main-recenter --family stage151-split-late3] \
    [--resume] [--continue-on-error] [--plan-only]

설명:
- stage154 / stage151 support stack 후보군을 한 번에 재현하는 올인원 bundle입니다.
- 공통 superset 학습(move-ordering, MPC calibration)을 먼저 수행하고,
  이후 variant 스크립트로 move-ordering / ordering pattern bank / MPC calibration / runtime 조합을 분기합니다.
- MPC 단계는 기본적으로 family 내부 superset이 2개 이상이면 shared search-pair precompute를 자동 사용하고,
  checkpoint/resume도 자동으로 연결합니다.
- export 단계는 factorized generated module + engine-options JSON + size summary를 동시에 남깁니다.
`);
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? cloneJson(base) : cloneJson(override);
  }
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? cloneJson(base) : cloneJson(override);
  }
  const merged = { ...cloneJson(base) };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    merged[key] = key in merged ? deepMerge(merged[key], value) : cloneJson(value);
  }
  return merged;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function ensureList(value) {
  return ensureArray(value).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean);
}

function toPortableRelative(targetPath) {
  if (!targetPath) {
    return null;
  }
  const relative = path.relative(repoRoot, targetPath);
  return toPortablePath(relative || path.basename(targetPath));
}

function maybePushArg(argv, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  argv.push(`--${key}`, String(value));
}

function maybePushRepeatedArg(argv, key, values) {
  for (const value of values ?? []) {
    maybePushArg(argv, key, value);
  }
}

function maybePushFlag(argv, key, enabled) {
  if (enabled) {
    argv.push(`--${key}`);
  }
}

function dedupeListPreservingOrder(values) {
  const seen = new Set();
  const result = [];
  for (const value of values ?? []) {
    const normalized = String(value ?? '').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function resolveFamilySharedSearchPairPaths(familyPaths, config) {
  const sharedConfig = isPlainObject(config?.mpc?.sharedSearchPairs) ? config.mpc.sharedSearchPairs : {};
  return {
    outputJsonl: sharedConfig.outputJsonl ? resolveCliPath(sharedConfig.outputJsonl) : path.join(familyPaths.mpcDir, 'shared-search-pairs.jsonl'),
    summaryJson: sharedConfig.summaryJson ? resolveCliPath(sharedConfig.summaryJson) : path.join(familyPaths.mpcDir, 'shared-search-pairs.summary.json'),
    checkpointJson: sharedConfig.checkpointJson ? resolveCliPath(sharedConfig.checkpointJson) : path.join(familyPaths.mpcDir, 'shared-search-pairs.checkpoint.json'),
  };
}

function resolveFamilyMpcCheckpointPath(familyPaths, config, supersetKey) {
  const checkpointConfig = isPlainObject(config?.mpc?.checkpoint) ? config.mpc.checkpoint : {};
  const perSuperset = isPlainObject(checkpointConfig.pathsBySuperset) ? checkpointConfig.pathsBySuperset[supersetKey] : null;
  const explicitPath = perSuperset ?? checkpointConfig.outputJson ?? null;
  if (explicitPath) {
    return resolveCliPath(explicitPath);
  }
  return path.join(familyPaths.mpcDir, `calibration.${supersetKey}.checkpoint.json`);
}

function outputPathsForFamily(outputRoot, familyKey) {
  const familyRoot = path.join(outputRoot, familyKey);
  return {
    familyRoot,
    sharedDir: path.join(familyRoot, 'shared'),
    moveOrderingDir: path.join(familyRoot, 'move-ordering'),
    orderingPatternBankDir: path.join(familyRoot, 'ordering-pattern-bank'),
    mpcDir: path.join(familyRoot, 'mpc'),
    exportDir: path.join(familyRoot, 'exported'),
    engineOptionsDir: path.join(familyRoot, 'engine-options'),
    manifestPath: path.join(familyRoot, 'bundle-manifest.json'),
    candidateSummaryPath: path.join(familyRoot, 'candidate-summary.json'),
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
}

function fileSizeSummary(filePath) {
  if (!fsSync.existsSync(filePath)) {
    return null;
  }
  const raw = fsSync.readFileSync(filePath);
  return {
    rawBytes: raw.length,
    gzipBytes: gzipSync(raw, { level: 9 }).length,
  };
}

function checkpointIndicatesIncompleteWork(checkpointPath) {
  if (!checkpointPath || !fsSync.existsSync(checkpointPath)) {
    return false;
  }
  try {
    const parsed = JSON.parse(fsSync.readFileSync(checkpointPath, 'utf8'));
    return parsed?.completed === false;
  } catch {
    return false;
  }
}

function spawnNodeScript(scriptPath, args, {
  label,
  continueOnError = false,
  planOnly = false,
  resume = false,
  outputs = [],
  resumeCheckpointPaths = [],
} = {}) {
  const normalizedOutputs = outputs.filter(Boolean);
  const hasIncompleteCheckpoint = resume && ensureArray(resumeCheckpointPaths)
    .filter(Boolean)
    .some((checkpointPath) => checkpointIndicatesIncompleteWork(checkpointPath));
  if (resume && normalizedOutputs.length > 0 && normalizedOutputs.every((outputPath) => fsSync.existsSync(outputPath)) && !hasIncompleteCheckpoint) {
    console.log(`[skip] ${label} (all outputs already exist)`);
    return;
  }
  if (planOnly) {
    console.log(`[plan] ${label}`);
    return;
  }
  console.log(`[run ] ${label}`);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    const message = `${label} failed with exit code ${result.status ?? 'unknown'}`;
    if (continueOnError) {
      console.warn(`[warn] ${message}`);
      return;
    }
    throw new Error(message);
  }
}

async function writeSourceModuleArtifacts(family, familyPaths, planOnly = false) {
  const shared = {};
  if (planOnly && await pathExists(familyPaths.sharedDir)) {
    // keep current files on plan-only reruns
  }
  const sourceModulePath = resolveCliPath(family.sourceModule);
  const moduleProfiles = await loadGeneratedProfilesModuleIfPresent(sourceModulePath);
  if (!moduleProfiles) {
    throw new Error(`Could not load source module for ${family.key}: ${sourceModulePath}`);
  }

  if (!planOnly) {
    await fs.mkdir(familyPaths.sharedDir, { recursive: true });
  }

  shared.sourceModulePath = sourceModulePath;
  if (moduleProfiles.evaluationProfile) {
    shared.evaluationProfilePath = path.join(familyPaths.sharedDir, 'source-evaluation-profile.json');
    if (!planOnly) {
      await writeJson(shared.evaluationProfilePath, moduleProfiles.evaluationProfile);
    }
  }
  if (moduleProfiles.moveOrderingProfile) {
    shared.moveOrderingProfilePath = path.join(familyPaths.sharedDir, 'source-move-ordering-profile.json');
    if (!planOnly) {
      await writeJson(shared.moveOrderingProfilePath, moduleProfiles.moveOrderingProfile);
    }
  }
  if (moduleProfiles.tupleResidualProfile) {
    shared.tupleProfilePath = path.join(familyPaths.sharedDir, 'source-tuple-profile.json');
    if (!planOnly) {
      await writeJson(shared.tupleProfilePath, moduleProfiles.tupleResidualProfile);
    }
  }
  if (moduleProfiles.mpcProfile) {
    shared.mpcProfilePath = path.join(familyPaths.sharedDir, 'source-mpc-profile.json');
    if (!planOnly) {
      await writeJson(shared.mpcProfilePath, moduleProfiles.mpcProfile);
    }
  }

  shared.evaluationPatternBankPaths = [];
  for (let index = 0; index < (moduleProfiles.patternBankProfiles?.length ?? 0); index += 1) {
    const profile = moduleProfiles.patternBankProfiles[index];
    const filePath = path.join(familyPaths.sharedDir, `evaluation-pattern-bank.${String(index + 1).padStart(2, '0')}.json`);
    shared.evaluationPatternBankPaths.push(filePath);
    if (!planOnly) {
      await writeJson(filePath, profile);
    }
  }

  shared.orderingPatternBankSourcePaths = [];
  for (let index = 0; index < (moduleProfiles.moveOrderingPatternBankProfiles?.length ?? 0); index += 1) {
    const profile = moduleProfiles.moveOrderingPatternBankProfiles[index];
    const filePath = path.join(familyPaths.sharedDir, `ordering-pattern-bank.source.${String(index + 1).padStart(2, '0')}.json`);
    shared.orderingPatternBankSourcePaths.push(filePath);
    if (!planOnly) {
      await writeJson(filePath, profile);
    }
  }

  const manifest = {
    familyKey: family.key,
    label: family.label,
    sourceModulePath: toPortableRelative(sourceModulePath),
    evaluationProfilePath: toPortableRelative(shared.evaluationProfilePath),
    moveOrderingProfilePath: toPortableRelative(shared.moveOrderingProfilePath),
    tupleProfilePath: toPortableRelative(shared.tupleProfilePath),
    mpcProfilePath: toPortableRelative(shared.mpcProfilePath),
    evaluationPatternBankPaths: shared.evaluationPatternBankPaths.map(toPortableRelative),
    orderingPatternBankSourcePaths: shared.orderingPatternBankSourcePaths.map(toPortableRelative),
    profileNames: {
      evaluation: moduleProfiles.evaluationProfile?.name ?? null,
      moveOrdering: moduleProfiles.moveOrderingProfile?.name ?? null,
      tuple: moduleProfiles.tupleResidualProfile?.name ?? null,
      mpc: moduleProfiles.mpcProfile?.name ?? null,
      evaluationPatternBanks: (moduleProfiles.patternBankProfiles ?? []).map((profile) => profile?.name ?? null),
      orderingPatternBanks: (moduleProfiles.moveOrderingPatternBankProfiles ?? []).map((profile) => profile?.name ?? null),
    },
  };
  if (!planOnly) {
    await writeJson(path.join(familyPaths.sharedDir, 'source-module-manifest.json'), manifest);
  }
  return shared;
}

function resolveMoveOrderingVariantPaths(familyPaths, config) {
  const supersetPath = path.join(familyPaths.moveOrderingDir, 'move-ordering.superset.json');
  const variants = {
    superset: supersetPath,
  };
  for (const [variantKey, variantConfig] of Object.entries(config.moveOrdering.variants ?? {})) {
    variants[variantKey] = variantConfig.aliasToSuperset
      ? supersetPath
      : path.join(familyPaths.moveOrderingDir, `move-ordering.${variantKey}.json`);
  }
  return variants;
}

function resolveOrderingPatternVariantPaths(familyPaths, family, shared) {
  const sourceOrderingPatternPath = shared?.orderingPatternBankSourcePaths?.[0] ?? null;
  const variants = {};
  for (const [variantKey, variantConfig] of Object.entries(family.orderingPatternBankVariants ?? {})) {
    if (variantConfig.mode === 'off' || !sourceOrderingPatternPath) {
      variants[variantKey] = null;
      continue;
    }
    variants[variantKey] = variantConfig.mode === 'source'
      ? sourceOrderingPatternPath
      : path.join(familyPaths.orderingPatternBankDir, `ordering-pattern-bank.${variantKey}.json`);
  }
  return variants;
}

function resolveMpcPaths(familyPaths, config) {
  const calibrationSupersetPaths = {};
  for (const supersetKey of Object.keys(config.mpc.supersets ?? {})) {
    calibrationSupersetPaths[supersetKey] = path.join(familyPaths.mpcDir, `calibration.${supersetKey}.json`);
  }
  const calibrationVariantPaths = {};
  for (const variantKey of Object.keys(config.mpc.calibrationVariants ?? {})) {
    calibrationVariantPaths[variantKey] = path.join(familyPaths.mpcDir, `calibration-variant.${variantKey}.json`);
  }
  const runtimeVariantPaths = {};
  for (const variantKey of Object.keys(config.mpc.runtimeVariants ?? {})) {
    runtimeVariantPaths[variantKey] = path.join(familyPaths.mpcDir, `runtime.${variantKey}.json`);
  }
  return { calibrationSupersetPaths, calibrationVariantPaths, runtimeVariantPaths };
}

async function runPreparePhase(family, familyPaths, config, options) {
  await fs.mkdir(familyPaths.familyRoot, { recursive: true });
  const shared = await writeSourceModuleArtifacts(family, familyPaths, options.planOnly);
  const manifest = {
    familyKey: family.key,
    label: family.label,
    sourceModule: toPortableRelative(resolveCliPath(family.sourceModule)),
    moveOrderingSupersetBuckets: config.moveOrdering.supersetBuckets,
    moveOrderingVariantKeys: Object.keys(config.moveOrdering.variants ?? {}),
    orderingPatternBankVariantKeys: Object.keys(family.orderingPatternBankVariants ?? {}),
    mpcSupersetKeys: Object.keys(config.mpc.supersets ?? {}),
    mpcRuntimeVariantKeys: Object.keys(config.mpc.runtimeVariants ?? {}),
    candidateKeys: (family.candidates ?? []).map((candidate) => candidate.key),
    sharedArtifacts: {
      evaluationProfilePath: toPortableRelative(shared.evaluationProfilePath),
      moveOrderingProfilePath: toPortableRelative(shared.moveOrderingProfilePath),
      tupleProfilePath: toPortableRelative(shared.tupleProfilePath),
      mpcProfilePath: toPortableRelative(shared.mpcProfilePath),
      evaluationPatternBankPaths: shared.evaluationPatternBankPaths.map(toPortableRelative),
      orderingPatternBankSourcePaths: shared.orderingPatternBankSourcePaths.map(toPortableRelative),
    },
  };
  if (!options.planOnly) {
    await writeJson(familyPaths.manifestPath, manifest);
  }
  return shared;
}

function trainMoveOrderingArgs(shared, familyPaths, config) {
  const supersetPath = path.join(familyPaths.moveOrderingDir, 'move-ordering.superset.json');
  return {
    outputPath: supersetPath,
    argv: [
      '--teacher-generated-module', shared.sourceModulePath,
      '--module-generated-module', shared.sourceModulePath,
      '--child-buckets', ensureList(config.moveOrdering.supersetBuckets).join(','),
      '--sample-stride', String(config.moveOrdering.sampleStride ?? 200),
      '--sample-residue', String(config.moveOrdering.sampleResidue ?? 0),
      '--max-roots-per-bucket', String(config.moveOrdering.maxRootsPerBucket ?? 600),
      '--holdout-mod', String(config.moveOrdering.holdoutMod ?? 10),
      '--holdout-residue', String(config.moveOrdering.holdoutResidue ?? 0),
      '--lambda', String(config.moveOrdering.lambda ?? 5000),
      '--progress-every', String(config.moveOrdering.progressEvery ?? 20),
      '--exact-root-max-empties', String(config.moveOrdering.exactRootMaxEmpties ?? 14),
      '--exact-root-time-limit-ms', String(config.moveOrdering.exactRootTimeLimitMs ?? 60000),
      '--teacher-depth', String(config.moveOrdering.teacherDepth ?? 6),
      '--teacher-time-limit-ms', String(config.moveOrdering.teacherTimeLimitMs ?? 4000),
      '--teacher-exact-endgame-empties', String(config.moveOrdering.teacherExactEndgameEmpties ?? 14),
      '--target-mode', String(config.moveOrdering.targetMode ?? 'root-mean'),
      '--root-weighting', String(config.moveOrdering.rootWeighting ?? 'uniform'),
      '--exact-root-weight-scale', String(config.moveOrdering.exactRootWeightScale ?? 1),
      '--seed-profile', shared.moveOrderingProfilePath,
      '--output-json', supersetPath,
      '--name', `${path.basename(familyPaths.familyRoot)}__move-ordering__superset`,
      '--description', `${path.basename(familyPaths.familyRoot)} family-aware move-ordering superset`,
    ],
  };
}

async function runMoveOrderingPhase(family, familyPaths, config, options, shared) {
  await fs.mkdir(familyPaths.moveOrderingDir, { recursive: true });
  const superset = trainMoveOrderingArgs(shared, familyPaths, config);
  spawnNodeScript(
    path.join(repoRoot, 'tools', 'evaluator-training', 'train-move-ordering-profile.mjs'),
    [...options.inputs.flatMap((inputPath) => ['--input', inputPath]), ...superset.argv],
    {
      label: `${family.key}: train move-ordering superset`,
      continueOnError: options.continueOnError,
      planOnly: options.planOnly,
      resume: options.resume,
      outputs: [superset.outputPath],
    },
  );

  const variantPaths = resolveMoveOrderingVariantPaths(familyPaths, config);
  for (const [variantKey, variantConfig] of Object.entries(config.moveOrdering.variants ?? {})) {
    if (variantConfig.aliasToSuperset) {
      continue;
    }
    const outputPath = variantPaths[variantKey];
    const argv = [
      '--input-profile', superset.outputPath,
      '--output-json', outputPath,
      '--name', `${family.key}__move-ordering__${variantKey}`,
      '--description', variantConfig.description ?? `${family.key} move-ordering variant ${variantKey}`,
    ];
    maybePushRepeatedArg(argv, 'drop-range', ensureList(variantConfig.dropRanges));
    spawnNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'make-move-ordering-variant.mjs'),
      argv,
      {
        label: `${family.key}: derive move-ordering variant ${variantKey}`,
        continueOnError: options.continueOnError,
        planOnly: options.planOnly,
        resume: options.resume,
        outputs: [outputPath],
      },
    );
  }

  await fs.mkdir(familyPaths.orderingPatternBankDir, { recursive: true });
  const orderingPatternVariantPaths = {};
  const sourceOrderingPatternPath = shared.orderingPatternBankSourcePaths[0] ?? null;
  for (const [variantKey, variantConfig] of Object.entries(family.orderingPatternBankVariants ?? {})) {
    if (variantConfig.mode === 'off' || !sourceOrderingPatternPath) {
      orderingPatternVariantPaths[variantKey] = null;
      continue;
    }
    if (variantConfig.mode === 'source') {
      orderingPatternVariantPaths[variantKey] = sourceOrderingPatternPath;
      continue;
    }
    const outputPath = path.join(familyPaths.orderingPatternBankDir, `ordering-pattern-bank.${variantKey}.json`);
    orderingPatternVariantPaths[variantKey] = outputPath;
    const argv = [
      '--input-profile', sourceOrderingPatternPath,
      '--output-json', outputPath,
      '--name', `${family.key}__ordering-pattern-bank__${variantKey}`,
      '--description', variantConfig.description ?? `${family.key} ordering pattern bank variant ${variantKey}`,
      '--min-empties', String(variantConfig.minEmpties),
      '--max-empties', String(variantConfig.maxEmpties),
    ];
    spawnNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'make-pattern-bank-variant.mjs'),
      argv,
      {
        label: `${family.key}: derive ordering pattern-bank variant ${variantKey}`,
        continueOnError: options.continueOnError,
        planOnly: options.planOnly,
        resume: options.resume,
        outputs: [outputPath],
      },
    );
  }
  return { moveOrderingVariantPaths: variantPaths, orderingPatternVariantPaths };
}

async function runMpcPhase(family, familyPaths, config, options, shared) {
  await fs.mkdir(familyPaths.mpcDir, { recursive: true });
  const { calibrationSupersetPaths, calibrationVariantPaths, runtimeVariantPaths } = resolveMpcPaths(familyPaths, config);
  const supersetMoveOrderingPath = resolveMoveOrderingVariantPaths(familyPaths, config).superset;
  const mpcConfig = isPlainObject(config.mpc) ? config.mpc : {};
  const supersetEntries = Object.entries(mpcConfig.supersets ?? {});
  const sharedSearchPairsConfig = isPlainObject(mpcConfig.sharedSearchPairs) ? mpcConfig.sharedSearchPairs : {};
  const checkpointConfig = isPlainObject(mpcConfig.checkpoint) ? mpcConfig.checkpoint : {};
  const adaptiveStopConfig = isPlainObject(mpcConfig.adaptiveStop) ? mpcConfig.adaptiveStop : {};
  const sharedSearchPairsMode = typeof sharedSearchPairsConfig.mode === 'string'
    ? sharedSearchPairsConfig.mode.trim().toLowerCase()
    : 'auto';
  const sharedSearchPairsEnabled = (sharedSearchPairsMode === 'on')
    || (sharedSearchPairsMode !== 'off' && supersetEntries.length > 1);
  const adaptiveStopEnabled = Boolean(adaptiveStopConfig.enabled);
  const maxAcceptedTotal = mpcConfig.maxAcceptedTotal;

  if (sharedSearchPairsEnabled && supersetEntries.length > 0) {
    const sharedPaths = resolveFamilySharedSearchPairPaths(familyPaths, config);
    const unionCalibrationBuckets = dedupeListPreservingOrder(
      supersetEntries.flatMap(([, supersetConfig]) => ensureList(supersetConfig.calibrationBuckets)),
    );
    const precomputeArgs = [
      ...options.inputs.flatMap((inputPath) => ['--input', inputPath]),
      '--generated-module', shared.sourceModulePath,
      '--move-ordering-profile-json', supersetMoveOrderingPath,
      '--mpc-profile-json', 'off',
      '--calibration-buckets', unionCalibrationBuckets.join(','),
      '--sample-stride', String(mpcConfig.sampleStride ?? 200),
      '--sample-residue', String(mpcConfig.sampleResidue ?? 0),
      '--max-samples-per-bucket', String(mpcConfig.maxSamplesPerBucket ?? 400),
      '--time-limit-ms', String(mpcConfig.timeLimitMs ?? 120000),
      '--progress-every', String(mpcConfig.progressEvery ?? 20),
      '--max-table-entries', String(mpcConfig.maxTableEntries ?? 200000),
      '--aspiration-window', String(mpcConfig.aspirationWindow ?? 40),
      '--output-jsonl', sharedPaths.outputJsonl,
      '--summary-json', sharedPaths.summaryJson,
    ];
    if (checkpointConfig.enabled !== false) {
      maybePushArg(precomputeArgs, 'checkpoint-json', sharedPaths.checkpointJson);
      maybePushArg(precomputeArgs, 'checkpoint-every', sharedSearchPairsConfig.checkpointEvery ?? checkpointConfig.every ?? 50);
      maybePushFlag(precomputeArgs, 'resume', options.resume);
    }
    maybePushArg(precomputeArgs, 'max-accepted-total', maxAcceptedTotal);
    console.log(`[info] ${family.key}: shared MPC search-pair precompute ${sharedSearchPairsMode === 'auto' ? 'auto-enabled' : 'enabled'} (${supersetEntries.length} supersets)`);
    spawnNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'precompute-mpc-search-pairs.mjs'),
      precomputeArgs,
      {
        label: `${family.key}: precompute shared MPC search pairs`,
        continueOnError: options.continueOnError,
        planOnly: options.planOnly,
        resume: options.resume,
        outputs: [sharedPaths.outputJsonl, sharedPaths.summaryJson],
        resumeCheckpointPaths: [sharedPaths.checkpointJson],
      },
    );

    for (const [supersetKey, supersetConfig] of supersetEntries) {
      const outputPath = calibrationSupersetPaths[supersetKey];
      const argv = [
        '--search-pairs-jsonl', sharedPaths.outputJsonl,
        '--calibration-buckets', ensureList(supersetConfig.calibrationBuckets).join(','),
        '--max-samples-per-bucket', String(mpcConfig.maxSamplesPerBucket ?? 400),
        '--holdout-mod', String(mpcConfig.holdoutMod ?? 10),
        '--holdout-residue', String(mpcConfig.holdoutResidue ?? 0),
        '--target-holdout-coverage', String(mpcConfig.targetHoldoutCoverage ?? 0.99),
        '--z-values', ensureList(mpcConfig.zValues).join(','),
        '--output-json', outputPath,
        '--name', `${family.key}__mpc__${supersetKey}`,
        '--description', supersetConfig.description ?? `${family.key} MPC calibration superset ${supersetKey}`,
      ];
      maybePushFlag(argv, 'adaptive-stop', adaptiveStopEnabled);
      if (adaptiveStopEnabled) {
        maybePushArg(argv, 'adaptive-min-samples-per-bucket', adaptiveStopConfig.minSamplesPerBucket ?? 160);
        maybePushArg(argv, 'adaptive-check-every', adaptiveStopConfig.checkEvery ?? 20);
      }
      maybePushArg(argv, 'max-accepted-total', maxAcceptedTotal);
      spawnNodeScript(
        path.join(repoRoot, 'tools', 'evaluator-training', 'fit-mpc-profile-from-search-pairs.mjs'),
        argv,
        {
          label: `${family.key}: fit MPC superset ${supersetKey} from shared pairs`,
          continueOnError: options.continueOnError,
          planOnly: options.planOnly,
          resume: options.resume,
          outputs: [outputPath],
        },
      );
    }
  } else {
    for (const [supersetKey, supersetConfig] of supersetEntries) {
      const outputPath = calibrationSupersetPaths[supersetKey];
      const argv = [
        ...options.inputs.flatMap((inputPath) => ['--input', inputPath]),
        '--generated-module', shared.sourceModulePath,
        '--move-ordering-profile-json', supersetMoveOrderingPath,
        '--mpc-profile-json', 'off',
        '--calibration-buckets', ensureList(supersetConfig.calibrationBuckets).join(','),
        '--sample-stride', String(mpcConfig.sampleStride ?? 200),
        '--sample-residue', String(mpcConfig.sampleResidue ?? 0),
        '--max-samples-per-bucket', String(mpcConfig.maxSamplesPerBucket ?? 400),
        '--holdout-mod', String(mpcConfig.holdoutMod ?? 10),
        '--holdout-residue', String(mpcConfig.holdoutResidue ?? 0),
        '--target-holdout-coverage', String(mpcConfig.targetHoldoutCoverage ?? 0.99),
        '--time-limit-ms', String(mpcConfig.timeLimitMs ?? 120000),
        '--progress-every', String(mpcConfig.progressEvery ?? 20),
        '--max-table-entries', String(mpcConfig.maxTableEntries ?? 200000),
        '--aspiration-window', String(mpcConfig.aspirationWindow ?? 40),
        '--z-values', ensureList(mpcConfig.zValues).join(','),
        '--output-json', outputPath,
        '--name', `${family.key}__mpc__${supersetKey}`,
        '--description', supersetConfig.description ?? `${family.key} MPC calibration superset ${supersetKey}`,
      ];
      if (checkpointConfig.enabled !== false) {
        maybePushArg(argv, 'checkpoint-json', resolveFamilyMpcCheckpointPath(familyPaths, config, supersetKey));
        maybePushArg(argv, 'checkpoint-every', checkpointConfig.every ?? 50);
        maybePushFlag(argv, 'resume', options.resume);
      }
      maybePushFlag(argv, 'adaptive-stop', adaptiveStopEnabled);
      if (adaptiveStopEnabled) {
        maybePushArg(argv, 'adaptive-min-samples-per-bucket', adaptiveStopConfig.minSamplesPerBucket ?? 160);
        maybePushArg(argv, 'adaptive-check-every', adaptiveStopConfig.checkEvery ?? 20);
      }
      maybePushArg(argv, 'max-accepted-total', maxAcceptedTotal);
      spawnNodeScript(
        path.join(repoRoot, 'tools', 'evaluator-training', 'calibrate-mpc-profile.mjs'),
        argv,
        {
          label: `${family.key}: calibrate MPC superset ${supersetKey}`,
          continueOnError: options.continueOnError,
          planOnly: options.planOnly,
          resume: options.resume,
          outputs: [outputPath],
          resumeCheckpointPaths: checkpointConfig.enabled !== false
            ? [resolveFamilyMpcCheckpointPath(familyPaths, config, supersetKey)]
            : [],
        },
      );
    }
  }

  for (const [variantKey, variantConfig] of Object.entries(config.mpc.calibrationVariants ?? {})) {
    const sourceSupersetPath = calibrationSupersetPaths[variantConfig.source];
    const outputPath = calibrationVariantPaths[variantKey];
    if (!variantConfig.keepSpecs) {
      if (!options.planOnly && sourceSupersetPath && sourceSupersetPath !== outputPath && await pathExists(sourceSupersetPath) && !(options.resume && await pathExists(outputPath))) {
        await fs.copyFile(sourceSupersetPath, outputPath);
      }
      continue;
    }
    const argv = [
      '--input-profile', sourceSupersetPath,
      '--output-json', outputPath,
      '--name', `${family.key}__mpc-calibration__${variantKey}`,
      '--description', `${family.key} MPC calibration variant ${variantKey}`,
      ...ensureList(variantConfig.keepSpecs).flatMap((spec) => ['--keep-spec', spec]),
    ];
    spawnNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'make-mpc-calibration-variant.mjs'),
      argv,
      {
        label: `${family.key}: derive MPC calibration variant ${variantKey}`,
        continueOnError: options.continueOnError,
        planOnly: options.planOnly,
        resume: options.resume,
        outputs: [outputPath],
      },
    );
  }

  for (const [runtimeKey, runtimeConfig] of Object.entries(config.mpc.runtimeVariants ?? {})) {
    const calibrationPath = calibrationVariantPaths[runtimeConfig.sourceCalibration];
    const outputPath = runtimeVariantPaths[runtimeKey];
    const argv = [
      '--input-profile', calibrationPath,
      '--output-json', outputPath,
      '--name', `${family.key}__runtime-mpc__${runtimeKey}`,
      '--description', runtimeConfig.description ?? `${family.key} runtime MPC variant ${runtimeKey}`,
    ];
    maybePushArg(argv, 'default-mode', runtimeConfig.defaultMode);
    maybePushArg(argv, 'max-window', runtimeConfig.maxWindow);
    maybePushArg(argv, 'max-checks-per-node', runtimeConfig.maxChecksPerNode);
    maybePushArg(argv, 'min-depth', runtimeConfig.minDepth);
    maybePushArg(argv, 'min-depth-gap', runtimeConfig.minDepthGap);
    maybePushArg(argv, 'max-depth-distance', runtimeConfig.maxDepthDistance);
    maybePushArg(argv, 'min-ply', runtimeConfig.minPly);
    maybePushArg(argv, 'interval-scale', runtimeConfig.intervalScale);
    maybePushArg(argv, 'high-scale', runtimeConfig.highScale);
    maybePushArg(argv, 'low-scale', runtimeConfig.lowScale);
    maybePushArg(argv, 'depth-distance-scale', runtimeConfig.depthDistanceScale);
    spawnNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'make-mpc-runtime-variant.mjs'),
      argv,
      {
        label: `${family.key}: derive runtime MPC variant ${runtimeKey}`,
        continueOnError: options.continueOnError,
        planOnly: options.planOnly,
        resume: options.resume,
        outputs: [outputPath],
      },
    );
  }
  return { calibrationSupersetPaths, calibrationVariantPaths, runtimeVariantPaths };
}

async function runExportPhase(family, familyPaths, config, options, shared, moveOrderingArtifacts, mpcArtifacts) {
  await fs.mkdir(familyPaths.exportDir, { recursive: true });
  await fs.mkdir(familyPaths.engineOptionsDir, { recursive: true });

  const summary = [];
  for (const candidate of family.candidates ?? []) {
    const moveOrderingPath = moveOrderingArtifacts.moveOrderingVariantPaths[candidate.moveOrderingVariant];
    const orderingPatternBankPath = moveOrderingArtifacts.orderingPatternVariantPaths[candidate.orderingPatternBankVariant] ?? null;
    const runtimeMpcPath = mpcArtifacts.runtimeVariantPaths[candidate.mpcRuntimeVariant];
    const modulePath = path.join(familyPaths.exportDir, `${candidate.key}.generated.js`);
    const summaryPath = path.join(familyPaths.exportDir, `${candidate.key}.summary.json`);
    const exportArgs = [
      '--evaluation-json', shared.evaluationProfilePath,
      '--move-ordering-json', moveOrderingPath,
      '--tuple-json', shared.tupleProfilePath,
      '--mpc-json', runtimeMpcPath,
      '--output-module', modulePath,
      '--module-format', String(config.moduleFormat ?? 'factorized'),
      '--summary-json', summaryPath,
    ];
    maybePushRepeatedArg(exportArgs, 'pattern-bank-json', shared.evaluationPatternBankPaths);
    if (orderingPatternBankPath) {
      maybePushArg(exportArgs, 'move-ordering-pattern-bank-json', orderingPatternBankPath);
    }
    spawnNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'build-generated-profile-module.mjs'),
      exportArgs,
      {
        label: `${family.key}: export candidate ${candidate.key}`,
        continueOnError: options.continueOnError,
        planOnly: options.planOnly,
        resume: options.resume,
        outputs: [modulePath, summaryPath],
      },
    );

    const orderingPbVariant = family.orderingPatternBankVariants[candidate.orderingPatternBankVariant] ?? { engineOptions: {} };
    const engineOptions = {
      ...(config.engineOptions ?? {}),
      ...(orderingPbVariant.engineOptions ?? {}),
    };
    const engineOptionsPath = path.join(familyPaths.engineOptionsDir, `${candidate.key}.json`);
    if (!(options.resume && await pathExists(engineOptionsPath)) && !options.planOnly) {
      await writeJson(engineOptionsPath, engineOptions);
    }

    summary.push({
      key: candidate.key,
      rationale: candidate.rationale ?? null,
      moveOrderingVariant: candidate.moveOrderingVariant,
      orderingPatternBankVariant: candidate.orderingPatternBankVariant,
      mpcRuntimeVariant: candidate.mpcRuntimeVariant,
      modulePath: toPortableRelative(modulePath),
      moduleSummaryPath: toPortableRelative(summaryPath),
      engineOptionsPath: toPortableRelative(engineOptionsPath),
      size: options.planOnly ? null : fileSizeSummary(modulePath),
      componentPaths: {
        evaluationProfilePath: toPortableRelative(shared.evaluationProfilePath),
        moveOrderingProfilePath: toPortableRelative(moveOrderingPath),
        tupleProfilePath: toPortableRelative(shared.tupleProfilePath),
        runtimeMpcPath: toPortableRelative(runtimeMpcPath),
        evaluationPatternBankPaths: shared.evaluationPatternBankPaths.map(toPortableRelative),
        orderingPatternBankPath: toPortableRelative(orderingPatternBankPath),
      },
      engineOptions,
    });
  }
  if (!options.planOnly) {
    await writeJson(familyPaths.candidateSummaryPath, summary);
  }
  return summary;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const inputs = [...ensureArray(args.input), ...ensureArray(args['input-dir'])].map((entry) => resolveCliPath(entry));
if (inputs.length === 0) {
  printUsage();
  throw new Error('At least one --input or --input-dir is required.');
}

const outputRoot = args['output-root'] ? resolveCliPath(args['output-root']) : DEFAULT_OUTPUT_ROOT;
const configPath = args.config ? resolveCliPath(args.config) : DEFAULT_CONFIG_PATH;
const phase = String(args.phase ?? 'all');
if (!VALID_PHASES.has(phase)) {
  throw new Error(`Invalid --phase value: ${phase}`);
}

let loadedConfig = DEFAULT_CONFIG;
if (await pathExists(configPath)) {
  loadedConfig = deepMerge(DEFAULT_CONFIG, readJson(configPath));
}
const requestedFamilies = new Set(ensureList(args.family));
const families = loadedConfig.families.filter((family) => requestedFamilies.size === 0 || requestedFamilies.has(family.key));
if (families.length === 0) {
  throw new Error('No families selected. Check --family values.');
}

const options = {
  inputs,
  outputRoot,
  continueOnError: Boolean(args['continue-on-error']),
  planOnly: Boolean(args['plan-only']),
  resume: Boolean(args.resume),
};

await fs.mkdir(outputRoot, { recursive: true });
const runPrepare = phase === 'prepare' || phase === 'all';
const runMoveOrdering = phase === 'move-ordering' || phase === 'all';
const runMpc = phase === 'mpc' || phase === 'all';
const runExport = phase === 'export' || phase === 'all';

const topLevelSummary = [];
for (const family of families) {
  const familyPaths = outputPathsForFamily(outputRoot, family.key);
  const shared = await runPreparePhase(family, familyPaths, loadedConfig, options);
  let moveOrderingArtifacts = {
    moveOrderingVariantPaths: resolveMoveOrderingVariantPaths(familyPaths, loadedConfig),
    orderingPatternVariantPaths: resolveOrderingPatternVariantPaths(familyPaths, family, shared),
  };
  let mpcArtifacts = resolveMpcPaths(familyPaths, loadedConfig);

  if (runMoveOrdering) {
    moveOrderingArtifacts = await runMoveOrderingPhase(family, familyPaths, loadedConfig, options, shared);
  }
  if (runMpc) {
    mpcArtifacts = await runMpcPhase(family, familyPaths, loadedConfig, options, shared);
  }

  let candidateSummary = null;
  if (runExport) {
    candidateSummary = await runExportPhase(family, familyPaths, loadedConfig, options, shared, moveOrderingArtifacts, mpcArtifacts);
  }
  topLevelSummary.push({
    familyKey: family.key,
    label: family.label,
    sourceModule: toPortableRelative(resolveCliPath(family.sourceModule)),
    moveOrderingSupersetBuckets: loadedConfig.moveOrdering.supersetBuckets,
    orderingPatternBankVariantKeys: Object.keys(family.orderingPatternBankVariants ?? {}),
    mpcRuntimeVariantKeys: Object.keys(loadedConfig.mpc.runtimeVariants ?? {}),
    candidateCount: (family.candidates ?? []).length,
    candidateSummaryPath: toPortableRelative(familyPaths.candidateSummaryPath),
    manifestPath: toPortableRelative(familyPaths.manifestPath),
    candidates: candidateSummary,
  });
}

if (!options.planOnly) {
  await writeJson(path.join(outputRoot, 'bundle-summary.json'), topLevelSummary);
}
console.log(`Done: ${families.length} family(s) processed.`);
