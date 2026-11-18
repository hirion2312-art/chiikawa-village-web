'use strict';

// 치이카와 심즈 — 무기와 손 소품 모델
// 그림책 같은 단색 면에 굵은 갈색 외곽선, 짧고 뭉툭한 비율. village-props.js의 BUILD에 더한다.
// 모든 무기는 손잡이가 원점 근처이고 +Y로 뻗도록 만든 뒤, 기존 막대와 같은 각도로 손에 든다.
(function (root) {
  const { BUILD, HAND } = root.VillageProps;
  const INK = '#4a3230';
  const INFLATE = 0.014;
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

  // 법선 방향으로 부풀린 뒷면 껍질로 외곽선을 두른다 (길쭉한 도형도 굵기가 일정하다)
  function part(parent, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color }));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    const hull = geo.clone();
    const p = hull.attributes.position;
    const n = hull.attributes.normal;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * INFLATE, p.getY(i) + n.getY(i) * INFLATE, p.getZ(i) + n.getZ(i) * INFLATE);
    mesh.add(new THREE.Mesh(hull, inkMat));
    parent.add(mesh);
    return mesh;
  }
  const cyl = (r1, r2, h, seg = 10) => new THREE.CylinderGeometry(r1, r2, h, seg);
  // 손에서 앞 위로 뻗는 기준 자세 (기존 막대와 같다)
  function held(build) {
    return () => {
      const g = new THREE.Group();
      const w = new THREE.Group();
      w.rotation.x = Math.PI / 2 - 0.5;
      w.position.set(0, 0.03, 0.05);
      build(w);
      g.add(w);
      return g;
    };
  }
  // 손잡이에 감은 띠
  function wrap(w, color, from, n, gap = 0.075, r = 0.036) {
    for (let i = 0; i < n; i++) part(w, cyl(r, r, 0.04), color, 0, from + i * gap, 0);
  }

  // 사스마타: 실제 사스마타처럼 키보다 긴 자루 끝에, 바깥으로 벌어진 넓은 U자 쇠붙이. 두 갈래 끝은 둥근 고무 마개.
  // U자는 자루 끝에서 앞(+Y)으로 열린다 (막대를 밀어 괴물을 붙드는 쪽). 손잡이 띠 색으로 임자를 구분한다
  const sasumata = band => held(w => {
    const L = 1.78, R = 0.27, P = 0.3;                 // 자루 길이, U자 반폭, 두 갈래의 곧은 길이
    part(w, cyl(0.032, 0.036, L), '#d9dde2', 0, L / 2 - 0.16, 0);                     // 은색 금속 자루
    part(w, new THREE.SphereGeometry(0.05, 10, 8), '#5a5f66', 0, -0.17, 0);             // 손잡이 끝 마개
    wrap(w, band, -0.08, 4, 0.07, 0.042);                                             // 손잡이 띠
    part(w, cyl(0.046, 0.04, 0.1), '#9aa2ab', 0, L - 0.14, 0);                          // 자루와 머리를 잇는 이음쇠
    part(w, new THREE.TorusGeometry(R, 0.03, 8, 26, Math.PI), '#c3cad2', 0, L - 0.09 + R, 0, 0, 0, Math.PI);   // 아래가 둥근 U자 바닥
    for (const sx of [-1, 1]) {
      part(w, cyl(0.03, 0.03, P, 8), '#c3cad2', sx * R, L - 0.09 + R + P / 2, 0);     // 앞으로 곧게 뻗은 두 갈래
      part(w, cyl(0.046, 0.046, 0.1, 10), '#3f444a', sx * R, L - 0.09 + R + P + 0.04, 0);   // 고무 마개
      part(w, new THREE.SphereGeometry(0.046, 10, 8), '#3f444a', sx * R, L - 0.09 + R + P + 0.09, 0);
    }
  });

  // 우사기의 봉: 양 끝을 노란 쇠로 감싼 굵은 봉
  BUILD.w_staff = held(w => {
    part(w, cyl(0.038, 0.038, 1.46), '#d8a65c', 0, 0.56, 0);
    for (const y of [-0.17, 1.29]) {
      part(w, cyl(0.05, 0.05, 0.16), '#f2d264', 0, y, 0);
      part(w, new THREE.SphereGeometry(0.052, 10, 8), '#f7e08b', 0, y + (y < 0 ? -0.08 : 0.08), 0);
    }
    wrap(w, '#fff3c9', 0, 3, 0.08, 0.044);
  });

  // 랏코의 검: 폭이 넓고 끝이 둥근 짧은 검, 금색 코등이, 감색 손잡이
  // 랏코의 검: 등에 멘 검과 같은 모양 (character.js buildRakkoSword — 흰 날밑·사선 감개 칼자루·얼굴 마크·넓은 마름모 날).
  // 손이 칼자루 가운데를 쥐도록 칼자루 가운데를 원점 근처로 옮긴다. 크기는 예전 검과 비슷하게 (손 소품 배치 FIT를 그대로 쓴다)
  BUILD.w_sword = held(w => {
    const built = root.buildRakkoSword((parent, geo, color, at) => part(parent, geo, color, ...at), { sheathed: false, u: 0.045, ink: INK });
    built.group.position.y = 0.02 + 0.045 * 0.62 + built.gripLen / 2;
    w.add(built.group);
  });

  // 흉터 엑스트라: 무거운 쇠못 곤봉
  BUILD.w_club = held(w => {
    part(w, cyl(0.036, 0.04, 0.72), '#6e5a4c', 0, 0.24, 0);
    wrap(w, '#3f3a36', -0.04, 3);
    part(w, cyl(0.16, 0.11, 0.58, 12), '#7b7f86', 0, 0.82, 0);
    part(w, new THREE.SphereGeometry(0.16, 12, 8), '#8d9299', 0, 1.11, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const y = 0.72 + (i % 2) * 0.24;
      part(w, new THREE.ConeGeometry(0.04, 0.11, 8), '#d5dbe2', Math.cos(a) * 0.16, y, Math.sin(a) * 0.16, Math.sin(a) * 1.57, 0, -Math.cos(a) * 1.57);
    }
  });

  // 강한 엑스트라: 잎사귀 모양 날의 창
  BUILD.w_spear = held(w => {
    part(w, cyl(0.03, 0.034, 1.3), '#8a7360', 0, 0.55, 0);
    wrap(w, '#4f4a45', -0.02, 3);
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0);
    leaf.quadraticCurveTo(0.13, 0.14, 0, 0.46);
    leaf.quadraticCurveTo(-0.13, 0.14, 0, 0);
    const geo = new THREE.ExtrudeGeometry(leaf, { depth: 0.024, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 1.2, -0.012);
    part(w, geo, '#dfe5ec');
    part(w, cyl(0.05, 0.042, 0.1), '#b98f4e', 0, 1.19, 0);
  });

  BUILD.w_sasumata_pink = sasumata('#f6bcc8');
  BUILD.w_sasumata_blue = sasumata('#8fb9e0');
  BUILD.w_sasumata_mint = sasumata('#a8d8b4');
  BUILD.w_sasumata_gray = sasumata('#bdb9b3');

