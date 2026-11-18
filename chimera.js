'use strict';

// 치이카와 심즈 — 키메라 다시 만들기 (2026-11-12 이재헌님: 키메라 종류별 전부, 큰 키메라 아노코·데카츠요)
// 참고(팬 정리 자료): 키메라화된 아이는 치이카와족과 비슷한 크기로, 등에 박쥐 같은 날개, 굵은 꼬리, 사나운 발톱이 돋는다.
// 2020년에 분홍 키메라가 처음 나왔다. 아노코는 둥근 몸에 고양이 같은 얼굴, 키메라가 되면 발톱과 꼬리가 붙는다.
// 데카츠요는 크고 힘세지만 어딘가 미워할 수 없는 귀여움이 있다.
//  1) 난동 괴물(엑스트라가 키메라가 된 것): 색을 다섯 갈래로(분홍·라벤더·땅거미·이끼·먹색), 몸에 날개·꼬리·발톱을 붙이고 날개를 퍼덕인다
//  2) 깊은 숲의 큰 키메라 아노코·데카츠요 모델과 움직임 (wild-zones.js가 부른다)
(function (root) {
  const SKINS = ['#f2a9c2', '#b3a1d6', '#8a7fa6', '#9fb5a0', '#6b6170'];
  const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const skinOf = c => SKINS[hash(c.id) % SKINS.length];
  const darker = (c, k = 0.35) => new THREE.Color(c).lerp(new THREE.Color('#3b2a26'), k).getStyle();
  const lighter = (c, k = 0.4) => new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k).getStyle();
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const INK = new THREE.MeshBasicMaterial({ color: '#3b2a26', side: THREE.BackSide });
  const inked = (geo, c, w = 0.04) => { const m = new THREE.Mesh(geo, toon(c)); const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1 + w); m.add(o); return m; };

  // 박쥐 날개: 위가 둥글고 아래가 물결진 막 + 뼈대 셋
  function wingGeo(w, h) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(w * 0.35, h * 0.95, w, h * 0.8);
    s.quadraticCurveTo(w * 0.92, h * 0.35, w * 0.82, h * 0.05);
    s.quadraticCurveTo(w * 0.7, h * 0.22, w * 0.55, 0);
    s.quadraticCurveTo(w * 0.42, h * 0.2, w * 0.28, -h * 0.05);
    s.quadraticCurveTo(w * 0.15, h * 0.12, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    g.translate(0, 0, -0.015);
    return g;
  }
  function wing(color, w, h, side) {
    const piv = new THREE.Group();
    const m = inked(wingGeo(w, h), color, 0.03);
    m.scale.x = side; piv.add(m);
    for (const [a, l] of [[0.95, 0.95], [0.55, 0.85], [0.22, 0.6]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * w * 4, 0.006 * w * 4, l * w, 5), toon(darker(color, 0.5)));
      b.position.set(side * Math.cos(a) * l * w * 0.5, Math.sin(a) * l * w * 0.5 * (h / w), 0.02); b.rotation.z = side * (a - Math.PI / 2) * -1 + (side < 0 ? 0 : 0);
      b.rotation.z = Math.atan2(Math.sin(a) * (h / w), side * Math.cos(a)) - Math.PI / 2;
      piv.add(b);
    }
    return piv;
  }
  // 굵은 꼬리: 몸에서 뒤로 뻗어 위로 휘고, 끝은 뾰족한 하트(스페이드)
  function tail(color, len, r0) {
    const g = new THREE.Group();
    const pts = [[0, 0, 0], [0, -0.05 * len, -0.35 * len], [0, 0.15 * len, -0.75 * len], [0, 0.5 * len, -0.95 * len]].map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 20, 1, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i <= 20; i++) { const c = curve.getPointAt(i / 20), r = r0 * (1 - 0.55 * (i / 20)); for (let j = 0; j <= 8; j++) { const k = i * 9 + j; if (k < pos.count) pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * r, c.y + (pos.getY(k) - c.y) * r, c.z + (pos.getZ(k) - c.z) * r); } }
    geo.computeVertexNormals();
    g.add(inked(geo, color, 0.06));
    const tip = inked(new THREE.ConeGeometry(r0 * 1.0, r0 * 1.6, 4), darker(color, 0.25), 0.05);
    tip.position.copy(pts[3]).add(new THREE.Vector3(0, r0 * 0.6, -r0 * 0.2)); tip.rotation.x = -0.4; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.45;
    g.add(tip);
    return g;
  }
  function claws(n, len, color = '#fbf7ee') {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) { const c = inked(new THREE.ConeGeometry(len * 0.3, len, 5), color, 0.05); c.position.x = (i - (n - 1) / 2) * len * 0.45; c.rotation.x = Math.PI / 2 + 0.3; c.position.z = len * 0.4; g.add(c); }
    return g;
  }

  /* ---------- 1) 난동 괴물에게 키메라 몸을 ---------- */
  function decorate(a) {
    // 원작 키메라 모델은 날개·꼬리를 몸에 이미 달고 있다 (chimera-models.js)
    if (a.preset && /^chimera/.test(a.preset.style || '')) return null;
    const info = root.AnimRig && AnimRig.rigInfo(a.built, a.preset);
    const lathe = info && info.bodies && info.bodies.find(b => b.geometry && b.geometry.type === 'LatheGeometry' && b.parent === a.built.model);
    if (!lathe) return null;
    const pts = lathe.geometry.parameters.points;
    const y0 = pts[0].y * lathe.scale.y + lathe.position.y, y1 = pts[pts.length - 1].y * lathe.scale.y + lathe.position.y, H = y1 - y0;
    const R = Math.max(...pts.map(p => p.x)) * lathe.scale.x;
    const color = a.preset.skin || '#8a7fa6';
    const g = new THREE.Group(); g.name = 'chimeraParts';
    const wings = [];
    for (const side of [-1, 1]) {
      const w = wing(darker(color, 0.25), R * 0.95, H * 0.42, side);
      w.position.set(side * R * 0.3, y0 + H * 0.58, -R * 0.82);
      w.rotation.y = side * 0.5;
      g.add(w); wings.push({ w, side });
    }
    const t = tail(color, H * 0.75, R * 0.2);
    t.position.set(0, y0 + H * 0.18, -R * 0.86);
    g.add(t);
    // 발톱: 팔(캡슐) 끝에 셋씩
    for (const arm of a.built.arms || []) {
      let cap = null; arm.joint.traverse(o => { if (!cap && o.isMesh && o.geometry && o.geometry.type === 'CapsuleGeometry') cap = o; });
      if (!cap) continue;
      const p = cap.geometry.parameters, end = p.length / 2 + p.radius;
      // 몸통 축에서 먼 쪽 끝
      a.built.model.updateMatrixWorld(true);
      const inv = a.built.model.matrixWorld.clone().invert();
      const ends = [end, -end].map(y => { const v = new THREE.Vector3(0, y, 0).applyMatrix4(cap.matrixWorld).applyMatrix4(inv); return { y, d: Math.hypot(v.x, v.z) }; });
      const far = ends[0].d > ends[1].d ? ends[0].y : ends[1].y;
      const cl = claws(3, p.radius * 1.1);
      cl.position.y = far; cl.rotation.x = far > 0 ? -Math.PI / 2 : Math.PI / 2;
      cl.scale.setScalar(1 / Math.max(0.2, cap.scale.x));
      cap.add(cl);
      g.userData.clawSets = (g.userData.clawSets || []).concat(cl);
    }
    a.built.model.add(g);
    g.userData.wings = wings; g.userData.tail = t;
    return g;
  }
  function tickActors() {
    const G = root.game;
    if (G && G.actors) {
      const t = performance.now() / 1000;
      for (const a of G.actors) {
        const c = a.c;
        // 원작 키메라 모델의 깃털 날개는 파닥인다
        const own = c.monster && a.built.model.userData.chimeraWings;
        if (own) {
          const fight = c.beast && c.beast.rampage;
          const sp = fight ? 13 : c.walking ? 8 : 3;
          for (const w of own) w.rotation.z = w.userData.side * Math.sin(t * sp + (c.x || 0)) * (fight ? 0.35 : 0.18);
          continue;
        }
        if (!c.monster && !a._chim) continue;
        let g = (a._chim && a._chim.parent === a.built.model ? a._chim : null);
        if (c.monster && !g) g = a._chim = decorate(a);
        if (!g) continue;
        g.visible = !!c.monster;
        const fight = c.beast && c.beast.rampage && (c.clip === 'train_swing' || c.clip === 'brave_up');
        const sp = fight ? 11 : c.walking ? 6 : 2.4;
        for (const { w, side } of g.userData.wings) w.rotation.y = side * (0.5 + Math.sin(t * sp + (c.x || 0)) * (fight ? 0.6 : 0.3));
        g.userData.tail.rotation.y = Math.sin(t * (fight ? 5 : 1.6)) * 0.35;
        g.userData.tail.rotation.x = Math.sin(t * 1.1) * 0.08;
      }
    }
    requestAnimationFrame(tickActors);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tickActors);

  /* ---------- 2) 깊은 숲의 큰 키메라 ---------- */
  // h = wild-zones의 도구 { part, at, sph, taper, eye, teeth }. 크기 1 기준 키 약 2.2
  function makeAnoko(h) {
    const { part, at, sph, eye } = h;
    const rootG = new THREE.Group(), body = new THREE.Group(); rootG.add(body);
    const fur = '#ece6f2', belly = '#fbf8fd', pink = '#f4a3b4', dark = '#8d82a3';
    body.add(at(part(sph(1, 28, 20), fur, 0.045), 0, 1.08, 0, 0, 0, 0, 1.0, 0.98, 0.94));
    body.add(at(part(sph(0.7, 20, 14), belly, 0), 0, 0.82, 0.38, 0, 0, 0, 1, 0.9, 0.6));
    // 고양이 같은 얼굴: 세모 귀(안쪽 분홍), 큰 눈, ω 입, 수염, 볼
    const ears = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Group(); at(e, sx * 0.55, 1.88, 0.05, 0, 0, sx * -0.32); body.add(e);
      e.add(at(part(new THREE.ConeGeometry(0.32, 0.55, 4), fur, 0.04), 0, 0.2, 0, 0, Math.PI / 4, 0, 1, 1, 0.55));
      e.add(at(part(new THREE.ConeGeometry(0.2, 0.36, 4), pink, 0), 0, 0.17, 0.08, 0, Math.PI / 4, 0, 1, 1, 0.3));
      ears.push(e);
      body.add(at(eye(0.13), sx * 0.34, 1.3, 0.86));
      body.add(at(part(sph(0.12, 10, 8), pink, 0), sx * 0.58, 1.08, 0.74, 0, 0, 0, 1.4, 0.6, 0.4));
      for (const dy of [-0.05, 0.06]) body.add(at(part(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 4), '#3b2a26', 0), sx * 0.78, 1.12 + dy, 0.62, 0, 0, Math.PI / 2 + sx * dy * 2));
    }
    for (const sx of [-1, 1]) body.add(at(part(new THREE.TorusGeometry(0.07, 0.016, 5, 10, Math.PI), '#3b2a26', 0), sx * 0.07, 1.14, 0.93, 0, 0, Math.PI));
    // 짧은 팔과 사나운 발톱
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group(); at(sh, sx * 0.86, 1.0, 0.25); body.add(sh);
      sh.add(at(part(new THREE.CapsuleGeometry(0.16, 0.32, 6, 10), fur, 0.04), sx * 0.12, -0.18, 0.12, 0.6, 0, sx * 0.4));
      const cl = claws(3, 0.16); cl.position.set(sx * 0.22, -0.38, 0.32); cl.rotation.x = 0.4; sh.add(cl);
      arms.push({ sh, side: sx });
    }
    const feet = [];
    for (const sx of [-1, 1]) { const f = at(part(sph(0.26, 14, 10), fur, 0.04), sx * 0.42, 0.14, 0.32, 0, 0, 0, 1, 0.6, 1.2); body.add(f); feet.push(f); }
    // 등의 박쥐 날개와 굵은 줄무늬 꼬리
    const wings = [];
    for (const side of [-1, 1]) { const w = wing(dark, 0.95, 0.85, side); w.position.set(side * 0.3, 1.45, -0.78); w.rotation.y = side * 0.5; body.add(w); wings.push({ w, side }); }
    const tl = tail(fur, 1.6, 0.2); tl.position.set(0, 0.5, -0.86); body.add(tl);
    for (let i = 0; i < 4; i++) body.add(at(part(new THREE.TorusGeometry(0.17 - i * 0.02, 0.03, 5, 14), dark, 0), 0, 0.48 + i * 0.05, -1.05 - i * 0.32, Math.PI / 2 - i * 0.25));
    rootG.userData = { kind: 'anoko', body, ears, arms, feet, wings, tail: tl };
    return rootG;
  }
  function makeDekatsuyo(h) {
    const { part, at, sph, eye, teeth } = h;
    const rootG = new THREE.Group(), body = new THREE.Group(); rootG.add(body);
    const hide = '#c7a99a', belly = '#ead9cc', dark = '#8a6e62', pink = '#f0a0a8';
    body.add(at(part(sph(1.15, 30, 22), hide, 0.05), 0, 1.25, 0, 0, 0, 0, 1.15, 1.05, 1.0));
    body.add(at(part(sph(0.85, 22, 16), belly, 0), 0, 1.0, 0.45, 0, 0, 0, 1.1, 0.95, 0.6));
    // 얼굴: 짙은 눈썹, 작은 눈, 이를 드러낸 큰 입, 동그란 작은 귀, 볼 (미워할 수 없게)
    for (const sx of [-1, 1]) {
      body.add(at(eye(0.1), sx * 0.36, 1.62, 1.0));
      body.add(at(part(new THREE.BoxGeometry(0.34, 0.07, 0.08), '#3b2a26', 0), sx * 0.36, 1.78, 0.98, 0, 0, sx * 0.3));
      body.add(at(part(sph(0.13, 10, 8), pink, 0), sx * 0.66, 1.42, 0.86, 0, 0, 0, 1.4, 0.6, 0.4));
      const ear = at(part(sph(0.26, 14, 10), hide, 0.04), sx * 0.8, 2.25, -0.05, 0, 0, 0, 1, 1, 0.6); body.add(ear);
      body.add(at(part(sph(0.15, 10, 8), pink, 0), sx * 0.8, 2.25, 0.08, 0, 0, 0, 1, 1, 0.3));
    }
    const jaw = new THREE.Group(); at(jaw, 0, 1.3, 1.02); body.add(jaw);
    jaw.add(at(part(sph(0.34, 16, 10), '#7a3b38', 0.03), 0, 0, 0, 0, 0, 0, 1.25, 0.45, 0.3));
    jaw.add(at(teeth(6, 0.36, 0.12, true), 0, 0.12, 0.05));
    jaw.add(at(teeth(6, 0.34, 0.1, false), 0, -0.1, 0.05));
    // 굵은 팔: 어깨-팔뚝-주먹, 주먹마다 발톱 셋
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group(); at(sh, sx * 1.15, 1.45, 0.15); body.add(sh);
      sh.add(at(part(new THREE.CapsuleGeometry(0.3, 0.5, 8, 12), hide, 0.045), sx * 0.2, -0.35, 0.1, 0.3, 0, sx * 0.5));
      const fist = new THREE.Group(); at(fist, sx * 0.42, -0.85, 0.32); sh.add(fist);
      fist.add(at(part(sph(0.34, 16, 12), belly, 0.045), 0, 0, 0, 0, 0, 0, 1, 0.9, 1.05));
      const cl = claws(3, 0.22); cl.position.set(0, -0.05, 0.3); fist.add(cl);
      arms.push({ sh, fist, side: sx });
    }
    const feet = [];
    for (const sx of [-1, 1]) { const f = at(part(sph(0.36, 14, 10), hide, 0.045), sx * 0.55, 0.18, 0.3, 0, 0, 0, 1, 0.55, 1.25); body.add(f); feet.push(f); body.add(at(claws(3, 0.14), sx * 0.55, 0.12, 0.66)); }
    const wings = [];
    for (const side of [-1, 1]) { const w = wing(dark, 1.25, 1.1, side); w.position.set(side * 0.35, 1.8, -0.95); w.rotation.y = side * 0.5; body.add(w); wings.push({ w, side }); }
    const tl = tail(hide, 2.0, 0.32); tl.position.set(0, 0.55, -1.0); body.add(tl);
    // 가슴의 할퀸 자국 셋 (센 놈)
    for (let i = 0; i < 3; i++) body.add(at(part(new THREE.BoxGeometry(0.04, 0.4, 0.02), dark, 0), -0.3 + i * 0.12, 1.15, 1.04, 0, 0, 0.5));
    rootG.userData = { kind: 'dekatsuyo', body, arms, feet, wings, tail: tl, jaw };
    return rootG;
  }
  function animate(u, ph, moving, fight) {
    const sp = moving ? 4 : 1.4;
    u.body.position.y = Math.abs(Math.sin(ph * sp)) * (moving ? 0.12 : 0.03);
    u.body.rotation.z = Math.sin(ph * sp) * (moving ? 0.06 : 0.015);
    if (u.feet) u.feet.forEach((f, i) => { f.position.y = (u.kind === 'anoko' ? 0.14 : 0.18) + (moving ? Math.max(0, Math.sin(ph * sp + i * Math.PI)) * 0.12 : 0); });
    for (const { w, side } of u.wings) w.rotation.y = side * (0.5 + Math.sin(ph * (fight ? 9 : 2.2)) * (fight ? 0.6 : 0.25));
    u.tail.rotation.y = Math.sin(ph * (fight ? 4 : 1.3)) * 0.4;
    for (const a of u.arms) {
      const swing = fight ? Math.sin(ph * 3 + (a.side > 0 ? Math.PI : 0)) : 0;
      a.sh.rotation.x = fight ? -0.7 - swing * 0.7 : Math.sin(ph * 0.8 + a.side) * 0.08;
      a.sh.rotation.z = a.side * (fight ? 0.25 : 0);
    }
    if (u.ears) u.ears.forEach((e, i) => { e.rotation.x = fight ? -0.3 : Math.sin(ph * 1.7 + i) * 0.08; });
    if (u.jaw) u.jaw.scale.y = fight ? 1 + Math.abs(Math.sin(ph * 5)) * 0.6 : 1;
  }
  root.BigChimera = { make: (kind, h) => (kind === 'anoko' ? makeAnoko(h) : makeDekatsuyo(h)), animate, skinOf, SKINS };
}(typeof self !== 'undefined' ? self : this));
