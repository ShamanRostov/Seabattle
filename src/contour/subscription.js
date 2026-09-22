import { getContour } from './contour.js';

/**
 * Подписка оператора.
 * Боевого публичного SDK у Билайна и МегаФона нет: ждём мост страницы
 * window.SeabattleOperator.checkSubscription / subscribe
 * или URL в VITE_SUBSCRIPTION_URL / VITE_SUBSCRIBE_URL.
 * В dev без моста: ?sub=1 открывает игру, ?sub=0 держит стену.
 */

export async function checkSubscription() {
  const contour = getContour();
  if (!contour.subscription) return { active: true };

  const bridge = window.SeabattleOperator;
  if (typeof bridge?.checkSubscription === 'function') {
    try {
      const result = await bridge.checkSubscription(contour.id);
      return { active: !!(result?.active ?? result?.subscribed) };
    } catch {
      return { active: false };
    }
  }

  const url = import.meta.env.VITE_SUBSCRIPTION_URL;
  if (url) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return { active: false };
      const data = await res.json();
      return { active: !!(data.active ?? data.subscribed) };
    } catch {
      return { active: false };
    }
  }

  if (import.meta.env.DEV) {
    const q = new URLSearchParams(window.location.search).get('sub');
    if (q === '0') return { active: false };
    if (q === '1') return { active: true };
    return { active: localStorage.getItem(storageKey(contour.id)) === '1' };
  }

  return { active: false };
}

export async function requestSubscribe() {
  const contour = getContour();
  const bridge = window.SeabattleOperator;
  if (typeof bridge?.subscribe === 'function') {
    try {
      const result = await bridge.subscribe(contour.id);
      return { active: !!(result?.active ?? result?.subscribed) };
    } catch {
      return { active: false };
    }
  }

  const url = import.meta.env.VITE_SUBSCRIBE_URL;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { active: false };
  }

  if (import.meta.env.DEV) {
    localStorage.setItem(storageKey(contour.id), '1');
    return { active: true };
  }

  return { active: false };
}

function storageKey(id) {
  return `seabattle_sub_${id}`;
}
