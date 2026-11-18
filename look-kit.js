'use strict';

// 먼작귀 빌리지 — 아이 꾸미기 부품 (character.js 뒤에 읽는다)
// 유저가 만든 아이(style: 'custom')의 귀·꼬리·머리 위·털·목 장식·머리 무늬·얼굴 무늬·몸 무늬를 만든다.
//  - 기존 주민에게서 가져온 것: 하치와레 가르마 머리, 쿠리만쥬 밤 머리·옆 귀, 후루혼야 둥근 머리·튤립 귀, 모몽가 볼털·큰 꼬리,
//    시사 갈기·접힌 귀, 랏코 삐죽 털·수건·망토, 아노코 뿔·볼 방울·용 꼬리, 파자마 삐죽·꼭지, 풀뽑기 요로이 무지개 반다나, 포셰트
//  - 새로 만든 것: 새싹·꽃·리본·삐죽 머리털·왕관, 더듬이·지느러미·강아지·늘어진 토끼 귀, 하트·별·악마·물고기·사자·비버·새싹 꼬리,
//    목도리·방울·나비넥타이, 얼룩·너구리 눈가·반반·이마 별·호랑이 줄·주근깨, 배 색·줄무늬·얼룩·하트·턱받이·양말
//  - 꼬리는 전부 다시 만들었다: 공을 이어 붙이던 방식 대신 굵기가 변하는 매끈한 관 하나로 (윤곽선이 한 줄로 깔끔하게 나온다)
// 색은 몸 색(skin)과 포인트 색(color2) 두 가지. 귀·꼬리는 포인트 색으로 칠할지 고를 수 있다.
(function () {
  const PINK = '#f6bcc8';
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- 도형 ---------- */
  // 굵기가 변하는 매끈한 관. pts: 모델 좌표 [x,y,z], rad(u): 0~1 위치의 반지름, 끝은 둥글게 닫는다
  function tubeGeo(pts, rad, { segs = 40, sides = 16, colorAt = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(a => V3(...a)));
    const fr = curve.computeFrenetFrames(segs, false);
    const CAP = 6;
    const pos = [], idx = [], col = [];
    const rings = segs + CAP;
    for (let i = 0; i <= rings; i++) {
      let c, r, u;
      const k = Math.min(i, segs);
      const N = fr.normals[k], B = fr.binormals[k];
      if (i <= segs) { u = i / segs; c = curve.getPointAt(u); r = rad(u); }
      else {
        const a = ((i - segs) / CAP) * Math.PI / 2, r0 = rad(1);
        u = 1;
        c = curve.getPointAt(1).addScaledVector(fr.tangents[segs], r0 * Math.sin(a));
        r = Math.max(0.0006, r0 * Math.cos(a));
      }
      const cc = colorAt ? colorAt(u) : null;
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        pos.push(c.x + r * (ca * N.x + sa * B.x), c.y + r * (ca * N.y + sa * B.y), c.z + r * (ca * N.z + sa * B.z));
        if (cc) col.push(cc.r, cc.g, cc.b);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c2 = a + sides, d = b + sides;
      idx.push(a, b, c2, b, d, c2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (col.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  // 납작한 모양 (별·하트·잎). 2D 점들을 도톰하게 밀어 올리고 모서리를 둥글린다
  function slabGeo(pts, thick) {
    const shape = new THREE.Shape(pts.map(([x, y2]) => new THREE.Vector2(x, y2)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelSize: thick * 0.45, bevelThickness: thick * 0.45, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -thick / 2);
    return geo;
  }
  // 납작한 귀 (2026-11-17): 곡선을 따라가는 납작한 관. 단면은 타원(폭 width(u), 두께 thick), 넓은 면은 face 방향을 바라본다.
  // 끝은 둥글게 닫는다. 늘어진 토끼 귀·강아지 귀처럼 접혀 내려오는 귀에 쓴다
  function flatEarGeo(pts, width, thick, face, { segs = 40, sides = 18 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(a => V3(...a)));
    const F = face.clone().normalize();
    const pos = [], idx = [];
    const CAP = 6;
    const rings = segs + CAP;
    const frame = u => {
      const T = curve.getTangentAt(Math.min(1, Math.max(0, u)));
      const Wd = new THREE.Vector3().crossVectors(F, T).normalize();      // 넓이 방향 (면 안에서 곡선에 수직)
      const Th = new THREE.Vector3().crossVectors(T, Wd).normalize();     // 두께 방향 (면의 법선)
      return { T, Wd, Th };
    };
    for (let i = 0; i <= rings; i++) {
      let u, c, w, t;
      if (i <= segs) { u = i / segs; c = curve.getPointAt(u); w = width(u) / 2; t = thick(u) / 2; }
      else {
        const a = ((i - segs) / CAP) * Math.PI / 2;
        u = 1;
        const { T } = frame(1);
        c = curve.getPointAt(1).addScaledVector(T, width(1) / 2 * Math.sin(a));
        w = Math.max(0.0006, width(1) / 2 * Math.cos(a));
        t = Math.max(0.0006, thick(1) / 2 * Math.cos(a));
      }
      const { Wd, Th } = frame(u);
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        pos.push(c.x + Wd.x * w * Math.cos(a) + Th.x * t * Math.sin(a), c.y + Wd.y * w * Math.cos(a) + Th.y * t * Math.sin(a), c.z + Wd.z * w * Math.cos(a) + Th.z * t * Math.sin(a));
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c2 = a + sides, d = b + sides;
      idx.push(a, b, c2, b, d, c2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  const SHAPES = {
    star(R) { const o = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? R * 0.5 : R; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; },
    heart(R) { const o = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; o.push([R * 0.062 * 16 * Math.sin(a) ** 3, R * 0.062 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) + R * 0.15]); } return o; },
    leaf(w, L) { const o = []; for (let i = 0; i <= 14; i++) { const s = i / 14; o.push([w * Math.sin(Math.PI * s) * (1 - 0.25 * s), L * s]); } for (let i = 13; i >= 1; i--) { const s = i / 14; o.push([-w * Math.sin(Math.PI * s) * (1 - 0.25 * s), L * s]); } return o; },
    spade(w, L) { return [[0, L], [w, L * 0.22], [w * 0.28, L * 0.34], [0, 0], [-w * 0.28, L * 0.34], [-w, L * 0.22]]; },
    fork(w, L) { return [[0, 0], [w * 0.5, L * 0.35], [w, L], [w * 0.35, L * 0.82], [0, L * 0.55], [-w * 0.35, L * 0.82], [-w, L], [-w * 0.5, L * 0.35]]; },
    fan(w, L) { const o = [[0, 0]]; for (let i = 0; i <= 12; i++) { const a = -0.9 + (i / 12) * 1.8; o.push([Math.sin(a) * w * (1 + 0.12 * Math.cos(i * Math.PI)), Math.cos(a) * L * (1 + 0.1 * Math.cos(i * Math.PI))]); } return o; },
  };

  /* ---------- 얼굴 무늬 (character.js paintFace가 부른다) ---------- */
  window.paintLookMarks = function (g, p, pxX, pxY) {
    const c2 = p.color2 || PINK;
    g.save();
    g.scale(pxX, pxY);
    g.translate(1.5, 0);
    g.fillStyle = c2;
    g.strokeStyle = c2;
    g.lineCap = 'round';
    const oval = (x, t, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, t, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
    switch (p.faceMark) {
      case 'patch': oval(0.36, 0.66, 0.3, 0.27, -0.2); break;
      case 'mask': oval(-0.34, 0.7, 0.3, 0.2, 0.25); oval(0.34, 0.7, 0.3, 0.2, -0.25); break;
      case 'half': g.fillRect(0, -0.05, 1.6, 1.7); break;
      case 'star': {
        g.beginPath();
        SHAPES.star(0.2).forEach(([x, y2], i) => (i ? g.lineTo(x, 0.32 - y2) : g.moveTo(x, 0.32 - y2)));
        g.closePath(); g.fill();
        break;
      }
      case 'tiger':
        g.lineWidth = 0.075;
        for (const [x, a, b] of [[0, 0.06, 0.36], [-0.2, 0.1, 0.31], [0.2, 0.1, 0.31]]) { g.beginPath(); g.moveTo(x, a); g.lineTo(x * 0.85, b); g.stroke(); }
        for (const s of [-1, 1]) for (const t of [0.74, 0.9, 1.06]) { g.beginPath(); g.moveTo(s * 1.05, t); g.lineTo(s * 0.78, t + 0.04); g.stroke(); }
        break;
      case 'freckle':
        for (const s of [-1, 1]) for (const [x, t] of [[0.36, 0.98], [0.47, 0.94], [0.56, 1.0], [0.45, 1.05]]) oval(s * x, t, 0.032, 0.032);
        break;
      case 'nose': oval(0, 0.93, 0.2, 0.15); break;         // 주둥이 색
      case 'brow': oval(-0.3, 0.44, 0.07, 0.05, 0.2); oval(0.3, 0.44, 0.07, 0.05, -0.2); break;   // 마로 눈썹
      default: break;
    }
    g.restore();
  };

  /* ---------- 몸 무늬: 몸통 구에 그림을 입힌다 ---------- */
  // 그림 가로 = 몸 둘레 (앞 가운데 u=0.25, 등 가운데 u=0.75), 머리에 가리지 않고 보이는 곳은 아래쪽 40%
  function bodyTexture(p) {
    const W = 512, H = 256;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = p.bodyColor || p.skinColor;
    g.fillRect(0, 0, W, H);
    g.fillStyle = p.color2 || PINK;
    const oval = (u, v, rx, ry, rot = 0) => { for (const du of [-1, 0, 1]) { g.beginPath(); g.ellipse((u + du) * W, v * H, rx * W, ry * H, rot, 0, Math.PI * 2); g.fill(); } };
    switch (p.bodyPattern) {
      case 'belly': oval(0.25, 0.8, 0.15, 0.26); break;
      case 'bib': oval(0.25, 0.62, 0.15, 0.12); break;
      case 'stripes': for (const [v, w] of [[0.6, 0.16], [0.72, 0.19], [0.84, 0.17]]) oval(0.75, v, w, 0.035); break;
      case 'spots': for (const [u, v, r, q] of [[0.08, 0.7, 0.05, 0.09], [0.42, 0.82, 0.045, 0.07], [0.6, 0.68, 0.06, 0.08], [0.8, 0.85, 0.07, 0.08], [0.93, 0.66, 0.035, 0.06], [0.7, 0.93, 0.04, 0.05]]) oval(u, v, r, q, u * 5); break;
      case 'heart': {
        g.beginPath();
        SHAPES.heart(1).forEach(([x, y2], i) => { const X = 0.25 * W + x * 0.085 * W, Y = 0.8 * H - y2 * 0.16 * H; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
        g.closePath(); g.fill();
        break;
      }
      case 'pants': g.fillRect(0, 0.74 * H, W, 0.26 * H); break;
      case 'saddle': oval(0.75, 0.62, 0.17, 0.16); break;
      default: break;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  /* ---------- 부품 ---------- */
  CHARACTER_PARTS.custom = function ({ p, model, colored, ball, cone, tick, ring, y, part, lineMat }) {
    const c2 = p.color2 || PINK;
    const back = -p.bodyW * p.depth;
    const front = p.bodyW * p.depth;
    const hr = p.headW / 0.98;                 // 체형에 따라 머리·몸 폭이 달라진다
    const br = p.bodyW / 0.74;
    const flat = mesh => { mesh.children[0].visible = false; return mesh; };
    // 직접 만든 도형을 윤곽선과 함께 붙인다 (ball이 만든 부품의 모양만 바꿔 쓴다)
    const add = (geo, color) => {
      const m = ball(0, p.footT, 0, 1, 1, 1, color);
      m.geometry.dispose();
      m.geometry = geo;
      m.children[0].geometry = geo;
      return m;
    };
    const P = (x, t, z) => [x, y(t), z];
    // 머리·몸 겉면 (2026-11-17, 떠 보이는 부품 고치기): 높이 t에서 머리 타원의 가로 반지름, 그 높이의 몸 실루엣 반지름
    const headR = t => p.headW * Math.sqrt(Math.max(0, 1 - ((t - p.headTop) / (t < p.headTop ? p.headTop : p.headLow)) ** 2));
    const outlineR = t => Math.max(headR(t), p.bodyW * Math.sqrt(Math.max(0, 1 - ((t - p.bodyT) / p.bodyH) ** 2)));
    // 겉면에서 바깥(법선)으로 솟는 작은 뾰족 털: 밑동은 겉면 안에 묻힌다
    const UP = V3(0, 1, 0);
    const spike = (x, t, z, n, r, h, color) => {
      const m = cone(0, 0, 0, r, h, color);
      m.position.set(x - n.x * h * 0.25, y(t) - n.y * h * 0.25, z - n.z * h * 0.25);
      m.rotation.set(0, 0, 0);
      m.quaternion.setFromUnitVectors(UP, n.clone().normalize());
      return m;
    };
    // 머리 겉면의 점과 바깥 방향: th = 정수리에서 내려온 각, ph = 앞(0)에서 오른쪽(+)으로 돈 각
    const headPoint = (th, ph) => {
      const HR = p.headW, HU = p.headTop, HZ = p.headW * p.depth;
      const pos = [Math.sin(th) * Math.sin(ph) * HR, HU - Math.cos(th) * HU, Math.sin(th) * Math.cos(ph) * HZ];
      const n = V3(Math.sin(th) * Math.sin(ph) / HR, Math.cos(th) / HU, Math.sin(th) * Math.cos(ph) / HZ).normalize();
      return { pos, n };
    };
    const tube = (pts, rad, color, opts) => add(tubeGeo(pts.map(a => P(...a)), rad, opts), color);
    const flatEar = (pts, width, thick, face, color, opts) => add(flatEarGeo(pts.map(a => P(...a)), width, thick, face, opts), color);
    // 납작한 모양: 법선으로 부풀리는 외곽선은 모서리에서 가시처럼 갈라지므로, 살짝 크고 얇은 먹색 판을 뒤에 둔다
    const ink = colored(p.inkColor);
    const slab = (shape, thick, color, x, t, z, rot = [0, 0, 0]) => {
      const geo = slabGeo(shape, thick);
      const m = add(geo, color);
      m.children[0].visible = false;
      const o = new THREE.Mesh(geo, ink);
      o.scale.set(1.14, 1.14, 0.6);
      const c = new THREE.Box3().setFromBufferAttribute(geo.attributes.position).getCenter(new THREE.Vector3());
      o.position.set(-c.x * 0.14, -c.y * 0.14, 0);       // 모양 가운데를 기준으로 키운다
      m.add(o);
      m.position.set(x, y(t), z);
      m.rotation.set(...rot);
      return m;
    };

    /* 몸 무늬 */
    if (p.bodyPattern && p.bodyPattern !== 'none' && p.bodyPattern !== 'socks') {
      const body = model.children.find(m => m.isMesh && m.geometry.type === 'SphereGeometry' && Math.abs(m.position.y - (p.footT - p.bodyT)) < 1e-6);
      if (body) { const mat = colored('#ffffff'); mat.map = bodyTexture(p); body.material = mat; }
    }

    /* 귀 */
    const earC = p.earTint ? c2 : null;
    const inner = p.earTint ? p.skinColor : c2;
    for (const sign of [-1, 1]) {
      const side = sign * hr;
      switch (p.earStyle) {
        case 'small': ball(side * 0.56, 0.05, 0, 0.085, 0.09, 0.065, earC); break;
        case 'round': ball(side * p.earX, p.earT, 0, p.earSize, p.earSize * p.earTall, p.earSize * 0.75, earC); break;
        case 'bear':
          ball(side * 0.6, 0.0, -0.02, 0.17, 0.175, 0.12, earC);
          flat(ball(side * 0.6, 0.01, 0.07, 0.09, 0.095, 0.07, inner));
          break;
        case 'mouse':
          ball(side * 0.64, 0.0, -0.03, 0.28, 0.31, 0.15, earC);
          flat(ball(side * 0.64, 0.01, 0.09, 0.15, 0.18, 0.08, inner));
          break;
        case 'cat':
          cone(side * 0.58, 0.26, 0, 0.22, 0.38, earC, -side * 0.24);         // 2026-11-17 아래로 내림
          flat(cone(side * 0.59, 0.21, 0.12, 0.09, 0.18, inner, -side * 0.24));
          break;
        case 'rabbit':
          ball(side * 0.26, -0.36, -0.02, 0.15, 0.46, 0.09, earC).rotation.z = -side * 0.08;
          flat(ball(side * 0.26, -0.36, 0.05, 0.08, 0.33, 0.05, inner)).rotation.z = -side * 0.08;
          break;
        // 늘어진 토끼 귀·강아지 귀 (2026-11-17, 이재헌님이 준 참고 그림대로): 단순한 통통한 판에 먹선. 뿌리는 머리에 묻어 떠 보이지 않게
        case 'lop': {        // 토끼 늘어진 귀 (우사기 그림): 정수리 양옆에서 나와 바깥 아래로 길게 늘어진 넓적한 주걱, 끝은 둥글고 몸과 같은 색
          const s = sign, R = hr;
          // 뿌리는 머리 속 깊이 묻는다 (잘린 끝이 정수리 위로 드러나지 않게, 2026-11-17)
          flatEar([[s * 0.26 * R, 0.34, -0.06], [s * 0.5 * R, 0.12, -0.03], [s * 0.86 * R, 0.3, 0.0], [s * 1.14 * R, 0.74, 0.02], [s * 1.3 * R, 1.24, 0.04]],
            u => 0.2 + 0.13 * Math.sin(Math.min(1, u * 1.4) * Math.PI / 2), () => 0.07, V3(s * 0.25, 0.1, 1), earC, { segs: 44 });
          break;
        }
        case 'droopy': {     // 둥근 늘어진 귀: 머리 위 양옆에서 둥글게 늘어진 넓은 귀
          const s = sign, R = hr;
          flatEar([[s * 0.32 * R, 0.32, -0.06], [s * 0.58 * R, 0.1, -0.03], [s * 0.88 * R, 0.24, 0.0], [s * 1.02 * R, 0.5, 0.03], [s * 1.04 * R, 0.66, 0.04]],
            u => 0.26 + 0.12 * Math.sin(Math.min(1, u * 1.3) * Math.PI / 2), () => 0.08, V3(s * 0.3, 0.1, 1), earC, { segs: 36 });
          break;
        }
        case 'longdrop': {   // 긴 늘어진 귀: 몸까지 내려오는 길고 넓은 귀
          const s = sign, R = hr;
          flatEar([[s * 0.26 * R, 0.34, -0.07], [s * 0.5 * R, 0.12, -0.05], [s * 0.86 * R, 0.28, -0.02], [s * 1.06 * R, 0.74, 0.0], [s * 1.08 * R, 1.3, 0.02]],
            u => 0.28 + 0.16 * Math.sin(Math.min(1, u * 1.2) * Math.PI / 2), () => 0.09, V3(s * 0.3, 0.05, 1), earC, { segs: 44 });
          break;
        }
        case 'poodle': {     // 복슬 귀: 구름처럼 몽글몽글한 털 귀 (공 여러 개, 사이사이 먹선이 털 결이 된다)
          const s = sign, R = hr;
          for (const [x, t, r] of [[0.9, 0.24, 0.2], [1.04, 0.44, 0.22], [1.02, 0.68, 0.22], [0.94, 0.88, 0.18], [1.12, 0.62, 0.15]]) ball(s * x * R, t, -0.02, r, r * 0.95, r * 0.7, earC);
          break;
        }
        case 'fold': {       // 접힌 귀: 머리 위 양옆의 작은 세모가 앞으로 톡 접혀 내려온 귀
          const s = sign;
          const e = cone(s * 0.66 * hr, 0.1, 0.04, 0.17, 0.3, earC, -s * 2.0, 0.35);   // 바깥 아래로 톡 접힘
          e.scale.z = 0.55;
          break;
        }
        case 'bigpoint': {   // 큰 세모 귀: 바깥으로 크게 쫑긋 솟은 귀, 안쪽은 밝은 색
          cone(side * 0.62, 0.22, -0.02, 0.27, 0.66, earC, -sign * 0.62);
          flat(cone(side * 0.64, 0.16, 0.12, 0.13, 0.42, inner, -sign * 0.62));
          break;
        }
        case 'crab': {       // 게 집게 귀 (게임 속 지금 모습 그대로, 2026-11-17): 머리 위 양옆의 통통한 집게. 안쪽 손가락은 작고 뾰족, 바깥 손가락은 크고 둥글다
          const OUTLINE = [[-0.11, 0.0], [-0.24, 0.12], [-0.31, 0.32], [-0.27, 0.52], [-0.19, 0.64], [-0.13, 0.715], [-0.105, 0.72], [-0.07, 0.64],
            [-0.03, 0.585], [0.0, 0.58], [0.04, 0.65], [0.09, 0.745], [0.115, 0.755], [0.2, 0.71], [0.3, 0.6], [0.345, 0.43], [0.32, 0.24], [0.22, 0.08], [0.11, 0.0]];
          const sd = sign;
          const pts = OUTLINE.map(([x, v]) => new THREE.Vector3(x * 1.15 * sd, v * 0.9, 0));
          if (sd < 0) pts.reverse();
          const ring = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5).getSpacedPoints(72).slice(0, 72);
          const c = new THREE.Vector3(0.02 * sd, 0.33, 0);
          const T = 0.085, NV = 9, N = ring.length;
          const pos = [], idx = [];
          pos.push(c.x, c.y, -T);
          for (let jj = 1; jj < NV; jj++) {
            const v = -Math.PI / 2 + (jj / NV) * Math.PI;
            const k = Math.pow(Math.cos(v), 0.45), z = Math.sin(v) * T;
            for (const q of ring) pos.push(c.x + (q.x - c.x) * k, c.y + (q.y - c.y) * k, z);
          }
          pos.push(c.x, c.y, T);
          const at = (jj, ii) => 1 + (jj - 1) * N + (ii % N);
          const last = 1 + (NV - 1) * N;
          for (let ii = 0; ii < N; ii++) {
            idx.push(0, at(1, ii), at(1, ii + 1));
            for (let jj = 1; jj < NV - 1; jj++) idx.push(at(jj, ii), at(jj + 1, ii + 1), at(jj, ii + 1), at(jj, ii), at(jj + 1, ii), at(jj + 1, ii + 1));
            idx.push(last, at(NV - 1, ii + 1), at(NV - 1, ii));
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.setIndex(idx);
          geo.computeVertexNormals();
          const g = new THREE.Group();
          g.position.set(sd * 0.5 * hr, y(0.22), -0.04);
          g.rotation.set(-0.08, sd * 0.3, -sd * 0.52);
          model.add(g);
          part(geo, g, [0, 0, 0], colored(earC || c2));
          break;
        }
        case 'folded':       // 시사 귀 (시사 모델과 같은 모양): 바깥으로 기운 통통한 세모, 안쪽에 굽은 주름 선 둘
          cone(side * 0.57, 0.26, -0.02, 0.22, 0.42, earC, -sign * 0.52);
          tick(side * 0.64, 0.13, 0.165, 0.1, -sign * 0.3);
          tick(side * 0.69, 0.19, 0.16, 0.055, -sign * 1.1);
          break;
        case 'side': cone(side * 0.72, 0.6, 0, 0.18, 0.44, earC, -side * 1.1); break;
        case 'kuri': ball(side * 0.88, 0.42, -0.02, 0.13, 0.11, 0.09, earC); break;       // 쿠리만쥬 옆 귀
        case 'antenna':      // 더듬이
          tube([[side * 0.2, 0.06, 0], [side * 0.26, -0.18, 0], [side * 0.4, -0.36, 0.02]], () => 0.024, earC, { segs: 16, sides: 8 });
          ball(side * 0.42, -0.4, 0.02, 0.075, 0.075, 0.075, c2);
          break;
        case 'fin':          // 지느러미 귀
          slab(SHAPES.fan(0.2, 0.34), 0.05, earC || c2, side * 0.88, 0.5, -0.02, [0, 0, -sign * 1.25]);
          break;
        case 'leafy':        // 잎사귀 귀
          slab(SHAPES.leaf(0.15, 0.48), 0.05, earC || '#9ccc7a', side * 0.5, 0.12, -0.02, [0, 0, -sign * 0.55]);
          break;
        default: break;
      }
    }

    /* 머리 위 */
    switch (p.topStyle) {
      case 'horn': cone(0, 0.2, 0.5 * hr, 0.11, 0.32, c2, 0, 0.55); break;                // 아노코 이마 뿔
      case 'horns': for (const s of [-1, 1]) cone(s * 0.36 * hr, 0.14, 0.08, 0.12, 0.36, c2, -s * 0.42); break;
      case 'spikes': for (const x of [-0.3, 0, 0.3]) cone(x, 0.08 + Math.abs(x) * 0.25, 0, 0.13, 0.26, null, -x * 0.8); break;
      case 'tip': cone(0, 0.06, 0, 0.16, 0.26, null); break;
      case 'sprout':
        tube([[0, 0.05, 0], [0.01, -0.12, 0], [0, -0.26, 0]], () => 0.026, '#8cc46a', { segs: 10, sides: 8 });
        for (const s of [-1, 1]) slab(SHAPES.leaf(0.09, 0.24), 0.035, '#9ccc7a', 0, -0.24, 0, [0, 0, -s * 1.05]);
        break;
      case 'ahoge':
        tube([[0, 0.05, 0], [0.03, -0.14, 0], [0.14, -0.27, 0], [0.27, -0.24, 0], [0.31, -0.14, 0]], u => 0.045 * (1 - 0.72 * u), null, { segs: 22, sides: 10 });
        break;
      case 'flower': {
        const fx = 0.5 * hr, ft = 0.2, fz = 0.42;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ball(fx + Math.cos(a) * 0.15, ft - Math.sin(a) * 0.15, fz, 0.12, 0.12, 0.06, c2); }
        flat(ball(fx, ft, fz + 0.05, 0.08, 0.08, 0.05, '#ffe08a'));
        break;
      }
      case 'ribbon':
        for (const s of [-1, 1]) ball(s * 0.25, -0.05, 0.1, 0.25, 0.17, 0.1, c2).rotation.z = -s * 0.35;
        ball(0, -0.02, 0.15, 0.1, 0.1, 0.09, c2);
        break;
      case 'crown':
        ring(0.03, 0.34, 0.06, '#e3c75a');
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cone(Math.sin(a) * 0.32, 0.0, Math.cos(a) * 0.29, 0.1, 0.32, '#e3c75a'); }
        flat(ball(0, -0.05, 0.36, 0.06, 0.06, 0.04, '#d9534f'));
        break;
      case 'bandana':      // 머리띠 매듭 (유두부 요로이)
        ring(0.36, headR(0.36) - 0.01, 0.06, c2);      // 머리 둘레에 딱 맞게 (겉면에 반쯤 묻힘)
        for (const s of [-1, 1]) ball(s * 0.16, 0.34, -0.8 * hr, 0.13, 0.08, 0.06, c2).rotation.z = s * 0.5;
        ball(0, 0.36, -0.8 * hr, 0.07, 0.07, 0.06, c2);
        break;
      default: break;
    }

    /* 털 */
    switch (p.furStyle) {
      case 'cheek':        // 모몽가 뺨 털
        for (const s of [-1, 1]) {
          ball(s * 0.86 * hr, 0.95, 0, 0.24, 0.22, 0.2);
          // 볼 털 끝: 털뭉치 겉면에서 바깥으로 솟는 작은 뾰족 털 셋
          for (const [dt, a] of [[-0.14, 0.45], [0.0, 0], [0.14, -0.45]]) spike(s * (0.86 * hr + 0.2), 0.95 + dt, 0.02, V3(s * Math.cos(a), Math.sin(a), 0.15), 0.06, 0.16, null);
        }
        break;
      case 'puffs':        // 아노코 볼 방울
        for (const s of [-1, 1]) { ball(s * 1.06 * hr, 0.92, 0, 0.2, 0.2, 0.16); ball(s * 0.98 * hr, 1.14, 0, 0.17, 0.15, 0.14); }
        break;
      case 'mane': {       // 시사 갈기 (시사 모델과 같은 모양, 2026-11-17): 머리 윤곽 네 자리에서 바깥으로 뻗는 잎사귀 털, 가운데 결 선
        const up = V3(0, 1, 0);
        const leafGeo = (r, h) => {
          const pts = [[0, 0], [r * 0.55, h * 0.08], [r, h * 0.36], [r * 0.9, h * 0.58], [r * 0.45, h * 0.84], [r * 0.12, h * 0.97], [0, h]];
          const curve = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
          const geo = new THREE.LatheGeometry(curve.getPoints(24).map(v => new THREE.Vector2(Math.max(0, v.x), v.y)), 20);
          geo.scale(1, 1, 0.5);
          return geo;
        };
        const leaf = (base, dir, r, h) => {
          const g = new THREE.Group();
          g.position.copy(base);
          g.quaternion.setFromUnitVectors(up, dir.normalize());
          model.add(g);
          part(leafGeo(r, h), g, [0, 0, 0], colored(c2));
          for (const z of [1, -1]) {
            const line = new THREE.Mesh(new THREE.CapsuleGeometry(p.outline * 0.42, h * 0.34, 3, 6), lineMat);
            line.position.set(0, h * 0.52, z * (r * 0.5 + 0.004));
            g.add(line);
          }
        };
        const HR = p.headW, HU = p.headTop, HD = p.headLow;
        for (const s of [-1, 1]) for (const [deg, h, r] of [[52, 0.36, 0.17], [24, 0.42, 0.2], [-4, 0.42, 0.2], [-30, 0.36, 0.18]]) {
          const a = (deg * Math.PI) / 180;
          const ry = a > 0 ? HU : HD;
          leaf(V3(s * HR * Math.cos(a) * 0.86, y(HU - ry * Math.sin(a) * 0.86), -0.06), V3(s * Math.cos(a), Math.sin(a) * 0.9, -0.22), r * 1.08, h * 1.12);
        }
        break;
      }
      case 'spiky':        // 랏코 삐죽 털
        // 머리 둘레(옆·위·뒤)에 겉면에서 솟는 작은 뾰족 털 (어느 쪽에서 봐도 머리에 붙어 있다)
        for (const th of [0.55, 0.95, 1.35]) for (let i = 0; i < 12; i++) {
          const ph = Math.PI * 0.42 + (i / 11) * Math.PI * 1.16;
          const { pos, n } = headPoint(th, ph);
          spike(pos[0], pos[1], pos[2], n, 0.045, 0.13, null);
        }
        break;
      case 'tuft':         // 가슴 털
        for (const [x, t, r] of [[0, 1.5, 0.15], [-0.15, 1.45, 0.11], [0.15, 1.45, 0.11]]) ball(x, t, front * 0.93, r, r * 1.1, 0.09);
        break;
      default: break;
    }

    /* 머리 위 입체 장식 (2026-11-17): 머리 색 띠와 같은 포인트 색. 머리 겉면에 반쯤 묻어 떠 보이지 않게 */
    {
      const HR = p.headW, HU = p.headTop, HZ = p.headW * p.depth;
      // 머리 겉면의 점: th = 정수리에서 내려온 각, ph = 앞(0)에서 오른쪽(+)으로 돈 각
      const onHead = (th, ph, out = 1) => [Math.sin(th) * Math.sin(ph) * HR * out, HU - Math.cos(th) * HU * out, Math.sin(th) * Math.cos(ph) * HZ * out];
      switch (p.hairStyle) {
        case 'bun': {                      // 똥머리: 정수리의 동그란 덩어리 + 묶은 자리 주름
          ball(0, -0.1, -0.08, 0.24, 0.22, 0.22, c2);
          tick(-0.08, 0.08, 0.05, 0.08, 0.5); tick(0.08, 0.08, 0.05, 0.08, -0.5);
          break;
        }
        case 'buns':                       // 양쪽 똥머리
          for (const s of [-1, 1]) { const [x, t, z] = onHead(0.5, s * 1.3, 1.02); ball(x + s * 0.04, t - 0.12, z - 0.04, 0.25, 0.24, 0.22, c2); }
          break;
        case 'pigtails':                   // 양갈래: 머리 옆에서 묶어 바깥 아래로 늘어진 다발 + 작은 끈
          for (const s of [-1, 1]) {
            const [x, t, z] = onHead(1.12, s * 1.45, 1.0);
            ball(x, t, z - 0.04, 0.07, 0.07, 0.07, '#ffffff');
            const tuft = ball(x + s * 0.16, t + 0.28, z - 0.06, 0.15, 0.32, 0.13, c2);
            tuft.rotation.z = s * 0.35;
          }
          break;
        case 'pony': {                     // 꽁지 머리: 뒤통수 위에서 묶어 뒤로 늘어진 꽁지
          const [x, t, z] = onHead(1.15, Math.PI, 0.98);
          ball(x, t, z - 0.02, 0.08, 0.08, 0.08, '#ffffff');
          const tail = ball(0, t + 0.3, z + 0.02, 0.19, 0.36, 0.16, c2);   // 뒤통수에 기대어 늘어짐
          tail.rotation.x = 0.28;
          break;
        }
        case 'curly':                      // 뽀글 머리: 머리 위를 덮는 몽글몽글한 곱슬 (공 사이 먹선이 곱슬 결)
          ball(0, 0.0, 0, 0.2, 0.17, 0.2, c2);
          for (let i = 0; i < 8; i++) { const [x, t, z] = onHead(0.42, (i / 8) * Math.PI * 2 + 0.2, 1.0); ball(x, t, z, 0.18, 0.16, 0.18, c2); }
          for (let i = 0; i < 11; i++) { const ph = -Math.PI * 0.62 + (i / 10) * Math.PI * 1.24 + Math.PI; const [x, t, z] = onHead(0.82, ph, 0.98); ball(x, t, z, 0.17, 0.16, 0.16, c2); }
          break;
        default: break;
      }
    }

    /* 목 */
    const neckR = outlineR(1.3) - 0.07;     // 목 둘레에 딱 붙게 (관이 반쯤 몸에 묻힘)
    switch (p.neckStyle) {
      case 'towel': ring(1.3, neckR, 0.14, '#fbf7f0'); break;                              // 랏코 수건
      case 'cape': ring(1.3, neckR, 0.14, c2); ball(0, 1.58, back * 0.9, 0.72 * br, 0.42, 0.12, c2).rotation.x = 0.16; break;
      case 'scarf':
        ring(1.3, neckR, 0.13, c2);
        ball(0.34 * br, 1.56, front * 1.02, 0.11, 0.24, 0.07, c2).rotation.z = 0.15;
        break;
      case 'bell':
        ring(1.32, neckR, 0.055, '#d9534f');
        ball(0, 1.42, neckR * p.depth + 0.07, 0.1, 0.1, 0.1, '#e3bb4a');
        tick(0, 1.46, neckR * p.depth + 0.165, 0.05, 0);
        break;
      case 'bow':
        for (const s of [-1, 1]) ball(s * 0.16, 1.38, neckR * p.depth + 0.04, 0.15, 0.11, 0.06, c2).rotation.z = -s * 0.3;
        ball(0, 1.38, neckR * p.depth + 0.07, 0.06, 0.065, 0.06, c2);
        break;
      case 'pochette': {   // 비스듬히 멘 곰 포셰트
        ring(1.5, p.bodyW * 1.03, 0.028, '#8a6a52').rotation.z = 0.5;
        const px = 0.58 * br, pz = front * 0.72;
        ball(px, 1.82, pz, 0.19, 0.17, 0.11, c2);
        ball(px - 0.13, 1.67, pz, 0.055, 0.055, 0.045, c2);
        ball(px + 0.13, 1.67, pz, 0.055, 0.055, 0.045, c2);
        break;
      }
      default: break;
    }

    /* 꼬리 (전부 매끈한 관. 2026-11-17 통통하게: 굵기·끝 장식을 키워 실처럼 가늘어 보이지 않게) */
    const tc = p.tailTint ? c2 : null;
    // 몸 뒷면 (2026-11-17): 높이 t에서 몸통 타원의 뒤쪽 겉면 z. 꼬리 뿌리는 이보다 안쪽에 묻어 몸에서 떠 보이지 않게 한다
    const backZ = t => -p.bodyW * p.depth * Math.sqrt(Math.max(0.05, 1 - ((t - p.bodyT) / p.bodyH) ** 2));
    const zIn = t => backZ(t) + 0.14;          // 뿌리: 겉면보다 0.14 안쪽
    const lift = (t, k = 0) => backZ(t) - k;  // 겉면에서 k만큼 바깥
    const two = (base, tip, from) => { const A = new THREE.Color(base), B = new THREE.Color(tip); return u => (u > from ? B : A); };
    switch (p.tailStyle) {
      case 'puff': {       // 복슬복슬 동그란 꼬리
        const r = 0.2, c = [0, 1.7, lift(1.7, r * 0.45)];
        ball(c[0], c[1], c[2], r, r, r * 0.95, tc);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; flat(ball(c[0] + Math.cos(a) * r * 0.8, c[1] - Math.sin(a) * r * 0.8, c[2] - 0.03, r * 0.36, r * 0.36, r * 0.36, tc)); }
        break;
      }
      case 'stub': ball(0, 1.72, lift(1.72, 0.07), 0.15, 0.14, 0.2, tc); break;          // 짧은 꼬리: 동글한 작은 꼬리 (반쯤 몸에 묻힘)
      case 'cat':
        tube([[0, 1.74, zIn(1.74)], [0.04, 1.74, back - 0.22], [0.2, 1.6, back - 0.42], [0.42, 1.2, back - 0.36], [0.5, 0.92, back - 0.44], [0.44, 0.74, back - 0.52]], u => 0.115 * (1 - 0.15 * u), tc);
        break;
      case 'curl': {       // 돌돌 말린 꼬리
        const pts = [[0, 1.78, zIn(1.78)]];
        for (let i = 0; i <= 20; i++) { const u = i / 20, a = u * Math.PI * 3.6, r = 0.19 * (1 - 0.45 * u); pts.push([Math.sin(a) * r, 1.72 - (1 - Math.cos(a)) * r, back - 0.08 - 0.3 * u]); }
        tube(pts, u => 0.078 * (1 - 0.3 * u), tc, { segs: 60, sides: 12 });
        break;
      }
      case 'fluffy': {     // 모몽가 꼬리 (게임 속 모몽가와 같은 모양, 2026-11-17): 몸 뒤에서 머리 옆까지 솟는 울퉁불퉁한 복슬 덩어리, 바깥쪽에 털 결 선
        for (let i = 0; i < 9; i++) {
          const u = i / 8;
          const x = (0.35 + 0.7 * Math.sin(u * 2.7)) * br;
          const t = 1.95 - 1.45 * u;
          const r = (0.32 + 0.2 * Math.sin(u * Math.PI)) * br;
          const z = Math.max(back - 0.08 - 0.1 * Math.sin(u * 3), lift(Math.min(t, 1.98), r * 0.35));   // 아래쪽 덩어리도 몸 겉면에 반쯤 묻힘
          if (u < 0.3) ball(x * 0.6, t, (z + backZ(Math.min(t, 1.98))) / 2, r * 0.8, r * 0.8, r * 0.7, tc);   // 뿌리 쪽은 몸과 이어지게
          ball(x, t, z, r, r, r * 0.8, tc);
          tick(x + r * 0.55, t, z + r * 0.72, 0.15, -0.9 - u);
          tick(x + r * 0.9, t - r * 0.3, z + r * 0.3, 0.12, -1.3 - u);
        }
        break;
      }
      case 'fox':          // 여우 꼬리 (끝이 흰색)
        add(tubeGeo([P(0.04, 1.86, zIn(1.86)), P(0.16, 1.84, back - 0.26), P(0.5, 1.56, back - 0.4), P(0.78, 1.16, back - 0.34), P(0.86, 0.94, back - 0.3)],
          u => 0.09 + 0.26 * Math.sin(Math.min(1, u * 1.06) * Math.PI) ** 0.9, { segs: 44, sides: 18, colorAt: two(tc || p.skinColor, p.tailTint ? '#fffdf8' : c2, 0.72) }), '#ffffff').material.vertexColors = true;
        break;
      case 'dragon': {     // 용 꼬리: 엉덩이에서 나와 등을 따라 붙어 오르다 끝이 옆으로 휜다. 등에 가시 (몸에 붙게, 2026-11-17)
        const pts = [[0, 1.78, zIn(1.78)], [0.02, 1.66, back - 0.16], [0.08, 1.38, back - 0.24], [0.2, 1.1, back - 0.24], [0.4, 0.92, back - 0.16], [0.6, 0.86, back - 0.04]];
        tube(pts, u => 0.27 * (1 - u) ** 1.1 + 0.05, tc, { segs: 48, sides: 18 });
        for (const [x, t, z] of [[0.04, 1.55, back - 0.4], [0.12, 1.28, back - 0.46], [0.27, 1.04, back - 0.38]]) cone(x, t, z, 0.07, 0.17, p.tailTint ? p.skinColor : c2, 0, -1.2);
        break;
      }
      case 'lion':         // 사자 꼬리: 가는 꼬리 끝에 털뭉치
        tube([[0, 1.74, zIn(1.74)], [0.06, 1.76, back - 0.24], [0.3, 1.66, back - 0.4], [0.56, 1.34, back - 0.36], [0.64, 1.12, back - 0.38]], () => 0.062, tc, { segs: 30, sides: 12 });
        ball(0.68, 0.98, back - 0.38, 0.19, 0.22, 0.17, p.tailTint ? p.skinColor : c2);
        break;
      case 'heart':        // 하트 꼬리
        tube([[0, 1.74, zIn(1.74)], [0.05, 1.76, back - 0.24], [0.28, 1.62, back - 0.4], [0.5, 1.28, back - 0.36]], () => 0.058, tc, { segs: 26, sides: 12 });
        slab(SHAPES.heart(0.4), 0.1, c2, 0.58, 1.02, back - 0.36, [0, 0, -0.35]);
        break;
      case 'star':         // 별 꼬리
        tube([[0, 1.74, zIn(1.74)], [0.05, 1.76, back - 0.24], [0.28, 1.62, back - 0.4], [0.5, 1.28, back - 0.36]], () => 0.058, tc, { segs: 26, sides: 12 });
        slab(SHAPES.star(0.36), 0.1, '#ffd95a', 0.6, 1.04, back - 0.36, [0, 0, -0.3]);
        break;
      case 'devil':        // 악마 꼬리
        tube([[0, 1.74, zIn(1.74)], [0.05, 1.76, back - 0.26], [0.32, 1.7, back - 0.42], [0.42, 1.4, back - 0.38], [0.62, 1.22, back - 0.36]], () => 0.056, tc, { segs: 30, sides: 12 });
        slab(SHAPES.spade(0.27, 0.52), 0.09, tc || c2, 0.6, 1.24, back - 0.36, [0, 0, -0.85]);
        break;
      case 'fish':         // 물고기 꼬리
        tube([[0, 1.84, zIn(1.84)], [0, 1.84, back - 0.2], [0, 1.74, back - 0.44]], u => 0.13 * (1 - 0.55 * u), tc, { segs: 16, sides: 14 });
        slab(SHAPES.fork(0.3, 0.42), 0.06, tc || c2, 0, 1.72, back - 0.4, [-Math.PI / 2 - 0.35, Math.PI / 2, 0]);   // 세로로 선 지느러미
        break;
      case 'beaver': {     // 비버 꼬리: 납작한 주걱
        const bz = lift(1.82, 0.36);
        tube([[0, 1.74, zIn(1.74)], [0, 1.8, lift(1.8, 0.06)], [0, 1.84, bz + 0.2]], () => 0.08, tc || '#a37259', { segs: 10, sides: 12 });   // 몸과 잇는 뿌리
        const m = ball(0, 1.86, bz, 0.26, 0.08, 0.4, tc || '#a37259');
        m.rotation.x = -0.2;
        for (const dz of [-0.14, 0, 0.14]) tick(0, 1.825 + dz * 0.2, bz + dz, 0.2, Math.PI / 2);
        break;
      }
      case 'leaf':         // 새싹 꼬리
        tube([[0, 1.84, zIn(1.84)], [0, 1.8, back - 0.2], [0, 1.6, back - 0.32]], () => 0.048, '#8cc46a', { segs: 12, sides: 10 });
        for (const s of [-1, 1]) slab(SHAPES.leaf(0.15, 0.4), 0.05, '#9ccc7a', 0, 1.6, back - 0.32, [-0.3, 0, -s * 0.9]);
        break;
      default: break;
    }
  };

  /* ---------- 생김새 → 모델 값 ---------- */
  const HAIR = {
    hachi: { hairCenterT: 0.21, hairSideT: 0.47, parting: true },                        // 하치와레 가르마 (게임 속 하치와레와 같은 머리)
    cap: { hairCenterT: 0.27, hairSideT: 0.48, hairLine: false },                        // 후루혼야 둥근 머리
    kuri: { hairCenterT: 0.62, hairSideT: 0.3, hairPow: 1.6, hairSpan: 1.45 },           // 쿠리만쥬 밤 머리
    bowl: { hairCenterT: 0.4, hairSideT: 0.4 },                                          // 바가지 머리
    band: { hairCenterT: 0.46, hairSideT: 0.46, hairStripes: ['#a8dcc4', '#f5e184', '#f4b59c', '#a8dcc4', '#f5e184', '#f4b59c'] },   // 무지개 반다나
    // 2026-11-17 추가: 머리 색 띠 + 머리 위 입체 장식(CHARACTER_PARTS.custom의 hairStyle)
    bangs: { hairCenterT: 0.42, hairSideT: 0.45, hairPow: 0.25 },                       // 일자 앞머리
    bun: { hairCenterT: 0.34, hairSideT: 0.42 },                                         // 똥머리
    buns: { hairCenterT: 0.34, hairSideT: 0.42 },                                        // 양쪽 똥머리
    pigtails: { hairCenterT: 0.3, hairSideT: 0.46 },                                     // 양갈래
    pony: { hairCenterT: 0.32, hairSideT: 0.44 },                                        // 꽁지 머리
    curly: { hairCenterT: 0.36, hairSideT: 0.4 },                                        // 뽀글 머리
  };
  const presetFromLook0 = window.presetFromLook;
  window.presetFromLook = function (look = {}) {
    const base = presetFromLook0(look);
    const hex = v => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : null);
    base.roundTail = false;              // 치이카와의 기본 동그란 꼬리는 쓰지 않는다 (꼬리는 고른 것만)
    base.color2 = hex(look.color2) || PINK;
    base.earTint = !!look.earTint;
    base.tailTint = !!look.tailTint;
    base.topStyle = look.top || 'none';
    base.furStyle = look.fur || 'none';
    base.neckStyle = look.neck || 'none';
    base.bodyPattern = look.pattern || 'none';
    base.faceMark = look.mark && look.mark !== 'none' ? look.mark : null;
    if (look.pattern === 'socks') base.limbColor = base.color2;
    if (HAIR[look.hair]) Object.assign(base, HAIR[look.hair], { hairColor: base.color2 });
    base.hairStyle = look.hair || 'none';
    return base;
  };
}());
