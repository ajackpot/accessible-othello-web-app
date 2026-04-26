@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

node "%EVALUATOR_TRAINING_DIR%\repair-stage15x-factorized-exports.mjs" %*
exit /b %ERRORLEVEL%
