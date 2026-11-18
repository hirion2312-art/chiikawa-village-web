'use strict';

// 치이카와 심즈 — 맵에 놓인 작은 것들과의 상호작용
// 벤치, 가로등, 나무, 화분, 입간판은 각각 한 장소처럼 쓴다. 마을 안의 것은 주민도 스스로 쓰고,
// 숲의 나무처럼 수가 많은 것은 플레이어가 눌렀을 때 그 자리에서 상호작용을 만든다
(function (root) {
  const I = (id, name, act, min, clip, gain, more = {}) => ({ id, name, act, min, clip, gain, more });
  const KINDS = {
    bench: { name: '벤치', seats: true, pick: [[0.7, 1.7]], list: [I('sit', '벤치에 앉아 쉬기', 'sit', 15, 'sit_idle', { energy: 10, fun: 3 }, { group: true })] },
    lamp: { name: '가로등', dist: 1.6, pick: [[2, 0.7], [4, 0.7], [6.9, 0.9]], list: [I('look', '가로등 올려다보기', 'lamp', 4, 'tilt_look', { fun: 3 })] },
    tree: {
      name: '나무', dist: 2.2, pick: [[2, 1.2], [6.6, 3.2]], list: [
        I('shake', '나무 흔들어 보기', 'shake', 4, 'tree_shake', { fun: 7 }),
        I('shade', '나무 그늘에서 쉬기', 'idle', 12, 'idle_breathe', { energy: 7, fun: 3 }),
      ],
    },
    palm: { name: '야자수', dist: 2.2, pick: [[3, 1], [8, 3]], list: [I('shake', '야자수 흔들어 보기', 'shake', 4, 'tree_shake', { fun: 7 })] },
    bush: { name: '덤불', dist: 2.6, pick: [[0.8, 2]], list: [I('dig', '덤불 뒤져 보기', 'gather', 4, 'gather_pick', { fun: 6, hygiene: -2 })] },
    hedge: { name: '울타리 덤불', dist: 2, pick: [[0.8, 1.6]], list: [I('peek', '덤불 너머 엿보기', 'peek', 3, 'peek_tiptoe', { fun: 4 })] },
    planter: { name: '화분', dist: 1.7, pick: [[1, 1.1]], list: [I('smell', '꽃 향기 맡기', 'smell', 3, 'smell_flower', { fun: 6 })] },
    board: { name: '입간판', dist: 1.9, pick: [[1, 1.1]], list: [I('read', '입간판 읽기', 'read', 3, 'board_read', { fun: 3 })] },
  };
  // 수가 많아 눌렀을 때만 만드는 종류
  const LAZY = new Set(['palm', 'bush']);
  const WILD = new Set(['palm', 'bush']);

  let sim = null;
  let scene_ = null;
  let world = null;
  const ready = new Map();

  // 8방향 중 갈 수 있는 칸에 자리를 잡는다
  function standSpots(e, dist, max) {
    const out = [];
    for (let k = 0; k < 8 && out.length < max; k++) {
      const a = (k * Math.PI) / 4 + 0.2;
      const x = e.x + Math.sin(a) * dist;
      const z = e.z + Math.cos(a) * dist;
      if (!sim.nav.free(sim.nav.cellOf(x, z))) continue;
      out.push({ name: `stand_${out.length + 1}`, x, z, h: 0, fx: e.x, fz: e.z });
    }
    return out;
  }
  function seatSpots(e) {
    const ry = e.ry || 0;
    return [-1, 1].map((lx, i) => {
      const x = e.x + lx * Math.cos(ry);
      const z = e.z - lx * Math.sin(ry);
      return { name: `sit_${i + 1}`, x, z, h: 0.66, fx: x + Math.sin(ry) * 2, fz: z + Math.cos(ry) * 2 };
    });
  }
  function materialize(e) {
    if (ready.has(e)) return ready.get(e);
    const def = KINDS[e.kind];
    const spots = def.seats ? seatSpots(e) : standSpots(e, def.dist, 2);
    let place = null;
    if (spots.length) {
      const id = `el_${e.kind}_${e.i}`;
      const label = e.kind === 'board' && e.text ? `입간판 · ${e.text}` : def.name;
      const pat = def.seats ? 'sit_*' : 'stand_*';
      const list = def.list.map(x => ({ id: `${id}.${x.id}`, place: id, name: x.name, steps: root.VillageObjects.addBeats([{ socket: pat, act: x.act, min: x.min, clip: x.clip }]), gain: x.gain, ...x.more }));
      place = sim.addElement({ id, name: label, x: e.x, z: e.z, r: 2, elem: true, y: world.floorAt(e.x, e.z) }, spots, list) ? { id } : null;
    }
    ready.set(e, place);
    return place;
  }

  const tmp = new THREE.Vector3();
  root.MapElements = {
    // 섬 선착장 끝의 턱에 경사로를 놓는다 (이게 없어 섬 안으로 걸어 들어갈 수 없었다)
    buildLinks(w, scene) {
      scene_ = scene;
      const x = 174;
      const z0 = 401;
      const z1 = 412;
      const y0 = 2.62;
      const y1 = w.floorAt(x, z1) + 0.02;
      const len = Math.hypot(z1 - z0, y0 - y1);
      const mat = new THREE.MeshToonMaterial({ color: '#c9a57c' });
      const ramp = new THREE.Group();
      ramp.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
      ramp.rotation.x = Math.atan2(y0 - y1, z1 - z0);
      ramp.add(new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, len), mat));
      const slat = new THREE.MeshToonMaterial({ color: '#a98a66' });
      for (let i = 1; i < 8; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.05, 0.16), slat);
        s.position.set(0, 0.09, -len / 2 + (i * len) / 8);
        ramp.add(s);
      }
      scene.add(ramp);
    },
    // 길 지도가 나온 뒤 마을 안의 것들을 상호작용으로 만든다
    init(s, w) {
      sim = s;
      world = w;
      const all = root.MAP_DECOR || [];
      all.forEach((e, i) => { e.i = i; });
      this.setDressing(s, w);
      let n = 0;
      for (const e of all) if (!LAZY.has(e.kind) && !e.wild && materialize(e)) n += 1;
      return n;
    },
    setDressing(s, w) {
      const fire = s.sockets.goblin && s.sockets.goblin.fire_stand;
      if (fire && fire.reach) {
        const a = fire.fx !== undefined ? Math.atan2(fire.fx - fire.x, fire.fz - fire.z) : 0;
        const fx = fire.x + Math.sin(a) * 1.6;
        const fz = fire.z + Math.cos(a) * 1.6;
        Object.assign(fire, { fx, fz });
        const g = new THREE.Group();
        g.position.set(fx, w.floorAt(fx, fz), fz);
        const wood = new THREE.MeshToonMaterial({ color: '#8c6a50' });
        for (let i = 0; i < 4; i++) {
          const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), wood);
          l.rotation.set(Math.PI / 2 - 0.25, (i * Math.PI) / 2, 0);
          l.position.y = 0.2;
          g.add(l);
        }
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.7, 8), new THREE.MeshBasicMaterial({ color: '#f2a23c' }));
        flame.position.y = 0.55;
        g.add(flame);
        scene_.add(g);
      }
      const boat = s.sockets.seaCave && s.sockets.seaCave.boat_sit;
      if (boat && boat.reach) {
        // 물 위라면 수면에 띄운다
        const ground = w.floorAt(boat.x, boat.z);
        const deckY = Math.max(ground + s.nav.surface(boat.x, boat.z) + 0.06, 0.05);
        Object.assign(boat, { h: deckY - ground + 0.34, seatIn: true });
        const g = new THREE.Group();
        g.position.set(boat.x, deckY, boat.z);
        if (boat.fx !== undefined) g.rotation.y = Math.atan2(boat.fx - boat.x, boat.fz - boat.z);
        const hull = new THREE.MeshToonMaterial({ color: '#b98f68' });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 3.4), hull);
        b1.position.y = 0.15;
        const front = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.1, 4), hull);
        front.rotation.x = Math.PI / 2;
        front.rotation.y = Math.PI / 4;
        front.scale.set(1.4, 1, 0.35);
        front.position.set(0, 0.17, 2.2);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.6), new THREE.MeshToonMaterial({ color: '#d9b98a' }));
        seat.position.y = 0.32;
        g.add(b1, front, seat);
        scene_.add(g);
      }
    },
    // 누른 광선에 걸린 것 중 가장 가까운 것. place는 그 지점의 장소 (안이면 숲 나무는 고르지 않는다)
    pick(ray, groundT, place, point) {
      if (!sim) return null;
      const inside = place && point && Math.hypot(point.x - place.x, point.z - place.z) <= place.r;
      let best = null;
      let bestT = Infinity;
      const O = ray.origin;
      for (const e of root.MAP_DECOR || []) {
        if (Math.abs(e.x - O.x) > 130 || Math.abs(e.z - O.z) > 130) continue;
        if (inside && (e.wild || WILD.has(e.kind))) continue;
        const floor = world.floorAt(e.x, e.z);
        for (const [h, r] of KINDS[e.kind].pick) {
          tmp.set(e.x, floor + h, e.z);
          if (ray.distanceToPoint(tmp) > r) continue;
          const t = tmp.sub(O).dot(ray.direction);
          if (t > 0 && t < bestT && t <= groundT + 2) {
            bestT = t;
            best = e;
          }
        }
      }
      return best ? materialize(best) : null;
    },
  };
}(typeof self !== 'undefined' ? self : this));
