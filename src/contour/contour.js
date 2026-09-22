import { GAME_TITLE } from '../data/playerStore.js';

/**
 * Контур сборки.
 * local — обычная разработка, без подписки и рекламы.
 * beeline / megafon — подписка и денежные призы.
 * yandex / crazygames — реклама площадки, без денежных призов.
 *
 * В dev контур можно переключить: ?contour=beeline|megafon|yandex|crazygames
 * В production query игнорируется.
 */

const ALIAS = {
  crazy: 'crazygames',
  'crazy-games': 'crazygames',
  megafontj: 'megafon',
};

export const CONTOURS = {
  local: {
    id: 'local',
    ads: false,
    subscription: false,
    prizes: false,
    mobile: false,
    sdk: null,
  },
  beeline: {
    id: 'beeline',
    ads: false,
    subscription: true,
    prizes: true,
    mobile: true,
    sdk: null,
  },
  megafon: {
    id: 'megafon',
    ads: false,
    subscription: true,
    prizes: true,
    mobile: true,
    sdk: null,
  },
  yandex: {
    id: 'yandex',
    ads: true,
    subscription: false,
    prizes: false,
    mobile: false,
    sdk: 'yandex',
  },
  crazygames: {
    id: 'crazygames',
    ads: true,
    subscription: false,
    prizes: false,
    mobile: false,
    sdk: 'crazygames',
  },
};

const OPERATORS = {
  beeline: { ru: 'Билайн', en: 'Beeline', es: 'Beeline' },
  megafon: {
    ru: 'МегаФон Таджикистан',
    en: 'MegaFon Tajikistan',
    es: 'MegaFon Tayikistán',
  },
};

function builtContour() {
  return typeof __SEABATTLE_CONTOUR__ === 'string' ? __SEABATTLE_CONTOUR__ : '';
}

export function getContour() {
  let id = builtContour() || import.meta.env.VITE_CONTOUR || 'local';
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('contour');
    if (q) id = ALIAS[q] || q;
  }
  return CONTOURS[id] || CONTOURS.local;
}

export function contourTitle(lang) {
  return GAME_TITLE[lang] || GAME_TITLE.ru;
}

export function operatorName(lang) {
  const pack = OPERATORS[getContour().id];
  if (!pack) return '';
  return pack[lang] || pack.ru;
}
