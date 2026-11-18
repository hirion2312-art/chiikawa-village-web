'use strict';

// 치이카와 심즈 — 발 받침 (2026-11-10 이재헌 지시)
// 캐릭터는 키가 작아 높은 카운터 뒤에 서면 얼굴이 가려진다. 서는 자리 앞을 재서 얼굴이 가리는 곳에만
// 목재 발 받침을 놓고, 그 자리의 높이를 받침 위로 올린다. 길 지도를 만들기 전에 놓는다
(function (root) {
  const WANT = /stand|staff|counter|order_front|checkout|window/;
  const SKIP = /_sit|sit_|look|door|sign|line_|lie|bed|soak|rack|mirror|pull|fight|enter|gather|cart|parking|tower/;
  const FACE = 1;          // 서 있을 때 얼굴 높이
  const WOOD = '#c79a63', DARK = '#a97c50', INK = '#4a3230';
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const ray = new THREE.Raycaster();
  const DOWN = new THREE.Vector3(0, -1, 0);

  function plank(group, w, h, d, color, x, y, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color }));
    m.position.set(x, y, z);
    m.castShadow = true;
    const ink = new THREE.Mesh(geo, inkMat);
    ink.scale.set(1 + 0.05 / w, 1 + 0.05 / h, 1 + 0.05 / d);
    m.add(ink);
    group.add(m);
    return m;
  }
  function build(h) {
    const g = new THREE.Group();
    plank(g, 1.06, 0.1, 1.06, WOOD, 0, h - 0.05, 0);
    for (let i = -1; i <= 1; i++) plank(g, 1, 0.012, 0.03, DARK, 0, h + 0.006, i * 0.26);
    for (const s of [-1, 1]) plank(g, 0.1, h - 0.1, 0.96, DARK, s * 0.44, (h - 0.1) / 2, 0);
    // 높은 받침은 뒤쪽에 한 칸 더
    if (h > 0.45) plank(g, 0.9, 0.08, 0.34, WOOD, 0, h * 0.5, 0.66);
    if (h > 0.45) for (const s of [-1, 1]) plank(g, 0.08, h * 0.5 - 0.04, 0.3, DARK, s * 0.38, (h * 0.5 - 0.04) / 2, 0.66);
    return g;
  }
  // 소켓 표에 들어 있는 자리를 경로와 함께 모은다 (market의 takoyaki.order_front처럼 묶인 것 포함)
  function collect(data, prefix, out) {
    for (const [name, v] of Object.entries(data || {})) {
      if (Array.isArray(v)) out.push({ name: prefix + name, arr: v });
      else if (v && typeof v === 'object') collect(v, `${prefix}${name}.`, out);
    }
  }

  root.FootStools = {
    report: [],
    at: new Set(),
    key: (x, z) => `${Math.round(x * 4)},${Math.round(z * 4)}`,
    has(sk) { return this.at.has(this.key(sk.x, sk.z)); },
    apply(scene, world) {
      scene.updateMatrixWorld(true);
      const solids = [];
      scene.traverse(o => {
        if (!o.isMesh || o.isSprite || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (m && m.side === THREE.BackSide) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
        if (r > 60) return;
        solids.push({ o, r, c: o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld) });
      });
      for (const p of world.places) {
        const list = [];
        collect((root.ASSET_SOCKETS || {})[p.id], '', list);
        if (!list.length) continue;
        const near = solids.filter(s => Math.hypot(s.c.x - p.x, s.c.z - p.z) < s.r + (p.r || 10) * 2.2 + 12).map(s => s.o);
        const th = ((p.face || 0) * Math.PI) / 2;
        const W = (lx, lz) => ({ x: p.x + lx * Math.cos(th) + lz * Math.sin(th), z: p.z - lx * Math.sin(th) + lz * Math.cos(th) });
        for (const { name, arr } of list) {
          if (!WANT.test(name) || SKIP.test(name) || arr[2] > 0.3) continue;
          const at = W(arr[0], arr[1]);
          const look = W(arr[3], arr[4]);
          const len = Math.hypot(look.x - at.x, look.z - at.z);
          if (len < 0.2) continue;
          const dx = (look.x - at.x) / len;
          const dz = (look.z - at.z) / len;
          const floor = world.floorAt(at.x, at.z);
          // 앞으로 1.6칸 안에서 가장 높은 면을 잰다 (벽처럼 높은 것은 받침으로 해결되지 않으니 뺀다)
          let top = 0;
          for (let d = 0.45; d <= 1.6; d += 0.15) {
            ray.set(new THREE.Vector3(at.x + dx * d, floor + 2.3, at.z + dz * d), DOWN);
            ray.far = 2.3;
            const hit = ray.intersectObjects(near, false)[0];
            if (hit) top = Math.max(top, hit.point.y - floor);
          }
          if (top < 1.15 || top > 2.1) continue;
          const h = Math.round(Math.max(0.3, Math.min(0.8, top + 0.25 - FACE)) * 20) / 20;
          arr[2] = h;
          const stool = build(h);
          stool.position.set(at.x, floor, at.z);
          stool.rotation.y = Math.atan2(dx, dz);
          scene.add(stool);
          this.at.add(this.key(at.x, at.z));
          this.report.push(`${p.id}/${name} 앞 ${top.toFixed(2)} → 받침 ${h}`);
        }
      }
      return this.report;
    },
  };
}(typeof self !== 'undefined' ? self : this));
