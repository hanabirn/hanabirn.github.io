/* ===================== What's new ("更新內容" in the ☰ menu / the phone More sheet) =====================
   SITE_UPDATES is the changelog shown in the popup, newest first, one text per
   site language (falls back to zh). Add new entries at the top; the dot on the
   button lights up until the visitor has opened the popup since the newest date. */

const SITE_UPDATES = [
    { date: '2026-10-16',
      zh: '閱讀頁新增日文 N3：8 篇約 500 字的文章，比 N4 再長一些，也更有深度——「もったいない」這個詞、在家上班的優缺點、和爺爺下將棋、面試失敗，還有讀者投書、垃圾分類公告和馬拉松報名須知。開始出現「歯が立たない」「頭が真っ白になる」這類慣用語，題目也會問慣用語的意思和作者最想說什麼。',
      'zh-Hans': '阅读页新增日语 N3：8 篇约 500 字的文章，比 N4 再长一些，也更有深度——「もったいない」这个词、居家办公的优缺点、和爷爷下将棋、面试失败，还有读者来信、垃圾分类公告和马拉松报名须知。开始出现「歯が立たない」「頭が真っ白になる」这类惯用语，题目也会问惯用语的意思和作者最想说什么。',
      en: 'New on the Reading page: Japanese N3 — 8 texts of about 500 characters, longer and deeper than N4: the word “mottainai”, the pros and cons of working from home, playing shogi with Grandpa, a failed interview, plus a letter to a newspaper, a rubbish-collection notice and a marathon entry guide. Idioms such as 歯が立たない and 頭が真っ白になる appear, and the questions ask what they mean and what the writer most wants to say.',
      ja: '読解ページに日本語 N3 を追加：N4 より長く、内容も深い約500字の文章が8つ——「もったいない」という言葉、在宅勤務のよい点と悪い点、祖父と将棋、面接での失敗、それに新聞への投書、ごみの出し方のお知らせ、マラソン大会の案内。「歯が立たない」「頭が真っ白になる」などの慣用句が登場し、その意味や筆者がいちばん言いたいことを問う問題もあります。',
      ko: '읽기 페이지에 일본어 N3 추가: N4보다 길고 깊이 있는 약 500자 글 8편 — 「もったいない」라는 말, 재택근무의 장단점, 할아버지와 쇼기, 면접 실패, 그리고 신문 투고, 쓰레기 배출 안내문, 마라톤 대회 안내. 「歯が立たない」「頭が真っ白になる」 같은 관용구가 나오고, 그 뜻과 글쓴이가 가장 하고 싶은 말을 묻는 문제도 있어요.',
      ru: 'В разделе «Чтение» появился японский N3: 8 текстов примерно по 500 знаков — длиннее и глубже, чем N4: слово «моттайнай», плюсы и минусы удалённой работы, сёги с дедушкой, неудачное собеседование, а также письмо в газету, объявление о вывозе мусора и правила участия в марафоне. Появляются идиомы вроде 歯が立たない и 頭が真っ白になる, а вопросы спрашивают об их значении и о главной мысли автора.',
      fr: 'Nouveau dans Lecture : le japonais N3 — 8 textes d’environ 500 caractères, plus longs et plus riches qu’en N4 : le mot « mottainai », les avantages et inconvénients du télétravail, le shogi avec grand-père, un entretien raté, ainsi qu’une lettre à un journal, un avis sur le tri des déchets et un guide d’inscription à un marathon. Des expressions comme 歯が立たない et 頭が真っ白になる apparaissent, et les questions portent sur leur sens et sur ce que l’auteur veut surtout dire.',
      es: 'Novedad en Lectura: japonés N3 — 8 textos de unos 500 caracteres, más largos y profundos que los de N4: la palabra «mottainai», ventajas y desventajas del teletrabajo, el shogi con el abuelo, una entrevista fallida, además de una carta a un periódico, un aviso sobre la basura y una guía para inscribirse en un maratón. Aparecen modismos como 歯が立たない y 頭が真っ白になる, y las preguntas piden su significado y lo que el autor más quiere decir.',
      de: 'Neu auf der Seite Lesen: Japanisch N3 — 8 Texte mit etwa 500 Zeichen, länger und tiefer als N4: das Wort „mottainai“, Vor- und Nachteile des Homeoffice, Shogi mit dem Großvater, ein misslungenes Vorstellungsgespräch, dazu ein Leserbrief, ein Aushang zur Mülltrennung und eine Marathon-Ausschreibung. Redewendungen wie 歯が立たない und 頭が真っ白になる kommen vor, und die Fragen zielen auf ihre Bedeutung und darauf, was der Autor vor allem sagen will.' },
    { date: '2026-10-16',
      zh: '閱讀頁新增日文 N4：8 篇比 N5 長一倍的文章——搬家、第一次打工、腳踏車差點出事、奶奶的信，還有給老師的電子郵件、圖書館公告和料理教室傳單（要從裡面找答案，像 JLPT 一樣）。每篇 11–12 個生詞、8 題，朗讀用更自然的 Gemini 聲音錄製。',
      'zh-Hans': '阅读页新增日语 N4：8 篇比 N5 长一倍的文章——搬家、第一次打工、自行车差点出事、奶奶的信，还有给老师的电子邮件、图书馆公告和料理教室传单（要从里面找答案，像 JLPT 一样）。每篇 11–12 个生词、8 题，朗读用更自然的 Gemini 声音录制。',
      en: 'New on the Reading page: Japanese N4 — 8 texts about twice as long as N5: moving house, a first part-time job, a near-miss on a bike, a letter from Grandma, plus an email to a teacher and a library notice and cooking-class flyer to search for answers in, as in the JLPT. Each has 11–12 glossary words and 8 questions, read aloud in a more natural Gemini voice.',
      ja: '読解ページに日本語 N4 を追加：N5 の約2倍の長さの文章が8つ——引っ越し、はじめてのアルバイト、自転車の事故、祖母の手紙、それに先生へのメール、図書館のお知らせと料理教室のチラシ（JLPT のように情報を探して答える問題）。各11〜12語の語彙と8問つきで、朗読はより自然な Gemini の音声です。',
      ko: '읽기 페이지에 일본어 N4 추가: N5보다 두 배쯤 긴 글 8편 — 이사, 첫 아르바이트, 자전거 사고 날 뻔한 일, 할머니의 편지, 그리고 선생님께 보내는 이메일, 도서관 안내문과 요리 교실 전단지(JLPT처럼 정보를 찾아 답하는 문제). 편마다 단어 11~12개와 8문제가 있고, 낭독은 더 자연스러운 Gemini 음성으로 녹음했어요.',
      ru: 'В разделе «Чтение» появился японский N4: 8 текстов примерно вдвое длиннее N5 — переезд, первая подработка, случай на велосипеде, письмо бабушки, а также письмо учителю, объявление библиотеки и листовка кулинарных курсов, где ответ нужно найти в тексте, как на JLPT. В каждом 11–12 слов в словарике и 8 вопросов, озвучка — более естественным голосом Gemini.',
      fr: 'Nouveau dans Lecture : le japonais N4 — 8 textes environ deux fois plus longs qu’en N5 : un déménagement, un premier petit boulot, un accident de vélo évité de peu, une lettre de grand-mère, ainsi qu’un e-mail à un professeur, une annonce de bibliothèque et un prospectus de cours de cuisine où chercher les réponses, comme au JLPT. Chacun a 11 à 12 mots de vocabulaire et 8 questions, lus par une voix Gemini plus naturelle.',
      es: 'Novedad en Lectura: japonés N4 — 8 textos el doble de largos que los de N5: una mudanza, un primer trabajo a tiempo parcial, un susto en bicicleta, una carta de la abuela, además de un correo a un profesor, un aviso de biblioteca y un folleto de clases de cocina donde buscar las respuestas, como en el JLPT. Cada uno tiene 11–12 palabras de vocabulario y 8 preguntas, con lectura en una voz de Gemini más natural.',
      de: 'Neu auf der Seite Lesen: Japanisch N4 — 8 Texte, etwa doppelt so lang wie N5: ein Umzug, der erste Nebenjob, ein Beinahe-Unfall mit dem Fahrrad, ein Brief der Großmutter, dazu eine E-Mail an einen Lehrer sowie ein Bibliotheksaushang und ein Kochkurs-Flyer, in denen man wie im JLPT die Antworten sucht. Jeder Text hat 11–12 Vokabeln und 8 Fragen und wird mit einer natürlicheren Gemini-Stimme vorgelesen.' },
    { date: '2026-10-16',
      zh: '日文文法補齊了：新增 N2（76 個）和 N1（67 個）文法，從 N5 到 N1 全部都有。每個文法點的練習現在有 6 題——先 3 題簡單，再 3 題標著「進階」的困難題，困難題會用到更難的字彙，還有一題「句子排序」（N5–N4 把整句排好，N3 以上照 JLPT 考法選出 ★ 的位置）。N3 以上的題目用漢字，難字附讀音。中文文法例句的中國口音錄音也全部完成了。',
      'zh-Hans': '日语语法补齐了：新增 N2（76 个）和 N1（67 个）语法，从 N5 到 N1 全部都有。每个语法点的练习现在有 6 题——先 3 题简单，再 3 题标着“进阶”的难题，难题会用到更难的词汇，还有一题“句子排序”（N5–N4 把整句排好，N3 以上按 JLPT 考法选出 ★ 的位置）。N3 以上的题目用汉字，难字附读音。中文语法例句的中国口音录音也全部完成了。',
      en: 'Japanese grammar is now complete from N5 to N1, with N2 (76 points) and N1 (67) added. Each point\'s practice now has six questions — three easy ones, then three marked Advanced that use harder words and include a sentence-ordering question (put the whole sentence in order for N5–N4; pick the part that goes on ★, as in the JLPT, from N3). From N3 the questions use kanji, with readings on the harder ones. All the Chinese grammar examples can now be heard in a Mainland accent too.',
      ja: '日本語の文法が N5 から N1 までそろいました。N2（76）と N1（67）を追加。どの文法も練習が6問になり、易しい3問のあとに「応用」の3問——難しめの語彙を使い、文の組み立て問題も1問（N5–N4 は文全体を並べ、N3 からは JLPT と同じく★に入るものを選ぶ）——が続きます。N3 からは漢字の問題で、難しい字には読み仮名つき。中国語の文法例文は、大陸の発音の録音もすべてそろいました。',
      ko: '일본어 문법이 N5부터 N1까지 모두 갖춰졌어요. N2(76개)와 N1(67개)를 추가했어요. 문법마다 연습이 6문제로 늘어서, 쉬운 3문제 다음에 「심화」 3문제가 나와요. 더 어려운 어휘를 쓰고, 문장 배열 문제도 하나 있어요(N5–N4는 문장 전체를 배열, N3부터는 JLPT처럼 ★에 들어갈 것을 고르기). N3부터는 한자 문제이고 어려운 글자에는 읽는 법을 달았어요. 중국어 문법 예문은 대륙 발음 녹음도 모두 완성했어요.',
      ru: 'Японская грамматика теперь полная — от N5 до N1: добавлены N2 (76 тем) и N1 (67). В каждой теме теперь шесть вопросов: три простых и три с пометкой «Сложнее» — с более трудной лексикой и вопросом на порядок слов (в N5–N4 нужно собрать всё предложение, с N3 — как в JLPT, выбрать часть для ★). С N3 вопросы с кандзи, у трудных знаков есть чтение. Все примеры китайской грамматики теперь можно послушать и с материковым произношением.',
      fr: 'La grammaire japonaise est complète de N5 à N1, avec l’ajout de N2 (76 points) et N1 (67). Chaque point propose maintenant six questions : trois faciles, puis trois « Avancé » au vocabulaire plus difficile, dont une question d’ordre de la phrase (remettre toute la phrase en ordre en N5–N4 ; à partir de N3, choisir la partie qui va sur ★, comme au JLPT). À partir de N3, les questions sont en kanji, avec la lecture des plus difficiles. Tous les exemples de grammaire chinoise s’écoutent aussi avec l’accent du continent.',
      es: 'La gramática japonesa ya está completa de N5 a N1, con N2 (76 puntos) y N1 (67) nuevos. Cada punto tiene ahora seis preguntas: tres fáciles y luego tres «Avanzado», con vocabulario más difícil y una pregunta para ordenar la frase (en N5–N4 se ordena la frase entera; desde N3, como en el JLPT, se elige la parte que va en ★). Desde N3 las preguntas usan kanji, con la lectura de los más difíciles. Todos los ejemplos de gramática china se pueden escuchar también con acento continental.',
      de: 'Die japanische Grammatik ist jetzt von N5 bis N1 komplett – neu sind N2 (76 Punkte) und N1 (67). Jeder Punkt hat jetzt sechs Fragen: drei leichte, dann drei „Fortgeschritten“ mit schwierigerem Wortschatz und einer Satzbau-Frage (bei N5–N4 den ganzen Satz ordnen, ab N3 wie im JLPT den Teil für ★ wählen). Ab N3 stehen die Fragen in Kanji, schwierige Zeichen mit Lesung. Alle chinesischen Grammatikbeispiele gibt es jetzt auch mit Festland-Aussprache.' },
    { date: '2026-10-15',
      zh: '文法、閱讀和聽解現在有日、韓、俄、法、西、德文的說明和翻譯了，換成哪種介面語言都看得懂。單字測驗和檢定考試先選「亞洲語言」或「歐洲語言」再選語言；文法、閱讀、聽解上方改成一個語言選單加一排等級，每個等級都看得到進度。中文發音可以自己選台灣或中國大陸口音，和繁體、簡體分開選（閱讀、文法頁的 🔊 旁邊，或顯示設定的「中文口音」），文法例句也補上了中國大陸口音的錄音。另外修掉了部分中文錄音一開始和句尾的小爆音，更新內容視窗也變寬了。',
      'zh-Hans': '语法、阅读和听解现在有日、韩、俄、法、西、德语的说明和翻译了，换成哪种界面语言都看得懂。单词测验和检定考试先选“亚洲语言”或“欧洲语言”再选语言；语法、阅读、听解上方改成一个语言菜单加一排等级，每个等级都能看到进度。中文发音可以自己选台湾或中国大陆口音，和繁体、简体分开选（阅读、语法页的 🔊 旁边，或显示设置的“中文口音”），语法例句也补上了中国大陆口音的录音。另外修掉了部分中文录音开头和句尾的小爆音，更新内容窗口也变宽了。',
      en: 'Grammar, reading and listening now come with explanations and translations in Japanese, Korean, Russian, French, Spanish and German too, whatever your interface language. The vocabulary quiz and exam prep pages start with Asian or European languages, then the language; grammar, reading and listening open with a language menu and a row of levels showing your progress. Pick a Taiwan or Mainland accent for spoken Chinese, separately from Traditional / Simplified (next to the 🔊 on the reading and grammar pages, or Chinese accent in the display settings) — grammar examples now have Mainland recordings too. Also fixed a small pop at the start and end of some Chinese recordings, and the What\'s new window is wider.',
      ja: '文法・読解・聴解に、日本語・韓国語・ロシア語・フランス語・スペイン語・ドイツ語の説明と訳がつきました。どの表示言語でも読めます。単語テストと検定試験は「アジアの言語」か「ヨーロッパの言語」を選んでから言語を選ぶ形に。文法・読解・聴解は言語メニューとレベルの列になり、レベルごとの進み具合が見えます。中国語の発音は台湾か中国大陸のアクセントを、繁体字・簡体字とは別に選べます（読解・文法ページの 🔊 の横、または表示設定の「中国語のアクセント」）。文法の例文にも大陸の発音の音声を追加。ほかに、一部の中国語音声の始まりと文末の小さなノイズを直し、更新内容の画面を広くしました。',
      ko: '문법·읽기·듣기에 일본어·한국어·러시아어·프랑스어·스페인어·독일어 설명과 번역이 생겼어요. 어떤 화면 언어로도 읽을 수 있어요. 단어 퀴즈와 검정시험은 먼저 \'아시아 언어\' 또는 \'유럽 언어\'를 고른 뒤 언어를 골라요. 문법·읽기·듣기 위쪽은 언어 메뉴와 레벨 한 줄로 바뀌고, 레벨마다 진도가 보여요. 중국어 발음은 대만 또는 중국 본토 억양을 번체·간체와 따로 고를 수 있어요(읽기·문법 페이지의 🔊 옆, 또는 화면 설정의 \'중국어 억양\'). 문법 예문에도 본토 억양 음성을 추가했어요. 그리고 일부 중국어 음성의 시작과 끝에 나던 작은 잡음을 고치고, 업데이트 창을 넓혔어요.',
      ru: 'У грамматики, чтения и аудирования появились объяснения и переводы на японский, корейский, русский, французский, испанский и немецкий — понятно на любом языке интерфейса. Тест на слова и экзамены начинаются с выбора «Языки Азии» или «Языки Европы», затем языка; грамматика, чтение и аудирование открываются меню языков и рядом уровней с прогрессом. Для китайского можно выбрать тайваньский или материковый акцент отдельно от полных и упрощённых иероглифов (рядом с 🔊 на страницах чтения и грамматики или в настройках отображения) — у примеров грамматики появились записи с материковым акцентом. Ещё исправлен тихий щелчок в начале и конце некоторых китайских записей, а окно новостей стало шире.',
      fr: 'La grammaire, la lecture et l’écoute ont maintenant leurs explications et traductions en japonais, coréen, russe, français, espagnol et allemand, quelle que soit la langue de l’interface. Le quiz de vocabulaire et les examens commencent par Langues d’Asie ou Langues d’Europe, puis la langue ; grammaire, lecture et écoute s’ouvrent sur un menu des langues et une rangée de niveaux avec ta progression. Choisis un accent de Taïwan ou de Chine continentale pour le chinois, indépendamment des caractères traditionnels ou simplifiés (à côté du 🔊 sur les pages lecture et grammaire, ou dans « Accent chinois » des réglages) — les exemples de grammaire ont aussi leurs enregistrements avec l’accent continental. Corrigé aussi : un petit claquement au début et à la fin de certains enregistrements chinois ; la fenêtre des nouveautés est plus large.',
      es: 'La gramática, la lectura y la comprensión auditiva ya tienen explicaciones y traducciones en japonés, coreano, ruso, francés, español y alemán, sea cual sea el idioma de la interfaz. La prueba de vocabulario y los exámenes empiezan eligiendo Idiomas de Asia o de Europa y luego el idioma; gramática, lectura y comprensión auditiva se abren con un menú de idiomas y una fila de niveles con tu progreso. Elige acento de Taiwán o de China continental para el chino, aparte de los caracteres tradicionales o simplificados (junto al 🔊 en lectura y gramática, o en «Acento del chino» de los ajustes) — los ejemplos de gramática ya tienen grabaciones con acento continental. Además, se corrigió un pequeño chasquido al principio y al final de algunas grabaciones en chino, y la ventana de novedades es más ancha.',
      de: 'Grammatik, Lesen und Hörverstehen haben jetzt Erklärungen und Übersetzungen auf Japanisch, Koreanisch, Russisch, Französisch, Spanisch und Deutsch – in jeder Oberflächensprache verständlich. Vokabelquiz und Prüfungen beginnen mit Asiatische oder Europäische Sprachen, dann der Sprache; Grammatik, Lesen und Hörverstehen öffnen mit einem Sprachmenü und einer Reihe von Stufen samt Fortschritt. Für Chinesisch wählst du Taiwan- oder Festlandakzent, unabhängig von Lang- oder Kurzzeichen (neben dem 🔊 auf den Seiten Lesen und Grammatik oder unter „Chinesischer Akzent“ in den Einstellungen) – die Grammatikbeispiele haben jetzt auch Aufnahmen mit Festlandakzent. Außerdem behoben: ein leises Knacken am Anfang und Ende mancher chinesischer Aufnahmen; das Fenster mit den Neuigkeiten ist breiter.' },
    { date: '2026-10-10',
      zh: '選單整理得更簡潔了：電腦版上方只留「首頁、單字測驗、檢定考試」和兩個選單——「學習」（文法、閱讀、聽解）和「工具」（字典、字母表、記事本）；更新內容、留言板、建議、關於我、背景音樂和設定都收進右上角的 ☰。手機底部多了「學習」一格，點一下就能看到三個功能和各自的進度；「更多」改成分類的方格，不用再往下捲。右下角的時鐘拿掉了。',
      'zh-Hans': '菜单整理得更简洁了：电脑版上方只留“首页、单词测验、检定考试”和两个菜单——“学习”（语法、阅读、听解）和“工具”（词典、字母表、记事本）；更新内容、留言板、建议、关于我、背景音乐和设置都收进右上角的 ☰。手机底部多了“学习”一格，点一下就能看到三个功能和各自的进度；“更多”改成分类的方格，不用再往下滑。右下角的时钟去掉了。',
      en: 'A tidier menu: on computers the top bar keeps just Home, Vocabulary Quiz and Exam Prep plus two menus — Learn (grammar, reading, listening) and Tools (dictionary, alphabet, notes); What\'s new, the guestbook, suggestions, About, background music and settings moved into the ☰ at the top right. On phones the tab bar gains a Learn tab showing those three with your progress, and More is now a grid of groups that fits without scrolling. The clock in the corner is gone.',
      ja: 'メニューをすっきり整理：パソコンでは上に「ホーム・単語テスト・検定試験」と2つのメニュー——「学ぶ」（文法・読解・聴解）と「ツール」（辞書・文字表・メモ帳）だけ。更新内容・掲示板・ご意見・自己紹介・BGM・設定は右上の ☰ に入りました。スマホは下のバーに「学ぶ」が加わり、3つの機能と進み具合がひと目でわかります。「その他」はグループ分けしたマス目になり、スクロールいらず。右下の時計はなくしました。',
      ko: '메뉴를 깔끔하게 정리했어요: 컴퓨터에서는 위에 \'홈·단어 퀴즈·검정시험\'과 두 메뉴 — \'학습\'(문법·읽기·듣기), \'도구\'(사전·알파벳표·메모장)만 남기고, 업데이트·방명록·건의·소개·배경 음악·설정은 오른쪽 위 ☰ 안으로 옮겼어요. 휴대폰 아래 바에는 \'학습\'이 생겨 세 기능과 진도를 한눈에 볼 수 있고, \'더보기\'는 묶음별 칸으로 바뀌어 스크롤이 필요 없어요. 오른쪽 아래 시계는 없앴어요.',
      ru: 'Меню стало проще: на компьютере вверху остались «Главная», «Тест на слова», «Экзамены» и два меню — «Учёба» (грамматика, чтение, аудирование) и «Инструменты» (словарь, алфавит, заметки); новости, гостевая, предложения, «Обо мне», музыка и настройки переехали в ☰ справа вверху. На телефоне в нижней панели появилась «Учёба» с этими тремя разделами и прогрессом, а «Ещё» стало сеткой по группам — без прокрутки. Часы в углу убраны.',
      fr: 'Un menu plus clair : sur ordinateur, la barre du haut garde Accueil, Quiz vocabulaire et Examens, plus deux menus — Apprendre (grammaire, lecture, écoute) et Outils (dictionnaire, alphabet, notes) ; nouveautés, livre d’or, suggestions, À propos, musique et réglages passent dans le ☰ en haut à droite. Sur téléphone, la barre du bas gagne un onglet Apprendre avec ces trois pages et ta progression, et « Plus » devient une grille par groupes, sans défilement. L’horloge dans le coin a disparu.',
      es: 'Un menú más ordenado: en el ordenador, la barra de arriba deja solo Inicio, Prueba de vocabulario y Exámenes, más dos menús — Aprender (gramática, lectura, comprensión auditiva) y Herramientas (diccionario, alfabeto, notas); novedades, libro de visitas, sugerencias, Sobre mí, música y ajustes pasan al ☰ de arriba a la derecha. En el móvil, la barra de abajo suma Aprender con esas tres páginas y tu progreso, y «Más» es ahora una cuadrícula por grupos, sin desplazarse. El reloj de la esquina ya no está.',
      de: 'Ein aufgeräumteres Menü: Am Computer zeigt die obere Leiste nur noch Start, Vokabelquiz und Prüfungen plus zwei Menüs — Lernen (Grammatik, Lesen, Hörverstehen) und Werkzeuge (Wörterbuch, Alphabet, Notizen); Neuigkeiten, Gästebuch, Vorschläge, Über mich, Musik und Einstellungen sind ins ☰ oben rechts gezogen. Auf dem Handy gibt es unten den Tab Lernen mit diesen drei Seiten und deinem Fortschritt, und „Mehr“ ist jetzt ein Raster nach Gruppen, ganz ohne Scrollen. Die Uhr in der Ecke ist weg.' },
    { date: '2026-10-10',
      zh: '新增「聽解」頁：照 JLPT 聽解的四種題型（課題理解、重點理解、說話表達、即時應答），日文 N5 到 N1 都有：每級有練習回（N3 起多了概要理解，N2、N1 有三人對話和一段兩題的統合理解），也有照正式考試流程的模擬考（每題只播一次、自動倒數作答、考完才看答案）；男、女、旁白三種聲音，全部原創。答完可以看原文（附假名）和翻譯、一句一句重聽，還有生詞小複習和「再聽錯的題目」；想挑戰就打開考試模式（每題只能聽兩次）。另外：中文閱讀和文法改用更自然的台灣口音錄音（簡體閱讀是中國口音）；JLPT 單字重新分級，N1 不再混進 N5 的字。',
      'zh-Hans': '新增“听解”页：按 JLPT 听解的四种题型（课题理解、重点理解、说话表达、即时应答），日语 N5 到 N1 都有：每级有练习回（N3 起多了概要理解，N2、N1 有三人对话和一段两题的综合理解），也有按正式考试流程的模拟考（每题只播一次、自动倒计时作答、考完才看答案）；男、女、旁白三种声音，全部原创。答完可以看原文（附假名）和翻译、一句一句重听，还有生词小复习和“再听错的题目”；想挑战就打开考试模式（每题只能听两次）。另外：中文阅读和语法改用更自然的台湾口音录音（简体阅读是中国口音）；JLPT 单词重新分级，N1 不再混进 N5 的词。',
      en: 'New Listening page in the four JLPT listening formats (task-based, key points, what to say, quick response), for Japanese N5 to N1: practice sets for each level (summary questions from N3, three-speaker and two-question integrated items at N2 and N1) and a mock exam that runs like the real thing (one play per question, an answer countdown, answers at the end), voiced by a man, a woman and a narrator — all original. Afterwards read the transcript (with furigana) and translation, replay line by line, review the new words or retry the ones you missed — or turn on exam mode (two plays per question). Also: Chinese reading and grammar now use more natural recordings in a Taiwan accent (Mainland for Simplified reading), and the JLPT word lists were re-levelled so N1 no longer mixes in N5 words.',
      ja: '「聴解」ページを追加：JLPT 聴解の4つの形式（課題理解・ポイント理解・発話表現・即時応答）で、日本語 N5〜N1 まで：各レベルの練習問題（N3 からは概要理解、N2・N1 は3人の会話や1つの音声に2問の統合理解も）と、本番と同じ流れの模擬試験（音声は1回だけ、解答時間のカウントダウン、答えは最後に）。男性・女性・ナレーターの3つの声、すべてオリジナル。答えたあとはスクリプト（ふりがな付き）と訳を見て一文ずつ聞き直せて、語彙の復習や「まちがえた問題をもう一度」も。腕だめしには試験モード（1問2回まで）。ほかに、中国語の読解と文法の音声を自然な台湾なまりに（簡体字の読解は大陸の発音）、JLPT の単語レベルを見直して N1 に N5 の語がまざらなくなりました。',
      ko: '「듣기」 페이지 추가: JLPT 청해의 네 가지 형식(과제 이해·포인트 이해·발화 표현·즉시 응답)으로, 일본어 N5~N1: 레벨별 연습 문제(N3부터 개요 이해, N2·N1은 세 사람 대화와 한 음성에 두 문제인 통합 이해도)와 실제 시험처럼 진행되는 모의고사(음성은 한 번, 답하는 시간 카운트다운, 정답은 마지막에). 남자·여자·내레이션 세 목소리, 모두 창작. 답한 뒤 원문(후리가나)과 번역을 보고 한 문장씩 다시 듣고, 단어 복습과 \'틀린 문제 다시 듣기\'도 돼요. 도전하고 싶다면 시험 모드(한 문제 두 번까지). 그리고 중국어 읽기·문법 음성을 더 자연스러운 대만 억양으로(간체 읽기는 대륙 억양), JLPT 단어 레벨을 다시 나눠 N1에 N5 단어가 섞이지 않아요.',
      ru: 'Новая страница «Аудирование» в четырёх форматах JLPT (понимание задачи, главное, что сказать, быстрый ответ): для японского N5–N1: тренировочные варианты для каждого уровня (с N3 — общее понимание, на N2 и N1 — разговоры трёх человек и два вопроса к одной записи) и пробный экзамен как настоящий (одно прослушивание, отсчёт времени, ответы в конце), голоса мужчины, женщины и диктора — всё оригинальное. После ответа — текст (с фуриганой) и перевод, фразы можно переслушать, повторить новые слова или ошибки; для испытания — режим экзамена (два прослушивания). Ещё: китайское чтение и грамматика озвучены естественнее, с тайваньским произношением (упрощённое чтение — материковым), а списки слов JLPT перераспределены — в N1 больше нет слов N5.',
      fr: 'Nouvelle page Écoute aux quatre formats d’écoute du JLPT (compréhension de tâche, point clé, que dire, réponse rapide), du japonais N5 au N1 : des séries d’entraînement par niveau (compréhension globale dès le N3, conversations à trois et deux questions par enregistrement aux N2 et N1) et un examen blanc comme le vrai (une écoute, un compte à rebours, les réponses à la fin), avec un homme, une femme et un narrateur — tout est original. Ensuite, lis la transcription (avec furigana) et la traduction, réécoute phrase par phrase, révise les mots ou refais tes erreurs — ou active le mode examen (deux écoutes par question). Aussi : la lecture et la grammaire chinoises ont des enregistrements plus naturels avec l’accent de Taïwan (accent du continent pour la lecture en simplifié), et les listes JLPT ont été reclassées : le N1 ne contient plus de mots du N5.',
      es: 'Nueva página de Comprensión auditiva con los cuatro formatos del JLPT (comprensión de tarea, idea clave, qué decir, respuesta rápida), del japonés N5 al N1: prácticas por nivel (comprensión global desde N3; conversaciones a tres y dos preguntas por audio en N2 y N1) y un simulacro como el examen real (una escucha, cuenta atrás y respuestas al final), con voces de hombre, mujer y narrador; todo original. Después, lee la transcripción (con furigana) y la traducción, repite frase a frase, repasa las palabras o vuelve a las que fallaste; o activa el modo examen (dos escuchas por pregunta). Además: la lectura y la gramática en chino tienen grabaciones más naturales con acento de Taiwán (acento continental para la lectura en simplificado), y las listas del JLPT se han reclasificado: el N1 ya no mezcla palabras del N5.',
      de: 'Neue Seite „Hörverstehen“ in den vier JLPT-Formaten (Aufgabe verstehen, Kernpunkt, was sagt man, schnelle Antwort), für Japanisch N5 bis N1: Übungssets pro Stufe (ab N3 Globalverstehen, bei N2 und N1 Gespräche zu dritt und zwei Fragen zu einer Aufnahme) und eine Probeprüfung wie die echte (einmal hören, Countdown, Lösungen am Ende), gesprochen von einem Mann, einer Frau und einem Sprecher – alles eigene Inhalte. Danach Transkript (mit Furigana) und Übersetzung lesen, Satz für Satz wiederholen, die Wörter üben oder die falschen noch einmal hören – oder den Prüfungsmodus einschalten (zweimal hören pro Frage). Außerdem: Chinesisches Lesen und Grammatik haben natürlichere Aufnahmen mit taiwanischem Akzent (Festland-Akzent beim Lesen in Kurzzeichen), und die JLPT-Wortlisten wurden neu eingestuft – N1 enthält keine N5-Wörter mehr.' },
    { date: '2026-10-09',
      zh: '新增「閱讀」頁：日文 N5、韓文 TOPIK I、中文 HSK 1–2，以及英、法、俄、西、德文 A1，每種語言各 8 篇原創短文，而且每種語言都是不同的故事（夜市、颱風天、巴黎的麵包店、莫斯科地鐵、塞維亞的夏天……）。日文有假名標音、中文可切換繁簡和拼音／注音、俄文標有重音，每段都有翻譯；點句子聽錄音、點有底線的生詞看意思，還能全文朗讀、調整字體大小。讀完做 5 題選擇題和 3 題是非題（附原文依據），再做生詞小複習，答錯的字會進錯題本和間隔複習。會顯示閱讀時間和速度。',
      'zh-Hans': '新增“阅读”页：日语 N5、韩语 TOPIK I、中文 HSK 1–2，以及英、法、俄、西、德语 A1，每种语言各 8 篇原创短文，而且每种语言都是不同的故事（夜市、台风天、巴黎的面包店、莫斯科地铁、塞维利亚的夏天……）。日语有假名注音、中文可切换繁简和拼音／注音、俄语标有重音，每段都有翻译；点句子听录音、点有下划线的生词看意思，还能全文朗读、调整字体大小。读完做 5 道选择题和 3 道判断题（附原文依据），再做生词小复习，答错的词会进错题本和间隔复习。会显示阅读时间和速度。',
      en: 'New Reading page: 8 original short texts in each language — Japanese N5, Korean TOPIK I, Chinese HSK 1–2, and English, French, Russian, Spanish and German A1 — a different set of stories in each language (a night market, a typhoon day, a Paris bakery, the Moscow metro, summer in Seville…). Japanese comes with furigana, Chinese in Traditional or Simplified with pinyin and/or zhuyin, Russian with stress marks, and every paragraph has a translation. Tap a sentence to hear it, tap an underlined word for its meaning, or have the whole text read aloud, in the text size you like. Then answer 5 multiple-choice and 3 true/false questions, each showing the line it comes from, and review the new words — missed ones go to the mistake book and spaced review. Your reading time and speed are shown too.',
      ja: '「読解」ページを追加：日本語 N5、韓国語 TOPIK I、中国語 HSK 1–2、英語・フランス語・ロシア語・スペイン語・ドイツ語 A1 のオリジナル短文を各 8 本。言語ごとに違うお話です（夜市、台風の日、パリのパン屋、モスクワの地下鉄、セビリアの夏…）。日本語はふりがな、中国語は繁体字／簡体字とピンイン／注音の切り替え、ロシア語はアクセント記号つきで、段落ごとに訳もあります。文をタップすると音声、下線の語をタップすると意味が出て、全文読み上げや文字の大きさの調整もできます。読んだら選択問題 5 問と○×問題 3 問（根拠の文つき）、最後に語彙のミニ復習。まちがえた語はまちがいノートと間隔復習に入ります。読書時間と速さも表示されます。',
      ko: '「읽기」 페이지 추가: 일본어 N5, 한국어 TOPIK I, 중국어 HSK 1–2, 영어·프랑스어·러시아어·스페인어·독일어 A1 창작 단문이 언어마다 8편씩, 이야기도 언어마다 달라요(야시장, 태풍 오는 날, 파리의 빵집, 모스크바 지하철, 세비야의 여름…). 일본어는 후리가나, 중국어는 번체/간체와 병음/주음 전환, 러시아어는 강세 표시가 있고 문단마다 번역도 있어요. 문장을 누르면 녹음, 밑줄 단어를 누르면 뜻이 나오고, 전체 읽어 주기와 글자 크기 조절도 돼요. 다 읽으면 객관식 5문제와 O/X 3문제(근거 문장 표시), 마지막에 단어 미니 복습까지. 틀린 단어는 오답 노트와 간격 복습에 들어가요. 읽은 시간과 속도도 보여 줘요.',
      ru: 'Новая страница «Чтение»: по 8 оригинальных текстов на каждом языке — японский N5, корейский TOPIK I, китайский HSK 1–2, а также английский, французский, русский, испанский и немецкий A1 — в каждом языке свои истории (ночной рынок, день тайфуна, парижская булочная, московское метро, лето в Севилье…). В японском есть фуригана, китайский можно читать в полных или упрощённых иероглифах с пиньинем и/или чжуинем, в русском стоят ударения, у каждого абзаца есть перевод. Нажмите на предложение — оно прозвучит, на подчёркнутое слово — появится значение; можно прочитать весь текст вслух и поменять размер шрифта. Затем 5 вопросов с выбором ответа и 3 «верно/неверно» (со ссылкой на строку текста) и повторение новых слов — ошибки попадают в тетрадь ошибок и интервальное повторение. Показываются время и скорость чтения.',
      fr: 'Nouvelle page Lecture : 8 textes originaux par langue — japonais N5, coréen TOPIK I, chinois HSK 1–2, et anglais, français, russe, espagnol et allemand A1 — des histoires différentes dans chaque langue (un marché de nuit, un jour de typhon, une boulangerie parisienne, le métro de Moscou, l’été à Séville…). Le japonais a ses furigana, le chinois s’affiche en traditionnel ou simplifié avec pinyin et/ou zhuyin, le russe avec ses accents toniques, et chaque paragraphe a sa traduction. Touche une phrase pour l’entendre, un mot souligné pour son sens, ou fais lire tout le texte, dans la taille de texte que tu veux. Ensuite 5 questions à choix et 3 vrai/faux, chacune avec la phrase d’origine, puis une révision des mots — les erreurs vont dans le carnet d’erreurs et la révision espacée. Le temps et la vitesse de lecture s’affichent aussi.',
      es: 'Nueva página de Lectura: 8 textos originales en cada idioma — japonés N5, coreano TOPIK I, chino HSK 1–2, y inglés, francés, ruso, español y alemán A1 — historias distintas en cada idioma (un mercado nocturno, un día de tifón, una panadería de París, el metro de Moscú, el verano en Sevilla…). El japonés lleva furigana, el chino se puede leer en tradicional o simplificado con pinyin y/o zhuyin, el ruso lleva los acentos marcados, y cada párrafo tiene su traducción. Toca una frase para oírla, una palabra subrayada para ver su significado, o escucha el texto entero, con el tamaño de letra que prefieras. Después, 5 preguntas de opción múltiple y 3 de verdadero/falso, cada una con la frase de la que sale, y un repaso de las palabras nuevas: las falladas van al cuaderno de errores y al repaso espaciado. También verás tu tiempo y velocidad de lectura.',
      de: 'Neue Seite „Lesen“: 8 eigene Texte pro Sprache – Japanisch N5, Koreanisch TOPIK I, Chinesisch HSK 1–2 sowie Englisch, Französisch, Russisch, Spanisch und Deutsch A1 – in jeder Sprache andere Geschichten (ein Nachtmarkt, ein Taifuntag, eine Pariser Bäckerei, die Moskauer Metro, Sommer in Sevilla …). Japanisch mit Furigana, Chinesisch in Lang- oder Kurzzeichen mit Pinyin und/oder Zhuyin, Russisch mit Betonungszeichen, und jeder Absatz hat eine Übersetzung. Tippe auf einen Satz, um ihn zu hören, auf ein unterstrichenes Wort für die Bedeutung, oder lass den ganzen Text vorlesen – in der Schriftgröße, die dir gefällt. Danach 5 Multiple-Choice- und 3 Richtig/Falsch-Fragen mit dem passenden Satz aus dem Text, und eine Wortwiederholung – falsche Wörter landen im Fehlerheft und in der verteilten Wiederholung. Lesezeit und -tempo werden auch angezeigt.' },
    { date: '2026-10-09',
      zh: '新增西班牙文和德文：「單字」各有 10 個生活主題（打招呼、吃飯、居家生活……每個主題 40 個字），「檢定」有依 CEFR 從 A1 到 C1 分級的單字庫，西班牙文約一萬個字、德文約一萬四千個字，每個字都有中文和英文意思；西班牙文名詞附上 el / la，德文名詞附上 der / die / das 和複數，發音都是自然的錄音。',
      'zh-Hans': '新增西班牙语和德语：“单词”各有 10 个生活主题（打招呼、吃饭、居家生活……每个主题 40 个词），“检定”有按 CEFR 从 A1 到 C1 分级的单词库，西班牙语约一万个词、德语约一万四千个词，每个词都有中文和英文意思；西班牙语名词附上 el / la，德语名词附上 der / die / das 和复数，发音都是自然的录音。',
      en: 'Spanish and German are here: 10 everyday topics each on “Words” (greetings, food, home… 40 words each) and, under “Exams”, word lists graded by CEFR from A1 to C1 — about 10,000 Spanish and 14,000 German words, each with a Chinese and an English meaning; Spanish nouns come with el / la, German nouns with der / die / das and their plural, all with natural recordings.',
      ja: 'スペイン語とドイツ語を追加：「単語」にそれぞれ10の生活テーマ（あいさつ、食事、家の生活…各40語）、「検定」に CEFR の A1〜C1 のレベル別単語リスト（スペイン語約1万語、ドイツ語約1万4千語）。どの単語にも中国語と英語の意味があり、スペイン語の名詞には el / la、ドイツ語の名詞には der / die / das と複数形が付き、発音はすべて自然な録音です。',
      ko: '스페인어와 독일어 추가: 「단어」에 각각 생활 주제 10개(인사, 식사, 집안 생활… 주제마다 40개), 「검정」에 CEFR A1~C1 수준별 단어장(스페인어 약 1만 개, 독일어 약 1만 4천 개). 모든 단어에 중국어·영어 뜻이 있고, 스페인어 명사에는 el / la, 독일어 명사에는 der / die / das와 복수형이 붙어 있으며 발음은 모두 자연스러운 녹음이에요.',
      ru: 'Добавлены испанский и немецкий: по 10 бытовых тем в «Словах» (приветствия, еда, дом… по 40 слов) и в «Экзаменах» списки по уровням CEFR от A1 до C1 — около 10 000 испанских и 14 000 немецких слов, у каждого значение на китайском и английском; у испанских существительных el / la, у немецких der / die / das и множественное число, всё с естественной озвучкой.',
      fr: 'L\'espagnol et l\'allemand arrivent : 10 thèmes du quotidien chacun dans « Mots » (salutations, repas, maison… 40 mots chacun) et, dans « Examens », des listes classées selon le CECR de A1 à C1 — environ 10 000 mots espagnols et 14 000 allemands, chacun avec un sens en chinois et en anglais ; les noms espagnols avec el / la, les noms allemands avec der / die / das et leur pluriel, le tout avec des enregistrements naturels.',
      es: 'Llegan el español y el alemán: 10 temas cotidianos de cada uno en «Palabras» (saludos, comida, casa… 40 palabras cada uno) y, en «Exámenes», listas por niveles del MCER de A1 a C1 — unas 10 000 palabras en español y 14 000 en alemán, cada una con su significado en chino y en inglés; los sustantivos españoles con el / la, los alemanes con der / die / das y su plural, todo con grabaciones naturales.',
      de: 'Spanisch und Deutsch sind da: je 10 Alltagsthemen unter „Vokabeln“ (Begrüßung, Essen, Zuhause … je 40 Wörter) und unter „Prüfungen“ Wortlisten nach GER-Stufen A1 bis C1 – rund 10.000 spanische und 14.000 deutsche Wörter, jedes mit chinesischer und englischer Bedeutung; spanische Nomen mit el / la, deutsche mit der / die / das und Plural, alles mit natürlichen Aufnahmen.' },
    { date: '2026-10-08',
      zh: '新增「文法」頁：日文 N5（62 個）、N4（59 個）、N3（60 個），韓文 TOPIK I（47 個）、TOPIK II（60 個），法文 A1（26 個）、A2（30 個），俄文 A1（24 個）、A2（30 個）和中文 HSK 1–2（30 個）、HSK 3（30 個）文法，每個都有說明、注意事項、常見錯誤、有發音的例句和 3 題小練習，答對 2 題就算學會。中文可切換拼音或注音。電腦上說明和例句會左右並排。法文單字現在也有自然的錄音了。',
      'zh-Hans': '新增“语法”页：日语 N5（62 个）、N4（59 个）、N3（60 个），韩语 TOPIK I（47 个）、TOPIK II（60 个），法语 A1（26 个）、A2（30 个），俄语 A1（24 个）、A2（30 个）和中文 HSK 1–2（30 个）、HSK 3（30 个）语法，每个都有说明、注意事项、常见错误、带发音的例句和 3 道小练习，答对 2 道就算学会。中文可切换拼音或注音。电脑上说明和例句会左右并排。法语单词现在也有自然的录音了。',
      en: 'New Grammar page: Japanese N5 (62 points), N4 (59) and N3 (60), Korean TOPIK I (47) and TOPIK II (60), French A1 (26) and A2 (30), Russian A1 (24) and A2 (30) and Chinese HSK 1–2 (30) and HSK 3 (30, with pinyin or zhuyin), each with an explanation, things to watch, common mistakes, spoken examples and a 3-question practice — get 2 right and it\'s learned. On computers the explanation and examples sit side by side. French words now have natural recordings too.',
      ja: '「文法」ページを追加：日本語 N5（62）・N4（59）・N3（60）、韓国語 TOPIK I（47）・TOPIK II（60）、フランス語 A1（26）・A2（30）、ロシア語 A1（24）・A2（30）、中国語 HSK 1–2（30）・HSK 3（30、ピンインか注音つき）の文法。説明・注意点・よくある間違い・音声つき例文・3問のミニ練習つきで、2問正解で「覚えた」になります。パソコンでは説明と例文が左右に並びます。フランス語の単語にも自然な録音がつきました。',
      ko: '「문법」 페이지 추가: 일본어 N5(62개)·N4(59개)·N3(60개), 한국어 TOPIK I(47개)·TOPIK II(60개), 프랑스어 A1(26개)·A2(30개), 러시아어 A1(24개)·A2(30개), 중국어 HSK 1–2(30개)·HSK 3(30개, 병음 또는 주음 표시) 문법. 설명, 주의할 점, 자주 하는 실수, 음성 예문, 3문제 연습이 있고 2문제를 맞히면 익힌 거예요. 컴퓨터에서는 설명과 예문이 나란히 보여요. 프랑스어 단어에도 자연스러운 녹음이 생겼어요.',
      ru: 'Новая страница «Грамматика»: японский N5 (62 темы), N4 (59) и N3 (60), корейский TOPIK I (47) и TOPIK II (60), французский A1 (26) и A2 (30), русский A1 (24) и A2 (30) и китайский HSK 1–2 (30) и HSK 3 (30, с пиньинем или чжуинем) — объяснение, подсказки, частые ошибки, озвученные примеры и практика из 3 вопросов (2 верных — тема выучена). На компьютере объяснение и примеры стоят рядом. Французские слова теперь тоже с естественной озвучкой.',
      fr: 'Nouvelle page Grammaire : japonais N5 (62 points), N4 (59) et N3 (60), coréen TOPIK I (47) et TOPIK II (60), français A1 (26) et A2 (30), russe A1 (24) et A2 (30) et chinois HSK 1–2 (30) et HSK 3 (30, avec pinyin ou zhuyin), chacun avec explication, points d\'attention, erreurs fréquentes, exemples audio et un exercice de 3 questions — 2 bonnes réponses et c\'est acquis. Sur ordinateur, l\'explication et les exemples sont côte à côte. Les mots français ont maintenant aussi des enregistrements naturels.',
      es: 'Nueva página de Gramática: japonés N5 (62 puntos), N4 (59) y N3 (60), coreano TOPIK I (47) y TOPIK II (60), francés A1 (26) y A2 (30), ruso A1 (24) y A2 (30) y chino HSK 1–2 (30) y HSK 3 (30, con pinyin o zhuyin), cada uno con explicación, puntos clave, errores frecuentes, ejemplos con audio y una práctica de 3 preguntas (acierta 2 y queda aprendido). En el ordenador, la explicación y los ejemplos aparecen lado a lado. Las palabras en francés ya tienen grabaciones naturales.',
      de: 'Neue Grammatik-Seite: Japanisch N5 (62 Punkte), N4 (59) und N3 (60), Koreanisch TOPIK I (47) und TOPIK II (60), Französisch A1 (26) und A2 (30), Russisch A1 (24) und A2 (30) und Chinesisch HSK 1–2 (30) und HSK 3 (30, mit Pinyin oder Zhuyin), jeweils mit Erklärung, Hinweisen, häufigen Fehlern, vertonten Beispielen und einer Übung mit 3 Fragen – 2 richtig, und er sitzt. Am Computer stehen Erklärung und Beispiele nebeneinander. Französische Wörter haben jetzt auch natürliche Aufnahmen.' },
    { date: '2026-10-08',
      zh: '「單字」的法文和俄文也有 10 個生活主題了（打招呼、吃飯、居家生活……每個主題 40 個字）。法文、俄文的單字和法、俄、德、西班牙文的字母表，發音都換成更自然的錄音了（西班牙文和俄文的彈舌音也聽得更清楚）；韓文子音會先念名稱再念發音（기역…가）。留言板改成登入後才能留言，每個帳號一則，並會自動審核內容。小花火在測驗時會幫你加油，台詞也變多了。另外修正：單字頁有時變成空白、法文／俄文等級選單沒有翻譯、隱私權政策有看不到的字，以及多種語言下文字或國旗超出按鈕的排版問題。',
      'zh-Hans': '“单词”的法语和俄语也有 10 个生活主题了（打招呼、吃饭、居家生活……每个主题 40 个词）。法语、俄语的单词以及法、俄、德、西班牙语的字母表，发音都换成更自然的录音了（西班牙语和俄语的颤音也听得更清楚）；韩语辅音会先读名称再读发音（기역…가）。留言板改为登录后才能留言，每个账号一条，并会自动审核内容。小花火在测验时会给你加油，台词也变多了。另外修复：单词页有时变成空白、法语／俄语等级菜单没有翻译、隐私政策有看不到的字，以及多种语言下文字或国旗超出按钮的排版问题。',
      en: 'French and Russian on “Words” now have the 10 everyday topics too (greetings, food, home… 40 words each). French and Russian words and the French, Russian, German and Spanish alphabets now play natural recordings (the rolled r of Spanish and Russian comes through clearly); Korean consonants say their name and then their sound (기역… 가). The guestbook now needs a sign-in: one message per account, checked automatically. 小花火 cheers you on during quizzes and has many more lines. Also fixed: the Words page sometimes going blank, the untranslated French / Russian level menu, invisible text in the privacy policy, and text or flags sticking out of buttons in several languages.',
      ja: '「単語」のフランス語とロシア語にも10の生活テーマができました（あいさつ、食事、家の生活…各40語）。フランス語・ロシア語の単語と、フランス語・ロシア語・ドイツ語・スペイン語のアルファベット表の発音を、より自然な録音にしました（スペイン語とロシア語の巻き舌もはっきり聞こえます）。韓国語の子音は名前のあとに音を読みます（기역…가）。掲示板はログインして書く形になり、1アカウント1件まで・内容は自動で審査されます。小花火がクイズ中に応援してくれるようになり、セリフも増えました。ほかに、単語ページが空白になることがある問題、フランス語／ロシア語のレベル選択が翻訳されていない問題、プライバシーポリシーに見えない文字がある問題、いくつかの言語で文字や国旗がボタンからはみ出る問題を直しました。',
      ko: '「단어」의 프랑스어와 러시아어에도 생활 주제 10개가 생겼어요(인사, 식사, 집안 생활… 주제마다 40개). 프랑스어·러시아어 단어와 프랑스어·러시아어·독일어·스페인어 알파벳 표의 발음이 더 자연스러운 녹음으로 바뀌었어요(스페인어와 러시아어의 굴리는 r 소리도 또렷해요). 한국어 자음은 이름을 읽은 뒤 소리를 읽어요(기역…가). 방명록은 로그인해야 쓸 수 있고, 계정당 1개이며 내용은 자동으로 검토돼요. 小花火가 퀴즈 중에 응원해 주고 대사도 많아졌어요. 그 밖에 단어 페이지가 가끔 비어 보이던 문제, 프랑스어/러시아어 수준 메뉴가 번역되지 않던 문제, 개인정보 처리방침에 보이지 않는 글자가 있던 문제, 여러 언어에서 글자나 국기가 버튼 밖으로 나오던 문제를 고쳤어요.',
      ru: 'Во французском и русском в «Словах» теперь тоже есть 10 бытовых тем (приветствия, еда, дом… по 40 слов). Французские и русские слова, а также французский, русский, немецкий и испанский алфавиты теперь звучат естественными записями (раскатистое «р» в испанском и русском слышно чётко); корейские согласные называются, а потом звучат (기역… 가). Гостевая книга теперь требует входа: одно сообщение на аккаунт, с автоматической проверкой. 小花火 подбадривает во время тестов, и реплик у неё стало намного больше. Исправлено: страница «Слова» иногда становилась пустой, меню уровней французского и русского не переводилось, в политике конфиденциальности был невидимый текст, а в некоторых языках текст или флаги вылезали за кнопки.',
      fr: 'Le français et le russe ont maintenant eux aussi les 10 thèmes du quotidien dans « Mots » (salutations, repas, maison… 40 mots chacun). Les mots français et russes ainsi que les alphabets français, russe, allemand et espagnol utilisent maintenant des enregistrements naturels (le r roulé de l\'espagnol et du russe s\'entend bien) ; les consonnes coréennes disent leur nom puis leur son (기역… 가). Le livre d\'or demande désormais une connexion : un message par compte, vérifié automatiquement. 小花火 t\'encourage pendant les quiz et a beaucoup plus de répliques. Corrigé aussi : la page « Mots » parfois vide, le menu des niveaux de français et de russe non traduit, du texte invisible dans la politique de confidentialité, et du texte ou des drapeaux qui dépassaient des boutons dans plusieurs langues.',
      es: 'El francés y el ruso de «Palabras» ya tienen también los 10 temas cotidianos (saludos, comida, casa… 40 palabras cada uno). Las palabras en francés y ruso y los alfabetos francés, ruso, alemán y español ahora suenan con grabaciones naturales (la erre vibrante del español y del ruso se oye con claridad); las consonantes coreanas dicen su nombre y luego su sonido (기역… 가). El libro de visitas ahora requiere iniciar sesión: un mensaje por cuenta, revisado automáticamente. 小花火 te anima durante los quiz y tiene muchas más frases. También se corrigió: la página «Palabras» que a veces quedaba en blanco, el menú de niveles de francés y ruso sin traducir, texto invisible en la política de privacidad, y texto o banderas que se salían de los botones en varios idiomas.',
      de: 'Französisch und Russisch haben unter „Vokabeln“ jetzt auch die 10 Alltagsthemen (Begrüßung, Essen, Zuhause … je 40 Wörter). Französische und russische Wörter sowie das französische, russische, deutsche und spanische Alphabet klingen jetzt nach natürlichen Aufnahmen (das gerollte R im Spanischen und Russischen ist deutlich zu hören); koreanische Konsonanten sagen erst ihren Namen, dann ihren Laut (기역… 가). Ins Gästebuch schreibt man jetzt mit Anmeldung: eine Nachricht pro Konto, automatisch geprüft. 小花火 feuert dich bei Quizzen an und hat viel mehr Sätze. Außerdem behoben: die manchmal leere Vokabelseite, das unübersetzte Stufenmenü für Französisch und Russisch, unsichtbarer Text in der Datenschutzerklärung sowie Text oder Flaggen, die in mehreren Sprachen aus Buttons ragten.' },
    { date: '2026-10-04',
      zh: '新增法文和俄文的分級單字庫：依歐洲共同語言參考標準（CEFR）從 A1 到 C1，法文約一萬個字、俄文約八千個字，每個字都有中文和英文意思；法文名詞附上 le / la，俄文附上重音。在「檢定」裡（「單字」的法文、俄文按鈕也會帶你過去）。',
      'zh-Hans': '新增法语和俄语的分级单词库：按欧洲共同语言参考标准（CEFR）从 A1 到 C1，法语约一万个词、俄语约八千个词，每个词都有中文和英文意思；法语名词附上 le / la，俄语附上重音。在“检定”里（“单词”的法语、俄语按钮也会带你过去）。',
      en: 'New French and Russian word lists graded by CEFR, A1 to C1: about 10,000 French and 8,000 Russian words, each with a Chinese and an English meaning; French nouns come with le / la and Russian words with their stress. Find them under “Exams” (the French and Russian buttons on “Words” take you there too).',
      ja: 'フランス語とロシア語のレベル別単語リストを追加：CEFR の A1〜C1 で、フランス語は約1万語、ロシア語は約8千語。どの単語にも中国語と英語の意味があり、フランス語の名詞には le / la、ロシア語にはアクセントが付いています。「検定」にあります（「単語」のフランス語・ロシア語ボタンからも行けます）。',
      ko: '프랑스어와 러시아어 수준별 단어장 추가: CEFR A1~C1로 프랑스어 약 1만 개, 러시아어 약 8천 개이고, 모든 단어에 중국어·영어 뜻이 있어요. 프랑스어 명사에는 le / la, 러시아어에는 강세가 붙어 있어요. 「검정」에 있어요(「단어」의 프랑스어·러시아어 버튼으로도 갈 수 있어요).',
      ru: 'Новые списки слов по французскому и русскому по уровням CEFR от A1 до C1: около 10 000 французских и 8 000 русских слов, у каждого значение на китайском и английском; у французских существительных есть le / la, у русских слов — ударение. Ищи их в «Экзаменах» (кнопки французского и русского в «Словах» тоже ведут туда).',
      fr: 'Nouvelles listes de mots en français et en russe classées selon le CECR, de A1 à C1 : environ 10 000 mots français et 8 000 mots russes, chacun avec un sens en chinois et en anglais ; les noms français ont leur le / la et les mots russes leur accent. Elles sont dans « Examens » (les boutons français et russe de « Mots » y mènent aussi).',
      es: 'Nuevas listas de palabras en francés y ruso por niveles del MCER, de A1 a C1: unas 10 000 palabras francesas y 8 000 rusas, cada una con su significado en chino y en inglés; los sustantivos franceses llevan le / la y las palabras rusas su acento. Están en «Exámenes» (los botones de francés y ruso de «Palabras» también llevan allí).',
      de: 'Neue Wortlisten für Französisch und Russisch nach GER-Stufen A1 bis C1: rund 10.000 französische und 8.000 russische Wörter, jedes mit chinesischer und englischer Bedeutung; französische Nomen mit le / la, russische Wörter mit Betonung. Zu finden unter „Prüfungen“ (die Buttons für Französisch und Russisch unter „Vokabeln“ führen auch dorthin).' },
    { date: '2026-10-04',
      zh: '電腦寬螢幕的兩側不再空空的了：左邊的小花火可以戳戳看（摸頭、戳臉、戳身體的反應都不一樣，戳太多次她會生氣喔），右邊是每天換一個的「每日一字」，首頁還多了最近兩週的練習日曆和今日任務。',
      'zh-Hans': '电脑宽屏幕的两侧不再空空的了：左边的小花火可以戳戳看（摸头、戳脸、戳身体的反应都不一样，戳太多次她会生气哦），右边是每天换一个的“每日一词”，首页还多了最近两周的练习日历和今日任务。',
      en: 'The empty sides of wide desktop screens now have something in them: poke 小花火 on the left (head, face and body each get a different reaction — poke too much and she gets cross), and on the right a new word of the day, plus a two-week practice calendar and today\'s tasks on the home page.',
      ja: 'パソコンの広い画面の両側がにぎやかになりました：左の小花火はつついてみて（頭・顔・体で反応が違って、つつきすぎると怒ります）。右には毎日変わる「今日の単語」、ホームにはこの2週間の練習カレンダーと今日のミッションも。',
      ko: '컴퓨터 넓은 화면의 양옆이 더 이상 비어 있지 않아요: 왼쪽 小花火를 콕 찔러 보세요(머리·얼굴·몸마다 반응이 다르고, 너무 많이 찌르면 화내요). 오른쪽에는 매일 바뀌는 「오늘의 단어」, 홈에는 최근 2주 연습 달력과 오늘의 미션도 생겼어요.',
      ru: 'Пустые края широкого экрана компьютера ожили: слева можно ткнуть 小花火 (голова, лицо и тело — разная реакция, а если тыкать слишком часто, она сердится), справа — новое слово дня, а на главной ещё календарь практики за две недели и задания на сегодня.',
      fr: 'Les côtés vides des grands écrans d\'ordinateur ont maintenant du contenu : à gauche, taquine 小花火 (la tête, le visage et le corps donnent des réactions différentes — trop, et elle se fâche), à droite un mot du jour, et sur l\'accueil un calendrier de pratique sur deux semaines et les missions du jour.',
      es: 'Los lados vacíos de las pantallas anchas del ordenador ya tienen algo: a la izquierda puedes tocar a 小花火 (cabeza, cara y cuerpo reaccionan distinto; si la tocas demasiado se enfada) y a la derecha hay una palabra del día, además de un calendario de práctica de dos semanas y las misiones de hoy en el inicio.',
      de: 'Die leeren Seiten breiter Computerbildschirme sind jetzt gefüllt: Links kannst du 小花火 anstupsen (Kopf, Gesicht und Körper reagieren unterschiedlich — zu oft, und sie wird sauer), rechts gibt es ein Wort des Tages, und auf der Startseite einen Übungskalender für zwei Wochen und die heutigen Aufgaben.' },
    { date: '2026-10-04',
      zh: '「單字」改成依主題學：日文、韓文、英文、中文各有 10 個生活主題（打招呼、吃飯、交通、旅行…），每個主題 40 個字、4 關，日文、韓文和中文都有真人般的錄音。依等級的單字庫都在「檢定」（英文的國中、高中也移到那裡）。另外，手機上的字母表不會再念出「capital」，更新內容也可以翻頁了。',
      'zh-Hans': '“单词”改成按主题学：日语、韩语、英语、中文各有 10 个生活主题（打招呼、吃饭、交通、旅行…），每个主题 40 个词、4 关，日语、韩语和中文都有自然的录音。按等级的单词库都在“检定”（英语的初中、高中也移到了那里）。另外，手机上的字母表不会再念出“capital”，更新内容也可以翻页了。',
      en: '“Words” is now organised by topic: Japanese, Korean, English and Chinese each have 10 everyday topics (greetings, food, getting around, travel…), 40 words and 4 levels each, with natural recordings for Japanese, Korean and Chinese. The graded lists are all under “Exams” (English junior/senior high moved there too). Also: the alphabet chart no longer says “capital” on phones, and “What\'s new” now has pages.',
      ja: '「単語」がテーマ別になりました：日本語・韓国語・英語・中国語にそれぞれ 10 の生活テーマ（あいさつ・食事・交通・旅行…）、各 40 語・4 ステージ。日本語・韓国語・中国語は自然な音声付きです。レベル別の単語リストは「検定」にまとめました（英語の中学・高校もこちらへ）。ほかに、スマホの文字表で「capital」と読まれなくなり、更新内容はページ送りできるようになりました。',
      ko: '「단어」가 주제별로 바뀌었어요: 일본어·한국어·영어·중국어에 각각 10개의 생활 주제(인사, 식사, 교통, 여행…)가 있고, 주제마다 40개·4단계예요. 일본어·한국어·중국어는 자연스러운 녹음도 있어요. 수준별 단어장은 모두 「검정」에 있어요(영어 중학교·고등학교도 그쪽으로 옮겼어요). 그리고 휴대폰의 문자표가 더 이상 「capital」이라고 읽지 않고, 업데이트 내용도 페이지를 넘길 수 있어요.',
      ru: '«Слова» теперь по темам: в японском, корейском, английском и китайском по 10 бытовых тем (приветствия, еда, транспорт, путешествия…), в каждой 40 слов и 4 уровня, для японского, корейского и китайского — естественная озвучка. Списки по уровням — в «Экзаменах» (туда же переехал школьный английский). А ещё алфавит на телефонах больше не произносит «capital», а в «Что нового» появились страницы.',
      fr: '« Mots » est maintenant classé par thème : le japonais, le coréen, l\'anglais et le chinois ont chacun 10 thèmes du quotidien (salutations, repas, transports, voyage…), 40 mots et 4 niveaux par thème, avec des enregistrements naturels pour le japonais, le coréen et le chinois. Les listes par niveau sont dans « Examens » (l\'anglais collège/lycée y a aussi été déplacé). Et l\'alphabet ne dit plus « capital » sur téléphone, et « Nouveautés » a maintenant des pages.',
      es: '«Palabras» ahora va por temas: japonés, coreano, inglés y chino tienen 10 temas cotidianos cada uno (saludos, comida, transporte, viajes…), con 40 palabras y 4 niveles por tema y grabaciones naturales en japonés, coreano y chino. Las listas por nivel están en «Exámenes» (el inglés de secundaria y bachillerato también se movió allí). Además, el alfabeto ya no dice «capital» en el móvil y «Novedades» ahora tiene páginas.',
      de: '„Vokabeln“ ist jetzt nach Themen sortiert: Japanisch, Koreanisch, Englisch und Chinesisch haben je 10 Alltagsthemen (Begrüßungen, Essen, Unterwegs, Reisen…) mit 40 Wörtern in 4 Stufen, für Japanisch, Koreanisch und Chinesisch mit natürlichen Aufnahmen. Die Listen nach Niveau stehen unter „Prüfungen“ (auch Englisch für Mittel- und Oberstufe ist dorthin umgezogen). Außerdem sagt die Buchstabentafel auf dem Handy nicht mehr „capital“, und „Neuigkeiten“ hat jetzt Seiten.' },
    { date: '2026-10-04',
      zh: '小花火換上新造型了！現在是穿著櫻花和服的女孩，會眨眼、呼吸，回答問題時還會開口說話。',
      'zh-Hans': '小花火换上新造型了！现在是穿着樱花和服的女孩，会眨眼、呼吸，回答问题时还会开口说话。',
      en: '小花火 has a new look: a girl in a cherry-blossom kimono who blinks, breathes and talks when she answers your questions.',
      ja: '小花火が新しい姿に！桜の着物の女の子になって、まばたきや呼吸をして、質問に答えるときは口も動きます。',
      ko: '小花火가 새 모습이 됐어요! 벚꽃 기모노를 입은 소녀로, 눈을 깜빡이고 숨을 쉬며 질문에 답할 때 입도 움직여요.',
      ru: 'У 小花火 новый облик: девочка в кимоно с сакурой, которая моргает, дышит и говорит, когда отвечает на вопросы.',
      fr: '小花火 change de look : une fille en kimono à fleurs de cerisier qui cligne des yeux, respire et parle quand elle répond à tes questions.',
      es: '小花火 estrena aspecto: una chica con kimono de flores de cerezo que parpadea, respira y habla cuando responde a tus preguntas.',
      de: '小花火 hat einen neuen Look: ein Mädchen im Kirschblüten-Kimono, das blinzelt, atmet und spricht, wenn es deine Fragen beantwortet.' },
    { date: '2026-10-04',
      zh: '新增帳號登入（Google 或 Email）：登入後錯題本、複習卡片、連續天數和學習進度會自動同步，換手機或電腦都能接著練。不登入也可以照常使用。',
      'zh-Hans': '新增账号登录（Google 或邮箱）：登录后错题本、复习卡片、连续天数和学习进度会自动同步，换手机或电脑都能接着练。不登录也可以照常使用。',
      en: 'Accounts are here (Google or email): sign in and your mistake book, review cards, streak and progress sync automatically, so you can carry on from any phone or computer. Everything still works without an account.',
      ja: 'アカウントでログインできるようになりました（Google またはメール）。間違いノート・復習カード・連続日数・進み具合が自動で同期され、スマホでもパソコンでも続きから練習できます。ログインしなくても今まで通り使えます。',
      ko: '계정 로그인 추가 (Google 또는 이메일): 오답 노트, 복습 카드, 연속 일수, 진도가 자동으로 동기화되어 휴대폰이나 컴퓨터 어디서든 이어서 연습할 수 있어요. 로그인하지 않아도 그대로 쓸 수 있어요.',
      ru: 'Появились аккаунты (Google или почта): тетрадь ошибок, карточки, серия и прогресс синхронизируются сами — продолжай на любом устройстве. Без аккаунта всё работает как раньше.',
      fr: 'Les comptes arrivent (Google ou e-mail) : ton carnet d\'erreurs, tes cartes, ta série et ta progression se synchronisent tout seuls, pour continuer sur n\'importe quel appareil. Tout marche aussi sans compte.',
      es: 'Llegan las cuentas (Google o correo): tu cuaderno de errores, tarjetas, racha y progreso se sincronizan solos para seguir en cualquier móvil u ordenador. Todo funciona igual sin cuenta.',
      de: 'Neu: Konten (Google oder E-Mail). Fehlerheft, Wiederholungskarten, Serie und Fortschritt synchronisieren sich automatisch – mach auf jedem Handy oder Computer weiter. Ohne Konto funktioniert alles wie bisher.' },
    { date: '2026-10-03',
      zh: '新增「下載 App」：頁首（手機在「更多」裡）可以把網站裝成 App，iPhone 也有一步步的教學；舊網址 hanabirn.netlify.app 會自動轉到 hanabirn.xyz。',
      'zh-Hans': '新增“下载 App”：页首（手机在“更多”里）可以把网站装成 App，iPhone 也有一步步的教学；旧网址 hanabirn.netlify.app 会自动转到 hanabirn.xyz。',
      en: 'New “Get the app” button (in the header, or under More on phones) installs the site as an app, with step-by-step help for iPhone. The old address hanabirn.netlify.app now redirects to hanabirn.xyz.',
      ja: '「アプリを入れる」を追加：ヘッダー（スマホは「その他」）からサイトをアプリとして入れられます。iPhone 向けの手順もあります。旧アドレス hanabirn.netlify.app は hanabirn.xyz に自動で移動します。',
      ko: '"앱 설치" 추가: 상단(휴대폰은 "더보기")에서 사이트를 앱으로 설치할 수 있고, iPhone용 단계별 안내도 있어요. 예전 주소 hanabirn.netlify.app은 hanabirn.xyz로 자동 이동해요.',
      ru: 'Новая кнопка «Установить» (в шапке, на телефоне — в «Ещё») ставит сайт как приложение, для iPhone есть пошаговая инструкция. Старый адрес hanabirn.netlify.app теперь ведёт на hanabirn.xyz.',
      fr: 'Nouveau bouton « Installer l\'app » (dans l\'en-tête, ou « Plus » sur téléphone) pour installer le site comme une app, avec un pas-à-pas pour iPhone. L\'ancienne adresse hanabirn.netlify.app redirige vers hanabirn.xyz.',
      es: 'Nuevo botón «Instalar la app» (en la cabecera, o en «Más» en el móvil) para instalar el sitio como app, con pasos para iPhone. La dirección antigua hanabirn.netlify.app ahora lleva a hanabirn.xyz.',
      de: 'Neuer Button „App installieren“ (oben, auf dem Handy unter „Mehr“) installiert die Seite als App, mit Schritt-für-Schritt-Hilfe fürs iPhone. Die alte Adresse hanabirn.netlify.app leitet jetzt auf hanabirn.xyz weiter.' },
    { date: '2026-10-03',
      zh: '練習工具改版：練習中心會告訴你現在該做什麼；錯題本變成筆記本，連續答對 2 次就能把字趕出去；新的統計（學會了多少、練習日曆）、間隔複習預報、可以左右滑的單字閃卡、聽力加入點選模式和慢速播放，做完還有慶祝畫面。',
      'zh-Hans': '练习工具改版：练习中心会告诉你现在该做什么；错题本变成笔记本，连续答对 2 次就能把词赶出去；新的统计（学会了多少、练习日历）、间隔复习预报、可以左右滑的单词闪卡、听力加入点选模式和慢速播放，做完还有庆祝画面。',
      en: 'Practice tools redesigned: the practice hub shows what to do next; the mistake book is a notebook where two right answers in a row clear a word; new stats (how much you\'ve learned, a practice calendar), a review forecast, swipeable flashcards, a tap-to-answer listening mode with slow playback, and a celebration when you finish.',
      ja: '練習ツールをリニューアル：練習センターが次にやることを教えてくれます。間違いノートは2回連続正解で卒業。新しい統計（どれだけ覚えたか・練習カレンダー）、復習の予報、スワイプできる単語カード、リスニングに「選ぶ」モードとゆっくり再生、終わったらお祝い画面も。',
      ko: '연습 도구 개편: 연습 센터가 지금 할 일을 알려 줘요. 오답 노트는 두 번 연속 맞히면 빠지는 노트로, 새 통계(얼마나 익혔는지, 연습 달력), 복습 예보, 밀어서 넘기는 단어 카드, 듣기에 고르기 모드와 느린 재생, 끝나면 축하 화면도 있어요.',
      ru: 'Обновлены инструменты практики: центр практики подсказывает, что делать дальше; тетрадь ошибок — слово уходит после двух верных ответов подряд; новая статистика (сколько выучено, календарь), прогноз повторений, карточки со смахиванием, аудирование с выбором ответа и медленным воспроизведением и праздничный экран в конце.',
      fr: 'Outils d\'entraînement repensés : le centre te dit quoi faire ensuite ; le carnet d\'erreurs efface un mot après deux bonnes réponses d\'affilée ; nouvelles statistiques (ce que tu as appris, calendrier), prévisions de révision, cartes à faire glisser, écoute avec choix de réponse et lecture lente, et une petite fête à la fin.',
      es: 'Herramientas de práctica renovadas: el centro de práctica te dice qué hacer; el cuaderno de errores borra una palabra tras dos aciertos seguidos; nuevas estadísticas (cuánto has aprendido, calendario), previsión de repasos, tarjetas que se deslizan, escucha con opciones y reproducción lenta, y una celebración al terminar.',
      de: 'Übungswerkzeuge neu gestaltet: Die Übungszentrale zeigt, was als Nächstes dran ist; im Fehlerheft verschwindet ein Wort nach zwei richtigen Antworten in Folge; neue Statistiken (wie viel du gelernt hast, Übungskalender), Wiederholungsvorschau, wischbare Karteikarten, Hörquiz mit Antippen und langsamer Wiedergabe – und eine kleine Feier am Ende.' },
    { date: '2026-10-03',
      zh: '教學手冊換成新手導覽：第一次來的時候，小花火會一步步帶你認識網站的每個功能（想再看一次可以到設定裡找）。',
      'zh-Hans': '教学手册换成新手导览：第一次来的时候，小花火会一步步带你认识网站的每个功能（想再看一次可以到设置里找）。',
      en: 'The guide page is now a site tour: on your first visit, 小花火 walks you through every feature step by step (replay it from the settings).',
      ja: '使い方ページはサイトツアーに：初めて来たとき、小花火がひとつずつ機能を案内します（設定からもう一度見られます）。',
      ko: '사용 안내 페이지가 사이트 둘러보기로 바뀌었어요: 처음 오면 小花火가 기능을 하나씩 안내해 줘요 (설정에서 다시 볼 수 있어요).',
      ru: 'Вместо страницы-руководства — обзор сайта: при первом визите 小花火 шаг за шагом показывает все функции (повторить можно в настройках).',
      fr: 'La page de guide devient une visite du site : à ta première visite, 小花火 te présente chaque fonction pas à pas (à revoir depuis les réglages).',
      es: 'La guía ahora es un recorrido del sitio: en tu primera visita, 小花火 te enseña cada función paso a paso (puedes repetirlo desde los ajustes).',
      de: 'Die Anleitungsseite ist jetzt eine Seitentour: Beim ersten Besuch zeigt dir 小花火 Schritt für Schritt alle Funktionen (wiederholbar in den Einstellungen).' },
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

// a few entries per page with 上一頁 / 下一頁, so the list never needs a long scroll
const UPDATES_PER_PAGE = 4;
let updatesPage = 0;

function updatesPageCount() {
    return Math.max(1, Math.ceil(SITE_UPDATES.length / UPDATES_PER_PAGE));
}

function renderUpdates() {
    const list = document.getElementById('updates-list');
    if (!list) return;
    const pages = updatesPageCount();
    updatesPage = Math.min(Math.max(updatesPage, 0), pages - 1);
    const from = updatesPage * UPDATES_PER_PAGE;
    list.start = from + 1;
    list.innerHTML = SITE_UPDATES.slice(from, from + UPDATES_PER_PAGE).map(u => `<li class="updates-item">
        <time class="updates-date" datetime="${u.date}">${escHtml(updatesDate(u.date))}</time>
        <p class="updates-text">${escHtml(u[siteLang] || u.zh)}</p>
    </li>`).join('');
    const pager = document.getElementById('updates-pager');
    if (!pager) return;
    pager.hidden = pages < 2;
    document.getElementById('updates-prev').disabled = updatesPage === 0;
    document.getElementById('updates-next').disabled = updatesPage === pages - 1;
    document.getElementById('updates-page').textContent = t('updates_page', { n: updatesPage + 1, m: pages });
}

function updatesGo(step) {
    const next = updatesPage + step;
    if (next < 0 || next >= updatesPageCount()) return;
    updatesPage = next;
    renderUpdates();
    const panel = document.querySelector('#updates-overlay .updates-panel');
    if (panel) panel.scrollTop = 0;
}

function openUpdates() {
    const overlay = document.getElementById('updates-overlay');
    if (!overlay) return;
    updatesPage = 0;
    renderUpdates();
    overlay.classList.add('show');
    try { localStorage.setItem('updates_seen', updatesSeenKey()); } catch {}
    refreshUpdatesDot();
    // the ✕ — the 關閉 button at the bottom is hidden on phones
    const close = overlay.querySelector('.updates-x');
    if (close) close.focus({ preventScroll: true });
}

function closeUpdates() {
    const overlay = document.getElementById('updates-overlay');
    if (overlay) overlay.classList.remove('show');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeUpdates();
    // ← → turn the pages while the popup is open
    const overlay = document.getElementById('updates-overlay');
    if (!overlay || !overlay.classList.contains('show')) return;
    if (e.key === 'ArrowLeft') updatesGo(-1);
    else if (e.key === 'ArrowRight') updatesGo(1);
});

document.addEventListener('DOMContentLoaded', refreshUpdatesDot);
