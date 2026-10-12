/* earth.js — TripTych 歡迎頁 3D 地球（Three.js 由 CDN 動態載入，只在歡迎頁才會下載）
 * 對外介面：
 *   globeLayout(w,h)            純函式，回傳地球在畫面上的 {cx,cy,r}（px）
 *   createEarth(canvas, opts)   建立地球，回傳控制器：
 *       .setPending(bool)       登入等待中：地球微幅加速自轉
 *       .preWarp(ms)            Redirect 跳轉前的短動畫（Promise）
 *       .warp({duration,on})    登入成功後的躍遷動畫（Promise，結束時畫面已被奶油色覆蓋）
 *       .dispose()              釋放所有 GPU / 事件資源
 */

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const TEX_MAP = new URL('./earth.jpg', import.meta.url).href;
const TEX_CLOUDS = new URL('./earth-clouds.jpg', import.meta.url).href;

/* ───────── 可調參數（想微調質感／節奏，改這裡即可） ───────── */
const CFG = {
  fov: 30,
  spin: 0.035,            // rad/s，約 3 分鐘轉一圈
  cloudDrift: 0.006,      // 雲層相對地表的額外漂移
  startLon: 2.6,          // 起始經度（約對準東亞）
  tiltX: 0.40,            // 北極朝向觀看者的角度
  tiltZ: -0.30,           // 地軸傾斜
  sun: [-0.62, 0.48, 0.62],// 光源方向（相機座標：左上前方）
  atmRadius: 1.05,        // 大氣層半徑（相對地球）
  idleFrameMs: 32,        // 待機約 30fps，省電
  pendingSpinMul: 2.4,
  warpFovEnd: 62,
  warpDistEnd: 1.06,
  warpPow: 2.2,           // 越大＝前段越慢、後段衝刺越猛
  warpSpinMul: 8,
  phases: { streaks: 0.18, veil: 0.66 } // 躍遷進度到達時觸發的回呼時機
};

let threeP = null;
const loadThree = () =>
  (threeP ??= import(THREE_URL).catch((e) => { threeP = null; throw e; }));

export const prefersReducedMotion = () =>
  !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/** 地球版面：頂部留白 + 預留下方品牌與按鈕空間，地球置於剩餘空間中央 */
export function globeLayout(w, h) {
  const topPad = 56, reserved = 268;
  const availH = Math.max(h - topPad - reserved, 180);
  const r = Math.min(w * 0.40, availH * 0.46);
  return { cx: w / 2, cy: topPad + availH * 0.5, r };
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('texture timeout')), ms))]);

/* ───────── Shaders ───────── */
const VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

// 地表：柔和晨昏線、低強度海面反光、陸地微去飽和、邊緣暗角 + 低彩度大氣散射（無發光）
const EARTH_FRAG = /* glsl */`
uniform sampler2D uMap; uniform vec3 uSun; uniform float uBoost; uniform float uWash;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  vec3 tex = texture2D(uMap, vUv).rgb;
  float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
  float ocean = smoothstep(0.0, 0.04, tex.b - tex.r) * (1.0 - smoothstep(0.35, 0.7, lum));
  vec3 land = mix(tex, vec3(lum), 0.10) * vec3(1.03, 1.0, 0.95);
  vec3 base = mix(land, tex * vec3(0.92, 0.96, 1.04), ocean);

  float ndl = dot(N, uSun);
  float day = smoothstep(-0.22, 0.62, ndl);
  vec3 dayCol = base * (0.55 + 0.75 * max(ndl, 0.0));
  vec3 nightCol = base * vec3(0.10, 0.13, 0.22);
  vec3 col = mix(nightCol, dayCol, day);

  vec3 H = normalize(uSun + V);
  float nh = max(dot(N, H), 0.0);
  float spec = pow(nh, 90.0) * 0.20 + pow(nh, 14.0) * 0.03;
  col += vec3(1.0, 0.96, 0.88) * spec * ocean * day;

  float f = 1.0 - max(dot(N, V), 0.0);
  col *= 1.0 - 0.22 * pow(f, 2.5);
  col = mix(col, vec3(0.30, 0.44, 0.72), pow(f, 3.2) * 0.36 * (0.35 + 0.65 * day));

  col *= uBoost;
  col = mix(col, vec3(1.0, 0.97, 0.90), uWash);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const CLOUD_FRAG = /* glsl */`
