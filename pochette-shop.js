'use strict';

// 치이카와 심즈 — 포셰트 요로이의 가게 (2026-11-09 이재헌 지시: 렌타사이클 자리를 원작의 다른 건물로)
// 근거: 바이블 장소표 「포셰트 요로이의 가게/노점 — 포셰트의 요로이씨, 파자마·포셰트 판매, 개점 대기 줄」
// 벽 가득 걸린 포셰트, 파자마 옷걸이, 거울, 계산대. 가게 앞에 개점을 기다리는 줄
(function (root) {
  const W = 13, D = 11, H = 5.6;
  const PINK = '#f6d3dc', ROSE = '#e79bb0', CREAM = '#fff4e4', WOOD = '#a97c50';
  const POUCH = ['#f4a9bd', '#9fd0ea', '#f3d27a', '#a8d8b4', '#c9b6e4', '#f0a58c'];

  if (root.GLB_MAP) delete root.GLB_MAP.pochette;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('pochette');

  const X = W / 2 - 0.4, Z = D / 2 - 0.4;
  const so = {
    door_front: [0, D / 2 + 2.6, 0, 0, D / 2],
    sign_look: [-4.2, D / 2 + 2.8, 0, -4.2, D / 2],
    rack_look_1: [-3.4, -Z + 2, 0, -3.4, -Z],
    rack_look_2: [0, -Z + 2, 0, 0, -Z],
    rack_look_3: [3.4, -Z + 2, 0, 3.4, -Z],
    pajama_look_1: [-X + 2.2, -0.6, 0, -X, -0.6],
    pajama_look_2: [-X + 2.2, 2.2, 0, -X, 2.2],
    mirror_stand: [X - 2, -1.6, 0, X, -1.6],
    counter_stand: [X - 3.6, 2.4, 0, X - 1.2, 2.4],
    staff_side: [X - 0.6, 2.4, 0, X - 3, 2.4],
  };
  for (let i = 0; i < 5; i++) so[`line_${i + 1}`] = [1.4 + i * 1.5, D / 2 + 2.4, 0, 0, D / 2 + 1];
  root.ASSET_SOCKETS.pochette = so;

  /* ---------- 동작 ---------- */
  const { C } = root.MinorActs;
  const CLIPS = {
    rack_scan: C(3, { rotY: '0:-.3 1.5:.3 3:-.3', rotX: '0:-.1 1.5:-.14 3:-.1', posY: '0:0 .75:.05 1.5:0 2.25:.05 3:0' }, {
      R: 'high(.2,-.2,0)@0 high(-.06,-.2,0)@1.5 high(.2,-.2,0)@3', L: 'hip(-.2,.1,0)@0 hip(-.2,.1,0)@3',
    }, 'normal'),
    pouch_pick: C(1.8, { posY: '0:0 .6:.12o .95:.12 1.3:0 1.8:0', rotX: '0:-.1 .95:-.16 1.3:.04 1.8:.02', footLY: '0:0 .6:.08 .95:.08 1.3:0', footRY: '0:0 .6:.08 .95:.08 1.3:0' }, {
      R: 'high(.1,-.18,0)@0 high(.1,-.14,0)@.9 chest(.2,.08,.26)@1.4 chest(.2,.08,.26)@1.8', L: 'hip(-.2,.1,0)@0 chest(.1,.08,.26)@1.4 chest(.1,.08,.26)@1.8',
    }, [[0, 'normal'], [1.3, 'joy']], { once: true }),
    pouch_turn: C(3, { rotX: '0:.1 1.5:.16 3:.1', rotZ: '0:.06 1.5:-.06 3:.06', propTilt: '0:-.3 1.5:.5 3:-.3' }, {
      R: 'chest(.2,.08,.26)@0 chest(.3,.14,.28)@1.5 chest(.2,.08,.26)@3', L: 'chest(.1,.08,.26)@0 chest(.14,.04,.28)@1.5 chest(.1,.08,.26)@3',
    }, [[0, 'normal'], [1.5, 'smile']]),
    pouch_back: C(1.5, { posY: '0:0 .7:.12o 1:.12 1.5:0', rotX: '0:.04 .8:-.14 1.5:0' }, {
      R: 'chest(.2,.08,.26)@0 high(.1,-.14,0)@.8 high(.1,-.14,0)@1.1 chest(.3,.1,.26)@1.5', L: 'chest(.1,.08,.26)@0 hip(-.2,.1,0)@1.5',
    }, 'smile', { once: true }),
    // 거울 앞: 포셰트를 옆구리에 대 보고 빙글 돌아 확인한다
    mirror_try: C(3.4, { rotY: '0:0 1:0 1.8:6.283 3.4:6.283', rotZ: '0:.08 .8:-.08 1.8:0 2.6:.12 3.4:.12', posY: '0:0 1:0 1.4:.16o 1.8:0 3.4:0', squash: '0:1 1.8:.95s 2:1b 3.4:1' }, {
      R: 'chest(.34,-.06,.2)@0 chest(.34,-.06,.2)@3.4', L: 'cheek(.2,.1,.12)@2.2 cheek(.2,.1,.12)@3.4',
    }, [[0, 'normal'], [1.8, 'joy']], { once: true }),
    pajama_feel: C(2.6, { rotX: '0:.04 1.3:.1 2.6:.04', rotY: '0:-.12 1.3:.12 2.6:-.12', squash: '0:1 1.3:.97 2.6:1' }, {
      R: 'front(.16,.3,0)@0 front(.0,.18,0)@1.3 front(.16,.3,0)@2.6', L: 'cheek(.2,.02,.14)@0 cheek(.2,.02,.14)@2.6',
    }, [[0, 'normal'], [1, 'smile']]),
    line_wait: C(3, { rotZ: '0:.05 .75:-.05 1.5:.05 2.25:-.05 3:.05', posY: '0:0 .4:.1o .8:0 3:0', rotY: '0:.1 1.5:-.1 3:.1', footLY: '0:0 .4:.08 .8:0 3:0', footRY: '0:0 1.5:0 1.9:.08 2.3:0 3:0' }, {
      R: 'chest(.3,.04,.1)@0 chest(.3,.04,.1)@3', L: 'chest(.3,.04,.1)@0 chest(.3,.04,.1)@3',
    }, [[0, 'normal'], [1.2, 'smile']]),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);

  const { BUILD, HAND } = root.VillageProps;
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  // 포셰트: 둥근 몸통, 덮개, 단추, 어깨끈
  function makePouch(color) {
    const g = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), toon(color));
    bag.scale.set(1, 0.82, 0.42);
    bag.position.z = 0.14;
    const flap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#fff4e4'));
    flap.scale.set(1, 0.6, 0.5);
    flap.position.set(0, 0.03, 0.17);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toon('#e3bb4a'));
    button.position.set(0, -0.02, 0.24);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 20, Math.PI), toon('#a97c50'));
    strap.position.set(0, 0.1, 0.14);
    g.add(bag, flap, button, strap);
    return g;
  }
  BUILD.pochette = () => makePouch('#f4a9bd');
  HAND.pochette = 1;

  /* ---------- 상호작용 ---------- */
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const VO = root.VillageObjects;
  const add = x => { VO.LIST.push(x); VO.BY_ID[x.id] = x; };
  add({ id: 'pochette.browse', place: 'pochette', name: '포셰트 구경하기', hours: [10, 19], gain: { fun: 18 }, minor: true, steps: [
    S('rack_look_*', 'browse', 3, 'rack_scan', null, '벽의 포셰트를 훑어보는 중'),
    S('rack_look_*', 'take', 1.8, 'pouch_pick', 'pochette', '하나 내려 보는 중'),
    S('rack_look_*', 'read', 3, 'pouch_turn', 'pochette', '이리저리 살펴보는 중'),
    S('rack_look_*', 'take', 1.5, 'pouch_back', 'pochette', '도로 거는 중'),
  ] });
  add({ id: 'pochette.mirror', place: 'pochette', name: '거울 앞에서 매어 보기', hours: [10, 19], gain: { fun: 22 }, minor: true, steps: [
    S('rack_look_*', 'take', 1.8, 'pouch_pick', 'pochette', '마음에 드는 걸 고르는 중'),
    S('mirror_stand', 'pose', 3.4, 'mirror_try', 'pochette', '거울 앞에서 돌아보는 중'),
  ] });
  add({ id: 'pochette.pajama', place: 'pochette', name: '파자마 만져 보기', hours: [10, 19], gain: { fun: 16 }, minor: true, steps: [
    S('pajama_look_*', 'browse', 3, 'rack_scan', null, '파자마를 고르는 중'),
    S('pajama_look_*', 'read', 3, 'pajama_feel', null, '보들보들한지 만져 보는 중'),
  ] });
  add({ id: 'pochette.buy', place: 'pochette', name: '포셰트 사기', hours: [10, 19], cost: 700, gain: { fun: 40 }, steps: [
    S('rack_look_*', 'take', 1.8, 'pouch_pick', 'pochette', '포셰트를 고르는 중'),
    S('counter_stand', 'pay', 2, 'pay_wait', 'pochette', '값을 치르는 중'),
  ] });
  add({ id: 'pochette.line', place: 'pochette', name: '개점 기다리며 줄 서기', hours: [8, 10], gain: { fun: 12, social: 6 }, group: true, minor: true, steps: [
    S('line_*', 'wait', 8, 'line_wait', null, '문 열기를 기다리는 중'),
  ] });
  add({ id: 'pochette.sign_look', place: 'pochette', name: '간판 보기', hours: [6, 21], gain: { fun: 3 }, steps: [S('sign_look', 'read', 2, 'board_read', null, '간판 읽는 중'), S('sign_look', 'gaze', 1.5, 'read_nod', null, '고개를 끄덕이는 중')] });
  add({ id: 'pochette.job_fold', place: 'pochette', name: '포셰트 가게 정리', earn: 450, gain: { energy: -8 }, hours: [8, 20], isJob: true, steps: [
    S('rack_look_*', 'take', 4, 'pouch_back', 'pochette', '포셰트를 거는 중'),
    S('pajama_look_*', 'browse', 8, 'pajama_feel', null, '파자마를 개는 중'),
    S('staff_side', 'talk', 4, 'talk_order', null, '손님 맞는 중'),
  ] });

  /* ---------- 건물 ---------- */
  function shopDef() {
    return {
      area: { x: 0, z: 0, w: W, d: D },
      exterior(k, api) {
        k.shop({
          w: W, d: D, h: H, wall: PINK, roof: ROSE, roofType: 'hip', rh: 3.2, trim: WOOD, base: '#e8cdb0',
          front: f => {
            f.sign(0, 4.55, 9.4, 1.3, '포셰트', CREAM, '#b5574f');
            f.place(doorFrameGeo(3.2, 3.8, false), mat(WOOD), 0, 0, 0, 1, 1, 1, inkThin);
            const leaf = s => f.box(s * 0.75, 1.8, 0.1, 1.45, 3.6, 0.12, '#f7e4c8', 1);
            api.door(0, D / 2, [[leaf(-1), -1.3], [leaf(1), 1.3]]);
            f.noren(0, 3.8, 2.6, ROSE, '');
            f.win(-4.1, 2.5, 3, 2.3, { frame: WOOD, curtain: '#fff4e4' });
            f.win(4.1, 2.5, 3, 2.3, { frame: WOOD, curtain: '#fff4e4' });
          },
        });
      },
      yard(k) {
        // 입구 옆 입간판과 줄 서는 곳 표시
        k.box(-4.2, 0.8, D / 2 + 1.2, 0.14, 1.6, 0.14, WOOD, 1);
        const b = k.sub(-4.2, D / 2 + 1.2);
        b.box(0, 1.5, 0, 1.8, 1.1, 0.1, CREAM, 1);
        b.paint(0, 1, 0.07, 1.6, 0.9, g => drawText(g, '포셰트', 0, 0.45, 1.4, 0.5, '#b5574f'));
        for (let i = 0; i < 5; i++) k.cyl(1.4 + i * 1.5, 0.03, D / 2 + 2.4, 0.5, 0.04, '#f3e3cc', 0);
      },
      interior(k, api) {
        k.box(0, -0.01, 0, W - 0.2, 0.1, D - 0.2, '#f3e7d3', 0);
        floorMarks(k, W - 0.8, D - 0.8, 0, () => true);
        const wall = { h: 5, t: 0.4, color: CREAM, skin: 'plaster', ink: 1 };
        const DOOR = 1.6;
        api.walls([[-X, Z], [-X, -Z], [X, -Z], [X, Z]], wall);
        api.walls([[-X, Z], [-DOOR, Z]], wall);
        api.walls([[DOOR, Z], [X, Z]], wall);
        api.walls([[-DOOR, Z], [DOOR, Z]], { ...wall, h: 1.2, y0: 3.8, skin: null });
        // 뒷벽: 페그보드에 줄지어 걸린 포셰트
        k.box(0, 2.6, -Z + 0.12, W - 2, 3.4, 0.14, '#efd9b8', 1);
        for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
          const x = -4.8 + i * 1.2;
          const y = 3.7 - r * 1.05;
          k.cyl(x, y + 0.3, -Z + 0.3, 0.04, 0.2, '#a97c50');
          const m = makePouch(POUCH[(i + r * 2) % POUCH.length]);
          m.scale.setScalar(1.7);
          m.position.set(x, y, -Z + 0.2);
          k.group.add(m);
        }
        // 왼쪽 벽: 파자마 옷걸이
        k.cyl(-X + 0.7, 1.6, -3, 0.06, 3.2, WOOD);
        k.cyl(-X + 0.7, 1.6, 4, 0.06, 3.2, WOOD);
        const rail = k.box(-X + 0.7, 3.2, 0.5, 0.08, 0.08, 7.2, WOOD, 0);
        rail.castShadow = false;
        for (let i = 0; i < 7; i++) {
          const z = -2.4 + i * 0.95;
          const c = POUCH[i % POUCH.length];
          k.box(-X + 0.7, 2.3, z, 0.2, 1.7, 0.78, c, 1);
          k.box(-X + 0.86, 2.9, z, 0.04, 0.14, 0.34, '#fff4e4', 0);
          k.box(-X + 0.7, 3.14, z, 0.05, 0.12, 0.05, '#7d6250', 0);
        }
        // 오른쪽: 거울과 계산대
        k.box(X - 0.1, 2.3, -1.6, 0.12, 3.6, 1.8, WOOD, 1);
        k.box(X - 0.2, 2.3, -1.6, 0.05, 3.3, 1.5, '#d6edf3', 0);
        k.box(X - 2.4, 0.6, 2.4, 1.2, 1.2, 3.2, '#e8cdb0', 2);
        k.box(X - 2.4, 1.26, 2.4, 1.5, 0.12, 3.5, WOOD, 1);
        k.box(X - 2.4, 1.46, 1.4, 0.5, 0.3, 0.5, '#f6efdf', 1);
        for (let i = 0; i < 3; i++) {
          const m = makePouch(POUCH[i + 2]);
          m.scale.setScalar(1.3);
          m.position.set(X - 2.5, 1.45, 2.4 + i * 0.75);
          k.group.add(m);
        }
      },
    };
  }
  BUILDERS.pochette = (k, p) => root.Interiors.mount(k, p, shopDef());
}(typeof self !== 'undefined' ? self : this));
