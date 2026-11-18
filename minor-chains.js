'use strict';

// 치이카와 심즈 — 비주류 상호작용을 여러 단계로 (2026-11-10 이재헌 지시 7번)
// 한 단계짜리 구경·읽기·찌르기·두드리기 상호작용을 그 행동다운 2~4단계로 쪼개고, 단계마다 다른 동작을 쓴다.
// 같은 동작(tilt_look 등)에 수십 개가 몰려 있던 쏠림을 줄인다.
(function (root) {
  const VO = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  // act → [단계 모양들]. 단계: [act, 비율, clip, prop, 말]. 비율은 원래 시간 중 몫
  const CHAINS = {
    gaze: [
      [['gaze', 0.3, 'idle_look', null, '두리번두리번'], ['gaze', 0.5, 'tilt_look', null, '빤히 보는 중'], ['idle', 0.2, 'chat_nod', null, '흐음']],
      [['peek', 0.3, 'peek_tiptoe', null, '발돋움해서 보는 중'], ['gaze', 0.5, 'idle_look', null, '구경하는 중'], ['idle', 0.2, 'jump_joy', null, '오오']],
      [['gaze', 0.4, 'tilt_look', null, '고개 갸웃'], ['poke', 0.3, 'poke_touch', null, '살짝 만져 보는 중'], ['idle', 0.3, 'belly_pat', null, '그렇구나']],
    ],
    peek: [
      [['peek', 0.4, 'peek_tiptoe', null, '살금살금 엿보는 중'], ['peek', 0.3, 'fear_peek', null, '숨죽이고 보는 중'], ['idle', 0.3, 'surprised', null, '앗!']],
      [['peek', 0.5, 'peek_tiptoe', null, '안을 들여다보는 중'], ['idle', 0.5, 'tilt_look', null, '뭐가 있지?']],
    ],
    read: [
      [['read', 0.2, 'tilt_look', null, '글씨를 찾는 중'], ['read', 0.6, 'board_read', null, '읽는 중'], ['idle', 0.2, 'chat_nod', null, '끄덕끄덕']],
      [['read', 0.6, 'board_read', null, '꼼꼼히 읽는 중'], ['idle', 0.4, 'inspect_item', null, '다시 확인']],
    ],
    poke: [
      [['gaze', 0.3, 'tilt_look', null, '이게 뭐지'], ['poke', 0.5, 'poke_touch', null, '콕콕'], ['idle', 0.2, 'surprised', null, '움찔']],
      [['poke', 0.6, 'poke_touch', null, '만져 보는 중'], ['idle', 0.4, 'jump_joy', null, '재밌다']],
    ],
    knock: [
      [['knock', 0.5, 'knock_door', null, '똑똑'], ['wait', 0.3, 'tilt_look', null, '대답을 기다리는 중'], ['idle', 0.2, 'belly_pat', null, '아무도 없나']],
    ],
    pose: [
      [['pose', 0.3, 'oath_pose', null, '자세 잡는 중'], ['pose', 0.5, 'photo_v', null, '브이!'], ['idle', 0.2, 'jump_joy', null, '찰칵']],
    ],
    take: [
      [['gaze', 0.3, 'tilt_look', null, '살펴보는 중'], ['take', 0.4, 'plate_pick', null, '들어 보는 중'], ['idle', 0.3, 'inspect_item', null, '이리저리 보는 중']],
    ],
  };
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  let n = 0;
  for (const x of VO.LIST) {
    if (!x.steps || x.steps.length !== 1 || x.night || x.plate || x.takeKind || x.shift || x.earn || x.isJob || x.examTake || x.sceneKey === 's_none') continue;
    const st = x.steps[0];
    const shapes = CHAINS[st.act];
    if (!shapes || st.prop || st.fx || (x.gain && (x.gain.hunger || x.gain.energy > 10))) continue;
    const shape = shapes[hash(x.id) % shapes.length];
    const total = Math.max(3, st.min || 3);
    x.steps = shape.map(([act, part, clip, prop, label]) => S(st.socket, act, Math.max(1, Math.round(total * part * 10) / 10), clip, prop, label));
    n++;
  }

  // 헌책방·뽑기·기념사진 등은 minor-acts.js(다른 작업자)가 전용 세트로 덮어쓴다. 여기서는 그 밖의 한 단계짜리만 나눈다
  root.MinorChains = { count: n };
}(typeof self !== 'undefined' ? self : this));
