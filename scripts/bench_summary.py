"""Лист «Бенчмарк_итоги»: что получится, если в смете заменить цены на подтверждённые рыночные (Саратов).
Цены в 1_Ремонт / 2_Заезд НЕ меняются — это отдельная витрина для решения заказчика.

Правила подстановки: берём только строки листа «Ссылки_по_позициям» со статусом «ок», числовой ценой и
единицей, совпадающей с единицей позиции; при нескольких подтверждённых ценах на опцию — медиана.
Позиции без подтверждённой цены остаются по смете (это видно в графе «покрытие»).

Запуск: python3 scripts/bench_summary.py <xlsx с листом Ссылки_по_позициям> <куда сохранить (openpyxl)>
Дальше лист переносится в мастер через scripts/xlsx_graft.py.
"""
import re
import statistics
import sys
from datetime import date

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

SRC, OUT = sys.argv[1], sys.argv[2]
BENCH_DIR = sys.argv[3] if len(sys.argv) > 3 else None  # папка с b*_result.json — для проверки единицы цены
SMETA = sys.argv[4] if len(sys.argv) > 4 else SRC  # файл с РАССЧИТАННЫМИ значениями сметы (оригинал, не сохранённый openpyxl)
SHEET = "Бенчмарк_итоги"
OPTS = [("МИН", "Эконом", 5, 6), ("СРЕД", "Стандарт", 7, 8), ("МАКС", "Премиум", 9, 10)]  # (опция, имя, col цена, col сумма) 0-based


def unit_key(s):
    s = (s or "").lower().replace("₽", "").replace("/", " ").strip()
    for k, pat in (("м²", r"м2|м²|кв"), ("п.м", r"п\.?\s?м|пог"), ("шт", r"шт"), ("компл", r"компл|комп")):
        if re.search(pat, s):
            return k
    return s or "?"


# единица цены агента по URL (в листе хранится единица позиции, а не цены)
price_units = {}
if BENCH_DIR:
    import glob
    import json
    for f in glob.glob(f"{BENCH_DIR}/b*_result.json"):
        for rr in json.load(open(f, encoding="utf-8")):
            if isinstance(rr, dict) and rr.get("url"):
                price_units[(rr.get("sheet"), int(rr.get("n") or 0), rr.get("option"), rr["url"])] = rr.get("price_unit") or ""

wb = openpyxl.load_workbook(SRC, data_only=True)
links = wb["Ссылки_по_позициям"]
skipped_units = 0
# подтверждённые цены: (лист, №, опция) → [цены]
conf = {}
for r in links.iter_rows(min_row=6, values_only=True):
    sh, n, _, item, unit, pu, opt, model, price, smeta, dev, store, city, url, evid, dt, status, comment = (list(r) + [None] * 18)[:18]
    if sh not in ("1_Ремонт", "2_Заезд") or not isinstance(n, (int, float)) or opt not in ("МИН", "СРЕД", "МАКС"):
        continue
    if status != "ок" or not isinstance(price, (int, float)):
        continue
    pu = pu or price_units.get((sh, int(n), opt, url))
    if pu and unit_key(pu) and unit_key(unit) and unit_key(pu) != unit_key(unit):
        skipped_units += 1
        continue
    conf.setdefault((sh, int(n), opt), []).append((float(price), model, store, url))
print(f"подтверждённых цен: {sum(len(v) for v in conf.values())}, отброшено из-за единицы: {skipped_units}")

# позиции сметы с кол-вом и ценами — из файла с кэшем формул
wbs = openpyxl.load_workbook(SMETA, data_only=True)
items = []  # dict(sheet, n, section, item, unit, qty, price{opt}, sum{opt})
for sh in ("1_Ремонт", "2_Заезд"):
    ws = wbs[sh]
    for r in ws.iter_rows(min_row=5, values_only=True):
        if isinstance(r[0], (int, float)) and r[2]:
            it = {"sheet": sh, "n": int(r[0]), "section": r[1], "item": r[2], "unit": r[3], "qty": r[4] or 0, "price": {}, "sum": {}}
            for opt, _, pc, sc in OPTS:
                it["price"][opt] = r[pc] or 0
                it["sum"][opt] = r[sc] or 0
            items.append(it)

# резерв
params = {r[0]: r[1] for r in wbs["Параметры"].iter_rows(min_row=4, values_only=True) if r[0]}
reserve = next((v for k, v in params.items() if str(k).startswith("Резерв")), 0.1)

