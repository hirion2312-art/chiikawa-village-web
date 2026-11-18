'use strict';

// 치이카와 심즈 — 아르바이트 출퇴근 (2026-11-09 이재헌 지시)
// 가게 일은 출근 시각부터 퇴근 시각까지 계속한다. 일하는 동안에는 욕구가 줄지 않고,
// 퇴근할 때 그동안 줄었을 양의 절반이 한꺼번에 빠진다. 보수는 일한 시간만큼 퇴근 때 받는다
(function (root) {
  const { C } = root.MinorActs;
  const WAGE = 0.3;      // 시간당 보수 = 일의 earn × 이 값
  const SHIFTS = {
    'ramenRo.parttime': [11, 20],
    'mucha.job_stock': [9, 15], 'recycle.job_sort': [10, 16], 'kissa.job_serve': [10, 16], 'umaiya.job_kitchen': [11, 17],
    'market.job_takoyaki': [11, 17], 'market.job_clothes': [10, 16], 'market.job_pottery': [10, 16], 'onsen.job_clean': [13, 19],
    'pier.job_cargo': [8, 14], 'shrine.job_sweep': [8, 12], 'lemon.job_crate': [9, 15], 'pharmacy.job_shelf': [10, 16],
    'plaza.job_clean': [8, 12], 'pochette.job_fold': [10, 16],
  };

  /* ---------- 라멘 만드는 동작: 면 넣기 → 젓기 → 체 털기 → 국물 → 고명 → 내주기 ---------- */
  const POT = 'front(.14,.02,0)';
  const CLIPS = {
    // 솥 뚜껑을 잡아 올리고, 김에 놀라 몸을 뒤로 뺀다
    lid_lift: C(1.8, { rotX: '0:.12 .7:.16 1.1:-.14 1.8:-.04', posZ: '0:.04 .7:.06 1.1:-.1 1.8:-.02', squash: '0:1 .7:.98 1.1:1.03 1.8:1' }, {
      R: 'front(.12,.14,0)@0 front(.12,.1,0)@.55 front(.12,.46,-.18)@1.15 chest(.3,.14,.2)@1.8', L: 'hip(-.2,.1,0)@0 chest(.32,.1,.12)@1.1 chest(.3,.1,.14)@1.8',
    }, [[0, 'normal'], [1, 'surprised'], [1.5, 'normal']], { once: true }),
    // 빈 뜰채를 솥에 넣어 면을 건져 올린다
    noodle_dip: C(2, { rotX: '0:.1 .7:.24 1.2:.26 1.7:.04 2:.08', posY: '0:0 .7:-.04 1.2:-.04 1.7:.05 2:0', squash: '0:1 .7:.96 1.2:.96 1.7:1.03 2:1' }, {
      R: 'front(.2,.14,0)@0 front(.14,-.1,0)@.7 front(.1,-.1,0)@1.2 front(.14,.26,-.06)@1.7 front(.14,.18,0)@2', L: 'chest(.3,.1,.14)@0 chest(.3,.1,.14)@2',
    }, [[0, 'normal'], [1.7, 'smile']], { once: true }),
    // 뜰채를 그릇 위에서 기울여 면을 담는다
    noodle_place: C(2, { rotX: '0:.1 1:.2 2:.08', rotY: '0:.08 1:-.04 2:-.04', propTilt: '0:0 .55:0 1.05:1.1 1.5:1.1 2:0' }, {
      R: 'front(.2,.24,0)@0 front(.02,.2,0)@.9 front(.02,.2,0)@1.5 chest(.3,.14,.2)@2', L: 'front(.16,.02,0)@0 front(.16,.02,0)@2',
    }, 'normal', { once: true }),
    noodle_drop: C(1.8, { rotX: '0:.08 .8:.16 1.2:.2 1.8:.1', posY: '0:0 .8:.05 1.2:0 1.8:0', squash: '0:1 1.1:1 1.25:.96s 1.5:1b 1.8:1' }, {
      R: 'chest(.2,.1,.24)@0 front(.14,.16,0)@.8 front(.14,.02,0)@1.2 chest(.3,.08,.2)@1.8', L: 'hip(-.2,.1,0)@0 hip(-.2,.1,0)@1.8',
    }, 'normal', { once: true }),
    noodle_stir: C(2, { rotX: '0:.14 2:.14', rotZ: '0:.03 .5:-.03 1:.03 1.5:-.03 2:.03', rotY: '0:-.05 1:.05 2:-.05' }, {
      R: `front(.22,.04,0)@0 front(.1,.04,-.08)@.5 front(.02,.04,0)@1 front(.1,.04,.0)@1.5 front(.22,.04,0)@2`, L: 'hip(-.2,.1,0)@0 hip(-.2,.1,0)@2',
    }, 'normal'),
    // 체를 머리 높이까지 올렸다가 탁 내려 물기를 턴다
    noodle_shake: C(1.1, { rotX: '0:.1 .38:-.12 .55:.26s .8:.12 1.1:.1', posY: '0:0 .38:.16o .55:0s 1.1:0', squash: '0:1 .38:1.05 .55:.9s .8:1b 1.1:1', footLY: '0:0 .38:.08 .55:0 1.1:0', footRY: '0:0 .38:.08 .55:0 1.1:0' }, {
      R: 'front(.12,.1,0)@0 front(.12,.42,-.08)@.38 front(.12,.0,0)@.55 front(.12,.1,0)@1.1', L: 'chest(.3,.1,.14)@0 chest(.3,.2,.14)@.38 chest(.3,.04,.14)@.55 chest(.3,.1,.14)@1.1',
    }, 'flustered'),
    soup_pour: C(2.4, { rotX: '0:.1 1:.16 2.4:.1', rotY: '0:.18 1:-.1 2.4:-.1', propTilt: '0:0 .9:0 1.3:.8 2:.8 2.4:0' }, {
      R: 'front(.22,.08,0)@0 front(.02,.18,0)@1 front(.02,.18,0)@2 chest(.3,.1,.2)@2.4', L: 'front(.14,.0,0)@0 front(.14,.0,0)@2.4',
    }, 'normal', { once: true }),
    topping_place: C(2.4, { rotX: '0:.16 2.4:.16', rotY: '0:-.14 .6:.12 1.2:-.14 1.8:.12 2.4:-.14', squash: '0:1 .3:.97 .6:1 .9:.97 1.2:1 1.5:.97 1.8:1 2.1:.97 2.4:1' }, {
      R: 'front(.24,.14,0)@0 front(.04,.02,0)@.3 front(.24,.14,0)@.6 front(.04,.02,0)@.9 front(.24,.14,0)@1.2 front(.04,.02,0)@1.5 front(.24,.14,0)@1.8 front(.04,.02,0)@2.1 front(.24,.14,0)@2.4',
      L: 'front(.14,.04,0)@0 front(.14,.04,0)@2.4',
    }, [[0, 'normal'], [1.2, 'smile']]),
    serve_bowl: C(2.2, { rotX: '0:.04 .8:.22 1.5:.26 2.2:.02', posZ: '0:0 .8:.12 1.5:.12 2.2:0', squash: '0:1 1.2:.98 1.5:1 2.2:1' }, {
      R: 'chest(.3,.12,.22)@0 front(.2,.08,0)@.8 front(.2,.08,0)@1.5 chest(.3,.1,.2)@2.2', L: 'chest(.14,.1,.28)@0 front(.04,.08,0)@.8 front(.04,.08,0)@1.5 chest(.2,.1,.22)@2.2',
    }, [[0, 'normal'], [.8, 'smile']], { once: true }),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);

  const { BUILD, HAND } = root.VillageProps;
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  // 체(테보): 손잡이, 철망 바구니, 안에 든 면
  BUILD.strainer = () => {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 8), toon('#9a6f49'));
    stick.rotation.x = Math.PI / 2;
    stick.position.z = 0.14;
    const basket = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#c9c4b6'));
    basket.position.set(0, 0.03, 0.4);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 6, 18), toon('#a9a395'));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.03, 0.4);
    g.add(stick, basket, rim);
    return g;
  };
  // 면을 건진 뜰채
  BUILD.strainer_full = () => {
    const g = BUILD.strainer();
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.05 + i * 0.018, 0.01, 5, 16), toon(i % 2 ? '#f0d58a' : '#e8c978'));
      t.rotation.set(Math.PI / 2 + i * 0.25, 0, i * 0.8);
      t.position.set(0, 0.035 + i * 0.008, 0.4);
      g.add(t);
    }
    return g;
  };
  // 국자: 길쭉한 자루와 둥근 머리
  BUILD.ladle = () => {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.34, 8), toon('#c9c4b6'));
    stick.rotation.x = Math.PI / 2;
    stick.position.z = 0.16;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#d3d6da'));
    head.position.set(0, 0.03, 0.4);
    const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 12), toon('#c9925a'));
    soup.position.set(0, 0.02, 0.4);
    g.add(stick, head, soup);
    return g;
  };
  // 생면 뭉치: 노란 면 몇 가닥을 감아 놓은 덩어리
  BUILD.noodles = () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.075 + i * 0.012, 0.014, 6, 16), toon(i % 2 ? '#f0d58a' : '#e8c978'));
      t.rotation.set(Math.PI / 2 + i * 0.3, i * 0.8, 0);
      t.position.set(0, 0.02 * i, 0.12);
      g.add(t);
    }
    return g;
  };
  HAND.strainer = 1;
  HAND.strainer_full = 1;
  HAND.ladle = 1;
  HAND.noodles = 1;

  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip, prop: prop || null, label, fx });
  const { BY_ID } = root.VillageObjects;
  const ramen = BY_ID['ramenRo.parttime'];
  if (ramen) {
    // 주문이 들어올 때만 만든다 (이재헌님 지적: 손님도 없는데 계속 요리하던 시사).
    // 내주는 곳에서 기다리다가 → 주문(식권을 낸 손님)을 받아 → 삶고 담아 → 그 손님 자리 맞은편으로 가서 내준다
    ramen.steps = [
      { ...S('pass_stand', 'wait', 1, 'idle_look', null, '주문을 기다리는 중'), waitOrder: true },
      S('noodle_stand', 'cook', 1.8, 'lid_lift', null, '솥 뚜껑을 여는 중', 'boiler.open'),
      S('noodle_stand', 'cook', 2, 'noodle_drop', 'noodles', '면을 솥에 넣는 중', 'boiler.drop'),
      S('noodle_stand', 'cook', 5, 'noodle_stir', 'strainer', '면 삶는 중', 'boiler.boil'),
      S('noodle_stand', 'cook', 2, 'noodle_dip', 'strainer', '뜰채로 면을 건지는 중', 'boiler.dip'),
      S('noodle_stand', 'cook', 3.3, 'noodle_shake', 'strainer_full', '뜰채를 탈탈 터는 중', 'boiler.drain'),
      S('topping_stand', 'pour', 2.4, 'soup_pour', 'ladle', '그릇에 국물 붓는 중', 'dish.pour'),
      S('topping_stand', 'cook', 2, 'noodle_place', 'strainer_full', '그릇에 면 담는 중', 'dish.noodle'),
      S('topping_stand', 'cook', 3.6, 'topping_place', null, '고명 올리는 중', 'dish.top'),
      S('topping_stand', 'take', 0.8, 'pay_wait', null, '그릇을 드는 중', 'dish.take'),
      { ...S('serve_*', 'hand', 2.2, 'serve_bowl', 'bowl', '손님 자리로 내주는 중', 'passed.serve'), toOrder: true },
      { ...S('serve_*', 'talk', 1.2, 'talk_order', null, '"맛있게 드세요!"'), toOrder: true },
    ];
    // 손님 자리 맞은편 주방 쪽 내주는 자리 (카운터 자리마다 하나)
    const R = root.ASSET_SOCKETS.ramenRo;
    for (const [name, v] of Object.entries(R)) {
      const m = /^counter_sit_(\d+)$/.exec(name);
      if (m) R[`serve_${m[1]}`] = [v[0], -2.45, 0, v[0], 1];
    }
  }

  for (const [id, [from, to]] of Object.entries(SHIFTS)) {
    const x = BY_ID[id];
    if (!x) continue;
    x.shift = { from, to };
    x.hours = [from, to];
    x.gain = {};
    x.name = `${x.name} (${from}~${to}시)`;
  }

  /* ---------- 내주기 전에 먹지 않기: 음식을 내주는 단계와 손님이 기다리는 단계를 잇는다 ---------- */
  const SERVE = q => /\.serve$/.test(q.fx || '') || q.act === 'hand' || /내(주|놓|는)|접시 내|건네/.test(q.label || '');
  function markServe() {
  const servePlaces = new Set();
  for (const id of Object.keys(SHIFTS)) {
    const x = BY_ID[id];
    if (!x) continue;
    let hit = false;
    for (const q of x.steps) if (SERVE(q)) { q.serves = true; hit = true; }
    if (hit) servePlaces.add(x.place);
  }
  // 손님 쪽: 먹거나 마시는 첫 단계 바로 앞 단계가 끝날 때 기다린다
  for (const x of root.VillageObjects.LIST) {
    if (x.shift || !servePlaces.has(x.place)) continue;
    const i = x.steps.findIndex(q => q.act === 'eat' || q.act === 'drink' || q.act === 'bite');
    if (i > 0) x.steps[i - 1].waitServe = true;
  }
  }

  root.Shifts = {
    markServe,
    SHIFTS,
    blocked(sim, c, x) {
      if (!x.shift) return null;
      if (c.id === 'shisa' && x.id !== 'ramenRo.parttime') return '라멘 로가 일터예요';
      if (c.onShift && c.onShift.x === x) return null;
      if (c.shiftDone === sim.day) return '오늘 근무는 끝났어요';
      if (sim.hour >= x.shift.to - 1) return '곧 문 닫을 시간이에요';
      return null;
    },
    // 출근 시각 앞뒤로 강하게 끌린다
    score(sim, c, x) {
      if (!x.shift || c.shiftDone === sim.day) return 0;
      const late = sim.hour - x.shift.from;
      if (late < -0.2 || late > 1.5) return 0;
      const p = sim.places[x.place];
      const d = p ? Math.hypot(c.x - p.x, c.z - p.z) : 0;
      return (c.money < 4000 ? 150 : 70) * (1 + d / 70);
    },
    // 근무 중이면 같은 일을 계속한다. 시사는 라멘 로 출근 시각에 맞춰 나간다
    next(sim, c) {
      if (c.onShift) {
        if (sim.hour < c.onShift.x.shift.to) return c.onShift.x;
        this.clockOut(sim, c);
        return null;
      }
      if (c.id === 'shisa' && c.shiftDone !== sim.day && ramen && sim.open(ramen) && !this.blocked(sim, c, ramen)) return ramen;
      return null;
    },
    // 매 틱: 근무 상태를 맞추고, 근무 중이면 true를 돌려 욕구가 줄지 않게 한다
    track(sim, c) {
      const x = c.doing && c.doing.x;
      if (!c.onShift && x && x.shift) {
        c.onShift = { x, t0: sim.minutes, debt: {} };
        sim.note(`${c.name}: ${x.name} 출근`);
      }
      if (!c.onShift) return false;
      if ((x && x !== c.onShift.x) || sim.hour >= c.onShift.x.shift.to) {
        if (x === c.onShift.x) sim.abort(c, '');
        this.clockOut(sim, c);
        return false;
      }
      return true;
    },
    owe(c, key, amount) { c.onShift.debt[key] = (c.onShift.debt[key] || 0) + amount; },
    clockOut(sim, c) {
      const s = c.onShift;
      c.onShift = null;
      c.shiftDone = sim.day;
      for (const [k, v] of Object.entries(s.debt)) c.needs[k] = Math.max(0, c.needs[k] - v * 0.5);
      const hours = (sim.minutes - s.t0) / 60;
      const pay = Math.round((s.x.earn * WAGE * hours) / 10) * 10;
      c.money += pay;
      sim.note(`${c.name}: 퇴근 (+${pay}원)`);
    },
  };
}(typeof self !== 'undefined' ? self : this));
