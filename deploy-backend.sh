#!/bin/bash
# Deploy backend to VPS
# Usage: ./deploy-backend.sh

VPS="root@157.85.98.97"
REMOTE_PATH="/opt/leadgen"
LOCAL_BACKEND="./backend"

echo "🚀 Deploying backend to VPS..."

# Sync all source files
echo "📦 Syncing source files..."
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.env' \
  "$LOCAL_BACKEND/src/" "$VPS:$REMOTE_PATH/src/"

rsync -avz --exclude 'node_modules' \
  "$LOCAL_BACKEND/prisma/" "$VPS:$REMOTE_PATH/prisma/"

# Build and restart
echo "🔨 Building and restarting..."
ssh "$VPS" "cd $REMOTE_PATH && npm run build && pm2 restart leadgen-backend"

echo "✅ Deploy complete!"
