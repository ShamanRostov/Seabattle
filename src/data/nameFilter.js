/**
 * Фильтр имён: нормализация омоглифов / leetspeak / смеси алфавитов,
 * затем поиск запрещённых корней (RU / EN / ES).
 */

const HOMOGLYPHS = {
  // Latin lookalikes → latin
  а: 'a',
  А: 'a',
  е: 'e',
  Е: 'e',
  ё: 'e',
  Ё: 'e',
  о: 'o',
  О: 'o',
  р: 'p',
  Р: 'p',
  с: 'c',
  С: 'c',
  у: 'y',
  У: 'y',
  х: 'x',
  Х: 'x',
  к: 'k',
  К: 'k',
  м: 'm',
  М: 'm',
  н: 'h',
  Н: 'h',
  в: 'b',
  В: 'b',
  т: 't',
  Т: 't',
  і: 'i',
  І: 'i',
  ї: 'i',
  Ї: 'i',
  ѡ: 'w',
  // Greek / special
  α: 'a',
  ε: 'e',
  ο: 'o',
  ρ: 'p',
  τ: 't',
  υ: 'y',
  χ: 'x',
  κ: 'k',
  η: 'n',
  ν: 'v',
  ι: 'i',
  // Fullwidth / fancy (unicode escapes)
  '\uFF41': 'a',
  '\uFF45': 'e',
  '\uFF4F': 'o',
  '\uFF49': 'i',
  '\uFF53': 's',
  '\uFF10': '0',
  '\uFF11': '1',
  '\uFF13': '3',
  '\uFF14': '4',
  '\uFF15': '5',
  '\uFF04': 's',
  '\uFF20': 'a',
};

const LEET = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
  '€': 'e',
  '£': 'e',
  '¥': 'y',
};

/** Корни после нормализации к латинице + отдельно кириллические формы */
const BLOCK_LATIN = [
  // EN
  'fuck',
  'fuk',
  'fck',
  'fucker',
  'motherfuck',
  'shit',
  'sh1t',
  'bitch',
  'btch',
  'asshole',
  'a55hole',
  'bastard',
  'cunt',
  'dick',
  'd1ck',
  'cock',
  'pussy',
  'nigger',
  'nigga',
  'nazi',
  'hitler',
  'retard',
  'whore',
  'slut',
  'faggot',
  'fag',
  'pedo',
  'paedo',
  // ES
  'puta',
  'puto',
  'mierda',
  'cabron',
  'cabrón',
  'pendejo',
  'pendeja',
  'coño',
  'cono',
  'joder',
  'maricón',
  'maricon',
  'gilipollas',
  'hijodeputa',
  'hijoputa',
  // RU translit / mixed
  'blyat',
  'blat',
  'blyad',
  'suka',
  'suca',
  'cyka',
  'pidor',
  'pidar',
  'pizda',
  'pizd',
  'huy',
  'hui',
  'xyu',
  'xui',
  'xuy',
  'xyi',
  'ebat',
  'yebat',
  'eblan',
  'mudak',
  'mudac',
  'govno',
  'gavno',
  'debil',
  'idiot',
  'shalava',
  'shalava',
  'zhopa',
  'jopa',
  'chmo',
  'chert',
  'uelban',
  'ueban',
  'pedik',
  'pederast',
];

const BLOCK_CYR = [
  'бля',
  'блят',
  'блять',
  'бляд',
  'сука',
  'сучк',
  'пидор',
  'пидар',
  'педик',
  'пидр',
  'хуй',
  'хуя',
  'хуе',
  'хуё',
  'хер',
  'пизд',
  'ебал',
  'ебан',
  'ёбан',
  'ебат',
  'ёбат',
  'ебл',
  'мудак',
  'мудил',
  'гандон',
  'гондон',
  'долбо',
  'далбо',
  'дебил',
  'идиот',
  'мраз',
  'тварь',
  'падл',
  'шлюх',
  'шалав',
  'жоп',
  'срать',
  'срал',
  'говн',
  'дерьм',
  'чмо',
  'уеб',
  'уёб',
  'залуп',
  'минет',
  'соси',
  'выеб',
  'нахуй',
  'нахер',
  'похуй',
  'похер',
  'охуе',
  'охуи',
  'ахуе',
  'ахуи',
  'ебал',
  'выебан',
  'заеб',
  'заёб',
  'отъеб',
  'отъёб',
  'разъеб',
  'разъёб',
  'проеб',
  'проёб',
  'сволоч',
  'ублюд',
  'вырод',
  'гнид',
  'фашист',
  'нацист',
  'гитлер',
];

