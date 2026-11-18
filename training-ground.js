'use strict';

// 치이카와 심즈 — 토벌 훈련소 (2026-11-11 이재헌 지시: 상호작용 애니메이션이 있는 새 장소 모델로 다시 배치)
// 통짜 GLB 모형을 걷어 내고 코드로 짓는다. 울타리 친 마당에 허수아비 셋, 매달린 샌드백 둘, 짚 과녁 둘,
// 무기 걸이, 안내판, 물통 옆 벤치. 훈련하는 주민의 휘두르기 박자에 맞춰 허수아비가 맞아 휘청이고 짚이 튀고,
// 샌드백이 밀려나 흔들리고, 과녁이 뒤로 젖혀진다. 아무도 없을 때도 샌드백과 깃발은 바람에 살짝 흔들린다.
(function (root) {
  const ID = 'hunt';
  // 장소 기준 좌표 [x, z, 면 높이, 바라보는 x, 바라보는 z]. 앞(+z)이 정문
  const DUMMIES = [-9, -5, -1].map((x, i) => ({ n: i + 1, x, z: -6 }));
  const BAGS = [5, 9].map((x, i) => ({ n: i + 1, x, z: -6.5 }));
  const TARGETS = [-1.5, 3].map((z, i) => ({ n: i + 1, x: 13, z }));
  const sockets = {
    sign_look: [3, 8.6, 0, 3, 10.4],
    fork_stand: [-11.5, 4.6, 0, -11.5, 6.4],
    rest_sit: [-6, 7.6, 0.45, -6, 5.4],
    water_stand: [-8.6, 7.2, 0, -8.6, 8.6],
  };
  for (const d of DUMMIES) {
    sockets[`ready_${d.n}`] = [d.x, -0.4, 0, d.x, d.z];
    sockets[`dummy_front_${d.n}`] = [d.x, -3.7, 0, d.x, d.z];
  }
  for (const b of BAGS) sockets[`bag_front_${b.n}`] = [b.x, -4.1, 0, b.x, b.z];
  for (const t of TARGETS) sockets[`target_front_${t.n}`] = [t.x - 2.5, t.z, 0, t.x, t.z];
  // 예전 이름을 쓰는 곳(작은 행동 등)이 있으면 그대로 찾게 둔다
  sockets.charge_start = sockets.ready_2;
  sockets.dummy_front = sockets.dummy_front_2;
  sockets.target_front = sockets.target_front_1;

  if (root.GLB_MAP) delete root.GLB_MAP[ID];
  if (root.ASSET_SOCKETS) root.ASSET_SOCKETS[ID] = sockets;

  /* ---------- 상호작용 ---------- */

  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip: clip || null, prop: prop || null, label });
  const put = x => {
    const i = VO.LIST.findIndex(q => q.id === x.id);
    if (i >= 0) VO.LIST[i] = x; else VO.LIST.push(x);
    if (VO.BY_ID) VO.BY_ID[x.id] = x;
  };
  const base = VO.LIST.find(x => x.id === `${ID}.train`) || { gain: { energy: -25, fun: 8, hygiene: -10 }, train: true, hours: [8, 18] };
  const TRAIN = { gain: base.gain, train: true, hours: base.hours || [8, 18] };
  put({ ...TRAIN, id: `${ID}.train`, place: ID, name: '허수아비 치기', steps: [
    S('ready_*', 'brave', 2, 'brave_up', null, '숨을 고르는 중'),
    S('dummy_front_*', 'confront', 12, 'train_swing', 'rod', '허수아비를 치는 중'),
    S('dummy_front_*', 'confront', 10, 'hunt_thrust', 'rod', '찌르기 연습 중'),
    S('dummy_front_*', 'idle', 2, 'idle_stretch', null, '땀을 닦는 중'),
  ] });
  put({ ...TRAIN, id: `${ID}.sandbag`, place: ID, name: '샌드백 치기', steps: [
    S('bag_front_*', 'brave', 1.5, 'brave_up', null, '자세를 잡는 중'),
    S('bag_front_*', 'confront', 18, 'train_swing', 'rod', '샌드백을 치는 중'),
  ] });
  put({ ...TRAIN, id: `${ID}.target`, place: ID, name: '짚 과녁 찌르기', steps: [
    S('target_front_*', 'brave', 1.5, 'brave_up', null, '과녁을 겨누는 중'),
    S('target_front_*', 'confront', 18, 'hunt_thrust', 'rod', '과녁 한가운데를 찌르는 중'),
  ] });
  put({ id: `${ID}.rest`, place: ID, name: '물 마시고 쉬기', gain: { energy: 10, fun: 3 }, hours: [7, 20], steps: [
    S('water_stand', 'drink', 2, 'drink', 'cup', '물통에서 물을 뜨는 중'),
    S('rest_sit', 'rest', 8, 'seat_idle', null, '벤치에서 숨 돌리는 중'),
  ] });

  /* ---------- 짓기 ---------- */

  const COL = {
    wood: '#a06e4a', woodD: '#6f4630', straw: '#e3c77a', strawD: '#c9a24a', sack: '#c9b48a', rope: '#d9c7a0',
    cloth: '#c8463c', iron: '#8f969a', ground: '#d9c9a8', grass: '#9fbf7a', water: '#9fd3e8',
  };
  const field = { parts: [], dummies: [], bags: [], targets: [], flags: [], poles: [], place: null, forkWired: false };
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  function build(scene, world) {
    const p = world.places.find(q => q.id === ID);
    if (!p) return;
    field.place = p;
    const th = ((p.face || 0) * Math.PI) / 2;
    const floor = world.floorAt(p.x, p.z);
    const root3 = new THREE.Group();
    root3.position.set(p.x, floor, p.z);
    root3.rotation.y = th;
    scene.add(root3);
    // 장소 기준 좌표에 놓는 작은 무리: 돌리고 흔들 수 있게 따로 묶는다
    const sub = (x, y, z, ry = 0) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      root3.add(g);
      return { g, k: makeKit(g, 0, 0, 0) };
    };
    const K = sub(0, 0, 0).k;
    const R = rng(77);

    // 바닥: 다진 흙 마당과 가장자리 풀
    K.box(0, 0.02, 0, 30, 0.04, 22, COL.ground, 0);
    for (let i = 0; i < 40; i++) K.ball(-14 + R() * 28, 0.05, -10.5 + R() * 21, 0.12 + R() * 0.12, 0.02, 0.1, R() > 0.5 ? '#cdb994' : '#e6d8b8', 0);
    for (let i = 0; i < 30; i++) {
      const a = R() * Math.PI * 2;
      const x = Math.max(-15, Math.min(15, Math.cos(a) * 16)), z = Math.max(-11.5, Math.min(11.5, Math.sin(a) * 12));
      K.cone(x, 0.2, z, 0.18, 0.4, R() > 0.5 ? COL.grass : '#86a85a', 0);
    }

    // 울타리: 말뚝과 가로대 두 줄, 정문(+z)만 비운다
    const post = (x, z) => { K.cyl(x, 0.6, z, 0.12, 1.2, COL.woodD, 1); K.cone(x, 1.28, z, 0.13, 0.16, COL.woodD, 0); };
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
      for (const y of [0.45, 0.95]) { const m = K.box((x0 + x1) / 2, y, (z0 + z1) / 2, 0.08, 0.12, len, COL.wood, 1); m.rotation.y = a; }
    };
    const W = 15, D = 11;
    const ring = [[-W, D], [-W, -D], [W, -D], [W, D]];
    for (let i = 0; i < 3; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[i + 1];
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 3);
      for (let j = 0; j <= n; j++) post(x0 + (x1 - x0) * (j / n), z0 + (z1 - z0) * (j / n));
      rail(x0, z0, x1, z1);
    }
    for (const s of [-1, 1]) {
      const n = 4;
      for (let j = 0; j <= n; j++) post(s * (3.2 + (W - 3.2) * (j / n)), D);
      rail(s * 3.2, D, s * W, D);
    }
    // 정문 아치와 현판
    for (const s of [-1, 1]) K.cyl(s * 3.2, 1.8, D, 0.2, 3.6, COL.woodD, 1);
    K.box(0, 3.7, D, 7.2, 0.3, 0.34, COL.woodD, 1);
    K.box(0, 3.25, D + 0.05, 4.4, 0.8, 0.12, '#f4e3c4', 1);
    root.PublicSets.text(K, 0, 3.25, D + 0.13, 4.2, 0.7, ['토벌 훈련소'], '#6f4630', 0.5);
    // 깃발 둘: 바람에 펄럭인다
    for (const s of [-1, 1]) {
      const f = sub(s * 4.4, 0, D + 0.2);
      f.k.cyl(0, 2.2, 0, 0.05, 4.4, '#d9d2c2', 0);
      const cloth = sub(0, 0, 0); f.g.add(cloth.g); cloth.g.position.set(0, 3.9, 0);
      cloth.k.box(0.45, 0, 0, 0.9, 0.55, 0.03, COL.cloth, 1);
      field.flags.push({ g: cloth.g, ph: s });
    }

    // 허수아비: 말뚝에 짚 몸통, 자루 머리, 팔 막대. 맞으면 아래 말뚝을 축으로 휘청인다
    for (const d of DUMMIES) {
      const stand = sub(d.x, 0, d.z);
      stand.k.cyl(0, 0.35, 0, 0.09, 0.7, COL.woodD, 1);
      stand.k.box(0, 0.05, 0, 0.9, 0.1, 0.9, COL.wood, 1);
      const body = sub(0, 0.7, 0); stand.g.add(body.g); body.g.position.set(0, 0.7, 0);
      const k = body.k;
      k.cyl(0, 0.9, 0, 0.08, 1.8, COL.woodD, 0);
      k.ball(0, 0.85, 0, 0.42, 0.62, 0.36, COL.straw, 1);
      for (let i = 0; i < 4; i++) k.cyl(0, 0.45 + i * 0.28, 0, 0.43 - Math.abs(i - 1.5) * 0.05, 0.03, COL.rope, 0);
      k.box(0, 1.25, 0, 1.5, 0.08, 0.08, COL.woodD, 1);
      for (const s of [-1, 1]) { k.ball(s * 0.78, 1.25, 0, 0.12, 0.08, 0.08, COL.straw, 0); k.cone(s * 0.88, 1.25, 0, 0.06, 0.18, COL.strawD, 0).rotation.z = -s * Math.PI / 2; }
      k.ball(0, 1.72, 0, 0.3, 0.3, 0.28, COL.sack, 1);
      for (const s of [-1, 1]) k.ball(s * 0.1, 1.76, 0.25, 0.04, 0.04, 0.02, '#3f3d3a', 0);
      k.box(0, 1.6, 0.26, 0.16, 0.02, 0.02, '#3f3d3a', 0);
      k.cyl(0, 1.98, 0, 0.12, 0.1, COL.rope, 0);
      // 맞은 자리 표시: 짚 사이로 드러난 과녁
      k.cyl(0, 0.9, 0.34, 0.16, 0.02, '#fffaf0', 0).rotation.x = Math.PI / 2;
      k.cyl(0, 0.9, 0.35, 0.08, 0.02, COL.cloth, 0).rotation.x = Math.PI / 2;
      const straws = [];
      for (let i = 0; i < 6; i++) { const m = k.box(0, 0.9, 0.3, 0.02, 0.18, 0.02, COL.straw, 0); m.visible = false; straws.push(m); }
      field.dummies.push({ ...d, pivot: body.g, straws, sock: `dummy_front_${d.n}`, tilt: 0, vel: 0, last: -9, fly: [] });
    }

    // 샌드백 틀: 기둥 둘과 들보, 밧줄에 매달린 자루
    const fx0 = BAGS[0].x - 2, fx1 = BAGS[BAGS.length - 1].x + 2;
    for (const x of [fx0, fx1]) { K.cyl(x, 1.9, BAGS[0].z, 0.16, 3.8, COL.woodD, 1); K.box(x, 0.1, BAGS[0].z, 0.8, 0.2, 0.8, COL.wood, 1); }
    K.box((fx0 + fx1) / 2, 3.75, BAGS[0].z, fx1 - fx0 + 0.6, 0.26, 0.26, COL.woodD, 1);
    for (const b of BAGS) {
      const hang = sub(b.x, 3.62, b.z);
      hang.k.cyl(0, -0.45, 0, 0.025, 0.9, COL.rope, 0);
      hang.k.cyl(0, -1.5, 0, 0.34, 1.3, COL.sack, 1);
      hang.k.ball(0, -0.85, 0, 0.34, 0.12, 0.34, COL.sack, 0);
      hang.k.ball(0, -2.15, 0, 0.34, 0.12, 0.34, COL.sack, 0);
      for (const y of [-1.05, -1.95]) hang.k.cyl(0, y, 0, 0.35, 0.05, COL.woodD, 0);
      hang.k.box(0, -1.5, 0.35, 0.3, 0.3, 0.01, '#f4e3c4', 0);
      field.bags.push({ ...b, pivot: hang.g, sock: `bag_front_${b.n}`, ang: 0, vel: 0, last: -9 });
    }

    // 짚 과녁: 다리 셋 받침에 둥근 짚 다발, 가운데 붉은 원. 찌르면 뒤로 젖혀졌다 돌아온다
    for (const t of TARGETS) {
      const base = sub(t.x, 0, t.z, -Math.PI / 2);
      for (const a of [0, 2.1, 4.2]) { const leg = base.k.cyl(Math.cos(a) * 0.35, 0.6, Math.sin(a) * 0.35 - 0.15, 0.05, 1.3, COL.woodD, 0); leg.rotation.x = 0.2; }
      const face = sub(0, 1.2, 0); base.g.add(face.g); face.g.position.set(0, 1.2, 0);
      face.k.cyl(0, 0, 0, 0.75, 0.3, COL.straw, 1).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) face.k.cyl(0, 0, 0.16, 0.6 - i * 0.2, 0.01, i % 2 ? '#fffaf0' : COL.cloth, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i++) { const a = i * 0.63; face.k.box(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0, 0.03, 0.2, 0.03, COL.strawD, 0).rotation.z = a; }
      field.targets.push({ ...t, pivot: face.g, sock: `target_front_${t.n}`, ang: 0, vel: 0, last: -9 });
    }

    // 무기 걸이: 사스마타·목검·방패가 걸려 있다
    const rack = sub(-11.5, 0, 7.4, Math.PI);          // 마당 쪽을 본다
    for (const x of [-1.2, 1.2]) rack.k.cyl(x, 0.9, 0, 0.07, 1.8, COL.woodD, 1);
    for (const y of [0.6, 1.5]) rack.k.box(0, y, 0, 2.6, 0.1, 0.12, COL.wood, 1);
    for (let i = 0; i < 4; i++) {
      const x = -0.9 + i * 0.6;
      const pg = new THREE.Group(); rack.g.add(pg);
      const pk = makeKit(pg, 0, 0, 0);
      const pole = pk.cyl(x, 1.1, 0.12, 0.03, 2, i === 2 ? '#c9a57c' : COL.iron, 0); pole.rotation.z = 0.08;
      if (i !== 2) { pk.box(x + 0.08, 2.1, 0.12, 0.34, 0.04, 0.04, COL.iron, 0); for (const s of [-1, 1]) pk.box(x + 0.08 + s * 0.16, 2.2, 0.12, 0.04, 0.2, 0.04, COL.iron, 0); }
      field.poles.push(pg);
    }
    rack.k.cyl(0.95, 0.95, 0.2, 0.32, 0.08, '#8a5a3c', 1).rotation.x = Math.PI / 2;
    rack.k.cyl(0.95, 0.95, 0.25, 0.12, 0.02, COL.iron, 0).rotation.x = Math.PI / 2;

    // 안내판
    const board = sub(3, 0, 10.4, Math.PI);
    for (const x of [-0.9, 0.9]) board.k.cyl(x, 0.9, 0, 0.07, 1.8, COL.woodD, 1);
    board.k.box(0, 1.5, 0, 2.2, 1.2, 0.1, COL.wood, 1);
    board.k.box(0, 1.5, 0.06, 2, 1, 0.02, '#f4e3c4', 0);
    root.PublicSets.text(board.k, 0, 1.5, 0.08, 1.9, 0.9, ['토벌 주의 사항', '혼자 가지 않기', '무리하지 않기', '다치면 바로 돌아오기'], '#5a3b33', 0.11);

    // 물통과 벤치
    const tub = sub(-8.6, 0, 8.6);
    tub.k.cyl(0, 0.45, 0, 0.55, 0.9, COL.wood, 1);
    for (const y of [0.2, 0.7]) tub.k.cyl(0, y, 0, 0.57, 0.05, COL.iron, 0);
    tub.k.cyl(0, 0.88, 0, 0.5, 0.02, COL.water, 0);
    const ladle = tub.k.cyl(0.3, 1.0, 0, 0.02, 0.6, COL.woodD, 0); ladle.rotation.z = 0.7;
    tub.k.ball(0.08, 0.85, 0, 0.1, 0.06, 0.1, COL.woodD, 0);
    const bench = sub(-6, 0, 7.9);
    bench.k.box(0, 0.42, 0, 2, 0.08, 0.5, COL.wood, 1);
    for (const x of [-0.8, 0.8]) bench.k.box(x, 0.21, 0, 0.1, 0.42, 0.44, COL.woodD, 0);
    bench.k.box(0.7, 0.5, 0, 0.36, 0.06, 0.26, '#fffaf0', 0);

    // 장작 더미와 통나무 (마당 구석)
    for (let i = 0; i < 6; i++) { const m = K.cyl(10 + (i % 3) * 0.4, 0.2 + Math.floor(i / 3) * 0.36, 8.6, 0.18, 1.4, COL.woodD, 1); m.rotation.x = Math.PI / 2; }
  }

  /* ---------- 움직임 ---------- */

  // 지금 이 기구 앞에서 치고 있는 주민 (단계가 'confront'이고 자리에서 하고 있을 때)
  function hitter(sim, sock) {
    return sim.chars.find(c => c.doing && c.doing.x && c.doing.x.place === ID && c.doing.phase === 'use' && !c.walking
      && c.doing.socket && c.doing.socket.name === sock && c.doing.x.steps[c.doing.step] && c.doing.x.steps[c.doing.step].act === 'confront');
  }
  // 휘두르기 한 번에 한 대: 클립 길이마다, 휘두름이 가장 앞으로 나가는 순간(45%)에 맞는다
  function hitNow(c, obj, time) {
    const clip = (root.ANIMS || window.ANIMS || {})[c.clip];
    const dur = (clip && clip.dur) || 1.2;
    const beat = Math.floor((time - 0.45 * dur) / dur);
    if (beat === obj.last) return false;
    obj.last = beat;
    return true;
  }

  function frame(sim, time, dt) {
    if (!field.place) return;
    // 사스마타 들어 보기: 손에 사스마타를 쥐게 하고, 그동안 걸이의 첫 사스마타는 비운다
    if (!field.forkWired) {
      field.forkWired = true;
      for (const x of sim.interactions) if (x.place === ID && /사스마타/.test(x.name)) for (const st of x.steps) st.prop = 'rod';
    }
    const lifting = sim.chars.some(c => c.doing && c.doing.x && c.doing.x.place === ID && /사스마타/.test(c.doing.x.name) && c.doing.phase === 'use');
    if (field.poles[0]) field.poles[0].visible = !lifting;
    dt = Math.min(0.05, dt || 0.016);
    for (const d of field.dummies) {
      const c = hitter(sim, d.sock);
      if (c && hitNow(c, d, time)) {
        d.vel -= 2.6;
        // 짚이 튄다
        d.fly = d.straws.map((m, i) => ({ m, vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random(), vz: 0.6 + Math.random() * 0.6, t: 0, r: i }));
      }
      // 용수철처럼 돌아오는 기울기
      d.vel += (-d.tilt * 40 - d.vel * 5) * dt;
      d.tilt += d.vel * dt;
      d.pivot.rotation.x = d.tilt * 0.35;
      d.pivot.rotation.z = Math.sin(time * 9) * d.tilt * 0.08;
      for (const f of d.fly) {
        f.t += dt;
        f.m.visible = f.t < 0.9;
        f.m.position.set(f.vx * f.t, 0.9 + f.vy * f.t - 4.5 * f.t * f.t, 0.3 + f.vz * f.t);
        f.m.rotation.z = f.t * 8 + f.r;
      }
    }
    for (const b of field.bags) {
      const c = hitter(sim, b.sock);
      if (c && hitNow(c, b, time)) b.vel += 2.2;          // 자루가 치는 사람 반대쪽(-z)으로 밀려난다
      // 진자: 맞으면 뒤로 밀려났다가 흔들리며 멈춘다. 평소에는 바람에 아주 조금
      b.vel += (-b.ang * 9 - b.vel * 0.9) * dt;
      b.ang += b.vel * dt;
      b.pivot.rotation.x = b.ang * 0.5 + Math.sin(time * 0.8 + b.n) * 0.015;
      b.pivot.rotation.z = Math.sin(time * 1.1 + b.n * 2) * 0.012;
    }
    for (const t of field.targets) {
      const c = hitter(sim, t.sock);
      if (c && hitNow(c, t, time)) t.vel -= 3;
      t.vel += (-t.ang * 60 - t.vel * 7) * dt;
      t.ang += t.vel * dt;
      t.pivot.rotation.x = t.ang * 0.4;
    }
    for (const f of field.flags) f.g.rotation.y = Math.sin(time * 2.3 + f.ph) * 0.35;
  }

  root.TrainingGround = { build, frame, sockets, field };
}(typeof self !== 'undefined' ? self : this));
