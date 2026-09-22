const STORAGE_KEY = 'seabattle_player_v1';

export const LANGS = ['ru', 'en', 'es'];

/** Визуальные режимы: Классика / Пиратская бухта */
export const THEME_IDS = ['classic', 'pirate'];

export const THEMES = {
  classic: {
    id: 'classic',
    name: { ru: 'Классика', en: 'Classic', es: 'Clásica' },
    folder: null, // public/assets + public/assets/ui
  },
  pirate: {
    id: 'pirate',
    name: { ru: 'Пиратская бухта', en: 'Pirate Cove', es: 'Cala Pirata' },
    folder: 'pirate',
  },
};

export const GAME_TITLE = {
  ru: 'Кильватер',
  en: 'Keelwater',
  es: 'Keelwater',
};

/** Все строки интерфейса — без смеси языков */
export const STR = {
  unnamed: { ru: 'Безымянный', en: 'Unnamed', es: 'Sin nombre' },
  battle: { ru: 'В БОЙ', en: 'BATTLE', es: 'A LA BATALLA' },
  profile: { ru: 'Профиль', en: 'Profile', es: 'Perfil' },
  shop: { ru: 'Магазин', en: 'Shop', es: 'Tienda' },
  optics: { ru: 'Оптика', en: 'Optics', es: 'Óptica' },
  rating: { ru: 'Рейтинг', en: 'Rating', es: 'Clasificación' },
  settings: { ru: 'Настройки', en: 'Settings', es: 'Ajustes' },
  name: { ru: 'Имя', en: 'Name', es: 'Nombre' },
  rank: { ru: 'Ранг', en: 'Rank', es: 'Rango' },
  career: { ru: 'Карьера', en: 'Career', es: 'Carrera' },
  anchors: { ru: 'Якоря', en: 'Anchors', es: 'Anclas' },
  points: { ru: 'очков', en: 'pts', es: 'pts' },
  setNameFree: { ru: 'Записать имя — бесплатно', en: 'Set name — free', es: 'Poner nombre — gratis' },
  renameCost: { ru: 'Сменить имя', en: 'Rename', es: 'Cambiar nombre' },
  enterName: {
    ru: 'Введите имя капитана (до 16 символов):',
    en: 'Enter captain name (max 16):',
    es: 'Nombre del capitán (máx. 16):',
  },
  emptyName: { ru: 'Имя пустое', en: 'Empty name', es: 'Nombre vacío' },
  nameSaved: { ru: 'Имя сохранено', en: 'Name saved', es: 'Nombre guardado' },
  nameBad: {
    ru: 'Имя недопустимо',
    en: 'Name not allowed',
    es: 'Nombre no permitido',
  },
  nameShort: {
    ru: 'Слишком короткое имя',
    en: 'Name too short',
    es: 'Nombre demasiado corto',
  },
  nameChars: {
    ru: 'Только буквы, цифры и - _',
    en: 'Letters, digits and - _ only',
    es: 'Solo letras, números y - _',
  },
  notEnough: { ru: 'Не хватает якорей', en: 'Not enough anchors', es: 'Anclas insuficientes' },
  purchaseFail: {
    ru: 'Покупка не завершена',
    en: 'Purchase was not completed',
    es: 'La compra no se completó',
  },
  purchaseWait: {
    ru: 'Покупка сейчас недоступна',
    en: 'Purchases are unavailable',
    es: 'Las compras no están disponibles',
  },
  shopTitle: { ru: 'Магазин якорей', en: 'Anchor Shop', es: 'Tienda de anclas' },
  shopHint: {
    ru: 'Демо-покупки (оплата позже)',
    en: 'Demo purchases (IAP later)',
    es: 'Compras demo (pago después)',
  },
  opticsHint: {
    ru: 'Клик по строке — предпросмотр. Купить / надеть — отдельной кнопкой.',
    en: 'Click a row to preview. Buy / equip with the separate button.',
    es: 'Clic en la fila — vista previa. Compra / equipo en el botón aparte.',
  },
  equipped: { ru: 'Надет', en: 'Equipped', es: 'Equipado' },
  equip: { ru: 'Надеть', en: 'Equip', es: 'Equipar' },
  buy: { ru: 'Купить', en: 'Buy', es: 'Comprar' },
  preview: { ru: 'Предпросмотр', en: 'Preview', es: 'Vista previa' },
  colPlace: { ru: 'Место', en: 'Rank', es: 'Puesto' },
  colPlayer: { ru: 'Игрок', en: 'Player', es: 'Jugador' },
  colScore: { ru: 'Очки', en: 'Score', es: 'Puntos' },
  colTime: { ru: 'Время', en: 'Time', es: 'Tiempo' },
  sightBought: { ru: 'Прицел куплен', en: 'Sight purchased', es: 'Mira comprada' },
  sightEquipped: { ru: 'Прицел надет', en: 'Sight equipped', es: 'Mira equipada' },
  daily: { ru: 'День', en: 'Daily', es: 'Día' },
  monthly: { ru: 'Месяц', en: 'Monthly', es: 'Mes' },
  language: { ru: 'Язык', en: 'Language', es: 'Idioma' },
  sound: { ru: 'Звук', en: 'Sound', es: 'Sonido' },
  music: { ru: 'Музыка', en: 'Music', es: 'Música' },
  musicPick: { ru: 'Своя мелодия', en: 'Your track', es: 'Tu música' },
  musicStock: { ru: 'Стандарт', en: 'Default', es: 'Estándar' },
  musicBad: { ru: 'Этот файл не читается', en: 'That file could not be read', es: 'No se pudo leer el archivo' },
  musicBig: { ru: 'Файл больше 20 МБ', en: 'File is over 20 MB', es: 'El archivo pesa más de 20 MB' },
  aimControl: { ru: 'Управление', en: 'Controls', es: 'Control' },
  aimButtons: { ru: 'Кнопки', en: 'Buttons', es: 'Botones' },
  aimGyro: { ru: 'Гироскоп', en: 'Tilt', es: 'Giroscopio' },
  gyroDenied: {
    ru: 'Гироскоп недоступен',
    en: 'Tilt is not available',
    es: 'El giroscopio no está disponible',
  },
  on: { ru: 'ВКЛ', en: 'ON', es: 'SÍ' },
  off: { ru: 'ВЫКЛ', en: 'OFF', es: 'NO' },
  you: { ru: 'Вы', en: 'You', es: 'Tú' },
  runScore: { ru: 'Бой', en: 'Run', es: 'Partida' },
  runTime: { ru: 'Время', en: 'Time', es: 'Tiempo' },
  tagDeal: { ru: 'Выгодно', en: 'Deal', es: 'Oferta' },
  tagTop: { ru: 'Топ', en: 'Best', es: 'Top' },
  free: { ru: 'бесплатно', en: 'free', es: 'gratis' },
  portraits: { ru: 'Аватары', en: 'Avatars', es: 'Avatares' },
  anchorsTab: { ru: 'Якоря', en: 'Anchors', es: 'Anclas' },
  portraitBought: { ru: 'Аватар куплен', en: 'Avatar purchased', es: 'Avatar comprado' },
  portraitEquipped: { ru: 'Аватар выбран', en: 'Avatar equipped', es: 'Avatar elegido' },
  save: { ru: 'Сохранить', en: 'Save', es: 'Guardar' },
  cancel: { ru: 'Отмена', en: 'Cancel', es: 'Cancelar' },
  namePlaceholder: { ru: 'Ваше имя', en: 'Your name', es: 'Tu nombre' },
  visualMode: { ru: 'Визуал', en: 'Visual', es: 'Visual' },
  themeClassic: { ru: 'Классика', en: 'Classic', es: 'Clásica' },
  themePirate: { ru: 'Пиратская бухта', en: 'Pirate Cove', es: 'Cala Pirata' },
  hintBody: {
    ru: 'Боевые корабли стреляют в ответ.\nСундук: жизнь, множители, ром, иногда штраф или якоря.\nКаждый выстрел стоит 20 очков.',
    en: 'Warships shoot back.\nCrates hold a life, multipliers, rum, sometimes a penalty or anchors.\nEach shot costs 20 points.',
    es: 'Los barcos de guerra disparan.\nEl cofre: vida, multiplicadores, ron, a veces penalización o anclas.\nCada disparo cuesta 20 puntos.',
  },
  hintGo: {
    ru: 'Нажмите, чтобы начать',
    en: 'Click to start',
    es: 'Pulse para empezar',
  },
  prizes: { ru: 'Призы', en: 'Prizes', es: 'Premios' },
  prizeEmpty: { ru: 'Приз объявим позже', en: 'Prize to be announced', es: 'Premio por anunciar' },
  subChecking: { ru: 'Проверяем подписку…', en: 'Checking subscription…', es: 'Comprobando la suscripción…' },
  subTitle: { ru: 'Нужна подписка', en: 'Subscription required', es: 'Hace falta suscripción' },
  subBody: {
    ru: 'В бой пускаем только с оплаченной подпиской. За каждый день, когда вы заходите в игру, начисляем 20 якорей.',
    en: 'Battle opens only with an active subscription. Each day you enter the game you receive 20 anchors.',
    es: 'La batalla se abre solo con la suscripción pagada. Cada día que entras recibes 20 anclas.',
  },
  subButton: { ru: 'Оформить подписку', en: 'Subscribe', es: 'Suscribirse' },
  subRetry: { ru: 'Проверить снова', en: 'Check again', es: 'Comprobar de nuevo' },
  subWait: {
    ru: 'Подписка пока не активна',
    en: 'Subscription is not active yet',
    es: 'La suscripción aún no está activa',
  },
  subDailyNote: {
    ru: 'Якоря приходят с подпиской: 20 в день, когда вы заходите в игру.',
    en: 'Anchors come with the subscription: 20 a day when you enter the game.',
    es: 'Las anclas vienen con la suscripción: 20 al día cuando entras.',
  },
  adEntryTitle: { ru: 'Не хватает якорей', en: 'Not enough anchors', es: 'No hay suficientes anclas' },
  adEntryButton: { ru: 'Ролик за вход', en: 'Video for a battle', es: 'Vídeo para entrar' },
  adShop: { ru: 'Ролик · +10 якорей', en: 'Video · +10 anchors', es: 'Vídeo · +10 anclas' },
  adShopDone: { ru: 'Сегодня ролик уже посмотрен', en: 'Today’s video is already used', es: 'El vídeo de hoy ya se usó' },
  adFail: { ru: 'Ролик не загрузился', en: 'The video did not load', es: 'El vídeo no se cargó' },
  adContinueTitle: {
    ru: 'Жизни кончились.\nДосмотрите ролик — и получите ещё 3.',
    en: 'No lives left.\nWatch a video to get 3 more.',
    es: 'No quedan vidas.\nMira un vídeo y recibe 3 más.',
  },
  adContinueYes: { ru: '3 жизни', en: '3 lives', es: '3 vidas' },
  adContinueNo: { ru: 'Закончить бой', en: 'End battle', es: 'Terminar' },
};

