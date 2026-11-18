'use strict';

// 월드의 그림: 애니 배경화 문법(굵은 갈색 손그림 선, 수채 느낌 면, 둥근 형태)으로 건물과 식생을 만든다
const INK_WORLD = '#5a3b33';

/* ---------- 재질 ---------- */

const toonRampWorld = new THREE.DataTexture(new Uint8Array([205, 255]), 2, 1, THREE.RedFormat);
toonRampWorld.needsUpdate = true;

function canvasTexture(size, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
  }
  return tex;
}

// 수채화 얼룩이 진 종이
const paperTex = canvasTexture(256, (g, s) => {
  g.fillStyle = '#fff';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(190, 170, 150, ${rand(0.02, 0.06)})`;
    g.beginPath();
    g.ellipse(rand(0, s), rand(0, s), rand(14, 70), rand(10, 50), rand(0, 3), 0, Math.PI * 2);
    g.fill();
  }
});

// 돌벽: 불규칙한 금 선
function drawCracks(g, s, line, count = 26) {
  g.strokeStyle = line;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = s * 0.012;
  for (let i = 0; i < count; i++) {
    let x = rand(0, s);
    let y = rand(0, s);
    let a = rand(0, Math.PI * 2);
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      a += rand(-0.9, 0.9);
      x += Math.cos(a) * s * 0.07;
      y += Math.sin(a) * s * 0.07;
      g.lineTo(x, y);
    }
    g.stroke();
  }
}
const rockTex = canvasTexture(512, (g, s) => {
  g.fillStyle = '#fff';
  g.fillRect(0, 0, s, s);
  drawCracks(g, s, 'rgba(90, 59, 51, .8)');
});

// 초가 지붕: 위에서 아래로 흐르는 짚 결
const thatchTex = canvasTexture(512, (g, s) => {
  g.fillStyle = '#fff';
  g.fillRect(0, 0, s, s);
  g.lineCap = 'round';
  for (let i = 0; i < 240; i++) {
    g.strokeStyle = rand() < 0.5 ? 'rgba(130, 84, 40, .55)' : 'rgba(255, 236, 190, .6)';
    g.lineWidth = rand(2, 5);
    const x = rand(0, s);
    const y = rand(0, s);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rand(-5, 5), y + rand(16, 46));
    g.stroke();
  }
});

// 나뭇잎: 안쪽의 밝은 얼룩과 곡선 무늬
const leafTex = canvasTexture(512, (g, s) => {
  g.fillStyle = '#fff';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(255, 255, 240, .45)';
    g.beginPath();
    g.ellipse(rand(0, s), rand(0, s), rand(16, 46), rand(10, 26), rand(0, 3), 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(70, 90, 60, .75)';
  g.lineWidth = 6;
  for (let i = 0; i < 16; i++) {
    const x = rand(0, s);
    const y = rand(0, s);
    g.beginPath();
    g.arc(x, y, rand(10, 22), rand(0, 3), rand(3.6, 5));
    g.stroke();
  }
});

const matCache = new Map();
function mat(color, map = paperTex) {
  const key = `${color}|${map.uuid}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonRampWorld, map }));
  return matCache.get(key);
}

