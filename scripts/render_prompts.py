"""Промпты визуализаций: стили опций, 16 видов, детали по опциям. Общие для render_views.py (HF Spaces) и render_views_horde.py (AI Horde)."""

STYLE = {
    "eco": ("Эконом", "Scandinavian basic style: warm white plain wallpaper walls, light oak laminate floor, white laminate furniture and white kitchen fronts, "
            "black matte handles and fittings, white matte stretch ceiling with small GX53 spot lights, white laminated flat interior doors, simple black track-free lighting"),
    "std": ("Стандарт", "warm minimalism: greige textured wallpaper walls, natural oak laminate floor with bevels, matte cashmere-beige upper cabinet fronts and graphite lower cabinets, "
            "sage green accent, black matte fittings, white stretch ceiling with shadow-gap profile and a slim black track light, hidden curtain rail, light oak eco-veneer doors"),
    "prem": ("Премиум", "japandi / modern classic: sandy beige designer wallpaper, one microcement accent wall, rustic oak wide-plank SPC floor, ivory enamel cabinet fronts with walnut veneer, "
             "quartz stone countertop, satin brass fittings and handles, fabric stretch ceiling with recessed light lines and a magnetic track, invisible-frame doors painted like the walls"),
}

# стиль без кухонных фасадов — для всех видов, кроме кухни (иначе модель тащит кухонные шкафы в комнаты)
STYLE_ROOM = {
    "eco": "modern Scandinavian basic style, IKEA-like, plain warm white wallpaper walls without pattern, light oak laminate floor, simple white laminate furniture, black matte handles and fittings, "
           "white matte stretch ceiling with small GX53 spot lights, white laminated flat interior doors",
    "std": "warm minimalism: greige textured wallpaper walls, natural oak laminate floor with bevels, sage green accent, black matte fittings, "
           "white stretch ceiling with shadow-gap profile and a slim black track light, hidden curtain rail, light oak eco-veneer doors",
    "prem": "japandi / modern classic: sandy beige designer wallpaper, one microcement accent wall, rustic oak wide-plank SPC floor, walnut veneer furniture, "
            "satin brass fittings and handles, fabric stretch ceiling with recessed light lines and a magnetic track, invisible-frame doors painted like the walls",
}
SUFFIX = " Photorealistic photo, 35 mm lens, soft natural daylight, realistic materials, tidy and finished, empty room, no people, no text, no watermark."
KONTEXT_PREFIX = ("Edit this photo of an apartment under renovation. Keep the camera angle and the room geometry exactly. The existing beige marble-look porcelain floor tiles "
                  "and the existing wall tiles must stay exactly as they are — do not replace the tiled floor with wood. Remove construction clutter, tools, bags, bare wires and the person's shoe. "
                  "Turn it into a finished interior: ")
# для image-to-image стиль без упоминания напольного покрытия (пол в этих зонах — уже уложенный керамогранит)
KONTEXT_STYLE = {
    "eco": "walls in plain warm white wallpaper, white flat laminated doors, black matte handles and fittings, white matte stretch ceiling with small GX53 spot lights",
    "std": "walls in greige textured wallpaper, light oak eco-veneer doors, black matte fittings, white stretch ceiling with a shadow-gap profile and a slim black track light",
    "prem": "walls in sandy beige designer wallpaper, invisible-frame doors painted like the walls, satin brass fittings, fabric stretch ceiling with recessed light lines",
}

# Масштаб: FLUX по умолчанию рисует залы по 30 м² — в каждый промпт зашиты реальные размеры комнаты с плана БТИ, «узко/тесно», проходы 60–70 см,
# камера из дверного проёма, объектив 35 мм (не широкоугольник). Ориентация кадра — PORTRAIT_VIEWS (узкие комнаты в портрете читаются меньше).
SCALE = ("Real photo of a small room in a freshly renovated modern new-build 55 m2 two-room apartment, ceiling 2.7 m; the room is tight, furniture almost touches the walls, "
         "passages are only 60-70 cm wide; shot from the doorway with a 35 mm lens, natural perspective, no wide-angle distortion, not a showroom. ")
PORTRAIT_VIEWS = {"living", "living2", "kids", "loggia", "doors"}

