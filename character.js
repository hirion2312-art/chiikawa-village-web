'use strict';

// 게임과 편집기가 함께 쓰는 캐릭터 정의.
// 길이 단위 1 = 머리 최대 반폭(기본 크기 기준), t = 머리 꼭대기에서 아래로의 거리
const DEFAULT_CHARACTER = {
  scale: 0.8, outline: 0.036,
  headW: 0.98, headTop: 0.73, headLow: 0.9, depth: 0.88,
  bodyW: 0.76, bodyH: 0.55, bodyT: 1.45, neckArc: 0.3,
  footT: 2.15, footW: 0.055, footH: 0.1, footD: 0.06, footX: 0.215,
  earSize: 0.115, earTall: 1.03, earX: 0.57, earT: 0.015,
  armSize: 0.065, armLen: 0.12, armT: 1.33, armAngle: 1.18, armIn: -0.91, armDown: 0.75, armOut: 0.53,
  armSink: 0.07, armLift: 0.75,
  faceScale: 0.9, faceT: -0.03, expression: 'normal',
  skinColor: '#fffdf8', inkColor: '#3a3227',
  // 하치와레처럼 머리색, 고양이 귀, 꼬리가 있는 캐릭터용. hairColor가 없으면 쓰지 않는다
  hairColor: null, hairCenterT: 0.21, hairSideT: 0.47,
  catEarW: 0.26, catEarH: 0.38, catEarX: 0.54, catEarT: 0.12, catEarTilt: 0.22,
  tailSize: 0.1, tailLen: 0.22, tailT: 1.74, tailAngle: 2.85,
  // 우사기처럼 긴 귀가 있는 캐릭터용. rabbit이 true일 때만 쓴다
  rabbit: false, rabEarW: 0.16, rabEarH: 0.86, rabEarGap: 0.24, rabEarT: 0.06, rabEarTilt: 0.06, rabEarInner: '#f6bcc8',
  browInnerX: 0.24, browInnerT: 0.42, browPeakX: 0.62, browPeakT: 0.4, browOuterX: 0.68, browOuterT: 0.67, browWidth: 0.045,
  puffSize: 0.1, puffT: 1.72,
};

const CHARACTERS = [
  {
    id: 'chiikawa',
    label: '치이카와',
    storageKey: 'fan-game-character-v2',
    preset: {
      ...DEFAULT_CHARACTER,
      headTop: 0.77, bodyW: 0.74, neckArc: 0.5, footT: 2.11, roundTail: true,
      armSize: 0.06, armLen: 0.16, armT: 1.25, armAngle: 1.57, armIn: -1, armDown: 1, armOut: 1, armSink: 0.055, armLift: 0.72,
    },
  },
  {
    id: 'hachiware',
    label: '하치와레',
    storageKey: 'fan-game-hachiware-v1',
    preset: { ...DEFAULT_CHARACTER, expression: 'h-normal', faceScale: 0.95, faceT: -0.05, hairColor: '#89b5ca', neckArc: 0.2, catEarH: 0.34, bodyW: 0.74, footT: 2.08, armSink: 0.03, parting: true },
  },
  {
    id: 'usagi',
    label: '우사기',
    storageKey: 'fan-game-usagi-v1',
    preset: {
      ...DEFAULT_CHARACTER,
      expression: 'u-calm', faceScale: 0.95, faceT: -0.02, neckArc: 0.2, skinColor: '#fcefca', rabbit: true,
      headTop: 0.77, bodyW: 0.75, footT: 2.09, armAngle: 1.54,
      browInnerX: 0.23, browInnerT: 0.33, browPeakX: 0.6, browPeakT: 0.28, browOuterX: 0.625, browOuterT: 0.655, browWidth: 0.032,
    },
  },
];

// 체격이 크게 다른 인물의 공통 값
const ROUND_BODY = { ears: 'none', neckArc: 0.2 };
const YOROI_BODY = {
  ...DEFAULT_CHARACTER, ears: 'none', neckArc: 0, style: 'yoroi', scale: 0.95, expression: 'yo-normal', faceScale: 0.9, faceT: -0.2,
  headW: 0.78, headTop: 0.8, headLow: 0.72, depth: 0.92,
  bodyW: 1.08, bodyH: 1.1, bodyT: 2.2, footT: 4,
  footW: 0.34, footH: 0.72, footD: 0.38, footX: 0.46,
  armSize: 0.27, armLen: 1.2, armT: 1.75, armAngle: 1.57, armIn: -0.12, armDown: 1, armOut: 0.1, armSink: 0.1, armLift: 0.2,
};
const yoroiEntry = (id, label, skinColor, extra = {}) => ({
  id, label, faceOwner: 'yoroi', storageKey: `fan-game-${id}-v1`,
  preset: { ...YOROI_BODY, skinColor, ...extra },
});
const pajamaEntry = (id, label, skinColor, top) => ({
  id, label, faceOwner: 'pajama', storageKey: `fan-game-${id}-v1`,
  preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'pajama', expression: 'pj-normal', skinColor, faceOval: '#5f6b6e', pajamaTop: top, headTop: 0.77, bodyW: 0.74, footT: 2.09 },
});

CHARACTERS.push(
  {
    id: 'momonga', label: '모몽가', storageKey: 'fan-game-momonga-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'momonga', expression: 'm-normal', faceScale: 0.95, faceT: -0.04, headTop: 0.77, bodyW: 0.72, footT: 2.08 },
  },
  {
    id: 'shisa', label: '시사', storageKey: 'fan-game-shisa-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'shisa', expression: 's-normal', faceScale: 0.95, faceT: -0.02, skinColor: '#fef7e1', headTop: 0.77, bodyW: 0.75, footT: 2.09 },
  },
  {
    id: 'furuhonya', label: '후루혼야', storageKey: 'fan-game-furuhonya-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'furuhonya', expression: 'f-normal', faceScale: 0.95, faceT: -0.02, skinColor: '#feeee8', hairColor: '#f8c4c3', hairLine: false, hairCenterT: 0.31, hairSideT: 0.31, headTop: 0.77, bodyW: 0.75, footT: 2.09 },
  },
  {
    id: 'rakko', label: '랏코', storageKey: 'fan-game-rakko-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'rakko', expression: 'r-normal', faceScale: 0.95, faceT: 0, skinColor: '#fef3e0', limbColor: '#4a3230', outline: 0.022, headTop: 0.77, bodyW: 0.74, footT: 2.08 },
  },
  {
    id: 'kurimanju', label: '쿠리만쥬', storageKey: 'fan-game-kurimanju-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'kurimanju', expression: 'k-normal', faceScale: 0.95, faceT: 0, skinColor: '#fce9cb', hairColor: '#aa7b62', hairCenterT: 0.62, hairSideT: 0.3, hairBackT: 0.5, hairPow: 1.6, hairSpan: 1.45, headTop: 0.77, bodyW: 0.78, footT: 2.1 },
  },
  {
    id: 'goblin', label: '고블린', storageKey: 'fan-game-goblin-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'goblin', expression: 'g-normal', faceScale: 0.95, faceT: 0, skinColor: '#cfe6ab', headTop: 0.77, bodyW: 0.74, footT: 2.08 },
  },
  {
    id: 'anoko', label: '아노코', storageKey: 'fan-game-anoko-v1',
    preset: { ...DEFAULT_CHARACTER, ...ROUND_BODY, style: 'anoko', expression: 'a-swirl', faceScale: 0.95, faceT: -0.02, headTop: 0.77, bodyW: 0.8, footT: 2.1 },
  },
  {
    id: 'ode', label: '오데', storageKey: 'fan-game-ode-v1',
    preset: {
      ...DEFAULT_CHARACTER, ears: 'none', neckArc: 0, style: 'ode', scale: 0.85, expression: 'o-normal', faceScale: 1.15, faceT: 0, skinColor: '#f6f097',
      headW: 1, headTop: 0.95, headLow: 0.9, depth: 0.92,
      bodyW: 1.32, bodyH: 0.92, bodyT: 2.15, footT: 4.4,
      footW: 0.36, footH: 0.7, footD: 0.42, footX: 0.62,
      armSize: 0.34, armLen: 0.95, armT: 1.75, armAngle: 1.57, armIn: -0.7, armDown: 1, armOut: 0.45, armSink: 0.15, armLift: 0.25,
    },
  },
  {
    id: 'yamanba', label: '야만바', storageKey: 'fan-game-yamanba-v1',
    preset: {
      ...DEFAULT_CHARACTER, ears: 'none', neckArc: 0, style: 'yamanba', scale: 0.85, expression: 'y-laugh', faceScale: 1, faceT: -0.02,
      skinColor: '#e8d6a6', bodyColor: '#8fa888', limbColor: '#8fa888',
      hairColor: '#f7f5ef', hairCenterT: 0.26, hairSideT: 0.62,
      headTop: 0.77, headLow: 0.82, bodyW: 0.86, bodyH: 0.7, bodyT: 2.25, footT: 3,
      footW: 0.13, footH: 0.13, footD: 0.16, footX: 0.3,
      armSize: 0.13, armLen: 0.5, armT: 1.75, armAngle: 1.57, armIn: -0.7, armDown: 1, armOut: 0.5, armSink: 0.06, armLift: 0.4,
    },
  },
  yoroiEntry('yoroi-pochette', '포셰트 요로이', '#c5c3bd', { yoroiGear: 'pochette' }),
  yoroiEntry('yoroi-labor', '노동 요로이', '#b5a99a', { yoroiGear: 'bell', expression: 'yo-shout' }),
  yoroiEntry('yoroi-ramen', '라멘 로 요로이', '#dcc94a', { yoroiGear: 'towel', expression: 'yo-shout' }),
  yoroiEntry('yoroi-grass', '풀뽑기 요로이', '#e8a58e', { yoroiGear: 'bandana', hairColor: '#f5e184', hairStripes: ['#a8dcc4', '#f5e184', '#f4b59c', '#a8dcc4', '#f5e184', '#f4b59c'], hairCenterT: 0.46, hairSideT: 0.46 }),
  yoroiEntry('yoroi-tofu', '유두부 요로이', '#94b583', { yoroiGear: 'headband' }),
  yoroiEntry('yoroi-pharmacy', '약국 요로이', '#a3bb8f', { yoroiGear: 'strap' }),
  yoroiEntry('yoroi-takoyaki', '타코야키 요로이', '#c8675f'),
  yoroiEntry('yoroi-dars', 'DARS 요로이', '#8f6248'),
  yoroiEntry('yoroi-pudding', '푸딩 요로이', '#f3cf9e'),
  yoroiEntry('yoroi-boss', '위대한 요로이', '#c9bd64', { yoroiGear: 'crown' }),
  yoroiEntry('yoroi-kissa', '찻집 마스터', '#46403c'),
  pajamaEntry('pajama-midori', '파자마 미도리', '#cfe3a1', 'spikes'),
  pajamaEntry('pajama-pink', '파자마 핑크', '#f08e9b', 'ears'),
  pajamaEntry('pajama-murasaki', '파자마 무라사키', '#d9cdec', 'ears'),
  pajamaEntry('pajama-shiro', '파자마 시로', '#fbfaf5', 'tip'),
);

