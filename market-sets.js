'use strict';

// 치이카와 심즈 — 우마카레와 무차우 마켓 세트 (2026-11-10 이재헌 지시: 카레집, 무챠우 마켓을 새로 짓는다)
// 세트 = 건물 + 고정 에셋 + 행동 동작 + 에셋 동작. 자리(소켓)는 town-sets.js 그대로 두고 건물과 물건, 단계만 새로 놓는다
// 1) 우마카레  2) 무차우 마켓  3) 가게 밖에서도 움직이는 물건(카트)
(function (root) {
  const { grp, lit, text, ease, clamp } = root.PublicSets;
  const { steam, puff, fire, front } = root.ShopSets;
  const VO = root.VillageObjects;
  const AS = root.ASSET_SOCKETS;
  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip: clip || null, prop: prop || null, label, fx });
  const put = x => {
    const i = VO.LIST.findIndex(q => q.id === x.id);
    x.sceneKey = 's_none';
    if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
    return x;
  };
  const sub = (k, x, y, z, ry) => { const g = grp(k.group, x, y, z); g.rotation.y = ry || 0; return makeKit(g, 0, 0, 0); };
  function room(k, api, W, D, doorX, doorW, floor, wall) {
    k.box(0, -0.01, 0, W - 0.4, 0.06, D - 0.4, floor, 0);
    const w = { h: 4.6, t: 0.35, color: wall, ink: 1 };
    const x0 = -W / 2 + 0.2, x1 = W / 2 - 0.2, z0 = -D / 2 + 0.2, z1 = D / 2 - 0.2;
    api.walls([[x0, z1], [x0, z0], [x1, z0], [x1, z1]], w);
    api.walls([[x0, z1], [doorX - doorW / 2, z1]], w);
    api.walls([[doorX + doorW / 2, z1], [x1, z1]], w);
  }
  function shell(k, W, D, H, wall, roof, doorX, doorW) {
    k.box(0, H / 2, 0, W, H, D, wall, 2);
    k.box(0, H + 0.3, 0, W + 0.8, 0.6, D + 0.8, roof, 2);
    k.box(doorX, 1.6, D / 2 + 0.05, doorW, 3.2, 0.1, '#bfe0ef', 1);
    for (const sx of [-1, 1]) k.box(doorX + sx * (doorW / 2 + 0.1), 1.6, D / 2 + 0.1, 0.2, 3.3, 0.2, '#8f969a', 0);
  }
  const rotZ = (m, a) => { m.rotation.z = a; return m; };
  const rotX = (m, a) => { m.rotation.x = a; return m; };

  /* ================= 1) 우마카레 ================= */
  const UW = 18, UD = 14, UZ = UD / 2;
  put({ id: 'umaCurry.curry', place: 'umaCurry', name: '카레 먹기', gain: { hunger: 60, fun: 10 }, cost: 800, hours: [11, 21], group: true,
    steps: [
      S('counter_sit_*', 'talk', 2.4, 'curry_order', null, '"카레 하나요"', 'plate.order'),
      S('counter_sit_*', 'wait', 3.6, 'curry_sniff', null, '카레 냄새를 맡는 중', 'plate.serve'),
      S('counter_sit_*', 'eat', 13, 'curry_spoon', 'spoon', '카레를 떠먹는 중', 'plate.eat'),
      S('counter_sit_*', 'idle', 2, 'hot_fan', null, '매워서 손부채질', 'plate.hot'),
      S('counter_sit_*', 'drink', 3.2, 'milk_gulp', 'cup', '물 한 모금', 'plate.drink'),
      S('counter_sit_*', 'idle', 2, 'belly_pat', null, '잘 먹었습니다', 'plate.keep'),
    ] });
  put({ id: 'umaCurry.challenge', place: 'umaCurry', name: '왕 카레 도전', gain: { hunger: 90, fun: 25, energy: -6 }, cost: 1500, hours: [11, 20],
    steps: [
      S('challenge_sit', 'wait', 2.8, 'challenge_ready', null, '왕 카레가 나왔다!', 'bigplate.serve'),
      S('challenge_sit', 'eat', 12, 'challenge_dig', 'spoon', '산 같은 카레를 파먹는 중', 'bigplate.eat'),
      S('challenge_sit', 'idle', 2.6, 'belly_puff', null, '배가 터질 것 같다', 'bigplate.rest'),
      S('challenge_sit', 'eat', 6, 'challenge_dig', 'spoon', '마지막 한 숟갈까지', 'bigplate.finish'),
      S('challenge_sit', 'idle', 2.8, 'arms_win', null, '다 먹었다!', 'bigplate.win'),
    ] });

  function curryDef() {
    const Z = UZ;
    return {
      area: { x: 0, z: 0, w: UW, d: UD },
      exterior(k) {
        shell(k, UW, UD, 5.4, '#f7e8c8', '#c88e5e', -4, 3.6);
        // 아래 벽돌 띠와 모서리 기둥
        k.box(0, 0.5, Z + 0.06, UW, 1, 0.14, '#c9772e', 1);
        for (let i = 0; i < 9; i++) if (Math.abs(-8 + i * 2 + 4) > 2.2) k.box(-8 + i * 2, 0.5, Z + 0.14, 0.05, 1, 0.02, '#a55a1e', 0);
        for (const x of [-UW / 2 + 0.2, UW / 2 - 0.2]) k.box(x, 2.7, Z + 0.1, 0.5, 5.4, 0.3, '#e0c796', 1);
        // 줄무늬 차양과 문 손잡이
        for (let i = 0; i < 8; i++) rotX(k.box(-6.1 + i * 0.6, 3.5, Z + 0.75, 0.6, 0.08, 1.5, i % 2 ? '#fffaf0' : '#e8894e', i % 2 ? 0 : 1), 0.22);
        k.box(-4, 3.3, Z + 1.45, 4.8, 0.3, 0.06, '#e8894e', 1);
        k.box(-4, 1.6, Z + 0.12, 0.08, 3.1, 0.06, '#8f969a', 0);
        for (const sx of [-0.25, 0.25]) k.box(-4 + sx, 1.5, Z + 0.16, 0.06, 0.5, 0.06, '#e3bb4a', 0);
        text(k, -4, 2.5, Z + 0.12, 2.6, 0.5, ['영업 중'], '#c8463c', 0.3);
        // 창 둘과 꽃 상자
        for (const x of [2, 6]) {
          k.sub(x, Z + 0.06).win(0, 2.3, 2.8, 2.2, { frame: '#a55a1e' });
          k.box(x, 1.05, Z + 0.4, 3, 0.4, 0.5, '#8a5a3c', 1);
          for (let i = 0; i < 6; i++) { k.ball(x - 1.2 + i * 0.48, 1.35, Z + 0.4, 0.22, 0.18, 0.22, '#7fa86a', 0); k.ball(x - 1.2 + i * 0.48, 1.52, Z + 0.45, 0.09, 0.09, 0.09, ['#f3a9bd', '#f2d64b', '#fffaf0'][i % 3], 0); }
        }
        // 간판: 판 위에 카레 접시 모형
        const s = k.sub(2, Z + 0.3, 0, 4.1);
        s.box(0, 0.7, 0, 8, 1.4, 0.22, '#e8894e', 2);
        s.box(0, 0.7, 0.1, 7.6, 1.1, 0.06, '#fff3d6', 0);
        text(s, 0.9, 0.15, 0.14, 5.4, 1.1, ['우마카레'], '#a55a1e', 0.8);
        s.cyl(-2.8, 0.45, 0.3, 0.75, 0.1, '#fffaf0', 1).scale.z = 0.3;
        s.ball(-3.05, 0.75, 0.3, 0.38, 0.34, 0.14, '#fffffa', 0);
        s.ball(-2.55, 0.66, 0.32, 0.42, 0.24, 0.14, '#a55a1e', 0);
        // 처마 등과 굴뚝 (솥에서 올라오는 김)
        for (const x of [-6.6, -1.4]) { k.cyl(x, 2.9, Z + 0.5, 0.02, 0.5, '#3f3d3a', 0); k.ball(x, 2.55, Z + 0.5, 0.2, 0.26, 0.2, '#fff3c4', 1); k.cyl(x, 2.8, Z + 0.5, 0.12, 0.05, '#3f3d3a', 0); }
        k.box(5.5, 6.6, -4, 1, 1.6, 1, '#c9772e', 1);
        k.box(5.5, 7.45, -4, 1.3, 0.14, 1.3, '#8a5a3c', 1);
        for (let i = 0; i < 3; i++) k.ball(5.5 + i * 0.3, 8 + i * 0.6, -4, 0.4 + i * 0.12, 0.34 + i * 0.1, 0.4 + i * 0.12, '#fffdf4', 0);
      },
      yard(k) {
        // 세워 둔 메뉴판 (앞뒤 두 장)
        const m = sub(k, -6.5, 0, Z + 0.95);
        rotX(m.box(0, 0.95, 0.12, 1.5, 1.9, 0.08, '#5a3b33', 1), -0.12);
        rotX(m.box(0, 0.95, -0.12, 1.5, 1.9, 0.08, '#5a3b33', 1), 0.12);
        m.box(0, 1.92, 0, 1.5, 0.08, 0.14, '#8a5a3c', 0);
        text(m, 0, 0.35, 0.19, 1.3, 1.4, ['카레 800', '왕 카레 1500', '30분 완식', '공짜!'], '#fffaf0', 0.2);
        m.ball(-0.45, 1.68, 0.2, 0.1, 0.07, 0.03, '#e8894e', 0);
        // 얼굴 구멍 기념사진 판: 카레 산을 든 그림
        const p = sub(k, 6.2, 0, Z + 1.2);
        p.box(0, 1.35, 0, 2.2, 2.7, 0.12, '#f2c46d', 2);
        p.box(0, 0.08, 0, 2.4, 0.16, 0.7, '#8a5a3c', 1);
        p.ball(0, 1.78, 0.07, 0.44, 0.44, 0.04, '#3f2a22', 0);
        p.ball(0, 1.02, 0.08, 0.86, 0.5, 0.05, '#fffdf4', 0);
        p.ball(0.05, 0.72, 0.1, 0.8, 0.32, 0.05, '#fffaf0', 0);
        p.ball(0.2, 0.86, 0.12, 0.5, 0.26, 0.05, '#a55a1e', 0);
        p.ball(-0.28, 0.98, 0.12, 0.34, 0.3, 0.05, '#fffffa', 0);
        p.cyl(-0.28, 1.36, 0.12, 0.012, 0.3, '#8a5a3c', 0); p.box(-0.18, 1.45, 0.12, 0.2, 0.12, 0.02, '#c8463c', 0);
        for (const sx of [-1, 1]) p.ball(sx * 0.7, 2.2, 0.08, 0.14, 0.14, 0.03, '#fffaf0', 0);
        text(p, 0, 2.25, 0.08, 1.2, 0.36, ['완식 기념'], '#a55a1e', 0.2);
        // 문 옆 화분
        for (const x of [-6.2, -1.8]) { k.cyl(x, 0.3, Z + 0.7, 0.3, 0.6, '#c9772e', 1); k.ball(x, 0.95, Z + 0.7, 0.42, 0.5, 0.42, '#7fa86a', 1); }
      },
      interior(k, api) {
        room(k, api, UW, UD, -4, 3.6, '#e7d6b5', '#fbf1dc');
        // 바닥 타일과 벽 아래 나무 띠
        for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) k.box(-7.65 + i * 1.7, 0.022, -5.95 + j * 1.7, 1.66, 0.012, 1.66, '#d9c49c', 0);
        k.box(0, 0.6, -Z + 0.42, 17, 1.2, 0.06, '#c98e5e', 0);
        k.box(0, 1.22, -Z + 0.44, 17, 0.06, 0.1, '#a5703f', 0);
        k.box(-4, 0.025, 5.9, 2.8, 0.03, 1.2, '#b9544b', 0);
        text(k, -4, 0.045, 6.3, 2.2, 0.6, ['어서 오세요'], '#fffaf0', 0.26).rotation.x = -Math.PI / 2;

        /* --- 카운터와 의자 --- */
        k.box(0, 1.0, -0.6, 12.6, 0.12, 1.5, '#b98a5a', 1);
        k.box(0, 1.065, -0.6, 12.3, 0.012, 1.3, '#caa070', 0);
        k.box(0, 0.48, -0.32, 12.3, 0.94, 0.14, '#8a5a3c', 1);
        for (let i = 0; i < 12; i++) k.box(-5.5 + i, 0.5, -0.24, 0.04, 0.8, 0.02, '#6f4630', 0);
        for (const sx of [-1, 1]) k.box(sx * 6.2, 0.48, -0.75, 0.14, 0.94, 1.1, '#8a5a3c', 1);
        rotZ(k.cyl(0, 0.22, 0.08, 0.03, 12, '#c9c4b6', 0), Math.PI / 2);
        for (const x of [-5.6, -2.8, 0, 2.8, 5.6]) k.box(x, 0.22, -0.08, 0.05, 0.05, 0.3, '#c9c4b6', 0);
        // 접시를 내는 선반(유리)과 주방 쪽 밑선반
        for (const x of [-5.8, -2.9, 0, 2.9, 5.8]) k.cyl(x, 1.19, -1.2, 0.025, 0.26, '#c9c4b6', 0);
        k.box(0, 1.33, -1.2, 12.2, 0.03, 0.34, '#dff0f5', 0);
        for (const v of Object.values(AS.umaCurry)) {
          if (v[2] !== 0.62) continue;
          const x = v[0];
          k.cyl(x, 0.59, 1.2, 0.34, 0.1, '#e8894e', 1);
          k.cyl(x, 0.535, 1.2, 0.355, 0.03, '#c9c4b6', 0);
          k.cyl(x, 0.29, 1.2, 0.05, 0.5, '#8f969a', 0);
          k.cyl(x, 0.24, 1.2, 0.22, 0.025, '#c9c4b6', 0);
          k.cyl(x, 0.035, 1.2, 0.3, 0.05, '#8f969a', 1);
        }
        // 자리 사이: 후쿠진즈케 통, 수저통, 냅킨, 물병
        for (const x of [-3, 0, 3]) {
          k.cyl(x - 0.2, 1.13, -0.98, 0.09, 0.14, '#f4f2ec', 1); k.ball(x - 0.2, 1.2, -0.98, 0.075, 0.03, 0.075, '#c8463c', 0);
          rotZ(k.cyl(x - 0.14, 1.26, -0.98, 0.008, 0.16, '#c9c4b6', 0), -0.5);
          k.cyl(x + 0.05, 1.14, -0.98, 0.07, 0.16, '#3f3d3a', 1);
          for (let j = 0; j < 4; j++) rotZ(k.cyl(x + 0.03 + (j % 2) * 0.04, 1.27, -1 + Math.floor(j / 2) * 0.04, 0.007, 0.16, '#d3d6da', 0), (j - 1.5) * 0.08);
          k.box(x + 0.3, 1.12, -0.98, 0.16, 0.12, 0.12, '#c9c4b6', 1); k.box(x + 0.3, 1.19, -0.98, 0.12, 0.04, 0.02, '#fffdf4', 0);
        }
        for (const x of [-5.7, 5.7]) { k.cyl(x, 1.22, -0.8, 0.13, 0.32, '#cfeaf5', 1); k.cyl(x, 1.4, -0.8, 0.1, 0.05, '#8f969a', 0); k.box(x + 0.16, 1.24, -0.8, 0.04, 0.2, 0.03, '#8f969a', 0); }
        // 카운터 위 등
        for (const x of [-4, 0, 4]) { k.cyl(x, 3.95, -0.3, 0.012, 1.3, '#3f3d3a', 0); k.cone(x, 3.2, -0.3, 0.32, 0.3, '#e8894e', 1); k.ball(x, 3.04, -0.3, 0.1, 0.1, 0.1, '#fff3c4', 0); }

        /* --- 주방 --- */
        k.box(0, 0.5, -5.6, 12.6, 1, 1.4, '#d3d6da', 1);
        k.box(0, 1.02, -5.6, 12.7, 0.05, 1.5, '#eceff0', 0);
        for (let i = 0; i < 6; i++) { k.box(-5.2 + i * 2.1, 0.5, -4.89, 1.9, 0.8, 0.02, '#c3c7ca', 0); k.box(-5.2 + i * 2.1, 0.8, -4.87, 0.5, 0.04, 0.03, '#8f969a', 0); }
        // 화구 둘: 큰 솥(아래 dyn)과 커틀릿 튀김 냄비
        for (const x of [0, -1.9]) { k.cyl(x, 1.07, -5.6, x ? 0.4 : 0.56, 0.05, '#3f3d3a', 1); k.cyl(x, 1.02, -4.93, 0.05, 0.05, '#3f3d3a', 0).rotation.x = Math.PI / 2; }
        k.cyl(-1.9, 1.22, -5.6, 0.36, 0.24, '#55524e', 1); k.cyl(-1.9, 1.32, -5.6, 0.32, 0.03, '#e3bb4a', 0);
        for (let i = 0; i < 3; i++) k.ball(-1.9 + Math.cos(i * 2.1) * 0.14, 1.34, -5.6 + Math.sin(i * 2.1) * 0.14, 0.11, 0.035, 0.07, '#c98a3a', 0);
        k.box(-1.42, 1.24, -5.6, 0.3, 0.03, 0.05, '#3f3d3a', 0);
        // 도마: 당근·감자·양파와 칼
        k.box(2.2, 1.07, -5.4, 0.9, 0.05, 0.56, '#e6c797', 1);
        for (let i = 0; i < 3; i++) rotZ(k.cone(1.95 + i * 0.07, 1.13, -5.5 + i * 0.1, 0.04, 0.26, '#e8894e', 0), Math.PI / 2);
        k.ball(2.4, 1.15, -5.5, 0.09, 0.07, 0.08, '#d9b27a', 0); k.ball(2.55, 1.15, -5.36, 0.08, 0.065, 0.075, '#d9b27a', 0);
        k.ball(2.2, 1.16, -5.24, 0.09, 0.085, 0.09, '#f3e3b0', 0); k.cone(2.2, 1.26, -5.24, 0.02, 0.05, '#c9a24a', 0);
        k.box(2.52, 1.1, -5.2, 0.3, 0.012, 0.07, '#dfe6ea', 0); k.box(2.3, 1.11, -5.2, 0.14, 0.03, 0.04, '#3f3d3a', 0);
        for (let i = 0; i < 5; i++) k.box(1.86 + i * 0.05, 1.105, -5.26, 0.03, 0.02, 0.07, '#e8894e', 0);
        // 접시 더미, 개수대, 양념 통
        for (let i = 0; i < 9; i++) k.cyl(-4.4, 1.07 + i * 0.035, -5.6, 0.34, 0.03, i % 2 ? '#f4efe2' : '#fffaf0', i === 8 ? 1 : 0).scale.z = 0.27;
        k.box(5.5, 1.0, -5.55, 1.1, 0.14, 0.9, '#aeb4b8', 1); k.box(5.5, 1.05, -5.55, 0.94, 0.02, 0.74, '#7f868a', 0);
        k.cyl(5.5, 1.3, -6.05, 0.035, 0.5, '#c9c4b6', 0); k.box(5.5, 1.54, -5.88, 0.05, 0.05, 0.36, '#c9c4b6', 0);
        k.box(6.1, 1.1, -5.1, 0.16, 0.1, 0.1, '#f3d27a', 0); k.cyl(4.75, 1.17, -5.15, 0.05, 0.22, '#8fc586', 0);
        // 냉장고와 재료 자루
        k.box(-7.5, 1.4, -5.75, 1.6, 2.8, 1.5, '#eef1f2', 1);
        k.box(-7.5, 1.75, -4.99, 1.5, 0.03, 0.02, '#aeb4b8', 0);
        for (const y of [1.1, 2.3]) k.box(-6.9, y, -4.97, 0.06, 0.5, 0.05, '#8f969a', 0);
        for (let i = 0; i < 4; i++) k.box(-7.8 + (i % 2) * 0.4, 2.35 - Math.floor(i / 2) * 0.3, -4.98, 0.22, 0.18, 0.012, ['#f2d64b', '#f3a9bd', '#a8c6e0', '#b7d6a5'][i], 0);
        k.ball(7.7, 0.38, -5.9, 0.5, 0.4, 0.42, '#c9a57c', 1); k.ball(7.3, 0.3, -5.1, 0.42, 0.32, 0.38, '#d3b47a', 1);
        for (let i = 0; i < 4; i++) k.ball(7.3 + Math.cos(i * 1.7) * 0.12, 0.6, -5.1 + Math.sin(i * 1.7) * 0.12, 0.1, 0.08, 0.09, '#d9b27a', 0);
        k.box(8, 0.25, -4.2, 0.8, 0.5, 0.8, '#b98a5a', 1);
        for (let i = 0; i < 5; i++) rotX(k.cone(7.8 + (i % 3) * 0.2, 0.56, -4.3 + (i % 2) * 0.2, 0.05, 0.3, '#e8894e', 0), 0.5);
        // 벽: 향신료 선반 두 단, 환풍기 갓, 걸어 둔 국자
        for (const y of [2.1, 2.75]) k.box(-3.9, y, -Z + 0.6, 4.4, 0.06, 0.4, '#8a5a3c', 1);
        const spice = ['#c8463c', '#e3bb4a', '#8a5a3c', '#7fa86a', '#e8894e', '#f3e3b0', '#5a3b33', '#c9772e', '#b7d6a5'];
        for (let i = 0; i < 9; i++) {
          k.cyl(-5.9 + i * 0.5, 2.27, -Z + 0.6, 0.1, 0.26, '#f4f8fa', 1);
          k.cyl(-5.9 + i * 0.5, 2.24, -Z + 0.6, 0.085, 0.18, spice[i], 0);
          k.cyl(-5.9 + i * 0.5, 2.42, -Z + 0.6, 0.105, 0.05, '#8f969a', 0);
        }
        for (let i = 0; i < 4; i++) { k.cyl(-5.6 + i * 1.1, 2.94, -Z + 0.6, 0.2, 0.3, ['#c9c4b6', '#8f969a'][i % 2], 1); k.box(-5.6 + i * 1.1, 3.02, -Z + 0.6, 0.6, 0.04, 0.05, '#55524e', 0); }
        k.box(-0.9, 3.5, -5.9, 3.8, 0.5, 1.5, '#c9cdd0', 1);
        k.box(-0.9, 3.23, -5.9, 3.5, 0.04, 1.3, '#8f969a', 0);
        k.box(-0.9, 4.15, -6.25, 0.8, 0.9, 0.7, '#b7bcc0', 1);
        rotZ(k.cyl(3.4, 2.5, -Z + 0.5, 0.02, 2.6, '#8f969a', 0), Math.PI / 2);
        for (let i = 0; i < 4; i++) { k.cyl(2.5 + i * 0.6, 2.2, -Z + 0.52, 0.015, 0.56, '#c9c4b6', 0); k.ball(2.5 + i * 0.6, 1.9, -Z + 0.54, i === 3 ? 0.14 : 0.1, i === 3 ? 0.14 : 0.06, 0.05, '#c9c4b6', 0); }
        // 벽 메뉴판과 완식자 사진
        const mb = sub(k, -4, 3.2, -Z + 0.42);
        mb.box(0, 0.55, 0, 4.6, 1.1, 0.08, '#5a3b33', 1);
        text(mb, -1.1, 0.05, 0.05, 2.2, 1, ['카레 800', '커틀릿 카레 950'], '#fffaf0', 0.22);
        text(mb, 1.2, 0.05, 0.05, 2.2, 1, ['왕 카레 1500', '물은 셀프'], '#f2d64b', 0.22);
        const hall = sub(k, 5.8, 2.6, -Z + 0.42);
        hall.box(0, 0.95, 0, 3.4, 1.9, 0.06, '#f2c46d', 1);
        text(hall, 0, 1.45, 0.04, 3, 0.4, ['왕 카레 완식'], '#a55a1e', 0.24);
        for (let i = 0; i < 6; i++) {
          const fx = -1.1 + (i % 3) * 1.1, fy = 0.95 - Math.floor(i / 3) * 0.7;
          rotZ(hall.box(fx, fy, 0.04, 0.8, 0.6, 0.02, '#fffdf4', 1), (i % 2 ? 1 : -1) * 0.05);
          hall.box(fx, fy + 0.06, 0.055, 0.66, 0.4, 0.01, ['#a8c6e0', '#f3a9bd', '#b7d6a5'][i % 3], 0);
          hall.ball(fx, fy, 0.065, 0.12, 0.12, 0.01, '#fffaf0', 0);
          hall.cyl(fx, fy + 0.3, 0.06, 0.03, 0.02, '#c8463c', 0).rotation.x = Math.PI / 2;
        }

        /* --- 움직이는 주방 기물: 자리의 접시가 순서대로 부린다 --- */
        const pot = api.dyn('pot', { x: 0, y: 1.09, z: -5.6, obj: 'pot', label: '카레 솥',
          clips: { stir(o) { o.data.cmd = 'stir'; }, scoop(o, u) { o.data.cmd = 'scoop'; o.data.cu = u; } },
          idle(o, time) {
            const d = o.data, cmd = d.cmd; d.cmd = null;
            d.fire.run(time, true);
            d.bub.forEach((b, i) => { const p = (time * 0.6 + i * 0.29) % 1, r = 0.03 + p * 0.07; b.visible = p < 0.85; b.scale.set(r, r * 0.6, r); });
            d.top.position.y = 0.86 + Math.sin(time * 2.2) * 0.006;
            puff(d.puffs, 0, 1.0, 0, time, true);
            const l = d.ladle;
            if (cmd === 'stir') { const a = time * 3.2; l.position.set(Math.sin(a) * 0.3, 0.92, Math.cos(a) * 0.3); l.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25); }
            else if (cmd === 'scoop') { const u = d.cu; l.position.set(0.1, 0.92 + Math.sin(u * Math.PI) * 0.75, ease(clamp(u * 1.4)) * 1.1); l.rotation.set(0, 0, 0); d.drip.visible = u > 0.25 && u < 0.8; }
            else { l.position.set(0.44, 0.98, 0); l.rotation.set(0, 0, -0.5); d.drip.visible = false; }
          },
        }, (kk, o) => {
          kk.cyl(0, 0.45, 0, 0.72, 0.9, '#8f969a', 1);
          kk.cyl(0, 0.88, 0, 0.76, 0.05, '#aeb4b8', 0);
          for (const sx of [-1, 1]) kk.box(sx * 0.82, 0.7, 0, 0.16, 0.06, 0.24, '#55524e', 0);
          o.data.top = kk.cyl(0, 0.86, 0, 0.66, 0.04, '#a55a1e', 0);
          for (let i = 0; i < 5; i++) kk.ball(Math.cos(i * 1.3) * 0.36, 0.875, Math.sin(i * 1.3) * 0.36, 0.08, 0.04, 0.07, ['#e8894e', '#d9b27a', '#8a5a3c'][i % 3], 0);
          o.data.bub = []; for (let i = 0; i < 6; i++) o.data.bub.push(kk.ball(Math.cos(i * 2.4) * 0.3, 0.89, Math.sin(i * 2.4) * 0.3, 0.05, 0.03, 0.05, '#c9772e', 0));
          const l = grp(kk.group); o.data.ladle = l;
          const lk = makeKit(l, 0, 0, 0); lk.cyl(0, 0.36, 0, 0.025, 0.9, '#c9c4b6', 0); lk.ball(0, -0.1, 0, 0.15, 0.09, 0.15, '#c9c4b6', 1); lk.box(0, 0.82, 0, 0.07, 0.08, 0.03, '#5a3b33', 0);
          o.data.drip = lk.ball(0, -0.07, 0, 0.12, 0.06, 0.12, '#a55a1e', 0);
          o.data.fire = fire(grp(kk.group, 0, -0.06, 0), 0.5, 'gas');
          o.data.puffs = steam(kk, 4, 0, 1.0, 0);
        });
        const cooker = api.dyn('cooker', { x: 4, y: 1.05, z: -5.6, label: '밥솥',
          idle(o, time) {
            const d = o.data, u = d.cmd ? d.cu : 0; d.cmd = null;
            d.lid.rotation.x = -Math.sin(clamp(u) * Math.PI) * 1.15;
            d.paddle.position.set(0, 0.5 + Math.sin(clamp((u - 0.25) / 0.5) * Math.PI) * 0.4, 0.05); d.paddle.visible = u > 0.25 && u < 0.8;
            d.lamp.material.color.set(Math.sin(time * 2) > 0 ? '#ff9a52' : '#c9772e');
            puff(d.puffs, 0, 0.6, 0, time, u > 0.15 && u < 0.9);
          },
        }, (kk, o) => {
          kk.cyl(0, 0.26, 0, 0.5, 0.52, '#f4f2ec', 1);
          kk.cyl(0, 0.5, 0, 0.44, 0.04, '#fffffa', 0);
          kk.box(0, 0.2, 0.47, 0.34, 0.2, 0.06, '#55524e', 0);
          o.data.lamp = lit(kk.group, 0.08, 0.05, 0.02, '#ff9a52', 0, 0.22, 0.51);
          const lid = grp(kk.group, 0, 0.52, -0.46); o.data.lid = lid;
          const dk = makeKit(lid, 0, 0, 0); dk.cyl(0, 0.06, 0.46, 0.5, 0.12, '#e3e0d6', 1); dk.box(0, 0.14, 0.46, 0.2, 0.05, 0.1, '#55524e', 0);
          const pd = grp(kk.group); o.data.paddle = pd;
          const pk = makeKit(pd, 0, 0, 0); pk.box(0, 0.12, 0, 0.05, 0.3, 0.02, '#fffdf4', 0); pk.ball(0, -0.06, 0, 0.09, 0.11, 0.02, '#fffdf4', 0); pk.ball(0, -0.06, 0.03, 0.08, 0.08, 0.05, '#fffffa', 0);
          pd.visible = false;
          o.data.puffs = steam(kk, 3, 0, 0.6, 0);
        });

        /* --- 자리마다 카레 접시: 주문 → 밥을 푸고 카레를 붓는다 → 선반에서 미끄러져 온다 → 먹을수록 준다 --- */
        const setCurry = (d, u) => {
          d.rice.scale.set(0.16 * (1 - 0.45 * u), Math.max(0.01, 0.1 * (1 - u)), 0.17 * (1 - 0.45 * u));
          d.roux.scale.set(0.21 * (1 - 0.35 * u), Math.max(0.008, 0.05 * (1 - u * 0.9)), 0.2 * (1 - 0.35 * u));
          d.bits.forEach((b, j) => { b.visible = u < 0.12 + j * 0.14; });
          d.pickle.visible = u < 0.7;
          d.smear.visible = u > 0.45;
        };
        const place = (o, t) => o.data.all.position.set(0, (1 - t) * 0.3, -(1 - t) * 0.95);
        for (const [n, v] of Object.entries(AS.umaCurry)) {
          if (!/^counter_sit/.test(n)) continue;
          const p = front(v, 1.45);
          api.dyn(`plate:${n}`, { x: p.x, y: 1.07, z: p.z, ry: p.ry, obj: 'plate', label: '카레 접시',
            clips: {
              order(o) { o.root.visible = false; pot.data.cmd = 'stir'; },
              serve(o, u, time) {
                const d = o.data;
                if (u < 0.3) { cooker.data.cmd = 1; cooker.data.cu = u / 0.3; } else if (u < 0.65) { pot.data.cmd = 'scoop'; pot.data.cu = (u - 0.3) / 0.35; }
                o.root.visible = u > 0.65; place(o, ease(clamp((u - 0.65) / 0.3)));
                setCurry(d, 0); d.spoon.visible = true; d.glass.visible = true; d.water.scale.y = 0.11;
                puff(d.puffs, 0.05, 0.14, 0, time, u > 0.7);
              },
              eat(o, u, time) { const d = o.data; o.root.visible = true; place(o, 1); setCurry(d, u * 0.92); d.spoon.visible = false; d.glass.visible = true; puff(d.puffs, 0.05, 0.14, 0, time, u < 0.5); },
              hot(o, u, time) { const d = o.data; o.root.visible = true; place(o, 1); setCurry(d, 0.92); d.spoon.visible = true; puff(d.puffs, 0, 0, 0, time, false); },
              drink(o, u, time) { const d = o.data; o.root.visible = true; place(o, 1); setCurry(d, 0.92 + u * 0.08); d.spoon.visible = true; d.glass.visible = u > 0.92; d.water.scale.y = 0.02; puff(d.puffs, 0, 0, 0, time, false); },
              keep(o, u, time) { const d = o.data; o.root.visible = true; place(o, 1); setCurry(d, 1); d.spoon.visible = true; d.glass.visible = true; d.water.scale.y = 0.02; puff(d.puffs, 0, 0, 0, time, false); },
            },
            end(o) { o.root.visible = false; },
          }, (kk, o) => {
            const a = grp(kk.group); o.data.all = a; const ak = makeKit(a, 0, 0, 0);
            ak.cyl(0, 0.015, 0, 0.38, 0.03, '#fffaf0', 1).scale.z = 0.3;
            ak.cyl(0, 0.032, 0, 0.3, 0.006, '#f1e7d2', 0).scale.z = 0.23;
            o.data.rice = ak.ball(-0.13, 0.05, 0, 0.16, 0.1, 0.17, '#fffffa', 0);
            o.data.roux = ak.ball(0.1, 0.045, 0, 0.21, 0.05, 0.2, '#a55a1e', 0);
            o.data.smear = ak.ball(0.05, 0.036, 0.02, 0.2, 0.004, 0.14, '#c98a4a', 0);
            o.data.bits = [];
            for (let i = 0; i < 6; i++) o.data.bits.push(ak.ball(0.1 + Math.cos(i * 1.1) * 0.1, 0.085, Math.sin(i * 1.1) * 0.1, 0.045, 0.035, 0.04, ['#e8894e', '#d9b27a', '#6f4630'][i % 3], 0));
            o.data.pickle = ak.ball(-0.02, 0.06, 0.17, 0.05, 0.022, 0.035, '#c8463c', 0);
            const sp = grp(a, -0.5, 0.012, 0.04); o.data.spoon = sp; sp.rotation.y = 0.2;
            const sk = makeKit(sp, 0, 0, 0); sk.box(0, 0, 0.06, 0.022, 0.012, 0.2, '#d3d6da', 0); sk.ball(0, 0.004, -0.07, 0.035, 0.012, 0.05, '#d3d6da', 0);
            ak.box(-0.5, 0.004, 0.02, 0.16, 0.006, 0.3, '#fffdf4', 0);
            const gl = grp(a, 0.5, 0, -0.14); o.data.glass = gl;
            const gk = makeKit(gl, 0, 0, 0); gk.cyl(0, 0.07, 0, 0.055, 0.14, '#dff0f8', 1); o.data.water = gk.cyl(0, 0.075, 0, 0.045, 0.11, '#a9d6ee', 0);
            o.data.puffs = steam(kk, 2, 0.05, 0.14, 0);
            o.root.visible = false;
          });
        }

        /* --- 왕 카레 도전석 --- */
        k.box(5.6, 0.7, 3, 2.4, 0.1, 1.6, '#b98a5a', 1);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(5.6 + sx * 1, 0.33, 3 + sz * 0.6, 0.14, 0.66, 0.14, '#8a5a3c', 0);
        k.box(5.6, 0.756, 3, 2.1, 0.012, 1.3, '#c8463c', 0);
        for (let i = 0; i < 6; i++) k.box(4.72 + i * 0.35, 0.764, 3, 0.1, 0.004, 1.3, '#fffaf0', 0);
        for (let i = 0; i < 4; i++) k.box(5.6, 0.766, 2.5 + i * 0.34, 2.1, 0.004, 0.1, '#fffaf0', 0);
        k.box(5.6, 0.4, 4.6, 0.84, 0.1, 0.8, '#e8894e', 1);
        for (const sx of [-1, 1]) { for (const sz of [-1, 1]) k.box(5.6 + sx * 0.34, 0.18, 4.6 + sz * 0.32, 0.08, 0.36, 0.08, '#8a5a3c', 0); k.box(5.6 + sx * 0.38, 0.8, 5.02, 0.07, 0.9, 0.07, '#8a5a3c', 0); }
        k.box(5.6, 1.0, 5.02, 0.84, 0.4, 0.06, '#e8894e', 1);
        const bell = api.dyn('bell', { x: 7.7, y: 0, z: 3.2, label: '도전 성공 종',
          clips: { ring(o) { o.data.cmd = 1; } },
          idle(o, time) {
            const d = o.data, on = d.cmd; d.cmd = null;
            d.b.rotation.z = on ? Math.sin(time * 16) * 0.5 : d.b.rotation.z * 0.9;
            d.rope.rotation.z = on ? Math.sin(time * 16 + 1) * 0.3 : d.rope.rotation.z * 0.9;
            if (on && !d.t0) d.t0 = time; if (!on) d.t0 = 0;
            d.conf.forEach((c, i) => { const p = on ? ((time - d.t0) * 0.5 + i * 0.07) % 1 : 1; c.visible = on && p < 0.95; c.position.set(-2.1 + Math.sin(i * 2.3) * 0.9 + Math.sin(time * 3 + i) * 0.1, 3.4 - p * 2.5, -0.2 + Math.cos(i * 1.7) * 0.6); c.rotation.set(time * 4 + i, time * 3, i); });
          },
        }, (kk, o) => {
          kk.cyl(0, 0.04, 0, 0.34, 0.08, '#55524e', 1); kk.cyl(0, 1.2, 0, 0.05, 2.4, '#8a5a3c', 1);
          kk.box(-0.3, 2.36, 0, 0.7, 0.08, 0.08, '#8a5a3c', 1);
          const b = grp(kk.group, -0.55, 2.32, 0); o.data.b = b; const bk = makeKit(b, 0, 0, 0);
          bk.cyl(0, -0.08, 0, 0.012, 0.16, '#3f3d3a', 0); bk.cone(0, -0.36, 0, 0.26, 0.4, '#e3bb4a', 1); bk.cyl(0, -0.56, 0, 0.27, 0.04, '#c9a24a', 0); bk.ball(0, -0.6, 0, 0.06, 0.06, 0.06, '#8a5a3c', 0);
          const r = grp(b, 0, -0.6, 0); o.data.rope = r; const rk = makeKit(r, 0, 0, 0); rk.cyl(0, -0.3, 0, 0.015, 0.6, '#c8463c', 0); rk.ball(0, -0.62, 0, 0.05, 0.07, 0.05, '#c8463c', 0);
          o.data.conf = [];
          for (let i = 0; i < 14; i++) { const c = kk.box(0, 3, 0, 0.09, 0.012, 0.06, ['#f2d64b', '#f3a9bd', '#a8c6e0', '#b7d6a5', '#e86a5a'][i % 5], 0); c.visible = false; o.data.conf.push(c); }
        });
        const setBig = (d, u) => {
          d.rice.forEach((m, j) => { const s = clamp(1 - (u - j * 0.24) / 0.34); m.visible = s > 0.02; m.scale.set(m.userData.r[0] * (0.5 + 0.5 * s), m.userData.r[1] * s, m.userData.r[2] * (0.5 + 0.5 * s)); });
          d.roux.scale.set(0.62 * (1 - 0.5 * u), Math.max(0.01, 0.3 * (1 - u)), 0.62 * (1 - 0.5 * u));
          d.katsu.forEach((m, j) => { m.visible = u < 0.1 + j * 0.13; });
          d.egg.visible = u < 0.5; d.flag.visible = u < 0.06; d.flagOff.visible = u >= 0.06;
          d.smear.visible = u > 0.5;
        };
        api.dyn('bigplate', { x: 5.6, y: 0.77, z: 3, obj: 'plate', label: '왕 카레',
          clips: {
            serve(o, u, time) { const d = o.data, t = ease(clamp((u - 0.2) / 0.4)); d.all.visible = u > 0.2; d.all.position.set(0, (1 - t) * 1.1, -(1 - t) * 1.4); const q = clamp((u - 0.6) / 0.2); d.all.scale.set(1 + Math.sin(q * Math.PI) * 0.06, 1 - Math.sin(q * Math.PI) * 0.1, 1 + Math.sin(q * Math.PI) * 0.06); setBig(d, 0); d.hand.rotation.z = 0; puff(d.puffs, 0, 0.8, 0, time, u > 0.6); },
            eat(o, u, time) { const d = o.data; d.all.visible = true; d.all.position.set(0, 0, 0); d.all.scale.set(1, 1, 1); setBig(d, u * 0.62); d.hand.rotation.z = -u * 3.6; puff(d.puffs, 0, 0.8 - u * 0.3, 0, time, u < 0.6); },
            rest(o, u, time) { const d = o.data; d.all.visible = true; setBig(d, 0.62); d.hand.rotation.z = -3.6 - u * 0.5; puff(d.puffs, 0, 0, 0, time, false); },
            finish(o, u, time) { const d = o.data; d.all.visible = true; setBig(d, 0.62 + u * 0.38); d.hand.rotation.z = -4.1 - u * 1.8; puff(d.puffs, 0, 0, 0, time, false); },
            win(o, u, time) { const d = o.data; d.all.visible = true; setBig(d, 1); d.spoon.visible = true; bell.data.cmd = 1; d.stamp.visible = u > 0.3; puff(d.puffs, 0, 0, 0, time, false); },
          },
          end(o) { const d = o.data; d.all.visible = false; d.all.position.set(0, 0, 0); d.all.scale.set(1, 1, 1); d.hand.rotation.z = 0; d.stamp.visible = false; },
        }, (kk, o) => {
          const d = o.data;
          // 30분 모래시계 대신 탁상 시계: 먹는 동안 바늘이 돈다
          kk.cyl(-0.85, 0.16, -0.5, 0.16, 0.05, '#fffdf4', 1).rotation.x = Math.PI / 2;
          kk.box(-0.85, 0.02, -0.5, 0.24, 0.04, 0.1, '#c8463c', 0);
          const h = grp(kk.group, -0.85, 0.16, -0.47); d.hand = h; makeKit(h, 0, 0, 0).box(0, 0.05, 0, 0.016, 0.1, 0.01, '#c8463c', 0);
          d.stamp = kk.cyl(0.85, 0.01, -0.45, 0.14, 0.012, '#c8463c', 0); d.stamp.visible = false;
          const a = grp(kk.group); d.all = a; const ak = makeKit(a, 0, 0, 0);
          ak.cyl(0, 0.03, 0, 0.95, 0.06, '#fffaf0', 1).scale.z = 0.72;
          ak.cyl(0, 0.062, 0, 0.8, 0.008, '#f1e7d2', 0).scale.z = 0.6;
          d.rice = [[-0.2, 0.06, 0, 0.56, 0.36, 0.5], [-0.2, 0.32, 0, 0.42, 0.3, 0.38], [-0.2, 0.56, 0, 0.28, 0.24, 0.26], [-0.2, 0.74, 0, 0.15, 0.16, 0.14]].map(([x, y, z, rx, ry, rz]) => { const m = ak.ball(x, y, z, rx, ry, rz, '#fffffa', 1); m.userData.r = [rx, ry, rz]; return m; });
          d.roux = ak.ball(0.3, 0.06, 0.02, 0.62, 0.3, 0.62, '#a55a1e', 1);
          d.smear = ak.ball(0.1, 0.066, 0, 0.6, 0.006, 0.42, '#c98a4a', 0);
          d.katsu = []; for (let i = 0; i < 6; i++) { const m = ak.box(0.12 + i * 0.1, 0.36 - i * 0.02, 0.2 - i * 0.02, 0.08, 0.16, 0.34, '#c98a3a', 1); m.rotation.z = -0.5; d.katsu.push(m); }
          d.egg = ak.ball(0.5, 0.3, -0.25, 0.16, 0.08, 0.16, '#fffdf4', 0); ak.ball(0.5, 0.36, -0.25, 0.07, 0.05, 0.07, '#f2b84b', 0).visible = true;
          const f = grp(a, -0.2, 0.86, 0); d.flag = f; const fk = makeKit(f, 0, 0, 0); fk.cyl(0, 0.14, 0, 0.01, 0.34, '#e6c797', 0); fk.box(0.1, 0.24, 0, 0.2, 0.13, 0.01, '#c8463c', 0); fk.ball(0.1, 0.24, 0.008, 0.035, 0.035, 0.004, '#fffaf0', 0);
          const f2 = grp(kk.group, -0.75, 0.01, 0.4); d.flagOff = f2; f2.rotation.z = Math.PI / 2; const fk2 = makeKit(f2, 0, 0, 0); fk2.cyl(0, 0.14, 0, 0.01, 0.34, '#e6c797', 0); fk2.box(0.1, 0.24, 0, 0.2, 0.13, 0.01, '#c8463c', 0); f2.visible = false;
          const sp = grp(a, 0.2, 0.07, 0.62); d.spoon = sp; const sk = makeKit(sp, 0, 0, 0); sk.box(0.08, 0, 0, 0.26, 0.014, 0.026, '#d3d6da', 0); sk.ball(-0.1, 0.005, 0, 0.06, 0.014, 0.045, '#d3d6da', 0); sp.visible = false;
          d.puffs = steam(kk, 3, 0, 0.8, 0);
          a.visible = false;
        });

        /* --- 입구: 기다리는 긴 의자, 우산꽂이, 화분, 물 받는 곳 --- */
        k.box(-8.1, 0.42, 3.2, 0.8, 0.1, 3, '#b98a5a', 1);
        for (const z of [2, 4.4]) k.box(-8.1, 0.2, z, 0.7, 0.4, 0.1, '#8a5a3c', 0);
        k.box(-8.1, 0.5, 2.6, 0.5, 0.05, 0.4, '#a8c6e0', 0); k.box(-8.1, 0.53, 3.9, 0.36, 0.02, 0.5, '#fffdf4', 0);
        k.cyl(-1.6, 0.3, 6.25, 0.24, 0.6, '#55524e', 1);
        rotZ(k.cyl(-1.66, 0.62, 6.25, 0.03, 0.9, '#e86a5a', 0), 0.12); rotZ(k.cyl(-1.52, 0.6, 6.22, 0.03, 0.86, '#a8c6e0', 0), -0.14);
        k.cyl(-6.9, 0.3, 6.1, 0.32, 0.6, '#c9772e', 1); k.ball(-6.9, 1.05, 6.1, 0.46, 0.6, 0.46, '#7fa86a', 1); k.ball(-6.7, 1.5, 6.1, 0.24, 0.3, 0.24, '#8fbf7a', 0);
        k.box(8.05, 0.55, -1.6, 0.9, 1.1, 0.9, '#f4f2ec', 1);
        k.cyl(8.05, 1.45, -1.6, 0.3, 0.7, '#bfe6f7', 1); k.cyl(8.05, 1.83, -1.6, 0.14, 0.08, '#a8c6e0', 0);
        k.box(7.58, 0.8, -1.6, 0.06, 0.1, 0.1, '#e86a5a', 0);
        for (let i = 0; i < 5; i++) k.cyl(8.05, 1.14 + i * 0.03, -1.05, 0.06, 0.05, '#fffdf4', 0);
      },
    };
  }
  BUILDERS.umaCurry = (k, p) => root.Interiors.mount(k, p, curryDef());

  /* ================= 2) 무차우 마켓 ================= */
  const MW = 34, MD = 22, MH = 7, MZ = MD / 2;
  const AISLES = [-9, -3, 3, 9];
  const GOODS = ['#f3a9bd', '#a8c6e0', '#f2d64b', '#b7d6a5', '#e8a96a', '#cbbce6', '#fffaf0', '#e86a5a'];
  const CAT = ['과자', '라면·통조림', '음료', '생활용품'];
  const PAY = 'checkout_stand|checkout_2';
  const SHOP = (name, extra) => [
    S('basket_pick', 'take', 1.4, 'plate_pick', null, '장바구니 집는 중', 'baskets.take'),
    S('shelf_look_*', 'browse', 4.2, 'shelf_pick', 'basket', name, 'shelf.take'),
    ...(extra || []),
    S(PAY, 'pay', 2.8, 'scan_wait', null, '삑, 삑 계산하는 중', 'register.beep'),
    S(PAY, 'pay', 1.6, 'bag_take', null, '봉투 받는 중', 'register.bag'),
  ];
  put({ id: 'mucha.shop', place: 'mucha', name: '장 봐서 간식 먹기', gain: { hunger: 30, fun: 12 }, cost: 400, hours: [8, 22],
    steps: [...SHOP('과자 고르는 중'), S('eat_bench_*', 'eat', 6, 'eat_bite', 'snack', '가게 앞 벤치에서 먹는 중')] });
  put({ id: 'mucha.groceries', place: 'mucha', name: '집밥 재료 사기', gain: { fun: 4 }, cost: 300, hours: [8, 22], groceries: true,
    steps: [...SHOP('채소·두부 고르는 중', [S('deli_look', 'browse', 3, 'fridge_pick', 'basket', '반찬 코너에서 고르는 중', 'deli.take')])] });
  put({ id: 'mucha.bento', place: 'mucha', name: '도시락 사 먹기', gain: { hunger: 45, fun: 6 }, cost: 250, hours: [8, 21],
    steps: [
      S('deli_look', 'browse', 3, 'fridge_pick', null, '도시락 고르는 중', 'deli.take'),
      S(PAY, 'pay', 2.2, 'scan_wait', null, '계산하는 중', 'register.beep'),
      S(PAY, 'wait', 3, 'micro_wait', null, '전자레인지 기다리는 중', 'register.heat'),
      S('eat_bench_*', 'eat', 10, 'eat_bowl', 'bowl', '따뜻한 도시락 먹는 중'),
    ] });
  put({ id: 'mucha.cart_push', place: 'mucha', name: '카트 밀어 보기', gain: { fun: 7 }, hours: [8, 22],
    steps: [S('cart_stand', 'carry', 3, 'cart_pull', null, '카트 빼는 중', 'carts.pull'), S('parking_stand', 'carry', 4, 'cart_push', null, '주차장에서 카트 밀기', 'carts.ride')] });
  put({ id: 'mucha.liquor', place: 'mucha', name: '술 사기', gain: { fun: 6 }, cost: 900, hours: [10, 22], needSake: true,
    steps: [
      S('liquor_look', 'browse', 3.4, 'liquor_pick', null, '어떤 술로 할까', 'liquor.take'),
      S(PAY, 'pay', 2.6, 'scan_wait', 'bottle', '자격증을 보여 주며 계산', 'register.beep'),
      S(PAY, 'pay', 1.4, 'bag_take', 'bottle', '술병 받는 중', 'register.bag'),
    ] });

  // 진열대 한 줄: 틀, 선반 3단, 가격표 띠, 끝 매대
  function gondola(kk, len, seed) {
    kk.box(0, 0.08, 0, 1.2, 0.16, len + 0.2, '#b7bcc0', 1);
    kk.box(0, 1.2, 0, 0.1, 2.2, len, '#e9e7e1', 1);
    kk.box(0, 2.34, 0, 1.1, 0.08, len + 0.1, '#7fa86a', 1);
    for (const y of [0.3, 0.95, 1.6]) {
      kk.box(0, y, 0, 1.1, 0.05, len + 0.1, '#d3d6da', 0);
      for (const sx of [-1, 1]) kk.box(sx * 0.56, y - 0.03, 0, 0.02, 0.1, len, '#fffdf4', 0);
      const n = Math.floor(len / 0.44);
      for (let i = 0; i < n; i++) {
        const z = -len / 2 + 0.3 + i * 0.44, c = GOODS[(i * 3 + seed * 2 + Math.round(y * 3)) % 8], t = (i + seed + Math.round(y * 2)) % 4;
        for (const sx of [-1, 1]) {
          const x = sx * 0.3;
          if (Math.abs(y - 0.95) < 0.01 && Math.abs(z - sx * -1.2) < 0.3) continue; // 손이 닿는 칸은 움직이는 물건 자리
          if (t === 0) { kk.cyl(x, y + 0.2, z, 0.1, 0.34, c, 0); kk.cyl(x, y + 0.39, z, 0.05, 0.06, '#fffdf4', 0); }
          else if (t === 1) { kk.box(x, y + 0.18, z, 0.3, 0.3, 0.32, c, 0); kk.box(x + sx * 0.155, y + 0.18, z, 0.01, 0.14, 0.2, '#fffdf4', 0); }
          else if (t === 2) { kk.ball(x, y + 0.17, z, 0.15, 0.15, 0.17, c, 0); kk.box(x, y + 0.31, z, 0.2, 0.03, 0.03, c, 0); }
          else { kk.cyl(x, y + 0.11, z, 0.13, 0.16, '#c9c4b6', 0); kk.cyl(x, y + 0.11, z, 0.132, 0.1, c, 0); }
        }
      }
    }
    // 끝 매대: 앞쪽은 할인 상자 더미
    kk.box(0, 0.5, len / 2 + 0.5, 1.2, 1, 0.8, '#f2d64b', 1);
    for (let i = 0; i < 6; i++) kk.box(-0.36 + (i % 3) * 0.36, 1.14 + Math.floor(i / 3) * 0.26, len / 2 + 0.5, 0.32, 0.24, 0.5, GOODS[(i + seed) % 8], 1);
    kk.box(0, 0.5, len / 2 + 0.91, 0.8, 0.4, 0.02, '#e86a5a', 0);
  }
  // 카트 한 대
  function cartModel(kk) {
    kk.box(0, 0.62, 0, 0.7, 0.04, 1.0, '#c7cbc8', 0);
    for (const sx of [-1, 1]) { kk.box(sx * 0.35, 0.86, 0, 0.03, 0.5, 1.0, '#c7cbc8', 1); for (let i = 0; i < 5; i++) kk.box(sx * 0.36, 0.86, -0.4 + i * 0.2, 0.02, 0.5, 0.02, '#9aa0a4', 0); }
    for (const sz of [-1, 1]) kk.box(0, 0.86, sz * 0.5, 0.7, 0.5, 0.03, '#c7cbc8', 1);
    kk.box(0, 0.3, 0, 0.6, 0.04, 0.9, '#9aa0a4', 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { kk.box(sx * 0.3, 0.4, sz * 0.42, 0.04, 0.46, 0.04, '#9aa0a4', 0); kk.cyl(sx * 0.3, 0.1, sz * 0.42, 0.1, 0.06, '#3f3d3a', 0).rotation.z = Math.PI / 2; }
    kk.box(0, 1.2, -0.62, 0.74, 0.06, 0.06, '#e86a5a', 1);
    for (const sx of [-1, 1]) rotX(kk.box(sx * 0.35, 1.14, -0.56, 0.03, 0.03, 0.2, '#9aa0a4', 0), -0.5);
    kk.box(0, 0.98, -0.44, 0.5, 0.2, 0.02, '#7fa86a', 0);
  }
  const CART = { moving: null, parent: null, home: [11.5, MZ + 4], dir: [1, 0], t: 0 };

  function muchaDef() {
    const X = MW / 2, Z = MZ;
    return {
      area: { x: 0, z: 0, w: MW, d: MD },
      exterior(k) {
        shell(k, MW, MD, MH, '#fff8ea', '#e8e2d2', 0, 6);
        k.box(0, 0.4, Z + 0.06, MW, 0.8, 0.14, '#b7d6a5', 1);
        k.box(0, MH - 0.6, Z + 0.15, MW, 0.8, 0.2, '#7fa86a', 1);
        // 입구 차양과 기둥
        k.box(0, 3.7, Z + 1.3, 8, 0.2, 2.6, '#7fa86a', 1);
        for (const sx of [-1, 1]) k.cyl(sx * 3.7, 1.8, Z + 2.4, 0.1, 3.6, '#9aa0a4', 1);
        for (let i = 0; i < 10; i++) k.box(-3.6 + i * 0.8, 3.5, Z + 2.58, 0.8, 0.3, 0.04, i % 2 ? '#fffdf4' : '#b5d97f', 0);
        // 큰 간판과 장바구니 모형
        const s = k.sub(0, Z + 0.35, 0, MH + 0.1);
        s.box(0, 0.9, 0, 14, 1.8, 0.3, '#b5d97f', 2);
        s.box(0, 0.9, 0.16, 13.4, 1.4, 0.04, '#fffdf4', 0);
        text(s, 0.8, 0.25, 0.2, 10, 1.3, ['무차우마켓'], '#55803f', 0.95);
        s.box(-5.4, 0.8, 0.26, 1.2, 0.8, 0.1, '#e86a5a', 1);
        for (let i = 0; i < 3; i++) s.ball(-5.75 + i * 0.35, 1.3, 0.26, 0.2, 0.2, 0.08, ['#f2d64b', '#8fbf7a', '#e8894e'][i], 0);
        s.box(-5.4, 1.5, 0.26, 0.9, 0.05, 0.04, '#3f3d3a', 0);
        // 창과 창에 붙인 할인 전단
        for (const x of [-12, -6.5, 6.5, 12]) {
          k.sub(x, Z + 0.06).win(0, 2.2, 3.6, 2.4, { frame: '#7fa86a' });
          k.box(x - 0.9, 2.6, Z + 0.12, 1, 0.7, 0.02, ['#f2d64b', '#f3a9bd'][Math.abs(x) % 2 | 0], 0);
          text(k, x - 0.9, 2.3, Z + 0.14, 0.9, 0.6, ['특가'], '#c8463c', 0.3);
        }
        // 지붕 위 실외기
        for (const x of [-8, 9]) { k.box(x, MH + 1, -3, 2.4, 1, 1.4, '#c7cbc8', 1); k.cyl(x, MH + 1, -2.28, 0.4, 0.04, '#8f969a', 0).rotation.x = Math.PI / 2; }
      },
      yard(k) {
        // 카트 보관대: 난간 사이에 포개진 카트 (맨 앞 한 대가 빠져나온다)
        const cz = Z + 4;
        for (const sz of [-0.62, 0.62]) { rotZ(k.cyl(13, 0.9, cz + sz, 0.04, 4, '#7fa86a', 1), Math.PI / 2); for (const x of [11.1, 13, 14.9]) k.cyl(x, 0.45, cz + sz, 0.04, 0.9, '#7fa86a', 0); }
        k.box(13, 2.3, cz, 4.2, 0.08, 1.7, '#dff0d0', 1);
        for (const x of [11.1, 14.9]) for (const sz of [-0.8, 0.8]) k.cyl(x, 1.15, cz + sz, 0.04, 2.3, '#9aa0a4', 0);
        text(k, 13, 2.36, cz + 0.87, 3, 0.4, ['카트 보관대'], '#55803f', 0.24);
        for (let i = 0; i < 3; i++) { const c = sub(k, 12.6 + i * 0.55, 0, cz, Math.PI / 2); cartModel(c); }
        const mv = grp(k.group, CART.home[0], 0, CART.home[1]); mv.rotation.y = Math.PI / 2; cartModel(makeKit(mv, 0, 0, 0));
        CART.moving = mv; CART.parent = k.group;
        // 주차장: 칸 선, 바퀴 막이, 주차 표지
        for (let i = 0; i < 5; i++) k.box(9 + i * 3, 0.02, Z + 10, 0.12, 0.02, 4.4, '#fffdf4', 0);
        for (let i = 0; i < 4; i++) k.box(10.5 + i * 3, 0.1, Z + 12, 1.6, 0.2, 0.3, '#c9c4b6', 1);
        k.cyl(8.2, 1.3, Z + 12.4, 0.05, 2.6, '#9aa0a4', 0); k.box(8.2, 2.3, Z + 12.4, 0.8, 0.8, 0.05, '#4f7fc0', 1);
        text(k, 8.2, 2, Z + 12.44, 0.7, 0.6, ['P'], '#fffdf4', 0.5);
        // 가게 앞 벤치 (등받이) 와 쓰레기통
        k.box(-13.2, 0.4, Z + 3, 3.4, 0.1, 0.9, '#c9a57c', 1);
        for (let i = 0; i < 3; i++) k.box(-13.2, 0.46, Z + 2.7 + i * 0.3, 3.3, 0.02, 0.22, '#d9b88c', 0);
        k.box(-13.2, 0.9, Z + 2.5, 3.4, 0.5, 0.08, '#c9a57c', 1);
        for (const x of [-14.7, -11.7]) { k.box(x, 0.2, Z + 3, 0.12, 0.4, 0.8, '#8f969a', 0); k.box(x, 0.7, Z + 2.5, 0.1, 0.9, 0.1, '#8f969a', 0); }
        k.cyl(-10.6, 0.45, Z + 2.6, 0.32, 0.9, '#7fa86a', 1); k.cyl(-10.6, 0.92, Z + 2.6, 0.34, 0.06, '#55803f', 0);
        // 전단 게시판
        const fb = sub(k, -6, 0, Z + 0.28);
        fb.box(0, 1.6, 0, 2.4, 1.7, 0.08, '#a98a66', 1);
        fb.box(0, 1.6, 0.045, 2.2, 1.5, 0.01, '#d9c9a8', 0);
        [['#fffdf4', -0.6, 1.9], ['#f2d64b', 0.5, 1.95], ['#f3a9bd', -0.5, 1.2], ['#b7d6a5', 0.55, 1.25]].forEach(([c, x, y], i) => { rotZ(fb.box(x, y, 0.06, 0.9, 0.6, 0.01, c, 0), (i % 2 ? 1 : -1) * 0.04); fb.cyl(x, y + 0.24, 0.07, 0.03, 0.02, '#e86a5a', 0).rotation.x = Math.PI / 2; });
        text(fb, -0.6, 1.66, 0.07, 0.86, 0.5, ['오늘 큰 할인'], '#e86a5a', 0.14);
        text(fb, 0.5, 1.7, 0.07, 0.86, 0.5, ['도시락 250'], '#55803f', 0.15);
        // 할인 깃발과 문 앞 특가 수레
        for (const x of [-15, -9, 15]) { k.cyl(x, 0.1, Z + 2, 0.24, 0.2, '#8f969a', 1); k.cyl(x, 2, Z + 2, 0.05, 4, '#9aa0a4', 0); k.box(x + 0.42, 2.9, Z + 2, 0.8, 2, 0.03, ['#e86a5a', '#f2d64b', '#7fa86a'][(x + 15) / 6 % 3 | 0], 1); }
        const w = sub(k, 5.6, 0, Z + 1.4);
        w.box(0, 0.7, 0, 2.6, 0.5, 1.1, '#c9a57c', 1);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { w.box(sx * 1.15, 0.24, sz * 0.4, 0.08, 0.48, 0.08, '#8a5a3c', 0); w.cyl(sx * 1.15, 0.1, sz * 0.4, 0.1, 0.06, '#3f3d3a', 0).rotation.z = Math.PI / 2; }
        for (let i = 0; i < 14; i++) w.ball(-1.05 + (i % 7) * 0.35, 1.0 + Math.floor(i / 7) * 0.14, -0.2 + (i % 2) * 0.4, 0.17, 0.15, 0.17, ['#e8894e', '#f2d64b', '#e86a5a'][i % 3], 0);
        w.box(0, 1.6, -0.5, 1.2, 0.5, 0.04, '#fffdf4', 1); for (const sx of [-0.5, 0.5]) w.cyl(sx, 1.2, -0.5, 0.02, 0.6, '#8a5a3c', 0);
        text(w, 0, 1.38, -0.47, 1.1, 0.44, ['귤 한 봉지 100'], '#c8463c', 0.14);
      },
      interior(k, api) {
        room(k, api, MW, MD, 0, 6, '#ecebe4', '#fbf8ef');
        // 바닥 줄눈, 통로 안내선, 입구 매트, 벽 아래 초록 띠
        for (let i = 1; i < 11; i++) k.box(-X + i * 3.09, 0.022, 0, 0.04, 0.01, MD - 0.8, '#dcdad0', 0);
        for (let j = 1; j < 7; j++) k.box(0, 0.022, -Z + j * 3.14, MW - 0.8, 0.01, 0.04, '#dcdad0', 0);
        k.box(0, 0.024, 7.6, 22, 0.012, 0.16, '#b5d97f', 0);
        k.box(0, 0.026, 10, 5.4, 0.03, 1.4, '#55803f', 0);
        for (const [x, z, w, d] of [[0, -Z + 0.42, MW - 1, 0.05], [-X + 0.42, 0, 0.05, MD - 1], [X - 0.42, 0, 0.05, MD - 1]]) k.box(x, 0.3, z, w, 0.6, d, '#b7d6a5', 0);
        // 천장 등과 통로 안내판
        for (const x of [-12, -4, 4, 12]) for (const z of [-6, 0, 6]) { k.box(x, 4.45, z, 3.4, 0.08, 0.5, '#fffbe8', 0); k.box(x, 4.52, z, 3.6, 0.06, 0.7, '#c7cbc8', 0); }
        AISLES.forEach((x, i) => {
          for (const sx of [-0.9, 0.9]) k.cyl(x + sx, 4.0, -2.2, 0.01, 0.9, '#9aa0a4', 0);
          k.box(x, 3.4, -2.2, 2.2, 0.6, 0.06, '#7fa86a', 1);
          text(k, x, 3.14, -2.16, 2, 0.5, [CAT[i]], '#fffdf4', 0.26);
          text(k, x, 3.14, -2.24, 2, 0.5, [CAT[i]], '#fffdf4', 0.26, Math.PI);
        });

        /* --- 진열대 네 줄: 손 닿는 칸의 물건은 집으면 빠지고 뒤의 것이 앞으로 온다 --- */
        AISLES.forEach((x, i) => {
          gondola(sub(k, x, 0, -2.2), 7, i);
          for (const [slot, z] of [[i * 2 + 1, 1.2], [i * 2 + 2, -1.2]]) {
            const sx = slot % 2 ? -1 : 1;
            api.dyn(`shelf:shelf_look_${slot}`, { x, y: 0.975, z: -2.2 + z, obj: 'shelf', label: '진열 상품',
              clips: { take(o, u) {
                const d = o.data, a = ease(clamp(u / 0.25));
                d.item.visible = u < 0.3; d.item.position.set(sx * (0.36 + a * 0.3), 0.18 + a * 0.12, 0);
                d.next.position.x = sx * (0.14 + ease(clamp((u - 0.5) / 0.3)) * 0.22);
                d.tag.rotation.x = Math.sin(clamp(u / 0.3) * Math.PI) * 0.6;
              } },
              end(o) { const d = o.data; d.item.visible = true; d.item.position.set(sx * 0.36, 0.18, 0); d.next.position.x = sx * 0.14; d.tag.rotation.x = 0; },
            }, (kk, o) => {
              const c = GOODS[slot % 8];
              o.data.item = kk.box(sx * 0.36, 0.18, 0, 0.2, 0.32, 0.3, c, 1);
              o.data.next = kk.box(sx * 0.14, 0.18, 0, 0.2, 0.32, 0.3, c, 0);
              const t = grp(kk.group, sx * 0.57, 0.0, 0); o.data.tag = t; makeKit(t, 0, 0, 0).box(0, -0.06, 0, 0.012, 0.12, 0.22, '#f2d64b', 0);
            });
          }
        });

        /* --- 왼쪽 벽: 채소·과일 매대 --- */
        const pv = sub(k, -X + 1.2, 0, -3);
        pv.box(0, 0.4, 0, 1.4, 0.8, 9, '#c9a57c', 1);
        rotZ(pv.box(0.1, 0.95, 0, 1.4, 0.06, 9, '#8a5a3c', 0), -0.2);
        const veg = [['#e8894e', 0], ['#8fbf7a', 1], ['#e86a5a', 0], ['#f2d64b', 0], ['#7fa86a', 1], ['#d9b27a', 0], ['#cbbce6', 0], ['#fffdf4', 2]];
        veg.forEach(([c, t], i) => {
          const z = -3.9 + i * 1.12;
          pv.box(0.74, 1.0, z, 0.04, 0.2, 1.04, '#8a5a3c', 0); pv.box(0, 1.0, z + 0.54, 1.4, 0.24, 0.04, '#8a5a3c', 0);
          for (let j = 0; j < 9; j++) {
            const x = -0.4 + (j % 3) * 0.4, zz = z - 0.3 + Math.floor(j / 3) * 0.3, y = 1.14 - (j % 3) * 0.08;
            if (t === 1) { pv.ball(x, y, zz, 0.17, 0.14, 0.15, c, 0); pv.ball(x, y + 0.08, zz, 0.1, 0.08, 0.1, '#b7d6a5', 0); }
            else if (t === 2) pv.box(x, y, zz, 0.3, 0.14, 0.22, c, 1);
            else pv.ball(x, y, zz, 0.14, 0.13, 0.14, c, 0);
          }
          pv.box(0.76, 0.6, z, 0.02, 0.24, 0.5, '#fffdf4', 0);
        });
        k.box(-X + 0.44, 3.2, -3, 0.06, 0.8, 6, '#7fa86a', 1);
        text(k, -X + 0.48, 2.95, -3, 5, 0.6, ['채소 · 과일'], '#fffdf4', 0.34, Math.PI / 2);
        k.box(-X + 1.3, 0.7, 3.4, 0.7, 1.4, 0.7, '#c7cbc8', 1); k.cyl(-X + 1.3, 1.5, 3.4, 0.2, 0.2, '#fffdf4', 0);   // 비닐 봉지 걸이와 저울
        k.box(-X + 1.3, 1.44, 4.3, 0.6, 0.08, 0.6, '#d3d6da', 1); k.box(-X + 1.3, 0.7, 4.3, 0.5, 1.4, 0.5, '#e9e7e1', 1); k.box(-X + 1.1, 1.75, 4.3, 0.06, 0.5, 0.4, '#3f3d3a', 0);

        /* --- 뒷벽: 음료 냉장고(유리문), 반찬·도시락 냉장 진열대 --- */
        for (let i = 0; i < 4; i++) {
          const c = sub(k, -12 + i * 2.6, 0, -Z + 1.0);
          c.box(0, 1.5, 0, 2.5, 3, 1.1, '#dfe6ea', 1);
          c.box(0, 1.5, 0.5, 2.2, 2.6, 0.04, '#cfeaf5', 0);
          c.box(0, 2.92, 0.56, 2.5, 0.2, 0.04, '#4f9fd0', 0);
          c.box(1.0, 1.5, 0.58, 0.05, 0.9, 0.05, '#8f969a', 0);
          for (let j = 0; j < 20; j++) c.cyl(-0.9 + (j % 5) * 0.45, 0.42 + Math.floor(j / 5) * 0.62, 0.34, 0.11, 0.4, GOODS[(j + i * 3) % 8], 0);
          for (let j = 0; j < 4; j++) c.box(0, 0.2 + j * 0.62, 0.3, 2.3, 0.03, 0.5, '#fffdf4', 0);
        }
        text(k, -8.1, 3.2, -Z + 1.6, 4, 0.5, ['시원한 음료'], '#4f9fd0', 0.3);
        k.box(8, 0.45, -9.6, 6.2, 0.9, 1.3, '#dfe6ea', 1);
        k.box(8, 1.7, -10.1, 6.2, 1.7, 0.3, '#dfe6ea', 1);
        k.box(8, 2.6, -9.7, 6.2, 0.14, 1.1, '#7fa86a', 1);
        for (const y of [0.92, 1.5, 2.05]) k.box(8, y, -9.55 - (y - 0.92) * 0.2, 6, 0.04, 1 - (y - 0.92) * 0.3, '#fffdf4', 0);
        for (let i = 0; i < 21; i++) {
          const x = 5.5 + (i % 7) * 0.84, r = Math.floor(i / 7), y = 0.96 + r * 0.57, z = -9.3 - r * 0.2;
          if (i === 10) continue;
          if (r === 0) { k.box(x, y + 0.07, z, 0.66, 0.12, 0.5, '#3f3d3a', 0); k.box(x - 0.14, y + 0.14, z, 0.3, 0.03, 0.4, '#fffffa', 0); k.box(x + 0.18, y + 0.14, z, 0.26, 0.03, 0.4, ['#e8a96a', '#e86a5a', '#b7d6a5'][i % 3], 0); }
          else if (r === 1) { k.box(x, y + 0.08, z, 0.6, 0.14, 0.4, '#f4f8fa', 0); k.ball(x, y + 0.1, z, 0.22, 0.05, 0.14, ['#c98a3a', '#8fbf7a', '#f2d64b'][i % 3], 0); }
          else { k.cyl(x, y + 0.1, z, 0.2, 0.18, '#fffdf4', 0); k.cyl(x, y + 0.2, z, 0.21, 0.03, ['#f3a9bd', '#a8c6e0'][i % 2], 0); }
        }
        text(k, 8, 2.9, -9.2, 4, 0.5, ['반찬 · 도시락'], '#55803f', 0.3);
        api.dyn('deli', { x: 8, y: 1.53, z: -9.5, obj: 'bento', label: '도시락',
          clips: {
            glow(o, u, time) { o.data.l.material.opacity = 0.55 + Math.sin(time * 3) * 0.2; },
            take(o, u, time) { const d = o.data, a = ease(clamp((u - 0.35) / 0.3)); d.l.material.opacity = 0.6 + Math.sin(time * 3) * 0.15; d.box.position.set(0, 0.08 + a * 0.2, a * 0.9); d.box.visible = u < 0.75; },
          },
          end(o) { const d = o.data; d.l.material.opacity = 0.25; d.box.visible = true; d.box.position.set(0, 0.08, 0); },
        }, (kk, o) => {
          o.data.l = lit(kk.group, 5.9, 0.06, 0.1, '#eaf8ff', 0, 1.0, 0.25, 0.25);
          const b = grp(kk.group, 0, 0.08, 0); o.data.box = b; const bk = makeKit(b, 0, 0, 0);
          bk.box(0, 0, 0, 0.62, 0.14, 0.42, '#f4f8fa', 1); bk.box(-0.14, 0.05, 0, 0.26, 0.05, 0.34, '#fffffa', 0); bk.ball(0.14, 0.06, -0.06, 0.12, 0.04, 0.1, '#c98a3a', 0); bk.ball(0.16, 0.06, 0.1, 0.07, 0.04, 0.06, '#f2d64b', 0); bk.ball(-0.14, 0.085, 0, 0.03, 0.02, 0.03, '#c8463c', 0);
        });

        /* --- 오른쪽 벽: 술 진열장(자격증이 있어야 산다)과 아이스크림 냉동고 --- */
        k.box(X - 1.2, 1.4, -2, 0.9, 2.8, 5.2, '#7d5a44', 1);
        for (const y of [0.42, 1.22, 2.02]) k.box(X - 1.3, y, -2, 0.8, 0.06, 5, '#5a3b33', 0);
        for (let i = 0; i < 21; i++) {
          if (i === 10) continue;
          const y = 0.45 + Math.floor(i / 7) * 0.8, z = -4.1 + (i % 7) * 0.7, c = ['#3f7a4a', '#7a3f2a', '#c9a24a', '#dfe6ea'][i % 4];
          k.cyl(X - 1.4, y + 0.22, z, 0.11, 0.44, c, 0); k.cyl(X - 1.4, y + 0.5, z, 0.04, 0.14, c, 0); k.cyl(X - 1.4, y + 0.58, z, 0.045, 0.03, '#e3bb4a', 0);
          k.box(X - 1.52, y + 0.22, z, 0.01, 0.16, 0.14, '#fffdf4', 0);
        }
        k.box(X - 1.5, 3.05, -2, 1.3, 0.5, 4.8, '#3f2a22', 1);
        text(k, X - 2.16, 2.82, -2, 3.6, 0.46, ['술 (자격증 필요)'], '#f2d64b', 0.26, -Math.PI / 2);
        api.dyn('liquor', { x: X - 1.4, y: 1.25, z: -2, obj: 'liquor', label: '술병',
          clips: { take(o, u) { const b = o.data.b, a = ease(clamp((u - 0.3) / 0.3)); b.position.set(-a * 0.6, a * 0.12, 0); b.rotation.z = -Math.sin(clamp((u - 0.45) / 0.4) * Math.PI) * 0.5; b.visible = u < 0.85; } },
          end(o) { const b = o.data.b; b.visible = true; b.position.set(0, 0, 0); b.rotation.z = 0; },
        }, (kk, o) => {
          const b = grp(kk.group); o.data.b = b; const bk = makeKit(b, 0, 0, 0);
          bk.cyl(0, 0.22, 0, 0.12, 0.44, '#3f7a4a', 1); bk.cyl(0, 0.5, 0, 0.045, 0.14, '#3f7a4a', 0); bk.cyl(0, 0.58, 0, 0.05, 0.03, '#e3bb4a', 0); bk.box(-0.125, 0.22, 0, 0.01, 0.2, 0.16, '#fffdf4', 0);
        });
        const fz = sub(k, X - 1.4, 0, 4.6);
        fz.box(0, 0.5, 0, 1.4, 1, 3, '#f4f8fa', 1); fz.box(0, 1.02, 0, 1.3, 0.04, 2.8, '#cfeaf5', 0); fz.box(0, 0.5, 0, 1.42, 0.3, 3.02, '#f3a9bd', 0);
        for (let i = 0; i < 10; i++) fz.box(-0.3 + (i % 2) * 0.6, 0.96, -1.1 + Math.floor(i / 2) * 0.55, 0.4, 0.06, 0.3, GOODS[i % 8], 0);
        text(k, X - 2.12, 0.42, 4.6, 2.4, 0.4, ['아이스크림'], '#fffdf4', 0.24, -Math.PI / 2);

        /* --- 계산대 둘: 컨베이어 위로 물건이 흐르고, 스캐너가 깜박이고, 봉투가 나온다 --- */
        for (const [cx, sock] of [[-11, 'checkout_stand'], [-6.5, 'checkout_2']]) {
          k.box(cx, 0.5, 3.6, 3, 1, 1.2, '#7fa86a', 1);
          k.box(cx, 1.02, 3.6, 3.1, 0.05, 1.3, '#e9e7e1', 0);
          k.box(cx + 0.55, 1.05, 3.6, 1.7, 0.02, 0.9, '#3f3d3a', 0);
          k.box(cx, 0.5, 4.21, 2.8, 0.5, 0.02, '#b5d97f', 0);
          k.cyl(cx - 1.3, 2.0, 3.1, 0.03, 2, '#9aa0a4', 0); k.box(cx - 1.3, 3.1, 3.1, 0.7, 0.5, 0.06, '#fffdf4', 1);
          text(k, cx - 1.3, 2.9, 3.14, 0.6, 0.4, [cx < -8 ? '1' : '2'], '#55803f', 0.34);
          k.box(cx + 1.3, 1.16, 4.05, 0.3, 0.2, 0.3, '#f2d64b', 1);   // 계산대 앞 껌 상자
          api.dyn(`register:${sock}`, { x: cx - 0.8, y: 1.045, z: 3.3, obj: 'register', label: '계산대',
            clips: {
              beep(o, u, time) {
                const d = o.data;
                d.goods.forEach((g, i) => { const p = clamp(u * 1.5 - i * 0.22); g.visible = p > 0 && p < 1; g.position.x = 2.1 - p * 1.6; });
                const hit = d.goods.some(g => g.visible && Math.abs(g.position.x - 1.0) < 0.2);
                d.scan.material.color.set(hit ? '#ff5a4a' : '#7a2a22'); d.screen.material.color.set(hit ? '#c8f5c9' : '#9fe3a0');
                d.drawer.position.z = 0.2 + ease(clamp((u - 0.75) / 0.2)) * 0.3; d.bag.visible = false;
              },
              bag(o, u) { const d = o.data, a = ease(clamp(u / 0.3)); d.goods.forEach(g => { g.visible = false; }); d.bag.visible = u < 0.75; d.bag.position.set(1.0, 0.02 + Math.sin(a * Math.PI) * 0.12, 0.3 + a * 0.35); d.bag.scale.setScalar(0.6 + a * 0.4); d.drawer.position.z = 0.5 - a * 0.3; d.screen.material.color.set('#9fe3a0'); },
              heat(o, u, time) { const d = o.data; d.goods.forEach(g => { g.visible = false; }); d.mwPlate.rotation.y = time * 3; d.mwLamp.material.color.set(u < 0.85 ? '#ffd98a' : '#55524e'); d.mwDoor.rotation.y = u > 0.88 ? -ease(clamp((u - 0.88) / 0.1)) * 1.3 : 0; d.mwFood.visible = u < 0.95; puff(d.puffs, 2.3, 0.5, 0.2, time, u > 0.88); },
            },
            end(o) { const d = o.data; d.goods.forEach(g => { g.visible = false; }); d.bag.visible = false; d.drawer.position.z = 0.2; d.scan.material.color.set('#7a2a22'); d.screen.material.color.set('#3f6f4a'); d.mwLamp.material.color.set('#55524e'); d.mwDoor.rotation.y = 0; d.mwFood.visible = false; puff(d.puffs, 0, 0, 0, 0, false); },
          }, (kk, o) => {
            const d = o.data;
            kk.box(0, 0.2, 0, 0.7, 0.4, 0.56, '#d3d6da', 1);
            d.drawer = kk.box(0, 0.08, 0.2, 0.6, 0.12, 0.4, '#bfc3c5', 0);
            kk.box(0, 0.5, -0.12, 0.04, 0.3, 0.04, '#8f969a', 0);
            d.screen = lit(kk.group, 0.5, 0.3, 0.03, '#3f6f4a', 0, 0.72, -0.1);
            for (let i = 0; i < 9; i++) kk.box(-0.16 + (i % 3) * 0.16, 0.41, -0.02 + Math.floor(i / 3) * 0.12, 0.1, 0.02, 0.08, '#fffdf4', 0);
            kk.box(1.0, 0.03, 0.3, 0.4, 0.05, 0.4, '#55524e', 0);
            d.scan = lit(kk.group, 0.3, 0.012, 0.04, '#7a2a22', 1.0, 0.062, 0.3);
            d.goods = [0, 1, 2].map(i => { const g = i === 1 ? kk.cyl(2, 0.2, 0.3, 0.1, 0.34, GOODS[i + 2], 1) : kk.box(2, 0.17, 0.3, 0.24, 0.3, 0.3, GOODS[i * 3], 1); g.visible = false; return g; });
            const b = grp(kk.group, 1, 0.02, 0.3); d.bag = b; const bk = makeKit(b, 0, 0, 0);
            bk.box(0, 0.24, 0, 0.44, 0.48, 0.28, '#fffdf4', 1); bk.box(0, 0.26, 0.142, 0.24, 0.16, 0.004, '#b5d97f', 0);
            for (const sx of [-1, 1]) bk.box(sx * 0.1, 0.54, 0, 0.03, 0.14, 0.03, '#fffdf4', 0);
            bk.ball(0.08, 0.5, 0, 0.1, 0.06, 0.08, '#8fbf7a', 0); b.visible = false;
            // 계산대 끝 전자레인지 (도시락을 데워 준다)
            const m = grp(kk.group, 2.3, 0, -0.1); const mk = makeKit(m, 0, 0, 0);
            mk.box(0, 0.28, 0, 0.8, 0.5, 0.56, '#f4f2ec', 1); mk.box(0.3, 0.28, 0.285, 0.16, 0.4, 0.01, '#55524e', 0);
            d.mwLamp = lit(m, 0.5, 0.36, 0.01, '#55524e', -0.1, 0.28, 0.27);
            d.mwPlate = mk.cyl(-0.1, 0.1, 0, 0.18, 0.02, '#e8e3d8', 0);
            d.mwFood = mk.box(-0.1, 0.15, 0, 0.26, 0.07, 0.18, '#f4f8fa', 0); d.mwFood.visible = false;
            const dr = grp(m, -0.38, 0.28, 0.29); d.mwDoor = dr; const dk = makeKit(dr, 0, 0, 0); dk.box(0.28, 0, 0, 0.56, 0.42, 0.02, '#cfeaf5', 1); dk.box(0.5, 0, 0.02, 0.03, 0.3, 0.03, '#8f969a', 0);
            d.puffs = steam(kk, 2, 2.3, 0.5, 0.2);
          });
        }

        /* --- 입구: 장바구니 더미(맨 위 것을 집어 간다), 안내 받침, 자동문 옆 화분 --- */
        api.dyn('baskets', { x: 5, y: 0, z: Z - 2.2, obj: 'basket', label: '장바구니',
          clips: { take(o, u) { const t = o.data.top, a = ease(clamp(u / 0.4)); t.position.set(-a * 0.7, 0.62 + a * 0.3, 0); t.visible = u < 0.5; } },
          end(o) { const t = o.data.top; t.visible = true; t.position.set(0, 0.62, 0); },
        }, (kk, o) => {
          kk.box(0, 0.06, 0, 0.9, 0.12, 0.6, '#8f969a', 1);
          const one = (g, y) => { const b = makeKit(g, 0, 0, 0); b.box(0, y, 0, 0.8, 0.3, 0.5, '#e86a5a', 1); b.box(0, y + 0.14, 0, 0.7, 0.03, 0.4, '#b9443a', 0); for (let i = 0; i < 4; i++) b.box(-0.3 + i * 0.2, y, 0.252, 0.03, 0.22, 0.004, '#b9443a', 0); };
          for (let i = 0; i < 4; i++) one(kk.group, 0.26 + i * 0.1);
          const t = grp(kk.group, 0, 0.62, 0); o.data.top = t; one(t, 0.1);
          const tk = makeKit(t, 0, 0, 0); tk.box(0, 0.42, 0, 0.6, 0.03, 0.03, '#3f3d3a', 0); for (const sx of [-1, 1]) tk.box(sx * 0.3, 0.33, 0, 0.03, 0.2, 0.03, '#3f3d3a', 0);
        });
        for (const x of [-4.2, 4.2]) { k.cyl(x, 0.35, Z - 0.9, 0.36, 0.7, '#fffdf4', 1); k.ball(x, 1.2, Z - 0.9, 0.5, 0.7, 0.5, '#7fa86a', 1); }
        k.box(-5.6, 0.6, Z - 2.4, 1.6, 1.2, 0.8, '#f2d64b', 1);
        for (let i = 0; i < 8; i++) k.box(-6.15 + (i % 4) * 0.36, 1.34 + Math.floor(i / 4) * 0.24, Z - 2.4, 0.32, 0.22, 0.6, GOODS[i], 1);
        text(k, -5.6, 0.4, Z - 1.98, 1.4, 0.5, ['오늘의 특가'], '#c8463c', 0.2);
      },
    };
  }
  BUILDERS.mucha = (k, p) => root.Interiors.mount(k, p, muchaDef());

  /* ================= 3) 가게 밖에서도 움직이는 카트 ================= */
  // 보관대의 맨 앞 카트: 손잡이를 잡아 빼고(carts.pull), 미는 사람 앞에서 굴러간다(carts.ride). 끝나면 보관대로 돌아간다
  const base = root.Interiors.update;
  const V = new THREE.Vector3();
  root.Interiors.update = a => {
    base(a);
    const m = CART.moving;
    if (!m) return;
    const c = a.sim.chars.find(q => q.doing && q.doing.kind === 'obj' && q.doing.x.id === 'mucha.cart_push');
    const d = c && c.doing;
    if (!d || (d.step === 0 && d.phase !== 'use')) {
      // 돌아가는 중
      m.position.x += (CART.home[0] - m.position.x) * Math.min(1, a.dt * 3); m.position.z += (CART.home[1] - m.position.z) * Math.min(1, a.dt * 3);
      m.rotation.y += (Math.PI / 2 - m.rotation.y) * Math.min(1, a.dt * 4); m.rotation.z = 0; CART.last = null;
      return;
    }
    V.set(c.x, 0, c.z); CART.parent.worldToLocal(V);
    if (d.step === 0) {
      const u = clamp(1 - d.left / d.x.steps[0].min);
      m.position.set(CART.home[0] - ease(u) * 1.25 + Math.sin(clamp(u * 4) * Math.PI) * 0.06, 0, CART.home[1]);
      m.rotation.set(0, Math.PI / 2, 0); CART.dir = [1, 0];
    } else {
      // 걷는 방향 앞쪽에 둔다. 멈춰 서면 앞뒤로 살짝 밀었다 당긴다
      if (CART.last) { const dx = V.x - CART.last[0], dz = V.z - CART.last[1], l = Math.hypot(dx, dz); if (l > 0.004) { CART.dir = [dx / l, dz / l]; CART.t += l; } }
      CART.last = [V.x, V.z];
      const push = d.phase === 'use' ? 0.95 + Math.sin(a.time * 3.2) * 0.22 : 1.0;
      m.position.set(V.x + CART.dir[0] * push, 0, V.z + CART.dir[1] * push);
      const ry = Math.atan2(CART.dir[0], CART.dir[1]);
      let dr = ry - m.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      m.rotation.y += dr * Math.min(1, a.dt * 8);
      m.rotation.z = Math.sin(a.time * 9) * 0.012;
    }
  };
}(typeof self !== 'undefined' ? self : this));
