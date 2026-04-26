#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  RUNTIME_EVALUATION_PROFILE,
  RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES,
  RUNTIME_MOVE_ORDERING_PROFILE,
  RUNTIME_MPC_PROFILE,
  RUNTIME_PATTERN_BANK_PROFILES,
  RUNTIME_TUPLE_RESIDUAL_PROFILE,
  DEFAULT_EVALUATION_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../../js/ai/search-algorithms.js';
import { GameState, createStateHistoryFromMoveSequence } from '../../js/core/game-state.js';
import { PLAYER_COLORS } from '../../js/core/rules.js';
import { createSeededRandom } from '../../js/test/benchmark-helpers.mjs';
import { XOT_OPENING_COUNT, selectRandomXotOpening } from '../../js/data/xot-openings-small.js';
import { TrineutronEngine } from './opponents/trineutron-engine.mjs';
import { formatInteger, parseArgs } from '../evaluator-training/lib.mjs';
import { loadProfileVariant } from './lib-profile-variants.mjs';

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-vs-trineutron.mjs \
    [--output-json benchmarks/stage31_vs_trineutron.json] \
    [--variants active,phase-only,legacy[,custom]] \
    [--games 4] [--opening-plies 20] [--opening-source random|xot] [--seed 1] \
    [--our-time-ms 100] [--their-time-ms 100] \
    [--our-max-depth 6] [--their-max-depth 18] \
    [--search-algorithm classic] [--aspiration-window 40] [--max-table-entries 180000] \
    [--exact-endgame-empties 10] \
    [--solver-adjudication-empties 14] [--solver-adjudication-time-ms 60000] \
    [--their-noise-scale 4] \
    [--variant-seed-mode shared|per-variant] \
    [--generated-module js/ai/learned-eval-profile.generated.js | --evaluation-json <file> [--move-ordering-json <file>] [--tuple-json <file>] [--mpc-json <file>]] \
    [--disable-move-ordering] [--disable-tuple] [--disable-mpc] \
    [--variant-label custom-candidate]

같은 시작 국면마다 색을 바꿔 두 번 대국해 흑/백 편향을 상쇄합니다.
opening-plies 기본값을 20으로 두어, 자사 엔진의 opening book 직접 사용 구간(12수)과 advisory 구간(18수)을 넘긴 뒤 중반부터 비교합니다.
solver-adjudication-empties 기본값은 14로, 그 시점부터는 trineutron을 더 두지 않고 우리 exact solver를 한 번만 호출해 승패를 판정합니다.
variant-seed-mode=shared 를 사용하면 여러 variant를 같은 실행에서 비교할 때도 opening/color별 상대 엔진 난수 시드를 공유해 보다 공정하게 비교할 수 있습니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function parseVariantSeedMode(value) {
  return value === 'shared' ? 'shared' : 'per-variant';
}

function parseOpeningSource(value) {
  return value === 'xot' ? 'xot' : 'random';
}

function parseVariantList(value, { includeCustom = false } = {}) {
  const defaultVariants = includeCustom ? ['custom'] : ['active', 'phase-only', 'legacy'];
  if (typeof value !== 'string' || value.trim() === '') {
    return defaultVariants;
  }
  const allowed = new Set(['active', 'phase-only', 'legacy', ...(includeCustom ? ['custom'] : [])]);
  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => allowed.has(token));
  return parsed.length > 0 ? [...new Set(parsed)] : defaultVariants;
}

function createOurEngineOptions({
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  patternBankProfiles = null,
  moveOrderingPatternBankProfiles = null,
  engineOptions = null,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  maxTableEntries = 180000,
  searchAlgorithm = 'classic',
  aspirationWindow = 40,
}) {
  return {
    ...(engineOptions && typeof engineOptions === 'object' ? engineOptions : {}),
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm,
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    aspirationWindow,
    randomness: 0,
    maxTableEntries,
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
    patternBankProfiles,
    moveOrderingPatternBankProfiles,
    wldPreExactEmpties: 0,
  };
}

