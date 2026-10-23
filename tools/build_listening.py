"""Builds the 聽解 (listening) page's data and audio.

Sets are hand-written in tools/listening/<id>.json (original content only — the
item types follow the JLPT listening sections, which is fair to follow; real exam
questions are copyrighted):

    {id, lang, level, order,
     types?: [...],              # the level's item types in exam order (問題 1, 2, …);
                                 # default task, point, utterance, response (N5 / N4)
     mock_plays?: 1,             # plays per item in a mock exam (JLPT: once)
     mock_counts?: {type: n},    # the official mix (in questions) a mock set must have
     read_secs?: 10,             # ポイント理解: time to read the options
     sets: [{id, mock?: true, items: [item…]}]}
    item = {type: task | point | outline | utterance | response | integrated,
            scene?: {emoji, zh, en},              # shown on screen (utterance: required)
            lines: [{who, s, zh, en}],            # what is played, in order
            # one question (the usual case):
            options: [...], answer: index, explain: {zh, en},
            # or several about the same recording (統合理解, HSK 4+, TOEIC Part 3…):
            questions: [{q?: {who, s, zh, en}, spoken?: bool, options, answer, explain}],
            words?: [{w, r, zh, en, m?}]}         # glossary, underlined in the transcript
    Options are printed {t, emoji?, zh?, en?} for task / point (and integrated unless
    spoken), spoken {who, s, zh, en} for utterance / response (3) and outline (4).
    who: N narrator, F / M a woman / a man, F2 / M2 a second woman / man (three
    speakers in 統合理解).

Japanese is written like the 閱讀 page: 漢字{かな}, the reading of the kanji run
right before it (tools/build_reading.py sentence()). The output gives every spoken
line its segments, plain text, kana and an audio id; the audio is rendered here
with Google Cloud TTS (tools/.google-tts.env) into data/audio/listening/<lang>/<id>.mp3,
one voice per speaker (VOICES: narrator, woman, man), spoken from the kana so the
reading is the one taught (a spoken option's number is its own narrator clip, `na`,
played with a pause before the option). id = cyrb53 of "who|plain|said" (tools/build_audio.py
audio_id) — the page reads it from the data, it never computes it. Existing files
are kept. Checks: furigana / glossary problems (as on the 閱讀 page), option counts
(4 for task / point, 3 for utterance / response), answer in range, every line and
explanation translated, each set's mix of types.

Usage: python tools/build_listening.py [--no-audio]
"""
import argparse, hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'listening'
OUT = ROOT / 'data' / 'listening'
AUDIO = ROOT / 'data' / 'audio' / 'listening'
IMG = ROOT / 'data' / 'listening' / 'img'
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_reading import sentence                 # noqa: E402
import build_audio as ba                           # noqa: E402

# per language: Google voice for the narrator (N), a woman (F) and a man (M) — picked
# by the owner by ear on the mockup (2026-10-10)
VOICES = {
    'ja': ('ja-JP', {'N': 'ja-JP-Chirp3-HD-Kore', 'F': 'ja-JP-Chirp3-HD-Erinome', 'M': 'ja-JP-Chirp3-HD-Charon',
                     'F2': 'ja-JP-Chirp3-HD-Leda', 'M2': 'ja-JP-Chirp3-HD-Fenrir'}),
}
TYPES = ('task', 'point', 'outline', 'utterance', 'response', 'integrated')
DEFAULT_TYPES = ['task', 'point', 'utterance', 'response']
SPOKEN = {'utterance': 3, 'response': 3, 'outline': 4}     # types whose options are read aloud
SPEAKERS = ('N', 'F', 'M', 'F2', 'M2')
LANG_ORDER = ['ja', 'ko', 'en', 'zh', 'fr', 'ru', 'es', 'de']


# pictures as on the JLPT paper (tools/listening/pics.json, drawn by tools/build_listening_img.py):
# an item with a description gets `pic` {f: file id, kind: grid|scene} once its picture exists
PICS = {k: v for k, v in json.loads((SRC / 'pics.json').read_text(encoding='utf-8')).items() if not k.startswith('_')}
PIC_STYLE = ('Black-and-white line illustration in the style of a Japanese language proficiency test booklet (JLPT): '
             'clean even ink outlines, light gray flat shading only, simple friendly anime-like people, plain white background. '
             'Absolutely no text, no letters, no numbers, no captions, no speech bubbles anywhere in the image.')


