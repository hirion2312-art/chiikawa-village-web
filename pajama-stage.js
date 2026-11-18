'use strict';

// 치이카와 심즈 — 파자마 파티즈 무대 다시 짓기 (2026-11-12 이재헌님: 파자마 파티즈 무대 재구성)
// 들판의 아이돌 무대: 잠옷 차림 아이돌답게 "밤하늘·베개·별" 무대.
//  · 나무 무대(높이 0.9) 앞자락에 별무늬 주름 천, 앞 가장자리에 발광 풋라이트
//  · 뒤 막: 남색 밤하늘 천에 초승달과 별, 양옆 분홍 커튼을 끈으로 묶었다. 위에 물결 장식과 "파자마 파티즈" 간판(전구 테두리)
//  · 양옆 트러스 탑에 스포트라이트, 공연 중에는 빛줄기가 무대를 쓸고 전구가 깜박인다
//  · 무대 뒤 구석에 커다란 베개 더미와 별 쿠션, 무대 아래 앞에 스피커 한 쌍
// 좌표: 무대 기준 +z가 관객 쪽 (ecology.js의 show_* 자리 z=-1.2, 관객 crowd_* z=8.8~14.2)
(function (root) {
  if (root.GLB_MAP) delete root.GLB_MAP.stage;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('stage');

  const H = 0.9, Z0 = -4.0, Z1 = 1.4, W = 11.6;
  const NAVY = '#2f3266', PINK = '#f4a9bd', PINK_D = '#e07f9c', LAV = '#c9b6e4', SKY = '#9fd0ea', CREAM = '#fff6e2', WOOD = '#e2c09a', GOLD = '#f3d27a';
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  const live = { bulbs: [], beams: [], heads: [] };

  function starShape(r1, r2) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = i % 2 ? r2 : r1; const x = Math.sin(a) * r, y = Math.cos(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    return s;
  }
  const STAR = new THREE.ExtrudeGeometry(starShape(1, 0.45), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 });
  STAR.translate(0, 0, -0.15);

  const build = function (k) {
    // 무대 몸통과 판자 윗면
    const zc = (Z0 + Z1) / 2, D = Z1 - Z0;
    k.box(0, H / 2, zc, W, H, D, '#b98a5c', 2);
    k.box(0, H - 0.04, zc, W + 0.2, 0.08, D + 0.2, WOOD, 1);
    for (let i = 1; i < 14; i++) k.box(-W / 2 + (W / 14) * i, H + 0.003, zc, 0.03, 0.01, D, '#c9a47c', 0);
    // 앞자락: 라벤더 주름 천 + 흰 별
    for (let i = 0; i < 24; i++) k.box(-W / 2 + 0.24 + i * (W - 0.48) / 23, H / 2 - 0.02, Z1 + 0.13, 0.42, H - 0.12, 0.08 + (i % 2) * 0.06, i % 2 ? LAV : '#bba5da', 0);
    for (let i = 0; i < 7; i++) { const s = k.place(STAR, mat('#fffaf0'), -W / 2 + 0.9 + i * 1.65, H * 0.5, Z1 + 0.24, 0.13, 0.13, 0.13, null); s.rotation.z = i * 0.3; }
    // 양옆 계단
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) k.box(s * (W / 2 + 1.05 - j * 0.35), (0.3 * (j + 1)) / 2, zc - 0.6, 0.4, 0.3 * (j + 1), 1.4, '#c99a64', 1);
    // 풋라이트: 앞 가장자리 작은 전구 줄
    for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(['#ffe28a', '#ff9fb8', '#9fe0ff'][i % 3])); b.position.set(-W / 2 + 0.5 + i * (W - 1) / 15, H + 0.08, Z1 - 0.08); k.group.add(b); live.bulbs.push(b); }

    // 뒤 막: 밤하늘 천 (캔버스에 그린 달·별)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const g = cv.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#26295c'); grd.addColorStop(1, '#4b4f8f'); g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(400, 70, 42, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2e62'; g.beginPath(); g.arc(382, 58, 38, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 46; i++) { const x = (i * 113) % 512, y = (i * 47) % 230 + 10, r = 1.5 + (i % 4); g.fillStyle = ['#fffaf0', '#ffe28a', '#ffd1df'][i % 3]; g.beginPath(); for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, rr = j % 2 ? r * 0.45 : r * 1.6; g.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3;
    for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, 256); g.stroke(); }                         // 천 주름
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.6, 4.6), new THREE.MeshBasicMaterial({ map: tex }));
    back.position.set(0, H + 2.3, Z0 + 0.12); k.group.add(back);
    k.box(0, H + 2.3, Z0 + 0.02, W - 1.2, 4.8, 0.14, NAVY, 2);
    // 양옆 기둥과 분홍 커튼(끈으로 묶어 허리가 잘록)
    for (const s of [-1, 1]) {
      k.box(s * (W / 2 - 0.45), H + 2.6, Z0 + 0.2, 0.36, 5.2, 0.36, '#fffaf0', 1);
      for (let i = 0; i < 5; i++) {
        const x = s * (W / 2 - 1.0 - i * 0.22);
        const upper = k.box(x, H + 3.55, Z0 + 0.35 + i * 0.02, 0.26, 2.3, 0.14, i % 2 ? PINK : PINK_D, 0);
        const lower = k.box(x + s * 0.12, H + 1.15, Z0 + 0.35 + i * 0.02, 0.26, 2.3, 0.14, i % 2 ? PINK : PINK_D, 0);
        upper.rotation.z = -s * 0.05; lower.rotation.z = s * 0.12;
      }
      k.ball(s * (W / 2 - 1.42), H + 2.35, Z0 + 0.5, 0.42, 0.14, 0.18, GOLD, 1);                // 묶은 끈
      k.ball(s * (W / 2 - 1.1), H + 2.2, Z0 + 0.55, 0.08, 0.3, 0.06, GOLD, 0);
    }
    // 위 물결 장식(발랑스)과 간판
    for (let i = 0; i < 13; i++) k.ball(-W / 2 + 0.6 + i * (W - 1.2) / 12, H + 4.75, Z0 + 0.35, 0.46, 0.34, 0.14, i % 2 ? PINK : SKY, 1);
    k.box(0, H + 5.55, Z0 + 0.25, 7.2, 1.3, 0.2, CREAM, 2);
    k.paint(0, H + 4.95, Z0 + 0.36, 6.8, 1.2, gg => {
      const t = '파자마 파티즈'; const cols = [PINK_D, '#7fb3d9', '#e3a93a', '#9b84d1', PINK_D, '#7fb3d9', '#e3a93a'];
      gg.save(); gg.scale(1, -1); gg.font = 'bold 0.86px Jua, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle';
      const chars = [...t]; const step = 0.86;
      chars.forEach((ch, i) => { gg.fillStyle = cols[i % cols.length]; gg.fillText(ch, (i - (chars.length - 1) / 2) * step, -0.62 + (i % 2 ? 0.05 : -0.05)); });
      gg.restore();
    });
    for (let i = 0; i < 22; i++) {
      const t = i / 22, a = t * Math.PI * 2;
      const x = Math.max(-3.6, Math.min(3.6, Math.cos(a) * 4.2)), y = H + 5.55 + Math.max(-0.65, Math.min(0.65, Math.sin(a) * 0.9));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow('#ffe28a')); b.position.set(x, y, Z0 + 0.38); k.group.add(b); live.bulbs.push(b);
    }
    for (const s of [-1, 1]) { const st = k.place(STAR, mat(GOLD), s * 4.2, H + 5.75, Z0 + 0.3, 0.45, 0.45, 0.45, inkThin); st.rotation.z = s * 0.25; }
    // 무대 위 매달린 초승달 (줄 둘)
    const moon = new THREE.Shape(); moon.absarc(0, 0, 1, 0.35, Math.PI * 2 - 0.35, false); moon.absarc(0.38, 0.12, 0.8, Math.PI * 2 - 0.6, 0.6, true);
    const mg = new THREE.ExtrudeGeometry(moon, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    const mm = k.place(mg, mat('#fff3c4'), -3.4, H + 3.9, Z0 + 0.9, 0.55, 0.55, 0.55, inkThin); mm.rotation.z = 0.5;
    for (const dx of [-0.2, 0.25]) k.box(-3.4 + dx, H + 4.45, Z0 + 0.95, 0.015, 0.6, 0.015, '#d9d9d9', 0);
    // 베개 더미와 별 쿠션 (무대 뒤 구석)
    for (const [x, z, c, r] of [[4.6, Z0 + 1.0, '#fffaf0', 0.1], [4.3, Z0 + 1.15, SKY, -0.2], [4.8, Z0 + 1.2, PINK, 0.3]]) {
      const p = k.place(roundBoxGeo(1.2, 0.36, 0.8, 0.17), mat(c), x, H + 0.2 + (c === SKY ? 0.34 : c === PINK ? 0.66 : 0), z, 1, 1, 1, inkThin); p.rotation.y = r;
    }
    const sc = k.place(STAR, mat(GOLD), -4.7, H + 0.48, Z0 + 1.0, 0.42, 0.42, 0.7, inkThin); sc.rotation.set(-0.25, 0.3, 0.2);
    // 트러스 탑과 스포트라이트
    for (const s of [-1, 1]) {
      const x = s * (W / 2 + 0.9), z = Z1 - 0.5;
      for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25]) k.box(x + dx, 3.4, z + dz, 0.06, 6.8, 0.06, '#c9c9d1', 0);
      for (let j = 0; j < 9; j++) { const br = k.box(x, 0.4 + j * 0.75, z - 0.25, 0.5, 0.04, 0.04, '#c9c9d1', 0); br.rotation.z = (j % 2 ? 1 : -1) * 0.9; }
      k.box(x, 6.85, z, 0.7, 0.1, 0.7, '#9a9aa6', 1);
      for (const dz of [-0.2, 0.2]) {
        const head = new THREE.Group(); head.position.set(x - s * 0.1, 6.6, z + dz); k.group.add(head);
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 12), new THREE.MeshToonMaterial({ color: '#3a3a44' })); can.rotation.x = Math.PI / 2; can.position.z = 0.1; head.add(can);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), glow('#fff6d0')); lens.position.z = 0.31; head.add(lens);
        const beamCol = dz < 0 ? PINK : SKY;
        const beam = new THREE.Mesh(new THREE.ConeGeometry(1.0, 6.4, 18, 1, true), new THREE.MeshBasicMaterial({ color: beamCol, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
        beam.rotation.x = -Math.PI / 2; beam.position.z = 3.5; head.add(beam);
        head.userData.side = s; head.userData.k = dz;
        live.heads.push(head); live.beams.push(beam);
      }
    }
    // 스피커 한 쌍 (무대 앞 아래)
    for (const s of [-1, 1]) {
      const x = s * (W / 2 - 0.4), z = Z1 + 1.0;
      k.box(x, 0.7, z, 1.0, 1.4, 0.8, '#3a3a44', 2);
      for (const [y, r] of [[1.05, 0.22], [0.48, 0.32]]) { const c = k.cyl(x, y, z + 0.41, r, 0.04, '#6a6a78', 0); c.rotation.x = Math.PI / 2; k.cyl(x, y, z + 0.43, r * 0.4, 0.04, '#9a9aa6', 0).rotation.x = Math.PI / 2; }
    }
    // 관객석 앞 잔디 위 피크닉 매트 둘
    for (const [x, c] of [[-3.5, '#f4c6d2'], [3.5, '#bfe0f2']]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), new THREE.MeshToonMaterial({ color: c })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, 11.5); k.group.add(m);
    }
    k.solidRect(0, zc, W + 0.2, D + 0.2);
    for (const s of [-1, 1]) { k.solidCircle(s * (W / 2 + 0.9), Z1 - 0.5, 0.5); k.solidCircle(s * (W / 2 - 0.4), Z1 + 1.0, 0.7); }
    live.place = k;
  };
  if (typeof BUILDERS !== 'undefined') BUILDERS.stage = build;

  // 공연 중: 조명이 무대를 쓸고 전구가 번갈아 깜박인다. 공연이 없으면 조명은 꺼진다
  function tick() {
    const G = root.game;
    if (G && G.sim && live.heads.length) {
      const on = G.sim.chars.some(c => c.doing && c.doing.x && /^stage\.(show|perform)/.test(c.doing.x.id) && c.doing.phase === 'use');
      const t = performance.now() / 1000;
      live.heads.forEach((h, i) => {
        const s = h.userData.side;
        h.rotation.y = on ? -s * (0.55 + Math.sin(t * 0.9 + i) * 0.35) : -s * 0.5;
        h.rotation.x = 0.55 + (on ? Math.sin(t * 1.3 + i * 2) * 0.15 : 0);
      });
      live.beams.forEach(b => { b.visible = on; });
      live.bulbs.forEach((b, i) => { b.visible = !on || ((i + Math.floor(t * 3)) % 3 !== 0); });
    }
    requestAnimationFrame(tick);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
}(typeof self !== 'undefined' ? self : this));
