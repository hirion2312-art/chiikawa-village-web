'use strict';

// 마을의 건물: 벽, 지붕, 문, 창문을 실제 구조로 쌓는다.
// 크기 기준: 1유닛은 약 0.6m. 층고 7, 문 높이 4.6, 창틀 높이 3 안팎. 캐릭터 키는 1.7쯤이다
const SIGN_INK = INK_WORLD;

/* ---------- 지붕, 창틀 도형 ---------- */

// 외곽선이 꺾인 모서리에서 벌어지지 않게, 같은 위치의 법선을 평균 낸 사본을 만든다
function withSmoothInk(geo) {
  const ink = geo.clone();
  const pos = ink.attributes.position;
  const nor = ink.attributes.normal;
  const sums = new Map();
  const keyOf = i => `${Math.round(pos.getX(i) * 500)},${Math.round(pos.getY(i) * 500)},${Math.round(pos.getZ(i) * 500)}`;
  for (let i = 0; i < pos.count; i++) {
    const key = keyOf(i);
    const s = sums.get(key) || [0, 0, 0];
    s[0] += nor.getX(i);
    s[1] += nor.getY(i);
    s[2] += nor.getZ(i);
    sums.set(key, s);
  }
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(keyOf(i));
    const len = Math.hypot(s[0], s[1], s[2]) || 1;
    nor.setXYZ(i, s[0] / len, s[1] / len, s[2] / len);
  }
  geo.userData.inkGeo = ink;
  return geo;
}

function softMin(a, b, k) {
  const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

// 용마루가 x축을 따라가는 두께 있는 지붕판. hip이면 네 면이 모두 경사진 우진각 지붕
function roofGeo(w, d, h, hip, thick = 0.34) {
  return cached(`roof${w}|${d}|${h}|${hip}`, () => {
    const nx = 28;
    const nz = 16;
    const height = (x, z) => {
      let y = h * (1 - Math.abs(z) / (d / 2));
      if (hip) y = softMin(y, ((w / 2 - Math.abs(x)) * h) / (d / 2), 0.5);
      return softMin(y, h * 0.97, 0.35);
    };
    const verts = [];
    const uvs = [];
    for (const under of [0, 1]) {
      for (let j = 0; j <= nz; j++) {
        for (let i = 0; i <= nx; i++) {
          const x = -w / 2 + (w * i) / nx;
          const z = -d / 2 + (d * j) / nz;
          verts.push(x, height(x, z) - under * thick, z);
          uvs.push(x / 3, z / 1.8);
        }
      }
    }
    const top = (i, j) => j * (nx + 1) + i;
    const low = (i, j) => (nz + 1) * (nx + 1) + top(i, j);
    const index = [];
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        index.push(top(i, j), top(i, j + 1), top(i + 1, j), top(i + 1, j), top(i, j + 1), top(i + 1, j + 1));
        index.push(low(i, j), low(i + 1, j), low(i, j + 1), low(i + 1, j), low(i + 1, j + 1), low(i, j + 1));
      }
    }
    const rim = (i0, j0, i1, j1) => {
      index.push(top(i0, j0), low(i0, j0), top(i1, j1), top(i1, j1), low(i0, j0), low(i1, j1));
    };
    for (let i = nx; i > 0; i--) rim(i, 0, i - 1, 0);
    for (let j = 0; j < nz; j++) rim(0, j, 0, j + 1);
    for (let i = 0; i < nx; i++) rim(i, nz, i + 1, nz);
    for (let j = nz; j > 0; j--) rim(nx, j, nx, j - 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  });
}

