'use strict';

// 치이카와 심즈 — 신사 다시 짓기 (2026-11-12 이재헌님: 신사 재구성)
// 마을 숲가의 작은 신사: 빨간 도리이 → 돌길 → 돌등롱 한 쌍과 고마이누 → 새전함과 방울 줄 → 금줄을 두른 배전.
// 왼쪽에 부적·제비뽑기 파는 작은 수여소, 오른쪽에 에마(소원 나무패) 걸이와 제비 묶는 줄, 입구 옆 손 씻는 데미즈야
// 참배: 도리이 앞에서 꾸벅 → 새전함에 동전 → 방울 줄 흔들기 → 짝짝 → 깊이 절 (village-objects의 shrine.pray 순서 그대로)
(function (root) {
  if (root.GLB_MAP) delete root.GLB_MAP.shrine;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('shrine');

  const VERM = '#d9533c', VERM_D = '#b8412f', BLACK = '#3a2e2b', STONE = '#bfb8ab', STONE_D = '#a39c90';
  const WOOD = '#b98a5c', WOOD_D = '#8a6242', WHITE = '#f7f2e6', ROOF = '#5f7f72', ROOF_D = '#4a6659', GOLD = '#e3bb4a';

  // 소켓 (+z가 도리이 쪽). 새전함 앞 두 자리에 나란히 서서 참배한다
  const SO = {
    torii_pass: [0, 5.2, 0, 0, 0],
    offer_stand: [-0.8, 1.9, 0, -0.2, 0.6],
    pray_stand: [0.8, 1.9, 0, 0.2, 0.6],
    omamori_stand: [-4.4, 0.75, 0, -4.4, -0.6],
    lantern_look: [3.4, 4.7, 0, 3.4, 3.3],
    ema_look: [4.4, 0.9, 0, 4.4, -0.4],
  };
  const AS = root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {});
  AS.shrine = Object.assign(AS.shrine || {}, SO);

  function torii(k, z) {
    const H = 4.3, X = 2.05;
    for (const s of [-1, 1]) {
      k.cyl(s * X, H / 2, z, 0.2, H, VERM, 2);
      k.cyl(s * X, 0.25, z, 0.25, 0.5, BLACK, 1);                 // 검은 밑둥(네마키)
      k.cyl(s * X, 3.52, z, 0.215, 0.12, BLACK, 0);
    }
    k.box(0, 3.42, z, 5.1, 0.24, 0.26, VERM, 2);                    // 누키
    k.box(0, 4.18, z, 5.4, 0.26, 0.34, VERM, 2);                    // 시마키
    // 가사기: 가운데 곧고 양 끝이 휘어 올라간다
    k.box(0, 4.48, z, 4.6, 0.3, 0.46, BLACK, 2);
    for (const s of [-1, 1]) { const e = k.box(s * 2.75, 4.56, z, 1.3, 0.28, 0.46, BLACK, 2); e.rotation.z = s * 0.16; }
    k.box(0, 3.8, z, 0.18, 0.62, 0.2, VERM, 0);                     // 현판 받침
    k.box(0, 3.8, z + 0.06, 0.8, 0.95, 0.12, BLACK, 1);
    k.box(0, 3.8, z + 0.13, 0.64, 0.8, 0.02, '#f1e2bb', 0);
    k.paint(0, 3.43, z + 0.145, 0.6, 0.76, g => drawText(g, '신사', 0, 0.38, 0.5, 0.7, BLACK));
  }
  function lantern(k, x, z) {
    k.box(x, 0.12, z, 0.9, 0.24, 0.9, STONE_D, 1);
    k.box(x, 0.32, z, 0.66, 0.16, 0.66, STONE, 1);
    k.cyl(x, 0.95, z, 0.16, 1.1, STONE, 1);
    k.box(x, 1.56, z, 0.62, 0.12, 0.62, STONE, 1);
    k.box(x, 1.86, z, 0.5, 0.48, 0.5, STONE, 1);                    // 불 집
    for (const [dx, dz] of [[0, 0.255], [0, -0.255], [0.255, 0], [-0.255, 0]]) k.box(x + dx, 1.86, z + dz, dx ? 0.02 : 0.26, 0.28, dz ? 0.02 : 0.26, '#ffe6a8', 0);
    const roof = k.cone(x, 2.1, z, 0.62, 0.42, STONE_D, 1); roof.rotation.y = Math.PI / 4;
    k.ball(x, 2.58, z, 0.1, 0.12, 0.1, STONE, 0);
  }
  function komainu(k, x, z, s) {
    k.box(x, 0.35, z, 0.85, 0.7, 0.85, STONE_D, 1);
    k.box(x, 0.74, z, 0.95, 0.08, 0.95, STONE, 0);
    const y = 0.78, c = '#cfc8ba';
    k.ball(x, y + 0.34, z, 0.34, 0.32, 0.4, c, 1);                  // 앉은 몸
    k.ball(x, y + 0.78, z + 0.12, 0.3, 0.28, 0.28, c, 1);           // 머리
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.ball(x + Math.sin(a) * 0.27, y + 0.8 + Math.cos(a) * 0.24, z + 0.02, 0.1, 0.1, 0.1, '#b9b2a4', 0); }  // 곱슬 갈기
    for (const d of [-1, 1]) k.ball(x + d * 0.1, y + 0.84, z + 0.37, 0.035, 0.04, 0.02, '#3a2e2b', 0);
    k.ball(x, y + 0.72, z + 0.39, 0.06, 0.04, 0.04, '#9a9286', 0);
    if (s > 0) k.ball(x, y + 0.64, z + 0.36, 0.08, 0.035, 0.03, '#7a4a42', 0);      // 아(입 벌림)·운 한 쌍
    for (const d of [-1, 1]) k.ball(x + d * 0.17, y + 0.1, z + 0.32, 0.09, 0.1, 0.12, c, 0);
    k.ball(x - s * 0.3, y + 0.5, z - 0.3, 0.12, 0.2, 0.1, '#b9b2a4', 0);           // 꼬리
  }
  function shide(k, x, y, z) {
    // 번개 모양 흰 종이(시데): 네 조각을 지그재그로
    for (let i = 0; i < 4; i++) k.box(x + (i % 2 ? 0.05 : -0.05), y - 0.08 - i * 0.12, z, 0.12, 0.1, 0.012, WHITE, 0);
  }
  function hall(k) {
    const W = 6.2, D = 4.6, Z0 = -0.6, FL = 0.6, zc = Z0 - D / 2;
    // 돌 기단과 마루
    k.box(0, 0.2, zc, W + 0.8, 0.4, D + 0.8, STONE_D, 2);
    k.box(0, FL - 0.06, zc, W + 0.3, 0.12, D + 0.3, WOOD, 1);
    // 앞 계단 둘
    k.box(0, 0.1, Z0 + 0.55, 2.2, 0.2, 0.4, STONE, 1);
    k.box(0, 0.3, Z0 + 0.3, 2.2, 0.2, 0.4, STONE, 1);
    // 기둥: 주홍 둥근 기둥 여섯
    for (const x of [-W / 2, -1.1, 1.1, W / 2]) k.cyl(x, FL + 1.35, Z0 - 0.1, 0.13, 2.7, VERM, 1);
    for (const x of [-W / 2, W / 2]) k.cyl(x, FL + 1.35, Z0 - D + 0.1, 0.13, 2.7, VERM, 1);
    // 벽: 흰 회벽에 주홍 띠, 앞은 격자문 셋
    k.box(0, FL + 1.3, Z0 - D + 0.05, W, 2.6, 0.12, WHITE, 1);
    for (const s of [-1, 1]) k.box(s * W / 2, FL + 1.3, zc, 0.12, 2.6, D - 0.2, WHITE, 1);
    for (const y of [FL + 0.12, FL + 2.55]) k.box(0, y, Z0 - 0.12, W, 0.16, 0.16, VERM_D, 0);
    for (const [x, w] of [[-2.1, 1.7], [0, 2.0], [2.1, 1.7]]) {
      k.box(x, FL + 1.3, Z0 - 0.18, w, 2.3, 0.06, '#e9ddc4', 0);
      for (let i = 1; i < 6; i++) k.box(x - w / 2 + (w / 6) * i, FL + 1.3, Z0 - 0.14, 0.04, 2.3, 0.04, WOOD_D, 0);
      for (let j = 1; j < 8; j++) k.box(x, FL + 0.15 + j * 0.29, Z0 - 0.14, w, 0.04, 0.04, WOOD_D, 0);
    }
    // 지붕: 크게 내민 맞배 + 처마 끝이 살짝 들린다, 용마루와 지기(X자 끝)
    const RW = W + 2.4, RD = D / 2 + 1.5, RY = FL + 3.2;
    for (const s of [-1, 1]) {
      const r = k.place(roundBoxGeo(RW, 0.22, RD, 0.08), mat(ROOF), 0, RY + 0.55, zc + s * (RD / 2 - 0.15), 1, 1, 1, inkBig);
      r.rotation.x = s * 0.48;
      const lip = k.place(roundBoxGeo(RW, 0.16, 0.5, 0.06), mat(ROOF_D), 0, RY + 0.55 - Math.sin(0.48) * (RD - 0.4) + 0.05, zc + s * (RD - 0.3), 1, 1, 1, inkThin);
      lip.rotation.x = s * 0.22;
    }
    k.box(0, RY + 1.18, zc, RW + 0.2, 0.26, 0.34, ROOF_D, 2);
    for (const s of [-1, 1]) for (const d of [-1, 1]) { const c = k.box(s * (RW / 2 + 0.05), RY + 1.5, zc + d * 0.1, 0.1, 0.9, 0.08, ROOF_D, 1); c.rotation.x = d * 0.5; }
    for (const s of [-1, 1]) k.ball(s * (RW / 2 - 0.2), RY + 1.2, zc, 0.12, 0.12, 0.12, GOLD, 0);
    // 처마 밑 서까래 끝
    for (let i = 0; i < 11; i++) k.box(-RW / 2 + 0.4 + i * ((RW - 0.8) / 10), RY - 0.05, Z0 + 0.8, 0.12, 0.12, 0.5, WOOD_D, 0);
    // 금줄: 굵게 꼰 짚줄이 가운데가 처지고 시데가 달린다
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = -2.7 + t * 5.4, y = FL + 2.85 - Math.sin(t * Math.PI) * 0.35;
      k.ball(x, y, Z0 + 0.25, 0.2, 0.16, 0.16, '#e2c27a', 0);
      if (i % 2 === 1) shide(k, x, y - 0.12, Z0 + 0.3);
    }
    // 방울(스즈)과 홍백 줄
    const RZ = Z0 + 1.72;                                          // 줄이 내려오는 자리 (새전함 바로 앞)
    k.box(0, FL + 3.28, Z0 + 0.95, 0.16, 0.16, 1.9, WOOD_D, 1);     // 처마에서 내민 받침 팔
    k.box(0, FL + 3.08, RZ, 0.06, 0.3, 0.06, BLACK, 0);
    k.ball(0, FL + 2.72, RZ, 0.3, 0.3, 0.3, GOLD, 1);
    k.box(0, FL + 2.64, RZ + 0.3, 0.3, 0.04, 0.02, '#7a5b2a', 0);
    const rope = k.place(new THREE.CylinderGeometry(0.075, 0.09, 1.9, 10), stripeMat('#d9533c', '#fbf6ea', 8), 0, FL + 1.45, RZ + 0.08, 1, 1, 1, inkThin);
    rope.rotation.z = 0.04;
    k.ball(0, FL + 0.48, RZ + 0.09, 0.11, 0.08, 0.11, '#d9533c', 0);
    for (let i = 0; i < 5; i++) k.box(-0.08 + i * 0.04, FL + 0.35, RZ + 0.09, 0.02, 0.2, 0.02, '#d9533c', 0);
    // 새전함: 윗면이 V자 살대, 앞에 글씨
    const bz = Z0 + 1.15;
    k.box(0, 0.42, bz, 1.7, 0.84, 0.72, WOOD, 2);
    for (let i = 0; i < 9; i++) { const sl = k.box(-0.72 + i * 0.18, 0.88, bz, 0.08, 0.06, 0.66, WOOD_D, 0); sl.rotation.x = 0; }
    k.box(0, 0.86, bz, 1.6, 0.02, 0.62, '#5a4030', 0);
    k.paint(0, 0.28, bz + 0.37, 1.1, 0.42, g => drawText(g, '새 전', 0, 0.21, 1.0, 0.36, '#fbf1d8'));
    for (const s of [-1, 1]) k.box(s * 0.86, 0.42, bz, 0.06, 0.86, 0.76, BLACK, 0);
    k.solidRect(0, zc, W + 1, D + 1);
    k.solidRect(0, bz, 1.8, 0.8);
  }
  function booth(k) {
    // 수여소: 작은 맞배지붕 판매대에 부적이 줄지어, 제비뽑기 육각통
    const x = -4.4, z = -0.6;
    k.box(x, 0.5, z, 1.9, 1.0, 0.9, WOOD, 2);
    k.box(x, 1.03, z, 2.0, 0.06, 1.0, '#e8d6b0', 1);
    for (const s of [-1, 1]) k.box(x + s * 0.9, 1.7, z - 0.35, 0.1, 2.3, 0.1, VERM, 1);
    k.box(x, 1.7, z - 0.48, 1.8, 1.4, 0.06, WHITE, 1);
    for (const s of [-1, 1]) { const r = k.box(x, 2.95, z + s * 0.32 - 0.25, 2.4, 0.12, 0.9, ROOF, 2); r.rotation.x = s * 0.5; }
    k.box(x, 3.18, z - 0.25, 2.5, 0.12, 0.16, ROOF_D, 1);
    k.box(x, 2.45, z + 0.14, 1.3, 0.34, 0.06, '#fff4dc', 1);
    k.paint(x, 2.3, z + 0.18, 1.2, 0.3, g => drawText(g, '부적 · 제비뽑기', 0, 0.15, 1.1, 0.26, BLACK));
    const OM = ['#e86a5a', '#9fd0ea', '#f3d27a', '#a8d8b4', '#c9b6e4', '#f4a9bd'];
    for (let i = 0; i < 6; i++) {
      const ox = x - 0.65 + i * 0.26;
      k.box(ox, 1.16, z + 0.2, 0.15, 0.2, 0.03, OM[i], 1).rotation.x = -0.3;
      k.box(ox, 1.27, z + 0.18, 0.06, 0.03, 0.02, GOLD, 0);
    }
    const kuji = k.cyl(x + 0.62, 1.28, z - 0.15, 0.13, 0.42, '#d9533c', 1); kuji.rotation.y = 0.3;
    k.box(x + 0.62, 1.52, z - 0.15, 0.03, 0.1, 0.03, '#e8d6b0', 0);
    k.solidRect(x, z, 2.0, 1.0);
  }
  function emaRack(k) {
    const x = 4.4, z = -0.6;
    for (const s of [-1, 1]) k.box(x + s * 0.95, 0.9, z, 0.12, 1.8, 0.12, WOOD_D, 1);
    for (const y of [1.05, 1.55]) k.box(x, y, z, 2.0, 0.08, 0.08, WOOD_D, 0);
    k.box(x, 1.95, z, 2.3, 0.1, 0.4, ROOF, 1);
    let n = 0;
    for (const y of [1.05, 1.55]) for (let i = 0; i < 6; i++) {
      const ex = x - 0.75 + i * 0.3 + (y > 1.3 ? 0.08 : 0);
      const e = k.box(ex, y - 0.16, z + 0.06, 0.24, 0.17, 0.025, '#e7c793', 1);
      e.rotation.z = ((n++ % 3) - 1) * 0.07;
      k.box(ex, y - 0.2, z + 0.075, 0.12, 0.012, 0.005, ['#d9533c', '#4f7c9a', '#5f7d4a'][n % 3], 0);
    }
    // 제비 묶는 줄: 흰 종이가 매듭으로 줄지어
    for (const s of [-1, 1]) k.box(x + 1.6 + s * 0.55, 0.7, z + 0.6, 0.08, 1.4, 0.08, WOOD_D, 0);
    for (let i = 0; i < 7; i++) k.box(x + 1.15 + i * 0.15, 1.18, z + 0.6, 0.06, 0.14, 0.04, WHITE, 0);
    k.box(x + 1.6, 1.28, z + 0.6, 1.2, 0.025, 0.025, '#5a4030', 0);
    k.solidRect(x + 0.4, z, 3.0, 0.6);
  }
  function temizuya(k) {
    const x = -3.7, z = 4.3;
    k.box(x, 0.38, z, 1.5, 0.76, 0.75, STONE, 2);
    k.box(x, 0.76, z, 1.3, 0.02, 0.56, '#8fc3d6', 0);
    for (let i = 0; i < 3; i++) { const h = k.cyl(x - 0.4 + i * 0.4, 0.86, z + 0.18, 0.06, 0.1, WOOD, 0); const st = k.box(x - 0.4 + i * 0.4, 0.84, z + 0.42, 0.025, 0.025, 0.44, WOOD, 0); st.rotation.x = 0.15; h.rotation.x = 0; }
    k.box(x + 0.6, 1.0, z - 0.18, 0.08, 0.5, 0.08, '#6f9c5a', 0);                          // 대나무 물대
    const sp = k.box(x + 0.4, 1.22, z - 0.18, 0.5, 0.07, 0.07, '#6f9c5a', 0); sp.rotation.z = -0.25;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(x + sx * 0.9, 1.2, z + sz * 0.6, 0.12, 2.4, 0.12, WOOD_D, 1);
    for (const s of [-1, 1]) { const r = k.box(x, 2.55, z + s * 0.45, 2.4, 0.12, 1.1, ROOF, 2); r.rotation.x = s * 0.45; }
    k.solidRect(x, z, 1.6, 0.9);
  }

  const build = function (k) {
    // 자갈 마당과 돌길
    k.box(0, 0.01, 0.5, 13.5, 0.02, 12.5, '#e2dccd', 0);
    for (let i = 0; i < 9; i++) k.box(((i % 2) - 0.5) * 0.05, 0.035, 6.6 - i * 0.62, 1.7, 0.05, 0.56, i % 2 ? STONE : '#c9c2b4', 0);
    torii(k, 6.4);
    lantern(k, -3.4, 3.3); lantern(k, 3.4, 3.3);
    komainu(k, -2.2, 1.4, -1); komainu(k, 2.2, 1.4, 1);
    hall(k);
    booth(k);
    emaRack(k);
    temizuya(k);
    // 뒤 대나무 울타리
    for (let i = 0; i < 15; i++) k.box(-7 + i, 0.6, -6.4, 0.12, 1.2, 0.12, '#8fb06e', 0);
    for (const y of [0.4, 0.95]) k.box(0, y, -6.4, 14.2, 0.08, 0.08, '#6f8f52', 0);
    for (const x of [-2.05, 2.05]) k.solidCircle(x, 6.4, 0.3);
    for (const x of [-3.4, 3.4]) k.solidCircle(x, 3.3, 0.5);
    for (const x of [-2.2, 2.2]) k.solidCircle(x, 1.4, 0.5);
  };
  if (typeof BUILDERS !== 'undefined') BUILDERS.shrine = build;
}(typeof self !== 'undefined' ? self : this));

// 에마 걸기: 나무패에 소원을 적어 걸이에 건다
(function (root) {
  const VO = root.VillageObjects;
  if (!VO) return;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const x = { id: 'shrine.ema', place: 'shrine', name: '에마에 소원 적어 걸기', cost: 100, hours: [7, 18], gain: { fun: 14 },
    steps: [S('ema_look', 'write', 3, 'pen_write', null, '나무패에 소원을 꾹꾹 적는 중'), S('ema_look', 'hang', 1.5, 'poke_touch', null, '걸이에 살짝 거는 중'), S('ema_look', 'pray', 2, 'pray_bow', null, '이뤄지게 해 주세요')] };
  const i = VO.LIST.findIndex(q => q.id === x.id);
  if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x);
  VO.BY_ID[x.id] = x;
}(typeof self !== 'undefined' ? self : this));
