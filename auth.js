/* auth.js — TripTych 登入 + 歡迎頁 + 轉場（v2：移除地球與 Redirect）
 *
 * 為什麼不再用 signInWithRedirect：
 *   網站在 github.io，Firebase 驗證網域是 xxx.firebaseapp.com（跨網域）。Safari / 無痕 / PWA 會分隔儲存空間，
 *   Redirect 返回時找不到「initial state」→ 就是你看到的 "missing initial state" 錯誤。這個環境下 Redirect 不可能穩定，所以整條路徑移除。
 *
 * 登入方式（依序）：
 *   1) 若 firebase-config.js 有 export const googleClientId = "xxx.apps.googleusercontent.com"
 *      → 使用 Google Identity Services 彈窗取得 token，再 signInWithCredential（不依賴 Firebase 的 authDomain，Safari/無痕最穩）
 *   2) 否則 → Firebase signInWithPopup
 *   兩者都強制 prompt=select_account，一定會出現帳號選擇器。
 *
 * 對 app.js 的介面：
 *   registerAppLoader(async (user) => {...})  地圖/資料初始化；轉場會等它完成（最多 10 秒）
 *   authReady                                 Promise<{app, auth} | null>
 *   onUser(cb) / signOutUser() / openLogin() / getUser()
 */

