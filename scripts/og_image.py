"""og:image 1200×630 — снимок опции Стандарт с собранного сайта (вместо отсутствующего PNG-борда).
Требует: собранный dist + запущенный `npm run preview` (127.0.0.1:4173) + python playwright.
Запуск: npm run og
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173/flat-55-design/#std"
OUT = ROOT / "public" / "og.png"

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    page.goto(URL, wait_until="networkidle")
    page.add_style_tag(content="""
      .switch{display:none!important}
      body{overflow:hidden}
      .hero{padding:26px 0 18px}
      .hero .sub{display:none}
      #concept .lead, #concept .kicker{display:none}
      #concept{padding-top:4px}
      #concept h2{font-size:1.4rem;margin:0 0 6px}
      #concept .card:last-child{display:none}
    """)
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
    b.close()
print(f"✅ {OUT}")
