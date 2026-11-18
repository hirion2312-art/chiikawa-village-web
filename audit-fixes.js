'use strict';

// 치이카와 심즈 — 점검 보정 (2026-11-16, docs/audit-2026-11-12.md)
//  - 치이카와 집 앞 "열쇠 돌려 보기"·"문패 보기"에 서는 자리가 없어 상호작용이 빠져 있었다 → 문 앞 양옆에 자리
//  - 풀뽑기 현장·토벌 훈련소를 다시 지으며 우사기 낮잠 자리가 지워졌다 → 다시 둔다
//  - 무차우 장보기의 장바구니 소품 모델이 없었다 → 손잡이 달린 등나무 바구니
(function (root) {
  const AS = root.ASSET_SOCKETS || {};
  if (AS.home) {
    AS.home.keyhole_unlock = AS.home.keyhole_unlock || [0.7, 10.9, 0, 0.7, 10];
    AS.home.sign_view = AS.home.sign_view || [-1.7, 11.3, 0, -1.7, 10];
  }
  for (const [place, at] of [['weeding', [-14, 22]], ['hunt', [-24, 6]]]) {
    const so = AS[place];
    if (so && !so.usagi_nap_1) so.usagi_nap_1 = [at[0], at[1], 0, at[0] + 1, at[1]];
  }
  // 하치와레 버스킹은 스피커 앞 춤 자리를 같이 써서 자주 밀렸다 (하루 17번) → 스피커 옆에 버스킹 자리를 따로
  if (AS.plaza && !AS.plaza.busk_stand) AS.plaza.busk_stand = [-4.6, 2.6, 0, -4.6, 6];
  const VO = root.VillageObjects;
  const bk = VO && VO.BY_ID && VO.BY_ID['plaza.busk'];
  if (bk) for (const st of bk.steps) if (st.socket === 'speaker_dance') st.socket = 'busk_stand|speaker_dance';
  const VP = root.VillageProps;
  if (VP && VP.BUILD && !VP.BUILD.basket) {
    VP.BUILD.basket = () => {
      const g = new THREE.Group(), w = new THREE.Group();
      w.position.set(0, -0.06, 0.12);
      const toon = c => new THREE.MeshToonMaterial({ color: c });
      const ink = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
      const add = (geo, c, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, toon(c)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); const o = new THREE.Mesh(geo, ink); o.scale.setScalar(1.06); m.add(o); w.add(m); return m; };
      // 바닥이 좁고 위가 넓은 바구니 몸통 (속이 빈 등나무), 테두리, 엮은 띠 둘, 둥근 손잡이
      const body = new THREE.CylinderGeometry(0.17, 0.13, 0.16, 14, 1, true);
      const m = add(body, '#d2ab78', 0, 0, 0); m.material.side = THREE.DoubleSide;
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.015, 14), '#b48a59', 0, -0.08, 0);
      add(new THREE.TorusGeometry(0.17, 0.016, 6, 20), '#b48a59', 0, 0.08, 0, Math.PI / 2);
      for (const y of [-0.03, 0.03]) add(new THREE.TorusGeometry(0.155 + y * 0.3, 0.008, 5, 20), '#b48a59', 0, y, 0, Math.PI / 2);
      add(new THREE.TorusGeometry(0.15, 0.014, 6, 18, Math.PI), '#b48a59', 0, 0.08, 0);
      // 장 본 것: 사과와 파 한 줄기
      add(new THREE.SphereGeometry(0.05, 10, 8), '#e86a5a', -0.05, 0.07, 0.02);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), '#7fb36a', 0.06, 0.14, -0.02, 0, -0.3);
      g.add(w);
      return g;
    };
    if (VP.HAND) VP.HAND.basket = 1;
  }
}(typeof self !== 'undefined' ? self : this));
