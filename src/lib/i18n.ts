import { Language } from '@/types/game';

type TranslationKey = string;
type Translations = Record<TranslationKey, string>;

const en: Translations = {
  // Navigation
  'nav.home': 'Home',
  'nav.rules': 'Rules',
  'nav.language': 'فارسی',

  // Home
  'home.title': 'Welcome to Kalameh',
  'home.subtitle': 'A fun party word game for friends!',
  'home.createGame': 'Create New Game',
  'home.joinGame': 'Join Game',
  'home.enterCode': 'Enter game code',
  'home.enterName': 'Enter your name',
  'home.join': 'Join',

  // Create Game
  'create.title': 'Create New Game',
  'create.gameName': 'Game Name',
  'create.gameNamePlaceholder': 'Enter a name for your game',
  'create.maxPlayers': 'Number of Players',
  'create.wordsPerPlayer': 'Words Per Player',
  'create.language': 'Language',
  'create.timerSettings': 'Timer Settings (seconds)',
  'create.skipSettings': 'Skip Limits',
  'create.round1': 'Round 1 — Describe',
  'create.round2': 'Round 2 — One Word',
  'create.round3': 'Round 3 — Mime',
  'create.timer': 'Timer',
  'create.skips': 'Skips',
  'create.hostName': 'Your Name (Host)',
  'create.hostNamePlaceholder': 'Enter your name',
  'create.submit': 'Create Game',

  // Lobby
  'lobby.title': 'Game Lobby',
  'lobby.code': 'Game Code',
  'lobby.copyCode': 'Copy',
  'lobby.copied': 'Copied!',
  'lobby.players': 'Players',
  'lobby.teamA': 'Team A',
  'lobby.teamB': 'Team B',
  'lobby.waitingForPlayers': 'Waiting for players to join...',
  'lobby.startGame': 'Start Game',
  'lobby.needMorePlayers': 'Need at least 4 players to start',
  'lobby.settings': 'Game Settings',

  // Add Words
  'words.title': 'Add Your Words',
  'words.searchDB': 'Search Dictionary',
  'words.searchPlaceholder': 'Search for words...',
  'words.customWord': 'Add Custom Word',
  'words.customPlaceholder': 'Type a word...',
  'words.add': 'Add',
  'words.myWords': 'My Words',
  'words.wordsCount': '{count} of {total} words added',
  'words.submit': 'Submit Words',
  'words.submitted': 'Words Submitted!',
  'words.waiting': 'Waiting for other players...',
  'words.progress': 'Submission Progress',
  'words.playerSubmitted': 'Submitted',
  'words.playerPending': 'Pending',
  'words.duplicate': 'This word is already in the pool',
  'words.remove': 'Remove',
  'words.generator': 'Word Generator',
  'words.easy': 'Easy',
  'words.moderate': 'Moderate',
  'words.hard': 'Hard',
  'words.generate': 'Generate Words',
  'words.clickToAdd': 'Click a word to add it to your pool',
  'words.emptyPool': 'Generate words or type your own to get started',
  'words.addToBowl': 'Add to the Bowl',
  'words.swipeHint': 'Swipe left to remove words',

  // Game
  'game.round': 'Round {number}',
  'game.round1Title': 'Describe It',
  'game.round2Title': 'One Word',
  'game.round3Title': 'Mime It',
  'game.round1Desc': 'Use sentences to describe the word. No rhyming or spelling!',
  'game.round2Desc': 'Use only ONE word as a hint. No gestures!',
  'game.round3Desc': 'Act it out silently. No words or sounds!',
  'game.yourTurn': 'Your Turn!',
  'game.start': 'Start',
  'game.correct': 'Correct',
  'game.skip': 'Skip',
  'game.skipsLeft': '{count} skips left',
  'game.noSkipsLeft': 'No skips left',
  'game.describing': '{player} is describing...',
  'game.wordsLeft': '{count} words left',
  'game.timeUp': "Time's Up!",
  'game.score': 'Score',
  'game.nextRoundSoon': 'Next round starting soon...',
  'game.waitingForStart': 'Waiting for them to start...',
  'game.startRound': 'Start Round {number}',
  'game.waitingForNextRound': 'Waiting for {player} to start Round {number}...',
  'game.roundXWon': '{team} won Round {number}: {a} vs {b}',
  'game.roundXTie': 'Round {number} tied: {a} vs {b}',

  // Results
  'results.roundWinner': 'Round {number} Winner',
  'results.finalResults': 'Final Results',
  'results.winner': '{team} Wins!',
  'results.tie': "It's a Tie!",
  'results.scoreBreakdown': 'Score Breakdown',
  'results.total': 'Total',
  'results.playAgain': 'Play Again',
  'results.backHome': 'Back to Home',

  // Rules
  'rules.title': 'How to Play Kalameh',
  'rules.overview': 'Overview',
  'rules.overviewText': 'Kalameh is a party word game played in teams across 3 rounds. Each round uses the same set of words, but the way you can describe them changes!',
  'rules.setup': 'Setup',
  'rules.setupText': 'Players are divided into two teams. Each player adds words to a shared pool. Then the fun begins!',
  'rules.round1Rules': 'Round 1 — Describe It',
  'rules.round1Text': 'Use as many words and sentences as you want to describe the word. No rhyming, no spelling, no using the word itself!',
  'rules.round2Rules': 'Round 2 — One Word',
  'rules.round2Text': 'You can only say ONE word as a hint. Choose wisely! No gestures allowed.',
  'rules.round3Rules': 'Round 3 — Mime',
  'rules.round3Text': 'Act it out using only your body. No words, no sounds, no pointing at objects!',
  'rules.scoring': 'Scoring',
  'rules.scoringText': 'Each correctly guessed word earns 1 point for your team. The team with the most total points across all 3 rounds wins!',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try Again',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
};