export const PORTRAITS_CLASSIC = [
  {
    id: 'default',
    name: { ru: 'Юнга', en: 'Cadet', es: 'Grumete' },
    price: 0,
    texture: 'portrait-default',
    perk: {},
    perkText: {
      ru: 'Без бонусов и штрафов',
      en: 'No bonuses or penalties',
      es: 'Sin bonificaciones ni penalizaciones',
    },
  },
  {
    id: 'captain',
    name: { ru: 'Капитан', en: 'Captain', es: 'Capitán' },
    price: 120,
    texture: 'portrait-captain',
    perk: { bonusStartLife: 1, shotPenaltyAdd: 5 },
    perkText: {
      ru: 'Старт с 6 жизнями вместо 5\nКаждый выстрел: −25 очков (обычно −20)',
      en: 'Start with 6 lives instead of 5\nEach shot: −25 pts (normally −20)',
      es: 'Empieza con 6 vidas en vez de 5\nCada disparo: −25 pts (normal −20)',
    },
  },
  {
    id: 'officer',
    name: { ru: 'Офицер', en: 'Officer', es: 'Oficial' },
    price: 150,
    texture: 'portrait-officer',
    perk: { shotPenaltyMult: 0.75, sharkEatMult: 0.7 },
    perkText: {
      ru: 'Выстрел: −15 очков вместо −20\nАкула ест сундук на 30% реже',
      en: 'Shot cost: −15 pts instead of −20\nShark eats crates 30% less often',
      es: 'Disparo: −15 pts en vez de −20\nTiburón 30% menos frecuente',
    },
  },
  {
    id: 'pirate',
    name: { ru: 'Корсар', en: 'Corsair', es: 'Corsario' },
    price: 180,
    texture: 'portrait-pirate',
    perk: {
      scoreByShip: { 'ship-war': 1.15, 'ship-sub': 1.2, 'ship-cargo': 0.9, 'ship-container': 0.9 },
      badLootSaveChance: 0.3,
    },
    perkText: {
      ru: 'Военный корабль: +15% очков\nПодлодка: +20% очков\nТорговый / контейнер: −10% очков\n30% шанс отменить ром или ÷1.5 из сундука',
      en: 'Warship: +15% score\nSub: +20% score\nCargo / container: −10% score\n30% chance to cancel rum or ÷1.5 from crate',
      es: 'Barco de guerra: +15% puntos\nSubmarino: +20% puntos\nMercante / contenedor: −10%\n30% anular ron o ÷1.5 del cofre',
    },
  },
];

