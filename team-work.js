'use strict';

// 치이카와 심즈 — 일 고르기를 다양하게, 그리고 같이 일하러 가기 (팀)
// 1) 어제·그제 한 노동은 덜 끌리고, 며칠 안 한 노동은 더 끌린다 (매일 같은 플레이트만 집지 않게)
// 2)
//    노동 플레이트를 집으러 가던 주민이 친한 친구를 불러 "같이 풀뽑기/토벌/채집 하러 가자" 하고 팀을 만든다.
// 팀은 함께 플레이트를 집어 접수하고, 다 모이면 같이 출발해 같은 구역에서 일하고, 먼저 끝난 친구는 기다렸다가 같이 정산하러 간다.
// village-sim.js·labor.js를 고치지 않고 감싸서 붙인다
(function (root) {
  const LABEL = { grass: '풀뽑기', hunt: '토벌', gather: '채집' };
  const GATHER_WAIT = 60;       // 접수하고 친구를 기다리는 최대 게임 분
  const FINISH_WAIT = 150;      // 먼저 끝나고 친구를 기다리는 최대 게임 분
  const FRIEND = 30;            // 이만큼 친해야 부른다 (아는 사이부터)
  const busyX = x => x && (x.night || x.examTake || x.shift || x.isJob || x.takeKind || x.accept || x.settle || x.plate);

  // 받침이 있으면 앞말, 없으면 뒷말 (치이카와와 / 랏코와 / 시사와, 후루혼야와 …)
  const josa = (w, yes, no) => {
    const code = String(w).charCodeAt(String(w).length - 1) - 0xac00;
    return w + (code >= 0 && code <= 11171 && code % 28 ? yes : no);
  };
  const names = list => {
    const n = list.map(c => c.name);
    if (n.length === 1) return n[0];
    return `${n.slice(0, -2).map(x => x + ', ').join('')}${josa(n[n.length - 2], '과', '와')} ${n[n.length - 1]}`;
  };

  /* ---------- 팀 만들기 ---------- */

  // 부를 수 있는 친구: 플레이트가 없고, 지금 꼭 해야 하는 일 중이 아니고, 힘이 남아 있고, 가까이 있는 친한 주민
  function recruits(s, c, x) {
    const kind = x.takeKind;
    const L = s.labor;
    return s.chars.filter(o => {
      if (o === c || o.extra || o.troupe || o.monster || o.gone || o.hidden || o.party || o.plate) return false;
      const goingToTake = o.doing && o.doing.x && o.doing.x.takeKind && o.doing.step < 0;
      if (o.doing && !goingToTake && (busyX(o.doing.x) || o.doing.ordered)) return false;
      if (o.orders.length || o.needs.energy < 40 || o.needs.hunger < 30) return false;
      if (L.blocked(o, x)) return false;                                       // 이미 오늘 일했거나, 자기 일이 있거나, 다 나갔거나
      if (kind === 'grass' && o.grade !== c.grade) return false;               // 풀뽑기는 같은 등급 구역에서만 같이 할 수 있다
      if (kind === 'hunt' && o.traits.brave < 0.35 && !root.Shop.owns(o, 'weapon')) return false;
      if (s.persona.bond(c, o) < FRIEND) return false;
      return Math.hypot(o.x - c.x, o.z - c.z) < 170;
    }).sort((a, b) => s.persona.bond(c, b) - s.persona.bond(c, a));
  }

  function form(s, c, x) {
    const kind = x.takeKind;
    if (!LABEL[kind] || c.extra || c.troupe || c.party || c.partyDay === s.day) return null;
    if (s.hour < 6 || s.hour >= 11) return null;
    c.partyDay = s.day;
    // 사교적일수록 자주 부른다
    if (s.random() > 0.5 + c.traits.social * 0.4) return null;
    const room = s.labor.left(kind) - 1;
    const want = Math.min(room, c.traits.social > 0.7 ? 3 : 2);
    const team = [];
    for (const o of recruits(s, c, x)) {
      if (team.length >= want) break;
      // 친할수록 잘 따라온다
      if (s.random() < 0.45 + s.persona.bond(c, o) / 160) team.push(o);
    }
    if (!team.length) return null;
    const P = { kind, x, leader: c, members: [c, ...team], made: s.minutes, departed: false, work: null };
    for (const m of P.members) m.party = P;
    (s.parties || (s.parties = [])).push(P);
    // 부르는 사람이 친구에게 한 명씩 찾아가 직접 말한다 (invite.js). 다 부르면 같이 접수처로
    if (root.Invite && root.Invite.begin(s, c, team, x, 'team', asked => {
      for (const o of team) if (!asked.includes(o) && o.party === P) leave(s, o);
      for (const o of asked) { if (o.doing) s.abort(o, ''); o.orders = [{ x }]; o.partyMeet = true; }
      if (!P.ended) P.made = s.minutes;
      s.start(c, x, null, true);
    })) {
      c.invite.label = LABEL[kind];
      P.inviting = true;
      return P;
    }
    s.note(`${c.name}: ${names(team)}에게 "같이 ${LABEL[kind]} 하러 가자!"`);
    // 불린 친구는 하던 놀이를 멈추고 반가워한 뒤 플레이트를 집으러 간다
    for (const o of team) {
      if (o.doing) s.abort(o, '');
      o.orders = [{ x }];
      s.labor.react(o, s.random() < 0.5 ? 'jump_joy' : 'chat_nod');
      o.partyMeet = true;
    }
    return P;
  }

  function leave(s, c) {
    const P = c.party;
    if (!P) return;
    s.note(`${c.name}: 이번에는 같이 못 가요`);
    c.party = null;
    P.members = P.members.filter(m => m !== c);
    if (P.leader === c) P.leader = P.members[0] || null;
    if (P.members.length < 2) disband(s, P, false);
  }

  function disband(s, P, done) {
    if (P.ended) return;
    P.ended = true;
    if (done && P.members.length >= 2) {
      // 같이 일한 친구끼리는 더 친해진다
      for (const a of P.members) for (const b of P.members) if (a.id < b.id) s.persona.grow(a, b, 3);
      s.note(`${names(P.members)}: 함께 ${josa(LABEL[P.kind], '을', '를')} 마쳤어요`);
    }
    for (const m of P.members) if (m.party === P) m.party = null;
    s.parties = (s.parties || []).filter(q => q !== P);
  }

  /* ---------- 시뮬레이션에 붙이기 ---------- */

  const V = root.Village.Village.prototype;
  const start0 = V.start;
  V.start = function (c, x, other, ordered) {
    // 플레이트를 집으러 나서는 순간 친구를 부른다. 부른 사람은 손짓으로 부르고 바로 앞장선다
    if (x && x.takeKind && !ordered && !c.party && this.labor) {
      const P = form(this, c, x);
      if (P && P.inviting) return;
    }
    return start0.call(this, c, x, other, ordered);
  };

  const L = root.Labor.prototype;

  // 플레이트가 다 나가서 못 집었으면 팀에서 빠진다. 집었으면 무슨 일을 했는지 적어 둔다
  const arrive0 = L.onArrive;
  L.onArrive = function (c, d) {
    const ok = arrive0.call(this, c, d);
    if (!ok && c.party) leave(this.sim, c);
    if (ok && d.x.takeKind && d.step === 0) {
      c.workLog = (c.workLog || []).filter(w => w.day !== this.sim.day).concat({ day: this.sim.day, kind: d.x.takeKind }).slice(-6);
    }
    return ok;
  };

  /* ---------- 일 고르기를 다양하게 ---------- */

  // 어제 한 일은 -26, 그제 한 일은 -12. 나흘 동안 안 한 일은 +14 (한 번도 안 해 본 일도)
  const score0 = L.scoreBonus;
  L.scoreBonus = function (c, x) {
    let v = score0.call(this, c, x);
    if (!x.takeKind) return v;
    const day = this.sim.day;
    const log = c.workLog || [];
    const ago = log.filter(w => w.kind === x.takeKind).map(w => day - w.day);
    if (ago.includes(1)) v -= 26;
    if (ago.includes(2)) v -= 12;
    if (!ago.some(d => d >= 1 && d <= 4)) v += 14;
    return v;
  };
  const save0 = L.save;
  L.save = function (c) { return { ...save0.call(this, c), workLog: c.workLog || [] }; };
  const load0 = L.load;
  L.load = function (c, r) {
    load0.call(this, c, r);
    if (Array.isArray(r.workLog)) c.workLog = r.workLog.slice(-6);
  };

  const duty0 = L.duty;
  L.duty = function (c) {
    const r = duty0.call(this, c);
    const P = c.party;
    const s = this.sim;
    if (!P || !c.plate) return r;
    const plate = c.plate;
    if (plate.state === 'accepted') {
      // 다 같이 접수할 때까지 접수처 앞에서 기다렸다가 함께 출발한다
      if (!P.departed) {
        const ready = P.members.every(m => m.plate && m.plate.state === 'accepted');
        if (ready || s.minutes - P.made > GATHER_WAIT) {
          P.departed = true;
          P.members.filter(m => !(m.plate && m.plate.state === 'accepted')).forEach(m => leave(s, m));
          if (P.ended) return r;
          s.note(`${names(P.members)}: 다 모였어요. 같이 출발!`);
        } else return 'wait';
      }
      // 같은 구역에서 일한다: 앞장선 사람이 고른 곳으로 (갈 수 없는 친구만 따로)
      if (r && r !== 'wait') {
        if (!P.work) P.work = r;
        const w = P.work;
        if (w !== r && s.open(w) && !this.blocked(c, w) && s.freeSocket(c, w.place, w.steps[0].socket, w.shared)) return w;
      }
      return r;
    }
    if (plate.state === 'done' || plate.state === 'failed') {
      // 먼저 끝났으면 친구들이 마칠 때까지 근처에서 기다린다
      const working = P.members.some(m => m !== c && m.plate && m.plate.state === 'accepted');
      if (working && s.minutes - P.made < GATHER_WAIT + FINISH_WAIT && s.hour < 17) return 'wait';
    }
    return r;
  };

  // 토벌은 친구와 같이 싸우면 이기기 쉽다 (같은 곳에서 싸우는 팀원 한 명당, 최대 둘까지)
  const chance0 = L.huntChance;
  L.huntChance = function (c) {
    const v = chance0.call(this, c);
    const P = c.party;
    if (!P || !c.doing) return v;
    const near = P.members.filter(m => m !== c && m.doing && m.doing.x && m.doing.x.place === c.doing.x.place).length;
    return Math.min(0.95, v + Math.min(2, near) * 0.08);
  };

  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    const P = c.party;
    finish0.call(this, c, x);
    if (P && x.plate && (P.kind === 'hunt') && c.plate) {
      // 팀원이 이기면 같이 기뻐한다
      if (c.plate.state === 'done') for (const m of P.members) if (m !== c && !m.doing) this.react(m, 'jump_joy');
    }
    if (P && x.settle && !c.plate) {
      c.party = null;
      if (P.members.every(m => !m.plate || m.party !== P)) disband(this.sim, P, true);
    }
  };

  // 하루가 끝나면 남은 팀은 푼다 (반납 못 한 플레이트는 labor.js가 처리한다)
  const tick0 = L.tick;
  L.tick = function () {
    tick0.call(this);
    const s = this.sim;
    if (s.hour >= 18 && s.parties && s.parties.length) for (const P of [...s.parties]) disband(s, P, false);
  };

  root.Party = { form, leave, disband, LABEL };
}(typeof self !== 'undefined' ? self : this));
