'use strict';

// 치이카와 심즈 — 길에서 마주치기 (2026-11-11 이재헌 지시)
// 친구끼리 우연히 가까이 지나가면 멈춰 서서 손을 흔들어 인사하고, 서로 마주 보며 잠깐 얘기한 뒤 하던 일로 돌아간다.
// 한쪽이 할 일이 없으면(서성이는 중) 친구가 가던 곳에 따라가 같이 한다 (동행)
// 시험·근무·노동·잠·밤길·급한 욕구·쓰러짐처럼 바쁠 때는 인사하지 않는다
(function (root) {
  const RANGE = 6.5;             // 이만큼 가까워지면 알아본다
  const FRIEND = 30;             // 아는 사이 이상
  const PAIR_COOL = 180;         // 같은 둘은 이만큼(게임 분) 지나야 다시
  const SOLO_COOL = 40;          // 한 사람은 이만큼 지나야 또 다른 친구와
  const WAVE = 0.9;              // 손 흔들기
  const TALK_MIN = 1.6, TALK_MAX = 3.2;

  const urgent = c => Object.values(c.needs).some(v => v < 25);
  const hardX = x => !!x && !!(x.night || x.examTake || x.shift || x.isJob || x.plate || x.takeKind || x.accept || x.settle || x.treat || x.show);
  // 지금 인사할 수 있는가: 걷는 중이거나 아무것도 안 하는 중, 바쁜 일이 아님
  function free(s, c) {
    if (c.extra || c.troupe || c.monster || c.gone || c.hidden || c.rescue || c.caught || c.greet || c.beat) return false;
    if (c.plate || c.orders.length || urgent(c) || c.reactLeft > 0) return false;
    if (s.hour >= 21 || s.hour < 7) return false;
    const d = c.doing;
    if (!d) return true;
    if (d.kind === 'chat' || d.ordered) return false;
    if (hardX(d.x)) return false;
    if (d.phase === 'walk' || c.walking) return true;
    return d.kind === 'obj' && !d.x.group && (d.x.gain.fun || 0) + (d.x.gain.energy || 0) > 0 && !(d.x.gain.hunger >= 20);
  }
  const moving = c => !c.doing || c.walking || c.doing.phase === 'walk';
  // 할 일이 없는가 (동행할 수 있는가)
  const idle = c => !c.doing || (c.doing.kind === 'obj' && !hardX(c.doing.x) && !(c.doing.x.gain.hunger >= 20) && !c.doing.x.only);

  const josa = (w, yes, no) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k <= 11171 && k % 28 ? yes : no); };
  const pairKey = (a, b) => (a.id < b.id ? `${a.id}+${b.id}` : `${b.id}+${a.id}`);

  function scan(s) {
    const now = s.minutes;
    s.greetLog = s.greetLog || {};
    const list = s.chars.filter(c => free(s, c) && now - (c.greetAt || -999) > SOLO_COOL);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.greet || b.greet) continue;
        if (Math.hypot(a.x - b.x, a.z - b.z) > RANGE) continue;
        if (!moving(a) && !moving(b)) continue;
        const bond = s.persona.bond(a, b);
        if (bond < FRIEND) continue;
        const key = pairKey(a, b);
        if (now - (s.greetLog[key] || -999) < PAIR_COOL) continue;
        // 사교적일수록, 친할수록 잘 멈춘다. 수줍음은 가끔 손만 흔들고 지나간다
        const shy = s.traits && (s.traits.has(a, 'shy') || s.traits.has(b, 'shy'));
        const p = 0.45 + bond / 200 + ((a.traits.social + b.traits.social) / 2 - 0.5) * 0.4;
        s.greetLog[key] = now;
        if (s.random() > p) continue;
        start(s, a, b, shy && s.random() < 0.5);
      }
    }
  }

  function start(s, a, b, waveOnly) {
    const now = s.minutes;
    const talk = waveOnly ? 0 : TALK_MIN + s.random() * (TALK_MAX - TALK_MIN) + (s.persona.bond(a, b) / 100) * 1.2;
    for (const [c, o] of [[a, b], [b, a]]) {
      c.greet = { with: o.id, from: now, wave: now + WAVE, until: now + WAVE + talk, angle: c.angle, walking: c.walking };
      c.greetAt = now;
      c.walking = false;
      c.angle = Math.atan2(o.x - c.x, o.z - c.z);
    }
    s.persona.grow(a, b, waveOnly ? 0.3 : 1);
    if (s.traits) { s.traits.count(a, 'greet'); s.traits.count(b, 'greet'); }
    s.greetCount = (s.greetCount || 0) + 1;
  }

  // 인사 중에는 멈춰 서서 손을 흔들고, 이어서 마주 보고 얘기한다
  const V = root.Village.Village.prototype;
  const tickChar0 = V.tickChar;
  V.tickChar = function (c, dt) {
    const g = c.greet;
    if (!g) return tickChar0.call(this, c, dt);
    const now = this.minutes;
    const o = this.chars.find(q => q.id === g.with);
    if (!o || o.rescue || o.monster || now >= g.until) return finish(this, c, o);
    c.walking = false;
    c.act = 'greet';
    if (o) c.angle = Math.atan2(o.x - c.x, o.z - c.z);
    if (now < g.wave) c.clip = 'wave';
    else {
      // 번갈아 말하고 맞장구친다 (말하는 쪽은 손짓, 듣는 쪽은 끄덕끄덕)
      const turn = Math.floor((now - g.wave) / 0.7) % 2 === (c.id < g.with ? 0 : 1);
      c.clip = turn ? 'talk_order' : 'chat_nod';
      if (!ANIMS[c.clip]) c.clip = 'chat_nod';
      // 끝나기 직전에 한 번 크게 맞장구
      if (g.until - now < 0.6 && ANIMS.agree_clap) c.clip = 'agree_clap';
    }
    // 서 있는 동안에도 욕구는 흐른다 (원래 틱이 하는 일 중 걷기만 멈춘다)
    return undefined;
  };

  function finish(s, c, o) {
    const g = c.greet;
    c.greet = null;
    c.act = null;
    c.clip = null;
    if (c.doing && c.doing.phase === 'walk') c.walking = true;
    // 동행: 내가 할 일이 없고 친구는 어딘가 가는 중이면 따라간다 (한쪽만 정한다)
    if (!o || c.id > o.id) return;
    const pair = [[c, o], [o, c]];
    for (const [tag, lead] of pair) {
      const x = lead.doing && lead.doing.kind === 'obj' ? lead.doing.x : null;
      if (!idle(tag) || !x || hardX(x) || (x.only && !x.only.includes(tag.id)) || (x.cost && tag.money < x.cost)) continue;
      if (s.labor && s.labor.blocked(tag, x)) continue;
      if (s.random() > 0.35 + s.persona.bond(tag, lead) / 200) continue;
      if (tag.doing) s.abort(tag, '');
      tag.orders = [{ x }];
      tag.tagAlong = { with: lead.id, until: s.minutes + 90 };
      s.note(`${tag.name}: 길에서 만난 ${josa(lead.name, '을', '를')} 따라 "${x.name}"에 같이 가요`);
      s.togetherWalks = (s.togetherWalks || 0) + 1;
      break;
    }
  }

  const update0 = V.update;
  V.update = function (dtReal) {
    update0.call(this, dtReal);
    // 1초(게임 0.25분)마다 둘러본다
    this.greetScan = (this.greetScan || 0) + 1;
    if (this.greetScan % 2 === 0 && this.persona) scan(this);
  };

  root.Encounters = { scan, free };
}(typeof self !== 'undefined' ? self : this));
