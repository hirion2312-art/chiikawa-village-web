'use strict';

// 치이카와 심즈 — 라멘 로의 주방 (2026-11-10 이재헌 지시: 기물마다 고유 동작)
// 솥 뚜껑이 열리고, 면이 끓고, 뜰채로 건지면 솥에서 면이 사라진다. 그릇에는 국물·면·고명이 차례로 쌓이고
// 완성된 그릇은 카운터로 나간다. 손님 앞 그릇도 같은 모델을 쓴다
(function (root) {
  const toon = c => new THREE.MeshToonMaterial({ color: c });
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pop = (m, u) => kitScale(m, u < 0.6 ? (u / 0.6) * 1.2 : 1.2 - ((u - 0.6) / 0.4) * 0.2);
  function mesh(parent, geo, color, x, y, z, rx = 0, ry = 0, rz = 0, ink = true) {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    if (ink) m.add(new THREE.Mesh(geo, inkThin));
    parent.add(m);
    return m;
  }
  const lathe = pts => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 24);
  const FLAT = Math.PI / 2;

  // 면 다발: 굵기가 다른 고리를 겹쳐 말아 놓은 모양
  function noodleCoil(parent, r, y) {
    const g = new THREE.Group();
    g.position.y = y;
    parent.add(g);
    for (let i = 0; i < 6; i++) {
      const t = mesh(g, new THREE.TorusGeometry(r * (0.3 + i * 0.13), 0.028, 6, 22), i % 2 ? '#f4dc98' : '#ecd084', 0, 0.015 * (i % 3), 0, FLAT + (i % 2 ? 0.08 : -0.08), 0, i * 0.7, false);
      t.castShadow = false;
    }
    return g;
  }
  function narutoTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#f2748e';
    g.lineWidth = 6;
    g.beginPath();
    for (let a = 0; a < 16; a += 0.2) g.lineTo(32 + Math.cos(a) * a * 1.5, 32 + Math.sin(a) * a * 1.5);
    g.stroke();
    return new THREE.CanvasTexture(c);
  }
  let naruto = null;
  // 그릇 속: 국물, 면, 고명(차슈 2, 달걀, 김, 멘마, 나루토, 파)
  function bowlFill(parent) {
    const broth = mesh(parent, new THREE.CylinderGeometry(0.52, 0.5, 0.03, 26), '#d9a860', 0, 0.38, 0, 0, 0, 0, false);
    const noodles = noodleCoil(parent, 0.46, 0.405);
    const tops = [];
    for (const [x, z, ry] of [[-0.2, -0.16, 0.3], [0.05, -0.26, -0.4]]) {
      const t = new THREE.Group();
      t.position.set(x, 0.43, z);
      t.rotation.set(0.18, ry, 0.1);
      parent.add(t);
      mesh(t, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 16), '#c98f72', 0, 0, 0);
      mesh(t, new THREE.TorusGeometry(0.16, 0.012, 5, 18), '#a56a4e', 0, 0.022, 0, FLAT, 0, 0, false);
      tops.push(t);
    }
    const egg = new THREE.Group();
    egg.position.set(0.26, 0.43, 0.12);
    parent.add(egg);
    const white = mesh(egg, new THREE.SphereGeometry(0.12, 12, 10), '#fffaf0', 0, 0, 0);
    white.scale.y = 0.55;
    const yolk = mesh(egg, new THREE.SphereGeometry(0.06, 10, 8), '#f3b13c', 0, 0.05, 0, 0, 0, 0, false);
    yolk.scale.y = 0.5;
    tops.push(egg);
    const nori = mesh(parent, new THREE.BoxGeometry(0.3, 0.34, 0.012), '#3f5243', -0.08, 0.56, -0.42, -0.25);
    tops.push(nori);
    const menma = new THREE.Group();
    menma.position.set(0.28, 0.43, -0.2);
    parent.add(menma);
    for (let i = 0; i < 4; i++) mesh(menma, new THREE.BoxGeometry(0.03, 0.03, 0.18), '#c9a14e', i * 0.045 - 0.07, 0, 0, 0, i * 0.15, 0, false);
    tops.push(menma);
    if (!naruto) naruto = new THREE.MeshToonMaterial({ map: narutoTex() });
    const nar = mesh(parent, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), naruto, -0.26, 0.44, 0.2, 0.18);
    tops.push(nar);
    const negi = new THREE.Group();
    negi.position.y = 0.44;
    parent.add(negi);
    for (const [x, z] of [[0, 0.1], [0.08, 0.28], [-0.06, 0.32], [0.14, 0.02], [-0.08, 0], [0.02, 0.2], [-0.16, 0.08]]) mesh(negi, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), '#79b267', x, 0, z, 0, 0, 0, false);
    tops.push(negi);
    return { broth, noodles, tops };
  }
  function bowlShell(kit) {
    kit.place(softLathe('ramenBowl', [[0, 0], [0.3, 0], [0.42, 0.05], [0.6, 0.42], [0.62, 0.48], [0.5, 0.46], [0.3, 0.2], [0, 0.18]]), mat('#9cc8a8'), 0, 0, 0, 1, 1, 1, inkThin);
    mesh(kit.group, new THREE.TorusGeometry(0.615, 0.018, 6, 28), '#fffaf0', 0, 0.47, 0, FLAT, 0, 0, false);
    mesh(kit.group, new THREE.TorusGeometry(0.5, 0.02, 6, 28), '#d6776a', 0, 0.3, 0, FLAT, 0, 0, false);
  }

  root.RamenKitchen = {
    // 손님 앞 그릇: o.data.noodles 하나로 내용물 전체를 켜고 끈다
    customerBowl(kit, o) {
      bowlShell(kit);
      const fill = new THREE.Group();
      kit.group.add(fill);
      o.data.parts = bowlFill(fill);
      o.data.noodles = fill;
    },
    // 손님 그릇: 다시 가득 채운다
    fillBowl(o) {
      const p = o.data.parts;
      o.data.noodles.visible = true;
      p.broth.visible = true;
      p.broth.position.y = 0.38;
      kitScale(p.broth, 1);
      p.noodles.visible = true;
      kitScale(p.noodles, 1);
      p.tops.forEach(t => { t.visible = true; });
    },
    // 면과 고명이 줄어든다
    eatBowl(o, u) {
      const p = o.data.parts;
      o.data.noodles.visible = true;
      p.tops.forEach((t, i) => { t.visible = u < 1 - (i + 0.5) / (p.tops.length + 0.5) * 0.85; });
      p.noodles.visible = u < 0.98;
      kitScale(p.noodles, Math.max(0.2, 1 - u * 0.85));
    },
    // 국물이 내려간다
    soupBowl(o, u) {
      const p = o.data.parts;
      p.tops.forEach(t => { t.visible = false; });
      p.noodles.visible = false;
      p.broth.visible = u < 0.98;
      p.broth.position.y = 0.38 - u * 0.2;
      const s = 1 - u * 0.5;
      kitScale(p.broth, s, 1, s);
    },
    mount(k, api, c) {
      /* ---------- 솥 ---------- */
      const LID_MAX = 1.95;
      const setLid = (o, a) => {
        o.data.lidA = a;
        o.data.lid.rotation.x = LID_MAX * ease(a);
      };
      const boiling = (o, time, strong) => {
        o.data.bubbles.forEach((b, i) => {
          const t = (time * (strong ? 2.2 : 1.1) + i * 0.17) % 1;
          b.visible = true;
          const a = i * 2.4;
          b.position.set(Math.cos(a) * (0.12 + (i % 3) * 0.1), 0.48 + t * 0.03, Math.sin(a) * (0.12 + (i % 3) * 0.1));
          kitScale(b, 0.5 + t);
        });
      };
      const open = (o, time) => {
        setLid(o, 1);
        boiling(o, time, true);
        runSteam(o.data.puffs, 0, 0.62, 0, time, true);
      };
      api.dyn('boiler', {
        x: -3, y: 0.9, z: -1.28, obj: 'pot', label: '면 솥',
        clips: {
          open(o, u, time) {
            setLid(o, clamp((u - 0.15) / 0.65));
            boiling(o, time, false);
            runSteam(o.data.puffs, 0, 0.62, 0, time, u > 0.45);
          },
          drop(o, u, time) {
            open(o, time);
            const v = u > 0.55;
            o.data.coil.visible = v;
            if (v) {
              const k2 = (u - 0.55) / 0.45;
              o.data.coil.position.y = 0.72 - 0.25 * Math.min(1, k2 * 2.2);
              o.data.coil.rotation.y = k2 * 2;
            }
          },
          boil(o, u, time) {
            open(o, time);
            o.data.coil.visible = true;
            o.data.coil.position.y = 0.47 + Math.sin(time * 6) * 0.015;
            o.data.coil.rotation.y = time * 1.4;
          },
          dip(o, u, time) {
            open(o, time);
            o.data.coil.visible = u < 0.5;
          },
          drain(o, u, time) {
            open(o, time);
            o.data.coil.visible = false;
          },
        },
        idle(o, time, dt) {
          if (o.data.lidA > 0) setLid(o, Math.max(0, o.data.lidA - dt / 0.5));
          o.data.coil.visible = false;
          o.data.bubbles.forEach(b => { b.visible = false; });
          runSteam(o.data.puffs, 0, 0.62, 0, 0, false);
        },
      }, (kit, o) => {
        kit.place(softLathe('stockPot', [[0, 0], [0.48, 0], [0.5, 0.04], [0.5, 0.54], [0.53, 0.58], [0.5, 0.6], [0.42, 0.56], [0.42, 0.06], [0, 0.06]]), mat('#d3d6da'), 0, 0, 0, 1, 1, 1, inkThin);
        mesh(kit.group, new THREE.TorusGeometry(0.505, 0.012, 5, 28), '#a9a395', 0, 0.3, 0, FLAT, 0, 0, false);
        for (const s of [-1, 1]) mesh(kit.group, new THREE.TorusGeometry(0.075, 0.02, 6, 14, Math.PI), '#8f8c88', s * 0.55, 0.42, 0, 0, 0, -s * FLAT);
        mesh(kit.group, new THREE.CylinderGeometry(0.42, 0.42, 0.012, 24), '#eadfb8', 0, 0.47, 0, 0, 0, 0, false);
        o.data.coil = noodleCoil(kit.group, 0.34, 0.47);
        o.data.coil.visible = false;
        o.data.bubbles = [];
        for (let i = 0; i < 9; i++) {
          const b = mesh(kit.group, new THREE.SphereGeometry(0.035, 8, 6), '#fffdf6', 0, 0.5, 0, 0, 0, 0, false);
          b.visible = false;
          o.data.bubbles.push(b);
        }
        o.data.puffs = steamPuffs(kit, 5, 0, 0.62, 0);
        // 뚜껑: 경첩은 손님 쪽(+z) 가장자리. 조리하는 사람(주방 쪽, −z)이 앞 가장자리를 들어 올리면 뚜껑이 사람 반대쪽으로 열린다
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.61, 0.5);
        kit.group.add(pivot);
        const lid = mesh(pivot, lathe([[0.56, 0], [0.54, 0.05], [0.34, 0.15], [0.1, 0.19], [0, 0.19]]), '#b4b8bc', 0, 0, -0.5);
        lid.material.side = THREE.DoubleSide;
        mesh(pivot, new THREE.CylinderGeometry(0.03, 0.04, 0.09, 10), '#7d6250', 0, 0.23, -0.5, 0, 0, 0, false);
        mesh(pivot, new THREE.SphereGeometry(0.07, 12, 8), '#a97c50', 0, 0.3, -0.5);
        o.data.lid = pivot;
        setLid(o, 0);
      });

      /* ---------- 라멘을 쌓는 그릇 ---------- */
      const reset = o => {
        o.root.visible = true;
        kitScale(o.data.parts.broth, 1);
        o.data.parts.broth.visible = false;
        o.data.parts.noodles.visible = false;
        o.data.parts.tops.forEach(t => { t.visible = false; });
        o.data.wait = 0;
      };
      api.dyn('dish', {
        x: 3.2, y: 0.9, z: -1.28, obj: 'bowl', label: '라멘 그릇',
        clips: {
          pour(o, u, time) {
            if (!o.root.visible || u < 0.06) reset(o);
            o.data.parts.broth.visible = u > 0.34;
            o.data.parts.broth.position.y = 0.25 + ease(clamp((u - 0.34) / 0.5)) * 0.13;
            runSteam(o.data.puffs, 0, 0.5, 0, time, u > 0.5);
          },
          noodle(o, u, time) {
            o.data.parts.noodles.visible = u > 0.45;
            if (u > 0.45) o.data.parts.noodles.position.y = 0.52 - 0.115 * Math.min(1, (u - 0.45) * 4);
            runSteam(o.data.puffs, 0, 0.5, 0, time, true);
          },
          top(o, u, time) {
            const list = o.data.parts.tops;
            list.forEach((t, i) => {
              const s = (u - (i + 0.2) / (list.length + 0.5)) * (list.length + 0.5);
              t.visible = s > 0;
              if (t.visible) pop(t, clamp(s));
            });
            runSteam(o.data.puffs, 0, 0.5, 0, time, true);
          },
          take(o) {
            o.root.visible = false;
            o.data.wait = 1.6;
            runSteam(o.data.puffs, 0, 0.5, 0, 0, false);
          },
        },
        idle(o, time, dt) {
          if (o.data.wait > 0) {
            o.data.wait -= dt;
            if (o.data.wait <= 0) reset(o);
          }
          runSteam(o.data.puffs, 0, 0.5, 0, 0, false);
        },
      }, (kit, o) => {
        bowlShell(kit);
        o.data.parts = bowlFill(kit.group);
        o.data.puffs = steamPuffs(kit, 3, 0, 0.5, 0);
        o.data.wait = 0;
        reset(o);
      });

      /* ---------- 카운터로 내놓은 그릇 ---------- */
      api.dyn('passed', {
        x: -5.4, y: c.h + 0.08, z: c.z - 0.25, obj: 'bowl', label: '내놓은 라멘',
        clips: {
          serve(o, u, time) {
            const v = u > 0.42;
            o.root.visible = v;
            if (v) o.root.position.z = o.home.p.z + ease(clamp((u - 0.42) / 0.4)) * 0.5;
            runSteam(o.data.puffs, 0, 0.5, 0, time, v);
            o.data.left = 2.2;
          },
        },
        idle(o, time, dt) {
          if (o.data.left > 0) {
            o.data.left -= dt;
            runSteam(o.data.puffs, 0, 0.5, 0, time, true);
            if (o.data.left <= 0) {
              o.root.visible = false;
              o.root.position.z = o.home.p.z;
              runSteam(o.data.puffs, 0, 0.5, 0, 0, false);
            }
          }
        },
      }, (kit, o) => {
        bowlShell(kit);
        const fill = new THREE.Group();
        kit.group.add(fill);
        bowlFill(fill);
        o.data.puffs = steamPuffs(kit, 3, 0, 0.5, 0);
        o.data.left = 0;
        o.root.visible = false;
      });
    },
  };
}(typeof self !== 'undefined' ? self : this));
