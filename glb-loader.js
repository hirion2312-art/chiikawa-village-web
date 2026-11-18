'use strict';

// 최소 GLB 로더 — 이 프로젝트 에셋 전용 (정점색 전용, 텍스처 없음 전제)
// 전역 THREE (r160 글로벌 빌드)용. GLTFLoader 모듈 빌드와 THREE 인스턴스가 갈라지는 문제를 피하려고 직접 파싱한다.
async function loadGLB(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binOff = 20 + jsonLen + 8; // BIN 청크 헤더 뒤

  function accessorData(accIdx) {
    const acc = json.accessors[accIdx];
    const bv = json.bufferViews[acc.bufferView];
    const start = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
    const nComp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
    const total = acc.count * nComp;
    let arr;
    if (acc.componentType === 5126) arr = new Float32Array(buf, start, total);
    else if (acc.componentType === 5125) arr = new Uint32Array(buf, start, total);
    else if (acc.componentType === 5123) arr = new Uint16Array(buf, start, total);
    else if (acc.componentType === 5121) arr = new Uint8Array(buf, start, total);
    else throw new Error('unsupported componentType ' + acc.componentType);
    if (acc.normalized && acc.componentType !== 5126) {
      const max = acc.componentType === 5121 ? 255 : 65535;
      const f = new Float32Array(total);
      for (let i = 0; i < total; i++) f[i] = arr[i] / max;
      return { array: f, nComp, count: acc.count, isIndex: false };
    }
    return { array: arr, nComp, count: acc.count, isIndex: acc.componentType !== 5126 };
  }

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  function buildMesh(meshDef) {
    const grp = new THREE.Group();
    for (const prim of meshDef.primitives) {
      const geo = new THREE.BufferGeometry();
      const pos = accessorData(prim.attributes.POSITION);
      geo.setAttribute('position', new THREE.BufferAttribute(pos.array, 3));
      if (prim.attributes.NORMAL !== undefined) {
        const n = accessorData(prim.attributes.NORMAL);
        geo.setAttribute('normal', new THREE.BufferAttribute(n.array, 3));
      }
      if (prim.attributes.COLOR_0 !== undefined) {
        const c = accessorData(prim.attributes.COLOR_0);
        if (c.nComp === 3) geo.setAttribute('color', new THREE.BufferAttribute(c.array, 3));
        else {
          const rgb = new Float32Array(c.count * 3);
          for (let i = 0; i < c.count; i++) { rgb[i * 3] = c.array[i * 4]; rgb[i * 3 + 1] = c.array[i * 4 + 1]; rgb[i * 3 + 2] = c.array[i * 4 + 2]; }
          geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
        }
      }
      if (prim.indices !== undefined) {
        const idx = accessorData(prim.indices);
        geo.setIndex(new THREE.BufferAttribute(idx.array, 1));
      }
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
    return grp;
  }

  function buildNode(nodeIdx) {
    const def = json.nodes[nodeIdx];
    const obj = def.mesh !== undefined ? buildMesh(json.meshes[def.mesh]) : new THREE.Group();
    if (def.matrix) {
      const m = new THREE.Matrix4().fromArray(def.matrix);
      m.decompose(obj.position, obj.quaternion, obj.scale);
    } else {
      if (def.translation) obj.position.fromArray(def.translation);
      if (def.rotation) obj.quaternion.fromArray(def.rotation);
      if (def.scale) obj.scale.fromArray(def.scale);
    }
    for (const child of def.children || []) obj.add(buildNode(child));
    return obj;
  }

  const root = new THREE.Group();
  const sceneDef = json.scenes[json.scene || 0];
  for (const n of sceneDef.nodes) root.add(buildNode(n));
  return root;
}
