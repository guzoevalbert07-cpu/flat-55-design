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

STYLE = {
    "eco": ("Эконом", "Scandinavian basic style: warm white plain wallpaper walls, light oak laminate floor, white laminate furniture and white kitchen fronts, "
            "grey hopsack fabric, black matte handles and fittings, white matte stretch ceiling with small GX53 spot lights, white laminated flat interior doors, simple black track-free lighting"),
    "std": ("Стандарт", "warm minimalism: greige textured wallpaper walls, natural oak laminate floor with bevels, matte cashmere-beige upper cabinet fronts and graphite lower cabinets, "
            "sage green accent, mustard velvet sofa, black matte fittings, white stretch ceiling with shadow-gap profile and a slim black track light, hidden curtain rail, light oak eco-veneer doors"),
    "prem": ("Премиум", "japandi / modern classic: sandy beige designer wallpaper, one microcement accent wall, rustic oak wide-plank SPC floor, ivory enamel cabinet fronts with walnut veneer, "
             "quartz stone countertop, linen textiles, satin brass fittings and handles, fabric stretch ceiling with recessed light lines and a magnetic track, invisible-frame doors painted like the walls"),
}
SUFFIX = " Photorealistic interior photograph, 24mm lens, soft natural daylight, realistic materials, tidy and finished, no people, no text, no watermark."
KONTEXT_PREFIX = ("Edit this photo of an apartment under renovation. Keep the camera angle and the room geometry exactly. The existing beige marble-look porcelain floor tiles "
                  "and the existing wall tiles must stay exactly as they are — do not replace the tiled floor with wood. Remove construction clutter, tools, bags, bare wires and the person's shoe. "
                  "Turn it into a finished interior: ")
# для image-to-image стиль без упоминания напольного покрытия (пол в этих зонах — уже уложенный керамогранит)
KONTEXT_STYLE = {
    "eco": "walls in plain warm white wallpaper, white flat laminated doors, black matte handles and fittings, white matte stretch ceiling with small GX53 spot lights",
    "std": "walls in greige textured wallpaper, light oak eco-veneer doors, black matte fittings, white stretch ceiling with a shadow-gap profile and a slim black track light",
    "prem": "walls in sandy beige designer wallpaper, invisible-frame doors painted like the walls, satin brass fittings, fabric stretch ceiling with recessed light lines",
}

# (ключ, заголовок, тип, кадр, промпт-шаблон с {style})
VIEWS_DEF = [
    ("entrance", "Вход и прихожая у входа", "kontext", "f_002.jpg",
     "the existing beige marble-look porcelain floor stays; add a finished hallway: entrance door on the left, a tall white built-in wardrobe 190 cm wide with a full-height mirror, a low shoe cabinet, a bench, warm ceiling lights, walls finished in {style}."),
    ("corridor", "Прихожая — проход к спальне и санузлам", "kontext", "f_018.jpg",
     "the marble-look tiled door reveal on the left is the toilet room entrance — add an interior door there; add a matching door to the bedroom further along, clean finished walls and stretch ceiling, {style}."),
    ("wc", "С/у 2.1 м² — унитаз, раковина, люк к колонке", "kontext", "f_010.jpg",
     "the glossy beige onyx marble tiles stay; {wc}; a small 45 cm white washbasin with a slim faucet on the right wall, a hygienic shower next to the toilet, a flush tiled access hatch hiding the gas water heater on the left wall, toilet paper holder, small mirror, warm light. {style}."),
    ("shower", "Душевая 2.8 м² — подиум, стекло, смеситель", "kontext", "f_026.jpg",
     "the marble tiles, the dark wood-look niche with three shelves and the tiled raised shower tray stay; {shower}; a rain shower head on a riser with a hand shower, a white towel rail on the right wall, warm light. {style}."),
    ("bath_vanity", "Душевая — тумба, зеркало, полотенцесушитель", "kontext", "f_020.jpg",
     "the marble tiles stay; add a wall-hung vanity 60 cm with a white basin and a slim faucet, a backlit round mirror above it, an electric towel rail, a small extractor grille, {vanity}. {style}."),
    ("kitchen", "Кухня 11.8 м² — гарнитур 2.9 + 2.4 м", "schnell", None,
     "Kitchen 11.8 m2 in an apartment in Saratov: L-shaped kitchen with a 2.9 m run along the window wall and a 2.4 m run on the right wall, upper cabinets up to the ceiling, "
     "the sink under the window, an induction hob with a slim hood, a tall oven column and a fridge column at the end near the doorway, {kitchen}, {style}."),
    ("kitchen_detail", "Кухня крупно — фасады, столешница, фартук", "schnell", None,
     "Close-up of a kitchen counter: {kitchen}, induction hob, a kettle and a wooden board, backsplash and handles in detail, {style}."),
    ("dining", "Обеденная зона у кухни с ТВ", "schnell", None,
     "Open dining zone of a small apartment next to the kitchen: a 120x80 cm table with four chairs, a 40-inch TV on the wall, pendant lamp above the table, the kitchen visible behind, {style}."),
    ("living", "Зал 12.2 м² — диван и ТВ", "schnell", None,
     "Living room 12.2 m2 (3.3 x 3.7 m) with a window: {sofa} placed along the left wall, {tv} on the opposite wall, a 160x230 rug, a slim shelving unit by the window, a double door 1.4 m wide, {style}."),
    ("living2", "Зал — вид от ТВ к окну", "schnell", None,
     "Living room 12.2 m2 seen from the TV wall: {sofa}, a coffee table, a floor lamp in the corner, a window with {curtains}, {style}."),
    ("bedroom", "Спальня 11.7 м² — кровать 160×200", "schnell", None,
     "Bedroom 11.7 m2: {bed}, two nightstands with wall sconces, a window with {curtains}, {style}."),
    ("bedroom2", "Спальня — шкаф 200 см и выход на лоджию", "schnell", None,
     "Bedroom 11.7 m2 seen from the bed: {wardrobe} on the wall next to the door, a glass door to a small loggia on the left, {style}."),
    ("loggia", "Лоджия 2.7 м² — кабинет", "schnell", None,
     "A narrow insulated loggia 0.9 x 3 m turned into a tiny home office: a 120x50 cm desk along the window, a chair, wall shelves for storage, roller blinds, {style}."),
    ("walls_ceiling", "Стены, потолок и свет — деталь", "schnell", None,
     "Detail of a room corner in an apartment: {walls_detail}, the ceiling and lighting shown clearly, a door, laminate floor and skirting, {style}."),
    ("kids", "Зал как детская — вариант «потом»", "schnell", None,
     "Children's room 12.2 m2 for one child: an extendable single bed 80x190 along the left wall, a 120x60 desk under the window with an adjustable chair, a wardrobe 160 cm and open shelves on the right, {kids}, {style}."),
    ("doors", "Двери и проём 1.4 м в зал", "schnell", None,
     "Hallway of an apartment with a wide 1.4 m double door opening into a bright living room, {doors}, laminate floor, stretch ceiling, {style}."),
]

