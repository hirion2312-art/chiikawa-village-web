'use strict';

// 치이카와 심즈 — 세트 애니메이션 묶음 (2026-11-10 이재헌 지시, docs/plan-2026-11-10-issues.md 3·4단계)
// 세트 = 건물 + 고정 에셋 + 행동 동작 + 에셋 동작. 상호작용에 쓰는 물건은 처음부터 그 자리에 있고 상호작용이 그 물건을 움직인다
// 1) 무차우 마켓 내외부  2) 우마카레 내부  3) 술 자격증 → 술 사기 → 술 마시기  4) 광장 합격 게시판 → 합격자 사진·자격증 카드
// 5) 관계별 함께 하기(놀러 가기·같이 구경·신기한 물건·삼인방 모임·같이 토벌/일)  6) 잉여 건물 이용 유도(반복 감점·새 장소 가점)
(function (root) {
  const VO = root.VillageObjects;
  const AS = root.ASSET_SOCKETS;
  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip: clip || null, prop: prop || null, label, fx });
  const put = x => {
    const i = VO.LIST.findIndex(q => q.id === x.id);
    if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
    return x;
  };
  const drop = id => { const i = VO.LIST.findIndex(q => q.id === id); if (i >= 0) VO.LIST.splice(i, 1); delete VO.BY_ID[id]; };
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const noGlb = id => { if (root.GLB_MAP) delete root.GLB_MAP[id]; if (root.GLB_PLACES) root.GLB_PLACES.delete(id); };
  const sockets = (place, list) => { AS[place] = Object.assign(AS[place] || {}, list); };
  // 장소 실내 공통: 바닥 + 사방 벽(앞 문 자리 비움)
  function room(k, api, W, D, doorX, doorW, floor, wall) {
    k.box(0, -0.01, 0, W - 0.4, 0.06, D - 0.4, floor, 0);
    const w = { h: 4.6, t: 0.35, color: wall, ink: 1 };
    const x0 = -W / 2 + 0.2, x1 = W / 2 - 0.2, z0 = -D / 2 + 0.2, z1 = D / 2 - 0.2;
    api.walls([[x0, z1], [x0, z0], [x1, z0], [x1, z1]], w);
    api.walls([[x0, z1], [doorX - doorW / 2, z1]], w);
    api.walls([[doorX + doorW / 2, z1], [x1, z1]], w);
  }
  function shell(k, W, D, H, wall, roof, doorX, doorW) {
    k.box(0, H / 2, 0, W, H, D, wall, 2);
    k.box(0, H + 0.3, 0, W + 0.8, 0.6, D + 0.8, roof, 2);
    k.box(doorX, 1.6, D / 2 + 0.05, doorW, 3.2, 0.1, '#bfe0ef', 1);
    for (const sx of [-1, 1]) k.box(doorX + sx * (doorW / 2 + 0.1), 1.6, D / 2 + 0.1, 0.2, 3.3, 0.2, '#8f969a', 0);
  }
  function sign(k, x, z, y, w, text, bg, fg) {
    const s = k.sub(x, z, 0, y);
    s.box(0, 0.6, 0, w, 1.2, 0.18, bg, 2);
    s.paint(0, 0.1, 0.1, w - 0.3, 1, g => {
      g.save(); g.scale(1, -1);
      g.fillStyle = fg; g.font = '800 0.62px "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 0, -0.5); g.restore();
    });
  }
  const goodsColors = ['#f3a9bd', '#a8c6e0', '#f2d64b', '#b7d6a5', '#e8a96a', '#cbbce6', '#fffaf0', '#e86a5a'];

  /* ================= 1) 무차우 마켓 ================= */
  noGlb('mucha');
  const MW = 34, MD = 22, MH = 7, MDOOR = 0;
  const AISLES = [-9, -3, 3, 9];
  sockets('mucha', {
    door_front: [MDOOR, MD / 2 + 3, 0, MDOOR, MD / 2],
    basket_pick: [MDOOR + 3.4, MD / 2 - 2.2, 0, MDOOR + 5, MD / 2 - 2.2],
    checkout_stand: [-11, 5.6, 0, -11, 3.6],
    checkout_2: [-6.5, 5.6, 0, -6.5, 3.6],
    staff_side: [-11, 2.2, 0, -11, 3.6],
    liquor_look: [13.2, -2, 0, 15.6, -2],
    deli_look: [8, -7.6, 0, 8, -9.6],
    cart_stand: [9, MD / 2 + 4, 0, 11, MD / 2 + 4],
    parking_stand: [14, MD / 2 + 7, 0, 14, MD / 2 + 10],
    flyer_look: [-6, MD / 2 + 1.6, 0, -6, MD / 2 + 0.2],
    eat_bench_1: [-14, MD / 2 + 3, 0.45, -14, MD / 2 + 5],
    eat_bench_2: [-12.4, MD / 2 + 3, 0.45, -12.4, MD / 2 + 5],
  });
  AISLES.forEach((x, i) => {
    AS.mucha[`shelf_look_${i * 2 + 1}`] = [x - 1.3, -1, 0, x, -1];
    AS.mucha[`shelf_look_${i * 2 + 2}`] = [x + 1.3, -3.4, 0, x, -3.4];
  });
  // 한 번에 산 것을 장바구니에 담는 단계 (진열대의 그 물건이 들려 나온다: fx shelfN.take)
  const SHOP = (name, extra) => [
    S('basket_pick', 'take', 1.2, 'plate_pick', null, '장바구니 집는 중', 'baskets.take'),
    S('shelf_look_*', 'browse', 4, 'browse_shelf', 'basket', name, 'shelf.take'),
    ...(extra || []),
    S('checkout_stand|checkout_2', 'pay', 2.4, 'pay_wait', 'basket', '계산대에 올려놓는 중', 'register.beep'),
    S('checkout_stand|checkout_2', 'pay', 1.2, 'pay_receive', null, '봉투 받는 중', 'register.bag'),
  ];
  put({ id: 'mucha.shop', place: 'mucha', name: '장 봐서 간식 먹기', gain: { hunger: 30, fun: 12 }, cost: 400, hours: [8, 22],
    steps: [...SHOP('과자 고르는 중'), S('eat_bench_*', 'eat', 6, 'eat_bite', 'snack', '가게 앞 벤치에서 먹는 중')] });
  put({ id: 'mucha.groceries', place: 'mucha', name: '집밥 재료 사기', gain: { fun: 4 }, cost: 300, hours: [8, 22], groceries: true,
    steps: [...SHOP('채소·두부 고르는 중', [S('deli_look', 'browse', 3, 'browse_shelf', 'basket', '반찬 코너 구경하는 중', 'deli.glow')])] });
  put({ id: 'mucha.bento', place: 'mucha', name: '도시락 사 먹기', gain: { hunger: 45, fun: 6 }, cost: 250, hours: [8, 21],
    steps: [S('deli_look', 'browse', 3, 'browse_shelf', null, '도시락 고르는 중', 'deli.glow'), S('checkout_stand|checkout_2', 'pay', 2, 'pay_wait', null, '계산하는 중', 'register.beep'), S('checkout_stand|checkout_2', 'wait', 2, 'tilt_look', null, '전자레인지 기다리는 중', 'microwave.run'), S('eat_bench_*', 'eat', 10, 'eat_bowl', 'bowl', '따뜻한 도시락 먹는 중')] });
  put({ id: 'mucha.cart_push', place: 'mucha', name: '카트 밀어 보기', gain: { fun: 7 }, hours: [8, 22], steps: [S('cart_stand', 'carry', 3, 'carry_pile', null, '카트 빼는 중', 'carts.pull'), S('parking_stand', 'carry', 3, 'carry_pile', null, '주차장 한 바퀴', 'carts.ride')] });

  function shelfUnit(kk, len, seed) {
    // 진열대: 금속 틀 + 3단 선반 + 칸마다 색 다른 상품(상자·병·봉지)
    kk.box(0, 1.1, 0, 0.9, 2.2, len, '#e9e7e1', 1);
    for (const y of [0.35, 1.0, 1.65]) {
      kk.box(0, y, 0, 1.1, 0.06, len + 0.1, '#bfc3c5', 0);
      for (let i = 0; i < Math.floor(len / 0.5); i++) {
        const z = -len / 2 + 0.3 + i * 0.5, c = goodsColors[(i * 3 + seed + Math.round(y * 3)) % goodsColors.length];
        for (const sx of [-1, 1]) {
          if ((i + seed) % 3 === 0) kk.cyl(sx * 0.32, y + 0.2, z, 0.1, 0.36, c, 0);
          else if ((i + seed) % 3 === 1) kk.box(sx * 0.32, y + 0.16, z, 0.22, 0.3, 0.36, c, 0);
          else kk.ball(sx * 0.32, y + 0.14, z, 0.16, 0.13, 0.2, c, 0);
        }
      }
    }
  }
  function muchaDef() {
    const X = MW / 2, Z = MD / 2;
    return {
      area: { x: 0, z: 0, w: MW, d: MD },
      exterior(k) {
        shell(k, MW, MD, MH, '#fff8ea', '#e8e2d2', MDOOR, 6);
        k.box(0, MH - 0.6, Z + 0.15, MW, 0.8, 0.2, '#7fa86a', 1);
        sign(k, 0, Z + 0.3, MH + 0.7, 12, '무차우마켓', '#b5d97f', '#55803f');
        for (const x of [-12, -6.5, 6.5, 12]) { const w = k.sub(x, Z + 0.06); w.win(0, 2.2, 3.6, 2.4, { frame: '#7fa86a' }); }
        // 할인 깃발
        for (const x of [-15, 15]) { k.cyl(x, 2, Z + 2, 0.06, 4, '#9aa0a4', 0); k.box(x + 0.5, 3.2, Z + 2, 1, 1.6, 0.04, '#e86a5a', 1); }
      },
      yard(k) {
        // 카트 보관대·주차장 선·가게 앞 벤치·전단지 판
        for (let i = 0; i < 4; i++) {
          const c = k.sub(10 + i * 0.5, Z + 4);
          c.box(0, 0.9, 0, 0.8, 0.5, 1.1, '#c7cbc8', 1);
          c.box(0, 1.25, -0.6, 0.8, 0.06, 0.06, '#e86a5a', 0);
          for (const sx of [-0.3, 0.3]) for (const sz of [-0.4, 0.4]) c.cyl(sx, 0.12, sz, 0.1, 0.06, '#3f3d3a', 0).rotation.z = Math.PI / 2;
        }
        for (let i = 0; i < 4; i++) k.box(11 + i * 3, 0.02, Z + 10, 0.12, 0.02, 4, '#fffdf4', 0);
        k.box(-13.2, 0.4, Z + 3, 3.4, 0.12, 0.9, '#c9a57c', 1);
        for (const x of [-14.6, -11.8]) k.box(x, 0.2, Z + 3, 0.12, 0.4, 0.8, '#a98a66', 0);
        const fb = k.sub(-6, Z + 0.25);
        fb.box(0, 1.6, 0, 2, 1.4, 0.06, '#fffdf4', 1);
        fb.paint(0, 1, 0.05, 1.8, 1.2, g => { g.save(); g.scale(1, -1); g.fillStyle = '#e86a5a'; g.font = '800 0.34px "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.fillText('오늘 큰 할인', 0, -0.8); g.fillStyle = '#55803f'; g.fillText('도시락 250원', 0, -0.35); g.restore(); });
      },
      interior(k, api) {
        room(k, api, MW, MD, MDOOR, 6, '#ecebe4', '#fbf8ef');
        // 진열대 네 줄 (가운데 손이 닿는 칸은 움직이는 모델: 집으면 그 상품이 빠졌다가 다시 채워진다)
        AISLES.forEach((x, i) => {
          const g = k.sub(x, -2.2);
          shelfUnit(g, 7, i);
          for (const [slot, z] of [[i * 2 + 1, 1.2], [i * 2 + 2, -1.2]]) {
            api.dyn(`shelf:shelf_look_${slot}`, { x, y: 1.0, z: -2.2 + z, obj: 'shelf', label: '진열 상품',
              clips: { take(o, u) { o.data.item.visible = u < 0.3 || u > 0.95; o.data.item.position.y = 0.16 + ease(clamp(u / 0.3)) * 0.3; } },
            }, (kk, o) => { o.data.item = kk.box(slot % 2 ? -0.32 : 0.32, 0.16, 0, 0.24, 0.3, 0.3, goodsColors[slot % 8], 1); });
          }
        });
        // 장바구니 더미: 하나 집어 가면 줄었다가 돌아온다
        api.dyn('baskets', { x: MDOOR + 5, y: 0, z: Z - 2.2, obj: 'basket', label: '장바구니',
          clips: { take(o, u) { o.data.top.visible = u < 0.5; } },
        }, (kk, o) => {
          for (let i = 0; i < 4; i++) kk.box(0, 0.15 + i * 0.12, 0, 0.8, 0.12, 0.5, '#e86a5a', 1);
          o.data.top = kk.box(0, 0.65, 0, 0.8, 0.3, 0.5, '#e86a5a', 1);
          kk.box(0, 0.86, 0, 0.7, 0.04, 0.04, '#3f3d3a', 0);
        });
        // 계산대 두 개 + 계산기(서랍이 열리고 화면이 깜박인다) + 컨베이어
        for (const cx of [-11, -6.5]) {
          k.box(cx, 0.5, 3.6, 3, 1, 1.2, '#7fa86a', 1);
          k.box(cx + 0.6, 1.02, 3.6, 1.6, 0.04, 1, '#3f3d3a', 0);
        }
        api.dyn('register', { x: -11, y: 1.0, z: 3.0, obj: 'register', label: '계산기',
          clips: {
            beep(o, u, time) { o.data.screen.material.color.set(Math.sin(time * 14) > 0 ? '#9fe3a0' : '#3f6f4a'); o.data.drawer.position.z = 0.25 + ease(clamp((u - 0.6) / 0.3)) * 0.35; },
            bag(o, u) { o.data.bag.visible = u < 0.7; o.data.drawer.position.z = 0.6 - ease(clamp(u / 0.4)) * 0.35; },
          },
          end(o) { o.data.screen.material.color.set('#3f6f4a'); o.data.drawer.position.z = 0.25; o.data.bag.visible = false; },
        }, (kk, o) => {
          kk.box(0, 0.25, 0, 0.8, 0.5, 0.6, '#d3d6da', 1);
          o.data.screen = kk.box(0, 0.62, -0.1, 0.5, 0.3, 0.04, '#3f6f4a', 0);
          o.data.drawer = kk.box(0, 0.08, 0.25, 0.7, 0.14, 0.5, '#bfc3c5', 0);
          o.data.bag = kk.ball(0.9, 0.3, 0.3, 0.3, 0.35, 0.2, '#fffdf4');
          o.data.bag.visible = false;
        });
        // 반찬·도시락 냉장고 (불이 켜진다)와 전자레인지
        k.box(8, 1.2, -9.6, 6, 2.4, 1.2, '#dfe6ea', 1);
        for (let i = 0; i < 10; i++) k.box(5.6 + (i % 5) * 1.2, 0.8 + Math.floor(i / 5) * 0.9, -9.1, 0.9, 0.2, 0.6, ['#f6dc4a', '#e8a96a', '#b7d6a5'][i % 3], 0);
        api.dyn('deli', { x: 8, y: 2.45, z: -9.0, label: '냉장 진열대 불빛', clips: { glow(o, u, time) { o.data.l.material.opacity = 0.5 + Math.sin(time * 3) * 0.2; } }, end(o) { o.data.l.material.opacity = 0.2; } },
          (kk, o) => { o.data.l = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: '#eaf8ff', transparent: true, opacity: 0.2 })); kk.group.add(o.data.l); });
        api.dyn('microwave', { x: -8.8, y: 1.05, z: 3.4, obj: 'microwave', label: '전자레인지',
          clips: { run(o, u, time) { o.data.plate.rotation.y = time * 3; o.data.lamp.material.color.set('#ffd98a'); } }, end(o) { o.data.lamp.material.color.set('#55524e'); } },
          (kk, o) => { kk.box(0, 0.3, 0, 0.9, 0.6, 0.6, '#f4f2ec', 1); o.data.lamp = kk.box(-0.1, 0.3, 0.31, 0.5, 0.4, 0.02, '#55524e', 0); o.data.plate = kk.cyl(-0.1, 0.12, 0, 0.18, 0.02, '#e8e3d8', 0); });
        // 술 진열장 (자격증이 있어야 산다): 병마다 색이 다르고, 산 병은 빠진다
        k.box(15.8, 1.3, -2, 0.9, 2.6, 5, '#7d5a44', 1);
        for (let i = 0; i < 18; i++) {
          const y = 0.5 + Math.floor(i / 6) * 0.8, z = -4 + (i % 6) * 0.8;
          k.cyl(15.6, y + 0.22, z, 0.11, 0.44, ['#3f7a4a', '#7a3f2a', '#c9a24a'][i % 3], 0);
          k.cyl(15.6, y + 0.5, z, 0.04, 0.14, '#3f3d3a', 0);
        }
        api.dyn('liquor', { x: 15.3, y: 1.3, z: -2, obj: 'liquor', label: '술병', clips: { take(o, u) { o.data.b.visible = u < 0.4 || u > 0.95; } } },
          (kk, o) => { o.data.b = kk.cyl(0, 0.22, 0, 0.12, 0.44, '#3f7a4a', 1); });
        k.box(15.3, 2.9, -2, 1.2, 0.5, 4.6, '#fffdf4', 1);
        // 천장 등
        for (const x of [-10, 0, 10]) for (const z of [-5, 3]) k.box(x, 4.4, z, 3, 0.1, 0.4, '#fffbe8', 0);
      },
    };
  }
  BUILDERS.mucha = (k, p) => root.Interiors.mount(k, p, muchaDef());

  /* ================= 2) 우마카레 내부 ================= */
  noGlb('umaCurry');
  const UW = 18, UD = 14;
  sockets('umaCurry', {
    counter_sit_1: [-4.5, 1.2, 0.62, -4.5, -0.6], counter_sit_2: [-1.5, 1.2, 0.62, -1.5, -0.6],
    counter_sit_3: [1.5, 1.2, 0.62, 1.5, -0.6], counter_sit_4: [4.5, 1.2, 0.62, 4.5, -0.6],
    challenge_sit: [5.6, 4.6, 0.45, 5.6, 3],
    staff_side: [0, -2.6, 0, 0, -0.6], menu_look: [-6.5, UD / 2 + 2, 0, -6.5, UD / 2 + 0.3], photo_stand: [6.2, UD / 2 + 3, 0, 6.2, UD / 2 + 1.4],
  });
  put({ id: 'umaCurry.curry', place: 'umaCurry', name: '카레 먹기', gain: { hunger: 60, fun: 10 }, cost: 800, hours: [11, 21], group: true,
    steps: [
      S('counter_sit_*', 'talk', 2, 'talk_order', null, '"카레 하나요"', 'pot.stir'),
      S('counter_sit_*', 'wait', 3, 'tilt_look', null, '카레를 퍼 주길 기다리는 중', 'pot.scoop'),
      S('counter_sit_*', 'eat', 16, 'eat_bowl', 'bowl', '카레 먹는 중'),
      S('counter_sit_*', 'drink', 2, 'milk_gulp', 'cup', '물 한 모금'),
      S('counter_sit_*', 'idle', 1.5, 'belly_pat', null, '잘 먹었습니다'),
    ] });
  put({ id: 'umaCurry.challenge', place: 'umaCurry', name: '왕 카레 도전', gain: { hunger: 90, fun: 25, energy: -6 }, cost: 1500, hours: [11, 20],
    steps: [
      S('challenge_sit', 'wait', 2, 'brave_up', null, '왕 카레가 나왔다!', 'bigplate.serve'),
      S('challenge_sit', 'eat', 20, 'eat_bowl', null, '산 같은 카레를 파먹는 중', 'bigplate.eat'),
      S('challenge_sit', 'idle', 2, 'jump_joy', null, '다 먹었다!', 'bell.ring'),
    ] });
  function curryDef() {
    const Z = UD / 2;
    return {
      area: { x: 0, z: 0, w: UW, d: UD },
      exterior(k) {
        shell(k, UW, UD, 5.4, '#f7e8c8', '#c88e5e', -4, 3.6);
        sign(k, 2, Z + 0.3, 5.8, 7, '우마카레', '#e8894e', '#fff');
        k.box(-4, 3.6, Z + 0.6, 4.4, 0.12, 1.2, '#e8894e', 1);
      },
      yard(k) {
        // 메뉴판 입간판과 얼굴 구멍 기념사진 판(카레 그릇을 든 그림)
        const m = k.sub(-6.5, Z + 0.9);
        m.box(0, 1, 0, 1.4, 1.8, 0.1, '#5a3b33', 1);
        m.paint(0, 0.25, 0.06, 1.2, 1.5, g => { g.save(); g.scale(1, -1); g.fillStyle = '#fffaf0'; g.font = '700 0.22px "Malgun Gothic", sans-serif'; g.textAlign = 'center'; ['카레 800', '왕 카레 1500', '30분 안에 먹으면 공짜'].forEach((t, i) => g.fillText(t, 0, -1.2 + i * 0.4)); g.restore(); });
        const p = k.sub(6.2, Z + 1.2);
        p.box(0, 1.3, 0, 2, 2.6, 0.12, '#f2c46d', 2);
        p.ball(0, 1.75, 0.07, 0.42, 0.42, 0.04, '#5a3b33', 0);
        p.ball(0, 0.85, 0.08, 0.7, 0.3, 0.06, '#c9772e', 0);
      },
      interior(k, api) {
        room(k, api, UW, UD, -4, 3.6, '#e9dcc2', '#fbf1dc');
        // 긴 카운터와 높은 의자 넷
        k.box(0, 1.0, -0.6, 12, 0.12, 1.4, '#c9a57c', 1);
        k.box(0, 0.5, -0.9, 12, 1.0, 0.6, '#a97c50', 1);
        for (const x of [-4.5, -1.5, 1.5, 4.5]) { k.cyl(x, 0.58, 1.2, 0.34, 0.08, '#e8894e', 1); k.cyl(x, 0.28, 1.2, 0.06, 0.56, '#7f868a', 0); }
        // 주방: 화구 둘, 밥솥, 접시 더미
        k.box(0, 0.5, -5.6, 12, 1, 1.4, '#d3d6da', 1);
        k.cyl(4, 1.25, -5.6, 0.5, 0.5, '#e8e3d8', 1);
        for (let i = 0; i < 5; i++) k.cyl(-4.5, 1.05 + i * 0.05, -5.6, 0.4, 0.04, '#fffaf0', 0);
        // 큰 카레 솥: 저을 때 국자가 돌고, 풀 때 국자가 올라와 카운터 쪽으로 온다
        api.dyn('pot', { x: 0, y: 1.0, z: -5.6, obj: 'pot', label: '카레 솥',
          clips: {
            stir(o, u, time) { o.data.ladle.rotation.y = time * 3; o.data.ladle.position.set(Math.sin(time * 3) * 0.3, 0.9, Math.cos(time * 3) * 0.3); o.data.fire.run(time, true); },
            scoop(o, u, time) { o.data.ladle.rotation.y = 0; o.data.ladle.position.set(0, 0.9 + Math.sin(u * Math.PI) * 0.8, ease(u) * 3); o.data.fire.run(time, true); },
          },
          end(o) { o.data.ladle.position.set(0.3, 0.9, 0); o.data.fire.run(0, false); },
        }, (kk, o) => {
          kk.cyl(0, 0.45, 0, 0.7, 0.9, '#7f868a', 1);
          kk.cyl(0, 0.86, 0, 0.62, 0.04, '#b5651d', 0);
          const l = new THREE.Group(); kk.group.add(l); o.data.ladle = l;
          const lk = makeKit(l, 0, 0, 0); lk.cyl(0, 0.3, 0, 0.03, 0.8, '#c9c4b6', 0); lk.ball(0, -0.1, 0, 0.14, 0.08, 0.14, '#c9c4b6', 0);
          const f = new THREE.Group(); f.position.y = 0.02; kk.group.add(f);
          o.data.fire = root.FireFx ? root.FireFx.makeFire(f, 0.5, 'gas') : { run() {} };
        });
        // 왕 카레 도전석: 산 같은 카레가 먹을수록 낮아진다
        k.box(5.6, 0.7, 3, 2.4, 0.1, 1.6, '#c9a57c', 1);
        k.cyl(5.6, 0.25, 4.6, 0.35, 0.5, '#e8894e', 1);
        api.dyn('bigplate', { x: 5.6, y: 0.76, z: 3, obj: 'plate', label: '왕 카레',
          clips: { serve(o, u) { o.root.visible = u > 0.3; }, eat(o, u) { o.data.rice.scale.y = 1 - u * 0.9; o.data.roux.scale.set(1 - u * 0.6, 1 - u * 0.9, 1 - u * 0.6); } },
          end(o, clip) { if (clip === 'eat') { o.data.rice.scale.y = 1; o.data.roux.scale.set(1, 1, 1); } },
        }, (kk, o) => {
          kk.cyl(0, 0.03, 0, 0.9, 0.06, '#fffaf0', 1);
          o.data.rice = kk.ball(-0.2, 0.06, 0, 0.55, 0.6, 0.55, '#fffdf4', 1);
          o.data.roux = kk.ball(0.25, 0.06, 0, 0.6, 0.35, 0.6, '#b5651d', 1);
          for (let i = 0; i < 4; i++) kk.ball(0.2 + Math.cos(i * 1.6) * 0.3, 0.32, Math.sin(i * 1.6) * 0.3, 0.1, 0.08, 0.1, ['#e8a96a', '#f3e3b0'][i % 2], 0);
        });
        api.dyn('bell', { x: 7, y: 2.6, z: -Z + 0.6, label: '도전 성공 종', clips: { ring(o, u, time) { o.data.b.rotation.z = Math.sin(time * 18) * 0.4; } }, end(o) { o.data.b.rotation.z = 0; } },
          (kk, o) => { const b = new THREE.Group(); kk.group.add(b); o.data.b = b; makeKit(b, 0, 0, 0).cone(0, -0.4, 0, 0.3, 0.4, '#e3bb4a', 1); });
        // 벽 메뉴판·물병
        const mb = k.sub(-3, -Z + 0.4);
        mb.box(0, 3.2, 0, 4, 1, 0.08, '#5a3b33', 1);
        for (const x of [-4.5, 1.5]) k.cyl(x, 1.25, -0.6, 0.12, 0.38, '#bfe6f7', 1);
      },
    };
  }
  BUILDERS.umaCurry = (k, p) => root.Interiors.mount(k, p, curryDef());

  /* ================= 3) 술: 자격증 → 사기 → 마시기 ================= */
  const MAINS = c => !c.extra && !c.troupe && !c.monster;
  sockets('exam', { sake_desk: AS.exam && AS.exam.desk_sit_2 ? AS.exam.desk_sit_2.slice() : [2, 0, 0.45, 2, -1.5] });
  put({ id: 'exam.sake_study', place: 'exam', name: '술 자격 공부', gain: { fun: -4, energy: -6 }, hours: [9, 18], sakeStudy: true,
    steps: [S('desk_sit_*', 'study', 14, 'study_home', 'book', '술 자격 교재 읽는 중')] });
  put({ id: 'exam.sake_exam', place: 'exam', name: '술 자격 시험 보기', gain: { energy: -8 }, cost: 500, hours: [10, 16], sakeExam: true,
    steps: [S('desk_sit_*', 'study', 12, 'exam_write', null, '술 자격 시험 푸는 중'), S('results_look', 'read', 2, 'board_read', null, '결과를 기다리는 중')] });
  put({ id: 'mucha.liquor', place: 'mucha', name: '술 사기', gain: { fun: 6 }, cost: 900, hours: [10, 22], needSake: true,
    steps: [S('liquor_look', 'browse', 3, 'browse_shelf', null, '어떤 술로 할까', 'liquor.take'), S('checkout_stand|checkout_2', 'pay', 2.4, 'pay_wait', 'bottle', '자격증을 보여 주며 계산', 'register.beep'), S('checkout_stand|checkout_2', 'pay', 1, 'pay_receive', 'bottle', '술병 받는 중', 'register.bag')] });
  for (const place of ['plaza', 'pond']) {
    put({ id: `${place}.sake_drink`, place, name: '술 한잔 하기', gain: { fun: 22, social: 6, energy: -3 }, hours: [17, 23], drinkSake: true, group: true,
      steps: [
        S(place === 'plaza' ? 'bench_sit_a|bench_sit_b' : place === 'pond' ? 'fish_*|bank_*' : 'sake_*|seat_*', 'pour', 2.5, 'drink_pour', 'bottle', '잔에 따르는 중'),
        S(place === 'plaza' ? 'bench_sit_a|bench_sit_b' : place === 'pond' ? 'fish_*|bank_*' : 'sake_*|seat_*', 'drink', 4, 'milk_gulp', 'cup', '캬아'),
        S(place === 'plaza' ? 'bench_sit_a|bench_sit_b' : place === 'pond' ? 'fish_*|bank_*' : 'sake_*|seat_*', 'idle', 3, 'listen_groove', null, '얼굴이 발그레'),
      ] });
  }

  /* ================= 4) 합격 게시판 → 사진·자격증 카드 ================= */
  sockets('plaza', { pass_board_1: (AS.plaza.board_check_a || [0, 6, 0, 0, 4]).slice(), pass_board_2: (AS.plaza.board_check_b || [2, 6, 0, 2, 4]).slice() });
  sockets('exam', { card_photo: [-2, 3, 0, -2, 5], card_desk: [0, 3.6, 0, 0, 2] });
  put({ id: 'plaza.pass_board', place: 'plaza', name: '합격 게시판 확인하기', gain: { fun: 6, social: 6 }, hours: [7, 22], passBoard: true, group: true,
    steps: [S('pass_board_*|board_check_a|board_check_b', 'read', 2.5, 'peek_tiptoe', null, '번호를 찾는 중'), S('pass_board_*|board_check_a|board_check_b', 'read', 1.5, 'board_read', null, '두근두근')] });
  put({ id: 'exam.card', place: 'exam', name: '자격증 사진 찍고 카드 받기', gain: { fun: 18 }, hours: [9, 18], cardGet: true,
    steps: [
      S('card_photo', 'pose', 2, 'photo_v', null, '증명사진 찰칵', 'camera.flash'),
      S('card_desk', 'wait', 2, 'tilt_look', null, '카드를 만드는 중'),
      S('card_desk', 'hand', 2, 'pay_receive', 'ticket', '자격증 카드 받는 중'),
      S('card_desk', 'idle', 1.5, 'jump_joy', null, '카드다!'),
    ] });
  // 발표는 곧바로 반영하지 않고, 광장 게시판에서 확인할 때 반영한다 (하루 안에 안 오면 그대로 반영)
  const Cal = root.Calendar && root.Calendar.prototype;
  if (Cal && Cal.announce) {
    const announce0 = Cal.announce;
    Cal.announce = function (c, r) {
      if (c.extra) return announce0.call(this, c, r);
      c.pendingResult = { r, at: this.sim.minutes };
      this.sim.note(`합격 발표가 광장 게시판에 붙었어요 (${c.name})`);
    };
    Cal.realAnnounce = announce0;
  }

  /* ================= 5) 관계별 함께 하기 ================= */
  sockets('home', { guest_sit_1: [-1.2, 2.6, 0, 0.6, 1.2], guest_sit_2: [2.8, 2.4, 0, 1.4, 1.0], guest_sit_3: [1.2, -1.2, 0, 1.2, 0.9] });
  const TRIO = ['chiikawa', 'hachiware', 'usagi'];
  put({ id: 'home.visit_play', place: 'home', name: '치이카와네 놀러 가서 놀기', gain: { fun: 30, social: 25 }, hours: [10, 20], group: true, together: 1, guest: true,
    steps: [S('guest_sit_*|table_sit', 'talk', 3, 'chat_nod', null, '수다 떠는 중'), S('guest_sit_*|table_sit', 'play', 5, 'applaud', null, '같이 손뼉 놀이'), S('guest_sit_*|table_sit', 'eat', 4, 'eat_bite', 'snack', '과자 나눠 먹는 중')] });
  put({ id: 'plaza.trio_meet', place: 'plaza', name: '삼인방 모여서 놀기', only: TRIO, gain: { fun: 32, social: 30 }, hours: [9, 20], group: true, together: 2,
    steps: [S('bench_sit_a|bench_sit_b|speaker_listen|speaker_dance', 'talk', 3, 'chat_nod', null, '모여서 재잘재잘'), S('bench_sit_a|bench_sit_b|speaker_listen|speaker_dance', 'dance', 4, 'dance_light', null, '셋이 춤추기'), S('bench_sit_a|bench_sit_b|speaker_listen|speaker_dance', 'play', 2, 'jump_joy', null, '와아')] });
  put({ id: 'pond.watch_together', place: 'pond', name: '같이 연못 구경 가기', gain: { fun: 20, social: 18 }, hours: [8, 19], group: true, together: 1,
    steps: [S('fish_*|bank_*', 'gaze', 4, 'tilt_look', null, '물고기 찾는 중'), S('fish_*|bank_*', 'peek', 2, 'peek_tiptoe', null, '저기 있다!'), S('fish_*|bank_*', 'talk', 2, 'chat_nod', null, '도란도란')] });
  put({ id: 'plaza.show_find', place: 'plaza', name: '신기한 물건 가져와서 보여 주기', gain: { fun: 24, social: 20 }, hours: [9, 20], group: true, together: 1,
    steps: [S('bench_sit_a|bench_sit_b|board_check_a', 'hand', 2.5, 'plate_hand', 'gem', '이것 봐!'), S('bench_sit_a|bench_sit_b|board_check_a', 'talk', 3, 'chat_nod', 'gem', '어디서 났는지 이야기하는 중'), S('bench_sit_a|bench_sit_b|board_check_a', 'play', 2, 'jump_joy', null, '신기하다!')] });
  // 신기한 물건: 반짝이는 무지갯빛 돌 (구 하나가 아니라 깎인 면과 속빛)
  if (root.VillageProps) {
    root.VillageProps.BUILD.gem = () => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshToonMaterial({ color: '#9fe3ff' }));
      m.scale.set(1, 1.4, 1); m.position.set(0, 0.04, 0.16);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: '#fff3a0' }));
      core.position.copy(m.position);
      const facet = new THREE.Mesh(new THREE.OctahedronGeometry(0.125, 0), new THREE.MeshBasicMaterial({ color: '#f2a0d4', wireframe: true }));
      facet.scale.copy(m.scale); facet.position.copy(m.position);
      g.add(m, core, facet);
      return g;
    };
    root.VillageProps.HAND.gem = 1;
  }

  /* ================= 규칙: 막기·점수·끝났을 때 ================= */
  const L = root.Labor.prototype;
  const dayOf = s => Math.floor(s.minutes / 1440);
  const friendsOf = (s, c, min = 55) => s.chars.filter(o => o !== c && MAINS(o) && !o.hidden && s.persona.bond(c, o) >= min);
  const blocked0 = L.blocked;
  L.blocked = function (c, x) {
    const r = blocked0.call(this, c, x);
    if (r) return r;
    const s = this.sim;
    if ((x.sakeStudy || x.sakeExam) && (c.extra || c.sakeLicense)) return '이미 술 자격이 있어요';
    if (x.sakeExam && (c.sakeStudy || 0) < 3) return '공부가 모자라요';
    if (x.needSake && !c.sakeLicense) return '술 자격증이 없어요';
    if (x.drinkSake && !(c.sake > 0)) return '술이 없어요';
    if (x.passBoard && !c.pendingResult) return '확인할 발표가 없어요';
    if (x.cheer && s.gatherDay !== Math.floor(s.minutes / 1440)) return '오늘은 발표가 없어요';
    if (x.cardGet && !c.cardDue) return '받을 자격증이 없어요';
    if (x.guest && c.id === 'chiikawa') return null;
    if (x.together && !c.extra) {
      const near = friendsOf(s, c).some(o => Math.hypot(o.x - c.x, o.z - c.z) < 90);
      if (!near) return '같이 갈 친구가 없어요';
    }
    if (x.together && c.extra) return '친한 친구끼리 하는 일이에요';
    if (x.together && c.history && (c.history.ids[x.id] || []).includes(dayOf(s))) return '오늘은 벌써 했어요';
    return null;
  };
  const score0 = L.scoreBonus;
  L.scoreBonus = function (c, x) {
    let v = score0.call(this, c, x);
    const s = this.sim;
    if (c.extra) return v;
    if (x.passBoard && c.pendingResult) v += 160;
    if (x.cardGet && c.cardDue) v += 140;
    if (x.sakeStudy && !c.sakeLicense) v += (c.id === 'shisa' ? 30 : 0) + (c.traits.diligent - 0.4) * 30;
    if (x.sakeExam) v += 60;
    if (x.needSake && !(c.sake > 0)) v += 25;
    if (x.drinkSake) v += 20;
    if (x.groceries && !c.groceries) v += 18;
    // 함께 하기는 하루에 한 번쯤: 오늘 이미 했으면 크게 감점
    if (x.together) v += (c.history && (c.history.ids[x.id] || []).includes(dayOf(s)) ? -60 : 10 + (x.together === 2 ? 25 : 0));
    // 같이 일하기: 친한 친구가 오늘 같은 일을 맡았으면 끌린다
    if (x.takeKind && s.chars.some(o => o !== c && o.plate && o.plate.kind === x.takeKind && s.persona.bond(c, o) >= 60)) v += 35;
    // 반복은 지루하다: 같은 상호작용·같은 장소를 최근에 많이 했으면 감점, 안 가 본 곳의 즐길 거리는 가점
    // 단, 돈벌이·공부·시험·잠·밥처럼 꼭 해야 하는 것은 건드리지 않는다
    const must = x.night || x.plate || x.takeKind || x.accept || x.settle || x.earn || x.skill || x.examTake || x.shift || x.isJob || (x.gain.hunger || 0) >= 40;
    if (!must) {
      const h = c.history || (c.history = { ids: {}, places: {}, seen: {} });
      const today = dayOf(s);
      const recent = (h.ids[x.id] || []).filter(d => today - d <= 2).length;
      const placeRecent = (h.places[x.place] || []).filter(d => today - d <= 1).length;
      v -= recent * 14 + placeRecent * 5;
      if (!h.seen[x.place] && (x.gain.fun || 0) >= 6) v += 22;
    }
    // 집밥만 해 먹지 않게: 사흘 연속 집밥이면 사 먹기·외식에 끌린다
    if (/(cook|밥 해)/.test(x.id + x.name) && (c.history && (c.history.ids[x.id] || []).filter(d => dayOf(s) - d <= 3).length >= 3)) v -= 30;
    if (/^mucha\.(bento|shop)|^umaCurry\./.test(x.id) && c.history && Object.keys(c.history.ids).some(k => /cook/.test(k))) v += 12;
    return v;
  };
  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    finish0.call(this, c, x);
    const s = this.sim;
    if (!c.extra) {
      const h = c.history || (c.history = { ids: {}, places: {}, seen: {} });
      const d = dayOf(s);
      (h.ids[x.id] = (h.ids[x.id] || []).filter(q => d - q <= 4)).push(d);
      (h.places[x.place] = (h.places[x.place] || []).filter(q => d - q <= 4)).push(d);
      h.seen[x.place] = 1;
    }
    if (x.sakeStudy) c.sakeStudy = (c.sakeStudy || 0) + 1;
    if (x.sakeExam) {
      const pass = s.random() < 0.45 + c.traits.diligent * 0.3 + (c.sakeStudy || 0) * 0.03;
      if (pass) { c.sakeLicense = true; c.cardDue = '술 자격증'; s.note(`${c.name}: 술 자격 시험 합격!`); s.labor.react(c, 'jump_joy', '술 자격증이다!'); }
      else { c.sakeStudy = Math.floor((c.sakeStudy || 0) / 2); s.note(`${c.name}: 술 자격 시험 불합격`); s.labor.react(c, 'cry', '또 떨어졌어…'); }
    }
    if (x.needSake) c.sake = (c.sake || 0) + 1;
    if (x.drinkSake) { c.sake = Math.max(0, (c.sake || 0) - 1); c.tipsy = s.minutes + 90; }
    if (x.groceries) c.groceries = (c.groceries || 0) + 2;
    if (/cook/.test(x.id) && c.groceries) c.groceries -= 1;
    if (x.passBoard && c.pendingResult) {
      const r = c.pendingResult.r;
      c.pendingResult = null;
      if (s.calendar && Cal && Cal.realAnnounce) Cal.realAnnounce.call(s.calendar, c, r);
      if (r.pass) c.cardDue = r.name;
      // 결과에 따라 기분이 달라진다: 합격은 크게 기쁘고, 불합격은 풀이 죽는다. 같이 본 친구들도 따라 웃거나 위로한다
      c.needs.fun = Math.max(0, Math.min(100, c.needs.fun + (r.pass ? 35 : -25)));
      c.moodFrom = { pass: !!r.pass, until: s.minutes + 240 };
      for (const o of s.chars) {
        if (o === c || o.extra || !o.doing || !/^plaza\.pass_(board|cheer)/.test(o.doing.x.id)) continue;
        if (s.persona.bond(c, o) < 40) continue;
        o.needs.social = Math.min(100, o.needs.social + 10);
        s.labor.react(o, r.pass ? 'applaud' : 'chat_nod', r.pass ? `${c.name} 축하해!` : '다음엔 붙을 거야');
      }
    }
    if (x.cardGet && c.cardDue) {
      (c.cards = c.cards || []).push({ name: c.cardDue, day: dayOf(s) });
      s.note(`${c.name}: ${c.cardDue} 카드를 받았어요`);
      c.cardDue = null;
    }
  };
  // 발표 날 모임: 결과가 붙으면 응시자와 친한 친구들이 다 같이 광장 게시판으로 간다 (2026-11-10 2차)
  put({ id: 'plaza.pass_cheer', place: 'plaza', name: '친구 합격 발표 같이 보기', gain: { social: 12, fun: 6 }, hours: [7, 22], cheer: true, group: true,
    steps: [S('pass_board_*|board_check_a|board_check_b|bench_sit_a|bench_sit_b', 'wait', 3, 'peek_tiptoe', null, '친구 번호 같이 찾는 중'), S('pass_board_*|board_check_a|board_check_b|bench_sit_a|bench_sit_b', 'idle', 2, 'chat_nod', null, '두근두근')] });
  function gather(s) {
    const today = Math.floor(s.minutes / 1440);
    if (s.gatherDay === today || s.hour < 9 || s.hour > 20) return;
    const who = s.chars.filter(c => c.pendingResult && !c.extra);
    if (!who.length) return;
    s.gatherDay = today;
    s.note('합격 발표가 붙었어요! 다들 광장으로 모여요');
    const board = VO.BY_ID['plaza.pass_board'], cheer = VO.BY_ID['plaza.pass_cheer'];
    const free = c => !c.hidden && !(c.doing && (c.doing.x.night || c.doing.x.examTake || c.doing.x.shift));
    for (const c of who) { if (!free(c)) continue; if (c.doing) s.abort(c, ''); c.orders.length = 0; s.order(c, board); }
    for (const o of s.chars) {
      if (o.extra || o.pendingResult || !free(o) || !who.some(c => s.persona.bond(c, o) >= 50)) continue;
      if (o.doing) s.abort(o, '');
      o.orders.length = 0;
      s.order(o, cheer);
    }
  }
  // 게시판을 하루 넘게 안 보러 오면 그대로 반영 (멈춤 방지)
  const Eco = root.Ecology && root.Ecology.prototype;
  if (Eco) {
    const tick0 = Eco.tick;
    Eco.tick = function (dt) {
      tick0.call(this, dt);
      const s = this.sim;
      gather(s);
      for (const c of s.chars) {
        if (c.pendingResult && s.minutes - c.pendingResult.at > 1440 && Cal && Cal.realAnnounce) {
          const r = c.pendingResult.r;
          c.pendingResult = null;
          Cal.realAnnounce.call(s.calendar, c, r);
          if (r.pass) c.cardDue = r.name;
        }
      }
    };
  }
  // 함께 하기: 시작하면 친한 친구(삼인방은 셋 다)를 끌어당긴다
  const P = root.Persona && root.Persona.prototype;
  if (P && P.invite) {
    const invite0 = P.invite;
    P.invite = function (c, x) {
      if (!x.together || c.extra) return invite0.call(this, c, x);
      // 삼인방 모이기는 invite.js가 직접 찾아가 약속을 받는다 (말없이 끌어당기지 않는다)
      if (x.together === 2) return;
      const s = this.sim;
      const list = x.together === 2 ? s.chars.filter(o => o !== c && TRIO.includes(o.id)) : friendsOf(s, c).sort((a, b) => this.bond(c, b) - this.bond(c, a)).slice(0, 2);
      for (const o of list) {
        if (o.plate || o.hidden || (o.doing && (o.doing.x.night || o.doing.x.examTake))) continue;
        if (s.labor.blocked(o, x)) continue;
        o.pull = { x, until: s.minutes + 30 };
      }
    };
  }
  // 저장: 새로 생긴 상태
  const save0 = L.save, load0 = L.load;
  L.save = function (c) { return Object.assign(save0.call(this, c), { sakeLicense: c.sakeLicense, sakeStudy: c.sakeStudy, sake: c.sake, cards: c.cards, cardDue: c.cardDue, pendingResult: c.pendingResult, groceries: c.groceries, history: c.history }); };
  if (load0) L.load = function (c, r) { load0.call(this, c, r); if (r) for (const k of ['sakeLicense', 'sakeStudy', 'sake', 'cards', 'cardDue', 'pendingResult', 'groceries', 'history']) if (r[k] !== undefined) c[k] = r[k]; };

  root.TownSets = { muchaDef, curryDef };
}(typeof self !== 'undefined' ? self : this));
