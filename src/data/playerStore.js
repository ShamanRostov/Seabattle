const STORAGE_KEY = 'seabattle_player_v1';

export const LANGS = ['ru', 'en', 'es'];

export const GAME_TITLE = {
  ru: 'Морской бой',
  en: 'Sea Battle',
  es: 'Batalla Naval',
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
  sightBought: { ru: 'Прицел куплен', en: 'Sight purchased', es: 'Mira comprada' },
  sightEquipped: { ru: 'Прицел надет', en: 'Sight equipped', es: 'Mira equipada' },
  daily: { ru: 'День', en: 'Daily', es: 'Día' },
  monthly: { ru: 'Месяц', en: 'Monthly', es: 'Mes' },
  language: { ru: 'Язык', en: 'Language', es: 'Idioma' },
  sound: { ru: 'Звук', en: 'Sound', es: 'Sonido' },
  on: { ru: 'ВКЛ', en: 'ON', es: 'SÍ' },
  off: { ru: 'ВЫКЛ', en: 'OFF', es: 'NO' },
  you: { ru: 'Вы', en: 'You', es: 'Tú' },
  runScore: { ru: 'Бой', en: 'Run', es: 'Partida' },
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
};

export const PORTRAITS = [
  {
    id: 'default',
    name: { ru: 'Юнга', en: 'Cadet', es: 'Grumete' },
    price: 0,
    texture: 'portrait-default',
  },
  {
    id: 'captain',
    name: { ru: 'Капитан', en: 'Captain', es: 'Capitán' },
    price: 120,
    texture: 'portrait-captain',
  },
  {
    id: 'officer',
    name: { ru: 'Офицер', en: 'Officer', es: 'Oficial' },
    price: 150,
    texture: 'portrait-officer',
  },
  {
    id: 'pirate',
    name: { ru: 'Корсар', en: 'Corsair', es: 'Corsario' },
    price: 180,
    texture: 'portrait-pirate',
  },
];

export const SIGHTS = [
  {
    id: 'classic',
    name: { ru: 'Классика', en: 'Classic', es: 'Clásica' },
    price: 0,
    texture: 'sight-classic',
  },
  {
    id: 'holo',
    name: { ru: 'Голограф', en: 'Holo', es: 'Holo' },
    price: 40,
    texture: 'sight-holo',
  },
  {
    id: 'brass',
    name: { ru: 'Латунь', en: 'Brass', es: 'Latón' },
    price: 60,
    texture: 'sight-brass',
  },
  {
    id: 'diamond',
    name: { ru: 'Ромб', en: 'Diamond', es: 'Rombo' },
    price: 80,
    texture: 'sight-diamond',
  },
  {
    id: 'minimal',
    name: { ru: 'Минимал', en: 'Minimal', es: 'Minimal' },
    price: 50,
    texture: 'sight-minimal',
  },
];

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

const defaultState = () => ({
  name: '',
  nameSetFree: false,
  anchors: 80,
  careerScore: 0,
  equippedSight: 'classic',
  ownedSights: ['classic'],
  equippedPortrait: 'default',
  ownedPortraits: ['default'],
  soundOn: true,
  lang: 'ru',
  daily: {}, // { 'YYYY-MM-DD': bestScoreThatDay }
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
    .reduce((sum, [, best]) => sum + (Number(best) || 0), 0);
}

export function getDailyScore(state, day = todayKey()) {
  return state.daily?.[day] || 0;
}

export function loadPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = { ...defaultState(), ...JSON.parse(raw) };
    if (!LANGS.includes(parsed.lang)) parsed.lang = 'ru';
    if (!Array.isArray(parsed.ownedPortraits) || !parsed.ownedPortraits.length) {
      parsed.ownedPortraits = ['default'];
    }
    if (!parsed.equippedPortrait) parsed.equippedPortrait = 'default';
    if (!Array.isArray(parsed.ownedSights) || !parsed.ownedSights.length) {
      parsed.ownedSights = ['classic'];
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

export function savePlayer(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

export function submitRunScore(state, score) {
  const next = { ...state };
  next.careerScore = (next.careerScore || 0) + score;
  const d = todayKey();
  // день — только лучший результат
  next.daily = { ...next.daily, [d]: Math.max(next.daily?.[d] || 0, score) };
  // якоря за бой: 1 за каждые 200 очков
  const earned = Math.floor(score / 200);
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

export function buildLeaderboard(state, mode = 'daily') {
  const bots = [
    { name: 'Neptun', daily: 420, monthly: 3100 },
    { name: 'Sever', daily: 880, monthly: 5400 },
    { name: 'Orion', daily: 150, monthly: 1200 },
    { name: 'Volk', daily: 1200, monthly: 8900 },
    { name: 'Baltika', daily: 640, monthly: 4100 },
    { name: 'Tuman', daily: 300, monthly: 2200 },
    { name: 'Skat', daily: 990, monthly: 7000 },
  ];
  const meName = state.name || t(state, 'you');
  const myScore = mode === 'daily' ? getDailyScore(state) : getMonthlyScore(state);

  const rows = bots.map((b) => ({
    name: b.name,
    score: mode === 'daily' ? b.daily : b.monthly,
    me: false,
  }));
  rows.push({ name: meName, score: myScore, me: true });
  rows.sort((a, b) => b.score - a.score);
  return rows.map((r, i) => ({ ...r, place: i + 1 }));
}

/** t(state, key) или t(state, {ru,en,es}) */
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
  return PORTRAITS.find((p) => p.id === state.equippedPortrait) || PORTRAITS[0];
}
