"""Графт листов, построенных openpyxl, в ИСХОДНЫЙ xlsx без потери кэша формул, диаграмм и calcChain.

Зачем: openpyxl.save() пишет формулы без рассчитанных значений — SheetJS / data_only видят пустые ячейки,
а мастер-файл заказчика теряет цифры до пересчёта в Excel. Поэтому новые листы собираются openpyxl в копии,
а в оригинальный пакет копируются только их worksheet-XML, rels и styles.xml (openpyxl сохраняет порядок
существующих стилей и дописывает новые в конец, поэтому индексы старых листов остаются валидными).

Запуск: python3 scripts/xlsx_graft.py <оригинал.xlsx> <сохранённый_openpyxl.xlsx> <результат.xlsx> "Лист1" ["Лист2" ...]
"""
import os
import re
import shutil
import sys
import tempfile
import zipfile
from xml.sax.saxutils import escape

orig, saved, out, *names = sys.argv[1:]
if not names:
    sys.exit("укажите имена листов для переноса")

tmp = tempfile.mkdtemp()
O, N, G = (os.path.join(tmp, d) for d in ("orig", "new", "graft"))
for src, dst in ((orig, O), (saved, N)):
    with zipfile.ZipFile(src) as z:
        z.extractall(dst)
shutil.copytree(O, G)


def read(p):
    return open(p, encoding="utf-8").read()


def write(p, s):
    open(p, "w", encoding="utf-8").write(s)


def sheet_file(root, name):
    """workbook.xml → r:id → rels → путь к листу."""
    wb = read(f"{root}/xl/workbook.xml")
    m = re.search(r'<sheet [^>]*name="%s"[^>]*r:id="([^"]+)"' % re.escape(escape(name, {'"': "&quot;"})), wb)
    if not m:
        return None
    rid = m.group(1)
    rels = read(f"{root}/xl/_rels/workbook.xml.rels")
    t = re.search(r'<Relationship [^>]*Id="%s"[^>]*Target="([^"]+)"' % rid, rels) or re.search(
        r'<Relationship [^>]*Target="([^"]+)"[^>]*Id="%s"' % rid, rels
    )
    target = t.group(1).lstrip("/")
    return target if target.startswith("xl/") else "xl/" + target


wb = read(f"{G}/xl/workbook.xml")
rels = read(f"{G}/xl/_rels/workbook.xml.rels")
ct = read(f"{G}/[Content_Types].xml")
existing = [int(x) for x in re.findall(r"worksheets/sheet(\d+)\.xml", rels)]
next_no = max(existing) + 1
sheet_ids = [int(x) for x in re.findall(r'sheetId="(\d+)"', wb)]
next_sid = max(sheet_ids) + 1
used_ids = set(re.findall(r'Id="([^"]+)"', rels))

shutil.copy(f"{N}/xl/styles.xml", f"{G}/xl/styles.xml")

for name in names:
    src = sheet_file(N, name)
    if not src:
        sys.exit(f"в сохранённом файле нет листа «{name}»")
    if sheet_file(O, name):
        sys.exit(f"в оригинале уже есть лист «{name}» — удалите его или переименуйте новый")
    dst_rel = f"xl/worksheets/sheet{next_no}.xml"
    shutil.copy(f"{N}/{src}", f"{G}/{dst_rel}")
    src_rels = f"{N}/xl/worksheets/_rels/{os.path.basename(src)}.rels"
    if os.path.exists(src_rels):
        os.makedirs(f"{G}/xl/worksheets/_rels", exist_ok=True)
        shutil.copy(src_rels, f"{G}/xl/worksheets/_rels/sheet{next_no}.xml.rels")
    rid = f"rIdGraft{next_no}"
    while rid in used_ids:
        rid += "x"
    used_ids.add(rid)
    wb = wb.replace("</sheets>", f'<sheet name="{escape(name, {chr(34): "&quot;"})}" sheetId="{next_sid}" r:id="{rid}"/></sheets>')
    rels = rels.replace(
        "</Relationships>",
        f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{next_no}.xml"/></Relationships>',
    )
    ct = ct.replace(
        "</Types>",
        f'<Override PartName="/{dst_rel}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    )
    print(f"+ «{name}» → {dst_rel}")
    next_no += 1
    next_sid += 1

write(f"{G}/xl/workbook.xml", wb)
write(f"{G}/xl/_rels/workbook.xml.rels", rels)
write(f"{G}/[Content_Types].xml", ct)

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(f"{G}/[Content_Types].xml", "[Content_Types].xml")
    for root, _, files in os.walk(G):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, G)
            if arc != "[Content_Types].xml":
                z.write(full, arc)
shutil.rmtree(tmp, ignore_errors=True)
print(f"✅ {out}")