def pic_prompt(spec):
    """(prompt, aspect ratio) for one picture description."""
    if 'grid' in spec:
        g = spec['grid']
        where = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right']
        return ('A 2x2 grid of four equal square panels separated by thin black lines, with a thin black frame around each panel. '
                + g['cast'][0].upper() + g['cast'][1:] + '. '
                + ' '.join(f'{w}: {p}.' for w, p in zip(where, g['panels'])) + ' ' + PIC_STYLE, '1:1')
    sc = spec['scene']
    return ('One single scene: ' + sc['desc'] + '. Exactly ONE bold solid black arrow in the whole picture, pointing down at '
            + sc['arrow'] + '. Only one arrow; nobody else has an arrow. ' + PIC_STYLE, '4:3')


def pic_id(spec):
    return hashlib.sha1(pic_prompt(spec)[0].encode('utf-8')).hexdigest()[:12]


def item_pic(key, it, lang, problems):
    spec = PICS.get(key)
    if not spec:
        return None
    first = re.sub(r'\{[^}]*\}', '', it['lines'][0]['s'])
    want = 'grid' if it.get('type') == 'task' else 'scene' if it.get('type') == 'utterance' else None
    if not first.startswith(spec['first']) or want not in spec:
        problems.append(f'{key}: tools/listening/pics.json describes another item ({spec["first"]!r}, a {want or it.get("type")} is here)')
        return None
    f = pic_id(spec)
    return {'f': f, 'kind': want} if (IMG / lang / f'{f}.webp').exists() else None


# spoken options are numbered aloud, as in the exam (いち … に … さん …): the narrator
# says the number as a clip of its own and the page pauses before the option
# (until 2026-10-22 the number was the start of the option's clip and ran into it)
NUMBERS = {'ja': ['いち。', 'に。', 'さん。', 'よん。']}


def spoken(line, where, words, problems, lang, jobs, number=None):
    """A spoken line as output: segments, plain, kana, audio id; queues its audio
    (an option also gets `na` / `nk`, the narrator's clip of its number and that text)."""
    who = line.get('who')
    if who not in SPEAKERS:
        problems.append(f'{where}: speaker must be one of {SPEAKERS}, not {who!r}')
        who = 'N'
    segs, plain, kana = sentence(line['s'], words, where, problems, lang)
    for k in ('zh', 'en'):
        if not line.get(k):
            problems.append(f'{where}: no {k} translation for {plain}')
    aid = ba.audio_id(f'{who}|{plain}|{kana}')
    jobs[aid] = (who, kana)
    out = {'who': who, 't': segs, 'plain': plain, 'kana': kana, 'a': aid,
           'zh': line.get('zh', ''), 'en': line.get('en', '')}
    if number is not None:
        nk = NUMBERS[lang][number]
        out['na'] = ba.audio_id(f'N|{nk}|{nk}')
        out['nk'] = nk
        jobs[out['na']] = ('N', nk)
    return out


def build_question(q, typ, where, words, problems, lang, jobs, multi):
    spoken_opts = typ in SPOKEN or bool(q.get('spoken'))
    want = SPOKEN.get(typ, 4)
    if len(q.get('options', [])) != want:
        problems.append(f'{where}: {typ} needs {want} options, has {len(q.get("options", []))}')
    if not 0 <= q.get('answer', -1) < len(q.get('options', [])):
        problems.append(f'{where}: answer out of range')
    for k in ('zh', 'en'):
        if not (q.get('explain') or {}).get(k):
            problems.append(f'{where}: no {k} explanation')
    if multi and not q.get('q'):
        problems.append(f'{where}: each of several questions needs its spoken question "q"')
    qline = spoken(q['q'], f'{where} question', words, problems, lang, jobs) if q.get('q') else None
    if spoken_opts:
        options = [spoken(o, f'{where} option {i + 1}', [], problems, lang, jobs, i) for i, o in enumerate(q['options'])]
    else:
        options = []
        for i, o in enumerate(q['options']):
            segs, plain, _ = sentence(o['t'], None, f'{where} option {i + 1}', problems, lang, short=True)
            options.append({'t': segs, 'plain': plain, 'emoji': o.get('emoji', ''),
                            'zh': o.get('zh', ''), 'en': o.get('en', '')})
    return {'q': qline, 'spoken': spoken_opts, 'options': options, 'answer': q.get('answer', 0),
            'explain': q.get('explain', {})}