const FIREBASE_VER = '10.12.2'; // ← 必須與 app.js 使用的 Firebase CDN 版本一致
const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VER}/`;
const GUEST_FLAG = 'tp_guest';
const POPUP_TIMEOUT = 90000;
const LOADER_TIMEOUT = 10000;

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
let fb = null, tokenClient = null, busy = false, pendingTimer = 0;
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

/* ───────── 歡迎頁 UI ───────── */
function setMsg(t) { const m = $('welcome-msg'); if (m) m.textContent = t || ''; }
function setLabel(t) { const l = $('btn-google')?.querySelector('.lbl'); if (l) l.textContent = t; }
function showSkip(on) { const s = $('btn-skip'); if (s) s.hidden = !on; }
function setBusy(on) {
  busy = on;
  const b = $('btn-google');
  if (b) { b.classList.toggle('is-pending', on); b.setAttribute('aria-busy', on ? 'true' : 'false'); }
  if (state !== S.ARRIVING) setLabel(on ? '登入中…' : '使用 Google 登入');
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

function showWelcome({ fade = false } = {}) {
  const el = $('welcome');
  if (!el) { ungate(); return; }
  state = S.WELCOME;
  setAppInert(true);
  el.className = 'welcome' + (fade ? '' : ' instant');
  el.hidden = false;
  setMsg(''); showSkip(false);
  busy = false; setBusy(false);
  void el.offsetWidth;
  el.classList.add('on');
  ungate();                                   // 歡迎頁已不透明覆蓋，可拿掉 gate
  if (!fade) requestAnimationFrame(() => el.classList.remove('instant'));
}

function teardownWelcome() {
  const el = $('welcome');
  if (el) { el.hidden = true; el.className = 'welcome'; }
  setBusy(false); setMsg(''); showSkip(false);
}

/* ───────── 登入 ───────── */
const googleProvider = () => {
  const p = new fb.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

function startPendingTimer() {
  pendingTimer = setTimeout(() => {
    if (state === S.PENDING) { setBusy(false); setMsg('登入逾時，請再試一次。'); }
  }, POPUP_TIMEOUT);
}

function onGoogleClick() {
  if (busy || !auth || state === S.ARRIVING) return;
  if (!navigator.onLine) { setMsg('目前沒有網路連線，請連線後再試。'); showSkip(true); return; }
  setBusy(true); setMsg('');
  // 注意：以下彈窗必須在點擊事件的同一個同步呼叫中開啟（iOS 限制），所以這裡不能有 await
  try {
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'select_account' });
    else fb.signInWithPopup(auth, googleProvider()).catch(handleAuthError);
  } catch (e) { handleAuthError(e); return; }
  startPendingTimer();                         // 成功時由 onAuthStateChanged 接手
}

const CANCEL = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];
const ENV_BLOCKED = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'];
const MESSAGES = {
  'auth/network-request-failed': '網路不穩，請稍後再試。',
  'auth/unauthorized-domain': '此網址尚未加入 Firebase 的授權網域。',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試。',
  'auth/account-exists-with-different-credential': '此 Email 已用其他登入方式註冊。'
};

function handleAuthError(e) {
  const code = (e && e.code) || '';
  if (state === S.ARRIVING || state === S.APP) return;
  if (CANCEL.includes(code)) { setBusy(false); return; }
  console.error('[TripTych] 登入失敗', e);
  setBusy(false);
  if (ENV_BLOCKED.includes(code)) setMsg('此瀏覽器環境（例如無痕模式或擋彈出視窗）無法開啟登入視窗，請改用一般模式或允許彈出視窗。');
  else setMsg(MESSAGES[code] || `登入失敗，請再試一次。（${code || 'unknown'}）`);
  showSkip(code === 'auth/network-request-failed');
}

/* Google Identity Services（token 模式）：不依賴 Firebase authDomain，Safari / 無痕 / PWA 最穩 */
function loadGis() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('gis load failed'));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('gis timeout')), 8000);
  });
}
async function initGis(clientId) {
  await loadGis();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'openid email profile',
    prompt: 'select_account',
    callback: (resp) => {
      if (resp.error || !resp.access_token) return handleAuthError({ code: resp.error || 'gis/no-token' });
      const cred = fb.GoogleAuthProvider.credential(null, resp.access_token);
      fb.signInWithCredential(auth, cred).catch(handleAuthError);
    },
    error_callback: (err) => {
      if (err?.type === 'popup_closed') return handleAuthError({ code: 'auth/popup-closed-by-user' });
      if (err?.type === 'popup_failed_to_open') return handleAuthError({ code: 'auth/popup-blocked' });
      handleAuthError({ code: 'gis/' + (err?.type || 'unknown') });
    }
  });
}

/* ───────── 轉場：按鈕確認 → 等地圖就緒 → 光圈收合揭曉 ───────── */
async function transitionIn(user) {
  if (state === S.ARRIVING) return;
  state = S.ARRIVING;
  clearTimeout(pendingTimer);
  const el = $('welcome'), btn = $('btn-google');
  setMsg(''); showSkip(false);
  el.classList.add('arriving');
  btn?.classList.remove('is-pending');
  setLabel(user ? '登入成功' : '進入中…');

  // 光圈收合的圓心 = 按鈕中心
  const r = btn?.getBoundingClientRect();
  const ox = r ? r.left + r.width / 2 : innerWidth / 2, oy = r ? r.top + r.height / 2 : innerHeight * 0.7;
  el.style.setProperty('--ox', ox + 'px'); el.style.setProperty('--oy', oy + 'px');
  el.style.setProperty('--R', Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) + 8 + 'px');

  const loading = withTimeout(Promise.resolve().then(() => appLoader(user)), LOADER_TIMEOUT, 'app-loader')
    .then(() => null, (e) => e);                // 永不 reject
  const slow = setTimeout(() => { setLabel('載入地圖中…'); btn?.classList.add('is-pending'); }, 1100);

  await Promise.all([loading, sleep(reduced() ? 150 : 750)]);   // 至少讓「登入成功」被看見
  clearTimeout(slow);
  const loadErr = await loading;

  setAppInert(false);
  el.classList.add('revealing');
  await sleep(reduced() ? 250 : 850);
  teardownWelcome();
  state = S.APP;

  if (loadErr) {
    console.warn('[TripTych] 地圖/資料初始化未完成', loadErr);
    notice('資料載入較慢或失敗，可稍後重新整理。');
    window.dispatchEvent(new CustomEvent('triptych:load-error', { detail: { error: loadErr } }));
  }
}

function enterDirect(user) {                    // 已登入使用者重開 App：直接進入
  state = S.APP; setAppInert(false); ungate();
  Promise.resolve().then(() => appLoader(user)).catch((e) => { console.warn(e); notice('資料載入失敗，可稍後重新整理。'); });
}
function enterGuest() {
  store.set(GUEST_FLAG, '1');
  if (state === S.WELCOME || state === S.PENDING) transitionIn(null); else enterDirect(null);
}

/* ───────── 登入狀態（唯一真相來源） ───────── */
function onAuthState(user) {
  currentUser = user; authKnown = true;
  listeners.forEach((cb) => { try { cb(user); } catch (e) { console.error(e); } });

  if (user) {
    store.del(GUEST_FLAG);
    if (state === S.ARRIVING || state === S.APP) return;
    if (state === S.WELCOME || state === S.PENDING) transitionIn(user);
    else if (state === S.BOOT) enterDirect(user);
    return;
  }
  if (state === S.BOOT) { store.get(GUEST_FLAG) ? enterDirect(null) : showWelcome(); }
  else if (state === S.APP) { store.del(GUEST_FLAG); showWelcome({ fade: true }); }   // 登出 → 回歡迎頁
}

export async function signOutUser() { if (auth && fb) await fb.signOut(auth); else store.del(GUEST_FLAG); }
export function openLogin() { if (state === S.APP && !currentUser) { store.del(GUEST_FLAG); showWelcome({ fade: true }); } }

/* ───────── 初始化 ───────── */
async function init() {
  if (!$('welcome')) { console.warn('[TripTych] 找不到 #welcome'); ungate(); resolveAuthReady(null); return; }
  $('btn-google')?.addEventListener('click', onGoogleClick);   // 只註冊一次
  $('btn-skip')?.addEventListener('click', enterGuest);
  store.del('tp_auth_redirect');                                // 清掉舊版殘留旗標

  let cfg;
  try {
    const [appMod, authMod, c] = await Promise.all([
      import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import('./firebase-config.js')
    ]);
    cfg = c; fb = { ...authMod };
    app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg.firebaseConfig);
    auth = authMod.getAuth(app);
    try { await authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (_) {}
    resolveAuthReady({ app, auth });
  } catch (e) {
    console.error('[TripTych] Firebase 載入失敗', e);
    resolveAuthReady(null);
    if (store.get(GUEST_FLAG)) { enterDirect(null); return; }
    showWelcome(); setMsg('目前無法連線到登入服務。'); showSkip(true);
    return;
  }

  if (cfg.googleClientId) initGis(cfg.googleClientId).catch((e) => console.warn('[TripTych] GIS 載入失敗，改用 Firebase 彈窗', e));
  fb.onAuthStateChanged(auth, onAuthState, (e) => console.error('[TripTych] auth observer', e));
}

init().catch((e) => { console.error(e); ungate(); });
