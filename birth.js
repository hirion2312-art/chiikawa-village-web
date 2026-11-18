'use strict';
// 먼작귀 빌리지 — 아이 만들기와 내 아이 화면 (핸드폰·PC 공용)

const TOKEN_KEY = 'mogukawa-village-token';
const KID_KEY = 'mogukawa-kid';            // 한 계정에 아이가 여럿일 때 지금 보는 아이
let PRELAUNCH = false;                     // 선공개 모드 (서버가 알려 준다): 마을 대신 내 아이 방
let editing = false;                       // 다시 꾸미기 중
const kidId = () => { try { return localStorage.getItem(KID_KEY) || ''; } catch (e) { return ''; } };
const setKid = id => { try { if (id) localStorage.setItem(KID_KEY, id); else localStorage.removeItem(KID_KEY); } catch (e) { /* 저장이 막힌 브라우저 */ } };
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids.filter(k => k !== null && k !== undefined));
  return n;
};
// 로그인 열쇠는 auth.js가 쥔다 (Firebase를 쓰면 로그인 토큰, 아니면 이 서버가 준 토큰)
function readToken() { return window.VillageAuth ? VillageAuth.current() : (() => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } })(); }
// 계정 없이 쓸 때(Firebase가 꺼졌거나 못 불러옴): 아이마다 따로 받은 토큰을 이 기기에 모아 둔다.
// 아이를 하나 더 만들어도 앞 아이를 잃지 않고, 내 아이 방에서 바꿔 볼 수 있다 (2026-11-17)
// 원작 친구 얼굴 전부 받기 (2026-11-18): 사이트는 첫 로딩을 가볍게 하려고 얼굴 일부만 먼저 받는다(birth.html ALL_FACE_META).
// 목록에 없는 표정은 character.js가 첫 표정(치이카와 기본)으로 그리고 그 그림을 캐릭터마다 기억해 버리므로,
// 원작 친구를 세우기 전(첫 화면 마을·포토존)에 이것을 기다린다. 쿠리만쥬·랏코는 먼저 받는 묶음에 얼굴이 하나도 없다.
let allFacesP = null;
function ensureAllFaces() {
  if (allFacesP) return allFacesP;
  allFacesP = (async () => {
    await window.loadOnce('face-scan-images-2.js');
    await window.loadOnce('face-scan-images-3.js');
    const inMeta = new Set(FACE_SCAN_META.faces.map(f => f.id));
    const inList = new Set(EXPRESSIONS.map(e => e.id));
    for (const f of (window.ALL_FACE_META || [])) {
      if (!FACE_SCAN_IMAGES[f.id]) continue;
      if (!inMeta.has(f.id)) { FACE_SCAN_META.faces.push(f); inMeta.add(f.id); }
      if (!inList.has(f.id)) { EXPRESSIONS.push(f); inList.add(f.id); }
    }
    await Promise.all(EXPRESSIONS.filter(e => !e.painted && !scanImages[e.id] && FACE_SCAN_IMAGES[e.id]).map(e => new Promise(ok => {
      const im = new Image();
      im.onload = () => { scanImages[e.id] = typeof fixScanImage === 'function' ? fixScanImage(e.id, im) : im; scanWaiters.splice(0).forEach(fn => fn()); ok(); };
      im.onerror = ok;
      im.src = FACE_SCAN_IMAGES[e.id];
    })));
  })();
  allFacesP.catch(() => { allFacesP = null; });
  return allFacesP;
}
window.loadOnce = window.loadOnce || (src => { const old = document.querySelector(`script[src="${src}"]`); if (old) return old.dataset.ok || !old.dataset.dyn ? Promise.resolve() : new Promise((ok, no) => { old.addEventListener('load', ok); old.addEventListener('error', no); }); return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.dataset.dyn = '1'; s.onload = () => { s.dataset.ok = '1'; ok(); }; s.onerror = no; document.head.append(s); }); });
const WALLET_KEY = 'mogukawa-kid-tokens';
const usesAccount = () => !!(window.VillageAuth && VillageAuth.firebase);
const wallet = () => { try { return JSON.parse(localStorage.getItem(WALLET_KEY) || '{}') || {}; } catch (e) { return {}; } };
const saveWallet = w => { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch (e) { /* 저장이 막힌 브라우저 */ } };
function rememberKid(id, token, name) {
  if (usesAccount() || !id) return;
  const w = wallet();
  w[id] = { token: token || (w[id] && w[id].token), name: name || (w[id] && w[id].name) || '' };
  if (w[id].token) saveWallet(w);
}
function forgetKid(id) { const w = wallet(); if (w[id]) { delete w[id]; saveWallet(w); } }
function writeToken(t) {
  if (usesAccount()) return;            // Firebase 로그인은 계정이 열쇠라 따로 적지 않는다
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 저장이 막힌 브라우저 */ } }
// 아이 바꾸기: 계정이면 x-kid로, 계정이 없으면 그 아이의 토큰으로 갈아 낀다
function useKid(id) {
  setKid(id);
  if (!usesAccount() && id && wallet()[id]) writeToken(wallet()[id].token);
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = readToken();
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  if (kidId()) headers['x-kid'] = kidId();
  if (window.VillageAuth) { await VillageAuth.ready; const t = VillageAuth.current(); if (t) headers.authorization = `Bearer ${t}`; }
  const res = await fetch(`${window.VILLAGE_API || ''}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || '문제가 생겼어요.'), { status: res.status });
  return data;
}

/* ---------- 3D 미리 보기 ---------- */

const canvas = $('stage');
// 바탕은 투명: 뒤에 깐 들판 그림(#scenery)이 비친다
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xfff0d8, 2.35));
const sun = new THREE.DirectionalLight(0xfff8ec, 1.05);
sun.position.set(3, 8, 6);
scene.add(sun);
// 아이가 서는 둥근 풀밭: 먹선 테두리 + 연두 판 + 가운데 짙은 풀
const ground = new THREE.Group();
const disc = (r, color, y, opts = {}) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshBasicMaterial({ color, ...opts }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  ground.add(m);
  return m;
};
disc(2.06, '#4a3230', 0);
disc(1.96, '#c9e8a8', 0.004);
disc(1.3, '#a9d088', 0.008, { transparent: true, opacity: 0.6 });
scene.add(ground);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const wide = () => window.innerWidth >= 900;
// 보는 방향: 앞·옆·뒤는 아이를 돌리고, 얼굴은 가까이 다가간다
const VIEWS = { front: { spin: 0, zoom: 1 }, side: { spin: -Math.PI / 2, zoom: 1 }, back: { spin: Math.PI, zoom: 1 }, face: { spin: 0, zoom: 0.48 } };
let view = 'front';
let spin = 0, spinTo = 0, zoom = 1, zoomTo = 1;

function fit() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
// 판에 가리지 않는 남은 화면 한가운데에 아이가 오게 카메라를 옮긴다
function aimCamera() {
  // 아이 집: 화면 전체가 장면 (home.js가 카메라를 정한다)
  if (typeof House !== 'undefined' && House.on) { House.aimCamera(); return; }
  const w = window.innerWidth, h = window.innerHeight;
  const panel = document.querySelector('.panel:not([hidden])');
  const r = panel ? panel.getBoundingClientRect() : null;
  // 보이는 칸: PC는 판 왼쪽, 핸드폰은 판 위쪽
  const free = r && wide() ? { w: r.left, h } : r ? { w, h: r.top } : { w, h };
  // 보이는 칸이 화면보다 작을수록 멀리서 찍어, 아이가 그 칸 안에 들어오게 한다
  const shrink = Math.max(1, (h / free.h) * 0.8, (w / free.w) * 0.8);
  const group = typeof Photo !== 'undefined' && Photo.on;
  const plaza = !group && typeof Plaza !== 'undefined' && Plaza.on && Plaza.state.kids.length;   // 첫 화면 들판: 돌아다니는 아이들까지 보이게      // 포토존: 다섯 칸 무대가 다 들어오고, 위에서 살짝 내려다봐 앞·뒷줄이 갈린다
  const dist = (free.w / free.h < 0.9 ? 12.5 : 9.6) * zoom * shrink * (plaza ? 1.3 : 1) * (group ? (free.w / free.h < 0.9 ? 1.32 : 1.12) * (free.w / free.h < 1.05 ? 1.45 : 1) : 1);
  // 포토존 확대(1×~2.2×): 다가가며 얼굴 높이 쪽을 본다 (photo.js state.zc)
  const pz = group ? Photo.state.zc || 1 : 1;
  const lookY = group ? 0.7 + (pz - 1) * 0.45 : zoom < 1 ? 1.35 : 1.0;
  camera.position.set(0, lookY + (group ? (dist / pz) * 0.24 : 0.45 * zoom), group ? dist / pz : dist);
  camera.lookAt(0, lookY, 0);
  // 아이 집: 방 전체를 앞 위에서 내려다본다 (home.js)
  // 화면 가운데가 아닌 남은 칸 가운데로 밀기
  const ox = r && wide() ? (w - free.w) / 2 : 0;
  const oy = r && !wide() ? (h - free.h) / 2 : 0;
  camera.setViewOffset(w, h, ox, oy, w, h);
  camera.updateProjectionMatrix();
  placeScenery(free);
}
// 들판 그림의 풀밭 줄(그림 좌표 y 282)이 아이 발밑에 오게 그림의 크기와 자리를 맞춘다
const feet = new THREE.Vector3();
function placeScenery(free) {
  const box = $('scenery');
  feet.set(0, 0, 0).project(camera);
  const fy = (1 - feet.y) / 2 * window.innerHeight;
  // 포토존 확대만큼 뒤 그림도 키운다 (발밑 풀밭 줄은 그대로)
  const sc = Math.max(free.w / 390, 0.8) * (typeof Photo !== 'undefined' && Photo.on ? Photo.state.zc || 1 : 1);
  box.style.width = `${free.w}px`;
  box.style.height = `${350 * sc}px`;
  box.style.top = `${fy - 282 * sc}px`;
}
window.addEventListener('resize', () => { fit(); aimCamera(); });
fit();

let actor = null;
let previewExpr = null;          // 감정 표정을 고르는 동안 미리 보기 아이가 짓는 감정 (normal|joy|…)
function showLook(lk) {
  if (actor) { scene.remove(actor.root); if (actor.dispose) actor.dispose(); }
  let preset;
  if (previewExpr && lk === look) {
    const p = emoPreview(previewExpr);
    preset = presetFromLook(p.lk);
    preset.expression = p.expr;
  } else preset = presetFromLook(lk);
  actor = buildCharacter(preset, { faceWidth: 512 });
  actor.root.rotation.y = spin;
  scene.add(actor.root);
}
function setView(v) {
  view = v;
  spinTo = VIEWS[v].spin;
  zoomTo = VIEWS[v].zoom;
  for (const b of $('viewBar').children) { b.classList.toggle('on', b.dataset.view === v); b.setAttribute('aria-pressed', String(b.dataset.view === v)); }
}
for (const b of $('viewBar').children) b.onclick = () => setView(b.dataset.view);
let drag = null;
// 꾸미기 확대 (2026-11-18): 마우스 휠, 두 손가락 벌리기. 보기 단추(앞·옆·뒤·얼굴)를 누르면 그 보기의 거리로 돌아간다
const birthing = () => document.body.classList.contains('birthing');
const fingersB = new Map();
let pinchB = 0, zoomB = 1;
canvas.addEventListener('wheel', e => {
  if (!birthing()) return;
  e.preventDefault();
  zoomTo = Math.max(0.4, Math.min(1.3, zoomTo * (1 + e.deltaY * 0.0012)));
}, { passive: false });
canvas.addEventListener('pointerdown', e => {
  if (!birthing()) return;
  fingersB.set(e.pointerId, [e.clientX, e.clientY]);
  if (fingersB.size === 2) { const [p, q] = [...fingersB.values()]; pinchB = Math.hypot(p[0] - q[0], p[1] - q[1]); zoomB = zoomTo; }
});
canvas.addEventListener('pointermove', e => {
  if (!fingersB.has(e.pointerId)) return;
  fingersB.set(e.pointerId, [e.clientX, e.clientY]);
  if (fingersB.size === 2 && pinchB > 0) {
    const [p, q] = [...fingersB.values()];
    zoomTo = zoom = Math.max(0.4, Math.min(1.3, zoomB * pinchB / Math.hypot(p[0] - q[0], p[1] - q[1])));
    drag = null;
  }
});
for (const t of ['pointerup', 'pointercancel']) canvas.addEventListener(t, e => { fingersB.delete(e.pointerId); if (fingersB.size < 2) pinchB = 0; });
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  if (typeof Photo !== 'undefined' && Photo.on) return Photo.down(e);
  if (typeof Plaza !== 'undefined' && Plaza.on && Plaza.pick(e)) return;
  drag = e.clientX;
});
canvas.addEventListener('pointermove', e => {
  if (typeof Photo !== 'undefined' && Photo.on) return Photo.move(e);
  if (drag === null) return;
  spin += (e.clientX - drag) * 0.012;
  spinTo = spin;
  drag = e.clientX;
});
canvas.addEventListener('pointerup', e => { if (typeof Photo !== 'undefined' && Photo.on) Photo.up(e); drag = null; });
canvas.addEventListener('pointercancel', e => { if (typeof Photo !== 'undefined' && Photo.on) Photo.up(e); drag = null; });

let last = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // 첫 화면 마을이 준비되면 그 장면만 그린다 (title.js)
  if (typeof TitleVillage !== 'undefined' && TitleVillage.ready && TitleVillage.animate(now, dt)) return;
  // 돌기·다가가기는 부드럽게
  const k = 1 - Math.exp(-dt * 8);
  if (drag === null) spin += (spinTo - spin) * k;
  zoom += (zoomTo - zoom) * k;
  aimCamera();
  if (typeof Plaza !== 'undefined') Plaza.animate(now, dt);
  if (typeof Photo !== 'undefined' && Photo.on) Photo.animate(now, dt);
  else if (typeof House !== 'undefined' && House.on) House.animate(now, dt);
  else if (actor) {
    actor.root.rotation.y = spin;
    if (actor.animate) actor.animate(now / 1000, dt, 'idle');
  }
  renderer.render(scene, camera);
});

/* ---------- 선택지 사진 (지금 고른 색으로 찍는다) ---------- */

const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
thumbRenderer.setSize(144, 144, false);
const thumbScene = new THREE.Scene();
thumbScene.background = new THREE.Color(0xe8f4f8);
thumbScene.add(new THREE.HemisphereLight(0xffffff, 0xfff0d8, 2.35));
const thumbSun = new THREE.DirectionalLight(0xfff8ec, 1.05);
thumbSun.position.set(3, 8, 6);
thumbScene.add(thumbSun);
const thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
const thumbCache = new Map();
let thumbQueue = Promise.resolve();
let thumbGen = 0;
// [돌리기, 볼 높이, 거리]
const SHOT = {
  body: [0.35, 1.0, 6.4], pattern: [0.35, 0.9, 5.4], ears: [0.3, 1.65, 4.0], hair: [0.3, 1.55, 3.8], top: [0.3, 1.75, 4.0],
  fur: [0.3, 1.2, 4.8], neck: [0.35, 1.0, 4.6], tail: [Math.PI * 0.72, 1.0, 5.6], mark: [0, 1.45, 3.0], brow: [0, 1.6, 2.7], mouth: [0, 1.22, 2.9],
};
// 사진의 바탕 생김새: 몸 색·포인트 색·체형은 지금 고른 대로, 나머지는 비워 그 항목만 보이게
function thumbBase(key, id) {
  const b = { skin: look.skin, color2: look.color2, body: look.body, ears: 'round', tail: 'none', earTint: look.earTint, tailTint: look.tailTint };
  if (key === 'tail') b.ears = look.ears;
  if (key === 'hair' || key === 'top') b.ears = 'none';
  return { ...b, [key]: id };
}
function makeThumb(key, id) {
  const sig = `${key}:${id}:${look.skin}:${look.color2}:${look.body}:${look.earTint}:${look.tailTint}${key === 'tail' ? `:${look.ears}` : ''}`;
  if (thumbCache.has(sig)) return Promise.resolve(thumbCache.get(sig));
  const gen = thumbGen;
  thumbQueue = thumbQueue.then(async () => {
    if (gen !== thumbGen) return null;             // 색을 바꾸면 이전 줄은 버린다
    const built = buildCharacter(presetFromLook(thumbBase(key, id)), { faceWidth: 256 });
    const [ry, yy, dist] = SHOT[key];
    built.root.rotation.y = ry;
    thumbScene.add(built.root);
    thumbCam.position.set(0, yy + 0.2, dist);
    thumbCam.lookAt(0, yy, 0);
    await new Promise(r => setTimeout(r, 40));      // 얼굴 그림이 입혀질 때까지
    thumbRenderer.render(thumbScene, thumbCam);
    const url = thumbRenderer.domElement.toDataURL('image/jpeg', 0.82);
    thumbScene.remove(built.root);
    if (built.dispose) built.dispose();
    thumbCache.set(sig, url);
    return url;
  });
  return thumbQueue;
}
// 꾸미기 화면은 원작 스캔을 일부만 받아 '졸림' 표정 이름이 없다. 꾸미기 얼굴은 구워 둔 조각으로 그리므로 이름만 더해 둔다
if (!EXPRESSIONS.some(e => e.id === 'sleep')) EXPRESSIONS.push({ id: 'sleep', owner: 'chiikawa', label: '잠', eyes: [] });
// 감정 하나를 미리 볼 생김새와 표정 (꾸미기 얼굴은 조각을 섞어 그리므로 원본 스캔이 없어도 된다)
function emoPreview(key) {
  return { lk: look, expr: options.faceSet[key].expr };
}
// 감정 표정 세트 사진: 지금 생김새 그대로, 그 감정의 표정을 짓게 해서 얼굴만 찍는다
const emoCache = new Map();
function makeEmoThumb(emo) {
  const sig = `${emo}:${JSON.stringify(look)}`;
  if (emoCache.has(sig)) return Promise.resolve(emoCache.get(sig));
  thumbQueue = thumbQueue.then(async () => {
    const { lk, expr } = emoPreview(emo);
    const preset = presetFromLook(lk);
    preset.expression = expr;
    const built = buildCharacter(preset, { faceWidth: 256 });
    thumbScene.add(built.root);
    thumbCam.position.set(0, 1.4, 3.0);
    thumbCam.lookAt(0, 1.22, 0);
    // 섞을 조각이 다 읽힐 때까지 기다린다 (최대 1.5초)
    for (let i = 0; i < 30; i++) {
      if (composeFace({ id: expr }, preset) !== 'wait') break;
      await new Promise(r => setTimeout(r, 50));
    }
    await new Promise(r => setTimeout(r, 60));
    thumbRenderer.render(thumbScene, thumbCam);
    const url = thumbRenderer.domElement.toDataURL('image/jpeg', 0.82);
    thumbScene.remove(built.root);
    if (built.dispose) built.dispose();
    emoCache.set(sig, url);
    return url;
  });
  return thumbQueue;
}

/* ---------- 아이 만들기 ---------- */

const look = {
  skin: '#fffdf8', color2: '#f6bcc8', body: 'normal', ears: 'round', earTint: false, tail: 'none', tailTint: false,
  hair: 'none', top: 'none', fur: 'none', neck: 'none', mark: 'none', pattern: 'none',
  eyeSize: 1, eyeY: 0, eyeGap: 0, brow: 'scan', browY: 0, browSize: 1, mouth: 'scan', mouthY: 0, mouthSize: 1,
  faceSet: {},
};
const traits = { brave: 0.5, social: 0.5, appetite: 0.5, diligent: 0.5 };
// 「아이 하나 더 만들기」는 처음 생김새·성격에서 시작한다
const LOOK0 = JSON.stringify(look), TRAITS0 = JSON.stringify(traits);
const TRAITS = [['brave', '대담함', '겁이 많아요', '용감해요'], ['social', '다정함', '혼자가 좋아요', '친구가 좋아요'], ['appetite', '식탐', '입이 짧아요', '늘 배고파요'], ['diligent', '성실함', '느긋해요', '부지런해요']];
// 큰 갈래 → 항목. 항목마다 그리는 방법과, 고를 때 보기 좋은 방향
const GROUPS = [
  { id: 'body', icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="10" cy="11" rx="7" ry="6.5"/></svg>', label: '몸', view: 'front', parts: [['colors', '색'], ['body', '체형'], ['pattern', '무늬']] },
  { id: 'face', icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M7.5 9v.5M12.5 9v.5M8 13c1.2 1 2.8 1 4 0"/></svg>', label: '얼굴', view: 'face', parts: [['eyes', '눈'], ['brow', '눈썹'], ['mouth', '입'], ['mark', '무늬']] },
  { id: 'ears', icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9C4 6 4.5 2.5 6.5 2.5S9 5.5 9 8.5M14 9c2-3 1.5-6.5-.5-6.5S11 5.5 11 8.5"/><circle cx="10" cy="13" r="5"/></svg>', label: '귀', view: 'front', parts: [['ears', '귀']] },
  { id: 'head', icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11a7 7 0 0 1 14 0v5H3z"/><path d="M5 6L4 2l4 2.5M15 6l1-4-4 2.5"/></svg>', label: '머리', view: 'front', parts: [['hair', '머리 모양'], ['top', '머리 장식'], ['fur', '털']] },
  { id: 'deco', icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M10 10L3 6v8zM10 10l7-4v8z"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/></svg>', label: '꼬리', view: 'back', parts: [['tail', '꼬리']] },
  { id: 'mind', icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M10 17s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 17 8c0 4.8-7 9-7 9z"/></svg>', label: '성격', view: 'front', parts: [['mind', '성격']] },
];
let options = null;
let group = 'body';
const partOf = {};                       // 갈래마다 지금 보는 항목 (서랍 안 칸 나누기)
let previewTimer = 0;
const undo = [];
const snapshot = () => JSON.stringify(look);
let lastSnap = null;
// 바꾸기 전 모습을 기억해 두고 (되돌리기), 잠깐 뒤에 미리 보기를 다시 만든다
function changed() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (lastSnap && lastSnap !== snapshot()) { undo.push(lastSnap); if (undo.length > 40) undo.shift(); }
    lastSnap = snapshot();
    $('undoBtn').disabled = !undo.length;
    showLook(look);
  }, 80);
}
function back() {
  const prev = undo.pop();
  if (!prev) return;
  Object.assign(look, JSON.parse(prev));
  lastSnap = snapshot();
  $('undoBtn').disabled = !undo.length;
  thumbGen++;
  renderBody();
  showLook(look);
}

const sec = (id, title, ...kids) => el('section', { className: 'sec', id: `sec-${id}` }, el('h3', {}, ...(Array.isArray(title) ? title : [title])), ...kids);
const FROM = list => {
  const names = [...new Set(list.filter(x => x.from).map(x => x.from))];
  return names.length ? el('small', { textContent: `${names.slice(0, 3).join('·')}${names.length > 3 ? ' 외' : ''}에게서` }) : null;
};
// 얼굴 막대는 위에서 고른 감정만 바꾼다 (2026-11-18 이재헌님: 표정마다 눈·눈썹·입 크기 따로).
// 기본 칸은 아이의 기본 값(look.eyeSize 등), 다른 감정은 감정 세트에 그 감정 값만 적는다. 안 건드린 감정은 기본 값을 따른다
const FACE_TUNE = ['eyeSize', 'eyeY', 'eyeGap', 'browSize', 'browY', 'mouthSize', 'mouthY'];
const tuneOwn = key => FACE_TUNE.includes(key) && group === 'face' && emo !== 'normal';
const tuneValue = key => (tuneOwn(key) && look.faceSet[emo] && typeof look.faceSet[emo][key] === 'number' ? look.faceSet[emo][key] : look[key]);
function setTune(key, v) {
  if (!tuneOwn(key)) { look[key] = v; return; }
  const cur = { ...(look.faceSet[emo] || {}) };
  if (Math.abs(v - look[key]) < 1e-6) delete cur[key]; else cur[key] = v;
  const next = { ...look.faceSet };
  if (Object.keys(cur).length) next[emo] = cur; else delete next[emo];
  look.faceSet = next;
}
function sliders(map, className = '') {
  return el('div', { className }, ...Object.entries(map).map(([key, r]) => {
    const input = el('input', { type: 'range', min: r.min, max: r.max, step: r.step, value: tuneValue(key), ariaLabel: r.label });
    input.oninput = () => {
      setTune(key, Number(input.value));
      changed();
      if (tuneOwn(key)) { clearTimeout(sliders.t); sliders.t = setTimeout(paintStrip, 300); }
    };
    return el('label', { className: 'slider' }, el('span', { textContent: r.label }), input);
  }));
}
// 높이·크기 막대는 「세부 조정」 안에 접어 둔다 (열어 둔 채로 다른 칸에 가도 열려 있다)
let tuneOpen = false;
function tune(map) {
  const only = group === 'face' && Object.keys(map).some(k => FACE_TUNE.includes(k));
  const title = only ? `세부 조정 · ${options.faceSet[emo].label} 표정의 높이·크기` : '세부 조정 · 높이·크기';
  const d = el('details', { className: 'tune' }, el('summary', { textContent: title }), sliders(map));
  d.open = tuneOpen;
  d.ontoggle = () => { tuneOpen = d.open; };
  return d;
}
function thumbs(key, list) {
  const box = el('div', { className: 'thumbs' });
  for (const o of list) {
    const pic = el('div', { className: 'pic wait' });
    const b = el('button', { type: 'button', className: 'thumb', ariaPressed: String(look[key] === o.id) }, pic, el('span', { textContent: o.label }));
    if (look[key] === o.id) b.classList.add('on');
    b.onclick = () => {
      look[key] = o.id;
      [...box.children].forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      changed();
      if (key === 'ears') thumbGen++;               // 꼬리 사진은 귀를 따라 다시 찍는다
    };
    box.append(b);
    // 화면에 보일 때만 찍는다
    lazy(pic, () => makeThumb(key, o.id).then(url => { if (url) { pic.classList.remove('wait'); pic.style.backgroundImage = `url(${url})`; } }));
  }
  return box;
}
let seen = null;
function lazy(node, fn) {
  if (!('IntersectionObserver' in window)) return fn();
  if (!seen) seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { seen.unobserve(e.target); e.target._go(); } }), { root: $('body'), rootMargin: '120px' });
  node._go = fn;
  seen.observe(node);
  return undefined;
}
function colors(key, list, label) {
  const row = el('div', { className: 'swatches' });
  const paint = () => [...row.querySelectorAll('.swatch:not(.pick)')].forEach(s => { const on = s.dataset.color === look[key]; s.classList.toggle('on', on); s.setAttribute('aria-pressed', String(on)); });
  const set = c => { look[key] = c; paint(); thumbGen++; changed(); clearTimeout(set.t); set.t = setTimeout(() => renderBody(true), 500); };
  for (const color of list) {
    const s = el('button', { type: 'button', className: 'swatch', ariaLabel: `${label} ${color}` });
    s.dataset.color = color;
    s.style.background = color;
    s.onclick = () => set(color);
    row.append(s);
  }
  const wheel = el('input', { type: 'color', value: look[key], ariaLabel: `${label} 직접 고르기` });
  wheel.oninput = () => set(wheel.value);
  row.append(el('label', { className: 'swatch pick', title: '직접 고르기' }, wheel));
  paint();
  return row;
}
const toggle = (key, text) => {
  const input = el('input', { type: 'checkbox', checked: !!look[key] });
  input.onchange = () => { look[key] = input.checked; thumbGen++; changed(); renderBody(true); };
  return el('label', { className: 'toggle' }, input, text);
};
const PART_VIEW = {
  colors: () => el('div', {}, el('p', { className: 'emo-row-title', textContent: '몸 색' }), colors('skin', options.skin, '몸 색'), el('p', { className: 'emo-row-title', textContent: '포인트 색' }), colors('color2', options.color2, '포인트 색'), el('p', { className: 'quiet', textContent: '포인트 색은 머리·무늬·장식, 포인트 귀와 꼬리에 써요.' })),
  skin: () => colors('skin', options.skin, '몸 색'),
  color2: () => el('div', {}, colors('color2', options.color2, '포인트 색'), el('p', { className: 'quiet', textContent: '머리·무늬·장식·포인트 귀와 꼬리에 쓰는 색이에요.' })),
  body: () => thumbs('body', options.body),
  pattern: () => thumbs('pattern', options.pattern),
  // 눈·눈썹·입: 위에서 고른 감정의 얼굴에 쓸 원작 조각을 고른다 (크기·높이 손잡이는 모든 감정에 같이)
  // 크기·높이 막대는 그 칸의 조각을 내려 보는 동안 위에 붙어 있다 (이재헌님, 2026-11-17)
  eyes: () => el('div', {}, tune(options.eyes), groupedPieces('eye')),
  brow: () => el('div', {}, tune(options.brows), groupedPieces('brow')),
  mouth: () => el('div', {}, tune(options.mouths), groupedPieces('mouth')),
  mark: () => thumbs('mark', options.mark),
  ears: () => thumbs('ears', options.ears),
  hair: () => thumbs('hair', options.hair),
  top: () => thumbs('top', options.top),
  fur: () => thumbs('fur', options.fur),
  tail: () => thumbs('tail', options.tail),
  neck: () => thumbs('neck', options.neck),
  mind: () => quiz(),
};
// 감정별 얼굴 (2026-11-17): 얼굴 갈래 맨 위에서 감정을 고르면, 아래 눈·눈썹·입 칸이 그 감정의 얼굴을 바꾼다.
// 얼굴은 고정 볼 위에 눈만·눈썹만·입만 얹어 섞는다. '@'은 그 감정의 원작 조각 그대로
const OWNER = { h: '하치와레', u: '우사기', m: '모몽가', s: '시사', f: '후루혼야', r: '랏코', k: '쿠리만쥬' };
const ownerOf = id => OWNER[(/^([a-z])-/.exec(id) || [])[1]] || '치이카와';
let emo = 'normal';
const PIECE_DATA = { eye: () => window.EYE_SCANS, brow: () => window.BROW_SCANS, mouth: () => window.MOUTH_SCANS };
// 조각 전부를 생김새별 묶음으로 (원작 그대로 · 없음 · 동그란 눈 · …). 고르면 위에서 고른 감정의 얼굴에 들어간다
function groupedPieces(kind) {
  const wrap = el('div', { className: 'piece-groups' });
  const spec = options.faceSet[emo];
  const data = PIECE_DATA[kind]() || {};
  const now = () => (look.faceSet[emo] && look.faceSet[emo][kind]) || '@';
  const button = id => {
    const pid = id === '@' ? spec.expr : id;
    const pic = el('div', { className: 'pic' });
    if (data[pid]) pic.style.backgroundImage = `url(${data[pid].src})`;
    const name = id === '@' ? '원작 그대로' : id === 'none' ? '없음' : (options.pieceNames && options.pieceNames[kind][id]) || ownerOf(id);
    const b = el('button', { type: 'button', className: 'thumb', ariaPressed: String(now() === id), title: name }, pic, el('span', { textContent: name }));
    b.dataset.id = id;
    if (now() === id) b.classList.add('on');
    b.onclick = () => {
      const cur = { ...(look.faceSet[emo] || {}) };
      if (id === '@') delete cur[kind]; else cur[kind] = id;
      const next = { ...look.faceSet };
      if (Object.keys(cur).length) next[emo] = cur; else delete next[emo];
      look.faceSet = next;
      for (const x of wrap.querySelectorAll('.thumb')) { const on = x.dataset.id === id; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }
      changed();
      clearTimeout(groupedPieces.t);
      groupedPieces.t = setTimeout(paintStrip, 300);
    };
    return b;
  };
  wrap.append(el('div', { className: 'thumbs piece' }, ...['@', ...(kind === 'brow' ? ['none'] : [])].map(button)));
  for (const g of options.facePieces[kind]) {
    wrap.append(el('div', { className: 'emo-row-title', textContent: `${g.label} (${g.ids.length})` }), el('div', { className: 'thumbs piece' }, ...g.ids.filter(id => data[id]).map(button)));
  }
  return wrap;
}
let stripBox = null;
function paintStrip() {
  if (!stripBox || !stripBox.isConnected) return;
  for (const b of stripBox.children) {
    const key = b.dataset.emo;
    b.classList.toggle('on', key === emo);
    b.setAttribute('aria-pressed', String(key === emo));
    makeEmoThumb(key).then(url => { if (url) b.firstChild.style.backgroundImage = `url(${url})`; });
  }
}
// 얼굴 갈래 맨 위의 감정 고르기 (얼굴 사진 6칸, 스크롤해도 위에 붙어 있다)
function emotionBar() {
  const F = options.faceSet;
  stripBox = el('div', { className: 'emo-strip' }, ...Object.entries(F).map(([key, spec]) => {
    const b = el('button', { type: 'button', ariaPressed: String(key === emo) }, el('div', { className: 'pic' }), el('span', { textContent: spec.label }));
    b.dataset.emo = key;
    b.onclick = () => { emo = key; previewExpr = key; showLook(look); renderBody(true); };
    return b;
  }));
  // 기본 얼굴 가져오기: 기본 칸에 골라 둔 눈·눈썹·입을 이 감정에 그대로 (이재헌님, 2026-11-17)
  const take = emo === 'normal' ? null : el('button', { type: 'button', className: 'take-base', textContent: '기본 얼굴 가져오기' });
  if (take) take.onclick = () => {
    const n = look.faceSet.normal || {};
    const base = options.faceSet.normal.expr;
    // 크기·높이도 기본 칸 그대로 (이 감정만 따로 바꾼 값을 지운다)
    look.faceSet[emo] = { eye: n.eye || base, brow: n.brow || base, mouth: n.mouth || base };
    thumbGen++;
    changed();
    renderBody(true);
  };
  if (take) take.textContent = '기본 얼굴 복사';
  setTimeout(paintStrip, 0);
  return [stripBox, take].filter(Boolean);
}
const HEAD_EXTRA = { ears: () => toggle('earTint', '포인트 색'), tail: () => toggle('tailTint', '포인트 색') };
const LIST_OF = { ears: 'ears', hair: 'hair', top: 'top', fur: 'fur', tail: 'tail', neck: 'neck', mark: 'mark', pattern: 'pattern' };

function renderBody(keepScroll) {
  const g = GROUPS.find(x => x.id === group);
  if (group !== 'face' && previewExpr) { previewExpr = null; showLook(look); }
  if (group === 'face' && previewExpr !== emo) { previewExpr = emo; showLook(look); }
  [...$('groups').children].forEach(b => { const on = b.dataset.key === group; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const part = partOf[group] && g.parts.some(p => p[0] === partOf[group]) ? partOf[group] : g.parts[0][0];
  // 항목 칸 나누기 (눈 | 눈썹 | 입 | 무늬). 한 번에 한 항목만 보여 부품 그림이 크게 들어간다
  $('parts').hidden = g.parts.length < 2;
  $('parts').replaceChildren(...g.parts.map(([id, label]) => {
    const b = el('button', { type: 'button', textContent: label, className: id === part ? 'on' : '' });
    b.setAttribute('aria-pressed', String(id === part));
    b.onclick = () => { partOf[group] = id; renderBody(); $('body').scrollTop = 0; };
    return b;
  }));
  // 감정 줄은 얼굴 갈래에서만 아이 옆에
  const rail = $('emoRail');
  rail.hidden = group !== 'face';
  rail.replaceChildren(...(group === 'face' ? emotionBar() : []));
  const top = $('body').scrollTop;
  if (seen) { seen.disconnect(); seen = null; }
  const [id, label] = g.parts.find(p => p[0] === part);
  const emoLabel = group === 'face' && id !== 'mark' ? `${options.faceSet[emo].label} 표정의 ${label}` : (g.parts.length < 2 ? label : null);
  const head = emoLabel || HEAD_EXTRA[id] ? el('h3', {}, el('span', { textContent: emoLabel || '' }), HEAD_EXTRA[id] ? HEAD_EXTRA[id]() : null) : null;
  $('body').replaceChildren(el('section', { className: 'sec', id: `sec-${id}` }, ...(head ? [head] : []), PART_VIEW[id]()));
  if (keepScroll) $('body').scrollTop = top;
}

function randomize() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const maybe = (key, p) => { look[key] = Math.random() < p ? pick(options[key].filter(x => x.id !== 'none')).id : 'none'; };
  look.skin = pick(options.skin);
  look.color2 = pick(options.color2);
  look.body = pick(options.body).id;
  look.ears = pick(options.ears).id;
  look.tail = pick(options.tail).id;
  for (const [k, p] of [['hair', 0.35], ['top', 0.35], ['fur', 0.25], ['mark', 0.3], ['pattern', 0.4]]) maybe(k, p);
  look.neck = 'none';
  look.earTint = Math.random() < 0.25;
  look.tailTint = Math.random() < 0.3;
  look.brow = 'scan';
  look.mouth = 'scan';
  look.faceSet = {};
  look.eyeSize = 0.85 + Math.round(Math.random() * 8) * 0.05;
  applyQuiz(QUIZ.map(() => (Math.random() < 0.5 ? 0 : 1)));
  thumbGen++;
  renderBody(true);
  changed();
}
async function submit() {
  const name = $('nameInput').value.trim();
  const error = $('error');
  error.textContent = '';
  if (!name) {
    error.textContent = '이름을 지어 주세요.';
    $('nameInput').focus();
    return;
  }
  const btn = $('doneBtn');
  btn.disabled = true;
  btn.textContent = '저장 중…';
  try {
    if (editing) {
      await api('/me/look', { method: 'PUT', body: { name, look, traits } });
      rememberKid(kidId(), null, name);
      editing = false;
      await enterHome();
    } else {
      const made = await api('/residents', { method: 'POST', body: { name, look, traits } });
      writeToken(made.token);
      setKid(made.id);
      rememberKid(made.id, made.token, name);
      showKey(made.key, name, true);
    }
  } catch (e) {
    error.textContent = e.message;
  }
  btn.disabled = false;
  btn.textContent = doneLabel();
}
// 한 화면만 보인다: 시작 · 꾸미기 · 소식
const doneLabel = () => '완성';
// 로딩 화면 걷기. 첫 화면은 마을이 다 준비된 뒤에 걷는다 (예전 들판·판이 먼저 보였다 사라지지 않게, 2026-11-18)
function hideBoot() {
  const boot = $('boot');
  if (boot && !boot.classList.contains('gone')) { boot.classList.add('gone'); setTimeout(() => boot.remove(), 450); }
}
function showOnly(id) {
  if (id !== 'start') hideBoot();
  for (const p of ['start', 'birth', 'home', 'room', 'keyView', 'keyIn', 'photo', 'kids', 'gallery']) if ($(p)) $(p).hidden = p !== id;
  if (id !== 'start' && typeof Plaza !== 'undefined' && Plaza.on) Plaza.leave();
  if (id !== 'start' && typeof TitleVillage !== 'undefined' && TitleVillage.on) TitleVillage.leave();
  if (id !== 'room' && typeof House !== 'undefined' && House.on) House.leave();
  $('topBar').hidden = id !== 'birth';
  document.body.classList.toggle('birthing', id === 'birth');
  if (id !== 'birth' && $('emoRail')) $('emoRail').hidden = true;
  $('viewBar').hidden = id !== 'birth';
  $('liveCount').hidden = id !== 'start' || !$('liveCount').textContent;
  $('error').textContent = '';
}
// 이 기기에 모아 둔 아이 열쇠 중 서버에 없는 아이(지워진 아이)는 잊는다
async function pruneWallet() {
  const w = wallet();
  for (const [id, v] of Object.entries(w)) {
    if (!v || !v.token) { delete w[id]; continue; }
    try {
      const r = await fetch(`${window.VILLAGE_API || ''}/api/me`, { headers: { authorization: `Bearer ${v.token}` } });
      if (r.status === 401) delete w[id];
    } catch (e) { /* 연결이 안 되면 그대로 둔다 */ }
  }
  saveWallet(w);
}
async function kidExists() {
  await pruneWallet();
  if (readToken()) { try { await api('/me'); return true; } catch (e) { if (e.status !== 401) return true; writeToken(null); } }
  return Object.keys(wallet()).length > 0;
}
async function enterStart() {
  showOnly('start');
  // 첫 화면은 실제 마을 하나만: 아이들을 한 명씩 따라간다. 준비될 때까지는 로딩 화면이 덮고 있다.
  // 마을을 못 세우면(오래된 기기 등) 그때만 예전 들판으로
  TitleVillage.enter().then(ok => {
    if ($('start').hidden) return;
    if (ok) document.documentElement.style.setProperty('--start-h', `${$('start').offsetHeight}px`);
    else { showLook(look); Plaza.enter(); }
    hideBoot();
  });
  $('titleWho').onclick = () => TitleVillage.openStar();
  // 이 기기(계정)에 아이가 있으면 바로 보러 가기. 열쇠만 있고 아이가 없을 수 있어(구글·익명 계정, 지워진 아이) 서버에 물어본다
  const paintKid = hasKid => {
    $('mineBtn').hidden = !hasKid;
    $('makeBtn').classList.toggle('main', !hasKid);
    $('makeBtn').textContent = hasKid ? '아이 하나 더 만들기' : '내 아이 만들기';
  };
  paintKid(false);
  kidExists().then(paintKid);
  $('mineBtn').onclick = () => {
    const w = Object.keys(wallet());
    if (!readToken() && w.length) useKid(w[0]);
    enterHome().catch(() => { $('error').textContent = '내 아이를 찾지 못했어요. 열쇠로 불러와 주세요.'; });
  };
  $('makeBtn').onclick = () => enterBirth().catch(() => { $('error').textContent = '마을에 연결하지 못했어요.'; });
  $('keyBtn').onclick = () => enterKeyIn();
  $('galleryBtn').onclick = () => Gallery.enter({ from: 'start' }).catch(e => { $('error').textContent = e.message; });
  if (window.VillageAuth && VillageAuth.firebase) {
    $('googleRow').hidden = false;
    $('googleBtn').onclick = () => VillageAuth.google().catch(() => { $('error').textContent = '구글 로그인을 하지 못했어요.'; });
  }
  try {
    const h = await (await fetch(`${window.VILLAGE_API || ''}/api/health`)).json();
    PRELAUNCH = !!(h && h.prelaunch);
    $('watchLink').hidden = PRELAUNCH;
    $('startLead').innerHTML = PRELAUNCH ? '나만의 아이를 꾸며 두면<br>먼작귀 빌리지가 열릴 때 함께 입주해요' : '작은 아이를 마을에 보내고<br>오늘 하루를 지켜보는 이야기';
    $('startFine').textContent = PRELAUNCH ? '먼작귀 빌리지 선공개 · 아이는 한 계정에 3명까지' : '아이는 한 사람에 한 명이에요';
    if (PRELAUNCH && h.kids) $('liveCount').textContent = `벌써 ${h.kids}명의 아이가 입주를 기다려요`;
    else if (!PRELAUNCH && h && h.residents) $('liveCount').textContent = `지금 주민 ${h.residents}명이 살고 있어요`;
    $('liveCount').hidden = $('start').hidden || !$('liveCount').textContent;
  } catch (e) { /* 숫자는 없어도 된다 */ }
}
async function enterBirth(edit) {
  options = await api('/look-options');
  // 빠진 부품(목·가방, 푹신 꼬리)은 다시 꾸밀 때 「없음」으로
  if (edit && edit.look) { edit.look.neck = 'none'; if (!options.tail.some(o => o.id === edit.look.tail)) edit.look.tail = 'none'; }
  PRELAUNCH = !!options.prelaunch;
  editing = !!edit;
  if (edit) {
    Object.assign(look, { faceSet: {} }, edit.look);
    for (const k of ['mbti', 'answers']) delete traits[k];
    Object.assign(traits, edit.traits || {});
    $('nameInput').value = edit.name || '';
    thumbGen++;
  }
  showOnly('birth');
  if (!options.free && !editing) $('error').textContent = '마을이 꽉 찼어요. 자리가 나면 다시 와 주세요.';
  $('doneBtn').disabled = !options.free && !editing;
  $('doneBtn').textContent = doneLabel();
  const count = () => { $('nameCount').textContent = `${[...$('nameInput').value].length}/8`; };
  $('nameInput').oninput = count;
  count();
  $('groups').replaceChildren(...GROUPS.map(g => {
    const ic = el('span', { className: 'ic' });
    ic.innerHTML = g.icon;                          // 위 표에 적어 둔 고정 그림만 넣는다
    const b = el('button', { type: 'button', onclick: () => { group = g.id; setView(g.view); renderBody(); $('body').scrollTop = 0; } }, ic, g.label);
    b.dataset.key = g.id;
    return b;
  }));
  $('randomBtn').onclick = randomize;
  // 돌아가기: 다시 꾸미기면 내 아이 방(저장하지 않음), 처음 만들기면 첫 화면
  $('birthBack').onclick = () => { if (editing) { editing = false; enterHome().catch(e => { $('error').textContent = e.message; }); } else enterStart(); };
  $('drawerHandle').onclick = () => { const t = $('birth').classList.toggle('tall'); document.body.classList.toggle('tallbirth', t); };
  $('undoBtn').onclick = back;
  $('doneBtn').onclick = submit;
  renderBody();
  lastSnap = snapshot();
  showLook(look);
}

/* ---------- 내 아이 ---------- */

const NEED_LABEL = { hunger: '배부름', energy: '기력', fun: '즐거움', social: '친구', hygiene: '청결' };
const NEED_COLOR = { hunger: '#f0a24e', energy: '#f2cf4a', fun: '#7cc08a', social: '#ee8fa4', hygiene: '#6fb0dc' };
let homeTimer = 0;
// 욕구 평균으로 기분 한마디 [문장, 짧게]
function moodOf(needs) {
  const v = Object.keys(NEED_LABEL).map(k => needs[k] || 0);
  const avg = v.reduce((x, y) => x + y, 0) / v.length;
  return avg >= 70 ? ['기분 좋아요', '좋음'] : avg >= 45 ? ['그럭저럭이에요', '보통'] : ['조금 지쳤어요', '지침'];
}
function paintHome(me) {
  const r = me.resident;
  const mood = moodOf(r.needs);
  $('homeName').textContent = r.name;
  $('homeMood').textContent = mood[0];
  $('doing').textContent = r.doing || '걸어가는 중';
  const stat = (label, value) => el('div', {}, el('span', { textContent: label }), el('b', { textContent: value }));
  $('stats').replaceChildren(stat('가진 돈', `${(r.money || 0).toLocaleString('ko-KR')}원`), stat('기분', mood[1]), stat('새 소식', `${me.unseen || 0}개`));
  $('meters').replaceChildren(...Object.entries(NEED_LABEL).map(([k, label]) => {
    const fill = el('u');
    fill.style.width = `${r.needs[k]}%`;
    fill.style.background = NEED_COLOR[k];
    return el('div', { className: 'meter' }, el('span', { textContent: label }), el('i', { role: 'img', ariaLabel: `${label} ${r.needs[k]}` }, fill));
  }));
}
async function loadLetters() {
  const box = await api('/inbox');
  const past = (await api('/history')).events.filter(e => e.seen);
  // 일기 한 줄: 시각 · 점 · 글 (누르면 그 장면을 마을에서 다시 본다)
  const item = e => el('li', { className: e.weight >= 3 ? 'big' : '' },
    el('time', { textContent: `${e.day}일째 ${e.clock}` }), el('span', { className: 'dot' }),
    el('a', { href: `/village#replay=${e.id}` }, e.text, el('small', { textContent: '장면 보기 ›' })));
  // 새 소식은 중요한 것부터 10개를 이어서 본다
  const best = [...box.events].sort((a, b) => b.weight - a.weight || b.id - a.id).slice(0, 10).sort((a, b) => a.id - b.id);
  $('letters').replaceChildren(...[
    el('h3', {}, '오늘의 일기', el('small', { textContent: box.total ? `없는 동안 ${box.total}가지 일` : '새 소식 없음' })),
    best.length ? el('a', { className: 'btn playAll', href: `/village#replay=${best.map(e => e.id).join(',')}`, textContent: '있었던 일 이어서 보기' }) : null,
    box.events.length ? el('ol', { className: 'tl' }, ...[...box.events].reverse().map(item)) : el('p', { className: 'quiet', textContent: '아직 새 소식이 없어요. 마을에서 지내다 보면 일기가 쌓여요.' }),
    past.length ? el('h3', { textContent: '지난 일기' }) : null,
    past.length ? el('ol', { className: 'tl' }, ...[...past].reverse().map(item)) : null,
  ].filter(Boolean));
  // 화면에 띄운 뒤에야 읽음 처리한다
  if (box.events.length) await api('/inbox/ack', { method: 'POST', body: { upto: box.events[box.events.length - 1].id } });
}
async function enterHome() {
  const me = await api('/me');
  if (me.prelaunch) { PRELAUNCH = true; return enterRoom(me); }
  showOnly('home');
  setView('front');
  showLook(me.look);
  paintHome(me);
  await loadLetters();
  clearInterval(homeTimer);
  homeTimer = setInterval(() => { api('/me').then(paintHome).catch(() => {}); }, 5000);
}

/* ---------- 선공개: 아이 열쇠 · 내 아이 방 (2026-11-17) ---------- */

// 열쇠 QR: 찍으면 이 페이지가 「열쇠로 불러오기」에 열쇠를 채운 채로 열린다.
// 열쇠는 주소의 # 뒤에 둔다 (서버로 가지 않아 기록에 남지 않는다). 라이브러리가 없으면 QR만 숨긴다
const keyLink = key => `${location.origin}${location.pathname}#key=${normKeyText(key)}`;
const normKeyText = k => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.+)$/, '$1-$2');
function drawQr(cv, text, size) {
  if (typeof qrcode !== 'function') return false;
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount(), quiet = 2, cell = Math.floor(size / (n + quiet * 2));
  const w = cell * (n + quiet * 2);
  cv.width = w; cv.height = w;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff8e8'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#4a3230';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
  return true;
}

