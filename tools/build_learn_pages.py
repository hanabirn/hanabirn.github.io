"""Static pages for search engines (2026-11-13, site review item 5): one page per grammar point, a page per level
and one for all levels, under learn/grammar/, plus sitemap.xml. Since 2026-11-14 also learn/reading/ (one page per
passage: the text with its reading, paragraph translations and glossary, no questions or answers) and learn/listening/
(one page per practice round, not the mock exams: what each item is about, the transcript folded under <details>),
and the hub learn/index.html; buttons open /?r=<level>/<passage> and /?l=<level>/<round>. The site itself is one page with no URL state, so
Google could not see the 1,170 points; each page here holds the point's text (pattern, form, explanation, notes,
common mistakes, examples with readings and translations — Traditional Chinese with the English) and a button
into the site at that point (/?g=<level>/<point>, js/learnlang.js learnOpenFromUrl).
Built from data/grammar, data/reading and data/listening (run after build_grammar / build_reading / build_listening):  python tools/build_learn_pages.py
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
main{max-width:1180px;margin:0 auto;padding:20px 16px 48px}a{color:var(--primary)}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:1180px;margin:0 auto;padding:14px 16px;border-bottom:2px solid var(--primary)}
header a.brand{font:900 1.3rem/1.2 "Noto Serif TC",serif;color:var(--ink);text-decoration:none}
.crumbs{font-size:.85rem;color:var(--muted);margin-bottom:8px}.card{background:var(--surface);border:1px solid var(--line);border-top:4px solid var(--primary);border-radius:14px;padding:20px 22px;margin:14px 0}
h1{font:700 1.7rem/1.4 "Noto Serif TC",serif;margin:0}.sub{font-size:1.1rem;margin:4px 0 0}.en{color:var(--muted);font-size:.92rem}
h2{font:700 1.05rem/1.4 "Noto Serif TC",serif;border-left:4px solid var(--primary);padding-left:8px;margin:20px 0 8px}
.form{background:var(--paper);border-radius:10px;padding:8px 12px}ul{padding-left:1.2em}li{margin:4px 0}
.ex{border-bottom:1px dashed var(--line);padding:8px 0}.ex:last-child{border-bottom:0}.ex .t{font-size:1.1rem;font-weight:600}.ex .r{color:var(--muted);font-size:.9rem}
.wrong{text-decoration:line-through;color:var(--muted)}.right{font-weight:600}
.cta{display:inline-block;margin:6px 0;padding:12px 22px;border-radius:12px;background:var(--primary);color:#fff;font-weight:700;text-decoration:none;box-shadow:0 4px 0 #8f2c1d}
.nav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.92rem}.list a{display:block;padding:6px 0;border-bottom:1px dashed var(--line);text-decoration:none;color:var(--ink)}
.list a b{color:var(--primary)}nav.top{display:flex;gap:14px;font-weight:600}nav.top a{text-decoration:none}
.para{margin:0 0 14px}.para .tl{color:var(--muted);font-size:.93rem;margin-top:2px}.para .rd{color:var(--muted);font-size:.85rem}
.gl{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 16px}.gl div{border-bottom:1px dashed var(--line);padding:4px 0}
details{margin:6px 0}summary{cursor:pointer;font-weight:600;color:var(--primary)}.ln{padding:4px 0}.ln .who{display:inline-block;min-width:3.2em;color:var(--muted);font-size:.85rem}
.item{border-bottom:1px dashed var(--line);padding:10px 0}.item:last-child{border-bottom:0}
.main-col{max-width:860px;margin:0 auto}.side .cta{display:block;text-align:center;margin:0}.side .nav{flex-direction:column;gap:6px;margin-top:12px}
.side h2{margin-top:16px}.side p{margin:0 0 10px;font-size:.92rem}.side .gl{grid-template-columns:1fr}
.langs{columns:4 230px;column-gap:16px}.lang{break-inside:avoid;padding-bottom:6px}.lang h2{margin-top:10px}
.cols{columns:4 230px;column-gap:24px}.cols a{break-inside:avoid}.cols a,.langs .list a{padding:3px 0;font-size:.93rem;line-height:1.55}
.cols a{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cols a span{color:var(--muted);font-size:.88rem}.main-col.wide{max-width:none}
@media (min-width:1024px){.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start}.main-col{max-width:none}
.side{position:sticky;top:12px;margin-top:14px}.side .card{margin:0;max-height:calc(100vh - 24px);overflow:auto}
.items{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}.main-col .gl-main,.main-col .cta-main,.main-col>.nav{display:none}}
@media (max-width:1023px){.side{position:sticky;bottom:0;padding:10px 0 12px;background:var(--paper)}.side .card{border:0;padding:0;margin:0;background:none}
.side .card>:not(.cta){display:none}}
footer{text-align:center;color:var(--muted);font-size:.8rem;margin-top:30px}"""


