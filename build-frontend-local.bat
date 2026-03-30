@echo off
REM Build and commit frontend for VPS deployment
REM Run this locally after making frontend changes

setlocal enabledelayedexpansion

echo.
echo 🔨 Building frontend locally...
echo.

cd /d "d:\LookAround\1. EFM Stable\frontend"

if errorlevel 1 (
  echo ❌ Failed to navigate to frontend directory
  exit /b 1
)

REM Clean previous build
echo 🧹 Cleaning old build...
rmdir /s /q build >nul 2>&1

REM Install dependencies
echo 📦 Installing dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 (
  echo ❌ npm install failed
  exit /b 1
)

REM Build frontend
echo 🏗️  Building...
call npm run build
if errorlevel 1 (
  echo ❌ npm run build failed
  exit /b 1
)

REM Add to git
echo.
echo 📝 Committing build to git...
cd /d "d:\LookAround\1. EFM Stable"
git add frontend/build/
git commit -m "Pre-built frontend for VPS deployment"
if errorlevel 1 (
  echo ⚠️  No changes to commit (already up to date)
) else (
  echo ✓ Committed
)

REM Ask to push
echo.
set /p push="Push to git now? (y/n): "
if /i "!push!"=="y" (
  echo 📤 Pushing to git...
  git push
  if errorlevel 1 (
    echo ❌ git push failed
    exit /b 1
  )
  echo ✓ Pushed to origin/main
)

echo.
echo ✨ Done! Frontend is ready for VPS deployment
echo Next step on VPS:
echo   cd /opt/horsestable
echo   git pull origin main
echo   bash deploy-vps.sh
echo.
