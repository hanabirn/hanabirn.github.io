"""The daily Gemini recording run on GitHub Actions (.github/workflows/gemini-audio.yml)
posts its result to Discord with this: how many lines were recorded today, how many are
left, and anything that needs the owner (credit used up, a failed run, all done).

Usage: python tools/audio_cloud_report.py <log file> <exit code of build_audio.py>
Env: DISCORD_WEBHOOK (the channel's webhook URL; without it the message is only printed),
     RUN_URL (link to the Actions run), BRANCH (where the files were committed).
"""
import json, os, re, sys, urllib.request
from datetime import datetime, timedelta, timezone

PER_DAY = 85          # what one day's quota has recorded so far (2026-10-17: 85, 10-18: 62)


def summary(log, code):
    to_render = [int(n) for n in re.findall(r'\): (\d+) to render', log)]
    new = [int(n) for n in re.findall(r': (\d+) new Gemini files', log)]
    kept = len(re.findall(r'kept the old voice', log))
    made = sum(new)
    left = (to_render[-1] - new[-1]) if to_render and new and len(new) >= len(to_render) else (to_render[-1] if to_render else None)
    today = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime('%Y-%m-%d')   # Taiwan date
    out = [f'🎙️ **Hanabi 錄音日報** {today}']
    # Google's 429 for a spent daily quota also says "check your plan and billing details",
    # so only an explicit 402 / depleted-credit message counts as money running out
    credit = re.search(r'HTTP 402|prepayment credits|credits? (are |have been )?depleted', log, re.I)
    if credit:
        out.append('⚠️ **Gemini 餘額可能用完了**：請到 Google AI Studio（hanabi-tts 專案）看帳單、儲值。儲值後明天會自動接著錄。')
    if code != 0 and not credit:
        tail = '\n'.join(log.strip().splitlines()[-6:])
        out.append(f'❌ 這次執行失敗了（代碼 {code}），最後幾行：\n```\n{tail[-900:]}\n```')
    out.append(f'今天錄了 **{made}** 句（日文閱讀，Aoede）')
    if kept:
        out.append(f'其中 {kept} 句長度不對，先保留舊的聲音，之後會再試')
    if left is not None:
        if left <= 0:
            out.append('✅ **全部錄完了！** 跟 Claude 說「合併錄音」就能上線，然後可以停用這個排程。')
        else:
            days = -(-left // PER_DAY)
            out.append(f'還剩 **{left}** 句，照每天約 {PER_DAY} 句大約還要 {days} 天')
    if os.environ.get('BRANCH'):
        out.append(f'檔案存在 `{os.environ["BRANCH"]}` 分支（還沒上線）')
    if os.environ.get('RUN_URL'):
        out.append(os.environ['RUN_URL'])
    return '\n'.join(out)[:1900]


def main():
    log = open(sys.argv[1], encoding='utf-8', errors='replace').read() if os.path.exists(sys.argv[1]) else ''
    code = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    msg = summary(log, code)
    print(msg)
    hook = os.environ.get('DISCORD_WEBHOOK')
    if hook:
        req = urllib.request.Request(hook, json.dumps({'content': msg}).encode(),
                                     {'Content-Type': 'application/json', 'User-Agent': 'hanabi-audio-report'})
        urllib.request.urlopen(req, timeout=30).read()


if __name__ == '__main__':
    main()
