import { getContour } from './contour.js';

const EMPTY = ['', '', ''];

/**
 * Денежные призы 1–3 места. Пока пусто: позже их отдаст БД
 * через window.SeabattlePrizes.load(contourId) или VITE_PRIZES_URL.
 * Ответ: { daily: [string, string, string], monthly: [...] }.
 */
export async function loadPrizes() {
  const contour = getContour();
  if (!contour.prizes) return { daily: [...EMPTY], monthly: [...EMPTY] };

  const bridge = window.SeabattlePrizes;
  if (typeof bridge?.load === 'function') {
    try {
      return normalize(await bridge.load(contour.id));
    } catch {
      return normalize(null);
    }
  }

  const url = import.meta.env.VITE_PRIZES_URL;
  if (url) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return normalize(null);
      return normalize(await res.json());
    } catch {
      return normalize(null);
    }
  }

  return normalize(null);
}

function normalize(data) {
  const take = (list) => EMPTY.map((_, i) => String(list?.[i] ?? '').trim());
  return {
    daily: take(data?.daily),
    monthly: take(data?.monthly),
  };
}
