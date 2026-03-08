#!/bin/bash

echo "🚀 AikiNote Deployment Script"
echo "========================================"

# 現在のブランチをチェック
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: You must be on the main branch to deploy"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# 未コミットの変更をチェック
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: You have uncommitted changes"
    git status --short
    exit 1
fi

# リモートとの同期をチェック
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
    echo "❌ Error: Local main branch is not up to date with origin/main"
    echo "Please run: git pull origin main"
    exit 1
fi

echo "✅ Pre-checks passed"
echo ""

# デプロイ確認
echo "🔍 Current commit:"
git log --oneline -1
echo ""
echo "⚠️  Before deploying frontend, confirm these Vercel Production env vars are set:"
echo "   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME,"
echo "   CLOUDFRONT_DOMAIN, NEXT_PUBLIC_CLOUDFRONT_DOMAIN"
echo ""

read -p "Do you want to deploy frontend by pushing main branch? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Pushing main branch..."
git push origin main

echo ""
echo "✅ Frontend  deployment triggered (Vercel)"
echo ""

read -p "Do you want to deploy backend via Cloudflare Workers now? (yes/no): " confirm_backend
if [ "$confirm_backend" != "yes" ]; then
    echo "ℹ️  Backend deployment skipped"
    exit 0
fi

echo ""
echo "🚀 Deploying backend via Wrangler (pnpm --filter backend exec wrangler deploy)..."
pnpm --filter backend exec wrangler deploy
