'use strict';
// 온라인 마을 연결. game.js가 만드는 시뮬레이션을 "서버가 보낸 대로 움직이는 거울"로 바꿔치기한다.
// 그림·애니메이션·실내 연출은 게임 코드를 그대로 쓴다
(function () {
  const TOKEN_KEY = 'mogukawa-village-token';
  const API = window.VILLAGE_API || '';           // 마을 서버 주소 (웹사이트에서는 무료 서버, 로컬에서는 같은 서버)
  const DELAY = 900;            // 받은 위치 두 개 사이를 이어 그리려고 이만큼 늦게 보여 준다 (ms)
  const SNAP = 8;               // 이보다 멀리 뛰면 순간이동으로 친다 (배, 집 들어가기)

  /* 내 아이의 생김새: 게임이 원작 캐릭터를 찾는 자리에 끼워 넣는다 */
  const roster = {};
  const originalEntry = window.characterEntry;
  window.characterEntry = id => {
    const r = roster[id];
    if (!r) return originalEntry(id);
    return { ...originalEntry('chiikawa'), id, name: r.name, preset: presetFromLook(r.look) };
  };

  const tracks = new Map();     // id → [{t,x,z,h,angle}, …]
  let mirror = null;
  const pending = { state: null };

  const liveStates = {};        // 장면을 보는 동안에도 최신 상태를 모아 둔다
  let heldWorld = null;
  const replay = { on: false, queue: [], ev: null, t0: 0, total: 0 };

  function applyState(id, st) {
    const c = mirror.chars.find(x => x.id === id);
    if (!c) return;
    const { doing, ...plain } = st;
    Object.assign(c, plain);
    if (!doing) { c.doing = null; return; }
    const known = mirror.interactions.find(i => i.id === doing.id);
    const x = known || { id: doing.id, name: doing.name, place: doing.place, steps: [] };
    const spots = doing.sockPlace && mirror.sockets[doing.sockPlace];
    c.doing = {
      kind: doing.kind, x, step: doing.step, phase: doing.phase,
      socket: (spots && spots[doing.sock]) || null,
      with: doing.with ? mirror.chars.find(o => o.id === doing.with) : undefined,
      left: 1, total: 1,
    };
  }
  function rebuild(id) {
    const a = window.game && window.game.actors && window.game.actors.find(q => q.c.id === id);
    if (a) a.isMonster = !a.c.monster;      // 다음 프레임에 게임이 몸을 다시 만든다
  }

  function onRoster(list) {
    for (const [id, r] of Object.entries(list)) {
      const same = roster[id] && JSON.stringify(roster[id]) === JSON.stringify(r);
      roster[id] = r;
      if (mirror) {
        const c = mirror.chars.find(x => x.id === id);
        if (c) Object.assign(c, { name: r.name, extra: false, adopted: true });
      }
      if (!same) rebuild(id);
    }
  }
  // 서버는 분 단위 시각만 준다. 분이 바뀌는 간격을 재서 그 사이를 실제 시간으로 메운다 (주고받기처럼 짧은 움직임용)
  const clock = { base: 0, at: 0, rate: 0.2 };
  function setClock(day, clockText) {
    const [hh, mm] = clockText.split(':').map(Number);
    const m = (day - 1) * 1440 + hh * 60 + mm;
    const now = performance.now() / 1000;
    if (m !== mirror.minutes && clock.at && m > clock.base) clock.rate = clock.rate * 0.7 + Math.min(2, (m - clock.base) / Math.max(0.05, now - clock.at)) * 0.3;
    if (m !== mirror.minutes) { clock.base = m; clock.at = now; }
    mirror.minutes = m;
    mirror.day = day;
    if (!mirror.smoothMinutes) mirror.smoothMinutes = () => clock.base + Math.min(1.5, (performance.now() / 1000 - clock.at) * clock.rate);
  }
  function onHand(list) {
    if (!mirror) return;
    const now = mirror.smoothMinutes ? mirror.smoothMinutes() : mirror.minutes;
    mirror.handoffs = (mirror.handoffs || []).filter(h => now < h.t0 + h.dur + 0.6);
    for (const h of list) mirror.handoffs.push({ ...h, t0: now - (h.ago || 0) });
  }
  function onWorld(w) {
    const t = performance.now();
    // 위치 기록은 계속 쌓되, 장면을 보는 동안 주민의 모습은 건드리지 않는다
    if (replay.on) heldWorld = w;
    else setClock(w.day, w.clock);
    for (const [id, x, z, h, angle, clip, walking, hidden] of w.c) {
      const c = mirror.chars.find(q => q.id === id);
      if (!c) continue;
      let list = tracks.get(id);
      if (!list) tracks.set(id, list = []);
      list.push({ t, x, z, h, angle });
      if (list.length > 8) list.shift();
      if (replay.on) continue;
      c.walking = !!walking;
      c.hidden = !!hidden;
      c.clip = clip;
    }
  }

  /* ---------- 없는 동안의 장면 재생 ---------- */

  const FRAME = 0.5;            // 기록 간격 (초)
  const HOLD = 1.6;             // 마지막 장면에서 잠깐 멈춘다 (초)
  const token = () => (window.VillageAuth ? VillageAuth.current() : (() => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } })());

  function buildDoing(d) {
    if (!d) return null;
    const [kind, id, phase, sockPlace, sock, step] = d;
    const x = mirror.interactions.find(i => i.id === id) || { id, name: '', place: sockPlace || '', steps: [] };
    const spots = sockPlace && mirror.sockets[sockPlace];
    return { kind, x, phase, step, socket: (spots && spots[sock]) || null, left: 1, total: 1 };
  }
  function applyFrames(now) {
    const ev = replay.ev;
    const frames = ev.scene.frames;
    const t = (now - replay.t0) / 1000;
    if (t > frames[frames.length - 1].t + HOLD) { nextScene(); return; }
    const i = Math.min(frames.length - 1, Math.floor(t / FRAME));
    const a = frames[i];
    const b = frames[Math.min(frames.length - 1, i + 1)];
    const k = Math.max(0, Math.min(1, t / FRAME - i));
    for (const c of mirror.chars) {
      const ra = a.c.find(r => r[0] === c.id);
      if (!ra) { c.hidden = true; c.walking = false; continue; }
      const rb = b.c.find(r => r[0] === c.id) || ra;
      const jump = Math.hypot(rb[1] - ra[1], rb[2] - ra[2]) > SNAP;
      const q = jump ? 1 : k;
      c.hidden = false;
      c.x = ra[1] + (rb[1] - ra[1]) * q;
      c.z = ra[2] + (rb[2] - ra[2]) * q;
      c.h = ra[3] + (rb[3] - ra[3]) * q;
      c.angle = ra[4];
      c.ox = 0;
      c.oz = 0;
      c.clip = ra[5];
      c.walking = !!ra[6];
      c.act = ra[7] || null;
      c.doing = buildDoing(ra[8]);
      c.prop = ra[9] || null;
      c.moveClip = null;
      c.seating = false;
    }
  }
  function endReplay() {
    replay.on = false;
    replay.ev = null;
    replay.queue = [];
    document.body.classList.remove('replaying');
    const bar = document.getElementById('replayBar');
    if (bar) bar.hidden = true;
    for (const [id, st] of Object.entries(liveStates)) applyState(id, st);
    if (heldWorld) onWorld(heldWorld);
    heldWorld = null;
    history.replaceState(null, '', location.pathname);
    const g = window.game;
    if (g && mine) {
      g.setSelected(mine);
      g.setFollow(true);
    }
    if (g && savedView) Object.assign(g.view, savedView);
  }
  let savedView = null;
  let mine = null;
  async function nextScene() {
    const id = replay.queue.shift();
    if (id === undefined) { endReplay(); return; }
    replay.ev = null;
    let ev = null;
    try {
      const res = await fetch(`${API}/api/events/${id}`, { headers: { authorization: `Bearer ${token()}` } });
      if (res.ok) ev = await res.json();
    } catch (e) { /* 아래에서 다음 장면으로 넘어간다 */ }
    if (!replay.on) return;            // 기다리는 사이에 그만 보기를 눌렀다
    if (!ev || !ev.scene.frames.length) { nextScene(); return; }
    replay.ev = ev;
    replay.t0 = performance.now();
    setClock(ev.day, ev.clock);
    const g = window.game;
    const hero = ev.scene.who.find(w => ev.scene.cast[w]) || Object.keys(ev.scene.cast)[0];
    if (hero) {
      g.setSelected(hero);
      g.setFollow(true);
    }
    if (ev.scene.focus) Object.assign(g.view, { x: ev.scene.focus.x, z: ev.scene.focus.z, dist: 15, pitch: 0.34 });
    document.getElementById('replayCount').textContent = `${replay.total - replay.queue.length} / ${replay.total}`;
    document.getElementById('replayText').textContent = `${ev.day}일째 ${ev.clock} · ${ev.text}`;
  }
  function startReplay(ids) {
    const g = window.game;
    if (!ids.length || !token()) return;
    savedView = { dist: g.view.dist, pitch: g.view.pitch };
    replay.on = true;
    replay.queue = ids;
    replay.total = ids.length;
    document.body.classList.add('replaying');
    document.getElementById('replayBar').hidden = false;
    nextScene();
  }
  function onVitals(v) {
    for (const [id, o] of Object.entries(v)) {
      const c = mirror.chars.find(q => q.id === id);
      if (c) { Object.assign(c.needs, o.needs); c.money = o.money; }
    }
  }

  function place(c, list, now) {
    const at = now - DELAY;
    let a = list[0];
    let b = list[list.length - 1];
    for (let i = 0; i < list.length - 1; i++) {
      if (list[i].t <= at && list[i + 1].t >= at) { a = list[i]; b = list[i + 1]; break; }
    }
    const jump = Math.hypot(b.x - a.x, b.z - a.z) > SNAP;
    const k = jump || b.t === a.t ? 1 : Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t)));
    c.x = a.x + (b.x - a.x) * k;
    c.z = a.z + (b.z - a.z) * k;
    c.h = a.h + (b.h - a.h) * k;
    c.angle = b.angle;
    c.ox = 0;
    c.oz = 0;
  }

  /* ---------- 가볍게 띄우기 ---------- */

  // 길은 서버가 찾으므로 화면 쪽 길 지도는 만들지 않는다 (로딩의 대부분을 차지했다).
  // 이 자리에 남는 건 게임 코드가 부르는 이름뿐이다
  const noNav = {
    stats: {}, links: [], raycastable: [], reachCount: 0,
    flood() {}, free: () => true, cellOf: () => 0, center: () => ({ x: 0, z: 0 }), surface: () => 0, isBlocked: () => false,
    approach: s => ({ x: s.x, z: s.z, seatIn: false }), measure: () => 0, nearestFree: () => 0, route: () => null,
    setAvoid() {}, ray: { set() {}, intersectObjects: () => [] },
  };
  window.VillageNav.build = () => noNav;

  // 앉는 자리·서는 자리는 서버 쪽 계산 결과를 받는다. 마을을 다 지은 뒤 시뮬레이션을 만들기 전에 도착해야 한다
  const worldReady = fetch(window.CLIENT_WORLD_URL || `${API}/api/client-world`).then(r => r.json());
  let loaded = null;
  worldReady.then(w => { loaded = w; });
  let glbDone = null;
  Object.defineProperty(window, 'GLB_DONE', {
    configurable: true,
    get: () => glbDone && Promise.all([glbDone, worldReady]),
    set: v => { glbDone = v; },
  });

  // 핸드폰: 그림자·계단 현상 보정을 끄고 해상도와 얼굴 텍스처를 낮춘다
  const LOW = !!window.LOW_SPEC;
  if (LOW) {
    const Renderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = function (o) {
      const r = new Renderer({ ...o, antialias: false });
      const setRatio = r.setPixelRatio.bind(r);
      r.setPixelRatio = v => setRatio(Math.min(v, 1.25));
      Object.defineProperty(r.shadowMap, 'enabled', { get: () => false, set() {} });
      return r;
    };
    const build = window.buildCharacter;
    window.buildCharacter = (p, o = {}) => build(p, { ...o, faceWidth: Math.min(o.faceWidth || 2048, 256) });
  }

  const Real = window.Village.Village;
  class Mirror extends Real {
    constructor(world, opts) {
      super(world, { ...opts, nav: null });
      this.nav = opts.nav;
      this.sockets = loaded.sockets;
      mirror = this;
      this.speed = 1;
      connect();
    }
    update() {
      const now = performance.now();
      if (replay.on) {
        if (replay.ev) applyFrames(now);
        return;
      }
      for (const c of this.chars) {
        const list = tracks.get(c.id);
        if (list && list.length) place(c, list, now);
      }
    }
    load() { return false; }
    save() { return '{}'; }
    order() {}
    abort() {}
    options() { return []; }
  }
  window.Village = { ...window.Village, Village: Mirror };

  function connect() {
    const es = new EventSource(`${API}/api/stream`);
    const on = (type, fn) => es.addEventListener(type, e => fn(JSON.parse(e.data)));
    on('roster', onRoster);
    on('world', w => { lost(false); onWorld(w); });
    on('state', s => {
      for (const [id, st] of Object.entries(s)) {
        liveStates[id] = st;
        if (!replay.on) applyState(id, st);
      }
    });
    on('vitals', onVitals);
    on('hand', onHand);
    on('event', e => { toast(`${e.day}일째 ${e.clock} · ${e.text}`); });
    es.onerror = () => lost(true);       // EventSource가 알아서 다시 붙는다
  }

  /* 화면 조각 */
  function lost(on) { const n = document.getElementById('onlineLost'); if (n) n.hidden = !on; }
  let toastTimer = 0;
  function toast(text) {
    const n = document.getElementById('onlineToast');
    if (!n) return;
    n.textContent = text;
    n.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { n.hidden = true; }, 6000);
  }

  // 두 손가락으로 벌리면 가까이, 오므리면 멀리
  function pinchZoom(g) {
    const canvas = g.renderer.domElement;
    const touches = new Map();
    let last = 0;
    const gap = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const opts = { capture: true };
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) last = gap();
    }, opts);
    canvas.addEventListener('pointermove', e => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size < 2) return;
      e.stopImmediatePropagation();          // 두 손가락일 때는 화면을 돌리지 않는다
      const now = gap();
      if (last > 0 && now > 0) g.view.dist = Math.max(8, Math.min(140, g.view.dist * (last / now)));
      last = now;
    }, opts);
    const up = e => touches.delete(e.pointerId);
    canvas.addEventListener('pointerup', up, opts);
    canvas.addEventListener('pointercancel', up, opts);
  }

  // 타이틀 없이 바로 마을로 들어가 내 아이를 따라간다
  window.TitleScreen = {
    start(g) {
      const bar = document.createElement('div');
      bar.id = 'onlineBar';
      bar.setAttribute('aria-label', '마을 버튼');
      // 버튼 모양: <b>선 그림</b>글자 (핸드폰에서는 둥근 버튼에 그림만, 글자는 읽어 주기용 이름으로)
      const ICON = {
        follow: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="13" cy="13" r="9"/><circle cx="13" cy="13" r="3.5" fill="currentColor"/></svg>',
        news: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 5h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM22 5h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/></svg>',
        list: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 8h12M8 13h12M8 18h8"/></svg>',
        make: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M13 6v14M6 13h14"/></svg>',
      };
      const btn = (tag, icon, text, props = {}) => {
        const n = document.createElement(tag);
        if (tag === 'button') n.type = 'button';
        Object.assign(n, props);
        n.setAttribute('aria-label', text);
        const b = document.createElement('b');
        b.innerHTML = ICON[icon];                     // 위 표의 고정 그림만 넣는다
        b.setAttribute('aria-hidden', 'true');
        n.append(b, document.createTextNode(text));
        return n;
      };
      const followBtn = btn('button', 'follow', '내 아이 따라가기', { id: 'followBtn', title: '내 아이를 따라가요' });
      followBtn.onclick = () => { if (!mine) return; g.setSelected(mine); g.setFollow(true); g.view.dist = Math.min(g.view.dist, 34); };
      const panelBtn = btn('button', 'list', '상태', { id: 'panelBtn', title: '내 아이 상태' });
      panelBtn.setAttribute('aria-expanded', 'false');
      panelBtn.onclick = () => togglePanel();
      const homeBtn = btn('a', 'news', '소식', { href: '/', title: '내 아이 소식' });
      const makeBtn = btn('a', 'make', '아이 만들기', { href: '/', className: 'make' });
      bar.append(makeBtn);
      // 핸드폰: 상태 시트 밖을 누르면 닫는다
      document.addEventListener('pointerdown', e => {
        if (!document.body.classList.contains('show-panel')) return;
        const panel = document.getElementById('panel');
        if (panel && !panel.contains(e.target) && !panelBtn.contains(e.target)) togglePanel(false);
      }, true);
      function togglePanel(on) {
        const open = on === undefined ? !document.body.classList.contains('show-panel') : on;
        document.body.classList.toggle('show-panel', open);
        panelBtn.setAttribute('aria-expanded', String(open));
      }
      // 내 아이가 생기면(=로그인 확인) 버튼을 바꾼다
      const showMine = () => { bar.replaceChildren(followBtn, panelBtn, homeBtn); document.body.classList.remove('no-mine'); };
      document.body.classList.add('no-mine');
      const note = document.createElement('div');
      note.id = 'onlineToast';
      note.hidden = true;
      note.setAttribute('role', 'status');
      const off = document.createElement('div');
      off.id = 'onlineLost';
      off.hidden = true;
      off.textContent = '서버와 연결이 끊겼어요. 다시 잇는 중…';
      const rb = document.createElement('div');
      rb.id = 'replayBar';
      rb.hidden = true;
      const count = document.createElement('small');
      count.id = 'replayCount';
      const text = document.createElement('p');
      text.id = 'replayText';
      text.setAttribute('role', 'status');
      const next = document.createElement('button');
      next.type = 'button';
      next.textContent = '다음';
      next.onclick = () => nextScene();
      const stop = document.createElement('button');
      stop.type = 'button';
      stop.textContent = '그만 보기';
      stop.onclick = () => endReplay();
      rb.append(count, text, next, stop);
      document.body.append(bar, note, off, rb);
      for (const id of Object.keys(roster)) rebuild(id);
      if (LOW) {
        // 안개 안쪽만 그린다
        window.PerfTune.near = (p, cam) => {
          const dx = cam.position.x - p.cullX;
          const dz = cam.position.z - p.cullZ;
          const lim = 240 + p.cullR;
          return dx * dx + dz * dz < lim * lim;
        };
        g.camera.far = 260;
        g.camera.updateProjectionMatrix();
        if (g.scene.fog) Object.assign(g.scene.fog, { near: 90, far: 240 });
      }
      pinchZoom(g);
      lockToMine(g);
      watchDoing();
      plainTabs();
      markMine(g);
      // 내 아이가 확인될 때까지는 아무도 따라가지 않는다 (게임 기본값은 치이카와를 따라간다)
      g.setFollow(false);
      g.setSelected('__nobody__');                     // 구경꾼은 아무도 고르지 않는다
      if (window.VillageAuth && VillageAuth.ready) { VillageAuth.ready.then(() => loadMine(g, showMine)); return; }
      loadMine(g, showMine);
    },
  };

  // 내 아이 찾기: 있으면 따라가고, 다시 보기 주소(#replay=)면 장면을 튼다
  function loadMine(g, showMine) {
      if (!token()) return;
      fetch(`${API}/api/me`, { headers: { authorization: `Bearer ${token()}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(me => {
          if (!me) return;
          mine = me.resident.id;
          showMine();
          g.setSelected(mine);
          g.setFollow(true);
          const m = /^#replay=([\d,]+)$/.exec(location.hash);
          if (m) startReplay(m[1].split(',').map(Number).filter(Number.isInteger).slice(0, 20));
        })
        .catch(() => {});
  }

  // 지금 하는 일이 길면: 두 줄까지 보여 주고, 그래도 넘치면 글자를 칸에 맞춰 줄인다(원래의 62%까지).
  // 끝내 넘치면 CSS가 …로 줄이고, 누르면 전체 문장을 알림으로 띄운다. 게임이 카드를 다시 그릴 때마다 맞춘다
  function fitDoing() {
    const el = document.querySelector('#me .doing');
    if (!el) return;
    el.style.fontSize = '';
    const full = parseFloat(getComputedStyle(el).fontSize);
    let size = full;
    while (el.scrollHeight > el.clientHeight + 2 && size > full * 0.62) {
      size -= 2;
      el.style.fontSize = `${size}px`;
    }
    el.title = el.textContent;
  }
  function watchDoing() {
    const me = document.getElementById('me');
    if (!me) return;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      setTimeout(() => { queued = false; fitDoing(); }, 30);   // 화면이 가려져 있어도 맞추도록 rAF 대신
    }).observe(me, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', fitDoing);
    me.addEventListener('click', e => { const d = e.target.closest('.doing'); if (d && d.textContent) toast(d.textContent); });
    fitDoing();
  }

  // 상태 판의 탭: 게임은 그림 글자만 넣는다 → 탭 이름(title)을 글자로 보여 준다. 게임이 판을 다시 그릴 때마다 맞춘다
  function plainTabs() {
    const panel = document.getElementById('panel');
    if (!panel) return;
    const fix = () => {
      for (const t of panel.querySelectorAll('.tab')) if (t.title && t.textContent !== t.title) t.textContent = t.title;
    };
    new MutationObserver(fix).observe(panel, { childList: true, subtree: true, characterData: true });
    fix();
  }

  // 내 아이 표시: 분홍 점선 원과 "내 아이" 꼬리표가 화면 속 내 아이를 따라다닌다
  function markMine(g) {
    const mark = document.createElement('div');
    mark.id = 'mineMark';
    mark.hidden = true;
    mark.setAttribute('aria-hidden', 'true');
    mark.append(document.createElement('i'), Object.assign(document.createElement('span'), { textContent: '내 아이' }));
    document.body.append(mark);
    const v = new THREE.Vector3();
    const tick = () => {
      requestAnimationFrame(tick);
      const a = mine && !replay.on && g.actors ? g.actors.find(q => q.c.id === mine) : null;
      const obj = a && a.built && (a.built.model || a.built.root);
      if (!obj || a.c.hidden) { mark.hidden = true; return; }
      obj.getWorldPosition(v);
      v.y += 0.85;
      v.project(g.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { mark.hidden = true; return; }
      const r = g.renderer.domElement.getBoundingClientRect();
      mark.hidden = false;
      mark.style.transform = `translate(${r.left + (v.x + 1) / 2 * r.width}px, ${r.top + (1 - v.y) / 2 * r.height}px)`;
    };
    tick();
  }

  // 따라갈 수 있는 건 내 아이 하나뿐 (2026-11-11 히리온 지시).
  // 게임은 화면을 누르면 그 주민을 고르는데(game.js pick), 게임 파일은 고치지 않고 누른 직후 되돌린다.
  // pointerup을 막으면 게임의 끌기 상태가 풀리지 않아 손을 뗀 뒤에도 화면이 돌므로 막지 않는다
  function lockToMine(g) {
    const canvas = g.renderer.domElement;
    const reset = () => {
      if (replay.on) return;                            // 장면 다시 보기 중에는 그 장면 주인공을 따라간다
      // 고른 것(다른 주민·장소)을 지운다: 게임은 Esc로 지운다
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape' }));
      if (mine) g.setSelected(mine);
      else { g.setSelected('__nobody__'); g.setFollow(false); }
    };
    canvas.addEventListener('pointerup', () => setTimeout(reset, 0));
    setInterval(() => { if (mine && !replay.on) g.setSelected(mine); }, 500);
  }
}());
