#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildStage176SurvivorBranchEngineOptions,
  resolveStage176SurvivorBranchCandidate,
} from '../evaluator-training/stage176-survivor-branch-candidates.mjs';
import {
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from '../evaluator-training/lib.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DEFAULT_OUTPUT_ROOT = path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'stage181-trineutron-finals');
const STAGE154_SUPPORT_ROOT = path.resolve(
  PROJECT_ROOT,
  'tools',
  'evaluator-training',
  'out',
  'stage15x-support-stack',
  'stage154-main-recenter',
);

const DEFAULTS = Object.freeze({
  firstCandidate: 's176-main-assertive-both-lite',
  secondCandidate: 's176-main-frontier-bothlite-topk2',
  timeMsList: [80, 160, 240],
  seedList: [17, 31, 53, 71],
  games: 1,
  openingPlies: 20,
  ourMaxDepth: 6,
  theirMaxDepth: 18,
  exactEndgameEmpties: 10,
  solverAdjudicationEmpties: 14,
  solverAdjudicationTimeMs: 60000,
  solverAdjudicationMaxDepth: 14,
  theirNoiseScale: 4,
  variantSeedMode: 'shared',
  searchAlgorithm: 'classic',
  aspirationWindow: 60,
  maxTableEntries: 90000,
});

function printUsage() {
  console.log(`Usage:\n  node tools/engine-match/run-stage181-trineutron-finals-session.mjs \\
    [--first-candidate ${DEFAULTS.firstCandidate}] [--second-candidate ${DEFAULTS.secondCandidate}] \\
    [--output-dir ${toPortablePath(DEFAULT_OUTPUT_ROOT)}] \\
    [--time-ms-list ${DEFAULTS.timeMsList.join(',')}] [--seed-list ${DEFAULTS.seedList.join(',')}] \\
    [--games ${DEFAULTS.games}] [--search-algorithm ${DEFAULTS.searchAlgorithm}]`);
}

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

function parseInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function parseIntegerList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));
  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function aggregateSkeleton() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    discDiff: 0,
    totalPlayedPly: 0,
    totalOurTimeMs: 0,
    totalTheirTimeMs: 0,
    totalOurNodes: 0,
    totalTheirNodes: 0,
    exactAdjudications: 0,
    exactAdjudicationTimeMs: 0,
    exactAdjudicationNodes: 0,
  };
}

function absorbAggregate(target, aggregate) {
  target.games += Number(aggregate.games ?? 0);
  target.wins += Number(aggregate.wins ?? 0);
  target.losses += Number(aggregate.losses ?? 0);
  target.draws += Number(aggregate.draws ?? 0);
  target.points += Number(aggregate.points ?? 0);
  target.discDiff += Number(aggregate.discDiff ?? 0);
  target.totalPlayedPly += Number(aggregate.totalPlayedPly ?? 0);
  target.totalOurTimeMs += Number(aggregate.totalOurTimeMs ?? 0);
  target.totalTheirTimeMs += Number(aggregate.totalTheirTimeMs ?? 0);
  target.totalOurNodes += Number(aggregate.totalOurNodes ?? 0);
  target.totalTheirNodes += Number(aggregate.totalTheirNodes ?? 0);
  target.exactAdjudications += Number(aggregate.exactAdjudications ?? 0);
  target.exactAdjudicationTimeMs += Number(aggregate.exactAdjudicationTimeMs ?? 0);
  target.exactAdjudicationNodes += Number(aggregate.exactAdjudicationNodes ?? 0);
  return target;
}

