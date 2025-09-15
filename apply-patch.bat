@echo off
setlocal enabledelayedexpansion
rem Run from the repo root
cd /d "%~dp0"

if not exist .git (
  echo This folder isn't a git repo. Open your project root and try again.
  exit /b 1
)

if "%~1"=="" (
  echo Usage: apply-patch ^<patch-file.diff^>
  exit /b 1
)

set "FILE=%~1"
if not exist "%FILE%" (
  echo File not found: %FILE%
  exit /b 1
)

echo Applying "%FILE%"...
git apply --whitespace=nowarn "%FILE%" || goto :fail

echo.
set /p DO_COMMIT=Commit the changes now? [y/N] :
if /I "%DO_COMMIT%"=="Y" (
  git add -A && git commit -m "Apply %~nx1" && echo Done. && exit /b 0
  goto :fail
) else (
  echo Applied but not committed. You can run:
  echo   git add -A
  echo   git commit -m "Apply %~nx1"
  exit /b 0
)

:fail
echo.
echo Patch failed. To discard any changes:
echo   git reset --hard
exit /b 1
