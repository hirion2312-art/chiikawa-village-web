'use strict';

// 애니메이션 리그 도우미 — 앉기 규격(A3)과 그립 솔버(A2). docs/animation-plan-2026-11-05.md 묶음 A
// anims.js 뒤에 불러온다. 게임·스튜디오·검수기가 같은 함수를 쓴다.
//
// 앉기: 클립 meta.seat가 있으면 "좌면 위에 앉은 자세"를 바탕으로 깐다. 몸통 squash로 키를 줄이지 않고
//   posY로 엉덩이(몸 아래 끝)를 좌면에 붙이고, 발을 몸 앞으로 뻗는다. 엉덩이 높이는 캐릭터마다 잰다.
//   좌면 종류 3: chair(의자·카운터·벤치) / floor(바닥) / water(탕 바닥). 루트(발밑)가 좌면 높이에 있다는 전제
// 그립: 클립 grips가 있으면 소품의 그립점에 손끝이 닿도록 팔 채널(armX·armPitchX·armExtX)을 매 프레임 푼다.
//   팔 길이가 캐릭터마다 달라 클립에 구워 두지 않고, 캐릭터가 그 클립을 처음 쓸 때 0.05초 간격으로 풀어 둔다
(function (root) {
  const SEAT_SPECS = {
    // leg: 몸 앞면 밖으로 나오는 다리 길이, inset: 몸 안에 묻는 길이 (모델 로컬 단위). lift: 발을 엉덩이 높이만큼 올려 좌면에 얹는 비율, lean: 등 기대기(rotX)
    // 리그에는 다리 메시가 없고 발만 있다. 앉으면 발을 앞뒤로 늘여 다리로 쓰고, 뒤쪽 끝을 몸 안에 묻어 몸에 붙어 보이게 한다
    // 2026-11-10: 엉덩이가 좌면에 묻히지 않게 raise를 좌면 위로 (의자에 앉으면 꺼져 보이던 문제)
    chair: { leg: 0.33, inset: 0.12, lift: 0.62, lean: 0, raise: 0.02, fwd: 0.34 },
    // 앞에 탁자나 카운터가 있는 자리는 앞으로 나오지 않는다
    stool: { leg: 0.33, inset: 0.12, lift: 0.62, lean: 0, raise: 0.02 },
    // 바닥·물: 의자와 같은 짧은 다리 (예전 0.66은 다리가 길게 늘어나 보였다)
    floor: { leg: 0.33, inset: 0.12, lift: 1, lean: -0.04 },
    water: { leg: 0.36, inset: 0.12, lift: 1, lean: -0.08 },
  };

  /* ---------- 캐릭터 치수 ---------- */

  const INFO = new WeakMap();
  // 쉬는 자세에서 잰다: 엉덩이 높이(몸 아래 끝, 루트 기준 월드 단위), 손끝 위치, 어깨
  function rigInfo(built, preset) {
    if (INFO.has(built)) return INFO.get(built);
    const keep = { p: built.model.position.clone(), r: built.model.rotation.clone(), s: built.model.scale.clone() };
    built.root.updateMatrixWorld(true);
    const skip = new Set();
    for (const arm of built.arms) arm.joint.traverse(o => skip.add(o));
    if (built.feet) for (const f of built.feet) f.traverse(o => skip.add(o));
    // 이미 붙어 있는 소품(클립 소품·손 소품 모두 userData.prop)은 몸이 아니다
    built.model.traverse(o => { if (o.userData && o.userData.prop) o.traverse(c => skip.add(c)); });
    if (built.tail) built.tail.traverse(o => skip.add(o));
    const bodies = [];
    built.model.traverse(o => { if (o.isMesh && !skip.has(o) && !(o.material && o.material.side === THREE.BackSide)) bodies.push(o); });
    // 몸 가운데 아래에서 위로 쏴서 처음 닿는 곳 = 엉덩이 (꼬리·장식 공은 가운데에 없다)
    const rootInv = new THREE.Matrix4().copy(built.root.matrixWorld).invert();
    const ray = new THREE.Raycaster(new THREE.Vector3(0, -5, 0).applyMatrix4(built.root.matrixWorld), new THREE.Vector3(0, 1, 0).transformDirection(built.root.matrixWorld));
    const hit = ray.intersectObjects(bodies, false)[0];
    const buttH = hit ? hit.point.clone().applyMatrix4(rootInv).y : 0.08;
    const tipLocal = new THREE.Vector3(0, -(preset.armLen + preset.armSize), 0);
    // 몸 삼각형 (모델 공간 고정) — 그립 맞춤 때 소품이 몸을 뚫지 않는지 잰다 (A1)
    const minv = new THREE.Matrix4().copy(built.model.matrixWorld).invert();
    const tris = [];
    for (const o of bodies) {
      const pos = o.geometry.attributes.position;
      const idx = o.geometry.index;
      const m = new THREE.Matrix4().multiplyMatrices(minv, o.matrixWorld);
      const v = i => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m);
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) {
        const t = new THREE.Triangle(v(idx ? idx.getX(i) : i), v(idx ? idx.getX(i + 1) : i + 1), v(idx ? idx.getX(i + 2) : i + 2));
        if (t.getArea() > 1e-9) tris.push({ t, n: t.getNormal(new THREE.Vector3()), box: new THREE.Box3().setFromPoints([t.a, t.b, t.c]) });
      }
    }
    // 앉을 때 다리가 몸에서 나오는 자리: 앉은 발 높이(모델 로컬)에서 몸 가운데→앞으로 쏴서 앞면 z를 잰다
    const legY = preset.footH + buttH / 0.8;
    const ray3 = new THREE.Ray();
    const hitP = new THREE.Vector3();
    const legs = [-1, 1].map(side => {
      ray3.set(new THREE.Vector3(side * preset.footX, legY, 0), new THREE.Vector3(0, 0, 1));
      let z = null;
      for (const tr of tris) {
        if (ray3.intersectTriangle(tr.t.a, tr.t.b, tr.t.c, false, hitP) && (z === null || hitP.z < z)) z = hitP.z;
      }
      return { z: z === null ? 0.3 : z };
    });
    const info = { buttH, tipLocal, bodies, tris, legs, footD: preset.footD, footW: preset.footW, footH: preset.footH };
    INFO.set(built, info);
    built.model.position.copy(keep.p);
    built.model.rotation.copy(keep.r);
    built.model.scale.copy(keep.s);
    return info;
  }

  // 모델 공간 점과 몸 사이 간격 (몸 안이면 음수)
  // 2026-11-10 최적화: 몸 삼각형 전체를 매번 훑으면 그립 굽기 한 번에 2~3초 멈췄다(게임 초반 렉의 원인).
  // 삼각형을 0.1 칸 격자에 나눠 두고 가까운 칸만 본다. 0.4보다 먼 삼각형은 예전에도 보지 않았다
  const CELL = 0.1;
  const KEY = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  const gq = new THREE.Vector3();
  function gridOf(info) {
    if (info.grid) return info.grid;
    const grid = new Map();
    info.tris.forEach((tr, i) => {
      const b = tr.box;
      for (let x = Math.floor(b.min.x / CELL); x <= Math.floor(b.max.x / CELL); x++)
        for (let y = Math.floor(b.min.y / CELL); y <= Math.floor(b.max.y / CELL); y++)
          for (let z = Math.floor(b.min.z / CELL); z <= Math.floor(b.max.z / CELL); z++) {
            const k = KEY(x, y, z);
            let l = grid.get(k);
            if (!l) grid.set(k, l = []);
            l.push(i);
          }
    });
    info.grid = grid;
    info.mark = new Int32Array(info.tris.length);
    info.stamp = 0;
    return grid;
  }
  function nearest(info, p, r) {
    const grid = gridOf(info);
    const stamp = ++info.stamp;
    const n = Math.ceil(r / CELL);
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    const cz = Math.floor(p.z / CELL);
    let best = Infinity;
    let sign = 1;
    for (let x = cx - n; x <= cx + n; x++) for (let y = cy - n; y <= cy + n; y++) for (let z = cz - n; z <= cz + n; z++) {
      const l = grid.get(KEY(x, y, z));
      if (!l) continue;
      for (const i of l) {
        if (info.mark[i] === stamp) continue;
        info.mark[i] = stamp;
        const tr = info.tris[i];
        if (tr.box.distanceToPoint(p) > Math.min(best, r)) continue;
        tr.t.closestPointToPoint(p, gq);
        const d = p.distanceTo(gq);
        if (d < best) {
          best = d;
          sign = gq.sub(p).dot(tr.n) > 0 ? -1 : 1;
        }
      }
    }
    return best <= r ? best * sign : null;
  }
  // 0.1 안에 몸 면이 없으면 그 점 둘레 0.05 칸 전체가 몸 안이거나 밖이다: 칸마다 한 번만 멀리까지 잰다
  function bodyGap(info, p) {
    const near = nearest(info, p, 0.1);
    if (near !== null) return near;
    if (!info.farMemo) info.farMemo = new Map();
    const k = KEY(Math.floor(p.x / 0.05), Math.floor(p.y / 0.05), Math.floor(p.z / 0.05));
    let v = info.farMemo.get(k);
    if (v === undefined) {
      const far = nearest(info, p, 0.4);
      v = far === null ? 1 : far;
      info.farMemo.set(k, v);
    }
    return v;
  }
  // 소품 모양의 표면 점 (로컬, 크기 1). 모양마다 한 번 만든다
  const SHAPE_PTS = {};
  function shapePoints(shape) {
    if (SHAPE_PTS[shape]) return SHAPE_PTS[shape];
    const def = ANIM_PROP_SHAPES[shape] || ANIM_PROP_SHAPES.ball;
    const g = def.make();
    const pos = g.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 40));
    const pts = [];
    for (let i = 0; i < pos.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
    g.dispose();
    return (SHAPE_PTS[shape] = pts);
  }
  // 그 시각 소품의 모델 공간 행렬 (gripTargets와 같은 규약)
  function propMatrix(clip, prop, t, built) {
    const v = animSampleProp(prop, t, clip);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(v.px, v.py, v.pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(v.rx, v.ry, v.rz)), new THREE.Vector3().setScalar((prop.size || 0.3) * v.s));
    if (prop.attach !== 'body') {
      built.root.updateMatrixWorld(true);
      built.model.updateMatrixWorld(true);
      m.premultiply(built.root.matrixWorld).premultiply(new THREE.Matrix4().copy(built.model.matrixWorld).invert());
    }
    return m;
  }

  /* ---------- 앉기 ---------- */

  // 앉은 정도 amt(0 서기 ~ 1 앉기)와 좌면 종류로 포즈에 앉은 자세를 더한다
  function seatPose(pose, info, seat = 'chair', amt = 1) {
    const spec = SEAT_SPECS[seat] || SEAT_SPECS.chair;
    const scale = 0.8;
    pose.posY -= info.buttH * amt;
    pose.posY += (spec.raise || 0) * amt;
    // 등받이에 몸이 묻혀 머리만 남아 보이지 않게 앉은 자리에서 앞으로 나온다
    pose.posZ += (spec.fwd || 0) * amt;
    pose.rotX += spec.lean * amt;
    // 다리: 발을 앞뒤로 늘여, 뒤 끝은 몸 앞면 안쪽(inset)에 묻고 앞 끝은 leg만큼 앞으로 뻗는다.
    // 엉덩이를 내린 만큼 올려 좌면 위에 둔다 (좌면을 뚫지 않게)
    // raise는 몸통만 올린다: 발은 그만큼 도로 내려 준다
    const up = (info.buttH / scale) * spec.lift * amt - ((spec.raise || 0) / scale) * amt;
    const len = spec.leg + spec.inset;
    const stretch = len / (2 * info.footD);
    ['L', 'R'].forEach((side, i) => {
      const z = info.legs[i].z - spec.inset + len / 2;   // 늘인 발의 가운데 z
      pose[`foot${side}Z`] += (z - 0.03) * amt;
      pose[`foot${side}Y`] += up;
      pose[`foot${side}S`] = 1 + (stretch - 1) * amt;     // 앞뒤로 늘이기
      // 길어진 만큼 가늘게: 다리가 굵어 보이지 않게 부피를 유지하고 조금 더 줄인다
      pose[`foot${side}W`] = 1 + (Math.min(0.72, 1 / Math.sqrt(stretch)) - 1) * amt;
    });
    // 앞으로 숙이면(rotX>0) 몸 앞의 발이 내려간다: 그만큼 올려 좌면 위에 둔다 (모델 로컬 단위)
    if (pose.rotX > 0) {
      pose.footLY += ((0.03 + pose.footLZ) * Math.sin(pose.rotX) + 0.01) * amt;
      pose.footRY += ((0.03 + pose.footRZ) * Math.sin(pose.rotX) + 0.01) * amt;
    }
    return pose;
  }
  // 클립 meta.seat: 'idle'(앉아 있음) | 'enter'(서기→앉기) | 'exit'(앉기→서기). 진행도는 클립 시간으로 정한다
  function seatAmountOf(clip, t) {
    const m = clip.meta && clip.meta.seat;
    if (!m) return null;
    const u = Math.max(0, Math.min(1, t / clip.dur));
    const ease = x => x * x * (3 - 2 * x);
    if (m === 'enter') return ease(u);
    if (m === 'exit') return 1 - ease(u);
    return 1;
  }

  /* ---------- 그립 솔버 ---------- */

  const tmpV = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0);
  // 팔 채널 값으로 손끝 위치(모델 공간)를 구한다. animApplyPose와 같은 규약
  function tipFor(built, info, hand, a, pitch, ext, fwd = 0) {
    const arm = built.arms[hand];
    if (arm.anchor) arm.anchor(fwd);
    arm.joint.quaternion.setFromAxisAngle(arm.normal, a);
    if (pitch) arm.joint.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(X, pitch));
    if (arm.aim) arm.aim.scale.set(1 - 0.15 * ext, 1 + 0.9 * ext, 1 - 0.15 * ext);
    arm.joint.updateMatrixWorld(true);
    const aim = arm.aim || arm.joint.children[0];
    const w = tmpV.copy(info.tipLocal).applyMatrix4(aim.matrixWorld);
    return built.model.worldToLocal(w.clone());
  }
  // 목표점(모델 공간)에 손끝이 닿는 팔 값. 좌표 하강 + 단계 축소. start에서 출발해 연속성을 지킨다
  // 네 번째 값 fwd는 어깨를 몸 앞으로 옮기는 각도. 꼭 필요할 때만 쓰도록 작은 벌점을 준다
  function solveArm(built, info, hand, target, start = [0, 0, 0, 0], maxExt = 1) {
    built.model.updateMatrixWorld(true);
    let x = start.slice();
    while (x.length < 4) x.push(0);
    const lim = [[-2.8, 2.8], [-1.6, 1.6], [0, maxExt], [0, 0.85]];
    const dist = v => tipFor(built, info, hand, v[0], v[1], v[2], v[3]).distanceTo(target);
    const err = v => dist(v) + 0.004 * v[3] + 0.002 * v[2];
    // 여러 출발점 중 가장 나은 곳에서 시작한다 (앞쪽 목표는 어깨를 옮겨야 닿는다)
    let best = err(x);
    for (const s0 of [[0, 0, 0, 0], [0.6, -0.6, 0.5, 0.8], [-0.6, -0.6, 0.5, 0.8], [0, -1, 1, 1.2], [1.2, 0, 0.5, 0.4]]) {
      const e = err(s0);
      if (e < best) { best = e; x = s0.slice(); }
    }
    let step = [0.4, 0.4, 0.25, 0.3];
    for (let it = 0; it < 80 && best > 1e-4; it++) {
      let moved = false;
      for (let k = 0; k < 4; k++) {
        for (const s of [1, -1]) {
          const y = x.slice();
          y[k] = Math.max(lim[k][0], Math.min(lim[k][1], y[k] + s * step[k]));
          const e = err(y);
          if (e < best - 1e-7) {
            best = e;
            x = y;
            moved = true;
          }
        }
      }
      if (!moved) step = step.map(v => v * 0.5);
      if (step[0] < 1e-4) break;
    }
    const e = dist(x);
    if (built.arms[hand].anchor) built.arms[hand].anchor(0);
    return { a: x[0], pitch: x[1], ext: x[2], fwd: x[3], err: e };
  }

  // 클립의 그립 목표: grips[{ hand: 'L'|'R', prop: id, point: [x,y,z] }] — point는 소품 로컬 좌표
  // 소품 변환은 anims/props.js 규약(붙는 곳 기준 px…s, size 배율)으로 모델 공간에서 계산한다
  function gripTargets(clip, t, built) {
    const out = [];
    for (const g of clip.grips || []) {
      const prop = (clip.props || []).find(p => p.id === g.prop);
      if (!prop) continue;
      const v = animSampleProp(prop, t, clip);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(v.px, v.py, v.pz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(v.rx, v.ry, v.rz)),
        new THREE.Vector3().setScalar((prop.size || 0.3) * v.s),
      );
      const p = new THREE.Vector3(...g.point).applyMatrix4(m);
      // 붙는 곳이 바닥(루트)이면 모델 공간으로 옮긴다 (모델은 posY·회전으로 움직인다)
      if (prop.attach !== 'body') {
        built.root.updateMatrixWorld(true);
        p.applyMatrix4(built.root.matrixWorld);
        built.model.updateMatrixWorld(true);
        built.model.worldToLocal(p);
      }
      out.push({ hand: g.hand === 'L' ? 0 : 1, point: p, grip: g });
    }
    return out;
  }

  // 캐릭터 × 클립마다 팔 트랙을 0.05초 간격으로 풀어 둔다 (몸 자세를 먼저 적용한 상태에서 푼다)
  const BAKE = new WeakMap();
  function bakeGrips(actor, clip, applyBody) {
    let per = BAKE.get(actor.built);
    if (!per) BAKE.set(actor.built, per = new Map());
    if (per.has(clip)) return per.get(clip);
    const info = rigInfo(actor.built, actor.preset);
    const N = Math.max(1, Math.ceil(clip.dur / 0.05));
    const tracks = {};
    const errs = [];
    // 소품 맞춤 변환: 소품 id → [[t, qx, qy, qz, qw, csx, csy, csz, ctx, cty, ctz]] 모델 공간.
    // 새 점 = q·(점 − cs) + ct. 손이 닿지 않는 만큼 소품을 손 쪽으로 옮기고, 그립이 둘이면 두 손을 잇는 방향으로 돌린다 (그립 우선, A2)
    const xforms = {};
    // 접촉을 선언한 소품(연필 끝-종이 등)은 높이를 지키도록 수평으로만 옮기고 돌리지 않는다
    const flat = new Set((clip.contacts || []).filter(c => !c.kind).map(c => c.prop));
    const ID = new THREE.Quaternion();
    const apply = (x, p) => p.clone().sub(x.cs).applyQuaternion(x.q).add(x.ct);
    let prev = [[0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i <= N; i++) {
      const t = (clip.dur * i) / N;
      applyBody(t);
      const targets = gripTargets(clip, t, actor.built);
      const props = [...new Set(targets.map(tg => tg.grip.prop))];
      const X = Object.fromEntries(props.map(id => [id, { q: ID.clone(), cs: new THREE.Vector3(), ct: new THREE.Vector3() }]));
      let sol = targets.map(tg => prev[tg.hand]);
      for (let round = 0; round < 3; round++) {
        const tips = targets.map((tg, k) => {
          const r = solveArm(actor.built, info, tg.hand, apply(X[tg.grip.prop], tg.point), sol[k]);
          sol[k] = [r.a, r.pitch, r.ext, r.fwd];
          const tip = tipFor(actor.built, info, tg.hand, r.a, r.pitch, r.ext, r.fwd);
          if (actor.built.arms[tg.hand].anchor) actor.built.arms[tg.hand].anchor(0);
          return tip;
        });
        for (const id of props) {
          const ks = targets.map((tg, k) => k).filter(k => targets[k].grip.prop === id);
          const P = ks.map(k => targets[k].point);
          const T = ks.map(k => tips[k]);
          const cs = P.reduce((u, v) => u.clone().add(v)).multiplyScalar(1 / P.length);
          const ct = T.reduce((u, v) => u.clone().add(v)).multiplyScalar(1 / T.length);
          const q = new THREE.Quaternion();
          if (P.length === 2 && !flat.has(id)) {
            const dp = P[1].clone().sub(P[0]);
            const dt = T[1].clone().sub(T[0]);
            if (dp.lengthSq() > 1e-8 && dt.lengthSq() > 1e-8) q.setFromUnitVectors(dp.normalize(), dt.normalize());
          }
          if (flat.has(id)) ct.y = cs.y;
          // 돌리거나 옮긴 소품이 몸을 뚫으면 안 된다 (A1): 회전·이동 비율을 줄여 가며 몸과 0.035 이상 떨어지는 가장 큰 것
          const prop = clip.props.find(pp => pp.id === id);
          const M = propMatrix(clip, prop, t, actor.built);
          const pts = shapePoints(prop.shape).map(p => p.clone().applyMatrix4(M));
          let pick = null;
          // 앞 라운드는 손 위치를 좁혀 가는 중이라 검사하지 않는다 (마지막 라운드에서만 몸 뚫기 검사)
          for (const a of round < 2 ? [1] : [1, 0.75, 0.5, 0.25, 0]) {
            const qa = ID.clone().slerp(q, a);
            const cta = cs.clone().lerp(ct, P.length === 2 ? 1 : a === 0 ? 0 : 1);
            const x = { q: qa, cs, ct: cta };
            if (round < 2 || pts.every(p => bodyGap(info, apply(x, p)) >= 0.035)) {
              pick = x;
              break;
            }
          }
          X[id] = pick || { q: ID.clone(), cs, ct };
        }
      }
      for (const id of props) {
        const x = X[id];
        (xforms[id] || (xforms[id] = [])).push([+t.toFixed(4), x.q.x, x.q.y, x.q.z, x.q.w, x.cs.x, x.cs.y, x.cs.z, x.ct.x, x.ct.y, x.ct.z]);
      }
      targets.forEach((tg, k) => {
        const side = tg.hand === 0 ? 'L' : 'R';
        const r = solveArm(actor.built, info, tg.hand, apply(X[tg.grip.prop], tg.point), sol[k]);
        prev[tg.hand] = [r.a, r.pitch, r.ext, r.fwd];
        (tracks[`armFwd${side}`] || (tracks[`armFwd${side}`] = [])).push([+t.toFixed(3), r.fwd, 'lin']);
        (tracks[`arm${side}`] || (tracks[`arm${side}`] = [])).push([+t.toFixed(3), r.a, 'lin']);
        (tracks[`armPitch${side}`] || (tracks[`armPitch${side}`] = [])).push([+t.toFixed(3), r.pitch, 'lin']);
        (tracks[`armExt${side}`] || (tracks[`armExt${side}`] = [])).push([+t.toFixed(3), r.ext, 'lin']);
        errs.push(r.err);
      });
    }
    // 루프는 끝 키를 처음 키와 같게 (이음새 튐 없음)
    if (clip.loop) {
      for (const keys of Object.values(tracks)) if (keys.length > 1) keys[keys.length - 1][1] = keys[0][1];
      for (const list of Object.values(xforms)) if (list.length > 1) list[list.length - 1] = [list[list.length - 1][0], ...list[0].slice(1)];
    }
    const baked = { tracks, xforms, maxErr: errs.length ? Math.max(...errs) : 0 };
    per.set(clip, baked);
    return baked;
  }

  // 한 프레임: 클립 포즈 + 앉기 바탕 + 그립 팔. 게임·스튜디오·검수기가 이것만 부르면 된다
  // opts.seat: 좌면 종류(소켓에서 정한다). 클립에 meta.seat가 없어도 opts.seated면 앉은 자세를 깐다 (앉은 채 먹기 등)
  function poseAt(actor, clip, t, opts = {}) {
    const info = rigInfo(actor.built, actor.preset);
    const local = clip.loop ? t % clip.dur : Math.min(t, clip.dur);
    const body = time => {
      const p = animSampleClip(clip, time);
      const amt = seatAmountOf(clip, time);
      const seatAmt = amt !== null ? amt : opts.seated ? 1 : 0;
      // 착석 박자의 짧은 눌림(A3·A4)은 클립의 squash 트랙이 맡는다 (seat_enter)
      if (seatAmt) seatPose(p, info, (clip.meta && clip.meta.seatType) || opts.seat || 'chair', seatAmt);
      return p;
    };
    // opts.noSeat: 앉기 바탕은 부르는 쪽(게임)이 자기 앉기 진행도로 깐다. 여기서 또 깔면 엉덩이가 두 번 내려간다
    const pose = opts.noSeat ? animSampleClip(clip, local) : body(local);
    if (clip.grips && clip.grips.length) {
      const baked = bakeGrips(actor, clip, time => applyPose(actor, body(time)));
      for (const [ch, keys] of Object.entries(baked.tracks)) pose[ch] = animSampleTrack(keys, local);
      pose.propXform = {};
      for (const [id, list] of Object.entries(baked.xforms)) {
        const v = Array.from({ length: 10 }, (_, k) => animSampleTrack(list.map(r => [r[0], r[k + 1], 'lin']), local));
        pose.propXform[id] = { q: new THREE.Quaternion(v[0], v[1], v[2], v[3]).normalize(), cs: new THREE.Vector3(v[4], v[5], v[6]), ct: new THREE.Vector3(v[7], v[8], v[9]) };
      }
    }
    // 손 위치로 적은 클립: 그 몸의 입·가슴에 닿는 팔 값을 쓴다 (anims-real.js)
    if (clip.reach && root.AnimReach) root.AnimReach.apply(actor, clip, pose, local);
    pose.t = local; // 소품 교정 캐시(anims-real.js)가 같은 순간을 알아보는 데 쓴다
    return pose;
  }
  // 소품 배치: anims/props.js animApplyProps + 그립 맞춤 변환(모델 공간)
  function applyProps(actor, holders, clip, t, pose) {
    animApplyProps(holders, clip, t);
    if (!pose || !pose.propXform) return;
    const model = actor.built.model;
    model.updateMatrixWorld(true);
    const modelInv = new THREE.Matrix4().copy(model.matrixWorld).invert();
    for (const h of holders) {
      const x = pose.propXform[h.userData.prop.id];
      if (!x) continue;
      h.parent.updateMatrixWorld(true);
      h.updateMatrix();
      const inModel = new THREE.Matrix4().multiplyMatrices(modelInv, new THREE.Matrix4().multiplyMatrices(h.parent.matrixWorld, h.matrix));
      const X = new THREE.Matrix4().makeTranslation(x.ct.x, x.ct.y, x.ct.z)
        .multiply(new THREE.Matrix4().makeRotationFromQuaternion(x.q))
        .multiply(new THREE.Matrix4().makeTranslation(-x.cs.x, -x.cs.y, -x.cs.z));
      const world = new THREE.Matrix4().multiplyMatrices(model.matrixWorld, X.multiply(inModel));
      const local = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(h.parent.matrixWorld).invert(), world);
      local.decompose(h.position, h.quaternion, h.scale);
    }
  }

  // anims.js animApplyPose + 이 파일의 채널(armFwdL·armFwdR: 어깨를 앞으로). 게임은 이것을 부른다
  function applyPose(actor, pose) {
    const arms = actor.built.arms;
    if (arms[0].anchor) arms[0].anchor(pose.armFwdL || 0);
    if (arms[1].anchor) arms[1].anchor(pose.armFwdR || 0);
    animApplyPose(actor, pose);
    // 다리(늘인 발): footXS 앞뒤 배율, footXW 굵기 배율. 없으면 원래 발
    const feet = actor.built.feet;
    if (feet) {
      feet[0].scale.set(pose.footLW || 1, pose.footLW || 1, pose.footLS || 1);
      feet[1].scale.set(pose.footRW || 1, pose.footRW || 1, pose.footRS || 1);
    }
  }

  root.AnimRig = { SEAT_SPECS, bodyGap, rigInfo, seatPose, seatAmountOf, solveArm, tipFor, gripTargets, bakeGrips, poseAt, applyPose, applyProps };
}(typeof self !== 'undefined' ? self : this));
