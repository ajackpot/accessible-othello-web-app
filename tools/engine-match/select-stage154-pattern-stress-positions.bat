@echo off
setlocal

set "SAMPLE_SEEDS=%~1"
if "%SAMPLE_SEEDS%"=="" set "SAMPLE_SEEDS=512"

set "PLIES=%~2"
if "%PLIES%"=="" set "PLIES=24,28"

set "PER_PLY=%~3"
if "%PER_PLY%"=="" set "PER_PLY=2"

set "OUTPUT_DIR=%~4"
if "%OUTPUT_DIR%"=="" set "OUTPUT_DIR=tools\engine-match\out\_stage166_pattern_stress_selection"

node tools\engine-match\select-stage154-pattern-stress-positions.mjs ^
  --sample-seeds "%SAMPLE_SEEDS%" ^
  --plies "%PLIES%" ^
  --per-ply "%PER_PLY%" ^
  --output-dir "%OUTPUT_DIR%"

endlocal
