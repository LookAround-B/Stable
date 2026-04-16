#!/bin/bash

# VPS deployment script for GitHub Actions -> Hostinger VPS

set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/opt/horsestable}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
BACKEND_DIR="${APP_ROOT}/backend"
FRONTEND_DIR="${APP_ROOT}/frontend"
BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-horsestable-backend}"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-horsestable-frontend}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"

echo "Starting VPS deployment..."
cd "${APP_ROOT}"
echo "Working in: $(pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required on the VPS"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required on the VPS"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required on the VPS"
  exit 1
fi

echo "Cleaning merge state..."
git merge --abort 2>/dev/null || true

echo "Stashing tracked backend changes if needed..."
if ! git diff --quiet -- backend/; then
  git stash push -m "stash-before-deploy-$(date +%s)" -- backend/ || true
fi

echo "Pulling latest code from ${DEPLOY_BRANCH}..."
git fetch origin "${DEPLOY_BRANCH}"
git pull --ff-only origin "${DEPLOY_BRANCH}"

echo "Building backend..."
cd "${BACKEND_DIR}"
echo "Installing backend dependencies..."
npm install --legacy-peer-deps
rm -rf .next 2>/dev/null || true

if [ -f "prisma/schema.prisma" ]; then
  echo "Syncing Prisma schema..."
  npx prisma db push --skip-generate
  npx prisma generate
fi

npm run build
echo "Backend build completed"

echo "Restarting backend..."
if pm2 info "${BACKEND_PM2_NAME}" >/dev/null 2>&1; then
  pm2 restart "${BACKEND_PM2_NAME}"
else
  pm2 start npm --name "${BACKEND_PM2_NAME}" --cwd "${BACKEND_DIR}" -- start
fi
sleep 2

echo "Building frontend..."
cd "${FRONTEND_DIR}"
npm install --prefer-offline --no-audit --legacy-peer-deps
rm -rf build 2>/dev/null || true
npm run build
echo "Frontend build completed"

echo "Restarting frontend..."
if pm2 info "${FRONTEND_PM2_NAME}" >/dev/null 2>&1; then
  pm2 restart "${FRONTEND_PM2_NAME}"
else
  npm list -g serve >/dev/null 2>&1 || npm install -g serve
  pm2 start "serve -s build -l ${FRONTEND_PORT}" --name "${FRONTEND_PM2_NAME}" --cwd "${FRONTEND_DIR}"
fi
sleep 2

pm2 save

echo "Backend status:"
pm2 info "${BACKEND_PM2_NAME}" | grep -E "status|pid" || true

echo "Frontend status:"
pm2 info "${FRONTEND_PM2_NAME}" | grep -E "status|pid" || true

echo
echo "Deployment complete"