// 열쇠를 그림으로 만든다 (사진으로 저장해 두게)
function keyCard(key, name) {
  const c = document.createElement('canvas');
  c.width = 720; c.height = 400;
  const g = c.getContext('2d');
  g.fillStyle = '#fff8e8'; g.fillRect(0, 0, 720, 400);
  g.strokeStyle = '#4a3230'; g.lineWidth = 8; g.strokeRect(14, 14, 692, 372);
  const qr = document.createElement('canvas');
  const hasQr = drawQr(qr, keyLink(key), 220);
  const cx = hasQr ? 262 : 360;
  g.fillStyle = '#4a3230'; g.textAlign = 'center';
  g.font = '34px Jua, sans-serif'; g.fillText(`${name}의 아이 열쇠`, cx, 96);
  g.font = `bold ${hasQr ? 70 : 84}px "Courier New", monospace`; g.fillText(key, cx, 210);
  g.font = '20px "Gowun Dodum", sans-serif'; g.fillStyle = '#7a5a50';
  g.fillText('다른 기기에서 「열쇠로 불러오기」에 넣거나', cx, 270);
  g.fillText(hasQr ? 'QR을 찍으면 내 아이를 다시 만나요' : '내 아이를 다시 만나요', cx, 300);
  g.fillText('먼작귀 빌리지 · 팬 제작', cx, 350);
  if (hasQr) g.drawImage(qr, 470, 90, 210, 210);
  return c;
}
function showKey(key, name, fresh) {
  showOnly('keyView');
  setView('front');
  $('keyTitle').textContent = fresh ? `${name}, 반가워요!` : '새 아이 열쇠';
  $('keyText').textContent = key;
  const shown = drawQr($('keyQr'), keyLink(key), 220);
  $('keyQr').hidden = !shown;
  $('keyQrNote').hidden = !shown;
  $('keyLead').textContent = fresh
    ? (PRELAUNCH ? '먼작귀 빌리지가 열리면 이 아이가 마을에 입주해요. 다른 기기에서 다시 만나려면 아래 열쇠를 꼭 저장해 두세요.' : '다른 기기에서 다시 만나려면 아래 열쇠를 저장해 두세요.')
    : '예전 열쇠는 이제 쓸 수 없어요. 새 열쇠를 저장해 두세요.';
  $('keySave').onclick = () => {
    const a = el('a', { download: `아이열쇠-${name}.png`, href: keyCard(key, name).toDataURL('image/png') });
    document.body.append(a); a.click(); a.remove();
  };
  $('keyCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(key); $('keyCopy').textContent = '복사했어요'; } catch (e) { $('keyCopy').textContent = '길게 눌러 복사해 주세요'; }
  };
  $('keyCopy').textContent = '열쇠 복사';
  $('keyNext').onclick = () => enterHome().catch(e => { $('error').textContent = e.message; });
}
function enterKeyIn(prefill) {
  showOnly('keyIn');
  $('keyInput').value = prefill ? normKeyText(prefill) : '';
  $('keyErr').textContent = '';
  $('keyInput').oninput = () => { $('keyErr').textContent = ''; };
  $('keyInput').focus();
  $('keyBack').onclick = () => enterStart();
  $('keyGo').onclick = async () => {
    $('keyErr').textContent = '';
    try {
      const r = await api('/key', { method: 'POST', body: { key: $('keyInput').value } });
      if (r.token) writeToken(r.token);
      setKid(r.id);
      rememberKid(r.id, r.token, r.name);
      await enterHome();
    } catch (e) { $('keyErr').textContent = e.message; }
  };
}
let roomMe = null;
function enterRoom(me) {
  roomMe = me;
  clearInterval(homeTimer);
  showOnly('room');
  setView('front');
  showLook(me.look);
  // 내 아이는 자기 집에서 스스로 생활한다 (지켜보기만)
  House.enter(me).catch(e => { console.warn('[집]', e); House.leave(); });
  $('roomName').textContent = me.resident.name;
  $('roomType').textContent = mbtiLabel(me.traits);
  $('roomType').hidden = !me.traits || !me.traits.mbti;
  // 계정이면 서버가 아이 목록을 준다. 계정이 없으면 이 기기에 모아 둔 아이들을 합친다
  rememberKid(me.resident.id, readToken(), me.resident.name);
  const kids = [...(me.kids || [])];
  if (!usesAccount()) for (const [id, v] of Object.entries(wallet())) if (!kids.some(k => k.id === id)) kids.push({ id, name: v.name || '내 아이' });
  // 아이가 여럿이면 바꿔 보기
  $('roomKids').hidden = kids.length < 2;
  $('roomKids').replaceChildren(...kids.map(k => {
    const b = el('button', { type: 'button', textContent: k.name, className: k.id === me.resident.id ? 'on' : '' });
    b.onclick = () => {
      useKid(k.id);
      enterHome().catch(e => {
        if (e.status === 401) { forgetKid(k.id); useKid(me.resident.id); enterHome(); }     // 없어진 아이
        else $('error').textContent = e.message;
      });
    };
    return b;
  }));
  $('roomPhoto').disabled = false;
  $('roomPhoto').textContent = '포토존';
  $('roomPhoto').onclick = () => Photo.enter(me).catch(e => { $('error').textContent = e.message; });
  $('roomGallery').onclick = () => Gallery.enter({ from: 'room' }).catch(e => { $('error').textContent = e.message; });
  $('roomAll').onclick = () => enterKids(me).catch(e => { $('error').textContent = e.message; });
  $('roomEdit').onclick = () => enterBirth({ look: me.look, traits: me.traits, name: me.resident.name }).catch(e => { $('error').textContent = e.message; });
  $('roomKey').onclick = async () => { try { const r = await api('/me/key', { method: 'POST' }); showKey(r.key, me.resident.name, false); } catch (e) { $('error').textContent = e.message; } };
  $('roomMore').hidden = kids.length >= 3;
  $('roomMore').onclick = () => {
    // 새 아이는 처음 생김새·성격에서 시작
    for (const k of Object.keys(look)) delete look[k];
    Object.assign(look, JSON.parse(LOOK0));
    for (const k of Object.keys(traits)) delete traits[k];
    Object.assign(traits, JSON.parse(TRAITS0));
    undo.length = 0;
    thumbGen++;
    $('nameInput').value = '';
    setKid('');
    enterBirth().catch(e => { $('error').textContent = e.message; });
  };
  $('roomGoogle').hidden = !(window.VillageAuth && VillageAuth.firebase && VillageAuth.user() && VillageAuth.user().isAnonymous);
  $('roomGoogle').onclick = () => VillageAuth.google().catch(() => { $('error').textContent = '구글 로그인을 하지 못했어요.'; });
}

