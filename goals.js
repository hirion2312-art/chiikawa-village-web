'use strict';

// 치이카와 심즈 — 목표 시스템 (설계: 2026-11-11 우사기 「목표 시스템 설계안」, 본인 확정 사항 반영)
// traits.js의 열망(3단계, 세기만 함)을 "행동을 움직이는 목표"로 키운다. traits.js는 고치지 않고 감싸서 붙인다.
//  - 평생 목표 + 단계 사다리. 지금 단계만 행동을 끌어당긴다 (+18, 마감·자존심이면 +30). 챔피언·알바생은 순환형
//  - 목표는 양념: 하루 목표 행동은 30%(압박 시 45%)까지만, 같은 행동 반복은 감점, 오늘 안 한 종류·장소는 가점
//  - 틈새 행동(쉬는 틈에 교과서 펴 보기·제자리 훈련), 아침 목표 시간, 시험 D-3 초조함, 정체(3일)·막힘(7일) 반응, 불합격 뒤 재도전
//  - 우사기는 목표 없음. 엑스트라는 성격에서 간이 목표 하나, 특례 엑스트라 둘은 "랭킹 1위"
(function (root) {
  const T = root.Traits;
  const ASP = T.ASPIRATIONS;
  const FEELS = T.FEELS;
  FEELS.worried = { label: '초조', icon: '😰', face: 'worried', hours: 3 };

  const isStudy = x => !!x.skill || /study/.test(x.id);
  const isFood = x => (x.gain && (x.gain.hunger || 0) >= 15) || /먹기|맛보기/.test(x.name || '');
  const SPRING = /^(rice|servers|misoBank|sausage|softcream|ramune|sobaSpring|akafuku|castella|bigPudding)\./;
  const TRAIN = /^hunt\.(train|sandbag|target|charge)|shrine\.shadow/;
  const finish = re => ev => ev.type === 'finish' && re.test(ev.x.id);
  const gradeAtLeast = g => c => (c.grade && c.grade <= g ? 1 : 0);
  const rankOf = (c, s) => s.persona.ranking().findIndex(o => o.c === c);
  const mains = s => s.chars.filter(o => !o.extra && !o.troupe && !o.monster);
  const seenOnce = (c, key) => !(c.aspSeen || []).includes(key) && (c.aspSeen = [...(c.aspSeen || []), key]);

  /* ---------- 캐릭터별 목표 사다리 ----------
     pull: 이 단계가 끌어당기는 상호작용 id. by(c, s): 남은 날 수(마감). loopFrom: 끝까지 가면 이 단계부터 다시(조금 더 어렵게) */
  const examBy = (c, s) => (c.exam && s.calendar ? s.calendar.daysLeft(c) : null);
  const LADDERS = {
    chiikawa: { name: '풀뽑기 1급, 그리고 토벌에 나가는 사람', icon: '🌱', steps: [
      { label: '검정 공부 5번', need: 5, count: ev => ev.type === 'finish' && isStudy(ev.x), pull: /study/ },
      { label: '풀뽑기 3번', need: 3, count: finish(/weeding\.weed/), pull: /take_grass|weeding\.weed/ },
      { label: '풀뽑기 5급 합격', need: 1, state: gradeAtLeast(5), pull: /exam\.study|home\.study|study/, by: examBy },
      { label: '풀뽑기 3급 합격', need: 1, state: gradeAtLeast(3), pull: /exam\.study|home\.study|study|take_grass/, by: examBy },
      { label: '풀뽑기 2급 합격', need: 1, state: gradeAtLeast(2), pull: /exam\.study|home\.study|study|take_grass/, by: examBy },
      { label: '풀뽑기 1급 합격', need: 1, state: gradeAtLeast(1), pull: /exam\.study|home\.study|study|take_grass/, by: examBy },
      { label: '토벌 훈련 3번 (첫 수료)', need: 3, count: finish(TRAIN), pull: TRAIN, timid: true },
      { label: '토벌 플레이트 첫 성공', need: 1, count: ev => ev.type === 'hunt', pull: /take_hunt/, timid: true },
    ] },
    hachiware: { name: '강한 사람이 되기', icon: '💪', steps: [
      { label: '토벌 훈련 3번', need: 3, count: finish(TRAIN), pull: TRAIN },
      { label: '토벌 플레이트 함께 나가기', need: 1, count: (ev, c) => ev.type === 'finish' && ev.x.plate === 'hunt', pull: /take_hunt/ },
      { label: '토벌 성공 1번', need: 1, count: ev => ev.type === 'hunt', pull: /take_hunt|hunt\.train/ },
      { label: '토벌 성공 3번', need: 3, count: ev => ev.type === 'hunt', pull: /take_hunt|hunt\.(train|sandbag)/ },
      { label: '토벌 랭킹 5위 안', need: 1, state: (c, s) => (rankOf(c, s) >= 0 && rankOf(c, s) < 5 ? 1 : 0), pull: /take_hunt|hunt\.(train|sandbag|target)/ },
      { label: '진짜 괴물 토벌 1번', need: 1, count: ev => ev.type === 'slay', pull: /take_hunt/ },
    ] },
    momonga: { name: '모두의 귀염둥이', icon: '🎀', steps: [
      { label: '귀여운 포즈 3번', need: 3, count: finish(/statue\.cute|mirror/), pull: /statue\.cute|pond\.mirror/ },
      { label: '서로 다른 3명과 수다', need: 3, count: (ev, c) => ev.type === 'chat' && !ev.o.extra && seenOnce(c, ev.o.id), social: true },
      { label: '친구(친밀도 60 이상) 4명', need: 4, state: (c, s) => mains(s).filter(o => o !== c && s.persona.bond(c, o) >= 60).length, social: true },
      { label: '친구 6명', need: 6, state: (c, s) => mains(s).filter(o => o !== c && s.persona.bond(c, o) >= 60).length, social: true },
      { label: '칭찬받기 5번', need: 5, count: ev => ev.type === 'praise', social: true, pull: /statue\.cute|pond\.mirror/ },
      { label: '모든 친구와 친구 되기', need: 7, state: (c, s) => mains(s).filter(o => o !== c && s.persona.bond(c, o) >= 60).length, social: true },
    ] },
    shisa: { name: '라멘 로의 열혈 알바생, 그리고 술 자격증', icon: '🍜', loopFrom: 4, steps: [
      { label: '라멘 로 알바 3번', need: 3, count: finish(/ramenRo\.(parttime|ramen_prep)/), pull: /ramenRo\.(parttime|ramen_prep)/ },
      { label: '라멘 로 알바 8번', need: 8, count: finish(/ramenRo\.(parttime|ramen_prep)/), pull: /ramenRo\.(parttime|ramen_prep)/ },
      { label: '술 자격 공부 3번', need: 3, count: finish(/sake_study/), pull: /sake_study/ },
      { label: '술 자격 합격', need: 1, state: c => (c.sakeLicense ? 1 : 0), pull: /sake_study|sake_exam|sakeExam/ },
      { label: '라멘 로 알바 15번', need: 15, count: finish(/ramenRo\.(parttime|ramen_prep)/), pull: /ramenRo\.(parttime|ramen_prep)/ },
      { label: '열혈 알바 25번 (자격 유지)', need: 25, count: finish(/ramenRo\.(parttime|ramen_prep)/), pull: /ramenRo\.(parttime|ramen_prep)/ },
    ] },
    rakko: { name: '토벌 1위를 지키며 진짜 괴물을 토벌', icon: '🥇', loopFrom: 2, steps: [
      { label: '토벌 훈련 3번', need: 3, count: finish(TRAIN), pull: TRAIN },
      { label: '정신 수양 2번', need: 2, count: finish(/shrine\.(focus|shadow)/), pull: /shrine\.(focus|shadow)/ },
      { label: '1위로 3일', need: 3, count: (ev, c, Tr) => ev.type === 'daily' && rankOf(c, Tr.sim) === 0, pull: /hunt\.train|rakko_hunt|shrine\.shadow/ },
      { label: '진짜 괴물 토벌 1번', need: 1, count: ev => ev.type === 'slay', pull: /rakko_hunt/ },
      { label: '1위로 7일', need: 7, count: (ev, c, Tr) => ev.type === 'daily' && rankOf(c, Tr.sim) === 0, pull: /hunt\.train|rakko_hunt|shrine\.shadow/ },
      { label: '진짜 괴물 토벌 3번', need: 3, count: ev => ev.type === 'slay', pull: /rakko_hunt/ },
    ] },
    kurimanju: { name: '세상의 맛있는 안주 다 맛보기', icon: '🍶', relaxed: true, steps: [
      { label: '한잔 2번', need: 2, count: ev => ev.type === 'finish' && ev.x.sake, pull: /kurimanjuHome\.|drink/ },
      { label: '다른 음식 4가지 맛보기', need: 4, count: (ev, c) => ev.type === 'finish' && isFood(ev.x) && seenOnce(c, ev.x.id), food: true },
      { label: '집에서 친구와 한잔', need: 1, count: (ev, c, Tr) => ev.type === 'finish' && ev.x.sake && ev.x.place === 'kurimanjuHome' && Tr.sim.chars.some(o => o !== c && !o.extra && o.doing && o.doing.x && o.doing.x.place === 'kurimanjuHome'), pull: /kurimanjuHome\./ },
      { label: '다른 음식 8가지 맛보기', need: 8, count: (ev, c) => ev.type === 'finish' && isFood(ev.x) && seenOnce(c, ev.x.id), food: true },
      { label: '솟는 곳 음식 8곳 맛보기', need: 8, count: (ev, c) => ev.type === 'finish' && SPRING.test(ev.x.id) && seenOnce(c, ev.x.place), pull: SPRING },
      { label: '친구와 한잔 3번', need: 3, count: (ev, c, Tr) => ev.type === 'finish' && ev.x.sake && Tr.sim.chars.some(o => o !== c && !o.extra && o.doing && o.doing.x && o.doing.x.place === ev.x.place), pull: /kurimanjuHome\.|drink/ },
    ] },
    furuhonya: { name: '헌책방을 마을의 사랑방으로', icon: '📚', steps: [
      { label: '헌책방 열기 3번', need: 3, count: finish(/market\.run_books/), pull: /market\.run_books/ },
      { label: '헌책 정리 3번', need: 3, count: finish(/sort_books/), pull: /sort_books/ },
      { label: '손님이 있을 때 헌책방', need: 1, count: (ev, c, Tr) => ev.type === 'finish' && /market\.run_books|sort_books/.test(ev.x.id) && Tr.sim.chars.some(o => o !== c && o.doing && o.doing.x && /books/.test(o.doing.x.id)), pull: /market\.(run_books|sort_books)/ },
      { label: '단골 손님 3명', need: 3, state: (c, s) => Object.values(s.bookRegulars || {}).filter(n => n >= 2).length, pull: /market\.(run_books|sort_books)/ },
      { label: '단골 손님 5명', need: 5, state: (c, s) => Object.values(s.bookRegulars || {}).filter(n => n >= 2).length, pull: /market\.(run_books|sort_books)/ },
      { label: '희귀본 손에 넣기', need: 1, state: c => (root.Bag && root.Bag.count(c, 'rare_book') ? 1 : 0), pull: /^recycle\.|sort_books/ },
    ] },
  };
  for (const [id, a] of Object.entries(LADDERS)) ASP[id] = a;
  // 우사기는 목표 없음 (본인 확정): 마을을 목표 중심으로 단조롭게 만들지 않는 다양성의 공급원
  delete ASP.usagi;

  // 엑스트라 간이 목표: 성격 하나 → 목표 하나. 깨면 같은 틀로 다시
  const EXTRA_GOALS = {
    glutton: { label: '솟는 곳 음식 3종 맛보기', need: 3, count: (ev, c) => ev.type === 'finish' && SPRING.test(ev.x.id) && seenOnce(c, ev.x.place), pull: SPRING },
    hothead: { label: '토벌 훈련 3번', need: 3, count: finish(TRAIN), pull: TRAIN },
    laidback: { label: '낮잠 3번', need: 3, count: finish(/nap|shade|bench/), pull: /nap|shade|bench/ },
    coward: { label: '친구와 수다 3번', need: 3, count: ev => ev.type === 'chat' },
    shy: { label: '단골 장소 만들기', need: 3, count: (ev, c) => ev.type === 'finish' && c.favPlace === ev.x.place, pull: null },
    rank: { label: '토벌 랭킹 1위', need: 1, state: (c, s) => (rankOf(c, s) === 0 ? 1 : 0), pull: /take_hunt|hunt\.(train|sandbag|target)/ },
  };

  /* ---------- 목표 읽기 ---------- */

  const P = T.prototype;
  // 순환할수록 조금씩 어려워진다. 7일 막히면 그 단계만 절반으로 (안전판)
  function needOf(c, a, st) {
    let n = Math.ceil(st.need * (1 + 0.5 * ((c.asp && c.asp.lap) || 0)));
    if (st.state) n = st.need;
    if (c.asp && c.asp.easedStage === c.asp.stage) n = Math.max(1, Math.ceil(n / 2));
    return n;
  }
  function goalOf(c) {
    if (c.extra) {
      if (!c.eg) return null;
      const g = EXTRA_GOALS[c.eg.kind];
      return g ? { step: g, n: c.eg.n, need: g.need, extra: true } : null;
    }
    const a = ASP[c.id];
    if (!a || !c.asp) return null;
    const st = a.steps[Math.min(c.asp.stage, a.steps.length - 1)];
    if (c.asp.stage >= a.steps.length) return null;
    return { a, step: st, n: c.asp.n, need: needOf(c, a, st) };
  }
  P.aspiration = function (c) {
    const a = ASP[c.id];
    if (!a || !c.asp) return null;
    const done = c.asp.stage >= a.steps.length;
    return {
      ...a, stage: c.asp.stage, n: c.asp.n, done, lap: c.asp.lap || 0,
      steps: a.steps.map(st => ({ ...st, need: needOf(c, a, st) })),
      dday: !done && a.steps[c.asp.stage].by ? a.steps[c.asp.stage].by(c, this.sim) : null,
      stall: c.asp.stall || 0,
    };
  };

  // 진행: 상태형은 지금 값, 횟수형은 사건마다. 끝까지 가면 순환형은 loopFrom부터 다시
  P.progress = function (c, ev) {
    if (c.extra) return extraProgress(this, c, ev);
    const a = ASP[c.id];
    if (!a || !c.asp || c.asp.stage >= a.steps.length) return;
    const st = a.steps[c.asp.stage];
    if (st.state) c.asp.n = Math.max(c.asp.n, st.state(c, this.sim));
    else if (st.count(ev, c, this)) c.asp.n += 1;
    const need = needOf(c, a, st);
    if (c.asp.n < need) return;
    c.asp.stage += 1;
    c.asp.n = 0;
    c.asp.stall = 0;
    c.aspSeen = [];
    let done = c.asp.stage >= a.steps.length;
    if (done && a.loopFrom !== undefined) {
      c.asp.stage = a.loopFrom;
      c.asp.lap = (c.asp.lap || 0) + 1;
      done = false;
    }
    // 과묵하면 짧게
    const quiet = this.has(c, 'quiet');
    this.react(c, { clip: 'jump_joy', say: quiet ? '…음.' : done ? '해냈다!!' : '좋아!', min: 4 }, true);
    this.setFeel(c, 'proud', done ? `평생 목표 "${a.name}"을(를) 이뤄서` : `"${st.label}"을(를) 해내서`, done ? 8 : 4);
    // 겁쟁이가 토벌 단계를 해내면 기쁨이 두 배
    const brave = st.timid && this.has(c, 'coward');
    this.sim.note(done ? `🌟 ${c.name}: 평생 목표 "${a.name}" 달성!` : `${a.icon} ${c.name}: ${st.label} ${brave ? '해냈어요! 무서웠는데…!' : '달성'} (${Math.min(c.asp.stage, a.steps.length)}/${a.steps.length}${c.asp.lap ? ` · ${c.asp.lap + 1}바퀴째` : ''})`);
    // 축하: 근처 친한 주민이 다가와 수다 걸 확률이 오른다
    c.celebrateUntil = this.sim.minutes + 90;
    this.count(c, 'milestone');
    const next = a.steps[c.asp.stage];
    if (!done && next && next.state) this.progress(c, { type: 'state' });
  };

  function extraProgress(Tr, c, ev) {
    if (!c.eg) return;
    const g = EXTRA_GOALS[c.eg.kind];
    if (!g) return;
    if (g.state) c.eg.n = g.state(c, Tr.sim);
    else if (g.count(ev, c, Tr)) c.eg.n += 1;
    if (c.eg.n >= g.need) {
      c.eg = { kind: c.eg.kind, n: 0 };
      c.aspSeen = [];
      Tr.react(c, { clip: 'jump_joy', min: 3 }, true);
    }
  }

  /* ---------- 하루 카운터와 다양성 ---------- */

  const CAT = x => (x.night ? 'sleep' : x === root.VillageObjects.CHAT || x.id === 'chat' ? 'chat' : isFood(x) ? 'eat' : TRAIN.test(x.id) || /hunt/.test(x.id) ? 'train'
    : isStudy(x) ? 'study' : x.earn || x.worth || x.shift || x.plate || x.takeKind ? 'work' : (x.gain.energy || 0) > 10 ? 'rest' : 'fun');
  // 꼭 해야 하는 일은 다양성 규칙에서 뺀다 (안 그러면 굶거나 잠을 못 잔다)
  const must = x => x.night || x.plate || x.takeKind || x.accept || x.settle || x.examTake || x.shift || x.isJob || (x.gain.hunger || 0) >= 40;
  const today = (c, s) => (c.gday && c.gday.day === s.day ? c.gday : (c.gday = { day: s.day, goal: 0, total: 0, cats: {}, places: {} }));

  function pressure(Tr, c, g) {
    const s = Tr.sim;
    if (!g || g.extra) return false;
    if (g.a.relaxed || Tr.has(c, 'laidback')) return false;
    if (c.id === 'rakko' && rankOf(c, s) > 0) return true;             // 자존심: 1위를 놓치면
    const left = g.step.by ? g.step.by(c, s) : null;
    return left !== null && left !== undefined && left <= 3;
  }
  function goalPts(Tr, c, g) {
    if (!g) return 0;
    if (g.extra) return 12;
    let v = g.a.relaxed ? 12 : 18;
    if (pressure(Tr, c, g)) v = c.id === 'shisa' ? 24 : 30;
    const s = Tr.sim;
    if (s.hour >= 6 && s.hour < 9) v += 8;                                // 아침은 목표 시간
    if (c.retryDay === s.day) v += 6;                                     // 떨어진 다음 날: 다시 해 보자
    const stall = (c.asp && c.asp.stall) || 0;
    if (stall >= 3) {
      if (Tr.has(c, 'hardworker') || Tr.has(c, 'diligent')) v += 6;       // 분발
      if (Tr.has(c, 'glutton') || Tr.has(c, 'drinker')) v = 0;            // 잠시 잊고 먹으러 간다
    }
    if (g.step.timid && Tr.has(c, 'coward')) v = Math.round(v / 2);       // 무서운 단계는 반만 끌린다
    return v;
  }
  const pullHit = (g, x) => !!g && !!g.step.pull && g.step.pull.test(x.id);

  const score0 = P.scoreBonus;
  P.scoreBonus = function (c, x) {
    let v = score0.call(this, c, x);
    const s = this.sim;
    const g = goalOf(c);
    const d = today(c, s);
    if (pullHit(g, x)) {
      // 하루 목표 행동 비율 상한: 넘었으면 오늘은 목표 행동을 고르지 않는다
      const cap = pressure(this, c, g) ? 0.45 : 0.3;
      if (d.goal >= 2 && d.goal / Math.max(1, d.total) > cap) v -= 40;
      else v += goalPts(this, c, g);
    }
    if (!must(x)) {
      // 최근 5번 안에 같은 행동: 한 번마다 -10 (최대 -30), 바로 앞과 같은 종류: -5
      const recent = (c.lastIds || []).filter(id => id === x.id).length;
      v -= Math.min(30, recent * 10);
      const cat = CAT(x);
      if (c.lastCat === cat) v -= 5;
      // 오늘 아직 안 한 종류·안 간 장소: +6
      if (!d.cats[cat] || !d.places[x.place]) v += 6;
    }
    return v;
  };

  // 실제로 고른 행동을 센다 (비율 상한·최근 기록)
  const V = root.Village.Village.prototype;
  const start0 = V.start;
  V.start = function (c, x, other, ordered) {
    const r = start0.call(this, c, x, other, ordered);
    if (x && this.traits && !ordered) {
      const d = today(c, this);
      d.total += 1;
      if (pullHit(goalOf(c), x)) d.goal += 1;
      const cat = CAT(x);
      d.cats[cat] = 1;
      d.places[x.place] = 1;
      c.lastCat = cat;
      c.lastIds = [...(c.lastIds || []), x.id].slice(-5);
    }
    return r;
  };

  /* ---------- 틈새 행동: 쉬는 틈에 목표 쪽 짧은 동작 ---------- */

  const NICHE = {
    chiikawa: { clip: 'study_home', prop: 'book', say: '…(교과서를 펴 본다)' },
    hachiware: { clip: 'train_swing', prop: 'rod' },
    rakko: { clip: 'train_swing', prop: 'rod' },
    momonga: { clip: 'oath_pose' },
    shisa: { clip: 'wipe_towel' },
    furuhonya: { clip: 'board_read', prop: 'book' },
  };
  // 목표가 있고, 오늘 상한에 안 걸렸고, 조금 전에 하지 않았으면 확률로
  function niche(Tr, c, chance) {
    const s = Tr.sim;
    const g = goalOf(c);
    const n = NICHE[c.id];
    if (!g || !n || c.hidden || c.reactLeft > 0 || s.minutes - (c.nicheAt || -999) < 50 || s.random() > chance) return false;
    const d = today(c, s);
    if (d.goal >= 2 && d.goal / Math.max(1, d.total) > 0.3) return false;
    c.nicheAt = s.minutes;
    c.reactClip = n.clip;
    c.reactLeft = 3 + s.random() * 2;
    if (n.prop) { c.prop = n.prop; c.nicheProp = s.minutes + c.reactLeft; }
    if (n.say) s.say(c, n.say, 3);
    Tr.count(c, 'niche');
    return true;
  }
  const idle0 = P.onIdle;
  P.onIdle = function (c) { return niche(this, c, 0.35) || idle0.call(this, c); };

  /* ---------- 하루 넘김: 정체·막힘, 초조함, 엑스트라 목표 ---------- */

  const tick0 = P.tick;
  P.tick = function (dt) {
    const s = this.sim;
    const newDay = this.goalDay !== s.day;
    tick0.call(this, dt);
    // 틈새 행동으로 쥐여 준 소품은 동작이 끝나면 내려놓는다
    for (const c of s.chars) if (c.nicheProp && s.minutes > c.nicheProp) { if (!c.doing) c.prop = null; c.nicheProp = 0; }
    if (!newDay) return;
    this.goalDay = s.day;
    for (const c of s.chars) {
      if (c.monster || c.gone) continue;
      if (c.extra) {
        if (!c.eg) c.eg = { kind: c.strong || c.scar ? 'rank' : (c.traitIds && c.traitIds[0]) || 'glutton', n: 0 };
        // 수줍음: 가장 자주 간 장소가 단골
        if (c.eg.kind === 'shy' && c.gday && !c.favPlace) c.favPlace = Object.keys(c.gday.places)[0] || null;
        continue;
      }
      if (!c.asp) continue;
      // 정체: 하루 동안 진행이 없으면 +1
      const snap = `${c.asp.stage}/${c.asp.n}/${c.asp.lap || 0}`;
      if (c.asp.snap === snap) c.asp.stall = (c.asp.stall || 0) + 1;
      else c.asp.stall = 0;
      c.asp.snap = snap;
      const stall = c.asp.stall;
      if (stall === 3 && (this.has(c, 'coward') || this.has(c, 'shy'))) {
        this.setFeel(c, 'sad', '목표가 좀처럼 안 돼서', 3);
        c.needsCheer = true;
      }
      // 7일 막히면 그 단계를 쉽게 (영원히 막히는 캐릭터가 없게)
      if (stall >= 7 && c.asp.easedStage !== c.asp.stage) {
        c.asp.easedStage = c.asp.stage;
        s.note(`${c.name}: 목표를 조금 쉽게 다시 잡았어요`);
      }
      // 마감이 다가오면 초조 (느긋하면 무시)
      const g = goalOf(c);
      if (pressure(this, c, g) && c.id !== 'rakko') this.setFeel(c, 'worried', '시험이 코앞이라', 6);
    }
  };

  // 시험: 떨어지면 다음 날 다시 해 보자
  const exam0 = P.onExam;
  P.onExam = function (c, r) {
    exam0.call(this, c, r);
    if (!c.extra && r && !r.pass && !r.absent) c.retryDay = this.sim.day + 1;
  };

  // 엑스트라도 목표가 센다 (원래 onFinish·onChat은 엑스트라를 건너뛴다)
  const fin0 = P.onFinish;
  P.onFinish = function (c, x) {
    fin0.call(this, c, x);
    const s = this.sim;
    // 일과 사이 빈틈: 하나를 마칠 때 가끔 목표 쪽 짧은 동작 (큰 목표 행동은 하루 1~2번, 나머지는 이렇게 섞인다)
    if (!c.extra && !x.night) niche(this, c, 0.22);
    if (c.extra) extraProgress(this, c, { type: 'finish', x });
    // 헌책방 단골: 손님이 책 구경을 마칠 때마다
    if (c.id !== 'furuhonya' && /market\.(books|book_smell)|books/.test(x.id) && x.place === 'market') {
      s.bookRegulars = s.bookRegulars || {};
      s.bookRegulars[c.id] = (s.bookRegulars[c.id] || 0) + 1;
    }
    // 희귀본: 후루혼야가 리사이클 숍을 뒤지거나 헌책을 정리하다 가끔 찾는다
    if (c.id === 'furuhonya' && /^recycle\.|sort_books/.test(x.id) && root.Bag && !root.Bag.count(c, 'rare_book') && s.random() < 0.06) {
      root.Bag.add(c, 'rare_book', 1);
      s.note('📕 후루혼야: 희귀본을 찾았어요!');
      this.react(c, { clip: 'jump_joy', min: 3 }, true);
    }
  };

  const chat0 = P.onChat;
  P.onChat = function (c, o) {
    chat0.call(this, c, o);
    const s = this.sim;
    if (c.extra) extraProgress(this, c, { type: 'chat', o });
    // 응원: 풀이 죽은 친구에게 말을 걸면 기운이 난다
    if (o.needsCheer && !c.extra) {
      o.needsCheer = false;
      this.setFeel(o, 'calm', `${c.name}이(가) 응원해 줘서`);
      s.persona.grow(c, o, 2);
      s.note(`${c.name}이(가) ${o.name}을(를) 응원했어요`);
    }
    // 모몽가 칭찬받기: 친한 상대가 귀엽다고 해 준다
    for (const [a, b] of [[c, o], [o, c]]) {
      if (a.id === 'momonga' && !b.extra && s.persona.bond(a, b) >= 50 && s.random() < 0.35) this.progress(a, { type: 'praise' });
    }
  };

  // 진짜 괴물을 쓰러뜨림 → 'slay'
  const E = root.Ecology && root.Ecology.prototype;
  if (E && E.slay) {
    const slay0 = E.slay;
    E.slay = function (c) {
      const r = slay0.call(this, c);
      if (r && this.sim.traits) this.sim.traits.progress(c, { type: 'slay' });
      return r;
    };
  }

  // 수다 상대 고르기: 응원이 필요한 친구, 목표를 막 이룬 친구에게 끌린다. 다정한 주민은 더
  const Pe = root.Persona.prototype;
  const cb0 = Pe.chatBonus;
  Pe.chatBonus = function (c, o) {
    let v = cb0.call(this, c, o);
    if (c.extra || o.extra) return v;
    const kind = this.sim.traits && this.sim.traits.has(c, 'kind');
    if (o.needsCheer && this.bond(c, o) >= 45) v += kind ? 30 : 18;
    if (o.celebrateUntil > this.sim.minutes && this.bond(c, o) >= 45) v += 12;
    // 모몽가의 사교 단계: 수다를 더 찾아다닌다
    const g = goalOf(c);
    if (g && g.step.social) v += 10;
    return v;
  };

  // 저장: 엑스트라 목표와 하루 기록 일부
  const save0 = P.save;
  P.save = function (c) { return { ...save0.call(this, c), eg: c.eg, retryDay: c.retryDay, favPlace: c.favPlace }; };
  const load0 = P.load;
  P.load = function (c, r) {
    load0.call(this, c, r);
    if (r.eg) c.eg = r.eg;
    if (r.retryDay) c.retryDay = r.retryDay;
    if (r.favPlace) c.favPlace = r.favPlace;
    // 예전 저장의 3단계 열망은 새 사다리 앞부분과 같으니 그대로 이어 간다. 우사기는 목표 없음
    if (c.id === 'usagi') c.asp = null;
    if (c.asp && c.asp.stage >= 3 && ASP[c.id] && c.asp.stage < ASP[c.id].steps.length) c.asp.n = c.asp.n || 0;
  };

  // 가방에 희귀본 표시
  if (root.Bag) {
    const list0 = root.Bag.list;
    root.Bag.list = c => {
      const out = list0(c);
      if (root.Bag.count(c, 'rare_book')) out.push({ group: '도구', icon: '📕', name: '희귀본', n: 1, note: '아주 오래된 책' });
      return out;
    };
  }

  /* ---------- 공부와 시험은 자격증이 목표인 주민만 (2026-11-11 이재헌 지시) ----------
     치이카와: 풀뽑기 검정 / 시사: 술 자격증. 나머지(우사기 포함)와 엑스트라는 공부도 시험도 하지 않는다.
     검정 공부·알바이터 공부·술 공부, 검정·알바이터·술 시험, 교과서 사기를 막고 시험 날짜도 잡지 않는다 */
  const CERT_GOAL = { chiikawa: ['grass'], shisa: ['sake'] };
  const certOK = (c, kind) => !c.extra && (CERT_GOAL[c.id] || []).includes(kind);
  const certKind = x => (x.skill === 'grass' || x.examTake === 'grass' || x.buy === 'grass_book' ? 'grass'
    : x.skill === 'arbiter' || x.examTake === 'arbiter' || x.buy === 'arb_book' ? 'arbiter'
    : x.sakeStudy || x.sakeExam || /sake_study/.test(x.id) ? 'sake' : null);
  const Lb = root.Labor.prototype;
  const blk0 = Lb.blocked;
  Lb.blocked = function (c, x) {
    const k = certKind(x);
    if (k && !certOK(c, k)) return '자격증에는 관심이 없어요';
    return blk0.call(this, c, x);
  };
  const C = root.Calendar && root.Calendar.prototype;
  if (C) {
    const cert0 = C.certOf;
    C.certOf = function (c) { return certOK(c, 'grass') ? cert0.call(this, c) : null; };
    const sch0 = C.schedule;
    C.schedule = function () {
      sch0.call(this);
      for (const c of this.sim.chars) if (!certOK(c, 'arbiter')) c.arbExam = null;
    };
  }

  root.Goals = { LADDERS, EXTRA_GOALS, goalOf, pressure: (Tr, c) => pressure(Tr, c, goalOf(c)) };
}(typeof self !== 'undefined' ? self : this));
