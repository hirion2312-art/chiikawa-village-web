'use strict';

// 치이카와 심즈 — 안이 있는 장소들. 시스템은 interiors.js
// 크기 기준: 1유닛은 약 0.6m, 캐릭터 키 1.7. 앉은 자리는 몸 반지름(약 0.8)만큼 탁자에서 띄운다

/* ---------- 공통: 돌벽 무늬, 평평한 바닥 ---------- */

// 참고 사진의 돌벽: 크게 갈라진 금, 금이 만나는 곳의 짧은 빗금
SKINS.crack = skinTexture((g, s) => {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const joints = [[60, 90], [230, 40], [420, 120], [130, 270], [330, 300], [470, 330], [80, 450], [280, 470], [430, 470]];
  const links = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 4], [3, 6], [6, 7], [7, 8], [4, 7], [5, 8]];
  g.strokeStyle = 'rgba(90, 59, 51, .9)';
  g.lineWidth = 6;
  for (const [a, b] of links) {
    const [ax, ay] = joints[a];
    const [bx, by] = joints[b];
    g.beginPath();
    g.moveTo(ax, ay);
    g.quadraticCurveTo((ax + bx) / 2 + rand(-24, 24), (ay + by) / 2 + rand(-24, 24), bx, by);
    g.stroke();
  }
  g.lineWidth = 3.5;
  for (const [x, y] of joints) {
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(x + i * 8, y + 4);
      g.lineTo(x + i * 8, y + 20);
      g.stroke();
    }
  }
});

// 원작 하치와레 동굴 벽 (애니 238·239화): 크고 둥근 돌덩이가 쌓인 회색 벽. 돌 테두리는 갈색 먹선, 이음매에 짧은 빗금
// 벽 한 칸(약 2.6 × 5)에 늘여 붙으므로 가로로 넓게 그려야 화면에서 둥글게 보인다. 좌우가 이어지게 그린다
SKINS.caveStone = skinTexture((g, s) => {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // 바탕을 회색으로 눌러 준다
  g.fillStyle = 'rgba(120, 130, 138, .28)';
  g.fillRect(0, 0, s, s);
  // 가로 이음매: 좌우가 이어지는 물결선. 세로 이음매: 줄마다 엇갈린 휜 선 (돌이 맞물려 쌓인 모양)
  const ROWS = 4;
  const waves = [];
  for (let r = 0; r <= ROWS; r++) {
    const base = (r / ROWS) * s + (r === 0 || r === ROWS ? 0 : rand(-26, 26)), a1 = rand(0, 7), a2 = rand(0, 7), amp = r === 0 || r === ROWS ? 0 : rand(14, 24);
    waves.push(x => base + Math.sin((x / s) * Math.PI * 2 + a1) * amp + Math.sin((x / s) * Math.PI * 4 + a2) * amp * 0.5);
  }
  const ink = w => { g.strokeStyle = 'rgba(90, 59, 51, .92)'; g.lineWidth = w; };
  for (let r = 0; r < ROWS; r++) {
    const top = waves[r], bot = waves[r + 1];
    const n = 2 + Math.floor(rand(0, 2));
    const off = (r % 2 ? 0.5 : 0) + rand(-0.12, 0.12);
    const joints = [];
    for (let i = 0; i < n; i++) joints.push(((i + off) / n) * s + rand(-50, 50));
    // 돌마다 살짝 다른 명암
    for (let i = 0; i < n; i++) {
      const x0 = joints[i], x1 = i + 1 < n ? joints[i + 1] : joints[0] + s;
      for (const dx of [-s, 0, s]) {
        g.beginPath();
        for (let x = x0; x <= x1; x += 16) (x === x0 ? g.moveTo.bind(g) : g.lineTo.bind(g))(x + dx, top(x) + 4);
        for (let x = x1; x >= x0; x -= 16) g.lineTo(x + dx, bot(x) - 4);
        g.closePath();
        g.fillStyle = `rgba(60, 70, 80, ${rand(0, 0.14)})`;
        g.fill();
        // 돌 아래쪽 그늘
        g.beginPath();
        for (let x = x0 + 10; x <= x1 - 10; x += 16) (x === x0 + 10 ? g.moveTo.bind(g) : g.lineTo.bind(g))(x + dx, bot(x) - 22);
        for (let x = x1 - 10; x >= x0 + 10; x -= 16) g.lineTo(x + dx, bot(x) - 4);
        g.fillStyle = 'rgba(60, 70, 80, .12)';
        g.fill();
      }
    }
    // 세로 이음매: 위아래 물결선을 잇는 휜 선, 위쪽 끝에 짧은 빗금
    for (const jx of joints) for (const dx of [-s, 0, s]) {
      const x = jx + dx, y0 = top(jx), y1 = bot(jx), bend = rand(-44, 44);
      ink(6);
      g.beginPath();
      g.moveTo(x, y0);
      g.quadraticCurveTo(x + bend, (y0 + y1) / 2, x + rand(-14, 14), y1);
      g.stroke();
      ink(3);
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(x - 20 - i * 9, y0 + 6);
        g.lineTo(x - 20 - i * 9, y0 + 22);
        g.stroke();
      }
    }
  }
  // 가로 이음매 (맨 위·맨 아래는 벽 끝이라 긋지 않는다). 군데군데 끊어 손으로 그은 느낌
  for (let r = 1; r < ROWS; r++) {
    ink(6);
    let x = 0;
    while (x < s) {
      const len = rand(140, 260);
      g.beginPath();
      for (let t = x; t <= Math.min(s, x + len); t += 12) (t === x ? g.moveTo.bind(g) : g.lineTo.bind(g))(t, waves[r](t));
      g.stroke();
      x += len + rand(6, 20);
    }
  }
});

function polygonFloor(k, points, color, y = 0.03) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color));
  m.position.y = y;
  m.receiveShadow = true;
  k.group.add(m);
  return m;
}
// 바닥의 짧은 자국 선
function floorMarks(k, w, d, cz, keep, y = 0.06) {
  const plane = k.paint(0, 0, 0, w, d, g => {
    g.translate(0, d / 2);
    for (let i = 0; i < w * d * 0.16; i++) {
      const x = rand(-w / 2, w / 2);
      const z = rand(-d / 2, d / 2);
      if (!keep(x, z + cz)) continue;
      inkPath(g, [[x, z], [x + rand(0.25, 0.6), z + rand(-0.04, 0.04)]], 0.05);
    }
  });
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, y, cz);
}

