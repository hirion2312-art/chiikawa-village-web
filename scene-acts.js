'use strict';

// 치이카와 심즈 — 장소별 기물 장면 (2026-11-10 이재헌 지시)
// 공통 흔들림 대신, 상호작용마다 그 자리에서 벌어지는 일을 실제 모양의 물건으로 보여 준다.
// 원점은 대상 물건의 윗면(또는 땅), +Z는 캐릭터 쪽. run(d, t, u, ctx): u는 이번 단계 진행도, ctx.all은 상호작용 전체 진행도
(function (root) {
  const { part, lathe, sph, cyl, box, torus, paper, FLAT } = root.PropModels.kit;
  const FX = root.ActFx.FX;
  const G = parent => { const g = new THREE.Group(); parent.add(g); return g; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const add = (name, def) => { FX[`s_${name}`] = def; };
  const wispMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
  function wisps(g, n, x, y, z) {
    const list = [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sph(1, 8, 6), wispMat()); m.userData.o = [x, y, z, i / n]; g.add(m); list.push(m); }
    return list;
  }
  function runW(list, t, rise = 0.8, size = 0.16, on = true) {
    for (const m of list) {
      const [x, y, z, ph] = m.userData.o;
      const k = (t * 0.6 + ph) % 1;
      m.visible = on;
      m.position.set(x + Math.sin(k * 5 + ph * 9) * (0.04 + k * 0.1), y + k * rise, z);
      m.scale.setScalar(size * (0.5 + k));
      m.material.opacity = Math.sin(k * Math.PI) * 0.42;
    }
  }
  // 먹을수록 사라지는 것들
  const eatAway = (list, all) => list.forEach((m, i) => { m.visible = all < 1 - (i + 0.4) / (list.length + 0.4) * 0.9; });
  const bowlGeo = (r, h) => lathe([[0, 0], [r * 0.5, 0], [r * 0.7, h * 0.1], [r, h], [r * 0.92, h], [r * 0.5, h * 0.3], [0, h * 0.25]]);
  const dbl = m => { m.material.side = THREE.DoubleSide; return m; };
  const leafGeo = sph(0.09, 8, 6);

  /* ---------- 음식 ---------- */
  add('curry', { top: true, make(g) {
    part(g, lathe([[0, 0], [0.42, 0], [0.58, 0.05], [0.6, 0.08], [0.42, 0.04], [0, 0.03]]), '#fffaf0');
    const items = [];
    for (const [x, z, r] of [[-0.18, -0.05, 0.2], [-0.05, 0.14, 0.18], [-0.24, 0.14, 0.16]]) { const m = part(g, sph(r, 12, 8), '#fffdf6', x, 0.1, z, 0, 0, 0, false); m.scale.y = 0.6; items.push(m); }
    const roux = [];
    for (const [x, z, r] of [[0.18, 0, 0.26], [0.26, -0.18, 0.18]]) { const m = part(g, cyl(r, r, 0.03, 18), '#a86a2c', x, 0.075, z, 0, 0, 0, false); roux.push(m); }
    for (const [x, z, c] of [[0.2, 0.05, '#e6a15f'], [0.3, -0.12, '#d9745a'], [0.1, -0.1, '#f3c64f']]) roux.push(part(g, new THREE.DodecahedronGeometry(0.05, 0), c, x, 0.11, z));
    part(g, cyl(0.012, 0.016, 0.36, 8), '#d3d6da', 0.36, 0.12, 0.28, FLAT, 0, 0.5);
    return { items, roux, w: wisps(g, 3, 0.1, 0.16, 0) };
  }, run(d, t, u, c) { eatAway(d.items, c.all); eatAway(d.roux, c.all); runW(d.w, t, 0.5, 0.12, c.all < 0.8); } });

  add('tray', { top: true, make(g) {
    part(g, box(1.1, 0.05, 0.72), '#a97c50', 0, 0.025, 0);
    const rice = part(g, sph(0.13, 12, 8), '#fffdf6', -0.3, 0.14, 0.12); rice.scale.y = 0.7;
    dbl(part(g, bowlGeo(0.17, 0.12), '#c98a64', -0.3, 0.05, 0.12));
    dbl(part(g, bowlGeo(0.16, 0.12), '#7d4b3a', 0.3, 0.05, 0.14));
    const soup = part(g, cyl(0.13, 0.13, 0.01, 14), '#c99a5b', 0.3, 0.145, 0.14, 0, 0, 0, false);
    part(g, cyl(0.26, 0.28, 0.03, 18), '#fffaf0', 0.08, 0.065, -0.16);
    const fish = part(g, sph(0.14, 12, 8), '#d9a15a', 0.08, 0.11, -0.16); fish.scale.set(1.5, 0.4, 0.6);
    const pickle = part(g, cyl(0.07, 0.07, 0.02, 10), '#f3d27a', -0.34, 0.06, -0.18);
    return { items: [fish, rice, soup, pickle], w: wisps(g, 2, 0.3, 0.16, 0.14) };
  }, run(d, t, u, c) { eatAway(d.items, c.all); runW(d.w, t, 0.4, 0.1, c.all < 0.7); } });

  add('bigbowl', { top: true, make(g) {
    dbl(part(g, bowlGeo(0.56, 0.42), '#f6efdf'));
    part(g, torus(0.545, 0.016, 5, 26), '#d6776a', 0, 0.32, 0, FLAT, 0, 0, false);
    const soup = part(g, cyl(0.47, 0.47, 0.02, 22), '#b98a4e', 0, 0.36, 0, 0, 0, 0, false);
    const items = [];
    for (let i = 0; i < 5; i++) items.push(part(g, torus(0.12 + i * 0.06, 0.022, 5, 18), '#f4dc98', 0, 0.38 + i * 0.008, 0, FLAT, 0, i, false));
    items.push(part(g, new THREE.ConeGeometry(0.3, 0.26, 12), '#b8d68e', 0, 0.52, 0));
    return { soup, items, w: wisps(g, 3, 0, 0.5, 0) };
  }, run(d, t, u, c) { eatAway(d.items, c.all); d.soup.visible = c.all < 0.97; runW(d.w, t, 0.6, 0.12, c.all < 0.75); } });

  add('soba', { top: true, make(g) {
    dbl(part(g, bowlGeo(0.4, 0.3), '#4b3b34'));
    part(g, cyl(0.34, 0.34, 0.015, 20), '#8a5a35', 0, 0.26, 0, 0, 0, 0, false);
    const items = [];
    for (let i = 0; i < 4; i++) items.push(part(g, torus(0.08 + i * 0.05, 0.016, 5, 16), '#b79a7a', 0, 0.275, 0, FLAT, 0, i, false));
    const tem = part(g, sph(0.13, 10, 8), '#e6b25f', 0.08, 0.33, -0.06); tem.scale.y = 0.55; items.push(tem);
    return { items, w: wisps(g, 2, 0, 0.34, 0) };
  }, run(d, t, u, c) { eatAway(d.items, c.all); runW(d.w, t, 0.45, 0.1); } });

  add('parfait', { top: true, make(g) {
    dbl(part(g, lathe([[0, 0], [0.13, 0], [0.04, 0.03], [0.04, 0.12], [0.17, 0.5], [0.19, 0.56], [0.17, 0.56], [0.03, 0.14]]), new THREE.MeshToonMaterial({ color: '#dff1f7', transparent: true, opacity: 0.55 })));
    const layers = [['#fffaf0', 0.2, 0.08], ['#f3a9bd', 0.3, 0.12], ['#fffaf0', 0.4, 0.15], ['#b98a5a', 0.48, 0.165]].map(([c, y, r]) => part(g, cyl(r, r * 0.9, 0.09, 14), c, 0, y, 0, 0, 0, 0, false));
    const cream = part(g, sph(0.13, 12, 8), '#fffdf6', 0, 0.6, 0);
    const cherry = part(g, sph(0.045, 10, 8), '#d6464f', 0, 0.74, 0);
    part(g, cyl(0.006, 0.008, 0.46, 6), '#d3d6da', 0.14, 0.42, 0.08, 0.1, 0, -0.35);
    const items = [cherry, cream, ...layers.slice().reverse()];
    return { items };
  }, run(d, t, u, c) { eatAway(d.items, c.all); } });

  add('takoboat', { top: true, make(g) {
    part(g, box(0.72, 0.05, 0.42), '#d9b98a', 0, 0.04, 0);
    const items = [];
    for (let i = 0; i < 6; i++) { const b = G(g); b.position.set(-0.22 + (i % 3) * 0.22, 0.14, i < 3 ? -0.09 : 0.09); part(b, sph(0.1, 12, 10), '#d9a15a'); part(b, cyl(0.075, 0.075, 0.016, 10), '#7a3f26', 0, 0.09, 0, 0, 0, 0, false); part(b, box(0.05, 0.01, 0.02), '#79b267', 0.02, 0.11, 0, 0, i, 0, false); items.push(b); }
    return { items, w: wisps(g, 2, 0, 0.3, 0) };
  }, run(d, t, u, c) { eatAway(d.items, c.all); runW(d.w, t, 0.4, 0.09, c.all < 0.8); } });

  add('grill', { top: true, make(g) {
    part(g, box(1.3, 0.14, 0.86), '#4b4b52', 0, 0.07, 0);
    const balls = [];
    for (let z = 0; z < 3; z++) for (let x = 0; x < 4; x++) { const px = -0.45 + x * 0.3, pz = -0.25 + z * 0.25; part(g, cyl(0.12, 0.12, 0.01, 14), '#2e2622', px, 0.145, pz, 0, 0, 0, false); const b = G(g); b.position.set(px, 0.2, pz); const m = part(b, sph(0.105, 12, 10), '#ecd9a0'); const s = part(b, sph(0.106, 12, 10, 0, Math.PI * 2, 0, FLAT), '#c98a4e', 0, 0, 0, 0, 0, 0, false); balls.push({ b, m, s, ph: x * 0.31 + z * 0.17 }); }
    return { balls, w: wisps(g, 3, 0, 0.3, 0) };
  }, run(d, t) { for (const q of d.balls) { const k = (t * 0.45 + q.ph) % 1; q.b.rotation.x = ease(clamp((k - 0.7) / 0.15)) * Math.PI; q.b.position.y = 0.2 + Math.sin(clamp((k - 0.7) / 0.15) * Math.PI) * 0.1; q.s.material.color.set(k > 0.4 ? '#b0703a' : '#d9a15a'); } runW(d.w, t, 0.7, 0.14); } });

  add('wok', { top: true, make(g) {
    const pan = G(g); dbl(part(pan, lathe([[0, 0], [0.26, 0.02], [0.42, 0.14], [0.44, 0.18], [0.4, 0.17], [0, 0.04]]), '#3f3b39')); part(pan, cyl(0.03, 0.035, 0.5, 8), '#7d6250', 0.66, 0.14, 0, 0, 0, FLAT);
    const bits = []; for (let i = 0; i < 9; i++) bits.push(part(g, new THREE.DodecahedronGeometry(0.05, 0), ['#e6a15f', '#79b267', '#f3c64f', '#d9745a'][i % 4]));
    return { pan, bits, w: wisps(g, 3, 0, 0.3, 0) };
  }, run(d, t) { const k = (t * 1.2) % 1, up = Math.sin(k * Math.PI); d.pan.rotation.z = -up * 0.18; d.bits.forEach((b, i) => { const a = i * 2.4, r = 0.08 + (i % 4) * 0.06; b.position.set(Math.cos(a) * r, 0.14 + up * (0.25 + (i % 3) * 0.12), Math.sin(a) * r); b.rotation.x = t * 5 + i; }); runW(d.w, t, 0.6, 0.13); } });

  add('dishes', { top: true, make(g) {
    part(g, box(0.9, 0.06, 0.6), '#c9c4b6', 0, 0.03, 0);
    const stack = []; for (let i = 0; i < 4; i++) stack.push(part(g, cyl(0.2, 0.17, 0.04, 16), '#fffaf0', -0.22, 0.09 + i * 0.05, 0));
    const wet = part(g, cyl(0.2, 0.17, 0.04, 16), '#fffaf0', 0.2, 0.1, 0);
    const foam = []; for (let i = 0; i < 6; i++) foam.push(part(g, sph(0.05, 8, 6), '#fbfbf6', 0.2, 0.14, 0, 0, 0, 0, false));
    return { stack, wet, foam };
  }, run(d, t, u, c) { d.stack.forEach((m, i) => { m.visible = c.all < 1 - i * 0.22; }); d.wet.rotation.y = t * 3; d.foam.forEach((m, i) => { const k = (t * 0.7 + i / 6) % 1, a = i * 1.05 + t; m.position.set(0.2 + Math.cos(a) * 0.14, 0.14 + k * 0.28, Math.sin(a) * 0.14); m.scale.setScalar(1 - k * 0.5); }); } });

  add('basket', { top: false, make(g) {
    const b = G(g); b.position.set(0, 1.3, 0.2);
    for (const [w, d2, x, z] of [[0.6, 0.02, 0, 0.2], [0.6, 0.02, 0, -0.2], [0.02, 0.4, 0.3, 0], [0.02, 0.4, -0.3, 0]]) part(b, box(w, 0.26, d2), '#e0b75c', x, 0, z);
    part(b, box(0.6, 0.02, 0.4), '#c9a050', 0, -0.13, 0);
    part(b, torus(0.28, 0.018, 5, 18, Math.PI), '#a97c50', 0, 0.13, 0);
    const goods = [['#f3a9bd', -0.14, 0.02], ['#9fd0ea', 0.1, -0.05], ['#f3d27a', 0.16, 0.08], ['#a8d8b4', -0.04, 0.09]].map(([c, x, z]) => part(b, box(0.14, 0.18, 0.1), c, x, -0.04, z));
    return { goods };
  }, run(d, t, u, c) { d.goods.forEach((m, i) => { m.visible = c.all > i * 0.2 + 0.04; }); } });

  add('gumball', { top: false, make(g) {
    part(g, box(0.8, 1, 0.8), '#e77f8f', 0, 0.5, 0);
    dbl(part(g, sph(0.46, 20, 14), new THREE.MeshToonMaterial({ color: '#dff1f7', transparent: true, opacity: 0.5 }), 0, 1.45, 0));
    for (let i = 0; i < 14; i++) part(g, sph(0.1, 10, 8), ['#f3a9bd', '#9fd0ea', '#f3d27a', '#a8d8b4'][i % 4], Math.cos(i * 2.4) * (0.1 + (i % 3) * 0.1), 1.22 + (i % 4) * 0.13, Math.sin(i * 2.4) * (0.1 + (i % 3) * 0.1), 0, 0, 0, false);
    const knob = G(g); knob.position.set(0, 0.62, 0.41); part(knob, cyl(0.15, 0.15, 0.05, 16), '#d3d6da', 0, 0, 0, FLAT); part(knob, box(0.26, 0.05, 0.05), '#a9a395', 0, 0, 0.04);
    part(g, box(0.28, 0.2, 0.06), '#7d4b3a', 0, 0.26, 0.4);
    const cap = part(g, sph(0.09, 10, 8), '#f3a9bd', 0, 0.26, 0.45);
    return { knob, cap };
  }, run(d, t, u, c) { d.knob.rotation.z = c.step === 1 ? u * Math.PI * 4 : 0; d.cap.visible = c.step === 1 ? u > 0.7 : c.step > 1 && u < 0.2; } });

  add('frog', { top: true, make(g) { const f = G(g); part(f, sph(0.26, 14, 10), '#8fc586', 0, 0.22, 0); for (const s of [-1, 1]) { part(f, sph(0.08, 10, 8), '#fffaf0', s * 0.13, 0.46, 0.08); part(f, sph(0.035, 8, 6), '#2e2622', s * 0.13, 0.46, 0.15, 0, 0, 0, false); part(f, sph(0.09, 8, 6), '#7fb979', s * 0.25, 0.05, 0.1); } return { f }; }, run(d, t) { d.f.position.y = Math.abs(Math.sin(t * 2)) * 0.05; } });

  /* ---------- 일·종이·가게 ---------- */
  add('stamp', { top: true, make(g) {
    const sheet = part(g, box(0.5, 0.01, 0.36), '#fffaf0', 0, 0.01, 0);
    const mark = part(g, cyl(0.08, 0.08, 0.004, 16), '#d6464f', 0.1, 0.018, 0.04, 0, 0, 0, false);
    const s = G(g); part(s, cyl(0.08, 0.09, 0.05, 14), '#a97c50', 0, 0.03, 0); part(s, cyl(0.03, 0.04, 0.16, 10), '#7d6250', 0, 0.14, 0); part(s, sph(0.06, 10, 8), '#a97c50', 0, 0.25, 0);
    return { s, mark };
  }, run(d, t, u) { const k = u % 1, hit = Math.sin(clamp(k * 2) * Math.PI); d.s.position.set(0.1, 0.02 + (1 - hit) * 0.34, 0.04); d.mark.visible = k > 0.5; } });

  add('coins', { top: true, make(g) { part(g, cyl(0.3, 0.32, 0.04, 20), '#a97c50', 0, 0.02, 0); const list = []; for (let i = 0; i < 8; i++) list.push(part(g, cyl(0.08, 0.08, 0.02, 14), '#e3bb4a', Math.cos(i * 2.2) * 0.12, 0.05 + (i % 4) * 0.022, Math.sin(i * 2.2) * 0.12)); return { list }; }, run(d, t, u) { d.list.forEach((m, i) => { m.visible = u > i / 9; }); } });

  add('deskbell', { top: true, make(g) { part(g, cyl(0.16, 0.2, 0.05, 18), '#7d6250', 0, 0.025, 0); const b = G(g); dbl(part(b, lathe([[0, 0.17], [0.05, 0.16], [0.13, 0.08], [0.17, 0]]), '#e3bb4a', 0, 0.05, 0)); part(b, sph(0.03, 8, 6), '#c99a2e', 0, 0.24, 0); const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.25, 24), new THREE.MeshBasicMaterial({ color: '#e3bb4a', transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.position.y = 0.2; g.add(ring); return { b, ring }; }, run(d, t) { const k = (t * 1.4) % 1; d.b.position.y = -Math.max(0, Math.sin(k * 12)) * 0.03 * (1 - k); d.ring.scale.setScalar(0.5 + k * 1.6); d.ring.material.opacity = 1 - k; d.ring.lookAt(0, 9, 30); } });

  add('paper', { top: true, make(g) {
    part(g, box(0.56, 0.012, 0.74), paper('exam-sheet', 128, 170, (c, w, h) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d9cbb0'; for (let y = 22; y < h; y += 16) { c.beginPath(); c.moveTo(8, y); c.lineTo(w - 8, y); c.stroke(); } }), 0, 0.01, 0);
    const lines = []; for (let i = 0; i < 9; i++) lines.push(part(g, box(0.4 - (i % 3) * 0.06, 0.003, 0.016), '#6b5a50', -0.02, 0.018, -0.28 + i * 0.07, 0, 0, 0, false));
    const pen = G(g); part(pen, cyl(0.016, 0.016, 0.34, 8), '#f3c64f', 0, 0.17, 0, 0, 0, 0.0); part(pen, new THREE.ConeGeometry(0.016, 0.05, 8), '#d9b98a', 0, -0.02, 0, Math.PI, 0, 0); part(pen, cyl(0.018, 0.018, 0.04, 8), '#f4a9bd', 0, 0.35, 0);
    pen.rotation.z = -0.5;
    return { lines, pen };
  }, run(d, t, u, c) { const n = Math.floor(c.all * d.lines.length * 1.15); d.lines.forEach((m, i) => { m.visible = i < n; }); const i = Math.min(d.lines.length - 1, n); d.pen.position.set(-0.2 + ((t * 1.4) % 1) * 0.4, 0.03, -0.28 + i * 0.07); } });

  add('notice', { top: false, make(g) { const list = []; for (let i = 0; i < 3; i++) { const p = G(g); p.position.set(-0.5 + i * 0.5, 1.65, 0.05); part(p, box(0.4, 0.5, 0.012), paper(`notice-${i}`, 96, 120, (c, w, h) => { c.fillStyle = ['#fffaf0', '#fff2b8', '#ffe3ea'][i]; c.fillRect(0, 0, w, h); c.fillStyle = '#b8a890'; for (let y = 22; y < h - 8; y += 14) c.fillRect(10, y, w - 20, 4); c.fillStyle = '#d6776a'; c.fillRect(10, 8, w - 40, 8); }), 0, -0.25, 0); part(p, sph(0.03, 8, 6), '#d6464f', 0, 0, 0.02); list.push(p); } return { list }; }, run(d, t) { d.list.forEach((p, i) => { p.rotation.x = Math.max(0, Math.sin(t * 0.8 + i * 2)) * 0.1; }); } });

  add('drawer', { top: false, make(g) { const f = G(g); f.position.y = 1.25; part(f, box(0.9, 0.5, 0.42), '#c9a57c', 0, 0, -0.2); const dr = G(f); part(dr, box(0.74, 0.34, 0.36), '#e0c090', 0, 0, 0); part(dr, sph(0.04, 8, 6), '#7d6250', 0, 0, 0.2); const med = part(dr, box(0.2, 0.14, 0.14), '#fffaf0', 0, 0.2, 0.02); part(med, box(0.12, 0.03, 0.142), '#79b267', 0, 0, 0, 0, 0, 0, false); return { dr, med }; }, run(d, t, u) { const k = ease(clamp(u < 0.5 ? u * 3 : (1 - u) * 3)); d.dr.position.z = -0.2 + k * 0.32; d.med.position.y = 0.2 + Math.sin(clamp((u - 0.3) * 3) * Math.PI) * 0.14; } });

  // 인터넷 코너: 자리에 이미 컴퓨터가 있다. 모니터·키보드를 새로 만들지 않고, 그 화면 위에 글자가 찍혀 나가는 빛만 얹는다 (2026-11-10 이재헌 지시)
  add('pc', { top: true, make(g) { const sc = part(g, box(0.86, 0.58, 0.004), new THREE.MeshBasicMaterial({ color: '#cfeefa', transparent: true, opacity: 0.55, depthWrite: false }), 0, 0.62, 0.06, 0, 0, 0, false); const lines = []; for (let i = 0; i < 6; i++) lines.push(part(g, box(0.6 - i * 0.04, 0.03, 0.004), new THREE.MeshBasicMaterial({ color: '#4f7590' }), -0.04, 0.82 - i * 0.075, 0.066, 0, 0, 0, false)); return { lines, sc }; }, run(d, t) { const n = Math.floor(((t * 0.8) % 1) * 7); d.lines.forEach((m, i) => { m.visible = i < n; }); } });
  // 장소에 진짜 물건이 있어 아무것도 새로 만들지 않는 장면
  add('none', { make() { return {}; }, run() {} });

  add('slot', { top: false, make(g) { part(g, box(1.1, 1.8, 0.7), '#7d6aa8', 0, 0.9, -0.1); const reels = []; for (let i = 0; i < 3; i++) { const r = G(g); r.position.set(-0.3 + i * 0.3, 1.2, 0.26); part(r, cyl(0.2, 0.2, 0.24, 12), paper('reel', 64, 64, (c, w, h) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.fillStyle = '#d6464f'; c.font = '24px sans-serif'; c.fillText('7', 22, 28); c.fillStyle = '#e3bb4a'; c.fillText('★', 18, 60); }), 0, 0, 0, 0, 0, FLAT); reels.push(r); } const arm = G(g); arm.position.set(0.66, 1.1, 0); part(arm, cyl(0.03, 0.03, 0.5, 8), '#d3d6da', 0, 0.25, 0); part(arm, sph(0.08, 10, 8), '#d6464f', 0, 0.52, 0); return { reels, arm }; }, run(d, t, u) { d.reels.forEach((r, i) => { r.rotation.x = u < 0.3 + i * 0.2 ? t * 14 : Math.round(t) * 2.1; }); d.arm.rotation.x = u < 0.15 ? u * 7 : 0; } });

  add('cane', { top: false, make(g) { const c = G(g); c.position.set(0, 1.1, 0.5); part(c, cyl(0.03, 0.035, 1.1, 8), '#7d4b3a'); part(c, torus(0.1, 0.03, 6, 14, Math.PI), '#7d4b3a', 0.1, 0.55, 0); part(c, cyl(0.04, 0.04, 0.06, 8), '#e3bb4a', 0, -0.2, 0); return { c }; }, run(d, t, u) { d.c.rotation.z = Math.sin(t * 1.2) * 0.25; d.c.position.y = 1.1 + Math.sin(clamp(u) * Math.PI) * 0.2; } });

  add('goods', { top: true, make(g) { const list = [['#f4a9bd', -0.3], ['#9fd0ea', 0], ['#f3d27a', 0.3]].map(([c, x]) => { const p = G(g); p.position.x = x; const b = part(p, sph(0.14, 12, 10), c, 0, 0.14, 0); b.scale.z = 0.5; part(p, torus(0.1, 0.008, 5, 14, Math.PI), '#a97c50', 0, 0.2, 0); return p; }); return { list }; }, run(d, t, u) { const i = Math.floor(u * 3) % 3; d.list.forEach((p, n) => { p.position.y = n === i ? Math.sin(((u * 3) % 1) * Math.PI) * 0.26 : 0; }); } });

  add('pottery', { top: true, make(g) { const list = [['#c98a64', -0.34, 0.2], ['#8fb6d6', 0, 0.26], ['#d9b98a', 0.34, 0.16]].map(([c, x, h]) => { const p = G(g); p.position.x = x; dbl(part(p, bowlGeo(0.16, h), c)); return p; }); return { list }; }, run(d, t, u) { const i = Math.floor(u * 3) % 3; d.list.forEach((p, n) => { const up = n === i ? Math.sin(((u * 3) % 1) * Math.PI) : 0; p.position.y = up * 0.22; p.rotation.y = up * 3; }); } });

  add('books', { top: true, make(g) { const list = []; for (let i = 0; i < 7; i++) list.push(part(g, box(0.34 - (i % 3) * 0.02, 0.07, 0.24), ['#8fb6d6', '#e79bb0', '#a8d8b4', '#f3d27a', '#c9b6e4', '#f0a58c', '#c7d0d6'][i], (i % 2) * 0.03, 0.04 + i * 0.075, 0, 0, i * 0.3, 0)); return { list }; }, run(d, t, u, c) { d.list.forEach((m, i) => { m.visible = c.all > i / 8 - 0.02; }); } });

  add('flyer', { top: false, make(g) { const p = G(g); p.position.set(0, 1.6, 0.1); part(p, box(0.5, 0.66, 0.01), paper('flyer', 96, 128, (c, w, h) => { c.fillStyle = '#fff2b8'; c.fillRect(0, 0, w, h); c.fillStyle = '#d6464f'; c.fillRect(8, 8, w - 16, 26); c.fillStyle = '#fffaf0'; c.font = '18px sans-serif'; c.fillText('특가', 28, 28); c.fillStyle = '#f3a9bd'; for (let i = 0; i < 4; i++) c.fillRect(8 + (i % 2) * 42, 44 + Math.floor(i / 2) * 40, 34, 32); }), 0, -0.1, 0); return { p }; }, run(d, t) { d.p.rotation.x = Math.sin(t * 2.2) * 0.07; } });

  add('crate', { top: false, make(g) { const c = G(g); part(c, box(0.8, 0.5, 0.6), '#c79a63', 0, 0.25, 0); for (const y of [0.1, 0.4]) part(c, box(0.82, 0.05, 0.62), '#a97c50', 0, y, 0); for (const [x, z] of [[-0.2, -0.1], [0.2, 0.1], [0, 0]]) part(c, sph(0.13, 10, 8), '#f2dd64', x, 0.55, z); return { c }; }, run(d, t, u, c) { d.c.position.y = Math.sin(clamp(u) * Math.PI) * 0.34; d.c.position.z = u * 0.3; } });

  add('crane', { top: false, make(g) { const b = G(g); b.position.y = 4.4; part(b, box(0.12, 0.12, 3.2), '#e0b75c', 0, 0, 0); const hook = G(b); part(hook, cyl(0.012, 0.012, 1.4, 6), '#5d5148', 0, -0.7, 0); part(hook, box(0.7, 0.42, 0.5), '#c79a63', 0, -1.6, 0); return { hook }; }, run(d, t) { const k = (t * 0.25) % 1; d.hook.position.z = -1 + Math.sin(k * Math.PI * 2) * 1; } });

  /* ---------- 생활 ---------- */
  add('homepot', { top: true, make(g) { dbl(part(g, lathe([[0, 0], [0.3, 0], [0.34, 0.26], [0.3, 0.3], [0, 0.04]]), '#c9c4b6')); const p = G(g); p.position.set(0, 0.3, -0.3); part(p, lathe([[0.36, 0], [0.26, 0.08], [0, 0.11]]), '#b4b8bc', 0, 0, 0.3); part(p, sph(0.05, 10, 8), '#a97c50', 0, 0.14, 0.3); part(g, cyl(0.28, 0.28, 0.02, 18), '#fffdf6', 0, 0.26, 0, 0, 0, 0, false); const fire = root.FireFx ? root.FireFx.makeFire(G(g), 0.42, 'gas') : null; if (fire) fire.g.position.y = -0.02; return { p, w: wisps(g, 3, 0, 0.34, 0), fire }; }, run(d, t, u, c) { d.p.rotation.x = -ease(clamp(c.all * 3 - 1.4)) * 1.5; runW(d.w, t, 0.5, 0.12, c.all > 0.3); if (d.fire) d.fire.run(t, c.all < 0.9); } });

  add('diary', { top: true, make(g) { const b = G(g); part(b, box(0.56, 0.02, 0.4), '#f3a9bd', 0, 0.01, 0); part(b, box(0.26, 0.012, 0.36), '#fffaf0', -0.135, 0.028, 0); part(b, box(0.26, 0.012, 0.36), '#fffaf0', 0.135, 0.028, 0); const lines = []; for (let i = 0; i < 6; i++) lines.push(part(b, box(0.2, 0.003, 0.014), '#7a5245', 0.135, 0.037, -0.13 + i * 0.05, 0, 0, 0, false)); const pen = G(b); part(pen, cyl(0.014, 0.014, 0.28, 8), '#9fd0ea', 0, 0.14, 0); pen.rotation.z = -0.5; return { lines, pen }; }, run(d, t, u, c) { const n = Math.floor(c.all * 7); d.lines.forEach((m, i) => { m.visible = i < n; }); d.pen.position.set(0.05 + ((t * 1.5) % 1) * 0.17, 0.05, -0.13 + Math.min(5, n) * 0.05); } });

  add('key', { top: false, make(g) { const k = G(g); k.position.set(0, 1.05, 0.05); part(k, torus(0.06, 0.016, 6, 14), '#e3bb4a'); part(k, box(0.024, 0.16, 0.02), '#e3bb4a', 0, -0.13, 0); part(k, box(0.05, 0.02, 0.02), '#e3bb4a', 0.03, -0.18, 0); return { k }; }, run(d, t, u) { d.k.rotation.z = Math.sin(u * Math.PI) * 1.6; } });

  add('fire', { top: false, make(g) { for (let i = 0; i < 6; i++) part(g, cyl(0.07, 0.09, 0.9, 7), '#7d5a44', 0, 0.12, 0, 1.3, i * 1.05, 0); const fl = []; for (let i = 0; i < 5; i++) fl.push(part(g, new THREE.ConeGeometry(0.2 - i * 0.02, 0.6, 8), ['#f3b672', '#f2c230', '#e8634f'][i % 3], Math.cos(i * 2.2) * 0.14, 0.42, Math.sin(i * 2.2) * 0.14, 0, 0, 0, false)); const spark = []; for (let i = 0; i < 6; i++) spark.push(part(g, sph(0.02, 6, 4), '#f2c230', 0, 0, 0, 0, 0, 0, false)); return { fl, spark }; }, run(d, t) { d.fl.forEach((m, i) => { const s = 0.8 + Math.sin(t * 9 + i * 1.9) * 0.22; m.scale.set(0.9 + Math.sin(t * 7 + i) * 0.15, s, 0.9); }); d.spark.forEach((m, i) => { const k = (t * 0.7 + i / 6) % 1; m.position.set(Math.sin(i * 3 + k * 3) * 0.3, 0.5 + k * 1.3, Math.cos(i * 2) * 0.3); m.visible = k < 0.8; }); } });

  add('sake', { top: true, make(g) { part(g, lathe([[0, 0], [0.13, 0], [0.15, 0.2], [0.06, 0.36], [0.05, 0.46], [0, 0.46]]), '#f6efdf'); const cup = G(g); cup.position.x = 0.32; dbl(part(cup, bowlGeo(0.08, 0.08), '#fffaf0')); const s = part(cup, cyl(0.06, 0.06, 0.008, 12), '#efe6c8', 0, 0.065, 0, 0, 0, 0, false); return { s }; }, run(d, t, u, c) { d.s.visible = (u % 0.5) < 0.35; } });

  add('bath', { top: false, make(g) { const ring = []; for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -FLAT; g.add(r); ring.push(r); } return { ring, w: wisps(g, 4, 0, 0.6, 0) }; }, run(d, t) { d.ring.forEach((r, i) => { const k = (t * 0.5 + i / 4) % 1; r.position.set(Math.cos(i * 2) * 0.5, 0.55, Math.sin(i * 2) * 0.5); r.scale.setScalar(0.6 + k * 2); r.material.opacity = (1 - k) * 0.7; }); runW(d.w, t, 1, 0.2); } });

  add('sauna', { top: false, make(g) { for (let i = 0; i < 9; i++) part(g, new THREE.DodecahedronGeometry(0.17, 0), '#8f8c84', Math.cos(i * 2.4) * (0.1 + (i % 3) * 0.12), 0.95 + (i % 2) * 0.1, Math.sin(i * 2.4) * (0.1 + (i % 3) * 0.12)); part(g, box(0.9, 0.9, 0.8), '#5e5c58', 0, 0.45, 0); return { w: wisps(g, 6, 0, 1.2, 0) }; }, run(d, t, u, c) { const k = (t * 0.4) % 1; runW(d.w, t, 1.2 + (k < 0.2 ? 0.8 : 0), k < 0.3 ? 0.34 : 0.18); } });

  add('foam', { top: false, make(g) { const list = []; for (let i = 0; i < 10; i++) list.push(part(g, sph(0.12, 10, 8), new THREE.MeshToonMaterial({ color: '#fbfbf6', transparent: true, opacity: 0.85 }))); return { list }; }, run(d, t) { d.list.forEach((m, i) => { const k = (t * 0.35 + i / 10) % 1; m.position.set(Math.cos(i * 2.4 + t * 0.4) * 0.7, 0.6 + k * 1.4, Math.sin(i * 2.4 + t * 0.4) * 0.7); m.scale.setScalar(0.5 + k); m.material.opacity = (1 - k) * 0.85; }); } });

  add('broom', { top: false, make(g) { const b = G(g); part(b, cyl(0.022, 0.022, 1.3, 8), '#a97c50', 0, 0.75, 0); part(b, new THREE.ConeGeometry(0.2, 0.34, 10), '#d3b47a', 0, 0.16, 0, Math.PI, 0, 0); const leaves = []; for (let i = 0; i < 6; i++) { const l = part(g, leafGeo, '#d9a15a', 0, 0.02, 0, 0, 0, 0, false); l.scale.y = 0.15; leaves.push(l); } return { b, leaves }; }, run(d, t) { d.b.position.x = Math.sin(t * 3) * 0.3; d.b.rotation.z = Math.sin(t * 3) * 0.25; d.leaves.forEach((l, i) => { const k = (t * 0.3 + i / 6) % 1; l.position.set(-0.7 + k * 1.6, 0.03 + Math.abs(Math.sin(k * 9)) * 0.08, Math.cos(i * 2) * 0.3); }); } });

  add('shrine', { top: false, make(g) { const piv = G(g); piv.position.y = 3.3; const rope = []; for (let i = 0; i < 5; i++) rope.push(part(piv, torus(0.05, 0.022, 5, 10), i % 2 ? '#fffaf0' : '#d6464f', 0, -0.35 - i * 0.28, 0, 0, i % 2 ? FLAT : 0, 0, false)); dbl(part(piv, lathe([[0, 0.3], [0.1, 0.27], [0.24, 0.1], [0.28, 0]]), '#e3bb4a', 0, -0.32, 0)); const coin = part(g, cyl(0.06, 0.06, 0.012, 12), '#e3bb4a', 0, 0.9, 0.3); return { piv, coin }; }, run(d, t, u, c) { d.piv.rotation.z = c.step === 1 || c.clip === 'rope_pull' ? Math.sin(t * 6) * 0.2 : 0; d.coin.visible = c.step === 0; d.coin.position.y = 1.6 - u * 1.1; d.coin.rotation.x = t * 16; } });

  add('omamori', { top: true, make(g) { const list = [['#d6464f', -0.26], ['#8fb6d6', 0], ['#f3d27a', 0.26]].map(([c, x]) => { const p = G(g); p.position.x = x; part(p, box(0.16, 0.26, 0.03), c, 0, 0.15, 0); part(p, box(0.06, 0.08, 0.032), '#fffaf0', 0, 0.16, 0, 0, 0, 0, false); return p; }); return { list }; }, run(d, t, u) { const i = Math.floor(u * 3) % 3; d.list.forEach((p, n) => { p.position.y = n === i ? 0.12 : 0; }); } });

  add('speaker', { top: false, make(g) { part(g, cyl(0.1, 0.12, 2.2, 10), '#8f8c88', 0, 1.1, 0); const box2 = G(g); box2.position.y = 2.4; part(box2, box(0.7, 0.6, 0.5), '#5d5148'); const cone2 = part(box2, cyl(0.2, 0.2, 0.02, 16), '#2e2622', 0, 0, 0.26, FLAT, 0, 0, false); const notes = []; for (let i = 0; i < 4; i++) notes.push(part(g, sph(0.06, 8, 6), ['#f2748e', '#6fb3e0'][i % 2], 0, 0, 0, 0, 0, 0, false)); return { cone2, notes }; }, run(d, t) { d.cone2.scale.setScalar(1 + Math.abs(Math.sin(t * 8)) * 0.16); d.notes.forEach((n, i) => { const k = (t * 0.5 + i / 4) % 1; n.position.set(Math.sin(k * 5 + i) * 0.5, 2.4 + k * 1.2, 0.5); n.visible = k < 0.85; }); } });

  add('lights', { top: false, make(g) { const beams = [['#f3a9bd', -2], ['#9fd0ea', 0], ['#f3d27a', 2]].map(([c, x]) => { const m = new THREE.Mesh(new THREE.ConeGeometry(1, 5, 14, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, 2.8, 0); g.add(m); return m; }); return { beams }; }, run(d, t) { d.beams.forEach((m, i) => { m.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.3; m.material.opacity = 0.14 + Math.abs(Math.sin(t * 2 + i)) * 0.14; }); } });

  /* ---------- 자연·거리 ---------- */
  add('fishing', { top: false, make(g) { const fl = G(g); fl.position.set(0, 0.12, -5); part(fl, sph(0.1, 10, 8), '#fffaf0'); part(fl, sph(0.1, 10, 8, 0, Math.PI * 2, 0, FLAT), '#e8634f', 0, 0.002, 0, 0, 0, 0, false); const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.33, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -FLAT; ring.position.set(0, 0.06, -5); g.add(ring); const fish = G(g); part(fish, sph(0.2, 12, 8), '#9fb8c6'); fish.children[0].scale.set(1.5, 0.7, 0.5); part(fish, new THREE.ConeGeometry(0.12, 0.2, 6), '#87a2b3', -0.34, 0, 0, 0, 0, FLAT); return { fl, ring, fish }; }, run(d, t, u, c) { const bite = (t % 5) > 3.6 && (t % 5) < 4.2; d.fl.position.y = 0.12 + Math.sin(t * 2) * 0.03 - (bite ? 0.14 : 0); const k = (t * 0.5) % 1; d.ring.scale.setScalar(0.6 + k * 2); d.ring.material.opacity = 1 - k; const reel = c.clip === 'reel_pull'; d.fish.visible = reel; if (reel) d.fish.position.set(0, 0.4 + Math.sin(u * Math.PI) * 1.4, -5 + u * 3.6); } });

  add('splash', { top: false, make(g) { const list = []; for (let i = 0; i < 7; i++) list.push(part(g, sph(0.05, 8, 6), '#9fd6e6', 0, 0, 0, 0, 0, 0, false)); const stone = part(g, new THREE.DodecahedronGeometry(0.07, 0), '#a9a395'); return { list, stone }; }, run(d, t, u) { d.stone.visible = u < 0.5; d.stone.position.set(0, 0.8 * Math.sin(u * 2 * Math.PI / 2) + 0.05, 1 - u * 2); d.list.forEach((m, i) => { const k = clamp((u - 0.5) * 2), a = i * 0.9; m.visible = u >= 0.5; m.position.set(Math.cos(a) * k * 0.5, Math.sin(k * Math.PI) * 0.5, -0.0 + Math.sin(a) * k * 0.5); }); } });

  add('dummy', { top: false, make(g) { const h = G(g); part(h, cyl(0.08, 0.1, 1.2, 8), '#a97c50', 0, 0.6, 0); part(h, box(1.1, 0.1, 0.1), '#a97c50', 0, 1.15, 0); part(h, sph(0.22, 12, 10), '#e0c090', 0, 1.5, 0); part(h, box(0.4, 0.5, 0.2), '#d3b47a', 0, 0.95, 0); return { h }; }, run(d, t) { const k = (t * 0.72) % 1; d.h.rotation.x = -Math.max(0, Math.sin(clamp((k - 0.5) * 3) * Math.PI)) * 0.45; } });

  add('berry', { top: false, make(g) { const list = []; for (let i = 0; i < 7; i++) list.push(part(g, sph(0.08, 8, 6), '#d9745a', Math.cos(i * 2.4) * 0.4, 0.5 + (i % 3) * 0.2, Math.sin(i * 2.4) * 0.3)); return { list }; }, run(d, t, u, c) { eatAway(d.list, c.all); } });

  add('sand', { top: false, make(g) { const list = []; for (let i = 0; i < 12; i++) list.push(part(g, sph(0.03, 6, 4), '#d9c08f', 0, 0, 0, 0, 0, 0, false)); return { list }; }, run(d, t, u) { d.list.forEach((m, i) => { const k = (t * 1 + i / 12) % 1, a = i * 2.1; m.position.set(Math.cos(a) * 0.3 * k, 0.8 * (1 - k) * k * 4 * 0.5, 1 - k * 1.6 + Math.sin(a) * 0.2); }); } });

  add('leaves', { top: false, make(g) { const list = []; for (let i = 0; i < 10; i++) { const l = part(g, leafGeo, i % 2 ? '#a8d39b' : '#8fc586', 0, 0, 0, 0, 0, 0, false); l.scale.set(1, 0.18, 0.6); list.push(l); } return { list }; }, run(d, t) { d.list.forEach((l, i) => { const k = (t * 0.32 + i / 10) % 1; l.position.set(Math.cos(i * 2.4) * 1.2 + Math.sin(k * 8 + i) * 0.3, 4.2 - k * 4.1, 1 + Math.sin(i * 2.4) * 1.1); l.rotation.set(k * 9 + i, i, k * 6); }); } });

  add('lampglow', { top: false, make(g) { const glow = new THREE.Mesh(sph(0.6, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe59a', transparent: true, opacity: 0.4, depthWrite: false })); glow.position.y = 3.6; g.add(glow); const moth = []; for (let i = 0; i < 2; i++) moth.push(part(g, sph(0.04, 6, 4), '#a9a395', 0, 0, 0, 0, 0, 0, false)); return { glow, moth }; }, run(d, t) { d.glow.material.opacity = 0.26 + (Math.sin(t * 13) > 0.7 ? 0.28 : 0.1); d.moth.forEach((m, i) => { m.position.set(Math.cos(t * 3 + i * 3) * 0.6, 3.6 + Math.sin(t * 4 + i) * 0.2, Math.sin(t * 3 + i * 3) * 0.6); }); } });

  add('petals', { top: false, make(g) { const list = []; for (let i = 0; i < 7; i++) { const p = part(g, leafGeo, i % 2 ? '#f4a9bd' : '#fff1b8', 0, 0, 0, 0, 0, 0, false); p.scale.set(0.5, 0.12, 0.4); list.push(p); } return { list }; }, run(d, t) { d.list.forEach((p, i) => { const k = (t * 0.4 + i / 7) % 1; p.position.set(Math.sin(i * 2.4 + k * 3) * 0.4, 0.5 + k * 1.1, 0.3 + Math.cos(i * 2.4) * 0.3); p.rotation.set(k * 6, i, k * 4); }); } });

  add('hedge', { top: false, make(g) { const list = []; for (const s of [-1, 1]) { const m = part(g, sph(0.36, 10, 8), '#8fc586', s * 0.26, 0.7, 0); m.scale.set(0.8, 1, 0.9); list.push(m); } return { list }; }, run(d, t, u) { const k = Math.sin(clamp(u) * Math.PI); d.list.forEach((m, i) => { m.position.x = (i ? 1 : -1) * (0.26 + k * 0.28); }); } });

  /* ---------- 솟는 음식 (2026-11-10 3차 이재헌: 허공에 공이 뜨지 않게, 모양을 제대로 잡고 캐릭터와 주고받는 장면으로) ----------
   * rel: 원점은 캐릭터 발밑, +Z는 솟는 곳 쪽. ctx.D = 캐릭터와 솟는 곳 사이 거리.
   * HAND: 캐릭터 손 앞(손에 든 그릇·컵 자리). SRC(D): 솟는 곳 가장자리(캐릭터 쪽).
   * 단계마다 캐릭터 동작(뚜껑 열기·퍼 담기·당기기·레버)과 같은 박자로 움직인다 */
  const HAND = [0, 0.86, 0.46];
  const SRC = D => Math.max(1.1, Math.min(D, 2.2) - 0.25);
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // a에서 b로 포물선을 그리며 (h만큼 솟았다가) 옮겨 간다
  const arc = (m, a, b, k, h = 0.35) => { const p = lerp3(a, b, k); m.position.set(p[0], p[1] + Math.sin(k * Math.PI) * h, p[2]); };
  const grainGeo = sph(0.03, 6, 4);
  // 밥알 더미: 둥근 밥 덩이 위에 쌀알을 촘촘히 박는다
  function riceMound(parent, r, color = '#fffdf6', grain = '#ffffff') {
    const g = G(parent);
    const body = part(g, new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), color, 0, 0, 0, 0, 0, 0, false);
    body.scale.y = 0.75;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399;
      const t = Math.acos(1 - (i + 0.5) / 26);
      const m = part(g, grainGeo, grain, Math.sin(t) * Math.cos(a) * r, Math.cos(t) * r * 0.75, Math.sin(t) * Math.sin(a) * r, 0, 0, 0, false);
      m.scale.set(1, 0.65, 1.6);
      m.rotation.set(a, t, 0);
    }
    return g;
  }
  // 김: 위로 오르며 퍼지는 옅은 연기
  const steamOn = (list, t, on, rise = 0.6, size = 0.12) => runW(list, t, rise, size, on);
  const rel = (name, def) => add(name, { rel: true, ...def });

  // 무한백미: 밥솥에서 밥이 봉긋 솟고 → 주걱으로 떠서 → 캐릭터 그릇에 담아 준다 → 먹는 동안 다시 솟는다
  rel('rice', {
    make(g) {
      const mound = riceMound(g, 0.34);
      const paddle = G(g);
      part(paddle, cyl(0.022, 0.026, 0.42, 8), '#e6cf9e', 0, 0.21, 0);
      const blade = part(paddle, sph(0.1, 12, 8), '#efdcb0', 0, -0.02, 0);
      blade.scale.set(1, 0.25, 1.25);
      const clump = riceMound(paddle, 0.09);
      clump.position.y = 0.01;
      return { mound, paddle, clump, w: wisps(g, 4, 0, 0.35, 0) };
    },
    run(d, t, u, c) {
      const S = [0, 0.55, SRC(c.D)];
      d.mound.position.set(S[0], S[1], S[2]);
      d.w.forEach(m => { m.userData.o[2] = S[2]; m.userData.o[1] = S[1] + 0.3; });
      if (c.step === 0) {
        // 뚜껑을 열면 밥이 아래에서 봉긋 솟아오른다
        const k = ease(clamp((u - 0.25) / 0.6));
        d.mound.scale.setScalar(0.25 + k * 0.75);
        d.mound.position.y = S[1] - 0.25 * (1 - k);
        d.paddle.visible = false;
        steamOn(d.w, t, u > 0.3, 0.9, 0.16);
      } else if (c.step === 1) {
        // 주걱이 밥을 떠서 그릇으로
        d.paddle.visible = true;
        const k = clamp(u / 0.85);
        const top = [S[0], S[1] + 0.3, S[2]];
        if (k < 0.35) { arc(d.paddle, [0.25, 1.1, S[2] * 0.5], top, k / 0.35, 0.1); d.clump.visible = false; }
        else { arc(d.paddle, top, [HAND[0], HAND[1] + 0.12, HAND[2]], (k - 0.35) / 0.65, 0.3); d.clump.visible = k < 0.97; }
        d.paddle.rotation.z = k < 0.35 ? 0.6 : 0.6 - (k - 0.35) * 1.6;
        d.mound.scale.setScalar(1 - (k > 0.35 ? 0.15 : 0));
        steamOn(d.w, t, true, 0.9, 0.16);
      } else {
        // 먹는 동안 덜어 낸 자리가 다시 솟는다
        d.paddle.visible = false;
        d.mound.scale.setScalar(0.85 + ease(clamp(u)) * 0.15);
        steamOn(d.w, t, true, 0.7, 0.13);
      }
    },
  });

  // 서버 나무: 꼭지를 틀면 다시 국물이 컵으로 졸졸 / 소면은 대나무 홈통을 따라 그릇으로 흘러온다
  rel('somen', {
    make(g) {
      // 대나무 꼭지
      const tap = G(g);
      part(tap, cyl(0.07, 0.07, 0.5, 10), '#9dbb6a', 0, 0, 0, FLAT, 0, 0);
      part(tap, torus(0.072, 0.012, 5, 14), '#7f9c55', 0, 0, 0.12, 0, 0, 0, false);
      part(tap, cyl(0.03, 0.03, 0.08, 8), '#a97c50', 0, 0.08, -0.1);
      const stream = part(g, cyl(0.022, 0.016, 1, 8), new THREE.MeshToonMaterial({ color: '#d9a85a', transparent: true, opacity: 0.85 }), 0, 0, 0, 0, 0, 0, false);
      const drops = [];
      for (let i = 0; i < 4; i++) drops.push(part(g, sph(0.025, 6, 4), '#e6b86a', 0, 0, 0, 0, 0, 0, false));
      // 홈통과 흘러오는 소면 다발
      const flume = G(g);
      const trough = part(flume, new THREE.CylinderGeometry(0.09, 0.09, 1, 12, 1, true), '#9dbb6a', 0, 0, 0, FLAT, 0, 0);
      trough.material.side = THREE.DoubleSide;
      const water = part(flume, box(0.12, 0.01, 1), new THREE.MeshToonMaterial({ color: '#cfe9f2', transparent: true, opacity: 0.7 }), 0, -0.035, 0, 0, 0, 0, false);
      const noodles = [];
      for (let i = 0; i < 3; i++) {
        const n = G(flume);
        for (let j = 0; j < 5; j++) part(n, torus(0.045 + j * 0.006, 0.006, 4, 14), '#fdf6dc', 0, -0.02 + j * 0.004, 0, FLAT, 0, j, false);
        noodles.push(n);
      }
      return { tap, stream, drops, flume, noodles, water, w: wisps(g, 3, 0, HAND[1] + 0.05, HAND[2]) };
    },
    run(d, t, u, c) {
      const S = SRC(c.D);
      const somen = c.clip === 'eat_bowl';
      d.tap.visible = d.stream.visible = !somen;
      d.flume.visible = somen;
      d.drops.forEach(m => { m.visible = false; });
      if (!somen) {
        d.tap.position.set(0, 1.25, Math.min(S, 0.95));
        const pouring = c.step === 0 && u > 0.15 && u < 0.9;
        d.stream.visible = pouring;
        const top = 1.2;
        const bot = HAND[1] + 0.06;
        d.stream.scale.y = top - bot;
        d.stream.position.set(0, (top + bot) / 2, Math.min(S, 0.95) * 0.5 + HAND[2] * 0.5);
        d.stream.rotation.x = Math.atan2(Math.min(S, 0.95) - HAND[2], top - bot) * -1;
        if (!pouring && c.step === 0) d.drops.forEach((m, i) => { const k = (t * 1.5 + i / 4) % 1; m.visible = true; m.position.set(0, 1.2 - k * 0.4, Math.min(S, 0.95)); });
        steamOn(d.w, t, c.step >= 1, 0.5, 0.08);
        return;
      }
      // 홈통: 솟는 곳에서 그릇 위까지 기울어져 내려온다
      const a = [0, 1.3, S];
      const b = [0, HAND[1] + 0.14, HAND[2] + 0.12];
      const len = Math.hypot(a[1] - b[1], a[2] - b[2]);
      d.flume.position.set(0, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      d.flume.rotation.x = Math.atan2(a[1] - b[1], a[2] - b[2]);
      d.flume.children[0].scale.y = len;
      d.flume.children[1].scale.z = len;
      // 먹기 앞부분 동안 소면 다발이 차례로 미끄러져 내려와 그릇에 들어간다
      d.noodles.forEach((n, i) => {
        const k = (u * 4 - i * 0.35) % 1.4;
        n.visible = u < 0.6 && k >= 0 && k < 1;
        n.position.set(0, 0, len / 2 - k * len);
      });
      steamOn(d.w, t, false);
    },
  });

  // 된장국 강: 국자로 떠서 → 캐릭터 컵에 붓고 → 김이 오른다
  rel('miso', {
    make(g) {
      const ladle = G(g);
      part(ladle, cyl(0.016, 0.016, 0.7, 8), '#a97c50', 0, 0.35, -0.12, -0.35, 0, 0);
      const cup = part(ladle, lathe([[0, 0], [0.1, 0.01], [0.13, 0.08], [0.12, 0.08], [0.08, 0.02], [0, 0.015]]), '#a97c50');
      cup.material.side = THREE.DoubleSide;
      const soup = part(ladle, cyl(0.11, 0.11, 0.01, 14), '#c99a5b', 0, 0.065, 0, 0, 0, 0, false);
      const tofu = part(ladle, box(0.04, 0.03, 0.04), '#f6efdf', 0.03, 0.08, 0.02, 0, 0.5, 0, false);
      const wakame = part(ladle, sph(0.04, 6, 4), '#5d8a55', -0.04, 0.075, -0.02, 0, 0, 0, false);
      wakame.scale.set(1.3, 0.2, 0.8);
      const stream = part(g, cyl(0.016, 0.012, 0.22, 8), '#c99a5b', 0, 0, 0, 0, 0, 0, false);
      const ripples = [];
      for (let i = 0; i < 2; i++) ripples.push(part(g, torus(0.1, 0.008, 4, 18), '#e2c38c', 0, 0.06, 0, FLAT, 0, 0, false));
      return { ladle, soup: [soup, tofu, wakame], stream, ripples, w: wisps(g, 3, 0, HAND[1] + 0.05, HAND[2]) };
    },
    run(d, t, u, c) {
      const S = SRC(c.D);
      d.stream.visible = false;
      d.ripples.forEach(m => { m.visible = false; });
      if (c.step === 0) {
        const river = [0, 0.12, S];
        const over = [0, HAND[1] + 0.28, HAND[2] + 0.08];
        if (u < 0.4) {
          // 강에 국자를 담갔다가
          arc(d.ladle, [0.2, 0.7, S * 0.6], river, clamp(u / 0.3), 0.1);
          d.ladle.rotation.x = 0;
          d.soup.forEach(m => { m.visible = u > 0.3; });
          d.ripples.forEach((m, i) => { const k = (t * 1.2 + i * 0.5) % 1; m.visible = u > 0.2; m.position.set(0, 0.06, S); m.scale.setScalar(0.6 + k * 1.6); m.material.opacity = 1 - k; });
        } else if (u < 0.7) {
          arc(d.ladle, river, over, (u - 0.4) / 0.3, 0.25);
          d.ladle.rotation.x = 0;
        } else {
          // 컵 위에서 기울여 붓는다
          d.ladle.position.set(over[0], over[1], over[2]);
          d.ladle.rotation.x = -ease(clamp((u - 0.7) / 0.15)) * 1.1;
          d.soup.forEach(m => { m.visible = u < 0.9; });
          d.stream.visible = u > 0.78 && u < 0.95;
          d.stream.position.set(0, HAND[1] + 0.16, HAND[2] + 0.04);
        }
        steamOn(d.w, t, u > 0.8, 0.4, 0.08);
      } else {
        d.ladle.visible = false;
        steamOn(d.w, t, c.step === 1 || u < 0.6, 0.5, 0.09);
        return;
      }
      d.ladle.visible = true;
    },
  });

  // 어육소시지 숲: 땅에서 소시지가 쏙 솟고 → 캐릭터가 잡아당기면 늘어나다 똑 → 흙이 튀고 → 새싹이 다시 자란다
  rel('sausage', {
    make(g) {
      const stalk = G(g);
      const body = part(stalk, new THREE.CapsuleGeometry(0.075, 0.4, 6, 12), '#efb2a4', 0, 0.28, 0);
      const band = part(stalk, cyl(0.079, 0.079, 0.12, 14), '#e8675b', 0, 0.2, 0, 0, 0, 0, false);
      const clipT = part(stalk, cyl(0.03, 0.045, 0.06, 8), '#dfd07a', 0, 0.56, 0);
      part(stalk, box(0.1, 0.02, 0.012), '#fffaf0', 0, 0.3, 0.078, 0, 0, 0, false);
      const soil = part(g, cyl(0.2, 0.26, 0.06, 14), '#8c6a46', 0, 0.03, 0);
      const sprout = G(g);
      for (const s of [-1, 1]) { const l = part(sprout, leafGeo, '#8fc586', s * 0.06, 0.08, 0, 0, 0, s * 0.6, false); l.scale.set(0.8, 0.2, 0.5); }
      part(sprout, cyl(0.008, 0.01, 0.08, 5), '#6fa060', 0, 0.04, 0, 0, 0, 0, false);
      const dirt = [];
      for (let i = 0; i < 7; i++) dirt.push(part(g, sph(0.03, 5, 4), '#8c6a46', 0, 0, 0, 0, 0, 0, false));
      return { stalk, body, band, clipT, soil, sprout, dirt };
    },
    run(d, t, u, c) {
      const z = Math.max(0.62, Math.min(SRC(c.D), 0.9));
      d.soil.position.set(0, 0.03, z);
      d.sprout.position.set(0, 0.06, z);
      d.dirt.forEach(m => { m.visible = false; });
      if (c.step === 0) {
        d.stalk.visible = u < 0.82;
        const up = ease(clamp(u / 0.25));
        // 당기는 동안 몸통이 늘어나며 흔들린다
        const pull = clamp((u - 0.3) / 0.5);
        d.stalk.position.set(0, -0.3 + up * 0.3, z - pull * 0.1);
        d.stalk.scale.set(1 - pull * 0.15, 1 + pull * 0.35 + Math.sin(t * 25) * 0.03 * pull, 1 - pull * 0.15);
        d.stalk.rotation.x = -pull * 0.45;
        d.sprout.visible = false;
        if (u >= 0.82) d.dirt.forEach((m, i) => { const k = clamp((u - 0.82) / 0.18), a = i * 0.9; m.visible = true; m.position.set(Math.cos(a) * 0.3 * k, 0.1 + Math.sin(k * Math.PI) * 0.3, z + Math.sin(a) * 0.3 * k); });
      } else {
        // 다 뽑힌 자리에서 새싹이 나고, 다음 소시지 끝이 조금씩 솟는다
        d.stalk.visible = true;
        d.stalk.rotation.x = 0;
        const g2 = ease(clamp(u));
        d.stalk.scale.set(0.7, 0.4 + g2 * 0.3, 0.7);
        d.stalk.position.set(0, -0.32 + g2 * 0.12, z);
        d.sprout.visible = true;
        d.sprout.scale.setScalar(0.5 + g2 * 0.7);
      }
    },
  });

  // 소프트크림 서버: 레버를 당기면 별 모양 꼭지에서 크림이 나선으로 콘 위에 쌓인다
  rel('cream', {
    make(g) {
      const nozzle = G(g);
      part(nozzle, cyl(0.07, 0.05, 0.12, 8), '#d3d6da', 0, 0, 0);
      for (let i = 0; i < 8; i++) part(nozzle, box(0.014, 0.1, 0.02), '#b4b8bd', Math.cos(i * 0.785) * 0.055, -0.02, Math.sin(i * 0.785) * 0.055, 0, -i * 0.785, 0, false);
      const swirl = G(g);
      const rings = [];
      for (let i = 0; i < 7; i++) {
        const r = 0.085 - i * 0.011;
        const m = part(swirl, torus(Math.max(0.012, r), 0.03 - i * 0.002, 7, 18), '#fffaf0', 0, i * 0.035, 0, FLAT, 0, i * 0.7, false);
        rings.push(m);
      }
      const tip = part(swirl, new THREE.ConeGeometry(0.03, 0.08, 10), '#fffaf0', 0, 0.26, 0, 0, 0, 0.3, false);
      rings.push(tip);
      const ribbon = part(g, cyl(0.022, 0.022, 1, 8), '#fffaf0', 0, 0, 0, 0, 0, 0, false);
      return { nozzle, swirl, rings, ribbon };
    },
    run(d, t, u, c) {
      const top = 1.32;
      d.nozzle.position.set(0, top, HAND[2] + 0.02);
      d.swirl.position.set(HAND[0], HAND[1] + 0.12, HAND[2]);
      if (c.step === 0) {
        // 레버를 당기는 동안 한 층씩 빙글빙글 쌓인다
        const k = clamp((u - 0.25) / 0.6);
        const n = Math.floor(k * d.rings.length + 0.001);
        d.rings.forEach((m, i) => { m.visible = i < n; });
        d.swirl.rotation.y = k * 9;
        const flowing = k > 0 && k < 1;
        d.ribbon.visible = flowing;
        const y0 = HAND[1] + 0.12 + n * 0.035;
        d.ribbon.scale.y = Math.max(0.01, top - 0.06 - y0);
        d.ribbon.position.set(0, (top - 0.06 + y0) / 2, HAND[2] + 0.01);
        d.nozzle.visible = true;
      } else {
        // 콘을 받아 들고 핥는 동안: 크림은 손에 든 콘 위에서 조금씩 줄어든다
        d.nozzle.visible = false;
        d.ribbon.visible = false;
        d.swirl.visible = false;
      }
    },
  });

  // 라무네 샘: 거품이 퐁퐁 솟아 컵에 차오르고, 마시는 동안 컵에서 기포가 오른다
  // 케첩밥: 산처럼 솟은 케첩밥을 숟가락으로 떠서 그릇에
  rel('ramune', {
    make(g) {
      const fizz = [];
      for (let i = 0; i < 14; i++) { const m = part(g, sph(0.035, 8, 6), '#dff6ff', 0, 0, 0, 0, 0, 0, false); m.material.transparent = true; fizz.push(m); }
      const jet = part(g, cyl(0.03, 0.05, 1, 10), new THREE.MeshToonMaterial({ color: '#bfe9f8', transparent: true, opacity: 0.75 }), 0, 0, 0, 0, 0, 0, false);
      const marble = part(g, sph(0.05, 12, 8), '#e8fbff', 0, 0, 0);
      const ketchup = G(g);
      const rice = riceMound(ketchup, 0.3, '#f0a57f', '#f3b791');
      const sauce = part(ketchup, new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#d8483f', 0, 0.2, 0, 0, 0, 0, false);
      sauce.scale.y = 0.4;
      const spoon = G(g);
      part(spoon, cyl(0.012, 0.012, 0.3, 6), '#d3d6da', 0, 0.15, 0);
      const bowlS = part(spoon, sph(0.05, 10, 6), '#d3d6da', 0, -0.01, 0);
      bowlS.scale.set(1, 0.35, 1.3);
      const scoop = part(spoon, sph(0.04, 8, 6), '#f0a57f', 0, 0.02, 0, 0, 0, 0, false);
      return { fizz, jet, marble, ketchup, rice, spoon, scoop };
    },
    run(d, t, u, c) {
      const S = SRC(c.D);
      const kRice = c.clip === 'eat_bowl';
      d.ketchup.visible = kRice;
      d.spoon.visible = false;
      d.jet.visible = false;
      d.marble.visible = false;
      d.fizz.forEach(m => { m.visible = false; });
      if (kRice) {
        d.ketchup.position.set(0, 0.5, S);
        const k = (u * 4) % 1;
        // 앞부분은 숟가락으로 떠서 그릇으로 옮기고, 남은 동안은 덜어 낸 자리가 다시 솟는다
        if (u < 0.5) {
          d.spoon.visible = true;
          if (k < 0.4) arc(d.spoon, [0.15, 0.95, (S + HAND[2]) / 2], [0, 0.8, S], k / 0.4, 0.05);
          else arc(d.spoon, [0, 0.8, S], [HAND[0], HAND[1] + 0.1, HAND[2]], (k - 0.4) / 0.6, 0.2);
          d.scoop.visible = k > 0.4 && k < 0.95;
        }
        d.ketchup.scale.setScalar(u < 0.5 ? 1 - u * 0.2 : 0.9 + (u - 0.5) * 0.2);
        return;
      }
      const cup = [HAND[0], HAND[1] + 0.06, HAND[2]];
      if (u < 0.3) {
        // 샘에서 솟은 물줄기가 컵으로 휘어 들어간다
        d.jet.visible = true;
        const a = [0, 0.3, S];
        const len = Math.hypot(cup[1] - a[1], cup[2] - a[2]);
        d.jet.scale.y = len;
        d.jet.position.set(0, (a[1] + cup[1]) / 2 + 0.15, (a[2] + cup[2]) / 2);
        d.jet.rotation.x = -Math.atan2(a[2] - cup[2], cup[1] - a[1]);
        d.fizz.forEach((m, i) => { const k = (t * 1.3 + i / 14) % 1; m.visible = true; arc(m, [0, 0.3, S], cup, k, 0.35); m.scale.setScalar(0.6 + Math.sin(i) * 0.3); });
        // 구슬이 '퐁' 하고 빠진다
        d.marble.visible = u > 0.2;
        arc(d.marble, [cup[0], cup[1] + 0.3, cup[2]], cup, clamp((u - 0.2) / 0.1), 0.05);
      } else {
        // 마시는 동안 컵에서 기포가 퐁퐁
        d.fizz.forEach((m, i) => { const k = (t * 0.9 + i / 14) % 1; m.visible = i < 8; m.position.set(Math.cos(i * 2.4) * 0.05, cup[1] + 0.05 + k * 0.35, cup[2] + Math.sin(i * 2.4) * 0.05); m.scale.setScalar(0.5 * (1 - k) + 0.2); });
      }
    },
  });

  // 소바가 솟는 곳: 대나무 홈통으로 소바가 흘러와 그릇에 담기고, 간장 국물을 졸졸
  rel('sobaspring', {
    make(g) {
      const d = FX.s_somen.make(g);
      d.flume.children.slice(2).forEach(n => n.children.forEach(m => m.material.color.set('#b89d76')));
      return d;
    },
    run(d, t, u, c) { FX.s_somen.run(d, t, u, { ...c, clip: 'eat_bowl' }); },
  });

  // 아카후쿠: 위에서 하나씩 떨어진다 → 캐릭터가 꼬치로 받는다 → 먹는다
  rel('akafuku', {
    make(g) {
      const list = [];
      for (let i = 0; i < 3; i++) {
        const m = G(g);
        const mochi = part(m, sph(0.11, 12, 8), '#fffaf0', 0, 0, 0);
        mochi.scale.set(1.2, 0.55, 1);
        // 팥 앙금: 세 줄 물결
        const an = part(m, new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#7a3f46', 0, 0.02, 0, 0, 0, 0, false);
        an.scale.set(1.24, 0.5, 1.04);
        for (let j = 0; j < 3; j++) part(m, new THREE.TorusGeometry(0.03, 0.012, 4, 10, Math.PI), '#9a5560', -0.06 + j * 0.06, 0.07, 0, 0, FLAT, 0, false);
        list.push(m);
      }
      return { list };
    },
    run(d, t, u) {
      // 세 번에 걸쳐 떨어진다: 떨어지는 동안 빙글, 손에 닿으면 사라진다(꼬치에 꽂힘)
      d.list.forEach((m, i) => {
        const k = (u * 3 - i);
        m.visible = k > 0 && k < 0.45;
        const f = clamp(k / 0.45);
        m.position.set(HAND[0] + Math.sin(i * 2) * 0.05, 3.2 - (3.2 - HAND[1] - 0.15) * f * f, HAND[2]);
        m.rotation.set(f * 4, i, f * 2);
      });
    },
  });

  // 거대 카스텔라: 발밑 카스텔라를 한 덩이 뜯어 들어 올린다 (노란 속살 + 갈색 겉면)
  rel('castella', {
    make(g) {
      const piece = G(g);
      part(piece, box(0.16, 0.1, 0.12), '#f6d986', 0, 0, 0);
      part(piece, box(0.165, 0.025, 0.125), '#9a6a3a', 0, 0.06, 0);
      part(piece, box(0.165, 0.015, 0.125), '#c0966a', 0, -0.055, 0, 0, 0, 0, false);
      const crumbs = [];
      for (let i = 0; i < 6; i++) crumbs.push(part(g, sph(0.018, 5, 4), '#f6d986', 0, 0, 0, 0, 0, 0, false));
      return { piece, crumbs };
    },
    run(d, t, u, c) {
      const show = c.clip === 'eat_bite';
      d.piece.visible = show && u < 0.25;
      if (show) arc(d.piece, [0, 0.05, 0.4], HAND, clamp(u / 0.25), 0.15);
      d.crumbs.forEach((m, i) => { const k = (u * 4 + i / 6) % 1; m.visible = show && u > 0.25; m.position.set(Math.cos(i * 2.4) * 0.1, HAND[1] + 0.05 - k * HAND[1], HAND[2] + Math.sin(i * 2.4) * 0.08); });
    },
  });

  // 세트 규격(docs/set-anim-spec-2026-11-10.md): 장소에 이미 있는 물건을 또 만들지 않는다
  // 모닥불: 장소의 모닥불 모형(bonfire) 위에 불꽃만 피운다
  add('fire', { top: false, make(g) { const f = root.FireFx ? root.FireFx.makeFire(G(g), 0.45, 'wood') : null; if (f) for (const m of f.g.children.slice(0, 4)) m.visible = false; return { f }; }, run(d, t) { if (d.f) d.f.run(t, true); } });
  // 광장 스피커는 광장에 있다: 음표만 띄우는 동작 효과로 / 접수처 도장은 갑옷씨가 찍는다
  FX.s_speaker = FX.dance;
  FX.s_stamp = { make() { return {}; }, run() {} };

  /* ---------- 어느 상호작용에 어떤 장면 ---------- */
  const TABLE = [
    ['ramenYama', /라멘 먹기/, 'bigbowl'], ['umaCurry', /카레/, 'curry'], ['umaiya', /정식/, 'tray'], ['umaiya', /주방/, 'wok'],
    ['kissa', /차 마시기|늘 마시던/, 'parfait'], ['kissa', /설거지/, 'dishes'], ['soba', /소바/, 'soba'],
    ['market', /타코야키 먹기|매대 꼬치|매대 간식/, 'takoboat'], ['market', /타코야키 굽기/, 'grill'], ['market', /그릇/, 'pottery'], ['market', /포셰트/, 'goods'], ['market', /헌책|책 냄새/, 'books'],
    ['mucha', /장 봐|도시락|주먹밥|진열/, 'basket'], ['mucha', /전단지/, 'flyer'], ['machioka', /과자/, 'basket'], ['machioka', /인형/, 'frog'], ['machioka', /뽑기/, 'gumball'],
    ['reception', /접수/, 'stamp'], ['reception', /정산/, 'coins'], ['reception', /종/, 'deskbell'], ['lemon', /크레인/, 'crane'], ['lemon', /상자/, 'crate'], ['pier', /짐/, 'crate'],
    ['exam|arbiter', /공부|시험|문제/, 'paper'], ['exam|arbiter|plaza', /발표|안내|공고|게시판/, 'notice'], ['pharmacy', /약/, 'drawer'], ['recycle', /지팡이|구경/, 'cane'], ['internet', /인터넷/, 'pc'], ['arcade', /구경|엿보기/, 'slot'],
    ['cave|home|momongaHome|shisaHome|rakkoHome|kurimanjuHome|furuhonyaHome', /공부/, 'paper'], ['home', /밥 해/, 'homepot'], ['home', /일기/, 'diary'], ['home', /열쇠/, 'key'], ['kurimanjuHome', /한잔|안주/, 'sake'],
    ['hiroma|goblin', /모닥불/, 'fire'], ['hiroma', /한잔/, 'sake'], ['onsen', /담그기/, 'bath'], ['onsen', /거품/, 'foam'], ['sauna', /사우나/, 'sauna'], ['shrine', /참배/, 'shrine'], ['shrine', /부적/, 'omamori'], ['shrine', /쓸기/, 'broom'],
    ['plaza', /음악|스피커/, 'speaker'], ['stage', /공연/, 'lights'], ['pond', /낚시/, 'fishing'], ['pond', /돌멩이/, 'splash'], ['antlion', /모래/, 'sand'], ['hunt', /훈련|돌격/, 'dummy'], ['wilds', /채집/, 'berry'],
    ['rice', /밥/, 'rice'], ['servers', /소면|다시/, 'somen'], ['misoBank', /된장/, 'miso'], ['sausage', /소시지|배 터지게/, 'sausage'], ['softcream', /소프트/, 'cream'], ['ramune', /라무네|케첩/, 'ramune'], ['sobaSpring', /소바/, 'sobaspring'], ['akafuku', /아카후쿠/, 'akafuku'], ['castella', /구경|뛰기/, 'castella'],
  ].map(([p, re, key]) => [new RegExp(`^(${p})$`), re, `s_${key}`]);
  const EL = [[/^el_lamp/, 's_lampglow'], [/^el_tree_\d+\.shake/, 's_leaves'], [/^el_planter/, 's_petals'], [/^el_hedge/, 's_hedge'], [/^el_board/, 's_flyer']];
  const cache = new Map();
  let nav = null, world = null;
  const ray = new THREE.Raycaster();
  const tops = new Map();
  root.SceneActs = {
    install(n, w) { nav = n; world = w; },
    key(x, st) {
      if (st && st.sceneKey) return st.sceneKey;
      if (x.sceneKey) return x.sceneKey;
      if (cache.has(x.id)) return cache.get(x.id);
      let k = null;
      const el = EL.find(([re]) => re.test(x.id));
      if (el) k = el[1];
      else { const r = TABLE.find(([p, re]) => p.test(x.place) && re.test(x.name)); if (r) k = r[2]; }
      cache.set(x.id, k);
      return k;
    },
    floorAt(x, z) { return world.floorAt(x, z); },
    // 대상 지점의 받침 윗면 (탁자·카운터 위에 물건을 놓는다)
    topAt(x, z) {
      const key = `${Math.round(x * 2)},${Math.round(z * 2)}`;
      if (tops.has(key)) return tops.get(key);
      const floor = world.floorAt(x, z);
      ray.set(new THREE.Vector3(x, floor + 2.4, z), new THREE.Vector3(0, -1, 0));
      ray.far = 2.5;
      const near = nav.raycastable.filter(o => {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        return new THREE.Vector3().copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld).distanceTo(new THREE.Vector3(x, floor, z)) < 8 + o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
      });
      const hit = ray.intersectObjects(near, false)[0];
      const y = hit ? hit.point.y + 0.01 : floor;
      tops.set(key, y);
      return y;
    },
  };
}(typeof self !== 'undefined' ? self : this));