// 인물별 고유 부품. 좌표는 t(머리 꼭대기에서 아래로), 부품은 몸에 묻혀 밑선이 보이지 않는다
const CHARACTER_PARTS = {
  // 유저가 고른 귀와 꼬리. 색은 몸 색을 따른다
  custom({ p, ball, cone, tick }) {
    const inner = '#f6bcc8';
    const back = -p.bodyW * p.depth;
    const flat = mesh => { mesh.children[0].visible = false; return mesh; };
    // 체형에 따라 머리 폭이 달라지므로 귀도 같이 옮긴다
    const headRatio = p.headW / 0.98;
    for (const sign of [-1, 1]) {
      const side = sign * headRatio;
      switch (p.earStyle) {
        case 'small':
          ball(side * 0.56, 0.05, 0, 0.085, 0.09, 0.065);
          break;
        case 'round':
          ball(side * p.earX, p.earT, 0, p.earSize, p.earSize * p.earTall, p.earSize * 0.75);
          break;
        case 'bear':
          ball(side * 0.6, 0.0, -0.02, 0.17, 0.175, 0.12);
          flat(ball(side * 0.6, 0.01, 0.07, 0.09, 0.095, 0.07, inner));
          break;
        case 'mouse':
          ball(side * 0.64, 0.0, -0.03, 0.28, 0.31, 0.15);
          flat(ball(side * 0.64, 0.01, 0.09, 0.15, 0.18, 0.08, inner));
          break;
        case 'cat':
          cone(side * 0.54, 0.14, 0, 0.22, 0.38, null, -side * 0.22);
          flat(cone(side * 0.55, 0.09, 0.12, 0.09, 0.18, inner, -side * 0.22));
          break;
        case 'rabbit':
          ball(side * 0.26, -0.36, -0.02, 0.15, 0.46, 0.09).rotation.z = -side * 0.08;
          flat(ball(side * 0.26, -0.36, 0.05, 0.08, 0.33, 0.05, inner)).rotation.z = -side * 0.08;
          break;
        case 'tulip':
          ball(side * 0.64, 0.04, -0.02, 0.26, 0.27, 0.12);
          ball(side * 0.54, -0.18, -0.02, 0.075, 0.1, 0.075);
          ball(side * 0.76, -0.18, -0.02, 0.075, 0.1, 0.075);
          break;
        case 'folded':
          cone(side * 0.6, 0.22, -0.02, 0.17, 0.36, null, -side * 0.42);
          tick(side * 0.6, 0.02, 0.14, 0.07, side * 0.9);
          break;
        case 'side':
          cone(side * 0.72, 0.6, 0, 0.18, 0.44, null, -side * 1.1);
          break;
        default:
          break;
      }
    }
    // 꼬리는 작은 공을 이어 만든다. 겹친 안쪽 선은 가려지고 바깥 윤곽만 남는다
    const chain = (count, at) => {
      for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        const [x, t, z, r, color] = at(u);
        ball(x, t, z, r, r, r, color);
      }
    };
    switch (p.tailStyle) {
      case 'puff':
        ball(0, 1.78, back - 0.22, 0.17, 0.17, 0.16);
        break;
      case 'cat':
        chain(14, u => [0.5 * u, 1.82 - 0.95 * u, back - 0.14 - 0.14 * Math.sin(u * 2.6), 0.085]);
        break;
      case 'curl':
        chain(14, u => [0.13 * Math.sin(u * 7), 1.68 - 0.13 * (1 - Math.cos(u * 7)), back - 0.1 - 0.1 * u, 0.055]);
        break;
      case 'fluffy':
        for (let i = 0; i < 9; i++) {
          const u = i / 8;
          const x = 0.35 + 0.7 * Math.sin(u * 2.7);
          const t = 1.95 - 1.45 * u;
          const r = 0.32 + 0.2 * Math.sin(u * Math.PI);
          ball(x, t, back - 0.14 - 0.1 * Math.sin(u * 3), r, r, r * 0.8);
          tick(x + r * 0.55, t, back - 0.14 + r * 0.72, 0.15, -0.9 - u);
        }
        break;
      case 'fox':
        chain(11, u => {
          const r = 0.09 + 0.2 * Math.sin(Math.min(1, u * 1.15) * Math.PI);
          return [0.72 * u, 1.82 - 0.86 * u * u, back - 0.14, Math.max(0.06, r), u > 0.74 ? '#fffdf8' : null];
        });
        break;
      case 'dragon':
        chain(24, u => [0.5 * u * u, 1.5 - 2 * u, back - 0.14 - 0.2 * Math.sin(u * 3), 0.26 * (1 - u) + 0.05]);
        break;
      default:
        break;
    }
  },
  momonga({ ball, tick }) {
    const blue = '#bfe2f2';
    for (const side of [-1, 1]) {
      ball(side * 0.62, 0.02, -0.03, 0.28, 0.32, 0.16);
      const inner = ball(side * 0.62, 0.02, 0.09, 0.14, 0.19, 0.09, blue);
      inner.children[0].visible = false;
      // 뺨의 털
      ball(side * 0.86, 0.95, 0, 0.24, 0.22, 0.2);
      for (const [t, a] of [[0.74, 1.3], [0.94, 1.57], [1.14, 1.85]]) {
        tick(side * 1.08, t, 0.05, 0.14, -side * a);
      }
    }
    // 크고 푹신한 파란 꼬리: 몸 옆으로 드러나고, 앞에서 보이는 면에 털 선이 있다
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const x = 0.35 + 0.7 * Math.sin(u * 2.7);
      const t = 1.95 - 1.45 * u;
      const r = 0.32 + 0.2 * Math.sin(u * Math.PI);
      ball(x, t, -0.8 - 0.1 * Math.sin(u * 3), r, r, r * 0.8, blue);
      tick(x + r * 0.55, t, -0.8 + r * 0.72, 0.15, -0.9 - u);
    }
  },
  // 시사 (2026-11-12, 공식 캐릭터 그림 대조. 신체 비율은 그대로):
  // 바깥으로 기운 통통한 귀(안쪽 주름 선), 머리 양옆의 잎사귀 갈기(잎마다 가운데 선, 앞줄 4장 + 뒷줄 3장), 왼쪽 아래 세 갈래 불꽃 꼬리
  shisa({ p, model, colored, cone, tick, y, part, lineMat }) {
    const mane = '#f5ae82';
    const up = new THREE.Vector3(0, 1, 0);
    // 잎사귀: 밑동은 좁고 가운데가 통통하며 끝이 뾰족하다. 앞뒤로 납작. 밑동은 몸에 묻는다
    // bend: 끝으로 갈수록 +x 쪽으로 휘는 정도 (꼬리 불꽃이 위로 말려 올라가게)
    const leafGeo = (r, h, bend = 0) => {
      const pts = [[0, 0], [r * 0.55, h * 0.08], [r, h * 0.36], [r * 0.9, h * 0.58], [r * 0.45, h * 0.84], [r * 0.12, h * 0.97], [0, h]];
      const curve = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
      const geo = new THREE.LatheGeometry(curve.getPoints(24).map(v => new THREE.Vector2(Math.max(0, v.x), v.y)), 20);
      geo.scale(1, 1, 0.5);
      if (bend) {
        const pa = geo.attributes.position;
        for (let i = 0; i < pa.count; i++) pa.setX(i, pa.getX(i) + bend * h * (pa.getY(i) / h) ** 2);
        geo.computeVertexNormals();
      }
      return geo;
    };
    const leaf = (base, dir, r, h, rib = true, bend = 0, roll = 0) => {
      const g = new THREE.Group();
      g.position.copy(base);
      g.quaternion.setFromUnitVectors(up, dir.clone().normalize());
      if (roll) g.rotateY(roll);
      model.add(g);
      part(leafGeo(r, h, bend), g, [0, 0, 0], colored(mane));
      // 가운데 선 (앞뒷면): 잎 가운데에서 끝 쪽으로, 휜 잎이면 휜 만큼 따라간다
      if (rib) for (const z of [1, -1]) {
        const line = new THREE.Mesh(new THREE.CapsuleGeometry(p.outline * 0.42, h * 0.34, 3, 6), lineMat);
        line.position.set(bend * h * 0.27, h * 0.52, z * (r * 0.5 + 0.004));
        line.rotation.z = -Math.atan(bend * 1.04);
        g.add(line);
      }
      return g;
    };
    const HR = p.headW, HU = p.headTop, HD = p.headLow;
    for (const side of [-1, 1]) {
      // 귀: 바깥으로 기운 통통한 세모, 안쪽에 굽은 주름 선
      cone(side * 0.56, 0.26, -0.02, 0.22, 0.42, null, -side * 0.52);
      tick(side * 0.63, 0.13, 0.165, 0.1, -side * 0.3);
      tick(side * 0.68, 0.19, 0.16, 0.055, -side * 1.1);
      // 갈기 앞줄: 머리 윤곽(정면 타원) 위의 네 자리에서 바깥으로
      for (const [deg, h, r] of [[52, 0.36, 0.17], [24, 0.42, 0.2], [-4, 0.42, 0.2], [-30, 0.36, 0.18]]) {
        const a = (deg * Math.PI) / 180;
        const ry = a > 0 ? HU : HD;
        leaf(new THREE.Vector3(side * HR * Math.cos(a) * 0.86, y(HU - ry * Math.sin(a) * 0.86), -0.06), new THREE.Vector3(side * Math.cos(a), Math.sin(a) * 0.9, -0.22), r * 1.08, h * 1.12);
      }
    }
    // 꼬리 (공식 뒷모습 대조): 왼쪽 아래 엉덩이 뒤의 작은 털뭉치에서 나온 불꽃 털 세 갈래.
    // 큰 두 갈래는 끝이 위로 말려 올라가고, 작은 한 갈래는 아래로. 잎마다 가운데 선
    const tailBase = new THREE.Vector3(-0.6, y(1.86), -0.3);
    const tuft = part(new THREE.SphereGeometry(0.12, 18, 12), model, [tailBase.x, tailBase.y, tailBase.z], colored(mane));
    tuft.scale.set(1, 0.85, 0.9);
    for (const [dx, dy, dz, r, h, bend] of [[-1, 0.05, -0.55, 0.2, 0.52, 0.32], [-0.55, 0.95, -0.6, 0.15, 0.4, 0.26], [-0.6, -0.9, -0.5, 0.14, 0.32, -0.2]]) {
      leaf(tailBase, new THREE.Vector3(dx, dy, dz), r, h, true, bend);
    }
  },
  // 후루혼야 (2026-11-12, 공식 캐릭터 그림 대조): 머리 위 양옆의 게 집게 머리띠 (둥근 집게 몸통, 위에 V자로 갈라진 두 손가락),
  // 앞머리와 같은 분홍. 정수리의 삐친 털 두 가닥
  furuhonya({ p, model, colored, tick, y, part }) {
    const pink = p.hairColor || '#f8c4c3';
    // 오른쪽 집게의 윤곽 (밑동 가운데가 원점, 바깥이 +x). 안쪽 손가락은 작고 뾰족, 바깥 손가락은 크고 둥글다
    const OUTLINE = [[-0.11, 0.0], [-0.24, 0.12], [-0.31, 0.32], [-0.27, 0.52], [-0.19, 0.64], [-0.13, 0.715], [-0.105, 0.72], [-0.07, 0.64],
      [-0.03, 0.585], [0.0, 0.58], [0.04, 0.65], [0.09, 0.745], [0.115, 0.755], [0.2, 0.71], [0.3, 0.6], [0.345, 0.43], [0.32, 0.24], [0.22, 0.08], [0.11, 0.0]];
    // 윤곽을 가운데로 부풀려 만든 통통한 판 (법선이 이어져서 외곽선이 끊기지 않는다)
    const clawGeo = side => {
      const pts = OUTLINE.map(([x, v]) => new THREE.Vector3(x * 1.15 * side, v * 0.9, 0));
      if (side < 0) pts.reverse();
      const ring = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5).getSpacedPoints(72).slice(0, 72);
      const c = new THREE.Vector3(0.02 * side, 0.33, 0);
      const T = 0.085, NV = 9, N = ring.length;
      const pos = [], idx = [];
      pos.push(c.x, c.y, -T);                              // 뒤 꼭짓점
      for (let j = 1; j < NV; j++) {
        const v = -Math.PI / 2 + (j / NV) * Math.PI;
        const s = Math.pow(Math.cos(v), 0.45), z = Math.sin(v) * T;
        for (const q of ring) pos.push(c.x + (q.x - c.x) * s, c.y + (q.y - c.y) * s, z);
      }
      pos.push(c.x, c.y, T);                               // 앞 꼭짓점
      const at = (j, i) => 1 + (j - 1) * N + (i % N);
      const last = 1 + (NV - 1) * N;
      for (let i = 0; i < N; i++) {
        idx.push(0, at(1, i), at(1, i + 1));
        for (let j = 1; j < NV - 1; j++) idx.push(at(j, i), at(j + 1, i + 1), at(j, i + 1), at(j, i), at(j + 1, i), at(j + 1, i + 1));
        idx.push(last, at(NV - 1, i + 1), at(NV - 1, i));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    };
    const mat = colored(pink);
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      // 밑동은 앞머리 띠 뒤쪽 머리 속에 묻고, 바깥으로 기울여 정면을 조금 비켜 보게
      g.position.set(side * 0.5, y(0.22), -0.04);
      g.rotation.set(-0.08, side * 0.3, -side * 0.52);
      model.add(g);
      part(clawGeo(side), g, [0, 0, 0], mat);
    }
    tick(-0.08, -0.04, 0.02, 0.1, 0.4);
    tick(0.08, -0.04, 0.02, 0.1, -0.4);
  },
  // 랏코 (2026-11-11, 공식 캐릭터 그림 대조): 작은 검은 귀, 온몸의 보송한 털, 목의 흰 수건, 등의 반투명 망토, 등에 비스듬히 멘 검
  rakko({ p, model, colored, ball, ring, tick, y, part, lineMat }) {
    const R = t => Math.max(ellipseRadius(t, p.headTop, p.headLow, p.headW), ellipseRadius(t, p.bodyT, p.bodyH, p.bodyW));
    const bottomT = p.bodyT + p.bodyH;
    for (const side of [-1, 1]) ball(side * 0.97, 0.44, -0.08, 0.09, 0.12, 0.07, '#4a3230');

    // 온몸의 삐죽한 털 (원래 버전 그대로)
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      if (Math.sin(a) < -0.35) continue;
      const t = p.headTop - Math.sin(a) * p.headTop * 1.03;
      const r = p.headW * 1.03 * Math.cos(a);
      tick(r, t, 0, 0.09, -a + Math.PI / 2);
    }
    for (const side of [-1, 1]) {
      for (const t of [1.6, 1.75, 1.9]) tick(side * 0.74 * Math.sqrt(Math.max(0, 1 - ((t - p.bodyT) / p.bodyH) ** 2)), t, 0, 0.08, side * 1.3);
    }
    const up = new THREE.Vector3(0, 1, 0);

    // 목의 흰 수건
    ring(1.3, 0.8, 0.13, '#fbf7f0');

    // 망토: 수건 아래에서 등과 옆을 감싸고 발목 쪽으로 퍼진다. 팔(armAngle)보다 뒤에서 끝나 팔이 망토를 뚫지 않는다.
    // 몸보다 늘 바깥(+0.05 이상)에 있고, 밑단은 물결, 밑단 위에는 원작처럼 점무늬
    const capeTop = 1.4;
    const capeBot = p.footT - 0.1;
    const half = Math.PI - p.armAngle - 0.22;          // 등 가운데에서 양옆으로 펼친 각
    const A = 28, T = 14;
    const pos = [], idx = [];
    const capeR = (t, u) => R(Math.min(t, bottomT - 0.02)) + 0.05 + 0.5 * Math.pow(u, 1.3);
    const hemT = az => capeBot - 0.035 * Math.abs(Math.sin(az * 6.5));
    for (let i = 0; i <= T; i++) {
      for (let j = 0; j <= A; j++) {
        const az = Math.PI - half + (2 * half * j) / A;
        const u = i / T;
        const t = capeTop + (hemT(az) - capeTop) * u;
        const r = Math.max(capeR(t, u), R(t) + 0.05);
        pos.push(Math.sin(az) * r, y(t), Math.cos(az) * r * p.depth);
      }
    }
    for (let i = 0; i < T; i++) for (let j = 0; j < A; j++) {
      const a = i * (A + 1) + j, b = a + A + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const capeGeo = new THREE.BufferGeometry();
    capeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    capeGeo.setIndex(idx);
    capeGeo.computeVertexNormals();
    const capeMat = colored('#fdfaf3');
    capeMat.side = THREE.DoubleSide;
    capeMat.transparent = true;
    capeMat.opacity = 0.9;
    // 망토는 목 높이를 축으로 한 묶음 (앉을 때 게임이 세로로 접는다: model.userData.cape)
    const capeGroup = new THREE.Group();
    capeGroup.position.y = y(capeTop);
    model.add(capeGroup);
    const intoCape = mesh => { mesh.geometry.translate(0, -y(capeTop), 0); capeGroup.add(mesh); return mesh; };
    intoCape(new THREE.Mesh(capeGeo, capeMat));
    model.userData.cape = capeGroup;
    // 망토 테두리: 양옆 세로선과 물결 밑단
    const edge = (pts) => intoCape(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, (p.outline / p.scale) * 0.45, 5), lineMat));
    const at = (i, j) => new THREE.Vector3(pos[(i * (A + 1) + j) * 3], pos[(i * (A + 1) + j) * 3 + 1], pos[(i * (A + 1) + j) * 3 + 2]);
    edge(Array.from({ length: A + 1 }, (_, j) => at(T, j)));
    for (const j of [0, A]) edge(Array.from({ length: T + 1 }, (_, i) => at(i, j)));
    // 밑단 위 점무늬
    const dots = [];
    const dotGeo = new THREE.SphereGeometry(p.outline * 0.45, 6, 4);
    for (let j = 1; j < A; j += 1) {
      const a = at(T - 1, j), b = at(T, j);
      dots.push(dotGeo.clone().translate(...a.clone().lerp(b, 0.35).multiplyScalar(1.004).toArray()));
    }
    intoCape(new THREE.Mesh(mergeGeos(dots), lineMat));

    // 등에 멘 검: 칼집은 오른쪽 아래 등에서 왼쪽 위로 비스듬히, 칼자루는 왼쪽 어깨 위로 삐져나온다.
    // 칼집은 등 표면보다 0.05 뒤 (몸을 뚫지 않는다). 게임은 손에 무기를 들면 이것을 숨긴다 (model.userData.backSword)
    const sword = new THREE.Group();
    const from = new THREE.Vector3(0.3, y(1.9), 0);
    const to = new THREE.Vector3(-1.3, y(0.7), 0);
    const dir = to.clone().sub(from).normalize();
    // 검은 망토 위에 멘다: 지나가는 높이마다 몸·망토 중 바깥 면보다 뒤에 둔다 (어느 것도 뚫지 않는다)
    let back = 0;
    for (let k = 0; k <= 30; k++) {
      const q = from.clone().lerp(to, k / 30);
      const t = p.footT - q.y;
      const u = (t - capeTop) / (capeBot - capeTop);
      const r = u >= 0 && u <= 1 ? Math.max(R(t), capeR(t, u)) : R(t);
      if (Math.abs(q.x) < r) back = Math.max(back, Math.sqrt(r * r - q.x * q.x) * p.depth);
    }
    sword.position.z = -(back + 0.12);
    model.add(sword);
    // 날밑은 칼자루 쪽 끝(to)에서 칼자루 길이만큼 들어간 자리. 칼집(+Y)은 오른쪽 아래(from)를 향한다
    const built = buildRakkoSword((parent, geo, color, at) => part(geo, parent, at, colored(color)), { sheathed: true, u: 0.075, ink: p.inkColor });
    const blade = built.group;
    blade.position.copy(to).addScaledVector(dir, -(built.gripLen + 0.075 * 2.4));
    blade.quaternion.setFromUnitVectors(up, dir.clone().negate());
    sword.add(blade);
    model.userData.backSword = sword;
  },
  kurimanju({ ball }) {
    for (const side of [-1, 1]) ball(side * 0.88, 0.42, -0.02, 0.13, 0.11, 0.09);
  },
  goblin({ ball, cone }) {
    for (const side of [-1, 1]) cone(side * 0.72, 0.6, 0, 0.18, 0.44, null, -side * 1.1);
    cone(0, 0.1, 0, 0.22, 0.32);
    // 허리에 두른 가죽, 아랫단은 지그재그
    ball(0, 1.62, 0, 0.72, 0.27, 0.65, '#c9a783');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const zig = cone(Math.sin(a) * 0.62, 1.76, Math.cos(a) * 0.55, 0.09, 0.15, '#c9a783', 0, Math.PI);
      zig.children[0].visible = false;
    }
  },
  anoko({ ball, cone }) {
    const shell = '#e8a184';
    // 이마의 뿔, 둥근 귀, 볼의 털
    cone(0, 0.26, 0.6, 0.075, 0.2, shell, 0, 0.6);
    for (const side of [-1, 1]) {
      ball(side * 0.68, 0.12, -0.05, 0.15, 0.15, 0.11);
      ball(side * 0.96, 0.9, 0, 0.2, 0.2, 0.16);
      ball(side * 0.9, 1.12, 0, 0.17, 0.15, 0.14);
    }
    // 줄무늬 조개 앞발
    for (const [x, z] of [[-0.62, 0.62], [-0.77, 0.52], [-0.48, 0.68]]) {
      ball(x, 1.8, z, 0.11, 0.09, 0.1, shell);
    }
    // 등에서 머리 위로 솟은 초록 용 꼬리
    for (let i = 0; i < 24; i++) {
      const u = i / 23;
      const r = 0.28 * (1 - u) + 0.05;
      ball(0.5 * u * u, 1.4 - 2.3 * u, -0.8 - 0.2 * Math.sin(u * 3), r, r, r, '#6e9470');
    }
  },
  pajama({ p, ball, cone }) {
    for (const side of [-1, 1]) {
      if (p.pajamaTop === 'ears') ball(side * 0.56, 0.05, -0.02, 0.17, 0.15, 0.12);
    }
    if (p.pajamaTop === 'spikes') for (const x of [-0.3, 0, 0.3]) cone(x, 0.08 + Math.abs(x) * 0.25, 0, 0.13, 0.26, null, -x * 0.8);
    if (p.pajamaTop === 'tip') cone(0, 0.06, 0, 0.16, 0.26, null);
    // 잠옷 단추
    for (const [t, z] of [[1.72, 0.57], [1.86, 0.43]]) {
      const button = ball(0, t, z, 0.04, 0.04, 0.02, '#4a3230');
      button.children[0].visible = false;
    }
  },
  ode({ ball, cone }) {
    // 어깨 근육과 허리에 두른 가죽, 굵은 다리
    for (const side of [-1, 1]) ball(side * 1.05, 1.62, 0, 0.62, 0.5, 0.55);
    ball(0, 2.8, 0, 1.12, 0.46, 0.92, '#c9a07e');
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const zig = cone(Math.sin(a) * 1, 3.12, Math.cos(a) * 0.82, 0.16, 0.28, '#c9a07e', 0, Math.PI);
      zig.children[0].visible = false;
    }
  },
  yamanba({ ball, cone, ring, tick }) {
    // 뒤로 뻗친 흰 머리
    ball(0, 0.62, -0.3, 1.12, 0.98, 0.72, '#f7f5ef');
    for (const side of [-1, 1]) {
      for (const [t, a] of [[0.34, 1.05], [0.68, 1.4], [1.02, 1.8]]) {
        cone(side * 0.9, t, -0.25, 0.2, 0.44, '#f7f5ef', -side * a);
      }
    }
    // 앞섶과 흰 허리띠
    ring(2.4, 0.83, 0.06, '#fbf7f0');
    ball(0.46, 2.4, 0.66, 0.09, 0.07, 0.05, '#fbf7f0');
    tick(-0.12, 1.86, 0.72, 0.34, 0.5);
    tick(0.12, 1.86, 0.72, 0.34, -0.5);
  },
  yoroi({ p, ball, cone, ring, tick, colored, model, y }) {
    // 목 보호대, 어깨 갑옷, 허리띠, 가슴 근육 선
    ball(0, 1.62, 0, 0.72, 0.28, 0.68);
    for (const side of [-1, 1]) {
      const pad = ball(side * 1, 1.66, 0, 0.44, 0.27, 0.44);
      pad.rotation.z = -side * 0.35;
      tick(side * 0.34, 2.12, 0.96, 0.4, side * 1.35);
      tick(side * 0.72, 1.98, 0.8, 0.26, -side * 0.5);
    }
    tick(0, 2.5, 1.0, 0.4, 0);
    ring(2.95, 0.82, 0.06, null);
    const gear = p.yoroiGear;
    if (gear === 'pochette') {
      // 분홍 곰 포셰트와 비스듬한 끈
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.1, 0.03), colored(p.inkColor));
      strap.position.set(0.12, y(2.2), 1.0);
      strap.rotation.z = 0.68;
      model.add(strap);
      ball(0.85, 2.92, 0.72, 0.3, 0.27, 0.16, '#f6bcc8');
      ball(0.65, 2.68, 0.72, 0.08, 0.08, 0.06, '#f6bcc8');
      ball(1.05, 2.68, 0.72, 0.08, 0.08, 0.06, '#f6bcc8');
    } else if (gear === 'towel') {
      ball(0, 0.1, 0, 0.8, 0.42, 0.74, '#fbf9f4');
      ball(0.1, 0.3, -0.62, 0.12, 0.08, 0.06, '#fbf9f4');
      ball(-0.1, 0.3, -0.62, 0.12, 0.08, 0.06, '#fbf9f4');
    } else if (gear === 'bandana') {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        ball(Math.sin(a) * 0.64, 0.3, Math.cos(a) * 0.59, 0.05, 0.05, 0.05, '#fbf9f4');
      }
    } else if (gear === 'headband') {
      ring(0.36, 0.66, 0.05, '#fbf9f4');
      ball(0.44, 0.34, -0.46, 0.08, 0.14, 0.05, '#fbf9f4');
    } else if (gear === 'strap') {
      // 등에 엇갈린 끈
      for (const dir of [-1, 1]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.04), colored('#f5f3ec'));
        band.position.set(0, y(2.2), -0.97);
        band.rotation.z = dir * 0.62;
        model.add(band);
      }
    } else if (gear === 'crown') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        cone(Math.sin(a) * 0.36, 0.14, Math.cos(a) * 0.33, 0.12, 0.42, '#d9c75a');
      }
      ring(0.12, 0.42, 0.06, '#d9c75a');
    } else if (gear === 'bell') {
      // 노동의 종
      cone(1.55, 2.75, 0.3, 0.2, 0.32, '#b98f68');
      ball(1.55, 2.79, 0.3, 0.2, 0.05, 0.2, '#b98f68');
    }
  },
};