export const PORTRAITS_PIRATE = [
  {
    id: 'cabin',
    name: { ru: 'Юнга', en: 'Cabin Boy', es: 'Grumete' },
    price: 0,
    texture: 'portrait-cabin',
    perk: {},
    perkText: {
      ru: 'Без бонусов и штрафов',
      en: 'No bonuses or penalties',
      es: 'Sin bonificaciones ni penalizaciones',
    },
  },
  {
    id: 'pcap',
    name: { ru: 'Капитан', en: 'Captain', es: 'Capitán' },
    price: 120,
    texture: 'portrait-pcap',
    perk: { bonusStartLife: 1, shotPenaltyAdd: 5 },
    perkText: {
      ru: 'Старт с 6 жизнями вместо 5\nКаждый выстрел: −25 очков (обычно −20)',
      en: 'Start with 6 lives instead of 5\nEach shot: −25 pts (normally −20)',
      es: 'Empieza con 6 vidas en vez de 5\nCada disparo: −25 pts (normal −20)',
    },
  },
  {
    id: 'poff',
    name: { ru: 'Боцман', en: 'Boatswain', es: 'Contramaestre' },
    price: 150,
    texture: 'portrait-poff',
    perk: { shotPenaltyMult: 0.75, sharkEatMult: 0.7 },
    perkText: {
      ru: 'Выстрел: −15 очков вместо −20\nАкула ест сундук на 30% реже',
      en: 'Shot cost: −15 pts instead of −20\nShark eats crates 30% less often',
      es: 'Disparo: −15 pts en vez de −20\nTiburón 30% menos frecuente',
    },
  },
  {
    id: 'pcorsair',
    name: { ru: 'Корсар', en: 'Corsair', es: 'Corsario' },
    price: 180,
    texture: 'portrait-pcorsair',
    perk: {
      scoreByShip: {
        'ship-war': 1.15,
        'ship-sub': 1.2,
        'ship-brig': 1.25,
        'ship-cargo': 0.9,
        'ship-container': 0.9,
      },
      badLootSaveChance: 0.3,
    },
    perkText: {
      ru: 'Бриг: +25% очков\nВоенный: +15% / подлодка: +20%\nТорговый / контейнер: −10%\n30% шанс отменить ром или ÷1.5 из сундука',
      en: 'Brig: +25% score\nWarship: +15% / sub: +20%\nCargo / container: −10%\n30% chance to cancel rum or ÷1.5 from crate',
      es: 'Bergantín: +25%\nGuerra: +15% / sub: +20%\nMercante / contenedor: −10%\n30% anular ron o ÷1.5 del cofre',
    },
  },
];