function mapChar(ch) {
  if (HOMOGLYPHS[ch] != null) return HOMOGLYPHS[ch];
  const lower = ch.toLowerCase();
  if (HOMOGLYPHS[lower] != null) return HOMOGLYPHS[lower];
  if (LEET[ch] != null) return LEET[ch];
  return lower;
}

/** Убрать разделители и схлопнуть повторы: f.u_u_c_k → fuck, suuuuka → suka */
export function normalizeNameKey(raw) {
  let out = '';
  const s = String(raw || '');
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    // пропускаем пробелы, пунктуацию, zero-width, combining marks
    if (/[\s\u200B-\u200D\uFEFF\u00AD._\-*/\\|~`'"«»„“”()[\]{}<>^=,]/.test(ch)) continue;
    if (/\p{M}/u.test(ch)) continue;
    out += mapChar(ch);
  }
  // схлопнуть 3+ одинаковых подряд → 2 (suuuka → suuka, потом словари ловят suka через contains с вариантами)
  out = out.replace(/(.)\1{2,}/g, '$1$1');
  return out;
}

/** Кириллическая нормализация без маппинга в латиницу */
export function normalizeCyrKey(raw) {
  let out = '';
  const s = String(raw || '').toLowerCase().replace(/ё/g, 'е');
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (/[\s\u200B-\u200D\uFEFF\u00AD._\-*/\\|~`'"«»„“”()[\]{}<>^=,0-9@!$+]/.test(ch)) continue;
    if (/\p{M}/u.test(ch)) continue;
    // латинские «похожие» → кириллица для смешанного набора
    const latToCyr = {
      a: 'а',
      e: 'е',
      o: 'о',
      p: 'р',
      c: 'с',
      y: 'у',
      x: 'х',
      k: 'к',
      m: 'м',
      h: 'н',
      b: 'в',
      t: 'т',
      i: 'и',
    };
    out += latToCyr[ch] || ch;
  }
  out = out.replace(/(.)\1{2,}/g, '$1$1');
  return out;
}

function containsBlocked(haystack, words) {
  for (const w of words) {
    if (!w) continue;
    if (haystack.includes(w)) return w;
  }
  return null;
}

/**
 * @returns {{ ok: true } | { ok: false, reason: 'empty' | 'profanity' | 'too_short' | 'too_long' | 'bad_chars' }}
 */
export function validatePlayerName(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.length < 2) return { ok: false, reason: 'too_short' };
  if (trimmed.length > 16) return { ok: false, reason: 'too_long' };

  const latinKey = normalizeNameKey(trimmed);
  const cyrKey = normalizeCyrKey(trimmed);
  const latinLoose = latinKey.replace(/(.)\1+/g, '$1');
  const cyrLoose = cyrKey.replace(/(.)\1+/g, '$1');

  const hit =
    containsBlocked(latinKey, BLOCK_LATIN) ||
    containsBlocked(latinLoose, BLOCK_LATIN) ||
    containsBlocked(cyrKey, BLOCK_CYR) ||
    containsBlocked(cyrLoose, BLOCK_CYR);

  if (hit) return { ok: false, reason: 'profanity' };

  // видимое имя — только буквы/цифры/пробел/дефис/подчёркивание
  if (!/^[\p{L}\p{N} _\-]+$/u.test(trimmed)) {
    return { ok: false, reason: 'bad_chars' };
  }

  return { ok: true };
}
