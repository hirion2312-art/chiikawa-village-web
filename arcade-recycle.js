'use strict';

// 치이카와 심즈 — 게임센터·리사이클 숍 안을 다시 꾸미기 (2026-11-12 이재헌님: 오락센터·리사이클샵 재구성)
// 둘 다 interiors-auto.js가 모형 가구를 걷어 낸 빈 방에 INTERIOR_FURNISH로 새 가구를 들인다 (좌표 = 장소 기준, 문은 +z 쪽)
//  · 게임센터: 뒤 벽에 크레인 게임 넷(유리 상자 속 인형 더미, 레일 위 집게가 실제로 움직인다), 왼쪽 벽에 캡슐 뽑기 셋,
//    오른쪽에 경품 교환대와 인형 선반, 문 옆 동전 교환기. 바닥은 별무늬 카펫, 벽 위에 네온 띠
//  · 리사이클 숍: 뒤 벽 가득 잡동사니 선반(주전자·시계·라디오·꽃병·인형·램프), 가운데 소품 탁자, 지팡이·우산 통,
//    오래된 브라운관 TV, 무기 걸이(막대·목검·사스마타·방망이), 계산대와 금전등록기, 낡은 안락의자
(function (root) {
  const F = root.INTERIOR_FURNISH || (root.INTERIOR_FURNISH = {});
  const AS = root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {});
  const glass = new THREE.MeshToonMaterial({ color: '#d8f0fb', transparent: true, opacity: 0.28, depthWrite: false });
  const neon = c => new THREE.MeshBasicMaterial({ color: c });
  const PLUSH = ['#fbf8f1', '#9fd0ea', '#f3d27a', '#f4a9bd', '#c9b6e4', '#a8d8b4', '#f0a58c'];

  // 동그란 인형: 몸통 + 두 귀 + 점 눈
  function plush(k, x, y, z, s, c, ry = 0) {
    k.ball(x, y, z, s, s * 0.92, s, c, 1);
    for (const d of [-1, 1]) k.ball(x + Math.cos(ry) * d * s * 0.62, y + s * 0.78, z - Math.sin(ry) * d * s * 0.62, s * 0.26, s * 0.26, s * 0.2, c, 0);
    const fx = Math.sin(ry) * s * 0.92, fz = Math.cos(ry) * s * 0.92;
    for (const d of [-1, 1]) k.ball(x + fx + Math.cos(ry) * d * s * 0.3, y + s * 0.1, z + fz - Math.sin(ry) * d * s * 0.3, s * 0.07, s * 0.09, s * 0.05, '#3a2a26', 0);
    for (const d of [-1, 1]) k.ball(x + fx * 0.97 + Math.cos(ry) * d * s * 0.52, y - s * 0.08, z + fz * 0.97 - Math.sin(ry) * d * s * 0.52, s * 0.12, s * 0.07, s * 0.04, '#f4a3a8', 0);
  }

  // 모형 가구를 걷어 낸 뒤에도 바닥에 남은 작은 조각(깔개·그림자 판)을 숨긴다: 큰 바닥판만 남긴다
  function clearLeftovers(id) {
    const h = ((root.GLB_HOLDERS || {})[id] || [])[0];
    if (!h) return;
    const b = new THREE.Box3(), sz = new THREE.Vector3();
    h.traverse(m => { if (!m.isMesh) return; b.setFromObject(m).getSize(sz); if (sz.x < 4 && sz.z < 4) m.visible = false; });
  }

  /* ================= 게임센터 ================= */
  const CRANE_X = [-6.4, -2.15, 2.15, 6.4], CRANE_Z = -4.2, GACHA_Z = [-1.6, 0.7, 3.0];
  const arcadeSo = {};
  CRANE_X.forEach((x, i) => { arcadeSo[`crane_${i + 1}`] = [x, CRANE_Z + 1.75, 0, x, CRANE_Z]; });
  GACHA_Z.forEach((z, i) => { arcadeSo[`gacha_${i + 1}`] = [-8.6, z, 0, -10.0, z]; });
  arcadeSo.prize_stand = [6.6, 2.4, 0, 8.4, 2.4];
  AS.arcade = Object.assign(AS.arcade || {}, arcadeSo);

  F.arcade = function (k, api, fy) {
    clearLeftovers('arcade');
    const y0 = fy + 0.02;
    // 별무늬 카펫
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
    const g = cv.getContext('2d');
    g.fillStyle = '#3d3a6e'; g.fillRect(0, 0, 512, 320);
    const COL = ['#f3d27a', '#9fd0ea', '#f4a9bd', '#a8d8b4'];
    for (let i = 0; i < 90; i++) {
      const x = (i * 97) % 512, y = (i * 61) % 320, c = COL[i % 4];
      g.fillStyle = c;
      if (i % 3) { g.beginPath(); g.arc(x, y, 4 + (i % 4), 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, r = j % 2 ? 4 : 10; g.lineTo(x + Math.sin(a) * r, y - Math.cos(a) * r); } g.fill(); }
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(20.6, 12.2), new THREE.MeshToonMaterial({ map: tex }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, y0, 0.8); carpet.receiveShadow = true; k.group.add(carpet);
    // 벽 위 네온 띠
    for (const [x, z, w, d, c] of [[0, -5.25, 20, 0.08, '#f4a9bd'], [-10.35, 0.8, 0.08, 11.6, '#9fd0ea'], [10.35, 0.8, 0.08, 11.6, '#f3d27a']]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), neon(c)); m.position.set(x, fy + 3.9, z); k.group.add(m);
    }
    k.box(0, fy + 4.25, -5.1, 4.6, 1.0, 0.12, '#2f2c55', 1);
    k.paint(0, fy + 3.8, -5.03, 4.3, 0.9, gg => drawText(gg, '★ 게임센터 ★', 0, 0.45, 4.1, 0.8, '#f3d27a'));

    // 크레인 게임: 받침 + 유리 상자 + 머리 간판, 안에 인형 더미, 집게는 dyn
    CRANE_X.forEach((x, i) => {
      const z = CRANE_Z, body = ['#f4a9bd', '#9fd0ea', '#f3d27a', '#c9b6e4'][i], dark = new THREE.Color(body).lerp(new THREE.Color('#3a2a26'), 0.25).getStyle();
      k.box(x, y0 + 0.6, z, 2.0, 1.2, 1.8, body, 2);
      k.box(x, y0 + 1.22, z + 0.62, 2.0, 0.08, 0.56, dark, 0);                       // 조작판
      k.cyl(x - 0.45, y0 + 1.3, z + 0.7, 0.05, 0.14, '#3a2a26', 0);                  // 조이스틱
      k.ball(x - 0.45, y0 + 1.42, z + 0.7, 0.09, 0.09, 0.09, '#e86a5a', 0);
      k.cyl(x + 0.2, y0 + 1.28, z + 0.7, 0.11, 0.06, '#7fd07a', 1);                 // 큰 버튼
      k.cyl(x + 0.55, y0 + 1.28, z + 0.72, 0.07, 0.05, '#f3d27a', 0);
      k.box(x + 0.6, y0 + 0.55, z + 0.91, 0.5, 0.44, 0.04, '#2f2c55', 1);           // 경품 나오는 문
      k.box(x - 0.55, y0 + 0.75, z + 0.91, 0.16, 0.26, 0.03, '#d9d9d9', 0);           // 동전 넣는 곳
      k.box(x - 0.55, y0 + 0.78, z + 0.93, 0.03, 0.12, 0.01, '#3a2a26', 0);
      for (const sx of [-0.96, 0.96]) for (const sz of [-0.86, 0.86]) k.box(x + sx, y0 + 2.1, z + sz, 0.08, 1.8, 0.08, '#f7f3ea', 0);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.78, 1.7), glass); gl.position.set(x, y0 + 2.1, z); k.group.add(gl);
      k.box(x, y0 + 3.2, z, 2.1, 0.42, 1.9, body, 2);
      k.box(x, y0 + 3.58, z + 0.3, 1.7, 0.5, 0.1, '#fffaf0', 1);
      k.paint(x, y0 + 3.36, z + 0.36, 1.6, 0.44, gg => drawText(gg, ['곰 인형', '고양이', '토끼', '별사탕'][i], 0, 0.22, 1.5, 0.38, dark));
      for (let j = 0; j < 7; j++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), neon(['#ffe28a', '#ff9fb8', '#9fe0ff'][j % 3])); m.position.set(x - 0.9 + j * 0.3, y0 + 3.0, z + 0.96); k.group.add(m); }
      // 인형 더미 (구멍 쪽 앞오른쪽은 비워 둔다)
      for (let n = 0; n < 11; n++) {
        const px = x - 0.7 + (n % 4) * 0.4 + ((n / 4) | 0) * 0.08, pz = z - 0.55 + ((n / 4) | 0) * 0.42;
        if (px > x + 0.35 && pz > z + 0.1) continue;
        plush(k, px, y0 + 1.42 + ((n * 5) % 3) * 0.08, pz, 0.17, PLUSH[(n + i * 2) % PLUSH.length], ((n % 3) - 1) * 0.5);
      }
      k.box(x + 0.6, y0 + 1.4, z + 0.55, 0.52, 0.36, 0.52, '#2f2c55', 0);           // 경품 구멍
      k.box(x, y0 + 2.94, z, 1.8, 0.04, 0.06, '#c9c9c9', 0);                          // 레일
      api.dyn(`crane:crane_${i + 1}`, {
        x, y: y0 + 2.9, z, obj: '크레인 게임',
        clips: {
          play(o, u) {
            // 좌우로 맞추고(0~.45) 내려가(.45~.6) 집고(.6~.68) 올라와(.68~.85) 구멍 쪽으로 옮긴다(.85~1)
            const c = o.data;
            const tx = u < 0.45 ? Math.sin(u * 14) * 0.55 : u < 0.85 ? c.tx || 0 : (c.tx || 0) + (0.6 - (c.tx || 0)) * ((u - 0.85) / 0.15);
            if (u < 0.45) c.tx = tx;
            const drop = u < 0.45 ? 0 : u < 0.6 ? (u - 0.45) / 0.15 : u < 0.68 ? 1 : u < 0.85 ? 1 - (u - 0.68) / 0.17 : 0;
            c.cart.position.x = tx;
            c.line.scale.y = 0.2 + drop * 1.05; c.line.position.y = -0.1 - (0.2 + drop * 1.05) * 0.5;
            c.claw.position.y = -0.22 - drop * 1.05;
            const close = u > 0.6 && u < 0.98 ? 1 : 0;
            c.prongs.forEach((p, j) => { p.rotation.z = Math.cos((j / 3) * Math.PI * 2) * (0.55 - close * 0.4); p.rotation.x = Math.sin((j / 3) * Math.PI * 2) * (0.55 - close * 0.4); });
            c.prize.visible = u > 0.62 && u < 0.97;
          },
        },
      }, (kk, o) => {
        const cart = new THREE.Group(); o.root.add(cart);
        const cb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), new THREE.MeshToonMaterial({ color: '#c9c9c9' })); cart.add(cb);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), new THREE.MeshToonMaterial({ color: '#3a2a26' })); cart.add(line);
        const claw = new THREE.Group(); cart.add(claw);
        claw.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshToonMaterial({ color: '#d9d9d9' })));
        const prongs = [];
        for (let j = 0; j < 3; j++) {
          const pv = new THREE.Group(); claw.add(pv);
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), new THREE.MeshToonMaterial({ color: '#d9d9d9' })); p.position.y = -0.1; pv.add(p);
          prongs.push(pv);
        }
        const prize = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshToonMaterial({ color: PLUSH[(i * 3 + 1) % PLUSH.length] }));
        prize.position.y = -0.3; prize.visible = false; claw.add(prize);
        Object.assign(o.data, { cart, line, claw, prongs, prize, tx: 0 });
        o.clips.play(o, 0);
      });
    });

    // 캡슐 뽑기: 빨간 받침 + 투명 돔 속 캡슐, 동전 손잡이, 나오는 구멍
    GACHA_Z.forEach((z, i) => {
      const x = -9.8, c = ['#e86a5a', '#5aa0d9', '#7fbf6a'][i];
      k.box(x, y0 + 0.55, z, 1.0, 1.1, 1.0, c, 2);
      k.box(x, y0 + 1.14, z, 1.06, 0.08, 1.06, '#fffaf0', 0);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), glass); dome.position.set(x, y0 + 1.6, z); k.group.add(dome);
      for (let n = 0; n < 14; n++) {
        const a = n * 2.4, r = 0.18 + (n % 3) * 0.08, yy = y0 + 1.28 + ((n * 3) % 5) * 0.08;
        const cap = new THREE.Group(); cap.position.set(x + Math.sin(a) * r, yy, z + Math.cos(a) * r); cap.rotation.set(a, n, 0);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: PLUSH[n % PLUSH.length] }));
        const bot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshToonMaterial({ color: '#fbf8f1' }));
        cap.add(top, bot); k.group.add(cap);
      }
      k.cyl(x, y0 + 2.12, z, 0.2, 0.08, c, 1);
      const knob = k.cyl(x + 0.52, y0 + 0.8, z, 0.17, 0.06, '#d9d9d9', 1); knob.rotation.z = Math.PI / 2;
      k.box(x + 0.56, y0 + 0.8, z, 0.04, 0.05, 0.28, '#9a9a9a', 0);
      k.box(x + 0.52, y0 + 0.3, z, 0.04, 0.24, 0.34, '#3a2a26', 0);
      k.box(x + 0.52, y0 + 1.0, z - 0.3, 0.03, 0.14, 0.22, '#fffaf0', 0);
      k.paint(x + 0.54, y0 + 0.97, z - 0.3, 0.2, 0.12, gg => drawText(gg, '200원', 0, 0.06, 0.2, 0.1, '#3a2a26'), Math.PI / 2);
    });

    // 경품 교환대와 인형 선반 (오른쪽 벽)
    k.box(8.4, y0 + 0.55, 2.4, 0.9, 1.1, 3.2, '#f3d27a', 2);
    k.box(8.4, y0 + 1.13, 2.4, 1.0, 0.06, 3.3, '#fffaf0', 1);
    k.box(9.9, y0 + 1.6, 2.4, 0.5, 3.2, 3.6, '#c99a64', 1);
    for (let r = 0; r < 3; r++) {
      k.box(9.6, y0 + 0.65 + r * 0.95, 2.4, 0.6, 0.06, 3.5, '#a97c50', 0);
      for (let n = 0; n < 5; n++) plush(k, 9.55, y0 + 0.9 + r * 0.95, 1.0 + n * 0.7, 0.22 + (n % 2) * 0.04, PLUSH[(r * 5 + n) % PLUSH.length], -Math.PI / 2);
    }
    k.box(8.4, y0 + 1.45, 3.6, 0.5, 0.6, 0.06, '#fffaf0', 1);
    k.paint(8.36, y0 + 1.2, 3.64, 0.46, 0.5, gg => drawText(gg, '경품', 0, 0.25, 0.4, 0.4, '#c0504f'), -Math.PI / 2);
    // 동전 교환기 (문 왼쪽)
    k.box(-4.0, y0 + 0.9, 6.4, 0.9, 1.8, 0.7, '#9aa7b8', 2);
    k.box(-4.0, y0 + 1.35, 6.06, 0.6, 0.4, 0.02, '#2f2c55', 0);
    k.box(-4.0, y0 + 0.5, 6.06, 0.4, 0.16, 0.04, '#3a2a26', 0);
    k.paint(-4.0, y0 + 1.6, 6.04, 0.7, 0.24, gg => drawText(gg, '동전 교환', 0, 0.12, 0.66, 0.2, '#fffaf0'), Math.PI);
  };

  /* ================= 리사이클 숍 ================= */
  AS.recycle = Object.assign(AS.recycle || {}, {
    browse_stand: [-2.6, -2.5, 0, -2.6, -4.3],
    cane_look: [-5.0, 1.6, 0, -6.4, 1.6],
    tv_look: [2.0, 0.9, 0, 2.0, -0.7],
    counter_stand: [3.9, 3.3, 0, 5.4, 3.3],
    weapon_look: [4.6, -2.0, 0, 6.4, -2.0],
  });
  F.recycle = function (k, api, fy) {
    clearLeftovers('recycle');
    const y0 = fy + 0.02;
    const TAG = (x, y, z, ry = 0) => { const t = k.box(x, y, z, 0.12, 0.08, 0.01, '#fffaf0', 0); t.rotation.y = ry; return t; };
    // 뒤 벽 선반 셋: 칸마다 다른 잡동사니
    for (const sx of [-4.6, -0.6, 3.0]) {
      k.box(sx, y0 + 1.5, -4.4, 3.4, 3.0, 0.08, '#9a7350', 1);
      for (const e of [-1.65, 1.65]) k.box(sx + e, y0 + 1.5, -4.15, 0.08, 3.0, 0.6, '#b98a5c', 1);
      for (let r = 0; r < 4; r++) k.box(sx, y0 + 0.08 + r * 0.92, -4.15, 3.3, 0.06, 0.6, '#b98a5c', 0);
    }
    let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const items = [
      (x, y, z) => { k.ball(x, y + 0.18, z, 0.2, 0.17, 0.2, '#c9c2b4', 1); k.cone(x + 0.2, y + 0.2, z, 0.04, 0.16, '#c9c2b4', 0).rotation.z = -1; k.ball(x, y + 0.36, z, 0.05, 0.03, 0.05, '#3a2a26', 0); },     // 주전자
      (x, y, z) => { const c = k.cyl(x, y + 0.24, z, 0.22, 0.08, '#f2e3b5', 1); c.rotation.x = Math.PI / 2; k.box(x, y + 0.27, z + 0.05, 0.02, 0.14, 0.01, '#3a2a26', 0); k.box(x + 0.04, y + 0.24, z + 0.05, 0.1, 0.02, 0.01, '#3a2a26', 0); },  // 시계
      (x, y, z) => { k.box(x, y + 0.16, z, 0.5, 0.3, 0.22, '#8f6a4a', 1); k.cyl(x - 0.12, y + 0.16, z + 0.12, 0.08, 0.02, '#d8cbb0', 0).rotation.x = Math.PI / 2; k.box(x + 0.25, y + 0.38, z, 0.01, 0.3, 0.01, '#9a9a9a', 0); },   // 라디오
      (x, y, z) => { k.ball(x, y + 0.2, z, 0.14, 0.2, 0.14, ['#5aa0d9', '#c98f6a', '#a8d8b4'][(rnd() * 3) | 0], 1); k.cyl(x, y + 0.42, z, 0.06, 0.1, '#5aa0d9', 0); },                      // 꽃병
      (x, y, z) => plush(k, x, y + 0.2, z + 0.05, 0.18, PLUSH[(rnd() * PLUSH.length) | 0]),                                                                                                          // 인형
      (x, y, z) => { k.cyl(x, y + 0.04, z, 0.12, 0.08, '#8a6242', 0); k.cyl(x, y + 0.24, z, 0.02, 0.36, '#c9a24a', 0); k.cone(x, y + 0.38, z, 0.2, 0.22, '#f3e3b5', 1); },                       // 램프
      (x, y, z) => { for (let n = 0; n < 4; n++) k.cyl(x, y + 0.02 + n * 0.04, z, 0.17, 0.035, n % 2 ? '#f7f3ea' : '#9fc7d8', 0); },                                                                 // 접시
      (x, y, z) => { k.box(x, y + 0.14, z, 0.4, 0.28, 0.3, '#d2ab78', 1); k.box(x, y + 0.29, z, 0.42, 0.02, 0.1, '#c49a62', 0); },                                                                  // 상자
    ];
    for (const sx of [-4.6, -0.6, 3.0]) for (let r = 0; r < 3; r++) for (let n = 0; n < 4; n++) {
      const x = sx - 1.2 + n * 0.8 + (rnd() - 0.5) * 0.15, y = y0 + 0.11 + r * 0.92, z = -4.12;
      items[(n * 3 + r * 5 + ((sx + 5) | 0)) % items.length](x, y, z);
      if ((n + r) % 2 === 0) TAG(x + 0.18, y + 0.06, z + 0.31);
    }
    // 가운데 소품 탁자: 천을 깐 낮은 탁자에 찻잔·카메라·오르골·필통
    k.box(-2.6, y0 + 0.4, 0.4, 2.4, 0.08, 1.2, '#b98a5c', 1);
    for (const sx of [-1.1, 1.1]) for (const sz of [-0.5, 0.5]) k.box(-2.6 + sx, y0 + 0.2, 0.4 + sz, 0.08, 0.4, 0.08, '#8a6242', 0);
    k.box(-2.6, y0 + 0.45, 0.4, 2.3, 0.01, 1.1, '#e7d7c0', 0);
    k.cyl(-3.4, y0 + 0.52, 0.3, 0.1, 0.12, '#f7f3ea', 1); k.cyl(-3.4, y0 + 0.47, 0.3, 0.16, 0.02, '#f7f3ea', 0);
    k.box(-2.8, y0 + 0.56, 0.5, 0.36, 0.2, 0.18, '#3a2a26', 1); k.cyl(-2.8, y0 + 0.56, 0.62, 0.07, 0.08, '#9a9a9a', 0).rotation.x = Math.PI / 2;
    k.box(-2.0, y0 + 0.55, 0.3, 0.3, 0.2, 0.24, '#c98f6a', 1); k.box(-2.0, y0 + 0.66, 0.3, 0.32, 0.03, 0.26, '#a86a4a', 0);
    k.box(-1.6, y0 + 0.5, 0.65, 0.4, 0.08, 0.12, '#f4a9bd', 0);
    TAG(-3.0, y0 + 0.47, 0.95); TAG(-2.0, y0 + 0.47, 0.95);
    // 지팡이·우산 통 (왼쪽 벽)
    k.cyl(-6.4, y0 + 0.45, 1.6, 0.42, 0.9, '#8f6a4a', 2);
    for (const y of [0.15, 0.75]) k.cyl(-6.4, y0 + y, 1.6, 0.44, 0.06, '#5a4030', 0);
    const STICK = ['#b98a5c', '#3a2a26', '#e86a5a', '#5aa0d9', '#c9a24a', '#7fbf6a'];
    for (let n = 0; n < 7; n++) {
      const a = n * 0.9, s = k.box(-6.4 + Math.sin(a) * 0.2, y0 + 1.15, 1.6 + Math.cos(a) * 0.2, 0.06, 1.5, 0.06, STICK[n % 6], 0);
      s.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12);
      if (n % 3 === 0) k.place(new THREE.TorusGeometry(0.1, 0.03, 5, 10, Math.PI), mat(STICK[n % 6]), -6.4 + Math.sin(a) * 0.29, y0 + 1.9, 1.6 + Math.cos(a) * 0.29, 1, 1, 1, null);
    }
    TAG(-6.0, y0 + 0.6, 2.03);
    // 브라운관 TV: 다리 달린 낮은 장 위에, 화면에 줄무늬 잡음
    k.box(2.0, y0 + 0.35, -0.7, 1.4, 0.7, 0.7, '#8a6242', 1);
    for (const sx of [-0.6, 0.6]) k.box(2.0 + sx, y0 + 0.05, -0.7, 0.06, 0.1, 0.6, '#5a4030', 0);
    k.box(2.0, y0 + 1.15, -0.75, 1.1, 0.9, 0.8, '#d8c7a6', 2);
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; const g = cv.getContext('2d');
    for (let yy = 0; yy < 48; yy += 3) { g.fillStyle = ['#8fb3c9', '#a9c9db', '#7d9fb8'][(yy / 3) % 3]; g.fillRect(0, yy, 64, 3); }
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    scr.position.set(1.92, y0 + 1.17, -0.34); k.group.add(scr);
    for (const yy of [1.36, 1.2]) k.cyl(2.42, y0 + yy, -0.34, 0.05, 0.03, '#5a4030', 0).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const ant = k.box(2.0 + s * 0.2, y0 + 1.85, -0.8, 0.02, 0.6, 0.02, '#9a9a9a', 0); ant.rotation.z = s * 0.5; }
    TAG(2.5, y0 + 0.72, -0.34);
    // 무기 걸이 (오른쪽 벽): 막대·목검·사스마타·방망이·뜰채
    k.box(6.6, y0 + 1.4, -2.0, 0.16, 2.6, 2.6, '#9a7350', 1);
    for (const y of [0.8, 1.6, 2.4]) k.box(6.45, y0 + y, -2.0, 0.12, 0.08, 2.4, '#b98a5c', 0);
    const W = [['#b98a5c', 2.0], ['#d2ab78', 1.8], ['#8a6242', 2.2], ['#c9a24a', 1.4], ['#a97c50', 1.9]];
    W.forEach(([c, h], n) => {
      const z = -3.0 + n * 0.5;
      k.box(6.35, y0 + 0.15 + h / 2, z, 0.08, h, 0.08, c, 1);
      if (n === 1) { k.box(6.35, y0 + 0.5, z, 0.1, 0.06, 0.24, '#3a2a26', 0); }                                    // 목검 코등이
      if (n === 2) { k.place(new THREE.TorusGeometry(0.22, 0.03, 5, 12, Math.PI), mat('#9a9a9a'), 6.35, y0 + 0.15 + h + 0.02, z, 1, 1, 1, null).rotation.y = Math.PI / 2; }   // 사스마타
      if (n === 3) k.cyl(6.35, y0 + 1.25, z, 0.08, 0.6, '#c9a24a', 1);                                                // 방망이
      if (n === 4) { k.place(new THREE.TorusGeometry(0.22, 0.02, 5, 14), mat('#5a4030'), 6.35, y0 + 2.05, z, 1, 1, 1, null).rotation.y = Math.PI / 2; }  // 뜰채
    });
    k.box(6.45, y0 + 2.75, -2.0, 0.06, 0.34, 1.4, '#fffaf0', 1);
    k.paint(6.41, y0 + 2.6, -2.0, 1.3, 0.3, gg => drawText(gg, '토벌 도구', 0, 0.15, 1.2, 0.26, '#7d4a32'), -Math.PI / 2);
    // 계산대: 금전등록기·종·손글씨 가격표
    k.box(5.4, y0 + 0.55, 3.3, 0.9, 1.1, 2.8, '#b98a5c', 2);
    k.box(5.4, y0 + 1.13, 3.3, 1.0, 0.06, 2.9, '#d8b58a', 1);
    k.box(5.45, y0 + 1.38, 2.6, 0.6, 0.44, 0.5, '#c9a24a', 1);
    k.box(5.25, y0 + 1.44, 2.6, 0.12, 0.2, 0.44, '#3a2a26', 0);
    for (let n = 0; n < 6; n++) k.box(5.15, y0 + 1.25, 2.42 + n * 0.07, 0.06, 0.03, 0.05, '#fffaf0', 0);
    k.ball(5.3, y0 + 1.2, 3.7, 0.08, 0.06, 0.08, '#e3bb4a', 1);
    k.box(5.0, y0 + 1.5, 4.3, 0.04, 0.5, 0.7, '#fffaf0', 1);
    k.paint(4.97, y0 + 1.3, 4.3, 0.64, 0.44, gg => drawText(gg, '매입합니다', 0, 0.22, 0.6, 0.3, '#7d4a32'), -Math.PI / 2);
    // 낡은 안락의자와 스탠드, 거울
    k.box(-5.4, y0 + 0.35, 4.4, 1.2, 0.5, 1.0, '#a8b88f', 2);
    k.box(-5.4, y0 + 0.9, 3.95, 1.2, 0.9, 0.24, '#a8b88f', 1);
    for (const s of [-1, 1]) k.box(-5.4 + s * 0.55, y0 + 0.7, 4.4, 0.2, 0.4, 1.0, '#94a67d', 1);
    TAG(-4.8, y0 + 0.62, 4.92);
    k.cyl(-6.6, y0 + 0.03, 3.3, 0.18, 0.06, '#5a4030', 0); k.cyl(-6.6, y0 + 0.8, 3.3, 0.03, 1.6, '#5a4030', 0); k.cone(-6.6, y0 + 1.55, 3.3, 0.32, 0.38, '#f2c9a8', 1);
    k.box(-6.85, y0 + 1.0, -1.6, 0.08, 1.9, 0.7, '#c9a24a', 1);
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.7), new THREE.MeshBasicMaterial({ color: '#dff3fb' })); mir.position.set(-6.8, y0 + 1.0, -1.6); mir.rotation.y = Math.PI / 2; k.group.add(mir);
  };

  // 새 자리를 쓰는 상호작용: 크레인 게임·캡슐 뽑기·토벌 도구 구경
  const VO = root.VillageObjects;
  if (VO) {
    const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip, prop: prop || null, label, fx });
    const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
    put({ id: 'arcade.crane', place: 'arcade', name: '크레인 게임', cost: 200, hours: [10, 21], gain: { fun: 30 },
      steps: [S('crane_*', 'coin', 1.2, 'gum_coin', null, '동전을 짤랑'), S('crane_*', 'play', 6, 'crane_watch', null, '집게를 요리조리 조종하는 중', 'crane.play'), S('crane_*', 'cheer', 1.6, 'jump_joy', null, '잡았다!')] });
    put({ id: 'arcade.gacha', place: 'arcade', name: '캡슐 뽑기', cost: 200, hours: [10, 21], gain: { fun: 22 },
      steps: [S('gacha_*', 'coin', 1.2, 'gum_coin', null, '동전 넣는 중'), S('gacha_*', 'turn', 2.4, 'gum_turn', null, '드르륵 손잡이 돌리기'), S('gacha_*', 'open', 2.4, 'gum_open', 'capsule', '캡슐 열어 보는 중')] });
    put({ id: 'arcade.prize', place: 'arcade', name: '경품 인형 구경', hours: [10, 21], gain: { fun: 10 },
      steps: [S('prize_stand', 'look', 3, 'tilt_look', null, '선반의 인형을 올려다보는 중'), S('prize_stand', 'ooh', 1.6, 'point_ooh', null, '저거 갖고 싶다')] });
    put({ id: 'recycle.weapon_look', place: 'recycle', name: '토벌 도구 구경', hours: [9, 19], gain: { fun: 12 },
      steps: [S('weapon_look', 'look', 3, 'browse_shelf', null, '걸린 도구를 하나씩 보는 중'), S('weapon_look', 'try', 2.4, 'inspect_item', 'rod', '손에 쥐어 보는 중')] });
  }
}(typeof self !== 'undefined' ? self : this));
