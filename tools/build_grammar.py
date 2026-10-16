"""Builds the grammar lessons: tools/grammar/<id>.json -> data/grammar/<id>.json.

The source files are hand-written (Traditional Chinese + English). This script
checks them, adds Simplified Chinese (OpenCC tw2sp, like i18n/zh-Hans.js) next to
every "zh" text, and writes data/grammar/index.json, the list the site's 文法
page offers. Don't edit data/grammar/ by hand — edit the source and re-run.

Usage: pip install opencc-python-reimplemented
       python tools/build_grammar.py

Practice questions (quiz[], 2026-10-16): the first ones are the easy ones; a question
with "hard": true is shown after them with a 進階 tag. A question is either a fill-in
({q with （　）, options[4], answer}) or a sentence-ordering one ("type": "order":
{before, parts[4] in the right order, after, star: the index of the ★ part, optional
alts: other right orders as index lists, e.g. [[1, 0, 2, 3]]}) — the
build adds q (before ＿＿ ＿＿ ★ ＿＿ after), options (= parts) and answer (= star), so
the Discord bot and the why-explanations treat it as a 4-option question. How the page
asks it is the level's "order_style": "arrange" (put all four in order; N5–N4, owner's
pick) or "star" (the default: pick the ★ part, like the JLPT). Japanese quiz texts may
carry furigana as 漢字{かな} (as in tools/reading/): the build keeps the plain text in
q / options / before / after / parts and the segments in q_furi / options_furi /
before_furi / after_furi / parts_furi ([[text, reading or ""], …]).
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'grammar'
OUT = ROOT / 'data' / 'grammar'
sys.stdout.reconfigure(encoding='utf-8')


def add_hans(obj, cc):
    """Every dict with a "zh" string gets a "zh-Hans" one beside it."""
    if isinstance(obj, dict):
        if isinstance(obj.get('zh'), str) and obj['zh']:
            obj['zh-Hans'] = cc.convert(obj['zh'])
        for v in obj.values():
            add_hans(v, cc)
    elif isinstance(obj, list):
        for v in obj:
            add_hans(v, cc)


# ---------- Chinese readings ----------
# The examples' pinyin is hand-written and the reference: their zhuyin is derived
# from it (tools/zh_reading.py cuts it into one syllable per character), and the
# words they spell set how the generated readings of the quiz sentences, options
# and common mistakes are written. A sentence that doesn't line up is reported.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import zh_reading
from build_reading import RUBY, tokens

STAR_SLOT, SLOT = '＿★＿', '＿＿'


def ruby(text, where, problems):
    """'台風{たいふう}の' -> ('台風の', [['台風', 'たいふう'], ['の', '']]), or (text, None) without furigana."""
    if '{' not in text and '}' not in text:
        return text, None
    if '{' in RUBY.sub('', text) or '}' in RUBY.sub('', text):
        problems.append(f'{where}: a {{reading}} without kanji right before it: {text}')
    segs = [[t, r or ''] for t, r in tokens(text)]
    return ''.join(t for t, _ in segs), segs


def prepare_quiz(data, problems, name):
    """Order questions get q / options / answer; Japanese texts lose their {furigana} markup."""
    ja = data['lang'] == 'ja'
    for p in data['points']:
        for i, q in enumerate(p.get('quiz', []), 1):
            where = f'{name} {p["id"]} q{i}'
            if q.get('type') == 'order':
                parts = q.get('parts') or []
                if len(parts) != 4 or len(set(parts)) != 4:
                    problems.append(f'{where}: an order question needs 4 different parts: {parts}')
                if not isinstance(q.get('star'), int) or not 0 <= q['star'] < 4:
                    problems.append(f'{where}: star must be 0–3')
                # other orders that are also right (for "arrange"); the ★ part must stay put
                for alt in q.get('alts', []):
                    if sorted(alt) != [0, 1, 2, 3] or alt[q.get('star', 0)] != q.get('star'):
                        problems.append(f'{where}: alts must be orders of 0–3 keeping the ★ part in place: {alt}')
                for k in ('before', 'after'):
                    q.setdefault(k, '')
                if ja:
                    q['before'], fb = ruby(q['before'], where, problems)
                    q['after'], fa = ruby(q['after'], where, problems)
                    pairs = [ruby(x, where, problems) for x in parts]
                    q['parts'] = [x for x, _ in pairs]
                    if fb: q['before_furi'] = fb
                    if fa: q['after_furi'] = fa
                    if any(f for _, f in pairs):
                        q['parts_furi'] = [f for _, f in pairs]
                slots = ' '.join(STAR_SLOT if k == q.get('star') else SLOT for k in range(4))
                q['q'] = f'{q["before"]} {slots} {q["after"]}'.strip()
                q['options'] = list(q['parts'])
                q['answer'] = q.get('star')
            elif ja:
                q['q'], fq = ruby(q.get('q', ''), where, problems)
                if fq: q['q_furi'] = fq
                pairs = [ruby(x, where, problems) for x in q.get('options', [])]
                q['options'] = [x for x, _ in pairs]
                if any(f for _, f in pairs):
                    q['options_furi'] = [f for _, f in pairs]


def add_zh_readings(data, problems, name):
    for p in data['points']:
        for ex in p['examples']:
            try:
                ex['zhuyin'] = zh_reading.zhuyin(ex['text'], ex.get('reading', ''))
                zh_reading.learn(ex['text'], ex['reading'])
            except ValueError as e:
                problems.append(f'{name} {p["id"]}: {e}')

    def both(text, given, sentence=True):
        r = given or zh_reading.reading(text, sentence)
        try:
            return r, zh_reading.zhuyin(text, r)
        except ValueError as e:
            problems.append(f'{name}: {e}')
            return r, ''

    for p in data['points']:
        for q in p['quiz']:
            q['q_reading'], q['q_zhuyin'] = both(q['q'], q.get('q_reading'))
            given = q.get('options_reading') or [None] * 4
            pairs = [both(o, g, False) for o, g in zip(q['options'], given)]
            q['options_reading'] = [r for r, _ in pairs]
            q['options_zhuyin'] = [z for _, z in pairs]
            # after answering, the sentence with the answer in it (不 / 一 may change tone there)
            if '（　）' in q['q']:
                q['full_reading'], q['full_zhuyin'] = both(q['q'].replace('（　）', q['options'][q['answer']]),
                                                           q.get('full_reading'))
        for m in p.get('mistakes', []):
            for k in ('wrong', 'right'):
                m[k + '_reading'], m[k + '_zhuyin'] = both(m[k], m.get(k + '_reading'))


def check(data, name):
    problems = []
    ids = set()
    for i, p in enumerate(data['points'], 1):
        where = f'{name} #{i} {p.get("id")}'
        if not p.get('id') or p['id'] in ids:
            problems.append(f'{where}: missing or repeated id')
        ids.add(p.get('id'))
        for key in ('title', 'form', 'explain'):
            if not (p.get(key) or {}).get('zh') or not (p.get(key) or {}).get('en'):
                problems.append(f'{where}: {key} needs zh and en')
        if not p.get('pattern'):
            problems.append(f'{where}: no pattern')
        for n_ in p.get('notes', []):
            if not n_.get('zh') or not n_.get('en'):
                problems.append(f'{where}: a note needs zh and en')
        for m in p.get('mistakes', []):
            if not all(m.get(k) for k in ('wrong', 'right', 'zh', 'en')):
                problems.append(f'{where}: a mistake needs wrong, right, zh, en')
            for k in ('wrong', 'right'):
                if re.search(r'（[^）ぁ-ゟ]*[一-鿿][^）ぁ-ゟ]*）', m.get(k, '')):
                    problems.append(f'{where}: Chinese note inside the Japanese "{k}": {m[k]} — put it in zh')
        # Japanese examples: ja + kana (the reading is spoken); other languages: text
        need = ('ja', 'kana', 'zh', 'en') if data['lang'] == 'ja' else ('text', 'zh', 'en')
        for ex in p.get('examples', []):
            if not all(ex.get(k) for k in need):
                problems.append(f'{where}: example needs {", ".join(need)}: {ex}')
        if len(p.get('examples', [])) < 2:
            problems.append(f'{where}: fewer than 2 examples')
        hard_seen = False
        for q in p.get('quiz', []):
            if q.get('hard'):
                hard_seen = True
            elif hard_seen:
                problems.append(f'{where}: the easy questions come first, then the hard ones: {q.get("q")}')
            if q.get('type') not in (None, 'order'):
                problems.append(f'{where}: unknown question type {q.get("type")}')
            opts = q.get('options') or []
            if len(opts) != 4 or len(set(opts)) != 4:
                problems.append(f'{where}: a question needs 4 different options: {opts}')
            if not isinstance(q.get('answer'), int) or not 0 <= q['answer'] < len(opts):
                problems.append(f'{where}: bad answer index in {q}')
            if not q.get('zh') or not q.get('en'):
                problems.append(f'{where}: question needs zh and en: {q.get("q")}')
        if len(p.get('quiz', [])) < 2:
            problems.append(f'{where}: fewer than 2 questions')
    return problems


def main():
    import opencc
    from content_i18n import fill, report_missing
    from grammar_why import fill_why
    cc = opencc.OpenCC('tw2sp')
    OUT.mkdir(parents=True, exist_ok=True)
    index, problems = [], []
    for src in sorted(SRC.glob('*.json')):
        data = json.loads(src.read_text(encoding='utf-8'))
        if not data['points']:
            continue        # a language still being written stays off the page
        if data.get('order_style', 'star') not in ('star', 'arrange'):
            problems.append(f'{src.name}: order_style is "star" or "arrange"')
        prepare_quiz(data, problems, src.name)
        problems += check(data, src.name)
        if data['lang'] == 'zh':
            add_zh_readings(data, problems, src.name)
        missing_why = fill_why(data)                 # quiz[].why (tools/grammar_why.py)
        if missing_why:
            print(f'  {src.name}: {missing_why} questions without the why of each option — run python tools/grammar_why.py')
        add_hans(data, cc)
        report_missing(fill(data), src.name)   # ja ko ru fr es de (tools/content_i18n.py)
        data.pop('note', None)
        (OUT / src.name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        index.append({'id': data['id'], 'lang': data['lang'], 'level': data['level'], 'order': data.get('order', 0),
                      'count': len(data['points'])})
        print(f'{src.name}: {len(data["points"])} points')
    if problems:
        sys.exit('\n'.join(problems))
    # easiest level first within a language (each source file sets "order")
    # languages in the site's usual order (日 韓 英 中 法 俄 …), easiest level first
    lang_order = ['ja', 'ko', 'en', 'zh', 'fr', 'ru', 'es', 'de']
    index.sort(key=lambda s: (lang_order.index(s['lang']) if s['lang'] in lang_order else 99, s['order']))
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
