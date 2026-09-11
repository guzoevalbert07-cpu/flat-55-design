"""Визуализации квартиры по трём опциям без API-ключа: FLUX.1 через публичные Hugging Face Spaces (gradio_client).
- Санузлы, вход и коридор: FLUX Kontext (image-to-image) на кадрах видео — плитка и геометрия сохраняются.
- Кухня, зал, спальня, лоджия, детали: FLUX.1-schnell (text-to-image) по планировочному решению и токенам опции.
Запуск: python3 scripts/render_views.py <папка с кадрами f_*.jpg> [--only eco,std] [--views wc,shower] [--force]
Результат: public/renders/<opt>-<view>.jpg + src/data/renders.json. Скрипт возобновляемый: готовые файлы пропускает.
"""
import json
import re
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image
from gradio_client import Client, handle_file

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "renders"
import os
# токен Hugging Face (бесплатный) снимает лимит ZeroGPU; берём из окружения или из .env
HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN and (ROOT / ".env").exists():
    for line in (ROOT / ".env").read_text().splitlines():
        m = re.match(r"\s*HF_TOKEN\s*=\s*\"?([^\"#\s]+)", line)
        if m:
            HF_TOKEN = m.group(1)
            break
print("HF token:", "есть" if HF_TOKEN else "нет (анонимная квота ZeroGPU — несколько запусков в день)")
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = Path(sys.argv[1])
args = sys.argv[2:]
ONLY = set(args[args.index("--only") + 1].split(",")) if "--only" in args else {"eco", "std", "prem"}
VIEWS = set(args[args.index("--views") + 1].split(",")) if "--views" in args else None
FORCE = "--force" in args

from render_prompts import STYLE, SUFFIX, KONTEXT_PREFIX, KONTEXT_STYLE, VIEWS_DEF, OPT_DETAILS, build_prompt  # noqa: E402

SCHNELL_SPACES = ["black-forest-labs/FLUX.1-schnell"]
KONTEXT_SPACES = ["black-forest-labs/FLUX.1-Kontext-Dev", "multimodalart/flux-kontext-dev"]
clients: dict[str, Client] = {}


def client(space):
    if space not in clients:
        clients[space] = Client(space, verbose=False, hf_token=HF_TOKEN) if HF_TOKEN else Client(space, verbose=False)
    return clients[space]


def gen(kind, prompt, frame, seed):
    last = None
    spaces = SCHNELL_SPACES if kind == "schnell" else KONTEXT_SPACES
    for attempt in range(6):
        space = spaces[attempt % len(spaces)]
        try:
            c = client(space)
            if kind == "schnell":
                r = c.predict(prompt=prompt, seed=seed, randomize_seed=False, width=1024, height=768, num_inference_steps=4, api_name="/infer")
            else:
                r = c.predict(input_image=handle_file(str(frame)), prompt=prompt, seed=seed, randomize_seed=False, guidance_scale=2.5, steps=28, api_name="/infer")
            path = r[0] if isinstance(r, (list, tuple)) else r
            if isinstance(path, dict):
                path = path.get("path")
            return path
        except Exception as e:  # noqa: BLE001
            last = e
            wait = 20 * (attempt + 1)
            print(f"   ⚠️ {space}: {type(e).__name__}: {str(e)[:120]} → пауза {wait}s")
            clients.pop(space, None)
            time.sleep(wait)
    raise RuntimeError(f"не удалось: {last}")


manifest_path = ROOT / "src" / "data" / "renders.json"
manifest = json.load(open(manifest_path)) if manifest_path.exists() else []
by_key = {(m["option"], m["view"]): m for m in manifest}

for opt in ("eco", "std", "prem"):
    if opt not in ONLY:
        continue
    name, style = STYLE[opt]
    for i, (key, title, kind, frame, tmpl) in enumerate(VIEWS_DEF, 1):
        if VIEWS and key not in VIEWS:
            continue
        out = OUT / f"{opt}-{key}.jpg"
        if out.exists() and not FORCE:
            continue
        prompt = build_prompt(opt, key, kind, tmpl)
        t = time.time()
        print(f"▶ {opt}/{key} ({kind})")
        try:
            path = gen(kind, prompt, FRAMES / frame if frame else None, seed=100 + i)
        except Exception as e:  # noqa: BLE001
            print(f"   ❌ {e}")
            continue
        im = Image.open(path).convert("RGB")
        im.thumbnail((1400, 1400))
        im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
        entry = {"option": opt, "view": key, "order": i, "title": title, "src": f"renders/{out.name}", "width": im.size[0], "height": im.size[1],
                 "kind": kind, "frame": frame, "prompt": prompt, "seed": 100 + i, "generatedAt": time.strftime("%Y-%m-%d")}
        # манифест перечитываем перед записью — несколько процессов могут писать параллельно
        current = json.load(open(manifest_path)) if manifest_path.exists() else []
        merged = {(m["option"], m["view"]): m for m in current}
        merged[(opt, key)] = entry
        by_key = merged
        manifest = sorted(merged.values(), key=lambda m: (["eco", "std", "prem"].index(m["option"]), m["order"]))
        json.dump(manifest, open(manifest_path, "w"), ensure_ascii=False, indent=1)
        print(f"   ✅ {out.name} {im.size} {time.time() - t:.0f}s")

print(f"итого в манифесте: {len(manifest)}")