def page(title, desc, canonical, body, lang='zh-Hant', side='', wide=False):
    body = f'<div class="layout"><div class="main-col">{body}</div><aside class="side"><div class="card">{side}</div></aside></div>' if side \
        else f'<div class="main-col{" wide" if wide else ""}">{body}</div>'
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
<header><a class="brand" href="/">Hanabiの小天地</a><nav class="top"><a href="/learn/grammar/">文法</a><a href="/learn/reading/">閱讀</a><a href="/learn/listening/">聽力</a></nav></header>
<main>
{body}
<footer>說明與例句都是 Hanabiの小天地自己寫的 · <a href="/">hanabirn.xyz</a></footer>
</main>
<script>if (location.hostname === 'hanabirn.xyz') {{ var cfb = document.createElement('script'); cfb.defer = true; cfb.src = 'https://static.cloudflareinsights.com/beacon.min.js'; cfb.setAttribute('data-cf-beacon', '{{"token": "9994498e5ef14bf8a536876efc098de7"}}'); document.body.appendChild(cfb); }}</script>
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
    practice = f'<p>在 Hanabiの小天地 聽例句的錄音、做 {n} 題練習，答對 2/3 就算學會，進度會記下來。</p>'
    cta = f'<a class="cta" href="/?g={level["id"]}/{point["id"]}">到網站練習這個文法 →</a>'
    parts.append(f'<div class="cta-main"><h2>練習</h2>{practice}{cta}</div>')
    parts.append('</article>')
    nav = nav_html(prev, nxt, lambda x: x['pattern'])
    parts.append(nav)
    return url, page(title, desc, url, '\n'.join(parts), side=f'<h2>練習</h2>{practice}{cta}{nav}')


def level_page(level, points):
    lang = level['lang']
    lv_zh = level_zh(level['level'])
    url = f"{SITE}/learn/grammar/{level['id']}/"
    title = f"{LANG_ZH[lang]} {lv_zh} 文法 {len(points)} 個重點｜Hanabiの小天地"
    desc = f"{LANG_ZH[lang]} {lv_zh} 的 {len(points)} 個文法重點：接續、說明、常見錯誤和例句，每個都能到網站練習。" + '、'.join(p['pattern'] for p in points[:6])
    items = ''.join(f'<a href="{p["id"]}.html" title="{e(p["pattern"])}　{e(zh(p["title"]))}"><b lang="{HTML_LANG[lang]}">{e(p["pattern"])}</b>　<span>{e(zh(p["title"]))}</span></a>' for p in points)
    body = (f'<div class="crumbs"><a href="/learn/grammar/">文法</a> › {e(LANG_ZH[lang])} {e(lv_zh)}</div>'
            f'<section class="card"><h1>{e(LANG_ZH[lang])} {e(lv_zh)} 文法</h1>'
            f'<p class="en">{e(LANG_EN[lang])} grammar, {e(level_en(level["level"]))} — {len(points)} points</p>'
            f'<div class="list cols">{items}</div></section>')
    return url, page(title, desc, url, body, wide=True)


