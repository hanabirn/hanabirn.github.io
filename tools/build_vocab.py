"""Builds the bundled word sets in data/vocab/*.json.

    python tools/build_vocab.py            # downloads sources into tools/.vocab-cache/
    python tools/build_vocab.py --offline  # reuse the cache only

Needs: pip install wordfreq opencc-python-reimplemented pdfplumber pypinyin xlrd
(wordfreq's frequency dictionaries are read directly, so MeCab is not required).

Every set is ordered easy-first: most frequent words first (wordfreq / ECDICT
frequency ranks), so a learning path starts with the words people meet most.

Sources and licences (also listed in data/vocab/README.md):
- English 國中/高中: 大學入學考試中心《高中英文參考詞彙表》(111學年度起適用),
  levels 1-2 / 3-6. © CEEC, non-profit use with attribution.
- English 多益: TOEIC Service List 1.2, Browne & Culligan (2013), CC BY-SA 4.0.
- English 托福: ECDICT words tagged "toefl".
- English Chinese meanings: ECDICT (skywind3000/ECDICT), MIT, simplified ->
  Taiwan traditional with OpenCC (s2twp).
- JLPT N5-N1 / TOPIK 1-4: the site owner's own Google Sheets (word, reading,
  Chinese meaning, English meaning), re-ordered by frequency.
- HSK 1-7: the November-2025 revision of HSK 3.0 ("newest-N" levels in
  drkameleon/complete-hsk-vocabulary, MIT); level 7 covers HSK 7-9.
- Frequencies: wordfreq (Robyn Speer), data CC BY-SA 4.0.
- Topic sets (tp_<lang>_<topic>, the 單字 page): hand-written lists in
  tools/topics/<lang>.tsv, kept in the order written there (not re-sorted).
"""
import argparse
import csv
import datetime
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
csv.field_size_limit(10_000_000)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", ".vocab-cache")
OUT = os.path.join(ROOT, "data", "vocab")
VERSION = datetime.date.today().strftime("%Y%m%d")

SOURCES = {
    "ecdict.csv": "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
    "hsk_complete.json": "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json",
    "tsl_stats.csv": "https://www.newgeneralservicelist.com/s/TSL_12_stats.csv",
    "ceec7000.pdf": "https://www.ceec.edu.tw/files/file_pool/1/0k213571061045122620/"
                    "%E9%AB%98%E4%B8%AD%E8%8B%B1%E6%96%87%E5%8F%83%E8%80%83%E8%A9%9E%E5%BD%99%E8%A1%A8"
                    "(111%E5%AD%B8%E5%B9%B4%E5%BA%A6%E8%B5%B7%E9%81%A9%E7%94%A8).pdf",
}

SHEET = "https://docs.google.com/spreadsheets/d/{}/export?format=csv&gid=0"
JLPT_SHEETS = {
    "jlpt_n5": "12B2ZV8eGUO7d1-YcWNLTlqDptkNrhsQvijyjed6Y_TE",
    "jlpt_n4": "1unwngsmxA4_HoNMO9l0-mN4dkhrQF7vYbbHgdSDY4SQ",
    "jlpt_n3": "1Tw8Ll29yjH-AkYlVWjTlWSY1Kh33Jxj_gqxWWcVs4NQ",
    "jlpt_n2": "1GKE8uKb8mH8PSHYELErZbzrYAgU19u1eBLTJsy67S-4",
    "jlpt_n1": "1zHezXxlkiSKsIzFCyUMBCLRNOxQV0zwvAgYnMFqnQ38",
}
TOPIK_SHEETS = {
    "topik_1": "1XJTpFBly3hRNBBBnZoAzJneOXwJajbC4KqniSRfSPUg",
    "topik_2": "1FBjH5ObsgShVevgMcXXJDmsmh0JQBzk6DDsJAyi6kaE",
    "topik_3": "1pVOTCK3e2OgAhdktgVb29j4vUlKpmIULk2OnkiPeNA0",
    "topik_4": "1UZJ29Jxl8pjM4eZREWKed8YRkPpjRIKkSfzfYFaAlig",
}


def fetch(name, url, offline):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        if offline:
            raise SystemExit(f"missing {path} (run without --offline)")
        print("download", name)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (hanabirn.xyz vocab build)"})
        with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
            f.write(r.read())
    return path