// 유저가 고른 생김새를 모델 값으로 바꾼다. 몸 비율은 세 가지 체형으로만 고른다
function presetFromLook(look = {}) {
  const base = { ...characterEntry('chiikawa').preset, ears: 'none', style: 'custom', neckArc: 0.2 };
  // 얼굴 선과 윤곽선이 묻히지 않게 너무 어두운 색은 밝힌다
  const hex = /^#[0-9a-f]{6}$/i.test(look.skin || '') ? look.skin : base.skinColor;
  const c = new THREE.Color(hex);
  const luma = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  if (luma < 0.42) c.lerp(new THREE.Color(0xffffff), (0.42 - luma) / (1 - luma));
  base.skinColor = `#${c.getHexString()}`;
  // 샘플이 생기기 전에 태어난 아이의 값도 그대로 읽는다
  base.earStyle = { normal: 'round', big: 'bear' }[look.ears] || look.ears || 'round';
  base.tailStyle = look.tail || 'none';
  base.eyeScale = look.eyeSize === undefined ? 1 : look.eyeSize;
  base.eyeY = look.eyeY || 0;
  base.eyeGap = look.eyeGap || 0;
  base.browStyle = look.brow || 'scan';
  base.browY = look.browY || 0;
  base.browSize = look.browSize === undefined ? 1 : look.browSize;
  base.mouthStyle = look.mouth || 'scan';
  // 감정 표정 세트 { normal|joy|cry|surprise|angry|sleep: { eye: 표정 id, mouth: 표정 id } }
  if (look.faceSet && typeof look.faceSet === 'object') base.faceSet = look.faceSet;
  base.mouthY = look.mouthY || 0;
  base.mouthSize = look.mouthSize === undefined ? 1 : look.mouthSize;
  if (look.body === 'slim') {
    base.headW *= 0.88;
    base.bodyW *= 0.8;
    base.footX *= 0.82;
    base.footW *= 0.9;
  } else if (look.body === 'round') {
    base.headW *= 1.14;
    base.bodyW *= 1.3;
    base.bodyH *= 1.05;
    base.footX *= 1.35;
    base.footW *= 1.2;
  }
  return base;
}

const ACTIVE_CHARACTER_KEY = 'fan-game-active-character';

function characterEntry(id) {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

function loadActiveCharacterId() {
  try {
    return characterEntry(localStorage.getItem(ACTIVE_CHARACTER_KEY)).id;
  } catch (e) {
    return CHARACTERS[0].id;
  }
}

function saveActiveCharacterId(id) {
  try {
    localStorage.setItem(ACTIVE_CHARACTER_KEY, id);
  } catch (e) {
    // 저장이 막힌 환경에서는 이번 실행에서만 바뀐다
  }
}

function loadCharacter(id) {
  const entry = characterEntry(id);
  let params;
  try {
    params = { ...entry.preset, ...JSON.parse(localStorage.getItem(entry.storageKey)) };
  } catch (e) {
    params = { ...entry.preset };
  }
  // 저장된 표정이 표정 목록 개편으로 없어졌으면 기본 표정으로 돌린다
  if (!EXPRESSIONS.some(e => e.id === params.expression)) params.expression = entry.preset.expression;
  return params;
}

function saveCharacter(id, params) {
  localStorage.setItem(characterEntry(id).storageKey, JSON.stringify(params));
}

// 얼굴 그림의 범위. x는 중심에서의 호 길이, t는 머리 꼭대기에서의 거리
const FACE_SPAN_X = 3;
const FACE_SPAN_T = 1.5;

// 등록된 표정. 스캔 이미지는 .claude/build-faces.html 로 만들어 face-scan-data.js 에 묶어 둔다
const FACE_FRAME = FACE_SCAN_META.frame;
const EXPRESSIONS = FACE_SCAN_META.faces.concat(
  { id: 'pj-normal', owner: 'pajama', label: '기본', eyes: [], painted: true },
  { id: 'pj-star', owner: 'pajama', label: '번쩍', eyes: [], painted: true, star: true },
);

function expressionsFor(characterId) {
  const entry = characterEntry(characterId);
  return EXPRESSIONS.filter(e => e.owner === (entry.faceOwner || entry.id));
}

const scanImages = {};
const scanWaiters = [];
for (const { id, painted } of EXPRESSIONS) {
  if (painted) continue;
  const image = new Image();
  image.onload = () => {
    // 기울거나 밀린 원작 스캔은 face-fixes.js 값으로 바로 세운다 (2026-11-18)
    scanImages[id] = typeof fixScanImage === 'function' ? fixScanImage(id, image) : image;
    scanWaiters.splice(0).forEach(fn => fn());
  };
  image.src = FACE_SCAN_IMAGES[id];
}
// 꾸미기 아이 전용 얼굴 (face-scan-custom.js): 볼·빗금 없는 정리판. 원작 캐릭터는 위의 원본을 그대로 쓴다 (원작은 건드리지 않음)
const customScanImages = {};
if (typeof CUSTOM_FACE_IMAGES !== 'undefined') {
  for (const [id, src] of Object.entries(CUSTOM_FACE_IMAGES)) {
    const image = new Image();
    image.onload = () => {
      customScanImages[id] = image;
      scanWaiters.splice(0).forEach(fn => fn());
    };
    image.src = src;
  }
}
const baseScanFor = (p, id) => (p.style === 'custom' && customScanImages[id]) || scanImages[id];

// 머리 위를 덮는 색. 이마 가운데가 뾰족하게 갈라지고 옆으로 갈수록 내려온다.
// 그림 양 끝의 색이 뒤통수까지 늘어나므로 뒤에서도 같은 높이로 이어진다
function paintHair(g, p, pxX, pxY) {
  const half = FACE_SPAN_X / 2 + 0.02;   // 그림 밖까지 칠해 끝줄이 비지 않게 한다
  const span = p.hairSpan || 1.5;
  const edge = x => p.hairCenterT
    + (p.hairSideT - p.hairCenterT) * Math.pow(Math.sin((Math.min(1, Math.abs(x) / span) * Math.PI) / 2), p.hairPow || 0.6);
  const trace = () => {
    for (let x = -half; x <= half; x += 0.01) g.lineTo(x, edge(x));
  };
  g.save();
  g.scale(pxX, pxY);
  g.translate(FACE_SPAN_X / 2, 0);
  g.lineJoin = 'round';
  g.fillStyle = p.hairColor;
  g.beginPath();
  g.moveTo(-half, 0);
  trace();
  g.lineTo(half, 0);
  g.closePath();
  g.fill();
  if (p.hairStripes) {
    // 무지개 반다나: 물결치는 가로 띠
    g.save();
    g.clip();
    p.hairStripes.forEach((color, i) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(-half, 0.12 * i);
      for (let x = -half; x <= half; x += 0.05) g.lineTo(x, 0.12 * i + 0.025 * Math.sin(x * 9 + i));
      for (let x = half; x >= -half; x -= 0.05) g.lineTo(x, 0.12 * (i + 1) + 0.025 * Math.sin(x * 9 + i + 1));
      g.closePath();
      g.fill();
    });
    g.restore();
  }
  if (p.hairLine !== false) {
    g.strokeStyle = p.inkColor;
    g.lineWidth = (p.outline / p.scale) * 1.1;
    g.beginPath();
    trace();
    g.stroke();
  }
  g.restore();
}

// 우사기 이마의 둥근 선 두 개: 눈 위에서 시작해 눈 바깥쪽으로 내려온다 (원작 정면 컷에서 잰 값)
function paintBrowArcs(g, p, pxX, pxY) {
  g.save();
  g.scale(pxX, pxY);
  g.translate(FACE_SPAN_X / 2, 0);
  g.lineCap = 'round';
  g.strokeStyle = p.inkColor;
  g.lineWidth = p.browWidth;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * p.browInnerX, p.browInnerT);
    g.quadraticCurveTo(side * p.browPeakX, p.browPeakT, side * p.browOuterX, p.browOuterT);
    g.stroke();
  }
  g.restore();
}