LEVEL_KIND = {'grammar': '文法', 'reading': '閱讀', 'listening': '聽力'}
WHO = {'N': '旁白', 'F': '女', 'M': '男', 'F2': '女 2', 'M2': '男 2'}


def is_tw(level):
    """Taiwan edition; zh_hsk12 ('TW HSK 1–2', the 台灣短文) has no edition flag but is Traditional too."""
    return level.get('edition') == 'tw' or str(level.get('level', '')).startswith('TW')


def zh_level_name(level):
    """HSK levels exist twice (the Mainland edition in Simplified, the Taiwan one in Traditional)."""
    if level['lang'] == 'zh' and str(level['level']).startswith('TW'):
        return '台灣短文'
    name = level_zh(level['level'])
    if level['lang'] == 'zh':
        name += '（台灣版）' if is_tw(level) else '（大陸版）'
    return name


def is_simp(level):
    return level['lang'] == 'zh' and not is_tw(level)


def text_lang(level):
    if level['lang'] == 'zh':
        return 'zh-Hans' if is_simp(level) else 'zh-Hant'
    return HTML_LANG[level['lang']]


def segs_text(level, segs):
    if is_simp(level):
        return ''.join((seg[4] if len(seg) > 4 and seg[4] else seg[0]) for seg in segs)
    return ''.join(seg[0] for seg in segs)


def sent_text(level, s):
    if s.get('t'):
        return segs_text(level, s['t'])
    return s.get('plain', '')


def sent_reading(level, s):
    if level['lang'] == 'ja':
        return s.get('kana', '')
    if level['lang'] == 'zh':
        return ' '.join(seg[1] for seg in s.get('t', []) if seg[1])
    return ''


def tr(x, lang):
    """The Chinese translation (learning Chinese: the English one)."""
    if lang == 'zh':
        return x.get('en', '')
    return x.get('zh', '') or x.get('en', '')


def read_title(level, p):
    t = p['title']
    if isinstance(t, dict):
        if isinstance(t.get('t'), list):
            return segs_text(level, t['t'])
        return t.get('plain') or t.get('en', '')
    return t or ''


def title_tr(level, p):
    t = p['title'] if isinstance(p['title'], dict) else {}
    return t.get('en', '') if level['lang'] == 'zh' else t.get('zh', '')


def nav_html(prev, nxt, label):
    nav = '<div class="nav">'
    nav += f'<a href="{prev["id"]}.html">← {e(label(prev))}</a>' if prev else '<span></span>'
    nav += f'<a href="{nxt["id"]}.html">{e(label(nxt))} →</a>' if nxt else '<span></span>'
    return nav + '</div>'


