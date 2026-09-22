import { getContour } from '../contour/contour.js';
import { popAdMute, pushAdMute } from '../audio/sfx.js';
import { ANCHOR_PACKS, adoptCloud, loadPlayer, onPlayerSaved, savePlayer } from '../data/playerStore.js';

const INTERSTITIAL_GAP_MS = 180 * 1000;
const REWARDED_GAP_MS = 8 * 1000;
const AD_TIMEOUT_MS = 90000;

let ysdk = null;
let payments = null;
let cloudPlayer = null;
let catalog = [];
let currencyIcon = '';
let portalLang = '';
let startupAnchors = 0;
let cloudTimer = null;
let bootDone = false;

const RU_PORTAL = new Set(['ru', 'be', 'kk', 'uk', 'uz']);
let menuReady = false;
let signaled = false;
let desiredGameplay = false;
let lastInterstitial = 0;
let lastRewarded = 0;
let bootPromise = null;

const pauseListeners = new Set();

function limit(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(src));
    document.head.appendChild(script);
  });
}

function sendGameplayStart() {
  try {
    ysdk?.features?.GameplayAPI?.start();
  } catch {
    /* площадка сама решает, готова ли сессия */
  }
  try {
    window.CrazyGames?.SDK?.game?.gameplayStart();
  } catch {
    /* вне домена CrazyGames методы кидают ошибку */
  }
}

function sendGameplayStop() {
  try {
    ysdk?.features?.GameplayAPI?.stop();
  } catch {
    /* ignore */
  }
  try {
    window.CrazyGames?.SDK?.game?.gameplayStop();
  } catch {
    /* ignore */
  }
}

function trySignalReady() {
  if (!bootDone || !menuReady || signaled) return;
  signaled = true;
  try {
    ysdk?.features?.LoadingAPI?.ready();
  } catch {
    /* ignore */
  }
  try {
    window.CrazyGames?.SDK?.game?.loadingStop();
  } catch {
    /* ignore */
  }
}

function emitPause(paused) {
  pauseListeners.forEach((fn) => {
    try {
      fn(paused);
    } catch {
      /* слушатель сцены не должен ронять SDK */
    }
  });
}

export function onPlatformPause(fn) {
  pauseListeners.add(fn);
  return () => pauseListeners.delete(fn);
}

export function gameplayStart() {
  desiredGameplay = true;
  if (!document.hidden) sendGameplayStart();
}

export function gameplayStop() {
  desiredGameplay = false;
  sendGameplayStop();
}

export function markGameReady() {
  menuReady = true;
  trySignalReady();
}

export function bootPlatform() {
  if (!bootPromise) bootPromise = boot();
  return bootPromise;
}

async function boot() {
  const contour = getContour();
  if (contour.sdk === 'crazygames') {
    try {
      await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js');
      await window.CrazyGames.SDK.init();
      window.CrazyGames.SDK.game.loadingStart();
    } catch (err) {
      console.warn('CrazyGames SDK', err);
    }
  }
  if (contour.sdk === 'yandex') {
    try {
      if (import.meta.env.DEV) {
        await limit(loadScript('https://sdk.games.s3.yandex.net/sdk.js'), 8000);
      } else {
        await limit(loadScript('/sdk.js'), 8000);
      }
      ysdk = await limit(window.YaGames.init(), 8000);
      ysdk.on?.('game_api_pause', () => emitPause(true));
      ysdk.on?.('game_api_resume', () => emitPause(false));
      portalLang = ysdk.environment?.i18n?.lang || '';
      await limit(setupYandexPlayer(), 8000);
    } catch (err) {
      console.warn('Yandex SDK', err);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (desiredGameplay) sendGameplayStop();
      emitPause(true);
    } else {
      emitPause(false);
      if (desiredGameplay) sendGameplayStart();
    }
  });

  bootDone = true;
  trySignalReady();
}

function crazyUsable() {
  try {
    const env = window.CrazyGames?.SDK?.environment;
    return env === 'local' || env === 'crazygames';
  } catch {
    return false;
  }
}

function beginAd() {
  pushAdMute();
  sendGameplayStop();
}

function endAd() {
  popAdMute();
  if (desiredGameplay && !document.hidden) sendGameplayStart();
}

function withTimeout(work, ms) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => {
      endAd();
      finish(false);
    }, ms);
    work()
      .then((value) => {
        clearTimeout(timer);
        finish(value);
      })
      .catch(() => {
        clearTimeout(timer);
        finish(false);
      });
  });
}

function mockAd(kind) {
  return new Promise((resolve) => {
    beginAd();
    const root = document.createElement('div');
    root.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'background:rgba(4,10,16,.92)',
      'color:#e8f4ff',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:16px',
      'font:600 20px Segoe UI, sans-serif',
    ].join(';');
    const title = document.createElement('div');
    title.textContent = kind === 'rewarded' ? 'Ролик (демо контура)' : 'Реклама после боя (демо)';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = kind === 'rewarded' ? 'Досмотреть' : 'Закрыть';
    ok.style.cssText = 'font:inherit;padding:10px 22px;cursor:pointer';
    const close = (value) => {
      root.remove();
      endAd();
      resolve(value);
    };
    ok.onclick = () => close(true);
    root.append(title, ok);
    if (kind === 'rewarded') {
      const fail = document.createElement('button');
      fail.type = 'button';
      fail.textContent = 'Ролик не загрузился';
      fail.style.cssText = 'font:inherit;padding:8px 18px;cursor:pointer';
      fail.onclick = () => close(false);
      root.append(fail);
    }
    document.body.append(root);
  });
}

