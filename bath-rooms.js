'use strict';

// 치이카와 심즈 — 온천과 사우나 내부
// 모형의 통은 몸이 잠겨 머리만 보여서, 안을 비우고 낮은 탕으로 다시 지었다.
// 탕은 걸어 들어가고, 물은 가슴 높이라 팔과 몸짓이 그대로 보인다.
// 물과 김은 움직이는 모델이라 길 지도와 좌석 높이 측정에 끼어들지 않는다
(function (root) {
  const WATER = { hot: '#9fd6e6', cold: '#c7ecff' };
  function waterDyn(api, id, x, y, z, w, d, color) {
    api.dyn(id, {
      x, y, z,
      idle(o, time) {
        o.data.surface.material.opacity = 0.6 + Math.sin(time * 1.4) * 0.05;
        o.data.rings.forEach((r, i) => {
          const k = (time * 0.35 + i / o.data.rings.length) % 1;
          r.scale.setScalar(0.3 + k * 1.4);
          r.material.opacity = (1 - k) * 0.5;
        });
        o.data.puffs.forEach((p, i) => {
          const k = (time * 0.22 + i / o.data.puffs.length) % 1;
          p.position.y = 0.1 + k * 2.3;
          p.position.x = p.userData.x + Math.sin(k * 5 + i) * 0.3;
          p.scale.setScalar(0.2 + k * 0.5);
          p.material.opacity = (1 - k) * (color === WATER.hot ? 0.34 : 0.14);
        });
      },
    }, (kit, o) => {
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
      surface.rotation.x = -Math.PI / 2;
      o.root.add(surface);
      o.data.surface = surface;
      o.data.rings = [0, 1, 2, 3].map(i => {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false }));
        r.rotation.x = -Math.PI / 2;
        r.position.set((i % 2 ? 1 : -1) * w * 0.22 * (1 + (i % 3) * 0.3), 0.01, (i < 2 ? 1 : -1) * d * 0.2);
        o.root.add(r);
        return r;
      });
      o.data.puffs = [0, 1, 2, 3, 4, 5].map(i => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
        p.userData.x = (i / 5 - 0.5) * w * 0.8;
        p.position.z = (i % 2 ? 1 : -1) * d * 0.25;
        o.root.add(p);
        return p;
      });
    });
  }
  // 앞쪽 가운데가 트인 낮은 탕
  function pool(k, F, cx, cz, w, d, stone, top) {
    const H = 0.62;
    const T = 0.5;
    const GAP = 2.6;
    k.box(cx, F + 0.03, cz, w, 0.06, d, '#7fb7c9', 0);
    k.box(cx, F + H / 2, cz - d / 2 + T / 2, w, H, T, stone, 1);
    k.box(cx - w / 2 + T / 2, F + H / 2, cz, T, H, d, stone, 1);
    k.box(cx + w / 2 - T / 2, F + H / 2, cz, T, H, d, stone, 1);
    const side = (w - GAP) / 2;
    k.box(cx - GAP / 2 - side / 2, F + H / 2, cz + d / 2 - T / 2, side, H, T, stone, 1);
    k.box(cx + GAP / 2 + side / 2, F + H / 2, cz + d / 2 - T / 2, side, H, T, stone, 1);
    k.box(cx - GAP / 2 - side / 2, F + H + 0.03, cz + d / 2 - T / 2, side + 0.1, 0.06, T + 0.14, top, 0);
    k.box(cx + GAP / 2 + side / 2, F + H + 0.03, cz + d / 2 - T / 2, side + 0.1, 0.06, T + 0.14, top, 0);
    k.box(cx, F + H + 0.03, cz - d / 2 + T / 2, w + 0.1, 0.06, T + 0.14, top, 0);
  }

  const FURNISH = {
    onsen(k, api, F) {
      k.box(0, F + 0.012, 0, 15.6, 0.02, 10.6, '#c8d6d4', 0);
      // 벽의 후지산 그림
      k.box(1.5, F + 2.5, -5.28, 10.4, 2.4, 0.08, '#bfe3f0', 0);
      k.cone(1.5, F + 2.3, -5.22, 2.6, 1.9, '#7f9ec2');
      k.cone(1.5, F + 3.1, -5.2, 0.92, 0.6, '#fffdf8');
      pool(k, F, 1.5, -2.3, 10, 5, '#a89f94', '#bdb5a9');
      waterDyn(api, 'pool_water', 1.5, F + 0.5, -2.3, 9, 4.2, WATER.hot);
      // 뒤쪽 바위에서 뜨거운 물이 떨어진다
      k.ball(1.5, F + 1, -4.55, 1, 0.75, 0.55, '#8f877c');
      k.cyl(1.5, F + 1.6, -4.3, 0.09, 0.5, '#b98f68');
      api.dyn('spout', {
        x: 1.5, y: F + 1.2, z: -4.05,
        idle(o, time) { o.data.m.scale.x = 1 + Math.sin(time * 14) * 0.15; },
      }, (kit, o) => {
        o.data.m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 8), new THREE.MeshBasicMaterial({ color: '#d7f2fb', transparent: true, opacity: 0.8 }));
        o.data.m.position.y = -0.3;
        o.root.add(o.data.m);
      });
      // 씻는 자리
      for (const z of [-3.6, -1.2, 1.2]) {
        k.cyl(-5.6, F + 0.18, z, 0.42, 0.36, '#e8b878', 1);
        k.cyl(-6.45, F + 0.16, z + 0.75, 0.28, 0.32, '#e9c46a', 1);
        k.box(-7.25, F + 1, z, 0.22, 0.12, 0.5, '#b4b0a6', 0);
        k.box(-7.42, F + 1.9, z, 0.06, 1, 0.85, '#d6eef5', 1);
      }
      // 수건 선반
      k.box(-7.2, F + 1, 4.3, 0.8, 2, 1.7, '#b98f68', 1);
      for (const [y, c] of [[0.5, '#fffdf8'], [1.2, '#f7c6d4'], [1.75, '#bfe3f0']]) k.ball(-6.9, F + y, 4.3, 0.34, 0.14, 0.62, c, 0);
      // 거품 통
      k.cyl(-1.8, F + 0.2, 3.1, 1.35, 0.4, '#e8c97c', 1);
      api.dyn('foam', {
        x: -1.8, y: F + 0.42, z: 3.1,
        idle(o, time) { o.data.balls.forEach((b, i) => { b.position.y = 0.08 + Math.sin(time * 2 + i * 1.3) * 0.05; }); },
      }, (kit, o) => {
        const mat = new THREE.MeshToonMaterial({ color: '#fbfdff' });
        o.data.balls = [];
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.3 + (i % 3) * 0.08, 10, 8), mat);
          m.position.set(Math.cos(a) * 0.95, 0.08, Math.sin(a) * 0.95);
          o.root.add(m);
          o.data.balls.push(m);
        }
      });
      // 우유 냉장고
      k.box(6.95, F + 1.15, 3.4, 1.2, 2.3, 1.3, '#f4efe4', 2);
      k.box(6.33, F + 1.35, 3.4, 0.04, 1.5, 1, '#bfe3f0', 1);
      for (const y of [0.8, 1.4, 1.95]) {
        k.box(6.4, F + y - 0.14, 3.4, 0.08, 0.05, 1, '#c9c0ac', 0);
        for (const z of [3.05, 3.4, 3.75]) k.cyl(6.34, F + y, z, 0.075, 0.26, '#fffdf8', 0);
      }
    },
    sauna(k, api, F) {
      k.box(0, F + 0.012, 0, 13.4, 0.02, 9.4, '#c9a57c', 0);
      // 사우나 칸: 앞은 트여 있어 앉은 모습이 보인다
      k.box(-2.7, F + 1.5, -4.5, 7.6, 3, 0.16, '#8c6a50', 1);
      k.box(0.95, F + 1.5, -2.5, 0.16, 3, 4, '#8c6a50', 1);
      k.box(-2.7, F + 0.22, -2.1, 7, 0.44, 1.1, '#b98f68', 1);
      k.box(-2.7, F + 0.45, -3.4, 7, 0.9, 1.5, '#a97c50', 1);
      k.box(-2.7, F + 0.93, -3.5, 7, 0.08, 1.3, '#b98f68', 0);
      // 난로와 돌
      k.box(-5.8, F + 0.5, -0.4, 1.3, 1, 1.3, '#6f6258', 1);
      for (const [x, z] of [[-6.1, -0.7], [-5.5, -0.7], [-6.1, -0.1], [-5.5, -0.1], [-5.8, -0.4]]) k.ball(x, F + 1.14, z, 0.3, 0.2, 0.3, '#8f8c88', 0);
      api.dyn('stove_heat', {
        x: -5.8, y: F + 1.3, z: -0.4,
        idle(o, time) {
          o.data.list.forEach((p, i) => {
            const u = (time * 0.5 + i / 4) % 1;
            p.position.set(Math.sin(u * 7 + i) * 0.3, u * 1.6, 0);
            p.scale.setScalar(0.12 + u * 0.3);
            p.material.opacity = (1 - u) * 0.4;
          });
        },
      }, (kit, o) => {
        o.data.list = [0, 1, 2, 3].map(() => {
          const p = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe9c8', transparent: true, opacity: 0.3, depthWrite: false }));
          o.root.add(p);
          return p;
        });
      });
      // 온도계
      k.cyl(0.2, F + 2.1, -4.38, 0.26, 0.05, '#fffdf8', 1).rotation.x = Math.PI / 2;
      // 냉탕
      pool(k, F, 4.1, -2.4, 4.4, 4, '#9fb0b8', '#b9c7cd');
      waterDyn(api, 'cold_water', 4.1, F + 0.5, -2.4, 3.5, 3.1, WATER.cold);
      // 쉬는 의자
      for (const x of [2.7, 5.3]) {
        k.box(x, F + 0.36, 2.6, 1.3, 0.12, 1.9, '#e8c97c', 1);
        k.box(x, F + 0.85, 1.72, 1.3, 1, 0.14, '#e8c97c', 1);
        for (const [dx, dz] of [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0.8], [0.5, 0.8]]) k.box(x + dx, F + 0.16, 2.6 + dz, 0.1, 0.32, 0.1, '#a98a66', 0);
      }
      // 샤워
      k.cyl(-4.6, F + 1.3, 1.2, 0.07, 2.6, '#b4b0a6');
      k.box(-4.6, F + 2.6, 1.8, 0.1, 0.1, 1.3, '#b4b0a6', 0);
      k.cyl(-4.6, F + 2.48, 2.4, 0.3, 0.1, '#d9d7d0', 1);
      k.cyl(-4.6, F + 0.05, 2.5, 1, 0.04, '#dfe9ec', 0);
    },
  };
  root.INTERIOR_FURNISH = FURNISH;
  const stand = [];
  void stand;
  // 정식집 주문은 카운터 바로 앞이 가려져 한 걸음 떨어져서 한다
  root.ASSET_SOCKETS.umaiya.order_front = [0, 1.7, 0.24, 0, -2.8];
  root.ASSET_SOCKETS.onsen = {
    towel_stand: [-6.1, 4.3, 0.22, -7.2, 4.3],
    wash_sit_1: [-5.6, -3.6, 0.56, -7.4, -3.6],
    wash_sit_2: [-5.6, -1.2, 0.56, -7.4, -1.2],
    wash_sit_3: [-5.6, 1.2, 0.56, -7.4, 1.2],
    soak_1: [-1.2, -3.4, 0.26, -1.2, 2],
    soak_2: [1.5, -2.6, 0.26, 1.5, 2],
    soak_3: [4.2, -3.4, 0.26, 4.2, 2],
    soak_4: [-2.2, -1.2, 0.26, 2, -1.2],
    soak_5: [5.2, -1.2, 0.26, 1, -1.2],
    bubble_play: [-1.8, 3.1, 0.62, -1.8, 6],
    milk_stand: [5.5, 3.4, 0.22, 6.9, 3.4],
  };
  root.ASSET_SOCKETS.sauna = {
    sauna_sit_1: [-5, -2.1, 0.66, -5, 2],
    sauna_sit_2: [-2.7, -2.1, 0.66, -2.7, 2],
    sauna_sit_3: [-0.5, -2.1, 0.66, -0.5, 2],
    cold_soak: [4.1, -2.6, 0.26, 4.1, 2],
    rest_sit_1: [2.7, 2.6, 0.62, 2.7, 6],
    rest_sit_2: [5.3, 2.6, 0.62, 5.3, 6],
    shower_stand: [-4.6, 2.5, 0.22, -4.6, 5],
    sign_gag: [0.2, 3.7, 0.22, 0.2, 2.6],
  };
}(typeof self !== 'undefined' ? self : this));