def reading_page(level, p, prev, nxt):
    lang = level['lang']
    lv = zh_level_name(level)
    tl = text_lang(level)
    url = f"{SITE}/learn/reading/{level['id']}/{p['id']}.html"
    title_t = read_title(level, p)
    title_en = p['title'].get('en', '') if isinstance(p['title'], dict) else ''
    sep = '' if lang in ('ja', 'zh') else ' '
    paras = [sep.join(sent_text(level, s) for s in para['s']) for para in p['paragraphs']]
    desc = (f"{LANG_ZH[lang]} {lv} 閱讀：{title_tr(level, p) or title_en}。" + ' '.join(paras))[:150]
    parts = [f'<div class="crumbs"><a href="/learn/reading/">閱讀</a> › <a href="/learn/reading/{level["id"]}/">{e(LANG_ZH[lang])} {e(lv)}</a></div>',
             '<article class="card">', f'<h1 lang="{tl}">{e(title_t)}</h1>']
    if lang != 'zh' and title_tr(level, p):
        parts.append(f'<p class="sub">{e(title_tr(level, p))}</p>')
    parts.append(f'<p class="en">{e(title_en)} — {e(LANG_EN[lang])} reading, {e(level_en(level["level"]))}</p>')
    parts.append('<h2>文章</h2>')
    for para, txt in zip(p['paragraphs'], paras):
        rd = ' '.join(sent_reading(level, s) for s in para['s']) if lang == 'zh' else ''.join(sent_reading(level, s) for s in para['s'])
        h = f'<div class="para"><div lang="{tl}">{e(txt)}</div>'
        if rd and rd != txt:
            h += f'<div class="rd" lang="{tl}">{e(rd)}</div>'
        if tr(para, lang):
            h += f'<div class="tl">{e(tr(para, lang))}</div>'
        parts.append(h + '</div>')
    gl = ''
    if p.get('glossary'):
        gl = ('<h2>生詞</h2><div class="gl">' + ''.join(
            f'<div><b lang="{tl}">{e(g.get("simp") if is_simp(level) and g.get("simp") else g.get("w"))}</b>'
            + (f' <span class="en">{e(g.get("r"))}</span>' if g.get('r') else '') + f'　{e(tr(g, lang))}</div>'
            for g in p['glossary']) + '</div>')
        parts.append(f'<div class="gl-main">{gl}</div>')
    n = len(p.get('mcq') or []) + len(p.get('tf') or [])
    practice = f'<p>在 Hanabiの小天地 聽整篇文章的錄音、點生詞看意思，再做 {n} 題閱讀測驗（選擇題和是非題）。</p>'
    cta = f'<a class="cta" href="/?r={level["id"]}/{p["id"]}">到網站讀這篇、做題目 →</a>'
    parts.append(f'<div class="cta-main"><h2>練習</h2>{practice}{cta}</div>')
    parts.append('</article>')
    nav = nav_html(prev, nxt, lambda x: read_title(level, x))
    parts.append(nav)
    return url, page(f"{title_t}｜{LANG_ZH[lang]} {lv} 閱讀｜Hanabiの小天地", desc, url, '\n'.join(parts),
                     side=f'<h2>練習</h2>{practice}{cta}{nav}{gl}')


def listening_page(level, st, prev, nxt):
    lang = level['lang']
    lv = zh_level_name(level)
    tl = text_lang(level)
    url = f"{SITE}/learn/listening/{level['id']}/{st['id']}.html"
    n_items = len(st['items'])
    n_q = sum(len(it.get('questions') or []) or 1 for it in st['items'])
    name = st['_name']
    # only a narrator's opening line says what the item is about; a speaker's first line would give the dialogue away
    abouts = [tr(it['lines'][0], lang) if it.get('lines') and it['lines'][0].get('who') == 'N' else '' for it in st['items']]
    desc = (f"{LANG_ZH[lang]} {lv} 聽力練習{name}：{n_items} 段錄音、{n_q} 題，附逐字稿。" + ' '.join(x for x in abouts if x))[:150]
    parts = [f'<div class="crumbs"><a href="/learn/listening/">聽力</a> › <a href="/learn/listening/{level["id"]}/">{e(LANG_ZH[lang])} {e(lv)}</a></div>',
             '<article class="card">', f'<h1>{e(LANG_ZH[lang])} {e(lv)} 聽力練習 {e(name)}</h1>',
             f'<p class="en">{e(LANG_EN[lang])} listening practice, {e(level_en(level["level"]))}, round {st["_n"]} — {n_items} recordings, {n_q} questions</p>',
             '<p>每一段都是母語錄音。建議先到網站聽、作答，再回來看逐字稿。</p>', '<h2>內容</h2><div class="items">']
    for i, (it, about) in enumerate(zip(st['items'], abouts)):
        lines = it.get('lines') or []
        h = f'<div class="item"><b>第 {i + 1} 段</b>　{e(about)}'
        if lines:
            rows = []
            for ln in lines:
                txt = sent_text(level, ln)
                t2 = tr(ln, lang)
                rows.append(f'<div class="ln"><span class="who">{e(WHO.get(ln.get("who"), ""))}</span><span lang="{tl}">{e(txt)}</span>'
                            + (f'<div class="en">{e(t2)}</div>' if t2 and t2 != txt else '') + '</div>')
            h += '<details><summary>逐字稿（聽完再看）</summary>' + ''.join(rows) + '</details>'
        parts.append(h + '</div>')
    cta = f'<a class="cta" href="/?l={level["id"]}/{st["id"]}">到網站聽這一回 →</a>'
    parts.append(f'</div><div class="cta-main"><h2>練習</h2>{cta}</div>')
    parts.append('</article>')
    nav = nav_html(prev, nxt, lambda x: x['_name'])
    parts.append(nav)
    return url, page(f"{LANG_ZH[lang]} {lv} 聽力練習 {name}｜Hanabiの小天地", desc, url, '\n'.join(parts),
                     side=f'<h2>練習</h2><p>{n_items} 段母語錄音、{n_q} 題。</p>{cta}{nav}')


