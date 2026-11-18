'use strict';

// 치이카와 심즈 — 같이 하기 2차: 먹는 곳 전부 + 집에서 같이 밥 해 먹기 (docs/together-plan-2026-11-11.md §3-1)
// 장소마다 그곳다운 박자를 둔다. 먹는 단계에서만 박자를 맞추고 (표 사기·주문 중에는 각자), 먹을 것은 손에서 손으로 건너간다.
//  라멘: 후루룩 맞추기·차슈 건네기·동시에 푸하 / 우마이야: 반찬 바꿔 먹기 / 카레: 한 숟갈 먹여 주기·덥다고 같이 부채질
//  왕 카레 도전: 같이 온 친구가 옆에서 응원하고 성공하면 같이 만세 / 서서 소바: 고춧가루 뿌려 주기
//  타코야키: 한 알씩 번갈아 먹여 주며 호호 / 무챠우: 한 명은 카트, 한 명은 담기, 봉투 나눠 들기
//  마치오카 뽑기: 친구는 두 손 모아 기도, 나오면 같이 폴짝 / 솟는 곳: 받아서 건네기·건배 / 소프트크림: 서로 한입
//  집: 한 명은 젓고 한 명은 썰고, 다 되면 그릇을 건네 마주 앉아 먹는다 (식량은 집주인 것 한 몫만 쓴다)
(function (root) {
  const P = root.Pair;
  if (!P) return;
  const { C } = root.MinorActs;
  const hold = (a, dur) => `${a}@0 ${a}@${dur}`;
  const REST = 'hip(-.2,.1,0)';

  /* ---------- 먹는 곳 2인 동작 ---------- */
  const CLIPS = {
    // 뜨거운 걸 입 앞에 들고 호호 (둘이 같이)
    pair_hot_blow: C(1.8, { rotX: '0:.08 1.8:.08', squash: '0:1 .3:.96 .5:1.03 .9:.96 1.1:1.03 1.8:1' },
      { R: hold('mouth(.08,.04,.24)', 1.8), L: 'chest(.18,.1,.1)@0 mouth(-.06,.06,.22)@.4 chest(.18,.1,.1)@.9 mouth(-.06,.06,.22)@1.3 chest(.18,.1,.1)@1.8' }, [[0, 'surprised'], [.6, 'smile']]),
    // 친구 그릇 위로 손을 뻗어 톡톡 뿌려 준다
    pair_sprinkle: C(1.8, { rotX: '0:.04 .5:.14 1.4:.14 1.8:.04', rotY: '0:0 .5:.25 1.4:.25 1.8:0' },
      { R: 'chest(.2,.1,.14)@0 front(.3,.0,.36)@.5 front(.3,.04,.36)@.7 front(.3,.0,.36)@.9 front(.3,.04,.36)@1.1 chest(.2,.1,.14)@1.8', L: hold(REST, 1.8) }, [[0, 'smile']]),
    // 장바구니에 물건을 하나씩 담는다
    pair_put_item: C(2, { rotX: '0:0 .5:.24 .8:.24 1.2:0 2:0', posZ: '0:0 .5:.06 1.2:0 2:0' },
      { R: 'chest(.24,.1,.1)@0 front(.2,-.16,.36)@.5 front(.2,-.18,.38)@.8 chest(.24,.1,.1)@1.3 chest(.24,.1,.1)@2', L: hold(REST, 2) }, [[0, 'normal'], [.6, 'smile']]),
    // 두 손 모아 꼭 쥐고 기도하며 지켜본다
    pair_pray_watch: C(2, { rotX: '0:.1 1:.14 2:.1', posY: '0:0 .5:.03 1:0 1.5:.03 2:0', squash: '0:1 .5:.97 1:1 1.5:.97 2:1' },
      { R: hold('chest(.02,.12,.24)', 2), L: hold('chest(.02,.12,.24)', 2) }, [[0, 'worried'], [1.4, 'flustered']]),
    // 국자로 떠서 친구 그릇에 부어 준다
    pair_ladle_pour: C(2.2, { rotX: '0:.06 .6:.22 1.4:.12 2.2:.04', rotY: '0:0 1:.3 2.2:0' },
      { R: 'chest(.2,.1,.14)@0 front(.2,-.2,.34)@.6 front(.32,.0,.34)@1.2 front(.3,-.06,.36)@1.6 chest(.2,.1,.14)@2.2', L: hold(REST, 2.2) }, [[0, 'normal'], [1.2, 'smile']]),
    // 친구 소프트크림을 한입 날름
    pair_lick_cream: C(1.8, { rotX: '0:0 .6:.22 1.1:.22 1.8:0', posZ: '0:0 .6:.1 1.1:.1 1.8:0', squash: '0:1 1.2:1.05 1.4:.97 1.8:1' },
      { R: hold('belly(.16,.04,.1)', 1.8), L: hold(REST, 1.8) }, [[0, 'normal'], [.6, 'surprised'], [1.1, 'joy']]),
    // 도마 위에서 통통통 썬다
    pair_chop: C(1.2, { rotX: '0:.18 1.2:.18', posY: '0:0 .15:-.02 .3:0 .45:-.02 .6:0 .75:-.02 .9:0 1.05:-.02 1.2:0' },
      { R: 'front(.16,-.12,.34)@0 front(.16,-.2,.34)@.15 front(.16,-.12,.34)@.3 front(.18,-.2,.34)@.45 front(.18,-.12,.34)@.6 front(.2,-.2,.34)@.75 front(.2,-.12,.34)@.9 front(.16,-.2,.34)@1.05 front(.16,-.12,.34)@1.2', L: hold('front(-.08,-.18,.32)', 1.2) }, [[0, 'normal']]),
    // 옆에서 부채질하며 "힘내!"
    pair_fan_cheer: C(1.6, { rotZ: '0:.06 .4:-.06 .8:.06 1.2:-.06 1.6:.06', posY: '0:0 .4:.04 .8:0 1.2:.04 1.6:0' },
      { R: 'front(.3,.02,.24)@0 front(.34,.12,.2)@.2 front(.3,.02,.24)@.4 front(.34,.12,.2)@.6 front(.3,.02,.24)@.8 front(.34,.12,.2)@1 front(.3,.02,.24)@1.2 front(.34,.12,.2)@1.4 front(.3,.02,.24)@1.6', L: 'chest(.24,.1,.1)@0 high(.2,-.2,.1)@.8 chest(.24,.1,.1)@1.6' }, [[0, 'brave'], [.8, 'joy']]),
    // 접시를 두 손으로 내민다 (반찬 바꿔 먹기)
    pair_offer_plate: C(1.8, { rotX: '0:.02 .6:.12 1.2:.12 1.8:.02' },
      { R: 'chest(.2,.06,.14)@0 front(.14,-.04,.4)@.6 front(.14,-.04,.4)@1.2 chest(.2,.06,.14)@1.8', L: 'chest(-.02,.06,.14)@0 front(-.02,-.04,.4)@.6 front(-.02,-.04,.4)@1.2 chest(-.02,.06,.14)@1.8' }, [[0, 'smile']]),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);

  /* ---------- 장소별 박자 ---------- */
  const EAT = /eat|slurp|ramen_eat|ramen_soup|ramen_bow|curry_spoon|hot_fan|milk|drink|blow|bowl|bite|snack|lick|soup|belly_pat|chew|gulp/;
  const S = {
    ramen: { face: false, when: EAT, first: { both: 'pair_bow', min: 1.4, say: '잘 먹겠습니다!' }, beats: [
      { both: 'ramen_eat_noodles', min: 2.4, say: '후루룩' },
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'bite', min: 2, face: true, say: ['차슈 하나 줄게', '이거 맛있어'] },
      { both: 'pair_puha', min: 2.2 },
      { b: 'pair_share_feed', a: 'pair_share_take', item: 'bite', back: true, min: 2, face: true, say: '답례야!' },
      { both: 'cheers_toast', min: 2.4 },
    ], note: '나란히 앉아 라멘을 먹어요' },
    meal: { face: true, when: EAT, first: { both: 'pair_bow', min: 1.4, say: '잘 먹겠습니다!' }, beats: [
      { a: 'pair_offer_plate', b: 'pair_share_take', item: 'dish', min: 2, say: '반찬 바꿔 먹자' },
      { both: 'eat_bowl', min: 2.4 },
      { b: 'pair_offer_plate', a: 'pair_share_take', item: 'dish', back: true, min: 2 },
      { both: 'pair_puha', min: 2.2 },
    ], note: '마주 앉아 정식을 먹어요' },
    curry: { face: false, when: EAT, first: { both: 'curry_spoon', min: 2 }, beats: [
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'bite', min: 2, face: true, say: '한 숟갈 먹어 봐' },
      { both: 'hot_fan', min: 2, say: '매워~' },
      { both: 'milk_gulp', min: 2 },
      { both: 'cheers_toast', min: 2.4 },
    ], note: '같이 카레를 먹어요' },
    soba: { face: false, when: EAT, first: { both: 'ramen_eat_noodles', min: 2.4 }, beats: [
      { a: 'pair_sprinkle', b: 'own', min: 1.8, say: '고춧가루 뿌려 줄게' },
      { both: 'ramen_eat_noodles', min: 2.4, say: '후루룩' },
      { both: 'pair_puha', min: 2.2 },
    ], note: '나란히 서서 소바를 먹어요' },
    takoyaki: { face: true, when: EAT, first: { both: 'pair_hot_blow', min: 1.8, say: '앗뜨거' }, beats: [
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'takoyaki', min: 2, say: '아~' },
      { both: 'pair_hot_blow', min: 1.8 },
      { b: 'pair_share_feed', a: 'pair_share_take', item: 'takoyaki', back: true, min: 2 },
      { both: 'hot_fan', min: 2 },
    ], note: '타코야키를 나눠 먹어요' },
    shop: { face: false, first: { both: 'pair_point_view', min: 2.4, say: '저거 사자!' }, beats: [
      { a: 'cart_push', b: 'pair_put_item', min: 2, faceB: true },
      { b: 'cart_push', a: 'pair_put_item', min: 2, faceA: true },
      { both: 'agree_clap', min: 1.8 },
    ], end: { item: 'bag', back: true }, note: '같이 장을 봐요' },
    gacha: { face: true, first: { a: 'own', b: 'pair_pray_watch', min: 2, say: '나와라…!' }, beats: [
      { both: 'jump_joy', min: 1.6, say: '나왔다!' },
      { a: 'pair_pray_watch', b: 'own', min: 2 },
      { both: 'high_five', min: 1.8 },
    ], note: '같이 뽑기를 돌려요' },
    spring: { face: true, when: EAT, first: { a: 'own', b: 'own', min: 1 }, beats: [
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'bite', min: 2, say: '이것 좀 봐!' },
      { both: 'cheers_toast', min: 2.4 },
      { b: 'pair_share_feed', a: 'pair_share_take', item: 'bite', back: true, min: 2 },
    ], note: '같이 받아 먹어요' },
    soup: { face: true, when: /blow_hot|drink|rice_scoop|pour/, first: { a: 'pair_ladle_pour', b: 'own', item: 'cup', min: 2.2, say: '떠 줄게' }, beats: [
      { both: 'pair_blow_cup', min: 2.4 },
      { both: 'cheers_toast', min: 2.4, say: '짠' },
      { b: 'pair_ladle_pour', a: 'own', item: 'cup', back: true, min: 2.2 },
    ], note: '같이 떠 마셔요' },
    cream: { face: true, when: /lick|eat_bowl/, first: { both: 'eat_lick', min: 2 }, beats: [
      { a: 'own', b: 'pair_lick_cream', min: 1.8, say: '한입만!' },
      { b: 'own', a: 'pair_lick_cream', min: 1.8 },
      { both: 'jump_joy', min: 1.6 },
    ], note: '소프트크림을 나눠 먹어요' },
    cook: { face: false, first: { a: 'own', b: 'pair_chop', min: 2.4, say: '내가 썰게' }, beats: [
      { a: 'own', b: 'pair_chop', min: 2.4 },
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'bite', min: 2, face: true, say: '간 좀 봐 줘' },
      { b: 'own', a: 'pair_chop', min: 2.4 },
      { a: 'pair_offer_plate', b: 'pair_share_take', item: 'bowl', min: 2, face: true, say: '다 됐다!' },
      { both: 'eat_bowl', min: 2.4 },
      { both: 'pair_puha', min: 2.2 },
    ], note: '같이 밥을 해 먹어요' },
  };
  Object.assign(P.SCRIPTS, S);

  const isCook = x => (x.gain && (x.gain.hunger || 0) >= 30) && (/cook/.test(x.id) || /밥 (해|지어)/.test(x.name));
  const scriptOf0 = P.scriptOf;
  P.scriptOf = function (x) {
    if (!x) return null;
    const p = x.place, n = x.name || '', id = x.id;
    if (/^ramen(Ro|Yama)\./.test(id)) return S.ramen;
    if (id === 'umaiya.meal' || id === 'umaiya.regular') return S.meal;
    if (id === 'umaCurry.curry') return S.curry;
    if (id === 'soba.soba' || p === 'sobaSpring') return S.soba;
    if (id === 'market.takoyaki' || /^market\.stall_/.test(id)) return S.takoyaki;
    if (p === 'mucha' && /장 보기|장 봐서|도시락|주먹밥/.test(n)) return /장 보기/.test(n) ? S.shop : S.meal;
    if (/뽑기/.test(n) && p === 'machioka') return S.gacha;
    if (p === 'softcream') return S.cream;
    if (p === 'servers' || p === 'misoBank') return S.soup;
    if (/^(rice|sausage|ramune|akafuku)$/.test(p) || id === 'servers.bowl_stand.소면 받아 먹기') return S.spring;
    if (isCook(x) || /안주 만들기/.test(n)) return S.cook;
    return scriptOf0.call(this, x);
  };

  /* ---------- 왕 카레 도전: 같이 온 친구가 옆에서 응원 ---------- */
  const V = root.Village.Village.prototype;
  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    const s = this;
    for (const c of s.chars) {
      const d = c.doing;
      if (!d || d.phase !== 'use' || d.x.id !== 'umaCurry.challenge' || c.extra) continue;
      for (const o of s.chars) {
        if (o === c || o.extra || o.hidden || !o.doing || o.doing.phase !== 'use' || o.doing.x.place !== 'umaCurry' || o.beat) continue;
        if (Math.hypot(o.x - c.x, o.z - c.z) > 6 || !s.persona || s.persona.bond(c, o) < 30) continue;
        const st = d.x.steps[d.step];
        const win = st && /arms_win/.test(st.clip || '');
        o.beat = { clip: win ? 'cheer_together' : 'pair_fan_cheer', until: s.minutes + 1.8, angle: o.angle, step: o.doing.step };
        o.angle = Math.atan2(c.x - o.x, c.z - o.z);
        if (!o.speech && s.random() < 0.3) s.say(o, win ? '해냈다!!' : ['힘내!', '조금만 더!', '할 수 있어!'][Math.floor(s.random() * 3)], 2);
      }
    }
  };

  /* ---------- 집에서 같이 밥 해 먹기: 손님은 식량을 쓰지 않는다 ---------- */
  const guestOf = (s, c, x) => {
    if (!c.pairOf || !isCook(x)) return null;
    const host = s.chars.find(o => o.id === c.pairOf);
    return host && host.doing && host.doing.x.id === x.id ? host : null;
  };
  const L = root.Labor.prototype;
  const blocked0 = L.blocked;
  L.blocked = function (c, x) {
    if (guestOf(this.sim, c, x)) return null;          // 집주인이 부른 손님: 식량이 없어도, 남의 집이어도 된다
    return blocked0.call(this, c, x);
  };
  const start0 = V.start;
  V.start = function (c, x, other, ordered) {
    const host = x && guestOf(this, c, x);
    if (!host) return start0.call(this, c, x, other, ordered);
    // bag.js가 시작할 때 식량을 한 몫 빼므로, 손님 몫은 미리 채워 두었다가 되돌린다 (한 끼를 둘이 나눈다)
    const before = c.groceries || 0;
    c.groceries = before + 1;
    const r = start0.call(this, c, x, other, ordered);
    c.groceries = before;
    c.cookGuest = true;
    return r;
  };
  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    const g = c.cookGuest;
    const before = c.groceries || 0;
    finish0.call(this, c, x);
    if (g && isCook(x)) { c.groceries = before; c.cookGuest = false; }
  };

  // 같이 장을 보면 다 사고 나서 봉투 하나를 친구에게 들어 준다
  const finishShop = L.onFinish;
  L.onFinish = function (c, x) {
    finishShop.call(this, c, x);
    if (!x.groceries || !root.Handoff) return;
    const s = this.sim;
    const mate = s.chars.find(o => o !== c && o.doing && o.doing.x.id === x.id && o.doing.x.place === x.place && Math.hypot(o.x - c.x, o.z - c.z) < 4);
    if (mate && s.persona && s.persona.bond(c, mate) >= 30) root.Handoff.give(s, c, mate, 'bag', { quiet: false });
  };

  root.PairMeals = { SCRIPTS: S, CLIPS };
}(typeof self !== 'undefined' ? self : this));
