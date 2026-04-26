@echo off
setlocal
call "%~dp0_path-context.bat"
node "%~dp0precompute-mpc-search-pairs.mjs" %*