def build_kind(kind):
    """learn/reading or learn/listening: item pages, a page per level and an overview. Returns their URLs."""
    out = ROOT / 'learn' / kind
    if out.exists():
        shutil.rmtree(out)
    index = json.loads((ROOT / 'data' / kind / 'index.json').read_text(encoding='utf-8'))
    kz = LEVEL_KIND[kind]
    urls, rows = [], []
    for level in index:
        f = ROOT / 'data' / kind / f"{level['id']}.json"
        if not f.exists():
            continue
        data = json.loads(f.read_text(encoding='utf-8'))
        if kind == 'reading':
            items = data.get('passages') or []
        else:
            items = [x for x in data.get('sets') or [] if not x.get('mock')]
            for i, x in enumerate(items):
                x['_n'] = i + 1
                x['_name'] = f'第 {i + 1} 回'
        if not items:
            continue
        d = out / level['id']
        d.mkdir(parents=True, exist_ok=True)
        for i, it in enumerate(items):
            prev = items[i - 1] if i else None
            nxt = items[i + 1] if i + 1 < len(items) else None
            url, text = (reading_page if kind == 'reading' else listening_page)(level, it, prev, nxt)
            (d / f"{it['id']}.html").write_text(text, encoding='utf-8')
            urls.append(url)
        lv = zh_level_name(level)
        lname = LANG_ZH[level['lang']]
        if kind == 'reading':
            lst = ''.join(f'<a href="{x["id"]}.html" title="{e(read_title(level, x))}　{e(title_tr(level, x))}"><b lang="{text_lang(level)}">{e(read_title(level, x))}</b>　<span>{e(title_tr(level, x))}</span></a>' for x in items)
            what = f'{len(items)} 篇文章'
        else:
            lst = ''.join(f'<a href="{x["id"]}.html"><b>{e(x["_name"])}</b>　{len(x["items"])} 段錄音</a>' for x in items)
            what = f'{len(items)} 回練習'
        url = f"{SITE}/learn/{kind}/{level['id']}/"
        body = (f'<div class="crumbs"><a href="/learn/{kind}/">{kz}</a> › {e(lname)} {e(lv)}</div>'
                f'<section class="card"><h1>{e(lname)} {e(lv)} {kz}</h1>'
                f'<p class="en">{e(LANG_EN[level["lang"]])} {kind}, {e(level_en(level["level"]))} — {what}</p><div class="list cols">{lst}</div></section>')
        (d / 'index.html').write_text(page(f"{lname} {lv} {kz}練習 {what}｜Hanabiの小天地",
                                           f"{lname} {lv} 的{kz}練習：{what}，有母語錄音和翻譯，都能到網站作答。", url, body, wide=True), encoding='utf-8')
        urls.append(url)
        rows.append((level, what))
    by_lang = {}
    for level, what in rows:
        key = level['lang'] + ('_tw' if level['lang'] == 'zh' and is_tw(level) else '')
        by_lang.setdefault(key, []).append((level, what))
    body = f'<section class="card"><h1>{kz}總覽</h1><p>8 種語言、各級別的{kz}練習，都是 Hanabiの小天地自己寫的內容，配上母語錄音和翻譯。</p><div class="langs">'
    for lang, rs in by_lang.items():
        head = LANG_ZH[lang[:2]] + ({'zh': '（大陸版）', 'zh_tw': '（台灣版）'}.get(lang, ''))
        body += f'<div class="lang"><h2>{e(head)}</h2><div class="list">' + ''.join(
            f'<a href="{lv["id"]}/"><b>{e(zh_level_name(lv).split("（")[0])}</b>　{e(w)}</a>' for lv, w in rs) + '</div></div>'
    body += '</div></section>'
    (out / 'index.html').write_text(page(f'{kz}總覽：日文、韓文、中文、英文、法文、俄文、西班牙文、德文｜Hanabiの小天地',
                                         f'8 種語言、各級別的{kz}練習，有母語錄音和翻譯，每一份都能到網站作答。',
                                         f'{SITE}/learn/{kind}/', body, wide=True), encoding='utf-8')
    return [f'{SITE}/learn/{kind}/'] + urls


