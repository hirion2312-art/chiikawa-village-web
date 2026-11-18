'use strict';

// 치이카와 심즈 — 월드 오브젝트 상호작용 표 (심즈의 "스마트 오브젝트")
// 오브젝트(장소의 소켓)가 "나를 쓰면 이만큼 채워 준다"를 알리고, 캐릭터는 지금 모자란 욕구로 점수를 매겨 고른다.
// 캐릭터 전용 행동은 없다. 어떤 캐릭터든 쓸 수 있다.
//
// 욕구 5종 (0~100, 높을수록 만족): hunger 배부름 · energy 기력 · fun 즐거움 · social 친구 · hygiene 청결
// 항목 형식:
//   id, place(장소 id), name(메뉴 이름), steps[{ socket(이름 | 'a_*' 빈자리 아무거나 | 'a|b' 중 하나), act(동작), clip?(anims.js), min(게임 분), fx?('모델.클립': 그 단계 동안 움직일 물건, interiors.js) }]
//   prop: 그 단계에 꼭 필요한 손 소품(bowl·cup·ticket·book·rod·towel). 적힌 단계의 애니메이션 동안에만 손에 배치된다 (village-props.js)
//   gain{욕구: 전체 증가량}  — 단계를 하는 동안 나눠서 채워진다
//   cost 드는 돈 · earn 버는 돈 · hours[시작, 끝] 이용 시간 · group true면 같은 장소에 다른 캐릭터가 있을 때 친구 욕구가 함께 찬다
//   night true면 밤(21시 이후)에 점수가 크게 오른다 (잠) · shared true면 자리를 여럿이 함께 쓴다 (집 안으로 들어가는 잠)
//   only: 이 캐릭터들만 쓴다 (남의 집 살림) · obj: 건물 안에서 그 물건을 눌렀을 때 메뉴에 나온다
(function (root) {
  const I = (place, id, name, steps, gain, more = {}) => ({ id: `${place}.${id}`, place, name, steps, gain, ...more });
  const S = (socket, act, min, clip, prop, fx) => ({ socket, act, min, clip, prop, fx });

  // 하치와레의 동굴은 하치와레와 놀러 오는 두 친구만 쓴다
  const HACHIWARE_HOUSE = ['hachiware', 'chiikawa', 'usagi'];
  const HOME = (place, who, name = '집에서 자기') => I(place, 'sleep', name, [S('bed_lie', 'sleep', 420, 'sleep_breathe', null, 'futon.sleep')], { energy: 100 }, { night: true, shared: true, only: [who], obj: 'futon' });
  const LIST = [
    /* ---------- 먹고 마시기 ---------- */
    I('ramenRo', 'ramen', '라멘 먹기', [
      S('ticket_buy', 'ticket', 3, 'ramen_ticket', null, 'vending.buy'),
      S('counter_sit_*', 'talk', 2, 'ramen_hand_ticket', 'ticket'),
      S('counter_sit_*', 'wait', 4, 'ramen_call', null, 'bowl.serve'),
      S('counter_sit_*', 'eat', 16, 'ramen_eat_noodles', 'bowl', 'bowl.eat'),
      S('counter_sit_*', 'eat', 3, 'ramen_soup', 'bowl', 'bowl.eat'),
      S('counter_sit_*', 'bow', 2, 'ramen_bow', null, 'bowl.done'),
    ], { hunger: 70, fun: 15 }, { cost: 650, hours: [11, 22], group: true, obj: 'vending' }),
    I('ramenYama', 'ramen', '라멘 먹기', [S('ticket_buy', 'ticket', 3, null, 'ticket'), S('counter_sit_*', 'eat', 25, 'ramen_eat_noodles', 'bowl')], { hunger: 65, fun: 12 }, { cost: 600, hours: [11, 22], group: true }),
    I('umaCurry', 'curry', '카레 먹기', [S('counter_sit_*|challenge_sit', 'eat', 22, 'eat_bowl', 'bowl')], { hunger: 60, fun: 10 }, { cost: 550, hours: [11, 21], group: true }),
    I('umaiya', 'meal', '정식 먹기', [S('order_front', 'talk', 3), S('table_sit_*', 'eat', 30, 'eat_bowl', 'bowl')], { hunger: 65, fun: 12, social: 5 }, { cost: 650, hours: [11, 23], group: true }),
    I('kissa', 'tea', '차 마시기', [S('table_sit_*|counter_sit', 'drink', 25, 'drink', 'cup')], { fun: 20, energy: 12, hunger: 8 }, { cost: 300, hours: [9, 20], group: true }),
    I('soba', 'soba', '서서 소바 먹기', [S('order_front', 'talk', 2), S('eat_stand_*', 'eat', 12, 'eat_bowl', 'bowl')], { hunger: 50 }, { cost: 350, hours: [7, 21] }),
    I('market', 'takoyaki', '타코야키 먹기', [S('takoyaki.order_front', 'talk', 2), S('takoyaki.eat_sit_*', 'eat', 15, 'eat_bowl', 'bowl')], { hunger: 35, fun: 12 }, { cost: 350, hours: [10, 20], group: true }),
    I('mucha', 'shop', '장 봐서 간식 먹기', [S('shelf_look_*', 'browse', 10), S('checkout_stand', 'talk', 4)], { hunger: 30, fun: 12 }, { cost: 400, hours: [8, 22] }),
    I('machioka', 'snack', '과자 사 먹기', [S('shelf_look_l|shelf_look_r', 'browse', 8), S('door_front', 'eat', 6, 'eat_bowl')], { hunger: 20, fun: 18 }, { cost: 200, hours: [9, 21] }),
    I('shimajiro', 'ramen', '섬 라멘 먹기', [S('counter_stand', 'talk', 2), S('table_sit_*', 'eat', 25, 'ramen_eat_noodles', 'bowl')], { hunger: 70, fun: 18 }, { cost: 650, hours: [11, 20], group: true }),

    /* ---------- 솟는 곳: 공짜 음식 ---------- */
    I('rice', 'rice', '솟는 밥 퍼 먹기', [S('pakapaka_front', 'poke', 3), S('scoop_stand|bowl_stand', 'eat', 15, 'eat_bowl', 'bowl')], { hunger: 45 }, { group: true }),
    I('servers', 'dashi', '다시 받아 마시기', [S('tap_stand', 'pour', 3), S('shade_sit', 'drink', 12, 'drink', 'cup')], { hunger: 25, fun: 6 }, { group: true }),
    I('misoBank', 'miso', '된장국 떠 마시기', [S('taste_stand_n|taste_stand_s|ladle_stand', 'drink', 10, 'drink', 'cup')], { hunger: 25, energy: 5 }),
    I('sausage', 'sausage', '어육소시지 뜯어 먹기', [S('pull_stand', 'bite', 12, 'eat_bowl')], { hunger: 40, fun: 10 }),
    I('softcream', 'cream', '소프트크림 먹기', [S('pick_stand', 'poke', 3), S('shade_sit|float_stand', 'eat', 10, 'eat_bowl')], { hunger: 20, fun: 22 }),
    I('castella', 'climb', '카스텔라 위에서 뛰기', [S('stairs_base', 'walk', 2), S('top_bounce|top_bounce_2', 'play', 12, 'jump_joy')], { fun: 35, energy: -8, hunger: 10 }),
    I('bigPudding', 'slide', '푸딩 미끄럼 타기', [S('ladder_stand', 'walk', 2), S('slide_start', 'play', 6, 'jump_joy'), S('slide_end', 'play', 4, 'jump_joy')], { fun: 40, energy: -6 }),

    /* ---------- 쉬기 · 자기 ---------- */
    I('plaza', 'bench', '벤치에 앉아 쉬기', [S('bench_sit_a|bench_sit_b', 'sit', 20, 'sit_idle')], { energy: 15, fun: 5 }, { group: true }),
    I('statue', 'bench', '공원 벤치에서 쉬기', [S('bench_sit_*', 'sit', 20, 'sit_idle')], { energy: 15, fun: 5 }, { group: true }),
    I('weeding', 'rest', '그늘에서 쉬기', [S('rest_sit', 'sit', 15, 'sit_idle')], { energy: 18 }),
    I('pharmacy', 'wait', '대기 의자에서 쉬기', [S('wait_sit_*', 'sit', 15, 'sit_idle')], { energy: 12 }),
    I('arbiter', 'wait', '대기석에서 쉬기', [S('wait_sit', 'sit', 15, 'sit_idle')], { energy: 12 }),
    I('islandPlaza', 'fire', '모닥불 쬐기', [S('sit_*', 'sit', 30, 'sit_idle')], { energy: 15, fun: 15, social: 10 }, { group: true }),
    I('hiroma', 'fire', '모닥불 앞에 앉기', [S('table_sit_*|bench_sit', 'sit', 25, 'sit_idle')], { energy: 12, fun: 10 }, { group: true }),
    I('bungalow', 'hammock', '해먹에서 낮잠', [S('hammock_lie', 'nap', 60, 'sleep_breathe')], { energy: 45, fun: 8 }),
    I('cave', 'in', '동굴에 들어가 있기', [S('enter_stand', 'idle', 8, 'idle_look')], { fun: 3 }, { only: HACHIWARE_HOUSE }),
    I('cave', 'tea', '찻상에서 차 마시기', [S('tea_sit_*', 'drink', 20, 'drink', 'cup', 'glass.sip')], { energy: 15, fun: 10 }, { group: true, only: HACHIWARE_HOUSE, obj: 'glass' }),
    I('cave', 'cook', '밥 지어 먹기', [S('cook_stand', 'cook', 10, null, null, 'pot.cook'), S('tea_sit_*', 'eat', 14, 'eat_bowl', 'bowl')], { hunger: 45, fun: 8 }, { group: true, only: HACHIWARE_HOUSE, obj: 'pot' }),
    I('cave', 'study', '집에서 검정 공부', [S('tea_sit_*', 'study', 30, 'study_home', 'book')], { energy: -8, fun: -5 }, { only: ['hachiware'], skill: 'grass', worth: 300, hours: [8, 23] }),
    // 잠: 저마다 자기 집에서만. 밤에 점수가 크게 오른다. 엑스트라의 집은 village-sim.js가 채운다
    HOME('home', 'chiikawa'),
    I('cave', 'sleep', '돌침대에서 자기', [S('bed_lie', 'sleep', 420, 'sleep_breathe', null, 'futon.sleep')], { energy: 100 }, { night: true, only: ['hachiware'], obj: 'futon' }),
    I('usagi', 'sleep', '어딘가로 돌아가 자기', [S('door_front', 'enter', 2), S('door_front', 'sleep', 420, 'sleep_breathe')], { energy: 100 }, { night: true, hide: true, shared: true, only: ['usagi'] }),
    HOME('momongaHome', 'momonga'),
    HOME('shisaHome', 'shisa'),
    HOME('rakkoHome', 'rakko'),
    HOME('kurimanjuHome', 'kurimanju'),
    HOME('furuhonyaHome', 'furuhonya'),

    /* ---------- 씻기 ---------- */
    I('onsen', 'bath', '온천에 몸 담그기', [S('towel_stand', 'wipe', 3, null, 'towel'), S('soak_*|big_bath', 'bath', 30), S('towel_stand', 'wipe', 3, null, 'towel')], { hygiene: 70, energy: 20, fun: 12 }, { cost: 350, group: true }),
    I('onsen', 'bubble', '거품 놀이', [S('bubble_play', 'play', 15, 'jump_joy')], { hygiene: 30, fun: 25 }, { group: true }),
    I('sauna', 'sauna', '사우나 하기', [S('sauna_door', 'sit', 15, 'sit_idle'), S('cold_soak', 'bath', 8), S('shower_sit', 'wipe', 6, null, 'towel')], { hygiene: 60, energy: 15 }, { cost: 300 }),

    /* ---------- 놀기 ---------- */
    I('plaza', 'dance', '스피커 앞에서 춤추기', [S('speaker_dance', 'dance', 12, 'dance_light')], { fun: 30, energy: -5 }, { group: true }),
    I('plaza', 'music', '음악 듣기', [S('speaker_listen', 'sway', 15, 'idle_hum')], { fun: 20 }, { group: true }),
    I('plaza', 'board', '게시판 구경', [S('board_check_a|board_check_b', 'read', 6)], { fun: 8 }),
    I('stage', 'perform', '무대에서 공연하기', [S('perform_*', 'dance', 20, 'dance_light')], { fun: 35, social: 15, energy: -10 }, { group: true }),
    I('stage', 'watch', '공연 구경하기', [S('audience_*', 'sit', 20, 'sit_idle')], { fun: 25, social: 10 }, { group: true }),
    I('internet', 'pc', '인터넷 하기', [S('pc_sit_*', 'type', 25)], { fun: 25, social: 5 }, { cost: 100, group: true }),
    I('pond', 'fish', '낚시하기', [S('fish_sit', 'fish', 40, null, 'rod')], { fun: 25, energy: 5 }, { earn: 150 }),
    I('pond', 'look', '연못 구경', [S('pond_look', 'gaze', 8, 'idle_look')], { fun: 10 }),
    I('bridge', 'cross', '흔들다리 건너기', [S('cross_start', 'walk', 1), S('cross_mid', 'peek', 4, 'surprised'), S('cross_end', 'walk', 1)], { fun: 25 }),
    I('pier', 'boat', '배에 앉아 바다 보기', [S('boat_sit_*', 'sit', 20, 'sit_idle')], { fun: 18, energy: 8 }, { group: true }),
    I('seaCave', 'look', '해변 동굴 구경', [S('pool_look|shore_stand', 'gaze', 10, 'idle_look')], { fun: 15 }),
    I('arcade', 'peek', '폐 게임센터 엿보기', [S('window_peek', 'peek', 6, 'idle_look')], { fun: 15 }),
    I('goblin', 'peek', '고블린 동굴 엿보기', [S('torch_look|bone_look', 'peek', 5, 'surprised')], { fun: 20, energy: -4 }),
    I('yamanba', 'peek', '야만바의 집 엿보기', [S('pot_look|candy_look', 'peek', 5, 'surprised')], { fun: 20 }),
    I('recycle', 'browse', '리사이클 숍 구경', [S('browse_stand|tv_look', 'browse', 12)], { fun: 15 }),
    I('market', 'clothes', '포셰트 노점 구경', [S('clothes.browse_front', 'browse', 10)], { fun: 15 }),
    I('market', 'books', '헌책 읽기', [S('books.browse_front', 'read', 15, null, 'book')], { fun: 18 }),
    I('market', 'pottery', '그릇 구경', [S('pottery.browse_front', 'browse', 8)], { fun: 10 }),
    I('shrine', 'pray', '신사 참배', [S('torii_pass', 'walk', 1), S('pray_stand|offer_stand', 'pray', 5)], { fun: 12 }),
    I('statue', 'oath', '기념공원군 상 따라 하기', [S('oath_stand', 'pose', 4, 'jump_joy')], { fun: 12 }),

    /* ---------- 일하기 (돈) ---------- */
    // 노동: 아침에 플레이트를 집어 접수한 사람만 할 수 있고, 돈은 접수처 정산에서 받는다 (labor.js)
    I('reception', 'take_grass', '풀뽑기 플레이트 집기', [S('rack_stand_*', 'take', 2, 'plate_pick'), S('window_stand|window_2|window_3|window_4', 'hand', 2, 'plate_hand', 'plate')], {}, { takeKind: 'grass', worth: 1000, hours: [6, 12] }),
    I('reception', 'take_hunt', '토벌 플레이트 집기', [S('rack_stand_*', 'take', 2, 'plate_pick'), S('window_stand|window_2|window_3|window_4', 'hand', 2, 'plate_hand', 'plate')], {}, { takeKind: 'hunt', worth: 1500, hours: [6, 12] }),
    I('reception', 'take_gather', '채집 플레이트 집기', [S('rack_stand_*', 'take', 2, 'plate_pick'), S('window_stand|window_2|window_3|window_4', 'hand', 2, 'plate_hand', 'plate')], {}, { takeKind: 'gather', worth: 950, hours: [6, 12] }),
    I('reception', 'take_lemon', '레몬 스티커 플레이트 집기', [S('rack_stand_*', 'take', 2, 'plate_pick'), S('window_stand|window_2|window_3|window_4', 'hand', 2, 'plate_hand', 'plate')], {}, { takeKind: 'lemon', worth: 1200, hours: [6, 12] }),
    I('reception', 'accept', '플레이트 접수하기', [S('window_stand|window_2|window_3|window_4', 'hand', 2, 'plate_hand', 'plate')], {}, { accept: true, worth: 1000, hours: [6, 18] }),
    I('reception', 'settle', '일 정산하기', [S('settle_queue_*', 'wait', 0.5, 'idle_look'), S('scale_stand|scale_2', 'weigh', 3, 'scale_place'), S('window_stand|window_2|window_3|window_4', 'pay', 2, 'pay_wait'), S('window_stand|window_2|window_3|window_4', 'pay', 1.4, 'pay_receive', 'pouch'), S('window_stand|window_2|window_3|window_4', 'pay', 1.2, 'pouch_hug', 'pouch')], {}, { settle: true, worth: 1800, hours: [6, 18] }),
    I('weeding', 'weed', '풀뽑기', [S('pull_*', 'weed', 45), S('pile_stand', 'carry', 4)], { energy: -20, fun: -4, hygiene: -15 }, { plate: 'grass', worth: 1200, hours: [6, 17] }),
    I('wilds', 'hunt', '야생지대 토벌하기', [S('enter_*', 'brave', 2), S('fight_*', 'confront', 25, 'hunt_thrust', 'rod')], { energy: -25, fun: 10, hygiene: -10 }, { plate: 'hunt', worth: 1800, hours: [6, 17] }),
    // 랏코(토벌 랭킹 1위)는 플레이트 없이 언제든 토벌한다. 다른 일은 하지 않는다 (2026-11-09 이재헌 지시)
    I('wilds', 'rakko_hunt', '랏코의 토벌', [S('enter_*', 'brave', 2), S('fight_*', 'confront', 20, 'hunt_thrust', 'rod')], { energy: -18, fun: 14, hygiene: -6 }, { only: ['rakko'], earn: 2500, hours: [6, 20] }),
    I('wilds', 'gather', '야생지대 채집하기', [S('gather_*', 'gather', 30, 'gather_pick')], { energy: -12, hygiene: -6 }, { plate: 'gather', worth: 1000, hours: [6, 17] }),
    I('hunt', 'train', '토벌 훈련', [S('charge_start', 'brave', 2), S('dummy_front|target_front', 'confront', 25, 'train_swing')], { energy: -25, fun: 8, hygiene: -10 }, { train: true, hours: [8, 18] }),
    I('lemon', 'sticker', '레몬 스티커 붙이기', [S('work_sit_*', 'work', 50)], { energy: -15, fun: -8 }, { plate: 'lemon', worth: 1300, hours: [6, 17], group: true }),
    I('exam', 'study', '검정 공부', [S('desk_sit_*|board_look', 'study', 30, 'study_home', 'book')], { energy: -8, fun: -6 }, { hours: [9, 18], skill: 'grass', worth: 300 }),
    // 집에서 하는 자격증 공부
    I('home', 'study', '집에서 검정 공부', [S('table_sit', 'study', 30, 'study_home', 'book')], { energy: -8, fun: -5 }, { skill: 'grass', worth: 300, only: ['chiikawa'], hours: [8, 23] }),
    ...['momonga', 'rakko', 'kurimanju'].map(w => I(`${w}Home`, 'study', '집에서 검정 공부', [S('study_sit', 'study', 30, 'study_home', 'book')], { energy: -8, fun: -5 }, { skill: 'grass', worth: 300, only: [w], hours: [8, 23] })),
  ];


  // 자리가 정해져 있지 않던 장소 (장소 기준 좌표)
  const RING = (r, names) => Object.fromEntries(names.map((n, i) => { const a = (i / names.length) * Math.PI * 2 + 0.6; return [n, [Math.sin(a) * r, Math.cos(a) * r, 0, 0, 0]]; }));
  Object.assign(root.ASSET_SOCKETS, {
    ramune: RING(7, ['spring_1', 'spring_2', 'spring_3', 'spring_4']),
    antlion: RING(8, ['edge_1', 'edge_2', 'edge_3']),
    hole: RING(4.5, ['rim_1', 'rim_2']),
    smallCave: RING(6, ['mouth_1', 'mouth_2']),
    sobaSpring: RING(4.5, ['spring_1', 'spring_2', 'spring_3']),
    akafuku: RING(4, ['catch_1', 'catch_2', 'catch_3']),
  });
  // [장소, 자리, 이름, 동작, 클립, 분, 효과, 추가, 손 소품]
  const FUN = n => ({ fun: n });
  const MORE = [
    ['ramune', 'spring_*', '솟는 라무네 마시기', 'drink', 'drink', 8, { fun: 14, hunger: 6 }, {}, 'cup'],
    ['ramune', 'spring_*', '케첩밥 퍼 먹기', 'eat', 'eat_bowl', 12, { hunger: 40 }, { id: 'rice' }, 'bowl'],
    ['sobaSpring', 'spring_*', '솟는 소바 받아 먹기', 'eat', 'eat_bowl', 12, { hunger: 42 }, {}, 'bowl'],
    ['akafuku', 'catch_*', '떨어지는 아카후쿠 받아 먹기', 'bite', 'eat_bite', 8, { hunger: 22, fun: 12 }, {}, 'skewer'],
    ['antlion', 'edge_*', '개미지옥 들여다보기', 'peek', 'peek_tiptoe', 4, FUN(6)],
    ['antlion', 'edge_*', '모래 던져 보기', 'poke', 'poke_touch', 3, FUN(7), { id: 'throw' }],
    ['hole', 'rim_*', '구멍 들여다보기', 'peek', 'peek_tiptoe', 4, FUN(7)],
    ['smallCave', 'mouth_*', '동굴 안 살펴보기', 'peek', 'peek_tiptoe', 6, FUN(9)],
    ['smallCave', 'mouth_*', '동굴에 대고 소리치기', 'talk', 'ramen_call', 3, FUN(7), { id: 'shout' }],
    ['reception', 'bell_touch', '호출 종 누르기', 'poke', 'poke_touch', 2, FUN(3)],
    ['exam', 'results_look', '합격 발표 보기', 'read', 'board_read', 4, FUN(4)],
    ['exam', 'sign_look', '시험 안내 읽기', 'read', 'board_read', 3, FUN(3)],
    ['internet', 'wait_stand', '자리 나기 기다리기', 'wait', 'idle_fidget', 4, FUN(2)],
    ['ramenRo', 'queue_bench', '대기 의자에서 기다리기', 'sit', 'sit_idle', 6, { energy: 4 }],
    ['ramenYama', 'queue_bench', '대기 의자에서 기다리기', 'sit', 'sit_idle', 6, { energy: 4 }],
    ['ramenYama', 'call_answer', '호출에 대답하기', 'talk', 'ramen_call', 2, FUN(3)],
    ['umaCurry', 'menu_look', '메뉴판 보기', 'read', 'board_read', 3, FUN(3)],
    ['umaCurry', 'photo_stand', '기념사진 찍기', 'pose', 'oath_pose', 3, FUN(9)],
    ['kissa', 'usual_order', '늘 마시던 걸로 주문하기', 'talk', 'talk_order', 3, FUN(5)],
    ['mucha', 'door_front', '가게 앞 구경하기', 'gaze', 'tilt_look', 3, FUN(3)],
    ['mucha', 'cart_stand', '카트 밀어 보기', 'carry', 'carry_pile', 4, FUN(7)],
    ['mucha', 'flyer_look', '전단지 읽기', 'read', 'board_read', 3, FUN(3)],
    ['mucha', 'parking_stand', '주차장 둘러보기', 'gaze', 'idle_look', 3, FUN(2)],
    ['home', 'door_front', '문 앞 정리하기', 'wipe', 'wipe_towel', 4, { hygiene: 4 }, { only: ['chiikawa'] }],
    ['home', 'keyhole_unlock', '열쇠 돌려 보기', 'poke', 'poke_touch', 2, FUN(2), { only: ['chiikawa'] }],
    ['home', 'sign_view', '문패 보기', 'read', 'board_read', 2, FUN(2)],
    ['home', 'window_peek', '창문 들여다보기', 'peek', 'peek_tiptoe', 3, FUN(4)],
    ['home', 'cook_stand', '집에서 밥 해 먹기', 'cook', 'cook_stir', 18, { hunger: 45, fun: 6 }, { only: ['chiikawa'], cost: 200 }],
    ['cave', 'study_stand', '서서 공부하기', 'study', 'read_book', 15, { energy: -4, fun: -2 }, { only: ['hachiware'], skill: 'grass', worth: 200 }, 'book'],
    ['weeding', 'fork_stand', '풀 포크 들어 보기', 'take', 'plate_pick', 3, FUN(4)],
    ['weeding', 'sign_look', '현장 안내 읽기', 'read', 'board_read', 3, FUN(3)],
    ['pond', 'hole_peek', '연못 구멍 들여다보기', 'peek', 'peek_tiptoe', 3, FUN(5)],
    ['pond', 'antlion_look', '물가 살펴보기', 'gaze', 'tilt_look', 3, FUN(4)],
    ['pond', 'antlion_edge', '돌멩이 던지기', 'poke', 'poke_touch', 3, FUN(7)],
    ['rice', 'steam_look', '김 구경하기', 'gaze', 'tilt_look', 3, FUN(4)],
    ['sausage', 'sprout_look', '새싹 살펴보기', 'gaze', 'tilt_look', 3, FUN(4)],
    ['hunt', 'fork_stand', '사스마타 들어 보기', 'brave', 'brave_up', 3, FUN(6)],
    ['hunt', 'sign_look', '토벌 주의문 읽기', 'read', 'board_read', 3, FUN(3)],
    ['yamanba', 'door_front', '문 두드리기', 'knock', 'knock_door', 2, FUN(4)],
    ['yamanba', 'table_sit', '마루에 앉아 쉬기', 'sit', 'sit_idle', 10, { energy: 8 }],
    ['yamanba', 'wood_stand', '장작 주워 모으기', 'gather', 'gather_pick', 8, FUN(4)],
    ['yamanba', 'cave_enter', '동굴 입구 살피기', 'peek', 'peek_tiptoe', 4, FUN(6)],
    ['hiroma', 'gather_center', '둘러앉아 쉬기', 'idle', 'chat_nod', 8, { social: 10, fun: 4 }, { group: true }],
    ['hiroma', 'fire_stand', '모닥불 쬐기', 'warm', 'warm_hands', 8, { energy: 6, fun: 5 }],
    ['goblin', 'enter_stand', '동굴 입구 엿보기', 'peek', 'peek_tiptoe', 4, FUN(7)],
    ['goblin', 'gate_stand', '문 두드리기', 'knock', 'knock_door', 2, FUN(5)],
    ['arbiter', 'notice_look', '공고 읽기', 'read', 'board_read', 3, FUN(3)],
    ['arbiter', 'counter_stand', '창구에 문의하기', 'talk', 'talk_order', 3, FUN(3)],
    ['arbiter', 'desk_sit', '시험 문제 풀기', 'study', 'study_home', 15, { energy: -5 }, { skill: 'grass', worth: 200, hours: [9, 18] }, 'book'],
    ['arbiter', 'ticket_stand', '번호표 뽑기', 'ticket', 'poke_touch', 2, FUN(3)],
    ['statue', 'plaque_look', '표지석 읽기', 'read', 'board_read', 3, FUN(3)],
    ['shrine', 'omamori_stand', '부적 고르기', 'browse', 'browse_shelf', 5, FUN(6)],
    ['shrine', 'lantern_look', '등롱 구경하기', 'gaze', 'tilt_look', 3, FUN(4)],
    ['sauna', 'sign_gag', '안내문 읽고 웃기', 'read', 'board_read', 3, FUN(6)],
    ['machioka', 'frog_look', '개구리 인형 구경하기', 'gaze', 'tilt_look', 3, FUN(5)],
    ['machioka', 'gumball_stand', '뽑기 돌리기', 'play', 'poke_touch', 3, FUN(12), { cost: 100 }],
    ['pharmacy', 'counter_stand', '약 사 먹기', 'talk', 'talk_order', 4, { energy: 10 }, { cost: 200 }],
    ['pharmacy', 'shelf_look', '약 구경하기', 'browse', 'browse_shelf', 5, FUN(3)],
    ['pharmacy', 'window_look', '창밖 보기', 'gaze', 'idle_look', 3, FUN(2)],
    ['arcade', 'door_front', '가게 앞 구경하기', 'gaze', 'tilt_look', 3, FUN(4)],
    ['arcade', 'sign_look', '간판 보기', 'read', 'board_read', 2, FUN(3)],
    ['arcade', 'vine_look', '덩굴 살펴보기', 'gaze', 'tilt_look', 3, FUN(3)],
    ['recycle', 'cane_look', '지팡이 구경하기', 'browse', 'browse_shelf', 4, FUN(4)],
    ['lemon', 'crane_look', '크레인 구경하기', 'gaze', 'tilt_look', 3, FUN(4)],
    ['lemon', 'crate_stand', '상자 옮겨 보기', 'carry', 'carry_pile', 5, FUN(3)],
    ['lemon', 'door_front', '공장 앞 구경하기', 'gaze', 'idle_look', 3, FUN(2)],
    ['servers', 'queue_*', '소면 줄 서기', 'wait', 'idle_fidget', 4, FUN(2)],
    ['servers', 'bowl_stand', '소면 받아 먹기', 'eat', 'eat_bowl', 10, { hunger: 32 }, {}, 'bowl'],
    ['softcream', 'sign_look', '안내판 읽기', 'read', 'board_read', 2, FUN(3)],
    ['bigPudding', 'sign_look', '안내판 읽기', 'read', 'board_read', 2, FUN(3)],
    ['misoBank', 'stone_cross', '징검돌에서 강 내려다보기', 'gaze', 'tilt_look', 4, FUN(6)],
    ['goblin', 'fire_stand', '모닥불 쬐기', 'warm', 'warm_hands', 6, { energy: 4, fun: 5 }],
    ['dock', 'boat_sit_1|boat_sit_2', '배에 앉아 보기', 'sit', 'sit_idle', 8, { energy: 5, fun: 5 }],
    ['recycle', 'counter_stand', '계산대에 물어보기', 'talk', 'talk_order', 3, FUN(3)],
    ['bigPudding', 'climb_top', '푸딩 꼭대기에서 경치 보기', 'gaze', 'idle_look', 5, FUN(12)],
    ['castella', 'cutface_look', '카스텔라 단면 구경하기', 'gaze', 'tilt_look', 3, FUN(5)],
    ...['pier', 'dock'].flatMap(p => [
      [p, 'pier_walk', '부두 산책하기', 'gaze', 'idle_hum', 6, FUN(5)],
      [p, 'board_stand', '배 시간표 보기', 'read', 'board_read', 3, FUN(3)],
      [p, 'beach_stand', '바다 구경하기', 'gaze', 'idle_look', 6, { fun: 7, energy: 3 }],
    ]),
    ...['bungalow', 'islandHomes'].flatMap(p => [
      [p, 'porch_1|porch_2', '툇마루에서 쉬기', 'idle', 'idle_breathe', 10, { energy: 7 }],
      [p, 'door_1', '문 두드리기', 'knock', 'knock_door', 2, FUN(4)],
      [p, 'hut_front', '오두막 구경하기', 'gaze', 'tilt_look', 3, FUN(4)],
      [p, 'shade_sit', '그늘에 앉아 쉬기', 'sit', 'sit_idle', 12, { energy: 9, fun: 3 }],
    ]),
    ['islandHomes', 'hammock_lie', '해먹에서 흔들흔들', 'nap', 'sleep_breathe', 20, { energy: 16, fun: 8 }],
    ['islandPlaza', 'sit_*', '광장에 둘러앉기', 'sit', 'sit_idle', 10, { energy: 6, social: 8 }, { group: true }],
    ['islandPlaza', 'wood_stand', '장작 나르기', 'carry', 'carry_pile', 6, FUN(4)],
    ['islandPlaza', 'drink_stand', '야자 음료 마시기', 'drink', 'drink', 8, { fun: 12, hunger: 6 }, { cost: 200 }, 'cup'],
    ['shimajiro', 'sign_look', '메뉴판 보기', 'read', 'board_read', 2, FUN(3)],
    ['shimajiro', 'path_enter', '가게 길 둘러보기', 'gaze', 'idle_look', 3, FUN(3)],
    ['bridge', 'river_look', '흔들다리에서 강 보기', 'gaze', 'tilt_look', 4, FUN(7)],
    ['seaCave', 'cave_enter', '동굴 안 살펴보기', 'peek', 'peek_tiptoe', 5, FUN(8)],
    ['seaCave', 'boat_sit', '작은 배에 앉아 보기', 'sit', 'sit_idle', 8, { energy: 5, fun: 5 }],
    ['seaCave', 'shore_stand', '물가 산책하기', 'gaze', 'idle_look', 5, FUN(5)],
    ...['momongaHome', 'shisaHome', 'rakkoHome', 'kurimanjuHome', 'furuhonyaHome'].map(p => [p, 'door_front', '문 두드리기', 'knock', 'knock_door', 2, FUN(3)]),
  ].map(([place, socket, name, act, clip, min, gain, more = {}, prop]) => I(place, more.id || `x_${socket.replace(/[^a-z_0-9]/g, '')}`, name, [S(socket, act, min, clip, prop)], gain, { ...more, id: undefined }));
  for (const x of MORE) {
    delete x.id;
    x.id = `${x.place}.${x.steps[0].socket.replace(/[^a-z_0-9]/g, '')}.${x.name}`;
    LIST.push(x);
  }
  for (const w of ['shisa', 'furuhonya']) LIST.push(I(`${w}Home`, 'study', '집에서 검정 공부', [S('study_sit', 'study', 30, 'study_home', 'book')], { energy: -8, fun: -5 }, { skill: 'grass', worth: 300, only: [w], hours: [8, 23] }));

  // 둘이 마주 보고 하는 수다 (오브젝트 없이, 상대 캐릭터가 "오브젝트")
  const CHAT = { id: 'chat', name: '수다 떨기', gain: { social: 35, fun: 10 }, min: 12 };

  // 단계에 클립이 없으면 동작별 기본 클립을, 전용 클립이 정해진 상호작용은 그 클립을 쓴다 (anims-sims.js)
  const ACT = root.ACT_CLIPS || {};
  const FOR = root.CLIP_FOR || {};
  for (const x of LIST) {
    for (const st of x.steps) {
      const eat = (root.EAT_STYLE || {})[x.id];
      if (eat && (st.act === 'eat' || st.act === 'bite')) {
        st.clip = eat.clip;
        st.prop = eat.prop;
      } else if (FOR[x.id] && !st.prop) st.clip = FOR[x.id];
      else if (!st.clip && ACT[st.act]) st.clip = ACT[st.act];
    }
  }

  const BY_ID = Object.fromEntries(LIST.map(x => [x.id, x]));
  const NEEDS = [['hunger', '배부름', '#f9a55f'], ['energy', '기력', '#f2c230'], ['fun', '즐거움', '#78c46d'], ['social', '친구', '#f2748e'], ['hygiene', '청결', '#6fb3e0']];
  root.VillageObjects = { LIST, BY_ID, CHAT, NEEDS };
}(typeof self !== 'undefined' ? self : this));
