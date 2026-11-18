'use strict';

// 치이카와 심즈 — 레몬 스티커 붙이기 (2026-11-12 이재헌님 2차: 옆으로 돌아 움찔거리기만 하지 말고 실제 작업 과정 전체를)
// 앉아서: 왼쪽 쟁반에서 레몬을 두 손으로 집는다 → 눈앞에 들고 본다 → 가운데 판에 꾹 눌러 스티커를 묻힌다 → 들어서 톡톡 →
//         오른쪽 상자에 쏙 넣는다 (상자가 한 알씩 찬다)
// 상자가 차면: 일어나 상자를 두 손으로 안고 레몬 컨테이너까지 걸어가 → 번쩍 들어 기울여 와르르 붓고 → 빈 상자를 들고 돌아와 다시 붙인다
// 손은 몸 앞으로 뻗는 기준점(front·chest)으로 움직이고, 몸은 ±0.38만 돌려 쟁반·판·상자로 향한다 (게임에서 잰 손 위치에 책상 물건을 놓았다)
(function (root) {
  ANIM_PROP_SHAPES.lemon = {
    label: '레몬',
    make: () => {
      const pts = [];
      for (let i = 0; i <= 26; i++) {
        const y = -0.5 + i / 26, a = Math.abs(y);
        const r = a < 0.42 ? Math.sqrt(1 - (a / 0.44) ** 2) * 0.34 : Math.max(0.0001, 0.1 * (0.5 - a) / 0.08);
        pts.push(new THREE.Vector2(r, y));
      }
      const g = new THREE.LatheGeometry(pts, 22);
      g.rotateZ(Math.PI / 2);
      return g;
    },
  };
  ANIM_PROP_SHAPES.sticker = {
    label: '스티커',
    make: () => { const g = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16); return g; },
  };
  ANIM_PROP_SHAPES.cardbox = {
    label: '레몬 상자',
    make: () => {
      // 위가 트인 상자 (너비 1.2, 높이 0.66, 깊이 1): 바닥 + 네 벽
      const parts = [[0, 0.03, 0, 1.2, 0.06, 1], [0, 0.33, -0.47, 1.2, 0.66, 0.06], [0, 0.33, 0.47, 1.2, 0.66, 0.06], [-0.57, 0.33, 0, 0.06, 0.66, 1], [0.57, 0.33, 0, 0.06, 0.66, 1]];
      const geos = parts.map(([x, y, z, w, h, d]) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; });
      const merged = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeGeometries(geos) : null;
      if (merged) return merged;
      // 합치기 도구가 없으면 직접 이어 붙인다
      const pos = [], idx = []; let off = 0;
      for (const b of geos) { const p = b.attributes.position.array; for (let i = 0; i < p.length; i++) pos.push(p[i]); const ix = b.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off); off += p.length / 3; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    },
  };

  const K = (t, v, e = 'io') => [t, v, e];
  // 두 손 가운데 (모델 공간, 게임에서 잼): 앞으로 뻗었을 때 / 가슴 앞에 들었을 때
  const FRONT = [0.053, 0.81, 0.93], CHEST = [0.05, 0.91, 0.87];
  const RF = 'front(.12,0,0)', LF = 'front(-.12,0,0)', RC = 'chest(.1,.22,.12)', LC = 'chest(-.1,.22,.12)';

  /* ---------- 앉아서 붙이기 (5.4초 한 알) ---------- */
  const DUR = 5.4;
  // 손이 앞(F)인지 가슴(C)인지의 때: 레몬도 같은 때에 같은 자리로 움직인다
  const HAND = [[0, 'F'], [0.5, 'F'], [0.95, 'C'], [1.15, 'C'], [1.45, 'F'], [1.95, 'F'], [2.25, 'C'], [2.9, 'C'], [3.25, 'F'], [3.75, 'F'], [4.15, 'C'], [4.9, 'F'], [DUR, 'F']];
  const reach = (side) => HAND.map(([t, w]) => `${w === 'F' ? (side === 'R' ? RF : LF) : (side === 'R' ? RC : LC)}@${t}`).join(' ');
  const track = (i, dy = 0, tap = false) => HAND.map(([t, w]) => K(t, (w === 'F' ? FRONT : CHEST)[i] + dy));
  const sticker = MinorActs_C();
  function MinorActs_C() {
    const C = root.MinorActs && root.MinorActs.C;
    if (!C) return null;
    const clip = C(DUR, {
      // 왼쪽 쟁반(-0.38) → 가운데 판(0) → 오른쪽 상자(+0.38) → 다시 쟁반
      rotY: '0:-.38 .5:-.38 .95:-.12 1.45:0 1.95:0 2.25:0 2.9:.05 3.25:.38 3.75:.38 4.15:.12 4.9:-.3 5.4:-.38',
      // 숙여 집기 → 펴고 보기 → 숙여 꾹 → 펴고 톡톡 → 숙여 넣기
      rotX: '0:.32 .5:.33 .95:.04 1.15:.04 1.45:.3 1.65:.31 1.95:.31 2.25:.06 2.4:.03 2.5:.07 2.6:.03 2.7:.07 2.9:.05 3.25:.25 3.75:.25 4.15:.06 4.9:.3 5.4:.32',
      squash: '0:1 1.55:1 1.7:.96 1.95:.97 2.1:1 5.4:1',
      posY: '0:0 2.4:0 2.45:.02 2.55:0 2.65:.02 2.75:0 3.9:0 4.0:.03 4.15:0 5.4:0',
    }, { R: reach('R'), L: reach('L') }, [[0, 'normal'], [0.95, 'normal'], [1.55, 'brave'], [2.25, 'smile'], [3.8, 'joy'], [4.6, 'normal']], {
      props: [
        // 두 손 사이에 쥔 레몬: 쟁반에서 집는 순간 나타나 상자에 넣는 순간 사라진다
        { id: 'lemon', shape: 'lemon', color: '#f6dc4a', size: 0.22, attach: 'body', tracks: {
          px: track(0), py: track(1), pz: track(2),
          rx: [K(0, 0), K(1.5, 0), K(1.75, 0.6), K(1.95, 0.9), K(2.25, 0.9), K(DUR, 0.9)],
        }, vis: [[0, 0], [0.42, 1], [3.6, 0]] },
        // 판에 눌린 순간 레몬 윗면으로 옮겨 붙은 스티커 (레몬이 굴러 스티커가 앞을 본다)
        { id: 'stuck', shape: 'sticker', color: '#8fd06a', size: 0.06, attach: 'body', tracks: {
          px: track(0), py: track(1, 0.02), pz: track(2, 0.075), rx: [K(0, Math.PI / 2), K(DUR, Math.PI / 2)],
        }, vis: [[0, 0], [1.75, 1], [3.6, 0]] },
        // 판 위의 한 장: 레몬이 꾹 누르는 순간 사라진다 (발밑 기준: 오른쪽 +x, 앞 +z, 책상 윗면 0.27)
        { id: 'sheetSticker', shape: 'sticker', color: '#8fd06a', size: 0.04, attach: 'ground', tracks: {
          px: [K(0, 0.045), K(DUR, 0.045)], py: [K(0, 0.284), K(DUR, 0.284)], pz: [K(0, 0.91), K(DUR, 0.91)],
        }, vis: [[0, 1], [1.72, 0]] },
      ],
      meta: { name: '레몬에 스티커 붙이기', phase: 'main', act: 'work', tags: ['레몬 공장'], desc: '쟁반에서 집기 → 들여다보기 → 판에 꾹 → 톡톡 → 상자에 쏙' },
    });
    clip.id = 'lemon_sticker';
    return clip;
  }
  if (sticker) ANIMS.lemon_sticker = sticker;

  /* ---------- 상자 안고 걷기 / 컨테이너에 붓기 ---------- */
  const C = root.MinorActs && root.MinorActs.C;
  const BOX_AT = [0.05, 0.62, 1.02];
  const boxProp = (tracks = {}, vis = [[0, 1]]) => ({ id: 'box', shape: 'cardbox', color: '#c9a273', size: 0.36, attach: 'body', tracks: {
    px: [K(0, BOX_AT[0]), K(9, BOX_AT[0])], py: [K(0, BOX_AT[1]), K(9, BOX_AT[1])], pz: [K(0, BOX_AT[2]), K(9, BOX_AT[2])], ...tracks }, vis });
  const pile = (n, tr) => Array.from({ length: n }, (_, i) => ({
    id: `pl${i}`, shape: 'lemon', color: '#f6dc4a', size: 0.12, attach: 'body', tracks: tr(i), vis: [[0, 1]],
  }));
  if (C) {
    const walkBody = { posY: '0:0 .15:.05 .3:0 .45:.05 .6:0', rotX: '0:-.06 .6:-.06', rotZ: '0:.04 .3:-.04 .6:.04', footLY: '0:0 .15:.07 .3:0 .6:0', footRY: '0:0 .3:0 .45:.07 .6:0' };
    const hold = { R: 'chest(.16,.06,.22)@0 chest(.16,.06,.22)@.6', L: 'chest(-.16,.06,.22)@0 chest(-.16,.06,.22)@.6' };
    const full = C(0.6, walkBody, hold, 'brave', { props: [boxProp(), ...pile(5, i => ({
      px: [K(0, BOX_AT[0] - 0.12 + (i % 3) * 0.12), K(9, BOX_AT[0] - 0.12 + (i % 3) * 0.12)], py: [K(0, BOX_AT[1] + 0.2 + (i > 2 ? 0.05 : 0)), K(9, BOX_AT[1] + 0.2 + (i > 2 ? 0.05 : 0))],
      pz: [K(0, BOX_AT[2] - 0.08 + (i > 2 ? 0.1 : 0)), K(9, BOX_AT[2] - 0.08 + (i > 2 ? 0.1 : 0))], ry: [K(0, i), K(9, i)],
    }))] });
    full.id = 'box_carry'; ANIMS.box_carry = full;
    const empty = C(0.6, walkBody, hold, 'normal', { props: [boxProp()] });
    empty.id = 'box_carry_empty'; ANIMS.box_carry_empty = empty;
    // 붓기: 번쩍 들어 앞으로 기울인다 (레몬은 컨테이너 쪽 dyn이 굴려 떨어뜨린다)
    const tilt = [K(0, 0), K(0.7, 0), K(1.2, -1.15), K(1.9, -1.15), K(2.4, 0)];
    const lift = [K(0, BOX_AT[1]), K(0.7, BOX_AT[1] + 0.32), K(1.9, BOX_AT[1] + 0.32), K(2.4, BOX_AT[1])];
    const pour = C(2.4, { rotX: '0:0 .7:-.08 1.2:.12 1.9:.12 2.4:0', posY: '0:0 .5:.06 .7:.04 2.4:0', squash: '0:1 .5:1.03 .7:1 2.4:1' },
      { R: 'chest(.16,.06,.22)@0 chest(.16,.3,.26)@.7 chest(.16,.34,.3)@1.9 chest(.16,.06,.22)@2.4', L: 'chest(-.16,.06,.22)@0 chest(-.16,.3,.26)@.7 chest(-.16,.34,.3)@1.9 chest(-.16,.06,.22)@2.4' },
      [[0, 'brave'], [1.2, 'joy']], { once: true, props: [boxProp({ py: lift, rx: tilt })] });
    pour.id = 'box_pour'; ANIMS.box_pour = pour;
  }

  /* ---------- 단계 사이: 걸을 때 상자를 안고, 책상 상자는 비운다 ---------- */
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      const boxes = (root.LemonFactory && root.LemonFactory.boxes) || {};
      const away = new Set();
      for (const c of this.chars) {
        const d = c.doing;
        const working = d && d.x && d.x.id === 'lemon.sticker';
        if (working && d.socket && /^work_sit_/.test(d.socket.name) && d.phase === 'use') c.lemonSeat = d.socket.name;
        let mc = null;
        if (working) {
          const st = d.x.steps[d.step] || {};
          const prev = d.x.steps[d.step - 1] || {};
          // 상자가 찬 뒤 컨테이너로 걸어가는 동안 / 붓고 나서 자리로 돌아오는 동안
          if (st.clip === 'box_pour' && d.phase !== 'use') mc = 'box_carry';
          else if (prev.clip === 'box_pour' && st.clip === 'lemon_sticker' && d.phase !== 'use') mc = 'box_carry_empty';
          if (c.lemonSeat && (st.clip === 'box_pour' || (prev.clip === 'box_pour' && d.phase !== 'use'))) away.add(c.lemonSeat);
          // 붓고 나면 그 자리 상자는 빈 상자가 된다
          if (prev.clip === 'box_pour' && c.lemonSeat && boxes[c.lemonSeat]) boxes[c.lemonSeat].data.count = d.phase === 'use' ? boxes[c.lemonSeat].data.count : 0;
        }
        if (mc) c.moveClip = mc;
        else if (c.moveClip === 'box_carry' || c.moveClip === 'box_carry_empty') c.moveClip = null;
      }
      for (const [name, o] of Object.entries(boxes)) o.data.away = away.has(name);
    };
  }
  root.LemonWork = { FRONT, CHEST };
}(typeof self !== 'undefined' ? self : this));
