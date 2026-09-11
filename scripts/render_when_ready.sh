#!/usr/bin/env bash
# Сторож: пробует догенерировать визуализации (анонимная квота ZeroGPU иногда восстанавливается; с HF_TOKEN в .env — сразу),
# после каждого удачного прохода пересобирает и публикует сайт. Останавливается, когда есть все 48 видов.
# Запуск в фоне: nohup bash scripts/render_when_ready.sh > /tmp/render_when_ready.log 2>&1 &
set -u
cd "$(dirname "$0")/.."
FRAMES="${1:-$HOME/flat-55-design/input/frames}"
PY="${PY:-$HOME/flat-55-design/.venv-render/bin/python}"
for d in "$HOME"/.nvm/versions/node/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done; export PATH
while true; do
  before=$(ls public/renders 2>/dev/null | grep -vc '^now-')
  "$PY" -u scripts/render_views.py "$FRAMES" || true
  after=$(ls public/renders 2>/dev/null | grep -vc '^now-')
  echo "$(date '+%F %T') готово видов: $after"
  if [ "$after" -gt "$before" ]; then
    npm run build >/dev/null 2>&1 && bash scripts/deploy.sh >/dev/null 2>&1 && git add -A && git -c user.email=guzoev.albert07@gmail.com commit -qm "Визуализации: $after видов" && git push -q origin main && echo "$(date '+%F %T') опубликовано"
  fi
  [ "$after" -ge 48 ] && { echo "все 48 видов готовы"; exit 0; }
  if grep -qE '^\s*HF_TOKEN\s*=\s*\S+' .env 2>/dev/null; then sleep 120; else sleep 3600; fi
done
