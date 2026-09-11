"""Визуализации квартиры через AI Horde (aihorde.net) — бесплатная волонтёрская сеть GPU, без ключа (anonymous apikey 0000000000).
- text-to-image: Flux.1-Schnell fp8 (Compact); img2img по кадрам видео (вход, коридор, санузлы) — с сохранением плитки.
Запуск: python3 scripts/render_views_horde.py <папка с кадрами f_*.jpg> [--only eco,std] [--views wc,shower] [--force] [--parallel 3]
Результат: public/renders/<opt>-<view>.jpg + src/data/renders.json (возобновляемый — готовые пропускает).
"""
import base64
import io
import json
import re
import sys
import threading
import time
from pathlib import Path

import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_prompts import VIEWS_DEF, build_prompt, build_video_prompt  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "renders"
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = Path(sys.argv[1])
args = sys.argv[2:]
ONLY = set(args[args.index("--only") + 1].split(",")) if "--only" in args else {"eco", "std", "prem"}
VIEWS = set(args[args.index("--views") + 1].split(",")) if "--views" in args else None
FORCE = "--force" in args
PAR = int(args[args.index("--parallel") + 1]) if "--parallel" in args else 3
API = "https://aihorde.net/api/v2"
HDR = {"apikey": "0000000000", "Client-Agent": "flat-55-design:1.0:github.com/guzoevalbert07-cpu", "Content-Type": "application/json"}
T2I_MODEL = "Flux.1-Schnell fp8 (Compact)"
I2I_MODELS = ["Flux.1-Schnell fp8 (Compact)", "Juggernaut XL", "AlbedoBase XL (SDXL)"]
NEG = "people, person, text, watermark, logo, blurry, distorted, bathtub, gas stove"
BAD_WORKERS: list[str] = []  # воркеры, вернувшие «censored» на безобидный промпт — исключаем


