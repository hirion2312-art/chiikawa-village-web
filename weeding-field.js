'use strict';

// 치이카와 심즈 — 풀뽑기 현장 (2026-11-09 이재헌 지시)
// - 기존 제초장 모델·장식을 걷어 내고, 아무것도 없는 넓은 초원으로 만든다
// - 등급별 구역: 무자격 · 5급 · 3급 · 2급 · 1급. 등급이 높을수록 넓은 구역 (원작: 자격 등급에 따라 작업 구역이 넓어진다)
// - 플레이트를 접수하면 갑옷씨가 제초 주머니를 건넨다(labor.js) → 주민은 주머니를 들고 자기 등급 구역으로 간다
// - 옆에 주머니를 내려놓고 쪼그려 앉아 뽑는다. 담을수록 주머니가 차오르고 주변 풀이 실제로 사라진다 → 다 차면 묶어 들고 정산하러 간다
// - 풀은 다음 날 다시 자란다
(function (root) {
  // 2026-11-10 2차: 2급·1급 구역이 흙길에 걸쳐 있어 길에서 비킨 자리로 옮김
  // 등급별 원형 구역: 넓은 초원 곳곳에 흩어 둔다 (2026-11-09 이재헌 지시). 입구 앞이 무자격, 멀수록 높은 등급·큰 원.
  // 자리(장소 기준 좌표)는 게임 지형에서 반경 12 원이 통째로 걸을 수 있고 다른 장소와 겹치지 않는 곳을 골랐다
  const ZONES = [
    { grade: 0, label: '무자격', cx: 0, cz: 32, r: 6, color: '#c6e4ab' },
    { grade: 5, label: '5급', cx: -48, cz: 48, r: 7.5, color: '#b9de9c' },
    { grade: 3, label: '3급', cx: 24, cz: 64, r: 9, color: '#acd78e' },
    { grade: 2, label: '2급', cx: -72, cz: -64, r: 10.5, color: '#9fcf80' },
    { grade: 1, label: '1급', cx: 72, cz: 80, r: 12, color: '#93c673' },
  ];
  // 일하는 자리: 원 안 4칸 격자. 주머니는 자리 옆에 내려놓는다
  const sockets = {};
  for (const z of ZONES) {
    let n = 0;
    for (let x = -z.r; x <= z.r; x += 4) {
      for (let zz = -z.r; zz <= z.r; zz += 4) {
        if (Math.hypot(x, zz) > z.r - 1.6) continue;
        sockets[`z${z.grade}_pull_${++n}`] = [z.cx + x, z.cz + zz, 0, z.cx + x, z.cz + zz - 2];
      }
    }
    z.n = n;
  }
  // 입구: 안내판·도구·쉼터 (갑옷씨 반장은 안내판 옆에 선다)
  Object.assign(sockets, {
    sign_look: [0, 18, 0, 0, 22],
    fork_stand: [4.5, 18, 0, 4.5, 20],
    rest_sit: [-5, 19, 0, -5, 22],
  });

  // 기존 모델·장식을 걷어 낸다 (빌더 메시는 GLB_PLACES에 남겨 계속 숨긴다)
  if (root.GLB_MAP) delete root.GLB_MAP.weeding;
  if (root.ASSET_SOCKETS) root.ASSET_SOCKETS.weeding = sockets;

  // 풀뽑기 상호작용: 등급 구역마다 하나. labor.js가 자기 등급 구역만 열어 준다 (zoneGrade)
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop, label });
  const VO = root.VillageObjects;
  const old = VO.LIST.findIndex(x => x.id === 'weeding.weed');
  const base = old >= 0 ? VO.LIST[old] : { gain: { energy: -20, fun: -4, hygiene: -15 }, worth: 1200, hours: [6, 17] };
  if (old >= 0) VO.LIST.splice(old, 1);
  if (VO.BY_ID) delete VO.BY_ID['weeding.weed'];
  for (const z of ZONES) {
    const P = `z${z.grade}_pull_*`;
    const x = {
      id: `weeding.weed_g${z.grade}`, place: 'weeding', name: `풀뽑기 (${z.label} 구역)`, zoneGrade: z.grade,
      gain: base.gain, plate: 'grass', worth: base.worth, hours: base.hours,
      steps: [
        S(P, 'look', 1.5, 'inspect_item', null, '맡은 구역 살피는 중'),
        S(P, 'idle', 1.5, 'scale_place', null, '주머니를 옆에 내려놓는 중'),
        S(P, 'pull', 12, 'weed_bag', null, '한 포기씩 뽑아 주머니에 넣는 중'),
        S(P, 'gather', 3, 'weed_bag', null, '주머니에 담는 중'),
        S(P, 'pull', 12, 'weed_bag', null, '뿌리까지 뽑아 넣는 중'),
        S(P, 'gather', 3, 'weed_bag', null, '주머니를 채우는 중'),
        S(P, 'pull', 10, 'weed_bag', null, '마저 뽑아 넣는 중'),
        S(P, 'gather', 3, 'weed_bag', null, '주머니를 꽉 채우는 중'),
        S(P, 'idle', 2, 'carry_pile', null, '주머니를 묶어 드는 중'),
      ],
    };
    VO.LIST.push(x);
    if (VO.BY_ID) VO.BY_ID[x.id] = x;
  }
  // 주머니가 얼마나 찼는가: 끝낸 '담기' 단계 수 / 3 (담는 단계 동안은 그 단계 진행만큼)
  function fillOf(c) {
    const d = c.doing;
    if (!d || !d.x || d.x.zoneGrade === undefined) return c.bag ? c.bag.fill || 0 : 0;
    let f = 0;
    d.x.steps.forEach((st, i) => {
      if (st.act !== 'gather') return;
      if (i < d.step) f += 1;
      else if (i === d.step && d.phase === 'use') f += Math.max(0, Math.min(1, 1 - d.left / st.min));
    });
    return Math.min(1, f / 3);
  }

  /* ---------- 작은 에셋 도구 (모델링 제작 원칙: 사소한 에셋도 원뿔·구 하나로 때우지 않는다) ---------- */

  const COL = h => new THREE.Color(h);
  const mat = c => new THREE.MeshToonMaterial({ color: c });
  let kitMat = null;
  const KM = () => kitMat || (kitMat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 삼각형·기본 도형을 정점색과 함께 모아 하나의 기하로 만든다
  class Kit {
    constructor() { this.p = []; this.c = []; }
    tri(a, b, c, ca, cb, cc) {
      this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
    }
    add(geo, color, m) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (m) g.applyMatrix4(m);
      const fixed = typeof color === 'function' ? null : COL(color);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        this.p.push(x, y, z);
        const cc = fixed || color(x, y, z);
        this.c.push(cc.r, cc.g, cc.b);
      }
    }
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeVertexNormals();
      return g;
    }
  }
  const M4 = (x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

  // 잎 한 장: 밑동에서 yaw 쪽으로 휘며 올라가 끝이 뾰족해지는 잎. 가운데 잎맥이 접혀 있어 빛을 받으면 결이 보인다
  // teeth: 민들레 잎처럼 톱니. 끝점·끝 방향을 돌려준다 (꽃·이삭을 붙일 때)
  function blade(k, o) {
    const { x = 0, y = 0, z = 0, h, w, lean = 0.2, bend = 0.6, yaw = 0, base, tip, segs = 4, fold = 0.35, teeth = 0 } = o;
    const d = [Math.sin(yaw), Math.cos(yaw)];
    const side = [Math.cos(yaw), -Math.sin(yaw)];
    const cb = COL(base), ct = COL(tip);
    const L = h / segs;
    let f = 0, up = 0, th = lean;
    const rows = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      let wd = w * Math.pow(1 - t, 0.75) * (t < 0.15 ? 0.55 + t * 3 : 1);
      if (teeth) wd *= 1 + teeth * Math.max(0, Math.sin(t * Math.PI * 9));
      const P = [x + d[0] * f, y + up, z + d[1] * f];
      const N = [-Math.cos(th) * d[0], Math.sin(th), -Math.cos(th) * d[1]];
      const cl = cb.clone().lerp(ct, t);
      const cm = cl.clone().offsetHSL(0, -0.05, 0.06);
      rows.push({
        Lp: [P[0] - side[0] * wd / 2, P[1], P[2] - side[1] * wd / 2],
        Rp: [P[0] + side[0] * wd / 2, P[1], P[2] + side[1] * wd / 2],
        Mp: [P[0] + N[0] * wd * fold, P[1] + N[1] * wd * fold, P[2] + N[2] * wd * fold],
        cl, cm, P, th,
      });
      if (i < segs) {
        f += Math.sin(th) * L;
        up += Math.cos(th) * L;
        th += bend / segs;
      }
    }
    for (let i = 0; i < segs; i++) {
      const a = rows[i], b = rows[i + 1];
      k.tri(a.Lp, a.Mp, b.Mp, a.cl, a.cm, b.cm);
      k.tri(a.Lp, b.Mp, b.Lp, a.cl, b.cm, b.cl);
      k.tri(a.Mp, a.Rp, b.Rp, a.cm, a.cl, b.cl);
      k.tri(a.Mp, b.Rp, b.Mp, a.cm, b.cl, b.cm);
    }
    const end = rows[segs];
    return { tip: end.P, dir: new THREE.Vector3(Math.sin(end.th) * d[0], Math.cos(end.th), Math.sin(end.th) * d[1]).normalize() };
  }
  // 끝 방향으로 세운 머리 (꽃·이삭)
  const headM = (at, dir, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(at[0], at[1], at[2]), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(sx, sy, sz));

  // 민들레 꽃: 꽃받침 + 두 겹 꽃잎 + 가운데 꽃술
  function dandelionHead(k, at, dir) {
    const m = headM(at, dir, 1, 1, 1);
    const P = v => new THREE.Vector3(v[0], v[1], v[2]).applyMatrix4(m).toArray();
    const sep = COL('#4f8c3a'), pin = COL('#f2b81c'), pout = COL('#ffe45a'), ptip = COL('#fff3a0');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.tri(P([0, 0, 0]), P([Math.cos(a - 0.2) * 0.03, 0.01, Math.sin(a - 0.2) * 0.03]), P([Math.cos(a) * 0.06, -0.035, Math.sin(a) * 0.06]), sep, sep, sep);
    }
    for (const [n, r, lift, off] of [[14, 0.085, 0.012, 0], [11, 0.06, 0.03, 0.15]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + off;
        const c = Math.cos(a), s = Math.sin(a), w = 0.011;
        const b0 = [c * 0.02 - s * w, lift, s * 0.02 + c * w], b1 = [c * 0.02 + s * w, lift, s * 0.02 - c * w];
        const t0 = [c * r - s * w * 0.8, lift + r * 0.25, s * r + c * w * 0.8], t1 = [c * r + s * w * 0.8, lift + r * 0.25, s * r - c * w * 0.8];
        k.tri(P(b0), P(b1), P(t1), pin, pin, pout);
        k.tri(P(b0), P(t1), P(t0), pin, pout, ptip);
      }
    }
    k.add(new THREE.SphereGeometry(0.026, 8, 5), '#e8a512', m.clone().multiply(M4(0, 0.03, 0, 0, 1, 0.75, 1)));
  }
  // 클로버 잎 한 장: 하트 모양, 가운데가 밝고 가장자리가 짙다
  function cloverLeaf(k, at, ang, tilt, s) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = Math.PI + (i / 18) * Math.PI * 2;
      pts.push([16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 17]);
    }
    const cin = COL('#86c46c'), cout = COL('#3d8530');
    const fx = Math.sin(ang), fz = Math.cos(ang);
    const W = ([hx, hy]) => {
      const r = hy * s, sd = hx * s;
      return [at[0] + fx * r + fz * sd, at[1] + r * tilt, at[2] + fz * r - fx * sd];
    };
    const ctr = W([0, 12]);
    for (let i = 0; i < pts.length - 1; i++) k.tri(ctr, W(pts[i]), W(pts[i + 1]), cin, cout, cout);
  }

  // 풀 종류: 긴 풀 · 짧은 풀 · 민들레 · 민들레 솜털 · 클로버 · 강아지풀 (종류마다 모양 여러 벌)
  const KINDS = ['tall', 'short', 'dandelion', 'puff', 'clover', 'foxtail'];
  function buildKind(kind, seed) {
    const r = rng(seed);
    const k = new Kit();
    const ring = (n, f) => { for (let i = 0; i < n; i++) f((i / n) * Math.PI * 2 + r() * 0.6, i); };
    if (kind === 'tall') {
      ring(9, a => blade(k, { x: Math.sin(a) * 0.04, z: Math.cos(a) * 0.04, yaw: a, h: 0.45 + r() * 0.35, w: 0.05 + r() * 0.025, lean: 0.08 + r() * 0.3, bend: 0.4 + r() * 0.8, base: '#3c7430', tip: r() < 0.3 ? '#c8d67a' : '#a3d06a', segs: 5 }));
      for (let i = 0; i < 2; i++) {
        const e = blade(k, { yaw: r() * 6.28, h: 0.8 + r() * 0.15, w: 0.014, lean: 0.05, bend: 0.5, base: '#5c8a40', tip: '#b9b072', segs: 5, fold: 0 });
        k.add(new THREE.SphereGeometry(0.02, 5, 4), '#cbb87c', headM(e.tip, e.dir, 1, 3.5, 1));
      }
    } else if (kind === 'short') {
      ring(14, a => blade(k, { x: Math.sin(a) * 0.07, z: Math.cos(a) * 0.07, yaw: a, h: 0.18 + r() * 0.17, w: 0.045, lean: 0.3 + r() * 0.4, bend: 0.5 + r() * 0.7, base: '#467f35', tip: '#b2da7c', segs: 3 }));
    } else if (kind === 'dandelion' || kind === 'puff') {
      ring(8, a => blade(k, { yaw: a, h: 0.24 + r() * 0.1, w: 0.075, lean: 1.15 + r() * 0.2, bend: 0.25, base: '#3b7430', tip: '#6eaa4c', teeth: 0.5, segs: 6 }));
      const e = blade(k, { yaw: r() * 6.28, h: kind === 'puff' ? 0.42 : 0.32, w: 0.022, lean: 0.05, bend: 0.2, base: '#6b9a4a', tip: '#5d9445', segs: 4, fold: 0 });
      if (kind === 'dandelion') dandelionHead(k, e.tip, e.dir);
      else {
        const top = e.tip[1] + 0.06;
        k.add(new THREE.IcosahedronGeometry(0.075, 1), (x, y) => COL('#f7f7f1').offsetHSL(0, 0, (y - top) * 0.6), M4(e.tip[0], top, e.tip[2]));
        ring(10, a => blade(k, { x: e.tip[0], y: top, z: e.tip[2], yaw: a, h: 0.1, w: 0.012, lean: 1.1 + r() * 0.6, bend: 0, base: '#e9e6da', tip: '#ffffff', segs: 1, fold: 0 }));
      }
    } else if (kind === 'clover') {
      ring(6, a => {
        const e = blade(k, { x: Math.sin(a) * 0.05, z: Math.cos(a) * 0.05, yaw: a, h: 0.1 + r() * 0.1, w: 0.012, lean: 0.25 + r() * 0.35, bend: 0.3, base: '#6a9c4c', tip: '#5d9445', segs: 3, fold: 0 });
        const spin = r() * 6.28;
        for (let j = 0; j < 3; j++) cloverLeaf(k, e.tip, spin + (j * Math.PI * 2) / 3, 0.18, 0.0034);
      });
      if (r() < 0.6) {
        const e = blade(k, { yaw: r() * 6.28, h: 0.26, w: 0.012, lean: 0.1, bend: 0.2, base: '#6a9c4c', tip: '#6a9c4c', segs: 3, fold: 0 });
        const top = e.tip[1] + 0.035;
        k.add(new THREE.IcosahedronGeometry(0.045, 1), (x, y) => COL('#fbf8ee').lerp(COL('#e8c6c9'), Math.max(0, Math.min(1, (top - y) * 12))), M4(e.tip[0], top, e.tip[2]));
      }
    } else if (kind === 'foxtail') {
      ring(5, a => blade(k, { yaw: a, h: 0.28 + r() * 0.1, w: 0.04, lean: 0.4 + r() * 0.3, bend: 0.7, base: '#467f35', tip: '#9fca6a', segs: 4 }));
      ring(3, a => {
        const e = blade(k, { yaw: a, h: 0.55 + r() * 0.25, w: 0.016, lean: 0.12, bend: 0.9 + r() * 0.4, base: '#5d8f3f', tip: '#9cb85e', segs: 5, fold: 0 });
        const m = headM(e.tip, e.dir, 1, 1, 1);
        k.add(new THREE.SphereGeometry(0.035, 7, 6), (x, y) => COL('#c9cf73').offsetHSL(0, 0, Math.sin(x * 400 + y * 300) * 0.05), m.clone().multiply(M4(0, 0.07, 0, 0, 1, 2.6, 1)));
        // 이삭 털: 가는 바늘을 둘러 꽂는다
        for (let j = 0; j < 10; j++) {
          const t = 0.02 + (j / 10) * 0.14, aa = j * 2.4;
          const p0 = new THREE.Vector3(Math.cos(aa) * 0.03, t, Math.sin(aa) * 0.03).applyMatrix4(m);
          const p1 = new THREE.Vector3(Math.cos(aa) * 0.07, t + 0.03, Math.sin(aa) * 0.07).applyMatrix4(m);
          const p2 = new THREE.Vector3(Math.cos(aa + 0.3) * 0.03, t + 0.01, Math.sin(aa + 0.3) * 0.03).applyMatrix4(m);
          k.tri(p0.toArray(), p1.toArray(), p2.toArray(), COL('#b8c266'), COL('#e3e3a0'), COL('#b8c266'));
        }
      });
    }
    return k.geo();
  }
  // 뽑힌 자리: 흙이 드러난 얕은 구멍과 흙 부스러기
  function dirtGeo() {
    const k = new Kit();
    const cIn = COL('#5e4430'), cOut = COL('#93785a');
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const r0 = 0.2 + Math.sin(i * 2.7) * 0.04, r1 = 0.2 + Math.sin((i + 1) * 2.7) * 0.04;
      k.tri([0, 0.01, 0], [Math.cos(a1) * r1, 0.025, Math.sin(a1) * r1], [Math.cos(a0) * r0, 0.025, Math.sin(a0) * r0], cIn, cOut, cOut);
    }
    for (let i = 0; i < 4; i++) k.add(new THREE.TetrahedronGeometry(0.03 + (i % 2) * 0.015), '#7a5d40', M4(Math.cos(i * 1.9) * 0.27, 0.025, Math.sin(i * 1.9) * 0.27, i));
    return k.geo();
  }

  // 삼베 결 무늬 (주머니)
  let burlapTex = null;
  function burlap() {
    if (burlapTex) return burlapTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#d6bf92';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 4) {
      g.fillStyle = i % 8 ? 'rgba(150,118,72,.35)' : 'rgba(120,92,52,.45)';
      g.fillRect(0, i, 64, 1.5);
      g.fillStyle = 'rgba(245,230,195,.35)';
      g.fillRect(i + 2, 0, 1.5, 64);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(110,84,50,.25)';
      g.fillRect((i * 37) % 64, (i * 23) % 64, 2, 1);
    }
    burlapTex = new THREE.CanvasTexture(c);
    burlapTex.colorSpace = THREE.SRGBColorSpace;
    burlapTex.wrapS = burlapTex.wrapT = THREE.RepeatWrapping;
    burlapTex.repeat.set(4, 3);
    return burlapTex;
  }
  // 제초 주머니: 아래가 둥글고 목을 끈으로 묶고 위가 주름져 벌어진 자루. 원점 = 바닥 가운데, 목 높이 0.635
  let sackGeo = null;
  function sackParts() {
    if (!sackGeo) {
      const prof = [[0, 0], [0.19, 0.004], [0.28, 0.035], [0.33, 0.11], [0.345, 0.24], [0.33, 0.38], [0.27, 0.5], [0.16, 0.59], [0.095, 0.63], [0.1, 0.66], [0.16, 0.7], [0.2, 0.745]];
      sackGeo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 20);
      const pos = sackGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const a = Math.atan2(z, x);
        // 몸통은 울퉁불퉁, 윗주름은 크게 물결친다
        const k = y > 0.64 ? 1 + 0.14 * Math.sin(a * 7) : 1 + 0.045 * Math.sin(a * 3 + y * 9) + 0.03 * Math.sin(a * 5 - y * 14);
        pos.setXYZ(i, x * k, y + (y > 0.64 ? 0.02 * Math.sin(a * 7 + 1) : 0), z * k);
      }
      sackGeo.computeVertexNormals();
    }
    const body = new THREE.Mesh(sackGeo, new THREE.MeshToonMaterial({ map: burlap(), side: THREE.DoubleSide }));
    const rope = new THREE.Group();
    const knot = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.02, 5, 16), mat('#a2834f'));
    knot.rotation.x = Math.PI / 2;
    knot.position.y = 0.635;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.16, 5), mat('#a2834f'));
    tail.position.set(0.11, 0.57, 0.03);
    tail.rotation.z = 0.35;
    rope.add(knot, tail);
    return { body, rope };
  }
  let SACK_GRASS = null;
  function sackGrassGeo() {
    const k = new Kit();
    const r = rng(7);
    for (let i = 0; i < 9; i++) blade(k, { x: (r() - 0.5) * 0.1, z: (r() - 0.5) * 0.1, yaw: r() * 6.28, h: 0.16 + r() * 0.12, w: 0.035, lean: 0.4 + r() * 0.5, bend: 0.9, base: '#4d8a39', tip: r() < 0.5 ? '#9fcd68' : '#b7c57a', segs: 3 });
    dandelionHead(k, [0.05, 0.12, 0.02], new THREE.Vector3(0.4, 1, 0.2).normalize());
    return k.geo();
  }
  function sackMesh() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    const { body, rope } = sackParts();
    inner.add(body, rope);
    const grass = new THREE.Mesh(SACK_GRASS || (SACK_GRASS = sackGrassGeo()), KM());
    g.add(inner, grass);
    g.scale.setScalar(1.05);
    g.userData = { inner, grass };
    return g;
  }
  function setFill(g, f) {
    // 빈 주머니는 납작하게 퍼져 주저앉고, 찰수록 둥글게 부풀어 선다
    const ky = 0.38 + 0.62 * f, kx = 1.15 - 0.15 * f;
    g.userData.inner.scale.set(kx, ky, kx);
    g.userData.grass.visible = f > 0.12;
    g.userData.grass.position.y = 0.66 * ky;
    g.userData.grass.scale.setScalar(0.5 + 0.6 * f);
  }

  /* ---------- 현장 소품: 구역 경계·팻말·입구 안내판·도구걸이·쉼터 ---------- */

  const FLAG = { 0: '#ffffff', 5: '#7ec8e3', 3: '#f2c94c', 2: '#f29e4c', 1: '#e25d5d' };
  function zoneGround(world, tf, z, seed) {
    // 풀이 무성한 둥근 땅: 가장자리가 울퉁불퉁하고 짙고 옅은 얼룩이 있다. 땅 높이를 따라 깐다
    const k = new Kit();
    const base = COL(z.color);
    const R = a => z.r * (1 + 0.05 * Math.sin(a * 5 + seed) + 0.03 * Math.sin(a * 11 + seed * 2));
    const rings = 10, segs = 64;
    const pt = (i, j) => {
      const a = (j / segs) * Math.PI * 2, rr = (i / rings) * R(a);
      const lx = z.cx + Math.cos(a) * rr, lz = z.cz + Math.sin(a) * rr;
      const [wx, wz] = tf(lx, lz);
      const c = base.clone().offsetHSL(0, 0, 0.05 * Math.sin(lx * 0.7 + lz * 0.4) * Math.cos(lz * 0.6 - lx * 0.3) - (i === rings ? 0.03 : 0));
      return { p: [wx, world.floorAt(wx, wz) + (i === rings ? 0.025 : 0.045), wz], c };
    };
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = pt(i, j), b = pt(i, j + 1), c = pt(i + 1, j + 1), d = pt(i + 1, j);
        if (i > 0) k.tri(a.p, c.p, b.p, a.c, c.c, b.c);
        k.tri(a.p, d.p, c.p, a.c, d.c, c.c);
      }
    }
    return new THREE.Mesh(k.geo(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  }
  function zoneFence(world, tf, z) {
    // 구역 둘레: 끝을 깎은 말뚝 + 처진 줄 + 등급 색 삼각 깃발
    const k = new Kit();
    const R = z.r + 0.4;
    const n = Math.max(12, Math.round((Math.PI * 2 * R) / 2.4));
    const tops = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const [x, zz] = tf(z.cx + Math.cos(a) * R, z.cz + Math.sin(a) * R);
      const y = world.floorAt(x, zz);
      const tilt = Math.sin(i * 3.1) * 0.06;
      k.add(new THREE.BoxGeometry(0.07, 0.6, 0.07), i % 3 ? '#a8865c' : '#9b7a52', M4(x, y + 0.3, zz, a, 1, 1, 1, tilt, -tilt));
      k.add(new THREE.ConeGeometry(0.05, 0.09, 4), '#bf9d71', M4(x, y + 0.645, zz, a + Math.PI / 4));
      k.add(new THREE.BoxGeometry(0.078, 0.07, 0.078), FLAG[z.grade], M4(x, y + 0.52, zz, a));
      tops.push(new THREE.Vector3(x, y + 0.5, zz));
    }
    for (let i = 0; i < n; i++) {
      const a = tops[i], b = tops[(i + 1) % n];
      const pts = [];
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        pts.push(a.clone().lerp(b, t).add(new THREE.Vector3(0, -0.12 * 4 * t * (1 - t), 0)));
      }
      k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.012, 4), '#e6dbbd');
      // 줄마다 깃발 두 장
      const dir = b.clone().sub(a).normalize().multiplyScalar(0.07);
      const flag = COL(FLAG[z.grade]), shade = flag.clone().offsetHSL(0, 0, -0.15);
      for (const s of [2, 4]) {
        const m = pts[s];
        k.tri([m.x - dir.x, m.y, m.z - dir.z], [m.x + dir.x, m.y, m.z + dir.z], [m.x, m.y - 0.16, m.z], flag, flag, shade);
      }
    }
    return new THREE.Mesh(k.geo(), KM());
  }
  function textTex(draw, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // 나무 팻말: 끝을 깎은 기둥 두 개 + 판자 여러 장(틈·나뭇결 색) + 못 + 위 덮개. 앞면 = +Z
  function signBoard(width, rows, draw) {
    const g = new THREE.Group();
    const k = new Kit();
    const H = 0.25 * rows;
    const top = 0.85 + H;
    for (const sx of [-width / 2 + 0.08, width / 2 - 0.08]) {
      k.add(new THREE.BoxGeometry(0.09, top, 0.09), '#8d6a46', M4(sx, top / 2, 0));
      k.add(new THREE.ConeGeometry(0.065, 0.1, 4), '#a27c54', M4(sx, top + 0.05, 0, Math.PI / 4));
    }
    const wood = ['#cba678', '#c09a6a', '#d0ad80', '#c6a072'];
    for (let i = 0; i < rows; i++) {
      const y = 0.85 + 0.125 + i * 0.25;
      k.add(new THREE.BoxGeometry(width, 0.235, 0.05), wood[i % 4], M4(0, y, 0.07));
      for (const sx of [-width / 2 + 0.08, width / 2 - 0.08]) k.add(new THREE.BoxGeometry(0.025, 0.025, 0.02), '#4b4038', M4(sx, y, 0.1));
    }
    k.add(new THREE.BoxGeometry(width + 0.14, 0.05, 0.16), '#7d5c3c', M4(0, top + 0.02, 0.05, 0, 1, 1, 1, 0.12));
    g.add(new THREE.Mesh(k.geo(), KM()));
    const fw = width - 0.24, fh = H - 0.06;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ map: textTex(draw, 512, Math.round((512 * fh) / fw)), transparent: true }));
    face.position.set(0, 0.85 + H / 2, 0.1);
    g.add(face);
    return g;
  }
  function zoneSignDraw(z) {
    return (g, w, h) => {
      g.fillStyle = FLAG[z.grade];
      g.fillRect(16, 12, w - 32, h * 0.12);
      g.strokeStyle = 'rgba(60,40,30,.5)';
      g.lineWidth = 3;
      g.strokeRect(16, 12, w - 32, h * 0.12);
      g.fillStyle = '#4a2f22';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `800 ${Math.round(h * 0.42)}px "Malgun Gothic", sans-serif`;
      g.fillText(z.label, w / 2, h * 0.52);
      g.font = `700 ${Math.round(h * 0.16)}px "Malgun Gothic", sans-serif`;
      g.fillText('풀뽑기 구역', w / 2, h * 0.86);
    };
  }
  function noticeDraw(g, w, h) {
    g.fillStyle = 'rgba(250,244,226,.95)';
    g.fillRect(10, 10, w - 20, h - 20);
    g.strokeStyle = 'rgba(90,60,40,.6)';
    g.lineWidth = 4;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#4a2f22';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = '800 36px "Malgun Gothic", sans-serif';
    g.fillText('풀뽑기 현장 안내', w / 2, 50);
    g.font = '600 20px "Malgun Gothic", sans-serif';
    g.fillText('자기 등급 구역에서만 일해요', w / 2, h - 22);
    // 구역 지도: 실제 배치를 줄여 그린다 (위 = 먼 쪽, 보는 사람 기준 왼쪽 = +x)
    const xs = ZONES.flatMap(z => [z.cx - z.r, z.cx + z.r]), zs = ZONES.flatMap(z => [z.cz - z.r, z.cz + z.r]).concat([18]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const s = Math.min((w - 40) / (x1 - x0), (h - 110) / (z1 - z0));
    const ox = w / 2 + ((x0 + x1) / 2) * s, oy = 66 + (h - 110) / 2 + ((z0 + z1) / 2) * s;
    const at = (x, z) => [ox - x * s, oy - z * s];
    g.setLineDash([6, 6]);
    g.strokeStyle = 'rgba(120,90,60,.5)';
    g.lineWidth = 2;
    for (const z of ZONES) {
      g.beginPath();
      g.moveTo(...at(0, 18));
      g.lineTo(...at(z.cx, z.cz));
      g.stroke();
    }
    g.setLineDash([]);
    g.textBaseline = 'middle';
    for (const z of ZONES) {
      const [x, y] = at(z.cx, z.cz);
      g.fillStyle = z.color;
      g.beginPath();
      g.arc(x, y, z.r * s, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = FLAG[z.grade] === '#ffffff' ? '#9a9a9a' : FLAG[z.grade];
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = '#3a2a20';
      g.font = '800 20px "Malgun Gothic", sans-serif';
      g.fillText(z.label, x, y);
    }
    const [hx, hy] = at(0, 18);
    g.fillStyle = '#c0392b';
    g.beginPath();
    g.arc(hx, hy, 7, 0, Math.PI * 2);
    g.fill();
    g.font = '700 15px "Malgun Gothic", sans-serif';
    g.fillText('지금 여기', hx, hy + 18);
  }
  function toolRack() {
    // 도구걸이: 가로대에 갈퀴·풀 포크를 걸어 두고, 발치에 빈 주머니를 개어 쌓았다. 앞면 = +Z
    const k = new Kit();
    for (const sx of [-0.6, 0.6]) k.add(new THREE.BoxGeometry(0.08, 1.05, 0.08), '#8d6a46', M4(sx, 0.525, 0));
    k.add(new THREE.BoxGeometry(1.36, 0.07, 0.07), '#9b7752', M4(0, 0.98, 0));
    for (const [x, kind] of [[-0.38, 'rake'], [-0.05, 'fork'], [0.3, 'rake']]) {
      k.add(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), '#c49a62', M4(x, 0.55, 0.07, 0, 1, 1, 1, -0.12));
      k.add(new THREE.BoxGeometry(0.03, 0.03, 0.08), '#5a4a3c', M4(x, 0.98, 0.04));
      if (kind === 'rake') {
        k.add(new THREE.BoxGeometry(0.26, 0.035, 0.035), '#7f8a8f', M4(x, 0.08, 0.13));
        for (let t = 0; t < 6; t++) k.add(new THREE.BoxGeometry(0.012, 0.09, 0.012), '#6c777c', M4(x - 0.11 + t * 0.044, 0.03, 0.15, 0, 1, 1, 1, 0.3));
      } else {
        k.add(new THREE.BoxGeometry(0.14, 0.03, 0.03), '#7f8a8f', M4(x, 0.12, 0.13));
        for (let t = 0; t < 3; t++) k.add(new THREE.ConeGeometry(0.012, 0.16, 4), '#6c777c', M4(x - 0.05 + t * 0.05, 0.03, 0.14, 0, 1, 1, 1, Math.PI));
      }
    }
    for (let i = 0; i < 3; i++) k.add(new THREE.BoxGeometry(0.42, 0.035, 0.3), i % 2 ? '#cdb58a' : '#d8c299', M4(0.45 + i * 0.02, 0.02 + i * 0.037, 0.35, i * 0.15));
    return new THREE.Mesh(k.geo(), KM());
  }
  function shadeTree() {
    // 쉼터 나무: 뿌리가 퍼진 줄기 + 가지 + 잎뭉치 여러 개
    const k = new Kit();
    k.add(new THREE.CylinderGeometry(0.16, 0.26, 2.1, 9), (x, y) => COL('#7a5a3c').offsetHSL(0, 0, Math.sin(y * 9 + x * 20) * 0.03), M4(0, 1.05, 0));
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      k.add(new THREE.ConeGeometry(0.08, 0.5, 5), '#6e5034', M4(Math.cos(a) * 0.22, 0.08, Math.sin(a) * 0.22, 0, 1, 1, 1, Math.sin(a) * 1.3, -Math.cos(a) * 1.3));
    }
    for (const [a, l] of [[0.6, 0.9], [2.5, 0.8], [4.4, 1.0]]) k.add(new THREE.CylinderGeometry(0.05, 0.09, l, 6), '#7a5a3c', M4(Math.cos(a) * 0.3, 1.85, Math.sin(a) * 0.3, 0, 1, 1, 1, Math.sin(a) * 0.8, -Math.cos(a) * 0.8));
    const r = rng(11);
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.28, d = 0.4 + r() * 0.9;
      const c = ['#5f9e46', '#6fae4f', '#4f8c3c', '#7cba58'][i % 4];
      k.add(new THREE.IcosahedronGeometry(0.55 + r() * 0.35, 1), (x, y) => COL(c).offsetHSL(0, 0, (y - 2.6) * 0.04), M4(Math.cos(a) * d, 2.3 + r() * 0.8, Math.sin(a) * d, r() * 3));
    }
    return new THREE.Mesh(k.geo(), KM());
  }
  function restMat() {
    // 돗자리: 짚 색 줄무늬 + 가장자리 천 + 물통
    const k = new Kit();
    for (let i = 0; i < 9; i++) k.add(new THREE.BoxGeometry(1.2, 0.02, 0.1), i % 2 ? '#d9c48a' : '#e4d39e', M4(0, 0.012, -0.4 + i * 0.1));
    for (const z of [-0.47, 0.47]) k.add(new THREE.BoxGeometry(1.24, 0.026, 0.06), '#5f7e9e', M4(0, 0.014, z));
    k.add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), '#c9c1a9', M4(0.48, 0.07, -0.3));
    return new THREE.Mesh(k.geo(), KM());
  }

  /* ---------- 화면: 구역·풀·소품 짓기 ---------- */

  let field = null;
  function build(scene, world) {
    const place = world.places.find(p => p.id === 'weeding');
    if (!place) return;
    const th = ((place.face || 0) * Math.PI) / 2;
    const tf = (lx, lz) => [place.x + lx * Math.cos(th) + lz * Math.sin(th), place.z - lx * Math.sin(th) + lz * Math.cos(th)];
    const group = new THREE.Group();
    const putLocal = (obj, lx, lz, yaw) => {
      const [x, z] = tf(lx, lz);
      obj.position.set(x, world.floorAt(x, z), z);
      obj.rotation.y = yaw + th;
      group.add(obj);
    };
    const ENTRY = [0, 20];
    const rand = rng(2026);
    const tufts = [];
    const pick = () => {
      const v = rand();
      return v < 0.3 ? 0 : v < 0.58 ? 1 : v < 0.7 ? 2 : v < 0.74 ? 3 : v < 0.9 ? 4 : 5;
    };
    ZONES.forEach((z, zi) => {
      group.add(zoneGround(world, tf, z, zi * 1.7));
      group.add(zoneFence(world, tf, z));
      // 팻말: 입구 쪽 둘레 바깥, 입구를 바라본다
      let ux = ENTRY[0] - z.cx, uz = ENTRY[1] - z.cz;
      const ul = Math.hypot(ux, uz) || 1;
      ux /= ul;
      uz /= ul;
      putLocal(signBoard(1.5, 3, zoneSignDraw(z)), z.cx + ux * (z.r + 1.5), z.cz + uz * (z.r + 1.5), Math.atan2(ux, uz));
      // 풀: 1.2칸 간격에 흩어 심고 종류·크기·방향·색을 섞는다
      for (let x = -z.r; x <= z.r; x += 1.2) {
        for (let zz = -z.r; zz <= z.r; zz += 1.2) {
          const jx = x + (rand() - 0.5) * 0.9, jz = zz + (rand() - 0.5) * 0.9;
          if (Math.hypot(jx, jz) > z.r - 0.3) continue;
          tufts.push({ lx: z.cx + jx, lz: z.cz + jz, kind: pick(), s: 0.8 + rand() * 0.5, yaw: rand() * 6.28, pull: true });
        }
      }
    });
    // 구역 바깥 초원에도 드문드문 (뽑지 않는 풀)
    for (let i = 0; i < 260; i++) {
      const a = rand() * 6.28, d = 8 + Math.sqrt(rand()) * 80;
      const lx = Math.cos(a) * d, lz = Math.sin(a) * d;
      if (ZONES.some(z => Math.hypot(lx - z.cx, lz - z.cz) < z.r + 2)) continue;
      if (Math.hypot(lx - ENTRY[0], lz - ENTRY[1]) < 7) continue;
      const [wx, wz] = tf(lx, lz);
      if (world.isWalkable && !world.isWalkable(wx, wz)) continue;
      // 다른 장소(집 안 등)에는 심지 않는다: 치이카와 집 바닥에 풀이 나 있던 문제 (2026-11-10)
      if (world.places.some(q => q.id !== 'weeding' && q.r && Math.hypot(q.x - wx, q.z - wz) < q.r + 2)) continue;
      tufts.push({ lx, lz, kind: rand() < 0.5 ? 1 : pick(), s: 0.7 + rand() * 0.4, yaw: rand() * 6.28, pull: false });
    }
    // 종류별 InstancedMesh (종류마다 모양 3벌을 섞어 똑같은 포기가 줄지어 보이지 않게)
    const VAR = 3;
    const counts = {};
    tufts.forEach((t, i) => {
      t.key = `${t.kind}_${(i * 7) % VAR}`;
      t.slot = counts[t.key] || 0;
      counts[t.key] = t.slot + 1;
    });
    const inst = {};
    for (const key of Object.keys(counts)) {
      const [kind, v] = key.split('_').map(Number);
      const im = new THREE.InstancedMesh(buildKind(KINDS[kind], 100 + kind * 13 + v * 101), KM(), counts[key]);
      inst[key] = im;
      group.add(im);
    }
    const tint = new THREE.Color();
    tufts.forEach(t => {
      [t.x, t.z] = tf(t.lx, t.lz);
      t.y = world.floorAt(t.x, t.z) + 0.03;
      t.m = M4(t.x, t.y, t.z, t.yaw, t.s);
      const im = inst[t.key];
      im.setMatrixAt(t.slot, t.m);
      const k = 0.88 + rand() * 0.2;
      im.setColorAt(t.slot, tint.setRGB(k * (0.96 + rand() * 0.08), k, k * (0.92 + rand() * 0.08)));
    });
    for (const im of Object.values(inst)) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
    }
    // 뽑힌 자리 흙 (처음엔 숨김)
    const pullable = tufts.filter(t => t.pull);
    const dirt = new THREE.InstancedMesh(dirtGeo(), KM(), pullable.length);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    pullable.forEach((t, i) => {
      t.d = i;
      dirt.setMatrixAt(i, zero);
    });
    dirt.frustumCulled = false;
    group.add(dirt);
    // 입구: 안내판(구역 지도) · 도구걸이 · 쉼터 나무와 돗자리
    putLocal(signBoard(1.9, 5, noticeDraw), 0, 19.9, Math.PI);
    putLocal(toolRack(), 4.5, 19.3, Math.PI);
    putLocal(shadeTree(), -7.4, 16.4, 0);
    putLocal(restMat(), -5, 19.1, 0);
    scene.add(group);
    field = { group, tufts: pullable, inst, dirt, zero, bags: new Map(), pulled: new Set(), day: -1, world, scene };
  }

  function update(sim) {
    if (!field) return;
    const touched = new Set();
    // 새 날이면 풀이 다시 자라고 흙자리가 메워진다
    if (field.day !== sim.day) {
      field.day = sim.day;
      for (const t of field.pulled) {
        field.inst[t.key].setMatrixAt(t.slot, t.m);
        field.dirt.setMatrixAt(t.d, field.zero);
        touched.add(field.inst[t.key]);
        touched.add(field.dirt);
      }
      field.pulled.clear();
    }
    const seen = new Set();
    for (const c of sim.chars) {
      const d = c.doing;
      if (!d || !d.x || d.x.zoneGrade === undefined || d.phase !== 'use' || d.step < 1 || !d.socket) continue;
      seen.add(c);
      // 내려놓은 주머니 (자리 오른쪽 0.95)
      let bag = field.bags.get(c);
      if (!bag) {
        bag = sackMesh();
        bag.rotation.y = Math.random() * 6.28;
        field.scene.add(bag);
        field.bags.set(c, bag);
      }
      const a = (c.angle || 0) + Math.PI / 2;
      const bx = d.socket.x + Math.sin(a) * -0.95;
      const bz = d.socket.z + Math.cos(a) * -0.95;
      bag.position.set(bx, field.world.floorAt(bx, bz) + 0.01, bz);
      const fill = fillOf(c);
      setFill(bag, fill);
      if (c.bag) c.bag.fill = fill;
      // 뽑은 만큼 둘레 1.9 안의 풀이 가까운 것부터 사라지고 흙이 드러난다
      const dist = t => Math.hypot(t.x - d.socket.x, t.z - d.socket.z);
      const near = field.tufts.filter(t => dist(t) < 1.9).sort((p, q) => dist(p) - dist(q));
      const want = Math.round(near.length * Math.min(1, fill * 1.15));
      for (let k = 0; k < want; k++) {
        const t = near[k];
        if (field.pulled.has(t)) continue;
        field.pulled.add(t);
        field.inst[t.key].setMatrixAt(t.slot, field.zero);
        field.dirt.setMatrixAt(t.d, M4(t.x, t.y - 0.02, t.z, t.yaw, t.s * 0.9));
        touched.add(field.inst[t.key]);
        touched.add(field.dirt);
      }
    }
    for (const im of touched) im.instanceMatrix.needsUpdate = true;
    // 일이 끝난 사람의 주머니는 들고 간다 (바닥에서 치운다)
    for (const [c, bag] of field.bags) {
      if (seen.has(c)) continue;
      field.scene.remove(bag);
      field.bags.delete(c);
    }
  }

  // 손에 드는 제초 주머니 (걸어갈 때): 목을 쥐고 몸 밖으로 늘어뜨린다. 원점 = 쥐는 점, +Z = 몸 밖
  if (root.VillageProps) {
    root.VillageProps.BUILD.sack = () => {
      const g = new THREE.Group();
      const { body, rope } = sackParts();
      const inner = new THREE.Group();
      inner.add(body, rope);
      inner.scale.setScalar(0.55);
      inner.position.set(0, -0.37, 0.2);
      g.add(inner);
      g.userData.body = inner;
      return g;
    };
    root.VillageProps.HAND.sack = 1;
  }

  /* ---------- 한 포기씩: 쪼그려 앉아 뽑고 → 들어 올려 → 오른쪽 주머니에 넣고 → 다시 (2026-11-10 이재헌 지시) ---------- */
  const EASE = { s: 'snap', b: 'back', o: 'out', l: 'lin' };
  const track = t => t.trim().split(/\s+/).map(k => { const m = k.match(/^([\d.]+):(-?[\d.]+)([sbol]?)$/); return [+m[1], +m[2], EASE[m[3]] || 'io']; });
  const reachOf = t => t.trim().split(/\s+/).map(k => { const m = k.match(/^([a-zA-Z]+)(?:\(([^)]*)\))?@([\d.]+)$/); const o = (m[2] || '').split(',').map(Number); return { name: m[1], off: [o[0] || 0, o[1] || 0, o[2] || 0], t: +m[3] }; });
  const BAG_DUR = 2.4;
  if (typeof ANIMS !== 'undefined') {
    const body = {
      rotY: '0:0 1.15:0 1.45:-.55 1.9:-.55 2.2:0 2.4:0', rotX: '0:.26 .8:.3 1.02:.04s 1.2:.1 1.5:.22 1.9:.22 2.4:.26',
      posY: '0:-.12 .85:-.14 1.02:-.05 1.2:-.08 2.4:-.12', squash: '0:.93 .85:.91 1.02:1b 1.3:.95 2.4:.93',
      footLY: '0:.14 2.4:.14', footRY: '0:.14 2.4:.14',
    };
    const tracks = {};
    for (const [k, v] of Object.entries(body)) tracks[k] = track(v);
    ANIMS.weed_bag = {
      id: 'weed_bag', dur: BAG_DUR, loop: true, tracks,
      reach: { R: reachOf('ground(.1)@0 ground(.1,.03)@.85 chest(.12,0,.1)@1.1 side(.3,-.15,.15)@1.6 side(.3,-.15,.15)@1.85 ground(.1)@2.4'), L: reachOf('ground(.1)@0 ground(.1,.03)@.85 chest(.12,0,.1)@1.1 lap@1.6 lap@1.85 ground(.1)@2.4') },
      face: [[0, 'normal'], [1, 'flustered'], [1.5, 'normal']],
    };
  }
  // 손에 든 풀 한 포기: 땅에서 뽑혀 올라와 주머니(캐릭터 오른쪽 0.95, 장소 쪽 계산과 같은 자리)로 들어간다
  const held = new Map();
  let tuftGeo = null;
  function frame(sim, actors, scene, time) {
    if (!field) return;
    for (const a of actors) {
      const c = a.c;
      const d = c.doing;
      const on = d && d.x && d.x.zoneGrade !== undefined && d.phase === 'use' && c.clip === 'weed_bag';
      let t = held.get(c);
      if (!on) { if (t) t.visible = false; continue; }
      if (!t) {
        t = new THREE.Mesh(tuftGeo || (tuftGeo = buildKind('tall', 77)), KM());
        scene.add(t);
        held.set(c, t);
      }
      const k = (time + (a.offset || 0)) % BAG_DUR;
      const r = a.built.root;
      // 루트 기준 자리: 앞 땅(0,0,.45) → 가슴(0,.6,.35) → 주머니 위(-.95,.75,0) → 주머니 속(-.95,.35,0)
      let lx, ly, lz, s = 0.55;
      if (k < 0.85) { t.visible = false; continue; }
      else if (k < 1.1) { const u = (k - 0.85) / 0.25; lx = 0; ly = u * 0.6; lz = 0.6; }
      else if (k < 1.6) { const u = (k - 1.1) / 0.5; lx = -0.95 * u; ly = 0.6 + Math.sin(u * Math.PI) * 0.2 + u * 0.15; lz = 0.6 * (1 - u * u); }
      else if (k < 1.85) { const u = (k - 1.6) / 0.25; lx = -0.95; ly = 0.75 - u * 0.4; lz = 0; s = 0.55 * (1 - u * 0.6); }
      else { t.visible = false; continue; }
      t.visible = true;
      const cy = Math.cos(r.rotation.y), sy = Math.sin(r.rotation.y);
      t.position.set(r.position.x + lx * cy + lz * sy, r.position.y + ly, r.position.z - lx * sy + lz * cy);
      t.rotation.set(Math.PI, r.rotation.y, 0.2);
      t.scale.setScalar(s);
    }
  }

  root.WeedingField = { ZONES, build, update, frame, fillOf, KINDS, buildKind, tools: { Kit, M4, COL, rng, blade, KM, signBoard, buildKind } };
}(typeof self !== 'undefined' ? self : this));
