'use strict';

// 치이카와 심즈 — 마을 시뮬레이션 (화면을 모른다)
// 욕구가 줄고 → 모든 오브젝트 상호작용에 "지금 모자란 욕구" 기준 점수를 매겨 고르고 → 빈 자리(소켓)로 걸어가
// → 정해진 시간 동안 쓰면서 욕구가 찬다. 심즈의 광고(advertisement) 방식. 시간 단위는 게임 분.
(function (root) {
  const { LIST, BY_ID, CHAT, NEEDS } = root.VillageObjects;
  const NEED_KEYS = NEEDS.map(n => n[0]);
  const WALK = 4.2;               // 게임 1분에 걷는 거리 (배속 1이면 실제 1초). 마을이 넓어 심즈보다 조금 빠르게
  const DAY_START = 6 * 60;       // 06:00
  // 욕구가 게임 1시간에 줄어드는 양
  // 게임 1시간에 줄어드는 양 (2026-11-09 이재헌 지시로 완화): 하루 2~3끼, 씻기 하루 1번, 잠 하루 1번이면 유지되는 속도
  // 배부름 100→0 약 31시간, 기력은 깨어 있는 16시간에 약 42 (일하면 더), 청결 하루 약 31
  const DECAY = { hunger: 3.2, energy: 2.6, fun: 2.8, social: 1.9, hygiene: 1.3 };

  // 출연진: 원작 주요 8명. 성향 0~1 (대담·다정·식탐·성실). 모델은 character.js 프리셋
  const CAST = [
    { id: 'chiikawa', name: '치이카와', traits: { brave: 0.25, social: 0.55, appetite: 0.7, diligent: 0.65 } },
    { id: 'hachiware', name: '하치와레', traits: { brave: 0.6, social: 0.82, appetite: 0.5, diligent: 0.7 } },
    { id: 'usagi', name: '우사기', traits: { brave: 0.85, social: 0.5, appetite: 0.82, diligent: 0.3 } },
    { id: 'momonga', name: '모몽가', traits: { brave: 0.5, social: 0.7, appetite: 0.68, diligent: 0.2 } },
    { id: 'shisa', name: '시사', traits: { brave: 0.45, social: 0.75, appetite: 0.5, diligent: 0.85 } },
    { id: 'rakko', name: '랏코', traits: { brave: 0.85, social: 0.35, appetite: 0.45, diligent: 0.8 } },
    { id: 'kurimanju', name: '쿠리만쥬', traits: { brave: 0.4, social: 0.45, appetite: 0.75, diligent: 0.35 } },
    { id: 'furuhonya', name: '후루혼야', traits: { brave: 0.35, social: 0.4, appetite: 0.35, diligent: 0.55 } },
  ];

  /* ---------- 소켓: sockets.js(장소 GLB 기준) → 월드 좌표 ---------- */

  const STALLS = { clothes: [-12, -8], books: [12, -8], takoyaki: [-12, 8], pottery: [12, 8] };
  const ALIAS = { dock: 'pier', islandHomes: 'bungalow' };
  function buildSockets(world) {
    const out = {};
    const raw = root.ASSET_SOCKETS || {};
    for (const place of world.places) {
      const data = raw[ALIAS[place.id] || place.id];
      if (!data) continue;
      const th = ((place.face || 0) * Math.PI) / 2;
      const tf = (lx, lz) => [place.x + lx * Math.cos(th) + lz * Math.sin(th), place.z - lx * Math.sin(th) + lz * Math.cos(th)];
      const add = (name, arr, f) => {
        if (!Array.isArray(arr)) return;
        const [x, z] = f(arr[0], arr[1]);
        const s = { name, place: place.id, x, z, h: arr[2] || 0 };
        if (arr[3] !== undefined) [s.fx, s.fz] = f(arr[3], arr[4]);
        (out[place.id] || (out[place.id] = {}))[name] = s;
      };
      for (const [name, v] of Object.entries(data)) {
        if (Array.isArray(v)) add(name, v, tf);
        else if (place.id === 'market' && STALLS[name] && v && typeof v === 'object') {
          // 시장 노점: 노점 자리·방향을 먼저 합성 (glb-world.js STALL_GLB와 같다)
          const [ox, oz] = STALLS[name];
          const st = Math.atan2(ox, oz);
          const sf = (lx, lz) => [place.x + ox + lx * Math.cos(st) + lz * Math.sin(st), place.z + oz - lx * Math.sin(st) + lz * Math.cos(st)];
          for (const [sub, arr] of Object.entries(v)) add(`${name}.${sub}`, arr, sf);
        }
      }
    }
    return out;
  }

  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // 욕구 곡선: 넉넉할 때는 거의 신경 쓰지 않고, 모자라기 시작하면 구간마다 급격히 커진다
  const WEIGHT = [[0, 60], [10, 30], [18, 10], [30, 3], [45, 1.1], [60, 0.4], [70, 0.12], [100, 0.05]];
  const weight = v => {
    const n = clamp(v);
    for (let i = 0; i + 1 < WEIGHT.length; i++) {
      const [a, wa] = WEIGHT[i];
      const [b, wb] = WEIGHT[i + 1];
      if (n <= b) return wa + ((wb - wa) * (n - a)) / (b - a);
    }
    return WEIGHT[WEIGHT.length - 1][1];
  };
  // 이 아래로 떨어지면 하던 일을 끊고 해결하러 간다 (플레이어가 시킨 일은 끊지 않는다)
  const DISTRESS = { hunger: 12, energy: 10, hygiene: 8 };
  // 이 아래면 어떤 일을 하던 쓰러진다
  const COLLAPSE = {
    energy: { at: 2, min: 45, clip: 'sleep_breathe', gain: 40, say: '쿨쿨…', note: '너무 졸려서 그 자리에서 잠들었어요' },
    hunger: { at: 2, min: 8, clip: 'cry', gain: 18, say: '배고파…', note: '배가 고파 주저앉았어요' },
  };
  const BURIED = new Set(['goblin/fire_stand', 'bungalow/porch_1', 'islandHomes/porch_1', 'seaCave/boat_sit']);
  // 물건 앞으로 다가가면 가려지는 자리
  // 카운터 너머로 자리를 당기지 않는다: 접수처 창구·저울은 손님 쪽에 둔다 (직원 구역 침범 방지, 2026-11-10)
  const NO_SNUG = new Set(['umaiya/order_front', 'reception/window_stand', 'reception/window_2', 'reception/window_3', 'reception/window_4', 'reception/scale_stand', 'reception/scale_2', 'reception/bell_touch']);
  const TOUCH_ACTS = new Set(['poke', 'take', 'hand', 'pay', 'weigh', 'type', 'pour', 'ticket', 'knock', 'browse', 'work', 'cook', 'talk', 'inspect', 'coin', 'bell']);
  const DISTRESS_CHECK = 4;       // 게임 분마다 위급 상태를 확인한다

  class Village {
    constructor(world, opts = {}) {
      this.world = world;
      this.nav = opts.nav || null;
      this.sockets = buildSockets(world);
      this.report = { unreachable: [], dropped: [], height: [], moved: [], snug: [], emptyReach: [] };
      if (this.nav) this.prepareSockets();
      this.places = Object.fromEntries(world.places.map(p => [p.id, p]));
      this.minutes = DAY_START + 60;          // 07:00
      this.day = 1;
      this.speed = 1;
      this.paused = false;
      this.claims = new Map();                 // 'place/socket' → 캐릭터 id
      this.log = [];
      this.random = opts.random || Math.random;
      // 이 월드에 실제로 있는 상호작용만 쓴다 (장소·소켓이 있는 것)
      this.interactions = LIST.filter(x => this.places[x.place] && x.steps.every(st => this.candidates(x.place, st.socket).length));
      // 갈 수 없는 자리 때문에 빠진 상호작용 (접촉 규칙 R1: 갈 수 없는 자리는 쓰지 않는다)
      this.report.dropped = LIST.filter(x => this.places[x.place] && !this.interactions.includes(x)).map(x => x.id);
      if (root.Shifts && root.Shifts.markServe) root.Shifts.markServe();
      if (this.nav) this.snugSockets();
      this.chars = CAST.map((c, i) => {
        const plaza = this.places.plaza || world.places[0];
        const a = (i / CAST.length) * Math.PI * 2;
        const start = this.snap({ x: plaza.x + Math.cos(a) * 8, z: plaza.z + Math.sin(a) * 8 });
        return {
          ...c, x: start.x, z: start.z, angle: a + Math.PI, h: 0, ox: 0, oz: 0,
          needs: { hunger: 55 + this.random() * 30, energy: 70 + this.random() * 25, fun: 50 + this.random() * 30, social: 45 + this.random() * 35, hygiene: 60 + this.random() * 30 },
          money: 1500, act: null, clip: null, walking: false, hidden: false, doing: null, recent: [], orders: [], speech: null, speechLeft: 0, idleLeft: 0,
        };
      });
      // 엑스트라: 주인공과 똑같은 욕구·점수·소켓·길 찾기로 스스로 사는 회색 주민. 플레이어가 조종할 수 없다 (opts.extras = 수)
      // 마을 곳곳(상호작용이 있는 장소 둘레)에 흩어져 시작한다
      const spots = world.places.filter(p => this.interactions.some(x => x.place === p.id));
      for (let i = 0; i < (opts.extras || 0) && spots.length; i++) {
        const p = spots[Math.floor(this.random() * spots.length)];
        const a = this.random() * Math.PI * 2;
        const r = (p.r || 8) * (0.6 + this.random() * 0.6);
        const start = this.snap({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r });
        const t = () => 0.2 + this.random() * 0.6;
        this.chars.push({
          id: `extra${i + 1}`, name: '엑스트라', extra: true, traits: { brave: t(), social: t(), appetite: t(), diligent: t() },
          x: start.x, z: start.z, angle: a, h: 0, ox: 0, oz: 0,
          needs: { hunger: 40 + this.random() * 50, energy: 50 + this.random() * 45, fun: 35 + this.random() * 55, social: 35 + this.random() * 55, hygiene: 45 + this.random() * 50 },
          money: 800 + Math.floor(this.random() * 1200), act: null, clip: null, walking: false, hidden: false, doing: null, recent: [], orders: [], speech: null, speechLeft: 0, idleLeft: this.random() * 4,
        });
      }
      // 파자마 파티즈: 엑스트라처럼 스스로 살고, 공연 날에는 무대에 선다
      for (const [id, name] of root.Ecology.troupeChars()) {
        const stage = this.places.stage || world.places[0];
        const a = this.random() * Math.PI * 2;
        const start = this.snap({ x: stage.x + 12 + Math.cos(a) * 6, z: stage.z + Math.sin(a) * 6 });
        this.chars.push({
          id, name, extra: true, troupe: true, traits: { brave: 0.5, social: 0.8, appetite: 0.5, diligent: 0.6 }, x: start.x, z: start.z, angle: a, h: 0, ox: 0, oz: 0,
          needs: { hunger: 70, energy: 80, fun: 70, social: 70, hygiene: 80 },
          money: 1500, act: null, clip: null, walking: false, hidden: false, doing: null, recent: [], orders: [], speech: null, speechLeft: 0, idleLeft: 1,
        });
      }
      this.giveExtrasHomes();
      this.rescueStranded();
      this.labor = new root.Labor(this);
      this.calendar = new root.Calendar(this);
      this.persona = new root.Persona(this);
      this.ecology = new root.Ecology(this);
      // 성격: 특성·감정·버릇·반응·열망 (traits.js). 없으면 예전처럼 돈다
      this.traits = root.Traits ? new root.Traits(this) : null;
    }

    // 엑스트라도 저마다 자기 집에서 잔다. 문 앞에 갈 수 있는 집만 쓰고, 집이 모자라면 나눠 쓴다
    giveExtrasHomes() {
      const homes = (this.world.homes || []).filter(h => !this.nav || this.nav.approach({ x: h.bed[0], z: h.bed[1] }));
      if (!homes.length) return;
      this.chars.filter(c => c.extra).forEach((c, i) => {
        const h = homes[i % homes.length];
        const place = `home:${c.id}`;
        const socket = { name: 'bed_lie', place, x: h.bed[0], z: h.bed[1], h: 0.8, fx: h.feet[0], fz: h.feet[1] };
        if (this.nav) {
          const ap = this.nav.approach(socket);
          Object.assign(socket, { reach: true, ax: ap.x, az: ap.z, seatIn: ap.seatIn, h: ap.seatIn ? this.nav.measure(socket.x, socket.z, 0.8) : this.nav.surface(socket.x, socket.z) });
        }
        this.places[place] = { id: place, name: '집', x: h.x, z: h.z, r: h.r };
        this.sockets[place] = { bed_lie: socket };
        this.interactions.push({
          id: `${place}.sleep`, place, interior: h.key, name: '집에서 자기', gain: { energy: 100 }, night: true, shared: true, only: [c.id], hide: /^cottage/.test(h.key),
          steps: [{ socket: 'bed_lie', act: 'sleep', min: 420, clip: 'sleep_breathe', fx: 'futon.sleep' }],
        });
        c.home = place;
      });
    }

    // 집까지 길이 없는 자리(부두 끝의 끊긴 칸 등)에 있는 엑스트라는 집 앞으로 옮긴다. 저장에서 불러온 자리도 마찬가지
    rescueStranded() {
      if (!this.nav) return;
      for (const c of this.chars) {
        const door = c.home && this.sockets[c.home].bed_lie;
        if (door && !this.nav.route(c, { x: door.ax, z: door.az })) {
          c.x = door.ax;
          c.z = door.az;
        }
      }
    }

    // 소켓마다 접근할 칸(심즈 방식)과 실제 면 높이(R3)를 정한다
    prepareSockets() {
      for (const [place, list] of Object.entries(this.sockets)) {
        for (const sk of Object.values(list)) {
          const ap = this.nav.approach(sk);
          sk.hData = sk.h;
          if (!ap) {
            sk.reach = false;
            this.report.unreachable.push(`${place}/${sk.name}`);
            continue;
          }
          sk.reach = true;
          sk.ax = ap.x;
          sk.az = ap.z;
          sk.seatIn = ap.seatIn;
          // 서는 자리는 밟는 면, 앉는 자리는 좌석 면. 데이터 높이와 0.04 넘게 다르면 남긴다
          if (ap.seatIn) sk.h = this.nav.measure(sk.x, sk.z, sk.hData);
          else {
            // 서는 자리가 낮아진 가구 위에 걸리면, 걸어오는 바닥 높이로 선다
            const on = this.nav.surface(sk.x, sk.z);
            const walk = this.nav.surface(ap.x, ap.z);
            sk.h = Math.abs(on - walk) > 0.35 && Math.abs(walk - sk.hData) < Math.abs(on - sk.hData) ? walk : on;
          }
          if (this.moveIfEmbedded(sk)) this.report.moved.push(`${place}/${sk.name}`);
          if (Math.abs(sk.h - sk.hData) > 0.04) this.report.height.push({ socket: `${place}/${sk.name}`, data: sk.hData, measured: +sk.h.toFixed(3) });
        }
      }
    }
    // 몸 높이에 물건이 지나가는 자리면 (캐릭터가 물건 속에 파묻힌다) 가까운 빈칸으로 옮긴다
    embeddedAt(x, z, h, list) {
      const nav = this.nav;
      const y0 = this.world.floorAt(x, z) + h;
      let n = 0;
      for (const [dx, dz] of [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) {
        nav.ray.set(new THREE.Vector3(x + dx, y0 + 2.6, z + dz), new THREE.Vector3(0, -1, 0));
        nav.ray.far = 2.55;
        const hit = nav.ray.intersectObjects(list, false)[0];
        if (hit) {
          const rel = hit.point.y - y0;
          if (rel > 0.35 && rel < 1.8) n += 1;
        }
      }
      return n;
    }
    // 손을 뻗는 동작인데 물건이 팔이 닿지 않는 곳에 있으면 물건 앞으로 다가선다
    snugSockets() {
      const nav = this.nav;
      const done = new Set();
      const dirOf = (a, p) => new THREE.Vector3(Math.sin(a) * Math.cos(p), Math.sin(p), Math.cos(a) * Math.cos(p));
      for (const x of this.interactions) {
        for (const st of x.steps) {
          if (!TOUCH_ACTS.has(st.act)) continue;
          for (const k of this.candidates(x.place, st.socket)) {
            if (done.has(k) || k.seatIn || k.fx === undefined || BURIED.has(`${x.place}/${k.name}`) || NO_SNUG.has(`${x.place}/${k.name}`)) continue;
            done.add(k);
            const base = Math.atan2(k.fx - k.x, k.fz - k.z);
            const list = nav.raycastable.filter(o => {
              if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
              const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
              return Math.hypot(c.x - k.x, c.z - k.z) <= o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() + 7;
            });
            const y0 = this.world.floorAt(k.x, k.z) + k.h;
            let hit = Infinity;
            for (const yaw of [0, 0.3, -0.3]) for (const pitch of [-0.45, -0.2, 0, 0.3]) for (const y of [0.7, 1.15]) {
              nav.ray.set(new THREE.Vector3(k.x, y0 + y, k.z), dirOf(base + yaw, pitch));
              nav.ray.far = 6;
              const h = nav.ray.intersectObjects(list, false)[0];
              if (h) {
                const flat = Math.hypot(h.point.x - k.x, h.point.z - k.z);
                if (h.point.y - y0 > 0.3 && flat < hit) hit = flat;
              }
            }
            if (hit === Infinity) {
              // 모형에 잡히지 않는 대상(문, 땅의 구덩이)은 바라보는 점을 대상으로 본다
              this.report.emptyReach.push(`${x.place}/${k.name}`);
              hit = Math.hypot(k.fx - k.x, k.fz - k.z);
            }
            k.touch = hit;
            if (hit < 1.35) continue;
            for (let d = hit - 1; d > 0.1; d -= 0.15) {
              const nx = k.x + Math.sin(base) * d;
              const nz = k.z + Math.cos(base) * d;
              if (!nav.free(nav.cellOf(nx, nz)) || !nav.clear({ x: k.x, z: k.z }, { x: nx, z: nz })) continue;
              Object.assign(k, { x: nx, z: nz, ax: nx, az: nz, h: nav.surface(nx, nz), touch: hit - d });
              this.report.snug.push(`${x.place}/${k.name}`);
              break;
            }
          }
        }
      }
    }
    moveIfEmbedded(sk) {
      // 렌더링으로 재 보니 바위와 지붕에 완전히 가려지는 자리 (.claude/sheet-real.js visAudit)
      const buried = BURIED.has(`${sk.place}/${sk.name}`);
      if (!buried && /boat|tandem|hammock|bed|soak/.test(sk.name)) return false;
      const nav = this.nav;
      const list = nav.raycastable.filter(o => {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
        return Math.hypot(c.x - sk.x, c.z - sk.z) <= o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() + 3;
      });
      if (!buried && this.embeddedAt(sk.x, sk.z, sk.h, list) < (sk.seatIn ? 3 : 2)) return false;
      for (const r of buried ? [3, 4, 5, 6, 8, 10] : [0.6, 1, 1.4, 1.9, 2.4]) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          const x = sk.x + Math.sin(a) * r;
          const z = sk.z + Math.cos(a) * r;
          const cell = nav.cellOf(x, z);
          if (!nav.free(cell)) continue;
          const h = nav.surface(x, z);
          if (this.embeddedAt(x, z, h, list) > 0) continue;
          Object.assign(sk, { x, z, ax: x, az: z, h, seatIn: false });
          return true;
        }
      }
      return false;
    }
    // 벤치·나무 같은 작은 물건을 장소처럼 더한다. 쓸 수 있는 자리가 없으면 false
    addElement(p, spots, list) {
      const out = {};
      for (const s of spots) {
        const ap = this.nav.approach(s);
        if (!ap) continue;
        Object.assign(s, { place: p.id, hData: s.h, reach: true, ax: ap.x, az: ap.z, seatIn: ap.seatIn });
        s.h = ap.seatIn ? this.nav.measure(s.x, s.z, s.hData) : this.nav.surface(s.x, s.z);
        out[s.name] = s;
      }
      if (!Object.keys(out).length) return false;
      this.world.places.push(p);
      this.places[p.id] = p;
      this.sockets[p.id] = out;
      this.interactions.push(...list);
      return true;
    }
    // 막힌 칸 위의 점을 가장 가까운 갈 수 있는 칸으로 옮긴다
    snap(p) {
      if (!this.nav || !this.nav.isBlocked(p.x, p.z) && this.nav.reach && this.nav.reach[this.nav.cellOf(p.x, p.z)]) return p;
      const c = this.nav.nearestFree(p.x, p.z, 30);
      return c < 0 ? p : this.nav.center(c);
    }

    get hour() { return (this.minutes / 60) % 24; }
    clock() {
      const m = Math.floor(this.minutes) % (24 * 60);
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    }
    say(c, text, sec = 4) {
      // 대사는 내보내지 않는다 (2026-11-09 지시). 부르는 쪽은 그대로 두고 여기서 멈춘다
      void c; void text; void sec;
    }
    note(text) {
      this.log.push({ at: this.clock(), day: this.day, text });
      if (this.log.length > 200) this.log.shift();
    }

    /* ---------- 소켓 점유 ---------- */

    candidates(place, pattern) {
      const all = this.sockets[place] || {};
      const out = [];
      for (const p of pattern.split('|')) {
        if (p.endsWith('*')) out.push(...Object.values(all).filter(s => s.name.startsWith(p.slice(0, -1))));
        else if (all[p]) out.push(all[p]);
      }
      return this.nav ? out.filter(s => s.reach) : out;
    }
    freeSocket(c, place, pattern, shared, avoid = null) {
      if (shared) {
        const all = this.candidates(place, pattern);
        return all.length ? all[0] : null;
      }
      const list = this.candidates(place, pattern).filter(s => {
        if (avoid && s.name === avoid.name) return false;
        const who = this.claims.get(`${place}/${s.name}`);
        if (who && who !== c.id) return false;
        // 이름이 달라도 거의 같은 자리를 남이 잡았거나, 누가 그 자리에 서 있으면 겹치므로 쓰지 않는다 (R2)
        return !this.chars || !this.chars.some(o => o !== c && ((o.claimSpot && Math.hypot(o.claimSpot.x - s.x, o.claimSpot.z - s.z) < 0.7) || (!o.hidden && !o.walking && Math.hypot(o.x - s.x, o.z - s.z) < 0.7)));
      });
      if (!list.length) return null;
      list.sort((a, b) => dist(c, a) - dist(c, b));
      return list[0];
    }
    claim(c, s) {
      this.release(c);
      this.claims.set(`${s.place}/${s.name}`, c.id);
      c.claim = `${s.place}/${s.name}`;
      c.claimSpot = { x: s.x, z: s.z };
    }
    release(c) {
      if (c.claim && this.claims.get(c.claim) === c.id) this.claims.delete(c.claim);
      c.claim = null;
      c.claimSpot = null;
    }

    /* ---------- 고르기: 오브젝트가 알리는 효과 × 지금 모자란 정도 ---------- */

    open(x) {
      const h = this.hour;
      if (x.hours && (h < x.hours[0] || h >= x.hours[1])) return false;
      return !this.ecology || this.ecology.open(x);
    }
    scoreOf(c, x) {
      const t = c.traits;
      const night = this.hour >= 21 || this.hour < 6;
      let s = 0;
      for (const [k, v] of Object.entries(x.gain)) {
        let w = weight(c.needs[k]);
        if (k === 'hunger') w *= 0.6 + t.appetite * 0.8;
        if (k === 'social') w *= 0.6 + t.social * 0.8;
        s += v > 0 ? v * w : v * 0.15;       // 줄어드는 욕구는 작은 벌점
      }
      const pay = x.earn || x.worth;
      if (pay) s += (pay / 100) * (c.money < 1000 ? 6 : c.money < 3000 ? 2 : 0.5) * (0.5 + t.diligent);
      if (this.labor) s += this.labor.scoreBonus(c, x);
      s += this.persona.scoreBonus(c, x);
      s += this.ecology.scoreBonus(c, x);
      if (this.traits) s += this.traits.scoreBonus(c, x);
      if (x.minor) s += MinorActs.score(this, c, x);
      if (x.cost) s -= x.cost / 400;
      if (x.group) {
        const others = this.chars.filter(o => o !== c && o.doing && o.doing.x.place === x.place).length;
        if (others) s += 8 * weight(c.needs.social) * Math.min(2, others);
      }
      if (x.night) s *= night ? 6 : 0.05;
      else if (night) s *= 0.25;
      const n = c.recent.filter(id => id === x.id).length;
      if (n) s *= Math.pow(0.45, n);          // 같은 걸 연달아 하지 않는다
      const place = this.places[x.place];
      // 멀수록 덜 끌린다 (걸어가는 시간도 게임 시간이다)
      return s / (1 + dist(c, place) / 70);
    }
    options(c, limit = 6) {
      const out = [];
      for (const x of this.interactions) {
        if (!this.open(x) || (x.cost && c.money < x.cost) || (x.only && !x.only.includes(c.id))) continue;
        // 채워 주는 욕구가 이미 거의 가득이면 끌리지 않는다 (배부르면 먹지 않는다). 돈을 버는 일은 예외
        const helps = Object.entries(x.gain).filter(([, v]) => v > 0);
        if (!x.earn && !x.worth && !x.train && helps.length && helps.every(([k]) => c.needs[k] >= 88)) continue;
        if (this.labor && this.labor.blocked(c, x)) continue;
        if (this.persona.blocked(c, x) || this.ecology.blocked(c, x) || this.ecology.tooCostly(c, x)) continue;
        if (this.traits && this.traits.blocked(c, x)) continue;
        // 할 이유가 없는 행동은 스스로 고르지 않는다 (purpose.js)
        if (root.Purpose && !root.Purpose.ok(c, x, this)) continue;
        out.push({ x, score: this.scoreOf(c, x) });
      }
      // 수다: 친구가 고프면 가까운 캐릭터를 찾아간다
      if (this.hour >= 7 && this.hour < 21) {
        for (const o of this.chars) {
          // 멈춰서 뭔가 하는 캐릭터에게만 간다 (걸어가는 상대를 쫓지 않는다)
          if (o === c || o.hidden || o.monster || o.caught || (o.doing && (o.doing.kind === 'chat' || o.doing.phase === 'walk')) || (o.doing && o.doing.x.night)) continue;
          // 상대가 내가 도착할 때까지 그 자리에 있을 때만 (가는 동안 떠나 버리면 수다가 깨진다)
          const travel = dist(c, o) / WALK + 2;
          if (dist(c, o) > this.persona.chatRange(c, o) || (o.doing && o.doing.left < travel)) continue;
          const s = ((CHAT.gain.social * weight(c.needs.social) * (0.6 + c.traits.social * 0.8) + CHAT.gain.fun * weight(c.needs.fun)) * this.persona.chatFactor(c, o) + this.persona.chatBonus(c, o)) / (1 + dist(c, o) / 70);
          out.push({ x: CHAT, with: o, score: s * (c.recent.includes(`chat:${o.id}`) ? 0.4 : 1) * (this.traits ? this.traits.chatMul(c) : 1) });
        }
      }
      // 자리가 비었는지 보는 일이 가장 비싸므로, 점수가 높은 것부터 필요한 수만큼만 확인한다
      out.sort((a, b) => b.score - a.score);
      const usable = [];
      for (const o of out) {
        if (o.with || o.x.steps.every(st => this.freeSocket(c, o.x.place, st.socket, o.x.shared))) usable.push(o);
        if (usable.length >= limit) break;
      }
      return usable;
    }
    choose(c) {
      const show = this.ecology.duty(c);
      if (show) {
        c.showDay = this.day;
        return this.start(c, show, null, false);
      }
      // 시험 시간에는 무엇보다 시험이 먼저다
      const examNow = this.calendar.duty(c);
      if (examNow === 'wait') {
        c.idleLeft = 1 + this.random();
        return;
      }
      if (examNow) return this.start(c, examNow, null, false);
      if (c.orders.length) {
        const o = c.orders.shift();
        return this.start(c, o.x, o.with, true);
      }
      // 근무 중이면 퇴근 시각까지 같은 일을 계속한다
      const shiftJob = Shifts.next(this, c);
      if (shiftJob) return this.start(c, shiftJob, null, false);
      // 플레이트를 가진 주민은 놀러 가지 않고 맡은 일부터 끝낸다. 욕구가 급할 때만 먼저 해결한다
      if (this.labor && c.plate && (c.needs.hunger < 25 || c.needs.energy < 25)) {
        // 일이 남았는데 지쳤으면 그 욕구를 제대로 채우는 일만 먼저 한다 (낚시 같은 놀이로 새지 않게)
        const low = c.needs.hunger < c.needs.energy ? 'hunger' : 'energy';
        const fix = this.options(c, 60).find(o => !o.with && (o.x.gain[low] || 0) >= 10);
        if (fix) return this.start(c, fix.x, null, false);
      }
      if (this.labor) {
        const duty = this.labor.duty(c);
        if (duty === 'wait') {
          this.stepOffSocket(c);
          c.idleLeft = 2 + this.random() * 2;
          return;
        }
        if (duty) return this.start(c, duty, null, false);
      }
      const shop = this.calendar.routine(c);
      if (shop) return this.start(c, shop, null, false);
      // 친한 주민이 같이 하자고 부른 일
      if (c.pull && !NEED_KEYS.some(k => c.needs[k] < 25)) {
        const asked = this.persona.takePull(c);
        if (asked) return this.start(c, asked, null, false);
      }
      const opts = this.options(c);
      if (!opts.length || opts[0].score < 6) {
        // 딱히 끌리는 일이 없을 때: 점수가 조금이라도 있으면 그중 하나를 한다 (특성 점수가 성격대로 기울여 둔다).
        // 그것도 없으면 버릇을 보여 주고 잠깐만 쉰다 (예전에는 6~11분을 그냥 서 있었다)
        const weak = opts.filter(o => o.score >= 1.2).slice(0, 3);
        if (weak.length) {
          let r = this.random() * weak.reduce((a, b) => a + b.score, 0);
          let pick = weak[0];
          for (const o of weak) {
            r -= o.score;
            if (r <= 0) {
              pick = o;
              break;
            }
          }
          return this.start(c, pick.x, pick.with, false);
        }
        if (this.traits) this.traits.onIdle(c);
        c.idleLeft = 2 + this.random() * 2;
        return;
      }
      // 상위 3개 중 점수 비례로 (늘 최고만 고르면 로봇 같다)
      const top = opts.slice(0, 3);
      let r = this.random() * top.reduce((a, b) => a + b.score, 0);
      let pick = top[0];
      // 욕구가 바닥이면 망설이지 않고 가장 급한 일을 한다
      const urgent = NEED_KEYS.some(k => c.needs[k] < 25);
      for (const o of urgent ? [] : top) {
        r -= o.score;
        if (r <= 0) {
          pick = o;
          break;
        }
      }
      this.start(c, pick.x, pick.with, false);
    }

    /* ---------- 하기 ---------- */

    start(c, x, other, ordered) {
      if (x === CHAT) {
        if (!other || other.hidden) return;
        c.doing = { kind: 'chat', x, with: other, phase: 'walk', left: x.min };
        this.say(c, ordered ? '응!' : `${other.name}!`, 2);
        // 부르면 한가한 상대는 그 자리에서 기다린다
        if (!other.doing) {
          other.doing = { kind: 'chat', x, with: c, phase: 'wait', left: x.min, waitLeft: 40 };
          other.idleLeft = 0;
        }
        return;
      }
      const no = (this.labor && this.labor.blocked(c, x)) || this.persona.blocked(c, x) || this.ecology.blocked(c, x) || (this.traits && this.traits.blocked(c, x));
      if (no) {
        if (ordered) this.say(c, no, 3);
        return;
      }
      const total = x.steps.reduce((a, s) => a + s.min, 0);
      c.doing = { kind: 'obj', x, step: -1, total, socket: null, left: 0, paid: false, ordered };
      if (!ordered) this.persona.invite(c, x);
      this.nextStep(c);
    }
    nextStep(c) {
      const d = c.doing;
      d.step += 1;
      const st = d.x.steps[d.step];
      if (!st) return this.finish(c);
      // other: 지금 자리 말고 다른 구역으로 옮긴다. 빈 곳이 없으면 그 자리에서 계속한다
      // toOrder: 맡은 주문 손님의 자리 번호에 맞는 내주는 자리로 (counter_sit_3 → serve_3)
      const mine = st.toOrder && d.order && d.order.seat ? (this.sockets[d.x.place] || {})[d.order.seat.replace(/^.*_(\d+)$/, 'serve_$1')] : null;
      const s = (mine && this.freeSocket(c, d.x.place, mine.name, d.x.shared)) || (st.other && d.socket && this.freeSocket(c, d.x.place, st.socket, d.x.shared, d.socket)) || this.freeSocket(c, d.x.place, st.socket, d.x.shared);
      if (!s && st.optional) return this.nextStep(c);   // 없어도 되는 단계는 자리가 없으면 건너뛴다
      if (!s) {
        // 두 번째 단계부터는 자리가 날 때까지 지금 자리에서 잠깐 기다린다 (탕 안에서 수건 자리를 기다리는 식)
        if (d.step > 0 && (d.queueLeft === undefined || d.queueLeft > 0)) {
          d.step -= 1;
          d.phase = 'queue';
          if (d.queueLeft === undefined) d.queueLeft = 25;
          return;
        }
        return this.abort(c, '자리가 없어요');
      }
      d.queueLeft = undefined;
      // 언덕 꼭대기처럼 길에서 떨어진 자리에서는 빈칸까지 먼저 내려온다
      if (d.socket && d.socket !== s && d.socket.seatIn && this.nav && !this.onWalkable(c)) c.exit = { x: d.socket.ax, z: d.socket.az };
      if (d.x.shared) this.release(c);
      else this.claim(c, s);
      d.socket = s;
      d.phase = 'walk';
      d.left = st.min;
      // 걸어갈 시간 여유: 길 지도로 돌아가는 길은 직선보다 길다. 배를 타면 더
      d.walkLeft = 45 + dist(c, s) / WALK * 2.5 + (d.x.examTake ? 60 : 0);
    }
    // 자리(좌석·탕 안 같은 막힌 칸)에 있으면 빈칸으로 나오게 한다
    // 자리에서 나올 때는 앉을 때의 반대로, 가장 가까운 빈칸까지 곧게 나온다 (심즈 방식 자리 접근의 반대)
    // 걸어서 어디로든 갈 수 있는 칸에 서 있는가 (음식대·카스텔라 위는 비어 있어도 갈 수 있는 칸이 아니다)
    onWalkable(c) {
      const cell = this.nav.cellOf(c.x, c.z);
      return this.nav.free(cell) && (!this.nav.reach || this.nav.reach[cell] === 1);
    }
    leaveSeat(c) {
      // 의자 위처럼 막히지는 않았어도 걸어 나갈 수 없는 칸이면 빈칸으로 내려온다
      if (!this.nav || this.onWalkable(c)) return;
      // 푸딩 꼭대기처럼 빈칸이 먼 자리에서도 반드시 내려온다
      let n = this.nav.nearestFree(c.x, c.z, 2.5);
      if (n < 0) n = this.nav.nearestFree(c.x, c.z, 14);
      if (n < 0) return;
      const p = this.nav.center(n);
      c.exit = { x: p.x, z: p.z, h0: c.h || 0, d0: Math.hypot(p.x - c.x, p.z - c.z) || 1 };
    }
    abort(c, why) {
      if (c.doing && c.doing.ordered) this.say(c, why, 3);
      const failed = !!(why && c.doing);
      this.release(c);
      this.clearRoute(c);
      this.leaveSeat(c);
      c.doing = null;
      c.act = null;
      c.clip = null;
      c.prop = null;
      c.hidden = false;
      c.h = this.nav ? this.nav.surface(c.x, c.z) : 0;
      // 성격대로 실패에 반응한다 (울보는 울고 낙천가는 털어 낸다)
      if (failed && this.traits) this.traits.onFail(c, why);
    }
    finish(c) {
      const d = c.doing;
      if (d.x.earn && !d.x.shift) {
        c.money += d.x.earn;
        this.note(`${c.name}: ${d.x.name} 끝 (+${d.x.earn}원)`);
      } else this.note(`${c.name}: ${d.x.name} 끝`);
      if (this.labor) this.labor.onFinish(c, d.x);
      this.persona.onFinish(c, d.x);
      this.ecology.onFinish(c, d.x);
      if (this.traits) this.traits.onFinish(c, d.x);
      c.recent.push(d.x.id);
      if (c.recent.length > 4) c.recent.shift();
      this.release(c);
      this.clearRoute(c);
      this.leaveSeat(c);
      // 집 안에서 나올 때는 문 앞의 빈자리로 나온다 (같은 집에서 잔 캐릭터끼리 같은 점에 겹치지 않게, R2)
      if (d.x.hide && this.nav) {
        const busy = this.chars.some(o => o !== c && !o.hidden && Math.hypot(o.x + (o.ox || 0) - c.x, o.z + (o.oz || 0) - c.z) < 0.95);
        const p = busy ? this.asideSpot(c) : null;
        if (p) {
          c.x = p.x;
          c.z = p.z;
        }
      }
      c.doing = null;
      c.act = null;
      c.clip = null;
      c.prop = null;
      c.hidden = false;
      c.h = this.nav ? this.nav.surface(c.x, c.z) : 0;
      c.lastPlace = d.x.place;
      if (!c.exit && !d.x.hide) this.stepOffSocket(c);
      // 시킨 일을 끝낸 뒤에는 플레이어가 다음 일을 고를 틈을 준다. 스스로 고른 일 뒤의 쉼은 짧게 (이 틈에 성격 버릇이 나온다)
      c.idleLeft = c.orders.length ? 0.5 : d.ordered ? 6 + this.random() * 3 : 1 + this.random() * 1.5;
    }

    clearRoute(c) {
      c.legs = null;
      c.navKey = null;
      c.navTarget = null;
      c.navGoal = null;
      c.seating = false;
      c.moveClip = null;
      c.detour = null;
      if (c.riding) {
        c.riding = false;
        c.hidden = false;
      }
    }
    // 걸어가기 (R1): 실제 지오메트리로 만든 길 지도 위의 길만 따라간다. 막힌 자리(의자 등)는 접근 칸까지 걸어가서
    // 마지막에만 자리로 들어간다(심즈 방식). 배 포털은 타는 동안 숨는다. 실패하면 null
    walk(c, target, dt) {
      if (!this.nav) return this.walkStraight(c, target, dt);
      // 랏코는 먼 길을 차로 간다
      if (c.id === 'rakko') {
        const byCar = RakkoCar.intercept(this, c, target, dt);
        if (byCar !== undefined) return byCar;
      }
      let goal = target.ax !== undefined ? { x: target.ax, z: target.az } : target;
      // 막힌 자리의 접근 칸은 앉아 있는 다른 캐릭터와 0.95 이상 떨어진 칸으로 고른다 (옆 자리 사람을 스치지 않게)
      if (target.seatIn && c.navTarget === target && c.navGoal) goal = c.navGoal;
      else if (target.seatIn) {
        const seated = this.chars.filter(o => o !== c && !o.hidden && this.seated(o));
        let best = null;
        let bestD = Infinity;
        const R = Math.ceil(2.5 / 0.5);
        for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
          const p = { x: target.x + dx * 0.5, z: target.z + dz * 0.5 };
          const cell = this.nav.cellOf(p.x, p.z);
          if (!this.nav.free(cell)) continue;
          const q = this.nav.center(cell);
          const dd = Math.hypot(q.x - target.x, q.z - target.z);
          if (dd > 2.5 || dd >= bestD) continue;
          if (seated.some(o => Math.hypot(o.x - q.x, o.z - q.z) < 0.95)) continue;
          best = q;
          bestD = dd;
        }
        if (best) goal = best;
        c.navTarget = target;
        c.navGoal = goal;
      }
      const key = `${goal.x.toFixed(2)},${goal.z.toFixed(2)}`;
      if (c.navKey !== key) {
        // 한 번에 길 찾기가 몰리면 화면이 끊긴다: 이번 틱 몫을 다 썼으면 다음 틱에 찾는다
        if (this.routeBudget !== undefined && this.routeBudget <= 0) return false;
        const routeStart = performance.now();
        // 앉아서 뭔가 하는 캐릭터 옆은 비켜 가는 길로 (R2). 못 찾으면 그냥 길로
        this.nav.setAvoid(this.chars.filter(o => o !== c && !o.hidden && this.seated(o)).map(o => ({ x: o.x, z: o.z })), c, goal);
        c.legs = this.nav.route(c, goal);
        this.nav.avoid = null;
        if (!c.legs) c.legs = this.nav.route(c, goal);
        if (this.routeBudget !== undefined) this.routeBudget -= performance.now() - routeStart;
        c.navKey = key;
        c.legI = 0;
        c.ptI = 1;
        c.seating = false;
        if (!c.legs) {
          c.navKey = null;
          // 이미 그 자리에 있으면 도착이다. 올라앉는 자리에 갇혀 있으면 먼저 내려온다
          if (dist(c, target) < 0.6) return true;
          if (!this.onWalkable(c)) {
            this.leaveSeat(c);
            if (c.exit) return false;
          }
          return null;
        }
        // 자리에서 막 일어나면 첫 칸까지는 자리에서 나오는 중이다
        c.leaving = this.nav.isBlocked(c.x, c.z);
      }
      // 우회 중이면 우회로부터 (끝나면 지금 자리에서 길을 다시 찾는다)
      if (c.detour && this.followDetour(c, dt)) return false;
      let step = WALK * dt * (c.driving ? RakkoCar.BOOST : 1);
      const before = { x: c.x, z: c.z, legI: c.legI, ptI: c.ptI, leaving: c.leaving };
      while (step > 1e-6 && c.legI < c.legs.length) {
        const leg = c.legs[c.legI];
        if (leg.jump) {
          // 배를 탄다: 출발 칸에서 숨고, 2분 뒤 도착 칸에 나타난다
          if (!c.riding) {
            c.riding = true;
            c.rideLeft = 2;
            c.hidden = true;
            this.say(c, leg.jump.label || '배 타요', 2);
          }
          c.rideLeft -= dt;
          if (c.rideLeft > 0) return false;
          c.riding = false;
          c.hidden = false;
          c.x = leg.jump.to.x;
          c.z = leg.jump.to.z;
          c.legI += 1;
          c.ptI = 1;
          return false;
        }
        const p = leg.pts[c.ptI];
        if (!p) {
          c.legI += 1;
          c.ptI = 1;
          continue;
        }
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-6) c.angle = Math.atan2(dx, dz);
        if (d <= step) {
          c.x = p.x;
          c.z = p.z;
          step -= d;
          c.ptI += 1;
          if (c.leaving && !this.nav.isBlocked(c.x, c.z)) c.leaving = false;
        } else {
          c.x += (dx / d) * step;
          c.z += (dz / d) * step;
          step = 0;
          if (c.leaving && !this.nav.isBlocked(c.x, c.z)) c.leaving = false;
        }
      }
      c.walking = true;
      // 길을 양보한다 (R2): 이 걸음으로 누군가에게 0.9보다 가까워지면 걸음을 무르고 기다린다.
      // 몇 틱 넘게 막히면 주변 캐릭터를 피하는 길로 다시 찾는다. 내 자리에 거의 다 왔으면(옆 자리와는 소켓 간격) 양보하지 않는다
      const nearGoal = Math.hypot(target.x - c.x, target.z - c.z) < 1.2 || Math.hypot(goal.x - c.x, goal.z - c.z) < 0.3;
      const close = p => this.chars.some(o => o !== c && !o.hidden && !o.riding && Math.hypot(o.x + (o.ox || 0) - p.x, o.z + (o.oz || 0) - p.z) < 0.92);
      const closer = () => this.chars.some(o => {
        if (o === c || o.hidden || o.riding) return false;
        const ox = o.x + (o.ox || 0);
        const oz = o.z + (o.oz || 0);
        const now = Math.hypot(ox - c.x - (c.ox || 0), oz - c.z - (c.oz || 0));
        return now < 0.92 && now < Math.hypot(ox - before.x - (c.ox || 0), oz - before.z - (c.oz || 0)) - 1e-6;
      });
      // 길막힘 한도 (2026-11-09 이재헌 지시): 비켜 가기·다른 길로도 풀리지 않고 게임 3분(1배속 3초) 넘게 막히면
      // 잠깐(게임 2분) 다른 주민을 지나쳐 간다. 그동안에도 겹침 밀어내기가 보이는 위치를 떼어 놓는다
      if (c.passT > 0) c.passT -= dt;
      if (!nearGoal && !before.leaving && !(c.passT > 0) && closer()) {
        Object.assign(c, before);
        // 막혀서 못 간 시간 (길을 다시 찾아도 이어서 센다. 앞으로 나아가면 0)
        c.waitTicks = (c.waitTicks || 0) + 1;
        c.blockedT = (c.blockedT || 0) + dt;
        if (c.blockedT >= 3) {
          c.passT = 2;
          c.blockedT = 0;
          this.passCount = (this.passCount || 0) + 1;
        }
        // 기다리는 동안 가까워졌으면 그만큼 뒤로 물러선다 (빈칸일 때만)
        for (const o of this.chars) {
          if (o === c || o.hidden || o.riding) continue;
          const vx = c.x + (c.ox || 0) - o.x - (o.ox || 0);
          const vz = c.z + (c.oz || 0) - o.z - (o.oz || 0);
          const dd = Math.hypot(vx, vz);
          if (dd >= 0.93 || dd < 1e-4) continue;
          const back = { x: c.x + (vx / dd) * (0.93 - dd), z: c.z + (vz / dd) * (0.93 - dd) };
          if (!this.nav.isBlocked(back.x, back.z) && this.nav.clear(c, back)) {
            c.x = back.x;
            c.z = back.z;
            c.navKey = null;
          }
        }
        // 비켜 가기: 서로 막혀 못 가면 순위가 낮은 쪽이 상대가 지나갈 길에서 벗어난 빈자리로 비켜 섰다가, 상대가 지나간 뒤 다시 간다.
        // 높은 쪽은 잠깐 기다린다(그래도 막히면 높은 쪽도 비켜 선다). 몸이 겹치는 걸음은 여전히 고르지 않는다 (통과 금지)
        // 앞을 막은 게 그냥 서 있는(앉지 않은) 캐릭터면 그쪽이 옆으로 비켜 준다
        if (c.waitTicks >= 3) {
          for (const o of this.chars) {
            if (o === c || o.hidden || o.walking || o.aside || this.seated(o)) continue;
            if (Math.hypot(o.x + (o.ox || 0) - c.x - (c.ox || 0), o.z + (o.oz || 0) - c.z - (c.oz || 0)) > 1.2) continue;
            if (o.doing && o.doing.kind === 'obj' && o.doing.phase === 'walk') continue;
            o.aside = this.asideSpot(o);
          }
        }
        const pocket = this.giveWay(c, c.waitTicks);
        if (pocket) {
          c.detour = pocket;
          c.yieldTicks = 0;
          return false;
        }
        c.yieldTicks = (c.yieldTicks || 0) + 1;
        if (c.yieldTicks > 2) {
          const others = this.chars.filter(o => o !== c && !o.hidden && Math.hypot(o.x - c.x, o.z - c.z) < 4).map(o => ({ x: o.x, z: o.z }));
          this.nav.setAvoid(others, c, goal);
          const legs = this.nav.route(c, goal);
          this.nav.avoid = null;
          if (legs) {
            c.legs = legs;
            c.legI = 0;
            c.ptI = 1;
          }
          c.yieldTicks = 0;
        }
        c.h = this.nav.surface(c.x, c.z);
        return false;
      }
      void close;
      c.waitTicks = 0;
      c.yieldTicks = 0;
      c.blockedT = 0;
      c.h = this.nav.surface(c.x, c.z);
      if (c.legI < c.legs.length) return false;
      // 길 끝: 막힌 자리면 마지막만 자리로 들어간다 (높이도 좌석 면으로 옮겨 간다)
      if (target.seatIn) {
        const dx = target.x - c.x;
        const dz = target.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-3) {
          if (!c.seating) {
            c.seating = true;
            c.seatFrom = { x: c.x, z: c.z, h: c.h, d };
            // 높은 곳은 기어 올라간다
            c.moveClip = d > 2.5 && (target.h || 0) - c.h > 0.5 ? 'ladder_climb' : null;
          }
          const mv = Math.min(d, WALK * dt * 0.6);
          c.x += (dx / d) * mv;
          c.z += (dz / d) * mv;
          c.angle = Math.atan2(dx, dz);
          const u = 1 - Math.max(0, d - mv) / (c.seatFrom.d || 1);
          c.h = c.seatFrom.h + ((target.h || 0) - c.seatFrom.h) * u;
          if (d - mv > 1e-3) return false;
        }
      }
      c.x = target.x;
      c.z = target.z;
      c.seating = false;
      c.moveClip = null;
      c.navKey = null;
      c.navTarget = null;
      c.navGoal = null;
      c.legs = null;
      c.walking = false;
      return true;
    }

    // 길 지도가 없을 때만 쓰는 예전 직선 걷기
    walkStraight(c, target, dt) {
      const dx = target.x - c.x;
      const dz = target.z - c.z;
      const d = Math.hypot(dx, dz);
      const step = WALK * dt;
      if (d <= step) {
        c.x = target.x;
        c.z = target.z;
        return true;
      }
      c.x += (dx / d) * step;
      c.z += (dz / d) * step;
      const place = target.place && this.places[target.place];
      const near = place && Math.hypot(c.x - place.x, c.z - place.z) < (place.r || 10) + 6;
      if (!near && this.world.collide) {
        const before = { x: c.x, z: c.z };
        this.world.collide(c, 0.7);
        if (Math.hypot(c.x - before.x, c.z - before.z) > step * 0.6) {
          // 벽에 막히면 옆으로 비켜 간다
          c.x = before.x - (dz / d) * step * 0.8;
          c.z = before.z + (dx / d) * step * 0.8;
        }
      }
      c.angle = Math.atan2(dx, dz);
      c.walking = true;
      return false;
    }

    tickChar(c, dt) {
      // 괴물·사라진 엑스트라는 마을의 순환이 움직인다. 붙잡힌 엑스트라는 떨고만 있다
      if (c.id === 'rakko') RakkoCar.tick(this, c);
      if (c.monster || c.gone) return this.ecology.tickBeast(c, dt);
      if (c.caught) {
        c.walking = false;
        return;
      }
      const night = this.hour >= 21 || this.hour < 6;
      // 근무 중에는 욕구가 줄지 않고, 줄었을 양을 적어 둔다 (퇴근 때 절반만 빠진다)
      const onShift = Shifts.track(this, c);
      for (const k of NEED_KEYS) {
        const sleeping = c.doing && c.doing.x.night && c.doing.phase === 'use';
        if (k === 'energy' && sleeping) continue;
        const drop = (DECAY[k] * (night && k !== 'energy' ? 0.4 : 1) * dt) / 60;
        if (onShift) Shifts.owe(c, k, drop);
        else c.needs[k] = clamp(c.needs[k] - drop);
      }
      if (c.speechLeft > 0) {
        c.speechLeft -= dt;
        if (c.speechLeft <= 0) c.speech = null;
      }
      c.walking = false;
      // 쓰러져 있는 동안은 아무것도 못 한다
      if (c.collapse) {
        const co = c.collapse;
        co.left -= dt;
        c.act = 'idle';
        c.clip = co.clip;
        c.needs[co.need] = clamp(c.needs[co.need] + (co.gain / co.min) * dt);
        if (co.left <= 0) {
          c.collapse = null;
          c.clip = null;
          c.idleLeft = 1;
        }
        return;
      }
      this.checkNeeds(c, dt);
      const d = c.doing;
      // 서 있는 동안의 높이는 밟는 면 (가게 바닥판 등, R3). 자리를 쓰는 중이면 그 자리 높이
      if (this.nav && !(d && d.kind === 'obj' && d.phase === 'use')) c.h = this.nav.surface(c.x, c.z);
      // 자리에서 나오는 중이면 그것부터
      if (c.exit) {
        const dx = c.exit.x - c.x;
        const dz = c.exit.z - c.z;
        const dd = Math.hypot(dx, dz);
        // 높은 자리에서는 내려오는 동안 높이도 줄어든다
        c.moveClip = c.exit.h0 !== undefined && c.exit.d0 > 2.5 && c.exit.h0 - this.nav.surface(c.exit.x, c.exit.z) > 0.5 ? 'slide_down' : null;
        if (c.exit.h0 !== undefined && this.nav) c.h = c.exit.h0 + (this.nav.surface(c.exit.x, c.exit.z) - c.exit.h0) * (1 - dd / c.exit.d0);
        const mv = WALK * dt * 0.6;
        c.leaving = true;
        c.walking = true;
        if (dd <= mv) {
          c.x = c.exit.x;
          c.z = c.exit.z;
          c.exit = null;
          c.moveClip = null;
          c.leaving = false;
          c.h = this.nav.surface(c.x, c.z);
        } else {
          c.x += (dx / dd) * mv;
          c.z += (dz / dd) * mv;
          c.angle = Math.atan2(dx, dz);
          return;
        }
      }
      // 겹쳐서 비켜 서는 중이면 그것부터 (하던 일은 그대로 이어진다)
      if (c.aside && !(d && d.kind === 'obj' && d.phase === 'walk')) {
        const r = this.walk(c, c.aside, dt);
        if (r !== false) c.aside = null;
        if (r === false) return;
      } else if (c.aside) c.aside = null;
      if (!d) {
        // 성공·실패의 반응을 잠깐 보여 준다
        if (c.reactLeft > 0) {
          c.reactLeft -= dt;
          c.act = 'idle';
          c.clip = c.reactLeft > 0 ? c.reactClip : null;
          return;
        }
        if (c.idleLeft > 0) {
          c.idleLeft -= dt;
          c.act = 'idle';
          return;
        }
        // 물건 속에 끼어 있으면 (이전 저장에서 갇힌 주민 포함) 빈칸으로 나온 뒤에 다음 일을 고른다
        if (this.nav && !this.nav.free(this.nav.cellOf(c.x, c.z))) {
          this.leaveSeat(c);
          if (c.exit) return;
        }
        return this.choose(c);
      }
      if (d.kind === 'chat') return this.tickChat(c, d, dt);
      if (d.phase === 'queue') {
        d.queueLeft -= dt;
        return this.nextStep(c);
      }
      const st = d.x.steps[d.step];
      if (d.phase === 'walk') {
        c.act = null;
        c.prop = null;
        c.h = 0;
        c.hidden = false;
        d.walkLeft -= dt;
        if (d.walkLeft < 0) return this.abort(c, '못 가겠어요');
        const arrived = this.walk(c, d.socket, dt);
        if (arrived === null) return this.abort(c, '길이 없어요');
        if (!arrived) return;
        // 도착: 자리에 맞춰 서고 그쪽을 본다
        c.x = d.socket.x;
        c.z = d.socket.z;
        c.h = d.socket.h;
        if (d.socket.fx !== undefined) c.angle = Math.atan2(d.socket.fx - c.x, d.socket.fz - c.z);
        d.phase = 'use';
        // 정해진 시각까지 하는 단계 (시험): 늦게 왔으면 남은 시간만큼만
        if (st.until !== undefined) d.left = Math.max(st.min, st.until - (this.minutes % 1440));
        if (this.labor && !this.labor.onArrive(c, d)) return;
        if (!d.paid && d.x.cost) {
          c.money -= d.x.cost;
          d.paid = true;
        }
        if (d.step === 0) this.say(c, d.x.name, 3);
        // 집 안으로 들어가는 잠은 문 앞에 서 있지 않고 바로 들어간다 (여럿이 같은 문 앞에 겹치지 않게, R2)
        c.hidden = !!d.x.hide;
      }
      // 쓰는 중: 단계 시간만큼 효과를 나눠서 채운다
      c.act = st.act;
      c.clip = st.clip || null;
      // 손 소품은 그 단계가 필요로 할 때만, 쓰는 동안에만 (사물은 몸을 통과할 수 없다: 배치는 village-props.js)
      c.prop = st.prop || null;
      const share = dt / d.total;
      // 시각까지 기다리는 단계(시험)는 길이가 정해져 있지 않아 나눠 채우지 않는다
      if (st.until === undefined) for (const [k, v] of Object.entries(d.x.gain)) c.needs[k] = clamp(c.needs[k] + v * share);
      if (d.x.group && this.chars.some(o => o !== c && o.doing && o.doing.x.place === d.x.place && o.doing.phase === 'use')) {
        c.needs.social = clamp(c.needs.social + 0.4 * dt);
      }
      d.left -= dt;
      if (d.left <= 0 && st.waitServe && !this.servedReady(c, d)) {
        // 음식이 나오기 전에는 먹지 않는다: 주문을 넣고, 근무자가 내 자리로 내줄 때까지 기다린다 (2026-11-10 라멘 로 시사 사례)
        this.placeOrder(c, d);
        d.left = 0.25;
        c.act = 'wait';
        return;
      }
      // 근무자: 주문이 없으면 내주는 곳에서 기다린다. 주문이 있으면 가장 먼저 들어온 것을 맡는다
      if (d.left <= 0 && st.waitOrder && !d.order) {
        d.order = this.takeOrder(d.x.place);
        if (!d.order) {
          d.left = 0.25;
          return;
        }
      }
      if (d.left <= 0) {
        if (st.serves && d.order) {
          const o = d.order.who;
          if (o.doing === d.order.doing) o.doing.servedOk = true;
        }
        this.nextStep(c);
      }
    }
    // 손님이 음식을 기다리기 시작하면 그 장소의 주문 줄에 넣는다 (한 번만)
    placeOrder(c, d) {
      if (d.orderPlaced) return;
      d.orderPlaced = true;
      this.orderQueue = this.orderQueue || {};
      (this.orderQueue[d.x.place] = this.orderQueue[d.x.place] || []).push({ who: c, doing: d, seat: d.socket && d.socket.name, at: this.minutes });
    }
    // 아직 기다리는 손님의 주문 중 가장 오래된 것 (떠난 손님의 주문은 버린다)
    takeOrder(place) {
      const q = (this.orderQueue || {})[place] || [];
      while (q.length && (q[0].who.doing !== q[0].doing || q[0].doing.servedOk)) q.shift();
      return q.shift() || null;
    }
    // 그 장소에 음식을 내주는 근무자가 있으면, 내준 그릇이 있어야 넘어간다. 근무자가 없으면(가게 사람이 내주는 시간) 그대로
    servedReady(c, d) {
      const place = d.x.place;
      this.served = this.served || {};
      const staff = this.chars.some(o => o !== c && o.doing && o.doing.x.place === place && o.doing.x.shift && o.doing.x.steps.some(q => q.serves));
      d.served = (d.served || 0) + 0.25;
      if (!staff || d.served > 40) return true;
      // 근무자가 이 손님의 주문을 내줬을 때만
      return !!d.servedOk;
    }

    // 욕구가 한계에 닿았을 때: 해결하러 가거나, 더 내려가면 쓰러진다
    checkNeeds(c, dt) {
      if (c.hidden || c.riding) return;
      c.needCheck = (c.needCheck || 0) - dt;
      if (c.needCheck > 0) return;
      c.needCheck = DISTRESS_CHECK;
      const d = c.doing;
      const fixing = k => d && d.kind === 'obj' && (d.x.gain[k] || 0) > 0;
      for (const [k, rule] of Object.entries(COLLAPSE)) {
        if (c.needs[k] > rule.at || fixing(k)) continue;
        if (d) this.abort(c, '');
        c.collapse = { need: k, left: rule.min, min: rule.min, clip: rule.clip, gain: rule.gain };
        this.say(c, rule.say, 4);
        this.note(`${c.name}: ${rule.note}`);
        return;
      }
      if ((d && d.ordered) || c.orders.length) return;
      const worst = Object.keys(DISTRESS).filter(k => c.needs[k] < DISTRESS[k]).sort((a, b) => c.needs[a] - c.needs[b])[0];
      if (!worst || fixing(worst)) return;
      // 그 욕구를 채우는 일 중에서 지금 할 수 있는 가장 좋은 것으로 갈아탄다. 없으면 하던 일을 계속한다
      const best = this.options(c, 60).find(o => !o.with && (o.x.gain[worst] || 0) > 0);
      if (!best) return;
      if (d) this.abort(c, '');
      this.say(c, { hunger: '배고파…', energy: '졸려…', hygiene: '씻고 싶어…' }[worst], 3);
      this.start(c, best.x, null, false);
    }

    // 수다 자리: 상대 둘레의 빈칸, 다른 캐릭터와 0.9 이상 떨어진 곳 중 나와 가장 가까운 곳
    chatSpot(c, o) {
      if (!this.nav) return { x: o.x + Math.sin(o.angle) * 1.8, z: o.z + Math.cos(o.angle) * 1.8 };
      const base = Math.atan2(c.x - o.x, c.z - o.z);
      let best = null;
      let bestD = Infinity;
      for (const r of [1.8, 1.6, 2.2]) {
        for (let k = 0; k < 8; k++) {
          const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 4);
          const p = { x: o.x + Math.sin(a) * r, z: o.z + Math.cos(a) * r };
          if (!this.nav.free(this.nav.cellOf(p.x, p.z))) continue;
          // 상대와 나 사이에 벽이 없어야 한다 (상대가 앉은 자리 칸은 막혀 있으므로 그 앞까지만 본다)
          const u = 1 - 0.9 / r;
          if (!this.nav.clear(p, { x: p.x + (o.x - p.x) * u, z: p.z + (o.z - p.z) * u })) continue;
          if (this.chars.some(q => q !== c && q !== o && !q.hidden && (Math.hypot(q.x - p.x, q.z - p.z) < 0.9 || (q.claimSpot && Math.hypot(q.claimSpot.x - p.x, q.claimSpot.z - p.z) < 0.9)))) continue;
          const dd = Math.hypot(p.x - c.x, p.z - c.z);
          if (dd < bestD) {
            bestD = dd;
            best = p;
          }
        }
        if (best) return best;
      }
      return null;
    }

    tickChat(c, d, dt) {
      const o = d.with;
      if (!o || o.hidden) return this.abort(c, '');
      if (d.phase === 'wait') {
        // 부른 친구가 올 때까지 그쪽을 보며 기다린다
        c.act = 'idle';
        c.angle = Math.atan2(o.x - c.x, o.z - c.z);
        d.waitLeft -= dt;
        if (dist(c, o) < 2.4) d.phase = 'use';
        else if (d.waitLeft <= 0 || !o.doing || o.doing.with !== c) {
          c.doing = null;
          c.act = null;
        }
        if (d.phase !== 'use') return;
      }
      if (d.phase === 'walk') {
        c.act = null;
        if (o.doing && o.doing.phase === 'walk') return this.abort(c, '');
        // 상대 둘레 1.6~2.2의 빈칸에 선다. 가구 안이나 남 위가 되지 않게 (R2)
        if (!d.spot || Math.hypot(d.spotOf.x - o.x, d.spotOf.z - o.z) > 0.5) {
          d.spot = this.chatSpot(c, o);
          d.spotOf = { x: o.x, z: o.z };
          if (!d.spot) return this.abort(c, '');
        }
        if (Math.hypot(c.x - d.spot.x, c.z - d.spot.z) > 0.05) {
          const r = this.walk(c, d.spot, dt);
          d.walkTime = (d.walkTime || 0) + dt;
          if (r === null || d.walkTime > 60) this.abort(c, '');
          if (!r) return;
        }
        d.phase = 'use';
        // 상대가 한가하면 같이 수다를 떤다 (상대도 수다 상태로)
        if (!o.doing || (o.doing.kind === 'obj' && o.doing.x.group)) {
          if (!o.doing) o.doing = { kind: 'chat', x: CHAT, with: c, phase: 'use', left: d.left };
        }
        this.say(c, ['있잖아…', '오늘 뭐 했어?', '헤헤', '배고프지 않아?'][Math.floor(this.random() * 4)], 3);
        this.note(`${c.name}와(과) ${o.name}이(가) 수다를 떨어요`);
      }
      c.act = 'friend';
      c.clip = null;
      c.prop = null;
      c.angle = Math.atan2(o.x - c.x, o.z - c.z);
      c.needs.social = clamp(c.needs.social + (CHAT.gain.social / CHAT.min) * dt);
      c.needs.fun = clamp(c.needs.fun + (CHAT.gain.fun / CHAT.min) * dt);
      d.left -= dt;
      if (d.left <= 0) {
        this.persona.onChat(c, o);
        if (this.traits) this.traits.onChat(c, o);
        c.recent.push(`chat:${o.id}`);
        if (c.recent.length > 4) c.recent.shift();
        c.doing = null;
        c.act = null;
        c.idleLeft = 1;
      }
    }

    // dtReal: 실제 초. 배속만큼 게임 분이 흐른다 (1배 = 실제 1초에 게임 1분)
    update(dtReal) {
      if (this.paused) return;
      if (this.labor) this.labor.tick();
      this.calendar.tick();
      // 길 찾기에 쓸 수 있는 시간 (밀리초). 빨리 감기 때는 그만큼 더 쓴다
      this.routeBudget = 8 * Math.max(1, this.speed);
      let left = Math.min(0.25, dtReal) * this.speed;
      while (left > 0) {
        const dt = Math.min(0.25, left);
        left -= dt;
        const before = Math.floor(this.minutes / (24 * 60));
        this.minutes += dt;
        if (Math.floor(this.minutes / (24 * 60)) > before) this.day += 1;
        this.persona.daily();
        this.ecology.tick(dt);
        if (this.traits) this.traits.tick(dt);
        for (const c of this.chars) this.tickChar(c, dt);
        this.separate(dt);
      }
      this.routeBudget = undefined;
    }

    // 걸을 수 있는 한 걸음인가: 막힌 칸·높이 다른 칸이 아니고 곧게 갈 수 있고, 누구에게도 몸 간격(0.92) 안으로 더 다가가지 않는다 (통과 금지)
    stepOk(c, p) {
      if (this.nav.isBlocked(p.x, p.z) || !this.nav.clear(c, p)) return false;
      if (Math.abs(this.nav.surface(p.x, p.z) - this.nav.surface(c.x, c.z)) > 0.3) return false;
      return this.chars.every(o => {
        if (o === c || o.hidden || o.riding) return true;
        const qx = o.x + (o.ox || 0);
        const qz = o.z + (o.oz || 0);
        const after = Math.hypot(qx - p.x - (c.ox || 0), qz - p.z - (c.oz || 0));
        return after >= 0.92 || after >= Math.hypot(qx - c.x - (c.ox || 0), qz - c.z - (c.oz || 0)) - 1e-6;
      });
    }
    // 우회로를 한 틱 걷는다. 걷는 중이면 true, 끝났거나 포기하면 false (그때 길을 다시 찾는다)
    followDetour(c, dt) {
      const det = c.detour;
      const p = det.pts[det.i];
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const len = Math.min(d, WALK * dt, 0.6);
      const q = d < 1e-4 ? p : { x: c.x + (dx / d) * len, z: c.z + (dz / d) * len };
      if (d >= 1e-4 && !this.stepOk(c, q)) {
        // 누가 앞을 막았다: 잠깐 기다리고, 오래 막히면 우회를 그만둔다
        det.fails += 1;
        c.walking = true;
        if (det.fails > 6) {
          c.detour = null;
          c.navKey = null;
          return false;
        }
        return true;
      }
      c.x = q.x;
      c.z = q.z;
      if (d >= 1e-4) c.angle = Math.atan2(dx, dz);
      c.walking = true;
      c.h = this.nav.surface(c.x, c.z);
      if (Math.hypot(p.x - c.x, p.z - c.z) < 0.05) {
        // 비켜 선 자리: 상대가 지나가 멀어질 때까지(또는 잠시) 서서 기다린다
        if (det.hold && det.i === det.pts.length - 1) {
          const b = det.hold;
          det.holdLeft -= 1;
          det.nearest = Math.min(det.nearest ?? Infinity, Math.hypot(b.x - c.x, b.z - c.z));
          const passed = b.hidden || !b.walking || (det.nearest < 3 && Math.hypot(b.x - c.x, b.z - c.z) > det.nearest + 1.5);
          if (!passed && det.holdLeft > 0) {
            c.walking = false;
            return true;
          }
        }
        det.i += 1;
        if (det.i >= det.pts.length) {
          c.detour = null;
          c.navKey = null;
          return false;
        }
      }
      return true;
    }
    // 비켜 설 빈자리 (좁은 길에서 순위가 낮은 쪽): 6 안의 빈칸 중 곧게 갈 수 있고, 상대가 앞으로 지나갈 길에서 1.2 넘게 떨어지고,
    // 다른 캐릭터와 1.0 넘게 떨어진 가장 가까운 곳. 거기서 상대가 지나갈 때까지 기다린다 (followDetour의 hold)
    giveWay(c, waited) {
      if (!this.nav || waited < 3) return null;
      let b = null;
      let bd = 1.6;
      for (const o of this.chars) {
        if (o === c || o.hidden || o.riding) continue;
        const od = Math.hypot(o.x + (o.ox || 0) - c.x - (c.ox || 0), o.z + (o.oz || 0) - c.z - (c.oz || 0));
        if (od < bd) {
          bd = od;
          b = o;
        }
      }
      if (!b || !b.walking || this.seated(b) || this.yields(c, b, waited)) return null;
      // 상대가 앞으로 걸을 점들 (지금 다리부터 40개)
      const route = [{ x: b.x, z: b.z }];
      for (let li = b.legI || 0; b.legs && li < b.legs.length && route.length < 40; li++) {
        const leg = b.legs[li];
        if (!leg || leg.jump || !leg.pts) break;
        for (let pi = li === b.legI ? b.ptI : 0; pi < leg.pts.length && route.length < 40; pi++) route.push(leg.pts[pi]);
      }
      const offRoute = p => route.every(q => Math.hypot(q.x - p.x, q.z - p.z) > 1.2);
      let best = null;
      let bestD = Infinity;
      const h0 = this.nav.surface(c.x, c.z);
      for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) {
        const dd = Math.hypot(dx, dz) * 0.5;
        if (dd > 6 || dd < 0.5 || dd >= bestD) continue;
        const cell = this.nav.cellOf(c.x + dx * 0.5, c.z + dz * 0.5);
        if (cell < 0 || !this.nav.free(cell)) continue;
        const p = this.nav.center(cell);
        if (Math.abs(this.nav.surface(p.x, p.z) - h0) > 0.3 || !offRoute(p)) continue;
        if (this.chars.some(o => o !== c && !o.hidden && Math.hypot(o.x - p.x, o.z - p.z) < 1.0)) continue;
        if (!this.nav.clear(c, p)) continue;
        best = p;
        bestD = dd;
      }
      return best ? { pts: [best], i: 0, fails: 0, hold: b, holdLeft: 40 } : null;
    }
    // 마주친 상대가 걷는 중이고 내 순위가 높으면(id 순) 잠깐(게임 시간으로 몇 틱) 제자리에서 기다린다
    yields(c, b, waited) {
      return !!(b.walking && !this.seated(b) && !b.hidden && c.id < b.id && waited < 10);
    }
    // 앉아서 쓰는 중인가 (자리를 가진 캐릭터는 밀리지 않는다)
    seated(c) {
      return !!(c.seating || (c.doing && c.doing.kind === 'obj' && (c.doing.phase === 'use' || c.doing.phase === 'queue') && !c.doing.x.shared));
    }
    // 밀어내기 (R2, docs/handover-collision-avoidance.md sepPush): 표시 위치 오프셋(ox, oz)으로 서로 0.9 이상 떨어뜨린다.
    // 앉은 캐릭터는 밀리지 않고, 밀린 자리가 막힌 칸이면 오프셋을 줄인다. 오프셋은 ±0.8 안에서 서서히 0으로 돌아간다
    separate(dt = 0.25) {
      const R = 0.9;
      const live = this.chars.filter(c => !c.hidden);
      for (const c of live) {
        c.ox = (c.ox || 0) * 0.92;
        c.oz = (c.oz || 0) * 0.92;
      }
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
          const a = live[i];
          const b = live[j];
          const sa = this.seated(a);
          const sb = this.seated(b);
          if (sa && sb) continue;
          let dx = b.x + b.ox - (a.x + a.ox);
          let dz = b.z + b.oz - (a.z + a.oz);
          let d = Math.hypot(dx, dz);
          if (d >= R) continue;
          if (d < 1e-4) {
            const ang = ((i * 7 + j * 13) % 16) * (Math.PI / 8);
            dx = Math.sin(ang);
            dz = Math.cos(ang);
            d = 1e-4;
          }
          const push = R + 0.01 - d;
          const nx = dx / d;
          const nz = dz / d;
          const wa = sa ? 0 : sb ? 1 : 0.5;
          const wb = sb ? 0 : sa ? 1 : 0.5;
          a.ox -= nx * push * wa;
          a.oz -= nz * push * wa;
          b.ox += nx * push * wb;
          b.oz += nz * push * wb;
        }
      }
      for (const c of live) {
        const len = Math.hypot(c.ox, c.oz);
        void len;
        if (len > 0.8) {
          c.ox *= 0.8 / len;
          c.oz *= 0.8 / len;
        }
        if (this.nav) {
          // 밀린 자리가 막힌 칸이거나 높이가 다른 칸(단 위·아래)이면 오프셋을 줄인다
          const bad = () => {
            const here = this.nav.cellOf(c.x, c.z);
            const there = this.nav.cellOf(c.x + c.ox, c.z + c.oz);
            if (this.nav.isBlocked(c.x, c.z)) return false;
            return there < 0 || this.nav.blocked[there] || Math.abs(this.nav.abs[there] - this.nav.abs[here]) > 0.1;
          };
          for (let k = 0; k < 4 && (c.ox || c.oz) && bad(); k++) {
            c.ox *= 0.5;
            c.oz *= 0.5;
          }
          if (bad()) c.ox = c.oz = 0;
        }
      }
      if (!this.nav) return;
      // 오프셋으로 못 떼어 놓은 겹침: 서 있는 캐릭터가 실제로 비켜 선다 (몇 틱 넘게 이어질 때)
      for (const c of live) {
        if (this.seated(c) || c.walking || c.aside || c.exit) {
          c.stuck = 0;
          continue;
        }
        const near = live.some(o => o !== c && Math.hypot(o.x + o.ox - c.x - c.ox, o.z + o.oz - c.z - c.oz) < R);
        c.stuck = near ? (c.stuck || 0) + 1 : 0;
        if (c.stuck >= 1) {
          c.aside = this.asideSpot(c);
          c.stuck = 0;
          // 같은 틱 안에 바로 한 걸음 비킨다
          if (c.aside) {
            const r = this.walk(c, c.aside, dt);
            if (r !== false) c.aside = null;
          }
        }
      }
      // 보이는 자리의 밟는 면 높이 (R3)
      for (const c of live) if (!this.seated(c) && !c.seating && !c.exit) c.h = this.nav.surface(c.x + c.ox, c.z + c.oz);
    }
    // 비켜 설 자리: 1~2.5 안의 빈칸, 다른 캐릭터·남이 잡은 자리와 1.0 이상, 지금 자리에서 곧게 갈 수 있는 곳
    asideSpot(c, reject = null) {
      let best = null;
      let bestD = Infinity;
      for (const r of [1, 1.5, 2, 2.5, 3, 4, 5]) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const p = { x: c.x + Math.sin(a) * r, z: c.z + Math.cos(a) * r };
          if (!this.nav.free(this.nav.cellOf(p.x, p.z))) continue;
          // 지금 자리가 막힌 칸(자리에서 막 일어남)이면 곧은 길 대신 길찾기로 간다
          if (!this.nav.isBlocked(c.x, c.z) && !this.nav.clear(c, p)) continue;
          if (this.chars.some(o => o !== c && !o.hidden && (Math.hypot(o.x + (o.ox || 0) - p.x, o.z + (o.oz || 0) - p.z) < 1 || (o.claimSpot && Math.hypot(o.claimSpot.x - p.x, o.claimSpot.z - p.z) < 1)))) continue;
          if (reject && reject(p)) continue;
          if (r < bestD) {
            bestD = r;
            best = p;
          }
        }
        if (best) return best;
      }
      return null;
    }

    // 일을 마치고 쉬거나 기다릴 때 창구·저울 같은 자리 위에 서 있으면 한 걸음 비켜 선다 (그 자리를 쓰려는 다른 주민이 막히지 않게)
    stepOffSocket(c) {
      if (!this.nav || c.aside || c.exit || c.hidden || !c.lastPlace) return;
      const list = Object.values(this.sockets[c.lastPlace] || {});
      const onSocket = p => list.some(k => Math.hypot(k.x - p.x, k.z - p.z) < 0.75);
      if (!onSocket(c)) return;
      const p = this.asideSpot(c, onSocket);
      if (p) c.aside = p;
    }

    // 플레이어가 시킨다 (심즈처럼). 다음 판단 때 바로 한다
    order(c, x, other) {
      if (c.doing) this.abort(c, '');
      c.orders = [{ x, with: other }];
      c.idleLeft = 0;
    }

    save() {
      return JSON.stringify({ v: 1, minutes: this.minutes, day: this.day, labor: this.labor.saveWorld(), eco: this.ecology.saveWorld(), chars: this.chars.map(c => ({ id: c.id, x: c.x, z: c.z, needs: c.needs, money: c.money, ...this.labor.save(c), ...this.persona.save(c), ...this.ecology.save(c), ...(this.traits ? this.traits.save(c) : {}) })) });
    }
    load(text) {
      try {
        const s = JSON.parse(text);
        if (s.v !== 1) return false;
        this.minutes = s.minutes;
        this.day = s.day;
        for (const r of s.chars) {
          const c = this.chars.find(x => x.id === r.id);
          if (c) Object.assign(c, { ...this.snap({ x: r.x, z: r.z }), needs: r.needs, money: r.money });
          if (c) this.labor.load(c, r);
          if (c) this.persona.load(c, r);
          if (c) this.ecology.load(c, r);
          if (c && this.traits) this.traits.load(c, r);
          // 섬에 있던 주민은 뭍의 선착장으로 돌아온다
          if (c && c.z > 345) Object.assign(c, this.snap({ x: 0, z: 296 }));
        }
        this.labor.loadWorld(s.labor);
        this.ecology.loadWorld(s.eco);
        this.calendar.schedule();
        this.rescueStranded();
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  root.Village = { Village, CAST, NEEDS, weight, WALK };
}(typeof self !== 'undefined' ? self : this));
