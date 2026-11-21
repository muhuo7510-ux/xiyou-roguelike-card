#!/usr/bin/env bash
# 重新发布 GitHub Pages：打包 dist 并推送到 gh-pages 分支（不强推，在现有 gh-pages 上追加一个提交）
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
SRC=$(git rev-parse --short HEAD)
TMP=$(mktemp -d)
git worktree add "$TMP" gh-pages 2>/dev/null || { git fetch origin gh-pages:gh-pages && git worktree add "$TMP" gh-pages; }
find "$TMP" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$TMP/"
touch "$TMP/.nojekyll"
git -C "$TMP" add -A
git -C "$TMP" commit -qm "Deploy $SRC" || echo "无变化"
git -C "$TMP" push origin gh-pages
git worktree remove "$TMP"
echo "已发布：https://muhuo7510-ux.github.io/xiyou-roguelike-card/"
