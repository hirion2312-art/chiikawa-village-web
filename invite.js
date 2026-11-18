'use strict';

// 치이카와 심즈 — 찾아가서 같이 하자고 하기
// 같이 일하러 가거나 놀러 갈 때, 부르는 사람이 친구에게 직접 걸어가 손짓하며 "같이 ~하자!" 하고 말한다.
// 친구는 하던 걸 멈추고 돌아보고, 반가워한 뒤 둘(셋)이 함께 나선다. 멀리 있는 친구는 부르지 않는다.
//  - 노동 팀 (team-work.js의 form): 팀원 한 명씩 찾아가 부른 뒤 다 같이 접수처로
//  - 놀이: 재미있는 걸 하러 나서는 주민이 근처 친구를 찾아가 같이 하자고 한다. 삼인방끼리는 더 자주 부른다
(function (root) {
  const REACH = 60;          // 이 거리 안의 친구만 찾아간다
  const GIVE_UP = 8;         // 이만큼(게임 분) 걸어도 못 닿으면 그 친구는 포기
  const ASK = 1.6;           // 부르는 동작 시간
  const TRIO = ['chiikawa', 'hachiware', 'usagi'];
  const FRIEND = 30;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const busyX = x => x && (x.night || x.examTake || x.shift || x.isJob || x.takeKind || x.accept || x.settle || x.plate);
  const josa = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
  const free = o => !o.extra && !o.troupe && !o.monster && !o.gone && !o.hidden && !o.fight && !o.flee && !o.rescue && !o.caught && !o.collapse && !o.invite && !o.orders.length;
  const verbOf = x => (x.name || '').replace(/\s*(하기|가기)$/, '');

  // 부르러 가기 시작
  function begin(s, c, list, x, kind, then, reach = REACH) {
    const near = list.filter(o => dist(c, o) < reach);
    if (!near.length) return false;
    near.sort((a, b) => dist(c, a) - dist(c, b));
    c.invite = { list: near, i: 0, x, kind, then, phase: 'go', t: s.minutes, asked: [] };
    for (const o of near) o.invitedBy = c.id;
    if (c.doing) s.abort(c, '');
    return true;
  }

  function finish(s, c) {
    const I = c.invite;
    c.invite = null;
    c.clip = null;
    for (const o of I.list) if (o.invitedBy === c.id) o.invitedBy = null;
    if (I.then) I.then(I.asked);
  }

  function tickInvite(s, c, dt) {
    const I = c.invite;
    const o = I.list[I.i];
    if (!o) return finish(s, c);
    // 친구가 그새 다른 급한 일에 묶였거나 사라졌으면 건너뛴다
    if (o.gone || o.monster || o.fight || o.rescue || o.caught || o.hidden || (o.doing && (busyX(o.doing.x) && !(o.party && o.party === c.party)))) {
      if (I.kind === 'team' && o.party && root.Party) root.Party.leave(s, o);
      I.i += 1; I.phase = 'go'; I.t = s.minutes;
      return;
    }
    if (I.phase === 'go') {
      if (dist(c, o) > 1.6) {
        if (s.minutes - I.t > GIVE_UP) {
          if (I.kind === 'team' && o.party && root.Party) root.Party.leave(s, o);
          I.i += 1; I.t = s.minutes;
          return;
        }
        // 친구 쪽으로 걷는다 (친구가 움직이면 길을 다시 잡는다)
        if (!I.goal || dist(I.goal, o) > 2.5) { I.goal = { x: o.x, z: o.z }; s.clearRoute(c); }
        const r = s.walk(c, I.goal, dt);
        if (r === null) { if (I.kind === 'team' && o.party && root.Party) root.Party.leave(s, o); I.i += 1; I.goal = null; I.t = s.minutes; }
        // 가까이 오면 친구가 알아보고 기다린다
        if (dist(c, o) < 6 && !o.doing) { o.idleLeft = Math.max(o.idleLeft || 0, 3); o.angle = Math.atan2(c.x - o.x, c.z - o.z); }
        return;
      }
      I.phase = 'ask';
      I.t = s.minutes;
      I.goal = null;
      if (o.doing) s.abort(o, '');
      o.walking = false;
      o.idleLeft = ASK + 1;
      const what = I.kind === 'team' ? `같이 ${I.label || '일'} 하러 가자!` : I.kind === 'trio' ? '삼인방 모이자! 광장에서 놀자!' : `같이 ${verbOf(I.x)} 하자!`;
      s.say(c, `${o.name}, ${what}`, 3);
      s.note(`${c.name}: ${o.name}에게 찾아가 "${what}"`);
      return;
    }
    // 부르는 중: 마주 보고 손짓, 친구는 반가워한다
    c.walking = false;
    c.act = 'idle';
    c.angle = Math.atan2(o.x - c.x, o.z - c.z);
    o.angle = Math.atan2(c.x - o.x, c.z - o.z);
    c.clip = s.minutes - I.t < ASK * 0.5 ? 'wave' : 'signal_go';
    if (!I.answered) {
      I.answered = true;
      s.labor.react(o, s.random() < 0.5 ? 'jump_joy' : 'chat_nod', s.random() < 0.5 ? '응! 가자!' : '좋아!');
      if (s.persona) s.persona.grow(c, o, 1);
    }
    if (s.minutes - I.t >= ASK) {
      I.asked.push(o);
      o.invitedBy = null;
      I.i += 1;
      I.phase = 'go';
      I.answered = false;
      I.t = s.minutes;
      c.clip = null;
    }
  }

  /* ---------- 놀이 초대 ---------- */
  const funOf = x => (x.gain && x.gain.fun) || 0;
  const playable = x => x && funOf(x) >= 6 && !busyX(x) && !x.cost && !/^home:|\.sleep$|bag_eat|cook/.test(x.id) && !x.solo;
  // 밥: 식당·솟는 곳·집밥은 배고픈 친구를 불러 같이 먹는다 (값은 각자 낸다)
  const mealOf = x => !!x && (x.gain && (x.gain.hunger || 0) >= 15) && !busyX(x) && !/^home:|bag_eat|feast|haejang/.test(x.id) && !x.solo && !!(root.Pair && root.Pair.scriptOf(x));
  const invitable = x => playable(x) || mealOf(x);
  function playMate(s, c, x) {
    const P = s.persona;
    let best = null, bestV = 0;
    for (const o of s.chars) {
      if (o === c || !free(o)) continue;
      if (o.plate && o.plate.state === 'accepted') continue;
      if (o.doing && (busyX(o.doing.x) || o.doing.ordered || o.doing.kind === 'chat' || funOf(o.doing.x) <= 0)) continue;
      if (o.needs.energy < 30 || (!mealOf(x) && o.needs.hunger < 25)) continue;
      if (mealOf(x) && (o.needs.hunger > 72 || (x.cost && o.money < x.cost))) continue;   // 배부른 친구, 돈 없는 친구는 부르지 않는다
      const d = dist(c, o);
      if (d > REACH) continue;
      const b = P ? P.bond(c, o) : 0;
      if (b < FRIEND) continue;
      // 삼인방끼리는 훨씬 잘 부른다
      const trio = TRIO.includes(c.id) && TRIO.includes(o.id) ? 1.8 : 1;
      const v = (b / 100) * trio * (1 - d / (REACH * 1.5));
      if (v > bestV) { bestV = v; best = o; }
    }
    return best;
  }

  const V = root.Village.Village.prototype;
  const start0 = V.start;
  // 삼인방 모이기: 다른 둘을 직접 찾아가 약속을 받은 뒤에만 모인다 (이재헌님 지적: 우사기만 오거나, 말도 없이 갑자기 모이던 문제)
  const TRIO_REACH = 220;
  const trioMeet = x => x && x.id === 'plaza.trio_meet';
  function startTrio(s, c, x) {
    const others = s.chars.filter(o => o !== c && TRIO.includes(o.id));
    const ok = begin(s, c, others, x, 'trio', asked => {
      if (asked.length < others.length) {
        // 한 명이라도 못 오면 모이지 않는다. 약속한 친구에게도 다음에 하자고 한다
        s.say(c, '다음에 다 같이 모이자', 3);
        for (const m of asked) { s.say(m, '응, 다음에!', 3); m.idleLeft = 1; }
        c.idleLeft = 1;
        return;
      }
      s.note(`${c.name}: ${asked.map(m => m.name).join('·')}와(과) 약속하고 광장으로 모여요`);
      for (const m of asked) { m.orders = [{ x }]; m.idleLeft = 0; m.playWith = c.id; m.followLead = c.id; m.pairOf = c.id; m.trioJoin = true; }
      start0.call(s, c, x, null, true);
    }, TRIO_REACH);
    return ok;
  }
  V.start = function (c, x, other, ordered) {
    // 약속을 받고 따라가는 친구는 그대로 간다. 부르는 쪽(스스로든 플레이어가 시켰든)은 먼저 찾아가 묻는다
    if (trioMeet(x) && c.trioJoin) {
      c.trioJoin = false;
      return start0.call(this, c, x, other, ordered);
    }
    if (trioMeet(x) && !c.invite) {
      if (startTrio(this, c, x)) return;
      if (ordered) this.say(c, '다들 너무 멀리 있어요', 3);
      return;    // 부를 친구가 근처에 없으면 모이지 않는다
    }
    if (!ordered && !other && !c.invite && !c.party && !c.extra && !c.troupe && invitable(x) && this.hour >= (mealOf(x) ? 6 : 8) && this.hour < (mealOf(x) ? 22 : 20)
      && (c.invitePlayDay !== this.day || (c.invitePlays || 0) < 3)) {
      const t = c.traits || {};
      const chance = 0.3 + (t.social || 0.5) * 0.3 + (TRIO.includes(c.id) ? 0.2 : 0);
      if (this.random() < chance) {
        const o = playMate(this, c, x);
        if (o) {
          const s = this;
          if (c.invitePlayDay !== s.day) { c.invitePlayDay = s.day; c.invitePlays = 0; }
          c.invitePlays += 1;
          const ok = begin(s, c, [o], x, 'play', asked => {
            if (!asked.length) return start0.call(s, c, x, null, false);
            for (const m of asked) { m.orders = [{ x }]; m.idleLeft = 0; m.playWith = c.id; m.followLead = c.id; m.pairOf = c.id; }
            start0.call(s, c, x, null, true);
          });
          if (ok) return;
        }
      }
    }
    return start0.call(this, c, x, other, ordered);
  };

  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    if (c.invite && !c.fight && !c.flee && !c.rescue && !c.caught && !c.monster) {
      // 욕구 감소·말풍선은 원래 흐름이 처리하도록 doing 없이 한 번 돌리고 위치만 우리가 정한다
      return tickInvite(this, c, dt);
    }
    if (c.invite) c.invite = null;
    // 부르러 오는 친구가 있으면 그 자리에서 기다린다 (새 일을 고르지 않는다)
    if (c.invitedBy && !c.doing) {
      const by = this.chars.find(o => o.id === c.invitedBy);
      if (!by || !by.invite) c.invitedBy = null;
      else { c.walking = false; c.idleLeft = Math.max(c.idleLeft || 0, 1); }
    }
    return tickChar0.call(this, c, dt);
  };

  // 삼인방 셋이 다 지금 부를 수 있는 상태인가 (purpose.js가 쓴다)
  function trioFree(s, c) {
    return s.chars.filter(o => o !== c && TRIO.includes(o.id)).every(o => free(o) && !(o.plate && o.plate.state === 'accepted') && !(o.doing && (busyX(o.doing.x) || o.doing.ordered)) && dist(c, o) < TRIO_REACH && o.needs.energy >= 30);
  }

  root.Invite = { begin, REACH, josa, trioFree, TRIO };
}(typeof self !== 'undefined' ? self : this));
