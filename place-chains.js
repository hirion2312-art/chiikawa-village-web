'use strict';

// 치이카와 심즈 — 장소별 동작 순서
// 한 상호작용을 그 장소다운 순서로 나눈다. 라멘은 면을 먹고 국물을 마시고, 카레는 맵다고 부채질을 하고,
// 신사는 동전을 던지고 줄을 흔들고 손뼉을 친 뒤에 빈다. 소켓 이름은 기존과 같고, 시간 합은 비슷하게 둔다
(function (root) {
  const S = (socket, act, min, clip, prop, fx) => ({ socket, act, min, clip, prop, fx });
  const { BY_ID } = root.VillageObjects;
  const CHAINS = {
    // 씻기
    'onsen.bath': [
      S('towel_stand', 'take', 2, 'towel_take', 'towel'),
      S('wash_sit_*', 'wash', 6, 'wash_scrub', 'towel'),
      S('wash_sit_*', 'douse', 3, 'wash_pour', 'bucket'),
      S('soak_*', 'soak', 3, 'soak_ahh'),
      S('soak_*', 'soak', 10, 'soak_relax'),
      S('soak_*', 'splash', 6, 'soak_splash'),
      S('soak_*', 'soak', 9, 'soak_towel', 'towel'),
      S('towel_stand', 'wipe', 3, 'wipe_towel', 'towel'),
      S('milk_stand', 'drink', 3, 'milk_gulp', 'milk'),
    ],
    'onsen.bubble': [S('bubble_play', 'foam', 15, 'foam_play')],
    'sauna.sauna': [
      S('sauna_sit_*', 'sweat', 9, 'sauna_sit'),
      S('sauna_sit_*', 'sweat', 4, 'sauna_fan', 'towel'),
      S('shower_stand', 'shower', 3, 'shower_scrub'),
      S('cold_soak', 'shiver', 6, 'cold_plunge'),
      S('rest_sit_*', 'bliss', 9, 'totonoi'),
    ],

    // 먹기
    'umaCurry.curry': [
      S('counter_sit_*|challenge_sit', 'talk', 2, 'talk_order'),
      S('counter_sit_*|challenge_sit', 'wait', 3, 'wait_tap'),
      S('counter_sit_*|challenge_sit', 'eat', 8, 'eat_spoon', 'bowl'),
      S('counter_sit_*|challenge_sit', 'spicy', 2, 'hot_fan'),
      S('counter_sit_*|challenge_sit', 'eat', 6, 'eat_spoon', 'bowl'),
      S('counter_sit_*|challenge_sit', 'idle', 2, 'wipe_mouth'),
      S('counter_sit_*|challenge_sit', 'idle', 2, 'belly_pat'),
    ],
    'umaiya.meal': [
      S('order_front', 'talk', 3, 'talk_order'),
      S('table_sit_*', 'wait', 4, 'wait_tap'),
      S('table_sit_*', 'eat', 18, 'eat_bowl', 'bowl'),
      S('table_sit_*', 'drink', 4, 'drink', 'cup'),
      S('table_sit_*', 'idle', 3, 'belly_pat'),
    ],
    'kissa.tea': [
      S('table_sit_*|counter_sit', 'read', 3, 'read_book', 'book'),
      S('table_sit_*|counter_sit', 'blow', 3, 'blow_hot', 'cup'),
      S('table_sit_*|counter_sit', 'drink', 16, 'drink', 'cup'),
      S('table_sit_*|counter_sit', 'idle', 3, 'tilt_look'),
    ],
    'soba.soba': [
      S('order_front', 'talk', 2, 'talk_order'),
      S('eat_stand_*', 'eat', 8, 'ramen_eat_noodles', 'bowl'),
      S('eat_stand_*', 'eat', 3, 'ramen_soup', 'bowl'),
      S('eat_stand_*', 'idle', 1, 'wipe_mouth'),
    ],
    'ramenYama.ramen': [
      S('ticket_buy', 'ticket', 3, 'ramen_ticket', 'ticket'),
      S('counter_sit_*', 'wait', 3, 'wait_tap'),
      S('counter_sit_*', 'eat', 17, 'ramen_eat_noodles', 'bowl'),
      S('counter_sit_*', 'eat', 3, 'ramen_soup', 'bowl'),
      S('counter_sit_*', 'bow', 2, 'ramen_bow'),
    ],
    'shimajiro.ramen': [
      S('counter_stand', 'talk', 2, 'talk_order'),
      S('table_sit_*', 'eat', 20, 'ramen_eat_noodles', 'bowl'),
      S('table_sit_*', 'eat', 3, 'ramen_soup', 'bowl'),
      S('table_sit_*', 'idle', 2, 'belly_pat'),
    ],
    'market.takoyaki': [
      S('takoyaki.order_front', 'pay', 2, 'pay_receive'),
      S('takoyaki.eat_sit_*', 'blow', 3, 'blow_hot', 'skewer'),
      S('takoyaki.eat_sit_*', 'bite', 9, 'eat_bite', 'skewer'),
      S('takoyaki.eat_sit_*', 'spicy', 1, 'hot_fan'),
      S('takoyaki.eat_sit_*', 'bite', 2, 'eat_bite', 'skewer'),
    ],
    'mucha.shop': [
      S('shelf_look_*', 'browse', 7, 'browse_shelf'),
      S('shelf_look_*', 'inspect', 3, 'inspect_item', 'ticket'),
      S('checkout_stand', 'pay', 2, 'pay_receive'),
      S('checkout_stand', 'bite', 2, 'eat_snack', 'snack'),
    ],
    'machioka.snack': [
      S('shelf_look_l|shelf_look_r', 'browse', 5, 'browse_shelf'),
      S('shelf_look_l|shelf_look_r', 'inspect', 3, 'inspect_item', 'snack'),
      S('door_front', 'bite', 6, 'eat_snack', 'snack'),
    ],
    'rice.rice': [
      S('pakapaka_front', 'poke', 3, 'lid_open'),
      S('scoop_stand|bowl_stand', 'gather', 3, 'rice_scoop', 'bowl'),
      S('scoop_stand|bowl_stand', 'eat', 12, 'eat_bowl', 'bowl'),
    ],
    'servers.dashi': [S('tap_stand', 'pour', 3, 'pour_tap', 'cup'), S('shade_sit', 'blow', 2, 'blow_hot', 'cup'), S('shade_sit', 'drink', 10, 'drink', 'cup')],
    'misoBank.miso': [
      S('taste_stand_n|taste_stand_s|ladle_stand', 'gather', 2, 'rice_scoop', 'cup'),
      S('taste_stand_n|taste_stand_s|ladle_stand', 'blow', 2, 'blow_hot', 'cup'),
      S('taste_stand_n|taste_stand_s|ladle_stand', 'drink', 6, 'drink', 'cup'),
    ],
    'sausage.sausage': [S('pull_stand', 'gather', 3, 'yank_pull'), S('pull_stand', 'bite', 9, 'eat_bite', 'sausage')],
    'softcream.cream': [S('pick_stand', 'poke', 3, 'lever_pull', 'cone'), S('shade_sit|float_stand', 'eat', 10, 'eat_lick', 'cone')],
    'castella.climb': [S('stairs_base', 'climb', 2, 'ladder_climb'), S('top_bounce|top_bounce_2', 'bounce', 9, 'bounce_big'), S('top_bounce|top_bounce_2', 'bite', 3, 'eat_bite', 'snack')],
    'bigPudding.slide': [S('ladder_stand', 'climb', 2, 'ladder_climb'), S('slide_start', 'play', 3, 'wave'), S('slide_start', 'play', 3, 'slide_down'), S('slide_end', 'play', 4, 'jump_joy')],

    // 쉬기
    'plaza.bench': [S('bench_sit_a|bench_sit_b', 'sit', 12, 'bench_swing'), S('bench_sit_a|bench_sit_b', 'idle', 3, 'idle_yawn'), S('bench_sit_a|bench_sit_b', 'sit', 5, 'bench_swing')],
    'statue.bench': [S('bench_sit_*', 'sit', 12, 'bench_swing'), S('bench_sit_*', 'idle', 3, 'idle_yawn'), S('bench_sit_*', 'sit', 5, 'bench_swing')],
    'islandPlaza.fire': [S('sit_*', 'warm', 12, 'warm_hands'), S('sit_*', 'warm', 15, 'roast_stick', 'skewer'), S('sit_*', 'bite', 3, 'eat_bite', 'skewer')],
    'hiroma.fire': [S('table_sit_*|bench_sit', 'warm', 12, 'warm_hands'), S('table_sit_*|bench_sit', 'warm', 13, 'roast_stick', 'skewer')],
    'bungalow.hammock': [S('hammock_lie', 'nap', 60, 'hammock_sway')],

    // 놀기
    'stage.perform': [S('perform_*', 'sing', 12, 'sing_mic', 'mic'), S('perform_*', 'dance', 7, 'dance_light'), S('perform_*', 'bow', 1, 'ramen_bow')],
    'stage.watch': [S('audience_*', 'sit', 10, 'sit_idle'), S('audience_*', 'cheer', 7, 'cheer_seat'), S('audience_*', 'cheer', 3, 'applaud')],
    'internet.pc': [S('pc_sit_*', 'type', 12, 'type_keys'), S('pc_sit_*', 'type', 8, 'click_mouse'), S('pc_sit_*', 'cheer', 2, 'cheer_seat'), S('pc_sit_*', 'type', 3, 'type_keys')],
    'pond.fish': [S('fish_sit', 'fish', 32, 'fish_wait', 'rod'), S('fish_sit', 'reel', 5, 'reel_pull', 'rod'), S('fish_sit', 'cheer', 3, 'jump_joy')],
    'bridge.cross': [S('cross_start', 'walk', 1, 'peek_tiptoe'), S('cross_mid', 'wobble', 4, 'wobble_fear'), S('cross_end', 'cheer', 1, 'jump_joy')],
    'goblin.peek': [S('torch_look|bone_look', 'peek', 5, 'fear_peek')],
    'yamanba.peek': [S('pot_look|candy_look', 'peek', 5, 'fear_peek')],
    'arcade.peek': [S('window_peek', 'peek', 6, 'peek_tiptoe')],
    'pond.look': [S('pond_look', 'gaze', 5, 'tilt_look'), S('pond_look', 'poke', 3, 'poke_touch')],
    'recycle.browse': [S('browse_stand|tv_look', 'browse', 7, 'browse_shelf'), S('browse_stand|tv_look', 'inspect', 5, 'inspect_item', 'book')],
    'market.clothes': [S('clothes.browse_front', 'browse', 5, 'browse_shelf'), S('clothes.browse_front', 'inspect', 5, 'hold_chest', 'towel')],
    'market.pottery': [S('pottery.browse_front', 'browse', 3, 'browse_shelf'), S('pottery.browse_front', 'inspect', 5, 'inspect_item', 'bowl')],
    'market.books': [S('books.browse_front', 'browse', 3, 'browse_shelf'), S('books.browse_front', 'read', 12, 'read_book', 'book')],
    'shrine.pray': [
      S('torii_pass', 'bow', 1, 'ramen_bow'),
      S('pray_stand|offer_stand', 'coin', 1, 'coin_toss'),
      S('pray_stand|offer_stand', 'bell', 1, 'rope_pull'),
      S('pray_stand|offer_stand', 'clap', 1, 'applaud'),
      S('pray_stand|offer_stand', 'pray', 3, 'pray_bow'),
    ],
    'statue.oath': [S('oath_stand', 'pose', 4, 'oath_pose')],
  };
  const bad = [];
  for (const [id, steps] of Object.entries(CHAINS)) {
    const x = BY_ID[id];
    if (!x) {
      bad.push(id);
      continue;
    }
    x.steps = steps;
  }

  // 동작 하나로 끝나던 것은 뒤에 반응을 붙인다: 읽고 끄덕이고, 엿보고 놀라고, 문을 두드리고 귀를 기울인다
  const BEATS = { read: 'read_nod', gaze: 'point_ooh', peek: 'surprised', knock: 'listen_door', browse: 'inspect_item', poke: 'chat_nod', take: 'jump_joy' };
  function addBeats(steps) {
    if (steps.length !== 1) return steps;
    const st = steps[0];
    const clip = BEATS[st.act];
    if (!clip || st.min < 2) return steps;
    const after = Math.max(1, Math.round(st.min * 0.4));
    return [{ ...st, min: st.min - after }, { ...st, min: after, clip, prop: clip === 'inspect_item' ? st.prop : null }];
  }
  for (const x of root.VillageObjects.LIST) {
    if (x.night || x.takeKind || x.accept || x.settle || x.plate) continue;
    x.steps = addBeats(x.steps);
  }
  root.VillageObjects.addBeats = addBeats;
  if (bad.length) console.warn('[place-chains] 없는 상호작용', bad);
}(typeof self !== 'undefined' ? self : this));
