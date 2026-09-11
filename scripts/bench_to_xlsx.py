"""Собирает результаты бенчмарка цен по Саратову (JSON от агентов) в отдельную вкладку сметы
«Ссылки_по_позициям»: на каждую позицию 1_Ремонт и 2_Заезд — три строки (МИН/СРЕД/МАКС) с моделью,
найденной ценой, ценой из сметы, отклонением, магазином и ссылкой. Цены в самой смете НЕ меняются.

Запуск: python3 scripts/bench_to_xlsx.py <папка с b*_result.json> <путь к xlsx> [<копия xlsx>]
"""
import glob
import json
import sys
from datetime import date

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

BENCH_DIR, XLSX = sys.argv[1], sys.argv[2]
COPY = sys.argv[3] if len(sys.argv) > 3 else None
SHEET = "Ссылки_по_позициям"
OPT_ORDER = {"МИН": 0, "СРЕД": 1, "МАКС": 2}

from urllib.parse import quote

def is_avito(r):
    return "avito" in (r.get("url") or "").lower() or "Авито" in (r.get("store") or "")

rows = []
for f in sorted(glob.glob(f"{BENCH_DIR}/b*_result.json")):
    try:
        data = json.load(open(f, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"⚠️  {f}: {e}")
        continue
    for r in data:
        if not isinstance(r, dict) or not r.get("item"):
            continue
        if is_avito(r):
            continue  # строки Авито от агентов без цен — заменяем единообразными ссылками на поиск ниже
        rows.append(r)
print(f"строк из бенчмарка (без Авито): {len(rows)}")

# Авито Саратов: по одной строке-ссылке на поиск для КАЖДОЙ позиции (автоматическая проверка цен на Авито недоступна — блокировка по IP)
import re as _re
seen = set()
for f in sorted(glob.glob(f"{BENCH_DIR}/b[0-9]_*.json")):
    if f.endswith("_result.json"):
        continue
    for it in json.load(open(f, encoding="utf-8")):
        key = (it["sheet"], it["n"])
        if key in seen:
            continue
        seen.add(key)
        name = _re.sub(r"\s*\([^)]*\)", "", it["item"]).split(":")[0].strip()
        works = it["section"].startswith("7.") or it["section"] == "Работы"
        q = quote(f"{name}" if not works else f"{name} Саратов")
        url = f"https://www.avito.ru/saratov/predlozheniya_uslug?q={q}" if works else f"https://www.avito.ru/saratov?q={q}"
        rows.append({
            "sheet": it["sheet"], "n": it["n"], "item": it["item"], "option": "ВСЕ",
            "model": f"Авито Саратов — поиск «{name}»" + (" (услуги мастеров)" if works else " (новые товары магазинов и объявления)"),
            "price": None, "price_unit": it.get("unit"), "smeta_price": None, "deviation_pct": None,
            "store": "Авито Саратов", "city": "Саратов", "url": url, "evidence": "не проверено",
            "checked_at": f"{date.today():%Y-%m-%d}", "status": "уточнить",
            "comment": "Через Авито можно посмотреть предложения по Саратову и оптимизировать стоимость: откройте поиск по ссылке, сравните с ценой в смете и с вариантами магазинов выше. Автоматически цены с Авито снять нельзя (доступ по IP ограничен) — смотреть вручную.",
        })
print(f"добавлено ссылок Авито: {len(seen)}; всего строк: {len(rows)}")

def num(v):
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        s = v.replace(" ", "").replace(" ", "").replace("\xa0", "").replace("₽", "").replace(",", ".")
        try:
            return float(s)
        except ValueError:
            return None
    return None

OPT_ORDER["ВСЕ"] = 3
rows.sort(key=lambda r: (0 if r.get("sheet") == "1_Ремонт" else 1, int(num(r.get("n")) or 0), OPT_ORDER.get(r.get("option", ""), 9)))

wb = openpyxl.load_workbook(XLSX)
if SHEET in wb.sheetnames:
    del wb[SHEET]
ws = wb.create_sheet(SHEET)

ok = sum(1 for r in rows if r.get("status") == "ок")
todo = len(rows) - ok
ws["A1"] = "ССЫЛКИ И БЕНЧМАРК ЦЕН ПО САРАТОВУ — НА КАЖДУЮ ПОЗИЦИЮ СМЕТЫ (МИН / СРЕД / МАКС)"
ws["A1"].font = Font(bold=True, size=13)
ws["A2"] = (
    f"Проверка {date.today():%d.%m.%Y}: цены и ссылки собраны из каталогов магазинов Саратова и площадок с доставкой в Саратов. "
    "«Цена найдена» — то, что реально показано на странице/в поисковой выдаче на дату проверки; «Цена в смете» — из листов 1_Ремонт / 2_Заезд (не менялась). "
    "Отклонение > ±30 % выделено. Статус «уточнить» = подтверждённой цены нет, дана ссылка в каталог. Перед оплатой сверяйте цену на сайте. "
    "АВИТО: на каждую позицию есть строка «Авито Саратов» (опция ВСЕ) с готовым поиском — через Авито можно посмотреть предложения магазинов и частников по Саратову "
    "и оптимизировать стоимость относительно сметы; цены с Авито снимаются вручную (автоматическая проверка недоступна)."
)
ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
ws.merge_cells("A2:Q2")
ws.row_dimensions[2].height = 78
ws["A3"] = f"Строк: {len(rows)} · подтверждено: {ok} · уточнить: {todo} (в т. ч. {sum(1 for r in rows if r.get('option') == 'ВСЕ')} ссылок на поиск Авито Саратов — цены снимать вручную)"
ws["A3"].font = Font(italic=True, color="555555")

headers = ["Лист", "№", "Раздел", "Позиция", "Ед.", "Опция", "Модель / вариант", "Цена найдена, ₽", "Цена в смете, ₽",
           "Отклонение, %", "Магазин / источник", "Город", "Ссылка", "Подтверждение", "Дата проверки", "Статус", "Комментарий"]
HR = 5
for c, h in enumerate(headers, 1):
    cell = ws.cell(row=HR, column=c, value=h)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="2F3E46")
    cell.alignment = Alignment(wrap_text=True, vertical="center")
