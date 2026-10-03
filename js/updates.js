/* ===================== What's new (header "更新內容" button) =====================
   SITE_UPDATES is the changelog shown in the popup, newest first, one text per
   site language (falls back to zh). Add new entries at the top; the dot on the
   button lights up until the visitor has opened the popup since the newest date. */

const SITE_UPDATES = [
    { date: '2026-10-03',
      zh: '背景加上淡淡的青海波；修正：聽力測驗「聽简体」改用普通話發音、手機上時鐘擋住按鈕、成績表標題，測驗總分不再出現負分。',
      'zh-Hans': '背景加上淡淡的青海波；修复：听力测验“听简体”改用普通话发音、手机上时钟挡住按钮、成绩表标题，测验总分不再出现负分。',
      en: 'Faint seigaiha waves in the background. Fixes: the simplified-Chinese listening quiz now uses a Mainland voice, the clock no longer covers buttons on phones, the score table header is fixed, and quiz scores no longer go below zero.',
      ja: '背景に淡い青海波を追加。修正：リスニングの「簡体字」は普通話の発音に、スマホで時計がボタンを隠さないように、成績表の見出しを修正、合計点がマイナスにならないように。',
      ko: '배경에 은은한 세이가이하 물결 무늬를 추가했어요. 수정: 듣기 퀴즈의 간체 모드는 보통화 발음으로, 휴대폰에서 시계가 버튼을 가리지 않게, 성적표 제목 수정, 총점이 마이너스가 되지 않게.',
      ru: 'Лёгкий узор сэйгайха на фоне. Исправлено: упрощённый китайский в аудировании звучит с путунхуа, часы на телефоне больше не закрывают кнопки, заголовок таблицы результатов, счёт теста больше не уходит в минус.',
      fr: 'Un léger motif de vagues seigaiha en arrière-plan. Corrigé : l\'écoute en chinois simplifié utilise une voix du continent, l\'horloge ne cache plus les boutons sur téléphone, l\'en-tête du tableau des résultats, et le score ne descend plus sous zéro.',
      es: 'Un suave patrón de olas seigaiha en el fondo. Corregido: la escucha en chino simplificado usa una voz de China continental, el reloj ya no tapa botones en el móvil, el encabezado de la tabla de resultados y la puntuación ya no baja de cero.',
      de: 'Ein dezentes Seigaiha-Wellenmuster im Hintergrund. Behoben: Das Hörquiz in vereinfachtem Chinesisch nutzt eine Festland-Stimme, die Uhr verdeckt auf dem Handy keine Buttons mehr, die Überschrift der Ergebnistabelle stimmt, und die Punktzahl wird nicht mehr negativ.' },
    { date: '2026-10-03',
      zh: '電腦版排版加寬：字母表一列放更多字母，字典的例句移到右側，單字測驗的關卡和單元左右並排；頁首新增「關於我」和「更新內容」。',
      'zh-Hans': '电脑版排版加宽：字母表一行放更多字母，词典的例句移到右侧，单词测验的关卡和单元左右并排；页首新增“关于我”和“更新内容”。',
      en: 'Wider desktop layout: more letters per row in the alphabet chart, dictionary examples on the right, quiz levels and units side by side. "About me" and "What\'s new" are now in the header.',
      ja: 'パソコン版を横に広く：文字表は1行に多くの文字を、辞書の例文は右側に、単語テストのステージとユニットは横並びに。ヘッダーに「自己紹介」と「更新情報」を追加。',
      ko: 'PC 화면을 넓게: 문자표는 한 줄에 더 많은 글자, 사전 예문은 오른쪽, 단어 퀴즈의 단계와 단원은 나란히. 상단에 "소개"와 "업데이트 내용"을 추가했어요.',
      ru: 'Широкая раскладка для компьютера: больше букв в строке алфавита, примеры словаря справа, уровни и разделы теста рядом. В шапке появились «Обо мне» и «Что нового».',
      fr: 'Mise en page élargie sur ordinateur : plus de lettres par ligne dans l\'alphabet, exemples du dictionnaire à droite, niveaux et unités du quiz côte à côte. « À propos » et « Nouveautés » sont dans l\'en-tête.',
      es: 'Diseño más ancho en ordenador: más letras por fila en el alfabeto, ejemplos del diccionario a la derecha, niveles y unidades del quiz lado a lado. «Sobre mí» y «Novedades» están ahora en la cabecera.',
      de: 'Breiteres Layout am Computer: mehr Buchstaben pro Zeile im Alphabet, Wörterbuch-Beispiele rechts, Level und Einheiten des Quiz nebeneinander. „Über mich“ und „Neuigkeiten“ sind jetzt oben in der Kopfzeile.' },
    { date: '2026-10-03',
      zh: '發音升級：日文、韓文、中文改用預錄的自然語音；設定裡可以為每種語言挑選聲音。',
      'zh-Hans': '发音升级：日语、韩语、中文改用预录的自然语音；设置里可以为每种语言挑选声音。',
      en: 'Better pronunciation: Japanese, Korean and Chinese now play pre-recorded natural voices, and you can pick a voice for each language in the settings.',
      ja: '発音をアップグレード：日本語・韓国語・中国語は収録済みの自然な音声に。設定で言語ごとに声を選べます。',
      ko: '발음 업그레이드: 일본어, 한국어, 중국어는 미리 녹음한 자연스러운 음성으로 재생돼요. 설정에서 언어별로 음성을 고를 수 있어요.',
      ru: 'Лучшее произношение: японский, корейский и китайский теперь звучат записанными естественными голосами, а в настройках можно выбрать голос для каждого языка.',
      fr: 'Meilleure prononciation : le japonais, le coréen et le chinois utilisent des voix naturelles enregistrées, et vous pouvez choisir une voix par langue dans les réglages.',
      es: 'Mejor pronunciación: el japonés, el coreano y el chino usan voces naturales grabadas, y puedes elegir una voz para cada idioma en los ajustes.',
      de: 'Bessere Aussprache: Japanisch, Koreanisch und Chinesisch klingen jetzt nach aufgenommenen natürlichen Stimmen, und in den Einstellungen kannst du pro Sprache eine Stimme wählen.' },
    { date: '2026-10-03',
      zh: '新增字母表：英文、日文假名、韓文、注音、俄文、法文、德文、西班牙文，每個字母都有讀音和例字。',
      'zh-Hans': '新增字母表：英语、日语假名、韩语、注音、俄语、法语、德语、西班牙语，每个字母都有读音和例词。',
      en: 'New alphabet chart: English, Japanese kana, Korean, Zhuyin, Russian, French, German and Spanish, each letter with its sound and an example word.',
      ja: '文字表を追加：英語、日本語のかな、韓国語、注音、ロシア語、フランス語、ドイツ語、スペイン語。どの文字にも読み方と例の単語があります。',
      ko: '문자표 추가: 영어, 일본어 가나, 한국어, 주음부호, 러시아어, 프랑스어, 독일어, 스페인어. 모든 글자에 발음과 예시 단어가 있어요.',
      ru: 'Новый алфавит: английский, японская кана, корейский, чжуинь, русский, французский, немецкий и испанский — у каждой буквы есть звучание и слово-пример.',
      fr: 'Nouvel alphabet : anglais, kana japonais, coréen, zhuyin, russe, français, allemand et espagnol, chaque lettre avec sa prononciation et un mot d\'exemple.',
      es: 'Nuevo alfabeto: inglés, kana japonés, coreano, zhuyin, ruso, francés, alemán y español, cada letra con su sonido y una palabra de ejemplo.',
      de: 'Neues Alphabet: Englisch, japanische Kana, Koreanisch, Zhuyin, Russisch, Französisch, Deutsch und Spanisch – jeder Buchstabe mit Aussprache und Beispielwort.' },
    { date: '2026-10-03',
      zh: '單字庫改版：英文（國中、高中、多益、托福）、JLPT、TOPIK、HSK 3.0，全部依常用程度由簡單排到難。',
      'zh-Hans': '单词库改版：英语（初中、高中、托业、托福）、JLPT、TOPIK、HSK 3.0，全部按常用程度由简单排到难。',
      en: 'New word lists: English (junior high, senior high, TOEIC, TOEFL), JLPT, TOPIK and HSK 3.0, all ordered from common and easy to harder.',
      ja: '単語リストを刷新：英語（中学・高校・TOEIC・TOEFL）、JLPT、TOPIK、HSK 3.0。どれもよく使う簡単な単語から順に並んでいます。',
      ko: '단어장 개편: 영어(중학교·고등학교·토익·토플), JLPT, TOPIK, HSK 3.0. 모두 자주 쓰는 쉬운 단어부터 정리했어요.',
      ru: 'Новые списки слов: английский (школьный, TOEIC, TOEFL), JLPT, TOPIK и HSK 3.0 — от частых и простых слов к более трудным.',
      fr: 'Nouvelles listes de mots : anglais (collège, lycée, TOEIC, TOEFL), JLPT, TOPIK et HSK 3.0, des mots les plus courants aux plus difficiles.',
      es: 'Nuevas listas de palabras: inglés (secundaria, bachillerato, TOEIC, TOEFL), JLPT, TOPIK y HSK 3.0, de las más comunes y fáciles a las más difíciles.',
      de: 'Neue Wortlisten: Englisch (Mittel-, Oberstufe, TOEIC, TOEFL), JLPT, TOPIK und HSK 3.0 – von häufigen, leichten zu schwereren Wörtern.' },
    { date: '2026-10-03',
      zh: '新增字典：查單字的翻譯、詞性、解釋和例句。',
      'zh-Hans': '新增词典：查单词的翻译、词性、解释和例句。',
      en: 'New dictionary: look up a word\'s translation, part of speech, meaning and example sentences.',
      ja: '辞書を追加：単語の訳、品詞、意味、例文を調べられます。',
      ko: '사전 추가: 단어의 번역, 품사, 뜻, 예문을 찾아볼 수 있어요.',
      ru: 'Новый словарь: перевод слова, часть речи, значение и примеры.',
      fr: 'Nouveau dictionnaire : traduction, nature, sens et phrases d\'exemple d\'un mot.',
      es: 'Nuevo diccionario: traducción, categoría gramatical, significado y ejemplos de una palabra.',
      de: 'Neues Wörterbuch: Übersetzung, Wortart, Bedeutung und Beispielsätze zu einem Wort.' },
    { date: '2026-10-02',
      zh: '新增學習路徑：每個單字庫分成一關 10 個字，過關（答對 80%）就解鎖下一關。',
      'zh-Hans': '新增学习路径：每个单词库分成一关 10 个词，过关（答对 80%）就解锁下一关。',
      en: 'New learning path: every word list is split into levels of 10 words; pass one (80% right) to unlock the next.',
      ja: '学習ルートを追加：単語リストを10語ずつのステージに分け、80%正解で次のステージが開きます。',
      ko: '학습 경로 추가: 단어장을 10단어씩 단계로 나누고, 80% 맞히면 다음 단계가 열려요.',
      ru: 'Новый учебный путь: каждый список разбит на уровни по 10 слов; пройди уровень (80% верно), чтобы открыть следующий.',
      fr: 'Nouveau parcours : chaque liste est découpée en niveaux de 10 mots ; réussissez-en un (80 %) pour débloquer le suivant.',
      es: 'Nueva ruta de aprendizaje: cada lista se divide en niveles de 10 palabras; supera uno (80 % de aciertos) para desbloquear el siguiente.',
      de: 'Neuer Lernpfad: Jede Wortliste ist in Level zu 10 Wörtern geteilt; schaffst du eins (80 % richtig), wird das nächste frei.' },
    { date: '2026-10-02',
      zh: '間隔複習：每次作答都會記錄，在快忘記的時候提醒你複習。',
      'zh-Hans': '间隔复习：每次作答都会记录，在快忘记的时候提醒你复习。',
      en: 'Spaced repetition: every answer is remembered, and words come back for review just before you\'d forget them.',
      ja: '間隔反復：解答はすべて記録され、忘れかけた頃に復習を促します。',
      ko: '간격 반복: 모든 답을 기록하고, 잊어버릴 즈음에 복습하도록 알려 줘요.',
      ru: 'Интервальное повторение: каждый ответ запоминается, и слова возвращаются на повторение, пока ты их не забыл.',
      fr: 'Répétition espacée : chaque réponse est retenue et les mots reviennent juste avant que vous ne les oubliiez.',
      es: 'Repaso espaciado: se guarda cada respuesta y las palabras vuelven justo antes de que las olvides.',
      de: 'Verteilte Wiederholung: Jede Antwort wird gemerkt, und Wörter kommen zurück, kurz bevor du sie vergisst.' },
    { date: '2026-10-02',
      zh: '網站全新改版：和紙配色、立體按鈕、吉祥物小花火、首頁的每日目標和連續學習天數，以及手機版底部選單。',
      'zh-Hans': '网站全新改版：和纸配色、立体按钮、吉祥物小花火、首页的每日目标和连续学习天数，以及手机版底部菜单。',
      en: 'A fresh new look: washi colours, chunky buttons, the mascot 小花火, a home page with a daily goal and streak, and a bottom tab bar on phones.',
      ja: 'サイトをリニューアル：和紙の配色、立体ボタン、マスコットの小花火、ホームの毎日の目標と連続学習日数、スマホ用の下部メニュー。',
      ko: '사이트 새 단장: 화지 색감, 입체 버튼, 마스코트 小花火, 홈 화면의 하루 목표와 연속 학습일, 휴대폰 하단 메뉴.',
      ru: 'Новый облик сайта: цвета васи, объёмные кнопки, талисман 小花火, главная с дневной целью и серией дней, нижнее меню на телефонах.',
      fr: 'Nouveau look : couleurs washi, boutons en relief, la mascotte 小花火, un accueil avec objectif du jour et série de jours, et un menu en bas sur téléphone.',
      es: 'Nuevo diseño: colores washi, botones en relieve, la mascota 小花火, un inicio con meta diaria y racha, y un menú inferior en el móvil.',
      de: 'Neuer Look: Washi-Farben, plastische Buttons, das Maskottchen 小花火, eine Startseite mit Tagesziel und Serie und eine untere Leiste auf dem Handy.' },
];

