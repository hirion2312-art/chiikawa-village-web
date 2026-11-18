'use strict';

// 치이카와 심즈 — 작은 소품 다시 만들기 (2026-11-10 이재헌 지시)
// 손에 드는 물건과 동작 중에 잠깐 나오는 물건을 상자·공 하나로 때우지 않고 만든다.
// 크기와 손잡는 자리는 기존 모델과 같게 두어 동작·몸 간격은 그대로다. 원점 = 손, +Z = 몸에서 먼 쪽, +Y = 위
(function (root) {
  const { BUILD, HAND } = root.VillageProps;
  const INK = '#4a3230';
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const INFLATE = 0.0065;
  function outline(mesh, geo, amount = INFLATE) {
    const hull = geo.clone();
    const p = hull.attributes.position, n = hull.attributes.normal;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * amount, p.getY(i) + n.getY(i) * amount, p.getZ(i) + n.getZ(i) * amount);
    mesh.add(new THREE.Mesh(hull, inkMat));
  }
  // color는 색 문자열이나 만들어 둔 재질
  function part(parent, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, ink = true) {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? new THREE.MeshToonMaterial({ color }) : color);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    if (ink) outline(m, geo);
    parent.add(m);
    return m;
  }
  const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
  const sph = (r, a = 14, b = 10) => new THREE.SphereGeometry(r, a, b);
  const torus = (r, t, a = 6, b = 22) => new THREE.TorusGeometry(r, t, a, b);
  const FLAT = Math.PI / 2;

  // 작은 글씨 판: 처음 쓸 때 한 번만 그린다
  const textures = new Map();
  function paper(key, w, h, draw) {
    if (!textures.has(key)) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'), w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textures.set(key, tex);
    }
    return new THREE.MeshToonMaterial({ map: textures.get(key) });
  }
  const FONT = '"Jua","Malgun Gothic",sans-serif';
  const label = (g, text, x, y, size, color) => {
    g.fillStyle = color;
    g.font = `${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x, y);
  };

  /* ---------- 책 ---------- */
  const cover = () => paper('book-cover', 256, 192, (g, w, h) => {
    g.fillStyle = '#8fb6d6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7aa3c6';
    g.fillRect(0, 0, 30, h);
    g.strokeStyle = '#fff4e4';
    g.lineWidth = 6;
    g.strokeRect(48, 22, w - 70, h - 44);
    label(g, '풀뽑기', w / 2 + 14, h / 2 - 16, 42, '#fff4e4');
    label(g, '교본', w / 2 + 14, h / 2 + 30, 34, '#fff4e4');
  });
  const pageEdge = () => paper('book-pages', 64, 32, (g, w, h) => {
    g.fillStyle = '#fbf3e0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9cbb0';
    for (let y = 3; y < h; y += 5) g.fillRect(0, y, w, 1);
  });
  const pageText = key => paper(`page-${key}`, 128, 180, (g, w, h) => {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b8a890';
    for (let y = 16; y < h - 12; y += 13) g.fillRect(12, y, (w - 24) * (y % 3 ? 1 : 0.7), 4);
    if (key) {
      g.fillStyle = '#a8d8b4';
      g.fillRect(16, 60, 96, 50);
    }
  });
  BUILD.book = () => {
    const g = new THREE.Group();
    const b = new THREE.Group();
    b.position.set(0, 0, 0.12);
    b.rotation.x = -0.5;
    g.add(b);
    const board = box(0.28, 0.009, 0.2);
    part(b, board, new THREE.MeshToonMaterial({ color: '#7aa3c6' }), 0, -0.0145, 0, 0, 0, 0);
    part(b, board, cover(), 0, 0.0145, 0, 0, 0, 0);
    part(b, box(0.262, 0.02, 0.188), pageEdge(), 0.004, 0, 0, 0, 0, 0, false);
    part(b, box(0.012, 0.038, 0.2), '#6b93b6', -0.138, 0, 0);
    part(b, box(0.02, 0.003, 0.05), '#f2748e', 0.04, 0.02, 0.118, 0, 0, 0, false);
    return g;
  };
  // 펼친 책: 읽는 동작에서 쓴다. 표지 두 장이 얕은 V로 벌어지고 위에 책장이 얹힌다
  BUILD.book_open = () => {
    const g = new THREE.Group();
    const b = new THREE.Group();
    b.position.set(0, 0, 0.12);
    b.rotation.x = -0.5;
    g.add(b);
    for (const s of [-1, 1]) {
      const side = new THREE.Group();
      side.rotation.z = s * 0.2;
      b.add(side);
      part(side, box(0.15, 0.008, 0.2), '#7aa3c6', s * 0.075, -0.006, 0);
      part(side, box(0.142, 0.016, 0.188), pageEdge(), s * 0.074, 0.006, 0, 0, 0, 0, false);
      const sheet = part(side, new THREE.PlaneGeometry(0.136, 0.18), pageText(s > 0 ? 'a' : ''), s * 0.074, 0.0145, 0, -FLAT, 0, 0, false);
      sheet.castShadow = false;
    }
    part(b, box(0.016, 0.012, 0.2), '#6b93b6', 0, -0.012, 0);
    part(b, box(0.016, 0.003, 0.24), '#f2748e', 0, 0.018, 0.02, 0, 0, 0, false);
    return g;
  };
  HAND.book_open = 1;

  /* ---------- 그릇·잔 ---------- */
  BUILD.bowl = () => {
    const g = new THREE.Group();
    const body = part(g, lathe([[0.075, -0.062], [0.082, -0.062], [0.09, -0.05], [0.13, -0.026], [0.165, 0.03], [0.178, 0.062], [0.17, 0.066], [0.155, 0.03], [0.12, -0.016], [0, -0.03]]), '#f2e6cf', 0, 0, 0.17);
    body.material.side = THREE.DoubleSide;
    part(g, torus(0.168, 0.006, 6, 26), '#d6776a', 0, 0.044, 0.17, FLAT, 0, 0, false);
    part(g, cyl(0.15, 0.15, 0.012, 22), '#e9b86a', 0, 0.046, 0.17, 0, 0, 0, false);
    for (let i = 0; i < 4; i++) part(g, torus(0.05 + i * 0.022, 0.0055, 5, 18), '#f4dc98', 0.012 - i * 0.008, 0.054, 0.165 + i * 0.006, FLAT, 0, i * 0.4, false);
    part(g, box(0.07, 0.004, 0.05), '#46604a', 0.076, 0.058, 0.13, 0, 0.5, 0, false);
    const egg = part(g, sph(0.033, 12, 8), '#fffaf0', -0.075, 0.056, 0.2, 0, 0, 0, false);
    egg.scale.y = 0.5;
    const yolk = part(g, sph(0.016, 10, 6), '#f3b13c', -0.075, 0.07, 0.2, 0, 0, 0, false);
    yolk.scale.y = 0.45;
    for (const [x, z] of [[0.03, 0.12], [0.05, 0.22], [-0.02, 0.1], [0.09, 0.2], [-0.05, 0.25]]) part(g, cyl(0.006, 0.006, 0.006, 8), '#79b267', x, 0.058, z, 0, 0, 0, false);
    return g;
  };
  BUILD.cup = () => {
    const g = new THREE.Group();
    const body = part(g, lathe([[0.04, -0.056], [0.06, -0.052], [0.072, -0.02], [0.077, 0.06], [0.072, 0.063], [0.066, 0.02], [0, -0.04]]), '#f7f1e4', 0, 0.02, 0.08);
    body.material.side = THREE.DoubleSide;
    part(g, cyl(0.066, 0.066, 0.006, 18), '#b98a5a', 0, 0.064, 0.08, 0, 0, 0, false);
    part(g, torus(0.075, 0.004, 5, 22), '#8fb6d6', 0, 0.03, 0.08, FLAT, 0, 0, false);
    part(g, torus(0.03, 0.009, 6, 14, Math.PI), '#f7f1e4', 0.088, 0.03, 0.08, 0, 0, -FLAT);
    return g;
  };

  /* ---------- 돈주머니 ---------- */
  BUILD.pouch = () => {
    const g = new THREE.Group();
    part(g, lathe([[0, -0.09], [0.06, -0.082], [0.094, -0.04], [0.095, 0.02], [0.06, 0.07], [0.03, 0.092], [0.044, 0.115], [0.05, 0.13], [0, 0.128]]), '#c79a5b', 0, 0.06, 0.08);
    part(g, torus(0.032, 0.008, 6, 14), '#7d5a44', 0, 0.152, 0.08, FLAT, 0, 0, false);
    for (const s of [-1, 1]) part(g, cyl(0.005, 0.005, 0.07, 6), '#7d5a44', s * 0.03, 0.135, 0.116, 0.2, 0, s * 0.3, false);
    part(g, cyl(0.036, 0.036, 0.01, 14), '#f2c230', 0, 0.06, 0.17, FLAT, 0, 0);
    part(g, cyl(0.012, 0.012, 0.012, 8), '#c99a2e', 0, 0.06, 0.171, FLAT, 0, 0, false);
    return g;
  };

  /* ---------- 나무 바가지 ---------- */
  BUILD.bucket = () => {
    const g = new THREE.Group();
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = part(g, box(0.078, 0.2, 0.018), i % 2 ? '#e9c46a' : '#e0b75c', Math.sin(a) * 0.145, 0.08, 0.1 + Math.cos(a) * 0.145, 0, a, 0, false);
      s.rotation.order = 'YXZ';
      s.rotation.x = 0.11;
    }
    part(g, cyl(0.13, 0.13, 0.015, 18), '#c9a050', 0, -0.012, 0.1, 0, 0, 0, false);
    for (const y of [0.02, 0.14]) part(g, torus(y > 0.1 ? 0.163 : 0.138, 0.008, 6, 26), '#8c6a46', 0, y, 0.1, FLAT, 0, 0);
    part(g, cyl(0.146, 0.146, 0.01, 20), '#9fd6e6', 0, 0.15, 0.1, 0, 0, 0, false);
    const shine = part(g, sph(0.05, 10, 6), '#d6eff6', 0.05, 0.156, 0.14, 0, 0, 0, false);
    shine.scale.set(1, 0.08, 0.6);
    part(g, box(0.04, 0.02, 0.2), '#d9b98a', 0, 0.14, -0.11);
    return g;
  };

  /* ---------- 커피우유 병 ---------- */
  BUILD.milk = () => {
    const g = new THREE.Group();
    part(g, lathe([[0, -0.12], [0.07, -0.12], [0.076, -0.1], [0.076, 0.02], [0.062, 0.06], [0.046, 0.1], [0.05, 0.115], [0.046, 0.12], [0, 0.12]]), '#e4bd86', 0, 0.08, 0.05);
    part(g, cyl(0.048, 0.048, 0.008, 14), '#f7f1e4', 0, 0.202, 0.05, 0, 0, 0, false);
    part(g, torus(0.047, 0.005, 5, 18), '#7f9ec2', 0, 0.2, 0.05, FLAT, 0, 0, false);
    const tag = paper('milk-label', 128, 64, (c, w, h) => {
      c.fillStyle = '#fff4e4';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#7f9ec2';
      c.fillRect(0, 0, w, 10);
      c.fillRect(0, h - 10, w, 10);
      label(c, '커피우유', w / 2, h / 2 + 2, 26, '#7a5245');
    });
    const band = new THREE.CylinderGeometry(0.0775, 0.0775, 0.08, 18, 1, true);
    part(g, band, tag, 0, 0.05, 0.05, 0, Math.PI, 0, false);
    return g;
  };

  /* ---------- 마이크 ---------- */
  BUILD.mic = () => {
    const g = new THREE.Group();
    part(g, lathe([[0, -0.115], [0.018, -0.115], [0.022, -0.1], [0.03, 0.08], [0.033, 0.1], [0, 0.1]]), '#4b4b52', 0, 0.03, 0.05);
    part(g, box(0.014, 0.05, 0.008), '#d6776a', 0, 0.03, 0.08, 0, 0, 0, false);
    part(g, torus(0.036, 0.006, 6, 16), '#d3d6da', 0, 0.128, 0.05, FLAT, 0, 0);
    part(g, sph(0.058, 14, 12), paper('mic-grille', 64, 64, (c, w, h) => {
      c.fillStyle = '#c9c5bb';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#8f8c84';
      for (let y = 2; y < h; y += 6) for (let x = (y % 12) ? 2 : 5; x < w; x += 6) c.fillRect(x, y, 2, 2);
    }), 0, 0.172, 0.05);
    return g;
  };

  /* ---------- 먹을 것 ---------- */
  BUILD.sausage = () => {
    const g = new THREE.Group();
    const s = new THREE.Group();
    s.position.set(0, 0.04, 0.16);
    s.rotation.x = FLAT - 0.5;
    g.add(s);
    part(s, new THREE.CapsuleGeometry(0.058, 0.23, 6, 14), '#e7a08f', 0, 0, 0);
    for (const y of [-0.08, 0, 0.08]) part(s, box(0.095, 0.011, 0.012), '#b0604f', 0, y, 0.054, 0.5, 0, 0, false);
    part(s, cyl(0.009, 0.009, 0.24, 8), '#d9b98a', 0, -0.2, 0, 0, 0, 0);
    return g;
  };
  BUILD.cone = () => {
    const g = new THREE.Group();
    const waffle = paper('waffle', 64, 64, (c, w, h) => {
      c.fillStyle = '#e0b878';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#b98a4e';
      c.lineWidth = 3;
      for (let i = -64; i < 128; i += 14) {
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, h); c.stroke();
        c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, h); c.stroke();
      }
    });
    part(g, new THREE.ConeGeometry(0.075, 0.2, 18), waffle, 0, 0.04, 0.08, Math.PI, 0, 0);
    part(g, torus(0.074, 0.009, 6, 20), '#c99a5a', 0, 0.138, 0.08, FLAT, 0, 0, false);
    [[0.078, 0.158], [0.062, 0.2], [0.044, 0.236], [0.025, 0.264]].forEach(([r, y], i) => {
      const t = part(g, torus(r, 0.034 - i * 0.004, 8, 22), '#fffaf0', i % 2 ? 0.006 : -0.006, y, 0.08, FLAT, 0, i * 1.1);
      t.scale.z = 1.15;
    });
    const tip = part(g, new THREE.ConeGeometry(0.022, 0.05, 10), '#fffaf0', 0.004, 0.296, 0.08, 0, 0, -0.5);
    tip.castShadow = false;
    return g;
  };
  BUILD.snack = () => {
    const g = new THREE.Group();
    const face = paper('snack', 128, 160, (c, w, h) => {
      c.fillStyle = '#f3a9bd';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff4e4';
      c.beginPath(); c.ellipse(w / 2, h / 2 + 8, 46, 44, 0, 0, 7); c.fill();
      label(c, '과자', w / 2, h / 2 + 8, 40, '#d6576e');
      c.fillStyle = '#f2748e';
      for (let i = 0; i < 8; i++) c.fillRect(i * 18 + 2, 12, 8, 14);
    });
    part(g, box(0.22, 0.24, 0.07), face, 0, 0.06, 0.1);
    for (const y of [-0.066, 0.186]) {
      for (let i = 0; i < 7; i++) part(g, box(0.03, 0.022, 0.03), '#f7c3d0', -0.09 + i * 0.03, y, 0.1, 0, 0, i % 2 ? 0.28 : -0.28, false);
    }
    return g;
  };
  BUILD.skewer = () => {
    const g = new THREE.Group();
    const s = new THREE.Group();
    s.position.set(0, 0.05, 0.14);
    s.rotation.x = FLAT - 0.6;
    g.add(s);
    part(s, cyl(0.008, 0.009, 0.46, 8), '#d9b98a', 0, 0.02, 0);
    [[0.04, 0.078, '#c9894a'], [0.135, 0.074, '#b7763e'], [0.22, 0.062, '#c9894a']].forEach(([y, r, c], i) => {
      const m = part(s, new THREE.DodecahedronGeometry(r, 1), c, i % 2 ? 0.008 : -0.008, y, 0);
      m.scale.y = 0.72;
      part(s, cyl(r * 0.72, r * 0.72, 0.012, 12), '#8c4f28', i % 2 ? 0.008 : -0.008, y + r * 0.32, r * 0.2, 0.3, 0, 0, false);
    });
    return g;
  };

  /* ---------- 노동 플레이트 ---------- */
  BUILD.plate = () => {
    const g = new THREE.Group();
    const wood = paper('plate-face', 128, 72, (c, w, h) => {
      c.fillStyle = '#d9b98a';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c4a06c';
      c.lineWidth = 2;
      for (let y = 8; y < h; y += 13) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(40, y + 4, 90, y - 4, w, y); c.stroke(); }
      label(c, '노동', w / 2, h / 2 + 3, 36, '#7d5a44');
    });
    part(g, box(0.22, 0.12, 0.022), wood, 0, 0.03, 0.07);
    part(g, torus(0.016, 0.005, 5, 12), '#7d5a44', 0, 0.092, 0.07);
    part(g, torus(0.03, 0.003, 4, 14), '#b0413c', 0, 0.118, 0.07, 0, 0, 0, false);
    return g;
  };
  BUILD.ticket = () => {
    const g = new THREE.Group();
    const t = paper('ticket', 160, 100, (c, w, h) => {
      c.fillStyle = '#fff2b8';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d6776a';
      c.lineWidth = 4;
      c.strokeRect(6, 6, w - 12, h - 12);
      c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(118, 8); c.lineTo(118, h - 8); c.stroke();
      c.setLineDash([]);
      label(c, '식권', 62, 50, 38, '#7a5245');
      label(c, '1', 138, 50, 34, '#d6776a');
    });
    part(g, box(0.16, 0.1, 0.006), t, 0, 0.03, 0.06, 0, 0, 0);
    return g;
  };
  /* ---------- 낚싯대 ---------- */
  BUILD.rod = () => {
    const g = new THREE.Group();
    const s = new THREE.Group();
    s.position.set(0, 0.32, 0.6);
    s.rotation.x = FLAT - 0.5;
    g.add(s);
    part(s, cyl(0.009, 0.02, 1.4, 10), '#a97c50', 0, 0, 0);
    part(s, cyl(0.026, 0.026, 0.28, 12), '#5d5148', 0, -0.54, 0);
    for (let i = 0; i < 5; i++) part(s, torus(0.018 - i * 0.002, 0.003, 4, 10), '#d3d6da', 0, -0.2 + i * 0.2, -0.018, 0, FLAT, 0, false);
    const reel = part(s, cyl(0.05, 0.05, 0.04, 16), '#d3d6da', 0.04, -0.36, 0, 0, 0, FLAT);
    part(reel, cyl(0.012, 0.012, 0.05, 8), '#f2748e', 0, 0.03, 0.03, 0, 0, 0, false);
    return g;
  };
  /* ---------- 수건 ---------- */
  BUILD.towel = () => {
    const g = new THREE.Group();
    part(g, box(0.22, 0.012, 0.16), '#9fd0ea', 0, -0.012, 0.09);
    part(g, box(0.22, 0.012, 0.16), '#b3dcf0', 0, 0.002, 0.09);
    part(g, box(0.214, 0.012, 0.15), '#c8e6f5', 0, 0.016, 0.086);
    for (const z of [0.04, 0.14]) part(g, box(0.222, 0.002, 0.014), '#fffaf0', 0, 0.023, z, 0, 0, 0, false);
    part(g, cyl(0.016, 0.016, 0.224, 10), '#b3dcf0', 0, 0.003, 0.168, 0, 0, FLAT);
    return g;
  };

  /* ---------- 동작 중에 잠깐 나오는 것 ---------- */
  const FX = root.ActFx.FX;
  // 뽑힌 풀: 길쭉한 잎 여러 장, 뿌리 다발, 흙 덩이
  function bladeGeo(len, bend) {
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      pts.push(new THREE.Vector3(bend * u * u, len * u, 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.02, 5, false);
  }
  const clod = r => {
    const g = new THREE.DodecahedronGeometry(r, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const q = 0.82 + 0.3 * Math.abs(Math.sin(p.getX(i) * 31 + p.getY(i) * 17 + p.getZ(i) * 23));
      p.setXYZ(i, p.getX(i) * q, p.getY(i) * q, p.getZ(i) * q);
    }
    g.computeVertexNormals();
    return g;
  };
  function makeWeed(g) {
    const t = new THREE.Group();
    g.add(t);
    [[0.46, 0.14, 0], [0.4, -0.12, 1.3], [0.34, 0.1, 2.6], [0.38, -0.08, 3.9], [0.3, 0.12, 5.1]].forEach(([len, bend, ry], i) => {
      part(t, bladeGeo(len, bend), i % 2 ? '#86bb73' : '#9bcf84', 0, 0, 0, 0, ry, 0, i < 3);
    });
    part(t, clod(0.085), '#8f7350', 0, -0.05, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26;
      part(t, cyl(0.005, 0.009, 0.16, 5), '#e0cfa8', Math.sin(a) * 0.05, -0.15, Math.cos(a) * 0.05, Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4, false);
    }
    return t;
  }
  FX.weed.make = g => ({ tuft: makeWeed(g), dirt: [part(g, clod(0.07), '#a68a66'), part(g, clod(0.05), '#957a58')] });
  // 나르는 풀 더미 (carry): 묶인 풀단
  FX.carry.make = g => {
    const m = [];
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group();
      b.position.set(i * 0.34 - 0.5, 0.05 + (i % 2) * 0.1, (i % 2) * 0.1);
      b.rotation.z = (i % 2 ? 1 : -1) * 0.3;
      g.add(b);
      for (let k = 0; k < 7; k++) part(b, bladeGeo(0.5, (k - 3) * 0.05), k % 2 ? '#8fc47b' : '#a7d38a', (k - 3) * 0.025, 0, (k % 3 - 1) * 0.03, 0, k * 0.9, 0, k < 3);
      part(b, torus(0.075, 0.016, 5, 14), '#c9a57c', 0, 0.16, 0, FLAT, 0, 0);
      m.push(b);
    }
    return { m };
  };
  // 레몬 스티커: 꼭지가 있는 레몬과 동그란 스티커
  FX.work.make = g => {
    const lemon = new THREE.Group();
    g.add(lemon);
    const body = part(lemon, sph(0.34, 18, 14), '#f2dd64', 0, 0, 0);
    body.scale.set(1.18, 0.92, 0.92);
    for (const s of [-1, 1]) part(lemon, new THREE.ConeGeometry(0.07, 0.11, 10), '#ecd14e', s * 0.42, 0, 0, 0, 0, -s * FLAT);
    part(lemon, cyl(0.016, 0.02, 0.06, 6), '#7d6250', -0.47, 0, 0, 0, 0, FLAT, false);
    const leaf = part(lemon, sph(0.09, 10, 6), '#86bb73', -0.44, 0.08, 0, 0, 0, 0.6);
    leaf.scale.set(1, 0.3, 0.6);
    const sticker = part(g, cyl(0.12, 0.12, 0.01, 18), paper('lemon-sticker', 64, 64, (c, w, h) => {
      c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h);
      label(c, '레몬', w / 2, h / 2 + 2, 22, '#d9a92e');
    }), 0, 0, 0, FLAT, 0, 0);
    return { lemon, sticker };
  };
  // 가게에서 집어 보는 물건: 끈 묶은 작은 상자
  FX.browse.make = g => {
    const item = new THREE.Group();
    g.add(item);
    part(item, box(0.5, 0.42, 0.3), '#f3a9bd', 0, 0, 0);
    part(item, box(0.52, 0.44, 0.05), '#fff4e4', 0, 0, 0, 0, 0, 0, false);
    part(item, box(0.06, 0.44, 0.32), '#fff4e4', 0, 0, 0, 0, 0, 0, false);
    for (const s of [-1, 1]) {
      const bow = part(item, torus(0.06, 0.018, 5, 12), '#f2748e', s * 0.07, 0.25, 0, FLAT, 0, 0);
      bow.scale.y = 0.6;
    }
    return { item };
  };
  // 넘기는 책장: 글줄이 있는 얇은 종이
  FX.read.make = g => {
    const page = part(g, box(0.5, 0.012, 0.7), pageText(''), 0, 0, 0);
    return { page };
  };
  // 저울: 받침, 접시, 눈금판, 그 위의 풀 더미
  FX.weigh.make = g => {
    const base = new THREE.Group();
    g.add(base);
    part(base, box(1.1, 0.14, 1.1), '#c9c0ac', 0, 0, 0);
    part(base, cyl(0.46, 0.5, 0.06, 22), '#e0dccd', 0, 0.1, 0);
    part(base, torus(0.47, 0.02, 6, 26), '#a9a395', 0, 0.13, 0, FLAT, 0, 0, false);
    const pile = new THREE.Group();
    g.add(pile);
    for (let k = 0; k < 9; k++) part(pile, bladeGeo(0.3 + (k % 3) * 0.05, (k - 4) * 0.05), k % 2 ? '#8fc47b' : '#a7d38a', (k - 4) * 0.05, -0.1, (k % 3 - 1) * 0.12, 0, k * 0.8, 0, k < 4);
    const needle = new THREE.Group();
    g.add(needle);
    const dial = part(needle, cyl(0.3, 0.3, 0.05, 20), '#fffaf0', 0, 0, -0.04, FLAT, 0, 0);
    dial.scale.setScalar(1);
    part(needle, box(0.04, 0.26, 0.02), '#d6776a', 0, 0.12, 0.02, 0, 0, 0, false);
    return { base, needle, pile };
  };
  // 도시락 먹을 때 나오는 김은 그대로 둔다

  // 읽는 단계는 펼친 책으로
  const READING = new Set(['page_read', 'read_book', 'study_home', 'exam_write']);
  root.PropModels = {
    kit: { part, lathe, sph, cyl, box, torus, paper, FLAT },
    apply(sim) {
      let n = 0;
      for (const x of sim.interactions) for (const st of x.steps) {
        if (st.prop === 'book' && READING.has(st.clip)) {
          st.prop = 'book_open';
          n++;
        }
      }
      root.ANIM_PROP_SCALE.book_open = root.ANIM_PROP_SCALE.book;
      if (root.ANIM_PROP_LEAN) root.ANIM_PROP_LEAN.book_open = root.ANIM_PROP_LEAN.book;
      return n;
    },
  };
}(typeof self !== 'undefined' ? self : this));
