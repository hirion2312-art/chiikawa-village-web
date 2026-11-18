'use strict';

// 치이카와 심즈 — 연못을 낚시터로 (2026-11-12 이재헌님: 연못을 낚시터로 재구성)
// 둥글게 돌을 두른 큰 연못, 물가의 부들·연잎, 남쪽에서 물 위로 뻗은 나무 잔교(끝에서 셋이 낚시), 물가 통나무 벤치 둘,
// 잔교 입구의 낚시 가게 매대(낚싯대 걸이·미끼 통·뜰채·양동이·"낚시터" 깃발), 옆에 개미지옥 모래 구덩이와 들여다보는 구멍.
// 낚시: 던지기 → 찌 보며 기다리기(찌가 까딱) → 찌가 쏙! 확 채기 → 감기 → 낚은 물고기를 번쩍 (낚싯줄과 찌가 실제로 보인다)
(function (root) {
  if (root.GLB_MAP) delete root.GLB_MAP.pond;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('pond');

  const CX = -1, CZ = -0.6, RX = 6.6, RZ = 5.2;          // 연못 가운데·반지름
  const DOCK_X = -1, DOCK_Z0 = 1.2, DOCK_Z1 = 7.6, DOCK_H = 0.34, DOCK_W = 2.6;
  const WATER = '#8fc6d8', WATER_D = '#6aa9c2', STONE = '#b9b2a6', WOOD = '#c49a6c', WOOD_D = '#8a6242';
  const live = { rings: [], lines: new Map(), bobs: new Map(), fish: new Map(), group: null };

  const SO = {
    fish_1: [-1.95, 2.25, 0, -1.95, -1.2],
    fish_2: [-0.05, 2.25, 0, -0.05, -1.2],
    fish_3: [-0.1, 4.2, 0, 2.8, 4.2],
    bank_1: [-6.2, 4.4, 0.45, -4.4, 1.6],
    bank_2: [4.6, 4.6, 0.45, 2.6, 1.6],
    pond_look: [-7.6, 1.6, 0, -5, 0],
    hole_peek: [8.0, -3.6, 0, 8.0, -5.4],
    antlion_look: [10.6, 7.0, 0, 10.0, 4.6],
    antlion_edge: [7.9, 4.8, 0, 10.0, 4.6],
    shop_stand: [-4.2, 8.8, 0, -5.8, 8.8],
  };
  SO.fish_sit = SO.fish_1;
  const AS = root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {});
  AS.pond = Object.assign(AS.pond || {}, SO);

  const inPond = (x, z) => ((x - CX) / RX) ** 2 + ((z - CZ) / RZ) ** 2 < 1;

  const build = function (k) {
    live.group = k.group;
    // 물: 가장자리가 울퉁불퉁한 타원판 두 겹(깊은 곳이 진하다)
    const shape = new THREE.Shape();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2, w = 1 + Math.sin(a * 5) * 0.035 + Math.sin(a * 3 + 1) * 0.03;
      const x = Math.cos(a) * RX * w, y = Math.sin(a) * RZ * w;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    const wg = new THREE.ShapeGeometry(shape, 40); wg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wg, new THREE.MeshToonMaterial({ color: WATER })); water.position.set(CX, 0.06, CZ); water.receiveShadow = true; k.group.add(water);
    const deep = new THREE.Mesh(wg, new THREE.MeshToonMaterial({ color: WATER_D })); deep.scale.set(0.6, 1, 0.55); deep.position.set(CX + 0.4, 0.065, CZ - 0.6); k.group.add(deep);
    // 물가 돌 테두리
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2, w = 1.04 + Math.sin(a * 5) * 0.035;
      const x = CX + Math.cos(a) * RX * w, z = CZ + Math.sin(a) * RZ * w;
      if (Math.abs(x - DOCK_X) < DOCK_W / 2 + 0.2 && z > CZ) continue;          // 잔교 자리
      k.ball(x, 0.12, z, 0.42 + (i % 3) * 0.1, 0.2 + (i % 2) * 0.06, 0.36, i % 4 ? STONE : '#a59e92', 1);
    }
    // 연잎·연꽃, 부들, 물풀
    for (const [x, z, r] of [[-4.6, -2.2, 0.5], [-3.8, -3.0, 0.38], [2.8, -3.2, 0.46], [3.6, -2.4, 0.34], [-5.2, 0.6, 0.4], [1.6, 1.0, 0.3]]) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 18, 0.3, Math.PI * 2 - 0.6), new THREE.MeshToonMaterial({ color: '#7fb36a' }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(x, 0.08, z); k.group.add(pad);
    }
    for (const [x, z] of [[-3.8, -3.0], [3.6, -2.4]]) { k.ball(x, 0.2, z, 0.12, 0.1, 0.12, '#f7c6d0', 0); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const pt = k.ball(x + Math.sin(a) * 0.12, 0.2, z + Math.cos(a) * 0.12, 0.08, 0.04, 0.14, '#f4a9bd', 0); pt.rotation.y = a; } }
    for (const [x, z] of [[-7.4, -1.4], [-7.0, -2.4], [-6.4, -3.6], [5.4, -3.4], [6.2, -2.0], [5.8, -0.8]]) {
      for (let i = 0; i < 4; i++) {
        const sx = x + (i % 2) * 0.25 - 0.1, sz = z + ((i / 2) | 0) * 0.25 - 0.1, h = 1.4 + (i % 3) * 0.3;
        const st = k.box(sx, h / 2, sz, 0.04, h, 0.04, '#6f9a58', 0); st.rotation.z = (i - 1.5) * 0.06;
        k.cyl(sx + (i - 1.5) * 0.04, h - 0.25, sz, 0.06, 0.32, '#8a5a34', 0);
        const lf = k.box(sx + 0.08, h * 0.45, sz, 0.08, h * 0.7, 0.02, '#7fb36a', 0); lf.rotation.z = -0.25;
      }
    }
    // 물결: 잔잔하게 퍼지는 고리 셋
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: '#e8f6fb', transparent: true, opacity: 0.5, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.set(CX + [2, -2.6, 0.6][i], 0.075, CZ + [-1.6, -1.0, -3.2][i]); k.group.add(r); live.rings.push(r);
    }
    // 나무 잔교: 기둥이 물에 박히고 판자가 줄지어, 끝에 난간 반쪽
    const len = DOCK_Z1 - DOCK_Z0, zc = (DOCK_Z0 + DOCK_Z1) / 2;
    for (let i = 0; i < 13; i++) k.box(DOCK_X + ((i % 2) - 0.5) * 0.04, DOCK_H - 0.05, DOCK_Z0 + 0.25 + i * (len - 0.5) / 12, DOCK_W, 0.1, 0.44, i % 3 ? WOOD : '#b98a5c', 1);
    for (const s of [-1, 1]) for (let j = 0; j < 4; j++) k.cyl(DOCK_X + s * (DOCK_W / 2 - 0.1), DOCK_H / 2 - 0.15, DOCK_Z0 + 0.2 + j * (len - 0.4) / 3, 0.12, DOCK_H + 0.4, WOOD_D, 1);
    for (const s of [-1, 1]) k.box(DOCK_X + s * (DOCK_W / 2 - 0.05), DOCK_H + 0.03, zc, 0.12, 0.08, len, WOOD_D, 0);
    k.box(DOCK_X + DOCK_W / 2 - 0.06, DOCK_H + 0.55, DOCK_Z1 - 1.6, 0.08, 0.08, 3.0, WOOD_D, 1);
    for (const z of [DOCK_Z1 - 3.0, DOCK_Z1 - 0.2]) k.box(DOCK_X + DOCK_W / 2 - 0.06, DOCK_H + 0.3, z, 0.1, 0.6, 0.1, WOOD_D, 0);
    // 낚시 자리마다 양동이(물고기 한 마리)와 미끼 통
    for (const [x, z] of [[-1.0, 2.6], [-1.0, 3.3], [-0.2, 5.2]]) {
      k.cyl(x, DOCK_H + 0.17, z, 0.17, 0.32, '#7fa9c9', 1);
      k.cyl(x, DOCK_H + 0.32, z, 0.15, 0.01, '#9fd0ea', 0);
      k.place(new THREE.TorusGeometry(0.17, 0.012, 4, 14, Math.PI), mat('#9a9a9a'), x, DOCK_H + 0.33, z, 1, 1, 1, null);
    }
    // 물가 통나무 벤치 둘
    for (const [x, z, ry] of [[-6.2, 4.4, 0.6], [4.6, 4.6, -0.6]]) {
      const lg = k.cyl(x, 0.28, z, 0.28, 1.8, '#9a7350', 1); lg.rotation.z = Math.PI / 2; lg.rotation.y = ry;
      for (const d of [-0.6, 0.6]) k.box(x + Math.cos(ry) * d, 0.12, z - Math.sin(ry) * d, 0.3, 0.24, 0.5, WOOD_D, 0);
    }
    // 낚시 가게 매대: 지붕 달린 나무 매대, 낚싯대 걸이, 미끼 통, 뜰채, "낚시터" 깃발
    const sx = -6.6, sz = 8.8;
    k.box(sx, 0.55, sz, 1.3, 1.1, 2.4, '#b98a5c', 2);
    k.box(sx, 1.13, sz, 1.4, 0.06, 2.5, '#d8b58a', 1);
    for (const dz of [-1.1, 1.1]) for (const dx of [-0.6, 0.6]) k.box(sx + dx, 1.5, sz + dz, 0.1, 3.0, 0.1, WOOD_D, 1);
    const roof = k.box(sx, 3.05, sz, 1.9, 0.12, 3.0, '#5f9ac9', 2); roof.rotation.z = -0.25;
    for (let i = 0; i < 8; i++) k.box(sx + 0.75, 2.85 - (i % 2) * 0.06, sz - 1.3 + i * 0.37, 0.04, 0.3, 0.37, i % 2 ? '#fffaf0' : '#5f9ac9', 0);
    for (let i = 0; i < 5; i++) { const r = k.box(sx - 0.55, 1.6, sz - 0.8 + i * 0.4, 0.03, 2.4, 0.03, ['#c0504f', '#3a3a44', '#c9a24a', '#5f9ac9', '#7fb36a'][i], 0); r.rotation.z = 0.12; k.ball(sx - 0.52, 0.9, sz - 0.8 + i * 0.4, 0.05, 0.05, 0.05, '#9a9a9a', 0); }
    k.box(sx + 0.2, 1.25, sz - 0.6, 0.45, 0.2, 0.45, '#8a6242', 1);
    for (let i = 0; i < 6; i++) k.cyl(sx + 0.1 + (i % 3) * 0.1, 1.36, sz - 0.7 + ((i / 3) | 0) * 0.15, 0.025, 0.03, '#d98a7a', 0);
    k.cyl(sx + 0.2, 1.32, sz + 0.4, 0.14, 0.24, '#e8e2d2', 1);
    k.paint(sx + 0.66, 0.4, sz, 2.0, 0.5, g => drawText(g, '미끼 · 낚싯대', 0, 0.25, 1.8, 0.4, '#6a4128'), Math.PI / 2);
    const net = k.place(new THREE.TorusGeometry(0.3, 0.025, 5, 16), mat('#5a4030'), sx - 0.2, 1.9, sz + 1.4, 1, 1, 1, null); net.rotation.y = 0.4;
    k.box(sx - 0.2, 1.1, sz + 1.4, 0.04, 1.4, 0.04, '#8a6242', 0);
    k.box(sx + 1.2, 1.8, sz + 1.5, 0.08, 3.6, 0.08, WOOD_D, 1);
    const flag = k.box(sx + 1.2, 2.9, sz + 2.0, 0.04, 1.4, 0.9, '#fff4dc', 1);
    k.paint(sx + 1.23, 2.25, sz + 2.0, 0.8, 1.3, g => drawText(g, '낚시', 0, 0.65, 0.7, 0.6, '#3d6f9a'), Math.PI / 2);
    flag.userData.sway = 1;
    // 개미지옥 모래 구덩이 (소용돌이)와 들여다보는 구멍
    k.cyl(10.0, 0.03, 4.6, 1.7, 0.06, '#e2cf9e', 0);
    for (let r = 0.3; r < 1.6; r += 0.32) k.place(new THREE.TorusGeometry(r, 0.035, 4, 28), mat('#c9b07a'), 10.0, 0.07, 4.6, 1, 1, 1, null).rotation.x = Math.PI / 2;
    k.cyl(10.0, 0.06, 4.6, 0.2, 0.05, '#8f7a52', 0);
    k.cyl(8.0, 0.04, -5.4, 0.7, 0.06, '#6f5a44', 1);
    k.cyl(8.0, 0.06, -5.4, 0.5, 0.05, '#2e2620', 0);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.ball(8.0 + Math.sin(a) * 0.82, 0.1, -5.4 + Math.cos(a) * 0.82, 0.2, 0.12, 0.18, STONE, 0); }
    // 길막기: 물은 못 들어간다 (잔교 위는 다닌다)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, x = CX + Math.cos(a) * RX * 0.62, z = CZ + Math.sin(a) * RZ * 0.62;
      if (Math.abs(x - DOCK_X) < DOCK_W && z > CZ) continue;
      k.solidCircle(x, z, 2.4);
    }
    k.solidCircle(sx, sz, 1.3);
  };
  if (typeof BUILDERS !== 'undefined') BUILDERS.pond = build;

  /* ---------- 낚시 동작 ---------- */
  const MA = root.MinorActs;
  if (MA && MA.C && typeof ANIMS !== 'undefined') {
    const cast = MA.C(1.6, { rotX: '0:.02 .5:-.22 .8:-.24 1.05:.2b 1.6:.1', rotY: '0:0 .5:.25 1.05:-.05 1.6:0', posY: '0:0 .5:.04 1.05:0 1.6:0', footLY: '0:0 .5:.06 1.05:0 1.6:0' },
      { R: 'chest(.25,.12,.2)@0 high(.2,-.3,0)@.5 high(.22,-.32,0)@.8 front(.22,.3,0)@1.1 front(.22,.3,0)@1.6', L: 'chest(.1,.1,.22)@0 chest(.12,.12,.24)@1.6' }, [[0, 'brave'], [1.1, 'normal']], { once: true });
    cast.id = 'rod_cast'; ANIMS.rod_cast = cast;
    const strike = MA.C(1.0, { rotX: '0:.12 .2:-.26s .5:-.2 1:-.14', posY: '0:0 .2:.14o .45:0 1:0', squash: '0:1 .2:1.05 .45:.96b 1:1' },
      { R: 'front(.22,.3,0)@0 high(.22,-.2,0)@.25 high(.2,-.18,0)@1', L: 'chest(.12,.12,.24)@0 high(.08,-.2,0)@.25 high(.08,-.2,0)@1' }, [[0, 'surprised'], [0.3, 'brave']], { once: true });
    strike.id = 'rod_strike'; ANIMS.rod_strike = strike;
    const show = MA.C(2.0, { posY: '0:0 .3:.22o .6:0 .9:.12o 1.2:0 2:0', rotX: '0:-.1 .3:-.18 2:-.12', squash: '0:1 .55:.94 .7:1.03b 1:1 2:1' },
      { R: 'high(.2,-.24,0)@0 high(.22,-.3,0)@.3 high(.2,-.24,0)@2', L: 'high(-.2,-.24,0)@0 high(-.22,-.3,0)@.3 high(-.2,-.24,0)@2' }, [[0, 'joy']], {
        props: [{ id: 'fish', shape: 'ball', color: '#9fb8c9', size: 0.2, attach: 'handR', tracks: { px: [[0, -0.12, 'io'], [2, -0.12, 'io']], py: [[0, 0.12, 'io'], [2, 0.12, 'io']], pz: [[0, 0.02, 'io'], [2, 0.02, 'io']], rz: [[0, -0.3, 'io'], [0.5, 0.3, 'io'], [1, -0.3, 'io'], [1.5, 0.3, 'io'], [2, -0.3, 'io']] }, vis: [[0, 1]] }],
      });
    show.id = 'fish_show'; ANIMS.fish_show = show;
  }

  /* ---------- 낚시 상호작용 ---------- */
  const VO = root.VillageObjects;
  if (VO) {
    const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop, label });
    const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
    const old = VO.BY_ID['pond.fish'] || {};
    put({ ...old, id: 'pond.fish', place: 'pond', name: '낚시하기', hours: [5, 20], gain: old.gain || { fun: 25, energy: 5 }, earn: old.earn || 150,
      steps: [S('fish_*', 'cast', 1.6, 'rod_cast', 'rod', '휙 던지는 중'), S('fish_*', 'wait', 14, 'fish_wait', 'rod', '찌를 보며 기다리는 중'), S('fish_*', 'bite', 1, 'rod_strike', 'rod', '쏙! 지금이다'),
        S('fish_*', 'reel', 5, 'reel_pull', 'rod', '영차영차 감는 중'), S('fish_*', 'show', 2, 'fish_show', null, '낚았다!')] });
    put({ id: 'pond.bait_buy', place: 'pond', name: '미끼 사기', cost: 50, hours: [6, 19], gain: { fun: 4 },
      steps: [S('shop_stand', 'look', 2, 'browse_shelf', null, '미끼 통 들여다보는 중'), S('shop_stand', 'pay', 1.5, 'pay_wait', null, '미끼 한 봉지 주세요')] });
  }

  /* ---------- 낚싯줄·찌: 낚는 사람마다 손끝에서 물 위 찌까지 ---------- */
  const lineMat = new THREE.LineBasicMaterial({ color: '#4a4a52' });
  function tick() {
    const G = root.game;
    const P = G && G.world && G.world.places.find(q => q.id === 'pond');
    if (G && G.sim && G.actors && P && live.group) {
      const t = performance.now() / 1000;
      live.rings.forEach((r, i) => { const u = (t * 0.25 + i / 3) % 1; r.scale.setScalar(0.3 + u * 1.6); r.material.opacity = 0.55 * (1 - u); });
      const seen = new Set();
      for (const a of G.actors) {
        const c = a.c, d = c.doing;
        if (!d || !d.x || d.x.id !== 'pond.fish' || d.phase !== 'use' || d.step > 3) continue;
        seen.add(c.id);
        let line = live.lines.get(c.id), bob = live.bobs.get(c.id);
        if (!line) {
          line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), lineMat);
          bob = new THREE.Group();
          const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshToonMaterial({ color: '#e2483c' })); top.position.y = 0.04; bob.add(top);
          const bot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshToonMaterial({ color: '#fffaf0' })); bot.position.y = -0.04; bob.add(bot);
          G.scene.add(line, bob); live.lines.set(c.id, line); live.bobs.set(c.id, bob);
        }
        const so = d.socket, fx = so.fx - so.x, fz = so.fz - so.z, fl = Math.hypot(fx, fz) || 1;
        const dx = fx / fl, dz = fz / fl;
        const wy = P.y + 0.1;
        // 찌: 던질 때는 날아가고, 기다릴 땐 까딱, 입질에 쏙, 감을 땐 끌려온다
        const u = Math.max(0, Math.min(1, 1 - d.left / (d.x.steps[d.step].min || 1)));
        let dist = 2.8, dip = Math.sin(t * 2.2 + c.x) * 0.02;
        if (d.step === 0) { dist = 0.6 + u * 2.2; dip = 0.8 * Math.sin(u * Math.PI); }
        if (d.step === 1 && u > 0.6) dip += Math.sin(t * 14) * 0.03 * ((u - 0.6) / 0.4);
        if (d.step === 2) dip = -0.12;
        if (d.step === 3) { dist = 2.8 - u * 2.0; dip = Math.sin(t * 9) * 0.03; }
        bob.position.set(c.x + dx * dist, wy + dip, c.z + dz * dist);
        // 낚싯대 끝: 오른손 소품이 있으면 그 끝, 없으면 머리 앞 위
        const tip = new THREE.Vector3(c.x + dx * 0.9, (P.y + (c.h || 0)) + 1.9, c.z + dz * 0.9);
        if (a.prop && a.prop.updateMatrixWorld) {
          a.prop.updateMatrixWorld(true);
          const b = new THREE.Box3().setFromObject(a.prop);
          if (!b.isEmpty()) { tip.set(b.max.x * 0.5 + b.min.x * 0.5, b.max.y, b.max.z * 0.5 + b.min.z * 0.5); }
        }
        const mid = tip.clone().lerp(bob.position, 0.5); mid.y -= 0.25;
        line.geometry.setFromPoints([tip, mid, bob.position.clone().add(new THREE.Vector3(0, 0.1, 0))]);
        line.visible = bob.visible = true;
      }
      for (const [id, line] of live.lines) if (!seen.has(id)) { line.visible = false; live.bobs.get(id).visible = false; }
    }
    requestAnimationFrame(tick);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
}(typeof self !== 'undefined' ? self : this));