/** @deprecated use getPortraits(state) */
export const PORTRAITS = PORTRAITS_CLASSIC;

export const SIGHTS_CLASSIC = [
  {
    id: 'classic',
    name: { ru: 'Классика', en: 'Classic', es: 'Clásica' },
    price: 0,
    texture: 'sight-classic',
    perk: {},
    perkText: {
      ru: 'Без бонусов и штрафов',
      en: 'No bonuses or penalties',
      es: 'Sin bonificaciones ni penalizaciones',
    },
  },
  {
    id: 'holo',
    name: { ru: 'Голограф', en: 'Holo', es: 'Holo' },
    price: 40,
    texture: 'sight-holo',
    perk: { scanCrate: true, hitRadiusMult: 0.9 },
    perkText: {
      ru: 'При наведении показывает, что в сундуке\nПопадание по кораблям −10%',
      en: 'Aiming at a crate reveals its loot\nShip hitbox −10%',
      es: 'Al apuntar al cofre revela el botín\nAcierto en barcos −10%',
    },
  },
  {
    id: 'brass',
    name: { ru: 'Латунь', en: 'Brass', es: 'Latón' },
    price: 60,
    texture: 'sight-brass',
    perk: { hitRadiusMult: 1.12, missPenaltyAdd: 8 },
    perkText: {
      ru: 'Попадание по кораблям +12%\nПромах по воде: дополнительно −8 очков',
      en: 'Ship hitbox +12%\nWater miss: extra −8 pts',
      es: 'Acierto en barcos +12%\nFallo al agua: −8 pts extra',
    },
  },
  {
    id: 'diamond',
    name: { ru: 'Ромб', en: 'Diamond', es: 'Rombo' },
    price: 80,
    texture: 'sight-diamond',
    perk: { critChance: 0.18, critMult: 1.5, missPenaltyAdd: 10 },
    perkText: {
      ru: '18% шанс крита: очки за корабль ×1.5\nПромах по воде: дополнительно −10 очков',
      en: '18% crit chance: ship score ×1.5\nWater miss: extra −10 pts',
      es: '18% crítico: puntos del barco ×1.5\nFallo al agua: −10 pts extra',
    },
  },
  {
    id: 'minimal',
    name: { ru: 'Минимал', en: 'Minimal', es: 'Minimal' },
    price: 50,
    texture: 'sight-minimal',
    perk: { hitRadiusMult: 1.14, crateHitMult: 0.75 },
    perkText: {
      ru: 'Попадание по кораблям +14%\nЗона попадания по сундуку −25%',
      en: 'Ship hitbox +14%\nCrate hit zone −25%',
      es: 'Acierto en barcos +14%\nZona del cofre −25%',
    },
  },
];

export const SIGHTS_PIRATE = [
  {
    id: 'spyglass',
    name: { ru: 'Подзорная', en: 'Spyglass', es: 'Catalejo' },
    price: 0,
    texture: 'sight-spyglass',
    perk: {},
    perkText: {
      ru: 'Без бонусов и штрафов',
      en: 'No bonuses or penalties',
      es: 'Sin bonificaciones ni penalizaciones',
    },
  },
  {
    id: 'wood',
    name: { ru: 'Дубовая', en: 'Oak', es: 'Roble' },
    price: 45,
    texture: 'sight-wood',
    perk: { hitRadiusMult: 1.12, missPenaltyAdd: 8 },
    perkText: {
      ru: 'Попадание по кораблям +12%\nПромах по воде: дополнительно −8 очков',
      en: 'Ship hitbox +12%\nWater miss: extra −8 pts',
      es: 'Acierto en barcos +12%\nFallo al agua: −8 pts extra',
    },
  },
  {
    id: 'jolly',
    name: { ru: 'Весёлый Роджер', en: 'Jolly Roger', es: 'Jolly Roger' },
    price: 90,
    texture: 'sight-jolly',
    perk: { echoShot: true, echoCooldownMs: 4500, echoSpread: 32, hitRadiusMult: 0.88 },
    perkText: {
      ru: 'Каждые 4.5 с: второе ядро рядом с прицелом\nПопадание по кораблям −12%',
      en: 'Every 4.5s: second shot near the reticle\nShip hitbox −12%',
      es: 'Cada 4.5s: segundo disparo junto a la mira\nAcierto en barcos −12%',
    },
  },
];

/** @deprecated use getSights(state) */
export const SIGHTS = SIGHTS_CLASSIC;