def api(method, path, body=None, timeout=60):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers=HDR, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def curl_json(method, path, body=None):
    """urllib здесь не проходит TLS на некоторых хостах — дублируем через curl."""
    import subprocess
    cmd = ["curl", "-s", "--max-time", "90", "-X", method, API + path, "-H", "apikey: 0000000000", "-H", f"Client-Agent: {HDR['Client-Agent']}", "-H", "Content-Type: application/json"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    return json.loads(out) if out.strip() else {}


def fetch(url, out_path):
    import subprocess
    subprocess.run(["curl", "-sL", "--max-time", "120", "-o", str(out_path), url], check=True)


def img_b64(path, max_side=1024):
    im = Image.open(path).convert("RGB")
    im.thumbnail((max_side, max_side))
    w, h = (im.size[0] // 64) * 64, (im.size[1] // 64) * 64
    im = im.resize((max(w, 64), max(h, 64)))
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=90)
    return base64.b64encode(buf.getvalue()).decode(), im.size


def generate(prompt, kind, frame, seed):
    # kind == "kontext": описание существующей отделки (плитка, ниша, подиум) в промпте, портретный кадр как в видео
    portrait = kind == "kontext" and frame not in ("f_002.jpg",)
    w, h = (768, 1024) if portrait else (1024, 768)
    payload = {"prompt": f"{prompt} ### {NEG}", "params": {"width": w, "height": h, "steps": 6, "cfg_scale": 1.5, "sampler_name": "k_euler", "n": 1, "seed": str(seed)},
               "models": [T2I_MODEL], "nsfw": True, "censor_nsfw": False, "r2": True, "shared": False, "slow_workers": True, "trusted_workers": False}
    r = curl_json("POST", "/generate/async", payload)
    if "id" not in r:
        raise RuntimeError(f"submit: {r}")
    rid = r["id"]
    for _ in range(120):  # до ~20 минут
        time.sleep(10)
        st = curl_json("GET", f"/generate/check/{rid}")
        if st.get("faulted"):
            raise RuntimeError("faulted")
        if st.get("done"):
            break
    res = curl_json("GET", f"/generate/status/{rid}")
    gens = res.get("generations") or []
    if not gens:
        raise RuntimeError(f"no result: {str(res)[:200]}")
    if gens[0].get("censored") or gens[0].get("state") == "censored":
        raise RuntimeError(f"censored by worker {gens[0].get('worker_name')} — retry with another seed/wording")
    return gens[0]["img"], gens[0].get("model"), gens[0].get("worker_name")


manifest_path = ROOT / "src" / "data" / "renders.json"
lock = threading.Lock()


def save(opt, key, i, title, kind, frame, prompt, seed, tmp, model):
    im = Image.open(tmp).convert("RGB")
    im.thumbnail((1400, 1400))
    out = OUT / f"{opt}-{key}.jpg"
    im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    entry = {"option": opt, "view": key, "order": i, "title": title, "src": f"renders/{out.name}", "width": im.size[0], "height": im.size[1],
             "kind": kind, "frame": frame, "prompt": prompt, "seed": seed, "model": model, "engine": "aihorde", "generatedAt": time.strftime("%Y-%m-%d")}
    with lock:
        current = json.load(open(manifest_path)) if manifest_path.exists() else []
        merged = {(m["option"], m["view"]): m for m in current}
        merged[(opt, key)] = entry
        manifest = sorted(merged.values(), key=lambda m: (["eco", "std", "prem"].index(m["option"]), m["order"]))
        json.dump(manifest, open(manifest_path, "w"), ensure_ascii=False, indent=1)
    return out, im.size


jobs = []
for opt in ("eco", "std", "prem"):
    if opt not in ONLY:
        continue
    for i, (key, title, kind, frame, tmpl) in enumerate(VIEWS_DEF, 1):
        if VIEWS and key not in VIEWS:
            continue
        out = OUT / f"{opt}-{key}.jpg"
        if out.exists() and not FORCE:
            continue
        jobs.append((opt, key, i, title, kind, frame, tmpl))
print(f"заданий: {len(jobs)}, параллельно {PAR}")


def worker(q):
    while True:
        with lock:
            if not q:
                return
            opt, key, i, title, kind, frame, tmpl = q.pop(0)
        # виды по видео — описание отделки (build_video_prompt), остальные — по плану (build_prompt)
        prompt = build_video_prompt(opt, key) if kind == "kontext" else build_prompt(opt, key, kind, tmpl)
        seed = 100 + i + (900 if key == "corridor" else 0)  # seed 102 для коридора стабильно давал мусорный текст на стене
        t = time.time()
        for attempt in range(5):
            try:
                p_try = prompt if attempt == 0 else prompt.replace("Photorealistic interior photograph", "Architectural photo of an apartment interior").replace("Detail of a room corner in an apartment", "Empty freshly renovated room").replace("Empty, unoccupied", "Vacant, freshly finished")
                url, model, wname = generate(p_try, kind, FRAMES / frame if frame else None, seed + 500 * attempt)
                tmp = OUT / f".tmp-{opt}-{key}.webp"
                fetch(url, tmp)
                out, size = save(opt, key, i, title, kind, frame, prompt, seed + 500 * attempt, tmp, model)
                tmp.unlink(missing_ok=True)
                print(f"✅ {opt}/{key} {size} {time.time() - t:.0f}s [{model} @ {wname}]", flush=True)
                break
            except Exception as e:  # noqa: BLE001
                print(f"⚠️ {opt}/{key} попытка {attempt + 1}: {str(e)[:160]}", flush=True)
                time.sleep(15)
        else:
            print(f"❌ {opt}/{key} не получилось", flush=True)


threads = [threading.Thread(target=worker, args=(jobs,)) for _ in range(min(PAR, max(1, len(jobs))))]
for th in threads:
    th.start()
    time.sleep(3)
for th in threads:
    th.join()
n = len([f for f in OUT.glob("*.jpg") if not f.name.startswith("now-")])
print(f"готово видов: {n}")
