'use strict';

// Phase 2 — 장소 GLB 교체 (2026-11-05)
// world.js의 buildWorld가 이 파일의 GLB_PLACES에 든 장소의 기존 빌더를 억제하고,
// 조립이 끝나면 applyGLBPlaces가 같은 자리·같은 방향에 GLB를 얹는다.
// 충돌·포털·NPC 스팟은 빌더와 무관하게 등록되므로 그대로 유지된다 (하네스 검증 완료).
window.GLB_MAP = {
  plaza: 'assets/glb/plaza-set.glb',
  reception: 'assets/glb/reception.glb',
  exam: 'assets/glb/exam.glb',
  arbiter: 'assets/glb/arbiter.glb',
  internet: 'assets/glb/internet-corner.glb',
  ramenRo: 'assets/glb/ramenro.glb',
  ramenYama: 'assets/glb/ramen-yama.glb',
  umaCurry: 'assets/glb/curry.glb',
  umaiya: 'assets/glb/umaiya.glb',
  kissa: 'assets/glb/kissa.glb',
  mucha: 'assets/glb/mucha.glb',
  soba: 'assets/glb/soba.glb',
  machioka: 'assets/glb/machioka.glb',
  pharmacy: 'assets/glb/pharmacy.glb',
  recycle: 'assets/glb/recycle.glb',
  // home: 코드 모델로 바꿈 (interiors-auto.js, 2026-11-09 이재헌 지시 3번)
  cave: 'assets/glb/cave.glb',
  stage: 'assets/glb/stage.glb',
  weeding: 'assets/glb/weeding.glb',
  pond: 'assets/glb/pond.glb',
  rice: 'assets/glb/ricecooker.glb',
  sausage: 'assets/glb/sausage.glb',
  castella: 'assets/glb/castella.glb',
  servers: 'assets/glb/dashi-server.glb',
  softcream: 'assets/glb/softcream.glb',
  bigPudding: 'assets/glb/pudding.glb',
  shrine: 'assets/glb/shrine.glb',
  onsen: 'assets/glb/onsen.glb',
  sauna: 'assets/glb/sauna.glb',
  statue: 'assets/glb/statue.glb',
  hunt: 'assets/glb/training.glb',
  yamanba: 'assets/glb/yamanba.glb',
  hiroma: 'assets/glb/hiroma.glb',
  goblin: 'assets/glb/goblin.glb',
  arcade: 'assets/glb/arcade.glb',
  // lemon: 코드 건물로 바꿈 (lemon-factory.js, 2026-11-09 이재헌 지시 4번)
  market: '__stalls__',
  cottage: '__cottage__',
};
window.GLB_PLACES = new Set(Object.keys(window.GLB_MAP));

// 민가는 남은 2채만 위치로 골라 얹는다
const COTTAGE_GLB = { '-92,66': 'assets/glb/house-b.glb', '40,44': 'assets/glb/house-a.glb' };
// 시장은 노점 4종을 오프셋으로 배치한다
const STALL_GLB = [
  ['assets/glb/stall-clothes.glb', -12, -8], ['assets/glb/stall-books.glb', 12, -8],
  ['assets/glb/stall-takoyaki.glb', -12, 8], ['assets/glb/stall-pottery.glb', 12, 8],
];

/* ---------- 외곽선 (설계: docs/outline-design.md) ---------- */

