'use strict';

// 치이카와 심즈 — 분양과 이사 (2026-11-12 이재헌님, docs/plan-society-bank-housing-2026-11-12.md 5번)
// 새 단지(world.js sale: true)의 빈집 세 채를 청약 추첨으로 나눠 준다. 집 모델은 마을의 오두막·옛집 그대로다
//  1) 공고: 닷새마다 아침, 빈집이 있으면 "분양 공고". 주민들이 광장에 와서 공고를 읽는다
//  2) 신청: 집을 나눠 쓰는 엑스트라 중 청약 통장이 있는 주민이 금고에서 신청서를 쓴다 (번호표 → 창구 → 펜으로 쓰기 → 도장)
//  3) 추첨: 공고 이틀 뒤 오후 3시, 신청자가 광장에 모여 기다리고, 청약 횟수가 많을수록 잘 뽑힌다. 당첨은 펄쩍, 낙첨은 훌쩍
//     당첨자는 통장과 지갑에서 집값을 내고, 모자라면 집 빚으로 남아 돈이 생길 때마다 갚는다
//  4) 이사: 다음 날 아침 옛집 문 앞에서 짐 보따리를 싸서 안고 새 집까지 걸어간다. 친한 친구 둘이 보따리를 들고 거든다.
//     새 집 문 앞에 내려놓고 기지개 → 그날 밤부터 새 집에서 잔다
//  5) 집들이: 이사 이틀 뒤 저녁, 친구들이 새 집 마당에 모여 간식 먹고 손뼉
(function (root) {
  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const josa = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
  const PRICE = 3000, EVERY = 5, DRAW_H = 15;
  const isSale = h => /@(48,-56|68,-58|56,-78)$/.test(h.key);

  /* ---------- 처음 집 나눌 때 새 단지는 비워 둔다 ---------- */
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const homes0 = VP.giveExtrasHomes;
    VP.giveExtrasHomes = function () {
      const all = this.world.homes || [];
      this.world.homes = all.filter(h => !isSale(h));
      try { return homes0.apply(this, arguments); } finally { this.world.homes = all; }
    };
  }

  /* ---------- 동작: 짐 보따리 안고 걷기 ---------- */
  const MA = root.MinorActs;
  if (MA && MA.C && typeof ANIMS !== 'undefined') {
    const walk = { posY: '0:0 .15:.05 .3:0 .45:.05 .6:0', rotX: '0:-.07 .6:-.07', rotZ: '0:.05 .3:-.05 .6:.05', footLY: '0:0 .15:.07 .3:0 .6:0', footRY: '0:0 .3:0 .45:.07 .6:0' };
    const hold = { R: 'chest(.16,.1,.24)@0 chest(.16,.1,.24)@.6', L: 'chest(-.16,.1,.24)@0 chest(-.16,.1,.24)@.6' };
    const K = (t, v) => [t, v, 'io'];
    const at = (x, y, z) => ({ px: [K(0, x), K(9, x)], py: [K(0, y), K(9, y)], pz: [K(0, z), K(9, z)] });
    const bundle = (color, id = 'bundle') => [
      { id, shape: 'ball', color, size: 0.3, attach: 'body', tracks: at(0.05, 0.78, 1.0), vis: [[0, 1]] },
      { id: id + 'k1', shape: 'ball', color, size: 0.1, attach: 'body', tracks: at(-0.04, 1.06, 1.02), vis: [[0, 1]] },
      { id: id + 'k2', shape: 'ball', color, size: 0.1, attach: 'body', tracks: at(0.14, 1.06, 1.02), vis: [[0, 1]] },
    ];
    for (const [id, col] of [['bundle_carry', '#f4a9bd'], ['bundle_carry_b', '#9fd0ea'], ['bundle_carry_c', '#f3d27a']]) {
      const c = MA.C(0.6, walk, hold, 'brave', { props: bundle(col) });
      c.id = id; ANIMS[id] = c;
    }
    const pack = MA.C(2.4, { rotX: '0:.2 .8:.34 1.6:.34 2.4:.1', squash: '0:1 1:.96 1.6:.97 2.4:1' },
      { R: 'low(.14,0,0)@0 low(.04,.05,0)@.8 low(.16,0,0)@1.6 chest(.16,.1,.24)@2.4', L: 'low(-.14,0,0)@0 low(-.04,.05,0)@.8 low(-.16,0,0)@1.6 chest(-.16,.1,.24)@2.4' },
      [[0, 'normal'], [1.6, 'brave']], { once: true, props: [{ id: 'cloth', shape: 'ball', color: '#f4a9bd', size: 0.3, attach: 'ground', tracks: at(0, 0.18, 0.7), vis: [[0, 1], [2.2, 0]] }] });
    pack.id = 'bundle_pack'; ANIMS.bundle_pack = pack;
  }

  /* ---------- 상태 ---------- */
  const st = s => s.housing || (s.housing = { notice: null, owners: {}, round: 0 });
  const saleHomes = s => (s.world.homes || []).filter(isSale);
  const vacant = s => saleHomes(s).filter(h => !Object.values(st(s).owners).includes(h.key));
  const homeOfKey = (s, key) => (s.world.homes || []).find(h => h.key === key);
  const sharing = (s, c) => !!c.home && s.chars.some(o => o !== c && o.home && s.sockets[o.home] && s.sockets[c.home] && s.sockets[o.home].bed_lie && s.sockets[c.home].bed_lie &&
    Math.hypot(s.sockets[o.home].bed_lie.x - s.sockets[c.home].bed_lie.x, s.sockets[o.home].bed_lie.z - s.sockets[c.home].bed_lie.z) < 1.5);
  const eligible = (s, c) => c.extra && !c.troupe && !c.monster && !c.gone && !c.ownHome && c.bank && c.bank.sub >= 1;

  function mkSocket(s, place, name, x, z, fx, fz) {
    const so = { name, place, x, z, h: 0, fx, fz };
    if (s.nav) {
      const ap = s.nav.approach(so);
      if (!ap) return null;
      Object.assign(so, { reach: true, ax: ap.x, az: ap.z, seatIn: ap.seatIn, h: ap.seatIn ? s.nav.measure(x, z, 0) : s.nav.surface(x, z) });
    }
    (s.sockets[place] || (s.sockets[place] = {}))[name] = so;
    return so;
  }
  // 집 문 앞과 마당 자리
  function yard(s, place, h) {
    const dx = h.door[0] - h.x, dz = h.door[1] - h.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const out = (d, side) => [h.door[0] + ux * d - uz * side, h.door[1] + uz * d + ux * side];
    const [x0, z0] = out(1.2, 0);
    mkSocket(s, place, 'door_out', x0, z0, h.door[0], h.door[1]);
    [[-1.6, 1], [0, 1], [1.6, 1]].forEach(([side], i) => { const [x, z] = out(3.2, side); mkSocket(s, place, `yard_${i + 1}`, x, z, h.door[0] + ux * 1.4, h.door[1] + uz * 1.4); });
  }
  function addX(s, x) { const i = s.interactions.findIndex(q => q.id === x.id); if (i >= 0) s.interactions.splice(i, 1, x); else s.interactions.push(x); return x; }

  /* ---------- 금고 신청서 · 광장 공고·추첨 자리 ---------- */
  const BS = [
    S('ticket_stand', 'ticket', 1.2, 'ticket_press', 'ticket', '번호표 뽑는 중'),
    S('wait_sit_*', 'wait', 2.5, 'wait_tap', 'ticket', '두근두근 차례 기다리는 중'),
    S('window_*', 'write', 3, 'pen_write', null, '청약 신청서 쓰는 중'),
    S('window_*', 'stamp', 1.2, 'surprised', null, '접수 도장 쾅!'),
  ];
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  put({ id: 'bank.house_apply', place: 'bank', name: '새 집 청약 신청하기', hours: [9, 17], gain: { fun: 10 }, houseApply: true, steps: BS });
  put({ id: 'plaza.house_notice', place: 'plaza', name: '분양 공고 읽기', hours: [8, 19], gain: { fun: 5 }, houseNotice: true,
    steps: [S('board_check_a|board_check_b|pass_board_*', 'read', 3, 'board_read', null, '"새 단지 오두막 분양" 공고 읽는 중'), S('board_check_a|board_check_b|pass_board_*', 'talk', 1.6, 'point_ooh', null, '나도 새 집 갖고 싶다')] });
  put({ id: 'plaza.lottery_watch', place: 'plaza', name: '분양 추첨 보러 가기', hours: [12, 17], gain: { fun: 6 }, lotteryWatch: true, group: true,
    steps: [S('bench_sit_a|bench_sit_b|board_check_a|board_check_b|pass_board_*|speaker_listen', 'wait', 50, 'wait_tap', null, '추첨을 기다리며 손 모으는 중')] });
  if (root.Purpose && root.Purpose.RULES) {
    root.Purpose.RULES.unshift(
      [/^bank\.house_apply$/, (c, s) => { const n = st(s).notice; return !!n && s.day < n.drawDay && eligible(s, c) && !n.applicants.includes(c.id); }, '분양 공고가 있고 청약 통장이 있을 때만'],
      [/^plaza\.house_notice$/, (c, s) => { const n = st(s).notice; return !!n && !(c.readNotice === n.id); }, '분양 공고가 붙었을 때만'],
      [/^plaza\.lottery_watch$/, 'step', '추첨 날 신청자만'],
    );
  }
  const L = root.Labor && root.Labor.prototype;
  if (L) {
    const score0 = L.scoreBonus;
    L.scoreBonus = function (c, x) {
      let v = score0.call(this, c, x);
      if (x.houseApply) v += 120 + (sharing(this.sim, c) ? 40 : 0);
      if (x.houseNotice) v += 25;
      return v;
    };
    const fin0 = L.onFinish;
    L.onFinish = function (c, x) {
      fin0.apply(this, arguments);
      const s = this.sim, H = st(s), n = H.notice;
      if (x.houseApply && n && !n.applicants.includes(c.id)) { n.applicants.push(c.id); s.note(`🏠 ${c.name}: 새 집 청약 신청 (청약 ${c.bank.sub}회)`); }
      if (x.houseNotice && n) c.readNotice = n.id;
      if (x.moveOut) moveIn(s, c);
      if (x.moveIn) settle(s, c);
    };
    const save0 = L.save;
    L.save = function (c) { return { ...save0.call(this, c), ownHome: c.ownHome, houseDebt: c.houseDebt, movedDay: c.movedDay, warmed: c.warmed }; };
    const load0 = L.load;
    L.load = function (c, r) {
      load0.call(this, c, r);
      if (r && r.ownHome) { c.ownHome = r.ownHome; c.houseDebt = +r.houseDebt || 0; c.movedDay = r.movedDay; c.warmed = !!r.warmed; c._needHome = true; }
    };
  }

  /* ---------- 추첨 ---------- */
  function draw(s) {
    const H = st(s), n = H.notice;
    const pool = n.applicants.map(id => s.chars.find(c => c.id === id)).filter(c => c && eligible(s, c));
    const homes = vacant(s).filter(h => n.homes.includes(h.key));
    const winners = [];
    while (pool.length && winners.length < homes.length) {
      const total = pool.reduce((a, c) => a + 1 + c.bank.sub, 0);
      let r = s.random() * total, i = 0;
      for (; i < pool.length; i++) { r -= 1 + pool[i].bank.sub; if (r <= 0) break; }
      winners.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    winners.forEach((c, i) => {
      const h = homes[i];
      H.owners[c.id] = h.key;
      c.ownHome = h.key;
      // 집값: 통장 → 지갑 순으로. 모자라면 집 빚
      let due = PRICE;
      const fromBank = Math.min(c.bank.bal, due); c.bank.bal -= fromBank; due -= fromBank;
      const fromWallet = Math.min(Math.max(0, c.money - 300), due); c.money -= fromWallet; due -= fromWallet;
      c.houseDebt = due;
      c.moveDay = s.day + 1;
      s.note(`🎉 ${c.name}: 새 단지 오두막 당첨! (청약 ${c.bank.sub}회)${due ? ` · 남은 집값 ${due}원` : ''}`);
      s.labor.react(c, 'jump_joy', '당첨이다!!');
      c.bank.sub = 0;
    });
    for (const c of pool) { s.note(`${c.name}: 이번 추첨은 아쉽게 떨어졌어요 (다음엔 청약 점수가 쌓여요)`); s.labor.react(c, 'cry', '다음엔 꼭…'); }
    // 같이 본 친구들이 박수
    for (const w of winners) for (const o of s.chars) {
      if (o === w || !o.doing || !o.doing.x || !o.doing.x.lotteryWatch) continue;
      if (s.persona && s.persona.bond(w, o) >= 30) s.labor.react(o, 'applaud', `${w.name} 축하해!`);
    }
    for (const o of s.chars) if (o.doing && o.doing.x && o.doing.x.lotteryWatch) s.abort(o, '');
    H.notice = null;
  }

  /* ---------- 이사 ---------- */
  const COL = ['bundle_carry', 'bundle_carry_b', 'bundle_carry_c'];
  function beginMove(s, c) {
    const old = c.home && s.sockets[c.home];
    const h = homeOfKey(s, c.ownHome);
    if (!old || !h) return;
    // 옛집 문 앞 자리 (그 집의 문 좌표: 같은 침대를 쓰는 집을 찾는다)
    const oldHome = (s.world.homes || []).find(q => old.bed_lie && Math.hypot(q.bed[0] - old.bed_lie.x, q.bed[1] - old.bed_lie.z) < 1.5);
    if (oldHome && !old.door_out) yard(s, c.home, oldHome);
    if (!s.sockets[c.home].door_out) return;
    const xo = addX(s, { id: `move_out:${c.id}`, place: c.home, name: '이삿짐 싸기', only: [c.id], hours: [0, 24], gain: { fun: 8 }, moveOut: true,
      steps: [S('door_out', 'pack', 2.4, 'bundle_pack', null, '짐 보따리 싸는 중'), S('door_out', 'look', 1.5, 'tilt_look', null, '정든 집 한 번 돌아보기')] });
    if (c.doing) s.abort(c, '');
    c.orders.length = 0;
    s.order(c, xo);
    c.moving = 'out';
  }
  function moveIn(s, c) {
    const h = homeOfKey(s, c.ownHome);
    const place = `newhome:${c.id}`;
    if (!s.places[place]) { s.places[place] = { id: place, name: `${c.name}네 새 집`, x: h.x, z: h.z, r: h.r }; yard(s, place, h); }
    const xi = addX(s, { id: `move_in:${c.id}`, place, name: '새 집으로 이사', only: [c.id], hours: [0, 24], gain: { fun: 30 }, moveIn: true,
      steps: [S('door_out', 'put', 1.6, 'idle_stretch', null, '보따리 내려놓고 기지개'), S('door_out', 'joy', 1.6, 'jump_joy', null, '내 집이다!')] });
    c.orders.length = 0;
    s.order(c, xi);
    c.moving = 'in';
    // 친한 친구 둘이 보따리를 들고 거든다
    const friends = s.chars.filter(o => o !== c && !o.troupe && !o.monster && !o.gone && !o.hidden && !(o.doing && o.doing.x && (o.doing.x.night || o.doing.x.shift || o.doing.x.isJob || o.doing.x.clerkShop || o.doing.x.plate))
      && s.persona && s.persona.bond(c, o) >= 35 && Math.hypot(o.x - c.x, o.z - c.z) < 90).sort((a, b) => s.persona.bond(c, b) - s.persona.bond(c, a)).slice(0, 2);
    friends.forEach((o, i) => {
      const xh = addX(s, { id: `help_move:${c.id}:${o.id}`, place, name: `${c.name} 이사 돕기`, only: [o.id], hours: [0, 24], gain: { social: 20, fun: 10 }, helpMove: c.id,
        steps: [S(`yard_${i + 1}`, 'put', 1.6, 'idle_stretch', null, '보따리 내려놓는 중'), S(`yard_${i + 1}`, 'clap', 1.6, 'applaud', null, `${c.name} 이사 축하해!`)] });
      if (o.doing) s.abort(o, '');
      o.orders.length = 0;
      s.order(o, xh);
      o.helpingMove = COL[(i + 1) % 3];
    });
    if (friends.length) s.note(`📦 ${c.name}: 이사하는 날! ${friends.map(o => o.name).join('·')}${friends.length > 1 ? '가' : josa(friends[0].name, '이', '가')} 짐을 같이 들어 줘요`);
  }
  function settle(s, c) {
    const h = homeOfKey(s, c.ownHome);
    const home = s.sockets[c.home];
    if (h && home && home.bed_lie) {
      // 그날 밤부터 새 집 침대에서 잔다
      const bed = mkSocket(s, `_tmp`, 'bed_lie', h.bed[0], h.bed[1], h.feet[0], h.feet[1]);
      if (bed) { bed.place = c.home; bed.h = bed.seatIn ? s.nav.measure(h.bed[0], h.bed[1], 0.8) : bed.h; home.bed_lie = bed; }
      s.places[c.home] = { id: c.home, name: '집', x: h.x, z: h.z, r: h.r };
      const sl = s.interactions.find(q => q.id === `${c.home}.sleep`);
      if (sl) sl.interior = h.key;
      delete home.door_out;
      yard(s, c.home, h);
    }
    c.moving = null;
    c.movedDay = s.day;
    c.warmed = false;
    s.note(`🏡 ${c.name}: 새 집에 이사 왔어요!`);
  }
  // 불러온 저장: 새 집으로 잠자리를 다시 잇는다
  function restore(s, c) { c._needHome = false; if (homeOfKey(s, c.ownHome)) settle(s, c); st(s).owners[c.id] = c.ownHome; }

  /* ---------- 집들이 ---------- */
  function warming(s, c) {
    const h = homeOfKey(s, c.ownHome);
    const place = c.home;
    if (!h || !s.sockets[place] || !s.sockets[place].yard_1) return;
    c.warmed = true;
    const guests = s.chars.filter(o => o !== c && !o.troupe && !o.monster && !o.gone && !o.hidden && !(o.doing && o.doing.x && (o.doing.x.night || o.doing.x.shift || o.doing.x.isJob || o.doing.x.clerkShop))
      && s.persona && s.persona.bond(c, o) >= 30 && Math.hypot(o.x - c.x, o.z - c.z) < 120).sort((a, b) => s.persona.bond(c, b) - s.persona.bond(c, a)).slice(0, 2);
    const party = [c, ...guests];
    party.forEach((o, i) => {
      const x = addX(s, { id: `warming:${c.id}:${o.id}`, place, name: `${c.name}네 집들이`, only: [o.id], hours: [0, 24], gain: { social: 30, fun: 24, hunger: 15 }, group: true,
        steps: [S(i ? `yard_${i}` : 'door_out', 'greet', 1.6, i ? 'wave' : 'ramen_bow', null, i ? '집들이 선물 들고 왔어!' : '어서 와!'), S(i ? `yard_${i}` : 'door_out', 'eat', 5, 'eat_snack', 'snack', '마당에서 간식 나눠 먹는 중'),
          S(i ? `yard_${i}` : 'door_out', 'talk', 3, 'chat_nod', null, '새 집 이야기 도란도란'), S(i ? `yard_${i}` : 'door_out', 'clap', 1.6, 'applaud', null, '새 집 축하해!')] });
      if (o.doing) s.abort(o, '');
      o.orders.length = 0;
      s.order(o, x);
    });
    s.note(`🎊 ${c.name}네 집들이: ${guests.map(o => o.name).join('·') || '혼자'} 놀러 왔어요`);
  }

  /* ---------- 하루의 흐름 ---------- */
  if (VP) {
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      const s = this, H = st(s), today = Math.floor(s.minutes / 1440), h = s.hour;
      // 공고: 닷새마다 아침 9시, 빈집이 있으면
      if (!H.notice && h >= 9 && h < 10 && today % EVERY === 1 && H.lastNotice !== today) {
        const vac = vacant(s);
        H.lastNotice = today;
        if (vac.length) {
          H.round += 1;
          H.notice = { id: H.round, day: today, drawDay: today + 2, homes: vac.slice(0, 2).map(q => q.key), applicants: [] };
          s.note(`🏠 분양 공고: 새 단지 오두막 ${H.notice.homes.length}채 · 청약 신청은 금고에서, 추첨은 모레 오후 ${DRAW_H}시 광장`);
        }
      }
      // 추첨 날: 2시에 신청자가 광장으로, 3시에 추첨
      if (H.notice && today >= H.notice.drawDay) {
        if (h >= DRAW_H - 1 && !H.notice.gathered) {
          H.notice.gathered = true;
          for (const id of H.notice.applicants) {
            const c = s.chars.find(o => o.id === id);
            if (!c || c.hidden || (c.doing && c.doing.x && (c.doing.x.night || c.doing.x.clerkShop || c.doing.x.shift))) continue;
            if (c.doing) s.abort(c, '');
            c.orders.length = 0;
            s.order(c, VO.BY_ID['plaza.lottery_watch']);
          }
          s.note('🎱 곧 분양 추첨! 신청자들이 광장에 모여요');
        }
        if (h >= DRAW_H) draw(s);
      }
      for (const c of s.chars) {
        if (c._needHome) restore(s, c);
        if (!c.ownHome) continue;
        // 괴물이 되거나 떠난 주민의 새 집은 다시 빈집이 된다
        if (c.monster || c.gone) { delete H.owners[c.id]; c.ownHome = null; c.moving = null; continue; }
        // 이사 날 아침 9시
        if (!c.moving && c.moveDay !== undefined && today >= c.moveDay && h >= 9 && h < 18 && !c.movedDay && !c.hidden && !(c.doing && c.doing.x && (c.doing.x.night || c.doing.x.clerkShop || c.doing.x.shift || c.doing.x.isJob))) beginMove(s, c);
        // 걸을 때 보따리를 안는다
        const d = c.doing;
        const carrying = (c.moving === 'in' && d && d.x && d.x.moveIn && d.phase !== 'use');
        if (carrying) c.moveClip = 'bundle_carry';
        else if (c.moveClip === 'bundle_carry' && !(d && d.x && d.x.moveIn)) c.moveClip = null;
        // 집 빚: 지갑에 1500 넘으면 500씩 갚는다
        if (c.houseDebt > 0 && c.money > 1500) { const p = Math.min(500, c.houseDebt); c.money -= p; c.houseDebt -= p; if (!c.houseDebt) s.note(`🏡 ${c.name}: 집값을 다 갚았어요!`); }
        // 집들이: 이사 이틀 뒤 저녁 5시
        if (c.movedDay !== undefined && !c.warmed && today >= c.movedDay + 2 && h >= 17 && h < 20 && !c.hidden) warming(s, c);
      }
      // 이사 돕는 친구도 보따리를 안고 간다
      for (const o of s.chars) {
        if (!o.helpingMove) continue;
        const d = o.doing;
        if (d && d.x && d.x.helpMove && d.phase !== 'use') o.moveClip = o.helpingMove;
        else if (!(d && d.x && d.x.helpMove)) { if (/^bundle_carry/.test(o.moveClip || '')) o.moveClip = null; if (!d || !d.x || !d.x.helpMove) o.helpingMove = null; }
      }
    };
  }
  root.Housing = { st, vacant, draw, beginMove, warming, PRICE };
}(typeof self !== 'undefined' ? self : this));
