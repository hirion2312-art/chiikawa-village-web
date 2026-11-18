'use strict';

// 치이카와 심즈 — 캐릭터마다 다른 전투 동작 (2026-11-09 이재헌 지시 10번)
// 토벌(야생 구역)과 토벌 훈련소에서 "찌르기·휘두르기" 단계를 그 캐릭터만의 동작으로 바꿔 그린다. 시뮬레이션은 건드리지 않는다
// - 치이카와: 눈을 질끈 감고 덜덜 떨다가 "야—!" 하고 사스마타를 내지른다
// - 하치와레: 통통 뛰어 들어가 두 번 찌르고 사스마타를 빙글 돌린다
// - 우사기: "우라!" 하고 높이 뛰어올라 장치봉을 내리꽂는다 → 양끝이 펑 터진다
// - 랏코: 순식간에 뛰어올라 공중에서 검기를 세 번 날리고, 사라졌다가 괴물 뒤에서 나타나 벤다 → 칼을 털고 제자리로 돌아온다
// - 모몽가: 약 올리듯 빙글 돌고 콕콕콕 세 번 찌른다 / 쿠리만쥬: 묵직하게 한 번 내리친다
// - 시사: 꾸벅 인사하고 조심스럽게 찌른다 / 후루혼야: 팔을 쭉 뻗어 멀찍이서 콕 찌르고 물러난다 / 힘센 엑스트라: 몽둥이·창을 크게 휘두른다
(function (root) {
  /* ---------- 클립 표기 (anims-real.js와 같은 형식) ---------- */
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
  function C(dur, body, hands, face, extra = {}) {
    const tracks = {};
    for (const [k, v] of Object.entries(body)) tracks[k] = track(v);
    const reach = {};
    for (const [k, v] of Object.entries(hands)) reach[k] = parseReach(v);
    return { dur, loop: true, tracks, reach, face: Array.isArray(face) ? face : [[0, face]], ...extra };
  }
  // 무기를 앞으로 겨눈 기본 손 (hunt_thrust와 같은 자리)
  const GUARD_L = 'chest(.22,.05,-.05)';
  const GUARD_R = 'chest(.34,.12,.05)';
  const STAB_L = 'far(.05,.02,0)';
  const STAB_R = 'far(.2,0,-.2)';

  const CLIPS = {
    // 치이카와: 떨다가(눈물) 마음먹고 "야—!" 하며 눈 감고 돌진해 찌른다 → 놀라서 뒷걸음
    fight_chiikawa: C(2.8, {
      rotZ: '0:-.06 .14:.06 .28:-.06 .42:.06 .56:-.06 .7:.06 .84:-.04 1:0 2.8:0',
      squash: '0:.97 .95:.93 1.12:1.05b 1.35:1 2.3:1 2.8:.97',
      posZ: '0:-.06 .95:-.2 1.15:.55s 1.6:.55 2.2:.05 2.8:-.06',
      posY: '0:0 1:-.05 1.15:.16s 1.3:0 2.8:0',
      rotX: '0:.1 .95:-.18 1.15:.3s 1.6:.24 2.2:.05 2.8:.1',
      footLZ: '0:0 1:.22 1.15:-.32s 1.6:-.28 2.2:0 2.8:0',
      footRZ: '0:0 1:-.16 1.15:.38s 1.6:.32 2.2:0 2.8:0',
      footLY: '0:0 .14:.05 .28:0 .42:.05 .56:0 1.9:0 2:.12 2.1:0 2.8:0',
      footRY: '0:0 .21:.05 .35:0 .49:.05 .63:0 2.05:0 2.15:.12 2.25:0 2.8:0',
    }, {
      L: `${GUARD_L}@0 chest(.18,.1,-.02)@.95 ${STAB_L}@1.15 ${STAB_L}@1.6 ${GUARD_L}@2.3 ${GUARD_L}@2.8`,
      R: `${GUARD_R}@0 chest(.3,.16,.08)@.95 ${STAB_R}@1.15 ${STAB_R}@1.6 ${GUARD_R}@2.3 ${GUARD_R}@2.8`,
    }, [[0, 'cry'], [0.95, 'flustered'], [1.7, 'surprised'], [2.3, 'cry']], { events: [[0.2, 'sweat'], [1.0, 'say', '야—!'], [1.17, 'hit', 'spark']] }),

    // 하치와레: 통통 뛰어 들어가 두 번 찌르고, 사스마타를 들고 한 바퀴 빙글
    fight_hachiware: C(2.4, {
      posY: '0:0 .18:.32o .36:0 .5:0 .62:.06 .74:0 1.02:.06 1.14:0 1.6:.12o 2.1:0 2.4:0',
      posZ: '0:0 .36:.3 .72:.5s .9:.35 1.12:.55s 1.4:.3 2.4:0',
      rotX: '0:0 .5:-.12 .72:.26s .9:.05 1.12:.28s 1.4:0 2.4:0',
      rotY: '0:0 1.5:0 2.1:6.283 2.4:6.283',
      squash: '0:1 .36:.94s .5:1.03b .7:1 1.6:.95 1.75:1.04b 2.1:.95s 2.25:1 2.4:1',
      footLZ: '0:0 .72:-.3s .9:-.1 1.12:-.32s 1.4:0 2.4:0',
      footRZ: '0:0 .72:.34s .9:.1 1.12:.36s 1.4:0 2.4:0',
    }, {
      L: `${GUARD_L}@0 chest(.3,.05,-.2)@.55 ${STAB_L}@.72 chest(.3,.05,-.2)@.92 ${STAB_L}@1.12 ${GUARD_L}@1.45 far(.05,.35,-.1)@1.8 ${GUARD_L}@2.2 ${GUARD_L}@2.4`,
      R: `${GUARD_R}@0 chest(.42,.12,-.1)@.55 ${STAB_R}@.72 chest(.42,.12,-.1)@.92 ${STAB_R}@1.12 ${GUARD_R}@1.45 far(.2,.35,-.18)@1.8 ${GUARD_R}@2.2 ${GUARD_R}@2.4`,
    }, [[0, 'smile'], [0.6, 'flustered'], [1.5, 'joy'], [2.2, 'smile']], { events: [[0.5, 'say', '에잇!'], [0.74, 'hit', 'spark'], [1.14, 'hit', 'spark']] }),

    // 우사기: 웅크렸다가 높이 뛰어올라 장치봉을 머리 위로 → 내리꽂으면 양끝이 펑
    fight_usagi: C(2.2, {
      posY: '0:0 .25:-.1 .55:1.25o .85:1.35 1.05:0s 1.2:-.06 1.35:0 2.2:0',
      posZ: '0:0 .25:-.05 .55:.45 .9:.85 1.05:.95s 1.6:.7 2.2:0',
      rotX: '0:0 .25:.15 .55:-.06 .9:-.08 1.05:.5s 1.4:.32 1.8:.05 2.2:0',
      squash: '0:1 .25:.88s .4:1.08b .55:1 1.05:.86s 1.2:1.06b 1.4:1 2.2:1',
      footLY: '0:0 .5:.25 .95:.25 1.05:0s 2.2:0',
      footRY: '0:0 .5:.25 .95:.25 1.05:0s 2.2:0',
      footLZ: '0:0 .55:-.15 1.05:-.3s 1.6:-.2 2.2:0',
      footRZ: '0:0 .55:.15 1.05:.3s 1.6:.2 2.2:0',
    }, {
      L: `far(.05,.05,-.05)@0 far(.05,0,-.08)@.25 far(.05,.4,-.12)@.6 far(.05,.48,-.15)@.9 far(.05,-.1,0)@1.05 far(.05,-.1,0)@1.5 far(.05,.05,-.05)@2.2`,
      R: `far(.2,.05,-.15)@0 far(.2,0,-.18)@.25 far(.2,.4,-.2)@.6 far(.2,.48,-.22)@.9 far(.2,-.1,-.1)@1.05 far(.2,-.1,-.1)@1.5 far(.2,.05,-.15)@2.2`,
    }, [[0, 'joy'], [1.05, 'flustered'], [1.5, 'joy']], { events: [[0.3, 'say', '우라!'], [1.06, 'hit', 'boom']] }),

    // 랏코: 순식간에 뛰어올라(0.3초) 공중에서 검기 셋 → 사라짐 → 괴물 뒤에서 나타나 일섬 → 칼 털기 → 제자리로
    fight_rakko: C(3.6, {
      posY: '0:0 .2:-.12 .42:2.5o .7:2.7 1.0:2.6 1.3:2.75 1.6:2.6 1.75:0s 2.0:0 3.6:0',
      squash: '0:1 .2:.86s .32:1.1b .5:1 1.75:.92s 1.9:1.03b 2.0:1 3.6:1',
      rotX: '0:0 .2:.15 .42:-.12 .62:.26s .75:-.12 .92:.28s 1.05:-.12 1.22:.3s 1.4:-.05 1.6:0 1.75:.25s 2.1:.2 2.6:0 3.6:0',
      rotZ: '0:0 .62:-.18s .92:.18s 1.22:-.2s 1.45:0 3.6:0',
      footLY: '0:0 .3:.22 1.6:.22 1.75:0s 3.6:0',
      footRY: '0:0 .3:.22 1.6:.22 1.75:0s 3.6:0',
      footLZ: '0:0 1.75:-.34s 2.6:-.3 3.0:0 3.6:0',
      footRZ: '0:0 1.75:.4s 2.6:.34 3.0:0 3.6:0',
    }, {
      // 오른손이 칼. 공중에서 위→아래 대각선으로 세 번, 나타나서 옆으로 크게 한 번, 마지막에 칼을 턴다
      R: 'far(.25,.05,-.25)@0 far(.25,-.05,-.3)@.2 far(.25,.45,-.25)@.5 far(.25,-.15,-.2)@.62 far(.3,.45,-.25)@.8 far(.1,-.1,-.2)@.92 far(.25,.45,-.25)@1.1 far(.3,-.2,-.2)@1.22 far(.25,.05,-.25)@1.6 far(.45,.15,-.2)@1.7 far(.35,0,-.25)@1.78 far(.4,-.05,-.3)@2.6 far(.45,-.05,-.15)@2.85 far(.5,.05,-.15)@2.95 far(.25,.05,-.25)@3.3 far(.25,.05,-.25)@3.6',
      L: 'chest(.25,0,0)@0 hip(-.15,.05)@.4 hip(-.15,.05)@3.3 chest(.25,0,0)@3.6',
    }, [[0, 'normal'], [1.7, 'flustered'], [2.6, 'normal']], {
      events: [[0.42, 'leap'], [0.64, 'qi'], [0.94, 'qi'], [1.24, 'qi'], [1.62, 'vanish'], [1.76, 'appear'], [1.8, 'hit', 'slash'], [3.05, 'return']],
      rakko: true,
    }),
    // 랏코의 준비: 칼자루에 손을 얹고 조용히 숨을 고른다
    ready_rakko: C(2.4, { rotX: '0:.04 1.2:.07 2.4:.04', squash: '0:1 1.2:1.012 2.4:1', footLZ: '0:-.12 2.4:-.12', footRZ: '0:.14 2.4:.14' },
      { R: 'far(.3,-.18,-.3)@0 far(.3,-.15,-.3)@1.2 far(.3,-.18,-.3)@2.4', L: 'hip(-.15,.05)@0 hip(-.15,.05)@2.4' }, 'normal'),
    // 우사기의 준비: 통통 뛰며 장치봉을 빙빙 돌린다
    ready_usagi: C(1.2, { posY: '0:0 .3:.18o .6:0 .9:.18o 1.2:0', rotY: '0:0 1.2:6.283', squash: '0:1 .6:.95s .7:1 1.2:1' },
      { L: 'far(.05,.05,-.05)@0 far(.05,.3,-.1)@.6 far(.05,.05,-.05)@1.2', R: 'far(.2,.05,-.15)@0 far(.2,.3,-.2)@.6 far(.2,.05,-.15)@1.2' }, 'joy', { events: [[0.1, 'say', '하아?']] }),

    // 모몽가: 약 올리듯 빙글 돌고 콕콕콕
    fight_momonga: C(2.0, {
      rotY: '0:0 .5:6.283 2:6.283', posY: '0:0 .25:.2o .5:0 2:0',
      posZ: '0:0 .5:0 .62:.35s .72:.15 .84:.38s .94:.15 1.06:.4s 1.4:.1 2:0',
      rotX: '0:0 .62:.22s .72:0 .84:.22s .94:0 1.06:.25s 1.4:0 2:0',
      squash: '0:1 .5:.94s .6:1.03b 2:1',
    }, {
      L: `${GUARD_L}@0 ${GUARD_L}@.5 ${STAB_L}@.62 ${GUARD_L}@.72 ${STAB_L}@.84 ${GUARD_L}@.94 ${STAB_L}@1.06 ${GUARD_L}@1.4 ${GUARD_L}@2`,
      R: `${GUARD_R}@0 ${GUARD_R}@.5 ${STAB_R}@.62 ${GUARD_R}@.72 ${STAB_R}@.84 ${GUARD_R}@.94 ${STAB_R}@1.06 ${GUARD_R}@1.4 ${GUARD_R}@2`,
    }, [[0, 'smile'], [0.6, 'joy'], [1.4, 'smile']], { events: [[0.64, 'hit', 'spark'], [0.86, 'hit', 'spark'], [1.08, 'hit', 'spark']] }),

    // 쿠리만쥬: 천천히 들어 올렸다가 묵직하게 한 번 내리친다
    fight_kurimanju: C(2.8, {
      rotX: '0:0 1.2:-.05 1.5:.4s 2.1:.3 2.8:0', posZ: '0:0 1.2:-.08 1.5:.3s 2.1:.25 2.8:0', posY: '0:0 1.2:.04 1.5:-.06s 1.7:0 2.8:0',
      squash: '0:1 1.5:.9s 1.7:1.04b 1.9:1 2.8:1', footLZ: '0:0 1.5:-.25s 2.4:-.2 2.8:0', footRZ: '0:0 1.5:.3s 2.4:.25 2.8:0',
    }, {
      L: `${GUARD_L}@0 far(.05,.45,-.12)@1.2 far(.05,-.15,0)@1.5 far(.05,-.15,0)@2.1 ${GUARD_L}@2.8`,
      R: `${GUARD_R}@0 far(.2,.45,-.2)@1.2 far(.2,-.15,-.1)@1.5 far(.2,-.15,-.1)@2.1 ${GUARD_R}@2.8`,
    }, 'normal', { events: [[1.52, 'hit', 'thud']] }),

    // 시사: 꾸벅 인사하고, 마음먹고 조심스럽게 찌른다
    fight_shisa: C(2.6, {
      rotX: '0:0 .4:.45 .8:0 1.3:-.15 1.5:.28s 2.0:.2 2.6:0', posZ: '0:0 1.3:-.1 1.5:.4s 2.0:.35 2.6:0',
      footLZ: '0:0 1.5:-.28s 2.2:-.2 2.6:0', footRZ: '0:0 1.5:.32s 2.2:.25 2.6:0',
    }, {
      L: `chest(.05,.05,.05)@0 chest(.05,.05,.05)@.8 ${GUARD_L}@1.1 ${STAB_L}@1.5 ${STAB_L}@2 ${GUARD_L}@2.4 chest(.05,.05,.05)@2.6`,
      R: `chest(.15,.08,.05)@0 chest(.15,.08,.05)@.8 ${GUARD_R}@1.1 ${STAB_R}@1.5 ${STAB_R}@2 ${GUARD_R}@2.4 chest(.15,.08,.05)@2.6`,
    }, [[0, 'worried'], [1.3, 'flustered'], [2.1, 'worried']], { events: [[0.3, 'say', '실례합니다…!'], [1.52, 'hit', 'spark']] }),

    // 후루혼야: 팔을 쭉 뻗어 멀찍이서 콕 찌르고 얼른 물러난다
    fight_furuhonya: C(2.4, {
      posZ: '0:-.15 .9:-.2 1.1:.15s 1.3:-.25 2.4:-.15', rotX: '0:-.12 1.1:.15s 1.4:-.15 2.4:-.12',
      rotZ: '0:-.03 .2:.03 .4:-.03 .6:.03 .8:-.03 2.4:-.03',
    }, {
      L: `chest(.3,.05,-.15)@0 far(.0,.05,.05)@1.1 chest(.3,.05,-.15)@1.4 chest(.3,.05,-.15)@2.4`,
      R: `chest(.4,.12,-.05)@0 far(.15,.05,-.1)@1.1 chest(.4,.12,-.05)@1.4 chest(.4,.12,-.05)@2.4`,
    }, [[0, 'worried'], [1.0, 'flustered'], [1.4, 'worried']], { events: [[1.12, 'hit', 'spark']] }),

    // 힘센 엑스트라: 몸을 비틀어 크게 휘두른다
    fight_brawler: C(1.8, {
      rotY: '0:0 .5:-.7 .8:.6s 1.2:.4 1.8:0', posZ: '0:0 .5:-.1 .8:.3s 1.3:.2 1.8:0', rotX: '0:0 .5:-.1 .8:.2s 1.8:0',
      footLZ: '0:0 .8:-.25s 1.4:-.2 1.8:0', footRZ: '0:0 .8:.3s 1.4:.25 1.8:0',
    }, {
      L: `${GUARD_L}@0 side(.3,.2)@.5 ${STAB_L}@.8 ${GUARD_L}@1.4 ${GUARD_L}@1.8`,
      R: `${GUARD_R}@0 side(.4,.25)@.5 ${STAB_R}@.8 ${GUARD_R}@1.4 ${GUARD_R}@1.8`,
    }, 'normal', { events: [[0.82, 'hit', 'thud']] }),
  };
  Object.assign(ANIMS, CLIPS);

  const STYLE = { chiikawa: 'chiikawa', hachiware: 'hachiware', usagi: 'usagi', rakko: 'rakko', momonga: 'momonga', kurimanju: 'kurimanju', shisa: 'shisa', furuhonya: 'furuhonya', extra1: 'brawler', extra2: 'brawler' };
  const styleOf = c => STYLE[c.id] || (c.extra || c.strong ? 'brawler' : 'furuhonya');
  const fighting = c => c.doing && c.doing.x && !c.walking && c.doing.phase === 'use' && (c.doing.x.huntTier || c.doing.x.place === 'hunt');
  // 이 캐릭터가 지금 그려야 할 전투 클립 (없으면 null = 원래 클립)
  function clipFor(c) {
    if (!c.clip || !fighting(c)) return null;
    const st = styleOf(c);
    if (c.clip === 'hunt_thrust' || c.clip === 'train_swing') return `fight_${st}`;
    if (c.clip === 'brave_up' && ANIMS[`ready_${st}`]) return `ready_${st}`;
    return null;
  }
  // 무기를 드는 순간 (준비 동작에서도 랏코·우사기는 무기를 쥔다)
  const wantsWeapon = c => fighting(c) && /^ready_/.test(clipFor(c) || '');

  /* ---------- 효과: 검기·불꽃·폭발·잔상 ---------- */

  let fxScene = null;
  const live = [];
  const add = (obj, life, tick) => { fxScene.add(obj); live.push({ obj, life, t: 0, tick }); };
  const glow = (color, op = 0.9) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // 검기: 초승달 모양 빛 (어느 쪽에서 봐도 보이게 화면을 향한 판). 비스듬히 기울어 날아가며 커지고, 뒤로 빛 꼬리가 남는다
  let qiTex = null;
  function qiTexture() {
    if (qiTex) return qiTex;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 150, 40, 128, 150, 128);
    grad.addColorStop(0, 'rgba(160,230,255,0)');
    grad.addColorStop(0.7, 'rgba(160,230,255,.35)');
    grad.addColorStop(1, 'rgba(160,230,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    // 초승달: 큰 원에서 아래로 비킨 원을 빼낸다
    g.save();
    g.beginPath();
    g.arc(128, 150, 108, Math.PI * 1.08, Math.PI * 1.92);
    g.arc(128, 196, 100, Math.PI * 1.86, Math.PI * 1.14, true);
    g.closePath();
    g.shadowColor = '#8fdcff';
    g.shadowBlur = 24;
    g.fillStyle = '#e9fbff';
    g.fill();
    g.restore();
    g.beginPath();
    g.arc(128, 150, 100, Math.PI * 1.15, Math.PI * 1.85);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    g.stroke();
    qiTex = new THREE.CanvasTexture(c);
    qiTex.colorSpace = THREE.SRGBColorSpace;
    return qiTex;
  }
  function qi(from, to, tilt) {
    const mk = op => new THREE.Sprite(new THREE.SpriteMaterial({ map: qiTexture(), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    const head = mk(1);
    head.userData.shared = true;
    add(head, 0.3, (o, t) => {
      o.position.copy(from).lerp(to, t);
      o.material.rotation = tilt;
      o.scale.setScalar(1.6 + t * 1.4);
      o.material.opacity = 1 - t * 0.3;
    });
    for (let i = 1; i <= 3; i++) {
      const tail = mk(0.4 / i);
      tail.userData.shared = true;
      add(tail, 0.3, (o, t) => {
        const tt = Math.max(0, t - i * 0.08);
        o.position.copy(from).lerp(to, tt);
        o.material.rotation = tilt;
        o.scale.setScalar(1.4 + tt * 1.2);
        o.material.opacity = (0.4 / i) * (1 - t);
      });
    }
  }
  // 타격 불꽃: 별 모양 조각이 튀고 고리가 퍼진다
  const starGeo = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.05 : 0.13, a = (i / 10) * Math.PI * 2;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(r, 0);
    }
    return new THREE.ShapeGeometry(s);
  })();
  function spark(at, color = '#ffe066', n = 6) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(starGeo, glow(color));
      const a = (i / n) * Math.PI * 2 + Math.random(), up = 0.6 + Math.random() * 0.8;
      const v = new THREE.Vector3(Math.cos(a) * 1.6, up * 1.6, Math.sin(a) * 1.6);
      add(m, 0.45, (o, t) => {
        o.position.copy(at).addScaledVector(v, t * 0.5);
        o.position.y -= t * t * 0.5;
        o.rotation.z = t * 6;
        o.lookAt(o.position.clone().add(new THREE.Vector3(0, 0, 1)));
        o.material.opacity = 1 - t;
      });
    }
    ring(at, color, 0.9);
  }
  function ring(at, color, size) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28), glow(color, 0.8));
    add(m, 0.3, (o, t) => {
      o.position.copy(at);
      o.scale.setScalar(size * (0.5 + t * 2));
      o.material.opacity = 0.8 * (1 - t);
      if (fxCam) o.quaternion.copy(fxCam.quaternion);
    });
  }
  // 펑: 주황·노랑 불덩이가 부풀고 회색 연기가 피어오른다
  function boom(at, size = 1) {
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * size, 1), glow(i % 2 ? '#ffb347' : '#ffe27a', 0.95));
      const off = new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.6, (Math.random() - 0.5) * 0.8).multiplyScalar(size);
      add(m, 0.45, (o, t) => { o.position.copy(at).add(off.clone().multiplyScalar(1 + t * 1.5)); o.scale.setScalar(0.6 + t * 1.8); o.material.opacity = 0.95 * (1 - t); });
    }
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * size, 1), new THREE.MeshToonMaterial({ color: '#cfc8c0', transparent: true, opacity: 0.8 }));
      const off = new THREE.Vector3((Math.random() - 0.5) * 1, 0.2, (Math.random() - 0.5) * 1).multiplyScalar(size);
      add(m, 1.1, (o, t) => { o.position.copy(at).add(off).add(new THREE.Vector3(0, t * 1.4 * size, 0)); o.scale.setScalar(0.8 + t * 1.6); o.material.opacity = 0.8 * (1 - t); });
    }
    ring(at, '#ffcf6b', 1.6 * size);
  }
  // 일섬: 괴물을 가로지르는 가늘고 긴 빛줄기
  function slash(at, yaw) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.12), glow('#ffffff'));
    const m2 = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.4), glow('#9fe3ff', 0.5));
    const g = new THREE.Group();
    g.add(m2, m);
    add(g, 0.5, (o, t) => {
      o.position.copy(at);
      o.rotation.set(0, yaw + Math.PI / 2, -0.35);
      o.scale.set(0.4 + Math.min(1, t * 5) * 0.8, 1 - t * 0.8, 1);
      m.material.opacity = 1 - t;
      m2.material.opacity = 0.5 * (1 - t);
    });
    spark(at, '#bff0ff', 8);
  }
  // 둔탁한 타격: 흙먼지 고리
  function thud(at) {
    ring(at.clone().setY(at.y - 0.4), '#e9d3a7', 1.4);
    spark(at, '#fff1b8', 4);
  }
  // 땀방울 (겁먹은 치이카와)
  function sweat(at) {
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.9 }));
      m.scale.set(1, 1.5, 1);
      add(m, 0.6, (o, t) => { o.position.set(at.x + sx * (0.35 + t * 0.3), at.y + 0.2 + t * 0.2 - t * t * 0.6, at.z); o.material.opacity = 0.9 * (1 - t); });
    }
  }
  // 잔상: 그 순간의 몸을 반투명 하늘색으로 남겨 두고 흐려진다
  function ghost(a) {
    const src = a.built.root;
    src.updateMatrixWorld(true);
    const g = src.clone(true);
    const mat = new THREE.MeshBasicMaterial({ color: '#9fdcff', transparent: true, opacity: 0.55, depthWrite: false });
    g.traverse(o => { if (o.isMesh || o.isSprite) { o.material = mat; o.userData.shared = true; } });
    g.position.copy(src.position);
    g.quaternion.copy(src.quaternion);
    add(g, 0.5, (o, t) => { mat.opacity = 0.55 * (1 - t); o.scale.setScalar(1 + t * 0.15); });
  }

  /* ---------- 매 프레임: 클립 박자에 맞춰 효과를 내고, 랏코의 순간이동을 그린다 ---------- */

  let fxCam = null;
  let simRef = null;
  function install(scene, camera, sim) {
    fxScene = scene;
    fxCam = camera;
    simRef = sim;
  }
  function targetOf(c, rootPos, yaw) {
    const w = root.WildZones && simRef ? root.WildZones.state(simRef).dens.find(n => n.foe === c.id && n.alive) : null;
    if (w) {
      const s = w.d.s || 1;
      const h = { gichi: 0.5, imomushi: 0.4, mukade: 1.2, arijigoku: 0.5, zou: 2.4, bird: 2.2 }[w.d.kind] || 0.8;
      return { pos: new THREE.Vector3(w.x, rootPos.y + h * s, w.z), den: w, size: s };
    }
    return { pos: new THREE.Vector3(rootPos.x + Math.sin(yaw) * 2.2, rootPos.y + 0.7, rootPos.z + Math.cos(yaw) * 2.2), den: null, size: 1 };
  }
  const isUnder = (o, r) => { for (let p = o.parent; p; p = p.parent) if (p === r) return true; return false; };
  function after(a, time, dt) {
    const c = a.c;
    const id = clipFor(c);
    const clip = id && ANIMS[id];
    if (!clip || !clip.events) {
      if (a.cb) a.built.model.visible = true;
      a.cb = null;
      return;
    }
    // 배속이 높으면 단계가 짧아지므로 전투 동작도 그만큼 빨리 돌려 끝까지 보이게 한다 (game.js와 같은 배율)
    const local = ((time + (a.offset || 0)) * rate(simRef)) % clip.dur;
    const st = a.cb && a.cb.id === id ? a.cb : (a.cb = { id, prev: local, away: null });
    const r = a.built.root;
    const yaw = r.rotation.y;
    const tgt = targetOf(c, r.position, yaw);
    const crossed = e => (st.prev <= e && local > e) || (st.prev > local && (e > st.prev || e <= local));
    for (const ev of clip.events) {
      if (!crossed(ev[0])) continue;
      const kind = ev[1];
      const hand = r.position.clone().add(new THREE.Vector3(0, 0.8, 0));
      if (kind === 'say' && simRef) simRef.say(c, ev[2], 1.6);
      else if (kind === 'sweat') sweat(r.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
      else if (kind === 'hit') {
        const at = tgt.pos;
        if (ev[2] === 'boom') {
          boom(at, 1.1);
          // 장치봉 뒤끝도 펑
          boom(r.position.clone().add(new THREE.Vector3(-Math.sin(yaw) * 0.7, 1.1, -Math.cos(yaw) * 0.7)), 0.6);
        } else if (ev[2] === 'slash') slash(at, yaw);
        else if (ev[2] === 'thud') thud(at);
        else spark(at);
        if (tgt.den && root.WildZones.hit) root.WildZones.hit(tgt.den, time);
      } else if (kind === 'leap') {
        ghost(a);
        ring(r.position.clone().add(new THREE.Vector3(0, 0.1, 0)), '#cfefff', 1.2);
      } else if (kind === 'qi') {
        const from = r.position.clone().add(new THREE.Vector3(Math.sin(yaw) * 0.5, 2.9, Math.cos(yaw) * 0.5));
        st.n = (st.n || 0) + 1;
        qi(from, tgt.pos.clone(), [0.6, -0.7, 0.2][st.n % 3]);
        setTimeout(() => { spark(tgt.pos.clone(), '#c8f3ff', 5); if (tgt.den && root.WildZones.hit) root.WildZones.hit(tgt.den, performance.now() / 1000); }, 300);
      } else if (kind === 'vanish') {
        ghost(a);
      } else if (kind === 'appear') {
        // 괴물 너머로: 사냥꾼 → 괴물 방향으로 괴물 크기만큼 더 간 자리
        const dx = tgt.pos.x - r.position.x, dz = tgt.pos.z - r.position.z, l = Math.hypot(dx, dz) || 1;
        const R = { gichi: 1, imomushi: 1.2, mukade: 1.6, arijigoku: 3.6, zou: 3.4, bird: 2 }[tgt.den ? tgt.den.d.kind : ''] || 0.8;
        const beyond = 1.3 + R * (tgt.size || 1);
        st.away = { x: tgt.pos.x + (dx / l) * beyond - r.position.x, z: tgt.pos.z + (dz / l) * beyond - r.position.z };
      } else if (kind === 'return') {
        ghost(a);
        st.away = null;
      }
    }
    // 사라진 동안(vanish~appear)은 보이지 않고, 나타난 뒤에는 괴물 너머에서 괴물 쪽을 보고 선다
    const hidden = clip.rakko && local > 1.62 && local < 1.76;
    a.built.model.visible = !hidden;
    if (st.away && clip.rakko && local >= 1.76 && local < 3.05) {
      // 손에 든 칼도 몸과 함께 옮긴다 (칼은 장면에 따로 놓여 있다)
      r.updateMatrixWorld(true);
      const before = r.matrixWorld.clone();
      r.position.x += st.away.x;
      r.position.z += st.away.z;
      r.rotation.y = Math.atan2(-st.away.x, -st.away.z);
      r.updateMatrixWorld(true);
      if (a.prop && !isUnder(a.prop, r)) {
        const delta = r.matrixWorld.clone().multiply(before.invert());
        a.prop.applyMatrix4(delta);
        a.prop.updateMatrixWorld(true);
      }
    } else if (local < 1.76 || local >= 3.05) st.away = local >= 3.05 || local < 1.6 ? null : st.away;
    st.prev = local;
  }
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i];
      f.t += dt / f.life;
      if (f.t >= 1) {
        fxScene.remove(f.obj);
        f.obj.traverse(o => { if (o.isMesh && o.geometry !== starGeo && !o.userData.shared) o.geometry.dispose(); });
        live.splice(i, 1);
        continue;
      }
      f.tick(f.obj, f.t);
    }
  }

  function rate(sim) { return sim ? Math.max(1, (sim.speed || 1) / 3) : 1; }
  root.CombatMoves = { rate, CLIPS, STYLE, styleOf, clipFor, wantsWeapon, install, after, update };
}(typeof self !== 'undefined' ? self : this));
