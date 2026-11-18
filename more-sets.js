'use strict';

// 치이카와 심즈 — 남은 옛 건물 실내 세트 (2026-11-10 이재헌 지시, shop-sets.js·public-sets.js에 이어서)
// 옛 GLB 모형의 가구를 걷어 내고(interiors-auto.js), 자리(소켓)는 그대로 둔 채 가구와 움직이는 물건·단계를 새로 놓는다
// 1) 라멘 야마  2) 리사이클 숍  3) 슈퍼 알바이터 시험장  4) 시마지로(섬 라멘)  5) 히로마(모닥불 술자리)
(function (root) {
  const FUR = root.INTERIOR_FURNISH = root.INTERIOR_FURNISH || {};
  const { grp, lit, text, hook, ease, clamp } = root.PublicSets;
  const { front, steam, puff, fire, SOCK } = root.ShopSets;
  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip: clip || null, prop: prop || null, label, fx });
  const put = x => {
    x.sceneKey = 's_none';
    const i = VO.LIST.findIndex(q => q.id === x.id);
    if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
    return x;
  };
  const steps = (id, list) => { const x = VO.BY_ID[id]; if (x) { x.steps = list; x.sceneKey = 's_none'; } };

  // 라멘 그릇: 국물·면·차슈·김·파가 차례로 보이고, 먹을수록 면과 국물이 줄어든다
  function ramenBowl(kk, o) {
    kk.cyl(0, 0.13, 0, 0.36, 0.26, '#f4ead4', 1);
    kk.cyl(0, 0.27, 0, 0.37, 0.02, '#c8463c', 0);
    o.data.soup = kk.cyl(0, 0.2, 0, 0.32, 0.04, '#d9a85a', 0);
    o.data.noodle = kk.ball(0, 0.23, 0.02, 0.24, 0.05, 0.22, '#f1d98a', 0);
    o.data.top = [kk.cyl(-0.12, 0.25, -0.08, 0.1, 0.02, '#c98b6a', 0), kk.box(0.13, 0.27, -0.1, 0.03, 0.14, 0.12, '#2f3b2a', 0), kk.ball(0.08, 0.25, 0.12, 0.08, 0.03, 0.06, '#8fc070', 0)];
    o.data.puffs = steam(kk, 3, 0, 0.35, 0);
  }
  function bowlClips() {
    const fill = (o, u) => { kitScale(o.data.noodle, 1, Math.max(0.05, 1 - u), 1); o.data.soup.position.y = 0.2 - u * 0.08; o.data.top.forEach((t, i) => { t.visible = u < 0.3 + i * 0.2; }); };
    return {
      clips: {
        serve(o, u, time) { o.root.visible = u > 0.5; fill(o, 0); puff(o.data.puffs, 0, 0.35, 0, time, true); },
        eat(o, u, time) { o.root.visible = true; fill(o, u); puff(o.data.puffs, 0, 0.35, 0, time, u < 0.6); },
      },
      end(o, clip) { if (clip === 'eat') { o.root.visible = false; fill(o, 0); } },
    };
  }

  // 1) 라멘 야마: 이재헌 지시로 원래(옛) 실내로 되돌림 (2026-11-10 2차)

  /* ================= 2) 리사이클 숍 ================= */
  steps('recycle.browse', [
    S('browse_stand', 'browse', 4, 'browse_shelf', null, '잡동사니 뒤적이는 중', 'junk.dig'),
    S('browse_stand', 'take', 2, 'inspect_item', null, '이리저리 살펴보는 중', 'junk.lift'),
    S('tv_look', 'gaze', 5, 'tilt_look', null, '중고 텔레비전 보는 중', 'tv.on'),
  ]);
  hook('recycle', /지팡이/, () => 'cane.shine');
  hook('recycle', /정리/, s => (s.act === 'wipe' ? 'tv.on' : s.act === 'browse' ? 'junk.dig' : null));
  FUR.recycle = (k, api, F) => {
    const SK = SOCK('recycle');
    const at = (n, d) => (SK[n] ? front(SK[n], d) : null);
    // 잡동사니 선반: 낡은 주전자·라디오·액자·인형
    const b = at('browse_stand', 1.5);
    if (b) {
      const g = grp(k.group, b.x, F, b.z); g.rotation.y = b.ry;
      const kk = makeKit(g, 0, 0, 0);
      kk.box(0, 1.0, 0, 2.6, 2.0, 0.6, '#a98a66', 1);
      for (const y of [0.35, 1.0, 1.65]) kk.box(0, y, 0.05, 2.5, 0.05, 0.55, '#c9a57c', 0);
      kk.cyl(-0.8, 0.5, 0.1, 0.16, 0.26, '#7f9ec2', 1); kk.box(0.1, 0.5, 0.1, 0.5, 0.26, 0.2, '#6f6a63', 1); kk.box(0.8, 1.2, 0.1, 0.4, 0.34, 0.04, '#e8c97c', 1);
      kk.ball(-0.6, 1.2, 0.1, 0.16, 0.18, 0.14, '#f3a9bd', 1); kk.cyl(0.6, 1.85, 0.1, 0.1, 0.3, '#5a8a6a', 1);
      api.dyn('junk', { x: b.x, y: F + 1.65, z: b.z, ry: b.ry, obj: 'junk', label: '잡동사니',
        clips: { dig(o, u, time) { o.data.box.rotation.z = Math.sin(time * 9) * 0.08; }, lift(o, u) { o.data.box.position.set(0, 0.2 + Math.sin(u * Math.PI) * 0.35, 0.3 + Math.sin(u * Math.PI) * 0.3); o.data.box.rotation.y = u * 3; } },
        end(o) { o.data.box.position.set(0, 0.2, 0); o.data.box.rotation.set(0, 0, 0); },
      }, (kk2, o) => { o.data.box = kk2.box(-0.2, 0.2, 0, 0.4, 0.3, 0.3, '#c79a63', 1); kk2.ball(-0.2, 0.42, 0, 0.1, 0.08, 0.1, '#e3bb4a', 0); });
    }
    // 중고 텔레비전: 켜면 화면이 반짝이고 줄무늬가 흐른다
    const t = at('tv_look', 1.6);
    if (t) api.dyn('tv', { x: t.x, y: F, z: t.z, ry: t.ry, obj: 'tv', label: '중고 텔레비전',
      clips: { on(o, u, time) { o.data.sc.material.color.setHSL((time * 0.2) % 1, 0.5, 0.7); o.data.bar.position.y = 0.95 + ((time * 0.6) % 1) * 0.5; o.data.bar.visible = true; } },
      end(o) { o.data.sc.material.color.set('#3f4a4f'); o.data.bar.visible = false; },
    }, (kk, o) => {
      kk.box(0, 0.35, 0, 1.0, 0.7, 0.6, '#8a5a3c', 1);
      kk.box(0, 1.2, 0, 1.1, 0.9, 0.7, '#d9d2c4', 1);
      o.data.sc = lit(kk.group, 0.8, 0.6, 0.02, '#3f4a4f', 0, 1.2, 0.36);
      o.data.bar = lit(kk.group, 0.8, 0.05, 0.025, '#ffffff', 0, 1.0, 0.37, 0.5);
      o.data.bar.visible = false;
      for (const sx of [-1, 1]) kk.cyl(sx * 0.2, 1.8, 0, 0.01, 0.5, '#3f3d3a', 0).rotation.z = sx * 0.4;
    });
    // 지팡이 진열대: 구경하면 끝의 별이 빛난다 (원작의 소원 지팡이)
    const c = at('cane_look', 1.4);
    if (c) api.dyn('cane', { x: c.x, y: F, z: c.z, ry: c.ry, obj: 'cane', label: '지팡이',
      clips: { shine(o, u, time) { o.data.star.material.color.set(Math.sin(time * 8) > 0 ? '#fff3a0' : '#f2c94c'); o.data.star.scale.setScalar(1 + Math.sin(time * 8) * 0.2); } },
      end(o) { o.data.star.material.color.set('#c8a24a'); o.data.star.scale.setScalar(1); },
    }, (kk, o) => {
      kk.cyl(0, 0.4, 0, 0.35, 0.8, '#8a5a3c', 1);
      kk.cyl(0, 1.2, 0, 0.03, 1.0, '#c9a57c', 1);
      o.data.star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: '#c8a24a' }));
      o.data.star.position.y = 1.75;
      kk.group.add(o.data.star);
    });
    // 계산대
    const r = at('counter_stand', 1.2);
    if (r) { const g = grp(k.group, r.x, F, r.z); g.rotation.y = r.ry; const kk = makeKit(g, 0, 0, 0); kk.box(0, 0.5, 0, 2, 1, 0.8, '#a98a66', 1); kk.box(0.5, 1.15, 0, 0.6, 0.3, 0.45, '#d3d6da', 1); kk.box(-0.5, 1.05, 0, 0.4, 0.1, 0.3, '#f3a9bd', 0); }
  };

  /* ================= 3) 슈퍼 알바이터 시험장 ================= */
  steps('arbiter.ticket_stand.번호표 뽑기', [S('ticket_stand', 'ticket', 1.5, 'poke_touch', null, '번호표 뽑는 중', 'numbers.pull'), S('ticket_stand', 'read', 1, 'inspect_item', null, '몇 번이지', 'numbers.show')]);
  hook('arbiter', /공고/, () => 'notice.flip');
  hook('arbiter', /문제 풀기|공부|시험 보기/, s => (/study|exam/.test(s.act) ? 'paper.write' : null));
  hook('arbiter', /창구/, () => 'window.open');
  FUR.arbiter = (k, api, F) => {
    const SK = SOCK('arbiter');
    const at = (n, d) => (SK[n] ? front(SK[n], d) : null);
    const n = at('ticket_stand', 1.0);
    if (n) api.dyn('numbers', { x: n.x, y: F, z: n.z, ry: n.ry, obj: 'numbers', label: '번호표 기계',
      clips: { pull(o, u) { o.data.t.visible = u > 0.4; o.data.t.position.z = 0.24 + ease(clamp((u - 0.4) / 0.4)) * 0.15; }, show(o, u, time) { o.data.d.material.color.set(Math.sin(time * 6) > 0 ? '#e86a5a' : '#7a2a24'); } },
      end(o) { o.data.t.visible = false; o.data.d.material.color.set('#7a2a24'); },
    }, (kk, o) => {
      kk.cyl(0, 0.5, 0, 0.08, 1.0, '#9aa0a4', 0);
      kk.box(0, 1.25, 0, 0.5, 0.5, 0.4, '#f7dd85', 1);
      o.data.d = lit(kk.group, 0.3, 0.12, 0.02, '#7a2a24', 0, 1.38, 0.21);
      o.data.t = kk.box(0, 1.1, 0.24, 0.16, 0.02, 0.1, '#fffdf4', 0);
      o.data.t.visible = false;
    });
    const no = at('notice_look', 1.3);
    if (no) api.dyn('notice', { x: no.x, y: F, z: no.z, ry: no.ry, obj: 'notice', label: '공고판',
      clips: { flip(o, u) { o.data.page.rotation.x = -Math.sin(u * Math.PI) * 0.8; } }, end(o) { o.data.page.rotation.x = 0; },
    }, (kk, o) => {
      kk.box(0, 1.5, 0, 2.2, 1.4, 0.08, '#c9a57c', 1);
      for (let i = 0; i < 4; i++) kk.box(-0.6 + (i % 2) * 1.2, 1.75 - Math.floor(i / 2) * 0.6, 0.06, 0.8, 0.45, 0.01, '#fffdf4', 0);
      const p = grp(kk.group, 0, 2.05, 0.08); o.data.page = p; makeKit(p, 0, 0, 0).box(0, -0.3, 0, 0.6, 0.6, 0.01, '#ffe27a', 0);
    });
    const w = at('counter_stand', 1.0);
    if (w) api.dyn('window', { x: w.x, y: F, z: w.z, ry: w.ry, obj: 'window', label: '창구',
      clips: { open(o, u) { o.data.sh.position.y = 1.7 + ease(clamp(u * 3)) * 0.6; } }, end(o) { o.data.sh.position.y = 1.7; },
    }, (kk, o) => { kk.box(0, 0.55, 0, 1.8, 1.1, 0.6, '#d9a077', 1); kk.box(0, 2.2, -0.2, 1.8, 1.4, 0.1, '#fff5d6', 1); o.data.sh = kk.box(0, 1.7, 0.0, 1.2, 0.5, 0.04, '#bfe0ef', 1); });
    const d = at('desk_sit', 0.9);
    if (d) api.dyn('paper', { x: d.x, y: F + 0.72, z: d.z, ry: d.ry, obj: 'paper', label: '시험지',
      clips: { write(o, u, time) { const n2 = Math.floor(((time * 0.4) % 1) * 6); o.data.lines.forEach((l, i) => { l.visible = i < n2; }); o.data.pen.position.x = -0.15 + ((time * 1.2) % 1) * 0.3; } },
      end(o) { o.data.lines.forEach(l => { l.visible = false; }); },
    }, (kk, o) => {
      kk.box(0, -0.04, 0, 1.4, 0.08, 0.8, '#c9a57c', 1);
      for (const sx of [-0.6, 0.6]) for (const sz of [-0.3, 0.3]) kk.box(sx, -0.38, sz, 0.08, 0.68, 0.08, '#a98a66', 0);
      kk.box(0, 0.005, 0, 0.5, 0.01, 0.6, '#fffdf4', 0);
      o.data.lines = []; for (let i = 0; i < 6; i++) { const l = kk.box(0, 0.012, -0.22 + i * 0.08, 0.36, 0.003, 0.015, '#5b7f99', 0); l.visible = false; o.data.lines.push(l); }
      const pen = grp(kk.group, 0, 0.06, 0); o.data.pen = pen; makeKit(pen, 0, 0, 0).cyl(0, 0, 0, 0.012, 0.18, '#f2748e', 0).rotation.z = 0.6;
    });
    // 2026-11-10 2차 재제작: 시험장다운 실내 — 칸막이 친 시험석 줄, 벽시계·합격 포스터·알바 직종 안내, 화분, 바닥 줄
    const ds = SK.desk_sit || [-4.6, 1.8, 0.6, -4.6, 0.6];
    for (let i = 1; i <= 3; i++) {
      const x = ds[0] + i * 1.7, z = ds[1] - 1.2;
      k.box(x, F + 0.68, z, 1.3, 0.08, 0.75, '#e9e3d4', 1);
      k.box(x, F + 1.0, z - 0.37, 1.3, 0.6, 0.04, '#cfd6d8', 1);
      for (const sx of [-0.55, 0.55]) k.box(x + sx, F + 0.34, z, 0.07, 0.66, 0.6, '#a98a66', 0);
      k.box(x, F + 0.42, z + 0.75, 0.6, 0.06, 0.5, '#d9a077', 1);
      k.box(x, F + 0.71, z - 0.05, 0.4, 0.01, 0.5, '#fffdf4', 0);
    }
    k.box(0, F + 0.01, 0.4, 10, 0.012, 0.1, '#e3bb4a', 0);
    const wall = (x, z, ry, draw) => { const g = grp(k.group, x, F, z); g.rotation.y = ry; draw(makeKit(g, 0, 0, 0)); };
    wall(-1, -5.6, 0, kk => {
      kk.cyl(0, 3.4, 0.05, 0.4, 0.08, '#fffdf8', 1).rotation.x = Math.PI / 2;
      kk.box(0, 3.5, 0.1, 0.04, 0.24, 0.02, '#3b2a26', 0); kk.box(0.09, 3.4, 0.1, 0.18, 0.04, 0.02, '#3b2a26', 0);
      [['#f7dd85', -2.4], ['#bfe3f2', 2.2], ['#f3a9bd', 3.6]].forEach(([c, x]) => { kk.box(x, 2.4, 0.04, 1.0, 1.3, 0.02, c, 1); kk.box(x, 2.75, 0.06, 0.7, 0.12, 0.01, '#7d5a44', 0); for (let j = 0; j < 3; j++) kk.box(x, 2.45 - j * 0.2, 0.06, 0.6, 0.05, 0.01, '#a98a66', 0); });
    });
    text(k, 2.2, F + 2.95, -5.5, 1.0, 0.3, ['합격 축하'], '#c8463c', 0.14);
    for (const [x, z] of [[-6.5, 4.5], [6.5, -4.5]]) k.planter(x, z, '#fff4e0');
    if (SK.wait_sit) { const v = SK.wait_sit; k.box(v[0], F + 0.62, v[1], 1.6, 0.1, 0.6, '#d9a077', 1); for (const sx of [-0.7, 0.7]) k.box(v[0] + sx, F + 0.3, v[1], 0.1, 0.6, 0.5, '#a98a66', 0); }
  };

  /* ================= 4) 시마지로 (섬 라멘) ================= */
  steps('shimajiro.ramen', [
    S('counter_stand', 'talk', 2, 'talk_order', null, '"라멘 하나요"', 'ladle.dip'),
    S('table_sit_*', 'wait', 3, 'tilt_look', null, '파도 소리 들으며 기다리는 중', 'bowl.serve'),
    S('table_sit_*', 'eat', 18, 'ramen_eat_noodles', null, '후루룩', 'bowl.eat'),
    S('table_sit_*', 'eat', 3, 'ramen_soup', null, '국물 한 모금', 'bowl.eat'),
  ]);
  FUR.shimajiro = (k, api, F) => {
    const SK = SOCK('shimajiro');
    const cs = SK.counter_stand && front(SK.counter_stand, 1.0);
    if (cs) api.dyn('ladle', { x: cs.x, y: F, z: cs.z, ry: cs.ry, label: '국자',
      clips: { dip(o, u, time) { o.data.l.position.y = 1.4 + Math.abs(Math.sin(time * 3)) * 0.25; puff(o.data.p, 0, 1.4, -0.3, time, true); } }, end(o) { o.data.l.position.y = 1.4; },
    }, (kk, o) => {
      kk.box(0, 0.55, 0, 2.4, 1.1, 0.8, '#c9a56a', 1);
      kk.cyl(-0.5, 1.3, -0.3, 0.32, 0.4, '#7f868a', 1);
      const l = grp(kk.group, -0.5, 1.4, -0.3); o.data.l = l; makeKit(l, 0, 0, 0).cyl(0, 0.2, 0, 0.02, 0.5, '#c9c4b6', 0);
      o.data.p = steam(kk, 3, -0.5, 1.5, -0.3);
    });
    for (const [n, v] of Object.entries(SK)) {
      if (!/^table_sit/.test(n)) continue;
      const p = front(v, 1.1);
      k.cyl(p.x, F + 0.36, p.z, 0.75, 0.06, '#c9a56a', 1); k.cyl(p.x, F + 0.18, p.z, 0.1, 0.34, '#8a6a46', 0);
      k.cyl(v[0], F + 0.05, v[1], 0.42, 0.08, '#e8b45a', 1);
      api.dyn(`bowl:${n}`, { x: p.x, y: F + 0.4, z: p.z, ry: p.ry, obj: 'bowl', label: '섬 라멘', ...bowlClips() }, (kk, o) => { ramenBowl(kk, o); o.root.visible = false; });
    }
  };

  /* ================= 5) 히로마 (모닥불 술자리) ================= */
  hook('hiroma', /모닥불 쬐기/, () => 'pit.burn');
  hook('hiroma', /모닥불 앞에 앉기|둘러앉아/, () => 'pit.burn');
  hook('hiroma', /한잔/, s => (/drink|pour/.test(s.act) ? 'cups.clink' : 'pit.burn'));
  FUR.hiroma = (k, api, F) => {
    const SK = SOCK('hiroma');
    const f = SK.fire_stand && front(SK.fire_stand, 1.6);
    if (f) api.dyn('pit', { x: f.x, y: F, z: f.z, label: '모닥불',
      idle(o, time) { o.data.f.run(time, true); }, clips: { burn(o, u, time) { o.data.f.run(time * 1.4, true); } },
    }, (kk, o) => {
      for (let i = 0; i < 10; i++) kk.ball(Math.cos(i * 0.63) * 0.75, 0.1, Math.sin(i * 0.63) * 0.75, 0.2, 0.14, 0.18, i % 2 ? '#8a847a' : '#9d968c', 1);
      const g = grp(kk.group, 0, 0.05, 0); o.data.f = fire(g, 0.45, 'wood');
    });
    // 낮은 상 둘과 술잔
    for (const [n, v] of Object.entries(SK)) {
      if (!/^table_sit/.test(n)) continue;
      const p = front(v, 0.9);
      k.box(p.x, F + 0.38, p.z, 1.4, 0.08, 0.9, '#7d5a44', 1);
      for (const sx of [-0.55, 0.55]) k.box(p.x + sx, F + 0.18, p.z, 0.1, 0.34, 0.7, '#5f4a3a', 0);
      k.box(v[0], F + 0.06, v[1], 0.7, 0.08, 0.7, '#6f6962', 1);
      api.dyn(`cups:${n}`, { x: p.x, y: F + 0.43, z: p.z, ry: p.ry, obj: 'cup', label: '술잔',
        clips: { clink(o, u, time) { o.data.c.forEach((c, i) => { c.position.y = 0.06 + Math.max(0, Math.sin(time * 4 + i)) * 0.15; }); } },
        end(o) { o.data.c.forEach(c => { c.position.y = 0.06; }); },
      }, (kk, o) => {
        kk.cyl(0, 0.16, 0, 0.09, 0.32, '#e8e3d8', 1);
        o.data.c = [-0.25, 0.25].map(x => kk.cyl(x, 0.06, 0.1, 0.06, 0.1, '#fffdf4', 1));
      });
    }
  };
}(typeof self !== 'undefined' ? self : this));