// 박공 벽: 지붕 밑의 삼각형 벽
function wedgeGeo(w, d, h) {
  return cached(`wedge${w}|${d}|${h}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(d / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    geo.translate(0, 0, -w / 2);
    geo.rotateY(Math.PI / 2);
    return geo;
  });
}

function roundedPath(path, w, h, r) {
  path.moveTo(-w / 2 + r, 0);
  path.lineTo(w / 2 - r, 0);
  path.quadraticCurveTo(w / 2, 0, w / 2, r);
  path.lineTo(w / 2, h - r);
  path.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  path.lineTo(-w / 2 + r, h);
  path.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  path.lineTo(-w / 2, r);
  path.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
}

// 창틀: 가운데가 뚫린 사각 틀. 바닥 가운데가 원점
function windowFrameGeo(w, h, t = 0.22, depth = 0.26) {
  return cached(`winFrame${w}|${h}|${t}`, () => {
    const shape = new THREE.Shape();
    roundedPath(shape, w, h, 0.22);
    const hole = new THREE.Path();
    hole.moveTo(-w / 2 + t, t);
    hole.lineTo(-w / 2 + t, h - t);
    hole.lineTo(w / 2 - t, h - t);
    hole.lineTo(w / 2 - t, t);
    hole.closePath();
    shape.holes.push(hole);
    return withSmoothInk(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 }));
  });
}

// 문틀: 아래가 뚫린 틀. arch면 윗부분이 둥글다
function doorFrameGeo(w, h, arch, t = 0.28, depth = 0.3) {
  return cached(`doorFrame${w}|${h}|${arch}`, () => {
    const shape = new THREE.Shape();
    if (arch) {
      const r = w / 2;
      shape.moveTo(-r, 0);
      shape.lineTo(-r, h - r);
      shape.absarc(0, h - r, r, Math.PI, 0, true);
      shape.lineTo(r, 0);
      shape.lineTo(r - t, 0);
      shape.lineTo(r - t, h - r);
      shape.absarc(0, h - r, r - t, 0, Math.PI, false);
      shape.lineTo(-r + t, 0);
    } else {
      shape.moveTo(-w / 2, 0);
      shape.lineTo(-w / 2, h);
      shape.lineTo(w / 2, h);
      shape.lineTo(w / 2, 0);
      shape.lineTo(w / 2 - t, 0);
      shape.lineTo(w / 2 - t, h - t);
      shape.lineTo(-w / 2 + t, h - t);
      shape.lineTo(-w / 2 + t, 0);
    }
    shape.closePath();
    return withSmoothInk(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }));
  });
}

/* ---------- 표면 그림 ---------- */

const roofTileTex = canvasTexture(256, (g, s) => {
  g.fillStyle = '#fff';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(90, 59, 51, .5)';
  g.lineWidth = 5;
  g.lineCap = 'round';
  const rows = 4;
  const cols = 4;
  for (let j = 0; j < rows; j++) {
    const y = ((j + 0.5) / rows) * s;
    for (let i = -1; i <= cols; i++) {
      const x = ((i + (j % 2) * 0.5 + 0.5) / cols) * s;
      g.beginPath();
      g.arc(x, y - s / rows / 2, s / cols / 2, 0.15, Math.PI - 0.15);
      g.stroke();
    }
  }
}, 1);

const stripeCache = new Map();
function stripeMat(c1, c2, n = 8) {
  const key = `${c1}|${c2}|${n}`;
  if (!stripeCache.has(key)) {
    const tex = canvasTexture(256, (g, s) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = i % 2 ? c2 : c1;
        g.fillRect((i / n) * s, 0, s / n + 1, s);
      }
    });
    stripeCache.set(key, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonRampWorld, map: tex }));
  }
  return stripeCache.get(key);
}

// 벽 무늬는 건물마다 그리지 않고 타일 하나를 반복해서 쓴다 (한 장이 8유닛)
function skinTexture(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  draw(c.getContext('2d'), 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
}
const SKINS = {
  plaster: skinTexture((g, s) => {
    g.strokeStyle = 'rgba(122, 82, 69, .5)';
    g.lineCap = 'round';
    g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const x = rand(0, s);
      const y = rand(0, s);
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(x + k * 10, y);
        g.lineTo(x + k * 10 + rand(-2, 2), y + rand(12, 24));
        g.stroke();
      }
    }
  }),
  plank: skinTexture((g, s) => {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(90, 59, 51, .6)';
    g.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo((i / 8) * s + 2, 0);
      g.lineTo((i / 8) * s + 2, s);
      g.stroke();
    }
    g.lineWidth = 2.5;
    g.strokeStyle = 'rgba(90, 59, 51, .35)';
    for (let i = 0; i < 26; i++) {
      const x = rand(0, s);
      const y = rand(0, s);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + rand(18, 44));
      g.stroke();
    }
  }),
  // 검정 시험장 사진의 회색 블록 벽
  block: skinTexture((g, s) => {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(90, 59, 51, .85)';
    g.lineWidth = 5;
    const rows = 6;
    for (let j = 0; j < rows; j++) {
      const y = (j / rows) * s + 3;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
      for (let i = 0; i < 3; i++) {
        const x = ((i + (j % 2) * 0.5) / 3) * s;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + s / rows);
        g.stroke();
      }
    }
  }),
};
const glassTex = canvasTexture(128, (g, s) => {
  const grad = g.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, '#d6edf3');
  grad.addColorStop(1, '#bcdbe6');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  g.fillStyle = 'rgba(255, 255, 255, .55)';
  g.beginPath();
  g.moveTo(s * 0.1, s);
  g.lineTo(s * 0.5, 0);
  g.lineTo(s * 0.7, 0);
  g.lineTo(s * 0.3, s);
  g.fill();
});
const glassMat = new THREE.MeshBasicMaterial({ map: glassTex });
const shadeMat = new THREE.MeshBasicMaterial({ color: 0x4a3a34 });
const unitPlane = new THREE.PlaneGeometry(1, 1);

function drawVertical(g, text, x, top, step, color) {
  [...text].forEach((ch, i) => drawText(g, ch, x, top - step * (i + 0.5), step * 1.5, step * 1.08, color));
}
function drawPlainDoor(g, w, h, color, glass) {
  g.fillStyle = color;
  g.fillRect(-w / 2, 0, w, h);
  inkPath(g, [[-w / 2, 0.02], [w / 2, 0.02]], 0.06);
  if (glass) {
    g.fillStyle = '#d6edf3';
    g.beginPath();
    g.roundRect(-w * 0.3, h * 0.52, w * 0.6, h * 0.3, 0.1);
    g.fill();
    g.strokeStyle = SIGN_INK;
    g.lineWidth = 0.05;
    g.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = rand(-w * 0.42, w * 0.42);
    const y = rand(0.2, h * 0.45);
    inkPath(g, [[x, y], [x, y + rand(0.2, 0.45)]], 0.035);
  }
  g.fillStyle = '#e9d9a8';
  g.beginPath();
  g.arc(w * 0.32, h * 0.42, 0.13, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = SIGN_INK;
  g.lineWidth = 0.05;
  g.stroke();
}

/* ---------- 건물 도구 ---------- */

function installBuildingTools(kit) {
  // 벽면 하나를 기준으로 작업할 좌표계. 벽면이 z=0, 바깥이 +z
  kit.sub = (x, z, ry = 0, y = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    kit.group.add(g);
    return makeKit(g, 0, 0, 0);
  };
  kit.skin = (x, y, w, h, kind) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 8, (uv.getY(i) * h) / 8);
    const m = new THREE.Mesh(geo, SKINS[kind]);
    m.position.set(x, y, 0.03);
    kit.group.add(m);
  };
  kit.win = (x, y, w, h, o = {}) => {
    const frame = o.frame || '#a9805c';
    kit.place(windowFrameGeo(w, h), mat(frame), x, y - h / 2, 0, 1, 1, 1, inkThin);
    const glass = new THREE.Mesh(unitPlane, glassMat);
    glass.position.set(x, y, 0.04);
    glass.scale.set(w - 0.2, h - 0.2, 1);
    kit.group.add(glass);
    if (o.bars !== false) {
      kit.box(x, y, 0.12, 0.12, h - 0.2, 0.08, frame, 0);
      kit.box(x, y, 0.12, w - 0.2, 0.12, 0.08, frame, 0);
    }
    kit.box(x, y - h / 2 - 0.06, 0.24, w + 0.5, 0.2, 0.56, frame);
    if (o.curtain) {
      kit.box(x, y + h / 2 - 0.5, 0.08, w - 0.4, 0.6, 0.06, o.curtain, 0);
    }
    if (o.flowers) {
      kit.box(x, y - h / 2 - 0.46, 0.46, w + 0.1, 0.6, 0.8, '#b98f68');
      for (let i = 0; i < 5; i++) {
        kit.ball(x - w * 0.4 + (i / 4) * w * 0.8, y - h / 2 - 0.02, 0.46, 0.27, 0.27, 0.27, i % 2 ? o.flowers : '#fffdf6');
      }
    }
    if (o.shutter) {
      for (const s of [-1, 1]) kit.box(x + s * (w / 2 + 0.55), y, 0.1, 0.9, h, 0.14, o.shutter);
    }
  };
  kit.door = (x, w, h, color, o = {}) => {
    const arch = o.arch !== false;
    kit.place(doorFrameGeo(w, h, arch), mat(o.frame || '#a9805c'), x, 0, 0, 1, 1, 1, inkThin);
    kit.paint(x, 0, 0.05, w - 0.1, h - 0.05, g => {
      if (arch) {
        drawDoor(g, 0, w - 0.3, h - 0.2, color);
      } else if (o.double) {
        g.save();
        g.translate(-w / 4, 0);
        drawPlainDoor(g, w / 2 - 0.2, h - 0.25, color, o.glass);
        g.translate(w / 2, 0);
        g.scale(-1, 1);
        drawPlainDoor(g, w / 2 - 0.2, h - 0.25, color, o.glass);
        g.restore();
      } else {
        drawPlainDoor(g, w - 0.5, h - 0.25, color, o.glass);
      }
    });
    kit.box(x, 0.2, 0.95, w + 1.2, 0.4, 1.9, o.step || '#cfc3ac');
  };
  kit.awning = (x, y, w, dep, c1, c2, n = 8) => {
    const tilt = 0.42;
    const len = dep / Math.cos(tilt);
    const m = kit.place(roundBoxGeo(w, 0.14, len, 0.05), stripeMat(c1, c2, n), x, y - (Math.tan(tilt) * dep) / 2, dep / 2, 1, 1, 1, inkThin);
    m.rotation.x = tilt;
    kit.place(roundBoxGeo(w, 0.62, 0.1, 0.04), stripeMat(c1, c2, n), x, y - Math.tan(tilt) * dep - 0.28, dep, 1, 1, 1, inkThin);
    for (const s of [-1, 1]) kit.box(x + s * (w / 2 - 0.2), y - Math.tan(tilt) * dep * 0.6, dep * 0.5, 0.12, 0.12, dep, '#8c6a50', 0);
  };
  kit.sign = (x, y, w, h, text, bg, fg = SIGN_INK) => {
    kit.box(x, y, 0.22, w, h, 0.34, bg, 2);
    kit.paint(x, y - h / 2, 0.41, w, h, g => drawText(g, text, 0, h / 2, w * 0.9, h * 0.86, fg));
  };
  // 벽에서 튀어나온 세로 간판. 양면에 글자
  kit.blade = (x, y, text, bg, fg = SIGN_INK) => {
    const h = 0.95 * [...text].length + 0.6;
    kit.box(x, y, 1.15, 0.26, h, 1.4, bg);
    kit.box(x, y + h * 0.3, 0.3, 0.14, 0.14, 0.7, '#6f5a4a', 0);
    kit.box(x, y - h * 0.3, 0.3, 0.14, 0.14, 0.7, '#6f5a4a', 0);
    for (const s of [-1, 1]) {
      kit.paint(x + s * 0.15, y - h / 2, 1.15, 1.4, h, g => drawVertical(g, text, 0, h - 0.3, 0.95, fg), (s * Math.PI) / 2);
    }
  };
  kit.lantern = (x, y, color = '#e88f7a') => {
    kit.box(x, y + 0.72, 0.5, 0.1, 0.3, 0.1, '#5a3b33', 0);
    kit.ball(x, y, 0.5, 0.48, 0.66, 0.48, color);
    kit.box(x, y + 0.6, 0.5, 0.5, 0.1, 0.5, '#5a3b33', 0);
    kit.box(x, y - 0.6, 0.5, 0.5, 0.1, 0.5, '#5a3b33', 0);
  };
  // 입구에 거는 노렌: 천 세 장
  kit.noren = (x, top, w, color, text) => {
    kit.box(x, top + 0.04, 0.45, w + 0.5, 0.12, 0.12, '#8c6a50', 0);
    const each = w / 3;
    for (let i = 0; i < 3; i++) kit.box(x - w / 2 + each * (i + 0.5), top - 0.72, 0.45, each - 0.08, 1.44, 0.07, color);
    if (text) kit.paint(x, top - 1.4, 0.5, w, 1.3, g => drawText(g, text, 0, 0.65, w * 0.8, 1, SIGN_INK));
  };
  kit.pipe = (x, h) => kit.cyl(x, h / 2, 0.16, 0.1, h, '#b4b0a6');

  /* ---------- 땅 위에 두는 것 ---------- */

  kit.tree = (x, z, s = 1, color = '#b7dca2') => {
    {
      const [wx, wz] = kit.toWorld(x, z);
      (window.__ghostBuild ? [] : (window.MAP_DECOR = window.MAP_DECOR || [])).push({ kind: 'tree', x: wx, z: wz });
    }
    kit.place(softLathe('trunk', [[0, 0], [1, 0], [0.62, 0.1], [0.42, 0.45], [0.36, 1], [0, 1]]), mat('#e6d5bb'), x, 0, z, 1.15 * s, 4.6 * s, 1.15 * s, inkBig);
    const canopy = kit.place(cached('blob', makeBlobGeometry), mat(color, leafTex), x, 6.6 * s, z, 3.8 * s, 3.5 * s, 3.8 * s, inkBig);
    canopy.rotation.y = x;
    kit.solidCircle(x, z, 0.9 * s);
  };
  kit.hedge = (x, z, w, d = 1.8) => {
    {
      const [wx, wz] = kit.toWorld(x, z);
      (window.__ghostBuild ? [] : (window.MAP_DECOR = window.MAP_DECOR || [])).push({ kind: 'hedge', x: wx, z: wz });
    }
    kit.place(cached('blob', makeBlobGeometry), mat('#9ccc98', leafTex), x, 0.7, z, w / 2, 1.2, d / 2, inkThin);
    kit.solidRect(x, z, w, d);
  };
  kit.planter = (x, z, c = '#f3a9bd') => {
    {
      const [wx, wz] = kit.toWorld(x, z);
      (window.__ghostBuild ? [] : (window.MAP_DECOR = window.MAP_DECOR || [])).push({ kind: 'planter', x: wx, z: wz });
    }
    kit.cyl(x, 0.5, z, 0.75, 1, '#c9a57c');
    kit.ball(x, 1.35, z, 0.72, 0.62, 0.72, '#9ccc98');
    for (let i = 0; i < 4; i++) kit.ball(x + rand(-0.45, 0.45), 1.5 + rand(0, 0.3), z + rand(0.15, 0.55), 0.16, 0.16, 0.16, c, 0);
    kit.solidCircle(x, z, 0.75);
  };
  kit.lamp = (x, z) => {
    {
      const [wx, wz] = kit.toWorld(x, z);
      (window.__ghostBuild ? [] : (window.MAP_DECOR = window.MAP_DECOR || [])).push({ kind: 'lamp', x: wx, z: wz });
    }
    kit.cyl(x, 3.3, z, 0.17, 6.6, '#7d6f64');
    kit.cyl(x, 0.3, z, 0.34, 0.6, '#6f6258');
    kit.ball(x, 6.95, z, 0.56, 0.62, 0.56, '#fff5cf');
    kit.cone(x, 7.35, z, 0.68, 0.46, '#7d6f64');
    kit.solidCircle(x, z, 0.3);
  };
  kit.bench = (x, z, ry = 0) => {
    {
      const [wx, wz] = kit.toWorld(x, z);
      const [ax, az] = kit.toWorld(x + 1, z);
      (window.__ghostBuild ? [] : (window.MAP_DECOR = window.MAP_DECOR || [])).push({ kind: 'bench', x: wx, z: wz, ry: ry + Math.atan2(-(az - wz), ax - wx) });
    }
    const s = kit.sub(x, z, ry);
    s.box(0, 0.6, 0, 4, 0.2, 1.2, '#c9a57c');
    s.box(0, 1.2, -0.52, 4, 0.8, 0.18, '#c9a57c');
    s.box(-1.7, 0.27, 0, 0.24, 0.54, 1, '#8c6a50');
    s.box(1.7, 0.27, 0, 0.24, 0.54, 1, '#8c6a50');
    kit.solidCircle(x, z, 1.5);
  };
  // 가게 앞 입간판
  kit.aBoard = (x, z, text, bg = '#6f5a4a', fg = '#fff8e6', ry = 0) => {
    {
      const [wx, wz] = kit.toWorld(x, z);
      (window.__ghostBuild ? [] : (window.MAP_DECOR = window.MAP_DECOR || [])).push({ kind: 'board', x: wx, z: wz, text });
    }
    const s = kit.sub(x, z, ry);
    const tilt = 0.14;
    s.box(0, 1.15, 0.3, 2, 2.3, 0.14, '#a9805c').rotation.x = -tilt;
    s.box(0, 1.15, -0.3, 2, 2.3, 0.14, '#a9805c').rotation.x = tilt;
    const face = s.paint(0, 0.2, 0.42, 1.7, 1.9, g => {
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(-0.85, 0, 1.7, 1.9, 0.1);
      g.fill();
      drawVertical(g, text, 0, 1.8, Math.min(0.5, 1.7 / [...text].length), fg);
    });
    face.rotation.x = -tilt;
    kit.solidCircle(x, z, 0.8);
  };
  kit.woodTable = (x, z) => {
    kit.box(x, 0.92, z, 3.2, 0.18, 2, '#d9b98a');
    for (const [sx, sz] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) kit.box(x + sx, 0.42, z + sz, 0.14, 0.84, 0.14, '#a98a66');
    for (const [sx, sz] of [[-1, -1.7], [1, -1.7], [-1, 1.7], [1, 1.7]]) kit.box(x + sx, 0.26, z + sz, 0.9, 0.52, 0.9, '#e3c9a0');
    kit.solidRect(x, z, 3.6, 2.2);
  };
  kit.roundTable = (x, z) => {
    kit.cyl(x, 0.98, z, 1.35, 0.14, '#fbfbf8');
    kit.cyl(x, 0.48, z, 0.1, 0.96, '#9a9a96');
    for (const s of [-1, 1]) {
      kit.box(x + s * 2, 0.56, z, 0.9, 0.1, 0.9, '#d9d7d0');
      kit.box(x + s * 2.42, 0.98, z, 0.1, 0.9, 0.9, '#b4b0a6');
      for (const [ax, az] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) kit.box(x + s * 2 + ax, 0.27, z + az, 0.08, 0.54, 0.08, '#8f8c88', 0);
    }
    kit.solidCircle(x, z, 1.6);
  };

  /* ---------- 지붕 얹기 ---------- */

  // y는 벽 윗면. type: gable(용마루가 정면과 나란함), front(박공이 정면을 봄), hip, flat
  kit.roof = (x, y, z, w, d, rh, color, type, wall, over = 1.4) => {
    if (type === 'flat') {
      kit.box(x, y + 0.45, z, w + 0.5, 0.9, d + 0.5, color, 2);
      kit.box(x, y + 0.55, z, w - 1, 0.9, d - 1, '#cfc8b8', 0);
      return;
    }
    const along = type !== 'front';
    const span = along ? d : w;
    const run = along ? w : d;
    const drop = (rh * over) / (span / 2 + over);
    const material = mat(color, roofTileTex);
    const m = kit.place(roofGeo(run + over * 2, span + over * 2, rh, type === 'hip'), material, x, y - drop + 0.34, z, 1, 1, 1, inkBig);
    if (!along) m.rotation.y = Math.PI / 2;
    if (type !== 'hip') {
      const wedge = kit.place(wedgeGeo(run, span, rh - drop - 0.05), mat(wall), x, y, z, 1, 1, 1, null);
      if (!along) wedge.rotation.y = Math.PI / 2;
    }
  };
  kit.chimney = (x, y, z) => {
    kit.box(x, y, z, 1.3, 2.6, 1.3, '#c4b6a2');
    kit.box(x, y + 1.4, z, 1.6, 0.3, 1.6, '#9a8c78');
  };

  // 벽돌을 쌓은 건물 한 채. 정면은 o.front(앞면 키트)로 꾸민다
  kit.shop = o => {
    const {
      w = 18, d = 16, h = 7.4, z = 0, wall = '#fbf3df', trim = '#a9805c', roof = '#bb8a76', roofType = 'gable', rh = 4.4,
      skin = 'plaster', base = '#b9ab96', door = '#c9a57c', label, signBg = '#fff4c2', signFg = SIGN_INK,
    } = o;
    kit.box(0, 0.35, z, w + 0.5, 0.7, d + 0.5, base);
    kit.bigBox(0, h / 2, z, w, h, d, wall, 0.3);
    kit.box(0, h - 0.18, z, w + 0.24, 0.36, d + 0.24, trim);
    kit.roof(0, h, z, w, d, rh, roof, roofType, wall);
    const front = kit.sub(0, z + d / 2);
    front.skin(0, h / 2, w - 0.6, h - 0.5, skin);
    if (o.sideWindows !== false) {
      for (const s of [-1, 1]) {
        const side = kit.sub((s * w) / 2, z, (s * Math.PI) / 2);
        side.skin(0, h / 2, d - 0.6, h - 0.5, skin);
        side.win(-d * 0.22, 3.4, 2.6, 2.6, { frame: trim });
        side.win(d * 0.22, 3.4, 2.6, 2.6, { frame: trim });
      }
    }
    if (o.front) {
      o.front(front);
    } else {
      front.door(0, 3.4, 4.8, door, { frame: trim });
      front.win(-w * 0.3, 3.1, 3.4, 2.8, { frame: trim });
      front.win(w * 0.3, 3.1, 3.4, 2.8, { frame: trim });
      if (label) front.sign(0, h - 1.05, Math.min(w * 0.72, 12), 1.4, label, signBg, signFg);
    }
    kit.solidRect(0, z, w + 0.5, d + 0.5);
  };

  // 앞이 트인 건물: 접수 창구, 인터넷 코너처럼 안이 보인다
  kit.booth = o => {
    const { w, d, h, z = 0, wall, inner, roof, roofType = 'hip', rh = 3.4, trim = '#a9805c', skin = 'plank' } = o;
    kit.box(0, 0.2, z, w + 0.4, 0.4, d + 0.4, '#c7b89f');
    kit.box(0, h / 2, z - d / 2 + 0.3, w, h, 0.6, inner, 1);
    for (const s of [-1, 1]) {
      kit.box((s * (w - 0.6)) / 2, h / 2, z, 0.6, h, d, wall, 2);
      const side = kit.sub((s * w) / 2, z, (s * Math.PI) / 2);
      side.skin(0, h / 2, d - 0.4, h - 0.4, skin);
      kit.solidRect((s * (w - 0.6)) / 2, z, 0.6, d);
    }
    kit.solidRect(0, z - d / 2 + 0.3, w, 0.6);
    kit.box(0, h - 1.2, z + d / 2 - 0.2, w, 1.5, 0.5, trim, 2);
    kit.box(0, h - 0.2, z + d / 2 - 0.2, w, 0.6, 0.4, wall, 0);
    kit.box(0, h + 0.1, z, w + 0.2, 0.2, d + 0.2, trim);
    // 안쪽 천장
    kit.box(0, h - 0.05, z, w - 0.8, 0.1, d - 0.4, '#a79c8e', 0);
    kit.roof(0, h, z, w, d, rh, roof, roofType, wall);
    return kit.sub(0, z + d / 2);
  };
  return kit;
}

/* ---------- 포장 ---------- */

function buildPavement(scene) {
  const tex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#f2e7c9';
    g.fillRect(0, 0, s, s);
    g.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = rand(0, s);
      const y = rand(0, s);
      const rx = rand(20, 70);
      const ry = rand(10, 30);
      g.fillStyle = 'rgba(214, 192, 150, .13)';
      // 타일 경계에서 잘리지 않게 건너편에도 같이 찍는다
      for (const ox of [-s, 0, s]) {
        for (const oy of [-s, 0, s]) {
          g.beginPath();
          g.ellipse(x + ox, y + oy, rx, ry, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.strokeStyle = 'rgba(122, 82, 69, .55)';
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = rand(0, s);
      const y = rand(0, s);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 18, y - 3, x + rand(28, 54), y + rand(-2, 2));
      g.stroke();
    }
  }, 1);
  const curbTex = canvasTexture(64, (g, s) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, s, s);
  });
  const material = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const edge = new THREE.MeshLambertMaterial({ map: curbTex, color: 0xc9b48c, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  ROADS.filter(r => r.paved).forEach((road, n) => {
    const lift = 0.09 + n * 0.012;
    const verts = [];
    const uvs = [];
    const index = [];
    const across = 6;
    let along = 0;
    const edgeVerts = [];
    const edgeIndex = [];
    const samples = [];
    walkPolyline(road.points, 3, (x, z) => samples.push([x, z]));
    samples.forEach(([x, z], i) => {
      const next = samples[Math.min(i + 1, samples.length - 1)];
      const prev = samples[Math.max(i - 1, 0)];
      const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
      const nx = -(next[1] - prev[1]) / len;
      const nz = (next[0] - prev[0]) / len;
      if (i) along += Math.hypot(x - samples[i - 1][0], z - samples[i - 1][1]);
      for (let k = 0; k <= across; k++) {
        const t = (k / across - 0.5) * road.w;
        const px = x + nx * t;
        const pz = z + nz * t;
        verts.push(px, heightAt(px, pz) + lift, pz);
        uvs.push(along / 12, t / 12);
      }
      for (const s of [-1, 1]) {
        for (const off of [0, 0.32]) {
          const t = s * (road.w / 2 - off);
          const px = x + nx * t;
          const pz = z + nz * t;
          edgeVerts.push(px, heightAt(px, pz) + lift + 0.02, pz);
        }
      }
      if (i < samples.length - 1) {
        const row = across + 1;
        for (let k = 0; k < across; k++) {
          const a = i * row + k;
          index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
        }
        const b = i * 4;
        edgeIndex.push(b, b + 4, b + 1, b + 1, b + 4, b + 5, b + 2, b + 3, b + 6, b + 3, b + 7, b + 6);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.receiveShadow = true;
    scene.add(mesh);
    const curb = new THREE.BufferGeometry();
    curb.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
    curb.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((edgeVerts.length / 3) * 2).fill(0.5), 2));
    curb.setIndex(edgeIndex);
    curb.computeVertexNormals();
    const curbMat = edge.clone();
    curbMat.side = THREE.DoubleSide;
    scene.add(new THREE.Mesh(curb, curbMat));
  });
  // 광장: 돌을 둥글게 깐 바닥
  const plazaTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#f4ead0';
    g.fillRect(0, 0, 1024, 1024);
    g.translate(512, 512);
    g.lineCap = 'round';
    for (const [r, n] of [[120, 14], [230, 26], [340, 38], [440, 48]]) {
      g.strokeStyle = 'rgba(122, 82, 69, .55)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(Math.cos(a) * (r - 104), Math.sin(a) * (r - 104));
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(90, 59, 51, .9)';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(0, 0, 505, 0, Math.PI * 2);
    g.stroke();
    const tex2 = new THREE.CanvasTexture(c);
    tex2.colorSpace = THREE.SRGBColorSpace;
    tex2.anisotropy = 8;
    return tex2;
  })();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshLambertMaterial({ map: plazaTex, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, heightAt(0, 0) + 0.2, 0);
  disc.receiveShadow = true;
  scene.add(disc);
}

/* ---------- 마을 건물 ---------- */

function ramenShop(k, label, signColor, signFg) {
  // 로와 야마는 같은 건물이다. 원작대로 간판 색만 다르다
  k.shop({
    w: 18, d: 16, h: 7.6, wall: '#f4ead4', roof: '#8d8f94', roofType: 'hip', rh: 4, trim: '#7d6250', base: '#8f8478',
    front: f => {
      f.sign(0, 6.4, 13, 1.9, label, signColor, signFg);
      f.door(0, 4, 4.7, '#d8c29a', { arch: false, double: true, glass: true, frame: '#7d6250', step: '#b7ab97' });
      f.noren(0, 4.7, 3.6, signColor, '');
      f.win(-6, 3, 3.6, 2.6, { frame: '#7d6250', curtain: '#efe6d2' });
      f.win(6, 3, 3.6, 2.6, { frame: '#7d6250', curtain: '#efe6d2' });
      f.lantern(-3.2, 4.6, signColor);
      f.lantern(3.2, 4.6, signColor);
      f.blade(8.6, 5, '라멘', signColor, signFg);
    },
  });
}

function stall(k, x, z, text, color, keeper, goods) {
  const s = k.sub(x, z);
  keeper(s);
  s.box(0, 0.75, 0, 9.4, 1.5, 3, '#c9a57c', 2);
  for (const [px, pz] of [[-4.5, -3.8], [4.5, -3.8], [-4.5, 1.4], [4.5, 1.4]]) s.box(px, 3.1, pz, 0.26, 6.2, 0.26, '#a98a66');
  const roof = s.place(roundBoxGeo(10.8, 0.2, 7, 0.06), stripeMat(color, '#fffaf0', 10), 0, 6.5, -1.2, 1, 1, 1, inkBig);
  roof.rotation.x = 0.16;
  s.place(roundBoxGeo(10.8, 0.7, 0.12, 0.04), stripeMat(color, '#fffaf0', 10), 0, 5.65, 2.3, 1, 1, 1, inkThin);
  s.box(0, 7.5, -0.5, 6.4, 1.3, 0.24, '#fff8e6', 2);
  s.paint(0, 6.88, -0.36, 6, 1.24, g => drawText(g, text, 0, 0.62, 5.4, 1.08, SIGN_INK));
  goods(s);
  k.solidRect(x, z - 1, 10, 6);
}

Object.assign(BUILDERS, {
  plaza(k) {
    // 합격발표 게시판: 이 광장의 주인공. 모두가 모여 확인한다
    const board = k.sub(0, -21);
    board.box(-8.4, 2.8, 0, 0.5, 5.6, 0.5, '#a98a66', 2);
    board.box(8.4, 2.8, 0, 0.5, 5.6, 0.5, '#a98a66', 2);
    board.box(0, 4.6, 0, 16.6, 6, 0.42, '#c29c74', 2);
    const roof = board.place(roofGeo(18.6, 2.6, 0.9, false), mat('#a57e5a', roofTileTex), 0, 7.6, 0, 1, 1, 1, inkBig);
    roof.castShadow = true;
    board.paint(0, 1.8, 0.24, 16, 5.6, g => {
      drawBoard(g, 0, 4.85, 8, 1.15, '합격 발표', '#fffdf4');
      for (let i = 0; i < 40; i++) {
        const x = -6.9 + (i % 10) * 1.53;
        const y = 3.6 - Math.floor(i / 10) * 0.86;
        g.fillStyle = '#fffdf4';
        g.fillRect(x - 0.64, y - 0.31, 1.28, 0.62);
        g.strokeStyle = SIGN_INK;
        g.lineWidth = 0.035;
        g.strokeRect(x - 0.64, y - 0.31, 1.28, 0.62);
        inkPath(g, [[x - 0.34, y + 0.06], [x + 0.34, y + 0.06]], 0.05);
        inkPath(g, [[x - 0.34, y - 0.12], [x + 0.14, y - 0.12]], 0.04);
      }
    });
    k.solidRect(0, -21, 17, 1);
    for (const [x, z, c] of [[-4.6, -16.4], [-0.6, -17], [3.8, -16], [6.8, -14.6, '#c4c0b6']]) k.kid(x, z, c);
    // 음악이 흐르는 스피커 기둥
    k.cyl(19, 4.8, -13, 0.3, 9.6, '#b3b2ad');
    const left = k.cone(20.1, 8.8, -13, 0.9, 1.6, '#d8d6cc');
    left.rotation.z = -1.3;
    const right = k.cone(17.9, 8.8, -13, 0.9, 1.6, '#d8d6cc');
    right.rotation.z = 1.3;
    k.solidCircle(19, -13, 0.5);
    k.tree(-20, -12, 1.6);
    k.tree(21, 15, 1.35, '#c1e2a8');
    // 칭찬해 달라고 어슬렁거리는 모몽가
    k.npc('momonga', 11, -8, { expression: 'm-proud', wander: 9 });
    k.bench(-11, 19, Math.PI);
    k.bench(9, 21, Math.PI);
    k.bench(-22, 7, Math.PI / 2);
  },

  reception(k) {
    // 앞이 트인 나무 창구. 요로이씨가 안에 서 있고, 팻말 꽂이가 옆에 선다
    const f = k.booth({ w: 24, d: 12, h: 7, wall: '#d9bb8e', inner: '#a18f7c', roof: '#a5805f', roofType: 'gable', rh: 3.6 });
    f.paint(0, 5.1, 0.08, 15, 1.4, g => drawText(g, '노동 접수처', 0, 0.7, 13.4, 1.2, '#fff8e6'));
    k.npc('yoroi-labor', -3, 0.6, { r: 0 });
    k.npc('yoroi-boss', -10, -1, { r: 0 });
    k.box(-3, 0.6, 3.6, 18, 1.2, 2, '#b98f68', 2);
    k.box(-3, 1.3, 3.6, 18.6, 0.2, 2.4, '#d9bb8e');
    k.solidRect(-3, 3.6, 18, 2);
    // 호출 종
    k.cone(1.4, 1.4, 3.6, 0.42, 0.68, '#e3cf88');
    k.ball(1.4, 2.14, 3.6, 0.1, 0.1, 0.1, '#7d6250');
    // 목제 노동 플레이트 꽂이: 선착순으로 집어 간다
    const rack = k.sub(17.5, 2.6);
    rack.box(0, 3, 0, 6.6, 6, 0.5, '#a97c50', 2);
    rack.box(-3, 1, 0, 0.36, 2, 0.36, '#8c6a46');
    rack.box(3, 1, 0, 0.36, 2, 0.36, '#8c6a46');
    rack.paint(0, 0.2, 0.28, 6.2, 5.6, g => {
      drawText(g, '오늘의 노동', 0, 5.1, 5.4, 0.74, '#fff8e6');
      ['토벌', '풀뽑기', '채집'].forEach((t, i) => {
        const y = 3.9 - i * 1.42;
        drawBoard(g, -1.5, y, 2.7, 1.08, t, '#efd5a2');
        drawBoard(g, 1.5, y, 2.7, 1.08, t, '#efd5a2');
      });
    });
    k.solidRect(17.5, 2.6, 6.6, 0.6);
    k.tree(-18, 7, 1.15);
  },

  exam(k) {
    // 회색 블록 벽에 흰 세로 현수막. 사진 그대로의 인상
    k.shop({
      w: 28, d: 18, h: 9.4, wall: '#bdbab4', roof: '#a7a39b', roofType: 'flat', trim: '#8d897f', base: '#8d897f', skin: 'block', sideWindows: false,
      front: f => {
        f.box(-9, 5.5, 0.16, 3.8, 7.6, 0.2, '#fffdf6', 2);
        f.paint(-9, 1.7, 0.28, 3.6, 7.6, g => drawVertical(g, '풀뽑기검정', 0, 7.3, 1.36, '#6b4a3c'));
        f.door(1, 6, 5.2, '#c8b89c', { arch: false, double: true, frame: '#7d7468', step: '#c4beb2' });
        f.win(9.4, 4, 5, 3.4, { frame: '#7d7468' });
        f.box(1, 6, 0.8, 8, 0.2, 1.6, '#a7a39b');
      },
    });
    for (const s of [-1, 1]) {
      const side = k.sub((s * 28) / 2, 0, (s * Math.PI) / 2);
      side.skin(0, 4.7, 17.4, 8.8, 'block');
      side.win(-4.5, 4.6, 4, 3.4, { frame: '#7d7468' });
      side.win(4.5, 4.6, 4, 3.4, { frame: '#7d7468' });
    }
    k.post(10, 14, '시험 회장');
    k.kid(-3, 12.5);
    k.kid(-0.6, 13.6, '#c4c0b6');
  },

  arbiter(k) {
    k.shop({ w: 20, d: 14, h: 7.6, wall: '#fff5d6', roof: '#d9a077', roofType: 'gable', label: '슈퍼 알바이터 시험장', signBg: '#f7dd85' });
    k.planter(-11.5, 9);
    k.planter(11.5, 9);
  },

  market(k) {
    // 노점이 모인 장터: 포셰트 요로이씨의 옷 노점과 후루혼야의 중고책 노점
    stall(k, -11, -6, '포셰트', '#f3bcc8', s => s.npc('yoroi-pochette', 0, -2.4, { r: 0 }), s => {
      s.box(0, 3.9, 1.3, 8.2, 0.12, 0.12, '#8c6a50', 0);
      for (let i = 0; i < 5; i++) {
        const x = -3.2 + i * 1.6;
        s.ball(x, 2.9, 1.3, 0.55, 0.45, 0.2, ['#e6a79a', '#a8c6e0', '#e8c97c', '#b7d6a5', '#d9b8e4'][i]);
        s.box(x, 3.5, 1.3, 0.06, 0.8, 0.06, '#8c6a50', 0);
      }
      for (let i = 0; i < 3; i++) s.box(-3 + i * 3, 1.6, 0.3, 2.2, 0.2, 1.6, ['#f3d7dc', '#d8e7f2', '#f4e7bf'][i]);
    });
    // 후루혼야는 키가 작아 노점 앞에서 책을 읽는다
    stall(k, 11, -6, '헌책방', '#cbbce6', s => s.npc('furuhonya', -3.2, 3.2, { expression: 'f-read' }), s => {
      for (let i = 0; i < 6; i++) {
        const x = -3.6 + i * 1.45;
        for (let n = 0; n < 1 + (i % 3); n++) s.box(x, 1.62 + n * 0.28, 0.2, 1.1, 0.24, 1.5, ['#e8c97c', '#a8c6e0', '#e6a79a', '#b7d6a5'][(i + n) % 4]);
      }
    });
    stall(k, 0, -6, '타코야키', '#e38a7c', s => s.npc('yoroi-takoyaki', 0, -2.4, { r: 0 }), s => {
      for (let i = 0; i < 5; i++) s.ball(-2.4 + i * 1.2, 1.7, 0.3, 0.42, 0.34, 0.42, '#d9a05c');
    });
    k.npc('yoroi-tofu', -4, 12);
    // 약국은 지도에서 빠져 있어 장터에 나와 있다. 원작 자료대로 등을 보이고 선다
    k.npc('yoroi-pharmacy', 15, 12, { ry: Math.PI });
    // 만국기 줄
    k.cyl(-23, 3.9, 8, 0.16, 7.8, '#a98a66');
    k.cyl(23, 3.9, 8, 0.16, 7.8, '#a98a66');
    k.solidCircle(-23, 8, 0.25);
    k.solidCircle(23, 8, 0.25);
    k.paint(0, 5.2, 8, 46, 2.8, g => {
      inkPath(g, [[-23, 2.6], [-12, 1.5], [0, 1.2], [12, 1.5], [23, 2.6]], 0.05);
      for (let i = 0; i < 22; i++) {
        const x = -21 + i * 2;
        const y = 2.55 - (1 - (x / 23) ** 2) * 1.32;
        g.fillStyle = ['#f3bcc8', '#b7dca2', '#a8c6e0', '#f4e29c'][i % 4];
        g.beginPath();
        g.moveTo(x - 0.5, y);
        g.lineTo(x + 0.5, y);
        g.lineTo(x, y - 0.9);
        g.closePath();
        g.fill();
        g.strokeStyle = SIGN_INK;
        g.lineWidth = 0.04;
        g.stroke();
      }
    });
    k.bench(0, -15);
    k.tree(-22, -16, 1.2);
    k.kid(-5, 6);
    k.kid(6, 10, '#c4c0b6');
  },

  internet(k) {
    // 공용 PC 몇 대가 놓인 작은 공간
    const f = k.booth({ w: 16, d: 12, h: 6.6, wall: '#e6ecf3', inner: '#cfd8e4', roof: '#9fb2cd', trim: '#7f96b8', skin: 'plaster' });
    f.paint(0, 4.7, 0.08, 14, 1.4, g => drawText(g, '인터넷 코너', 0, 0.7, 12, 1.14, '#fff'));
    for (let i = 0; i < 3; i++) {
      const x = -4.6 + i * 4.6;
      k.box(x, 1.2, -3, 3.8, 0.2, 2, '#c9a57c');
      for (const s of [-1, 1]) k.box(x + s * 1.7, 0.6, -3, 0.18, 1.2, 1.8, '#a98a66');
      k.box(x, 2.3, -3.4, 2.2, 1.6, 0.22, '#55585f');
      k.paint(x, 1.6, -3.27, 2, 1.4, g => {
        g.fillStyle = '#cfe7f2';
        g.fillRect(-1, 0, 2, 1.4);
      });
      k.box(x, 1.36, -2.6, 1.6, 0.1, 0.6, '#e8e6df');
      k.box(x, 0.45, -1, 1, 0.9, 1, '#9fb2cd');
      k.solidRect(x, -3, 3.8, 2);
    }
    k.kid(-4.6, -0.8);
    k.planter(9.6, 7.6, '#a8c6e0');
  },

  ramenRo(k) {
    ramenShop(k, '라멘 로', '#f6d656', SIGN_INK);
    // 늘 줄이 서는 가게
    k.npc('yoroi-ramen', 6.2, 10.6);
    for (let i = 0; i < 4; i++) k.kid(-4 - i * 1.9, 10.6, i % 2 ? '#c4c0b6' : '#aeb6bd');
    k.portal(0, 10.2, 3.2, '라멘 로 들어가기', { room: 'ramen' });
  },
  ramenYama(k) {
    ramenShop(k, '라멘 야마', '#d05a50', '#fff');
    k.npc('yoroi-takoyaki', 6.2, 10.6, { label: '라멘 야마 요로이' });
  },

  umaCurry(k) {
    k.shop({
      w: 18, d: 16, h: 7.4, wall: '#f7e8c8', roof: '#c88e5e', roofType: 'gable', trim: '#9c6d46',
      front: f => {
        f.sign(0, 6.3, 12, 1.7, '우마카레', '#e8894e', '#fff');
        f.door(-5.8, 3.2, 4.7, '#b98658', { frame: '#9c6d46' });
        // 카운터석이 보이는 긴 창
        f.win(2.6, 3.2, 10.4, 3, { frame: '#9c6d46' });
        f.awning(2.6, 5.15, 11.4, 1.6, '#e8894e', '#fff4dd');
        f.blade(-8.6, 5, '카레', '#e8894e', '#fff');
      },
    });
    // 메뉴는 귀신 얼굴 카레 하나
    const menu = k.sub(-9.4, 11);
    menu.box(0, 1.5, 0, 2.8, 3, 0.2, '#6f5a4a', 1);
    menu.paint(0, 0.1, 0.14, 2.6, 2.8, g => {
      g.fillStyle = '#2f2a2a';
      g.beginPath();
      g.arc(0, 1.75, 1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c98a3e';
      g.beginPath();
      g.arc(0, 1.75, 0.82, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ee7fa8';
      g.beginPath();
      g.ellipse(0, 1.72, 0.5, 0.42, 0, 0, Math.PI * 2);
      g.fill();
      inkPath(g, [[-0.2, 1.8], [-0.18, 1.78]], 0.09);
      inkPath(g, [[0.2, 1.8], [0.18, 1.78]], 0.09);
      drawText(g, '귀신 카레', 0, 0.4, 2.3, 0.6, '#fff8e6');
    });
    k.solidCircle(-9.4, 11, 0.7);
  },

  umaiya(k) {
    // 정식집 겸 주점: 나무 건물과 처마의 등, 바깥 자리
    k.shop({
      w: 20, d: 16, h: 7.4, wall: '#e7cda5', roof: '#a56f58', roofType: 'gable', trim: '#7d5a44', skin: 'plank', door: '#a57e5a',
      front: f => {
        f.sign(0, 6.3, 11, 1.7, '우마이야', '#c9604f', '#fff');
        f.door(0, 4, 4.7, '#b98f68', { arch: false, double: true, frame: '#7d5a44' });
        f.noren(0, 4.7, 3.6, '#c9604f', '');
        f.win(-6.8, 3.1, 3.6, 2.6, { frame: '#7d5a44' });
        f.win(6.8, 3.1, 3.6, 2.6, { frame: '#7d5a44' });
        f.lantern(-3.8, 4.8, '#e88f7a');
        f.lantern(3.8, 4.8, '#e88f7a');
      },
    });
    k.woodTable(-13, 10);
    k.npc('kurimanju', -16.4, 10, { expression: 'k-drunk', ry: Math.PI / 2 });
    k.tree(14.5, 9, 1.05);
  },

  kissa(k) {
    // 조용한 찻집. 화려하게 만들지 않는다
    k.shop({
      w: 16, d: 15, h: 7, wall: '#c6ad95', roof: '#7f6a59', roofType: 'front', rh: 5, trim: '#584a42', skin: 'plank', base: '#7d7166',
      front: f => {
        f.door(-3.4, 3.2, 4.6, '#6f5848', { frame: '#584a42' });
        f.win(3.2, 3.3, 5, 3.2, { frame: '#584a42', curtain: '#efe6d2' });
        f.box(-3.4, 6, 0.25, 4, 1.3, 0.3, '#584a42', 1);
        f.paint(-3.4, 5.35, 0.42, 4, 1.3, g => drawText(g, '찻집', 0, 0.65, 3.4, 1.05, '#f4e3c4'));
      },
    });
    k.npc('yoroi-kissa', 7, 10.5);
    k.planter(-8.2, 9.2, '#fff4e0');
  },

  mitsuboshi(k) {
    // 건물은 흔한 가게 그대로. 고급스러워 보이는 간판만이 함정이다
    k.shop({
      w: 18, d: 16, h: 7.4, wall: '#f6eedb', roof: '#b4a792', roofType: 'gable',
      front: f => {
        f.box(0, 6.25, 0.25, 15, 2, 0.34, '#2f2a33', 2);
        f.paint(0, 5.25, 0.44, 15, 2, g => {
          drawText(g, '★★★', 0, 1.56, 5, 0.7, '#f3d27a');
          drawText(g, '미츠보시 레스토랑', 0, 0.68, 13.4, 1, '#f3d27a');
        });
        f.door(0, 3.4, 4.7, '#c9a57c');
        f.win(-5.8, 3.1, 3.4, 2.8, { curtain: '#fff' });
        f.win(5.8, 3.1, 3.4, 2.8, { curtain: '#fff' });
      },
    });
    k.roundTable(-6, 11);
    k.roundTable(6.4, 11);
  },

  mucha(k) {
    // 거리에서 가장 큰 건물. 지하주차장까지 있다
    const w = 70;
    const d = 40;
    const h = 13;
    k.box(0, 0.35, 0, w + 0.6, 0.7, d + 0.6, '#b9ab96');
    k.bigBox(0, h / 2, 0, w, h, d, '#fff8ea', 0.5);
    k.roof(0, h, 0, w, d, 0, '#e8e2d2', 'flat');
    // 옥상 설비
    k.bigBox(-18, h + 2, -6, 8, 3, 6, '#d6d2c6', 0.4);
    k.bigBox(14, h + 1.7, 4, 5, 2.4, 5, '#d6d2c6', 0.4);
    const f = k.sub(0, d / 2);
    f.skin(0, h / 2, w - 1, h - 0.6, 'plaster');
    // 초록과 하양, 파랑의 큰 간판
    f.box(-4, 10.8, 0.3, 40, 3.6, 0.5, '#fffdf6', 2);
    f.paint(-4, 9, 0.58, 40, 3.6, g => {
      g.fillStyle = '#b5d97f';
      g.fillRect(-20, 2.8, 40, 0.8);
      g.fillStyle = '#8dbcd8';
      g.fillRect(-20, 0, 40, 0.5);
      drawText(g, '무차우마켓', 0, 1.65, 26, 2.3, '#55803f');
    });
    // 넓은 유리 앞면과 자동문
    f.win(-16, 4.2, 15, 5.8, { frame: '#7fa86a' });
    f.win(8, 4.2, 15, 5.8, { frame: '#7fa86a' });
    f.win(-4, 3.2, 8, 5.6, { frame: '#7fa86a', bars: false });
    f.box(-4, 3.2, 0.12, 0.16, 5.4, 0.1, '#7fa86a', 0);
    f.box(-4, 0.2, 2, 10, 0.4, 4, '#cfc3ac');
    f.awning(-4, 8.4, 40, 2.6, '#b5d97f', '#fffdf6', 20);
    // 쇼핑 카트
    for (let i = 0; i < 4; i++) {
      k.box(-20 + i * 1.3, 1.1, d / 2 + 3, 1.1, 0.9, 1.7, '#c5ccd2');
    }
    k.solidRect(-18, d / 2 + 3, 5.6, 1.8);
    k.solidRect(0, 0, w + 0.6, d + 0.6);
    // 지하주차장 입구: 내려가는 경사로와 차단기
    const ramp = k.sub(26, d / 2 + 0.2);
    ramp.box(-6.4, 2.3, 4.6, 1, 4.6, 9.4, '#d6d2c6', 1);
    ramp.box(6.4, 2.3, 4.6, 1, 4.6, 9.4, '#d6d2c6', 1);
    ramp.box(0, 4.9, 2, 13.8, 0.8, 4.4, '#d6d2c6', 1);
    const hole = new THREE.Mesh(unitPlane, shadeMat);
    hole.position.set(0, 2.2, 0.1);
    hole.scale.set(11.8, 4.4, 1);
    ramp.group.add(hole);
    ramp.box(0, 5.9, 4.3, 9, 1.3, 0.3, '#8ea4c4', 2);
    ramp.paint(0, 5.25, 4.47, 8.6, 1.3, g => drawText(g, '지하주차장', 0, 0.65, 7.8, 1.1, '#fff'));
    const floor = new THREE.Mesh(unitPlane, shadeMat);
    floor.rotation.x = -Math.PI / 2 - 0.06;
    floor.position.set(0, 0.12, 4.6);
    floor.scale.set(11.8, 9, 1);
    ramp.group.add(floor);
    ramp.box(-5.6, 0.75, 9.7, 0.4, 1.5, 0.4, '#f0c44c');
    ramp.box(-0.8, 1.4, 9.7, 9.4, 0.18, 0.18, '#f0c44c', 1);
    k.solidRect(19.4, d / 2 + 4.8, 1, 9.4);
    k.solidRect(32.4, d / 2 + 4.8, 1, 9.4);
    k.solidRect(26, d / 2 + 2, 13.8, 4.4);
    k.kid(-11, d / 2 + 5);
    // 입구 앞의 판촉 요로이들
    k.npc('yoroi-pudding', 6, d / 2 + 6);
    k.npc('yoroi-dars', 11, d / 2 + 6);
  },

  home(k) {
    // 흰색 일색의 돔 단독주택. 현관 표지판에 치이카와 얼굴. 집 앞 공터는 넓게
    k.ball(0, 0, 0, 11.5, 10.8, 11.5, '#fffdf8', 2);
    k.solidCircle(0, 0, 11.2);
    // 십자 창틀: 돔 곡면에 붙인다
    const pane = k.sub(-4.3, 9.4, -0.42, 3.2);
    pane.win(0, 2.2, 2.9, 2.5, { frame: '#d3ad82' });
    const pane2 = k.sub(5.6, 8.5, 0.58, 3.2);
    pane2.win(0, 2.2, 2.9, 2.5, { frame: '#d3ad82' });
    // 현관
    k.bigBox(0, 2.5, 10.6, 4.6, 5, 1.8, '#fffdf8', 0.7);
    const entry = k.sub(0, 11.5);
    entry.door(0, 3, 4.1, '#f7efdc', { frame: '#e8dcc2', step: '#e6dcc6' });
    k.solidRect(0, 10.6, 4.6, 1.8);
    // 표지판
    k.box(5.6, 1.2, 14, 0.26, 2.4, 0.26, '#b98f68');
    k.solidCircle(5.6, 14, 0.3);
    k.ball(5.6, 3.1, 14, 1.1, 0.92, 0.16, '#fffdf8');
    k.ball(5.14, 3.8, 14, 0.22, 0.22, 0.1, '#fffdf8');
    k.ball(6.06, 3.8, 14, 0.22, 0.22, 0.1, '#fffdf8');
    k.paint(5.6, 2.3, 14.18, 1.8, 1.5, g => {
      for (const s of [-1, 1]) {
        g.fillStyle = '#2b1b1b';
        g.beginPath();
        g.arc(s * 0.33, 0.82, 0.1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f5bccb';
        g.beginPath();
        g.ellipse(s * 0.58, 0.6, 0.18, 0.1, 0, 0, Math.PI * 2);
        g.fill();
      }
      inkPath(g, [[-0.11, 0.6], [0, 0.53], [0.11, 0.6]], 0.045);
    });
    k.portal(0, 14, 3.6, '집 들어가기', { room: 'home' });
    // 사진처럼 이웃의 돔 집들이 떨어져 서 있다 (표지판은 치이카와 집에만)
    for (const [x, z, r, ry] of [[-27, -7, 9, 0.3], [25, -13, 10, -0.3], [-14, -27, 8, 0.1]]) {
      k.ball(x, 0, z, r, r * 0.94, r, '#fffaf0', 2);
      k.solidCircle(x, z, r * 0.96);
      const s = k.sub(x + Math.sin(ry) * r * 0.88, z + Math.cos(ry) * r * 0.8, ry, r * 0.2);
      s.win(0, 2, 2.4, 2.2, { frame: '#d3ad82' });
    }
  },

  // 동네의 주택. 간판도 시설도 없는 평범한 집
  cottage(k, p) {
    const looks = [
      { wall: '#fff6e4', roof: '#d09a86', roofType: 'gable' },
      { wall: '#f3f4e6', roof: '#94b9a6', roofType: 'front' },
      { wall: '#fde9e2', roof: '#b99ab8', roofType: 'gable' },
      { wall: '#eef2f4', roof: '#9fb2cd', roofType: 'front' },
    ];
    const look = looks[p.v % looks.length];
    k.shop({
      w: 13, d: 11, h: 5.6, rh: 3.8, ...look,
      front: f => {
        f.door(-2.6, 2.8, 4.1, '#c9a57c');
        f.win(2.7, 3, 3.2, 2.4, { flowers: '#f3a9bd' });
        f.pipe(6.1, 5.2);
      },
    });
    k.chimney(3.4, 8, -2);
    k.hedge(-9.2, 2, 4.4);
    if (p.v % 2) k.tree(9.2, -2, 0.85);
  },

  // 작은 둥근 집: 치이카와의 집과 같은 모양의 이웃
  hut(k, p) {
    const r = p.r;
    k.ball(0, 0, 0, r, r * 0.94, r, '#fffaf0', 2);
    const door = k.sub(0, r * 0.98);
    door.door(0, 2.2, 3.2, '#f7efdc', { frame: '#e8dcc2', step: '#e6dcc6' });
    const win = k.sub(-r * 0.62, r * 0.68, -0.7, r * 0.22);
    win.win(0, 1.5, 1.8, 1.6, { frame: '#d3ad82' });
    k.solidCircle(0, 0, r * 0.96);
  },

  // 주민 개인 집
  momongaHome(k, p) { BUILDERS.cottage(k, p); },
  shisaHome(k, p) { BUILDERS.cottage(k, p); },
  rakkoHome(k, p) { BUILDERS.cottage(k, p); },
  kurimanjuHome(k, p) { BUILDERS.cottage(k, p); },
  furuhonyaHome(k, p) { BUILDERS.cottage(k, p); },

  // 이전 월드의 집을 그대로 쓴다 (GLB로 바뀌지 않은 동네 풍경)
  oldHouse(k, p) { BUILDERS.cottage(k, p); },

  // 마을 거리의 풍경 (좌표는 광장 기준)
  streetScape(k) {
    // 가로등은 가게 입구를 가리지 않게 건물 사이에만 세운다
    for (const x of [62, 114, 162, 214]) {
      k.lamp(x, -11.2);
      k.lamp(x, 11.2);
    }
    // 가게 사이의 나무와 낮은 화단: 건물끼리 숨 쉴 틈
    for (const [x, z, s] of [[64, -22, 1.1], [160, -28, 1.25], [112, 24, 1.15], [162, 24, 1.05], [214, -24, 1.3], [214, 22, 1.15], [60, 24, 1]]) k.tree(x, z, s);
    k.hedge(160, -18, 7);
    k.hedge(112, 16, 6);
    k.hedge(214, 16, 7);
    k.bench(162, 15.5, Math.PI);
    // 주택가로 가는 길가
    for (const x of [-42, -78]) k.lamp(x, -7);
    k.lamp(-60, 7);
    for (const z of [-44, -78]) k.lamp(-7, z);
    k.lamp(7, 52);
    k.tree(-96, -14, 1.2);
    k.tree(-14, 62, 1.1);
    k.tree(14, 74, 1.2);

    // 광장 둘레: 네 귀퉁이의 가로등과 나무, 쉬어 가는 벤치
    for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) k.lamp(x, z);
    for (const [x, z, s] of [[-34, -14, 1.3], [34, 15, 1.2], [-20, 36, 1.1]]) k.tree(x, z, s);
    k.bench(-33, 6, Math.PI / 2);
    k.bench(33, -10.6, 0);

    // 가게 앞: 입간판과 화분. 입구를 막지 않게 옆으로 비켜 둔다
    for (const [x, z, text, ry] of [[73, 15, '라멘', Math.PI], [116, -15, '귀신카레', 0], [116, 15, '정식', Math.PI], [162, -15, '찻집', 0], [152, 15, '과자', Math.PI], [31, 15, '소바', Math.PI]]) k.aBoard(x, z, text, undefined, undefined, ry);
    for (const [x, z, c] of [[96, 15, '#f3a9bd'], [138, -15, '#fff4e0'], [138, 15, '#f3a9bd'], [184, -15, '#a8c6e0'], [184, 15, '#f3a9bd'], [52, -14, '#a8c6e0']]) k.planter(x, z, c);

    // 샛길과 주택가, 선착장 길의 가로등
    for (const z of [-30, -50]) k.lamp(113, z);
    for (const [x, z] of [[-110, 8], [-133.5, 22], [-122, 56], [-122, 78]]) k.lamp(x, z);
    for (const [x, z] of [[8, 92], [-8, 124], [8, 156], [-8, 190], [8, 226], [-8, 262]]) k.lamp(x, z);
    for (const [x, z, s] of [[-13, 108, 1.1], [13, 128, 1.2], [-13, 170, 1.15], [13, 186, 1], [-13, 216, 1.2], [13, 246, 1.1], [-118, -14, 1.1], [-140, 12, 1.2]]) k.tree(x, z, s);

    // 길목의 나무 푯말
    k.post(-104, -9, '주택가');
    k.post(116, -13, '온천 골목');
    k.post(9, 78, '선착장');
    k.post(9, -89.5, '숲');
  },

  /* ---------- 외곽의 특수한 집 ---------- */

  // 산속의 낡은 나무집. 사진의 판자벽 그대로
  yamanba(k) {
    k.shop({
      w: 20, d: 14, h: 6.6, rh: 5, wall: '#a98a68', roof: '#7f7264', roofType: 'gable', trim: '#5f4a3a', skin: 'plank', base: '#8d897f', door: '#7f6450',
      front: f => {
        f.door(0, 3.4, 4.6, '#7f6450', { arch: false, frame: '#5f4a3a' });
        f.win(-6, 3.2, 3, 2.4, { frame: '#5f4a3a' });
        f.win(6, 3.2, 3, 2.4, { frame: '#5f4a3a' });
      },
    });
    k.chimney(5, 9, -2);
    k.box(-11.4, 0.5, 8.6, 3, 1, 1.4, '#b98f68');
    k.solidRect(-11.4, 8.6, 3, 1.4);
    k.npc('yamanba', 5.4, 9.6);
  },
  // 돌을 깎는 방
  hiroma(k) {
    k.shop({
      w: 24, d: 15, h: 7.6, rh: 4.4, wall: '#d9cfbb', roof: '#6f6962', roofType: 'hip', trim: '#6b5b4e', base: '#8d897f',
      front: f => {
        f.sign(0, 6.4, 8, 1.5, '히로마', '#4f4842', '#f4e3c4');
        f.door(0, 4.2, 4.7, '#8a6d55', { arch: false, double: true, frame: '#6b5b4e' });
        f.win(-7.6, 3.2, 3.6, 2.6, { frame: '#6b5b4e' });
        f.win(7.6, 3.2, 3.6, 2.6, { frame: '#6b5b4e' });
      },
    });
    for (const [x, z, r] of [[-10, 11, 1.2], [-6.6, 12, 0.7], [8, 11, 1.4], [11, 9.6, 0.8]]) {
      k.ball(x, r * 0.6, z, r, r * 0.8, r, '#bcb7ad');
      k.solidCircle(x, z, r);
    }
  },

  /* ---------- 온천과 사우나 ---------- */

  onsen(k) {
    k.shop({
      w: 30, d: 12, h: 7.2, z: -12, wall: '#ecd9b6', roof: '#8f7a69', roofType: 'gable', rh: 4, trim: '#7d5a44', skin: 'plank',
      front: f => {
        f.sign(0, 6.1, 11, 1.7, '♨ 온천', '#d98f78', '#fff');
        f.door(0, 4.6, 4.8, '#b98f68', { arch: false, double: true, frame: '#7d5a44' });
        f.noren(0, 4.8, 4.2, '#7f9ec2', '');
        f.win(-9.6, 3.2, 4, 2.6, { frame: '#7d5a44' });
        f.win(9.6, 3.2, 4, 2.6, { frame: '#7d5a44' });
      },
    });
    // 나무 울타리로 둘러싼 항아리탕. 사진처럼 초록과 파랑 항아리, 자갈 바닥
    k.cyl(0, 0.05, 6, 16, 0.08, '#c9c4b8', 2);
    for (let i = 0; i < 60; i++) {
      const a = rand(0, Math.PI * 2);
      const d = Math.sqrt(rand()) * 15;
      k.ball(Math.cos(a) * d, 0.12, 6 + Math.sin(a) * d, 0.2, 0.08, 0.14, '#8d897f', 0);
    }
    for (const [x, z, c] of [[-9, 4, '#7fb08a'], [9, 4, '#6f97bb']]) {
      k.cyl(x, 1.3, z, 3, 2.6, c, 2);
      k.cyl(x, 2.62, z, 2.6, 0.05, '#b4e4f0', 0);
      steam(k, x, 3.2, z);
      k.solidCircle(x, z, 3.1);
    }
    k.cyl(-3, 0.7, 12, 0.9, 1.4, '#b98f68');
    k.solidCircle(-3, 12, 0.9);
    k.portal(0, -3.2, 3.2, '온천 들어가기', { room: 'onsen' });
  },
  sauna(k) {
    k.shop({
      w: 15, d: 12, h: 6.4, rh: 3.4, wall: '#d3b08c', roof: '#9b7f64', roofType: 'gable', trim: '#7d5a44', skin: 'plank',
      front: f => {
        f.sign(0, 5.4, 8, 1.4, '사우나', '#fffdf4');
        f.door(0, 3, 4.2, '#a57e5a', { arch: false, frame: '#7d5a44' });
        f.win(-5, 2.8, 2.4, 2, { frame: '#7d5a44' });
      },
    });
    k.chimney(3.5, 8.6, -2);
    steam(k, 3.5, 10.4, -2);
    // 냉탕
    k.cyl(4.6, 0.7, 9.6, 3, 1.4, '#b5bcc2', 2);
    k.cyl(4.6, 1.42, 9.6, 2.6, 0.04, '#c6eeff', 0);
    k.solidCircle(4.6, 9.6, 3.1);
    k.post(-0.6, 11, '냉탕');
  },
});