OPT_DETAILS = {
    "eco": {
        "wc": "a new white floor-standing compact toilet",
        "shower": "a black shower rod with a plain white shower curtain around the tray, a simple chrome-black mixer",
        "vanity": "white laminate vanity, black matte faucet",
        "kitchen": "white flat laminate fronts, grey stone-look laminate countertop, white subway tile backsplash, black matte handles",
        "sofa": "a straight grey hopsack sofa 220 cm", "tv": "a 50-inch TV on a bracket above a white open shelving unit",
        "curtains": "a white roller blind and a light tulle", "bed": "a white laminate bed 160x200 with a low headboard",
        "wardrobe": "a white two-door hinged wardrobe 200 cm wide", "walls_detail": "warm white plain wallpaper, white matte stretch ceiling with GX53 spots, white PVC skirting",
        "kids": "light walls, a white cube shelving unit, colorful bedding", "doors": "white laminated flat doors with black handles",
    },
    "std": {
        "wc": "a new white rimless floor-standing toilet with a soft-close seat",
        "shower": "a fixed 8 mm clear glass walk-in panel with a black matte profile along the tray, a black matte thermostatic shower mixer",
        "vanity": "wall-hung cashmere-beige vanity, black matte faucet",
        "kitchen": "matte cashmere-beige upper fronts to the ceiling and graphite lower fronts, a light stone-look 38 mm countertop with the same material as backsplash, black matte handles, a slim black track light above",
        "sofa": "a mustard velvet corner sofa 220 cm", "tv": "a 55-inch TV above a long beige TV panel with closed storage",
        "curtains": "blackout curtains and tulle on a hidden ceiling rail", "bed": "a bed 160x200 with a soft upholstered headboard and a lift-up base",
        "wardrobe": "a sliding-door wardrobe 240 cm to the ceiling in the wall colour", "walls_detail": "greige textured wallpaper, white stretch ceiling with a shadow-gap profile and a black track light, 80 mm MDF skirting in the wall colour",
        "kids": "sage green painted wall with wooden slats behind the bed, cork board above the desk", "doors": "light oak eco-veneer doors with black handles",
    },
    "prem": {
        "wc": "a white wall-hung toilet on a concealed cistern with a brushed brass flush plate",
        "shower": "a fixed 10 mm clear glass walk-in panel with a satin brass profile along the tray, a brass thermostatic shower system",
        "vanity": "custom walnut vanity, satin brass faucet",
        "kitchen": "ivory enamel upper fronts to the ceiling and walnut veneer lower fronts, a white quartz stone countertop continuing as the backsplash, brass handles, a magnetic track light",
        "sofa": "a modular linen sofa 220 cm", "tv": "a 65-inch OLED TV in a shallow niche with hidden LED backlight above a custom walnut console",
        "curtains": "linen curtains on a hidden ceiling rail", "bed": "a custom bed 160x200 with a full-wall upholstered headboard and floating LED backlight",
        "wardrobe": "a built-in floor-to-ceiling wardrobe with fronts in the wall colour", "walls_detail": "sandy designer wallpaper next to a microcement accent wall, fabric stretch ceiling with recessed light lines and a magnetic track, hidden aluminium skirting",
        "kids": "a magnetic-marker wall, a track light with dimmer, a wool rug", "doors": "invisible-frame doors painted like the walls with brass handles",
    },
}

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
        d = dict(OPT_DETAILS[opt])
        d["style"] = KONTEXT_STYLE[opt] if kind == "kontext" else style
        body = tmpl.format(**d)
        prompt = (KONTEXT_PREFIX + body) if kind == "kontext" else (body + SUFFIX)
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
