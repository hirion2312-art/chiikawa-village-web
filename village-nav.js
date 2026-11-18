'use strict';

// 치이카와 심즈 — 길 지도 (접촉 규칙 R1·R3, docs/contact-rules.md · docs/handover-sims-contact.md)
// 씬에 실제로 보이는 지오메트리로 2D 격자를 만든다. 캐릭터 키(1.7) 높이대에 무언가 있으면 그 칸은 막힌다.
// 막힌 칸을 캐릭터 반경만큼 넓히고, 그 위에서 A*로 길을 찾는다. 칸마다 밟는 면의 높이(바닥판 등)도 기록한다.
(function (root) {
  const CELL = 0.5;
  const X0 = -300;
  const X1 = 560;             // 야생 반도(깊은 숲)까지
  const Z0 = -260;
  const Z1 = 540;
  const LOW = 0.3;        // 이보다 낮은 것은 밟고 지나간다 (바닥판·길·데칼)
  const HIGH = 1.8;       // 이보다 높은 것은 머리 위다 (지붕·간판)
  const RADIUS = 0.6;     // 캐릭터 반경
  const SAMPLE = 0.25;    // 삼각형 위 점 간격
  const BIG = 200;        // 이보다 큰 메시는 땅·바다로 본다
  const APPROACH = 2.5;   // 막힌 자리(의자 등)에 들어가기 전에 설 빈칸을 찾는 거리
  const PLAT_MAX = 2.0;   // 이 높이까지의 위를 보는 면은 올라설 수 있는 단 (무대·밭·훈련장)
  const DECK_MAX = 4.5;   // 물 위에서는 이 높이까지의 판을 다리로 본다
  const STEP = 0.35;      // 이웃 칸과 서는 높이가 이보다 많이 다르면 건너가지 못한다 (계단은 오르고 의자·탁자에는 못 오른다)

  // 씬이 다 얹힐 때까지 기다린다: 메시 수가 quietMs 동안 그대로면 끝난 것으로 본다
  function waitSettled(scene, { quietMs = 2000, maxMs = 60000 } = {}) {
    return new Promise(resolve => {
      let last = -1;
      let since = performance.now();
      const started = performance.now();
      const timer = setInterval(() => {
        let n = 0;
        scene.traverse(o => { if (o.isMesh) n++; });
        const now = performance.now();
        if (n !== last) {
          last = n;
          since = now;
        } else if (now - since >= quietMs || now - started > maxMs) {
          clearInterval(timer);
          resolve(n);
        }
      }, 250);
    });
  }

  // 길 지도에 넣지 않을 메시: 캐릭터, 외곽선 껍질, 스프라이트, 보이지 않는 것
  function isStatic(o, skipRoots) {
    if (!o.isMesh || o.isSprite) return false;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.side === THREE.BackSide) return false;
    for (let p = o; p; p = p.parent) {
      if (!p.visible || skipRoots.has(p)) return false;
    }
    return true;
  }

  function build(scene, world, { skip = [] } = {}) {
    const t0 = performance.now();
    const cols = Math.ceil((X1 - X0) / CELL);
    const rows = Math.ceil((Z1 - Z0) / CELL);
    const N = cols * rows;
    const SUB = CELL / 2;                    // 장애물은 0.25 세부 칸으로 찍어 반경을 정확히 넓힌다
    const scols = cols * 2;
    const srows = rows * 2;
    const idx = (x, z) => {
      const cx = Math.floor((x - X0) / CELL);
      const cz = Math.floor((z - Z0) / CELL);
      return cx < 0 || cz < 0 || cx >= cols || cz >= rows ? -1 : cz * cols + cx;
    };
    const skipRoots = new Set(skip);
    const meshes = [];
    scene.updateMatrixWorld(true);
    scene.traverse(o => { if (isStatic(o, skipRoots)) meshes.push(o); });

    // 물(걸을 수 없는 땅)은 칸 중심으로 먼저 정한다
    const water = new Uint8Array(N);
    if (world.isWalkable) {
      for (let cz = 0; cz < rows; cz++) for (let cx = 0; cx < cols; cx++) {
        if (!world.isWalkable(X0 + (cx + 0.5) * CELL, Z0 + (cz + 0.5) * CELL)) water[cz * cols + cx] = 1;
      }
    }

    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const C = new THREE.Vector3();
    const E1 = new THREE.Vector3();
    const E2 = new THREE.Vector3();
    const M = new THREE.Matrix4();
    const inst = new THREE.Matrix4();
    let tris = 0;
    const raycastable = [];
    const jobs = [];
    for (const o of meshes) {
      const geo = o.geometry;
      if (!geo || !geo.attributes.position) continue;
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, inst);
          const m = new THREE.Matrix4().multiplyMatrices(o.matrixWorld, inst);
          box.copy(geo.boundingBox).applyMatrix4(m).getSize(size);
          if (Math.max(size.x, size.z) <= BIG) jobs.push([geo, m]);
        }
        continue;
      }
      box.copy(geo.boundingBox).applyMatrix4(o.matrixWorld).getSize(size);
      if (Math.max(size.x, size.z) > BIG) continue;
      jobs.push([geo, o.matrixWorld]);
      raycastable.push(o);
    }
    // 삼각형 위 점을 고르게 찍어 visit(x, y높이차, z, 칸, 위를보는가)에 넘긴다
    function sampleAll(visit) {
      tris = 0;
      for (const [geo, m] of jobs) {
        const pos = geo.attributes.position;
        const index = geo.index ? geo.index.array : null;
        const n = index ? index.length : pos.count;
        for (let i = 0; i < n; i += 3) {
          A.fromBufferAttribute(pos, index ? index[i] : i).applyMatrix4(m);
          B.fromBufferAttribute(pos, index ? index[i + 1] : i + 1).applyMatrix4(m);
          C.fromBufferAttribute(pos, index ? index[i + 2] : i + 2).applyMatrix4(m);
          tris++;
          if (Math.max(A.x, B.x, C.x) < X0 || Math.min(A.x, B.x, C.x) > X1 || Math.max(A.z, B.z, C.z) < Z0 || Math.min(A.z, B.z, C.z) > Z1) continue;
          E1.subVectors(B, A);
          E2.subVectors(C, A);
          E1.cross(E2);
          const len = E1.length() || 1;
          const up = E1.y / len > 0.85;
          const edge = Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A));
          const k = Math.max(1, Math.ceil(edge / SAMPLE));
          for (let a = 0; a <= k; a++) {
            for (let b = 0; a + b <= k; b++) {
              const u = a / k;
              const v = b / k;
              const w = 1 - u - v;
              const x = A.x * w + B.x * u + C.x * v;
              const z = A.z * w + B.z * u + C.z * v;
              const c = idx(x, z);
              if (c < 0) continue;
              visit(x, A.y * w + B.y * u + C.y * v - world.floorAt(x, z), z, c, up);
            }
          }
        }
      }
    }

    // 1차: 칸마다 서는 높이. 위를 보는 면(단·바닥판·다리 판)의 가장 높은 곳, 없으면 낮은 바닥판
    const plat = new Uint16Array(N);
    const ground = new Uint16Array(N);
    sampleAll((x, dy, z, c, up) => {
      if (dy > -0.15 && dy < LOW) {
        const cm = Math.max(0, Math.round(dy * 100));
        if (cm > ground[c]) ground[c] = cm;
      } else if (up && dy >= LOW && dy <= (water[c] ? DECK_MAX : PLAT_MAX)) {
        const cm = Math.round(dy * 100);
        if (cm > plat[c]) plat[c] = cm;
      }
    });
    const level = new Uint16Array(N);
    let decks = 0;
    for (let c = 0; c < N; c++) {
      level[c] = plat[c] || ground[c];
      if (water[c] && plat[c]) {
        water[c] = 0;
        decks++;
      }
    }

    // 2차: 그 높이에 선 캐릭터의 몸 높이대(서는 높이 위 0.3~1.8)에 무언가 있으면 장애물
    const obstacle = new Uint8Array(scols * srows);
    sampleAll((x, dy, z, c) => {
      const rel = dy - level[c] / 100;
      if (rel < LOW || rel > HIGH) return;
      const sx = Math.floor((x - X0) / SUB);
      const sz = Math.floor((z - Z0) / SUB);
      if (sx >= 0 && sz >= 0 && sx < scols && sz < srows) obstacle[sz * scols + sx] = 1;
    });
    // 캐릭터 반경만큼 넓힌다: 칸 중심이 장애물 세부 칸 중심에서 반경 + 반 세부 칸 안이면 막는다.
    // 물가는 넓히지 않는다 (물가까지는 걸어갈 수 있고, 좁은 다리가 막히지 않게)
    const blocked = water.slice();
    const reachR = RADIUS + SUB * 0.5;
    const span = Math.ceil(reachR / CELL) + 1;
    for (let sz = 0; sz < srows; sz++) for (let sx = 0; sx < scols; sx++) {
      if (!obstacle[sz * scols + sx]) continue;
      const ox = X0 + (sx + 0.5) * SUB;
      const oz = Z0 + (sz + 0.5) * SUB;
      const cx0 = sx >> 1;
      const cz0 = sz >> 1;
      for (let dz = -span; dz <= span; dz++) for (let dx = -span; dx <= span; dx++) {
        const cx = cx0 + dx;
        const cz = cz0 + dz;
        if (cx < 0 || cz < 0 || cx >= cols || cz >= rows) continue;
        if (Math.hypot(X0 + (cx + 0.5) * CELL - ox, Z0 + (cz + 0.5) * CELL - oz) <= reachR) blocked[cz * cols + cx] = 1;
      }
    }
    let solidCells = 0;
    for (let i = 0; i < obstacle.length; i++) solidCells += obstacle[i];
    // 건너갈 수 있는지는 절대 높이로 비교한다 (다리·징검돌은 아래 땅이 낮다)
    const abs = new Float32Array(N);
    for (let cz = 0; cz < rows; cz++) for (let cx = 0; cx < cols; cx++) {
      const c = cz * cols + cx;
      abs[c] = world.floorAt(X0 + (cx + 0.5) * CELL, Z0 + (cz + 0.5) * CELL) + level[c] / 100;
    }
    const nav = new Nav({ cols, rows, blocked, level, abs, world, raycastable });
    nav.stats = { meshes: raycastable.length, triangles: tris, obstacleSubcells: solidCells, deckCells: decks, ms: Math.round(performance.now() - t0) };
    return nav;
  }

  /* ---------- 길찾기 ---------- */

  const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

  class Nav {
    constructor({ cols, rows, blocked, level, abs, world, raycastable }) {
      Object.assign(this, { cols, rows, blocked, level, abs, world, raycastable });
      const N = cols * rows;
      this.g = new Float32Array(N);
      this.came = new Int32Array(N);
      this.seen = new Uint32Array(N);
      this.closed = new Uint32Array(N);
      this.gen = 0;
      this.reach = null;
      this.heap = { f: new Float32Array(1 << 16), i: new Int32Array(1 << 16), n: 0 };
      this.ray = new THREE.Raycaster();
    }
    cellOf(x, z) {
      const cx = Math.floor((x - X0) / CELL);
      const cz = Math.floor((z - Z0) / CELL);
      return cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows ? -1 : cz * this.cols + cx;
    }
    center(c) {
      return { x: X0 + ((c % this.cols) + 0.5) * CELL, z: Z0 + (Math.floor(c / this.cols) + 0.5) * CELL };
    }
    isBlocked(x, z) {
      const c = this.cellOf(x, z);
      return c < 0 || this.blocked[c] === 1;
    }
    // 밟는 면이 바닥보다 얼마나 높은가 (가게 바닥판 등)
    surface(x, z) {
      const c = this.cellOf(x, z);
      return c < 0 ? 0 : this.level[c] / 100;
    }
    free(c) {
      return c >= 0 && !this.blocked[c] && (!this.reach || this.reach[c] === 1);
    }
    // 대각선은 양옆이 모두 비어 있을 때만 (모서리를 깎지 않는다)
    step(c, dx, dz) {
      const cx = c % this.cols;
      const cz = Math.floor(c / this.cols);
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= this.cols || nz >= this.rows) return -1;
      const n = nz * this.cols + nx;
      if (this.blocked[n] || Math.abs(this.abs[n] - this.abs[c]) > STEP) return -1;
      if (this.avoid && this.avoided(n)) return -1;
      if (dx && dz && (this.blocked[cz * this.cols + nx] || this.blocked[nz * this.cols + cx])) return -1;
      return n;
    }
    // 한 칸에서 이어진 칸 전부에 번호를 매긴다
    label(start, id) {
      const comp = this.comp;
      const queue = this.queue || (this.queue = new Int32Array(this.cols * this.rows));
      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      comp[start] = id;
      while (head < tail) {
        const c = queue[head++];
        for (const [dx, dz] of D8) {
          const n = this.step(c, dx, dz);
          if (n >= 0 && !comp[n]) {
            comp[n] = id;
            queue[tail++] = n;
          }
        }
      }
      return tail;
    }
    // 마을(시작점의 덩어리)과, 배 같은 포털로 이어진 덩어리들. 여기에 든 칸만 자리로 쓴다
    // portals: [{ x, z, r, to: { x, z }, label }] (world.portals 중 월드 안의 다른 곳으로 가는 것)
    flood(x, z, portals = []) {
      const N = this.cols * this.rows;
      this.comp = new Int32Array(N);
      this.links = [];
      let next = 1;
      // 반경 안의 빈칸 중, 이미 번호가 붙은 큰 덩어리(마을)에 든 칸을 먼저 고른다 (부두 위 작은 섬 같은 칸보다 해변)
      const pick = (px, pz, r) => {
        let best = -1;
        let bestScore = Infinity;
        const R = Math.ceil(r / CELL);
        const cx = Math.floor((px - X0) / CELL);
        const cz = Math.floor((pz - Z0) / CELL);
        for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= this.cols || nz >= this.rows) continue;
          const c = nz * this.cols + nx;
          if (this.blocked[c]) continue;
          const d = Math.hypot(dx, dz) * CELL;
          if (d > r) continue;
          const score = d - (this.comp[c] === home ? 1000 : 0);
          if (score < bestScore) {
            bestScore = score;
            best = c;
          }
        }
        return best;
      };
      const compOf = c => {
        if (c < 0) return 0;
        if (!this.comp[c]) this.label(c, next++);
        return this.comp[c];
      };
      let home = 0;
      home = compOf(this.nearestFree(x, z, 20, false));
      for (const p of portals) {
        if (!p.to || p.to.x === undefined || p.to.room) continue;
        const ca = pick(p.x, p.z, p.r || 3);
        const cb = pick(p.to.x, p.to.z, 4);
        const a = compOf(ca);
        const b = compOf(cb);
        if (!a || !b || a === b) continue;
        this.links.push({ a, b, from: this.center(ca), to: this.center(cb), label: p.label || '' });
      }
      // 마을에서 포털로 닿는 덩어리만 쓴다
      const ok = new Set([home]);
      for (let grew = true; grew;) {
        grew = false;
        for (const l of this.links) if (ok.has(l.a) && !ok.has(l.b)) { ok.add(l.b); grew = true; }
      }
      const reach = new Uint8Array(N);
      let count = 0;
      for (let c = 0; c < N; c++) if (ok.has(this.comp[c])) { reach[c] = 1; count++; }
      this.reach = reach;
      this.reachCount = count;
      this.home = home;
      return reach;
    }
    // 길 묶음: 같은 덩어리면 길 하나, 아니면 포털을 한 번 타는 길. [{ pts }, { jump: { from, to, label } }, { pts }]
    route(from, to) {
      const s = this.nearestFree(from.x, from.z, 3);
      const t = this.nearestFree(to.x, to.z, 1.5);
      if (s < 0 || t < 0) return null;
      const ca = this.comp[s];
      const cb = this.comp[t];
      if (ca === cb) {
        const pts = this.findPath(from, to);
        return pts ? [{ pts }] : null;
      }
      const link = this.links.find(l => l.a === ca && l.b === cb);
      if (!link) return null;
      const first = this.findPath(from, link.from);
      const second = this.findPath(link.to, to);
      if (!first || !second) return null;
      return [{ pts: first }, { jump: link }, { pts: second }];
    }
    // 가장 가까운 빈칸 (칸 번호). useReach면 갈 수 있는 칸만
    nearestFree(x, z, maxR = 3, useReach = true) {
      const ok = c => c >= 0 && !this.blocked[c] && (!useReach || !this.reach || this.reach[c] === 1);
      const c0 = this.cellOf(x, z);
      if (ok(c0)) return c0;
      let best = -1;
      let bestD = Infinity;
      const r = Math.ceil(maxR / CELL);
      const cx = Math.floor((x - X0) / CELL);
      const cz = Math.floor((z - Z0) / CELL);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= this.cols || nz >= this.rows) continue;
        const c = nz * this.cols + nx;
        if (!ok(c)) continue;
        const p = this.center(c);
        const d = Math.hypot(p.x - x, p.z - z);
        if (d <= maxR && d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    }
    // 두 점 사이가 막힌 칸을 지나지 않는가. 선이 지나는 칸을 하나도 빠짐없이 따라간다 (격자 순회)
    clear(a, b) {
      const fx = (a.x - X0) / CELL;
      const fz = (a.z - Z0) / CELL;
      const tx = (b.x - X0) / CELL;
      const tz = (b.z - Z0) / CELL;
      let cx = Math.floor(fx);
      let cz = Math.floor(fz);
      const ex = Math.floor(tx);
      const ez = Math.floor(tz);
      const dx = tx - fx;
      const dz = tz - fz;
      const sx = dx > 0 ? 1 : -1;
      const sz = dz > 0 ? 1 : -1;
      const ddx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
      const ddz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
      let mx = dx !== 0 ? (dx > 0 ? cx + 1 - fx : fx - cx) * ddx : Infinity;
      let mz = dz !== 0 ? (dz > 0 ? cz + 1 - fz : fz - cz) * ddz : Infinity;
      const ok = (x, z) => x >= 0 && z >= 0 && x < this.cols && z < this.rows && !this.blocked[z * this.cols + x] && !(this.avoid && this.avoided(z * this.cols + x));
      if (!ok(cx, cz)) return false;
      let prev = cz * this.cols + cx;
      for (let guard = 0; guard < 4096 && (cx !== ex || cz !== ez); guard++) {
        if (Math.abs(mx - mz) < 1e-9) {
          // 모서리를 정확히 지나면 양옆 칸도 비어 있어야 한다
          if (!ok(cx + sx, cz) || !ok(cx, cz + sz)) return false;
          cx += sx;
          cz += sz;
          mx += ddx;
          mz += ddz;
        } else if (mx < mz) {
          cx += sx;
          mx += ddx;
        } else {
          cz += sz;
          mz += ddz;
        }
        if (!ok(cx, cz)) return false;
        const c = cz * this.cols + cx;
        if (Math.abs(this.abs[c] - this.abs[prev]) > STEP) return false;
        prev = c;
      }
      return true;
    }
    push(f, i) {
      const h = this.heap;
      if (h.n >= h.f.length) {
        const f2 = new Float32Array(h.f.length * 2);
        const i2 = new Int32Array(h.i.length * 2);
        f2.set(h.f);
        i2.set(h.i);
        h.f = f2;
        h.i = i2;
      }
      let k = h.n++;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (h.f[p] <= f) break;
        h.f[k] = h.f[p];
        h.i[k] = h.i[p];
        k = p;
      }
      h.f[k] = f;
      h.i[k] = i;
    }
    pop() {
      const h = this.heap;
      const top = h.i[0];
      const f = h.f[--h.n];
      const i = h.i[h.n];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= h.n) break;
        if (c + 1 < h.n && h.f[c + 1] < h.f[c]) c++;
        if (h.f[c] >= f) break;
        h.f[k] = h.f[c];
        h.i[k] = h.i[c];
        k = c;
      }
      h.f[k] = f;
      h.i[k] = i;
      return top;
    }
    // 길을 찾는 동안 피해 갈 캐릭터 자리 (앉아 있는 캐릭터). 출발·도착 근처는 빼 준다
    setAvoid(points, from, to, r = 0.95) {
      this.avoid = points.filter(p => Math.hypot(p.x - to.x, p.z - to.z) > r + 0.6 && Math.hypot(p.x - from.x, p.z - from.z) > r + 0.6);
      if (!this.avoid.length) this.avoid = null;
      this.avoidR = r;
    }
    avoided(c) {
      const p = this.center(c);
      for (const q of this.avoid) if (Math.abs(q.x - p.x) < this.avoidR && Math.abs(q.z - p.z) < this.avoidR && Math.hypot(q.x - p.x, q.z - p.z) < this.avoidR) return true;
      return false;
    }
    // A* (8방향). 돌려주는 경로는 시야 검사로 편 점 목록. 못 찾으면 null
    findPath(from, to, maxExpand = 600000) {
      const s = this.nearestFree(from.x, from.z, 3);
      const t = this.nearestFree(to.x, to.z, 1.5);
      if (s < 0 || t < 0) return null;
      if (this.reach && (!this.reach[s] || !this.reach[t])) return null;
      if (this.comp && this.comp[s] !== this.comp[t]) return null;
      const gen = ++this.gen;
      const { g, came, seen, closed, cols } = this;
      const tc = this.center(t);
      const tx = t % cols;
      const tz = Math.floor(t / cols);
      const hOf = c => {
        const dx = Math.abs((c % cols) - tx);
        const dz = Math.abs(Math.floor(c / cols) - tz);
        return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * CELL;
      };
      this.heap.n = 0;
      g[s] = 0;
      seen[s] = gen;
      came[s] = -1;
      this.push(hOf(s), s);
      let expanded = 0;
      let found = false;
      while (this.heap.n) {
        const c = this.pop();
        if (closed[c] === gen) continue;
        closed[c] = gen;
        if (c === t) {
          found = true;
          break;
        }
        if (++expanded > maxExpand) break;
        for (const [dx, dz, w] of D8) {
          const n = this.step(c, dx, dz);
          if (n < 0 || closed[n] === gen) continue;
          const ng = g[c] + w * CELL;
          if (seen[n] !== gen || ng < g[n]) {
            seen[n] = gen;
            g[n] = ng;
            came[n] = c;
            // 휴리스틱에 가중치를 줘서 탐색 칸을 줄인다 (건물 안까지 길을 찾으며 생기던 끊김 방지)
            this.push(ng + hOf(n) * 1.4, n);
          }
        }
      }
      if (!found) return null;
      const cells = [];
      for (let c = t; c >= 0; c = came[c]) cells.push(c);
      cells.reverse();
      const raw = [{ x: from.x, z: from.z }, ...cells.slice(1, -1).map(c => this.center(c)), { x: to.x, z: to.z }];
      // 출발점이 막힌 칸(자리에서 막 일어남)이면 첫 칸 중심을 거친다
      if (this.isBlocked(from.x, from.z)) raw.splice(1, 0, this.center(s));
      if (this.isBlocked(to.x, to.z)) raw.splice(raw.length - 1, 0, tc);
      // 시야가 닿는 가장 먼 점으로 건너뛰며 편다
      const out = [raw[0]];
      let i = 0;
      while (i < raw.length - 1) {
        let j = raw.length - 1;
        while (j > i + 1 && !this.clear(raw[i], raw[j])) j--;
        out.push(raw[j]);
        i = j;
      }
      return out;
    }

    // 소켓에 접근하는 칸 (심즈 방식): 소켓이 빈칸이면 그대로, 막혀 있으면 APPROACH 안의 가장 가까운 갈 수 있는 빈칸
    approach(s) {
      const c = this.cellOf(s.x, s.z);
      if (this.free(c)) return { x: s.x, z: s.z, seatIn: false };
      // 언덕 위처럼 빈칸이 조금 떨어진 자리는 가까운 빈칸에서 올라간다
      let n = this.nearestFree(s.x, s.z, APPROACH);
      if (n < 0) n = this.nearestFree(s.x, s.z, 10);
      if (n < 0) return null;
      const p = this.center(n);
      return { x: p.x, z: p.z, seatIn: true };
    }

    // 자리 높이(R3): 그 xz에서 위부터 아래로 실제 면을 잰다. 면이 없으면 바닥(0)
    measure(x, z, hint = 0) {
      const floor = this.world.floorAt(x, z);
      const top = floor + Math.max(0.7, hint + 0.5);
      this.ray.set(new THREE.Vector3(x, top, z), new THREE.Vector3(0, -1, 0));
      this.ray.far = top - floor + 0.3;
      const near = this.raycastable.filter(o => {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
        const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
        return Math.hypot(c.x - x, c.z - z) <= r + 0.5;
      });
      const hit = this.ray.intersectObjects(near, false)[0];
      return hit ? Math.max(0, hit.point.y - floor) : 0;
    }
  }

  root.VillageNav = { build, waitSettled, Nav, CELL, RADIUS, LOW, HIGH, APPROACH, STEP };
}(typeof self !== 'undefined' ? self : this));
