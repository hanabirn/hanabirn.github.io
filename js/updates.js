/* ===================== What's new (header "更新內容" button) =====================
   SITE_UPDATES is the changelog shown in the popup, newest first, one text per
   site language (falls back to zh). Add new entries at the top; the dot on the
   button lights up until the visitor has opened the popup since the newest date. */

const SITE_UPDATES = [
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
    const close = overlay.querySelector('.updates-close');
    if (close) close.focus();
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