/* ================= 6) 시장 포셰트 노점 (2026-11-10 2차: 포셰트 가게 건물을 없애고 시장 노점으로) ================= */
// 노점 앞에 포셰트를 줄줄이 건 행거와 전신 거울을 두고, 집어 보기 → 돌려 보기 → 거울 앞에서 매어 보기 → 계산까지
(function (root) {
  const VO = root.VillageObjects;
  const FX = root.ActFx && root.ActFx.FX;
  const AS = root.ASSET_SOCKETS;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip: clip || null, prop: prop || null, label });
  const st = AS.market && AS.market.clothes;
  if (!st) return;
  Object.assign(st, { rack_1: [-1.3, 3.1, 0, -1.3, 1.2], rack_2: [1.3, 3.1, 0, 1.3, 1.2], mirror: [3.2, 2.2, 0, 4.4, 2.2] });
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  const ok = id => !!root.ANIMS && !!ANIMS[id];
  const c = (want, alt) => (typeof ANIMS !== 'undefined' && ANIMS[want] ? want : alt);
  put({ id: 'market.pochette_browse', place: 'market', name: '포셰트 노점 구경', gain: { fun: 18 }, hours: [10, 19], sceneKey: 's_pochette',
    steps: [S('clothes.rack_*', 'browse', 3, 'browse_shelf', null, '줄줄이 걸린 포셰트 보는 중'), S('clothes.rack_*', 'take', 1.8, c('pouch_pick', 'plate_pick'), 'pochette', '하나 내려 보는 중'), S('clothes.rack_*', 'read', 3, c('pouch_turn', 'inspect_item'), 'pochette', '이리저리 살펴보는 중'), S('clothes.rack_*', 'take', 1.5, c('pouch_back', 'plate_pick'), null, '도로 거는 중')] });
  put({ id: 'market.pochette_mirror', place: 'market', name: '포셰트 매어 보고 사기', gain: { fun: 24 }, cost: 300, hours: [10, 19], sceneKey: 's_pochette',
    steps: [S('clothes.rack_*', 'take', 1.8, c('pouch_pick', 'plate_pick'), 'pochette', '마음에 드는 걸 고르는 중'), S('clothes.mirror', 'pose', 3.4, c('mirror_try', 'photo_v'), 'pochette', '거울 앞에서 돌아보는 중'), S('clothes.browse_front', 'pay', 2, 'pay_wait', 'pochette', '포셰트 사는 중'), S('clothes.browse_front', 'idle', 1.5, 'jump_joy', 'pochette', '새 포셰트!')] });
  if (!FX) return;
  // 노점 행거: 나무 틀에 색색 포셰트 8개. 단계가 진행되면 고른 하나가 행거에서 빠져 손으로 간다(빈 고리가 남는다). 거울 단계에는 전신 거울
  FX.s_pochette = {
    make(g) {
      const toon = c2 => new THREE.MeshToonMaterial({ color: c2 });
      const box = (w, h, d, c2, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c2)); m.position.set(x, y, z); g.add(m); return m; };
      for (const sx of [-1.1, 1.1]) box(0.08, 1.9, 0.08, '#a97c50', sx, 0.95, -0.2);
      box(2.3, 0.06, 0.06, '#a97c50', 0, 1.85, -0.2);
      const pouches = [];
      const COL = ['#f4a9bd', '#9fd0ea', '#f3d27a', '#a8d8b4', '#c9b6e4', '#f0a58c', '#fffaf0', '#e86a5a'];
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Group();
        p.position.set(-0.95 + i * 0.27, 1.55, -0.18);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 5, 14, Math.PI), toon('#7d5a44'));
        strap.position.y = 0.2; p.add(strap);
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), toon(COL[i])); body.scale.set(1, 0.8, 0.45); p.add(body);
        const flap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(COL[(i + 3) % 8])); flap.scale.set(1.02, 0.4, 0.5); flap.position.y = 0.02; p.add(flap);
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), toon('#e3bb4a')); btn.position.set(0, 0.0, 0.05); p.add(btn);
        g.add(p); pouches.push(p);
      }
      const mirror = new THREE.Group(); mirror.position.set(1.7, 0, 0.2); g.add(mirror);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 0.08), toon('#c9a24a')); fr.position.y = 0.95; mirror.add(fr);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.55), new THREE.MeshBasicMaterial({ color: '#dff3fb' })); gl.position.set(0, 0.95, 0.045); mirror.add(gl);
      return { pouches, mirror };
    },
    run(d, t, u, ctx) {
      const pick = ctx && ctx.step >= 1 ? 3 : -1;
      d.pouches.forEach((p, i) => { p.visible = i !== pick; p.rotation.z = Math.sin(t * 1.3 + i) * 0.06; });
      d.mirror.visible = !!(ctx && ctx.clip && /mirror|photo/.test(ctx.clip));
    },
  };
}(typeof self !== 'undefined' ? self : this));

