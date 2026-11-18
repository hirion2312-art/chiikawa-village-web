'use strict';

// 치이카와 심즈 — 소지품과 가게
// 무기·교과서·낚싯대는 돈을 주고 사야 하고, 없으면 그 일을 할 수 없다.
// 음식은 무차우마켓과 시장 매대에서도 사 먹는다
(function (root) {
  const ITEMS = {
    weapon: { name: '무기', price: 900 },
    grass_book: { name: '풀뽑기 교과서', price: 400 },
    arb_book: { name: '슈퍼 알바이터 교과서', price: 900 },
    rod: { name: '낚싯대', price: 400 },
  };
  const S = (socket, act, min, clip, prop, fx) => ({ socket, act, min, clip, prop, fx });
  const HOURS = [9, 20];
  const buy = (place, item, steps, label) => ({ id: `${place}.buy_${item}`, place, name: label || `${ITEMS[item].name} 사기`, steps, gain: {}, cost: ITEMS[item].price, buy: item, hours: HOURS });
  const food = (place, id, name, steps, gain, cost, snack) => ({ id: `${place}.${id}`, place, name, steps, gain, cost, hours: [8, 21], snack: !!snack });
  // 원작에서 처음부터 무기를 가진 주민 (바이블 §2.3: 치이카와·하치와레·후루혼야 사스마타, 우사기 장치봉, 랏코 검). 엑스트라 둘은 토벌 랭커
  const START = { weapon: ['chiikawa', 'hachiware', 'usagi', 'rakko', 'furuhonya', 'extra1', 'extra2'] };

  const SALES = [
    buy('recycle', 'weapon', [S('browse_stand', 'browse', 3), S('counter_stand', 'pay', 2, 'pay_wait')]),
    buy('market', 'grass_book', [S('books.browse_front', 'browse', 3), S('books.browse_front', 'pay', 2, 'pay_wait')]),
    buy('market', 'arb_book', [S('books.browse_front', 'browse', 3), S('books.browse_front', 'pay', 2, 'pay_wait')]),
    buy('mucha', 'rod', [S('shelf_look_*', 'browse', 3), S('checkout_stand', 'pay', 2, 'pay_wait')]),
    food('mucha', 'bento', '도시락 사 먹기', [S('shelf_look_*', 'browse', 3), S('checkout_stand', 'pay', 2, 'pay_wait'), S('cart_stand|parking_stand', 'eat', 10, 'eat_bowl', 'bowl')], { hunger: 45, fun: 4 }, 250),
    food('mucha', 'rice_ball', '주먹밥 사 먹기', [S('shelf_look_*', 'browse', 2), S('checkout_stand', 'pay', 2, 'pay_wait'), S('cart_stand|parking_stand', 'eat', 5, 'eat_snack', 'snack')], { hunger: 25 }, 120, true),
    food('market', 'stall_skewer', '매대 꼬치 사 먹기', [S('takoyaki.order_front', 'talk', 2), S('takoyaki.eat_sit_*', 'eat', 7, 'eat_bite', 'skewer')], { hunger: 28, fun: 8 }, 180, true),
    food('market', 'stall_snack', '매대 간식 사 먹기', [S('takoyaki.order_front', 'talk', 2), S('takoyaki.eat_sit_*', 'eat', 5, 'eat_snack', 'snack')], { hunger: 20, fun: 10 }, 120, true),
  ];

  const VO = root.VillageObjects;
  for (const x of SALES) {
    VO.LIST.push(x);
    if (VO.BY_ID) VO.BY_ID[x.id] = x;
  }

  const owns = (c, item) => !!c.owned && c.owned.includes(item);
  // 이 상호작용에 꼭 있어야 하는 물건
  function needOf(x) {
    if (x.takeKind === 'hunt' || x.plate === 'hunt') return 'weapon';
    if (x.skill === 'grass') return 'grass_book';
    if (x.skill === 'arbiter') return 'arb_book';
    if (x.id === 'pond.fish') return 'rod';
    return null;
  }

  root.Shop = {
    ITEMS,
    owns,
    needOf,
    blocked(c, x) {
      if (x.buy && owns(c, x.buy)) return '이미 갖고 있어요';
      const need = needOf(x);
      if (need && !owns(c, need)) return `${ITEMS[need].name}${/[가-힣]$/.test(ITEMS[need].name) && (ITEMS[need].name.charCodeAt(ITEMS[need].name.length - 1) - 0xac00) % 28 ? '이' : '가'} 없어요`;
      return null;
    },
    // 처음부터 가진 물건 (새 게임과 예전 저장 모두에 적용)
    startOwned(c) { return Object.keys(START).filter(item => START[item].includes(c.id)); },
    giveStart(c) { for (const item of this.startOwned(c)) this.give(c, item); },
    give(c, item) {
      c.owned = c.owned || [];
      if (!c.owned.includes(item)) c.owned.push(item);
    },
    names(c) { return (c.owned || []).map(i => (ITEMS[i] ? ITEMS[i].name : null)).filter(Boolean); },
    // 필요한 물건을 살 만큼 돈이 있으면 사러 간다 (멀어도)
    score(c, x, sim) {
      // 간식(주먹밥·꼬치·과자)은 출출할 때와 돈이 적을 때 끌린다. 큰 식사는 배가 많이 고플 때 이긴다
      if (x.snack) {
        const h = c.needs.hunger;
        return (h >= 30 && h < 80 ? 22 : 0) + (c.money < 800 ? 14 : 0);
      }
      if (!x.buy || owns(c, x.buy) || c.money < x.cost + 150) return 0;
      let v = 0;
      // 무기: 토벌 플레이트(보수가 가장 큰 일)를 잡으려면 꼭 있어야 한다
      if (x.buy === 'weapon') v = 40 + (c.strong ? 95 : 0) + Math.max(0, c.traits.brave - 0.3) * 120 + (c.wantTrain ? 30 : 0);
      else if (x.buy === 'grass_book') v = 95;
      else if (x.buy === 'arb_book') v = c.arbiter ? 0 : c.arbExam || c.arbStudy ? 80 : c.money > 2000 ? 45 : 0;
      // 낚싯대는 낚시를 하러 갈 주민만, 하루에 너무 여럿이 우르르 사지 않게 (2026-11-10: 하루 14번 사던 문제)
      else if (x.buy === 'rod') return c.extra || c.troupe || sim.random() > 0.15 ? 0 : 10;
      const p = sim.places[x.place];
      return p ? v * (1 + Math.hypot(c.x - p.x, c.z - p.z) / 70) : v;
    },
  };
}(typeof self !== 'undefined' ? self : this));