uniform sampler2D uClouds; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N = normalize(vN);
  float t = texture2D(uClouds, vUv).r;
  float a = smoothstep(0.12, 0.92, t) * 0.80;
  float day = smoothstep(-0.25, 0.60, dot(N, uSun));
  vec3 c = mix(vec3(0.07, 0.09, 0.15), vec3(1.0, 0.99, 0.97), day);
  gl_FragColor = vec4(c, a * (0.50 + 0.50 * day));
  #include <colorspace_fragment>
}`;

// 大氣層：BackSide 只會在地球輪廓外形成一圈很薄的低彩度霧邊，且偏向受光側
const ATM_FRAG = /* glsl */`
uniform vec3 uSun; uniform float uInner;
varying vec3 vN; varying vec3 vV;
void main(){
  float t = clamp(-dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float k = pow(smoothstep(0.0, uInner, t), 1.8);
  float sunSide = smoothstep(-0.4, 0.7, dot(normalize(vN), uSun));
  gl_FragColor = vec4(vec3(0.30, 0.46, 0.78), k * 0.26 * (0.20 + 0.80 * sunSide));
  #include <colorspace_fragment>
}`;

/* ───────── 建立地球 ───────── */
export async function createEarth(canvas, { onLayout, onContextLost } = {}) {
  const THREE = await loadThree();
  const reduced = prefersReducedMotion();

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  let map = null, cloudsTex = null;
  const killRenderer = () => { try { renderer.dispose(); renderer.forceContextLoss?.(); } catch (_) {} };

  try {
    const loader = new THREE.TextureLoader();
    const load = (u) => new Promise((ok, no) => loader.load(u, ok, undefined, no));
    [map, cloudsTex] = await Promise.all([
      withTimeout(load(TEX_MAP), 15000),
      withTimeout(load(TEX_CLOUDS), 15000).catch(() => null) // 雲層貼圖失敗不致命
    ]);
  } catch (e) { killRenderer(); throw e; }

  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (cloudsTex) cloudsTex.anisotropy = 4;

  const sun = new THREE.Vector3(...CFG.sun).normalize();
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(CFG.fov, 1, 0.01, 50);
  const tilt = new THREE.Group();
  tilt.rotation.set(CFG.tiltX, 0, CFG.tiltZ);
  const spinG = new THREE.Group();
  spinG.rotation.y = CFG.startLon;
  tilt.add(spinG);
  scene.add(tilt);

  const earthMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: EARTH_FRAG,
    uniforms: { uMap: { value: map }, uSun: { value: sun }, uBoost: { value: 1 }, uWash: { value: 0 } }
  });
  spinG.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), earthMat));

  let clouds = null;
  if (cloudsTex) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.008, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
        uniforms: { uClouds: { value: cloudsTex }, uSun: { value: sun } }
      })
    );
    spinG.add(clouds);
  }

  const R = CFG.atmRadius;
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: ATM_FRAG, transparent: true, depthWrite: false, side: THREE.BackSide,
      uniforms: { uSun: { value: sun }, uInner: { value: Math.sqrt(1 - 1 / (R * R)) } }
    })
  ));
  // 大氣層需在地球之後、以地球為中心；tilt 不影響球形，故放 scene 即可

  /* ── 尺寸與版面 ── */
  let w = 1, h = 1, base = { cx: 0, cy: 0, r: 1 }, d0 = 10, disposed = false;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;

  const setCam = (fov, cyPx) => {
    cam.fov = fov;
    cam.setViewOffset(w, h, 0, h / 2 - cyPx, w, h); // 把地球中心移到 cyPx
  };

  function layout() {
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    base = globeLayout(w, h);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(CFG.fov / 2));
    const k = (h / 2) / (base.r * tanHalf);
    d0 = Math.sqrt(1 + k * k);
    cam.position.set(0, 0, d0);
    setCam(CFG.fov, base.cy);
    onLayout?.({ ...base, w, h });
    renderer.render(scene, cam);
  }

  /* ── 動畫狀態 ── */
  let raf = 0, lastTick = 0, lastDraw = 0, spinMul = 1, pending = false;
  let anim = null, frozen = false, needsLayout = false;

  function stepAnim(now) {
    const a = anim;
    const p = clamp01((now - a.t0) / a.dur);
    a.finished = p >= 1;
    if (a.kind === 'pre') {
      cam.position.z = lerp(d0, d0 * 0.8, easeOut(p));
      return 4;
    }
    const e = Math.pow(p, CFG.warpPow);
    cam.position.z = Math.exp(lerp(Math.log(d0), Math.log(CFG.warpDistEnd), e));
    setCam(lerp(CFG.fov, CFG.warpFovEnd, e), lerp(base.cy, h / 2, easeInOut(p)));
    earthMat.uniforms.uBoost.value = 1 + 0.15 * p;
    earthMat.uniforms.uWash.value = smooth(0.72, 1, p) * 0.5;
    const at = a.at;
    for (const k of Object.keys(at)) {
      if (p >= at[k] && !a.fired[k]) { a.fired[k] = true; try { a.on[k]?.(); } catch (_) {} }
    }
    return 1 + (CFG.warpSpinMul - 1) * p * p;
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!anim && now - lastDraw < CFG.idleFrameMs) return;
    const dt = Math.min(Math.max((now - (lastTick || now)) / 1000, 0), 0.1);
    lastTick = now; lastDraw = now;

    const target = anim ? stepAnim(now) : (pending ? CFG.pendingSpinMul : 1);
    spinMul += (target - spinMul) * Math.min(1, dt * (anim ? 10 : 3));
    spinG.rotation.y += dt * CFG.spin * spinMul;
    if (clouds) clouds.rotation.y += dt * CFG.cloudDrift * spinMul;
    renderer.render(scene, cam);

    if (anim?.finished) {
      const a = anim; anim = null;
      if (a.kind === 'warp') { frozen = true; stopLoop(); } // 畫面已被覆蓋，停止渲染省電
      a.res(true);
      if (needsLayout && !frozen) { needsLayout = false; layout(); }
    }
  }

  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const wake = () => {
    if (disposed || frozen || reduced || raf || document.hidden) return;
    lastTick = 0;
    raf = requestAnimationFrame(tick);
  };

  function runAnim(kind, dur, { on = {}, at = {} } = {}) {
    return new Promise((res) => {
      if (anim) anim.res(false);
      anim = { kind, dur, on, at: { ...CFG.phases, ...at }, fired: {}, res, t0: performance.now(), finished: false };
      wake();
    });
  }

  /* ── 事件（皆於 dispose 時移除） ── */
  const onVis = () => { if (document.hidden) stopLoop(); else wake(); };
  const onLost = (e) => { e.preventDefault(); stopLoop(); anim?.res(false); anim = null; onContextLost?.(); };
  const ro = new ResizeObserver(() => {
    if (disposed) return;
    if (anim || frozen) { needsLayout = true; return; }
    layout();
  });
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost);
  ro.observe(canvas);

  layout();
  wake(); // reduced-motion 時 wake 不會啟動迴圈：僅靜態渲染

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('webglcontextlost', onLost);
    if (anim) { anim.res(false); anim = null; }
    scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    map.dispose(); cloudsTex?.dispose();
    killRenderer();
  }

  return {
    setPending(v) { pending = !!v; wake(); },
    preWarp(ms = 400) { return reduced || disposed ? Promise.resolve(false) : runAnim('pre', ms); },
    warp({ duration = 1700, on = {}, at } = {}) {
      return reduced || disposed ? Promise.resolve(false) : runAnim('warp', duration, { on, at });
    },
    dispose
  };
}
