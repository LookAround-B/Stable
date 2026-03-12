#!/bin/bash

# VPS Deployment Script - Handles git conflicts and rebuilds

set -e

echo "🚀 Starting VPS Deployment..."

# Navigate to project root
cd /opt/horsestable
echo "📍 Working in: $(pwd)"

# Clean up git merge state if any
echo "🧹 Cleaning merge state..."
git merge --abort 2>/dev/null || true

# Stash local changes (build artifacts, env files)
echo "💾 Stashing local changes..."
git stash push -u -m "stash-before-deploy-$(date +%s)"

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build and deploy backend
echo "🔨 Building backend..."
cd backend
# Clean build cache
rm -rf .next 2>/dev/null || true
# Sync database schema with new models
echo "📊 Syncing database schema..."
npx prisma db push --skip-generate
npx prisma generate
npm run build
echo "✅ Backend built successfully"

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart horsestable-backend
sleep 2

# Build and deploy frontend
echo "🔨 Building frontend..."
cd ../frontend
npm install
npm run build
echo "✅ Frontend built successfully"

# Restart or start frontend
echo "🔄 Restarting frontend..."
if pm2 info horsestable-frontend > /dev/null 2>&1; then
  pm2 restart horsestable-frontend
else
  echo "⚠️  Frontend process not found, starting fresh..."
  # Install serve if not available, then start it
  npm list -g serve >/dev/null 2>&1 || npm install -g serve
  pm2 start "serve -s build -l 3001" --name horsestable-frontend --cwd /opt/horsestable/frontend
fi
sleep 2

# Verify both services are running
echo "✓ Backend status:"
pm2 info horsestable-backend | grep -E "status|pid" || true

echo "✓ Frontend status:"
pm2 info horsestable-frontend | grep -E "status|pid" || true

echo ""
echo "✨ Deployment complete!"
echo "📱 Frontend: http://187.77.185.220"
echo "🔌 Backend: http://187.77.185.220/api/"
