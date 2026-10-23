"""Topic word sets with levels (item 10, owner's pick A, 2026-10-23).

Each everyday topic (TOPICS: the 10 hand-written ones in tools/topics/<lang>.tsv plus 5
new ones) gets a ladder above its 40 hand-written words, built from the graded word lists
the site already has (JLPT, TOPIK, HSK, the English lists, CEFR): Gemini puts each graded
word into one topic or none, and a topic's words at one level become one set. The words
keep their reading, meaning and recordings from the graded list, so nothing new has to be
recorded.

The classification is cached per word in the git-ignored tools/.vocab-cache/
topics_<lang>.json, so a re-run only asks about words it hasn't seen. With --review it
writes tools/.mockups/topic_levels/<lang>.html for the owner to check the grouping.
A level with fewer than MIN_LEVEL words joins the next one up.

Usage: python tools/build_topic_levels.py --lang ja [--review] [--limit N]
Japanese was the pilot (approved 2026-10-23); --model gemini-3.8-flash is the owner's pick.
"""
import argparse, html, json, sys, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools' / '.vocab-cache'
REVIEW = ROOT / 'tools' / '.mockups' / 'topic_levels'
sys.path.insert(0, str(ROOT / 'tools'))
import build_audio as ba        # noqa: E402  (gemini_key: the paid key)

TOPICS = {
    'greetings': 'greetings, set phrases, polite expressions, basic replies',
    'food': 'food, drinks, cooking, eating out, tastes, kitchen things',
    'home': 'home, rooms, furniture, household things, housework, daily routine at home',
    'shopping': 'shopping, shops, money, prices, clothes and things one buys',
    'transport': 'transport, vehicles, roads, stations, directions, commuting',
    'travel': 'travel, sightseeing, hotels, airports, countries, tourism',
    'weather': 'weather, seasons, temperature, climate',
    'school': 'school, study, classes, subjects, exams, education',
    'work': 'work, jobs, office, company, business, meetings',
    'health': 'the body and its parts, health, illness, injuries, hospital, doctors, medicine',
    # new in 2026-10-23
    'family': 'family members, friends, relationships, people and social life',
    'hobby': 'hobbies, sports, music, games, films, books, entertainment, free time',
    'nature': 'nature, animals, plants, landscape, environment, the sky and the sea',
    'feelings': 'feelings, emotions, mood, personality, character traits',
    'time': 'time, dates, days, months, years, clock time, frequency, before/after',
    'society': 'society, politics, government, economy, law, crime, news, media, international affairs',
}
LEVEL_SETS = {          # easiest first, as on the 單字 page's 檢定等級 tab
    'ja': ['jlpt_n5', 'jlpt_n4', 'jlpt_n3', 'jlpt_n2', 'jlpt_n1'],
    'ko': ['topik_1', 'topik_2', 'topik_3', 'topik_4'],
    'zh': [f'hsk_{n}' for n in range(1, 8)],
    'en': ['en_jh', 'en_sh', 'en_toeic', 'en_toefl'],
    **{l: [f'{l}_{c}' for c in ('a1', 'a2', 'b1', 'b2', 'c1')] for l in ('fr', 'ru', 'es', 'de')},
}
LEVEL_NAMES = {'jlpt_n5': 'N5', 'jlpt_n4': 'N4', 'jlpt_n3': 'N3', 'jlpt_n2': 'N2', 'jlpt_n1': 'N1',
               **{f'topik_{n}': f'TOPIK {n}' for n in range(1, 5)},
               **{f'hsk_{n}': f'HSK {n}' for n in range(1, 7)}, 'hsk_7': 'HSK 7–9',
               'en_jh': '國中', 'en_sh': '高中', 'en_toeic': '多益', 'en_toefl': '托福',
               **{f'{l}_{c}': c.upper() for l in ('fr', 'ru', 'es', 'de') for c in ('a1', 'a2', 'b1', 'b2', 'c1')}}
LANG_EN = {'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'en': 'English', 'fr': 'French',
           'ru': 'Russian', 'es': 'Spanish', 'de': 'German'}
LANG_ZH = {'ja': '日文', 'ko': '韓文', 'zh': '中文', 'en': '英文', 'fr': '法文', 'ru': '俄文', 'es': '西班牙文', 'de': '德文'}


def fields(lang, w):
    """a graded row -> (word, reading, meaning) for the prompt; the rows differ by language"""
    if lang == 'zh':                    # [traditional, simplified, zhuyin, pinyin, english]
        return w[0], w[3], w[4]
    if lang == 'en':                    # [word, '', chinese meaning, '']
        return w[0], '', w[2]
    return w[0], w[1], (w[3] if len(w) > 3 and w[3] else w[2])
