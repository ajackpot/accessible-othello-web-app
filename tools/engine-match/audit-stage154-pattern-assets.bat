@echo off
setlocal

set "OUTPUT_DIR=%~1"
if "%OUTPUT_DIR%"=="" set "OUTPUT_DIR=tools\engine-match\out\_stage166_pattern_audit"

node tools\engine-match\audit-stage154-pattern-assets.mjs ^
  --output-dir "%OUTPUT_DIR%"

endlocal
