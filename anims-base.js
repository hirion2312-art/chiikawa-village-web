'use strict';

// 애니메이션 묶음 A — 기반 클립 (docs/animation-plan-2026-11-05.md §1·§6, 규칙 A1~A6)
// anims.js · anims/props.js · anim-rig.js 뒤에 불러온다. ANIMS에 합쳐진다.
//   앉기 규격: seat_enter / seat_idle / seat_exit — meta.seat가 앉은 자세 바탕(anim-rig seatPose)을 깐다.
//              좌면 종류(chair·floor·water)는 게임이 소켓에서 정해 넘긴다. 몸통 squash로 앉지 않는다 (A3)
//   그립 프로파일 견본: grip_one / grip_two / grip_tray / grip_long — 소품은 몸(model) 기준, 손은 grips 솔버가 맞춘다 (A2)
//   검정 공부 쓰기: exam_write — 앉아서 연필 끝이 종이 면에 닿은 채 작은 고리
//   쿠리만쥬 술 세트: drink_pick / drink_pour / drink_sip / drink_haa
// 좌표 단위: 'body' 소품은 모델 로컬(키 약 2.2, 몸 앞면 z≈0.86), 'ground' 소품은 루트(발밑) 기준 월드 단위
(function (root) {
  const K = (t, v, e = 'io') => [+t.toFixed(3), +v.toFixed(4), e];
  // 시간 표본으로 트랙 만들기 (그립이 따라갈 소품 궤적)
  const sample = (dur, n, f, ease = 'lin') => Array.from({ length: n + 1 }, (_, i) => K((dur * i) / n, f(i / n), ease));
  const TAU = Math.PI * 2;

  const CLIPS = {
    /* ---------- 앉기 규격 (A3) ---------- */

    // 서기→앉기: 앞으로 살짝 숙이며 내려앉고, 엉덩이가 닿는 박자(0.56~0.70)에만 0.97로 한 번 눌렸다 돌아온다
    seat_enter: {
      dur: 0.7, loop: false,
      tracks: {
        rotX: [K(0, 0), K(0.35, 0.12), K(0.7, 0)],
        armL: [K(0, 0), K(0.35, 0.28), K(0.7, 0.08)],
        armR: [K(0, 0), K(0.35, 0.28), K(0.7, 0.08)],
        squash: [K(0, 1, 'lin'), K(0.56, 1, 'snap'), K(0.62, 0.97, 'out'), K(0.7, 1)],
      },
      meta: { seat: 'enter', name: '앉기 (서기→앉기)', phase: 'prep', act: 'sit', tags: ['앉기', '전이'], desc: '좌면에 엉덩이를 붙이고 다리를 앞으로 뻗는다. 좌면 종류는 소켓이 정한다' },
    },
    // 앉아 있기: 숨은 posY ±0.006으로만 (squash 없음), 팔은 무릎 쪽에 가만히
    seat_idle: {
      dur: 3.2, loop: true,
      tracks: {
        posY: [K(0, 0), K(1.6, 0.006), K(3.2, 0)],
        armL: [K(0, 0.08), K(3.2, 0.08)],
        armR: [K(0, 0.08), K(3.2, 0.08)],
        rotZ: [K(0, 0), K(0.8, 0.012), K(2.4, -0.012), K(3.2, 0)],
      },
      meta: { seat: 'idle', name: '앉아 있기', phase: 'main', act: 'sit', tags: ['앉기', '루프'], desc: '앉은 자세 바탕. 앉아서 하는 동작(먹기·마시기)은 이 바탕 위에 얹는다' },
    },
    // 앉기→서기: 몸을 앞으로 실어 일어난다
    seat_exit: {
      dur: 0.6, loop: false,
      tracks: {
        rotX: [K(0, 0), K(0.25, 0.16), K(0.6, 0, 'back')],
        armL: [K(0, 0.08), K(0.25, 0.3), K(0.6, 0)],
        armR: [K(0, 0.08), K(0.25, 0.3), K(0.6, 0)],
      },
      meta: { seat: 'exit', name: '일어서기 (앉기→서기)', phase: 'close', act: 'sit', tags: ['앉기', '전이'] },
    },

    /* ---------- 그립 프로파일 견본 (A2) ---------- */

    // 한손: 잔을 오른쪽 옆에서 들어 올려 입 앞까지 갔다가 내려놓는다
    grip_one: {
      dur: 2.6, loop: false,
      props: [{ id: 'cup1', shape: 'cup', color: '#f3efe4', size: 0.28, attach: 'body', tracks: {
        px: [K(0, 1.06), K(0.8, 1.02), K(1.6, 1.02), K(2.6, 1.06)],
        py: [K(0, 0.56), K(0.8, 0.84), K(1.6, 0.84), K(2.6, 0.56)],
        pz: [K(0, 0.3), K(0.8, 0.46), K(1.6, 0.46), K(2.6, 0.3)],
      } }],
      grips: [{ hand: 'R', prop: 'cup1', point: [-0.36, 0, 0] }],
      meta: { name: '그립 견본: 한손 (잔)', phase: 'main', act: 'drink', tags: ['그립', '견본', '한손'], grip: 'one' },
    },
    // 양손: 그릇을 몸 앞 아래에서 두 손으로 받친다 (그릇 뒤쪽 테두리 두 점)
    grip_two: {
      dur: 2.4, loop: true,
      props: [{ id: 'bowl1', shape: 'bowl', color: '#e8dcc2', size: 0.42, attach: 'body', tracks: {
        px: [K(0, 0), K(2.4, 0)],
        py: [K(0, 0.5), K(1.2, 0.56), K(2.4, 0.5)],
        pz: [K(0, 1.03), K(2.4, 1.03)],
      } }],
      grips: [{ hand: 'R', prop: 'bowl1', point: [0.3, 0, -0.38] }, { hand: 'L', prop: 'bowl1', point: [-0.3, 0, -0.38] }],
      meta: { name: '그립 견본: 양손 (그릇)', phase: 'main', act: 'eat', tags: ['그립', '견본', '양손'], grip: 'two' },
    },
    // 쟁반: 몸 앞에서 두 손으로 뒤쪽 모서리를 잡고 수평을 지킨 채 아주 조금 오르내린다
    grip_tray: {
      dur: 2.0, loop: true,
      props: [{ id: 'tray1', shape: 'tray', color: '#a97c50', size: 1.1, attach: 'body', tracks: {
        py: [K(0, 0.62), K(1.0, 0.65), K(2.0, 0.62)],
        pz: [K(0, 1.25), K(2.0, 1.25)],
      } }],
      grips: [{ hand: 'R', prop: 'tray1', point: [0.42, 0.025, -0.29] }, { hand: 'L', prop: 'tray1', point: [-0.42, 0.025, -0.29] }],
      meta: { name: '그립 견본: 쟁반 (수평 유지)', phase: 'main', act: 'carry', tags: ['그립', '견본', '쟁반'], grip: 'tray' },
    },
    // 긴 물건: 막대를 몸 앞에 비스듬히 두 손으로 쥐고 한 번 휘두른다 (두 점 그립)
    grip_long: {
      dur: 2.2, loop: false,
      props: [{ id: 'rod1', shape: 'rod', color: '#a97c50', size: 1.5, attach: 'body', tracks: {
        px: [K(0, 0.05), K(2.2, 0.05)],
        py: [K(0, 0.7), K(0.9, 0.78, 'snap'), K(1.3, 0.62), K(2.2, 0.7)],
        pz: [K(0, 1.02), K(2.2, 1.02)],
        rz: [K(0, -1.2), K(0.9, -1.05, 'snap'), K(1.3, -1.4), K(2.2, -1.2)],
      } }],
      grips: [{ hand: 'R', prop: 'rod1', point: [0, -0.05, 0] }, { hand: 'L', prop: 'rod1', point: [0, 0.05, 0] }],
      meta: { name: '그립 견본: 긴 물건 (두 점)', phase: 'main', act: 'confront', tags: ['그립', '견본', '긴 물건'], grip: 'long' },
    },

    /* ---------- 검정 공부 쓰기 (exam.study) ---------- */

    // 앉아서 고개를 숙이고, 연필 끝(-0.5)이 종이 윗면에 닿은 채 작은 고리를 그린다. 무릎 위 받침 = 종이
    exam_write: (() => {
      const dur = 2.4;
      const PAPER_Y = 0.46;
      const tip = u => ({ x: 0.2 + Math.cos(u * TAU * 2) * 0.05, z: 1.0 + Math.sin(u * TAU * 2) * 0.025 });
      const len = 0.3;     // 연필 크기 (단위 길이 1 → 0.3)
      const RX = 0.36;     // 손 쪽(뒤)으로 기운 각
      const RZ = -0.27;    // 오른쪽으로 기운 각
      // 연필 중심 = 심 끝 + 회전한 (0, 0.5) × 길이. 심 끝이 종이 윗면(+0.003)에 정확히 닿는다
      const up = new THREE.Vector3(0, 0.5 * len, 0).applyEuler(new THREE.Euler(RX, 0, RZ));
      const top = PAPER_Y + 0.5 * 0.012 * 0.5;
      const cx = u => tip(u).x + up.x;
      const cy = () => top + up.y;
      const cz = u => tip(u).z + up.z;
      return {
        dur, loop: true,
        tracks: { rotX: [K(0, 0.14), K(dur, 0.14)], posY: [K(0, 0), K(dur / 2, -0.004), K(dur, 0)] },
        props: [
          { id: 'paper1', shape: 'paper', color: '#fffdf6', size: 0.5, attach: 'body', tracks: { px: [K(0, 0.12)], py: [K(0, PAPER_Y)], pz: [K(0, 1.02)] } },
          { id: 'pencil1', shape: 'pencil', color: '#f2c230', size: len, attach: 'body', tracks: {
            px: sample(dur, 24, cx), py: sample(dur, 24, cy), pz: sample(dur, 24, cz),
            rz: [K(0, RZ), K(dur, RZ)], rx: [K(0, RX), K(dur, RX)],
          } },
        ],
        grips: [{ hand: 'R', prop: 'pencil1', point: [0, 0.12, 0] }],
        contacts: [{ prop: 'pencil1', point: [0, -0.5, 0], surface: 'paper1', top: 0.006 }],
        meta: { seat: 'idle', name: '검정 공부 쓰기', phase: 'main', act: 'study', socket: 'desk_sit_*', tags: ['공부', '연필', '앉기'], desc: '연필 끝이 종이에 닿은 채 쓰기 고리. 고개 숙임 유지' },
      };
    })(),

    /* ---------- 쿠리만쥬 술 세트 (§4, 미구현 상호작용용) ---------- */
    // 탁자 면(ground)은 몸 앞 오른쪽. 잔은 탁자 위에 놓인 채(소품-표면 접촉), 병은 오른손
    drink_pick: {
      dur: 1.6, loop: false,
      props: [
        { id: 'table1', shape: 'surface', color: '#c9a57c', size: 1.0, attach: 'ground', tracks: { px: [K(0, 0.42)], py: [K(0, 0.36)], pz: [K(0, 1.12)] } },
        { id: 'bottle1', shape: 'bottle', color: '#7fa36b', size: 0.42, attach: 'body', tracks: {
          px: [K(0, 0.86), K(0.7, 0.86), K(1.6, 0.98)],
          py: [K(0, 0.6), K(0.7, 0.6), K(1.6, 0.74)],
          pz: [K(0, 0.95), K(0.7, 0.95), K(1.6, 0.52)],
        } },
      ],
      grips: [{ hand: 'R', prop: 'bottle1', point: [-0.2, -0.05, 0] }],
      meta: { name: '술: 병 들기', phase: 'prep', act: 'drink', tags: ['쿠리만쥬', '술', '시그니처'], character: 'kurimanju' },
    },
    drink_pour: {
      dur: 2.2, loop: false,
      props: [
        { id: 'table1', shape: 'surface', color: '#c9a57c', size: 1.0, attach: 'ground', tracks: { px: [K(0, 0.42)], py: [K(0, 0.36)], pz: [K(0, 1.12)] } },
        { id: 'cup1', shape: 'cup', color: '#f3efe4', size: 0.22, attach: 'ground', tracks: { px: [K(0, 0.518)], py: [K(0, 0.36 + 0.04 + 0.4 * 0.22)], pz: [K(0, 0.79)] } },
        { id: 'bottle1', shape: 'bottle', color: '#7fa36b', size: 0.42, attach: 'body', tracks: {
          px: [K(0, 0.98), K(0.6, 0.74), K(1.7, 0.74), K(2.2, 0.98)],
          py: [K(0, 0.74), K(0.6, 0.86), K(1.7, 0.86), K(2.2, 0.74)],
          pz: [K(0, 0.52), K(0.6, 0.98), K(1.7, 0.98), K(2.2, 0.52)],
          rx: [K(0, 0), K(0.6, 1.25), K(1.7, 1.25), K(2.2, 0)],
        } },
      ],
      grips: [{ hand: 'R', prop: 'bottle1', point: [-0.2, -0.05, 0] }],
      contacts: [
        { prop: 'cup1', point: [0, -0.4, 0], surface: 'table1', top: 0.04 },
        { kind: 'over', prop: 'bottle1', point: [0, 0.42, 0], target: 'cup1', targetPoint: [0, 0.4, 0], radius: 0.05, from: 0.8, to: 1.5 },
      ],
      meta: { name: '술: 따르기', phase: 'main', act: 'drink', tags: ['쿠리만쥬', '술', '시그니처'], character: 'kurimanju', desc: '병 입구가 잔 위에 머물고, 잔은 탁자 면에 놓인 채' },
    },
    drink_sip: {
      dur: 2.4, loop: false,
      props: [{ id: 'cup1', shape: 'cup', color: '#f3efe4', size: 0.22, attach: 'body', tracks: {
        px: [K(0, 1.0), K(0.8, 0.55), K(1.6, 0.55), K(2.4, 1.0)],
        py: [K(0, 0.6), K(0.8, 0.95), K(1.6, 0.95), K(2.4, 0.6)],
        pz: [K(0, 0.6), K(0.8, 1.08), K(1.6, 1.08), K(2.4, 0.6)],
        rx: [K(0, 0), K(0.8, -0.5), K(1.6, -0.5), K(2.4, 0)],
      } }],
      grips: [{ hand: 'R', prop: 'cup1', point: [0.36, 0, 0] }],
      tracks: { rotX: [K(0, 0), K(0.8, -0.12), K(1.6, -0.12), K(2.4, 0)] },
      meta: { name: '술: 잔 들어 마시기', phase: 'main', act: 'drink', tags: ['쿠리만쥬', '술', '시그니처'], character: 'kurimanju' },
    },
    // "하아~" 여운: 고개(몸)를 젖히고 어깨를 내린다. 소품 없음
    drink_haa: {
      dur: 2.0, loop: false,
      tracks: {
        rotX: [K(0, 0), K(0.5, -0.18), K(1.4, -0.18), K(2.0, 0)],
        posY: [K(0, 0), K(0.5, -0.015), K(1.4, -0.015), K(2.0, 0)],
        armL: [K(0, 0), K(0.5, -0.2), K(1.4, -0.2), K(2.0, 0)],
        armR: [K(0, 0), K(0.5, -0.2), K(1.4, -0.2), K(2.0, 0)],
        squash: [K(0, 1), K(0.5, 0.985), K(1.4, 0.985), K(2.0, 1, 'back')],
      },
      face: [[0, 'normal'], [0.5, 'joy'], [1.6, 'normal']],
      meta: { name: '술: 하아~ 여운', phase: 'react', act: 'drink', tags: ['쿠리만쥬', '술', '시그니처'], character: 'kurimanju' },
    },
  };

  // 소품만 움직이는 클립도 몸 트랙 칸은 있어야 한다 (animSampleClip 규약)
  for (const c of Object.values(CLIPS)) c.tracks = c.tracks || {};
  if (typeof ANIMS !== 'undefined') {
    Object.assign(ANIMS, CLIPS);
    if (typeof ANIM_LIST !== 'undefined') for (const id of Object.keys(CLIPS)) if (!ANIM_LIST.includes(id)) ANIM_LIST.push(id);
  }
  root.ANIMS_BASE = CLIPS;
}(typeof self !== 'undefined' ? self : this));
