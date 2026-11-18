'use strict';

// 치이카와 심즈 — 노동 접수처 줄서기
// 접수처 안(창구·저울)에는 한 번에 두 명까지만 들어간다. 일은 온 순서대로 처리하고,
// 차례가 아닌 사람은 건물 밖에 한 줄로 서서 기다린다. 앞사람이 나오면 한 칸씩 앞으로 간다.
(function (root) {
  const MAX_IN = 2;
  const PLACE = 'reception';
  const INSIDE = /^(window|scale)/;
  // 줄: 입구 옆에서 건물 벽을 따라 한 줄로 (밖)
  const LINE0 = { x: -68.4, z: -18.6 };
  const GAP = 1.25;
  const lineSpot = (s, k) => {
    const p = { x: LINE0.x - k * GAP, z: LINE0.z };
    return (s.snap && s.snap(p)) || p;
  };

  function insideStep(c) {
    const d = c.doing;
    if (!d || !d.x || d.x.place !== PLACE || d.kind === 'chat') return false;
    const st = d.x.steps[Math.max(0, d.step || 0)];
    return !!(st && INSIDE.test(st.socket));
  }

  const V = root.Village.Village.prototype;
  const update0 = V.update;
  V.update = function (dtReal) {
    const s = this;
    const Q = s.recQ || (s.recQ = { inside: [], line: [] });
    // 안에 있던 사람이 나왔으면 자리를 비운다, 줄에서 다른 일로 빠진 사람은 줄에서 뺀다
    const byId = id => s.chars.find(o => o.id === id);
    Q.inside = Q.inside.filter(id => { const c = byId(id); return c && !c.gone && insideStep(c); });
    Q.line = Q.line.filter(id => { const c = byId(id); return c && !c.gone && !c.monster && insideStep(c) && !Q.inside.includes(id); });
    // 맨 앞사람부터 들여보낸다
    while (Q.inside.length < MAX_IN && Q.line.length) { const id = Q.line.shift(); Q.inside.push(id); const c = byId(id); if (c) c.queueSaid = false; }
    update0.call(this, dtReal);
  };

  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    const s = this;
    const Q = s.recQ;
    if (!Q || c.fight || c.flee || c.rescue || c.caught || c.monster || !insideStep(c)) return tickChar0.call(this, c, dt);
    if (Q.inside.includes(c.id)) return tickChar0.call(this, c, dt);
    if (!Q.line.includes(c.id)) {
      // 자리가 비어 있고 기다리는 사람이 없으면 바로 들어간다
      if (Q.inside.length < MAX_IN && !Q.line.length) { Q.inside.push(c.id); return tickChar0.call(this, c, dt); }
      Q.line.push(c.id);
      c.queueSince = s.minutes;
    }
    // 줄에 서서 기다린다
    const k = Q.line.indexOf(c.id);
    const spot = lineSpot(s, k);
    if (Math.hypot(c.x - spot.x, c.z - spot.z) > 0.5) {
      const r = s.walk(c, spot, dt);
      if (r === null) { s.clearRoute(c); c.x = spot.x; c.z = spot.z; }
      return;
    }
    c.walking = false;
    c.act = 'idle';
    c.angle = Math.atan2(GAP, 0);              // 앞사람(입구) 쪽을 본다
    c.clip = (Math.floor(s.minutes / 3) + k) % 4 === 0 ? 'tilt_look' : null;
    if (c.doing) c.doing.waitLeft = 40;        // 기다리다 포기하지 않게
    if (s.minutes - (c.queueSince || 0) > 1 && !c.queueSaid) {
      c.queueSaid = true;
      if (k >= 2) s.say(c, '줄이 길다…', 2);
    }
  };

  root.ReceptionQueue = { MAX_IN, lineSpot, inside: insideStep };
}(typeof self !== 'undefined' ? self : this));
