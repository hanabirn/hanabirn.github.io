"""Static pages for search engines (2026-11-13, site review item 5): one page per grammar point, a page per level
and one for all levels, under learn/grammar/, plus sitemap.xml. The site itself is one page with no URL state, so
Google could not see the 1,170 points; each page here holds the point's text (pattern, form, explanation, notes,
common mistakes, examples with readings and translations — Traditional Chinese with the English) and a button
into the site at that point (/?g=<level>/<point>, js/learnlang.js learnOpenFromUrl).
Built from data/grammar (run after build_grammar.py):  python tools/build_learn_pages.py
learn/ is a published folder (.github/workflows/pages.yml copies it)."""
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://hanabirn.xyz'
OUT = ROOT / 'learn' / 'grammar'
LANG_ZH = {'ja': '日文', 'ko': '韓文', 'en': '英文', 'zh': '中文', 'fr': '法文', 'ru': '俄文', 'es': '西班牙文', 'de': '德文'}
LANG_EN = {'ja': 'Japanese', 'ko': 'Korean', 'en': 'English', 'zh': 'Chinese', 'fr': 'French', 'ru': 'Russian', 'es': 'Spanish', 'de': 'German'}
HTML_LANG = {'ja': 'ja', 'ko': 'ko', 'en': 'en', 'zh': 'zh-Hant', 'fr': 'fr', 'ru': 'ru', 'es': 'es', 'de': 'de'}


def level_zh(level):
    if level.endswith('급'):
        return level[:-1] + ' 級'
    return {'JH': '國中', 'SH': '高中'}.get(level, level)


def level_en(level):
    if level.endswith('급'):
        return 'Level ' + level[:-1]
    return {'JH': 'junior high', 'SH': 'senior high'}.get(level, level)


def e(s):
    return html.escape(s or '', quote=True)


def zh(x):
    return x.get('zh', '') if isinstance(x, dict) else (x or '')


def en(x):
    return x.get('en', '') if isinstance(x, dict) else ''


CSS = """:root{--paper:#f6f1e7;--surface:#fbf8f2;--ink:#2b2724;--muted:#6b625a;--line:#e4dccb;--primary:#c8442f}
@media (prefers-color-scheme:dark){:root{--paper:#1e1b18;--surface:#272320;--ink:#efe7d8;--muted:#b3a99b;--line:#3a342d;--primary:#e0654e}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.75 "Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 16px 48px}a{color:var(--primary)}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:860px;margin:0 auto;padding:14px 16px;border-bottom:2px solid var(--primary)}
header a.brand{font:900 1.3rem/1.2 "Noto Serif TC",serif;color:var(--ink);text-decoration:none}
.crumbs{font-size:.85rem;color:var(--muted);margin-bottom:8px}.card{background:var(--surface);border:1px solid var(--line);border-top:4px solid var(--primary);border-radius:14px;padding:20px 22px;margin:14px 0}
h1{font:700 1.7rem/1.4 "Noto Serif TC",serif;margin:0}.sub{font-size:1.1rem;margin:4px 0 0}.en{color:var(--muted);font-size:.92rem}
h2{font:700 1.05rem/1.4 "Noto Serif TC",serif;border-left:4px solid var(--primary);padding-left:8px;margin:20px 0 8px}
.form{background:var(--paper);border-radius:10px;padding:8px 12px}ul{padding-left:1.2em}li{margin:4px 0}
.ex{border-bottom:1px dashed var(--line);padding:8px 0}.ex:last-child{border-bottom:0}.ex .t{font-size:1.1rem;font-weight:600}.ex .r{color:var(--muted);font-size:.9rem}
.wrong{text-decoration:line-through;color:var(--muted)}.right{font-weight:600}
.cta{display:inline-block;margin:6px 0;padding:12px 22px;border-radius:12px;background:var(--primary);color:#fff;font-weight:700;text-decoration:none;box-shadow:0 4px 0 #8f2c1d}
.nav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.92rem}.list a{display:block;padding:6px 0;border-bottom:1px dashed var(--line);text-decoration:none;color:var(--ink)}
.list a b{color:var(--primary)}footer{text-align:center;color:var(--muted);font-size:.8rem;margin-top:30px}"""


