"""Re-records clips the recording check (tools/audio_check.py) found wrong, 2026-10-25.

Each clip is made again with the voice that made it — Gemini when data/audio/<lang>/index.json
lists it under "g", else the language's Google voice (backup voice on the later tries) — and a
take only replaces the old file once audio_check.second_opinion() hears it say its text. Up to
TRIES takes per clip; a clip with no good take keeps its old file and is listed at the end.
聽解 lines (listening/ja|<id>, listening/ko|<id>) are made again with their speaker's Google voice
(tools/build_listening.py VOICES), 2026-10-30.

  python tools/audio_rerecord.py ja|<fid> zh-TW|<fid> …      (keys as in the check's report)
  python tools/audio_rerecord.py --from keys.txt [--dry-run]

Mark a clip that is fine after all in tools/audio_check_ok.json instead (audio_check.py skips it).
"""
import argparse, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import audio_check as ac          # noqa: E402  (imports build_audio as ba and patches audio_id)
import build_audio as ba          # noqa: E402

TRIES = 4


def gemini_take(lang, text, key, attempt, kana=''):
    """one Gemini clip (samples at GEMINI_SR) and its model, or None (kana: Japanese's reading,
    for the length check)"""
    said = text
    if ba.spoken_chars(text) <= 4:          # lone words: 「word」 and word。 alternately (as build_audio)
        said = '「' + text + '」' if attempt % 2 == 0 else text + '。'
    for model in ba.GEMINI_LANG_ORDER.get(lang, ba.GEMINI_TTS_MODELS):
        if model in ba.GEMINI_SPENT or lang not in ba.GEMINI_MODEL_LANGS.get(model, {lang}):
            continue
        try:
            clip = ba.gemini_say(key, lang, said, model)
        except ba.QuotaSpent:
            ba.GEMINI_SPENT.add(model)
            continue
        return (clip, model) if ba.gemini_length_ok(text, clip, kana) else None
    raise ba.QuotaSpent(f'every Gemini model for {lang} is spent for today')


def google_take(env, lang, text, attempt):
    voice = ba.voice_for(env, lang) if attempt % 2 == 0 else ba.LANGS[lang][3]
    clip = ba.synthesize(env, ba.LANGS[lang][1], voice, text)
    return clip if ba.MIN_CLIP * ba.SR <= len(clip) <= 8 * ba.SR and ba.loud_enough(clip) else None


def listening_line(lang, fid):
    """(who, kana) of the 聽解 clip `fid` in data/listening/ (lang 'ja', 'ko'), or None"""
    for f in sorted((ac.ROOT / 'data' / 'listening').glob(lang + '_*.json')):
        stack = [json.loads(f.read_text(encoding='utf-8'))]
        while stack:
            x = stack.pop()
            if isinstance(x, list):
                stack += x
            elif isinstance(x, dict):
                if x.get('a') == fid:
                    return x['who'], x['kana']
                if x.get('na') == fid:
                    return 'N', x['nk']
                stack += x.values()
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('keys', nargs='*', help='lang|fid')
    ap.add_argument('--from', dest='src', help='a file with one lang|fid a line')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    keys = list(args.keys)
    if args.src:
        keys += [l.split()[0] for l in Path(args.src).read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
    texts = ac.collect(ac.ROOT)
    key = ba.gemini_key()
    env = None
    jobs_cache = {}
    failed = []
    for k in keys:
        lang, fid = k.split('|', 1)
        item = texts.get(lang, {}).get(fid)
        if not item:
            print(f'{k}: not a text the site speaks — skipped')
            failed.append(k)
            continue
        if lang.startswith('listening/'):
            # 聽解: the speaker's Google voice from tools/build_listening.py, no backup voice
            import build_listening as bl
            base = lang.split('/', 1)[1]
            who, kana = listening_line(base, fid)
            code, voices = bl.VOICES[base]
            print(f'{k} (Google, {who}): {item["key"]!r} → says {kana!r}', flush=True)
            if args.dry_run:
                continue
            env = env or ba.load_env()
            n = ac.letters(kana)
            done = False
            for attempt in range(TRIES):
                clip = ba.synthesize(env, code, voices[who], kana)
                secs = len(clip) / ba.SR
                if not ba.loud_enough(clip) or secs > 0.3 * n + 1.5:
                    print(f'   take {attempt + 1}: {secs:.1f}s for {n} letters — too long / quiet')
                    continue
                data = ba.to_mp3(clip)
                same, heard, diff, _ = ac.second_opinion(data, lang, item['say'], key)
                print(f'   take {attempt + 1}: {"OK" if same else "no"} ({secs:.1f}s) — heard {heard!r} {diff[:100]}', flush=True)
                if same:
                    (ba.OUT / 'listening' / base / f'{fid}.mp3').write_bytes(data)
                    done = True
                    break
            if not done:
                failed.append(k)
            continue
        if lang not in jobs_cache:
            jobs_cache[lang] = ba.jobs(lang)[0]
        files = jobs_cache[lang]
        d = ba.OUT / lang
        index = json.loads((d / 'index.json').read_text(encoding='utf-8'))
        gem = fid in set(index.get('g', []))
        text = ba.GEMINI_SAY.get((lang, fid), files[fid]) if gem else files[fid]
        print(f'{k} ({"Gemini" if gem else "Google"}): {item["key"]!r} → says {text!r}', flush=True)
        if args.dry_run:
            continue
        done = False
        for attempt in range(TRIES):
            if gem:
                try:
                    got = gemini_take(lang, text, key, attempt, files[fid] if lang == 'ja' else '')
                except ba.QuotaSpent:
                    print(f'   Gemini is spent for today for {lang} — run again tomorrow')
                    break
                if not got:
                    print('   take', attempt + 1, 'wrong length')
                    continue
                clip, model = got
                data = ba.to_mp3(clip, ba.GEMINI_SR)
            else:
                env = env or ba.load_env()
                clip = google_take(env, lang, text, attempt)
                if not clip:
                    print('   take', attempt + 1, 'too short / quiet')
                    continue
                data = ba.to_mp3(clip)
            same, heard, diff, _ = ac.second_opinion(data, lang, item['say'], key)
            print(f'   take {attempt + 1}: {"OK" if same else "no"} — heard {heard!r} {diff[:100]}', flush=True)
            if same:
                (d / f'{fid}.mp3').write_bytes(data)
                if gem:
                    index.setdefault('gm', {})[fid] = model.replace('gemini-', '')
                    (d / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
                done = True
                break
        if not done:
            failed.append(k)
    print(f'\n{len(keys) - len(failed)} of {len(keys)} re-recorded' + (f'; kept the old file: {", ".join(failed)}' if failed else ''))


if __name__ == '__main__':
    main()
