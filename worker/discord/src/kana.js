/* Look-alike wrong readings for Japanese reading questions, as in the JLPT — a copy of
   the site's generator (js/quiz.js, KANA_DAKUTEN_MAP … generateSimilarReadings); keep
   them alike. The bot passes its seeded rand so a question rebuilds the same options. */
const KANA_DAKUTEN_MAP = (() => {
    const pairs = [
        ['か','が'], ['き','ぎ'], ['く','ぐ'], ['け','げ'], ['こ','ご'],
        ['さ','ざ'], ['し','じ'], ['す','ず'], ['せ','ぜ'], ['そ','ぞ'],
        ['た','だ'], ['ち','ぢ'], ['つ','づ'], ['て','で'], ['と','ど'],
        ['は','ば'], ['ひ','び'], ['ふ','ぶ'], ['へ','べ'], ['ほ','ぼ'],
        ['は','ぱ'], ['ひ','ぴ'], ['ふ','ぷ'], ['へ','ぺ'], ['ほ','ぽ']
    ];
    const map = {};
    pairs.forEach(([base, voiced]) => {
        (map[base] = map[base] || []).push(voiced);
        (map[voiced] = map[voiced] || []).push(base);
    });
    return map;
})();
const KANA_VOWEL = (() => {
    const rows = {
        a: 'あかさたなはまやらわがざだばぱぁゃ', i: 'いきしちにひみりぎじぢびぴぃ',
        u: 'うくすつぬふむゆるぐずづぶぷぅゅ', e: 'えけせてねへめれげぜでべぺぇ',
        o: 'おこそとのほもよろをごぞどぼぽぉょ'
    };
    const map = {};
    Object.entries(rows).forEach(([v, chars]) => [...chars].forEach(c => { map[c] = v; }));
    return map;
})();
const KANA_SMALL_Y = { 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ' };
const KANA_ROWS = ['あいうえお', 'かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど',
    'なにぬねの', 'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'やゆよ', 'らりるれろ'];
const KANA_SOKUON_NEXT = 'かきくけこさしすせそたちつてとぱぴぷぺぽ';
// slips that are another right reading of the same word (日本: にっぽん), never offered
const KANA_ALSO_RIGHT = { 'にほん': ['にっぽん'], 'にっぽん': ['にほん'] };

/* every one-slip variant of a reading (hiragana; katakana is converted and back) */
function kanaSlips(str) {
    const kata = /[ァ-ヶ]/.test(str) && !/[ぁ-ゖ]/.test(str);
    const c = [...(kata ? str.replace(/[ァ-ヶ]/g, x => String.fromCharCode(x.charCodeAt(0) - 0x60)) : str)];
    const n = c.length;
    const out = [];
    const put = (i, del, ins) => out.push(c.slice(0, i).concat(ins, c.slice(i + del)).join(''));
    for (let i = 0; i < n; i++) {
        const ch = c[i];
        const prev = i > 0 ? KANA_VOWEL[c[i - 1]] : null;
        (KANA_DAKUTEN_MAP[ch] || []).forEach(r => put(i, 1, [r]));
        if (KANA_SMALL_Y[ch]) {
            put(i, 1, [KANA_SMALL_Y[ch]]);
            put(i, 1, [ch === 'ょ' ? 'ゅ' : 'ょ']);
        }
        if (ch === 'っ' || ch === 'ー') put(i, 1, []);
        if (!kata && ((ch === 'う' && (prev === 'o' || prev === 'u')) || (ch === 'い' && prev === 'e'))) put(i, 1, []);
    }
    // a long vowel or っ goes after a kana that isn't itself a long vowel
    const longAt = i => i > 0 && ((c[i] === 'う' && 'ou'.includes(KANA_VOWEL[c[i - 1]] || '-')) || (c[i] === 'い' && KANA_VOWEL[c[i - 1]] === 'e'));
    for (let i = 1; i <= n; i++) {
        const v = KANA_VOWEL[c[i - 1]];
        const next = c[i];
        if (!v || longAt(i - 1) || KANA_SMALL_Y[next] || next === 'ー') continue;
        if (next !== 'ん' && next !== 'っ') {
            if (kata) put(i, 0, ['ー']);
            else if ((v === 'o' || v === 'u') && next !== 'う') put(i, 0, ['う']);
            else if (v === 'e' && next !== 'い') put(i, 0, ['い']);
        }
        if (i < n && KANA_SOKUON_NEXT.includes(next)) put(i, 0, ['っ']);
    }
    const ok = r => r && !/^[ぁぃぅぇぉゃゅょっんー]/.test(r) && !/[っー]$/.test(r) && !/っ[あいうえおっんー]|っっ|ーー/.test(r);
    const res = [...new Set(out.filter(ok))];
    return kata ? res.map(r => r.replace(/[ぁ-ゖ]/g, x => String.fromCharCode(x.charCodeAt(0) + 0x60))) : res;
}

/* the same kana with one vowel changed (あめ → あま, あみ…): for short words with few slips */
function kanaVowelSwaps(str) {
    const c = [...str];
    const out = [];
    c.forEach((ch, i) => {
        if (KANA_SMALL_Y[c[i + 1]]) return;
        const row = KANA_ROWS.find(r => r.includes(ch));
        if (row) [...row].forEach(x => { if (x !== ch) out.push(c.slice(0, i).concat(x, c.slice(i + 1)).join('')); });
    });
    return out;
}

/* count wrong readings: one-slip variants first (at most two), then two-slip ones
   (どうろ → どろう moves the long vowel; at most one kana longer or shorter), then
   a changed vowel; shuffled with rand (Math.random by default) */
export function generateSimilarReadings(correct, count, rand = Math.random) {
    const pick = list => list.length ? list.splice(Math.floor(rand() * list.length), 1)[0] : null;
    const len = [...correct].length;
    const singles = kanaSlips(correct).filter(r => r !== correct);
    const results = [];
    const also = KANA_ALSO_RIGHT[correct] || [];
    const add = r => { if (r && r !== correct && !also.includes(r) && !results.includes(r)) results.push(r); };
    const ones = singles.slice();
    while (results.length < Math.min(2, count) && ones.length) add(pick(ones));
    const twos = new Set();
    singles.forEach(s => kanaSlips(s).forEach(r => {
        if (r !== correct && !singles.includes(r) && Math.abs([...r].length - len) <= 1) twos.add(r);
    }));
    const twoList = [...twos];
    while (results.length < count && twoList.length) add(pick(twoList));
    while (results.length < count && ones.length) add(pick(ones));
    const swaps = /[ァ-ヶ]/.test(correct) ? [] : kanaVowelSwaps(correct);
    while (results.length < count && swaps.length) add(pick(swaps));
    return results;
}
