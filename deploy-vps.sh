#!/bin/bash

# VPS deployment script for GitHub Actions -> Hostinger VPS
# Frontend is pre-built in GitHub Actions and rsynced before this script runs.
# This script only handles: git pull, backend build, prisma, PM2 restarts.

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

for cmd in git npm pm2; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "$cmd is required on the VPS"; exit 1; }
done

# ── Pull latest code ─────────────────────────────────────────────────────────
echo "Cleaning merge state..."
git merge --abort 2>/dev/null || true

echo "Stashing tracked backend changes if needed..."
if ! git diff --quiet -- backend/; then
  git stash push -m "stash-before-deploy-$(date +%s)" -- backend/ || true
fi

echo "Pulling latest code from ${DEPLOY_BRANCH}..."
git fetch origin "${DEPLOY_BRANCH}"
git pull --ff-only origin "${DEPLOY_BRANCH}"

# ── Backend ──────────────────────────────────────────────────────────────────
echo "Installing backend dependencies..."
cd "${BACKEND_DIR}"
npm ci --legacy-peer-deps

# Run prisma only when the schema actually changed
SCHEMA_CHANGED=$(git diff HEAD~1 HEAD --name-only 2>/dev/null | grep "prisma/schema.prisma" || true)
if [ -n "${SCHEMA_CHANGED}" ]; then
  echo "Prisma schema changed — running db push + generate..."
  npx prisma db push --skip-generate
  npx prisma generate
else
  echo "Prisma schema unchanged — skipping db push"
  # Still regenerate the client in case prisma package was updated
  npx prisma generate
fi

# Keep .next/cache so Next.js can do incremental rebuilds (much faster)
echo "Building backend..."
npm run build
echo "Backend build completed"

echo "Restarting backend..."
if pm2 info "${BACKEND_PM2_NAME}" >/dev/null 2>&1; then
  pm2 restart "${BACKEND_PM2_NAME}"
else
  pm2 start npm --name "${BACKEND_PM2_NAME}" --cwd "${BACKEND_DIR}" -- start
fi
sleep 2

# ── Frontend ─────────────────────────────────────────────────────────────────
# The build/ folder was already rsynced from GitHub Actions — nothing to build here.
echo "Frontend already built and uploaded — restarting PM2..."
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
