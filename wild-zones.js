'use strict';

// 치이카와 심즈 — 야생 반도의 토벌 구역과 눌러사는 괴물 (2026-11-09 이재헌 지시 9번)
// - 구역 3단계: 들판 끝(wilds) → 야생의 숲(wildsForest) → 깊은 숲(wildsDeep). 안쪽일수록 크고 강한 괴물이 산다
// - 괴물은 구역마다 자리가 정해져 있다(굴). 굴 둘레를 어슬렁거리다, 토벌하러 온 주민이 앞에 서면 맞선다
// - 쓰러뜨리면 굴이 비고, 정해진 시간이 지나면 같은 자리에 다시 나타난다
// - 원작에 이름·모습이 나온 토벌 대상만 쓴다: 기치기치 벌레, 애벌레, 나んか무카데(지렁이 색 지네), 개미지옥, 악몽의 코끼리, 큰 새
//   (키메라·아노코는 이야기 속 존재라 서식 괴물로 쓰지 않는다. 원작에 없는 괴물은 만들지 않는다)
// - 토벌 플레이트는 힘(persona.power)과 무기에 맞는 가장 깊은 구역으로 간다. 랏코는 깊은 숲에서만 토벌한다
(function (root) {
  const TIERS = {
    1: { place: 'wilds', label: '들판 끝', minPower: 0, pay: 1800, respawn: 300, chance: 1 },
    2: { place: 'wildsForest', label: '야생의 숲', minPower: 420, pay: 3200, respawn: 540, chance: 0.85 },
    3: { place: 'wildsDeep', label: '깊은 숲', minPower: 800, pay: 6000, respawn: 900, chance: 0.8 },
  };
  // 괴물 종류: 크기(s), 맞서는 거리(fight), 걷는 빠르기(게임 1분에), 어슬렁 반경
  const KIND = {
    gichi: { name: '기치기치 벌레', fight: 2.4, speed: 2.2, roam: 4 },
    imomushi: { name: '애벌레', fight: 2.6, speed: 1.2, roam: 3.5 },
    mukade: { name: '지네', fight: 3.4, speed: 2.6, roam: 6 },
    arijigoku: { name: '개미지옥', fight: 4.2, speed: 0, roam: 0 },
    zou: { name: '악몽의 코끼리', fight: 5.4, speed: 1.6, roam: 6 },
    bird: { name: '큰 새', fight: 5, speed: 6, roam: 14 },
    // 깊은 숲의 큰 키메라 (2026-11-12 이재헌님): 혼자서는 못 이긴다. 팀(둘 이상)이 함께 맞서거나 랏코만
    anoko: { name: '아노코', fight: 4.6, speed: 1.4, roam: 5, boss: true },
    dekatsuyo: { name: '데카츠요', fight: 6.2, speed: 0.9, roam: 4, boss: true },
  };
  // 굴: 장소 기준 좌표. s = 크기 배율
  const DENS = [];
  const ring = (n, r, off) => Array.from({ length: n }, (_, i) => { const a = (i / 8) * Math.PI * 2 + off; return [+(Math.cos(a) * r).toFixed(2), +(Math.sin(a) * r).toFixed(2)]; });
  // 들판 끝: 원래 토벌 자리(반경 13 고리) 사이사이, 반경 18
  ring(5, 18, 0.2 + Math.PI / 8).forEach((at, i) => DENS.push({ tier: 1, kind: i < 3 ? 'gichi' : 'imomushi', variant: ['green', 'red', 'ladybug'][i], s: 1, at }));
  DENS.push({ tier: 2, kind: 'mukade', s: 1, at: [-17, -6] });
  DENS.push({ tier: 2, kind: 'mukade', s: 1.15, at: [15, 13] });
  DENS.push({ tier: 2, kind: 'arijigoku', s: 1, at: [12, -14], from: [-0.6, 0.8] });
  DENS.push({ tier: 2, kind: 'gichi', variant: 'stripe', s: 2, at: [-9, 17] });
  DENS.push({ tier: 2, kind: 'gichi', variant: 'purple', s: 1.7, at: [2, -20] });
  DENS.push({ tier: 3, kind: 'zou', s: 1, at: [-14, 6] });
  DENS.push({ tier: 3, kind: 'bird', s: 1, at: [14, -10] });
  DENS.push({ tier: 3, kind: 'mukade', s: 1.9, at: [6, 19] });
  DENS.push({ tier: 3, kind: 'anoko', s: 1.5, at: [-6, -19], boss: 'anoko' });
  DENS.push({ tier: 3, kind: 'dekatsuyo', s: 1.9, at: [22, 8], boss: 'deka' });
  DENS.forEach((d, i) => {
    d.i = i;
    d.place = TIERS[d.tier].place;
    d.sock = d.boss ? `${d.boss}_1` : `den_fight_${i + 1}`;
    const k = KIND[d.kind];
    // 사냥꾼이 서는 자리: 굴에서 구역 가운데 쪽으로 (맞서는 거리 × 크기)
    let [fx, fz] = d.from || [-d.at[0], -d.at[1]];
    const l = Math.hypot(fx, fz) || 1;
    fx /= l;
    fz /= l;
    const gap = k.fight * Math.max(1, d.s * 0.8);
    d.stand = [d.at[0] + fx * gap, d.at[1] + fz * gap];
    d.gap = gap;
    // 큰 키메라: 셋이 부채꼴로 둘러선다
    d.socks = d.boss ? [0, -0.55, 0.55].map((da, j) => {
      const a = Math.atan2(fx, fz) + da;
      return { name: `${d.boss}_${j + 1}`, at: [d.at[0] + Math.sin(a) * gap, d.at[1] + Math.cos(a) * gap] };
    }) : [{ name: d.sock, at: d.stand }];
  });

  /* ---------- 소켓과 상호작용 ---------- */

  const AS = root.ASSET_SOCKETS;
  for (const d of DENS) {
    const so = AS[d.place] || (AS[d.place] = {});
    for (const k of d.socks) so[k.name] = [k.at[0], k.at[1], 0, d.at[0], d.at[1]];
  }
  // 구역 입구 (안내판을 읽고 숨 고르는 곳): 굴이 없는 쪽
  AS.wildsForest.gate_look = [-26, 8, 0, -30, 10];
  AS.wildsDeep.gate_look = [-30, -4, 0, -34, -4];

  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop, label });
  const VO = root.VillageObjects;
  const P = 'den_fight_*';
  const steps = tier => [
    S(P, 'peek', 2, 'fear_peek', null, tier === 1 ? '살금살금 살피는 중' : '괴물의 굴을 살피는 중'),
    S(P, 'brave', 2, 'brave_up', null, '마음 다잡는 중'),
    S(P, 'confront', 6 + tier, 'hunt_thrust', 'rod', '무기로 찌르는 중'),
    S(P, 'confront', 1.5, 'wobble_fear', null, '반격에 움찔'),
    S(P, 'confront', 6 + tier, 'hunt_thrust', 'rod', '다시 파고드는 중'),
    ...(tier > 1 ? [S(P, 'confront', 1.5, 'wobble_fear', null, '크게 휘청'), S(P, 'confront', 5 + tier, 'train_swing', 'rod', '틈을 노려 휘두르는 중')] : []),
    S(P, 'confront', 5, 'train_swing', 'rod', '마지막 일격'),
    S(P, 'look', 2, 'inspect_item', null, '쓰러졌는지 확인하는 중'),
  ];
  const hunt1 = VO.BY_ID['wilds.hunt'];
  if (hunt1) Object.assign(hunt1, { huntTier: 1, steps: steps(1) });
  for (const tier of [2, 3]) {
    const t = TIERS[tier];
    const x = {
      id: `${t.place}.hunt`, place: t.place, name: `${t.label} 토벌하기`, huntTier: tier, plate: 'hunt', worth: t.pay, hours: [6, 17],
      gain: { energy: -25 - tier * 5, fun: 10 + tier * 2, hygiene: -10 - tier * 2 }, steps: steps(tier),
    };
    VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
  }
  // 큰 키메라 토벌: 팀으로만 (blocked에서 막는다). 셋이 둘러서서 번갈아 치고, 크게 휘둘리며 버틴다
  for (const d of DENS.filter(q => q.boss)) {
    const B = `${d.boss}_*`, nm = KIND[d.kind].name;
    const x = {
      id: `wildsDeep.boss_${d.boss}`, place: 'wildsDeep', name: `${nm} 토벌 (팀)`, huntTier: 3, boss: d.boss, plate: 'hunt', worth: 9000, hours: [7, 16],
      gain: { energy: -45, fun: 24, hygiene: -18 }, steps: [
        S(B, 'peek', 2, 'fear_peek', null, `거대한 ${nm}... 다 같이 숨 고르는 중`),
        S(B, 'brave', 2, 'brave_up', null, '하나, 둘, 셋에 간다!'),
        S(B, 'confront', 8, 'hunt_thrust', 'rod', '둘러싸고 번갈아 찌르는 중'),
        S(B, 'confront', 2, 'wobble_fear', null, '휘두른 팔에 크게 휘청'),
        S(B, 'confront', 8, 'train_swing', 'rod', '다시 일어나 휘두르는 중'),
        S(B, 'confront', 2, 'wobble_fear', null, '꼬리에 밀려 데굴'),
        S(B, 'confront', 7, 'hunt_thrust', 'rod', '마지막까지 힘을 모아'),
        S(B, 'look', 2, 'inspect_item', null, '쓰러졌는지 다 같이 확인'),
      ],
    };
    VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
  }
  // 랏코: 깊은 숲으로 곧장 들어가 단숨에 벤다 (전용 전투 동작은 10번 작업)
  const rk = VO.BY_ID['wilds.rakko_hunt'];
  if (rk) {
    Object.assign(rk, {
      place: 'wildsDeep', huntTier: 3, steps: [
        S(P + '|anoko_*|deka_*', 'brave', 1.5, 'brave_up', null, '깊은 숲 괴물 앞에 서는 중'),
        S(P, 'confront', 6, 'train_swing', 'rod', '단숨에 베는 중'),
        S(P, 'confront', 6, 'hunt_thrust', 'rod', '연속으로 베는 중'),
        S(P, 'look', 2, 'inspect_item', null, '쓰러졌는지 확인하는 중'),
      ],
    });
  }
  for (const [place, label] of [['wildsForest', '야생의 숲'], ['wildsDeep', '깊은 숲']]) {
    const x = { id: `${place}.gate_look`, place, name: `${label} 안내판 읽기`, gain: { fun: 3 }, hours: [6, 19], steps: [S('gate_look', 'read', 3, 'board_read', null, '어떤 괴물이 사는지 읽는 중')] };
    VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
  }

  /* ---------- 노동 규칙: 구역 자격·보수·성공률 ---------- */

  const L = root.Labor.prototype;
  const blocked0 = L.blocked;
  L.blocked = function (c, x) {
    const r = blocked0.call(this, c, x);
    if (r || !x.huntTier) return r;
    const t = TIERS[x.huntTier];
    if (this.sim.persona.power(c) < t.minPower) return '아직 들어갈 수 없는 구역이에요';
    if (x.huntTier > 1 && !root.Shop.owns(c, 'weapon')) return '무기가 있어야 해요';
    if (!aliveIn(this.sim, x.place)) return '괴물이 다 쓰러져 있어요';
    if (x.boss) {
      const den = state(this.sim).dens.find(n => n.d.boss === x.boss);
      if (!den || !den.alive) return '이미 쓰러져 있어요';
      if (c.id !== 'rakko' && !(c.party && c.party.members && c.party.members.length >= 2)) return '혼자서는 못 이겨요. 팀으로 가야 해요';
    }
    return null;
  };
  const score0 = L.scoreBonus;
  L.scoreBonus = function (c, x) {
    // 갈 수 있는 가장 깊은 구역을 고른다
    return score0.call(this, c, x) + (x.huntTier ? (x.huntTier - 1) * 40 : 0) + (x.boss && c.party ? 30 : 0);
  };
  const chance0 = L.huntChance;
  L.huntChance = function (c) {
    const v = chance0.call(this, c);
    const x = c.doing && c.doing.x;
    return x && x.huntTier ? Math.max(0.1, v * TIERS[x.huntTier].chance) : v;
  };
  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    const den = x.huntTier ? denFor(this.sim, c) : null;
    finish0.call(this, c, x);
    if (!den) return;
    const s = this.sim;
    if (den.d.boss && c.id !== 'rakko') {
      const mates = [...(den.fighters || new Map())].filter(([id, t]) => id !== c.id && s.minutes - t < 40).length;
      if (!den.alive) { if (c.plate && c.plate.state === 'done') c.plate.pay += TIERS[3].pay; return; }   // 동료가 막 쓰러뜨렸다
      if (!mates) {
        if (c.plate) c.plate.state = 'failed';
        den.mode = 'roar';
        s.note(`${josa(c.name, '은', '는')} 혼자서 ${josa(KIND[den.d.kind].name, '을', '를')} 이길 수 없었어요`);
        return;
      }
      if (c.plate) { c.plate.state = 'done'; c.plate.pay += 9000 - 1800; }
      defeat(s, den, c);
      return;
    }
    if (x.id === 'wilds.rakko_hunt') {
      c.money += den.d.boss ? 2000 : 800;
      defeat(s, den, c);
    } else if (x.plate === 'hunt' && c.plate) {
      if (c.plate.state === 'done') {
        c.plate.pay += TIERS[x.huntTier].pay - 1800;
        defeat(s, den, c);
      } else den.mode = 'roar';
    }
  };

  /* ---------- 괴물의 하루 (화면을 모른다) ---------- */

  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // 받침에 맞는 조사 (랏코가 / 지네를 / 코끼리가)
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
  function state(sim) {
    if (sim.wild) return sim.wild;
    const dens = DENS.map(d => {
      const p = sim.places[d.place];
      const home = { x: p.x + d.at[0], z: p.z + d.at[1] };
      return { d, home, x: home.x, z: home.z, angle: Math.atan2(-d.at[0], -d.at[1]), alive: true, mode: 'idle', left: 2 + sim.random() * 6, goal: null, foe: null, back: 0 };
    });
    sim.wild = { dens };
    return sim.wild;
  }
  function sockOf(sim, den) {
    const so = sim.sockets && sim.sockets[den.d.place];
    return so && so[den.d.sock];
  }
  function hasSock(den, name) {
    return den.d.socks.some(k => k.name === name);
  }
  function aliveIn(sim, place) { return state(sim).dens.some(n => n.alive && n.d.place === place); }
  function denFor(sim, c) {
    const so = c.doing && c.doing.socket;
    return state(sim).dens.find(n => (n.foe === c.id) || (so && hasSock(n, so.name) && n.d.place === (so.place || c.doing.x.place))) || null;
  }
  function defeat(sim, den, c) {
    den.alive = false;
    den.mode = 'dead';
    den.foe = null;
    den.back = sim.minutes + TIERS[den.d.tier].respawn * (0.8 + sim.random() * 0.4);
    for (const k of den.d.socks) { const so = sim.sockets[den.d.place] && sim.sockets[den.d.place][k.name]; if (so) { so.reachWas = so.reach; so.reach = false; } }
    den.fighters = null;
    sim.note(`${josa(c.name, '이', '가')} ${TIERS[den.d.tier].label}의 ${josa(KIND[den.d.kind].name, '을', '를')} 쓰러뜨렸어요`);
  }
  function revive(sim, den) {
    Object.assign(den, { alive: true, mode: 'idle', x: den.home.x, z: den.home.z, left: 4, goal: null, foe: null });
    for (const k of den.d.socks) { const so = sim.sockets[den.d.place] && sim.sockets[den.d.place][k.name]; if (so && so.reachWas !== undefined) so.reach = so.reachWas; }
    sim.note(`${TIERS[den.d.tier].label}에 ${josa(KIND[den.d.kind].name, '이', '가')} 다시 나타났어요`);
  }
  function step(den, goal, speed, dt) {
    const dx = goal.x - den.x, dz = goal.z - den.z, l = Math.hypot(dx, dz);
    if (l < 0.05) return true;
    const m = Math.min(l, speed * dt);
    den.x += (dx / l) * m;
    den.z += (dz / l) * m;
    den.angle = Math.atan2(dx, dz);
    den.moving = true;
    return m >= l;
  }
  function tick(sim, dt) {
    const w = state(sim);
    for (const den of w.dens) {
      const k = KIND[den.d.kind];
      den.moving = false;
      if (!den.alive) {
        if (sim.minutes >= den.back) revive(sim, den);
        continue;
      }
      // 토벌하러 온 주민이 내 앞 자리에 서면 맞선다
      const foe = sim.chars.find(c => c.doing && c.doing.x && c.doing.x.huntTier && c.doing.phase === 'use' && c.doing.socket && hasSock(den, c.doing.socket.name) && c.doing.x.place === den.d.place);
      if (den.d.boss) for (const o of sim.chars) if (o.doing && o.doing.phase === 'use' && o.doing.socket && hasSock(den, o.doing.socket.name)) (den.fighters || (den.fighters = new Map())).set(o.id, sim.minutes);
      if (foe) {
        den.foe = foe.id;
        if (den.mode !== 'roar' || (den.roarLeft = (den.roarLeft || 3) - dt) <= 0) den.mode = 'fight';
        // 사냥꾼 앞으로 다가선다 (굴과 사냥꾼 사이)
        const ux = den.home.x - foe.x, uz = den.home.z - foe.z, l = Math.hypot(ux, uz) || 1;
        const near = Math.max(1.8, den.d.gap - 0.3 * den.d.s);
        if (k.speed) step(den, { x: foe.x + (ux / l) * near, z: foe.z + (uz / l) * near }, k.speed * 1.6, dt);
        den.angle = Math.atan2(foe.x - den.x, foe.z - den.z);
        continue;
      }
      den.foe = null;
      den.roarLeft = 0;
      if (!k.speed) {
        den.mode = 'idle';
        continue;
      }
      // 굴 둘레를 어슬렁거린다
      if (den.mode === 'walk' && den.goal) {
        if (step(den, den.goal, k.speed, dt)) {
          den.mode = 'idle';
          den.left = 3 + sim.random() * 10;
        }
      } else {
        den.mode = 'idle';
        den.left -= dt;
        if (den.left <= 0) {
          const a = sim.random() * Math.PI * 2, r = sim.random() * k.roam * Math.min(1.6, den.d.s);
          den.goal = { x: den.home.x + Math.cos(a) * r, z: den.home.z + Math.sin(a) * r };
          den.mode = 'walk';
        }
      }
    }
  }
  const eco0 = root.Ecology.prototype.tick;
  root.Ecology.prototype.tick = function (dt) {
    eco0.call(this, dt);
    tick(this.sim, dt);
  };

  /* ---------- 모델 도구 ---------- */

  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const inkMats = {};
  // 바깥선: 법선 방향으로 부풀린 뒷면 (치이카와 그림체의 굵은 선)
  function inkMat(w) {
    const key = w.toFixed(3);
    if (inkMats[key]) return inkMats[key];
    const m = new THREE.MeshBasicMaterial({ color: '#3b2a26', side: THREE.BackSide });
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${key};`); };
    m.customProgramCacheKey = () => `ink${key}`;
    return (inkMats[key] = m);
  }
  function part(geo, color, ink = 0.025, mat = null) {
    const m = new THREE.Mesh(geo, mat || toon(color));
    if (ink) m.add(new THREE.Mesh(geo, inkMat(ink)));
    return m;
  }
  const at = (o, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.scale.set(sx, sy, sz);
    return o;
  };
  const sph = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
  const tube = (pts, r, seg = 16, rs = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rs);
  // 끝으로 갈수록 가늘어지는 관 (더듬이·다리·꼬리)
  function taper(pts, r0, r1, seg = 14, rs = 6) {
    const g = tube(pts, 1, seg, rs);
    const pos = g.attributes.position;
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const frames = seg + 1;
    for (let i = 0; i < frames; i++) {
      const c = curve.getPointAt(i / seg);
      const r = r0 + (r1 - r0) * (i / seg);
      for (let j = 0; j <= rs; j++) {
        const k = i * (rs + 1) + j;
        if (k >= pos.count) continue;
        pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * r, c.y + (pos.getY(k) - c.y) * r, c.z + (pos.getZ(k) - c.z) * r);
      }
    }
    g.computeVertexNormals();
    return g;
  }
  function eye(r, hi = true) {
    const g = new THREE.Group();
    g.add(part(sph(r, 12, 10), '#1d1714', 0));
    if (hi) g.add(at(new THREE.Mesh(sph(r * 0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })), r * 0.35, r * 0.4, r * 0.62));
    return g;
  }
  // 이빨 줄: 반원을 따라 뾰족한 이 n개
  function teeth(n, w, len, up, color = '#fbf7ee') {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, a = Math.PI * (t - 0.5) * 0.9;
      const c = at(part(new THREE.ConeGeometry(len * 0.38, len, 5), color, 0.008), Math.sin(a) * w, 0, Math.cos(a) * w * 0.35, up ? Math.PI : 0, 0, 0, 1, 0.8 + 0.4 * ((i * 7) % 3) / 2, 1);
      g.add(c);
    }
    return g;
  }

  /* ---------- 괴물 모델 (원작 모습을 바탕으로, 원뿔·구 하나로 때우지 않는다) ---------- */

  // 기치기치 벌레: 둥근 머리에 큰 입과 들쭉날쭉한 이, 검은 더듬이, 마디진 배, 다리 여섯. 색이 여러 가지
  const GICHI = {
    green: ['#c9dd6e', '#eef3bf', '#a7bd52'], red: ['#e5745f', '#f6c5b5', '#c45a48'], purple: ['#c8b3de', '#ece2f4', '#a993c4'],
    stripe: ['#f3d65b', '#fbf0bf', '#7d5a2e'], ladybug: ['#e04b3c', '#f7c9bf', '#1f1a18'],
  };
  function makeGichi(variant) {
    const [base, belly, mark] = GICHI[variant] || GICHI.green;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const abd = at(part(sph(0.42), base, 0.03), 0, 0.46, -0.38, 0, 0, 0, 1, 0.82, 1.25);
    body.add(abd);
    // 배 마디 주름 (줄무늬는 굵게)
    for (let i = 0; i < 4; i++) {
      const thick = variant === 'stripe' ? 0.05 : 0.014;
      body.add(at(part(new THREE.TorusGeometry(0.39 - Math.abs(i - 1.5) * 0.05, thick, 6, 24), variant === 'stripe' ? mark : new THREE.Color(base).offsetHSL(0, 0, -0.12).getStyle(), 0), 0, 0.46, -0.62 + i * 0.16, 0, 0, 0, 1, 0.82, 1));
    }
    if (variant === 'ladybug') {
      [[0.2, 0.7, -0.3], [-0.22, 0.68, -0.45], [0.05, 0.78, -0.55], [-0.12, 0.74, -0.18], [0.28, 0.55, -0.6]].forEach(([x, y, z]) => body.add(at(part(sph(0.075, 8, 6), mark, 0), x, y, z, 0, 0, 0, 1, 0.5, 1)));
    }
    body.add(at(part(sph(0.4), belly, 0), 0, 0.36, -0.36, 0, 0, 0, 0.9, 0.55, 1.15));
    body.add(at(part(sph(0.32), base, 0.03), 0, 0.5, 0.12, 0, 0, 0, 1, 0.9, 0.9));
    const head = new THREE.Group();
    at(head, 0, 0.6, 0.52);
    body.add(head);
    head.add(at(part(sph(0.4), base, 0.03), 0, 0, 0, 0, 0, 0, 1.08, 0.95, 0.92));
    // 입: 어두운 입속 + 윗니 + 움직이는 아래턱
    head.add(at(part(sph(0.3, 14, 10), '#5b1f24', 0), 0, -0.08, 0.24, 0, 0, 0, 0.95, 0.42, 0.5));
    head.add(at(teeth(9, 0.26, 0.11, true), 0, -0.01, 0.3));
    const jaw = new THREE.Group();
    at(jaw, 0, -0.1, 0.12);
    jaw.add(at(part(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), base, 0.02), 0, 0, 0.08, 0, 0, 0, 1, 0.5, 1));
    jaw.add(at(teeth(8, 0.24, 0.1, false), 0, -0.02, 0.2));
    head.add(jaw);
    for (const sx of [-1, 1]) {
      head.add(at(eye(0.06), sx * 0.17, 0.17, 0.3));
      // 더듬이: 머리 위에서 앞으로 휘어 끝이 동그랗다
      const ant = new THREE.Group();
      at(ant, sx * 0.12, 0.3, 0.05);
      ant.add(part(taper([[0, 0, 0], [sx * 0.08, 0.28, 0.05], [sx * 0.2, 0.46, 0.2], [sx * 0.3, 0.48, 0.38]], 0.028, 0.016), '#2b2420', 0.008));
      ant.add(at(part(sph(0.045, 8, 6), '#2b2420', 0.008), sx * 0.3, 0.48, 0.38));
      head.add(ant);
      head.userData[sx < 0 ? 'antL' : 'antR'] = ant;
    }
    // 다리 여섯: 넓적다리 + 종아리 + 발끝
    const legs = [];
    for (let i = 0; i < 3; i++) {
      for (const sx of [-1, 1]) {
        const leg = new THREE.Group();
        at(leg, sx * 0.28, 0.42, 0.25 - i * 0.32);
        leg.add(part(taper([[0, 0, 0], [sx * 0.22, 0.08, 0.02], [sx * 0.36, -0.12, 0.04], [sx * 0.42, -0.4, 0.08]], 0.045, 0.022, 10, 5), '#4c3a2e', 0.01));
        leg.add(at(part(sph(0.03, 6, 5), '#4c3a2e', 0.008), sx * 0.42, -0.4, 0.08));
        body.add(leg);
        legs.push({ g: leg, side: sx, ph: i * 2.1 + (sx > 0 ? Math.PI : 0) });
      }
    }
    root.userData = { kind: 'gichi', body, head, jaw, legs };
    return root;
  }

  // 애벌레: 연둣빛 마디가 줄지어 꿈틀거린다. 등에 옅은 점, 마디마다 짧은 배다리, 둥근 얼굴
  function makeImomushi() {
    const root = new THREE.Group();
    const segs = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const r = 0.3 - Math.abs(i - 2) * 0.016;
      const g = new THREE.Group();
      at(g, 0, r, -i * 0.34);
      g.add(at(part(sph(r, 14, 10), i % 2 ? '#94cc62' : '#a3d670', 0.025), 0, 0, 0, 0, 0, 0, 1, 0.9, 1.05));
      g.add(at(part(sph(r * 0.9, 12, 8), '#d7ecb0', 0), 0, -r * 0.35, 0, 0, 0, 0, 0.95, 0.45, 1));
      g.add(at(part(sph(r * 0.18, 8, 6), '#eff8d2', 0), 0, r * 0.85, 0, 0, 0, 0, 1, 0.5, 1));
      for (const sx of [-1, 1]) g.add(at(part(new THREE.CylinderGeometry(0.045, 0.055, 0.12, 6), '#6f9d47', 0.006), sx * r * 0.55, -r * 0.82, 0));
      root.add(g);
      segs.push(g);
    }
    const head = new THREE.Group();
    at(head, 0, 0.32, 0.33);
    head.add(part(sph(0.33, 16, 12), '#b4dc7e', 0.028));
    for (const sx of [-1, 1]) {
      head.add(at(eye(0.05), sx * 0.13, 0.08, 0.27));
      head.add(at(part(sph(0.06, 8, 6), '#f3a8a8', 0), sx * 0.21, -0.03, 0.24, 0, 0, 0, 1, 0.5, 0.4));
      head.add(at(part(new THREE.ConeGeometry(0.035, 0.14, 6), '#eba64a', 0.006), sx * 0.1, 0.33, 0.05, 0.3, 0, sx * -0.3));
    }
    head.add(at(part(new THREE.TorusGeometry(0.05, 0.012, 5, 10, Math.PI), '#3b2a26', 0), 0, -0.07, 0.31, 0, 0, Math.PI));
    root.add(head);
    root.userData = { kind: 'imomushi', segs, head };
    return root;
  }

  // 지네 (나んか무카데): 지렁이 같은 분홍빛 몸에 마디 주름, 마디마다 짧은 다리, 작은 턱과 더듬이, 꼬리 끝 두 갈래. 산을 뱉는다
  function makeMukade() {
    const root = new THREE.Group();
    const segs = [];
    const N = 14;
    for (let i = 0; i < N; i++) {
      const r = 0.33 * (1 - Math.max(0, i - 9) * 0.08);
      const g = new THREE.Group();
      at(g, 0, r * 0.95, -i * 0.42);
      g.add(at(part(sph(r, 14, 10), i % 2 ? '#d99a8d' : '#e0a597', 0.025), 0, 0, 0, 0, 0, 0, 1.05, 0.88, 1.25));
      g.add(at(part(new THREE.TorusGeometry(r * 0.95, 0.025, 6, 20), '#b8776b', 0), 0, 0, -0.2, 0, 0, 0, 1.05, 0.88, 1));
      g.add(at(part(sph(r * 0.95, 12, 8), '#f0c3b6', 0), 0, -r * 0.3, 0, 0, 0, 0, 0.95, 0.5, 1.1));
      const legs = [];
      for (const sx of [-1, 1]) {
        const leg = new THREE.Group();
        at(leg, sx * r * 0.8, -r * 0.35, 0);
        leg.add(part(taper([[0, 0, 0], [sx * 0.14, -0.02, 0.03], [sx * 0.22, -r * 0.6, 0.06]], 0.035, 0.016, 8, 5), '#7c4b3d', 0.006));
        g.add(leg);
        legs.push({ g: leg, side: sx });
      }
      g.userData.legs = legs;
      root.add(g);
      segs.push(g);
    }
    const head = new THREE.Group();
    at(head, 0, 0.36, 0.42);
    head.add(part(sph(0.36, 16, 12), '#cf8c7f', 0.028));
    head.add(at(part(sph(0.3, 12, 8), '#e9b0a2', 0), 0, -0.12, 0.08, 0, 0, 0, 1, 0.5, 1));
    for (const sx of [-1, 1]) {
      head.add(at(eye(0.045), sx * 0.15, 0.14, 0.28));
      // 턱: 안쪽으로 굽은 갈고리
      const fang = new THREE.Group();
      at(fang, sx * 0.13, -0.12, 0.3);
      fang.add(part(taper([[0, 0, 0], [sx * 0.08, -0.02, 0.12], [sx * 0.02, -0.04, 0.22], [-sx * 0.06, -0.05, 0.25]], 0.04, 0.012, 10, 5), '#5c3a30', 0.008));
      head.add(fang);
      head.userData[sx < 0 ? 'fangL' : 'fangR'] = fang;
      head.add(at(part(taper([[0, 0, 0], [sx * 0.1, 0.18, 0.12], [sx * 0.24, 0.26, 0.32]], 0.025, 0.01, 8, 5), '#7c4b3d', 0.006), sx * 0.1, 0.24, 0.12));
    }
    root.add(head);
    const tail = segs[N - 1];
    for (const sx of [-1, 1]) tail.add(part(taper([[0, 0, -0.1], [sx * 0.12, 0.04, -0.35], [sx * 0.2, 0.1, -0.5]], 0.04, 0.012, 8, 5), '#7c4b3d', 0.006));
    root.userData = { kind: 'mukade', segs, head };
    return root;
  }

  // 개미지옥: 모래로 쌓은 깔때기 둔덕 + 가운데서 고개를 내미는 털북숭이 애벌레와 커다란 낫 모양 턱
  function makeArijigoku() {
    const root = new THREE.Group();
    const { Kit, COL } = window.WeedingField.tools;
    const k = new Kit();
    const R = 3.4, rings = 14, segs = 48;
    const prof = r => (r > 2.6 ? 0.7 * (1 - (r - 2.6) / 0.8) : 0.08 + 0.62 * Math.pow(r / 2.6, 1.6));
    const sand = (r, a) => COL('#e2cc98').offsetHSL(0, 0, (r < 2.6 ? -0.08 * (1 - r / 2.6) : 0) + 0.025 * Math.sin(r * 9 + Math.sin(a * 3)));
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const pt = (ii, jj) => {
          const r = (ii / rings) * R, a = (jj / segs) * Math.PI * 2, rr = r * (1 + 0.04 * Math.sin(a * 5));
          return { p: [Math.cos(a) * rr, prof(r), Math.sin(a) * rr], c: sand(r, a) };
        };
        const a = pt(i, j), b = pt(i, j + 1), c = pt(i + 1, j + 1), d = pt(i + 1, j);
        k.tri(a.p, b.p, c.p, a.c, b.c, c.c);
        k.tri(a.p, c.p, d.p, a.c, c.c, d.c);
      }
    }
    // 둔덕 위 자갈
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39, r = 2.5 + (i % 3) * 0.3;
      k.add(new THREE.DodecahedronGeometry(0.06 + (i % 4) * 0.025), '#b7a582', new THREE.Matrix4().makeTranslation(Math.cos(a) * r, prof(r) + 0.03, Math.sin(a) * r));
    }
    const pit = new THREE.Mesh(k.geo(), new THREE.MeshToonMaterial({ vertexColors: true }));
    root.add(pit);
    const bug = new THREE.Group();
    at(bug, 0, 0.05, 0);
    root.add(bug);
    bug.add(at(part(sph(0.55, 16, 12), '#8d6b4b', 0.03), 0, 0, -0.25, 0, 0, 0, 1.1, 0.7, 1.2));
    // 등의 억센 털
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4, r = 0.2 + (i % 5) * 0.08;
      bug.add(at(part(new THREE.ConeGeometry(0.02, 0.16, 4), '#5e4430', 0), Math.cos(a) * r, 0.33 - r * 0.25, -0.25 + Math.sin(a) * r, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6));
    }
    for (let i = 0; i < 4; i++) bug.add(at(part(new THREE.TorusGeometry(0.5 - i * 0.04, 0.015, 5, 20), '#6e5238', 0), 0, 0.02, -0.5 + i * 0.16, Math.PI / 2, 0, 0, 1.1, 1, 0.7));
    const head = new THREE.Group();
    at(head, 0, 0.12, 0.38);
    bug.add(head);
    head.add(at(part(sph(0.3, 14, 10), '#7a5a3c', 0.025), 0, 0, 0, 0, 0, 0, 1.15, 0.6, 1));
    for (const sx of [-1, 1]) {
      head.add(at(eye(0.04), sx * 0.16, 0.12, 0.18));
      const jaw = new THREE.Group();
      at(jaw, sx * 0.14, 0, 0.2);
      jaw.add(part(taper([[0, 0, 0], [sx * 0.2, 0.04, 0.3], [sx * 0.12, 0.06, 0.62], [-sx * 0.08, 0.05, 0.78]], 0.06, 0.012, 14, 6), '#4a3426', 0.01));
      // 턱 안쪽 이
      for (let t = 0; t < 3; t++) jaw.add(at(part(new THREE.ConeGeometry(0.02, 0.09, 4), '#e8dcc4', 0), sx * (0.13 - t * 0.02), 0.04, 0.28 + t * 0.14, 0, 0, sx * Math.PI / 2));
      head.add(jaw);
      head.userData[sx < 0 ? 'jawL' : 'jawR'] = jaw;
    }
    // 튀는 모래알
    const spray = [];
    for (let i = 0; i < 10; i++) {
      const g = at(part(new THREE.DodecahedronGeometry(0.05), '#d9c08a', 0), 0, -5, 0);
      root.add(g);
      spray.push(g);
    }
    root.userData = { kind: 'arijigoku', bug, head, spray };
    return root;
  }

  // 악몽의 코끼리: 퍼그 같은 납작한 얼굴에 짧은 코, 큰 귀, 짧고 굵은 다리, 북슬북슬한 꼬리, 옆구리에서 돋은 네 손가락의 긴 팔 한 쌍
  function makeZou() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const hide = '#b9b2c9', pale = '#ddd7e6', dark = '#8f88a3';
    body.add(at(part(sph(1.4, 24, 18), hide, 0.05), 0, 2.1, -0.2, 0, 0, 0, 1.1, 0.95, 1.3));
    body.add(at(part(sph(1.25, 20, 14), pale, 0), 0, 1.6, -0.1, 0, 0, 0, 1, 0.6, 1.2));
    const legs = [];
    for (const [x, z] of [[-0.75, 0.8], [0.75, 0.8], [-0.75, -1.1], [0.75, -1.1]]) {
      const g = new THREE.Group();
      at(g, x, 1.3, z);
      g.add(at(part(new THREE.CylinderGeometry(0.42, 0.48, 1.3, 14), hide, 0.04), 0, -0.6, 0));
      for (let t = 0; t < 3; t++) g.add(at(part(sph(0.1, 8, 6), '#f4efe6', 0.01), (t - 1) * 0.22, -1.2, 0.4, 0, 0, 0, 1, 0.7, 0.8));
      body.add(g);
      legs.push(g);
    }
    const head = new THREE.Group();
    at(head, 0, 2.9, 1.25);
    body.add(head);
    head.add(at(part(sph(1.05, 22, 16), hide, 0.05), 0, 0, 0, 0, 0, 0, 1.1, 0.95, 0.82));
    // 퍼그처럼 이마의 주름 셋
    for (let i = 0; i < 3; i++) head.add(at(part(new THREE.TorusGeometry(0.5 - i * 0.08, 0.035, 6, 20, Math.PI * 0.8), dark, 0), 0, 0.45 + i * 0.13, 0.62 - i * 0.05, -0.5, 0, Math.PI * 0.1 + Math.PI));
    // 주둥이와 짧은 코 (마디 주름)
    head.add(at(part(sph(0.5, 16, 12), pale, 0.035), 0, -0.3, 0.72, 0, 0, 0, 1.2, 0.8, 0.7));
    const trunk = new THREE.Group();
    at(trunk, 0, -0.35, 1.0);
    trunk.add(part(taper([[0, 0, 0], [0, -0.2, 0.25], [0, -0.55, 0.35], [0, -0.85, 0.28]], 0.24, 0.17, 12, 10), hide, 0.035));
    for (let i = 0; i < 4; i++) trunk.add(at(part(new THREE.TorusGeometry(0.21 - i * 0.012, 0.018, 5, 16), dark, 0), 0, -0.12 - i * 0.18, 0.22 + Math.sin(i) * 0.08, 1.2 - i * 0.25));
    for (const sx of [-1, 1]) trunk.add(at(part(sph(0.045, 8, 6), '#3b2a26', 0), sx * 0.07, -0.86, 0.36));
    head.add(trunk);
    for (const sx of [-1, 1]) {
      const e = eye(0.13);
      head.add(at(e, sx * 0.45, 0.12, 0.72));
      head.add(at(part(new THREE.SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hide, 0.02), sx * 0.45, 0.16, 0.7, -0.3, 0, 0, 1, 0.6, 1));
      // 귀: 넓고 얇은 귀, 안쪽은 분홍
      const ear = new THREE.Group();
      at(ear, sx * 0.95, 0.15, 0.05);
      ear.add(at(part(sph(0.8, 16, 12), hide, 0.04), sx * 0.45, -0.1, -0.1, 0, 0, 0, 1, 1.15, 0.14));
      ear.add(at(part(sph(0.62, 14, 10), '#dba9b6', 0), sx * 0.45, -0.12, 0.03, 0, 0, 0, 1, 1.1, 0.08));
      head.add(ear);
      head.userData[sx < 0 ? 'earL' : 'earR'] = ear;
    }
    // 옆구리에서 돋은 긴 팔 (네 손가락)
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group();
      at(sh, sx * 1.4, 2.3, 0.3);
      sh.add(part(taper([[0, 0, 0], [sx * 0.5, -0.2, 0.3], [sx * 0.8, -0.7, 0.6]], 0.17, 0.13, 10, 8), hide, 0.03));
      const fore = new THREE.Group();
      at(fore, sx * 0.8, -0.7, 0.6);
      fore.add(part(taper([[0, 0, 0], [sx * 0.2, -0.5, 0.35], [sx * 0.25, -0.95, 0.6]], 0.13, 0.11, 10, 8), hide, 0.03));
      const hand = new THREE.Group();
      at(hand, sx * 0.25, -0.95, 0.6);
      hand.add(at(part(sph(0.2, 12, 8), pale, 0.025), 0, 0, 0, 0, 0, 0, 1, 0.7, 1.1));
      for (let f = 0; f < 4; f++) hand.add(part(taper([[(f - 1.5) * 0.09, -0.02, 0.12], [(f - 1.5) * 0.12, -0.12, 0.3], [(f - 1.5) * 0.12, -0.25, 0.36]], 0.05, 0.035, 6, 5), pale, 0.015));
      fore.add(hand);
      sh.add(fore);
      body.add(sh);
      arms.push({ sh, fore, side: sx });
    }
    // 북슬북슬한 꼬리
    const tail = new THREE.Group();
    at(tail, 0, 2.3, -1.95);
    tail.add(part(taper([[0, 0, 0], [0, -0.2, -0.3], [0, -0.6, -0.45]], 0.09, 0.07, 8, 6), hide, 0.02));
    for (let i = 0; i < 8; i++) tail.add(at(part(sph(0.16, 10, 8), '#a39bb6', 0.015), Math.cos(i * 2.4) * 0.12, -0.7 - (i % 3) * 0.08, -0.45 + Math.sin(i * 2.4) * 0.12));
    body.add(tail);
    root.userData = { kind: 'zou', body, head, legs, arms, tail };
    return root;
  }

  // 큰 새: 솔개를 닮은 갈색 깃털, 줄무늬 진 밝은 배, 굽은 노란 부리, 갈라진 꼬리깃, 노란 발에 검은 발톱. 깊은 숲 하늘을 돈다
  function makeBird() {
    const { Kit, COL } = window.WeedingField.tools;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    body.add(at(part(sph(0.9, 20, 14), '#8b6548', 0.04), 0, 0, 0, 0, 0, 0, 0.82, 0.75, 1.5));
    body.add(at(part(sph(0.85, 18, 12), '#ead9b9', 0), 0, -0.2, 0.15, 0, 0, 0, 0.7, 0.6, 1.2));
    for (let i = 0; i < 12; i++) body.add(at(part(new THREE.BoxGeometry(0.05, 0.02, 0.16), '#9a7650', 0), (i % 3 - 1) * 0.2, -0.62 + (i % 2) * 0.04, 0.6 - Math.floor(i / 3) * 0.3, 0.2));
    const head = new THREE.Group();
    at(head, 0, 0.45, 1.25);
    body.add(head);
    head.add(part(sph(0.5, 18, 14), '#a8835f', 0.035));
    head.add(at(part(sph(0.42, 14, 10), '#c9ad87', 0), 0, -0.12, 0.12, 0, 0, 0, 0.9, 0.7, 0.9));
    const beak = new THREE.Group();
    at(beak, 0, -0.05, 0.45);
    beak.add(part(taper([[0, 0.08, 0], [0, 0.06, 0.25], [0, -0.05, 0.42], [0, -0.2, 0.42]], 0.13, 0.02, 12, 8), '#f1c33f', 0.02));
    beak.add(at(part(sph(0.13, 10, 8), '#f1c33f', 0.015), 0, 0.02, 0.03));
    beak.add(at(part(new THREE.ConeGeometry(0.03, 0.1, 6), '#3b2a26', 0), 0, -0.19, 0.42, Math.PI));
    head.add(beak);
    for (const sx of [-1, 1]) {
      head.add(at(part(sph(0.11, 12, 8), '#f4d24a', 0.012), sx * 0.3, 0.1, 0.3));
      head.add(at(eye(0.07), sx * 0.34, 0.11, 0.35));
      head.add(at(part(new THREE.BoxGeometry(0.22, 0.05, 0.1), '#6e4e36', 0.01), sx * 0.3, 0.22, 0.32, 0, 0, sx * 0.25));
    }
    // 날개: 깃털을 한 장씩 겹친 판 (끝으로 갈수록 짙고, 첫째 날개깃은 손가락처럼 갈라진다)
    function wingGeo(sx) {
      const k = new Kit();
      const cin = COL('#8b6548'), cout = COL('#4e3626'), cmid = COL('#a07a56');
      for (let i = 0; i < 16; i++) {
        const t = i / 15, x = sx * (0.3 + t * 3.9), len = 1.3 - t * 0.35 + (i > 11 ? 0.35 : 0), w = 0.32;
        const z0 = 0.35 - t * 0.25;
        const tip = i > 11 ? cout : cin.clone().lerp(cout, t * 0.6);
        k.tri([x - sx * w / 2, 0.01 * i, z0], [x + sx * w / 2, 0.01 * i, z0], [x + sx * w * 0.2, 0.01 * i - 0.04, z0 - len], cmid, cmid, tip);
        k.tri([x - sx * w / 2, 0.01 * i, z0], [x + sx * w * 0.2, 0.01 * i - 0.04, z0 - len], [x - sx * w * 0.4, 0.01 * i - 0.03, z0 - len * 0.9], cmid, tip, tip);
      }
      // 덮깃: 짧고 밝은 깃 한 줄
      for (let i = 0; i < 10; i++) {
        const x = sx * (0.3 + i * 0.32);
        k.tri([x - sx * 0.2, 0.18, 0.4], [x + sx * 0.2, 0.18, 0.4], [x, 0.16, -0.15], COL('#a8835f'), COL('#a8835f'), cmid);
      }
      return k.geo();
    }
    const wings = [];
    for (const sx of [-1, 1]) {
      const g = new THREE.Group();
      at(g, sx * 0.55, 0.25, 0.2);
      g.add(new THREE.Mesh(wingGeo(sx), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      body.add(g);
      wings.push({ g, side: sx });
    }
    // 갈라진 꼬리깃
    const tk = new Kit();
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) * 0.12, len = 1.5 - Math.abs(i - 4) * 0.08 + (Math.abs(i - 4) > 2 ? 0.25 : 0);
      tk.tri([Math.sin(a) * 0.1 - 0.1, 0, 0], [Math.sin(a) * 0.1 + 0.1, 0, 0], [Math.sin(a) * len, -0.05, -len], COL('#8b6548'), COL('#8b6548'), COL(i % 2 ? '#5a3f2c' : '#6b4b33'));
    }
    const tail = new THREE.Mesh(tk.geo(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    at(tail, 0, 0.1, -1.2);
    body.add(tail);
    // 다리: 노란 발에 굽은 검은 발톱
    const feet = new THREE.Group();
    at(feet, 0, -0.55, 0.1);
    for (const sx of [-1, 1]) {
      feet.add(at(part(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 8), '#f1c33f', 0.012), sx * 0.25, -0.25, 0));
      for (let f = 0; f < 4; f++) {
        const a = f === 3 ? Math.PI : (f - 1) * 0.5;
        feet.add(at(part(taper([[0, 0, 0], [Math.sin(a) * 0.12, -0.02, Math.cos(a) * 0.12], [Math.sin(a) * 0.2, -0.1, Math.cos(a) * 0.18]], 0.03, 0.01, 6, 5), '#2b211c', 0.006), sx * 0.25, -0.52, 0));
      }
    }
    body.add(feet);
    root.userData = { kind: 'bird', body, head, wings, tail, feet };
    return root;
  }

  const MAKE = { gichi: d => makeGichi(d.variant), imomushi: makeImomushi, mukade: makeMukade, arijigoku: makeArijigoku, zou: makeZou, bird: makeBird, anoko: () => root.BigChimera.make('anoko', { part, at, sph, taper, eye, teeth }), dekatsuyo: () => root.BigChimera.make('dekatsuyo', { part, at, sph, taper, eye, teeth }) };

  /* ---------- 화면: 구역 안내판 + 괴물 그리기 ---------- */

  let view = null;
  function build(scene, world) {
    const { signBoard } = window.WeedingField.tools;
    const group = new THREE.Group();
    scene.add(group);
    const signs = [['wilds', 1, [-25, 8]], ['wildsForest', 2, [-29, 10]], ['wildsDeep', 3, [-33, -4]]];
    for (const [place, tier, [lx, lz]] of signs) {
      const p = world.places.find(q => q.id === place);
      if (!p) continue;
      const kinds = [...new Set(DENS.filter(d => d.tier === tier).map(d => KIND[d.kind].name))];
      const t = TIERS[tier];
      const board = signBoard(1.9, 4, (g, w, h) => {
        g.fillStyle = 'rgba(250,244,226,.95)';
        g.fillRect(8, 8, w - 16, h - 16);
        g.fillStyle = ['#7ec8e3', '#f2c94c', '#e25d5d'][tier - 1];
        g.fillRect(8, 8, w - 16, 26);
        g.fillStyle = '#4a2f22';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '800 38px "Malgun Gothic", sans-serif';
        g.fillText(`${t.label}  ·  ${tier}단계 토벌 구역`, w / 2, 72);
        g.font = '600 22px "Malgun Gothic", sans-serif';
        g.fillText('여기 사는 괴물', w / 2, 124);
        g.font = '700 26px "Malgun Gothic", sans-serif';
        kinds.forEach((n, i) => g.fillText(n, w / 2, 162 + i * 34));
        g.font = '600 18px "Malgun Gothic", sans-serif';
        g.fillStyle = '#9a3b2f';
        g.fillText(tier === 1 ? '누구나 · 플레이트 토벌' : tier === 2 ? '무기와 실력이 있는 자만' : '토벌 랭커급만 들어오세요', w / 2, h - 26);
      });
      const x = p.x + lx, z = p.z + lz;
      board.position.set(x, world.floorAt(x, z), z);
      board.rotation.y = Math.atan2(-lx, -lz);
      group.add(board);
    }
    view = { scene, world, group, meshes: new Map() };
  }

  function frame(sim, time, dt, cam) {
    if (!view || !sim) return;
    const w = state(sim);
    for (const den of w.dens) {
      let v = view.meshes.get(den);
      const far = cam && Math.hypot(cam.x - den.home.x, cam.z - den.home.z) > 230 + (cam.dist || 0);
      if (!v) {
        if (far) continue;
        const m = MAKE[den.d.kind](den.d);
        m.scale.setScalar(den.d.s);
        view.scene.add(m);
        v = { m, x: den.x, z: den.z, ang: den.angle, deadT: den.alive ? -1 : 99, popT: 1, wasAlive: den.alive, spit: null };
        view.meshes.set(den, v);
      }
      v.m.visible = !far;
      if (far) continue;
      // 부드럽게 따라간다
      const k = Math.min(1, dt * 4);
      v.x += (den.x - v.x) * k;
      v.z += (den.z - v.z) * k;
      let da = den.angle - v.ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      v.ang += da * Math.min(1, dt * 5);
      if (v.wasAlive && !den.alive) v.deadT = 0;
      if (!v.wasAlive && den.alive) { v.deadT = -1; v.popT = 0; }
      v.wasAlive = den.alive;
      const y = view.world.floorAt(v.x, v.z);
      v.m.position.set(v.x, y, v.z);
      v.m.rotation.set(0, v.ang, 0);
      const moving = Math.hypot(den.x - v.x, den.z - v.z) > 0.03 || den.moving;
      const fight = den.alive && den.mode === 'fight';
      animate(v, den, time, dt, moving, fight);
      // 맞으면 뒤로 밀리며 움찔 (combat-moves.js가 타격 순간에 부른다)
      const hk = den.hitAt ? 1 - (time - den.hitAt) / 0.3 : 0;
      if (hk > 0 && hk <= 1 && den.d.kind !== 'arijigoku') {
        v.m.position.x -= Math.sin(v.ang) * 0.35 * hk * den.d.s;
        v.m.position.z -= Math.cos(v.ang) * 0.35 * hk * den.d.s;
        v.m.scale.set(den.d.s * (1 + 0.08 * hk), den.d.s * (1 - 0.1 * hk), den.d.s * (1 + 0.08 * hk));
      } else v.m.scale.setScalar(den.d.s);
      // 쓰러짐: 옆으로 넘어가며 가라앉고 사라진다. 다시 나타날 때는 땅에서 솟는다
      if (v.deadT >= 0) {
        v.deadT += dt;
        const t = Math.min(1, v.deadT / 1.4);
        v.m.rotation.z = (Math.PI / 2) * t * (den.d.kind === 'bird' ? 1.2 : 1);
        v.m.position.y = y - t * t * 0.6 * den.d.s - (v.deadT > 2 ? (v.deadT - 2) * 1.5 : 0);
        v.m.visible = v.deadT < 3.2;
      } else if (v.popT < 1) {
        v.popT = Math.min(1, v.popT + dt * 0.8);
        v.m.position.y = y - (1 - v.popT) * 1.5 * den.d.s;
      }
    }
  }

  function animate(v, den, time, dt, moving, fight) {
    const u = v.m.userData;
    const ph = time + den.d.i * 1.7;
    if (u.kind === 'gichi') {
      const f = fight ? 14 : 5;
      const walk = moving ? 1 : 0;
      u.body.position.y = Math.abs(Math.sin(ph * (moving ? 10 : 2))) * (moving ? 0.05 : 0.015);
      u.jaw.rotation.x = fight ? 0.15 + Math.abs(Math.sin(ph * f)) * 0.5 : 0.05 + Math.max(0, Math.sin(ph * 1.3)) * 0.15;
      u.head.rotation.x = fight ? -0.15 + Math.sin(ph * 7) * 0.12 : Math.sin(ph * 0.8) * 0.05;
      u.head.position.z = 0.52 + (fight ? Math.max(0, Math.sin(ph * 3.2)) * 0.18 : 0);
      u.head.userData.antL.rotation.z = Math.sin(ph * 3) * 0.2;
      u.head.userData.antR.rotation.z = -Math.sin(ph * 3 + 1) * 0.2;
      for (const l of u.legs) l.g.rotation.x = walk * Math.sin(ph * 10 + l.ph) * 0.45 + (fight ? Math.sin(ph * 12 + l.ph) * 0.15 : 0);
    } else if (u.kind === 'imomushi') {
      const sp = moving ? 4 : 1.5;
      u.segs.forEach((g, i) => {
        g.position.y = 0.29 + Math.max(0, Math.sin(ph * sp - i * 0.8)) * (moving ? 0.12 : 0.03) + (fight && i < 3 ? (3 - i) * 0.12 : 0);
        g.position.x = Math.sin(ph * 0.8 - i * 0.5) * 0.04;
      });
      u.head.position.y = 0.32 + (fight ? 0.45 + Math.sin(ph * 6) * 0.1 : Math.max(0, Math.sin(ph * sp + 0.8)) * 0.05);
      u.head.rotation.x = fight ? -0.3 : 0;
    } else if (u.kind === 'mukade') {
      const sp = moving ? 6 : fight ? 4 : 1.2, amp = moving ? 0.22 : fight ? 0.12 : 0.05;
      u.segs.forEach((g, i) => {
        g.position.x = Math.sin(ph * sp - i * 0.55) * amp;
        g.rotation.y = Math.cos(ph * sp - i * 0.55) * amp * 0.8;
        for (const l of g.userData.legs) l.g.rotation.x = Math.sin(ph * sp * 2 - i * 0.9 + (l.side > 0 ? Math.PI : 0)) * (moving ? 0.6 : 0.15);
        // 싸울 땐 앞마디를 쳐든다
        g.position.y = 0.31 + (fight && i < 4 ? (4 - i) * 0.22 * (0.8 + 0.2 * Math.sin(ph * 3)) : 0);
      });
      u.head.position.x = u.segs[0].position.x;
      u.head.position.y = 0.36 + (fight ? 1.0 : 0);
      u.head.rotation.x = fight ? -0.35 + Math.sin(ph * 5) * 0.15 : 0;
      const bite = fight ? Math.abs(Math.sin(ph * 8)) * 0.5 : Math.sin(ph * 1.5) * 0.1;
      u.head.userData.fangL.rotation.y = -bite;
      u.head.userData.fangR.rotation.y = bite;
      // 산 뱉기: 싸우는 동안 초록 덩어리가 사냥꾼 쪽으로 날아가 바닥에 튄다
      if (fight) {
        if (!v.spit) {
          v.spit = new THREE.Mesh(sph(0.16, 10, 8), new THREE.MeshToonMaterial({ color: '#a6e05a', transparent: true, opacity: 0.85 }));
          view.scene.add(v.spit);
          v.spitT = 0;
        }
        v.spitT += dt;
        const t = (v.spitT % 2.6) / 0.7;
        v.spit.visible = t < 1.3;
        if (t < 1) {
          const s = den.d.s, dir = v.ang;
          const d0 = 0.7 * s, d1 = (den.d.gap - 0.4) * s * 0.9;
          const r = d0 + (d1 - d0) * t;
          v.spit.position.set(v.x + Math.sin(dir) * r, v.m.position.y + (1.4 * s) * (1 - t) + Math.sin(t * Math.PI) * 0.6 + 0.1, v.z + Math.cos(dir) * r);
          v.spit.scale.setScalar(s * (0.8 + t * 0.4));
        } else if (t < 1.3) v.spit.scale.set(den.d.s * (1.5 + (t - 1) * 4), 0.2, den.d.s * (1.5 + (t - 1) * 4));
      } else if (v.spit) v.spit.visible = false;
    } else if (u.kind === 'arijigoku') {
      const up = fight ? 0.55 + Math.sin(ph * 4) * 0.08 : 0.05 + Math.max(0, Math.sin(ph * 0.4)) * 0.15;
      u.bug.position.y += (up - u.bug.position.y) * Math.min(1, dt * 4);
      const snap = fight ? Math.abs(Math.sin(ph * 6)) * 0.55 : 0.2 + Math.sin(ph * 0.9) * 0.15;
      u.head.userData.jawL.rotation.y = snap;
      u.head.userData.jawR.rotation.y = -snap;
      u.head.rotation.x = fight ? -0.25 : 0;
      // 모래 뿌리기
      u.spray.forEach((g, i) => {
        const t = ((ph * (fight ? 1.4 : 0.35) + i * 0.1) % 1);
        const on = fight || Math.sin(ph * 0.4) > 0.7;
        g.visible = on;
        if (!on) return;
        const a = i * 0.63 + Math.floor(ph * 0.5) * 1.3;
        g.position.set(Math.cos(a) * t * 2.2, 0.3 + Math.sin(t * Math.PI) * 1.4, Math.sin(a) * t * 2.2 + 0.4);
      });
      v.m.rotation.y = 0; // 둔덕은 돌지 않는다. 애벌레만 사냥꾼을 본다
      u.bug.rotation.y = v.ang;
    } else if (u.kind === 'zou') {
      const sp = moving ? 3 : 1;
      u.body.rotation.z = Math.sin(ph * sp) * (moving ? 0.05 : 0.015);
      u.body.position.y = Math.abs(Math.sin(ph * sp)) * (moving ? 0.12 : 0.03);
      u.legs.forEach((g, i) => { g.rotation.x = moving ? Math.sin(ph * sp + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.35 : 0; });
      u.head.userData.earL.rotation.y = -0.2 + Math.sin(ph * 2.2) * 0.25;
      u.head.userData.earR.rotation.y = 0.2 - Math.sin(ph * 2.2) * 0.25;
      u.head.rotation.x = fight ? -0.2 + Math.sin(ph * 3) * 0.1 : Math.sin(ph * 0.6) * 0.04;
      u.tail.rotation.z = Math.sin(ph * 3) * 0.4;
      // 옆구리 팔: 평소엔 몸에 붙이고, 싸울 땐 앞으로 뻗어 휘두른다
      for (const a of u.arms) {
        const swing = fight ? Math.sin(ph * 2.6 + (a.side > 0 ? Math.PI : 0)) : 0;
        a.sh.rotation.x = fight ? -0.9 - swing * 0.6 : 0.4 + Math.sin(ph * 0.7) * 0.05;
        a.sh.rotation.z = a.side * (fight ? 0.2 : -0.35);
        a.fore.rotation.x = fight ? -0.5 + swing * 0.4 : 0.3;
      }
    } else if (u.kind === 'anoko' || u.kind === 'dekatsuyo') {
      root.BigChimera.animate(u, ph, moving, fight);
    } else if (u.kind === 'bird') {
      // 평소엔 굴 위 하늘을 크게 돈다. 싸울 땐 내려와 사냥꾼 앞에서 날개를 퍼덕이며 발톱을 세운다
      const flap = fight ? Math.sin(ph * 9) : moving ? Math.sin(ph * 4) : Math.sin(ph * 2.5) * 0.4;
      for (const wg of u.wings) wg.g.rotation.z = wg.side * (0.15 + flap * 0.55);
      if (!fight) {
        const r = 12 * den.d.s, a = ph * 0.25;
        v.m.position.x = den.home.x + Math.cos(a) * r;
        v.m.position.z = den.home.z + Math.sin(a) * r;
        v.m.position.y += 11 + Math.sin(ph * 0.7) * 1.2;
        v.m.rotation.y = -a;
        v.m.rotation.z = 0.25;
        u.feet.rotation.x = 0.9;
        u.body.rotation.x = 0;
      } else {
        v.m.position.y += 1.6 + Math.sin(ph * 9) * 0.15;
        u.feet.rotation.x = -0.6 + Math.sin(ph * 4) * 0.3;
        u.body.rotation.x = -0.35;
        u.head.rotation.x = 0.2 + Math.sin(ph * 4) * 0.15;
      }
    }
  }

  const hit = (den, time) => { den.hitAt = time; };
  // 쓰러진 괴물과 다시 나타날 시각을 저장한다
  function save(sim) { return state(sim).dens.map(n => (n.alive ? null : { back: n.back })); }
  function load(sim, list) {
    if (!list) return;
    state(sim).dens.forEach((n, i) => {
      if (!list[i]) return;
      Object.assign(n, { alive: false, mode: 'dead', foe: null, back: list[i].back });
      const so = sockOf(sim, n);
      if (so) {
        so.reachWas = so.reach;
        so.reach = false;
      }
    });
  }
  root.WildZones = { TIERS, KIND, DENS, build, frame, state, defeat, revive, aliveIn, hit, save, load };
}(typeof self !== 'undefined' ? self : this));