/* ---------- 성격 질문 · MBTI (2026-11-17, 이재헌님) ---------- */
// 「아이는 어떻게 행동하나요?」 둘 중 하나를 고르면 MBTI 유형과 마을에서 쓰는 성격(대담함·다정함·식탐·성실함)이 정해진다.
// axis: 이 질문이 정하는 MBTI 글자 [A를 고르면, B를 고르면]. fx: 성격 값을 얼마나 옮기는지 [A, B]
const QUIZ = [
  { q: '처음 보는 친구를 만나면?', a: '먼저 「안녕!」 하고 말을 건다', b: '친구 뒤에 숨어서 살짝 본다', axis: ['E', 'I'], fx: [{ social: 0.25 }, { social: -0.1, brave: -0.1 }] },
  { q: '쉬는 날에는?', a: '친구들이랑 들판으로 소풍', b: '집에서 혼자 뒹굴뒹굴', axis: ['E', 'I'], fx: [{ social: 0.2 }, { social: -0.15 }] },
  { q: '처음 해 보는 알바는?', a: '설명을 꼼꼼히 듣고 그대로 한다', b: '일단 해 보면서 익힌다', axis: ['S', 'N'], fx: [{ diligent: 0.15 }, { brave: 0.1 }] },
  { q: '하늘의 구름을 보면?', a: '「내일 비 오려나…」', b: '「저건 푸딩 모양이야!」', axis: ['S', 'N'], fx: [{}, {}] },
  { q: '친구가 시험에 떨어졌다면?', a: '다음엔 어떻게 할지 같이 정해 준다', b: '꼭 안아 주고 같이 운다', axis: ['T', 'F'], fx: [{ diligent: 0.1 }, { social: 0.15 }] },
  { q: '맛있는 걸 나눌 때는?', a: '똑같이 정확하게 나눈다', b: '친구에게 큰 쪽을 준다', axis: ['T', 'F'], fx: [{}, { social: 0.1 }] },
  { q: '들판에서 무서운 괴물을 만나면?', a: '사스마타를 꼭 쥐고 맞선다', b: '엉엉 울면서 도망간다', axis: null, fx: [{ brave: 0.35 }, { brave: -0.3 }] },
  { q: '내일 할 일은?', a: '미리 정해서 적어 둔다', b: '그날 기분 따라 정한다', axis: ['J', 'P'], fx: [{ diligent: 0.2 }, { diligent: -0.15 }] },
  { q: '방 정리는?', a: '매일 깔끔하게', b: '생각날 때 한 번에', axis: ['J', 'P'], fx: [{ diligent: 0.15 }, { diligent: -0.1 }] },
  { q: '라멘 가게에서는?', a: '곱빼기에 차슈 추가!', b: '보통 한 그릇이면 충분', axis: null, fx: [{ appetite: 0.35 }, { appetite: -0.2 }] },
];
const MBTI_NAME = {
  ENFP: '반짝반짝 모험가', ENFJ: '다정한 응원단장', ENTP: '엉뚱한 발명가', ENTJ: '씩씩한 대장', ESFP: '신나는 분위기 메이커', ESFJ: '살뜰한 챙김이', ESTP: '겁 없는 행동파', ESTJ: '척척 알바왕',
  INFP: '꿈꾸는 몽상가', INFJ: '조용한 마음지기', INTP: '궁금쟁이 연구가', INTJ: '차분한 작전가', ISFP: '포근한 예술가', ISFJ: '묵묵한 지킴이', ISTP: '손재주 장인', ISTJ: '꼼꼼한 성실이',
};
// 답 → MBTI · 성격 값. 한 글자를 두 질문이 정하는데 반반이면 앞 질문을 따른다
function applyQuiz(ans) {
  const t = { brave: 0.5, social: 0.5, appetite: 0.5, diligent: 0.5 };
  const votes = {};
  QUIZ.forEach((item, i) => {
    const v = ans[i];
    if (v !== 0 && v !== 1) return;
    for (const [k, d] of Object.entries(item.fx[v])) t[k] = Math.min(1, Math.max(0, t[k] + d));
    if (item.axis) { const key = item.axis.join(''); (votes[key] = votes[key] || []).push(item.axis[v]); }
  });
  const letter = pair => { const vs = votes[pair.join('')] || []; if (!vs.length) return null; const n = vs.filter(x => x === pair[0]).length; return n * 2 > vs.length ? pair[0] : n * 2 < vs.length ? pair[1] : vs[0]; };
  const L = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']].map(letter);
  Object.assign(traits, t, { answers: ans.slice() });
  if (L.every(Boolean)) traits.mbti = L.join(''); else delete traits.mbti;
}
const mbtiLabel = tr => (tr && tr.mbti ? `${tr.mbti} · ${MBTI_NAME[tr.mbti]}` : '');
function quiz() {
  const ans = Array.isArray(traits.answers) ? traits.answers.slice(0, QUIZ.length) : [];
  const done = () => QUIZ.every((_, i) => ans[i] === 0 || ans[i] === 1);
  const result = el('div', { className: 'mbti-card' });
  const paintResult = () => {
    const n = QUIZ.filter((_, i) => ans[i] === 0 || ans[i] === 1).length;
    if (!done()) { result.replaceChildren(el('b', { textContent: `아이는 어떻게 행동하나요? (${n}/${QUIZ.length})` }), el('span', { textContent: '답을 다 고르면 성격 유형이 정해져요.' })); return; }
    const bars = TRAITS.map(([k, label]) => el('div', { className: 'mbar' }, el('span', { textContent: label }), el('i', { style: `--v:${Math.round(traits[k] * 100)}%` })));
    result.replaceChildren(el('small', { textContent: '우리 아이 성격 유형' }), el('b', { textContent: traits.mbti || '' }), el('span', { textContent: MBTI_NAME[traits.mbti] || '' }), el('div', { className: 'mbars' }, ...bars));
  };
  const cards = QUIZ.map((item, i) => {
    const btn = (v, text) => {
      const b = el('button', { type: 'button', className: ans[i] === v ? 'on' : '', textContent: text });
      b.setAttribute('aria-pressed', ans[i] === v);
      b.onclick = () => { ans[i] = v; applyQuiz(ans); [...b.parentNode.children].forEach((x, j) => { x.classList.toggle('on', j === v); x.setAttribute('aria-pressed', j === v); }); paintResult(); };
      return b;
    };
    return el('div', { className: 'qcard' }, el('p', { textContent: `${i + 1}. ${item.q}` }), el('div', { className: 'qopts' }, btn(0, item.a), btn(1, item.b)));
  });
  paintResult();
  return el('div', { className: 'quiz' }, result, ...cards, el('p', { className: 'quiet', textContent: '성격에 따라 마을에서 하루를 보내는 방법이 달라져요. 용감한 아이는 괴물에게 맞서고, 다정한 아이는 친구를 자주 불러요.' }));
}