def hub_page():
    body = ('<section class="card"><h1>學習總覽</h1><p>Hanabiの小天地 的文法、閱讀和聽力內容，8 種語言，從入門到進階。每一頁都能直接到網站練習，進度會記下來。</p>'
            '<div class="list"><a href="/learn/grammar/"><b>文法</b>　每個文法重點的接續、說明、常見錯誤和例句</a>'
            '<a href="/learn/reading/"><b>閱讀</b>　分級文章，附讀音、翻譯和生詞</a>'
            '<a href="/learn/listening/"><b>聽力</b>　分級聽力練習，附逐字稿</a></div></section>')
    (ROOT / 'learn' / 'index.html').write_text(page('學習總覽：文法、閱讀、聽力｜Hanabiの小天地',
                                                    '日文、韓文、中文、英文、法文、俄文、西班牙文、德文的文法、閱讀和聽力，分級整理，都能到網站練習。',
                                                    f'{SITE}/learn/', body), encoding='utf-8')
    return f'{SITE}/learn/'


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
    body = '<section class="card"><h1>文法總覽</h1><p>8 種語言、各級別的文法重點，全部是 Hanabiの小天地自己寫的說明和例句。</p><div class="langs">'
    for lang, rows in by_lang.items():
        body += f'<div class="lang"><h2>{e(LANG_ZH[lang])}</h2><div class="list">' + ''.join(
            f'<a href="{lv["id"]}/"><b>{e(level_zh(lv["level"]))}</b>　{n} 個重點</a>' for lv, n in rows) + '</div></div>'
    body += '</div></section>'
    (OUT / 'index.html').write_text(page('文法總覽：日文、韓文、中文、英文、法文、俄文、西班牙文、德文｜Hanabiの小天地',
                                         '8 種語言、各級別的文法重點：接續、說明、常見錯誤和例句，每個都能到網站練習。',
                                         f'{SITE}/learn/grammar/', body, wide=True), encoding='utf-8')
    urls.insert(0, f'{SITE}/learn/grammar/')
    urls = [hub_page()] + urls + build_kind('reading') + build_kind('listening')
    # sitemap: the site, the privacy page, then the grammar pages
    rows = [(f'{SITE}/', 'weekly', '1.0'), (f'{SITE}/privacy.html', 'monthly', '0.3')] + [(u, 'monthly', '0.6') for u in urls]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'    <url>\n        <loc>{u}</loc>\n        <changefreq>{f}</changefreq>\n        <priority>{p}</priority>\n    </url>\n' for u, f, p in rows) + '</urlset>\n'
    (ROOT / 'sitemap.xml').write_text(xml, encoding='utf-8')
    print(len(urls), 'pages; sitemap', len(rows), 'urls')


if __name__ == '__main__':
    main()
