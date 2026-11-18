'use strict';
// 먼작귀 빌리지 선공개 — 첫 화면 들판 (2026-11-17)
// 첫 화면이 휑하다는 지적(이재헌님): 사람들이 최근에 만든 아이들이 이름표를 달고 들판을 돌아다닌다.
// 아이를 누르면 아이 카드(이름·성격 유형·그 아이의 자랑 사진)가 열린다. birth.js 다음에 읽는다.
const Plaza = (() => {
  const state = { on: false, kids: [], loaded: false };
  function nameTag(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = '30px Jua, "Gowun Dodum", sans-serif';
    const w = Math.min(248, g.measureText(text).width + 30);
    g.fillStyle = 'rgba(255, 252, 240, .95)';
    g.strokeStyle = '#4a3230'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(128 - w / 2, 8, w, 48, 22); g.fill(); g.stroke();
    g.fillStyle = '#4a3230'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 33);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(1.6, 0.4, 1);
    s.renderOrder = 10;
    return s;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const _v = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function onScreen(p) {
    // 화면 안(가장자리 여백)이고 가운데 아이와 겹치지 않는 곳만
    if (!_v || typeof camera === 'undefined') return true;
    _v.set(p.x, 1.0, p.z).project(camera);
    return Math.abs(_v.x) < 0.78 && _v.y > -0.6 && _v.y < 0.75 && Math.abs(_v.x) > 0.3;
  }
  function spot(self) {
    // 가운데 아이 뒤쪽 들판, 다른 아이들과 떨어진 곳 (이름표가 겹치지 않게)
    let best = null, bestD = -1;
    for (let i = 0; i < 40; i++) {
      const p = { x: rnd(-2.6, 2.6), z: rnd(-3.4, -0.4) };
      if (!onScreen(p)) continue;
      let d = Infinity;
      for (const m of state.kids) if (m !== self) d = Math.min(d, Math.hypot(m.to.x - p.x, m.to.z - p.z), Math.hypot(m.built.root.position.x - p.x, m.built.root.position.z - p.z));
      if (d > bestD) { bestD = d; best = p; }
      if (d > 1.4) break;
    }
    return best || { x: rnd(-1.5, 1.5), z: -2.6 };
  }
  async function enter() {
    state.on = true;
    if (!state.loaded) {
      state.loaded = true;
      try {
        const r = await (await fetch(`${window.VILLAGE_API || ''}/api/kids/recent?limit=8`)).json();
        for (const k of (r.kids || []).slice(0, 8)) {
          try {
            const built = buildCharacter(presetFromLook(k.look), { faceWidth: 256 });
            const tag = nameTag(k.name);
            tag.position.set(0, 2.55, 0);
            built.root.add(tag);
            built.root.scale.setScalar(0.62);
            const p = spot();
            built.root.position.set(p.x, 0, p.z);
            state.kids.push({ k, built, to: p, wait: rnd(0.5, 4), speed: rnd(0.45, 0.7), hop: rnd(0, 6) });
          } catch (e) { /* 그리지 못한 아이는 건너뛴다 */ }
        }
      } catch (e) { /* 들판이 비어도 첫 화면은 쓸 수 있다 */ }
    }
    for (const m of state.kids) scene.add(m.built.root);
    $('plazaHint').hidden = !state.kids.length;
  }
  function leave() {
    state.on = false;
    for (const m of state.kids) scene.remove(m.built.root);
    closeCard();
  }
  function animate(now, dt) {
    if (!state.on) return;
    const t = now / 1000;
    for (const m of state.kids) {
      const root = m.built.root;
      if (m.wait > 0) {
        m.wait -= dt;
        root.position.y = 0;
      } else {
        const dx = m.to.x - root.position.x, dz = m.to.z - root.position.z, d = Math.hypot(dx, dz);
        if (d < 0.05) { m.to = spot(m); m.wait = rnd(1.5, 5); continue; }
        const step = Math.min(d, m.speed * dt);
        root.position.x += dx / d * step;
        root.position.z += dz / d * step;
        const yaw = Math.atan2(dx, dz);
        let diff = yaw - root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        root.rotation.y += diff * Math.min(1, dt * 8);
        root.position.y = Math.abs(Math.sin((t + m.hop) * 9)) * 0.06;    // 통통 걷기
      }
      if (m.built.animate) m.built.animate(t + m.hop, dt);
    }
  }
  // 누르면 아이 카드
  const ray = new THREE.Raycaster();
  function pick(e) {
    if (!state.on) return false;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    let best = null, bd = Infinity;
    for (const m of state.kids) { const h = ray.intersectObject(m.built.root, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = m; } }
    if (best) openCard(best.k);
    return !!best;
  }
  async function openCard(k) {
    $('kidCard').hidden = false;
    $('kcClose').onclick = closeCard;
    $('kidCard').onclick = e => { if (e.target === $('kidCard')) closeCard(); };
    $('kcName').textContent = k.name;
    $('kcType').textContent = k.mbti ? `${k.mbti} · ${MBTI_NAME[k.mbti] || ''}` : '';
    $('kcPic').replaceChildren(el('div', { className: 'ph', textContent: '…' }));
    kidPortrait(k.look).then(url => { if (url) $('kcPic').replaceChildren(el('img', { src: url, alt: `${k.name}의 모습` })); });
    $('kcPhotos').replaceChildren(el('p', { className: 'quiet', textContent: '자랑 사진을 불러오는 중…' }));
    try {
      const r = await (await fetch(`${window.VILLAGE_API || ''}/api/kids/${k.id}/photos`)).json();
      const list = r.photos || [];
      $('kcPhotos').replaceChildren(...(list.length ? list.map(p => {
        const im = el('img', { src: (window.VILLAGE_API || '') + p.url, alt: p.caption || `${k.name}의 사진`, loading: 'lazy' });
        // 게시판 안에서 열었으면 그 사진으로 넘어가고, 첫 화면 들판에서 열었으면 게시판으로 간다
        im.onclick = () => { closeCard(); if (typeof Gallery !== 'undefined' && Gallery.on) Gallery.show(p); else { leave(); Gallery.enter({ from: 'start', open: p.id }); } };
        return im;
      }) : [el('p', { className: 'quiet', textContent: '아직 자랑 사진이 없어요.' })]));
    } catch (e) { $('kcPhotos').replaceChildren(el('p', { className: 'quiet', textContent: '사진을 받지 못했어요.' })); }
  }
  function closeCard() { if ($('kidCard')) $('kidCard').hidden = true; }
  return { enter, leave, animate, pick, openCard, closeCard, get on() { return state.on; }, state };
})();
