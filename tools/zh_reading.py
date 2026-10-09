"""Pinyin for the Chinese grammar's quiz sentences, options and common mistakes
(used by tools/build_grammar.py). The examples' pinyin is hand-written; these
lines are generated and then reviewed:
  - every word the examples already spell (老師 lǎoshī, 名字 míngzi, 便宜
    piányí…) is spelled the same way, so the readings follow one house style
    (Taiwan readings, neutral tones, words written together);
  - other words come from pypinyin, with the particles read in the neutral tone
    and 一 / 不 changing tone before the next syllable (yí ge, yì běn, bú shì);
  - anything still wrong goes in OVERRIDES (exact text → pinyin), or in the
    source as q_reading / options_reading / wrong_reading / right_reading.
"""
import itertools
import re
import unicodedata

NEUTRAL = {'的': 'de', '了': 'le', '們': 'men', '嗎': 'ma', '呢': 'ne', '吧': 'ba', '著': 'zhe', '個': 'ge'}
# words pypinyin reads the mainland way, or with a full tone the examples don't use
WORDS = {'星期': 'xīngqí', '誰': 'shéi', '媽媽': 'māma', '妹妹': 'mèimei', '哥哥': 'gēge', '弟弟': 'dìdi',
         '姐姐': 'jiějie', '爸爸': 'bàba', '看看': 'kànkan', '試試': 'shìshi', '休息': 'xiūxí', '衣服': 'yīfú',
         '豆腐': 'dòufu', '桌子': 'zhuōzi', '東西': 'dōngxi', '意思': 'yìsi', '什麼': 'shénme', '怎麼': 'zěnme',
         '這個': 'zhège', '那個': 'nàge', '哪個': 'nǎge', '哪裡': 'nǎlǐ', '這裡': 'zhèlǐ',
         '韓國': 'Hánguó', '電視': 'diànshì', '已經': 'yǐjīng', '但是': 'dànshì', '如果': 'rúguǒ',
         '雖然': 'suīrán', '因此': 'yīncǐ', '以前': 'yǐqián', '能夠': 'nénggòu', '回國': 'huíguó', '為了': 'wèile',
         '在家': 'zài jiā', '我家': 'wǒ jiā', '好累': 'hǎo lèi', '很累': 'hěn lèi', '你好': 'nǐ hǎo',
         '也是': 'yě shì', '好不': 'hǎo bù', '正要': 'zhèng yào'}
# options that are wrong on purpose (a word said three times…): one syllable each, full tones
OVERRIDES = {'看看看': 'kàn kàn kàn', '試試試': 'shì shì shì', '看一看看': 'kàn yí kàn kàn',
             '試一試試': 'shì yí shì shì', '看了看看': 'kàn le kàn kàn', '休休息息': 'xiū xiū xí xí',
             '休息息': 'xiū xí xí', '休休息': 'xiū xiū xí', '我們休休息息吧。': 'Wǒmen xiū xiū xí xí ba.'}
PROPER = {'日本', '台北', '韓國', '中文', '英文', '高雄', '台灣', '日文', '韓文', '美國', '法國'}
TONES = {'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
         'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4, 'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4}


def is_hanzi(c):
    return '一' <= c <= '鿿'


def tone(s):
    return next((TONES[c] for c in s if c in TONES), 0)


# ---------- cutting pinyin into syllables ----------
_SYLLABLES = None


