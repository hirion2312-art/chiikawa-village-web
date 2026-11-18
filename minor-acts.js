'use strict';

// 치이카와 심즈 — 비주류 상호작용의 전용 동작 (2026-11-09 이재헌 지시 7번)
// 헌책 고르기, 뽑기, 번호표, 가로등·나무·화분 같은 작은 행동을 공용 동작 하나 대신 여러 단계로 나눈다.
// 근처를 지나는 주민이 잠깐 들르도록 점수도 함께 준다
(function (root) {
  const EASE = { s: 'snap', b: 'back', o: 'out', l: 'lin' };
  const track = text => text.trim().split(/\s+/).map(tok => {
    const m = tok.match(/^([\d.]+):(-?[\d.]+)([sbol]?)$/);
    return [+m[1], +m[2], EASE[m[3]] || 'io'];
  });
  const parseReach = text => text.trim().split(/\s+/).map(tok => {
    const m = tok.match(/^([a-zA-Z]+)(?:\(([^)]*)\))?@([\d.]+)$/);
    const off = (m[2] || '').split(',').map(Number);
    return { name: m[1], off: [off[0] || 0, off[1] || 0, off[2] || 0], t: +m[3] };
  });
  // once: 단계가 시작할 때 처음부터 한 번 재생하고 마지막 자세로 멈춘다
  function C(dur, body, hands, face, extra = {}) {
    const tracks = {};
    for (const [k, v] of Object.entries(body)) tracks[k] = track(v);
    const reach = {};
    for (const [k, v] of Object.entries(hands)) reach[k] = parseReach(v);
    return { dur, loop: true, tracks, reach, face: Array.isArray(face) ? face : [[0, face]], ...extra };
  }
  const ONCE = { once: true };
  const REST_L = 'hip(-.2,.1,0)';
  const HOLD = 'chest(.16,.06,.26)';

  const CLIPS = {
    // 헌책: 책등을 손가락으로 훑는다 → 한 권 뽑는다 → 펼쳐 넘긴다 → 도로 꽂는다
    book_scan: C(3, { rotY: '0:-.26 1.5:.26 3:-.26', rotX: '0:.05 1.5:.09 3:.05', rotZ: '0:.04 1.5:-.04 3:.04', posY: '0:0 .75:.03 1.5:0 2.25:.03 3:0' }, {
      R: 'front(.16,.28,0)@0 front(-.1,.3,0)@1.5 front(.16,.28,0)@3', L: `${REST_L}@0 ${REST_L}@3`,
    }, 'normal'),
    book_pull: C(1.6, { rotX: '0:.12 .55:.14 .95:-.08 1.6:.02', posZ: '0:.06 .55:.06 .95:-.06 1.6:0', footLY: '0:0 .85:0 .95:.06 1.1:0 1.6:0', squash: '0:1 .85:1 1:.97s 1.2:1b 1.6:1' }, {
      R: `front(.1,.24,0)@0 front(.1,.24,0)@.55 ${HOLD}@1.1 ${HOLD}@1.6`, L: `${REST_L}@0 chest(.1,.1,.22)@1.1 chest(.1,.1,.22)@1.6`,
    }, [[0, 'normal'], [1, 'surprised']], ONCE),
    page_read: C(4, { rotX: '0:.14 2:.2 4:.14', rotY: '0:-.05 2:.05 4:-.05', squash: '0:1 2:.99 4:1', propTilt: '0:.25 4:.25' }, {
      R: `${HOLD}@0 ${HOLD}@4`, L: 'chest(.08,.1,.26)@0 chest(.08,.1,.26)@1.1 chest(.32,.14,.26)@1.5 chest(.08,.1,.26)@1.9 chest(.08,.1,.26)@3.1 chest(.32,.14,.26)@3.5 chest(.08,.1,.26)@3.9 chest(.08,.1,.26)@4',
    }, [[0, 'normal'], [2.2, 'smile']]),
    book_return: C(1.5, { rotX: '0:.04 .7:.16 1:.16 1.5:.02', posZ: '0:0 .7:.07 1.5:0', squash: '0:1 1:.98 1.2:1b 1.5:1' }, {
      R: `${HOLD}@0 front(.1,.24,0)@.75 front(.1,.24,0)@1.5`, L: `chest(.1,.1,.22)@0 ${REST_L}@.8 ${REST_L}@1.5`,
    }, 'smile', ONCE),

    // 뽑기: 동전을 넣고 → 손잡이를 돌리고 → 캡슐을 열어 본다
    gum_coin: C(1.6, { rotX: '0:.06 .8:.14 1.6:.08', posY: '0:0 .8:.05 1.6:0' }, {
      R: `chest(.2,.1,.2)@0 front(.04,.14,0)@.8 front(.04,.14,0)@1.6`, L: `${REST_L}@0 ${REST_L}@1.6`,
    }, 'normal', ONCE),
    gum_turn: C(2, { rotX: '0:.1 2:.1', rotZ: '0:0 .5:.05 1:0 1.5:-.05 2:0', squash: '0:1 .5:.97 1:1 1.5:.97 2:1', footLY: '0:0 .5:.05 1:0 2:0' }, {
      R: 'front(.04,.04,0)@0 front(.2,-.06,0)@.5 front(.04,-.16,0)@1 front(-.12,-.06,0)@1.5 front(.04,.04,0)@2', L: 'chest(.3,.05,.16)@0 chest(.3,.05,.16)@2',
    }, 'flustered'),
    gum_open: C(2.4, { rotX: '0:.12 1:.16 1.3:-.06 2.4:0', posY: '0:0 1.2:0 1.5:.3o 1.8:0 2.05:.1o 2.25:0 2.4:0', squash: '0:1 1.15:.94s 1.3:1.04b 1.8:.96s 2:1' }, {
      R: 'front(.04,-.2,0)@0 chest(.16,.06,.24)@.6 chest(.16,.06,.24)@1.1 chest(.2,.24,.24)@1.5 chest(.2,.24,.24)@2.4', L: 'chest(.1,.06,.24)@.6 chest(.1,.06,.24)@1.1 chest(.32,.24,.2)@1.5 chest(.32,.24,.2)@2.4',
    }, [[0, 'normal'], [1.2, 'joy']], ONCE),

    // 번호표: 버튼을 누르고 나온 표를 뽑아 들여다본다
    ticket_pull: C(2, { rotX: '0:.14 .8:.16 1.2:.02 2:.06', posZ: '0:.06 .8:.06 1.2:-.02 2:0' }, {
      R: `front(.05,.1,0)@0 front(.05,.1,0)@.8 ${HOLD}@1.3 ${HOLD}@2`, L: `${REST_L}@0 ${REST_L}@2`,
    }, [[0, 'normal'], [1.3, 'smile']], ONCE),

    // 가로등: 손차양으로 꼭대기를 올려다본다 / 기둥을 톡톡 두드린다
    lamp_gaze: C(3, { rotX: '0:-.2 1.5:-.34 3:-.2', rotZ: '0:.05 1.5:-.05 3:.05', posY: '0:0 .8:.05 1.6:0 2.4:.05 3:0', footLY: '0:0 .8:.08 1.6:0 3:0', footRY: '0:0 1.6:0 2.4:.08 3:0' }, {
      R: 'brow(.14,.08,.14)@0 brow(.14,.08,.14)@3', L: `${REST_L}@0 ${REST_L}@3`,
    }, [[0, 'normal'], [1.8, 'smile']]),
    post_tap: C(1.8, { rotX: '0:.1 1.8:.1', rotY: '0:.12 .9:.22 1.8:.12', rotZ: '0:0 1.3:0 1.5:.08 1.8:.08' }, {
      R: 'front(.08,.1,0)@0 front(.08,.2,-.12)@.2 front(.08,.1,0)@.4 front(.08,.2,-.12)@.6 front(.08,.1,0)@.8 chest(.28,.05,.1)@1.3 chest(.28,.05,.1)@1.8', L: `${REST_L}@0 ${REST_L}@1.8`,
    }, [[0, 'normal'], [1.3, 'surprised']], ONCE),

    // 나무: 줄기를 쓰다듬고 → 흔들고 → 떨어지는 잎을 두 손으로 받는다 / 그늘에서 기지개 켜고 쉰다
    trunk_pat: C(1.5, { rotX: '0:.1 1.5:.1', squash: '0:1 .4:.98 .8:1 1.2:.98 1.5:1' }, {
      R: 'front(.1,.2,0)@0 front(.1,.04,0)@.4 front(.1,.2,0)@.8 front(.1,.04,0)@1.2 front(.1,.2,0)@1.5', L: 'front(.12,.1,0)@0 front(.12,.1,0)@1.5',
    }, 'smile'),
    leaf_catch: C(3, { rotX: '0:-.14 1.5:-.26 3:-.14', posZ: '0:0 .7:.1 1.4:-.08 2.2:.06 3:0', footLZ: '0:0 .7:.1 1.4:-.08 2.2:.06 3:0', footRZ: '0:0 .7:-.06 1.4:.1 2.2:-.04 3:0', footLY: '0:0 .35:.06 .7:0 1.4:0 1.75:.06 2.2:0 3:0' }, {
      R: 'chest(.3,.04,.26)@0 chest(.22,.1,.3)@1.5 chest(.3,.04,.26)@3', L: 'chest(.3,.04,.26)@0 chest(.22,.1,.3)@1.5 chest(.3,.04,.26)@3',
    }, [[0, 'normal'], [1.6, 'joy']]),
    shade_stretch: C(2.6, { posY: '0:0 1:.1 1.7:.1 2.6:0', rotX: '0:0 1:-.24 1.7:-.24 2.6:.02', squash: '0:1 1:1.05 1.7:1.05 2.2:.97 2.6:1', footLY: '0:0 1:.08 1.7:.08 2.2:0 2.6:0', footRY: '0:0 1:.08 1.7:.08 2.2:0 2.6:0' }, {
      R: 'chest(.3,.1,.1)@0 high(.14,.1,0)@1 high(.14,.1,0)@1.7 hip(-.2,.1,0)@2.6', L: 'chest(.3,.1,.1)@0 high(.14,.1,0)@1 high(.14,.1,0)@1.7 hip(-.2,.1,0)@2.6',
    }, [[0, 'normal'], [1, 'smile']], ONCE),
    shade_rest: C(5, { rotX: '0:-.1 2.5:-.14 5:-.1', rotZ: '0:.05 2.5:-.05 5:.05', squash: '0:1 1.25:.98 2.5:1 3.75:.98 5:1' }, {
      R: 'belly(.1,.05,.06)@0 belly(.1,.08,.06)@2.5 belly(.1,.05,.06)@5', L: 'belly(.1,.05,.06)@0 belly(.1,.08,.06)@2.5 belly(.1,.05,.06)@5',
    }, 'smile'),

    // 화분: 쪼그려 앉아 코를 대고 맡는다 → 재채기하거나 흐뭇하게 흔들린다
    flower_crouch: C(1.4, { footLY: '0:0 1:.2 1.4:.2', footRY: '0:0 1:.2 1.4:.2', posY: '0:0 1:-.17 1.4:-.17', rotX: '0:.02 1:.26 1.4:.26', squash: '0:1 1:.91 1.4:.91', footLZ: '0:0 1:.1 1.4:.1', footRZ: '0:0 1:.1 1.4:.1' }, {
      R: 'lap(.14,.05,.12)@0 lap(.14,.05,.2)@1.4', L: 'lap(.14,.05,.12)@0 lap(.14,.05,.2)@1.4',
    }, 'normal', ONCE),
    flower_sniff: C(2.4, { footLY: '0:.2 2.4:.2', footRY: '0:.2 2.4:.2', posY: '0:-.17 2.4:-.17', rotX: '0:.3 .7:.36 1.2:.3 1.9:.36 2.4:.3', squash: '0:.91 .7:.94 1.2:.9 1.9:.94 2.4:.91', footLZ: '0:.1 2.4:.1', footRZ: '0:.1 2.4:.1' }, {
      R: 'lap(.14,.05,.2)@0 lap(.14,.05,.2)@2.4', L: 'lap(.14,.05,.2)@0 lap(.14,.05,.2)@2.4',
    }, [[0, 'normal'], [1, 'smile']]),
    flower_sneeze: C(1.8, { footLY: '0:.2 .55:.1 .75:.2s 1.8:0', footRY: '0:.2 .55:.1 .75:.2s 1.8:0', posY: '0:-.17 .55:-.08 .75:-.17s 1.8:0', rotX: '0:.3 .55:-.2 .75:.3s 1.2:.1 1.8:0', squash: '0:.91 .55:1.04 .75:.88s 1.1:1b 1.8:1', footLZ: '0:.1 1.8:0', footRZ: '0:.1 1.8:0' }, {
      R: 'lap(.14,.05,.2)@0 chin(.14,-.1,.14)@.55 chin(.14,-.1,.14)@1 hip(-.2,.1,0)@1.8', L: 'lap(.14,.05,.2)@0 hip(-.2,.1,0)@1.8',
    }, [[0, 'worried'], [.75, 'surprised'], [1.3, 'flustered']], ONCE),
    flower_sway: C(1.8, { footLY: '0:.2 .9:.12 1.8:0', footRY: '0:.2 .9:.12 1.8:0', posY: '0:-.17 .9:-.1 1.8:0', rotZ: '0:.08 .45:-.08 .9:.08 1.35:-.04 1.8:0', rotX: '0:.3 1.8:0', squash: '0:.91 1.8:1', footLZ: '0:.1 1.8:0', footRZ: '0:.1 1.8:0' }, {
      R: 'lap(.14,.05,.2)@0 cheek(.16,.02,.1)@.9 cheek(.16,.02,.1)@1.8', L: 'lap(.14,.05,.2)@0 cheek(.16,.02,.1)@.9 cheek(.16,.02,.1)@1.8',
    }, 'joy', ONCE),

    // 기념사진: 자세를 잡고 브이
    photo_v: C(2.6, { posY: '0:0 .4:.12o .7:0 2.6:0', rotZ: '0:0 .7:.12 2.6:.12', rotY: '0:0 .7:.1 2.6:.1', squash: '0:1 .4:1.04 .7:.96s .9:1b 2.6:1' }, {
      R: 'cheek(.3,.26,.14)@.7 cheek(.3,.26,.14)@2.6', L: `${REST_L}@0 ${REST_L}@2.6`,
    }, [[0, 'normal'], [.6, 'joy']], ONCE),
  };
  for (const [id, clip] of Object.entries(CLIPS)) clip.id = id;
  Object.assign(ANIMS, CLIPS);
  // 풀뽑기: 손만 땅에 닿던 자세를 쪼그려 앉은 자세로
  Object.assign(ANIMS.weed_pull.tracks, { footLY: track('0:.14 1:.14 1.15:.1 1.6:.14 2.2:.14'), footRY: track('0:.14 1:.14 1.15:.1 1.6:.14 2.2:.14'), squash: track('0:.93 1:.91 1.15:1b 1.6:.93 2.2:.93') });

  const { BUILD, HAND } = root.VillageProps;
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  // 동전: 테두리와 가운데 구멍 무늬가 있는 얇은 원판
  BUILD.coin = () => {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 18), toon('#e3bb4a'));
    disc.rotation.x = Math.PI / 2;
    disc.position.z = 0.09;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 6, 18), toon('#c99a2e'));
    rim.position.z = 0.1;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), toon('#9a7420'));
    hole.rotation.x = Math.PI / 2;
    hole.position.z = 0.09;
    g.add(disc, rim, hole);
    return g;
  };
  // 캡슐: 투명한 위 반구, 분홍 아래 반구, 이음매 띠, 안에 든 작은 장난감
  BUILD.capsule = () => {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: '#dff1f7', transparent: true, opacity: 0.6 }));
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#f4a9bd'));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 20), toon('#e77f8f'));
    band.rotation.x = Math.PI / 2;
    const toy = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon('#f3c64f'));
    toy.position.y = 0.05;
    for (const m of [top, bottom, band, toy]) m.position.z = 0.16;
    g.add(top, bottom, band, toy);
    return g;
  };
  HAND.coin = 1;
  HAND.capsule = 1;

  const step = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

  // 상호작용 하나의 단계를 전용 순서로 바꾼다. 소켓은 원래 것을 그대로 쓴다
  const RULES = [
    [/^market\.books$/, (x, k) => [
      step(k, 'browse', 3, 'book_scan', null, '책등을 훑어보는 중'),
      step(k, 'take', 1.6, 'book_pull', 'book', '한 권 뽑는 중'),
      step(k, 'read', 8, 'page_read', 'book', '책장을 넘기는 중'),
      step(k, 'take', 1.5, 'book_return', 'book', '책을 도로 꽂는 중'),
    ]],
    [/^market\.buy_(grass|arb)_book$/, (x, k) => [
      step(k, 'browse', 3, 'book_scan', null, '교과서를 찾는 중'),
      step(k, 'take', 1.6, 'book_pull', 'book', '교과서를 뽑는 중'),
      step(k, 'pay', 2, 'pay_wait', 'book', '값을 치르는 중'),
    ]],
    [/^machioka\.gumball_stand/, (x, k) => [
      step(k, 'poke', 1.6, 'gum_coin', 'coin', '동전을 넣는 중'),
      step(k, 'play', 2.4, 'gum_turn', null, '손잡이를 돌리는 중'),
      step(k, 'take', 2.4, 'gum_open', 'capsule', '캡슐을 여는 중'),
    ]],
    [/^arbiter\.ticket_stand/, (x, k) => [
      step(k, 'poke', 1, 'poke_touch', null, '버튼을 누르는 중'),
      step(k, 'take', 2, 'ticket_pull', 'ticket', '번호표를 뽑는 중'),
    ]],
    [/^el_lamp_\d+\.look$/, (x, k) => {
      const gaze = step(k, 'gaze', 2.6, 'lamp_gaze', null, '가로등을 올려다보는 중');
      return hash(x.id) % 2 ? [gaze, step(k, 'poke', 1.8, 'post_tap', null, '기둥을 톡톡 두드리는 중')] : [step(k, 'poke', 1.8, 'post_tap', null, '기둥을 톡톡 두드리는 중'), gaze];
    }],
    [/^el_tree_\d+\.shake$/, (x, k) => [
      step(k, 'poke', 1.5, 'trunk_pat', null, '줄기를 쓰다듬는 중'),
      step(k, 'shake', 2, 'tree_shake', null, '나무를 흔드는 중'),
      step(k, 'gather', 2.4, 'leaf_catch', null, '떨어지는 잎을 받는 중'),
    ]],
    [/^el_tree_\d+\.shade$/, (x, k, st) => [
      step(k, 'idle', 2.6, 'shade_stretch', null, '기지개를 켜는 중'),
      step(k, 'idle', Math.max(4, st.min - 2.6), 'shade_rest', null, '그늘에서 쉬는 중'),
    ]],
    [/^el_planter_\d+\.smell$/, (x, k) => [
      step(k, 'idle', 1.4, 'flower_crouch', null, '화분 앞에 쪼그려 앉는 중'),
      step(k, 'smell', 2.4, 'flower_sniff', null, '꽃 향기를 맡는 중'),
      hash(x.id) % 3 === 0 ? step(k, 'idle', 1.8, 'flower_sneeze', null, '에취! 재채기하는 중') : step(k, 'idle', 1.8, 'flower_sway', null, '흐뭇하게 흔들리는 중'),
    ]],
    [/^(umaCurry\.photo_stand|statue\.oath)/, (x, k) => [
      step(k, x.steps[0].act, 2, 'oath_pose', null, '자세를 잡는 중'),
      step(k, 'pose', 2.6, 'photo_v', null, '브이 하는 중'),
    ]],
  ];

  root.MinorActs = {
    CLIPS,
    C,
    report: { rewritten: 0 },
    // 거리의 사물까지 다 생긴 뒤에 부른다
    apply(sim) {
      for (const x of sim.interactions) {
        const rule = RULES.find(([re]) => re.test(x.id));
        if (!rule) continue;
        const st = x.steps[0];
        x.steps = rule[1](x, st.socket, st);
        x.minor = true;
        this.report.rewritten++;
      }
    },
    // 근처를 지나다 잠깐 들른다. 배고프거나 지쳤으면, 또 방금 들렀으면 그냥 간다
    score(sim, c, x) {
      if (c.needs.hunger < 40 || c.needs.energy < 35) return 0;
      if (sim.minutes - (c.minorAt === undefined ? -999 : c.minorAt) < 50) return 0;
      const p = sim.places[x.place];
      if (!p) return 0;
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      // 헌책·뽑기·기념사진은 일부러 찾아간다
      const outing = /^market.books|gumball|photo_stand|statue.oath|ticket_stand|^pochette/.test(x.id);
      if (d > (outing ? 130 : 34)) return 0;
      if (outing) return 75 * (1 + d / 70);
      return 42 * (1 + d / 70) * (0.75 + ((c.traits && c.traits.curious) || 0.5) * 0.5);
    },
    finished(sim, c, x) { if (x.minor) c.minorAt = sim.minutes; },
  };
}(typeof self !== 'undefined' ? self : this));