const fa: Translations = {
  // Navigation
  'nav.home': 'خانه',
  'nav.rules': 'قوانین',
  'nav.language': 'English',

  // Home
  'home.title': 'به کلمه خوش آمدید',
  'home.subtitle': 'یک بازی کلمات گروهی برای دوستان!',
  'home.createGame': 'ساخت بازی جدید',
  'home.joinGame': 'پیوستن به بازی',
  'home.enterCode': 'کد بازی را وارد کنید',
  'home.enterName': 'نام خود را وارد کنید',
  'home.join': 'پیوستن',

  // Create Game
  'create.title': 'ساخت بازی جدید',
  'create.gameName': 'نام بازی',
  'create.gameNamePlaceholder': 'یک نام برای بازی وارد کنید',
  'create.maxPlayers': 'تعداد بازیکنان',
  'create.wordsPerPlayer': 'تعداد کلمات هر بازیکن',
  'create.language': 'زبان',
  'create.timerSettings': 'تنظیمات زمان (ثانیه)',
  'create.skipSettings': 'محدودیت رد کردن',
  'create.round1': 'دور اول — توضیح بده',
  'create.round2': 'دور دوم — یک کلمه',
  'create.round3': 'دور سوم — ادا درآر',
  'create.timer': 'زمان',
  'create.skips': 'رد کردن',
  'create.hostName': 'نام شما (میزبان)',
  'create.hostNamePlaceholder': 'نام خود را وارد کنید',
  'create.submit': 'ساخت بازی',

  // Lobby
  'lobby.title': 'لابی بازی',
  'lobby.code': 'کد بازی',
  'lobby.copyCode': 'کپی',
  'lobby.copied': 'کپی شد!',
  'lobby.players': 'بازیکنان',
  'lobby.teamA': 'تیم الف',
  'lobby.teamB': 'تیم ب',
  'lobby.waitingForPlayers': 'منتظر بازیکنان...',
  'lobby.startGame': 'شروع بازی',
  'lobby.needMorePlayers': 'حداقل ۴ بازیکن لازم است',
  'lobby.settings': 'تنظیمات بازی',

  // Add Words
  'words.title': 'کلمات خود را اضافه کنید',
  'words.searchDB': 'جستجو در فرهنگ لغت',
  'words.searchPlaceholder': 'جستجوی کلمه...',
  'words.customWord': 'افزودن کلمه دلخواه',
  'words.customPlaceholder': 'یک کلمه تایپ کنید...',
  'words.add': 'افزودن',
  'words.myWords': 'کلمات من',
  'words.wordsCount': '{count} از {total} کلمه اضافه شد',
  'words.submit': 'ثبت کلمات',
  'words.submitted': 'کلمات ثبت شد!',
  'words.waiting': 'منتظر بازیکنان دیگر...',
  'words.progress': 'وضعیت ثبت',
  'words.playerSubmitted': 'ثبت شده',
  'words.playerPending': 'در انتظار',
  'words.duplicate': 'این کلمه قبلا اضافه شده',
  'words.remove': 'حذف',
  'words.generator': 'تولید کلمه',
  'words.easy': 'آسان',
  'words.moderate': 'متوسط',
  'words.hard': 'سخت',
  'words.generate': 'تولید کلمات',
  'words.clickToAdd': 'روی کلمه کلیک کنید تا اضافه شود',
  'words.emptyPool': 'کلمات تولید کنید یا خودتان بنویسید',
  'words.addToBowl': 'افزودن به کاسه',
  'words.swipeHint': 'برای حذف به چپ بکشید',

  // Game
  'game.round': 'دور {number}',
  'game.round1Title': 'توضیح بده',
  'game.round2Title': 'یک کلمه',
  'game.round3Title': 'ادا درآر',
  'game.round1Desc': 'با جمله کلمه را توضیح بده. قافیه و هجی ممنوع!',
  'game.round2Desc': 'فقط یک کلمه بگو. بدون حرکت دست!',
  'game.round3Desc': 'فقط با بدن نشان بده. بدون صدا و کلمه!',
  'game.yourTurn': 'نوبت شماست!',
  'game.start': 'شروع',
  'game.correct': 'درست',
  'game.skip': 'رد',
  'game.skipsLeft': '{count} رد باقی مانده',
  'game.noSkipsLeft': 'رد کردن تمام شد',
  'game.describing': '{player} در حال توضیح دادن...',
  'game.wordsLeft': '{count} کلمه باقی مانده',
  'game.timeUp': 'وقت تمام شد!',
  'game.score': 'امتیاز',
  'game.nextRoundSoon': 'دور بعدی به زودی شروع می‌شود...',
  'game.waitingForStart': 'منتظر شروع بازیکن...',
  'game.startRound': 'شروع دور {number}',
  'game.waitingForNextRound': 'منتظر {player} برای شروع دور {number}...',
  'game.roundXWon': '{team} برنده دور {number} شد: {a} در برابر {b}',
  'game.roundXTie': 'دور {number} مساوی شد: {a} در برابر {b}',

  // Results
  'results.roundWinner': 'برنده دور {number}',
  'results.finalResults': 'نتایج نهایی',
  'results.winner': 'تیم {team} برنده شد!',
  'results.tie': 'مساوی!',
  'results.scoreBreakdown': 'جزئیات امتیاز',
  'results.total': 'مجموع',
  'results.playAgain': 'بازی دوباره',
  'results.backHome': 'بازگشت به خانه',

  // Rules
  'rules.title': 'قوانین بازی کلمه',
  'rules.overview': 'مرور کلی',
  'rules.overviewText': 'کلمه یک بازی گروهی کلمات است که در ۳ دور بازی می‌شود. هر دور از همان کلمات استفاده می‌شود، اما روش توضیح دادن تغییر می‌کند!',
  'rules.setup': 'آماده‌سازی',
  'rules.setupText': 'بازیکنان به دو تیم تقسیم می‌شوند. هر بازیکن کلماتی به مجموعه مشترک اضافه می‌کند. بعد بازی شروع می‌شود!',
  'rules.round1Rules': 'دور اول — توضیح بده',
  'rules.round1Text': 'با هر تعداد کلمه و جمله می‌توانید کلمه را توضیح دهید. قافیه، هجی کردن و استفاده از خود کلمه ممنوع است!',
  'rules.round2Rules': 'دور دوم — یک کلمه',
  'rules.round2Text': 'فقط یک کلمه به عنوان راهنمایی بگویید. خوب انتخاب کنید! حرکات دست ممنوع.',
  'rules.round3Rules': 'دور سوم — ادا درآر',
  'rules.round3Text': 'فقط با حرکات بدن نشان دهید. بدون کلمه، بدون صدا، بدون اشاره به اشیا!',
  'rules.scoring': 'امتیازدهی',
  'rules.scoringText': 'هر کلمه درست حدس زده شده ۱ امتیاز برای تیم شما. تیمی که بیشترین امتیاز را در مجموع ۳ دور داشته باشد برنده است!',

  // Common
  'common.loading': 'در حال بارگذاری...',
  'common.error': 'مشکلی پیش آمد',
  'common.retry': 'تلاش دوباره',
  'common.close': 'بستن',
  'common.confirm': 'تایید',
  'common.cancel': 'لغو',
};

const translations: Record<Language, Translations> = { en, fa };

export function t(key: string, lang: Language, params?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] || translations['en']?.[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }

  return text;
}

export function isRTL(lang: Language): boolean {
  return lang === 'fa';
}

export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'fa' ? 'rtl' : 'ltr';
}

export { translations };
export type { TranslationKey, Translations };