TOPIC_ZH = {'greetings': '打招呼', 'food': '吃飯', 'home': '居家生活', 'shopping': '購物', 'transport': '交通',
            'travel': '旅行', 'weather': '天氣與季節', 'school': '學校', 'work': '工作', 'health': '身體與看病',
            'family': '家人與人際', 'hobby': '興趣與娛樂', 'nature': '自然與動物', 'feelings': '心情與個性', 'time': '時間與日期', 'society': '社會與新聞'}
MIN_LEVEL = 10
MAX_LEVEL = 80          # a bigger level is cut into parts ① ② … (owner's pick 2026-10-23)
BATCH = 120
FREE_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite']
PAID_MODEL = 'gemini-3.1-flash-lite'


def free_key():
    f = ROOT / 'worker' / 'assistant' / '.dev.vars'
    for line in f.read_text(encoding='utf-8-sig').splitlines() if f.exists() else []:
        if line.startswith('GEMINI_API_KEY'):
            return line.split('=', 1)[1].strip().strip('"')
    return ''


MODEL = None            # --model: one paid model instead of the free lite chain
USAGE = {'in': 0, 'out': 0}


def ask(batch, lang):
    """[(index, word, reading, english)] -> {index: topic or 'none'}"""
    topics = '\n'.join(f'- {k}: {v}' for k, v in TOPICS.items())
    lines = '\n'.join(f'{i}\t{w}\t{r}\t{en}' for i, w, r, en in batch)
    prompt = (f'You sort vocabulary of a {LANG_EN[lang]} learning website into everyday topics.\n'
              f'Topics:\n{topics}\n- none: no topic above fits well\n\n'
              'For each word give the ONE topic a learner studying that topic would most expect it in. '
              'Be strict: abstract, grammatical, academic or general words (e.g. "to do", "situation", "economy", '
              'counters, conjunctions) are none. Adverbs of degree or manner and pronouns are none even when '
              'their English gloss mentions time ("a little", "already", "still" -> none; "today", "next week" -> time). '
              'Think of where a picture-dictionary chapter would put the word. Examples (Japanese): 家 (house) -> home; '
              '店 (shop) -> shopping; 目 (eye) -> health; 本 (book) -> hobby; 先生 (teacher) -> school; '
              '国 (country) -> travel; 好き (to like) -> feelings; みんな (everyone) -> family; する (to do) -> none.\n'
              'Each line is index<TAB>word<TAB>reading or gender (may be empty)<TAB>meaning.\n\n' + lines)
    body = {'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0,
                                 'responseSchema': {'type': 'ARRAY', 'items': {'type': 'OBJECT', 'properties': {
                                     'i': {'type': 'INTEGER'}, 't': {'type': 'STRING', 'enum': list(TOPICS) + ['none']}},
                                     'required': ['i', 't']}}}}
    if MODEL:
        body['generationConfig']['thinkingConfig'] = {'thinkingLevel': 'low'}
        tries = [(ba.gemini_key(), MODEL)]
    else:
        tries = [(free_key(), m) for m in FREE_MODELS] + [(ba.gemini_key(), PAID_MODEL)]
    for key, model in tries:
        if not key:
            continue
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json'})
                res = json.load(urllib.request.urlopen(req, timeout=300))
                um = res.get('usageMetadata', {})
                USAGE['in'] += um.get('promptTokenCount', 0)
                USAGE['out'] += um.get('candidatesTokenCount', 0) + um.get('thoughtsTokenCount', 0)
                out = json.loads(res['candidates'][0]['content']['parts'][0]['text'])
                return {o['i']: o['t'] for o in out if isinstance(o, dict)}, model
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    break                        # this model is out for today: the next one
                time.sleep(10)
            except (KeyError, ValueError, urllib.error.URLError, TimeoutError):
                time.sleep(5)
    raise RuntimeError('no model answered')


def classify(lang, limit=None):
    CACHE.mkdir(parents=True, exist_ok=True)
    cf = CACHE / f'topics_{lang}.json'
    cache = json.loads(cf.read_text(encoding='utf-8')) if cf.exists() else {}
    todo, queued = [], set()
    for sid in LEVEL_SETS[lang]:
        for w in json.loads((ROOT / 'data' / 'vocab' / f'{sid}.json').read_text(encoding='utf-8'))['words']:
            key = w[0] + '|' + w[1]
            if key not in cache and key not in queued:
                queued.add(key)
                todo.append((key, *fields(lang, w)))
    if limit:
        todo = todo[:limit]
    print(f'{lang}: {len(cache)} sorted before, {len(todo)} to sort')
    used = {}
    for n in range(0, len(todo), BATCH):
        chunk = todo[n:n + BATCH]
        got, model = ask([(i, w, r, en) for i, (_, w, r, en) in enumerate(chunk)], lang)
        used[model] = used.get(model, 0) + 1
        for i, (key, *_rest) in enumerate(chunk):
            cache[key] = got.get(i, 'none')
        cf.write_text(json.dumps(cache, ensure_ascii=False), encoding='utf-8')
        print(f'  {min(n + BATCH, len(todo))}/{len(todo)} ({model})', flush=True)
    print('calls per model:', used, '| tokens in', USAGE['in'], 'out (incl. thinking)', USAGE['out'])
    return cache


