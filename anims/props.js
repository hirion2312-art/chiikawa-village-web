'use strict';

// ────────────────────────────────────────────────────────────────
// 애니메이션 소품 런타임 — 애니메이션 스튜디오와 게임이 함께 쓴다
// anims.js 뒤에 불러온다. 클립의 props 배열(공·상자 같은 도형)을 만들고 시각 t에 맞춰 움직인다.
//
// 클립의 props 항목:
//   { id: 'ball1', shape: 'ball', color: '#f2748e', size: 0.3, attach: 'body',
//     tracks: { px, py, pz, rx, ry, rz, s }, vis: [[t, 1|0], ...] }
//   attach  'ground' 캐릭터 발밑 기준(몸이 움직여도 따라가지 않음)
//           'body'   몸 기준(몸통의 출렁임·회전을 따라감)
//           'handL' / 'handR' 팔 관절 기준(팔을 따라감 — 손에 든 물건)
//   tracks  anims.js와 같은 키 형식 [t, 값, 이징]. 위치는 캐릭터 키 1.7 기준 단위
//   vis     보이기 스텝 키. 없으면 항상 보인다
// ────────────────────────────────────────────────────────────────

const ANIM_PROP_SHAPES = {
  ball: { label: '공', make: () => new THREE.SphereGeometry(0.5, 24, 16) },
  box: { label: '상자', make: () => new THREE.BoxGeometry(1, 1, 1) },
  cylinder: { label: '원기둥', make: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 24) },
  cone: { label: '원뿔', make: () => new THREE.ConeGeometry(0.5, 1, 24) },
  ring: { label: '고리', make: () => new THREE.TorusGeometry(0.4, 0.12, 12, 32) },
  stick: { label: '막대', make: () => new THREE.CylinderGeometry(0.06, 0.06, 1, 10) },
  plate: { label: '접시', make: () => new THREE.CylinderGeometry(0.5, 0.42, 0.12, 28) },
  bowl: { label: '그릇', make: () => new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2) },
  // 묶음 A 소품 (실제 비율). 크기 1 = 대표 길이. 그립점·접촉점은 이 단위 좌표로 클립에 적는다
  cup: { label: '잔', make: () => new THREE.CylinderGeometry(0.36, 0.3, 0.8, 20) },                       // 높이 0.8, 입구 y=0.4
  bottle: { label: '병', make: () => animPropMerge([animPropCyl(0.2, 0.2, 0.62, 0, -0.19), animPropCyl(0.2, 0.08, 0.1, 0, 0.17), animPropCyl(0.07, 0.07, 0.2, 0, 0.32)]) }, // 입구 y=0.42
  pencil: { label: '연필', make: () => animPropMerge([animPropCyl(0.045, 0.045, 0.84, 0, 0.08), animPropCone(0.045, 0.16, 0, -0.42)]) },   // 심 끝 y=-0.5
  tray: { label: '쟁반', make: () => new THREE.BoxGeometry(1, 0.05, 0.6) },
  paper: { label: '종이', make: () => new THREE.BoxGeometry(1, 0.012, 0.72) },
  surface: { label: '탁자 면', make: () => new THREE.BoxGeometry(1, 0.08, 0.7) },                       // 윗면 y=0.04
  rod: { label: '긴 막대', make: () => new THREE.CylinderGeometry(0.012, 0.016, 1, 10) },                // 낚싯대·무기 (끝 y=±0.5)
};
function animPropCyl(rt, rb, h, x, y) {
  const g = new THREE.CylinderGeometry(rt, rb, h, 16);
  g.translate(x, y, 0);
  return g;
}
function animPropCone(r, h, x, y) {
  const g = new THREE.ConeGeometry(r, h, 16);
  g.rotateX(Math.PI);
  g.translate(x, y, 0);
  return g;
}
// 여러 도형을 한 지오메트리로 (색은 하나)
function animPropMerge(geos) {
  const pos = [];
  const idx = [];
  let base = 0;
  for (const g of geos) {
    const ng = g.index ? g : g.toNonIndexed();
    const p = ng.attributes.position;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
    if (ng.index) for (let i = 0; i < ng.index.count; i++) idx.push(ng.index.getX(i) + base);
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}
const ANIM_PROP_CHANNELS = ['px', 'py', 'pz', 'rx', 'ry', 'rz', 's'];
const ANIM_PROP_DEFAULTS = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, s: 1 };
const ANIM_PROP_INK = '#3a3227';

// 도형 하나를 만든다. 캐릭터와 같은 색의 뒷면 외곽선을 두른다
function animMakeProp(prop) {
  const shape = ANIM_PROP_SHAPES[prop.shape] || ANIM_PROP_SHAPES.ball;
  const geo = shape.make();
  const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: prop.color || '#f2748e', side: prop.shape === 'bowl' ? THREE.DoubleSide : THREE.FrontSide }));
  mesh.castShadow = true;
  const ink = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ANIM_PROP_INK, side: THREE.BackSide }));
  ink.scale.setScalar(1.06);
  mesh.add(ink);
  const holder = new THREE.Group();
  holder.add(mesh);
  holder.userData.prop = prop;
  holder.userData.mesh = mesh;
  return holder;
}

// 소품이 붙을 부모를 고른다
function animPropParent(actor, attach) {
  const built = actor.built;
  if (attach === 'handL') return built.arms[0].joint;
  if (attach === 'handR') return built.arms[1].joint;
  if (attach === 'body') return built.model;
  return built.root;
}

// 시각 t의 소품 변환
function animSampleProp(prop, t, clip) {
  const time = clip.loop ? (t % clip.dur) : Math.min(t, clip.dur);
  const v = { ...ANIM_PROP_DEFAULTS };
  for (const ch of ANIM_PROP_CHANNELS) {
    if (prop.tracks && prop.tracks[ch]) v[ch] = animSampleTrack(prop.tracks[ch], time);
  }
  v.visible = true;
  if (prop.vis && prop.vis.length) {
    v.visible = !!prop.vis[0][1];
    for (const [vt, on] of prop.vis) if (time >= vt) v.visible = !!on;
  }
  return v;
}

// 클립의 소품을 actor에 붙인다. 돌려준 목록을 animApplyProps와 animRemoveProps에 넘긴다
function animAttachProps(actor, clip) {
  return (clip.props || []).map(prop => {
    const holder = animMakeProp(prop);
    animPropParent(actor, prop.attach).add(holder);
    return holder;
  });
}

function animApplyProps(holders, clip, t) {
  for (const holder of holders) {
    const prop = holder.userData.prop;
    const v = animSampleProp(prop, t, clip);
    const size = prop.size || 0.3;
    holder.position.set(v.px, v.py, v.pz);
    holder.rotation.set(v.rx, v.ry, v.rz);
    holder.scale.setScalar(size * v.s);
    holder.visible = v.visible;
  }
}

function animRemoveProps(holders) {
  for (const holder of holders) {
    holder.removeFromParent();
    holder.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