/* ---------- 내 아이들 모아 보기 (2026-11-17) ---------- */
// 아이 하나를 정면 전신으로 찍는다 (꾸미기 선택지 사진과 같은 작은 그림판)
function kidPortrait(lk) {
  thumbQueue = thumbQueue.then(async () => {
    const built = buildCharacter(presetFromLook(lk), { faceWidth: 256 });
    built.root.rotation.y = 0.25;
    thumbScene.add(built.root);
    thumbCam.position.set(0, 1.3, 5.1);
    thumbCam.lookAt(0, 1.05, 0);
    await new Promise(r => setTimeout(r, 60));
    thumbRenderer.render(thumbScene, thumbCam);
    const url = thumbRenderer.domElement.toDataURL('image/jpeg', 0.85);
    thumbScene.remove(built.root);
    if (built.dispose) built.dispose();
    return url;
  });
  return thumbQueue;
}
// 계정이 없을 때 이 기기에 모아 둔 다른 아이의 모습은 그 아이 토큰으로 묻는다
async function lookOfWalletKid(id) {
  const w = wallet()[id];
  if (!w || !w.token) return null;
  try {
    const res = await fetch(`${window.VILLAGE_API || ''}/api/me`, { headers: { authorization: `Bearer ${w.token}` } });
    if (res.status === 401) { forgetKid(id); return null; }
    const d = await res.json();
    return d && d.look ? { id, name: d.resident.name, look: d.look } : null;
  } catch (e) { return null; }
}
async function enterKids(me) {
  showOnly('kids');
  setView('front');
  const kids = (me.kids || []).map(k => ({ id: k.id, name: k.name, look: k.look }));
  if (!usesAccount()) for (const id of Object.keys(wallet())) if (!kids.some(k => k.id === id)) { const k = await lookOfWalletKid(id); if (k) kids.push(k); }
  const cards = kids.map(k => {
    const img = el('div', { className: 'ph', textContent: '…' });
    const b = el('button', { type: 'button', className: `kidcard${k.id === me.resident.id ? ' on' : ''}` }, img, el('span', { textContent: k.name }), el('small', { textContent: k.id === me.resident.id ? '지금 보는 아이' : '방으로 가기' }));
    b.onclick = () => { useKid(k.id); enterHome().catch(e => { $('error').textContent = e.message; }); };
    if (k.look) kidPortrait(k.look).then(url => { if (url) img.replaceWith(el('img', { src: url, alt: `${k.name}의 모습` })); });
    return b;
  });
  if (kids.length < 3) {
    const b = el('button', { type: 'button', className: 'kidcard' }, el('div', { className: 'ph', textContent: '+' }), el('span', { textContent: '새 아이' }), el('small', { textContent: `${kids.length}/3명` }));
    b.onclick = () => $('roomMore').onclick();
    cards.push(b);
  }
  $('kidsGrid').replaceChildren(...cards);
  $('kidsBack').onclick = () => enterHome().catch(e => { $('error').textContent = e.message; });
}

