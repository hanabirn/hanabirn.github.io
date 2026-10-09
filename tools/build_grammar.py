"""Builds the grammar lessons: tools/grammar/<id>.json -> data/grammar/<id>.json.

The source files are hand-written (Traditional Chinese + English). This script
checks them, adds Simplified Chinese (OpenCC tw2sp, like i18n/zh-Hans.js) next to
every "zh" text, and writes data/grammar/index.json, the list the site's 文法
page offers. Don't edit data/grammar/ by hand — edit the source and re-run.

Usage: pip install opencc-python-reimplemented
       python tools/build_grammar.py
"""
import json, re, sys, unicodedata
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


# ---------- Chinese: bopomofo from the hand-written pinyin ----------
# The examples' pinyin is the reference (it already carries tone sandhi such as
# bú / yí and the neutral tones), so the zhuyin is derived from it rather than
# guessed from the characters: the pinyin is cut into syllables (one per
# character) and each syllable converted. A sentence that doesn't line up is
# reported instead of getting a wrong reading.
_SYLLABLES = None


def _toneless(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn' or c == '̈')
    return unicodedata.normalize('NFC', s).replace('ü', 'v')


def _syllables():
    global _SYLLABLES
    if _SYLLABLES is None:
        from pypinyin.pinyin_dict import pinyin_dict
        _SYLLABLES = {_toneless(r) for v in pinyin_dict.values() for r in v.split(',')}
        _SYLLABLES |= {'r'}          # 兒化
    return _SYLLABLES


def _split(word):
    """All ways to cut one pinyin word into syllables (fewest pieces first)."""
    low = _toneless(word)
    out = []

    def go(i, acc):
        if i == len(low):
            out.append(acc)
            return
        for j in range(len(low), i, -1):
            if low[i:j] in _syllables():
                go(j, acc + [word[i:j]])

    go(0, [])
    return sorted(out, key=len)


def zhuyin_for(text, reading):
    from pypinyin.style.bopomofo import BopomofoConverter
    import itertools
    hanzi = [c for c in text if '一' <= c <= '鿿']
    words = [w for w in re.split(r"[^A-Za-zÀ-ɏüǛ-ͯ]+", unicodedata.normalize('NFC', reading)) if w]
    options = [_split(w)[:6] for w in words]
    if any(not o for o in options):
        raise ValueError(f'unknown pinyin in {reading!r}')
    for combo in itertools.product(*options):
        sylls = [s for part in combo for s in part]
        if len(sylls) == len(hanzi):
            break
    else:
        raise ValueError(f'{len(hanzi)} characters but the pinyin does not split into as many syllables: {reading!r}')
    conv = BopomofoConverter()
    bpmf = []
    for s in sylls:
        z = conv.to_bopomofo(s.lower())
        if z.endswith('˙'):              # Taiwan writes the neutral-tone dot first
            z = '˙' + z[:-1]
        bpmf.append(z)
    out, k = [], 0
    for c in text:
        if '一' <= c <= '鿿':
            out.append((' ' if out and not out[-1].endswith(' ') else '') + bpmf[k] + ' ')
            k += 1
        elif c.strip():
            if out:
                out[-1] = out[-1].rstrip()   # punctuation sits right after the syllable
            out.append(c + ' ')
    return re.sub(r' +', ' ', ''.join(out)).strip()


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
        for q in p.get('quiz', []):
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
    cc = opencc.OpenCC('tw2sp')
    OUT.mkdir(parents=True, exist_ok=True)
    index, problems = [], []
    for src in sorted(SRC.glob('*.json')):
        data = json.loads(src.read_text(encoding='utf-8'))
        if not data['points']:
            continue        # a language still being written stays off the page
        problems += check(data, src.name)
        if data['lang'] == 'zh':
            for p in data['points']:
                for ex in p['examples']:
                    try:
                        ex['zhuyin'] = zhuyin_for(ex['text'], ex.get('reading', ''))
                    except ValueError as e:
                        problems.append(f'{src.name} {p["id"]}: {e}')
        add_hans(data, cc)
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
