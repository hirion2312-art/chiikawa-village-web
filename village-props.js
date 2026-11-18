'use strict';

// 치이카와 심즈 — 손 소품 (DIRECTION 제작 규칙: 사물은 몸을 통과할 수 없다)
// - 소품은 상호작용 단계가 prop으로 요구할 때만, 그 단계의 애니메이션 동안에만 손에 배치한다 (평소에는 아무것도 들지 않는다)
// - 소품은 손끝(팔 aim의 끝)에 자식으로 붙어 클립의 팔 동작을 그대로 따라간다
// - 배치(손끝에서 얼마나, 어느 쪽으로, 어떤 크기로)는 몸과의 간격을 제약으로 푼 값(FIT)을 쓴다.
//   prop-check.js가 0.1초 간격 전 구간 샘플링으로 최소 간격을 재서 FIT를 만들고 검증한다
(function (root) {
  // 소품 모양: 원점 = 손이 잡는 점, +Z = 몸에서 멀어지는 쪽, +Y = 위
  const mat = color => new THREE.MeshToonMaterial({ color });
  const BUILD = {
    bowl() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.12, 18), mat('#e8dcc2'));
      body.position.set(0, 0, 0.17);
      const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 18), mat('#e9b86a'));
      soup.position.set(0, 0.05, 0.17);
      g.add(body, soup);
      return g;
    },
    cup() {
      const g = new THREE.Group();
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.15, 14), mat('#f3efe4'));
      cup.position.set(0, 0.02, 0.08);
      const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.015, 14), mat('#b98a5a'));
      tea.position.set(0, 0.09, 0.08);
      g.add(cup, tea);
      return g;
    },
    pouch() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat('#c79a5b'));
      b.position.set(0, 0.06, 0.08);
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.04, 10), mat('#8c6a46'));
      n.position.set(0, 0.15, 0.08);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12), mat('#f2c230'));
      c.rotation.x = Math.PI / 2;
      c.position.set(0, 0.06, 0.168);
      g.add(b, n, c);
      return g;
    },
    bucket() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.2, 14), mat('#e9c46a'));
      b.position.set(0, 0.08, 0.1);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14), mat('#9fd6e6'));
      w.position.set(0, 0.16, 0.1);
      g.add(b, w);
      return g;
    },
    milk() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.24, 12), mat('#e4bd86'));
      b.position.set(0, 0.08, 0.05);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), mat('#7f9ec2'));
      cap.position.set(0, 0.21, 0.05);
      g.add(b, cap);
      return g;
    },
    mic() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.2, 8), mat('#4b4b52'));
      h.position.set(0, 0.04, 0.05);
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#b4b0a6'));
      t.position.set(0, 0.17, 0.05);
      g.add(h, t);
      return g;
    },
    // 먹는 것들: 손 위로 음식이 올라온다
    sausage() {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 10), mat('#efb2a4'));
      m.rotation.x = Math.PI / 2 - 0.5;
      m.position.set(0, 0.04, 0.16);
      g.add(m);
      return g;
    },
    cone() {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 10), mat('#e0b878'));
      c.rotation.x = Math.PI;
      c.position.set(0, 0.04, 0.08);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat('#fffaf0'));
      s.scale.y = 1.25;
      s.position.set(0, 0.2, 0.08);
      g.add(c, s);
      return g;
    },
    snack() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.09), mat('#f3a9bd'));
      b.position.set(0, 0.06, 0.1);
      g.add(b);
      return g;
    },
    skewer() {
      const g = new THREE.Group();
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), mat('#d9b98a'));
      st.rotation.x = Math.PI / 2 - 0.6;
      st.position.set(0, 0.05, 0.14);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat('#c9894a'));
      b.position.set(0, 0.16, 0.28);
      g.add(st, b);
      return g;
    },
    plate() {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.03), mat('#d9b98a'));
      t.position.set(0, 0.03, 0.07);
      g.add(t);
      return g;
    },
    ticket() {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.012), mat('#fff2b8'));
      t.position.set(0, 0.03, 0.06);
      g.add(t);
      return g;
    },
    book() {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.2), mat('#8fb6d6'));
      b.position.set(0, 0, 0.12);
      b.rotation.x = -0.5;
      g.add(b);
      return g;
    },
    rod() {
      const g = new THREE.Group();
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8), mat('#a97c50'));
      r.rotation.x = Math.PI / 2 - 0.5;
      r.position.set(0, 0.32, 0.6);
      g.add(r);
      return g;
    },
    towel() {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.16), mat('#9fd0ea'));
      t.position.set(0, 0, 0.09);
      g.add(t);
      return g;
    },
  };
  // 어느 손이 드는가 (anims.js: 라멘·먹기 클립은 왼팔이 그릇을 받친다)
  const HAND = { pouch: 1, bucket: 1, milk: 1, mic: 1, bowl: 0, cup: 1, ticket: 1, book: 1, rod: 1, towel: 1, plate: 1, sausage: 1, cone: 1, snack: 0, skewer: 1 };

  // 배치표: FIT[캐릭터][소품] = { a: 팔 방향으로 더 나감, b: 몸 밖(앞)으로 나감, s: 크기, o: 소품이 뻗는 방향('f' 몸 앞 · 'arm' 팔 방향 · 'mix' 그 사이) }
  // prop-check.js solve()가 만든다. 손에서 떨어져 떠 보이는 배치는 허용하지 않는다(잡기는 접촉이어야 한다, R5)
  // 없으면 DEFAULT를 쓰고, 검증에서 걸리면 표를 다시 푼다
  const DEFAULT = { a: 0.02, b: 0.06, s: 1 };
  // 2026-11-05 prop-check.js solve() 결과 (R5 손 접촉 0.03 이하 + R6 몸과 간격 0.04 이상). skip은 손에 닿은 채로 몸을 피할 수 없어 그 동작에서는 표시하지 않는 조합
  // 동작·소품·캐릭터 모양이 바뀌면 다시 푼다: game.html에서 PropCheck.solve()
  const FIT = {
    chiikawa: { bottle: { o: 'mix', a: 0, b: 0, s: 1 }, bowl: { o: 'arm', a: 0.02, b: 0, s: 0.7 }, cup: { o: 'f', a: 0, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.7 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'f', a: 0, b: 0, s: 0.85 } },
    hachiware: { bottle: { o: 'f', a: 0, b: 0, s: 1 }, bowl: { o: 'mix', a: 0, b: 0, s: 1 }, cup: { o: 'f', a: 0, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.85 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'f', a: 0, b: 0, s: 1 } },
    usagi: { bottle: { o: 'arm', a: 0, b: 0, s: 1 }, bowl: { o: 'arm', a: 0, b: 0, s: 0.7 }, cup: { o: 'f', a: 0.02, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.7 }, book: { skip: true }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'mix', a: 0.02, b: 0, s: 0.7 } },
    momonga: { bottle: { o: 'arm', a: 0, b: 0, s: 1 }, bowl: { o: 'arm', a: 0, b: 0, s: 1 }, cup: { o: 'f', a: 0, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.85 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'mix', a: 0, b: 0, s: 0.7 } },
    shisa: { bottle: { o: 'arm', a: 0, b: 0, s: 1 }, bowl: { o: 'arm', a: 0, b: 0, s: 1 }, cup: { o: 'f', a: 0, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.85 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'mix', a: 0, b: 0, s: 0.85 } },
    rakko: { bottle: { o: 'arm', a: 0, b: 0, s: 1 }, bowl: { skip: true }, cup: { o: 'f', a: 0.02, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.85 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'mix', a: 0, b: 0, s: 0.85 } },
    kurimanju: { bottle: { o: 'arm', a: 0, b: 0, s: 1 }, bowl: { o: 'arm', a: 0, b: 0, s: 1 }, cup: { o: 'f', a: 0, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.85 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'mix', a: 0, b: 0, s: 0.85 } },
    furuhonya: { bottle: { o: 'arm', a: 0, b: 0, s: 1 }, bowl: { o: 'arm', a: 0, b: 0, s: 1 }, cup: { o: 'f', a: 0, b: 0, s: 1 }, ticket: { o: 'f', a: 0, b: 0, s: 0.85 }, book: { o: 'f', a: 0, b: 0, s: 0.55 }, rod: { o: 'f', a: 0, b: 0, s: 1 }, towel: { o: 'mix', a: 0, b: 0, s: 0.85 } },
  };

  // 손끝 기준틀: aim 공간에서 팔은 -Y로 뻗는다. 손끝 = (0, -(armLen + armSize), 0)
  function handFrame(built, hand, preset) {
    const arm = built.arms[hand];
    const aim = arm.joint.children[0];
    const tip = new THREE.Vector3(0, -(preset.armLen + preset.armSize), 0);
    return { aim, tip };
  }
  // 몸 밖(모델 +Z 앞쪽, 그리고 손 쪽 옆)을 aim 공간 방향으로 바꾼다 (휴식 자세 기준)
  function outward(built, aim, hand) {
    built.model.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(aim.matrixWorld).invert();
    const m = built.model.matrixWorld;
    const o = new THREE.Vector3().setFromMatrixPosition(m);
    const side = hand === 0 ? -1 : 1;
    const fwd = new THREE.Vector3(side * 0.35, 0, 1).normalize().transformDirection(m).add(o);
    const up = new THREE.Vector3(0, 1, 0).transformDirection(m).add(o);
    const oa = o.clone().applyMatrix4(inv);
    return {
      f: fwd.applyMatrix4(inv).sub(oa).normalize(),
      u: up.applyMatrix4(inv).sub(oa).normalize(),
    };
  }

  // 소품을 손에 붙인다. 반환한 group은 aim의 자식이다 (떼려면 detach)
  function attach(actor, id, fit) {
    if (!BUILD[id]) return null;
    const hand = HAND[id];
    const preset = actor.preset;
    const { aim, tip } = handFrame(actor.built, hand, preset);
    const f = fit || (FIT[actor.c ? actor.c.id : actor.id] || {})[id] || DEFAULT;
    if (f.skip) return null;
    const dir = actor.dirs && actor.dirs[hand] ? actor.dirs[hand] : (actor.dirs = actor.dirs || [])[hand] = outward(actor.built, aim, hand);
    const g = BUILD[id]();
    g.scale.setScalar(f.s);
    g.position.copy(tip).addScaledVector(new THREE.Vector3(0, -1, 0), f.a).addScaledVector(dir.f, f.b);
    // +Z를 소품이 뻗는 쪽으로, +Y를 위로
    const armDir = new THREE.Vector3(0, -1, 0);
    const z = f.o === 'arm' ? armDir.clone() : f.o === 'mix' ? dir.f.clone().add(armDir).normalize() : dir.f.clone();
    if (Math.abs(z.dot(dir.u)) > 0.98) z.addScaledVector(dir.f, 0.2).normalize();
    const x = new THREE.Vector3().crossVectors(dir.u, z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    g.userData.prop = id;
    aim.add(g);
    return g;
  }
  function detach(g) {
    if (!g || !g.parent) return;
    g.parent.remove(g);
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  root.VillageProps = { BUILD, HAND, FIT, DEFAULT, attach, detach, handFrame, outward };
}(typeof self !== 'undefined' ? self : this));
