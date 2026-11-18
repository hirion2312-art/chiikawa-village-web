'use strict';

// 치이카와 심즈 — 일하는 갑옷씨
// assets/glb/knight.glb는 뼈대가 없는 통짜 모델이라, 불러올 때 높이와 좌우 위치로 부위를 나눠 뼈대를 심는다.
// 색은 가게마다 다르게 곱하고(텍스처는 하나를 나눠 쓴다), 동작은 지금 앞에 있는 손님이 하는 일에 맞춘다.
// 정산: 손님이 저울에 올리면 장부를 확인하고, 돈 주머니를 내밀고, 받아 가면 인사한다
(function (root) {
  const BASE_COLOR = '#b7aea6';       // 텍스처의 갑옷 바탕색 (곱하기로 색을 바꾼다)
  const SCALE = 1.6;              // 주민(키 약 1.7)보다 확실히 크게
  const FAR = 70;

  /* ---------- 불러오기 ---------- */

  async function loadModel(url) {
    const buf = await (await fetch(url)).arrayBuffer();
    const dv = new DataView(buf);
    const jl = dv.getUint32(12, true);
    const J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
    const bin = 20 + jl + 8;
    const acc = i => {
      const a = J.accessors[i];
      const v = J.bufferViews[a.bufferView];
      const s = bin + (v.byteOffset || 0) + (a.byteOffset || 0);
      const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] * a.count;
      return a.componentType === 5126 ? new Float32Array(buf, s, n) : a.componentType === 5125 ? new Uint32Array(buf, s, n) : new Uint16Array(buf, s, n);
    };
    const P = J.meshes[0].primitives[0];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(acc(P.attributes.POSITION), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(acc(P.attributes.NORMAL), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(acc(P.attributes.TEXCOORD_0), 2));
    geo.setIndex(new THREE.BufferAttribute(acc(P.indices), 1));
    const iv = J.bufferViews[J.images[0].bufferView];
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([new Uint8Array(buf, bin + (iv.byteOffset || 0), iv.byteLength)], { type: 'image/png' }));
    await img.decode();
    const tex = new THREE.Texture(img);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return { geo, tex };
  }

  /* ---------- 뼈대 ---------- */

  const JOINTS = {
    pelvis: [null, 0, 0.95, 0], spine: ['pelvis', 0, 1.1, 0], chest: ['spine', 0, 1.28, 0], head: ['chest', 0, 1.47, 0],
    armA: ['chest', 0.29, 1.38, -0.01], foreA: ['armA', 0.31, 1.04, -0.02], handA: ['foreA', 0.31, 0.8, 0.02],
    armB: ['chest', -0.29, 1.38, -0.01], foreB: ['armB', -0.31, 1.04, -0.02], handB: ['foreB', -0.31, 0.8, 0.02],
    hipA: ['pelvis', 0.11, 0.9, 0], kneeA: ['hipA', 0.12, 0.5, 0], hipB: ['pelvis', -0.11, 0.9, 0], kneeB: ['hipB', -0.12, 0.5, 0],
  };
  const NAMES = Object.keys(JOINTS);
  const smooth = (a, b, v) => {
    const u = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  // 정점마다 어느 뼈를 따를지 정한다 (이음매 근처만 둘을 섞는다)
  function skin(geo) {
    const pos = geo.attributes.position;
    const idx = new Uint16Array(pos.count * 4);
    const wgt = new Float32Array(pos.count * 4);
    const I = Object.fromEntries(NAMES.map((n, i) => [n, i]));
    const chain = (pairs, v) => {
      // pairs: [이름, 시작 높이] 아래에서 위로. 경계 ±0.04에서 섞는다
      for (let k = 1; k < pairs.length; k++) {
        const [up, y] = pairs[k];
        if (v < y + 0.04) {
          const [down] = pairs[k - 1];
          const u = smooth(y - 0.04, y + 0.04, v);
          return [[down, 1 - u], [up, u]];
        }
      }
      return [[pairs[pairs.length - 1][0], 1]];
    };
    // 팔은 높이마다 옆구리에 붙은 둥근 단면이다. 치마가 같은 폭까지 퍼져 있어 좌우 거리만으로는 치마까지 팔에 딸려 간다.
    // 치마가 닿지 않는 바깥쪽 점들로 높이별 팔 단면(중심·반지름)을 재서, 그 원 안의 점만 팔로 친다
    const STEP = 0.02;
    const slices = new Map();
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getY(i);
      const a = Math.abs(pos.getX(i));
      if (a < 0.27 || v < 0.56 || v > 1.3) continue;
      const k = Math.round(v / STEP);
      if (!slices.has(k)) slices.set(k, []);
      slices.get(k).push([a, pos.getZ(i)]);
    }
    // 바깥쪽 호의 점들에 원을 맞춘다 (최소제곱)
    const fit = pts => {
      if (pts.length < 8) return null;
      let [sx, sz, sxx, szz, sxz, sq, sqx, sqz] = [0, 0, 0, 0, 0, 0, 0, 0];
      for (const [px, pz] of pts) {
        const q = px * px + pz * pz;
        sx += px; sz += pz; sxx += px * px; szz += pz * pz; sxz += px * pz; sq += q; sqx += q * px; sqz += q * pz;
      }
      const n = pts.length;
      const a11 = sxx - sx * sx / n, a12 = sxz - sx * sz / n, a22 = szz - sz * sz / n;
      const b1 = (sqx - sq * sx / n) / 2, b2 = (sqz - sq * sz / n) / 2;
      const det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-12) return null;
      const cx = (b1 * a22 - b2 * a12) / det;
      const cz = (a11 * b2 - a12 * b1) / det;
      const r = Math.sqrt(Math.max(0, cx * cx + cz * cz + (sq - 2 * cx * sx - 2 * cz * sz) / n));
      return r > 0.03 && r < 0.12 ? { cx, cz, r } : null;
    };
    const fitted = new Map();
    const armCircle = v => {
      const k = Math.round(v / STEP);
      for (const t of [0, -1, 1, -2, 2, -3, 3]) {
        if (!fitted.has(k + t)) fitted.set(k + t, slices.has(k + t) ? fit(slices.get(k + t)) : null);
        if (fitted.get(k + t)) return fitted.get(k + t);
      }
      return null;
    };
    const armShare = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ax = Math.abs(x);
      const S = x >= 0 ? 'A' : 'B';
      const body = chain([[y < 0.9 ? `hip${S}` : 'pelvis', 0], ['pelvis', 0.9], ['spine', 1.06], ['chest', 1.24], ['head', 1.47]], y);
      const edge = 0.205 + smooth(1.24, 1.46, y) * 0.06;
      let armU = y > 0.6 && y < 1.5 ? smooth(edge - 0.014, edge + 0.014, ax) : 0;
      if (y > 1.42) armU *= 1 - smooth(1.42, 1.5, y);
      // 허리 아래로는 단면 원 안의 점만 팔이다 (치마는 몸을 따라간다)
      if (y < 1.24 && armU > 0) {
        const c = armCircle(y);
        // 치마가 닿지 않는 바깥쪽은 전부 팔이고, 안쪽은 단면 원 안의 점만 팔이다
        armU = ax >= 0.255 ? 1 : c ? 1 - smooth(c.r * 1.0, c.r * 1.1, Math.hypot(ax - c.cx, pos.getZ(i) - c.cz)) : 0;
      }
      // 팔은 갑옷 조각처럼 통째로 움직인다: 반쯤 걸친 정점이 있으면 팔을 들 때 면이 끌려가 바깥선이 갈라진다 (2026-11-10)
      armU = armU >= 0.5 ? 1 : 0;
      armShare[i] = armU;
      let list = [];
      if (armU < 1) for (const [n, w] of body) list.push([n, w * (1 - armU)]);
      if (armU > 0) for (const [n, w] of chain([[`hand${S}`, 0], [`fore${S}`, 0.82], [`arm${S}`, 1.06]], y)) list.push([n, w * armU]);
      // 다리: 무릎 아래는 정강이
      if (y < 0.55 && armU === 0) list = chain([[`knee${S}`, 0], [`hip${S}`, 0.5]], y);
      list = list.filter(e => e[1] > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const sum = list.reduce((a, e) => a + e[1], 0);
      list.forEach(([n, w], k) => {
        idx[i * 4 + k] = I[n];
        wgt[i * 4 + k] = w / sum;
      });
    }
    // 팔과 치마를 잇는 면은 팔을 들면 길게 늘어나므로 뺀다 (가만히 있을 때는 맞닿아 있어 보이지 않는다)
    const tri = geo.index.array;
    const kept = [];
    for (let t = 0; t < tri.length; t += 3) {
      const a = armShare[tri[t]], b = armShare[tri[t + 1]], c = armShare[tri[t + 2]];
      if (Math.max(a, b, c) - Math.min(a, b, c) > 0.5) continue;
      kept.push(tri[t], tri[t + 1], tri[t + 2]);
    }
    geo.setIndex(new THREE.BufferAttribute(tri.BYTES_PER_ELEMENT === 4 ? new Uint32Array(kept) : new Uint16Array(kept), 1));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wgt, 4));
  }
  function makeBones() {
    const bones = {};
    for (const n of NAMES) {
      const b = new THREE.Bone();
      b.name = n;
      bones[n] = b;
      const [parent, x, y, z] = JOINTS[n];
      if (parent) {
        const [, px, py, pz] = JOINTS[parent];
        b.position.set(x - px, y - py, z - pz);
        bones[parent].add(b);
      } else b.position.set(x, y, z);
    }
    return bones;
  }

  /* ---------- 손에 드는 것 ---------- */

  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const PROPS = {
    // 제초 주머니: 풀뽑기 현장과 같은 삼베 자루 (weeding-field.js)
    sack() {
      const g = new THREE.Group();
      const b = root.VillageProps && root.VillageProps.BUILD.sack ? root.VillageProps.BUILD.sack() : new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon('#d6bf92'));
      b.scale.setScalar(1.6);
      b.position.set(0, -0.05, 0.05);
      g.add(b);
      return g;
    },
    // 찻잔: 받침 접시 위 하얀 잔과 갈색 커피, 손잡이
    cup() {
      const g = new THREE.Group();
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 16), toon('#fffaf0'));
      dish.position.set(0, 0, 0.12);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.1, 14), toon('#fffaf0'));
      cup.position.set(0, 0.06, 0.12);
      const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.01, 14), toon('#7a4f33'));
      tea.position.set(0, 0.105, 0.12);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 10), toon('#fffaf0'));
      h.position.set(0.075, 0.06, 0.12);
      g.add(dish, cup, tea, h);
      return g;
    },
    // 타코야키 배: 나무 배 모양 접시에 동그란 타코야키 여섯 알, 소스와 가다랑어포
    boat() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.16), toon('#e6cf9e'));
      b.position.set(0, 0, 0.13);
      g.add(b);
      for (let i = 0; i < 6; i++) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), toon('#d99a52'));
        t.position.set(-0.09 + (i % 3) * 0.09, 0.045, 0.1 + Math.floor(i / 3) * 0.07);
        const sauce = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6, 0, Math.PI * 2, 0, Math.PI / 3), toon('#6b3b22'));
        sauce.position.copy(t.position);
        sauce.position.y += 0.008;
        g.add(t, sauce);
      }
      return g;
    },
    // 종이봉투: 접힌 윗단과 가게 도장
    bag() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.12), toon('#d9b98a'));
      b.position.set(0, -0.1, 0.12);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.04, 0.125), toon('#c9a876'));
      top.position.set(0, 0.04, 0.12);
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), toon('#d6776a'));
      m.position.set(0, -0.08, 0.183);
      g.add(b, top, m);
      return g;
    },
    // 시험지: 하얀 종이에 문제 줄
    paper() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.32), toon('#fffdf6'));
      b.position.set(0, 0, 0.17);
      g.add(b);
      for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.016, 0.012), toon('#8a8f99')); l.position.set(0.01, 0.002, 0.06 + i * 0.05); g.add(l); }
      return g;
    },
    // 레몬 상자: 나무 상자에 노란 레몬 더미
    crate() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.3), toon('#c9a06a'));
      b.position.set(0, 0, 0.2);
      g.add(b);
      for (let i = 0; i < 6; i++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon('#f2e27a'));
        l.scale.set(1, 0.8, 1.25);
        l.position.set(-0.13 + (i % 3) * 0.13, 0.1, 0.13 + Math.floor(i / 3) * 0.13);
        g.add(l);
      }
      return g;
    },
    // 훈련용 막대: 손잡이에 붕대 감은 나무 막대
    stick() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.8, 8), toon('#a97c50'));
      h.rotation.x = Math.PI / 2;
      h.position.z = 0.3;
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), toon('#fffaf0'));
      w.rotation.x = Math.PI / 2;
      w.position.z = 0.02;
      g.add(h, w);
      return g;
    },
    // 바코드 스캐너: 손잡이와 빨간 창
    scanner() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), toon('#3f3d3a'));
      h.position.set(0, 0, 0.08);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), toon('#3f3d3a'));
      head.position.set(0, 0.02, 0.18);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.01), new THREE.MeshBasicMaterial({ color: '#ff5a4a' }));
      glass.position.set(0, 0.02, 0.215);
      g.add(h, head, glass);
      return g;
    },
    // 노동 플레이트: 나무판에 글줄, 도장 찍힌 빨간 동그라미 (2026-11-10)
    plate() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.2), toon('#d9b98a'));
      b.position.set(0, 0, 0.13);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.16), toon('#ecd3a8'));
      e.position.set(0, 0.002, 0.13);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.045, 12), toon('#d6776a'));
      m.position.set(0.08, 0.003, 0.17);
      g.add(b, e, m);
      for (let i = 0; i < 2; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.012), toon('#7a5a40')); l.position.set(-0.04, 0.003, 0.1 + i * 0.04); g.add(l); }
      return g;
    },
    // 자격증 카드: 하늘색 카드에 사진 칸과 글줄
    card() {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.18), toon('#bfe3f2'));
      c.position.set(0, 0, 0.12);
      const ph = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.1), toon('#fffaf0'));
      ph.position.set(-0.08, 0.005, 0.12);
      g.add(c, ph);
      for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, 0.012), toon('#5b7f99')); l.position.set(0.05, 0.005, 0.08 + i * 0.03); g.add(l); }
      return g;
    },
    // 사진기: 몸통·렌즈·셔터 단추
    camera() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.14), toon('#3f3d3a'));
      b.position.set(0, 0, 0.1);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 14), toon('#9aa0a4'));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 0, 0.21);
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8), toon('#e86a5a'));
      btn.position.set(0.1, 0.11, 0.1);
      g.add(b, lens, btn);
      return g;
    },
    pouch() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toon('#c79a5b'));
      b.scale.set(1, 0.95, 1);
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.07, 10), toon('#8c6a46'));
      n.position.y = 0.15;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), toon('#f2c230'));
      c.rotation.x = Math.PI / 2;
      c.position.set(0, 0, 0.145);
      g.add(b, n, c);
      return g;
    },
    ledger() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.26), toon('#7d5a44'));
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.23), toon('#fffaf0'));
      p.position.y = 0.025;
      g.add(b, p);
      return g;
    },
    ladle() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), toon('#b4b0a6'));
      h.rotation.x = Math.PI / 2;
      h.position.z = 0.16;
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#b4b0a6'));
      c.rotation.x = Math.PI;
      c.position.z = 0.36;
      g.add(h, c);
      return g;
    },
    stamp() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8), toon('#a97c50'));
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 10), toon('#d6776a'));
      f.position.y = -0.07;
      g.add(h, f);
      return g;
    },
    pick() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 6), toon('#d9b98a'));
      h.rotation.x = Math.PI / 2;
      h.position.z = 0.15;
      g.add(h);
      return g;
    },
    bowl() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.12, 14), toon('#fffaf0'));
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.01, 14), toon('#e3b86a'));
      s.position.y = 0.06;
      g.add(b, s);
      return g;
    },
    cloth() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.18), toon('#fffdf6')));
      return g;
    },
  };

  /* ---------- 자세: 뼈 이름 → [x, y, z] ---------- */

  // 앞으로 드는 팔은 x가 음수. A는 +x 쪽 팔(모델의 왼쪽), B는 -x 쪽 팔
  const reach = (armX, foreX, side = 0.06) => ({ armA: [armX, 0, side], foreA: [foreX, 0, 0], armB: [armX, 0, -side], foreB: [foreX, 0, 0] });
  const POSE = {
    idle: t => ({ spine: [Math.sin(t * 1.4) * 0.015, 0, 0], head: [0.03, Math.sin(t * 0.5) * 0.25, 0], armA: [0.02, 0, 0.05 + Math.sin(t * 1.4) * 0.01], armB: [0.02, 0, -0.05 - Math.sin(t * 1.4) * 0.01] }),
    nod: t => ({ head: [0.12 + Math.max(0, Math.sin(t * 5)) * 0.32, 0, 0], spine: [0.05, 0, 0] }),
    bow: () => ({ pelvis: [0.05, 0, 0], spine: [0.5, 0, 0], chest: [0.28, 0, 0], head: [0.1, 0, 0], armA: [0.24, 0, 0.02], armB: [0.24, 0, -0.02] }),
    // 접수: 플레이트를 받아 도장을 꾹
    stamp: t => ({ ...reach(-0.55, -0.8), armB: [-0.75 + Math.max(0, Math.sin(t * 7)) * 0.42, 0, -0.1], foreB: [-0.6, 0, 0], head: [0.32, 0, 0], spine: [0.08, 0, 0] }),
    // 장부를 펴 들고 손가락으로 짚어 본다
    ledger: t => ({ armA: [-0.55, 0, -0.04], foreA: [-0.8, 0.5, 0], armB: [-0.5 + Math.sin(t * 2) * 0.08, Math.sin(t * 3) * 0.12, 0.02], foreB: [-0.95, -0.4, 0], head: [0.42, Math.sin(t * 2) * 0.1, 0], spine: [0.08, 0, 0] }),
    // 돈 주머니를 두 손으로 내민다
    pay: t => ({ ...reach(-1.18 + Math.sin(t * 3) * 0.03, -0.3, 0.02), head: [0.14, 0, 0], spine: [0.12, 0, 0] }),
    receive: () => ({ ...reach(-1.05, -0.45), head: [0.2, 0, 0], spine: [0.1, 0, 0] }),
    cook: t => ({ armA: [-0.5, 0, 0.05], foreA: [-0.85, 0, 0], armB: [-0.6 + Math.sin(t * 5) * 0.16, Math.cos(t * 5) * 0.2, -0.05], foreB: [-0.75, 0, 0], head: [0.42, 0, 0], spine: [0.1, Math.sin(t * 2.5) * 0.04, 0] }),
    serve: () => ({ ...reach(-1.2, -0.25), head: [0.1, 0, 0], spine: [0.14, 0, 0] }),
    flip: t => ({ armA: [-0.45, 0, 0.05], foreA: [-0.85, 0, 0], armB: [-0.6 + Math.max(0, Math.sin(t * 9)) * 0.2, Math.sin(t * 4) * 0.25, -0.05], foreB: [-0.7 + Math.sin(t * 9) * 0.2, 0, 0], head: [0.45, 0, 0], spine: [0.12, 0, 0] }),
    wipe: t => ({ armB: [-0.75 + Math.sin(t * 3) * 0.05, Math.sin(t * 3) * 0.45, -0.05], foreB: [-0.55, 0, 0], armA: [0.02, 0, 0.05], head: [0.35, Math.sin(t * 3) * 0.15, 0], spine: [0.12, 0, 0] }),
    welcome: t => ({ armA: [-0.3, 0, 0.7 + Math.sin(t * 3) * 0.08], foreA: [-0.5, 0, 0], armB: [-0.3, 0, -0.7 - Math.sin(t * 3) * 0.08], foreB: [-0.5, 0, 0], head: [0.05, 0, Math.sin(t * 3) * 0.06] }),
    wave: t => ({ armB: [-2.3, 0, -0.35 + Math.sin(t * 6) * 0.22], foreB: [-0.5, 0, 0], head: [0, 0, 0.05] }),
    // 뒷짐이 아니라 허리에 손: 현장 감독
    akimbo: t => ({ armA: [0.1, 0, 0.62], foreA: [-1.25, 0.9, 0], armB: [0.1, 0, -0.62], foreB: [-1.25, -0.9, 0], head: [0.02, Math.sin(t * 0.7) * 0.5, 0], chest: [-0.05, 0, 0] }),
    write: t => ({ armA: [-0.55, 0, -0.04], foreA: [-0.8, 0.5, 0], armB: [-0.55 + Math.sin(t * 8) * 0.03, Math.sin(t * 5) * 0.06, 0.02], foreB: [-0.85, -0.45, 0], head: [0.42, 0, 0], spine: [0.08, 0, 0] }),
  };
  POSE.give_sack = t => ({ ...reach(-1.1 + Math.sin(t * 2.5) * 0.04, -0.35, 0.03), head: [0.18, 0, 0], spine: [0.12, 0, 0] });
  POSE.give_card = t => ({ armB: [-1.2 + Math.sin(t * 3) * 0.03, 0, -0.05], foreB: [-0.3, 0, 0], armA: [0.02, 0, 0.05], head: [0.15, 0, 0], spine: [0.1, 0, 0] });
  POSE.photo = t => ({ ...reach(-1.0, -1.35, 0.12), head: [0.08, 0, 0], spine: [0.05, 0, 0] });
  // 혼자 있을 때의 동작들
  POSE.stretch = t => ({ armA: [-2.6, 0, 0.3 + Math.sin(t * 1.5) * 0.1], foreA: [-0.3, 0, 0], armB: [-2.6, 0, -0.3 - Math.sin(t * 1.5) * 0.1], foreB: [-0.3, 0, 0], spine: [-0.12, 0, Math.sin(t * 1.5) * 0.08], head: [-0.2, 0, 0] });
  POSE.lookaround = t => ({ head: [0.05, Math.sin(t * 0.9) * 0.7, 0], spine: [0, Math.sin(t * 0.9) * 0.15, 0], armA: [0.05, 0, 0.08], armB: [0.05, 0, -0.08] });
  POSE.sweep = t => ({ armA: [-0.7, Math.sin(t * 3) * 0.3, 0.1], foreA: [-0.6, 0, 0], armB: [-0.6, Math.sin(t * 3) * 0.3, -0.1], foreB: [-0.6, 0, 0], spine: [0.25, Math.sin(t * 3) * 0.12, 0], head: [0.3, 0, 0] });
  POSE.tap = t => ({ armA: [0.1, 0, 0.62], foreA: [-1.25, 0.9, 0], armB: [-0.4, 0, -0.1], foreB: [-1.3 + Math.max(0, Math.sin(t * 8)) * 0.3, 0, 0], head: [0.1, 0, 0] });
  POSE.nodoff = t => ({ head: [0.3 + Math.max(0, Math.sin(t * 0.8)) * 0.35, 0, 0], spine: [0.08, 0, 0], armA: [0.05, 0, 0.05], armB: [0.05, 0, -0.05] });
  // 접수처 일 동작 (2026-11-10 이재헌: 기지개가 아니라 직접 일하는 동작)
  // 플레이트를 받아 든다(A손) / 다시 내민다(A손) / 저울 눈금을 들여다본다 / 서랍에서 꺼낸다 / 보따리를 뒤 선반에 치운다 / 플레이트를 가지런히 정리
  POSE.take_plate = t => ({ armA: [-1.15 + Math.sin(t * 3) * 0.03, 0, 0.06], foreA: [-0.3, 0, 0], armB: [-0.5, 0, -0.08], foreB: [-0.7, 0, 0], head: [0.2, 0, 0], spine: [0.12, 0, 0] });
  POSE.give_plate = t => ({ armA: [-1.25 + Math.sin(t * 3) * 0.03, 0, 0.04], foreA: [-0.22, 0, 0], armB: [0.02, 0, -0.05], head: [0.14, 0, 0], spine: [0.14, 0, 0] });
  POSE.peer = t => ({ pelvis: [0.04, 0, 0], spine: [0.32, 0, 0], chest: [0.12, 0, 0], head: [0.38, Math.sin(t * 1.3) * 0.08, 0], armA: [0.05, 0, 0.08], armB: [-0.9 + Math.max(0, Math.sin(t * 2.2)) * 0.12, 0.15, -0.08], foreB: [-0.5, 0, 0] });
  POSE.drawer = t => ({ pelvis: [0.08, 0, 0], spine: [0.42, 0, 0], chest: [0.12, 0, 0], head: [0.35, 0, 0], armB: [-0.35 + Math.sin(Math.min(t, 1.2) * 2.6) * 0.18, 0, -0.12], foreB: [-0.9, 0, 0], armA: [0.05, 0, 0.1] });
  POSE.stow = t => ({ spine: [0.05, 1.0 + Math.sin(t * 1.5) * 0.12, 0], chest: [0, 0.35, 0], head: [0.05, 0.6, 0], armA: [-1.0, 0, 0.1], foreA: [-0.6, 0, 0], armB: [-1.0, 0, -0.1], foreB: [-0.6, 0, 0] });
  POSE.sort = t => ({ ...reach(-0.65, -0.75), armA: [-0.65, Math.sin(t * 1.6) * 0.3, 0.05], armB: [-0.6, Math.sin(t * 1.6 + 1) * 0.25, -0.05], foreB: [-0.75, 0, 0], head: [0.42, Math.sin(t * 1.6) * 0.15, 0], spine: [0.1, 0, 0] });
  // 장소별 일 동작 (2026-11-10 2차: 모든 갑옷씨)
  // 면 건지기: 국자를 냄비에서 들어 올려 탈탈 턴다
  POSE.scoop = t => { const k = (t % 1.6) / 1.6; const up = k < 0.5 ? k * 2 : 1; const shake = k > 0.5 ? Math.sin(t * 22) * 0.06 : 0; return { armA: [-0.45, 0, 0.06], foreA: [-0.85, 0, 0], armB: [-0.4 - up * 0.55 + shake, 0, -0.08], foreB: [-0.9 + up * 0.3, 0, 0], head: [0.38, 0, 0], spine: [0.14 - up * 0.06, 0, 0] }; };
  // 국물 붓기: 국자를 기울여 그릇에
  POSE.pour = t => ({ armA: [-0.6, 0, 0.1], foreA: [-0.6, 0, 0], armB: [-0.85, 0.25, -0.06], foreB: [-0.5, 0, 0], handB: [0, 0, -0.9 - Math.sin(t * 2) * 0.2], head: [0.45, 0.15, 0], spine: [0.16, 0.08, 0] });
  // 설거지: 그릇을 들고 행주로 빙글빙글
  POSE.wash = t => ({ armA: [-0.7, 0, 0.12], foreA: [-0.75, 0.3, 0], armB: [-0.7 + Math.sin(t * 6) * 0.05, Math.cos(t * 6) * 0.18, -0.08], foreB: [-0.8, 0, 0], head: [0.45, 0, 0], spine: [0.15, 0, 0] });
  // 사이펀 커피 내리기: 한 손은 주전자, 한 손은 저어 주기
  POSE.brew = t => ({ armA: [-0.75, 0, 0.12], foreA: [-0.7, 0, 0], handA: [0, 0, 0.4 + Math.sin(t * 1.5) * 0.15], armB: [-0.95 + Math.sin(t * 5) * 0.05, Math.cos(t * 5) * 0.12, -0.05], foreB: [-0.55, 0, 0], head: [0.3, 0, 0], spine: [0.08, 0, 0] });
  // 물건 개기·진열 정리: 두 손을 모았다 펴며 접는다
  POSE.fold = t => { const k = Math.sin(t * 2.4); return { armA: [-0.6, 0, 0.25 + k * 0.18], foreA: [-0.8, 0, 0], armB: [-0.6, 0, -0.25 - k * 0.18], foreB: [-0.8, 0, 0], head: [0.42, 0, 0], spine: [0.14, 0, 0] }; };
  // 손가락으로 저쪽을 가리키며 일러 준다
  POSE.point = t => ({ armB: [-1.45, 0.4 + Math.sin(t * 1.2) * 0.25, -0.15], foreB: [-0.1, 0, 0], armA: [0.1, 0, 0.62], foreA: [-1.25, 0.9, 0], head: [0, 0.35 + Math.sin(t * 1.2) * 0.2, 0] });
  // 시험 감독: 손목의 시계를 본다
  POSE.checkwatch = t => ({ armA: [-1.0, 0, -0.35], foreA: [-1.5, 0.5, 0], armB: [0.05, 0, -0.05], head: [0.45, -0.25, 0], spine: [0.05, 0, 0] });
  // 상자를 두 손으로 안아 옮긴다 (걸음처럼 들썩)
  POSE.carry_box = t => ({ ...reach(-0.95, -0.55, 0.16), pelvis: [0, 0, Math.sin(t * 6) * 0.03], spine: [-0.05, 0, 0], head: [0.05, 0, 0] });
  // 막대 휘두르기 시범: 들어 올렸다가 내려친다
  POSE.demo = t => { const k = (t % 1.8) / 1.8; const sw = k < 0.6 ? -2.2 * (k / 0.6) : -2.2 + 1.9 * Math.min(1, (k - 0.6) / 0.15); return { armA: [sw, 0, 0.12], foreA: [-0.35, 0, 0], armB: [sw, 0, -0.12], foreB: [-0.35, 0, 0], spine: [k < 0.6 ? -0.1 : 0.2, 0, 0], head: [0.05, 0, 0] }; };
  // 바코드 찍기: 물건을 왼손으로 넘기며 스캐너를 갖다 댄다
  POSE.scan = t => ({ armA: [-0.75, Math.sin(t * 3) * 0.35, 0.1], foreA: [-0.7, 0, 0], armB: [-0.8, -0.1, -0.06], foreB: [-0.6 + Math.max(0, Math.sin(t * 6)) * 0.15, 0, 0], head: [0.4, 0, 0], spine: [0.1, 0, 0] });
  // 박수로 응원
  POSE.cheer = t => { const k = Math.max(0, Math.sin(t * 9)); return { armA: [-1.0, 0, 0.35 - k * 0.3], foreA: [-0.8, 0, 0], armB: [-1.0, 0, -0.35 + k * 0.3], foreB: [-0.8, 0, 0], head: [-0.05, 0, 0] }; };
  // 손님이 없을 때도 그 장소의 일을 한다 (기지개·두리번·졸기는 뺐다)
  const IDLE_SET = {
    labor: ['sort', 'write', 'stamp', 'ledger', 'stow'],
    cook: ['cook', 'scoop', 'wash', 'wipe'],
    flip: ['flip', 'flip', 'wipe'],
    server: ['brew', 'wash', 'wipe', 'sweep'],
    seller: ['fold', 'wipe', 'welcome', 'sweep'],
    cashier: ['fold', 'wipe', 'welcome'],
    foreman: ['write', 'point', 'akimbo'],
    lemon: ['carry_box', 'write', 'point'],
    trainer: ['demo', 'point', 'akimbo'],
    proctor: ['write', 'sort', 'checkwatch'],
    clerk: ['write', 'ledger', 'sort'],
  };
  const LEVEL = { cup: 1.45, boat: 1.45, bag: 1.45, paper: 1.45, crate: 1.5, stick: 0.2, scanner: 1.2, plate: 1.45, sack: 1.5, card: 1.4, camera: 0.2, pouch: 1.48, ledger: 1.35, bowl: 1.45, stamp: 1.35, cloth: 1.3 };
  const HELD = { sweep: ['B', 'cloth'], give_sack: ['B', 'sack'], give_card: ['B', 'card'], photo: ['A', 'camera'], scoop: ['B', 'ladle'], pour: ['B', 'ladle'], wash: ['A', 'bowl'], brew: ['B', 'pick'], carry_box: ['B', 'crate'], demo: ['B', 'stick'], scan: ['B', 'scanner'], take_plate: ['A', 'plate'], give_plate: ['A', 'plate'], sort: ['A', 'plate'], stow: ['B', 'sack'], pay: ['B', 'pouch'], ledger: ['A', 'ledger'], stamp: ['B', 'stamp'], cook: ['B', 'ladle'], serve: ['B', 'bowl'], flip: ['B', 'pick'], wipe: ['B', 'cloth'], write: ['A', 'ledger'] };

  /* ---------- 누가 어디서 무엇을 ---------- */

  // at: 'staff'(그 장소의 직원 자리) | 'across:소켓'(손님 맞은편) | 'beside:소켓'(옆에 서서 지켜본다) | [lx, lz, ry]
  const CAST = [
    { place: 'reception', at: 'staff_side', color: '#b5a99a', role: 'labor' },
    { place: 'ramenRo', at: [0, -3.9, 0], color: '#dcc94a', role: 'cook', slide: true },
    { place: 'ramenYama', at: 'staff_side', color: '#dcc94a', role: 'cook' },
    { place: 'umaCurry', at: 'staff_side', color: '#c9825a', role: 'cook' },
    { place: 'umaiya', at: 'staff_side', color: '#e6c9a0', role: 'cook' },
    { place: 'soba', at: 'staff_side', color: '#8fa7b8', role: 'cook' },
    { place: 'kissa', at: 'staff_side', color: '#9a7b62', role: 'server' },
    { place: 'market', at: 'clothes.staff_side', color: '#c5c3bd', role: 'seller', stall: 'clothes' },
    { place: 'market', at: 'takoyaki.staff_side', color: '#c8675f', role: 'flip', stall: 'takoyaki' },
    { place: 'market', at: 'pottery.staff_side', color: '#d9b98a', role: 'seller', stall: 'pottery' },
    { place: 'pharmacy', at: 'across:counter_stand', color: '#a3bb8f', role: 'seller' },
    { place: 'arbiter', at: 'across:counter_stand', color: '#8f6248', role: 'clerk' },
    { place: 'exam', at: 'beside:results_look', color: '#7f8fb8', role: 'proctor' },
    { place: 'weeding', at: 'beside:sign_look', color: '#e8a58e', role: 'foreman' },
    { place: 'lemon', at: 'beside:crate_stand', color: '#f2e27a', role: 'lemon' },
    { place: 'hunt', at: 'beside:sign_look', color: '#94b583', role: 'trainer' },
    // 무차우 마켓 계산원 (2026-11-10 2차)
    { place: 'mucha', at: 'across:checkout_stand', color: '#9fc3d6', role: 'cashier' },
  ];
  // 앞의 손님이 하는 일 → 갑옷씨의 동작과 말
  function actionFor(k, c, sim) {
    const d = c && c.doing;
    const st = d && d.kind === 'obj' ? d.x.steps[d.step] : null;
    if (k.role === 'labor') return laborAction(c, d, st);
    if (!st || d.phase !== 'use') return { a: (IDLE_SET[k.role] || ['idle'])[0] };
    return workAction(k, c, d, st);
  }

  // 손님 단계의 진행도(u)에 맞춰: 주문 받기 → 만들기 → 내주기(그 순간 손님 손에 물건이 생긴다) → 치우기
  // hide: 갑옷씨 손에 있는 동안 손님 손의 같은 물건을 감춘다
  const EAT = /eat|drink/;
  function workAction(k, c, d, st) {
    const u = st.min ? Math.max(0, Math.min(1, 1 - d.left / st.min)) : 0.5;
    const prev = d.x.steps[d.step - 1];
    const firstEat = EAT.test(st.act) && !(prev && EAT.test(prev.act));
    const lastStep = d.step === d.x.steps.length - 1;
    const by = (list, tt) => list[Math.floor(tt) % list.length];
    switch (k.role) {
      case 'cook':
      case 'server':
      case 'flip': {
        const dish = k.role === 'server' ? 'cup' : k.role === 'flip' ? 'boat' : 'bowl';
        if (st.act === 'ticket' || st.act === 'talk' || st.act === 'pay') {
          if (u < 0.5) return k.role === 'server' ? { a: 'write', say: '네, 주문 받았어요' } : { a: 'receive', say: st.act === 'ticket' ? '식권 받았어요' : '네!', hide: st.act === 'ticket' };
          return k.role === 'server' ? { a: 'brew' } : k.role === 'flip' ? { a: 'flip' } : { a: 'cook' };
        }
        if (st.act === 'wait' || st.act === 'idle' || st.act === 'read') {
          if (k.role === 'server') return u < 0.7 ? { a: 'brew' } : { a: 'pour' };
          if (k.role === 'flip') return { a: 'flip' };
          return u < 0.4 ? { a: 'cook' } : u < 0.7 ? { a: 'scoop' } : { a: 'pour' };
        }
        if (firstEat && u < 0.12) return { a: 'serve', say: k.role === 'flip' ? '뜨거워요' : '나왔습니다', hide: true, props: [['B', dish]] };
        if (firstEat && u < 0.2) return { a: 'bow' };
        // 다 먹을 무렵 빈 그릇을 받아 간다
        if (EAT.test(st.act) && lastStep && u > 0.9) return { a: 'receive', say: '잘 먹었어요?', hide: true, props: [['A', dish]] };
        if (st.act === 'bow') return { a: 'bow', say: '감사합니다' };
        if (k.role === 'flip') return { a: 'flip' };
        return { a: by(k.role === 'server' ? ['wash', 'wipe', 'brew'] : ['wash', 'cook', 'wipe'], u * 3) };
      }
      case 'seller': {
        if (st.act === 'browse' || st.act === 'gaze') return { a: u < 0.3 ? 'welcome' : 'fold', say: u < 0.3 ? '천천히 보세요' : undefined };
        if (st.act === 'take' || st.act === 'read') return { a: 'point', say: '그거 인기예요' };
        if (st.act === 'pose') return { a: 'cheer', say: '잘 어울려요!' };
        if (st.act === 'talk') return u < 0.4 ? { a: 'nod', say: '어디가 불편해요?' } : u < 0.75 ? { a: 'drawer' } : { a: 'serve', say: '여기 있어요', props: [['B', 'bag']] };
        if (st.act === 'pay') return u < 0.4 ? { a: 'receive', say: '감사합니다' } : u < 0.8 ? { a: 'fold' } : { a: 'serve', say: '포장했어요', props: [['B', 'bag']] };
        return { a: 'welcome' };
      }
      case 'cashier':
        if (st.act === 'browse') return { a: 'welcome', say: u < 0.2 ? '어서 오세요' : undefined };
        if (st.act === 'pay' || st.act === 'talk') return u < 0.6 ? { a: 'scan', say: '삑!' } : { a: 'fold' };
        if (st.act === 'wait') return u < 0.7 ? { a: 'fold' } : { a: 'serve', say: '감사합니다', props: [['B', 'bag']] };
        return { a: 'wipe' };
      case 'clerk':
        if (st.act === 'talk') return u < 0.6 ? { a: 'nod', say: '네, 말씀하세요' } : { a: 'ledger' };
        if (st.act === 'hand') return u < 0.4 ? { a: 'take_plate' } : u < 0.75 ? { a: 'stamp', props: [['A', 'plate'], ['B', 'stamp']] } : { a: 'give_plate' };
        if (st.act === 'pay') return { a: 'pay', say: '수고했어요' };
        if (/study|exam/.test(st.act)) return { a: u < 0.1 ? 'give_card' : 'checkwatch', props: u < 0.1 ? [['B', 'paper']] : undefined };
        return { a: 'write' };
      case 'proctor':
        // 자격증: 사진을 찍어 주고 카드를 내민다
        if (d.x.cardGet) return st.act === 'pose' ? { a: 'photo', say: '찰칵!' } : st.act === 'hand' ? { a: 'give_card', say: '축하해요' } : { a: 'write' };
        if (st.act === 'study') {
          // 시험지를 나눠 주고, 시계를 보며 감독하다가, 끝나면 걷는다
          if (u < 0.1) return { a: 'give_card', say: '시작!', props: [['B', 'paper']] };
          if (u > 0.92) return { a: 'receive', say: '그만!', props: [['A', 'paper']] };
          return { a: by(['checkwatch', 'akimbo', 'write'], u * 6) };
        }
        if (st.act === 'read') return { a: 'point', say: '결과는 게시판에' };
        return { a: 'write' };
      case 'lemon':
        if (st.act === 'work') return u < 0.15 ? { a: 'carry_box', say: '레몬 왔어요' } : u > 0.9 ? { a: 'receive', say: '수고했어요', props: [['A', 'crate']] } : { a: by(['write', 'point', 'carry_box'], u * 4) };
        return { a: 'point' };
      case 'trainer':
        if (st.act === 'confront') return { a: by(['demo', 'cheer', 'point'], u * 5), say: u * 5 % 3 < 1 ? '이렇게!' : u * 5 % 3 < 2 ? '좋아요!' : undefined };
        return { a: 'point', say: '저쪽부터' };
      case 'foreman':
        if (st.act === 'weed' || st.act === 'work' || st.act === 'gather') return { a: by(['point', 'write', 'akimbo'], u * 4) };
        if (st.act === 'carry') return u < 0.5 ? { a: 'receive', say: '어디 보자', props: [['A', 'sack']] } : { a: 'write', say: '잘했어요' };
        if (st.act === 'play') return { a: 'cheer', say: '와아!' };
        return { a: 'wave' };
      default:
        return { a: 'idle' };
    }
  }

  // 접수처: 손님 단계의 진행도(u)에 맞춰 받기 → 처리 → 건네기. hide: 그동안 손님 손의 물건을 감춘다(갑옷씨 손에 있으니까)
  // (2026-11-10 이재헌 예: 플레이트를 건네면 받아 도장, 정산은 저울 확인 → 돈 건네기 → 캐릭터가 받기)
  function laborAction(c, d, st) {
    if (!st || d.phase !== 'use') return { a: 'write' };
    const u = st.min ? Math.max(0, Math.min(1, 1 - d.left / st.min)) : 0.5;
    if (d.x.settle) {
      if (st.act === 'wait') return { a: 'write' };
      if (st.act === 'weigh') {
        if (u < 0.3) return { a: 'nod', say: '저울에 올려 주세요' };
        if (u < 0.75) return { a: 'peer', say: '보수 확인 중…' };
        return { a: 'write' };
      }
      const pay = c.plate && c.plate.pay ? `${c.plate.pay.toLocaleString()}원!` : '수고했어요';
      if (st.clip === 'pay_wait') return u < 0.5 ? { a: 'drawer', say: '잠깐만요' } : { a: 'pay', say: pay };
      // 갑옷씨 손의 돈주머니가 손님 손으로 옮겨 간다
      if (st.clip === 'pay_receive') return u < 0.4 ? { a: 'pay', say: pay, hide: true } : { a: 'bow', say: '수고했어요' };
      return { a: 'stow' };
    }
    if (st.act === 'take') return { a: 'nod' };
    if (st.act !== 'hand') return { a: 'write' };
    const grass = d.x.accept && c.plate && c.plate.kind === 'grass';
    if (u < 0.25) return { a: 'receive' };
    if (u < 0.42) return { a: 'take_plate', hide: true };
    if (u < 0.72) return { a: 'stamp', say: '접수!', hide: true, props: [['A', 'plate'], ['B', 'stamp']] };
    if (u < (grass ? 0.84 : 0.95)) return { a: 'give_plate', say: '다녀오세요', hide: u < (grass ? 0.8 : 0.9) };
    // 풀뽑기면 빈 제초 주머니를 이어서 건넨다
    if (grass) return { a: 'give_sack', say: '제초 주머니예요' };
    return { a: 'nod' };
  }

  /* ---------- 말풍선 ---------- */

  function bubble() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 72;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(1.5, 0.42, 1);
    s.position.y = 2.32;
    s.renderOrder = 20;
    s.visible = false;
    s.userData.set = text => {
      if (s.userData.text === text) return;
      s.userData.text = text;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 256, 72);
      g.fillStyle = '#fffaf0';
      g.strokeStyle = '#5a4436';
      g.lineWidth = 5;
      g.beginPath();
      g.roundRect(6, 6, 244, 60, 26);
      g.fill();
      g.stroke();
      g.fillStyle = '#5a4436';
      g.font = '700 30px "Malgun Gothic", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 128, 38);
      tex.needsUpdate = true;
    };
    return s;
  }

  /* ---------- 배치와 매 프레임 ---------- */

  const list = [];
  let model = null;
  let scene_ = null;
  let world_ = null;
  // 역할별로 일터 안에서 움직일 수 있는 거리 (카운터 안 직원은 짧게, 홀·현장은 넓게)
  const LEASH = { labor: 2.2, cook: 2.6, flip: 1.6, server: 9, seller: 2.2, cashier: 1.6, clerk: 2.2, proctor: 7, foreman: 8, lemon: 7, trainer: 6 };
  // 손님에게 물건을 건네거나 받는 동작: 손이 닿는 데까지 다가간다
  const HANDOFF2 = /^(serve|receive|pay|give_sack|give_card|take_plate|give_plate|photo)$/;
  function goalFor(k, c, a, time) {
    const home = [k.baseX, k.baseZ, k.ry];
    const lim = LEASH[k.role] || 2;
    const clampHome = (x, z) => {
      const dx = x - k.baseX;
      const dz = z - k.baseZ;
      const d = Math.hypot(dx, dz);
      return d > lim ? [k.baseX + dx / d * lim, k.baseZ + dz / d * lim] : [x, z];
    };
    if (c && c.doing && c.doing.phase === 'use') {
      const near = HANDOFF2.test(a) || (k.role === 'server' && a === 'write') || /foreman|lemon|trainer|proctor/.test(k.role);
      if (near) {
        // 손님 바로 앞(팔 길이만큼 떨어져)
        const dx = k.x - c.x;
        const dz = k.z - c.z;
        const d = Math.hypot(dx, dz) || 1;
        const gap = /foreman|lemon|trainer|proctor/.test(k.role) && !HANDOFF2.test(a) ? 2.2 : 1.25;
        return [...clampHome(c.x + dx / d * gap, c.z + dz / d * gap)];
      }
      // 만드는 동안은 일터 안에서 조리대·사이펀 쪽으로 (손님 쪽과 반대편 옆)
      const side = Math.sin(time * 0.35 + k.seed) > 0 ? 1 : -1;
      const ox = Math.cos(k.ry) * side * Math.min(lim, 1.2);
      const oz = -Math.sin(k.ry) * side * Math.min(lim, 1.2);
      return [k.baseX + ox, k.baseZ + oz];
    }
    // 한가할 때: 일터 안의 몇 군데를 돌아가며 들른다 (현장 감독·감독관은 넓게 순찰)
    const wide = /foreman|lemon|trainer|proctor|server/.test(k.role);
    const slot = Math.floor((time + k.seed * 5) / (wide ? 9 : 7));
    const ang = slot * 2.39 + k.seed;
    const r = (wide ? 0.55 : 0.45) * lim * (slot % 3 === 0 ? 0 : 1);
    const [x, z] = clampHome(k.baseX + Math.cos(ang) * r, k.baseZ + Math.sin(ang) * r);
    return [x, z, k.ry + (slot % 3 === 0 ? 0 : Math.sin(ang) * 0.8)];
  }
  // 막힌 칸은 피해 간다 (가로·세로로 비켜 보고, 그래도 막히면 멈춘다)
  function walkTo(k, sim, goal, dt) {
    const dx = goal[0] - k.x;
    const dz = goal[1] - k.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08) return false;
    const sp = Math.min(d, 2.3 * dt);
    const nx = k.x + dx / d * sp;
    const nz = k.z + dz / d * sp;
    const nav = sim.nav;
    const ok = (x, z) => {
      if (!nav) return true;
      // 출발점 근처(원래 자리)는 카운터 안이라 막힌 칸일 수 있다: 원래 자리 가까이는 그대로 다닌다
      if (Math.hypot(x - k.baseX, z - k.baseZ) < 0.6) return true;
      return nav.free(nav.cellOf(x, z));
    };
    if (ok(nx, nz)) { k.x = nx; k.z = nz; return true; }
    if (Math.abs(dx) > 0.05 && ok(nx, k.z)) { k.x = nx; return true; }
    if (Math.abs(dz) > 0.05 && ok(k.x, nz)) { k.z = nz; return true; }
    return false;
  }
  const baseRgb = new THREE.Color(BASE_COLOR);
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();

  function inkMaterial() {
    const m = new THREE.MeshBasicMaterial({ color: '#3d2c24', side: THREE.BackSide });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * 0.012;');
    };
    return m;
  }
  let inkMat = null;
  const capGeo = new THREE.SphereGeometry(0.105, 18, 12);
  const elbowGeo = new THREE.SphereGeometry(0.062, 14, 10);
  function build(k) {
    const g = new THREE.Group();
    g.visible = false;
    const bones = makeBones();
    const skeleton = new THREE.Skeleton(NAMES.map(n => bones[n]));
    const mat = new THREE.MeshLambertMaterial({ map: model.tex });
    const t = new THREE.Color(k.color);
    mat.color.setRGB(t.r / baseRgb.r, t.g / baseRgb.g, t.b / baseRgb.b);
    const mesh = new THREE.SkinnedMesh(model.geo, mat);
    const ink = new THREE.SkinnedMesh(model.geo, inkMat);
    mesh.add(bones.pelvis);
    mesh.bind(skeleton);
    ink.bind(skeleton, mesh.bindMatrix);
    mesh.frustumCulled = false;
    ink.frustumCulled = false;
    g.add(mesh, ink);
    // 어깨 갑옷: 팔과 몸통 사이 이음새를 덮는 둥근 견갑 (팔 뼈를 따라 돈다)
    const plate = new THREE.MeshLambertMaterial({ color: new THREE.Color(k.color).multiplyScalar(0.96) });
    for (const S of ['A', 'B']) {
      const cap = new THREE.Mesh(capGeo, plate);
      cap.scale.set(1, 0.92, 1.05);
      cap.position.set(0, -0.015, -0.005);
      cap.add(new THREE.Mesh(capGeo, inkMat));
      bones[`arm${S}`].add(cap);
      const elbow = new THREE.Mesh(elbowGeo, plate);
      elbow.add(new THREE.Mesh(elbowGeo, inkMat));
      bones[`fore${S}`].add(elbow);
    }
    g.scale.setScalar(SCALE);
    g.position.set(k.x, k.y, k.z);
    g.rotation.y = k.ry;
    const say = bubble();
    g.add(say);
    scene_.add(g);
    Object.assign(k, { g, bones, say, held: {}, action: 'idle', since: 0, cur: {}, yaw: 0, face: k.ry, stride: 0, walkW: 0, seed: (Math.abs(k.baseX * 7.3 + k.baseZ * 3.1) % 7), baseY: k.y, floor0: world_.floorAt(k.baseX, k.baseZ) });
    for (const n of NAMES) k.cur[n] = [0, 0, 0];
  }
  function propFor(k, side, id) {
    const key = `${side}:${id}`;
    if (!k.held[key]) {
      const p = PROPS[id]();
      // 손목에서 손끝 쪽으로
      p.position.set(0, -0.14, 0.05);
      p.rotation.x = LEVEL[id] || 0;
      k.bones[`hand${side}`].add(p);
      k.held[key] = p;
    }
    return k.held[key];
  }
  function place(sim, world, c) {
    const p = sim.places[c.place];
    if (!p) return null;
    const th = ((p.face || 0) * Math.PI) / 2;
    const toWorld = (lx, lz) => [p.x + lx * Math.cos(th) + lz * Math.sin(th), p.z - lx * Math.sin(th) + lz * Math.cos(th)];
    const socks = sim.sockets[c.place] || {};
    let x;
    let z;
    let ry;
    let h = 0;
    if (Array.isArray(c.at)) {
      [x, z] = toWorld(c.at[0], c.at[1]);
      ry = c.at[2] + th;
      h = sim.nav.surface(x, z);
    } else if (c.at.startsWith('across:') || c.at.startsWith('beside:')) {
      const s = socks[c.at.slice(7)];
      if (!s || s.fx === undefined) return null;
      const a = Math.atan2(s.fx - s.x, s.fz - s.z);
      if (c.at.startsWith('across:')) {
        x = s.x + Math.sin(a) * 2.3;
        z = s.z + Math.cos(a) * 2.3;
        ry = a + Math.PI;
        h = Math.min(0.3, sim.nav.surface(x, z));
      } else {
        // 옆으로 비켜 서서 그쪽을 본다. 빈칸을 찾는다
        for (const r of [2, 2.6, -2, -2.6, 3.2, -3.2]) {
          const px = s.x + Math.cos(a) * r;
          const pz = s.z - Math.sin(a) * r;
          if (sim.nav.free(sim.nav.cellOf(px, pz))) {
            x = px;
            z = pz;
            break;
          }
        }
        if (x === undefined) return null;
        ry = Math.atan2(s.fx - x, s.fz - z);
        h = sim.nav.surface(x, z);
      }
    } else {
      const s = socks[c.at];
      if (!s) return null;
      x = s.x;
      z = s.z;
      h = s.hData !== undefined ? s.hData : s.h;
      ry = s.fx !== undefined ? Math.atan2(s.fx - s.x, s.fz - s.z) : th;
    }
    return { ...c, x, z, ry, y: world.floorAt(x, z) + (h || 0), baseX: x, baseZ: z, th };
  }
  function customerFor(k, sim) {
    let best = null;
    let bestD = 7;
    for (const c of sim.chars) {
      const d = c.doing;
      if (!d || d.kind !== 'obj' || d.x.place !== k.place || c.hidden) continue;
      if (k.stall) {
        const st = d.x.steps[d.step];
        if (!st || !st.socket.startsWith(k.stall)) continue;
      }
      const gap = Math.hypot(c.x - k.x, c.z - k.z);
      if (gap < bestD && d.phase === 'use') {
        bestD = gap;
        best = c;
      }
    }
    return best;
  }

  root.YoroiKnights = {
    list,
    async init(scene, world, sim) {
      scene_ = scene;
      world_ = world;
      try {
        model = await loadModel('assets/glb/knight.glb');
      } catch (e) {
        console.warn('[knight] 모델을 읽지 못했습니다', e);
        return;
      }
      skin(model.geo);
      inkMat = inkMaterial();
      for (const c of CAST) {
        const k = place(sim, world, c);
        if (k) list.push(k);
      }
      root.YoroiKnights.sim = sim;
    },
    update(sim, camera, time, dt) {
      if (!model) return;
      for (const k of list) {
        const near = Math.hypot(camera.position.x - k.x, camera.position.z - k.z) < FAR;
        const open = !Interiors.has(k.place) || Interiors.isOpen(k.place);
        if (!near || !open) {
          if (k.g) k.g.visible = false;
          continue;
        }
        if (!k.g) build(k);
        k.g.visible = true;
        const c = customerFor(k, sim);
        const r = k.force || actionFor(k, c, sim);
        let { a, say } = r;
        if (r.hide && c) c.propHideAt = performance.now();
        // 손님이 없을 때는 역할에 맞는 여러 동작을 몇 초마다 바꿔 가며 한다 (2026-11-10 2차: 늘 같은 자세만 하지 않게)
        const busyCust = c && c.doing && c.doing.phase === 'use';
        if (!k.force && !busyCust && IDLE_SET[k.role]) {
          const list = IDLE_SET[k.role];
          a = list[Math.floor((time + k.seed * 3) / 7) % list.length];
        }
        if (a !== k.action) {
          k.action = a;
          k.since = time;
        }
        // 라멘집 주인은 앉은 손님 앞으로 옆걸음
        // 걸어 다니며 일한다 (2026-11-10 이재헌: 가만히 서서 염동력 쓰지 말고)
        // 물건을 건네고 받을 때는 손님 앞까지 가고, 한가하면 자기 일터 안을 오가며 일한다
        const goal = goalFor(k, c, a, time);
        const moving = walkTo(k, sim, goal, dt);
        // 걸을 때는 가는 쪽을, 서 있을 때는 손님(없으면 원래 방향)을 본다
        let face = k.ry;
        if (moving) face = Math.atan2(goal[0] - k.x, goal[1] - k.z);
        else if (c) face = Math.atan2(c.x - k.x, c.z - k.z);
        else if (goal[2] !== undefined) face = goal[2];
        const turn = Math.atan2(Math.sin(face - k.face), Math.cos(face - k.face));
        k.face += turn * Math.min(1, dt * 6);
        k.g.rotation.y = k.face;
        k.g.position.set(k.x, k.baseY + world_.floorAt(k.x, k.z) - k.floor0, k.z);
        // 자세로 부드럽게 옮겨 간다 (걸을 때는 다리를 번갈아 내딛는다. 팔은 하던 일 그대로: 물건을 든 채 걷는다)
        const target = { ...POSE[a](time - k.since + k.seed) };
        k.stride = moving ? k.stride + dt * 9 : k.stride;
        k.walkW += ((moving ? 1 : 0) - k.walkW) * Math.min(1, dt * 8);
        if (k.walkW > 0.02) {
          const ph = k.stride;
          const w = k.walkW;
          target.hipA = [Math.sin(ph) * 0.5 * w, 0, 0];
          target.hipB = [-Math.sin(ph) * 0.5 * w, 0, 0];
          target.kneeA = [Math.max(0, -Math.cos(ph)) * 0.7 * w, 0, 0];
          target.kneeB = [Math.max(0, Math.cos(ph)) * 0.7 * w, 0, 0];
          target.pelvis = [(target.pelvis ? target.pelvis[0] : 0), 0, Math.sin(ph) * 0.04 * w];
          if (!HELD[a] && !(r.props && r.a === a) && /idle|nod|bow|welcome|akimbo|point|cheer/.test(a)) {
            target.armA = [-Math.sin(ph) * 0.35 * w, 0, 0.06];
            target.armB = [Math.sin(ph) * 0.35 * w, 0, -0.06];
          }
        }
        const u = Math.min(1, dt * 7);
        for (const n of NAMES) {
          const to = target[n] || [0, 0, 0];
          const cur = k.cur[n];
          for (let i = 0; i < 3; i++) cur[i] += (to[i] - cur[i]) * u;
          tmpQ.setFromEuler(tmpE.set(cur[0], cur[1], cur[2], 'XYZ'));
          k.bones[n].quaternion.copy(tmpQ);
        }
        // 지금 동작에 쓰는 물건만 보인다
        const held = r.props && r.a === a ? r.props : HELD[a] ? [HELD[a]] : [];
        for (const p of Object.values(k.held)) p.visible = false;
        for (const h of held) propFor(k, h[0], h[1]).visible = true;
        k.say.visible = !!say;
        if (say) k.say.userData.set(say);
      }
    },
  };
}(typeof self !== 'undefined' ? self : this));