def page(title, desc, canonical, body, lang='zh-Hant'):
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/icons/web-app-manifest-512x512.png">
<link rel="icon" href="/icons/web-app-manifest-192x192.png">
<style>{CSS}</style>
</head>
<body>
<header><a class="brand" href="/">Hanabiの小天地</a><a href="/learn/grammar/">文法總覽</a></header>
<main>
{body}
<footer>說明與例句都是 Hanabiの小天地自己寫的 · <a href="/">hanabirn.xyz</a></footer>
</main>
</body>
</html>
"""


def example_html(lang, x):
    if lang == 'ja':
        text, reading = x.get('ja', ''), x.get('kana', '')
    else:
        text, reading = x.get('text', ''), x.get('reading', '')
    lines = [f'<div class="t" lang="{HTML_LANG[lang]}">{e(text)}</div>']
    if reading and reading != text:
        lines.append(f'<div class="r" lang="{HTML_LANG[lang]}">{e(reading)}</div>')
    if lang != 'zh' and zh(x):
        lines.append(f'<div>{e(zh(x))}</div>')
    if lang != 'en' and en(x):
        lines.append(f'<div class="en">{e(en(x))}</div>')
    return '<div class="ex">' + ''.join(lines) + '</div>'


def point_page(level, point, prev, nxt):
    lang = level['lang']
    lv_zh, lv_en = level_zh(level['level']), level_en(level['level'])
    url = f"{SITE}/learn/grammar/{level['id']}/{point['id']}.html"
    title = f"{point['pattern']}：{zh(point['title'])}｜{LANG_ZH[lang]} {lv_zh} 文法｜Hanabiの小天地"
    desc = (zh(point.get('explain')) or zh(point['title']))[:150]
    parts = [f'<div class="crumbs"><a href="/learn/grammar/">文法</a> › <a href="/learn/grammar/{level["id"]}/">{e(LANG_ZH[lang])} {e(lv_zh)}</a></div>',
             '<article class="card">',
             f'<h1 lang="{HTML_LANG[lang]}">{e(point["pattern"])}</h1>',
             f'<p class="sub">{e(zh(point["title"]))}</p><p class="en">{e(en(point["title"]))} — {e(LANG_EN[lang])} grammar, {e(lv_en)}</p>']
    if point.get('form'):
        parts.append(f'<h2>接續</h2><div class="form">{e(zh(point["form"]))}<div class="en">{e(en(point["form"]))}</div></div>')
    if point.get('explain'):
        parts.append(f'<h2>說明</h2><p>{e(zh(point["explain"]))}</p><p class="en">{e(en(point["explain"]))}</p>')
    if point.get('notes'):
        parts.append('<h2>注意事項</h2><ul>' + ''.join(f'<li>{e(zh(n))}<div class="en">{e(en(n))}</div></li>' for n in point['notes']) + '</ul>')
    if point.get('mistakes'):
        parts.append('<h2>常見錯誤</h2><ul>' + ''.join(
            f'<li><span class="wrong" lang="{HTML_LANG[lang]}">✗ {e(m.get("wrong"))}</span><br><span class="right" lang="{HTML_LANG[lang]}">✓ {e(m.get("right"))}</span><br>{e(zh(m))}<div class="en">{e(en(m))}</div></li>'
            for m in point['mistakes']) + '</ul>')
    if point.get('examples'):
        parts.append('<h2>例句</h2>' + ''.join(example_html(lang, x) for x in point['examples']))
    n = len(point.get('quiz') or [])
    parts.append(f'<h2>練習</h2><p>在 Hanabiの小天地 聽例句的錄音、做 {n} 題練習，答對 2/3 就算學會，進度會記下來。</p>'
                 f'<a class="cta" href="/?g={level["id"]}/{point["id"]}">到網站練習這個文法 →</a>')
    parts.append('</article>')
    nav = '<div class="nav">'
    nav += f'<a href="{prev["id"]}.html">← {e(prev["pattern"])}</a>' if prev else '<span></span>'
    nav += f'<a href="{nxt["id"]}.html">{e(nxt["pattern"])} →</a>' if nxt else '<span></span>'
    parts.append(nav + '</div>')
    return url, page(title, desc, url, '\n'.join(parts))


def level_page(level, points):
    lang = level['lang']
    lv_zh = level_zh(level['level'])
    url = f"{SITE}/learn/grammar/{level['id']}/"
    title = f"{LANG_ZH[lang]} {lv_zh} 文法 {len(points)} 個重點｜Hanabiの小天地"
    desc = f"{LANG_ZH[lang]} {lv_zh} 的 {len(points)} 個文法重點：接續、說明、常見錯誤和例句，每個都能到網站練習。" + '、'.join(p['pattern'] for p in points[:6])
    items = ''.join(f'<a href="{p["id"]}.html"><b lang="{HTML_LANG[lang]}">{e(p["pattern"])}</b>　{e(zh(p["title"]))}</a>' for p in points)
    body = (f'<div class="crumbs"><a href="/learn/grammar/">文法</a> › {e(LANG_ZH[lang])} {e(lv_zh)}</div>'
            f'<section class="card"><h1>{e(LANG_ZH[lang])} {e(lv_zh)} 文法</h1>'
            f'<p class="en">{e(LANG_EN[lang])} grammar, {e(level_en(level["level"]))} — {len(points)} points</p>'
            f'<div class="list">{items}</div></section>')
    return url, page(title, desc, url, body)


def main():
    index = json.loads((ROOT / 'data' / 'grammar' / 'index.json').read_text(encoding='utf-8'))
    if OUT.exists():
        shutil.rmtree(OUT)
    urls = []
    all_rows = []
    for level in index:
        data = json.loads((ROOT / 'data' / 'grammar' / f"{level['id']}.json").read_text(encoding='utf-8'))
        pts = data['points']
        d = OUT / level['id']
        d.mkdir(parents=True, exist_ok=True)
        for i, pt in enumerate(pts):
            url, text = point_page(level, pt, pts[i - 1] if i else None, pts[i + 1] if i + 1 < len(pts) else None)
            (d / f"{pt['id']}.html").write_text(text, encoding='utf-8')
            urls.append(url)
        url, text = level_page(level, pts)
        (d / 'index.html').write_text(text, encoding='utf-8')
        urls.append(url)
        all_rows.append((level, len(pts)))
    # all levels
    by_lang = {}
    for level, n in all_rows:
        by_lang.setdefault(level['lang'], []).append((level, n))
    body = '<section class="card"><h1>文法總覽</h1><p>8 種語言、各級別的文法重點，全部是 Hanabiの小天地自己寫的說明和例句。</p>'
    for lang, rows in by_lang.items():
        body += f'<h2>{e(LANG_ZH[lang])}</h2><div class="list">' + ''.join(
            f'<a href="{lv["id"]}/"><b>{e(level_zh(lv["level"]))}</b>　{n} 個重點</a>' for lv, n in rows) + '</div>'
    body += '</section>'
    (OUT / 'index.html').write_text(page('文法總覽：日文、韓文、中文、英文、法文、俄文、西班牙文、德文｜Hanabiの小天地',
                                         '8 種語言、各級別的文法重點：接續、說明、常見錯誤和例句，每個都能到網站練習。',
                                         f'{SITE}/learn/grammar/', body), encoding='utf-8')
    urls.insert(0, f'{SITE}/learn/grammar/')
    # sitemap: the site, the privacy page, then the grammar pages
    rows = [(f'{SITE}/', 'weekly', '1.0'), (f'{SITE}/privacy.html', 'monthly', '0.3')] + [(u, 'monthly', '0.6') for u in urls]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'    <url>\n        <loc>{u}</loc>\n        <changefreq>{f}</changefreq>\n        <priority>{p}</priority>\n    </url>\n' for u, f, p in rows) + '</urlset>\n'
    (ROOT / 'sitemap.xml').write_text(xml, encoding='utf-8')
    print(len(urls), 'pages; sitemap', len(rows), 'urls')


if __name__ == '__main__':
    main()