function updatesSeenKey() {
    return SITE_UPDATES.length ? SITE_UPDATES[0].date : '';
}

// the dot sits on the header button (desktop) and on the phone "More" tab + item
function refreshUpdatesDot() {
    let seen = '';
    try { seen = localStorage.getItem('updates_seen') || ''; } catch {}
    const fresh = updatesSeenKey() > seen;
    document.querySelectorAll('.updates-dot').forEach(dot => { dot.hidden = !fresh; });
}

function updatesDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    try {
        return new Date(y, m - 1, d).toLocaleDateString(siteLang === 'zh' ? 'zh-TW' : siteLang === 'zh-Hans' ? 'zh-CN' : siteLang,
            { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
}

function renderUpdates() {
    const list = document.getElementById('updates-list');
    if (!list) return;
    list.innerHTML = SITE_UPDATES.map(u => `<li class="updates-item">
        <time class="updates-date" datetime="${u.date}">${escHtml(updatesDate(u.date))}</time>
        <p class="updates-text">${escHtml(u[siteLang] || u.zh)}</p>
    </li>`).join('');
}

function openUpdates() {
    const overlay = document.getElementById('updates-overlay');
    if (!overlay) return;
    renderUpdates();
    overlay.classList.add('show');
    try { localStorage.setItem('updates_seen', updatesSeenKey()); } catch {}
    refreshUpdatesDot();
    const close = overlay.querySelector('.updates-close');
    if (close) close.focus();
}

function closeUpdates() {
    const overlay = document.getElementById('updates-overlay');
    if (overlay) overlay.classList.remove('show');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeUpdates();
});

document.addEventListener('DOMContentLoaded', refreshUpdatesDot);
