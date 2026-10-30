"""Mainland pinyin for the HSK rounds (2026-10-30; the owner's plan: the Mainland edition first,
in Simplified with Mainland wording). tools/zh_reading.py keeps the Taiwan house style of the
grammar and the Taiwan passages (休息 xiūxí); HSK papers print the Mainland one (休息 xiūxi,
认识 rènshi, 一会儿 yíhuìr), so:

  - a run of characters is cut into words, longest first, from the HSK 3.0 word lists
    (data/vocab/hsk_*.json, the Simplified column), whose pinyin has the neutral tones and
    the r of 儿化 (这儿 zhè r: the r sits over 儿);
  - a word not in the lists is read by pypinyin in the context of its run, with the
    particles in the neutral tone (NEUTRAL);
  - 一 and 不 change tone before the next syllable as the papers print them (yí ge, yìqǐ,
    bú tài, bù hǎo); 一 keeps yī in numbers and ordinals (十一, 第一, 一月);
  - anything still wrong goes in WORDS (a word and its pinyin, syllables space-separated), or
    in the source as {"t": text, "p": pinyin}.

reading(text) -> [(word, [syllable per character or None])] — the words also give the papers'
spaces between words at HSK 1–2.
"""
import glob, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# 得 alone is the complement marker (跳得好); 得到 / 觉得 / 记得 match as words first
NEUTRAL = {'的': 'de', '得': 'de', '了': 'le', '吗': 'ma', '呢': 'ne', '吧': 'ba', '着': 'zhe', '们': 'men', '啊': 'a'}
# words the lists lack or read differently from the papers (add as they turn up in review)
WORDS = {'家里': 'jiā li', '点儿': 'diǎn r', '看看': 'kàn kan',
         # names and places: capitals, as the papers print them
         '王明': 'Wáng Míng', '李明': 'Lǐ Míng', '王先生': 'Wáng xiān sheng', '王老师': 'Wáng lǎo shī', '李老师': 'Lǐ lǎo shī',
         '小张': 'Xiǎo Zhāng', '北京': 'Běi jīng', '上海': 'Shàng hǎi', '日本': 'Rì běn', '美国': 'Měi guó'}
# single characters pypinyin reads one way here and another there (谁 shuí / shéi): one reading
SINGLE = {'谁': 'shéi'}
# list words that split simpler sentences wrongly: 三个人 is 三 / 个 / 人, not 三 / 个人 (an individual)
NOT_WORDS = {'个人'}
TONE_MARKS = {'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
              'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4, 'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4}
NUM = set('零〇一二三四五六七八九十百千万两几第')
MAX_WORD = 6
_lex = {}


def is_hanzi(c):
    return '㐀' <= c <= '鿿'


def lexicon():
    if not _lex:
        for f in sorted(glob.glob(str(ROOT / 'data' / 'vocab' / 'hsk_*.json'))):
            for row in json.loads(Path(f).read_text(encoding='utf-8'))['words']:
                simp, py = row[1], row[3]
                sylls = py.split()
                # one syllable per character (儿化: "zhè r" for 这儿); skip rows that don't line up
                if simp and len(sylls) == len(simp) and all(is_hanzi(c) for c in simp):
                    _lex.setdefault(simp, sylls)
        for w, py in WORDS.items():
            _lex[w] = py.split()
    return _lex


def tone(s):
    for ch in s:
        if ch in TONE_MARKS:
            return TONE_MARKS[ch]
    return 0


def _pypinyin(run):
    from pypinyin import pinyin, Style
    return [p[0] for p in pinyin(run, style=Style.TONE)]


def _words(run):
    """cut a run of Han characters into (word, syllables), longest list word first"""
    lex = lexicon()
    ctx = None
    out, i = [], 0
    while i < len(run):
        for n in range(min(MAX_WORD, len(run) - i), 1, -1):
            w = run[i:i + n]
            if w in lex and w not in NOT_WORDS:
                out.append((w, list(lex[w])))
                i += n
                break
        else:
            c = run[i]
            if c in NEUTRAL:
                py = NEUTRAL[c]
            elif c in SINGLE:
                py = SINGLE[c]
            else:
                ctx = ctx or _pypinyin(run)
                py = ctx[i]
            out.append((c, [py]))
            i += 1
    return out


def _sandhi(words):
    """一 / 不 before the next syllable, across words"""
    flat = [(wi, k) for wi, (w, s) in enumerate(words) for k in range(len(s))]
    for n, (wi, k) in enumerate(flat):
        w, s = words[wi]
        ch = w[k]
        if ch not in '一不' or s[k] not in ('yī', 'bù'):
            continue
        nxt = flat[n + 1] if n + 1 < len(flat) else None
        if nxt is None:
            continue
        nw, ns = words[nxt[0]]
        nch, nsyl = nw[nxt[1]], ns[nxt[1]]
        prev = words[flat[n - 1][0]][0][flat[n - 1][1]] if n else ''
        if ch == '一':
            if prev in NUM or nch in NUM or nch in '月号日':
                continue                       # 十一, 第一, 一二三, 一月
            # 个 is gè in the lists but sounds 4th after 一 either way
            s[k] = 'yí' if tone(nsyl) == 4 or nch == '个' else 'yì'
        else:
            if tone(nsyl) == 4:
                s[k] = 'bú'
    return words


def reading(text, given=None):
    """[(chunk, [syllable or None per character])]: Han runs cut into words, other text as is.
    given: hand-written pinyin for the whole text, syllables space-separated, punctuation left out"""
    chunks = re.findall(r'[㐀-鿿]+|[^㐀-鿿]+', text)
    words = []
    for c in chunks:
        if is_hanzi(c[0]):
            ws = _words(c)
            if not given:
                _sandhi(ws)               # within the run only: not across punctuation
            words.extend(ws)
        else:
            words.append((c, [None] * len(c)))
    if given:
        sylls = given.split()
        han = [i for i, (w, s) in enumerate(words) if s and s[0] is not None]
        need = sum(len(words[i][1]) for i in han)
        if len(sylls) != need:
            raise ValueError(f'{len(sylls)} syllables given for {need} characters: {text}')
        k = 0
        for i in han:
            n = len(words[i][1])
            words[i] = (words[i][0], sylls[k:k + n])
            k += n
        return words
    return words


def pinyin_line(text, given=None):
    """the pinyin of a text as the papers print it: words written together"""
    return ' '.join(''.join(s) for w, s in reading(text, given) if s and s[0] is not None)
