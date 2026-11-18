'use strict';

// 치이카와 심즈 — 우사기는 집이 없다 (2026-11-10 이재헌 지시)
// 밤이 되면 마을 어디서든 그 자리 가까운 풀밭에 도라야키 이불(원작 소품)을 깔고, 그 속에서 머리만 내밀고 잔다
(function (root) {
  // 잘 수 있는 곳: 장소 바깥 둘레의 빈 풀밭 (장소 기준 [x, z]). 길이 닿지 않는 자리는 게임이 알아서 뺀다
  const SPOTS = {
    plaza: [[34, 10], [-30, 26]], pond: [[22, 4]], stage: [[0, 20]], weeding: [[-14, 22], [20, -30]], home: [[30, 18]],
    cave: [[18, 22]], hunt: [[-24, 6]], wilds: [[-30, -10]], market: [[0, 34]], shrine: [[28, 0]], castella: [[-20, 6]], pier: [[16, -14]],
  };
  const AS = root.ASSET_SOCKETS;
  const VO = root.VillageObjects;
  // 예전 "어딘가로 돌아가 자기"(비밀 동굴)는 없앤다
  const old = VO.LIST.findIndex(x => x.id === 'usagi.sleep');
  if (old >= 0) VO.LIST.splice(old, 1);
  delete VO.BY_ID['usagi.sleep'];
  for (const [place, list] of Object.entries(SPOTS)) {
    const so = AS[place] || (AS[place] = {});
    list.forEach(([x, z], i) => { so[`usagi_nap_${i + 1}`] = [x, z, 0, x + 1, z]; });
    const x = {
      id: `${place}.usagi_sleep`, place, name: '아무 데서나 도라야키 이불 덮고 자기', only: ['usagi'], night: true, shared: false,
      gain: { energy: 100 }, steps: [
        { socket: 'usagi_nap_*', act: 'idle', min: 1.5, clip: 'idle_stretch', prop: null, label: '도라야키 이불을 펴는 중' },
        { socket: 'usagi_nap_*', act: 'sleep', min: 420, clip: 'sleep_breathe', prop: null, label: '도라야키 이불 속에서 쿨쿨' },
      ],
    };
    VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
  }

  /* ---------- 도라야키 이불: 노릇한 빵 두 장 사이에 팥, 위 장을 이불처럼 덮는다 ---------- */
  function cake(r, top) {
    const g = new THREE.Group();
    const toon = c => new THREE.MeshToonMaterial({ color: c });
    // 가운데가 도톰한 빵: 위는 진한 갈색, 옆 테두리는 연한 노란 띠
    const prof = [[0, 0], [r * 0.7, 0.01], [r * 0.95, 0.06], [r, 0.12], [r * 0.95, 0.19], [r * 0.7, 0.24], [0, 0.26]];
    const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 36);
    const col = [];
    const pos = geo.attributes.position;
    const brown = new THREE.Color('#b9733a'), rim = new THREE.Color('#f2c46d'), dark = new THREE.Color('#9a5a2a');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), rr = Math.hypot(pos.getX(i), pos.getZ(i)) / r;
      const c = rr > 0.88 && y > 0.05 && y < 0.2 ? rim.clone() : (top === (y > 0.12) ? brown.clone().lerp(dark, 0.35 * (1 - rr)) : rim.clone().lerp(brown, 0.4));
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true }));
    m.add(new THREE.Mesh(geo, inkThin));
    g.add(m);
    if (top) {
      // 팥: 빵 사이로 살짝 비어져 나온 짙은 팥소
      const an = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.95, 0.07, 36), toon('#5b2a24'));
      an.position.y = -0.02;
      g.add(an);
    }
    return g;
  }
  const beds = new Map();
  const box = new THREE.Box3(), ctr = new THREE.Vector3(), size = new THREE.Vector3();
  function frame(sim, actors, scene) {
    if (!sim) return;
    for (const a of actors) {
      const c = a.c;
      if (c.id !== 'usagi') continue;
      const d = c.doing;
      const on = d && d.x && /\.usagi_sleep$/.test(d.x.id) && d.phase === 'use';
      let b = beds.get(c);
      if (on && !b) {
        b = new THREE.Group();
        const bottom = cake(0.95, false);
        const top = cake(0.92, true);
        top.name = 'top';
        b.add(bottom, top);
        scene.add(b);
        beds.set(c, b);
      }
      if (!b) continue;
      b.visible = !!on;
      if (!on) continue;
      // 깔기 단계에서는 바닥 빵만, 자는 동안에는 위 빵을 덮어 머리만 나온다
      // 누운 몸의 실제 범위를 재서, 아래 빵은 몸 밑 가운데에, 위 빵은 몸통을 덮고 머리(가장 높은 쪽 반대편)만 나오게
      const r = a.built.root;
      box.setFromObject(a.built.model);
      box.getCenter(ctr);
      box.getSize(size);
      const span = Math.max(size.x, size.z);
      b.position.set(ctr.x, r.position.y + 0.01, ctr.z);
      b.rotation.y = r.rotation.y;
      b.scale.setScalar(Math.max(0.8, span * 0.62));
      const top = b.getObjectByName('top');
      top.visible = d.step >= 1;
      top.position.set(0, Math.min(0.5, size.y * 0.42) / b.scale.x, 0.18);
      top.rotation.x = 0.1;
    }
  }
  root.UsagiSleep = { frame, SPOTS };
}(typeof self !== 'undefined' ? self : this));
