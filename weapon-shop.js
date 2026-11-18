'use strict';

// 치이카와 심즈 — 무기점 (2026-11-12 이재헌님: 무기점을 만들고 여러 무기를 사게, 우사기·랏코의 무기는 팔지 않는다)
// [원작] 사스마타는 토벌의 기본 도구. 나머지 무기와 값·힘·내구도는 [추정].
// - 무기마다 힘(토벌 힘에 더함)과 내구도가 있다. 토벌을 끝낼 때마다 내구도가 1 준다. 0이 되면 무뎌져 힘이 반이 되고, 무기점에서 고친다
// - 더 좋은 무기를 사면 쓰던 무기는 무기점이 30%에 사 간다 (돈이 돌아오는 길)
// - 우사기(장치봉)·랏코(검)는 자기 무기를 쓰고 사지 않는다
(function (root) {
  const WEAPONS = {
    club: { name: '몽둥이', prop: 'w_club', price: 500, power: 60, dur: 8 },
    shovel: { name: '삽', prop: 'w_shovel', price: 600, power: 80, dur: 10 },
    frypan: { name: '프라이팬', prop: 'w_frypan', price: 700, power: 90, dur: 12 },
    sasumata: { name: '사스마타', prop: 'sasumata', price: 900, power: 120, dur: 14 },
    spear: { name: '창', prop: 'w_spear', price: 1100, power: 150, dur: 12 },
    net: { name: '포획 그물', prop: 'w_net', price: 1300, power: 140, dur: 10 },
    rake: { name: '쇠스랑', prop: 'w_rake', price: 1600, power: 180, dur: 14 },
    hammer: { name: '나무 망치', prop: 'w_hammer', price: 2400, power: 240, dur: 16 },
  };
  const ORDER = Object.keys(WEAPONS);
  const josa = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
  const OWN_WEAPON = ['usagi', 'rakko'];        // 원작 고유 무기를 가진 주민은 사지 않는다
  const REPAIR = w => Math.round(w.price * 0.2);
  const tierOf = c => (c.weapon && WEAPONS[c.weapon.id] ? WEAPONS[c.weapon.id].power : (root.Shop && root.Shop.owns(c, 'weapon') ? 120 : 0));

  /* ---------- 들고 있는 무기 ---------- */
  // 처음부터 무기가 있던 주민(사스마타)은 사스마타를 가진 것으로 친다
  function weaponState(c) {
    if (!c.weapon && root.Shop && root.Shop.owns(c, 'weapon') && !OWN_WEAPON.includes(c.id)) c.weapon = { id: 'sasumata', dur: WEAPONS.sasumata.dur };
    return c.weapon || null;
  }
  const P = root.Persona;
  if (P) {
    const weaponOf0 = P.weaponOf;
    P.weaponOf = function (c) {
      const w = c && c.weapon && WEAPONS[c.weapon.id];
      if (!w) return weaponOf0.call(this, c);
      if (w.prop === 'sasumata') { const own = weaponOf0.call(this, c); return /sasumata/.test(own) ? own : 'w_sasumata_gray'; }
      return w.prop;
    };
    const power0 = P.prototype.power;
    P.prototype.power = function (c) {
      const base = power0.call(this, c);
      const st = c && !c.extra ? weaponState(c) : c && c.weapon;
      const w = st && WEAPONS[st.id];
      if (!w) return base;
      return base + Math.round(w.power * (st.dur > 0 ? 1 : 0.5) * 0.6);
    };
  }

  /* ---------- 가게 ---------- */
  const SO = {
    rack_1: [-3.6, -1.5, 0, -3.6, -3.3],
    rack_2: [-0.6, -1.5, 0, -0.6, -3.3],
    try_stand: [-2.2, 2.4, 0, -2.2, 5],
    counter_stand: [3.4, 2.5, 0, 3.4, 1.1],
  };
  (root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {})).weaponShop = SO;
  if (typeof BUILDERS !== 'undefined') BUILDERS.weaponShop = function (k) {
    const W = 12, D = 8, H = 5.4;
    const front = k.booth({ w: W, d: D, h: H, wall: '#c9b8a2', inner: '#e8dcc6', roof: '#6f7f8f', roofType: 'gable', rh: 2.8, trim: '#6a4a36', skin: 'plank' });
    front.sign(0, H - 0.95, 6.4, 1.2, '무기점', '#f1e2bb', '#4a3230');
    // 바닥: 나무판
    k.box(0, 0.42, 0, W - 1.2, 0.04, D - 1.2, '#c9a57c', 0);
    const fy = 0.44;
    // 뒤 벽 진열대: 나무 판에 고리, 무기 여덟 자루를 세워 건다 (실제 무기 모델 그대로)
    k.box(-1.6, fy + 1.8, -3.35, 7.4, 3.0, 0.12, '#8a6242', 1);
    for (const y of [1.0, 2.6]) k.box(-1.6, fy + y, -3.25, 7.4, 0.1, 0.16, '#6a4a36', 0);
    const VP = root.VillageProps;
    ORDER.forEach((id, i) => {
      const w = WEAPONS[id];
      const make = VP && VP.BUILD && VP.BUILD[w.prop === 'sasumata' ? 'w_sasumata_gray' : w.prop];
      const x = -4.8 + i * 0.92;
      if (make) {
        const m = make();
        // 손에 든 기울기(held)를 되돌려 곧게 세운다
        const inner = m.children[0];
        if (inner) inner.rotation.x = 0;
        m.position.set(x, fy + 0.5, -3.15);
        m.scale.setScalar(1.12);
        k.group.add(m);
      }
      k.box(x, fy + 0.3, -3.1, 0.6, 0.22, 0.04, '#fff4dc', 1);
      k.paint(x, fy + 0.2, -3.07, 0.56, 0.2, g => drawText(g, `${w.name} ${w.price}`, 0, 0.1, 0.54, 0.16, '#4a3230'));
    });
    // 오른쪽: 계산대와 숫돌(고치는 자리), 대장장이 요로이씨
    k.box(3.4, fy + 0.5, 1.1, 3.0, 1.0, 0.9, '#a97c50', 2);
    k.box(3.4, fy + 1.03, 1.1, 3.1, 0.06, 1.0, '#d8b58a', 1);
    k.cyl(4.4, fy + 1.25, 1.0, 0.28, 0.12, '#9a9a9a', 1).rotation.z = Math.PI / 2;     // 숫돌 바퀴
    k.box(4.4, fy + 1.12, 1.0, 0.5, 0.14, 0.3, '#6a4a36', 0);
    k.box(2.6, fy + 1.1, 1.2, 0.4, 0.1, 0.3, '#3f3a36', 1);                             // 금고
    k.npc('yoroi-labor', 3.4, -0.2, { over: { skinColor: '#9aa2ab', yoroiGear: null }, label: '무기점 요로이' });
    // 왼쪽: 휘둘러 보는 자리 (짚 인형 과녁)
    k.cyl(-4.4, fy + 0.7, 2.6, 0.06, 1.4, '#8a6242', 0);
    k.ball(-4.4, fy + 1.3, 2.6, 0.3, 0.4, 0.3, '#e2c27a', 1);
    k.box(-4.4, fy + 1.1, 2.6, 0.7, 0.08, 0.08, '#e2c27a', 0);
    k.solidRect(3.4, 1.1, 3.1, 1.0);
    k.solidCircle(-4.4, 2.6, 0.4);
  };

  /* ---------- 사기 · 고치기 ---------- */
  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  if (VO) {
    for (const id of ORDER) {
      const w = WEAPONS[id];
      const prop = w.prop === 'sasumata' ? 'w_sasumata_gray' : w.prop;
      put({ id: `weaponShop.buy_${id}`, place: 'weaponShop', name: `${w.name} 사기`, cost: w.price, hours: [9, 19], gain: { fun: 18 }, weaponBuy: id,
        steps: [S('rack_*', 'look', 3, 'browse_shelf', null, `${josa(w.name, '을', '를')} 올려다보는 중`), S('try_stand', 'try', 3, 'train_swing', prop, '휘둘러 보는 중'),
          S('counter_stand', 'pay', 2, 'pay_wait', null, '이걸로 주세요'), S('counter_stand', 'joy', 1.5, 'jump_joy', prop, '새 무기!')] });
    }
    put({ id: 'weaponShop.repair', place: 'weaponShop', name: '무기 고치기', hours: [9, 19], gain: { fun: 4 }, weaponRepair: true,
      steps: [S('counter_stand', 'give', 2, 'talk_order', null, '무뎌진 무기를 맡기는 중'), S('counter_stand', 'wait', 4, 'wait_tap', null, '쓱싹쓱싹 가는 소리 듣는 중'), S('counter_stand', 'take', 1.5, 'pay_receive', null, '번쩍번쩍해졌다')] });
    put({ id: 'weaponShop.window', place: 'weaponShop', name: '무기점 구경', hours: [9, 19], gain: { fun: 8 },
      steps: [S('rack_*', 'look', 4, 'tilt_look', null, '진열대를 구경하는 중'), S('rack_*', 'ooh', 1.6, 'point_ooh', null, '저거 멋있다')] });
  }
  // 고칠 값은 무기마다 다르다: 시작할 때 값을 정한다
  const VP0 = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP0) {
    const start0 = VP0.start;
    VP0.start = function (c, x, other, ordered) {
      if (x && x.weaponRepair) { const st = weaponState(c); x.cost = st ? REPAIR(WEAPONS[st.id]) : 0; }
      return start0.call(this, c, x, other, ordered);
    };
  }
  if (root.Purpose && root.Purpose.RULES) {
    root.Purpose.RULES.unshift(
      [/^weaponShop\.buy_/, (c, s, x) => {
        if (c.extra && !c.strong) return false;
        if (OWN_WEAPON.includes(c.id) || c.monster) return false;
        const w = WEAPONS[x.weaponBuy];
        return w.power > tierOf(c) + 20 && (c.money + ((c.bank && c.bank.bal) || 0)) >= w.price + 400;
      }, '지금 무기보다 좋은 무기를, 돈이 넉넉할 때만'],
      [/^weaponShop\.repair$/, c => { const st = weaponState(c); return !!st && st.dur <= 0 && c.money >= REPAIR(WEAPONS[st.id]) + 100; }, '무뎌진 무기가 있을 때만'],
    );
  }
  const L = root.Labor && root.Labor.prototype;
  if (L) {
    const score0 = L.scoreBonus;
    L.scoreBonus = function (c, x) {
      let v = score0.call(this, c, x);
      if (x.weaponBuy) v += 30 + (c.traits ? c.traits.brave * 40 : 0) + (c.strong ? 30 : 0) + (root.Shop && !root.Shop.owns(c, 'weapon') ? 60 : 0);
      if (x.weaponRepair) v += 60;
      return v;
    };
    const fin0 = L.onFinish;
    L.onFinish = function (c, x) {
      fin0.apply(this, arguments);
      const s = this.sim;
      if (x.weaponBuy) {
        const old = weaponState(c);
        const w = WEAPONS[x.weaponBuy];
        // 쓰던 무기는 30%에 사 간다
        if (old && WEAPONS[old.id] && old.id !== x.weaponBuy) {
          const back = Math.round(WEAPONS[old.id].price * 0.3 * (old.dur > 0 ? 1 : 0.5));
          c.money += back;
          s.note(`${c.name}: 쓰던 ${josa(WEAPONS[old.id].name, '을', '를')} ${back}원에 넘겼어요`);
        }
        c.weapon = { id: x.weaponBuy, dur: w.dur };
        if (root.Shop) root.Shop.give(c, 'weapon');
        s.note(`⚔️ ${c.name}: ${josa(w.name, '을', '를')} 샀어요`);
      }
      if (x.weaponRepair) {
        const st = weaponState(c);
        if (st) { st.dur = WEAPONS[st.id].dur; s.note(`${c.name}: ${josa(WEAPONS[st.id].name, '을', '를')} 고쳤어요`); }
      }
      // 토벌을 마칠 때마다 무기가 닳는다
      if ((x.plate === 'hunt' || x.huntTier) && !OWN_WEAPON.includes(c.id)) {
        const st = weaponState(c);
        if (st && st.dur > 0) {
          st.dur -= 1;
          if (st.dur === 0) s.note(`${c.name}의 ${josa(WEAPONS[st.id].name, '이', '가')} 무뎌졌어요`);
        }
      }
    };
    const save0 = L.save;
    L.save = function (c) { const r = save0.call(this, c); if (c.weapon) r.weapon = c.weapon; return r; };
    const load0 = L.load;
    L.load = function (c, r) { load0.call(this, c, r); if (r && r.weapon && WEAPONS[r.weapon.id]) c.weapon = { id: r.weapon.id, dur: +r.weapon.dur || 0 }; };
  }
  // 파자마 파티즈는 토벌하지 않는다: 무기를 사지 않는다
  if (root.Purpose && root.Purpose.RULES) root.Purpose.RULES.unshift([/^recycle.buy_weapon$/, c => !c.troupe && !OWN_WEAPON.includes(c.id) && (c.money + ((c.bank && c.bank.bal) || 0)) < 1700, '돈이 적은 주민만 중고 무기를 산다 (넉넉하면 무기점)']);
  // 리사이클 숍의 중고 무기는 사스마타
  if (VO && VO.BY_ID['recycle.buy_weapon']) VO.BY_ID['recycle.buy_weapon'].weaponBuy = 'sasumata';

  root.WeaponShop = { WEAPONS, ORDER, weaponState, REPAIR };
}(typeof self !== 'undefined' ? self : this));
