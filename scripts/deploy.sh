#!/usr/bin/env bash
# Деплой на GitHub Pages из ветки gh-pages: Excel → JSON → сборка → push dist.
# Запуск: npm run deploy   (нужен git-доступ к origin; gh auth login достаточно)
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v npm >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
  export PATH
fi
REPO_URL="$(git remote get-url origin)"
npm run data
npm run build
touch dist/.nojekyll
cp public/og.png dist/og.png 2>/dev/null || true
cd dist
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email="$(git -C .. config user.email)" -c user.name="$(git -C .. config user.name)" commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push -f "$REPO_URL" gh-pages
rm -rf .git
echo "✅ Опубликовано: https://guzoevalbert07-cpu.github.io/flat-55-design/ (обновление на CDN до 1–2 минут)"
