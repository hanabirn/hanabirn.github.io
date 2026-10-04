"""Builds the bundled word sets in data/vocab/*.json.

    python tools/build_vocab.py            # downloads sources into tools/.vocab-cache/
    python tools/build_vocab.py --offline  # reuse the cache only

Needs: pip install wordfreq opencc-python-reimplemented pdfplumber pypinyin
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
TOPIC_LANGS = ("ja", "ko", "en", "zh")
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--only", choices=["en", "sheets", "hsk", "topics"])
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


if __name__ == "__main__":
    main()
