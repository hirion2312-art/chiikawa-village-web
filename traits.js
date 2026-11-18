'use strict';

// 치이카와 심즈 — 성격: 특성·감정·버릇·상황 반응·열망 (설계: docs/personality-design.md)
// 화면을 모른다. village-sim.js가 점수·쉬는 시간·사건마다 부르고, game.js는 감정(c.feel)으로 표정을, 패널은 열망을 보여 준다.
// 특성 내용과 수치는 원작 인상을 바탕으로 한 게임용 해석이다 (원작에 숫자가 있는 것은 아니다).
(function (root) {
  const { LIST, BY_ID, CHAT } = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop, label });
  const add = x => {
    LIST.push(x);
    BY_ID[x.id] = x;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const pick = (list, r) => list[Math.floor(r * list.length) % list.length];

  /* ---------- 행동 분류 ---------- */

  const isFood = x => (x.gain.hunger || 0) >= 15;
  const isWork = x => !!(x.earn || x.plate || x.takeKind || x.worth) || /\.job_|parttime|weeding\.weed|wilds\.(hunt|gather)|lemon\.sticker|run_books|sort_books|ramen_prep/.test(x.id);
  const isStudy = x => !!x.skill || /study/.test(x.id);
  const isFun = x => (x.gain.fun || 0) >= 12 && !isWork(x);

  /* ---------- 감정: 한 번에 하나, 몇 시간 동안 얼굴과 선택에 남는다 ---------- */

  const FEELS = {
    excited: { label: '신남', icon: '✨', face: 'excited', hours: 2 },
    proud: { label: '뿌듯', icon: '🌟', face: 'joy', hours: 4 },
    sad: { label: '서러움', icon: '💧', face: 'cry', hours: 3 },
    scared: { label: '무서움', icon: '😨', face: 'panic', hours: 1 },
    calm: { label: '평온', icon: '🍵', face: 'smile', hours: 3 },
    brave: { label: '투지', icon: '🔥', face: 'brave', hours: 2 },
    sulky: { label: '뾰로통', icon: '💢', face: 'nope', hours: 1.5 },
  };
  // 감정이 고르기에 주는 영향
  function feelBonus(feel, x) {
    if (!feel) return 0;
    if (feel === 'excited' && isFun(x)) return 10;
    if (feel === 'sad' && /^home\.|^cave\.|kissa|onsen\.bath|plaza\.bench|statue\.bench|\.shade/.test(x.id)) return 14;
    if (feel === 'brave' && /hunt|train/.test(x.id)) return 16;
    if (feel === 'sulky' && isWork(x)) return -18;
    if (feel === 'scared' && /goblin|yamanba|antlion|hole|smallCave|arcade\.peek|wilds\.hunt|take_hunt/.test(x.id)) return -40;
    return 0;
  }

  /* ---------- 특성 ---------- */
  // likes: [정규식 또는 함수, 점수]   quirks: 쉴 때 버릇 { clip, say, feel?, when? }   on: 사건 반응 { 사건: { clip, say, feel, why, p, min } }

  const GENERIC_REST = /\.bench$|\.wait$|\.shade$|el_bench|\.rest$|queue_bench\.|wait_stand\./;
  const SCARY = /goblin|yamanba|antlion|hole|smallCave|arcade\.peek|seaCave|take_hunt|wilds\.hunt/;
  const TRAITS = {
    coward: {
      name: '겁쟁이', icon: '🫣', desc: '무서운 곳은 피하고, 괴물을 보면 떨며 물러난다.',
      likes: [[/^home\.|^cave\.(in|tea)|kissa|plaza\.bench/, 8], [SCARY, -30]],
      quirks: [{ clip: 'fear_peek', say: ['…', '히익'], when: (c, T) => T.nightOut(c) }, { clip: 'tilt_look', say: ['…?', '무슨 소리…'] }],
      on: { monster: { clip: 'wobble_fear', say: '히익…!', feel: 'scared', why: '괴물을 봐서', flee: true } },
    },
    crybaby: {
      name: '울보', icon: '💧', desc: '일이 잘 안 풀리면 운다. 기쁠 때도 운다.',
      likes: [],
      quirks: [{ clip: 'cry', say: ['훌쩍…'], when: (c, T) => T.feelIs(c, 'sad') || T.sim.persona.tier(c) === 'bad' }],
      on: {
        fail: { clip: 'cry', say: '흐윽…', feel: 'sad', why: '일이 잘 안 돼서', p: 0.8 },
        examFail: { clip: 'cry', say: '흐아앙…', feel: 'sad', why: '시험에 떨어져서', min: 5 },
        examPass: { clip: 'cry', say: '으앙… 붙었어…!', feel: 'proud', why: '시험에 붙어서', min: 4 },
      },
    },
    hardworker: {
      name: '노력파', icon: '💪', desc: '공부와 일을 꾸준히 한다. 떨어져도 다시 마음을 다잡는다.',
      likes: [[isStudy, 12], [/weeding\.weed/, 10], [isWork, 5]],
      quirks: [{ clip: 'brave_up', say: ['좋아…!', '힘내자'] }],
      on: {
        work: { clip: 'brave_up', say: '해냈다…!', feel: 'proud', why: '일을 끝내서', p: 0.5 },
        examFail: { clip: 'brave_up', say: '다음엔 꼭…!', feel: 'brave', why: '다음 시험을 다짐해서' },
      },
    },
    optimist: {
      name: '낙천가', icon: '🌤️', desc: '안 좋은 일이 있어도 금방 털고 웃는다. 서러운 감정이 빨리 지나간다.',
      likes: [[isFun, 6]],
      quirks: [{ clip: 'idle_hum', say: ['♪', '흥흥~'] }],
      on: {
        fail: { clip: 'idle_hum', say: '어떻게든 되겠지~', feel: 'calm', why: '금방 털어 내서', p: 0.7 },
        examFail: { clip: 'idle_hum', say: '다음에 붙으면 돼~', feel: 'calm', why: '금방 털어 내서' },
      },
    },
    singer: {
      name: '노래쟁이', icon: '🎤', desc: '노래와 공연을 좋아한다. 쉴 때도 흥얼거린다.',
      likes: [[/sing|perform|music|busk|stage\.watch|speaker|stargaze/, 16]],
      quirks: [{ clip: 'idle_hum', say: ['♪~', '라라~'] }, { clip: 'sing_mic', say: ['라라라~♪'] }],
      on: { perform: { clip: 'jump_joy', say: '신난다~!', feel: 'excited', why: '노래를 불러서' } },
    },
    kind: {
      name: '다정함', icon: '💗', desc: '친구를 잘 챙긴다. 우는 친구가 가까이 있으면 달래러 간다.',
      likes: [[x => (x.gain.social || 0) >= 10, 6]],
      quirks: [{ clip: 'wave', say: ['좋은 날이다~'], when: (c, T) => T.near(c, 12) }],
      on: {},
      comforts: true,
    },
    wild: {
      name: '예측불가', icon: '⚡', desc: '갑자기 펄쩍 뛰고 소리친다. 하던 놀이도 불쑥 바꾼다.',
      likes: [[/ura|dance|climb|slide|charge/, 12]],
      quirks: [{ clip: 'bounce_big', say: ['야하!', '우라!'] }, { clip: 'jump_joy', say: ['하!', '야~하!'] }, { clip: 'point_ooh', say: ['후루룩?'] }],
      on: { fail: { clip: 'bounce_big', say: '야하?!', feel: 'excited', why: '그냥', p: 0.7 } },
      restless: true,
    },
    glutton: {
      name: '먹보', icon: '🍙', desc: '먹을 것이라면 어디든 간다. 다 먹으면 배를 두드린다.',
      likes: [[isFood, 14], [/spring_|sausage|softcream|rice\.rice|bigPudding|castella|catch_/, 10]],
      quirks: [{ clip: 'belly_pat', say: ['배고파…', '꼬르륵'], when: c => c.needs.hunger < 60 }, { clip: 'point_ooh', say: ['맛있겠다…'] }],
      on: { eat: { clip: 'belly_pat', say: '후우~ 배불러', feel: 'calm', why: '배불리 먹어서', p: 0.6 } },
    },
    hothead: {
      name: '열혈', icon: '🔥', desc: '토벌과 훈련이라면 앞장선다. 괴물을 보면 달려들 자세를 잡는다.',
      likes: [[/hunt|train|charge/, 16], [isStudy, -10]],
      quirks: [{ clip: 'brave_up', say: ['우라!', '하앗!'] }],
      on: { monster: { clip: 'brave_up', say: '우라!', feel: 'brave', why: '괴물을 봐서' } },
    },
    attention: {
      name: '관심종자', icon: '🎀', desc: '사람 많은 곳을 좋아하고, 누가 보이면 귀여운 포즈로 칭찬을 조른다.',
      likes: [[/statue\.cute|stage|dance|plaza|mirror/, 10]],
      quirks: [{ clip: 'oath_pose', say: ['칭찬해 줘!', '나 귀엽지?'], when: (c, T) => T.near(c, 14) }],
      on: { chat: { clip: 'jump_joy', say: '헤헤', feel: 'excited', why: '관심을 받아서', p: 0.4 } },
    },
    selfish: {
      name: '제멋대로', icon: '😤', desc: '하고 싶은 것만 한다. 일은 하기 싫어한다.',
      likes: [[/softcream|machioka|umaiya|kissa|peek_plate/, 10], [isWork, -14]],
      quirks: [{ clip: 'idle_yawn', say: ['심심해…'] }],
      on: { work: { clip: 'idle_yawn', say: '치… 힘들어', feel: 'sulky', why: '일을 해서', p: 0.5 } },
    },
    diligent: {
      name: '성실', icon: '🧹', desc: '맡은 일은 끝까지 한다. 일을 마치면 꾸벅 인사한다.',
      likes: [[isWork, 10]],
      quirks: [{ clip: 'idle_stretch', say: ['자, 다음!', '정리 정리'] }],
      on: { work: { clip: 'ramen_bow', say: '수고하셨습니다', feel: 'proud', why: '일을 잘 마쳐서', p: 0.5 } },
    },
    friendly: {
      name: '친절', icon: '👋', desc: '누구에게나 먼저 인사한다.',
      likes: [[/kissa|ramenRo|umaiya|mucha/, 6]],
      quirks: [{ clip: 'wave', say: ['안녕하세요!', '어서 오세요~'], when: (c, T) => T.near(c, 12) }],
      on: { chat: { clip: 'wave', say: '또 봐요!', feel: 'calm', why: '이야기를 나눠서', p: 0.4 } },
    },
    warrior: {
      name: '무인', icon: '⚔️', desc: '수련을 거르지 않는다. 괴물 앞에서 곧장 맞선다.',
      likes: [[/hunt\.train|shrine\.(focus|pray)|take_hunt|wilds\.hunt|shadow/, 14], [/dance|bubble|ura|arcade|frog_look/, -10]],
      quirks: [{ clip: 'train_swing', say: ['…', '흡'] }, { clip: 'brave_up', say: ['…'] }],
      on: {
        monster: { clip: 'brave_up', say: '…', feel: 'brave', why: '괴물을 봐서' },
        train: { clip: 'oath_pose', say: '아직 멀었다', feel: 'calm', why: '수련을 마쳐서', p: 0.4 },
      },
    },
    quiet: {
      name: '과묵', icon: '🤐', desc: '말수가 적다. 수다보다 혼자 있는 쪽이 편하다.',
      likes: [],
      chatMul: 0.6,
      quirks: [{ clip: 'oath_pose', say: ['…'] }],
      on: {},
    },
    drinker: {
      name: '애주가', icon: '🍶', desc: '저녁이면 한잔이 생각난다.',
      likes: [[/\.sake|snack_make/, 10]],
      quirks: [{ clip: 'drink_haa', say: ['캬~', '한잔하고 싶다'], when: (c, T) => T.sim.hour >= 16 }],
      on: { sake: { clip: 'drink_haa', say: '좋구나~', feel: 'calm', why: '한잔해서', p: 0.6 } },
    },
    laidback: {
      name: '느긋함', icon: '🛋️', desc: '서두르지 않는다. 쉬는 자리를 좋아하고 긴 일은 싫어한다.',
      likes: [[/bench|shade|onsen|sauna|hiroma\.(fire|gather)|kissa|\.rest|\.wait/, 12], [isWork, -8]],
      quirks: [{ clip: 'idle_yawn', say: ['하암…', '느긋하게~'] }],
      on: { morning: { clip: 'idle_yawn', say: '하아암…', feel: 'calm', why: '아침이라' } },
    },
    gourmet: {
      name: '미식가', icon: '🍡', desc: '처음 먹어 보는 음식을 찾아다닌다. 같은 것만 먹으면 질린다.',
      likes: [[(x, c) => isFood(x) && !(c.tasted || []).includes(x.id), 12], [(x, c) => isFood(x) && (c.tasted || []).slice(-2).includes(x.id), -10]],
      quirks: [{ clip: 'smell_flower', say: ['음~ 좋은 냄새'] }],
      on: { taste: { clip: 'jump_joy', say: '음~! 이 맛이야', feel: 'excited', why: '새 음식을 맛봐서' } },
    },
    bookworm: {
      name: '책벌레', icon: '📚', desc: '책과 글이라면 무엇이든 읽는다.',
      likes: [[/books|recycle|kissa|board|sign_look|plaque|notice|flyer|book_smell/, 14]],
      quirks: [{ clip: 'read_nod', say: ['흠흠', '그렇구나…'] }],
      on: { read: { clip: 'read_nod', say: '좋은 책이었다', feel: 'calm', why: '책을 읽어서', p: 0.5 } },
    },
    shy: {
      name: '수줍음', icon: '🙈', desc: '사람이 많은 곳은 쑥스럽다.',
      likes: [[(x, c, T) => T.crowd(x, c) >= 2, -12]],
      quirks: [{ clip: 'tilt_look', say: ['…'], when: (c, T) => !T.near(c, 10) }],
      on: { crowd: { clip: 'fear_peek', say: '…', feel: 'scared', why: '사람이 많아서', p: 0.5 } },
    },
  };

  /* ---------- 캐릭터 시트 ---------- */

  const CAST_TRAITS = {
    chiikawa: ['coward', 'crybaby', 'hardworker'],
    hachiware: ['optimist', 'singer', 'kind'],
    usagi: ['wild', 'glutton', 'hothead'],
    momonga: ['attention', 'selfish', 'glutton'],
    shisa: ['diligent', 'friendly', 'hardworker'],
    rakko: ['warrior', 'quiet', 'diligent'],
    kurimanju: ['drinker', 'laidback', 'gourmet'],
    furuhonya: ['bookworm', 'shy', 'diligent'],
  };
  // 단골 장소: 같은 욕구도 저마다 다른 곳에서 채운다 (씻기는 시사는 사우나, 쿠리만쥬는 온천 같은 식)
  const HAUNTS = {
    chiikawa: /^home\.|weeding\.weed|exam\.study|machioka|market\.takoyaki|el_planter/,
    hachiware: /^cave\.|^stage\.perform|plaza\.(busk|stargaze|music)|internet/,
    usagi: /sausage|spring_|bigPudding|castella|hunt\.(charge|train)|plaza\.(ura|dance)|catch_/,
    momonga: /^statue\.|softcream|kissa\.usual|stage\.watch|pond\.mirror|market\.peek_plate/,
    shisa: /^ramenRo\.|^sauna\.|^shisaHome\.|^soba\./,
    rakko: /^shrine\.|hunt\.train|^umaiya\.|^rakkoHome\.|^pochette\./,
    kurimanju: /^hiroma\.|\.shade$|^kurimanjuHome\.|^misoBank\.|^onsen\./,
    furuhonya: /market\.(books|run_books|sort_books|book_smell)|^recycle\.|kissa\.tea|^furuhonyaHome\./,
  };
  const HAUNT_PTS = 12;
  const EXTRA_POOL = ['coward', 'hothead', 'laidback', 'glutton', 'shy'];

  /* ---------- 열망: 단계 3개. 지금 단계만 센다 ---------- */
  // ev: { type: 'finish'|'exam'|'chat'|'daily', x, r, o }. 돌려준 수만큼 진행한다

  const crowdAt = (T, c, place, re) => T.sim.chars.filter(o => o !== c && !o.hidden && !o.monster && o.doing && o.doing.x && o.doing.x.place === place && o.doing.phase === 'use' && (!re || re.test(o.doing.x.id))).length;
  const ASPIRATIONS = {
    chiikawa: { name: '풀뽑기 검정 합격', icon: '🌱', steps: [
      { label: '검정 공부 5번', need: 5, count: ev => ev.type === 'finish' && isStudy(ev.x) },
      { label: '풀뽑기 3번', need: 3, count: ev => ev.type === 'finish' && /weeding\.weed/.test(ev.x.id) },
      { label: '풀뽑기 검정 합격', need: 1, count: ev => ev.type === 'exam' && ev.r.pass && ev.r.cert !== 'arbiter' },
    ] },
    hachiware: { name: '노래로 모두를 웃게', icon: '🎤', steps: [
      { label: '노래 연습 3번', need: 3, count: ev => ev.type === 'finish' && /cave\.sing|stargaze/.test(ev.x.id) },
      { label: '무대·광장 공연 2번', need: 2, count: ev => ev.type === 'finish' && /stage\.perform|busk/.test(ev.x.id) },
      { label: '관객 2명 앞에서 공연', need: 1, count: (ev, c, T) => ev.type === 'finish' && /stage\.perform|busk/.test(ev.x.id) && crowdAt(T, c, ev.x.place) >= 2 },
    ] },
    usagi: { name: '야생지대 최강', icon: '⚔️', steps: [
      { label: '토벌 훈련 2번', need: 2, count: ev => ev.type === 'finish' && /hunt\.train|charge/.test(ev.x.id) },
      { label: '토벌 성공 1번', need: 1, count: ev => ev.type === 'hunt' },
      { label: '배 터지게 먹기 2번 (축하연)', need: 2, count: ev => ev.type === 'finish' && /sausage\.feast|double_cream/.test(ev.x.id) },
    ] },
    momonga: { name: '모두의 귀염둥이', icon: '🎀', steps: [
      { label: '귀여운 포즈 3번', need: 3, count: ev => ev.type === 'finish' && /statue\.cute|mirror/.test(ev.x.id) },
      { label: '서로 다른 3명과 수다', need: 3, count: (ev, c) => ev.type === 'chat' && !ev.o.extra && !(c.aspSeen || []).includes(ev.o.id) && (c.aspSeen = [...(c.aspSeen || []), ev.o.id]) },
      { label: '친구(친밀도 60 이상) 4명', need: 4, state: (c, T) => T.sim.chars.filter(o => o !== c && !o.extra && T.sim.persona.bond(c, o) >= 60).length },
    ] },
    shisa: { name: '라멘 로 일인자', icon: '🍜', steps: [
      { label: '라멘 로 아르바이트 3번', need: 3, count: ev => ev.type === 'finish' && /ramenRo\.(parttime|ramen_prep)/.test(ev.x.id) },
      { label: '라멘 로 아르바이트 8번', need: 8, count: ev => ev.type === 'finish' && /ramenRo\.(parttime|ramen_prep)/.test(ev.x.id) },
      { label: '술 자격 공부 3번', need: 3, count: ev => ev.type === 'finish' && /sake_study/.test(ev.x.id) },
    ] },
    rakko: { name: '토벌 1위 지키기', icon: '🥇', steps: [
      { label: '토벌 훈련 3번', need: 3, count: ev => ev.type === 'finish' && /hunt\.train|shadow/.test(ev.x.id) },
      { label: '정신 수양 2번', need: 2, count: ev => ev.type === 'finish' && /shrine\.focus/.test(ev.x.id) },
      { label: '1위로 3일', need: 3, count: (ev, c, T) => ev.type === 'daily' && T.sim.persona.ranking()[0].c === c },
    ] },
    kurimanju: { name: '최고의 안주 찾기', icon: '🍶', steps: [
      { label: '한잔 2번', need: 2, count: ev => ev.type === 'finish' && ev.x.sake },
      { label: '다른 음식 4가지 맛보기', need: 4, count: (ev, c) => ev.type === 'finish' && isFood(ev.x) && !(c.aspSeen || []).includes(ev.x.id) && (c.aspSeen = [...(c.aspSeen || []), ev.x.id]) },
      { label: '집에서 친구와 한잔', need: 1, count: (ev, c, T) => ev.type === 'finish' && ev.x.sake && ev.x.place === 'kurimanjuHome' && T.sim.chars.some(o => o !== c && !o.extra && o.doing && o.doing.x && o.doing.x.place === 'kurimanjuHome') },
    ] },
    furuhonya: { name: '헌책방 단골 만들기', icon: '📚', steps: [
      { label: '헌책방 열기 3번', need: 3, count: ev => ev.type === 'finish' && /market\.run_books/.test(ev.x.id) },
      { label: '헌책 정리 3번', need: 3, count: ev => ev.type === 'finish' && /sort_books/.test(ev.x.id) },
      { label: '손님이 있을 때 헌책방', need: 1, count: (ev, c, T) => ev.type === 'finish' && /market\.run_books|sort_books/.test(ev.x.id) && crowdAt(T, c, 'market', /books/) >= 1 },
    ] },
  };

  /* ---------- 전용 행동 (기존 소켓·기존 동작만) ---------- */

  const only = (who, x) => add({ ...x, only: [who], trait: true });
  // 치이카와
  only('chiikawa', { id: 'home.diary', place: 'home', name: '일기 쓰기', hours: [18, 22], gain: { fun: 18, energy: 4 }, steps: [S('table_sit', 'write', 10, 'study_home', 'book', '오늘 있었던 일 쓰는 중'), S('table_sit', 'idle', 2, 'idle_stretch', null, '다 썼다')] });
  only('chiikawa', { id: 'home.cry_alone', place: 'home', name: '몰래 울기', needFeel: 'sad', hours: [7, 23], gain: { fun: 6, energy: 6 }, steps: [S('table_sit', 'cry', 5, 'cry', null, '훌쩍훌쩍'), S('table_sit', 'wipe', 2, 'wipe_mouth', null, '눈물 닦는 중'), S('table_sit', 'brave', 2, 'brave_up', null, '마음 다잡는 중')], after: 'calm' });
  // 하치와레
  only('hachiware', { id: 'plaza.busk', place: 'plaza', name: '광장 버스킹', hours: [10, 20], earn: 120, gain: { fun: 26, social: 10, energy: -6 }, group: true, steps: [S('speaker_dance', 'sing', 9, 'sing_mic', null, '노래 부르는 중'), S('speaker_dance', 'bow', 2, 'ramen_bow', null, '꾸벅 인사'), S('speaker_dance', 'coin', 2, 'coin_toss', null, '동전 세는 중')] });
  only('hachiware', { id: 'plaza.stargaze', place: 'plaza', name: '밤하늘 보며 흥얼거리기', hours: [20, 23], gain: { fun: 20, energy: 6 }, steps: [S('bench_sit_a|bench_sit_b', 'look', 6, 'tilt_look', null, '별 보는 중'), S('bench_sit_a|bench_sit_b', 'sing', 5, 'idle_hum', null, '흥얼흥얼')] });
  // 우사기
  only('usagi', { id: 'hunt.charge', place: 'hunt', name: '우라! 돌격 연습', hours: [8, 20], train: true, gain: { fun: 24, energy: -8 }, steps: [S('charge_start', 'brave', 2, 'brave_up', null, '기합 넣는 중'), S('charge_start', 'play', 2, 'bounce_big', null, '야하!'), S('dummy_front|target_front', 'confront', 6, 'hunt_thrust', 'rod', '우라! 돌격')] });
  only('usagi', { id: 'softcream.double_cream', place: 'softcream', name: '소프트크림 두 개', hours: [9, 20], gain: { hunger: 30, fun: 26 }, steps: [S('pick_stand', 'poke', 2), S('shade_sit|float_stand', 'eat', 6, 'eat_bowl', null, '하나 먹는 중'), S('shade_sit|float_stand', 'eat', 6, 'eat_bowl', null, '하나 더'), S('shade_sit|float_stand', 'play', 1.5, 'jump_joy', null, '야하!')] });
  // 모몽가
  only('momonga', { id: 'pond.mirror', place: 'pond', name: '물에 비친 얼굴 보기', hours: [8, 19], gain: { fun: 20 }, steps: [S('pond_look', 'look', 4, 'tilt_look', null, '물에 비친 얼굴 보는 중'), S('pond_look', 'pose', 3, 'oath_pose', null, '나 귀엽지?')] });
  only('momonga', { id: 'market.peek_plate', place: 'market', name: '남의 접시 기웃거리기', hours: [10, 20], gain: { fun: 14, social: 6 }, steps: [S('takoyaki.order_front', 'look', 3, 'point_ooh', null, '맛있겠다…'), S('takoyaki.order_front', 'idle', 2, 'tilt_look', null, '하나만…')] });
  // 시사
  only('shisa', { id: 'ramenRo.ramen_prep', place: 'ramenRo', name: '라멘 로 개점 준비', hours: [9, 11], earn: 200, gain: { fun: 6, energy: -6 }, steps: [S('queue_bench', 'wipe', 5, 'wipe_towel', 'towel', '가게 앞 닦는 중'), S('counter_sit_5', 'cook', 8, 'cook_stir', null, '국물 준비하는 중'), S('queue_bench', 'bow', 1.5, 'ramen_bow', null, '오늘도 잘 부탁드립니다')] });
  only('shisa', { id: 'shisaHome.sake_study', place: 'shisaHome', name: '술 자격 공부', hours: [18, 22], gain: { fun: 8 }, steps: [S('study_sit', 'write', 10, 'study_home', 'book', '술 자격 공부 중'), S('study_sit', 'read', 2, 'read_nod', null, '외우는 중')] });
  // 랏코
  only('rakko', { id: 'shrine.shadow', place: 'shrine', name: '새벽 그림자 수련', hours: [5, 9], train: true, gain: { fun: 18, energy: -4 }, steps: [S('pray_stand', 'pray', 2, 'pray_bow', null, '한 번 인사'), S('pray_stand', 'confront', 8, 'train_swing', 'rod', '그림자 수련'), S('pray_stand', 'pose', 3, 'oath_pose', null, '호흡 고르는 중')] });
  only('rakko', { id: 'umaiya.regular', place: 'umaiya', name: '늘 먹던 정식', hours: [11, 21], cost: 650, gain: { hunger: 65, fun: 14 }, steps: [S('order_front', 'talk', 2, 'talk_order', null, '늘 먹던 걸로'), S('table_sit_*', 'eat', 25, 'eat_bowl', 'bowl', '먹는 중')] });
  // 쿠리만쥬
  only('kurimanju', { id: 'kurimanjuHome.snack_make', place: 'kurimanjuHome', name: '안주 만들기', hours: [16, 22], gain: { hunger: 20, fun: 18 }, steps: [S('study_sit', 'cook', 6, 'cook_stir', null, '안주 만드는 중'), S('study_sit', 'bite', 4, 'eat_bite', 'skewer', '맛보는 중'), S('study_sit', 'drink', 1.5, 'drink_haa', null, '캬~')] });
  only('kurimanju', { id: 'misoBank.haejang', place: 'misoBank', name: '해장 된장국', needHangover: true, hours: [6, 13], gain: { hunger: 20, energy: 14 }, steps: [S('taste_stand_n|taste_stand_s|ladle_stand', 'drink', 8, 'drink', 'cup', '속 푸는 중'), S('taste_stand_n|taste_stand_s|ladle_stand', 'idle', 2, 'belly_pat', null, '후우…')], cure: true });
  // 후루혼야
  only('furuhonya', { id: 'market.sort_books', place: 'market', name: '헌책 정리하기', hours: [9, 18], earn: 150, gain: { fun: 10, energy: -4 }, steps: [S('books.staff_side', 'inspect', 4, 'inspect_item', null, '책 상태 살피는 중'), S('books.staff_side', 'carry', 3, 'hold_chest', null, '책 옮기는 중'), S('books.staff_side', 'inspect', 3, 'inspect_item', null, '꽂을 자리 찾는 중')] });
  only('furuhonya', { id: 'market.book_smell', place: 'market', name: '책 냄새 맡기', hours: [9, 19], gain: { fun: 16 }, steps: [S('books.browse_front', 'look', 2, 'smell_flower', null, '오래된 책 냄새'), S('books.browse_front', 'read', 8, null, 'book', '읽는 중')] });

  /* ---------- 성격 ---------- */

  const LIKE_WEIGHT = 2;    // 특성 좋아함·싫어함 점수 배율 (persona.js 선호 점수와 비슷한 크기로)
  const QUIRK_GAP = 30;       // 같은 캐릭터의 버릇 사이 최소 게임 분
  const SCAN = 2;             // 괴물·우는 친구를 둘러보는 간격 (게임 분)

  class Traits {
    constructor(sim) {
      this.sim = sim;
      this.scanLeft = 0;
      this.seenDay = sim.day;
      for (const c of sim.chars) {
        const ids = CAST_TRAITS[c.id] || (c.extra && !c.troupe ? [EXTRA_POOL[Math.floor(sim.random() * EXTRA_POOL.length)]] : []);
        c.traitIds = ids;
        c.asp = ASPIRATIONS[c.id] ? { stage: 0, n: 0 } : null;
        c.feel = null;
        c.quirkAt = -999;
        c.huntSeen = c.huntWins || 0;
      }
    }

    /* 조회 */
    traitsOf(c) { return (c.traitIds || []).map(id => ({ id, ...TRAITS[id] })); }
    has(c, id) { return !!c.traitIds && c.traitIds.includes(id); }
    feelIs(c, id) { return !!c.feel && c.feel.id === id && c.feel.until > this.sim.minutes; }
    near(c, r) { return this.sim.chars.some(o => o !== c && !o.hidden && !o.monster && dist(o, c) < r); }
    crowd(x, c) { return this.sim.chars.filter(o => o !== c && !o.hidden && o.doing && o.doing.x && o.doing.x.place === x.place).length; }
    nightOut(c) { const h = this.sim.hour; return (h >= 20 || h < 6) && !c.hidden; }
    aspiration(c) {
      const a = ASPIRATIONS[c.id];
      if (!a || !c.asp) return null;
      return { ...a, stage: c.asp.stage, n: c.asp.n, done: c.asp.stage >= a.steps.length };
    }
    feelOf(c) {
      if (!c.feel || c.feel.until <= this.sim.minutes) return null;
      return { ...FEELS[c.feel.id], id: c.feel.id, why: c.feel.why, left: c.feel.until - this.sim.minutes };
    }
    // 표정 이름 (persona.js FACES의 키). 감정이 없으면 null
    faceKey(c) {
      const f = this.feelOf(c);
      return f ? f.face : null;
    }

    /* 감정 */
    setFeel(c, id, why, hours) {
      if (!id || !FEELS[id]) return;
      let h = hours || FEELS[id].hours;
      // 낙천가는 서러움이 빨리 지나간다
      if (id === 'sad' && this.has(c, 'optimist')) h *= 0.4;
      c.feel = { id, why: why || '', until: this.sim.minutes + h * 60 };
    }

    /* 고르기 점수 */
    scoreBonus(c, x) {
      if (!c.traitIds || !c.traitIds.length) return 0;
      let v = 0;
      for (const id of c.traitIds) {
        for (const [test, pts] of TRAITS[id].likes) {
          const hit = typeof test === 'function' ? test(x, c, this) : test.test(x.id);
          if (hit) v += pts * LIKE_WEIGHT;
        }
      }
      if (HAUNTS[c.id] && HAUNTS[c.id].test(x.id)) v += HAUNT_PTS;
      // 누구나 하는 쉼(벤치·대기 의자·그늘)은 쉼을 좋아하는 특성이 아니면 조금 덜 끌린다 (그래야 각자 좋아하는 일이 드러난다)
      if (GENERIC_REST.test(x.id) && !this.has(c, 'laidback')) v -= 6;
      if (c.feel && c.feel.until > this.sim.minutes) v += feelBonus(c.feel.id, x);
      return v;
    }
    chatMul(c) {
      let m = 1;
      for (const id of c.traitIds || []) if (TRAITS[id].chatMul) m *= TRAITS[id].chatMul;
      return m;
    }
    // 감정·상태가 맞아야 하는 전용 행동
    blocked(c, x) {
      if (x.needFeel && !this.feelIs(c, x.needFeel)) return '그럴 기분이 아니에요';
      if (x.needHangover && !(c.hangoverUntil > this.sim.minutes)) return '속이 멀쩡해요';
      return null;
    }

    /* 반응: 짧은 동작 + 말 + 감정. 이미 반응 중이면 덮지 않는다 (시험 결과처럼 강한 것은 덮는다) */
    react(c, spec, force = false) {
      if (!spec || c.hidden || c.monster || c.caught) return false;
      if (spec.p !== undefined && this.sim.random() > spec.p) return false;
      if (!force && c.reactLeft > 0) return false;
      c.reactClip = spec.clip;
      c.reactLeft = spec.min || 3;
      if (spec.say) this.sim.say(c, spec.say, 3);
      if (spec.feel) this.setFeel(c, spec.feel, spec.why);
      this.count(c, 'react');
      return true;
    }
    // 특성 순서대로 그 사건에 맞는 반응 하나
    fire(c, event, force = false) {
      for (const id of c.traitIds || []) {
        const spec = TRAITS[id].on && TRAITS[id].on[event];
        if (spec && this.react(c, spec, force)) return spec;
      }
      return null;
    }

    /* 버릇: 쉬는 시간이 생기면 확률로 */
    quirk(c, chance = 0.6) {
      const s = this.sim;
      if (!c.traitIds || !c.traitIds.length || c.hidden || c.reactLeft > 0) return false;
      if (s.minutes - (c.quirkAt || -999) < QUIRK_GAP * (c.extra ? 4 : 1)) return false;
      if (s.random() > (c.extra ? chance * 0.3 : chance)) return false;
      const pool = [];
      for (const id of c.traitIds) for (const q of TRAITS[id].quirks || []) if (!q.when || q.when(c, this)) pool.push(q);
      if (!pool.length) return false;
      const q = pick(pool, s.random());
      c.quirkAt = s.minutes;
      c.reactClip = q.clip;
      c.reactLeft = 2.5 + s.random() * 1.5;
      if (q.say) s.say(c, pick(q.say, s.random()), 3);
      if (q.feel) this.setFeel(c, q.feel, q.why);
      this.count(c, 'quirk');
      return true;
    }

    /* 사건 */
    onFinish(c, x) {
      if (c.extra) return;
      // 반응 고르기: 일·음식·공연·책·수련·술
      if (isFood(x)) {
        const fresh = !(c.tasted || []).includes(x.id);
        c.tasted = [...(c.tasted || []).filter(id => id !== x.id), x.id].slice(-12);
        if (!(fresh && this.fire(c, 'taste'))) this.fire(c, 'eat');
      } else if (/sing|perform|busk/.test(x.id)) this.fire(c, 'perform');
      else if (x.sake) this.fire(c, 'sake');
      else if (/books|book_smell|recycle\.browse/.test(x.id)) this.fire(c, 'read');
      else if (/hunt\.train|shrine\.focus|shadow|charge/.test(x.id)) this.fire(c, 'train');
      else if (isWork(x) && !x.takeKind && !x.accept) this.fire(c, 'work');
      if (x.after) this.setFeel(c, x.after, '실컷 울고 나니 개운해서');
      if (x.cure) c.hangoverUntil = 0;
      // 사람 많은 곳에서 수줍음
      if (x.group && this.crowd(x, c) >= 3) this.fire(c, 'crowd');
      // 토벌 성공은 labor가 huntWins를 올린다
      if ((c.huntWins || 0) > (c.huntSeen || 0)) {
        c.huntSeen = c.huntWins;
        this.progress(c, { type: 'hunt' });
      }
      this.progress(c, { type: 'finish', x });
      // 반응이 없으면 버릇 기회
      if (!(c.reactLeft > 0)) this.quirk(c, 0.35);
    }
    onFail(c, why) {
      if (!why || c.extra) return;
      this.fire(c, 'fail');
    }
    onExam(c, r) {
      if (c.extra) return;
      this.fire(c, r.pass ? 'examPass' : r.absent ? null : 'examFail', true);
      if (!r.pass && !r.absent && !c.feel) this.setFeel(c, 'sad', '시험에 떨어져서', 1.5);
      if (r.pass && !this.feelIs(c, 'proud')) this.setFeel(c, 'proud', '시험에 붙어서');
      this.progress(c, { type: 'exam', r });
    }
    onChat(c, o) {
      if (c.comfort === o.id) {
        c.comfort = null;
        this.sim.say(c, '괜찮아?', 3);
        this.sim.say(o, '고마워…', 3);
        this.setFeel(o, 'calm', `${c.name}이(가) 달래 줘서`);
        this.sim.persona.grow(c, o, 3);
        this.sim.note(`${c.name}이(가) ${o.name}을(를) 달래 줬어요`);
        this.count(c, 'comfort');
      } else if (!c.extra && !o.extra) this.fire(c, 'chat');
      this.progress(c, { type: 'chat', o });
    }
    // 한가해서 서 있게 될 때: 버릇을 먼저 보여 준다
    onIdle(c) { return this.quirk(c, 0.75); }

    /* 열망 */
    progress(c, ev) {
      const a = ASPIRATIONS[c.id];
      if (!a || !c.asp || c.asp.stage >= a.steps.length) return;
      const st = a.steps[c.asp.stage];
      if (st.state) c.asp.n = Math.max(c.asp.n, st.state(c, this));
      else if (st.count(ev, c, this)) c.asp.n += 1;
      if (c.asp.n < st.need) return;
      // 단계 달성
      c.asp.stage += 1;
      c.asp.n = 0;
      c.aspSeen = [];
      const done = c.asp.stage >= a.steps.length;
      this.react(c, { clip: 'jump_joy', say: done ? '해냈다!!' : '좋아!', min: 4 }, true);
      this.setFeel(c, 'proud', done ? `열망 "${a.name}"을(를) 이뤄서` : `"${st.label}"을(를) 해내서`, done ? 8 : 4);
      this.sim.note(done ? `🌟 ${c.name}: 열망 "${a.name}" 달성!` : `${a.icon} ${c.name}: ${st.label} 달성 (${c.asp.stage}/${a.steps.length})`);
      this.count(c, 'milestone');
      // 다음 단계가 상태형이면 바로 확인
      if (!done && a.steps[c.asp.stage].state) this.progress(c, { type: 'state' });
    }

    /* 매 틱: 감정 만료, 괴물·우는 친구 둘러보기, 아침 반응, 하루 넘김 */
    tick(dt) {
      const s = this.sim;
      if (this.seenDay !== s.day) {
        this.seenDay = s.day;
        for (const c of s.chars) if (!c.extra) this.progress(c, { type: 'daily' });
      }
      this.scanLeft -= dt;
      if (this.scanLeft > 0) return;
      this.scanLeft = SCAN;
      const beasts = s.chars.filter(o => o.monster && !o.gone && !o.hidden);
      const crying = s.chars.filter(o => !o.extra && !o.hidden && this.feelIs(o, 'sad') && o.reactLeft > 0);
      for (const c of s.chars) {
        if (c.monster || c.gone || c.hidden || c.caught || !c.traitIds || !c.traitIds.length) continue;
        if (c.feel && c.feel.until <= s.minutes) c.feel = null;
        // 괴물을 봤다
        if (beasts.length && s.minutes - (c.beastSeenAt || -999) > 60) {
          const b = beasts.find(o => dist(o, c) < 20);
          if (b && !this.busyHard(c)) {
            c.beastSeenAt = s.minutes;
            const spec = this.fire(c, 'monster', true);
            if (spec && spec.flee) this.flee(c, b);
          }
        }
        // 아침에 처음 움직일 때
        if (!c.extra && s.hour >= 6 && s.hour < 10 && c.morningDay !== s.day && !c.doing) {
          c.morningDay = s.day;
          this.fire(c, 'morning');
        }
        // 다정함: 우는 친구를 달래러 간다
        if (TRAITS_COMFORT(c) && crying.length && !c.comfort) {
          const f = crying.find(o => o !== c && dist(o, c) < 40 && s.persona.bond(c, o) >= 60);
          if (f && !this.busyHard(c) && !(c.doing && c.doing.kind === 'chat')) {
            if (c.doing) s.abort(c, '');
            c.comfort = f.id;
            c.idleLeft = 0;
            s.start(c, CHAT, f, false);
            s.say(c, `${f.name}!`, 2);
          }
        }
        // 예측불가: 하던 놀이를 가끔 갑자기 바꾼다
        if (this.has(c, 'wild') && c.doing && c.doing.kind === 'obj' && c.doing.phase === 'use' && !this.busyHard(c) && isFun(c.doing.x) && s.random() < 0.02) {
          s.abort(c, '');
          this.react(c, { clip: 'bounce_big', say: '야하!', min: 2 }, true);
        }
      }
    }
    // 끊으면 안 되는 일: 시킨 일, 노동·시험·잠·공연 의무
    busyHard(c) {
      const d = c.doing;
      if (c.plate || c.orders.length) return true;
      if (!d) return false;
      if (d.ordered) return true;
      if (d.kind !== 'obj') return false;
      const x = d.x;
      return !!(x.night || x.examTake || x.show || x.plate || x.takeKind || x.accept || x.settle || isWork(x));
    }
    // 괴물에게서 물러나기: 반대쪽 빈칸으로
    flee(c, b) {
      const s = this.sim;
      if (c.doing) s.abort(c, '');
      const dx = c.x - b.x;
      const dz = c.z - b.z;
      const d = Math.hypot(dx, dz) || 1;
      const p = s.snap({ x: c.x + (dx / d) * 12, z: c.z + (dz / d) * 12 });
      if (p) c.aside = p;
      c.idleLeft = Math.max(c.idleLeft || 0, 2);
    }

    /* 측정용 */
    count(c, kind) {
      const a = this.audit;
      if (!a) return;
      const m = a[kind] || (a[kind] = {});
      m[c.id] = (m[c.id] || 0) + 1;
    }

    save(c) { return { feel: c.feel, asp: c.asp, tasted: c.tasted, aspSeen: c.aspSeen, huntSeen: c.huntSeen }; }
    load(c, r) {
      if (r.feel) c.feel = r.feel;
      if (r.asp && ASPIRATIONS[c.id]) c.asp = r.asp;
      if (r.tasted) c.tasted = r.tasted;
      if (r.aspSeen) c.aspSeen = r.aspSeen;
      if (r.huntSeen !== undefined) c.huntSeen = r.huntSeen;
      else c.huntSeen = c.huntWins || 0;
    }
  }
  const TRAITS_COMFORT = c => !!c.traitIds && c.traitIds.some(id => TRAITS[id].comforts);

  Traits.TRAITS = TRAITS;
  Traits.FEELS = FEELS;
  Traits.ASPIRATIONS = ASPIRATIONS;
  Traits.HAUNTS = HAUNTS;
  root.Traits = Traits;
}(typeof self !== 'undefined' ? self : this));
