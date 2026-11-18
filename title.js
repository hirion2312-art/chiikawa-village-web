'use strict';
// 먼작귀 빌리지 선공개 — 첫 화면 마을 (2026-11-18)
// 이재헌님 결정: 실제 게임 마을 맵을 띄워 만들어진 아이들을 풀어 놓고, 카메라가 한 명씩 8초 따라간다.
//  - 마을은 광장 주변만 (첫 로딩을 가볍게): 게임 world.js의 장소 목록에서 광장 근처만 남겨 buildWorld로 세운다
//  - 아이들: 최근에 만든 아이들(서버 /api/kids/recent). 모자라면 원작 친구들로 채운다
//  - 아이들은 광장 둘레 걸을 수 있는 땅을 골라 걸어가고, 도착하면 잠깐 쉰다 (게임 동작 클립 그대로)
//  - 카메라: 한 아이 뒤를 8초 따라가다 다음 아이로 부드럽게 넘어간다. 화면 아래 이름표를 누르면 아이 카드
// birth.js의 renderer를 같이 쓰고, 마을은 따로 둔 장면(scene)에 세운다 (다른 화면에 섞이지 않게)
const TitleVillage = (() => {
  const FILES = ['glb-loader.js', 'glb-world.js', 'world.js', 'polish.js', 'world-art.js', 'world-town.js', 'sockets.js',
    'interiors.js', 'interiors-places.js', 'interiors-auto.js',
    'anims.js', 'anims/props.js', 'anim-rig.js', 'anims-base.js', 'anims-sims.js', 'village-props.js', 'anims-real.js', 'ramen-kitchen.js'];
  const NEAR = p => p.id === 'plaza' || (Math.abs(p.x) <= 135 && Math.abs(p.z) <= 95 && p.id !== 'streetScape');
  const CENTER = { x: 0, z: 4 };
  const ROAM = 32;                 // 광장 가운데에서 이만큼 안을 돌아다닌다
  const FOLLOW_SEC = 8;
  const FRIENDS = ['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju', 'rakko', 'shisa', 'furuhonya'];
  const IDLE = ['idle_look', 'idle_stretch', 'idle_hum', 'idle_breathe', 'wave', 'jump_joy', 'idle_fidget'];
  const state = { on: false, ready: false, loading: null, scene: null, camera: null, world: null, kids: [], star: 0, starT: 0, look: null, yaw: 0.6 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- 마을 세우기 (한 번만) ---------- */
  async function build() {
    for (const f of FILES) await loadOnce(f);
    // 광장 근처 장소만 남긴다 (먼 곳은 짓지 않는다)
    for (let i = PLACES.length - 1; i >= 0; i--) if (!NEAR(PLACES[i])) PLACES.splice(i, 1);
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0xcfeaf4);
    sc.fog = new THREE.Fog(0xe4f2ee, 70, 190);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xfff0d8, 2.35));
    const sun = new THREE.DirectionalLight(0xfff8ec, 1.05);
    sun.position.set(60, 120, 80);
    sc.add(sun);
    state.world = buildWorld(sc, renderer);
    await (window.GLB_DONE || Promise.resolve());
    trim(sc);
    state.scene = sc;
    state.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 260);
  }

  // 섬 전체 땅(1200×1200, 46만 면)과 섬 곳곳의 나무까지 그리면 휴대폰이 버겁다 (검수 2026-11-18: 한 화면 193만 면).
  // 광장 둘레 사각형만 남긴다: 땅은 그 부분만 새로 만들고(같은 높이·같은 지도 그림), 밖에 있는 덩어리는 장면에서 뺀다
  const KEEP = { x0: -175, x1: 175, z0: -140, z1: 140 };
  function trim(sc) {
    const ground = sc.children.find(o => o.isMesh && o.geometry.type === 'PlaneGeometry' && o.material.map && o.geometry.parameters.width >= 1000);
    if (ground) {
      const W = KEEP.x1 - KEEP.x0, D = KEEP.z1 - KEEP.z0, half = ground.geometry.parameters.width / 2;
      const geo = new THREE.PlaneGeometry(W, D, Math.round(W / 2.5), Math.round(D / 2.5));
      geo.rotateX(-Math.PI / 2);
      geo.translate((KEEP.x0 + KEEP.x1) / 2, 0, (KEEP.z0 + KEEP.z1) / 2);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, heightAt(x, z));
        uv.setXY(i, (x + half) / (half * 2), (half - z) / (half * 2));
      }
      geo.computeVertexNormals();
      const small = new THREE.Mesh(geo, ground.material);
      sc.remove(ground);
      ground.geometry.dispose();
      sc.add(small);
    }
    const box = new THREE.Box3();
    for (const o of [...sc.children]) {
      if (o.isLight || o === ground) continue;
      box.setFromObject(o);
      if (box.isEmpty()) continue;
      // 밖에 걸친 숲 덩어리(100칸 넘는 나무 묶음)는 가운데가 사각형 밖이면 뺀다
      const c = box.getCenter(new THREE.Vector3());
      const out = box.max.x < KEEP.x0 || box.min.x > KEEP.x1 || box.max.z < KEEP.z0 || box.min.z > KEEP.z1
        || c.x < KEEP.x0 + 25 || c.x > KEEP.x1 - 25 || c.z < KEEP.z0 + 25 || c.z > KEEP.z1 - 25;
      if (out) sc.remove(o);
    }
  }

  /* ---------- 아이들 ---------- */
  const walkable = (x, z) => state.world.isWalkable(x, z) && Math.abs(state.world.floorAt(x, z) - state.world.floorAt(CENTER.x, CENTER.z)) < 3;
  function freeSpot() {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * ROAM;
      const p = { x: CENTER.x + Math.cos(a) * r, z: CENTER.z + Math.sin(a) * r };
      if (!walkable(p.x, p.z)) continue;
      const q = { x: p.x, z: p.z };
      state.world.collide(q, 0.8);
      if (Math.hypot(q.x - p.x, q.z - p.z) < 0.05) return p;   // 건물 안이 아니다
    }
    return { x: CENTER.x + rnd(-8, 8), z: CENTER.z + rnd(-8, 8) };
  }
  function makeKid(info) {
    const preset = info.look ? presetFromLook(info.look) : { ...characterEntry(info.friend).preset };
    const built = buildCharacter(preset, { faceWidth: 256 });
    const p = freeSpot();
    const a = {
      info, built, preset, c: { id: info.id || info.friend }, offset: Math.random() * 10, prop: null,
      base: { position: built.model.position.clone(), rotation: built.model.rotation.clone(), scale: built.model.scale.clone() },
      x: p.x, z: p.z, ry: rnd(0, 6.28), target: null, rest: rnd(0.5, 3), clip: pickIdle(), clipT: 0, walkT: 0, speed: rnd(2.6, 3.4),
    };
    built.root.position.set(a.x, state.world.floorAt(a.x, a.z), a.z);
    state.scene.add(built.root);
    return a;
  }
  const pickIdle = () => { const id = IDLE[Math.floor(Math.random() * IDLE.length)]; return ANIMS[id] ? id : 'idle_breathe'; };
  async function populate() {
    let list = [];
    try { list = ((await (await fetch(`${window.VILLAGE_API || ''}/api/kids/recent?limit=12`)).json()).kids || []).map(k => ({ ...k })); } catch (e) { /* 없으면 친구들만 */ }
    // 7명이 될 때까지 원작 친구들로 채운다
    for (const f of FRIENDS) { if (list.length >= 7) break; list.push({ friend: f, name: characterEntry(f).label }); }
    // 원작 친구가 섞이면 얼굴을 다 받은 뒤 세운다 (안 그러면 쿠리만쥬·랏코가 치이카와 얼굴로 굳는다)
    if (list.some(k => k.friend)) await ensureAllFaces().catch(() => null);
    state.kids = list.map(makeKid);
    state.star = 0;
    state.starT = 0;
    showStar();
  }
  function stepKid(a, dt, time) {
    if (!a.target) {
      a.rest -= dt;
      a.clipT += dt;
      if (a.rest <= 0) { a.target = freeSpot(); a.walkT = 0; }
    } else {
      const dx = a.target.x - a.x, dz = a.target.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { a.target = null; a.rest = rnd(2.5, 6); a.clip = pickIdle(); a.clipT = 0; }
      else {
        const mv = Math.min(d, a.speed * dt);
        const q = { x: a.x + dx / d * mv, z: a.z + dz / d * mv };
        state.world.collide(q, 0.7);
        // 막히면 다른 곳으로
        if (Math.hypot(q.x - a.x, q.z - a.z) < mv * 0.3) a.target = freeSpot();
        a.x = q.x; a.z = q.z;
        const want = Math.atan2(dx, dz);
        a.ry += Math.atan2(Math.sin(want - a.ry), Math.cos(want - a.ry)) * (1 - Math.exp(-dt * 8));
        a.walkT += dt * a.speed / 2.9;
      }
    }
    const r = a.built.root;
    r.position.set(a.x, state.world.floorAt(a.x, a.z), a.z);
    r.rotation.y = a.ry;
    a.built.animate(time, { speed: 0, phase: 0 });
    const id = a.target ? 'walk_lively' : a.clip;
    const clip = ANIMS[id] || ANIMS.idle_breathe;
    const t = a.target ? a.walkT % clip.dur : clip.loop ? (time + a.offset) % clip.dur : Math.min(a.clipT, clip.dur - 0.001);
    const pose = AnimRig.poseAt(a, clip, t, {});
    delete pose.face;
    AnimRig.applyPose(a, pose);
  }

  /* ---------- 카메라: 한 명씩 8초 ---------- */
  function showStar() {
    const a = state.kids[state.star];
    const card = $('titleWho');
    if (!a || !card) return;
    $('titleWhoName').textContent = a.info.name;
    $('titleWhoType').textContent = a.info.mbti ? `${a.info.mbti} · ${(typeof MBTI_NAME !== 'undefined' && MBTI_NAME[a.info.mbti]) || ''}` : a.info.friend ? '원작 친구' : '';
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    card.disabled = !a.info.id;
  }
  function aim(dt) {
    const a = state.kids[state.star];
    if (!a) return;
    const w = window.innerWidth, h = window.innerHeight;
    const cam = state.camera;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    const k = 1 - Math.exp(-dt * (w / h < 0.8 ? 3.6 : 2.2));   // 휴대폰은 가까이 붙으니 더 빨리 따라간다
    const tgt = new THREE.Vector3(a.x, a.built.root.position.y + 1.1, a.z);
    if (!state.look) state.look = tgt.clone();
    state.look.lerp(tgt, k);
    // 카메라는 광장 바깥쪽에 서서 아이 너머로 광장·가게를 본다 (가운데 가까우면 아이 얼굴 쪽에서). 천천히 돈다
    const out = Math.hypot(a.x - CENTER.x, a.z - CENTER.z);
    const want = out > 6 ? Math.atan2(a.x - CENTER.x, a.z - CENTER.z) + 0.35 : a.ry + 0.55;
    state.yaw += Math.atan2(Math.sin(want - state.yaw), Math.cos(want - state.yaw)) * (1 - Math.exp(-dt * 0.7));
    const portrait = w / h < 0.8;
    // 휴대폰(세로)은 아이에게 더 바짝 붙어 따라간다 (2026-11-18 이재헌님)
    const dist = portrait ? 10.5 : 17, pitch = portrait ? 0.2 : 0.34;
    cam.position.set(state.look.x + Math.sin(state.yaw) * Math.cos(pitch) * dist, state.look.y + Math.sin(pitch) * dist, state.look.z + Math.cos(state.yaw) * Math.cos(pitch) * dist);
    // 위에는 로고, 아래에는 단추가 있으니 아이는 그 사이 (PC는 조금 아래, 휴대폰은 가운데보다 조금 위)
    cam.lookAt(state.look.x, state.look.y + (portrait ? 0.55 : 1.6), state.look.z);
  }

  /* ---------- 한 프레임 ---------- */
  function animate(now, dt) {
    if (!state.on || !state.ready) return false;
    const time = now / 1000;
    for (const a of state.kids) stepKid(a, dt, time);
    state.starT += dt;
    if (state.starT > FOLLOW_SEC && state.kids.length > 1) {
      state.starT = 0;
      state.star = (state.star + 1) % state.kids.length;
      showStar();
    }
    aim(dt);
    renderer.render(state.scene, state.camera);
    return true;
  }


  /* ---------- 타이틀 로고: 게임 로고(먼작귀 VILLEAGE, 이재헌님 제공)를 다듬는다 ----------
     검은 바탕을 부드럽게 지우고, 글자 전체에 갈색 먹선 테두리 + 흰 스티커 테두리 + 아래 그림자를 두른다 */
  function logo() {
    return new Promise(ok => {
      const src = new Image();
      src.onload = () => {
        const W = src.width, H = src.height;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d'); g.drawImage(src, 0, 0);
        const d = g.getImageData(0, 0, W, H), px = d.data;
        let x0 = W, x1 = 0, y0 = H, y1 = 0;
        for (let i = 0; i < px.length; i += 4) {
          const m = Math.max(px[i], px[i + 1], px[i + 2]);
          px[i + 3] = Math.min(255, Math.max(0, (m - 18) * 2.4));
          if (m > 40) { const k = i / 4, x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        g.putImageData(d, 0, 0);
        const P = 34, ow = x1 - x0 + P * 2, oh = y1 - y0 + P * 2;
        // 글자 모양을 한 가지 색으로 칠한 판
        const tint = color => { const t = document.createElement('canvas'); t.width = W; t.height = H; const tg = t.getContext('2d'); tg.drawImage(c, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = color; tg.fillRect(0, 0, W, H); return t; };
        const ring = (og, img, r, n) => { for (let a = 0; a < n; a++) og.drawImage(img, -x0 + P + Math.cos(a / n * Math.PI * 2) * r, -y0 + P + Math.sin(a / n * Math.PI * 2) * r); };
        const out = document.createElement('canvas'); out.width = ow; out.height = oh;
        const og = out.getContext('2d');
        const ink = tint('#4a3230'), white = tint('#fffaf1');
        og.globalAlpha = 0.28; og.drawImage(ink, -x0 + P + 2, -y0 + P + 16); og.globalAlpha = 1;   // 아래 그림자
        ring(og, white, 22, 28);       // 흰 스티커 테두리
        ring(og, ink, 11, 24);         // 갈색 먹선
        og.drawImage(c, -x0 + P, -y0 + P);
        ok(out.toDataURL('image/png'));
      };
      src.onerror = () => ok(null);
      src.src = window.TITLE_LOGO_SRC || '';
    });
  }
  let logoDone = null;
  function showLogo() {
    if (!logoDone) logoDone = loadOnce('title-logo.js').then(logo).catch(() => null);
    logoDone.then(url => { const im = $('titleLogo'); if (url && im) { im.src = url; im.hidden = false; } });
  }

  /* ---------- 들어가기·나가기 ---------- */
  async function enter() {
    state.on = true;
    document.body.classList.add('titling');
    showLogo();
    if (window.LOW_SPEC) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); fit(); }
    if (!state.loading) state.loading = build().then(populate).then(() => { state.ready = true; });
    try { await state.loading; } catch (e) { console.warn('[첫 화면 마을]', e); state.failed = true; document.body.classList.remove('titling'); return false; }
    if (!state.on) return true;
    document.body.classList.add('titleready');
    return true;
  }
  function leave() {
    state.on = false;
    if (window.LOW_SPEC) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); fit(); }
    document.body.classList.remove('titling', 'titleready');
  }
  function openStar() {
    const a = state.kids[state.star];
    if (a && a.info.id && typeof Plaza !== 'undefined' && Plaza.openCard) Plaza.openCard({ id: a.info.id, name: a.info.name, mbti: a.info.mbti, look: a.info.look });
  }
  function next() { if (state.kids.length) { state.star = (state.star + 1) % state.kids.length; state.starT = 0; showStar(); } }
  return { enter, leave, animate, openStar, next, state, get on() { return state.on; }, get ready() { return state.ready && state.on; } };
})();
