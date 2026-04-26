@echo off
setlocal
call "%~dp0_path-context.bat"
node "%~dp0run-mpc-training-optimization-smoke.mjs" %*
