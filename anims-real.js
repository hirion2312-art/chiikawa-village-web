'use strict';

// 치이카와 심즈 — 실감 동작. 손이 실제로 입·가슴·물건에 닿도록 팔을 계산한다
// 클립은 "손이 언제 어디에 있는가"로 적는다 (reach). 캐릭터마다 몸이 달라도 아래 anchors가 그 몸의 입 위치를 재고,
// anim-rig.js의 solveArm이 거기에 손끝이 닿는 팔 값을 구한다.
// reach 형식: '이름(옆,위,앞)@시각' (옆 + 는 그 손의 바깥쪽). 시각 사이는 부드럽게 옮겨 간다
(function (root) {
  // 다른 작업자가 만든 anims.js 클립은 쓰지 않는다. false로 바꾸면 그대로 돌아온다 (파일은 지우지 않았다)
  const HOLD_OLD_CLIPS = true;
  const OLD = ['idle_breathe', 'idle_look', 'idle_fidget', 'idle_stretch', 'idle_yawn', 'idle_drowsy', 'idle_belly', 'idle_hum', 'idle_step',
    'eat_bowl', 'drink', 'give_hand', 'receive', 'wave', 'jump_joy', 'surprised', 'nap_down', 'sleep_breathe', 'sleep_roll', 'sit_down', 'sit_idle',
    'cry', 'comfort', 'dance_light', 'ramen_ticket', 'ramen_hand_ticket', 'ramen_call', 'ramen_eat_noodles', 'ramen_soup', 'ramen_bow', 'walk_cycle'];
  root.ANIMS_HELD = {};
  if (HOLD_OLD_CLIPS) {
    for (const id of OLD) {
      if (ANIMS[id]) {
        root.ANIMS_HELD[id] = ANIMS[id];
        delete ANIMS[id];
      }
    }
  }

  /* ---------- 표기 ---------- */

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
  // C(길이, 몸 트랙, 손, 표정, 추가)
  function C(dur, body, hands = {}, face = 'normal', extra = {}) {
    const tracks = {};
    for (const [k, v] of Object.entries(body)) tracks[k] = track(v);
    const reach = {};
    for (const [k, v] of Object.entries(hands)) reach[k] = parseReach(v);
    return { dur, loop: true, tracks, reach, face: Array.isArray(face) ? face : [[0, face]], ...extra };
  }

  /* ---------- 몸의 기준점 ---------- */

  const ANCH = new WeakMap();
  function anchors(actor) {
    if (ANCH.has(actor.built)) return ANCH.get(actor.built);
    const info = AnimRig.rigInfo(actor.built, actor.preset);
    const ray = new THREE.Ray();
    const hit = new THREE.Vector3();
    // 몸 앞쪽 표면의 z (높이 y, 옆 x)
    const front = (y, x = 0) => {
      ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
      let z = null;
      for (const tr of info.tris) {
        if (ray.intersectTriangle(tr.t.a, tr.t.b, tr.t.c, false, hit) && (z === null || hit.z > z)) z = hit.z;
      }
      return z === null ? 0.7 : z;
    };
    const T = actor.preset.footT;
    const my = T * 0.5 + (actor.preset.mouthY || 0);
    const P = {
      mouth: [0, my, front(my) + 0.03],
      chin: [0, my - 0.2, front(my - 0.2) + 0.08],
      eyes: [0, my + 0.3, front(my + 0.3) + 0.04],
      brow: [0, my + 0.42, front(my + 0.42) + 0.1],
      cheek: [0.45, my + 0.04, front(my + 0.04, 0.45) + 0.03],
      chest: [0, T * 0.4, front(T * 0.4) + 0.24],
      belly: [0, T * 0.28, front(T * 0.28) + 0.12],
      lap: [0.22, T * 0.2, front(T * 0.25) + 0.16],
      front: [0, T * 0.45, front(T * 0.45) + 0.55],
      far: [0, T * 0.5, front(T * 0.5) + 0.8],
      high: [0, T * 0.82, front(T * 0.6) + 0.55],
      low: [0, T * 0.1, front(T * 0.3) + 0.55],
      ground: [0, 0.02, front(T * 0.3) + 0.6],
      top: [0.2, T + 0.5, 0.1],
      side: [1.2, T * 0.35, 0.1],
      hip: [0.95, T * 0.22, 0.2],
    };
    // 정수리 높이: 위에서 내려다본 가장 높은 면 (귀를 피해 가운데 앞쪽)
    ray.set(new THREE.Vector3(0, 9, 0.12), new THREE.Vector3(0, -1, 0));
    let crown = T;
    for (const tr of info.tris) if (ray.intersectTriangle(tr.t.a, tr.t.b, tr.t.c, false, hit) && hit.y > crown) crown = hit.y;
    const out = { P, sign: {}, crown };
    for (const [hand, name] of [[0, 'L'], [1, 'R']]) {
      const tip = AnimRig.tipFor(actor.built, info, hand, 0, 0, 0, 0);
      out.sign[name] = tip.x >= 0 ? 1 : -1;
    }
    ANCH.set(actor.built, out);
    return out;
  }

  /* ---------- 굽기: 시간마다 팔 값을 푼다 ---------- */

  const BAKED = new WeakMap();
  const smooth = u => u * u * (3 - 2 * u);
  const shapeKey = p => [p.footT, p.armLen, p.armSize, p.armT, p.armAngle, p.armIn, p.armDown, p.armOut, p.headW, p.bodyW, p.mouthY || 0].join();
  const shared = new Map();
  // 몸에 닿는 지점은 팔을 길게 늘여서라도 닿게 하고, 몸 밖을 가리키는 지점은 팔을 과하게 늘이지 않는다
  const OUTER = new Set(['front', 'far', 'high', 'low']);
  const TOUCH = new Set(['mouth', 'chin', 'cheek', 'eyes', 'brow', 'chest', 'belly', 'lap']);
  const stretchOf = k => (TOUCH.has(k.name) ? 0.9 : 0.7);
  // touch: 앞에 있는 물건까지의 거리 (모델 단위). 몸 밖으로 뻗는 손은 그 면에서 멈추고, 팔을 늘여서 닿는다
  function perOf(actor) {
    let per = BAKED.get(actor.built);
    if (!per) BAKED.set(actor.built, per = new Map());
    return per;
  }
  const perKeyOf = (clip, touch) => (touch ? `${clip.id}@${touch}` : clip);
  function bake(actor, clip, touch = 0) {
    const per = perOf(actor);
    const perKey = perKeyOf(clip, touch);
    if (per.has(perKey)) return per.get(perKey);
    // 같은 몸집의 주민은 계산을 나눠 쓴다
    const key = `${shapeKey(actor.preset)}|${clip.id}|${touch}`;
    if (shared.has(key)) {
      per.set(perKey, shared.get(key));
      return shared.get(key);
    }
    const steps = bakeSteps(actor, clip, touch, per, perKey, key);
    while (!steps.next().done);
    return per.get(perKey);
  }
  // 프레임 사이사이에 나눠서 미리 계산한다 (이미 있으면 null)
  function prebake(actor, clip, touch = 0) {
    const per = perOf(actor);
    const perKey = perKeyOf(clip, touch);
    if (per.has(perKey)) return null;
    const key = `${shapeKey(actor.preset)}|${clip.id}|${touch}`;
    if (shared.has(key)) {
      per.set(perKey, shared.get(key));
      return null;
    }
    return bakeSteps(actor, clip, touch, per, perKey, key);
  }
  function* bakeSteps(actor, clip, touch, per, perKey, key) {
    const info = AnimRig.rigInfo(actor.built, actor.preset);
    const A = anchors(actor);
    const STEP = 0.06;
    const tracks = {};
    const report = {};
    const leans = [];
    const leanN = Math.max(2, Math.ceil(clip.dur / STEP));
    for (const [hand, name] of [[0, 'L'], [1, 'R']]) {
      const keys = clip.reach[name];
      if (!keys) continue;
      const sign = A.sign[name];
      const at = k => {
        const p = A.P[k.name];
        const v = new THREE.Vector3(p[0] * (k.name === 'cheek' || k.name === 'lap' || k.name === 'side' || k.name === 'hip' || k.name === 'top' ? sign : 1) + k.off[0] * sign, p[1] + k.off[1], p[2] + k.off[2]);
        if (touch && OUTER.has(k.name)) v.z = Math.min(v.z, touch);
        return v;
      };
      const n = Math.max(2, Math.ceil(clip.dur / STEP));
      let prev = [0, 0, 0, 0];
      const a = [];
      const pitch = [];
      const ext = [];
      const fwd = [];
      let worst = 0;
      for (let i = 0; i <= n; i++) {
        const t = (clip.dur * i) / n;
        let j = 0;
        while (j + 1 < keys.length && keys[j + 1].t <= t) j++;
        const k0 = keys[j];
        const k1 = keys[Math.min(j + 1, keys.length - 1)];
        const u = k1.t > k0.t ? smooth(Math.min(1, (t - k0.t) / (k1.t - k0.t))) : 0;
        const target = at(k0).lerp(at(k1), u);
        const ext0 = touch && OUTER.has(k0.name) ? 0.9 : stretchOf(k0);
        const ext1 = touch && OUTER.has(k1.name) ? 0.9 : stretchOf(k1);
        const maxExt = ext0 + (ext1 - ext0) * u;
        const r = AnimRig.solveArm(actor.built, info, hand, target, prev, maxExt);
        // 그래도 모자라면 몸을 그만큼 기울여 닿는다
        if (touch && (OUTER.has(k0.name) || OUTER.has(k1.name))) {
          const tipZ = AnimRig.tipFor(actor.built, info, hand, r.a, r.pitch, r.ext, r.fwd).z;
          leans[i] = Math.max(leans[i] || 0, Math.min(0.35, target.z - tipZ));
        }
        prev = [r.a, r.pitch, r.ext, r.fwd];
        worst = Math.max(worst, r.err);
        a.push([t, r.a, 'lin']);
        pitch.push([t, r.pitch, 'lin']);
        ext.push([t, r.ext, 'lin']);
        fwd.push([t, r.fwd, 'lin']);
        yield;
      }
      tracks[`arm${name}`] = a;
      tracks[`armPitch${name}`] = pitch;
      tracks[`armExt${name}`] = ext;
      tracks[`armFwd${name}`] = fwd;
      report[name] = worst;
    }
    for (const arm of actor.built.arms) if (arm.anchor) arm.anchor(0);
    if (leans.length) tracks.lean = Array.from({ length: leanN + 1 }, (_, i) => [(clip.dur * i) / leanN, leans[i] || 0, 'lin']);
    const out = { tracks, report };
    per.set(perKey, out);
    shared.set(key, out);
  }
  function apply(actor, clip, pose, local) {
    const d = actor.c && actor.c.doing;
    const raw = d && d.kind === 'obj' && d.phase === 'use' && d.socket && d.socket.touch ? d.socket.touch / (actor.preset.scale || 0.8) : 0;
    const b = bake(actor, clip, raw ? Math.round(raw * 20) / 20 : 0);
    for (const [ch, keys] of Object.entries(b.tracks)) if (ch !== 'lean') pose[ch] = animSampleTrack(keys, local);
    if (b.tracks.lean) pose.posZ = (pose.posZ || 0) + animSampleTrack(b.tracks.lean, local);
    pose.propTilt = clip.tracks.propTilt ? animSampleTrack(clip.tracks.propTilt, local) : 0;
    pose.food = clip.tracks.food ? animSampleTrack(clip.tracks.food, local) : 0;
    pose.propLift = clip.tracks.propLift ? animSampleTrack(clip.tracks.propLift, local) : 0;
    return pose;
  }

  /* ---------- 클립 ---------- */

  const B = '(0,.02,.12)';              // 왼손 그릇 위
  const CLIPS = {
    // 마시기: 잔을 들어 입에 대고 기울여 삼키고, 내려놓고 숨을 내쉰다
    drink: C(5, {
      rotX: '0:.02 1:.02 1.7:-.2 2.9:-.25 3.6:.02 5:.02', propTilt: '0:0 1.6:0 2.2:.9 2.9:.9 3.5:0 5:0',
      squash: '0:1 2.1:1s 2.2:.975s 2.34:1b 2.6:1s 2.7:.975s 2.84:1b 5:1',
    }, { R: 'chest(.12,-.05,.05)@0 chest(.12,-.05,.05)@.9 mouth(.02,-.22,.35)@1.6 mouth(.02,-.15,.35)@2.1 mouth(.02,-.15,.35)@2.9 chest(.12,-.05,.05)@3.7 chest(.12,-.05,.05)@5', L: 'lap@0 lap@5' }, [[0, 'normal'], [1.6, 'smile']]),

    // 그릇 밥먹기: 왼손은 그릇을 받치고, 오른손 젓가락으로 집어 입에 넣고 씹는다
    eat_bowl: C(2.8, {
      rotX: '0:.2 .4:.26 1:.04 1.4:.04 2:.2 2.8:.2', posZ: '0:.02 1:0 2.8:.02', food: '0:0 .45:0 .5:1 1.3:1 1.35:0 2.8:0',
      squash: '0:1 1.5:1s 1.62:.965s 1.76:1b 1.9:1s 2.02:.965s 2.16:1b 2.8:1',
    }, { L: 'chest(.06,0,.08)@0 chest(.06,.05,.08)@1 chest(.06,0,.08)@2.8', R: `chest${B}@0 chest(0,-.08,.12)@.4 mouth(.12,-.12,.24)@1 mouth(.12,-.1,.22)@1.3 chest${B}@2.1 chest${B}@2.8` }, [[0, 'normal'], [1.3, 'smile']], { sticks: true }),
    // 라멘: 집어 올려 후루룩 빨아들인다
    ramen_eat_noodles: C(2.4, {
      rotX: '0:.22 .35:.3 .85:.02 1.25:-.06 1.8:.2 2.4:.22', food: '0:0 .38:0 .42:1 1.25:1 1.3:0 2.4:0',
      rotZ: '0:0 .9:0s 1:.016s 1.1:-.016s 1.22:0 2.4:0', squash: '0:1 1.4:1s 1.52:.965s 1.66:1b 2.4:1',
    }, { L: 'chest(.06,0,.08)@0 chest(.06,.04,.08)@1 chest(.06,0,.08)@2.4', R: `chest${B}@0 chest(0,-.08,.12)@.35 mouth(.12,-.12,.24)@.9 mouth(.12,-.08,.2)@1.25 chest${B}@1.9 chest${B}@2.4` }, 'smile', { sticks: true }),
    // 국물: 두 손으로 그릇을 입까지 올려 기울인다
    ramen_soup: C(3.6, {
      rotX: '0:.05 .9:-.12 2.4:-.28 3:.05 3.6:.05', propTilt: '0:0 .9:0 1.4:.75 2.4:.75 3:0 3.6:0',
      squash: '0:1 1.6:1s 1.72:.975s 1.86:1b 2.1:1s 2.22:.975s 2.36:1b 3.6:1',
    }, { L: 'chest(.08,0,.08)@0 chin(.08,-.14,.14)@.9 chin(.08,-.08,.12)@2.4 chest(.08,0,.08)@3.1 chest(.08,0,.08)@3.6', R: 'chest(.3,-.02,.2)@0 chin(.32,-.14,.14)@.9 chin(.32,-.08,.12)@2.4 chest(.3,-.02,.2)@3.1 chest(.3,-.02,.2)@3.6' }, 'smile'),
    // 베어 먹기: 들어 올려 한입 물고 뜯으며 씹는다
    eat_bite: C(3, {
      rotX: '0:.05 .8:.12 1.05:-.1s 1.4:.04 3:.05', rotZ: '0:0 1.05:0s 1.15:.05s 1.3:-.04s 1.45:0 3:0',
      squash: '0:1 1.5:1s 1.62:.965s 1.76:1b 1.95:1s 2.07:.965s 2.21:1b 3:1',
    }, { R: 'chest(.1,0,.06)@0 mouth(.02,-.04,.08)@.8 mouth(.02,-.03,.14)@1.1 chest(.1,.06,.08)@1.8 chest(.1,0,.06)@3', L: 'lap@0 lap@3' }, [[0, 'normal'], [1.2, 'smile']]),
    // 핥아 먹기: 입 앞에서 위아래로
    eat_lick: C(2.2, {
      rotX: '0:.02 .55:.1 1.1:-.02 1.65:.1 2.2:.02', rotZ: '0:-.05 1.1:.05 2.2:-.05',
    }, { R: 'mouth(.02,-.22,.16)@0 mouth(.02,-.08,.13)@.55 mouth(.02,-.22,.16)@1.1 mouth(.02,-.08,.13)@1.65 mouth(.02,-.22,.16)@2.2', L: 'lap@0 lap@2.2' }, 'smile'),
    // 과자: 왼손의 봉지에서 집어 입에 쏙
    eat_snack: C(2.6, {
      rotX: '0:.12 .9:-.02 1.2:.02 2.6:.12', squash: '0:1 1.25:1s 1.37:.965s 1.51:1b 1.65:1s 1.77:.965s 1.91:1b 2.6:1',
    }, { L: 'chest(.08,0,.08)@0 chest(.08,0,.08)@2.6', R: 'chest(-.02,.02,.2)@0 chest(-.02,-.06,.2)@.3 mouth(.04,-.05,.05)@.95 mouth(.04,-.05,.05)@1.15 chest(-.02,.02,.2)@1.9 chest(-.02,.02,.2)@2.6' }, 'smile'),
    // 하품: 손으로 입을 가린다
    idle_yawn: C(3, {
      rotX: '0:0 .7:-.2 1.8:-.2 2.5:0 3:0', squash: '0:1 .7:1.015 1.8:1.015 2.5:1 3:1',
    }, { R: 'lap@0 mouth(.03,-.02,.04)@.7 mouth(.03,-.02,.04)@1.8 lap@2.5 lap@3', L: 'lap@0 lap@3' }, 'normal'),

    /* ---------- 가게 ---------- */

    // 식권 고르기: 위로 짚어 가며 버튼을 꾹
    ramen_ticket: C(3, {
      rotX: '0:.04 1:.08 1.4:.16s 1.7:.06 3:.04', posY: '0:0 .4:.05 1.3:.05 1.5:0 3:0', footLY: '0:0 .4:.07 1.3:.07 1.5:0 3:0', footRY: '0:0 .4:.07 1.3:.07 1.5:0 3:0', posZ: '0:0 1.4:.06s 1.8:0 3:0',
    }, { R: 'high(-.15,0,-.05)@0 high(.12,-.05,-.05)@.5 high(-.05,-.25,-.02)@1 far(-.04,.1,-.1)@1.4 high(-.05,-.25,-.02)@1.8 chest(.1,0,.1)@2.5 high(-.15,0,-.05)@3', L: 'hip(-.25)@0 hip(-.25)@3' }, 'normal'),
    ramen_hand_ticket: C(1.8, { rotX: '0:.05 .5:.2 1.2:.2 1.8:.05', posZ: '0:0 .5:.08 1.2:.08 1.8:0' }, { R: 'chest(.1,0,.1)@0 far(0,0,-.1)@.5 far(0,0,-.1)@1.2 chest(.1,0,.1)@1.8', L: 'lap@0 lap@1.8' }, 'smile'),
    // 호출에 답하기: 번쩍 손들고 끄덕
    ramen_call: C(2.2, { rotX: '0:.02 .9:.02s 1.05:.14s 1.25:.02 1.4:.14s 1.6:.02 2.2:.02', posY: '0:0 .3:.05o .5:0 2.2:0' }, { R: 'lap@0 top(.1,-.2)@.3 top(.1,-.2)@1.5 lap@2.2', L: 'lap@0 lap@2.2' }, 'smile'),
    ramen_bow: C(2.4, { rotX: '0:0 .8:.42 1.6:.42 2.4:0' }, { L: 'belly(-.08)@0 belly(-.08)@2.4', R: 'belly(-.08)@0 belly(-.08)@2.4' }, 'smile'),

    /* ---------- 몸짓 ---------- */

    idle_breathe: C(4, { squash: '0:1 2:1.012 4:1', rotZ: '0:-.012 2:.012 4:-.012' }, { L: 'lap(.1,-.02,-.02)@0 lap(.1,.02,-.02)@2 lap(.1,-.02,-.02)@4', R: 'lap(.1,-.02,-.02)@0 lap(.1,.02,-.02)@2 lap(.1,-.02,-.02)@4' }),
    idle_look: C(4, { rotY: '0:0 .7:-.45 1.8:-.45 2.5:.42 3.5:.42 4:0', rotX: '0:0 2:-.05 4:0', footLZ: '0:0 .6:-.06 2.2:.06 4:0', footRZ: '0:0 .6:.06 2.2:-.06 4:0' }, { L: 'lap@0 lap@4', R: 'lap@0 chest(.2,-.04,.05)@1 chest(.2,-.04,.05)@2.5 lap@4' }),
    idle_fidget: C(3, { footLZ: '0:0 .5:.14 1:0 1.5:.14 2:0 3:0', footLY: '0:0 .25:.07 .5:0 1.25:.07 1.5:0 3:0', rotZ: '0:-.03 1.5:.03 3:-.03' }, { L: 'belly(.02,.03)@0 belly(.1,-.03)@.75 belly(.02,.03)@1.5 belly(.1,-.03)@2.25 belly(.02,.03)@3', R: 'belly(.1,-.03)@0 belly(.02,.03)@.75 belly(.1,-.03)@1.5 belly(.02,.03)@2.25 belly(.1,-.03)@3' }),
    idle_hum: C(2, { rotZ: '0:-.07 1:.07 2:-.07', posY: '0:0 .5:.03 1:0 1.5:.03 2:0', footLY: '0:0 .5:.08 1:0 2:0', footRY: '0:0 1:0 1.5:.08 2:0' }, { L: 'lap(.1,0,.05)@0 lap(.05,.08,.1)@1 lap(.1,0,.05)@2', R: 'lap(.05,.08,.1)@0 lap(.1,0,.05)@1 lap(.05,.08,.1)@2' }, 'smile'),
    idle_step: C(1.6, { footLZ: '0:.12 .8:-.12 1.6:.12', footRZ: '0:-.12 .8:.12 1.6:-.12', footLY: '0:0 .4:.12 .8:0 1.6:0', footRY: '0:0 .8:0 1.2:.12 1.6:0', posY: '0:0 .4:.04 .8:0 1.2:.04 1.6:0', rotY: '0:.08 .8:-.08 1.6:.08' }, { L: 'lap@0 lap(.15,.05,.1)@.8 lap@1.6', R: 'lap(.15,.05,.1)@0 lap@.8 lap(.15,.05,.1)@1.6' }),
    idle_stretch: C(3.4, { rotX: '0:0 1:-.2 2.2:-.2 3:0 3.4:0', posY: '0:0 1:.08 2.2:.08 3:0 3.4:0', footLY: '0:0 1:.1 2.2:.1 3:0 3.4:0', footRY: '0:0 1:.1 2.2:.1 3:0 3.4:0', squash: '0:1 1:1.018 2.2:1.018 3:1 3.4:1' }, { L: 'lap@0 top@1 top(.1)@2.2 lap@3 lap@3.4', R: 'lap@0 top@1 top(.1)@2.2 lap@3 lap@3.4' }),
    wave: C(1.6, { rotZ: '0:-.06 .4:.06 .8:-.06 1.2:.06 1.6:-.06' }, { R: 'top(.55,-.3,.2)@0 top(.95,-.45,.2)@.4 top(.55,-.3,.2)@.8 top(.95,-.45,.2)@1.2 top(.55,-.3,.2)@1.6', L: 'lap@0 lap@1.6' }, 'smile'),
    jump_joy: C(1.2, { posY: '0:0 .12:-.08 .42:.7o .72:0 1.2:0', footLY: '0:0 .3:.2 .6:.2 .72:0 1.2:0', footRY: '0:0 .3:.2 .6:.2 .72:0 1.2:0', footLZ: '0:0 .4:.14 .72:0 1.2:0', footRZ: '0:0 .4:-.14 .72:0 1.2:0', squash: '0:1 .12:.965s .26:1b .72:1s .84:.965s .98:1b 1.2:1' }, { L: 'lap@0 top(.5,-.2,.1)@.42 lap@.8 lap@1.2', R: 'lap@0 top(.5,-.2,.1)@.42 lap@.8 lap@1.2' }, 'smile'),
    surprised: C(2.2, { posY: '0:0 .15:.3o .4:0 2.2:0', rotX: '0:0 .2:-.14 1.4:-.1 2.2:0', squash: '0:1 .4:1s .52:.965s .66:1b 2.2:1' }, { L: 'lap@0 cheek(.05)@.25 cheek(.05)@1.6 lap@2.2', R: 'lap@0 cheek(.05)@.25 cheek(.05)@1.6 lap@2.2' }, 'surprised'),
    cry: C(2, { rotX: '0:.14 .5:.2 1:.14 1.5:.2 2:.14', rotZ: '0:-.04 .5:.04 1:-.04 1.5:.04 2:-.04' }, { L: 'eyes(.18,-.02,.03)@0 eyes(.24,0,.03)@.5 eyes(.18,-.02,.03)@1 eyes(.24,0,.03)@1.5 eyes(.18,-.02,.03)@2', R: 'eyes(.24,0,.03)@0 eyes(.18,-.02,.03)@.5 eyes(.24,0,.03)@1 eyes(.18,-.02,.03)@1.5 eyes(.24,0,.03)@2' }, 'cry'),
    dance_light: C(1.6, { posY: '0:0 .2:.14 .4:0 .6:.14 .8:0 1:.14 1.2:0 1.4:.14 1.6:0', rotZ: '0:-.14 .8:.14 1.6:-.14', rotY: '0:-.3 .8:.3 1.6:-.3', footLY: '0:0 .2:.14 .4:0 1.6:0', footRY: '0:0 .6:.14 .8:0 1.6:0', footLZ: '0:.12 .8:-.12 1.6:.12', footRZ: '0:-.12 .8:.12 1.6:-.12', tail: '0:.4 .8:-.4 1.6:.4' }, { L: 'top(.5,-.3,.2)@0 hip(.05,.2,.2)@.8 top(.5,-.3,.2)@1.6', R: 'hip(.05,.2,.2)@0 top(.5,-.3,.2)@.8 hip(.05,.2,.2)@1.6' }, 'smile'),
    sit_idle: C(3.2, { rotZ: '0:-.02 1.6:.02 3.2:-.02' }, { L: 'lap@0 lap@3.2', R: 'lap@0 lap@3.2' }),
    sleep_breathe: C(3.4, { rotX: '0:-1.45 3.4:-1.45', posY: '0:.72 3.4:.72', squash: '0:1 1.7:1.016 3.4:1' }, { L: 'belly(.12,.02)@0 belly(.12,.05)@1.7 belly(.12,.02)@3.4', R: 'belly(.12,.02)@0 belly(.12,.05)@1.7 belly(.12,.02)@3.4' }),
    // 줄기를 두 손으로 잡고 흔든다
    tree_shake: C(1.2, { rotX: '0:.08 .3:.2 .6:.04 .9:.2 1.2:.08', posZ: '0:0 .3:.08 .6:-.03 .9:.08 1.2:0', footLZ: '0:.1 .6:.16 1.2:.1', footRZ: '0:-.1 .6:-.16 1.2:-.1', squash: '0:1 .3:.985 .6:1 .9:.985 1.2:1' }, { L: 'far(.18,.05,-.2)@0 far(.18,.1,-.08)@.3 far(.18,.05,-.25)@.6 far(.18,.1,-.08)@.9 far(.18,.05,-.2)@1.2', R: 'far(.18,.05,-.2)@0 far(.18,.1,-.08)@.3 far(.18,.05,-.25)@.6 far(.18,.1,-.08)@.9 far(.18,.05,-.2)@1.2' }, 'normal'),
    // 고개를 숙여 킁킁 맡고 황홀하게 올려다본다
    smell_flower: C(3, { rotX: '0:.05 .6:.34 .8:.3 1:.36 1.2:.3 1.4:.36 2:-.1 2.6:-.1 3:.05', posZ: '0:0 .6:.1 2:0 3:0', squash: '0:1 .8:.99 1:1 1.2:.99 1.4:1 3:1' }, { L: 'lap@0 belly(.1,.05)@.6 belly(.1,.05)@1.6 cheek(.03)@2.1 cheek(.03)@2.7 lap@3', R: 'lap@0 belly(.1,.05)@.6 belly(.1,.05)@1.6 cheek(.03)@2.1 cheek(.03)@2.7 lap@3' }, [[0, 'normal'], [2, 'smile']]),

    /* ---------- 욕탕 ---------- */
    towel_take: C(2, { rotX: '0:.02 .7:-.08 1.3:.04 2:.02', posY: '0:0 .6:.05 1.1:0 2:0' }, { R: 'lap@0 high(.05,-.1,-.1)@.7 chest(.12,.05,.05)@1.4 chest(.12,.05,.05)@2', L: 'lap@0 chest(.2,.05,.05)@1.4 chest(.2,.05,.05)@2' }),
    wash_scrub: C(1.6, { rotZ: '0:-.05 .8:.05 1.6:-.05', rotX: '0:.08 .4:.12 .8:.08 1.2:.12 1.6:.08', squash: '0:1 .4:.99 .8:1 1.2:.99 1.6:1' }, { R: 'chest(.1,.1,.02)@0 belly(.2,0,.02)@.4 chest(-.05,0,.02)@.8 belly(.1,.1,.02)@1.2 chest(.1,.1,.02)@1.6', L: 'cheek(.02,-.05,.02)@0 cheek(.1,.15,.02)@.4 cheek(.02,-.05,.02)@.8 cheek(.1,.15,.02)@1.2 cheek(.02,-.05,.02)@1.6' }, 'smile'),
    wash_pour: C(3, { rotX: '0:.1 1:-.06 1.6:.16 2:.2 3:.1', squash: '0:1 1.5:1s 1.65:.96s 1.9:1b 3:1', propTilt: '0:0 1:0 1.5:2.1 2.2:2.1 2.7:0 3:0', propLift: '0:0 .4:0 1:1 2.3:1 2.8:0 3:0', rotZ: '0:0 2:0s 2.1:.05s 2.2:-.05s 2.3:.04s 2.4:-.04s 2.5:0 3:0' }, { R: 'lap(.1,.05,.22)@0 chest(.2,.15,.3)@.6 brow(.14,.1,.02)@1.1 brow(.14,.1,.02)@2.2 chest(.2,.15,.3)@2.7 lap(.1,.05,.22)@3', L: 'lap(.1,.05,.22)@0 chest(.2,.15,.3)@.6 brow(.14,.1,.02)@1.1 brow(.14,.1,.02)@2.2 chest(.2,.15,.3)@2.7 lap(.1,.05,.22)@3' }, [[0, 'normal'], [1.6, 'cry'], [2.5, 'smile']]),
    soak_ahh: C(3, { rotX: '0:.08 1:-.1 2.2:-.16 3:-.12', squash: '0:1 1:1.015 2.2:.97 3:.985', posY: '0:.05 2.2:-.04 3:-.03' }, { L: 'chest(.1)@0 chest(.16,.14)@1 hip(.02,.35,.2)@2.2 hip(.02,.35,.2)@3', R: 'chest(.1)@0 chest(.16,.14)@1 hip(.02,.35,.2)@2.2 hip(.02,.35,.2)@3' }, 'smile'),
    soak_splash: C(1.8, { rotX: '0:.14 .5:.2 1:-.04 1.4:-.08 1.8:.14', rotZ: '0:0 1:.04 1.8:0', squash: '0:1 1.1:1s 1.25:.975s 1.4:1b 1.8:1' }, { L: 'hip(-.25,.1,.3)@0 hip(-.3,.05,.34)@.45 chest(.2,.14,.08)@.8 cheek(.1,.04,.05)@1.1 cheek(.1,.04,.05)@1.3 hip(-.25,.1,.3)@1.8', R: 'hip(-.25,.1,.3)@0 hip(-.3,.05,.34)@.45 chest(.2,.14,.08)@.8 cheek(.1,.04,.05)@1.1 cheek(.1,.04,.05)@1.3 hip(-.25,.1,.3)@1.8' }, 'smile'),
    soak_towel: C(4, { rotX: '0:-.14 2:-.18 4:-.14', rotZ: '0:-.05 2:.05 4:-.05', squash: '0:1 2:1.012 4:1' }, { L: 'hip(.02,.35,.2)@0 hip(.02,.4,.2)@2 hip(.02,.35,.2)@4', R: 'hip(.02,.35,.2)@0 hip(.02,.4,.2)@2 hip(.02,.35,.2)@4' }, 'smile', { propHead: true }),
    milk_gulp: C(3.2, { rotX: '0:.02 .8:-.14 1.2:-.42 2.2:-.46 2.6:.2 3.2:.02', propTilt: '0:0 .8:0 1.2:.33 2.2:.36 2.5:0 3.2:0', squash: '0:1 1.3:1s 1.4:.975s 1.5:1b 1.7:1s 1.8:.975s 1.9:1b 2.6:.96 3.2:1', footLZ: '0:.08 3.2:.08', footRZ: '0:-.08 3.2:-.08' }, { L: 'hip(-.2,.1)@0 hip(-.2,.1)@3.2', R: 'chest(.12)@0 mouth(.02,-.1,.25)@.9 mouth(.02,-.03,.25)@1.3 mouth(.02,-.03,.25)@2.3 chest(.12,.05)@2.7 chest(.12)@3.2' }, [[0, 'normal'], [2.5, 'smile']]),
    foam_play: C(2.2, { rotZ: '0:-.06 1.1:.06 2.2:-.06', rotX: '0:.14 .5:.2 1.1:-.05 1.6:-.05 2.2:.14', posY: '0:0 1.2:.05 1.5:0 2.2:0' }, { L: 'hip(-.2,.1,.3)@0 hip(-.3,.05,.3)@.5 chest(.04,.1,.12)@1 mouth(.1,-.1,.14)@1.4 mouth(.1,-.1,.14)@1.7 hip(-.2,.1,.3)@2.2', R: 'hip(-.2,.1,.3)@0 hip(-.3,.05,.3)@.5 chest(.04,.1,.12)@1 mouth(.1,-.1,.14)@1.4 mouth(.1,-.1,.14)@1.7 hip(-.2,.1,.3)@2.2' }, 'smile'),
    sauna_sit: C(3, { rotX: '0:.16 .75:.2 1.5:.16 2.25:.2 3:.16', squash: '0:1 .75:.985 1.5:1 2.25:.985 3:1' }, { L: 'lap(.1,.02,.04)@0 lap(.1,.02,.04)@3', R: 'lap(.1,.02,.04)@0 lap(.1,.02,.04)@1.7 brow(.22,0,.03)@2.2 brow(-.1,0,.03)@2.5 lap(.1,.02,.04)@3' }, 'cry'),
    sauna_fan: C(1, { rotX: '0:.1 .5:.04 1:.1', rotZ: '0:-.04 .5:.04 1:-.04' }, { R: 'cheek(.2,.1,.1)@0 cheek(.45,.2,.1)@.5 cheek(.2,.1,.1)@1', L: 'lap@0 lap@1' }, 'cry'),
    shower_scrub: C(1.4, { rotX: '0:-.16 .7:-.08 1.4:-.16', rotZ: '0:-.04 .7:.04 1.4:-.04', squash: '0:1 .7:.99 1.4:1' }, { L: 'eyes(.3,.3,.02)@0 eyes(.1,.42,.05)@.35 eyes(.3,.3,.02)@.7 eyes(.1,.42,.05)@1.05 eyes(.3,.3,.02)@1.4', R: 'eyes(.1,.42,.05)@0 eyes(.3,.3,.02)@.35 eyes(.1,.42,.05)@.7 eyes(.3,.3,.02)@1.05 eyes(.1,.42,.05)@1.4' }, 'smile'),
    cold_plunge: C(.6, { rotZ: '0:-.04s .15:.04s .3:-.04s .45:.04s .6:-.04s', posX0: '0:0', squash: '0:.985 .3:1 .6:.985' }, { L: 'chest(-.02,.05,.02)@0 chest(.02,.09,.02)@.3 chest(-.02,.05,.02)@.6', R: 'chest(-.02,.05,.02)@0 chest(.02,.09,.02)@.3 chest(-.02,.05,.02)@.6' }, 'surprised'),
    totonoi: C(5, { rotX: '0:-.42 2.5:-.46 5:-.42', squash: '0:1 2.5:1.012 5:1', rotZ: '0:-.015 2.5:.015 5:-.015' }, { L: 'hip(.15,-.05,-.05)@0 hip(.15,0,-.05)@2.5 hip(.15,-.05,-.05)@5', R: 'hip(.15,-.05,-.05)@0 hip(.15,0,-.05)@2.5 hip(.15,-.05,-.05)@5' }, 'smile'),

    /* ---------- 먹는 곳 ---------- */
    eat_spoon: C(2.6, { rotX: '0:.2 .4:.26 1:.04 1.3:.04 1.9:.2 2.6:.2', food: '0:0 .45:0 .5:1 1.2:1 1.25:0 2.6:0', squash: '0:1 1.4:1s 1.52:.965s 1.66:1b 1.8:1s 1.92:.965s 2.06:1b 2.6:1' }, { L: 'chest(.06,0,.08)@0 chest(.06,.05,.08)@1 chest(.06,0,.08)@2.6', R: 'chest(0,.02,.12)@0 chest(0,-.08,.12)@.4 mouth(.12,-.12,.22)@1 mouth(.12,-.1,.2)@1.25 chest(0,.02,.12)@2 chest(0,.02,.12)@2.6' }, [[0, 'normal'], [1.25, 'smile']], { sticks: 'spoon' }),
    hot_fan: C(1, { rotZ: '0:-.08s .12:.08s .25:-.08s .37:.08s .5:-.08s .62:.08s .75:-.08s .87:.08s 1:-.08s', rotX: '0:-.06 1:-.06', posY: '0:0 .12:.06o .25:0 .5:0 .62:.06o .75:0 1:0' }, { R: 'mouth(.3,-.05,.14)@0 mouth(.08,-.05,.14)@.12 mouth(.3,-.05,.14)@.25 mouth(.08,-.05,.14)@.37 mouth(.3,-.05,.14)@.5 mouth(.08,-.05,.14)@.62 mouth(.3,-.05,.14)@.75 mouth(.08,-.05,.14)@.87 mouth(.3,-.05,.14)@1', L: 'cheek(.04)@0 cheek(.04)@1' }, 'cry'),
    wipe_mouth: C(1.6, { rotX: '0:.04 .6:.1 1.2:.1 1.6:.04' }, { R: 'chest(.1)@0 mouth(.24,-.04,.03)@.5 mouth(-.2,-.04,.03)@1 chest(.1)@1.6', L: 'lap@0 lap@1.6' }, 'smile'),
    belly_pat: C(2, { rotX: '0:-.1 1:-.14 2:-.1', squash: '0:1 .3:.985 .5:1 .8:.985 1:1 2:1' }, { L: 'belly(.14,.1,.03)@0 belly(.14,.03,.03)@.3 belly(.14,.1,.03)@.5 belly(.14,.03,.03)@.8 belly(.14,.1,.03)@1 belly(.14,.1,.03)@2', R: 'belly(.22,.02,.03)@0 belly(.22,.02,.03)@2' }, 'smile'),
    wait_tap: C(1.6, { rotY: '0:-.2 .8:.2 1.6:-.2', rotX: '0:.05 1.6:.05' }, { L: 'chest(.16,-.02,.2)@0 chest(.16,-.1,.2)@.2 chest(.16,-.02,.2)@.4 chest(.16,-.02,.2)@1.6', R: 'chest(.3,-.1,.2)@0 chest(.3,-.02,.2)@.2 chest(.3,-.1,.2)@.4 chest(.3,-.02,.2)@.6 chest(.3,-.1,.2)@.8 chest(.3,-.02,.2)@1 chest(.3,-.1,.2)@1.6' }),
    blow_hot: C(1.8, { rotX: '0:.1 .6:.14 1.8:.1', squash: '0:1 .6:1.02 1.1:.97 1.8:1' }, { R: 'mouth(.03,-.14,.2)@0 mouth(.03,-.14,.2)@1.8', L: 'lap@0 lap@1.8' }, 'normal'),
    rice_scoop: C(2, { rotX: '0:.1 .7:.34 1.2:.1 2:.1', posZ: '0:0 .7:.1 1.2:0 2:0' }, { L: 'chest(.08,0,.08)@0 chest(.08,0,.08)@2', R: 'chest(.2)@0 front(.05,-.4,-.15)@.7 chest(.04,.05,.14)@1.3 chest(.2)@2' }),
    lid_open: C(1.6, { rotX: '0:.2 .6:.28 1.1:-.14 1.6:.04', posY: '0:0 1:.1 1.6:0', squash: '0:.97 .6:.97 1:1.02 1.6:1' }, { L: 'front(.18,-.2,-.1)@0 front(.18,-.2,-.1)@.6 high(.2,.05,-.05)@1.1 chest(.2)@1.6', R: 'front(.18,-.2,-.1)@0 front(.18,-.2,-.1)@.6 high(.2,.05,-.05)@1.1 chest(.2)@1.6' }, 'surprised'),
    lever_pull: C(2, { rotX: '0:.02 .7:.1 1.2:.14 2:.02', posY: '0:.08 .7:.08 1.2:0 2:0' }, { R: 'high(-.05,-.05,-.1)@0 high(-.05,-.05,-.1)@.5 chest(0,.1,.35)@1.2 chest(0,.1,.35)@1.5 lap@2', L: 'chest(.1,0,.1)@0 chest(.1,0,.1)@2' }),
    yank_pull: C(1.4, { rotX: '0:.18 .55:-.34 .7:-.2 1.1:.18 1.4:.18', posZ: '0:.06 .55:-.16 1.4:.06', footLZ: '0:.14 .55:.24 1.4:.14', footRZ: '0:.14 .55:.24 1.4:.14', squash: '0:.98 .55:1.02 1.4:.98' }, { L: 'far(.1,-.08,-.1)@0 far(.1,-.04,-.05)@.55 far(.1,-.08,-.1)@1.4', R: 'far(.1,-.08,-.1)@0 far(.1,-.04,-.05)@.55 far(.1,-.08,-.1)@1.4' }, 'surprised'),

    /* ---------- 쉬고 놀기 ---------- */
    ladder_climb: C(1, { posY: '0:0 .25:.1 .5:0 .75:.1 1:0', footLY: '0:.25 .5:0 1:.25', footRY: '0:0 .5:.25 1:0', rotZ: '0:-.04 .5:.04 1:-.04' }, { L: 'high(.2,.15,-.2)@0 high(.2,-.2,-.2)@.5 high(.2,.15,-.2)@1', R: 'high(.2,-.2,-.2)@0 high(.2,.15,-.2)@.5 high(.2,-.2,-.2)@1' }),
    bounce_big: C(1, { posY: '0:0 .1:-.05 .5:1.25o .9:0 1:0', squash: '0:.96s .12:1.03b .85:1s .94:.955s 1:.96', footLY: '0:0 .4:.28 .6:.28 .9:0 1:0', rotX: '0:.1 .5:-.1 1:.1' }, { L: 'lap@0 top(.5,-.2,.1)@.5 lap@1', R: 'lap@0 top(.5,-.2,.1)@.5 lap@1' }, 'smile'),
    slide_down: C(1.5, { rotX: '0:-.32 1.5:-.4', posY: '0:.1 .75:.04 1.5:0', rotZ: '0:-.08 .75:.08 1.5:-.08', footLZ: '0:.3 1.5:.34', footRZ: '0:.3 1.5:.34' }, { L: 'top(.5,-.2,.15)@0 top(.7,-.3,.15)@.75 top(.5,-.2,.15)@1.5', R: 'top(.5,-.2,.15)@0 top(.7,-.3,.15)@.75 top(.5,-.2,.15)@1.5' }, 'smile'),
    bench_swing: C(2.4, { rotZ: '0:-.02 1.2:.02 2.4:-.02', rotY: '0:-.12 1.2:.12 2.4:-.12', footLZ: '0:.16 .6:-.1 1.2:.16 1.8:-.1 2.4:.16', footRZ: '0:-.1 .6:.16 1.2:-.1 1.8:.16 2.4:-.1' }, { L: 'lap(.2,.03)@0 lap(.2,.03)@2.4', R: 'lap(.2,.03)@0 lap(.2,.03)@2.4' }, 'smile'),
    roast_stick: C(3, { rotX: '0:.1 1.5:.14 3:.1', rotZ: '0:-.02 1.5:.02 3:-.02' }, { R: 'chest(.14,0,.2)@0 chest(.2,.04,.2)@1 chest(.1,-.02,.2)@2 chest(.14,0,.2)@3', L: 'chest(.3,0,.1)@0 chest(.3,0,.1)@3' }, 'smile'),
    hammock_sway: C(4, { rotX: '0:-1.45 4:-1.45', posY: '0:.72 4:.72', rotZ: '0:-.14 2:.14 4:-.14', squash: '0:1 2:1.016 4:1' }, { L: 'belly(.12,.02)@0 belly(.12,.05)@2 belly(.12,.02)@4', R: 'belly(.12,.02)@0 belly(.12,.05)@2 belly(.12,.02)@4' }),
    sing_mic: C(1.4, { rotZ: '0:-.08 .7:.08 1.4:-.08', rotX: '0:-.1 .35:-.16 .7:-.1 1.05:-.16 1.4:-.1', posY: '0:0 .35:.05 .7:0 1.05:.05 1.4:0', footLY: '0:0 .35:.1 .7:0 1.4:0', footRY: '0:0 .7:0 1.05:.1 1.4:0' }, { R: 'mouth(.04,-.1,.14)@0 mouth(.04,-.06,.14)@.7 mouth(.04,-.1,.14)@1.4', L: 'top(.5,-.25,.15)@0 hip(.05,.2,.15)@.7 top(.5,-.25,.15)@1.4' }, 'smile'),
    cheer_seat: C(1, { posY: '0:0 .25:.08 .5:0 .75:.08 1:0', rotZ: '0:-.06 .5:.06 1:-.06' }, { L: 'top(.4,-.3,.15)@0 top(.6,-.2,.15)@.25 top(.4,-.3,.15)@.5 top(.6,-.2,.15)@.75 top(.4,-.3,.15)@1', R: 'top(.4,-.3,.15)@0 top(.6,-.2,.15)@.25 top(.4,-.3,.15)@.5 top(.6,-.2,.15)@.75 top(.4,-.3,.15)@1' }, 'smile'),
    click_mouse: C(2, { rotX: '0:.14 1:.2 2:.14', posZ: '0:0 1:.06 2:0' }, { R: 'front(.28,-.34,-.22)@0 front(.28,-.38,-.22)@.15 front(.28,-.34,-.22)@.3 front(.34,-.34,-.2)@1 front(.28,-.38,-.22)@1.2 front(.28,-.34,-.22)@1.4 front(.28,-.34,-.22)@2', L: 'front(.1,-.3,-.22)@0 front(.1,-.3,-.22)@2' }),
    reel_pull: C(1.2, { rotX: '0:.08 .5:-.3 1.2:.08', posZ: '0:.04 .5:-.12 1.2:.04', squash: '0:1 .5:1.02 1.2:1', rotZ: '0:-.06 .25:.06 .5:-.06 .75:.06 1:-.06 1.2:-.06' }, { L: 'chest(.12,.02,.15)@0 chest(.14,.28,.08)@.5 chest(.12,.02,.15)@1.2', R: 'chest(.3,.02,.15)@0 chest(.32,.32,.08)@.5 chest(.3,.02,.15)@1.2' }, 'surprised'),
    wobble_fear: C(1.4, { rotZ: '0:-.18 .35:.18 .7:-.18 1.05:.18 1.4:-.18', posZ: '0:0 .7:.05 1.4:0', footLY: '0:0 .35:.1 .7:0 1.4:0', footRY: '0:0 .7:0 1.05:.1 1.4:0' }, { L: 'side(.1,.3)@0 side(.1,.15)@.35 side(.1,.3)@.7 side(.1,.15)@1.05 side(.1,.3)@1.4', R: 'side(.1,.15)@0 side(.1,.3)@.35 side(.1,.15)@.7 side(.1,.3)@1.05 side(.1,.15)@1.4' }, 'surprised'),
    fear_peek: C(.8, { rotZ: '0:-.025s .2:.025s .4:-.025s .6:.025s .8:-.025s', rotX: '0:.2 .8:.2', posZ: '0:.08 .8:.08' }, { L: 'chin(.1,0,.02)@0 chin(.14,.03,.02)@.4 chin(.1,0,.02)@.8', R: 'chin(.1,0,.02)@0 chin(.14,.03,.02)@.4 chin(.1,0,.02)@.8' }, 'surprised'),
    inspect_item: C(2.4, { rotX: '0:.12 1.2:.2 2.4:.12', rotY: '0:-.22 1.2:.22 2.4:-.22', propTilt: '0:-.2 1.2:.5 2.4:-.2' }, { L: 'chest(.16,.08,.12)@0 chest(.1,.1,.12)@1.2 chest(.16,.08,.12)@2.4', R: 'chest(.16,.08,.12)@0 chest(.24,.1,.12)@1.2 chest(.16,.08,.12)@2.4' }),
    hold_chest: C(2.4, { rotX: '0:.14 1.2:.2 2.4:.14', rotZ: '0:-.08 1.2:.08 2.4:-.08', rotY: '0:-.2 1.2:.2 2.4:-.2' }, { L: 'chest(.18,.12,.02)@0 chest(.18,.12,.02)@2.4', R: 'chest(.18,.12,.02)@0 chest(.18,.12,.02)@2.4' }, 'smile'),
    coin_toss: C(1.8, { rotX: '0:.05 .7:.1 1:.14 1.8:.05', posZ: '0:0 1:.08 1.8:0' }, { R: 'belly(.1)@0 chest(.1,.1,.1)@.7 far(0,.1,-.1)@1 chest(.1,0,.1)@1.5 lap@1.8', L: 'lap@0 lap@1.8' }),
    rope_pull: C(1.4, { rotZ: '0:-.12s .35:.12 .7:-.12 1.05:.12 1.4:-.12', rotX: '0:-.1 1.4:-.1' }, { L: 'high(.05,-.05,-.1)@0 high(.26,-.2,-.1)@.35 high(.05,-.05,-.1)@.7 high(.26,-.2,-.1)@1.05 high(.05,-.05,-.1)@1.4', R: 'high(.05,-.05,-.1)@0 high(.26,-.2,-.1)@.35 high(.05,-.05,-.1)@.7 high(.26,-.2,-.1)@1.05 high(.05,-.05,-.1)@1.4' }),
    // 읽고 나서 턱을 괴고 끄덕인다
    read_nod: C(2, { rotX: '0:.02 .4:.14 .7:.02 1:.14 1.3:.02 2:.02', rotZ: '0:-.04 2:.04' }, { R: 'chin(.12,0,.03)@0 chin(.12,0,.03)@2', L: 'belly(.05)@0 belly(.05)@2' }, 'normal'),
    // 저것 좀 봐: 가리키고 까치발
    point_ooh: C(2, { posY: '0:0 .4:.08 1.4:.08 2:0', footLY: '0:0 .4:.1 1.4:.1 2:0', footRY: '0:0 .4:.1 1.4:.1 2:0', rotX: '0:0 .5:-.1 1.5:-.1 2:0' }, { R: 'lap@0 high(.05,.05,.1)@.5 high(.1,.1,.1)@1.5 lap@2', L: 'hip(-.2,.1)@0 hip(-.2,.1)@2' }, 'smile'),
    // 문에 귀를 대고 기다리다 고개를 갸웃한다
    listen_door: C(2.4, { rotZ: '0:0 .6:.2 1.6:.2 2:-.1 2.4:0', posZ: '0:0 .6:.1 1.6:.1 2.4:0', rotX: '0:0 .6:.1 1.6:.1 2.4:0' }, { R: 'lap@0 cheek(.1,.1,.06)@.6 cheek(.1,.1,.06)@1.6 lap@2.4', L: 'lap@0 lap@2.4' }, 'normal'),
    // 돈을 기다린다: 두 손을 내밀고 까치발
    pay_wait: C(2, { rotX: '0:.04 .5:.12 2:.12', posY: '0:0 .5:.05 1:.03 1.5:.05 2:.03', footLY: '0:0 .5:.06 2:.06', footRY: '0:0 .5:.06 2:.06' }, { L: 'lap@0 front(.08,-.05,-.15)@.5 front(.08,-.05,-.15)@2', R: 'lap@0 front(.08,-.05,-.15)@.5 front(.08,-.05,-.15)@2' }, 'smile'),
    // 돈 주머니를 품에 안고 좋아한다
    pouch_hug: C(1.2, { posY: '0:0 .3:.16 .6:0 .9:.16 1.2:0', rotZ: '0:-.08 .6:.08 1.2:-.08', squash: '0:1 .6:.97 .7:1 1.2:1', footLY: '0:0 .3:.12 .6:0 .9:.12 1.2:0', footRY: '0:0 .3:.12 .6:0 .9:.12 1.2:0' }, { L: 'chest(.04,.08,.04)@0 chest(.04,.1,.04)@.6 chest(.04,.08,.04)@1.2', R: 'chest(.04,.08,.04)@0 chest(.04,.1,.04)@.6 chest(.04,.08,.04)@1.2' }, 'smile'),
    no_plate_ask: C(1, {}, {}),
  };
  delete CLIPS.no_plate_ask;

  // 앞서 만든 클립의 팔 궤적을 "닿는 위치"로 바꾼다 (몸 움직임은 그대로 둔다)
  const HANDS = {
    browse_shelf: { R: 'chest(.12)@0 chest(.12)@2 high(-.05,-.12,.02)@2.4 high(-.05,-.12,.02)@2.7 chest(.05,.05,.05)@3.2 chest(.12)@4', L: 'lap@0 lap@4' },
    talk_order: { R: 'chest(.12)@0 front(.05,.1,-.05)@.5 chest(.12,.08)@1.2 chest(.12)@2', L: 'lap@0 lap@2' },
    read_book: { L: 'chest(.14,.08,.02)@0 chest(.14,.08,.02)@4.2', R: 'chest(.28,.08,.02)@0 chest(.28,.08,.02)@3 chest(.02,.12,.08)@3.35 chest(.28,.08,.02)@3.7 chest(.28,.08,.02)@4.2' },
    board_read: { R: 'lap@0 high(.02,.05,.1)@1.2 chest(.1)@2 lap@3.2', L: 'lap@0 lap@3.2' },
    type_keys: { L: 'front(-.02,-.28,-.2)@0 front(.12,-.33,-.2)@.3 front(-.02,-.28,-.2)@.6 front(.12,-.33,-.2)@.9 front(-.02,-.28,-.2)@1.2', R: 'front(.12,-.33,-.2)@0 front(-.02,-.28,-.2)@.3 front(.12,-.33,-.2)@.6 front(-.02,-.28,-.2)@.9 front(.12,-.33,-.2)@1.2' },
    fish_wait: { L: 'chest(.12,.02,.15)@0 chest(.12,.02,.15)@5', R: 'chest(.3,.02,.15)@0 chest(.3,.02,.15)@3.6 chest(.28,.28,.2)@3.75 chest(.3,.02,.15)@4.3 chest(.3,.02,.15)@5' },
    weed_pull: { L: 'ground(.1)@0 ground(.1,.03)@1 chest(.12,0,.1)@1.15 ground(.1)@1.7 ground(.1)@2.2', R: 'ground(.1)@0 ground(.1,.03)@1 chest(.12,0,.1)@1.15 ground(.1)@1.7 ground(.1)@2.2' },
    carry_pile: { L: 'chest(.22,.03,.08)@0 chest(.22,.05,.08)@.6 chest(.22,.03,.08)@1.2', R: 'chest(.22,.03,.08)@0 chest(.22,.05,.08)@.6 chest(.22,.03,.08)@1.2' },
    pray_bow: { L: 'chest(-.02,.12)@0 chest(-.02,.12)@4.2', R: 'chest(-.02,.12)@0 chest(-.02,.12)@4.2' },
    work_sticker: { L: 'front(.25,-.25,-.25)@0 front(.25,-.25,-.25)@1.6', R: 'front(.3,-.28,-.3)@0 front(0,-.2,-.15)@.5 front(0,-.3,-.15)@.8 front(.3,-.28,-.3)@1.3 front(.3,-.28,-.3)@1.6' },
    train_swing: { R: 'chest(.3,.2,-.1)@0 chest(.55,.15,-.1)@.5 far(.05,.05,0)@.72 chest(.2)@1.1 chest(.3,.2,-.1)@1.4', L: 'chest(.3,0,0)@0 far(.2,-.1,-.25)@.72 chest(.3,0,0)@1.4' },
    brave_up: { L: 'chest(.3,.15)@0 chest(.28,.32)@.7 chest(.3,.15)@1.4', R: 'chest(.3,.15)@0 chest(.28,.32)@.7 chest(.3,.15)@1.4' },
    wipe_towel: { L: 'cheek(.02,.05,.02)@0 belly(.08,.05)@.65 cheek(.02,.05,.02)@1.3', R: 'belly(.08,.05,.05)@0 cheek(.02,.05,.07)@.65 belly(.08,.05,.05)@1.3' },
    soak_relax: { L: 'hip(.02,.35,.1)@0 hip(.02,.4,.1)@2 hip(.02,.35,.1)@4', R: 'hip(.02,.35,.1)@0 hip(.02,.4,.1)@2 cheek(.05,-.1,.05)@3.2 hip(.02,.35,.1)@4' },
    cook_stir: { R: 'front(.1,-.1,-.1)@0 front(.2,-.08,0)@.4 front(.05,-.08,.1)@.8 front(-.1,-.08,0)@1.2 front(.1,-.1,-.1)@1.6', L: 'chest(.3,-.06,.05)@0 chest(.3,-.06,.05)@1.6' },
    poke_touch: { R: 'front(0,.05,-.2)@0 far(0,0,-.05)@.25 front(0,.05,-.2)@.5 far(0,0,-.05)@.75 front(0,.05,-.2)@1', L: 'lap@0 lap@1' },
    pour_tap: { L: 'chest(.08,0,.12)@0 chest(.08,0,.12)@2', R: 'chest(.08,0,.12)@0 chest(.08,0,.12)@2' },
    ride_pedal: { L: 'front(.25,0,-.1)@0 front(.25,0,-.1)@.9', R: 'front(.25,0,-.1)@0 front(.25,0,-.1)@.9' },
    knock_door: { R: 'front(0,.18,-.1)@0 far(0,.18,0)@.2 front(0,.18,-.1)@.4 far(0,.18,0)@.6 front(0,.18,-.1)@.8 front(0,.18,-.1)@1.5', L: 'lap@0 lap@1.5' },
    peek_tiptoe: { L: 'brow(.15)@0 brow(.15)@2.6', R: 'brow(.15)@0 brow(.15)@2.6' },
    applaud: { L: 'chest(.08,.1)@0 chest(-.02,.1)@.2 chest(.08,.1)@.4 chest(-.02,.1)@.6 chest(.08,.1)@.8', R: 'chest(.08,.1)@0 chest(-.02,.1)@.2 chest(.08,.1)@.4 chest(-.02,.1)@.6 chest(.08,.1)@.8' },
    warm_hands: { L: 'front(.14,-.05)@0 front(.14,0)@1.5 front(.14,-.05)@3', R: 'front(.14,-.05)@0 front(.14,0)@1.5 front(.14,-.05)@3' },
    listen_groove: { L: 'lap(.1,0,.05)@0 lap(.05,.08,.1)@.5 lap(.1,0,.05)@1', R: 'cheek(.12,.1,.05)@0 cheek(.12,.14,.05)@.5 cheek(.12,.1,.05)@1' },
    oath_pose: { R: 'lap@0 top(.15,0,.1)@.4 top(.15,0,.1)@2.6 lap@3', L: 'hip(-.2,.05)@0 hip(-.2,.05)@3' },
    chat_nod: { R: 'lap@0 chest(.15,.05,.05)@1 lap@2', L: 'lap@0 lap@2' },
    tilt_look: { R: 'chin(.15,0,.02)@0 chin(.15,.04,.02)@1.5 chin(.15,0,.02)@3', L: 'belly(.05)@0 belly(.05)@3' },
    plate_pick: { L: 'lap@0 high(.1,.05,.05)@.5 high(.1,.05,.05)@.9 chest(.15)@1.2 chest(.15)@1.8', R: 'lap@0 high(.1,.05,.05)@.5 high(.1,.05,.05)@.9 chest(.15)@1.2 chest(.15)@1.8' },
    plate_hand: { R: 'chest(.15)@0 far(.08,0,-.1)@.4 far(.08,0,-.1)@1.3 chest(.15)@1.8', L: 'chest(.2)@0 far(.2,0,-.15)@.4 far(.2,0,-.15)@1.3 chest(.2)@1.8' },
    scale_place: { L: 'chest(.2,0,.05)@0 low(.16,.1)@.6 low(.16,.1)@1 hip(-.2)@1.7 chest(.2,0,.05)@2.4', R: 'chest(.2,0,.05)@0 low(.16,.1)@.6 low(.16,.1)@1 hip(-.2)@1.7 chest(.2,0,.05)@2.4' },
    pay_receive: { L: 'lap@0 front(.08,-.05,-.15)@.4 chest(.08,.05)@1.2 lap@2', R: 'lap@0 front(.08,-.05,-.15)@.4 chest(.08,.05)@1.2 lap@2' },
    hunt_thrust: { L: 'chest(.22,.05,-.05)@0 chest(.3,.05,-.2)@.42 far(.05,.02,0)@.6 far(.05,.02,-.05)@.9 chest(.22,.05,-.05)@1.3', R: 'chest(.34,.12,.05)@0 chest(.42,.12,-.1)@.42 far(.2,0,-.2)@.6 far(.2,0,-.25)@.9 chest(.34,.12,.05)@1.3' },
    gather_pick: { R: 'chest(.15)@0 ground(.05,.02)@.7 ground(.05,.02)@1.1 chest(.15,.05)@1.7 hip(0,.1,0)@2.1 chest(.15)@2.4', L: 'hip(-.1,.1)@0 hip(-.1,.1)@2.4' },
    study_home: { L: 'chest(.28,.05,.02)@0 chest(.28,.05,.02)@2.2 cheek(.15,.42,.02)@2.7 cheek(.05,.45,.02)@3.1 cheek(.15,.42,.02)@3.5 cheek(.05,.45,.02)@3.9 chest(.28,.05,.02)@4.4 chest(.28,.05,.02)@5.2 top(.1,-.05,.1)@5.5 top(.1,-.05,.1)@6.2 chest(.28,.05,.02)@6.7 chest(.28,.05,.02)@7', R: 'chest(.14,-.05,.22)@0 chest(.14,-.05,.22)@7' },
    no_plate: { L: 'hip(-.15,-.05)@0 hip(-.15,-.05)@2.6', R: 'hip(-.15,-.05)@0 hip(-.15,-.05)@2.6' },
    habit_chiikawa: { L: 'chest(.04,.08)@0 chest(.12,.05)@.5 chest(.04,.08)@1 chest(.12,.05)@1.5 chest(.04,.08)@2 chest(.04,.08)@3', R: 'chest(.12,.05)@0 chest(.04,.08)@.5 chest(.12,.05)@1 chest(.04,.08)@1.5 chest(.12,.05)@2 chest(.12,.05)@3' },
  };
  for (const [id, hands] of Object.entries(HANDS)) {
    const clip = ANIMS[id];
    if (!clip) continue;
    clip.reach = {};
    for (const [k, v] of Object.entries(hands)) clip.reach[k] = parseReach(v);
    // 팔은 계산으로 정해지므로 손으로 쓴 팔 트랙은 지운다
    for (const ch of ['armL', 'armR', 'armPitchL', 'armPitchR', 'armExtL', 'armExtR']) delete clip.tracks[ch];
  }
  // 앉아서 하는 먹기와 일어서는 일이 모두 같은 경로를 쓰도록 등록한다
  // 보류를 풀면 원래 클립이 그대로 쓰인다
  for (const [id, clip] of Object.entries(CLIPS)) if (HOLD_OLD_CLIPS || !ANIMS[id]) ANIMS[id] = clip;
  for (const [id, clip] of Object.entries(ANIMS)) clip.id = id;
  // 이 상호작용의 먹기는 그릇이 아니다 (단계 소품과 클립을 바꾼다)
  root.EAT_STYLE = {
    'sausage.sausage': { clip: 'eat_bite', prop: 'sausage' },
    'softcream.cream': { clip: 'eat_lick', prop: 'cone' },
    'machioka.snack': { clip: 'eat_snack', prop: 'snack' },
    'market.takoyaki': { clip: 'eat_bite', prop: 'skewer' },
  };

  root.AnimReach = { apply, bake, prebake, anchors };

  /* ---------- 손에 든 물건: 몸 기준으로 놓는다 ---------- */

  const PROP_LEAN = { book: 0.95 };
  const AXIS_X = new THREE.Vector3(1, 0, 0);   // 펼친 책은 얼굴 쪽으로 세운다
  const PROP_SCALE = { pouch: 1.7, bucket: 1.5, milk: 1.5, mic: 1, cup: 2.3, bowl: 1.7, ticket: 1.7, book: 1.5, rod: 1.1, towel: 1.9, plate: 1.8, sausage: 1, cone: 1, snack: 1, skewer: 1 };
  const tmp = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  // 소품의 기준점이 빈 곳이면(얇은 표, 그릇 속) 손이 허공을 쥔 것처럼 보인다. 손이 물건 겉면에 닿게 옮긴다
  const SEAT = new Map();
  const propSeat = (id, g) => {
    if (SEAT.has(id)) return SEAT.get(id);
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    g.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pos.count; i++) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m));
    });
    // 손은 물건의 뒷면 가운데를 잡는다: 물건 전체가 손 앞에 있어 몸을 파고들지 않는다
    const c = box.getCenter(new THREE.Vector3());
    // 뒷면 가운데에 가장 가까운 실제 겉면 점을 잡는다 (그릇처럼 가운데가 빈 물건)
    const want = new THREE.Vector3(c.x, c.y, box.min.z);
    const best = new THREE.Vector3();
    let min = Infinity;
    g.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        const d = v.distanceToSquared(want);
        if (d < min) { min = d; best.copy(v); }
      }
    });
    SEAT.set(id, best);
    return best;
  };
  const seatTmp = new THREE.Vector3();

  /* ---------- 소품이 몸을 파고들지 않게 (접촉 규칙 R6, 손 접촉 R5는 유지) ----------
     몸(팔·발·외곽선 껍질 제외) 삼각형을 모델 공간에 한 번 모아 격자로 찾는다. 몸 메시는 모델에 고정이라 자세가 바뀌어도 그대로다.
     - 납작한 소품(수건·식권): 손끝 바깥쪽에 몸 표면과 나란히 댄다 (닦을 때 몸과 손 사이에 끼지 않고 손바닥에 붙는다)
     - 부피 있는 소품(콘·바가지·책·검 등): 손끝을 축으로 몸 바깥쪽으로 조금씩 돌린다
     - 손에서 떨어진 물건(머리 위로 드는 바가지)은 바깥으로 민다 */
  const CLEAR = 0.035;
  const CELL = 0.15;
  const FLAT = new Set(['towel', 'ticket', 'plate']);
  const gkey = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  function bodyIndex(a) {
    if (a.bodyIdx) return a.bodyIdx;
    const built = a.built;
    built.model.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(built.model.matrixWorld).invert();
    const skip = new Set();
    for (const arm of built.arms) arm.joint.traverse(o => skip.add(o));
    if (built.feet) for (const f of built.feet) f.traverse(o => skip.add(o));
    if (built.tail) built.tail.traverse(o => skip.add(o));
    const tris = [];
    built.model.traverse(o => {
      if (!o.isMesh || skip.has(o) || (o.material && o.material.side === THREE.BackSide)) return;
      for (let p = o; p && p !== built.model; p = p.parent) if (p.userData && (p.userData.prop || p.userData.samples)) return;
      const geo = o.geometry;
      const pos = geo.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const v = i => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m);
      const n = geo.index ? geo.index.count : pos.count;
      for (let i = 0; i + 2 < n; i += 3) {
        const ia = geo.index ? geo.index.getX(i) : i;
        const ib = geo.index ? geo.index.getX(i + 1) : i + 1;
        const ic = geo.index ? geo.index.getX(i + 2) : i + 2;
        const t = new THREE.Triangle(v(ia), v(ib), v(ic));
        if (t.getArea() < 1e-8) continue;
        tris.push({ t, n: t.getNormal(new THREE.Vector3()), box: new THREE.Box3().setFromPoints([t.a, t.b, t.c]) });
      }
    });
    const grid = new Map();
    const box = new THREE.Box3();
    tris.forEach((tr, i) => {
      box.setFromPoints([tr.t.a, tr.t.b, tr.t.c]);
      for (let x = Math.floor(box.min.x / CELL); x <= Math.floor(box.max.x / CELL); x++)
        for (let y = Math.floor(box.min.y / CELL); y <= Math.floor(box.max.y / CELL); y++)
          for (let z = Math.floor(box.min.z / CELL); z <= Math.floor(box.max.z / CELL); z++) {
            const k = gkey(x, y, z);
            if (!grid.has(k)) grid.set(k, []);
            grid.get(k).push(i);
          }
    });
    a.bodyIdx = { tris, grid, mark: new Int32Array(tris.length), stamp: 0 };
    return a.bodyIdx;
  }
  // 점 p(모델 공간)와 몸의 간격 (몸 안이면 음수)과 바깥 방향. 0.3보다 멀면 0.3
  const cq = new THREE.Vector3();
  function bodyGap(idx, p, outDir) {
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    const cz = Math.floor(p.z / CELL);
    let best = 0.3;
    let sign = 1;
    let bn = null;
    let bq = null;
    // 2026-11-10 최적화: 여러 칸에 걸친 삼각형을 한 번만, 지금까지 가장 가까운 것보다 먼 상자는 건너뛴다
    const stamp = ++idx.stamp;
    for (let x = cx - 2; x <= cx + 2; x++) for (let y = cy - 2; y <= cy + 2; y++) for (let z = cz - 2; z <= cz + 2; z++) {
      const list = idx.grid.get(gkey(x, y, z));
      if (!list) continue;
      for (const i of list) {
        if (idx.mark[i] === stamp) continue;
        idx.mark[i] = stamp;
        const tr = idx.tris[i];
        if (tr.box.distanceToPoint(p) >= best) continue;
        tr.t.closestPointToPoint(p, cq);
        const d = p.distanceTo(cq);
        if (d < best) {
          best = d;
          sign = cq.clone().sub(p).dot(tr.n) > 0 ? -1 : 1;
          bn = tr.n;
          bq = cq.clone();
        }
      }
    }
    if (outDir) {
      if (bq && best > 1e-5) outDir.subVectors(p, bq).multiplyScalar(sign).normalize();
      else if (bn) outDir.copy(bn);
    }
    return best * sign;
  }
  // 소품의 표본 점과 가장 얇은 축 (소품 공간). 한 번만 모은다
  function propSamples(g) {
    if (g.userData.samples) return g.userData.samples;
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const out = [];
    const box = new THREE.Box3();
    g.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const step = Math.max(1, Math.floor(pos.count / 28));
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m);
        box.expandByPoint(v);
        if (i % step === 0) out.push(v);
      }
    });
    const size = box.getSize(new THREE.Vector3());
    const thin = size.x <= size.y && size.x <= size.z ? new THREE.Vector3(1, 0, 0) : size.y <= size.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    out.thin = thin;
    out.half = Math.min(size.x, size.y, size.z) / 2;
    out.center = box.getCenter(new THREE.Vector3());
    g.userData.samples = out;
    return out;
  }
  const wp = new THREE.Vector3();
  const nOut = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const rq = new THREE.Quaternion();
  const gm = new THREE.Matrix4();
  function worstPoint(g, idx, out, dir) {
    gm.compose(g.position, g.quaternion, g.scale);
    let worst = Infinity;
    const d = new THREE.Vector3();
    for (const s of propSamples(g)) {
      wp.copy(s).applyMatrix4(gm);
      const gap = bodyGap(idx, wp, d);
      if (gap < worst) {
        worst = gap;
        out.copy(wp);
        dir.copy(d);
      }
    }
    return worst;
  }
  const n0 = new THREE.Vector3();
  function clearBody(a, g, id, grip, free) {
    const idx = bodyIndex(a);
    const w = new THREE.Vector3();
    const flat = FLAT.has(id) && !free;
    if (worstPoint(g, idx, w, nOut) >= (flat ? 0.005 : CLEAR)) return;
    // 손끝이 몸 안에 들어간 자세(애니메이션 쪽 결함)면, 쥔 점을 몸 표면 바로 바깥으로 꺼내 그 자리에 소품을 둔다
    const gh = bodyGap(idx, grip, n0);
    if (gh < 0.005 && !free) {
      const lift = 0.008 - gh;
      grip.addScaledVector(n0, lift);
      g.position.addScaledVector(n0, lift);
      a.handInBody = (a.handInBody || 0) + 1;
    }
    if (flat) {
      // 납작한 소품: 얇은 면을 몸 바깥 방향으로 세워 손바닥 바깥쪽에 나란히 댄다. 몸 쪽 면이 손끝에서 0.012 떨어지게
      const S = propSamples(g);
      nOut.copy(n0);
      const thinWorld = S.thin.clone().applyQuaternion(g.quaternion);
      if (thinWorld.dot(nOut) < 0) thinWorld.negate();
      g.quaternion.premultiply(rq.setFromUnitVectors(thinWorld, nOut));
      const c = S.center.clone().multiply(g.scale).applyQuaternion(g.quaternion);
      g.position.copy(grip).sub(c);
      gm.compose(g.position, g.quaternion, g.scale);
      let minProj = Infinity;
      for (const s of S) minProj = Math.min(minProj, wp.copy(s).applyMatrix4(gm).sub(grip).dot(nOut));
      g.position.addScaledVector(nOut, 0.012 - minProj);
      return;
    }
    for (let i = 0; i < 18; i++) {
      const gap = worstPoint(g, idx, w, nOut);
      if (gap >= CLEAR) return;
      if (free) {
        g.position.addScaledVector(nOut, Math.min(0.05, CLEAR - gap + 0.005));
        continue;
      }
      // 손끝을 축으로, 파고든 점이 바깥 방향으로 가게 6도씩 돌린다
      axis.subVectors(w, grip).cross(nOut);
      if (axis.lengthSq() < 1e-8) return;
      axis.normalize();
      rq.setFromAxisAngle(axis, 0.105);
      g.position.sub(grip).applyQuaternion(rq).add(grip);
      g.quaternion.premultiply(rq);
    }
  }
  root.bodyIndexOf = bodyIndex;

  root.placeHandProp = function (a, clip, pose) {
    const g = a.prop;
    if (!g || !clip.reach) return;
    const id = g.userData.prop;
    const hand = VillageProps.HAND[id];
    const built = a.built;
    const info = AnimRig.rigInfo(built, a.preset);
    built.model.updateMatrixWorld(true);
    const aim = built.arms[hand].aim || built.arms[hand].joint.children[0];
    tmp.copy(info.tipLocal).applyMatrix4(aim.matrixWorld);
    built.model.worldToLocal(tmp);
    if (g.parent !== built.model) built.model.add(g);
    g.position.copy(tmp);
    g.quaternion.setFromAxisAngle(AXIS_X, -((pose.propTilt || 0) + (PROP_LEAN[id] || 0)));
    g.scale.setScalar(PROP_SCALE[id] || 1);
    if (!clip.propHead) g.position.sub(seatTmp.copy(propSeat(id, g)).multiplyScalar(g.scale.x).applyQuaternion(g.quaternion));
    // 수건은 머리 위에 접어 얹는다
    if (clip.propHead) {
      g.position.set(0, anchors(a).crown + 0.1, -0.2);
      g.quaternion.identity();
      g.scale.set(2.2, 6, 2.2);
    }
    // 머리 위로 들어 올리는 물건 (바가지): 팔이 짧으니 물건만 머리 위까지 올린다
    if (pose.propLift) {
      const k = pose.propLift;
      // 얼굴을 지나지 않게 먼저 올리고, 머리 위에 닿을 즈음 앞뒤를 맞춘다
      const kz = k * k * k;
      g.position.set(g.position.x * (1 - k), g.position.y + (anchors(a).crown + 0.28 - g.position.y) * k, g.position.z + (0.18 - g.position.z) * kz);
    }
    // 몸을 파고들면 바깥으로 돌리거나 민다 (머리 위에 얹는 수건은 머리에 닿는 것이 의도라 제외)
    // 같은 동작의 같은 순간(0.05초 단위)·같은 앉음 정도면 결과가 같으므로 기억해 두고 다시 쓴다 (매 프레임 계산하면 무겁다)
    if (!clip.propHead) {
      const key = `${id}|${Math.round((pose.t || 0) * 20)}|${Math.round((a.seatAmt || 0) * 10)}`;
      let byClip = CLEAR_CACHE.get(a);
      if (!byClip) CLEAR_CACHE.set(a, (byClip = new WeakMap()));
      let m = byClip.get(clip);
      if (!m) byClip.set(clip, (m = new Map()));
      const hit = m.get(key);
      if (hit) {
        g.position.copy(hit.p);
        g.quaternion.copy(hit.q);
      } else {
        clearBody(a, g, id, gripAt.copy(tmp), !!pose.propLift);
        if (m.size < 2000) m.set(key, { p: g.position.clone(), q: g.quaternion.clone() });
      }
    }
  };
  const gripAt = new THREE.Vector3();
  const CLEAR_CACHE = new WeakMap();
  // 젓가락: 오른손에서 뻗어 그릇을 집고, 손이 올라오면 끝이 입을 향한다
  const STICK = 0.36;
  const AXIS_Z = new THREE.Vector3(0, 0, 1);
  const handTip = (a, hand, out) => {
    const info = AnimRig.rigInfo(a.built, a.preset);
    const aim = a.built.arms[hand].aim || a.built.arms[hand].joint.children[0];
    out.copy(info.tipLocal).applyMatrix4(aim.matrixWorld);
    return a.built.model.worldToLocal(out);
  };
  const bowlAt = new THREE.Vector3();
  const mouthAt = new THREE.Vector3();
  root.placeSticks = function (a, clip, pose) {
    const on = !!clip.sticks && !a.c.hidden;
    if (!on) {
      if (a.sticks) a.sticks.visible = false;
      return;
    }
    const spoon = clip.sticks === 'spoon';
    if (a.sticks && a.sticksSpoon !== spoon) {
      a.built.model.remove(a.sticks);
      a.sticks = null;
    }
    if (!a.sticks) {
      const g = new THREE.Group();
      const mat = new THREE.MeshToonMaterial({ color: spoon ? '#d9d7d0' : '#a97c50' });
      for (const x of spoon ? [0] : [-0.018, 0.018]) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.009, spoon ? 0.016 : 0.013, STICK, 6), mat);
        s.rotation.x = Math.PI / 2;
        s.position.set(x, 0, STICK / 2);
        g.add(s);
      }
      if (spoon) {
        const bowlPart = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat);
        bowlPart.scale.set(0.8, 0.35, 1.1);
        bowlPart.position.z = STICK;
        g.add(bowlPart);
      }
      a.sticksSpoon = spoon;
      const noodle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshToonMaterial({ color: spoon ? '#c98a3a' : '#efd98a' }));
      noodle.scale.set(0.8, 1.7, 0.8);
      noodle.position.set(0, -0.05, STICK);
      g.add(noodle);
      g.userData.noodle = noodle;
      a.built.model.add(g);
      a.sticks = g;
    }
    a.built.model.updateMatrixWorld(true);
    const p = anchors(a).P.mouth;
    mouthAt.set(p[0], p[1], p[2]);
    handTip(a, 0, bowlAt);
    bowlAt.y += 0.04;
    bowlAt.z += 0.05;
    handTip(a, 1, tmp);
    // 손이 입에 가까울수록 젓가락 끝은 입으로 향한다
    const k = smooth(Math.max(0, Math.min(1, (0.72 - tmp.distanceTo(mouthAt)) / 0.3)));
    const aimAt = bowlAt.clone().lerp(mouthAt, k).sub(tmp).normalize();
    a.sticks.visible = true;
    a.sticks.position.copy(tmp);
    a.sticks.quaternion.setFromUnitVectors(AXIS_Z, aimAt);
    a.sticks.userData.noodle.visible = (pose.food || 0) > 0.5;
  };
  root.ANIM_PROP_SCALE = PROP_SCALE;
  root.ANIM_PROP_LEAN = PROP_LEAN;
}(typeof self !== 'undefined' ? self : this));
