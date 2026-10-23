"""Posts tools/audio_check.py's report to the owner's Discord channel for it (#錄音檢查):
progress per language, what is missing, what Gemini checked and what it cost, and every
new problem — with the clip attached, so it can be played right in Discord. A problem is
attached only the first time (state["reported"]); later reports just count it.

Usage: python tools/audio_check_report.py <report.json> <state.json> --site DIR [--queue DIR]
Env: DISCORD_AUDIO_QA_WEBHOOK (without it the messages are only printed), RUN_URL.
"""
import argparse, json, os, sys, time, urllib.error, urllib.request, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

NAMES = {'ja': '日文', 'ko': '韓文', 'zh-TW': '中文（台灣）', 'zh-CN': '中文（大陸）', 'en-US': '英文（美式）', 'en-GB': '英文（英式）',
         'fr': '法文', 'ru': '俄文', 'es': '西班牙文', 'de': '德文', 'listening/ja': '日文聽解'}
WHY = {'silent': '幾乎沒有聲音', 'too_short': '太短（可能沒唸完）', 'too_long': '太長（可能多唸了）', 'gap': '中間有很長的空白',
       'clipping': '音量破音', 'broken': '檔案壞掉', 'content:missing_words': '少唸了字', 'content:extra_words': '多唸了字',
       'content:wrong_words': '唸錯了', 'content:not_speech': '不是人聲', 'content:wrong_language': '語言不對', 'content:garbled': '聽不清楚／亂碼'}
FILES_PER_MSG = 10


def post(hook, content, files=()):
    if not hook:
        print(content, [f.name for f in files])
        return
    boundary = uuid.uuid4().hex
    body = []
    body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n'.encode()
                + json.dumps({'content': content[:1990], 'allowed_mentions': {'parse': []}}).encode() + b'\r\n')
    for i, f in enumerate(files):
        body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="files[{i}]"; filename="{f.name}"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()
                    + f.read_bytes() + b'\r\n')
    body.append(f'--{boundary}--\r\n'.encode())
    req = urllib.request.Request(hook, b''.join(body), {'Content-Type': f'multipart/form-data; boundary={boundary}', 'User-Agent': 'hanabi-audio-check'})
    for attempt in range(3):
        try:
            urllib.request.urlopen(req, timeout=60)
            return
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5)
                continue
            raise
    time.sleep(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('report')
    ap.add_argument('state')
    ap.add_argument('--site', required=True)
    ap.add_argument('--queue')
    args = ap.parse_args()
    rep = json.loads(Path(args.report).read_text(encoding='utf-8'))
    state_f = Path(args.state)
    state = json.loads(state_f.read_text(encoding='utf-8')) if state_f.exists() else {}
    reported = set(state.get('reported', []))
    hook = os.environ.get('DISCORD_AUDIO_QA_WEBHOOK', '')
    today = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime('%Y-%m-%d')

    lines = [f'🔍 **Hanabi 錄音檢查** {today}']
    for lang, r in rep['langs'].items():
        parts = []
        for kind, label in (('word', '單字'), ('sentence', '句子'), ('listening', '台詞')):
            v = r.get(kind)
            if not v:
                continue
            done = v['ok'] + v['queued']
            s = f'{label} {done}/{v["total"]}'
            if v['queued']:
                s += f'（{v["queued"]} 等上線）'
            if v['waiting']:
                s += f'（{v["waiting"]} 等 Gemini 錄）'
            if v['missing']:
                s += f' ⚠️ 缺 {v["missing"]}'
            parts.append(s)
        lines.append(f'・{NAMES.get(lang, lang)}：' + '　'.join(parts))
        if r.get('missing_examples'):
            lines.append('　缺少錄音：' + '、'.join(r['missing_examples'][:5]))
    if rep.get('content_checked'):
        lines.append(f'🎧 Gemini 這次聽了 **{rep["content_checked"]}** 段（約 US${rep["content_cost"]:.2f}），還有 {max(0, rep["content_todo"] - rep["content_checked"])} 段沒聽')
    elif rep.get('content_todo'):
        lines.append(f'🎧 還有 {rep["content_todo"]} 段等 Gemini 聽（約 US${rep["content_estimate"]:.2f}）')
    probs = rep['problems']
    new = [p for p in probs if f'{p["lang"]}|{p["fid"]}|{",".join(p["issues"])}' not in reported]
    if not probs:
        lines.append('✅ 沒有發現問題')
    else:
        lines.append(f'❗ 有問題的錄音：**{len(probs)}** 個' + (f'（這次新發現 {len(new)} 個，附在下面）' if new else '（都報告過了）'))
    if os.environ.get('RUN_URL'):
        lines.append(os.environ['RUN_URL'])
    post(hook, '\n'.join(lines))

    roots = {'site': Path(args.site), 'queue': Path(args.queue) if args.queue else Path(args.site)}
    for n in range(0, len(new), FILES_PER_MSG):
        chunk = new[n:n + FILES_PER_MSG]
        text, files = [], []
        for i, p in enumerate(chunk):
            why = '、'.join(WHY.get(x, x) for x in p['issues'])
            heard = f'（聽到：{p["heard"][:60]}）' if p.get('heard') else ''
            text.append(f'{n + i + 1}. {NAMES.get(p["lang"], p["lang"])}「{p["text"][:60]}」— {why}{heard}')
            f = roots[p.get('root', 'site')] / p['path']
            if f.exists():
                files.append(f)
        post(hook, '\n'.join(text), files)
        for p in chunk:
            reported.add(f'{p["lang"]}|{p["fid"]}|{",".join(p["issues"])}')
    state['reported'] = sorted(reported)
    state_f.write_text(json.dumps(state, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    main()