function yandexAd(kind) {
  return new Promise((resolve) => {
    let settled = false;
    let rewarded = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      endAd();
      resolve(value);
    };
    const callbacks = {
      onOpen: () => beginAd(),
      onClose: () => finish(kind === 'rewarded' ? rewarded : true),
      onError: () => finish(false),
    };
    try {
      if (kind === 'rewarded') {
        ysdk.adv.showRewardedVideo({
          callbacks: {
            ...callbacks,
            onRewarded: () => {
              rewarded = true;
            },
          },
        });
      } else {
        ysdk.adv.showFullscreenAdv({ callbacks });
      }
    } catch {
      finish(false);
    }
  });
}

function crazyAd(kind) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      endAd();
      resolve(value);
    };
    try {
      window.CrazyGames.SDK.ad.requestAd(kind === 'rewarded' ? 'rewarded' : 'midgame', {
        adStarted: () => beginAd(),
        adFinished: () => finish(true),
        adError: () => finish(false),
      });
    } catch {
      finish(false);
    }
  });
}

async function playAd(kind) {
  const contour = getContour();
  if (!contour.ads) return false;
  if (contour.sdk === 'yandex' && ysdk?.adv) return yandexAd(kind);
  if (contour.sdk === 'crazygames' && crazyUsable()) return crazyAd(kind);
  if (import.meta.env.DEV) return mockAd(kind);
  return false;
}

/** Полноэкранная реклама только на паузе между боями. */
export function showInterstitial() {
  if (!getContour().ads) return Promise.resolve(false);
  const now = Date.now();
  if (now - lastInterstitial < INTERSTITIAL_GAP_MS) return Promise.resolve(false);
  if (now - lastRewarded < REWARDED_GAP_MS) return Promise.resolve(false);
  return withTimeout(() => playAd('midgame'), AD_TIMEOUT_MS).then((ok) => {
    lastInterstitial = Date.now();
    return ok;
  });
}

function packById(id) {
  return ANCHOR_PACKS.find((pack) => pack.id === id) || null;
}

function mapPortalLang(code) {
  const lang = String(code || '').toLowerCase().split('-')[0];
  if (lang === 'es') return 'es';
  if (RU_PORTAL.has(lang)) return 'ru';
  if (!lang) return '';
  return 'en';
}

function applyPortalLang() {
  const mapped = mapPortalLang(portalLang);
  if (!mapped) return;
  const state = loadPlayer();
  if (state.langManual || state.lang === mapped) return;
  state.lang = mapped;
  savePlayer(state);
  document.documentElement.lang = mapped;
}

async function cloudWrite(state, flush) {
  if (!cloudPlayer?.setData) return true;
  try {
    await cloudPlayer.setData(JSON.parse(JSON.stringify(state)), !!flush);
    return true;
  } catch (err) {
    console.warn('Yandex setData', err);
    return false;
  }
}

function scheduleCloud(state) {
  if (!cloudPlayer) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudWrite(state, false);
  }, 1200);
}

async function setupYandexPlayer() {
  onPlayerSaved(scheduleCloud);
  try {
    cloudPlayer = await ysdk.getPlayer({ scopes: false });
    const remote = await cloudPlayer.getData();
    adoptCloud(remote);
  } catch (err) {
    console.warn('Yandex player', err);
    cloudPlayer = null;
  }
  applyPortalLang();
  try {
    payments = await ysdk.getPayments();
    const list = await payments.getCatalog();
    catalog = Array.isArray(list) ? list : [];
    const sample = catalog.find((item) => typeof item.getPriceCurrencyImage === 'function');
    currencyIcon = sample?.getPriceCurrencyImage('small') || '';
    await settlePurchases();
  } catch (err) {
    console.warn('Yandex payments', err);
    payments = null;
  }
}

async function creditPurchase(purchase) {
  const pack = packById(purchase?.productID);
  const token = purchase?.purchaseToken;
  if (!pack || !token || !payments?.consumePurchase) return 0;
  const state = loadPlayer();
  const seen = state.yandexTokens || [];
  let granted = 0;
  if (!seen.includes(token)) {
    state.anchors = (Number(state.anchors) || 0) + pack.anchors;
    state.yandexTokens = [...seen, token].slice(-24);
    savePlayer(state);
    granted = pack.anchors;
  }
  const stored = await cloudWrite(loadPlayer(), true);
  if (!stored) return granted;
  try {
    await payments.consumePurchase(token);
  } catch (err) {
    console.warn('Yandex consume', err);
    return granted;
  }
  const after = loadPlayer();
  after.yandexTokens = (after.yandexTokens || []).filter((item) => item !== token);
  savePlayer(after);
  await cloudWrite(after, true);
  return granted;
}

async function settlePurchases() {
  if (!payments?.getPurchases) return;
  const list = await payments.getPurchases();
  if (!Array.isArray(list)) return;
  for (const purchase of list) {
    try {
      startupAnchors += await creditPurchase(purchase);
    } catch (err) {
      console.warn('Yandex purchase', err);
    }
  }
}

export function portalCurrencyIcon() {
  return currencyIcon;
}

export function yandexProduct(id) {
  return catalog.find((item) => item.id === id) || null;
}

export function takeStartupAnchors() {
  const n = startupAnchors;
  startupAnchors = 0;
  return n;
}

/** Яны списываются окном SDK. Начисление — только после оплаты, затем консумация. */
export async function purchaseProduct(id) {
  if (!payments?.purchase) throw new Error('payments');
  const purchase = await payments.purchase({ id });
  return creditPurchase(purchase);
}

/** Награда только если ролик досмотрен. Вызывать сразу из клика. */
export function showRewarded() {
  if (!getContour().ads) return Promise.resolve(false);
  return withTimeout(() => playAd('rewarded'), AD_TIMEOUT_MS).then((ok) => {
    if (ok) lastRewarded = Date.now();
    return !!ok;
  });
}