def toneless(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn' or c == '̈')
    return unicodedata.normalize('NFC', s).replace('ü', 'v')


def _syllables():
    global _SYLLABLES
    if _SYLLABLES is None:
        from pypinyin.pinyin_dict import pinyin_dict
        _SYLLABLES = {toneless(r) for v in pinyin_dict.values() for r in v.split(',')}
        _SYLLABLES |= {'r'}          # 兒化
    return _SYLLABLES


def split_word(word):
    """All ways to cut one pinyin word into syllables (fewest pieces first)."""
    low = toneless(word)
    out = []

    def go(i, acc):
        if i == len(low):
            out.append(acc)
            return
        for j in range(len(low), i, -1):
            if low[i:j] in _syllables():
                go(j, acc + [word[i:j]])

    go(0, [])
    return sorted(out, key=len)


def align(text, reading):
    """The pinyin words of reading, each with the characters of text it covers:
    [('老師', 'lǎoshī'), …]. Raises ValueError when they don't line up."""
    hanzi = [c for c in text if is_hanzi(c)]
    words = [w for w in re.split(r"[^A-Za-zÀ-ɏüǕ-ǜ̀-ͯ]+",
                                 unicodedata.normalize('NFC', reading)) if w]
    options = [split_word(w)[:6] for w in words]
    if any(not o for o in options):
        raise ValueError(f'unknown pinyin in {reading!r}')
    for combo in itertools.product(*options):
        if sum(len(part) for part in combo) == len(hanzi):
            break
    else:
        raise ValueError(f'{len(hanzi)} characters but the pinyin does not split into as many syllables: {reading!r}')
    out, k = [], 0
    for w, part in zip(words, combo):
        out.append((''.join(hanzi[k:k + len(part)]), w, part))
        k += len(part)
    return out


def zhuyin(text, reading):
    """Bopomofo for text from its pinyin, laid out like the text (punctuation kept)."""
    from pypinyin.style.bopomofo import BopomofoConverter
    conv = BopomofoConverter()
    bpmf = []
    for _, _, part in align(text, reading):
        for s in part:
            z = conv.to_bopomofo(s.lower())
            if z.endswith('˙'):              # Taiwan writes the neutral-tone dot first
                z = '˙' + z[:-1]
            bpmf.append(z)
    out, k = [], 0
    for c in text:
        if is_hanzi(c):
            out.append((' ' if out and not out[-1].endswith(' ') else '') + bpmf[k] + ' ')
            k += 1
        elif c == '　':
            out.append('＿＿')
        elif c.strip():
            if out and c not in '（':
                out[-1] = out[-1].rstrip()   # punctuation sits right after the syllable
            out.append(c + ('' if c == '（' else ' '))
    return re.sub(r' +', ' ', ''.join(out)).strip()


# ---------- generating pinyin ----------
LEXICON = dict(WORDS)


def learn(text, reading):
    """Remember how a hand-written example spells its words."""
    for i, (chars, word, _) in enumerate(align(text, reading)):
        if len(chars) < 2 or chars in WORDS or chars in LEXICON:
            continue
        if i == 0 and chars not in PROPER:
            word = word[0].lower() + word[1:]
        LEXICON[chars] = word


def _segments(chars):
    """Cut a run of characters into words: example words first (longest match),
    then pypinyin's own phrases."""
    from pypinyin.seg.mmseg import seg
    out, i, rest = [], 0, ''
    while i < len(chars):
        for j in range(min(len(chars), i + 4), i, -1):
            if chars[i:j] in LEXICON:
                if rest:
                    out += [(w, None) for w in seg.cut(rest)]
                    rest = ''
                out.append((chars[i:j], LEXICON[chars[i:j]]))
                i = j
                break
        else:
            rest += chars[i]
            i += 1
    if rest:
        out += [(w, None) for w in seg.cut(rest)]
    # 不 / 沒 stay words of their own (bú shì, méi qù), as in the examples
    res = []
    for w, fixed in out:
        if not fixed and len(w) > 1 and w[0] in '不沒' and w != '沒有':
            res += [(w[0], None), (w[1:], None)]
        elif not fixed and len(w) > 1 and w[-1] in '了吧嗎呢的':     # 累了 lèi le, 走吧 zǒu ba
            res += [(w[:-1], None), (w[-1], None)]
        else:
            res.append((w, fixed))
    return res


def _sylls(word):
    from pypinyin import pinyin, Style
    return [p[0] for p in pinyin(word, style=Style.TONE)]


def reading(text, sentence=True):
    """'我（　）學生。' → 'Wǒ (___) xuéshēng.' (a sentence starts with a capital,
    an option such as 嗎？ doesn't)"""
    if text in OVERRIDES:
        return OVERRIDES[text]
    # runs of characters between punctuation / blanks
    parts = re.findall(r'[一-鿿]+|（　）|[^一-鿿]', text)
    words = []                                  # [chars, [syllables] | None (fixed), fixed spelling]
    for part in parts:
        if not is_hanzi(part[0]):
            words.append([part, None, None])
            continue
        for chars, fixed in _segments(part):
            words.append([chars, None if fixed else _sylls(chars), fixed])
    # neutral particles and 得 / 過, then 一 / 不 tone sandhi, across word boundaries
    flat = [(wi, k) for wi, w in enumerate(words) if w[1] for k in range(len(w[1]))]
    def syl_after(wi, k):
        w = words[wi]
        if k + 1 < len(w[1]):
            return w[1][k + 1]
        for w2 in words[wi + 1:]:
            if not is_hanzi(w2[0][0]):
                return ''
            return w2[1][0] if w2[1] else w2[2]
        return ''
    for wi, k in flat:
        w = words[wi]
        c = w[0][k]
        nxt = syl_after(wi, k)
        prev = w[0][k - 1] if k else (words[wi - 1][0][-1] if wi else '')
        if c in NEUTRAL:
            w[1][k] = NEUTRAL[c]
        elif c == '得' and w[0][k:k + 2] != '得到':
            w[1][k] = 'de'
        elif c == '過' and prev and is_hanzi(prev) and prev not in '不經':
            w[1][k] = 'guo'
        elif c == '一' and nxt and not (prev and prev in '第十'):
            w[1][k] = 'yí' if tone(nxt) == 4 or nxt.startswith('ge') else 'yì'
        elif c == '不' and nxt:
            w[1][k] = 'bú' if tone(nxt) == 4 else 'bù'
    out = []
    for chars, sylls, fixed in words:
        if not is_hanzi(chars[0]):
            if chars == '（　）':
                out.append(' (___) ')
            else:
                out.append({'，': ', ', '。': '. ', '？': '? ', '！': '! ', '、': ', ', '—': ' — '}.get(chars, chars))
            continue
        word = fixed or ''.join(sylls)
        if chars in PROPER:
            word = word[0].upper() + word[1:]
        out.append(' ' + word + ' ')
    s = re.sub(r' +', ' ', ''.join(out)).strip()
    s = re.sub(r' ([,.?!])', r'\1', s)
    return s[0].upper() + s[1:] if sentence and s[0].isalpha() and re.search(r'[。？！]$', text) else s
