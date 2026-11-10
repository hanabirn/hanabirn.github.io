"""Uploads the recordings (data/audio/**/*.mp3) to the Cloudflare R2 bucket served at https://audio.hanabirn.xyz/
(owner's pick 2026-11-08: the site had grown to 860 MB / 114 000 files, almost all recordings, and GitHub Pages
deploys stalled). The small index.json files stay on the site; only the mp3s live in R2.

Credentials, never in this file or the chat: the git-ignored tools/.r2.env (one KEY=value a line, like
tools/.google-tts.env), or the environment (GitHub Actions secrets):
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY   (an R2 API token with Object Read & Write on the bucket)
    R2_BUCKET (default hanabi-audio)

Free-tier guard: R2 is free up to 10 GB stored. Before uploading, the script adds up what the bucket already holds
plus what it would add; if that passes CAP_GB (9) it uploads nothing and says so — the owner decides then.

    python tools/r2_sync.py --dry-run     what would go up, and the total afterwards
    python tools/r2_sync.py               upload new and changed files (same key, different size or md5)
    python tools/r2_sync.py --only ja     one folder of data/audio
"""
import argparse, hashlib, os, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'data' / 'audio'
CAP_GB = 9.0
CACHE = 'public, max-age=86400'          # a day: a clip re-recorded under the same name shows up by tomorrow


def load_env():
    f = ROOT / 'tools' / '.r2.env'
    for line in f.read_text(encoding='utf-8-sig').splitlines() if f.exists() else []:
        if '=' in line and not line.strip().startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))


def client():
    load_env()
    import boto3
    from botocore.config import Config
    need = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
    missing = [k for k in need if not os.environ.get(k)]
    if missing:
        sys.exit('missing environment variables: ' + ', '.join(missing) + ' (see the top of tools/r2_sync.py)')
    return boto3.client('s3', endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
                        region_name='auto', config=Config(retries={'max_attempts': 8, 'mode': 'adaptive'},
                                                          max_pool_connections=32))


def remote_listing(s3, bucket):
    """{key: (size, etag)} of everything in the bucket"""
    out, token = {}, None
    while True:
        kw = {'Bucket': bucket, 'MaxKeys': 1000}
        if token:
            kw['ContinuationToken'] = token
        r = s3.list_objects_v2(**kw)
        for o in r.get('Contents', []):
            out[o['Key']] = (o['Size'], o['ETag'].strip('"'))
        if not r.get('IsTruncated'):
            return out
        token = r['NextContinuationToken']


def md5(p):
    return hashlib.md5(p.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', help='one folder of data/audio, e.g. ja or listening/fr')
    args = ap.parse_args()
    bucket = os.environ.get('R2_BUCKET', 'hanabi-audio')
    s3 = client()
    remote = remote_listing(s3, bucket)
    base = AUDIO / args.only if args.only else AUDIO
    local = sorted(base.rglob('*.mp3'))
    todo, add_bytes = [], 0
    for p in local:
        key = p.relative_to(AUDIO).as_posix()
        size = p.stat().st_size
        have = remote.get(key)
        if have and have[0] == size and have[1] == md5(p):
            continue
        todo.append((p, key))
        add_bytes += size - (have[0] if have else 0)
    now = sum(s for s, _ in remote.values())
    after = now + add_bytes
    print(f'bucket {bucket}: {len(remote)} files, {now / 1e9:.2f} GB; to upload {len(todo)} files; '
          f'afterwards {after / 1e9:.2f} GB (cap {CAP_GB} GB, free tier 10 GB)')
    if after > CAP_GB * 1e9:
        sys.exit(f'STOP: the bucket would pass {CAP_GB} GB — nothing uploaded. Ask the owner before going on.')
    if args.dry_run or not todo:
        return

    def put(item):
        p, key = item
        s3.upload_file(str(p), bucket, key, ExtraArgs={'ContentType': 'audio/mpeg', 'CacheControl': CACHE})
        return key

    done = 0
    with ThreadPoolExecutor(24) as pool:
        for _ in pool.map(put, todo):
            done += 1
            if done % 2000 == 0 or done == len(todo):
                print(f'  {done}/{len(todo)}', flush=True)
    print('done')


if __name__ == '__main__':
    main()