export const ANCHOR_PACKS = [
  { id: 'pack_s', anchors: 50, priceLabel: { ru: '99 ₽', en: '$1.49', es: '1,49 €' } },
  {
    id: 'pack_m',
    anchors: 150,
    priceLabel: { ru: '249 ₽', en: '$3.99', es: '3,99 €' },
    tagKey: 'tagDeal',
  },
  {
    id: 'pack_l',
    anchors: 400,
    priceLabel: { ru: '599 ₽', en: '$8.99', es: '8,99 €' },
    tagKey: 'tagTop',
  },
];

export const RENAME_COST = 25;
export const GAME_COST = 10;
/**
 * Очки боя на один якорь.
 * Обычная партия живёт около 7 минут и приносит ~10 000 очков:
 * ~6 попаданий в минуту по ~250 минус цена выстрелов.
 * 10 000 / 1400 ≈ 7 якорей. Короткий бой на 3 минуты — около 2,
 * удачный на 15 минут — около 18.
 */
export const SCORE_PER_ANCHOR = 1400;

export function anchorsFromScore(score) {
  return Math.floor(Math.max(0, Number(score) || 0) / SCORE_PER_ANCHOR);
}

const defaultState = () => ({
  name: '',
  nameSetFree: false,
  anchors: 80,
  careerScore: 0,
  visualTheme: 'classic',
  equippedSight: 'classic',
  ownedSights: ['classic', 'spyglass'],
  equippedPortrait: 'default',
  ownedPortraits: ['default', 'cabin'],
  soundOn: true,
  musicOn: true,
  customMusicName: '',
  aimControl: 'buttons',
  hintSeen: false,
  lang: 'ru',
  langManual: false,
  updatedAt: 0,
  yandexTokens: [],
  daily: {}, // { 'YYYY-MM-DD': bestScoreThatDay }
  subAnchorDay: '',
  entryAdDay: '',
  entryAdCount: 0,
  shopAdDay: '',
});

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

/** Сумма лучших дневных результатов за месяц */
export function getMonthlyScore(state, month = monthKey()) {
  return Object.entries(state.daily || {})
    .filter(([day]) => day.startsWith(month))
    .reduce((sum, [, entry]) => sum + dayScore(entry), 0);
}

export function getMonthlyTime(state, month = monthKey()) {
  return Object.entries(state.daily || {})
    .filter(([day]) => day.startsWith(month))
    .reduce((sum, [, entry]) => sum + dayTime(entry), 0);
}

export function getDailyScore(state, day = todayKey()) {
  return dayScore(state.daily?.[day]);
}

export function getDailyTime(state, day = todayKey()) {
  return dayTime(state.daily?.[day]);
}

function dayScore(entry) {
  if (entry == null) return 0;
  if (typeof entry === 'number') return entry;
  return Number(entry.score) || 0;
}

function dayTime(entry) {
  if (entry == null || typeof entry === 'number') return 0;
  return Number(entry.timeMs) || 0;
}

/** mm:ss */
export function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isBetterRun(score, timeMs, prevEntry) {
  const prevScore = dayScore(prevEntry);
  const prevTime = dayTime(prevEntry);
  if (score > prevScore) return true;
  if (score < prevScore) return false;
  return timeMs > prevTime;
}

export function loadPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = { ...defaultState(), ...JSON.parse(raw) };
    if (!LANGS.includes(parsed.lang)) parsed.lang = 'ru';
    if (typeof parsed.langManual !== 'boolean') parsed.langManual = false;
    if (!Array.isArray(parsed.yandexTokens)) parsed.yandexTokens = [];
    if (!THEME_IDS.includes(parsed.visualTheme)) parsed.visualTheme = 'classic';
    if (parsed.aimControl !== 'gyro') parsed.aimControl = 'buttons';
    if (!Array.isArray(parsed.ownedPortraits) || !parsed.ownedPortraits.length) {
      parsed.ownedPortraits = ['default', 'cabin'];
    }
    if (!parsed.ownedPortraits.includes('cabin')) parsed.ownedPortraits.push('cabin');
    if (!parsed.ownedPortraits.includes('default')) parsed.ownedPortraits.push('default');
    if (!parsed.equippedPortrait) parsed.equippedPortrait = 'default';
    if (typeof parsed.hintSeen !== 'boolean') parsed.hintSeen = false;
    if (!Array.isArray(parsed.ownedSights) || !parsed.ownedSights.length) {
      parsed.ownedSights = ['classic', 'spyglass'];
    }
    if (!parsed.ownedSights.includes('spyglass')) parsed.ownedSights.push('spyglass');
    if (!parsed.ownedSights.includes('classic')) parsed.ownedSights.push('classic');
    ensureThemeSight(parsed);
    ensureThemePortrait(parsed);
    return parsed;
  } catch {
    return defaultState();
  }
}

let saveHook = null;

/** Площадка подписывается, чтобы унести прогресс на сервер после локальной записи. */
export function onPlayerSaved(fn) {
  saveHook = fn;
}

