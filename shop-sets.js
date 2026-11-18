'use strict';

// 치이카와 심즈 — 가게 세트 (2026-11-10 이재헌 지시: 라멘집 말고 다른 가게들도 실내를 새로 짓는다)
// 세트 = 건물 + 고정 에셋 + 행동 동작 + 에셋 동작. 자리는 그대로 두고 가구와 움직이는 물건을 새로 놓는다
// 1) 우마이야  2) 서서 먹는 소바  3) 찻집  4) 과자의 마치오카  5) 약국  6) 인터넷 코너
(function (root) {
  const FUR = root.INTERIOR_FURNISH = root.INTERIOR_FURNISH || {};
  const { grp, lit, text, hook, ease, clamp } = root.PublicSets;
  const SOCK = id => root.ASSET_SOCKETS[id] || {};
  // 자리에서 보는 쪽으로 d만큼 나간 점과, 그 점에서 자리를 바라보는 각도
  const front = (v, d) => {
    const dx = v[3] - v[0], dz = v[4] - v[1], l = Math.hypot(dx, dz) || 1;
    return { x: v[0] + (dx / l) * d, z: v[1] + (dz / l) * d, ry: Math.atan2(-dx / l, -dz / l) };
  };
  const steam = (kit, n, x, y, z) => (typeof steamPuffs === 'function' ? steamPuffs(kit, n, x, y, z) : []);
  const puff = (p, x, y, z, time, on) => { if (p.length && typeof runSteam === 'function') runSteam(p, x, y, z, time, on); };
  const fire = (parent, r, kind) => (root.FireFx ? root.FireFx.makeFire(parent, r, kind) : { run() {} });
  root.ShopSets = { front, steam, puff, fire, SOCK };

  /* ================= 1) 우마이야 ================= */
  hook('umaiya', /정식/, s => ({ talk_order: 'wok.cook', wait_tap: 'tray.serve', tray_chop: 'tray.eat', drink: 'tray.keep', belly_pat: 'tray.keep' }[s.clip] || null));
  hook('umaiya', /주방 보조/, s => ({ wok_toss: 'wok.toss', hold_chest: 'pass.plate' }[s.clip] || null));

  FUR.umaiya = (k, api, F) => {
    const S = SOCK('umaiya');
    // 다다미 자리 둘: 큰 좌탁과 방석
    const tatami = (x0, x1, z0, z1) => {
      k.box((x0 + x1) / 2, F + 0.04, (z0 + z1) / 2, x1 - x0, 0.08, z1 - z0, '#c9c58a', 1);
      for (let x = x0 + 1; x < x1 - 0.2; x += 1) k.box(x, F + 0.085, (z0 + z1) / 2, 0.05, 0.01, z1 - z0, '#6f7a4a', 0);
      k.box((x0 + x1) / 2, F + 0.085, z0 + 0.04, x1 - x0, 0.01, 0.08, '#4f5a3a', 0);
      k.box((x0 + x1) / 2, F + 0.085, z1 - 0.04, x1 - x0, 0.01, 0.08, '#4f5a3a', 0);
    };
    const lowTable = (x0, x1, z0, z1) => {
      k.box((x0 + x1) / 2, F + 0.4, (z0 + z1) / 2, x1 - x0, 0.08, z1 - z0, '#8a5a3c', 1);
      k.box((x0 + x1) / 2, F + 0.445, (z0 + z1) / 2, x1 - x0 - 0.16, 0.01, z1 - z0 - 0.16, '#a06e4a', 0);
      for (const x of [x0 + 0.2, x1 - 0.2]) for (const z of [z0 + 0.2, z1 - 0.2]) k.box(x, F + 0.2, z, 0.14, 0.34, 0.14, '#6f4630', 0);
      // 양념통과 젓가락 통
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      k.cyl(cx - 0.15, F + 0.52, cz, 0.05, 0.14, '#5a3b33', 0); k.cyl(cx - 0.15, F + 0.6, cz, 0.02, 0.04, '#c8463c', 0);
      k.cyl(cx + 0.02, F + 0.51, cz, 0.045, 0.12, '#fffdf4', 0);
      k.box(cx + 0.2, F + 0.52, cz, 0.1, 0.14, 0.1, '#3f3d3a', 0);
      for (let j = 0; j < 4; j++) k.cyl(cx + 0.18 + (j % 2) * 0.04, F + 0.62, cz - 0.02 + Math.floor(j / 2) * 0.04, 0.008, 0.14, '#e6c797', 0);
    };
    tatami(-7.2, -1.9, 0.6, 5.2); lowTable(-5.25, -2.3, 1.05, 3.35);
    tatami(2.2, 7.2, 0.9, 5.2); lowTable(2.6, 5.55, 1.6, 3.6);
    const cushion = (x, z, c) => { k.box(x, F + 0.13, z, 0.7, 0.1, 0.7, c, 1); k.ball(x, F + 0.185, z, 0.04, 0.02, 0.04, '#fffdf4', 0); };
    for (const [n, v] of Object.entries(S)) if (/^table_sit/.test(n)) cushion(v[0], v[1], '#b9544b');
    for (const [x, z] of [[-3.6, 0.5], [-1.75, 2.2], [3.9, 4.2], [3.9, 1.05], [1.95, 2.6]]) cushion(x, z, '#3d5a7a');
    // 정식 쟁반: 나오고, 먹을수록 줄고, 다 먹으면 빈 그릇이 남는다
    const setFood = (o, u) => {
      kitScale(o.data.rice, 1, Math.max(0.05, 1 - clamp(u / 0.9)), 1);
      o.data.soup.position.y = 0.075 - clamp((u - 0.2) / 0.7) * 0.04;
      o.data.fish.forEach((f, j) => { f.visible = u < 0.15 + j * 0.18; });
      o.data.side.forEach((f, j) => { f.visible = u < 0.3 + j * 0.2; });
    };
    for (const [n, v] of Object.entries(S)) {
      if (!/^table_sit/.test(n)) continue;
      const p = front(v, 0.92);
      api.dyn(`tray:${n}`, { x: p.x, y: F + 0.45, z: p.z, ry: p.ry, label: '정식 쟁반',
        clips: {
          serve(o, u, time) { const t = ease(clamp((u - 0.55) / 0.35)); o.root.visible = u > 0.55; o.data.all.position.set(0, (1 - t) * 0.25, -(1 - t) * 0.6); setFood(o, 0); puff(o.data.puffs, -0.12, 0.12, -0.05, time, u > 0.6); },
          eat(o, u, time) { const t = ease(clamp(u / 0.04)); o.root.visible = true; o.data.all.position.set(0, (1 - t) * 0.25, -(1 - t) * 0.6); setFood(o, u); puff(o.data.puffs, -0.12, 0.12, -0.05, time, u < 0.4); },
          keep(o, u, time) { o.root.visible = true; o.data.all.position.set(0, 0, 0); setFood(o, 1); puff(o.data.puffs, 0, 0, 0, time, false); },
        },
        end(o) { o.root.visible = false; },
      }, (kk, o) => {
        const a = grp(kk.group); o.data.all = a; const ak = makeKit(a, 0, 0, 0);
        ak.box(0, 0.015, 0, 0.7, 0.03, 0.5, '#3a2a26', 1);
        ak.box(0, 0.032, 0, 0.62, 0.006, 0.42, '#7a2f2a', 0);
        // 밥공기, 된장국, 생선구이 접시, 절임 종지, 찻잔
        ak.cyl(-0.2, 0.07, 0.1, 0.09, 0.08, '#fffdf4', 1);
        o.data.rice = ak.ball(-0.2, 0.1, 0.1, 0.08, 0.07, 0.08, '#fffffa', 0);
        ak.cyl(0.2, 0.065, 0.1, 0.09, 0.07, '#3a2a26', 1);
        o.data.soup = ak.cyl(0.2, 0.075, 0.1, 0.075, 0.06, '#c98a4a', 0);
        ak.box(0, 0.045, -0.1, 0.34, 0.02, 0.18, '#dfe6ea', 1);
        o.data.fish = [0, 1, 2, 3].map(j => ak.box(-0.11 + j * 0.075, 0.07, -0.1, 0.07, 0.035, 0.1, j % 2 ? '#c9772e' : '#b5651d', 0));
        ak.ball(0.13, 0.07, -0.15, 0.03, 0.025, 0.03, '#fffdf4', 0);
        ak.cyl(0.27, 0.05, -0.12, 0.05, 0.03, '#8fa7b8', 0);
        o.data.side = [0, 1, 2].map(j => ak.ball(0.25 + (j - 1) * 0.025, 0.072, -0.12 + (j % 2) * 0.02, 0.022, 0.016, 0.022, ['#f2d64b', '#e88aa0', '#7fb46f'][j], 0));
        ak.cyl(-0.3, 0.07, -0.14, 0.04, 0.08, '#6f8f6a', 0);
        o.data.puffs = steam(kk, 3, -0.12, 0.12, -0.05);
        o.root.visible = false;
      });
    }
    // 주문 카운터와 내주는 창
    const TOP = F + 0.8;
    k.box(0, F + 0.38, 0, 6.6, 0.76, 0.8, '#8a5a3c', 1);
    k.box(0, TOP, 0, 7.0, 0.08, 1.0, '#c9a57c', 1);
    for (let i = 0; i < 9; i++) k.box(-3.1 + i * 0.78, F + 0.4, 0.41, 0.06, 0.66, 0.02, '#6f4630', 0);
    for (const x of [-3.3, 3.3]) k.box(x, TOP + 0.9, 0, 0.14, 1.8, 0.14, '#6f4630', 1);
    k.box(0, TOP + 1.8, 0, 6.9, 0.16, 0.3, '#6f4630', 1);
    for (let i = 0; i < 5; i++) k.box(-2.4 + i * 1.2, TOP + 1.42, 0.02, 1.1, 0.6, 0.03, i % 2 ? '#c9604f' : '#b5503f', 1);
    text(k, 0, TOP + 1.2, 0.05, 3.4, 0.5, ['우 마 이 야'], '#fff8e6', 0.3);
    // 접시 내는 자리: 주방 보조가 내면 접시가 카운터로 밀려 나온다
    api.dyn('pass', { x: 1.6, y: TOP + 0.04, z: -0.25, label: '내는 접시',
      clips: { plate(o, u, time) { o.root.visible = true; o.root.position.z = -0.25 + ease(clamp(u / 0.6)) * 0.45; puff(o.data.puffs, 0, 0.1, 0, time, true); } },
      end(o) { o.root.visible = false; },
    }, (kk, o) => {
      kk.cyl(0, 0.015, 0, 0.2, 0.03, '#fffdf4', 1);
      kk.ball(-0.04, 0.03, 0, 0.11, 0.07, 0.1, '#c9772e', 0);
      for (let j = 0; j < 5; j++) kk.ball(0.08 + Math.cos(j) * 0.04, 0.05, Math.sin(j * 2) * 0.06, 0.03, 0.025, 0.03, ['#7fb46f', '#e8a96a'][j % 2], 0);
      o.data.puffs = steam(kk, 3, 0, 0.1, 0); o.root.visible = false;
    });
    k.box(-2.4, TOP + 0.1, 0.1, 0.5, 0.12, 0.36, '#3f3d3a', 1);
    text(k, -2.4, TOP + 0.18, 0.3, 0.5, 0.2, ['주문'], '#fff8e6', 0.12);
    for (let j = 0; j < 3; j++) k.cyl(2.6 + j * 0.16, TOP + 0.1, 0.2, 0.05, 0.12, '#bfe6f7', 0);
    // 주방: 화구 위의 웍 (볶을 때 들썩이고 재료가 튄다), 밥솥, 냄비, 도마
    k.box(0, F + 0.35, -1.3, 5.6, 0.7, 0.8, '#b9bfc3', 1);
    k.box(0, F + 0.71, -1.3, 5.7, 0.04, 0.86, '#d9dde0', 0);
    api.dyn('wok', { x: 0, y: F + 0.74, z: -1.3, obj: 'wok', label: '웍',
      clips: {
        toss(o, u, time) {
          const s = Math.sin(time * 7);
          o.data.pan.rotation.x = -0.12 - Math.max(0, s) * 0.45; o.data.pan.position.y = 0.16 + Math.max(0, s) * 0.12;
          o.data.bits.forEach((b, j) => { const t = (time * 1.1 + j * 0.17) % 1; b.position.set(Math.sin(j * 2.3) * 0.14, 0.06 + Math.sin(t * Math.PI) * (0.3 + (j % 3) * 0.08), Math.cos(j * 1.7) * 0.12 - t * 0.05); });
          o.data.fire.run(time, true); puff(o.data.puffs, 0, 0.3, 0, time, true);
        },
        cook(o, u, time) {
          o.data.pan.rotation.x = Math.sin(time * 5) * 0.08; o.data.pan.position.y = 0.16;
          o.data.bits.forEach((b, j) => { b.position.set(Math.sin(j * 2.3 + time * 2) * 0.14, 0.06, Math.cos(j * 1.7 + time * 2) * 0.12); });
          o.data.fire.run(time, true); puff(o.data.puffs, 0, 0.3, 0, time, true);
        },
      },
      idle(o, time) { o.data.fire.run(time, false); puff(o.data.puffs, 0, 0.3, 0, time, false); },
      end(o) { o.data.pan.rotation.x = 0; o.data.pan.position.y = 0.16; o.data.bits.forEach((b, j) => b.position.set(Math.sin(j * 2.3) * 0.14, 0.06, Math.cos(j * 1.7) * 0.12)); },
    }, (kk, o) => {
      kk.cyl(0, 0.04, 0, 0.3, 0.08, '#3f3d3a', 1);
      for (let j = 0; j < 4; j++) kk.box(Math.cos(j * 1.57) * 0.2, 0.1, Math.sin(j * 1.57) * 0.2, 0.05, 0.04, 0.05, '#2f2f38', 0);
      o.data.fire = fire(grp(kk.group, 0, 0.06, 0), 0.24, 'gas');
      const p = grp(kk.group, 0, 0.16, 0); o.data.pan = p; const pk = makeKit(p, 0, 0, 0);
      pk.ball(0, 0, 0, 0.34, 0.14, 0.34, '#3a3a40', 1);
      pk.ball(0, 0.03, 0, 0.3, 0.1, 0.3, '#5a5a62', 0);
      pk.cyl(0, 0.04, -0.46, 0.035, 0.3, '#8a5a3c', 0).rotation.x = Math.PI / 2;
      o.data.bits = [];
      for (let j = 0; j < 9; j++) o.data.bits.push(pk.ball(Math.sin(j * 2.3) * 0.14, 0.06, Math.cos(j * 1.7) * 0.12, 0.045, 0.03, 0.045, ['#7fb46f', '#e8a96a', '#c8463c', '#f3e3b0'][j % 4], 0));
      o.data.puffs = steam(kk, 4, 0, 0.3, 0);
    });
    // 화구 옆: 국 냄비(늘 김이 난다), 도마와 칼, 양념 선반
    api.dyn('soup', { x: -1.5, y: F + 0.74, z: -1.3, label: '국 냄비', idle(o, time) { puff(o.data.puffs, 0, 0.42, 0, time, true); o.data.lid.rotation.z = Math.sin(time * 9) * 0.03; } },
      (kk, o) => { kk.cyl(0, 0.18, 0, 0.3, 0.36, '#c9c4b6', 1); for (const sx of [-0.33, 0.33]) kk.box(sx, 0.28, 0, 0.08, 0.04, 0.1, '#3f3d3a', 0); o.data.lid = kk.cyl(0, 0.38, 0, 0.31, 0.04, '#b9b3a6', 1); kk.ball(0, 0.42, 0, 0.05, 0.04, 0.05, '#3f3d3a', 0); o.data.puffs = steam(kk, 3, 0, 0.42, 0); });
    k.box(1.6, F + 0.77, -1.3, 0.7, 0.05, 0.44, '#e6c797', 1);
    k.box(1.75, F + 0.81, -1.25, 0.34, 0.015, 0.07, '#d9dde0', 0); k.box(1.52, F + 0.81, -1.25, 0.14, 0.03, 0.05, '#3f3d3a', 0);
    for (let j = 0; j < 4; j++) k.ball(1.4 + j * 0.07, F + 0.82, -1.42, 0.035, 0.03, 0.05, '#7fb46f', 0);
    for (let j = 0; j < 5; j++) k.cyl(2.3 + (j % 3) * 0.16, F + 0.84, -1.5 + Math.floor(j / 3) * 0.2, 0.05, 0.18, ['#5a3b33', '#c9a24a', '#fffdf4'][j % 3], 0);
    // 뒷벽: 밥솥, 냉장고, 술병 선반, 나무 메뉴 패
    const BZ = -4.2;
    k.box(-5.6, F + 1.1, BZ, 1.5, 2.2, 0.9, '#d9dde0', 1);
    k.box(-5.6, F + 1.5, BZ + 0.46, 1.4, 0.03, 0.02, '#9aa0a4', 0);
    for (const y of [1.0, 1.9]) k.box(-5.05, F + y, BZ + 0.48, 0.05, 0.4, 0.04, '#7f868a', 0);
    k.box(-3.6, F + 0.4, BZ, 1.6, 0.8, 0.8, '#8a5a3c', 1);
    api.dyn('rice', { x: -3.6, y: F + 0.8, z: BZ, label: '밥솥', idle(o, time) { puff(o.data.puffs, 0.2, 0.5, 0, time, true); o.data.lamp.material.color.set(Math.sin(time * 2) > 0 ? '#ff8a5e' : '#b5503f'); } },
      (kk, o) => { kk.cyl(0, 0.24, 0, 0.36, 0.48, '#fffdf4', 1); kk.cyl(0, 0.5, 0, 0.34, 0.06, '#e8e3d8', 1); kk.box(0, 0.56, 0, 0.3, 0.04, 0.06, '#3f3d3a', 0); o.data.lamp = lit(kk.group, 0.08, 0.05, 0.02, '#ff8a5e', 0, 0.2, 0.36); o.data.puffs = steam(kk, 3, 0.2, 0.5, 0); });
    k.box(1.2, F + 1.2, BZ - 0.2, 4.6, 0.08, 0.4, '#8a5a3c', 1);
    k.box(1.2, F + 2.0, BZ - 0.2, 4.6, 0.08, 0.4, '#8a5a3c', 1);
    for (let j = 0; j < 12; j++) {
      const x = -0.9 + j * 0.38, y = F + (j % 2 ? 2.04 : 1.24);
      k.cyl(x, y + 0.2, BZ - 0.15, 0.09, 0.4, ['#3f7a4a', '#7a3f2a', '#e8e3d8', '#3d5a7a'][j % 4], 1);
      k.cyl(x, y + 0.47, BZ - 0.15, 0.035, 0.14, ['#3f7a4a', '#7a3f2a', '#e8e3d8', '#3d5a7a'][j % 4], 0);
      k.box(x, y + 0.2, BZ - 0.055, 0.1, 0.14, 0.01, '#fffdf4', 0);
    }
    ['정식', '생선', '튀김', '조림', '국수'].forEach((t, j) => {
      k.box(-2.6 + j * 0.5, F + 2.9, BZ - 0.36, 0.36, 0.9, 0.04, '#e6c797', 1);
      text(k, -2.6 + j * 0.5, F + 2.5, BZ - 0.33, 0.36, 0.8, [...t], '#3f3d3a', 0.2);
    });
    // 등롱 둘: 늘 살짝 흔들린다
    for (const [id, x] of [['lampL', -4.6], ['lampR', 4.6]]) {
      api.dyn(id, { x, y: F + 3.1, z: 0.6, label: '등롱', idle(o, time) { o.root.rotation.z = Math.sin(time * 1.3 + x) * 0.06; o.data.g.material.opacity = 0.75 + Math.sin(time * 5 + x) * 0.08; } },
        (kk, o) => { kk.cyl(0, 0.5, 0, 0.01, 0.6, '#3f3d3a', 0); kk.cyl(0, 0.18, 0, 0.16, 0.04, '#3f3d3a', 0); kk.cyl(0, -0.22, 0, 0.16, 0.04, '#3f3d3a', 0); o.data.g = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffb46a', transparent: true, opacity: 0.8 })); o.data.g.scale.y = 0.85; o.data.g.position.y = -0.02; kk.group.add(o.data.g); });
    }
    // 신발장과 우산꽂이, 맥주 상자
    k.box(6.9, F + 0.5, 4.6, 0.6, 1.0, 1.6, '#8a5a3c', 1);
    for (let r = 0; r < 3; r++) { k.box(6.62, F + 0.2 + r * 0.32, 4.6, 0.04, 0.03, 1.5, '#6f4630', 0); for (let c = 0; c < 3; c++) k.ball(6.7, F + 0.27 + r * 0.32, 4.1 + c * 0.5, 0.14, 0.06, 0.1, ['#3f3d3a', '#b9544b', '#e6c797'][(r + c) % 3], 0); }
    for (let j = 0; j < 2; j++) { k.box(6.6, F + 0.2 + j * 0.4, -3.6, 0.9, 0.38, 0.7, '#e3bb4a', 1); for (let c = 0; c < 6; c++) k.cyl(6.3 + (c % 3) * 0.3, F + 0.44 + j * 0.4, -3.8 + Math.floor(c / 3) * 0.4, 0.06, 0.1, '#7a3f2a', 0); }
  };

  /* ================= 2) 서서 먹는 소바 ================= */
  hook('soba', /소바/, (s, i) => ['ticket.buy', 'bowl.eat', 'bowl.slurp', 'bowl.keep'][i] || null);

  FUR.soba = (k, api, F) => {
    const S = SOCK('soba');
    const CT = 1.32, KT = F + 0.86;          // 손님 카운터 윗면, 주방 작업대 윗면
    let potBusy = -9;                         // 식권을 뽑는 동안 주방에서는 면을 삶는다
    // 디딤대: 키가 작아서 올라서서 먹는다
    const step = (v, w, stair) => {
      const h = Math.max(0.1, v[2] - F);
      k.box(v[0], F + h / 2, v[1], w, h, 0.8, '#a06e4a', 1);
      k.box(v[0], F + h - 0.005, v[1], w - 0.1, 0.012, 0.7, '#c9a57c', 0);
      for (const sx of [-1, 1]) k.box(v[0] + sx * (w / 2 - 0.08), F + h / 2, v[1] + 0.405, 0.1, h, 0.01, '#6f4630', 0);
      if (stair) k.box(v[0], F + h * 0.25, v[1] + 0.55, w * 0.8, h * 0.5, 0.3, '#8a5a3c', 1);
    };
    for (const [n, v] of Object.entries(S)) if (/^eat_stand/.test(n)) step(v, 1.1, true);
    if (S.order_front) step(S.order_front, 0.9, false);
    // 긴 카운터 (손님 쪽이 한 단 높다)
    k.box(-0.45, F + (CT - F) / 2, 1.35, 8.9, CT - F - 0.06, 0.6, '#8a5a3c', 1);
    k.box(-0.45, CT - 0.03, 1.35, 9.1, 0.07, 0.78, '#d9b98c', 1);
    for (let i = 0; i < 12; i++) k.box(-4.6 + i * 0.76, F + 0.5, 1.66, 0.05, 0.8, 0.02, '#6f4630', 0);
    k.box(-0.45, F + 0.12, 1.75, 8.9, 0.06, 0.12, '#b9bfc3', 0);
    k.box(-0.45, KT - 0.43 + F * 0, 0.55, 8.9, 0.86, 1.0, '#b9bfc3', 1);
    k.box(-0.45, KT, 0.55, 9.0, 0.04, 1.04, '#d9dde0', 0);
    // 자리 사이: 시치미 통, 젓가락 통, 물컵
    for (const x of [-1.6, 1.6, -4.5]) {
      k.cyl(x - 0.12, CT + 0.07, 1.45, 0.045, 0.14, '#8a2f2a', 0); k.cyl(x - 0.12, CT + 0.15, 1.45, 0.03, 0.03, '#e3bb4a', 0);
      k.box(x + 0.1, CT + 0.08, 1.45, 0.12, 0.16, 0.12, '#3f3d3a', 1);
      for (let j = 0; j < 5; j++) k.cyl(x + 0.07 + (j % 3) * 0.03, CT + 0.2, 1.43 + (j % 2) * 0.04, 0.007, 0.14, '#e6c797', 0);
      k.box(x + 0.32, CT + 0.03, 1.5, 0.2, 0.06, 0.14, '#fffdf4', 0);
    }
    // 튀김 진열 유리장
    k.box(-3.9, CT + 0.02, 1.25, 0.9, 0.04, 0.5, '#3f3d3a', 1);
    for (let j = 0; j < 6; j++) k.ball(-4.2 + (j % 3) * 0.3, CT + 0.09 + Math.floor(j / 3) * 0.02, 1.15 + Math.floor(j / 3) * 0.2, 0.12, 0.05, 0.1, j % 2 ? '#e3a94a' : '#d6953a', 0);
    lit(k.group, 0.9, 0.34, 0.5, '#dff3fb', -3.9, CT + 0.21, 1.25, 0.25);
    k.box(-3.9, CT + 0.39, 1.25, 0.94, 0.03, 0.54, '#3f3d3a', 0);

    // 식권 자판기: 동전이 들어가고, 단추에 불이 들어오고, 식권이 나온다
    if (S.order_front) {
      const p = front(S.order_front, 0.72);
      api.dyn('ticket', { x: p.x, y: F, z: p.z, ry: p.ry, obj: 'ticket', label: '식권 자판기',
        clips: {
          buy(o, u, time) {
            potBusy = time;
            const c = clamp(u / 0.25); o.data.coin.visible = u < 0.27; o.data.coin.position.set(0.2 + (1 - ease(c)) * 0.12, o.data.cy, 0.3 - ease(c) * 0.12);
            o.data.btn.forEach((b, j) => b.material.color.set(u > 0.28 && u < 0.5 ? (Math.sin(time * 9 + j) > 0 ? '#ffe27a' : '#fff8e6') : (j === 1 && u >= 0.5 && u < 0.62 ? '#ff8a5e' : '#fff8e6')));
            const t = ease(clamp((u - 0.6) / 0.15)); o.data.tk.visible = u > 0.6; o.data.tk.position.z = 0.16 + t * 0.1;
          },
        },
        end(o) { o.data.tk.visible = false; o.data.coin.visible = false; o.data.btn.forEach(b => b.material.color.set('#fff8e6')); },
      }, (kk, o) => {
        const base = S.order_front[2] - F;
        kk.box(0, 0.9, 0, 0.8, 1.8, 0.46, '#c8463c', 1);
        kk.box(0, 1.86, 0, 0.86, 0.12, 0.5, '#8a2f2a', 1);
        text(kk, 0, 1.6, 0.235, 0.7, 0.2, ['식 권'], '#fff8e6', 0.14);
        kk.box(0, base + 0.72, 0.232, 0.66, 0.5, 0.01, '#3f3d3a', 0);
        o.data.btn = [];
        const names = ['가케', '튀김', '유부', '달걀', '미역', '곱빼기'];
        for (let j = 0; j < 6; j++) {
          const bx = -0.2 + (j % 3) * 0.2, by = base + 0.84 - Math.floor(j / 3) * 0.22;
          o.data.btn.push(lit(kk.group, 0.17, 0.17, 0.02, '#fff8e6', bx, by, 0.245));
          text(kk, bx, by - 0.06, 0.258, 0.17, 0.12, [names[j]], '#3f3d3a', 0.06);
        }
        o.data.cy = base + 0.42;
        kk.box(0.2, base + 0.42, 0.235, 0.14, 0.05, 0.02, '#2f2f38', 0);
        o.data.coin = kk.cyl(0.2, base + 0.42, 0.3, 0.03, 0.008, '#e3bb4a', 0); o.data.coin.rotation.x = Math.PI / 2; o.data.coin.visible = false;
        kk.box(-0.12, base + 0.3, 0.24, 0.3, 0.1, 0.04, '#2f2f38', 0);
        o.data.tk = kk.box(-0.12, base + 0.3, 0.16, 0.12, 0.008, 0.2, '#fffdf4', 0); o.data.tk.visible = false;
      });
    }

    // 손님 그릇: 주방 쪽에서 밀려 나오고, 먹는 만큼 줄어든다
    const setBowl = (o, u) => {
      kitScale(o.data.noodle, 1, Math.max(0.05, 1 - u), 1); o.data.noodle.visible = u < 0.97;
      o.data.broth.position.y = 0.105 - clamp((u - 0.45) / 0.55) * 0.06;
      o.data.tem.visible = u < 0.35; o.data.negi.forEach((g, j) => { g.visible = u < 0.5 + j * 0.1; g.position.y = o.data.broth.position.y + 0.012; });
    };
    for (const [n, v] of Object.entries(S)) {
      if (!/^eat_stand/.test(n)) continue;
      const p = front(v, 0.88);
      api.dyn(`bowl:${n}`, { x: p.x, y: CT + 0.005, z: p.z, ry: p.ry, label: '소바 그릇',
        clips: {
          eat(o, u, time) { const t = ease(clamp(u / 0.05)); o.root.visible = true; o.data.all.position.z = -(1 - t) * 0.5; setBowl(o, u * 0.55); puff(o.data.puffs, 0, 0.16, 0, time, true); },
          slurp(o, u, time) { o.root.visible = true; o.data.all.position.z = 0; o.data.all.rotation.x = Math.sin(clamp((u - 0.5) / 0.4) * Math.PI) * 0.12; setBowl(o, 0.55 + u * 0.45); puff(o.data.puffs, 0, 0.16, 0, time, u < 0.5); },
          keep(o, u, time) { o.root.visible = true; o.data.all.position.z = 0; o.data.all.rotation.x = 0; setBowl(o, 1); puff(o.data.puffs, 0, 0, 0, time, false); },
        },
        end(o) { o.root.visible = false; o.data.all.rotation.x = 0; },
      }, (kk, o) => {
        const a = grp(kk.group); o.data.all = a; const ak = makeKit(a, 0, 0, 0);
        ak.cyl(0, 0.015, 0, 0.1, 0.03, '#2f2a3a', 0);
        ak.cyl(0, 0.07, 0, 0.19, 0.1, '#3a3350', 1);
        ak.cyl(0, 0.118, 0, 0.195, 0.012, '#fffdf4', 0);
        o.data.broth = ak.cyl(0, 0.105, 0, 0.17, 0.03, '#6a4a2c', 0);
        o.data.noodle = ak.ball(0, 0.115, 0, 0.13, 0.05, 0.13, '#b9a58a', 0);
        o.data.tem = ak.ball(0.04, 0.15, -0.03, 0.1, 0.035, 0.09, '#e3a94a', 0);
        o.data.negi = [0, 1, 2, 3].map(j => ak.cyl(-0.08 + (j % 2) * 0.05, 0.12, 0.06 - Math.floor(j / 2) * 0.05, 0.016, 0.008, '#7fb46f', 0));
        // 쟁반과 물컵
        ak.box(0.3, 0.035, 0.02, 0.06, 0.07, 0.06, '#bfe6f7', 0);
        o.data.puffs = steam(kk, 3, 0, 0.16, 0);
        o.root.visible = false;
      });
    }

    // 주방: 면 삶는 큰 솥 (망이 오르내린다), 국물 솥, 고명 통
    api.dyn('pot', { x: 0, y: KT + 0.02, z: 0.5, label: '면 솥',
      idle(o, time) {
        const busy = time - potBusy < 0.3;
        // 김은 면을 삶을 때만 (늘 흰 공이 피어오르던 문제, 2026-11-10)
        o.data.fire.run(time, true); puff(o.data.puffs, 0, 0.5, 0, time, busy);
        o.data.tebo.forEach((t, j) => { t.position.y = busy ? 0.42 + Math.max(0, Math.sin(time * 5 + j * 2)) * 0.3 : 0.4; t.rotation.z = busy ? Math.sin(time * 10 + j) * 0.12 : 0; });
        o.data.bub.forEach((b, j) => { const t = (time * 1.6 + j * 0.23) % 1; b.position.y = 0.4 + t * 0.05; kitScale(b, 0.4 + t); });
      },
    }, (kk, o) => {
      kk.box(0, 0.05, 0, 0.9, 0.1, 0.8, '#3f3d3a', 1);
      o.data.fire = fire(grp(kk.group, 0, 0.08, 0), 0.3, 'gas');
      kk.cyl(0, 0.26, 0, 0.4, 0.3, '#c9c4b6', 1);
      kk.cyl(0, 0.4, 0, 0.37, 0.02, '#dfeef2', 0);
      for (const sx of [-0.44, 0.44]) kk.box(sx, 0.34, 0, 0.08, 0.04, 0.14, '#3f3d3a', 0);
      o.data.tebo = [-0.16, 0.16].map(x => {
        const g = grp(kk.group, x, 0.4, 0.02), gk = makeKit(g, 0, 0, 0);
        gk.cyl(0, 0, 0, 0.11, 0.2, '#9aa0a4', 1); gk.ball(0, 0.06, 0, 0.09, 0.05, 0.09, '#b9a58a', 0);
        gk.cyl(0, 0.2, -0.26, 0.02, 0.5, '#8a5a3c', 0).rotation.x = 1.1;
        return g;
      });
      o.data.bub = [0, 1, 2, 3, 4].map(j => kk.ball(Math.cos(j * 1.3) * 0.26, 0.4, Math.sin(j * 2.1) * 0.24, 0.03, 0.02, 0.03, '#fffffa', 0));
      o.data.puffs = steam(kk, 5, 0, 0.5, 0);
    });
    api.dyn('dashi', { x: -1.5, y: KT + 0.02, z: 0.5, label: '국물 솥', idle(o, time) { puff(o.data.puffs, 0, 0.4, 0, time, time - potBusy < 0.3); o.data.ladle.rotation.z = Math.sin(time * 0.8) * 0.05; } },
      (kk, o) => {
        kk.cyl(0, 0.18, 0, 0.3, 0.36, '#8a8f94', 1); kk.cyl(0, 0.35, 0, 0.27, 0.02, '#6a4a2c', 0);
        const g = grp(kk.group, 0.18, 0.36, 0); o.data.ladle = g; const gk = makeKit(g, 0, 0, 0);
        gk.cyl(0, 0.2, 0, 0.015, 0.5, '#c9c4b6', 0); gk.ball(0, -0.04, 0, 0.06, 0.04, 0.06, '#c9c4b6', 0);
        o.data.puffs = steam(kk, 3, 0, 0.4, 0);
      });
    // 고명 통 넷과 빈 그릇 탑, 도마
    ['#7fb46f', '#e3a94a', '#f3e3b0', '#3f5a3a'].forEach((c, j) => {
      k.box(1.3 + j * 0.42, KT + 0.08, 0.72, 0.36, 0.14, 0.3, '#d9dde0', 1);
      k.box(1.3 + j * 0.42, KT + 0.15, 0.72, 0.3, 0.02, 0.24, c, 0);
    });
    for (const x of [1.4, 1.9, 2.4]) for (let j = 0; j < 4; j++) k.cyl(x, KT + 0.07 + j * 0.06, 0.3, 0.17, 0.08, j % 2 ? '#3a3350' : '#4a4266', j === 3 ? 1 : 0);
    k.box(-3.0, KT + 0.045, 0.5, 0.8, 0.05, 0.5, '#e6c797', 1);
    k.box(-2.85, KT + 0.08, 0.55, 0.36, 0.012, 0.07, '#d9dde0', 0); k.box(-3.1, KT + 0.08, 0.55, 0.14, 0.03, 0.05, '#3f3d3a', 0);
    for (let j = 0; j < 6; j++) k.cyl(-3.25 + j * 0.035, KT + 0.085, 0.38, 0.016, 0.03, '#7fb46f', 0);
    // 직원 발판
    if (S.staff_side) { const v = S.staff_side, h = Math.max(0.08, v[2] - F); k.box(v[0], F + h / 2, v[1], 2.6, h, 0.8, '#a06e4a', 1); for (let j = 0; j < 6; j++) k.box(v[0] - 1.1 + j * 0.44, F + h + 0.004, v[1], 0.04, 0.01, 0.76, '#6f4630', 0); }

    // 뒷벽: 생면 나무 상자, 그릇 선반, 개수대, 냉장고
    const BZ = -2.9;
    k.box(-4.6, F + 1.05, BZ, 1.3, 2.1, 0.8, '#d9dde0', 1);
    k.box(-4.6, F + 1.3, BZ + 0.41, 1.2, 0.03, 0.02, '#9aa0a4', 0);
    for (const y of [0.9, 1.7]) k.box(-4.1, F + y, BZ + 0.43, 0.05, 0.36, 0.04, '#7f868a', 0);
    k.box(-2.4, F + 0.42, BZ, 2.6, 0.84, 0.8, '#b9bfc3', 1);
    k.box(-2.8, F + 0.83, BZ, 1.1, 0.06, 0.6, '#8f979c', 0);
    k.cyl(-2.8, F + 1.1, BZ - 0.25, 0.025, 0.5, '#c9c4b6', 0); k.box(-2.8, F + 1.34, BZ - 0.12, 0.05, 0.04, 0.3, '#c9c4b6', 0);
    for (let j = 0; j < 5; j++) k.cyl(-1.75, F + 0.9 + j * 0.05, BZ + 0.05, 0.16, 0.06, '#3a3350', j === 4 ? 1 : 0);
    // 생면 상자 (층층이)
    for (let j = 0; j < 5; j++) {
      k.box(0.3, F + 0.14 + j * 0.2, BZ, 1.3, 0.18, 0.7, j % 2 ? '#e6c797' : '#d9b98c', 1);
      if (j === 4) for (let c = 0; c < 4; c++) k.ball(-0.15 + c * 0.3, F + 0.25 + j * 0.2, BZ, 0.12, 0.04, 0.2, '#b9a58a', 0);
    }
    k.box(2.6, F + 0.42, BZ, 2.4, 0.84, 0.8, '#8a5a3c', 1);
    for (const y of [1.5, 2.2]) {
      k.box(2.6, F + y, BZ - 0.15, 2.6, 0.07, 0.44, '#8a5a3c', 1);
      for (let j = 0; j < 6; j++) for (let s = 0; s < 3; s++) k.cyl(1.55 + j * 0.42, F + y + 0.08 + s * 0.05, BZ - 0.12, 0.15, 0.06, (j + s) % 2 ? '#fffdf4' : '#3a3350', s === 2 ? 1 : 0);
    }
    for (let j = 0; j < 4; j++) k.cyl(1.8 + j * 0.5, F + 1.0, BZ + 0.1, 0.1, 0.3, ['#5a3b33', '#c9a24a', '#3f3d3a', '#8a2f2a'][j], 1);
    // 나무 메뉴 패와 짧은 노렌
    ['가케', '튀김', '유부', '달걀', '미역'].forEach((t, j) => {
      k.box(-2.0 + j * 0.55, F + 3.0, BZ - 0.38, 0.4, 0.9, 0.04, '#e6c797', 1);
      text(k, -2.0 + j * 0.55, F + 2.6, BZ - 0.35, 0.4, 0.8, [...t], '#3f3d3a', 0.2);
    });
    k.box(-0.45, F + 3.0, 1.35, 9.0, 0.08, 0.08, '#6f4630', 1);
    for (let i = 0; i < 7; i++) {
      const x = -4.3 + i * 1.28;
      api.dyn(`noren${i}`, { x, y: F + 2.96, z: 1.35, label: '노렌', idle(o, time) { o.root.rotation.x = Math.sin(time * 1.4 + i * 0.7) * 0.07; } },
        (kk) => { kk.box(0, -0.3, 0, 1.2, 0.6, 0.02, '#3d4f7a', 1); if (i === 3) text(kk, 0, -0.5, 0.015, 1.0, 0.4, ['소바'], '#fff8e6', 0.24); else kk.ball(0, -0.3, 0.012, 0.12, 0.12, 0.004, '#fff8e6', 0); });
    }
    // 물 급수기와 컵, 우산꽂이, 간장 상자
    k.box(-5.3, F + 0.5, 2.9, 0.6, 1.0, 0.6, '#d9dde0', 1);
    k.cyl(-5.3, F + 1.25, 2.9, 0.22, 0.5, '#bfe6f7', 1); k.cyl(-5.3, F + 1.52, 2.9, 0.1, 0.06, '#8fa7b8', 0);
    k.box(-5.3, F + 0.75, 3.22, 0.1, 0.06, 0.06, '#3d5a7a', 0);
    for (let j = 0; j < 5; j++) k.cyl(-5.05, F + 1.03 + j * 0.025, 3.05, 0.04, 0.05, '#fffdf4', 0);
    k.cyl(5.3, F + 0.3, 2.9, 0.2, 0.6, '#3f3d3a', 1);
    for (let j = 0; j < 3; j++) { const m = k.cyl(5.24 + j * 0.06, F + 0.7, 2.86 + (j % 2) * 0.08, 0.02, 0.9, ['#c8463c', '#3d5a7a', '#e3bb4a'][j], 0); m.rotation.z = (j - 1) * 0.08; }
    for (let j = 0; j < 2; j++) k.box(5.2, F + 0.2 + j * 0.4, -2.7, 0.9, 0.38, 0.7, '#c9a57c', 1);
    text(k, 5.2, F + 0.3, -2.34, 0.8, 0.3, ['간장'], '#3f3d3a', 0.16);
  };

  /* ================= 3) 찻집 ================= */
  hook('kissa', /차 마시기/, s => ({ table_read: 'cup.serve', blow_hot: 'cup.blow', parfait_spoon: 'cup.parfait', tilt_look: 'cup.keep' }[s.clip] || null));
  hook('kissa', /주문/, s => (s.clip === 'talk_order' ? 'siphon.brew' : null));
  hook('kissa', /설거지/, s => (s.clip === 'dish_scrub' ? 'sink.wash' : null));

  FUR.kissa = (k, api, F) => {
    const S = SOCK('kissa');
    const WOOD = '#6b4634', DARK = '#4a2f24', VEL = '#8a2f3a';
    // 융단과 바닥 무늬
    k.box(-1.5, F + 0.012, 1.8, 9.6, 0.02, 3.6, '#7a3540', 0);
    k.box(-1.5, F + 0.024, 1.8, 9.0, 0.006, 3.0, '#93434c', 0);
    for (let i = 0; i < 8; i++) k.ball(-5.4 + i * 1.12, F + 0.03, 1.8, 0.22, 0.004, 0.22, '#c9a24a', 0);
    // 의자: 앉는 면 높이를 자리에 맞춘다
    const chair = (x, z, sy, dir) => {
      k.box(x, sy - 0.05, z, 0.62, 0.1, 0.62, VEL, 1);
      k.box(x, sy - 0.12, z, 0.66, 0.05, 0.66, WOOD, 0);
      for (const a of [-1, 1]) for (const b of [-1, 1]) k.box(x + a * 0.27, F + (sy - 0.14 - F) / 2, z + b * 0.27, 0.07, sy - 0.14 - F, 0.07, DARK, 0);
      k.box(x - dir * 0.3, sy + 0.32, z, 0.07, 0.7, 0.62, WOOD, 1);
      k.box(x - dir * 0.26, sy + 0.36, z, 0.03, 0.44, 0.5, VEL, 0);
      k.box(x, F + 0.2, z, 0.5, 0.04, 0.5, DARK, 0);
    };
    const roundTable = (x, z, ty) => {
      k.cyl(x, ty - 0.03, z, 0.58, 0.06, WOOD, 1);
      k.cyl(x, ty + 0.004, z, 0.5, 0.008, '#fffdf4', 0);
      k.cyl(x, F + (ty - F) / 2, z, 0.07, ty - F - 0.06, DARK, 0);
      k.cyl(x, F + 0.03, z, 0.34, 0.06, DARK, 1);
      // 설탕 단지와 작은 꽃병
      k.cyl(x + 0.05, ty + 0.06, z + 0.3, 0.05, 0.1, '#fffdf4', 0); k.ball(x + 0.05, ty + 0.12, z + 0.3, 0.02, 0.02, 0.02, '#c9a24a', 0);
      k.cyl(x - 0.1, ty + 0.07, z + 0.3, 0.03, 0.12, '#8fa7b8', 0); k.ball(x - 0.1, ty + 0.18, z + 0.3, 0.05, 0.05, 0.05, '#e88aa0', 0);
    };
    const cupSet = (id, v, ty) => {
      const p = front(v, 0.6);
      const set = (o, c, pf) => {
        o.data.coffee.position.y = 0.075 - c * 0.045; kitScale(o.data.coffee, 1 - c * 0.2);
        o.data.pf.forEach((m, j) => { m.visible = pf < 1 - (j + 1) / (o.data.pf.length + 0.5) + 0.12; });
      };
      api.dyn(id, { x: p.x, y: ty + 0.008, z: p.z, ry: p.ry, label: '찻잔과 파르페',
        clips: {
          serve(o, u, time) { const t = ease(clamp((u - 0.5) / 0.3)); o.root.visible = u > 0.5; o.data.all.position.set(0, (1 - t) * 0.3, -(1 - t) * 0.25); set(o, 0, 0); puff(o.data.puffs, -0.13, 0.12, 0, time, u > 0.6); },
          blow(o, u, time) { o.root.visible = true; o.data.all.position.set(0, 0, 0); set(o, u * 0.5, 0); o.data.coffee.rotation.y = time * 2; o.data.coffee.scale.x = kitBase(o.data.coffee).x * (1 + Math.sin(time * 8) * 0.04); puff(o.data.puffs, -0.13, 0.12, 0, time, true); },
          parfait(o, u, time) { o.root.visible = true; o.data.all.position.set(0, 0, 0); set(o, 0.5 + u * 0.5, u); o.data.spoon.rotation.z = -0.5 + Math.sin(time * 3) * 0.1; puff(o.data.puffs, -0.13, 0.12, 0, time, u < 0.3); },
          keep(o, u, time) { o.root.visible = true; o.data.all.position.set(0, 0, 0); set(o, 1, 1); puff(o.data.puffs, 0, 0, 0, time, false); },
        },
        end(o) { o.root.visible = false; },
      }, (kk, o) => {
        const a = grp(kk.group); o.data.all = a; const ak = makeKit(a, 0, 0, 0);
        // 찻잔과 받침, 작은 숟가락
        ak.cyl(-0.13, 0.01, 0, 0.11, 0.02, '#fffdf4', 1);
        ak.cyl(-0.13, 0.055, 0, 0.07, 0.07, '#fffdf4', 1);
        ak.box(-0.215, 0.055, 0, 0.04, 0.04, 0.02, '#fffdf4', 0);
        ak.cyl(-0.13, 0.092, 0, 0.072, 0.006, '#c9a24a', 0);
        o.data.coffee = ak.cyl(-0.13, 0.075, 0, 0.06, 0.03, '#4a2a1a', 0);
        ak.box(-0.05, 0.025, 0.07, 0.1, 0.008, 0.016, '#c9c4b6', 0);
        // 파르페: 긴 유리잔, 층층이 쌓인 속, 크림과 체리
        ak.cyl(0.15, 0.01, 0, 0.07, 0.02, '#dff3fb', 0);
        ak.cyl(0.15, 0.05, 0, 0.02, 0.07, '#dff3fb', 0);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.045, 0.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#dff3fb', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        glass.position.set(0.15, 0.185, 0); a.add(glass);
        o.data.pf = [
          ak.cyl(0.15, 0.12, 0, 0.045, 0.05, '#f3e3b0', 0), ak.cyl(0.15, 0.17, 0, 0.058, 0.05, '#e88aa0', 0), ak.cyl(0.15, 0.22, 0, 0.07, 0.05, '#fffdf4', 0),
          ak.ball(0.15, 0.29, 0, 0.075, 0.06, 0.075, '#fffffa', 0), ak.ball(0.15, 0.36, 0, 0.03, 0.03, 0.03, '#c8463c', 0),
        ].reverse();
        const sp = grp(a, 0.2, 0.26, 0.02); o.data.spoon = sp; makeKit(sp, 0, 0, 0).cyl(0, 0.08, 0, 0.008, 0.26, '#c9c4b6', 0); sp.rotation.z = -0.5;
        o.data.puffs = steam(kk, 3, -0.13, 0.12, 0);
        o.root.visible = false;
      });
    };
    for (const [n, v] of Object.entries(S)) {
      if (!/^table_sit/.test(n)) continue;
      const ty = v[2] + 0.3, p = front(v, 0.98);
      chair(v[0], v[1], v[2], 1); chair(v[0] + 1.96, v[1], v[2], -1);
      roundTable(p.x, p.z, ty); cupSet(`cup:${n}`, v, ty);
      // 자리 위 전등갓
      api.dyn(`shade:${n}`, { x: p.x, y: F + 2.9, z: p.z, label: '전등', idle(o, time) { o.root.rotation.z = Math.sin(time * 0.9 + p.x) * 0.03; o.data.g.material.opacity = 0.8 + Math.sin(time * 3 + p.x) * 0.05; } },
        (kk, o) => { kk.cyl(0, 0.5, 0, 0.012, 0.9, DARK, 0); kk.cone(0, 0, 0, 0.36, 0.3, '#c9604f', 1); kk.cyl(0, -0.13, 0, 0.37, 0.04, '#c9a24a', 0); o.data.g = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a6', transparent: true, opacity: 0.85 })); o.data.g.position.y = -0.14; kk.group.add(o.data.g); });
    }

    // 긴 바: 손님 쪽 윗면과 한 단 낮은 작업대
    const BT = (S.counter_sit ? S.counter_sit[2] : 0.83) + 0.3, WT = F + 0.82;
    k.box(0.2, F + (BT - F) / 2 - 0.03, -1.35, 9.6, BT - F - 0.06, 0.5, WOOD, 1);
    k.box(0.2, BT - 0.03, -1.35, 9.9, 0.07, 0.7, '#8a5a3c', 1);
    k.box(0.2, BT + 0.006, -1.35, 9.7, 0.006, 0.5, '#a06e4a', 0);
    for (let i = 0; i < 12; i++) k.box(-4.3 + i * 0.82, F + 0.5, -1.09, 0.5, 0.6, 0.02, DARK, 0);
    k.box(0.2, F + 0.16, -1.02, 9.6, 0.05, 0.1, '#c9a24a', 0);
    k.box(0.2, WT - 0.41, -2.0, 9.6, 0.82, 0.7, WOOD, 1);
    k.box(0.2, WT, -2.0, 9.7, 0.04, 0.74, '#d9dde0', 0);
    // 바 의자
    const stool = (x, z, sy) => { k.cyl(x, sy - 0.04, z, 0.26, 0.08, VEL, 1); k.cyl(x, F + (sy - 0.08 - F) / 2, z, 0.05, sy - 0.08 - F, '#c9c4b6', 0); k.cyl(x, F + 0.02, z, 0.24, 0.04, '#9aa0a4', 1); k.cyl(x, F + 0.3, z, 0.18, 0.02, '#c9c4b6', 0); };
    if (S.counter_sit) { const v = S.counter_sit; stool(v[0], v[1], v[2]); for (const dx of [-1.5, 1.5, 3.0]) stool(v[0] + dx, v[1], v[2]); cupSet('cup:counter_sit', v, BT); }
    // 케이크 진열장
    k.box(0.9, BT + 0.02, -1.35, 1.1, 0.04, 0.5, DARK, 1);
    for (let j = 0; j < 4; j++) { k.cyl(0.5 + j * 0.27, BT + 0.05, -1.35, 0.1, 0.012, '#fffdf4', 0); k.cyl(0.5 + j * 0.27, BT + 0.1, -1.35, 0.08, 0.09, ['#f3e3b0', '#e88aa0', '#6b4634', '#fffdf4'][j], 0); k.ball(0.5 + j * 0.27, BT + 0.16, -1.35, 0.025, 0.025, 0.025, ['#c8463c', '#fffdf4', '#c8463c', '#7fb46f'][j], 0); }
    lit(k.group, 1.1, 0.36, 0.5, '#dff3fb', 0.9, BT + 0.22, -1.35, 0.22);
    k.box(0.9, BT + 0.41, -1.35, 1.14, 0.03, 0.54, DARK, 0);

    // 사이펀: 아래 물이 끓어 위로 올라가 갈색이 되고, 다시 내려와 잔에 담긴다
    const ox = S.usual_order ? S.usual_order[0] : 3.6;
    api.dyn('siphon', { x: ox - 0.55, y: BT + 0.01, z: -1.4, obj: 'siphon', label: '사이펀',
      clips: {
        brew(o, u, time) {
          const up = ease(clamp((u - 0.1) / 0.3)), down = ease(clamp((u - 0.55) / 0.2)), pour = ease(clamp((u - 0.8) / 0.15));
          o.data.fire.run(time, u < 0.55);
          o.data.low.scale.y = Math.max(0.05, 1 - up + down * 0.9 - pour * 0.85); o.data.low.material.color.set(down > 0.05 ? '#4a2a1a' : '#bfe6f7');
          o.data.high.visible = up > 0.05 && down < 0.98; o.data.high.scale.y = Math.max(0.05, up - down); o.data.high.material.color.set(u > 0.3 ? '#6a3f22' : '#bfe6f7');
          o.data.bub.forEach((b, j) => { const t = (time * 2 + j * 0.3) % 1; b.visible = u > 0.05 && u < 0.55; b.position.y = 0.2 + t * 0.14; });
          o.data.cup.visible = u > 0.78; o.data.fill.scale.y = Math.max(0.05, pour); puff(o.data.puffs, 0.4, 0.14, 0.15, time, u > 0.85);
        },
      },
      idle(o, time) { o.data.fire.run(time, false); puff(o.data.puffs, 0, 0, 0, time, false); },
      end(o) { o.data.low.scale.y = 1; o.data.low.material.color.set('#bfe6f7'); o.data.high.visible = false; o.data.bub.forEach(b => { b.visible = false; }); o.data.cup.visible = false; },
    }, (kk, o) => {
      kk.box(0, 0.02, 0, 0.4, 0.04, 0.3, DARK, 1);
      kk.cyl(-0.15, 0.4, -0.08, 0.015, 0.76, '#c9a24a', 0); kk.box(-0.07, 0.62, -0.04, 0.18, 0.02, 0.1, '#c9a24a', 0);
      kk.cyl(0, 0.08, 0, 0.05, 0.08, '#c9c4b6', 0);
      o.data.fire = fire(grp(kk.group, 0, 0.12, 0), 0.07, 'gas');
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshBasicMaterial({ color: '#dff3fb', transparent: true, opacity: 0.3, depthWrite: false }));
      bulb.position.y = 0.3; kk.group.add(bulb);
      o.data.low = lit(kk.group, 0.16, 0.14, 0.16, '#bfe6f7', 0, 0.3, 0, 0.9); o.data.low.geometry.translate(0, 0.07, 0); o.data.low.position.y = 0.2;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.24, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#dff3fb', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      top.position.y = 0.58; kk.group.add(top);
      kk.cyl(0, 0.44, 0, 0.02, 0.1, '#dff3fb', 0);
      o.data.high = lit(kk.group, 0.15, 0.18, 0.15, '#6a3f22', 0, 0.47, 0, 0.9); o.data.high.geometry.translate(0, 0.09, 0); o.data.high.visible = false;
      o.data.bub = [0, 1, 2, 3].map(j => { const b = kk.ball(Math.cos(j * 1.6) * 0.05, 0.25, Math.sin(j * 1.6) * 0.05, 0.015, 0.015, 0.015, '#fffffa', 0); b.visible = false; return b; });
      // 내려 받은 잔
      const c = grp(kk.group, 0.4, 0, 0.15); o.data.cup = c; const ck = makeKit(c, 0, 0, 0);
      ck.cyl(0, 0.01, 0, 0.11, 0.02, '#fffdf4', 1); ck.cyl(0, 0.055, 0, 0.07, 0.07, '#fffdf4', 1); ck.box(0.085, 0.055, 0, 0.04, 0.04, 0.02, '#fffdf4', 0);
      o.data.fill = lit(c, 0.1, 0.06, 0.1, '#4a2a1a', 0, 0.03, 0); o.data.fill.geometry.translate(0, 0.03, 0);
      c.visible = false; o.data.puffs = steam(kk, 3, 0.4, 0.14, 0.15);
    });
    // 수동 그라인더와 원두 병
    k.box(ox + 0.9, BT + 0.08, -1.4, 0.2, 0.16, 0.2, WOOD, 1); k.cyl(ox + 0.9, BT + 0.2, -1.4, 0.08, 0.08, '#c9a24a', 0); k.box(ox + 0.98, BT + 0.26, -1.4, 0.2, 0.02, 0.03, '#3f3d3a', 0);
    for (let j = 0; j < 3; j++) { k.cyl(-3.6 + j * 0.3, BT + 0.14, -1.4, 0.1, 0.26, '#dff3fb', 1); k.cyl(-3.6 + j * 0.3, BT + 0.1, -1.4, 0.085, 0.16, ['#4a2a1a', '#6a3f22', '#8a5a3c'][j], 0); k.cyl(-3.6 + j * 0.3, BT + 0.29, -1.4, 0.1, 0.04, DARK, 0); }

    // 개수대: 물줄기와 거품, 씻을 접시가 줄고 씻은 접시가 쌓인다
    const sv = S.staff_side || [-1.2, -2.9, 0.5];
    api.dyn('sink', { x: sv[0], y: WT, z: -2.0, obj: 'sink', label: '개수대',
      clips: {
        wash(o, u, time) {
          o.data.water.visible = true; o.data.water.scale.x = 1 + Math.sin(time * 20) * 0.2;
          o.data.suds.forEach((b, j) => { b.visible = true; b.position.y = -0.02 + Math.sin(time * 4 + j * 1.3) * 0.015; kitScale(b, 0.8 + Math.sin(time * 3 + j) * 0.25); });
          const n = Math.floor(clamp(u) * (o.data.dirty.length + 0.99));
          o.data.dirty.forEach((d, j) => { d.visible = j < o.data.dirty.length - n; }); o.data.clean.forEach((d, j) => { d.visible = j < n; });
          o.data.fly.forEach((b, j) => { const t = (time * 0.7 + j * 0.33) % 1; b.visible = true; b.position.set(Math.sin(j * 2 + time) * 0.12, 0.05 + t * 0.5, 0.05); kitScale(b, 1 - t * 0.6); });
        },
      },
      end(o) { o.data.water.visible = false; o.data.suds.forEach(b => { b.visible = false; }); o.data.fly.forEach(b => { b.visible = false; }); o.data.dirty.forEach(d => { d.visible = true; }); o.data.clean.forEach(d => { d.visible = false; }); },
    }, (kk, o) => {
      kk.box(0, -0.06, 0, 0.8, 0.12, 0.5, '#8f979c', 1);
      kk.box(0, -0.005, 0, 0.7, 0.01, 0.4, '#bfe6f7', 0);
      kk.cyl(0, 0.16, 0.26, 0.022, 0.32, '#c9c4b6', 0); kk.box(0, 0.32, 0.16, 0.04, 0.03, 0.22, '#c9c4b6', 0);
      for (const sx of [-0.08, 0.08]) kk.ball(sx, 0.05, 0.27, 0.03, 0.03, 0.03, sx < 0 ? '#c8463c' : '#3d5a7a', 0);
      o.data.water = lit(kk.group, 0.03, 0.3, 0.03, '#bfe6f7', 0, 0.15, 0.06, 0.7); o.data.water.visible = false;
      o.data.suds = [0, 1, 2, 3, 4, 5].map(j => { const b = kk.ball(-0.25 + j * 0.1, -0.02, (j % 2) * 0.1 - 0.05, 0.05, 0.035, 0.05, '#fffffa', 0); b.visible = false; return b; });
      o.data.fly = [0, 1, 2].map(() => { const b = kk.ball(0, 0.1, 0, 0.03, 0.03, 0.03, '#eaf8ff', 0); b.visible = false; return b; });
      o.data.dirty = [0, 1, 2, 3, 4].map(j => kk.cyl(-0.65, 0.03 + j * 0.035, 0, 0.13, 0.03, j % 2 ? '#fffdf4' : '#f3e3b0', j === 4 ? 1 : 0));
      // 식기 건조대
      kk.box(0.7, 0.02, 0, 0.5, 0.04, 0.4, '#c9c4b6', 1);
      o.data.clean = [0, 1, 2, 3, 4].map(j => { const d = kk.cyl(0.52 + j * 0.09, 0.17, 0, 0.13, 0.025, '#fffdf4', 0); d.rotation.z = Math.PI / 2 - 0.15; d.visible = false; return d; });
      kk.box(0.3, 0.03, -0.2, 0.12, 0.05, 0.08, '#f2d64b', 0);
    });
    k.box(sv[0], F + (sv[2] - F) / 2, sv[1], 6.0, Math.max(0.06, sv[2] - F), 0.9, '#8a5a3c', 1);

    // 뒷벽 찬장: 찻잔 줄, 원두 깡통, 괘종시계, 축음기
    const BZ = -4.3;
    k.box(0.2, F + 0.45, BZ, 8.4, 0.9, 0.7, WOOD, 1);
    k.box(0.2, F + 0.92, BZ, 8.6, 0.05, 0.76, '#8a5a3c', 0);
    for (const y of [1.6, 2.25, 2.9]) k.box(0.2, F + y, BZ - 0.12, 8.4, 0.06, 0.4, WOOD, 1);
    for (const x of [-4.0, 4.4]) k.box(x, F + 1.95, BZ - 0.12, 0.08, 2.1, 0.4, DARK, 0);
    for (let j = 0; j < 14; j++) {
      const x = -3.6 + j * 0.56;
      k.cyl(x, F + 1.68, BZ - 0.1, 0.07, 0.09, ['#fffdf4', '#bfd8e8', '#f3d6dc', '#e9e3b8'][j % 4], 1); k.cyl(x, F + 1.635, BZ - 0.1, 0.1, 0.012, '#fffdf4', 0);
      k.cyl(x, F + 2.4, BZ - 0.1, 0.1, 0.24, ['#8a2f3a', '#3f5a4a', '#c9a24a', '#3d4f7a'][j % 4], 1); k.box(x, F + 2.4, BZ + 0.0, 0.12, 0.1, 0.01, '#fffdf4', 0);
      if (j % 2) k.cyl(x, F + 3.03, BZ - 0.1, 0.09, 0.2, '#dff3fb', 0);
    }
    api.dyn('clock', { x: -5.6, y: F, z: BZ + 0.1, label: '괘종시계', idle(o, time) { o.data.pen.rotation.z = Math.sin(time * 2.4) * 0.3; o.data.min.rotation.z = -time * 0.05; o.data.hr.rotation.z = -time * 0.004; } },
      (kk, o) => {
        kk.box(0, 1.2, 0, 0.7, 2.4, 0.4, DARK, 1); kk.box(0, 2.46, 0, 0.84, 0.12, 0.5, WOOD, 1);
        kk.cyl(0, 1.95, 0.2, 0.26, 0.02, '#fffdf4', 0).rotation.x = Math.PI / 2;
        const hand = (l, w) => { const g = grp(kk.group, 0, 1.95, 0.225); makeKit(g, 0, 0, 0).box(0, l / 2, 0, w, l, 0.01, '#3f3d3a', 0); return g; };
        o.data.min = hand(0.2, 0.02); o.data.hr = hand(0.13, 0.03);
        kk.box(0, 0.95, 0.2, 0.44, 1.1, 0.01, '#2f1f18', 0);
        const p = grp(kk.group, 0, 1.5, 0.22); o.data.pen = p; const pk = makeKit(p, 0, 0, 0); pk.box(0, -0.4, 0, 0.02, 0.8, 0.01, '#c9a24a', 0); pk.cyl(0, -0.82, 0, 0.09, 0.02, '#c9a24a', 0).rotation.x = Math.PI / 2;
      });
    api.dyn('record', { x: 3.4, y: F + 0.95, z: BZ, label: '축음기', idle(o, time) { o.data.disc.rotation.y = time * 3.4; o.data.arm.rotation.y = 0.5 + Math.sin(time * 0.3) * 0.06; o.data.note.forEach((n, j) => { const t = (time * 0.35 + j * 0.5) % 1; n.position.set(0.3 + Math.sin(t * 6 + j) * 0.1, 0.7 + t * 0.7, 0.2); n.scale.setScalar(Math.sin(t * Math.PI)); }); } },
      (kk, o) => {
        kk.box(0, 0.08, 0, 0.7, 0.16, 0.56, WOOD, 1);
        const d = grp(kk.group, -0.05, 0.17, 0); o.data.disc = d; const dk = makeKit(d, 0, 0, 0); dk.cyl(0, 0, 0, 0.24, 0.015, '#2f2f38', 0); dk.cyl(0, 0.01, 0, 0.08, 0.006, '#c8463c', 0); dk.box(0.15, 0.012, 0, 0.1, 0.004, 0.01, '#5a5a62', 0);
        const a = grp(kk.group, 0.28, 0.2, -0.2); o.data.arm = a; makeKit(a, 0, 0, 0).box(0, 0, 0.14, 0.02, 0.02, 0.3, '#c9c4b6', 0);
        const horn = kk.cone(0.3, 0.62, -0.1, 0.3, 0.5, '#c9a24a', 1); horn.rotation.x = Math.PI * 0.62;
        kk.cyl(0.3, 0.3, -0.2, 0.02, 0.3, '#c9a24a', 0);
        o.data.note = [0, 1].map(() => { const g = grp(kk.group); const gk = makeKit(g, 0, 0, 0); gk.ball(0, 0, 0, 0.04, 0.03, 0.02, '#3f3d3a', 0); gk.box(0.035, 0.07, 0, 0.012, 0.14, 0.012, '#3f3d3a', 0); return g; });
      });
    // 창가: 커튼, 화분, 잡지꽂이, 외투걸이
    for (const x of [-6.2, 6.2]) { for (let j = 0; j < 4; j++) k.box(x, F + 1.9, 0.6 + j * 0.34 + (j > 1 ? 1.4 : 0), 0.06, 2.0, 0.3, j % 2 ? '#93434c' : '#7a3540', 1); k.box(x, F + 2.95, 1.8, 0.1, 0.1, 3.4, '#c9a24a', 0); }
    for (const [x, z] of [[-5.9, 3.9], [5.9, 3.9], [5.6, -3.9]]) {
      k.cyl(x, F + 0.25, z, 0.28, 0.5, '#b5653f', 1); k.cyl(x, F + 0.5, z, 0.3, 0.04, '#8a4a2c', 0);
      for (let j = 0; j < 6; j++) { const m = k.ball(x + Math.cos(j * 1.05) * 0.16, F + 1.0 + (j % 2) * 0.2, z + Math.sin(j * 1.05) * 0.16, 0.1, 0.5, 0.05, j % 2 ? '#4f8a52' : '#3f7a4a', 0); m.rotation.z = Math.cos(j * 1.05) * 0.4; m.rotation.x = -Math.sin(j * 1.05) * 0.4; }
    }
    k.box(5.9, F + 0.4, 1.2, 0.5, 0.8, 0.9, WOOD, 1);
    for (let j = 0; j < 5; j++) k.box(5.72, F + 0.6 + (j % 2) * 0.05, 0.86 + j * 0.17, 0.3, 0.44, 0.04, ['#c8463c', '#3d5a7a', '#e3bb4a', '#fffdf4', '#7fb46f'][j], 0);
    k.cyl(-3.0, F + 1.0, 4.2, 0.04, 2.0, DARK, 0); k.cyl(-3.0, F + 0.03, 4.2, 0.26, 0.06, DARK, 1);
    for (let j = 0; j < 4; j++) k.box(-3.0 + Math.cos(j * 1.57) * 0.14, F + 1.9, 4.2 + Math.sin(j * 1.57) * 0.14, 0.05, 0.05, 0.05, '#c9a24a', 0);
    k.ball(-2.86, F + 1.5, 4.2, 0.16, 0.4, 0.1, '#6f6a8a', 0);
    // 칠판 메뉴
    k.box(3.2, F + 0.7, 4.3, 0.8, 1.2, 0.08, DARK, 1);
    text(k, 3.2, F + 0.25, 4.25, 0.7, 1.0, ['커피', '홍차', '파르페', '케이크'], '#fff8e6', 0.13, Math.PI);
  };

  /* ================= 4) 과자의 마치오카 ================= */
  hook('machioka', /과자/, s => ({ basket_pick: 'shelf.pick', inspect_item: 'shelf.hold' }[s.clip] || null));
  hook('machioka', /개구리/, () => 'frog.pat');
  hook('machioka', /뽑기/, s => ({ gum_coin: 'gumball.coin', gum_turn: 'gumball.turn', gum_open: 'gumball.open' }[s.clip] || null));

  FUR.machioka = (k, api, F) => {
    const S = SOCK('machioka');
    const WOOD = '#a06e4a', DARK = '#6f4630';
    const PACK = ['#e3524a', '#f2d64b', '#5aa8d6', '#7fb46f', '#e88aa0', '#f39a3a', '#9a7fd6'];
    // 과자 봉지 하나 (작은 것도 무늬를 넣는다)
    const pack = (kk, x, y, z, c, s = 1) => {
      const g = grp(kk.group, x, y, z), gk = makeKit(g, 0, 0, 0);
      gk.box(0, 0, 0, 0.16 * s, 0.2 * s, 0.05 * s, c, 1);
      gk.box(0, 0.105 * s, 0, 0.16 * s, 0.02 * s, 0.02 * s, '#fffdf4', 0);
      gk.box(0, -0.02 * s, 0.027 * s, 0.1 * s, 0.07 * s, 0.004, '#fffdf4', 0);
      gk.ball(0, 0.05 * s, 0.027 * s, 0.03 * s, 0.03 * s, 0.004, '#fff8a0', 0);
      return g;
    };
    // 앞쪽 진열대 둘: 층층이 과자 상자. 집은 봉지는 그 자리에서 빠진다
    for (const n of ['shelf_look_l', 'shelf_look_r']) {
      const v = S[n]; if (!v) continue;
      const p = front(v, 0.95);
      api.dyn(`shelf:${n}`, { x: p.x, y: F, z: p.z, ry: p.ry, obj: 'shelf', label: '과자 진열대',
        clips: {
          pick(o, u, time) { const t = ease(clamp((u - 0.35) / 0.3)); const m = o.data.pickme; m.visible = u < 0.7; m.position.set(o.data.px, o.data.py + t * 0.28, o.data.pz + t * 0.25); m.rotation.z = Math.sin(time * 6) * 0.1 * t; o.data.row.forEach((r, j) => { r.rotation.z = Math.sin(time * 5 + j) * 0.04 * (u < 0.35 ? 1 : 0); }); },
          hold(o) { o.data.pickme.visible = false; },
        },
        end(o) { const m = o.data.pickme; m.visible = true; m.position.set(o.data.px, o.data.py, o.data.pz); m.rotation.z = 0; o.data.row.forEach(r => { r.rotation.z = 0; }); },
      }, (kk, o) => {
        // 계단식 대 3단
        o.data.row = [];
        for (let r = 0; r < 3; r++) {
          const y = 0.34 + r * 0.3, z = 0.3 - r * 0.3;
          kk.box(0, y / 2, z, 2.6, y, 0.32, WOOD, 1);
          kk.box(0, y + 0.012, z + 0.15, 2.6, 0.06, 0.03, DARK, 0);
          for (let c = 0; c < 6; c++) {
            const x = -1.08 + c * 0.432;
            kk.box(x, y + 0.05, z, 0.4, 0.1, 0.28, ['#fffdf4', '#f3e3b0'][(r + c) % 2], 1);
            for (let j = 0; j < 2; j++) {
              const g = pack(kk, x - 0.09 + j * 0.18, y + 0.19, z - 0.02, PACK[(r * 3 + c + j) % PACK.length]);
              g.rotation.x = -0.25; o.data.row.push(g);
              if (r === 1 && c === 3 && j === 0) { o.data.pickme = g; o.data.px = g.position.x; o.data.py = g.position.y; o.data.pz = g.position.z; }
            }
            text(kk, x, y - 0.02, z + 0.168, 0.3, 0.1, [['10', '20', '30'][(r + c) % 3]], '#c8463c', 0.07);
          }
        }
        // 대 위에 매달린 과자 줄
        kk.box(0, 2.3, -0.3, 2.7, 0.05, 0.05, DARK, 0);
        for (let c = 0; c < 7; c++) { kk.cyl(-1.14 + c * 0.38, 2.0, -0.3, 0.006, 0.6, '#fffdf4', 0); for (let j = 0; j < 3; j++) pack(kk, -1.14 + c * 0.38, 2.12 - j * 0.22, -0.3, PACK[(c + j * 2) % PACK.length], 0.8); }
      });
    }

    // 뽑기 기계: 동전 넣고, 손잡이 돌리고, 캡슐이 굴러 나와 열린다
    if (S.gumball_stand) {
      const v = S.gumball_stand, p = front(v, 0.72), base = v[2] - F;
      k.box(v[0], F + base / 2, v[1], 0.9, base, 0.8, WOOD, 1);
      k.box(v[0], F + base * 0.25, v[1] + 0.52, 0.7, base * 0.5, 0.26, DARK, 1);
      const CAP = ['#e3524a', '#5aa8d6', '#f2d64b', '#7fb46f', '#e88aa0'];
      const jig = (o, time, a) => o.data.caps.forEach((c, j) => { c.position.y = c.userData.y + Math.abs(Math.sin(time * 9 + j * 1.7)) * 0.03 * a; c.rotation.z = Math.sin(time * 7 + j) * 0.5 * a; });
      api.dyn('gumball', { x: p.x, y: F, z: p.z, ry: p.ry, obj: 'gumball', label: '뽑기 기계',
        clips: {
          coin(o, u, time) { const t = ease(clamp(u / 0.6)); o.data.coin.visible = u < 0.65; o.data.coin.position.set(0.13 + (1 - t) * 0.12, o.data.my + 0.1, 0.26 - t * 0.06 + (1 - t) * 0.12); jig(o, time, 0); o.data.out.visible = false; },
          turn(o, u, time) { o.data.coin.visible = false; o.data.crank.rotation.z = -u * Math.PI * 4; jig(o, time, 1); const t = ease(clamp((u - 0.75) / 0.2)); o.data.out.visible = u > 0.75; o.data.out.position.set(0, o.data.my - 0.2 - t * 0.06, 0.1 + t * 0.2); o.data.out.rotation.x = t * 6; o.data.lidc.position.y = 0; o.data.star.visible = false; },
          open(o, u, time) { jig(o, time, 0); o.data.out.visible = true; o.data.out.position.set(0, o.data.my - 0.26, 0.3); o.data.out.rotation.x = 0; const t = ease(clamp((u - 0.3) / 0.2)); o.data.lidc.position.y = t * 0.12; o.data.lidc.rotation.z = t * 0.9; o.data.star.visible = u > 0.45; o.data.star.position.y = 0.05 + ease(clamp((u - 0.45) / 0.3)) * 0.16; o.data.star.rotation.y = time * 3; },
        },
        end(o) { o.data.coin.visible = false; o.data.out.visible = false; o.data.crank.rotation.z = 0; jig(o, 0, 0); },
      }, (kk, o) => {
        const my = base + 0.35; o.data.my = my;
        kk.box(0, (my - 0.3) / 2, 0, 0.5, my - 0.3, 0.44, '#d9dde0', 1);
        kk.box(0, my - 0.12, 0, 0.56, 0.36, 0.5, '#e3524a', 1);
        kk.box(0, my - 0.2, 0.255, 0.26, 0.14, 0.02, '#2f2f38', 0);
        kk.box(0, my - 0.275, 0.3, 0.3, 0.02, 0.12, '#c9c4b6', 0);
        kk.box(0.13, my + 0.02, 0.255, 0.1, 0.04, 0.02, '#2f2f38', 0);
        text(kk, -0.12, my - 0.04, 0.258, 0.24, 0.12, ['100'], '#fff8e6', 0.08);
        const cr = grp(kk.group, 0.13, my - 0.08, 0.27); o.data.crank = cr; const crk = makeKit(cr, 0, 0, 0);
        crk.cyl(0, 0, 0, 0.06, 0.03, '#c9c4b6', 1).rotation.x = Math.PI / 2; crk.box(0, 0, 0.03, 0.03, 0.14, 0.02, '#9aa0a4', 0);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: '#dff3fb', transparent: true, opacity: 0.28, depthWrite: false }));
        globe.position.y = my + 0.32; kk.group.add(globe);
        kk.cyl(0, my + 0.62, 0, 0.14, 0.06, '#e3524a', 1); kk.ball(0, my + 0.67, 0, 0.04, 0.03, 0.04, '#c9c4b6', 0);
        o.data.caps = [];
        for (let j = 0; j < 14; j++) {
          const a = j * 2.4, r = 0.06 + (j % 4) * 0.05, y = my + 0.14 + Math.floor(j / 5) * 0.11;
          const g = grp(kk.group, Math.cos(a) * r, y, Math.sin(a) * r), gk = makeKit(g, 0, 0, 0);
          gk.ball(0, 0, 0, 0.055, 0.055, 0.055, CAP[j % 5], 0); gk.ball(0, 0.012, 0, 0.056, 0.045, 0.056, '#fffdf4', 0);
          g.userData.y = y; o.data.caps.push(g);
        }
        o.data.coin = kk.cyl(0.13, my + 0.1, 0.3, 0.03, 0.008, '#e3bb4a', 0); o.data.coin.rotation.x = Math.PI / 2; o.data.coin.visible = false;
        const out = grp(kk.group, 0, my - 0.26, 0.3); o.data.out = out; const ok = makeKit(out, 0, 0, 0);
        ok.ball(0, 0, 0, 0.06, 0.06, 0.06, '#5aa8d6', 0);
        const lid = grp(out); o.data.lidc = lid; makeKit(lid, 0, 0, 0).ball(0, 0.015, 0, 0.062, 0.05, 0.062, '#fffdf4', 0);
        const st = grp(out, 0, 0.05, 0); o.data.star = st; const sk = makeKit(st, 0, 0, 0);
        sk.ball(0, 0, 0, 0.035, 0.035, 0.012, '#f2d64b', 0); for (let j = 0; j < 5; j++) sk.box(Math.cos(j * 1.257 + 1.57) * 0.04, Math.sin(j * 1.257 + 1.57) * 0.04, 0, 0.022, 0.022, 0.01, '#f2d64b', 0);
        st.visible = false; out.visible = false;
      });
    }

    // 개구리 인형: 쓰다듬으면 눌렸다 튀어 오른다
    if (S.frog_look) {
      const v = S.frog_look, p = front(v, 0.95);
      api.dyn('frog', { x: p.x, y: Math.max(F, v[2]) , z: p.z, ry: p.ry, obj: 'frog', label: '개구리 인형',
        clips: { pat(o, u, time) { const s = Math.sin(time * 5); o.data.body.scale.set(1 + Math.max(0, s) * 0.1, 1 - Math.max(0, s) * 0.16, 1 + Math.max(0, s) * 0.1); o.data.eyes.forEach(e => { e.scale.y = s > 0.2 ? 0.25 : 1; }); o.data.body.rotation.z = Math.sin(time * 2.5) * 0.04; } },
        idle(o, time) { const s = 1 + Math.sin(time * 1.2) * 0.015; o.data.body.scale.set(s, 2 - s, s); },
        end(o) { o.data.body.rotation.z = 0; o.data.eyes.forEach(e => { e.scale.y = 1; }); },
      }, (kk, o) => {
        kk.box(0, 0.08, 0, 0.9, 0.16, 0.8, DARK, 1);
        const b = grp(kk.group, 0, 0.16, 0); o.data.body = b; const bk = makeKit(b, 0, 0, 0);
        bk.ball(0, 0.34, 0, 0.36, 0.34, 0.32, '#7fbf5a', 1);
        bk.ball(0, 0.28, 0.12, 0.26, 0.24, 0.24, '#e9f0b8', 0);
        for (const sx of [-1, 1]) {
          bk.ball(sx * 0.17, 0.68, 0.08, 0.12, 0.12, 0.12, '#7fbf5a', 1);
          bk.ball(sx * 0.3, 0.1, 0.16, 0.14, 0.08, 0.18, '#6aa84a', 1);
          bk.ball(sx * 0.2, 0.3, 0.3, 0.06, 0.1, 0.05, '#6aa84a', 0);
          bk.ball(sx * 0.2, 0.44, 0.3, 0.035, 0.02, 0.01, '#f2a0a8', 0);
        }
        o.data.eyes = [-1, 1].map(sx => { const g = grp(b, sx * 0.17, 0.7, 0.17), gk = makeKit(g, 0, 0, 0); gk.ball(0, 0, 0, 0.07, 0.07, 0.03, '#fffdf4', 0); gk.ball(0, 0, 0.025, 0.035, 0.04, 0.012, '#3f3d3a', 0); return g; });
        bk.box(0, 0.5, 0.31, 0.2, 0.014, 0.01, '#3f5a3a', 0);
        bk.box(0, 0.14, 0.3, 0.22, 0.12, 0.01, '#fffdf4', 0);
      });
    }

    // 가게 안: 계산대, 벽 선반, 사탕 단지, 아이스크림 냉동고, 음료 냉장고
    k.box(0, F + 0.4, 1.4, 2.6, 0.8, 0.8, WOOD, 1);
    k.box(0, F + 0.82, 1.4, 2.8, 0.05, 0.9, '#c9a57c', 1);
    k.box(-0.8, F + 0.97, 1.4, 0.5, 0.26, 0.44, '#3f3d3a', 1); k.box(-0.8, F + 1.13, 1.52, 0.4, 0.1, 0.16, '#5a5a62', 0);
    for (let j = 0; j < 6; j++) k.box(-0.94 + (j % 3) * 0.14, F + 1.115, 1.3 + Math.floor(j / 3) * 0.12, 0.1, 0.02, 0.08, '#fffdf4', 0);
    for (let j = 0; j < 4; j++) {
      const x = 0.1 + j * 0.3;
      k.cyl(x, F + 1.0, 1.4, 0.11, 0.3, '#dff3fb', 1); k.cyl(x, F + 1.17, 1.4, 0.12, 0.04, '#e3524a', 0);
      for (let c = 0; c < 6; c++) k.ball(x + Math.cos(c * 1.1) * 0.05, F + 0.9 + (c % 3) * 0.06, 1.4 + Math.sin(c * 1.1) * 0.05, 0.03, 0.03, 0.03, PACK[(j + c) % PACK.length], 0);
    }
    const BZ = -4.2;
    for (const [x0, x1] of [[-6.3, -0.5], [0.5, 6.3]]) {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      k.box(cx, F + 1.5, BZ, w, 3.0, 0.5, WOOD, 1);
      for (let r = 0; r < 5; r++) {
        k.box(cx, F + 0.3 + r * 0.58, BZ + 0.27, w, 0.05, 0.1, DARK, 0);
        for (let c = 0; c < Math.floor(w / 0.42); c++) {
          const x = x0 + 0.26 + c * 0.42;
          k.box(x, F + 0.5 + r * 0.58, BZ + 0.2, 0.36, 0.32, 0.2, PACK[(r * 2 + c) % PACK.length], 1);
          k.box(x, F + 0.5 + r * 0.58, BZ + 0.305, 0.24, 0.14, 0.006, '#fffdf4', 0);
          k.ball(x, F + 0.5 + r * 0.58, BZ + 0.31, 0.04, 0.04, 0.004, PACK[(r + c * 3 + 2) % PACK.length], 0);
        }
      }
    }
    // 아이스크림 냉동고 (유리 뚜껑 아래 막대 아이스크림)
    k.box(-5.2, F + 0.45, 0.6, 1.8, 0.9, 1.0, '#fffdf4', 1);
    k.box(-5.2, F + 0.2, 1.105, 1.7, 0.2, 0.01, '#5aa8d6', 0);
    text(k, -5.2, F + 0.5, 1.11, 1.4, 0.3, ['아이스'], '#3d5a7a', 0.2);
    for (let j = 0; j < 10; j++) k.box(-5.9 + (j % 5) * 0.35, F + 0.88, 0.4 + Math.floor(j / 5) * 0.4, 0.26, 0.05, 0.14, PACK[j % PACK.length], 0);
    lit(k.group, 1.7, 0.03, 0.9, '#dff3fb', -5.2, F + 0.93, 0.6, 0.3);
    // 음료 냉장고
    k.box(5.4, F + 1.1, 0.4, 1.4, 2.2, 0.9, '#d9dde0', 1);
    k.box(5.4, F + 2.1, 0.86, 1.3, 0.2, 0.01, '#e3524a', 0);
    for (let r = 0; r < 3; r++) { k.box(5.4, F + 0.4 + r * 0.56, 0.84, 1.2, 0.03, 0.04, '#9aa0a4', 0); for (let c = 0; c < 6; c++) k.cyl(4.9 + c * 0.2, F + 0.58 + r * 0.56, 0.74, 0.07, 0.3, ['#7fb46f', '#f39a3a', '#5aa8d6', '#fffdf4'][(r + c) % 4], 0); }
    lit(k.group, 1.24, 1.8, 0.02, '#dff3fb', 5.4, F + 1.05, 0.86, 0.2);
    // 천장에 매달린 종이 풍선과 가면, 바닥의 나무 상자
    for (let j = 0; j < 5; j++) {
      api.dyn(`balloon${j}`, { x: -4 + j * 2, y: F + 3.3, z: 2.4, label: '종이 풍선', idle(o, time) { o.root.rotation.z = Math.sin(time * 1.1 + j * 1.3) * 0.08; o.root.rotation.x = Math.cos(time * 0.9 + j) * 0.05; } },
        (kk) => { kk.cyl(0, -0.2, 0, 0.006, 0.4, '#fffdf4', 0); for (let s = 0; s < 6; s++) { const m = kk.ball(Math.cos(s * 1.047) * 0.07, -0.58, Math.sin(s * 1.047) * 0.07, 0.12, 0.2, 0.12, PACK[(j + s) % PACK.length], 0); m.rotation.y = s; } kk.cyl(0, -0.38, 0, 0.04, 0.02, '#c9c4b6', 0); });
    }
    for (const [x, z, c] of [[-2.2, 2.2, '#c9a57c'], [2.4, 2.4, '#d9b98c'], [-6.2, 2.3, '#c9a57c']]) {
      k.box(x, F + 0.2, z, 0.8, 0.4, 0.6, c, 1);
      for (let j = 0; j < 6; j++) k.cyl(x - 0.25 + (j % 3) * 0.25, F + 0.46, z - 0.12 + Math.floor(j / 3) * 0.24, 0.07, 0.16, ['#7fb46f', '#bfe6f7'][j % 2], 0);
    }
  };

  /* ================= 5) 약국 ================= */
  hook('pharmacy', /약 사 먹기|약 구경|약국 정리/, s => (s.socket === 'shelf_look' ? (s.act === 'browse' && s.min > 10 ? 'chest.sort' : 'chest.pull') : s.socket === 'counter_stand' ? 'counter.mix' : null));

  FUR.pharmacy = (k, api, F) => {
    const S = SOCK('pharmacy');
    const WOOD = '#7a5238', DARK = '#4f3324', PALE = '#e9e3d0';
    // 계산대: 유리 진열 카운터 위에 약절구, 천칭, 약봉지
    const cv = S.counter_stand || [0, 2.7, 0.45, 0, 0.7];
    const CT = cv[2] + 0.6, cz = cv[1] - 1.0;
    k.box(cv[0], F + (cv[2] - F) / 2, cv[1], 1.2, Math.max(0.06, cv[2] - F), 0.8, WOOD, 1);
    k.box(cv[0], F + (cv[2] - F) / 4, cv[1] + 0.52, 0.9, Math.max(0.04, (cv[2] - F) / 2), 0.26, DARK, 1);
    k.box(cv[0], F + (CT - F) / 2 - 0.03, cz, 5.4, CT - F - 0.06, 0.8, WOOD, 1);
    k.box(cv[0], CT - 0.03, cz, 5.6, 0.07, 0.94, '#c9a57c', 1);
    lit(k.group, 5.0, CT - F - 0.3, 0.02, '#dff3fb', cv[0], F + (CT - F) / 2, cz + 0.41, 0.25);
    for (let j = 0; j < 12; j++) { k.box(cv[0] - 2.3 + j * 0.42, F + 0.34, cz + 0.36, 0.3, 0.2, 0.06, ['#fffdf4', '#bfd8e8', '#f3d6dc', '#d9e8c0'][j % 4], 0); k.box(cv[0] - 2.3 + j * 0.42, F + 0.34, cz + 0.392, 0.16, 0.08, 0.004, ['#c8463c', '#3d5a7a', '#3f7a4a'][j % 3], 0); }
    for (let j = 0; j < 9; j++) k.cyl(cv[0] - 2.2 + j * 0.55, F + 0.66, cz + 0.34, 0.07, 0.16, ['#8a5a3c', '#3f5a4a', '#fffdf4'][j % 3], 0);
    api.dyn('counter', { x: cv[0], y: CT + 0.006, z: cz, obj: 'counter', label: '약 짓는 자리',
      clips: {
        mix(o, u, time) {
          const g = u < 0.65 ? 1 : 0;
          o.data.pestle.position.set(Math.cos(time * 6) * 0.05 * g, 0.2, Math.sin(time * 6) * 0.05 * g); o.data.pestle.rotation.z = 0.25 + Math.cos(time * 6) * 0.2 * g; o.data.pestle.rotation.x = Math.sin(time * 6) * 0.2 * g;
          o.data.dust.forEach((d, j) => { const t = (time * 1.2 + j * 0.3) % 1; d.visible = g > 0; d.position.set(Math.sin(j * 2) * 0.05, 0.14 + t * 0.14, Math.cos(j * 2) * 0.05); kitScale(d, 1 - t); });
          o.data.beam.rotation.z = Math.sin(time * 2) * 0.12 * clamp((u - 0.3) / 0.2) * (u < 0.8 ? 1 : 0.2);
          const t = ease(clamp((u - 0.68) / 0.2)); o.data.bag.visible = u > 0.68; o.data.bag.position.set(0, (1 - t) * 0.2, 0.3 * t); o.data.bag.rotation.x = (1 - t) * -0.5;
        },
      },
      end(o) { o.data.bag.visible = false; o.data.dust.forEach(d => { d.visible = false; }); o.data.pestle.position.set(0, 0.2, 0); o.data.pestle.rotation.set(0, 0, 0.25); o.data.beam.rotation.z = 0; },
    }, (kk, o) => {
      // 약절구
      const m = grp(kk.group, -0.45, 0, -0.05), mk = makeKit(m, 0, 0, 0);
      mk.cyl(0, 0.07, 0, 0.13, 0.14, '#e8e3d8', 1); mk.cyl(0, 0.142, 0, 0.11, 0.006, '#8a9a5a', 0);
      const ps = grp(m, 0, 0.2, 0); o.data.pestle = ps; const pk = makeKit(ps, 0, 0, 0); pk.cyl(0, 0.04, 0, 0.022, 0.26, '#e8e3d8', 0); pk.ball(0, -0.09, 0, 0.035, 0.035, 0.035, '#e8e3d8', 0); ps.rotation.z = 0.25;
      o.data.dust = [0, 1, 2].map(() => { const d = mk.ball(0, 0.16, 0, 0.02, 0.02, 0.02, '#c9d6a0', 0); d.visible = false; return d; });
      // 천칭
      const s = grp(kk.group, 0.5, 0, -0.1), sk = makeKit(s, 0, 0, 0);
      sk.box(0, 0.02, 0, 0.36, 0.04, 0.16, DARK, 1); sk.cyl(0, 0.2, 0, 0.015, 0.34, '#c9a24a', 0);
      const bm = grp(s, 0, 0.37, 0); o.data.beam = bm; const bk = makeKit(bm, 0, 0, 0);
      bk.box(0, 0, 0, 0.4, 0.015, 0.015, '#c9a24a', 0);
      for (const sx of [-1, 1]) { bk.cyl(sx * 0.19, -0.1, 0, 0.004, 0.2, '#c9a24a', 0); bk.cyl(sx * 0.19, -0.2, 0, 0.07, 0.012, '#c9a24a', 1); }
      bk.ball(-0.19, -0.18, 0, 0.03, 0.02, 0.03, '#8a9a5a', 0); bk.cyl(0.19, -0.185, 0, 0.02, 0.02, '#9aa0a4', 0);
      // 분동 상자와 약포지
      kk.box(0.9, 0.03, 0.05, 0.2, 0.06, 0.12, WOOD, 1); for (let j = 0; j < 4; j++) kk.cyl(0.83 + j * 0.045, 0.075, 0.05, 0.012 + j * 0.003, 0.03, '#c9a24a', 0);
      for (let j = 0; j < 3; j++) kk.box(-0.05 + j * 0.02, 0.006 + j * 0.006, -0.1, 0.16, 0.005, 0.16, '#fffdf4', 0);
      // 약봉지
      const bag = grp(kk.group); o.data.bag = bag; const gk = makeKit(bag, 0, 0, 0);
      gk.box(0, 0.11, 0, 0.2, 0.22, 0.06, '#fffdf4', 1); gk.box(0, 0.225, 0, 0.2, 0.03, 0.07, PALE, 0);
      text(gk, 0, 0.06, 0.033, 0.18, 0.12, ['약'], '#3f7a4a', 0.1);
      bag.visible = false;
    });
    k.box(cv[0] + 2.1, CT + 0.14, cz, 0.5, 0.26, 0.44, '#3f3d3a', 1); k.box(cv[0] + 2.1, CT + 0.3, cz + 0.12, 0.4, 0.1, 0.16, '#5a5a62', 0);
    k.cyl(cv[0] - 2.2, CT + 0.14, cz, 0.12, 0.26, '#dff3fb', 1); k.cyl(cv[0] - 2.2, CT + 0.29, cz, 0.13, 0.04, DARK, 0);
    for (let c = 0; c < 7; c++) k.ball(cv[0] - 2.2 + Math.cos(c) * 0.06, CT + 0.06 + (c % 3) * 0.05, cz + Math.sin(c) * 0.06, 0.03, 0.03, 0.03, ['#f3d6dc', '#fffdf4', '#d9e8c0'][c % 3], 0);

    // 백 가지 약재 서랍장: 서랍이 스르륵 나오고 안에 약재 봉지가 보인다
    const sv = S.shelf_look || [-3.4, -2.4, 0.24, -3.4, -3.95];
    const sp = front(sv, 1.35);
    api.dyn('chest', { x: sp.x, y: F, z: sp.z, ry: sp.ry, obj: 'chest', label: '약재 서랍장',
      clips: {
        pull(o, u) { const t = Math.sin(clamp((u - 0.15) / 0.7) * Math.PI); o.data.dr.forEach((d, j) => { d.position.z = d.userData.z + (j === o.data.main ? ease(clamp(t * 1.6)) * 0.24 : 0); }); },
        sort(o, u) { const n = o.data.near, i = Math.floor(clamp(u, 0, 0.999) * n.length), f = clamp(u, 0, 0.999) * n.length - i; o.data.dr.forEach((d, j) => { d.position.z = d.userData.z + (j === n[i] ? ease(clamp(Math.sin(f * Math.PI) * 1.6)) * 0.24 : 0); }); },
      },
      end(o) { o.data.dr.forEach(d => { d.position.z = d.userData.z; }); },
    }, (kk, o) => {
      kk.box(0, 1.2, -0.02, 3.2, 2.4, 0.5, WOOD, 1);
      kk.box(0, 2.44, -0.02, 3.36, 0.1, 0.6, DARK, 1);
      kk.box(0, 0.06, 0.0, 3.3, 0.12, 0.56, DARK, 0);
      o.data.dr = []; o.data.near = [];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) {
        const g = grp(kk.group, -1.33 + c * 0.38, 0.3 + r * 0.3, 0.14), gk = makeKit(g, 0, 0, 0);
        gk.box(0, 0, 0, 0.34, 0.26, 0.24, r % 2 === c % 2 ? '#8f6244' : '#855a3e', 1);
        gk.box(0, 0.05, 0.122, 0.2, 0.08, 0.004, PALE, 0);
        gk.cyl(0, -0.06, 0.13, 0.025, 0.02, '#c9a24a', 0).rotation.x = Math.PI / 2;
        gk.box(0, 0.06, -0.02, 0.26, 0.1, 0.16, ['#8a9a5a', '#c9a57c', '#b5653f', '#e9e3b8'][(r + c) % 4], 0);
        g.userData.z = 0.14; o.data.dr.push(g);
        if (r >= 1 && r <= 3 && c >= 2 && c <= 5) o.data.near.push(o.data.dr.length - 1);
        if (r === 2 && c === 4) o.data.main = o.data.dr.length - 1;
      }
      // 서랍장 위 큰 약단지
      for (let j = 0; j < 5; j++) { kk.cyl(-1.2 + j * 0.6, 2.67, 0, 0.16, 0.36, ['#3f5a7a', '#e8e3d8', '#8a5a3c'][j % 3], 1); kk.cyl(-1.2 + j * 0.6, 2.87, 0, 0.1, 0.06, DARK, 0); kk.box(-1.2 + j * 0.6, 2.66, 0.162, 0.16, 0.14, 0.004, '#fffdf4', 0); }
    });

    // 뒷벽 오른쪽: 약병 선반
    const BZ = sp.z - 0.05;
    k.box(3.2, F + 1.4, BZ, 5.6, 2.8, 0.5, WOOD, 1);
    for (let r = 0; r < 5; r++) {
      k.box(3.2, F + 0.3 + r * 0.54, BZ + 0.27, 5.6, 0.05, 0.1, DARK, 0);
      for (let c = 0; c < 13; c++) {
        const x = 0.7 + c * 0.42, y = F + 0.33 + r * 0.54, kind = (r + c) % 3;
        if (kind === 0) { k.cyl(x, y + 0.15, BZ + 0.2, 0.09, 0.3, ['#7a4a2a', '#3f5a4a', '#3d5a7a'][c % 3], 1); k.cyl(x, y + 0.33, BZ + 0.2, 0.04, 0.08, '#fffdf4', 0); k.box(x, y + 0.14, BZ + 0.292, 0.1, 0.12, 0.004, '#fffdf4', 0); }
        else if (kind === 1) { k.box(x, y + 0.12, BZ + 0.2, 0.3, 0.24, 0.16, ['#fffdf4', '#f3d6dc', '#d9e8c0', '#bfd8e8'][c % 4], 1); k.box(x, y + 0.12, BZ + 0.282, 0.2, 0.06, 0.004, ['#c8463c', '#3f7a4a'][c % 2], 0); }
        else { k.cyl(x, y + 0.11, BZ + 0.2, 0.11, 0.22, '#dff3fb', 0); k.cyl(x, y + 0.08, BZ + 0.2, 0.095, 0.14, ['#f2d64b', '#e88aa0', '#fffdf4'][c % 3], 0); k.cyl(x, y + 0.24, BZ + 0.2, 0.11, 0.04, '#c9c4b6', 0); }
      }
    }
    // 기다리는 긴 의자와 주전자 난로
    const ws = Object.entries(S).filter(([n]) => /^wait_sit/.test(n)).map(([, v]) => v);
    if (ws.length) {
      const x0 = Math.min(...ws.map(v => v[0])) - 0.6, x1 = Math.max(...ws.map(v => v[0])) + 0.6, z = ws[0][1], sy = ws[0][2], bx = (x0 + x1) / 2;
      k.box(bx, sy - 0.05, z, x1 - x0, 0.1, 0.7, '#3f7a6a', 1);
      k.box(bx, sy - 0.13, z, x1 - x0 + 0.04, 0.06, 0.74, WOOD, 0);
      for (const x of [x0 + 0.15, x1 - 0.15]) for (const dz of [-0.28, 0.28]) k.box(x, F + (sy - 0.16 - F) / 2, z + dz, 0.08, sy - 0.16 - F, 0.08, DARK, 0);
      k.box(bx, sy + 0.3, z + 0.36, x1 - x0, 0.6, 0.08, WOOD, 1);
      k.box(bx, sy + 0.3, z + 0.31, x1 - x0 - 0.2, 0.4, 0.03, '#3f7a6a', 0);
      k.box(bx, F + 0.16, z - 0.1, x1 - x0 - 0.2, 0.04, 0.5, DARK, 0);
      // 잡지 탁자
      k.box(x0 - 0.7, F + 0.25, z, 0.6, 0.5, 0.6, WOOD, 1);
      for (let j = 0; j < 3; j++) k.box(x0 - 0.7 + j * 0.03, F + 0.51 + j * 0.015, z, 0.36, 0.014, 0.46, ['#c8463c', '#3d5a7a', '#e3bb4a'][j], 0);
    }
    api.dyn('stove', { x: 6.4, y: F, z: 0.6, label: '주전자 난로', idle(o, time) { o.data.fire.run(time, true); puff(o.data.puffs, 0.2, 1.1, 0, time, true); o.data.lid.position.y = 1.0 + Math.abs(Math.sin(time * 11)) * 0.012; } },
      (kk, o) => {
        kk.cyl(0, 0.3, 0, 0.3, 0.6, '#3f3d3a', 1); kk.cyl(0, 0.62, 0, 0.34, 0.04, '#2f2f38', 1);
        kk.box(0, 0.26, 0.3, 0.24, 0.18, 0.02, '#2f2f38', 0);
        o.data.fire = fire(grp(kk.group, 0, 0.22, 0.26), 0.09, 'wood');
        kk.cyl(0, 1.9, -0.2, 0.07, 2.6, '#5a5a62', 0);
        kk.ball(0, 0.82, 0, 0.22, 0.18, 0.22, '#c9a24a', 1);
        o.data.lid = kk.cyl(0, 1.0, 0, 0.12, 0.03, '#b08a3a', 0); kk.ball(0, 1.03, 0, 0.03, 0.03, 0.03, '#3f3d3a', 0);
        const spout = kk.cyl(0.24, 0.88, 0, 0.03, 0.2, '#c9a24a', 0); spout.rotation.z = -0.9;
        o.data.puffs = steam(kk, 4, 0.2, 1.1, 0);
      });
    // 창가 진열: 큰 약단지, 인삼 병, 저울
    const wv = S.window_look;
    if (wv) {
      const wp = front(wv, 1.3);
      k.box(wp.x, F + 0.35, wp.z, 2.6, 0.7, 0.7, WOOD, 1);
      k.box(wp.x, F + 0.71, wp.z, 2.7, 0.04, 0.76, PALE, 0);
      for (let j = 0; j < 4; j++) {
        const x = wp.x - 0.95 + j * 0.62;
        k.cyl(x, F + 0.95, wp.z, 0.2, 0.44, '#dff3fb', 1); k.cyl(x, F + 0.9, wp.z, 0.18, 0.3, ['#c9a24a', '#8a9a5a', '#b5653f', '#e9e3b8'][j], 0);
        k.cyl(x, F + 1.2, wp.z, 0.21, 0.06, DARK, 0); k.ball(x, F + 1.25, wp.z, 0.04, 0.03, 0.04, '#c9a24a', 0);
        k.box(x, F + 0.95, wp.z + 0.2, 0.18, 0.14, 0.004, '#fffdf4', 0);
      }
    }
    // 벽: 약 간판, 달력, 화분, 우산꽂이
    k.box(-6.6, F + 2.3, 1.5, 0.08, 0.9, 1.6, DARK, 1);
    text(k, -6.54, F + 1.9, 1.5, 1.4, 0.8, ['약'], '#f2d64b', 0.5, Math.PI / 2);
    k.box(7.3, F + 1.9, 3.1, 0.04, 0.8, 0.6, '#fffdf4', 1); k.box(7.27, F + 2.22, 3.1, 0.02, 0.14, 0.6, '#c8463c', 0);
    for (let j = 0; j < 12; j++) k.box(7.27, F + 2.02 - Math.floor(j / 4) * 0.16, 2.9 + (j % 4) * 0.13, 0.01, 0.08, 0.08, '#d9dde0', 0);
    for (const [x, z] of [[-6.6, 4.6], [6.8, 5.4]]) {
      k.cyl(x, F + 0.22, z, 0.26, 0.44, '#e8e3d8', 1);
      for (let j = 0; j < 7; j++) { const m = k.ball(x + Math.cos(j * 0.9) * 0.14, F + 0.8 + (j % 3) * 0.16, z + Math.sin(j * 0.9) * 0.14, 0.09, 0.36, 0.04, j % 2 ? '#4f8a52' : '#3f7a4a', 0); m.rotation.z = Math.cos(j * 0.9) * 0.45; m.rotation.x = -Math.sin(j * 0.9) * 0.45; }
    }
    k.cyl(2.2, F + 0.28, 5.6, 0.2, 0.56, '#3d5a7a', 1);
    for (let j = 0; j < 2; j++) k.cyl(2.16 + j * 0.08, F + 0.66, 5.6, 0.02, 0.9, ['#c8463c', '#f2d64b'][j], 0);
  };

  /* ================= 6) 인터넷 코너 ================= */
  hook('internet', /./, s => ({ type_keys: 'pc.type', click_mouse: 'pc.click', cheer_seat: 'pc.win' }[s.clip] || null));

  FUR.internet = (k, api, F) => {
    const S = SOCK('internet');
    const DESK = '#d9d2c0', LEG = '#7f868a', NAVY = '#3d4f7a';
    k.box(0, F + 0.01, 0.6, 9.6, 0.02, 4.4, '#5a6a8a', 0);
    for (let i = 0; i < 9; i++) k.box(-4.4 + i * 1.1, F + 0.022, 0.6, 0.04, 0.004, 4.4, '#6f7fa0', 0);
    const seats = Object.entries(S).filter(([n]) => /^pc_sit/.test(n));
    for (const [n, v] of seats) {
      const sy = v[2], ty = sy + 0.3, p = front(v, 1.0);
      // 바퀴 의자
      k.box(v[0], sy - 0.05, v[1], 0.62, 0.1, 0.6, NAVY, 1);
      k.cyl(v[0], F + (sy - 0.1 - F) / 2 + 0.03, v[1], 0.05, sy - 0.1 - F - 0.06, LEG, 0);
      for (let j = 0; j < 5; j++) { k.box(v[0] + Math.cos(j * 1.257) * 0.17, F + 0.07, v[1] + Math.sin(j * 1.257) * 0.17, 0.06, 0.04, 0.06, LEG, 0); k.ball(v[0] + Math.cos(j * 1.257) * 0.3, F + 0.04, v[1] + Math.sin(j * 1.257) * 0.3, 0.04, 0.04, 0.04, '#3f3d3a', 0); }
      k.box(v[0], sy + 0.36, v[1] + 0.3, 0.6, 0.66, 0.08, NAVY, 1);
      k.box(v[0], sy + 0.1, v[1] + 0.3, 0.08, 0.2, 0.05, LEG, 0);
      // 책상과 칸막이
      k.box(p.x, ty - 0.03, p.z - 0.1, 2.4, 0.06, 1.1, DESK, 1);
      for (const sx of [-1.1, 1.1]) k.box(p.x + sx, F + (ty - F) / 2 - 0.03, p.z - 0.1, 0.06, ty - F - 0.06, 1.0, LEG, 0);
      k.box(p.x, F + (ty - F) / 2, p.z - 0.6, 2.3, ty - F - 0.1, 0.04, '#c9c2b0', 0);
      for (const sx of [-1.22, 1.22]) k.box(p.x + sx, ty + 0.4, p.z - 0.1, 0.06, 0.9, 1.2, '#b9c4d6', 1);
      k.box(p.x, ty + 0.4, p.z - 0.68, 2.5, 0.9, 0.06, '#b9c4d6', 1);
      // 본체, 컵, 메모지
      k.box(p.x + 0.85, ty + 0.25, p.z - 0.2, 0.24, 0.5, 0.5, '#e8e3d8', 1);
      k.box(p.x + 0.85, ty + 0.38, p.z + 0.052, 0.16, 0.03, 0.004, '#3f3d3a', 0); k.box(p.x + 0.85, ty + 0.3, p.z + 0.052, 0.16, 0.03, 0.004, '#3f3d3a', 0);
      k.cyl(p.x - 0.8, ty + 0.07, p.z + 0.1, 0.06, 0.14, '#fffdf4', 1); k.cyl(p.x - 0.8, ty + 0.19, p.z + 0.1, 0.008, 0.16, '#c8463c', 0);
      for (let j = 0; j < 3; j++) k.box(p.x - 0.8 + j * 0.01, ty + 0.01 + j * 0.008, p.z - 0.3, 0.14, 0.008, 0.14, ['#f2d64b', '#e88aa0', '#bfe6f7'][j], 0);
      k.box(p.x - 0.4, ty + 0.5, p.z - 0.64, 0.3, 0.3, 0.004, '#fff8a0', 0); k.box(p.x + 0.5, ty + 0.56, p.z - 0.64, 0.24, 0.3, 0.004, '#f3d6dc', 0);

      // 컴퓨터: 화면 속 글줄이 늘고, 자판이 눌리고, 마우스가 움직인다
      const screen = (o, mode, u, time) => {
        const d = o.data;
        d.bg.material.color.set(mode === 'win' ? (Math.sin(time * 10) > 0 ? '#fff0a0' : '#ffd0e0') : mode === 'off' ? '#2a3a4a' : '#eaf6ff');
        d.lines.forEach((l, j) => { const t = mode === 'type' ? clamp((u * 3 % 1) * d.lines.length - j) : mode === 'click' ? 1 : 0; l.visible = t > 0.02; l.scale.x = Math.max(0.02, t * (0.6 + (j % 3) * 0.2)); l.position.x = -0.2 + l.scale.x * 0.2; });
        d.win.visible = mode === 'click'; if (mode === 'click') d.win.position.set(Math.sin(time * 0.7) * 0.06, 0.02 + Math.cos(time * 0.5) * 0.03, 0.012);
        d.cur.visible = mode === 'click'; d.cur.position.set(Math.sin(time * 1.9) * 0.16, Math.cos(time * 1.3) * 0.1, 0.02);
        d.stars.forEach((s, j) => { s.visible = mode === 'win'; s.position.set(Math.cos(time * 2 + j * 1.6) * 0.14, Math.sin(time * 2.6 + j * 1.6) * 0.09, 0.02); s.rotation.z = time * 4; });
      };
      api.dyn(`pc:${n}`, { x: p.x, y: ty, z: p.z, ry: p.ry + Math.PI, obj: 'pc', label: '컴퓨터',
        clips: {
          type(o, u, time) { screen(o, 'type', u, time); o.data.keys.forEach((kx, j) => { kx.position.y = 0.03 - (Math.sin(time * 17 + j * 2.9) > 0.75 ? 0.008 : 0); }); o.data.mouse.position.set(-0.34, 0.015, -0.42); },
          click(o, u, time) { screen(o, 'click', u, time); o.data.keys.forEach(kx => { kx.position.y = 0.03; }); o.data.mouse.position.set(-0.34 + Math.sin(time * 1.9) * 0.05, 0.015, -0.42 + Math.cos(time * 1.3) * 0.04); o.data.btn.position.y = Math.sin(time * 6) > 0.6 ? 0.012 : 0.018; },
          win(o, u, time) { screen(o, 'win', u, time); o.data.keys.forEach((kx, j) => { kx.position.y = 0.03 - (Math.sin(time * 9 + j) > 0.9 ? 0.008 : 0); }); },
        },
        idle(o, time) { screen(o, 'off', 0, time); o.data.led.material.color.set(Math.sin(time * 1.5) > 0 ? '#7fe08a' : '#3f7a4a'); },
        end(o) { o.data.keys.forEach(kx => { kx.position.y = 0.03; }); o.data.mouse.position.set(-0.34, 0.015, -0.42); },
      }, (kk, o) => {
        // 볼록한 모니터 (받침, 몸통, 화면)
        kk.box(0, 0.03, 0.1, 0.36, 0.06, 0.3, '#d9d2c0', 1);
        kk.cyl(0, 0.09, 0.1, 0.08, 0.08, '#c9c2b0', 0);
        kk.box(0, 0.36, 0.12, 0.6, 0.46, 0.46, '#e8e3d8', 1);
        kk.box(0, 0.36, -0.115, 0.5, 0.36, 0.01, '#2f2f38', 0);
        const sc = grp(kk.group, 0, 0.36, -0.125); sc.rotation.y = Math.PI;
        o.data.bg = lit(sc, 0.46, 0.32, 0.006, '#2a3a4a', 0, 0, 0);
        o.data.lines = [0, 1, 2, 3, 4].map(j => lit(sc, 0.4, 0.025, 0.004, '#3d5a7a', 0, 0.11 - j * 0.05, 0.008));
        o.data.win = lit(sc, 0.2, 0.14, 0.004, '#ffd9a0', 0, 0, 0.012); o.data.win.visible = false;
        o.data.cur = lit(sc, 0.03, 0.04, 0.004, '#3f3d3a', 0, 0, 0.02); o.data.cur.visible = false;
        o.data.stars = [0, 1, 2, 3].map(j => { const s = lit(sc, 0.05, 0.05, 0.004, ['#f39a3a', '#e3524a', '#5aa8d6', '#7fb46f'][j], 0, 0, 0.02); s.visible = false; return s; });
        o.data.led = lit(kk.group, 0.02, 0.02, 0.01, '#7fe08a', -0.22, 0.16, -0.115);
        // 자판과 마우스 (책상 앞쪽, 앉은 사람 가까이)
        kk.box(-0.05, 0.015, -0.42, 0.5, 0.03, 0.2, '#e8e3d8', 1);
        o.data.keys = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) o.data.keys.push(kk.box(-0.25 + c * 0.05, 0.03, -0.36 - r * 0.055, 0.04, 0.012, 0.04, (r + c) % 5 ? '#fffdf4' : '#c9c2b0', 0));
        kk.box(-0.34, 0.004, -0.42, 0.24, 0.006, 0.2, '#5a6a8a', 0);
        const m = grp(kk.group, -0.34, 0.015, -0.42); o.data.mouse = m; const mk = makeKit(m, 0, 0, 0);
        mk.ball(0, 0, 0, 0.035, 0.022, 0.05, '#e8e3d8', 1); o.data.btn = mk.box(0, 0.018, 0.02, 0.03, 0.008, 0.03, '#c9c2b0', 0);
      });
    }
    // 기다리는 자리: 긴 의자와 번호표 기계
    k.box(-3.6, F + 0.3, 3.0, 2.4, 0.1, 0.6, NAVY, 1);
    for (const x of [-4.6, -2.6]) k.box(x, F + 0.13, 3.0, 0.08, 0.26, 0.5, LEG, 0);
    k.box(-3.6, F + 0.62, 3.3, 2.4, 0.5, 0.06, NAVY, 1);
    // 뒷벽: 공유기(불빛이 깜빡인다), 프린터, 잡지 선반, 이용 안내
    const BZ = -3.2;
    k.box(0, F + 0.4, BZ, 3.0, 0.8, 0.6, DESK, 1);
    k.box(-0.7, F + 0.95, BZ, 0.8, 0.3, 0.5, '#e8e3d8', 1); k.box(-0.7, F + 1.12, BZ + 0.1, 0.6, 0.02, 0.3, '#fffdf4', 0); k.box(-0.7, F + 0.86, BZ + 0.3, 0.6, 0.02, 0.2, '#c9c2b0', 0);
    api.dyn('router', { x: 0.8, y: F + 0.8, z: BZ, label: '공유기', idle(o, time) { o.data.led.forEach((l, j) => l.material.color.set(Math.sin(time * (5 + j * 2.3) + j) > 0 ? '#7fe08a' : '#2f4a3a')); } },
      (kk, o) => { kk.box(0, 0.05, 0, 0.5, 0.1, 0.3, '#3f3d3a', 1); for (const sx of [-0.2, 0.2]) kk.cyl(sx, 0.25, -0.12, 0.012, 0.3, '#3f3d3a', 0); o.data.led = [0, 1, 2, 3, 4].map(j => lit(kk.group, 0.03, 0.02, 0.01, '#7fe08a', -0.16 + j * 0.08, 0.06, 0.155)); });
    for (let j = 0; j < 4; j++) { const m = k.cyl(-1.3 + j * 0.9, F + 0.1, BZ + 0.5, 0.015, 1.2, ['#3f3d3a', '#5a6a8a'][j % 2], 0); m.rotation.z = Math.PI / 2; }
    k.box(4.2, F + 0.9, BZ, 1.4, 1.8, 0.5, DESK, 1);
    for (let r = 0; r < 4; r++) { k.box(4.2, F + 0.24 + r * 0.42, BZ + 0.26, 1.4, 0.04, 0.06, LEG, 0); for (let c = 0; c < 6; c++) k.box(3.68 + c * 0.2, F + 0.44 + r * 0.42, BZ + 0.14, 0.06 + (c % 2) * 0.04, 0.32, 0.26, ['#c8463c', '#3d5a7a', '#e3bb4a', '#7fb46f', '#fffdf4'][(r + c) % 5], 0); }
    k.box(-4.2, F + 2.2, BZ - 0.3, 1.6, 1.0, 0.04, '#fffdf4', 1);
    text(k, -4.2, F + 1.7, BZ - 0.27, 1.5, 0.9, ['이용 안내', '한 사람 한 자리', '조용히'], '#3d5a7a', 0.14);
    k.cyl(4.6, F + 0.22, 3.0, 0.24, 0.44, '#e8e3d8', 1);
    for (let j = 0; j < 6; j++) { const m = k.ball(4.6 + Math.cos(j) * 0.12, F + 0.8 + (j % 3) * 0.14, 3.0 + Math.sin(j) * 0.12, 0.08, 0.34, 0.04, j % 2 ? '#4f8a52' : '#3f7a4a', 0); m.rotation.z = Math.cos(j) * 0.45; m.rotation.x = -Math.sin(j) * 0.45; }
  };

  /*__NEXT__*/
})(typeof self !== 'undefined' ? self : this);