// 파자마 파티즈: 얼굴이 그림자로 가려진 디자인이라 스캔할 이목구비가 없다. 어두운 타원과 볼의 빗금, 번쩍임만 그린다
function paintFaceOval(g, p, expression, pxX, pxY) {
  g.save();
  g.scale(pxX, pxY);
  g.translate(FACE_SPAN_X / 2, 0);
  g.fillStyle = p.faceOval;
  g.strokeStyle = p.inkColor;
  g.lineWidth = 0.05;
  g.beginPath();
  g.ellipse(0, 0.74, 0.84, 0.5, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.lineCap = 'round';
  g.lineWidth = 0.026;
  for (const side of [-1, 1]) {
    for (const dx of [0, 0.09]) {
      g.beginPath();
      g.moveTo(side * 0.52 + dx, 0.74);
      g.lineTo(side * 0.52 + dx - 0.05, 0.84);
      g.stroke();
    }
  }
  if (expression.star) {
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 4;
      const r = i % 2 ? 0.07 : 0.3;
      g.lineTo(Math.cos(a) * r, 0.74 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }
  g.restore();
}

// 얼굴 부위 조정. 눈, 눈썹, 입을 스캔에서 따로 도려내 옮기거나 샘플 모양으로 바꾼다. 볼은 그대로 둔다
const eyeSpots = expression => (expression.eyes.length ? expression.eyes : [{ x: -0.33, t: FACE_FRAME.eyeT, r: 0.14 }, { x: 0.33, t: FACE_FRAME.eyeT, r: 0.14 }]);
// 표정마다 스캔의 입 자리 [가운데 t, 가로 반지름, 세로 반지름]. 표정 그림에서 잰 값
const MOUTH_SPOTS = {
  normal: [1.0, 0.17, 0.13], smile: [1.01, 0.2, 0.13], joy: [1.0, 0.22, 0.14], cry: [1.05, 0.2, 0.13], wail: [1.2, 0.26, 0.3], panic: [1.16, 0.2, 0.24],
  nope: [1.16, 0.22, 0.21], worried: [1.0, 0.15, 0.12], brave: [1.04, 0.17, 0.16], flustered: [1.05, 0.15, 0.16], excited: [1.1, 0.2, 0.2], eating: [1.1, 0.27, 0.22],
};
// 입이 감정 그 자체인 표정은 샘플 입으로 바꾸지 않는다
const CALM_MOUTH = new Set(['normal', 'smile', 'joy', 'worried', 'brave', 'flustered']);

// 원작 스캔에서 입만 떠낸 조각 (2026-11-17 꾸미기 입 교체). mouthStyle 'm:<표정 id>'
// 입 둘레 칸에서 먹선·입속 덩어리를 이어 붙여 찾고, 가운데에 있는 덩어리만 남긴다(눈꼬리·볼 빗금·콧물은 버림)
const mouthPieces = {};
// 예전 코드로 그리던 입 → 가장 비슷한 원작 입
// 예전 코드로 그리던 눈썹 → 가장 비슷한 원작 눈썹
const OLD_BROW = { short: 'b:normal', arch: 'b:smile', sad: 'b:worried', angry: 'b:brave', thick: 'b:flustered' };
const OLD_MOUTH = { small: 'm:normal', cat: 'm:m-normal', smile: 'm:smile', line: 'm:r-normal', round: 'm:brave', open: 'm:h-laugh' };
const bakedMouths = {};
// 구워 둔 조각(mouth-scans.js)이 있으면 그것을 쓴다. 아직 읽는 중이면 'wait'
function bakedMouth(id) {
  const B = typeof window !== 'undefined' && window.MOUTH_SCANS && window.MOUTH_SCANS[id];
  if (!B) return null;
  if (!bakedMouths[id]) {
    const im = new Image();
    bakedMouths[id] = { im, y: B.y, ready: false };
    im.onload = () => { bakedMouths[id].ready = true; scanWaiters.splice(0).forEach(fn => fn()); };
    im.src = B.src;
  }
  return bakedMouths[id].ready ? { piece: bakedMouths[id].im, y: bakedMouths[id].y } : 'wait';
}
function scanMouthPiece(id) {
  const baked = bakedMouth(id);
  if (baked) return baked;
  if (mouthPieces[id] !== undefined) return mouthPieces[id];
  const im = scanImages[id];
  if (!im) return null;
  const px = FACE_FRAME.pxPerUnit;
  const x0 = Math.round((FACE_FRAME.halfX - 0.36) * px);
  const x1 = Math.round((FACE_FRAME.halfX + 0.36) * px);
  const y0 = Math.round((0.86 - FACE_FRAME.topT) * px);
  const y1 = Math.round((Math.min(1.5, FACE_FRAME.bottomT) - FACE_FRAME.topT) * px) - 1;
  const W = x1 - x0, H = y1 - y0;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(im, x0, y0, W, H, 0, 0, W, H);
  const src = g.getImageData(0, 0, W, H);
  const d = src.data;
  // 먹선(어두움)이나 입속(빨강·분홍·어두운 채움)인 칸
  const on = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < 90) continue;
    if (r + gg + b < 360 || (r > 170 && gg < 150 && b < 170)) on[i] = 1;
  }
  // 이어진 덩어리 나누기
  const label = new Int32Array(W * H);
  const keep = new Set();
  const stack = [];
  let next = 1;
  for (let i = 0; i < W * H; i++) {
    if (!on[i] || label[i]) continue;
    const id2 = next++;
    let n = 0, sx = 0, minY = H;
    label[i] = id2;
    stack.push(i);
    while (stack.length) {
      const k = stack.pop();
      const x = k % W, y = (k / W) | 0;
      n++;
      sx += x;
      if (y < minY) minY = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (on[j] && !label[j]) { label[j] = id2; stack.push(j); }
      }
    }
    // 가운데(가로 ±0.2)에 무게가 있고, 칸 맨 위에 걸치지 않은 덩어리만
    const cx = (sx / n - W / 2) / px;
    if (n > 30 && Math.abs(cx) < 0.2 && minY > 2) keep.add(id2);
  }
  if (!keep.size) { mouthPieces[id] = null; return null; }
  // 남길 칸 둘레 2px까지 원본 그대로(먹선 가장자리의 반투명을 살린다)
  const mask = new Uint8Array(W * H);
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  for (let i = 0; i < W * H; i++) {
    if (!keep.has(label[i])) continue;
    const x = i % W, y = (i / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) mask[ny * W + nx] = 1;
    }
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  for (let i = 0; i < W * H; i++) if (!mask[i]) d[i * 4 + 3] = 0;
  g.putImageData(src, 0, 0);
  bx0 = Math.max(0, bx0 - 3); by0 = Math.max(0, by0 - 3); bx1 = Math.min(W - 1, bx1 + 3); by1 = Math.min(H - 1, by1 + 3);
  const piece = document.createElement('canvas');
  piece.width = bx1 - bx0 + 1;
  piece.height = by1 - by0 + 1;
  piece.getContext('2d').drawImage(c, bx0, by0, piece.width, piece.height, 0, 0, piece.width, piece.height);
  // 원래 얼굴에서의 자리(가로는 가운데로 맞춘다)
  mouthPieces[id] = { piece, y: y0 + by0 };
  return mouthPieces[id];
}
// 원작 스캔에서 두 눈(눈썹·눈물 포함)만 떠낸 조각 (2026-11-17 감정 표정). 볼 분홍·볼 빗금·입·코는 버린다
// 돌려주는 것: { piece, x, y } — 얼굴 스캔 틀 안에서 조각 왼쪽 위 픽셀 자리
const eyePieces = {};
const bakedEyes = {};
// 구워 둔 눈 조각(eye-scans.js)이 있으면 그것을 쓴다. 아직 읽는 중이면 'wait'
function bakedEye(id) {
  const B = typeof window !== 'undefined' && window.EYE_SCANS && window.EYE_SCANS[id];
  if (!B) return null;
  if (!bakedEyes[id]) {
    const im = new Image();
    bakedEyes[id] = { im, ready: false };
    im.onload = () => { bakedEyes[id].ready = true; scanWaiters.splice(0).forEach(fn => fn()); };
    im.src = B.src;
  }
  return bakedEyes[id].ready ? { piece: bakedEyes[id].im, x: B.x, y: B.y, w: B.w, h: B.h } : 'wait';
}
// eyesOnly: 눈썹을 뺀 눈만 (꾸미기 얼굴 섞기). 구워 둔 조각(eye-scans.js)은 눈만 담는다
function scanEyePiece(id, eyesOnly = false) {
  const key = eyesOnly ? id + '|e' : id;
  if (eyePieces[key] !== undefined) return eyePieces[key];
  // 눈만(꾸미기): 볼 없는 정리판에서 구워 둔 조각을 먼저 쓴다
  if (eyesOnly) { const baked = bakedEye(id); if (baked) return baked; }
  const im = scanImages[id];
  if (!im) return null;
  const meta = FACE_SCAN_META.faces.find(f => f.id === id);
  const eyesM = meta && meta.eyes && meta.eyes.length ? meta.eyes : [{ x: -0.33, t: FACE_FRAME.eyeT, r: 0.14 }, { x: 0.33, t: FACE_FRAME.eyeT, r: 0.14 }];
  const eyeTop = Math.min(...eyesM.map(e => e.t - (e.r || 0.14))) - 0.01;
  const px = FACE_FRAME.pxPerUnit;
  const x0 = Math.round((FACE_FRAME.halfX - 0.7) * px);
  const x1 = Math.round((FACE_FRAME.halfX + 0.7) * px);
  const y0 = 0;
  const y1 = Math.round((1.3 - FACE_FRAME.topT) * px);
  const W = x1 - x0, H = y1 - y0;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(im, x0, y0, W, H, 0, 0, W, H);
  const src = g.getImageData(0, 0, W, H);
  const d = src.data;
  const isInk = (r, gg, b) => r + gg + b < 360;
  const isTear = (r, gg, b) => b > 190 && b - r > 30 && gg > 150;
  const on = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < 90) continue;
    if (isInk(r, gg, b)) on[i] = 1;
    else if (isTear(r, gg, b)) on[i] = 2;
  }
  const label = new Int32Array(W * H);
  const boxes = [];
  const kept = new Set();
  const stack = [];
  let next = 1;
  for (let i = 0; i < W * H; i++) {
    if (!on[i] || label[i]) continue;
    const id2 = next++;
    let n = 0, sx = 0, sy = 0, bx0 = W, by0 = H, bx1 = 0, by1 = 0, tear = on[i] === 2;
    label[i] = id2;
    stack.push(i);
    while (stack.length) {
      const k = stack.pop();
      const x = k % W, y = (k / W) | 0;
      n++; sx += x; sy += y;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (on[j] && on[j] === on[i] && !label[j]) { label[j] = id2; stack.push(j); }
      }
    }
    const cx = (sx / n - W / 2) / px;          // 얼굴 가운데에서 가로 거리
    const ct = sy / n / px + FACE_FRAME.topT;  // 세로 자리(t)
    if (n < 25) continue;
    if (tear) { if (Math.abs(cx) > 0.12) boxes.push([bx0, by0, bx1, by1]); continue; }   // 가운데 파란 것은 코
    if (ct > 0.95 || by0 / px + FACE_FRAME.topT > 0.92) continue;   // 입·볼 빗금 (눈물만 아래로 내려간다)
    if (Math.abs(cx) > 0.48 && ct > 0.86) continue;   // 볼 빗금
    if (Math.abs(cx) < 0.1 && ct > 0.86) continue;    // 코·입
    if (eyesOnly && by1 / px + FACE_FRAME.topT < eyeTop) continue;   // 눈 윗변보다 통째로 위 = 눈썹·이마 무늬
    if (eyesOnly && Math.abs(cx) < 0.14) continue;                     // 미간의 땀·놀람 선
    kept.add(id2);
    boxes.push([bx0, by0, bx1, by1]);
  }
  if (!boxes.length) { eyePieces[key] = null; return null; }
  // 남길 덩어리의 네모 칸 안은 원본 그대로(눈 속 흰 반짝임을 살린다), 볼 분홍은 뺀다
  const mask = new Uint8Array(W * H);
  let ax0 = W, ay0 = H, ax1 = 0, ay1 = 0;
  for (const [bx0, by0, bx1, by1] of boxes) {
    for (let y = Math.max(0, by0 - 3); y <= Math.min(H - 1, by1 + 3); y++) for (let x = Math.max(0, bx0 - 3); x <= Math.min(W - 1, bx1 + 3); x++) mask[y * W + x] = 1;
    ax0 = Math.min(ax0, bx0 - 3); ay0 = Math.min(ay0, by0 - 3); ax1 = Math.max(ax1, bx1 + 3); ay1 = Math.max(ay1, by1 + 3);
  }
  // 흰색(눈 속 반짝임)은 같은 줄에서 양옆이 먹선으로 막힌 칸만 남긴다 (볼의 흰 반짝임 선 등은 버림)
  const inside = new Uint8Array(W * H);
  for (const [bx0, by0, bx1, by1] of boxes) {
    for (let y = by0; y <= by1; y++) {
      let lo = -1, hi = -1;
      for (let x = bx0; x <= bx1; x++) if (kept.has(label[y * W + x])) { if (lo < 0) lo = x; hi = x; }
      for (let x = lo; x >= 0 && x <= hi; x++) inside[y * W + x] = 1;
    }
  }
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
    // 볼 분홍만 (파랑이 초록만큼 높은 분홍). 시사 눈썹 같은 주황은 남긴다
    const blush = r > 200 && r - gg > 25 && r - b > 10 && b >= gg - 12 && !isInk(r, gg, b);
    const light = r + gg + b > 600 && on[i] !== 2;
    if (!mask[i] || blush || (light && !inside[i])) d[i * 4 + 3] = 0;
  }
  g.putImageData(src, 0, 0);
  ax0 = Math.max(0, ax0); ay0 = Math.max(0, ay0); ax1 = Math.min(W - 1, ax1); ay1 = Math.min(H - 1, ay1);
  const piece = document.createElement('canvas');
  piece.width = ax1 - ax0 + 1;
  piece.height = ay1 - ay0 + 1;
  piece.getContext('2d').drawImage(c, ax0, ay0, piece.width, piece.height, 0, 0, piece.width, piece.height);
  eyePieces[key] = { piece, x: x0 + ax0, y: y0 + ay0, w: piece.width, h: piece.height };
  return eyePieces[key];
}