/** Более новое облачное сохранение Яндекса заменяет локальное. */
export function adoptCloud(remote) {
  const local = loadPlayer();
  const remoteAt = Number(remote?.updatedAt) || 0;
  if (!remote || typeof remote.anchors !== 'number' || remoteAt <= (Number(local.updatedAt) || 0)) {
    return local;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
  const next = loadPlayer();
  savePlayer(next);
  return next;
}

export function savePlayer(state) {
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  try {
    saveHook?.(state);
  } catch {
    /* синхронизация не должна ронять игру */
  }
}

export function getRank(careerScore) {
  const tiers = [
    { min: 0, ru: 'Юнга', en: 'Cadet', es: 'Grumete' },
    { min: 500, ru: 'Матрос', en: 'Seaman', es: 'Marinero' },
    { min: 2000, ru: 'Старшина', en: 'Petty Officer', es: 'Cabo' },
    { min: 5000, ru: 'Лейтенант', en: 'Lieutenant', es: 'Teniente' },
    { min: 12000, ru: 'Капитан', en: 'Captain', es: 'Capitán' },
    { min: 25000, ru: 'Адмирал', en: 'Admiral', es: 'Almirante' },
  ];
  let rank = tiers[0];
  for (const tier of tiers) {
    if (careerScore >= tier.min) rank = tier;
  }
  return rank;
}

export function submitRunScore(state, score, timeMs = 0) {
  const next = { ...state };
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const safeTime = Math.max(0, Math.floor(Number(timeMs) || 0));
  next.careerScore = (next.careerScore || 0) + safeScore;
  const d = todayKey();
  const prev = next.daily?.[d];
  const daily = { ...(next.daily || {}) };
  if (isBetterRun(safeScore, safeTime, prev)) {
    daily[d] = { score: safeScore, timeMs: safeTime };
  } else if (typeof prev === 'number') {
    // миграция старого формата
    daily[d] = { score: prev, timeMs: 0 };
  }
  next.daily = daily;
  const earned = anchorsFromScore(safeScore);
  next.anchors = (next.anchors || 0) + earned;
  savePlayer(next);
  return { state: next, earnedAnchors: earned };
}

export function tryStartGame(state) {
  if ((state.anchors || 0) < GAME_COST) return null;
  const next = { ...state, anchors: state.anchors - GAME_COST };
  savePlayer(next);
  return next;
}

/** Календарный день игрока: якоря подписки и лимит роликов не завязаны на UTC. */
function localDayKey() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export const SUB_DAILY_ANCHORS = 20;
export const ENTRY_AD_DAILY_LIMIT = 3;
export const SHOP_AD_ANCHORS = 10;

export function claimSubAnchors(state) {
  const day = localDayKey();
  if (state.subAnchorDay === day) return { state, granted: 0 };
  const next = {
    ...state,
    subAnchorDay: day,
    anchors: (state.anchors || 0) + SUB_DAILY_ANCHORS,
  };
  savePlayer(next);
  return { state: next, granted: SUB_DAILY_ANCHORS };
}

export function entryAdsLeft(state) {
  if (state.entryAdDay !== localDayKey()) return ENTRY_AD_DAILY_LIMIT;
  return Math.max(0, ENTRY_AD_DAILY_LIMIT - (state.entryAdCount || 0));
}

/** Ролик оплачивает вход: начисляем стоимость боя, затем её спишет tryStartGame. */
export function consumeEntryAd(state) {
  const day = localDayKey();
  const count = state.entryAdDay === day ? (state.entryAdCount || 0) + 1 : 1;
  const next = {
    ...state,
    entryAdDay: day,
    entryAdCount: count,
    anchors: (state.anchors || 0) + GAME_COST,
  };
  savePlayer(next);
  return next;
}

export function shopAdAvailable(state) {
  return state.shopAdDay !== localDayKey();
}

export function claimShopAd(state) {
  if (!shopAdAvailable(state)) return { state, granted: 0 };
  const next = {
    ...state,
    shopAdDay: localDayKey(),
    anchors: (state.anchors || 0) + SHOP_AD_ANCHORS,
  };
  savePlayer(next);
  return { state: next, granted: SHOP_AD_ANCHORS };
}

export function buildLeaderboard(state, mode = 'daily') {
  const bots = [
    { name: 'Neptun', daily: 420, monthly: 3100, dailyTime: 95000, monthlyTime: 620000 },
    { name: 'Sever', daily: 880, monthly: 5400, dailyTime: 140000, monthlyTime: 910000 },
    { name: 'Orion', daily: 150, monthly: 1200, dailyTime: 48000, monthlyTime: 310000 },
    { name: 'Volk', daily: 1200, monthly: 8900, dailyTime: 210000, monthlyTime: 1200000 },
    { name: 'Baltika', daily: 640, monthly: 4100, dailyTime: 110000, monthlyTime: 780000 },
    { name: 'Tuman', daily: 300, monthly: 2200, dailyTime: 72000, monthlyTime: 450000 },
    { name: 'Skat', daily: 990, monthly: 7000, dailyTime: 175000, monthlyTime: 1050000 },
    { name: 'Krab', daily: 520, monthly: 3600, dailyTime: 88000, monthlyTime: 560000 },
    { name: 'Parus', daily: 210, monthly: 1800, dailyTime: 55000, monthlyTime: 380000 },
    { name: 'Flot', daily: 1050, monthly: 7600, dailyTime: 190000, monthlyTime: 1120000 },
    { name: 'Rif', daily: 80, monthly: 900, dailyTime: 32000, monthlyTime: 240000 },
    { name: 'Mayak', daily: 450, monthly: 2900, dailyTime: 80000, monthlyTime: 500000 },
    { name: 'Latun', daily: 710, monthly: 4800, dailyTime: 125000, monthlyTime: 820000 },
    { name: 'Burun', daily: 340, monthly: 2500, dailyTime: 68000, monthlyTime: 420000 },
  ];
  const meName = state.name || t(state, 'you');
  const myScore = mode === 'daily' ? getDailyScore(state) : getMonthlyScore(state);
  const myTime = mode === 'daily' ? getDailyTime(state) : getMonthlyTime(state);

  const rows = bots.map((b) => ({
    name: b.name,
    score: mode === 'daily' ? b.daily : b.monthly,
    timeMs: mode === 'daily' ? b.dailyTime : b.monthlyTime,
    me: false,
  }));
  rows.push({ name: meName, score: myScore, timeMs: myTime, me: true });
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.timeMs || 0) - (a.timeMs || 0);
  });
  return rows.map((r, i) => ({ ...r, place: i + 1 }));
}

