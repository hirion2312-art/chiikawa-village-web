'use strict';
// 먼작귀 빌리지 선공개 — 포토존 (2026-11-17)
// birth.js의 3D 무대(scene·camera·renderer·ground)를 그대로 쓴다. 이 파일은 birth.js 다음에 읽는다.
//  - 장소: 들판 · 마을 광장 · 라멘 가게 「로」 (이재헌님 결정). 장소 모델은 고를 때만 받는다
//  - 자리 다섯 칸: 앞 2 · 뒤 3. 내 아이 + 원작 친구 최대 3명 (원작 모델·얼굴 그대로)
//  - 무대 위 아이를 끌어 다른 칸에 놓으면 자리가 바뀐다 (차 있으면 서로 바꿈). 돌리기 버튼으로 방향
//  - 표정: 내 아이는 감정 6칸, 친구는 원작 표정 (포즈는 이재헌님 결정으로 뺌, 2026-11-17)
//  - 인생네컷: 3초 세고 찰칵 × 4, 장 사이에 표정을 바꾼다. 띠 색(흰·분홍·하늘·검정)을 골라 저장
// 사진 보내기: 휴대폰은 공유창(카톡·인스타·X·사진 앱), 안 되면 내려받기
async function shareImage(blob, name, text) {
  const file = new File([blob], name, { type: blob.type || 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: '먼작귀 빌리지', text }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  const a = el('a', { download: name, href: URL.createObjectURL(blob) });
  document.body.append(a); a.click(); a.remove();
  return 'saved';
}
const Photo = (() => {
  const FRIENDS = ['chiikawa', 'hachiware', 'usagi', 'momonga', 'rakko', 'shisa', 'kurimanju', 'furuhonya'];
  const MAX_FRIENDS = 3;
  const SLOTS = [
    { x: -0.95, z: 0.85, label: '앞 왼쪽' }, { x: 0.95, z: 0.85, label: '앞 오른쪽' },
    { x: -1.85, z: -0.55, label: '뒤 왼쪽' }, { x: 0, z: -0.75, label: '뒤 가운데' }, { x: 1.85, z: -0.55, label: '뒤 오른쪽' },
  ];
  // 장소: 모델은 무대 뒤에 세운다 (앞면이 카메라 쪽 +z). 바닥 판 색도 장소에 맞춘다 [테두리, 판, 가운데]
  const PLACES = {
    field: { label: '들판', ground: ['#4a3230', '#c9e8a8', '#a9d088'] },
    plaza: { label: '마을 광장', glb: 'assets/glb/plaza-set.glb', pos: [0.4, 0, -4.6], scale: 0.38, ground: ['#4a3230', '#ece0c8', '#dccbac'] },
    ramen: { label: '라멘 가게 「로」', glb: 'assets/glb/ramenro.glb', pos: [0, 0, -6.6], scale: 0.42, ground: ['#4a3230', '#dcd6cc', '#cbc4b8'] },
    // 단색 (2026-11-18 이재헌님): 바닥·들판 그림 없이 고른 색 한 장. 색은 아래 판에서 마음대로
    solid: { label: '단색', solid: true, ground: ['#4a3230', '#c9e8a8', '#a9d088'] },
  };
  const SOLID_COLORS = ['#fde2e4', '#ffd6a5', '#fff1b6', '#d8f3dc', '#cdeaf7', '#e2d9f3', '#ffffff', '#f4ece0', '#2b2321'];
  const KID_FACES = [['normal', '기본'], ['joy', '기쁨'], ['cry', '울음'], ['panic', '놀람'], ['nope', '화남'], ['sleep', '졸림']];
  const STRIPS = { white: ['흰색', '#ffffff', '#4a3230'], pink: ['분홍', '#f7c6cf', '#4a3230'], sky: ['하늘', '#bfe3f2', '#2f4a5a'], black: ['검정', '#2b2321', '#fff7ec'] };
  const TURN = Math.PI / 6;
  const state = { on: false, me: null, members: [], selected: null, facesReady: false, place: 'field', placeObj: null, tab: 'face', shoot: null, mode: 'four', zoom: 1, zc: 1, solid: '#fde2e4' };
  // 확대: 1×~2.2× (단추 1×·1.5×·2×, 두 손가락 벌리기, 마우스 휠). birth.js aimCamera가 state.zc만큼 다가간다
  const ZMIN = 1, ZMAX = 2.2;
  const setZoom = z => { state.zoom = Math.max(ZMIN, Math.min(ZMAX, z)); paintZoom(); };
  function paintZoom() {
    for (const b of $p('photoZoom').children) b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.z) - state.zoom) < 0.13));
  }

  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
  const loaded = {};
  // 아이 집(home.js)이 이미 불러온 파일은 다시 읽지 않는다 (같은 이름을 두 번 선언하면 오류)
  window.loadOnce = window.loadOnce || (src => { const old = document.querySelector(`script[src="${src}"]`); if (old) return old.dataset.ok || !old.dataset.dyn ? Promise.resolve() : new Promise((ok, no) => { old.addEventListener('load', ok); old.addEventListener('error', no); }); return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.dataset.dyn = '1'; s.onload = () => { s.dataset.ok = '1'; ok(); }; s.onerror = no; document.head.append(s); }); });
  const need = src => (loaded[src] = loaded[src] || loadOnce(src));

  /* ---------- 원작 친구 얼굴: 포토존에 들어올 때 나머지 얼굴 파일을 받는다 ---------- */
  async function ensureFaces() {
    if (state.facesReady) return;
    await ensureAllFaces();
    const want = FRIENDS.map(id => (characterEntry(id).preset || {}).expression).filter(Boolean);
    const have = new Set(FACE_SCAN_META.faces.map(f => f.id));
    for (const f of (window.ALL_FACE_META || [])) {
      if (have.has(f.id) || !FACE_SCAN_IMAGES[f.id]) continue;
      FACE_SCAN_META.faces.push(f);
      EXPRESSIONS.push(f);
      have.add(f.id);
    }
    await Promise.all(want.map(loadFace));
    state.facesReady = true;
  }
  // 표정 그림 하나를 읽어 둔다 (다 읽힌 뒤 바꿔야 얼굴이 비지 않는다)
  function loadFace(id) {
    return new Promise(ok => {
      if (scanImages[id] || !FACE_SCAN_IMAGES[id]) return ok();
      const im = new Image();
      im.onload = () => { scanImages[id] = typeof fixScanImage === 'function' ? fixScanImage(id, im) : im; scanWaiters.splice(0).forEach(fn => fn()); ok(); };
      im.onerror = ok;
      im.src = FACE_SCAN_IMAGES[id];
    });
  }

  /* ---------- 장소 ---------- */
  // 단색: 들판 그림·바닥 판을 숨기고 화면 바탕을 그 색으로 (사진에도 같은 색)
  function paintSolid() {
    const on = state.on && !!PLACES[state.place].solid;
    document.body.classList.toggle('photosolid', on);
    document.body.style.setProperty('--photo-bg', state.solid);
    ground.visible = !on;
    for (const m of state.members) if (m.shadow) m.shadow.visible = on;
  }
  function setSolid(color) { state.solid = color; paintSolid(); paint(); }
  async function setPlace(key) {
    state.place = key;
    const P = PLACES[key];
    ground.children.forEach((m, i) => m.material.color.set(P.ground[i]));
    paintSolid();
    if (state.placeObj) { scene.remove(state.placeObj); state.placeObj = null; }
    if (P.glb) {
      await need('glb-loader.js');
      await need('glb-world.js');
      if (!P.cache) {
        P.cache = await loadGLB(P.glb);
        try { makeGLBInk(P.cache); } catch (e) { /* 외곽선 없이도 보인다 */ }
        P.cache.scale.setScalar(P.scale);
        P.cache.position.set(...P.pos);
      }
      if (state.place === key) { state.placeObj = P.cache; scene.add(P.cache); }
    }
    paint();
  }

  /* ---------- 무대 위 아이들 ---------- */
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 48), new THREE.MeshBasicMaterial({ color: '#f39bb0', transparent: true, opacity: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  const slotMarks = SLOTS.map(s => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(s.x, 0.01, s.z);
    m.visible = false;
    return m;
  });
  // 자리 (2026-11-18 이재헌님: 더 자유롭게): 처음엔 다섯 칸 중 빈 곳에 서고, 그 뒤로는 무대 위 아무 데나 끌어 놓는다.
  // 방향은 늘 카메라 쪽을 보고, 돌리기로 더한 만큼(turn)은 옮겨도 그대로
  const AREA = { x: 3.4, zBack: -2.2, zFront: 2.4 };
  const shadowGeo = new THREE.CircleGeometry(0.55, 32);
  function build(member) {
    const preset = member.key === 'me' ? presetFromLook(state.me.look) : { ...characterEntry(member.key).preset };
    member.actor = buildCharacter(preset, { faceWidth: 512 });
    member.expr = member.actor.getExpression();
    scene.add(member.actor.root);
    // 단색 배경에서 발밑 그림자 (땅이 없어도 서 있어 보이게)
    member.shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: '#2b2321', transparent: true, opacity: 0.14, depthWrite: false }));
    member.shadow.rotation.x = -Math.PI / 2;
    member.shadow.scale.set(1, 0.7, 1);
    member.shadow.visible = !!PLACES[state.place].solid;
    scene.add(member.shadow);
    place(member);
  }
  const faceCenter = x => -Math.atan2(x, 4.5);
  function place(member, lift = 0) {
    member.actor.root.position.set(member.x, lift, member.z);
    member.actor.root.rotation.y = faceCenter(member.x) + (member.turn || 0);
    member.shadow.position.set(member.x, 0.006, member.z);
  }
  // 처음 설 자리: 다섯 칸 중 다른 아이와 겹치지 않는 곳, 없으면 빈 곳 아무 데나
  function freeSpot() {
    const far = (x, z) => state.members.every(m => Math.hypot(m.x - x, m.z - z) > 0.9);
    const s = SLOTS.find(t => far(t.x, t.z));
    if (s) return { x: s.x, z: s.z };
    for (let i = 0; i < 40; i++) { const x = (Math.random() * 2 - 1) * AREA.x * 0.8, z = AREA.zBack + Math.random() * (AREA.zFront - AREA.zBack); if (far(x, z)) return { x, z }; }
    return { x: 0, z: 0 };
  }
  function add(key) {
    const p = freeSpot();
    const m = { key, x: p.x, z: p.z, turn: 0, actor: null };
    state.members.push(m);
    build(m);
    select(m);
  }
  function remove(key) {
    const i = state.members.findIndex(m => m.key === key);
    if (i < 0) return;
    const [m] = state.members.splice(i, 1);
    scene.remove(m.actor.root, m.shadow);
    if (m.actor.dispose) m.actor.dispose();
    if (state.selected === m) select(state.members[0] || null);
  }
  function select(m) {
    state.selected = m;
    ring.visible = !!m;
    if (m) ring.position.set(m.x, 0.012, m.z);
    paint();
  }
  async function setFace(m, id) {
    await loadFace(id);
    m.expr = id;
    m.actor.setExpression(id);
    paint();
  }

  /* ---------- 끌어서 자리 옮기기 ---------- */
  const ray = new THREE.Raycaster();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let held = null, moved = false, startX = 0, startY = 0;
  function pointerNdc(e) {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function pick(e) {
    ray.setFromCamera(pointerNdc(e), camera);
    let best = null, bestD = Infinity;
    for (const m of state.members) {
      const h = ray.intersectObject(m.actor.root, true)[0];
      if (h && h.distance < bestD) { best = m; bestD = h.distance; }
    }
    return best;
  }
  const fingers = new Map();
  let pinch0 = 0, zoom0 = 1;
  function down(e) {
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (fingers.size === 2) {
      // 두 손가락: 아이 끌기를 멈추고 확대
      const [a, b] = [...fingers.values()];
      pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoom0 = state.zoom;
      if (held) { held = null; slotMarks.forEach(s => { s.visible = false; }); }
      return;
    }
    if (state.shoot && state.shoot.counting) return;
    held = pick(e);
    moved = false;
    startX = e.clientX; startY = e.clientY;
    if (held) { state.tab = 'face'; select(held); }
  }
  function move(e) {
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (fingers.size === 2 && pinch0 > 0) {
      const [a, b] = [...fingers.values()];
      setZoom(zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0);
      return;
    }
    if (!held) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true;
    if (!moved) return;
    ray.setFromCamera(pointerNdc(e), camera);
    if (!ray.ray.intersectPlane(floor, hit)) return;
    // 무대 안 아무 데나 (살짝 들어 올린 채로 따라온다)
    held.x = Math.max(-AREA.x, Math.min(AREA.x, hit.x));
    held.z = Math.max(AREA.zBack, Math.min(AREA.zFront, hit.z));
    place(held, 0.12);
    ring.position.set(held.x, 0.012, held.z);
  }
  function up(e) {
    if (e) fingers.delete(e.pointerId); else fingers.clear();
    if (fingers.size < 2) pinch0 = 0;
    slotMarks.forEach(s => { s.visible = false; });
    if (!held) return;
    if (moved) {
      // 놓은 자리에 그대로. 다른 아이와 몸이 겹치면 살짝 비켜 선다
      for (const o of state.members) {
        if (o === held) continue;
        const dx = held.x - o.x, dz = held.z - o.z, d = Math.hypot(dx, dz);
        if (d < 0.75) { const k = (0.75 - d) / (d || 1); held.x += (d ? dx : 0.75) * k; held.z += dz * k; }
      }
      held.x = Math.max(-AREA.x, Math.min(AREA.x, held.x));
      place(held);
      select(held);
    }
    held = null;
  }

  /* ---------- 판 ---------- */
  const $p = id => document.getElementById(id);
  const nameOf = key => (key === 'me' ? state.me.resident.name : characterEntry(key).label);
  const chip = (label, on, onclick, disabled = false) => {
    const b = el('button', { type: 'button', className: on ? 'on' : '', textContent: label, disabled });
    b.setAttribute('aria-pressed', on);
    b.onclick = onclick;
    return b;
  };
  function faceChoices(m) {
    if (m.key === 'me') return KID_FACES;
    const seen = new Set();
    const hide = (window.FACE_FIXES && FACE_FIXES.PHOTO_HIDE) || new Set();
    return expressionsFor(m.key).filter(e => !e.painted && !hide.has(e.id) && FACE_SCAN_IMAGES[e.id] && !seen.has(e.label) && seen.add(e.label)).map(e => [e.id, e.label]);
  }
  function paint() {
    if (!state.on) return;
    const shoot = state.shoot;
    const mode = shoot ? shoot.mode : state.mode;
    for (const b of $p('photoModes').children) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); b.disabled = !!shoot; }
    const chosen = new Set(state.members.map(m => m.key));
    // 위: 장소 (찍는 동안은 몇 번째 컷인지)
    $p('photoPlaces').hidden = !!shoot;
    // 단색 배경: 색 동그라미 + 직접 고르기
    const solidOn = !!PLACES[state.place].solid && !shoot;
    $p('photoSolid').hidden = !solidOn;
    if (solidOn) {
      const pickIn = el('input', { type: 'color', value: state.solid });
      pickIn.setAttribute('aria-label', '배경색 직접 고르기');
      pickIn.oninput = () => setSolid(pickIn.value);
      $p('photoSolid').replaceChildren(el('span', { className: 'plabel', textContent: '배경색' }), ...SOLID_COLORS.map(c => {
        const b = el('button', { type: 'button', className: state.solid.toLowerCase() === c ? 'on' : '' });
        b.style.background = c;
        b.setAttribute('aria-label', `배경색 ${c}`);
        b.setAttribute('aria-pressed', String(state.solid.toLowerCase() === c));
        b.onclick = () => setSolid(c);
        return b;
      }), el('label', { className: 'pick', title: '직접 고르기' }, pickIn));
    }
    $p('photoPlaces').replaceChildren(...Object.entries(PLACES).map(([k, P]) => {
      const b = chip(P.label, state.place === k, () => setPlace(k).catch(() => { $('error').textContent = '장소를 불러오지 못했어요.'; }));
      b.setAttribute('aria-pressed', String(state.place === k));
      return b;
    }));
    $p('photoStatus').textContent = shoot ? (shoot.mode === 'single' ? '한 장' : `인생네컷 ${Math.min(shoot.cuts.length + 1, 4)} / 4`) : '';
    $p('photoStop').hidden = !shoot;
    $p('photoBack').hidden = !!shoot;
    // 아래 판: 친구 고르기 또는 고른 아이의 표정
    $p('photoCount').textContent = `친구 ${chosen.size - 1}/${MAX_FRIENDS}`;
    $p('photoFriends').setAttribute('aria-pressed', String(state.tab === 'friends' && !shoot));
    $p('photoFriends').disabled = !!shoot;
    const body = $p('photoBody');
    const rows = [];
    const m = state.selected;
    if (state.tab === 'friends' && !shoot) {
      const full = chosen.size - 1 >= MAX_FRIENDS;
      $p('photoPick').textContent = '함께 찍을 친구 (3명까지) · 무대 위 아이를 끌어 아무 데나 놓아요';
      rows.push(el('div', { className: 'pchips four' }, ...FRIENDS.map(id => {
        const on = chosen.has(id);
        return chip(characterEntry(id).label, on, () => { if (on) remove(id); else add(id); state.tab = 'friends'; paint(); }, !on && full);
      })));
    } else {
      $p('photoPick').textContent = m ? `${nameOf(m.key)}의 표정 · 무대에서 다른 아이를 누르면 바꿔요` : '무대 위 아이를 눌러 골라요';
      if (m) rows.push(el('div', { className: 'pchips' }, ...faceChoices(m).map(([id, label]) => chip(label, m.expr === id, () => setFace(m, id)))));
    }
    body.replaceChildren(...rows);
    $p('photoTurn').disabled = !m || !!(shoot && shoot.counting);
    // 셔터
    $p('photoShot').disabled = !!(shoot && shoot.counting);
    $p('photoShotText').textContent = shoot && shoot.counting ? '찍는 중…' : mode === 'single' ? '3초 뒤 찰칵' : `${shoot ? shoot.cuts.length + 1 : 1}번째 컷 · 3초 뒤`;
    $p('photoCuts').hidden = !(shoot && shoot.mode === 'four');
    if (shoot && shoot.mode === 'four') $p('photoCuts').replaceChildren(...[0, 1, 2, 3].map(i => shoot.cuts[i] ? el('img', { src: shoot.cuts[i].toDataURL('image/jpeg', 0.7), alt: `${i + 1}번째 컷` }) : el('span', { textContent: i + 1 })));
    paintZoom();
  }
  function turn() {
    const m = state.selected;
    if (!m) return;
    m.turnDir = m.turnDir || 1;
    if (Math.abs(m.turn + m.turnDir * TURN) > TURN * 2.01) m.turnDir = -m.turnDir;
    m.turn += m.turnDir * TURN;
    place(m);
  }

  /* ---------- 찍기: 화면에 보이는 그대로 4:3으로 자른다 ---------- */
  // 찍히는 칸: 판과 위 줄(뒤로·장소)에 가리지 않은 남은 화면 가운데의 4:3 상자
  function cutRect() {
    const w = window.innerWidth, h = window.innerHeight;
    const r = $p('photo').getBoundingClientRect();
    const top = 64;
    const free = wide() ? { x: 0, y: top, w: r.left, h: h - top } : { x: 0, y: top, w, h: r.top - top };
    let cw = free.w * 0.94, ch = cw * 3 / 4;
    if (ch > free.h * 0.9) { ch = free.h * 0.9; cw = ch * 4 / 3; }
    return { x: free.x + (free.w - cw) / 2, y: free.y + (free.h - ch) / 2, w: cw, h: ch };
  }
  function showFrame(on) {
    const f = $p('photoFrame');
    const z = $p('photoZoom');
    f.hidden = !on;
    z.hidden = !on;
    if (!on) return;
    const c = cutRect();
    Object.assign(f.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${c.w}px`, height: `${c.h}px` });
    Object.assign(z.style, { left: `${c.x + c.w / 2}px`, top: `${c.y + c.h - 44}px` });
  }
  // 하늘·언덕 그림(SVG)을 그림으로 바꿔 둔다 (3D 화면은 바탕이 투명이라 사진에 같이 그려 넣는다)
  function sceneryImage() {
    const svg = document.querySelector('#scenery svg');
    const xml = new XMLSerializer().serializeToString(svg);
    return new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
  }
  async function grab() {
    const c = cutRect();
    const solid = !!PLACES[state.place].solid;
    const bg = solid ? null : await sceneryImage();
    renderer.render(scene, camera);                       // 같은 순간에 그린 그림을 바로 읽는다
    const gl = renderer.domElement;
    const sx = gl.width / window.innerWidth, sy = gl.height / window.innerHeight;
    const out = document.createElement('canvas');
    out.width = 800; out.height = 600;
    const g = out.getContext('2d');
    g.fillStyle = solid ? state.solid : '#bfe3f2'; g.fillRect(0, 0, 800, 600);
    if (bg) {
      const box = $('scenery').getBoundingClientRect();
      g.drawImage(bg, (box.left - c.x) * 800 / c.w, (box.top - c.y) * 600 / c.h, box.width * 800 / c.w, box.height * 600 / c.h);      // 그림 아래로 남는 칸은 풀밭 색으로 (예전엔 하늘색 띠가 찍혔다)
      const below = (box.bottom - c.y) * 600 / c.h;
      if (below < 600) { g.fillStyle = '#b5d995'; g.fillRect(0, Math.max(0, below - 1), 800, 600); }
    }
    g.drawImage(gl, c.x * sx, c.y * sy, c.w * sx, c.h * sy, 0, 0, 800, 600);
    return out;
  }
  function flash() {
    const f = $p('photoFlash');
    f.hidden = false;
    f.style.opacity = '1';
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = '0'; }));
    setTimeout(() => { f.hidden = true; }, 450);
    if (window.Sound) { Sound.play('shutter'); return; }
    try {      // 찰칵: 짧은 잡음 두 번 (sound.js가 없을 때)
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      for (const at of [0, 0.07]) {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
        const s = ac.createBufferSource(); s.buffer = buf; s.connect(ac.destination); s.start(ac.currentTime + at);
      }
      setTimeout(() => ac.close(), 600);
    } catch (e) { /* 소리가 막힌 기기 */ }
  }
  async function shootCut() {
    const shoot = state.shoot;
    if (!shoot || shoot.counting) return;
    shoot.counting = true;
    ring.visible = false;
    paint();
    const cd = $p('photoCount3');
    for (const n of [3, 2, 1]) {
      cd.textContent = n; cd.hidden = false;
      await new Promise(r => setTimeout(r, 900));
    }
    cd.hidden = true;
    const cut = await grab();
    flash();
    shoot.cuts.push(cut);
    shoot.counting = false;
    ring.visible = !!state.selected;
    if (shoot.cuts.length >= (shoot.mode === 'single' ? 1 : 4)) return finish();
    paint();
  }
  function startShoot(mode = 'four') {
    state.shoot = { mode, cuts: [], counting: false, strip: 'white' };
    paint();
  }
  function stopShoot() {
    state.shoot = null;
    $p('photoResult').hidden = true;
    $p('photoPanelMain').hidden = false;
    $p('photoTop').hidden = !state.on;
    showFrame(state.on);
    paint();
  }
  // 셔터: 처음 누르면 고른 방법(한 장·인생네컷)으로 찍기 시작, 인생네컷은 누를 때마다 다음 컷
  function shutter() {
    if (!state.shoot) startShoot(state.mode);
    shootCut();
  }
  // 인생네컷 띠: 세로로 4컷, 아래에 이름·날짜·「먼작귀 빌리지」
  function strip(cuts, color) {
    const [, bgc, ink] = STRIPS[color];
    const W = 680, PAD = 36, GAP = 16, CW = W - PAD * 2, CH = CW * 3 / 4, FOOT = 150;
    const c = document.createElement('canvas');
    c.width = W; c.height = PAD + 4 * CH + 3 * GAP + FOOT;
    const g = c.getContext('2d');
    g.fillStyle = bgc; g.fillRect(0, 0, c.width, c.height);
    cuts.forEach((cut, i) => {
      const y = PAD + i * (CH + GAP);
      g.drawImage(cut, PAD, y, CW, CH);
      g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(PAD, y, CW, CH);
    });
    const fy = PAD + 4 * CH + 3 * GAP;
    g.fillStyle = ink; g.textAlign = 'center';
    g.font = '44px Jua, sans-serif'; g.fillText('먼작귀 빌리지', W / 2, fy + 62);
    const d = new Date();
    g.font = '22px "Gowun Dodum", sans-serif';
    g.fillText(`${state.me.resident.name} · ${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`, W / 2, fy + 100);
    g.globalAlpha = 0.7; g.font = '15px "Gowun Dodum", sans-serif';
    g.fillText('팬 제작 · 원작 ⓒnagano', W / 2, fy + 130);
    g.globalAlpha = 1;
    return c;
  }
  // 한 장 사진: 색 테두리 + 아래에 이름·날짜·「먼작귀 빌리지」 (폴라로이드처럼)
  function single(cut, color) {
    const [, bgc, ink] = STRIPS[color];
    const W = 860, PAD = 30, CW = W - PAD * 2, CH = CW * 3 / 4, FOOT = 120;
    const c = document.createElement('canvas');
    c.width = W; c.height = PAD + CH + FOOT;
    const g = c.getContext('2d');
    g.fillStyle = bgc; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(cut, PAD, PAD, CW, CH);
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(PAD, PAD, CW, CH);
    const d = new Date();
    g.fillStyle = ink; g.textAlign = 'left';
    g.font = '40px Jua, sans-serif'; g.fillText('먼작귀 빌리지', PAD, PAD + CH + 62);
    g.textAlign = 'right'; g.font = '22px "Gowun Dodum", sans-serif';
    g.fillText(`${state.me.resident.name} · ${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`, W - PAD, PAD + CH + 58);
    g.globalAlpha = 0.7; g.font = '15px "Gowun Dodum", sans-serif'; g.fillText('팬 제작 · 원작 ⓒnagano', W - PAD, PAD + CH + 88); g.globalAlpha = 1;
    return c;
  }
  const picture = shoot => (shoot.mode === 'single' ? single(shoot.cuts[0], shoot.strip) : strip(shoot.cuts, shoot.strip));
  function finish() {
    const shoot = state.shoot;
    showFrame(false);
    $p('photoTop').hidden = true;
    $p('photoPanelMain').hidden = true;
    $p('photoResult').hidden = false;
    const draw = () => {
      $p('photoStrip').src = picture(shoot).toDataURL('image/png');
      $p('photoStripColors').replaceChildren(...Object.entries(STRIPS).map(([k, [label, c]]) => {
        const b = el('button', { type: 'button', className: shoot.strip === k ? 'on' : '', title: label });
        b.setAttribute('aria-label', `${label} 띠`);
        b.style.background = c;
        b.setAttribute('aria-pressed', shoot.strip === k);
        b.onclick = () => { shoot.strip = k; draw(); };
        return b;
      }));
    };
    draw();
    $p('photoResultTitle').textContent = shoot.mode === 'single' ? '찰칵!' : '인생네컷';
    $p('photoBrag').hidden = true;
    $p('photoBragMsg').textContent = '';
    // 다른 앱(카톡·인스타·X …)으로 보내기: 휴대폰은 공유창, 안 되면 내려받기
    $p('photoSave').onclick = async () => {
      const blob = await new Promise(r => picture(shoot).toBlob(r, 'image/png'));
      await shareImage(blob, `${shoot.mode === 'single' ? '먼작귀빌리지' : '인생네컷'}-${state.me.resident.name}.png`, `${state.me.resident.name}와 먼작귀 빌리지에서 찍었어요 #먼작귀빌리지`);
    };
    // 자랑하기: 한 줄 글을 붙여 갤러리에 올린다
    $p('photoBragOpen').onclick = () => { $p('photoBrag').hidden = false; $p('photoCaption').focus(); };
    $p('photoBragGo').onclick = async () => {
      const btn = $p('photoBragGo');
      btn.disabled = true; btn.textContent = '올리는 중…';
      try {
        const image = picture(shoot).toDataURL('image/jpeg', 0.86);
        const posted = await api('/photos', { method: 'POST', body: { image, caption: $p('photoCaption').value, kind: shoot.mode } });
        $p('photoBragMsg').textContent = '갤러리에 올렸어요!';
        $p('photoBrag').hidden = true;
        $p('photoBragView').hidden = false;
        $p('photoBragView').onclick = () => { leave(true); Gallery.enter({ from: 'room', open: posted.id }); };
      } catch (e) { $p('photoBragMsg').textContent = e.message; }
      btn.disabled = false; btn.textContent = '올리기';
    };
    $p('photoBragView').hidden = true;
    $p('photoAgain').onclick = () => { const mode = shoot.mode; stopShoot(); startShoot(mode); };
    $p('photoDone').onclick = stopShoot;
  }

  /* ---------- 들어가기 · 나가기 ---------- */
  async function enter(me) {
    state.me = me;
    showOnly('photo');
    $p('photoPick').textContent = '친구들을 부르는 중…';
    await Promise.all([ensureFaces().catch(() => { $('error').textContent = '친구들 얼굴을 받지 못했어요. 다시 해 주세요.'; }), Promise.resolve()]);
    if (actor) scene.remove(actor.root);
    state.on = true;
    ground.scale.setScalar(1.95);
    scene.add(ring, ...slotMarks);
    state.members = [];
    state.tab = 'face';
    state.zoom = state.zc = 1;
    add('me');
    $p('photoTurn').onclick = () => turn();
    $p('photoBack').onclick = () => leave();
    $p('photoShot').onclick = shutter;
    $p('photoStop').onclick = stopShoot;
    $p('photoFriends').onclick = () => { state.tab = state.tab === 'friends' ? 'face' : 'friends'; paint(); };
    for (const b of $p('photoModes').children) b.onclick = () => { if (!state.shoot) { state.mode = b.dataset.mode; paint(); } };
    for (const b of $p('photoZoom').children) b.onclick = () => setZoom(Number(b.dataset.z));
    if (!wheelReady) { wheelReady = true; canvas.addEventListener('wheel', e => { if (!state.on) return; e.preventDefault(); setZoom(state.zoom * (1 - e.deltaY * 0.0012)); }, { passive: false }); }
    $p('photoTop').hidden = false;
    showFrame(true);
    await setPlace(state.place);
  }
  let wheelReady = false;
  function leave(quiet) {
    state.on = false;
    paintSolid();
    ground.visible = true;
    stopShoot();
    $p('photoTop').hidden = true;
    showFrame(false);
    fingers.clear();
    for (const m of state.members) { scene.remove(m.actor.root, m.shadow); if (m.actor.dispose) m.actor.dispose(); }
    state.members = [];
    state.on = false;
    ground.scale.setScalar(1);
    ground.children.forEach((m, i) => m.material.color.set(PLACES.field.ground[i]));
    if (state.placeObj) { scene.remove(state.placeObj); state.placeObj = null; }
    scene.remove(ring, ...slotMarks);
    showLook(state.me.look);
    if (!quiet) enterHome().catch(e => { $('error').textContent = e.message; });
  }
  // 매 프레임: 숨쉬기와 표정 (표정 그림은 캐릭터의 animate가 바꾼다)
  function animate(now, dt) {
    for (const m of state.members) if (m.actor.animate) m.actor.animate(now / 1000, dt, 'idle');
    state.zc += (state.zoom - state.zc) * (1 - Math.exp(-dt * 8));
    if (!$p('photoFrame').hidden) showFrame(true);
  }
  return { enter, leave, animate, down, move, up, get on() { return state.on; }, state, SLOTS, PLACES };
})();