// 원작 스캔에서 눈썹만 떠낸 조각 (2026-11-17 꾸미기 눈썹 교체). browStyle 'b:<표정 id>'
// 눈 조각과 같은 덩어리 나누기에서, 눈 위쪽(눈 윗변보다 위)에 있는 먹선·채움만 남긴다
const browPieces = {};
const bakedBrows = {};
function bakedBrow(id) {
  const B = typeof window !== 'undefined' && window.BROW_SCANS && window.BROW_SCANS[id];
  if (!B) return null;
  if (!bakedBrows[id]) {
    const im = new Image();
    bakedBrows[id] = { im, ready: false };
    im.onload = () => { bakedBrows[id].ready = true; scanWaiters.splice(0).forEach(fn => fn()); };
    im.src = B.src;
  }
  return bakedBrows[id].ready ? { piece: bakedBrows[id].im, x: B.x, y: B.y, w: B.w, h: B.h } : 'wait';
}
function scanBrowPiece(id) {
  const baked = bakedBrow(id);
  if (baked) return baked;
  if (browPieces[id] !== undefined) return browPieces[id];
  const im = scanImages[id];
  const meta = FACE_SCAN_META.faces.find(f => f.id === id);
  if (!im || !meta) return null;
  const px = FACE_FRAME.pxPerUnit;
  const eyes = meta.eyes && meta.eyes.length ? meta.eyes : [{ x: -0.33, t: FACE_FRAME.eyeT, r: 0.14 }, { x: 0.33, t: FACE_FRAME.eyeT, r: 0.14 }];
  // 눈 윗변: 눈 가운데에서 반지름만큼 위, 조금 더 여유
  const eyeTop = Math.min(...eyes.map(e => e.t - (e.r || 0.14))) - 0.01;
  const x0 = Math.round((FACE_FRAME.halfX - 0.7) * px);
  const x1 = Math.round((FACE_FRAME.halfX + 0.7) * px);
  const H = Math.round((eyeTop - FACE_FRAME.topT) * px);
  const W = x1 - x0;
  if (H < 10) { browPieces[id] = null; return null; }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(im, x0, 0, W, H, 0, 0, W, H);
  const src = g.getImageData(0, 0, W, H);
  const d = src.data;
  const on = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < 90) continue;
    if (r + gg + b < 360 || (r > 200 && gg > 120 && b < 150)) on[i] = 1;     // 먹선, 시사 눈썹 같은 주황 채움
  }
  const label = new Int32Array(W * H);
  const keep = new Set();
  const stack = [];
  let next = 1;
  for (let i = 0; i < W * H; i++) {
    if (!on[i] || label[i]) continue;
    const id2 = next++;
    let n = 0, sx = 0, maxY = 0;
    label[i] = id2;
    stack.push(i);
    while (stack.length) {
      const k = stack.pop();
      const x = k % W, y = (k / W) | 0;
      n++; sx += x; if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (on[j] && !label[j]) { label[j] = id2; stack.push(j); }
      }
    }
    const cx = (sx / n - W / 2) / px;
    // 눈 위 칸 아래끝에 닿은 덩어리는 눈의 일부, 가운데(가로 ±0.1)는 이마 무늬·땀
    if (n > 20 && maxY < H - 2 && Math.abs(cx) > 0.17) keep.add(id2);
  }
  if (!keep.size) { browPieces[id] = null; return null; }
  const mask = new Uint8Array(W * H);
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  for (let i = 0; i < W * H; i++) {
    if (!keep.has(label[i])) continue;
    const x = i % W, y = (i / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) mask[ny * W + nx] = 1;
    }
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  for (let i = 0; i < W * H; i++) if (!mask[i]) d[i * 4 + 3] = 0;
  g.putImageData(src, 0, 0);
  bx0 = Math.max(0, bx0 - 3); by0 = Math.max(0, by0 - 3); bx1 = Math.min(W - 1, bx1 + 3); by1 = Math.min(H - 1, by1 + 3);
  const piece = document.createElement('canvas');
  piece.width = bx1 - bx0 + 1;
  piece.height = by1 - by0 + 1;
  piece.getContext('2d').drawImage(c, bx0, by0, piece.width, piece.height, 0, 0, piece.width, piece.height);
  browPieces[id] = { piece, x: x0 + bx0, y: by0, w: piece.width, h: piece.height };
  return browPieces[id];
}

// 조각을 지우개로 쓸 때: 반투명 가장자리까지 남김없이 지우도록 조금이라도 칠해진 칸은 꽉 채우고 1px 넓힌다
const solidCache = new WeakMap();
function solidEraser(src, w, h) {
  if (solidCache.has(src)) return solidCache.get(src);
  const W = Math.round(w || src.width), H = Math.round(h || src.height);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const a = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = img.data[i * 4 + 3] > 6 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let on = 0;
    for (let dy = -1; dy <= 1 && !on; dy++) for (let dx = -1; dx <= 1 && !on; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && a[ny * W + nx]) on = 1;
    }
    const i = (y * W + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
    img.data[i + 3] = on ? 255 : 0;
  }
  g.putImageData(img, 0, 0);
  solidCache.set(src, c);
  return c;
}

// 꾸미기 얼굴 (2026-11-17): 표정 스캔을 통째로 쓰지 않고 빈 얼굴에 고정 볼 → 눈만 → 눈썹만 → 입만 차례로 얹는다.
// 감정마다(faceSet) 눈·눈썹·입을 따로 고르고, 안 고른 칸은 그 표정의 원작 조각을 쓴다
let bakedCheekImg = null;
// 꾸미기 아이 볼: 2026-11-17 이재헌님 지시로 원작 스캔의 제각각인 블러셔는 없애고(조각에도 없음),
// 예쁜 원작 볼 하나(시사 기본 표정의 볼, eye-scans.js CHEEK_SCAN)를 모든 표정에 기본으로 얹는다
const NO_CHEEKS = false;
function cleanCheek() {
  if (NO_CHEEKS) return { none: true };
  const B = typeof window !== 'undefined' && window.CHEEK_SCAN;
  if (!B) return { none: true };
  if (!bakedCheekImg) {
    bakedCheekImg = { im: new Image(), ready: false };
    bakedCheekImg.im.onload = () => { bakedCheekImg.ready = true; scanWaiters.splice(0).forEach(fn => fn()); };
    bakedCheekImg.im.src = B.src;
  }
  return bakedCheekImg.ready ? { piece: bakedCheekImg.im, x: B.x, y: B.y, w: B.w, h: B.h } : 'wait';
}
// 표정마다 다른 크기·높이 (2026-11-18 이재헌님): 감정 세트에 크기 값이 있으면 그 감정에서만 기본 값 대신 쓴다
const FACE_TUNE_KEYS = ['eyeSize', 'eyeY', 'eyeGap', 'browSize', 'browY', 'mouthSize', 'mouthY'];
function faceTune(p, pick) {
  const v = (k, pk, d) => (pick && typeof pick[k] === 'number' ? pick[k] : p[pk] === undefined ? d : p[pk]);
  return {
    eyeScale: v('eyeSize', 'eyeScale', 1), eyeY: v('eyeY', 'eyeY', 0), eyeGap: v('eyeGap', 'eyeGap', 0),
    browSize: v('browSize', 'browSize', 1), browY: v('browY', 'browY', 0), mouthSize: v('mouthSize', 'mouthSize', 1), mouthY: v('mouthY', 'mouthY', 0),
  };
}
function composeFace(expression, p) {
  const id = String(expression.id).replace(/_s$/, '');
  const emo = emotionOf(id);
  const pick = (p.faceSet && emo && p.faceSet[emo]) || {};
  const eyeId = pick.eye || id;
  const lookBrow = OLD_BROW[p.browStyle] || p.browStyle || 'scan';
  const browId = pick.brow ? (pick.brow === 'none' ? null : pick.brow) : lookBrow === 'none' ? null : lookBrow.startsWith('b:') ? lookBrow.slice(2) : id;
  const lookMouth = OLD_MOUTH[p.mouthStyle] || p.mouthStyle || 'scan';
  const mouthId = pick.mouth || (CALM_MOUTH.has(id) && lookMouth.startsWith('m:') ? lookMouth.slice(2) : id);
  const cheek = cleanCheek();
  const eye = scanEyePiece(eyeId, true);
  const brow = browId ? scanBrowPiece(browId) : null;
  const mouth = scanMouthPiece(mouthId);
  if ([cheek, eye, brow, mouth].includes('wait')) return 'wait';
  if (!cheek || !eye || !mouth) return null;      // 조각이 없으면 예전 방식으로
  const px = FACE_FRAME.pxPerUnit;
  // 눈썹·눈을 위로 올려도 잘리지 않게 그림판을 이마 위로 EXTRA만큼 넓힌다 (paintFace가 frameTopT를 보고 붙인다)
  const EXTRA = 0.28;
  const out = document.createElement('canvas');
  out.width = Math.round(FACE_FRAME.halfX * 2 * px);
  out.height = Math.round((FACE_FRAME.bottomT - FACE_FRAME.topT + EXTRA) * px);
  out.frameTopT = FACE_FRAME.topT - EXTRA;
  const g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.translate(0, Math.round(EXTRA * px));
  const mid = FACE_FRAME.halfX * px;
  const tn = faceTune(p, pick);
  const eyeScale = tn.eyeScale;
  const eyeShift = tn.eyeY * px, gap = tn.eyeGap * px;
  const browSize = tn.browSize, browShift = tn.browY * px;
  const mouthSize = tn.mouthSize, mouthShift = tn.mouthY * px;
  // 좌우 반쪽씩: 각 반쪽 가운데를 기준으로 키우고, 사이만큼 벌린다
  const halves = (pc, scale, dy) => {
    const w = pc.w || pc.piece.width, h = pc.h || pc.piece.height;
    const k = pc.piece.width / w;
    for (const side of [-1, 1]) {
      const sx0 = side < 0 ? pc.x : Math.max(pc.x, mid), sx1 = side < 0 ? Math.min(pc.x + w, mid) : pc.x + w;
      if (sx1 <= sx0) continue;
      const cx = (sx0 + sx1) / 2 + side * gap, cy = pc.y + h / 2 + dy;
      const dw = (sx1 - sx0) * scale, dh = h * scale;
      g.drawImage(pc.piece, (sx0 - pc.x) * k, 0, (sx1 - sx0) * k, pc.piece.height, cx - dw / 2, cy - dh / 2, dw, dh);
    }
  };
  if (!cheek.none) { if (cheek.w) g.drawImage(cheek.piece, cheek.x, cheek.y, cheek.w, cheek.h); else g.drawImage(cheek.piece, 0, 0); }
  halves(eye, eyeScale, eyeShift);
  if (brow) halves(brow, browSize, eyeShift + browShift);
  const mw = (mouth.w || mouth.piece.width) * mouthSize, mh = (mouth.h || mouth.piece.height) * mouthSize;
  g.drawImage(mouth.piece, mid - mw / 2, mouth.y + (mouth.h || mouth.piece.height) / 2 + mouthShift - mh / 2, mw, mh);
  return out;
}

// 볼(분홍과 빗금)만 떠낸 조각. 눈을 바꿀 때 원래 볼을 지우고 기본 표정의 깨끗한 볼을 다시 얹는다
// (원래 표정의 눈물·눈을 지우면 그 밑의 볼 분홍도 같이 빠져 자국이 남기 때문)
const cheekPieces = {};
function scanCheekPiece(id) {
  if (cheekPieces[id] !== undefined) return cheekPieces[id];
  const im = scanImages[id];
  if (!im) return null;
  const px = FACE_FRAME.pxPerUnit;
  const W = im.width, H = Math.round((1.25 - FACE_FRAME.topT) * px);
  const y0 = Math.round((0.8 - FACE_FRAME.topT) * px);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, W, H, 0, 0, W, H);
  const src = g.getImageData(0, 0, W, H);
  const d = src.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const ux = Math.abs(x / px - FACE_FRAME.halfX);
    const pink = r > 140 && r - gg > 25 && r >= b && b < 235;
    const hatch = r + gg + b < 360 && ux > 0.47 && y / px + FACE_FRAME.topT > 0.88;   // 볼 위의 먹선 빗금
    // 볼 칸: 얼굴 옆(가로 0.4 이상), 눈 아래 높이
    if (y < y0 || ux < 0.4 || !(pink || hatch)) d[i + 3] = 0;
  }
  g.putImageData(src, 0, 0);
  cheekPieces[id] = c;
  return c;
}

// 샘플 눈썹도 표정을 따라 기운다: 양수는 안쪽이 올라간 슬픈 눈썹, 음수는 치켜뜬 눈썹
const BROW_TILT = { cry: 0.05, wail: 0.06, worried: 0.05, flustered: 0.03, panic: 0.05, brave: -0.05, nope: -0.04 };

// 감정 표정 세트 (2026-11-17): 게임 표정 → 감정 칸. 꾸미기에서 감정마다 고른 원작 눈·입으로 바꿔 그린다
const EMOTION_OF_EXPR = {
  normal: 'normal', smile: 'normal', worried: 'normal',
  joy: 'joy', excited: 'joy',
  cry: 'cry', wail: 'cry',
  panic: 'surprise', flustered: 'surprise',
  nope: 'angry', brave: 'angry',
  sleep: 'sleep', 'sleep-alt': 'sleep',
};
const emotionOf = id => EMOTION_OF_EXPR[String(id).replace(/_s$/, '')] || null;
function faceSetPick(p, expression) {
  const emo = p.faceSet && emotionOf(expression.id);
  return emo ? p.faceSet[emo] || null : null;
}

