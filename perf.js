'use strict';

// 프레임 유지: 이 게임은 그래픽 카드보다 CPU(장면 순회와 드로우 호출)가 먼저 찬다.
// 안 움직인 물체는 행렬을 다시 계산하지 않고, 화면에서 알아볼 수 없는 거리의 물체는 그리기 목록에서 뺀다
(function (root) {
  const THREE = root.THREE;

  /* ---------- 안 움직인 물체의 행렬은 그대로 둔다 ---------- */

  const proto = THREE.Object3D.prototype;
  proto.updateMatrixWorld = function (force) {
    // 숨긴 물체(멀어서 끈 장소·닫힌 실내)는 그 아래를 통째로 건너뛴다. 다시 보이면 한 번에 다시 계산한다 (2026-11-10)
    if (this.visible === false && this.parent !== null) { this.mwStale = true; return; }
    if (this.mwStale) { this.mwStale = false; force = true; }
    if (this.matrixAutoUpdate) {
      const p = this.position;
      const q = this.quaternion;
      const s = this.scale;
      let c = this.trsSeen;
      if (c === undefined) { c = new Float64Array(10).fill(NaN); this.trsSeen = c; }
      if (c[0] !== p.x || c[1] !== p.y || c[2] !== p.z || c[3] !== q._x || c[4] !== q._y || c[5] !== q._z || c[6] !== q._w || c[7] !== s.x || c[8] !== s.y || c[9] !== s.z) {
        c[0] = p.x; c[1] = p.y; c[2] = p.z; c[3] = q._x; c[4] = q._y; c[5] = q._z; c[6] = q._w; c[7] = s.x; c[8] = s.y; c[9] = s.z;
        this.updateMatrix();
      }
    }
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.parent === null) this.matrixWorld.copy(this.matrix);
      else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }
    const kids = this.children;
    for (let i = 0, l = kids.length; i < l; i++) {
      const k = kids[i];
      if (k.matrixWorldAutoUpdate === true || force === true) k.updateMatrixWorld(force);
    }
  };
  // 다른 부모로 옮겨 붙으면 자기 값이 그대로여도 세계 위치는 달라진다 (손에 쥐는 소품 등)
  const add = proto.add;
  proto.add = function (...list) {
    for (const o of list) if (o && o.isObject3D) o.matrixWorldNeedsUpdate = true;
    return add.apply(this, list);
  };

  // 그리기에서 뺀 물체도 충돌·높이 검사에는 그대로 잡혀야 한다
  for (const name of ['intersectObject', 'intersectObjects']) {
    const orig = THREE.Raycaster.prototype[name];
    THREE.Raycaster.prototype[name] = function (...args) {
      this.layers.enableAll();
      return orig.apply(this, args);
    };
  }

  /* ---------- 거리에 따라 그리기 목록에서 뺀다 ---------- */

  const DRAW_MASK = 1;   // 0번 층: 카메라가 그리는 층
  const HIDE_MASK = 2;   // 1번 층: 카메라가 그리지 않는 층 (visible은 게임 쪽이 쓰므로 건드리지 않는다)
  const SLICES = 5;      // 한 프레임에 전체의 1/5씩 살핀다
  const SHADOW_RANGE = 100;
  const FOG_END = 400;

  const entries = [];
  let cursor = 0;
  let ctx = null;
  const v = new THREE.Vector3();

  function addEntry(o) {
    const geo = o.geometry;
    if (!geo.attributes || !geo.attributes.position) return;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const scale = o.matrixWorld.getMaxScaleOnAxis();
    let sphere = geo.boundingSphere;
    let size = sphere.radius * scale;
    if (o.isInstancedMesh) {
      // 인스턴스는 전체 범위와 낱개 크기가 다르다
      if (!o.boundingSphere) o.computeBoundingSphere();
      sphere = o.boundingSphere;
      const m = new THREE.Matrix4();
      let sum = 0;
      const n = Math.min(o.count, 8);
      for (let i = 0; i < n; i++) {
        o.getMatrixAt(i, m);
        sum += m.getMaxScaleOnAxis();
      }
      size = geo.boundingSphere.radius * (n ? sum / n : 1) * scale;
    }
    const r = sphere.radius * scale;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const ink = !!mat && mat.side === THREE.BackSide;
    if (ink || size < 0.15) o.castShadow = false;
    const reach = ink ? Math.min(220, 100 + size * 25) : Math.min(FOG_END, 90 + size * 200);
    const lim = reach + r;
    const shadowLim = SHADOW_RANGE + r;
    entries.push({ o, cx: sphere.center.x, cy: sphere.center.y, cz: sphere.center.z, lim2: lim * lim, shadow2: shadowLim * shadowLim, casts: o.castShadow, on: true });
  }

  function collect(o, skip) {
    if (skip.has(o)) return;
    if (o.isMesh && !o.isSkinnedMesh && o.frustumCulled !== false) addEntry(o);
    for (const k of o.children) collect(k, skip);
  }

  function pass(camPos, focus) {
    const n = entries.length;
    if (!n) return;
    const count = Math.ceil(n / SLICES);
    for (let i = 0; i < count; i++) {
      const e = entries[cursor];
      cursor = (cursor + 1) % n;
      const m = e.o.matrixWorld.elements;
      const x = m[0] * e.cx + m[4] * e.cy + m[8] * e.cz + m[12];
      const y = m[1] * e.cx + m[5] * e.cy + m[9] * e.cz + m[13];
      const z = m[2] * e.cx + m[6] * e.cy + m[10] * e.cz + m[14];
      const dx = x - camPos.x;
      const dy = y - camPos.y;
      const dz = z - camPos.z;
      const on = dx * dx + dy * dy + dz * dz < e.lim2;
      if (on !== e.on) {
        e.on = on;
        e.o.layers.mask = on ? DRAW_MASK : HIDE_MASK;
      }
      if (e.casts) {
        const fx = x - focus.x;
        const fz = z - focus.z;
        e.o.castShadow = fx * fx + fz * fz < e.shadow2;
      }
    }
  }

  /* ---------- 장소 묶음 ---------- */

  function measurePlaces(world) {
    const box = new THREE.Box3();
    const sphere = new THREE.Sphere();
    for (const place of world.placeGroups) {
      box.setFromObject(place.group);
      if (box.isEmpty()) { place.cullX = place.x; place.cullZ = place.z; place.cullR = 40; continue; }
      box.getBoundingSphere(sphere);
      place.cullX = sphere.center.x;
      place.cullZ = sphere.center.z;
      place.cullR = sphere.radius;
    }
  }

  /* ---------- 처음 쓸 때 멈칫하는 팔 계산은 틈틈이 미리 해 둔다 ---------- */

  function bakeJobs(actors, sim) {
    const list = [];
    const seen = new Set();
    const push = (a, clip, touch) => {
      const k = `${a.c.id}|${clip.id}|${touch}`;
      if (seen.has(k)) return;
      seen.add(k);
      list.push([a, clip, touch]);
    };
    const mains = actors.filter(a => !a.c.monster && a.built);
    const touchesOf = (x, st) => {
      const out = [];
      if (!st.socket) return out;
      const name = String(st.socket).split('|')[0];
      const re = new RegExp('^' + name.split('*').join('.*') + '$');
      for (const s of Object.values(sim.sockets[x.place] || {})) if (s && s.touch && s.name && re.test(s.name)) out.push(s.touch);
      return out;
    };
    // 상호작용에 든 동작이 먼저, 나머지는 그다음
    for (const a of mains) {
      if (a.c.extra) continue;
      for (const x of sim.interactions) {
        if (x.only && !x.only.includes(a.c.id)) continue;
        for (const st of x.steps) {
          const clip = st.clip && ANIMS[st.clip];
          if (!clip || !clip.reach) continue;
          push(a, clip, 0);
          for (const t of touchesOf(x, st)) push(a, clip, Math.round((t / (a.preset.scale || 0.8)) * 20) / 20);
        }
      }
    }
    for (const a of mains) for (const clip of Object.values(ANIMS)) if (clip.reach) push(a, clip, 0);
    return list;
  }

  let jobs = [];
  let jobIt = null;
  function runBakes(budget) {
    const end = performance.now() + budget;
    while (performance.now() < end) {
      if (!jobIt) {
        if (!jobs.length) return;
        const [a, clip, touch] = jobs.shift();
        jobIt = root.AnimReach.prebake(a, clip, touch);
        if (!jobIt) continue;
      }
      if (jobIt.next().done) jobIt = null;
    }
  }

  /* ---------- 바깥에서 부르는 곳 ---------- */

  root.PerfTune = {
    install({ renderer, scene, camera, world, actors, sim }) {
      ctx = { camera };
      // 셰이더 오류 검사는 프로그램마다 동기 대기를 만든다
      renderer.debug.checkShaderErrors = false;
      scene.updateMatrixWorld(true);
      measurePlaces(world);
      collect(scene, new Set(actors.map(a => a.built.root)));
      renderer.compile(scene, camera);
      jobs = bakeJobs(actors, sim);
    },
    near(place, camera) {
      const dx = camera.position.x - place.cullX;
      const dz = camera.position.z - place.cullZ;
      const lim = FOG_END + place.cullR;
      return dx * dx + dz * dz < lim * lim;
    },
    frame(view) {
      if (!ctx) return;
      runBakes(root.TITLE_ON ? 6 : 2);
      pass(ctx.camera.position, view);
    },
  };
})(window);