(async function start() {
  // 뒤에 붙은 파일(photo.js·gallery.js)까지 다 읽힌 뒤 시작한다
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  // 공유 링크(#p=사진 id)로 열면: 갤러리에서 그 사진을 크게
  const fromShare = /(?:^|[#&])p=(p[0-9a-f]{12})/.exec(location.hash);
  if (fromShare) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 주소를 못 바꿔도 된다 */ }
    showLook(look);
    return Gallery.enter({ from: readToken() ? 'room' : 'start', open: fromShare[1] }).catch(() => enterStart());
  }
  // QR로 열면: 주소의 열쇠를 지우고(뒤로 가기·공유에 남지 않게) 열쇠 칸에 채워 둔다
  const fromQr = /(?:^|[#&])key=([A-Za-z0-9-]{8,9})/.exec(location.hash);
  if (fromQr) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 주소를 못 바꿔도 된다 */ }
    showLook(look);
    return enterKeyIn(fromQr[1]);
  }
  try {
    if (window.VillageAuth && VillageAuth.ready) await Promise.race([VillageAuth.ready, new Promise(r => setTimeout(r, 6000))]).catch(() => {});
    // 아이가 있어도 새로 열면 늘 첫 화면(타이틀)부터 (2026-11-18 이재헌님). 내 아이는 「내 아이 보러 가기」로 간다
    await enterStart();
  } catch (e) {
    $('error').textContent = '마을에 연결하지 못했어요';
  }
}());