ws.row_dimensions[HR].height = 30

fill_ok = PatternFill("solid", fgColor="E8F3E8")
fill_todo = PatternFill("solid", fgColor="FFF4D6")
fill_dev = PatternFill("solid", fgColor="FBE3E3")
link_font = Font(color="1F5F8B", underline="single")

# раздел из сметы — подтянуть по листу и номеру
sections = {}
for sh in ("1_Ремонт", "2_Заезд"):
    if sh in wb.sheetnames:
        for r in wb[sh].iter_rows(min_row=5, values_only=True):
            if isinstance(r[0], (int, float)) and r[2]:
                sections[(sh, int(r[0]))] = (r[1], r[3])

r_i = HR
for r in rows:
    r_i += 1
    sh, n = r.get("sheet", ""), int(num(r.get("n")) or 0)
    sec, unit = sections.get((sh, n), ("", ""))
    price = num(r.get("price"))
    smeta = num(r.get("smeta_price"))
    dev = num(r.get("deviation_pct"))
    if dev is None and price is not None and smeta:
        dev = round((price - smeta) / smeta * 100, 1)
    status = r.get("status") or ("ок" if price is not None else "уточнить")
    vals = [sh, n, sec, r.get("item"), unit, r.get("option"), r.get("model"), price, smeta, dev, r.get("store"), r.get("city"),
            r.get("url"), r.get("evidence"), r.get("checked_at") or f"{date.today():%Y-%m-%d}", status, r.get("comment")]
    for c, v in enumerate(vals, 1):
        cell = ws.cell(row=r_i, column=c, value=v)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    url = r.get("url") or ""
    if url.startswith("http"):
        lc = ws.cell(row=r_i, column=13)
        lc.hyperlink = url
        lc.font = link_font
    for c in (8, 9):
        ws.cell(row=r_i, column=c).number_format = "#,##0"
    ws.cell(row=r_i, column=10).number_format = "0.0"
    fill = fill_ok if status == "ок" else fill_todo
    ws.cell(row=r_i, column=16).fill = fill
    if dev is not None and abs(dev) > 30:
        ws.cell(row=r_i, column=10).fill = fill_dev

widths = [10, 5, 14, 34, 7, 8, 40, 13, 13, 11, 24, 16, 40, 13, 12, 10, 40]
for i, w in enumerate(widths, 1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = ws.cell(row=HR + 1, column=5)
ws.auto_filter.ref = f"A{HR}:{get_column_letter(len(headers))}{r_i}"

wb.save(XLSX)
print(f"✅ {XLSX}: лист «{SHEET}», {len(rows)} строк (ок {ok}, уточнить {todo})")
if COPY:
    import shutil
    shutil.copy2(XLSX, COPY)
    print(f"   копия → {COPY}")
