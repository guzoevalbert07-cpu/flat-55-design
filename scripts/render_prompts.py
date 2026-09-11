"""Промпты визуализаций: стили опций, 16 видов, детали по опциям. Общие для render_views.py (HF Spaces) и render_views_horde.py (AI Horde)."""

STYLE = {
    "eco": ("Эконом", "Scandinavian basic style: warm white plain wallpaper walls, light oak laminate floor, white laminate furniture and white kitchen fronts, "
            "black matte handles and fittings, white matte stretch ceiling with small GX53 spot lights, white laminated flat interior doors, simple black track-free lighting"),
    "std": ("Стандарт", "warm minimalism: greige textured wallpaper walls, natural oak laminate floor with bevels, matte cashmere-beige upper cabinet fronts and graphite lower cabinets, "
            "sage green accent, black matte fittings, white stretch ceiling with shadow-gap profile and a slim black track light, hidden curtain rail, light oak eco-veneer doors"),
    "prem": ("Премиум", "japandi / modern classic: sandy beige designer wallpaper, one microcement accent wall, rustic oak wide-plank SPC floor, ivory enamel cabinet fronts with walnut veneer, "
             "quartz stone countertop, satin brass fittings and handles, fabric stretch ceiling with recessed light lines and a magnetic track, invisible-frame doors painted like the walls"),
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
     "Empty freshly renovated room in an apartment: {walls_detail}, a door, laminate floor and skirting, the ceiling and its lighting clearly visible, {style}."),
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



def build_prompt(opt, key, kind, tmpl):
    """Собрать промпт для опции и вида."""
    d = dict(OPT_DETAILS[opt])
    d["style"] = KONTEXT_STYLE[opt] if kind == "kontext" else STYLE[opt][1]
    body = tmpl.format(**d)
    return (KONTEXT_PREFIX + body) if kind == "kontext" else (body + SUFFIX)
