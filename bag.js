'use strict';

// 치이카와 심즈 — 가방
// 가진 도구(무기·교과서·낚싯대, shop.js), 쟁여 둔 식량, 간식, 술을 한곳에서 본다.
// - 모두가 장을 봐서 식량을 가방에 쟁여 두고, 배고프면 꺼내 먹는다. 떨어지면 장을 보러 간다
// - 꺼내 먹으면 한 끼에 식량 2개, 집에서 해 먹으면 1개로 똑같이 배부르다 (집밥은 식량을 절반만 쓴다)
// - 친한 친구와 수다를 떨다가 가진 간식이나 식량을 선물하기도 한다
// 식량 수는 town-sets.js가 쓰던 c.groceries를 그대로 쓴다. village-sim.js·labor.js·persona.js는 감싸서 붙인다
(function (root) {
  const MEAL = 45;              // 한 끼 배부름
  const EAT_UNITS = 2;          // 꺼내 먹을 때 드는 식량
  const COOK_UNITS = 1;         // 집에서 해 먹을 때 드는 식량
  const BUY_UNITS = 4;          // 장 한 번에 사 오는 식량
  const TREAT = {
    snack: { name: '과자', icon: '🍪', fill: 8, fun: 8 },
    berry: { name: '산딸기', icon: '🍓', fill: 8, fun: 4 },
  };
  const S = (socket, act, min, clip, prop) => ({ socket, act, min, clip, prop });

  /* ---------- 가방 다루기 ---------- */

  const stock = c => c.groceries || 0;
  const useStock = (c, n) => { c.groceries = Math.max(0, stock(c) - n); };
  const count = (c, id) => (c.bag && c.bag[id]) || 0;
  const add = (c, id, n = 1) => { const b = c.bag || (c.bag = {}); b[id] = (b[id] || 0) + n; };
  const take = (c, id) => {
    if (!count(c, id)) return false;
    c.bag[id] -= 1;
    if (!c.bag[id]) delete c.bag[id];
    return true;
  };
  const treats = c => Object.keys(TREAT).reduce((n, id) => n + count(c, id), 0);

  // 화면용 목록
  function list(c) {
    const out = [];
    for (const item of c.owned || []) {
      const it = root.Shop.ITEMS[item];
      if (it) out.push({ group: '도구', icon: { weapon: '🗡️', grass_book: '📗', arb_book: '📘', rod: '🎣' }[item] || '🧰', name: it.name, n: 1 });
    }
    if (stock(c)) out.push({ group: '음식', icon: '🧺', name: '식량', n: stock(c), note: `꺼내 먹으면 한 끼에 ${EAT_UNITS}개, 집에서 해 먹으면 ${COOK_UNITS}개` });
    for (const [id, f] of Object.entries(TREAT)) if (count(c, id)) out.push({ group: '음식', icon: f.icon, name: f.name, n: count(c, id), note: `배부름 +${f.fill}` });
    if (c.sake) out.push({ group: '음식', icon: '🍶', name: '술', n: c.sake });
    return out;
  }
  // 없어서 못 하는 일 (화면 안내용)
  function missing(c) {
    const out = [];
    const owns = id => root.Shop.owns(c, id);
    if (!owns('grass_book')) out.push('풀뽑기 교과서가 없어서 풀뽑기 공부를 못 해요');
    if (!owns('weapon')) out.push('무기가 없어서 토벌을 못 해요');
    if (!stock(c)) out.push('식량이 떨어졌어요. 장을 보러 가야 해요');
    return out;
  }

  /* ---------- 상호작용 ---------- */

  const VO = root.VillageObjects;
  const push = x => { VO.LIST.push(x); if (VO.BY_ID) VO.BY_ID[x.id] = x; };
  // 꺼내 먹는 자리: 벤치·모닥불 터·자기 집
  const EAT_SPOTS = [
    ['plaza', 'bench_sit_*'], ['hiroma', 'table_sit_*|bench_sit'], ['statue', 'bench_sit_*'], ['islandHomes', 'shade_sit'],
    ['home', 'table_sit', ['chiikawa']], ['cave', 'tea_sit_*', ['hachiware', 'usagi']],
    ['momongaHome', 'study_sit', ['momonga']], ['shisaHome', 'study_sit', ['shisa']], ['rakkoHome', 'study_sit', ['rakko']],
    ['kurimanjuHome', 'study_sit', ['kurimanju']], ['furuhonyaHome', 'study_sit', ['furuhonya']],
  ];
  for (const [place, socket, only] of EAT_SPOTS) {
    push({
      id: `${place}.bag_eat`, place, name: '가방에서 꺼내 먹기', bagEat: true, gain: { hunger: MEAL, fun: 3 }, hours: [6, 22],
      steps: [S(socket, 'eat', 8, 'eat_bowl', 'bowl')], ...(only ? { only } : {}),
    });
  }
  // 부엌이 따로 없는 집은 책상에서 간단히 지어 먹는다
  for (const [place, who] of [['momongaHome', 'momonga'], ['shisaHome', 'shisa'], ['rakkoHome', 'rakko'], ['kurimanjuHome', 'kurimanju'], ['furuhonyaHome', 'furuhonya']]) {
    push({
      id: `${place}.cook`, place, name: '집에서 밥 해 먹기', only: [who], gain: { hunger: MEAL, fun: 6 }, hours: [6, 22],
      steps: [S('study_sit', 'cook', 8, 'cook_stir'), S('study_sit', 'eat', 10, 'eat_bowl', 'bowl')],
    });
  }
  // 간식은 따로 챙긴다
  push({
    id: 'market.pack_snack', place: 'market', name: '매대 간식 사서 챙기기', cost: 200, hours: [8, 21], gain: { fun: 4 }, pack: { snack: 2 },
    steps: [S('takoyaki.order_front', 'talk', 2, 'pay_wait')],
  });

  const isCook = x => (x.gain.hunger || 0) >= 30 && (/cook/.test(x.id) || /밥 (해|지어)/.test(x.name));
  // 집밥은 돈 대신 식량을 쓴다
  for (const x of VO.LIST) if (isCook(x)) delete x.cost;
  const groceriesX = VO.LIST.find(x => x.groceries);
  if (groceriesX) groceriesX.name = '장 보기 (식량 쟁여 두기)';

  /* ---------- 시뮬레이션에 붙이기 ---------- */

  const V = root.Village.Village.prototype;
  const start0 = V.start;
  V.start = function (c, x, other, ordered) {
    // 꺼내 먹기: 식량이 한 끼만큼 없으면 있는 만큼, 식량이 없으면 간식을 먹는다
    if (x && x.bagEat) {
      if (stock(c) >= EAT_UNITS) {
        useStock(c, EAT_UNITS);
      } else if (stock(c) === 1) {
        useStock(c, 1);
        x = { ...x, name: '남은 식량 꺼내 먹기', gain: { hunger: Math.round(MEAL / EAT_UNITS), fun: 2 } };
      } else {
        const id = Object.keys(TREAT).find(k => count(c, k));
        if (!id || !take(c, id)) return undefined;
        const f = TREAT[id];
        x = { ...x, name: `${f.name} 꺼내 먹기`, gain: { hunger: f.fill, fun: f.fun }, steps: [{ ...x.steps[0], min: 4, clip: 'eat_snack', prop: 'snack' }] };
      }
    } else if (x && isCook(x)) {
      // 재료를 꺼내 요리를 시작한다
      useStock(c, COOK_UNITS);
    }
    return start0.call(this, c, x, other, ordered);
  };

  const L = root.Labor.prototype;
  const blocked0 = L.blocked;
  L.blocked = function (c, x) {
    if (x.bagEat && !stock(c) && !treats(c)) return '가방에 먹을 게 없어요';
    if (isCook(x) && stock(c) < COOK_UNITS) return '식량이 없어요';
    if (x.groceries && stock(c) >= 10) return '가방이 꽉 찼어요';
    if (x.pack && treats(c) >= 4) return '간식이 넉넉해요';
    return blocked0.call(this, c, x);
  };

  const score0 = L.scoreBonus;
  L.scoreBonus = function (c, x) {
    let v = score0.call(this, c, x);
    const hungry = 100 - c.needs.hunger;
    const n = stock(c);
    // 식량이 떨어져 가면 장을 보러 간다. 배가 고플수록 서두른다 (가게가 멀어도 가도록 크게 준다: 점수는 거리로 나뉜다)
    if (x.groceries) v += (n === 0 ? 120 : n < EAT_UNITS ? 85 : n < 4 ? 15 : -14) + (hungry > 40 && n < EAT_UNITS ? 45 : 0);
    // 쟁여 둔 식량부터 먹는다. 집에 있으면 해 먹는 게 낫다 (식량이 절반만 든다)
    if (x.bagEat) v += n >= EAT_UNITS ? 60 : 8;
    if (isCook(x)) v += 70;
    if (x.pack) v += treats(c) ? -6 : 6;
    return v;
  };

  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    const before = stock(c);
    finish0.call(this, c, x);
    // 식량 계산은 여기서만 한다 (town-sets.js가 하던 장 보기 +2, 집밥 -1을 덮어쓴다. 집밥 식량은 시작할 때 이미 뺐다)
    if (x.groceries) c.groceries = before + BUY_UNITS;
    if (isCook(x)) c.groceries = before;
    if (x.pack) for (const [id, k] of Object.entries(x.pack)) add(c, id, k);
    // 채집을 해내면 산딸기를 조금 챙긴다
    if (x.plate === 'gather' && c.plate && c.plate.state === 'done') add(c, 'berry', 2);
  };

  const tick0 = L.tick;
  L.tick = function () {
    tick0.call(this);
    if (this.bagReady) return;
    this.bagReady = true;
    for (const c of this.sim.chars) if (c.groceries === undefined) c.groceries = 4;
  };

  const save0 = L.save;
  L.save = function (c) { return { ...save0.call(this, c), bag: c.bag || {} }; };
  const load0 = L.load;
  L.load = function (c, r) {
    load0.call(this, c, r);
    if (r && r.bag && typeof r.bag === 'object') c.bag = { ...r.bag };
  };

  /* ---------- 선물 ---------- */

  const P = root.Persona.prototype;
  const chat0 = P.onChat;
  P.onChat = function (c, o) {
    chat0.call(this, c, o);
    const s = this.sim;
    if (c.extra || o.extra || this.bond(c, o) < 45) return;
    const key = `${c.id}>${o.id}`;
    s.giftLog = s.giftLog || {};
    if (s.giftLog[key] === s.day || s.random() > 0.4) return;
    // 간식이 있으면 간식을, 없으면 넉넉한 식량을 나눈다 (친구 식량이 떨어졌으면 더 잘 나눈다)
    let gift = Object.keys(TREAT).find(k => count(c, k));
    if (gift) {
      take(c, gift);
      add(o, gift, 1);
      gift = TREAT[gift].name;
    } else if (stock(c) >= 6 || (stock(c) >= 3 && stock(o) === 0)) {
      useStock(c, 2);
      o.groceries = stock(o) + 2;
      gift = '식량 2개';
    } else return;
    s.giftLog[key] = s.day;
    this.grow(c, o, 4);
    s.note(`${c.name}: ${o.name}에게 ${gift}을(를) 선물했어요`);
    // 건네고 받는다
    if (!c.doing) s.labor.react(c, 'give_hand');
    if (!o.doing) s.labor.react(o, 'receive');
  };

  root.Bag = { TREAT, MEAL, EAT_UNITS, COOK_UNITS, stock, count, add, take, list, missing };
}(typeof self !== 'undefined' ? self : this));
