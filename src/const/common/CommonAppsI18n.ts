import type { Language } from '@/src/translations/language';
import type { CommonType } from '@/src/types/CommonType';

/**
 * 제작자의 다른 앱 목록 — 언어별 이름/설명.
 * -------------------------------------------------
 * 목록 자체(아이콘·스토어 주소·카테고리)는 CommonAppsData 에 그대로 두고, 보이는 글자만 여기서 갈아 끼운다.
 * 한국어는 CommonAppsData 의 title/desc 를 그대로 쓴다 — 같은 문장을 두 곳에 두면 한쪽만 고쳐지기 때문이다.
 *
 * 번역 JSON(src/translations)이 아니라 여기 두는 이유:
 * 앱 목록은 스토어에 앱이 하나 늘 때마다 같이 늘어나는 데이터라, 데이터 옆에 두어야 한 파일만 고치면 된다.
 * (번역 JSON 에 넣으면 앱 하나 추가에 세 파일을 건드려야 하고, 빠뜨린 언어는 키 오류로만 드러난다)
 */
type AppText = { title: string; desc: string };

const APP_TEXTS: Record<number, Partial<Record<Language, AppText>>> = {
	26: {
		'en-EN': {
			title: 'QRMaker',
			desc: 'Create and scan QR codes and barcodes in a couple of taps, save them as an image or PDF, and keep them straight with history and notes.',
		},
		'ja-JP': {
			title: 'QRMaker',
			desc: 'QRコードとバーコードをかんたんに作成・スキャンし、画像やPDFで保存して履歴・メモで管理できるQR・バーコード生成アプリです。',
		},
	},
	25: {
		'en-EN': {
			title: 'Spitto Genie',
			desc: 'Works out the expected value and payout rate of each Korean instant-lottery series from the official issue records, so you can see which series is worth buying right now.',
		},
		'ja-JP': {
			title: 'スピットジーニー',
			desc: '公式の発行内訳をもとに残りの当選金と残り枚数から回別の期待値・還元率を計算し、今買うのに向いたスピット回を教えてくれるインスタントくじ分析アプリです。',
		},
	},
	27: {
		'en-EN': {
			title: 'Noise Meter',
			desc: 'Measure everyday noise in decibels and record it, then turn each session into a one-page report — peak and equivalent levels weighed against the day and night limits.',
		},
		'ja-JP': {
			title: '騒音測定器',
			desc: '生活騒音をデシベルで測って録音し、最高騒音レベルと等価騒音レベルを昼間・夜間の基準と照らし合わせて、提出できる測定結果レポート1枚にまとめるアプリです。',
		},
	},
	24: {
		'en-EN': {
			title: 'Korean Knowledge Quiz',
			desc: 'Learn the Korean general knowledge every native knows — idioms, proverbs, pure Korean words and historical figures — through quizzes, and repeat the ones you got wrong in review mode.',
		},
		'ja-JP': {
			title: '韓国語常識クイズ',
			desc: '四字熟語・ことわざ・固有語・偉人など、韓国人なら知っておきたい韓国語の常識をクイズで学び、間違えた問題は復習で繰り返し覚えられる韓国語学習アプリです。',
		},
	},
	23: {
		'en-EN': {
			title: 'Hanja Grade Quiz',
			desc: 'Study all 6,182 hanja assigned by the Korean Hanja proficiency levels through quizzes on meaning, radical and stroke count.',
		},
		'ja-JP': {
			title: '漢字級数クイズ',
			desc: '韓国語文会・漢字教育振興会の級別配当漢字6,182字を、訓音・部首・総画のクイズで覚える漢字級数学習アプリです。',
		},
	},
	22: {
		'en-EN': {
			title: 'PhotoLock',
			desc: 'A private vault that hides the photos and videos you would rather not show from the gallery and locks them behind a PIN or your fingerprint.',
		},
		'ja-JP': {
			title: 'PhotoLock',
			desc: '見せたくない写真や動画をギャラリーから隠し、PIN・指紋でロックするプライベート保管庫アプリです。',
		},
	},
	21: {
		'en-EN': {
			title: 'Mind:Forest',
			desc: 'Look after a tiring day with a mood journal, a tree you grow as you go, stress-relief tools, healing sounds and breathing meditation.',
		},
		'ja-JP': {
			title: 'こころ：森',
			desc: '感情の記録、こころの木を育てること、ストレス解消ツール、ヒーリングサウンドと呼吸瞑想で、疲れた一日のこころを整えるアプリです。',
		},
	},
	20: {
		'en-EN': {
			title: 'My Everyday Finance Calculator',
			desc: 'Deposits, savings plans, loans, salary — every everyday money calculation in one place, fast and simple.',
		},
		'ja-JP': {
			title: 'マイ生活金融計算機',
			desc: '預金・積立・ローン・年収など、暮らしの中の金融計算をひとつにまとめ、すばやく簡単に片づけられる生活金融計算機アプリ。',
		},
	},
	19: {
		'en-EN': {
			title: 'Infinite Math Quiz',
			desc: 'Keep your arithmetic sharp with daily practice, and watch scores and badges stack up as you go.',
		},
		'ja-JP': {
			title: '無限数学クイズ',
			desc: '毎日くり返して数学の感覚を鍛え、スコアとバッジで達成感まで積み上がる数学クイズアプリ。',
		},
	},
	18: {
		'en-EN': {
			title: 'Blood Type Lab',
			desc: 'Everything about blood types — inheritance calculator, compatibility, popular myths, quizzes and blood donation, all in one app!',
		},
		'ja-JP': {
			title: '血液型研究所',
			desc: '血液型に関するすべて — 遺伝計算から相性、俗説、クイズ、献血まで、知りたい情報をまとめたアプリです！',
		},
	},
	17: {
		'en-EN': {
			title: 'Quick Link: Smart Link Manager',
			desc: 'Save links in a tap and find them just as fast. Keep everything tidy in folders of your own.',
		},
		'ja-JP': {
			title: 'クイックリンク：スマートリンク管理',
			desc: '手早く保存して、すぐに探し出せます。自分だけのフォルダでリンクをすっきり管理しましょう！',
		},
	},
	16: {
		'en-EN': {
			title: 'Gamticon: Text Emoticons',
			desc: 'Over 2,000 text emoticons are waiting. Copy one with a single tap and paste it anywhere.',
		},
		'ja-JP': {
			title: 'ガムティコン：顔文字コレクション',
			desc: '2,000種類以上の顔文字が待っています。タップ一回でコピーして、どこにでもそのまま貼り付けましょう！',
		},
	},
	15: {
		'en-EN': {
			title: 'SunPick: Pure Korean Word Quiz',
			desc: 'Learn the beautiful native Korean words easily and playfully, test your vocabulary with varied quizzes, and drill the ones you missed until they stick.',
		},
		'ja-JP': {
			title: 'スンピク：固有語クイズ',
			desc: '韓国固有の美しい大和ことば（固有語）を楽しく学び、多彩なクイズで語彙力を確かめ、間違えた単語は繰り返し学習で身につけられるアプリです。',
		},
	},
	14: {
		'en-EN': {
			title: 'My Unit Calculator',
			desc: 'Unit conversion and everyday calculations in one place — arrange and manage the calculators you use most the way you work, at home, at the office or while studying.',
		},
		'ja-JP': {
			title: 'マイ単位計算機',
			desc: '単位換算と生活計算をひとつにまとめ、よく使う計算機を自分の使い方に合わせて並べ替え・管理できるオールインワン計算機アプリ。日常はもちろん実務や学習にも使えます。',
		},
	},
	13: {
		'en-EN': {
			title: 'Kinship Calculator Plus+',
			desc: 'More than a degree-of-kinship calculator: it works out paternal, maternal and in-law relations automatically, lets you search the full set of Korean kinship terms, and turns it all into a family-relations quiz.',
		},
		'ja-JP': {
			title: '親等計算機 Plus+',
			desc: '単なる親等計算機を超えて、家族関係をもっとも正確に、直感的に理解できるアプリです。父方・母方・姻族まで親等を自動計算し、膨大な親族の呼称をすぐ検索でき、「家族関係クイズ」で楽しく覚えられます。',
		},
	},
	12: {
		'en-EN': {
			title: 'Mood Pang',
			desc: 'Say how you feel right now with a single button and let the effects take the edge off. Build your own buttons from the images you like and arrange them into a space of your own.',
		},
		'ja-JP': {
			title: '気分パン！',
			desc: '今の気分をボタンひとつで表し、さまざまなエフェクトで軽くストレスを発散できるアプリです。好きな画像で自分だけのボタンを作り、自由に並べて自分の感情スペースを飾りましょう。',
		},
	},
	11: {
		'en-EN': {
			title: 'Age Calculator: Your Age Today',
			desc: 'More than an age calculator: it tells you what your birthday carries. Lunar and solar conversion comes standard, along with your zodiac animal, star sign, birthstone, birth flower, birth tree, birth colour and guardian star.',
		},
		'ja-JP': {
			title: '年齢計算機：今日の年齢',
			desc: '単なる年齢計算機を超えて、誕生日に込められた意味と人生の流れを教えてくれるアプリです。旧暦・新暦の変換はもちろん、干支・星座・誕生石・誕生花・誕生木・誕生色・守護星まで一目で分かります。',
		},
	},
	10: {
		'en-EN': {
			title: 'MatPick: Korean Spelling Quiz',
			desc: 'A quiz app that makes Korean spelling rules easy and fun to learn. Check what you have picked up, then drill the ones you missed in review mode until they stick.',
		},
		'ja-JP': {
			title: 'マッピク：韓国語つづりクイズ',
			desc: '韓国語のさまざまな正書法を、やさしく楽しく学べる学習型クイズアプリです。クイズで身につけた知識を確かめ、間違えた問題は「復習」機能で繰り返し覚えられます。',
		},
	},
	9: {
		'en-EN': {
			title: 'GwanPick: Korean Idiom Quiz',
			desc: 'A quiz app that makes Korean idioms easy and fun to learn. Check what you have picked up, then drill the ones you missed in review mode until they stick.',
		},
		'ja-JP': {
			title: 'クァンピク：韓国語慣用句クイズ',
			desc: '韓国のさまざまな慣用句を、やさしく楽しく学べる学習型クイズアプリです。クイズで身につけた知識を確かめ、間違えた問題は「復習」機能で繰り返し覚えられます。',
		},
	},
	8: {
		'en-EN': {
			title: 'NyangPick: Cat Quiz',
			desc: 'Get to know cat breeds the fun way — quizzes, spaced review and time challenges — while collecting characters and badges along the way.',
		},
		'ja-JP': {
			title: 'ニャンピク：猫クイズ',
			desc: 'さまざまな猫種を楽しく学び、クイズと反復学習、タイムチャレンジで知識を積みながら、キャラクターとバッジを集めるゲーム型学習アプリです。',
		},
	},
	7: {
		'en-EN': {
			title: 'OHeup: Daily Smoking Log',
			desc: '"Small records, big change — start today." See your smoking habit exactly as it is, and take the first step towards quitting.',
		},
		'ja-JP': {
			title: 'オフプ：今日の喫煙記録',
			desc: '「小さな記録が生む大きな変化、今日から始めましょう！」喫煙の習慣を正確に把握し、禁煙の第一歩をご一緒に。',
		},
	},
	6: {
		'en-EN': {
			title: 'MeongPick: Dog Quiz',
			desc: 'A field-guide style learning app: study dog breeds and lock them in with quizzes.',
		},
		'ja-JP': {
			title: 'モンピク：犬クイズ',
			desc: '犬の犬種を学び、クイズで記憶に残す図鑑型の学習アプリです。',
		},
	},
	5: {
		'en-EN': {
			title: 'SaPick: Four-Character Idiom Quiz',
			desc: 'An educational app for learning four-character idioms on cards and checking what you know with quizzes.',
		},
		'ja-JP': {
			title: 'サピク：四字熟語クイズ',
			desc: '四字熟語をカードで学び、クイズで実力を確かめられる教育用アプリです。',
		},
	},
	4: {
		'en-EN': {
			title: 'SokPick: Proverb Quiz',
			desc: 'An educational app for learning proverbs, testing them with varied quizzes and coming back to review them.',
		},
		'ja-JP': {
			title: 'ソクピク：ことわざクイズ',
			desc: 'ことわざを学び、さまざまなクイズで確かめながら、繰り返し復習できる教育用アプリです。',
		},
	},
	3: {
		'en-EN': {
			title: 'SuPick: Capital City Quiz',
			desc: 'An educational app for learning the capitals of the world and checking them with quizzes.',
		},
		'ja-JP': {
			title: 'スピク：首都クイズ',
			desc: '世界の首都を学び、クイズで確認できる教育用アプリです。',
		},
	},
	2: {
		'en-EN': {
			title: 'Lotto Genie: Number Generator',
			desc: 'Winning checks, statistics and number generation — every lottery tool gathered in one app.',
		},
		'ja-JP': {
			title: 'ロトジーニー：ロト番号生成',
			desc: '当選確認、統計分析、番号生成など、ロトの機能をひとつにまとめたアプリです。',
		},
	},
	1: {
		'en-EN': {
			title: 'Pyeong Calculator',
			desc: 'A calculator that converts between square metres and pyeong and works out the price per pyeong.',
		},
		'ja-JP': {
			title: '坪数計算機',
			desc: '㎡（平方メートル）と坪をかんたんに変換し、坪単価も計算できる計算機アプリです。',
		},
	},
};

/**
 * 지금 언어로 보여 줄 이름/설명. 번역이 없는 언어(한국어 포함)는 목록에 적힌 원문으로 떨어진다.
 * 화면에서는 app.title / app.desc 대신 늘 이 함수를 거친다 — 한 곳이라도 빠지면 그 줄만 한국어로 남는다.
 */
export const localizedApp = (app: CommonType.AppItem, language: string): AppText =>
	APP_TEXTS[app.id]?.[language as Language] ?? { title: app.title, desc: app.desc };
