"""Builds the 聽解 (listening) page's data and audio.

Sets are hand-written in tools/listening/<id>.json (original content only — the
item types follow the JLPT listening sections, which is fair to follow; real exam
questions are copyrighted):

    {id, lang, level, order, sets: [{id, items: [item…]}]}
    item = {type: task | point | utterance | response,
            scene?: {emoji, zh, en},              # shown on screen (utterance: required)
            lines: [{who: N|M|F, s, zh, en}],     # what is played, in order
            options: [...],                        # task / point: {t, emoji?, zh?, en?} shown
                                                   # utterance / response: {who, s, zh, en} spoken
            answer: index, explain: {zh, en},
            words?: [{w, r, zh, en, m?}]}         # glossary, underlined in the transcript

Japanese is written like the 閱讀 page: 漢字{かな}, the reading of the kanji run
right before it (tools/build_reading.py sentence()). The output gives every spoken
line its segments, plain text, kana and an audio id; the audio is rendered here
with Google Cloud TTS (tools/.google-tts.env) into data/audio/listening/<lang>/<id>.mp3,
one voice per speaker (VOICES: narrator, woman, man), spoken from the kana so the
reading is the one taught (options with their number in front). id = cyrb53 of "who|plain|said" (tools/build_audio.py
audio_id) — the page reads it from the data, it never computes it. Existing files
are kept. Checks: furigana / glossary problems (as on the 閱讀 page), option counts
(4 for task / point, 3 for utterance / response), answer in range, every line and
explanation translated, each set's mix of types.

Usage: python tools/build_listening.py [--no-audio]
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'listening'
OUT = ROOT / 'data' / 'listening'
AUDIO = ROOT / 'data' / 'audio' / 'listening'
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_reading import sentence                 # noqa: E402
import build_audio as ba                           # noqa: E402

# per language: Google voice for the narrator (N), a woman (F) and a man (M) — picked
# by the owner by ear on the mockup (2026-10-10)
VOICES = {
    'ja': ('ja-JP', {'N': 'ja-JP-Chirp3-HD-Kore', 'F': 'ja-JP-Chirp3-HD-Erinome', 'M': 'ja-JP-Chirp3-HD-Charon'}),
}
TYPES = ('task', 'point', 'utterance', 'response')
N_OPTIONS = {'task': 4, 'point': 4, 'utterance': 3, 'response': 3}
LANG_ORDER = ['ja', 'ko', 'en', 'zh', 'fr', 'ru', 'es', 'de']


# spoken options are numbered aloud, as in the exam (いち、… に、… さん、…)
NUMBERS = {'ja': ['いち、', 'に、', 'さん、']}


def spoken(line, where, words, problems, lang, jobs, number=None):
    """A spoken line as output: segments, plain, kana, audio id; queues its audio
    (an option's audio starts with its number; the transcript shows the line only)."""
    who = line.get('who')
    if who not in ('N', 'F', 'M'):
        problems.append(f'{where}: speaker must be N, F or M, not {who!r}')
        who = 'N'
    segs, plain, kana = sentence(line['s'], words, where, problems, lang)
    for k in ('zh', 'en'):
        if not line.get(k):
            problems.append(f'{where}: no {k} translation for {plain}')
    said = (NUMBERS[lang][number] if number is not None else '') + kana
    aid = ba.audio_id(f'{who}|{plain}|{said}')
    jobs[aid] = (who, said)
    return {'who': who, 't': segs, 'plain': plain, 'kana': kana, 'a': aid,
            'zh': line.get('zh', ''), 'en': line.get('en', '')}


def build(src, problems, jobs):
    data = json.loads(src.read_text(encoding='utf-8'))
    lang = data['lang']
    sets = []
    for set_ in data['sets']:
        items = []
        mix = {t: 0 for t in TYPES}
        for k, it in enumerate(set_['items']):
            where = f'{src.stem}/{set_["id"]} #{k + 1}'
            typ = it.get('type')
            if typ not in TYPES:
                problems.append(f'{where}: unknown type {typ!r}')
                continue
            mix[typ] += 1
            words = it.get('words', [])
            lines = [spoken(l, f'{where} line {i + 1}', words, problems, lang, jobs) for i, l in enumerate(it['lines'])]
            if len(it['options']) != N_OPTIONS[typ]:
                problems.append(f'{where}: {typ} needs {N_OPTIONS[typ]} options, has {len(it["options"])}')
            if not 0 <= it.get('answer', -1) < len(it['options']):
                problems.append(f'{where}: answer out of range')
            if typ in ('utterance', 'response'):
                options = [spoken(o, f'{where} option {i + 1}', [], problems, lang, jobs, i) for i, o in enumerate(it['options'])]
            else:
                options = []
                for i, o in enumerate(it['options']):
                    segs, plain, _ = sentence(o['t'], None, f'{where} option {i + 1}', problems, lang, short=True)
                    options.append({'t': segs, 'plain': plain, 'emoji': o.get('emoji', ''),
                                    'zh': o.get('zh', ''), 'en': o.get('en', '')})
            if typ == 'utterance' and not it.get('scene'):
                problems.append(f'{where}: an utterance item needs a scene')
            for k2 in ('zh', 'en'):
                if not (it.get('explain') or {}).get(k2):
                    problems.append(f'{where}: no {k2} explanation')
                if it.get('scene') and not it['scene'].get(k2):
                    problems.append(f'{where}: no {k2} scene text')
            # every glossary word must show up in the transcript
            hit = {sg[2] for l in lines for sg in l['t'] if sg[2] is not None}
            for gi, g in enumerate(words):
                if gi not in hit:
                    problems.append(f'{where}: glossary word {g["w"]} never appears (set "m")')
            items.append({'type': typ, 'scene': it.get('scene'), 'lines': lines, 'options': options,
                          'answer': it['answer'], 'explain': it['explain'],
                          'words': [{k3: g[k3] for k3 in ('w', 'r', 'zh', 'en')} for g in words]})
        if any(mix[t] == 0 for t in TYPES):
            problems.append(f'{src.stem}/{set_["id"]}: a set should have every type, has {mix}')
        sets.append({'id': set_['id'], 'items': items})
    return {'id': data['id'], 'lang': lang, 'level': data['level'], 'order': data['order'], 'sets': sets}


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
    cc = opencc.OpenCC('tw2sp')
    problems, index = [], []
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob('*.json')):
        jobs = {}
        data = build(src, problems, jobs)
        if not data['sets']:
            continue
        add_hans(data, cc)
        (OUT / f'{data["id"]}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        n = sum(len(s['items']) for s in data['sets'])
        index.append({'id': data['id'], 'lang': data['lang'], 'level': data['level'], 'order': data['order'],
                      'count': len(data['sets']), 'items': n})
        print(f'{data["id"]}: {len(data["sets"])} sets, {n} items')
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
