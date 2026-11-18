'use strict';

// 치이카와 심즈 — 가게 바깥 꾸미기
// interiors-auto.js가 씌우는 닫힌 외관(벽·지붕·간판·문·창)은 가게마다 모양이 같다.
// 여기서 가게마다 앞모습(차양·내걸린 간판·진열장·등·메뉴판·화분)을 더한다. 좌표는 장소 기준, 앞면은 R.z1 쪽(+z)이다.
// part가 'wall'이면 벽에 붙는 것(안을 들여다볼 때 벽과 함께 걷힌다), 'ground'면 땅에 놓이는 것
(function (root) {
  const DRESS = root.INTERIOR_DRESS = root.INTERIOR_DRESS || {};
  const { grp, text } = root.PublicSets;
  const sub = (k, x, y, z, ry) => { const g = grp(k.group, x, y, z); g.rotation.y = ry || 0; return makeKit(g, 0, 0, 0); };
  const rotX = (m, a) => { m.rotation.x = a; return m; };
  const rotZ = (m, a) => { m.rotation.z = a; return m; };

  // 줄무늬 차양: 벽에서 앞으로 기울어 내려온다
  function awning(k, x, y, z, w, a, b, n = 8) {
    const s = sub(k, x, y, z);
    for (let i = 0; i < n; i++) rotX(s.box(-w / 2 + (i + 0.5) * (w / n), 0, 0.6, w / n, 0.07, 1.3, i % 2 ? b : a, i % 2 ? 0 : 1), 0.38);
    // 앞단의 물결 술
    for (let i = 0; i < n; i++) s.ball(-w / 2 + (i + 0.5) * (w / n), -0.3, 1.2, w / n / 2, 0.16, 0.05, i % 2 ? b : a, 0);
    s.box(0, 0.24, 0.02, w + 0.2, 0.1, 0.1, '#5a3b33', 1);
    return s;
  }
  // 화분: 화분 몸통과 흙, 잎 덩어리
  function pot(k, x, z, tall, leaf = '#7fa86a', vase = '#b5664a') {
    k.cyl(x, 0.28, z, 0.32, 0.56, vase, 1);
    k.cyl(x, 0.58, z, 0.36, 0.08, vase, 1);
    k.cyl(x, 0.6, z, 0.29, 0.03, '#5a4334', 0);
    if (tall) {
      k.cyl(x, 1.1, z, 0.04, 1, '#6f8a4a', 0);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        rotZ(k.ball(x + Math.cos(a) * 0.3, 1.25 + (i % 3) * 0.28, z + Math.sin(a) * 0.3, 0.32, 0.1, 0.16, leaf, 0), Math.cos(a) * 0.6);
      }
    } else for (let i = 0; i < 5; i++) k.ball(x + Math.cos(i * 1.3) * 0.18, 0.78 + (i % 2) * 0.12, z + Math.sin(i * 1.3) * 0.18, 0.24, 0.22, 0.24, leaf, i ? 0 : 1);
  }
  // 세워 두는 메뉴판 (A자)
  function standBoard(k, x, z, lines, face = '#3f3d3a', ink = '#fffaf0', ry = 0) {
    const m = sub(k, x, 0, z, ry);
    rotX(m.box(0, 0.62, 0.1, 0.9, 1.24, 0.06, '#7d5a44', 1), -0.14);
    rotX(m.box(0, 0.62, -0.1, 0.9, 1.24, 0.06, '#7d5a44', 1), 0.14);
    rotX(m.box(0, 0.64, 0.135, 0.76, 1.02, 0.01, face, 0), -0.14);
    m.box(0, 1.24, 0, 0.92, 0.06, 0.1, '#5a3b33', 0);
    text(m, 0, 0.62, 0.16, 0.7, 0.92, lines, ink, 0.11);
    return m;
  }
  // 벽등: 받침, 팔, 유리 갓
  function wallLamp(k, x, y, z, glow = '#fff3c4') {
    k.box(x, y, z, 0.18, 0.3, 0.06, '#3f3d3a', 0);
    k.box(x, y + 0.1, z + 0.18, 0.04, 0.04, 0.34, '#3f3d3a', 0);
    k.cyl(x, y - 0.06, z + 0.36, 0.14, 0.26, glow, 1);
    k.cone(x, y + 0.12, z + 0.36, 0.2, 0.14, '#3f3d3a', 0);
  }

  /* ---------- 찻집: 오래된 다방 ---------- */

  DRESS.kissa = (k, R, part) => {
    const Z = R.z1 + 0.16;
    const wx = Math.max(4.6, R.w * 0.3);
    const win = [-1, 1].map(s => R.cx + s * wx).filter(x => Math.abs(x - R.doorX) > 3.6 && Math.abs(x - R.cx) < R.w / 2 - 1.8);
    if (part === 'wall') return kissaWall(k, R, Z, win);
    kissaGround(k, R, Z, win);
  };
  function kissaWall(k, R, Z, win) {
    // 창마다 팥색·크림색 줄무늬 차양
    for (const x of win) awning(k, x, 4.45, Z, 3.4, '#8a2f3a', '#f4e3c4');
    // 문 위 작은 차양과 금색 글자
    awning(k, R.doorX, 4.85, Z, 4.2, '#8a2f3a', '#f4e3c4', 10);
    // 벽에서 튀어나온 간판: 커피잔과 김
    const s = sub(k, R.doorX + 2.6, 5.1, Z, Math.PI / 2);
    s.box(0, 0.1, 0, 0.06, 0.06, 1.1, '#3f3d3a', 0);
    s.box(0.0, -0.28, 0.7, 0.08, 0.7, 0.9, '#584a42', 2);
    s.box(0.0, -0.28, 0.7, 0.1, 0.6, 0.8, '#f4e3c4', 0);
    for (const side of [-1, 1]) {
      s.cyl(side * 0.07, -0.34, 0.62, 0.14, 0.16, '#fffdf4', 0).rotation.z = Math.PI / 2;
      text(s, side * 0.07, -0.1, 0.78, 0.6, 0.18, ['커피'], '#8a2f3a', 0.12, side * Math.PI / 2);
    }
    for (const y of [-0.02, 0.1]) s.box(0, -0.6, 0.7 + y * 0.6, 0.02, 0.02, 0.02, '#3f3d3a', 0);
    for (const sx of [-1, 1]) wallLamp(k, R.doorX + sx * 1.6, 3.6, Z);
    // 창가 화단
    for (const x of win) {
      k.box(x, 1.3, Z + 0.25, 3, 0.36, 0.42, '#6b4634', 1);
      for (let i = 0; i < 6; i++) k.ball(x - 1.2 + i * 0.48, 1.55, Z + 0.28, 0.2, 0.18, 0.2, i % 3 ? '#7fa86a' : '#e88aa0', 0);
    }
  }
  function kissaGround(k, R, Z, win) {
    // 문 옆 진열장: 모형 음식 (파르페·크림소다·커피·핫케이크)
    const showX = win.length ? win[0] : R.doorX - 3.4;
    const c = sub(k, showX, 0, Z + 0.95);
    c.box(0, 0.5, 0, 2.6, 1, 0.7, '#584a42', 1);
    c.box(0, 1.03, 0, 2.7, 0.06, 0.8, '#3f3d3a', 0);
    const glass = c.box(0, 1.5, 0, 2.6, 0.9, 0.7, '#dff3fb', 1);
    glass.material.transparent = true; glass.material.opacity = 0.28;
    c.box(0, 1.96, 0, 2.7, 0.06, 0.8, '#3f3d3a', 0);
    // 파르페
    c.cyl(-0.9, 1.08, 0, 0.12, 0.04, '#dff3fb', 0); c.cyl(-0.9, 1.2, 0, 0.03, 0.2, '#dff3fb', 0);
    c.cone(-0.9, 1.48, 0, 0.16, -0.36, '#f3e3b0', 0);
    c.ball(-0.9, 1.62, 0, 0.15, 0.1, 0.15, '#fffffa', 0); c.ball(-0.9, 1.72, 0, 0.05, 0.05, 0.05, '#c8463c', 0);
    c.box(-0.84, 1.66, 0.05, 0.03, 0.03, 0.2, '#e3a94a', 0);
    // 크림소다
    c.cyl(-0.3, 1.25, 0, 0.11, 0.38, '#7ccf7a', 0); c.ball(-0.3, 1.47, 0, 0.12, 0.08, 0.12, '#fffffa', 0); c.ball(-0.3, 1.56, 0, 0.04, 0.04, 0.04, '#c8463c', 0);
    c.cyl(-0.22, 1.55, 0, 0.012, 0.36, '#f2748e', 0).rotation.z = -0.3;
    // 커피잔
    c.cyl(0.3, 1.08, 0, 0.16, 0.02, '#fffdf4', 0); c.cyl(0.3, 1.15, 0, 0.1, 0.12, '#fffdf4', 0); c.cyl(0.3, 1.21, 0, 0.085, 0.01, '#4a2a1a', 0);
    // 핫케이크 두 장과 버터
    c.cyl(0.9, 1.08, 0, 0.24, 0.02, '#fffdf4', 0);
    c.cyl(0.9, 1.13, 0, 0.18, 0.06, '#d9984e', 0); c.cyl(0.9, 1.19, 0, 0.17, 0.06, '#e3a94a', 0); c.box(0.9, 1.24, 0, 0.08, 0.04, 0.08, '#fff3a0', 0);
    // 가격표
    [-0.9, -0.3, 0.3, 0.9].forEach((x, i) => { c.box(x, 1.07, 0.22, 0.26, 0.1, 0.01, '#fffdf4', 0); text(c, x, 1.07, 0.23, 0.24, 0.08, [['600', '450', '400', '550'][i]], '#3f3d3a', 0.06); });
    // 메뉴판, 화분, 벽등
    standBoard(k, R.doorX + 3.4, Z + 1.2, ['오늘의 커피', '400', '크림소다', '450', '파르페 600'], '#2f3a33', '#fffaf0', -0.25);
    pot(k, R.doorX - 2.2, Z + 0.55, true);
    pot(k, R.doorX + 2.2, Z + 0.55, true, '#6f9a5a');
  }

  /* ---------- 서서 먹는 소바 ---------- */

  DRESS.soba = (k, R, part) => {
    const Z = R.z1 + 0.16;
    const wx = Math.max(4.6, R.w * 0.3);
    const win = [-1, 1].map(s => R.cx + s * wx).filter(x => Math.abs(x - R.doorX) > 3.6 && Math.abs(x - R.cx) < R.w / 2 - 1.8);
    if (part === 'wall') sobaWall(k, R, Z);
    else sobaGround(k, R, Z, win);
  };
  function sobaWall(k, R, Z) {
    // 처마 밑 나무 메뉴 패
    const items = [['가케', '300'], ['튀김', '450'], ['유부', '400'], ['달걀', '380'], ['미역', '350'], ['곱빼기', '+100']];
    const span = Math.min(R.w - 2, 9);
    items.forEach(([n, p], i) => {
      const x = R.cx - span / 2 + (i + 0.5) * (span / items.length);
      if (Math.abs(x - R.doorX) < 2.1) return;
      k.box(x, 5.2, Z + 0.04, 0.62, 1.1, 0.06, '#e6c797', 1);
      k.box(x, 5.78, Z + 0.04, 0.05, 0.1, 0.05, '#3f3d3a', 0);
      text(k, x, 5.28, Z + 0.08, 0.5, 0.8, [n, p], '#3f3d3a', 0.13);
    });
    // 빨간 초롱 한 쌍: 대나무 살 줄과 위아래 검은 테
    for (const sx of [-1, 1]) {
      const x = R.doorX + sx * 2.3;
      k.box(x, 4.25, Z + 0.25, 0.04, 0.5, 0.04, '#3f3d3a', 0);
      k.ball(x, 3.55, Z + 0.25, 0.42, 0.55, 0.42, '#d0453c', 1);
      for (let i = 0; i < 4; i++) k.cyl(x, 3.3 + i * 0.17, Z + 0.25, 0.42 - Math.abs(i - 1.5) * 0.05, 0.01, '#8a2f2a', 0);
      k.cyl(x, 4.02, Z + 0.25, 0.22, 0.1, '#2f2f38', 0);
      k.cyl(x, 3.03, Z + 0.25, 0.22, 0.1, '#2f2f38', 0);
      text(k, x, 3.55, Z + 0.68, 0.3, 0.5, ['소', '바'], '#fffaf0', 0.16);
    }
    // 문 유리에 붙은 쪽지, 벽등, 지붕의 김 빠지는 굴뚝
    k.box(R.doorX + 0.9, 2.6, Z + 0.1, 0.5, 0.36, 0.01, '#fffdf4', 0);
    text(k, R.doorX + 0.9, 2.6, Z + 0.11, 0.46, 0.3, ['식권은', '안에서'], '#3f3d3a', 0.07);
    for (const s2 of [-1, 1]) wallLamp(k, R.doorX + s2 * 3.3, 3.7, Z, '#fff8e0');
    const cx = R.cx + R.w * 0.28;
    k.cyl(cx, R.h + 1.3, R.cz - 1, 0.3, 2.2, '#8d8f94', 1);
    k.cone(cx, R.h + 2.6, R.cz - 1, 0.5, 0.4, '#6f7176', 1);
    for (let i = 0; i < 3; i++) k.ball(cx + i * 0.25, R.h + 3.1 + i * 0.5, R.cz - 1, 0.3 + i * 0.1, 0.26 + i * 0.08, 0.3 + i * 0.1, '#fffdf4', 0);
  }
  function sobaGround(k, R, Z, win) {
    // 세로 깃발 (노보리): 장대와 가로대, 바람에 살짝 휜 천
    const fx = R.x1 - 0.6;
    const f = sub(k, fx, 0, Z + 1.4);
    f.cyl(0, 2.2, 0, 0.05, 4.4, '#d9d2c2', 0);
    f.box(0.42, 4.25, 0, 0.9, 0.05, 0.05, '#d9d2c2', 0);
    rotZ(f.box(0.42, 2.85, 0.02, 0.8, 2.7, 0.03, '#4f7a5f', 1), 0.02);
    text(f, 0.42, 2.95, 0.05, 0.6, 2.2, ['따', '끈', '소', '바'], '#fffaf0', 0.3);
    f.cyl(0, 0.1, 0, 0.22, 0.2, '#7d6250', 1);
    // 바깥 선반: 다 먹은 그릇 돌려놓는 곳, 물 주전자
    const sx = win.length ? win[0] : R.doorX - 3.6;
    const shelf = sub(k, sx, 0, Z + 0.3);
    shelf.box(0, 1.15, 0, 2.6, 0.08, 0.5, '#a06e4a', 1);
    for (const x of [-1.2, 1.2]) shelf.box(x, 1.14, -0.1, 0.06, 0.4, 0.3, '#6f4630', 0);
    for (let i = 0; i < 3; i++) {
      shelf.cyl(-0.8 + i * 0.5, 1.26, 0, 0.17, 0.14, i === 1 ? '#3f3d3a' : '#8a2f2a', 1);
      shelf.cyl(-0.8 + i * 0.5, 1.33, 0, 0.15, 0.01, '#d9b98c', 0);
    }
    shelf.cyl(0.85, 1.32, 0, 0.12, 0.26, '#b9bfc3', 1); shelf.box(0.98, 1.36, 0, 0.1, 0.1, 0.04, '#b9bfc3', 0);
    text(shelf, 0, 0.8, 0.27, 2, 0.24, ['그릇은 여기에'], '#5a3b33', 0.12);
    // 그릇 상자 둘 (쌓아 둔 빈 그릇)
    for (const [x, z] of [[R.doorX + 3.2, Z + 0.6], [R.doorX + 3.9, Z + 0.7]]) {
      k.box(x, 0.25, z, 0.6, 0.5, 0.45, '#c9a57c', 1);
      for (let i = 0; i < 4; i++) k.cyl(x, 0.55 + i * 0.05, z, 0.16, 0.05, '#8a2f2a', 0);
    }
    pot(k, R.doorX - 3.2, Z + 0.6, false, '#5f8a4a', '#8a8f94');
  }

  /* ---------- 나머지 가게들 ---------- */

  const { lit } = root.PublicSets;
  const winsOf = R => [-1, 1].map(s => R.cx + s * Math.max(4.6, R.w * 0.3)).filter(x => Math.abs(x - R.doorX) > 3.6 && Math.abs(x - R.cx) < R.w / 2 - 1.8);
  // 벽과 땅을 나눠 그리는 틀
  const shop = (wall, ground) => (k, R, part) => {
    const Z = R.z1 + 0.16;
    const win = winsOf(R);
    if (part === 'wall') wall(k, R, Z, win); else ground(k, R, Z, win);
  };
  // 유리 진열장: 받침, 유리, 안에 놓을 것은 fill(kit)로
  function showcase(k, x, z, w, fill) {
    const c = sub(k, x, 0, z);
    c.box(0, 0.45, 0, w, 0.9, 0.7, '#7d5a44', 1);
    c.box(0, 0.93, 0, w + 0.1, 0.06, 0.8, '#5a3b33', 0);
    const g = c.box(0, 1.4, 0, w, 0.9, 0.7, '#dff3fb', 1);
    g.material.transparent = true; g.material.opacity = 0.26;
    c.box(0, 1.86, 0, w + 0.1, 0.06, 0.8, '#5a3b33', 0);
    fill(c);
    return c;
  }
  // 나무 메뉴 패 한 줄
  function tags(k, R, Z, y, list, wood = '#e6c797', ink = '#3f3d3a') {
    const span = Math.min(R.w - 2, list.length * 1.2);
    list.forEach((lines, i) => {
      const x = R.cx - span / 2 + (i + 0.5) * (span / list.length);
      if (Math.abs(x - R.doorX) < 2.1) return;
      k.box(x, y, Z + 0.04, 0.62, 1.05, 0.06, wood, 1);
      text(k, x, y + 0.05, Z + 0.08, 0.5, 0.8, lines, ink, 0.12);
    });
  }
  function lantern(k, x, y, z, color = '#d0453c', word = null) {
    k.box(x, y + 0.7, z, 0.04, 0.5, 0.04, '#3f3d3a', 0);
    k.ball(x, y, z, 0.38, 0.5, 0.38, color, 1);
    for (let i = 0; i < 4; i++) k.cyl(x, y - 0.22 + i * 0.15, z, 0.38 - Math.abs(i - 1.5) * 0.05, 0.01, '#5a3b33', 0);
    k.cyl(x, y + 0.45, z, 0.2, 0.08, '#2f2f38', 0);
    k.cyl(x, y - 0.45, z, 0.2, 0.08, '#2f2f38', 0);
    if (word) text(k, x, y, z + 0.39, 0.28, 0.46, word, '#fffaf0', 0.15);
  }
  function crate(k, x, z, color = '#c9a57c', fill = null) {
    k.box(x, 0.25, z, 0.7, 0.5, 0.5, color, 1);
    for (const y of [0.12, 0.38]) k.box(x, y, z + 0.26, 0.72, 0.05, 0.02, '#8a5a3c', 0);
    if (fill) for (let i = 0; i < 6; i++) k.ball(x - 0.22 + (i % 3) * 0.22, 0.54, z - 0.1 + Math.floor(i / 3) * 0.2, 0.12, 0.1, 0.12, fill[i % fill.length], 0);
  }
  function bench(k, x, z, color = '#a06e4a') {
    k.box(x, 0.48, z, 1.8, 0.08, 0.5, color, 1);
    k.box(x, 0.85, z - 0.22, 1.8, 0.4, 0.06, color, 1);
    for (const sx of [-0.75, 0.75]) k.box(x + sx, 0.24, z, 0.08, 0.48, 0.44, '#5a3b33', 0);
  }

  // 우마이야: 정식집. 흰 초롱, 나무 메뉴 패, 정식 모형 진열장, 쌀가마니
  DRESS.umaiya = shop((k, R, Z) => {
    tags(k, R, Z, 5.1, [['정식', '800'], ['생선', '정식'], ['튀김', '정식'], ['돈가스', '900'], ['밥', '곱빼기']]);
    for (const s of [-1, 1]) lantern(k, R.doorX + s * 2.3, 3.6, Z + 0.25, '#fffaf0');
    for (const s of [-1, 1]) text(k, R.doorX + s * 2.3, 3.6, Z + 0.64, 0.28, 0.46, ['정', '식'], '#c9604f', 0.15);
  }, (k, R, Z, win) => {
    showcase(k, win.length ? win[0] : R.doorX - 3.6, Z + 0.9, 2.4, c => {
      for (const [x, main] of [[-0.6, '#d9984e'], [0.6, '#e3a94a']]) {
        c.box(x, 1.0, 0, 0.9, 0.04, 0.5, '#8a5a3c', 0);
        c.cyl(x - 0.22, 1.08, -0.08, 0.12, 0.1, '#fffdf4', 0); c.ball(x - 0.22, 1.14, -0.08, 0.1, 0.05, 0.1, '#fffffa', 0);
        c.cyl(x + 0.18, 1.07, -0.06, 0.11, 0.08, '#8a2f2a', 0); c.cyl(x + 0.18, 1.11, -0.06, 0.09, 0.01, '#c99a5b', 0);
        c.ball(x, 1.08, 0.12, 0.2, 0.06, 0.12, main, 0);
        c.box(x, 1.02, 0.28, 0.3, 0.1, 0.01, '#fffdf4', 0);
      }
    });
    standBoard(k, R.doorX + 3.3, Z + 1.2, ['오늘의 정식', '생선구이', '된장국', '800원'], '#3f3d3a', '#fffaf0', -0.2);
    for (const [x, z] of [[R.x1 - 1, Z + 0.5], [R.x1 - 1.7, Z + 0.55]]) {
      k.ball(x, 0.42, z, 0.4, 0.42, 0.32, '#e6d6b0', 1);
      k.box(x, 0.8, z, 0.14, 0.08, 0.14, '#b9a27a', 0);
    }
    pot(k, R.doorX - 2.2, Z + 0.55, false);
  });

  // 과자의 마치오카: 분홍 줄무늬 차양, 사탕 병 진열장, 커다란 막대사탕, 깃발 줄
  DRESS.machioka = shop((k, R, Z, win) => {
    for (const x of win) awning(k, x, 4.4, Z, 3.4, '#f3b3c8', '#fffaf0');
    awning(k, R.doorX, 4.85, Z, 4.2, '#f3b3c8', '#fffaf0', 10);
    // 처마 깃발 줄
    const n = 14;
    for (let i = 0; i < n; i++) {
      const x = R.x0 + 0.6 + (i / (n - 1)) * (R.w - 1.2);
      const y = 5.75 - Math.sin((i / (n - 1)) * Math.PI) * 0.35;
      k.cone(x, y, Z + 0.3, 0.16, -0.3, ['#f2748e', '#ffe08a', '#bfe2f2', '#bfe6c4'][i % 4], 0);
    }
  }, (k, R, Z, win) => {
    showcase(k, win.length ? win[0] : R.doorX - 3.6, Z + 0.9, 2.6, c => {
      [['#f2748e', '#ffe08a'], ['#bfe2f2', '#fffdf4'], ['#bfe6c4', '#f9c7a3'], ['#e88aa0', '#c9a24a']].forEach(([a, b], i) => {
        const x = -0.95 + i * 0.63;
        const jar = c.cyl(x, 1.25, 0, 0.2, 0.5, '#eef8fb', 0); jar.material.transparent = true; jar.material.opacity = 0.5;
        c.cyl(x, 1.53, 0, 0.16, 0.06, '#c9604f', 0);
        for (let j = 0; j < 7; j++) c.ball(x - 0.1 + (j % 3) * 0.1, 1.06 + Math.floor(j / 3) * 0.1, (j % 2) * 0.06 - 0.03, 0.05, 0.05, 0.05, j % 2 ? a : b, 0);
      });
    });
    // 커다란 막대사탕 간판
    const lx = R.doorX + 3.3;
    k.cyl(lx, 1.2, Z + 1, 0.06, 2.4, '#fffdf4', 0);
    const lp = sub(k, lx, 2.7, Z + 1);
    lp.cyl(0, 0, 0, 0.62, 0.14, '#f2748e', 1).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) lp.cyl(0, 0, 0.075, 0.5 - i * 0.15, 0.01, i % 2 ? '#f2748e' : '#fffdf4', 0).rotation.x = Math.PI / 2;
    lp.box(0, 0.75, 0, 0.5, 0.1, 0.08, '#ffe08a', 0);
    standBoard(k, R.doorX - 3.2, Z + 1.3, ['오늘의 과자', '구운 과자', '젤리', '100원~'], '#fff3f5', '#d8678a', 0.2);
    pot(k, R.doorX + 2.1, Z + 0.55, false, '#7fa86a', '#e88aa0');
  });

  // 약국: 초록 십자 불빛 간판, 약병 진열장, 벤치, 건강 포스터
  DRESS.pharmacy = shop((k, R, Z) => {
    const s = sub(k, R.doorX + 2.7, 4.9, Z + 0.6);
    s.box(0, 0, -0.3, 0.06, 0.06, 0.6, '#3f3d3a', 0);
    s.box(0, 0, 0, 1, 1, 0.14, '#fffdf4', 1);
    lit(s.group, 0.8, 0.24, 0.16, '#6fd38a', 0, 0, 0.02, 0.9);
    lit(s.group, 0.24, 0.8, 0.16, '#6fd38a', 0, 0, 0.02, 0.9);
    k.box(R.doorX - 2.5, 2.3, Z + 0.05, 1, 1.4, 0.02, '#fffdf4', 0);
    text(k, R.doorX - 2.5, 2.3, Z + 0.07, 0.9, 1.2, ['손 씻기', '잘 자기', '골고루', '먹기'], '#3f7a55', 0.12);
  }, (k, R, Z, win) => {
    showcase(k, win.length ? win[0] : R.doorX - 3.6, Z + 0.9, 2.4, c => {
      const colors = ['#f2748e', '#bfe2f2', '#ffe08a', '#bfe6c4', '#fffdf4', '#c9a24a'];
      for (let i = 0; i < 6; i++) {
        const x = -0.95 + i * 0.38;
        c.cyl(x, 1.12, 0, 0.1, 0.32, colors[i], 0);
        c.cyl(x, 1.31, 0, 0.06, 0.06, '#3f3d3a', 0);
        c.box(x, 1.12, 0.1, 0.12, 0.12, 0.01, '#fffdf4', 0);
      }
      c.box(0, 1.55, 0, 1.8, 0.04, 0.5, '#7d5a44', 0);
      for (let i = 0; i < 4; i++) c.box(-0.6 + i * 0.4, 1.66, 0, 0.3, 0.18, 0.18, i % 2 ? '#fffdf4' : '#e7f2e9', 0);
    });
    bench(k, R.doorX + 3.4, Z + 1.3, '#93c3a0');
    pot(k, R.doorX + 2.1, Z + 0.55, true, '#6f9a5a', '#fffdf4');
  });

  // 인터넷 코너: 빛나는 간판 띠, 실외기, 포스터, 자전거 거치대
  DRESS.internet = shop((k, R, Z) => {
    lit(k.group, Math.min(R.w - 2, 6), 0.18, 0.08, '#8fd3ff', R.cx, 5.2, Z + 0.06, 0.8);
    for (const x of [R.x0 + 1.2, R.x1 - 1.2]) {
      k.box(x, 1.2, Z + 0.35, 1, 0.8, 0.5, '#e6ecf3', 1);
      k.cyl(x - 0.1, 1.2, Z + 0.61, 0.28, 0.02, '#9fb2cd', 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) k.box(x - 0.1, 0.98 + i * 0.15, Z + 0.62, 0.5, 0.02, 0.01, '#7f96b8', 0);
    }
    k.box(R.doorX - 2.5, 2.5, Z + 0.05, 1.1, 1.5, 0.02, '#fffdf4', 0);
    text(k, R.doorX - 2.5, 2.5, Z + 0.07, 1, 1.3, ['1시간', '100원', '음료', '무료'], '#3f5a7f', 0.13);
  }, (k, R, Z) => {
    const bx = R.doorX + 3.2;
    k.box(bx, 0.35, Z + 1.1, 2, 0.06, 0.3, '#8f969a', 0);
    for (let i = 0; i < 4; i++) k.box(bx - 0.75 + i * 0.5, 0.25, Z + 1.1, 0.04, 0.5, 0.3, '#8f969a', 0);
    standBoard(k, R.doorX - 3.2, Z + 1.3, ['인터넷', '만화', '음료바'], '#e6ecf3', '#3f5a7f', 0.15);
  });

  // 라멘 산: 빨간 초롱 둘, 나무 메뉴 패, 생면 상자, 줄 서는 곳 표시
  DRESS.ramenYama = shop((k, R, Z) => {
    tags(k, R, Z, 5.1, [['간장', '700'], ['된장', '750'], ['소금', '700'], ['차슈', '+200'], ['면', '추가']]);
    for (const s of [-2.3, 2.3]) lantern(k, R.doorX + s, 3.6, Z + 0.25, '#d05a50', ['라', '멘']);
  }, (k, R, Z) => {
    for (const [x, z] of [[R.x1 - 1.1, Z + 0.55], [R.x1 - 1.1, Z + 1.15]]) crate(k, x, z, '#c9a57c', ['#f2d98a']);
    text(k, R.x1 - 1.1, 0.25, Z + 1.41, 0.6, 0.3, ['생면'], '#5a3b33', 0.12);
    for (let i = 0; i < 4; i++) k.box(R.doorX - 3 - i * 0.9, 0.012, Z + 1.3, 0.5, 0.01, 0.5, '#ffe08a', 0);
    standBoard(k, R.doorX - 2.6, Z + 1.2, ['여기서', '줄 서요'], '#d05a50', '#fffaf0', 0.15);
  });

  // 리사이클 숍: 밖에 내놓은 물건 더미 (의자·전등·양동이·상자), 손수레
  DRESS.recycle = shop((k, R, Z) => {
    k.box(R.doorX - 2.6, 2.4, Z + 0.05, 1.2, 1.2, 0.02, '#f1e2b8', 0);
    text(k, R.doorX - 2.6, 2.4, Z + 0.07, 1.1, 1, ['무엇이든', '삽니다', '팝니다'], '#7d5a44', 0.13);
  }, (k, R, Z) => {
    const x = R.doorX + 3.3;
    // 낡은 의자
    k.box(x, 0.45, Z + 1, 0.6, 0.08, 0.6, '#a06e4a', 1);
    k.box(x, 0.85, Z + 0.73, 0.6, 0.7, 0.06, '#a06e4a', 1);
    for (const a of [-1, 1]) for (const b of [-1, 1]) k.box(x + a * 0.25, 0.22, Z + 1 + b * 0.25, 0.06, 0.44, 0.06, '#6f4630', 0);
    // 전등과 양동이
    k.cyl(x + 1, 0.05, Z + 1, 0.2, 0.1, '#8f969a', 0); k.cyl(x + 1, 0.7, Z + 1, 0.03, 1.3, '#8f969a', 0);
    k.cone(x + 1, 1.45, Z + 1, 0.3, 0.3, '#f1e2b8', 1);
    k.cyl(x - 0.9, 0.25, Z + 1.1, 0.24, 0.5, '#7f96b8', 1);
    // 상자 더미와 손수레
    crate(k, R.doorX - 3.2, Z + 0.6, '#c9a57c', ['#bfe2f2', '#f2748e', '#ffe08a']);
    k.box(R.doorX - 4.3, 0.35, Z + 1.1, 0.7, 0.06, 0.9, '#8f969a', 1);
    k.box(R.doorX - 4.3, 0.85, Z + 0.68, 0.7, 1, 0.06, '#8f969a', 0);
    for (const sx of [-0.3, 0.3]) k.cyl(R.doorX - 4.3 + sx, 0.15, Z + 1.4, 0.15, 0.06, '#3f3d3a', 0).rotation.z = Math.PI / 2;
  });

  // 게임센터: 불빛 띠, 캡슐 뽑기 두 대, 포스터
  DRESS.arcade = shop((k, R, Z) => {
    const n = 12;
    for (let i = 0; i < n; i++) lit(k.group, 0.22, 0.22, 0.08, ['#ff8a8a', '#ffe08a', '#8fd3ff', '#bfe6c4'][i % 4], R.x0 + 0.8 + (i / (n - 1)) * (R.w - 1.6), 5.5, Z + 0.06, 0.9);
    k.box(R.doorX + 2.6, 2.5, Z + 0.05, 1.1, 1.5, 0.02, '#2f2f38', 0);
    text(k, R.doorX + 2.6, 2.5, Z + 0.07, 1, 1.3, ['새 게임', '들어왔어요!'], '#ffe08a', 0.13);
  }, (k, R, Z) => {
    for (const [i, color] of [[0, '#f2748e'], [1, '#8fd3ff']]) {
      const x = R.doorX - 3 - i * 1.1;
      k.box(x, 0.45, Z + 0.7, 0.8, 0.9, 0.6, color, 1);
      const dome = k.ball(x, 1.25, Z + 0.7, 0.38, 0.38, 0.32, '#eef8fb', 1); dome.material.transparent = true; dome.material.opacity = 0.45;
      for (let j = 0; j < 6; j++) k.ball(x - 0.18 + (j % 3) * 0.18, 1.08 + Math.floor(j / 3) * 0.16, Z + 0.7, 0.08, 0.08, 0.08, ['#ffe08a', '#bfe6c4', '#fffdf4'][j % 3], 0);
      k.cyl(x + 0.2, 0.6, Z + 1.01, 0.08, 0.04, '#c9c4b6', 0).rotation.x = Math.PI / 2;
      k.box(x - 0.15, 0.25, Z + 1.01, 0.22, 0.14, 0.02, '#3f3d3a', 0);
    }
  });

  // 온천·사우나: 나무 물통 쌓기, 대나무 울타리, 김, 벤치
  function bathFront(k, R, Z, mark) {
    for (let i = 0; i < 5; i++) {
      const x = R.doorX + 3 + (i % 3) * 0.48 + (i > 2 ? 0.24 : 0);
      const y = i > 2 ? 0.56 : 0.18;
      k.cyl(x, y, Z + 0.8, 0.2, 0.36, '#d9b98c', 1);
      k.cyl(x, y + 0.19, Z + 0.8, 0.21, 0.03, '#8a5a3c', 0);
    }
    for (let i = 0; i < 9; i++) k.cyl(R.doorX - 2.6 - i * 0.22, 0.9, Z + 0.5, 0.09, 1.8, i % 2 ? '#9cb86a' : '#86a85a', 0);
    k.box(R.doorX - 3.5, 1.5, Z + 0.62, 2.1, 0.06, 0.06, '#6f4630', 0);
    k.box(R.doorX - 3.5, 0.6, Z + 0.62, 2.1, 0.06, 0.06, '#6f4630', 0);
    bench(k, R.doorX + 3.4, Z + 2, '#a06e4a');
    for (let i = 0; i < 4; i++) k.ball(R.cx - R.w * 0.25 + i * 0.3, R.h + 2.2 + i * 0.6, R.cz - 1.5, 0.35 + i * 0.12, 0.3 + i * 0.1, 0.35 + i * 0.12, '#fffdf4', 0);
    standBoard(k, R.doorX - 3.2, Z + 1.6, mark, '#3f3d3a', '#fffaf0', 0.15);
  }
  DRESS.onsen = shop((k, R, Z) => {
    for (const s of [-2.3, 2.3]) lantern(k, R.doorX + s, 3.6, Z + 0.25, '#fffaf0');
    for (const s of [-2.3, 2.3]) text(k, R.doorX + s, 3.6, Z + 0.64, 0.3, 0.4, ['♨'], '#d98f78', 0.3);
  }, (k, R, Z) => bathFront(k, R, Z, ['온천', '어른 300', '아이 150']));
  DRESS.sauna = shop((k, R, Z) => {
    k.box(R.doorX + 2.6, 2.6, Z + 0.05, 0.9, 1.2, 0.02, '#fffdf4', 0);
    text(k, R.doorX + 2.6, 2.6, Z + 0.07, 0.8, 1.1, ['사우나', '냉탕', '휴게실'], '#7d5a44', 0.13);
  }, (k, R, Z) => bathFront(k, R, Z, ['사우나', '어른 400', '수건 있음']));
}(typeof self !== 'undefined' ? self : this));
