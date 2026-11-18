'use strict';

// 치이카와 심즈 — 하치와레 집의 바위 절벽 (2026-11-09 이재헌 지시)
// 둥근 공을 겹쳐 쌓던 외벽을 이어진 절벽 한 덩어리로 바꾼다. 불규칙한 돌출, 가로 지층 띠, 금, 꼭대기의 이끼와 풀
(function (root) {
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = smooth(x - i), fy = smooth(y - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2.1 + 7, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3 + 3) * 0.15;

  const INK = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
  const toon = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const STRATA = [new THREE.Color('#c7d0d6'), new THREE.Color('#b4bfc7'), new THREE.Color('#d3dadf'), new THREE.Color('#a5b1ba')];
  const MOSS = new THREE.Color('#9dbb83');
  const CRACK = new THREE.Color('#7f8f9b');
  const tmp = new THREE.Color();

  // 앞면 → 꼭대기 → 뒤로 넘어가는 단면
  const PROFILE = [[0, 0], [1.6, 0.25], [3.4, 0.1], [5.4, 0.5], [7.2, 0.55], [9, 1.1], [10.4, 1.6], [11.3, 2.6], [11.6, 4.2], [11.2, 7], [10, 10.5], [7, 14], [3, 16.5], [0, 18]];
  const RING = 3;
  function point(x, v, zf, mouth) {
    const n = v * (PROFILE.length - 1);
    const i = Math.min(PROFILE.length - 2, Math.floor(n));
    const t = n - i;
    let y = PROFILE[i][0] + (PROFILE[i + 1][0] - PROFILE[i][0]) * t;
    let back = PROFILE[i][1] + (PROFILE[i + 1][1] - PROFILE[i][1]) * t;
    // 높이를 x 방향으로 울퉁불퉁하게, 앞면은 바위가 튀어나오게
    const crest = 1 + (fbm(x * 0.08, 3.1) - 0.5) * 0.5;
    y *= crest;
    const push = (fbm(x * 0.22, y * 0.24) - 0.5) * 3.2;
    const damp = mouth ? Math.min(1, Math.max(0, (Math.hypot(x / (mouth + 1.6), y / 7) - 0.8) / 0.5)) : 1;
    const ledge = Math.floor(y / 1.9) * 0.16 * (noise(x * 0.35, Math.floor(y / 1.9)) - 0.5) * 5;
    return { x: x + (fbm(y * 0.2, x * 0.2) - 0.5) * 1.2 * damp, y, z: zf - back + (push + ledge) * damp, base: y };
  }
  function colorAt(p, x) {
    const band = Math.floor((p.base + noise(x * 0.2, 1) * 1.2) / 1.25);
    tmp.copy(STRATA[((band % RING) + RING) % RING + (noise(x * 0.5, band) > 0.72 ? 1 : 0)]);
    const mottled = fbm(x * 0.7, p.base * 0.9);
    tmp.multiplyScalar(0.92 + mottled * 0.16);
    if (noise(x * 0.9, p.base * 0.35) > 0.8) tmp.lerp(CRACK, 0.55);
    const top = Math.max(0, Math.min(1, (p.base - 8.6) / 2));
    if (top > 0 && fbm(x * 0.4, p.base * 0.5 + 9) > 0.46 - top * 0.25) tmp.lerp(MOSS, 0.5 + top * 0.5);
    return tmp;
  }
  // x0~x1 구간 절벽. mouth를 주면 그 폭의 아치 구멍을 뚫는다
  function cliff(group, x0, x1, zf, mouth) {
    const cols = Math.ceil((x1 - x0) / 0.5);
    const rows = 56;
    const pts = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) pts.push(point(x0 + ((x1 - x0) * i) / cols, j / rows, zf, mouth));
    const inArch = p => mouth && p.z > zf - 2.5 && Math.abs(p.x) < mouth && p.base < 4.4 - mouth + Math.sqrt(Math.max(0, mouth * mouth - p.x * p.x)) + (Math.abs(p.x) < mouth ? 0 : 0);
    const pos = [];
    const col = [];
    const put = p => {
      pos.push(p.x, p.y, p.z);
      const c = colorAt(p, p.x);
      col.push(c.r, c.g, c.b);
    };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = pts[j * (cols + 1) + i], b = pts[j * (cols + 1) + i + 1];
      const c = pts[(j + 1) * (cols + 1) + i], d = pts[(j + 1) * (cols + 1) + i + 1];
      if ([a, b, c, d].some(inArch)) continue;
      put(a); put(b); put(c);
      put(b); put(d); put(c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, toon);
    m.castShadow = true;
    m.receiveShadow = true;
    const hullGeo = geo.clone();
    const p = hullGeo.attributes.position;
    const n = hullGeo.attributes.normal;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * 0.07, p.getY(i) + n.getY(i) * 0.07, p.getZ(i) + n.getZ(i) * 0.07);
    const hull = new THREE.Mesh(hullGeo, INK);
    hull.raycast = () => {};
    m.add(hull);
    group.add(m);
    // 바위벽의 돌 테두리: 동굴 안 벽과 같은 돌 무늬(먹선·빗금)를 절벽 겉면에 얇게 덧입혀 큰 돌이 쌓인 벽으로 보이게 한다
    // 위쪽 이끼 덮인 곳은 빼고, 돌 하나가 가로 약 4, 세로 약 2.5가 되도록 펼친다
    const skin = typeof SKINS !== 'undefined' && SKINS.caveStone;
    if (skin) {
      const sp = [], uv = [];
      for (let i = 0; i < pos.length / 3; i += 3) {
        const ys = [pos[i * 3 + 1], pos[i * 3 + 4], pos[i * 3 + 7]];
        if (Math.max(...ys) > 9.2) continue;
        for (let v = i; v < i + 3; v++) {
          // 면마다 법선이 달라 밖으로 밀면 삼각형 사이에 틈(흰 줄)이 생긴다 → 제자리에 두고 polygonOffset으로 위에 그린다
          sp.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
          uv.push(pos[v * 3] / 9, pos[v * 3 + 1] / 10);
        }
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const sm = skin.clone();
      sm.side = THREE.DoubleSide;
      sm.polygonOffset = true;
      sm.polygonOffsetFactor = -2;
      const s = new THREE.Mesh(sg, sm);
      s.raycast = () => {};
      group.add(s);
    }
    return m;
  }
  // 입구 둘레의 쐐기돌, 발치의 부서진 돌, 절벽을 타고 내려온 덩굴
  function trim(k, w, zf) {
    const r = w / 2 + 0.28;
    const stones = 11;
    for (let i = 0; i <= stones; i++) {
      const a = Math.PI * (i / stones);
      const b = k.box(Math.cos(a) * r, 4.4 - w / 2 + Math.sin(a) * r, zf + 0.12, 0.62 + (i % 2) * 0.12, 0.42, 0.5, i % 3 ? '#d3dadf' : '#b4bfc7', 2);
      b.rotation.z = a - Math.PI / 2;
    }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.box(s * r, 0.34 + i * 0.68, zf + 0.12, 0.66 - (i % 2) * 0.1, 0.62, 0.5, i % 2 ? '#c7d0d6' : '#a5b1ba', 2);
    const fall = [[-7.8, 0.3, 11.5], [-9.5, 0.2, 12], [7.4, 0.3, 11.6], [9.8, 0.18, 12.1], [4.2, 0.15, 11.8], [-4.6, 0.16, 11.8]];
    for (const [x, y, z] of fall) {
      const g = new THREE.DodecahedronGeometry(0.6, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const q = 0.8 + noise(p.getX(i) * 3 + x, p.getY(i) * 3 + p.getZ(i) * 3) * 0.5;
        p.setXYZ(i, p.getX(i) * q, p.getY(i) * q * 0.72, p.getZ(i) * q);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: '#b4bfc7' }));
      m.position.set(x, y + 0.22, z);
      m.add(new THREE.Mesh(g, INK));
      m.children[0].scale.setScalar(1.07);
      m.castShadow = true;
      k.group.add(m);
    }
    // 덩굴: 가는 줄기에 잎이 좌우로 번갈아 붙어 늘어진다
    const stemMat = new THREE.MeshToonMaterial({ color: '#6f8f55' });
    const leafGeo = new THREE.SphereGeometry(0.3, 10, 6);
    for (const [x, top, len] of [[-5.2, 10.5, 5.4], [-2.7, 9.2, 3.2], [3.5, 10.6, 4.6], [6.4, 9.6, 5.8]]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(x + Math.sin(u * 5 + x) * 0.25, top - u * len, zf + 0.7 + Math.sin(u * 3) * 0.12)); }
      const curve = new THREE.CatmullRomCurve3(pts);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.05, 5), stemMat);
      k.group.add(stem);
      const n = Math.round(len / 0.38);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, p = curve.getPoint(u), s = i % 2 ? 1 : -1;
        const leaf = new THREE.Mesh(leafGeo, new THREE.MeshToonMaterial({ color: i % 3 ? '#8fb37a' : '#a3c48e' }));
        const ink = new THREE.Mesh(leafGeo, INK); ink.scale.setScalar(1.12); leaf.add(ink);
        leaf.scale.set(1 - u * 0.3, 0.55 - u * 0.15, 0.25);
        leaf.position.set(p.x + s * 0.24, p.y, p.z + 0.05);
        leaf.rotation.z = s * 0.7;
        k.group.add(leaf);
      }
    }
  }
  root.CaveRock = { cliff, trim };
}(typeof self !== 'undefined' ? self : this));
