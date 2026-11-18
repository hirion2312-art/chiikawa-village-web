'use strict';

// 치이카와 심즈 — 레몬 스티커 공장 (2026-11-09 이재헌 지시 4번)
// 작은 GLB 모형(작업 자리 2개, 의자·책상이 캐릭터와 안 맞음)을 걷어 내고 코드 건물로 새로 짓는다
// - 크게: 바닥 26×18, 톱니 지붕과 채광창, 골함석 벽, 말아 올린 셔터 입구, 레몬 간판, 환기 굴뚝
// - 안: 컨베이어로 레몬이 흘러가고, 줄지은 작업대 3줄 × 4자리에서 스티커를 붙인다. 레몬 상자 더미, 휴게 의자·정수기·시계
// - 바깥: 하역장의 레몬 상자, 상자를 매단 작은 크레인
// - 의자 높이 0.45·작업대 0.72·앉은 자리와 작업대 앞 모서리 0.5: 캐릭터 몸에 맞춘 치수 (집 공부 의자·탁자와 같은 비율)
// - 일의 순서(원작 §2.1): 레몬 상자 나르기 → 작업대에서 붙이기 → 휴게실에서 쉬기 → 다시 붙이기
(function (root) {
  const W = 26, D = 18, H = 6.2;
  const DOOR_X = -6.5, DOOR_W = 5.4;
  const SEAT_H = 0.45, DESK_H = 0.72, DESK_D = 1.0, SEAT_GAP = 0.8;   // 짧은 팔이 책상 앞 쟁반에 닿도록 의자를 책상 가까이 (책상 윗면 높이에서 몸은 0.41, 가장자리는 0.45: 닿지 않음)
  const ROWS = [-1.2, 2.6, 6.4];            // 작업대 줄의 z (앉는 쪽은 +z)
  const SEATS_X = [-0.5, 2.5, 5.5, 8.5];
  const BELT_Z = -5.2;
  const CRATES = [[-11.4, -6.6, 1], [-11.4, -4.4, 1], [11.4, -7.4, -1]];   // [x, z, 나르는 사람이 서는 쪽]
  const REST = [[-10.2, 5.4], [-10.2, 3.6], [-10.2, 0.8], [-10.2, -1]];
  const BIN_X = 11.0, BIN_Z = 2.6;          // 레몬 컨테이너 (다 붙인 상자를 붓는 큰 통)

  root.LemonFactory = { boxes: {} };
  if (root.GLB_MAP) delete root.GLB_MAP.lemon;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('lemon');

  /* ---------- 소켓 (장소 기준, 정면 +z) ---------- */
  const so = {};
  let n = 0;
  for (const z of ROWS) for (const x of SEATS_X) { n++; so[`work_sit_${n}`] = [x, z + DESK_D / 2 + SEAT_GAP / 2 + 0.05, SEAT_H, x, z]; }
  CRATES.forEach(([x, z, side], i) => { so[`crate_pick_${i + 1}`] = [x + side * 1.6, z, 0, x, z]; });
  REST.forEach(([x, z], i) => { so[`rest_sit_${i + 1}`] = [x + 0.2, z, SEAT_H, x + 2.2, z]; });
  Object.assign(so, {
    crate_stand: [-9.4, -2.4, 0, -11.4, -4.4],
    dump_stand: [BIN_X - 1.45, BIN_Z, 0, BIN_X, BIN_Z],
    crane_look: [W / 2 + 3.2, 3.5, 0, W / 2 + 6, 0.5],
    door_front: [DOOR_X, D / 2 + 3.2, 0, DOOR_X, D / 2],
    sign_look: [4, D / 2 + 3.4, 0, 4, D / 2],
  });
  root.ASSET_SOCKETS.lemon = so;
  // 크레인·상자는 공장에 진짜로 있다: 상호작용이 같은 물건을 새로 만들지 않게 (세트 규격)
  for (const x of root.VillageObjects.LIST) if (x.place === 'lemon' && /크레인|상자/.test(x.name)) x.sceneKey = 's_none';

  /* ---------- 상호작용: 나르기 → 붙이기 → 쉬기 → 붙이기 ---------- */
  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip, prop, label, fx });
  const VO = root.VillageObjects;
  const st = VO.BY_ID['lemon.sticker'];
  if (st) {
    st.steps = [
      S('crate_pick_*', 'carry', 3, 'carry_pile', null, '레몬 상자를 작업대로 나르는 중'),
      S('work_sit_*', 'work', 16, 'lemon_sticker', null, '레몬 집어 스티커 붙이는 중', 'box.fill'),
      S('dump_stand', 'pour', 2.4, 'box_pour', null, '레몬 컨테이너에 와르르', 'bin.pour'),
      S('work_sit_*', 'work', 14, 'lemon_sticker', null, '새 상자에 또 붙이는 중', 'box.fill'),
      S('dump_stand', 'pour', 2.4, 'box_pour', null, '두 번째 상자도 와르르', 'bin.pour'),
      S('rest_sit_*', 'sit', 5, 'sit_idle', null, '휴게 의자에서 쉬는 중'),
    ];
  }
  VO.LIST.push({ id: 'lemon.sign_look', place: 'lemon', name: '공장 간판 보기', gain: { fun: 2 }, hours: [6, 20], steps: [S('sign_look', 'read', 2, 'board_read', null, '레몬 간판 보는 중')] });
  VO.BY_ID['lemon.sign_look'] = VO.LIST[VO.LIST.length - 1];

  /* ---------- 모델 도구 ---------- */
  let ribTex = null;
  function ribbed() {
    // 골함석 벽: 세로 골 무늬
    if (ribTex) return ribTex;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 8;
    const g = c.getContext('2d');
    for (let x = 0; x < 64; x++) {
      const v = 0.5 + 0.5 * Math.cos((x / 16) * Math.PI * 2);
      g.fillStyle = `rgb(${232 + v * 20},${229 + v * 20},${214 + v * 20})`;
      g.fillRect(x, 0, 1, 8);
    }
    ribTex = new THREE.CanvasTexture(c);
    ribTex.colorSpace = THREE.SRGBColorSpace;
    ribTex.wrapS = ribTex.wrapT = THREE.RepeatWrapping;
    return ribTex;
  }
  function ribMat(len) {
    const t = ribbed().clone();
    t.needsUpdate = true;
    t.repeat.set(len / 1.2, 1);
    return new THREE.MeshToonMaterial({ map: t, gradientMap: toonRampWorld });
  }
  // 레몬: 양끝이 살짝 뾰족한 타원 + 꼭지
  function lemon(k, x, y, z, s = 1, ry = 0) {
    const g = k.sub(x, z, ry, y);
    g.ball(0, 0, 0, 0.2 * s, 0.17 * s, 0.17 * s, '#f6dc4a');
    g.ball(0.2 * s, 0, 0, 0.05 * s, 0.05 * s, 0.05 * s, '#f0cf34', 0);
    g.ball(-0.2 * s, 0, 0, 0.04 * s, 0.04 * s, 0.04 * s, '#9fbf4a', 0);
    return g.group;
  }
  function crate(k, x, z, full = true, ry = 0) {
    const g = k.sub(x, z, ry);
    g.box(0, 0.35, 0, 1.4, 0.7, 1, '#c9a57c', 1);
    for (const y of [0.18, 0.52]) g.box(0, y, 0.51, 1.42, 0.1, 0.03, '#a98a66', 0);
    for (const y of [0.18, 0.52]) g.box(0, y, -0.51, 1.42, 0.1, 0.03, '#a98a66', 0);
    if (full) for (let i = 0; i < 6; i++) lemon(g, -0.45 + (i % 3) * 0.45, 0.72 + (i > 2 ? 0.06 : 0), -0.22 + Math.floor(i / 3) * 0.44, 1, i * 0.7);
    return g.group;
  }

  function binOf(k, api) {
    const bx = BIN_X, bz = BIN_Z;
    k.box(bx, 0.04, bz, 1.2, 0.08, 1.8, '#8a6242', 1);
    for (const [ex, ez, w2, d2] of [[-0.56, 0, 0.08, 1.8], [0.56, 0, 0.08, 1.8], [0, -0.86, 1.2, 0.08], [0, 0.86, 1.2, 0.08]]) {
      k.box(bx + ex, 0.45, bz + ez, w2, 0.9, d2, '#b98a5c', 1);
      for (const y of [0.25, 0.65]) k.box(bx + ex * 1.02, y, bz + ez * 1.02, w2 + 0.02, 0.06, d2 + 0.02, '#8a6242', 0);
    }
    k.box(bx - 0.62, 0.62, bz, 0.02, 0.3, 0.9, '#fff4c2', 0);
    k.paint(bx - 0.635, 0.5, bz, 0.8, 0.26, g => drawText(g, '레몬 컨테이너', 0, 0.13, 0.76, 0.2, '#6b4a1e'), -Math.PI / 2);
    api.dyn('bin', {
      x: bx, y: 0, z: bz,
      clips: {
        // 상자에서 레몬이 차례로 굴러 떨어진다
        pour(o, u) {
          o.data.fall.forEach((g, i) => {
            const t = Math.max(0, Math.min(1, (u - 0.35 - i * 0.07) / 0.3));
            g.visible = t > 0 && t < 1;
            g.position.set(-0.75 + t * 0.6, 1.25 - t * t * 0.6, (i - 2.5) * 0.12);
            g.rotation.z = t * 4;
          });
          if (u > 0.9 && !o.data.counted) { o.data.counted = true; o.data.level = Math.min(o.data.heap.length, o.data.level + 4); o.data.showHeap(); }
        },
      },
      end(o) { o.data.fall.forEach(g => { g.visible = false; }); o.data.counted = false; },
    }, (kk, o) => {
      o.data.heap = [];
      for (let i = 0; i < 40; i++) {
        const r = i < 16 ? 0 : i < 30 ? 1 : 2;
        const g = lemon(kk, -0.38 + (i % 4) * 0.25 + (r % 2) * 0.1, 0.2 + r * 0.13 + (i % 3) * 0.02, -0.66 + Math.floor((i % 16) / 4) * 0.42 + (r % 2) * 0.1, 0.9, i * 0.7);
        o.data.heap.push(g);
      }
      o.data.level = 20;
      o.data.showHeap = () => o.data.heap.forEach((g, i) => { g.visible = i < o.data.level; });
      o.data.showHeap();
      o.data.fall = [];
      for (let i = 0; i < 6; i++) { const g = lemon(kk, 0, 0, 0, 0.42, i); g.visible = false; o.data.fall.push(g); }
    });
    k.solidRect(bx, bz, 1.3, 1.9);
  }

  function lemonDef(p) {
    const X = W / 2, Z = D / 2;
    return {
      area: { x: 0, z: 0, w: W, d: D },
      exterior(k) {
        // 벽 네 면 (골함석) + 밑동 띠 + 모서리 기둥
        const wall = (x, z, len, ry) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.4), ribMat(len));
          m.position.set(x, H / 2, z);
          m.rotation.y = ry;
          m.add(new THREE.Mesh(m.geometry, inkBig));
          m.castShadow = true;
          k.group.add(m);
        };
        wall(0, -Z, W, 0);
        wall(-X, 0, D, Math.PI / 2);
        wall(X, 0, D, Math.PI / 2);
        // 앞벽: 셔터 입구를 비우고 양쪽
        const leftLen = DOOR_X - DOOR_W / 2 + X, rightLen = X - (DOOR_X + DOOR_W / 2);
        wall(-X + leftLen / 2, Z, leftLen, 0);
        wall(X - rightLen / 2, Z, rightLen, 0);
        k.box(DOOR_X, H - 0.7, Z, DOOR_W + 0.2, 1.4, 0.4, '#e9e5d6', 1);
        k.box(0, 0.3, Z + 0.05, W + 0.3, 0.6, 0.5, '#bdb7a6', 1);
        k.box(0, 0.3, -Z - 0.05, W + 0.3, 0.6, 0.5, '#bdb7a6', 1);
        for (const [x, z] of [[-X, -Z], [X, -Z], [-X, Z], [X, Z]]) k.box(x, H / 2, z, 0.6, H + 0.2, 0.6, '#d6d0bf', 1);
        // 말아 올린 셔터: 위에 감긴 통 + 노란 줄무늬 끝
        k.cyl(DOOR_X, H - 1.6, Z + 0.35, 0.42, DOOR_W, '#cfd2cf', 1).rotation.z = Math.PI / 2;
        k.box(DOOR_X, H - 2.1, Z + 0.35, DOOR_W, 0.22, 0.12, '#f2d64b', 0);
        for (const sx of [-1, 1]) k.box(DOOR_X + sx * (DOOR_W / 2 + 0.1), (H - 1.4) / 2, Z + 0.25, 0.22, H - 1.4, 0.3, '#9aa0a4', 1);
        // 톱니 지붕: 남쪽은 비스듬한 지붕, 북쪽은 세운 채광창
        const TEETH = 4, TD = D / TEETH, TH = 2.2;
        for (let i = 0; i < TEETH; i++) {
          const z0 = -Z + i * TD;
          const shape = new THREE.Shape();
          shape.moveTo(0, 0);
          shape.lineTo(TD, 0);
          shape.lineTo(0.15, TH);
          shape.lineTo(0, TH);
          shape.lineTo(0, 0);
          const geo = new THREE.ExtrudeGeometry(shape, { depth: W + 0.6, bevelEnabled: false });
          geo.translate(0, 0, -(W + 0.6) / 2);
          const m = new THREE.Mesh(geo, mat('#b4bbc0'));
          m.rotation.y = -Math.PI / 2;
          m.position.set(0, H, z0);
          m.add(new THREE.Mesh(geo, inkThin));
          k.group.add(m);
          // 채광창: 세운 면에 하늘빛 유리와 창살
          const sky = k.sub(0, z0 + 0.02, Math.PI, H);
          sky.box(0, TH / 2, -0.02, W - 1, TH - 0.4, 0.06, '#bfe0ef', 0);
          for (let x = -W / 2 + 1.5; x < W / 2 - 1; x += 2) sky.box(x, TH / 2, -0.06, 0.1, TH - 0.4, 0.08, '#8f969a', 0);
        }
        k.box(0, H + 0.06, 0, W + 0.8, 0.12, D + 0.8, '#a4abb0', 1);
        // 환기 굴뚝과 갓
        k.cyl(X - 3, H + 3, -Z + 2.5, 0.55, 4.4, '#c7cbc8', 1);
        k.cone(X - 3, H + 5.25, -Z + 2.5, 0.9, 0.6, '#9aa0a4', 1);
        // 레몬 간판: 큰 레몬 모양 판 + 잎 + 글씨
        const sign = k.sub(4, Z + 0.3, 0, H - 2.4);
        sign.ball(0, 1.2, 0, 3.2, 1.4, 0.3, '#f7e15a', 2);
        sign.ball(3.25, 1.2, 0, 0.35, 0.3, 0.2, '#f0cf34');
        sign.ball(-3.25, 1.2, 0, 0.3, 0.26, 0.2, '#f0cf34');
        sign.ball(-2.5, 2.4, 0.05, 0.8, 0.32, 0.1, '#8cc06a');
        sign.paint(0, 0.5, 0.32, 5.6, 1.4, g => {
          g.fillStyle = '#6b4a1e';
          g.font = '800 0.62px "Malgun Gothic", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.save();
          g.scale(1, -1);
          g.fillText('레몬 스티커 공장', 0, -0.7);
          g.restore();
        });
        // 측면 창 (골함석 벽에 가로로 긴 창)
        for (const z of [-4, 2]) {
          const s = k.sub(X + 0.22, z, Math.PI / 2);
          s.win(0, 3.4, 3.2, 1.4, { frame: '#8f969a' });
        }
        for (const x of [4, 9]) {
          const s = k.sub(x, -Z - 0.22, Math.PI);
          s.win(0, 3.4, 3.2, 1.4, { frame: '#8f969a' });
        }
      },
      yard(k) {
        // 하역장: 레몬 상자 더미, 손수레
        crate(k, -X - 2.2, 4, true);
        crate(k, -X - 2.2, 5.3, true, 0.1);
        crate(k, -X - 2.2, 4.6, true, -0.1).position.y = 0.72;
        crate(k, -X - 3.8, 4.8, false, 0.3);
        // 작은 크레인: 기둥 + 팔 + 줄 + 매달린 상자
        const cr = k.sub(X + 6, 0.5, 0);
        cr.box(0, 0.25, 0, 1.6, 0.5, 1.6, '#9aa0a4', 1);
        cr.cyl(0, 3.2, 0, 0.28, 6, '#f2c94c', 1);
        cr.box(-1.8, 6.1, 0, 4.4, 0.36, 0.36, '#f2c94c', 1);
        cr.box(0.9, 6.1, 0, 1.2, 0.6, 0.6, '#7f868a', 1);
        cr.cyl(-3.6, 5, 0, 0.03, 2.1, '#3b3a38', 0);
        cr.box(-3.6, 3.9, 0, 0.3, 0.18, 0.3, '#5f6366', 0);
        crate(cr, -3.6, 0, true).position.y = 3.1;
        // 입구 앞 깔판과 고깔
        k.box(DOOR_X, 0.03, Z + 1.6, DOOR_W, 0.06, 2.4, '#c9c4b4', 0);
        for (const sx of [-1, 1]) {
          k.cone(DOOR_X + sx * (DOOR_W / 2 + 0.9), 0, Z + 1.4, 0.32, 0.8, '#f08a4b', 1);
          k.box(DOOR_X + sx * (DOOR_W / 2 + 0.9), 0.45, Z + 1.4, 0.36, 0.1, 0.36, '#fffdf4', 0);
        }
      },
      interior(k, api) {
        // 바닥: 콘크리트 + 노란 안전선
        k.box(0, -0.01, 0, W - 0.4, 0.06, D - 0.4, '#dcd8cc', 0);
        k.box(0, 0.03, BELT_Z + 1.3, W - 2, 0.02, 0.14, '#f2d64b', 0);
        k.box(DOOR_X, 0.03, Z - 1.6, DOOR_W, 0.02, 0.14, '#f2d64b', 0);
        const wall = { h: 4.8, t: 0.35, color: '#efece0', ink: 1 };
        const x0 = -X + 0.2, x1 = X - 0.2, z0 = -Z + 0.2, z1 = Z - 0.2;
        api.walls([[x0, z1], [x0, z0], [x1, z0], [x1, z1]], wall);
        api.walls([[x0, z1], [DOOR_X - DOOR_W / 2, z1]], wall);
        api.walls([[DOOR_X + DOOR_W / 2, z1], [x1, z1]], wall);
        // 컨베이어: 다리 + 틀 + 롤러 + 벨트, 그 위를 레몬이 흘러간다
        const BL = W - 6;
        k.box(1, 0.95, BELT_Z, BL, 0.16, 1.3, '#8f969a', 1);
        k.box(1, 1.06, BELT_Z, BL - 0.2, 0.06, 1.05, '#4b4f52', 0);
        for (let x = -BL / 2 + 1; x <= BL / 2 + 1; x += 2.4) for (const sz of [-0.55, 0.55]) k.box(x, 0.45, BELT_Z + sz, 0.14, 0.9, 0.14, '#7f868a', 0);
        for (const sx of [-1, 1]) k.cyl(1 + sx * BL / 2, 1.0, BELT_Z, 0.22, 1.3, '#9aa0a4', 1).rotation.x = Math.PI / 2;
        api.dyn('belt', {
          x: 1, y: 1.18, z: BELT_Z,
          idle(o, time) {
            o.data.l.forEach((g, i) => { g.position.x = ((time * 1.2 + i * (BL / o.data.l.length)) % BL) - BL / 2; });
          },
        }, (kk, o) => {
          o.data.l = [];
          for (let i = 0; i < 12; i++) o.data.l.push(lemon(kk, 0, 0, (i % 3 - 1) * 0.25, 1.1, i));
        });
        let seatN = 0;
        // 레몬 컨테이너: 큰 나무 통에 레몬이 수북. 다 붙인 상자를 여기에 붓는다
        binOf(k, api);
        // 줄지은 작업대: 줄마다 긴 책상 + 앉은뱅이 의자 4개, 자리마다 레몬 바구니·스티커 판·다 붙인 바구니
        for (const z of ROWS) {
          k.box(4, DESK_H - 0.05, z, 12.4, 0.1, DESK_D, '#e6d3a8', 1);
          for (const x of [-1.9, 4, 9.9]) for (const sz of [-0.4, 0.4]) k.box(x, (DESK_H - 0.1) / 2, z + sz, 0.12, DESK_H - 0.1, 0.12, '#b39a74', 0);
          for (const x of SEATS_X) {
            const sz = z + DESK_D / 2 + SEAT_GAP / 2 + 0.05;
            k.cyl(x, SEAT_H - 0.04, sz, 0.36, 0.08, '#f2d64b', 1);
            k.cyl(x, (SEAT_H - 0.08) / 2, sz, 0.07, SEAT_H - 0.08, '#8f969a', 0);
            k.cyl(x, 0.02, sz, 0.28, 0.04, '#8f969a', 0);
            // 앉은 아이 앞 책상 위: 왼손 쪽(월드 +x) 붙일 레몬 쟁반, 가운데 스티커 판, 오른손 쪽(월드 -x) 다 붙인 레몬 상자.
            // 자리는 lemon-work.js가 잰 손 위치와 같다 (몸을 ±0.38 돌리고 숙였을 때 두 손 가운데)
            const seatZ = sz;
            const P = (dx, f) => [x + dx, seatZ - f];
            seatN += 1;
            const [tx, tz] = P(0.24, 0.88);
            k.box(tx, DESK_H + 0.012, tz, 0.3, 0.024, 0.26, '#d2ab78', 1);
            for (const [ex, ez, w2, d2] of [[0, -0.12, 0.3, 0.02], [0, 0.12, 0.3, 0.02], [-0.14, 0, 0.02, 0.26], [0.14, 0, 0.02, 0.26]]) k.box(tx + ex, DESK_H + 0.04, tz + ez, w2, 0.04, d2, '#b48a59', 0);
            for (let i = 0; i < 5; i++) lemon(k, tx - 0.08 + (i % 3) * 0.08, DESK_H + 0.07 + (i > 2 ? 0.05 : 0), tz - 0.05 + (i > 2 ? 0.05 : (i % 2) * 0.08), 0.42, i * 0.9);
            const [sx0, sz0] = P(-0.045, 0.91);
            k.box(sx0, DESK_H + 0.006, sz0, 0.17, 0.012, 0.15, '#fffdf4', 1);
            for (let i = 0; i < 6; i++) k.cyl(sx0 - 0.05 + (i % 3) * 0.05, DESK_H + 0.016, sz0 - 0.035 + Math.floor(i / 3) * 0.07, 0.019, 0.006, i === 4 ? '#fffdf4' : '#8fd06a', 0);
            const [bx, bz] = P(-0.31, 0.82);
            const box = api.dyn(`box:work_sit_${seatN}`, {
              x: bx, y: DESK_H, z: bz,
              clips: { fill(o, u) { o.data.count = Math.min(8, Math.floor(u * 9)); o.data.show(o.data.count); } },
              idle(o) { o.root.visible = !o.data.away; o.data.show(o.data.count); },
            }, (kk, o) => {
              kk.box(0, 0.01, 0, 0.36, 0.02, 0.3, '#c9a273', 0);
              for (const [ex, ez, w2, d2] of [[0, -0.14, 0.36, 0.02], [0, 0.14, 0.36, 0.02], [-0.17, 0, 0.02, 0.3], [0.17, 0, 0.02, 0.3]]) kk.box(ex, 0.1, ez, w2, 0.2, d2, '#c9a273', 1);
              kk.paint(0, 0.04, 0.152, 0.26, 0.12, g => drawText(g, 'LEMON', 0, 0.06, 0.24, 0.1, '#a07a3c'));
              o.data.l = []; o.data.st = [];
              for (let i = 0; i < 8; i++) {
                const g = lemon(kk, -0.09 + (i % 2) * 0.18 - (i > 3 ? 0.04 : 0), 0.07 + (i > 3 ? 0.07 : 0), -0.08 + (Math.floor(i / 2) % 2) * 0.16, 0.4, i);
                o.data.st.push(kk.cyl(-0.09 + (i % 2) * 0.18 - (i > 3 ? 0.04 : 0), 0.105 + (i > 3 ? 0.07 : 0), -0.08 + (Math.floor(i / 2) % 2) * 0.16, 0.018, 0.005, '#8fd06a', 0));
                o.data.l.push(g);
              }
              o.data.show = n => { o.data.l.forEach((g, i) => { g.visible = i < n; }); o.data.st.forEach((m, i) => { m.visible = i < n; }); };
              o.data.count = 0; o.data.show(0);
            });
            root.LemonFactory.boxes[`work_sit_${seatN}`] = box;
          }
        }
        // 레몬 상자 더미 (나르기 자리)
        CRATES.forEach(([x, z], i) => {
          crate(k, x, z, true, Math.PI / 2 + i * 0.1);
          if (i < 2) crate(k, x, z, true, Math.PI / 2 - i * 0.1).position.y = 0.72;
        });
        // 휴게: 서쪽 벽을 따라 벤치(좌석 0.45) 두 개와 등받이, 정수기, 시계, 화분
        for (const cz of [4.5, -0.1]) {
          k.box(-10.2, SEAT_H - 0.06, cz, 0.9, 0.12, 3.4, '#c9a57c', 1);
          k.box(-10.75, SEAT_H + 0.45, cz, 0.12, 0.8, 3.4, '#c9a57c', 1);
          for (const z of [cz - 1.4, cz + 1.4]) k.box(-10.2, (SEAT_H - 0.12) / 2, z, 0.8, SEAT_H - 0.12, 0.14, '#a98a66', 0);
        }
        k.box(-11.8, 0.8, 7.6, 0.8, 1.6, 0.8, '#eef3f4', 1);
        k.cyl(-11.8, 1.95, 7.6, 0.3, 0.7, '#a8d8ef', 1);
        const clock = k.sub(-12.5, 2, Math.PI / 2);
        clock.cyl(0, 3.4, 0.06, 0.45, 0.1, '#fffdf8', 1).rotation.x = Math.PI / 2;
        clock.box(0, 3.52, 0.13, 0.05, 0.3, 0.02, '#3b2a26', 0);
        clock.box(0.1, 3.4, 0.13, 0.22, 0.05, 0.02, '#3b2a26', 0);
        k.planter(-11.6, 2, '#fff4e0');
        // 벽 게시판: 오늘 할당량
        const board = k.sub(3, -Z + 0.4, 0);
        board.box(0, 3.2, 0, 3.4, 1.6, 0.08, '#c9a57c', 1);
        board.paint(0, 2.5, 0.06, 3.1, 1.4, g => {
          g.fillStyle = '#fffdf4';
          g.fillRect(-1.5, 0.05, 3, 1.3);
          g.save();
          g.scale(1, -1);
          g.fillStyle = '#6b4a1e';
          g.font = '700 0.32px "Malgun Gothic", sans-serif';
          g.textAlign = 'center';
          g.fillText('오늘의 레몬', 0, -0.95);
          g.fillText('🍋 × 1200', 0, -0.45);
          g.restore();
        });
      },
    };
  }
  BUILDERS.lemon = (k, p) => root.Interiors.mount(k, p, lemonDef(p));
  root.LemonFactory = Object.assign(root.LemonFactory || {}, { lemonDef, W, D });
}(typeof self !== 'undefined' ? self : this));
