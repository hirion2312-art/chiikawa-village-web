'use strict';

// 치이카와 심즈 — 함께 하기 (2026-11-11 이재헌 지시: 같이 가도 각자 싸우고, 뭘 같이 해도 따로 한다)
// 1) 같은 일을 같은 곳에서 같이 하는 친구들은 동작 박자를 맞추고, 가끔 서로를 보며 두 사람 전용 동작을 한다
//    먹을 때 건배, 놀 때 하이파이브·다 같이 만세, 수다 중 맞장구, 일할 때 엄지척
// 2) 함께 토벌: 팀(team-work.js)으로 나간 친구들은 따로 다른 괴물과 싸우지 않는다.
//    앞장선 친구가 맞선 괴물을 나머지가 양옆에서 둘러싸 번갈아 공격하고, 쓰러뜨리면 다 같이 하이파이브
// 시뮬레이션만 바꾼다 (화면은 c.clip·c.angle·c.syncOff를 읽는다)
(function (root) {
  const { C } = root.MinorActs;
  const hold = (a, dur) => `${a}@0 ${a}@${dur}`;

  /* ---------- 두 사람 전용 동작 ---------- */
  const CLIPS = {
    // 손바닥을 높이 들어 마주 친다 (0.7초에 짝)
    high_five: C(1.6, { posY: '0:0 .5:.04 .7:.1o .9:0 1.6:0', rotX: '0:.04 .5:-.12 .7:-.16 1:-.04 1.6:0', squash: '0:1 .6:.96 .75:1.05 .95:.98 1.6:1' },
      { R: 'chest(.24,.1,.1)@0 high(.26,-.24,.12)@.5 high(.2,-.3,.24)@.7 high(.24,-.26,.14)@1 chest(.24,.1,.1)@1.6', L: hold('hip(-.2,.1,0)', 1.6) }, [[0, 'smile'], [.6, 'joy']]),
    // 다 같이 두 팔 번쩍, 두 번 뛴다
    cheer_together: C(1.8, { posY: '0:0 .3:.16o .6:0 .9:.16o 1.2:0 1.8:0', squash: '0:.96 .3:1.06 .6:.95 .9:1.06 1.2:.96 1.8:1', rotX: '0:-.08 1.8:-.08' },
      { R: 'top(.26,-.16,0)@0 top(.2,-.1,0)@.3 top(.26,-.16,0)@.6 top(.2,-.1,0)@.9 top(.26,-.16,0)@1.2 chest(.24,.1,.1)@1.8', L: 'top(.26,-.16,0)@0 top(.2,-.1,0)@.3 top(.26,-.16,0)@.6 top(.2,-.1,0)@.9 top(.26,-.16,0)@1.2 chest(.24,.1,.1)@1.8' }, 'joy'),
    // 잔(그릇)을 들어 가운데서 짠 하고 한 모금
    cheers_toast: C(2.2, { rotX: '0:.04 .6:-.06 .8:-.1 1.4:-.2 2.2:.04', posY: '0:0 .7:.04 .8:0 2.2:0' },
      { R: 'front(.24,-.06,0)@0 high(.24,-.18,.2)@.6 high(.22,-.2,.28)@.8 mouth(.04,-.04,.2)@1.4 front(.24,-.06,0)@2.2', L: hold('front(.26,-.1,0)', 2.2) }, [[0, 'smile'], [.8, 'joy']]),
    // 마주 보며 고개를 크게 끄덕끄덕, 손뼉 한 번
    agree_clap: C(1.6, { rotX: '0:0 .25:.16 .5:0 .75:.16 1:0 1.6:0', posY: '0:0 1.1:.04 1.3:0 1.6:0' },
      { R: 'chest(.24,.1,.1)@0 chest(.24,.1,.1)@1 chest(.06,.2,.24)@1.2 chest(.24,.1,.1)@1.6', L: 'chest(.24,.1,.1)@0 chest(.24,.1,.1)@1 chest(.06,.2,.24)@1.2 chest(.24,.1,.1)@1.6' }, [[0, 'smile'], [1.1, 'joy']]),
    // 엄지를 척 (일하다 서로 응원)
    thumbs_up: C(1.4, { rotX: '0:0 .4:-.08 1.4:0', posY: '0:0 .4:.04 .7:0 1.4:0' },
      { R: 'chest(.24,.1,.1)@0 front(.3,.12,.16)@.4 front(.3,.12,.16)@1 chest(.24,.1,.1)@1.4', L: hold('hip(-.2,.1,0)', 1.4) }, [[0, 'normal'], [.4, 'smile']]),
    // 토벌 신호: 옆 친구에게 손짓하고 함께 덤빈다
    signal_go: C(1.4, { rotY: '0:0 .3:.3 .7:.3 1:0 1.4:0', posY: '0:0 1:.06 1.2:0 1.4:0', rotX: '0:0 1:-.12 1.4:0' },
      { R: 'chest(.24,.1,.1)@0 high(.3,-.1,.1)@.3 high(.34,-.06,.16)@.6 front(.3,.0,.2)@1 chest(.24,.1,.1)@1.4', L: hold('chest(.24,.1,.1)', 1.4) }, [[0, 'brave'], [.6, 'brave']]),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);

  /* ---------- 같이 하는 무리 찾기 ---------- */
  const isEat = x => (x.gain && (x.gain.hunger || 0) >= 15) || !!x.sake;
  const isWork = x => !!(x.earn || x.worth || x.shift || x.plate || x.isJob);
  const isFight = x => !!(x.huntTier || x.plate === 'hunt' || /rakko_hunt|^hunt\./.test(x.id));
  const seedOf = key => { let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h / 97; };

  function groupsOf(s) {
    const map = new Map();
    for (const c of s.chars) {
      if (c.hidden || c.monster || c.gone || c.rescue || c.walking) continue;
      const d = c.doing;
      if (!d || d.phase !== 'use') continue;
      let key = null;
      if (d.kind === 'chat' && d.with) key = `chat:${[c.id, d.with.id].sort().join('+')}`;
      else if (d.kind === 'obj' && d.x) key = `${d.x.id}@${d.x.place}`;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    const out = [];
    for (const [key, list] of map) {
      // 친한 사이(아는 사이 이상)끼리만 무리로 친다. 엑스트라끼리는 박자만 맞춘다
      const friendly = list.filter(c => list.some(o => o !== c && (c.extra || o.extra || s.persona.bond(c, o) >= 30)));
      if (friendly.length >= 2) out.push({ key, list: friendly, x: friendly[0].doing.x, chat: key.startsWith('chat:') });
    }
    return out;
  }

  // 이 무리가 다음에 할 짝 동작
  function beatOf(g, s) {
    const x = g.x;
    if (g.chat) return s.random() < 0.6 ? 'agree_clap' : 'high_five';
    if (!x) return null;
    if (isFight(x)) return 'signal_go';
    if (isEat(x)) return 'cheers_toast';
    if (isWork(x)) return 'thumbs_up';
    return g.list.length >= 3 && s.random() < 0.5 ? 'cheer_together' : 'high_five';
  }
  const BEAT_MIN = { high_five: 1.8, cheer_together: 2, cheers_toast: 2.4, agree_clap: 1.8, thumbs_up: 1.6, signal_go: 1.6 };

  function face(c, x, z) { c.angle = Math.atan2(x - c.x, z - c.z); }
  function startBeat(s, list, clip) {
    const cx = list.reduce((a, c) => a + c.x, 0) / list.length;
    const cz = list.reduce((a, c) => a + c.z, 0) / list.length;
    for (const c of list) {
      if (c.reactLeft > 0) continue;
      // 둘이면 서로를, 여럿이면 가운데를 본다
      const other = list.length === 2 ? list.find(o => o !== c) : null;
      c.beat = { clip, until: s.minutes + (BEAT_MIN[clip] || 2), angle: c.angle, step: c.doing ? c.doing.step : -1 };
      if (other) face(c, other.x, other.z); else face(c, cx, cz);
    }
  }

  function tick(s) {
    const now = s.minutes;
    const grouped = new Set();
    s.togetherBeats = s.togetherBeats || {};
    for (const g of groupsOf(s)) {
      const seed = seedOf(g.key);
      g.list.forEach((c, i) => {
        grouped.add(c.id);
        // 같은 동작을 같은 박자로 (싸울 때는 번갈아 치게 반 박자 어긋나게)
        c.syncOff = seed + (isFight(g.x || {}) ? i * 0.5 : 0);
      });
      const b = s.togetherBeats[g.key] || (s.togetherBeats[g.key] = { next: now + 1 + s.random() * 2 });
      // 엑스트라끼리만 있는 무리는 박자만 맞추고 짝 동작은 하지 않는다 (마을 전체가 하이파이브로 들썩이지 않게)
      if (now >= b.next && g.list.every(c => c.extra)) b.next = now + 30;
      if (now >= b.next) {
        const clip = beatOf(g, s);
        // 먹는 중이면 가끔만, 수다는 자주
        if (clip) startBeat(s, g.list, clip);
        b.next = now + (g.chat ? 3 : 5) + s.random() * 5;
        if (!g.list.some(c => c.extra)) s.togetherCount = (s.togetherCount || 0) + 1;
      }
    }
    for (const c of s.chars) {
      if (!grouped.has(c.id)) c.syncOff = undefined;
      const bt = c.beat;
      if (!bt) continue;
      const stepNow = c.doing ? c.doing.step : -1;
      if (now >= bt.until || stepNow !== bt.step || !c.doing || c.doing.phase !== 'use') {
        // 끝나면 원래 하던 쪽을 다시 본다
        if (c.doing && c.doing.phase === 'use' && stepNow === bt.step) c.angle = bt.angle;
        c.beat = null;
        continue;
      }
      c.clip = bt.clip;
    }
    // 오래된 박자 기록 정리
    if (Math.floor(now) % 120 === 0) for (const k of Object.keys(s.togetherBeats)) if (s.togetherBeats[k].next < now - 60) delete s.togetherBeats[k];
  }

  const V = root.Village.Village.prototype;
  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    tick(this);
  };

  /* ---------- 함께 토벌: 같은 괴물을 둘러싸고 싸운다 ---------- */
  // 앞장선 친구의 자리(괴물 앞)를 괴물을 중심으로 좌우로 돌린 자리 둘을 만든다
  function flankSockets(s, place, so) {
    const list = s.sockets[place];
    if (!list || so.fx === undefined) return [];
    const out = [];
    for (const side of [1, -1]) {
      const name = `assist_${so.name}_${side > 0 ? 'l' : 'r'}`;
      if (!list[name]) {
        const vx = so.x - so.fx, vz = so.z - so.fz;
        const a = 0.95 * side;
        const nx = so.fx + vx * Math.cos(a) - vz * Math.sin(a);
        const nz = so.fz + vx * Math.sin(a) + vz * Math.cos(a);
        const sk = { ...so, name, x: nx, z: nz, assist: true };
        if (s.nav) {
          const ap = s.nav.approach(sk);
          if (!ap) continue;
          Object.assign(sk, { reach: true, ax: ap.x, az: ap.z, seatIn: false, h: s.nav.surface(ap.x, ap.z) });
          sk.x = ap.x;
          sk.z = ap.z;
        }
        list[name] = sk;
      }
      out.push(name);
    }
    return out;
  }
  const fightStep = x => x.steps.findIndex(st => st.act === 'confront');

  const L = root.Labor.prototype;
  const duty0 = L.duty;
  L.duty = function (c) {
    const r = duty0.call(this, c);
    const P = c.party;
    const s = this.sim;
    if (!P || P.kind !== 'hunt' || !r || r === 'wait' || !c.plate || c.plate.state !== 'accepted' || P.leader === c) return r;
    const lead = P.leader;
    const ld = lead && lead.doing;
    // 앞장선 친구가 괴물 앞에 설 때까지 근처에서 기다린다
    if (!ld || !ld.x || !isFight(ld.x) || !ld.socket || ld.step < fightStep(ld.x)) {
      return lead && lead.plate && lead.plate.state === 'accepted' ? 'wait' : r;
    }
    const names = flankSockets(s, ld.x.place, ld.socket);
    if (!names.length) return r;
    const fi = fightStep(ld.x);
    // 같은 괴물을 옆에서 돕는 토벌 (상호작용 id는 같게 두어 정산·성공 판정은 그대로)
    return { ...ld.x, steps: ld.x.steps.map((st, i) => (i === fi ? { ...st, socket: names.join('|') } : i < fi ? { ...st, socket: names.join('|'), min: Math.min(st.min, 1) } : st)), assistOf: lead.id };
  };

  // 괴물을 쓰러뜨리면 그 자리의 팀원이 다 같이 하이파이브
  const note0 = V.note;
  V.note = function (text) {
    note0.call(this, text);
    if (!/쓰러뜨렸어요|토벌 성공/.test(text)) return;
    const who = this.chars.find(c => !c.extra && text.startsWith(c.name) && c.party);
    if (!who) return;
    const team = who.party.members.filter(m => !m.rescue && !m.hidden && Math.hypot(m.x - who.x, m.z - who.z) < 12);
    if (team.length < 2) return;
    for (const m of team) if (this.labor) this.labor.react(m, team.length >= 3 ? 'cheer_together' : 'high_five');
    const cx = team.reduce((a, m) => a + m.x, 0) / team.length, cz = team.reduce((a, m) => a + m.z, 0) / team.length;
    for (const m of team) face(m, cx, cz);
    this.persona && team.forEach(a => team.forEach(b => { if (a.id < b.id) this.persona.grow(a, b, 2); }));
  };

  root.Together = { CLIPS, groupsOf, tick };
}(typeof self !== 'undefined' ? self : this));