// 법선 방향으로 부풀린 뒷면으로 일정한 굵기의 손그림 선을 그린다. 인스턴싱과 안개도 지원한다
function makeInk(thickness, fog = true) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { color: { value: new THREE.Color(INK_WORLD) }, thickness: { value: thickness } },
    ]),
    vertexShader: `
      uniform float thickness;
      #include <fog_pars_vertex>
      void main() {
        vec3 objectNormal = normal;
        vec4 worldish = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          worldish = instanceMatrix * worldish;
          objectNormal = mat3(instanceMatrix) * objectNormal;
        #endif
        vec3 n = normalize(normalMatrix * objectNormal);
        vec4 mvPosition = modelViewMatrix * worldish;
        mvPosition.xyz += n * thickness;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 color;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
const inkBig = makeInk(0.1);
const inkThin = makeInk(0.05);
const inkTree = makeInk(0.09);

/* ---------- 둥근 도형 ---------- */

const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

// 모서리가 둥근 상자: 안쪽 상자에서 일정 거리로 밀어내고 법선도 함께 맞춘다
function roundBoxGeo(w, h, d, r) {
  return cached(`box${w}|${h}|${d}|${r}`, () => {
    const geo = new THREE.BoxGeometry(w, h, d, 10, 10, 10);
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const v = new THREE.Vector3();
    const inner = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      inner.set(
        Math.max(-w / 2 + r, Math.min(w / 2 - r, v.x)),
        Math.max(-h / 2 + r, Math.min(h / 2 - r, v.y)),
        Math.max(-d / 2 + r, Math.min(d / 2 - r, v.z)),
      );
      const n = v.clone().sub(inner);
      if (n.lengthSq() < 1e-8) n.fromBufferAttribute(nor, i);
      n.normalize();
      pos.setXYZ(i, inner.x + n.x * r, inner.y + n.y * r, inner.z + n.z * r);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    return geo;
  });
}
const ballGeo = new THREE.SphereGeometry(1, 28, 20);

function softLathe(key, points) {
  return cached(key, () => {
    const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
    return new THREE.LatheGeometry(curve.getPoints(24).map(p => new THREE.Vector2(Math.max(0, p.x), p.y)), 24);
  });
}
// 반지름 1, 높이 1, 가운데 원점. 위아래 모서리가 둥글다
const softCylGeo = softLathe('softCyl', [[0, -0.5], [0.82, -0.5], [1, -0.42], [1, 0.42], [0.82, 0.5], [0, 0.5]]);
// 반지름 1, 높이 1, 바닥 원점. 꼭대기가 둥근 뿔
const softConeGeo = softLathe('softCone', [[0, 0], [0.96, 0], [1, 0.06], [0.62, 0.48], [0.2, 0.92], [0.06, 1], [0, 1]]);

/* ---------- 손그림 그리기 도구 (단위: 월드, y 위쪽, 원점은 면의 바닥 가운데) ---------- */

function inkPath(g, points, width = 0.1, close = false) {
  g.strokeStyle = INK_WORLD;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  if (close) g.closePath();
  g.stroke();
}

function drawText(g, text, x, y, maxW, h, color) {
  g.save();
  g.translate(x, y);
  g.scale(1, -1);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = h * 0.72;
  g.font = `800 ${size}px "Malgun Gothic", sans-serif`;
  while (g.measureText(text).width > maxW && size > 0.1) {
    size *= 0.92;
    g.font = `800 ${size}px "Malgun Gothic", sans-serif`;
  }
  g.fillText(text, 0, 0);
  g.restore();
}

function drawBoard(g, x, y, w, h, text, bg, fg = INK_WORLD) {
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.2);
  g.fill();
  g.strokeStyle = INK_WORLD;
  g.lineWidth = 0.1;
  g.stroke();
  if (text) drawText(g, text, x, y, w * 0.88, h, fg);
}

// 아치형 나무 문: 세로 나뭇결과 둥근 손잡이
function drawDoor(g, x, w, h, color = '#c9a57c') {
  const arch = w / 2;
  g.beginPath();
  g.moveTo(x - w / 2, 0);
  g.lineTo(x - w / 2, h - arch);
  g.arc(x, h - arch, arch, Math.PI, 0, true);
  g.lineTo(x + w / 2, 0);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.strokeStyle = INK_WORLD;
  g.lineWidth = 0.1;
  g.stroke();
  inkPath(g, [[x, 0.05], [x, h - 0.1]], 0.07);
  for (let i = 0; i < 7; i++) {
    const lx = x + rand(-w * 0.4, w * 0.4);
    const ly = rand(0.3, h - arch - 0.2);
    inkPath(g, [[lx, ly], [lx, ly + rand(0.2, 0.5)]], 0.04);
  }
  g.fillStyle = '#e9d9a8';
  g.beginPath();
  g.arc(x + w * 0.28, h * 0.42, 0.13, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 0.06;
  g.stroke();
}

// 십자 창살 창문
function drawWindow(g, x, y, w, h) {
  g.fillStyle = '#dcebf0';
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, 0.18);
  g.fill();
  g.strokeStyle = INK_WORLD;
  g.lineWidth = 0.1;
  g.stroke();
  inkPath(g, [[x, y - h / 2], [x, y + h / 2]], 0.07);
  inkPath(g, [[x - w / 2, y], [x + w / 2, y]], 0.07);
}

/* ---------- 도형 키트: +z가 앞 ---------- */

const portals = [];
const NPC_SPOTS = [];

// 키트로 만든 물건은 크기(w·h·d)를 scale에 담아 둔다. 움직일 때 scale을 1 기준으로 덮어쓰면 수십 배로 부풀어 거대한 덩어리가 된다.
// 그래서 동작은 처음 scale에 비율을 곱해서 바꾼다: kitScale(m, 0.5) = 처음 크기의 절반, kitScale(m, 1, 0.3, 1) = 높이만 30%
function kitBase(m) { return m.userData.s0 || (m.userData.s0 = m.scale.clone()); }
function kitScale(m, x, y = x, z = x) { const b = kitBase(m); m.scale.set(b.x * x, b.y * y, b.z * z); return m; }
function makeKit(group, ox, oz, face) {
  const th = (face * Math.PI) / 2;
  const toWorld = (lx, lz) => [ox + lx * Math.cos(th) + lz * Math.sin(th), oz - lx * Math.sin(th) + lz * Math.cos(th)];
  const place = (geo, material, x, y, z, sx, sy, sz, ink) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    // 그림자는 벽과 지붕 같은 큰 덩어리만 드리운다
    m.castShadow = ink === inkBig;
    m.receiveShadow = true;
    if (ink) m.add(new THREE.Mesh(geo.userData.inkGeo || geo, ink));
    group.add(m);
    return m;
  };
  const inkOf = ink => (ink === 0 ? null : ink === 2 ? inkBig : inkThin);
  const kit = {
    group,
    toWorld,
    // ink: 0 없음, 1 얇은 선(기본), 2 굵은 선
    box: (x, y, z, w, h, d, c, ink = 1) => {
      const r = Math.min(0.3, Math.min(w, h, d) * 0.4);
      return place(roundBoxGeo(w, h, d, r), mat(c), x, y, z, 1, 1, 1, inkOf(ink));
    },
    bigBox: (x, y, z, w, h, d, c, r = 1) => place(roundBoxGeo(w, h, d, r), mat(c), x, y, z, 1, 1, 1, inkBig),
    ball: (x, y, z, rx, ry, rz, c, ink = 1) => place(ballGeo, mat(c), x, y, z, rx, ry, rz, inkOf(ink)),
    cyl: (x, y, z, r, h, c, ink = 1) => place(softCylGeo, mat(c), x, y, z, r, h, r, inkOf(ink)),
    cone: (x, y, z, r, h, c, ink = 1) => place(softConeGeo, mat(c), x, y, z, r, h, r, inkOf(ink)),
    rock: (x, y, z, rx, ry, rz, c) => {
      const tex = rockTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(4, 2);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return place(ballGeo, new THREE.MeshToonMaterial({ color: c, gradientMap: toonRampWorld, map: tex }), x, y, z, rx, ry, rz, inkBig);
    },
    thatch: (x, y, z, r, h, c = '#d8b673') => {
      const m = place(softConeGeo, mat(c, thatchTex), x, y, z, r, h, r, inkBig);
      place(ballGeo, mat(c, thatchTex), x, y + h * 0.98, z, r * 0.2, r * 0.22, r * 0.2, inkThin);
      place(softCylGeo, mat('#a97c50'), x, y + h * 0.84, z, r * 0.14, r * 0.08, r * 0.14, inkThin);
      return m;
    },
    // 앞면에 붙이는 손그림. draw는 y 위쪽, 바닥 가운데 원점 좌표로 그린다
    paint: (x, y, z, w, h, draw, ry = 0) => {
      const px = Math.min(56, 1400 / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * px);
      c.height = Math.ceil(h * px);
      const g = c.getContext('2d');
      g.translate(c.width / 2, c.height);
      g.scale(px, -px);
      draw(g);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      m.position.set(x, y + h / 2, z);
      m.rotation.y = ry;
      group.add(m);
      return m;
    },
    // 땅에 박힌 나무 푯말
    post: (x, z, text, bg = '#f1e2bb', fg = INK_WORLD) => {
      kit.box(x, 1, z, 0.28, 2, 0.28, '#b98f68');
      kit.box(x, 2.3, z, 3, 1, 0.22, bg);
      kit.paint(x, 1.8, z + 0.13, 3, 1, g => drawText(g, text, 0, 0.5, 2.7, 0.9, fg));
    },
    solidRect: (x, z, w, d) => {
      const [wx, wz] = toWorld(x, z);
      if (face % 2) addRect(wx, wz, d, w);
      else addRect(wx, wz, w, d);
    },
    toWorld,
    solidCircle: (x, z, r) => {
      const [wx, wz] = toWorld(x, z);
      addCircle(wx, wz, r);
    },
    // 인물 자리를 등록한다. 실제 모델은 npc.js 가 가까이 갔을 때 만든다
    // o: expression 표정, y 발 높이, ry 바라보는 방향, r 충돌 반경(0이면 없음), wander 돌아다니는 반경, over 프리셋 덮어쓰기, label 이름
    npc: (id, x, z, o = {}) => {
      group.updateWorldMatrix(true, false);
      const at = group.localToWorld(new THREE.Vector3(x, o.y || 0, z));
      let yaw = o.ry || 0;
      for (let g = group; g; g = g.parent) yaw += g.rotation.y;
      NPC_SPOTS.push({ ...o, id, x: at.x, y: at.y, z: at.z, ry: yaw, room: kit.roomId || null });
      const preset = characterEntry(id).preset;
      const r = o.r !== undefined ? o.r : preset.bodyW * preset.scale;
      if (r > 0 && !o.wander) addCircle(at.x, at.z, r);
    },
    // 회색 아이: 마을의 다른 주민
    kid: (x, z, color = '#aeb6bd', y = 0) => {
      kit.ball(x, y + 0.5, z, 0.5, 0.5, 0.46, color);
      kit.ball(x, y + 1.12, z, 0.62, 0.52, 0.54, color);
      kit.ball(x - 0.36, y + 1.58, z, 0.12, 0.13, 0.09, color);
      kit.ball(x + 0.36, y + 1.58, z, 0.12, 0.13, 0.09, color);
      kit.ball(x - 0.2, y + 1.18, z + 0.52, 0.06, 0.07, 0.02, '#2b1b1b', 0);
      kit.ball(x + 0.2, y + 1.18, z + 0.52, 0.06, 0.07, 0.02, '#2b1b1b', 0);
    },
    portal: (x, z, r, label, to) => {
      const [wx, wz] = toWorld(x, z);
      portals.push({ x: wx, z: wz, r, label, to, room: kit.roomId || null });
    },
    place,
  };
  return installBuildingTools(kit);
}

/* ---------- 장소 ---------- */

function caveMouth(k, r, stone) {
  k.rock(0, 0, 0, r, r * 0.92, r, stone);
  k.ball(0, r * 0.3, r * 0.76, r * 0.42, r * 0.52, r * 0.3, '#2c1f1b', 2);
  k.rock(-r * 0.86, 0, r * 0.45, r * 0.46, r * 0.42, r * 0.46, stone);
  k.rock(r * 0.9, 0, r * 0.3, r * 0.52, r * 0.5, r * 0.52, stone);
  k.solidCircle(0, 0, r * 0.92);
}
function steam(k, x, y, z) {
  for (let i = 0; i < 3; i++) k.ball(x + i * 0.2 - 0.2, y + i * 0.8, z, 0.4 + i * 0.12, 0.34 + i * 0.1, 0.4 + i * 0.12, '#fbfbf6', 0);
}
function monster(k, x, z, c, s) {
  k.ball(x, 1.6 * s, z, 1.8 * s, 1.6 * s, 1.6 * s, c, 2);
  k.paint(x, 0.9 * s, z + 1.62 * s, 2.6 * s, 1.5 * s, g => {
    for (const side of [-1, 1]) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(side * 0.62 * s, 0.95 * s, 0.33 * s, 0.36 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2b1b1b';
      g.beginPath();
      g.ellipse(side * 0.62 * s, 0.9 * s, 0.15 * s, 0.18 * s, 0, 0, Math.PI * 2);
      g.fill();
    }
    inkPath(g, [[-0.5 * s, 0.32 * s], [0, 0.26 * s], [0.5 * s, 0.32 * s]], 0.1 * s);
  });
  k.solidCircle(x, z, 1.7 * s);
}
function swanBoat(k, x, z) {
  k.ball(x, 0.7, z, 2.6, 1.1, 4.4, '#fffdf6', 2);
  const neck = k.cyl(x, 2.5, z + 3.5, 0.42, 2.8, '#fffdf6');
  neck.rotation.x = 0.25;
  k.ball(x, 4, z + 3.9, 0.72, 0.66, 0.72, '#fffdf6');
  k.cone(x, 3.92, z + 4.4, 0.26, 0.7, '#eeb07a').rotation.x = Math.PI / 2;
}
function bench(k, x, z) {
  k.box(x, 0.62, z, 3.8, 0.28, 1.2, '#c9a57c');
  k.box(x - 1.45, 0.3, z, 0.3, 0.6, 1, '#a98a66');
  k.box(x + 1.45, 0.3, z, 0.3, 0.6, 1, '#a98a66');
  k.solidRect(x, z, 3.8, 1.2);
}

// 땅에 눕힌 손그림. draw(g, P)에서 P(x, z)가 장소 좌표를 그림 좌표로 바꾼다
function groundPaint(k, size, y, draw) {
  const m = k.paint(0, 0, 0, size, size, g => draw(g, (x, z) => [x, size / 2 - z]));
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, y, 0);
  return m;
}

const BUILDERS = {
  stage(k) {
    k.bigBox(0, 0.8, 0, 13, 1.6, 8, '#d3ad82', 0.5);
    k.solidRect(0, 0, 13, 8);
    // 파자마 파티즈는 마을 주민이 되어 공연 날에만 무대에 선다 (ecology.js)
  },
  cave(k) {
    // 언덕 아래의 자연 동굴. 표지판도 문도 없고, 꾸미지 않는다
    k.rock(0, 0, -10, 24, 15, 13, '#c6bfae');
    k.solidCircle(0, -10, 13);
    k.solidCircle(-13, -10, 8);
    k.solidCircle(13, -10, 8);
    caveMouth(k, 10, '#b5ae9e');
    k.portal(0, 10.6, 3.5, '동굴 들어가기', { room: 'cave' });
  },
  usagi(k) {
    caveMouth(k, 9.5, '#9d968c');
    // 암호를 외치면 열리는 목제 문
    k.bigBox(0, 2.4, 8.5, 4.4, 4.8, 1, '#7d6a5c', 0.5);
    k.paint(0, 0, 9.04, 4, 4.8, g => drawDoor(g, 0, 3.4, 4.5, '#a58a6e'));
    k.solidRect(0, 8.5, 4.4, 1);
    k.portal(0, 10.2, 3, '문 앞에서 암호 외치기', { room: 'usagi' });
    for (const [x, z] of [[-3, 11], [3.5, 12]]) k.ball(x, 0.25, z, 0.3, 0.38, 0.3, '#b08a5e');
  },
  statue(k) {
    k.box(0, 0.6, 0, 3.4, 1.2, 3.4, '#bcb7ad');
    k.ball(0, 2.7, 0, 1.6, 1.5, 1.4, '#c9c5bb', 2);
    [[-0.6, 0.3], [0, 0], [0.6, -0.3]].forEach(([x, tilt]) => {
      k.cyl(x, 4.5, 0, 0.1, 1, '#c9c5bb').rotation.z = tilt;
    });
    k.solidCircle(0, 0, 2.4);
  },
  shrine(k) {
    const red = '#d6776a';
    k.cyl(-4, 3.3, 15, 0.42, 6.6, red, 2);
    k.cyl(4, 3.3, 15, 0.42, 6.6, red, 2);
    k.box(0, 6.9, 15, 11, 0.55, 0.8, '#5a4a44', 2);
    k.box(0, 5.7, 15, 9, 0.42, 0.5, red, 2);
    k.solidCircle(-4, 15, 0.5);
    k.solidCircle(4, 15, 0.5);
    k.bigBox(0, 0.7, 0, 16, 1.4, 11, '#d9c6a2', 0.4);
    k.bigBox(0, 4.3, 0, 11, 6, 8, red, 0.7);
    k.ball(0, 7.6, 0, 9, 2.2, 6.4, '#6b5b54', 2);
    k.paint(0, 1.4, 4.04, 9, 5.4, g => {
      drawDoor(g, 0, 3.4, 4, '#a4574b');
    });
    k.solidRect(0, 0, 16, 11);
    // 오카메 축제의 불과 회색 아이들
    k.cyl(0, 0.3, 9.5, 1.2, 0.6, '#a58a6e');
    k.cone(0, 0.5, 9.5, 0.95, 2, '#f3b672', 0);
    k.solidCircle(0, 9.5, 1.3);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.kid(Math.cos(a) * 3.8, 9.5 + Math.sin(a) * 3.8);
    }
  },
  rice(k) {
    // 땅에 묻힌 커다란 밥솥. 갓 지은 밥이 다시 솟는다
    k.cyl(0, 1, 0, 5.6, 2, '#8c8680', 2);
    k.ball(0, 2, 0, 5, 3, 5, '#fffef7', 2);
    k.solidCircle(0, 0, 5.8);
    k.cyl(8.6, 0.2, 1.6, 4, 0.4, '#928c86', 2);
    k.solidCircle(8.6, 1.6, 4);
    for (const [x, z] of [[-3.4, 6.6], [1.8, 7.2]]) k.ball(x, 0.3, z, 0.46, 0.34, 0.46, '#fffef7');
  },
  sausage(k) {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + rand(-0.2, 0.2);
      const d = rand(6, 13);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = rand(8, 13);
      k.cyl(x, h / 2, z, 1.05, h, '#efb2a4', 2);
      k.cyl(x, h + 0.14, z, 1.14, 0.36, '#dfd07a');
      k.solidCircle(x, z, 1.2);
    }
  },
  castella(k) {
    k.bigBox(0, 4.4, 0, 24, 8.8, 14, '#f6d986', 0.7);
    k.box(0, 9, 0, 24.2, 0.9, 14.2, '#c0966a', 2);
    k.box(0, 0.4, 0, 24.2, 0.8, 14.2, '#c0966a', 2);
    k.solidRect(0, 0, 24, 14);
    // 숲에서 마주친 키메라
    k.npc('anoko', -9, 11, { wander: 4 });
  },
  ramune(k) {
    // 왼쪽: 돌 샘에 꽂힌 커다란 라무네병 (유리구슬이 목에 걸려 있다)
    k.cyl(-7, 0.4, 0, 4.2, 0.8, '#d6cdbc', 2);
    k.cyl(-7, 0.84, 0, 3.6, 0.08, '#8ed4ee', 0);
    k.cyl(-7, 2.7, 0, 1.15, 3.4, '#9ed8ec', 2);
    k.ball(-7, 4.45, 0, 1.15, 0.82, 1.15, '#aee0f0', 2);
    k.cyl(-7, 5.45, 0, 0.56, 1.2, '#bfe6f3', 2);
    k.cyl(-7, 6.1, 0, 0.68, 0.24, '#eefaff', 1);
    k.ball(-7, 5.02, 0, 0.44, 0.44, 0.44, '#f4feff', 1);
    for (const [x, y, z, r] of [[-8.3, 1.5, 0.9, 0.22], [-6, 2.6, -0.9, 0.16], [-7.7, 3.3, -0.7, 0.13], [-6.2, 1.2, 1.1, 0.18]]) k.ball(x, y, z, r, r, r, '#eafcff', 0);
    k.solidCircle(-7, 0, 4.2);
    // 오른쪽: 큰 접시에 산처럼 솟은 케첩밥. 밥알이 보이게 낱알을 덮고, 꼭대기에 케첩을 지그재그로 뿌린다
    k.cyl(6, 0.28, 0, 5.8, 0.56, '#fff6e6', 2);
    k.ball(6, 1.7, 0, 4.7, 2.9, 4.7, '#ec9a6e', 2);
    for (let i = 0; i < 90; i++) {
      // 반구 위에 고르게 흩은 낱알 (황금각)
      const t = (i + 0.5) / 90, phi = Math.acos(1 - t * 0.98), th = i * 2.39996;
      const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
      const g = k.ball(6 + nx * 4.62, 1.7 + ny * 2.86, nz * 4.62, 0.26, 0.14, 0.16, i % 3 ? '#f6b48c' : '#e48a5e', 0);
      g.rotation.set(phi * 0.6, th, 0);
    }
    for (const [x, z, c] of [[4.4, 1.6, '#7fbf5f'], [7.6, -1.2, '#7fbf5f'], [5.2, -2.4, '#f3d36b'], [8.2, 1.9, '#f3d36b'], [3.6, -0.6, '#7fbf5f']]) {
      const r2 = ((x - 6) ** 2 + z * z) / 4.7 ** 2;
      k.ball(x, 1.7 + 2.9 * Math.sqrt(Math.max(0, 1 - r2)), z, 0.22, 0.18, 0.22, c, 0);
    }
    // 케첩 지그재그: 꼭대기를 가로지르는 굵은 줄 다섯 토막
    const zig = [[4.2, -1.6], [5.2, 1.6], [6.2, -1.6], [7.2, 1.6], [8.2, -1.6]];
    for (let i = 0; i + 1 < zig.length; i++) {
      const [ax, az] = zig[i], [bx, bz] = zig[i + 1];
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.hypot(bx - ax, bz - az);
      const r2 = ((mx - 6) ** 2 + mz * mz) / 4.7 ** 2;
      const seg = k.ball(mx, 1.66 + 2.9 * Math.sqrt(Math.max(0, 1 - r2)), mz, len / 2 + 0.2, 0.12, 0.3, '#d8392f', 1);
      seg.rotation.y = -Math.atan2(bz - az, bx - ax);
    }
    k.solidCircle(6, 0, 5.8);
  },
  misoBank(k) {
    // 숲 사이로 굽이치는 작은 된장국 물줄기. 가운데 징검돌로 건넌다
    const bend = x => Math.sin(x * 0.2) * 0.9;
    const width = x => 2.7 * Math.min(1, (15 - Math.abs(x)) / 4 + 0.35);
    for (let x = -14; x <= 14; x += 1.2) {
      k.cyl(x, 0.03, bend(x), width(x) + 1, 0.05, '#dfcfae', 0);
      k.ball(x, 0.05, bend(x) + (Math.round(x) % 2 ? 1 : -1) * (width(x) + 0.75), 0.42, 0.2, 0.34, '#c9c1ad');
    }
    for (let x = -14; x <= 14; x += 1.2) k.cyl(x, 0.08, bend(x), width(x), 0.05, '#d6a463', 0);
    // 국물 위 기름기 도는 옅은 무늬
    for (let x = -12; x <= 12; x += 2.6) k.ball(x, 0.11, bend(x) + Math.sin(x * 1.7) * 0.9, 0.7, 0.02, 0.35, '#e8c38c', 0);
    // 건더기
    [[-9, 0.5], [-5.4, -0.8], [5.6, 0.7], [9.4, -0.5], [-11.6, 0.2], [12, 0.4]].forEach(([x, z], i) => {
      if (i % 2) k.ball(x, 0.15, bend(x) + z, 0.5, 0.08, 0.32, '#5d8a55');
      else k.box(x, 0.17, bend(x) + z, 0.62, 0.16, 0.62, '#f6efdf', 0);
    });
    // 징검돌
    for (const z of [-2.1, -0.9, 0.3, 1.5, 2.6]) k.cyl(0, 0.13, z, 0.82, 0.16, '#cfc8b8', 1);
    // 국자 걸이
    k.cyl(-4.2, 0.8, 5, 0.09, 1.6, '#a97c50', 1);
    k.box(-4.2, 1.6, 4.65, 0.12, 0.08, 0.8, '#a97c50', 0);
    k.ball(-4.2, 1.4, 4.2, 0.26, 0.14, 0.26, '#a97c50');
    for (let x = -14; x <= 14; x += 1.6) if (Math.abs(x) > 2) k.solidCircle(x, bend(x), width(x) * 0.8);
  },
  wilds(k) {
    // 원작 토벌 현장: 풀이 듬성한 밝은 흙바닥, 짧은 빗금 자국, 가장자리의 둥근 덤불. 괴물이 할퀸 자국과 발자국이 남아 있다
    k.cyl(0, 0.03, 0, 30, 0.05, '#e6d8ad', 0);
    groundPaint(k, 60, 0.08, (g, P) => {
      // 흙바닥의 짧은 빗금 (원작 배경처럼 두세 개씩 묶어서)
      for (let i = 0; i < 260; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 28;
        const [x, y] = P(Math.cos(a) * r, Math.sin(a) * r);
        const n = 2 + (i % 2);
        for (let j = 0; j < n; j++) inkPath(g, [[x + j * 0.32, y], [x + j * 0.32 + 0.55, y + 0.05]], 0.07);
      }
      // 괴물 할퀸 자국: 휜 선 세 줄
      for (const [cx, cz, rot] of [[-8, 6, 0.4], [9, -6, -0.7], [3, 13, 1.2], [-12, -4, 2.2], [15, 4, -0.2]]) {
        for (let j = -1; j <= 1; j++) {
          const pts = [];
          for (let t = 0; t <= 6; t++) {
            const u = t / 6 - 0.5;
            const lx = u * 3.4, lz = j * 0.5 + Math.sin(u * 2.4) * 0.5;
            pts.push(P(cx + lx * Math.cos(rot) - lz * Math.sin(rot), cz + lx * Math.sin(rot) + lz * Math.cos(rot)));
          }
          inkPath(g, pts, 0.16);
        }
      }
      // 큰 괴물 발자국: 둥근 발바닥과 발가락 셋
      g.fillStyle = 'rgba(150, 128, 92, .45)';
      for (const [x, z, a] of [[-2, -10, 0.3], [0.5, -13, 0.3], [-1.2, -16, 0.3], [6, 2, -1.1], [9, 3.4, -1.1]]) {
        const [px, py] = P(x, z);
        g.beginPath(); g.ellipse(px, py, 0.9, 0.7, a, 0, Math.PI * 2); g.fill();
        for (const s of [-1, 0, 1]) { g.beginPath(); g.ellipse(px + Math.cos(a + 1.57 + s * 0.6) * 1.15, py + Math.sin(a + 1.57 + s * 0.6) * 1.15, 0.28, 0.36, a, 0, Math.PI * 2); g.fill(); }
      }
    });
    // 바위: 결이 있는 둥근 돌 무더기
    const rocks = [[6.5, 2.4, 1.4], [-6.8, 3.4, 1.7], [2.2, -7.4, 1.5], [-3, 7.6, 1.2], [21, -2, 2], [-22, 3.6, 2.2], [-7.5, -20, 1.9], [8.5, 20.5, 1.8]];
    for (const [x, z, r] of rocks) {
      k.rock(x, r * 0.3, z, r, r * 0.72, r * 0.86, '#b7b1a3');
      k.rock(x + r * 0.75, r * 0.12, z + r * 0.45, r * 0.5, r * 0.4, r * 0.44, '#c4beb0');
      k.solidCircle(x, z, r);
    }
    // 풀 포기: 흙바닥 사이 군데군데
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996, r = 4 + ((i * 7) % 23);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      for (const [dx, h] of [[-0.18, 0.55], [0, 0.75], [0.18, 0.5]]) {
        const c = k.cone(x + dx, 0, z, 0.1, h, i % 3 ? '#8fbf6e' : '#a4cc7e', 0);
        c.rotation.z = dx * 1.6;
      }
    }
    // 마른 나무
    [[-19, -12], [19, 11], [16, -19], [-13, 21]].forEach(([x, z], i) => {
      k.cyl(x, 2.4, z, 0.42, 4.8, '#7d6250', 2);
      k.box(x + (i % 2 ? 1 : -1), 3.5, z, 2.2, 0.26, 0.26, '#7d6250', 1);
      k.box(x, 4.3, z + (i % 2 ? -0.8 : 0.8), 0.26, 0.26, 1.8, '#7d6250', 1);
      k.solidCircle(x, z, 0.8);
    });
    // 괴물이 파헤친 흙더미: 둥근 둔덕과 흩어진 흙덩이
    [[4.5, -3], [-4, -3.4], [0.5, 4.2]].forEach(([x, z]) => {
      k.ball(x, 0.15, z, 1.5, 0.5, 1.2, '#c9b282');
      for (let j = 0; j < 5; j++) { const a = j * 1.3; k.ball(x + Math.cos(a) * 2, 0.1, z + Math.sin(a) * 1.7, 0.28, 0.18, 0.24, '#bba273', 0); }
    });
    // 가장자리의 둥근 덤불 (원작 배경의 초록 덤불)과 열매
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      const x = Math.cos(a) * 26.6, z = Math.sin(a) * 26.6;
      k.ball(x, 0.9, z, 1.7, 1.2, 1.5, '#8fbf72');
      k.ball(x + 1.1, 0.7, z + 0.6, 1.1, 0.85, 1, '#9fcb80');
      if (i % 2) for (const [dx, dy, dz] of [[0.5, 1.6, 0.9], [-0.6, 1.4, 1], [0.1, 1.9, 0.4]]) k.ball(x + dx, dy, z + dz, 0.15, 0.15, 0.15, '#d9745a');
    }
    // 토벌 구역 표시: 말뚝과 새끼줄
    const stakes = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.5;
      if (i === 7) continue; // 들어가는 길
      const x = Math.cos(a) * 29, z = Math.sin(a) * 29;
      k.cyl(x, 0.7, z, 0.16, 1.4, '#a07c56', 1);
      stakes.push([x, z, a]);
    }
    for (let i = 0; i + 1 < stakes.length; i++) {
      const [ax, az] = stakes[i], [bx, bz] = stakes[i + 1];
      if (Math.hypot(bx - ax, bz - az) > 20) continue;
      const rope = k.box((ax + bx) / 2, 1.2, (az + bz) / 2, Math.hypot(bx - ax, bz - az), 0.07, 0.07, '#d8c08a', 0);
      rope.rotation.y = -Math.atan2(bz - az, bx - ax);
    }
    k.post(2.4, 28.6, '야생지대');
  },
  pond(k) {
    k.cyl(0, 0.04, 0, 15.8, 0.08, '#efe2b8', 2);
    k.cyl(0, 0.1, 0, 14, 0.06, '#b4e2f0', 0);
    k.solidCircle(0, 0, 13.4);
  },
  weeding(k) {
    // 자격 등급이 오를수록 뽑을 수 있는 구역이 넓어진다
    const grades = [[28, '#bfe2a4', '1급'], [19, '#b2da96', '3급'], [10, '#a7d38a', '5급']];
    grades.forEach(([r, color, text], i) => {
      k.cyl(0, 0.04 + i * 0.02, 0, r, 0.05, color, 0);
      k.post(r - 2.4, 0, text);
    });
    k.npc('yoroi-grass', -5, -4.4);
    k.box(-5, 0.7, -1.4, 4, 1.4, 2, '#c9a57c');
    k.solidRect(-5, -1.4, 4, 2);
    for (let i = 0; i < 46; i++) {
      const a = rand(0, Math.PI * 2);
      const d = Math.sqrt(rand()) * 26;
      const danger = rand() < 0.08;
      k.ball(Math.cos(a) * d, 0.3, Math.sin(a) * d, rand(0.45, 0.7), rand(0.4, 0.7), rand(0.45, 0.7), danger ? '#bda3c8' : '#93c97c');
    }
  },
  hunt(k) {
    // 전용 경기장은 없다. 괴이가 나타나는 야외가 곧 현장이다
    monster(k, 0, -2, '#8f84a3', 2);
    monster(k, -11, 6, '#a58a84', 1.1);
    monster(k, 11, 5, '#86a591', 1.2);
    k.npc('rakko', 0, 8, { expression: 'r-serious', ry: Math.PI });
    for (const [x, z] of [[-5, 11], [6, 12]]) {
      k.cyl(x, 1.4, z, 0.09, 2.8, '#e8a4bd');
      k.cone(x, 2.8, z, 0.34, 0.5, '#e8a4bd');
    }
  },
  antlion(k) {
    // 개미지옥: 둘레가 솟은 모래 깔때기. 안쪽 비탈에 흘러내린 자국, 바닥 구멍에서 큰 턱이 들락날락한다
    const prof = [[0.9, 0.08], [1.6, 0.18], [3, 0.55], [5, 1.05], [7, 1.5], [8.4, 1.72], [9.3, 1.6], [10.2, 0.95], [11, 0.25], [11.4, 0.04]];
    const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
    // 가운데로 갈수록 그늘져 깊어 보이게: 반지름에 따라 색을 바꾼다
    const col = [], lo = new THREE.Color('#a8864f'), hi = new THREE.Color('#efdcab'), tmpc = new THREE.Color();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getZ(i)); const u = Math.min(1, Math.max(0, (r - 0.9) / 7.6)); tmpc.copy(lo).lerp(hi, Math.pow(u, 0.7)); col.push(tmpc.r, tmpc.g, tmpc.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const sand = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, side: THREE.DoubleSide }));
    sand.receiveShadow = true;
    k.group.add(sand);
    // 비탈을 타고 흘러내린 모래 줄무늬
    const streak = new THREE.MeshBasicMaterial({ color: '#9c7c4c', transparent: true, opacity: 0.55 });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + (i % 2) * 0.05;
      const r0 = 2.2 + (i % 3) * 0.4, r1 = 7.6 + (i % 4) * 0.3;
      const pts = [];
      for (let t = 0; t <= 6; t++) {
        const r = r1 + (r0 - r1) * (t / 6);
        let y = 0;
        for (let j = 0; j + 1 < prof.length; j++) if (r >= prof[j][0] && r <= prof[j + 1][0]) { const u = (r - prof[j][0]) / (prof[j + 1][0] - prof[j][0]); y = prof[j][1] + (prof[j + 1][1] - prof[j][1]) * u; }
        pts.push(new THREE.Vector3(Math.cos(a + t * 0.03) * r, y + 0.03, Math.sin(a + t * 0.03) * r));
      }
      k.group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.05, 4), streak));
    }
    // 테두리 먹선
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.06, 4, 64), new THREE.MeshBasicMaterial({ color: '#5a3b33' }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.74; k.group.add(rim);
    // 바닥 구멍과 큰 턱 (턱은 springs.js가 움직인다)
    k.cyl(0, 0.1, 0, 1.1, 0.06, '#3b2c22', 0);
    const jaws = new THREE.Group(); jaws.name = 'antlionJaws'; jaws.position.y = 0.05; jaws.scale.setScalar(1.7);
    for (const s of [-1, 1]) {
      const pts = [[0, 0, 0], [s * 0.25, 0.5, 0], [s * 0.45, 1.0, 0.1], [s * 0.3, 1.35, 0.2], [s * 0.02, 1.45, 0.25]].map(p => new THREE.Vector3(...p));
      const jaw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.09, 6), new THREE.MeshToonMaterial({ color: '#6b4a34' }));
      const ink = new THREE.Mesh(jaw.geometry, new THREE.MeshBasicMaterial({ color: '#3a2620', side: THREE.BackSide })); ink.scale.setScalar(1.04); jaw.add(ink);
      jaw.position.x = s * 0.18; jaw.userData.side = s; jaws.add(jaw);
    }
    k.group.add(jaws);
    // 빠졌던 이가 떨어뜨린 사스마타: 자루가 비탈에 반쯤 묻히고 U자 머리가 위를 향한다
    const sm = new THREE.Group();
    sm.position.set(5.4, 1.15, 1.4);
    sm.rotation.set(0.55, 0.4, 0.3);
    const smk = makeKit(sm, 0, 0, 0);
    smk.cyl(0, 0, 0, 0.09, 3, '#f2b8c6', 1);
    smk.box(0, 1.55, 0, 1.1, 0.14, 0.14, '#bdb9b3', 1);
    for (const x of [-0.5, 0.5]) smk.box(x, 1.9, 0, 0.14, 0.75, 0.14, '#bdb9b3', 1);
    k.group.add(sm);
    k.solidCircle(0, 0, 3);
  },
  hole(k) {
    // 길가에 갑자기 난 구멍: 둘레가 들쭉날쭉하게 패고 흙덩이가 튀어 있다. 안은 깊어서 가운데로 갈수록 캄캄하다
    groundPaint(k, 9, 0.07, (g, P) => {
      const edge = [];
      for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; const r = 2.6 + Math.sin(a * 3 + 1) * 0.25 + Math.sin(a * 7) * 0.12; edge.push([Math.cos(a) * r, Math.sin(a) * r]); }
      // 파헤쳐진 흙 둘레
      g.fillStyle = '#a8865f';
      g.beginPath(); edge.forEach(([x, z], i) => { const [px, py] = P(x * 1.35, z * 1.35); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill();
      // 구멍 속: 흙벽에서 어둠으로
      const grd = g.createRadialGradient(0, 4.5, 0.2, 0, 4.5, 2.7);
      grd.addColorStop(0, '#0d0907'); grd.addColorStop(0.55, '#1f1612'); grd.addColorStop(0.85, '#4a3426'); grd.addColorStop(1, '#6e5038');
      g.fillStyle = grd;
      g.beginPath(); edge.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill();
      // 흙벽의 층 자국
      g.strokeStyle = 'rgba(120, 90, 62, .7)'; g.lineWidth = 0.05;
      for (const s of [0.86, 0.72]) { g.beginPath(); edge.forEach(([x, z], i) => { const [px, py] = P(x * s, z * s); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.stroke(); }
      inkPath(g, edge.map(([x, z]) => P(x, z)), 0.1, true);
      // 둘레 흙의 짧은 빗금
      for (let i = 0; i < 18; i++) { const a = i * 0.35; const [px, py] = P(Math.cos(a) * 3.3, Math.sin(a) * 3.3); inkPath(g, [[px, py], [px + Math.cos(a) * 0.35, py - Math.sin(a) * 0.35]], 0.06); }
    });
    // 튀어나간 흙덩이와 꺾인 풀
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = 3.7 + (i % 3) * 0.5; k.ball(Math.cos(a) * r, 0.12, Math.sin(a) * r, 0.32 - (i % 3) * 0.06, 0.2, 0.28, i % 2 ? '#9c7a55' : '#b08b62', 1); }
    for (let i = 0; i < 6; i++) { const a = i * 1.05; const c = k.cone(Math.cos(a) * 2.75, 0, Math.sin(a) * 2.75, 0.09, 0.6, '#8fbf6e', 0); c.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
    k.portal(0, 0, 3.6, '구멍에 떨어지기', { room: 'pit' });
  },
  smallCave(k) {
    caveMouth(k, 5.5, '#aba599');
    // 갇혀 있던 작은 카부토무시
    k.ball(0, 0.28, 5.6, 0.3, 0.24, 0.42, '#6b4a30');
  },
  goblin(k) {
    caveMouth(k, 9.5, '#8f8b7f');
    for (const x of [-3.6, 3.6]) {
      k.cyl(x, 1.7, 10.4, 0.2, 3.4, '#8c6a50');
      k.ball(x, 3.7, 10.4, 0.36, 0.55, 0.36, '#f3b672', 0);
    }
    k.npc('goblin', 5.8, 11.6);
    k.npc('goblin', -6, 11.8);
    k.npc('goblin', 8.4, 15, { wander: 3 });
    k.portal(0, 10.8, 3, '지하감옥으로 내려가기', { room: 'prison' });
  },
  pier(k) {
    k.box(0, 0.8, 10, 6, 0.4, 34, '#c9a57c', 2);
    for (let i = 0; i < 6; i++) {
      k.cyl(-2.6, 0.2, i * 6, 0.3, 3, '#a58a6e');
      k.cyl(2.6, 0.2, i * 6, 0.3, 3, '#a58a6e');
    }
    swanBoat(k, 6, 25);
    k.portal(0, 24, 5, '배 타고 섬으로', { x: 172, z: 398 });
  },
  dock(k) {
    k.box(0, 0.7, -8, 8, 0.4, 20, '#c9a57c', 2);
    for (let i = 0; i < 4; i++) {
      k.cyl(-3.5, 0.1, -16 + i * 6, 0.32, 3, '#a58a6e');
      k.cyl(3.5, 0.1, -16 + i * 6, 0.32, 3, '#a58a6e');
    }
    swanBoat(k, 7.5, -12);
    // 환영 간판
    for (const x of [-9.8, -4.2]) {
      k.cyl(x, 2.3, 3, 0.18, 4.6, '#b98f68');
      k.solidCircle(x, 3, 0.2);
    }
    k.box(-7, 4.5, 3, 6, 1.5, 0.24, '#f7eab8');
    k.paint(-7, 3.78, 3.14, 5.8, 1.44, g => drawText(g, '어서 오세요', 0, 0.72, 5.2, 1.3, INK_WORLD));
    k.box(7.5, 0.7, 6, 4.4, 1.4, 2, '#c9a57c');
    k.ball(7.5, 3.3, 6, 3.2, 0.8, 2.2, '#eeb07a', 2);
    for (const x of [5.5, 9.5]) k.box(x, 1.7, 5.2, 0.2, 3.2, 0.2, '#a98a66');
    k.solidRect(7.5, 6, 4.4, 2);
    k.portal(0, -14, 5, '배 타고 돌아가기', { x: 0, z: 300 });
  },
  islandPlaza(k) {
    k.cyl(0, 0.3, 0, 1.5, 0.6, '#a58a6e');
    k.cone(0, 0.5, 0, 1.15, 2.6, '#f3b672', 0);
    k.cone(0, 0.6, 0, 0.65, 1.6, '#fbdc8c', 0);
    k.solidCircle(0, 0, 1.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.kid(Math.cos(a) * 5.4, Math.sin(a) * 5.4, '#d4b083');
    }
  },
  bungalow(k) {
    // 고상식 목조 방갈로
    for (const [x, z] of [[-17, -11], [0, -14], [17, -11], [-17, 11], [17, 11]]) {
      for (const [sx, sz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) k.cyl(x + sx, 1.1, z + sz, 0.2, 2.2, '#a58a6e');
      k.box(x, 2.4, z, 6.8, 0.4, 6.8, '#c9a57c', 2);
      k.bigBox(x, 4.2, z, 5.4, 3.2, 5.4, '#e2c79d', 0.5);
      k.thatch(x, 5.4, z, 4.8, 3.4);
      k.paint(x, 2.6, z + 2.74, 4.6, 3, g => drawDoor(g, 0, 1.7, 2.6, '#a57e5a'));
      k.solidRect(x, z, 5.6, 5.6);
    }
  },
  islandHomes(k) {
    // 초가 지붕의 주민 집
    for (const [x, z] of [[-13, -9], [3, -13], [15, -3], [-11, 11], [9, 12]]) {
      k.cyl(x, 1.8, z, 3.6, 3.6, '#ead4ab', 2);
      k.thatch(x, 3.1, z, 5.2, 4.6);
      k.paint(x, 0, z + 3.7, 2.2, 2.8, g => drawDoor(g, 0, 1.8, 2.6, '#a57e5a'));
      k.solidCircle(x, z, 3.7);
    }
  },
  shimajiro(k) {
    k.bigBox(0, 2.8, 0, 14, 5.6, 10, '#e2c79d', 0.8);
    k.thatch(0, 5, 0, 10.4, 5);
    k.paint(0, 0, 5.04, 13, 5, g => {
      drawDoor(g, 0, 3, 4.1, '#a57e5a');
      drawWindow(g, -4.6, 2.6, 2.4, 2);
      drawBoard(g, 4.4, 3.4, 3.6, 1.2, '시마지로', '#fffdf4', '#b5574f');
    });
    k.solidRect(0, 0, 14, 10);
    k.post(9, 6, '조개국');
    k.kid(-4.6, 6.6, '#d4b083');
  },
  bridge(k) {
    k.cyl(0, 0.05, 0, 9, 0.1, '#92b6c9', 0);
    for (let i = -7; i <= 7; i++) {
      const plank = k.box(i * 1.05, 1.3 - (1 - (i / 7) ** 2) * 0.6, 0, 0.84, 0.14, 2.4, '#c9a57c');
      plank.rotation.z = rand(-0.05, 0.05);
    }
    for (const x of [-8, 8]) {
      k.cyl(x, 1.8, -1.3, 0.18, 3.6, '#a58a6e');
      k.cyl(x, 1.8, 1.3, 0.18, 3.6, '#a58a6e');
    }
    k.ball(0, 0.2, 5.4, 0.9, 2.4, 0.9, '#bcb7ad');
  },
  seaCave(k) {
    caveMouth(k, 8.5, '#7d97a0');
    k.post(6.4, 9.4, '출입 금지', '#d6776a', '#fff');
    k.portal(0, 9.4, 3, '해저동굴로 들어가기', { room: 'seaCave' });
  },
  // 명세 25곳 밖이라 지도에서 빠져 있는 곳 (world.js의 optional)
  soba(k) { k.shop({ wall: '#f2ead8', roof: '#8fa08f', label: '서서 먹는 소바', signBg: '#4f7a5f', signFg: '#fff' }); },
  machioka(k) { k.shop({ wall: '#fff3f5', roof: '#f3b3c8', label: '과자의 마치오카', signBg: '#fff', signFg: '#d8678a' }); },
  pharmacy(k) { k.shop({ wall: '#f0f7f0', roof: '#93c3a0', label: '약국', signBg: '#6fb385', signFg: '#fff' }); k.npc('yoroi-pharmacy', 5, 8.2); },
  pottery(k) { k.shop({ wall: '#eef6fb', roof: '#a8cfe8', label: '도예점', signBg: '#fff', signFg: '#4a84ac' }); k.npc('yoroi-labor', 5, 8.2, { over: { skinColor: '#a8d3ee', yoroiGear: null }, label: '도예점 요로이' }); },
  big1(k) { k.shop({ w: 18, wall: '#fff', roof: '#e38a8a', label: '빅원', signBg: '#e38a8a', signFg: '#fff' }); },
  arcade(k) { k.shop({ wall: '#7b74a6', roof: '#e89cc0', label: '게임센터', signBg: '#f7dd85' }); },
  recycle(k) { k.shop({ wall: '#dfd6c0', roof: '#a3957d', label: '리사이클 숍', signBg: '#f1e2b8' }); },
  cycle(k) { k.shop({ wall: '#edf5e4', roof: '#9cc396', label: '렌타사이클', signBg: '#fff' }); },
  lemon(k) { k.shop({ w: 20, d: 14, wall: '#f3f2ea', roof: '#b4bbc0', label: '레몬 스티커 공장', signBg: '#f7e77a' }); },
  treasure(k) { k.shop({ wall: '#eddfb4', roof: '#cf8f86', label: '보물찾기', signBg: '#f7e77a' }); },
  sobaSpring(k) {
    // 돌 우물에 간장 국물이 차 있고, 대나무 홈통에서 소바가 흘러내려 산처럼 쌓인다
    k.cyl(0, 0.34, 0, 4, 0.68, '#a5a98f', 2);
    k.cyl(0, 0.7, 0, 3.4, 0.06, '#5f4128', 0);
    k.ball(0, 1, 0, 2.4, 0.85, 2.4, '#a98f6c', 1);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.399;
      const r = 0.5 + (i % 5) * 0.45;
      k.ball(Math.cos(a) * r, 1.45 + ((i % 3) * 0.14) - r * 0.2, Math.sin(a) * r, 0.62, 0.11, 0.17, i % 2 ? '#c8b18b' : '#b89d76', 0);
    }
    for (const [x, z] of [[-1, 0.4], [0.6, -0.8], [0.2, 0.9], [1.1, 0.5]]) k.ball(x, 1.86, z, 0.16, 0.08, 0.16, '#8fc06a', 0);
    k.cyl(2.9, 1.9, 0, 0.34, 3.1, '#9dbb6a', 2);
    k.cyl(2.9, 3.5, 0, 0.42, 0.14, '#c2d68e', 1);
    k.box(1.7, 3.18, 0, 2.5, 0.24, 0.44, '#9dbb6a', 1);
    k.cyl(0.6, 2.25, 0, 0.13, 1.7, '#c8b18b', 0);
    k.cyl(0.32, 2.25, 0.16, 0.09, 1.7, '#b89d76', 0);
    k.solidCircle(0, 0, 4);
  },
  servers(k) { k.cone(0, 0, 0, 1, 5, '#e6d5bb', 2); k.ball(0, 7, 0, 4, 3.4, 4, '#b7dca2', 2); k.solidCircle(0, 0, 1); },
  akafuku(k) {
    // 팥을 물결처럼 덮은 떡. 떨어져 흩어진 모양 (자리는 전과 같다)
    k.cyl(0, 0.05, 0, 6, 0.1, '#e6cda6', 0);
    for (let i = 0; i < 7; i++) {
      const x = rand(-5, 5);
      const z = rand(-5, 5);
      k.ball(x, 0.34, z, 0.72, 0.34, 0.6, '#fff4ea', 1);
      k.ball(x, 0.56, z, 0.62, 0.2, 0.5, '#6e3a40', 1);
      for (const dx of [-0.3, 0, 0.3]) k.ball(x + dx, 0.72, z, 0.09, 0.08, 0.4, '#8a4d52', 0);
    }
  },
};

/* ---------- 내부 방: 지붕 없는 방이라 카메라가 그대로 내려다본다 ---------- */

const ROOM_DEFS = {
  home: {
    name: '치이카와의 집', w: 16, d: 14, floor: '#f8efd9', wall: '#fffdf8', bg: 0xf3e7cc, crack: false,
    build(k) {
      // 침대, 테이블, 검정 공부 책상
      k.box(-5, 0.45, -4, 4.4, 0.9, 3.2, '#f7cfdc');
      k.box(-5, 1, -4, 4.4, 0.24, 3.2, '#fffdf8');
      k.ball(-6.4, 1.3, -4, 0.8, 0.3, 1.1, '#fffdf8');
      k.solidRect(-5, -4, 4.4, 3.2);
      k.cyl(1, 0.92, 0.4, 1.8, 0.2, '#d9b98a', 2);
      k.cyl(1, 0.42, 0.4, 0.3, 0.84, '#b98f68');
      k.solidCircle(1, 0.4, 1.7);
      k.box(5.4, 0.9, -4.8, 3.6, 0.3, 1.8, '#c9a57c');
      for (const x of [3.9, 6.9]) k.box(x, 0.4, -4.8, 0.3, 0.8, 1.5, '#a98a66');
      k.box(5.4, 1.15, -4.8, 1.4, 0.16, 1, '#a8c6e0');
      k.solidRect(5.4, -4.8, 3.6, 1.8);
    },
  },
  cave: {
    name: '하치와레의 동굴', w: 17, d: 15, floor: '#dcdad4', wall: '#e4e3df', bg: 0x2a2826, crack: true,
    build(k) {
      // 이불은 한 채뿐. 찻상, 금 간 그릇, 안쪽 주방
      k.box(-5, 0.25, -4, 4.4, 0.5, 3.2, '#a8c6e0');
      k.solidRect(-5, -4, 4.4, 3.2);
      k.box(0.6, 0.55, 0.4, 3.4, 0.26, 2.2, '#c9a57c', 1);
      for (const [x, z] of [[-0.6, -0.4], [1.8, -0.4], [-0.6, 1.2], [1.8, 1.2]]) k.box(x, 0.22, z, 0.22, 0.44, 0.22, '#a98a66');
      k.solidRect(0.6, 0.4, 3.4, 2.2);
      for (const [x, z] of [[0, 0.4], [1.3, 0.6]]) k.cyl(x, 0.78, z, 0.34, 0.22, '#eef3f4');
      k.bigBox(5.6, 1.1, -5.4, 3.6, 2.2, 1.6, '#c9a57c', 0.3);
      k.solidRect(5.6, -5.4, 3.6, 1.6);
      k.cyl(6.6, 0.8, 4.8, 0.22, 1.6, '#e8c97c');
      k.ball(6.6, 1.9, 4.8, 0.44, 0.44, 0.44, '#fff0ae', 0);
    },
  },
  usagi: {
    name: '? 음악이 울리는 동굴', w: 18, d: 16, floor: '#7f766c', wall: '#5e564f', bg: 0x1e1a24, crack: true,
    build(k) {
      // 한 단 높은 바위: DJ 부스 같은 자리
      k.rock(0, 0.4, -4.4, 4.2, 2.2, 2.6, '#9d968c');
      k.solidRect(0, -4.4, 6.8, 4);
      k.box(0, 2.6, -4.2, 3.2, 0.24, 1.2, '#4a3f3a');
      for (const x of [-1, 1]) k.cyl(x, 2.8, -4.2, 0.46, 0.12, '#2c2522');
      k.ball(0, 3.2, -4.2, 0.24, 0.32, 0.24, '#b08a5e');
      // 이곳이 집인지는 원작에서도 확정되지 않았다: 생활감 있는 소품은 두지 않는다
      for (let i = 0; i < 7; i++) k.ball(rand(2.4, 7.6), 0.22, rand(-5, 6), 0.24, 0.3, 0.24, '#b08a5e');
      for (const [x, c] of [[-7.8, '#e8a8d8'], [7.8, '#a8d8e8']]) k.cone(x, 0, -7, 1.1, 4.4, c, 0);
    },
  },
  ramen: {
    name: '라멘 로', w: 16, d: 12, floor: '#dfd3bd', wall: '#f2e6cf', bg: 0x4a4038, crack: false,
    build(k) {
      k.box(0, 0.85, -1.6, 12, 1.7, 1.5, '#a97c50', 2);
      k.solidRect(0, -1.6, 12, 1.5);
      k.npc('yoroi-ramen', -2.4, -4);
      // 라멘 로의 수습생. 카운터에 가리지 않게 발판 위에 선다
      k.npc('shisa', 2.4, -3.6, { y: 0.9, expression: 's-serious' });
      for (let i = 0; i < 4; i++) {
        k.cyl(-3.6 + i * 2.4, 0.5, 0.5, 0.5, 1, '#d6776a');
        k.solidCircle(-3.6 + i * 2.4, 0.5, 0.45);
      }
      k.cyl(1.2, 1.9, -1.6, 0.56, 0.42, '#f6ecd6');
      k.ball(1.2, 2.14, -1.6, 0.48, 0.3, 0.48, '#efd98a');
      // 식권 자판기
      k.bigBox(6.4, 1.5, 4.2, 1.9, 3, 1.1, '#d3d6da', 0.25);
      k.paint(6.4, 0.5, 4.78, 1.7, 2.3, g => {
        drawBoard(g, 0, 1.95, 1.4, 0.54, '식권', '#f6d656');
        for (let i = 0; i < 6; i++) {
          g.fillStyle = '#fffdf4';
          g.fillRect(-0.6 + (i % 2) * 0.66, 1.1 - Math.floor(i / 2) * 0.44, 0.54, 0.32);
        }
      });
      k.solidRect(6.4, 4.2, 1.9, 1.1);
      k.box(-4.6, 3.1, -5.8, 6, 1.2, 0.2, '#f6d656');
      k.paint(-4.6, 2.5, -5.68, 5.8, 1.2, g => drawText(g, '마늘 넣을까요?', 0, 0.6, 5.4, 1, INK_WORLD));
    },
  },
  pit: {
    name: '구멍 아래', w: 13, d: 13, floor: '#b8ac97', wall: '#a39783', bg: 0x17130f, crack: true,
    build(k) {
      k.cone(-4, 0, -3.6, 0.7, 3, '#94897a');
      k.solidCircle(-4, -3.6, 0.7);
      // 떨어뜨린 사스마타
      const pole = k.cyl(1.2, 0.18, 2.4, 0.08, 3, '#6f9fc8');
      pole.rotation.x = Math.PI / 2;
    },
  },
  prison: {
    name: '고블린 지하감옥', w: 20, d: 15, floor: '#7f796e', wall: '#625d55', bg: 0x14120f, crack: true,
    build(k) {
      // 철격자
      for (let i = -9; i <= 9; i += 1) {
        if (Math.abs(i) < 1) continue;
        k.cyl(i, 2, 0, 0.09, 4, '#3f3c3a');
      }
      k.box(0, 4, 0, 20, 0.26, 0.26, '#3f3c3a');
      k.solidRect(-5, 0, 9, 0.3);
      k.solidRect(5, 0, 9, 0.3);
      // 밥 접시, 스푼, 스푼으로 판 탈출 구멍
      k.cyl(-5.5, 0.08, -4, 0.54, 0.12, '#d3d6da');
      k.box(-4.5, 0.1, -4, 0.9, 0.06, 0.14, '#d3d6da', 0);
      k.cyl(6.6, 0.04, -5.4, 1, 0.05, '#1d1612', 0);
      k.npc('goblin', -7, 5);
      k.npc('goblin', 7, 4);
      // 철격자 안의 오데
      k.npc('ode', 4.5, -4.4, { expression: 'o-plead' });
      for (const x of [-1.4, 1.4]) k.kid(x, -3, '#dcdcdc');
    },
  },
  seaCave: {
    name: '해저동굴', w: 20, d: 18, floor: '#578394', wall: '#2f6078', bg: 0x0d2a44, crack: true,
    build(k) {
      for (let i = 0; i < 12; i++) {
        const x = rand(-9, 9);
        const z = rand(-8, 8);
        if (Math.hypot(x, z - 7) < 3.4) continue;
        k.cone(x, 0, z, 0.44, rand(2.4, 3.6), '#5aa382');
      }
      // 세이렌의 자리와 다시마에 묶인 랏코
      k.rock(0, 0.5, -5.6, 3.6, 1.3, 2.4, '#6f9aaa');
      k.solidCircle(0, -5.6, 3.4);
      k.ball(0, 2.6, -5.8, 1.1, 1.3, 0.95, '#a4d5e4');
      k.ball(-5.4, 0.8, -2.4, 0.84, 0.84, 0.72, '#fffdf8');
      k.box(-5.4, 0.8, -2.4, 1.8, 0.34, 1.5, '#4d8c6a');
      k.solidCircle(-5.4, -2.4, 0.9);
    },
  },
  onsen: {
    name: '온천', w: 18, d: 15, floor: '#d3cdbe', wall: '#ece5d4', bg: 0xe0d8c4, crack: false,
    build(k) {
      for (const [x, z] of [[-5, -2.4], [0, -4], [5, -2.4]]) {
        k.cyl(x, 0.95, z, 2.2, 1.9, '#7fb08a', 2);
        k.cyl(x, 1.92, z, 1.9, 0.05, '#b4e4f0', 0);
        steam(k, x, 2.5, z);
        k.solidCircle(x, z, 2.3);
      }
      k.kid(0, -4, '#ffffff', 1.1);
      k.box(6.4, 0.4, 4.4, 3, 0.8, 2.4, '#c9a57c');
      k.cyl(6.4, 0.95, 4.4, 0.34, 0.34, '#dceaf1');
      k.solidRect(6.4, 4.4, 3, 2.4);
    },
  },
};
const ROOM_ORIGIN = 3000;
const ROOM_GAP = 80;

// 방의 안쪽 벽과 바닥에 손그림 무늬를 붙인다
function paintRoomSurfaces(k, def) {
  const wallDraw = (w, h) => g => {
    g.save();
    g.translate(-w / 2, 0);
    if (def.crack) {
      g.strokeStyle = 'rgba(90, 59, 51, .85)';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = 0.09;
      for (let i = 0; i < w * 0.9; i++) {
        let x = rand(0, w);
        let y = rand(0.2, h);
        let a = rand(0, Math.PI * 2);
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          a += rand(-0.9, 0.9);
          x += Math.cos(a) * 0.9;
          y += Math.sin(a) * 0.9;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    inkPath(g, [[0, 0.05], [w, 0.05]], 0.1);
    g.restore();
  };
  const h = 4.2;
  k.paint(0, 0, -def.d / 2 + 0.02, def.w, h, wallDraw(def.w, h));
  k.paint(-def.w / 2 + 0.02, 0, 0, def.d, h, wallDraw(def.d, h), Math.PI / 2);
  k.paint(def.w / 2 - 0.02, 0, 0, def.d, h, wallDraw(def.d, h), -Math.PI / 2);
  // 바닥의 짧은 자국 선
  const floor = k.paint(0, 0.02, 0, def.w, def.d, g => {
    g.translate(0, def.d / 2);
    for (let i = 0; i < def.w * def.d * 0.12; i++) {
      const x = rand(-def.w / 2, def.w / 2);
      const y = rand(-def.d / 2, def.d / 2);
      inkPath(g, [[x, y], [x + rand(0.2, 0.5), y + rand(-0.04, 0.04)]], 0.04);
    }
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
}

/* ---------- 식생과 땅 위의 무늬 ---------- */

// 뭉게구름 같은 울퉁불퉁한 덩어리
function makeBlobGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const bumps = [];
  for (let i = 0; i < 22; i++) {
    const v = new THREE.Vector3(rand(-1, 1), rand(-0.7, 1), rand(-1, 1)).normalize();
    bumps.push(v);
  }
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let lump = 0;
    for (const b of bumps) lump = Math.max(lump, smoothstep(0.88, 1, v.dot(b)));
    const r = 0.9 + lump * 0.12;
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  geo.computeVertexNormals();
  // 면이 나뉘어 있어 법선을 위치 기준으로 다시 맞춘다 (외곽선이 끊기지 않게)
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  return geo;
}

// 야자 잎: 톱니가 있는 휘어진 잎 7장
function makeFrondGeometry() {
  const verts = [];
  const index = [];
  for (let f = 0; f < 7; f++) {
    const a = (f / 7) * Math.PI * 2;
    const dir = [Math.cos(a), Math.sin(a)];
    const side = [-dir[1], dir[0]];
    const base = verts.length / 3;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const along = t * 3.4;
      const y = 0.75 * Math.sin(t * Math.PI * 0.75) - 1.9 * t * t;
      const width = (0.15 + 0.62 * Math.sin(t * Math.PI) ** 0.7) * (i % 2 ? 1 : 0.68);
      verts.push(dir[0] * along + side[0] * width, y - 0.08, dir[1] * along + side[1] * width);
      verts.push(dir[0] * along, y + 0.1, dir[1] * along);
      verts.push(dir[0] * along - side[0] * width, y - 0.08, dir[1] * along - side[1] * width);
      if (i < n) {
        const k = base + i * 3;
        index.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// 땅에 찍는 작은 그림: 사진 속 흙 자국 선, 연두 풀 포기, 꽃
function makeGroundDecal(draw) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}
const dashDecal = makeGroundDecal(g => {
  g.strokeStyle = '#7a5245';
  g.lineCap = 'round';
  g.lineWidth = 3.4;
  for (const [x, y, w] of [[18, 30, 34], [58, 26, 26], [34, 42, 22], [78, 38, 18]]) {
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + w / 2, y - 3, x + w, y + 1);
    g.stroke();
  }
});
const tuftDecal = makeGroundDecal(g => {
  const grad = g.createRadialGradient(64, 36, 4, 64, 36, 44);
  grad.addColorStop(0, 'rgba(160, 216, 130, .85)');
  grad.addColorStop(1, 'rgba(160, 216, 130, 0)');
  g.fillStyle = grad;
  g.save();
  g.translate(64, 36);
  g.scale(1.3, 0.62);
  g.translate(-64, -36);
  g.beginPath();
  g.arc(64, 36, 44, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.strokeStyle = '#5f4a36';
  g.lineCap = 'round';
  g.lineWidth = 3;
  for (const [x, dx] of [[50, -5], [60, -2], [68, 2], [78, 5]]) {
    g.beginPath();
    g.moveTo(x, 42);
    g.lineTo(x + dx, 28);
    g.stroke();
  }
});
const flowerDecal = makeGroundDecal(g => {
  for (const [x, y, c] of [[40, 30, '#fff'], [78, 38, '#ffe1ea']]) {
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      g.fillStyle = c;
      g.beginPath();
      g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 4, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f2c566';
    g.beginPath();
    g.arc(x, y, 3.4, 0, Math.PI * 2);
    g.fill();
  }
});

function buildVegetation(scene) {
  const trunks = [];
  const blobs = [];
  const palms = [];
  // 마을 안의 나무와 덤불은 streetScape에서 직접 심는다
  const inTown = (x, z) => (x > -170 && x < 305 && Math.abs(z) < 62) || Math.hypot(x, z) < 112;
  // 길 폭 + 여유 안에는 어떤 식재도 두지 않는다
  const nearRoad = (x, z, gap) => ROADS.some(r => r.points.some((a, i) => {
    const b = r.points[i + 1];
    if (!b) return false;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) < r.w / 2 + gap;
  }));
  // 나무끼리 몸통이 겹치지 않게
  const plantedAt = new Set();
  const claimSpot = (x, z) => {
    const k = `${Math.round(x / 2)},${Math.round(z / 2)}`;
    if (plantedAt.has(k)) return false;
    plantedAt.add(k);
    return true;
  };
  const free = (x, z) => {
    if (inTown(x, z) || nearRoad(x, z, 2.5) || !claimSpot(x, z)) return false;
    const gx = Math.round(toGrid(x));
    const gz = Math.round(toGrid(z));
    if (gx < 0 || gz < 0 || gx > GRID || gz > GRID) return false;
    const k = gridIndex(gx, gz);
    return heights[k] > 1 && heights[k] < MAX_WALK_HEIGHT - 2 && !roadMask[k] && !padMask[k];
  };
  const plant = (x, z, zone) => {
    const y = heightAt(x, z);
    const s = rand(1.1, 1.7);
    if (zone && zone.palm) {
      palms.push({ x, y, z, s });
      (window.MAP_DECOR = window.MAP_DECOR || []).push({ kind: 'palm', x, z, wild: true });
    } else {
      const leaf = zone && zone.marron
        ? [0xe7bd86, 0xdfae76, 0xecca96][Math.floor(rand(0, 3))]
        : [0xb7dca2, 0xaad59a, 0xc1e2a8][Math.floor(rand(0, 3))];
      trunks.push({ x, y, z, s });
      (window.MAP_DECOR = window.MAP_DECOR || []).push({ kind: 'tree', x, z, wild: true });
      blobs.push({ x, y: y + 6.4 * s, z, sx: 3.6 * s, sy: 3.4 * s, sz: 3.6 * s, ry: rand(0, 6), color: leaf });
    }
    addCircle(x, z, 0.8 * s);
  };

  for (const zone of ZONES) {
    if (!zone.trees) continue;
    const count = Math.round(Math.PI * zone.r * zone.r * zone.trees);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const d = Math.sqrt(rand()) * zone.r;
      const x = zone.x + Math.cos(a) * d;
      const z = zone.z + Math.sin(a) * d;
      if (free(x, z)) plant(x, z, zone);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = rand(-340, 340);
    const z = rand(-280, 330);
    if (free(x, z) && Math.hypot(x - 70, z) > 170) plant(x, z, null);
  }
  // 덤불: 더 진한 초록의 낮은 덩어리
  for (let i = 0; i < 260; i++) {
    const x = rand(-340, 340);
    const z = rand(-290, 580);
    if (!free(x, z)) continue;
    const y = heightAt(x, z);
    const s = rand(1, 1.8);
    blobs.push({ x, y: y + 0.7 * s, z, sx: 2 * s, sy: 1.25 * s, sz: 1.7 * s, ry: rand(0, 6), color: [0x9ccc98, 0xa6d29a, 0x93c690][Math.floor(rand(0, 3))] });
    addCircle(x, z, 1.5 * s);
    (window.MAP_DECOR = window.MAP_DECOR || []).push({ kind: 'bush', x, z, wild: true });
  }

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const blobGeo = makeBlobGeometry();
  const trunkGeo = softLathe('trunk', [[0, 0], [1, 0], [0.62, 0.1], [0.42, 0.45], [0.36, 1], [0, 1]]);
  // 숲 전체를 한 번에 그리지 않게 구역별로 나눈다. 보이는 구역과 가까운 구역만 그린다
  const CHUNK = 110;
  const chunks = new Map();
  const chunkFor = (x, z) => {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const key = `${cx},${cz}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group();
      scene.add(group);
      chunks.set(key, { group, x: (cx + 0.5) * CHUNK, z: (cz + 0.5) * CHUNK });
    }
    return chunks.get(key);
  };
  const fill = (list, geo, material, set, shadow) => {
    const buckets = new Map();
    for (const item of list) {
      const chunk = chunkFor(item.x, item.z);
      if (!buckets.has(chunk)) buckets.set(chunk, []);
      buckets.get(chunk).push(item);
    }
    for (const [chunk, items] of buckets) {
      const mesh = new THREE.InstancedMesh(geo, material, items.length);
      items.forEach((item, i) => {
        set(item);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (item.color !== undefined) mesh.setColorAt(i, tint.set(item.color));
      });
      mesh.computeBoundingSphere();
      mesh.castShadow = shadow;
      chunk.group.add(mesh);
    }
  };
  const setTrunk = t => {
    dummy.position.set(t.x, t.y - 0.1, t.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1.15 * t.s, 4.4 * t.s, 1.15 * t.s);
  };
  const setBlob = b => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, b.ry, 0);
    dummy.scale.set(b.sx, b.sy, b.sz);
  };
  fill(trunks, trunkGeo, new THREE.MeshToonMaterial({ color: 0xe6d5bb, gradientMap: toonRampWorld, map: paperTex }), setTrunk, true);
  fill(trunks, trunkGeo, inkTree, setTrunk, false);
  fill(blobs, blobGeo, Polish.sway(new THREE.MeshToonMaterial({ gradientMap: toonRampWorld, map: leafTex }), 'blob'), setBlob, true);
  fill(blobs, blobGeo, Polish.swayInk(makeInk(0.09), 'blob'), setBlob, false);

  if (palms.length) {
    const setPalmTrunk = p => {
      dummy.position.set(p.x, p.y + 4.4 * p.s, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.42 * p.s, 8.8 * p.s, 0.42 * p.s);
    };
    const setCrown = p => {
      dummy.position.set(p.x, p.y + 8.8 * p.s, p.z);
      dummy.rotation.set(0, p.x, 0);
      dummy.scale.setScalar(1.5 * p.s);
    };
    fill(palms, softCylGeo, new THREE.MeshToonMaterial({ color: 0xcfaa78, gradientMap: toonRampWorld, map: paperTex }), setPalmTrunk, true);
    fill(palms, softCylGeo, inkTree, setPalmTrunk, false);
    fill(palms, makeFrondGeometry(), Polish.sway(new THREE.MeshToonMaterial({ color: 0x8fcf80, gradientMap: toonRampWorld, side: THREE.DoubleSide }), 'frond'), setCrown, true);
  }

  // 땅 위의 그림
  const decalGeo = new THREE.PlaneGeometry(1, 1);
  decalGeo.rotateX(-Math.PI / 2);
  const scatterDecal = (material, count, w, h, accept) => {
    const mesh = new THREE.InstancedMesh(decalGeo, material, count);
    let placed = 0;
    for (let tries = 0; tries < count * 4 && placed < count; tries++) {
      const x = rand(-360, 360);
      const z = rand(-300, 600);
      if (!accept(x, z)) continue;
      dummy.position.set(x, heightAt(x, z) + 0.05, z);
      dummy.rotation.set(0, rand(-0.3, 0.3), 0);
      const s = rand(0.8, 1.4);
      dummy.scale.set(w * s, 1, h * s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    mesh.count = placed;
    mesh.frustumCulled = false;
    scene.add(mesh);
  };
  const land = (x, z) => heightAt(x, z) > 0.8 && heightAt(x, z) < MAX_WALK_HEIGHT - 2;
  scatterDecal(dashDecal, 7000, 3.4, 1.7, land);
  scatterDecal(tuftDecal, 5000, 3.2, 1.6, free);
  scatterDecal(flowerDecal, 900, 1.6, 0.8, free);

  // 멀리 보이는 파란 산: 둥근 꼭대기의 큰 삼각형과 굵은 선
  const inkFar = makeInk(1.3, false);
  const mountainMat = new THREE.MeshBasicMaterial({ color: 0xb1b9cf, fog: false, map: paperTex });
  const mountainMat2 = new THREE.MeshBasicMaterial({ color: 0xc3bfd8, fog: false, map: paperTex });
  const ring = [[-40, -620, 200, 190], [230, -600, 170, 150], [-280, -570, 170, 140], [640, -240, 190, 170], [-650, -180, 200, 160], [680, 180, 170, 130], [-660, 260, 180, 140], [-300, 720, 170, 120], [560, 640, 180, 140], [90, 820, 190, 130]];
  ring.forEach(([x, z, r, h], i) => {
    const m = new THREE.Mesh(softConeGeo, i % 2 ? mountainMat2 : mountainMat);
    m.position.set(x, -4, z);
    m.scale.set(r, h, r);
    m.add(new THREE.Mesh(softConeGeo, inkFar));
    scene.add(m);
  });
  return [...chunks.values()];
}
