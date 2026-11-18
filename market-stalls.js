'use strict';

// 치이카와 심즈 — 시장 노점 다시 짓기 (2026-11-12 이재헌님: 헌책방·타코야키·그릇·포셰트 노점 재구성, 포셰트를 사면 메고 다닌다)
// 원작의 노점은 나무 기둥과 판자 지붕, 앞에 늘어뜨린 노렌(천 간판), 종이 등롱이 달린 일본식 야타이다.
//  · 타코야키: 빨간 갑옷 요로이씨가 구멍 철판에서 굴려 굽는다. 지붕에 문어 간판, 옆에 앉아 먹는 선반과 높은 의자
//  · 헌책방: 수줍은 책벌레 후루혼야. 앞에 눕혀 쌓은 평대, 뒤에 빽빽한 책장, 떨이 상자
//  · 그릇: 계단식 진열대에 사발·접시·찻잔·주전자. 바닥 돗자리에 포개 둔 접시
//  · 포셰트: 포셰트 요로이씨의 손바느질 동물 포셰트(곰·토끼·고양이·개구리·별)가 줄줄이, 전신 거울, 접힌 파자마
// 노점 자리·방향은 예전 모델(glb-world.js STALL_GLB)과 같아 시장 소켓이 그대로 맞는다. 앞(+z)이 손님 쪽, 뒤(-z)가 주인 쪽
(function (root) {
  if (root.GLB_MAP) delete root.GLB_MAP.market;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('market');

  const STALLS = [['clothes', -12, -8], ['books', 12, -8], ['takoyaki', -12, 8], ['pottery', 12, 8]];
  const WOOD = '#b9875a', WOOD_D = '#8f6440', PLANK = '#d8b58a', INK = '#5a3b33';

  /* ---------- 포셰트 모델 (진열·착용 공용) ---------- */
  // 몸통 반폭 1 기준. 앞이 +z, 위가 +y. 손바느질 느낌의 둥근 동물 얼굴 + 금색 똑딱단추
  const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: root.toonRampWorld || null });
  const MAT = {};
  const m = c => MAT[c] || (MAT[c] = toon(c));
  const SPH = new THREE.SphereGeometry(1, 18, 14);
  function starGeo() {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.52 : 1.12;
      const x = Math.sin(a) * r, y = Math.cos(a) * r;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.16, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -0.25);
    return g;
  }
  let STAR = null;
  const POUCH_KINDS = ['bear', 'rabbit', 'cat', 'frog', 'star'];
  const KIND_NAME = { bear: '곰', rabbit: '토끼', cat: '고양이', frog: '개구리', star: '별' };
  function makePouch(kind, color, opt = {}) {
    const g = new THREE.Group();
    const add = (geo, c, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, m(c)); o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
    const light = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45).getStyle();
    const dark = new THREE.Color(color).lerp(new THREE.Color('#5a3b33'), 0.35).getStyle();
    if (kind === 'star') {
      STAR = STAR || starGeo();
      add(STAR, color, 0, 0, 0, 0.92, 0.92, 0.9);
    } else {
      add(SPH, color, 0, 0, 0, 1, 0.86, 0.52);
      // 뚜껑 덮개: 몸통 윗부분을 한 겹 더 (바느질 선처럼 진한 테두리)
      add(SPH, dark, 0, 0.16, 0.02, 1.02, 0.5, 0.5);
      add(SPH, color, 0, 0.18, 0.05, 0.98, 0.47, 0.5);
    }
    // 귀
    if (kind === 'bear') {
      for (const s of [-1, 1]) { add(SPH, color, s * 0.68, 0.7, 0, 0.3, 0.3, 0.2); add(SPH, light, s * 0.68, 0.7, 0.12, 0.17, 0.17, 0.1); }
    } else if (kind === 'rabbit') {
      for (const s of [-1, 1]) { const e = add(SPH, color, s * 0.36, 1.18, 0, 0.21, 0.62, 0.15); e.rotation.z = -s * 0.18; const i = add(SPH, '#f7c6d0', s * 0.37, 1.16, 0.1, 0.1, 0.45, 0.07); i.rotation.z = -s * 0.18; }
    } else if (kind === 'cat') {
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.48, 4), m(color));
        e.position.set(s * 0.56, 0.78, 0); e.rotation.z = -s * 0.32; e.rotation.y = Math.PI / 4; e.scale.z = 0.5; g.add(e);
      }
      // 고양이 수염
      for (const s of [-1, 1]) for (const dy of [-0.04, 0.06]) { const w = add(SPH, '#5a3b33', s * 0.62, dy - 0.1, 0.47, 0.18, 0.012, 0.012); w.rotation.z = s * dy * 2; }
    } else if (kind === 'frog') {
      for (const s of [-1, 1]) { add(SPH, color, s * 0.42, 0.72, 0.04, 0.3, 0.28, 0.26); add(SPH, '#ffffff', s * 0.42, 0.75, 0.22, 0.2, 0.2, 0.12); add(SPH, '#3a2a26', s * 0.42, 0.76, 0.32, 0.09, 0.1, 0.05); }
    }
    // 얼굴 (개구리는 눈이 머리 위에 있다)
    const fz = kind === 'star' ? 0.5 : 0.5;
    if (kind !== 'frog') for (const s of [-1, 1]) add(SPH, '#3a2a26', s * 0.3, kind === 'star' ? 0.08 : -0.06, fz, 0.075, 0.09, 0.04);
    for (const s of [-1, 1]) add(SPH, '#f4a3a8', s * 0.5, kind === 'star' ? -0.12 : -0.24, fz - 0.06, 0.12, 0.07, 0.03);
    add(SPH, kind === 'frog' ? '#c0504a' : '#3a2a26', 0, kind === 'star' ? -0.08 : -0.22, fz + 0.01, kind === 'frog' ? 0.22 : 0.06, 0.035, 0.03);
    // 똑딱단추와 걸이 고리
    if (kind !== 'star') add(SPH, '#e3bb4a', 0, 0.02, 0.53, 0.07, 0.07, 0.04);
    if (!opt.noLoop) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 16, Math.PI), m('#7d5a44'));
      loop.position.y = kind === 'rabbit' ? 0.62 : 0.66; g.add(loop);
    }
    g.userData.kind = kind;
    return g;
  }

  /* ---------- 노점 공통 틀 ---------- */
  // s: 노점 하나의 키트. W 폭, 앞기둥 z=FRONT, 뒷기둥 z=BACK
  const FRONT = 2.6, BACK = -2.4, HALF = 2.4, TOP = 3.05;
  function frame(s, o) {
    // 기둥: 굵은 각목에 아래는 돌 받침
    for (const x of [-HALF, HALF]) for (const z of [FRONT, BACK]) {
      s.box(x, TOP / 2, z, 0.16, TOP, 0.16, WOOD_D, 1);
      s.cyl(x, 0.06, z, 0.16, 0.12, '#b8b0a2', 0);
    }
    // 들보 (앞뒤·옆)
    for (const z of [FRONT, BACK]) s.box(0, TOP - 0.06, z, HALF * 2 + 0.3, 0.14, 0.14, WOOD_D, 1);
    for (const x of [-HALF, HALF]) s.box(x, TOP + 0.12, (FRONT + BACK) / 2, 0.14, 0.14, FRONT - BACK + 0.3, WOOD_D, 1);
    // 판자 지붕: 앞으로 살짝 숙인 박공 한쪽 + 판자 줄
    const roofW = HALF * 2 + 0.9, roofD = FRONT - BACK + 1.3;
    const roof = s.place(roundBoxGeo(roofW, 0.12, roofD, 0.05), mat(o.roof), 0, TOP + 0.42, (FRONT + BACK) / 2 + 0.2, 1, 1, 1, inkBig);
    roof.rotation.x = 0.13;
    for (let i = 0; i < 7; i++) {
      const sl = s.place(roundBoxGeo(0.05, 0.03, roofD - 0.1, 0.01), mat(o.roofLine || '#7a5638'), -roofW / 2 + 0.4 + i * ((roofW - 0.8) / 6), TOP + 0.49, (FRONT + BACK) / 2 + 0.2, 1, 1, 1, null);
      sl.rotation.x = 0.13;
    }
    // 앞 차양: 줄무늬 천이 처마 끝에 매달려 흔들린다
    const val = s.place(roundBoxGeo(roofW, 0.42, 0.06, 0.03), stripeMat(o.cloth, '#fffaf0', 12), 0, TOP + 0.02, FRONT + 0.62, 1, 1, 1, inkThin);
    val.userData.sway = 1;
    // 노렌: 앞 들보에 걸린 천 몇 장, 한 장에 한 글자. 아랫단이 갈라져 있다
    const N = o.noren.length, nw = (HALF * 2 - 0.5) / N;
    for (let i = 0; i < N; i++) {
      const x = -HALF + 0.25 + nw * (i + 0.5);
      s.box(x, TOP - 0.42, FRONT + 0.1, nw - 0.08, 0.62, 0.035, o.cloth, 1);
      s.paint(x, TOP - 0.68, FRONT + 0.125, nw - 0.14, 0.5, g => drawText(g, o.noren[i], 0, 0.25, nw - 0.2, 0.44, o.norenInk || '#fffaf0'));
    }
    s.box(0, TOP - 0.08, FRONT + 0.1, HALF * 2 - 0.3, 0.07, 0.07, '#7a5638', 0);   // 노렌 막대
    // 지붕 위 간판
    s.box(0, TOP + 1.2, BACK + 0.9, 2.8, 0.9, 0.16, '#fff6e2', 2);
    s.box(0, TOP + 0.72, BACK + 0.9, 0.14, 0.4, 0.14, WOOD_D, 0);
    s.paint(0, TOP + 0.82, BACK + 0.99, 2.6, 0.78, g => drawText(g, o.sign, 0, 0.39, 2.4, 0.66, o.signInk || INK));
    // 종이 등롱 두 개 (앞 모서리)
    for (const x of [-HALF + 0.05, HALF - 0.05]) lantern(s, x, TOP - 0.45, FRONT + 0.32, o.lamp || '#e86a5a', o.lampText || '');
  }
  function lantern(s, x, y, z, c, text) {
    s.box(x, y + 0.42, z, 0.03, 0.22, 0.03, '#3a2a26', 0);
    s.cyl(x, y + 0.29, z, 0.12, 0.05, '#3a2a26', 0);
    s.ball(x, y, z, 0.24, 0.3, 0.24, c, 1);
    for (const dy of [-0.15, -0.05, 0.05, 0.15]) s.cyl(x, y + dy, z, 0.24 * Math.sqrt(1 - (dy / 0.3) ** 2) + 0.004, 0.012, '#fff1d6', 0);
    s.cyl(x, y - 0.29, z, 0.12, 0.05, '#3a2a26', 0);
    if (text) s.paint(x, y - 0.13, z + 0.245, 0.24, 0.26, g => drawText(g, text, 0, 0.13, 0.2, 0.22, '#fffaf0'));
  }
  // 둥근 등받이 없는 높은 의자 (좌면 윗면 = top)
  function stool(s, x, z, top, c = '#c0503f') {
    s.cyl(x, top - 0.05, z, 0.3, 0.1, c, 1);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const leg = s.box(x + Math.sin(a) * 0.18, (top - 0.1) / 2, z + Math.cos(a) * 0.18, 0.06, top - 0.1, 0.06, WOOD_D, 0);
      leg.rotation.z = Math.sin(a) * 0.08; leg.rotation.x = -Math.cos(a) * 0.08;
    }
    s.cyl(x, top * 0.42, z, 0.2, 0.03, WOOD_D, 0);
  }
  // 사발(속이 빈 그릇): 레이스 단면으로
  const BOWL = (() => {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new THREE.Vector2(0.55 + Math.sin(a) * 0.45, 0.06 + (1 - Math.cos(a)) * 0.0 + Math.sin(a) * 0.0 + i * 0.054)); }
    const outer = [new THREE.Vector2(0, 0), new THREE.Vector2(0.38, 0), new THREE.Vector2(0.42, 0.06)];
    for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; outer.push(new THREE.Vector2(0.42 + Math.sin(a) * 0.58, 0.06 + (1 - Math.cos(a)) * 0.54)); }
    outer.push(new THREE.Vector2(0.94, 0.6));
    for (let i = 10; i >= 0; i--) { const a = (i / 10) * Math.PI / 2; outer.push(new THREE.Vector2(0.36 + Math.sin(a) * 0.56, 0.12 + (1 - Math.cos(a)) * 0.46)); }
    outer.push(new THREE.Vector2(0, 0.12));
    return new THREE.LatheGeometry(outer, 24);
  })();
  function bowl(s, x, y, z, r, c, rim) {
    const b = s.place(BOWL, mat(c), x, y, z, r, r, r, inkThin);
    if (rim) s.place(new THREE.TorusGeometry(0.94, 0.035, 5, 24), mat(rim), x, y + 0.6 * r, z, r, r, r, null).rotation.x = Math.PI / 2;
    return b;
  }

  /* ---------- 노점별 ---------- */
  const BUILD = {
    takoyaki(s) {
      frame(s, { roof: '#c46a52', cloth: '#d9473c', noren: ['타', '코', '야', '키'], sign: '타코야키', signInk: '#c0392b', lamp: '#e2483c', lampText: '焼' });
      // 지붕 위 문어 간판: 빨간 머리에 머리띠, 다리 여덟
      const oy = TOP + 1.95, oz = BACK + 0.9;
      s.ball(1.75, oy, oz, 0.42, 0.46, 0.38, '#e35b4b', 2);
      s.ball(1.75, oy + 0.02, oz, 0.43, 0.08, 0.39, '#fffaf0', 0);
      for (const d of [-1, 1]) s.ball(1.75 + d * 0.14, oy - 0.08, oz + 0.33, 0.06, 0.08, 0.04, '#3a2a26', 0);
      s.ball(1.75, oy - 0.22, oz + 0.36, 0.08, 0.07, 0.05, '#c0392b', 0);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s.ball(1.75 + Math.sin(a) * 0.36, oy - 0.42, oz + Math.cos(a) * 0.28, 0.1, 0.18, 0.1, '#e35b4b', 0); }
      // 굽는 수레: 나무 몸통, 앞판은 빨간 판에 흰 글씨와 문어 그림
      const cx = 0.15, cz = -0.75;
      s.box(cx, 0.6, cz, 3.5, 1.1, 1.2, WOOD, 2);
      s.box(cx, 0.6, cz + 0.61, 3.3, 0.9, 0.04, '#d9473c', 0);
      s.paint(cx - 0.55, 0.22, cz + 0.635, 1.9, 0.72, g => drawText(g, '타코야키', 0, 0.36, 1.8, 0.6, '#fffaf0'));
      s.paint(cx + 1.15, 0.2, cz + 0.635, 0.8, 0.76, g => {
        g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0.48, 0.24, 0.22, 0, 0, Math.PI * 2); g.fill();
        g.lineWidth = 0.06; g.strokeStyle = '#fffaf0';
        for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-0.16 + i * 0.08, 0.3); g.quadraticCurveTo(-0.24 + i * 0.12, 0.12, -0.3 + i * 0.15, 0.08); g.stroke(); }
      });
      for (const x of [-1.5, 1.8]) s.cyl(cx + x - 0.15, 0.1, cz + 0.45, 0.1, 0.2, '#3a2a26', 0);       // 수레바퀴 흉내 받침
      s.box(cx, 1.19, cz, 3.7, 0.08, 1.35, PLANK, 1);                                                // 상판
      // 타코야키 철판: 검은 무쇠에 반구 구멍 4×6, 반쯤 익은 공이 굴러 있다
      const ix = 0.3, iy = 1.29, iz = cz - 0.05;
      s.box(ix, iy - 0.02, iz, 1.5, 0.14, 0.86, '#3d3533', 1);
      s.cyl(ix, 1.2, iz, 0.5, 0.04, '#f2913a', 0);                                                   // 불꽃 빛
      for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) {
        const bx = ix - 0.55 + q * 0.22, bz = iz - 0.3 + r * 0.2;
        s.cyl(bx, iy + 0.052, bz, 0.088, 0.012, '#24201f', 0);
        if ((r * 6 + q) % 7 === 3) continue;                                                         // 막 부은 빈 구멍
        const done = (r + q) % 3 !== 0;
        s.ball(bx, iy + 0.07, bz, 0.08, 0.07, 0.08, done ? '#d68f45' : '#f0d6a0', 0);
        if (done) s.ball(bx + 0.02, iy + 0.12, bz, 0.035, 0.012, 0.03, '#a8642c', 0);
      }
      // 반죽 주전자·꼬챙이·소스·마요·파래가루
      s.cyl(ix - 1.15, 1.38, iz - 0.15, 0.13, 0.3, '#e9e2d4', 1);
      s.cone(ix - 1.02, 1.42, iz - 0.15, 0.04, 0.12, '#e9e2d4', 0).rotation.z = -1;
      s.cyl(ix - 1.15, 1.54, iz - 0.15, 0.11, 0.02, '#f2e3b5', 0);
      for (const d of [-0.04, 0.04]) { const p = s.box(ix + 0.95, 1.29, iz + 0.3 + d, 0.36, 0.015, 0.015, '#c9a46a', 0); p.rotation.y = 0.3; }
      s.cyl(ix + 1.25, 1.38, iz - 0.25, 0.07, 0.3, '#6b3a22', 1); s.cyl(ix + 1.25, 1.56, iz - 0.25, 0.03, 0.06, '#e8c36a', 0);
      s.cyl(ix + 1.42, 1.37, iz - 0.25, 0.065, 0.28, '#fffaf0', 1); s.cone(ix + 1.42, 1.51, iz - 0.25, 0.04, 0.08, '#d9473c', 0);
      s.cyl(ix + 1.42, 1.32, iz - 0.02, 0.05, 0.18, '#7fae5a', 0);
      // 다 구운 배 모양 접시(후네) 두 개: 공 여섯 알에 소스·마요 줄과 이쑤시개
      for (const [bx, bz] of [[cx - 1.2, cz + 0.42], [cx - 0.55, cz + 0.45]]) boat(s, bx, 1.24, bz);
      // 옆 선반에서 앉아 먹는다 (높은 의자 둘)
      const lx = -3.6, lz = 0.82;
      s.box(lx, 1.5, lz, 2.2, 0.08, 0.46, PLANK, 1);
      for (const x of [lx - 0.95, lx + 0.95]) s.box(x, 0.75, lz - 0.1, 0.1, 1.5, 0.1, WOOD_D, 0);
      s.box(lx, 0.5, lz - 0.1, 2.0, 0.06, 0.06, WOOD_D, 0);
      s.box(lx, 1.555, lz, 2.1, 0.012, 0.36, '#f6e9da', 0);                                          // 행주 깐 자리
      boat(s, -4.1, 1.55, lz + 0.02); boat(s, -3.1, 1.55, lz + 0.02);
      s.cyl(lx + 0.95, 1.6, lz - 0.08, 0.06, 0.12, '#cfe6ea', 0);                                    // 이쑤시개 통
      stool(s, -4.1, 1.95, 0.97); stool(s, -3.1, 1.95, 0.97);
      // 뒤편: 밀가루 포대, 문어 통, 물통
      s.ball(-1.6, 0.35, -1.9, 0.38, 0.36, 0.3, '#f2ece0', 1);
      s.paint(-1.6, 0.2, -1.59, 0.5, 0.3, g => drawText(g, '밀가루', 0, 0.15, 0.46, 0.24, '#8f6440'));
      s.cyl(1.7, 0.3, -1.95, 0.32, 0.6, '#9fc7d8', 1); s.cyl(1.7, 0.62, -1.95, 0.3, 0.04, '#c86a5a', 0);
      s.solidCircle(cx, cz, 1.3); s.solidCircle(lx, lz - 0.1, 0.9);
    },
    books(s) {
      frame(s, { roof: '#7d6aa8', roofLine: '#5b4a85', cloth: '#5b6aa8', noren: ['헌', '책', '방'], sign: '헌책방 · 후루혼야', signInk: '#4a3f7a', lamp: '#f3e3b5', lampText: '' });
      const BOOK = ['#e8c97c', '#a8c6e0', '#e6a79a', '#b7d6a5', '#d9b8e4', '#c98f6a', '#f2efe4', '#7d9ac9'];
      // 뒤 책장: 4칸에 높이가 제각각인 책이 빽빽
      const bx0 = -0.3, bz = -1.15;
      s.box(bx0, 1.25, bz - 0.24, 3.2, 2.5, 0.06, WOOD_D, 1);
      for (const x of [-1.6, 1.6]) s.box(bx0 + x, 1.25, bz, 0.08, 2.5, 0.5, WOOD, 1);
      for (let r = 0; r < 5; r++) s.box(bx0, 0.05 + r * 0.6, bz, 3.2, 0.06, 0.5, WOOD, 0);
      let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let r = 0; r < 4; r++) {
        let x = bx0 - 1.52;
        while (x < bx0 + 1.45) {
          const w = 0.07 + rnd() * 0.07, h = 0.36 + rnd() * 0.16;
          if (rnd() < 0.06 && x > bx0 - 1.2) { const t = s.box(x + 0.1, 0.08 + r * 0.6 + h / 2 - 0.05, bz + 0.02, w, h, 0.36, BOOK[(rnd() * 8) | 0], 0); t.rotation.z = 0.35; x += 0.26; continue; }
          s.box(x + w / 2, 0.08 + r * 0.6 + h / 2, bz + 0.02, w - 0.008, h, 0.36, BOOK[(rnd() * 8) | 0], 0);
          x += w;
        }
      }
      // 앞 평대: 낮은 두 단. 아래 단은 표지가 위로 누운 책, 위 단은 비스듬히 세운 책
      const tz = 1.6;
      s.box(0, 0.35, tz, 3.8, 0.7, 1.4, WOOD, 2);
      s.box(0, 0.72, tz, 3.9, 0.06, 1.5, PLANK, 1);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
        const x = -1.68 + i * 0.42, z = tz + 0.05 + row * 0.42, n = 1 + ((i + row) % 3);
        for (let k = 0; k < n; k++) {
          const b = s.box(x, 0.78 + k * 0.07, z, 0.34, 0.06, 0.3, BOOK[(i * 3 + row + k) % 8], 0);
          b.rotation.y = (rnd() - 0.5) * 0.25;
        }
        if (row === 1 && i % 2 === 0) s.box(x, 0.79 + n * 0.07, z + 0.1, 0.12, 0.012, 0.06, '#fffaf0', 0);   // 가격표
      }
      s.box(0, 0.98, tz - 0.55, 3.8, 0.5, 0.06, WOOD_D, 0);                                             // 뒤 단 받침
      for (let i = 0; i < 12; i++) {
        const b = s.box(-1.65 + i * 0.3, 1.0, tz - 0.48, 0.24, 0.34, 0.04, BOOK[(i * 5) % 8], 0);
        b.rotation.x = -0.32;
      }
      s.paint(1.25, 0.14, tz + 0.76, 1.1, 0.4, g => drawText(g, '한 권 100원', 0, 0.2, 1.0, 0.32, INK));
      // 떨이 상자: 골판지 상자에 책등이 삐죽
      for (const [x, z] of [[-2.0, 0.2], [2.0, 0.6]]) {
        s.box(x, 0.28, z, 0.7, 0.56, 0.55, '#c9a273', 1);
        for (let i = 0; i < 5; i++) s.box(x - 0.24 + i * 0.12, 0.6, z, 0.09, 0.22, 0.4, BOOK[(i + 2) % 8], 0);
      }
      // 후루혼야 자리: 작은 의자와 돈통, 읽던 책 무더기
      stool(s, 1.9, -0.9, 0.5, '#8f6440');
      s.box(1.9, 0.56, -0.9, 0.3, 0.1, 0.22, '#c9a24a', 1);
      for (let k = 0; k < 4; k++) s.box(1.3, 0.05 + k * 0.08, -1.9, 0.36, 0.07, 0.28, BOOK[(k * 3) % 8], 0).rotation.y = k * 0.2;
      s.solidCircle(0, tz, 1.4); s.solidCircle(bx0, bz, 1.2);
    },
    pottery(s) {
      frame(s, { roof: '#a07a58', cloth: '#6a5a8a', noren: ['그', '릇'], sign: '그릇 노점', signInk: '#5a4a3a', lamp: '#f0c27a', lampText: '' });
      const GLAZE = [['#9fc7d8', '#4f7c9a'], ['#efe5cf', '#b0754a'], ['#c98f6a', '#7d4a32'], ['#b5c99a', '#5f7d4a'], ['#f7f3ea', '#3d5f8a'], ['#e7b9b2', '#a85a5a']];
      // 계단 진열대: 남색 천을 덮은 세 단
      const tz = 1.65;
      for (let k = 0; k < 3; k++) {
        const h = 0.42 + k * 0.4, z = tz + 0.45 - k * 0.45;
        s.box(0, h / 2, z, 3.9, h, 0.48, WOOD, 1);
        s.box(0, h + 0.015, z, 4.0, 0.03, 0.52, '#3f4f7d', 0);
        s.box(0, h - 0.08, z + 0.255, 4.0, 0.18, 0.02, '#3f4f7d', 0);
      }
      // 아랫단: 사발, 가운데: 접시를 세워 기대고 찻잔, 윗단: 주전자와 큰 대접
      for (let i = 0; i < 6; i++) {
        const [c, rim] = GLAZE[i];
        bowl(s, -1.6 + i * 0.64, 0.45, tz + 0.45, 0.2, c, rim);
        if (i % 2) bowl(s, -1.6 + i * 0.64, 0.57, tz + 0.45, 0.17, c, rim);
      }
      for (let i = 0; i < 5; i++) {
        const [c, rim] = GLAZE[(i + 2) % 6];
        const p = s.cyl(-1.5 + i * 0.75, 1.05, tz - 0.05, 0.24, 0.03, c, 1); p.rotation.x = 1.25;
        s.place(new THREE.TorusGeometry(0.24, 0.018, 5, 24), mat(rim), -1.5 + i * 0.75, 1.05, tz - 0.045, 1, 1, 1, null).rotation.x = 1.25 - Math.PI / 2;
        s.cyl(-1.12 + i * 0.75, 0.9, tz + 0.08, 0.07, 0.12, GLAZE[i][1], 1);
        s.cyl(-1.12 + i * 0.75, 0.96, tz + 0.08, 0.065, 0.01, '#f7f3ea', 0);
      }
      for (let i = 0; i < 3; i++) {
        const x = -1.3 + i * 1.3, [c, rim] = GLAZE[(i * 2 + 1) % 6];
        if (i === 1) {
          // 주전자: 둥근 몸통·뚜껑·꼭지·주둥이·손잡이
          s.ball(x, 1.42, tz - 0.45, 0.2, 0.17, 0.2, c, 1);
          s.ball(x, 1.57, tz - 0.45, 0.1, 0.04, 0.1, rim, 0); s.ball(x, 1.62, tz - 0.45, 0.03, 0.03, 0.03, rim, 0);
          s.cone(x + 0.2, 1.4, tz - 0.45, 0.05, 0.18, c, 0).rotation.z = -0.9;
          s.place(new THREE.TorusGeometry(0.1, 0.02, 5, 12, Math.PI), mat(rim), x - 0.2, 1.43, tz - 0.45, 1, 1, 1, null).rotation.z = Math.PI / 2;
        } else bowl(s, x, 1.27, tz - 0.45, 0.3, c, rim);
      }
      // 바닥 돗자리: 포갠 접시 더미와 짚을 깐 나무 상자
      s.box(-2.7, 0.01, 2.3, 1.1, 0.02, 1.3, '#e3cf9a', 0);
      for (let k = 0; k < 6; k++) s.cyl(-2.8, 0.04 + k * 0.035, 2.0, 0.26, 0.03, k % 2 ? '#efe5cf' : '#f7f3ea', k === 5 ? 1 : 0);
      for (let k = 0; k < 4; k++) s.cyl(-2.55, 0.04 + k * 0.035, 2.6, 0.2, 0.03, '#9fc7d8', k === 3 ? 1 : 0);
      s.box(2.0, 0.25, -0.3, 0.8, 0.5, 0.6, '#b98f68', 1);
      for (let i = 0; i < 7; i++) s.box(1.75 + (i % 4) * 0.16, 0.52, -0.42 + ((i / 4) | 0) * 0.22, 0.14, 0.04, 0.03, '#e8d27a', 0).rotation.y = i;
      bowl(s, 1.85, 0.5, -0.2, 0.16, '#c98f6a', '#7d4a32');
      // 뒤 작업대: 닦는 수건과 닦을 그릇
      s.box(-0.6, 0.55, -1.2, 1.6, 0.06, 0.7, PLANK, 1);
      for (const x of [-1.3, 0.1]) for (const z of [-1.45, -0.95]) s.box(x, 0.27, z, 0.07, 0.54, 0.07, WOOD_D, 0);
      s.box(-0.95, 0.6, -1.2, 0.36, 0.04, 0.24, '#f6f1e6', 0);
      bowl(s, -0.35, 0.58, -1.15, 0.17, '#b5c99a', '#5f7d4a');
      bowl(s, -0.05, 0.58, -1.3, 0.15, '#efe5cf', '#b0754a');
      s.solidCircle(0, tz, 1.4);
    },
    clothes(s) {
      frame(s, { roof: '#e49aae', roofLine: '#c46d87', cloth: '#f08aa6', noren: ['포', '셰', '트'], sign: '포셰트 · 파자마', signInk: '#c04d72', lamp: '#f6bcc8', lampText: '' });
      // 행거 두 줄: 앞줄에 동물 포셰트가 줄줄이 (손님이 하나 내려 본다 → 빈 고리)
      const COL = ['#f4a9bd', '#9fd0ea', '#f3d27a', '#a8d8b4', '#c9b6e4', '#f0a58c', '#fffaf0', '#e86a5a', '#b9d98a', '#f6c98e'];
      const hz = 1.95;
      for (const x of [-2.15, 2.15]) s.box(x, 0.9, hz, 0.09, 1.8, 0.09, WOOD_D, 1);
      for (const x of [-2.15, 2.15]) s.box(x, 0.04, hz, 0.12, 0.08, 0.6, WOOD_D, 0);
      s.place(new THREE.CylinderGeometry(0.035, 0.035, 4.3, 10), mat('#c9a24a'), 0, 1.75, hz, 1, 1, 1, inkThin).rotation.z = Math.PI / 2;
      const hung = [];
      for (let i = 0; i < 10; i++) {
        const x = -1.9 + i * 0.42;
        const p = makePouch(POUCH_KINDS[i % 5], COL[i]);
        p.scale.setScalar(0.17);
        p.position.set(x, 1.47, hz + 0.02);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 5, 16), m('#7d5a44')); hook.position.y = 1.0; p.add(hook);
        s.group.add(p);
        hung.push(p);
      }
      s.group.userData.pouches = hung;
      // 전신 거울 (손님은 x+ 쪽을 보고 선다)
      const mx = 4.25, mz = 2.2;
      s.box(mx, 0.08, mz, 0.5, 0.16, 0.7, WOOD_D, 1);
      s.box(mx, 1.0, mz, 0.12, 1.75, 0.82, '#c9a24a', 1);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.55), new THREE.MeshBasicMaterial({ color: '#dff3fb' }));
      gl.position.set(mx - 0.065, 1.0, mz); gl.rotation.y = -Math.PI / 2; s.group.add(gl);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
      sh.position.set(mx - 0.07, 1.1, mz - 0.15); sh.rotation.set(0, -Math.PI / 2, 0.3); s.group.add(sh);
      s.ball(mx, 1.92, mz, 0.1, 0.1, 0.1, '#f08aa6', 0);
      // 뒤 탁자: 접힌 파자마 더미 (줄무늬·물방울), 실패와 바늘꽂이
      s.box(-0.4, 0.55, -1.15, 2.4, 0.06, 0.8, PLANK, 1);
      for (const x of [-1.5, 0.7]) for (const z of [-1.45, -0.85]) s.box(x, 0.27, z, 0.07, 0.54, 0.07, WOOD_D, 0);
      const PJ = [['#bfe0f2', '#fffaf0'], ['#f7c6d0', '#fffaf0'], ['#f3e3a0', '#e8a46a'], ['#cde7c4', '#fffaf0']];
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
        const [a, b] = PJ[(i + k) % 4];
        s.place(roundBoxGeo(0.46, 0.09, 0.36, 0.04), stripeMat(a, b, 5), -1.2 + i * 0.52, 0.63 + k * 0.095, -1.15, 1, 1, 1, inkThin).rotation.y = (k - 1) * 0.08;
      }
      s.cyl(0.55, 0.64, -0.9, 0.06, 0.12, '#e86a5a', 0); s.cyl(0.7, 0.64, -0.95, 0.06, 0.12, '#9fd0ea', 0);
      s.ball(0.62, 0.64, -1.3, 0.1, 0.07, 0.1, '#f6bcc8', 1);
      // 앞 낮은 상: 견본 포셰트를 눕혀 둔 바구니
      s.cyl(-2.95, 0.22, 2.4, 0.4, 0.44, '#d2ab78', 1);
      s.cyl(-2.95, 0.45, 2.4, 0.41, 0.04, '#b48a59', 0);
      for (let i = 0; i < 3; i++) { const p = makePouch(POUCH_KINDS[(i + 2) % 5], COL[i + 4], { noLoop: true }); p.scale.setScalar(0.14); p.position.set(-3.1 + i * 0.15, 0.5, 2.3 + (i % 2) * 0.18); p.rotation.x = -0.9; s.group.add(p); }
      s.solidCircle(-0.4, -1.15, 1.2);
    },
  };
  function boat(s, x, y, z) {
    const b = s.box(x, y + 0.03, z, 0.5, 0.06, 0.28, '#e8d2a8', 1);
    b.rotation.y = 0.15;
    for (let i = 0; i < 6; i++) {
      const bx = x - 0.16 + (i % 3) * 0.16, bz = z - 0.06 + ((i / 3) | 0) * 0.12;
      s.ball(bx, y + 0.12, bz, 0.07, 0.06, 0.07, '#d68f45', 0);
      s.ball(bx, y + 0.17, bz, 0.05, 0.012, 0.05, '#6b3a22', 0);
    }
    s.box(x, y + 0.2, z - 0.01, 0.42, 0.012, 0.012, '#fffaf0', 0).rotation.y = 0.5;
    s.box(x, y + 0.2, z + 0.02, 0.42, 0.012, 0.012, '#fffaf0', 0).rotation.y = -0.4;
    s.ball(x + 0.06, y + 0.19, z, 0.06, 0.012, 0.04, '#7fae5a', 0);
    s.box(x + 0.1, y + 0.24, z + 0.04, 0.012, 0.16, 0.012, '#c9a46a', 0).rotation.z = 0.5;
  }

  // 장터 빌더: 노점 넷을 예전 모델 자리·방향에 짓는다. 가운데는 장바구니와 짐더미
  if (typeof BUILDERS !== 'undefined') {
    BUILDERS.market = function (k, p) {
      const th = ((p.face || 0) * Math.PI) / 2;
      for (const [id, ox, oz] of STALLS) {
        const st = Math.atan2(ox, oz);
        const g = new THREE.Group();
        g.position.set(ox * Math.cos(th) - oz * Math.sin(th), 0, ox * Math.sin(th) + oz * Math.cos(th));
        g.rotation.y = st - th;
        k.group.add(g);
        const s = makeKit(g, p.x + ox, p.z + oz, st / (Math.PI / 2));
        s.group.userData.stall = id;
        BUILD[id](s);
        if (id === 'clothes') root.MarketStalls.rack = g;
      }
    };
  }

  /* ---------- 소켓: 타코야키 먹는 자리를 옆 선반 의자로 ---------- */
  const AS = root.ASSET_SOCKETS && root.ASSET_SOCKETS.market;
  if (AS && AS.takoyaki) Object.assign(AS.takoyaki, { eat_sit_1: [-4.1, 1.95, 0.97, -4.1, 0.6], eat_sit_2: [-3.1, 1.95, 0.97, -3.1, 0.6] });
  if (AS && AS.clothes) Object.assign(AS.clothes, { mirror: [3.4, 2.2, 0, 4.4, 2.2] });
  // more-sets의 임시 행거·거울은 이제 노점에 늘 있으므로 띄우지 않는다. 고른 포셰트는 진짜 행거에서 빠진다
  const FX = root.ActFx && root.ActFx.FX;
  if (FX && FX.s_pochette) FX.s_pochette = { make() { return {}; }, run() {} };

  /* ---------- 포셰트 사서 메고 다니기 ---------- */
  // 성격·색으로 고른다: 주인공들은 어울리는 동물, 나머지는 몸 색의 보색 쪽 파스텔 + 이름으로 정한 동물
  const PICK = {
    chiikawa: ['bear', '#f4a9bd'], hachiware: ['cat', '#9fd0ea'], usagi: ['rabbit', '#f3d27a'], momonga: ['star', '#c9b6e4'],
    kurimanju: ['frog', '#a8d8b4'], rakko: ['bear', '#c98f6a'], shisa: ['star', '#f0a58c'], furuhonya: ['frog', '#b9d98a'],
  };
  const PASTEL = ['#f4a9bd', '#9fd0ea', '#f3d27a', '#a8d8b4', '#c9b6e4', '#f0a58c', '#b9d98a', '#f6c98e'];
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  function choose(c) {
    if (PICK[c.id] && !c.pochette) return { kind: PICK[c.id][0], color: PICK[c.id][1] };
    const h = hash(c.id + (c.pochette ? c.pochette.kind : ''));
    let kind = POUCH_KINDS[h % 5];
    if (c.pochette && kind === c.pochette.kind) kind = POUCH_KINDS[(h + 1) % 5];
    return { kind, color: PASTEL[(h >> 3) % PASTEL.length] };
  }
  const Lab = root.Labor && root.Labor.prototype;
  if (Lab) {
    const fin0 = Lab.onFinish;
    Lab.onFinish = function (c, x) {
      fin0.apply(this, arguments);
      if (x && /^(market\.pochette_mirror|pochette\.)/.test(x.id) && !c.extra && (x.id === 'market.pochette_mirror' || /buy|mirror/.test(x.id))) {
        c.pochette = choose(c);
        c.pochetteDay = this.sim.day;
      }
    };
    const save0 = Lab.save;
    Lab.save = function (c) { const r = save0.call(this, c); if (c.pochette) r.pochette = c.pochette; return r; };
    const load0 = Lab.load;
    Lab.load = function (c, r) { load0.call(this, c, r); if (r && r.pochette && POUCH_KINDS.includes(r.pochette.kind)) c.pochette = { kind: r.pochette.kind, color: String(r.pochette.color || '#f4a9bd') }; };
  }

  // 몸에 매기: 몸통(레이스) 단면을 따라 비스듬한 끈 고리를 두르고, 가장 낮은 앞-오른쪽에 포셰트를 단다
  function bodyProfile(a) {
    const info = root.AnimRig && AnimRig.rigInfo(a.built, a.preset);
    const lathe = info && info.bodies && info.bodies.find(b => b.geometry && b.geometry.type === 'LatheGeometry' && b.parent === a.built.model);
    if (!lathe) return null;
    const pts = lathe.geometry.parameters.points.map(p => [p.x, p.y]);
    const sc = lathe.scale, py = lathe.position.y;
    const y0 = pts[0][1] * sc.y + py, y1 = pts[pts.length - 1][1] * sc.y + py;
    const r = y => {
      let best = 0;
      for (let i = 1; i < pts.length; i++) {
        const [xa, ya] = pts[i - 1], [xb, yb] = pts[i];
        const A = ya * sc.y + py, B = yb * sc.y + py;
        if ((y - A) * (y - B) <= 0 && A !== B) best = Math.max(best, (xa + (xb - xa) * (y - A) / (B - A)) * sc.x);
      }
      return best;
    };
    return { y0, y1, r };
  }
  function wear(a, pc) {
    const prof = bodyProfile(a);
    if (!prof) return null;
    const g = new THREE.Group();
    g.name = 'pochette';
    const low = -0.55;                                  // 가장 낮은 곳: 앞에서 왼쪽(-x)으로 약 30도 (원작 굿즈처럼 몸 왼쪽 아래)
    // 얼굴은 몸 앞 위쪽 절반을 차지한다: 끈은 앞에서는 배 높이(얼굴 아래)로만 지나고, 등 뒤 왼쪽으로만 비스듬히 올라간다
    const H = prof.y1 - prof.y0, base = prof.y0 + H * 0.13, A = H * 0.17;   // 가장 높은 곳도 몸 아래 1/3(얼굴 아래)
    const yAt = f => base + A * (1 - Math.cos(f - low)) / 2;
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const f = (i / 48) * Math.PI * 2;
      const y = yAt(f);
      const rr = prof.r(y) + 0.012;                    // 몸에 착 붙게
      pts.push(new THREE.Vector3(Math.sin(f) * rr, y, Math.cos(f) * rr));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.02, 6, true), m(new THREE.Color(pc.color).lerp(new THREE.Color('#5a3b33'), 0.45).getStyle()));
    g.add(strap);
    const py = base - 0.05 * (H / 1.67), pr = prof.r(py);
    const pouch = makePouch(pc.kind, pc.color, { noLoop: true });
    const size = 0.2 * (H / 1.67);
    pouch.scale.setScalar(size);
    pouch.position.set(Math.sin(low) * (pr + size * 0.42), py, Math.cos(low) * (pr + size * 0.42));
    pouch.rotation.y = low;
    pouch.rotation.x = -0.12;
    g.add(pouch);
    // 끈 끝에서 포셰트 귀퉁이까지 짧은 고리 두 가닥
    for (const s of [-1, 1]) {
      const ang = low + s * (size * 0.8) / Math.max(0.3, pr);
      const ty = yAt(ang), top = new THREE.Vector3(Math.sin(ang) * (prof.r(ty) + 0.012), ty, Math.cos(ang) * (prof.r(ty) + 0.012));
      const bot = pouch.position.clone().add(new THREE.Vector3(Math.cos(low) * s * size * 0.75, size * 0.3, -Math.sin(low) * s * size * 0.75));
      const mid = top.clone().lerp(bot, 0.5);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, top.distanceTo(bot), 5), strap.material);
      seg.position.copy(mid); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
      g.add(seg);
    }
    a.built.model.add(g);
    return g;
  }
  const NO_BAG = /onsen|sento|bath|pool|swim|sea|beach|bed|sleep/;
  function tick() {
    const G = root.game;
    if (G && G.actors && G.sim) {
      for (const a of G.actors) {
        const c = a.c;
        if (c.extra && !c.pochette) continue;
        const pc = c.pochette;
        let w = (a._pochette && a._pochette.parent === a.built.model ? a._pochette : null);
        const key = pc ? pc.kind + pc.color : '';
        if (w && w.userData.key !== key) { a.built.model.remove(w); w = null; }
        if (pc && !w) { w = wear(a, pc); if (w) w.userData.key = key; a._pochette = w; }
        if (w) {
          const d = c.doing && c.doing.x;
          w.visible = !c.asleep && !(d && (NO_BAG.test(d.place || '') || NO_BAG.test(c.clip || '')));
        }
      }
      // 노점 행거: 포셰트를 고르는 손님이 있는 자리의 포셰트가 빠진다
      const rack = root.MarketStalls.rack;
      const pouches = rack && rack.userData.pouches;
      if (pouches) {
        const t = performance.now() / 1000;
        const take = new Set();
        for (const c of G.sim.chars) {
          const x = c.doing && c.doing.x;
          if (!x || !/^market.pochette_/.test(x.id)) continue;
          if (c.doing.phase !== 'use' || (x.id === 'market.pochette_browse' && (c.doing.step || 0) < 1) || (c.doing.step || 0) > 1) continue;
          // 소켓 쪽(rack_1 왼쪽 / rack_2 오른쪽) 안에서 이름으로 하나
          const sx = c.doing.socket ? rack.worldToLocal(new THREE.Vector3(c.doing.socket.x, 0, c.doing.socket.z)).x : 0;
          const base = Math.round((Math.max(-1.9, Math.min(1.9, sx)) + 1.9) / 0.42);
          take.add(Math.max(0, Math.min(9, base + (hash(c.id) % 3) - 1)));
        }
        pouches.forEach((p, i) => { p.visible = !take.has(i); p.rotation.z = Math.sin(t * 1.3 + i) * 0.06; });
      }
    }
    requestAnimationFrame(tick);
  }
  root.MarketStalls = { makePouch, wear, choose, POUCH_KINDS, KIND_NAME, rack: null };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
}(typeof self !== 'undefined' ? self : this));