// 김: 공 대신 옅게 흩어지는 작은 입자. 얼굴을 가리지 않게 낮고 작게 피어오른다
// 불꽃 (2026-11-10 이재헌 지시: 밥 지을 때 불꽃이 냄비 앞에 뜬 원뿔 하나라 아쉽다)
// 냄비 바로 밑에서 피어오르는 겹겹 불꽃: 바깥 주황·안쪽 노랑·가운데 흰빛, 혀마다 박자가 달라 일렁이고 불씨가 튄다
// kind 'wood'는 장작 셋과 숯불, 'gas'는 둥근 화구와 파란 불꽃 고리. parent의 원점 = 불이 닿는 바닥 가운데
function makeFire(parent, r = 0.3, kind = 'wood') {
  const g = new THREE.Group();
  parent.add(g);
  const add = (geo, color, op = 1) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, depthWrite: op >= 1 }));
    g.add(m);
    return m;
  };
  if (kind === 'wood') {
    for (let i = 0; i < 3; i++) {
      const log = add(new THREE.CylinderGeometry(r * 0.16, r * 0.18, r * 2.2, 7), i % 2 ? '#7d5a44' : '#6b4b36');
      log.rotation.set(Math.PI / 2, 0, (i / 3) * Math.PI);
      log.position.y = r * 0.12;
    }
    add(new THREE.CylinderGeometry(r * 0.75, r * 0.85, r * 0.12, 14), '#e8693a').position.y = r * 0.05;
  } else {
    const ring = add(new THREE.TorusGeometry(r * 0.9, r * 0.08, 6, 22), '#3f3d3a');
    ring.rotation.x = Math.PI / 2;
  }
  const tongues = [];
  const n = kind === 'wood' ? 7 : 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = kind === 'wood' ? (i ? r * 0.45 : 0) : r * 0.85;
    const t = new THREE.Group();
    t.position.set(Math.cos(a) * d, r * 0.1, Math.sin(a) * d);
    const h = kind === 'wood' ? r * (i ? 1.6 : 2.2) : r * 0.7;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, h, 8), new THREE.MeshBasicMaterial({ color: kind === 'wood' ? '#ff8a3a' : '#5aa8ff', transparent: true, opacity: 0.85, depthWrite: false }));
    outer.position.y = h / 2;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(r * 0.16, h * 0.7, 8), new THREE.MeshBasicMaterial({ color: kind === 'wood' ? '#ffd45a' : '#bfe4ff', transparent: true, opacity: 0.95, depthWrite: false }));
    inner.position.y = h * 0.35;
    const core = new THREE.Mesh(new THREE.ConeGeometry(r * 0.07, h * 0.35, 6), new THREE.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0.9, depthWrite: false }));
    core.position.y = h * 0.18;
    t.add(outer, inner, core);
    g.add(t);
    tongues.push({ t, ph: i * 1.7, sp: 9 + (i % 3) * 3 });
  }
  const sparks = [];
  if (kind === 'wood') for (let i = 0; i < 6; i++) sparks.push(add(new THREE.SphereGeometry(r * 0.04, 5, 4), '#ffcf6b'));
  const glow = add(new THREE.SphereGeometry(r * 1.4, 12, 8), kind === 'wood' ? '#ff9a4a' : '#7fb8ff', 0.18);
  glow.scale.y = 0.6;
  glow.position.y = r * 0.6;
  g.visible = false;
  return {
    g,
    run(time, on) {
      g.visible = on;
      if (!on) return;
      for (const q of tongues) {
        const f = 0.82 + Math.sin(time * q.sp + q.ph) * 0.12 + Math.sin(time * q.sp * 2.3 + q.ph) * 0.06;
        q.t.scale.set(1 - (f - 0.82) * 0.6, f, 1 - (f - 0.82) * 0.6);
        q.t.rotation.z = Math.sin(time * 4 + q.ph) * 0.12;
      }
      sparks.forEach((m, i) => {
        const k = (time * 0.7 + i / sparks.length) % 1;
        m.position.set(Math.sin(i * 2.3 + k * 3) * r * 0.5, r * 0.4 + k * r * 4, Math.cos(i * 1.7) * r * 0.4);
        m.visible = k < 0.85;
      });
      glow.material.opacity = 0.14 + Math.sin(time * 11) * 0.04;
    },
  };
}
self.FireFx = { makeFire };

function steamPuffs(kit, n, x, y, z) {
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const m = kit.ball(x, y, z, 0.2, 0.2, 0.2, '#fbfbf6', 0);
    m.material = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    m.castShadow = false;
    puffs.push(m);
  }
  return puffs;
}
function runSteam(puffs, x, y, z, time, on) {
  puffs.forEach((m, i) => {
    const t = (time * 0.55 + i / puffs.length) % 1;
    m.visible = on;
    if (!on) return;
    m.position.set(x + Math.sin(t * 5 + i * 2) * (0.06 + t * 0.16), y + t * 0.85, z + 0.12 * t);
    const s = 0.08 + t * 0.2;
    m.scale.set(s, s * 1.2, s);
    // 공처럼 보이지 않게 옅게, 위로 갈수록 넓게 퍼지며 사라진다
    m.scale.set(s * 1.6, s * 0.9, s * 1.6);
    m.material.opacity = Math.sin(t * Math.PI) * 0.22;
  });
}

/* ---------- 하치와레의 동굴 ---------- */

// 평면: 가운데 원점, +z가 입구. 입구 밖 지형 위로 굴이 이어진다
const CAVE_RX = 7.6;
const CAVE_RZ = 6.6;
const CAVE_MOUTH_W = 3.8;
const CAVE_MOUTH_Z = 10.4;
function caveOutline() {
  const pts = [];
  const n = 18;
  const gap = Math.asin(CAVE_MOUTH_W / 2 / CAVE_RX);
  for (let i = 0; i <= n; i++) {
    // 입구 방향(각 0)만 비워 두고 한 바퀴 돈다
    const a = gap + (i / n) * (Math.PI * 2 - gap * 2);
    const bump = 1 + 0.035 * Math.sin(a * 5 + 1);
    pts.push([Math.sin(a) * CAVE_RX * bump, Math.cos(a) * CAVE_RZ * bump]);
  }
  return pts;
}
const insideCave = (x, z) => (x / (CAVE_RX - 0.2)) ** 2 + (z / (CAVE_RZ - 0.2)) ** 2 < 1;

