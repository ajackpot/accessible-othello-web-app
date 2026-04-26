@echo off
setlocal
call "%~dp0_path-context.bat"
node "%~dp0fit-mpc-profile-from-search-pairs.mjs" %*
