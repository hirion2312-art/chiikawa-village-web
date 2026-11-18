'use strict';

// 치이카와 심즈 — 집 안 살림 사기·배달 (2026-11-12 이재헌님 승인 시안, docs/plan-society-bank-housing-2026-11-12.md 6번)
// [원작] 치이카와·하치와레가 덮는 뭉게뭉게한 이불, 치이카와가 안고 자는 곰 인형, 하치와레 동굴의 분홍 동그란 밥상과 등불.
// - 포셰트 노점(파자마·인형을 파는 요로이씨): 뭉게 이불·곰 인형 / 리사이클 숍: 분홍 밥상·등불
// - 큰 것(이불·밥상)은 근처의 엑스트라가 상자째 안고 집 앞까지 배달한다. 작은 것(곰·등불)은 산 사람이 직접 안고 간다
// - 집에 닿으면 그 집 안에 놓인다: 이불은 침대 위 매트를 바꾸고, 밥상은 받침 탁자를 바꾼다(방석 둘 포함)
// - 쓰임새: 뭉게 이불·곰 인형이 있는 집에서 자고 나면 기분이 좋다. 밥상이 있으면 집들이·집에서 먹기가 더 즐겁다
(function (root) {
  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const josa = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
  const ITEMS = {
    futon: { name: '뭉게 이불', price: 900, big: true, place: 'market', steps: ['clothes.rack_*', 'clothes.browse_front'] },
    bear: { name: '곰 인형', price: 400, big: false, place: 'market', steps: ['clothes.rack_*', 'clothes.browse_front'] },
    table: { name: '분홍 밥상', price: 700, big: true, place: 'recycle', steps: ['browse_stand', 'counter_stand'] },
    lantern: { name: '등불', price: 500, big: false, place: 'recycle', steps: ['browse_stand', 'counter_stand'] },
  };
  const RESIDENT = { momongaHome: 'momonga', shisaHome: 'shisa', rakkoHome: 'rakko', kurimanjuHome: 'kurimanju', furuhonyaHome: 'furuhonya' };

  /* ---------- 집 찾기 ---------- */
  // 엑스트라: 침대 자리로 집을 찾는다. 원작 주민: 자기 이름의 집
  function houseOf(s, c) {
    for (const [pid, who] of Object.entries(RESIDENT)) if (who === c.id) { const p = s.places[pid]; return p ? { key: `${pid}@${p.x},${p.z}`, x: p.x, z: p.z, r: p.r, door: null, pid } : null; }
    if (!c.home || !s.sockets[c.home] || !s.sockets[c.home].bed_lie) return null;
    const b = s.sockets[c.home].bed_lie;
    return (s.world.homes || []).find(h => Math.hypot(h.bed[0] - b.x, h.bed[1] - b.z) < 1.5) || null;
  }
  const stateOf = key => [...((root.Interiors && root.Interiors.MOUNTED) || new Map()).values()].find(st => st.key === key);

  /* ---------- 살림 모델 (승인 시안 그대로) ---------- */
  function layout(st) {
    const hut = /^hut@/.test(st.key), R = (st.place.r || 7) - 0.5;
    return hut ? { bed: [-R * 0.3, -1], bedY: 0.4, table: [R * 0.45, 1], stool: null, lamp: [0, -R * 0.62] }
      : { bed: [3.6, -1.6], bedY: 0.4, table: [-2.6, -1.2], stool: [-4.4, -1.2], lamp: [-4.6, -3.6] };
  }
  const near = (m, x, y, z, e = 0.25) => Math.abs(m.position.x - x) < e && Math.abs(m.position.z - z) < e && (y === null || Math.abs(m.position.y - y) < 0.12);
  const BUILD = {
    futon(k, L) {
      const [fx, fz] = L.bed, y = L.bedY + 0.1, FW = 2.4, FL = 3.4;
      k.box(fx, y, fz, FW, 0.16, FL, '#f1eee8', 1);
      k.ball(fx, y + 0.26, fz + 0.35, FW * 0.48, 0.26, FL * 0.36, '#f7f5f0', 1);
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; k.ball(fx + Math.cos(a) * FW * 0.5, y + 0.22, fz + 0.35 + Math.sin(a) * FL * 0.4, 0.36, 0.22, 0.36, i % 2 ? '#f7f5f0' : '#eeebe4', 1); }
      k.ball(fx, y + 0.22, fz - FL * 0.42, 0.62, 0.2, 0.36, '#fbfaf7', 1);
    },
    bear(k, L) {
      const bx = L.bed[0] + 0.95, bz = L.bed[1] - 1.3, y = L.bedY + 0.2, B = '#b47b4c';
      k.ball(bx, y + 0.28, bz, 0.22, 0.22, 0.2, B, 1);
      k.ball(bx, y + 0.6, bz + 0.02, 0.2, 0.18, 0.18, B, 1);
      for (const s of [-1, 1]) { k.ball(bx + s * 0.15, y + 0.76, bz, 0.07, 0.07, 0.05, B, 1); k.ball(bx + s * 0.18, y + 0.22, bz + 0.14, 0.08, 0.07, 0.09, B, 0); k.ball(bx + s * 0.06, y + 0.62, bz + 0.17, 0.022, 0.026, 0.01, '#3b2a26', 0); }
      k.ball(bx, y + 0.55, bz + 0.17, 0.07, 0.05, 0.04, '#e2c09a', 0);
      k.ball(bx, y + 0.57, bz + 0.21, 0.02, 0.016, 0.01, '#3b2a26', 0);
    },
    table(k, L) {
      const [tx, tz] = L.table, TR = 0.9, TH = 0.42;
      k.cyl(tx, TH, tz, TR, 0.08, '#f2a3ae', 1);
      k.cyl(tx, TH + 0.045, tz, TR - 0.06, 0.012, '#f8c4cb', 0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.cyl(tx + Math.cos(a) * TR * 0.62, TH / 2, tz + Math.sin(a) * TR * 0.62, 0.06, TH, '#d9848f', 0); }
      for (const [ox, oz, c] of [[-0.35, 0.2, '#fffaf0'], [0.3, 0.25, '#9fc7d8']]) { k.cyl(tx + ox, TH + 0.1, tz + oz, 0.17, 0.12, c, 1); k.cyl(tx + ox, TH + 0.16, tz + oz, 0.14, 0.01, '#e8c27a', 0); }
      k.ball(tx, TH + 0.2, tz - 0.32, 0.16, 0.14, 0.16, '#c9c2b4', 1);
      k.cone(tx + 0.16, TH + 0.2, tz - 0.32, 0.04, 0.14, '#c9c2b4', 0).rotation.z = -1.1;
      k.ball(tx, TH + 0.34, tz - 0.32, 0.05, 0.03, 0.05, '#8a8277', 0);
      for (const [ox, oz] of [[0, 1.25], [-1.2, 0]]) k.place(roundBoxGeo(0.8, 0.12, 0.8, 0.05), mat('#f3d27a'), tx + ox, 0.06, tz + oz, 1, 1, 1, inkThin);
    },
    lantern(k, L, g) {
      const [lx, lz] = L.lamp;
      k.cyl(lx, 0.05, lz, 0.22, 0.1, '#8a6242', 1);
      k.cyl(lx, 0.45, lz, 0.03, 0.8, '#8a6242', 0);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe6a8' }));
      glow.scale.y = 1.25; glow.position.set(lx, 1.0, lz); g.add(glow);
      k.cyl(lx, 1.32, lz, 0.14, 0.05, '#8a6242', 0);
      k.cyl(lx, 0.68, lz, 0.14, 0.05, '#8a6242', 0);
    },
  };
  // 집에 놓기: 이미 놓인 것은 다시 만들지 않고, 바꾸는 기본 가구는 숨긴다
  function furnish(key, items) {
    const st = stateOf(key);
    if (!st) return;
    const L = layout(st);
    st.furn = st.furn || {};
    for (const id of items) {
      if (st.furn[id]) continue;
      const g = new THREE.Group(); g.name = `furn_${id}`;
      st.statics.add(g);
      BUILD[id](makeKit(g, st.place.x, st.place.z, st.place.face || 0), L, g);
      st.furn[id] = g;
      if (id === 'futon') {
        // 침대 위 매트·베개와 접힌 이불(움직이는 모델)을 감춘다. 나무 침대 틀은 남는다
        st.statics.children.forEach(m => { if (m.isMesh && (near(m, L.bed[0], 0.46, L.bed[1], 0.3) || near(m, L.bed[0], 0.62, L.bed[1] - 1.8, 0.3))) m.visible = false; });
        for (const [name, d] of st.dyn) if (/^futon/.test(name)) d.root.visible = false;
      }
      if (id === 'table') {
        st.statics.children.forEach(m => {
          if (!m.isMesh) return;
          if (near(m, L.table[0], null, L.table[1], 0.3) && m.position.y > 0.2) m.visible = false;
          if (L.stool && near(m, L.stool[0], 0.2, L.stool[1], 0.3)) m.visible = false;
        });
      }
    }
  }

  /* ---------- 사기 ---------- */
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  for (const [id, it] of Object.entries(ITEMS)) {
    put({ id: `${it.place}.furn_${id}`, place: it.place, name: `${josa(it.name, '을', '를')} 사기`, cost: it.price, hours: [10, 18], gain: { fun: 14 }, furnBuy: id,
      steps: [S(it.steps[0], 'look', 3, id === 'futon' || id === 'bear' ? 'pouch_turn' : 'browse_shelf', null, `${it.name} 고르는 중`), S(it.steps[1], 'pay', 2, 'pay_wait', null, it.big ? '배달해 주세요' : '이걸로 주세요'), S(it.steps[1], 'joy', 1.4, 'jump_joy', null, '우리 집에 놓을 거야')] });
  }
  const owns = (c, id) => (c.furniture || []).includes(id) || (c.furnPending || []).includes(id);
  const houseItems = (s, key) => { const out = new Set(); for (const o of s.chars) { const h = (o.furniture && o.furniture.length) ? houseOf(s, o) : null; if (h && h.key === key) for (const i of o.furniture) out.add(i); } return [...out]; };
  if (root.Purpose && root.Purpose.RULES) {
    root.Purpose.RULES.unshift(
      [/\.furn_/, (c, s, x) => !c.troupe && !c.monster && !!houseOf(s, c) && !owns(c, x.furnBuy) && !houseItems(s, houseOf(s, c).key).includes(x.furnBuy) && (c.money + ((c.bank && c.bank.bal) || 0)) >= ITEMS[x.furnBuy].price + 700, '집이 있고, 그 살림이 없고, 돈이 넉넉할 때만'],
      [/^(furnHome|deliver):/, 'step', '산 살림을 집으로 옮기는 단계'],
    );
  }

  /* ---------- 집 앞 자리와 옮기기 ---------- */
  function mkSocket(s, place, name, x, z, fx, fz) {
    const so = { name, place, x, z, h: 0, fx, fz };
    if (s.nav) { const ap = s.nav.approach(so); if (!ap) return null; Object.assign(so, { reach: true, ax: ap.x, az: ap.z, seatIn: ap.seatIn, h: ap.seatIn ? s.nav.measure(x, z, 0) : s.nav.surface(x, z) }); }
    (s.sockets[place] || (s.sockets[place] = {}))[name] = so;
    return so;
  }
  function doorPlace(s, h) {
    const place = `furn:${h.key}`;
    if (s.places[place]) return place;
    let door = h.door;
    if (!door && h.pid && s.sockets[h.pid] && s.sockets[h.pid].door_front) { const d = s.sockets[h.pid].door_front; door = [d.fx !== undefined ? d.fx : d.x, d.fz !== undefined ? d.fz : d.z]; }
    if (!door) return null;
    s.places[place] = { id: place, name: '집 앞', x: h.x, z: h.z, r: h.r || 10 };
    const dx = door[0] - h.x, dz = door[1] - h.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    mkSocket(s, place, 'drop_1', door[0] + ux * 1.3 - uz * 0.8, door[1] + uz * 1.3 + ux * 0.8, door[0], door[1]);
    mkSocket(s, place, 'drop_2', door[0] + ux * 1.3 + uz * 0.8, door[1] + uz * 1.3 - ux * 0.8, door[0], door[1]);
    return place;
  }
  function addX(s, x) { const i = s.interactions.findIndex(q => q.id === x.id); if (i >= 0) s.interactions.splice(i, 1, x); else s.interactions.push(x); return x; }
  function sendHome(s, buyer, id) {
    const h = houseOf(s, buyer);
    const place = h && doorPlace(s, h);
    const it = ITEMS[id];
    if (!place) { arrive(s, buyer, id); return; }
    (buyer.furnPending || (buyer.furnPending = [])).push(id);
    // 큰 것: 근처 엑스트라가 배달 (그 가게 알바면 더 먼저)
    let who = null;
    if (it.big) {
      const free = o => o !== buyer && o.extra && !o.troupe && !o.monster && !o.gone && !o.hidden && !o.orders.length && !(o.doing && o.doing.x && (o.doing.x.night || o.doing.x.shift || o.doing.x.isJob || o.doing.x.clerkShop || o.doing.x.plate));
      const cands = s.chars.filter(free).sort((a, b) => ((b.job && (b.job.id === it.place)) ? 1 : 0) - ((a.job && (a.job.id === it.place)) ? 1 : 0) || Math.hypot(a.x - buyer.x, a.z - buyer.z) - Math.hypot(b.x - buyer.x, b.z - buyer.z));
      who = cands[0] || null;
    }
    const carrier = who || buyer;
    const x = addX(s, { id: `${who ? 'deliver' : 'furnHome'}:${buyer.id}:${id}`, place, name: who ? `${buyer.name}네 ${it.name} 배달` : `${it.name} 들고 집에 가기`, only: [carrier.id], hours: [0, 24], gain: who ? { fun: 6 } : { fun: 10 },
      furnDrop: { buyer: buyer.id, id }, steps: [S('drop_*', 'put', 1.6, 'idle_stretch', null, who ? '상자 내려놓는 중' : '집에 들여놓는 중'), S('drop_*', 'done', 1.4, who ? 'ramen_bow' : 'jump_joy', null, who ? '배달 왔습니다!' : '딱 좋다!')] });
    if (carrier.doing && carrier !== buyer) s.abort(carrier, '');
    s.order(carrier, x);
    carrier.carryFurn = true;
    if (who) { s.note(`📦 ${who.name}: ${buyer.name}네 집으로 ${josa(it.name, '을', '를')} 배달하러 가요`); who.money += 120; }
  }
  function arrive(s, buyer, id) {
    buyer.furnPending = (buyer.furnPending || []).filter(i => i !== id);
    (buyer.furniture || (buyer.furniture = [])).includes(id) || buyer.furniture.push(id);
    const h = houseOf(s, buyer);
    if (h) furnish(h.key, houseItems(s, h.key));
    s.note(`🏠 ${buyer.name}네 집에 ${josa(ITEMS[id].name, '이', '가')} 들어왔어요`);
  }

  /* ---------- 판단·끝·저장 ---------- */
  const L = root.Labor && root.Labor.prototype;
  if (L) {
    const score0 = L.scoreBonus;
    L.scoreBonus = function (c, x) { let v = score0.call(this, c, x); if (x.furnBuy) v += 18 + (c.money > 3000 ? 25 : 0); return v; };
    const fin0 = L.onFinish;
    L.onFinish = function (c, x) {
      fin0.apply(this, arguments);
      const s = this.sim;
      if (x.furnBuy) sendHome(s, c, x.furnBuy);
      if (x.furnDrop) {
        const b = s.chars.find(o => o.id === x.furnDrop.buyer);
        if (b) { arrive(s, b, x.furnDrop.id); if (b !== c && Math.hypot(b.x - c.x, b.z - c.z) < 12) s.labor.react(b, 'applaud', '고마워요!'); }
        c.carryFurn = false;
      }
      // 쓰임새: 뭉게 이불·곰 인형이 있는 집에서 자고 나면 기분이 좋다
      if (/\.sleep$/.test(x.id)) {
        const h = houseOf(s, c), it = h ? houseItems(s, h.key) : [];
        const bonus = (it.includes('futon') ? 10 : 0) + (it.includes('bear') ? 6 : 0);
        if (bonus) c.needs.fun = Math.min(100, c.needs.fun + bonus);
      }
      // 밥상이 있는 집의 집들이는 더 즐겁다
      if (/^warming:/.test(x.id)) { const host = s.chars.find(o => x.id.split(':')[1] === o.id); const h = host && houseOf(s, host); if (h && houseItems(s, h.key).includes('table')) c.needs.social = Math.min(100, c.needs.social + 10); }
    };
    const save0 = L.save;
    L.save = function (c) { const r = save0.call(this, c); if (c.furniture && c.furniture.length) r.furniture = c.furniture.slice(); return r; };
    const load0 = L.load;
    L.load = function (c, r) { load0.call(this, c, r); if (r && Array.isArray(r.furniture)) { c.furniture = r.furniture.filter(i => ITEMS[i]); c._refurnish = true; } };
  }
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      for (const c of this.chars) {
        // 불러온 저장: 집 안에 다시 놓는다 (집이 다 지어진 뒤)
        if (c._refurnish && root.Interiors && root.Interiors.MOUNTED && root.Interiors.MOUNTED.size) { c._refurnish = false; const h = houseOf(this, c); if (h) furnish(h.key, houseItems(this, h.key)); }
        // 들고 가는 동안 상자를 안는다
        const d = c.doing;
        const going = c.carryFurn && d && d.x && d.x.furnDrop && d.phase !== 'use';
        if (going) c.moveClip = 'box_carry_empty';
        else if (c.moveClip === 'box_carry_empty' && !(d && d.x && (d.x.furnDrop || d.x.id === 'lemon.sticker'))) c.moveClip = null;
      }
    };
  }
  root.Furniture = { ITEMS, furnish, houseOf, houseItems, sendHome };
}(typeof self !== 'undefined' ? self : this));
