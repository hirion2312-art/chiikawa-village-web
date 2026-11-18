'use strict';

// 치이카와 심즈 — 솟는 곳 다듬기 (2026-11-16 이재헌님 승인, docs/audit-2026-11-12.md)
// 원작(세계관 조사 자료): 솟는 곳은 장소가 늘 있고, 음식이 솟거나 가끔 마른다. game.js가 이제 솟는 곳을 숨기지 않는다
//  - 어육소시지 숲(ギョニソ林): 이름대로 숲. 나무 가지마다 주황 필름에 금속 집게를 문 어육소시지가 주렁주렁 열린다
//  - 무한백미: 밥솥이 땅에 묻혀 있다 → 밥솥 모형을 뚜껑 아래까지 땅에 묻고 둘레에 흙둔덕
//  - 아카후쿠: 하늘에서 떨어진다 → 솟는 동안 하늘에서 하나씩 떨어져 통 튀고 잠깐 놓였다가 사라진다
(function (root) {
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const INK = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
  const inked = (geo, c, w = 0.04) => { const m = new THREE.Mesh(geo, toon(c)); const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1 + w); m.add(o); return m; };

  /* ---------- 어육소시지 나무 ---------- */
  function sausage() {
    const g = new THREE.Group();
    const body = inked(new THREE.CapsuleGeometry(0.1, 0.62, 6, 12), '#e4573d', 0.08); g.add(body);
    const sheen = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.5, 4, 6), new THREE.MeshBasicMaterial({ color: '#ffb59a' })); sheen.position.set(0.05, 0, 0.07); g.add(sheen);
    for (const s of [-1, 1]) { const clip = inked(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 10), '#d9c56a', 0.1); clip.position.y = s * 0.43; g.add(clip); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), toon('#7d5a44')); tail.position.y = 0.6; g.add(tail);
    return g;
  }
  function sausageTree(x, z, s, seed) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const trunk = inked(new THREE.CylinderGeometry(0.28, 0.42, 3.2, 12), '#b98a5c', 0.05); trunk.position.y = 1.6; g.add(trunk);
    for (const [bx, by, bz, r] of [[0, 3.9, 0, 1.6], [1.0, 3.5, 0.4, 1.1], [-1.0, 3.6, -0.3, 1.15], [0.2, 4.6, -0.4, 1.1]]) { const c = inked(new THREE.SphereGeometry(r, 16, 12), '#a8cf8a', 0.03); c.position.set(bx, by, bz); c.scale.y = 0.82; g.add(c); }
    // 가지 끝마다 소시지가 매달려 흔들린다
    const hangs = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + seed, r = 1.25 + (i % 3) * 0.3;
      const piv = new THREE.Group(); piv.position.set(Math.cos(a) * r, 2.85 - (i % 2) * 0.25, Math.sin(a) * r);
      const sz = sausage(); sz.position.y = -0.62; piv.add(sz); g.add(piv);
      hangs.push(piv);
    }
    g.userData.hangs = hangs;
    return g;
  }

  /* ---------- 아카후쿠 한 알 ---------- */
  function akafuku() {
    const g = new THREE.Group();
    const mochi = inked(new THREE.SphereGeometry(0.72, 16, 12), '#fff4ea', 0.03); mochi.scale.set(1, 0.47, 0.83); g.add(mochi);
    const bean = inked(new THREE.SphereGeometry(0.62, 16, 10), '#6e3a40', 0.03); bean.scale.set(1, 0.32, 0.8); bean.position.y = 0.2; g.add(bean);
    for (const dx of [-0.3, 0, 0.3]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon('#8a4d52')); w.scale.set(1, 0.9, 4.4); w.position.set(dx, 0.34, 0); g.add(w); }
    return g;
  }

  /* ---------- 붙이기 ---------- */
  const live = { trees: [], fall: [], riceDone: false, built: false };
  function build(G) {
    const s = G.sim, w = G.world;
    const sp = s.places.sausage;
    if (sp) for (const [x, z, sc, i] of [[5.6, -4.6, 1, 0], [-5.8, -5.4, 1.1, 1], [6.4, 2.2, 0.95, 2], [-7, 4.2, 1.05, 3]]) {
      const t = sausageTree(sp.x + x, sp.z + z, sc, i);
      t.position.y = w.floorAt(sp.x + x, sp.z + z);
      G.scene.add(t); live.trees.push(t);
    }
    const ak = s.places.akafuku;
    if (ak) for (let i = 0; i < 6; i++) { const a = akafuku(); a.visible = false; G.scene.add(a); live.fall.push({ m: a, t: -i * 0.9, x: 0, z: 0, ak }); }
    live.built = true;
  }
  /* ---------- 무한백미 전기밥솥 ---------- */
  // 원작: 숲속 땅에 밥솥이 묻혀 있고, 뚜껑을 닫았다 열면 갓 지은 흰밥이 다시 솟는다
  // 모양: 둥근 흰 몸통, 경첩 달린 둥근 뚜껑과 김 구멍, 앞쪽 조작판(작은 화면·취사 버튼), 위로 접히는 손잡이,
  //       안쪽 은색 내솥 테두리와 윤기 나는 밥 더미, 밥에 꽂힌 주걱
  function lathe(prof, c, seg = 40, ink = 0.03) {
    return inked(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg), c, ink);
  }
  function riceCooker(G, x, gy, z) {
    const root3 = new THREE.Group(); root3.position.set(x, gy - 1.0, z); G.scene.add(root3);
    const R = 2.2, H = 3.0;
    // 몸통: 아래가 살짝 좁고 어깨가 둥근 통
    const body = lathe([[0, 0], [R * 0.9, 0], [R * 0.97, 0.15], [R, 0.6], [R, H - 0.45], [R * 0.97, H - 0.15], [R * 0.9, H]], '#f8f6ef');
    root3.add(body);
    // 허리의 옅은 띠 두 줄
    for (const y of [H - 0.9, H - 0.75]) { const band = new THREE.Mesh(new THREE.TorusGeometry(R + 0.005, 0.025, 6, 48), toon('#d9d5ca')); band.rotation.x = Math.PI / 2; band.position.y = y; root3.add(band); }
    // 내솥 테두리 (은색)와 밥
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, 0.09, 8, 48), toon('#c9ced2')); rim.rotation.x = Math.PI / 2; rim.position.y = H + 0.02; root3.add(rim);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 0.85, 0.05, 40), toon('#8d949a')); inner.position.y = H - 0.25; root3.add(inner);
    const rice = new THREE.Group(); rice.position.y = H - 0.2; root3.add(rice);
    const mound = inked(new THREE.SphereGeometry(R * 0.82, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), '#fffefa', 0.02); mound.scale.y = 0.42; rice.add(mound);
    // 밥알: 둥근 더미 위에 낱알
    const grainGeo = new THREE.SphereGeometry(0.075, 6, 4), grainMat = toon('#ffffff');
    for (let i = 0; i < 160; i++) {
      const t = (i + 0.5) / 160, phi = Math.acos(1 - t), th = i * 2.39996;
      const gx = Math.sin(phi) * Math.cos(th) * R * 0.8, gz = Math.sin(phi) * Math.sin(th) * R * 0.8, gyy = Math.cos(phi) * R * 0.82 * 0.42;
      const g = new THREE.Mesh(grainGeo, grainMat); g.position.set(gx, gyy + 0.03, gz); g.scale.set(1, 0.6, 1.7); g.rotation.set(Math.random() * 3, th, 0); rice.add(g);
    }
    // 윤기: 밥 더미 위의 하이라이트
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 })); shine.scale.set(1.4, 0.15, 0.6); shine.position.set(-0.5, R * 0.82 * 0.42 - 0.02, -0.3); rice.add(shine);
    // 밥에 꽂힌 주걱
    const paddle = new THREE.Group(); paddle.position.set(0.7, 0.55, 0.3); paddle.rotation.set(0.25, 0.4, -0.35); rice.add(paddle);
    const blade = inked(new THREE.SphereGeometry(0.32, 12, 8), '#f1ead8', 0.08); blade.scale.set(1, 1.3, 0.18); paddle.add(blade);
    const grip = inked(new THREE.CylinderGeometry(0.08, 0.09, 1.0, 8), '#f1ead8', 0.1); grip.position.y = 0.85; paddle.add(grip);
    // 뚜껑: 뒤쪽 경첩을 축으로 열린다. 둥근 돔 + 가운데 김 구멍 + 앞쪽 여는 단추
    const hinge = new THREE.Group(); hinge.position.set(0, H + 0.02, -R * 0.92); root3.add(hinge);
    const lid = new THREE.Group(); lid.position.z = R * 0.92; hinge.add(lid);
    // 단면은 아래에서 위로 그려야 면이 바깥을 향한다
    lid.add(lathe([[R * 0.98, 0], [R * 0.97, 0.18], [R * 0.8, 0.42], [R * 0.45, 0.58], [0, 0.62]], '#fbfaf5'));
    // 뚜껑 안쪽 면: 열렸을 때 보이는 연회색 판과 고무 패킹
    const under = new THREE.Mesh(new THREE.CircleGeometry(R * 1.0, 40), new THREE.MeshToonMaterial({ color: '#e6e9ec', side: THREE.DoubleSide }));
    under.rotation.x = Math.PI / 2; under.position.y = -0.03; lid.add(under);
    const gasket = new THREE.Mesh(new THREE.TorusGeometry(R * 0.84, 0.06, 6, 40), toon('#b9bfc4')); gasket.rotation.x = Math.PI / 2; gasket.position.y = -0.05; lid.add(gasket);
    const vent = inked(new THREE.CylinderGeometry(0.28, 0.32, 0.14, 16), '#c9ced2', 0.08); vent.position.set(0, 0.64, -0.3); lid.add(vent);
    const ventHole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12), toon('#55595d')); ventHole.position.set(0, 0.72, -0.3); lid.add(ventHole);
    const latch = inked(new THREE.BoxGeometry(0.7, 0.28, 0.25), '#d6dadd', 0.08); latch.position.set(0, 0.12, R * 0.98); lid.add(latch);
    // 위로 접힌 손잡이 (뚜껑 양옆 축에 걸림)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, 0.09, 8, 40, Math.PI), toon('#e9e6dd'));
    const hInk = new THREE.Mesh(handle.geometry, INK); hInk.scale.setScalar(1.0); handle.add(hInk);
    handle.rotation.set(-Math.PI / 2 + 0.25, 0, 0); handle.position.set(0, 0.2, 0.1); lid.add(handle);
    // 앞쪽 조작판: 둥근 판에 작은 화면과 취사 버튼 (땅 위로 보이는 높이)
    const panel = new THREE.Group(); panel.position.set(0, H - 0.55, R - 0.04); root3.add(panel);
    const plate = inked(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), '#dfe6ea', 0.06); plate.rotation.x = Math.PI / 2; plate.scale.set(1.6, 1, 0.75); panel.add(plate);
    const lcd = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.04), toon('#9fc2a8')); lcd.position.set(-0.25, 0.08, 0.06); panel.add(lcd);
    const btn = inked(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), '#f08a74', 0.1); btn.rotation.x = Math.PI / 2; btn.position.set(0.45, 0.02, 0.06); panel.add(btn);
    const btn2 = inked(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), '#f3d36b', 0.1); btn2.rotation.x = Math.PI / 2; btn2.position.set(0.1, -0.16, 0.06); panel.add(btn2);
    // 김
    const steam = [];
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); root3.add(m); steam.push(m); }
    return { root: root3, hinge, rice, steam, H };
  }
  // 닫혀 있다가 열리면 밥이 쑥 솟고 김이 확 오른다. 다시 닫힌다 (20초 한 바퀴)
  function tickCooker(ck, t) {
    const c = t % 20;
    let open;
    if (c < 11) open = 0; else if (c < 12) open = (c - 11); else if (c < 18) open = 1; else if (c < 19) open = 1 - (c - 18); else open = 0;
    const e = open * open * (3 - 2 * open);
    ck.hinge.rotation.x = -e * 1.75;
    // 밥이 솟는다: 열리는 순간 아래에서 올라와 살짝 넘쳤다가 자리 잡는다
    const rise = c >= 11 && c < 13 ? Math.min(1, (c - 11) / 1.2) : c >= 13 && c < 19 ? 1 : 0;
    const bounce = c >= 12 && c < 12.6 ? Math.sin((c - 12) / 0.6 * Math.PI) * 0.12 : 0;
    ck.rice.visible = e > 0.05;
    ck.rice.position.y = ck.H - 0.75 + rise * 0.55 + bounce;
    ck.rice.scale.y = 0.8 + rise * 0.2 + bounce;
    // 김: 닫혀 있으면 김 구멍에서 가늘게, 열리면 솥 전체에서 크게
    ck.steam.forEach((m, i) => {
      const u = (t * (open > 0.5 ? 0.45 : 0.3) + i / ck.steam.length) % 1;
      const big = e;
      const sx = (1 - big) * 0 + big * Math.sin(i * 2.1) * 1.0, sz = (1 - big) * 0.0 + big * Math.cos(i * 1.7) * 0.8;
      m.position.set(sx + Math.sin(u * 5 + i) * 0.2, ck.H + 0.8 + u * (2.2 + big * 1.5), sz + (1 - big) * 0.0);
      m.scale.setScalar(0.35 + u * (0.8 + big * 1.2));
      m.material.opacity = (0.35 + big * 0.35) * Math.sin(u * Math.PI);
    });
  }
  // 무한백미: 밥솥을 땅에 묻고 흙둔덕을 두른다 (모형이 다 실린 뒤 한 번)
  function buryRice(G) {
    const h = (root.GLB_HOLDERS && root.GLB_HOLDERS.rice || [])[0];
    const p = G.sim.places.rice;
    if (!h || !p) return false;
    // 모형 안에서 가장 큰 흰 덩어리(밥솥 몸통)를 찾는다
    let pot = null, best = 0;
    const b = new THREE.Box3(), sz = new THREE.Vector3();
    h.traverse(m => { if (!m.isMesh || !m.material || !m.material.color) return; b.setFromObject(m); b.getSize(sz); const c = m.material.color; const white = c.r > 0.8 && c.g > 0.8 && c.b > 0.75; if (white && sz.y > best && sz.x < 8) { best = sz.y; pot = m; } });
    if (!pot) return false;
    b.setFromObject(pot); b.getSize(sz);
    const center = b.getCenter(new THREE.Vector3());
    const ground = G.world.floorAt(center.x, center.z);
    // 2026-11-16 이재헌님: 밥솥 모형이 처참하다 → 불러온 모형은 감추고 전기밥솥을 새로 만든다
    // 담는 그룹의 visible은 거리 최적화가 다시 켜므로, 안의 메시를 하나씩 끈다
    h.traverse(m => { if (m.isMesh) m.visible = false; });
    h.userData.hiddenForCooker = true;
    live.cooker = riceCooker(G, center.x, ground, center.z);
    // 흙둔덕 고리
    const r = 2.9;
    const mound = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 10, 32), toon('#a9845a'));
    mound.rotation.x = Math.PI / 2; mound.scale.z = 0.6; mound.position.set(center.x, ground + r * 0.06, center.z); G.scene.add(mound);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const clod = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), toon(i % 2 ? '#9a7550' : '#b8935f')); clod.position.set(center.x + Math.cos(a) * r * 1.15, ground + r * 0.05, center.z + Math.sin(a) * r * 1.15); clod.scale.y = 0.5; G.scene.add(clod); }
    return true;
  }

  /* ---------- 남은 솟는 곳 다섯 곳 (2026-11-16 시안) ---------- */
  // 원작: 솟는 곳은 음식이 식물처럼 자라거나, 샘처럼 솟거나, 하늘에서 떨어진다
  //  - 라무네: 샘 바닥에서 거품이 끊임없이 올라오고, 작은 라무네병이 둥둥 떠서 흔들린다
  //  - 된장국 강: 바지락·두부·미역이 떠내려오고 김이 오른다
  //  - 소바: 대나무 홈통에서 면발이 줄줄 흘러내리고, 우물 위에 면 가닥이 보이게 쌓인다
  //  - 서버가 자라는 나무: 가지에 육수 서버가 열매처럼 매달린다
  //  - 소프트크림 서버: 나무에 크고 소용돌이진 소프트크림이 열린다
  const more = { built: false, bubbles: [], bottles: [], drift: [], steam: [], strands: [], pour: [], hang: [] };
  const wavyTube = (pts, r, c) => inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 6, false), c, 0.35);
  function dashiServer() {
    const g = new THREE.Group();
    const body = inked(new THREE.CylinderGeometry(0.42, 0.48, 1.0, 16), '#f3efe4', 0.05); body.position.y = -0.75; g.add(body);
    const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.47, 0.55, 16, 1, true, -0.6, 1.2), toon('#d79a4a')); soup.position.y = -0.95; g.add(soup);
    const lid = inked(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 16), '#8a6a4a', 0.06); lid.position.y = -0.2; g.add(lid);
    const knob = inked(new THREE.SphereGeometry(0.1, 8, 6), '#8a6a4a', 0.1); knob.position.y = -0.1; g.add(knob);
    const tap = inked(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), '#b9b4aa', 0.12); tap.rotation.z = Math.PI / 2; tap.position.set(0.55, -1.05, 0); g.add(tap);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), toon('#7d5a44')); stem.position.y = 0.15; g.add(stem);
    return g;
  }
  function creamFruit() {
    const g = new THREE.Group();
    // 거꾸로 매달린 소프트크림: 위가 과자 콘(꼭지가 가지에 붙음), 아래로 크림 소용돌이
    const cone = inked(new THREE.ConeGeometry(0.42, 1.0, 14), '#e2b06a', 0.06); cone.position.y = -0.5; g.add(cone);
    for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 4, 16), toon('#b9864a')); ring.rotation.x = Math.PI / 2; ring.position.y = -0.25 - i * 0.18; ring.scale.setScalar(0.35 + i * 0.2); g.add(ring); }
    [[0.5, 0.38], [0.36, 0.3], [0.22, 0.22], [0.1, 0.16]].forEach(([r, h], i) => {
      const t = inked(new THREE.SphereGeometry(r, 14, 10), '#fffaf0', 0.06); t.scale.y = 0.7; t.position.y = -1.1 - i * h; g.add(t);
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), toon('#7d5a44')); stem.position.y = 0.15; g.add(stem);
    return g;
  }
  function buildMore(G) {
    const S = G.sim.places, W = G.world, add = (m, x, y, z) => { m.position.set(x, y, z); G.scene.add(m); return m; };
    const ra = S.ramune;
    if (ra) {
      const gy = W.floorAt(ra.x - 7, ra.z) + 0.86;
      for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12 + (i % 3) * 0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#f4feff', transparent: true, opacity: 0.85 })); more.bubbles.push({ m: add(b, 0, 0, 0), x: ra.x - 7, z: ra.z, gy, ph: i / 14, a: i * 2.4, r: 0.8 + (i % 4) * 0.6 }); }
      for (let i = 0; i < 3; i++) {
        const bt = new THREE.Group();
        const body = inked(new THREE.CylinderGeometry(0.22, 0.24, 0.7, 12), '#9ed8ec', 0.06); bt.add(body);
        const neck = inked(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 12), '#bfe6f3', 0.08); neck.position.y = 0.5; bt.add(neck);
        const mb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon('#f4feff')); mb.position.y = 0.45; bt.add(mb);
        const a = i * 2.1 + 0.5;
        more.bottles.push({ m: add(bt, ra.x - 7 + Math.cos(a) * 2.3, gy, ra.z + Math.sin(a) * 2.3), gy, i });
      }
    }
    const mi = S.misoBank;
    if (mi) {
      const bend = x => Math.sin(x * 0.2) * 0.9;
      const kinds = ['clam', 'tofu', 'wakame', 'clam', 'clam', 'tofu', 'wakame', 'clam'];
      kinds.forEach((k, i) => {
        let m;
        if (k === 'clam') { m = new THREE.Group(); for (const sd of [-1, 1]) { const sh = inked(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#cfc3b0', 0.08); sh.scale.set(1, 0.55, 0.8); sh.rotation.z = sd * 0.5; sh.position.x = sd * 0.12; m.add(sh); } }
        else if (k === 'tofu') m = inked(new THREE.BoxGeometry(0.5, 0.3, 0.5), '#fbf6ea', 0.06);
        else { m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6), toon('#4f7f4a')); m.scale.set(1, 0.12, 0.5); }
        more.drift.push({ m: add(m, 0, 0, 0), u: i / kinds.length, off: (i % 3 - 1) * 0.9, p: mi, bend, W });
      });
      for (let i = 0; i < 12; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false })); more.steam.push({ m: add(st, 0, 0, 0), x: mi.x - 11 + i * 2, z: mi.z + bend(-11 + i * 2), gy: W.floorAt(mi.x - 11 + i * 2, mi.z), ph: (i * 0.37) % 1 }); }
    }
    const so = S.sobaSpring;
    if (so) {
      const gy = W.floorAt(so.x, so.z);
      // 우물 위 면 더미: 굽이진 면 가닥
      for (let i = 0; i < 22; i++) {
        const a = i * 2.399, r = 0.2 + (i % 6) * 0.36, y = gy + 1.02 + 0.85 * Math.sqrt(Math.max(0, 1 - ((r + 0.25) / 2.4) ** 2)) + 0.04 + (i % 3) * 0.05;
        const pts = []; for (let j = 0; j < 6; j++) { const t = a + j * 0.45; pts.push([so.x + Math.cos(t) * (r + Math.sin(j * 1.7) * 0.25), y + Math.sin(j * 2.1) * 0.05, so.z + Math.sin(t) * (r + Math.sin(j * 1.7) * 0.25)]); }
        more.strands.push(add(wavyTube(pts, 0.06, i % 2 ? '#d7c19a' : '#c8ad83'), 0, 0, 0));
      }
      // 홈통 끝에서 흘러내리는 면발 (아래로 흐르는 물결)
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group(); g.position.set(so.x + 0.55 + (i % 2) * 0.12, gy + 3.1, so.z - 0.15 + i * 0.1);
        const pts = []; for (let j = 0; j <= 8; j++) pts.push([Math.sin(j * 1.3 + i) * 0.06, -j * 0.19, Math.cos(j * 1.1 + i) * 0.05]);
        g.add(wavyTube(pts, 0.05, '#d7c19a'));
        more.pour.push({ g, i }); G.scene.add(g);
      }
    }
    const sv = S.servers;
    if (sv) for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3, r = 2.3 + (i % 2) * 0.7;
      const piv = new THREE.Group(); const ds = dashiServer(); ds.scale.setScalar(1.35); ds.rotation.y = -a; piv.add(ds);
      more.hang.push({ m: add(piv, sv.x + Math.cos(a) * r, 6.25 + (i % 2) * 0.3, sv.z - 2 + Math.sin(a) * r * 0.8), i });
    }
    const sc = S.softcream;
    if (sc) for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, r = 2.2 + (i % 3) * 0.6;
      const piv = new THREE.Group(); piv.add(creamFruit());
      more.hang.push({ m: add(piv, sc.x + Math.cos(a) * r, 5.75 + (i % 2) * 0.35, sc.z - 0.2 + Math.sin(a) * r * 0.7), i: i + 6 });
    }
    more.built = true;
  }
  let jaws = null;
  function tickMore(t) {
    // 개미지옥 바닥의 큰 턱: 가끔 쑥 올라와 딱딱 다문다
    if (!jaws && root.game && root.game.scene) jaws = root.game.scene.getObjectByName('antlionJaws') || false;
    if (jaws) { const c = t % 6, up = c < 2.2 ? Math.sin(Math.min(1, c / 0.4) * Math.PI / 2) * (c > 1.8 ? (2.2 - c) / 0.4 : 1) : 0; jaws.position.y = -1.3 + up * 1.35; for (const j of jaws.children) j.rotation.z = j.userData.side * (0.15 + Math.abs(Math.sin(t * 7)) * 0.35 * up); }
    for (const b of more.bubbles) { const u = (t * 0.45 + b.ph) % 1; b.m.position.set(b.x + Math.cos(b.a + t * 0.3) * b.r * (1 - u * 0.5), b.gy + u * 2.6, b.z + Math.sin(b.a + t * 0.3) * b.r * (1 - u * 0.5)); b.m.material.opacity = 0.85 * (1 - u); }
    for (const b of more.bottles) { b.m.position.y = b.gy + 0.1 + Math.sin(t * 1.6 + b.i * 2) * 0.08; b.m.rotation.z = Math.sin(t * 1.2 + b.i) * 0.25; b.m.rotation.x = Math.cos(t * 1.1 + b.i) * 0.2; }
    for (const d of more.drift) {
      const u = (t * 0.025 + d.u) % 1, x = -13 + u * 26;
      const wx = d.p.x + x, wz = d.p.z + d.bend(x) + d.off;
      d.m.position.set(wx, d.W.floorAt(wx, wz) + 0.16 + Math.sin(t * 2 + d.u * 9) * 0.03, wz);
      d.m.rotation.y = t * 0.4 + d.u * 6;
      d.m.visible = u > 0.03 && u < 0.97;
    }
    for (const s of more.steam) { const u = (t * 0.25 + s.ph) % 1; s.m.position.set(s.x + Math.sin(u * 4) * 0.3, s.gy + 0.4 + u * 2.2, s.z); s.m.scale.setScalar(0.5 + u * 1.2); s.m.material.opacity = 0.55 * Math.sin(u * Math.PI); }
    for (const p of more.pour) { p.g.children[0].position.y = -((t * 0.9 + p.i * 0.23) % 0.38); p.g.children[0].rotation.y = Math.sin(t * 2 + p.i) * 0.2; }
    for (const h of more.hang) { h.m.rotation.z = Math.sin(t * 1.1 + h.i) * 0.07; h.m.rotation.x = Math.cos(t * 0.9 + h.i * 2) * 0.05; }
  }

  function tick() {
    const G = root.game;
    if (G && G.sim && G.scene && G.world && G.readyDone) {
      if (!live.built) build(G);
      if (!live.riceDone) live.riceDone = buryRice(G);
      if (!more.built) buildMore(G);
      const t = performance.now() / 1000;
      tickMore(t);
      if (live.cooker) tickCooker(live.cooker, t);
      for (const tr of live.trees) tr.userData.hangs.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.3 + i) * 0.08; p.rotation.x = Math.cos(t * 1.1 + i * 2) * 0.05; });
      // 아카후쿠: 솟는 동안만 하늘에서 하나씩 떨어진다
      const s = G.sim, sp = s.ecology && s.ecology.springs && s.ecology.springs.akafuku;
      const on = !!sp && sp.until > s.minutes;
      for (const f of live.fall) {
        if (!on && f.t <= 0) { f.m.visible = false; continue; }
        f.t += 1 / 60;
        if (f.t < 0) continue;
        if (f.t === 1 / 60 || f.x === 0) { const a = Math.random() * Math.PI * 2, r = Math.random() * 4.5; f.x = f.ak.x + Math.cos(a) * r; f.z = f.ak.z + Math.sin(a) * r; f.m.rotation.y = Math.random() * 6; }
        const gy = G.world.floorAt(f.x, f.z);
        const fallT = 1.6, sitT = 3.5;
        let y;
        if (f.t < fallT) y = gy + 0.26 + 14 * (1 - (f.t / fallT) ** 2);
        else if (f.t < fallT + 0.4) { const u = (f.t - fallT) / 0.4; y = gy + 0.26 + Math.sin(u * Math.PI) * 0.6; }
        else y = gy + 0.26;
        f.m.position.set(f.x, y, f.z);
        f.m.rotation.z = f.t < fallT ? Math.sin(f.t * 6) * 0.4 : 0;
        f.m.visible = true;
        if (f.t > fallT + sitT) { f.t = on ? -Math.random() * 2 : 0; f.x = 0; f.m.visible = false; }
      }
    }
    requestAnimationFrame(tick);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
  root.Springs = { live, more };
}(typeof self !== 'undefined' ? self : this));
