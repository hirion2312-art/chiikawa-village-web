'use strict';

// 치이카와 심즈 — 체력과 구조 헬기 (2026-11-11 이재헌 지시)
// - 체력(0~100)은 토벌 중 싸우는 동안 깎인다. 깊은 구역일수록, 약할수록 많이. 무기·같이 싸우는 친구가 있으면 덜. 토벌에 실패하면 한 번 더 크게
// - 싸우지 않을 때는 천천히 차오르고, 잠·밥이 더 채운다. 체력이 낮으면 토벌·훈련을 하지 않고 약국에 들른다
// - 체력이 0이 되면: 엑스트라는 비틀거리며 물러나고, 메인급 캐릭터는 그 자리에 쓰러진다 → 약국 앞 거치대의 대나무 헬리콥터가 날아와
//   머리를 집게로 집어 들고 → 약국까지 날아가 내려놓고 → 약국에서 치료받으면 체력이 다 찬다
// 시뮬레이션(헬기 위치·단계)은 화면을 모르고, 그리기는 frame()에서 한다
(function (root) {
  const MAX = 100;
  const LOW = 35;                 // 이보다 낮으면 싸우러 가지 않는다
  const ALT = 7;                  // 나는 높이 (집게 끝 기준)
  const SPEED = 26;               // 게임 1분에 나는 거리
  const CLIMB = 5;                // 게임 1분에 오르내리는 높이
  const RX = root.VillageObjects;

  /* ---------- 약국 치료 ---------- */
  const TREAT = {
    id: 'pharmacy.treat', place: 'pharmacy', name: '약국에서 치료받기', treat: true, gain: { energy: 15 },
    steps: [
      { socket: 'counter_stand', act: 'talk', min: 3, clip: 'talk_order', label: '약사 요로이씨에게 아픈 데를 보여 주는 중' },
      { socket: 'wait_sit_*', act: 'rest', min: 40, clip: 'sit_idle', label: '약을 바르고 쉬는 중' },
    ],
  };
  RX.LIST.push(TREAT);
  if (RX.BY_ID) RX.BY_ID[TREAT.id] = TREAT;

  /* ---------- 체력 ---------- */
  const hpOf = c => (c.hp === undefined ? (c.hp = MAX) : c.hp);
  // 지금 싸우고 있는 구역의 깊이 (싸우지 않으면 0)
  function fightTier(c) {
    const d = c.doing;
    if (!d || d.kind !== 'obj' || d.phase !== 'use' || c.walking) return 0;
    const x = d.x;
    const st = x.steps[d.step];
    if (!st || st.act !== 'confront') return 0;
    if (x.huntTier) return x.huntTier;
    if (/rakko_hunt/.test(x.id) || /^wilds/.test(x.place)) return 1;
    return 0;
  }
  const HUNTY = x => x.takeKind === 'hunt' || x.plate === 'hunt' || x.huntTier || /rakko_hunt|^hunt\./.test(x.id);

  const V = root.Village.Village.prototype;
  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    const s = this;
    const last = s.hpLast === undefined ? s.minutes : s.hpLast;
    const dm = Math.max(0, Math.min(5, s.minutes - last));
    s.hpLast = s.minutes;
    if (dm > 0) for (const c of s.chars) hpTick(s, c, dm);
    heliTick(s, dm);
  };

  function hpTick(s, c, dm) {
    if (c.monster || c.gone || c.rescue) return;
    let hp = hpOf(c);
    const tier = fightTier(c);
    if (tier) {
      const base = [0, 0.9, 1.6, 2.6][Math.min(3, tier)];
      const power = s.persona ? s.persona.power(c) : 300;
      let k = Math.max(0.35, Math.min(1.4, 1.6 - power / 700));
      if (c.id === 'rakko') k = 0.08;            // 토벌 랭킹 1위: 거의 다치지 않는다
      if (root.Shop && root.Shop.owns(c, 'weapon')) k *= 0.8;
      if (c.party && c.party.members.some(m => m !== c && fightTier(m))) k *= 0.85;
      hp -= base * k * dm;
    } else {
      const sleeping = c.hidden || (c.doing && c.doing.x && c.doing.x.night);
      hp += (sleeping ? 12 : 5) / 60 * dm;
    }
    c.hp = Math.max(0, Math.min(MAX, hp));
    if (c.hp <= 0) knockout(s, c);
  }

  // 체력 0
  function knockout(s, c) {
    if (c.plate && c.plate.state === 'accepted') c.plate.state = 'failed';
    s.abort(c, '');
    if (c.extra || c.troupe) {
      // 엑스트라는 비틀거리며 물러난다
      c.hp = 20;
      if (s.labor) s.labor.react(c, 'wobble_fear');
      s.note(`${c.name}: 다쳐서 물러났어요`);
      return;
    }
    c.rescue = { phase: 'down', at: s.minutes };
    c.orders = [];
    c.clip = 'nap_down';
    c.act = 'down';
    c.walking = false;
    c.prop = null;
    const H = heli(s);
    H.queue.push(c.id);
    s.note(`🚁 ${c.name}: 쓰러졌어요! 대나무 헬리콥터가 데리러 가요`);
    if (s.traits) s.traits.setFeel(c, 'sad', '토벌하다 쓰러져서', 4);
  }

  // 쓰러진 동안은 스스로 움직이지 않는다
  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    if (c.rescue) {
      c.walking = false;
      c.act = 'down';
      if (c.rescue.phase === 'down') c.clip = 'nap_down';
      return;
    }
    return tickChar0.call(this, c, dt);
  };

  /* ---------- 대나무 헬리콥터 ----------
     진짜 헬기가 아니라 손바닥만 한 대나무 헬리콥터다 (원작). 대나무 막대 위에 프로펠러, 아래에 빨래집게 같은 집게.
     약국 앞 거치대에 세 대가 걸려 있다가, 쓰러진 아이마다 한 대씩 날아가 머리를 집어 들고 약국까지 데려다 놓는다 */
  const SLOTS = 3;
  const floor = (s, x, z) => (s.world && s.world.floorAt ? s.world.floorAt(x, z) : 0);
  const HEAD = 1.35;              // 발에서 머리 꼭대기까지 (집게가 무는 곳)
  function heli(s) {
    if (s.heli) return s.heli;
    const p = s.places.pharmacy || Object.values(s.places)[0];
    const th = ((p.face || 0) * Math.PI) / 2;
    // 약국 앞마당 (장소의 앞쪽)
    const pad = s.snap({ x: p.x + Math.sin(th) * (p.r + 5), z: p.z + Math.cos(th) * (p.r + 5) }) || { x: p.x, z: p.z };
    const drop = s.snap({ x: pad.x + Math.cos(th) * 2.2, z: pad.z - Math.sin(th) * 2.2 }) || pad;
    const copters = [];
    for (let i = 0; i < SLOTS; i++) {
      const home = { x: pad.x + Math.cos(th) * (i - 1) * 0.5, z: pad.z - Math.sin(th) * (i - 1) * 0.5, alt: 1.75 };
      copters.push({ i, x: home.x, z: home.z, alt: home.alt, yaw: th, home, phase: 'parked', victim: null, wait: 0 });
    }
    s.heli = { pad, drop, yaw: th, copters, queue: [] };
    return s.heli;
  }
  function flyTo(H, tx, tz, dm) {
    const dx = tx - H.x, dz = tz - H.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const want = Math.atan2(dx, dz);
    let dy = want - H.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    H.yaw += dy * Math.min(1, dm * 4);
    const step = Math.min(d, SPEED * dm);
    H.x += (dx / d) * step;
    H.z += (dz / d) * step;
    return step >= d - 0.01;
  }
  const toward = (v, t, rate) => (v < t ? Math.min(t, v + rate) : Math.max(t, v - rate));

  function copterTick(s, Hh, H, dm) {
    const vic = H.victim ? s.chars.find(c => c.id === H.victim) : null;
    switch (H.phase) {
      case 'parked':
        if (Hh.queue.length) { H.victim = Hh.queue.shift(); H.phase = 'rise'; }
        break;
      case 'rise':
        H.alt = toward(H.alt, ALT, CLIMB * dm);
        if (H.alt >= ALT) H.phase = 'out';
        break;
      case 'out':
        if (!vic) { H.phase = 'home'; break; }
        if (flyTo(H, vic.x, vic.z, dm)) H.phase = 'down';
        break;
      case 'down':
        // 머리 꼭대기까지 내려와서
        H.alt = toward(H.alt, HEAD + 0.05, CLIMB * dm);
        if (H.alt <= HEAD + 0.05) { H.phase = 'grab'; H.wait = 0.8; }
        break;
      case 'grab':
        // 집게로 콕 집는다
        H.wait -= dm;
        if (H.wait <= 0) { H.phase = 'up'; if (vic) vic.rescue.phase = 'carried'; }
        break;
      case 'up':
        H.alt = toward(H.alt, ALT, CLIMB * dm);
        if (H.alt >= ALT) H.phase = 'back';
        break;
      case 'back':
        if (flyTo(H, Hh.drop.x, Hh.drop.z, dm)) H.phase = 'lower';
        break;
      case 'lower':
        // 발이 땅에 닿을 때까지 내려놓는다
        H.alt = toward(H.alt, HEAD + 0.02, CLIMB * dm);
        if (H.alt <= HEAD + 0.02) { H.phase = 'release'; H.wait = 0.6; }
        break;
      case 'release':
        H.wait -= dm;
        if (H.wait <= 0) {
          if (vic) unload(s, Hh, vic);
          H.victim = null;
          H.phase = 'home';
        }
        break;
      case 'home':
        if (H.alt < 3) H.alt = toward(H.alt, 3, CLIMB * dm);
        else if (flyTo(H, H.home.x, H.home.z, dm)) H.phase = 'dock';
        break;
      case 'dock':
        H.alt = toward(H.alt, H.home.alt, CLIMB * dm);
        H.yaw = Hh.yaw;
        if (H.alt <= H.home.alt) H.phase = 'parked';
        break;
      default:
        H.phase = 'parked';
    }
    // 집힌 아이는 집게 아래에 매달려 간다
    if (vic && vic.rescue && vic.rescue.phase === 'carried') {
      vic.x = H.x;
      vic.z = H.z;
      vic.h = Math.max(0, H.alt - HEAD);
      vic.angle = H.yaw;
      vic.clip = 'nap_down';
    }
  }
  function heliTick(s, dm) {
    const Hh = s.heli;
    if (!Hh || dm <= 0) return;
    for (const H of Hh.copters) copterTick(s, Hh, H, dm);
  }

  function unload(s, Hh, c) {
    c.rescue = null;
    c.act = null;
    c.clip = null;
    c.h = s.nav ? s.nav.surface(c.x, c.z) : 0;
    c.hp = Math.max(c.hp, 10);
    s.note(`🚁 ${c.name}: 약국에 도착했어요. 치료를 받아요`);
    const x = s.interactions.find(i => i.id === TREAT.id);
    if (x) s.start(c, x, null, true);
  }

  /* ---------- 고르기: 아프면 싸우러 가지 않고 약국에 들른다 ---------- */
  const L = root.Labor.prototype;
  const blocked0 = L.blocked;
  L.blocked = function (c, x) {
    if (c.rescue) return '쓰러져 있어요';
    if (HUNTY(x) && hpOf(c) < LOW) return '몸이 아파서 싸울 수 없어요';
    if (x.treat && hpOf(c) >= MAX) return '아픈 데가 없어요';
    return blocked0.call(this, c, x);
  };
  const score0 = L.scoreBonus;
  L.scoreBonus = function (c, x) {
    let v = score0.call(this, c, x);
    const hp = hpOf(c);
    if (x.treat) v += hp < 50 ? 40 + (50 - hp) : -20;
    // 체력이 적당히 깎였으면 깊은 구역은 피한다
    if (x.huntTier && hp < 70) v -= (70 - hp) * 0.8 * x.huntTier;
    return v;
  };
  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    const failedBefore = c.plate && c.plate.state === 'failed';
    finish0.call(this, c, x);
    const s = this.sim;
    // 토벌 실패: 한 번 크게 다친다
    if (x.plate === 'hunt' && c.plate && c.plate.state === 'failed' && !failedBefore) {
      c.hp = Math.max(0, hpOf(c) - 25);
      if (c.hp <= 0) knockout(s, c);
    }
    // 밥을 먹으면 조금, 치료를 받으면 다
    if ((x.gain.hunger || 0) >= 20) c.hp = Math.min(MAX, hpOf(c) + 5);
    if (x.treat) {
      c.hp = MAX;
      if (s.traits) s.traits.setFeel(c, 'calm', '약국에서 치료받아서', 3);
    }
  };
  const save0 = L.save;
  L.save = function (c) { return { ...save0.call(this, c), hp: hpOf(c) }; };
  const load0 = L.load;
  L.load = function (c, r) {
    load0.call(this, c, r);
    if (r && typeof r.hp === 'number') c.hp = r.hp;
  };

  /* ---------- 그리기 ---------- */
  const models = [];
  let standBuilt = false;
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const INK = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
  function part(parent, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, outline = true) {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    if (outline) { const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1.08); m.add(o); }
    parent.add(m);
    return m;
  }
  const SPH = new THREE.SphereGeometry(1, 16, 12);
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  // 대나무 헬리콥터 한 대: 원점 = 집게 끝(아이 머리 꼭대기에 닿는 곳)
  function buildCopter(scene) {
    const g = new THREE.Group();
    // 집게: 빨래집게처럼 두 쪽, 가운데 쇠 용수철
    const clamp = new THREE.Group();
    g.add(clamp);
    const jaws = [-1, 1].map(s => { const j = part(clamp, BOX, '#d9b98c', s * 0.05, 0.12, 0, 0.05, 0.24, 0.1); j.rotation.z = s * 0.12; return j; });
    part(clamp, CYL, '#8f969a', 0, 0.16, 0, 0.035, 0.08, 0.035, false).rotation.x = Math.PI / 2;
    // 대나무 막대: 마디 둘
    part(g, CYL, '#9cc46a', 0, 0.42, 0, 0.035, 0.42, 0.035);
    for (const y of [0.32, 0.52]) part(g, CYL, '#7fa85a', 0, y, 0, 0.042, 0.025, 0.042, false);
    // 프로펠러: 가운데 마디와 비틀린 대나무 날개 둘
    part(g, CYL, '#7fa85a', 0, 0.66, 0, 0.06, 0.06, 0.06);
    const prop = new THREE.Group();
    prop.position.set(0, 0.7, 0);
    g.add(prop);
    for (const s of [-1, 1]) {
      const b = part(prop, BOX, '#b5d68a', s * 0.36, 0, 0, 0.66, 0.015, 0.12);
      b.rotation.x = s * 0.22;
    }
    // 끝에 매단 작은 빨간 리본 (구조용 표시)
    part(g, BOX, '#d64545', 0.06, 0.45, 0, 0.08, 0.05, 0.01, false);
    scene.add(g);
    return { g, prop, jaws };
  }
  function buildStand(scene, s, Hh) {
    standBuilt = true;
    const y = floor(s, Hh.pad.x, Hh.pad.z);
    const g = new THREE.Group();
    g.position.set(Hh.pad.x, y, Hh.pad.z);
    g.rotation.y = Hh.yaw;
    scene.add(g);
    // 나무 받침과 기둥 둘, 가로 막대에 걸이 셋, 작은 팻말
    part(g, BOX, '#a06e4a', 0, 0.06, 0, 1.8, 0.12, 0.6);
    for (const x of [-0.8, 0.8]) part(g, CYL, '#6f4630', x, 1, 0, 0.05, 1.9, 0.05);
    part(g, CYL, '#6f4630', 0, 1.9, 0, 0.04, 1.7, 0.04).rotation.z = Math.PI / 2;
    for (let i = 0; i < SLOTS; i++) part(g, CYL, '#8f969a', (i - 1) * 0.5, 1.83, 0, 0.012, 0.14, 0.012, false);
    part(g, BOX, '#fffaf0', 0, 0.55, 0.32, 0.9, 0.36, 0.03);
    part(g, BOX, '#d64545', -0.3, 0.55, 0.34, 0.06, 0.2, 0.01, false);
    part(g, BOX, '#d64545', -0.3, 0.55, 0.34, 0.2, 0.06, 0.01, false);
    if (root.PublicSets && root.PublicSets.text) {
      root.PublicSets.text(makeKit(g, 0, 0, 0), 0.12, 0.55, 0.36, 0.55, 0.3, ['구조용'], '#5a3b33', 0.12);
    }
  }

  function frame(sim, scene, time, dt) {
    const Hh = heli(sim);
    if (!standBuilt) buildStand(scene, sim, Hh);
    Hh.copters.forEach((H, i) => {
      const m = models[i] || (models[i] = buildCopter(scene));
      const flying = H.phase !== 'parked';
      const fy = floor(sim, H.x, H.z);
      const bob = flying && H.phase !== 'grab' && H.phase !== 'release' ? Math.sin(time * 3 + i) * 0.05 : 0;
      m.g.position.set(H.x, fy + H.alt + bob, H.z);
      m.g.rotation.y = H.yaw;
      // 날 때는 앞으로 살짝 기운다
      m.g.rotation.x = H.phase === 'out' || H.phase === 'back' ? 0.15 : 0;
      m.spin = flying ? Math.min(1, (m.spin || 0) + dt * 1.5) : Math.max(0, (m.spin || 0) - dt * 0.5);
      m.prop.rotation.y += m.spin * dt * 30;
      // 집게: 집을 때 오므리고, 놓을 때 벌린다
      const closed = H.victim && (H.phase === 'up' || H.phase === 'back' || H.phase === 'lower' || (H.phase === 'grab' && H.wait < 0.4));
      m.jaws.forEach((j, k) => { j.rotation.z = (k ? 1 : -1) * (closed ? 0.02 : 0.3); });
    });
  }

  root.RescueHeli = { frame, heli, MAX, LOW, hpOf, TREAT, knockout };
}(typeof self !== 'undefined' ? self : this));
