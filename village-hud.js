'use strict';

// 치이카와 심즈 — 우상단 인원 현황과 사건 팝업 (2026-11-11 이재헌 지시)
// - 우상단에 마을 인원: 지금 사는 주민 수, 괴물이 된 아이, 잡아먹혀 사라진 아이
// - 아이가 괴물이 되거나 잡아먹히면 우상단에 팝업이 잠깐 떴다 사라진다 (여러 개면 아래로 쌓인다)
// 시뮬레이션의 note를 듣고 화면만 그린다
(function (root) {
  const POP_SEC = 6;
  const css = `
  #villageHud { position: fixed; right: 14px; top: 14px; z-index: 25; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; font-family: "Jua", "Malgun Gothic", sans-serif; }
  #villageHud .count { display: flex; gap: 6px; padding: 6px 10px; background: #fffaf0; border: 2.5px solid #4a3230; border-radius: 16px; box-shadow: 0 3px 0 #4a3230; pointer-events: auto; }
  #villageHud .count span { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 14px; color: #4a3230; background: #fff3d6; border-radius: 10px; }
  #villageHud .count span.bad { background: #ece4f7; }
  #villageHud .count span.gone { background: #f6d5d5; }
  #villageHud .pop { max-width: 300px; padding: 9px 12px; font-size: 15px; line-height: 1.35; color: #4a3230; background: #fffaf0; border: 2.5px solid #4a3230; border-radius: 14px; box-shadow: 0 3px 0 #4a3230; animation: hudIn .25s ease-out; }
  #villageHud .pop.monster { background: #ece4f7; }
  #villageHud .pop.eaten { background: #f6d5d5; }
  #villageHud .pop.fight { background: #ffe08a; }
  #villageHud .pop.win { background: #d9f0cf; }
  #villageHud .pop.out { animation: hudOut .4s ease-in forwards; }
  #villageHud .pop small { display: block; margin-top: 2px; font-size: 12px; color: #8a7566; }
  @keyframes hudIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
  @keyframes hudOut { to { opacity: 0; transform: translateX(24px); } }
  @media (prefers-reduced-motion: reduce) { #villageHud .pop, #villageHud .pop.out { animation: none; } }
  @media (max-width: 760px) { #villageHud { top: 64px; right: 8px; } #villageHud .count span { font-size: 12px; padding: 2px 6px; } }
  `;
  let box = null;
  let count = null;
  function ensure() {
    if (box) return;
    const st = document.createElement('style');
    st.textContent = css;
    document.head.append(st);
    box = document.createElement('div');
    box.id = 'villageHud';
    box.setAttribute('aria-live', 'polite');
    count = document.createElement('div');
    count.className = 'count';
    count.title = '마을 인원 현황';
    box.append(count);
    document.body.append(box);
  }
  // 주민 = 괴물이 아니고 사라지지 않은 아이 (메인·엑스트라·파자마 파티즈)
  function tally(sim) {
    let live = 0, monster = 0, gone = 0;
    for (const c of sim.chars) {
      if (c.gone) gone += 1;
      else if (c.monster) monster += 1;
      else live += 1;
    }
    return { live, monster, gone };
  }
  let lastKey = '';
  function paint(sim) {
    ensure();
    const t = tally(sim);
    const key = `${t.live}/${t.monster}/${t.gone}`;
    if (key === lastKey) return;
    lastKey = key;
    const span = (cls, text, title) => { const s = document.createElement('span'); s.className = cls; s.textContent = text; s.title = title; return s; };
    count.replaceChildren(
      span('', `🏘️ 주민 ${t.live}`, '마을에 사는 아이'),
      span('bad', `👾 괴물 ${t.monster}`, '괴물이 된 아이'),
      span('gone', `🕳️ 사라짐 ${t.gone}`, '잡아먹혀 사라진 아이'),
    );
  }
  function pop(kind, text, sub) {
    ensure();
    const p = document.createElement('div');
    p.className = `pop ${kind}`;
    p.setAttribute('role', 'status');
    p.textContent = text;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; p.append(s); }
    box.append(p);
    // 너무 많이 쌓이면 오래된 것부터
    const pops = box.querySelectorAll('.pop');
    if (pops.length > 4) pops[0].remove();
    setTimeout(() => { p.classList.add('out'); setTimeout(() => p.remove(), 450); }, POP_SEC * 1000);
  }

  // 사건 듣기: ecology.js의 알림 문장
  const V = root.Village && root.Village.Village.prototype;
  if (V) {
    const note0 = V.note;
    V.note = function (text) {
      note0.call(this, text);
      if (typeof document === 'undefined') return;
      const when = `${this.day}일째 ${this.clock()}`;
      if (/괴물이 되었어요/.test(text)) pop('monster', '👾 아이 하나가 괴물이 되었어요', when);
      else if (/잡아먹혔어요/.test(text)) pop('eaten', '🕳️ 아이 하나가 잡아먹혔어요', `${when} · 어딘가에서 음식이 솟아요`);
      else if (/난동 괴물이 .*나타났어요/.test(text)) pop('monster', text.replace(/^👾 /, '👾 '), `${when} · 근처 주민은 도망쳐요`);
      else if (/무기를 들고 난동 괴물에게 맞서요/.test(text)) pop('fight', text, when);
      else if (/난동 괴물을 쓰러뜨렸어요|난동 괴물이 쓰러졌어요/.test(text)) pop('win', text, when);
      else if (/난동 괴물이 .*떠나/.test(text)) pop('monster', text, when);
    };
  }
  // 인원은 1초마다 다시 센다 (게임이 다 뜬 뒤부터)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    setInterval(() => { const g = window.game; if (g && g.sim && g.readyDone) paint(g.sim); }, 1000);
  }
  root.VillageHud = { tally, pop };
}(typeof self !== 'undefined' ? self : this));
