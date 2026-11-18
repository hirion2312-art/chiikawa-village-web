'use strict';

// 치이카와 심즈 — 장소별 캐릭터 전용 동작 (2026-11-10 이재헌 지시)
// scene-acts.js의 기물 장면에 맞춰 손 위치를 다시 적는다. 같은 동작을 돌려 쓰던 단계를 그 장소만의 동작으로 바꾼다
(function (root) {
  const { C } = root.MinorActs;
  const { part, sph, cyl, box, torus, FLAT } = root.PropModels.kit;
  const REST = 'hip(-.2,.1,0)';
  const rest = dur => `${REST}@0 ${REST}@${dur}`;
  const TABLE_L = 'front(.2,-.1,0)';
  // 식기를 그릇에서 입으로 옮기는 공통 박자의 손 경로
  const toMouth = (x, dur) => `front(${x},-.14,0)@0 front(${x},-.14,0)@${dur * 0.22} mouth(.04,-.06,.2)@${dur * 0.5} mouth(.04,-.06,.2)@${dur * 0.68} front(${x},-.14,0)@${dur}`;
  const chew = dur => `0:1 ${dur * 0.5}:.98 ${dur * 0.68}:1.02 ${dur}:1`;

  const CLIPS = {
    /* 음식 */
    curry_spoon: C(2.2, { rotX: '0:.16 1.1:.04 2.2:.16', squash: chew(2.2), rotZ: '0:0 1.5:.03 1.8:-.03 2.2:0' }, { R: toMouth(.1, 2.2), L: `${TABLE_L}@0 ${TABLE_L}@2.2` }, [[0, 'normal'], [1.1, 'flustered']]),
    tray_chop: C(2.6, { rotX: '0:.16 1.3:.06 2.6:.16', rotY: '0:-.12 1.3:0 2.6:.12', squash: chew(2.6) }, { R: toMouth(.04, 2.6), L: 'front(.24,-.08,0)@0 chest(.2,.02,.24)@1.3 front(.24,-.08,0)@2.6' }, [[0, 'normal'], [1.4, 'smile']]),
    big_slurp: C(2.4, { rotX: '0:.22 .6:.26 1.2:.02 1.8:.08 2.4:.22', posY: '0:0 1.2:.06 2.4:0', squash: '0:1 1:1.02 1.3:.96 1.6:1.02 1.9:.96 2.4:1' }, { R: 'front(.08,-.12,0)@0 front(.08,-.12,0)@.6 mouth(.04,.1,.24)@1.2 mouth(.04,-.04,.2)@1.9 front(.08,-.12,0)@2.4', L: `${TABLE_L}@0 ${TABLE_L}@2.4` }, [[0, 'normal'], [1.3, 'joy']]),
    parfait_spoon: C(2.4, { rotX: '0:.06 .8:.02 1.4:.12 2.4:.06', rotZ: '0:.04 1.2:-.04 2.4:.04', posY: '0:0 .4:.05 .8:0 2.4:0' }, { R: 'front(.06,.3,0)@0 front(.06,.3,0)@.5 mouth(.02,-.04,.22)@1.3 mouth(.02,-.04,.22)@1.6 front(.06,.3,0)@2.4', L: 'cheek(.2,0,.12)@0 cheek(.2,0,.12)@2.4' }, 'joy'),
    tako_pick: C(1.9, { rotX: '0:.14 .95:.04 1.9:.14', squash: chew(1.9) }, { R: toMouth(.1, 1.9), L: `${TABLE_L}@0 ${TABLE_L}@1.9` }, [[0, 'normal'], [1.2, 'flustered'], [1.6, 'smile']]),
    tako_turn: C(1.4, { rotX: '0:.16 1.4:.16', rotY: '0:-.14 .7:.14 1.4:-.14' }, { R: 'front(.3,-.04,0)@0 front(.18,-.1,0)@.25 front(.1,.02,0)@.5 front(.0,-.1,0)@.75 front(-.1,.02,0)@1 front(.3,-.04,0)@1.4', L: rest(1.4) }, 'normal'),
    wok_toss: C(1.2, { rotX: '0:.1 .5:-.08 .75:.18 1.2:.1', posY: '0:0 .5:.06 .75:0 1.2:0', squash: '0:1 .5:1.04 .75:.94 1:1.02 1.2:1', footLY: '0:0 .5:.05 .75:0 1.2:0' }, { R: 'front(.3,.02,0)@0 front(.34,.22,0)@.5 front(.3,-.04,0)@.75 front(.3,.02,0)@1.2', L: 'front(.1,.0,0)@0 front(.1,.0,0)@1.2' }, 'flustered'),
    dish_scrub: C(1.1, { rotX: '0:.2 1.1:.2', rotZ: '0:.04 .55:-.04 1.1:.04' }, { R: 'front(.26,-.06,0)@0 front(.06,-.1,0)@.28 front(.26,-.14,0)@.55 front(.06,-.1,0)@.82 front(.26,-.06,0)@1.1', L: 'front(.18,-.04,0)@0 front(.18,-.04,0)@1.1' }, 'normal'),
    basket_pick: C(2.2, { posY: '0:0 .7:.1o 1.1:.1 1.5:0 2.2:0', rotX: '0:-.08 .9:-.14 1.5:.14 2.2:.02', footLY: '0:0 .7:.08 1.1:.08 1.5:0', footRY: '0:0 .7:.08 1.1:.08 1.5:0' }, { R: 'chest(.24,.1,.2)@0 high(.1,-.2,0)@.8 high(.1,-.2,0)@1.1 chest(.26,-.1,.28)@1.6 chest(.24,.1,.2)@2.2', L: 'chest(.3,-.1,.2)@0 chest(.3,-.1,.2)@2.2' }, [[0, 'normal'], [1.6, 'smile']]),
    frog_pat: C(1.6, { rotX: '0:.14 1.6:.14', rotZ: '0:.06 .8:-.06 1.6:.06', squash: '0:1 .4:.97 .8:1 1.2:.97 1.6:1' }, { R: 'front(.14,.02,0)@0 front(.14,-.1,0)@.4 front(.14,.02,0)@.8 front(.14,-.1,0)@1.2 front(.14,.02,0)@1.6', L: 'cheek(.2,0,.12)@0 cheek(.2,0,.12)@1.6' }, 'joy'),

    /* 일·가게 */
    stamp_press: C(1.5, { rotX: '0:.08 .5:-.06 .75:.26s 1.1:.1 1.5:.08', posY: '0:0 .5:.08 .75:0s 1.5:0', squash: '0:1 .5:1.04 .75:.92s 1:1b 1.5:1' }, { R: 'front(.14,.12,0)@0 front(.14,.4,0)@.5 front(.14,-.1,0)@.75 front(.14,.0,0)@1.1 front(.14,.12,0)@1.5', L: 'front(.26,-.08,0)@0 front(.26,-.08,0)@1.5' }, [[0, 'normal'], [.75, 'flustered'], [1.1, 'smile']]),
    coin_count: C(1.8, { rotX: '0:.18 1.8:.18', rotY: '0:-.06 .9:.06 1.8:-.06' }, { R: 'front(.2,.02,0)@0 front(.04,-.08,0)@.3 front(.2,.02,0)@.6 front(.04,-.08,0)@.9 front(.2,.02,0)@1.2 front(.04,-.08,0)@1.5 front(.2,.02,0)@1.8', L: 'chest(.24,.0,.24)@0 chest(.24,.0,.24)@1.8' }, [[0, 'normal'], [1.2, 'smile']]),
    bell_tap: C(1.3, { rotX: '0:.1 .4:.16 .55:.08 1.3:.1', rotZ: '0:0 .7:.1 1.3:.1' }, { R: 'front(.12,.14,0)@0 front(.12,-.02,0)@.4 front(.12,.18,0)@.6 front(.12,.14,0)@1.3', L: 'cheek(.2,.1,.1)@.7 cheek(.2,.1,.1)@1.3' }, [[0, 'normal'], [.6, 'surprised']]),
    pen_write: C(2.4, { rotX: '0:.22 2.4:.22', rotZ: '0:.03 1.2:-.03 2.4:.03', rotY: '0:-.05 1.2:.05 2.4:-.05' }, { R: 'front(.26,-.08,0)@0 front(.04,-.08,0)@.6 front(.26,-.12,0)@.8 front(.04,-.12,0)@1.4 front(.26,-.16,0)@1.6 front(.04,-.16,0)@2.2 front(.26,-.08,0)@2.4', L: 'front(.2,-.1,0)@0 front(.2,-.1,0)@2.4' }, 'flustered'),
    notice_point: C(3, { rotX: '0:-.1 1.5:-.16 3:-.1', rotY: '0:-.22 1.5:.22 3:-.22', posY: '0:0 .75:.06 1.5:0 2.25:.06 3:0' }, { R: 'high(.22,-.28,0)@0 high(.02,-.3,0)@1.5 high(.22,-.28,0)@3', L: rest(3) }, [[0, 'normal'], [1.8, 'smile']]),
    drawer_pull: C(2.4, { rotX: '0:.1 .8:.0 1.5:.16 2.4:.1', posZ: '0:.04 .8:-.08 1.5:.04 2.4:.04' }, { R: 'front(.1,.08,0)@0 chest(.2,.1,.22)@.8 front(.12,.14,0)@1.2 chest(.2,.1,.22)@1.8 front(.1,.08,0)@2.4', L: 'front(.22,.08,0)@0 chest(.26,.1,.22)@.8 chest(.26,.1,.22)@2.4' }, [[0, 'normal'], [1.3, 'surprised'], [1.8, 'normal']]),
    slot_pull: C(2, { rotZ: '0:0 .5:-.12 .7:.1s 2:0', rotX: '0:.02 .7:.14 2:.02', squash: '0:1 .5:1.03 .7:.94s 1:1 2:1' }, { R: 'high(.22,-.3,0)@0 high(.22,-.32,0)@.5 chest(.34,0,.14)@.75 chest(.3,.1,.14)@2', L: rest(2) }, [[0, 'normal'], [1, 'surprised'], [1.6, 'joy']]),
    cane_twirl: C(2.4, { rotX: '0:.06 1.2:.12 2.4:.06', rotZ: '0:.05 1.2:-.05 2.4:.05' }, { R: 'chest(.3,.04,.26)@0 chest(.2,.12,.3)@.6 chest(.3,.14,.3)@1.2 chest(.36,.04,.28)@1.8 chest(.3,.04,.26)@2.4', L: 'cheek(.22,0,.12)@0 cheek(.22,0,.12)@2.4' }, 'surprised'),
    goods_hold: C(2.4, { posY: '0:0 1.2:.05 2.4:0', rotZ: '0:.08 1.2:-.08 2.4:.08', rotX: '0:.1 2.4:.1' }, { R: 'front(.16,.04,0)@0 chest(.2,.2,.3)@1.2 front(.16,.04,0)@2.4', L: 'front(.16,.04,0)@0 chest(.2,.2,.3)@1.2 front(.16,.04,0)@2.4' }, [[0, 'normal'], [1.2, 'joy']]),
    book_stack: C(1.6, { rotX: '0:.1 .8:.22 1.6:.1', posY: '0:0 .8:-.04 1.6:0', squash: '0:1 .8:.96 1.6:1' }, { R: 'chest(.26,.04,.24)@0 front(.16,-.08,0)@.8 chest(.26,.04,.24)@1.6', L: 'chest(.26,.04,.24)@0 front(.16,-.08,0)@.8 chest(.26,.04,.24)@1.6' }, 'normal'),
    flyer_hold: C(2.6, { rotX: '0:.06 1.3:.12 2.6:.06', rotY: '0:-.1 1.3:.1 2.6:-.1' }, { R: 'chest(.32,.16,.26)@0 chest(.32,.2,.26)@1.3 chest(.32,.16,.26)@2.6', L: 'chest(.32,.16,.26)@0 chest(.32,.2,.26)@1.3 chest(.32,.16,.26)@2.6' }, [[0, 'normal'], [1.6, 'surprised']]),
    crate_heave: C(2.2, { rotX: '0:.3 .7:.34 1.2:.02 2.2:.06', posY: '0:-.08 .7:-.1 1.2:.06 2.2:0', squash: '0:.92 .7:.9 1.2:1.05 1.6:.97 2.2:1', footLZ: '0:.1 1.2:0 2.2:0', footRZ: '0:-.1 1.2:0 2.2:0' }, { R: 'ground(.24)@0 ground(.24)@.7 chest(.34,.06,.24)@1.3 chest(.34,.06,.24)@2.2', L: 'ground(.24)@0 ground(.24)@.7 chest(.34,.06,.24)@1.3 chest(.34,.06,.24)@2.2' }, [[0, 'flustered'], [1.4, 'normal']]),
    crane_watch: C(3.2, { rotX: '0:-.2 1.6:-.34 3.2:-.2', rotY: '0:-.3 1.6:.3 3.2:-.3', posY: '0:0 .8:.08 1.6:0 2.4:.08 3.2:0' }, { R: 'high(.2,-.2,0)@0 high(.2,-.2,0)@3.2', L: 'brow(.14,.08,.14)@0 brow(.14,.08,.14)@3.2' }, [[0, 'normal'], [1.6, 'joy']]),

    /* 생활 */
    pot_stir: C(1.8, { rotX: '0:.16 1.8:.16', rotY: '0:-.08 .9:.08 1.8:-.08', squash: '0:1 .9:.98 1.8:1' }, { R: 'front(.24,.02,0)@0 front(.08,.02,-.08)@.45 front(-.04,.02,0)@.9 front(.08,.02,.0)@1.35 front(.24,.02,0)@1.8', L: 'hip(-.2,.1,0)@0 hip(-.2,.1,0)@1.8' }, [[0, 'normal'], [.9, 'smile']]),
    diary_write: C(3, { rotX: '0:.24 3:.24', rotZ: '0:.05 1.5:-.05 3:.05' }, { R: 'front(.22,-.1,0)@0 front(.02,-.1,0)@.8 front(.22,-.14,0)@1 front(.02,-.14,0)@1.8 front(.14,.14,0)@2.3 front(.22,-.1,0)@3', L: 'front(.2,-.1,0)@0 front(.2,-.1,0)@3' }, [[0, 'normal'], [2.3, 'worried'], [2.8, 'normal']]),
    key_turn: C(1.8, { rotX: '0:.12 1.8:.12', rotZ: '0:0 .8:.1 1.3:-.04 1.8:0', squash: '0:1 .8:.98 1.8:1' }, { R: 'chest(.08,.1,.34)@0 front(.06,.08,0)@.5 front(.06,.08,0)@1.4 chest(.28,.1,.2)@1.8', L: rest(1.8) }, [[0, 'normal'], [1.4, 'smile']]),
    sake_sip: C(2.6, { rotX: '0:.06 1:.0 1.5:-.24 2:-.24 2.6:.06', squash: '0:1 1.5:1.03 2:.97 2.6:1', rotZ: '0:.05 2.6:.05' }, { R: 'front(.2,-.04,0)@0 chin(.14,-.08,.16)@1 mouth(.04,-.04,.14)@1.5 mouth(.04,-.04,.14)@2 front(.2,-.04,0)@2.6', L: 'belly(.1,.05,.06)@0 belly(.1,.05,.06)@2.6' }, [[0, 'smile'], [2, 'joy']]),
    foam_pop: C(1.6, { posY: '0:0 .4:.14o .8:0 1.6:0', rotZ: '0:.06 .8:-.06 1.6:.06' }, { R: 'high(.2,-.3,0)@0 chest(.3,.3,.3)@.4 high(.0,-.3,0)@.8 chest(.3,.3,.3)@1.2 high(.2,-.3,0)@1.6', L: 'chest(.3,.1,.26)@0 high(.2,-.3,0)@.4 chest(.3,.1,.26)@.8 high(.2,-.3,0)@1.2 chest(.3,.1,.26)@1.6' }, 'joy'),
    broom_sweep: C(1.5, { rotY: '0:-.28 .75:.28 1.5:-.28', rotX: '0:.14 1.5:.14', posY: '0:0 .4:.03 .75:0 1.1:.03 1.5:0', footLY: '0:0 .4:.05 .75:0 1.5:0', footRY: '0:0 .75:0 1.1:.05 1.5:0' }, { R: 'chest(.34,.1,.24)@0 chest(.1,.0,.3)@.75 chest(.34,.1,.24)@1.5', L: 'chest(.26,-.08,.28)@0 chest(.2,-.1,.3)@.75 chest(.26,-.08,.28)@1.5' }, 'normal'),
    omamori_pick: C(2.2, { rotX: '0:.12 1.1:.16 2.2:.12', rotZ: '0:.06 1.1:-.06 2.2:.06' }, { R: 'front(.3,.04,0)@0 front(.12,.0,0)@.55 front(-.04,.04,0)@1.1 chest(.2,.16,.26)@1.7 front(.3,.04,0)@2.2', L: 'cheek(.2,0,.12)@0 cheek(.2,0,.12)@2.2' }, [[0, 'normal'], [1.7, 'smile']]),
    stone_throw: C(2.2, { rotY: '0:.5 .7:.7 1.1:-.5s 2.2:0', rotX: '0:0 .7:-.1 1.1:.2s 2.2:0', posY: '0:0 .7:.04 1.1:0 2.2:0', footLY: '0:0 .7:.1 1.1:0 2.2:0' }, { R: 'chest(.34,.2,-.1)@0 top(.4,-.5,-.2)@.7 far(.08,.1,0)@1.1 chest(.3,.08,.2)@2.2', L: 'chest(.3,.04,.2)@0 chest(.3,.04,.2)@2.2' }, [[0, 'normal'], [1.2, 'joy']]),
    berry_pick: C(1.8, { rotX: '0:.14 .6:.2 1.2:.1 1.8:.14', posY: '0:0 .6:-.04 1.8:0' }, { R: 'front(.24,.0,0)@0 front(.1,.08,0)@.55 chest(.2,-.04,.28)@1.2 front(.24,.0,0)@1.8', L: 'chest(.2,-.1,.28)@0 chest(.2,-.1,.28)@1.8' }, [[0, 'normal'], [1.2, 'smile']]),
    sand_throw: C(1.8, { rotX: '0:.28 .7:.3 1.1:-.04 1.8:.1', posY: '0:-.06 .7:-.08 1.1:.06 1.8:0', squash: '0:.94 .7:.92 1.1:1.04 1.8:1' }, { R: 'ground(.2)@0 ground(.2)@.7 far(.1,.3,0)@1.15 chest(.3,.1,.2)@1.8', L: 'ground(.2)@0 ground(.2)@.7 far(.2,.3,0)@1.15 chest(.3,.1,.2)@1.8' }, [[0, 'normal'], [1.2, 'surprised'], [1.5, 'joy']]),
  };
  // 상 위의 책을 읽는다: 손은 책장에 두고 가끔 넘긴다
  CLIPS.table_read = C(4.2, { rotX: '0:.24 2.1:.3 4.2:.24', rotY: '0:-.06 2.1:.06 4.2:-.06' }, {
    R: 'front(.22,-.1,0)@0 front(.22,-.1,0)@3 front(.02,-.04,0)@3.5 front(.22,-.1,0)@4 front(.22,-.1,0)@4.2', L: 'front(.22,-.1,0)@0 front(.22,-.1,0)@4.2',
  }, [[0, 'normal'], [2.4, 'smile']]);
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);

  /* ---------- 손 소품 ---------- */
  const { BUILD, HAND } = root.VillageProps;
  const reg = (id, fn) => { BUILD[id] = fn; HAND[id] = 1; };
  const G = () => new THREE.Group();
  reg('spoon', () => { const g = G(); part(g, cyl(0.012, 0.016, 0.26, 8), '#d3d6da', 0, 0.02, 0.14, FLAT); const h = part(g, sph(0.05, 10, 6), '#d3d6da', 0, 0.02, 0.3); h.scale.set(0.9, 0.3, 1.2); const r = part(g, sph(0.035, 8, 6), '#fffdf6', 0, 0.035, 0.3, 0, 0, 0, false); r.scale.y = 0.5; return g; });
  reg('spoon_long', () => { const g = G(); part(g, cyl(0.009, 0.012, 0.42, 8), '#d3d6da', 0, 0.02, 0.22, FLAT); const h = part(g, sph(0.035, 10, 6), '#d3d6da', 0, 0.02, 0.45); h.scale.set(0.9, 0.3, 1.2); return g; });
  reg('chopsticks', () => { const g = G(); for (const s of [-1, 1]) part(g, cyl(0.006, 0.012, 0.42, 6), '#a9583f', s * 0.014, 0.02, 0.22, FLAT, 0, s * 0.03); part(g, torus(0.03, 0.006, 4, 12), '#f4dc98', 0, 0.005, 0.42, FLAT, 0, 0, false); return g; });
  reg('toothpick', () => { const g = G(); part(g, cyl(0.004, 0.007, 0.26, 6), '#e0c090', 0, 0.02, 0.13, FLAT); part(g, sph(0.05, 10, 8), '#d9a15a', 0, 0.02, 0.27); return g; });
  reg('sponge', () => { const g = G(); part(g, box(0.16, 0.06, 0.1), '#f3d27a', 0, 0, 0.1); part(g, box(0.16, 0.02, 0.1), '#8fc586', 0, 0.04, 0.1, 0, 0, 0, false); return g; });
  reg('broom', () => { const g = G(); part(g, cyl(0.016, 0.018, 1, 8), '#a97c50', 0, -0.12, 0.08); const h = part(g, new THREE.ConeGeometry(0.15, 0.3, 10), '#d3b47a', 0, -0.72, 0.08, Math.PI, 0, 0); part(g, torus(0.06, 0.012, 5, 12), '#b0413c', 0, -0.56, 0.08, FLAT, 0, 0, false); return g; });
  reg('sake_cup', () => { const g = G(); part(g, cyl(0.06, 0.04, 0.05, 12), '#fffaf0', 0, 0, 0.09); part(g, cyl(0.05, 0.05, 0.004, 12), '#efe6c8', 0, 0.026, 0.09, 0, 0, 0, false); return g; });
  reg('stone', () => { const g = G(); const m = part(g, new THREE.DodecahedronGeometry(0.06, 1), '#a9a395', 0, 0, 0.08); m.scale.y = 0.7; return g; });

  /* ---------- 상 위에 두고 쓰는 것 ---------- */
  const FX = root.ActFx.FX;
  const bowlLathe = root.PropModels.kit.lathe([[0, 0], [0.16, 0], [0.26, 0.04], [0.36, 0.3], [0.33, 0.3], [0.16, 0.08], [0, 0.07]]);
  FX.s_ricebowl = { top: true, make(g) {
    const b = part(g, bowlLathe, '#c98a64');
    b.material.side = THREE.DoubleSide;
    const items = [];
    for (const [y, r] of [[0.28, 0.3], [0.33, 0.25], [0.38, 0.18], [0.43, 0.1]]) { const m = part(g, sph(r, 14, 8), '#fffdf6', 0, y, 0, 0, 0, 0, false); m.scale.y = 0.45; items.push(m); }
    return { items };
  }, run(d, t, u, c) { d.items.forEach((m, i) => { m.visible = c.all < 1 - i * 0.2 - 0.12; }); } };
  FX.s_readbook = { top: true, make(g) {
    const pivot = new THREE.Group();
    pivot.position.y = 0.05;
    g.add(pivot);
    part(g, box(0.72, 0.02, 0.5), '#7aa3c6', 0, 0.01, 0);
    part(g, box(0.33, 0.04, 0.46), '#fbf3e0', -0.17, 0.04, 0, 0, 0, 0.03);
    part(g, box(0.33, 0.04, 0.46), '#fbf3e0', 0.17, 0.04, 0, 0, 0, -0.03);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) part(g, box(0.24, 0.003, 0.016), '#b8a890', s * 0.17, 0.063, -0.16 + i * 0.065, 0, 0, 0, false);
    const leaf = new THREE.Mesh(box(0.33, 0.006, 0.45), new THREE.MeshToonMaterial({ color: '#fffaf0' }));
    leaf.position.x = 0.165;
    pivot.add(leaf);
    return { pivot };
  }, run(d, t) { const k = (t % 4.2) / 4.2; d.pivot.visible = k > 0.74 && k < 0.92; d.pivot.rotation.z = ((k - 0.74) / 0.18) * Math.PI; } };

  /* ---------- 어떤 장면의 어떤 동작을 무엇으로 ---------- */
  // 장면 → { 단계 act: [클립, 소품, 설명] }. *는 모든 단계
  const RULES = {
    s_curry: { eat: ['curry_spoon', 'spoon', '카레를 떠먹는 중'], bite: ['curry_spoon', 'spoon', '카레를 떠먹는 중'] },
    s_tray: { eat: ['tray_chop', 'chopsticks', '반찬을 집어 먹는 중'], bite: ['tray_chop', 'chopsticks', '반찬을 집어 먹는 중'] },
    s_bigbowl: { eat: ['big_slurp', 'chopsticks', '면을 후루룩 먹는 중'] },
    s_soba: { eat: ['big_slurp', 'chopsticks', '소바를 후루룩 먹는 중'] },
    s_parfait: { drink: ['parfait_spoon', 'spoon_long', '파르페를 떠먹는 중'], eat: ['parfait_spoon', 'spoon_long', '파르페를 떠먹는 중'] },
    s_takoboat: { eat: ['tako_pick', 'toothpick', '타코야키를 집어 먹는 중'], bite: ['tako_pick', 'toothpick', '타코야키를 집어 먹는 중'] },
    s_grill: { cook: ['tako_turn', 'toothpick', '타코야키를 뒤집는 중'] },
    s_wok: { cook: ['wok_toss', null, '웍을 흔들며 볶는 중'] },
    s_dishes: { wipe: ['dish_scrub', 'sponge', '그릇을 닦는 중'], cook: ['dish_scrub', 'sponge', '거품 내는 중'] },
    s_basket: { browse: ['basket_pick', null, '바구니에 담는 중'] },
    s_frog: { '*': ['frog_pat', null, '개구리 인형을 쓰다듬는 중'] },
    s_stamp: { hand: ['stamp_press', null, '도장을 받는 중'] },
    s_coins: { pay: ['coin_count', null, '보수를 세는 중'] },
    s_deskbell: { '*': ['bell_tap', null, '종을 누르는 중'] },
    s_paper: { study: ['pen_write', null, '답을 적는 중'], write: ['pen_write', null, '답을 적는 중'] },
    s_notice: { read: ['notice_point', null, '손가락으로 짚어 읽는 중'] },
    s_drawer: { browse: ['drawer_pull', null, '서랍을 열어 보는 중'], talk: ['drawer_pull', null, '약을 꺼내 보는 중'] },
    s_slot: { peek: ['slot_pull', null, '레버를 당겨 보는 중'], gaze: ['slot_pull', null, '레버를 당겨 보는 중'] },
    s_cane: { browse: ['cane_twirl', null, '지팡이를 돌려 보는 중'], inspect: ['cane_twirl', null, '지팡이를 살펴보는 중'] },
    s_goods: { browse: ['goods_hold', null, '포셰트를 들어 보는 중'] },
    s_pottery: { browse: ['goods_hold', null, '그릇을 들어 보는 중'], inspect: ['goods_hold', null, '그릇을 살펴보는 중'], wipe: ['goods_hold', null, '그릇을 닦는 중'] },
    s_books: { inspect: ['book_stack', null, '책을 쌓는 중'], carry: ['book_stack', null, '책을 나르는 중'] },
    s_flyer: { read: ['flyer_hold', null, '전단지를 펴 보는 중'] },
    s_crate: { carry: ['crate_heave', null, '상자를 들어 올리는 중'] },
    s_crane: { '*': ['crane_watch', null, '크레인을 구경하는 중'] },
    s_homepot: { cook: ['pot_stir', null, '밥을 짓는 중'] },
    s_diary: { '*': ['diary_write', null, '일기를 쓰는 중'] },
    s_key: { '*': ['key_turn', null, '열쇠를 돌리는 중'] },
    s_sake: { drink: ['sake_sip', 'sake_cup', '한잔 들이켜는 중'] },
    s_foam: { foam: ['foam_pop', null, '거품을 터뜨리는 중'] },
    s_broom: { weed: ['broom_sweep', 'broom', '마당을 쓰는 중'], wipe: ['broom_sweep', 'broom', '마당을 쓰는 중'] },
    s_omamori: { '*': ['omamori_pick', null, '부적을 고르는 중'] },
    s_splash: { '*': ['stone_throw', 'stone', '돌멩이를 던지는 중'] },
    s_berry: { gather: ['berry_pick', null, '열매를 따는 중'] },
    s_sand: { '*': ['sand_throw', null, '모래를 뿌리는 중'] },
  };

  root.SceneClips = {
    apply(sim) {
      let n = 0;
      for (const x of sim.interactions) {
        if (x.minor) continue;
        const rule = RULES[root.SceneActs.key(x)];
        if (!rule) continue;
        for (const st of x.steps) {
          if (st.fx) continue;
          const r = rule[st.act] || rule['*'];
          if (!r) continue;
          st.clip = r[0];
          st.prop = r[1];
          st.label = r[2];
          n++;
        }
      }
      // 상이 있는 자리: 그릇과 책은 상 위에 두고, 손에는 젓가락만 든다. 라멘 로는 그릇 모델을 그대로 쓴다
      const socketOf = (x, st) => {
        const name = String(st.socket).split('|')[0];
        const re = new RegExp('^' + name.split('*').join('.*') + '$');
        return Object.values(sim.sockets[x.place] || {}).find(v => v && v.name && re.test(v.name) && v.fx !== undefined);
      };
      const hasTable = k => !!k && root.SceneActs.topAt(k.fx, k.fz) - root.SceneActs.floorAt(k.fx, k.fz) >= 0.6;
      for (const x of sim.interactions) {
        if (x.id === 'ramenRo.ramen') {
          for (const st of x.steps) {
            if (st.clip === 'ramen_eat_noodles') Object.assign(st, { clip: 'big_slurp', prop: 'chopsticks', label: '면을 후루룩 먹는 중', fx: 'bowl.eat' });
            else if (st.clip === 'ramen_soup') Object.assign(st, { clip: 'curry_spoon', prop: 'spoon', label: '국물을 떠먹는 중', fx: 'bowl.soup' });
          }
          continue;
        }
        for (const st of x.steps) {
          if (st.fx) continue;
          if (st.prop === 'bowl' && (st.act === 'eat' || st.act === 'bite') && hasTable(socketOf(x, st))) {
            Object.assign(st, { prop: 'chopsticks', clip: 'tray_chop', label: '상에 두고 먹는 중' });
            if (!root.SceneActs.key(x)) x.sceneKey = 's_ricebowl';
            n++;
          } else if (st.prop === 'book_open' && hasTable(socketOf(x, st))) {
            Object.assign(st, { prop: null, clip: 'table_read', label: '책을 읽는 중', sceneKey: 's_readbook' });
            n++;
          }
        }
      }
      this.count = n;
      return n;
    },
  };
}(typeof self !== 'undefined' ? self : this));