/* ================= 7) 서서 먹는 소바 단계 개선 (2026-11-10 2차) ================= */
// 식권 누르기 → 서서 기다리기(면 솥이 바빠짐) → 그릇이 밀려 나옴 → 젓가락으로 후루룩 → 그릇 들고 국물 → 그릇 반납하고 인사
// 손에 그릇을 새로 들지 않는다: 카운터 위 그릇(shop-sets bowl:eat_stand_N)이 움직인다
(function (root) {
  const x = root.VillageObjects.BY_ID['soba.soba'];
  if (!x) return;
  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip: clip || null, prop: prop || null, label, fx });
  const has = id => typeof ANIMS !== 'undefined' && !!ANIMS[id];
  x.sceneKey = 's_none';
  x.steps = [
    S('order_front', 'ticket', 2, has('ticket_press') ? 'ticket_press' : 'poke_touch', null, '식권 버튼 꾹', 'ticket.buy'),
    S('eat_stand_*', 'wait', 2.5, 'tilt_look', null, '면 삶기를 기다리는 중'),
    S('eat_stand_*', 'eat', 7, has('noodle_slurp') ? 'noodle_slurp' : 'ramen_eat_noodles', has('chopsticks') ? 'chopsticks' : null, '후루룩 후루룩', 'bowl.eat'),
    S('eat_stand_*', 'drink', 3, 'ramen_soup', null, '그릇째 국물 마시는 중', 'bowl.slurp'),
    S('eat_stand_*', 'bow', 1.5, 'ramen_bow', null, '그릇 올려놓고 잘 먹었습니다', 'bowl.keep'),
  ];
}(typeof self !== 'undefined' ? self : this));
