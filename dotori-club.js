'use strict';

// 치이카와 심즈 — 도토리 클럽 (2026-11-12 이재헌님 요청, 2026-11-11 결정: 지하 클럽)
// 숲가 이끼 언덕 속 지하 클럽. 밖에서는 큰 그루터기를 얹은 둥근 언덕과 도토리 모양 문, 문 앞으로 내려가는 흙계단만 보인다.
// 들어가면 언덕이 걷히고 흙벽에 뿌리가 늘어진 동굴 같은 방이 열린다:
//  · 깜박이는 색 타일 무대(춤판), 천장에 빙글 도는 도토리 미러볼, 벽을 쓰는 색 조명, 도토리 꼬마전구 줄
//  · 우사기의 DJ 자리: 그루터기 위에서 도토리를 문질러 스크래치 (우사기 전용)
//  · 통나무 스피커, 벽가 통나무 의자와 도토리 주스 선반
// 들어온 아이는 모두 도토리 모자를 쓰고 엉덩이를 흔든다 (클럽 안에서만 모자가 보인다)
(function (root) {
  const W = 6.2, D = 5.0, DOOR = 1.5;                 // 방 반폭·반깊이, 문 반폭 (문은 +z)
  const EARTH = '#8a6648', EARTH_D = '#6f5039', ROOT = '#5e4330', MOSS = '#8fb06e', MOSS_D = '#6f9a58';
  const ACORN = '#b57a45', CAP = '#7a5130';
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  const live = { tiles: [], ball: null, beams: [], bulbs: [] };
  const LIGHTS = ['#ff9fb8', '#9fe0ff', '#ffe28a', '#b9f0a0', '#d7b8ff'];

  // 소켓
  const SO = { door_front: [0, D + 2.2, 0, 0, D], dj_stand: [0, -3.0, 0, 0, -4.2] };
  const DANCE = [[-3, -0.6], [-1, -0.9], [1, -0.9], [3, -0.6], [-2, 1.2], [0, 1.0], [2, 1.2], [-3.6, 2.6], [3.6, 2.6]];
  DANCE.forEach(([x, z], i) => { SO[`dance_${i + 1}`] = [x, z, 0, x * 0.6, -3.6]; });
  SO.bench_sit_1 = [-5.3, 2.6, 0.5, -3, 2.6];
  SO.bench_sit_2 = [5.3, 2.6, 0.5, 3, 2.6];
  (root.ASSET_SOCKETS || (root.ASSET_SOCKETS = {})).dotoriClub = SO;

  function acorn(k, x, y, z, s, ry = 0) {
    k.ball(x, y, z, s * 0.8, s, s * 0.8, ACORN, 1);
    k.ball(x, y + s * 0.62, z, s * 0.86, s * 0.42, s * 0.86, CAP, 1);
    const st = k.cyl(x, y + s * 1.02, z, s * 0.12, s * 0.3, ROOT, 0); st.rotation.z = 0.2 + ry;
    k.ball(x - s * 0.28, y + s * 0.1, z + s * 0.62, s * 0.14, s * 0.3, s * 0.06, '#d9a46c', 0);    // 반짝임
  }

  const DEF = {
    area: { x: 0, z: 0.2, w: W * 2 + 0.6, d: D * 2 + 0.8 },
    // 밖: 이끼 언덕 + 그루터기 + 도토리 문 + 흙계단 + 간판
    exterior(k) {
      const hill = k.ball(0, -1.2, -0.3, W + 1.6, 5.6, D + 1.4, MOSS, 2);
      hill.scale.y = 5.6;
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; k.ball(Math.sin(a) * (W + 0.6), 1.2 + (i % 3) * 0.5, -0.3 + Math.cos(a) * (D + 0.2), 1.4, 1.0, 1.2, i % 2 ? MOSS_D : MOSS, 0); }
      // 꼭대기 그루터기와 뿌리
      k.cyl(0.8, 4.9, -1.2, 2.2, 1.6, '#9a7350', 2);
      k.cyl(0.8, 5.72, -1.2, 2.05, 0.06, '#d8b583', 0);
      for (let r = 0.5; r < 2; r += 0.45) k.place(new THREE.TorusGeometry(r, 0.03, 4, 28), mat('#b08a5c'), 0.8, 5.76, -1.2, 1, 1, 1, null).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const rt = k.box(0.8 + Math.sin(a) * 2.3, 4.3, -1.2 + Math.cos(a) * 2.3, 0.5, 0.4, 1.4, '#8a6242', 1); rt.rotation.y = a; rt.rotation.x = 0.5; }
      // 문 앞 흙길과 내려가는 계단 (문이 언덕 속으로 반쯤 묻힌 느낌)
      k.box(0, 0.02, D + 2.2, 3.4, 0.04, 2.6, '#a8865f', 0);
      for (let i = 0; i < 4; i++) k.box(0, 0.06, D + 0.6 + i * 0.5, 3.2 - i * 0.1, 0.08, 0.42, i % 2 ? '#b69468' : '#a7855c', 1);
      // 도토리 모양 문: 둥근 갓 지붕 + 나무 문짝 + 동그란 손잡이
      k.ball(0, 3.55, D + 0.3, 2.1, 0.9, 1.0, CAP, 2);
      for (let i = 0; i < 9; i++) k.ball(-1.6 + i * 0.4, 3.3 + Math.sin((i / 8) * Math.PI) * 0.5, D + 1.12, 0.16, 0.14, 0.08, '#8f6440', 0);
      k.place(doorFrameGeo(2.9, 3.2, true, 0.22, 0.28), mat('#9a6a3e'), 0, 0, D + 0.4, 1, 1, 1, inkBig);
      k.box(0, 1.5, D + 0.38, 2.6, 3.0, 0.12, '#6a4128', 1);
      for (let i = -2; i <= 2; i++) k.box(i * 0.5, 1.5, D + 0.45, 0.04, 2.9, 0.02, '#5a3520', 0);
      k.ball(0.85, 1.5, D + 0.5, 0.12, 0.12, 0.08, '#e3bb4a', 1);
      // 간판: 도토리 둘을 단 나무판
      k.box(-3.0, 1.0, D + 1.8, 0.14, 2.0, 0.14, '#8a6242', 1);
      const sb = k.box(-3.0, 2.2, D + 1.8, 2.4, 0.9, 0.14, '#f1e2bb', 2); sb.rotation.y = 0.25;
      k.paint(-3.04, 1.84, D + 1.9, 2.2, 0.72, g => drawText(g, '도토리 클럽', 0, 0.36, 2.0, 0.56, '#6a4128'), 0.25);
      acorn(k, -4.1, 2.75, D + 1.6, 0.3); acorn(k, -1.95, 2.75, D + 2.05, 0.3);
      // 문 옆 도토리 등불
      for (const s of [-1, 1]) {
        k.box(s * 1.9, 1.2, D + 0.9, 0.08, 2.4, 0.08, ROOT, 0);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), glow('#ffd98a')); lamp.position.set(s * 1.9, 2.2, D + 1.05); lamp.scale.y = 1.2; k.group.add(lamp);
        k.ball(s * 1.9, 2.45, D + 1.05, 0.26, 0.12, 0.26, CAP, 1);
      }
    },
    // 안: 흙벽 방
    interior(k, api) {
      // 바닥: 짙은 나무판 + 가운데 색 타일 춤판
      k.box(0, -0.01, 0, W * 2 + 0.4, 0.06, D * 2 + 0.4, '#5a4234', 0);
      for (let i = 0; i < 16; i++) k.box(-W + 0.4 + i * (W * 2 - 0.8) / 15, 0.025, 0, 0.03, 0.01, D * 2, '#4a3428', 0);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 1.15), glow(LIGHTS[(i + j * 2) % LIGHTS.length]));
        t.position.set(-3.0 + i * 1.2, 0.04, -1.5 + j * 1.2); k.group.add(t);
        t.userData.i = i + j * 6; live.tiles.push(t);
      }
      // 흙벽: 뿌리가 늘어지고 군데군데 돌이 박혔다
      const wall = { h: 4.6, t: 0.6, color: EARTH, skin: null, ink: 1 };
      api.walls([[-W, D], [-W, -D], [W, -D], [W, D]], wall);
      api.walls([[-W, D], [-DOOR, D]], wall);
      api.walls([[DOOR, D], [W, D]], wall);
      api.walls([[-DOOR, D], [DOOR, D]], { ...wall, h: 1.4, y0: 3.2 });
      for (let i = 0; i < 14; i++) {
        const side = i % 3, t = (i * 0.37) % 1;
        const [x, z, ry] = side === 0 ? [-W + 2 * W * t, -D + 0.35, 0] : side === 1 ? [-W + 0.35, -D + 2 * D * t, Math.PI / 2] : [W - 0.35, -D + 2 * D * t, -Math.PI / 2];
        const len = 1.2 + (i % 4) * 0.45;
        const r = k.cyl(x, 4.4 - len / 2, z, 0.06 + (i % 3) * 0.02, len, ROOT, 0); r.rotation.z = ((i % 5) - 2) * 0.08;
        if (i % 4 === 0) k.ball(x, 4.4 - len, z, 0.1, 0.14, 0.1, MOSS, 0);
        if (i % 3 === 1) k.ball(x + (side ? 0 : 0.5), 1.2 + (i % 4) * 0.6, z + (side === 1 ? 0.4 : side === 2 ? -0.4 : 0), 0.35, 0.28, 0.2, '#9a8f84', 1);
      }
      // 도토리 꼬마전구 줄: 벽 위를 따라 처지게
      for (const [ax, az, bx, bz] of [[-W + 0.5, -D + 0.5, W - 0.5, -D + 0.5], [-W + 0.5, -D + 0.5, -W + 0.5, D - 0.6], [W - 0.5, -D + 0.5, W - 0.5, D - 0.6]]) {
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = 3.9 - Math.sin((t * 3 % 1) * Math.PI) * 0.35;
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glow(LIGHTS[i % LIGHTS.length])); b.position.set(x, y, z); b.scale.y = 1.25; k.group.add(b); live.bulbs.push(b);
          k.ball(x, y + 0.09, z, 0.09, 0.05, 0.09, CAP, 0);
        }
      }
      // DJ 자리: 그루터기 턴테이블 (윗면 나이테 + 도토리 레코드 둘) 뒤에 통나무 스피커
      k.cyl(0, 0.32, -4.0, 1.0, 0.64, '#9a7350', 2);
      k.cyl(0, 0.65, -4.0, 0.95, 0.03, '#d8b583', 0);
      for (let r = 0.25; r < 0.95; r += 0.22) k.place(new THREE.TorusGeometry(r, 0.012, 4, 24), mat('#b08a5c'), 0, 0.67, -4.0, 1, 1, 1, null).rotation.x = Math.PI / 2;
      for (const dx of [-0.5, 0.5]) { const rec = k.cyl(dx, 0.69, -4.05, 0.32, 0.03, '#3a2a26', 0); rec.userData.spin = 1; k.cyl(dx, 0.71, -4.05, 0.1, 0.02, ACORN, 0); }
      for (const s of [-1, 1]) {
        const lg = k.cyl(s * 2.4, 0.9, -4.3, 0.75, 1.8, '#8a6242', 2);
        k.cyl(s * 2.4, 1.0, -3.56, 0.5, 0.04, '#3a2a26', 0).rotation.x = Math.PI / 2;
        k.cyl(s * 2.4, 1.0, -3.54, 0.2, 0.04, '#6a5040', 0).rotation.x = Math.PI / 2;
        k.cyl(s * 2.4, 1.85, -3.6, 0.22, 0.04, '#3a2a26', 0).rotation.x = Math.PI / 2;
        lg.rotation.y = 0;
      }
      k.box(0, 3.0, -4.75, 4.2, 0.9, 0.12, '#3a2a26', 1);
      k.paint(0, 2.6, -4.68, 4.0, 0.8, g => drawText(g, '♪ DOTORI CLUB ♪', 0, 0.4, 3.8, 0.6, '#ffe28a'));
      // 도토리 미러볼: 천장에 매달려 빙글
      const ball = new THREE.Group(); ball.position.set(0, 3.7, 0.2); k.group.add(ball);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshToonMaterial({ color: '#d9d9e8' })); body.scale.y = 1.15; ball.add(body);
      for (let i = 0; i < 26; i++) { const a = i * 2.39, h = ((i * 7) % 13) / 13 - 0.5; const tile = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), glow(i % 3 ? '#ffffff' : LIGHTS[i % 5])); tile.position.set(Math.sin(a) * 0.5 * Math.sqrt(1 - h * h * 3), h * 0.95, Math.cos(a) * 0.5 * Math.sqrt(1 - h * h * 3)); tile.lookAt(0, h * 0.95 * 2, 0); ball.add(tile); }
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: CAP })); cap.position.y = 0.25; ball.add(cap);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), new THREE.MeshToonMaterial({ color: '#3a2a26' })); line.position.y = 1.1; ball.add(line);
      live.ball = ball;
      // 벽을 쓰는 색 빛줄기 (DJ 뒤 양쪽에서)
      for (const s of [-1, 1]) {
        const head = new THREE.Group(); head.position.set(s * 4.6, 3.6, -4.4); k.group.add(head);
        head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.35, 10), new THREE.MeshToonMaterial({ color: '#3a3a44' })));
        const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: s < 0 ? '#ff9fb8' : '#9fe0ff', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.y = -3.0; head.add(beam);
        head.userData.s = s; live.beams.push(head);
      }
      // 벽가 통나무 의자와 도토리 주스 선반
      for (const s of [-1, 1]) {
        const lg = k.cyl(s * 5.3, 0.25, 2.6, 0.32, 2.4, '#9a7350', 1); lg.rotation.x = Math.PI / 2;
        k.cyl(s * 5.3, 0.25, 3.82, 0.3, 0.02, '#d8b583', 0).rotation.x = Math.PI / 2;
      }
      k.box(5.5, 1.6, -1.2, 0.5, 0.08, 2.6, '#9a7350', 1);
      for (let i = 0; i < 5; i++) { k.cyl(5.5, 1.82, -2.2 + i * 0.5, 0.11, 0.36, ['#f3d27a', '#f0a58c', '#b9d98a'][i % 3], 1); acorn(k, 5.5, 2.1, -2.2 + i * 0.5, 0.07); }
    },
  };

  if (typeof BUILDERS !== 'undefined') BUILDERS.dotoriClub = (k, p) => root.Interiors.mount(k, p, DEF);

  /* ---------- 동작: 엉덩이 춤, 도토리 스크래치 ---------- */
  const MA = root.MinorActs;
  if (MA && MA.C && typeof ANIMS !== 'undefined') {
    const shake = MA.C(1.0, {
      rotZ: '0:.2 .25:-.2 .5:.2 .75:-.2 1:.2', rotY: '0:.35 .5:-.35 1:.35', rotX: '0:-.08 .25:-.12 .5:-.08 .75:-.12 1:-.08',
      posY: '0:0 .125:.06 .25:0 .375:.06 .5:0 .625:.06 .75:0 .875:.06 1:0', squash: '0:1 .25:.96 .5:1 .75:.96 1:1',
      footLY: '0:0 .25:.06 .5:0 1:0', footRY: '0:0 .5:0 .75:.06 1:0',
    }, { R: 'hip(.22,.08,0)@0 hip(.22,.08,0)@1', L: 'hip(-.22,.08,0)@0 hip(-.22,.08,0)@1' }, [[0, 'joy']], { meta: { name: '엉덩이 흔들기', phase: 'main', act: 'dance', tags: ['도토리 클럽'] } });
    shake.id = 'butt_shake'; ANIMS.butt_shake = shake;
    const scratch = MA.C(1.2, {
      rotX: '0:.18 .3:.22 .6:.18 .9:.22 1.2:.18', rotY: '0:-.12 .3:.12 .6:-.12 .9:.12 1.2:-.12', posY: '0:0 .3:.05 .6:0 .9:.05 1.2:0',
    }, { R: 'front(.22,.22,0)@0 front(-.02,.24,0)@.3 front(.22,.22,0)@.6 front(-.02,.24,0)@.9 front(.22,.22,0)@1.2', L: 'high(-.22,-.2,0)@0 high(-.26,-.28,0)@.6 high(-.22,-.2,0)@1.2' }, [[0, 'joy']], {
      props: [{ id: 'acorn', shape: 'ball', color: ACORN, size: 0.14, attach: 'handR', tracks: { px: [[0, 0.03, 'io'], [1.2, 0.03, 'io']], py: [[0, -0.04, 'io'], [1.2, -0.04, 'io']], pz: [[0, 0.08, 'io'], [1.2, 0.08, 'io']] }, vis: [[0, 1]] }],
      meta: { name: '도토리 스크래치', phase: 'main', act: 'dj', tags: ['우사기', '도토리 클럽'] },
    });
    scratch.id = 'acorn_scratch'; ANIMS.acorn_scratch = scratch;
  }

  /* ---------- 상호작용 ---------- */
  const VO = root.VillageObjects;
  if (VO) {
    const S = (socket, act, min, clip, label) => ({ socket, act, min, clip, prop: null, label });
    const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };
    put({ id: 'dotoriClub.dance', place: 'dotoriClub', name: '도토리 클럽에서 춤추기', cost: 100, hours: [18, 23.5], group: true, gain: { fun: 40, social: 10, energy: -10 },
      steps: [S('dance_*', 'cap', 1.5, 'idle_stretch', '도토리 모자 쓰는 중'), S('dance_*', 'dance', 10, 'butt_shake', '엉덩이 흔들흔들'), S('dance_*', 'dance', 2, 'jump_joy', '두둠칫!'), S('dance_*', 'dance', 8, 'butt_shake', '엉덩이 흔들흔들')] });
    put({ id: 'dotoriClub.dj', place: 'dotoriClub', name: '도토리 DJ', only: ['usagi'], hours: [18, 23.5], gain: { fun: 50, energy: -8 },
      steps: [S('dj_stand', 'dj', 14, 'acorn_scratch', '그루터기에 도토리 문질러 스크래치'), S('dj_stand', 'cheer', 1.5, 'jump_joy', '야하!'), S('dj_stand', 'dj', 10, 'acorn_scratch', '그루터기에 도토리 문질러 스크래치')] });
    put({ id: 'dotoriClub.rest', place: 'dotoriClub', name: '통나무에 앉아 쉬기', hours: [18, 23.5], gain: { fun: 8, energy: 6 },
      steps: [S('bench_sit_*', 'sit', 6, 'sit_idle', '통나무에 앉아 숨 고르는 중')] });
  }

  /* ---------- 도토리 모자 + 조명 ---------- */
  function capFor(a) {
    const info = root.AnimRig && AnimRig.rigInfo(a.built, a.preset);
    const lathe = info && info.bodies && info.bodies.find(b => b.geometry && b.geometry.type === 'LatheGeometry' && b.parent === a.built.model);
    if (!lathe) return null;
    const pts = lathe.geometry.parameters.points;
    const top = pts[pts.length - 1].y * lathe.scale.y + lathe.position.y;
    const r = Math.max(...pts.map(p => p.x)) * lathe.scale.x;
    const g = new THREE.Group(); g.name = 'acornCap';
    const capM = new THREE.MeshToonMaterial({ color: CAP });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    dome.scale.set(r * 0.62, r * 0.36, r * 0.62); dome.position.y = top - r * 0.2; g.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, r * 0.06, 6, 24), new THREE.MeshToonMaterial({ color: '#5e3f25' })); rim.rotation.x = Math.PI / 2; rim.position.y = top - r * 0.19; g.add(rim);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, h = i % 2 ? 0.55 : 0.75; const d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.05, 5, 4), new THREE.MeshToonMaterial({ color: '#5e3f25' })); d.position.set(Math.sin(a) * r * 0.62 * Math.cos(h * 0.9), top - r * 0.2 + Math.sin(h) * r * 0.3, Math.cos(a) * r * 0.62 * Math.cos(h * 0.9)); g.add(d); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.07, r * 0.25, 6), new THREE.MeshToonMaterial({ color: ROOT })); stem.position.y = top - r * 0.2 + r * 0.42; stem.rotation.z = 0.25; g.add(stem);
    a.built.model.add(g);
    return g;
  }
  function tick() {
    const G = root.game;
    if (G && G.actors && G.sim) {
      let busy = false, dj = false;
      for (const a of G.actors) {
        const d = a.c.doing;
        const inClub = !!(d && d.x && d.x.place === 'dotoriClub' && d.phase === 'use');
        if (inClub) busy = true;
        if (inClub && d.x.id === 'dotoriClub.dj') dj = true;
        if (!inClub && !a._cap) continue;
        let cap = (a._cap && a._cap.parent === a.built.model ? a._cap : null);
        if (inClub && !cap && !a.c.extra) cap = a._cap = capFor(a);
        if (cap) cap.visible = inClub;
      }
      const t = performance.now() / 1000;
      if (live.ball) live.ball.rotation.y = t * (busy ? 1.2 : 0.2);
      live.tiles.forEach(tl => { tl.visible = !busy || ((tl.userData.i + Math.floor(t * (dj ? 4 : 2))) % 3 !== 0); });
      live.bulbs.forEach((b, i) => { b.visible = !busy || ((i + Math.floor(t * 3)) % 4 !== 0); });
      live.beams.forEach(h => { h.visible = busy; h.rotation.z = h.userData.s * (0.5 + Math.sin(t * 1.4 + h.userData.s) * 0.35); h.rotation.x = Math.sin(t * 0.9) * 0.3; });
    }
    requestAnimationFrame(tick);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
}(typeof self !== 'undefined' ? self : this));
