#!/bin/bash

echo "🚀 AikiNote Production Deployment Script"
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

# タグ名の生成（日付ベース）
TODAY=$(date +%Y%m%d)
EXISTING_TAGS=$(git tag -l "${TODAY}v*" | wc -l | tr -d ' ')
NEXT_VERSION=$((EXISTING_TAGS + 1))
TAG_NAME="${TODAY}v${NEXT_VERSION}"

echo "📋 Generated tag name: $TAG_NAME"
echo ""

read -p "Do you want to deploy version $TAG_NAME to production? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Creating tag and pushing..."

# タグを作成してプッシュ
git tag "$TAG_NAME"
git push origin "$TAG_NAME"

echo ""
echo "✅ Deployment tag created successfully!"
echo "🚀 Tag: $TAG_NAME"
echo "📊 Monitor deployment progress at:"
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/')/actions"
echo ""
echo "⏱️  Deployment typically takes 5-10 minutes to complete."
