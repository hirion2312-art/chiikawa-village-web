'use strict';

// 치이카와 심즈 — 랏코의 자동차 (2026-11-09 이재헌 지시 6번)
// 근거: 바이블 "얼굴이 있는 차를 운전한다(운전면허 보유)". 애니메이션 101화 「드라이브①」: 귀엽게 생겼고 걷는 듯한 소리로 달린다.
// 색과 세부 모양은 자료로 확인하지 못했다. 확인되면 COLOR만 바꾼다
(function (root) {
  const COLOR = { body: '#f4d58d', dark: '#d9b566', seat: '#c98a64', tire: '#5d5148', hub: '#f6efdf', ink: '#4a3230' };
  const FAR = 80;        // 이보다 먼 길이면 차를 탄다
  const NEAR_CAR = 16;   // 차가 이 안에 있어야 타러 간다
  const ARRIVE = 16;     // 목적지가 이만큼 남으면 세운다
  const BOARD = 1.2;     // 타고 내리는 시간 (게임 분)
  const SEAT = 0.42;     // 앉은 높이
  const BOOST = 2.6;     // 차로 달리는 속도 배율

  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const inkMat = new THREE.MeshBasicMaterial({ color: COLOR.ink, side: THREE.BackSide });
  function part(group, geo, color, x, y, z, ink = 0.04) {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z);
    group.add(m);
    if (ink) {
      const h = new THREE.Mesh(geo, inkMat);
      h.scale.setScalar(1 + ink);
      m.add(h);
    }
    return m;
  }
  function build() {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    // 차체: 둥근 앞뒤와 낮은 옆판으로 가운데가 뚫린 욕조 모양 (랏코가 그 안에 앉는다)
    const side = new THREE.BoxGeometry(0.2, 0.72, 2.7);
    part(body, side, COLOR.body, -1.22, 0.78, -0.1);
    part(body, side, COLOR.body, 1.22, 0.78, -0.1);
    part(body, new THREE.BoxGeometry(2.64, 0.2, 3.1), COLOR.dark, 0, 0.4, -0.1);
    const nose = part(body, new THREE.SphereGeometry(1, 20, 14), COLOR.body, 0, 0.8, 1.45);
    nose.scale.set(1.3, 0.72, 0.82);
    const tail = part(body, new THREE.SphereGeometry(1, 20, 14), COLOR.body, 0, 0.82, -1.55);
    tail.scale.set(1.3, 0.72, 0.56);
    // 얼굴: 전조등 눈, 볼, 웃는 입
    for (const sx of [-1, 1]) {
      part(body, new THREE.SphereGeometry(0.27, 16, 12), '#fffdf6', sx * 0.62, 1.02, 2.0, 0.05);
      const pupil = part(body, new THREE.SphereGeometry(0.13, 12, 10), '#2e2622', sx * 0.6, 1.02, 2.24, 0);
      pupil.scale.z = 0.5;
      const shine = part(body, new THREE.SphereGeometry(0.045, 8, 6), '#ffffff', sx * 0.56, 1.07, 2.3, 0);
      shine.scale.z = 0.5;
      const blush = part(body, new THREE.SphereGeometry(0.16, 12, 8), '#f4a9bd', sx * 0.98, 0.72, 1.88, 0);
      blush.scale.set(1, 0.6, 0.3);
    }
    const mouth = part(body, new THREE.TorusGeometry(0.2, 0.03, 6, 16, Math.PI), COLOR.ink, 0, 0.72, 2.2, 0);
    mouth.rotation.z = Math.PI;
    // 범퍼와 번호판
    part(body, new THREE.BoxGeometry(2.3, 0.14, 0.2), '#cfc8b8', 0, 0.42, 2.0);
    part(body, new THREE.BoxGeometry(0.7, 0.24, 0.05), '#fffdf6', 0, 0.56, -2.08);
    for (const sx of [-1, 1]) part(body, new THREE.SphereGeometry(0.11, 10, 8), '#e77f8f', sx * 0.8, 0.96, -2.0, 0.08);
    // 앞유리 틀, 거울, 좌석, 운전대
    for (const sx of [-1, 1]) {
      part(body, new THREE.BoxGeometry(0.08, 0.7, 0.08), COLOR.dark, sx * 1.14, 1.42, 0.92);
      part(body, new THREE.SphereGeometry(0.11, 10, 8), COLOR.hub, sx * 1.42, 1.2, 0.86);
    }
    part(body, new THREE.BoxGeometry(2.36, 0.08, 0.08), COLOR.dark, 0, 1.76, 0.92);
    part(body, new THREE.BoxGeometry(1.7, 0.16, 1.1), COLOR.seat, 0, 0.56, -0.5, 0.03);
    part(body, new THREE.BoxGeometry(1.7, 0.9, 0.2), COLOR.seat, 0, 1.02, -1.08, 0.03);
    const column = part(body, new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), '#7d6250', 0, 0.86, 0.62, 0);
    column.rotation.x = 0.8;
    const wheel = part(body, new THREE.TorusGeometry(0.24, 0.04, 8, 18), '#7d6250', 0, 1.1, 0.42, 0);
    wheel.rotation.x = -0.75;
    // 바퀴
    const wheels = [];
    for (const [x, z] of [[-1.28, 1.28], [1.28, 1.28], [-1.28, -1.28], [1.28, -1.28]]) {
      const w = new THREE.Group();
      w.position.set(x, 0.42, z);
      const tire = part(w, new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18), COLOR.tire, 0, 0, 0);
      tire.rotation.z = Math.PI / 2;
      const hub = part(w, new THREE.CylinderGeometry(0.22, 0.22, 0.34, 12), COLOR.hub, 0, 0, 0, 0);
      hub.rotation.z = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const b = part(w, new THREE.BoxGeometry(0.36, 0.04, 0.05), COLOR.dark, 0, 0, 0, 0);
        b.rotation.x = (i / 3) * Math.PI;
        b.position.x = x < 0 ? -0.18 : 0.18;
        b.rotation.y = Math.PI / 2;
      }
      g.add(w);
      wheels.push(w);
    }
    g.traverse(o => { if (o.isMesh && o.material !== inkMat) o.castShadow = true; });
    return { g, body, wheels };
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // 운전대를 잡고 입을 뻐끔거리며 흥얼거린다 (애니 101화) / 폴짝 타고 내린다
  const { C } = root.MinorActs;
  const CLIPS = {
    car_drive: C(1.2, { rotZ: '0:.03 .6:-.03 1.2:.03', rotX: '0:.02 1.2:.02', footLY: '0:.1 1.2:.1', footRY: '0:.1 1.2:.1' }, {
      R: 'front(.14,-.04,0)@0 front(.14,.04,0)@.6 front(.14,-.04,0)@1.2', L: 'front(.14,.04,0)@0 front(.14,-.04,0)@.6 front(.14,.04,0)@1.2',
    }, [[0, 'smile'], [.3, 'joy'], [.6, 'smile'], [.9, 'joy']]),
    car_hop: C(1.2, { posY: '0:0 .55:.5o 1:0 1.2:0', squash: '0:.94 .2:1.05b .9:1 1:.94s 1.2:1', footLY: '0:0 .55:.12 1:0', footRY: '0:0 .55:.12 1:0' }, {
      R: 'chest(.3,.2,.1)@0 chest(.3,.2,.1)@1.2', L: 'chest(.3,.2,.1)@0 chest(.3,.2,.1)@1.2',
    }, 'joy', { once: true }),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);
  let state = null;
  root.RakkoCar = {
    SEAT,
    BOOST,
    get state() { return state; },
    install(sim, world, scene) {
      const p = sim.places.rakkoHome;
      if (!p) return;
      const home = sim.snap({ x: p.x + 9, z: p.z + 12 });
      const model = build();
      scene.add(model.g);
      state = { sim, world, home, x: home.x, z: home.z, angle: Math.PI, mode: 'parked', timer: 0, model, roll: 0, approach: false, cool: 0 };
      this.place();
    },
    place() {
      const s = state;
      s.model.g.position.set(s.x, s.world.floorAt(s.x, s.z), s.z);
      s.model.g.rotation.y = s.angle;
    },
    // 랏코가 걸어갈 때 village-sim의 walk가 먼저 묻는다. 값을 돌려주면 그걸로 걷기를 대신한다
    intercept(sim, c, target, dt) {
      const s = state;
      if (!s || s.approach) return undefined;
      if (s.mode === 'driving') {
        s.x = c.x;
        s.z = c.z;
        s.angle = c.angle;
        if (dist(c, target) > ARRIVE) return undefined;
        s.mode = 'alight';
        s.timer = BOARD;
        c.moveClip = 'car_hop';
        c.driving = false;
        return false;
      }
      if (s.mode === 'alight') {
        s.timer -= dt;
        if (s.timer > 0) return false;
        s.mode = 'parked';
        s.cool = 20;
        c.moveClip = null;
        return undefined;
      }
      if (s.mode === 'board') {
        s.timer -= dt;
        c.x = s.x;
        c.z = s.z;
        if (s.timer > 0) return false;
        s.mode = 'driving';
        c.driving = true;
        c.moveClip = 'car_drive';
        c.angle = s.angle;
        return undefined;
      }
      if (s.cool > 0) { s.cool -= dt; return undefined; }
      if (dist(c, target) < FAR || dist(c, s) > NEAR_CAR) return undefined;
      if (dist(c, s) <= 1.6) {
        s.mode = 'board';
        s.timer = BOARD;
        c.moveClip = 'car_hop';
        return false;
      }
      s.approach = true;
      const r = sim.walk(c, { x: s.x, z: s.z }, dt);
      s.approach = false;
      if (r === null) { s.cool = 30; return undefined; }
      return false;
    },
    // 일이 끊기면 내려놓는다. 밤사이 멀리 있는 차는 집 앞으로 돌아와 있다
    tick(sim, c) {
      const s = state;
      if (!s) return;
      const busy = c.walking || (c.doing && c.doing.phase === 'walk');
      if ((s.mode === 'driving' || s.mode === 'board' || s.mode === 'alight') && !busy) {
        s.mode = 'parked';
        c.driving = false;
        if (c.moveClip === 'car_drive' || c.moveClip === 'car_hop') c.moveClip = null;
      }
      if (s.mode === 'parked' && sim.hour >= 2 && sim.hour < 5 && dist(s, s.home) > 3 && dist(c, s) > 40) {
        Object.assign(s, { x: s.home.x, z: s.home.z, angle: Math.PI });
        this.place();
      }
    },
    // 화면: 달리는 동안 차는 랏코가 그려진 자리를 따라가고, 토코토코 흔들리며 바퀴가 돈다
    draw(a, dt, time) {
      const s = state;
      if (!s) return 0;
      const driving = s.mode === 'driving';
      const inCar = driving || s.mode === 'board';
      if (driving) {
        const r = a.built.root;
        s.model.g.position.set(r.position.x, s.world.floorAt(r.position.x, r.position.z), r.position.z);
        s.model.g.rotation.y = r.rotation.y;
        s.roll += dt * 9;
        s.model.body.position.y = Math.abs(Math.sin(time * 9)) * 0.1;
        s.model.body.rotation.z = Math.sin(time * 9) * 0.03;
        for (const w of s.model.wheels) w.rotation.x = s.roll;
      } else {
        s.model.body.position.y = 0;
        s.model.body.rotation.z = 0;
      }
      a.carY = (a.carY || 0) + ((inCar ? SEAT : 0) - (a.carY || 0)) * Math.min(1, dt * 7);
      if (inCar && s.mode === 'board') {
        a.built.root.rotation.y = s.angle;
      }
      return a.carY;
    },
  };
}(typeof self !== 'undefined' ? self : this));
