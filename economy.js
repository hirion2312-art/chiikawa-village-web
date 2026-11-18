'use strict';

// 치이카와 심즈 — 돈 쓰기·모으기·되팔기 (2026-11-12 이재헌님, docs/plan-economy-society-2026-11-12.md 1차)
//  1) 돈이 오가면 머리 위에 숫자가 뜬다: 쓴 돈 -300원(빨강), 번 돈 +1800원(초록), 저금 🐷+200(분홍)
//  2) 꿈 목표: 주민마다 꿈 하나. 번 돈의 일부를 구리코 저금통에 넣고, 다 모이면 저금통을 깨서 사러 간다
//     하치와레는 카메라를 모아 사고, 사면 마을 곳곳에서 사진을 찍는다
//  3) 자격 응시료: 풀뽑기 검정 300 · 슈퍼 알바이터 1000 (술 자격 500은 원래 있음)
//  4) 돈이 돌아오는 길: 뽑기 캡슐·크레인 인형을 리사이클 숍에 팔기, 낚은 물고기를 무차우마켓에 팔기, 다 쓴 교재를 후루혼야에게 팔기
(function (root) {
  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  const josa = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
  const fx = [];                 // 화면에 띄울 숫자 { id, text, color }
  const pop = (c, text, color) => fx.push({ id: c.id, text, color });

  /* ---------- 2) 꿈 목표 ---------- */
  // [원작 해석] 주민마다 어울리는 소박한 꿈. 값은 [추정]
  const DREAMS = {
    chiikawa: { item: 'futon', name: '푹신한 새 이불', price: 1200, place: 'mucha', steps: ['shelf_look_*', 'checkout_stand'] },
    hachiware: { item: 'camera', name: '카메라', price: 3000, place: 'recycle', steps: ['browse_stand', 'counter_stand'] },
    momonga: { item: 'star_pochette', name: '반짝 별 포셰트', price: 2500, place: 'market', steps: ['clothes.rack_*', 'clothes.browse_front'] },
    kurimanju: { item: 'good_sake', name: '좋은 술 한 병', price: 1500, place: 'mucha', steps: ['shelf_look_*', 'checkout_stand'] },
    shisa: { item: 'ramen_book', name: '라멘 교본', price: 2000, place: 'market', steps: ['books.browse_front', 'books.browse_front'] },
    furuhonya: { item: 'rare_book', name: '희귀 고서', price: 1800, place: 'recycle', steps: ['browse_stand', 'counter_stand'] },
  };
  function dreamOf(c) {
    if (c.extra || c.troupe || c.monster) return null;
    if (!c.dream && DREAMS[c.id]) c.dream = { id: c.id, saved: 0, done: false };
    return c.dream && !c.dream.done ? c.dream : null;
  }
  const dreamDef = c => DREAMS[c.dream && c.dream.id];
  // 꿈으로 산 물건도 소지품 이름표에 나오게 (2026-11-16 점검: 이름 없는 물건 때문에 캐릭터 카드 오류)
  if (root.Shop && root.Shop.ITEMS) for (const d of Object.values(DREAMS)) if (!root.Shop.ITEMS[d.item]) root.Shop.ITEMS[d.item] = { name: d.name, price: d.price };
  for (const [id, d] of Object.entries(DREAMS)) {
    put({ id: `${d.place}.dream_${d.item}`, place: d.place, name: `${josa(d.name, '을', '를')} 사러 가기 (꿈)`, only: [id], hours: [9, 19], gain: { fun: 60 }, dreamBuy: id,
      steps: [S(d.steps[0], 'look', 3, 'tilt_look', null, `드디어 ${d.name}...!`), S(d.steps[1], 'pay', 2.5, 'pay_wait', null, '저금통을 깨서 모은 돈으로'), S(d.steps[1], 'joy', 2, 'jump_joy', null, '꿈을 이뤘다!')] });
  }

  /* ---------- 하치와레의 카메라: 사면 마을 곳곳에서 사진을 찍는다 ---------- */
  if (typeof ANIM_PROP_SHAPES !== 'undefined') {
    ANIM_PROP_SHAPES.camera = {
      label: '카메라',
      make: () => {
        const parts = [[0, 0, 0, 1.4, 0.9, 0.6], [0.35, 0.55, 0, 0.4, 0.2, 0.4]];
        const geos = parts.map(([x, y, z, w, h, d]) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b.toNonIndexed(); });
        const lens = new THREE.CylinderGeometry(0.32, 0.36, 0.5, 18); lens.rotateX(Math.PI / 2); lens.translate(0, 0, 0.5); geos.push(lens.toNonIndexed());
        const pos = []; for (const g of geos) pos.push(...g.attributes.position.array);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
        return g;
      },
    };
  }
  const MA = root.MinorActs;
  if (MA && MA.C && typeof ANIMS !== 'undefined') {
    const shot = MA.C(3.2, { rotX: '0:.02 .6:-.06 2:-.06 2.1:-.02s 2.3:-.06 3.2:.02', rotY: '0:-.1 1:.08 2:.08 3.2:-.1', squash: '0:1 2.05:.96 2.2:1.02b 2.5:1 3.2:1' },
      { R: 'eyes(.14,-.04,.18)@0 eyes(.14,-.04,.18)@3.2', L: 'eyes(-.14,-.04,.18)@0 eyes(-.14,-.04,.18)@3.2' }, [[0, 'normal'], [2.1, 'joy'], [2.4, 'smile']], {
        props: [
          { id: 'cam', shape: 'camera', color: '#3f444a', size: 0.16, attach: 'body', tracks: { px: [[0, 0, 'io'], [3.2, 0, 'io']], py: [[0, 1.42, 'io'], [3.2, 1.42, 'io']], pz: [[0, 0.98, 'io'], [3.2, 0.98, 'io']] }, vis: [[0, 1]] },
          { id: 'flash', shape: 'ball', color: '#fffbe0', size: 0.14, attach: 'body', tracks: { px: [[0, 0.06, 'io'], [3.2, 0.06, 'io']], py: [[0, 1.52, 'io'], [3.2, 1.52, 'io']], pz: [[0, 1.12, 'io'], [3.2, 1.12, 'io']] }, vis: [[0, 0], [2.05, 1], [2.2, 0]] },
        ],
      });
    shot.id = 'camera_shot'; ANIMS.camera_shot = shot;
  }
  for (const [place, sock, what] of [['plaza', 'bench_*|*_look|*_stand', '광장'], ['pond', 'pond_look', '낚시터 연못'], ['shrine', 'lantern_look', '신사 돌등롱'], ['bigPudding', 'sign_look', '거대 푸딩'], ['stage', 'audience_*', '파자마 파티즈 무대']]) {
    put({ id: `${place}.photo_camera`, place, name: `${what} 사진 찍기`, only: ['hachiware'], needCamera: true, hours: [7, 19], gain: { fun: 26 },
      steps: [S(sock, 'aim', 2, 'tilt_look', null, '어디를 찍을까'), S(sock, 'shot', 3.2, 'camera_shot', null, `찰칵! ${what}`), S(sock, 'look', 2, 'point_ooh', null, '잘 나왔다')] });
  }

  /* ---------- 4) 돈이 돌아오는 길 ---------- */
  const junkValue = c => ((c.junk && c.junk.capsule) || 0) * 60 + ((c.junk && c.junk.plush) || 0) * 120;
  put({ id: 'recycle.sell_junk', place: 'recycle', name: '안 쓰는 물건 팔기', hours: [9, 19], gain: { fun: 6 }, sellJunk: true,
    steps: [S('counter_stand', 'give', 2, 'talk_order', null, '캡슐이랑 인형을 내미는 중'), S('counter_stand', 'wait', 2, 'wait_tap', null, '값을 매기는 걸 기다리는 중'), S('counter_stand', 'take', 1.5, 'pay_receive', null, '돈을 받았다')] });
  put({ id: 'mucha.sell_fish', place: 'mucha', name: '낚은 물고기 팔기', hours: [8, 20], gain: { fun: 8 }, sellFish: true,
    steps: [S('checkout_stand', 'give', 2, 'talk_order', null, '싱싱한 물고기 사 주세요'), S('checkout_stand', 'take', 1.5, 'pay_receive', null, '물고기 값 받는 중')] });
  put({ id: 'market.sell_book', place: 'market', name: '다 쓴 교재 팔기', hours: [10, 19], gain: { fun: 6 }, sellBook: true,
    steps: [S('books.browse_front', 'give', 2, 'talk_order', null, '후루혼야에게 교재를 내미는 중'), S('books.browse_front', 'take', 1.5, 'pay_receive', null, '헌책값 받는 중')] });
  // 낚시는 이제 바로 돈이 되지 않고, 물고기를 판다
  if (VO.BY_ID['pond.fish']) delete VO.BY_ID['pond.fish'].earn;
  const owns = (c, i) => root.Shop && root.Shop.owns(c, i);
  const sellableBook = c => (owns(c, 'grass_book') && c.grade === 1) || (owns(c, 'arb_book') && c.arbiter);

  /* ---------- 3) 자격 응시료 ---------- */
  const FEE = { 'exam.take': 300, 'arbiter.take': 1000 };

  /* ---------- 판단 규칙 ---------- */
  if (root.Purpose && root.Purpose.RULES) {
    root.Purpose.RULES.unshift(
      [/\.dream_/, (c, s, x) => { const d = dreamOf(c); return !!d && c.id === x.dreamBuy && d.saved >= DREAMS[c.id].price; }, '저금통이 꽉 찼을 때만 꿈을 사러 간다'],
      [/\.photo_camera$/, c => owns(c, 'camera'), '카메라가 있어야 사진을 찍는다'],
      [/^recycle\.sell_junk$/, c => junkValue(c) >= 240 || (junkValue(c) > 0 && c.money < 400), '팔 물건이 모였을 때만'],
      [/^mucha\.sell_fish$/, c => (c.fish || 0) > 0, '낚은 물고기가 있을 때만'],
      [/^market\.sell_book$/, c => sellableBook(c), '다 쓴 교재가 있을 때만'],
    );
  }
  const L = root.Labor && root.Labor.prototype;
  if (L) {
    const score0 = L.scoreBonus;
    L.scoreBonus = function (c, x) {
      let v = score0.call(this, c, x);
      if (x.dreamBuy) v += 120;
      if (x.sellFish) v += 20 + (c.fish || 0) * 6;
      if (x.sellJunk) v += 20 + junkValue(c) / 40;
      if (x.sellBook) v += 25;
      return v;
    };
    const fin0 = L.onFinish;
    L.onFinish = function (c, x) {
      const s = this.sim;
      fin0.apply(this, arguments);
      // 꿈 이루기: 저금통을 깨서 산다
      if (x.dreamBuy && c.dream && !c.dream.done) {
        const d = DREAMS[c.id];
        c.dream.saved -= d.price; c.money += Math.max(0, c.dream.saved); c.dream.saved = 0; c.dream.done = true;
        root.Shop && root.Shop.give(c, d.item);
        if (d.item === 'star_pochette') c.pochette = { kind: 'star', color: '#f3d27a' };
        pop(c, `🐷 ${d.name}!`, '#e07f9c');
        s.note(`🌟 ${c.name}: 저금통을 깨서 ${josa(d.name, '을', '를')} 샀어요! 꿈을 이뤘어요`);
      }
      // 되팔기
      if (x.sellJunk && c.junk) {
        const v = junkValue(c); c.money += v; c.junk = { capsule: 0, plush: 0 };
        s.note(`${c.name}: 안 쓰는 캡슐·인형을 ${v}원에 팔았어요`);
      }
      if (x.sellFish && c.fish) { const v = c.fish * 120; c.money += v; s.note(`${c.name}: 물고기 ${c.fish}마리를 ${v}원에 팔았어요`); c.fish = 0; }
      if (x.sellBook) {
        const v = (owns(c, 'grass_book') && c.grade === 1 ? 150 : 0) + (owns(c, 'arb_book') && c.arbiter ? 350 : 0);
        c.owned = (c.owned || []).filter(i => !((i === 'grass_book' && c.grade === 1) || (i === 'arb_book' && c.arbiter)));
        c.money += v;
        const fu = s.chars.find(o => o.id === 'furuhonya'); if (fu) fu.money += Math.round(v * 0.2);
        s.note(`${c.name}: 다 쓴 교재를 후루혼야에게 ${v}원에 팔았어요`);
      }
      // 모으는 물건: 캡슐 뽑기·크레인 인형·낚은 물고기
      if (x.id === 'arcade.gacha' || x.id === 'machioka.gumball') (c.junk || (c.junk = { capsule: 0, plush: 0 })).capsule += 1;
      if (x.id === 'arcade.crane' && s.random() < 0.6) (c.junk || (c.junk = { capsule: 0, plush: 0 })).plush += 1;
      if (x.id === 'pond.fish') c.fish = (c.fish || 0) + 1 + (s.random() < 0.25 ? 1 : 0);
      // 응시료
      if (FEE[x.id] && !c.extra) { const f = Math.min(c.money, FEE[x.id]); c.money -= f; s.note(`${c.name}: 응시료 ${f}원을 냈어요`); }
    };
    const save0 = L.save;
    L.save = function (c) { const r = save0.call(this, c); return { ...r, dream: c.dream, junk: c.junk, fish: c.fish }; };
    const load0 = L.load;
    L.load = function (c, r) {
      load0.call(this, c, r);
      if (r && r.dream && DREAMS[r.dream.id]) c.dream = { id: r.dream.id, saved: +r.dream.saved || 0, done: !!r.dream.done };
      if (r && r.junk) c.junk = { capsule: +r.junk.capsule || 0, plush: +r.junk.plush || 0 };
      if (r && r.fish) c.fish = +r.fish || 0;
    };
  }

  /* ---------- 저금: 돈이 들어올 때마다 일부를 저금통에 ---------- */
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      for (const c of this.chars) {
        if (c.monster || c.gone) continue;
        const last = c._money0;
        c._money0 = c.money;
        if (last === undefined || c.money === last) continue;
        const delta = c.money - last;
        if (c.extra && !c.troupe) { if (Math.abs(delta) >= 100) pop(c, `${delta > 0 ? '+' : ''}${delta}원`, delta > 0 ? '#4f9a5a' : '#d9534f'); continue; }
        pop(c, `${delta > 0 ? '+' : ''}${delta.toLocaleString()}원`, delta > 0 ? '#4f9a5a' : '#d9534f');
        // 번 돈의 일부를 저금 (성실할수록 많이). 생활비 600은 남긴다
        const d = dreamOf(c);
        if (delta >= 150 && d) {
          const rate = 0.25 + (c.traits ? c.traits.diligent * 0.3 : 0.1);
          const room = Math.max(0, c.money - 600);
          const put = Math.min(room, Math.round(delta * rate / 10) * 10, DREAMS[c.id].price - d.saved);
          if (put > 0) {
            c.money -= put; d.saved += put; c._money0 = c.money;
            pop(c, `🐷 +${put} (${d.saved}/${DREAMS[c.id].price})`, '#e07f9c');
            if (d.saved >= DREAMS[c.id].price) this.note(`🐷 ${c.name}: 저금통이 꽉 찼어요! 이제 ${josa(DREAMS[c.id].name, '을', '를')} 사러 갈 수 있어요`);
          }
        }
      }
    };
  }
  // 카메라가 없으면 사진 찍기는 막힌다 (Purpose가 고르지 않게 하지만, 시킨 일도 막는다)
  if (L) {
    const blocked0 = L.blocked;
    L.blocked = function (c, x) {
      if (x.needCamera && !owns(c, 'camera')) return '카메라가 없어요';
      if (x.dreamBuy) { const d = dreamOf(c); if (!d || d.saved < DREAMS[c.id].price) return `저금통이 아직 덜 찼어요`; }
      return blocked0.call(this, c, x);
    };
  }

  /* ---------- 1) 머리 위 숫자 ---------- */
  function sprite(text, color) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d');
    g.font = '64px Jua, "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = '#fffaf0'; g.lineJoin = 'round'; g.strokeText(text, 256, 64);
    g.fillStyle = color; g.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    m.scale.set(2.0, 0.5, 1); m.renderOrder = 999;
    return m;
  }
  const live = [];
  function hook() {
    const G = root.game;
    if (!G || !G.renderer || !G.actors || !G.scene) { requestAnimationFrame(hook); return; }
    const render0 = G.renderer.render.bind(G.renderer);
    let last = performance.now();
    G.renderer.render = function (scene, camera) {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      while (fx.length) {
        const f = fx.shift();
        const a = G.actors.find(q => q.c.id === f.id);
        if (!a || a.c.hidden) continue;
        const stack = live.filter(l => l.a === a).length;
        const s = sprite(f.text, f.color);
        G.scene.add(s);
        live.push({ a, s, t: 0, y0: (a.height || 1.9) + 0.5 + stack * 0.42 });
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const l = live[i]; l.t += dt;
        const r = l.a.built.root.position;
        l.s.position.set(r.x, r.y + l.y0 + l.t * 0.35, r.z);
        l.s.material.opacity = l.t < 1.4 ? 1 : Math.max(0, 1 - (l.t - 1.4) / 0.6);
        if (l.t > 2) { G.scene.remove(l.s); l.s.material.map.dispose(); l.s.material.dispose(); live.splice(i, 1); }
      }
      return render0(scene, camera);
    };
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(hook);

  root.Economy = { DREAMS, dreamOf, junkValue, pop };
}(typeof self !== 'undefined' ? self : this));
