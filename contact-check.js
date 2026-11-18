'use strict';

// 접촉 규칙 검사기 (docs/contact-rules.md). 눈으로 찾지 않고 숫자로 잡는다. 게임 화면(game.html)에서 돈다
//   ContactCheck.runDay(game, { hours })  게임 시간을 빠르게 돌리며 매 틱 R1·R2·R3 위반을 센다
//   ContactCheck.floating()               R4: 불러올 때 내려놓은 사물 목록 (glb-world.js가 남긴 것)
//   ContactCheck.props()                  R5·R6: 손 소품 (prop-check.js verify)
//   ContactCheck.all(game)                전부 돌려 한 장의 보고로
(function (root) {
  const R2_MIN = 0.9;
  const R3_TOL = 0.04;
  const MEASURED = new Map();   // 자리 높이는 자리마다 한 번 잰다

  const what = c => {
    const d = c.doing;
    if (!d) return c.act || 'idle';
    if (d.kind === 'chat') return `chat:${d.phase}:${d.with && d.with.id}`;
    return `${d.x.id}:${d.phase}:${d.socket ? d.socket.name : ''}`;
  };
  function snapshot(game) {
    const { sim, nav } = game;
    const out = { r1: [], r2: [], r3: [] };
    const live = sim.chars.filter(c => !c.hidden);
    for (const c of live) {
      const x = c.x + (c.ox || 0);
      const z = c.z + (c.oz || 0);
      // R1: 걷는 캐릭터가 막힌 칸 위 (자리에 들어가거나 나오는 중은 제외: 심즈식 자리 접근)
      if (c.walking && !c.seating && !c.leaving && nav.isBlocked(x, z)) out.r1.push({ id: c.id, x: +x.toFixed(2), z: +z.toFixed(2), doing: what(c), off: [+(c.ox || 0).toFixed(2), +(c.oz || 0).toFixed(2)] });
      // R3: 자리를 쓰는 중이면 실제 면 높이와 맞는가. 서 있으면 밟는 면과 맞는가
      const d = c.doing;
      const using = d && d.kind === 'obj' && d.phase === 'use';
      // 단계가 바뀌는 그 한 틱(다음 자리로 걸어가기 직전)은 빼고 잰다
      const between = d && d.phase === 'walk';
      if (!c.walking && !c.seating && !between) {
        const key = using && d.socket && d.socket.seatIn ? `${d.socket.place}/${d.socket.name}` : null;
        if (key && !MEASURED.has(key)) MEASURED.set(key, nav.measure(d.socket.x, d.socket.z, d.socket.hData));
        const want = key ? MEASURED.get(key) : nav.surface(x, z);
        if (Math.abs((c.h || 0) - want) > R3_TOL) out.r3.push({ id: c.id, h: +(c.h || 0).toFixed(3), want: +want.toFixed(3), at: d && d.socket ? `${d.socket.place}/${d.socket.name}` : '' });
      }
    }
    // R2: 서 있는 캐릭터끼리 0.9 미만 (둘 다 앉은 자리면 소켓 간격이라 제외)
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (sim.seated(a) && sim.seated(b)) continue;
      // 옆 자리로 들어가는 중(자기 소켓 1.2 안)과 앉은 사람: 소켓 간격이라 규칙상 앉은 자리끼리와 같다
      const arriving = (p, q) => sim.seated(q) && p.doing && p.doing.socket && p.claimSpot && Math.hypot(p.x - p.claimSpot.x, p.z - p.claimSpot.z) < 1.2;
      if (arriving(a, b) || arriving(b, a)) continue;
      const d = Math.hypot(a.x + (a.ox || 0) - b.x - (b.ox || 0), a.z + (a.oz || 0) - b.z - (b.oz || 0));
      if (d < R2_MIN) out.r2.push({ a: a.id, b: b.id, d: +d.toFixed(3), da: what(a), db: what(b), sa: sim.seated(a), sb: sim.seated(b) });
    }
    return out;
  }

  // 게임 시간 hours만큼 dt(게임 분) 단위로 돌린다. 화면 그리기와 무관하게 시뮬레이션만 돈다
  function runDay(game, { hours = 24, dt = 0.25 } = {}) {
    const { sim } = game;
    const wasPaused = sim.paused;
    const speed = sim.speed;
    sim.paused = false;
    sim.speed = 1;
    const ticks = Math.round((hours * 60) / dt);
    const count = { r1: 0, r2: 0, r3: 0, ticks };
    const samples = { r1: [], r2: [], r3: [] };
    const done = new Map();
    const aborted = new Map();
    const logStart = sim.log.length;
    const origAbort = sim.abort.bind(sim);
    sim.abort = (c, why) => {
      if (c.doing && c.doing.kind === 'obj') {
        const d = c.doing;
        const k = `${d.x.id} @${d.socket ? d.socket.name : '?'}:${d.phase} ${why || ''}`;
        aborted.set(k, (aborted.get(k) || 0) + 1);
      }
      return origAbort(c, why);
    };
    const t0 = performance.now();
    try {
      for (let i = 0; i < ticks; i++) {
        sim.update(dt);
        const s = snapshot(game);
        for (const k of ['r1', 'r2', 'r3']) {
          count[k] += s[k].length;
          if (s[k].length && samples[k].length < 12) samples[k].push({ at: sim.clock(), ...s[k][0] });
        }
      }
    } finally {
      sim.abort = origAbort;
      sim.paused = wasPaused;
      sim.speed = speed;
    }
    for (const e of sim.log.slice(logStart)) {
      const m = e.text.match(/: (.+) 끝/);
      if (m) done.set(m[1], (done.get(m[1]) || 0) + 1);
    }
    return { count, samples, finished: Object.fromEntries(done), aborted: Object.fromEntries(aborted), ms: Math.round(performance.now() - t0) };
  }

  function floating() {
    const list = root.GLB_CONTACT_REPORT || [];
    return { fixed: list.filter(x => x.fixed).length, left: list.filter(x => !x.fixed).length, list };
  }

  function props() {
    if (!root.PropCheck) return null;
    const rows = root.PropCheck.verify();
    return {
      combos: rows.length,
      r6Fail: rows.filter(r => r.minGap !== null && r.minGap < 0.03).length,
      r5Fail: rows.filter(r => r.handGap !== undefined && r.handGap !== null && r.handGap > 0.03).length,
      hidden: rows.filter(r => r.minGap === null).length,
      rows,
    };
  }

  function all(game, opts) {
    const day = runDay(game, opts);
    return {
      nav: { ...game.nav.stats, reach: game.nav.reachCount, links: game.nav.links.map(l => l.label) },
      sockets: { unreachable: game.sim.report.unreachable, droppedInteractions: game.sim.report.dropped, heightFixed: game.sim.report.height.length },
      day,
      r4: floating(),
      props: props(),
    };
  }

  root.ContactCheck = { snapshot, runDay, floating, props, all };
}(typeof self !== 'undefined' ? self : this));
