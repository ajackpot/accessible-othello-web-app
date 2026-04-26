@echo off
setlocal

set "POSITIONS_JSON=%~1"
if "%POSITIONS_JSON%"=="" set "POSITIONS_JSON=tools\engine-match\out\_stage166_pattern_stress_selection\stage166_pattern_stress_positions.json"

set "OUR_TIME_MS=%~2"
if "%OUR_TIME_MS%"=="" set "OUR_TIME_MS=240"

set "THEIR_TIME_MS=%~3"
if "%THEIR_TIME_MS%"=="" set "THEIR_TIME_MS=240"

set "THEIR_NOISE_SCALE=%~4"
if "%THEIR_NOISE_SCALE%"=="" set "THEIR_NOISE_SCALE=0"

set "OUTPUT_ROOT=%~5"
if "%OUTPUT_ROOT%"=="" set "OUTPUT_ROOT=tools\engine-match\out\_stage166_pattern_stress_suite"

node tools\engine-match\run-stage166-pattern-stress-suite.mjs ^
  --positions-json "%POSITIONS_JSON%" ^
  --our-time-ms "%OUR_TIME_MS%" ^
  --their-time-ms "%THEIR_TIME_MS%" ^
  --their-noise-scale "%THEIR_NOISE_SCALE%" ^
  --output-root "%OUTPUT_ROOT%"

endlocal
