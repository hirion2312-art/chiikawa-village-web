'use strict';

// 치이카와 심즈 — 성격과 인간관계
// 화면을 모른다. 캐릭터별 시작 등급·공부 능력, 좋아하는 행동과 전용 행동, 친밀도, 기분 단계와 표정, 일거리의 세부 순서를 맡는다.
// 친밀도 초깃값과 선호도는 원작 인상을 바탕으로 한 게임용 수치다 (원작에 숫자가 있는 것은 아니다).
(function (root) {
  const { LIST, BY_ID } = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label, other) => ({ socket, act, min, clip, prop, label, other });
  const add = x => {
    LIST.push(x);
    BY_ID[x.id] = x;
  };

  /* ---------- 시험: 시작 등급과 공부 능력 ---------- */

  // 작중 확인된 등급만 적는다 (치이카와·하치와레 5급, 우사기 2급). 확인되지 않은 주민은 무자격(0)에서 5급 시험부터 본다
  // 시작 풀뽑기 등급 (2026-11-09 이재헌 지시): 작중에 나오는 시험을 게임 안에서 직접 응시하도록 그 바로 아래에서 시작한다.
  // 치이카와·하치와레는 작중 5급 합격 → 무자격에서 5급 응시. 우사기는 3급 보유 → 작중 2급 응시. 나머지는 미확인이라 무자격
  const GRADES = { usagi: 3 };
  // 공부 한 번이 쌓이는 양. 치이카와는 공부를 자주 하지만 잘 쌓이지 않는다
  const STUDY_GAIN = { chiikawa: 0.4 };

  /* ---------- 전투력: 캐릭터 설정에 맞춘 바탕값 + 훈련으로 조금 오른다 ---------- */

  // 순위 간격을 훈련 상한(+30)보다 넓게 두어 1위 랏코, 2위 흉터, 3위 강한 엑스트라가 뒤집히지 않는다
  const POWER_BASE = { rakko: 980, extra1: 930, extra2: 890, usagi: 820, kurimanju: 520, hachiware: 450, momonga: 350, chiikawa: 300, shisa: 260, furuhonya: 180 };
  const WEAPON = { rakko: 'w_sword', usagi: 'w_staff', extra1: 'w_club', extra2: 'w_spear', chiikawa: 'w_sasumata_pink', hachiware: 'w_sasumata_blue', momonga: 'w_sasumata_pink', shisa: 'w_sasumata_mint', kurimanju: 'w_sasumata_mint', furuhonya: 'w_sasumata_blue' };

  /* ---------- 좋아하는 행동 (id 정규식 → 점수) ---------- */

  const PREFS = {
    chiikawa: [[/takoyaki|softcream|machioka|rice\.rice|gumball/, 18], [/take_grass|weeding\.weed/, 22], [/take_hunt/, -35], [/goblin|yamanba|antlion|hole|arcade\.peek/, -28], [/plaza\.bench|pond\.look/, 10]],
    hachiware: [[/stage\.perform|cave\.sing/, 42], [/internet\.pc|market\.books|photo_stand/, 16], [/^cave\./, 14], [/take_lemon|take_grass/, 8]],
    usagi: [[/take_hunt|hunt\.train/, 26], [/sausage\.(sausage|feast)|ramen(Ro|Yama)\.ramen|bigPudding|castella|softcream|akafuku|spring_/, 26], [/plaza\.(dance|ura)|onsen\.bubble/, 22]],
    momonga: [[/statue\.(oath|cute)/, 30], [/umaiya|softcream|machioka|kissa|onsen\.bubble/, 24], [/take_/, -20]],
    shisa: [[/ramenRo\.parttime/, 70], [/kissa|shrine\.pray/, 10]],
    rakko: [[/hunt\.train/, 46], [/take_hunt/, 38], [/shrine\.(focus|pray)|statue\.bench|pier\.boat/, 16], [/take_grass|take_lemon/, -18]],
    kurimanju: [[/\.sake/, 75], [/sausage\.sausage|takoyaki|market\.pottery|rice\.rice/, 14], [/take_gather/, 10]],
    furuhonya: [[/market\.books|recycle\.|kissa/, 22], [/hunt\.|take_hunt/, -24]],
  };

  /* ---------- 전용 행동 ---------- */

  const sake = (id, place, name, seat, more = {}) => add({
    id, place, name, sake: true, only: ['kurimanju'], hours: [15, 24], cost: 200, gain: { fun: 34, energy: 4 }, ...more,
    steps: [
      S(seat, 'drink', 2, 'drink_pick', 'bottle', '술병을 꺼내는 중'),
      S(seat, 'drink', 3, 'drink_pour', 'bottle', '잔에 따르는 중'),
      S(seat, 'drink', 7, 'drink_sip', 'cup', '한 모금'),
      S(seat, 'drink', 2, 'drink_haa', null, '캬~'),
      S(seat, 'drink', 7, 'drink_sip', 'cup', '또 한 모금'),
      S(seat, 'drink', 2, 'drink_haa', null, '캬~'),
    ],
  });
  sake('kurimanjuHome.sake', 'kurimanjuHome', '집에서 한잔하기', 'study_sit');
  sake('hiroma.sake', 'hiroma', '모닥불 앞에서 한잔하기', 'bench_sit|table_sit_*', { group: true });
  add({ id: 'cave.sing', place: 'cave', name: '동굴에서 노래하기', only: ['hachiware'], hours: [9, 21], gain: { fun: 30 }, steps: [S('enter_stand', 'sing', 12, 'sing_mic', null, '노래 부르는 중'), S('enter_stand', 'idle', 2, 'idle_stretch', null, '숨 고르기')] });
  add({ id: 'sausage.feast', place: 'sausage', name: '배 터지게 먹기', only: ['usagi'], hours: [8, 21], gain: { hunger: 60, fun: 22 }, steps: [S('pull_stand', 'gather', 3, 'yank_pull', null, '힘껏 뜯어내는 중'), S('pull_stand', 'bite', 9, 'eat_bite', 'sausage', '우걱우걱'), S('pull_stand', 'bite', 6, 'eat_bite', 'sausage', '한 입 더'), S('pull_stand', 'idle', 2, 'belly_pat', null, '배 두드리기')] });
  add({ id: 'plaza.ura', place: 'plaza', name: '혼자 신나서 날뛰기', only: ['usagi'], hours: [9, 21], gain: { fun: 28, energy: -4 }, steps: [S('speaker_dance', 'dance', 6, 'dance_light'), S('speaker_dance', 'play', 3, 'bounce_big'), S('speaker_dance', 'play', 3, 'jump_joy')] });
  add({ id: 'statue.cute', place: 'statue', name: '귀여운 포즈 잡기', only: ['momonga'], hours: [8, 21], gain: { fun: 24, social: 6 }, steps: [S('oath_stand', 'pose', 4, 'oath_pose', null, '칭찬을 기다리는 중'), S('oath_stand', 'play', 2, 'jump_joy')] });
  add({ id: 'shrine.focus', place: 'shrine', name: '정신 수양', only: ['rakko'], hours: [6, 20], gain: { energy: 12, fun: 12 }, steps: [S('pray_stand', 'pray', 3, 'pray_bow'), S('pray_stand', 'pose', 10, 'oath_pose', null, '마음을 가다듬는 중')] });
  add({
    id: 'ramenRo.parttime', place: 'ramenRo', name: '라멘 로 아르바이트', only: ['shisa'], hours: [11, 20], earn: 900, gain: { energy: -12, fun: 6 },
    steps: [
      S('queue_bench', 'wipe', 6, 'wipe_towel', 'towel', '가게 앞 닦는 중'),
      S('counter_sit_5', 'cook', 12, 'cook_stir', null, '국물 젓는 중'),
      S('counter_sit_5', 'talk', 4, 'talk_order', null, '주문 받는 중'),
      S('counter_sit_5', 'wipe', 6, 'wipe_towel', 'towel', '카운터 닦는 중'),
      S('queue_bench', 'bow', 2, 'ramen_bow', null, '손님 배웅'),
    ],
  });

  /* ---------- 일거리: 단계를 잘게 나눈다 ---------- */

  // 풀뽑기는 8명이 하는데 봉투 놓는 자리가 하나면 줄이 막혀 일이 끊긴다
  Object.assign(root.ASSET_SOCKETS.weeding, { pile_2: [3.8, 3.4, 0.31, 3.8, 1.8], pile_3: [6.6, 3.4, 0.31, 6.6, 1.8], pile_4: [5.2, 4.9, 0.31, 5.2, 3.4] });
  const PILE = 'pile_stand|pile_2|pile_3|pile_4';
  const WORK = {
    'weeding.weed': [
      S('pull_*', 'look', 2, 'inspect_item', null, '풀 상태 살피는 중'),
      S('pull_*', 'weed', 11, 'weed_pull', null, '풀 뽑는 중'),
      S('pull_*', 'weed', 4, 'yank_pull', null, '뿌리 깊은 풀 잡아당기는 중'),
      S('pull_*', 'wipe', 1.5, 'wipe_towel', 'towel', '땀 닦는 중'),
      S('pull_*', 'weed', 11, 'weed_pull', null, '옆 구역으로 옮겨 뽑는 중', true),
      S('pull_*', 'weed', 4, 'yank_pull', null, '뿌리 깊은 풀 잡아당기는 중'),
      S('pull_*', 'gather', 3, 'gather_pick', null, '뽑은 풀을 봉투에 담는 중'),
      S(PILE, 'carry', 3, 'carry_pile', null, '봉투 옮기는 중'),
      S(PILE, 'idle', 1.5, 'belly_pat', null, '다 끝냈다'),
    ],
    'wilds.hunt': [
      S('enter_*', 'peek', 2, 'fear_peek', null, '살금살금 살피는 중'),
      S('enter_*', 'brave', 2, 'brave_up', null, '마음 다잡는 중'),
      S('fight_*', 'confront', 7, 'hunt_thrust', 'rod', '사스마타로 찌르는 중'),
      S('fight_*', 'confront', 1.5, 'wobble_fear', null, '반격에 움찔'),
      S('fight_*', 'confront', 7, 'hunt_thrust', 'rod', '다시 파고드는 중'),
      S('fight_*', 'confront', 5, 'train_swing', 'rod', '마지막 일격'),
      S('fight_*', 'look', 2, 'inspect_item', null, '쓰러졌는지 확인하는 중'),
    ],
    // 랏코: 망설임 없이 들어가 단숨에 베고 확인한다 (전용 전투 동작은 10번 작업에서 교체)
    'wilds.rakko_hunt': [
      S('enter_*', 'brave', 1.5, 'brave_up', null, '토벌 구역에 들어서는 중'),
      S('fight_*', 'confront', 6, 'train_swing', 'rod', '단숨에 베는 중'),
      S('fight_*', 'confront', 6, 'hunt_thrust', 'rod', '연속으로 베는 중'),
      S('fight_*', 'look', 2, 'inspect_item', null, '쓰러졌는지 확인하는 중'),
    ],
    'hunt.train': [
      S('charge_start', 'brave', 2, 'brave_up', null, '자세 잡는 중'),
      S('dummy_front|target_front', 'confront', 11, 'train_swing', 'rod', '휘두르기 연습'),
      S('dummy_front|target_front', 'wipe', 1.5, 'wipe_towel', 'towel', '땀 닦는 중'),
      S('dummy_front|target_front', 'confront', 11, 'hunt_thrust', 'rod', '찌르기 연습'),
    ],
    'wilds.gather': [
      S('gather_*', 'look', 2, 'inspect_item', null, '쓸 만한 것 고르는 중'),
      S('gather_*', 'gather', 12, 'gather_pick', null, '채집하는 중'),
      S('gather_*', 'gather', 4, 'yank_pull', null, '단단히 붙은 것 뜯는 중'),
      S('gather_*', 'gather', 10, 'gather_pick', null, '다른 자리에서 채집하는 중', true),
      S('gather_*', 'carry', 2, 'hold_chest', null, '모은 것 챙기는 중'),
    ],
    'lemon.sticker': [
      S('work_sit_*', 'work', 20, 'work_sticker', null, '스티커 붙이는 중'),
      S('work_sit_*', 'look', 3, 'inspect_item', null, '잘 붙었는지 확인하는 중'),
      S('work_sit_*', 'wipe', 2, 'wipe_towel', 'towel', '땀 닦는 중'),
      S('work_sit_*', 'work', 23, 'work_sticker', null, '스티커 붙이는 중'),
      S('work_sit_*', 'idle', 2, 'belly_pat', null, '한숨 돌리기'),
    ],
  };
  for (const [id, steps] of Object.entries(WORK)) if (BY_ID[id]) BY_ID[id].steps = steps;
  // 자리가 모자라면 건너뛰어도 일이 끊기지 않는 단계: 끝난 뒤 수건·우유, 플레이트 넘겨주는 동작
  for (const [id, from] of [['onsen.bath', 7], ['reception.take_grass', 1], ['reception.take_hunt', 1], ['reception.take_gather', 1], ['reception.take_lemon', 1]]) {
    if (BY_ID[id]) BY_ID[id].steps.slice(from).forEach(st => { st.optional = true; });
  }

  /* ---------- 집: 집주인과 친한 주민만 들어간다 ---------- */

  const HOMES = { home: 'chiikawa', cave: 'hachiware', momongaHome: 'momonga', shisaHome: 'shisa', rakkoHome: 'rakko', kurimanjuHome: 'kurimanju', furuhonyaHome: 'furuhonya' };
  const GUEST_BOND = 60;
  for (const id of ['cave.in', 'cave.tea', 'cave.cook']) if (BY_ID[id]) Object.assign(BY_ID[id], { only: null, guestOf: 'hachiware' });
  const visit = (place, owner, seat) => add({
    id: `${place}.visit`, place, name: '놀러 가기', guestOf: owner, needOwner: true, group: true, hours: [10, 20], gain: { social: 34, fun: 16 },
    steps: [S(seat, 'friend', 12, 'chat_nod', null, '수다 떠는 중'), S(seat, 'drink', 8, 'drink', 'cup', '차 얻어 마시는 중')],
  });
  visit('home', 'chiikawa', 'table_sit');
  for (const [p, o] of Object.entries(HOMES)) if (p !== 'home' && p !== 'cave') visit(p, o, 'study_sit');

  /* ---------- 친밀도 초깃값 (0~100, 서로 같다) ---------- */

  const PAIRS = [
    ['chiikawa', 'hachiware', 92], ['chiikawa', 'usagi', 82], ['hachiware', 'usagi', 82],
    ['chiikawa', 'kurimanju', 64], ['hachiware', 'kurimanju', 66], ['usagi', 'kurimanju', 62],
    ['hachiware', 'shisa', 68], ['chiikawa', 'shisa', 58], ['usagi', 'shisa', 46],
    ['hachiware', 'furuhonya', 66], ['chiikawa', 'furuhonya', 46], ['usagi', 'furuhonya', 36],
    ['usagi', 'rakko', 62], ['hachiware', 'rakko', 56], ['chiikawa', 'rakko', 42], ['rakko', 'kurimanju', 44], ['rakko', 'shisa', 36],
    ['usagi', 'momonga', 42], ['hachiware', 'momonga', 36], ['chiikawa', 'momonga', 30],
  ];
  const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const BASE = Object.fromEntries(PAIRS.map(([a, b, v]) => [pairKey(a, b), v]));

  /* ---------- 표정: 캐릭터마다 가진 표정으로 ---------- */

  const FACES = {
    chiikawa: { normal: 'normal', smile: 'normal_s', joy: 'joy_s', cry: 'excited', wail: 'panic', panic: 'wail', surprised: 'excited', nope: 'panic', worried: 'worried', tired: 'flustered_s', brave: 'brave_s', flustered: 'flustered', excited: 'brave_s', eating: 'eating_s' },
    hachiware: { normal: 'h-smile_s', smile: 'h-laugh', joy: 'h-laugh', cry: 'h-cry', wail: 'h-gasp', panic: 'h-gasp', surprised: 'h-wow', nope: 'h-nope', worried: 'h-worried', tired: 'h-sweat', brave: 'h-brave', flustered: 'h-flustered', excited: 'h-yay', eating: 'h-smile' },
    usagi: { normal: 'u-normal', smile: 'u-smile', joy: 'u-manic', cry: 'u-cry', wail: 'u-cry', panic: 'u-wow', surprised: 'u-wow', nope: 'u-calm', worried: 'u-cry', tired: 'u-calm', brave: 'u-cheer', flustered: 'u-wow', excited: 'u-manic', eating: 'u-tongue' },
    momonga: { normal: 'm-normal', smile: 'm-happy', joy: 'm-happy', cry: 'm-cry', wail: 'm-cry', panic: 'm-find', surprised: 'm-find', nope: 'm-nope', worried: 'm-cry', tired: 'm-sleepy', brave: 'm-proud', flustered: 'm-blank', excited: 'm-happy', eating: 'm-happy' },
    shisa: { normal: 's-normal', smile: 's-smile', joy: 's-joy', cry: 's-cry', wail: 's-cry', panic: 's-sick', surprised: 's-serious', nope: 's-serious', worried: 's-sick', tired: 's-sick', brave: 's-brave', flustered: 's-serious', excited: 's-joy', eating: 's-eating' },
    rakko: { normal: 'r-normal', smile: 'r-happy', joy: 'r-joy', cry: 'r-serious', wail: 'r-serious', panic: 'r-serious', surprised: 'r-serious', nope: 'r-serious', worried: 'r-serious', tired: 'r-serious', brave: 'r-serious', flustered: 'r-serious', excited: 'r-excited', eating: 'r-happy' },
    kurimanju: { normal: 'k-normal', smile: 'k-normal-alt3', joy: 'k-joy-alt', cry: 'k-sweat', wail: 'k-sweat', panic: 'k-sweat', surprised: 'k-sweat', nope: 'k-sweat', worried: 'k-sweat', tired: 'k-hangover', brave: 'k-normal', flustered: 'k-sweat', excited: 'k-excited', eating: 'k-normal', drunk: 'k-drunk', hangover: 'k-hangover' },
    furuhonya: { normal: 'f-normal', smile: 'f-happy', joy: 'f-joy', cry: 'f-gasp', wail: 'f-gasp', panic: 'f-gasp', surprised: 'f-gasp', nope: 'f-normal', worried: 'f-gasp', tired: 'f-normal', brave: 'f-read', flustered: 'f-gasp', excited: 'f-joy', eating: 'f-happy' },
  };
  const MOOD_FACE = { great: 'smile', ok: 'normal', bad: 'worried', tired: 'tired', hangover: 'hangover' };
  const SOFT_FACE = new Set(['normal', 'smile']);
  const HAPPY_FACE = new Set(['joy', 'excited']);
  const CLIP_FACE = { drink_sip: 'drunk', drink_haa: 'drunk' };
  const LOW_MOOD = new Set(['bad', 'tired', 'hangover']);

  /* ---------- 유저 얼굴 설정 (얼굴 설정 툴의 face-map.json) ----------
     우선순위: 게임에서 불러와 localStorage에 저장된 값 > window.FACE_MAP > 개발용 face-map.json fetch.
     없거나 깨졌으면 기본표 그대로 동작한다. 표의 키는 faceOwner 기준이다. */
  const FACE_KEYS = new Set(['normal', 'smile', 'joy', 'cry', 'wail', 'panic', 'surprised', 'nope', 'worried', 'tired', 'brave', 'flustered', 'excited', 'eating', 'drunk', 'hangover']);
  let FACE_OVER = null, FACE_OVER_RAW = null, FACE_OVER_FETCHED = null;
  if (typeof fetch === 'function') {
    fetch('face-map.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.faces) FACE_OVER_FETCHED = j; }).catch(() => {});
  }
  function faceOverride() {
    let raw = null;
    try { raw = localStorage.getItem('chiikawa-face-map'); } catch (e) {}
    if (raw !== FACE_OVER_RAW) {
      FACE_OVER_RAW = raw; FACE_OVER = null;
      if (raw) { try { const j = JSON.parse(raw); if (j && j.faces) FACE_OVER = j; } catch (e) {} }
    }
    if (FACE_OVER) return FACE_OVER;
    if (typeof window !== 'undefined' && window.FACE_MAP && window.FACE_MAP.faces) return window.FACE_MAP;
    return FACE_OVER_FETCHED;
  }
  const faceValidCache = new Map();
  function validExprIds(charId) {
    if (!faceValidCache.has(charId)) {
      let set = null;
      try { if (typeof expressionsFor === 'function') set = new Set(expressionsFor(charId).map(e => e.id)); } catch (e) {}
      faceValidCache.set(charId, set);
    }
    return faceValidCache.get(charId);
  }
  function overrideTableFor(c) {
    const over = faceOverride();
    if (!over || !over.faces) return null;
    let owner = c.id;
    try { if (typeof characterEntry === 'function') { const en = characterEntry(c.id); if (en) owner = en.faceOwner || en.id; } } catch (e) {}
    const raw = over.faces[owner] || over.faces[c.id];
    if (!raw) return null;
    const valid = validExprIds(c.id);
    const table = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!FACE_KEYS.has(k) || typeof v !== 'string') continue;
      if (valid && !valid.has(v)) continue;
      table[k] = v;
    }
    return Object.keys(table).length ? table : null;
  }
  function overrideMoodFace() {
    const over = faceOverride();
    if (!over || !over.moodFace) return MOOD_FACE;
    const merged = { ...MOOD_FACE };
    for (const [tier, key] of Object.entries(over.moodFace)) {
      if (tier in MOOD_FACE && FACE_KEYS.has(key)) merged[tier] = key;
    }
    return merged;
  }

  class Persona {
    constructor(sim) {
      this.sim = sim;
      this.seenDay = sim.day;
      for (const c of sim.chars) c.bonds = {};
      // 토벌 랭킹 2·3위: 강한 엑스트라 둘 (1번은 이마에 흉터)
      Object.assign(sim.chars.find(c => c.id === 'extra1') || {}, { strong: true, scar: true, name: '흉터 엑스트라' });
      Object.assign(sim.chars.find(c => c.id === 'extra2') || {}, { strong: true, name: '강한 엑스트라' });
    }
    static startGrade(c) {
      if (c.extra) return 5;
      return GRADES[c.id] !== undefined ? GRADES[c.id] : 0;
    }
    // 슈퍼 알바이터를 처음부터 가진 주민
    static startsWithArbiter(c) { return c.id === 'shisa'; }
    static studyGain(c) {
      return STUDY_GAIN[c.id] || 1;
    }

    /* 전투력과 토벌 랭킹 */
    power(c) {
      let base = POWER_BASE[c.id];
      if (base === undefined) {
        let h = 0;
        for (const ch of String(c.id)) h = (h * 31 + ch.charCodeAt(0)) % 997;
        base = 120 + (h % 160);
      }
      return Math.round(base + Math.min(c.huntSkill || 0, 100) * 0.3);
    }
    ranking() {
      return this.sim.chars.filter(c => !c.monster && !c.gone).map(c => ({ c, power: this.power(c) })).sort((a, b) => b.power - a.power);
    }
    static weaponOf(c) { return WEAPON[c.id] || 'w_sasumata_gray'; }

    /* 친밀도 */
    base(a, b) {
      if (a.extra && b.extra) return 12;
      if (a.extra || b.extra) return 8;
      const v = BASE[pairKey(a.id, b.id)];
      return v === undefined ? 25 : v;
    }
    bond(a, b) {
      const v = a.bonds[b.id];
      return v === undefined ? this.base(a, b) : v;
    }
    grow(a, b, amount) {
      const v = Math.max(0, Math.min(100, this.bond(a, b) + amount));
      a.bonds[b.id] = v;
      b.bonds[a.id] = v;
    }
    static bondLabel(v) {
      return v >= 80 ? '단짝' : v >= GUEST_BOND ? '친구' : v >= 30 ? '아는 사이' : '서먹서먹';
    }

    /* 집 출입 */
    blocked(c, x) {
      if (!x.guestOf || x.guestOf === c.id) return null;
      const owner = this.sim.chars.find(o => o.id === x.guestOf);
      if (!owner) return null;
      if (this.bond(c, owner) < GUEST_BOND) return '아직 친하지 않아요';
      if (x.needOwner && !this.ownerHome(owner, x.place)) return '집에 아무도 없어요';
      return null;
    }
    ownerHome(owner, place) {
      const p = this.sim.places[place];
      if (owner.hidden && !(owner.doing && owner.doing.x.place === place)) return false;
      return !!p && (Math.hypot(owner.x - p.x, owner.z - p.z) < 30 || !!(owner.doing && owner.doing.x.place === place));
    }

    /* 고르기 점수 */
    friendsAt(c) {
      const stamp = Math.floor(this.sim.minutes);
      if (c.friendStamp === stamp) return c.friendMap;
      const map = {};
      for (const o of this.sim.chars) {
        if (o === c || o.hidden || !o.doing || !o.doing.x || !o.doing.x.place) continue;
        const b = this.bond(c, o);
        if (b >= 45) map[o.doing.x.place] = Math.min(34, (map[o.doing.x.place] || 0) + (b / 100) * (b / 100) * 22);
      }
      c.friendStamp = stamp;
      c.friendMap = map;
      return map;
    }
    scoreBonus(c, x) {
      // 고르기는 자주 돌므로 캐릭터·행동별 선호 점수는 한 번만 계산해 둔다
      const cache = c.prefCache || (c.prefCache = new Map());
      let v = cache.get(x);
      if (v === undefined) {
        v = 0;
        for (const [re, pts] of PREFS[c.id] || []) if (re.test(x.id)) v += pts;
        // 치이카와는 공부를 자주 한다 (충분히 했으면 시험 쪽 감점이 이긴다)
        if (x.skill === 'grass' && c.id === 'chiikawa') v += 42;
        cache.set(x, v);
      }
      if (x.night) return v;
      if (c.strong && (x.takeKind === 'hunt' || x.train)) v += 45;
      v += this.friendsAt(c)[x.place] || 0;
      if (x.takeKind) {
        for (const o of this.sim.chars) if (o !== c && o.plate && o.plate.kind === x.takeKind) v += this.bond(c, o) * 0.3;
      }
      if (x.needOwner) {
        const owner = this.sim.chars.find(o => o.id === x.guestOf);
        if (owner) v += this.bond(c, owner) * 0.35;
      }
      return v;
    }
    chatFactor(c, o) { return 0.2 + (this.bond(c, o) / 100) * 2.4; }
    chatBonus(c, o) { const b = this.bond(c, o) / 100; return b >= 0.45 ? 34 * b * b : 0; }
    chatRange(c, o) { return this.bond(c, o) >= GUEST_BOND ? 220 : 90; }

    /* 같이 하자고 부르기: 하려는 일을 친한 주민이 곧 이어서 하게 한다 */
    invite(c, x) {
      const s = this.sim;
      if (c.extra || x.night || x.only || x.guestOf || x.examTake || x.accept || x.settle) return;
      if (!(x.group || x.takeKind || x.train || (x.gain.fun || 0) >= 10 || (x.gain.hunger || 0) >= 20)) return;
      if ((c.inviteAt || 0) > s.minutes) return;
      c.inviteAt = s.minutes + 40;
      const friends = s.chars.filter(o => o !== c && !o.extra && !o.monster && !o.hidden && this.bond(c, o) >= GUEST_BOND && !o.pull && !o.orders.length && Math.hypot(o.x - c.x, o.z - c.z) < 120)
        .sort((a, b) => this.bond(c, b) - this.bond(c, a));
      for (const o of friends.slice(0, 2)) {
        if (o.plate || (o.doing && (o.doing.x.night || o.doing.x.examTake))) continue;
        if ((x.cost && o.money < x.cost) || s.labor.blocked(o, x)) continue;
        o.pull = { x, until: s.minutes + 25 };
      }
    }
    takePull(c) {
      const p = c.pull;
      c.pull = null;
      const s = this.sim;
      if (!p || p.until < s.minutes || !s.open(p.x) || s.labor.blocked(c, p.x) || (p.x.cost && c.money < p.x.cost)) return null;
      return p.x.steps.every(st => s.freeSocket(c, p.x.place, st.socket, p.x.shared)) ? p.x : null;
    }

    /* 사건 */
    onChat(c, o) { this.grow(c, o, c.extra || o.extra ? 0.4 : 1.2); }
    onFinish(c, x) {
      const s = this.sim;
      if (!c.extra) {
        for (const o of s.chars) {
          if (o === c || o.extra || o.hidden || !o.doing || !o.doing.x || o.doing.x.place !== x.place) continue;
          this.grow(c, o, x.plate ? 0.3 : 0.15);
        }
      }
      if (x.sake) {
        const today = Math.floor(s.minutes / 1440);
        c.sakeCount = c.sakeDay === today ? (c.sakeCount || 0) + 1 : 1;
        c.sakeDay = today;
        if (c.sakeCount >= 2) c.hangoverUntil = (today + 1) * 1440 + 12 * 60;
      }
    }
    daily() {
      const s = this.sim;
      if (this.seenDay === s.day) return;
      this.seenDay = s.day;
      // 오래 안 만나면 처음 사이로 조금씩 돌아간다
      for (const c of s.chars) for (const id of Object.keys(c.bonds)) {
        const o = s.chars.find(q => q.id === id);
        if (o && c.bonds[id] > this.base(c, o)) c.bonds[id] = Math.max(this.base(c, o), c.bonds[id] - 0.4);
      }
    }

    /* 기분과 표정: 화면의 기분 글자와 얼굴이 같은 값을 쓴다 */
    tier(c) {
      if (c.hangoverUntil && c.hangoverUntil > this.sim.minutes) return 'hangover';
      const N = c.needs;
      const v = Object.values(N);
      const low = Math.min(...v);
      const avg = v.reduce((a, b) => a + b, 0) / v.length;
      if (low < 18) return N.energy === low ? 'tired' : 'bad';
      if (avg > 66 && low > 38) return 'great';
      return 'ok';
    }
    // clipFace: 지금 동작이 원하는 표정 이름 (없을 수 있다)
    faceFor(c, clipFace) {
      const base = FACES[c.id];
      const over = overrideTableFor(c);
      if (!base && !over) return null;
      const table = over ? { ...(base || {}), ...over } : base;
      const moodMap = overrideMoodFace();
      const mood = this.tier(c);
      let key = (c.clip && CLIP_FACE[c.clip]) || clipFace;
      const reacting = c.reactLeft > 0;
      // 감정(traits.js)이 있으면 기분보다 앞선다. 동작이 정한 순간 표정(놀람·울음)은 그대로 둔다
      const feel = this.sim.traits ? this.sim.traits.faceKey(c) : null;
      if (feel && (!key || SOFT_FACE.has(key))) return table[feel] || table[moodMap[mood]] || table.normal;
      if (!key || SOFT_FACE.has(key) || (HAPPY_FACE.has(key) && LOW_MOOD.has(mood) && !reacting)) key = moodMap[mood];
      return table[key] || table[moodMap[mood]] || table.worried || table.normal;
    }

    save(c) { return { bonds: c.bonds, hangoverUntil: c.hangoverUntil, huntWins: c.huntWins }; }
    load(c, r) {
      if (r.bonds) c.bonds = r.bonds;
      if (r.hangoverUntil) c.hangoverUntil = r.hangoverUntil;
      if (r.huntWins) c.huntWins = r.huntWins;
    }
  }
  root.Persona = Persona;
  // 얼굴 설정 툴(face-tool.js)이 기본표와 상황 목록을 읽는다
  Persona.FACES = FACES;
  Persona.FACE_KEYS = [...FACE_KEYS];
  Persona.MOOD_FACE = MOOD_FACE;
}(typeof self !== 'undefined' ? self : this));