// 캐릭터와 같은 역외곽선 문법. 선 색은 캐릭터 inkColor와 같고, 굵기는 덩어리 크기로 정한 뒤 화면 픽셀로 묶는다
const GLB_INK = { color: '#3a3227', minPx: 1.0, maxPx: 3.2, wMin: 0.06, wMax: 0.11, wBase: 0.05, wK: 0.008 };
let glbInkMaterial = null;
function glbInkMat() {
  if (glbInkMaterial) return glbInkMaterial;
  glbInkMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        color: { value: new THREE.Color(GLB_INK.color) },
        resolution: { value: new THREE.Vector2(1280, 800) },
        minPx: { value: GLB_INK.minPx },
        maxPx: { value: GLB_INK.maxPx },
      },
    ]),
    // 법선을 화면 평면에 투영해 픽셀 단위로 민다. 각진 상자도 둥근 캐릭터와 같은 굵기로 보인다
    vertexShader: `
      attribute float inkW;
      uniform vec2 resolution;
      uniform float minPx;
      uniform float maxPx;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vec4 clip = projectionMatrix * mvPosition;
        vec4 clipN = projectionMatrix * vec4(mvPosition.xyz + n * 0.05, 1.0);
        vec2 dir = clipN.xy / clipN.w - clip.xy / clip.w;
        float len = length(dir);
        dir = len > 1e-6 ? dir / len : vec2(0.0);
        float projScale = projectionMatrix[1][1] * resolution.y * 0.5;
        float px = clamp(inkW * projScale / max(0.1, -mvPosition.z), minPx, maxPx);
        clip.xy += dir * px * 2.0 / resolution * clip.w;
        gl_Position = clip;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 color;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return glbInkMaterial;
}

// 메시 하나를 root 기준 좌표로 구워 외곽선 조각을 만든다
// 같은 위치를 하나로 묶어 덩어리를 나누고, 열린 덩어리는 빼고, 안쪽을 향한 덩어리는 뒤집는다
function glbInkPiece(mesh, toRoot) {
  const src = mesh.geometry;
  const sp = src.attributes.position;
  const sn = src.attributes.normal;
  const n = sp.count;
  const normalMat = new THREE.Matrix3().getNormalMatrix(toRoot);
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(sp, i).applyMatrix4(toRoot);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    v.fromBufferAttribute(sn, i).applyMatrix3(normalMat).normalize();
    nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z;
  }
  const index = src.index ? src.index.array : Uint32Array.from({ length: n }, (_, i) => i);

  // 같은 위치 → 하나의 번호
  const keyOf = new Map();
  const vk = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = `${pos[i * 3].toFixed(3)},${pos[i * 3 + 1].toFixed(3)},${pos[i * 3 + 2].toFixed(3)}`;
    let id = keyOf.get(k);
    if (id === undefined) keyOf.set(k, id = keyOf.size);
    vk[i] = id;
  }
  const u = keyOf.size;
  const parent = new Int32Array(u);
  for (let i = 0; i < u; i++) parent[i] = i;
  const find = a => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const edges = new Map();
  for (let t = 0; t < index.length; t += 3) {
    const a = vk[index[t]], b = vk[index[t + 1]], c = vk[index[t + 2]];
    parent[find(b)] = find(a);
    parent[find(c)] = find(a);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = p < q ? p * u + q : q * u + p;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  // 한 삼각형에만 붙은 모서리가 있으면 열린 덩어리다 (수면·바닥판 등). 셸을 씌우면 뒤에 검은 판이 생긴다
  const open = new Set();
  for (const [k, count] of edges) if (count === 1) open.add(find(Math.floor(k / u)));

  // 덩어리별 부호 있는 부피(감김 방향)와 경계 상자
  const volume = new Map();
  const box = new Map();
  for (let t = 0; t < index.length; t += 3) {
    const root = find(vk[index[t]]);
    if (open.has(root)) continue;
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]].map(i => i * 3);
    const vol = pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
      - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
      + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    volume.set(root, (volume.get(root) || 0) + vol);
  }
  for (let i = 0; i < n; i++) {
    const root = find(vk[i]);
    if (open.has(root)) continue;
    let b = box.get(root);
    if (!b) box.set(root, b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
    for (let k = 0; k < 3; k++) {
      b[k] = Math.min(b[k], pos[i * 3 + k]);
      b[k + 3] = Math.max(b[k + 3], pos[i * 3 + k]);
    }
  }

  // 같은 위치의 법선을 평균 낸다. 꺾인 모서리에서 선이 갈라지지 않는다
  const sum = new Float32Array(u * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) sum[vk[i] * 3 + k] += nor[i * 3 + k];
  const width = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const root = find(vk[i]);
    const b = box.get(root);
    if (!b) continue;
    const flip = (volume.get(root) || 0) < 0 ? -1 : 1;
    const x = sum[vk[i] * 3], y = sum[vk[i] * 3 + 1], z = sum[vk[i] * 3 + 2];
    const l = (Math.hypot(x, y, z) || 1) * flip;
    nor[i * 3] = x / l; nor[i * 3 + 1] = y / l; nor[i * 3 + 2] = z / l;
    // 덩어리 크기로 굵기를 정한다: 의자·컵 0.06, 벤치·게시판 0.07 안팎, 벽·지붕 0.1~0.11
    const r = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2;
    width[i] = Math.min(GLB_INK.wMax, Math.max(GLB_INK.wMin, GLB_INK.wBase + r * GLB_INK.wK));
  }
  const tris = [];
  for (let t = 0; t < index.length; t += 3) {
    if (open.has(find(vk[index[t]]))) continue;
    tris.push(index[t], index[t + 1], index[t + 2]);
  }
  return tris.length ? { pos, nor, width, tris } : null;
}

// GLB 한 개의 외곽선을 메시 하나로 합친다. 드로우 콜은 GLB마다 1개만 늘어난다
function makeGLBInk(glb) {
  glb.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4();
  const rootInverse = glb.matrixWorld.clone().invert();
  const pieces = [];
  glb.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    toRoot.multiplyMatrices(rootInverse, o.matrixWorld);
    const piece = glbInkPiece(o, toRoot);
    if (piece) pieces.push(piece);
  });
  if (!pieces.length) return null;
  const vertexCount = pieces.reduce((s, p) => s + p.width.length, 0);
  const pos = new Float32Array(vertexCount * 3);
  const nor = new Float32Array(vertexCount * 3);
  const width = new Float32Array(vertexCount);
  const tris = [];
  let base = 0;
  for (const p of pieces) {
    pos.set(p.pos, base * 3);
    nor.set(p.nor, base * 3);
    width.set(p.width, base);
    for (const i of p.tris) tris.push(i + base);
    base += p.width.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('inkW', new THREE.BufferAttribute(width, 1));
  geo.setIndex(tris);
  geo.computeBoundingSphere();
  // 선은 셰이더에서 화면 방향으로 밀리므로 화면 끝에서 잘리지 않게 경계를 조금 키운다
  geo.boundingSphere.radius += 0.5;
  const mesh = new THREE.Mesh(geo, glbInkMat());
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  // 땅 클릭·인물 고르기 같은 광선 판정은 선을 무시한다
  mesh.raycast = () => {};
  const size = new THREE.Vector2();
  mesh.onBeforeRender = renderer => {
    const u = glbInkMaterial.uniforms;
    renderer.getDrawingBufferSize(size);
    const ratio = renderer.getPixelRatio();
    u.resolution.value.copy(size);
    u.minPx.value = GLB_INK.minPx * ratio;
    u.maxPx.value = GLB_INK.maxPx * ratio;
  };
  return mesh;
}

/* ---------- 떠 있는 사물 내려놓기 (접촉 규칙 R4, docs/contact-rules.md) ---------- */

// GLB의 작은 덩어리(대각선 1.5 미만)가 다른 어떤 덩어리에도, 땅에도 닿지 않고 떠 있으면
// 아래 받침면(다른 덩어리의 윗면 또는 땅)과의 틈을 재서, 틈이 0.03 초과 0.6 이하면 그만큼 내려놓는다.
// 벽에 붙은 간판처럼 옆으로 닿아 있는 것은 "닿음"이라 건드리지 않는다. 고친 목록은 GLB_CONTACT_REPORT에 남긴다 (원본 수정용)
window.GLB_CONTACT_REPORT = [];
// side: 옆으로 이만큼 안에 다른 부품이 있으면 옆에 붙은 것으로 본다 (깃대의 깃발, 벽의 간판)
// maxGap: 자동으로 내려놓는 틈의 상한. 이보다 크면 의도된 배치일 수 있어 목록에만 남긴다
const R4 = { small: 1.5, touch: 0.02, side: 0.1, minGap: 0.03, maxGap: 0.3 };
// 화면으로 하나씩 본 결과 (2026-11-16): 상한을 넘었지만 실제로 떠 보이는 것만 모형별로 더 내린다
//  - 리사이클 숍: 계산대 위 막대, 선반 앞 작은 물건 (틈 0.56~0.62)
//  - 밥솥: 몸통 옆에 뜬 밥 덩이 (땅에서 1 이내의 낮은 것만. 위쪽 김 덩이는 일부러 띄운 것)
// 나머지(모닥불 불티, 온천 김, 물 위 부표, 바위·벽 속에 묻힌 부품)는 일부러 띄웠거나 보이지 않는다
const R4_MORE = { 'recycle.glb': { maxGap: 0.65 }, 'ricecooker.glb': { maxGap: 0.45, maxHeight: 1 } };
function fixFloatingGLB(glb, url, world) {
  glb.updateMatrixWorld(true);
  const comps = [];
  glb.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const n = pos.count;
    const index = geo.index ? geo.index.array : Uint32Array.from({ length: n }, (_, i) => i);
    const world3 = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      world3[i * 3] = v.x; world3[i * 3 + 1] = v.y; world3[i * 3 + 2] = v.z;
    }
    const keyOf = new Map();
    const vk = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
      let id = keyOf.get(k);
      if (id === undefined) keyOf.set(k, id = keyOf.size);
      vk[i] = id;
    }
    const parent = new Int32Array(keyOf.size);
    for (let i = 0; i < parent.length; i++) parent[i] = i;
    const find = a => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
    for (let t = 0; t < index.length; t += 3) {
      parent[find(vk[index[t + 1]])] = find(vk[index[t]]);
      parent[find(vk[index[t + 2]])] = find(vk[index[t]]);
    }
    const byRoot = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(vk[i]);
      let c = byRoot.get(r);
      if (!c) byRoot.set(r, c = { mesh: o, world3, verts: [], tris: [], box: new THREE.Box3() });
      c.verts.push(i);
      c.box.expandByPoint(v.set(world3[i * 3], world3[i * 3 + 1], world3[i * 3 + 2]));
    }
    for (let t = 0; t < index.length; t += 3) byRoot.get(find(vk[index[t]])).tris.push(index[t], index[t + 1], index[t + 2]);
    comps.push(...byRoot.values());
  });
  const P = (c, i) => new THREE.Vector3(c.world3[i * 3], c.world3[i * 3 + 1], c.world3[i * 3 + 2]);
  const tri = new THREE.Triangle();
  const q = new THREE.Vector3();
  // A의 정점 중 하나가 B의 삼각형에서 touch 안이면 닿음
  function touches(a, b) {
    const box = b.box.clone().expandByScalar(R4.side);
    for (const i of a.verts) {
      const p = P(a, i);
      if (!box.containsPoint(p)) continue;
      for (let t = 0; t < b.tris.length; t += 3) {
        tri.set(P(b, b.tris[t]), P(b, b.tris[t + 1]), P(b, b.tris[t + 2]));
        tri.closestPointToPoint(p, q);
        const d2 = q.distanceToSquared(p);
        if (d2 <= R4.touch * R4.touch) return true;
        // 옆으로 가까운 것(가장 가까운 방향이 거의 수평)은 옆에 붙은 것
        if (d2 <= R4.side * R4.side && Math.abs(q.y - p.y) < 0.5 * Math.sqrt(d2)) return true;
      }
    }
    return false;
  }
  const ray = new THREE.Ray();
  const hit = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const size = new THREE.Vector3();
  for (const a of comps) {
    a.box.getSize(size);
    if (size.length() >= R4.small) continue;
    const center = a.box.getCenter(new THREE.Vector3());
    const ground = world.floorAt(center.x, center.z);
    if (a.box.min.y - ground <= R4.minGap) continue;
    const near = comps.filter(b => b !== a && b.box.clone().expandByScalar(R4.side).intersectsBox(a.box));
    if (near.some(b => touches(a, b) || touches(b, a))) continue;
    // 떠 있다: 가장 낮은 정점들에서 아래로 쏴서 받침면을 찾는다
    const lows = a.verts.filter(i => a.world3[i * 3 + 1] <= a.box.min.y + 0.02).slice(0, 12);
    let support = -Infinity;
    for (const i of lows) {
      const p = P(a, i);
      let top = world.floorAt(p.x, p.z);
      ray.set(new THREE.Vector3(p.x, p.y - 1e-4, p.z), down);
      for (const b of comps) {
        if (b === a || b.box.min.y > p.y || b.box.max.x < p.x || b.box.min.x > p.x || b.box.max.z < p.z || b.box.min.z > p.z) continue;
        for (let t = 0; t < b.tris.length; t += 3) {
          if (ray.intersectTriangle(P(b, b.tris[t]), P(b, b.tris[t + 1]), P(b, b.tris[t + 2]), false, hit) && hit.y > top) top = hit.y;
        }
      }
      if (top > support) support = top;
    }
    const gap = a.box.min.y - support;
    const entry = { glb: url, mesh: a.mesh.name || '', size: +size.length().toFixed(2), gap: +gap.toFixed(3), at: center.toArray().map(x => +x.toFixed(2)), fixed: false };
    const more = R4_MORE[url.split('/').pop()];
    const limit = more && (!more.maxHeight || a.box.min.y - ground < more.maxHeight) ? more.maxGap : R4.maxGap;
    if (gap > R4.minGap && gap <= limit) {
      // 메시 공간에서 아래로 gap만큼 (회전·크기가 있어도 맞게)
      const inv = new THREE.Matrix4().copy(a.mesh.matrixWorld).invert();
      const d = new THREE.Vector3(0, -gap, 0).add(center).applyMatrix4(inv).sub(center.clone().applyMatrix4(inv));
      const pos = a.mesh.geometry.attributes.position;
      for (const i of a.verts) {
        pos.setXYZ(i, pos.getX(i) + d.x, pos.getY(i) + d.y, pos.getZ(i) + d.z);
        a.world3[i * 3 + 1] -= gap;
      }
      pos.needsUpdate = true;
      a.mesh.geometry.computeBoundingBox();
      a.mesh.geometry.computeBoundingSphere();
      a.box.min.y -= gap;
      a.box.max.y -= gap;
      entry.fixed = true;
    }
    window.GLB_CONTACT_REPORT.push(entry);
  }
}

// 모든 GLB가 얹히면 풀리는 약속. 길 지도처럼 다 얹힌 뒤의 월드가 필요한 코드가 기다린다
window.GLB_HOLDERS = {};
window.GLB_DONE = null;
window.applyGLBPlaces = function (world, scene) {
  window.GLB_DONE = placeAllGLB(world, scene);
  return window.GLB_DONE;
};
async function placeAllGLB(world, scene) {
  async function place(url, x, z, rotY, key) {
    const glb = await loadGLB(url);
    const holder = new THREE.Group();
    holder.position.set(x, world.floorAt(x, z), z);
    holder.rotation.y = rotY || 0;
    holder.add(glb);
    holder.updateMatrixWorld(true);
    // 떠 있는 작은 사물은 받침면에 내려놓는다 (R4). 외곽선은 내려놓은 뒤의 모양으로 만든다
    if (!window.R4_OFF) try { fixFloatingGLB(glb, url, world); } catch (e) { console.warn('R4 검사 실패:', url, e && e.message); }
    const ink = makeGLBInk(glb);
    if (ink) holder.add(ink);
    scene.add(holder);
    if (key) (window.GLB_HOLDERS[key] || (window.GLB_HOLDERS[key] = [])).push(holder);
  }
  for (const p of world.places) {
    const url = window.GLB_MAP[p.id];
    if (!url) continue;
    const rot = ((p.face || 0) * Math.PI) / 2;
    try {
      if (url === '__cottage__') {
        const cu = COTTAGE_GLB[p.x + ',' + p.z];
        if (cu) await place(cu, p.x, p.z, rot, p.id);
      } else if (url === '__stalls__') {
        for (const [su, ox, oz] of STALL_GLB) {
          await place(su, p.x + ox, p.z + oz, Math.atan2(ox, oz), p.id);
        }
      } else {
        await place(url, p.x, p.z, rot, p.id);
      }
    } catch (e) {
      console.warn('GLB 배치 실패:', p.id, e && e.message);
    }
  }
  // decor(민가)는 world.places에서 빠지므로 좌표로 직접 처리한다
  for (const pg of world.placeGroups) {
    const cu = COTTAGE_GLB[pg.x + ',' + pg.z];
    if (!cu) continue;
    try {
      await place(cu, pg.x, pg.z, pg.group.rotation.y, 'cottage');
    } catch (e) {
      console.warn('GLB 배치 실패: cottage', pg.x, pg.z, e && e.message);
    }
  }
}
