"""Builds the grammar lessons: tools/grammar/<id>.json -> data/grammar/<id>.json.

The source files are hand-written (Traditional Chinese + English). This script
checks them, adds Simplified Chinese (OpenCC tw2sp, like i18n/zh-Hans.js) next to
every "zh" text, and writes data/grammar/index.json, the list the site's 文法
page offers. Don't edit data/grammar/ by hand — edit the source and re-run.

Usage: pip install opencc-python-reimplemented
       python tools/build_grammar.py
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
        for ex in p.get('examples', []):
            if not all(ex.get(k) for k in ('ja', 'kana', 'zh', 'en')):
                problems.append(f'{where}: example needs ja, kana, zh, en: {ex}')
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
        problems += check(data, src.name)
        add_hans(data, cc)
        data.pop('note', None)
        (OUT / src.name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        index.append({'id': data['id'], 'lang': data['lang'], 'level': data['level'], 'order': data.get('order', 0),
                      'count': len(data['points'])})
        print(f'{src.name}: {len(data["points"])} points')
    if problems:
        sys.exit('\n'.join(problems))
    # easiest level first within a language (each source file sets "order")
    index.sort(key=lambda s: (s['lang'] != 'ja', s['lang'], s['order']))
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