def build(src, problems, jobs):
    data = json.loads(src.read_text(encoding='utf-8'))
    lang = data['lang']
    types = data.get('types', DEFAULT_TYPES)
    read_secs = data.get('read_secs', 10)
    for t in types:
        if t not in TYPES:
            problems.append(f'{src.stem}: unknown type {t!r} in "types"')
    sets = []
    for set_ in data['sets']:
        items = []
        mix = {t: 0 for t in TYPES}
        for k, it in enumerate(set_['items']):
            where = f'{src.stem}/{set_["id"]} #{k + 1}'
            typ = it.get('type')
            if typ not in types:
                problems.append(f'{where}: type {typ!r} is not one of the level types {types}')
                continue
            words = it.get('words', [])
            lines = [spoken(l, f'{where} line {i + 1}', words, problems, lang, jobs) for i, l in enumerate(it['lines'])]
            qs = it.get('questions') or [{'options': it.get('options', []), 'answer': it.get('answer', -1),
                                          'explain': it.get('explain')}]
            questions = [build_question(q, typ, f'{where} Q{n + 1}' if len(qs) > 1 else where, words, problems,
                                        lang, jobs, len(qs) > 1) for n, q in enumerate(qs)]
            mix[typ] += len(questions)
            if typ == 'utterance' and not it.get('scene'):
                problems.append(f'{where}: an utterance item needs a scene')
            for k2 in ('zh', 'en'):
                if it.get('scene') and not it['scene'].get(k2):
                    problems.append(f'{where}: no {k2} scene text')
            # every glossary word must show up in the transcript
            hit = {sg[2] for l in lines for sg in l['t'] if sg[2] is not None}
            hit |= {sg[2] for q in questions if q['q'] for sg in q['q']['t'] if sg[2] is not None}
            for gi, g in enumerate(words):
                if gi not in hit:
                    problems.append(f'{where}: glossary word {g["w"]} never appears (set "m")')
            pic = item_pic(f'{data["id"]}/{set_["id"]}/{k}', it, lang, problems)
            items.append({'type': typ, 'scene': it.get('scene'), 'lines': lines, 'questions': questions,
                          **({'pic': pic} if pic else {}),
                          'read': it.get('read', read_secs if typ == 'point' else 0),
                          'words': [{k3: g[k3] for k3 in ('w', 'r', 'zh', 'en')} for g in words]})
        if set_.get('mock'):
            want = data.get('mock_counts')
            got = {t: n for t, n in mix.items() if n}
            if want and got != want:
                problems.append(f'{src.stem}/{set_["id"]}: a mock set should have {want} questions, has {got}')
            # exam order: all of 問題1, then 問題2, ...
            seq = [types.index(i['type']) for i in items]
            if seq != sorted(seq):
                problems.append(f'{src.stem}/{set_["id"]}: a mock set must keep the types in exam order')
        elif any(mix[t] == 0 for t in types):
            problems.append(f'{src.stem}/{set_["id"]}: a set should have every type, has {mix}')
        sets.append({'id': set_['id'], 'mock': bool(set_.get('mock')), 'items': items})
    return {'id': data['id'], 'lang': lang, 'level': data['level'], 'order': data['order'], 'types': types,
            'mock_plays': data.get('mock_plays', 1), 'sets': sets}


def render_audio(lang, jobs):
    if lang not in VOICES:
        print(f'  ! no voices for {lang} yet — audio skipped')
        return
    code, voices = VOICES[lang]
    d = AUDIO / lang
    d.mkdir(parents=True, exist_ok=True)
    todo = [(aid, who, kana) for aid, (who, kana) in jobs.items() if not (d / f'{aid}.mp3').exists()]
    print(f'  audio {lang}: {len(jobs)} lines, {len(todo)} to render')
    if not todo:
        return
    env = ba.load_env()
    for aid, who, kana in todo:
        clip = ba.synthesize(env, code, voices[who], kana)
        (d / f'{aid}.mp3').write_bytes(ba.to_mp3(clip))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-audio', action='store_true')
    args = ap.parse_args()
    import opencc
    from build_grammar import add_hans
    from content_i18n import fill, report_missing
    cc = opencc.OpenCC('tw2sp')
    problems, index = [], []
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob('*.json')):
        if src.name == 'pics.json':          # the picture descriptions, not a level
            continue
        jobs = {}
        data = build(src, problems, jobs)
        if not data['sets']:
            continue
        add_hans(data, cc)
        report_missing(fill(data), data['id'])   # ja ko ru fr es de (tools/content_i18n.py)
        (OUT / f'{data["id"]}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        n = sum(len(s['items']) for s in data['sets'])
        mocks = sum(1 for s in data['sets'] if s['mock'])
        index.append({'id': data['id'], 'lang': data['lang'], 'level': data['level'], 'order': data['order'],
                      'count': len(data['sets']), 'items': n, 'mocks': mocks})
        print(f'{data["id"]}: {len(data["sets"])} sets ({mocks} mock), {n} items')
        if not args.no_audio and not problems:
            render_audio(data['lang'], jobs)
    index.sort(key=lambda l: (LANG_ORDER.index(l['lang']) if l['lang'] in LANG_ORDER else 99, l['order']))
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    if problems:
        print('\nPROBLEMS:')
        for p in problems:
            print('  ' + p)
        sys.exit(1)


if __name__ == '__main__':
    main()