/* ---------- 무기점에서 파는 새 무기 (2026-11-12) ---------- */
  // 나무 망치: 굵은 통나무 머리를 쇠띠로 두른 큰 망치
  BUILD.w_hammer = held(w => {
    part(w, cyl(0.034, 0.038, 1.0), '#b98a5c', 0, 0.36, 0);
    wrap(w, '#7d4a32', -0.06, 3);
    const head = part(w, cyl(0.17, 0.17, 0.46, 16), '#c49a6c', 0, 0.95, 0, 0, 0, Math.PI / 2);
    for (const sx of [-0.19, 0.19]) part(w, cyl(0.178, 0.178, 0.05, 16), '#8f969a', sx, 0.95, 0, 0, 0, Math.PI / 2);
    for (const sx of [-0.235, 0.235]) part(w, cyl(0.15, 0.15, 0.02, 16), '#a97c50', sx, 0.95, 0, 0, 0, Math.PI / 2);
    head.userData.head = 1;
  });
  // 포획 그물: 긴 대나무 자루 끝에 둥근 테, 처진 그물 주머니
  BUILD.w_net = held(w => {
    part(w, cyl(0.028, 0.03, 1.5), '#c9b26a', 0, 0.6, 0);
    for (const y of [0.2, 0.6, 1.0]) part(w, cyl(0.034, 0.034, 0.03), '#a8924e', 0, y, 0);
    wrap(w, '#5f7d4a', -0.08, 2);
    const rimY = 1.55;
    part(w, new THREE.TorusGeometry(0.26, 0.022, 6, 28), '#8a6242', 0, rimY, 0.0, Math.PI / 2, 0, 0);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshToonMaterial({ color: '#f4efe3', wireframe: true }));
    bag.position.set(0, rimY, 0); bag.scale.set(1, 1.4, 1); bag.rotation.x = Math.PI; w.add(bag);
  });
  // 쇠스랑: 나무 자루에 갈퀴 네 개
  BUILD.w_rake = held(w => {
    part(w, cyl(0.03, 0.034, 1.4), '#b98a5c', 0, 0.58, 0);
    wrap(w, '#5a4030', -0.06, 3);
    part(w, new THREE.BoxGeometry(0.44, 0.06, 0.06), '#8f969a', 0, 1.3, 0);
    for (let i = 0; i < 4; i++) {
      part(w, cyl(0.016, 0.022, 0.32, 6), '#aeb6bf', -0.165 + i * 0.11, 1.48, 0);
      part(w, new THREE.ConeGeometry(0.02, 0.06, 6), '#d5dbe2', -0.165 + i * 0.11, 1.67, 0);
    }
  });
  // 삽: 둥근 날의 삽, 손잡이 끝에 D자 고리
  BUILD.w_shovel = held(w => {
    part(w, cyl(0.03, 0.034, 1.15), '#c49a6c', 0, 0.45, 0);
    part(w, new THREE.TorusGeometry(0.09, 0.024, 6, 14, Math.PI), '#5a4030', 0, -0.13, 0, 0, 0, Math.PI);
    part(w, new THREE.BoxGeometry(0.2, 0.03, 0.04), '#5a4030', 0, -0.13, 0);
    const blade = new THREE.Shape();
    blade.moveTo(-0.15, 0); blade.lineTo(0.15, 0); blade.lineTo(0.15, 0.24); blade.quadraticCurveTo(0.12, 0.42, 0, 0.46); blade.quadraticCurveTo(-0.12, 0.42, -0.15, 0.24); blade.closePath();
    const geo = new THREE.ExtrudeGeometry(blade, { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
    geo.translate(0, 1.02, -0.01);
    part(w, geo, '#9aa2ab');
    part(w, cyl(0.05, 0.036, 0.1), '#8f969a', 0, 1.0, 0);
  });
  // 프라이팬: 손잡이가 짧은 무쇠 팬 (가까이 붙어 휘두른다)
  BUILD.w_frypan = held(w => {
    part(w, cyl(0.03, 0.034, 0.5), '#3f3a36', 0, 0.12, 0);
    wrap(w, '#c49a6c', -0.05, 3, 0.08, 0.04);
    const pan = part(w, cyl(0.24, 0.2, 0.07, 22), '#4a4440', 0, 0.62, 0, Math.PI / 2, 0, 0);
    part(w, cyl(0.2, 0.2, 0.02, 22), '#6a645f', 0, 0.62, 0.035, Math.PI / 2, 0, 0);
    part(w, new THREE.BoxGeometry(0.06, 0.14, 0.05), '#3f3a36', 0, 0.4, 0);
    pan.userData.head = 1;
  });

  // 쿠리만쥬의 술병 (도쿠리)
  BUILD.bottle = () => {
    const g = new THREE.Group();
    const w = new THREE.Group();
    w.position.set(0, 0.02, 0.06);
    part(w, new THREE.SphereGeometry(0.09, 12, 10), '#f4efe3', 0, 0.02, 0);
    part(w, cyl(0.04, 0.075, 0.13), '#f4efe3', 0, 0.13, 0);
    part(w, cyl(0.052, 0.04, 0.035), '#3d4f7a', 0, 0.2, 0);
    g.add(w);
    return g;
  };

  for (const id of Object.keys(BUILD)) if (/^w_|^bottle$/.test(id)) HAND[id] = 1;
  root.WeaponParts = { part, cyl };
}(typeof self !== 'undefined' ? self : this));