rows = []  # (sheet, section, item, unit, qty, opt, smeta_price, smeta_sum, bench_price, bench_sum, delta, model, store, url, n_conf)
per_section = {}  # (sheet, section, opt) → [smeta_sum, bench_sum, covered, total]
for it in items:
    for opt, _, _, _ in OPTS:
        cands = [c for c in conf.get((it["sheet"], it["n"], opt), [])]
        smeta_p, smeta_s = it["price"][opt], it["sum"][opt]
        key = (it["sheet"], it["section"], opt)
        agg = per_section.setdefault(key, [0.0, 0.0, 0, 0])
        agg[0] += smeta_s
        agg[3] += 1
        if cands and smeta_p:
            price = statistics.median([c[0] for c in cands])
            best = min(cands, key=lambda c: abs(c[0] - price))
            bench_s = price * (it["qty"] or 0)
            agg[1] += bench_s
            agg[2] += 1
            rows.append((it["sheet"], it["section"], it["item"], it["unit"], it["qty"], opt, smeta_p, smeta_s, price, bench_s, bench_s - smeta_s, best[1], best[2], best[3], len(cands)))
        else:
            agg[1] += smeta_s
            rows.append((it["sheet"], it["section"], it["item"], it["unit"], it["qty"], opt, smeta_p, smeta_s, None, smeta_s, 0.0, "— по смете (нет подтверждённой цены)", "", "", 0))

out = openpyxl.load_workbook(SRC)
if SHEET in out.sheetnames:
    del out[SHEET]
ws = out.create_sheet(SHEET)
bold = Font(bold=True)
hdr_fill = PatternFill("solid", fgColor="2F3E46")
hdr_font = Font(bold=True, color="FFFFFF")
up = PatternFill("solid", fgColor="FBE3E3")
down = PatternFill("solid", fgColor="E8F3E8")
wrap = Alignment(wrap_text=True, vertical="top")

ws["A1"] = "БЕНЧМАРК ИТОГИ: СМЕТА ПРОТИВ РЫНКА САРАТОВА (подтверждённые цены с листа «Ссылки_по_позициям»)"
ws["A1"].font = Font(bold=True, size=13)
ws["A2"] = (
    f"Проверка {date.today():%d.%m.%Y}. «По рынку» = смета, в которой цена позиции заменена на медиану цен со статусом «ок» (только страница магазина или прайс-лист, без оговорок, та же единица; "
    "цены из поисковой выдачи и с оговорками сюда не входят); "
    "позиции без подтверждённой цены оставлены по смете — доля таких видна в графе «покрытие». Цены в листах 1_Ремонт / 2_Заезд не менялись; "
    "это витрина для решения, что пересмотреть. Работы и составные позиции сравнивайте с осторожностью: у мастеров разный состав работ."
)
ws["A2"].alignment = wrap
ws.merge_cells("A2:J2")
ws.row_dimensions[2].height = 64

# --- блок 1: итоги по опциям ---
r0 = 4
ws.cell(row=r0, column=1, value="1. ИТОГИ ПО ОПЦИЯМ (без резерва и с резервом)").font = bold
heads = ["Блок", "Опция", "По смете, ₽", "По рынку, ₽", "Разница, ₽", "Разница, %", "Покрытие: позиций с подтверждённой ценой"]
for c, h in enumerate(heads, 1):
    cell = ws.cell(row=r0 + 1, column=c, value=h)
    cell.font, cell.fill, cell.alignment = hdr_font, hdr_fill, wrap
r = r0 + 1
grand = {}
for sh, label in (("1_Ремонт", "Ремонт (материалы + работы)"), ("2_Заезд", "Заезд (закупка + работы)")):
    for opt, name, _, _ in OPTS:
        s = sum(v[0] for k, v in per_section.items() if k[0] == sh and k[2] == opt)
        b = sum(v[1] for k, v in per_section.items() if k[0] == sh and k[2] == opt)
        cov = sum(v[2] for k, v in per_section.items() if k[0] == sh and k[2] == opt)
        tot = sum(v[3] for k, v in per_section.items() if k[0] == sh and k[2] == opt)
        g = grand.setdefault(opt, [0.0, 0.0, 0, 0])
        g[0] += s
        g[1] += b
        g[2] += cov
        g[3] += tot
        r += 1
        vals = [label, name, round(s), round(b), round(b - s), (b - s) / s if s else None, f"{cov} из {tot}"]
        for c, v in enumerate(vals, 1):
            ws.cell(row=r, column=c, value=v)
        ws.cell(row=r, column=6).number_format = "0.0%"
        ws.cell(row=r, column=5).fill = up if b > s else down
