'use strict';

// 치이카와 심즈 — 원작 주민 다섯의 집 안 (2026-11-16 시안)
// 원작에서 이 다섯의 집 안은 거의 그려지지 않았다. 그래서 원작에서 확실한 성격·습관을 살림으로 옮긴다
//  모몽가: 귀여움을 뽐내고 갖고 싶은 건 다 가지려 함 → 금테 전신 거울, 리본 선물 상자 더미, 하트 방석
//  시사: 라멘 로에서 수련, 술 자격 공부 → 공부 책상(공책·연필·책·스탠드), 벽의 라멘 로 앞치마·수건, 포갠 라멘 그릇
//  랏코: 토벌 랭커, 검, 찻집 단골 메뉴 딸기 파르페 → 검 거치대, 벽의 토벌 상장, 밥상 위 딸기 파르페
//  쿠리만쥬: 술과 안주 → 술병 선반, 큰 술독, 밥상 위 술잔·안주 접시, 작은 화로와 꼬치
//  후루혼야: 헌책방 주인, 책벌레 → 바닥의 책 더미, 꽉 찬 책장, 독서 등과 펼친 책을 둔 방석
// 집 틀(interiors-auto.js cottageDef)은 13×11. 침대 (3.6,-1.6), 탁자 (-2.6,-1.2), 뒤 벽 z=-5.3, 왼 벽 x=-6.3, 문은 앞(+z) 왼쪽
(function (root) {
  const D = -5.0;            // 뒤 벽 앞
  const BOOK = ['#e8c97c', '#a8c6e0', '#e6a79a', '#b7d6a5', '#d9b8e4', '#c98f6a', '#f2efe4', '#7d9ac9'];
  const book = (k, x, y, z, w, h, d, c, ry = 0) => { const b = k.box(x, y, z, w, h, d, c, 0); b.rotation.y = ry; return b; };
  function bookPile(k, x, z, n, seed) {
    for (let i = 0; i < n; i++) book(k, x + ((i * 7 + seed) % 3 - 1) * 0.03, 0.06 + i * 0.1, z, 0.5, 0.09, 0.36, BOOK[(i + seed) % 8], ((i + seed) % 5 - 2) * 0.12);
  }
  const SETS = {
    momongaHome(k, g) {
      // 금테 전신 거울 (왼쪽 뒤 구석, 방 쪽을 봄)
      const mx = -5.6, mz = -3.6;
      k.box(mx, 0.08, mz, 0.9, 0.16, 0.6, '#c9a24a', 1);
      k.box(mx, 1.35, mz, 1.0, 2.4, 0.12, '#d9b44a', 2);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.15), new THREE.MeshBasicMaterial({ color: '#e3f4fb' }));
      gl.position.set(mx + 0.07, 1.35, mz); gl.rotation.y = Math.PI / 2; g.add(gl);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
      sh.position.set(mx + 0.08, 1.5, mz - 0.2); sh.rotation.set(0, Math.PI / 2, 0.3); g.add(sh);
      k.ball(mx, 2.62, mz, 0.12, 0.12, 0.1, '#f4a9bd', 0);
      // 리본 선물 상자 더미 (앞 오른쪽): 갖고 싶어서 다 받아 온 것
      const GB = [['#f4a9bd', '#fffaf0'], ['#9fd0ea', '#f3d27a'], ['#f3d27a', '#e86a5a'], ['#c9b6e4', '#fffaf0'], ['#a8d8b4', '#f4a9bd']];
      [[4.6, 0.3, 3.4, 0.7], [5.3, 0.3, 3.9, 0.55], [4.9, 0.85, 3.6, 0.5], [4.1, 0.25, 4.1, 0.45], [5.0, 1.28, 3.6, 0.36]].forEach(([x, y, z, s], i) => {
        const [c, r] = GB[i];
        k.box(x, y, z, s, s * 0.85, s, c, 1);
        k.box(x, y, z, s + 0.01, s * 0.86, 0.08, r, 0);
        k.box(x, y, z, 0.08, s * 0.86, s + 0.01, r, 0);
        for (const sx of [-1, 1]) k.ball(x + sx * 0.08, y + s * 0.45, z, 0.09, 0.06, 0.05, r, 0);
      });
      // 하트 방석
      const hs = new THREE.Shape(); hs.moveTo(0, -0.5); hs.bezierCurveTo(-0.9, 0.1, -0.4, 0.75, 0, 0.35); hs.bezierCurveTo(0.4, 0.75, 0.9, 0.1, 0, -0.5);
      const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 });
      hg.rotateX(-Math.PI / 2);
      k.place(hg, mat('#f7a8bf'), -0.8, 0.02, 2.6, 0.9, 0.9, 0.9, inkThin).rotation.y = 0.3;
    },
    shisaHome(k, g) {
      // 공부 책상 (왼쪽 뒤): 낮은 앉은뱅이 책상 + 방석, 펼친 공책·연필·쌓은 교재·스탠드
      const x = -4.4, z = -3.8;
      k.box(x, 0.48, z, 1.9, 0.08, 0.9, '#c49a6c', 1);
      for (const sx of [-0.85, 0.85]) for (const sz of [-0.35, 0.35]) k.box(x + sx, 0.22, z + sz, 0.08, 0.44, 0.08, '#8a6242', 0);
      k.place(roundBoxGeo(0.8, 0.12, 0.8, 0.05), mat('#e86a5a'), x, 0.06, z + 1.0, 1, 1, 1, inkThin);
      k.box(x - 0.15, 0.53, z + 0.12, 0.6, 0.02, 0.42, '#fffaf0', 1);
      k.box(x - 0.15, 0.545, z + 0.12, 0.01, 0.005, 0.4, '#c9c2b4', 0);
      const pen = k.box(x + 0.25, 0.55, z + 0.18, 0.02, 0.02, 0.3, '#f3d27a', 0); pen.rotation.y = 0.6;
      for (let i = 0; i < 4; i++) book(k, x + 0.62, 0.56 + i * 0.07, z - 0.15, 0.4, 0.06, 0.3, BOOK[(i * 3) % 8], i * 0.15);
      k.paint(x + 0.62, 0.58, z + 0.01, 0.36, 0.1, gg => drawText(gg, '술 자격', 0, 0.05, 0.34, 0.08, '#4a3230'));
      k.cyl(x - 0.7, 0.55, z - 0.25, 0.1, 0.04, '#5a5f66', 0);
      const arm = k.box(x - 0.7, 0.85, z - 0.25, 0.03, 0.6, 0.03, '#5a5f66', 0); arm.rotation.z = 0.25;
      k.cone(x - 0.55, 1.05, z - 0.2, 0.14, 0.16, '#f3d27a', 1).rotation.z = Math.PI;
      // 벽의 라멘 로 앞치마와 수건 (오른쪽 앞 벽)
      const wx = 6.1, wz = 2.6;
      k.box(wx, 2.2, wz, 0.06, 0.06, 1.6, '#8a6242', 0);
      k.box(wx - 0.05, 1.6, wz - 0.3, 0.04, 1.1, 0.7, '#3b4f7a', 1);
      k.paint(wx - 0.08, 1.55, wz - 0.3, 0.6, 0.4, gg => drawText(gg, '郎', 0, 0.2, 0.4, 0.36, '#fffaf0'), -Math.PI / 2);
      k.box(wx - 0.05, 1.85, wz + 0.45, 0.03, 0.6, 0.3, '#fffaf0', 1);
      // 포갠 라멘 그릇
      for (let i = 0; i < 4; i++) k.cyl(4.6, 0.12 + i * 0.13, 3.9, 0.3, 0.12, i % 2 ? '#e86a5a' : '#fffaf0', 1);
    },
    rakkoHome(k, g) {
      // 검 거치대 (왼쪽 뒤): 나무 받침 두 단, 검 한 자루
      const x = -4.6, z = -4.4;
      k.box(x, 0.1, z, 1.6, 0.2, 0.5, '#8a6242', 1);
      for (const sx of [-0.6, 0.6]) k.box(x + sx, 0.8, z, 0.12, 1.4, 0.12, '#8a6242', 1);
      for (const y of [0.9, 1.35]) for (const sx of [-0.6, 0.6]) k.box(x + sx, y, z + 0.1, 0.16, 0.06, 0.24, '#6a4a36', 0);
      const VP = root.VillageProps;
      if (VP && VP.BUILD && VP.BUILD.w_sword) { const sw = VP.BUILD.w_sword(); const inner = sw.children[0]; if (inner) { inner.rotation.set(0, 0, Math.PI / 2); inner.position.set(0, 0, 0); } sw.position.set(x + 0.8, 1.43, z + 0.12); sw.scale.setScalar(1.45); g.add(sw); }
      // 벽의 토벌 상장 셋 (뒤 벽)
      for (let i = 0; i < 3; i++) {
        const fx = -1.6 + i * 1.1;
        k.box(fx, 2.3, D - 0.2, 0.8, 0.6, 0.05, '#c9a24a', 1);
        k.box(fx, 2.3, D - 0.17, 0.66, 0.46, 0.01, '#fffaf0', 0);
        k.paint(fx, 2.12, D - 0.16, 0.6, 0.36, gg => { drawText(gg, '토벌 1위', 0, 0.24, 0.56, 0.14, '#7d4a32'); gg.fillStyle = '#e86a5a'; gg.beginPath(); gg.arc(0, 0.07, 0.05, 0, Math.PI * 2); gg.fill(); });
      }
      // 밥상 위 딸기 파르페 (탁자 -2.6,-1.2 윗면 0.73)
      const px = -2.4, pz = -1.2, py = 0.74;
      k.cone(px, py, pz, 0.08, 0.06, '#e9eff4', 0);
      k.cyl(px, py + 0.12, pz, 0.025, 0.16, '#e9eff4', 0);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.36, 14, 1, true), new THREE.MeshToonMaterial({ color: '#dff3fb', transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      glass.position.set(px, py + 0.38, pz); g.add(glass);
      k.cyl(px, py + 0.3, pz, 0.1, 0.12, '#f7c6d0', 0);
      k.cyl(px, py + 0.44, pz, 0.13, 0.12, '#fffaf0', 0);
      k.ball(px, py + 0.58, pz, 0.14, 0.1, 0.14, '#fffaf0', 0);
      k.ball(px + 0.03, py + 0.7, pz, 0.06, 0.07, 0.06, '#e2483c', 0);
      k.box(px - 0.12, py + 0.62, pz, 0.02, 0.18, 0.02, '#c9a24a', 0).rotation.z = 0.4;
    },
    kurimanjuHome(k, g) {
      // 술병 선반 (뒤 벽 오른쪽): 두 단에 도쿠리가 줄지어
      const sx = 1.4, sz = D - 0.1;
      for (const y of [1.6, 2.3]) k.box(sx, y, sz, 2.6, 0.08, 0.4, '#8a6242', 1);
      const VP = root.VillageProps;
      for (const [y, n] of [[1.64, 5], [2.34, 4]]) for (let i = 0; i < n; i++) {
        if (VP && VP.BUILD && VP.BUILD.bottle) { const b = VP.BUILD.bottle(); b.position.set(sx - 1.0 + i * 0.48, y, sz); b.scale.setScalar(1.6); g.add(b); }
      }
      // 큰 술독 (왼쪽 뒤)
      k.ball(-5.2, 0.55, -4.2, 0.55, 0.6, 0.55, '#8f6a4a', 1);
      k.cyl(-5.2, 1.12, -4.2, 0.32, 0.12, '#8f6a4a', 0);
      k.cyl(-5.2, 1.2, -4.2, 0.34, 0.06, '#e8d6b0', 0);
      k.box(-5.2, 0.6, -3.66, 0.36, 0.42, 0.02, '#fffaf0', 0);
      k.paint(-5.2, 0.42, -3.64, 0.32, 0.38, gg => drawText(gg, '酒', 0, 0.19, 0.28, 0.32, '#3b2a26'));
      // 밥상 위: 술잔과 도쿠리, 꼬치 접시·풋콩 접시
      const tx = -2.6, tz = -1.2, ty = 0.74;
      if (VP && VP.BUILD && VP.BUILD.bottle) { const b = VP.BUILD.bottle(); b.position.set(tx - 0.3, ty, tz - 0.2); b.scale.setScalar(1.3); g.add(b); }
      k.cyl(tx + 0.05, ty + 0.03, tz - 0.25, 0.07, 0.06, '#fffaf0', 1);
      k.cyl(tx + 0.3, ty + 0.02, tz + 0.2, 0.22, 0.03, '#f7f3ea', 1);
      for (let i = 0; i < 2; i++) { const sk = k.box(tx + 0.25 + i * 0.1, ty + 0.06, tz + 0.2, 0.02, 0.02, 0.36, '#c9a46a', 0); sk.rotation.y = 0.3; for (let j = 0; j < 3; j++) k.ball(tx + 0.25 + i * 0.1 + j * 0.03, ty + 0.08, tz + 0.08 + j * 0.1, 0.045, 0.04, 0.045, '#a8642c', 0); }
      k.cyl(tx - 0.25, ty + 0.02, tz + 0.3, 0.16, 0.03, '#9fc7d8', 1);
      for (let i = 0; i < 6; i++) k.ball(tx - 0.25 + ((i % 3) - 1) * 0.07, ty + 0.06, tz + 0.3 + (Math.floor(i / 3) - 0.5) * 0.08, 0.04, 0.03, 0.025, '#8fbf5a', 0);
      // 작은 화로(시치린)와 굽는 꼬치 (앞 오른쪽)
      const hx = 4.5, hz = 3.6;
      k.cyl(hx, 0.25, hz, 0.4, 0.5, '#d9c7a6', 1);
      k.cyl(hx, 0.52, hz, 0.36, 0.04, '#3b3533', 0);
      const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 16), new THREE.MeshBasicMaterial({ color: '#f2913a' }));
      ember.position.set(hx, 0.5, hz); g.add(ember);
      for (let i = 0; i < 3; i++) { k.box(hx - 0.15 + i * 0.15, 0.58, hz, 0.02, 0.02, 0.7, '#c9a46a', 0); for (let j = 0; j < 3; j++) k.ball(hx - 0.15 + i * 0.15, 0.6, hz - 0.15 + j * 0.15, 0.05, 0.045, 0.05, '#a8642c', 0); }
    },
    furuhonyaHome(k, g) {
      // 꽉 찬 책장 (뒤 벽 오른쪽)
      const bx = 1.6, bz = D;
      k.box(bx, 1.3, bz - 0.2, 3.0, 2.6, 0.08, '#8a6242', 1);
      for (const e of [-1.5, 1.5]) k.box(bx + e, 1.3, bz + 0.05, 0.08, 2.6, 0.5, '#a97c50', 1);
      for (let r = 0; r < 5; r++) k.box(bx, 0.06 + r * 0.6, bz + 0.05, 3.0, 0.06, 0.5, '#a97c50', 0);
      let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let r = 0; r < 4; r++) { let x = bx - 1.42; while (x < bx + 1.38) { const w = 0.07 + rnd() * 0.07, h = 0.36 + rnd() * 0.16; book(k, x + w / 2, 0.1 + r * 0.6 + h / 2, bz + 0.08, w - 0.008, h, 0.34, BOOK[(rnd() * 8) | 0]); x += w; } }
      // 바닥의 책 더미 다섯
      [[-4.8, -4.0, 6], [-4.2, -3.2, 4], [-5.3, 1.5, 5], [4.8, 3.6, 7], [-0.6, 3.4, 3]].forEach(([x, z, n], i) => bookPile(k, x, z, n, i * 3));
      // 독서 등과 펼친 책을 둔 방석 (왼쪽)
      const rx = -4.6, rz = -0.4;
      k.place(roundBoxGeo(0.9, 0.14, 0.9, 0.06), mat('#7fbfb4'), rx, 0.07, rz, 1, 1, 1, inkThin);
      for (const s of [-1, 1]) { const pg = k.box(rx + s * 0.13, 0.17, rz + 0.1, 0.26, 0.02, 0.34, '#fffaf0', 1); pg.rotation.z = s * -0.15; }
      k.cyl(rx - 0.8, 0.05, rz - 0.6, 0.18, 0.1, '#5a5f66', 1);
      k.cyl(rx - 0.8, 0.75, rz - 0.6, 0.03, 1.4, '#5a5f66', 0);
      k.cone(rx - 0.8, 1.42, rz - 0.6, 0.26, 0.3, '#f3e3b5', 1);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe6a8' })); lamp.position.set(rx - 0.8, 1.42, rz - 0.6); g.add(lamp);
    },
  };
  function apply() {
    const M = root.Interiors && root.Interiors.MOUNTED;
    if (!M) return 0;
    let n = 0;
    for (const st of M.values()) {
      const id = st.key.split('@')[0];
      if (!SETS[id] || st.resident) continue;
      const g = new THREE.Group(); g.name = 'residentSet';
      st.statics.add(g);
      SETS[id](makeKit(g, st.place.x, st.place.z, st.place.face || 0), g);
      // 기본 선반의 컵 넷은 집마다 같아서 뺀다 (책장·술병 선반이 뒤 벽을 쓴다)
      st.statics.children.forEach(m => { if (m.isMesh && Math.abs(m.position.y - 3.22) < 0.05 && m.position.z < -4) m.visible = false; if (m.isMesh && Math.abs(m.position.y - 3) < 0.05 && Math.abs(m.position.x + 2.6) < 0.1 && m.position.z < -4) m.visible = false; });
      st.resident = true; n++;
    }
    return n;
  }
  root.ResidentHomes = { SETS, apply };
  // 게임에 붙어 있을 때: 집들이 다 지어지면 한 번
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP && !root.__residentPreview) {
    const update0 = VP.update;
    let done = false;
    VP.update = function (dtReal) { update0.call(this, dtReal); if (!done && root.Interiors && root.Interiors.MOUNTED && root.Interiors.MOUNTED.size) done = apply() > 0; };
  }
}(typeof self !== 'undefined' ? self : this));
