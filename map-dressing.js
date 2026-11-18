'use strict';

// 치이카와 심즈 — 장소 마감 소품
// 맨땅이던 가게 앞·마당·현장에 그 장소다운 소품을 놓는다. 건물과 상호작용 좌표는 건드리지 않는다.
// 장소마다 소품을 한 덩어리로 합쳐 그린다(그리기 호출 2번). 길 지도를 만들기 전에 놓으므로 사물은 몸을 통과하지 않는다.
// 자리는 장소 이름으로 정해지는 난수라 실행할 때마다 같다. 길·문 앞·자리·기존 장식·건물 위에는 놓지 않는다.
(function (root) {
  const INK = '#4a3230';
  const part = (geo, color, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, ry = 0, rz = 0) => ({ geo, color, x, y, z, sx, sy, sz, ry, rz });
  const sphere = new THREE.SphereGeometry(1, 7, 5);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 7);
  const cone = new THREE.ConeGeometry(1, 1, 5);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const rock = new THREE.DodecahedronGeometry(1, 0);

  // [소품, 놓을 때 차지하는 반지름]
  const P = {
    flowers: [[part(sphere, '#a9d39b', 0, 0.03, 0, 0.55, 0.1, 0.5), part(sphere, '#f4a9bd', 0.2, 0.2, 0.1, 0.1), part(sphere, '#fff1b8', -0.2, 0.18, 0.05, 0.1), part(sphere, '#f4a9bd', 0, 0.22, -0.22, 0.1), part(sphere, '#fff7ee', 0.05, 0.17, 0.26, 0.09)], 0.6],
    tulips: [[part(sphere, '#9dcf90', 0, 0.03, 0, 0.5, 0.08, 0.42), part(cone, '#e77f8f', -0.2, 0.2, 0, 0.09, 0.16, 0.09), part(cone, '#f3c64f', 0.14, 0.21, 0.12, 0.09, 0.16, 0.09), part(cone, '#e77f8f', 0.1, 0.2, -0.18, 0.09, 0.16, 0.09)], 0.55],
    tuft: [[part(cone, '#8fc586', 0, 0.13, 0, 0.14, 0.26, 0.14), part(cone, '#a6d29a', 0.16, 0.1, 0.05, 0.11, 0.2, 0.11), part(cone, '#7fb979', -0.13, 0.1, 0.08, 0.1, 0.19, 0.1)], 0.4],
    pebble: [[part(rock, '#c9c4b6', 0, 0.09, 0, 0.26, 0.15, 0.22), part(rock, '#d8d3c5', 0.3, 0.06, 0.12, 0.15, 0.09, 0.14)], 0.5],
    stone: [[part(rock, '#bdb7a8', 0, 0.42, 0, 0.72, 0.52, 0.62), part(rock, '#cfc9ba', 0.55, 0.2, 0.25, 0.32, 0.24, 0.3)], 1.1],
    crate: [[part(box, '#c79a63', 0, 0.42, 0, 0.9, 0.84, 0.9), part(box, '#a97c50', 0, 0.84, 0, 0.98, 0.07, 0.98), part(box, '#a97c50', 0, 0.08, 0, 0.98, 0.1, 0.98), part(box, '#a97c50', 0, 0.45, 0.46, 0.14, 0.76, 0.03, 0.8)], 0.85],
    crates: [[part(box, '#c79a63', -0.3, 0.38, 0, 0.74, 0.76, 0.74), part(box, '#b98b58', 0.5, 0.3, 0.12, 0.58, 0.6, 0.58, 0.4), part(box, '#d4ab79', -0.2, 0.98, 0.04, 0.5, 0.44, 0.5, 0.3)], 1.05],
    barrel: [[part(cyl, '#b98b58', 0, 0.5, 0, 0.44, 1, 0.44), part(cyl, '#7d6250', 0, 0.26, 0, 0.47, 0.07, 0.47), part(cyl, '#7d6250', 0, 0.76, 0, 0.47, 0.07, 0.47), part(cyl, '#a57a4d', 0, 1.01, 0, 0.4, 0.03, 0.4)], 0.65],
    sack: [[part(sphere, '#dcc9a3', 0, 0.36, 0, 0.46, 0.38, 0.4), part(cone, '#cdb88e', 0, 0.82, 0, 0.14, 0.24, 0.14)], 0.6],
    pot: [[part(cyl, '#c98a64', 0, 0.26, 0, 0.3, 0.52, 0.3), part(cyl, '#a96f4e', 0, 0.53, 0, 0.35, 0.09, 0.35), part(sphere, '#8fc586', 0, 0.86, 0, 0.4, 0.38, 0.4), part(sphere, '#f4a9bd', 0.18, 1.1, 0.1, 0.09)], 0.55],
    shrub: [[part(sphere, '#94c78b', 0, 0.55, 0, 0.72, 0.6, 0.68), part(sphere, '#a8d39b', 0.5, 0.4, 0.2, 0.46, 0.4, 0.44), part(sphere, '#86bb7f', -0.45, 0.38, -0.2, 0.42, 0.36, 0.42)], 1.05],
    log: [[part(cyl, '#a98362', 0, 0.3, 0, 0.3, 1.6, 0.3, 0, Math.PI / 2), part(cyl, '#e2c9a2', 0.81, 0.3, 0, 0.26, 0.03, 0.26, 0, Math.PI / 2), part(cyl, '#e2c9a2', -0.81, 0.3, 0, 0.26, 0.03, 0.26, 0, Math.PI / 2)], 1.05],
    mushroom: [[part(cyl, '#f6efdf', 0, 0.18, 0, 0.09, 0.36, 0.09), part(sphere, '#d9745a', 0, 0.38, 0, 0.26, 0.16, 0.26), part(cyl, '#f1e7d2', 0.3, 0.11, 0.14, 0.06, 0.22, 0.06), part(sphere, '#e6a15f', 0.3, 0.24, 0.14, 0.16, 0.1, 0.16)], 0.55],
    stakes: [[part(box, '#a97c50', -1, 0.5, 0, 0.14, 1, 0.14), part(box, '#a97c50', 1, 0.5, 0, 0.14, 1, 0.14), part(box, '#c79a63', 0, 0.74, 0, 2.2, 0.12, 0.08), part(box, '#c79a63', 0, 0.4, 0, 2.2, 0.12, 0.08)], 1.3],
    lantern: [[part(cyl, '#bdb7a8', 0, 0.45, 0, 0.14, 0.9, 0.14), part(box, '#a9a395', 0, 0.94, 0, 0.5, 0.1, 0.5), part(box, '#fff0bf', 0, 1.2, 0, 0.3, 0.42, 0.3), part(cone, '#7d7468', 0, 1.6, 0, 0.42, 0.34, 0.42)], 0.55],
    stepstone: [[part(cyl, '#d8cfbd', 0, 0.03, 0, 0.5, 0.06, 0.42), part(cyl, '#cfc5b1', 0.85, 0.03, 0.15, 0.38, 0.06, 0.34)], 1],
  };

  // 장소별 테마 한 줄과 소품 [이름, 개수]
  const SHOP = [['pot', 2], ['flowers', 3], ['crate', 1], ['stepstone', 2]];
  const YARD = [['flowers', 4], ['tulips', 3], ['shrub', 2], ['stakes', 2], ['stepstone', 3], ['pebble', 2]];
  const WILD = [['stone', 2], ['tuft', 5], ['pebble', 3], ['mushroom', 2]];
  const SPRING = [['flowers', 3], ['tuft', 4], ['pebble', 2], ['log', 1]];
  const THEME = {
    // 접수처는 하루 종일 줄이 서는 곳이라 소품을 두지 않는다 (두면 주민이 막힌다: 측정 하루 1회 → 6회 이상)
    exam: ['시험 날 줄 서는 앞마당', [['pot', 3], ['shrub', 2], ['stepstone', 3], ['lantern', 1]]],
    arbiter: ['깔끔한 시험장 앞', [['pot', 3], ['shrub', 2], ['lantern', 1]]],
    internet: ['작은 가게 뒷마당', [['pot', 2], ['crate', 2], ['tuft', 3]]],
    ramenRo: ['재료 상자가 쌓인 라멘집 옆', [['crates', 2], ['barrel', 2], ['sack', 1], ['pot', 1]]],
    ramenYama: ['국물 통이 나와 있는 라멘집 옆', [['barrel', 2], ['crate', 2], ['pot', 2]]],
    umaCurry: ['향신료 자루가 있는 카레집', [['sack', 3], ['crate', 1], ['pot', 2]]],
    umaiya: ['정갈한 식당 앞', [['pot', 3], ['shrub', 1], ['barrel', 1], ['lantern', 1]]],
    kissa: ['꽃이 많은 찻집', [['flowers', 4], ['tulips', 3], ['pot', 3], ['lantern', 1]]],
    machioka: ['과자 상자가 쌓인 가게', [['crates', 2], ['pot', 2], ['tulips', 2]]],
    soba: ['서서 먹는 소바집 옆', [['barrel', 1], ['crate', 1], ['pot', 2], ['lantern', 1]]],
    pharmacy: ['화분을 가꾼 약국', [['pot', 4], ['flowers', 2], ['shrub', 1]]],
    pochette: ['꽃으로 꾸민 포셰트 가게 앞', [['pot', 3], ['tulips', 3], ['flowers', 2], ['lantern', 1]]],
    recycle: ['물건이 넘쳐 나온 재활용 가게', [['crates', 3], ['barrel', 2], ['sack', 2]]],
    mucha: ['짐이 드나드는 큰 가게', [['crates', 3], ['sack', 3], ['barrel', 2], ['lantern', 2]]],
    lemon: ['레몬 상자를 내놓는 공장', [['crates', 3], ['barrel', 2], ['sack', 1]]],
    arcade: ['덩굴이 뒤덮은 폐 게임센터', [['tuft', 6], ['shrub', 2], ['pebble', 3], ['crate', 1]]],
    onsen: ['돌과 등불이 있는 온천 마당', [['stone', 3], ['lantern', 2], ['shrub', 2], ['stepstone', 3]]],
    sauna: ['장작을 쌓아 둔 사우나', [['log', 3], ['stone', 2], ['barrel', 1], ['lantern', 1]]],
    market: ['장터의 짐과 등불', [['crates', 3], ['barrel', 2], ['sack', 3], ['lantern', 3]]],
    momongaHome: ['꽃으로 치장한 마당', YARD],
    shisaHome: ['단정하게 가꾼 마당', [['pot', 3], ['flowers', 3], ['stakes', 2], ['stepstone', 3]]],
    rakkoHome: ['훈련 도구가 있는 마당', [['log', 2], ['stone', 2], ['stakes', 2], ['stepstone', 2]]],
    kurimanjuHome: ['빈 병 상자가 있는 마당', [['crates', 2], ['barrel', 2], ['tuft', 3], ['stepstone', 2]]],
    furuhonyaHome: ['책 상자가 나와 있는 마당', [['crates', 2], ['flowers', 3], ['shrub', 2], ['stepstone', 2]]],
    wilds: ['괴물이 사는 거친 땅', [['stone', 3], ['log', 2], ['tuft', 8], ['mushroom', 3]]],
    wildsForest: ['괴물이 눌러사는 숲', [['stone', 4], ['log', 4], ['tuft', 10], ['mushroom', 6]]],
    wildsDeep: ['큰 괴물이 사는 깊은 숲', [['stone', 6], ['log', 5], ['tuft', 8], ['mushroom', 8]]],
    // 토벌 훈련소는 training-ground.js가 마당째로 짓는다 (흩뿌린 돌·통나무가 훈련 기구와 겹친다)
    hunt: ['토벌 훈련소', []],
    rice: SPRING, servers: SPRING, sausage: SPRING, softcream: SPRING, ramune: SPRING, sobaSpring: SPRING, akafuku: SPRING, castella: SPRING, bigPudding: SPRING,
    misoBank: ['된장 강가', [['stone', 3], ['tuft', 5], ['pebble', 3]]],
    hole: ['조심해야 할 구멍', [['stakes', 2], ['stone', 2], ['tuft', 4]]],
    antlion: ['모래 언저리', [['stone', 3], ['pebble', 4], ['tuft', 2]]],
    smallCave: ['숲속 동굴 입구', WILD],
    goblin: ['고블린 동굴 앞', [['stone', 2], ['log', 2], ['mushroom', 3], ['tuft', 3]]],
    yamanba: ['산속 외딴집', [['log', 3], ['mushroom', 3], ['stone', 2], ['lantern', 1]]],
    hiroma: ['모닥불이 있는 여관 앞', [['log', 2], ['lantern', 2], ['shrub', 2], ['stepstone', 2]]],
    shrine: ['돌등이 늘어선 신사', [['lantern', 3], ['shrub', 2], ['stone', 2]]],
    statue: ['기념 공원', [['flowers', 3], ['shrub', 2]]],
    pond: ['물가의 풀숲', [['tuft', 5], ['stone', 2], ['flowers', 2]]],
    home: ['치이카와의 작은 마당', [['flowers', 4], ['tulips', 3], ['stepstone', 3], ['stakes', 1]]],
    usagi: ['우거진 수풀', [['tuft', 5], ['mushroom', 3], ['stone', 2]]],
  };

  // 사람이 몰리는 곳은 줄과 동선이 넓게 필요하다
  const BUSY = new Set(['reception', 'exam', 'arbiter']);

  const LOW = new Set(['flowers', 'tulips', 'tuft', 'pebble', 'stepstone', 'mushroom']);

  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  function roadGap(x, z) {
    let best = Infinity;
    for (const r of ROADS) for (let i = 0; i + 1 < r.points.length; i++) {
      const a = r.points[i];
      const b = r.points[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) - r.w / 2);
    }
    return best;
  }
  function socketPoints(p, data, out) {
    const th = ((p.face || 0) * Math.PI) / 2;
    for (const v of Object.values(data || {})) {
      if (Array.isArray(v)) out.push({ x: p.x + v[0] * Math.cos(th) + v[1] * Math.sin(th), z: p.z - v[0] * Math.sin(th) + v[1] * Math.cos(th) });
      else if (v && typeof v === 'object') socketPoints(p, v, out);
    }
  }

  const color = new THREE.Color();
  const mat4 = new THREE.Matrix4();
  const place4 = new THREE.Matrix4();
  const partQ = new THREE.Quaternion();
  const euler = new THREE.Euler();
  function bake(items) {
    const pos = [];
    const nor = [];
    const col = [];
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    for (const it of items) {
      place4.compose(new THREE.Vector3(it.x, it.y, it.z), partQ.setFromEuler(euler.set(0, it.ry, 0)).clone(), new THREE.Vector3(it.s, it.s, it.s));
      for (const q of P[it.kind][0]) {
        const g = q.geo.index ? q.geo.toNonIndexed() : q.geo;
        const pa = g.attributes.position;
        const na = g.attributes.normal;
        mat4.compose(new THREE.Vector3(q.x, q.y, q.z), partQ.setFromEuler(euler.set(0, q.ry, q.rz)).clone(), new THREE.Vector3(q.sx, q.sy, q.sz));
        mat4.premultiply(place4);
        nm.getNormalMatrix(mat4);
        color.set(q.color);
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(mat4);
          n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
          pos.push(v.x, v.y, v.z);
          nor.push(n.x, n.y, n.z);
          col.push(color.r, color.g, color.b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }

  root.MapDressing = {
    report: {},
    meshes: [],
    cull(view) {
      for (const m of this.meshes) m.mesh.visible = Math.hypot(view.x - m.x, view.z - m.z) < 220 + view.dist;
    },
    apply(scene, world) {
      const solids = [];
      scene.updateMatrixWorld(true);
      scene.traverse(o => {
        if (!o.isMesh || o.isSprite || !o.geometry || !o.geometry.attributes.position || o.isInstancedMesh) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
        if (r > 120) return;
        solids.push({ o, r, c: o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld) });
      });
      const allSpots = [];
      for (const p of world.places) socketPoints(p, (root.ASSET_SOCKETS || {})[p.id], allSpots);
      const decor = root.MAP_DECOR || [];
      const portals = world.portals || [];
      const ray = new THREE.Raycaster();
      const down = new THREE.Vector3(0, -1, 0);
      const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
      const toon = new THREE.MeshToonMaterial({ vertexColors: true });
      for (const p of world.places) {
        const theme = THEME[p.id];
        if (!theme) continue;
        const recipe = Array.isArray(theme[0]) ? theme : theme[1];
        const R = mulberry(hash(p.id));
        const th = ((p.face || 0) * Math.PI) / 2;
        const reach = Math.max(14, (p.r || 10) * 1.5);
        const near = solids.filter(s => Math.hypot(s.c.x - p.x, s.c.z - p.z) < reach + s.r + 3).map(s => s.o);
        const spots = allSpots.filter(s => Math.hypot(s.x - p.x, s.z - p.z) < reach + 4);
        const items = [];
        const keep = BUSY.has(p.id) ? 4.5 : 1.7;
        const clear = (x, z, rad) => {
          if (!world.isWalkable(x, z) || roadGap(x, z) < rad + 0.6) return false;
          const dx = x - p.x;
          const dz = z - p.z;
          // 건물 앞(문 쪽)은 비워 둔다
          const lx = dx * Math.cos(th) - dz * Math.sin(th);
          const lz = dx * Math.sin(th) + dz * Math.cos(th);
          if (lz > 0 && Math.abs(lx) < 4.5 && lz < 16) return false;
          // 사람이 몰리는 곳은 뒤편에만 둔다
          if (BUSY.has(p.id) && lz > -2) return false;
          if (spots.some(s => Math.hypot(s.x - x, s.z - z) < rad + keep)) return false;
          if (portals.some(s => Math.hypot(s.x - x, s.z - z) < rad + 3)) return false;
          if (decor.some(e => Math.abs(e.x - x) < 3 && Math.abs(e.z - z) < 3 && Math.hypot(e.x - x, e.z - z) < rad + 1.2)) return false;
          if (items.some(e => Math.hypot(e.x - x, e.z - z) < rad + e.rad + 0.5)) return false;
          const f = world.floorAt(x, z);
          for (const [ox, oz] of [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]]) {
            const fy = world.floorAt(x + ox, z + oz);
            if (Math.abs(fy - f) > 0.5) return false;
            ray.set(new THREE.Vector3(x + ox, f + 12, z + oz), down);
            ray.far = 14;
            const hit = ray.intersectObjects(near, false).find(h => h.point.y > fy + 0.2);
            if (hit) return false;
          }
          return true;
        };
        for (const [kind, count] of recipe) {
          const rad = P[kind][1];
          for (let n = 0; n < count; n++) {
            for (let tries = 0; tries < 50; tries++) {
              const a = R() * Math.PI * 2;
              const d = (p.r || 10) * 0.45 + R() * reach;
              const x = p.x + Math.cos(a) * d;
              const z = p.z + Math.sin(a) * d;
              if (!clear(x, z, rad)) continue;
              items.push({ kind, x, z, y: world.floorAt(x, z), ry: R() * Math.PI * 2, s: 0.85 + R() * 0.35, rad });
              break;
            }
          }
        }
        if (!items.length) continue;
        const geo = bake(items);
        const mesh = new THREE.Mesh(geo, toon);
        mesh.receiveShadow = false;
        this.meshes.push({ mesh, x: p.x, z: p.z });
        mesh.name = `dressing:${p.id}`;
        // 외곽선은 키가 있는 소품에만 (작은 풀·꽃·돌까지 그리면 정점이 두 배가 된다)
        const hullGeo = bake(items.filter(it => !LOW.has(it.kind)));
        const a = hullGeo.attributes.position;
        const b = hullGeo.attributes.normal;
        for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) + b.getX(i) * 0.03, a.getY(i) + b.getY(i) * 0.03, a.getZ(i) + b.getZ(i) * 0.03);
        const hull = new THREE.Mesh(hullGeo, inkMat);
        hull.raycast = () => {};
        hull.userData.navSkip = true;
        mesh.add(hull);
        scene.add(mesh);
        this.report[p.id] = { theme: Array.isArray(theme[0]) ? '' : theme[0], items: items.length, verts: a.count };
      }
      return this.report;
    },
  };
}(typeof self !== 'undefined' ? self : this));
