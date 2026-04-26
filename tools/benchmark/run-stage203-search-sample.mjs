import { SearchEngine } from '../../js/ai/search-engine.js';
import { playSeededRandomUntilEmptyCount, summarizeResult } from '../../js/test/benchmark-helpers.mjs';

const [targetEmptyCountRaw, seedRaw, optionsJson] = process.argv.slice(2);
const targetEmptyCount = Number.parseInt(targetEmptyCountRaw, 10);
const seed = Number.parseInt(seedRaw, 10);
const options = JSON.parse(optionsJson);
const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
const engine = new SearchEngine(options);
const result = engine.findBestMove(state);
const summary = summarizeResult(result, state, seed, {
  ttFirstDeferredMoveListBuildAttempts: result.stats?.ttFirstDeferredMoveListBuildAttempts ?? null,
  ttFirstDeferredMoveListBuildLegalHits: result.stats?.ttFirstDeferredMoveListBuildLegalHits ?? null,
  ttFirstDeferredMoveListBuildCutoffs: result.stats?.ttFirstDeferredMoveListBuildCutoffs ?? null,
  ttFirstDeferredMoveListBuildSkips: result.stats?.ttFirstDeferredMoveListBuildSkips ?? null,
  lowOverheadSearchChildStates: result.stats?.lowOverheadSearchChildStates ?? null,
  lowOverheadSearchPassStates: result.stats?.lowOverheadSearchPassStates ?? null,
});
process.stdout.write(JSON.stringify(summary));
