'use strict';

// 치이카와 심즈 — 물건의 반응 (건물 안팎 전 상호작용 공통)
// 캐릭터가 어떤 동작을 하는 동안 그 자리의 대상(소켓이 바라보는 점)에서 벌어지는 일을 그린다.
// 모니터가 깜빡이고, 찌가 물에 뜨고, 뽑은 풀이 튀어 오르고, 탕에 거품이 오른다.
// 모형이 한 덩어리로 합쳐져 있어 대상 자체를 움직일 수 없는 곳은 대상 앞에 효과를 얹는다.
// 자판기·그릇처럼 개별 모델이 있는 것은 interiors의 fx 클립이 맡는다
(function (root) {
  const glyphCache = new Map();
  function glyphMat(text, color) {
    const key = text + color;
    if (!glyphCache.has(key)) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      g.font = '700 70px "Segoe UI Symbol", "Malgun Gothic", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 8;
      g.strokeStyle = '#fffdf6';
      g.strokeText(text, 48, 50);
      g.fillStyle = color;
      g.fillText(text, 48, 50);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      glyphCache.set(key, new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    }
    return glyphCache.get(key).clone();
  }
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xfbfbf6, transparent: true, opacity: 0.85, depthWrite: false });
  const ballGeo2 = new THREE.SphereGeometry(1, 10, 8);
  const basic = c => new THREE.MeshBasicMaterial({ color: c });
  const ball = (group, color, r) => {
    const m = new THREE.Mesh(ballGeo2, typeof color === 'string' ? basic(color) : color);
    m.scale.setScalar(r);
    group.add(m);
    return m;
  };
  const box = (group, color, w, h, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic(color));
    group.add(m);
    return m;
  };
  const glyph = (group, text, color, s) => {
    const m = new THREE.Sprite(glyphMat(text, color));
    m.scale.set(s, s, 1);
    group.add(m);
    return m;
  };
  const rising = (list, t, x, y, h, spread = 0.2, base = 0.2) => list.forEach((m, i) => {
    const k = (t * 0.6 + i / list.length) % 1;
    m.position.set(x + Math.sin(k * 6 + i) * spread, y + k * h, 0);
    if (m.isSprite) {
      m.material.opacity = Math.min(1, (1 - k) * 2);
    } else {
      m.scale.setScalar(base * (0.7 + k));
    }
  });

  const NO_OBJ = { type: 'poke', browse: 'gaze', read: 'gaze', work: 'poke', carry: null, weigh: null };
  // 효과 표. make(g) → data, run(data, t, u). g의 원점은 대상 지점, +z는 캐릭터 쪽
  const FX = {
    type: {
      make(g) { return { glow: box(g, '#bfe6f7', 1.3, 0.85, 0.03), bar: box(g, '#5b7f99', 0.8, 0.06, 0.03) }; },
      run(d, t) {
        d.glow.position.set(0, 2.3, 0);
        d.glow.material.color.setHSL(0.55, 0.7, 0.8 + Math.sin(t * 9) * 0.05);
        d.bar.position.set(-0.3 + (t % 1) * 0.5, 2.1 + Math.floor(t * 2) % 3 * 0.15, 0.04);
      },
    },
    browse: {
      make(g) { return { item: box(g, '#f3a9bd', 0.5, 0.6, 0.3) }; },
      run(d, t) {
        const k = (t % 4) / 4;
        const up = k > 0.5 && k < 0.82 ? Math.sin(((k - 0.5) / 0.32) * Math.PI) : 0;
        d.item.position.set(0, 1.55 + up * 0.35, 0.1 + up * 0.5);
        d.item.rotation.y = up * 1.2 + Math.sin(t * 2) * 0.05;
      },
    },
    talk: {
      make(g) { return { dots: [glyph(g, '…', '#7a5245', 0.8)] }; },
      run(d, t) { d.dots[0].position.set(0, 2.5 + Math.sin(t * 4) * 0.08, 0); },
    },
    read: {
      make(g) { return { page: box(g, '#fffaf0', 0.5, 0.02, 0.7) }; },
      run(d, t) {
        const k = (t % 4.2) / 4.2;
        const flip = k > 0.72 && k < 0.88 ? (k - 0.72) / 0.16 : 0;
        d.page.position.set(0.1, 1.45 + Math.sin(flip * Math.PI) * 0.2, 0.9);
        d.page.rotation.z = flip * Math.PI;
      },
    },
    fish: {
      make(g) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2;
        g.add(ring);
        return { float: ball(g, '#e8634f', 0.16), ring };
      },
      run(d, t) {
        const k = (t % 2) / 2;
        const bite = (t % 5) > 3.6 && (t % 5) < 4.2;
        d.float.position.set(0, 0.12 + Math.sin(t * 2) * 0.03 - (bite ? 0.12 : 0), -5);
        d.ring.position.set(0, 0.06, -5);
        d.ring.scale.setScalar(0.6 + k * 2);
        d.ring.material.opacity = 1 - k;
      },
    },
    weed: {
      make(g) {
        const tuft = ball(g, '#93c97c', 0.26);
        tuft.scale.set(0.2, 0.42, 0.2);
        return { tuft, dirt: [ball(g, '#a68a66', 0.08), ball(g, '#a68a66', 0.06)] };
      },
      run(d, t) {
        const k = (t % 2.2) / 2.2;
        const out = k > 0.5 ? Math.min(1, (k - 0.5) / 0.3) : 0;
        d.tuft.position.set(0, 0.3 + Math.sin(out * Math.PI) * 1.1, out * 0.9);
        d.tuft.rotation.x = out * 5;
        d.dirt.forEach((m, i) => {
          m.visible = out > 0 && out < 1;
          m.position.set((i ? 1 : -1) * out * 0.5, Math.sin(out * Math.PI) * 0.6, 0);
        });
      },
    },
    carry: {
      make(g) { const m = []; for (let i = 0; i < 4; i++) { const b = ball(g, '#a7d38a', 0.3); b.position.set(i * 0.25 - 0.4, 0.3 + (i % 2) * 0.2, 0); m.push(b); } return { m }; },
      run(d, t, u) { d.m.forEach((b, i) => { b.visible = u > i * 0.2; }); },
    },
    pray: {
      make(g) {
        const pivot = new THREE.Group();
        pivot.position.y = 4;
        g.add(pivot);
        const rope = box(pivot, '#d6776a', 0.08, 2, 0.08);
        rope.position.y = -1;
        const bell = ball(pivot, '#e3cf88', 0.3);
        bell.position.y = -2.2;
        return { pivot, sparks: [glyph(g, '✦', '#e3bb4a', 0.4), glyph(g, '✦', '#e3bb4a', 0.3)] };
      },
      run(d, t) {
        d.pivot.rotation.z = Math.sin(t * 5) * 0.22;
        rising(d.sparks, t, 0, 1.6, 1.4, 0.5);
      },
    },
    work: {
      make(g) { return { lemon: ball(g, '#f2dd64', 0.34), sticker: box(g, '#fffdf6', 0.22, 0.22, 0.02) }; },
      run(d, t) {
        const k = (t % 1.6) / 1.6;
        d.lemon.position.set(0, 1.5 + (k > 0.5 && k < 0.6 ? -0.04 : 0), 0);
        d.lemon.rotation.y = Math.floor(t / 1.6) * 1.2;
        d.sticker.visible = k > 0.5;
        d.sticker.position.set(0, 1.5, 0.35);
      },
    },
    confront: {
      make(g) { return { star: glyph(g, '★', '#e8634f', 0.8), dummy: new THREE.Vector3() }; },
      run(d, t) {
        const k = (t % 1.4) / 1.4;
        d.star.visible = k > 0.5 && k < 0.72;
        d.star.position.set(Math.sin(t) * 0.2, 1.7, 0.3);
        d.star.material.rotation = t * 3;
      },
    },
    brave: {
      make(g) { return { dust: [ball(g, puffMat, 0.2), ball(g, puffMat, 0.2)] }; },
      run(d, t) { d.dust.forEach((m, i) => { const k = (t * 1.4 + i * 0.5) % 1; m.position.set((i ? 1 : -1) * (0.4 + k * 0.5), 0.15 + k * 0.3, 1.8); m.scale.setScalar(0.1 + k * 0.2); }); },
    },
    wipe: {
      make(g) { const list = []; for (let i = 0; i < 4; i++) list.push(ball(g, puffMat, 0.12)); return { list }; },
      run(d, t) { rising(d.list, t, 0, 1, 1.2, 0.6, 0.1); d.list.forEach(m => { m.position.z = 1.8; }); },
    },
    bath: {
      make(g) {
        const list = [];
        for (let i = 0; i < 5; i++) list.push(ball(g, puffMat, 0.2));
        const bubbles = [];
        for (let i = 0; i < 4; i++) bubbles.push(ball(g, puffMat, 0.08));
        return { list, bubbles };
      },
      run(d, t) {
        rising(d.list, t, 0, 1.9, 1.6, 0.5, 0.2);
        d.list.forEach(m => { m.position.z = 2; });
        d.bubbles.forEach((m, i) => { const k = (t * 1.2 + i * 0.25) % 1; m.position.set(Math.cos(i * 1.7) * 0.9, 1.35 + k * 0.1, 2 + Math.sin(i * 1.7) * 0.9); m.scale.setScalar(0.05 + k * 0.1); });
      },
    },
    eat: {
      make(g) { const list = []; for (let i = 0; i < 3; i++) list.push(ball(g, puffMat, 0.14)); return { list }; },
      run(d, t) { rising(d.list, t, 0, 2.1, 1, 0.12, 0.12); d.list.forEach(m => { m.position.z = 1.5; }); },
    },
    drink: {
      make(g) { const list = []; for (let i = 0; i < 2; i++) list.push(ball(g, puffMat, 0.1)); return { list }; },
      run(d, t) { rising(d.list, t, 0, 2, 0.7, 0.08, 0.08); d.list.forEach(m => { m.position.z = 1.5; }); },
    },
    pour: {
      make(g) {
        const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), new THREE.MeshBasicMaterial({ color: 0xc9a56a, transparent: true, opacity: 0.85 }));
        g.add(stream);
        return { stream };
      },
      run(d, t) { d.stream.position.set(0, 1.7, 1.2); d.stream.scale.y = 1 + Math.sin(t * 12) * 0.04; },
    },
    poke: {
      make(g) { return { list: [glyph(g, '✦', '#e3bb4a', 0.4)] }; },
      run(d, t) { rising(d.list, t * 2, 0, 1.6, 0.6, 0.3); },
    },
    sleep: {
      make(g) { return { list: [glyph(g, 'Z', '#7f8fb8', 0.5), glyph(g, 'z', '#7f8fb8', 0.36), glyph(g, 'z', '#7f8fb8', 0.28)] }; },
      run(d, t) { rising(d.list, t * 0.6, 0, 2.2, 1.4, 0.3); },
    },
    dance: {
      make(g) { return { list: [glyph(g, '♪', '#e8748e', 0.5), glyph(g, '♫', '#6fb3e0', 0.5)] }; },
      run(d, t) { rising(d.list, t, 0, 2.4, 1.3, 0.8); },
    },
    sway: { make: g => FX.dance.make(g), run: (d, t) => FX.dance.run(d, t) },
    play: {
      make(g) { return { list: [glyph(g, '★', '#f2c230', 0.42), glyph(g, '✦', '#f2748e', 0.36), glyph(g, '★', '#6fb3e0', 0.3)] }; },
      run(d, t) { rising(d.list, t, 0, 2, 1.4, 1); },
    },
    peek: {
      make(g) { return { mark: glyph(g, '!', '#e8634f', 0.7) }; },
      run(d, t, u) { d.mark.position.set(0, 2.8 + Math.abs(Math.sin(t * 4)) * 0.2, 1.6); d.mark.visible = u < 0.5; },
    },
    pose: {
      make(g) { return { list: [glyph(g, '✦', '#e3bb4a', 0.5), glyph(g, '✦', '#f2748e', 0.34)] }; },
      run(d, t) { rising(d.list, t, 0, 2.2, 1, 0.9); },
    },
    gaze: {
      make(g) { return { list: [glyph(g, '…', '#7a5245', 0.5)] }; },
      run(d, t, u) { d.list[0].position.set(0, 2.8, 1.8); d.list[0].visible = u < 0.3; },
    },
    // 수다: 하트는 뺐다 (2026-11-17). 무엇에 대해 떠드는지는 chat-bubbles.js의 그림 말풍선이 보여 준다
    friend: {
      make() { return {}; },
      run() {},
    },
  };
  // 공부: 머리 위로 물음표가 맴돌다 느낌표로 바뀐다
  FX.study = {
    make(g) { return { q: glyph(g, '?', '#7f8fb8', 0.55), bang: glyph(g, '!', '#e8634f', 0.65) }; },
    run(d, t) {
      const k = (t % 7) / 7;
      const idea = k > 0.78 && k < 0.92;
      d.q.visible = k > 0.3 && k < 0.65;
      d.bang.visible = idea;
      d.q.position.set(Math.sin(t * 2) * 0.3, 3, 1.6);
      d.bang.position.set(0, 3.1 + Math.abs(Math.sin(t * 8)) * 0.15, 1.6);
    },
  };
  // 나무가 흔들리면 잎이 떨어진다 (대상은 나무 줄기)
  FX.shake = {
    make(g) { return { list: [0, 1, 2, 3, 4].map(i => glyph(g, '🍃', '#7fb069', 0.42 + (i % 2) * 0.1)) }; },
    run(d, t) {
      d.list.forEach((m, i) => {
        const k = (t * 0.55 + i / 5) % 1;
        m.position.set(Math.sin(i * 2.4 + k * 5) * (1.2 + (i % 3) * 0.6), 6.4 - k * 5.8, Math.cos(i * 1.7 + k * 4) * 1.2);
        m.material.opacity = Math.min(1, (1 - k) * 4);
      });
    },
  };
  // 가로등이 깜빡이며 불빛이 맺힌다
  FX.lamp = {
    make(g) { return { list: [glyph(g, '✦', '#ffd76a', 1.1), glyph(g, '✦', '#fff2b8', 0.5)] }; },
    run(d, t) {
      d.list[0].position.set(0, 6.95, 0);
      d.list[0].material.opacity = 0.55 + Math.sin(t * 6) * 0.35;
      d.list[1].position.set(Math.sin(t * 1.3) * 0.7, 7.4 + Math.sin(t * 2) * 0.2, 0);
    },
  };
  FX.smell = {
    make(g) { return { list: [glyph(g, '🌸', '#f3a9bd', 0.36), glyph(g, '♪', '#f2748e', 0.36), glyph(g, '🌸', '#f7c6d4', 0.28)] }; },
    run(d, t) { rising(d.list, t, 0, 1.6, 1.5, 0.5); },
  };
  FX.knock = {
    make(g) { return { list: [glyph(g, '똑', '#7a5245', 0.5), glyph(g, '똑', '#7a5245', 0.42)] }; },
    run(d, t) {
      const k = t % 1.5;
      d.list[0].visible = k < 0.5;
      d.list[1].visible = k > 0.4 && k < 0.9;
      d.list[0].position.set(-0.3, 2.2, 0.5);
      d.list[1].position.set(0.35, 2.5, 0.5);
    },
  };
  FX.cook = {
    make(g) { return { list: [ball(g, puffMat, 0.2), ball(g, puffMat, 0.16), ball(g, puffMat, 0.13)] }; },
    run(d, t) { rising(d.list, t, 0, 1.4, 1.5, 0.25, 0.16); },
  };
  FX.warm = {
    make(g) { return { list: [glyph(g, '🔥', '#e8634f', 0.7), glyph(g, '✦', '#f2c230', 0.3)] }; },
    run(d, t) { d.list[0].position.set(0, 1 + Math.sin(t * 9) * 0.06, 0); rising([d.list[1]], t, 0, 1.2, 1.5, 0.4); },
  };
  // 몸 둘레에서 일어나는 효과 (self)
  const selfFx = (make, run) => ({ self: true, make, run });
  const drop = (m, k, x, top, bottom, z = 0.4) => {
    m.position.set(x, top + (bottom - top) * k, z);
    m.material.opacity = Math.min(1, (1 - k) * 3);
  };
  FX.soak = selfFx(g => ({ list: [glyph(g, '♨', '#e6a79a', 0.5), glyph(g, '～', '#ffffff', 0.5)] }), (d, t) => rising(d.list, t, 0, 1.4, 1.2, 0.5));
  FX.splash = selfFx(g => ({ list: [0, 1, 2, 3].map(() => glyph(g, '💧', '#6fb3e0', 0.28)) }), (d, t) => d.list.forEach((m, i) => {
    const k = (t * 1.1 + i / 4) % 1;
    m.position.set(Math.sin(i * 1.6) * (0.3 + k * 0.7), 0.8 + Math.sin(k * Math.PI) * 0.8, Math.cos(i * 1.6) * (0.3 + k * 0.7));
    m.material.opacity = 1 - k;
  }));
  FX.wash = selfFx(g => ({ list: [0, 1, 2, 3, 4].map(() => ball(g, puffMat, 0.12)) }), (d, t) => rising(d.list, t, 0, 0.7, 1.1, 0.6, 0.11));
  FX.foam = FX.wash;
  FX.douse = selfFx(g => ({ list: [0, 1, 2, 3, 4].map(() => glyph(g, '💧', '#6fb3e0', 0.3)) }), (d, t) => {
    const k0 = t % 3;
    d.list.forEach((m, i) => {
      m.visible = k0 > 1.3 && k0 < 2.5;
      drop(m, ((k0 - 1.3) * 2 + i / 5) % 1, (i - 2) * 0.22, 2.2, 0.3);
    });
  });
  FX.shower = selfFx(g => ({ list: [0, 1, 2, 3, 4, 5].map(() => glyph(g, '|', '#6fb3e0', 0.4)) }), (d, t) => d.list.forEach((m, i) => drop(m, (t * 1.6 + i / 6) % 1, (i - 2.5) * 0.24, 2.4, 0.1, (i % 2) * 0.3)));
  FX.sweat = selfFx(g => ({ list: [0, 1, 2].map(() => glyph(g, '💦', '#6fb3e0', 0.3)) }), (d, t) => d.list.forEach((m, i) => {
    const k = (t * 0.55 + i / 3) % 1;
    m.position.set((i - 1) * 0.7, 1.5 - k * 0.7, 0.5);
    m.material.opacity = 1 - k;
  }));
  FX.shiver = selfFx(g => ({ list: [glyph(g, '❄', '#7fb8e6', 0.42), glyph(g, '❄', '#a8d4f2', 0.3), glyph(g, '!', '#6f9ec9', 0.5)] }), (d, t) => rising(d.list, t, 0, 1.2, 1.1, 0.7));
  FX.bliss = selfFx(g => ({ list: [glyph(g, '✦', '#f2c230', 0.3), glyph(g, '～', '#f2748e', 0.46), glyph(g, '✦', '#ffd76a', 0.24)] }), (d, t) => rising(d.list, t, 0, 1.2, 1.2, 0.5));
  FX.spicy = selfFx(g => ({ list: [glyph(g, '🔥', '#e8634f', 0.42), glyph(g, '💦', '#6fb3e0', 0.3)] }), (d, t) => rising(d.list, t * 2, 0, 1.4, 0.9, 0.5));
  FX.blow = selfFx(g => ({ list: [glyph(g, '～', '#c9c0ac', 0.4), glyph(g, '～', '#d9d2c4', 0.3)] }), (d, t) => rising(d.list, t, 0, 1.4, 0.7, 0.2));
  FX.coin = { make: g => ({ list: [glyph(g, '✦', '#e3bb4a', 0.4)] }), run: (d, t) => rising(d.list, t * 2, 0, 1, 0.8, 0.2) };
  FX.bell = { make: g => ({ list: [glyph(g, '♪', '#e3bb4a', 0.5), glyph(g, '♪', '#f2c230', 0.36)] }), run: (d, t) => rising(d.list, t, 0, 3.2, 1, 0.6) };
  FX.clap = { make: g => ({ list: [glyph(g, '짝', '#7a5245', 0.46)] }), run: (d, t) => { d.list[0].position.set(0, 2.6, 1.8); d.list[0].visible = (t * 3) % 1 < 0.5; } };
  FX.cheer = selfFx(g => ({ list: [glyph(g, '♥', '#f2748e', 0.34), glyph(g, '✦', '#e3bb4a', 0.3)] }), (d, t) => rising(d.list, t, 0, 2.2, 1, 0.6));
  FX.sing = selfFx(g => ({ list: [glyph(g, '♪', '#f2748e', 0.46), glyph(g, '♫', '#6fb3e0', 0.46), glyph(g, '♪', '#e3bb4a', 0.36)] }), (d, t) => rising(d.list, t, 0, 1.8, 1.4, 0.8));
  FX.reel = FX.splash;
  FX.bounce = selfFx(g => ({ list: [glyph(g, '✦', '#e3bb4a', 0.3)] }), (d, t) => rising(d.list, t * 2, 0, 0.3, 0.5, 0.7));
  FX.wobble = selfFx(g => ({ list: [glyph(g, '!', '#e8634f', 0.5)] }), (d, t) => { d.list[0].position.set(0.7, 2.3 + Math.sin(t * 8) * 0.06, 0); });
  FX.inspect = { make: g => ({ list: [glyph(g, '?', '#7f8fb8', 0.46)] }), run: (d, t) => { d.list[0].position.set(0.3, 2.8 + Math.sin(t * 3) * 0.1, 1.5); } };
  FX.climb = FX.bounce;
  FX.take = {
    make(g) { return { dust: [glyph(g, '✦', '#e3bb4a', 0.3)] }; },
    run(d, t) { rising(d.dust, t * 2, 0, 2.2, 0.7, 0.4); },
  };
  FX.gather = { make: g => FX.take.make(g), run: (d, t) => FX.take.run(d, t) };
  FX.pay = FX.gather;
  FX.ticket = FX.gather;
  FX.bite = { make: g => FX.eat.make(g), run: (d, t, u) => FX.eat.run(d, t, u) };
  FX.nap = { make: g => FX.sleep.make(g), run: (d, t, u) => FX.sleep.run(d, t, u) };
  FX.hand = {
    make(g) { return { dots: [glyph(g, '…', '#7a5245', 0.6)] }; },
    run(d, t) { d.dots[0].position.set(0, 2.8 + Math.sin(t * 4) * 0.08, 0); },
  };
  FX.weigh = {
    make(g) {
      const base = box(g, '#c9c0ac', 1.1, 0.12, 1.1);
      const needle = box(g, '#d6776a', 0.06, 0.5, 0.04);
      const pile = ball(g, '#93c97c', 0.42);
      pile.scale.set(0.45, 0.28, 0.45);
      return { base, needle, pile };
    },
    run(d, t, u) {
      d.base.position.set(0, 0.6, 0.9);
      d.pile.position.set(0, 0.8, 0.9);
      d.pile.visible = u > 0.25;
      d.needle.position.set(0, 1.25, 0.4);
      d.needle.rotation.z = u > 0.25 ? -0.9 + Math.sin(t * 9) * 0.1 * (1 - u) : 0;
    },
  };
  FX.pay = {
    make(g) { return { coins: [glyph(g, '●', '#e3bb4a', 0.26), glyph(g, '●', '#e3bb4a', 0.2), glyph(g, '●', '#e3bb4a', 0.16)] }; },
    run(d, t) { rising(d.coins, t * 1.2, 0, 1.4, 1.1, 0.35); },
  };
  FX.gather = {
    make(g) { return { fruit: ball(g, '#e8634f', 0.18) }; },
    run(d, t) {
      const k = (t % 2.4) / 2.4;
      d.fruit.visible = k > 0.3 && k < 0.72;
      d.fruit.position.set(0, 0.2 + Math.max(0, k - 0.45) * 2.2, 1.2);
    },
  };
  FX.nap = FX.sleep;
  FX.bite = FX.eat;
  FX.ticket = FX.browse;

  class ActFx {
    constructor(scene) {
      this.scene = scene;
      this.live = new Map();
    }
    update(sim, world, time) {
      const seen = new Set();
      for (const c of sim.chars) {
        const d = c.doing;
        if (c.hidden && !(d && d.x && d.x.night)) continue;
        let act = null;
        let u = 0;
        let ctx = null;
        let tx = c.x;
        let tz = c.z;
        if (d && d.kind === 'obj' && d.phase === 'use') {
          const st = d.x.steps[d.step];
          if (!st || st.fx) continue;   // 전용 모델이 있는 단계
          act = (root.SceneActs && root.SceneActs.key(d.x, st)) || st.act;
          // 세트 규격: 장면이 없는 단계의 기본 효과가 화면·키보드·상자·종이·레몬·저울 같은 물건을 새로 만들어
          // 그 자리 진짜 물건과 겹치지 않게, 물건 대신 가벼운 표시만 띄운다 (2026-11-10, 인터넷 코너 키보드 사례)
          if (!/^s_/.test(act) && NO_OBJ[act] !== undefined) act = NO_OBJ[act];
          u = st.min ? 1 - d.left / st.min : 0;
          // 상호작용 전체에서 어디까지 왔는가 (먹을수록 줄어드는 그릇 등)
          let done = 0;
          let all = 0;
          d.x.steps.forEach((q, i) => { all += q.min || 0; if (i < d.step) done += q.min || 0; });
          ctx = { all: all ? (done + (st.min || 0) * Math.max(0, Math.min(1, u))) / all : 0, step: d.step, clip: st.clip };
          if (d.socket && d.socket.fx !== undefined) {
            tx = d.socket.fx;
            tz = d.socket.fz;
          }
        } else if (d && d.kind === 'chat' && d.phase === 'use') {
          act = 'friend';
          tx = c.x;
          tz = c.z;
        }
        if (!act || !FX[act]) continue;
        if (FX[act].self) {
          tx = c.x;
          tz = c.z;
        }
        seen.add(c.id);
        let e = this.live.get(c.id);
        if (!e || e.act !== act) {
          if (e) this.scene.remove(e.g);
          const g = new THREE.Group();
          e = { act, g, data: FX[act].make(g) };
          this.scene.add(g);
          this.live.set(c.id, e);
        }
        // rel: 캐릭터 발밑에 놓고 +z가 대상 쪽을 보게 (솟는 음식: 대상에서 캐릭터 손까지 오가는 장면)
        if (FX[act].rel) {
          const D = Math.hypot(tx - c.x, tz - c.z) || 1.4;
          e.g.position.set(c.x, world.floorAt(c.x, c.z) + (c.h || 0), c.z);
          e.g.rotation.y = Math.atan2(tx - c.x, tz - c.z);
          FX[act].run(e.data, time, Math.max(0, Math.min(1, u)), { ...(ctx || { all: 0, step: 0, clip: null }), D });
          continue;
        }
        // 대상 지점에 놓고 캐릭터 쪽(+z)을 보게 한다
        e.g.position.set(tx, FX[act].top ? root.SceneActs.topAt(tx, tz) : world.floorAt(tx, tz) + (FX[act].self ? c.h || 0 : act === 'friend' || act === 'sleep' ? (c.h || 0) * 0.5 : 0), tz);
        e.g.rotation.y = Math.atan2(c.x - tx, c.z - tz);
        FX[act].run(e.data, time, Math.max(0, Math.min(1, u)), ctx || { all: 0, step: 0, clip: null });
      }
      for (const [id, e] of this.live) {
        if (seen.has(id)) continue;
        this.scene.remove(e.g);
        this.live.delete(id);
      }
    }
  }
  ActFx.FX = FX;
  root.ActFx = ActFx;
}(typeof self !== 'undefined' ? self : this));