function finalizeAggregate(aggregate) {
  return {
    ...aggregate,
    scoreRate: aggregate.games > 0 ? aggregate.points / aggregate.games : 0,
    averageDiscDiff: aggregate.games > 0 ? aggregate.discDiff / aggregate.games : 0,
    averagePlayedPly: aggregate.games > 0 ? aggregate.totalPlayedPly / aggregate.games : 0,
    averageOurTimeMsPerGame: aggregate.games > 0 ? aggregate.totalOurTimeMs / aggregate.games : 0,
    averageTheirTimeMsPerGame: aggregate.games > 0 ? aggregate.totalTheirTimeMs / aggregate.games : 0,
    averageOurNodesPerGame: aggregate.games > 0 ? aggregate.totalOurNodes / aggregate.games : 0,
    averageTheirNodesPerGame: aggregate.games > 0 ? aggregate.totalTheirNodes / aggregate.games : 0,
    averageExactAdjudicationTimeMs: aggregate.exactAdjudications > 0 ? aggregate.exactAdjudicationTimeMs / aggregate.exactAdjudications : 0,
    averageExactAdjudicationNodes: aggregate.exactAdjudications > 0 ? aggregate.exactAdjudicationNodes / aggregate.exactAdjudications : 0,
  };
}

function formatPoints(points, games) {
  return `${points}/${games}`;
}

