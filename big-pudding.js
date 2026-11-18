'use strict';

// 치이카와 심즈 — 거대 단단한 푸딩 다시 짓기 (2026-11-12 이재헌님: 푸딩 위에서 우사기만 빙글빙글, 푸딩 기사 삭제)
// 하얀 접시 위 단단한 커스터드 푸딩: 아래가 넓은 원기둥, 위에 흘러내리는 캐러멜, 한쪽에 생크림과 체리.
// 옆에 기대 놓은 나무 사다리로 올라가고, 큰 은숟가락이 미끄럼틀이 되어 숟가락 오목한 곳에 쏙 내려앉는다.
// 우사기만: 사다리 → 꼭대기 한가운데서 두 팔 들고 빙글빙글 → 야하! → 숟가락 미끄럼
(function (root) {
  if (root.GLB_MAP) delete root.GLB_MAP.bigPudding;
  if (root.GLB_PLACES) root.GLB_PLACES.delete('bigPudding');

  const TOP = 4.2;                 // 캐러멜 윗면 높이 (climb_top이 서는 곳)
  const CUSTARD = '#f6d77e', CUSTARD_D = '#ecc464', CARAMEL = '#b8692e', CARAMEL_D = '#8f4a1d', PLATE = '#fbf8f1', SILVER = '#dfe3e8';
  const SO = {
    ladder_stand: [-4.6, 1.2, 0, -3.2, 1.2],
    climb_top: [0, 0.3, TOP, 0, 3],
    slide_start: [0, 2.35, TOP, 0, 6],
    slide_end: [0, 6.5, 0.12, 0, 9],
    sign_look: [4.4, 4.9, 0, 5.4, 4.1],
  };
  const AS = root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {});
  AS.bigPudding = Object.assign(AS.bigPudding || {}, SO);

  const build = function (k) {
    // 접시: 넓고 낮은 흰 접시와 테두리 무늬
    const plate = new THREE.LatheGeometry([[0, 0], [4.3, 0], [4.6, 0.12], [4.75, 0.3], [4.6, 0.32], [4.3, 0.2], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
    k.place(plate, mat(PLATE), 0, 0, 0, 1, 1, 1, inkBig);
    k.place(new THREE.TorusGeometry(4.45, 0.04, 5, 64), mat('#9fc7d8'), 0, 0.24, 0, 1, 1, 1, null).rotation.x = Math.PI / 2;
    // 푸딩 몸통: 아래가 살짝 퍼지고 옆이 매끈하다
    const body = [[0, 0.2], [3.3, 0.2], [3.5, 0.32], [3.52, 0.5], [3.12, 3.7], [3.02, 3.95], [0, 3.95]].map(([x, y]) => new THREE.Vector2(x, y));
    k.place(new THREE.LatheGeometry(body, 48), mat(CUSTARD), 0, 0, 0, 1, 1, 1, inkBig);
    k.place(new THREE.TorusGeometry(3.46, 0.06, 6, 64), mat(CUSTARD_D), 0, 0.6, 0, 1, 1, 1, null).rotation.x = Math.PI / 2;
    // 캐러멜: 살짝 볼록한 뚜껑 + 옆으로 흘러내린 방울 (아래→위 순서여야 면이 바깥을 본다)
    const cap = [[0, TOP], [1.5, TOP - 0.02], [2.7, TOP - 0.07], [3.07, 3.98], [3.1, 3.86], [3.0, 3.8], [0, 3.8]].reverse().map(([x, y]) => new THREE.Vector2(x, y));
    k.place(new THREE.LatheGeometry(cap, 48), mat(CARAMEL), 0, 0, 0, 1, 1, 1, inkThin);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + 0.1;
      if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue;            // 숟가락이 걸친 앞쪽은 비워 둔다
      const len = 0.35 + ((i * 7) % 5) * 0.16, y = 3.85 - len / 2;
      const r = 3.04 + (3.85 - y) * 0.03 + 0.03;
      const d = k.ball(Math.sin(a) * r, y, Math.cos(a) * r, 0.18, len / 2 + 0.06, 0.1, CARAMEL, 0);
      d.rotation.y = a;
      k.ball(Math.sin(a) * (r + 0.01), y - len / 2, Math.cos(a) * (r + 0.01), 0.19, 0.17, 0.12, CARAMEL, 0).rotation.y = a;
    }
    // 반짝임 줄
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.4), new THREE.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0.65 }));
    hl.position.set(-1.6, 2.1, 2.7); hl.rotation.set(0, -0.55, 0.06); k.group.add(hl);
    // 생크림과 체리 (가운데 빙글 자리를 비워 한쪽에)
    const cx = 1.5, cz = -1.2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.ball(cx + Math.sin(a) * 0.42, TOP + 0.2, cz + Math.cos(a) * 0.42, 0.26, 0.24, 0.26, '#fffaf0', i % 2); }
    k.ball(cx, TOP + 0.48, cz, 0.36, 0.32, 0.36, '#fffaf0', 1);
    k.cone(cx, TOP + 0.66, cz, 0.18, 0.34, '#fffaf0', 1);
    k.ball(cx + 0.1, TOP + 1.12, cz + 0.05, 0.22, 0.21, 0.22, '#d9363e', 1);
    const stem = k.box(cx + 0.18, TOP + 1.42, cz + 0.05, 0.03, 0.4, 0.03, '#5f7d4a', 0); stem.rotation.z = -0.35;
    k.ball(cx + 0.02, TOP + 1.2, cz + 0.2, 0.05, 0.05, 0.03, '#ffffff', 0);
    // 나무 사다리: 왼쪽 옆면에 기대 놓았다 (발판 9칸)
    const bx = -4.25, tx = -3.05, bz = 1.2;
    const len = Math.hypot(TOP - 0.1, bx - tx), ang = Math.atan2(tx - bx, TOP);
    for (const dz of [-0.36, 0.36]) {
      const rail = k.box((bx + tx) / 2, TOP / 2, bz + dz, 0.1, len, 0.1, '#b98a5c', 1);
      rail.rotation.z = -ang;
    }
    for (let i = 1; i <= 9; i++) {
      const t = i / 10;
      k.cyl(bx + (tx - bx) * t, TOP * t, bz, 0.04, 0.72, '#8a6242', 0).rotation.x = Math.PI / 2;
    }
    // 은숟가락 미끄럼틀: 손잡이 끝을 푸딩 앞 가장자리에 걸치고, 오목한 머리가 땅에 닿는다
    const z0 = 2.75, z1 = 6.5, y0 = TOP - 0.08, y1 = 0.1;
    const sl = Math.atan2(y0 - y1, z1 - z0), L = Math.hypot(y0 - y1, z1 - z0 - 0.9);
    const handle = k.place(roundBoxGeo(1.0, 0.12, L, 0.05), mat(SILVER), 0, (y0 + y1 + 0.3) / 2, (z0 + z1 - 0.9) / 2, 1, 1, 1, inkBig);
    handle.rotation.x = sl;
    for (const s of [-1, 1]) { const lip = k.place(roundBoxGeo(0.08, 0.16, L, 0.03), mat('#c7ccd3'), s * 0.5, (y0 + y1 + 0.3) / 2 + 0.08, (z0 + z1 - 0.9) / 2, 1, 1, 1, null); lip.rotation.x = sl; }
    const bowlG = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bowl = new THREE.Mesh(bowlG, mat(SILVER)); bowl.material.side = THREE.DoubleSide;
    bowl.position.set(0, 0.42, z1); bowl.scale.set(1.1, 0.34, 1.45); k.group.add(bowl);
    k.place(new THREE.TorusGeometry(1, 0.05, 6, 40), mat('#c7ccd3'), 0, 0.42, z1, 1.1, 1.45, 1, null).rotation.x = Math.PI / 2;
    // 안내판
    k.box(5.4, 0.7, 4.1, 0.12, 1.4, 0.12, '#8a6242', 1);
    const sign = k.box(5.4, 1.45, 4.1, 1.6, 0.8, 0.1, '#fff4dc', 2); sign.rotation.y = -0.85;
    k.paint(5.36, 1.12, 4.14, 1.4, 0.66, g => drawText(g, '단단한 푸딩', 0, 0.33, 1.3, 0.5, '#8f4a1d'), -0.85);
    k.solidCircle(0, 0, 3.6);
    k.solidCircle(5.4, 4.1, 0.3);
  };
  if (typeof BUILDERS !== 'undefined') BUILDERS.bigPudding = build;

  // 우사기 전용: 푸딩 꼭대기에서 두 팔 들고 빙글빙글
  const MA = root.MinorActs;
  if (MA && MA.C && typeof ANIMS !== 'undefined') {
    const spin = MA.C(2.4, {
      rotY: '0:0 1.2:6.2832l 2.4:12.5664l',
      posY: '0:0 .3:.12 .6:0 .9:.12 1.2:0 1.5:.12 1.8:0 2.1:.12 2.4:0',
      rotZ: '0:.06 .6:-.06 1.2:.06 1.8:-.06 2.4:.06',
      footLY: '0:0 .3:.08 .6:0 1.5:0 1.8:.08 2.1:0 2.4:0', footRY: '0:0 .9:0 1.2:.08 1.5:0 2.1:0 2.4:.08',
    }, {
      R: 'high(.24,-.2,0)@0 high(.3,-.24,0)@1.2 high(.24,-.2,0)@2.4', L: 'high(-.24,-.2,0)@0 high(-.3,-.24,0)@1.2 high(-.24,-.2,0)@2.4',
    }, [[0, 'joy']], { meta: { name: '푸딩 위에서 빙글빙글', phase: 'main', act: 'play', tags: ['우사기', '푸딩'] } });
    spin.id = 'pudding_spin';
    ANIMS.pudding_spin = spin;
  }
  const VO = root.VillageObjects;
  if (VO) {
    const S = (socket, act, min, clip, label) => ({ socket, act, min, clip, prop: null, label });
    const x = { id: 'bigPudding.usagi_spin', place: 'bigPudding', name: '푸딩 위에서 빙글빙글', only: ['usagi'], hours: [8, 19], gain: { fun: 45, energy: -6 },
      steps: [S('ladder_stand', 'climb', 2, 'ladder_climb', '사다리 타고 영차영차'), S('climb_top', 'spin', 6, 'pudding_spin', '푸딩 꼭대기에서 빙글빙글'),
        S('climb_top', 'cheer', 1.5, 'jump_joy', '야하!'), S('slide_start', 'slide', 2, 'slide_down', '숟가락 미끄럼 슝'), S('slide_end', 'land', 1.5, 'jump_joy', '숟가락에 쏙')] };
    const i = VO.LIST.findIndex(q => q.id === x.id);
    if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
  }
}(typeof self !== 'undefined' ? self : this));
