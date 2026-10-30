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
NEUTRAL = {'的': 'de', '得': 'de', '了': 'le', '吗': 'ma', '呢': 'ne', '吧': 'ba', '着': 'zhe', '们': 'men', '啊': 'a',
           '过': 'guo'}   # alone 过 is the aspect particle (看过); 过来 / 过去 / 过年 are list words
# words the lists lack or read differently from the papers (add as they turn up in review)
WORDS = {'家里': 'jiā li', '点儿': 'diǎn r', '看看': 'kàn kan', '每天': 'měi tiān', '告诉': 'gào su', '多长': 'duō cháng', '孩子们': 'hái zi men', '走走': 'zǒu zou', '面条': 'miàn tiáo', '下雪': 'xià xuě', '晴天': 'qíng tiān', '玩儿': 'wán r', '长大': 'zhǎng dà', '妻子': 'qī zi',
         # a reduplicated verb's second syllable is neutral (HSK 3: 试试, 问问 …); 长得 is zhǎng (grow)
         '试试': 'shì shi', '问问': 'wèn wen', '尝尝': 'cháng chang', '找找': 'zhǎo zhao', '打打': 'dǎ da',
         '想想': 'xiǎng xiang', '听听': 'tīng ting', '说说': 'shuō shuo', '等等': 'děng deng', '玩玩': 'wán wan',
         '画画儿': 'huà huà r', '画儿': 'huà r', '长得': 'zhǎng de',
         '帮帮': 'bāng bang', '教教': 'jiāo jiao', '聊聊': 'liáo liao', '聊聊天儿': 'liáo liao tiān r',
         # 过 the verb (not the particle), 着 zháo in 睡着 / 睡不着, a number with 两
         '过马路': 'guò mǎ lù', '过生日': 'guò shēng rì', '睡着': 'shuì zháo', '睡不着': 'shuì bu zháo', '两千五': 'liǎng qiān wǔ',
         '星期一': 'xīng qī yī', '星期二': 'xīng qī èr', '星期三': 'xīng qī sān', '星期四': 'xīng qī sì',
         '星期五': 'xīng qī wǔ', '星期六': 'xīng qī liù',
         '星期天': 'xīng qī tiān', '星期日': 'xīng qī rì',   # the list capitalises these, the papers don't
         # names and places: capitals, as the papers print them
         '王明': 'Wáng Míng', '李明': 'Lǐ Míng', '王先生': 'Wáng xiān sheng', '王老师': 'Wáng lǎo shī', '李老师': 'Lǐ lǎo shī',
         '小张': 'Xiǎo Zhāng', '小李': 'Xiǎo Lǐ', '张先生': 'Zhāng xiān sheng', '张老师': 'Zhāng lǎo shī',
         '张经理': 'Zhāng jīng lǐ', '李经理': 'Lǐ jīng lǐ', '姓张': 'xìng Zhāng', '长城': 'Cháng chéng', '小王': 'Xiǎo Wáng', '北京': 'Běi jīng', '上海': 'Shàng hǎi', '日本': 'Rì běn', '美国': 'Měi guó'}
# single characters pypinyin reads one way here and another there (谁 shuí / shéi): one reading
SINGLE = {'谁': 'shéi', '王': 'Wáng', '长': 'cháng', '都': 'dōu'}   # 王 alone is the surname (姓王); 长 alone is long (长大 is a word)
# list words that split simpler sentences wrongly: 三个人 is 三 / 个 / 人, not 三 / 个人 (an individual);
# 四十分钟 is 四十 / 分钟, not 四 / 十分 (very) / 钟 — read the same, so a real 十分 loses only its grouping
NOT_WORDS = {'个人', '十分', '只要', '有时', '新手', '要不', '不满', '才能', '看中', '学会', '来回', '都会', '也好', '大多', '把手'}   # 只要五分钟 is 只 / 要 (only takes); 有时间 is 有 / 时间; 新手机 is 新 / 手机;
# 要不要, 不满意, 只有…才能, 看中国, 学会了 (HSK 3): the words 要不 / 不满 / 才能 / 看中 / 学会 cut them wrongly
# (我来回答, 都会去, 对身体也好, 大多了, 把手机 likewise)
TONE_MARKS = {'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
              'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4, 'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4}
NUM = set('零〇一二三四五六七八九十百千万两几第')
# 只 after a number or 这 / 那 / 哪 / 每 is the measure word zhī (两只猫, 这只狗); elsewhere it is zhǐ (only)
ZHI_BEFORE = NUM | set('这那哪每')
# the characters of a written-out number, printed as one word (shíbā suì, sìshí fēnzhōng)
DIGITS = set('零〇一二三四五六七八九十百千万')
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


def _numbers(words):
    """consecutive single digit characters joined: 十 / 八 → 十八"""
    out = []
    for w, s in words:
        if w in DIGITS and out and len(out[-1][0]) and all(ch in DIGITS for ch in out[-1][0]):
            out[-1] = (out[-1][0] + w, out[-1][1] + s)
        else:
            out.append((w, s))
    return out


def _measure(words):
    """只 as a measure word: zhī"""
    for n, (w, s) in enumerate(words):
        if w == '只' and n and words[n - 1][0][-1] in ZHI_BEFORE:
            s[0] = 'zhī'
    return words


def _sandhi(words):
    """一 / 不 before the next syllable, across words"""
    flat = [(wi, k) for wi, (w, s) in enumerate(words) for k in range(len(s))]
    for n, (wi, k) in enumerate(flat):
        w, s = words[wi]
        ch = w[k]
        if ch == '一' and all(c in DIGITS for c in w):
            s[k] = 'yī'                        # pypinyin already turned some (十一 → shí yì)
        if ch not in '一不' or s[k] not in ('yī', 'bù'):
            continue
        nxt = flat[n + 1] if n + 1 < len(flat) else None
        if nxt is None:
            continue
        nw, ns = words[nxt[0]]
        nch, nsyl = nw[nxt[1]], ns[nxt[1]]
        prev = words[flat[n - 1][0]][0][flat[n - 1][1]] if n else ''
        if ch == '一':
            if prev in NUM or (nch in NUM and nch not in '百千万两') or nch in '月号日' or (prev and prev in '期周') or w in ('星期一',):
                continue                       # 十一, 第一, 一二三, 一月, 周一 / 星期一 (but yìbǎi, yìqiān, yíwàn, yì liǎng)
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
            ws = _measure(_numbers(_words(c)))
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
