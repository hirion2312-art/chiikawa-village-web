'use strict';
// 먼작귀 빌리지 선공개 — 아이 집 (2026-11-18)
// 이재헌님 결정 (11-17): 「기존 게임에 있는 집만 떼와서 각자 집에서 생활하는 상호작용 볼 수 있게」
//                (11-18): 「조종이 불가하고 스스로 상호작용 하는거 지켜만보는거로」
// - 집은 게임의 오두막 실내 그대로 (world-art.js BUILDERS.cottage → interiors-auto.js 집 꾸밈, Interiors)
// - 동작도 게임 클립 그대로 (anims*.js, AnimRig). 이불은 게임처럼 futon.sleep으로 덮인다
// - 아이가 스스로 고른다: 밤(23시~7시)에는 잔다. 낮에는 성격(성실·식욕·사교·용감)에 따라 공부·간식·책·꽃·춤·특훈·낮잠을 고른다
// - 보는 사람은 조종하지 않는다. 지금 하는 일 글만 보인다
// - 내 아이들(최대 3명)이 한 집에서 같이 산다 (2026-11-18 이재헌님). 침대·탁자 같은 자리는 한 명씩,
//   밤에 침대를 못 차지한 아이는 바닥 이불에서 잔다. 아이를 누르면 카메라·말풍선·이름표가 그 아이로
// birth.js의 3D 무대(scene·camera·actor)를 그대로 쓴다. 이 파일은 birth.js 다음에 읽는다.
const House = (() => {
  // 게임 파일: 집 모양과 동작. 내 아이 방에 처음 들어올 때만 받는다
  const GAME_FILES = ['glb-loader.js', 'glb-world.js', 'world.js', 'polish.js', 'world-art.js', 'world-town.js', 'sockets.js',
    'interiors.js', 'interiors-places.js', 'interiors-auto.js',
    'anims.js', 'anims/props.js', 'anim-rig.js', 'anims-base.js', 'anims-sims.js', 'village-props.js', 'anims-real.js'];
  // 같은 파일을 포토존(photo.js)과 같이 쓴다: 한 번만 읽고, 읽는 중이면 끝날 때까지 기다린다
  window.loadOnce = window.loadOnce || (src => { const old = document.querySelector(`script[src="${src}"]`); if (old) return old.dataset.ok || !old.dataset.dyn ? Promise.resolve() : new Promise((ok, no) => { old.addEventListener('load', ok); old.addEventListener('error', no); }); return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.dataset.dyn = '1'; s.onload = () => { s.dataset.ok = '1'; ok(); }; s.onerror = no; document.head.append(s); }); });
  const loadScript = src => loadOnce(src);
  let filesReady = null;
  const loadFiles = () => (filesReady = filesReady || GAME_FILES.reduce((p, f) => p.then(() => loadScript(f)), Promise.resolve()));

  // 집 안 자리 (게임 오두막 좌표 그대로: 침대 3.6,-1.6 / 탁자 -2.6,-1.2 / 선반 뒤 벽 / 화분 앞 왼쪽 구석)
  const HUB = [0.3, 1.8];                      // 방 가운데 앞: 여기를 거쳐 다니면 가구에 부딪히지 않는다
  const SPOTS = {
    bed: { go: [1.7, -0.7], at: [3.6, -1.0], y: 0.8, face: 0, lie: true },
    desk: { go: [-4.4, 0.7], at: [-4.4, -1.2], y: 0.42, face: Math.PI / 2, seat: 'stool' },   // 방석 의자 (게임 study_sit 높이 0.42)
    shelf: { at: [-1.7, -3.7], face: Math.PI },
    flower: { at: [-4.0, 3.0], face: -2.3 },
    rug: { at: [0.2, 1.2], face: 0 },
    corner: { at: [1.2, 3.4], face: -0.4 },
    // 바닥 이불 (침대를 못 차지한 아이가 밤에 자는 곳)
    mat1: { go: [-1.0, 3.2], at: [-1.0, 2.4], y: 0.06, face: 0, lie: true, floor: true },
    mat2: { go: [2.2, 3.2], at: [2.2, 2.4], y: 0.06, face: 0, lie: true, floor: true },
  };
  // 같이 써도 되는 자리 (아이마다 조금씩 비켜 선다)
  const SHARED = new Set(['rug', 'corner']);
  const SHIFT = [[0, 0], [1.3, 0.5], [-1.3, 0.5]];
  // 할 일: 자리, 단계(클립·글·소품·표정), 성격에 따른 무게
  const JOBS = {
    sleep: { spot: 'bed', steps: [{ clip: 'sleep_breathe', label: '이불 덮고 쿨쿨 자는 중', sleep: true }] },
    sleepFloor: { spot: 'mat', steps: [{ clip: 'sleep_breathe', label: '바닥 이불에서 쿨쿨 자는 중', sleep: true }] },
    nap: { spot: 'bed', steps: [{ clip: 'idle_yawn', label: '하암… 졸려', once: true, beside: true }, { clip: 'sleep_breathe', label: '낮잠 자는 중', sleep: true }], w: t => 0.25 + (1 - t.diligent) * 0.5 },
    study: { spot: 'desk', steps: [{ clip: 'study_home', label: '탁자에서 공부하는 중', prop: 'book' }], w: t => 0.3 + t.diligent * 1.2 },
    snack: { spot: 'desk', steps: [{ clip: 'eat_snack', label: '간식 먹는 중', prop: 'snack', face: 'joy' }, { clip: 'belly_pat', label: '배부르다', once: true, face: 'joy' }], w: t => 0.2 + t.appetite * 1.1 },
    read: { spot: 'shelf', steps: [{ clip: 'browse_shelf', label: '선반에서 책 고르는 중', once: true }, { clip: 'read_book', label: '서서 책 읽는 중', prop: 'book', ry: 0.35 }], w: t => 0.3 + (1 - t.social) * 0.6 },
    flower: { spot: 'flower', steps: [{ clip: 'smell_flower', label: '화분 꽃 냄새 맡는 중', face: 'joy' }], w: () => 0.45 },
    dance: { spot: 'rug', steps: [{ clip: 'idle_hum', label: '흥얼흥얼', face: 'joy', once: true }, { clip: 'dance_light', label: '혼자 춤추는 중', face: 'joy' }], w: t => 0.15 + t.social * 1.0 },
    train: { spot: 'corner', steps: [{ clip: 'brave_up', label: '힘내자!', once: true }, { clip: 'train_swing', label: '혼자 특훈하는 중' }], w: t => 0.1 + t.brave * 0.9 },
    rest: { spot: 'rug', steps: [{ clip: 'idle_stretch', label: '기지개 켜는 중', once: true }, { clip: 'idle_look', label: '멍하니 쉬는 중' }], w: () => 0.5 },
  };
  const WALK_SPEED = 1.9;
  const night = () => { const h = new Date().getHours(); return h >= 23 || h < 7; };

  // kids: 집에 사는 아이들 [{ info, a(몸), job, doing }]. kid·job·cur는 지금 계산 중인 아이 (한 아이씩 차례로 돌린다)
  const state = { on: false, me: null, built: false, root: null, st: null, kids: [], focus: 0, cur: null, kid: null, job: null, doing: '' };
  const focusKid = () => state.kids[state.focus] || state.kids[0] || null;
  const rnd = () => Math.random();

  /* ---------- 집 ---------- */
  function buildHouse(seedId) {
    if (state.root) scene.remove(state.root);
    state.root = new THREE.Group();
    // 이불 색은 아이마다 다르다 (게임은 집 자리로 고른다)
    let h = 0;
    for (const ch of String(seedId)) h = (h * 31 + ch.charCodeAt(0)) % 997;
    const place = { id: 'cottage', x: (h % 5) * 0.001, z: 0, face: 0 };
    const k = makeKit(state.root, 0, 0, 0);
    // 같은 자리에 다시 세우면 Interiors 목록이 겹치므로 전 집을 뺀다
    for (const [key, st] of Interiors.MOUNTED) if (st.place.id === 'cottage') Interiors.MOUNTED.delete(key);
    BUILDERS.cottage(k, place);
    state.st = [...Interiors.MOUNTED.values()].find(s => s.place === place);
    state.st.shell.visible = false;
    state.st.inside.visible = true;
    state.st.blend = 1;
    state.st.open = true;
    state.st.peek = true;
    // 바닥 이불 둘: 그 자리에서 자는 아이가 있을 때만 깐다 (게임 집 가구와 같은 만들기 도구)
    state.mats = {};
    for (const [key, color] of [['mat1', '#f3bcc8'], ['mat2', '#a8c6e0']]) {
      const sp = SPOTS[key];
      const g = new THREE.Group();
      const mk = makeKit(g, 0, 0, 0);
      // 요(바닥 판) · 베개(머리 쪽 -z) · 덮는 이불(침대 이불과 같은 둥근 모양)
      mk.box(sp.at[0], 0.04, sp.at[1] - 1.0, 1.9, 0.08, 3.4, '#fffdf8', 1);
      mk.ball(sp.at[0], 0.16, sp.at[1] - 2.35, 0.6, 0.14, 0.34, '#fffdf8');
      mk.ball(sp.at[0], 0.42, sp.at[1] - 0.55, 0.95, 1.3, 1.2, color, 1);
      g.visible = false;
      state.root.add(g);
      state.mats[key] = g;
    }
    scene.add(state.root);
  }

  /* ---------- 아이 ---------- */
  function buildKid(me) {
    const preset = presetFromLook(me.look);
    const built = buildCharacter(preset, { faceWidth: 512 });
    const a = {
      built, preset, c: { id: 'me' }, offset: 0, prop: null, propKey: null,
      base: { position: built.model.position.clone(), rotation: built.model.rotation.clone(), scale: built.model.scale.clone() },
      x: HUB[0], z: HUB[1], y: 0, ry: 0, path: [], walkT: 0, seatAmt: 0, seatType: null, stepT: 0,
    };
    // 앉기 높이(엉덩이 높이)는 처음 잰 값을 계속 쓴다. 누운 자세에서 재면 틀어지므로 선 자세에서 먼저 잰다
    // 머리 위 장식(새싹 잎 등)이 몸 가운데 줄에 있으면 엉덩이 대신 머리 꼭대기를 재 버린다 → 맨몸 값으로 (anim-rig.js 기본값)
    const info = AnimRig.rigInfo(built, preset);
    if (info.buttH > 0.6) info.buttH = 0.08;
    state.root.add(built.root);
    return a;
  }
  // 같이 사는 아이들: 계정이면 서버가 준 목록, 계정이 없으면 이 기기에 모아 둔 열쇠로 하나씩 물어본다 (최대 3명, 지금 아이가 맨 앞)
  async function housemates(me) {
    const list = [{ id: me.resident.id, name: me.resident.name, look: me.look, traits: me.traits || {} }];
    for (const k of me.kids || []) if (k.look && !list.some(x => x.id === k.id)) list.push({ id: k.id, name: k.name, look: k.look, traits: k.traits || {} });
    try {
      const w = typeof wallet === 'function' ? wallet() : {};
      for (const [id, v] of Object.entries(w)) {
        if (list.length >= 3 || list.some(x => x.id === id) || !v || !v.token) continue;
        const r = await fetch(`${window.VILLAGE_API || ''}/api/me`, { headers: { authorization: `Bearer ${v.token}` } });
        if (!r.ok) continue;
        const d = await r.json();
        list.push({ id, name: d.resident.name, look: d.look, traits: d.traits || {} });
      }
    } catch (e) { /* 같이 사는 아이를 못 불러와도 내 아이는 산다 */ }
    return list.slice(0, 3);
  }

  /* ---------- 스스로 고르기 ---------- */
  const taken = key => state.kids.some(k => k !== state.cur && k.job && k.job.spotKey === key);
  function pickJob() {
    if (night()) return taken('bed') ? 'sleepFloor' : 'sleep';
    const t = { brave: 0.5, social: 0.5, appetite: 0.5, diligent: 0.5, ...((state.cur && state.cur.info.traits) || {}) };
    const last = state.job && state.job.id;
    const list = Object.entries(JOBS).filter(([id, j]) => j.w && id !== last && (SHARED.has(j.spot) || !taken(j.spot)));
    if (!list.length) return 'rest';
    const total = list.reduce((s, [, j]) => s + j.w(t), 0);
    let r = rnd() * total;
    for (const [id, j] of list) { r -= j.w(t); if (r <= 0) return id; }
    return list[0][0];
  }
  function startJob(id, instant) {
    const a = state.kid;
    const job = JOBS[id];
    // 바닥 이불은 빈 쪽으로, 같이 쓰는 자리는 아이 순서대로 조금씩 비켜 선다
    let spotKey = job.spot;
    if (spotKey === 'mat') spotKey = taken('mat1') ? 'mat2' : 'mat1';
    let spot = SPOTS[spotKey];
    if (SHARED.has(spotKey)) {
      const [sx, sz] = SHIFT[Math.max(0, state.kids.indexOf(state.cur)) % SHIFT.length];
      spot = { ...spot, at: [spot.at[0] + sx, spot.at[1] + sz] };
    }
    const sleeping = id === 'sleep' || id === 'sleepFloor';
    state.job = { id, job, spot, spotKey, step: 0, t: 0, len: sleeping ? 1e9 : 26 + rnd() * 30, phase: 'walk' };
    leaveSpot();
    if (instant) {
      a.x = spot.at[0]; a.z = spot.at[1]; a.ry = spot.face;
      a.path = [];
      arrive(true);
      return;
    }
    // 가구를 피해 방 가운데를 거쳐 간다
    a.path = [HUB, spot.go || spot.at];
    if (spot.go && !spot.lie) a.path.push(spot.at);
    setDoing(`${labelOf(job)} 가는 중`);
  }
  const PLACE_NAMES = { bed: '침대로', desk: '탁자로', shelf: '선반으로', flower: '화분으로', rug: '깔개로', corner: '방 구석으로' };
  const labelOf = job => PLACE_NAMES[job.spot];
  function arrive(onSpot) {
    const a = state.kid;
    const { spot } = state.job;
    state.job.phase = 'use';
    state.job.t = 0;
    state.job.step = 0;
    a.y = 0;
    if (spot.lie && onSpot) a.y = spot.y;
    else if (spot.lie && !state.job.job.steps[0].beside) hopOn();
    if (!spot.lie || onSpot) a.ry = spot.face;
    a.seatType = spot.seat || null;
    a.stepT = 0;
    setDoing(state.job.job.steps[0].label);
  }
  // 침대 옆에서 침대 위로 폴짝
  function hopOn() {
    const a = state.kid;
    a.hop = { t: 0, from: [a.x, a.z], ry: a.ry };
  }
  function leaveSpot() {
    const a = state.kid;
    if (!a) return;
    a.y = 0;
    a.hop = null;
    a.seatType = null;
    // 침대에서 내려올 때는 침대 옆으로
    if (state.job && state.job.spot && state.job.spot.lie) { a.x = state.job.spot.go[0]; a.z = state.job.spot.go[1]; }
  }
  function setDoing(text) {
    if (state.cur) state.cur.doing = text;
    if (state.cur && state.cur !== focusKid()) return;
    state.doing = text;
    for (const id of ['roomDoing', 'hudBubble']) {
      const e = $(id);
      if (e && e.textContent !== text) e.textContent = text;
    }
  }

  /* ---------- 한 프레임 ---------- */
  function animate(now, dt) {
    if (!state.on || !state.kids.length) return;
    const time = now / 1000;
    const chars = [];
    let lying = false;
    for (const k of state.kids) {
      state.cur = k; state.kid = k.a; state.job = k.job;
      const r = stepKid(time, dt);
      k.job = state.job;
      chars.push(r.c);
      if (k === focusKid()) lying = r.lying;
    }
    state.cur = null;
    if (state.mats) for (const [key, g] of Object.entries(state.mats)) g.visible = state.kids.some(k => k.job && k.job.spotKey === key);
    // 이불: 게임 Interiors가 '침대에서 자는 아이'를 보고 덮어 준다
    Interiors.update({ focus: { x: 0, z: 0 }, camera, sim: { chars }, time, dt });
    placeBubble(lying);
    tickClock();
  }
  function stepKid(time, dt) {
    const a = state.kid;
    let J = state.job;
    // 밤이 되면 하던 일을 그만두고 자러 간다. 아침이면 일어난다
    const sleeping = J.id === 'sleep' || J.id === 'sleepFloor';
    if (!sleeping && J.id !== 'nap' && night()) { startJob(pickJob()); J = state.job; }
    else if (sleeping && !night()) { startJob(pickJob()); J = state.job; }

    let clipId = 'idle_breathe';
    let step = null;
    if (a.hop) {
      // 침대로 폴짝: 0.6초 동안 옆에서 위로 (몸을 침대 쪽으로 돌리며)
      const { spot } = J;
      a.hop.t = Math.min(1, a.hop.t + dt / 0.6);
      const u = a.hop.t * a.hop.t * (3 - 2 * a.hop.t);
      a.x = a.hop.from[0] + (spot.at[0] - a.hop.from[0]) * u;
      a.z = a.hop.from[1] + (spot.at[1] - a.hop.from[1]) * u;
      a.y = spot.y * u + Math.sin(Math.PI * a.hop.t) * 0.55;
      a.ry = a.hop.ry + Math.atan2(Math.sin(spot.face - a.hop.ry), Math.cos(spot.face - a.hop.ry)) * u;
      clipId = 'idle_breathe';
      if (a.hop.t >= 1) { a.hop = null; a.y = spot.y; a.stepT = 0; }
    } else if (a.path.length) {
      // 걷기
      const [tx, tz] = a.path[0];
      const dx = tx - a.x, dz = tz - a.z;
      const d = Math.hypot(dx, dz);
      const mv = WALK_SPEED * dt;
      if (d <= mv) { a.x = tx; a.z = tz; a.path.shift(); if (!a.path.length) arrive(); }
      else {
        a.x += (dx / d) * mv;
        a.z += (dz / d) * mv;
        const want = Math.atan2(dx, dz);
        let dr = want - a.ry;
        dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        a.ry += dr * (1 - Math.exp(-dt * 10));
      }
      a.walkT += dt * 1.15;
      clipId = 'walk_lively';
    } else if (J.phase === 'use') {
      J.t += dt;
      if (J.step === 0 && a.stepT === 0 && J.spot.lie && !J.job.steps[0].beside && a.y === 0) hopOn();
      a.stepT += dt;
      step = J.job.steps[J.step];
      const clip = ANIMS[step.clip];
      // once 단계는 클립 한 번(+ 쉼) 뒤 다음 단계로
      const stepLen = step.once ? (clip ? clip.dur : 2) + 0.6 : Infinity;
      if (a.stepT > stepLen && J.step < J.job.steps.length - 1) {
        J.step++;
        a.stepT = 0;
        const prev = step;
        step = J.job.steps[J.step];
        setDoing(step.label);
        if (prev.beside && !step.beside && J.spot.lie) hopOn();
      }
      clipId = ANIMS[step.clip] ? step.clip : 'idle_breathe';
      // 단계가 방향을 정하면 그쪽으로 천천히 돈다 (책을 골라서 방 쪽으로 돌아서 읽기)
      if (step.ry !== undefined) a.ry += Math.atan2(Math.sin(step.ry - a.ry), Math.cos(step.ry - a.ry)) * (1 - Math.exp(-dt * 3));
      if (J.t > J.len) startJob(pickJob());
    }
    // 앉기: 0.7초에 걸쳐 앉고 일어난다
    const wantSeat = !a.path.length && a.seatType ? 1 : 0;
    a.seatAmt = Math.max(0, Math.min(1, a.seatAmt + Math.sign(wantSeat - a.seatAmt) * dt / 0.7));
    const seatEase = a.seatAmt * a.seatAmt * (3 - 2 * a.seatAmt);

    const r = a.built.root;
    // 앉는 자리는 좌면 높이까지 올라간다 (게임: 높이 = 좌석 면)
    r.position.set(a.x, a.y + (a.seatType && J.spot.y ? J.spot.y * seatEase : 0), a.z);
    r.rotation.y = a.ry;
    // 게임과 같은 순서: 기본 몸 → 클립 자세 (앉기 바탕 포함) → 소품
    a.built.animate(time, { speed: 0, phase: 0 });
    for (const arm of a.built.arms) if (arm.anchor) arm.anchor(0);
    const clip = ANIMS[clipId];
    const local = clipId === 'walk_lively' ? a.walkT % clip.dur
      : step && step.once ? Math.min(a.stepT, clip.dur - 0.001)
      : clip.loop ? time % clip.dur : (time % (clip.dur + 0.8));
    const pose = AnimRig.poseAt(a, clip, Math.min(local, clip.dur), { noSeat: a.seatAmt > 0 });
    if (a.seatAmt > 0) {
      const u = a.seatAmt * a.seatAmt * (3 - 2 * a.seatAmt);
      AnimRig.seatPose(pose, AnimRig.rigInfo(a.built, a.preset), a.seatType || 'stool', u);
    }
    delete pose.face;
    AnimRig.applyPose(a, pose);
    // 손 소품 (책·과자). 걸을 때는 빈손
    const hold = !a.path.length && step && step.prop ? step.prop : null;
    if (a.propKey !== hold) {
      VillageProps.detach(a.prop);
      a.prop = hold ? VillageProps.attach(a, hold) : null;
      a.propKey = hold;
    }
    // 표정: 자면 눈 감기, 즐거운 일은 기쁨
    const asleep = !a.path.length && !!(step && step.sleep);
    if (a.built.setEyesClosed) a.built.setEyesClosed(asleep);
    const face = asleep ? 'normal' : (step && step.face) || 'normal';
    if (a.face !== face) { a.face = face; a.built.setExpression(face); }
    const c = { id: state.cur.info.id, x: a.x, z: a.z, hidden: false };
    if (asleep && J.spotKey === 'bed') c.doing = { kind: 'obj', phase: 'use', x: { place: 'cottage', steps: [{ fx: 'futon.sleep', min: 1 }] }, step: 0, socket: { name: 'bed_lie' }, left: 0 };
    return { c, lying: asleep || (a.y > 0.4 && !a.hop) };
  }

  /* ---------- 말풍선·시계 ---------- */
  const head = new THREE.Vector3();
  // 말풍선 꼬리가 아이 머리 위를 가리킨다. 누워 있으면 머리가 낮다
  function placeBubble(lying) {
    const b = $('hudBubble');
    const fk = focusKid();
    const a = fk && fk.a;
    if (!b || !a || !b.textContent) { if (b) b.hidden = true; return; }
    a.built.root.getWorldPosition(head);
    head.y += lying ? 1.1 : (a.preset.footT + 0.8) * a.preset.scale;
    head.project(camera);
    const x = (head.x + 1) / 2 * window.innerWidth;
    const y = (1 - head.y) / 2 * window.innerHeight;
    const off = head.z > 1 || x < -40 || x > window.innerWidth + 40 || y < 0 || y > window.innerHeight;
    b.hidden = off;
    if (off) return;
    // 화면 밖으로 나가지 않게: 오른쪽 끝에서는 왼쪽으로 민다
    const w = b.offsetWidth || 160;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, x - 26));
    b.style.transform = `translate(${left}px, ${y - (b.offsetHeight || 36) - 12}px)`;
    b.style.setProperty('--tail', `${Math.max(12, Math.min(w - 26, x - left - 7))}px`);
  }
  let clockMin = -1;
  function tickClock() {
    const d = new Date();
    if (d.getMinutes() === clockMin) return;
    clockMin = d.getMinutes();
    const h = d.getHours();
    const e = $('hudClock');
    if (e) e.textContent = `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(clockMin).padStart(2, '0')}${night() ? ' · 밤' : ''}`;
  }

  /* ---------- 보는 거리 (확대): 0 = 방 전체, 1 = 아이 가까이 ---------- */
  // + / − 단추, 아이 따라가기, 마우스 휠, 두 손가락 벌리기, 두 번 누르기. 가까이 갈수록 아이를 가운데에 둔다
  const view = { z: 0, zc: 0, look: new THREE.Vector3(0, 0.6, 0.9), last: 0 };
  const setZoom = z => {
    view.z = Math.max(0, Math.min(1, z));
    const f = $('hudFollow');
    if (f) f.setAttribute('aria-pressed', String(view.z >= 0.99));
    if ($('hudIn')) $('hudIn').disabled = view.z >= 0.99;
    if ($('hudOut')) $('hudOut').disabled = view.z <= 0.01;
  };
  function aimCamera() {
    const w = window.innerWidth, h = window.innerHeight;
    const now = performance.now();
    const dt = Math.min(0.1, (now - (view.last || now)) / 1000);
    view.last = now;
    const k = 1 - Math.exp(-dt * 5);
    view.zc += (view.z - view.zc) * k;
    const t = Math.tan((camera.fov * Math.PI) / 360) * 2;
    // 방 전체: 위(이름표)와 아래(도크)를 뺀 칸에 방이 들어온다. 세로 화면은 옆 벽이 조금 잘려도 방이 크게 보이게
    const portrait = w / h < 0.8;
    const room = Math.min(48, Math.max((portrait ? 12.5 : 14.5) * h / (t * w), 12 * h / (t * Math.max(200, h - 170))));
    const near = portrait ? 10 : 8.6;
    const u = view.zc * view.zc * (3 - 2 * view.zc);
    const dist = room + (near - room) * u;
    // 세로 화면은 더 위에서 내려다봐야 바닥이 넓게 보인다
    const tilt = portrait ? 0.98 - 0.4 * u : 0.72 - 0.2 * u;
    // 보는 곳: 방 가운데 → 아이 (아이가 걸으면 부드럽게 따라간다)
    const fk = focusKid();
    const kid = fk ? fk.a.built.root.position : null;
    // 세로 화면은 옆이 좁아서, 조금만 다가가도 아이를 가로 가운데로 데려온다
    const tx = kid ? kid.x * (portrait ? Math.min(1, u * 3.5) : u) : 0;
    const ty = 0.6 + (kid ? (kid.y + 0.55) * u : 0);
    const tz = 0.9 + (kid ? (kid.z - 0.9) * u : 0);
    view.look.x += (tx - view.look.x) * Math.min(1, k * 1.6);
    view.look.y += (ty - view.look.y) * Math.min(1, k * 1.6);
    view.look.z += (tz - view.look.z) * Math.min(1, k * 1.6);
    camera.clearViewOffset();
    camera.position.set(view.look.x, view.look.y + dist * Math.sin(tilt), view.look.z + dist * Math.cos(tilt));
    camera.lookAt(view.look);
    camera.updateProjectionMatrix();
  }
  // 손가락·휠
  const fingers = new Map();
  let pinch0 = 0, zoom0 = 0, lastTap = 0;
  function onDown(e) {
    if (!state.on) return;
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (fingers.size === 2) {
      const [p, q] = [...fingers.values()];
      pinch0 = Math.hypot(p[0] - q[0], p[1] - q[1]);
      zoom0 = view.z;
    } else if (fingers.size === 1) {
      // 두 번 누르면 아이에게 다가가고, 다시 두 번 누르면 방 전체
      const t = performance.now();
      if (t - lastTap < 320) setZoom(view.z > 0.5 ? 0 : 1);
      lastTap = t;
      pickKid(e);
    }
    closeMore();
  }
  function onMove(e) {
    if (!state.on || !fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (fingers.size === 2 && pinch0 > 0) {
      const [p, q] = [...fingers.values()];
      setZoom(zoom0 + (Math.hypot(p[0] - q[0], p[1] - q[1]) - pinch0) / 260);
    }
  }
  // 아이를 누르면 그 아이를 본다 (카메라·말풍선·이름표). 조종은 하지 않는다
  const ray = new THREE.Raycaster();
  function pickKid(e) {
    if (state.kids.length < 2) return;
    const r = $('stage').getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    let best = -1, bd = Infinity;
    state.kids.forEach((k, i) => { const h = ray.intersectObject(k.a.built.root, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = i; } });
    if (best >= 0 && best !== state.focus) setFocus(best);
  }
  function setFocus(i) {
    state.focus = i;
    const k = focusKid();
    $('hudName').textContent = k.info.name;
    $('hudType').textContent = typeof mbtiLabel === 'function' && k.info.traits && k.info.traits.mbti ? mbtiLabel(k.info.traits) : '';
    state.doing = '';
    for (const id of ['roomDoing', 'hudBubble']) { const el2 = $(id); if (el2) el2.textContent = k.doing || ''; }
  }
  function onUp(e) { fingers.delete(e.pointerId); if (fingers.size < 2) pinch0 = 0; }
  function onWheel(e) {
    if (!state.on) return;
    e.preventDefault();
    setZoom(view.z - e.deltaY * 0.0016);
  }
  let inputReady = false;
  function bindInput() {
    if (inputReady) return;
    inputReady = true;
    const cv = $('stage');
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    $('hudIn').onclick = () => setZoom(view.z + 0.34);
    $('hudOut').onclick = () => setZoom(view.z - 0.34);
    $('hudFollow').onclick = () => setZoom(view.z >= 0.99 ? 0 : 1);
    // 도크: 원래 방 판의 단추를 그대로 누른다 (하는 일은 birth.js enterRoom이 정한다)
    $('hudPhoto').onclick = () => $('roomPhoto').click();
    $('hudGallery').onclick = () => $('roomGallery').click();
    $('hudEdit').onclick = () => $('roomEdit').click();
    $('hudMore').onclick = () => (document.body.classList.contains('moreopen') ? closeMore() : openMore());
    $('roomClose').onclick = closeMore;
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMore(); });
  }
  function openMore() { document.body.classList.add('moreopen'); $('hudMore').setAttribute('aria-expanded', 'true'); }
  function closeMore() { document.body.classList.remove('moreopen'); const m = $('hudMore'); if (m) m.setAttribute('aria-expanded', 'false'); }

  /* ---------- 들어가기·나가기 ---------- */
  async function enter(me) {
    state.me = me;
    state.on = true;
    document.body.classList.add('inhouse');
    closeMore();
    bindInput();
    $('roomHud').hidden = false;
    $('hudName').textContent = me.resident.name;
    $('hudType').textContent = typeof mbtiLabel === 'function' && me.traits && me.traits.mbti ? mbtiLabel(me.traits) : '';
    clockMin = -1;
    tickClock();
    // 세로 화면(휴대폰)은 방이 작게 보이므로 처음부터 아이 쪽으로 조금 다가가 있다
    setZoom(window.innerWidth / window.innerHeight < 0.8 ? 0.35 : 0);
    view.zc = view.z;
    view.look.set(0, 0.6, 0.9);
    setDoing('집에 들어가는 중…');
    await loadFiles();
    if (!state.on || state.me !== me) return;
    if (!state.built || state.seed !== me.resident.id) { buildHouse(me.resident.id); state.built = true; state.seed = me.resident.id; }
    state.root.visible = true;
    const list = await housemates(me);
    if (!state.on || state.me !== me) return;
    removeKids();
    state.kids = list.map(info => ({ info, a: buildKid(info), job: null, doing: '' }));
    state.focus = 0;
    if (typeof actor !== 'undefined' && actor) actor.root.visible = false;
    ground.visible = false;
    // 들어오면 이미 무언가 하고 있다 (밤이면 자고 있다). 한 명씩 자리를 정해야 겹치지 않는다
    for (const k of state.kids) { state.cur = k; state.kid = k.a; state.job = null; startJob(pickJob(), true); k.job = state.job; }
    state.cur = null;
    setFocus(0);
  }
  function removeKids() {
    for (const k of state.kids) { VillageProps.detach(k.a.prop); state.root.remove(k.a.built.root); }
    state.kids = [];
    state.kid = null;
  }
  function leave() {
    if (!state.on) return;
    state.on = false;
    document.body.classList.remove('inhouse');
    closeMore();
    $('roomHud').hidden = true;
    fingers.clear();
    if (state.root) state.root.visible = false;
    removeKids();
    if (typeof actor !== 'undefined' && actor) actor.root.visible = true;
    ground.visible = true;
  }
  // _start: 점검용 (보고 있는 아이에게 할 일 하나를 바로 시킨다)
  const _start = (id, instant) => { const k = focusKid(); state.cur = k; state.kid = k.a; state.job = k.job; startJob(id, instant); k.job = state.job; state.cur = null; };
  return { enter, leave, animate, aimCamera, setZoom, setFocus, state, view, JOBS, _start, get on() { return state.on; } };
})();