// 벼랑의 바위: 윤곽선이 곧 돌 사이의 금이 된다
const CAVE_ROCK = '#c7d0d6';
const CAVE_DARK = '#5d7482';
const CAVE_FLOOR = '#a9adae';
const CAVE_BED_Z = 1.6;
function caveBackWall(k, x, w) {
  k.bigBox(x, 5, 5.4, w, 10, 6.4, '#b9c3ca', 0.5);
  k.sub(x, 8.6).skin(0, 5, w - 0.4, 9.6, 'crack');
}
function caveBoulder(k, x, y, z, rx, ry, rz, color = CAVE_ROCK) {
  return k.ball(x, y, z, rx, ry, rz, color, 2);
}
// [x, y, z, rx, ry, rz]. 벽 앞면은 z = 10 부근. 입구 위(가운데)는 비우지 않고 아치 윗돌을 얹는다
const CAVE_BOULDERS = {
  shell: [
    [-6.2, 2.9, 9.1, 3.7, 3.2, 2.6], [6.2, 2.7, 9.1, 3.8, 3, 2.6],
    [-11, 2.6, 8.8, 3, 2.9, 2.4], [11, 2.9, 8.8, 3, 3.2, 2.4],
    [0, 7, 8.9, 3.6, 2.5, 2.3], [-5.8, 7.6, 8.2, 3.6, 2.7, 2.6], [6, 7.6, 8.2, 3.7, 2.7, 2.6],
    [-11, 7.8, 7.6, 3.2, 2.8, 2.6], [11, 7.8, 7.6, 3.2, 2.8, 2.6],
  ],
  shellTop: [
    [-8, 9.2, 2, 8, 4.4, 8], [8, 9.2, 2, 8, 4.4, 8], [0, 10.2, -1, 10, 4.8, 10],
    [-9, 4, -5, 7, 7, 6], [9, 4, -5, 7, 7, 6], [-11, 5, 2, 4.4, 6, 7], [11, 5, 2, 4.4, 6, 7],
  ],
  side: [],
  top: [],
};
for (const s of [-1, 1]) {
  const end = s > 0 ? 32 : 44;
  let row = 0;
  for (let x = 16; x < end; x += 6.2, row++) {
    const j = row % 2 ? 0.3 : -0.3;
    CAVE_BOULDERS.side.push([s * x, 2.8 + j, 9 - row * 0.15, 3.6, 3.2 + j, 2.6]);
    CAVE_BOULDERS.side.push([s * (x + 3), 7.6 - j, 8 - row * 0.15, 3.5, 2.8, 2.6]);
    CAVE_BOULDERS.top.push([s * x, 10, 2, 6, 4.2, 7]);
  }
}
// 돌 턱 가장자리 (world.js CLIFF 윤곽을 건물 좌표로). 건물 x가 커질수록 북쪽
// 절벽면: 돌 턱 아래로 흘러내리는 황토색 바위기둥과 금
const cliffTex = canvasTexture(512, (g, s) => {
  g.fillStyle = '#d3bd98';
  g.fillRect(0, 0, s, s);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * s + 40;
    g.fillStyle = 'rgba(128, 106, 84, .7)';
    g.beginPath();
    g.moveTo(x - 30, s);
    g.lineTo(x, 80);
    g.lineTo(x + 34, s);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(90, 59, 51, .95)';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(x, 40);
    g.lineTo(x + 8, 220);
    g.lineTo(x - 18, 400);
    g.lineTo(x - 8, s);
    g.stroke();
  }
}, 1);
function cliffSkin() {
  const pts = cliffEdgePoints();
  const rows = 6;
  const verts = [];
  const uvs = [];
  const index = [];
  let along = 0;
  pts.forEach(([u, v], i) => {
    const next = pts[Math.min(i + 1, pts.length - 1)];
    const prev = pts[Math.max(i - 1, 0)];
    const tx = next[0] - prev[0];
    const tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    // 진행 방향의 왼쪽이 벼랑 바깥
    const nu = tz / len;
    const nv = -tx / len;
    if (i) along += Math.hypot(u - pts[i - 1][0], v - pts[i - 1][1]);
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const pu = u + nu * t * 7;
      const pv = v + nv * t * 7;
      verts.push(-pv, heightAt(CLIFF.x + pu, CLIFF.z + pv) - CLIFF.y + 0.14, pu);
      uvs.push(along / 14, t);
    }
    if (i < pts.length - 1) {
      const row = rows + 1;
      for (let r = 0; r < rows; r++) {
        const a = i * row + r;
        index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cliffTex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  return m;
}
const CLIFF_NORTH_X = 18;
const CLIFF_SOUTH_X = -48;
function cliffLipLocal() {
  return cliffEdgePoints().filter(([u, v]) => -v < CLIFF_NORTH_X + 1 && u >= CAVE_MOUTH_Z).map(([u, v]) => [-v, u]);
}

const CAVE_DEF = {
  // 이 안에 카메라 초점이 들어오면 내부가 열린다
  area: { x: 0, z: 1.6, w: CAVE_RX * 2 + 0.6, d: CAVE_RZ + CAVE_MOUTH_Z - 0.4 },

  // 벼랑에 늘어선 큰 바위벽의 작은 아치 구멍. 표지판도 문도 없다
  exterior(k) {
    // 굴을 덮는 바위들
    // 공을 겹치던 외벽을 이어진 절벽 한 덩어리로
    CaveRock.cliff(k.group, -14, 14, CAVE_MOUTH_Z + 0.3, CAVE_MOUTH_W / 2 + 0.25);
    CaveRock.trim(k, CAVE_MOUTH_W, CAVE_MOUTH_Z);
    const w = CAVE_MOUTH_W;
    k.place(doorFrameGeo(w + 0.5, 4.75, true, 0.25, 0.3), mat(CAVE_ROCK), 0, 0, CAVE_MOUTH_Z, 1, 1, 1, inkBig);
    // 구멍 안쪽은 캄캄하지 않다 (참고 사진: 옅은 벽과 밝은 바닥). 다만 굴 안으로 들어갈수록 그늘지고,
    // 아치 안쪽 둘레에 두께가 보이며, 안에서 등불 빛이 은은히 새어 나온다
    k.paint(0, 0, CAVE_MOUTH_Z + 0.04, w + 0.1, 4.5, g => {
      const r = w / 2;
      const hole = (s = 1) => {
        g.beginPath();
        g.moveTo(-r * s, 0);
        g.lineTo(-r * s, 4.4 - r);
        g.arc(0, 4.4 - r, r * s, Math.PI, 0, true);
        g.lineTo(r * s, 0);
        g.closePath();
      };
      // 안쪽 벽: 위가 더 어둡다
      const wall = g.createLinearGradient(0, 4.4, 0, 0.8);
      wall.addColorStop(0, '#6d767c');
      wall.addColorStop(1, '#a9b0b4');
      hole();
      g.fillStyle = wall;
      g.fill();
      g.save();
      hole();
      g.clip();
      // 안쪽 바닥: 입구에서 멀어질수록 좁아지고 어두워진다
      const floor = g.createLinearGradient(0, 0, 0, 2);
      floor.addColorStop(0, '#c4c8ca');
      floor.addColorStop(1, '#8e9599');
      g.fillStyle = floor;
      g.beginPath();
      g.moveTo(-r, 0);
      g.lineTo(-0.5, 2);
      g.lineTo(0.5, 2);
      g.lineTo(r, 0);
      g.closePath();
      g.fill();
      // 안쪽 등불 빛
      const glow = g.createRadialGradient(0.7, 1.6, 0, 0.7, 1.6, 1.3);
      glow.addColorStop(0, 'rgba(255, 220, 140, .75)');
      glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
      g.fillStyle = glow;
      g.fillRect(-r, 0, w, 4.4);
      // 아치 두께: 둘레 안쪽의 그늘 띠
      g.lineWidth = 0.38;
      g.strokeStyle = 'rgba(70, 76, 82, .55)';
      hole(0.96);
      g.stroke();
      g.restore();
    });
    // 입구까지 닳은 길: 돌 턱 위에 옅게 다져진 흙빛
    // 눕힌 그림의 위쪽(y = 8)이 입구 쪽이다
    const path = k.paint(0, 0, 0, w + 1.6, 8, g => {
      for (let i = 0; i < 90; i++) {
        const y = Math.random() * 8, half = (w / 2 + 0.3) * (0.5 + y / 16);
        g.fillStyle = `rgba(175, 160, 136, ${0.04 + Math.random() * 0.05})`;
        g.beginPath();
        g.ellipse((Math.random() - 0.5) * half * 1.2, y, 0.5 + Math.random() * 0.4, 0.7 + Math.random() * 0.5, 0, 0, Math.PI * 2);
        g.fill();
      }
    });
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.09, CAVE_MOUTH_Z + 4.1);
  },

  yard(k) {
    // 굴 양옆으로 이어지는 바위벽. 위쪽은 어두운 윗바위
    CaveRock.cliff(k.group, 14, 37, CAVE_MOUTH_Z + 0.3, 0);
    CaveRock.cliff(k.group, -48, -14, CAVE_MOUTH_Z + 0.3, 0);
    // 바위벽 앞의 옅은 돌 턱
    const lip = cliffLipLocal();
    polygonFloor(k, [[CLIFF_NORTH_X, CAVE_MOUTH_Z - 0.2], ...lip, [CLIFF_SOUTH_X, CAVE_MOUTH_Z - 0.2]], '#dfe1dc', 0.05);
    const onLedge = (x, z) => z > CAVE_MOUTH_Z + 1 && z < 19.5 && x > CLIFF_SOUTH_X + 3 && x < CLIFF_NORTH_X - 3;
    const w = CLIFF_NORTH_X - CLIFF_SOUTH_X;
    const plane = k.paint(0, 0, 0, w, 44, g => {
      g.translate(-(CLIFF_NORTH_X + CLIFF_SOUTH_X) / 2, 44);
      for (let i = 0; i < 240; i++) {
        const x = rand(CLIFF_SOUTH_X, CLIFF_NORTH_X);
        const z = rand(0, 22);
        if (!onLedge(x, z)) continue;
        inkPath(g, [[x, -z], [x + rand(0.5, 1.2), -z + rand(-0.08, 0.08)]], 0.09);
      }
      // 돌 턱 가장자리의 굵은 끊긴 선
      for (let i = 0; i + 1 < lip.length; i += 2) inkPath(g, [[lip[i][0], -lip[i][1]], [lip[i + 1][0], -lip[i + 1][1]]], 0.2);
    });
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((CLIFF_NORTH_X + CLIFF_SOUTH_X) / 2, 0.07, 22);
    k.group.add(cliffSkin());
  },

  interior(k, api) {
    const outline = caveOutline();
    polygonFloor(k, outline, CAVE_FLOOR);
    k.box(0, -0.02, (CAVE_RZ + CAVE_MOUTH_Z) / 2 - 0.2, CAVE_MOUTH_W + 0.1, 0.1, CAVE_MOUTH_Z - CAVE_RZ + 0.6, CAVE_FLOOR, 0);
    floorMarks(k, CAVE_RX * 2, CAVE_RZ * 2, 0, insideCave);

    const rock = { h: 5, t: 0.7, color: '#c3c7c9', skin: 'caveStone', ink: 0 };
    api.walls(outline, rock);
    api.walls([[CAVE_MOUTH_W / 2, CAVE_RZ - 0.2], [CAVE_MOUTH_W / 2, CAVE_MOUTH_Z]], { ...rock, center: [0, 8] });
    api.walls([[-CAVE_MOUTH_W / 2, CAVE_RZ - 0.2], [-CAVE_MOUTH_W / 2, CAVE_MOUTH_Z]], { ...rock, center: [0, 8] });

    // 고정 모델 (원작 238·239화): 바닥에 편 이불 한 채(하치와레 것 하나뿐), 돌덩이 찻상과 초록 사발, 두 칸 서랍장
    // 이불: 요와 베개. 덮는 이불은 아래 움직이는 모델
    k.box(-4.2, 0.13, 1, 2.6, 0.26, 4.4, '#f4f0e6', 1);
    k.box(-4.2, 0.27, 1, 2.3, 0.03, 4.1, '#fbf9f3', 0);
    k.ball(-4.2, 0.4, -0.75, 0.85, 0.18, 0.45, '#fbfaf6');

    // 찻상: 네모나게 다듬은 돌덩이. 위에 김이 나는 초록 사발
    k.bigBox(1.4, 0.32, 0.6, 2.8, 0.64, 2, '#d6cfbf', 0.22);
    k.cyl(1.0, 0.8, 0.75, 0.38, 0.3, '#7fae7a', 1);
    k.ball(1.0, 0.93, 0.75, 0.33, 0.1, 0.33, '#e0b56a');
    for (const [dx, dz] of [[-0.1, 0], [0.1, 0.08], [0.02, -0.12]]) k.ball(1.0 + dx, 0.99, 0.75 + dz, 0.08, 0.05, 0.08, '#c98a4a');

    // 두 칸 서랍장: 위에 책과 붉은 상자
    k.box(-3.6, 0.95, -5, 2.8, 1.7, 1.4, '#b07d55', 2);
    for (const y of [0.55, 1.35]) {
      k.box(-3.6, y, -4.26, 2.4, 0.62, 0.08, '#9a6a45', 1);
      k.box(-3.6, y, -4.2, 0.5, 0.08, 0.08, '#6f4a30', 0);
    }
    for (let i = 0; i < 6; i++) k.box(-4.6 + i * 0.26, 2.12, -5, 0.22, 0.75, 0.9, ['#a9c9a4', '#9db9cc', '#c9b98a', '#a9c9a4', '#8fa9b8', '#d3c49a'][i], 1);
    k.box(-2.9, 1.98, -5, 0.9, 0.42, 0.8, '#d68a84', 1);

    // 벽 선반과 노란 꽃
    k.box(0.4, 3.3, -6.12, 3, 0.16, 0.7, '#d8c49a', 1);
    k.ball(0.4, 3.72, -6.12, 0.26, 0.42, 0.26, '#eef0ee');
    k.cyl(0.4, 4.3, -6.12, 0.03, 0.6, '#7d7458', 0);
    for (const [x, y] of [[0.2, 4.62], [0.42, 4.76], [0.62, 4.58]]) k.ball(x, y, -6.12, 0.17, 0.17, 0.1, '#e7ba4a');

    // 안쪽 부뚜막
    k.bigBox(3.6, 0.75, -4.3, 3, 1.5, 1.7, '#9c9a93', 0.3);
    k.cyl(3.6, 1.55, -4.3, 0.72, 0.14, '#6b6862', 1);

    // 부뚜막 옆 낮은 판자 선반: 그릇마다 금이 가 있다 (원작에서 되풀이되는 묘사)
    k.box(6.1, 0.85, -1.1, 0.8, 0.1, 2.4, '#b48a5f', 1);
    for (const z of [-2.1, -0.1]) k.box(6.1, 0.4, z, 0.7, 0.8, 0.1, '#9c7550', 1);
    const crack = (x, y, z, h) => {
      let px = 0;
      for (let i = 0; i < 3; i++) {
        const nx = (i % 2 ? 0.05 : -0.05);
        const seg = k.box(x - 0.005, y + h * (i / 3 - 0.33), z + (px + nx) / 2, 0.02, h / 3 + 0.02, 0.025, '#4a3230', 0);
        seg.rotation.x = (nx - px) * 6;
        px = nx;
      }
    };
    k.cyl(6.0, 0.98, -1.9, 0.3, 0.16, '#f3efe6', 1);
    crack(5.7, 0.98, -1.9, 0.16);
    k.cyl(6.0, 1.04, -1.2, 0.34, 0.04, '#e9e4d6', 1);
    k.cyl(6.0, 1.09, -1.2, 0.34, 0.04, '#e9e4d6', 1);
    k.cyl(6.0, 1.0, -0.4, 0.26, 0.2, '#a9c7d9', 1);
    crack(5.74, 1.0, -0.4, 0.2);
    // 문이 없어 기치기치가 자주 들어온다 → 입구 안쪽 벽에 사스마타를 세워 둔다
    const VPB = window.VillageProps && window.VillageProps.BUILD;
    if (VPB && VPB.w_sasumata_blue) {
      const sm = VPB.w_sasumata_blue();
      sm.rotation.x = -(Math.PI / 2 - 0.2);
      sm.position.set(4.35, 0.19, 4.6);
      sm.rotation.y = 0.9;
      sm.userData.caveSasumata = true;
      k.group.add(sm);
    }

    // 움직이는 모델: 덮는 이불. 평소에는 발치에 접혀 있다
    const FOLDED_Z = 1.3;
    const COVERED_Z = -0.2;
    api.dyn('futon:bed_lie', {
      x: -4.2, y: -0.15, z: CAVE_BED_Z, obj: 'futon', label: '이불',
      clips: {
        sleep(o, u, time) {
          const pull = Math.min(1, u * 80);
          const breath = 1 + 0.03 * Math.sin(time * 1.85);
          o.data.cover.scale.set(1, (0.5 + 0.5 * pull) * breath, 0.45 + 0.55 * pull);
          o.data.cover.position.z = FOLDED_Z + (COVERED_Z - FOLDED_Z) * pull;
        },
      },
      end(o) {
        o.data.cover.scale.set(1, 0.5, 0.45);
        o.data.cover.position.z = FOLDED_Z;
      },
    }, (kit, o) => {
      o.data.cover = kit.ball(0, 0.5, FOLDED_Z, 0.95, 1.55, 1.5, '#9cc4e2', 1);
      o.data.cover.scale.set(1, 0.5, 0.45);
    });

    // 움직이는 모델: 탁자 위의 물잔. 마시는 동안은 손에 들려 있다
    api.dyn('glass', {
      x: 0.5, y: 0.65, z: -0.1, obj: 'glass', label: '물잔',
      clips: { sip(o) { o.root.visible = false; } },
      end(o) { o.root.visible = true; },
    }, kit => {
      kit.cyl(0, 0.28, 0, 0.2, 0.56, '#e8f3f5', 1);
      kit.cyl(0, 0.4, 0, 0.16, 0.05, '#bfe3ef', 0);
    });

    // 움직이는 모델: 부뚜막의 냄비. 끓으면 뚜껑이 달각거린다
    api.dyn('pot', {
      x: 3.6, y: 1.62, z: -4.3, obj: 'pot', label: '냄비',
      clips: {
        cook(o, u, time) {
          const rattle = Math.max(0, Math.sin(time * 9));
          o.data.lid.position.y = 0.72 + rattle * 0.07;
          o.data.lid.rotation.z = Math.sin(time * 23) * 0.05;
          o.data.fire.run(time, true);
          runSteam(o.data.puffs, 0.3, 0.9, 0, time, true);
        },
      },
      idle(o) {
        o.data.lid.position.y = 0.72;
        o.data.lid.rotation.z = 0;
        o.data.fire.run(0, false);
        runSteam(o.data.puffs, 0.3, 0.9, 0, 0, false);
      },
    }, (kit, o) => {
      kit.cyl(0, 0.34, 0, 0.62, 0.68, '#5e5c58', 1);
      o.data.lid = kit.ball(0, 0.72, 0, 0.64, 0.14, 0.64, '#6f6c67', 1);
      // 냄비 바로 밑 아궁이: 부뚜막 앞면(냄비 기준 +z 0.85)에 둥근 아궁이 입구를 내고 그 안에서 장작불이 탄다
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#2a1d17' }));
      mouth.position.set(0, -1.42, 0.865);
      kit.group.add(mouth);
      kit.box(0, -1.44, 0.87, 0.86, 0.06, 0.06, '#6f6a63', 1);
      const under = new THREE.Group();
      under.position.set(0, -1.6, 0.62);
      kit.group.add(under);
      o.data.fire = makeFire(under, 0.22, 'wood');
      o.data.puffs = steamPuffs(kit, 4, 0.3, 0.9, 0);
    });

    // 움직이는 모델: 탁자 위의 작은 등불. 늘 은은하게 흔들린다
    // 찻상 위 사발에서 늘 김이 오른다 (원작 장면)
    api.dyn('bowlSteam', {
      x: 1.0, y: 1.0, z: 0.75,
      idle(o, time) { runSteam(o.data.puffs, 0, 0.1, 0, time, true); },
    }, (kit, o) => { o.data.puffs = steamPuffs(kit, 4, 0, 0.1, 0); });

    // 원작처럼 찻상 옆 바닥에 놓인 손등불
    api.dyn('lantern', {
      x: 3.4, y: 0, z: 1.5,
      idle(o, time) {
        const f = 0.9 + Math.sin(time * 5.3) * 0.06 + Math.sin(time * 13.1) * 0.04;
        o.data.flame.scale.set(f * 0.15, f * 0.2, f * 0.15);
        o.data.glow.material.opacity = 0.32 + f * 0.1;
      },
    }, (kit, o) => {
      kit.cyl(0, 0.06, 0, 0.26, 0.12, '#7f8a5a', 1);
      kit.cyl(0, 0.46, 0, 0.24, 0.7, '#fff0ae', 1).material = new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.6 });
      kit.cone(0, 0.8, 0, 0.3, 0.26, '#7f8a5a', 1);
      o.data.flame = kit.ball(0, 0.44, 0, 0.15, 0.2, 0.15, '#f7c35f', 0);
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 226, 150, .9)');
      grad.addColorStop(1, 'rgba(255, 226, 150, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      o.data.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.4 }));
      o.data.glow.scale.set(3.4, 3.4, 1);
      o.data.glow.position.y = 0.5;
      kit.group.add(o.data.glow);
    });
  },
};

