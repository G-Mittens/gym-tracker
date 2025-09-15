@echo off
setlocal
cd /d "%~dp0"

if not exist .git (
  echo Not a git repo. Open your project root and try again.
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

rem Normalize line-endings handling in this repo
git config core.autocrlf false >nul
git config apply.whitespace nowarn >nul

echo Applying "%FILE%"...
rem 1) normal apply
git apply "%FILE%" --whitespace=nowarn
if errorlevel 1 (
  echo First attempt failed. Trying 3-way merge...
  rem 2) try 3-way (uses your current files as base)
  git apply "%FILE%" --whitespace=nowarn --3way
  if errorlevel 1 (
    echo 3-way failed. Creating .rej files with rejects...
    rem 3) last resort: produce .rej files you can inspect if needed
    git apply "%FILE%" --whitespace=nowarn --reject
    if errorlevel 1 (
      echo Patch failed completely. To discard partial changes:
      echo   git reset --hard
      exit /b 1
    )
  )
)

echo.
set /p DO_COMMIT=Commit the changes now? [y/N] :
if /I "%DO_COMMIT%"=="Y" (
  git add -A && git commit -m "Apply %~nx1"
  echo Done.
) else (
  echo Applied but not committed. You can run:
  echo   git add -A
  echo   git commit -m "Apply %~nx1"
)
exit /b 0