def ladders(lang, cache):
    """{topic: [(level name, [words])]}, small levels joined to the next, the hand-written words left out"""
    base = {}
    tsv = ROOT / 'tools' / 'topics' / f'{lang}.tsv'
    cur = None
    for line in tsv.read_text(encoding='utf-8').splitlines():
        if line.startswith('## '):
            cur = line[3:].strip(); base[cur] = set()
        elif cur and line and not line.startswith('#'):
            base[cur].add(line.split('\t')[0])
    out = {}
    for t in TOPICS:
        seen = set(base.get(t, set()))
        levels = []
        for sid in LEVEL_SETS[lang]:
            words = []
            for w in json.loads((ROOT / 'data' / 'vocab' / f'{sid}.json').read_text(encoding='utf-8'))['words']:
                if cache.get(w[0] + '|' + w[1]) == t and w[0] not in seen:
                    seen.add(w[0]); words.append(w)
            levels.append((sid, words))
        # a level with too few words joins the next one up (the last one joins the one below)
        merged = []                                    # [first set, last set, words]
        carry_from, carry = None, []
        for sid, words in levels:
            carry_from = carry_from or sid; carry += words
            if len(carry) >= MIN_LEVEL:
                merged.append([carry_from, sid, carry])
                carry_from, carry = None, []
        if carry:
            if merged:
                merged[-1][1] = LEVEL_SETS[lang][-1]; merged[-1][2] += carry
            else:
                merged.append([carry_from, LEVEL_SETS[lang][-1], carry])
        parts = []                                     # [label, words, first set, last set, part (0 = whole)]
        marks = '①②③④⑤⑥⑦⑧⑨⑩'
        for a, b, words in merged:
            # "TOPIK 1–2", "HSK 1–4": the second name without the prefix they share
            nb = LEVEL_NAMES[b]
            if a != b and ' ' in LEVEL_NAMES[a] and nb.startswith(LEVEL_NAMES[a].split(' ')[0] + ' '):
                nb = nb.split(' ', 1)[1]
            name = LEVEL_NAMES[a] if a == b else LEVEL_NAMES[a] + '–' + nb
            if len(words) <= MAX_LEVEL:
                parts.append([name, words, a, b, 0]); continue
            k = -(-len(words) // MAX_LEVEL)            # this many parts, as even as possible
            size = -(-len(words) // k)
            for j in range(k):
                parts.append([f'{name} {marks[j]}', words[j * size:(j + 1) * size], a, b, j + 1])
        out[t] = parts
    return out, base


def level_id(lang, topic, a, b, part):
    """tp_ja_food_n5, tp_ja_greetings_n5-n4, tp_ja_home_n3_2 — the graded set ids give the level"""
    slug = lambda sid: sid.split('_', 1)[1]          # jlpt_n5 -> n5, topik_1 -> 1, en_jh -> jh, fr_a1 -> a1
    lv = slug(a) if a == b else slug(a) + '-' + slug(b)
    return f'tp_{lang}_{topic}_{lv}' + (f'_{part}' if part else '')


def write(lang, cache):
    """data/vocab/tp_<lang>_<topic>_<level>.json for every step of every ladder, and
    js/topic-levels-data.js (TOPIC_LEVELS) listing them for the 單字 page"""
    lad, _ = ladders(lang, cache)
    vocab = ROOT / 'data' / 'vocab'
    meta = {sid: json.loads((vocab / f'{sid}.json').read_text(encoding='utf-8')) for sid in LEVEL_SETS[lang]}
    old = {p.name for p in vocab.glob(f'tp_{lang}_*_*.json')}
    steps = {}
    for t, levels in lad.items():
        steps[t] = []
        for name, words, a, b, part in levels:
            sid = level_id(lang, t, a, b, part)
            src = LEVEL_SETS[lang][LEVEL_SETS[lang].index(a):LEVEL_SETS[lang].index(b) + 1]
            data = {'id': sid, 'kind': meta[a]['kind'], 'version': time.strftime('%Y%m%d'),
                    'source': '；'.join(dict.fromkeys(meta[s]['source'] for s in src)) + '（Hanabi 依主題分類）',
                    'license': '；'.join(dict.fromkeys(meta[s]['license'] for s in src)),
                    'count': len(words), 'words': words}
            f = vocab / f'{sid}.json'
            with open(f, 'w', encoding='utf-8', newline='\n') as fh:
                json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
                fh.write('\n')
            old.discard(f.name)
            steps[t].append([sid, a, b, part, len(words)])
    for name in old:                                   # a step that no longer exists
        (vocab / name).unlink()
    # one data file for all languages: read what is there, replace this language
    js = ROOT / 'js' / 'topic-levels-data.js'
    allsteps = {}
    if js.exists():
        txt = js.read_text(encoding='utf-8')
        start = txt.index('const TOPIC_LEVELS = ') + len('const TOPIC_LEVELS = ')
        allsteps = json.loads(txt[start:txt.rindex('}') + 1])
    allsteps[lang] = steps
    allsteps = {l: allsteps[l] for l in LEVEL_SETS if l in allsteps}
    js.write_text('/* Built by tools/build_topic_levels.py --write — do not edit by hand.\n'
                  '   The levels above each topic\'s hand-written words: {lang: {topic: [[set id, first graded set,\n'
                  '   last graded set, part (0 = whole), words]]}}, easiest first (js/quiz.js, the 單字 page). */\n'
                  'const TOPIC_LEVELS = ' + json.dumps(allsteps, ensure_ascii=False, separators=(',', ':')) + ';\n',
                  encoding='utf-8', newline='\n')
    print(f'{lang}: wrote {sum(len(v) for v in steps.values())} sets, removed {len(old)}; js/topic-levels-data.js')


def review(lang, cache):
    lad, base = ladders(lang, cache)
    rows, total = [], 0
    for t, levels in lad.items():
        n = sum(len(w) for _, w, *_ in levels); total += n
        rows.append(f'<section><h2>{TOPIC_ZH[t]} <small>{t} · 基礎 {len(base.get(t, []))} 字（手寫，不變）＋ 檢定 {n} 字</small></h2>')
        for name, words, *_ in levels:
            rows.append(f'<details><summary><b>{name}</b> — {len(words)} 字</summary><div class="w">' +
                        ''.join(f'<span title="{html.escape(fields(lang, w)[2])}"><b>{html.escape(w[0])}</b>'
                                f'{"" if not fields(lang, w)[1] or fields(lang, w)[1] == w[0] else "（" + html.escape(fields(lang, w)[1]) + "）"}'
                                f' {html.escape(w[2] if lang not in ("zh",) else w[4])}</span>' for w in words) +
                        '</div></details>')
        rows.append('</section>')
    none = sum(1 for v in cache.values() if v == 'none')
    REVIEW.mkdir(parents=True, exist_ok=True)
    (REVIEW / f'{lang}.html').write_text(
        '<!doctype html><meta charset="utf-8"><title>主題分級審核</title><style>body{font-family:system-ui,sans-serif;margin:20px;background:#f6f1e7;color:#2b2724}'
        'section{background:#fff;border:1px solid #ddd;border-radius:12px;padding:10px 14px;margin:12px 0}h2{font-size:18px;margin:4px 0 8px}h2 small{font-size:12px;color:#777;font-weight:400}'
        'summary{cursor:pointer;padding:4px 0}.w{display:flex;flex-wrap:wrap;gap:6px;padding:6px 0 10px}.w span{border:1px solid #e3dccf;border-radius:8px;padding:2px 8px;font-size:13px;background:#fbf8f2}</style>'
        f'<h1>{LANG_ZH[lang]}主題分級</h1><p>{"、".join(LEVEL_NAMES[s] for s in LEVEL_SETS[lang])} 共 {len(cache)} 字，分進 {len(TOPICS)} 個主題的有 {total} 字，不屬於任何主題的 {none} 字。'
        f'點每個等級可以展開看有哪些字；滑鼠移到字上可以看英文。不到 {MIN_LEVEL} 字的等級會併到下一級，超過 {MAX_LEVEL} 字的會拆成 ①②。</p>' + ''.join(rows),
        encoding='utf-8')
    print('review page:', (REVIEW / f'{lang}.html').relative_to(ROOT))
    for t, levels in lad.items():
        print(f'  {t:10s}', ' '.join(f'{n}:{len(w)}' for n, w, *_ in levels))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lang', default='ja')
    ap.add_argument('--review', action='store_true')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--model', help='a paid model to sort with, e.g. gemini-3.8-flash')
    ap.add_argument('--write', action='store_true', help='write data/vocab/ sets and js/topic-levels-data.js')
    ap.add_argument('--offline', action='store_true', help='only use the cache (no Gemini calls)')
    args = ap.parse_args()
    global MODEL
    MODEL = args.model
    if args.offline:
        cache = json.loads((CACHE / f'topics_{args.lang}.json').read_text(encoding='utf-8'))
    else:
        cache = classify(args.lang, args.limit)
    if args.review:
        review(args.lang, cache)
    if args.write:
        write(args.lang, cache)


if __name__ == '__main__':
    main()
