"""Taiwan readings for the Taiwan edition of the HSK rounds (owner's plan, 2026-10-30: the HSK levels and
formats, rewritten in Traditional with Taiwan wording and readings).

The text is cut and read by tools/zh_mainland.py on its character-for-character Simplified form, so the
Mainland edition's word list, 一 / 不 sandhi and 地 rules carry over, and then moved to Taiwan usage:
  - TW_CHAR: characters whose Taiwan reading differs everywhere (期 qí, 危 / 微 wéi, 垃圾 lèsè …);
  - TW_WORDS: words read differently in Taiwan, plus the house style of tools/zh_reading.py (休息 xiūxí,
    衣服 yīfú, 星期 xīngqí …), longest first;
  - a neutral tone is kept only on the particles and suffixes Taiwan textbooks also write without a tone
    (的 了 著 嗎 呢 吧 們 個 子 麼 …) and on a doubled character (媽媽 māma); elsewhere the syllable gets
    its full tone back (朋友 péngyǒu, 喜歡 xǐhuān, 時候 shíhòu).
reading() returns [(word, [syllable or None per character])] like zh_mainland.reading(); words it gets
wrong go in TW_WORDS (exact Traditional text → pinyin, syllables space-separated)."""
import re
import unicodedata

import opencc

import zh_mainland
import zh_reading

T2S = opencc.OpenCC('t2s')
TW_CHAR = {'期': 'qí', '危': 'wéi', '微': 'wéi', '液': 'yì', '誼': 'yí', '企': 'qì', '擊': 'jí', '寂': 'jí',
           '綜': 'zòng', '暫': 'zhàn', '質': 'zhí', '垃': 'lè', '圾': 'sè', '究': 'jiù', '亞': 'yǎ', '穴': 'xuè',
           '俱': 'jù', '帆': 'fán', '跌': 'dié', '殼': 'ké', '署': 'shǔ', '摑': 'guó', '癌': 'ái'}
TW_WORDS = {'頭髮': 'tóu fǎ', '理髮': 'lǐ fǎ', '法國': 'Fà guó', '和': None, '角色': 'jué sè', '細菌': 'xì jùn',
            '一會兒': 'yì huǐ r', '血液': 'xiě yì', '說服': 'shuì fú', '熟悉': 'shú xī', '從容': 'cōng róng',
            '東西': 'dōng xi', '意思': 'yì si', '什麼': 'shén me', '怎麼': 'zěn me', '這麼': 'zhè me', '那麼': 'nà me',
            '休息': 'xiū xí', '衣服': 'yī fú', '豆腐': 'dòu fǔ', '星期': 'xīng qí', '認識': 'rèn shì',
            '台灣': 'Tái wān', '臺灣': 'Tái wān', '台北': 'Tái běi', '臺北': 'Tái běi', '高雄': 'Gāo xióng', '台中': 'Tái zhōng',
            '台南': 'Tái nán', '花蓮': 'Huā lián', '捷運': 'jié yùn', '垃圾': 'lè sè', '禮拜': 'lǐ bài', '包括': 'bāo kuò',
            '頻率': 'pín lǜ', '部分': 'bù fèn', '種出來': 'zhòng chū lái', '種回': 'zhòng huí', '也種咖啡': 'yě zhòng kā fēi', '種咖啡大約': 'zhòng kā fēi dà yuē', '種父母': 'zhòng fù mǔ', '種出不用': 'zhòng chū bú yòng', '期待': 'qí dài', '暫時': 'zhàn shí', '研究': 'yán jiù', '企業': 'qì yè', '亞洲': 'Yǎ zhōu'}
TW_WORDS = {k: v for k, v in TW_WORDS.items() if v}
# the house style of the Taiwan passages and grammar (zh_reading.WORDS: 沒關係 méi guānxi, 東西 dōngxi …)
for _w, _r in zh_reading.WORDS.items():
    _parts = [zh_reading.split_word(x)[0] for x in _r.split() if zh_reading.split_word(x)]
    _syl = [y for part in _parts for y in part]
    if len(_syl) == len(_w) and all(zh_reading.is_hanzi(c) for c in _w):
        TW_WORDS.setdefault(_w, ' '.join(_syl))
# particles and suffixes that keep the neutral tone (when Mainland gave one)
KEEP_NEUTRAL = set('的了著嗎呢吧們個子麼么啊呀啦嘛喔哦囉地得過頭兒')
MAX_TW = max(len(k) for k in TW_WORDS)


def _base(s):
    """a syllable without its tone mark, lower case, ü kept"""
    d = unicodedata.normalize('NFD', s.lower())
    return unicodedata.normalize('NFC', ''.join(c for c in d if unicodedata.category(c) != 'Mn' or c == '̈'))


def _full_tone(ch, syll):
    """the tone-marked reading of ch whose base is syll's (a neutral syllable given its tone back)"""
    from pypinyin import pinyin, Style
    for cand in pinyin(T2S.convert(ch), style=Style.TONE, heteronym=True)[0]:
        if _base(cand) == _base(syll) and zh_mainland.tone(cand):
            return cand[0].upper() + cand[1:] if syll[:1].isupper() else cand
    return syll


def _simplified(text):
    s = T2S.convert(text)
    if len(s) != len(text):               # a phrase changed length: convert character by character
        s = ''.join(T2S.convert(c) if len(T2S.convert(c)) == 1 else c for c in text)
    # Taiwan writes the particle 著 (睡不著, 開著) with the character Simplified keeps for zhù (著名):
    # 着 everywhere but 著名 / 著作, so zh_mainland reads it zhe / zháo
    return re.sub('著(?![名作])', '着', s)


def reading(text, given=None):
    simp = _simplified(text)
    words = zh_mainland.reading(simp, given)
    sylls, pos, out = [], 0, []
    for w, s in words:                     # back to the Traditional characters, same cut
        out.append([text[pos:pos + len(w)], list(s)])
        pos += len(w)
    if given:
        return [tuple(x) for x in out]
    flat = [(wi, k) for wi, (w, s) in enumerate(out) for k in range(len(w))]
    chars = ''.join(w for w, _ in out)
    # 1. a neutral tone back to its full tone, except particles / suffixes and doubled characters
    for i, (wi, k) in enumerate(flat):
        s = out[wi][1][k]
        if s is None or zh_mainland.tone(s) or s == 'r':
            continue
        ch = chars[i]
        if ch in KEEP_NEUTRAL or (i > 0 and chars[i - 1] == ch):
            continue
        out[wi][1][k] = _full_tone(ch, s)
    # 2. characters read differently in Taiwan
    for i, (wi, k) in enumerate(flat):
        s = out[wi][1][k]
        if s is not None and chars[i] in TW_CHAR:
            r = TW_CHAR[chars[i]]
            out[wi][1][k] = r[0].upper() + r[1:] if s[:1].isupper() else r
    # 3. words, longest first (Taiwan readings and the house style)
    i = 0
    while i < len(chars):
        for n in range(min(MAX_TW, len(chars) - i), 0, -1):
            r = TW_WORDS.get(chars[i:i + n])
            if r and all(out[flat[j][0]][1][flat[j][1]] is not None for j in range(i, i + n)):
                for j, syl in zip(range(i, i + n), r.split()):
                    out[flat[j][0]][1][flat[j][1]] = syl
                i += n
                break
        else:
            i += 1
    return [tuple(x) for x in out]


def pinyin_line(text, given=None):
    return ' '.join(''.join(s) for w, s in reading(text, given) if s and s[0] is not None)


if __name__ == '__main__':
    import sys
    for t in sys.argv[1:]:
        print(t, '→', pinyin_line(t))