def write_set(set_id, kind, words, source, license_):
    os.makedirs(OUT, exist_ok=True)
    data = {"id": set_id, "kind": kind, "version": VERSION, "source": source, "license": license_,
            "count": len(words), "words": words}
    with open(os.path.join(OUT, set_id + ".json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"  {set_id}: {len(words)} words")


def freq_sorted(items, freq):
    """Stable sort, most frequent first; unknown (0) keep their order at the end."""
    return [x for _, _, x in sorted(((-freq(x), i, x) for i, x in enumerate(items)), key=lambda t: (t[0], t[1]))]


# ------------------------------------------------------------------ frequencies
_WF = {}


def wf(lang):
    if lang not in _WF:
        import wordfreq
        _WF[lang] = wordfreq.get_frequency_dict(lang, wordlist="best")
    return _WF[lang]


def wf_lookup(word, lang):
    d = wf(lang)
    f = d.get(word)
    if f:
        return f
    parts = [p for p in re.split(r"[\s~〜・/]+", word) if p]
    if len(parts) > 1:
        fs = [d.get(p, 0) for p in parts]
        return min(fs) if all(fs) else 0
    return 0


# ------------------------------------------------------------------ English
class Ecdict:
    """ECDICT rows by headword. Some everyday words are only listed capitalised
    (North, Pole, Creator, FAX), so lookups fall back to a lower-cased index."""

    def __init__(self, path):
        self.exact, self.lower = {}, {}
        with open(path, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                w = row["word"]
                if not w:
                    continue
                self.exact.setdefault(w, row)
                self.lower.setdefault(w.lower(), row)

    def __len__(self):
        return len(self.exact)

    def get(self, word):
        if not word:
            return None
        return self.exact.get(word) or self.exact.get(word.lower()) or self.lower.get(word.lower())

    def items(self):
        return self.exact.items()


POS_RE = re.compile(r"^(n|v|vt|vi|a|adj|ad|adv|prep|conj|pron|art|num|int|interj|aux|abbr)\.\s*")
TAG_RE = re.compile(r"^[\[【]([^\]】]*)[\]】]\s*")


CONTENT_POS = {"n", "v", "vt", "vi", "a", "adj"}
FUNCTION_POS = {"aux", "prep", "pron", "art"}
ADVERB_POS = {"ad", "adv"}
# Common words whose adverb sense is the one learners need first, although ECDICT
# lists a noun/verb/adjective sense before it (still: n. 蒸馏室, well: n. 井).
ADVERB_FIRST = {
    "still", "well", "up", "down", "out", "off", "back", "just", "even", "yet", "over",
    "about", "around", "away", "only", "very", "too", "also", "ever", "once", "far",
    "near", "here", "there", "then", "now", "almost", "already", "really", "pretty",
    "right", "straight", "late", "early", "hard", "home", "abroad", "aside", "ahead",
}

# Everyday words ECDICT only glosses with computing jargon (online -> 联机,
# download -> 卸载/下栽) or a letter-name sense (a -> 第一个字母 A).
ZH_OVERRIDES = {
    "a/an": "art. 一個；一",
    "online": "a. 線上的；網路上的 / adv. 線上",
    "download": "v. 下載 / n. 下載的檔案",
    "upload": "v. 上傳 / n. 上傳的檔案",
    "internet": "n. 網際網路；網路",
    "Internet/internet": "n. 網際網路；網路",
    "email": "n. 電子郵件 / v. 寄電子郵件",
    "website": "n. 網站",
    # ECDICT order/wording would lose the main sense here
    "like": "v. 喜歡；想要 / prep. 像；如同",
    "may": "aux. 可以；可能 / n. 五月",
}


def zh_meaning(row, cc):
    """Short Traditional-Chinese gloss from ECDICT: up to two parts of speech, three
    senses each.

    - Plain senses win; subject-tagged ones ([计] computing, [医] ...) are used only
      when there is nothing else, and web-sourced [网络] ones after those, since the
      [计] lines are mostly jargon (be -> 匯流排允許, include -> DOS 命令).
    - ECDICT's own order is usually right (but: conj. 但是 first) but not always
      (can: vt. 装罐 before aux. 能). Only when it starts with a noun/verb/adjective
      sense are aux/prep/pron/art senses moved ahead (can -> 能, down -> 往下), and
      adverb senses for the words in ADVERB_FIRST (still -> 仍然, well -> 很好地)."""
    tiers = {"plain": [], "tagged": [], "web": []}
    text = (row.get("translation") or "").replace("\\r", "").replace("\r", "").replace("\\n", "\n")
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        tier = "plain"
        tag = TAG_RE.match(line)
        if tag:
            tier = "web" if tag.group(1) == "网络" else "tagged"
            line = line[tag.end():]
        m = POS_RE.match(line)
        pos = m.group(1) if m else ""
        body = line[m.end():] if m else line
        tag = TAG_RE.match(body)  # the tag can also follow the part of speech: "art. [计] 累加器"
        if tag:
            tier = "web" if tag.group(1) == "网络" else "tagged"
            body = body[tag.end():]
        body = re.sub(r"\([^)]*\)|（[^）]*）|<[^>]*>|\[[^\]]*\]", "", body)
        senses = [s.strip() for s in re.split(r"[；;，,]", body) if s.strip()][:3]
        if senses:
            tiers[tier].append((pos, (pos + ". " if pos else "") + "；".join(senses)))
    lines = tiers["plain"] or tiers["tagged"] or tiers["web"]
    word = (row.get("word") or "").lower()

    def priority(item):
        pos = item[0]
        if pos in FUNCTION_POS:
            return 0
        if pos in ADVERB_POS and word in ADVERB_FIRST:
            return 1
        return 2

    if lines and lines[0][0] in CONTENT_POS:
        lines = sorted(lines, key=priority)  # stable: ties keep ECDICT's order
    lines = lines[:2]
    return cc.convert(" / ".join(text for _, text in lines))


def ecdict_rank(row):
    for k in ("frq", "bnc"):
        try:
            v = int(row.get(k) or 0)
        except ValueError:
            v = 0
        if v > 0:
            return v
    return 0


POS_TOKEN = re.compile(r"^(?:n|v|adj|adv|prep|conj|pron|art|aux|num|int)\.(?:/(?:n|v|adj|adv|prep|conj|pron|art|aux|num|int)\.)*$")


def is_pos(tok):
    """'n.', 'v./n.', and a part split at a line wrap such as 'v./'."""
    return bool(POS_TOKEN.match(tok.rstrip("/")))


def column_streams(page):
    """The page's words as one token stream per column, each read top to bottom.
    The PDF is laid out in three columns; reading it line by line (extract_text)
    interleaves the columns, so a long entry whose part of speech wraps onto the
    next line gets glued to a neighbour ('backward/backwards barn n. 3'). Column
    starts are the three most common left edges of words on the page."""
    from collections import Counter
    words = page.extract_words()
    if not words:
        return []
    edges = Counter(round(w["x0"] / 4) * 4 for w in words)
    starts = sorted(x for x, _ in edges.most_common(3))
    cols = [[] for _ in starts]
    for w in words:
        idx = max(i for i, s in enumerate(starts) if w["x0"] >= s - 6) if w["x0"] >= starts[0] - 6 else 0
        cols[idx].append(w)
    return [[w["text"] for w in sorted(c, key=lambda w: (round(w["top"]), w["x0"]))] for c in cols]


def parse_ceec(path):
    """Word -> level from the PDF's alphabetical section ("依字母排序"), where every
    entry reads `word pos level` (e.g. "accidental adj. 4"). Each column's tokens are
    walked in order: words accumulate until a part-of-speech token, and the next
    digit is the level. (The level-sorted section is unreliable: on some of its
    pages the header naming the level isn't in the extracted text.)"""
    import pdfplumber
    levels = {}
    started = False
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if "附錄" in text[:20]:
                break
            if "依字母排序" in text:
                started = True
            if not started:
                continue
            for stream in column_streams(page):
                buf, pending = [], None
                for tok in stream:
                    if pending is not None:
                        if re.fullmatch(r"[1-6]", tok):
                            levels.setdefault(pending, int(tok))
                            pending = None
                            continue
                        if is_pos(tok):
                            continue  # rest of a part of speech split across lines
                        pending = None  # no level followed: drop it
                    if is_pos(tok):
                        if buf:
                            pending = " ".join(buf)
                        buf = []
                    elif any(ord(c) > 127 for c in tok) or re.fullmatch(r"[A-Z]|[1-6]", tok):
                        buf = []  # page headers (CJK), letter headings, stray digits
                    else:
                        buf.append(tok)
    return levels


def headword(word):
    """'advertisement (ad)' -> 'advertisement'; 'a (an)' -> 'a'."""
    return re.sub(r"\s*\(.*?\)", "", word).strip()


def build_english(args):
    cc = __import__("opencc").OpenCC("s2twp")
    ec = Ecdict(fetch("ecdict.csv", SOURCES["ecdict.csv"], args.offline))
    print("ecdict entries", len(ec))

    def entry(word):
        # 'bicycle/bike' is shown as is but looked up by its first form
        first = word.split("/")[0].strip()
        if word in ZH_OVERRIDES or first in ZH_OVERRIDES:
            return [word, "", ZH_OVERRIDES.get(word) or ZH_OVERRIDES[first], ""]
        row = ec.get(word) or ec.get(first)
        if not row:
            return None
        meaning = zh_meaning(row, cc)
        return [word, "", meaning, ""] if meaning else None

    levels = parse_ceec(fetch("ceec7000.pdf", SOURCES["ceec7000.pdf"], args.offline))
    counts = {lv: sum(1 for v in levels.values() if v == lv) for lv in range(1, 7)}
    print("ceec words per level", counts)

    def rank_of(w):
        row = ec.get(w) or ec.get(w.split("/")[0].strip())
        r = ecdict_rank(row) if row else 0
        return r if r else 10 ** 9

    def ceec_set(lv_from, lv_to):
        words = [headword(w) for w, lv in levels.items() if lv_from <= lv <= lv_to and headword(w)]
        lv_of = {headword(w): lv for w, lv in levels.items()}
        words = sorted(dict.fromkeys(words), key=lambda w: (lv_of[w], rank_of(w)))
        out, missing = [], []
        for w in words:
            e = entry(w)
            (out.append(e) if e else missing.append(w))
        if missing:
            print("    no ECDICT meaning:", len(missing), missing[:15])
        return out

    ceec_src = "大學入學考試中心《高中英文參考詞彙表》(111學年度起適用) {}；中文釋義 ECDICT"
    ceec_lic = "詞表 © 財團法人大學入學考試中心基金會，非營利使用並註明出處；ECDICT MIT"
    junior = ceec_set(1, 2)
    write_set("en_jh", "en", junior, ceec_src.format("Level 1–2"), ceec_lic)
    # forms like 'bicycle/bike' count as both words
    junior_words = {f.strip().lower() for w in junior for f in w[0].split("/")}
    write_set("en_sh", "en", ceec_set(3, 6), ceec_src.format("Level 3–6"), ceec_lic)

    tsl = []
    with open(fetch("tsl_stats.csv", SOURCES["tsl_stats.csv"], args.offline), "rb") as f:
        raw = f.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")  # the published CSV is Windows-1252 (café, résumé)
    for row in csv.DictReader(io.StringIO(text)):
        e = entry(row["Word"].strip())
        if e:
            tsl.append(e)
    write_set("en_toeic", "en", tsl,
              "TOEIC Service List 1.2 (Browne & Culligan, 2013, newgeneralservicelist.com)；中文釋義 ECDICT",
              "TSL CC BY-SA 4.0；ECDICT MIT")

    # beyond the basics: words already in the 國中 set are left out (can, way, well ...)
    toefl = [w for w, row in ec.items()
             if "toefl" in (row.get("tag") or "").split()
             and re.fullmatch(r"[a-z][a-z\-']*", w) and w not in junior_words]
    toefl = sorted(toefl, key=rank_of)
    write_set("en_toefl", "en", [e for e in map(entry, toefl) if e],
              "ECDICT（skywind3000/ECDICT）托福標籤詞彙", "MIT")


# ------------------------------------------------------------------ JLPT / TOPIK
def sheet_rows(sheet_id):
    url = SHEET.format(sheet_id)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (hanabirn.xyz vocab build)"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return list(csv.reader(io.StringIO(r.read().decode("utf-8"))))


BAD_WORD = ("動畫", "動画", "동영상", "註", "★", "單字")
BAD_MEANING = ("動畫", "動画", "意思", "註")


def valid(word, meaning):
    """Same filter as isValidWord() in js/quiz.js."""
    w, m = (word or "").strip(), (meaning or "").strip()
    if not w or not m or re.fullmatch(r"\d+", w):
        return False
    return not any(b in w for b in BAD_WORD) and not any(b in m for b in BAD_MEANING)


KANA_ONLY = re.compile(r"^[぀-ヿ]+$")


def ja_freq(entry):
    """Frequency of a JLPT entry [word, kana, ...]. A lone kana (し, う, い) is mostly
    a particle or inflection in running text, so its count says nothing about the
    rare word it spells (卯, 依) and is damped; お皿 / ご飯 are tried without the
    honorific prefix when the whole word isn't in the list. A word written with kanji
    is looked up as written only: its reading would credit 或る / 此の (N1 spellings)
    with the frequency of everyday ある / この."""
    word, kana = entry[0], entry[1]
    f = wf_lookup(word, "ja")
    if not f and KANA_ONLY.match(word):
        f = wf_lookup(kana, "ja")
    if not f and word[:1] in "おご" and len(word) > 1:
        f = wf_lookup(word[1:], "ja") * 0.5
    if len(word) == 1 and KANA_ONLY.match(word):
        f *= 0.01
    return f


# Endings that don't turn a stem into a different common word: 지 / 기 / 어 / 아 would
# (까다 + 지 = 까지 "until"), so they are left out.
KO_ENDINGS = ("고", "는", "게", "면", "서")


def ko_freq(entry):
    """Frequency of a TOPIK entry. Dictionary forms (하다, 편하다) hardly occur in
    running text, so -다 words are looked up by their commonest inflections
    (stem + 고/는/게/면/서); one-syllable entries (도, 어, 해) mostly match particles
    and endings, so they are damped like lone kana, and affix entries (-이, -가) even
    more."""
    affix = entry[0].startswith("-") or entry[0].endswith("-")
    word = entry[0].strip("-")
    f = wf_lookup(word, "ko")
    if word.endswith("다") and len(word) >= 2:
        stem = word[:-1]
        f = max([f] + [wf_lookup(stem + e, "ko") for e in KO_ENDINGS])
        if stem.endswith("하"):
            f = max(f, wf_lookup(stem[:-1] + "해", "ko"), wf_lookup(stem[:-1] + "해요", "ko"))
    if len(word) == 1:
        f *= 0.01
    if affix:
        f *= 0.001
    return f


def build_sheets(args):
    for set_id, sid in JLPT_SHEETS.items():
        rows = sheet_rows(sid)[1:]  # header: word,kana,meaning,english
        words, seen = [], set()
        for r in rows:
            if len(r) < 4 or not valid(r[0], r[2]):
                continue
            key = (r[0].strip(), r[1].strip())
            if key in seen:
                continue
            seen.add(key)
            words.append([r[0].strip(), r[1].strip(), r[2].strip(), r[3].strip()])
        words = freq_sorted(words, ja_freq)
        write_set(set_id, "ja", words, "Hanabi 整理的 JLPT 單字表（依詞頻排序）", "© Hanabi")
    for set_id, sid in TOPIK_SHEETS.items():
        rows = sheet_rows(sid)[1:]  # header: 韓文單字,繁體中文翻譯,English
        words, seen = [], set()
        for r in rows:
            if len(r) < 3 or not valid(r[0], r[1]) or r[0].strip() in seen:
                continue
            seen.add(r[0].strip())
            words.append([r[0].strip(), "", r[1].strip(), r[2].strip()])
        words = freq_sorted(words, ko_freq)
        write_set(set_id, "ko", words, "Hanabi 整理的 TOPIK 單字表（依詞頻排序）", "© Hanabi")


# ------------------------------------------------------------------ HSK 3.0
RARE_SENSE = re.compile(r"^(surname|variant of|old variant|archaic variant|ancient variant|"
                        r"japanese variant|erhua variant|abbr\.|abbr for|see |used in |also written|"
                        r"also pr\.|taiwan pr\.|cl:|\(old\)|\(archaic\)|\(literary\)|"
                        r"\(classical\)|\(dialect\))", re.I)


def clean_sense(s):
    s = re.sub(r"\s*CL:.*$", "", s).strip()
    bare = re.sub(r"\s*\([^)]*\)\s*", " ", s).strip()
    return bare or s  # keep the parenthetical when it is the whole meaning, e.g. "(particle)"


def hsk_meaning(forms):
    """Pick the form with the most everyday senses (a surname / 'variant of' reading
    listed first would otherwise win) and keep up to three short senses."""
    best, best_score = None, None
    for i, form in enumerate(forms or []):
        senses = [m.strip() for m in (form.get("meanings") or []) if m.strip()]
        good = [s for s in senses if not RARE_SENSE.match(s)]
        pinyin = (form.get("transcriptions") or {}).get("pinyin", "")
        score = (len(good) - (3 if pinyin[:1].isupper() else 0), -i)
        if good and (best_score is None or score > best_score):
            best, best_score = (form, good), score
    if not best:
        return None, None
    form, good = best
    out = []
    for s in (clean_sense(x) for x in good):
        if s and s not in out and len("; ".join(out + [s])) <= 40:
            out.append(s)
        if len(out) == 3:
            break
    return form, "; ".join(out) or clean_sense(good[0])[:40]


def build_hsk(args):
    with open(fetch("hsk_complete.json", SOURCES["hsk_complete.json"], args.offline), encoding="utf-8") as f:
        data = json.load(f)
    by_level = {n: [] for n in range(1, 8)}
    for e in data:
        # "newest-N" = the November-2025 HSK 3.0 revision ("new-N" is the 2021 one)
        lv = next((int(l[7:]) for l in e.get("level", []) if l.startswith("newest-")), None)
        if not lv:
            continue
        form, meaning = hsk_meaning(e.get("forms"))
        if not form:
            continue
        tr = form.get("transcriptions") or {}
        trad = form.get("traditional") or e["simplified"]
        by_level[min(lv, 7)].append({
            "row": [trad, e["simplified"], tr.get("bopomofo", ""), tr.get("pinyin", ""), meaning],
            "freq": e.get("frequency") or 10 ** 9,
        })
    for lv, items in by_level.items():
        items.sort(key=lambda x: x["freq"])
        write_set(f"hsk_{lv}", "zh", [x["row"] for x in items],
                  "HSK 3.0（2025 修訂版）詞彙（drkameleon/complete-hsk-vocabulary）" + ("，含 7–9 級" if lv == 7 else ""), "MIT")


# 單字 page topics: tools/topics/<lang>.tsv -> data/vocab/tp_<lang>_<topic>.json.
# Lines are "word<TAB>reading<TAB>meaning<TAB>english" under "## <topic>" headers;
# rows keep the file's order (easy first, written that way by hand). Chinese lines
# are "traditional<TAB>pinyin<TAB>english[<TAB>simplified]" and become HSK-shaped
# rows: simplified by OpenCC tw2s unless given, bopomofo converted from the pinyin.
TOPIC_LANGS = ("ja", "ko", "en", "zh", "fr", "ru")   # fr rows: [le chat, m., zh, en]; ru: [слово, сло́во, zh, en]
TOPICS = ("greetings", "food", "home", "shopping", "transport", "travel", "weather", "school", "work", "health")


def zh_topic_row(cols, cc, bpmf):
    trad, pinyin, english, simp = cols
    syllables = pinyin.split()
    hanzi = [ch for ch in trad if "一" <= ch <= "鿿"]
    if not english or len(syllables) != len(hanzi):
        raise ValueError(f"{len(syllables)} syllables for {len(hanzi)} characters, or no meaning")
    zhuyin = [bpmf.to_bopomofo(s.lower()) for s in syllables]
    if any(re.search(r"[a-z0-9À-ɏ]", z, re.I) for z in zhuyin):
        raise ValueError(f"pinyin {pinyin!r} doesn't convert to bopomofo: {zhuyin}")
    return [trad, simp or cc.convert(trad), " ".join(zhuyin), pinyin, english]


def build_topics(args):
    import opencc
    from pypinyin.style.bopomofo import BopomofoConverter
    cc, bpmf = opencc.OpenCC("tw2s"), BopomofoConverter()
    for lang in TOPIC_LANGS:
        topics, cur = {}, None
        with open(os.path.join(ROOT, "tools", "topics", lang + ".tsv"), encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                line = line.rstrip("\r\n")
                if line.startswith("## "):
                    cur = line[3:].strip()
                    if cur not in TOPICS or cur in topics:
                        raise SystemExit(f"{lang}.tsv:{n}: unknown or repeated topic {cur!r}")
                    topics[cur] = []
                    continue
                if not line.strip() or line.startswith("#"):
                    continue
                cols = [c.strip() for c in (line.split("\t") + ["", "", ""])[:4]]
                if cur is None or not cols[0] or not cols[2 if lang != "zh" else 1]:
                    raise SystemExit(f"{lang}.tsv:{n}: bad line {line!r}")
                if any(w[0] == cols[0] for w in topics[cur]):
                    raise SystemExit(f"{lang}.tsv:{n}: {cols[0]!r} twice in {cur}")
                if lang == "zh":
                    try:
                        topics[cur].append(zh_topic_row(cols, cc, bpmf))
                    except ValueError as e:
                        raise SystemExit(f"zh.tsv:{n}: {cols[0]}: {e}")
                else:
                    topics[cur].append(cols)
        missing = [t for t in TOPICS if t not in topics]
        if missing:
            raise SystemExit(f"{lang}.tsv: missing topics {missing}")
        for topic in TOPICS:
            write_set(f"tp_{lang}_{topic}", lang, topics[topic], "Hanabi 整理的主題單字", "© Hanabi")


# ---------- European lists: Wiktionary data (kaikki.org Wiktextract, CC BY-SA) ----------
# The per-language dumps are huge (French ~580 MB, Russian ~940 MB), so they are
# streamed and only the entries for words on our lists are kept, in a small
# tools/.vocab-cache/kaikki_<lang>.json — the dump itself never touches the disk.
KAIKKI = "https://kaikki.org/dictionary/{0}/kaikki.org-dictionary-{0}.jsonl"
KAIKKI_NAMES = {"fr": "French", "ru": "Russian"}


def kaikki_entry(e):
    """The parts of a Wiktextract entry we use: part of speech, the first glosses of
    real senses (not "plural of …"), gender tags and the canonical (stressed) form."""
    glosses = []
    for s in e.get("senses") or []:
        if s.get("form_of") or "form-of" in (s.get("tags") or []):
            continue
        # a sub-sense lists its parent's gloss first ("[with accusative]", "to, into"):
        # the last one is the sense itself
        g = (s.get("glosses") or [""])[-1].strip()
        if g and g not in glosses:
            glosses.append(g)
        if len(glosses) == 4:
            break
    tags = set(e.get("tags") or [])
    for s in (e.get("senses") or [])[:1]:
        tags |= set(s.get("tags") or [])
    head = " ".join(h.get("expansion", "") for h in e.get("head_templates") or [])
    canon = next((f.get("form") for f in e.get("forms") or [] if "canonical" in (f.get("tags") or [])), "")
    return {"pos": e.get("pos", ""), "glosses": glosses, "head": head[:120],
            "gender": sorted(t for t in tags if t in ("masculine", "feminine", "neuter")), "canonical": canon}


def kaikki_key(lang, word):
    """How words are matched: Russian lists write ё as е (еще), Wiktionary doesn't (ещё)."""
    return word.replace("ё", "е").replace("Ё", "Е") if lang == "ru" else word


def kaikki_extract(lang, words, offline):
    """{word: [entry, ...]} for the words given (keyed by kaikki_key), from the cached
    extract or by streaming."""
    words = [kaikki_key(lang, w) for w in words]
    path = os.path.join(CACHE, f"kaikki_{lang}.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            have = json.load(f)
        if all(w in have for w in words):
            return have
    if offline:
        raise SystemExit(f"{path} misses words (run without --offline)")
    want, out, n = set(words), {w: [] for w in words}, 0
    req = urllib.request.Request(KAIKKI.format(KAIKKI_NAMES[lang]), headers={"User-Agent": "Mozilla/5.0 (hanabirn.xyz vocab build)"})
    with urllib.request.urlopen(req, timeout=600) as r:
        for raw in io.TextIOWrapper(r, encoding="utf-8"):
            n += 1
            if n % 200000 == 0:
                print(f"  kaikki {lang}: {n} entries read", flush=True)
            # cheap test before parsing: the entry's own headword is followed by its
            # language (nested "word"s, in related terms etc., are not); a line
            # without that pattern is parsed in full
            m = re.search(r'"word": "((?:[^"\\]|\\.)*)", "lang": "', raw)
            if m and kaikki_key(lang, json.loads('"' + m.group(1) + '"')) not in want:
                continue
            e = json.loads(raw)
            key = kaikki_key(lang, e.get("word", ""))
            if key in want and e.get("lang_code") == lang:
                out[key].append(kaikki_entry(e))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"  kaikki {lang}: {sum(1 for v in out.values() if v)}/{len(out)} words found")
    return out


# ---------- Chinese meanings for the European lists, written by Gemini ----------
# The lists have no translations. Gemini gets each word with its part of speech,
# gender and Wiktionary glosses and writes a short Taiwan-Chinese meaning; answers
# are cached in tools/.vocab-cache/gemini_<lang>.json (key "word|pos"), so a word is
# only ever asked once, and ZH_FIX_<LANG> tables fix the ones that come out wrong.
# The key is the site assistant's (worker/assistant/.dev.vars, free tier, billing
# off). Its models are NOT used here — each model has its own daily quota and the
# assistant needs theirs — only these:
GEMINI_MODELS = ("gemini-3-flash-preview", "gemini-3.1-flash-lite")
GEMINI_BATCH = 300                # the free tier counts requests, not words
GEMINI_LANG_NAMES = {"fr": "French", "ru": "Russian"}


def gemini_key():
    key = os.environ.get("GEMINI_API_KEY", "")
    path = os.path.join(ROOT, "worker", "assistant", ".dev.vars")
    if not key and os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.startswith("GEMINI_API_KEY"):
                key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        raise SystemExit("no GEMINI_API_KEY (env or worker/assistant/.dev.vars)")
    return key


def gemini_call(model, prompt):
    # a schema keeps the answer to exactly one JSON array (no trailing text)
    config = {"responseMimeType": "application/json", "temperature": 0.2,
              "responseSchema": {"type": "ARRAY", "items": {"type": "OBJECT", "required": ["id", "zh"],
                                 "properties": {"id": {"type": "INTEGER"}, "zh": {"type": "STRING"}}}}}
    if "lite" not in model:
        config["thinkingConfig"] = {"thinkingBudget": 0}   # answers in seconds, not minutes (lite rejects it)
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": config}).encode()
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": gemini_key()})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    return d["candidates"][0]["content"]["parts"][0]["text"]


def gemini_prompt(lang, items):
    return (
        f"You are writing a {GEMINI_LANG_NAMES[lang]}–Chinese vocabulary list for learners in Taiwan.\n"
        "For each item give the meaning in Traditional Chinese as used in Taiwan (台灣用語, e.g. 腳踏車 not 自行車).\n"
        "Rules: the most common meaning(s) only, at most 2, separated by \"；\"; at most 12 characters in total; "
        "no pinyin, no part-of-speech labels, no explanations, no quotation marks; "
        "a verb is given as a Chinese verb (吃, 開始), an adjective as an adjective (大的, 漂亮的); "
        "follow the English glosses when they are given, and the part of speech.\n"
        "Answer with a JSON array of objects {\"id\": <id>, \"zh\": \"<meaning>\"}, one per item, same ids.\n"
        "Items:\n" + json.dumps(items, ensure_ascii=False))


def gemini_meanings(lang, items):
    """items: [{"w", "pos", "gender", "en"}] -> {"w|pos": zh}, asking only for uncached ones."""
    path = os.path.join(CACHE, f"gemini_{lang}.json")
    cache = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    todo = [it for it in items if f"{it['w']}|{it['pos']}" not in cache]
    spent = set()                                              # models whose day is used up
    for start in range(0, len(todo), GEMINI_BATCH):
        batch = todo[start:start + GEMINI_BATCH]
        ask = [{"id": i, "word": it["w"], "pos": it["pos"], **({"gender": it["gender"]} if it.get("gender") else {}),
                **({"en": it["en"]} if it.get("en") else {})} for i, it in enumerate(batch)]
        got = {}
        for model in GEMINI_MODELS:
            if model in spent:
                continue
            limited = 0
            for attempt in range(4):
                try:
                    answer = json.loads(gemini_call(model, gemini_prompt(lang, ask)))
                    got = {int(a["id"]): str(a["zh"]).strip() for a in answer if str(a.get("zh", "")).strip()}
                except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError) as e:
                    print(f"  gemini {model}: {getattr(e, 'code', '')} {str(e)[:100]}", flush=True)
                    if getattr(e, "code", 0) == 429:
                        limited += 1
                        if limited == 2:
                            spent.add(model)                   # still limited: this model's day is spent
                            break
                        time.sleep(65)                         # maybe only the per-minute limit
                    else:
                        time.sleep(5)
                    continue
                if len(got) >= len(batch) * 0.95:
                    break
            if len(got) >= len(batch) * 0.95:
                break
        for i, it in enumerate(batch):
            if i in got:
                cache[f"{it['w']}|{it['pos']}"] = got[i]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=0)
        print(f"  gemini {lang}: {min(start + GEMINI_BATCH, len(todo))}/{len(todo)} asked, {len(got)} answered", flush=True)
        if len(got) < len(batch) * 0.95:
            raise SystemExit("Gemini stopped answering (quota?) — run again later; answers so far are cached")
        time.sleep(8)                                          # stay well under the per-minute limit
    return cache


# ---------- French: FLELex (CEFRLex, UCLouvain), CC BY-NC-SA 4.0 ----------
# The "Beacco" version gives every lemma a CEFR level. Kept: A1–C1, words that
# Wiktionary knows in that part of speech (drops tagging noise such as participles
# filed as nouns, plural forms), nouns only with a known gender; each word once, at
# its lowest level; most frequent first. Rows: [shown word, gender, zh, en] — nouns
# are shown with their article (le / la / l'; none before h, whose elision varies,
# nor for months and days), the gender goes in the reading column.
FLELEX = "https://cental.uclouvain.be/cefrlex/static/resources/fr/FleLex_TT_Beacco.tsv"
CEFR_LEVELS = ("A1", "A2", "B1", "B2", "C1")
FLELEX_POS = {"NOM": "noun", "VER": "verb", "ADJ": "adj", "ADV": "adv", "PRO": "pron", "PRP": "prep",
              "KON": "conj", "INT": "intj", "DET:ART": "article", "DET:POS": "det", "PRP:det": "prep"}
FR_NO_ARTICLE = set("janvier février mars avril mai juin juillet août septembre octobre novembre décembre "
                    "lundi mardi mercredi jeudi vendredi samedi dimanche".split())
# words Gemini can't sensibly translate on their own (articles, contractions,
# clitics, halves of a fixed phrase), and fixes found when reviewing
ZH_FIX_FR = {
    "le|article": "（定冠詞，陽性）", "un|article": "一個；（不定冠詞）", "de|article": "（部分冠詞）；一些",
    "au|prep": "到…；在…（= à le）", "du|prep": "…的；從…（= de le）",
    "le|pron": "他；它（受詞）", "la|pron": "她；它（受詞）", "en|pron": "其中的；從那裡",
    "y|pron": "那裡；（代替 à＋名詞）", "se|pron": "自己（反身代名詞）", "que|pron": "什麼；（關係代名詞）",
    "que|conj": "（引導子句）；比", "on|pron": "人們；我們", "dont|pron": "（關係代名詞）其中",
    "soit|conj": "或者；也就是", "parce|conj": "因為（parce que）", "tandis|conj": "而（tandis que）",
    "afin|conj": "為了（afin de / que）",
    "mail|noun": "電子郵件",
}
EN_FIX_FR = {"mail|noun": "email"}
# FLELex tagging noise found when reviewing: a name (Zoé), a verb form filed as a noun
# (oublie), and words whose tag led to the wrong Wiktionary sense (bis, ben) or that
# are far too rare for their level (pers, rabat, muser)
FR_SKIP = {"zoé", "oublie", "bis", "ben", "pers", "rabat", "muser"}


def short_gloss(glosses, limit=40):
    """Up to two English senses, without the bracketed notes, cut at a word."""
    def clean(text):
        return re.sub(r"\s*(\([^)]*\)?|\[[^\]]*\]?)", "", text).strip(" ,.:")

    out = []
    for g in glosses:
        for part in g.split(";"):
            p = clean(part)
            if len(p) > limit:
                p = p.split(",")[0].strip()
            if p and p not in out and len("; ".join(out + [p])) <= limit:
                out.append(p)
            if len(out) == 2:
                break
        if len(out) == 2:
            break
    if not out:
        first = next((clean(g) for g in glosses if clean(g)), "")
        out = [first if len(first) <= limit else first[:limit].rsplit(" ", 1)[0]] if first else []
    return "; ".join(out)


def fr_shown(word, pos, gender):
    if pos != "noun" or gender not in ("m", "f") or word in FR_NO_ARTICLE or word[0].lower() == "h":
        return word
    if word[0].lower() in "aeiouyàâäéèêëîïôöûüœæ":
        return "l'" + word
    return ("le " if gender == "m" else "la ") + word


def french_items(offline):
    """The kept FLELex words, by level: [{level, w, pos, gender, en, freq}]."""
    with open(fetch("flelex_tt_beacco.tsv", FLELEX, offline), encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter="\t"))
    kk = kaikki_extract("fr", sorted({r["word"] for r in rows}), offline)
    rank = {lv: i for i, lv in enumerate(CEFR_LEVELS)}
    rows = [r for r in rows if r["level"] in rank]
    rows.sort(key=lambda r: (rank[r["level"]], -float(r["freq_total"])))
    items, seen = [], set()
    for r in rows:
        w, pos = r["word"], FLELEX_POS.get(r["tag"])
        if w in seen or w in FR_SKIP or not pos or not re.fullmatch(r"[^\W\d_]+(?:['-][^\W\d_]+)*", w):
            continue
        e = next((x for x in kk.get(w) or [] if x["pos"] == pos and x["glosses"]), None)
        if not e:
            continue
        g = e["gender"]
        gender = "m" if g == ["masculine"] else "f" if g == ["feminine"] else "m/f" if g else ""
        if pos == "noun" and not gender:
            continue
        seen.add(w)
        items.append({"level": r["level"], "w": w, "pos": pos, "gender": gender if pos == "noun" else "",
                      "en": "; ".join(e["glosses"][:3])[:200], "freq": float(r["freq_total"])})
    return items


def build_french(args):
    items = french_items(args.offline)
    todo = [it for it in items if f"{it['w']}|{it['pos']}" not in ZH_FIX_FR]
    zh = gemini_meanings("fr", todo)
    zh.update(ZH_FIX_FR)
    missing = [it["w"] for it in items if f"{it['w']}|{it['pos']}" not in zh]
    if missing:
        raise SystemExit(f"{len(missing)} French words still lack a meaning; run again")
    kk = kaikki_extract("fr", [it["w"] for it in items], True)
    for lv in CEFR_LEVELS:
        words = []
        for it in items:
            if it["level"] != lv:
                continue
            e = next(x for x in kk[it["w"]] if x["pos"] == it["pos"] and x["glosses"])
            g = {"m": "m.", "f": "f.", "m/f": "m./f."}.get(it["gender"], "")
            key = f"{it['w']}|{it['pos']}"
            words.append([fr_shown(it["w"], it["pos"], it["gender"]), g, zh[key], EN_FIX_FR.get(key) or short_gloss(e["glosses"])])
        write_set(f"fr_{lv.lower()}", "fr", words,
                  f"FLELex（CEFRLex, UCLouvain）{lv}；英文釋義 Wiktionary；中文釋義 Gemini 撰寫", "FLELex CC BY-NC-SA 4.0；Wiktionary CC BY-SA")


# ---------- Russian: the Kelly list (Leeds / Kelly project), CC BY-NC-SA 2.0 ----------
# ssharoff.github.io/kelly: 8,958 lemmas with a CEFR level (some written in lower
# case) and a part of speech, including multi-word expressions (до свидания). Kept:
# A1–C1, words Wiktionary knows, each once at its lowest level, most frequent first.
# Rows: [word, stressed form (молоко́, from Wiktionary; empty when it adds nothing), zh, en].
KELLY_RU = "https://ssharoff.github.io/kelly/ru_m3.xls"
KELLY_POS = {"n": "noun", "v": "verb", "adj": "adj", "adv": "adv", "mwe": "phrase", "num": "num",
             "pron": "pron", "n prop": "name", "adpos": "prep", "prep": "prep", "particle": "particle",
             "con": "conj", "excl": "intj", "abbr": "abbr", "det": "det"}
# fixes found when reviewing: Kelly lists some forms (те, ту, та, эта) and words whose
# first Wiktionary entry is a homonym (полька, a mortar; эта, the Greek letter)
ZH_FIX_RU = {
    "те|pron": "那些", "ту|pron": "那個（陰性受格）", "та|pron": "那（陰性）", "эта|pron": "這（陰性）",
    "немка|noun": "德國女人", "полька|noun": "波蘭女人", "хоккей|noun": "冰上曲棍球", "мандарин|noun": "橘子",
    "что|conj": "什麼；（引導子句）",
}
EN_FIX_RU = {
    "те|pron": "those", "ту|pron": "that (feminine, accusative)", "та|pron": "that (feminine)",
    "эта|pron": "this (feminine)", "немка|noun": "German woman", "полька|noun": "Polish woman",
    "хоккей|noun": "ice hockey", "мандарин|noun": "mandarin orange", "что|conj": "what; that",
}


def russian_items(offline):
    import xlrd   # pip install xlrd (reads the .xls)
    sheet = xlrd.open_workbook(fetch("kelly_ru.xls", KELLY_RU, offline)).sheet_by_index(0)
    rows = [sheet.row_values(i) for i in range(1, sheet.nrows)]
    kk = kaikki_extract("ru", sorted({str(r[0]).strip() for r in rows}), offline)
    rank = {lv: i for i, lv in enumerate(CEFR_LEVELS)}
    rows = [r for r in rows if str(r[1]).upper() in rank]
    rows.sort(key=lambda r: (rank[str(r[1]).upper()], -float(r[4] or 0)))
    items, seen = [], set()
    for r in rows:
        w = str(r[0]).strip()
        pos = KELLY_POS.get(str(r[2]).strip().lower(), "")
        if not w or w in seen or not re.fullmatch(r"[а-яё]+(?:[ -][а-яё]+)*", w, re.I):
            continue
        ents = [x for x in kk.get(kaikki_key("ru", w)) or [] if x["glosses"]]
        e = next((x for x in ents if x["pos"] == pos), ents[0] if ents else None)
        if not e:
            continue
        seen.add(w)
        stressed = e["canonical"] if e["canonical"] and e["canonical"] != w and kaikki_key("ru", e["canonical"].replace("́", "")) == kaikki_key("ru", w) else ""
        items.append({"level": str(r[1]).upper(), "w": w, "pos": pos or e["pos"], "stressed": stressed,
                      "en": "; ".join(e["glosses"][:3])[:200], "glosses": e["glosses"]})
    return items


def build_russian(args):
    items = russian_items(args.offline)
    todo = [{k: it[k] for k in ("w", "pos", "en")} for it in items if f"{it['w']}|{it['pos']}" not in ZH_FIX_RU]
    zh = gemini_meanings("ru", todo)
    zh.update(ZH_FIX_RU)
    missing = [it["w"] for it in items if f"{it['w']}|{it['pos']}" not in zh]
    if missing:
        raise SystemExit(f"{len(missing)} Russian words still lack a meaning; run again")
    for lv in CEFR_LEVELS:
        words = [[it["w"], it["stressed"], zh[f"{it['w']}|{it['pos']}"],
                  EN_FIX_RU.get(f"{it['w']}|{it['pos']}") or short_gloss(it["glosses"])]
                 for it in items if it["level"] == lv]
        write_set(f"ru_{lv.lower()}", "ru", words,
                  f"Kelly 俄文詞表（Kelly project, Leeds）{lv}；重音與英文釋義 Wiktionary；中文釋義 Gemini 撰寫", "Kelly CC BY-NC-SA 2.0；Wiktionary CC BY-SA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--only", choices=["en", "sheets", "hsk", "topics", "fr", "ru"])
    args = ap.parse_args()
    os.makedirs(CACHE, exist_ok=True)
    if args.only in (None, "en"):
        print("English"); build_english(args)
    if args.only in (None, "sheets"):
        print("JLPT / TOPIK"); build_sheets(args)
    if args.only in (None, "hsk"):
        print("HSK 3.0"); build_hsk(args)
    if args.only in (None, "topics"):
        print("Topics"); build_topics(args)
    if args.only in (None, "fr"):
        print("French (FLELex)"); build_french(args)
    if args.only in (None, "ru"):
        print("Russian (Kelly)"); build_russian(args)


if __name__ == "__main__":
    main()