# (ключ, заголовок, тип, кадр, промпт-шаблон с {style}); kontext = виды по видео, общие для опций (промпт — VIDEO_VIEWS)
VIEWS_DEF = [
    ("entrance", "Вход и прихожая у входа", "kontext", "f_002.jpg", ""),
    ("corridor", "Коридор — двери санузлов, проём в зал, спальня в конце", "kontext", "f_018.jpg", ""),
    ("wc", "С/у 2.1 м² — унитаз, раковина, люк к колонке", "kontext", "f_010.jpg", ""),
    ("shower", "Душевая 2.8 м² — подиум, стекло, смеситель", "kontext", "f_026.jpg", ""),
    ("bath_vanity", "Душевая — тумба, зеркало, полотенцесушитель", "kontext", "f_020.jpg", ""),
    ("kitchen", "Кухня 11.8 м² — гарнитур 2.9 + 2.4 м", "schnell", None,
     "Small kitchen only 3.6 m wide and 3.1 m deep, one window on the far wall. An L-shaped kitchen: a 2.9 m run along the window wall with the sink under the window "
     "and an induction hob with a slim hood, and a 2.4 m run along the right wall ending with a tall fridge column closest to the camera; upper cabinets up to the ceiling; "
     "{kitchen}. On the left, a small 120x80 dining table with four chairs squeezed against the left wall, leaving a narrow passage. {style}."),
    ("kitchen_detail", "Кухня крупно — фасады, столешница, фартук", "schnell", None,
     "Close-up of the inner corner of a small L-shaped kitchen counter, only 60 cm deep, upper cabinets up to the ceiling: {kitchen}, induction hob with a slim hood, "
     "a kettle and a wooden board, the backsplash and handles in detail; no island, no peninsula. {style}."),
    ("dining", "Обеденная зона у кухни с ТВ", "schnell", None,
     "Tight dining corner of a small 3.6 x 3.1 m kitchen: a 120x80 table with four chairs pushed against the left wall under a small 40-inch TV, a pendant lamp above the table, "
     "the 2.9 m kitchen counter run right behind the chairs along the window wall, the chairs almost touch the counter; {style}."),
    ("living", "Зал 12.2 м² — диван и ТВ", "schnell", None,
     "Small living room only 2.9 m wide and 4.1 m long, the window on the far short wall. Only one sofa: {sofa} along the entire left wall (it nearly spans the wall), "
     "{tv} on the right wall directly opposite the sofa, only 1.9 m between the sofa and the TV, a small 160x230 rug and a low coffee table squeezed between them, "
     "a narrow 40 cm shelving unit in the far left corner by the window; only one sofa, no armchairs; seen from the wide double-door opening on the near short wall. {style}."),
    ("living2", "Зал — вид от ТВ к окну", "schnell", None,
     "Small living room only 2.9 m wide and 4.1 m long seen from the TV wall: only one sofa, {sofa}, along the left wall almost spanning it, a coffee table on a small rug, "
     "the window with {curtains} on the far wall only 2.9 m wide, a floor lamp in the far corner; only one sofa, no armchairs, no second sofa. {style}."),
    ("bedroom", "Спальня 11.7 м² — кровать 160×200", "schnell", None,
     "Small bedroom only 3.8 m wide and 3.0 m deep seen from the door: {bed} with its headboard against the left wall, two small nightstands with wall sconces, "
     "the bed takes most of the floor, the window with {curtains} on the far wall, a glass balcony door on the right wall; passages around the bed only 70-90 cm. {style}."),
    ("bedroom2", "Спальня — шкаф 200 см и выход на лоджию", "schnell", None,
     "Small bedroom only 3.8 m wide and 3.0 m deep seen from the window side: {bed} with its headboard against the right wall, a 200 cm {wardrobe} on the far wall "
     "next to the room door, a glass balcony door to a narrow loggia on the left wall; only 70 cm between the bed and the wardrobe. {style}."),
    ("loggia", "Лоджия 2.7 м² — кабинет", "schnell", None,
     "Very narrow insulated glazed loggia only 1 m deep and 2.6 m long, seen along its length from the balcony door: a 120x50 desk along the glazing with one chair, "
     "wall shelves at the far end, roller blinds on the glazing, the wall to the bedroom on the right; {style}."),
    ("walls_ceiling", "Стены, потолок и свет — деталь", "schnell", None,
     "Close-up of the corner of a small freshly renovated, completely empty room: bare walls with nothing on them, no furniture, no cabinets, no shelves, no table; "
     "{walls_detail}, an interior door with its casing on one side, laminate floor with skirting, the stretch ceiling and its lighting clearly visible. {style}."),
    ("kids", "Зал как детская — вариант «потом»", "schnell", None,
     "Small children's room only 2.9 m wide and 4.1 m long, window on the far short wall: an extendable single bed 80x190 along the left wall, "
     "a 120x60 desk under the window with an adjustable chair, a 160 cm wardrobe and open shelves along the right wall, {kids}; passages are narrow. {style}."),
    ("doors", "Двери и проём 1.4 м в зал", "schnell", None,
     "Narrow corridor only 1.2 m wide of a small apartment, seen towards a 1.4 m wide double door opening into a small living room, {doors}, "
     "the bedroom door at the end of the corridor, laminate floor and skirting, stretch ceiling; {style}."),
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
        "wardrobe": "a sliding-door wardrobe 230 cm to the ceiling in the wall colour", "walls_detail": "greige textured wallpaper, white stretch ceiling with a shadow-gap profile and a black track light, 80 mm MDF skirting in the wall colour",
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



def build_prompt(opt, key, kind, tmpl):
    """Собрать промпт для опции и вида."""
    d = dict(OPT_DETAILS[opt])
    d["style"] = KONTEXT_STYLE[opt] if kind == "kontext" else (STYLE[opt][1] if key in ("kitchen", "kitchen_detail", "dining") else STYLE_ROOM[opt])
    body = tmpl.format(**d)
    return (KONTEXT_PREFIX + body) if kind == "kontext" else (SCALE + body + SUFFIX)

# Виды по видео (вход, коридор, с/у, душевая, ванная) — на AI Horde рисуются text-to-image ПО ОПИСАНИЮ отделки с кадров:
# чисто описательные фразы (не «отредактируй фото»), комната пустая — иначе FLUX дорисовывает людей и текст.
VIDEO_HALL = {
    "eco": "walls in plain warm white wallpaper, white flat laminated doors with black matte handles, white matte stretch ceiling with small round spot lights",
    "std": "walls in greige textured wallpaper, light oak eco-veneer doors with black matte handles, white stretch ceiling with a shadow-gap profile and a slim black track light",
    "prem": "walls in sandy beige designer wallpaper, invisible-frame doors painted like the walls with satin brass handles, fabric stretch ceiling with recessed light lines",
}
VIDEO_VIEWS = {
    "entrance": "Empty, unoccupied small entrance hall 1.5 m wide and 2.4 m deep of a newly renovated apartment, nobody inside. Floor of beige marble-look porcelain tiles. "
                "The entrance door is on the right wall; along the left wall a tall white built-in wardrobe 190 cm wide with a full-height mirror door, a low shoe cabinet with a small bench next to the door. {hall}. "
                "Ahead the hall opens without any wall into a bright kitchen with a dining table (the partition was removed).",
    "corridor": "Empty, unoccupied narrow corridor 1.2 m wide of a newly renovated apartment, nobody inside, plain smooth walls. "
                "Floor of beige marble-look porcelain tiles. On the left side two doors close to each other, to the shower room and to the toilet room, their reveals lined with the same marble-look tile; "
                "on the right side a wide 1.4 m double-door opening into a bright living room; at the far end the bedroom door. {hall}.",
    "wc": "Empty, unoccupied tiny toilet room 2.1 m2 in a newly renovated apartment, nobody inside. Walls fully clad in glossy beige onyx-look marble tiles, floor in the same tile. "
          "{wc} against the back wall, a small 45 cm white washbasin with a slim {metal} faucet on the right wall, a hygienic hand shower next to the toilet, "
          "a flush tiled access hatch on the left wall, a {metal} toilet paper holder, a small mirror, warm ceiling light, white stretch ceiling.",
    "shower": "Empty, unoccupied small shower room 2.8 m2 in a newly renovated apartment, nobody inside. Walls in glossy beige onyx-look marble tiles, "
              "a raised tiled shower tray in the corner, a dark wood-look niche with three shelves built into the wall next to the shower, {shower}, "
              "a rain shower head on a riser with a hand shower, a white heated towel rail on the right wall, warm light, white stretch ceiling.",
    "bath_vanity": "Empty, unoccupied small shower room in a newly renovated apartment, nobody inside, walls in glossy beige onyx-look marble tiles. "
                   "A wall-hung {vanity} 60 cm wide with a white basin, a backlit round mirror above it, an electric heated towel rail, a small extractor grille, "
                   "the corner of the tiled shower tray visible on the side, warm light, white stretch ceiling.",
}
VIDEO_METAL = {"eco": "black matte", "std": "black matte", "prem": "satin brass", "shared": "black matte"}
# общий набор для всех опций (плитка уже уложена — по указанию заказчика виды по видео одинаковы): нейтральная комплектация
VIDEO_HALL["shared"] = VIDEO_HALL["std"]
SHARED_DETAILS = {"wc": OPT_DETAILS["std"]["wc"], "shower": OPT_DETAILS["std"]["shower"], "vanity": OPT_DETAILS["std"]["vanity"]}
VIDEO_SUFFIX = " Photorealistic interior photograph, 24mm lens, soft warm light, realistic materials, tidy and finished, empty room, no people, no text."


def build_video_prompt(opt, key):
    """Промпт для видов по видео — описание отделки, без ссылки на исходный кадр."""
    d = dict(SHARED_DETAILS if opt == "shared" else OPT_DETAILS[opt])
    d["hall"] = VIDEO_HALL[opt]
    d["metal"] = VIDEO_METAL[opt]
    return VIDEO_VIEWS[key].format(**d) + VIDEO_SUFFIX
