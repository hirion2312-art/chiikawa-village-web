'use strict';

// 치이카와 심즈 — 몸만 움직이던 상호작용에 사물 반응 더하기 (2026-11-11 이재헌 지시)
// 문 두드리기 → 두드릴 때마다 문 앞에 "똑똑" 울림이 퍼진다
// 광장 버스킹 → 앞에 놓은 모자에 동전이 날아 들어와 쌓이고, 노래하는 동안 음표가 뜬다
// 장작 주워 모으기 → 장작 더미에서 한 개씩 집어 올려 품으로 가져오고, 더미가 줄어든다
// 물가 구경 → 물을 건드리거나 들여다보면 물결이 동그랗게 번진다
// scene-acts.js와 같은 규칙: 원점은 대상 지점, +Z는 캐릭터 쪽. run(d, t, u, ctx)
(function (root) {
  const { part, sph, cyl, box, torus, FLAT } = root.PropModels.kit;
  const FX = root.ActFx.FX;
  const G = parent => { const g = new THREE.Group(); parent.add(g); return g; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const add = (name, def) => { FX[`s_${name}`] = def; };
  const fade = color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });

  /* 문 두드리기: 문 높이에서 반원 울림 셋이 번진다 (두드리는 박자마다) */
  add('knock', {
    top: false,
    make(g) {
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 4, 18, Math.PI), fade('#fffaf0'));
        m.position.set(0, 1.05, 0.25);
        g.add(m);
        rings.push(m);
      }
      const marks = [-1, 1].map(s => { const m = part(g, box(0.04, 0.16, 0.02), '#5a3b33', s * 0.32, 1.35, 0.25, 0, 0, s * 0.5, false); m.visible = false; return m; });
      return { rings, marks };
    },
    run(d, t, u, c) {
      const on = c.clip === 'knock_door';
      const beat = (t * 2.2) % 1;
      d.rings.forEach((m, i) => {
        const k = clamp(beat * 1.6 - i * 0.25);
        m.visible = on && k > 0 && k < 1;
        m.scale.setScalar(0.6 + k * 1.8);
        m.material.opacity = (1 - k) * 0.85;
      });
      d.marks.forEach(m => { m.visible = on && beat < 0.35; });
    },
  });

  /* 버스킹: 뒤집어 놓은 모자, 날아 들어오는 동전, 떠오르는 음표 */
  add('busk', {
    top: false,
    make(g) {
      const hat = G(g);
      hat.position.set(0, 0.1, 0.7);
      part(hat, cyl(0.32, 0.32, 0.03, 20), '#5a3b33', 0, 0.015, 0);
      part(hat, cyl(0.2, 0.18, 0.18, 18, 1, true), '#5a3b33', 0, 0.1, 0);
      part(hat, cyl(0.205, 0.205, 0.04, 18), '#c8463c', 0, 0.16, 0, 0, 0, 0, false);
      const pile = [];
      for (let i = 0; i < 9; i++) pile.push(part(hat, cyl(0.04, 0.04, 0.012, 12), '#e3bb4a', Math.cos(i * 2.3) * 0.09, 0.05 + Math.floor(i / 3) * 0.014, Math.sin(i * 2.3) * 0.09, 0, 0, 0, false));
      const fly = part(g, cyl(0.04, 0.04, 0.012, 12), '#e3bb4a', 0, 0, 0, 0, 0, 0, false);
      const notes = [];
      for (let i = 0; i < 3; i++) {
        const n = G(g);
        part(n, sph(0.06, 10, 8), '#5a3b33', 0, 0, 0, 0, 0, 0, false).scale.set(1.2, 0.9, 0.6);
        part(n, box(0.02, 0.26, 0.02), '#5a3b33', 0.06, 0.13, 0, 0, 0, 0, false);
        part(n, box(0.1, 0.03, 0.02), '#5a3b33', 0.1, 0.25, 0, 0, 0, -0.4, false);
        notes.push(n);
      }
      return { pile, fly, notes };
    },
    run(d, t, u, c) {
      const coins = Math.round(clamp(c.all) * d.pile.length);
      d.pile.forEach((m, i) => { m.visible = i < coins; });
      // 동전 던지기 단계: 구경꾼 쪽(뒤)에서 모자로 포물선을 그리며 떨어진다
      const k = (t * 0.9) % 1;
      d.fly.visible = c.clip === 'coin_toss';
      d.fly.position.set(Math.sin(t) * 0.4, 0.15 + Math.sin(k * Math.PI) * 1.2, -1.2 + k * 1.9);
      d.fly.rotation.x = t * 12;
      d.notes.forEach((n, i) => {
        const p = (t * 0.45 + i / 3) % 1;
        n.visible = c.clip === 'sing_mic';
        n.position.set(Math.sin(p * 6 + i) * 0.4, 1.5 + p * 1.2, 0.9);
        n.scale.setScalar(0.6 + Math.sin(p * Math.PI) * 0.6);
      });
    },
  });

  /* 장작 주워 모으기: 캐릭터 발밑 기준(rel), 대상 쪽에 장작 더미. 하나씩 들려 품으로 온다 */
  add('firewood', {
    rel: true,
    make(g) {
      const pile = [];
      for (let i = 0; i < 9; i++) {
        const m = part(g, cyl(0.06, 0.07, 0.7, 8), i % 2 ? '#8a5a3c' : '#a06e4a', 0, 0, 0, FLAT, 0, 0);
        pile.push(m);
      }
      const held = part(g, cyl(0.06, 0.07, 0.7, 8), '#8a5a3c', 0, 0, 0, FLAT, 0, 0);
      const bundle = [];
      for (let i = 0; i < 4; i++) bundle.push(part(g, cyl(0.05, 0.05, 0.55, 8), '#a06e4a', 0, 0, 0, FLAT, 0.4, 0, false));
      return { pile, held, bundle };
    },
    run(d, t, u, c) {
      const D = Math.min(1.6, c.D || 1.2);
      const taken = Math.floor(clamp(c.all) * 6);
      d.pile.forEach((m, i) => {
        m.visible = i >= taken;
        m.position.set(((i % 3) - 1) * 0.16, 0.07 + Math.floor(i / 3) * 0.12, D + (i % 2) * 0.05);
        m.rotation.set(FLAT, 0, (i % 3) * 0.2 - 0.2);
      });
      // 한 번 집을 때마다: 더미에서 들어 올려 가슴 앞으로
      const k = ease((t * 0.55) % 1);
      d.held.visible = c.clip === 'gather_pick';
      d.held.position.set(0, 0.1 + Math.sin(k * Math.PI) * 0.5 + k * 0.4, D * (1 - k) + 0.35 * k);
      d.held.rotation.set(FLAT, k * 1.2, 0);
      // 품에 모인 장작
      d.bundle.forEach((m, i) => { m.visible = i < Math.min(4, taken); m.position.set(0.05 - i * 0.03, 0.55 + i * 0.05, 0.38); });
    },
  });

  /* 물가: 물결 고리 셋이 번지고, 손을 담그면 물방울이 튄다 */
  add('ripple', {
    top: false,
    make(g) {
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 32), fade('#eaf8ff'));
        m.rotation.x = -FLAT;
        m.position.set(0, 0.12, 0);
        g.add(m);
        rings.push(m);
      }
      const drops = [];
      for (let i = 0; i < 5; i++) { const m = part(g, sph(0.035, 8, 6), '#bfe2f2', 0, 0, 0, 0, 0, 0, false); m.visible = false; drops.push(m); }
      return { rings, drops };
    },
    run(d, t, u, c) {
      d.rings.forEach((m, i) => {
        const k = (t * 0.4 + i / 3) % 1;
        m.scale.setScalar(0.4 + k * 4);
        m.material.opacity = (1 - k) * 0.6;
      });
      const splash = c.clip === 'poke_touch';
      d.drops.forEach((m, i) => {
        const k = (t * 1.3 + i * 0.2) % 1;
        m.visible = splash;
        const a = i * 1.26;
        m.position.set(Math.cos(a) * k * 0.35, 0.12 + Math.sin(k * Math.PI) * 0.35, Math.sin(a) * k * 0.35);
      });
    },
  });

  /* 어느 상호작용에 붙이는가 (장소, 이름) */
  const MAP = [
    [/./, /문 두드리기/, 's_knock'],
    [/^plaza$/, /버스킹/, 's_busk'],
    [/^yamanba$/, /장작/, 's_firewood'],
    [/^(pond|misoBank|pier)$/, /연못 구경|물에 비친|물가 살펴|강 내려다|바다 구경|배에 앉아/, 's_ripple'],
  ];
  const key0 = root.SceneActs.key;
  root.SceneActs.key = (x, st) => {
    const m = MAP.find(([p, re]) => p.test(x.place) && re.test(x.name));
    return m ? m[2] : key0(x, st);
  };
}(typeof self !== 'undefined' ? self : this));