function formatSigned(value) {
  const number = Number(value ?? 0);
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${number.toFixed(2)}`;
}

function comparePoints(leftPoints, rightPoints) {
  if (leftPoints > rightPoints) {
    return 'win';
  }
  if (leftPoints < rightPoints) {
    return 'loss';
  }
  return 'draw';
}

function patternText(pattern) {
  return pattern.map((entry) => ({ win: '승리', loss: '패배', draw: '동률' }[entry] ?? entry)).join(' -> ');
}

function recommendationText(code) {
  return {
    option1: '하나만 남긴다',
    option2: '둘 다 폐기한다',
    option3: '둘 다 채택하고 더 좋은 것을 기본값, 나머지 하나는 사용자 지정 옵션으로 둔다',
    option4: 'stage-154-main / stage-154-both에 하나씩 나눠 탑재한다',
    hold: '추가 세션이 필요하다',
  }[code] ?? code;
}

function decideRecommendation({ firstVsBaseline, secondVsBaseline, directByBase }) {
  const firstPositiveBases = Object.values(firstVsBaseline).filter((entry) => entry.overall.deltaPoints > 0).length;
  const secondPositiveBases = Object.values(secondVsBaseline).filter((entry) => entry.overall.deltaPoints > 0).length;
  const firstNegativeBases = Object.values(firstVsBaseline).filter((entry) => entry.overall.deltaPoints < 0).length;
  const secondNegativeBases = Object.values(secondVsBaseline).filter((entry) => entry.overall.deltaPoints < 0).length;

  const directWinners = Object.fromEntries(Object.entries(directByBase).map(([baseKey, entry]) => {
    if (entry.overall.firstPoints > entry.overall.secondPoints) {
      return [baseKey, 'first'];
    }
    if (entry.overall.secondPoints > entry.overall.firstPoints) {
      return [baseKey, 'second'];
    }
    return [baseKey, 'draw'];
  }));

  if (firstNegativeBases === 2 && secondNegativeBases === 2) {
    return { code: 'option2', confidence: 'medium', rationale: '두 후보 모두 vanilla baseline 두 축에서 overall 음수입니다.' };
  }

  if (firstPositiveBases >= 1 && secondPositiveBases >= 1) {
    if (directWinners.main === 'first' && directWinners.both === 'second') {
      return { code: 'option4', confidence: 'low', rationale: '한 후보가 main 축에서, 다른 후보가 both 축에서 각각 direct overall 우세입니다.' };
    }
    if (directWinners.main === 'second' && directWinners.both === 'first') {
      return { code: 'option4', confidence: 'low', rationale: '한 후보가 main 축에서, 다른 후보가 both 축에서 각각 direct overall 우세입니다.' };
    }
    if (directWinners.main === 'first' && directWinners.both === 'first') {
      return { code: 'option3', confidence: 'low', rationale: '두 후보가 모두 baseline을 넘기면서 first 후보가 두 축 direct overall 우세입니다.' };
    }
    if (directWinners.main === 'second' && directWinners.both === 'second') {
      return { code: 'option3', confidence: 'low', rationale: '두 후보가 모두 baseline을 넘기면서 second 후보가 두 축 direct overall 우세입니다.' };
    }
  }

  if (firstPositiveBases >= 1 && secondNegativeBases === 2 && directWinners.main !== 'second' && directWinners.both !== 'second') {
    return { code: 'option1', confidence: 'medium', rationale: 'first 후보는 살아남았고 second 후보는 vanilla baseline 두 축에서 모두 밀렸습니다.' };
  }
  if (secondPositiveBases >= 1 && firstNegativeBases === 2 && directWinners.main !== 'first' && directWinners.both !== 'first') {
    return { code: 'option1', confidence: 'medium', rationale: 'second 후보는 살아남았고 first 후보는 vanilla baseline 두 축에서 모두 밀렸습니다.' };
  }

  return { code: 'hold', confidence: 'low', rationale: 'baseline-relative와 direct-by-base 신호가 아직 완전히 한 방향으로 정리되지 않았습니다.' };
}

function buildMarkdown({ firstCandidate, secondCandidate, summary, recommendation }) {
  const lines = [];
  lines.push(`# Stage 181 — trineutron finals session`);
  lines.push('');
  lines.push(`- first candidate: \`${firstCandidate.key}\``);
  lines.push(`- second candidate: \`${secondCandidate.key}\``);
  lines.push(`- frame: classic / ${summary.options.timeMsList.join(', ')}ms / seeds ${summary.options.seedList.join(', ')} / games ${summary.options.games}`);
  lines.push(`- recommendation: **${recommendationText(recommendation.code)}** (${recommendation.confidence})`);
  lines.push(`- rationale: ${recommendation.rationale}`);
  lines.push('');
  lines.push('## Baseline-relative summary');
  lines.push('');
  for (const candidateKey of [firstCandidate.key, secondCandidate.key]) {
    const block = summary.baselineRelative[candidateKey];
    lines.push(`### ${candidateKey}`);
    lines.push('');
    for (const baseKey of ['main', 'both']) {
      const entry = block[baseKey];
      lines.push(`- ${baseKey}: ${patternText(entry.pattern)} | overall ${formatPoints(entry.candidateOverall.points, entry.candidateOverall.games)} vs vanilla ${formatPoints(entry.baselineOverall.points, entry.baselineOverall.games)} (${formatSigned(entry.overall.deltaPoints)} pts, scoreRate ${formatSigned(entry.overall.deltaScoreRate)})`);
    }
    lines.push('');
  }
  lines.push('## Direct candidate comparison by base');
  lines.push('');
  for (const baseKey of ['main', 'both']) {
    const entry = summary.directByBase[baseKey];
    lines.push(`- ${baseKey}: ${patternText(entry.patternForFirst)} | ${firstCandidate.key} ${formatPoints(entry.overall.firstPoints, entry.overall.games)} vs ${secondCandidate.key} ${formatPoints(entry.overall.secondPoints, entry.overall.games)}`);
  }
  lines.push('');
  lines.push('## Overall aggregates');
  lines.push('');
  for (const variant of summary.variantOrder) {
    const aggregate = summary.aggregateByVariant[variant.id];
    lines.push(`- ${variant.id}: ${formatPoints(aggregate.points, aggregate.games)}, scoreRate ${aggregate.scoreRate.toFixed(3)}, avgDiscDiff ${aggregate.averageDiscDiff.toFixed(2)}, avgOurNodes ${aggregate.averageOurNodesPerGame.toFixed(1)}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseScenarioId(scenarioId) {
  const match = /^(\d+)ms_seed(\d+)$/.exec(scenarioId);
  if (!match) {
    throw new Error(`Unexpected scenario id: ${scenarioId}`);
  }
  return {
    timeLimitMs: Number(match[1]),
    seed: Number(match[2]),
  };
}

function resolveVariantMeta(variantId, variantLabel, baseKey = null, candidateKey = null, kind = 'overlay') {
  return { id: variantId, label: variantLabel, baseKey, candidateKey, kind };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
  process.exit(0);
}

const firstCandidateKey = typeof args['first-candidate'] === 'string' && args['first-candidate'].trim() !== ''
  ? args['first-candidate'].trim()
  : DEFAULTS.firstCandidate;
const secondCandidateKey = typeof args['second-candidate'] === 'string' && args['second-candidate'].trim() !== ''
  ? args['second-candidate'].trim()
  : DEFAULTS.secondCandidate;
const outputDir = typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? resolveCliPath(args['output-dir'])
  : path.resolve(DEFAULT_OUTPUT_ROOT, `${firstCandidateKey}__vs__${secondCandidateKey}`, 'session-01');
const timeMsList = parseIntegerList(args['time-ms-list'], DEFAULTS.timeMsList);
const seedList = parseIntegerList(args['seed-list'], DEFAULTS.seedList);
const games = parseInteger(args.games, DEFAULTS.games, 1, 20);
const openingPlies = parseInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
const ourMaxDepth = parseInteger(args['our-max-depth'], DEFAULTS.ourMaxDepth, 1, 12);
const theirMaxDepth = parseInteger(args['their-max-depth'], DEFAULTS.theirMaxDepth, 1, 24);
const exactEndgameEmpties = parseInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 24);
const solverAdjudicationEmpties = parseInteger(args['solver-adjudication-empties'], DEFAULTS.solverAdjudicationEmpties, -1, 24);
const solverAdjudicationTimeMs = parseInteger(args['solver-adjudication-time-ms'], DEFAULTS.solverAdjudicationTimeMs, 100, 300000);
const solverAdjudicationMaxDepth = parseInteger(args['solver-adjudication-max-depth'], DEFAULTS.solverAdjudicationMaxDepth, 1, 24);
const theirNoiseScale = parseInteger(args['their-noise-scale'], DEFAULTS.theirNoiseScale, 0, 20);
const searchAlgorithm = typeof args['search-algorithm'] === 'string' && args['search-algorithm'].trim() !== ''
  ? args['search-algorithm'].trim()
  : DEFAULTS.searchAlgorithm;
const aspirationWindow = parseInteger(args['aspiration-window'], DEFAULTS.aspirationWindow, 0, 5000);
const maxTableEntries = parseInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 600000);
const variantSeedMode = typeof args['variant-seed-mode'] === 'string' && args['variant-seed-mode'].trim() !== ''
  ? args['variant-seed-mode'].trim()
  : DEFAULTS.variantSeedMode;
const planOnly = Boolean(args['plan-only']);
const resume = Boolean(args.resume);

const firstCandidate = resolveStage176SurvivorBranchCandidate(firstCandidateKey, { allowRetired: true });
const secondCandidate = resolveStage176SurvivorBranchCandidate(secondCandidateKey, { allowRetired: true });

const stage154MainModulePath = path.resolve(STAGE154_SUPPORT_ROOT, 'exported', 's154-main.generated.js');
const stage154BothModulePath = path.resolve(STAGE154_SUPPORT_ROOT, 'exported', 's154-both.generated.js');
const stage154MainOptions = readJson(path.resolve(STAGE154_SUPPORT_ROOT, 'engine-options', 's154-main.json'));
const stage154BothOptions = readJson(path.resolve(STAGE154_SUPPORT_ROOT, 'engine-options', 's154-both.json'));

const suiteDir = path.resolve(outputDir, 'suite');
const engineOptionsDir = path.resolve(outputDir, 'engine-options');
ensureDir(suiteDir);
ensureDir(engineOptionsDir);

const firstOverlayOptions = buildStage176SurvivorBranchEngineOptions(firstCandidate.key, { allowRetired: true });
const secondOverlayOptions = buildStage176SurvivorBranchEngineOptions(secondCandidate.key, { allowRetired: true });

const variantMetas = [];
const variants = [];

function addVariant({ id, label, generatedModule, engineOptions, baseKey = null, candidateKey = null, kind = 'overlay' }) {
  const engineOptionsPath = path.resolve(engineOptionsDir, `${id}.json`);
  writeJson(engineOptionsPath, engineOptions);
  variants.push({
    id,
    type: 'custom',
    label,
    generatedModule: rel(generatedModule),
    engineOptionsJson: rel(engineOptionsPath),
  });
  variantMetas.push(resolveVariantMeta(id, label, baseKey, candidateKey, kind));
}

addVariant({
  id: 's154-main',
  label: 'vanilla s154-main',
  generatedModule: stage154MainModulePath,
  engineOptions: stage154MainOptions,
  baseKey: 'main',
  kind: 'baseline',
});
addVariant({
  id: 's154-both',
  label: 'vanilla s154-both',
  generatedModule: stage154BothModulePath,
  engineOptions: stage154BothOptions,
  baseKey: 'both',
  kind: 'baseline',
});
addVariant({
  id: `s154-main__${firstCandidate.key}`,
  label: `s154-main + ${firstCandidate.key}`,
  generatedModule: stage154MainModulePath,
  engineOptions: { ...stage154MainOptions, ...firstOverlayOptions },
  baseKey: 'main',
  candidateKey: firstCandidate.key,
});
addVariant({
  id: `s154-both__${firstCandidate.key}`,
  label: `s154-both + ${firstCandidate.key}`,
  generatedModule: stage154BothModulePath,
  engineOptions: { ...stage154BothOptions, ...firstOverlayOptions },
  baseKey: 'both',
  candidateKey: firstCandidate.key,
});
addVariant({
  id: `s154-main__${secondCandidate.key}`,
  label: `s154-main + ${secondCandidate.key}`,
  generatedModule: stage154MainModulePath,
  engineOptions: { ...stage154MainOptions, ...secondOverlayOptions },
  baseKey: 'main',
  candidateKey: secondCandidate.key,
});
addVariant({
  id: `s154-both__${secondCandidate.key}`,
  label: `s154-both + ${secondCandidate.key}`,
  generatedModule: stage154BothModulePath,
  engineOptions: { ...stage154BothOptions, ...secondOverlayOptions },
  baseKey: 'both',
  candidateKey: secondCandidate.key,
});

const scenarios = [];
for (const timeLimitMs of timeMsList) {
  for (const seed of seedList) {
    scenarios.push({
      id: `${timeLimitMs}ms_seed${seed}`,
      label: `${timeLimitMs}ms seed${seed}`,
      games,
      openingPlies,
      seed,
      ourTimeMs: timeLimitMs,
      theirTimeMs: timeLimitMs,
      ourMaxDepth,
      theirMaxDepth,
      exactEndgameEmpties,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
      theirNoiseScale,
      variantSeedMode,
      searchAlgorithm,
      aspirationWindow,
      maxTableEntries,
    });
  }
}

const config = {
  defaults: {
    games,
    openingPlies,
    ourMaxDepth,
    theirMaxDepth,
    exactEndgameEmpties,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    solverAdjudicationMaxDepth,
    theirNoiseScale,
    variantSeedMode,
    searchAlgorithm,
    aspirationWindow,
    maxTableEntries,
  },
  referenceVariantId: 's154-main',
  variants,
  scenarios,
};

const configPath = path.resolve(outputDir, 'trineutron-finals.session-config.json');
const manifestPath = path.resolve(outputDir, 'manifest.json');
writeJson(configPath, config);
writeJson(manifestPath, {
  generatedAt: new Date().toISOString(),
  firstCandidate: {
    key: firstCandidate.key,
    moveOrderingStructureProfileKey: firstCandidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: firstCandidate.mpcStructureProfile?.key ?? null,
  },
  secondCandidate: {
    key: secondCandidate.key,
    moveOrderingStructureProfileKey: secondCandidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: secondCandidate.mpcStructureProfile?.key ?? null,
  },
  options: {
    timeMsList,
    seedList,
    games,
    openingPlies,
    searchAlgorithm,
    theirNoiseScale,
  },
  configPath: rel(configPath),
  variantMetas,
});

if (planOnly) {
  console.log(`Prepared plan only: ${rel(configPath)}`);
  process.exit(0);
}

const suiteArgs = [
  'tools/engine-match/run-trineutron-match-suite.mjs',
  '--config', rel(configPath),
  '--output-dir', rel(suiteDir),
];
if (resume) {
  suiteArgs.push('--resume');
}
const suiteChild = spawnSync('node', suiteArgs, {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
});
if (suiteChild.status !== 0) {
  throw new Error(`run-trineutron-match-suite failed (exit ${suiteChild.status}).`);
}

const suiteSummaryPath = path.resolve(suiteDir, 'suite-summary.json');
const suiteSummary = readJson(suiteSummaryPath);
const configByScenarioId = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));
const scenarioAggregatesByVariantAndTime = {};
const scenarioEntries = Array.isArray(suiteSummary.resultsByScenario)
  ? suiteSummary.resultsByScenario
  : Object.entries(suiteSummary.resultsByScenario ?? {}).map(([scenarioId, scenarioEntry]) => ({
    scenarioId,
    ...scenarioEntry,
  }));
for (const scenarioEntry of scenarioEntries) {
  const scenarioId = scenarioEntry.scenarioId ?? scenarioEntry.id ?? null;
  if (!scenarioId) {
    throw new Error('Missing scenarioId in suite summary.');
  }
  const parsed = parseScenarioId(scenarioId);
  for (const variantEntry of scenarioEntry.variants ?? []) {
    const variantId = variantEntry.variantId;
    scenarioAggregatesByVariantAndTime[variantId] ??= {};
    scenarioAggregatesByVariantAndTime[variantId][parsed.timeLimitMs] ??= aggregateSkeleton();
    absorbAggregate(scenarioAggregatesByVariantAndTime[variantId][parsed.timeLimitMs], variantEntry.aggregate ?? {});
  }
}

const timeAggregatesByVariant = Object.fromEntries(
  Object.entries(scenarioAggregatesByVariantAndTime).map(([variantId, byTime]) => [
    variantId,
    Object.fromEntries(Object.entries(byTime).map(([time, aggregate]) => [time, finalizeAggregate(aggregate)])),
  ]),
);

const baselineRelative = {};
for (const candidateKey of [firstCandidate.key, secondCandidate.key]) {
  baselineRelative[candidateKey] = {};
  for (const baseKey of ['main', 'both']) {
    const baselineVariantId = baseKey === 'main' ? 's154-main' : 's154-both';
    const candidateVariantId = `s154-${baseKey}__${candidateKey}`;
    const pattern = [];
    const byTime = {};
    for (const timeLimitMs of timeMsList) {
      const baselineAgg = timeAggregatesByVariant[baselineVariantId]?.[timeLimitMs] ?? finalizeAggregate(aggregateSkeleton());
      const candidateAgg = timeAggregatesByVariant[candidateVariantId]?.[timeLimitMs] ?? finalizeAggregate(aggregateSkeleton());
      const outcome = comparePoints(candidateAgg.points, baselineAgg.points);
      pattern.push(outcome);
      byTime[timeLimitMs] = {
        baseline: baselineAgg,
        candidate: candidateAgg,
        deltaPoints: candidateAgg.points - baselineAgg.points,
        deltaScoreRate: candidateAgg.scoreRate - baselineAgg.scoreRate,
        outcome,
      };
    }
    const baselineOverall = suiteSummary.aggregateByVariant[baselineVariantId];
    const candidateOverall = suiteSummary.aggregateByVariant[candidateVariantId];
    baselineRelative[candidateKey][baseKey] = {
      baselineVariantId,
      candidateVariantId,
      pattern,
      byTime,
      baselineOverall,
      candidateOverall,
      overall: {
        deltaPoints: candidateOverall.points - baselineOverall.points,
        deltaScoreRate: candidateOverall.scoreRate - baselineOverall.scoreRate,
      },
    };
  }
}

const directByBase = {};
for (const baseKey of ['main', 'both']) {
  const firstVariantId = `s154-${baseKey}__${firstCandidate.key}`;
  const secondVariantId = `s154-${baseKey}__${secondCandidate.key}`;
  const patternForFirst = [];
  const byTime = {};
  for (const timeLimitMs of timeMsList) {
    const firstAgg = timeAggregatesByVariant[firstVariantId]?.[timeLimitMs] ?? finalizeAggregate(aggregateSkeleton());
    const secondAgg = timeAggregatesByVariant[secondVariantId]?.[timeLimitMs] ?? finalizeAggregate(aggregateSkeleton());
    const outcomeForFirst = comparePoints(firstAgg.points, secondAgg.points);
    patternForFirst.push(outcomeForFirst);
    byTime[timeLimitMs] = {
      first: firstAgg,
      second: secondAgg,
      outcomeForFirst,
      deltaPointsForFirst: firstAgg.points - secondAgg.points,
      deltaScoreRateForFirst: firstAgg.scoreRate - secondAgg.scoreRate,
    };
  }
  const firstOverall = suiteSummary.aggregateByVariant[firstVariantId];
  const secondOverall = suiteSummary.aggregateByVariant[secondVariantId];
  directByBase[baseKey] = {
    firstVariantId,
    secondVariantId,
    patternForFirst,
    byTime,
    overall: {
      firstPoints: firstOverall.points,
      secondPoints: secondOverall.points,
      games: firstOverall.games,
      deltaPointsForFirst: firstOverall.points - secondOverall.points,
      deltaScoreRateForFirst: firstOverall.scoreRate - secondOverall.scoreRate,
    },
  };
}

const summary = {
  generatedAt: new Date().toISOString(),
  options: {
    timeMsList,
    seedList,
    games,
    searchAlgorithm,
    theirNoiseScale,
    openingPlies,
  },
  suiteSummaryPath: rel(suiteSummaryPath),
  firstCandidate: {
    key: firstCandidate.key,
    moveOrderingStructureProfileKey: firstCandidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: firstCandidate.mpcStructureProfile?.key ?? null,
  },
  secondCandidate: {
    key: secondCandidate.key,
    moveOrderingStructureProfileKey: secondCandidate.moveOrderingStructureProfile?.key ?? null,
    mpcStructureProfileKey: secondCandidate.mpcStructureProfile?.key ?? null,
  },
  variantOrder: variantMetas,
  aggregateByVariant: suiteSummary.aggregateByVariant,
  timeAggregatesByVariant,
  baselineRelative,
  directByBase,
};

const recommendation = decideRecommendation({
  firstVsBaseline: baselineRelative[firstCandidate.key],
  secondVsBaseline: baselineRelative[secondCandidate.key],
  directByBase,
});

summary.recommendation = recommendation;

const summaryJsonPath = path.resolve(outputDir, 'final-summary.json');
const summaryMdPath = path.resolve(outputDir, 'final-summary.md');
const verdictJsonPath = path.resolve(outputDir, 'verdict.json');
const verdictMdPath = path.resolve(outputDir, 'verdict.md');
writeJson(summaryJsonPath, summary);
fs.writeFileSync(summaryMdPath, buildMarkdown({ firstCandidate, secondCandidate, summary, recommendation }), 'utf8');
writeJson(verdictJsonPath, {
  generatedAt: new Date().toISOString(),
  recommendation,
  firstCandidate: firstCandidate.key,
  secondCandidate: secondCandidate.key,
  summaryPath: rel(summaryJsonPath),
});
fs.writeFileSync(verdictMdPath, [
  `# Stage 181 trineutron finals verdict`,
  '',
  `- recommendation: **${recommendationText(recommendation.code)}**`,
  `- confidence: ${recommendation.confidence}`,
  `- rationale: ${recommendation.rationale}`,
  `- summary: ${rel(summaryJsonPath)}`,
  '',
].join('\n'), 'utf8');

console.log(`Wrote summary: ${rel(summaryJsonPath)}`);
console.log(`Wrote verdict: ${rel(verdictJsonPath)}`);
