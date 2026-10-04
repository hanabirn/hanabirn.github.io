/* ===================== What's new (header "更新內容" button) =====================
   SITE_UPDATES is the changelog shown in the popup, newest first, one text per
   site language (falls back to zh). Add new entries at the top; the dot on the
   button lights up until the visitor has opened the popup since the newest date. */

const SITE_UPDATES = [
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
