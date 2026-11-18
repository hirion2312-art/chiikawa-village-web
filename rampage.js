'use strict';

// 치이카와 심즈 — 난동 괴물 (2026-11-11 이재헌 지시)
// 엑스트라가 괴물이 되면 야생지대로 가지 않고, 태어난 그 자리 둘레(난동 구역)에서 엑스트라를 잡아먹고 주변 사람을 할퀸다.
// - 랏코는 어디서든 곧장 출동한다 (자고 있어도 깬다)
// - 근처의 삼인방(치이카와·하치와레·우사기)과 강한 엑스트라 둘은 무기를 들고 참전, 나머지는 모두 도망쳤다가 돌아온다
// - 참전자는 괴물을 빙 둘러싸고 번갈아 친다. 괴물은 한 명씩 골라 반격하고, 체력이 0이 된 사람은 대나무 헬리콥터가 데려간다
// - 쓰러뜨리면 다 같이 기뻐하고 친해진다. 아무도 막지 못한 채 4시간이 지나면 괴물은 야생지대로 떠난다
(function (root) {
  const ZONE = 25;               // 난동 구역 반경
  const JOIN = 45;               // 이 안의 삼인방·강한 엑스트라가 참전
  const FLEE = 32;               // 이 안의 다른 주민은 도망
  const RING = 2.3;              // 둘러싸는 거리
  const LAST = 240;              // 막는 사람이 없을 때 머무는 시간 (게임 분)
  const TRIO = ['chiikawa', 'hachiware', 'usagi'];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const josa = (w, yes, no) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k <= 11171 && k % 28 ? yes : no); };
  const names = list => list.map(c => c.name).join(', ');
  const hp = c => (root.RescueHeli ? root.RescueHeli.hpOf(c) : 100);

  function placeNear(s, c) {
    let best = null, bd = Infinity;
    for (const p of Object.values(s.places)) {
      if (p.x === undefined || /^home:|^el_/.test(p.id)) continue;
      const d = dist(p, c);
      if (d < bd) { bd = d; best = p; }
    }
    return best && bd < 60 ? best.name : '마을 길가';
  }
  const rampagers = s => s.chars.filter(c => c.monster && !c.gone && c.beast && c.beast.rampage);

  /* ---------- 변이: 그 자리에서 난동을 시작한다 ---------- */
  const E = root.Ecology.prototype;
  const turn0 = E.turn;
  E.turn = function (c) {
    turn0.call(this, c);
    const s = this.sim;
    // 한 번에 하나만 난동 (나머지는 예전처럼 야생지대로)
    if (rampagers(s).length) return;
    const where = placeNear(s, c);
    c.beast.rampage = { zone: { x: c.x, z: c.z }, where, until: s.minutes + LAST, hp: 100, max: 100, born: s.minutes, nextHit: s.minutes + 1.5, ate: 0, hitBy: {} };
    c.beast.mode = 'rage';
    s.note(`👾 난동 괴물이 ${where}에 나타났어요!`);
  };

  // 괴물 쪽 움직임
  const tickBeast0 = E.tickBeast;
  E.tickBeast = function (c, dt) {
    const R = c.beast && c.beast.rampage;
    if (!R || c.gone) return tickBeast0.call(this, c, dt);
    const s = this.sim;
    c.needs.hunger = 60;
    c.needs.energy = 60;
    if (R.hp <= 0) return defeat(this, c);
    const fighters = s.chars.filter(o => o.fight && o.fight.foe === c.id && !o.rescue);
    const engaged = fighters.filter(o => dist(o, c) < RING + 0.9);
    // 처음 1분은 몸을 떨며 변한다
    if (s.minutes - R.born < 1) { c.walking = false; c.clip = 'wobble_fear'; c.act = 'idle'; return; }
    // 싸우는 중: 제자리에서 둘러싼 사람을 차례로 반격
    if (engaged.length) {
      c.walking = false;
      s.clearRoute(c);
      // 랏코가 붙으면 괴물은 기가 눌려 움찔거리고, 반격은 랏코가 아닌 쪽으로만 (랏코에게는 거의 통하지 않는다)
      const rakko = engaged.find(o => o.id === 'rakko');
      const others = engaged.filter(o => o.id !== 'rakko');
      const tgt = (others.length ? others : engaged).slice().sort((a, b) => hp(a) - hp(b))[0];
      c.angle = Math.atan2((rakko || tgt).x - c.x, (rakko || tgt).z - c.z);
      c.act = 'confront';
      c.clip = rakko && Math.floor(s.minutes * 1.5) % 3 === 0 ? 'wobble_fear' : s.minutes < R.nextHit - 0.8 ? 'brave_up' : 'train_swing';
      if (s.minutes >= R.nextHit) {
        R.nextHit = s.minutes + (rakko ? 2.4 : 1.4) + s.random();
        hurt(s, tgt, (8 + s.random() * 7 + R.ate * 2) * (tgt.id === 'rakko' ? 0.1 : rakko ? 0.6 : 1));
      }
      return;
    }
    // 아무도 못 막는 채로 오래 지나면 야생지대로 떠난다
    if (!fighters.length && s.minutes > R.until) {
      c.beast.rampage = null;
      c.beast.mode = 'go';
      c.beast.spot = this.roamSpot(c);
      s.note(`👾 난동 괴물이 ${R.where}을(를) 떠나 야생지대로 갔어요`);
      return;
    }
    // 잡아먹는 중
    if (R.eating) {
      if (devour(s, c, R.eating, dt)) {
        const p = R.eating.prey;
        const ok = p && p.caught;
        devourDone(this, c, R.eating);
        R.eating = null;
        if (ok) {
          R.ate += 1;
          R.max += 15;
          R.hp += 15;
        }
      }
      return;
    }
    // 구역 안의 엑스트라를 쫓는다 (싸우러 오는 사람이 있으면 먼저 그쪽으로)
    const zoneOK = o => dist(o, R.zone) < ZONE;
    const prey = s.chars.filter(o => this.preyable(o) && zoneOK(o)).sort((a, b) => dist(a, c) - dist(b, c))[0];
    const victim = !prey && s.chars.filter(o => !o.monster && !o.gone && !o.hidden && !o.rescue && !o.fight && zoneOK(o) && dist(o, c) < 7).sort((a, b) => dist(a, c) - dist(b, c))[0];
    // 코앞의 먹잇감이 먼저, 그다음 덤비는 사람
    const goal = (prey && dist(c, prey) < 6 ? prey : null) || fighters[0] || prey || victim;
    if (goal) {
      if (prey && goal === prey && dist(c, prey) < 1.8) {
        if (prey.doing) s.abort(prey, '');
        Object.assign(prey, { caught: true, idleLeft: 999, act: 'idle', clip: 'wobble_fear', orders: [] });
        R.eating = { prey, t: 0 };
        c.angle = Math.atan2(prey.x - c.x, prey.z - c.z);
        return;
      }
      if (victim && goal === victim && dist(c, victim) < 1.8) {
        if (s.minutes >= R.nextHit) {
          R.nextHit = s.minutes + 2;
          c.clip = 'train_swing';
          hurt(s, victim, 10);
          scare(s, victim, c);
        }
        return;
      }
      const r = s.walk(c, { x: goal.x, z: goal.z }, dt * 1.7);
      if (r === null) s.clearRoute(c);
      return;
    }
    // 할 게 없으면 구역 안을 어슬렁거리며 포효한다
    if (!R.roam || dist(c, R.roam) < 0.6) {
      if (R.roam && !R.roarLeft) R.roarLeft = 2;
      if (R.roarLeft > 0) { R.roarLeft -= dt; c.walking = false; c.clip = 'brave_up'; if (R.roarLeft <= 0) { R.roarLeft = 0; R.roam = null; } return; }
      const a = s.random() * Math.PI * 2, r = 4 + s.random() * 10;
      R.roam = s.snap({ x: R.zone.x + Math.cos(a) * r, z: R.zone.z + Math.sin(a) * r }) || R.zone;
    }
    c.clip = null;
    if (s.walk(c, R.roam, dt) === null) R.roam = null;
  };

  function hurt(s, c, amount) {
    if (c.rescue) return;
    c.hp = Math.max(0, hp(c) - amount);
    if (s.labor && !c.fight) s.labor.react(c, 'wobble_fear');
    if (c.hp <= 0 && root.RescueHeli) {
      c.fight = null;
      c.flee = null;
      root.RescueHeli.knockout(s, c);
    }
  }

  function defeat(eco, c) {
    const s = eco.sim;
    const R = c.beast.rampage;
    const team = s.chars.filter(o => o.fight && o.fight.foe === c.id && !o.rescue);
    c.beast.rampage = null;
    for (const o of team) {
      o.fight = null;
      o.prop = null;
      if (s.labor) s.labor.react(o, team.length >= 3 ? 'cheer_together' : 'high_five');
      o.huntWins = (o.huntWins || 0) + 1;
      o.huntSkill = Math.min(100, (o.huntSkill || 0) + 3);
      if (s.traits) { s.traits.progress(o, { type: 'slay' }); s.traits.setFeel(o, 'proud', '난동 괴물을 막아서', 4); }
      o.angle = Math.atan2(c.x - o.x, c.z - o.z);
    }
    team.forEach(a => team.forEach(b => { if (a.id < b.id) s.persona.grow(a, b, 4); }));
    eco.vanish(c, 60, 180);
    // 도망갔던 사람들이 돌아온다
    for (const o of s.chars) if (o.flee) o.flee.until = s.minutes;
    s.note(team.length ? `🎉 ${names(team)}: ${R.where}의 난동 괴물을 쓰러뜨렸어요!` : `🎉 ${R.where}의 난동 괴물이 쓰러졌어요`);
  }

  /* ---------- 잡아먹기 연출 ----------
     붙잡기(두 팔로 움켜 들어 올림) → 입으로 가져감(먹잇감이 버둥) → 한입에(덥석, 먹잇감이 입 속으로 사라짐) → 우물우물 씹고 배를 두드림
     먹잇감 위치·높이·방향을 괴물 앞에 맞춘다. 난동 괴물과 야생지대 괴물이 같이 쓴다 */
  const { C } = root.MinorActs;
  const hold2 = (a, b, dur) => `${a}@0 ${b}@${dur * 0.25} ${a}@${dur * 0.5} ${b}@${dur * 0.75} ${a}@${dur}`;
  const BEAST = {
    beast_grab: C(1.2, { rotX: '0:.05 .5:.3 1.2:.22', posY: '0:0 .5:-.06 1.2:0', squash: '0:1 .5:.94 1.2:1' },
      { R: 'chest(.24,.1,.1)@0 front(.42,.04,.3)@.5 front(.3,.16,.24)@1.2', L: 'chest(.24,.1,.1)@0 front(.42,.04,.3)@.5 front(.3,.16,.24)@1.2' }, 'normal'),
    beast_lift: C(1.2, { rotX: '0:.22 .6:-.14 1.2:-.18', posY: '0:0 .6:.06 1.2:.04' },
      { R: 'front(.3,.16,.24)@0 high(.2,-.1,.2)@.6 mouth(.08,-.02,.24)@1.2', L: 'front(.3,.16,.24)@0 high(.2,-.1,.2)@.6 mouth(.08,-.02,.24)@1.2' }, 'normal'),
    beast_chomp: C(0.9, { rotX: '0:-.2 .3:.32 .5:.1 .9:.04', posY: '0:.04 .3:-.04 .5:.08o .9:0', squash: '0:1 .3:1.12 .45:.88 .9:1' },
      { R: 'mouth(.08,-.02,.24)@0 mouth(.02,0,.14)@.3 chest(.24,.1,.1)@.9', L: 'mouth(.08,-.02,.24)@0 mouth(.02,0,.14)@.3 chest(.24,.1,.1)@.9' }, 'normal'),
    beast_chew: C(1.6, { squash: '0:1 .2:1.07 .4:.95 .6:1.07 .8:.95 1:1.07 1.2:.95 1.6:1', rotX: '0:.04 .8:-.04 1.6:.04', posY: '0:0 1.6:0' },
      { R: hold2('belly(.16,.04,.08)', 'belly(.2,-.04,.08)', 1.6), L: hold2('belly(.16,.04,.08)', 'belly(.2,-.04,.08)', 1.6) }, 'normal'),
  };
  for (const [id, clip] of Object.entries(BEAST)) clip.id = id;
  Object.assign(ANIMS, BEAST);
  const PHASES = [['grab', 1.2], ['lift', 1.2], ['chomp', 0.9], ['chew', 2.2]];
  const TOTAL = PHASES.reduce((a, [, l]) => a + l, 0);
  // 한 번 진행. 다 먹었으면 true
  function devour(s, m, D, dt) {
    const p = D.prey;
    D.t += dt;
    if (D.t >= TOTAL) return true;
    let acc = 0, ph = 'chew', u = 1;
    for (const [name, len] of PHASES) {
      if (D.t < acc + len) { ph = name; u = (D.t - acc) / len; break; }
      acc += len;
    }
    m.walking = false;
    m.act = 'bite';
    m.clip = 'beast_' + ph;
    const fx = Math.sin(m.angle), fz = Math.cos(m.angle);
    // 괴물 키(1.4배)에 맞춘 거리·높이: 앞으로 뻗은 두 손 → 입 앞
    const reach = ph === 'grab' ? 1.05 : ph === 'lift' ? 1.05 - u * 0.5 : ph === 'chomp' ? 0.55 - u * 0.4 : 0.15;
    const lift = ph === 'grab' ? u * 0.55 : ph === 'lift' ? 0.55 + u * 0.95 : 1.5;
    if (p && !p.gone) {
      p.held = true;
      p.walking = false;
      p.x = m.x + fx * reach;
      p.z = m.z + fz * reach;
      p.h = (m.h || 0) + lift;
      p.angle = m.angle + Math.PI;
      p.act = 'idle';
      p.clip = ph === 'grab' ? 'surprised' : 'wobble_fear';
      // 덥석 무는 순간 입 속으로 사라진다
      p.hidden = (ph === 'chomp' && u > 0.35) || ph === 'chew';
    }
    return false;
  }
  function devourDone(eco, m, D) {
    const p = D.prey;
    if (p) { p.held = false; p.hidden = false; }
    if (p && p.caught && !p.gone) eco.eaten(p);
    m.clip = null;
  }

  // 야생지대 괴물의 잡아먹기도 같은 연출로
  const tickBeast1 = E.tickBeast;
  E.tickBeast = function (c, dt) {
    const b = c.beast;
    if (b && !b.rampage && b.mode === 'eat' && b.prey && !c.gone) {
      const s = this.sim;
      if (!b.devour) b.devour = { prey: b.prey, t: 0 };
      if (devour(s, c, b.devour, dt)) {
        devourDone(this, c, b.devour);
        b.devour = null;
        b.prey = null;
        b.mode = 'go';
        b.spot = this.roamSpot(c);
        b.nextRaid = s.minutes + 300 + s.random() * 300;
      }
      return;
    }
    return tickBeast1.call(this, c, dt);
  };

  /* ---------- 사람 쪽: 출동·참전·도망 ---------- */
  function canFight(c) {
    if (c.monster || c.gone || c.rescue || c.fight || c.caught) return false;
    if (hp(c) < 30) return false;
    return true;
  }
  // 맞설지 도망갈지는 성격으로 정한다: 용감함이 바탕, 무기·힘·체력이 보태고, 그날 기분에 따라 조금 흔들린다
  function braveEnough(s, c) {
    const t = c.traits || {};
    let v = t.brave !== undefined ? t.brave : 0.35;
    if (root.Shop && root.Shop.owns(c, 'weapon')) v += 0.15;
    if (c.strong) v += 0.15;
    if (c.adopted) v += 0.05;
    v += (hp(c) - 70) / 300;
    v += (s.random() - 0.5) * 0.2;
    return v > 0.6;
  }
  function scare(s, c, m) {
    if (c.fight || c.rescue || c.caught || c.monster || c.gone) return;
    if (c.doing) s.abort(c, '');
    c.orders = [];
    const dx = c.x - m.x, dz = c.z - m.z, d = Math.hypot(dx, dz) || 1;
    const spot = s.snap({ x: m.x + (dx / d) * (FLEE + 8), z: m.z + (dz / d) * (FLEE + 8) }) || { x: c.x, z: c.z };
    c.flee = { from: m.id, spot, until: s.minutes + 25, frozen: dist(c, m) < 5 ? s.minutes + 1.5 : 0 };
    if (s.traits) s.traits.setFeel(c, 'scared', '난동 괴물을 봐서', 1);
  }

  function dispatch(s) {
    for (const m of rampagers(s)) {
      const R = m.beast.rampage;
      if (s.minutes - R.born < 0.5) continue;
      for (const c of s.chars) {
        if (c === m || c.monster || c.gone || c.rescue || c.caught) continue;
        const d = dist(c, m);
        if (c.hidden || c.fight || c.flee) continue;     // 집 안은 안전하다
        if (d >= JOIN) continue;
        // 근처에 있는 사람은 한 번 마음을 정한다 (같은 괴물에게 다시 묻지 않는다)
        c.rampMind = c.rampMind || {};
        if (c.rampMind[m.id] === undefined) c.rampMind[m.id] = canFight(c) && braveEnough(s, c);
        if (c.rampMind[m.id] && canFight(c)) { join(s, c, m, false); continue; }
        if (d < FLEE) scare(s, c, m);
      }
    }
  }
  function join(s, c, m, rush) {
    if (c.doing) s.abort(c, '');
    if (c.plate && c.plate.state === 'accepted') c.plate.state = 'failed';
    c.orders = [];
    c.hidden = false;
    c.flee = null;
    c.fight = { foe: m.id, slot: 0, since: s.minutes };
    c.prop = root.Persona && root.Persona.weaponOf ? root.Persona.weaponOf(c) : 'rod';
    const R = m.beast.rampage;
    if (!c.extra) s.note(`⚔️ ${c.name}: 무기를 들고 난동 괴물에게 맞서요`);
    if (s.traits) s.traits.setFeel(c, 'brave', '난동 괴물을 막으려고', 2);
  }

  const V = root.Village.Village.prototype;
  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    if (c.held && c.caught) return;          // 괴물 손에 붙잡힌 먹잇감은 스스로 움직이지 않는다
    if (c.rescue && c.fight) c.fight = null;
    if (c.fight && !c.rescue) return fightTick(this, c, dt);
    if (c.flee && !c.rescue && !c.fight) return fleeTick(this, c, dt);
    return tickChar0.call(this, c, dt);
  };

  function fightTick(s, c, dt) {
    const m = s.chars.find(o => o.id === c.fight.foe);
    if (!m || !m.monster || m.gone || !m.beast || !m.beast.rampage) {
      c.fight = null;
      c.prop = null;
      return;
    }
    // 둘러싸는 자리: 참전자마다 고르게
    const team = s.chars.filter(o => o.fight && o.fight.foe === m.id && !o.rescue);
    const i = team.indexOf(c);
    const a = (i / team.length) * Math.PI * 2 + 0.6;
    const slot = { x: m.x + Math.sin(a) * RING, z: m.z + Math.cos(a) * RING };
    c.prop = root.Persona && root.Persona.weaponOf ? root.Persona.weaponOf(c) : 'rod';
    if (dist(c, slot) > 0.7) {
      // 뛰어서 간다
      // 랏코는 눈 깜짝할 새에 닿는다
      const r = s.walk(c, slot, dt * (c.id === 'rakko' ? 2.6 : 1.5));
      if (r === null) { s.clearRoute(c); Object.assign(c, s.snap(slot) || slot); }
      return;
    }
    c.walking = false;
    c.act = 'confront';
    c.angle = Math.atan2(m.x - c.x, m.z - c.z);
    // 번갈아 친다: 한 사람씩 반 박자 어긋나게
    c.syncOff = i * 0.45;
    c.clip = c.id === 'rakko' || (i + Math.floor(s.minutes)) % 2 ? 'hunt_thrust' : 'train_swing';
    const power = s.persona ? s.persona.power(c) : 300;
    const R = m.beast.rampage;
    // 랏코: 닿자마자 일격(한 번), 그 뒤로도 다른 사람의 몇 배
    let dmg = (power / 1000) * 6.5 * dt;
    if (c.id === 'rakko') {
      dmg *= 4;
      if (!c.fight.struck) { c.fight.struck = true; dmg += 45; }
    }
    R.hp -= dmg;
    R.hitBy[c.id] = (R.hitBy[c.id] || 0) + dmg;
  }

  function fleeTick(s, c, dt) {
    const f = c.flee;
    const m = s.chars.find(o => o.id === f.from);
    const calm = !m || !m.monster || m.gone || !m.beast || !m.beast.rampage;
    if (s.minutes >= f.until || (calm && s.minutes >= f.until - 20)) {
      c.flee = null;
      c.clip = null;
      return;
    }
    if (f.frozen && s.minutes < f.frozen) { c.walking = false; c.clip = 'wobble_fear'; if (m) c.angle = Math.atan2(m.x - c.x, m.z - c.z); return; }
    if (dist(c, f.spot) > 0.8) {
      c.prop = null;
      const r = s.walk(c, f.spot, dt * 1.25);
      if (r === null) { s.clearRoute(c); f.spot = { x: c.x, z: c.z }; }
      return;
    }
    // 멀리서 떨며 지켜본다
    c.walking = false;
    c.act = 'idle';
    c.clip = 'wobble_fear';
    if (m) c.angle = Math.atan2(m.x - c.x, m.z - c.z);
  }

  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    if (this.ecology) dispatch(this);
  };

  root.Rampage = { rampagers, dispatch };
}(typeof self !== 'undefined' ? self : this));
