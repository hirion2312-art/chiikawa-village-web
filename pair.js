'use strict';

// 치이카와 심즈 — 같이 하기 판 (docs/together-plan-2026-11-11.md 1차)
// 친구끼리 같은 곳에서 같은 일을 하면 "판"이 된다. 판은 장소마다 정해진 박자 순서대로 둘(셋)이 맞춰 움직인다.
//  - 먹을 때: 잘 먹겠습니다 → 한입 먹여 주기(젓가락 한입이 실제로 건너감) → 동시에 푸하 → 짠
//  - 찻집: 후후 불기 → 짠 → 과자 나눠 주기 → 같이 몸 흔들기
//  - 벤치: 같이 가리키며 구경 → 어깨 기대기 → 맞장구
//  - 온천: 하아~ → 등 밀어 주기(교대) → 물 튀기기
//  - 모닥불: 마시멜로 구워 건네기 → 손 쬐기 → 같이 흔들
// 부르기(invite.js)로 같이 온 친구는 앞사람 옆에 나란히 걷고, 앞사람 바로 옆자리를 잡는다.
(function (root) {
  const { C } = root.MinorActs;
  const hold = (a, dur) => `${a}@0 ${a}@${dur}`;
  const REST = 'hip(-.2,.1,0)';

  /* ---------- 2인 동작 묶음 ---------- */
  const CLIPS = {
    // 두 손 모아 "잘 먹겠습니다" 꾸벅
    pair_bow: C(1.4, { rotX: '0:0 .4:.22 .9:.22 1.4:0', posY: '0:0 1.4:0' },
      { R: 'chest(.24,.1,.1)@0 chest(.04,.12,.22)@.3 chest(.04,.12,.22)@1 chest(.24,.1,.1)@1.4', L: 'chest(.24,.1,.1)@0 chest(.04,.12,.22)@.3 chest(.04,.12,.22)@1 chest(.24,.1,.1)@1.4' }, [[0, 'smile'], [.4, 'joy']]),
    // 젓가락으로 집어 친구 입 앞으로 쭉 내밀었다가 거둔다
    pair_share_feed: C(2, { rotX: '0:.02 .6:.14 1.3:.14 2:.02', posZ: '0:0 .6:.08 1.3:.08 2:0' },
      { R: 'chest(.2,.1,.18)@0 front(.12,.06,.42)@.6 front(.1,.08,.44)@1.3 chest(.2,.1,.18)@2', L: 'chest(.18,.0,.14)@0 chest(.18,.0,.14)@2' }, [[0, 'smile'], [.6, 'joy']]),
    // 몸을 내밀어 덥석 받아먹고 볼 빵빵 우물우물
    pair_share_take: C(2, { rotX: '0:0 .6:.2 .9:.08 2:0', posZ: '0:0 .6:.1 .9:0 2:0', squash: '0:1 .9:1 1.1:1.06 1.3:.96 1.5:1.06 1.7:.97 2:1' },
      { R: 'chest(.24,.1,.1)@0 belly(.16,.04,.1)@1 belly(.16,.04,.1)@2', L: hold(REST, 2) }, [[0, 'normal'], [.6, 'surprised'], [.9, 'joy']]),
    // 그릇을 두 손으로 들어 국물을 들이켜고 "푸하"
    pair_puha: C(2.2, { rotX: '0:.04 .5:-.1 1.2:-.3 1.5:-.3 1.8:.08 2.2:0', posY: '0:0 1.8:.06 2:0 2.2:0', squash: '0:1 1.7:1 1.85:1.07 2.2:1' },
      { R: 'front(.16,0,.2)@0 mouth(.1,-.04,.18)@.6 mouth(.08,-.08,.16)@1.5 front(.16,0,.2)@2.2', L: 'front(.16,0,.2)@0 mouth(.1,-.04,.18)@.6 mouth(.08,-.08,.16)@1.5 front(.16,0,.2)@2.2' }, [[0, 'normal'], [1.7, 'joy']]),
    // 찻잔을 입 앞에 들고 후후 분다
    pair_blow_cup: C(2.4, { rotX: '0:.06 2.4:.06', squash: '0:1 .4:.97 .6:1.02 1.2:.97 1.4:1.02 2.4:1' },
      { R: hold('mouth(.1,.04,.22)', 2.4), L: hold('mouth(.12,.0,.2)', 2.4) }, [[0, 'smile']]),
    // 나란히 앉아 좌우로 같이 흔들흔들
    pair_sway: C(3, { rotZ: '0:.1 1.5:-.1 3:.1', posY: '0:0 .75:.02 1.5:0 2.25:.02 3:0' },
      { R: hold('belly(.18,.04,.1)', 3), L: hold('belly(.18,.04,.1)', 3) }, [[0, 'smile']]),
    // 저기 봐! 같은 곳을 가리키며 구경
    pair_point_view: C(2.4, { rotX: '0:0 .5:-.12 2.4:-.06', rotY: '0:0 .5:.18 2.4:.12', posY: '0:0 .5:.05 .8:0 2.4:0' },
      { R: 'chest(.24,.1,.1)@0 high(.3,-.2,.34)@.5 high(.3,-.2,.36)@2 chest(.24,.1,.1)@2.4', L: hold(REST, 2.4) }, [[0, 'normal'], [.5, 'joy']]),
    // 어깨에 살짝 기대어 꾸벅 (왼쪽/오른쪽)
    pair_lean_l: C(4, { rotZ: '0:0 1:.2 3:.2 4:0', rotX: '0:0 1.5:.08 2.5:.12 3:.06 4:0' },
      { R: hold('belly(.16,.04,.1)', 4), L: hold('belly(.16,.04,.1)', 4) }, [[0, 'smile'], [1.5, 'normal'], [3, 'smile']]),
    pair_lean_r: C(4, { rotZ: '0:0 1:-.2 3:-.2 4:0', rotX: '0:0 1.5:.08 2.5:.12 3:.06 4:0' },
      { R: hold('belly(.16,.04,.1)', 4), L: hold('belly(.16,.04,.1)', 4) }, [[0, 'smile'], [1.5, 'normal'], [3, 'smile']]),
    // 물에 몸을 담그고 "하아~" 늘어진다
    pair_sigh: C(3, { rotX: '0:0 1:-.16 3:-.12', posY: '0:0 1:-.06 3:-.05', squash: '0:1 1:.94 3:.95' },
      { R: hold('belly(.2,.0,.1)', 3), L: hold('belly(.2,.0,.1)', 3) }, [[0, 'normal'], [.8, 'joy'], [2, 'normal']]),
    // 친구 등을 수건으로 쓱싹쓱싹
    pair_back_wash: C(1.6, { rotX: '0:.12 1.6:.12', posZ: '0:.04 1.6:.04' },
      { R: 'front(.1,.08,.36)@0 front(.2,.02,.38)@.4 front(.1,.08,.36)@.8 front(.2,.02,.38)@1.2 front(.1,.08,.36)@1.6', L: 'front(-.06,.08,.36)@0 front(.04,.02,.38)@.4 front(-.06,.08,.36)@.8 front(.04,.02,.38)@1.2 front(-.06,.08,.36)@1.6' }, [[0, 'smile']]),
    // 등을 맡기고 기분 좋게 흔들
    pair_relax: C(1.6, { rotX: '0:-.06 1.6:-.06', rotZ: '0:.04 .4:-.04 .8:.04 1.2:-.04 1.6:.04' },
      { R: hold('belly(.18,.02,.1)', 1.6), L: hold('belly(.18,.02,.1)', 1.6) }, [[0, 'joy']]),
    // 두 손으로 물을 떠서 휙 (장난)
    pair_splash: C(1.6, { rotX: '0:.2 .5:.24 .8:-.1 1.6:0', posY: '0:-.04 .8:.04 1.6:0' },
      { R: 'front(.16,-.2,.3)@0 front(.12,-.24,.34)@.5 high(.2,-.1,.3)@.8 chest(.24,.1,.1)@1.6', L: 'front(.0,-.2,.3)@0 front(.04,-.24,.34)@.5 high(.0,-.1,.3)@.8 chest(.24,.1,.1)@1.6' }, [[0, 'normal'], [.8, 'joy']]),
    // 물 맞고 움찔, 웃음
    pair_splashed: C(1.6, { rotX: '0:0 .8:0 .9:-.18 1.6:0', squash: '0:1 .85:1 .95:.92 1.2:1.04 1.6:1' },
      { R: 'chest(.24,.1,.1)@0 chest(.24,.1,.1)@.85 high(.16,-.06,.2)@1 chest(.24,.1,.1)@1.6', L: 'chest(.24,.1,.1)@0 chest(.24,.1,.1)@.85 high(.0,-.06,.2)@1 chest(.24,.1,.1)@1.6' }, [[0, 'smile'], [.9, 'surprised'], [1.2, 'joy']]),
    // 모닥불에 두 손 쬐기
    pair_warm_hands: C(2, { rotX: '0:.1 2:.1', posZ: '0:.03 2:.03' },
      { R: 'front(.1,0,.36)@0 front(.14,.02,.38)@1 front(.1,0,.36)@2', L: 'front(-.06,0,.36)@0 front(-.1,.02,.38)@1 front(-.06,0,.36)@2' }, [[0, 'smile']]),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);

  /* ---------- 장소별 박자 순서 ---------- */
  // a: 판을 이끄는 사람(먼저 온 쪽), b: 나머지. both: 다 같이. item: 손에서 손으로 건너가는 물건. face: 서로 마주 보는지
  const SCRIPTS = {
    eat: { face: true, first: { both: 'pair_bow', min: 1.4, say: '잘 먹겠습니다!' }, beats: [
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'bite', min: 2, say: ['아~ 해', '이거 먹어 봐'] },
      { both: 'pair_puha', min: 2.2 },
      { a: 'pair_share_take', b: 'pair_share_feed', item: 'bite', back: true, min: 2, say: ['답례야', '나도!'] },
      { both: 'cheers_toast', min: 2.4 },
    ], note: '같이 먹어요' },
    tea: { face: true, first: { both: 'pair_blow_cup', min: 2.4 }, beats: [
      { both: 'cheers_toast', min: 2.4, say: '짠' },
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'snack', min: 2 },
      { both: 'pair_sway', min: 3 },
      { both: 'pair_blow_cup', min: 2.4 },
    ], note: '같이 차를 마셔요' },
    bench: { face: false, first: { both: 'pair_point_view', min: 2.4, say: '저기 봐!' }, beats: [
      { a: 'lean', b: 'pair_sway', min: 4 },
      { both: 'agree_clap', min: 1.8 },
      { both: 'pair_sway', min: 3 },
      { b: 'lean', a: 'pair_sway', min: 4 },
    ], note: '나란히 앉아 쉬어요' },
    bath: { face: false, first: { both: 'pair_sigh', min: 3, say: '하아~' }, beats: [
      { a: 'pair_back_wash', b: 'pair_relax', item: 'towel', min: 3.2, faceB: true },
      { a: 'pair_splash', b: 'pair_splashed', min: 1.6, face: true },
      { b: 'pair_back_wash', a: 'pair_relax', item: 'towel', back: true, min: 3.2, faceA: true },
      { both: 'pair_sigh', min: 3 },
    ], note: '같이 온천에 몸을 담가요' },
    fire: { face: false, first: { both: 'pair_warm_hands', min: 2 }, beats: [
      { a: 'pair_share_feed', b: 'pair_share_take', item: 'mallow', min: 2, face: true, say: '다 구워졌어!' },
      { both: 'pair_sway', min: 3 },
      { both: 'pair_warm_hands', min: 2 },
      { b: 'pair_share_feed', a: 'pair_share_take', item: 'mallow', back: true, min: 2, face: true },
    ], note: '모닥불 앞에 같이 앉았어요' },
  };
  const isEat = x => (x.gain && (x.gain.hunger || 0) >= 15) && !/bag_eat|home\.|Home\.|cook/.test(x.id);
  function scriptOf(x) {
    if (!x) return null;
    const p = x.place, n = x.name || '';
    if (p === 'kissa' && /차|마시/.test(n)) return SCRIPTS.tea;
    if (p === 'onsen' && /담그|거품/.test(n)) return SCRIPTS.bath;
    if (p === 'hiroma' && /모닥불|둘러앉/.test(n)) return SCRIPTS.fire;
    if (/벤치/.test(n)) return SCRIPTS.bench;
    if (isEat(x)) return SCRIPTS.eat;
    return null;
  }

  /* ---------- 판 돌리기 ---------- */
  const face = (c, o) => { c.angle = Math.atan2(o.x - c.x, o.z - c.z); };
  // 옆 친구 쪽으로 기대기: 친구가 왼쪽이면 왼쪽으로
  const leanClip = (c, o) => {
    const fx = Math.sin(c.angle), fz = Math.cos(c.angle);
    return fx * (o.z - c.z) - fz * (o.x - c.x) > 0 ? 'pair_lean_l' : 'pair_lean_r';
  };
  const pick = v => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);

  function run(s, g, P, beat) {
    const [a, ...bs] = P.order.map(id => g.list.find(c => c.id === id)).filter(Boolean);
    if (!a || !bs.length) return;
    const b0 = bs.slice().sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
    // 손이 닿지 않을 만큼 떨어져 앉았으면 건네기 대신 멀리서 잔을 들어 보인다
    if (Math.hypot(a.x - b0.x, a.z - b0.z) > 3.2 && (beat.item || /lean|wash|splash/.test(beat.a + beat.b))) beat = { both: 'cheers_toast', min: 2.4, face: true };
    const until = s.minutes + beat.min;
    const set = (c, clip, partner, turn) => {
      if (!c.doing || c.doing.phase !== 'use' || c.reactLeft > 0) return;
      if (!clip || clip === 'own') { if (turn) face(c, partner); return; }   // own: 그 단계 원래 동작을 그대로
      const id = clip === 'lean' ? leanClip(c, partner) : clip;
      c.beat = { clip: id, until, angle: c.angle, step: c.doing.step };
      if (turn) face(c, partner);
    };
    const sc = P.script;
    const fa = beat.face !== undefined ? beat.face : beat.faceA || sc.face;
    const fb = beat.face !== undefined ? beat.face : beat.faceB || sc.face;
    set(a, beat.both || beat.a, b0, fa);
    for (const b of bs) set(b, beat.both || beat.b, a, fb);
    if (beat.item && root.Handoff) {
      const [from, to] = beat.back ? [b0, a] : [a, b0];
      root.Handoff.give(s, from, to, beat.item, { quiet: true, delay: 0.3, dur: 0.7 });
    }
    if (beat.say) s.say(beat.back ? b0 : a, pick(beat.say), 2);
    s.pairBeats = (s.pairBeats || 0) + 1;
  }

  function tick(s) {
    const T = root.Together;
    if (!T) return;
    const now = s.minutes;
    s.pairs = s.pairs || {};
    const live = new Set();
    for (const g of T.groupsOf(s)) {
      const script = root.Pair.scriptOf(g.x);
      if (!script) continue;
      live.add(g.key);
      // together.js의 아무 짝 동작은 쉬게 하고 이 판이 박자를 맡는다
      if (s.togetherBeats && s.togetherBeats[g.key]) s.togetherBeats[g.key].next = now + 30;
      let P = s.pairs[g.key];
      if (!P) {
        // 먼저 와 있던 사람이 이끈다
        const order = g.list.slice().sort((p, q) => (p.pairOf ? 1 : 0) - (q.pairOf ? 1 : 0) || (p.extra ? 1 : 0) - (q.extra ? 1 : 0) || (p.id < q.id ? -1 : 1)).map(c => c.id);
        P = s.pairs[g.key] = { script, order, i: -1, next: now + 0.6, made: now };
        const mains = g.list.filter(c => !c.extra);
        // 같은 짝이 같은 곳에서 잠깐 끊겼다 이어진 것은 다시 알리지 않는다
        const who = mains.map(c => c.id).sort().join('+') + '@' + g.x.place;
        s.pairSaid = s.pairSaid || {};
        const fresh = !(s.pairSaid[who] > now - 90);
        s.pairSaid[who] = now;
        if (mains.length >= 2 && fresh) s.note(`👫 ${mains.map(c => c.name).join('와 ')}: ${script.note}`);
      }
      P.lost = 0;
      for (const c of g.list) if (!P.order.includes(c.id)) P.order.push(c.id);
      if (now < P.next) continue;
      // 그 판의 박자는 정해진 단계(먹는 단계 등)에서만: 표 사기·주문 중에는 기다린다
      if (script.when && !g.list.every(c => { const st = c.doing.x.steps[c.doing.step]; return st && script.when.test(st.clip || st.act || ''); })) continue;
      const beat = P.i < 0 ? script.first : script.beats[P.i % script.beats.length];
      run(s, g, P, beat);
      P.i += 1;
      // 박자 사이에는 원래 동작(먹기·마시기)을 잠깐 한다
      P.next = now + beat.min + 0.8 + s.random() * 1.6;
    }
    for (const k of Object.keys(s.pairs)) if (!live.has(k)) {
      const P = s.pairs[k];
      // 단계가 바뀌는 사이 잠깐 끊긴 것은 3분 기다려 준다
      if (!P.lost) P.lost = now;
      if (now - P.lost < 3) continue;
      // 끝난 판: 친해진다
      if (s.persona && P.order.length >= 2 && P.i >= 2) {
        const cs = P.order.map(id => s.chars.find(c => c.id === id)).filter(Boolean);
        cs.forEach(p => cs.forEach(q => { if (p.id < q.id) s.persona.grow(p, q, 2); }));
      }
      delete s.pairs[k];
    }
  }

  const V = root.Village.Village.prototype;
  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    tick(this);
  };

  /* ---------- 같이 온 친구: 나란히 걷기, 옆자리 잡기 ---------- */
  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    if (c.pairOf && !c.doing && !c.orders.length) c.pairOf = null;
    const L = c.followLead && this.chars.find(o => o.id === c.followLead);
    const same = L && c.doing && L.doing && c.doing.x && L.doing.x && c.doing.x.id === L.doing.x.id;
    if (!same) { if (c.followLead && ((!c.doing && !c.orders.length) || (L && !L.doing) || !L)) c.followLead = null; return tickChar0.call(this, c, dt); }
    // 앞사람이 걷는 동안은 그 옆 0.9m에 붙어 걷는다. 앞사람이 도착하면 자기 자리로 몇 걸음
    if (L.walking && c.doing.phase === 'walk' && !c.hidden && !L.hidden) {
      const a = L.angle || 0;
      const side = { x: L.x + Math.cos(a) * 1.4 - Math.sin(a) * 0.2, z: L.z - Math.sin(a) * 1.4 - Math.cos(a) * 0.2 };
      const p = (this.snap && this.snap(side)) || side;
      if (Math.hypot(p.x - L.x, p.z - L.z) < 3) {
        c.x = p.x; c.z = p.z; c.angle = a; c.walking = true; c.act = 'walk';
        this.clearRoute(c);
        // 걷다가 가끔 서로 보며 말한다
        if (!c.speech && this.random() < dt * 0.02) this.say(c, ['배고프다~', '뭐 먹을까', '신난다', '같이 오니까 좋다'][Math.floor(this.random() * 4)], 2);
        return;
      }
    }
    if (!L.walking) c.followLead = null;
    return tickChar0.call(this, c, dt);
  };
  // 같이 온 친구의 자리: 앞사람이 잡은 자리 바로 옆(1.6m 안)의 빈자리.
  // 식탁 자리인데 옆에 빈자리가 없으면 식탁 맞은편에 의자를 하나 더 놓고 마주 앉는다 (의자는 frame()이 그린다)
  const NEAR = 2.6;
  const TABLE = /table_sit|tea_sit|eat_sit|counter_sit|study_sit|cook_stand|eat_stand|eat_bench|shade_sit/;
  const ACROSS = 1.6;
  const noSeat = new Set();            // 맞은편에 의자를 놓을 수 없는 자리
  function seatFree(s, c, sk) {
    const who = s.claims.get(`${sk.place}/${sk.name}`);
    if (who && who !== c.id) return false;
    return !s.chars.some(o => o !== c && ((o.claimSpot && Math.hypot(o.claimSpot.x - sk.x, o.claimSpot.z - sk.z) < 0.7) || (!o.hidden && !o.walking && Math.hypot(o.x - sk.x, o.z - sk.z) < 0.7)));
  }
  function acrossSeat(s, place, so) {
    if (!so || so.fx === undefined || !TABLE.test(so.name) || /_pair$/.test(so.name)) return null;
    const list = s.sockets[place];
    const name = `${so.name}_pair`;
    if (list[name]) return list[name];
    const key = place + '/' + name;
    if (noSeat.has(key)) return null;
    const dx = so.fx - so.x, dz = so.fz - so.z, d = Math.hypot(dx, dz) || 1;
    const ux = dx / d, uz = dz / d;           // 식탁 쪽
    const px = uz, pz = -ux;                  // 옆쪽
    // 맞은편(가까운 것부터) → 식탁 모서리 옆 → 바로 옆 순서로, 가구 없는 빈칸을 찾는다
    const tries = [];
    if (!/counter_sit|cook_stand|eat_stand/.test(so.name)) for (const k of [1.6, 1.9, 2.2, 2.5]) tries.push({ x: so.x + ux * k, z: so.z + uz * k, fx: so.x, fz: so.z, across: true });
    for (const sd of [1, -1]) {
      const cx = so.x + ux * Math.min(d, 1.1) * 0.5, cz = so.z + uz * Math.min(d, 1.1) * 0.5;   // 식탁 가운데쯤
      tries.push({ x: cx + px * sd * 1.3, z: cz + pz * sd * 1.3, fx: cx, fz: cz });
      tries.unshift({ x: so.x + px * sd * 1.55, z: so.z + pz * sd * 1.55, fx: so.fx + px * sd * 1.55, fz: so.fz + pz * sd * 1.55 });
    }
    let pick = null;
    for (const t of tries) {
      if (Object.values(list).some(k => k && Math.hypot(k.x - t.x, k.z - t.z) < 1.3)) continue;
      const ap = s.nav ? s.nav.approach({ x: t.x, z: t.z }) : { x: t.x, z: t.z, seatIn: false };
      if (!ap || ap.seatIn) continue;
      // 몸이 들어갈 만큼 사방이 비어 있어야 한다 (가구·기계에 몸이 묻히지 않게)
      if (s.nav && [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([ox, oz]) => { const q = s.nav.approach({ x: t.x + ox, z: t.z + oz }); return !q || q.seatIn; })) continue;
      pick = { ...t, ap };
      break;
    }
    if (!pick) { noSeat.add(key); return null; }
    const { x, z, ap } = pick;
    const sk = { ...so, name, x, z, fx: pick.fx, fz: pick.fz, ax: ap.x, az: ap.z, seatIn: false, reach: true, pairSeat: true, of: so.name };
    list[name] = sk;
    return sk;
  }
  const free0 = V.freeSocket;
  V.freeSocket = function (c, place, pattern, shared, avoid) {
    const L = (c.followLead || c.pairOf) && this.chars.find(o => o.id === (c.followLead || c.pairOf));
    const ld = L && L.doing;
    if (!shared && L && L.claimSpot && ld && ld.x && ld.x.place === place) {
      const proxy = Object.create(c);
      proxy.x = L.claimSpot.x;
      proxy.z = L.claimSpot.z;
      const r = free0.call(this, proxy, place, pattern, shared, avoid);
      if (r && Math.hypot(r.x - L.claimSpot.x, r.z - L.claimSpot.z) < NEAR) return r;
      // 앞사람 자리가 지금 찾는 자리 종류일 때만 (표 자판기를 찾는데 식탁 옆 의자를 주지 않게)
      const fits = ld.socket && this.candidates(place, pattern).some(k => k.name === ld.socket.name || k.name === ld.socket.of);
      const pair = fits ? acrossSeat(this, place, ld.socket) : null;
      if (pair && seatFree(this, c, pair)) return pair;
      if (r) return r;
    }
    return free0.call(this, c, place, pattern, shared, avoid);
  };
  // 맞은편 의자 그리기: 원래 자리 의자와 같은 높이의 나무 의자
  const chairs = new Map();
  function frame(sim, scene) {
    for (const [place, list] of Object.entries(sim.sockets)) {
      for (const sk of Object.values(list)) {
        if (!sk || !sk.pairSeat || chairs.has(place + sk.name) || !/_sit|bench/.test(sk.name)) continue;
        const floor = sim.world && sim.world.floorAt ? sim.world.floorAt(sk.x, sk.z) : 0;
        const top = Math.max(floor + 0.2, sk.h || floor + 0.45);
        const g = new THREE.Group();
        const wood = new THREE.MeshToonMaterial({ color: '#a8754e' }), dark = new THREE.MeshToonMaterial({ color: '#7d5a44' });
        const ink = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
        const box = (w, h, d, x, y, z, m) => { const geo = new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); const k = new THREE.Mesh(geo, ink); k.scale.setScalar(1.06); o.add(k); g.add(o); };
        const h = top - floor;
        box(0.56, 0.07, 0.54, 0, h - 0.035, 0, wood);
        box(0.56, 0.42, 0.06, 0, h + 0.2, -0.27, wood);
        for (const [x, z] of [[-0.23, -0.22], [0.23, -0.22], [-0.23, 0.22], [0.23, 0.22]]) box(0.05, h - 0.07, 0.05, x, (h - 0.07) / 2, z, dark);
        g.position.set(sk.x, floor, sk.z);
        // 등받이는 식탁 반대쪽
        g.rotation.y = Math.atan2(sk.fx - sk.x, sk.fz - sk.z);
        scene.add(g);
        chairs.set(place + sk.name, g);
      }
    }
  }

  // 같이 온 친구가 첫 자리(표 자판기·주문 창구처럼 하나뿐인 자리)를 못 잡으면 포기하지 않고 앞사람 곁에서 기다렸다 이어서 한다
  const start1 = V.start;
  V.start = function (c, x, other, ordered) {
    const r = start1.call(this, c, x, other, ordered);
    const L = c.pairOf && this.chars.find(o => o.id === c.pairOf);
    if (c.doing || !L || !L.doing || !L.doing.x || L.doing.x.id !== (x && x.id)) { if (c.doing) c.pairWait = 0; return r; }
    c.pairWait = (c.pairWait || 0) + 1;
    if (c.pairWait > 40) { c.pairWait = 0; c.pairOf = null; return r; }
    c.orders = [{ x }];
    c.idleLeft = 1;
    c.waitNear = L.id;
    return r;
  };
  // 기다리는 동안은 앞사람 1.6m 곁에 서서 그쪽을 본다
  const tickChar2 = V.tickChar;
  V.tickChar = function (c, dt) {
    if (c.waitNear && !c.doing && c.orders.length) {
      const L = this.chars.find(o => o.id === c.waitNear);
      if (L && !L.hidden) {
        const d = Math.hypot(L.x - c.x, L.z - c.z);
        if (d > 2.2) {
          const t = { x: L.x + (c.x - L.x) / d * 1.6, z: L.z + (c.z - L.z) / d * 1.6 };
          const r = this.walk(c, (this.snap && this.snap(t)) || t, dt);
          if (r === null) this.clearRoute(c);
        } else { c.walking = false; c.angle = Math.atan2(L.x - c.x, L.z - c.z); }
      }
    } else if (c.waitNear && c.doing) c.waitNear = null;
    return tickChar2.call(this, c, dt);
  };

  root.Pair = { CLIPS, SCRIPTS, scriptOf, tick, frame, acrossSeat };
}(typeof self !== 'undefined' ? self : this));
