/* auth.js — TripTych 登入 + 歡迎頁 + 躍遷轉場
 *
 * 登入策略：Popup 優先；遇到 popup 被擋 / 環境不支援時自動退回 Redirect（跳轉前 0.4s 短動畫）。
 * 唯一真相來源是 onAuthStateChanged：不論 Popup 成功、Redirect 返回、或逾時後才成功，
 * 只要「確認登入成功」才會播放躍遷，登入失敗/取消絕不會提前進入地圖。
 *
 * 對 app.js 的介面：
 *   registerAppLoader(async (user) => {...})  地圖/資料初始化；躍遷會等它完成（最多 10 秒）
 *   authReady                                 Promise<{app, auth} | null>，Firestore 請用同一個 app
 *   onUser(cb)                                登入狀態變化（含 null）
 *   signOutUser() / openLogin() / getUser()
 */

const FIREBASE_VER = '10.12.2'; // ← 請與 app.js 目前使用的 Firebase CDN 版本一致
const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VER}/`;

const REDIRECT_FLAG = 'tp_auth_redirect';
const GUEST_FLAG = 'tp_guest';
const POPUP_TIMEOUT = 90000;
const REDIRECT_RETURN_TIMEOUT = 12000;
const LOADER_TIMEOUT = 10000;

/* ───────── 小工具 ───────── */
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timeout')), ms))]);
const store = {
  get(k) { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} try { localStorage.setItem(k, v); } catch (_) {} },
  del(k) { try { sessionStorage.removeItem(k); } catch (_) {} try { localStorage.removeItem(k); } catch (_) {} }
};
const ungate = () => document.documentElement.classList.remove('tp-gate');

/* ───────── 狀態 ───────── */
const S = { BOOT: 0, WELCOME: 1, PENDING: 2, ARRIVING: 3, APP: 4 };
let state = S.BOOT;
let fb = null;                 // 動態載入的 firebase 模組函式
export let app = null;
export let auth = null;
let resolveAuthReady;
export const authReady = new Promise((r) => { resolveAuthReady = r; });

let appLoader = async () => {};
export const registerAppLoader = (fn) => { appLoader = fn; };

const listeners = new Set();
let currentUser = null, authKnown = false;
export const getUser = () => currentUser;
export function onUser(cb) {
  listeners.add(cb);
  if (authKnown) { try { cb(currentUser); } catch (e) { console.error(e); } }
  return () => listeners.delete(cb);
}

let earth = null, welcomeToken = 0, busy = false;
let pendingTimer = 0, redirectTimer = 0, returnedFromRedirect = false;

/* ───────── 歡迎頁 UI ───────── */
function setMsg(t) { const m = $('welcome-msg'); if (m) m.textContent = t || ''; }
function showSecondary({ redirect = false, skip = false } = {}) {
  const r = $('btn-redirect'), s = $('btn-skip');
  if (r) r.hidden = !redirect;
  if (s) s.hidden = !skip;
}
function setBusy(on) {
  busy = on;
  const b = $('btn-google');
  if (b) {
    b.classList.toggle('is-pending', on);
    b.setAttribute('aria-busy', on ? 'true' : 'false');
    const l = b.querySelector('.lbl'); if (l) l.textContent = on ? '登入中…' : '使用 Google 登入';
  }
  earth?.setPending(on);
  if (!on) { clearTimeout(pendingTimer); if (state === S.PENDING) state = S.WELCOME; }
  else if (state === S.WELCOME) state = S.PENDING;
}
function setAppInert(on) {
  for (const sel of ['header.top', 'main', '#drawer', '#scrim']) {
    const el = document.querySelector(sel);
    if (!el) continue;
    el.toggleAttribute('inert', on);
    on ? el.setAttribute('aria-hidden', 'true') : el.removeAttribute('aria-hidden');
  }
}
function notice(text) {
  const n = document.createElement('div');
  n.className = 'tp-notice'; n.setAttribute('role', 'status'); n.textContent = text;
  document.body.appendChild(n);
  requestAnimationFrame(() => n.classList.add('on'));
  setTimeout(() => { n.classList.remove('on'); setTimeout(() => n.remove(), 400); }, 4200);
}

function mountCanvas() {
  const el = $('welcome');
  el.querySelector('#earth-canvas')?.remove();
  const c = document.createElement('canvas');
  c.id = 'earth-canvas'; c.setAttribute('aria-hidden', 'true');
  el.insertBefore(c, el.querySelector('.welcome-ui'));
  return c;
}

async function showWelcome({ pending = false, fade = false } = {}) {
  const el = $('welcome');
  if (!el) { ungate(); return; }
  const token = ++welcomeToken;
  state = pending ? S.PENDING : S.WELCOME;
  setAppInert(true);
  el.className = 'welcome' + (fade ? '' : ' instant');
  el.hidden = false;
  setMsg(''); showSecondary();
  busy = false; setBusy(pending);
  const canvas = mountCanvas();
  void el.offsetWidth;
  el.classList.add('on');
  ungate();                               // 歡迎頁已不透明覆蓋，可安全拿掉 gate
  if (!fade) requestAnimationFrame(() => el.classList.remove('instant'));

  try {
    const mod = await import('./earth.js');
    const e = await mod.createEarth(canvas, {
      onLayout: ({ cy, r }) => { el.style.setProperty('--globe-cy', cy + 'px'); el.style.setProperty('--globe-r', r + 'px'); },
      onContextLost: () => { if (earth) { earth.dispose(); earth = null; } el.classList.remove('gl'); el.classList.add('nogl'); }
    });
    if (token !== welcomeToken || (state !== S.WELCOME && state !== S.PENDING)) { e.dispose(); return; }
    earth = e; earth.setPending(busy);
    el.classList.add('gl');
  } catch (err) {
    console.warn('[TripTych] 3D 地球無法載入，改用靜態地球', err);
    if (token === welcomeToken) el.classList.add('nogl');
  }
}

function teardownWelcome() {
  const el = $('welcome');
  earth?.dispose(); earth = null;
  welcomeToken++;
  if (el) {
    el.querySelector('#earth-canvas')?.remove();
    el.hidden = true; el.className = 'welcome';
  }
  setBusy(false); setMsg(''); showSecondary();
}

/* ───────── 登入流程 ───────── */
const provider = () => {
  const p = new fb.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

function onGoogleClick() {
  if (busy || !auth || state === S.ARRIVING) return;
  if (!navigator.onLine) { setMsg('目前沒有網路連線，請連線後再試。'); showSecondary({ skip: true }); return; }
  setBusy(true); setMsg(''); showSecondary();
  let p;
  try { p = fb.signInWithPopup(auth, provider()); }   // 必須在點擊的同一個同步呼叫中開啟（iOS 限制）
  catch (e) { handleAuthError(e); return; }
  pendingTimer = setTimeout(() => {
    if (state === S.PENDING) {
      setBusy(false);
      setMsg('登入逾時，請再試一次。');
      showSecondary({ redirect: true });
    }
  }, POPUP_TIMEOUT);
  p.catch(handleAuthError); // 成功時由 onAuthStateChanged 接手
}

async function startRedirect() {
  setBusy(true); setMsg(''); showSecondary();
  store.set(REDIRECT_FLAG, String(Date.now()));
  try {
    if (earth && !reduced()) await earth.preWarp(400); else await sleep(reduced() ? 0 : 150);
    await fb.signInWithRedirect(auth, provider());   // 頁面將跳轉
  } catch (e) {
    store.del(REDIRECT_FLAG);
    handleAuthError(e, true);
  }
}

const CANCEL = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];
const FALLBACK = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'];
const MESSAGES = {
  'auth/network-request-failed': '網路不穩，請稍後再試。',
  'auth/unauthorized-domain': '此網址尚未加入 Firebase 的授權網域。',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試。',
  'auth/account-exists-with-different-credential': '此 Email 已用其他登入方式註冊。'
};

function handleAuthError(e, fromRedirect = false) {
  const code = (e && e.code) || '';
  if (state === S.ARRIVING || state === S.APP) return;
  if (CANCEL.includes(code)) { setBusy(false); return; }
  if (!fromRedirect && FALLBACK.includes(code)) { startRedirect(); return; }
  console.error('[TripTych] 登入失敗', e);
  setBusy(false);
  setMsg(MESSAGES[code] || `登入失敗，請再試一次。（${code || 'unknown'}）`);
  showSecondary({ redirect: !fromRedirect && code !== 'auth/unauthorized-domain', skip: code === 'auth/network-request-failed' });
}

/* ───────── 轉場：躍遷 → 等地圖就緒 → 揭曉 ───────── */
async function transitionIn(user, { warp = true } = {}) {
  if (state === S.ARRIVING) return;
  state = S.ARRIVING;
  clearTimeout(pendingTimer); clearTimeout(redirectTimer);
  const el = $('welcome');
  setMsg(''); showSecondary();
  if (user) { const l = $('btn-google')?.querySelector('.lbl'); if (l) l.textContent = '登入成功'; }

  // 與動畫並行：地圖 / 資料初始化（永不 reject，失敗以回傳值表示）
  const loading = withTimeout(Promise.resolve().then(() => appLoader(user)), LOADER_TIMEOUT, 'app-loader')
    .then(() => null, (e) => e);

  el.classList.add('arriving');
  let animated = false;
  if (warp && earth && !reduced()) {
    try {
      const ok = await earth.warp({
        duration: 1700,
        on: { streaks: () => el.classList.add('streaks'), veil: () => el.classList.add('veiling') }
      });
      animated = ok !== false;
    } catch (e) { console.warn('[TripTych] 躍遷動畫失敗，改用淡入', e); }
  }
  if (!animated) { el.classList.add('veiling'); await sleep(reduced() ? 200 : 450); }

  // 動畫已結束但資料還沒好：顯示低調的等待指示
  const waitTimer = setTimeout(() => el.classList.add('waiting'), 700);
  const loadErr = await loading;
  clearTimeout(waitTimer);

  // 揭曉：先讓 app 可互動，再淡出整個歡迎層
  setAppInert(false);
  el.classList.add('revealing');
  await sleep(reduced() ? 220 : 650);
  teardownWelcome();
  state = S.APP;

  if (loadErr) {
    console.warn('[TripTych] 地圖/資料初始化未完成', loadErr);
    notice('資料載入較慢或失敗，可稍後下拉重新整理。');
    window.dispatchEvent(new CustomEvent('triptych:load-error', { detail: { error: loadErr } }));
  }
}

function enterDirect(user) {          // 已登入使用者重開 App：不播動畫，直接進地圖
  state = S.APP;
  setAppInert(false);
  ungate();
  Promise.resolve().then(() => appLoader(user)).catch((e) => {
    console.warn(e); notice('資料載入失敗，可稍後重新整理。');
  });
}

function enterGuest() {
  store.set(GUEST_FLAG, '1');
  if (state === S.WELCOME || state === S.PENDING) transitionIn(null, { warp: false });
  else { enterDirect(null); }
}

/* ───────── 登入狀態 ───────── */
function onAuthState(user) {
  currentUser = user; authKnown = true;
  listeners.forEach((cb) => { try { cb(user); } catch (e) { console.error(e); } });

  if (user) {
    clearTimeout(redirectTimer);
    store.del(REDIRECT_FLAG); store.del(GUEST_FLAG);
    if (state === S.ARRIVING) return;
    if (state === S.WELCOME || state === S.PENDING) transitionIn(user);       // 剛完成登入 → 躍遷
    else if (state === S.BOOT) enterDirect(user);                             // 已登入 → 直接進入
    return;                                                                   // APP：token 更新，略過
  }

  // 未登入
  if (state === S.PENDING && returnedFromRedirect) {                          // Redirect 返回但沒有登入結果
    returnedFromRedirect = false; clearTimeout(redirectTimer);
    setBusy(false);
    setMsg('登入未完成，請再試一次。');
    showSecondary({ redirect: false, skip: true });
    return;
  }
  if (state === S.BOOT) {
    if (store.get(GUEST_FLAG)) enterDirect(null);
    else showWelcome();
  } else if (state === S.APP) {
    store.del(GUEST_FLAG);
    showWelcome({ fade: true });                                              // 登出 → 回到歡迎頁
  }
}

export async function signOutUser() { if (auth && fb) await fb.signOut(auth); else { store.del(GUEST_FLAG); } }
export function openLogin() { if (state === S.APP && !currentUser) { store.del(GUEST_FLAG); showWelcome({ fade: true }); } }

/* ───────── 初始化 ───────── */
async function initFirebase() {
  const [appMod, authMod, cfg] = await Promise.all([
    import(CDN + 'firebase-app.js'),
    import(CDN + 'firebase-auth.js'),
    import('./firebase-config.js')
  ]);
  fb = { ...authMod };
  app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg.firebaseConfig);
  auth = authMod.getAuth(app);
  try { await authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (_) {}
  resolveAuthReady({ app, auth });
}

function bindUI() {   // 只註冊一次
  $('btn-google')?.addEventListener('click', onGoogleClick);
  $('btn-redirect')?.addEventListener('click', () => { if (!busy && auth) startRedirect(); });
  $('btn-skip')?.addEventListener('click', enterGuest);
}

async function init() {
  if (!$('welcome')) { console.warn('[TripTych] 找不到 #welcome，略過歡迎頁'); ungate(); resolveAuthReady(null); return; }
  bindUI();

  const t = Number(store.get(REDIRECT_FLAG) || 0);
  returnedFromRedirect = !!t && Date.now() - t < 10 * 60 * 1000;
  if (!returnedFromRedirect) store.del(REDIRECT_FLAG);

  try { await initFirebase(); }
  catch (e) {
    console.error('[TripTych] Firebase 載入失敗', e);
    resolveAuthReady(null);
    if (store.get(GUEST_FLAG)) { enterDirect(null); return; }
    await showWelcome();
    setMsg('目前無法連線到登入服務。'); showSecondary({ skip: true });
    return;
  }

  if (returnedFromRedirect) {
    showWelcome({ pending: true });
    redirectTimer = setTimeout(() => {
      if (state === S.PENDING) {
        returnedFromRedirect = false; setBusy(false);
        setMsg('登入未完成，請再試一次。'); showSecondary({ skip: true });
      }
    }, REDIRECT_RETURN_TIMEOUT);
    try { await fb.getRedirectResult(auth); } catch (e) { handleAuthError(e, true); }
  }
  fb.onAuthStateChanged(auth, onAuthState, (e) => console.error('[TripTych] auth observer', e));
}

init().catch((e) => { console.error(e); ungate(); });
