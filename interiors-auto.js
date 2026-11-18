'use strict';

// 치이카와 심즈 — 나머지 건물을 안팎이 있게 만든다
// 앞이 트인 GLB 모형의 지붕과 바깥벽을 걷어 내면 그대로 내부가 된다. 그 위에 닫힌 외관을 씌운다.
// 주택은 코드로 만든 집에 침대와 가구를 넣는다. 자는 자리(bed_lie)는 집마다 하나다
(function () {
  const WALL_H = 4.8;
  const BAND = 1;             // 건물 둘레의 이 폭 안에 있는 벽면은 걷어 내고 자르는 벽으로 바꾼다

  // 가게 표. rect: [x0, x1, z0, z1] 건물 영역 (없으면 모형 전체) · door: 앞면 문의 x
  const LOOKS = {
    reception: { wall: '#d9bb8e', roof: '#a5805f', trim: '#7d5a44', skin: 'plank', label: '노동 접수처', signBg: '#a9805c', signFg: '#fff8e6' },
    exam: { wall: '#bdbab4', roof: '#a7a39b', roofType: 'flat', trim: '#8d897f', skin: 'block', label: '풀뽑기 검정', signBg: '#fffdf6', signFg: '#6b4a3c' },
    arbiter: { wall: '#fff5d6', roof: '#d9a077', label: '슈퍼 알바이터', signBg: '#f7dd85' },
    internet: { wall: '#e6ecf3', roof: '#9fb2cd', trim: '#7f96b8', label: '인터넷 코너', signBg: '#7f96b8', signFg: '#fff' },
    ramenYama: { wall: '#f4ead4', roof: '#8d8f94', roofType: 'hip', trim: '#7d6250', label: '山', signBg: '#d05a50', signFg: '#fff', noren: '#d05a50' },
    umaCurry: { wall: '#f7e8c8', roof: '#c88e5e', trim: '#9c6d46', label: '우마카레', signBg: '#e8894e', signFg: '#fff' },
    umaiya: { wall: '#e7cda5', roof: '#a56f58', trim: '#7d5a44', skin: 'plank', label: '우마이야', signBg: '#c9604f', signFg: '#fff', noren: '#c9604f' },
    kissa: { wall: '#c6ad95', roof: '#7f6a59', roofType: 'front', trim: '#584a42', skin: 'plank', label: '찻집', signBg: '#584a42', signFg: '#f4e3c4' },
    mucha: { wall: '#fff8ea', roof: '#e8e2d2', roofType: 'flat', trim: '#7fa86a', aisle: 6.4, label: '무차우마켓', signBg: '#b5d97f', signFg: '#55803f', h: 8.5 },
    soba: { wall: '#f2ead8', roof: '#8fa08f', label: '서서 먹는 소바', signBg: '#4f7a5f', signFg: '#fff', noren: '#4f7a5f' },
    machioka: { wall: '#fff3f5', roof: '#f3b3c8', label: '과자의 마치오카', signBg: '#fff', signFg: '#d8678a' },
    pharmacy: { wall: '#f0f7f0', roof: '#93c3a0', label: '약국', signBg: '#6fb385', signFg: '#fff' },
    recycle: { wall: '#dfd6c0', roof: '#a3957d', label: '리사이클 숍', signBg: '#f1e2b8' },
    onsen: { wall: '#ecd9b6', roof: '#8f7a69', trim: '#7d5a44', skin: 'plank', label: '♨ 온천', signBg: '#d98f78', signFg: '#fff', noren: '#7f9ec2' },
    sauna: { aisle: 5.6, wall: '#d3b08c', roof: '#9b7f64', trim: '#7d5a44', skin: 'plank', label: '사우나', signBg: '#fffdf4' },
    arcade: { wall: '#b9b3cc', roof: '#8f88a8', roofType: 'flat', label: '게임센터', signBg: '#e7dfc8' },
    shimajiro: { rect: [-4.6, 4.6, -6.4, 1], clip: 3.4, wall: '#e2c79d', roof: '#c9a56a', trim: '#7d5a44', skin: 'plank', label: '시마지로', signBg: '#fffdf4', signFg: '#b5574f' },
    yamanba: { rect: [-8.4, 1.4, -5, 3.4], door: -3.2, clip: 2.4, wall: '#a98a68', roof: '#7f7264', trim: '#5f4a3a', skin: 'plank' },
    hiroma: { rect: [-7.2, 7.2, -6.4, 2.2], wall: '#d9cfbb', roof: '#6f6962', roofType: 'hip', trim: '#6b5b4e', label: '히로마', signBg: '#4f4842', signFg: '#f4e3c4' },
  };

  // GLB의 지붕과 바깥벽 삼각형을 없앤다 (외곽선 메시도 같이)
  function carve(holder, rect, clip, aisle) {
    holder.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert();
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const C = new THREE.Vector3();
    const E1 = new THREE.Vector3();
    const E2 = new THREE.Vector3();
    holder.traverse(m => {
      if (!m.isMesh || !m.geometry.attributes.position) return;
      const rel = inv.clone().multiply(m.matrixWorld);
      const geo = m.geometry;
      const pos = geo.attributes.position;
      const idx = geo.index ? geo.index.array : null;
      const n = idx ? idx.length : pos.count;
      const keep = [];
      for (let t = 0; t < n; t += 3) {
        const a = idx ? idx[t] : t;
        const b = idx ? idx[t + 1] : t + 1;
        const c = idx ? idx[t + 2] : t + 2;
        A.fromBufferAttribute(pos, a).applyMatrix4(rel);
        B.fromBufferAttribute(pos, b).applyMatrix4(rel);
        C.fromBufferAttribute(pos, c).applyMatrix4(rel);
        const x = (A.x + B.x + C.x) / 3;
        const y = (A.y + B.y + C.y) / 3;
        const z = (A.z + B.z + C.z) / 3;
        let drop = false;
        if (x >= rect[0] && x <= rect[1] && z >= rect[2] && z <= rect[3]) {
          const edge = Math.min(x - rect[0], rect[1] - x, z - rect[2], rect[3] - z);
          E1.subVectors(B, A);
          E2.subVectors(C, A);
          E1.cross(E2);
          const flatWall = Math.abs(E1.y) / (E1.length() || 1) < 0.5;
          // 모형의 앞면·칸막이처럼 큰 벽판도 걷는다. 안 그러면 새 문으로 들어와도 벽에 막힌다
          const longest = Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A));
          const spanY = Math.max(A.y, B.y, C.y) - Math.min(A.y, B.y, C.y);
          drop = y > clip - 0.2 || (flatWall && y > 0.9 && (edge < BAND || (longest >= 4 && spanY >= 2.2)));
          // 외곽선은 앞면을 잃은 뒤판이 검게 드러나므로 윗부분과 큰 판을 더 넉넉히 지운다
          if (m.geometry.attributes.inkW && (y > 3 || (flatWall && longest >= 2.4))) drop = true;
          // 문에서 안쪽까지 지나갈 통로
          if (aisle && y > 0.3 && x >= aisle[0] && x <= aisle[1] && z >= aisle[2] && z <= aisle[3]) drop = true;
        }
        if (!drop) keep.push(a, b, c);
      }
      geo.setIndex(keep);
    });
  }

  // 모형 바닥판의 높이: 영역 안에서 위를 보는 면 중 가장 넓은 높이. 땅보다 높으면 문 앞에 경사로를 놓는다
  // 모형 안의 가구가 몸에 비해 높으므로 바닥 위 높이를 일정 비율로 낮춘다 (의자 높이는 게임이 다시 잰다)
  function lowerFurniture(holder, rect, floorY, k) {
    holder.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert();
    const v = new THREE.Vector3();
    holder.traverse(m => {
      if (!m.isMesh || !m.geometry.attributes.position) return;
      const rel = inv.clone().multiply(m.matrixWorld);
      const back = rel.clone().invert();
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(rel);
        if (v.x < rect[0] || v.x > rect[1] || v.z < rect[2] || v.z > rect[3] || v.y <= floorY) continue;
        v.y = floorY + (v.y - floorY) * k;
        v.applyMatrix4(back);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      pos.needsUpdate = true;
      m.geometry.computeBoundingBox();
      m.geometry.computeBoundingSphere();
    });
  }

  function stripFurniture(holder, rect, floorY) {
    holder.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert();
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const C = new THREE.Vector3();
    holder.traverse(m => {
      if (!m.isMesh || !m.geometry.attributes.position) return;
      const rel = inv.clone().multiply(m.matrixWorld);
      const geo = m.geometry;
      const pos = geo.attributes.position;
      const idx = geo.index ? geo.index.array : null;
      const n = idx ? idx.length : pos.count;
      const keep = [];
      for (let t = 0; t < n; t += 3) {
        const a = idx ? idx[t] : t;
        const b = idx ? idx[t + 1] : t + 1;
        const c = idx ? idx[t + 2] : t + 2;
        A.fromBufferAttribute(pos, a).applyMatrix4(rel);
        B.fromBufferAttribute(pos, b).applyMatrix4(rel);
        C.fromBufferAttribute(pos, c).applyMatrix4(rel);
        const x = (A.x + B.x + C.x) / 3;
        const z = (A.z + B.z + C.z) / 3;
        const inside = x >= rect[0] && x <= rect[1] && z >= rect[2] && z <= rect[3];
        if (inside && Math.max(A.y, B.y, C.y) > floorY + 0.1) continue;
        keep.push(a, b, c);
      }
      geo.setIndex(keep);
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
    });
  }

  function floorHeight(holder, rect) {
    holder.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert();
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const C = new THREE.Vector3();
    const E1 = new THREE.Vector3();
    const E2 = new THREE.Vector3();
    const areas = new Map();
    holder.traverse(m => {
      if (!m.isMesh || !m.geometry.attributes.position || m.geometry.attributes.inkW) return;
      const rel = inv.clone().multiply(m.matrixWorld);
      const pos = m.geometry.attributes.position;
      const idx = m.geometry.index ? m.geometry.index.array : null;
      const n = idx ? idx.length : pos.count;
      for (let t = 0; t < n; t += 3) {
        A.fromBufferAttribute(pos, idx ? idx[t] : t).applyMatrix4(rel);
        B.fromBufferAttribute(pos, idx ? idx[t + 1] : t + 1).applyMatrix4(rel);
        C.fromBufferAttribute(pos, idx ? idx[t + 2] : t + 2).applyMatrix4(rel);
        const x = (A.x + B.x + C.x) / 3;
        const y = (A.y + B.y + C.y) / 3;
        const z = (A.z + B.z + C.z) / 3;
        if (x < rect[0] || x > rect[1] || z < rect[2] || z > rect[3] || y < 0.08 || y > 1) continue;
        E1.subVectors(B, A);
        E2.subVectors(C, A);
        E1.cross(E2);
        const len = E1.length();
        if (!len || E1.y / len < 0.95) continue;
        const key = Math.round(y * 20) / 20;
        areas.set(key, (areas.get(key) || 0) + len / 2);
      }
    });
    let best = 0;
    let bestArea = 0;
    for (const [y, a] of areas) {
      if (a > bestArea) {
        bestArea = a;
        best = y;
      }
    }
    return best;
  }

  function rectOf(holder) {
    holder.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    const glb = holder.children[0];
    const v = new THREE.Vector3();
    glb.traverse(m => {
      if (!m.isMesh || !m.geometry.attributes.position) return;
      const rel = inv.clone().multiply(m.matrixWorld);
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(rel));
    });
    return [box.min.x, box.max.x, box.min.z, box.max.z];
  }

  function autoDef(cfg, rect, floorY) {
    const [x0, x1, z0, z1] = rect;
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const doorX = cfg.door !== undefined ? cfg.door : cx;
    const trim = cfg.trim || '#a9805c';
    const h = cfg.h || 6.4;
    return {
      area: { x: cx, z: cz, w: w + 0.2, d: d + 0.2 },
      exterior(k, api) {
        // 벽에 붙는 꾸밈은 바깥벽과 함께 걷힌다 (shop-fronts.js)
        const dressWall = (window.INTERIOR_DRESS || {})[cfg.id];
        if (dressWall) dressWall(k, { x0, x1, z0, z1, cx, cz, w, d, h, doorX, floorY }, 'wall', api);
        const body = k.sub(cx, 0);
        body.shop({
          w: w + 0.3, d: d + 0.3, h, z: cz, wall: cfg.wall, roof: cfg.roof, roofType: cfg.roofType || 'gable', rh: Math.min(4.6, Math.max(2.8, d * 0.34)), trim, skin: cfg.skin || 'plaster',
          front: f => {
            const dx = doorX - cx;
            if (cfg.label) {
              const sw = Math.min(w * 0.72, Math.max(4, [...cfg.label].length * 1.5));
              f.sign(0, h - 1.35, sw, 1, cfg.label, cfg.signBg || '#fff4c2', cfg.signFg || SIGN_INK);
            }
            f.place(doorFrameGeo(3.9, 4.4, false), mat(trim), dx, 0, 0, 1, 1, 1, inkThin);
            const leaf = s => {
              const m = f.box(dx + s * 0.92, 2.1, 0.1, 1.74, 4.1, 0.12, '#d8c29a', 1);
              return m;
            };
            const l = leaf(-1);
            const r = leaf(1);
            api.door(doorX, z1, [[l, -1.55], [r, 1.55]]);
            if (cfg.noren) f.noren(dx, 4.3, 3.3, cfg.noren, '');
            for (const s of [-1, 1]) {
              const wx = s * Math.max(4.6, w * 0.3);
              if (Math.abs(wx - dx) > 3.6 && Math.abs(wx) < w / 2 - 1.8) f.win(wx, 3, 2.8, 2.4, { frame: trim });
            }
          },
        });
      },
      yard(k, api) {
        // 가게마다 앞모습 꾸미기 (shop-fronts.js)
        const dress = (window.INTERIOR_DRESS || {})[cfg.id];
        if (dress) dress(k, { x0, x1, z0, z1, cx, cz, w, d, h, doorX, floorY }, 'ground', api);
        if (floorY < 0.1) return;
        // 문 앞 경사로: 건물 바닥이 땅보다 높을 때
        const len = Math.max(1.5, floorY / 0.35);
        const geo = new THREE.PlaneGeometry(4, Math.hypot(len, floorY));
        const m = new THREE.Mesh(geo, mat('#c9c0ac'));
        m.rotation.x = -Math.PI / 2 + Math.atan2(floorY, len);
        m.position.set(doorX, floorY / 2 + 0.01, z1 + len / 2);
        m.receiveShadow = true;
        k.group.add(m);
      },
      interior(k, api) {
        // 건물 바닥을 한 판으로 깔아 문에서 안쪽까지 턱 없이 이어지게 한다
        if (floorY >= 0.1) k.box(cx, floorY / 2 - 0.02, cz, w, floorY, d, cfg.floor || '#d9cfbd', 0);
        const wall = { h: WALL_H, t: 0.4, color: cfg.wall, skin: cfg.skin || 'plaster', ink: 1, center: [cx, cz] };
        const gap = 1.95;
        if (cfg.staff) api.staff(...cfg.staff);
        if ((window.INTERIOR_FURNISH || {})[cfg.id]) window.INTERIOR_FURNISH[cfg.id](k, api, floorY);
        api.walls([[x0, z1], [x0, z0], [x1, z0], [x1, z1]], wall);
        api.walls([[x0, z1], [doorX - gap, z1]], wall);
        api.walls([[doorX + gap, z1], [x1, z1]], wall);
        api.walls([[doorX - gap, z1], [doorX + gap, z1]], { ...wall, h: 0.6, y0: 4.2, skin: null });
      },
    };
  }

  // 게임 시작 때 GLB가 다 얹힌 뒤 부른다
  function mountAll(world, scene) {
    for (const [id, cfg] of Object.entries(LOOKS)) {
      const p = world.places.find(q => q.id === id);
      const holder = ((window.GLB_HOLDERS || {})[id] || [])[0];
      if (!p || !holder) continue;
      const rect = cfg.rect || rectOf(holder);
      const doorX = cfg.door !== undefined ? cfg.door : (rect[0] + rect[1]) / 2;
      carve(holder, rect, cfg.clip || WALL_H, cfg.aisle ? [doorX - 1.8, doorX + 1.8, rect[3] - cfg.aisle, rect[3] + 0.1] : null);
      const floorY = floorHeight(holder, rect);
      const lower = cfg.lower || 0.72;
      lowerFurniture(holder, rect, floorY, lower);
      // 안을 새로 짓는 건물은 모형의 가구를 걷어 낸다
      cfg.id = id;
      if ((window.INTERIOR_FURNISH || {})[id]) stripFurniture(holder, rect, floorY);
      // 앉는 자리 높이도 같은 비율로 낮춘다 (게임이 이 값 근처에서 좌석 면을 다시 잰다)
      for (const s of Object.values(window.ASSET_SOCKETS[id] || {})) {
        if (s[2] > floorY + 0.15) s[2] = floorY + (s[2] - floorY) * lower;
      }
      const g = new THREE.Group();
      g.position.copy(holder.position);
      g.rotation.y = holder.rotation.y;
      scene.add(g);
      window.Interiors.mount(makeKit(g, p.x, p.z, p.face || 0), p, autoDef(cfg, rect, floorY));
    }
  }

  /* ---------- 주택 ---------- */

  // 이불: 집마다 침대 위에 하나
  function blanket(api, x, y, z, color) {
    const FOLDED = 1.3;
    const COVERED = -0.2;
    api.dyn('futon:bed_lie', {
      x, y, z, obj: 'futon', label: '침대',
      clips: {
        sleep(o, u, time) {
          const pull = Math.min(1, u * 80);
          const breath = 1 + 0.03 * Math.sin(time * 1.85);
          o.data.cover.scale.set(1, (0.2 + 0.8 * pull) * breath, 0.3 + 0.7 * pull);
          o.data.cover.position.z = FOLDED + (COVERED - FOLDED) * pull;
        },
      },
      end(o) {
        o.data.cover.scale.set(1, 0.2, 0.3);
        o.data.cover.position.z = FOLDED;
      },
    }, (kit, o) => {
      o.data.cover = kit.ball(0, 0.5, FOLDED, 0.95, 1.55, 1.5, color, 1);
      o.data.cover.scale.set(1, 0.2, 0.3);
    });
  }
  const QUILT = ['#f3bcc8', '#a8c6e0', '#b7d6a5', '#e8c97c', '#cbbce6'];
  const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

  // 침대 하나, 탁자, 선반, 깔개. 눕는 자리는 침대 머리맡에서 발치 쪽을 본다
  function furnishHouse(k, api, bed, seed) {
    const color = QUILT[seed % QUILT.length];
    k.box(bed[0], 0.2, bed[1], 3, 0.4, 4.8, '#c9a57c', 1);
    k.box(bed[0], 0.46, bed[1], 2.7, 0.12, 4.5, '#fffdf8', 1);
    k.ball(bed[0], 0.62, bed[1] - 1.8, 0.86, 0.18, 0.5, '#fffdf8');
    blanket(api, bed[0], 0.06, bed[1] + 0.6, color);
    return color;
  }

  const COTTAGE = { w: 13, d: 11 };
  const COTTAGE_BED = [3.6, -1.6];
  function cottageDef(p, base) {
    const W = COTTAGE.w / 2 - 0.2;
    const D = COTTAGE.d / 2 - 0.2;
    const DOOR = -2.6;
    return {
      area: { x: 0, z: 0, w: COTTAGE.w, d: COTTAGE.d },
      exterior(k) { base(k, p); },
      interior(k, api) {
        k.box(0, -0.01, 0, W * 2, 0.06, D * 2, '#dccfb8', 0);
        floorMarks(k, W * 2, D * 2, 0, () => true);
        const wall = { h: WALL_H, t: 0.35, color: '#f7efdd', skin: 'plaster', ink: 1 };
        const gap = 1.8;
        api.walls([[-W, D], [-W, -D], [W, -D], [W, D]], wall);
        api.walls([[-W, D], [DOOR - gap, D]], wall);
        api.walls([[DOOR + gap, D], [W, D]], wall);
        api.walls([[DOOR - gap, D], [DOOR + gap, D]], { ...wall, h: 0.6, y0: 4.2, skin: null });
        const seed = hash(`${p.x},${p.z}`);
        furnishHouse(k, api, COTTAGE_BED, seed);
        // 깔개와 작은 탁자, 뒤 벽 선반
        k.cyl(-2.6, 0.04, -1.2, 2.2, 0.06, QUILT[(seed + 2) % QUILT.length], 1);
        k.cyl(-2.6, 0.66, -1.2, 1, 0.14, '#d9b98a', 1);
        k.cyl(-2.6, 0.32, -1.2, 0.14, 0.64, '#b98f68');
        k.cyl(-4.4, 0.2, -1.2, 0.5, 0.4, '#e8c97c', 1);
        k.box(-2.6, 3, -D + 0.32, 4, 0.14, 0.6, '#a98a66', 1);
        for (let i = 0; i < 4; i++) k.cyl(-4 + i * 0.95, 3.22, -D + 0.32, 0.26, 0.28, ['#eef3f4', '#d7e6ea', '#e6a79a', '#eef3f4'][i], 1);
        k.planter(-W + 1, D - 1.2, '#f3a9bd');
      },
    };
  }
  function hutDef(p) {
    const R = p.r - 0.5;
    const pts = [];
    const n = 16;
    const gap = Math.asin(1.8 / R);
    for (let i = 0; i <= n; i++) {
      const a = gap + (i / n) * (Math.PI * 2 - gap * 2);
      pts.push([Math.sin(a) * R, Math.cos(a) * R]);
    }
    return {
      area: { x: 0, z: 0, w: R * 2, d: R * 2 + 1.4 },
      exterior(k, api) { HUT_BASE(k, p, api); },
      interior(k, api) {
        polygonFloor(k, pts, '#efe5cf');
        api.walls(pts, { h: 4.2, t: 0.4, color: '#fffaf0', ink: 2 });
        k.box(0, -0.02, R + 0.5, 3.6, 0.06, 1.6, '#efe5cf', 0);
        furnishHouse(k, api, [-R * 0.3, -1], hash(`${p.x},${p.z}`));
        k.cyl(R * 0.45, 0.04, 1, 1.4, 0.06, '#e8c97c', 1);
        k.cyl(R * 0.45, 0.6, 1, 0.75, 0.12, '#d9b98a', 1);
        k.cyl(R * 0.45, 0.3, 1, 0.12, 0.6, '#b98f68');
      },
    };
  }
  const HUT_BASE = (k, p) => BUILDERS_ORIGINAL.hut(k, p);
  const BUILDERS_ORIGINAL = { cottage: BUILDERS.cottage, hut: BUILDERS.hut };

  const RESIDENT = ['momongaHome', 'shisaHome', 'rakkoHome', 'kurimanjuHome', 'furuhonyaHome'];
  const mountHouse = (k, p) => window.Interiors.mount(k, p, cottageDef(p, BUILDERS_ORIGINAL.cottage));
  // 주택은 코드 건물로 통일한다 (GLB 민가 2채도 같은 집으로)
  if (window.GLB_MAP) delete window.GLB_MAP.cottage;
  if (window.GLB_PLACES) window.GLB_PLACES.delete('cottage');
  BUILDERS.cottage = mountHouse;
  BUILDERS.oldHouse = mountHouse;
  for (const id of RESIDENT) BUILDERS[id] = mountHouse;
  BUILDERS.hut = (k, p) => window.Interiors.mount(k, p, hutDef(p));
  for (const id of RESIDENT) {
    window.ASSET_SOCKETS[id] = { door_front: [-2.6, 7.4, 0, -2.6, 5.5], bed_lie: [COTTAGE_BED[0], COTTAGE_BED[1] + 0.6, 0.8, COTTAGE_BED[0], 5], study_sit: [-4.4, -1.2, 0.42, -2.6, -1.2] };
  }

  /* ---------- 치이카와의 집: 구형(코드) 흰 돔 외관을 크게 키우고 자연스럽게 다시 만든다 (2026-11-09 이재헌 지시 3번) ---------- */
  // 원작: 흰색 둥근 돔형 단독주택, 나무틀 십자 창, 현관 표지판에 치이카와 얼굴, 황금 열쇠
  // 떡처럼 아래는 거의 곧게 서고 위가 둥글다. 손으로 빚은 듯 살짝 울퉁불퉁하다

  const HOME_R = 10.8;        // 안쪽 벽 반지름 (예전 7.4)
  const DOME_R = 12;          // 돔 바깥 반지름
  const DOME_H = 10.6;        // 돔 높이
  const VEST_Z0 = DOME_R - 1.4; // 현관 통로가 돔에서 나오는 자리
  const VEST_D = 3.4;         // 현관 통로 길이
  const DOOR_Z = VEST_Z0 + VEST_D;
  if (window.GLB_MAP) delete window.GLB_MAP.home;
  if (window.GLB_PLACES) window.GLB_PLACES.delete('home');

  // 높이 y에서 돔 반지름
  const domeRAt = y => {
    const s = Math.min(1, Math.max(0, y / DOME_H)) ** (1 / 0.9);
    return DOME_R * Math.pow(Math.max(0, 1 - s * s), 0.31);
  };
  function domeGeo() {
    const pts = [];
    const N = 32;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * (Math.PI / 2);
      const x = i === N ? 0.001 : DOME_R * Math.pow(Math.cos(t), 0.62) * (1 + 0.012 * Math.sin(i * 1.7));
      pts.push(new THREE.Vector2(x, DOME_H * Math.pow(Math.sin(t), 0.9)));
    }
    const g = new THREE.LatheGeometry(pts, 72);
    const pos = g.attributes.position;
    const col = [];
    const base = new THREE.Color('#fffdf8'), foot = new THREE.Color('#ece3d3'), warm = new THREE.Color('#fff6e8');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      // 손으로 빚은 울퉁불퉁함 (위로 갈수록 약하게)
      const k = 1 + (0.012 * Math.sin(a * 3 + 1) + 0.008 * Math.sin(a * 7 + y * 0.6)) * (1 - y / DOME_H * 0.6);
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
      // 밑동은 흙빛이 살짝 배고, 꼭대기는 볕을 받아 따뜻하다
      const c = base.clone();
      if (y < 1.4) c.lerp(foot, 1 - y / 1.4);
      else c.lerp(warm, Math.max(0, (y - DOME_H * 0.6) / (DOME_H * 0.4)) * 0.6);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  // 현관 통로: 곧은 벽 위에 반원 지붕. 돔에 파묻혀 나온다
  function vestibuleGeo(w, wallH, d) {
    const r = w / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-r, 0);
    shape.lineTo(-r, wallH);
    shape.absarc(0, wallH, r, Math.PI, 0, true);
    shape.lineTo(r, 0);
    shape.lineTo(-r, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 3, curveSegments: 24 });
    g.computeVertexNormals();
    return g;
  }
  // 문패: 치이카와 얼굴 (둥근 얼굴판 + 귀)
  function facePlate(k, x, y, z, s) {
    k.ball(x, y, z, 1.05 * s, 0.9 * s, 0.16, '#fffdf8');
    for (const sx of [-1, 1]) k.ball(x + sx * 0.5 * s, y + 0.72 * s, z, 0.24 * s, 0.24 * s, 0.12, '#fffdf8');
    k.paint(x, y - 0.8 * s, z + 0.18, 1.8 * s, 1.5 * s, g => {
      for (const sx of [-1, 1]) {
        g.fillStyle = '#2b1b1b';
        g.beginPath();
        g.arc(sx * 0.33 * s, 0.82 * s, 0.1 * s, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(sx * 0.33 * s + 0.03 * s, 0.86 * s, 0.035 * s, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f5bccb';
        g.beginPath();
        g.ellipse(sx * 0.6 * s, 0.6 * s, 0.18 * s, 0.1 * s, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#e48fa5';
        g.lineWidth = 0.02 * s;
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(sx * 0.6 * s + i * 0.06 * s, 0.55 * s);
          g.lineTo(sx * 0.6 * s + i * 0.06 * s + 0.04 * s, 0.65 * s);
          g.stroke();
        }
      }
      g.strokeStyle = '#2b1b1b';
      g.lineWidth = 0.045 * s;
      g.beginPath();
      g.moveTo(-0.11 * s, 0.6 * s);
      g.quadraticCurveTo(-0.05 * s, 0.52 * s, 0, 0.58 * s);
      g.quadraticCurveTo(0.05 * s, 0.52 * s, 0.11 * s, 0.6 * s);
      g.stroke();
    });
  }
  // 2026-11-10 2차 이재헌 지시: 치이카와 집은 바로 옆 이웃 돔 집(hut)과 똑같은 외형, 크기만 조금 더 크게 (문패·표지판 등 덧붙이지 않는다)
  const HR = 10;
  function homeDef(p) {
    const R = HR - 0.5;
    const pts = [];
    const n = 24;
    const gap = Math.asin(1.8 / R);
    for (let i = 0; i <= n; i++) {
      const a = gap + (i / n) * (Math.PI * 2 - gap * 2);
      pts.push([Math.sin(a) * R, Math.cos(a) * R]);
    }
    return {
      area: { x: 0, z: 0, w: R * 2, d: R * 2 + 1.4 },
      exterior(k) { HUT_BASE(k, { ...p, r: HR }); },
      interior(k, api) {
        polygonFloor(k, pts, '#efe5cf');
        api.walls(pts, { h: 4.4, t: 0.4, color: '#fffaf0', ink: 2 });
        k.box(0, -0.02, R + 0.5, 3.6, 0.06, 1.6, '#efe5cf', 0);
        // 둥근 깔개와 분홍 앉은뱅이 탁자, 찻잔
        k.cyl(1.2, 0.04, 0.9, 2.6, 0.06, '#f6e3c8', 1);
        k.cyl(1.2, 0.05, 0.9, 2.1, 0.06, '#f3c4cf', 0);
        k.cyl(1.2, 0.5, 0.9, 1.5, 0.12, '#f1a9b4', 2);
        for (const [x, z] of [[0.3, 0.1], [2.1, 0.1], [0.3, 1.7], [2.1, 1.7]]) k.cyl(x, 0.24, z, 0.08, 0.48, '#e8e0d0', 0);
        for (const [x, z] of [[0.8, 0.6], [1.6, 1.2]]) k.cyl(x, 0.66, z, 0.2, 0.2, '#fffdf8', 1);
        // 부엌: 몸에 맞춘 낮은 조리대(높이 0.75)와 작은 2구 가스레인지, 개수대, 걸어 둔 국자
        k.box(4.4, 0.36, -5.2, 3.6, 0.72, 1.1, '#ece5b4', 1);
        k.box(4.4, 0.74, -5.2, 3.7, 0.06, 1.2, '#d9cf98', 1);
        k.box(5.3, 0.8, -5.2, 1.1, 0.08, 0.75, '#5e5c58', 1);
        for (const dx of [-0.26, 0.26]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), mat('#3f3d3a')); r.rotation.x = Math.PI / 2; r.position.set(5.3 + dx, 0.85, -5.2); k.group.add(r); }
        k.cyl(3.4, 0.78, -5.2, 0.38, 0.06, '#cfd6d8', 1);
        // 공부 책상: 검정 문제집
        k.box(-4.8, 0.62, -5.0, 2.4, 0.12, 1.2, '#c9a57c', 1);
        for (const [x, z] of [[-5.8, -5.4], [-3.8, -5.4], [-5.8, -4.6], [-3.8, -4.6]]) k.box(x, 0.3, z, 0.12, 0.6, 0.12, '#a98a66', 0);
        [['#f3a9bd', 0], ['#a8c6e0', 0.1], ['#b7d6a5', 0.2]].forEach(([c, h], i) => k.box(-5.3 + i * 0.05, 0.73 + h, -5.1, 0.8, 0.09, 0.6, c, 0));
        furnishHouse(k, api, [-5.6, 1.2], 0);
        k.ball(-6.4, 0.95, -1.4, 0.34, 0.36, 0.3, '#a8774f');
      },
    };
  }
  BUILDERS.home = (k, p) => window.Interiors.mount(k, p, homeDef(p));
  // 소켓 (장소 기준, 정면 +z): 이웃 돔 집과 같은 위치의 문·창
  window.ASSET_SOCKETS.home = {
    door_front: [0, HR + 1.6, 0, 0, HR],
    window_peek: [-HR * 0.62 - 1.2, HR * 0.68 + 1.2, 0, -HR * 0.62, HR * 0.68],
    bed_lie: [-5.6, 1.8, 0.56, -5.6, 7],
    table_sit: [1.2, 3.2, 0.0, 1.2, 0.9],
    cook_stand: [5.3, -3.9, 0, 5.3, -5.2],
  };

  // 모형 안쪽을 틔우면서 막힌 자리를 바로 앞으로 옮긴다
  Object.assign(window.ASSET_SOCKETS.sauna, { shower_sit: [2.5, -2.9, 0.2, 2.5, -5] });
  Object.assign(window.ASSET_SOCKETS.mucha, { shelf_look_1: [-0.8, 1.2, 0.2, -0.8, -0.5], shelf_look_2: [3.1, 1.2, 0.2, 3.1, -0.5] });

  window.Interiors.mountAll = mountAll;
}());