for opt, name, _, _ in OPTS:
    s, b, cov, tot = grand[opt]
    for label, mult in (("ИТОГО без резерва", 1), (f"ИТОГО с резервом {round(reserve * 100)} %", 1 + reserve)):
        r += 1
        vals = [label, name, round(s * mult), round(b * mult), round((b - s) * mult), (b - s) / s if s else None, f"{cov} из {tot}" if mult == 1 else ""]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = bold
        ws.cell(row=r, column=6).number_format = "0.0%"
        ws.cell(row=r, column=5).fill = up if b > s else down
for c in (3, 4, 5):
    for rr in range(r0 + 2, r + 1):
        ws.cell(row=rr, column=c).number_format = "#,##0"

# --- блок 2: по разделам ---
r += 2
ws.cell(row=r, column=1, value="2. ПО РАЗДЕЛАМ").font = bold
r += 1
heads = ["Лист", "Раздел", "Опция", "По смете, ₽", "По рынку, ₽", "Разница, ₽", "Разница, %", "Покрытие"]
for c, h in enumerate(heads, 1):
    cell = ws.cell(row=r, column=c, value=h)
    cell.font, cell.fill, cell.alignment = hdr_font, hdr_fill, wrap
for key in sorted(per_section, key=lambda k: (k[0], [i["section"] for i in items].index(k[1]), ["МИН", "СРЕД", "МАКС"].index(k[2]))):
    s, b, cov, tot = per_section[key]
    r += 1
    vals = [key[0], key[1], key[2], round(s), round(b), round(b - s), (b - s) / s if s else None, f"{cov}/{tot}"]
    for c, v in enumerate(vals, 1):
        ws.cell(row=r, column=c, value=v)
    for c in (4, 5, 6):
        ws.cell(row=r, column=c).number_format = "#,##0"
    ws.cell(row=r, column=7).number_format = "0.0%"
    if abs(b - s) > 0.3 * s and s:
        ws.cell(row=r, column=6).fill = up if b > s else down

# --- блок 3: позиции ---
r += 2
ws.cell(row=r, column=1, value="3. ПО ПОЗИЦИЯМ (все строки; сортировка по абсолютной разнице)").font = bold
r += 1
heads = ["Лист", "Раздел", "Позиция", "Ед.", "Кол-во", "Опция", "Цена по смете", "Сумма по смете", "Цена по рынку", "Сумма по рынку", "Разница, ₽", "Модель (подтверждённая)", "Магазин", "Ссылка", "Подтв. цен"]
for c, h in enumerate(heads, 1):
    cell = ws.cell(row=r, column=c, value=h)
    cell.font, cell.fill, cell.alignment = hdr_font, hdr_fill, wrap
hdr_row = r
for row in sorted(rows, key=lambda x: -abs(x[10])):
    r += 1
    for c, v in enumerate(row, 1):
        cell = ws.cell(row=r, column=c, value=v)
        cell.alignment = wrap
    if row[13]:
        ws.cell(row=r, column=14).hyperlink = row[13]
        ws.cell(row=r, column=14).font = Font(color="1F5F8B", underline="single")
    for c in (7, 8, 9, 10, 11):
        ws.cell(row=r, column=c).number_format = "#,##0"
    if row[8] is not None and row[7]:
        ws.cell(row=r, column=11).fill = up if row[10] > 0 else down
ws.auto_filter.ref = f"A{hdr_row}:O{r}"
for i, w in enumerate([12, 24, 36, 7, 8, 8, 13, 14, 13, 14, 13, 40, 22, 30, 9], 1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "A4"
out.save(OUT)

# консольная сводка
for opt, name, _, _ in OPTS:
    s, b, cov, tot = grand[opt]
    if not s:
        sys.exit("❌ суммы сметы пустые — передайте 4-м аргументом оригинальный xlsx с рассчитанными формулами")
    print(f"{name:9s} смета {round(s * (1 + reserve)):>10,} → по рынку {round(b * (1 + reserve)):>10,} ₽ с резервом ({(b - s) / s:+.1%}), покрытие {cov}/{tot}")
print(f"✅ лист «{SHEET}» → {OUT}")
