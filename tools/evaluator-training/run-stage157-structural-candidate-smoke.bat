@echo off
setlocal
pushd %~dp0 >nul
node run-stage157-structural-candidate-smoke.mjs %*
set EXIT_CODE=%ERRORLEVEL%
popd >nul
exit /b %EXIT_CODE%
