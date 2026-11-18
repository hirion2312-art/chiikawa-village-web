'use strict';

// 치이카와 심즈 — 원작 키메라 모델 (2026-11-17 이재헌님 참조 그림 chimera-refs.zip 대조)
// 캐릭터 몸(character.js)과 같은 부품·외곽선으로 만든다. CHARACTER_PARTS[style] + 원작 장면에서 떠낸 얼굴 스캔(chimera-faces.js)
//
// 분홍 키메라 (참조: chimera_pink_cand1·2, 시트 1·2)
//  - 몸: 치이카와족처럼 둥근 머리와 몸, 연분홍 (원작 장면에서 뽑은 색)
//  - 귀: 머리 위 양쪽의 작은 동그란 귀. 짙은 갈색 고리 안에 몸 색 동그라미
//  - 배: 아랫배의 하얀 타원
//  - 수염: 볼 양옆으로 세 가닥씩 바깥으로 뻗는다
//  - 날개: 등 양옆으로 하얀 깃털 날개(둥근 깃 세 장), 팔 뒤로 삐죽 보인다
//  - 꼬리: 오른쪽 뒤로 땅에 깔린 보라 물고기 꼬리. 비늘 무늬, 끝은 두 갈래 지느러미
//  - 얼굴: 눈을 꼭 감고 눈물이 줄줄, 입을 크게 벌려 우는 얼굴, 빗금 볼터치, 걱정 눈썹
(function (root) {
  if (typeof CHARACTER_PARTS === 'undefined') return;

  const PINK = '#fcd4dd';
  const EAR = '#5b3a37';
  const BELLY = '#fffdf8';
  const WING = '#fffdf8';
  const FISH = '#a796d8', SCALE = '#7d6bb8', FIN = '#8f7ccc';

  CHARACTER_PARTS.chimeraPink = ({ p, ball, cone, tick, model, colored, y, part }) => {
    const headRatio = p.headW / 0.98;
    // 귀: 머리 위 양쪽의 작은 동그란 귀. 짙은 갈색 고리 안쪽(앞면)에 몸 색 동그라미
    for (const s of [-1, 1]) {
      ball(s * p.earX * headRatio, p.earT + 0.02, 0, 0.14, 0.145, 0.1, EAR);
      const inner = ball(s * p.earX * headRatio + s * 0.015, p.earT + 0.05, 0.078, 0.075, 0.075, 0.03, PINK);
      inner.children[0].visible = false;
    }
    // 배: 아랫배의 하얀 타원. 몸 앞면에 살짝 얹혀 테두리 선이 보인다
    const front = p.bodyW * p.depth;
    ball(0, p.bodyT + 0.12, front * 0.5, p.bodyW * 0.7, p.bodyH * 0.78, front * 0.53, BELLY);
    // 수염: 볼 양옆으로 세 가닥, 부채꼴로 바깥을 향한다
    for (const s of [-1, 1]) {
      [[0.9, 0.16], [0.99, 0.0], [1.08, -0.16]].forEach(([t, fan]) => {
        tick(s * 1.07 * headRatio, t, 0.1, 0.46, s * (Math.PI / 2 + fan));
      });
    }
    // 날개: 등 양옆의 하얀 깃털 날개. 둥근 깃 세 장이 바깥 위로 부채처럼 펼쳐진다
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * p.bodyW * 0.62, y(p.bodyT - 0.12), -front * 0.45);
      pivot.name = 'chimeraWing';
      pivot.userData.side = s;
      model.add(pivot);
      [[0.0, 0.0, 0.2, 0.33, 0.7], [0.1, -0.16, 0.16, 0.26, 1.15], [0.12, -0.3, 0.12, 0.19, 1.6]].forEach(([dx, dy, rx, ry, rot], i) => {
        const geo = new THREE.SphereGeometry(1, 20, 14);
        geo.scale(rx, ry, 0.06);
        geo.translate(0, ry * 0.8, 0);
        const m = part(geo, pivot, [s * (0.08 + dx), dy, -0.02 * i], colored(WING));
        m.rotation.z = -s * rot;
      });
      wings.push(pivot);
    }
    // 물고기 꼬리: 엉덩이에서 오른쪽 뒤로 땅을 따라 뻗고 점점 가늘어진다 (겹친 공의 바깥 윤곽만 남는다)
    const path = new THREE.CatmullRomCurve3([
      [0.12, 1.78, -front * 0.82], [0.48, 1.93, -front * 0.95], [0.86, 2.0, -front * 0.82], [1.16, 1.98, -front * 0.55],
    ].map(([x, t, z]) => new THREE.Vector3(x, t, z)));
    const N = 16;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const c = path.getPointAt(u);
      const r = 0.2 * (1 - u) + 0.07;
      ball(c.x, c.y, c.z, r * 1.05, r * 0.85, r, FISH);
      // 비늘: 윗면과 바깥 옆면에 짙은 반달 무늬 (선 없이 색만, 꼬리 끝쪽을 향해 열린다)
      if (i % 2 === 0 && i < N - 2) {
        const dir = path.getTangentAt(u);
        for (const [oy, oz, tilt] of [[0.68, 0.3, -0.9], [0.15, 0.85, -0.15]]) {
          const sc = new THREE.Mesh(new THREE.TorusGeometry(r * 0.5, r * 0.11, 6, 14, Math.PI), colored(SCALE));
          sc.position.set(c.x, y(c.y) + r * oy, c.z + r * oz);
          sc.rotation.set(tilt, Math.atan2(dir.x, -dir.z) * 0 + Math.PI / 2 - Math.atan2(dir.z, dir.x), Math.PI / 2);
          model.add(sc);
        }
      }
    }
    // 지느러미: 끝에서 위아래로 갈라진 두 장 (납작한 뿔)
    const end = path.getPointAt(1);
    for (const [tilt, len] of [[-1.05, 0.34], [-2.15, 0.3]]) {
      const fin = cone(end.x + 0.04, end.y, end.z, 0.13, len, FIN, tilt);
      fin.scale.z = 0.32;
    }
    // 지느러미 결: 짧은 선 세 개씩
    for (const [dy, a] of [[-0.13, -0.5], [0.1, -2.6]]) for (let k = 0; k < 2; k++) tick(end.x + 0.16 + k * 0.06, end.y + dy, end.z + 0.03, 0.12, a);
    model.userData.chimeraWings = wings;
  };

  /* ---------- 찻집 키메라 (참조: chimera_cafe_cand1·2, 시트 4·5) ----------
     - 몸: 머리와 몸이 한 덩이인 큰 연분홍 몸
     - 가시: 하늘색 뿔 가시가 이마에서 정수리를 지나 등을 따라 줄지어 나고, 양 볼에도 하나씩 휘어 솟는다
     - 코: 얼굴 가운데서 앞으로 길게 뻗은 코. 끝이 벌어지고 콧구멍이 있다
     - 얼굴: 코 밑동 양옆의 주근깨 점 무리 (원작 스캔), 눈은 보이지 않는다
     - 날개: 몸 양옆에 붙은 작은 하얀 날개. 아래쪽이 둥근 물결(깃 셋)
     - 앞치마: 허리의 장미색 앞치마 띠와 앞판, 등 뒤의 리본 (찻집 일꾼이었다) */
  const CAFE = '#fde0e6', SPIKE = '#bfe2ef', APRON = '#d9707f';
  CHARACTER_PARTS.chimeraCafe = ({ p, ball, cone, tick, model, colored, y, part }) => {
    const hw = p.headW, depth = p.depth, ht = p.headTop;
    // 머리 둘레 위의 점: a=0 정수리, +면 뒤로 넘어간다 (머리 단면 타원)
    const onHead = a => {
      const ry = Math.cos(a) >= 0 ? ht : p.headLow;
      return { t: ht - ry * Math.cos(a), z: -hw * depth * Math.sin(a) };
    };
    // 가시 줄: 이마 → 정수리 → 뒤통수 → 등
    [-0.75, -0.35, 0.05, 0.45, 0.85, 1.25, 1.65].forEach((a, i) => {
      const at = onHead(a);
      const sink = 0.05;
      const r = 0.1 + (i % 2) * 0.015, h = 0.3 + (i === 2 || i === 3 ? 0.06 : 0);
      cone(0, at.t + sink * Math.cos(a), at.z + sink * Math.sin(a), r, h, SPIKE, 0, -a);
    });
    // 등 아래쪽 양옆의 가시 둘씩
    for (const s of [-1, 1]) {
      cone(s * p.bodyW * 0.62, p.bodyT - 0.05, -p.bodyW * depth * 0.62, 0.085, 0.24, SPIKE, -s * 0.7, -1.2);
      cone(s * p.bodyW * 0.85, p.bodyT + 0.22, -p.bodyW * depth * 0.32, 0.075, 0.2, SPIKE, -s * 1.2, -0.6);
    }
    // 볼 가시: 양 볼에서 바깥 위로 휘어 솟는 물방울 가시
    for (const s of [-1, 1]) {
      const c1 = cone(s * hw * 0.74, 0.52, hw * depth * 0.42, 0.095, 0.26, SPIKE, -s * 0.85, 0.25);
      c1.scale.z = 0.8;
    }
    // 긴 코: 얼굴 가운데(주근깨 사이)에서 앞으로 뻗어 끝이 살짝 들린다. 겹친 공의 바깥 윤곽만 남는다
    const front = hw * depth;
    const trunk = new THREE.CatmullRomCurve3([[0, 0.98, front * 0.86], [0, 1.06, front + 0.25], [0, 1.07, front + 0.6], [0, 1.0, front + 0.88]].map(([x, t, z]) => new THREE.Vector3(x, t, z)));
    const N = 14;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const c = trunk.getPointAt(u);
      const r = 0.2 * (1 - u) + 0.12 * u;
      ball(c.x, c.y, c.z, r, r * 0.92, r);
    }
    // 코끝: 살짝 벌어진 끝과 콧구멍
    const tip = trunk.getPointAt(1);
    ball(tip.x, tip.y - 0.01, tip.z + 0.04, 0.17, 0.16, 0.09);
    const nose = ball(tip.x, tip.y - 0.01, tip.z + 0.12, 0.045, 0.07, 0.02, '#422724');
    nose.children[0].visible = false;
    // 날개: 몸 양옆에 붙은 작은 하얀 날개 (윗부분 + 아래 둥근 깃 셋)
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * p.bodyW * 0.98, y(p.bodyT - 0.12), -0.02);
      pivot.name = 'chimeraWing';
      pivot.userData.side = s;
      model.add(pivot);
      const top = new THREE.SphereGeometry(1, 20, 14);
      top.scale(0.05, 0.13, 0.27);
      part(top, pivot, [s * 0.02, 0.04, 0], colored('#fffdfb'));
      for (let k = 0; k < 3; k++) {
        const g = new THREE.SphereGeometry(1, 16, 12);
        g.scale(0.045, 0.09, 0.1);
        part(g, pivot, [s * 0.03, -0.06, -0.17 + k * 0.17], colored('#fffdfb'));
      }
      wings.push(pivot);
    }
    model.userData.chimeraWings = wings;
    // 앞치마: 허리띠(고리) + 앞판 + 등 뒤 리본
    const waist = p.bodyT + 0.02;
    const band = new THREE.TorusGeometry(p.bodyW * 1.0, 0.045, 10, 48);
    band.rotateX(Math.PI / 2);
    band.scale(1, 1, depth);
    part(band, model, [0, y(waist), 0], colored(APRON));
    // 앞판: 허리부터 아랫배까지 앞쪽만 덮는다 (옆·뒤는 띠뿐)
    const panel = new THREE.SphereGeometry(1, 28, 16, Math.PI / 2 - 0.62, 1.24, Math.PI * 0.5, Math.PI * 0.27);
    panel.scale(p.bodyW * 1.035, p.bodyH * 1.035, p.bodyW * depth * 1.035);
    part(panel, model, [0, y(p.bodyT), 0], colored(APRON));
    for (const s of [-1, 1]) {
      const loop = ball(s * 0.12, waist - 0.04, -p.bodyW * depth - 0.04, 0.12, 0.08, 0.04, APRON);
      loop.rotation.z = s * 0.4;
      const tail2 = ball(s * 0.07, waist + 0.15, -p.bodyW * depth - 0.03, 0.04, 0.13, 0.03, APRON);
      tail2.rotation.z = -s * 0.3;
    }
    ball(0, waist - 0.02, -p.bodyW * depth - 0.05, 0.05, 0.05, 0.04, APRON);
  };

  // 얼굴: 원작 장면에서 떠낸 스캔(chimera-faces.js)을 주연 캐릭터 얼굴과 같은 방식으로 붙인다.
  // 표정 목록(EXPRESSIONS)에 넣고 그림을 미리 읽어 둔다. 눈 자리(eyes)가 없으니 깜빡임은 덧칠하지 않는다
  const scans = root.CHIMERA_FACE_SCANS || {};
  for (const [id, url] of Object.entries(scans)) {
    if (!EXPRESSIONS.some(e => e.id === id)) EXPRESSIONS.push({ id, owner: id, label: '키메라', eyes: [] });
    const image = new Image();
    image.onload = () => {
      scanImages[id] = image;
      scanWaiters.splice(0).forEach(fn => fn());
    };
    image.src = url;
  }

  // 난동 괴물이 될 때 쓰는 생김새
  const PRESETS = {
    pink: () => ({ ...presetFromLook({ skin: PINK, ears: 'none', body: 'normal' }), style: 'chimeraPink', expression: 'chimera-pink', roundTail: false }),
    // 찻집 키메라는 몸집이 크다
    cafe: () => {
      const p = { ...presetFromLook({ skin: CAFE, ears: 'none', body: 'round' }), style: 'chimeraCafe', expression: 'chimera-cafe', roundTail: false };
      p.scale *= 1.2;
      return p;
    },
  };
  // 난동 괴물마다 원작 키메라 하나 (이름으로 고정)
  const KINDS = ['pink', 'cafe'];
  const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  root.ChimeraModels = { PRESETS, KINDS, presetFor: c => PRESETS[KINDS[hash(c && c.id) % KINDS.length]]() };
}(typeof self !== 'undefined' ? self : this));
