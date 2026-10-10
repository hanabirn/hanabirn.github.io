"""Builds the reading passages: tools/reading/<id>.json -> data/reading/<id>.json.

The source files are hand-written (see the note at the top of each). This script
checks them and turns each sentence into segments the 閱讀 page can draw:

    "わたしは毎朝{まいあさ}七時{しちじ}に起{お}きます。"
    -> [["わたしは", null, null], ["毎朝", "まいあさ", 0], ["七時", "しちじ", null], ["に", null, null], ...]

i.e. [text, furigana, glossary index]. The furigana in {…} belongs to the run of
kanji right before it; a glossary word is underlined wherever one of its forms
("m", default the word itself) appears in a sentence. Each sentence also gets its
plain text and its reading in kana (the recordings are spoken from the kana, see
tools/build_audio.py). Simplified Chinese is added next to every "zh" (OpenCC
tw2sp, like the grammar lessons). It writes data/reading/index.json, the list the
page offers, and prints glossary words that aren't in the level's word lists.
Don't edit data/reading/ by hand — edit the source and re-run.

Usage: pip install opencc-python-reimplemented
       python tools/build_reading.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'reading'
OUT = ROOT / 'data' / 'reading'
sys.stdout.reconfigure(encoding='utf-8')

KANJI = r'[㐀-䶿一-鿿々〆ヶ]'
RUBY = re.compile(r'(' + KANJI + r'+)\{([^{}]+)\}')
LANG_ORDER = ['ja', 'ko', 'en', 'zh', 'fr', 'ru', 'es', 'de']
# word lists a level's glossary is checked against (that level and the easier ones)
LEVEL_SETS = {('ja', 'N5'): ['jlpt_n5', 'tp_ja_'], ('ja', 'N4'): ['jlpt_n5', 'jlpt_n4', 'tp_ja_']}
MCQ_COUNT, TF_COUNT = 5, 3


def tokens(marked):
    """'七時{しちじ}に' -> [('七時', 'しちじ'), ('に', None)]"""
    out, pos = [], 0
    for m in RUBY.finditer(marked):
        if m.start() > pos:
            out.append((marked[pos:m.start()], None))
        out.append((m.group(1), m.group(2)))
        pos = m.end()
    if pos < len(marked):
        out.append((marked[pos:], None))
    return out


def sentence(marked, glossary, where, problems):
    """segments, plain text and kana of one sentence; glossary=None for questions"""
    if '{' in RUBY.sub('', marked) or '}' in RUBY.sub('', marked):
        problems.append(f'{where}: a {{reading}} without kanji right before it: {marked}')
    toks = tokens(marked)
    plain = ''.join(t for t, _ in toks)
    kana = ''.join(r or t for t, r in toks)
    bare = [ch for t, r in toks if r is None for ch in t if re.match(KANJI, ch)]
    if bare:
        problems.append(f'{where}: kanji without furigana {"".join(bare)}: {marked}')
    # per character: which ruby group it belongs to (None = plain kana / punctuation)
    group, owner = [], []
    for gi, (t, r) in enumerate(toks):
        for _ in t:
            group.append(gi if r else None)
            owner.append(gi)
    gloss = [None] * len(plain)
    for gi, g in enumerate(glossary or []):
        for form in g.get('m') or [g['w']]:
            for m in re.finditer(re.escape(form), plain):
                a, b = m.start(), m.end()
                cut_start = a > 0 and group[a] is not None and group[a - 1] == group[a]
                cut_end = b < len(plain) and group[b - 1] is not None and group[b] == group[b - 1]
                if cut_start or cut_end:
                    problems.append(f'{where}: "{form}" cuts a furigana group in: {marked}')
                    continue
                if any(gloss[i] is not None for i in range(a, b)):
                    continue
                for i in range(a, b):
                    gloss[i] = gi
    # merge characters into segments: a ruby group stays whole, plain runs split where
    # the glossary underline starts or ends
    segs = []
    for i, ch in enumerate(plain):
        gi = owner[i]
        tok_text, tok_ruby = toks[gi]
        key = (gi if tok_ruby else None, gloss[i])
        if segs and segs[-1][3] == key and (tok_ruby is None or segs[-1][4] == gi):
            segs[-1][0] += ch
        else:
            segs.append([ch, tok_ruby, gloss[i], key, gi])
    return [[t, r, g] for t, r, g, _, _ in segs], plain, kana


def used(glossary):
    return {g for s in glossary for g in s}


def build(src, problems):
    data = json.loads(src.read_text(encoding='utf-8'))
    name = src.stem
    for key in ('id', 'lang', 'level', 'order', 'passages'):
        if key not in data:
            problems.append(f'{name}: missing "{key}"')
    out = {k: data[k] for k in ('id', 'lang', 'level', 'order')}
    out['passages'] = []
    seen = set()
    for p in data['passages']:
        where = f'{name}/{p.get("id")}'
        if p['id'] in seen:
            problems.append(f'{where}: duplicate id')
        seen.add(p['id'])
        gl = p.get('glossary', [])
        title, _, title_kana = sentence(p['title']['text'], None, where + ' title', problems)
        paras, hits, length = [], set(), 0
        for k, para in enumerate(p['paragraphs']):
            sents = []
            for s in para['s']:
                segs, plain, kana = sentence(s, gl, f'{where} ¶{k + 1}', problems)
                hits |= {g for _, _, g in segs if g is not None}
                length += len(re.sub(r'[\s、。「」！？・，．]', '', plain))
                sents.append({'t': segs, 'plain': plain, 'kana': kana})
            for lang in ('zh', 'en'):
                if not para.get(lang):
                    problems.append(f'{where} ¶{k + 1}: no {lang} translation')
            paras.append({'s': sents, 'zh': para.get('zh', ''), 'en': para.get('en', '')})
        for gi, g in enumerate(gl):
            if gi not in hits:
                problems.append(f'{where}: glossary word {g["w"]} never appears (set "m")')
        mcq = p.get('mcq', [])
        tf = p.get('tf', [])
        if len(mcq) != MCQ_COUNT or len(tf) != TF_COUNT:
            problems.append(f'{where}: {len(mcq)} multiple-choice and {len(tf)} true/false (want {MCQ_COUNT} + {TF_COUNT})')
        out_mcq = []
        for qi, q in enumerate(mcq):
            qw = f'{where} Q{qi + 1}'
            if len(q.get('options', [])) != 4 or not 0 <= q.get('answer', -1) < 4:
                problems.append(f'{qw}: needs 4 options and an answer 0-3')
            if len(set(q['options'])) != len(q['options']):
                problems.append(f'{qw}: two options are the same')
            for lang in ('zh', 'en'):
                if not q.get(lang):
                    problems.append(f'{qw}: no {lang} explanation')
            out_mcq.append({'q': sentence(q['q'], None, qw, problems)[0],
                            'options': [sentence(o, None, qw, problems)[0] for o in q['options']],
                            'answer': q['answer'], 'zh': q.get('zh', ''), 'en': q.get('en', '')})
        out_tf = []
        for ti, t in enumerate(tf):
            tw = f'{where} TF{ti + 1}'
            if not isinstance(t.get('answer'), bool):
                problems.append(f'{tw}: answer must be true or false')
            for lang in ('zh', 'en'):
                if not t.get(lang):
                    problems.append(f'{tw}: no {lang} explanation')
            out_tf.append({'s': sentence(t['s'], None, tw, problems)[0], 'answer': t['answer'],
                           'zh': t.get('zh', ''), 'en': t.get('en', '')})
        if sum(t['answer'] for t in tf) in (0, len(tf)) and tf:
            problems.append(f'{where}: the true/false answers are all the same')
        out['passages'].append({
            'id': p['id'], 'topic': p.get('topic', ''),
            'title': {'t': title, 'kana': title_kana, 'zh': p['title'].get('zh', ''), 'en': p['title'].get('en', '')},
            'length': length, 'paragraphs': paras,
            'glossary': [{k: g[k] for k in ('w', 'r', 'zh', 'en')} for g in gl],
            'mcq': out_mcq, 'tf': out_tf})
    return out


def level_words(lang, level):
    words = set()
    for prefix in LEVEL_SETS.get((lang, level), []):
        for f in (ROOT / 'data' / 'vocab').glob(prefix + '*.json'):
            for row in json.loads(f.read_text(encoding='utf-8'))['words']:
                words.add(row[0])
                if len(row) > 1 and row[1]:
                    words.add(row[1])
    return words


def main():
    import opencc
    cc = opencc.OpenCC('tw2sp')
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from build_grammar import add_hans
    problems, index = [], []
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob('*.json')):
        data = build(src, problems)
        if not data['passages']:
            continue
        known = level_words(data['lang'], data['level'])
        if known:
            for p in data['passages']:
                stem = lambda w: w[:-2] if w.endswith('する') else w      # 勉強する: the lists have 勉強
                outside = [g['w'] for g in p['glossary'] if stem(g['w']) not in known and stem(g['r']) not in known]
                if outside:
                    print(f'  {data["id"]}/{p["id"]}: glossary words outside the level lists: {", ".join(outside)}')
        add_hans(data, cc)
        (OUT / f'{data["id"]}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        index.append({'id': data['id'], 'lang': data['lang'], 'level': data['level'], 'order': data['order'],
                      'count': len(data['passages'])})
        print(f'{data["id"]}: {len(data["passages"])} passages, lengths {[p["length"] for p in data["passages"]]}')
    index.sort(key=lambda l: (LANG_ORDER.index(l['lang']) if l['lang'] in LANG_ORDER else 99, l['order']))
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    if problems:
        print('\nPROBLEMS:')
        for p in problems:
            print('  ' + p)
        sys.exit(1)


if __name__ == '__main__':
    main()