function adjustedScan(scan, expression, p) {
  const pick = faceSetPick(p, expression);
  const eyePick = pick && pick.eye && pick.eye !== expression.id ? pick.eye : null;
  const tn = faceTune(p, pick);
  const eyeScale = tn.eyeScale;
  const eyeShift = tn.eyeY;
  const gap = tn.eyeGap;
  // 눈썹: 감정 세트에서 고른 원작 눈썹('b:<표정 id>' / 'none') > 꾸미기 눈썹 > 표정 그대로
  const browStyle = pick && pick.brow ? (pick.brow === 'none' ? 'none' : 'b:' + pick.brow) : OLD_BROW[p.browStyle] || p.browStyle || 'scan';
  const browShift = tn.browY;
  const browSize = tn.browSize;
  const mouthStyle = pick && pick.mouth ? 'm:' + pick.mouth : CALM_MOUTH.has(expression.id) ? OLD_MOUTH[p.mouthStyle] || p.mouthStyle || 'scan' : 'scan';
  const mouthShift = tn.mouthY;
  const mouthSize = tn.mouthSize;
  // 눈을 통째로 바꿀 때는 눈 조정(크기·높이)을 바꾼 눈 조각에 준다
  const eyesMoved = !eyePick && (eyeScale !== 1 || eyeShift || gap);
  const browsMoved = !eyePick && (browStyle !== 'scan' || browShift || browSize !== 1 || eyeShift || gap);
  const mouthMoved = mouthStyle !== 'scan' || mouthShift || mouthSize !== 1;
  if (!eyePick && !eyesMoved && !browsMoved && !mouthMoved) return scan;

  const px = FACE_FRAME.pxPerUnit;
  const toX = x => (x + FACE_FRAME.halfX) * px;
  const toY = t => (t - FACE_FRAME.topT) * px;
  const out = document.createElement('canvas');
  out.width = scan.width;
  out.height = scan.height;
  const g = out.getContext('2d');
  g.drawImage(scan, 0, 0);
  g.imageSmoothingQuality = 'high';

  const spots = eyeSpots(expression);
  // 눈 위쪽 띠가 눈썹이다
  const browLimit = FACE_FRAME.eyeT - Math.max(...spots.map(e => e.r || 0.14)) - 0.03;
  const cutPiece = (x0, t0, x1, t1, clip) => {
    const piece = document.createElement('canvas');
    piece.width = Math.max(1, Math.ceil((x1 - x0) * px));
    piece.height = Math.max(1, Math.ceil((t1 - t0) * px));
    const pg = piece.getContext('2d');
    if (clip) {
      clip(pg, piece.width, piece.height);
      pg.clip();
    }
    pg.drawImage(scan, toX(x0), toY(t0), piece.width, piece.height, 0, 0, piece.width, piece.height);
    return piece;
  };
  const erase = shape => {
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    shape();
    g.fill();
    g.globalCompositeOperation = 'source-over';
  };
  // 그려 넣을 조각을 모두 원본에서 먼저 잘라 둔 뒤, 지우고 다시 얹는다
  const draws = [];


  // 원작 눈썹 조각을 원래 자리에(높이·크기 조정을 더해) 그린다
  const drawBrow = shift => {
    if (!browStyle.startsWith('b:')) return;
    const bp = scanBrowPiece(browStyle.slice(2));
    if (!bp || bp === 'wait') return;
    const w = bp.w * browSize, h = bp.h * browSize;
    const cx = bp.x + bp.w / 2, cy = bp.y + bp.h / 2 + (shift + browShift) * px;
    g.drawImage(bp.piece, cx - w / 2, cy - h / 2, w, h);
  };

  if (eyePick) {
    // 원래 눈(눈썹 포함)만 지우고(볼은 남김) 고른 원작 눈을 그 자리에 얹는다
    const own = scanEyePiece(expression.id);
    const pickEye = scanEyePiece(eyePick);
    if (own && own !== 'wait' && pickEye && pickEye !== 'wait') {
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(solidEraser(own.piece, own.w, own.h), own.x, own.y, own.w, own.h);
      g.globalCompositeOperation = 'source-over';
      draws.push(() => {
        const w = pickEye.w * eyeScale, h = pickEye.h * eyeScale;
        const cx = pickEye.x + pickEye.w / 2;
        const cy = pickEye.y + pickEye.h / 2 + eyeShift * px;
        g.drawImage(pickEye.piece, cx - w / 2, cy - h / 2, w, h);
        // 눈썹을 따로 골랐으면 고른 눈에 딸린 눈썹을 지우고 바꿔 단다
        if (browStyle !== 'scan') {
          const ownBrow = scanBrowPiece(eyePick);
          if (ownBrow && ownBrow !== 'wait') {
            g.globalCompositeOperation = 'destination-out';
            g.drawImage(solidEraser(ownBrow.piece, ownBrow.w, ownBrow.h), ownBrow.x, ownBrow.y + eyeShift * px, ownBrow.w, ownBrow.h);
            g.globalCompositeOperation = 'source-over';
          }
          drawBrow(eyeShift);
        }
      });
    }
  }

  if (browsMoved) {
    const bandTop = FACE_FRAME.topT;
    if (browStyle.startsWith('b:')) {
      draws.push(() => drawBrow(eyeShift));
    } else if (browStyle === 'scan') {
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -FACE_FRAME.halfX : 0;
        const x1 = side < 0 ? 0 : FACE_FRAME.halfX;
        const piece = cutPiece(x0, bandTop, x1, browLimit);
        const cx = side * 0.33;
        const cy = (bandTop + browLimit) / 2 + 0.05;
        draws.push(() => {
          const scale = browSize;
          const dx = toX(cx + side * gap) + (toX(x0) - toX(cx)) * scale;
          const dy = toY(cy + eyeShift + browShift) + (toY(bandTop) - toY(cy)) * scale;
          g.drawImage(piece, dx, dy, piece.width * scale, piece.height * scale);
        });
      }
    }
    erase(() => g.rect(0, 0, out.width, toY(browLimit)));
  }

  if (eyesMoved) {
    const patches = spots.map(eye => {
      // 볼을 건드리지 않도록 눈에 딱 맞는 타원으로 도려낸다
      const r = eye.r || 0.14;
      const rx = Math.min(Math.abs(eye.x) - 0.02, r + 0.05);
      const ry = eye.t - browLimit;
      const piece = cutPiece(eye.x - rx, eye.t - ry, eye.x + rx, eye.t + ry, (pg, w, h) => pg.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2));
      return { eye, rx, ry, piece };
    });
    for (const { eye, rx, ry } of patches) erase(() => g.ellipse(toX(eye.x), toY(eye.t), rx * px, ry * px, 0, 0, Math.PI * 2));
    for (const { eye, rx, ry, piece } of patches) {
      draws.push(() => {
        const cx = toX(eye.x + Math.sign(eye.x) * gap);
        const cy = toY(eye.t + eyeShift);
        g.drawImage(piece, cx - rx * px * eyeScale, cy - ry * px * eyeScale, piece.width * eyeScale, piece.height * eyeScale);
      });
    }
  }

  if (mouthMoved) {
    const [mt, rx, ry] = MOUTH_SPOTS[expression.id] || MOUTH_SPOTS.normal;
    const mp = mouthStyle.startsWith('m:') ? scanMouthPiece(mouthStyle.slice(2)) : null;
    if (mp && mp !== 'wait') {
      draws.push(() => {
        const w = mp.piece.width * mouthSize, h = mp.piece.height * mouthSize;
        const cy = mp.y + mp.piece.height / 2 + mouthShift * px;
        g.drawImage(mp.piece, toX(0) - w / 2, cy - h / 2, w, h);
      });
    } else {
      const piece = cutPiece(-rx, mt - ry, rx, Math.min(FACE_FRAME.bottomT, mt + ry), (pg, w, h) => pg.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2));
      draws.push(() => {
        const cx = toX(0);
        const cy = toY(mt + mouthShift);
        g.drawImage(piece, cx - rx * px * mouthSize, cy - ry * px * mouthSize, piece.width * mouthSize, piece.height * mouthSize);
      });
    }
    erase(() => g.ellipse(toX(0), toY(mt), rx * px, ry * px, 0, 0, Math.PI * 2));
  }

  for (const draw of draws) draw();
  return out;
}

// 스캔은 정면 그림이므로 머리 곡면에 감았을 때 정면에서 원본과 같아 보이도록 열 단위로 펴서 그린다
function paintFace(canvas, p, expression, blink) {
  const g = canvas.getContext('2d');
  g.fillStyle = p.skinColor;
  g.fillRect(0, 0, canvas.width, canvas.height);

  const pxX = canvas.width / FACE_SPAN_X;
  const pxY = canvas.height / FACE_SPAN_T;
  // 이목구비 없는 얼굴 (심즈 엑스트라): 피부색만 칠한다
  if (p.monsterFace) {
    // 괴물: 치켜뜬 두 눈과 들쭉날쭉한 입
    const cx = canvas.width / 2;
    const at = (x, t) => [cx + x * pxX, t * pxY];
    for (const s of [-1, 1]) {
      g.fillStyle = '#fff4c2';
      g.beginPath();
      g.ellipse(...at(s * 0.32, 0.7), 0.15 * pxX, 0.11 * pxY, s * 0.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3a2433';
      g.beginPath();
      g.arc(...at(s * 0.3, 0.71), 0.06 * pxX, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#3a2433';
    g.beginPath();
    g.moveTo(...at(-0.46, 0.94));
    for (let i = 0; i <= 8; i++) g.lineTo(...at(-0.46 + i * 0.115, i % 2 ? 1.06 : 0.94));
    g.lineTo(...at(0.46, 1.16));
    for (let i = 8; i >= 0; i--) g.lineTo(...at(-0.46 + i * 0.115, i % 2 ? 1.16 : 1.26));
    g.closePath();
    g.fill();
    return true;
  }
  if (p.faceless) {
    if (p.scar) {
      // 이마의 흉터: 비스듬한 칼자국과 꿰맨 자국
      const cx = canvas.width / 2;
      const at = (x, t) => [cx + x * pxX, t * pxY];
      g.strokeStyle = '#4e3f3a';
      g.lineCap = 'round';
      g.lineWidth = Math.max(2, 0.05 * pxX);
      g.beginPath();
      g.moveTo(...at(-0.3, 0.2));
      g.lineTo(...at(0.26, 0.62));
      g.stroke();
      g.lineWidth = Math.max(1.5, 0.032 * pxX);
      for (const u of [0.22, 0.5, 0.78]) {
        const x = -0.3 + 0.56 * u;
        const t = 0.2 + 0.42 * u;
        g.beginPath();
        g.moveTo(...at(x + 0.07, t - 0.1));
        g.lineTo(...at(x - 0.07, t + 0.1));
        g.stroke();
      }
    }
    return true;
  }
  // 유저가 고른 얼굴 무늬 (look-kit.js). 머리색이 그 위를 덮는다
  if (p.faceMark && typeof paintLookMarks === 'function') paintLookMarks(g, p, pxX, pxY);
  if (p.hairColor) paintHair(g, p, pxX, pxY);
  if (p.rabbit) paintBrowArcs(g, p, pxX, pxY);
  if (p.faceOval) {
    paintFaceOval(g, p, expression, pxX, pxY);
    return true;
  }

  // 꾸미기 아이는 조각을 섞어 그린다 (조각이 다 읽히면 원본 스캔이 없어도 그린다)
  let composed = null;
  if (p.style === 'custom') {
    composed = composeFace(expression, p);
    if (composed === 'wait') return false;
  }
  // 꾸미기 아이는 정리판이 읽힐 때까지 기다린다 (원본의 분홍 볼이 잠깐 비치지 않게)
  if (!composed && p.style === 'custom' && typeof CUSTOM_FACE_IMAGES !== 'undefined' && CUSTOM_FACE_IMAGES[expression.id] && !customScanImages[expression.id]) return false;
  if (!composed && !baseScanFor(p, expression.id)) return false;
  // 고른 원작 입 조각이 아직 읽히는 중이면 다 읽힌 뒤 다시 그린다
  const setPick = faceSetPick(p, expression);
  const wantMouth = setPick && setPick.mouth ? 'm:' + setPick.mouth : CALM_MOUTH.has(expression.id) ? OLD_MOUTH[p.mouthStyle] || p.mouthStyle : null;
  if (wantMouth && wantMouth.startsWith('m:') && scanMouthPiece(wantMouth.slice(2)) === 'wait') return false;
  if (setPick && setPick.eye && scanEyePiece(setPick.eye) === 'wait') return false;
  const wantBrow = setPick && setPick.brow && setPick.brow !== 'none' ? setPick.brow : (OLD_BROW[p.browStyle] || p.browStyle || '').startsWith('b:') ? (OLD_BROW[p.browStyle] || p.browStyle).slice(2) : null;
  if (wantBrow && scanBrowPiece(wantBrow) === 'wait') return false;
  const scan = composed || adjustedScan(baseScanFor(p, expression.id), expression, p);

  const px = FACE_FRAME.pxPerUnit;
  const eyeT = FACE_FRAME.eyeT + p.faceT;
  const toDestT = t => eyeT + (t - FACE_FRAME.eyeT) * p.faceScale;
  const surface = 0.98 * p.headW;
  const frameXAt = dx => {
    const arc = (dx - canvas.width / 2) / pxX;
    return (surface * Math.sin(Math.max(-1.5, Math.min(1.5, arc / 0.95)))) / p.faceScale;
  };

  const scanTopT = scan.frameTopT === undefined ? FACE_FRAME.topT : scan.frameTopT;   // 꾸미기 얼굴은 이마 위까지 넓힌 그림판
  const destY = toDestT(scanTopT) * pxY;
  const destH = (FACE_FRAME.bottomT - scanTopT) * p.faceScale * pxY;
  g.imageSmoothingQuality = 'high';
  for (let dx = 0; dx < canvas.width; dx++) {
    const from = frameXAt(dx);
    const to = frameXAt(dx + 1);
    if (from < -FACE_FRAME.halfX || to > FACE_FRAME.halfX) continue;
    g.drawImage(scan, (from + FACE_FRAME.halfX) * px, 0, (to - from) * px, scan.height, dx, destY, 1, destH);
  }

  if (blink) {
    // 눈 자리를 피부색으로 덮고 감은 눈을 그린다
    g.save();
    g.scale(pxX, pxY);
    g.translate(FACE_SPAN_X / 2, 0);
    g.lineCap = 'round';
    const bt = faceTune(p, faceSetPick(p, expression));
    for (const eye of expression.eyes) {
      const eyeX = eye.x + Math.sign(eye.x) * bt.eyeGap;
      const arc = 0.95 * Math.asin(Math.max(-1, Math.min(1, (eyeX * p.faceScale) / surface)));
      const t = toDestT(eye.t + bt.eyeY);
      const r = eye.r * 1.2 * p.faceScale * bt.eyeScale;
      g.fillStyle = p.skinColor;
      g.beginPath();
      g.ellipse(arc, t, r, r, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = p.inkColor;
      g.lineWidth = 0.034;
      g.beginPath();
      g.moveTo(arc - r * 0.75, t + 0.01);
      g.quadraticCurveTo(arc, t - 0.055, arc + r * 0.75, t + 0.01);
      g.stroke();
    }
    g.restore();
  }
  return true;
}

function makeFaceTexture(p, expression, blink, width) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = width / 2;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (!paintFace(c, p, expression, blink)) {
    // 이미지가 아직 안 읽혔으면 읽히는 대로 다시 그린다
    const retry = () => {
      if (paintFace(c, p, expression, blink)) tex.needsUpdate = true;
      else scanWaiters.push(retry);
    };
    scanWaiters.push(retry);
  }
  return tex;
}

// 머리는 달걀형: 눈 위쪽(headTop)과 아래쪽(headLow)의 세로 반지름이 다르다
function makeHeadGeometry(p) {
  const points = [];
  for (let i = 72; i >= 0; i--) {
    const a = (i / 72) * Math.PI;
    const ry = a < Math.PI / 2 ? p.headTop : p.headLow;
    const t = p.headTop - ry * Math.cos(a);
    points.push(new THREE.Vector2(Math.max(0, Math.sin(a) * p.headW), p.footT - t));
  }
  const segments = 96;
  // 이음매가 등 뒤로 가도록 -π에서 시작한다
  const geo = new THREE.LatheGeometry(points, segments, -Math.PI);

  // 얼굴이 옆으로도 감겨 돌도록 원통 좌표로 UV를 잡는다
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const phi = -Math.PI + (Math.floor(i / points.length) / segments) * Math.PI * 2;
    const t = p.footT - pos.getY(i);
    uv.setXY(i, 0.5 + (phi * 0.95) / FACE_SPAN_X, 1 - t / FACE_SPAN_T);
  }
  geo.scale(1, 1, p.depth);
  return geo;
}

// 랏코의 검 (2026-11-11, 이재헌님이 준 원작 장면 3컷 대조)
//  - 칼집: 갈색 가죽, 넓고 납작하며 끝은 비스듬히 잘렸다. 쇠 장식 없음
//  - 날밑: 끝이 둥근 긴 흰 막대 / 칼자루: 흰 바탕에 나란한 사선 감개 / 칼자루 끝: 흰 네모 마개
//  - 칼자루 옆면에 둥근 "얼굴 마크" (점선 테두리, 별 흉터, 점 눈, ω 입) — 토벌 랭커만 무기에 넣는 표시
//  - 칼날: 넓은 회색 날, 가운데가 솟은 마름모 단면, 끝은 뾰족
// 축 +Y = 날 끝 방향, 원점 = 날밑 가운데. make(parent, geo, color, [x,y,z]) → 외곽선 두른 메시 (부르는 쪽 방식)
// 크기 단위 u = 칼자루 반지름. 돌려주는 값: { group, gripLen }
function buildRakkoSword(make, { sheathed = true, u = 0.065, ink = '#3a3227' } = {}) {
  const g = new THREE.Group();
  const WHITE = '#f8f5ee', LEATHER = '#8b6a55', STEEL = '#c9cdd1', STEEL_D = '#a4aab0';
  const inkMat = new THREE.MeshBasicMaterial({ color: ink });
  const rounded = (w, h, r) => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2 + r, -h / 2);
    sh.lineTo(w / 2 - r, -h / 2);
    sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    sh.lineTo(w / 2, h / 2 - r);
    sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    sh.lineTo(-w / 2 + r, h / 2);
    sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    sh.lineTo(-w / 2, -h / 2 + r);
    sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return sh;
  };
  const slab = (shape, depth, bevel) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  };
  // 날밑: 끝이 둥근 긴 흰 막대
  make(g, slab(rounded(u * 7.6, u * 1.25, u * 0.6), u * 1.3, u * 0.12), WHITE, [0, 0, 0]);
  // 칼자루: 흰 원통 + 나란한 사선 감개(연회색 띠)
  const gripLen = u * 5.2;
  const gy = -u * 0.62 - gripLen / 2;
  make(g, new THREE.CylinderGeometry(u, u * 1.04, gripLen, 18), WHITE, [0, gy, 0]);
  const wrapMat = new THREE.MeshBasicMaterial({ color: '#b8b0a3' });
  for (let k = 0; k < 2; k++) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const a = (t * 2.6 + k * 0.5) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * u * 1.03, -u * 0.62 - t * gripLen, Math.sin(a) * u * 1.03));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, u * 0.09, 4), wrapMat));
  }
  // 얼굴 마크: 칼자루 옆면에 휘어 붙인 둥근 그림 (양쪽)
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x2 = c.getContext('2d');
  x2.fillStyle = '#fbf8f1'; x2.beginPath(); x2.arc(128, 128, 118, 0, Math.PI * 2); x2.fill();
  x2.fillStyle = '#5a534d';
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; x2.beginPath(); x2.arc(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108, 5, 0, Math.PI * 2); x2.fill(); }
  x2.strokeStyle = '#3d3833'; x2.lineWidth = 8;
  x2.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 10 : 30; x2.lineTo(78 + Math.cos(a) * r, 112 + Math.sin(a) * r); }
  x2.closePath(); x2.stroke();
  for (const ex of [126, 168]) { x2.beginPath(); x2.ellipse(ex, 116, 13, 15, 0, 0, Math.PI * 2); x2.stroke(); x2.fillStyle = '#3d3833'; x2.beginPath(); x2.arc(ex, 118, 7, 0, Math.PI * 2); x2.fill(); }
  x2.beginPath(); x2.moveTo(136, 150); x2.quadraticCurveTo(142, 160, 148, 150); x2.quadraticCurveTo(154, 160, 160, 150); x2.stroke();
  const markTex = new THREE.CanvasTexture(c);
  // 앞뒤(±z: 등에 멨을 때 바깥과 몸 쪽)를 향하게. 원통 각도 θ에서 x = sinθ, z = cosθ
  for (const center of [0, Math.PI]) {
    const patch = new THREE.CylinderGeometry(u * 1.05, u * 1.05, u * 2.4, 16, 1, true, center - Math.PI / 2.6, Math.PI / 1.3);
    const m = new THREE.Mesh(patch, new THREE.MeshBasicMaterial({ map: markTex, transparent: true }));
    m.position.y = gy + u * 0.4;
    g.add(m);
  }
  // 칼자루 끝: 흰 네모 마개
  make(g, slab(rounded(u * 2.6, u * 1.2, u * 0.25), u * 2.1, u * 0.1), WHITE, [0, gy - gripLen / 2 - u * 0.62, 0]);
  if (sheathed) {
    // 칼집: 넓고 납작한 갈색 가죽, 끝은 한쪽으로 비스듬히 잘린다. 가죽결 빗금 몇 개
    const L = u * 15;
    const w = u * 3.8;
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0);
    sh.lineTo(w / 2, 0);
    sh.lineTo(w / 2 * 0.92, L - u * 0.4);
    sh.lineTo(w * 0.05, L);
    sh.lineTo(-w / 2 * 0.92, L - u * 2.4);
    sh.closePath();
    make(g, slab(sh, u * 0.9, u * 0.22), LEATHER, [0, u * 0.62, 0]);
    for (const [fy, fx] of [[0.32, -0.18], [0.36, -0.08], [0.62, 0.15], [0.66, 0.25]]) {
      const tick = new THREE.Mesh(new THREE.CapsuleGeometry(u * 0.07, u * 0.55, 2, 4), inkMat);
      tick.position.set(fx * w, u * 0.62 + fy * L, -u * 0.72);
      tick.rotation.z = 0.5;
      g.add(tick);
      const t2 = tick.clone(); t2.position.z = u * 0.72; g.add(t2);
    }
  } else {
    // 칼날: 넓은 마름모 단면 (가운데 등줄이 솟고 양날로 얇아진다), 끝은 뾰족
    const L = u * 16;
    const half = u * 1.7;
    const ridge = u * 0.42;
    const rows = [[0, half], [0.82, half * 0.88], [1, 0]];
    const pos = [];
    const face = (a, b, c2) => pos.push(...a, ...b, ...c2);
    for (let i = 0; i + 1 < rows.length; i++) {
      const [f0, h0] = rows[i], [f1, h1] = rows[i + 1];
      const y0 = u * 0.62 + f0 * L, y1 = u * 0.62 + f1 * L;
      const r0 = h0 > 0 ? ridge : 0, r1 = h1 > 0 ? ridge : 0;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const E0 = [sx * h0, y0, 0], E1 = [sx * h1, y1, 0], R0 = [0, y0, sz * r0], R1 = [0, y1, sz * r1];
        if (sx * sz > 0) { face(E0, E1, R1); face(E0, R1, R0); } else { face(E0, R1, E1); face(E0, R0, R1); }
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bg.computeVertexNormals();
    make(g, bg, STEEL, [0, 0, 0]).material.side = THREE.DoubleSide;
    // 등줄: 날 가운데 짙은 선 (앞뒤)
    for (const sz of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(u * 0.06, u * 0.06, L * 0.9, 5), new THREE.MeshBasicMaterial({ color: STEEL_D }));
      line.position.set(0, u * 0.62 + L * 0.45, sz * ridge * 0.98);
      g.add(line);
    }
  }
  return { group: g, gripLen };
}