window.ASSET_SOCKETS.cave = {
  enter_stand: [0, 5.6, 0, 0, 0],
  tea_sit_1: [1.4, 2.8, 0, 1.4, 0.6],
  tea_sit_2: [1.4, -1.6, 0, 1.4, 0.6],
  cook_stand: [3.6, -2.3, 0, 3.6, -4.3],
  study_stand: [-3.6, -3.2, 0, -3.6, -5],
  // 이불 위에 누운 자리. 시선은 발치 쪽
  bed_lie: [-4.2, CAVE_BED_Z, 0.22, -4.2, 5],
};

// 각자의 집 앞 자리 (집 안에 들어가 자는 사람들). 집 모양은 world-town.js의 cottage
for (const id of ['momongaHome', 'shisaHome', 'rakkoHome', 'kurimanjuHome', 'furuhonyaHome']) {
  window.ASSET_SOCKETS[id] = { door_front: [-2.6, 7.4, 0, -2.6, 5.5] };
}
window.ASSET_SOCKETS.usagi = { door_front: [0, 11.6, 0, 0, 9] };

/* ---------- 라멘 로 ---------- */

const RAMEN = { w: 18, d: 16, h: 7.6, wall: '#f4ead4', trim: '#7d6250', sign: '#f6d656' };
const RAMEN_SEATS = [-6, -3.6, -1.2, 1.2, 3.6];
const RAMEN_SEAT_Z = 1.75;
const RAMEN_COUNTER = { z: -0.15, depth: 1.5, h: 1.2 };

