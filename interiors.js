'use strict';

// 치이카와 심즈 — 건물 내부 (심즈 방식)
// 장소 하나는 세 덩어리로 나뉜다.
//   shell: 밖에서 보는 외관. 안으로 들어가면 땅으로 가라앉아 사라진다
//   inside: 안에서 보는 방. 평소에는 그리지 않는다
//   yard: 마당의 소품. 언제나 보인다
// inside는 다시 둘로 나뉜다.
//   statics: 상호작용이 없는 고정 모델 (벽, 바닥, 선반)
//   dynamics: 움직임이 필요한 모델 (자판기, 그릇, 이불). 상호작용 단계의 fx에 맞춰 clips를 재생한다
//
// 상호작용 쪽에서는 village-objects.js의 단계에 fx: '모델.클립'을 적는다.
// 자리마다 따로 있는 모델(카운터의 그릇)은 '모델:소켓이름'으로 등록하면 쓰는 자리에 맞춰 찾아 준다.
(function (root) {
  const OPEN_TIME = 0.28;            // 외관이 가라앉는 시간 (초)
  const CUT_HEIGHT = 0.14;           // 카메라 쪽 벽을 잘라 낸 뒤 남는 비율
  const ease = t => t * t * (3 - 2 * t);
  const MOUNTED = new Map();
  const BY_ID = new Map();

  function mount(k, p, def) {
    const face = p.face || 0;
    const th = (face * Math.PI) / 2;
    const make = () => {
      const g = new THREE.Group();
      k.group.add(g);
      return g;
    };
    const shell = make();
    const inside = make();
    const yard = make();
    const statics = new THREE.Group();
    const dynamics = new THREE.Group();
    inside.add(statics, dynamics);
    const state = {
      def, place: p, th, shell, inside, yard, statics, dynamics,
      walls: [], dyn: new Map(), doors: [], staff: [],
      blend: 0, open: false, peek: false,
    };
    const kitOf = g => makeKit(g, p.x, p.z, face);

    const api = {
      kit: kitOf(statics),
      // 벽 한 줄: points를 차례로 잇는다. center 쪽이 안쪽. 카메라 쪽 벽은 update에서 낮아진다
      walls(points, o = {}) {
        const { h = 4.6, t = 0.5, color = '#e4e3df', skin, center = [0, 0], y0 = 0, closed = false, ink = 2 } = o;
        const n = closed ? points.length : points.length - 1;
        for (let i = 0; i < n; i++) {
          const [ax, az] = points[i];
          const [bx, bz] = points[(i + 1) % points.length];
          const len = Math.hypot(bx - ax, bz - az);
          if (len < 1e-3) continue;
          const mx = (ax + bx) / 2;
          const mz = (az + bz) / 2;
          let nx = -(bz - az) / len;
          let nz = (bx - ax) / len;
          if (nx * (center[0] - mx) + nz * (center[1] - mz) < 0) {
            nx = -nx;
            nz = -nz;
          }
          const g = new THREE.Group();
          g.position.set(mx, y0, mz);
          g.rotation.y = Math.atan2(nx, nz);
          statics.add(g);
          const wk = makeKit(g, 0, 0, 0);
          wk.box(0, h / 2, -t / 2, len + 0.24, h, t, color, ink);
          if (skin) wk.skin(0, h / 2, len, h - 0.1, skin);
          state.walls.push({ g, nx, nz, mx, mz, cut: 1, lintel: y0 > 0 });
        }
      },
      // 움직이는 모델. build(kit, o)로 만들고 clips로 움직인다
      // opts: x, y, z, ry, obj(메뉴를 띄울 때 쓰는 이름), idle(o, time, dt), clips{ 이름(o, u, time, dt, c) }, end(o, clip)
      dyn(id, opts, build) {
        const g = new THREE.Group();
        g.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
        g.rotation.y = opts.ry || 0;
        dynamics.add(g);
        const o = {
          id, root: g, kit: makeKit(g, 0, 0, 0), state, label: opts.label, obj: opts.obj,
          clips: opts.clips || {}, idle: opts.idle, end: opts.end,
          home: { p: g.position.clone(), r: g.rotation.clone(), s: g.scale.clone() },
          data: {}, active: null, last: null, solid: !!opts.solid,
        };
        if (build) build(o.kit, o);
        state.dyn.set(id, o);
        return o;
      },
      // 사람이 지나가면 스르륵 열리는 문. leaves는 [Object3D, 열렸을 때 x 이동량]
      door(x, z, leaves, r = 3.2) {
        state.doors.push({ x, z, r, leaves: leaves.map(([m, dx]) => ({ m, dx, x0: m.position.x })), u: 0 });
      },
      // 가게 사람: 처음 들어갈 때 모델을 만든다
      staff(id, x, z, ry) {
        const s = { id, x, z, ry, targetX: x, built: null, phase: 0 };
        state.staff.push(s);
        return s;
      },
    };

    def.exterior(kitOf(shell), api);
    if (def.yard) def.yard(kitOf(yard), api);
    def.interior(api.kit, api);
    inside.visible = false;
    state.key = `${p.id}@${p.x},${p.z}`;
    MOUNTED.set(state.key, state);
    if (!BY_ID.has(p.id)) BY_ID.set(p.id, state);
    return state;
  }

  // 월드 좌표를 건물 좌표로
  function toLocal(st, x, z) {
    const dx = x - st.place.x;
    const dz = z - st.place.z;
    return [dx * Math.cos(st.th) - dz * Math.sin(st.th), dx * Math.sin(st.th) + dz * Math.cos(st.th)];
  }
  function contains(st, x, z, margin) {
    const [lx, lz] = toLocal(st, x, z);
    const f = st.def.area;
    return Math.abs(lx - f.x) <= f.w / 2 + margin && Math.abs(lz - f.z) <= f.d / 2 + margin;
  }

  function setBlend(st, b) {
    st.blend = b;
    const e = ease(b);
    st.shell.visible = b < 1;
    st.shell.scale.y = (st.shellBaseY || 1) * (1 - e * 0.985);
    st.inside.visible = b > 0;
  }

  // 길 지도는 안쪽 구조로 만든다 (외관은 벽이 막혀 있어 길이 나지 않는다)
  function beforeNav() {
    for (const st of MOUNTED.values()) {
      st.shell.visible = false;
      st.inside.visible = true;
      for (const o of st.dyn.values()) {
        o.wasVisible = o.root.visible;
        if (!o.solid) o.root.visible = false;
      }
      for (const w of st.walls) w.g.scale.y = 1;
    }
  }
  function afterNav() {
    for (const st of MOUNTED.values()) {
      for (const o of st.dyn.values()) o.root.visible = o.wasVisible;
      setBlend(st, 0);
    }
  }

  function updateDyn(st, sim, time, dt) {
    for (const o of st.dyn.values()) o.active = null;
    for (const c of sim.chars) {
      const d = c.doing;
      if (!d || d.kind !== 'obj' || d.phase !== 'use' || (d.x.interior || d.x.place) !== (d.x.interior ? st.key : st.place.id)) continue;
      const step = d.x.steps[d.step];
      if (!step || !step.fx) continue;
      const [name, clip] = step.fx.split('.');
      const o = st.dyn.get(`${name}:${d.socket.name}`) || st.dyn.get(name);
      if (o && o.clips[clip]) o.active = { clip, u: Math.max(0, Math.min(1, 1 - d.left / step.min)), c };
    }
    for (const o of st.dyn.values()) {
      if (o.active) {
        o.clips[o.active.clip](o, o.active.u, time, dt, o.active.c);
        o.last = o.active.clip;
      } else {
        if (o.last) {
          o.root.position.copy(o.home.p);
          o.root.rotation.copy(o.home.r);
          o.root.scale.copy(o.home.s);
          if (o.end) o.end(o, o.last);
          o.last = null;
        }
        if (o.idle) o.idle(o, time, dt);
      }
    }
  }

  function updateStaff(st, sim, time, dt) {
    for (const s of st.staff) {
      if (!s.built) {
        if (st.blend <= 0) continue;
        const entry = characterEntry(s.id);
        s.built = buildCharacter({ ...entry.preset }, { faceWidth: 512 });
        s.built.root.position.set(s.x, 0, s.z);
        s.built.root.rotation.y = s.ry;
        st.dynamics.add(s.built.root);
      }
      // 손님이 앉은 자리 쪽으로 옮겨 간다
      const busy = sim.chars.find(c => c.doing && c.doing.kind === 'obj' && c.doing.phase === 'use' && c.doing.x.place === st.place.id && /^counter_sit/.test(c.doing.socket.name) && c.doing.x.steps[c.doing.step].fx === 'bowl.serve');
      if (busy) s.targetX = toLocal(st, busy.x, busy.z)[0];
      const r = s.built.root;
      const dx = s.targetX - r.position.x;
      const mv = Math.sign(dx) * Math.min(Math.abs(dx), 3.4 * dt);
      r.position.x += mv;
      const speed = Math.abs(dx) > 0.05 ? 0.7 : 0;
      s.phase += speed * dt * 11;
      s.built.animate(time, { speed, phase: s.phase });
    }
  }

  function update({ focus, camera, sim, time, dt }) {
    for (const st of MOUNTED.values()) {
      const inside = contains(st, focus.x, focus.z, st.open ? 1.2 : 0);
      st.open = inside || st.peek;
      // 나오면 들여다보기도 저절로 끝나지는 않는다. 다시 누르면 닫힌다
      if (st.blend !== (st.open ? 1 : 0)) setBlend(st, Math.max(0, Math.min(1, st.blend + (st.open ? dt : -dt) / OPEN_TIME)));
      updateDoors(st, sim, dt);
      if (st.blend <= 0) continue;
      const e = ease(st.blend);
      const f = st.def.area;
      const [camX, camZ] = toLocal(st, camera.position.x, camera.position.z);
      const cx = camX - f.x;
      const cz = camZ - f.z;
      const len = Math.hypot(cx, cz) || 1;
      for (const w of st.walls) {
        // 방 가운데에서 볼 때 카메라 쪽 절반에 있는 벽이 시야를 막는다
        const ox = w.mx - f.x;
        const oz = w.mz - f.z;
        const front = (ox * cx + oz * cz) / (len * (Math.hypot(ox, oz) || 1)) > 0.2;
        const target = front ? (w.lintel ? 0.001 : CUT_HEIGHT) : 1;
        w.cut += (target - w.cut) * (1 - Math.exp(-dt * 12));
        w.g.scale.y = Math.max(0.001, w.cut * e);
        w.g.visible = !(w.lintel && w.cut < 0.02);
      }
      updateDyn(st, sim, time, dt);
      updateStaff(st, sim, time, dt);
    }
  }

  function updateDoors(st, sim, dt) {
    for (const door of st.doors) {
      let near = false;
      for (const c of sim.chars) {
        if (c.hidden) continue;
        const [lx, lz] = toLocal(st, c.x, c.z);
        if (Math.hypot(lx - door.x, lz - door.z) < door.r) {
          near = true;
          break;
        }
      }
      door.u = Math.max(0, Math.min(1, door.u + ((near ? 1 : -1) * dt) / 0.35));
      for (const l of door.leaves) l.m.position.x = l.x0 + l.dx * ease(door.u);
    }
  }

  // 펼쳐진 건물 안에서 누른 움직이는 모델을 찾는다
  function pick(ray) {
    let best = null;
    let bestD = Infinity;
    for (const st of MOUNTED.values()) {
      if (st.blend < 1) continue;
      for (const o of st.dyn.values()) {
        if (!o.obj || !o.root.visible) continue;
        const hit = ray.intersectObject(o.root, true).find(h => !(Array.isArray(h.object.material) ? h.object.material[0] : h.object.material).isShaderMaterial);
        if (hit && hit.distance < bestD) {
          bestD = hit.distance;
          best = o;
        }
      }
    }
    return best;
  }

  root.Interiors = {
    mount, update, beforeNav, afterNav, pick, MOUNTED,
    has: id => BY_ID.has(id),
    isOpen: id => { const st = BY_ID.get(id); return !!st && st.open; },
    togglePeek: id => { const st = BY_ID.get(id); if (st) st.peek = !st.peek; },
    shellOf: id => { const st = BY_ID.get(id); return st ? st.shell : null; },
  };
}(typeof self !== 'undefined' ? self : this));
