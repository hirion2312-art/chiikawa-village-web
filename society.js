'use strict';

// 치이카와 심즈 — 마을 사회 1차 (2026-11-12 이재헌님, docs/plan-society-bank-housing-2026-11-12.md 1~4번)
//  1) 엑스트라 이름과 리본: 두 글자 이름, 머리 리본 색으로 구별. 이름표도 단다
//  2) 엑스트라 알바: 작은 가게(과자의 마치오카·게임센터 경품·낚시 미끼 매대·리사이클 숍 계산대)는 엑스트라 점원,
//     요로이씨 가게(무차우·타코야키·그릇·약국·찻집·우마이야·레몬 공장)는 엑스트라가 보조 알바로
//  3) 채용·근무표·출근(앞치마)·지각·주급·숙련·승진: 구인 → 면접 → 근무 요일·시간 → 출근 → 손님 맞추기 → 퇴근 → 주급날
//  4) 마을 금고: 번호표 → 기다리기 → 창구에 통장 → 도장 쾅. 보통 통장·적금 도장 카드(10칸이면 덤)·청약 통장(넣은 횟수 = 추첨 점수)
(function (root) {
  const VO = root.VillageObjects;
  const AS = root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {});
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  const josa = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
  const pop = (c, t, col) => root.Economy && root.Economy.pop(c, t, col);
  const DAY = 1440;

  /* ================= 1) 엑스트라 이름과 리본 ================= */
  const NAMES = ['포포', '토토', '콩이', '모모', '루루', '미미', '쿠쿠', '나나', '키키', '보보', '두두', '코코', '피피', '소소', '하루', '누누', '단단', '몽몽',
    '라라', '다다', '호호', '부부', '보리', '밤이', '솜이', '찹쌀', '떡이', '감자', '호떡', '방울', '구름', '별이', '달이', '꽁이', '뭉치', '말랑'];
  const RIBBON = ['#e86a5a', '#5aa0d9', '#f3c64a', '#7fbf6a', '#b98ae0', '#f08aa6', '#f0a058', '#5fc2b8'];
  const numOf = c => { const m = String(c.id).match(/(\d+)$/); return m ? +m[1] : 0; };
  function nameExtra(c) {
    if (!c.extra || c.troupe || c.monster || c.named) return;
    if (c.scar || c.strong || /엑스트라$/.test(c.name) && c.name !== '엑스트라') { c.named = true; c.ribbon = c.ribbon || null; return; }
    const n = numOf(c);
    c.name = NAMES[(n - 1 + NAMES.length) % NAMES.length] + (n > NAMES.length ? Math.ceil(n / NAMES.length) : '');
    c.ribbon = RIBBON[(n * 3) % RIBBON.length];
    c.named = true;
  }
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const homes0 = VP.giveExtrasHomes;
    VP.giveExtrasHomes = function () { for (const c of this.chars) nameExtra(c); return homes0.apply(this, arguments); };
  }

  /* ================= 2) 가게와 자리 ================= */
  // 작은 가게: 엑스트라가 점원. clerk = 점원이 서는 자리, ask = 면접 보러 서는 자리, 시간·시급
  const SHOPS = {
    machioka: { name: '과자의 마치오카', role: '포장', clerk: [0, 1.2, 0, 0, 4], ask: 'door_front', hours: [10, 18], wage: 80, apron: '#f4a9bd' },
    arcade: { name: '게임센터 경품 교환대', role: '경품', clerk: [9.25, 2.4, 0, 6.6, 2.4], ask: 'prize_stand', hours: [12, 20], wage: 80, apron: '#9fd0ea' },
    pond: { name: '낚시 미끼 매대', role: '미끼', clerk: [-7.9, 8.8, 0, -4.2, 8.8], ask: 'shop_stand', hours: [7, 13], wage: 70, apron: '#a8d8b4' },
    recycle: { name: '리사이클 숍 계산대', role: '매입', clerk: [6.35, 3.3, 0, 3.9, 3.3], ask: 'counter_stand', hours: [10, 16], wage: 80, apron: '#c9a273' },
  };
  for (const [place, sh] of Object.entries(SHOPS)) {
    (AS[place] || (AS[place] = {})).clerk_stand = sh.clerk;
    put({ id: `${place}.clerk`, place, name: `${sh.name} 알바`, clerkShop: place, hours: [0, 24], gain: {},
      steps: [S('clerk_stand', 'apron', 1.2, 'idle_stretch', null, '앞치마 두르고 출근 도장 쾅'), S('clerk_stand', 'work', 60, 'wipe_towel', null, `${sh.role} 일 보는 중`), S('clerk_stand', 'off', 1.2, 'wave', null, '수고하셨습니다!')] });
  }
  // 요로이씨 가게의 보조 알바: 기존 알바(ecology.js job, shifts.js 출퇴근·시급)를 엑스트라도 맡는다
  const HELP = ['mucha.job_stock', 'market.job_takoyaki', 'market.job_pottery', 'market.job_clothes', 'pharmacy.job_shelf', 'kissa.job_serve', 'umaiya.job_kitchen', 'lemon.job_crate'];
  const SLOTS = { machioka: 2, arcade: 1, pond: 1, recycle: 1, 'lemon.job_crate': 2 };
  const openingIds = () => [...Object.keys(SHOPS), ...HELP.filter(id => VO.BY_ID[id])];
  const jobName = id => (SHOPS[id] ? SHOPS[id].name : (VO.BY_ID[id] ? VO.BY_ID[id].name.replace(/\s*\([^)]*\)\s*$/, '') : id));
  const shiftOf = id => (SHOPS[id] ? SHOPS[id].hours : (root.Shifts && root.Shifts.SHIFTS && root.Shifts.SHIFTS[id]) || [10, 16]);
  // 면접: 그 가게의 손님 자리에 서서 주인과 이야기
  for (const id of openingIds()) {
    const place = SHOPS[id] ? id : VO.BY_ID[id].place;
    const ask = SHOPS[id] ? SHOPS[id].ask : VO.BY_ID[id].steps[0].socket;
    put({ id: `${place}.interview_${id.replace(/\W/g, '_')}`, place, name: `${jobName(id)} 면접`, interviewFor: id, hours: [8, 18], gain: { fun: 4 },
      steps: [S(ask, 'read', 2, 'board_read', null, '"알바 구함" 쪽지를 읽는 중'), S(ask, 'talk', 3, 'talk_order', null, '면접 보는 중 (두근두근)'), S(ask, 'bow', 1.5, 'ramen_bow', null, '잘 부탁드립니다!')] });
  }

  /* ================= 4) 마을 금고 ================= */
  const BANK = {
    ticket_stand: [-3.0, 1.6, 0, -4.0, 1.6],
    wait_sit_1: [-3.9, -1.1, 0, -3.9, 1.0],
    wait_sit_2: [-2.9, -1.1, 0, -2.9, 1.0],
    window_1: [0.2, 0.75, 0, 0.2, -0.7],
    window_2: [2.6, 0.75, 0, 2.6, -0.7],
  };
  AS.bank = BANK;
  if (typeof BUILDERS !== 'undefined') BUILDERS.bank = function (k) {
    const W = 10, D = 7, H = 5;
    const front = k.booth({ w: W, d: D, h: H, wall: '#efe6d2', inner: '#f7f0e0', roof: '#7a8a6a', roofType: 'gable', rh: 2.4, trim: '#8a6a3a', skin: 'plaster' });
    front.sign(0, H - 0.95, 5.6, 1.1, '마을 금고', '#fff4c2', '#6a4a1e');
    const fy = 0.4;
    // 창구: 나무 카운터 + 유리 칸막이 + 창구 번호
    k.box(1.4, fy + 0.55, -0.7, 4.8, 1.1, 0.8, '#b98a5c', 2);
    k.box(1.4, fy + 1.13, -0.7, 4.9, 0.06, 0.9, '#d8b58a', 1);
    for (const x of [-1.0, 1.4, 3.8]) k.box(x, fy + 1.75, -0.75, 0.06, 1.2, 0.06, '#8a6a3a', 0);
    k.box(1.4, fy + 2.35, -0.75, 4.9, 0.08, 0.08, '#8a6a3a', 0);
    const glass = new THREE.MeshToonMaterial({ color: '#dff3fb', transparent: true, opacity: 0.35, depthWrite: false });
    for (const x of [0.2, 2.6]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), glass); g.position.set(x, fy + 1.75, -0.74); k.group.add(g);
      k.box(x, fy + 1.2, -0.3, 0.7, 0.03, 0.25, '#8a6a3a', 0);                       // 돈 받침
      k.box(x, fy + 2.55, -0.72, 0.5, 0.3, 0.05, '#fffaf0', 1);
      k.paint(x, fy + 2.43, -0.69, 0.46, 0.26, g2 => drawText(g2, x < 1 ? '1번' : '2번', 0, 0.13, 0.42, 0.22, '#6a4a1e'));
      k.npc('yoroi-labor', x, -1.6, { over: { skinColor: '#d9c27a', yoroiGear: null }, label: '금고 요로이' });
    }
    // 뒤 벽: 둥근 금고 문 (손잡이 바퀴와 볼트)
    k.cyl(1.4, fy + 1.9, -3.2, 1.15, 0.2, '#9aa2ab', 2).rotation.x = Math.PI / 2;
    k.cyl(1.4, fy + 1.9, -3.08, 0.95, 0.06, '#b8c0c8', 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const sp = k.box(1.4, fy + 1.9, -3.0, 0.06, 0.9, 0.06, '#6a7078', 0); sp.rotation.z = (i / 6) * Math.PI; }
    k.cyl(1.4, fy + 1.9, -2.98, 0.14, 0.1, '#e3bb4a', 1).rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; k.ball(1.4 + Math.cos(a) * 1.05, fy + 1.9 + Math.sin(a) * 1.05, -3.05, 0.05, 0.05, 0.03, '#6a7078', 0); }
    // 번호표 기계와 전광판, 대기 의자
    k.box(-4.0, fy + 0.6, 1.6, 0.5, 1.2, 0.5, '#e86a5a', 2);
    k.box(-3.74, fy + 1.0, 1.6, 0.02, 0.16, 0.24, '#fffaf0', 0);
    k.ball(-3.74, fy + 0.75, 1.6, 0.06, 0.06, 0.03, '#f3d27a', 0);
    k.box(-1.6, fy + 3.1, -3.3, 1.4, 0.5, 0.1, '#2f2c55', 1);
    k.paint(-1.6, fy + 2.9, -3.24, 1.3, 0.42, g => drawText(g, '0 0 7', 0, 0.21, 1.2, 0.36, '#ffd96a'));
    k.box(-3.4, fy + 0.4, -1.1, 2.2, 0.1, 0.6, '#c49a6c', 1);
    for (const x of [-4.3, -2.5]) k.box(x, fy + 0.2, -1.1, 0.1, 0.4, 0.5, '#8a6242', 0);
    k.box(-3.4, fy + 0.75, -1.38, 2.2, 0.6, 0.08, '#c49a6c', 1);
    // 안내판: 통장 셋
    k.box(4.4, fy + 1.4, 2.4, 0.08, 1.0, 1.3, '#fffaf0', 1);
    k.paint(4.36, fy + 0.95, 2.4, 1.2, 0.9, g => {
      g.save(); g.scale(1, -1); g.fillStyle = '#6a4a1e'; g.textAlign = 'center'; g.font = '0.16px Jua, "Malgun Gothic", sans-serif';
      g.fillText('보통 통장 · 언제나', 0, -0.68); g.fillText('적금 도장 · 10칸이면 덤', 0, -0.46); g.fillText('청약 통장 · 새 집 추첨', 0, -0.24); g.restore();
    }, -Math.PI / 2);
    k.solidRect(1.4, -0.7, 4.9, 0.9);
    k.solidCircle(-4.0, 1.6, 0.35);
  };
  const BS = BANK_STEPS();
  function BANK_STEPS() {
    return [
      S('ticket_stand', 'ticket', 1.2, 'ticket_press', 'ticket', '번호표 뽑는 중'),
      S('wait_sit_*', 'wait', 3, 'wait_tap', 'ticket', '번호표 들고 차례 기다리는 중'),
      S('window_*', 'give', 1.6, 'pay_wait', null, '통장을 두 손으로 내미는 중'),
      S('window_*', 'stamp', 1.2, 'surprised', null, '도장 쾅!'),
      S('window_*', 'take', 1.6, 'pay_receive', null, '통장 받아 펼쳐 보는 중'),
    ];
  }
  put({ id: 'bank.visit', place: 'bank', name: '금고에 저축하러 가기', hours: [9, 17], gain: { fun: 6 }, bankVisit: true, steps: BS });
  put({ id: 'bank.withdraw', place: 'bank', name: '금고에서 돈 찾기', hours: [9, 17], gain: { fun: 2 }, bankWithdraw: true, steps: BS });
  const bankOf = c => c.bank || (c.bank = { bal: 0, stamps: 0, stampWeek: -1, sub: 0, subWeek: -1, log: [] });
  const weekOf = s => Math.floor(s.minutes / (DAY * 7));
  const KEEP = 900;

  /* ================= 판단 규칙 ================= */
  if (root.Purpose && root.Purpose.RULES) {
    root.Purpose.RULES.unshift(
      [/\.clerk$/, 'step', '점원 일은 근무표대로만'],
      [/\.interview_/, 'step', '면접은 구직할 때만'],
      [/^bank\.visit$/, (c, s) => {
        if (c.troupe || c.monster) return false;
        const b = bankOf(c), wk = weekOf(s);
        return c.money >= 1800 || (c.money >= 700 && (b.stampWeek !== wk || b.subWeek !== wk));
      }, '모은 돈이 있거나 이번 주 적금·청약을 안 넣었을 때'],
      [/^bank\.withdraw$/, c => c.money < 300 && bankOf(c).bal >= 500, '지갑이 비었을 때만 찾는다'],
    );
  }
  const L = root.Labor && root.Labor.prototype;
  if (L) {
    const score0 = L.scoreBonus;
    L.scoreBonus = function (c, x) {
      let v = score0.call(this, c, x);
      if (x.bankVisit) v += 30 + (c.traits ? c.traits.diligent * 40 : 0) + (c.money > 3000 ? 30 : 0);
      if (x.bankWithdraw) v += 80;
      return v;
    };
    const fin0 = L.onFinish;
    L.onFinish = function (c, x) {
      fin0.apply(this, arguments);
      const s = this.sim;
      if (x.bankVisit) {
        const b = bankOf(c), wk = weekOf(s), out = [];
        if (b.stampWeek !== wk && c.money >= 300 + 200) {
          c.money -= 300; b.bal += 300; b.stamps += 1; b.stampWeek = wk; out.push(`적금 도장 ${b.stamps}/10`);
          if (b.stamps >= 10) { b.stamps = 0; b.bal += 300; out.push('만기 덤 +300'); s.labor.react(c, 'jump_joy', '적금 다 채웠다!'); }
        }
        if (b.subWeek !== wk && c.money >= 200 + 200 && !c.troupe) { c.money -= 200; b.sub += 1; b.subWeek = wk; out.push(`청약 ${b.sub}회`); }
        const extra = Math.floor(Math.max(0, c.money - KEEP) / 100) * 100;
        if (extra > 0) { c.money -= extra; b.bal += extra; out.push(`예금 ${extra}`); }
        b.log.push({ day: s.day, d: out.join(' · ') }); if (b.log.length > 20) b.log.shift();
        c._money0 = c.money;
        pop(c, `🏦 ${b.bal.toLocaleString()}원`, '#6a8a3a');
        if (out.length) s.note(`🏦 ${c.name}: ${out.join(' · ')}`);
      }
      if (x.bankWithdraw) {
        const b = bankOf(c), take = Math.min(b.bal, 600);
        b.bal -= take; c.money += take;
        s.note(`🏦 ${c.name}: 통장에서 ${take}원을 찾았어요`);
      }
      if (x.interviewFor) hireResult(s, c, x.interviewFor);
      if (x.clerkShop && c.job) shiftDone(s, c, true);
    };
    const save0 = L.save;
    L.save = function (c) { return { ...save0.call(this, c), bank: c.bank, job: c.job }; };
    const load0 = L.load;
    L.load = function (c, r) {
      load0.call(this, c, r);
      if (r && r.bank) c.bank = { bal: +r.bank.bal || 0, stamps: +r.bank.stamps || 0, stampWeek: r.bank.stampWeek ?? -1, sub: +r.bank.sub || 0, subWeek: r.bank.subWeek ?? -1, log: Array.isArray(r.bank.log) ? r.bank.log.slice(-20) : [] };
      if (r && r.job && r.job.id) c.job = r.job;
    };
    // 보조 알바(기존 일)를 마쳐도 근무로 센다
    const fin1 = L.onFinish;
    L.onFinish = function (c, x) { fin1.apply(this, arguments); if (c.job && x.id === c.job.id && !SHOPS[c.job.id]) shiftDone(this.sim, c, false); };
  }

  /* ================= 3) 채용·근무 ================= */
  const workers = (s, id) => s.chars.filter(o => o.job && o.job.id === id && !o.gone && !o.monster);
  function hireResult(s, c, id) {
    if (workers(s, id).length >= (SLOTS[id] || 1)) { s.note(`${c.name}: ${jobName(id)}에는 이미 사람이 다 찼대요`); return; }
    const ok = s.random() < 0.45 + (c.traits ? c.traits.diligent * 0.5 : 0.2);
    if (!ok) { s.note(`${c.name}: ${jobName(id)} 면접에서 떨어졌어요`); s.labor.react(c, 'cry', '다음에 또 올게요…'); return; }
    // 근무 요일: 이레 중 나흘 (이름으로 정한다)
    const n = numOf(c), days = [0, 1, 2, 3, 4, 5, 6].filter(d => (d * 3 + n) % 7 < 4);
    c.job = { id, days, since: s.day, shifts: 0, late: 0, rank: 0, owed: 0, lastDay: -1 };
    s.note(`🧑‍🍳 ${c.name}: ${jobName(id)} 알바에 합격! (${days.map(d => '일월화수목금토'[d]).join('')} ${shiftOf(id)[0]}~${shiftOf(id)[1]}시)`);
    s.labor.react(c, 'jump_joy', '합격이다!');
  }
  function shiftDone(s, c, own) {
    const j = c.job;
    j.shifts += 1;
    if (own) { const [a, b] = shiftOf(j.id); j.owed += Math.round((b - a) * SHOPS[j.id].wage * (j.rank ? 1.5 : 1)); }
    if (j.rank === 0 && j.shifts >= 20 && j.late < 3) {
      j.rank = 1;
      s.note(`🎖️ ${c.name}: ${jobName(j.id)} ${SHOPS[j.id] ? '점장' : '정직원'}이 됐어요! (${j.shifts}번째 근무)`);
      s.labor.react(c, 'jump_joy', SHOPS[j.id] ? '점장이다!' : '정직원이다!');
    }
  }
  const rankTitle = c => (c.job ? `${jobName(c.job.id)} ${c.job.rank ? (SHOPS[c.job.id] ? '점장' : '정직원') : '알바'} ${c.job.shifts}일째` : '');

  // 손님에 맞춰 점원이 움직인다: 계산·건네기 / 어서 오세요 / 손님이 없으면 닦기·정리·두리번
  const CHORE = ['wipe_towel', 'browse_shelf', 'idle_look', 'wipe_towel'];
  function clerkPose(s, c) {
    const place = c.doing.x.place;
    const guests = s.chars.filter(o => o !== c && o.doing && o.doing.x && o.doing.x.place === place && o.doing.phase === 'use' && !o.doing.x.clerkShop && !(o.job && o.job.id === place));
    const paying = guests.find(o => { const st = o.doing.x.steps[o.doing.step]; return st && /pay|buy|take|give|talk|order|ticket/.test(st.act || ''); });
    let clip;
    if (paying) { clip = Math.floor(s.minutes * 2) % 3 === 0 ? 'talk_order' : 'pay_receive'; c.angle = Math.atan2(paying.x - c.x, paying.z - c.z); }
    else if (guests.length) { clip = Math.floor(s.minutes) % 4 === 0 ? 'wave' : 'browse_shelf'; const g = guests[0]; c.angle = Math.atan2(g.x - c.x, g.z - c.z); }
    else clip = CHORE[Math.floor(s.minutes / 3) % CHORE.length];
    if (c.clip !== clip) c.clip = clip;
  }

  if (VP) {
    const start0 = VP.start;
    VP.start = function (c, x, other, ordered) {
      // 큰 물건을 살 때 지갑이 모자라면 통장에서 꺼내 쓴다 (2026-11-12 점검: 돈이 통장에 들어가기만 함)
      if (x && x.cost && c.money < x.cost && c.bank && c.bank.bal > 0 && x.cost >= 300) {
        const need = Math.min(c.bank.bal, Math.ceil((x.cost - c.money + 100) / 100) * 100);
        if (c.money + need >= x.cost) { c.bank.bal -= need; c.money += need; c._money0 = c.money; pop(c, `🏦 -${need} → 지갑`, '#6a8a3a'); }
      }
      // 점원 근무는 퇴근 시각까지
      if (x && x.clerkShop && c.job) {
        const end = shiftOf(c.job.id)[1];
        x.steps[1].min = Math.max(20, (end - this.hour) * 60 - 2);
      }
      return start0.call(this, c, x, other, ordered);
    };
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      const s = this;
      const today = Math.floor(s.minutes / DAY), dow = today % 7, h = s.hour;
      for (const c of s.chars) {
        if (c.extra && !c.named && !c.troupe && !c.monster) nameExtra(c);
        if (!c.extra || c.troupe || c.monster || c.gone || c.hidden) continue;
        // 근무 중이면 손님에 맞춰 움직인다
        if (c.doing && c.doing.x && c.doing.x.clerkShop && c.doing.phase === 'use' && c.doing.step === 1) clerkPose(s, c);
        const j = c.job;
        if (j) {
          const [a, b] = shiftOf(j.id);
          const xid = SHOPS[j.id] ? `${j.id}.clerk` : j.id;
          const onIt = c.doing && c.doing.x && c.doing.x.id === xid;
          if (onIt && j.lastDay !== today) {
            j.lastDay = today;
            if (h >= a + 0.75) { j.late += 1; s.note(`⏰ ${c.name}: ${jobName(j.id)}에 지각했어요 (${j.late}번째)`); s.labor.react(c, 'wobble_fear', '죄송해요!'); }
          }
          // 근무 날, 출근 시각이 되면 하던 걸 정리하고 출근한다 (잠·밤일·다른 근무는 건드리지 않는다)
          // 노동 플레이트(집기·접수·정산)·시험·밤일은 끊지 않고, 한 번 불렀으면 20분은 다시 끊지 않는다 (2026-11-12 점검: 정산 끊김 270회)
          if (j.days.includes(dow) && h >= a - 0.5 && h < b - 1 && j.lastDay !== today && !onIt && !c.orders.some(o => o.x && o.x.id === xid) && !(s.minutes - (j.calledAt || -1e9) < 20)) {
            const dx = c.doing && c.doing.x;
            const busy = dx && (dx.night || dx.shift || dx.isJob || dx.plate || dx.examTake || dx.settle || dx.accept || dx.takeKind || dx.clerkShop || c.plate);
            const x = VO.BY_ID[xid];
            if (!busy && x) { j.calledAt = s.minutes; if (c.doing) s.abort(c, ''); c.orders.length = 0; s.order(c, x); }
          }
          // 주급날: 이레마다 저녁 6시
          if (dow === 6 && h >= 18 && j.owed > 0 && j.payDay !== today) {
            j.payDay = today; c.money += j.owed;
            s.note(`💌 ${c.name}: ${jobName(j.id)} 주급 ${j.owed}원`);
            j.owed = 0;
          }
        } else if (h >= 8 && h < 17 && !c.doing && !c.orders.length && c.lookDay !== today && (c.money < 2600 || (c.traits && c.traits.diligent > 0.55))) {
          // 구직: 하루 한 번, 자리가 남은 가게에 면접 보러 간다
          c.lookDay = today;
          const open = openingIds().filter(id => workers(s, id).length < (SLOTS[id] || 1));
          if (open.length && s.random() < 0.5) {
            const id = open[Math.floor(s.random() * open.length)];
            const place = SHOPS[id] ? id : VO.BY_ID[id].place;
            const iv = VO.BY_ID[`${place}.interview_${id.replace(/\W/g, '_')}`];
            if (iv) s.order(c, iv);
          }
        }
      }
    };
  }
  // 보조 알바(기존 일)는 이제 그 가게에 고용된 엑스트라만 한다. 주인공은 예전처럼 할 수 있다
  if (L) {
    const blocked0 = L.blocked;
    L.blocked = function (c, x) {
      if (c.extra && !c.troupe && HELP.includes(x.id) && !(c.job && c.job.id === x.id)) return '고용된 알바만 해요';
      if (x.clerkShop && !(c.job && c.job.id === x.clerkShop)) return '이 가게 알바가 아니에요';
      return blocked0.call(this, c, x);
    };
  }

  /* ================= 화면: 리본·앞치마·이름표 ================= */
  function profile(a) {
    const info = root.AnimRig && AnimRig.rigInfo(a.built, a.preset);
    const lathe = info && info.bodies && info.bodies.find(b => b.geometry && b.geometry.type === 'LatheGeometry' && b.parent === a.built.model);
    if (!lathe) return null;
    const pts = lathe.geometry.parameters.points.map(p => [p.x * lathe.scale.x, p.y * lathe.scale.y + lathe.position.y]);
    const r = y => { let best = 0; for (let i = 1; i < pts.length; i++) { const [xa, ya] = pts[i - 1], [xb, yb] = pts[i]; if ((y - ya) * (y - yb) <= 0 && ya !== yb) best = Math.max(best, xa + (xb - xa) * (y - ya) / (yb - ya)); } return best; };
    return { pts, r, y0: pts[0][1], y1: pts[pts.length - 1][1] };
  }
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  function ribbon(a, color) {
    const p = profile(a); if (!p) return null;
    const g = new THREE.Group(); g.name = 'ribbon';
    const H = p.y1 - p.y0, y = p.y1 - H * 0.14, ang = -0.75, rr = p.r(y) + 0.02, k = H / 1.67;
    g.position.set(Math.sin(ang) * rr, y, Math.cos(ang) * rr); g.rotation.y = ang; g.rotation.z = 0.35;
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.11 * k, 12, 8), toon(color)); w.scale.set(1.2, 0.8, 0.45); w.position.x = s * 0.12 * k; g.add(w); }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05 * k, 10, 8), toon(new THREE.Color(color).lerp(new THREE.Color('#3b2a26'), 0.3).getStyle())); g.add(knot);
    a.built.model.add(g);
    return g;
  }
  function apron(a, color) {
    const p = profile(a); if (!p) return null;
    const H = p.y1 - p.y0, ya = p.y0 + H * 0.06, yb = p.y0 + H * 0.5;
    const pts = [];
    for (let i = 0; i <= 12; i++) { const y = ya + (yb - ya) * (i / 12); pts.push(new THREE.Vector2(p.r(y) + 0.018, y)); }
    const geo = new THREE.LatheGeometry(pts, 18, -0.85, 1.7);
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, side: THREE.DoubleSide })); m.name = 'apron';
    // 허리끈과 주머니
    const band = new THREE.Mesh(new THREE.TorusGeometry(p.r(yb) + 0.02, 0.02, 5, 40), toon(new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.5).getStyle()));
    band.rotation.x = Math.PI / 2; band.position.y = yb; m.add(band);
    const yp = p.y0 + H * 0.25, rp = p.r(yp) + 0.03;
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.2 * H / 1.67, 0.12 * H / 1.67, 0.02), toon(new THREE.Color(color).lerp(new THREE.Color('#3b2a26'), 0.15).getStyle()));
    pocket.position.set(0.12, yp, rp); m.add(pocket);
    a.built.model.add(m);
    return m;
  }
  function tick() {
    // 리본·앞치마·이름표는 세 프레임에 한 번만 본다 (2026-11-12 점검: 화면 속도)
    if ((tick.n = (tick.n || 0) + 1) % 3) { requestAnimationFrame(tick); return; }
    const G = root.game;
    if (G && G.actors) {
      for (const a of G.actors) {
        const c = a.c;
        if (!c.extra || c.troupe) continue;
        if (c.named && c.ribbon && !c.monster && !(a._ribbon && a._ribbon.parent === a.built.model ? a._ribbon : null)) a._ribbon = ribbon(a, c.ribbon);
        const rb = (a._ribbon && a._ribbon.parent === a.built.model ? a._ribbon : null); if (rb) rb.visible = !c.monster;
        const working = c.job && c.doing && c.doing.x && (c.doing.x.clerkShop || c.doing.x.id === c.job.id) && c.doing.phase === 'use';
        let ap = (a._apron && a._apron.parent === a.built.model ? a._apron : null);
        if (working && !ap) ap = a._apron = apron(a, SHOPS[c.job.id] ? SHOPS[c.job.id].apron : '#f3e3c4');
        if (ap) ap.visible = !!working;
        // 엑스트라 이름표 (처음 만들 때는 없었다)
        if (c.named && !c.monster && !a.extraTag && typeof makeNameTag === 'function') {
          if (a.tag && a.tag.parent) a.tag.parent.remove(a.tag);
          a.tag = makeNameTag(c.name); a.tag.position.y = a.height + 0.45; a.built.root.add(a.tag); a.extraTag = true;
        }
      }
    }
    requestAnimationFrame(tick);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);

  root.Society = { SHOPS, HELP, NAMES, bankOf, rankTitle, jobName, workers, wealth: c => c.money + ((c.bank && c.bank.bal) || 0),
    chip: c => {
      const b = c.bank;
      const d = c.dream && !c.dream.done && root.Economy && root.Economy.DREAMS[c.dream.id];
      return [`💰 ${c.money.toLocaleString()}원`, b && b.bal ? `🏦 ${b.bal.toLocaleString()}` : '', b && b.stamps ? `적금 ${b.stamps}/10` : '', b && b.sub ? `🏠 청약 ${b.sub}회` : '', d ? `🐷 ${c.dream.saved}/${d.price}` : ''].filter(Boolean).join(' · ');
    } };
}(typeof self !== 'undefined' ? self : this));
