'use strict';

// 치이카와 심즈 — 기념공원군 상 다시 만들기 (2026-11-16 이재헌님: 처참한 모형은 다시 만든다)
// 원작(세계관 조사 자료): 작은 언덕에 놓인 석상. 귀가 없는 치이카와족 모습에 머리 위로 촉각이 셋 났다.
//   랏코가 이 상 앞에서 "강해지겠다"고 맹세한다
// 불러온 모형의 상(곰처럼 귀가 달린 몸)만 감추고, 받침대·벤치·꽃은 그대로 둔 채 받침대 위에 새 석상을 세운다
(function (root) {
  const STONE = '#e2dccf', STONE_DARK = '#a9a397', MOSS = '#9cb884';
  const INK = new THREE.MeshBasicMaterial({ color: '#4a3230', side: THREE.BackSide });
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const inked = (geo, c, w = 0.035) => { const m = new THREE.Mesh(geo, toon(c)); const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1 + w); m.add(o); m.castShadow = true; return m; };
  const ball = (r, c, sx = 1, sy = 1, sz = 1, w) => { const m = inked(new THREE.SphereGeometry(r, 28, 20), c, w); m.scale.set(sx, sy, sz); return m; };

  // 돌결: 표면에 옅은 얼룩을 그린 텍스처
  function stoneMat() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = STONE; g.fillRect(0, 0, 256, 256);
    // 옅은 돌결 얼룩과 아주 작은 점 (얼룩이 짙으면 감자처럼 보인다)
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(150, 144, 132, ${0.06 + Math.random() * 0.06})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(110, 104, 94, .18)'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshToonMaterial({ color: '#ffffff', map: t });
  }

  function build(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const mat = stoneMat();
    const stone = (geo, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1.035); m.add(o); m.castShadow = true; return m; };
    // 발 둘, 몸, 큰 머리 (치이카와족 비율: 머리가 몸보다 크다)
    for (const s of [-1, 1]) { const f = stone(new THREE.SphereGeometry(0.34, 18, 12), 1, 0.55, 1.25); f.position.set(s * 0.42, 0.14, 0.12); g.add(f); }
    const body = stone(new THREE.SphereGeometry(0.82, 28, 20), 1, 0.92, 0.88); body.position.y = 0.78; g.add(body);
    const head = stone(new THREE.SphereGeometry(1.0, 32, 24), 1.08, 0.9, 0.96); head.position.y = 1.95; g.add(head);
    // 팔: 배 앞에 모은 짧은 팔
    for (const s of [-1, 1]) { const a = stone(new THREE.SphereGeometry(0.24, 14, 10), 1, 1.5, 1); a.position.set(s * 0.62, 0.95, 0.42); a.rotation.z = s * 0.7; a.rotation.x = -0.5; g.add(a); }
    // 촉각 셋: 가운데가 가장 길고, 양옆은 바깥으로 기운다. 끝은 둥근 알
    [[0, 0, 0.7], [-0.32, -0.38, 0.55], [0.32, 0.38, 0.55]].forEach(([dx, tilt, len]) => {
      const piv = new THREE.Group(); piv.position.set(dx, 2.7, 0.05); piv.rotation.z = tilt; g.add(piv);
      const stalk = stone(new THREE.CylinderGeometry(0.06, 0.09, len, 10)); stalk.position.y = len / 2; piv.add(stalk);
      const tip = stone(new THREE.SphereGeometry(0.14, 14, 10)); tip.position.y = len + 0.06; piv.add(tip);
    });
    // 새긴 얼굴: 돌을 판 눈과 입 (어두운 돌색), 볼의 빗금
    const carve = toon(STONE_DARK), deep = toon('#6f6a60');
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), deep); eye.scale.set(0.9, 1.15, 0.4); eye.position.set(s * 0.36, 2.0, 0.9); g.add(eye);
      for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.02), carve); h.position.set(s * 0.62 + (i - 1) * 0.07, 1.82, 0.83 - Math.abs(s) * 0.02); h.rotation.z = 0.25; g.add(h); }
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI), deep); mouth.position.set(0, 1.78, 0.93); mouth.rotation.z = Math.PI; g.add(mouth);
    // 오래된 돌: 발치와 머리 옆의 이끼, 몸의 가는 금
    for (const [mx, my, mz, r] of [[-0.5, 0.1, 0.4, 0.22], [0.55, 0.08, -0.2, 0.18], [-0.95, 2.1, -0.1, 0.16], [0.7, 0.55, 0.45, 0.14]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6), toon(MOSS)); m.scale.y = 0.4; m.position.set(mx, my, mz); g.add(m); }
    const crack = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.3, 1.2, 0.72], [0.38, 1.0, 0.75], [0.3, 0.8, 0.78], [0.4, 0.62, 0.74]].map(p => new THREE.Vector3(...p))), 10, 0.015, 4), toon('#5d574f'));
    g.add(crack);
    return g;
  }

  let done = false;
  function tick() {
    const G = root.game;
    if (!done && G && G.readyDone && G.scene && G.sim) {
      const h = (root.GLB_HOLDERS && root.GLB_HOLDERS.statue || [])[0];
      const p = G.sim.places.statue;
      if (h && p) {
        // 상 덩어리(받침대 위로 높이 솟은 것)와 얼굴 조각만 감춘다
        const b = new THREE.Box3();
        let top = 0;
        h.traverse(m => { if (!m.isMesh) return; b.setFromObject(m); const lx = (b.min.x + b.max.x) / 2 - p.x, lz = (b.min.z + b.max.z) / 2 - p.z; if (Math.hypot(lx, lz) < 2.2 && b.max.y - b.min.y < 6 && b.max.y > 10.6) m.visible = false; if (Math.hypot(lx, lz) < 0.5 && b.max.y < 10.6 && b.max.y > top) top = b.max.y; });
        const s = build(p.x, top || 10.1, p.z);
        G.scene.add(s);
        root.KinenStatue = s;
        done = true;
      }
    }
    if (!done) requestAnimationFrame(tick);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
}(typeof self !== 'undefined' ? self : this));