// 여러 지오메트리를 한 덩어리로 (그리기 횟수를 줄인다). 위치·인덱스만 합친다
// 고양이 꼬리 (하치와레): 휜 곡선을 따라 굵기가 줄어드는 원 단면을 쓸어 만든 쉼표 모양. curl은 끝이 말리는 쪽 (+x / -x)
function curledTailGeo(R, L, curl) {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -R * 0.6, 0), new THREE.Vector3(0, L * 0.75, 0), new THREE.Vector3(curl * L * 0.55, L * 0.92, 0));
  const NS = 28, NR = 16, pos = [], idx = [];
  const frames = curve.computeFrenetFrames(NS, false);
  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const c = curve.getPointAt(s);
    // 밑동은 몸에 묻히고, 가운데가 가장 굵고, 끝은 둥글게 닫힌다
    const r = R * (1.12 - 0.22 * s) * (s > 0.72 ? Math.sqrt(Math.max(0, 1 - ((s - 0.72) / 0.28) ** 2)) : 1) * (s < 0.14 ? Math.sqrt(Math.max(0.0, 1 - ((0.14 - s) / 0.14) ** 2)) : 1);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j < NR; j++) {
      const a = (j / NR) * Math.PI * 2;
      pos.push(c.x + r * (Math.cos(a) * n.x + Math.sin(a) * b.x), c.y + r * (Math.cos(a) * n.y + Math.sin(a) * b.y), c.z + r * (Math.cos(a) * n.z + Math.sin(a) * b.z));
    }
  }
  const start = pos.length / 3, c0 = curve.getPointAt(0);
  pos.push(c0.x, c0.y - R * 0.2, c0.z);
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) {
    const a = i * NR + j, b2 = i * NR + ((j + 1) % NR), c = a + NR, d = b2 + NR;
    idx.push(a, b2, c, b2, d, c);
  }
  for (let j = 0; j < NR; j++) idx.push(start, j, (j + 1) % NR);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function mergeGeos(geos) {
  const pos = [];
  const idx = [];
  let base = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

function ellipseRadius(t, centerT, ry, rx) {
  const d = (t - centerT) / ry;
  return Math.abs(d) < 1 ? rx * Math.sqrt(1 - d * d) : 0;
}

function buildCharacter(p, { faceWidth = 2048 } = {}) {
  const inkMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { color: { value: new THREE.Color(p.inkColor) }, thickness: { value: p.outline }, lift: { value: 0 } },
    // 법선 방향으로 부풀린 뒷면으로 일정한 굵기의 외곽선을 그린다
    vertexShader: `
      uniform float thickness;
      uniform float lift;
      void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += n * thickness;
        mv.z += lift;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const skinMat = new THREE.MeshBasicMaterial({ color: p.skinColor });
  const lineMat = new THREE.MeshBasicMaterial({ color: p.inkColor });
  const hairMat = new THREE.MeshBasicMaterial({ color: p.hairColor || p.skinColor });
  const extraMats = [];
  // 표정 텍스처는 처음 쓸 때 만들어 재사용한다
  const faceTextures = {};
  const facesFor = id => {
    if (!faceTextures[id]) {
      const expression = EXPRESSIONS.find(e => e.id === id) || EXPRESSIONS[0];
      const blink = expression.eyes.length ? makeFaceTexture(p, expression, true, faceWidth) : null;
      faceTextures[id] = {
        open: makeFaceTexture(p, expression, false, faceWidth),
        // 눈이 이미 감겨 있는 표정은 깜빡이지 않는다
        blink,
        // 잘 때 얼굴. 눈 자리 기록이 없는 표정은 같은 주인의 다른 표정에서 눈 자리를 빌려 감은 눈을 그린다
        // (새 얼굴을 만들지 않는다. 빌릴 표정이 없으면 null → 평소 얼굴 그대로)
        sleep: blink || sleepFaceFor(expression),
      };
    }
    return faceTextures[id];
  };
  function sleepFaceFor(expression) {
    const donors = EXPRESSIONS.filter(e => e.owner === expression.owner && e.eyes.length);
    if (!donors.length) return null;
    // 눈이 가장 큰 표정의 눈 자리를 빌린다 (크게 덮어야 뜬 눈이 남지 않는다)
    const donor = donors.reduce((a, b) => (Math.max(...b.eyes.map(e => e.r)) > Math.max(...a.eyes.map(e => e.r)) ? b : a));
    return makeFaceTexture(p, { ...expression, eyes: donor.eyes }, true, faceWidth);
  }
  let expressionId = p.expression;
  const faceMat = new THREE.MeshBasicMaterial({ map: facesFor(expressionId).open });

  const limbMat = p.limbColor ? new THREE.MeshBasicMaterial({ color: p.limbColor }) : skinMat;
  const bodyMat = p.bodyColor ? new THREE.MeshBasicMaterial({ color: p.bodyColor }) : skinMat;
  if (p.limbColor) extraMats.push(limbMat);
  if (p.bodyColor) extraMats.push(bodyMat);

  const part = (geo, parent, pos, material = skinMat) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.position.set(...pos);
    mesh.add(new THREE.Mesh(geo, inkMat));
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();     // 위치 + 바라보는 방향
  const puppet = new THREE.Group();   // 통통 튀는 움직임
  const model = new THREE.Group();
  model.scale.setScalar(p.scale);
  puppet.add(model);
  root.add(puppet);

  part(makeHeadGeometry(p), model, [0, 0, 0], faceMat);

  const bodyGeo = new THREE.SphereGeometry(1, 40, 28);
  bodyGeo.scale(p.bodyW, p.bodyH, p.bodyW * p.depth);
  part(bodyGeo, model, [0, p.footT - p.bodyT, 0], bodyMat);

  // 머리 윤곽선이 옆구리에서 안쪽으로 꺾여 들어오는 짧은 선. 위치는 머리와 몸이 만나는 곳을 찾아 정한다
  const headRadius = t => ellipseRadius(t, p.headTop, p.headLow, p.headW);
  const bodyRadius = t => ellipseRadius(t, p.bodyT, p.bodyH, p.bodyW);
  let neckT = p.headTop;
  for (let t = p.headTop; t < p.headTop + p.headLow; t += 0.005) {
    if (bodyRadius(t) >= headRadius(t) && bodyRadius(t) > 0) {
      neckT = t;
      break;
    }
  }
  if (p.neckArc > 0 && neckT > p.headTop) {
    const neckGeo = new THREE.TorusGeometry(headRadius(neckT), (p.outline / p.scale) * 0.5, 8, 24, p.neckArc);
    neckGeo.rotateZ(-p.neckArc / 2);
    neckGeo.rotateX(Math.PI / 2);
    neckGeo.scale(1, 1, p.depth);
    for (const side of [0, Math.PI]) {
      const neckLine = new THREE.Mesh(neckGeo, lineMat);
      neckLine.position.y = p.footT - neckT;
      neckLine.rotation.y = side;
      model.add(neckLine);
    }
  }

  // 귀: 밑부분이 머리에 묻혀 밑선 없이 이어진다
  const earKind = p.ears || (p.hairColor ? 'cat' : p.rabbit ? 'rabbit' : 'round');
  if (earKind === 'cat') {
    // 고양이 귀: 끝이 살짝 둥근 삼각뿔. 밑동을 머리에 묻는다
    const w = p.catEarW;
    const h = p.catEarH;
    const earCurve = new THREE.SplineCurve([
      [0, -0.14], [w * 0.98, -0.14], [w, -0.02], [w * 0.68, h * 0.42], [w * 0.28, h * 0.84], [w * 0.1, h * 0.98], [0, h],
    ].map(([x, y]) => new THREE.Vector2(x, y)));
    const catEarGeo = new THREE.LatheGeometry(earCurve.getPoints(40).map(v => new THREE.Vector2(Math.max(0, v.x), v.y)), 28);
    catEarGeo.scale(1, 1, 0.68);
    for (const side of [-1, 1]) {
      const ear = part(catEarGeo, model, [side * p.catEarX, p.footT - p.catEarT, 0], hairMat);
      ear.rotation.z = -side * p.catEarTilt;
    }
  } else if (earKind === 'rabbit') {
    // 토끼 귀: 머리 위쪽 가운데에서 나란히 솟은 긴 타원. 앞면에 분홍 안쪽을 덧붙인다
    const earGeo = new THREE.SphereGeometry(1, 24, 18);
    earGeo.scale(p.rabEarW, p.rabEarH / 2, p.rabEarW * 0.55);
    const innerGeo = new THREE.SphereGeometry(1, 20, 14);
    innerGeo.scale(p.rabEarW * 0.55, (p.rabEarH / 2) * 0.72, p.rabEarW * 0.42);
    const innerMat = new THREE.MeshBasicMaterial({ color: p.rabEarInner });
    extraMats.push(innerMat);
    for (const side of [-1, 1]) {
      const ear = part(earGeo, model, [side * p.rabEarGap, p.footT - p.rabEarT + p.rabEarH * 0.4, -0.02]);
      ear.rotation.z = -side * p.rabEarTilt;
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(0, p.rabEarH * 0.03, p.rabEarW * 0.2);
      ear.add(inner);
    }
  } else if (earKind === 'round') {
    const earGeo = new THREE.SphereGeometry(p.earSize, 20, 16);
    earGeo.scale(1, p.earTall, 0.75);
    part(earGeo, model, [-p.earX, p.footT - p.earT, 0]);
    part(earGeo, model, [p.earX, p.footT - p.earT, 0]);
  }

  // 꼬리: 엉덩이 뒤쪽 표면에서 바깥 위로 뻗는다
  // 몸에 붙어 있어도 윤곽선이 가려지지 않게 외곽선만 카메라 쪽으로 띄우고, 그 위에 본체를 다시 그린다
  const liftOutline = mesh => {
    const ink = inkMat.clone();
    ink.uniforms.lift.value = 0.2;
    ink.uniforms.thickness.value = p.outline * 0.7;
    ink.depthWrite = false;
    extraMats.push(ink);
    mesh.children[0].material = ink;
    mesh.children[0].renderOrder = 1;
    mesh.renderOrder = 2;
  };

  let tail = null;
  if (earKind === 'cat') {
    const ring = bodyRadius(p.tailT);
    const angle = p.tailAngle;
    tail = new THREE.Group();
    tail.position.set(ring * Math.sin(angle) * 0.92, p.footT - p.tailT, ring * p.depth * Math.cos(angle) * 0.92);
    // 몸에 수직으로 꽂히면 외곽선이 고리처럼 떠 보이므로 위쪽으로 세워 뒤로 살짝 뻗는다
    const spread = p.tailSpread || 0.55;
    const out = new THREE.Vector3(Math.sin(angle) * spread, p.tailRise || 0.85, Math.cos(angle) * spread).normalize();
    const aim = new THREE.Group();
    aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
    // 공식 뒷모습 대조 (2026-11-12): 밑동이 굵고 위로 올라가다 끝이 옆으로 살짝 말린 통통한 쉼표 모양.
    // 원 단면을 휜 곡선을 따라 쓸어 만들고, 양 끝은 둥글게 닫아 외곽선이 끊기지 않게 한다
    const tailMesh = part(curledTailGeo(p.tailSize * 1.25, (p.tailLen + p.tailSize) * 1.5, p.tailCurl ?? -1), aim, [0, 0, 0], hairMat);
    liftOutline(tailMesh);
    tail.add(aim);
    model.add(tail);
  }

  // 우사기: 복슬복슬한 하얀 동그란 꼬리 (가운데 공에 작은 털뭉치를 둘러 붙인다, 2026-11-10 이재헌 지시)
  // 치이카와: 작고 동그란 꼬리 (몸과 같은 흰색)
  if (p.rabbit || p.roundTail) {
    const ring = bodyRadius(p.puffT);
    const size = p.rabbit ? p.puffSize * 1.15 : p.puffSize * 1.4;
    const color = p.rabbit ? new THREE.MeshBasicMaterial({ color: '#fffdf6' }) : skinMat;
    const at = [0, p.footT - p.puffT, -ring * p.depth - size * 0.3];
    part(new THREE.SphereGeometry(size, 18, 14), model, at, color);
    // 바깥선: 공보다 살짝 큰 뒷면 공 (얇게, 한쪽으로 쏠려 검은 초승달이 생기지 않게)
    const rim = new THREE.Mesh(new THREE.SphereGeometry(size * (p.rabbit ? 1.55 : 1.1), 18, 14), new THREE.MeshBasicMaterial({ color: p.inkColor, side: THREE.BackSide }));
    rim.position.set(at[0], at[1], at[2] - (p.rabbit ? size * 0.12 : 0));
    model.add(rim);
    if (p.rabbit) {
      for (let i = 0; i < 9; i++) {
        const a2 = (i / 9) * Math.PI * 2;
        // 털뭉치는 바깥선 없이 공 테두리를 울퉁불퉁하게 만든다 (선이 겹쳐 검게 뭉치지 않게)
        part(new THREE.SphereGeometry(size * 0.38, 10, 8), model, [at[0] + Math.cos(a2) * size * 0.72, at[1] + Math.sin(a2) * size * 0.72, at[2] - size * 0.18], color);
      }
    }
  }
  // 하치와레 뒷머리: 앞머리와 똑같은 모양(가운데가 뾰족하게 갈라지고 옆으로 내려오는 선)을 뒤통수에도 (2026-11-10 이재헌 지시)
  // 뒤통수 띠 아래쪽을 앞머리 선 모양대로 흰 살결로 덮고, 그 경계에 먹선을 긋는다
  if (p.parting) {
    const span = p.hairSpan || 1.5;
    const edge = x => p.hairCenterT + (p.hairSideT - p.hairCenterT) * Math.pow(Math.sin((Math.min(1, Math.abs(x) / span) * Math.PI) / 2), p.hairPow || 0.6);
    const tEnd = p.hairSideT + 0.05;
    // 얼굴 그림은 정면 좌우 |φ| ≤ (FACE_SPAN_X/2)/0.95 까지 덮는다 (headGeometry UV). 뒷머리는 그 끝에서 정확히 이어 받는다.
    // 선 모양도 앞머리와 같은 식(x = φ × 0.95)이라 앞뒤가 거울처럼 같고, 옆에서 계단 없이 이어진다 (2026-11-11 이재헌 지적: 가르마 앞뒤 불일치)
    const NU = 40, NV = 8, PHI = Math.PI - (FACE_SPAN_X / 2) / 0.95;
    const pos = [], idx = [], line = [];
    const at = (phi, t, lift) => { const r = headRadius(t) + lift; return [Math.sin(Math.PI + phi) * r, p.footT - t, Math.cos(Math.PI + phi) * r * p.depth]; };
    for (let i = 0; i <= NU; i++) {
      const phi = -PHI + (i / NU) * PHI * 2;
      const x = phi * 0.95;
      const t0 = edge(x);
      for (let j = 0; j <= NV; j++) pos.push(...at(phi, t0 + (tEnd - t0) * (j / NV), 0.012));
      line.push(new THREE.Vector3(...at(phi, t0, 0.016)));
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a2 = i * (NV + 1) + j, b2 = a2 + NV + 1;
      idx.push(a2, b2, a2 + 1, b2, b2 + 1, a2 + 1);
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g2.setIndex(idx);
    model.add(new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ color: p.skinColor, side: THREE.DoubleSide })));
    model.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 40, (p.outline / p.scale) * 0.5, 5), new THREE.MeshBasicMaterial({ color: p.inkColor })));
  }


  // 쿠리만쥬 뒷모습 (공식 뒷모습 대조, 2026-11-12): 밤껍질 갓이 뒤통수에서는 더 깊게 내려온다.
  // 옆(얼굴 그림 끝)에서는 앞머리 선과 같은 높이로 이어 받고, 뒤 가운데로 갈수록 hairBackT까지 둥글게 내려온다
  if (p.hairBackT && p.hairColor) {
    const NU = 40, NV = 8, PHI = Math.PI - (FACE_SPAN_X / 2) / 0.95;
    const pos = [], idx = [], line = [];
    const at = (phi, t, lift) => { const r = headRadius(t) + lift; return [Math.sin(Math.PI + phi) * r, p.footT - t, Math.cos(Math.PI + phi) * r * p.depth]; };
    for (let i = 0; i <= NU; i++) {
      const phi = -PHI + (i / NU) * PHI * 2;
      const k = Math.cos((phi / PHI) * Math.PI / 2);          // 옆 0 → 뒤 가운데 1
      const tB = p.hairSideT + (p.hairBackT - p.hairSideT) * Math.pow(k, 0.8);
      const t0 = p.hairSideT - 0.12;
      for (let j = 0; j <= NV; j++) pos.push(...at(phi, t0 + (tB - t0) * (j / NV), 0.012));
      line.push(new THREE.Vector3(...at(phi, tB, 0.016)));
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a2 = i * (NV + 1) + j, b2 = a2 + NV + 1;
      idx.push(a2, b2, a2 + 1, b2, b2 + 1, a2 + 1);
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g2.setIndex(idx);
    model.add(new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ color: p.hairColor, side: THREE.DoubleSide })));
    if (p.hairLine !== false) model.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 40, (p.outline / p.scale) * 0.5, 5), new THREE.MeshBasicMaterial({ color: p.inkColor })));
  }


  const footGeo = new THREE.SphereGeometry(1, 20, 14);
  footGeo.scale(p.footW, p.footH, p.footD);
  const footL = part(footGeo, model, [-p.footX, p.footH, 0.03], limbMat);
  const footR = part(footGeo, model, [p.footX, p.footH, 0.03], limbMat);

  // 팔: 뿌리는 몸통 속에 묻고 끝만 비스듬히 밖으로 나온다.
  // 걸을 때는 어깨의 법선을 축으로만 돌려, 표면에서 뻗어 나오는 각도가 그대로 유지되게 한다
  const armGeo = new THREE.CapsuleGeometry(p.armSize, p.armLen, 6, 12);
  const armY = t => p.footT - t;
  const shoulderT = Math.min(p.bodyT + p.bodyH * 0.85, Math.max(p.armT, neckT + 0.06, p.bodyT - p.bodyH * 0.85));
  // 어깨 자리: 몸 둘레 각도(armAngle, 0 = 정면, π/2 = 옆)에서 표면 점·법선·팔 방향을 구한다.
  // anchor(앞으로 옮길 각도)는 물건을 몸 앞에서 들 때 어깨를 몸 표면을 따라 앞으로 옮긴다 (anim-rig.js armFwd 채널)
  const armFrame = (side, angle) => {
    const ring = bodyRadius(shoulderT);
    const surface = new THREE.Vector3(side * ring * Math.sin(angle), armY(shoulderT), ring * p.depth * Math.cos(angle));
    const c = p.bodyW * p.depth;
    const normal = new THREE.Vector3(surface.x / (p.bodyW * p.bodyW), (surface.y - armY(p.bodyT)) / (p.bodyH * p.bodyH), surface.z / (c * c)).normalize();
    const wanted = new THREE.Vector3(side * -p.armIn, -p.armDown, p.armOut);
    const tangent = wanted.addScaledVector(normal, -wanted.dot(normal));
    if (tangent.lengthSq() < 1e-6) tangent.set(0, -1, 0).addScaledVector(normal, normal.y);
    tangent.normalize();
    const reach = tangent.multiplyScalar(Math.cos(p.armLift)).addScaledVector(normal, Math.sin(p.armLift));
    return { surface, normal, reach };
  };
  const makeArm = side => {
    const ring = bodyRadius(shoulderT);
    const surface = new THREE.Vector3(
      side * ring * Math.sin(p.armAngle),
      armY(shoulderT),
      ring * p.depth * Math.cos(p.armAngle),
    );
    const c = p.bodyW * p.depth;
    const normal = new THREE.Vector3(
      surface.x / (p.bodyW * p.bodyW),
      (surface.y - armY(p.bodyT)) / (p.bodyH * p.bodyH),
      surface.z / (c * c),
    ).normalize();

    const wanted = new THREE.Vector3(side * -p.armIn, -p.armDown, p.armOut);
    const tangent = wanted.addScaledVector(normal, -wanted.dot(normal));
    if (tangent.lengthSq() < 1e-6) tangent.set(0, -1, 0).addScaledVector(normal, normal.y);
    tangent.normalize();
    const reach = tangent.multiplyScalar(Math.cos(p.armLift)).addScaledVector(normal, Math.sin(p.armLift));

    // 관절은 표면보다 armSink만큼 안쪽 (회전축이 표면 위로 나오지 않게 몸 쪽으로 넣는다)
    const joint = new THREE.Group();
    joint.position.copy(surface).addScaledVector(normal, -p.armSink);
    const aim = new THREE.Group();
    aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), reach);
    part(armGeo, aim, [0, -(p.armLen / 2), 0], limbMat);
    joint.add(aim);
    model.add(joint);
    // aim은 anims.js의 팔 뻗기 채널(armExt)이 쓴다.
    // anchor(fwd): 어깨를 fwd(라디안)만큼 몸 앞쪽으로 옮긴다. 0이면 원래 자리. normal은 그 자리에 맞게 바뀐다
    let lastFwd = 0;
    const arm = { joint, normal, aim, anchor(fwd = 0) {
      if (Math.abs(fwd - lastFwd) < 1e-6) return;
      lastFwd = fwd;
      const f = armFrame(side, Math.max(0.15, p.armAngle - fwd));
      joint.position.copy(f.surface).addScaledVector(f.normal, -p.armSink);
      arm.normal.copy(f.normal);
      aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), f.reach);
    } };
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // 인물별 고유 부품 (CHARACTER_PARTS)
  if (p.style && CHARACTER_PARTS[p.style]) {
    const colored = color => {
      const m = new THREE.MeshBasicMaterial({ color });
      extraMats.push(m);
      return m;
    };
    const y = t => p.footT - t;
    const ball = (x, t, z, rx, ry, rz, color) => {
      const geo = new THREE.SphereGeometry(1, 22, 16);
      geo.scale(rx, ry, rz);
      return part(geo, model, [x, y(t), z], color ? colored(color) : skinMat);
    };
    // 끝이 둥근 뿔: 밑동을 몸에 묻는다
    const cone = (x, t, z, r, h, color, tiltZ = 0, tiltX = 0) => {
      const curve = new THREE.SplineCurve([[0, 0], [r, 0], [r * 0.7, h * 0.45], [r * 0.25, h * 0.88], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)));
      const geo = new THREE.LatheGeometry(curve.getPoints(20).map(v => new THREE.Vector2(Math.max(0, v.x), v.y)), 18);
      const mesh = part(geo, model, [x, y(t), z], color ? colored(color) : skinMat);
      mesh.rotation.set(tiltX, 0, tiltZ);
      return mesh;
    };
    // 윤곽선 색의 짧은 선 (털, 빗금)
    const tick = (x, t, z, len, angleZ, angleX = 0) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(p.outline * 0.55, len, 4, 8), lineMat);
      mesh.position.set(x, y(t), z);
      mesh.rotation.set(angleX, 0, angleZ);
      model.add(mesh);
      return mesh;
    };
    const ring = (t, r, tube, color) => {
      const geo = new THREE.TorusGeometry(r, tube, 12, 48);
      geo.rotateX(Math.PI / 2);
      geo.scale(1, 1, p.depth);
      return part(geo, model, [0, y(t), 0], color ? colored(color) : skinMat);
    };
    CHARACTER_PARTS[p.style]({ p, model, colored, ball, cone, tick, ring, y, part, lineMat });
  }

  // speed: 0~1 움직임 정도, phase: 걸음 위상, airborne: 점프 중 여부
  function animate(time, { speed = 0, phase = 0, airborne = false } = {}) {
    const swing = Math.sin(phase);
    const breathe = Math.sin(time * 2.4) * (1 - speed);
    const stretch = 1 + (1 - Math.abs(swing)) * 0.035 * speed + breathe * 0.012 + (airborne ? 0.06 : 0);

    puppet.position.y = Math.abs(swing) * 0.1 * speed;
    puppet.scale.set(1 / stretch, stretch, 1 / stretch);
    puppet.rotation.z = swing * 0.05 * speed;

    footL.position.z = 0.03 + swing * 0.2 * speed;
    footR.position.z = 0.03 - swing * 0.2 * speed;
    footL.position.y = p.footH + Math.max(0, -swing) * 0.08 * speed;
    footR.position.y = p.footH + Math.max(0, swing) * 0.08 * speed;

    armL.joint.quaternion.setFromAxisAngle(armL.normal, swing * 0.4 * speed);
    armR.joint.quaternion.setFromAxisAngle(armR.normal, swing * 0.4 * speed);

    if (tail) tail.rotation.z = Math.sin(time * 3.5) * (0.12 + 0.18 * speed);

    // 가끔 깜빡이기
    const faces = facesFor(expressionId);
    if (eyesClosed) faceMat.map = faces.sleep || faces.open;
    else faceMat.map = faces.blink && time % 3.6 > 3.45 ? faces.blink : faces.open;
  }

  function dispose() {
    root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of [inkMat, skinMat, lineMat, hairMat, faceMat, ...extraMats]) m.dispose();
    for (const { open, blink, sleep } of Object.values(faceTextures)) {
      if (sleep && sleep !== blink) sleep.dispose();
      open.dispose();
      if (blink) blink.dispose();
    }
  }

  function setExpression(id) {
    expressionId = id;
  }
  // 자는 동안 눈을 감는다 (깜빡임 그림을 계속 쓴다)
  let eyesClosed = false;
  const setEyesClosed = v => { eyesClosed = v; };

  // feet·footH·tail은 anims.js의 발·꼬리 채널이, arms[].aim은 팔 뻗기 채널이 쓴다 (docs/phase3-design.md §7-5)
  return { root, model, arms: [armL, armR], feet: [footL, footR], footH: p.footH, tail, animate, setExpression, setEyesClosed, getExpression: () => expressionId, dispose };
}