/** t(state, key) или t(state, {ru,en,es}) */
/** 1 якорь, 2 якоря, 5 якорей, 11 якорей, 21 якорь */
export function ruPlural(n, one, few, many) {
  const abs = Math.abs(Math.trunc(Number(n) || 0));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function anchorWord(lang, n) {
  if (lang === 'en') return Math.abs(Math.trunc(Number(n) || 0)) === 1 ? 'anchor' : 'anchors';
  if (lang === 'es') return Math.abs(Math.trunc(Number(n) || 0)) === 1 ? 'ancla' : 'anclas';
  return ruPlural(n, 'якорь', 'якоря', 'якорей');
}

export function t(state, keyOrDict) {
  const lang = LANGS.includes(state?.lang) ? state.lang : 'ru';
  if (typeof keyOrDict === 'string') {
    const row = STR[keyOrDict];
    if (!row) return keyOrDict;
    return row[lang] || row.ru;
  }
  if (keyOrDict && typeof keyOrDict === 'object') {
    return keyOrDict[lang] || keyOrDict.ru || '';
  }
  return '';
}

export function sightName(state, sight) {
  return sight.name[state.lang] || sight.name.ru;
}

export function portraitName(state, portrait) {
  return portrait.name[state.lang] || portrait.name.ru;
}

export function rankName(state, rank) {
  return rank[state.lang] || rank.ru;
}

export function getPortrait(state) {
  const list = getPortraits(state);
  return list.find((p) => p.id === state.equippedPortrait) || list[0];
}

export function getPortraits(state) {
  return getThemeId(state) === 'pirate' ? PORTRAITS_PIRATE : PORTRAITS_CLASSIC;
}

export function ensureThemePortrait(state) {
  const list = getPortraits(state);
  const ok = list.some((p) => p.id === state.equippedPortrait);
  if (!ok) state.equippedPortrait = list[0].id;
  if (!state.ownedPortraits.includes(list[0].id)) {
    state.ownedPortraits.push(list[0].id);
  }
  return state;
}

export function getThemeId(state) {
  return THEME_IDS.includes(state?.visualTheme) ? state.visualTheme : 'classic';
}

export function isPirateTheme(state) {
  return getThemeId(state) === 'pirate';
}

export function getSights(state) {
  return getThemeId(state) === 'pirate' ? SIGHTS_PIRATE : SIGHTS_CLASSIC;
}

export function getEquippedSight(state) {
  const list = getSights(state);
  return list.find((s) => s.id === state.equippedSight) || list[0];
}

/**
 * Перки лоадаута на бой.
 * Аватары: жизни, цена выстрела, акула, очки за типы кораблей, защита от плохого лута.
 * Прицелы: скан сундука, хитбокс, крит, эхо-выстрел, штраф за промах.
 * Оси не пересекаются — значения просто складываются/умножаются без конфликтов.
 */
export function getLoadoutPerks(state) {
  const sight = getEquippedSight(state)?.perk || {};
  const avatar = getPortrait(state)?.perk || {};
  return {
    // avatar
    bonusStartLife: avatar.bonusStartLife || 0,
    shotPenaltyMult: avatar.shotPenaltyMult ?? 1,
    shotPenaltyAdd: avatar.shotPenaltyAdd || 0,
    sharkEatMult: avatar.sharkEatMult ?? 1,
    badLootSaveChance: avatar.badLootSaveChance || 0,
    scoreByShip: { ...(avatar.scoreByShip || {}) },
    // sight
    scanCrate: !!sight.scanCrate,
    hitRadiusMult: sight.hitRadiusMult ?? 1,
    crateHitMult: sight.crateHitMult ?? 1,
    missPenaltyAdd: sight.missPenaltyAdd || 0,
    critChance: sight.critChance || 0,
    critMult: sight.critMult || 1,
    echoShot: !!sight.echoShot,
    echoCooldownMs: sight.echoCooldownMs || 4500,
    echoSpread: sight.echoSpread || 32,
  };
}

export function perkText(state, item) {
  if (!item?.perkText) return '';
  return item.perkText[state.lang] || item.perkText.ru || '';
}

export const CRATE_LOOT_META = {
  life: {
    tint: 0xff6b81,
    label: { ru: '+♥', en: '+♥', es: '+♥' },
    icon: null,
  },
  score2: {
    tint: 0x7cff9a,
    label: { ru: 'x2', en: 'x2', es: 'x2' },
    icon: null,
  },
  scoreDown: {
    tint: 0xff5555,
    label: { ru: '÷1.5', en: '÷1.5', es: '÷1.5' },
    icon: null,
  },
  triple: {
    tint: 0x7ad0ff,
    label: { ru: 'x3', en: 'x3', es: 'x3' },
    icon: 'torpedo',
  },
  rum: {
    tint: 0xe8a0ff,
    label: { ru: 'РОМ', en: 'RUM', es: 'RON' },
    icon: null,
  },
  /** Редкий: +N якорей на баланс */
  anchors: {
    tint: 0xffd27a,
    label: { ru: '+⚓', en: '+⚓', es: '+⚓' },
    icon: 'icon-anchor',
  },
};

export const CRATE_ANCHOR_BONUS = 10;

/** Веса лута сундука (якоря — очень редко, ~2%) */
const CRATE_LOOT_WEIGHTS = [
  { id: 'life', w: 23 },
  { id: 'score2', w: 22 },
  { id: 'scoreDown', w: 22 },
  { id: 'triple', w: 18 },
  { id: 'rum', w: 13 },
  { id: 'anchors', w: 2 },
];

export function pickCrateLoot(exclude = []) {
  const pool = CRATE_LOOT_WEIGHTS.filter((row) => !exclude.includes(row.id));
  const total = pool.reduce((s, row) => s + row.w, 0);
  let roll = Math.random() * total;
  for (const row of pool) {
    roll -= row.w;
    if (roll <= 0) return row.id;
  }
  return pool[pool.length - 1]?.id || 'life';
}

/** Если текущий прицел не из выбранного визуала — надеть бесплатный темы */
export function ensureThemeSight(state) {
  const list = getSights(state);
  const ok = list.some((s) => s.id === state.equippedSight);
  if (!ok) {
    state.equippedSight = list[0].id;
  }
  if (!state.ownedSights.includes(list[0].id)) {
    state.ownedSights.push(list[0].id);
  }
  return state;
}

export function setVisualTheme(state, themeId) {
  if (!THEME_IDS.includes(themeId)) return state;
  const next = { ...state, visualTheme: themeId };
  ensureThemeSight(next);
  ensureThemePortrait(next);
  savePlayer(next);
  return next;
}

/** Пути ассетов боя/меню для BootScene */
export function getThemeAssetPaths(themeId) {
  const theme = THEME_IDS.includes(themeId) ? themeId : 'classic';
  if (theme === 'pirate') {
    const base = 'assets/pirate';
    return {
      sea: `${base}/sea.jpg`,
      'ship-cargo': `${base}/ship-cargo.png`,
      'ship-container': `${base}/ship-container.png`,
      'ship-war': `${base}/ship-war.png`,
      'ship-sub': `${base}/ship-sub.png`,
      'ship-brig': `${base}/ship-brig.png`,
      explosion: `${base}/explosion.png`,
      torpedo: `${base}/torpedo.png`,
      cannonball: `${base}/cannonball.png`,
      shark: `${base}/shark.png`,
      'icon-anchor': `${base}/icon-anchor.png`,
      crate: `${base}/crate.png`,
      'balloon-crate': `${base}/balloon-crate.png`,
      'menu-bg': `${base}/menu-bg.jpg`,
      'btn-wood': `${base}/btn-wood.png`,
      'btn-battle': `${base}/btn-battle.png`,
      panel: `${base}/panel.png`,
      'sight-spyglass': `${base}/sight-spyglass.png`,
      'sight-wood': `${base}/sight-wood.png`,
      'sight-jolly': `${base}/sight-jolly.png`,
      'portrait-cabin': `${base}/portrait-cabin.png`,
      'portrait-pcap': `${base}/portrait-pcap.png`,
      'portrait-poff': `${base}/portrait-poff.png`,
      'portrait-pcorsair': `${base}/portrait-pcorsair.png`,
      prepared: false,
    };
  }
  return {
    sea: 'assets/sea.png',
    'ship-cargo': 'assets/ship-cargo.png',
    'ship-container': 'assets/ship-container.png',
    'ship-war': 'assets/ship-war.png',
    'ship-sub': 'assets/ship-sub.png',
    explosion: 'assets/explosion.png',
    torpedo: 'assets/torpedo.png',
    shark: 'assets/ui/shark.png',
    'icon-anchor': 'assets/ui/icon-anchor.png',
    'sight-classic': 'assets/ui/sight-classic.png',
    'sight-holo': 'assets/ui/sight-holo.png',
    'sight-brass': 'assets/ui/sight-brass.png',
    'sight-diamond': 'assets/ui/sight-diamond.png',
    'sight-minimal': 'assets/ui/sight-minimal.png',
    'portrait-default': 'assets/ui/portrait-default.png',
    'portrait-captain': 'assets/ui/portrait-captain.png',
    'portrait-officer': 'assets/ui/portrait-officer.png',
    'portrait-pirate': 'assets/ui/portrait-pirate.png',
    prepared: false,
    keyed: true,
  };
}
