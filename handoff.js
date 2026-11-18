'use strict';

// 치이카와 심즈 — 주고받기 장치 (기획서 docs/visible-actions-plan-2026-11-11.md §3-A, 1차)
// 돈·물건·종이가 사람 사이를 오가는 순간을 실제 모델로 보여 준다.
// 주는 쪽(사람 또는 창구·계산대)에서 받는 쪽 손으로 포물선을 그리며 건너가고, 사람이면 건네기·받기 동작을 한다.
//  - 보수·퇴근·알바 수입: 창구에서 동전이 손으로 → 받은 사람은 주머니에 넣는다
//  - 사기: 값을 낼 때 동전이 계산대로, 다 사면 물건(무기·교과서·낚싯대)을 받아 든다
//  - 노동 플레이트: 꽂이에서 뽑아 들고, 정산할 때 창구로 돌려준다
//  - 제초 주머니·자격증 카드·장 본 봉투·간식·선물·희귀본
// 시뮬레이션은 s.handoffs에 "무엇이 누구에게서 누구에게" 만 적고, 그리기는 frame()이 한다
(function (root) {
  const DUR = 0.9;                       // 건너가는 데 걸리는 게임 분
  const HAND = 0.55;                     // 손 높이 (발 기준)
  const Vis = root.Visible;

  /* ---------- 시뮬레이션 쪽 ---------- */
  const byName = (s, name) => s.chars.find(c => !c.extra && c.name === name) || (s.cur && s.cur.name === name ? s.cur : null);
  // 창구·계산대 쪽 한 점: 지금 쓰는 자리가 바라보는 곳 (없으면 앞쪽 1.2m)
  function counterOf(s, c) {
    const so = c.doing && c.doing.socket;
    if (so && so.fx !== undefined) return { x: so.fx, z: so.fz, y: (so.h || 0) + 1.0 };
    return { x: c.x + Math.sin(c.angle || 0) * 1.2, z: c.z + Math.cos(c.angle || 0) * 1.2, y: (c.h || 0) + 1.0 };
  }
  // 사람의 동작: 하던 단계가 계속되면 잠깐 그 동작으로, 끝났으면 반응으로
  function gesture(s, c, clip) {
    if (!c || c.monster || c.hidden) return;
    if (c.doing && c.doing.phase === 'use') c.beat = { clip, until: s.minutes + 1.1, angle: c.angle, step: c.doing.step };
    else if (s.labor) s.labor.react(c, clip);
  }
  function give(s, from, to, kind, opts = {}) {
    s.handoffs = s.handoffs || [];
    const h = { kind, n: opts.n || 1, color: opts.color, from, to, t0: s.minutes + (opts.delay || 0), dur: opts.dur || DUR, id: (s.handoffSeq = (s.handoffSeq || 0) + 1) };
    s.handoffs.push(h);
    if (!opts.quiet && from && from.id) gesture(s, from, 'give_hand');
    if (!opts.quiet && to && to.id) gesture(s, to, 'receive');
    s.handoffCount = (s.handoffCount || 0) + 1;
    return h;
  }
  const coinsFor = amount => Math.max(1, Math.min(6, Math.round(amount / 300)));
  const PLATE_COLOR = { grass: '#b7d6a5', hunt: '#e6a79a', gather: '#e8c97c', lemon: '#f2e27a' };
  const ITEM_OF = name => (/무기/.test(name) ? 'weapon' : /교과서/.test(name) ? 'book' : /낚싯대/.test(name) ? 'rod' : 'bag');

  if (Vis) {
    // 보수: 창구 갑옷씨가 동전을 건넨다 (+ 들고 온 플레이트를 돌려준다)
    Vis.on(/^([^:]+): (.+) 보수 \+(\d+)원$/, (s, t, m) => {
      const c = byName(s, m[1]);
      if (!c) return;
      give(s, c, counterOf(s, c), 'plate', { color: c.plate && PLATE_COLOR[c.plate.kind] });
      give(s, counterOf(s, c), c, 'coins', { n: coinsFor(+m[3]), delay: 0.6 });
    }, '보수: 플레이트를 돌려주고 동전을 받는다');
    Vis.on(/^([^:]+): 플레이트를 돌려줬어요$/, (s, t, m) => { const c = byName(s, m[1]); if (c) give(s, c, counterOf(s, c), 'plate'); }, '빈손 정산: 플레이트를 돌려준다');
    Vis.on(/^([^:]+): 퇴근 \(\+(\d+)원\)$/, (s, t, m) => { const c = byName(s, m[1]); if (c) give(s, counterOf(s, c), c, 'coins', { n: coinsFor(+m[2]) }); }, '퇴근: 일당 동전을 받는다');
    Vis.on(/^([^:]+): (.+) 끝 \(\+(\d+)원\)$/, (s, t, m) => { const c = byName(s, m[1]) || s.cur; if (c) give(s, counterOf(s, c), c, 'coins', { n: coinsFor(+m[3]) }); }, '일 끝: 번 돈을 받는다');
    Vis.on(/^([^:]+): 갑옷씨에게 제초 주머니를 받았어요$/, (s, t, m) => { const c = byName(s, m[1]) || s.cur; if (c) give(s, counterOf(s, c), c, 'sack'); }, '제초 주머니를 건네받는다');
    Vis.on(/^([^:]+): (.+) 카드를 받았어요$/, (s, t, m) => { const c = byName(s, m[1]); if (c) give(s, counterOf(s, c), c, 'card'); }, '자격증 카드를 건네받는다');
    Vis.on(/^([^:]+): (.+)[을를] 샀어요$/, (s, t, m) => { const c = byName(s, m[1]) || s.cur; if (c) give(s, counterOf(s, c), c, ITEM_OF(m[2])); }, '산 물건을 받아 든다');
    Vis.on(/^([^:]+): (.+)에게 (.+)을\(를\) 선물했어요$/, (s, t, m) => {
      const a = byName(s, m[1]), b = byName(s, m[2]);
      if (a && b) give(s, a, b, /식량/.test(m[3]) ? 'bag' : 'snack');
    }, '선물을 손에서 손으로');
    Vis.on(/희귀본을 찾았어요/, s => { const c = s.chars.find(o => o.id === 'furuhonya'); if (c) give(s, counterOf(s, c), c, 'book', { color: '#7a3540' }); }, '선반에서 희귀본을 꺼내 든다');
    // 꽂이에서 플레이트를 뽑아 든다 (창구 접수 때는 이미 들고 있으니 건너뛴다)
    Vis.on(/^([^:]+): .+ 플레이트를 가져갔어요$/, (s, t, m) => {
      const c = byName(s, m[1]) || s.cur;
      if (c && !(c.doing && c.doing.x.accept)) give(s, counterOf(s, c), c, 'plate', { color: c.plate && PLATE_COLOR[c.plate.kind] });
    }, '꽂이에서 플레이트를 뽑아 든다');
  }

  // 도착하는 순간에 일어나는 것: 플레이트 뽑기, 값 내기
  const L = root.Labor.prototype;
  const arrive0 = L.onArrive;
  L.onArrive = function (c, d) {
    const s = this.sim;
    const paying = !d.paid && d.x.cost;
    const ok = arrive0.call(this, c, d);
    if (ok && paying) give(s, c, counterOf(s, c), 'coins', { n: coinsFor(d.x.cost) });
    return ok;
  };
  // 장을 보면 봉투를, 간식을 사면 봉지를 받아 든다
  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    finish0.call(this, c, x);
    const s = this.sim;
    if (x.groceries) give(s, counterOf(s, c), c, 'bag');
    if (x.pack) give(s, counterOf(s, c), c, 'snack');
  };

  // 지금 움직이는 주민 (이름이 '엑스트라'인 알림의 주인을 찾을 때)
  const V = root.Village.Village.prototype;
  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    this.cur = c;
    try { return tickChar0.call(this, c, dt); } finally { this.cur = null; }
  };
  // 다 건너간 것은 지운다
  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    if (this.handoffs && this.handoffs.length) this.handoffs = this.handoffs.filter(h => this.minutes < h.t0 + h.dur + 0.6);
  };

  /* ---------- 그리기 ---------- */
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const INK = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
  function part(g, geo, color, x, y, z, ink = true) {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z);
    if (ink) { const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1.12); m.add(o); }
    g.add(m);
    return m;
  }
  const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const CYL = (r, h) => new THREE.CylinderGeometry(r, r, h, 14);
  const SPH = r => new THREE.SphereGeometry(r, 12, 8);
  function model(h) {
    const g = new THREE.Group();
    switch (h.kind) {
      case 'coins':
        for (let i = 0; i < h.n; i++) part(g, CYL(0.045, 0.012), '#e3bb4a', (i % 3 - 1) * 0.04, Math.floor(i / 3) * 0.014, (i % 2) * 0.02, i === 0);
        break;
      case 'plate':
        part(g, BOX(0.2, 0.28, 0.025), '#c9a57c', 0, 0, 0);
        part(g, BOX(0.17, 0.06, 0.03), h.color || '#b7d6a5', 0, 0.08, 0, false);
        part(g, CYL(0.02, 0.03), '#5a3b33', 0, 0.12, 0, false).rotation.x = Math.PI / 2;
        break;
      case 'card':
        part(g, BOX(0.15, 0.1, 0.008), '#fffaf0', 0, 0, 0);
        part(g, BOX(0.05, 0.06, 0.01), '#f6bcc8', -0.04, 0, 0, false);
        break;
      case 'book':
        part(g, BOX(0.18, 0.24, 0.05), h.color || '#7fa86a', 0, 0, 0);
        part(g, BOX(0.17, 0.23, 0.04), '#fffaf0', 0.006, 0, 0, false);
        break;
      case 'bag':
        part(g, BOX(0.22, 0.24, 0.14), '#d9b98c', 0, 0, 0);
        part(g, SPH(0.06), '#7fa86a', -0.04, 0.14, 0, false);
        part(g, CYL(0.02, 0.18), '#e8894e', 0.05, 0.16, 0, false).rotation.z = 0.3;
        break;
      case 'snack':
        part(g, BOX(0.14, 0.1, 0.05), '#f2748e', 0, 0, 0);
        part(g, BOX(0.08, 0.05, 0.055), '#fffaf0', 0, 0, 0, false);
        break;
      case 'sack':
        part(g, SPH(0.13), '#e6d6b0', 0, 0, 0);
        part(g, CYL(0.04, 0.05), '#c9a57c', 0, 0.12, 0, false);
        break;
      case 'weapon':
        part(g, CYL(0.018, 0.7), '#8f969a', 0, 0, 0).rotation.z = 0.5;
        part(g, BOX(0.2, 0.03, 0.03), '#8f969a', 0.16, 0.3, 0, false);
        break;
      case 'bite':                         // 젓가락에 집은 한입 (차슈·반찬)
        part(g, CYL(0.006, 0.22), '#a06e4a', 0.02, 0.04, 0, false).rotation.z = 0.25;
        part(g, CYL(0.006, 0.22), '#a06e4a', -0.01, 0.04, 0, false).rotation.z = 0.15;
        part(g, CYL(0.04, 0.025), '#d9a36a', 0, -0.06, 0);
        break;
      case 'mallow':                       // 꼬챙이에 꽂아 구운 마시멜로
        part(g, CYL(0.006, 0.34), '#8b5a3c', 0, 0, 0, false).rotation.z = 1.1;
        part(g, CYL(0.035, 0.05), '#f6e2c0', 0.15, 0.07, 0).rotation.z = 1.1;
        break;
      case 'cup':
        part(g, CYL(0.05, 0.08), '#fffaf0', 0, 0, 0);
        part(g, CYL(0.045, 0.01), '#c58a54', 0, 0.036, 0, false);
        break;
      case 'towel':
        part(g, BOX(0.18, 0.04, 0.1), '#fffaf0', 0, 0, 0);
        part(g, BOX(0.18, 0.042, 0.02), '#9fc6e6', 0, 0, 0.03, false);
        break;
      case 'bowl':                         // 밥공기
        part(g, new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#fffaf0', 0, 0.05, 0);
        part(g, SPH(0.075), '#fffdf4', 0, 0.045, 0, false).scale.y = 0.35;
        break;
      case 'dish':                         // 반찬 접시
        part(g, CYL(0.09, 0.02), '#fffaf0', 0, 0, 0);
        part(g, SPH(0.04), '#e8894e', -0.02, 0.025, 0, false);
        part(g, SPH(0.03), '#7fa86a', 0.035, 0.02, 0.01, false);
        break;
      case 'takoyaki':                     // 이쑤시개에 꽂은 타코야키
        part(g, CYL(0.004, 0.16), '#e6d6b0', 0, 0.06, 0, false);
        part(g, SPH(0.045), '#c8823f', 0, 0, 0);
        part(g, BOX(0.05, 0.01, 0.02), '#5a3b33', 0, 0.04, 0, false);
        break;
      case 'cream':                        // 소프트크림 콘
        part(g, new THREE.ConeGeometry(0.045, 0.13, 12), '#e0b06a', 0, -0.06, 0).rotation.x = Math.PI;
        part(g, SPH(0.055), '#fffaf0', 0, 0.03, 0);
        part(g, new THREE.ConeGeometry(0.03, 0.06, 10), '#fffaf0', 0, 0.09, 0, false);
        break;
      case 'rod':
        part(g, CYL(0.01, 0.9), '#a06e4a', 0, 0, 0).rotation.z = 0.6;
        break;
      default:
        part(g, SPH(0.08), '#fffaf0', 0, 0, 0);
    }
    return g;
  }
  const floorAt = (s, x, z) => (s.world && s.world.floorAt ? s.world.floorAt(x, z) : 0);
  function posOf(s, end) {
    if (!end) return null;
    if (end.id) {
      const c = s.chars.find(o => o.id === end.id) || end;
      // 손 앞쪽
      const a = c.angle || 0;
      return { x: c.x + Math.sin(a) * 0.3, z: c.z + Math.cos(a) * 0.3, y: floorAt(s, c.x, c.z) + (c.h || 0) + HAND };
    }
    return { x: end.x, z: end.z, y: floorAt(s, end.x, end.z) + (end.y || 1) };
  }
  const live = new Map();
  function frame(sim, scene) {
    const list = sim.handoffs || [];
    const seen = new Set();
    for (const h of list) {
      seen.add(h.id);
      let m = live.get(h.id);
      if (!m) { m = model(h); m.userData.k = 3.2; scene.add(m); live.set(h.id, m); }
      const u = ((sim.smoothMinutes ? sim.smoothMinutes() : sim.minutes) - h.t0) / h.dur;
      const a = posOf(sim, h.from), b = posOf(sim, h.to);
      if (!a || !b || u < 0) { m.visible = false; continue; }
      m.visible = true;
      if (u <= 1) {
        const k = u * u * (3 - 2 * u);
        m.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + Math.sin(u * Math.PI) * 0.7, a.z + (b.z - a.z) * k);
        m.rotation.y = u * 4;
        m.scale.setScalar(m.userData.k);
      } else {
        // 받은 뒤: 동전은 주머니로 쏙, 물건은 손에 잠깐 머물다 사라진다
        const v = Math.min(1, (u - 1) / (0.6 / h.dur));
        m.position.set(b.x, b.y - (h.kind === 'coins' ? v * 0.25 : 0), b.z);
        m.scale.setScalar(m.userData.k * (h.kind === 'coins' ? 1 - v : v > 0.7 ? (1 - v) / 0.3 : 1));
      }
    }
    for (const [id, m] of live) if (!seen.has(id)) { scene.remove(m); live.delete(id); }
  }

  root.Handoff = { give, frame, counterOf };
}(typeof self !== 'undefined' ? self : this));
