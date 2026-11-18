'use strict';

// 치이카와 심즈 — 탈것 가게와 내 탈것 (2026-11-12 이재헌님: 자동차·자전거를 사서 타고 다닌다. 차는 원작처럼 토코토코 걷는 느낌)
// 가게: 마당에 전시된 바구니 자전거와 얼굴 달린 꼬마 자동차, 작은 사무실 매대, 깃발 줄.
// 산 탈것은 내린 자리에 세워 두고, 다음에 먼 길을 갈 때 근처에 있으면 걸어가서 타고 간다 (rakko-car.js 방식을 모두에게).
// 자는 동안 탈것은 그 아이 곁으로 옮겨져 있다(집 앞에 세워 둔 셈). 자전거는 페달을 굴리고, 차는 토코토코 통통 튀며 달린다
(function (root) {
  const KINDS = {
    bike: { name: '자전거', cost: 1500, far: 40, near: 30, seat: 0.5, clip: 'ride_pedal' },
    car: { name: '꼬마 자동차', cost: 5000, far: 60, near: 30, seat: 0.42, clip: 'car_drive' },
  };
  const ARRIVE = 12, BOARD = 1.0;
  const COLORS = ['#f4a9bd', '#9fd0ea', '#f3d27a', '#a8d8b4', '#c9b6e4', '#f0a58c'];
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const INK = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
  function part(g, geo, color, x, y, z, ink = 0.03) {
    const m = new THREE.Mesh(geo, toon(color)); m.position.set(x, y, z); m.castShadow = true;
    if (ink) { const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1 + ink); m.add(o); }
    g.add(m); return m;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  /* ---------- 모델 ---------- */
  // 자전거: 앞바구니·벨·흙받이·체인링·받침대. 앞이 +z
  function buildBike(color) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const wheels = [];
    for (const z of [-0.72, 0.72]) {
      const w = new THREE.Group(); w.position.set(0, 0.42, z); body.add(w);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 8, 26), toon('#4a4440')); tire.rotation.y = Math.PI / 2; w.add(tire);
      for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.74, 0.012), toon('#cfcfd6')); sp.rotation.x = (i / 8) * Math.PI; w.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), toon('#cfcfd6')); hub.rotation.z = Math.PI / 2; w.add(hub);
      const fender = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 5, 16, Math.PI * 0.8), toon(color)); fender.rotation.y = Math.PI / 2; fender.rotation.x = z > 0 ? 0.3 : -0.3 + Math.PI * 0.2; fender.position.set(0, 0.42, z); body.add(fender);
      wheels.push(w);
    }
    const tube = (ax, ay, az, bx, by, bz, r = 0.045, c = color) => {
      const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), toon(c));
      m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      const o = new THREE.Mesh(m.geometry, INK); o.scale.set(1.5, 1.01, 1.5); m.add(o); body.add(m); return m;
    };
    tube(0, 0.42, -0.72, 0, 0.5, 0); tube(0, 0.5, 0, 0, 0.86, -0.18); tube(0, 0.86, -0.18, 0, 0.82, 0.56); tube(0, 0.5, 0, 0, 0.82, 0.56);
    tube(0, 0.42, 0.72, 0, 0.98, 0.6, 0.04); tube(0, 0.86, -0.18, 0, 0.42, -0.72, 0.035);
    part(body, new THREE.BoxGeometry(0.16, 0.06, 0.32), '#5a4030', 0, 0.92, -0.2).geometry.translate(0, 0, 0);       // 안장
    tube(-0.26, 1.02, 0.58, 0.26, 1.02, 0.58, 0.03, '#cfcfd6');                                                        // 핸들
    for (const s of [-1, 1]) part(body, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), '#5a4030', s * 0.3, 1.02, 0.58, 0).rotation.z = Math.PI / 2;
    part(body, new THREE.SphereGeometry(0.05, 8, 6), '#e3bb4a', 0.18, 1.07, 0.6, 0);                                 // 벨
    const basket = part(body, new THREE.BoxGeometry(0.42, 0.26, 0.32), '#d2ab78', 0, 0.9, 0.86); basket.material = toon('#d2ab78');
    for (let i = 0; i < 4; i++) part(body, new THREE.BoxGeometry(0.43, 0.012, 0.33), '#b48a59', 0, 0.8 + i * 0.07, 0.86, 0);
    part(body, new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), '#cfcfd6', 0.06, 0.5, 0, 0).rotation.z = Math.PI / 2;  // 체인링
    const lamp = part(body, new THREE.SphereGeometry(0.06, 8, 6), '#fff6d0', 0, 0.92, 1.04, 0);
    lamp.material = new THREE.MeshBasicMaterial({ color: '#fff6d0' });
    const stand = part(body, new THREE.BoxGeometry(0.03, 0.4, 0.03), '#9a9a9a', -0.12, 0.25, -0.1, 0); stand.rotation.z = 0.5;
    return { g, body, wheels, stand, seatZ: -0.12 };
  }
  // 꼬마 자동차: 둥근 차체에 얼굴(눈 전조등·웃는 입), 위가 트인 자리, 바퀴 넷. 앞이 +z
  function buildCar(color) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const dark = new THREE.Color(color).lerp(new THREE.Color('#4a3230'), 0.2).getStyle();
    const shell = part(body, new THREE.SphereGeometry(1, 28, 18), color, 0, 0.62, 0, 0.04); shell.scale.set(0.82, 0.42, 1.08);
    part(body, new THREE.CylinderGeometry(0.58, 0.62, 0.18, 22), dark, 0, 0.92, -0.16, 0.03);                         // 자리 테두리
    part(body, new THREE.CylinderGeometry(0.5, 0.5, 0.2, 22), '#c98a64', 0, 0.86, -0.16, 0);                           // 시트
    for (const s of [-1, 1]) {
      part(body, new THREE.SphereGeometry(0.15, 14, 10), '#fffaf0', s * 0.32, 0.78, 0.92, 0.04);
      const eye = part(body, new THREE.SphereGeometry(0.07, 10, 8), '#3a2a26', s * 0.32, 0.8, 1.04, 0); eye.scale.z = 0.5;
      part(body, new THREE.SphereGeometry(0.06, 8, 6), '#f4a3a8', s * 0.5, 0.6, 0.94, 0).scale.set(1.4, 0.7, 0.5);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), toon('#3a2a26')); mouth.position.set(0, 0.6, 1.07); mouth.rotation.z = Math.PI; body.add(mouth);
    part(body, new THREE.BoxGeometry(0.9, 0.08, 0.1), '#cfcfd6', 0, 0.36, 1.08, 0.03);                                  // 범퍼
    part(body, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 14), '#3a2a26', 0, 1.02, 0.42, 0).rotation.x = -0.9;            // 운전대
    const wheels = [];
    for (const sx of [-0.66, 0.66]) for (const z of [-0.62, 0.6]) {
      const w = new THREE.Group(); w.position.set(sx, 0.24, z); g.add(w);
      const t = part(w, new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16), '#5d5148', 0, 0, 0, 0.05); t.rotation.z = Math.PI / 2;
      part(w, new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12), '#f6efdf', 0, 0, 0, 0).rotation.z = Math.PI / 2;
      wheels.push(w);
    }
    return { g, body, wheels, seatZ: -0.16 };
  }
  const build = (kind, color) => (kind === 'car' ? buildCar(color) : buildBike(color));

  /* ---------- 가게 ---------- */
  const SO = { bike_look: [-3.4, 2.8, 0, -3.4, 0.6], car_look: [3.2, 3.2, 0, 3.2, 0.4], counter_stand: [0, -2.4, 0, 0, -4.4] };
  (root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {})).vehicleShop = SO;
  if (typeof BUILDERS !== 'undefined') BUILDERS.vehicleShop = function (k) {
    // 마당: 밝은 포장 + 주차선
    k.box(0, 0.02, 0, 15, 0.04, 12, '#dcd6c8', 0);
    for (let i = 0; i < 4; i++) k.box(-1 + i * 2.2, 0.045, 0.4, 0.08, 0.01, 3.2, '#fffaf0', 0);
    // 전시 자전거 셋 (받침대에 세워), 자동차 둘
    [['#f4a9bd', -5.2], ['#9fd0ea', -3.4], ['#f3d27a', -1.6]].forEach(([c, x]) => { const b = buildBike(c); b.g.position.set(x, 0, 0.4); b.g.rotation.z = 0.06; k.group.add(b.g); });
    [['#a8d8b4', 1.2], ['#f0a58c', 4.6]].forEach(([c, x], i) => { const m = buildCar(c); m.g.position.set(x + (i ? 0 : 1.0), 0, 0.2); m.g.rotation.y = i ? -0.3 : 0.25; k.group.add(m.g); });
    // 가격판
    for (const [x, t] of [[-3.4, '자전거 1500원'], [3.2, '자동차 5000원']]) {
      k.box(x, 0.5, 2.0, 0.08, 1.0, 0.08, '#8a6242', 0);
      k.box(x, 1.05, 2.0, 1.6, 0.42, 0.06, '#fff4dc', 1);
      k.paint(x, 0.86, 2.04, 1.5, 0.38, g => drawText(g, t, 0, 0.19, 1.4, 0.3, '#6a4128'));
    }
    // 사무실 매대: 줄무늬 차양, 열쇠 걸이, 헬멧
    k.box(0, 0.6, -4.6, 3.6, 1.2, 1.2, '#f3e3c4', 2);
    k.box(0, 1.24, -4.6, 3.8, 0.08, 1.3, '#d8b58a', 1);
    for (const s of [-1, 1]) k.box(s * 1.75, 1.6, -5.1, 0.1, 3.2, 0.1, '#8a6242', 1);
    k.box(0, 2.0, -5.15, 3.5, 1.5, 0.08, '#fffaf0', 1);
    for (let i = 0; i < 6; i++) { k.box(-1.2 + i * 0.48, 1.9, -5.08, 0.03, 0.12, 0.03, '#9a9a9a', 0); k.box(-1.2 + i * 0.48, 1.76, -5.07, 0.12, 0.16, 0.02, COLORS[i], 0); }
    const aw = k.place(roundBoxGeo(4.2, 0.1, 1.6, 0.04), stripeMat('#5f9ac9', '#fffaf0', 9), 0, 3.15, -4.4, 1, 1, 1, inkThin); aw.rotation.x = 0.35;
    k.box(0, 3.75, -5.1, 3.2, 0.7, 0.12, '#fff4dc', 2);
    k.paint(0, 3.45, -5.03, 3.0, 0.62, g => drawText(g, '탈것 가게', 0, 0.31, 2.8, 0.52, '#3d6f9a'));
    k.ball(-1.0, 1.4, -4.4, 0.24, 0.2, 0.24, '#e86a5a', 1); k.ball(-0.4, 1.4, -4.4, 0.24, 0.2, 0.24, '#9fd0ea', 1);
    // 깃발 줄
    for (let i = 0; i < 12; i++) { const f = k.cone(-6 + i * 1.1, 3.4 - Math.sin((i / 11) * Math.PI) * 0.5, 3.6, 0.22, 0.4, COLORS[i % 6], 0); f.rotation.x = Math.PI; }
    for (const x of [-6.6, 6.6]) k.box(x, 1.8, 3.6, 0.1, 3.6, 0.1, '#8a6242', 1);
    k.solidRect(0, -4.6, 3.8, 1.4);
    for (const x of [-5.2, -3.4, -1.6]) k.solidCircle(x, 0.4, 0.5);
    k.solidCircle(2.2, 0.2, 1.1); k.solidCircle(4.6, 0.2, 1.1);
  };

  /* ---------- 사기 ---------- */
  const VO = root.VillageObjects;
  if (VO) {
    const S = (socket, act, min, clip, label) => ({ socket, act, min, clip, prop: null, label });
    const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
    put({ id: 'vehicleShop.buy_bike', place: 'vehicleShop', name: '자전거 사기', cost: KINDS.bike.cost, hours: [10, 18], gain: { fun: 40 },
      steps: [S('bike_look', 'look', 3, 'browse_shelf', '바구니 자전거를 이리저리'), S('bike_look', 'bell', 1.2, 'bell_tap', '따릉!'), S('counter_stand', 'pay', 2, 'pay_wait', '이걸로 주세요'), S('counter_stand', 'joy', 1.5, 'jump_joy', '내 자전거!')] });
    put({ id: 'vehicleShop.buy_car', place: 'vehicleShop', name: '꼬마 자동차 사기', cost: KINDS.car.cost, hours: [10, 18], gain: { fun: 60 },
      steps: [S('car_look', 'look', 3, 'browse_shelf', '자동차 얼굴을 들여다보는 중'), S('car_look', 'pat', 1.6, 'poke_touch', '토닥토닥'), S('counter_stand', 'pay', 2, 'pay_wait', '이 아이로 할게요'), S('counter_stand', 'joy', 1.5, 'jump_joy', '내 차다!')] });
    put({ id: 'vehicleShop.window', place: 'vehicleShop', name: '탈것 구경', hours: [9, 19], gain: { fun: 10 },
      steps: [S('car_look', 'look', 4, 'tilt_look', '반짝반짝 새 차 구경'), S('bike_look', 'look', 3, 'point_ooh', '저 자전거 예쁘다')] });
  }
  if (root.Purpose && root.Purpose.RULES) {
    root.Purpose.RULES.unshift(
      [/^vehicleShop\.buy_bike$/, c => !c.extra && !c.vehicle && (c.money + ((c.bank && c.bank.bal) || 0)) >= KINDS.bike.cost + 300, '탈것이 없고 돈이 넉넉할 때만 자전거를 산다'],
      [/^vehicleShop\.buy_car$/, c => !c.extra && (!c.vehicle || c.vehicle.kind === 'bike') && (c.money + ((c.bank && c.bank.bal) || 0)) >= KINDS.car.cost + 500, '차가 없고 돈이 많을 때만 차를 산다'],
    );
  }

  /* ---------- 내 탈것 ---------- */
  const ST = new Map();          // 아이 id → 상태
  let ctx = null;                // { sim, world, scene }
  function stateOf(c) {
    if (!c.vehicle || !ctx) return null;
    let s = ST.get(c.id);
    if (s && (s.kind !== c.vehicle.kind || s.color !== c.vehicle.color)) { ctx.scene.remove(s.model.g); ST.delete(c.id); s = null; }
    if (!s) {
      const model = build(c.vehicle.kind, c.vehicle.color);
      ctx.scene.add(model.g);
      const p = ctx.sim.snap({ x: c.x + 1.4, z: c.z + 0.6 });
      s = { kind: c.vehicle.kind, color: c.vehicle.color, model, x: p.x, z: p.z, angle: c.angle || 0, mode: 'parked', timer: 0, cool: 0, approach: false, roll: 0 };
      ST.set(c.id, s);
      place(s);
    }
    return s;
  }
  function place(s) {
    s.model.g.position.set(s.x, ctx.world.floorAt(s.x, s.z), s.z);
    s.model.g.rotation.set(0, s.angle, 0);
    if (s.model.stand) s.model.stand.visible = true;
  }
  function intercept(sim, c, target, dt) {
    const s = stateOf(c), K = s && KINDS[s.kind];
    if (!s || s.approach) return undefined;
    if (s.mode === 'driving') {
      s.x = c.x; s.z = c.z; s.angle = c.angle;
      if (dist(c, target) > ARRIVE) return undefined;
      s.mode = 'alight'; s.timer = BOARD; c.moveClip = 'car_hop'; c.driving = false;
      return false;
    }
    if (s.mode === 'alight') { s.timer -= dt; if (s.timer > 0) return false; s.mode = 'parked'; s.cool = 15; c.moveClip = null; place(s); return undefined; }
    if (s.mode === 'board') {
      s.timer -= dt; c.x = s.x; c.z = s.z;
      if (s.timer > 0) return false;
      s.mode = 'driving'; c.driving = true; c.moveClip = K.clip; c.angle = s.angle;
      return undefined;
    }
    if (s.cool > 0) { s.cool -= dt; return undefined; }
    if (dist(c, target) < K.far || dist(c, s) > K.near) return undefined;
    if (dist(c, s) <= 1.4) { s.mode = 'board'; s.timer = BOARD; c.moveClip = 'car_hop'; return false; }
    s.approach = true;
    const r = sim.walk(c, { x: s.x, z: s.z }, dt);
    s.approach = false;
    if (r === null) { s.cool = 30; return undefined; }
    return false;
  }
  function tick(sim, c) {
    const s = ST.get(c.id);
    if (!s) return;
    const busy = c.walking || (c.doing && c.doing.phase === 'walk');
    if (s.mode !== 'parked' && !busy) {
      s.mode = 'parked'; c.driving = false;
      if (/car_drive|car_hop|ride_pedal/.test(c.moveClip || '')) c.moveClip = null;
      place(s);
    }
    // 자는 동안 탈것은 그 아이 곁에 세워져 있다
    if (s.mode === 'parked' && (c.act === 'sleep' || c.clip === 'sleep_breathe') && dist(c, s) > 6) {
      const p = sim.snap({ x: c.x + 2, z: c.z + 1.5 });
      Object.assign(s, { x: p.x, z: p.z }); place(s);
    }
  }
  root.Vehicles = { KINDS, build, state: ST, stateOf };

  // 걷기 가로채기·상태 정리: Village 프로토타입을 감싼다 (랏코는 원래 차를 쓴다)
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const walk0 = VP.walk;
    VP.walk = function (c, target, dt) {
      if (c.vehicle && c.id !== 'rakko' && this.nav && !c.extra) {
        const r = intercept(this, c, target, dt);
        if (r !== undefined) return r;
      }
      return walk0.call(this, c, target, dt);
    };
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      if (!ctx) return;
      for (const c of this.chars) if (c.vehicle) { stateOf(c); tick(this, c); }
    };
  }
  // 저장
  const Lab = root.Labor && root.Labor.prototype;
  if (Lab) {
    const fin0 = Lab.onFinish;
    Lab.onFinish = function (c, x) {
      fin0.apply(this, arguments);
      if (x && x.id === 'vehicleShop.buy_bike') c.vehicle = { kind: 'bike', color: COLORS[(c.id.length * 3) % COLORS.length] };
      if (x && x.id === 'vehicleShop.buy_car') c.vehicle = { kind: 'car', color: COLORS[(c.id.length * 5 + 2) % COLORS.length] };
    };
    const save0 = Lab.save;
    Lab.save = function (c) { const r = save0.call(this, c); if (c.vehicle) r.vehicle = c.vehicle; return r; };
    const load0 = Lab.load;
    Lab.load = function (c, r) { load0.call(this, c, r); if (r && r.vehicle && KINDS[r.vehicle.kind]) c.vehicle = { kind: r.vehicle.kind, color: String(r.vehicle.color || COLORS[0]) }; };
  }

  // 화면: 그리기 직전에 탄 아이를 자리 높이로 올리고 탈것을 그 밑에 붙인다
  function hookRender() {
    const G = root.game;
    if (!G || !G.renderer || !G.sim || !G.actors) { requestAnimationFrame(hookRender); return; }
    ctx = { sim: G.sim, world: G.world, scene: G.scene };
    const render0 = G.renderer.render.bind(G.renderer);
    let last = performance.now();
    G.renderer.render = function (scene, camera) {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const t = now / 1000;
      for (const a of G.actors) {
        const s = ST.get(a.c.id);
        if (!s) continue;
        const K = KINDS[s.kind];
        const riding = s.mode === 'driving' || s.mode === 'board';
        const r = a.built.root;
        if (s.mode === 'driving') {
          s.model.g.position.set(r.position.x, ctx.world.floorAt(r.position.x, r.position.z), r.position.z);
          s.model.g.rotation.y = r.rotation.y;
          s.roll += dt * (s.kind === 'car' ? 9 : 7);
          for (const w of s.model.wheels) w.rotation.x = s.roll;
          if (s.kind === 'car') { s.model.body.position.y = Math.abs(Math.sin(t * 9)) * 0.1; s.model.body.rotation.z = Math.sin(t * 9) * 0.04; }
          else { s.model.body.rotation.z = Math.sin(t * 4) * 0.03; }
          if (s.model.stand) s.model.stand.visible = false;
        } else { s.model.body.position.y = 0; s.model.body.rotation.z = s.kind === 'bike' && s.mode === 'parked' ? 0.08 : 0; }
        a.vehY = (a.vehY || 0) + ((riding ? K.seat : 0) - (a.vehY || 0)) * Math.min(1, dt * 7);
        if (a.vehY > 0.005) {
          r.position.y += a.vehY + (s.kind === 'car' && s.mode === 'driving' ? s.model.body.position.y : 0);
          if (riding) { const sz = s.model.seatZ; r.position.x += Math.sin(r.rotation.y) * sz; r.position.z += Math.cos(r.rotation.y) * sz; }
        }
        if (s.mode === 'board') r.rotation.y = s.angle;
      }
      return render0(scene, camera);
    };
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(hookRender);
}(typeof self !== 'undefined' ? self : this));