function advanceOpeningRandomly(state, moves, random, targetPlies) {
  let nextState = state;
  const nextMoves = Array.isArray(moves) ? [...moves] : [];
  let guard = 0;

  while (!nextState.isTerminal() && nextMoves.length < targetPlies) {
    const legalMoves = nextState.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    if (legalMoves.length === 0) {
      nextState = nextState.passTurn();
      nextMoves.push(`${nextState.getOpponentColor(nextState.currentPlayer)}:pass`);
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded guard while handling passes.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    nextMoves.push(`${nextState.currentPlayer}:${chosen.coord}`);
    nextState = nextState.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return { state: nextState, moves: nextMoves };
}

function createRandomOpeningState(openingPlies, seed) {
  const random = createSeededRandom(seed);
  const advanced = advanceOpeningRandomly(GameState.initial(), [], random, openingPlies);
  return {
    source: 'random',
    state: advanced.state,
    openingMoves: advanced.moves,
    openingPliesCompleted: advanced.moves.length,
    openingSeed: seed,
    openingLabel: `random-${seed}`,
    xotIndex: null,
    xotSequence: null,
  };
}

function createXotOpeningState(seed, openingPlies = 8) {
  const random = createSeededRandom(seed);
  const { index, sequence } = selectRandomXotOpening(random());
  const history = createStateHistoryFromMoveSequence(sequence);
  const initialState = history.at(-1) ?? GameState.initial();
  const initialMoves = Array.isArray(initialState.moveHistory)
    ? initialState.moveHistory.map((action) => action?.type === 'pass' ? `${action.color}:pass` : `${action.color}:${action.coord}`)
    : [];
  const targetPlies = Math.max(initialMoves.length, Number.isFinite(openingPlies) ? openingPlies : initialMoves.length);
  const advanced = advanceOpeningRandomly(initialState, initialMoves, random, targetPlies);
  return {
    source: 'xot',
    state: advanced.state,
    openingMoves: advanced.moves,
    openingPliesCompleted: advanced.moves.length,
    openingSeed: seed,
    openingLabel: `xot-${index + 1}`,
    xotIndex: index,
    xotSequence: sequence,
  };
}

function createOpeningState({ openingSource, openingPlies, seed }) {
  if (openingSource === 'xot') {
    return createXotOpeningState(seed, openingPlies);
  }
  return createRandomOpeningState(openingPlies, seed);
}

function discDiffForColor(state, color) {
  const counts = state.getDiscCounts();
  return color === PLAYER_COLORS.BLACK
    ? counts.black - counts.white
    : counts.white - counts.black;
}

function outcomeFromDiff(diff) {
  if (diff > 0) {
    return 'win';
  }
  if (diff < 0) {
    return 'loss';
  }
  return 'draw';
}

function createAggregate() {
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

function updateAggregate(aggregate, game) {
  aggregate.games += 1;
  aggregate.totalPlayedPly += Number(game.playedPly ?? 0);
  aggregate.discDiff += Number(game.ourDiscDiff ?? 0);
  aggregate.totalOurTimeMs += Number(game.ourStats.totalElapsedMs ?? 0);
  aggregate.totalTheirTimeMs += Number(game.theirStats.totalElapsedMs ?? 0);
  aggregate.totalOurNodes += Number(game.ourStats.totalNodes ?? 0);
  aggregate.totalTheirNodes += Number(game.theirStats.totalNodes ?? 0);
  aggregate.exactAdjudications += Number(game.ourStats.exactAdjudications ?? 0);
  aggregate.exactAdjudicationTimeMs += Number(game.ourStats.exactAdjudicationElapsedMs ?? 0);
  aggregate.exactAdjudicationNodes += Number(game.ourStats.exactAdjudicationNodes ?? 0);

  if (game.outcome === 'win') {
    aggregate.wins += 1;
    aggregate.points += 1;
  } else if (game.outcome === 'loss') {
    aggregate.losses += 1;
  } else {
    aggregate.draws += 1;
    aggregate.points += 0.5;
  }
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

async function loadCustomVariantProfilesFromArgs(args) {
  const generatedModulePath = typeof args['generated-module'] === 'string' && args['generated-module'].trim() !== ''
    ? path.resolve(args['generated-module'])
    : null;
  const variant = await loadProfileVariant({
    label: typeof args['variant-label'] === 'string' && args['variant-label'].trim() !== ''
      ? args['variant-label'].trim()
      : 'custom-profile-set',
    generatedModule: generatedModulePath,
    evaluationJson: args['evaluation-json'],
    moveOrderingJson: args['move-ordering-json'],
    tupleJson: args['tuple-json'],
    mpcJson: args['mpc-json'],
    patternBankJson: args['pattern-bank-json'],
    moveOrderingPatternBankJson: args['move-ordering-pattern-bank-json'],
    engineOptionsJson: args['engine-options-json'],
    disableMoveOrdering: Boolean(args['disable-move-ordering']),
    disableTuple: Boolean(args['disable-tuple']),
    disableMpc: Boolean(args['disable-mpc']),
    disablePatternBank: Boolean(args['disable-pattern-bank']),
    disableMoveOrderingPatternBank: Boolean(args['disable-move-ordering-pattern-bank']),
  }).catch((error) => {
    if (/Unable to resolve evaluation profile/.test(String(error?.message ?? ''))) {
      return null;
    }
    throw error;
  });
  if (!variant) {
    return null;
  }
  return {
    key: 'custom',
    label: variant.label,
    evaluationProfile: variant.evaluationProfile,
    moveOrderingProfile: variant.moveOrderingProfile,
    tupleResidualProfile: variant.tupleResidualProfile,
    mpcProfile: variant.mpcProfile,
    patternBankProfiles: variant.patternBankProfiles,
    moveOrderingPatternBankProfiles: variant.moveOrderingPatternBankProfiles,
    engineOptions: variant.engineOptions,
    engineOptionsJsonPath: variant.engineOptionsJsonPath,
    generatedModulePath: variant.generatedModulePath,
    disabledFeatures: {
      moveOrdering: Boolean(args['disable-move-ordering']),
      tupleResidual: Boolean(args['disable-tuple']),
      mpc: Boolean(args['disable-mpc']),
      patternBank: Boolean(args['disable-pattern-bank']),
      moveOrderingPatternBank: Boolean(args['disable-move-ordering-pattern-bank']),
    },
  };
}

function createVariantDefinitions(config, { customVariant = null } = {}) {
  const active = {
    key: 'active',
    label: `active-generated+ordering (${RUNTIME_EVALUATION_PROFILE?.name ?? 'generated'} / ${RUNTIME_MOVE_ORDERING_PROFILE?.name ?? 'default'} / ${RUNTIME_TUPLE_RESIDUAL_PROFILE?.name ?? 'no tuple'} / ${RUNTIME_MPC_PROFILE?.name ?? 'no mpc'} / ${Array.isArray(RUNTIME_PATTERN_BANK_PROFILES) && RUNTIME_PATTERN_BANK_PROFILES.length > 0 ? `${RUNTIME_PATTERN_BANK_PROFILES.length} pattern-bank` : 'no pattern-bank'})`,
    createEngine(overrides = {}) {
      return new SearchEngine(createOurEngineOptions({
        evaluationProfile: RUNTIME_EVALUATION_PROFILE,
        moveOrderingProfile: RUNTIME_MOVE_ORDERING_PROFILE,
        tupleResidualProfile: RUNTIME_TUPLE_RESIDUAL_PROFILE,
        mpcProfile: RUNTIME_MPC_PROFILE,
        patternBankProfiles: RUNTIME_PATTERN_BANK_PROFILES,
        moveOrderingPatternBankProfiles: null,
        timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
        maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
        exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
        maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
        searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
        aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
      }));
    },
  };

  const phaseOnly = {
    key: 'phase-only',
    label: `active-phase-only (${RUNTIME_EVALUATION_PROFILE?.name ?? 'generated'} / no learned move-ordering / no tuple residual / ${RUNTIME_MPC_PROFILE?.name ?? 'no mpc'} / ${Array.isArray(RUNTIME_PATTERN_BANK_PROFILES) && RUNTIME_PATTERN_BANK_PROFILES.length > 0 ? `${RUNTIME_PATTERN_BANK_PROFILES.length} pattern-bank` : 'no pattern-bank'})`,
    createEngine(overrides = {}) {
      return new SearchEngine(createOurEngineOptions({
        evaluationProfile: RUNTIME_EVALUATION_PROFILE,
        moveOrderingProfile: null,
        tupleResidualProfile: null,
        mpcProfile: RUNTIME_MPC_PROFILE,
        patternBankProfiles: RUNTIME_PATTERN_BANK_PROFILES,
        moveOrderingPatternBankProfiles: RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES,
        timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
        maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
        exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
        maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
        searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
        aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
      }));
    },
  };

  const legacy = {
    key: 'legacy',
    label: `legacy-seed (${DEFAULT_EVALUATION_PROFILE.name} / no learned move-ordering / no tuple residual / no mpc)`,
    createEngine(overrides = {}) {
      return new SearchEngine(createOurEngineOptions({
        evaluationProfile: DEFAULT_EVALUATION_PROFILE,
        moveOrderingProfile: null,
        tupleResidualProfile: null,
        mpcProfile: null,
        timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
        maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
        exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
        maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
        searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
        aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
      }));
    },
  };

  const variants = { active, 'phase-only': phaseOnly, legacy };
  if (customVariant) {
    variants.custom = {
      key: 'custom',
      label: customVariant.label,
      createEngine(overrides = {}) {
        return new SearchEngine(createOurEngineOptions({
          evaluationProfile: customVariant.evaluationProfile ?? RUNTIME_EVALUATION_PROFILE,
          moveOrderingProfile: Object.hasOwn(customVariant, 'moveOrderingProfile')
            ? customVariant.moveOrderingProfile
            : RUNTIME_MOVE_ORDERING_PROFILE,
          tupleResidualProfile: Object.hasOwn(customVariant, 'tupleResidualProfile')
            ? customVariant.tupleResidualProfile
            : RUNTIME_TUPLE_RESIDUAL_PROFILE,
          mpcProfile: Object.hasOwn(customVariant, 'mpcProfile')
            ? customVariant.mpcProfile
            : RUNTIME_MPC_PROFILE,
          patternBankProfiles: Object.hasOwn(customVariant, 'patternBankProfiles')
            ? customVariant.patternBankProfiles
            : RUNTIME_PATTERN_BANK_PROFILES,
          moveOrderingPatternBankProfiles: Object.hasOwn(customVariant, 'moveOrderingPatternBankProfiles')
            ? customVariant.moveOrderingPatternBankProfiles
            : RUNTIME_MOVE_ORDERING_PATTERN_BANK_PROFILES,
          engineOptions: customVariant.engineOptions ?? null,
          timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
          maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
          exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
          maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
          searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
          aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
        }));
      },
    };
  }

  return variants;
}

function searchWithEngine(engine, state, engineKey, seed) {
  if (engineKey === 'trineutron') {
    return engine.findBestMove(state, { seed });
  }
  return engine.findBestMove(state);
}

function normalizeMoveRecord(result, actor, color) {
  return {
    actor,
    color,
    bestMove: result.bestMoveCoord,
    bestMoveIndex: result.bestMoveIndex,
    score: result.score,
    elapsedMs: result.stats?.elapsedMs ?? null,
    nodes: result.stats?.nodes ?? null,
    completedDepth: result.stats?.completedDepth ?? null,
    searchCompletion: result.searchCompletion ?? null,
    searchMode: result.searchMode ?? null,
  };
}

function buildGameSeed(baseSeed, variantIndex, openingIndex, colorIndex, { variantSeedMode = 'per-variant' } = {}) {
  const variantSalt = variantSeedMode === 'shared' ? 0 : variantIndex;
  return (((baseSeed + 1) * 0x9E3779B1) ^ (variantSalt * 0x85EBCA6B) ^ (openingIndex * 0xC2B2AE35) ^ colorIndex) >>> 0;
}

function buildSearchSeed(gameSeed, ply) {
  return (gameSeed ^ Math.imul((ply + 1) >>> 0, 0x27D4EB2D)) >>> 0;
}

function exactDiscDiffFromResult(result, perspectiveColor, ourColor) {
  if (!Number.isFinite(result?.score)) {
    return null;
  }
  const signedScore = perspectiveColor === ourColor ? result.score : -result.score;
  return Math.round(signedScore / 10000);
}

function tryExactAdjudication({
  variant,
  state,
  ourColor,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  solverAdjudicationMaxDepth,
}) {
  if (!(state instanceof GameState)) {
    throw new TypeError('tryExactAdjudication expects a GameState instance.');
  }

  if (!Number.isInteger(solverAdjudicationEmpties) || solverAdjudicationEmpties <= 0) {
    return null;
  }

  if (state.isTerminal() || state.getEmptyCount() > solverAdjudicationEmpties) {
    return null;
  }

  const exactEngine = variant.createEngine({
    timeLimitMs: solverAdjudicationTimeMs,
    maxDepth: solverAdjudicationMaxDepth,
    exactEndgameEmpties: solverAdjudicationEmpties,
    maxTableEntries: 260000,
  });
  const result = exactEngine.findBestMove(state);
  const searchCompletion = result.searchCompletion ?? 'unknown';
  const exactEnough = Boolean(result.isExactResult)
    || result.searchMode === 'terminal'
    || (searchCompletion === 'complete' && state.getEmptyCount() <= solverAdjudicationEmpties);

  if (!exactEnough || !Number.isFinite(result.score)) {
    return null;
  }

  const ourDiscDiff = exactDiscDiffFromResult(result, state.currentPlayer, ourColor);
  if (!Number.isFinite(ourDiscDiff)) {
    return null;
  }

  return {
    perspectiveColor: state.currentPlayer,
    empties: state.getEmptyCount(),
    score: result.score,
    ourDiscDiff,
    outcome: outcomeFromDiff(ourDiscDiff),
    bestMove: result.bestMoveCoord,
    searchMode: result.searchMode ?? null,
    searchCompletion,
    principalVariationLength: Array.isArray(result.principalVariation) ? result.principalVariation.length : 0,
    stats: {
      elapsedMs: Number(result.stats?.elapsedMs ?? 0),
      nodes: Number(result.stats?.nodes ?? 0),
      completedDepth: Number(result.stats?.completedDepth ?? 0),
      ttHits: Number(result.stats?.ttHits ?? 0),
    },
  };
}

function runSingleGame({
  startingState,
  openingSeed,
  openingMoves,
  ourVariant,
  ourColor,
  theirColor,
  theirTimeMs,
  theirMaxDepth,
  theirNoiseScale,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  solverAdjudicationMaxDepth,
  gameSeed,
}) {
  let state = startingState.clone();
  const ourEngine = ourVariant.createEngine();
  const theirEngine = new TrineutronEngine({
    timeLimitMs: theirTimeMs,
    maxDepth: theirMaxDepth,
    noiseScale: theirNoiseScale,
    seed: buildSearchSeed(gameSeed, state.ply),
  });
  const moveLog = [];
  const ourStats = {
    totalElapsedMs: 0,
    totalNodes: 0,
    moveCount: 0,
    exactAdjudications: 0,
    exactAdjudicationElapsedMs: 0,
    exactAdjudicationNodes: 0,
  };
  const theirStats = {
    totalElapsedMs: 0,
    totalNodes: 0,
    moveCount: 0,
  };

  let guard = 0;
  while (!state.isTerminal()) {
    const adjudication = tryExactAdjudication({
      variant: ourVariant,
      state,
      ourColor,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
    });
    if (adjudication) {
      ourStats.totalElapsedMs += adjudication.stats.elapsedMs;
      ourStats.totalNodes += adjudication.stats.nodes;
      ourStats.exactAdjudications += 1;
      ourStats.exactAdjudicationElapsedMs += adjudication.stats.elapsedMs;
      ourStats.exactAdjudicationNodes += adjudication.stats.nodes;
      return {
        openingSeed,
        openingMoves,
        ourVariantKey: ourVariant.key,
        ourVariantLabel: ourVariant.label,
        ourColor,
        theirColor,
        outcome: adjudication.outcome,
        ourDiscDiff: adjudication.ourDiscDiff,
        finalCounts: null,
        playedPly: state.ply - startingState.ply,
        moveLog,
        ourStats,
        theirStats,
        gameSeed,
        termination: 'exact-adjudication',
        adjudication,
      };
    }

    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      moveLog.push({
        actor: state.currentPlayer === ourColor ? 'our-engine' : 'trineutron',
        color: state.currentPlayer,
        type: 'pass',
      });
      state = state.passTurn();
      guard += 1;
      if (guard > 200) {
        throw new Error('Match guard exceeded while passing.');
      }
      continue;
    }

    const actingOurEngine = state.currentPlayer === ourColor;
    const engineKey = actingOurEngine ? ourVariant.key : 'trineutron';
    const engine = actingOurEngine ? ourEngine : theirEngine;
    const result = searchWithEngine(engine, state, engineKey, buildSearchSeed(gameSeed, state.ply));

    if (!Number.isInteger(result.bestMoveIndex) || !state.isLegalMove(result.bestMoveIndex)) {
      throw new Error(`Illegal move from ${engineKey}: ${result.bestMoveCoord} (${result.bestMoveIndex})`);
    }

    moveLog.push(normalizeMoveRecord(
      result,
      actingOurEngine ? 'our-engine' : 'trineutron',
      state.currentPlayer,
    ));

    if (actingOurEngine) {
      ourStats.totalElapsedMs += Number(result.stats?.elapsedMs ?? 0);
      ourStats.totalNodes += Number(result.stats?.nodes ?? 0);
      ourStats.moveCount += 1;
    } else {
      theirStats.totalElapsedMs += Number(result.stats?.elapsedMs ?? 0);
      theirStats.totalNodes += Number(result.stats?.nodes ?? 0);
      theirStats.moveCount += 1;
    }

    state = state.applyMove(result.bestMoveIndex).state;
    guard += 1;
    if (guard > 200) {
      throw new Error('Match guard exceeded while applying moves.');
    }
  }

  const counts = state.getDiscCounts();
  const ourDiscDiff = discDiffForColor(state, ourColor);
  const outcome = outcomeFromDiff(ourDiscDiff);
  return {
    openingSeed,
    openingMoves,
    ourVariantKey: ourVariant.key,
    ourVariantLabel: ourVariant.label,
    ourColor,
    theirColor,
    outcome,
    ourDiscDiff,
    finalCounts: counts,
    playedPly: state.ply - startingState.ply,
    moveLog,
    ourStats,
    theirStats,
    gameSeed,
    termination: 'played-out',
    adjudication: null,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const customVariant = await loadCustomVariantProfilesFromArgs(args);
const variantsToRun = parseVariantList(args.variants, { includeCustom: Boolean(customVariant) });
const games = Math.max(1, toFiniteInteger(args.games, 4));
const openingPlies = Math.max(0, toFiniteInteger(args['opening-plies'], 20));
const openingSource = parseOpeningSource(args['opening-source']);
const seed = Math.max(1, toFiniteInteger(args.seed, 1));
const ourTimeMs = Math.max(10, toFiniteInteger(args['our-time-ms'], 100));
const theirTimeMs = Math.max(10, toFiniteInteger(args['their-time-ms'], 100));
const ourMaxDepth = Math.max(1, toFiniteInteger(args['our-max-depth'], 6));
const theirMaxDepth = Math.max(1, toFiniteInteger(args['their-max-depth'], 18));
const searchAlgorithm = normalizeSearchAlgorithm(args['search-algorithm'] ?? 'classic');
const aspirationWindow = Math.max(0, toFiniteInteger(args['aspiration-window'], 40));
const maxTableEntries = Math.max(1000, toFiniteInteger(args['max-table-entries'], 180000));
const exactEndgameEmpties = Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 10));
const solverAdjudicationEmpties = Math.max(0, toFiniteInteger(args['solver-adjudication-empties'], 14));
const solverAdjudicationTimeMs = Math.max(1000, toFiniteInteger(args['solver-adjudication-time-ms'], 60000));
const solverAdjudicationMaxDepth = Math.max(
  Math.max(1, ourMaxDepth),
  toFiniteInteger(args['solver-adjudication-max-depth'], Math.max(ourMaxDepth, solverAdjudicationEmpties)),
);
const theirNoiseScale = Math.max(0, toFiniteInteger(args['their-noise-scale'], 4));
const variantSeedMode = parseVariantSeedMode(args['variant-seed-mode']);
const outputJsonPath = args['output-json'] ? path.resolve(args['output-json']) : null;

const config = {
  ourTimeMs,
  theirTimeMs,
  ourMaxDepth,
  theirMaxDepth,
  searchAlgorithm,
  aspirationWindow,
  maxTableEntries,
  exactEndgameEmpties,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  solverAdjudicationMaxDepth,
  theirNoiseScale,
  variantSeedMode,
};

const variantDefinitions = createVariantDefinitions(config, { customVariant });
const openings = [];
let openingSeedCursor = seed;
while (openings.length < games) {
  const opening = createOpeningState({ openingSource, openingPlies, seed: openingSeedCursor });
  if (!opening.state.isTerminal() && opening.state.getLegalMoves().length > 0) {
    openings.push(opening);
  }
  openingSeedCursor += 1;
}

console.log(`Opening source      : ${openingSource}${openingSource === 'xot' ? ` (${XOT_OPENING_COUNT} XOT lines)` : ''}`);
console.log(`Opening plies       : ${openingPlies}`);
console.log(`Opening seed range  : ${seed}..${openingSeedCursor - 1}`);
const searchAlgorithmLabel = describeSearchAlgorithm(searchAlgorithm)?.label ?? searchAlgorithm;
console.log(`Our search          : ${searchAlgorithm} (${searchAlgorithmLabel}), aspiration=${aspirationWindow}, table=${maxTableEntries}`);
console.log(`Our engine time     : ${ourTimeMs}ms, depth=${ourMaxDepth}, exactEndgameEmpties=${exactEndgameEmpties}`);
console.log(`Solver adjudication : empties<=${solverAdjudicationEmpties ? solverAdjudicationEmpties : 'disabled'}, time=${solverAdjudicationTimeMs}ms, depth=${solverAdjudicationMaxDepth}`);
console.log(`Trineutron time     : ${theirTimeMs}ms, depth=${theirMaxDepth}, noiseScale=${theirNoiseScale}`);
console.log(`Variant seed mode   : ${variantSeedMode}`);
console.log(`Variants            : ${variantsToRun.join(', ')}`);
if (customVariant) {
  console.log(`Custom profiles     : eval=${customVariant.evaluationProfile?.name ?? 'none'}, ordering=${customVariant.moveOrderingProfile?.name ?? 'none'}, tuple=${customVariant.tupleResidualProfile?.name ?? 'none'}, mpc=${customVariant.mpcProfile?.name ?? 'none'}, pattern-bank=${Array.isArray(customVariant.patternBankProfiles) ? customVariant.patternBankProfiles.length : 0}, ordering-pattern-bank=${Array.isArray(customVariant.moveOrderingPatternBankProfiles) ? customVariant.moveOrderingPatternBankProfiles.length : 0}`);
  if (customVariant.engineOptionsJsonPath) {
    console.log(`Custom engine opts  : ${customVariant.engineOptionsJsonPath}`);
  }
  if (customVariant.generatedModulePath) {
    console.log(`Custom module path  : ${customVariant.generatedModulePath}`);
  }
}
console.log(`Games per variant   : ${games} openings x 2 colors = ${games * 2}`);

const summaries = [];
for (let variantIndex = 0; variantIndex < variantsToRun.length; variantIndex += 1) {
  const variantKey = variantsToRun[variantIndex];
  const variant = variantDefinitions[variantKey];
  if (!variant) {
    continue;
  }

  console.log(`\n[variant: ${variant.label}]`);
  const aggregate = createAggregate();
  const byColor = {
    black: createAggregate(),
    white: createAggregate(),
  };
  const gameResults = [];

  for (let openingIndex = 0; openingIndex < openings.length; openingIndex += 1) {
    const opening = openings[openingIndex];
    const blackGame = runSingleGame({
      startingState: opening.state,
      openingSeed: opening.openingSeed,
      openingMoves: opening.openingMoves,
      ourVariant: variant,
      ourColor: PLAYER_COLORS.BLACK,
      theirColor: PLAYER_COLORS.WHITE,
      theirTimeMs,
      theirMaxDepth,
      theirNoiseScale,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
      gameSeed: buildGameSeed(seed, variantIndex, openingIndex, 0, { variantSeedMode }),
    });
    const whiteGame = runSingleGame({
      startingState: opening.state,
      openingSeed: opening.openingSeed,
      openingMoves: opening.openingMoves,
      ourVariant: variant,
      ourColor: PLAYER_COLORS.WHITE,
      theirColor: PLAYER_COLORS.BLACK,
      theirTimeMs,
      theirMaxDepth,
      theirNoiseScale,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
      gameSeed: buildGameSeed(seed, variantIndex, openingIndex, 1, { variantSeedMode }),
    });

    for (const game of [blackGame, whiteGame]) {
      updateAggregate(aggregate, game);
      updateAggregate(byColor[game.ourColor], game);
      gameResults.push(game);
      console.log(
        `opening#${String(openingIndex + 1).padStart(2, '0')} ${game.ourColor.padEnd(5)} `
        + `${game.outcome.padEnd(4)} diff=${String(game.ourDiscDiff).padStart(3, ' ')} `
        + `our ${formatInteger(game.ourStats.totalNodes)}n/${formatInteger(game.ourStats.totalElapsedMs)}ms `
        + `vs tri ${formatInteger(game.theirStats.totalNodes)}n/${formatInteger(game.theirStats.totalElapsedMs)}ms `
        + `[${game.termination}]`,
      );
    }
  }

  const summary = {
    variantKey,
    variantLabel: variant.label,
    aggregate: finalizeAggregate(aggregate),
    byColor: {
      black: finalizeAggregate(byColor.black),
      white: finalizeAggregate(byColor.white),
    },
    games: gameResults,
  };
  summaries.push(summary);

  console.log(`score: ${summary.aggregate.points}/${summary.aggregate.games} (${(summary.aggregate.scoreRate * 100).toFixed(1)}%)`);
  console.log(`W-L-D: ${summary.aggregate.wins}-${summary.aggregate.losses}-${summary.aggregate.draws}`);
  console.log(`avg disc diff: ${summary.aggregate.averageDiscDiff.toFixed(2)}`);
  console.log(`exact adjudications: ${summary.aggregate.exactAdjudications}/${summary.aggregate.games}`);
}

const output = {
  generatedAt: new Date().toISOString(),
  benchmark: 'stage31-trineutron-match-suite',
  opponent: {
    name: 'trineutron/othello',
    repo: 'https://github.com/trineutron/othello',
    site: 'https://trineutron.github.io/othello/',
    timeLimitMs: theirTimeMs,
    maxDepth: theirMaxDepth,
    noiseScale: theirNoiseScale,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    solverAdjudicationMaxDepth,
  },
  customVariant: customVariant ? {
    label: customVariant.label,
    evaluationProfileName: customVariant.evaluationProfile?.name ?? null,
    moveOrderingProfileName: customVariant.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: customVariant.tupleResidualProfile?.name ?? null,
    mpcProfileName: customVariant.mpcProfile?.name ?? null,
    patternBankProfileNames: Array.isArray(customVariant.patternBankProfiles)
      ? customVariant.patternBankProfiles.map((profile) => profile?.name ?? null)
      : [],
    moveOrderingPatternBankProfileNames: Array.isArray(customVariant.moveOrderingPatternBankProfiles)
      ? customVariant.moveOrderingPatternBankProfiles.map((profile) => profile?.name ?? null)
      : [],
    generatedModulePath: customVariant.generatedModulePath ?? null,
    engineOptionsJsonPath: customVariant.engineOptionsJsonPath ?? null,
    engineOptions: customVariant.engineOptions ?? null,
    disabledFeatures: customVariant.disabledFeatures ?? {
      moveOrdering: false,
      tupleResidual: false,
      mpc: false,
      patternBank: false,
      moveOrderingPatternBank: false,
    },
  } : null,
  options: {
    variants: variantsToRun,
    games,
    openingSource,
    openingPlies,
    seed,
    searchAlgorithm,
    aspirationWindow,
    maxTableEntries,
    ourTimeMs,
    ourMaxDepth,
    exactEndgameEmpties,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    solverAdjudicationMaxDepth,
    theirTimeMs,
    theirMaxDepth,
    theirNoiseScale,
    variantSeedMode,
  },
  openings: openings.map((opening) => ({
    source: opening.source ?? openingSource,
    openingLabel: opening.openingLabel ?? null,
    openingSeed: opening.openingSeed,
    openingPliesCompleted: opening.openingPliesCompleted,
    openingMoves: opening.openingMoves,
    xotIndex: Number.isInteger(opening.xotIndex) ? opening.xotIndex : null,
    xotSequence: typeof opening.xotSequence === 'string' ? opening.xotSequence : null,
    currentPlayer: opening.state.currentPlayer,
    empties: opening.state.getEmptyCount(),
  })),
  variants: summaries,
};

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nSaved benchmark summary to ${outputJsonPath}`);
}