const RAMEN_DEF = {
  area: { x: 0, z: 0, w: RAMEN.w, d: RAMEN.d },

  exterior(k, api) {
    k.shop({
      w: RAMEN.w, d: RAMEN.d, h: RAMEN.h, wall: RAMEN.wall, roof: '#8d8f94', roofType: 'hip', rh: 4, trim: RAMEN.trim, base: '#8f8478',
      front: f => {
        f.sign(0, 5.75, 13, 1.7, '郎', RAMEN.sign, SIGN_INK);
        // 미닫이문: 손님이 다가가면 양쪽으로 열린다
        f.place(doorFrameGeo(4.4, 4.8, false), mat(RAMEN.trim), 0, 0, 0, 1, 1, 1, inkThin);
        const leaf = s => {
          const m = f.box(s * 1, 2.28, 0.1, 1.95, 4.5, 0.12, '#d8c29a', 1);
          f.paint(s * 1, 2.2, 0.17, 1.4, 1.5, g => {
            g.fillStyle = '#d6edf3';
            g.fillRect(-0.7, 0, 1.4, 1.5);
          });
          return m;
        };
        const left = leaf(-1);
        const right = leaf(1);
        api.door(0, RAMEN.d / 2, [[left, -1.7], [right, 1.7]]);
        f.noren(0, 4.7, 3.6, RAMEN.sign, '');
        f.win(-6, 3, 3.6, 2.6, { frame: RAMEN.trim, curtain: '#efe6d2' });
        f.win(6, 3, 3.6, 2.6, { frame: RAMEN.trim, curtain: '#efe6d2' });
        f.lantern(-3.2, 4.6, RAMEN.sign);
        f.lantern(3.2, 4.6, RAMEN.sign);
        f.blade(8.6, 5, '라멘', RAMEN.sign, SIGN_INK);
      },
    });
  },

  interior(k, api) {
    const W = RAMEN.w / 2 - 0.4;
    const D = RAMEN.d / 2 - 0.4;
    const DOOR = 2;
    k.box(0, -0.01, 0, W * 2 + 0.6, 0.1, D * 2 + 0.6, '#d9cfbd', 0);
    floorMarks(k, W * 2, D * 2, 0, () => true);
    // 벽: 앞벽은 문 자리를 비운다
    const wall = { h: 5.6, t: 0.5, color: '#f7efdd', skin: 'plaster', ink: 1 };
    api.walls([[-W, D], [-W, -D], [W, -D], [W, D]], wall);
    api.walls([[-W, D], [-DOOR, D]], wall);
    api.walls([[DOOR, D], [W, D]], wall);
    api.walls([[-DOOR, D], [DOOR, D]], { ...wall, h: 1, y0: 4.6, skin: null });
    // 벽 아래쪽 붉은 띠
    for (const [x, z, w, ry] of [[0, -D + 0.05, W * 2, 0], [-W + 0.05, 0, D * 2, Math.PI / 2], [W - 0.05, 0, D * 2, -Math.PI / 2]]) {
      const s = k.sub(x, z, ry);
      s.box(0, 1.1, 0, w, 0.32, 0.1, '#d6776a', 0);
    }

    // 고정 모델: 카운터와 의자, 주방, 벽 메뉴
    const c = RAMEN_COUNTER;
    // 카운터 동쪽 끝을 비워 주방으로 드나든다
    const COUNTER_W = W * 2 - 2.6;
    const COUNTER_X = -1.25;
    k.box(COUNTER_X, c.h / 2 - 0.1, c.z, COUNTER_W, c.h - 0.2, c.depth, '#c9604f', 2);
    k.box(COUNTER_X, c.h, c.z, COUNTER_W, 0.16, c.depth + 0.3, '#e7c98f', 2);
    // 카운터 안쪽 낮은 조리대: 면 솥, 그릇, 고명 통
    k.box(-1, 0.45, -1.28, 9.4, 0.9, 0.7, '#b4b8bc', 1);
    for (let i = 0; i < 3; i++) k.cyl(0.4 + i * 0.75, 1, -1.28, 0.26, 0.2, '#fffdf6', 1);
    for (let i = 0; i < 3; i++) {
      k.cyl(4.5 + i * 0.5, 1, -1.28, 0.2, 0.2, ['#9cc8a8', '#f3c64f', '#e6a15f'][i], 1);
    }
    RAMEN_SEATS.forEach(x => {
      k.cyl(x, 0.34, RAMEN_SEAT_Z, 0.1, 0.68, '#8f8c88');
      k.cyl(x, 0.68, RAMEN_SEAT_Z, 0.55, 0.12, '#d6776a', 1);
      k.cyl(x, 0.05, RAMEN_SEAT_Z, 0.42, 0.1, '#8f8c88');
    });
    // 주방
    k.box(0, -0.005, -4.6, W * 2, 0.08, 6, '#c9c4b6', 0);
    k.bigBox(-4.6, 1, -D + 1, 5, 2, 1.8, '#b4b8bc', 0.25);
    for (const x of [-6, -3.2]) {
      k.cyl(x, 2.55, -D + 1, 0.9, 1.1, '#d3d6da', 1);
      k.cyl(x, 3.12, -D + 1, 0.8, 0.04, '#efd98a', 0);
    }
    k.bigBox(4.4, 1, -D + 1, 5.6, 2, 1.8, '#b4b8bc', 0.25);
    for (let i = 0; i < 5; i++) k.cyl(2.4 + i * 1, 2.13, -D + 1, 0.42, 0.26, i % 2 ? '#9cc8a8' : '#fffdf6', 1);
    // 뒤 벽 선반과 메뉴
    k.box(3.6, 4, -D + 0.3, 6, 0.16, 0.6, '#a97c50', 1);
    for (let i = 0; i < 6; i++) k.cyl(1.2 + i * 1, 4.22, -D + 0.3, 0.3, 0.26, '#fffdf6', 1);
    const menu = k.sub(-3.4, -D + 0.05);
    menu.box(0, 4.3, 0.03, 5, 1.7, 0.08, '#f6d656', 1);
    menu.paint(0, 3.55, 0.09, 4.8, 1.5, g => {
      drawText(g, '라멘 900원', 0, 1.02, 4.4, 0.72, SIGN_INK);
      drawText(g, '마늘 넣을까요?', 0, 0.36, 4.4, 0.5, '#b5574f');
    });
    RamenKitchen.mount(k, api, c);
    // 입구 오른쪽 대기 의자
    k.box(5.2, 0.4, D - 1, 5, 0.18, 1.2, '#c9a57c', 1);
    for (const x of [7.2, 3.2]) k.box(x, 0.16, D - 1, 0.24, 0.32, 1, '#a98a66', 0);
    k.planter(W - 1.2, 4.5, '#f3a9bd');

    // 움직이는 모델: 식권 자판기
    api.dyn('vending', {
      x: -7.2, z: 5, ry: Math.PI / 2, obj: 'vending', label: '식권 자판기',
      clips: {
        buy(o, u, time) {
          // 고르고(버튼이 차례로 깜빡임) → 눌림(한 칸이 빠르게 점멸) → 덜컹 → 식권이 나온다
          const buttons = o.data.buttons;
          const pick = 2;
          buttons.forEach((b, i) => {
            let on = false;
            if (u < 0.42) on = Math.floor(time * 7) % buttons.length === i;
            else if (u < 0.68) on = i === pick && Math.floor(time * 16) % 2 === 0;
            else on = i === pick;
            b.material = on ? o.data.lit : o.data.dark;
          });
          if (u >= 0.68 && u < 0.92) {
            const k2 = (u - 0.68) / 0.24;
            const fall = 1 - k2;
            o.root.position.x = o.home.p.x + Math.sin(time * 58) * 0.05 * fall;
            o.root.rotation.z = Math.sin(time * 44) * 0.018 * fall;
          } else {
            o.root.position.x = o.home.p.x;
            o.root.rotation.z = 0;
          }
          const out = Math.max(0, Math.min(1, (u - 0.78) / 0.18));
          o.data.ticket.visible = out > 0;
          o.data.ticket.position.z = 0.72 + out * 0.5;
        },
      },
      idle(o, time) {
        o.data.ticket.visible = false;
        o.data.buttons.forEach((b, i) => { b.material = Math.floor(time * 1.2 + i) % 7 === 0 ? o.data.lit : o.data.dark; });
      },
    }, (kit, o) => {
      o.solid = true;
      kit.bigBox(0, 1.95, 0, 2.3, 3.9, 1.4, '#d3d6da', 0.2);
      kit.box(0, 4.05, 0.05, 2.1, 0.4, 1, RAMEN.sign, 1);
      kit.paint(0, 3.84, 0.57, 2, 0.42, g => drawText(g, '식권', 0, 0.21, 1.6, 0.4, SIGN_INK));
      kit.box(0, 3, 0.72, 1.9, 1.3, 0.05, '#fffdf4', 1);
      kit.paint(0, 2.42, 0.76, 1.7, 1.15, g => {
        drawText(g, '라멘', 0, 0.9, 1.4, 0.4, SIGN_INK);
        drawText(g, '900원', 0, 0.42, 1.4, 0.34, '#b5574f');
      });
      o.data.dark = new THREE.MeshBasicMaterial({ color: 0xb8bcc0 });
      o.data.lit = new THREE.MeshBasicMaterial({ color: 0xffd64a });
      o.data.buttons = [];
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(unitBox(), o.data.dark);
        b.position.set(-0.6 + (i % 3) * 0.6, 2.05 - Math.floor(i / 3) * 0.42, 0.74);
        b.scale.set(0.46, 0.28, 0.06);
        kit.group.add(b);
        o.data.buttons.push(b);
      }
      kit.box(0, 0.95, 0.72, 1.4, 0.5, 0.06, '#55585f', 0);
      o.data.ticket = kit.box(0, 1.05, 0.72, 0.7, 0.04, 0.6, '#fff4c2', 0);
      o.data.ticket.visible = false;
    });

    // 움직이는 모델: 자리마다 놓이는 라멘 그릇
    RAMEN_SEATS.forEach((x, i) => {
      const socket = `counter_sit_${i + 1}`;
      api.dyn(`bowl:${socket}`, {
        x, y: c.h + 0.08, z: c.z + 0.55, obj: 'bowl',
        clips: {
          serve(o, u, time) {
            // 주방 쪽에서 카운터를 따라 스르륵 밀려와 멈추고, 멈출 때 살짝 흔들린다
            const slide = Math.min(1, u / 0.55);
            const e = 1 - (1 - slide) ** 3;
            o.root.visible = true;
            RamenKitchen.fillBowl(o);
            o.root.position.z = o.home.p.z - 1.2 * (1 - e);
            o.root.rotation.z = slide >= 1 ? Math.sin(time * 26) * 0.05 * Math.max(0, 1 - (u - 0.55) * 5) : 0;
            runSteam(o.data.puffs, 0, 0.5, 0, time, true);
          },
          // 그릇은 카운터에 둔 채 젓가락으로 먹는다. 먹을수록 줄어든다
          eat(o, u, time) {
            o.root.visible = true;
            o.root.position.z = o.home.p.z;
            RamenKitchen.eatBowl(o, u);
            runSteam(o.data.puffs, 0, 0.5, 0, time, u < 0.6);
          },
          soup(o, u) {
            o.root.visible = true;
            RamenKitchen.soupBowl(o, u);
            runSteam(o.data.puffs, 0, 0.5, 0, 0, false);
          },
          done(o) {
            o.root.visible = true;
            o.data.noodles.visible = false;
            runSteam(o.data.puffs, 0, 0.5, 0, 0, false);
          },
        },
        idle(o, time, dt) {
          if (o.data.linger > 0) {
            o.data.linger -= dt;
            if (o.data.linger <= 0) o.root.visible = false;
          }
        },
        end(o, clip) {
          // 다 먹은 그릇은 잠시 뒀다가 치운다. 도중에 그만두면 바로 치운다
          o.root.visible = clip === 'done';
          o.data.noodles.visible = false;
          o.data.linger = clip === 'done' ? 3 : 0;
          runSteam(o.data.puffs, 0, 0.5, 0, 0, false);
        },
      }, (kit, o) => {
        RamenKitchen.customerBowl(kit, o);
        o.data.puffs = steamPuffs(kit, 3, 0, 0.5, 0);
        o.root.visible = false;
      });
    });

    // 움직이는 사람: 요로이씨가 손님 자리 앞으로 옮겨 다닌다
  },
};

function unitBox() {
  return cached('unitBoxPlain', () => new THREE.BoxGeometry(1, 1, 1));
}

window.ASSET_SOCKETS.ramenRo = {
  ticket_buy: [-5.1, 5, 0, -7.2, 5],
  queue_bench: [5.2, 6.6, 0.5, 5.2, 0],
  noodle_stand: [-3, -2.45, 0, -3, -1.28],
  topping_stand: [3.2, -2.45, 0, 3.2, -1.28],
  pass_stand: [-5.4, -2.45, 0, -5.4, 1],
};
RAMEN_SEATS.forEach((x, i) => { window.ASSET_SOCKETS.ramenRo[`counter_sit_${i + 1}`] = [x, RAMEN_SEAT_Z, 0.74, x, 0]; });

/* ---------- 빌더 교체: 이 장소들은 GLB 대신 안팎이 있는 건물로 ---------- */

for (const [id, def] of [['cave', CAVE_DEF], ['ramenRo', RAMEN_DEF]]) {
  if (window.GLB_MAP) delete window.GLB_MAP[id];
  if (window.GLB_PLACES) window.GLB_PLACES.delete(id);
  BUILDERS[id] = (k, p) => { window.Interiors.mount(k, p, def); };
}
